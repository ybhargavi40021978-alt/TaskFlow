from rest_framework import serializers
from django.contrib.auth import authenticate, get_user_model
from rest_framework.authtoken.models import Token
from core.models import (
    Project, ProjectMembership, Task, SubTask, Comment,
    Notification, Conversation, ConversationMember, ChatMessage,
    ActivityLog, UserSettings
)

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    initials = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "full_name",
            "display_name",
            "first_name",
            "last_name",
            "initials",
            "bio",
            "job_title",
            "department",
            "phone",
            "location",
            "avatar_color",
            "profile_picture",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class UserRegistrationSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150, required=True)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, min_length=6, required=True)
    confirm_password = serializers.CharField(write_only=True, required=False)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email address already exists.")
        return value.lower()

    def validate(self, data):
        confirm = data.get("confirm_password")
        if confirm and data["password"] != confirm:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return data

    def create(self, validated_data):
        full_name = validated_data["full_name"].strip()
        email = validated_data["email"].strip().lower()
        password = validated_data["password"]

        name_parts = full_name.split()
        first_name = name_parts[0] if name_parts else ""
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

        # Generate a unique username derived from email
        base_username = email.split("@")[0]
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}_{counter}"
            counter += 1

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            display_name=full_name,
        )
        UserSettings.objects.create(user=user)
        Token.objects.create(user=user)
        return user


class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)

    def validate(self, data):
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid email or password.")

        if not user.check_password(password):
            raise serializers.ValidationError("Invalid email or password.")

        if not user.is_active:
            raise serializers.ValidationError("This user account is inactive.")

        data["user"] = user
        return data


class ProjectMembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source="user", write_only=True
    )

    class Meta:
        model = ProjectMembership
        fields = ["id", "project", "user", "user_id", "role", "joined_at"]
        read_only_fields = ["id", "joined_at"]


class SubTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubTask
        fields = ["id", "task", "title", "is_completed", "created_at"]
        read_only_fields = ["id", "created_at"]


class CommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "task", "author", "content", "created_at", "updated_at"]
        read_only_fields = ["id", "author", "created_at", "updated_at"]


class TaskSerializer(serializers.ModelSerializer):
    creator = UserSerializer(read_only=True)
    assignee_details = UserSerializer(source="assignee", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    subtasks = SubTaskSerializer(many=True, read_only=True)
    comments_count = serializers.IntegerField(source="comments.count", read_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "project",
            "project_name",
            "title",
            "description",
            "creator",
            "assignee",
            "assignee_details",
            "status",
            "priority",
            "start_date",
            "due_date",
            "subtasks",
            "comments_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "creator", "created_at", "updated_at"]


class ProjectSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    progress = serializers.IntegerField(source="progress_percentage", read_only=True)
    total_tasks = serializers.IntegerField(source="total_tasks_count", read_only=True)
    completed_tasks = serializers.IntegerField(source="completed_tasks_count", read_only=True)
    memberships = ProjectMembershipSerializer(many=True, read_only=True)
    team_members = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "description",
            "owner",
            "color",
            "icon",
            "status",
            "department",
            "start_date",
            "due_date",
            "is_archived",
            "progress",
            "total_tasks",
            "completed_tasks",
            "memberships",
            "team_members",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "owner", "created_at", "updated_at"]

    def get_team_members(self, obj):
        memberships = obj.memberships.select_related("user")
        return [
            {
                "id": m.user.id,
                "name": m.user.full_name,
                "initials": m.user.initials,
                "email": m.user.email,
                "role": m.role,
                "job_title": m.user.job_title,
                "avatar_color": m.user.avatar_color,
            }
            for m in memberships
        ]


class NotificationSerializer(serializers.ModelSerializer):
    actor = UserSerializer(read_only=True)
    related_project_name = serializers.CharField(source="related_project.name", read_only=True)
    related_task_title = serializers.CharField(source="related_task.title", read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id",
            "recipient",
            "actor",
            "notification_type",
            "message",
            "related_project",
            "related_project_name",
            "related_task",
            "related_task_title",
            "is_read",
            "created_at",
        ]
        read_only_fields = ["id", "recipient", "actor", "created_at"]


class ChatMessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)

    class Meta:
        model = ChatMessage
        fields = ["id", "conversation", "sender", "content", "created_at"]
        read_only_fields = ["id", "sender", "created_at"]


class ConversationSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)
    members = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ["id", "title", "is_group", "members", "messages", "last_message", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_members(self, obj):
        return [
            {
                "id": m.user.id,
                "name": m.user.full_name,
                "initials": m.user.initials,
                "email": m.user.email,
                "avatar_color": m.user.avatar_color,
            }
            for m in obj.memberships.select_related("user")
        ]

    def get_last_message(self, obj):
        last = obj.messages.order_by("-created_at").first()
        if last:
            return {
                "id": last.id,
                "sender_name": last.sender.full_name,
                "content": last.content,
                "created_at": last.created_at.isoformat(),
            }
        return None


class ActivityLogSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)

    class Meta:
        model = ActivityLog
        fields = ["id", "user", "project", "project_name", "task", "action", "description", "created_at"]
        read_only_fields = ["id", "user", "created_at"]


class UserSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSettings
        fields = ["id", "theme", "email_notifications", "desktop_notifications", "task_reminder_hours", "language"]
