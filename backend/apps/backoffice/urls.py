from django.urls import path

from .views import (
    CampaignDecisionView,
    DashboardView,
    KycDocumentFileView,
    KycDecisionView,
    ReportReviewView,
    SupportReviewView,
)

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("kyc/<int:user_id>/decision/", KycDecisionView.as_view(), name="kyc-decision"),
    path("kyc-documents/<str:token>/file/", KycDocumentFileView.as_view(), name="kyc-document-file"),
    path("campaigns/<int:campaign_id>/decision/", CampaignDecisionView.as_view(), name="campaign-decision"),
    path("reports/<int:report_id>/", ReportReviewView.as_view(), name="report-review"),
    path("support/<int:request_id>/", SupportReviewView.as_view(), name="support-review"),
]
