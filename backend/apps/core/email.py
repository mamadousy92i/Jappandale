from email.mime.image import MIMEImage
from pathlib import Path
from urllib.parse import urljoin

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string


def send_branded_email(
    *,
    subject,
    message,
    recipient_list,
    plain_message="",
    action_url="",
    action_label="Ouvrir Jappandale",
    headline="",
    eyebrow="JAPPANDALE",
    code="",
    from_email=None,
    connection=None,
    fail_silently=False,
):
    """Envoie un e-mail Jappandale en HTML avec une version texte de secours."""
    absolute_action_url = ""
    if action_url:
        absolute_action_url = (
            action_url
            if action_url.startswith(("http://", "https://"))
            else urljoin(f"{settings.FRONTEND_URL.rstrip('/')}/", action_url.lstrip("/"))
        )

    logo_path = Path(settings.EMAIL_LOGO_PATH)
    logo_attached = logo_path.is_file()
    html_message = render_to_string(
        "emails/base.html",
        {
            "subject": subject,
            "headline": headline or subject,
            "eyebrow": eyebrow,
            "message": message,
            "action_url": absolute_action_url,
            "action_label": action_label,
            "code": code,
            "logo_attached": logo_attached,
            "contact_email": settings.EMAIL_HOST_USER,
        },
    )
    email = EmailMultiAlternatives(
        subject=subject,
        body=plain_message or message,
        from_email=from_email or settings.DEFAULT_FROM_EMAIL,
        to=recipient_list,
        connection=connection,
    )
    email.mixed_subtype = "related"
    email.attach_alternative(html_message, "text/html")
    if logo_attached:
        logo = MIMEImage(logo_path.read_bytes())
        logo.add_header("Content-ID", "<jappandale-logo>")
        logo.add_header("Content-Disposition", "inline", filename="logo-mark.png")
        email.attach(logo)
    return email.send(fail_silently=fail_silently)
