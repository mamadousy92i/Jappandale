def admin_metrics(request):
    """Indicateurs synthétiques, calculés uniquement pour le back-office."""
    if not request.path.startswith("/admin/") or not request.user.is_staff:
        return {}

    from django.contrib.auth import get_user_model
    from django.db.models import Sum

    from apps.campaigns.models import Campaign, CampaignReport
    from apps.contributions.models import Contribution
    from apps.core.models import SupportRequest

    User = get_user_model()
    confirmed = Contribution.objects.filter(status=Contribution.Status.CONFIRMEE)
    return {
        "admin_metrics": {
            "pending_kyc": User.objects.filter(
                kyc_status=User.KycStatus.EN_ATTENTE
            ).count(),
            "pending_campaigns": Campaign.objects.filter(
                status=Campaign.Status.EN_MODERATION
            ).count(),
            "published_campaigns": Campaign.objects.filter(
                status=Campaign.Status.PUBLIEE
            ).count(),
            "confirmed_amount": confirmed.aggregate(total=Sum("amount"))["total"] or 0,
            "confirmed_count": confirmed.count(),
            "new_reports": CampaignReport.objects.filter(
                status=CampaignReport.Status.NOUVEAU
            ).count(),
            "new_support_requests": SupportRequest.objects.filter(
                status=SupportRequest.Status.NOUVELLE
            ).count(),
        }
    }
