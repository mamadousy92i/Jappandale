"""Ajoute des contributions de démonstration illustrant les trois statuts
d'actionnariat (en attente, validé, refusé) sur la campagne d'investissement
participatif déjà publiée.

Ne touche jamais aux contributions existantes ni aux comptes réels : crée
seulement de nouvelles contributions, identifiées par leur montant, pour
rester idempotent (relancer le script ne crée pas de doublons).

    python manage.py shell < scripts/add_shareholder_examples.py
"""

from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.accounts.models import User
from apps.campaigns.models import Campaign
from apps.contributions.models import Contribution, Transaction
from apps.contributions.services import recalculate_campaign_total

now = timezone.now()

campaign = Campaign.objects.filter(
    slug="moderniser-une-unite-de-transformation-de-cereales"
).first()
mariama = User.objects.filter(email="mariama.fall@jappandale.sn").first()
admin = User.objects.filter(role=User.Role.ADMIN).order_by("id").first()

if not campaign:
    print("Campagne d'investissement introuvable : rien à faire.")
elif not mariama:
    print("Compte mariama.fall@jappandale.sn introuvable : rien à faire.")
else:
    EXEMPLES = [
        {
            "amount": 15_000,
            "shareholder_status": Contribution.ShareholderStatus.VALIDE,
            "note": "",
        },
        {
            "amount": 8_000,
            "shareholder_status": Contribution.ShareholderStatus.REJETE,
            "note": "Profil investisseur non éligible pour cette campagne.",
        },
    ]

    crees = 0
    for exemple in EXEMPLES:
        exists = Contribution.objects.filter(
            campaign=campaign,
            contributor=mariama,
            amount=exemple["amount"],
            wants_to_be_shareholder=True,
        ).exists()
        if exists:
            print(f"Contribution de {exemple['amount']} F CFA déjà présente, inchangée.")
            continue

        contribution = Contribution.objects.create(
            contributor=mariama,
            campaign=campaign,
            amount=exemple["amount"],
            wants_to_be_shareholder=True,
            status=Contribution.Status.CONFIRMEE,
            confirmed_at=now,
            shareholder_status=exemple["shareholder_status"],
            shareholder_note=exemple["note"],
            shareholder_reviewed_at=now if admin else None,
            shareholder_reviewed_by=admin,
        )
        Transaction.objects.create(
            contribution=contribution,
            status=Transaction.Status.CONFIRMEE,
            processed_at=now,
        )
        crees += 1
        print(
            f"Contribution créée : {exemple['amount']} F CFA — "
            f"statut actionnaire {exemple['shareholder_status']}"
        )

    if crees:
        recalculate_campaign_total(campaign)

    print(f"{crees} contribution(s) créée(s).")
