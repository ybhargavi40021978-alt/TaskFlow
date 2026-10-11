import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from urllib.parse import parse_qs

User = get_user_model()


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    Consumer for user-specific real-time notifications and updates.
    Routes events to user-specific channel group 'user_<id>'.
    """

    async def connect(self):
        self.user = await self.get_user_from_scope()
        if not self.user or self.user.is_anonymous:
            # Reject unauthorized WebSocket connections
            await self.close(code=4001)
            return

        self.user_group_name = f"user_{self.user.id}"
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )
        await self.accept()

        # Send initial confirmation message
        await self.send(text_data=json.dumps({
            "type": "connection_established",
            "message": f"Connected to real-time notification stream for {self.user.email}",
            "user_id": self.user.id
        }))

    async def disconnect(self, close_code):
        if hasattr(self, "user_group_name"):
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action = data.get("action")
            if action == "ping":
                await self.send(text_data=json.dumps({"type": "pong"}))
        except Exception:
            pass

    async def notification_message(self, event):
        """
        Handler for messages pushed into user group.
        """
        await self.send(text_data=json.dumps({
            "type": "notification",
            "data": event.get("data", {})
        }))

    async def event_message(self, event):
        """
        Handler for any real-time application events (task updates, project changes, etc.).
        """
        await self.send(text_data=json.dumps({
            "type": event.get("event_type", "update"),
            "data": event.get("data", {})
        }))

    async def task_update(self, event):
        """
        Handler for real-time task status / assignment updates.
        """
        await self.send(text_data=json.dumps({
            "type": "task_update",
            "data": event.get("data", {})
        }))

    async def project_update(self, event):
        """
        Handler for real-time project updates.
        """
        await self.send(text_data=json.dumps({
            "type": "project_update",
            "data": event.get("data", {})
        }))

    @database_sync_to_async
    def get_user_from_scope(self):
        user = self.scope.get("user")
        if user and user.is_authenticated:
            return user

        # Query param token fallback: ?token=xxx
        query_string = self.scope.get("query_string", b"").decode("utf-8")
        params = parse_qs(query_string)
        token_key = params.get("token", [None])[0]
        if token_key:
            try:
                token = Token.objects.select_related("user").get(key=token_key)
                return token.user
            except Token.DoesNotExist:
                return None
        return None


class ChatConsumer(AsyncWebsocketConsumer):
    """
    Consumer for real-time conversation messaging.
    Restricted to conversation members only.
    """

    async def connect(self):
        self.conversation_id = self.scope["url_route"]["kwargs"]["conversation_id"]
        self.room_group_name = f"chat_{self.conversation_id}"

        self.user = await self.get_user_from_scope()
        if not self.user or self.user.is_anonymous:
            await self.close(code=4001)
            return

        is_member = await self.check_membership(self.user.id, self.conversation_id)
        if not is_member:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_text = data.get("message", "").strip()
            if not message_text:
                return

            saved_msg = await self.save_message(self.user.id, self.conversation_id, message_text)
            if saved_msg:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "chat_message_broadcast",
                        "data": saved_msg
                    }
                )
        except Exception as e:
            await self.send(text_data=json.dumps({"error": str(e)}))

    async def chat_message_broadcast(self, event):
        await self.send(text_data=json.dumps({
            "type": "chat_message",
            "data": event.get("data", {})
        }))

    @database_sync_to_async
    def get_user_from_scope(self):
        user = self.scope.get("user")
        if user and user.is_authenticated:
            return user
        query_string = self.scope.get("query_string", b"").decode("utf-8")
        params = parse_qs(query_string)
        token_key = params.get("token", [None])[0]
        if token_key:
            try:
                token = Token.objects.select_related("user").get(key=token_key)
                return token.user
            except Token.DoesNotExist:
                return None
        return None

    @database_sync_to_async
    def check_membership(self, user_id, conversation_id):
        from core.models import ConversationMember
        return ConversationMember.objects.filter(
            conversation_id=conversation_id,
            user_id=user_id
        ).exists()

    @database_sync_to_async
    def save_message(self, user_id, conversation_id, content):
        from core.models import ChatMessage, Conversation
        try:
            conversation = Conversation.objects.get(id=conversation_id)
            user = User.objects.get(id=user_id)
            msg = ChatMessage.objects.create(
                conversation=conversation,
                sender=user,
                content=content
            )
            return {
                "id": msg.id,
                "conversation_id": conversation.id,
                "sender_id": user.id,
                "sender_name": user.full_name,
                "sender_initials": user.initials,
                "content": msg.content,
                "created_at": msg.created_at.isoformat(),
            }
        except Exception:
            return None
