from datetime import date, timedelta
from django.utils import timezone
from django.db import transaction
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from rest_framework import status, views, viewsets, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from core.models import (
    Project, ProjectMembership, Task, SubTask, Comment,
    Notification, Conversation, ConversationMember, ChatMessage,
    ActivityLog, UserSettings
)
from core.serializers import (
    UserSerializer, UserRegistrationSerializer, UserLoginSerializer,
    ProjectSerializer, ProjectMembershipSerializer, TaskSerializer,
    SubTaskSerializer, CommentSerializer, NotificationSerializer,
    ConversationSerializer, ChatMessageSerializer, ActivityLogSerializer,
    UserSettingsSerializer
)
from core.permissions import IsProjectMember, IsProjectOwnerOrManager, IsAuthorOrReadOnly
from core.services import create_and_send_notification, log_activity, broadcast_event, broadcast_project_event

User = get_user_model()


# =============================================================================
# 1. AUTHENTICATION VIEWS
# =============================================================================

@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def register_view(request):
    """
    Register a new user account with secure password hashing.
    """
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        log_activity(user, "registered", f"{user.full_name} registered an account.")
        return Response({
            "message": "Registration successful.",
            "token": token.key,
            "user": UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)
    return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def login_view(request):
    """
    Authenticate registered user, returning a secure auth token.
    """
    serializer = UserLoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
        log_activity(user, "logged_in", f"{user.full_name} logged in to workspace.")
        return Response({
            "message": "Login successful.",
            "token": token.key,
            "user": UserSerializer(user).data
        }, status=status.HTTP_200_OK)
    return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
def logout_view(request):
    """
    End current authenticated session and delete user's token.
    """
    try:
        request.user.auth_token.delete()
    except Exception:
        pass
    return Response({"message": "Successfully logged out."}, status=status.HTTP_200_OK)


@api_view(["GET"])
def me_view(request):
    """
    Retrieve currently authenticated user profile and settings.
    """
    user = request.user
    settings, _ = UserSettings.objects.get_or_create(user=user)
    return Response({
        "user": UserSerializer(user).data,
        "settings": UserSettingsSerializer(settings).data
    })


# =============================================================================
# 2. USERS / WORKSPACE MEMBERS
# =============================================================================

@api_view(["GET"])
def users_list_view(request):
    """
    List all workspace users (for assignees, collaborator invites, team directory).
    """
    users = User.objects.filter(is_active=True).order_by("first_name", "last_name", "email")
    query = request.GET.get("search", "").strip()
    if query:
        users = users.filter(
            Q(display_name__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(email__icontains=query) |
            Q(job_title__icontains=query)
        )
    return Response(UserSerializer(users, many=True).data)


# =============================================================================
# 3. PROJECT VIEWSET
# =============================================================================

class ProjectViewSet(viewsets.ModelViewSet):
    """
    Complete CRUD for projects with role-based authorization.
    """
    serializer_class = ProjectSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Project.objects.filter(
            Q(owner=user) | Q(memberships__user=user)
        ).distinct()

        # Status filter
        status_param = self.request.GET.get("status")
        if status_param and status_param != "all":
            queryset = queryset.filter(status=status_param)

        # Tab filter: all, my, shared, archived
        tab = self.request.GET.get("tab")
        if tab == "my":
            queryset = queryset.filter(owner=user, is_archived=False)
        elif tab == "shared":
            queryset = queryset.filter(~Q(owner=user), is_archived=False)
        elif tab == "archived":
            queryset = queryset.filter(is_archived=True)
        elif tab != "archived":
            queryset = queryset.filter(is_archived=False)

        # Search filter
        search = self.request.GET.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(description__icontains=search) | Q(department__icontains=search)
            )

        return queryset

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        name = serializer.validated_data.get("name", "").strip()
        recent_cutoff = timezone.now() - timedelta(seconds=3)
        existing = Project.objects.filter(
            owner=request.user,
            name__iexact=name,
            created_at__gte=recent_cutoff
        ).first()
        if existing:
            return Response(ProjectSerializer(existing).data, status=status.HTTP_200_OK)

        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        project = serializer.save(owner=self.request.user)

        # Add creator as owner membership
        ProjectMembership.objects.get_or_create(
            project=project,
            user=self.request.user,
            defaults={"role": "owner"}
        )
        log_activity(
            self.request.user,
            "created_project",
            f"Created project '{project.name}'",
            project=project
        )

        # Add optional invited members from request payload
        member_ids = self.request.data.get("members", [])
        if isinstance(member_ids, list):
            for m_id in member_ids:
                try:
                    member_user = User.objects.get(id=m_id)
                    if member_user != self.request.user:
                        ProjectMembership.objects.get_or_create(
                            project=project,
                            user=member_user,
                            defaults={"role": "member"}
                        )
                        create_and_send_notification(
                             recipient=member_user,
                             actor=self.request.user,
                             notification_type="project_invitation",
                             message=f"{self.request.user.full_name} added you to project '{project.name}'.",
                             related_project=project
                        )
                except User.DoesNotExist:
                    pass

        broadcast_project_event(project, "project_update", {
            "action": "created",
            "project": ProjectSerializer(project).data
        })

    def perform_update(self, serializer):
        project = serializer.save()
        log_activity(
            self.request.user,
            "updated_project",
            f"Updated project details for '{project.name}'",
            project=project
        )
        broadcast_project_event(project, "project_update", {
            "action": "updated",
            "project": ProjectSerializer(project).data
        })

    def perform_destroy(self, instance):
        # Verify ownership or manager permission
        membership = ProjectMembership.objects.filter(
            project=instance, user=self.request.user, role__in=["owner", "manager"]
        ).exists()
        if instance.owner != self.request.user and not membership:
            raise permissions.PermissionDenied("Only the project owner or manager can delete this project.")

        broadcast_project_event(instance, "project_update", {
            "action": "deleted",
            "project_id": instance.id
        })
        log_activity(
            self.request.user,
            "deleted_project",
            f"Deleted project '{instance.name}'",
        )
        instance.delete()

    @action(detail=True, methods=["get", "post"])
    def members(self, request, pk=None):
        project = self.get_object()
        if request.method == "GET":
            memberships = project.memberships.select_related("user")
            return Response(ProjectMembershipSerializer(memberships, many=True).data)

        # POST: Add member
        user_identifier = request.data.get("user_id") or request.data.get("email")
        role = request.data.get("role", "member")

        try:
            if isinstance(user_identifier, int) or (isinstance(user_identifier, str) and user_identifier.isdigit()):
                target_user = User.objects.get(id=int(user_identifier))
            else:
                target_user = User.objects.get(email__iexact=str(user_identifier).strip())
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        membership, created = ProjectMembership.objects.get_or_create(
            project=project,
            user=target_user,
            defaults={"role": role}
        )
        if not created and membership.role != role:
            membership.role = role
            membership.save()

        create_and_send_notification(
            recipient=target_user,
            actor=request.user,
            notification_type="project_invitation",
            message=f"{request.user.full_name} invited you to project '{project.name}' as a {role}.",
            related_project=project
        )
        log_activity(
            request.user,
            "added_member",
            f"Added {target_user.full_name} to '{project.name}' as {role}.",
            project=project
        )
        broadcast_project_event(project, "project_update", {
            "action": "member_added",
            "project_id": project.id,
            "user_id": target_user.id
        })
        return Response(ProjectMembershipSerializer(membership).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path="members/(?P<user_id>[^/.]+)")
    def remove_member(self, request, pk=None, user_id=None):
        project = self.get_object()
        # Check permissions: owner or manager, or self-removal
        is_admin = ProjectMembership.objects.filter(
            project=project, user=request.user, role__in=["owner", "manager"]
        ).exists() or project.owner == request.user

        if not is_admin and str(request.user.id) != str(user_id):
            return Response({"error": "You do not have permission to remove this member."}, status=status.HTTP_403_FORBIDDEN)

        try:
            membership = ProjectMembership.objects.get(project=project, user_id=user_id)
            if membership.user == project.owner:
                return Response({"error": "Cannot remove the project owner."}, status=status.HTTP_400_BAD_REQUEST)
            membership.delete()
            broadcast_project_event(project, "project_update", {
                "action": "member_removed",
                "project_id": project.id,
                "user_id": int(user_id)
            })
            return Response({"message": "Member removed successfully."})
        except ProjectMembership.DoesNotExist:
            return Response({"error": "Membership not found."}, status=status.HTTP_404_NOT_FOUND)


# =============================================================================
# 4. TASK VIEWSET
# =============================================================================

class TaskViewSet(viewsets.ModelViewSet):
    """
    Complete CRUD for tasks, with status updates, assignments, and filtering.
    """
    serializer_class = TaskSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Task.objects.filter(
            Q(project__owner=user) | Q(project__memberships__user=user)
        ).distinct()

        # Filters
        project_id = self.request.GET.get("project")
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        assignee_id = self.request.GET.get("assignee")
        if assignee_id:
            queryset = queryset.filter(assignee_id=assignee_id)

        my_tasks = self.request.GET.get("my_tasks")
        if my_tasks in ("true", "1", "True"):
            queryset = queryset.filter(assignee=user)

        status_param = self.request.GET.get("status")
        if status_param and status_param != "all":
            queryset = queryset.filter(status=status_param)

        priority_param = self.request.GET.get("priority")
        if priority_param and priority_param != "all":
            queryset = queryset.filter(priority=priority_param)

        search = self.request.GET.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )

        return queryset

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        title = serializer.validated_data.get("title", "").strip()
        proj = serializer.validated_data.get("project")
        recent_cutoff = timezone.now() - timedelta(seconds=3)
        existing = Task.objects.filter(
            project=proj,
            title__iexact=title,
            creator=request.user,
            created_at__gte=recent_cutoff
        ).first()
        if existing:
            return Response(TaskSerializer(existing).data, status=status.HTTP_200_OK)

        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        task = serializer.save(creator=self.request.user)

        log_activity(
            self.request.user,
            "created_task",
            f"Created task '{task.title}' in '{task.project.name}'",
            project=task.project,
            task=task
        )

        # Notify assignee if assigned to someone else
        if task.assignee and task.assignee != self.request.user:
            create_and_send_notification(
                recipient=task.assignee,
                actor=self.request.user,
                notification_type="task_assigned",
                message=f"{self.request.user.full_name} assigned you the task '{task.title}'.",
                related_project=task.project,
                related_task=task
            )

        broadcast_project_event(task.project, "task_update", {
            "action": "created",
            "task": TaskSerializer(task).data
        })

    def perform_update(self, serializer):
        old_task = self.get_object()
        old_status = old_task.status
        old_assignee = old_task.assignee

        task = serializer.save()

        # Check status change
        if task.status != old_status:
            log_activity(
                self.request.user,
                "changed_status",
                f"Changed status of '{task.title}' to '{task.status}'",
                project=task.project,
                task=task
            )
            # Notify assignee or creator
            target = task.assignee if task.assignee != self.request.user else task.creator
            if target:
                create_and_send_notification(
                    recipient=target,
                    actor=self.request.user,
                    notification_type="status_changed",
                    message=f"Task '{task.title}' moved to {task.status}.",
                    related_project=task.project,
                    related_task=task
                )

        # Check assignee change
        if task.assignee and task.assignee != old_assignee and task.assignee != self.request.user:
            create_and_send_notification(
                recipient=task.assignee,
                actor=self.request.user,
                notification_type="task_assigned",
                message=f"{self.request.user.full_name} assigned you the task '{task.title}'.",
                related_project=task.project,
                related_task=task
            )

        broadcast_project_event(task.project, "task_update", {
            "action": "updated",
            "task": TaskSerializer(task).data
        })

    def perform_destroy(self, instance):
        broadcast_project_event(instance.project, "task_update", {
            "action": "deleted",
            "task_id": instance.id,
            "project_id": instance.project_id
        })
        log_activity(
            self.request.user,
            "deleted_task",
            f"Deleted task '{instance.title}' from '{instance.project.name}'",
            project=instance.project
        )
        instance.delete()

    @action(detail=True, methods=["get", "post"])
    def comments(self, request, pk=None):
        task = self.get_object()
        if request.method == "GET":
            comments = task.comments.select_related("author")
            return Response(CommentSerializer(comments, many=True).data)

        # POST comment
        content = request.data.get("content", "").strip()
        if not content:
            return Response({"error": "Comment cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        # Prevent duplicate double-clicks
        recent_cutoff = timezone.now() - timedelta(seconds=2)
        existing = Comment.objects.filter(
            task=task,
            author=request.user,
            content=content,
            created_at__gte=recent_cutoff
        ).first()
        if existing:
            return Response(CommentSerializer(existing).data, status=status.HTTP_200_OK)

        comment = Comment.objects.create(
            task=task,
            author=request.user,
            content=content
        )

        # Notify task assignee or creator
        notify_users = {task.creator, task.assignee} - {request.user, None}
        for u in notify_users:
            create_and_send_notification(
                recipient=u,
                actor=request.user,
                notification_type="comment_added",
                message=f"{request.user.full_name} commented on task '{task.title}'.",
                related_project=task.project,
                related_task=task
            )

        broadcast_project_event(task.project, "comment_added", {
            "task_id": task.id,
            "comment": CommentSerializer(comment).data
        })

        return Response(CommentSerializer(comment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def subtasks(self, request, pk=None):
        task = self.get_object()
        title = request.data.get("title", "").strip()
        if not title:
            return Response({"error": "Subtask title is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Prevent duplicate subtask with exact title on this task
        existing = SubTask.objects.filter(task=task, title__iexact=title).first()
        if existing:
            return Response(SubTaskSerializer(existing).data, status=status.HTTP_200_OK)

        subtask = SubTask.objects.create(task=task, title=title)
        broadcast_project_event(task.project, "task_update", {
            "action": "subtask_created",
            "task_id": task.id,
            "subtask": SubTaskSerializer(subtask).data
        })
        return Response(SubTaskSerializer(subtask).data, status=status.HTTP_201_CREATED)


# =============================================================================
# 5. SUBTASK & COMMENT INDIVIDUAL ACTIONS
# =============================================================================

@api_view(["PATCH", "DELETE"])
def subtask_detail_view(request, pk):
    subtask = get_object_or_404(SubTask, pk=pk)
    if request.method == "PATCH":
        if "is_completed" in request.data:
            subtask.is_completed = bool(request.data["is_completed"])
        if "title" in request.data:
            subtask.title = request.data["title"].strip()
        subtask.save()
        return Response(SubTaskSerializer(subtask).data)

    subtask.delete()
    return Response({"message": "Subtask deleted successfully."})


@api_view(["PATCH", "DELETE"])
def comment_detail_view(request, pk):
    comment = get_object_or_404(Comment, pk=pk)
    if comment.author != request.user:
        return Response({"error": "You can only modify your own comments."}, status=status.HTTP_403_FORBIDDEN)

    if request.method == "PATCH":
        content = request.data.get("content", "").strip()
        if not content:
            return Response({"error": "Comment content cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)
        comment.content = content
        comment.save()
        return Response(CommentSerializer(comment).data)

    comment.delete()
    return Response({"message": "Comment deleted successfully."})


# =============================================================================
# 6. NOTIFICATIONS
# =============================================================================

@api_view(["GET"])
def notifications_list_view(request):
    notifications = Notification.objects.filter(recipient=request.user).order_by("-created_at")[:50]
    unread_count = Notification.objects.filter(recipient=request.user, is_read=False).count()
    return Response({
        "unread_count": unread_count,
        "results": NotificationSerializer(notifications, many=True).data
    })


@api_view(["POST"])
def mark_notification_read_view(request, pk):
    notif = get_object_or_404(Notification, pk=pk, recipient=request.user)
    notif.is_read = True
    notif.save()
    unread_count = Notification.objects.filter(recipient=request.user, is_read=False).count()
    return Response({"message": "Notification marked as read.", "unread_count": unread_count})


@api_view(["POST"])
def mark_all_notifications_read_view(request):
    Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
    return Response({"message": "All notifications marked as read.", "unread_count": 0})


@api_view(["DELETE"])
def delete_notification_view(request, pk):
    notif = get_object_or_404(Notification, pk=pk, recipient=request.user)
    notif.delete()
    unread_count = Notification.objects.filter(recipient=request.user, is_read=False).count()
    return Response({"message": "Notification deleted.", "unread_count": unread_count})


# =============================================================================
# 7. DASHBOARD METRICS & RECENT ACTIVITY
# =============================================================================

@api_view(["GET"])
def dashboard_summary_view(request):
    user = request.user
    today = date.today()

    accessible_projects = Project.objects.filter(
        Q(owner=user) | Q(memberships__user=user),
        is_archived=False
    ).distinct()

    accessible_tasks = Task.objects.filter(
        Q(project__owner=user) | Q(project__memberships__user=user)
    ).distinct()

    total_projects = accessible_projects.count()
    total_tasks = accessible_tasks.count()
    in_progress_tasks = accessible_tasks.filter(status="In Progress").count()
    completed_tasks = accessible_tasks.filter(status="Completed").count()
    overdue_tasks = accessible_tasks.filter(
        due_date__lt=today,
        status__in=["To Do", "In Progress", "In Review"]
    ).count()

    my_assigned_tasks = accessible_tasks.filter(assignee=user).count()

    # Upcoming deadlines (next 7 days)
    upcoming_deadlines = accessible_tasks.filter(
        due_date__gte=today,
        status__in=["To Do", "In Progress", "In Review"]
    ).order_by("due_date")[:5]

    return Response({
        "total_projects": total_projects,
        "total_tasks": total_tasks,
        "in_progress_tasks": in_progress_tasks,
        "completed_tasks": completed_tasks,
        "overdue_tasks": overdue_tasks,
        "my_tasks_count": my_assigned_tasks,
        "upcoming_deadlines": TaskSerializer(upcoming_deadlines, many=True).data,
    })


@api_view(["GET"])
def dashboard_activity_view(request):
    user = request.user
    activities = ActivityLog.objects.filter(
        Q(project__owner=user) | Q(project__memberships__user=user) | Q(user=user)
    ).distinct().order_by("-created_at")[:15]
    return Response(ActivityLogSerializer(activities, many=True).data)


# =============================================================================
# 8. USER PROFILE & SETTINGS
# =============================================================================

@api_view(["GET", "PATCH"])
def profile_view(request):
    user = request.user
    if request.method == "GET":
        return Response(UserSerializer(user).data)

    # PATCH
    data = request.data
    for field in ["display_name", "first_name", "last_name", "bio", "job_title", "department", "phone", "location", "avatar_color"]:
        if field in data:
            setattr(user, field, data[field])

    if "profile_picture" in request.FILES:
        user.profile_picture = request.FILES["profile_picture"]

    user.save()
    return Response(UserSerializer(user).data)


@api_view(["POST"])
def change_password_view(request):
    user = request.user
    old_password = request.data.get("old_password")
    new_password = request.data.get("new_password")
    confirm_password = request.data.get("confirm_password")

    if not user.check_password(old_password):
        return Response({"error": "Current password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)

    if not new_password or len(new_password) < 6:
        return Response({"error": "New password must be at least 6 characters."}, status=status.HTTP_400_BAD_REQUEST)

    if new_password != confirm_password:
        return Response({"error": "New passwords do not match."}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()
    Token.objects.filter(user=user).delete()
    new_token = Token.objects.create(user=user)
    return Response({"message": "Password changed successfully.", "token": new_token.key})


@api_view(["GET", "PATCH"])
def settings_view(request):
    settings, _ = UserSettings.objects.get_or_create(user=request.user)
    if request.method == "GET":
        return Response(UserSettingsSerializer(settings).data)

    serializer = UserSettingsSerializer(settings, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
# 9. CONVERSATIONS & CHAT
# =============================================================================

class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer

    def get_queryset(self):
        return Conversation.objects.filter(memberships__user=self.request.user).distinct()

    def perform_create(self, serializer):
        conversation = serializer.save()
        ConversationMember.objects.create(conversation=conversation, user=self.request.user)

        member_ids = self.request.data.get("members", [])
        for m_id in member_ids:
            try:
                target_user = User.objects.get(id=m_id)
                if target_user != self.request.user:
                    ConversationMember.objects.get_or_create(conversation=conversation, user=target_user)
            except User.DoesNotExist:
                pass

    @action(detail=True, methods=["get", "post"])
    def messages(self, request, pk=None):
        conversation = self.get_object()
        if request.method == "GET":
            messages = conversation.messages.select_related("sender").order_by("created_at")[:100]
            return Response(ChatMessageSerializer(messages, many=True).data)

        # POST message
        content = request.data.get("content", "").strip()
        if not content:
            return Response({"error": "Message content cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        # Deduplicate fast retries/double submissions
        recent_cutoff = timezone.now() - timedelta(seconds=2)
        existing = ChatMessage.objects.filter(
            conversation=conversation,
            sender=request.user,
            content=content,
            created_at__gte=recent_cutoff
        ).first()
        if existing:
            return Response(ChatMessageSerializer(existing).data, status=status.HTTP_200_OK)

        msg = ChatMessage.objects.create(
            conversation=conversation,
            sender=request.user,
            content=content
        )

        msg_data = {
            "id": msg.id,
            "conversation_id": conversation.id,
            "sender_id": request.user.id,
            "sender_name": request.user.full_name,
            "sender_initials": request.user.initials,
            "content": msg.content,
            "created_at": msg.created_at.isoformat(),
        }

        # Broadcast to conversation room group
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"chat_{conversation.id}",
                {
                    "type": "chat_message_broadcast",
                    "data": msg_data
                }
            )

        # Also broadcast to all conversation members' notification stream
        member_ids = list(conversation.memberships.values_list("user_id", flat=True))
        broadcast_event(member_ids, "chat_message", msg_data)

        return Response(ChatMessageSerializer(msg).data, status=status.HTTP_201_CREATED)
