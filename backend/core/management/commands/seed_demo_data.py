import datetime
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from core.models import (
    Project, ProjectMembership, Task, SubTask, Comment,
    Notification, Conversation, ConversationMember, ChatMessage,
    ActivityLog, UserSettings
)

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds initial demonstration data for TaskFlow development and testing'

    def handle(self, *args, **options):
        self.stdout.write('Seeding TaskFlow initial data...')

        # 1. Users
        admin, created = User.objects.get_or_create(
            email='admin@taskflow.dev',
            defaults={
                'username': 'admin',
                'display_name': 'Administrator',
                'job_title': 'Workspace Admin',
                'bio': 'System administrator managing workspaces, roadmaps, and security.',
                'avatar_color': 'blue',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        if created:
            admin.set_password('Admin@12345')
            admin.save()
            UserSettings.objects.get_or_create(user=admin)
            self.stdout.write('Created admin user: admin@taskflow.dev / Admin@12345')

        alex, created = User.objects.get_or_create(
            email='alex.morgan@taskflow.dev',
            defaults={
                'username': 'alex',
                'display_name': 'Alex Morgan',
                'job_title': 'Product Designer Lead',
                'bio': 'Principal Product Designer focusing on high-converting SaaS UI and design systems.',
                'avatar_color': 'purple',
            }
        )
        if created:
            alex.set_password('TaskFlow@123')
            alex.save()
            UserSettings.objects.get_or_create(user=alex)
            self.stdout.write('Created user: alex.morgan@taskflow.dev / TaskFlow@123')

        sarah, created = User.objects.get_or_create(
            email='sarah.wilson@taskflow.dev',
            defaults={
                'username': 'sarah',
                'display_name': 'Sarah Wilson',
                'job_title': 'Senior Frontend Engineer',
                'bio': 'Senior Frontend Engineer developing components, WCAG AA tokens, and animations.',
                'avatar_color': 'green',
            }
        )
        if created:
            sarah.set_password('TaskFlow@123')
            sarah.save()
            UserSettings.objects.get_or_create(user=sarah)
            self.stdout.write('Created user: sarah.wilson@taskflow.dev / TaskFlow@123')

        marcus, created = User.objects.get_or_create(
            email='marcus.lee@taskflow.dev',
            defaults={
                'username': 'marcus',
                'display_name': 'Marcus Lee',
                'job_title': 'Backend Developer',
                'bio': 'Full-stack developer building Django REST APIs and WebSocket consumers.',
                'avatar_color': 'amber',
            }
        )
        if created:
            marcus.set_password('TaskFlow@123')
            marcus.save()
            UserSettings.objects.get_or_create(user=marcus)
            self.stdout.write('Created user: marcus.lee@taskflow.dev / TaskFlow@123')

        # 2. Projects
        today = timezone.now().date()
        p1, _ = Project.objects.get_or_create(
            name='Website Redesign',
            defaults={
                'description': 'Overhaul of product landing pages, dashboard user experience, and responsive tokens.',
                'owner': alex,
                'status': 'Active',
                'start_date': today - datetime.timedelta(days=10),
                'due_date': today + datetime.timedelta(days=20),
            }
        )

        p2, _ = Project.objects.get_or_create(
            name='Mobile App',
            defaults={
                'description': 'Native mobile app companion for iOS and Android task management.',
                'owner': alex,
                'status': 'Planning',
                'start_date': today - datetime.timedelta(days=5),
                'due_date': today + datetime.timedelta(days=30),
            }
        )

        p3, _ = Project.objects.get_or_create(
            name='Marketing Campaign',
            defaults={
                'description': 'Q4 Product release marketing decks, landing pages, and email sequences.',
                'owner': alex,
                'status': 'Active',
                'start_date': today - datetime.timedelta(days=14),
                'due_date': today + datetime.timedelta(days=15),
            }
        )

        # Memberships
        for proj in [p1, p2, p3]:
            for u, role in [(alex, 'owner'), (admin, 'manager'), (sarah, 'member'), (marcus, 'member')]:
                ProjectMembership.objects.get_or_create(project=proj, user=u, defaults={'role': role})

        # 3. Tasks
        t1, _ = Task.objects.get_or_create(
            project=p1,
            title='Finalize homepage wireframes',
            defaults={
                'description': 'Review layout components, navigation flow, and responsive breakpoints with product team before handover.',
                'creator': alex,
                'assignee': alex,
                'status': 'In Progress',
                'priority': 'High',
                'due_date': today,
            }
        )
        SubTask.objects.get_or_create(task=t1, title='Create desktop wireframe mockups', defaults={'is_completed': True})
        SubTask.objects.get_or_create(task=t1, title='Mobile drawer responsive breakdown', defaults={'is_completed': False})

        t2, _ = Task.objects.get_or_create(
            project=p2,
            title='Review API documentation',
            defaults={
                'description': 'Check authentication endpoints, rate limits, and JSON schemas for mobile client integration.',
                'creator': alex,
                'assignee': alex,
                'status': 'To Do',
                'priority': 'Medium',
                'due_date': today + datetime.timedelta(days=1),
            }
        )

        t3, _ = Task.objects.get_or_create(
            project=p3,
            title='Prepare campaign assets',
            defaults={
                'description': 'Export visual banners, social graphics, and copy decks for marketing campaign launch.',
                'creator': alex,
                'assignee': sarah,
                'status': 'To Do',
                'priority': 'Low',
                'due_date': today + datetime.timedelta(days=3),
            }
        )

        t4, _ = Task.objects.get_or_create(
            project=p1,
            title='Complete dashboard UI design',
            defaults={
                'description': 'Design KPI metric cards, project progress timelines, workload tables, and accessible micro-interactions.',
                'creator': alex,
                'assignee': alex,
                'status': 'In Progress',
                'priority': 'High',
                'due_date': today + datetime.timedelta(days=7),
            }
        )
        SubTask.objects.get_or_create(task=t4, title='Align typography scales with Inter font tokens', defaults={'is_completed': True})
        SubTask.objects.get_or_create(task=t4, title='Verify WCAG AA contrast ratios', defaults={'is_completed': True})
        SubTask.objects.get_or_create(task=t4, title='Design collapsible sidebar drawer state', defaults={'is_completed': False})

        t5, _ = Task.objects.get_or_create(
            project=p1,
            title='Test responsive layouts',
            defaults={
                'description': 'Validate mobile drawer, tablet multi-column breakpoints, and wide desktop screens.',
                'creator': sarah,
                'assignee': alex,
                'status': 'Completed',
                'priority': 'Medium',
                'due_date': today - datetime.timedelta(days=1),
            }
        )

        # Comments
        Comment.objects.get_or_create(
            task=t4,
            author=sarah,
            content="I've checked the contrast ratios for the primary blue (#2563EB) against the white cards and everything passes WCAG AA guidelines."
        )
        Comment.objects.get_or_create(
            task=t4,
            author=alex,
            content="Looks great! Once the mobile drawer layout is finalized, let's update the sprint status to In Review."
        )

        # Notifications
        Notification.objects.get_or_create(
            recipient=alex,
            actor=sarah,
            notification_type='comment',
            message='Sarah Wilson commented on Complete dashboard UI design: "Contrast ratios pass WCAG AA."',
            related_task=t4,
            related_project=p1
        )
        Notification.objects.get_or_create(
            recipient=alex,
            actor=admin,
            notification_type='assignment',
            message='You were assigned to Website Redesign: Finalize homepage wireframes',
            related_task=t1,
            related_project=p1
        )

        # Conversations
        conv, c_created = Conversation.objects.get_or_create(
            title='General Team Room',
            defaults={'is_group': True}
        )
        if c_created:
            for u in [alex, admin, sarah, marcus]:
                ConversationMember.objects.create(conversation=conv, user=u)
            ChatMessage.objects.create(
                conversation=conv,
                sender=alex,
                content='Welcome to the TaskFlow real-time team collaboration channel!'
            )

        self.stdout.write(self.style.SUCCESS('Successfully seeded TaskFlow database!'))
