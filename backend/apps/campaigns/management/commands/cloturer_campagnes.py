from django.core.management.base import BaseCommand

from apps.campaigns.services import close_finished_campaigns


class Command(BaseCommand):
    help = (
        "Clôture les campagnes publiées arrivées à échéance ou ayant atteint "
        "leur objectif de collecte (collecte flexible : les fonds déjà "
        "recueillis restent acquis au porteur même si l’objectif n’est pas "
        "atteint). À planifier une fois par jour (cron)."
    )

    def handle(self, *args, **options):
        count = close_finished_campaigns()
        if count:
            self.stdout.write(self.style.SUCCESS(f"{count} campagne(s) clôturée(s)."))
        else:
            self.stdout.write("Aucune campagne à clôturer.")
