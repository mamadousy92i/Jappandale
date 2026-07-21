"""Crée des campagnes de démonstration (données de développement).

Usage : python manage.py shell < scripts/seed_campaigns.py
Idempotent : réinitialise les campagnes du porteur de démonstration.
"""

from datetime import timedelta

from django.conf import settings
from django.core.files import File
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.campaigns.models import Campaign

User = get_user_model()
PHOTOS = settings.BASE_DIR.parent / "frontend" / "public" / "photos"

porteur, _ = User.objects.get_or_create(
    email="demo.porteur@jappandale.sn",
    defaults={
        "first_name": "Fatou",
        "last_name": "Ndiaye",
        "role": User.Role.PORTEUR,
        "kyc_status": User.KycStatus.VALIDE,
    },
)
porteur.role = User.Role.PORTEUR
porteur.kyc_status = User.KycStatus.VALIDE
porteur.set_password("MotDePasse123!")
porteur.save()

Campaign.objects.filter(owner=porteur).delete()

CAMPAGNES = [
    ("Atelier de couture solidaire", "ARTISANAT", 800000, 520000, "porteur.jpg", 22,
     "Former dix jeunes couturières de la Médina en équipant un atelier moderne."),
    ("Étal de fruits au marché Sandaga", "COMMERCE", 400000, 360000, "marche.jpg", 12,
     "Agrandir un étal de fruits et légumes et diversifier l'offre pour les familles du quartier."),
    ("Coopérative maraîchère des Niayes", "AGRICULTURE", 1200000, 300000, "agriculture.jpg", 40,
     "Installer un système d'irrigation goutte-à-goutte pour une coopérative de maraîchers."),
    ("Menuiserie d'art à Saint-Louis", "ARTISANAT", 650000, 180000, "artisan.jpg", 30,
     "Acquérir des outils pour développer un atelier de menuiserie d'art et créer des emplois."),
    ("Boutique de quartier à Pikine", "COMMERCE", 500000, 95000, "commerce.jpg", 18,
     "Ouvrir une boutique de produits de première nécessité au cœur de Pikine."),
    ("Centre culturel de la Médina", "CULTURE", 900000, 610000, "communaute.jpg", 27,
     "Créer un espace de rencontre et d'ateliers culturels pour la jeunesse de la Médina."),
]

for title, category, goal, collected, photo, days, summary in CAMPAGNES:
    campaign = Campaign(
        owner=porteur,
        title=title,
        summary=summary,
        description=(
            f"{summary}\n\n"
            "Ce projet s'inscrit dans une démarche d'impact local : créer de l'activité, "
            "transmettre un savoir-faire et renforcer l'autonomie économique de la communauté. "
            "Chaque contribution, petite ou grande, rapproche ce projet de sa réalisation.\n\n"
            "Les fonds collectés serviront à l'achat du matériel, à l'aménagement des locaux "
            "et à l'accompagnement des bénéficiaires pendant les premiers mois d'activité."
        ),
        category=category,
        goal_amount=goal,
        collected_amount=collected,
        deadline=timezone.localdate() + timedelta(days=days),
        status=Campaign.Status.PUBLIEE,
        published_at=timezone.now(),
    )
    photo_path = PHOTOS / photo
    if photo_path.exists():
        with photo_path.open("rb") as fh:
            campaign.cover_image.save(photo, File(fh), save=False)
    campaign.save()
    print(f"Créée : {title} ({campaign.progress_percent}%)")

print(f"Total : {Campaign.objects.filter(owner=porteur).count()} campagnes de démonstration.")
