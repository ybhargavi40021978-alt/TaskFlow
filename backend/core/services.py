from datetime import timedelta
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.utils import timezone
from core.models import Notification, ActivityLog


def log_activity(user, action, description, project=None, task=None):
    """
    Records an activity audit log.
    """
    try:
        return ActivityLog.objects.create(
            user=user,
            project=project,
            task=task,
            action=action,
            description=description,
        )
    except Exception:
        return None


def broadcast_event(user_ids, event_type, data):
    """
    Broadcasts real-time events to specified user groups via Django Channels.
    """
    channel_layer = get_channel_layer()
    if not channel_layer or not user_ids:
        return

    unique_uids = {uid for uid in user_ids if uid}
    for uid in unique_uids:
        try:
            async_to_sync(channel_layer.group_send)(
                f"user_{uid}",
                {
                    "type": "event_message",
                    "event_type": event_type,
                    "data": data,
                }
            )
        except Exception:
            pass


def broadcast_project_event(project, event_type, data):
    """
    Broadcasts a project-scoped real-time update to all members of the project.
    """
    if not project:
        return
    user_ids = set()
    if project.owner_id:
        user_ids.add(project.owner_id)
    member_ids = project.memberships.values_list("user_id", flat=True)
    user_ids.update(member_ids)
    broadcast_event(user_ids, event_type, data)


def create_and_send_notification(recipient, actor, notification_type, message, related_project=None, related_task=None):
    """
    Creates a Notification record in the database and broadcasts it in real-time
    over WebSockets via Django Channels to the recipient's specific group.
    Prevents duplicate unread notification spam within a 5-minute window for the same event.
    """
    if not recipient or recipient == actor:
        # Don't notify oneself of one's own action
        return None

    # Check for duplicate unread notification in the last 5 minutes
    recent_cutoff = timezone.now() - timedelta(minutes=5)
    existing = Notification.objects.filter(
        recipient=recipient,
        actor=actor,
        notification_type=notification_type,
        message=message,
        related_project=related_project,
        related_task=related_task,
        is_read=False,
        created_at__gte=recent_cutoff,
    ).first()

    if existing:
        return existing

    notification = Notification.objects.create(
        recipient=recipient,
        actor=actor,
        notification_type=notification_type,
        message=message,
        related_project=related_project,
        related_task=related_task,
        is_read=False,
    )

    payload = {
        "id": notification.id,
        "type": notification_type,
        "message": message,
        "actor_name": actor.full_name if actor else "TaskFlow System",
        "actor_initials": actor.initials if actor else "TF",
        "project_id": related_project.id if related_project else None,
        "project_name": related_project.name if related_project else None,
        "task_id": related_task.id if related_task else None,
        "task_title": related_task.title if related_task else None,
        "created_at": notification.created_at.isoformat(),
    }

    # Broadcast via channel layer to recipient
    broadcast_event([recipient.id], "notification", payload)

    return notification
