from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .models import Notification


def notify_user(*, recipient, kind, subject, message, action_url=""):
    """Crée la notification interne et tente l'envoi e-mail sans bloquer le métier."""
    notification = Notification.objects.create(
        recipient=recipient,
        kind=kind,
        subject=subject,
        message=message,
        action_url=action_url,
    )
    try:
        sent = send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient.email],
            fail_silently=False,
        )
        notification.delivery_status = (
            Notification.DeliveryStatus.SENT
            if sent
            else Notification.DeliveryStatus.FAILED
        )
        notification.sent_at = timezone.now() if sent else None
    except Exception as error:  # L'échec e-mail ne doit pas annuler l'action métier.
        notification.delivery_status = Notification.DeliveryStatus.FAILED
        notification.delivery_error = str(error)[:255]
    notification.save(
        update_fields=["delivery_status", "delivery_error", "sent_at"]
    )
    return notification
