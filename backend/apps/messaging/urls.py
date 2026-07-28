from django.urls import path

from .views import ThreadListCreateView, ThreadMessagesView

urlpatterns = [
    path("threads/", ThreadListCreateView.as_view(), name="thread_list_create"),
    path(
        "threads/<int:thread_id>/messages/",
        ThreadMessagesView.as_view(),
        name="thread_messages",
    ),
]
