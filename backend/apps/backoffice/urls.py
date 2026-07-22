from django.urls import path

from .views import (
    CampaignDecisionView,
    CampaignWorkflowView,
    DashboardView,
    KycDocumentFileView,
    KycDecisionView,
    ReportReviewView,
    ExportDownloadView,
    ExportTicketView,
    SupportReplyView,
    SupportReviewView,
    UserListView,
    UserManagementView,
    WorkAssignmentView,
)

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("kyc/<int:user_id>/decision/", KycDecisionView.as_view(), name="kyc-decision"),
    path("kyc-documents/<str:token>/file/", KycDocumentFileView.as_view(), name="kyc-document-file"),
    path("campaigns/<int:campaign_id>/decision/", CampaignDecisionView.as_view(), name="campaign-decision"),
    path("campaigns/<int:campaign_id>/workflow/", CampaignWorkflowView.as_view(), name="campaign-workflow"),
    path("reports/<int:report_id>/", ReportReviewView.as_view(), name="report-review"),
    path("support/<int:request_id>/", SupportReviewView.as_view(), name="support-review"),
    path("support/<int:request_id>/reply/", SupportReplyView.as_view(), name="support-reply"),
    path("assign/", WorkAssignmentView.as_view(), name="work-assignment"),
    path("users/", UserListView.as_view(), name="users"),
    path("users/<int:user_id>/", UserManagementView.as_view(), name="user-management"),
    path("exports/<str:kind>/ticket/", ExportTicketView.as_view(), name="export-ticket"),
    path("exports/download/<str:token>/", ExportDownloadView.as_view(), name="export-download"),
]
