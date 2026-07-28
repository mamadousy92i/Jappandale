from django.urls import path

from .views import ThreadListCreateView

urlpatterns = [
    path("threads/", ThreadListCreateView.as_view(), name="thread_list_create"),
]
