from django.urls import path

from .views import (
    ContributionPaymentStartView,
    FeePaymentStartView,
    PaymentConfigView,
    PaytechIpnView,
)

urlpatterns = [
    path("config/", PaymentConfigView.as_view(), name="payment-config"),
    path(
        "contributions/<uuid:reference>/start/",
        ContributionPaymentStartView.as_view(),
        name="payment-contribution-start",
    ),
    path(
        "campaigns/<slug:slug>/fee/start/",
        FeePaymentStartView.as_view(),
        name="payment-fee-start",
    ),
    path("paytech/ipn/", PaytechIpnView.as_view(), name="paytech-ipn"),
]
