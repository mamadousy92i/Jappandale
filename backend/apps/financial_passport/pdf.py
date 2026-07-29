from io import BytesIO
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas

# Charte graphique Jappandale (cf. frontend/src/index.css)
GOLD = colors.HexColor("#fac502")
GOLD_DARK = colors.HexColor("#c99a00")
INK = colors.HexColor("#1a1a1a")
INK_SECONDARY = colors.HexColor("#555555")
INK_MUTED = colors.HexColor("#888888")
SURFACE_ALT = colors.HexColor("#f5f5f5")
EMERALD = colors.HexColor("#059669")

LOGO_PATH = Path(__file__).parent / "assets" / "logo-mark.png"

PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN = 2 * cm


def _stat_card(doc, x, y, width, height, label, value, value_color=INK):
    doc.setFillColor(SURFACE_ALT)
    doc.roundRect(x, y - height, width, height, 6, stroke=0, fill=1)
    doc.setFillColor(INK_MUTED)
    doc.setFont("Helvetica", 8)
    doc.drawString(x + 0.4 * cm, y - 0.6 * cm, label)
    doc.setFillColor(value_color)
    doc.setFont("Helvetica-Bold", 15)
    doc.drawString(x + 0.4 * cm, y - height + 0.5 * cm, value)


def render_passport_pdf(*, snapshot, verification_id, verification_url, generated_at):
    """Génère le PDF du Passeport Financier, aux couleurs de la charte Jappandale.

    Retourne les octets du PDF. Aucune donnée n'est recalculée ici — le PDF
    reflète exactement le `snapshot` fourni (document figé et vérifiable).
    """
    buffer = BytesIO()
    doc = canvas.Canvas(buffer, pagesize=A4)

    # Bandeau d'en-tête doré avec logo et nom de la marque.
    band_height = 2.8 * cm
    doc.setFillColor(GOLD)
    doc.rect(0, PAGE_HEIGHT - band_height, PAGE_WIDTH, band_height, stroke=0, fill=1)
    if LOGO_PATH.exists():
        logo_size = 1.8 * cm
        doc.drawImage(
            str(LOGO_PATH),
            MARGIN,
            PAGE_HEIGHT - band_height + (band_height - logo_size) / 2,
            width=logo_size,
            height=logo_size,
            mask="auto",
        )
    doc.setFillColor(INK)
    doc.setFont("Helvetica-Bold", 20)
    doc.drawString(MARGIN + 2.3 * cm, PAGE_HEIGHT - band_height / 2 - 0.15 * cm, "JAPPANDALE")
    doc.setFont("Helvetica", 9)
    doc.drawString(
        MARGIN + 2.3 * cm,
        PAGE_HEIGHT - band_height / 2 - 0.7 * cm,
        "Connecter les projets aux opportunités de financement",
    )

    y = PAGE_HEIGHT - band_height - 1.1 * cm

    doc.setFillColor(GOLD_DARK)
    doc.setFont("Helvetica-Bold", 17)
    doc.drawString(MARGIN, y, "Passeport Financier Jappandale®")
    y -= 0.55 * cm
    doc.setFillColor(INK_MUTED)
    doc.setFont("Helvetica", 9)
    doc.drawString(MARGIN, y, "Document généré automatiquement, certifié et vérifiable en ligne.")
    y -= 0.9 * cm

    doc.setStrokeColor(GOLD)
    doc.setLineWidth(1)
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
    y -= 0.7 * cm

    doc.setFillColor(INK_MUTED)
    doc.setFont("Helvetica", 8.5)
    doc.drawString(MARGIN, y, f"Généré le {generated_at:%d/%m/%Y à %H:%M}")
    y -= 0.45 * cm
    doc.drawString(MARGIN, y, f"Identifiant de vérification : {verification_id}")
    y -= 0.45 * cm
    doc.drawString(MARGIN, y, f"Vérifiable à : {verification_url}")
    y -= 1 * cm

    doc.setFillColor(INK)
    doc.setFont("Helvetica-Bold", 15)
    doc.drawString(MARGIN, y, str(snapshot["porteur_name"]))
    y -= 0.6 * cm
    doc.setFillColor(INK_SECONDARY)
    doc.setFont("Helvetica", 10)
    subtitle = f"Membre depuis le {snapshot['member_since']}"
    if snapshot.get("porteur_city"):
        subtitle = f"{snapshot['porteur_city']} · {subtitle}"
    doc.drawString(MARGIN, y, subtitle)
    y -= 1 * cm

    # Carte Score, mise en avant.
    score_card_height = 2.2 * cm
    doc.setFillColor(SURFACE_ALT)
    doc.roundRect(MARGIN, y - score_card_height, PAGE_WIDTH - 2 * MARGIN, score_card_height, 8, stroke=0, fill=1)
    doc.setFillColor(GOLD_DARK)
    doc.setFont("Helvetica-Bold", 26)
    doc.drawString(MARGIN + 0.6 * cm, y - score_card_height + 0.7 * cm, f"{snapshot['score']} / 100")
    doc.setFillColor(INK_SECONDARY)
    doc.setFont("Helvetica", 10)
    doc.drawString(MARGIN + 0.6 * cm, y - score_card_height + 1.5 * cm, "Score Jappandale®")
    y -= score_card_height + 0.9 * cm

    doc.setFillColor(INK)
    doc.setFont("Helvetica-Bold", 12)
    doc.drawString(MARGIN, y, "Historique des campagnes")
    y -= 0.15 * cm
    doc.setStrokeColor(GOLD)
    doc.setLineWidth(1.2)
    doc.line(MARGIN, y - 0.15 * cm, MARGIN + 3.2 * cm, y - 0.15 * cm)
    y -= 0.75 * cm

    col_width = (PAGE_WIDTH - 2 * MARGIN - 0.6 * cm) / 2
    card_height = 1.6 * cm
    campaign_stats = [
        ("Campagnes créées", str(snapshot["campaigns_total"])),
        ("Publiées ou clôturées", str(snapshot["campaigns_published"])),
        ("Clôturées avec succès", str(snapshot["campaigns_closed_success"])),
        ("Rejetées ou suspendues", str(snapshot["campaigns_rejected_or_suspended"])),
        ("Montant total collecté", f"{snapshot['total_collected']:,} FCFA".replace(",", " ")),
        ("Financeurs distincts", str(snapshot["distinct_contributors"])),
    ]
    for index, (label, value) in enumerate(campaign_stats):
        col = index % 2
        row = index // 2
        card_x = MARGIN + col * (col_width + 0.6 * cm)
        card_y = y - row * (card_height + 0.4 * cm)
        _stat_card(doc, card_x, card_y, col_width, card_height, label, value)
    rows_used = -(-len(campaign_stats) // 2)
    y -= rows_used * (card_height + 0.4 * cm) + 0.5 * cm

    doc.setFillColor(INK)
    doc.setFont("Helvetica-Bold", 12)
    doc.drawString(MARGIN, y, "Litiges")
    y -= 0.15 * cm
    doc.setStrokeColor(GOLD)
    doc.setLineWidth(1.2)
    doc.line(MARGIN, y - 0.15 * cm, MARGIN + 1.4 * cm, y - 0.15 * cm)
    y -= 0.75 * cm

    dispute_rate_percent = round(snapshot["disputes_accepted_rate"] * 100)
    rate_color = EMERALD if dispute_rate_percent == 0 else GOLD_DARK
    dispute_stats = [
        ("Litiges reçus", str(snapshot["disputes_received"])),
        ("Taux de litiges acceptés", f"{dispute_rate_percent} %"),
    ]
    for index, (label, value) in enumerate(dispute_stats):
        card_x = MARGIN + index * (col_width + 0.6 * cm)
        _stat_card(doc, card_x, y, col_width, card_height, label, value, value_color=rate_color if index == 1 else INK)
    y -= card_height + 1.1 * cm

    doc.setStrokeColor(GOLD)
    doc.setLineWidth(0.6)
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
    y -= 0.5 * cm
    doc.setFillColor(INK_MUTED)
    doc.setFont("Helvetica", 8)
    doc.drawString(MARGIN, y, "Jappandale — plateforme sénégalaise de financement participatif.")

    doc.showPage()
    doc.save()
    return buffer.getvalue()
