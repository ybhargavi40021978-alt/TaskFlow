import os
import sys
import django

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from core.models import (
    User, Project, ProjectMembership, Task, SubTask, Comment,
    Notification, Conversation, ConversationMember, ChatMessage,
    ActivityLog, UserSettings
)
from django.db.models import Count


def run_audit():
    print("=" * 60)
    print("TASKFLOW DATABASE AUDIT & DUPLICATE INSPECTION")
    print("=" * 60)

    print("\n[TABLE RECORD COUNTS]")
    print(f"  Users:                 {User.objects.count()}")
    print(f"  Projects:              {Project.objects.count()}")
    print(f"  Project Memberships:   {ProjectMembership.objects.count()}")
    print(f"  Tasks:                 {Task.objects.count()}")
    print(f"  SubTasks:              {SubTask.objects.count()}")
    print(f"  Comments:              {Comment.objects.count()}")
    print(f"  Notifications:         {Notification.objects.count()}")
    print(f"  Conversations:         {Conversation.objects.count()}")
    print(f"  Conversation Members:  {ConversationMember.objects.count()}")
    print(f"  Chat Messages:         {ChatMessage.objects.count()}")
    print(f"  Activity Logs:         {ActivityLog.objects.count()}")
    print(f"  User Settings:         {UserSettings.objects.count()}")

    print("\n[CHECKING FOR DUPLICATE RECORDS]")
    # 1. Projects
    proj_dupes = list(Project.objects.values("owner", "name").annotate(count=Count("id")).filter(count__gt=1))
    print(f"  Duplicate Projects (same owner & name): {len(proj_dupes)}")
    for d in proj_dupes:
        print(f"    - Owner ID {d['owner']}, Name '{d['name']}': {d['count']} duplicates")

    # 2. Tasks
    task_dupes = list(Task.objects.values("project", "title").annotate(count=Count("id")).filter(count__gt=1))
    print(f"  Duplicate Tasks (same project & title): {len(task_dupes)}")
    for d in task_dupes:
        print(f"    - Project ID {d['project']}, Title '{d['title']}': {d['count']} duplicates")

    # 3. Subtasks
    subtask_dupes = list(SubTask.objects.values("task", "title").annotate(count=Count("id")).filter(count__gt=1))
    print(f"  Duplicate Subtasks (same task & title): {len(subtask_dupes)}")
    for d in subtask_dupes:
        print(f"    - Task ID {d['task']}, Title '{d['title']}': {d['count']} duplicates")

    # 4. Comments
    comment_dupes = list(Comment.objects.values("task", "author", "content").annotate(count=Count("id")).filter(count__gt=1))
    print(f"  Duplicate Comments: {len(comment_dupes)}")
    for d in comment_dupes:
        print(f"    - Task ID {d['task']}, Author ID {d['author']}: {d['count']} duplicates")

    # 5. Notifications
    notif_dupes = list(Notification.objects.values("recipient", "notification_type", "message", "related_project", "related_task").annotate(count=Count("id")).filter(count__gt=1))
    print(f"  Duplicate Notifications: {len(notif_dupes)}")
    for d in notif_dupes:
        print(f"    - Recipient ID {d['recipient']}, Message '{d['message'][:40]}...': {d['count']} duplicates")

    # 6. Chat Messages
    msg_dupes = list(ChatMessage.objects.values("conversation", "sender", "content").annotate(count=Count("id")).filter(count__gt=1))
    print(f"  Duplicate Chat Messages: {len(msg_dupes)}")
    for d in msg_dupes:
        print(f"    - Conv ID {d['conversation']}, Sender ID {d['sender']}: {d['count']} duplicates")

    print("\nAudit completed.")


if __name__ == "__main__":
    run_audit()
