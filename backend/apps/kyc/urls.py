from django.urls import path

from .views import KycView

urlpatterns = [
    path("", KycView.as_view(), name="kyc"),
    path("submit/", KycView.as_view(), name="kyc_submit"),
]
