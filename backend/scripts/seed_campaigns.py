"""Crée un jeu de données complet pour le développement local.

Usage : python manage.py shell < scripts/seed_campaigns.py
Idempotent : réinitialise uniquement les données des comptes de développement.
"""

from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files import File
from django.core.files.base import ContentFile
from django.utils import timezone

from apps.campaigns.models import Campaign, CampaignAuditLog, CampaignReport, CampaignUpdate
from apps.contributions.models import Contribution, Transaction
from apps.core.models import SupportReply, SupportRequest
from apps.kyc.models import KycAuditLog, KycDocument
from apps.notifications.models import Notification

User = get_user_model()
PHOTOS = settings.BASE_DIR.parent / "frontend" / "public" / "photos"

EMAIL_RENAMES = {
    "demo.fatou@jappandale.sn": "fatou.ndiaye@jappandale.sn",
    "demo.mamadou@jappandale.sn": "mamadou.ba@jappandale.sn",
    "demo.aissatou@jappandale.sn": "aissatou.sarr@jappandale.sn",
    "demo.contributeur@jappandale.sn": "mariama.fall@jappandale.sn",
    "demo.admin@jappandale.sn": "admin@jappandale.sn",
    "demo.kyc.attente@jappandale.sn": "cheikh.diop@jappandale.sn",
    "demo.kyc.rejete@jappandale.sn": "ndeye.gueye@jappandale.sn",
}
for previous_email, current_email in EMAIL_RENAMES.items():
    if not User.objects.filter(email=current_email).exists():
        User.objects.filter(email=previous_email).update(email=current_email)

PORTEURS = {
    "fatou": {
        "email": "fatou.ndiaye@jappandale.sn",
        "first_name": "Fatou",
        "last_name": "Ndiaye",
        "phone": "+221 77 410 22 18",
        "organization_name": "Atelier Sunu Couture",
        "city": "Dakar",
        "bio": "Couturière-formatrice à la Médina, engagée dans la transmission du métier aux jeunes femmes.",
    },
    "mamadou": {
        "email": "mamadou.ba@jappandale.sn",
        "first_name": "Mamadou",
        "last_name": "Ba",
        "phone": "+221 76 305 48 12",
        "organization_name": "Coopérative Jappo Niayes",
        "city": "Thiès",
        "bio": "Maraîcher et coordinateur d’une coopérative familiale dans la zone des Niayes.",
    },
    "aissatou": {
        "email": "aissatou.sarr@jappandale.sn",
        "first_name": "Aïssatou",
        "last_name": "Sarr",
        "phone": "+221 78 621 09 45",
        "organization_name": "Jëf Commerce",
        "city": "Pikine",
        "bio": "Entrepreneure de proximité et animatrice d’initiatives culturelles pour les jeunes.",
    },
}

porteurs = {}
for key, profile in PORTEURS.items():
    user, _ = User.objects.get_or_create(email=profile["email"], defaults=profile)
    user.first_name = profile["first_name"]
    user.last_name = profile["last_name"]
    user.phone = profile["phone"]
    user.organization_name = profile["organization_name"]
    user.city = profile["city"]
    user.bio = profile["bio"]
    user.role = User.Role.PORTEUR
    user.kyc_status = User.KycStatus.VALIDE
    user.email_verified_at = timezone.now()
    user.set_password("MotDePasse123!")
    user.save()
    porteurs[key] = user

contributor, _ = User.objects.get_or_create(
    email="mariama.fall@jappandale.sn",
    defaults={"first_name": "Mariama", "last_name": "Fall"},
)
contributor.first_name = "Mariama"
contributor.last_name = "Fall"
contributor.phone = "+221 77 900 14 27"
contributor.role = User.Role.CONTRIBUTEUR
contributor.kyc_status = User.KycStatus.VALIDE
contributor.email_verified_at = timezone.now()
contributor.set_password("MotDePasse123!")
contributor.save()

administrator, _ = User.objects.get_or_create(
    email="admin@jappandale.sn",
    defaults={"first_name": "Équipe", "last_name": "Jappandale"},
)
administrator.first_name = "Équipe"
administrator.last_name = "Jappandale"
administrator.phone = "+221 33 800 00 00"
administrator.role = User.Role.ADMIN
administrator.is_staff = False
administrator.kyc_status = User.KycStatus.VALIDE
administrator.email_verified_at = timezone.now()
administrator.set_password("MotDePasse123!")
administrator.save()

kyc_pending, _ = User.objects.get_or_create(
    email="cheikh.diop@jappandale.sn",
    defaults={"first_name": "Cheikh", "last_name": "Diop"},
)
kyc_pending.first_name = "Cheikh"
kyc_pending.last_name = "Diop"
kyc_pending.phone = "+221 70 321 45 67"
kyc_pending.role = User.Role.PORTEUR
kyc_pending.organization_name = "Teranga Services"
kyc_pending.city = "Guédiawaye"
kyc_pending.email_verified_at = timezone.now()
kyc_pending.kyc_status = User.KycStatus.EN_ATTENTE
kyc_pending.kyc_assigned_to = administrator
kyc_pending.kyc_review_note = ""
kyc_pending.kyc_reviewed_at = None
kyc_pending.kyc_reviewed_by = None
kyc_pending.set_password("MotDePasse123!")
kyc_pending.save()

kyc_rejected, _ = User.objects.get_or_create(
    email="ndeye.gueye@jappandale.sn",
    defaults={"first_name": "Ndeye", "last_name": "Gueye"},
)
kyc_rejected.first_name = "Ndeye"
kyc_rejected.last_name = "Gueye"
kyc_rejected.phone = "+221 76 733 18 29"
kyc_rejected.role = User.Role.PORTEUR
kyc_rejected.organization_name = "Saveurs de Ndeye"
kyc_rejected.city = "Rufisque"
kyc_rejected.email_verified_at = timezone.now()
kyc_rejected.kyc_status = User.KycStatus.REJETE
kyc_rejected.kyc_review_note = "La pièce d’identité est tronquée sur le bord droit."
kyc_rejected.kyc_reviewed_at = timezone.now() - timedelta(days=2)
kyc_rejected.kyc_reviewed_by = administrator
kyc_rejected.kyc_assigned_to = administrator
kyc_rejected.set_password("MotDePasse123!")
kyc_rejected.save()

demo_users = [*porteurs.values(), contributor, administrator, kyc_pending, kyc_rejected]
demo_emails = [user.email for user in demo_users]
demo_campaigns = Campaign.objects.filter(owner__in=porteurs.values())
Transaction.objects.filter(contribution__campaign__in=demo_campaigns).delete()
Contribution.objects.filter(campaign__in=demo_campaigns).delete()
CampaignAuditLog.objects.filter(campaign__in=demo_campaigns).delete()
Campaign.objects.filter(pk__in=demo_campaigns.values("pk")).delete()
SupportReply.objects.filter(support_request__email__in=demo_emails).delete()
SupportRequest.objects.filter(email__in=demo_emails).delete()
Notification.objects.filter(recipient__in=demo_users).delete()
KycAuditLog.objects.filter(user__in=[kyc_pending, kyc_rejected]).delete()
for document in KycDocument.objects.filter(user__in=[kyc_pending, kyc_rejected]):
    document.file.delete(save=False)
    document.delete()

CAMPAGNES = [
    {
        "owner": "fatou",
        "title": "Équiper un atelier-école de couture à la Médina",
        "category": "ARTISANAT",
        "goal": 800000,
        "collected": 0,
        "photo": "porteur.jpg",
        "days": 22,
        "location": "Médina, Dakar",
        "beneficiaries": "10 jeunes femmes en apprentissage sur une première promotion de six mois",
        "summary": "Trois machines professionnelles et un espace de formation pour accueillir dix apprenties.",
        "description": (
            "Je travaille dans la couture depuis neuf ans à la Médina. Mon atelier reçoit "
            "régulièrement des jeunes femmes qui souhaitent apprendre, mais le matériel actuel "
            "ne permet pas d’organiser une formation régulière.\n\n"
            "Le projet consiste à transformer une partie de l’atelier en espace-école. Les "
            "apprenties suivront une formation pratique, de la prise de mesures jusqu’à la "
            "réalisation d’une tenue complète, tout en participant aux commandes de l’atelier."
        ),
        "funding_plan": (
            "Trois machines à coudre professionnelles — 450 000 F CFA\n"
            "Tables de coupe et rangements — 140 000 F CFA\n"
            "Premiers tissus et consommables — 110 000 F CFA\n"
            "Aménagement électrique et éclairage — 100 000 F CFA"
        ),
        "timeline": (
            "Achat et installation du matériel — semaines 1 et 2\n"
            "Sélection des dix apprenties — semaine 3\n"
            "Début de la première promotion — semaine 4\n"
            "Premier bilan de formation — troisième mois"
        ),
    },
    {
        "owner": "mamadou",
        "title": "Installer l’irrigation d’une parcelle maraîchère aux Niayes",
        "category": "AGRICULTURE",
        "goal": 1200000,
        "collected": 0,
        "photo": "agriculture.jpg",
        "days": 40,
        "location": "Notto Gouye Diama, Thiès",
        "beneficiaries": "18 membres de la coopérative et leurs familles",
        "summary": "Un système goutte-à-goutte pour réduire les pertes d’eau et sécuriser deux cycles de culture.",
        "description": (
            "Notre groupement exploite deux hectares de légumes destinés aux marchés de Thiès "
            "et de Dakar. L’arrosage manuel mobilise beaucoup de temps et provoque des pertes "
            "d’eau importantes pendant la saison sèche.\n\n"
            "L’installation d’un réseau goutte-à-goutte permettra de mieux planifier les cultures "
            "de tomate, d’oignon et de piment, avec une consommation d’eau plus régulière."
        ),
        "funding_plan": (
            "Pompe et filtre principal — 390 000 F CFA\n"
            "Tuyaux et lignes goutte-à-goutte — 510 000 F CFA\n"
            "Réservoir et support — 210 000 F CFA\n"
            "Installation et formation à l’entretien — 90 000 F CFA"
        ),
        "timeline": (
            "Commande du matériel — première semaine\n"
            "Pose du réseau — semaines 2 et 3\n"
            "Test sur une première parcelle — semaine 4\n"
            "Mise en culture complète — deuxième mois"
        ),
    },
    {
        "owner": "aissatou",
        "title": "Renforcer une boutique de produits essentiels à Pikine",
        "category": "COMMERCE",
        "goal": 500000,
        "collected": 0,
        "photo": "commerce.jpg",
        "days": 18,
        "location": "Pikine Icotaf, Dakar",
        "beneficiaries": "Une entrepreneure et deux emplois à temps partiel",
        "summary": "Constituer un stock stable de produits courants et aménager un point de vente de proximité.",
        "description": (
            "Depuis deux ans, je vends des produits alimentaires depuis une petite pièce attenante "
            "à mon domicile. Les ruptures de stock m’obligent souvent à refuser des commandes.\n\n"
            "Cette campagne doit financer un premier stock plus régulier et un aménagement simple "
            "pour recevoir les clients dans de meilleures conditions."
        ),
        "funding_plan": (
            "Stock alimentaire initial — 310 000 F CFA\n"
            "Étagères et comptoir — 90 000 F CFA\n"
            "Petit réfrigérateur — 80 000 F CFA\n"
            "Signalétique et caisse de départ — 20 000 F CFA"
        ),
        "timeline": (
            "Aménagement du local — première semaine\n"
            "Approvisionnement auprès des grossistes — semaine 2\n"
            "Ouverture avec horaires étendus — semaine 3"
        ),
    },
    {
        "owner": "mamadou",
        "title": "Outiller une menuiserie d’apprentissage à Saint-Louis",
        "status": Campaign.Status.EN_MODERATION,
        "category": "ARTISANAT",
        "goal": 650000,
        "collected": 0,
        "photo": "artisan.jpg",
        "days": 30,
        "location": "Sor, Saint-Louis",
        "beneficiaries": "Quatre apprentis menuisiers âgés de 18 à 24 ans",
        "summary": "Des outils électroportatifs partagés pour former quatre apprentis et réduire les délais de fabrication.",
        "description": (
            "L’atelier fabrique des portes, tables et rangements sur mesure. Nous accueillons déjà "
            "quatre apprentis, mais le manque d’outils ralentit leur progression et les commandes.\n\n"
            "Le financement permettra de constituer un lot d’équipement commun, avec des séances "
            "d’apprentissage consacrées à la sécurité et à la finition."
        ),
        "funding_plan": (
            "Scie circulaire et raboteuse — 320 000 F CFA\n"
            "Perceuses, ponceuses et accessoires — 190 000 F CFA\n"
            "Équipements de protection — 60 000 F CFA\n"
            "Bois pour les premiers exercices — 80 000 F CFA"
        ),
        "timeline": (
            "Achat des équipements — semaines 1 et 2\n"
            "Formation sécurité — semaine 3\n"
            "Première série de meubles-école — deuxième mois"
        ),
    },
    {
        "owner": "aissatou",
        "title": "Créer un programme d’ateliers culturels à la Médina",
        "status": Campaign.Status.SUSPENDUE,
        "category": "CULTURE",
        "goal": 900000,
        "collected": 0,
        "photo": "communaute.jpg",
        "days": 27,
        "location": "Médina, Dakar",
        "beneficiaries": "60 adolescents répartis sur trois groupes",
        "summary": "Douze semaines d’ateliers de photographie, écriture et expression scénique pour les jeunes du quartier.",
        "description": (
            "L’association organise depuis 2024 des rencontres culturelles ponctuelles avec les "
            "jeunes de la Médina. Nous voulons passer à un programme structuré sur douze semaines.\n\n"
            "Les participants travailleront en petits groupes et présenteront leurs créations lors "
            "d’une restitution ouverte aux familles et aux habitants du quartier."
        ),
        "funding_plan": (
            "Rémunération des intervenants — 420 000 F CFA\n"
            "Location et sonorisation des espaces — 180 000 F CFA\n"
            "Matériel pédagogique — 170 000 F CFA\n"
            "Restitution finale — 130 000 F CFA"
        ),
        "timeline": (
            "Inscriptions et constitution des groupes — semaines 1 et 2\n"
            "Ateliers hebdomadaires — semaines 3 à 11\n"
            "Restitution publique — semaine 12"
        ),
    },
    {
        "owner": "fatou",
        "title": "Développer un étal de fruits locaux au marché Sandaga",
        "status": Campaign.Status.CLOTUREE,
        "category": "COMMERCE",
        "goal": 400000,
        "collected": 0,
        "photo": "marche.jpg",
        "days": 12,
        "location": "Plateau, Dakar",
        "beneficiaries": "Un commerçant, deux aides-vendeuses et six producteurs partenaires",
        "summary": "Un nouvel étal et une meilleure conservation pour proposer davantage de fruits issus de producteurs locaux.",
        "description": (
            "L’activité repose sur des achats directs auprès de producteurs de Thiès et de "
            "Casamance. L’étal actuel est trop petit et les pertes augmentent pendant les journées "
            "les plus chaudes.\n\n"
            "Le projet prévoit un espace de présentation plus propre, des bacs adaptés et une petite "
            "solution de conservation pour les produits fragiles."
        ),
        "funding_plan": (
            "Fabrication du nouvel étal — 170 000 F CFA\n"
            "Bacs alimentaires et balance — 80 000 F CFA\n"
            "Glacière professionnelle — 100 000 F CFA\n"
            "Premier approvisionnement élargi — 50 000 F CFA"
        ),
        "timeline": (
            "Fabrication de l’étal — semaine 1\n"
            "Installation du matériel — semaine 2\n"
            "Nouvel approvisionnement — semaine 3"
        ),
    },
]

created_campaigns = []
for data in CAMPAGNES:
    campaign_status = data.get("status", Campaign.Status.PUBLIEE)
    campaign = Campaign(
        owner=porteurs[data["owner"]],
        title=data["title"],
        summary=data["summary"],
        description=data["description"],
        location=data["location"],
        beneficiaries=data["beneficiaries"],
        funding_plan=data["funding_plan"],
        project_timeline=data["timeline"],
        category=data["category"],
        goal_amount=data["goal"],
        collected_amount=data["collected"],
        deadline=timezone.localdate() + timedelta(days=data["days"]),
        status=campaign_status,
        published_at=(
            timezone.now()
            if campaign_status
            in [Campaign.Status.PUBLIEE, Campaign.Status.SUSPENDUE, Campaign.Status.CLOTUREE]
            else None
        ),
        moderation_assigned_to=(
            administrator
            if campaign_status in [Campaign.Status.EN_MODERATION, Campaign.Status.SUSPENDUE]
            else None
        ),
        suspension_note=(
            "Contrôle temporaire des justificatifs liés au budget de location."
            if campaign_status == Campaign.Status.SUSPENDUE
            else ""
        ),
        suspended_at=(
            timezone.now() - timedelta(days=1)
            if campaign_status == Campaign.Status.SUSPENDUE
            else None
        ),
    )
    photo_path = PHOTOS / data["photo"]
    if photo_path.exists():
        with photo_path.open("rb") as fh:
            campaign.cover_image.save(data["photo"], File(fh), save=False)
    campaign.save()
    created_campaigns.append(campaign)

    CampaignAuditLog.objects.create(
        campaign=campaign,
        actor=campaign.owner,
        action=CampaignAuditLog.Action.SUBMITTED,
        previous_status=Campaign.Status.BROUILLON,
        new_status=Campaign.Status.EN_MODERATION,
        note="Dossier soumis avec son budget et son calendrier.",
    )
    if campaign_status != Campaign.Status.EN_MODERATION:
        CampaignAuditLog.objects.create(
            campaign=campaign,
            actor=administrator,
            action=CampaignAuditLog.Action.PUBLISHED,
            previous_status=Campaign.Status.EN_MODERATION,
            new_status=Campaign.Status.PUBLIEE,
            note="Contenu et pièces vérifiés par l’équipe de modération.",
        )
    if campaign_status == Campaign.Status.SUSPENDUE:
        CampaignAuditLog.objects.create(
            campaign=campaign,
            actor=administrator,
            action=CampaignAuditLog.Action.SUSPENDED,
            previous_status=Campaign.Status.PUBLIEE,
            new_status=Campaign.Status.SUSPENDUE,
            note=campaign.suspension_note,
        )
    if campaign_status == Campaign.Status.CLOTUREE:
        CampaignAuditLog.objects.create(
            campaign=campaign,
            actor=administrator,
            action=CampaignAuditLog.Action.CLOSED,
            previous_status=Campaign.Status.PUBLIEE,
            new_status=Campaign.Status.CLOTUREE,
            note="Campagne arrivée au terme de sa période de collecte.",
        )

    if data["owner"] == "fatou":
        CampaignUpdate.objects.create(
            campaign=campaign,
            title="Dossier relu et budget précisé",
            content=(
                "Après la revue de l’équipe, le budget a été détaillé poste par poste. "
                "La prochaine mise à jour sera publiée après la commande du matériel."
            ),
        )
    print(f"Créée : {campaign.title} ({campaign.progress_percent}%)")


def create_example_pdf(title, lines):
    """Produit un petit PDF lisible destiné au jeu de données local."""
    def pdf_text(value):
        return value.encode("latin-1", "replace").decode("latin-1").replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

    text_commands = [f"BT /F1 18 Tf 72 760 Td ({pdf_text(title)}) Tj ET"]
    y = 720
    for line in lines:
        text_commands.append(f"BT /F1 11 Tf 72 {y} Td ({pdf_text(line)}) Tj ET")
        y -= 24
    stream = "\n".join(text_commands).encode("latin-1")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    output = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(output))
        output.extend(f"{index} 0 obj\n".encode())
        output.extend(obj)
        output.extend(b"\nendobj\n")
    xref_offset = len(output)
    output.extend(f"xref\n0 {len(objects) + 1}\n".encode())
    output.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        output.extend(f"{offset:010d} 00000 n \n".encode())
    output.extend(
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode()
    )
    return bytes(output)


def add_kyc_document(user, document_type, filename, title):
    document = KycDocument(user=user, document_type=document_type)
    document.file.save(
        filename,
        ContentFile(
            create_example_pdf(
                title,
                [
                    "DOCUMENT D'EXEMPLE - AUCUNE VALEUR OFFICIELLE",
                    f"Titulaire : {user.first_name} {user.last_name}",
                    f"Compte : {user.email}",
                    "Aucune donnee d'identite reelle.",
                ],
            )
        ),
        save=True,
    )
    KycAuditLog.objects.create(
        user=user,
        actor=user,
        document=document,
        action=KycAuditLog.Action.DOCUMENT_SUBMITTED,
        previous_status=User.KycStatus.NON_SOUMIS,
        new_status=user.kyc_status,
        note="Pièce d’exemple ajoutée au dossier de vérification.",
    )
    return document


add_kyc_document(
    kyc_pending,
    KycDocument.DocumentType.CNI,
    "cni-cheikh.pdf",
    "Carte nationale d'identite",
)
add_kyc_document(
    kyc_pending,
    KycDocument.DocumentType.JUSTIFICATIF_ACTIVITE,
    "activite-cheikh.pdf",
    "Justificatif d'activite",
)
rejected_document = add_kyc_document(
    kyc_rejected,
    KycDocument.DocumentType.CNI,
    "cni-ndeye.pdf",
    "Carte nationale d'identite illisible",
)
add_kyc_document(
    kyc_rejected,
    KycDocument.DocumentType.JUSTIFICATIF_ACTIVITE,
    "activite-ndeye.pdf",
    "Justificatif d'activite",
)
KycAuditLog.objects.create(
    user=kyc_rejected,
    actor=administrator,
    document=rejected_document,
    action=KycAuditLog.Action.REJECTED,
    previous_status=User.KycStatus.EN_ATTENTE,
    new_status=User.KycStatus.REJETE,
    note=kyc_rejected.kyc_review_note,
)


def add_contribution(campaign, amount, status, *, anonymous=False, days_ago=0):
    now = timezone.now() - timedelta(days=days_ago)
    contribution = Contribution.objects.create(
        contributor=contributor,
        campaign=campaign,
        amount=amount,
        anonymous=anonymous,
        status=status,
        confirmed_at=now if status == Contribution.Status.CONFIRMEE else None,
        refunded_at=now if status == Contribution.Status.REMBOURSEE else None,
    )
    transaction_status = {
        Contribution.Status.INITIEE: Transaction.Status.INITIEE,
        Contribution.Status.CONFIRMEE: Transaction.Status.CONFIRMEE,
        Contribution.Status.ECHOUEE: Transaction.Status.ECHOUEE,
        Contribution.Status.REMBOURSEE: Transaction.Status.REMBOURSEE,
    }[status]
    Transaction.objects.create(
        contribution=contribution,
        status=transaction_status,
        failure_reason=(
            "Le délai de confirmation du fournisseur a été dépassé."
            if status == Contribution.Status.ECHOUEE
            else ""
        ),
        processed_at=now if status != Contribution.Status.INITIEE else None,
    )
    Contribution.objects.filter(pk=contribution.pk).update(created_at=now)
    return contribution


add_contribution(created_campaigns[0], 125000, Contribution.Status.CONFIRMEE, days_ago=8)
add_contribution(created_campaigns[0], 75000, Contribution.Status.CONFIRMEE, anonymous=True, days_ago=3)
add_contribution(created_campaigns[1], 250000, Contribution.Status.CONFIRMEE, days_ago=5)
add_contribution(created_campaigns[1], 50000, Contribution.Status.ECHOUEE, days_ago=2)
add_contribution(created_campaigns[2], 100000, Contribution.Status.CONFIRMEE, anonymous=True, days_ago=6)
add_contribution(created_campaigns[2], 35000, Contribution.Status.REMBOURSEE, days_ago=4)
add_contribution(created_campaigns[5], 400000, Contribution.Status.CONFIRMEE, days_ago=12)

for campaign in created_campaigns:
    confirmed_total = sum(
        campaign.contributions.filter(status=Contribution.Status.CONFIRMEE).values_list("amount", flat=True)
    )
    campaign.collected_amount = confirmed_total
    campaign.save(update_fields=["collected_amount"])

draft_campaign = Campaign.objects.create(
    owner=porteurs["fatou"],
    title="Préparer un service de livraison solidaire à Dakar",
    summary="Un brouillon incomplet conservé pour illustrer le parcours de création.",
    description="Ce projet est encore en préparation et n’a pas été soumis à la modération.",
    category=Campaign.Category.COMMERCE,
    goal_amount=300000,
    deadline=timezone.localdate() + timedelta(days=45),
    status=Campaign.Status.BROUILLON,
)
rejected_campaign = Campaign.objects.create(
    owner=porteurs["aissatou"],
    title="Créer un kiosque numérique de quartier",
    summary="Une campagne rejetée permettant d’illustrer les corrections demandées.",
    description="Le dossier doit être complété avant une nouvelle soumission.",
    location="Rufisque, Dakar",
    beneficiaries="Habitants et petits commerçants du quartier",
    funding_plan="Budget à détailler avant une nouvelle soumission.",
    project_timeline="Calendrier à préciser.",
    category=Campaign.Category.TECHNOLOGIE,
    goal_amount=700000,
    deadline=timezone.localdate() + timedelta(days=35),
    status=Campaign.Status.REJETEE,
    moderation_note="Le budget et le calendrier sont trop généraux. Détaillez les postes et les échéances.",
)
CampaignAuditLog.objects.bulk_create(
    [
        CampaignAuditLog(
            campaign=rejected_campaign,
            actor=porteurs["aissatou"],
            action=CampaignAuditLog.Action.SUBMITTED,
            previous_status=Campaign.Status.BROUILLON,
            new_status=Campaign.Status.EN_MODERATION,
        ),
        CampaignAuditLog(
            campaign=rejected_campaign,
            actor=administrator,
            action=CampaignAuditLog.Action.REJECTED,
            previous_status=Campaign.Status.EN_MODERATION,
            new_status=Campaign.Status.REJETEE,
            note=rejected_campaign.moderation_note,
        ),
    ]
)

CampaignReport.objects.create(
    campaign=created_campaigns[1],
    reporter=contributor,
    reason=CampaignReport.Reason.INFORMATION_TROMPEUSE,
    details="Le coût annoncé pour la pompe semble différent du devis présenté dans la description.",
    status=CampaignReport.Status.NOUVEAU,
)
CampaignReport.objects.create(
    campaign=created_campaigns[4],
    reporter=contributor,
    reason=CampaignReport.Reason.AUTRE,
    details="Je souhaite savoir si les autorisations pour la restitution publique ont été vérifiées.",
    status=CampaignReport.Status.EN_COURS,
    admin_note="Demande de justificatif envoyée au porteur.",
    assigned_to=administrator,
)

support_new = SupportRequest.objects.create(
    user=contributor,
    name="Mariama Fall",
    email=contributor.email,
    subject="Contribution affichée comme échouée",
    message="Ma contribution apparaît avec le statut échoué. Pouvez-vous m’expliquer le parcours ?",
)
support_in_progress = SupportRequest.objects.create(
    user=kyc_pending,
    name="Cheikh Diop",
    email=kyc_pending.email,
    subject="Comprendre les documents KYC demandés",
    message="Je voudrais confirmer que mon justificatif d’activité est suffisant pour faire valider mon profil.",
    status=SupportRequest.Status.EN_COURS,
    admin_note="Vérifier la lisibilité des deux pièces avant de répondre.",
    assigned_to=administrator,
)
SupportReply.objects.create(
    support_request=support_in_progress,
    sender=administrator,
    recipient_email=kyc_pending.email,
    subject="Re: Comprendre les documents KYC demandés",
    message="Bonjour Cheikh, nous avons bien reçu vos deux documents. Votre dossier est maintenant en cours de vérification.",
    delivery_status=SupportReply.DeliveryStatus.SENT,
)
SupportRequest.objects.create(
    user=porteurs["fatou"],
    name="Fatou Ndiaye",
    email=porteurs["fatou"].email,
    subject="Modification de la photo de campagne",
    message="La photo a été remplacée avec succès. Cette demande est conservée comme exemple clôturé.",
    status=SupportRequest.Status.RESOLUE,
    admin_note="Résolu après accompagnement téléphonique.",
    assigned_to=administrator,
)

Notification.objects.bulk_create(
    [
        Notification(
            recipient=administrator,
            kind=Notification.Kind.ADMIN_ACTION_REQUIRED,
            subject="Dossier KYC prêt à vérifier",
            message=f"Le dossier de {kyc_pending.first_name} {kyc_pending.last_name} contient les pièces requises.",
            action_url="/administration",
            delivery_status=Notification.DeliveryStatus.SENT,
            sent_at=timezone.now(),
        ),
        Notification(
            recipient=administrator,
            kind=Notification.Kind.ADMIN_ACTION_REQUIRED,
            subject="Nouvelle campagne à modérer",
            message=f"La campagne « {created_campaigns[3].title} » attend une décision.",
            action_url="/administration",
            delivery_status=Notification.DeliveryStatus.SENT,
            sent_at=timezone.now(),
        ),
        Notification(
            recipient=contributor,
            kind=Notification.Kind.CONTRIBUTION_CONFIRMED,
            subject="Votre contribution est confirmée",
            message=f"Votre contribution à « {created_campaigns[0].title} » a été confirmée.",
            action_url=f"/campagnes/{created_campaigns[0].slug}",
            delivery_status=Notification.DeliveryStatus.SENT,
            sent_at=timezone.now(),
        ),
        Notification(
            recipient=porteurs["aissatou"],
            kind=Notification.Kind.CAMPAIGN_SUSPENDED,
            subject="Votre campagne est temporairement suspendue",
            message=created_campaigns[4].suspension_note,
            action_url="/compte",
            delivery_status=Notification.DeliveryStatus.SENT,
            sent_at=timezone.now(),
        ),
    ]
)

print(
    "Jeu de données prêt : "
    f"{Campaign.objects.filter(owner__in=porteurs.values()).count()} campagnes, "
    f"{Contribution.objects.filter(campaign__owner__in=porteurs.values()).count()} contributions, "
    f"{KycDocument.objects.filter(user__in=[kyc_pending, kyc_rejected]).count()} pièces KYC, "
    f"{CampaignReport.objects.filter(campaign__owner__in=porteurs.values()).count()} signalements et "
    f"{SupportRequest.objects.filter(email__in=demo_emails).count()} demandes d’assistance."
)
