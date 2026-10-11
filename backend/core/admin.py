from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from core.models import (
    User, Project, ProjectMembership, Task, SubTask, Comment,
    Notification, Conversation, ConversationMember, ChatMessage,
    ActivityLog, UserSettings
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["email", "username", "display_name", "job_title", "department", "is_staff"]
    search_fields = ["email", "username", "display_name"]
    fieldsets = BaseUserAdmin.fieldsets + (
        ("TaskFlow Profile", {
            "fields": ("display_name", "bio", "job_title", "department", "phone", "location", "profile_picture", "avatar_color")
        }),
    )


class ProjectMembershipInline(admin.TabularInline):
    model = ProjectMembership
    extra = 1


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ["name", "owner", "status", "department", "due_date", "is_archived", "created_at"]
    list_filter = ["status", "is_archived", "department"]
    search_fields = ["name", "description"]
    inlines = [ProjectMembershipInline]


class SubTaskInline(admin.TabularInline):
    model = SubTask
    extra = 1


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ["title", "project", "assignee", "status", "priority", "due_date", "created_at"]
    list_filter = ["status", "priority", "project"]
    search_fields = ["title", "description"]
    inlines = [SubTaskInline]


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ["task", "author", "created_at"]
    search_fields = ["content"]


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["recipient", "actor", "notification_type", "is_read", "created_at"]
    list_filter = ["notification_type", "is_read"]


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ["id", "title", "is_group", "created_at"]


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ["conversation", "sender", "content", "created_at"]


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ["user", "action", "project", "task", "created_at"]


@admin.register(UserSettings)
class UserSettingsAdmin(admin.ModelAdmin):
    list_display = ["user", "theme", "language"]
