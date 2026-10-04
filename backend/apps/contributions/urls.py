from django.urls import path

from .views import (
    ConfirmContributionView,
    ContributionCreateView,
    ContributionDetailView,
    MyContributionsView,
    ReceivedContributionsView,
)

urlpatterns = [
    path("", ContributionCreateView.as_view(), name="contribution_create"),
    path("mine/", MyContributionsView.as_view(), name="contribution_mine"),
    path("received/", ReceivedContributionsView.as_view(), name="contribution_received"),
    path("<uuid:reference>/", ContributionDetailView.as_view(), name="contribution_detail"),
    path(
        "<uuid:reference>/confirm/",
        ConfirmContributionView.as_view(),
        name="contribution_confirm",
    ),
]
