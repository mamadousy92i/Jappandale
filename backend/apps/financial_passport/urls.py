from django.urls import path

from .views import MyPassportExportView, MyPassportView, PassportVerificationView

urlpatterns = [
    path("mine/", MyPassportView.as_view(), name="passport_mine"),
    path("mine/export/", MyPassportExportView.as_view(), name="passport_export"),
    path(
        "verifier/<uuid:verification_id>/",
        PassportVerificationView.as_view(),
        name="passport_verify",
    ),
]
