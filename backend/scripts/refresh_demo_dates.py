"""Repousse les échéances des campagnes de démonstration qui ont expiré.

La tâche planifiée de clôture automatique (voir apps/campaigns/services.py)
clôture normalement toute campagne dont l'échéance est dépassée. C'est le
comportement voulu en production, mais cela vide silencieusement la démo au
fil du temps : à exécuter avant toute présentation client, pour que les
campagnes qui n'ont pas atteint leur objectif redeviennent publiées avec une
échéance dans le futur.

Une campagne qui a atteint son objectif (collected_amount >= goal_amount)
n'est PAS touchée : sa clôture est un vrai succès, utile à montrer tel quel.

Idempotent : relancer le script est sans risque.

    python manage.py shell < scripts/refresh_demo_dates.py
"""

from datetime import timedelta

from django.utils import timezone

from apps.campaigns.models import Campaign

today = timezone.localdate()
now = timezone.now()

# 1. Campagnes clôturées uniquement par expiration (pas par succès) : on les
#    republie avec une échéance dans le futur.
reouvertes = 0
for campaign in Campaign.objects.filter(status=Campaign.Status.CLOTUREE):
    if campaign.collected_amount >= campaign.goal_amount:
        continue
    campaign.status = Campaign.Status.PUBLIEE
    campaign.deadline = today + timedelta(days=45)
    if not campaign.published_at:
        campaign.published_at = now
    campaign.save(update_fields=["status", "deadline", "published_at"])
    reouvertes += 1

# 2. Toute échéance déjà passée sur une campagne encore active (brouillon, en
#    modération, rejetée, suspendue, publiée) est repoussée, pour qu'une
#    soumission ou réactivation ultérieure ne la clôture pas aussitôt.
prolongees = 0
for campaign in Campaign.objects.exclude(status=Campaign.Status.CLOTUREE).filter(
    deadline__lt=today
):
    campaign.deadline = today + timedelta(days=45)
    campaign.save(update_fields=["deadline"])
    prolongees += 1

print(
    f"{reouvertes} campagne(s) republiée(s) avec une nouvelle échéance, "
    f"{prolongees} échéance(s) supplémentaire(s) prolongée(s)."
)
