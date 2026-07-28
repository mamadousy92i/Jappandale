from django.urls import path

from .views import DisputeListCreateView

urlpatterns = [
    path("", DisputeListCreateView.as_view(), name="dispute_list_create"),
]
