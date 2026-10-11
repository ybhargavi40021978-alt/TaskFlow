from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """
    Custom user model for TaskFlow.
    Extends standard Django user with profile attributes, department, and bio.
    """
    email = models.EmailField(unique=True)
    display_name = models.CharField(max_length=150, blank=True)
    bio = models.TextField(blank=True)
    job_title = models.CharField(max_length=100, blank=True, default="Team Member")
    department = models.CharField(max_length=100, blank=True, default="General")
    phone = models.CharField(max_length=30, blank=True)
    location = models.CharField(max_length=100, blank=True, default="Remote")
    profile_picture = models.ImageField(upload_to="profiles/", blank=True, null=True)
    avatar_color = models.CharField(max_length=30, default="blue")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    @property
    def full_name(self):
        if self.display_name:
            return self.display_name
        name = f"{self.first_name} {self.last_name}".strip()
        return name if name else self.username

    @property
    def initials(self):
        name = self.full_name.strip()
        if not name:
            return "TF"
        parts = name.split()
        if len(parts) >= 2:
            return f"{parts[0][0]}{parts[1][0]}".upper()
        return name[:2].upper()

    def __str__(self):
        return self.email


class Project(models.Model):
    """
    Project model for organizing collaborative team tasks.
    """
    STATUS_CHOICES = [
        ("Active", "Active"),
        ("Planning", "Planning"),
        ("At Risk", "At Risk"),
        ("Completed", "Completed"),
    ]

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="owned_projects")
    color = models.CharField(max_length=50, default="blue")
    icon = models.CharField(max_length=50, default="window")
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="Active")
    department = models.CharField(max_length=100, blank=True, default="Engineering")
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["owner", "status"]),
            models.Index(fields=["is_archived"]),
        ]

    def __str__(self):
        return self.name

    @property
    def total_tasks_count(self):
        return self.tasks.count()

    @property
    def completed_tasks_count(self):
        return self.tasks.filter(status="Completed").count()

    @property
    def progress_percentage(self):
        total = self.total_tasks_count
        if total == 0:
            return 0
        return int(round((self.completed_tasks_count / total) * 100))


class ProjectMembership(models.Model):
    """
    Project Membership with role-based access.
    """
    ROLE_CHOICES = [
        ("owner", "Owner"),
        ("manager", "Manager"),
        ("member", "Member"),
        ("viewer", "Viewer"),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="project_memberships")
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default="member")
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("project", "user")
        ordering = ["joined_at"]

    def __str__(self):
        return f"{self.user.email} in {self.project.name} ({self.role})"


class Task(models.Model):
    """
    Task model representing actionable work inside a project.
    """
    STATUS_CHOICES = [
        ("To Do", "To Do"),
        ("In Progress", "In Progress"),
        ("In Review", "In Review"),
        ("Completed", "Completed"),
    ]

    PRIORITY_CHOICES = [
        ("Low", "Low"),
        ("Medium", "Medium"),
        ("High", "High"),
        ("Urgent", "Urgent"),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name="created_tasks")
    assignee = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_tasks")
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="To Do")
    priority = models.CharField(max_length=50, choices=PRIORITY_CHOICES, default="Medium")
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["due_date", "-updated_at"]
        indexes = [
            models.Index(fields=["project", "status"]),
            models.Index(fields=["assignee", "status"]),
            models.Index(fields=["due_date"]),
        ]

    def __str__(self):
        return f"[{self.project.name}] {self.title}"


class SubTask(models.Model):
    """
    Checklist items for a task.
    """
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="subtasks")
    title = models.CharField(max_length=255)
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{'[x]' if self.is_completed else '[ ]'} {self.title}"


class Comment(models.Model):
    """
    Discussion comments attached to a task.
    """
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="task_comments")
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Comment by {self.author.email} on {self.task.title}"


class Notification(models.Model):
    """
    Notification records for real-time delivery and badge management.
    """
    TYPE_CHOICES = [
        ("task_assigned", "Task Assigned"),
        ("status_changed", "Status Changed"),
        ("comment_added", "Comment Added"),
        ("project_invitation", "Project Invitation"),
        ("deadline_approaching", "Deadline Approaching"),
        ("general", "General"),
    ]

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="triggered_notifications")
    notification_type = models.CharField(max_length=50, choices=TYPE_CHOICES, default="general")
    message = models.TextField()
    related_project = models.ForeignKey(Project, on_delete=models.CASCADE, null=True, blank=True)
    related_task = models.ForeignKey(Task, on_delete=models.CASCADE, null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read"]),
            models.Index(fields=["recipient", "-created_at"]),
        ]

    def __str__(self):
        return f"Notification for {self.recipient.email}: {self.message[:30]}"


class Conversation(models.Model):
    """
    Direct or group chat conversation.
    """
    title = models.CharField(max_length=200, blank=True)
    is_group = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title or f"Conversation #{self.id}"


class ConversationMember(models.Model):
    """
    Membership in a chat conversation.
    """
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="conversation_memberships")
    last_read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("conversation", "user")

    def __str__(self):
        return f"{self.user.email} in {self.conversation}"


class ChatMessage(models.Model):
    """
    Chat messages sent within a conversation.
    """
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_messages")
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["conversation", "created_at"]),
        ]

    def __str__(self):
        return f"{self.sender.email}: {self.content[:30]}"


class ActivityLog(models.Model):
    """
    Audit log of actions performed across projects and tasks.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="activities")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, null=True, blank=True, related_name="activities")
    task = models.ForeignKey(Task, on_delete=models.CASCADE, null=True, blank=True, related_name="activities")
    action = models.CharField(max_length=100)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.user.email} {self.action} at {self.created_at}"


class UserSettings(models.Model):
    """
    User workspace and notification preferences.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="settings")
    theme = models.CharField(max_length=20, default="light")
    email_notifications = models.BooleanField(default=True)
    desktop_notifications = models.BooleanField(default=True)
    task_reminder_hours = models.IntegerField(default=24)
    language = models.CharField(max_length=10, default="en")

    def __str__(self):
        return f"Settings for {self.user.email}"
