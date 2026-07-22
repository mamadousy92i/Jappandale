"""Crée des campagnes de démonstration crédibles pour le développement.

Usage : python manage.py shell < scripts/seed_campaigns.py
Idempotent : remplace uniquement les campagnes des comptes de démonstration.
"""

from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files import File
from django.utils import timezone

from apps.campaigns.models import Campaign, CampaignUpdate

User = get_user_model()
PHOTOS = settings.BASE_DIR.parent / "frontend" / "public" / "photos"

PORTEURS = {
    "fatou": {
        "email": "demo.fatou@jappandale.sn",
        "first_name": "Fatou",
        "last_name": "Ndiaye",
    },
    "mamadou": {
        "email": "demo.mamadou@jappandale.sn",
        "first_name": "Mamadou",
        "last_name": "Ba",
    },
    "aissatou": {
        "email": "demo.aissatou@jappandale.sn",
        "first_name": "Aïssatou",
        "last_name": "Sarr",
    },
}

porteurs = {}
for key, profile in PORTEURS.items():
    user, _ = User.objects.get_or_create(email=profile["email"], defaults=profile)
    user.first_name = profile["first_name"]
    user.last_name = profile["last_name"]
    user.role = User.Role.PORTEUR
    user.kyc_status = User.KycStatus.VALIDE
    user.set_password("MotDePasse123!")
    user.save()
    porteurs[key] = user

contributor, _ = User.objects.get_or_create(
    email="demo.contributeur@jappandale.sn",
    defaults={"first_name": "Mariama", "last_name": "Fall"},
)
contributor.first_name = "Mariama"
contributor.last_name = "Fall"
contributor.role = User.Role.CONTRIBUTEUR
contributor.kyc_status = User.KycStatus.VALIDE
contributor.set_password("MotDePasse123!")
contributor.save()

administrator, _ = User.objects.get_or_create(
    email="demo.admin@jappandale.sn",
    defaults={"first_name": "Équipe", "last_name": "Jappandale"},
)
administrator.first_name = "Équipe"
administrator.last_name = "Jappandale"
administrator.role = User.Role.ADMIN
administrator.is_staff = False
administrator.kyc_status = User.KycStatus.VALIDE
administrator.set_password("MotDePasse123!")
administrator.save()

demo_emails = [profile["email"] for profile in PORTEURS.values()]
demo_emails.append("demo.porteur@jappandale.sn")
Campaign.objects.filter(owner__email__in=demo_emails).delete()

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

for data in CAMPAGNES:
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
        status=Campaign.Status.PUBLIEE,
        published_at=timezone.now(),
    )
    photo_path = PHOTOS / data["photo"]
    if photo_path.exists():
        with photo_path.open("rb") as fh:
            campaign.cover_image.save(data["photo"], File(fh), save=False)
    campaign.save()

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

print(f"Total : {Campaign.objects.filter(owner__email__in=demo_emails).count()} campagnes de démonstration.")
