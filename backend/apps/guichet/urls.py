from django.urls import path

from .admin_views import (
    AdminFinancingSchemeDetailView,
    AdminFinancingSchemeListView,
    AdminGuichetStatsView,
    AdminSchemeReferralDetailView,
    AdminSchemeReferralListView,
)
from .views import ExpressInterestView, FinancingSchemeListView, MyReferralsView

urlpatterns = [
    path("dispositifs/", FinancingSchemeListView.as_view(), name="scheme-list"),
    path(
        "dispositifs/<int:scheme_id>/interet/",
        ExpressInterestView.as_view(),
        name="scheme-interest",
    ),
    path("mes-orientations/", MyReferralsView.as_view(), name="my-referrals"),
    path(
        "admin/dispositifs/",
        AdminFinancingSchemeListView.as_view(),
        name="admin-scheme-list",
    ),
    path(
        "admin/dispositifs/<int:scheme_id>/",
        AdminFinancingSchemeDetailView.as_view(),
        name="admin-scheme-detail",
    ),
    path(
        "admin/orientations/",
        AdminSchemeReferralListView.as_view(),
        name="admin-referral-list",
    ),
    path(
        "admin/orientations/<int:referral_id>/",
        AdminSchemeReferralDetailView.as_view(),
        name="admin-referral-detail",
    ),
    path("admin/stats/", AdminGuichetStatsView.as_view(), name="admin-stats"),
]
