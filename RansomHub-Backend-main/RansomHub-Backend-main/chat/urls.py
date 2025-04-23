from django.urls import path

from .views import (
    add_group_members,
    create_group,
    get_all_groups,
    get_blockchain_messages,
    get_group_messages,
    get_groups,
    get_messages,
    get_user_public_key,
    send_file,
    send_group_file,
    send_group_message,
    send_message,
)

urlpatterns = [
    path("send_message", send_message, name="message"),
    path("send_group_message", send_group_message, name="group_message"),
    path("get_messages", get_messages, name="get_messages"),
    path("get_group_messages", get_group_messages, name="get_group_messages"),
    path("create_group", create_group, name="create_group"),
    path("add_group_members", add_group_members, name="add_group_members"),
    path("get_groups", get_groups, name="get_groups"),
    path("get_all_groups", get_all_groups, name="get_all_groups"),
    path("get_user_public_key", get_user_public_key, name="get_user_public_key"),
    path("send_file", send_file, name="send_file"),
    path("send_group_file", send_group_file, name="send_group_file"),
    path("get_blockchain_messages", get_blockchain_messages, name="get_blockchain_messages"),
]
