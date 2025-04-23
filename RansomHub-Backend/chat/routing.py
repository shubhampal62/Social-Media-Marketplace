from django.urls import path
from . import consumers

websocket_urlpatterns = [
    # The URL will include a chat_id parameter to identify the chat room.
    path('ws/chat/<str:chat_id>/', consumers.ChatConsumer.as_asgi()),
]