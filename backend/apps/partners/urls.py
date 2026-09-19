from django.urls import path

from .views import (
    AdminPartnerInterestListView,
    PartnerDashboardView,
    PartnerInterestListCreateView,
    PartnerSchemeDetailView,
    PartnerSchemeListCreateView,
    ProjectDocumentDetailView,
    ProjectDocumentFileView,
    ProjectDocumentListCreateView,
)

urlpatterns = [
    path("tableau-de-bord/", PartnerDashboardView.as_view(), name="partner-dashboard"),
    path("interets/", PartnerInterestListCreateView.as_view(), name="partner-interest-list"),
    path("offres/", PartnerSchemeListCreateView.as_view(), name="partner-scheme-list"),
    path("offres/<int:scheme_id>/", PartnerSchemeDetailView.as_view(), name="partner-scheme-detail"),
    path("documents/", ProjectDocumentListCreateView.as_view(), name="project-document-list"),
    path("documents/<int:document_id>/", ProjectDocumentDetailView.as_view(), name="project-document-detail"),
    path("documents/<int:document_id>/fichier/", ProjectDocumentFileView.as_view(), name="project-document-file"),
    path("admin/interets/", AdminPartnerInterestListView.as_view(), name="admin-partner-interests"),
]
