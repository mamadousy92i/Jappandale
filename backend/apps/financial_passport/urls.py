from django.urls import path

from .views import (
    MyPassportExportView,
    MyPassportExportsView,
    MyPassportView,
    PassportSharingView,
    PassportVerificationView,
)

urlpatterns = [
    path("mine/", MyPassportView.as_view(), name="passport_mine"),
    path("mine/export/", MyPassportExportView.as_view(), name="passport_export"),
    path("mine/exports/", MyPassportExportsView.as_view(), name="passport_exports"),
    path(
        "mine/exports/<uuid:verification_id>/sharing/",
        PassportSharingView.as_view(),
        name="passport_sharing",
    ),
    path(
        "verifier/<uuid:verification_id>/",
        PassportVerificationView.as_view(),
        name="passport_verify",
    ),
]
