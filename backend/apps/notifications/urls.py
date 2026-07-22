from django.urls import path

from .views import (
    MarkAllNotificationsReadView,
    MarkNotificationReadView,
    NotificationListView,
    UnreadCountView,
)

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification_list"),
    path("unread-count/", UnreadCountView.as_view(), name="notification_unread_count"),
    path("read-all/", MarkAllNotificationsReadView.as_view(), name="notification_read_all"),
    path("<int:pk>/read/", MarkNotificationReadView.as_view(), name="notification_read"),
]
