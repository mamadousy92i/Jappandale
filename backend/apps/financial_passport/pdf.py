from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas


def render_passport_pdf(*, snapshot, verification_id, verification_url, generated_at):
    """Génère le PDF du Passeport Financier à partir d'un agrégat déjà calculé.

    Retourne les octets du PDF. Aucune donnée n'est recalculée ici — le PDF
    reflète exactement le `snapshot` fourni (document figé et vérifiable).
    """
    buffer = BytesIO()
    doc = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    x_margin = 2 * cm
    y = height - 2.5 * cm

    doc.setFont("Helvetica-Bold", 18)
    doc.drawString(x_margin, y, "Passeport Financier Jappandale®")
    y -= 1 * cm

    doc.setFont("Helvetica", 10)
    doc.drawString(x_margin, y, f"Généré le {generated_at:%d/%m/%Y à %H:%M}")
    y -= 0.6 * cm
    doc.drawString(x_margin, y, f"Identifiant de vérification : {verification_id}")
    y -= 0.6 * cm
    doc.drawString(x_margin, y, f"Vérifiable à : {verification_url}")
    y -= 1.2 * cm

    doc.setFont("Helvetica-Bold", 14)
    doc.drawString(x_margin, y, str(snapshot["porteur_name"]))
    y -= 0.7 * cm
    doc.setFont("Helvetica", 11)
    if snapshot.get("porteur_city"):
        doc.drawString(x_margin, y, f"Ville : {snapshot['porteur_city']}")
        y -= 0.6 * cm
    doc.drawString(x_margin, y, f"Membre depuis le {snapshot['member_since']}")
    y -= 1 * cm

    doc.setFont("Helvetica-Bold", 12)
    doc.drawString(x_margin, y, f"Score Jappandale® : {snapshot['score']} / 100")
    y -= 1 * cm

    doc.setFont("Helvetica-Bold", 12)
    doc.drawString(x_margin, y, "Historique des campagnes")
    y -= 0.7 * cm
    doc.setFont("Helvetica", 11)
    lines = [
        f"Campagnes créées : {snapshot['campaigns_total']}",
        f"Campagnes publiées ou clôturées : {snapshot['campaigns_published']}",
        f"Campagnes clôturées avec succès : {snapshot['campaigns_closed_success']}",
        f"Campagnes rejetées ou suspendues : {snapshot['campaigns_rejected_or_suspended']}",
        f"Montant total collecté : {snapshot['total_collected']} FCFA",
        f"Contributions confirmées reçues : {snapshot['confirmed_contributions_count']}",
        f"Financeurs distincts : {snapshot['distinct_contributors']}",
    ]
    for line in lines:
        doc.drawString(x_margin, y, line)
        y -= 0.6 * cm

    y -= 0.4 * cm
    doc.setFont("Helvetica-Bold", 12)
    doc.drawString(x_margin, y, "Litiges")
    y -= 0.7 * cm
    doc.setFont("Helvetica", 11)
    doc.drawString(x_margin, y, f"Litiges reçus : {snapshot['disputes_received']}")
    y -= 0.6 * cm
    doc.drawString(
        x_margin, y, f"Taux de litiges acceptés : {round(snapshot['disputes_accepted_rate'] * 100)} %"
    )

    doc.showPage()
    doc.save()
    return buffer.getvalue()
