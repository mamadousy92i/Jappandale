from django.utils import timezone

from apps.core.email import send_branded_email

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
        sent = send_branded_email(
            subject=subject,
            message=message,
            recipient_list=[recipient.email],
            action_url=action_url,
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


def notify_admins(*, subject, message, action_url="/administration"):
    """Informe les comptes administrateurs actifs d'une nouvelle tâche."""
    from apps.accounts.models import User

    notifications = []
    for admin in User.objects.filter(role=User.Role.ADMIN, is_active=True):
        notifications.append(
            notify_user(
                recipient=admin,
                kind=Notification.Kind.ADMIN_ACTION_REQUIRED,
                subject=subject,
                message=message,
                action_url=action_url,
            )
        )
    return notifications
