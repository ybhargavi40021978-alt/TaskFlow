from datetime import timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count
from django.utils import timezone

from core.models import (
    User, Project, ProjectMembership, Task, SubTask, Comment,
    Notification, Conversation, ConversationMember, ChatMessage
)


class Command(BaseCommand):
    help = "Inspects and safely cleans up duplicate records in the TaskFlow database."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report duplicates that would be removed without actually modifying database records.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        mode_str = "DRY RUN (Read Only)" if dry_run else "LIVE CLEANUP (Modifying Database)"
        self.stdout.write(self.style.NOTICE(f"=== TaskFlow Database Duplicate Cleanup: {mode_str} ==="))

        total_cleaned = 0

        with transaction.atomic():
            # 1. ProjectMemberships duplicates (safety check, should be enforced by unique_together)
            pm_dupes = (
                ProjectMembership.objects.values("project", "user")
                .annotate(count=Count("id"))
                .filter(count__gt=1)
            )
            for d in pm_dupes:
                items = list(ProjectMembership.objects.filter(project_id=d["project"], user_id=d["user"]).order_by("joined_at"))
                keep = items[0]
                to_delete = items[1:]
                self.stdout.write(f"Found {len(to_delete)} duplicate ProjectMembership(s) for User {d['user']} in Project {d['project']}")
                if not dry_run:
                    for item in to_delete:
                        item.delete()
                        total_cleaned += 1

            # 2. ConversationMember duplicates
            cm_dupes = (
                ConversationMember.objects.values("conversation", "user")
                .annotate(count=Count("id"))
                .filter(count__gt=1)
            )
            for d in cm_dupes:
                items = list(ConversationMember.objects.filter(conversation_id=d["conversation"], user_id=d["user"]).order_by("id"))
                to_delete = items[1:]
                self.stdout.write(f"Found {len(to_delete)} duplicate ConversationMember(s) for User {d['user']} in Conv {d['conversation']}")
                if not dry_run:
                    for item in to_delete:
                        item.delete()
                        total_cleaned += 1

            # 3. Notification duplicates (same recipient, message, related_project, related_task within short time)
            notif_dupes = (
                Notification.objects.values("recipient", "notification_type", "message", "related_project", "related_task")
                .annotate(count=Count("id"))
                .filter(count__gt=1)
            )
            for d in notif_dupes:
                items = list(Notification.objects.filter(
                    recipient_id=d["recipient"],
                    notification_type=d["notification_type"],
                    message=d["message"],
                    related_project_id=d["related_project"],
                    related_task_id=d["related_task"]
                ).order_by("created_at"))
                to_delete = items[1:]
                self.stdout.write(f"Found {len(to_delete)} duplicate Notification(s) for Recipient {d['recipient']}: '{d['message'][:40]}'")
                if not dry_run:
                    for item in to_delete:
                        item.delete()
                        total_cleaned += 1

            # 4. Subtasks duplicates (same task, same title)
            subtask_dupes = (
                SubTask.objects.values("task", "title")
                .annotate(count=Count("id"))
                .filter(count__gt=1)
            )
            for d in subtask_dupes:
                items = list(SubTask.objects.filter(task_id=d["task"], title=d["title"]).order_by("id"))
                to_delete = items[1:]
                self.stdout.write(f"Found {len(to_delete)} duplicate SubTask(s) '{d['title']}' in Task {d['task']}")
                if not dry_run:
                    for item in to_delete:
                        item.delete()
                        total_cleaned += 1

            # 5. Comment duplicates (same task, author, content created within 5 seconds)
            comment_dupes = (
                Comment.objects.values("task", "author", "content")
                .annotate(count=Count("id"))
                .filter(count__gt=1)
            )
            for d in comment_dupes:
                items = list(Comment.objects.filter(
                    task_id=d["task"],
                    author_id=d["author"],
                    content=d["content"]
                ).order_by("created_at"))
                to_delete = []
                for i in range(len(items) - 1):
                    if (items[i + 1].created_at - items[i].created_at).total_seconds() < 10:
                        to_delete.append(items[i + 1])
                if to_delete:
                    self.stdout.write(f"Found {len(to_delete)} duplicate Comment(s) by Author {d['author']} in Task {d['task']}")
                    if not dry_run:
                        for item in to_delete:
                            item.delete()
                            total_cleaned += 1

            # 6. Chat message duplicates (same conversation, sender, content within 5 seconds)
            msg_dupes = (
                ChatMessage.objects.values("conversation", "sender", "content")
                .annotate(count=Count("id"))
                .filter(count__gt=1)
            )
            for d in msg_dupes:
                items = list(ChatMessage.objects.filter(
                    conversation_id=d["conversation"],
                    sender_id=d["sender"],
                    content=d["content"]
                ).order_by("created_at"))
                to_delete = []
                for i in range(len(items) - 1):
                    if (items[i + 1].created_at - items[i].created_at).total_seconds() < 10:
                        to_delete.append(items[i + 1])
                if to_delete:
                    self.stdout.write(f"Found {len(to_delete)} duplicate ChatMessage(s) in Conv {d['conversation']}")
                    if not dry_run:
                        for item in to_delete:
                            item.delete()
                            total_cleaned += 1

            # 7. Task duplicates (same project, title, created within 5 seconds by same creator)
            task_dupes = (
                Task.objects.values("project", "title", "creator")
                .annotate(count=Count("id"))
                .filter(count__gt=1)
            )
            for d in task_dupes:
                items = list(Task.objects.filter(
                    project_id=d["project"],
                    title=d["title"],
                    creator_id=d["creator"]
                ).order_by("created_at"))
                to_delete = []
                for i in range(len(items) - 1):
                    if (items[i + 1].created_at - items[i].created_at).total_seconds() < 10:
                        to_delete.append(items[i + 1])
                if to_delete:
                    self.stdout.write(f"Found {len(to_delete)} duplicate Task(s) '{d['title']}' in Project {d['project']}")
                    if not dry_run:
                        for item in to_delete:
                            # Reassign subtasks and comments to preserved task if any
                            SubTask.objects.filter(task=item).update(task=items[0])
                            Comment.objects.filter(task=item).update(task=items[0])
                            item.delete()
                            total_cleaned += 1

            if dry_run:
                self.stdout.write(self.style.SUCCESS(f"Dry run completed. Total potential duplicates detected: {total_cleaned}"))
                transaction.set_rollback(True)
            else:
                self.stdout.write(self.style.SUCCESS(f"Cleanup successfully finished. Total duplicate records removed: {total_cleaned}"))
