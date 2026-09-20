"""Ajoute un exemple de vidéo de présentation (par lien) sur deux campagnes de démo,
pour illustrer les deux façons de l'afficher : lien direct vers un fichier vidéo
(aperçu silencieux de 5 secondes en boucle) et lien YouTube (vignette officielle,
lecture au clic).

Contenu utilisé à titre d'exemple (Big Buck Bunny, film libre de la Blender
Foundation) : à remplacer par de vraies vidéos de projet dès qu'elles seront
disponibles. Idempotent : ne touche pas une campagne qui a déjà une vidéo.

    python manage.py shell < scripts/add_video_examples.py
"""

from apps.campaigns.models import Campaign

EXEMPLES = [
    (
        "equiper-un-atelier-ecole-de-couture-a-la-medina",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    ),
    (
        "moderniser-une-unite-de-transformation-de-cereales",
        "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
    ),
]

mises_a_jour = 0
for slug, url in EXEMPLES:
    campaign = Campaign.objects.filter(slug=slug).first()
    if not campaign:
        print(f"Campagne introuvable : {slug}")
        continue
    if campaign.presentation_video or campaign.presentation_video_url:
        print(f"Déjà une vidéo sur « {campaign.title} », inchangé.")
        continue
    campaign.presentation_video_url = url
    campaign.save(update_fields=["presentation_video_url"])
    mises_a_jour += 1
    print(f"Vidéo ajoutée sur « {campaign.title} ».")

print(f"{mises_a_jour} campagne(s) mise(s) à jour.")
