from django.urls import re_path, path
from core import consumers

websocket_urlpatterns = [
    path("ws/notifications/", consumers.NotificationConsumer.as_asgi()),
    path("ws/chat/<int:conversation_id>/", consumers.ChatConsumer.as_asgi()),
]
