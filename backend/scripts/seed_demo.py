"""Peuple la base avec des données de démonstration complètes.

Complète ce que `seed_campaigns.py` ne couvre pas : dispositifs du Guichet
Unique, orientations, contreparties, campagne d'investissement participatif,
litiges, actualités et messagerie.

Idempotent : relancer le script ne crée pas de doublons.

    python manage.py shell < scripts/seed_demo.py
"""

from datetime import timedelta

from django.core.files.base import ContentFile
from django.utils import timezone

from apps.accounts.models import User
from apps.campaigns.models import Campaign, CampaignUpdate, Reward
from apps.contributions.models import Contribution
from apps.disputes.models import Dispute
from apps.guichet.models import FinancingScheme, SchemeReferral
from apps.messaging.models import Message, MessageThread
from apps.partners.models import PartnerProjectInterest, ProjectDocument

now = timezone.now()
today = timezone.localdate()


def admin_user():
    return User.objects.filter(role=User.Role.ADMIN).order_by("id").first()


def porteur(email):
    return User.objects.filter(email=email).first()


# ---------------------------------------------------------------------------
# 1. Guichet Unique — dispositifs de financement
# ---------------------------------------------------------------------------
DISPOSITIFS = [
    {
        "name": "Fonds d'amorçage jeunes entrepreneurs",
        "provider_name": "Délégation à l'Entrepreneuriat Rapide (DER/FJ)",
        "provider_type": FinancingScheme.ProviderType.FONDS_PUBLIC,
        "description": (
            "Financement d'amorçage destiné aux porteurs de projet de moins de 40 ans, "
            "pour l'achat d'équipement et le fonds de roulement initial. Accompagnement "
            "et formation à la gestion inclus pendant les six premiers mois."
        ),
        "website_url": "https://der.sn",
        "contact_email": "contact@der.sn",
        "min_score": 60,
        "requires_kyc_valide": True,
        "diaspora_requirement": FinancingScheme.DiasporaRequirement.INDIFFERENT,
        # Ouvert à toutes les catégories et à tout le pays : ce dispositif sert de
        # cas « éligible » dans la démonstration du matching automatique.
        "eligible_categories": [],
        "eligible_regions": [],
        "min_goal_amount": 100_000,
        "max_goal_amount": 5_000_000,
        "status": FinancingScheme.Status.PUBLIE,
    },
    {
        "name": "Programme d'appui aux filières maraîchères",
        "provider_name": "Agence Nationale de Conseil Agricole et Rural",
        "provider_type": FinancingScheme.ProviderType.PROGRAMME_APPUI,
        "description": (
            "Appui technique et financier aux exploitations maraîchères : irrigation, "
            "semences améliorées, stockage post-récolte. Une visite de terrain est "
            "organisée avant tout engagement."
        ),
        "contact_email": "appui@ancar.sn",
        "min_score": 45,
        "requires_kyc_valide": True,
        "diaspora_requirement": FinancingScheme.DiasporaRequirement.INDIFFERENT,
        "eligible_categories": ["AGRICULTURE"],
        "eligible_regions": ["Thiès", "Kaolack", "Saint-Louis"],
        "min_goal_amount": 200_000,
        "max_goal_amount": 3_000_000,
        "status": FinancingScheme.Status.PUBLIE,
    },
    {
        "name": "Ligne de cofinancement diaspora",
        "provider_name": "Fonds d'Appui à l'Investissement des Sénégalais de l'Extérieur",
        "provider_type": FinancingScheme.ProviderType.BAILLEUR,
        "description": (
            "Cofinancement réservé aux porteurs résidant à l'étranger qui investissent "
            "dans une activité productive au Sénégal. Le dispositif complète les fonds "
            "déjà réunis, à hauteur d'un euro pour un euro collecté."
        ),
        "website_url": "https://faise.sn",
        "contact_email": "diaspora@faise.sn",
        "min_score": 55,
        "requires_kyc_valide": True,
        "diaspora_requirement": FinancingScheme.DiasporaRequirement.DIASPORA_UNIQUEMENT,
        "eligible_categories": [],
        "eligible_regions": [],
        "min_goal_amount": 500_000,
        "max_goal_amount": 20_000_000,
        "status": FinancingScheme.Status.PUBLIE,
    },
    {
        "name": "Prêt PME partenaire",
        "provider_name": "Banque Régionale de Solidarité",
        "provider_type": FinancingScheme.ProviderType.BANQUE,
        "description": (
            "Prêt bancaire à taux préférentiel pour les entreprises déjà établies, "
            "avec un historique de collecte vérifiable. Garantie partielle assurée par "
            "le fonds de garantie national."
        ),
        "contact_email": "pme@brs.sn",
        "min_score": 75,
        "requires_kyc_valide": True,
        "diaspora_requirement": FinancingScheme.DiasporaRequirement.DIASPORA_EXCLUE,
        "eligible_categories": ["COMMERCE", "TECHNOLOGIE"],
        "eligible_regions": ["Dakar"],
        "min_goal_amount": 1_000_000,
        "max_goal_amount": 50_000_000,
        "status": FinancingScheme.Status.PUBLIE,
    },
    {
        "name": "Fonds culturel de proximité",
        "provider_name": "Ministère de la Culture",
        "provider_type": FinancingScheme.ProviderType.FONDS_PUBLIC,
        "description": (
            "Soutien aux initiatives culturelles de quartier. Fiche en cours de "
            "préparation, pas encore ouverte aux candidatures."
        ),
        "min_score": 40,
        "requires_kyc_valide": False,
        "diaspora_requirement": FinancingScheme.DiasporaRequirement.INDIFFERENT,
        "eligible_categories": ["CULTURE", "EDUCATION"],
        "eligible_regions": [],
        "min_goal_amount": 50_000,
        "max_goal_amount": 1_500_000,
        "status": FinancingScheme.Status.BROUILLON,
    },
]

admin = admin_user()
crees = 0
for data in DISPOSITIFS:
    scheme, created = FinancingScheme.objects.get_or_create(
        name=data["name"],
        defaults={**data, "created_by": admin},
    )
    if created:
        if scheme.status == FinancingScheme.Status.PUBLIE:
            scheme.published_at = now - timedelta(days=20)
            scheme.save(update_fields=["published_at"])
        crees += 1
    else:
        # Réaligne les critères d'éligibilité si la fiche existe déjà, pour que
        # relancer le script corrige une configuration devenue obsolète.
        criteres = [
            "min_score", "requires_kyc_valide", "diaspora_requirement",
            "eligible_categories", "eligible_regions",
            "min_goal_amount", "max_goal_amount", "status",
        ]
        for champ in criteres:
            setattr(scheme, champ, data[champ])
        if scheme.status == FinancingScheme.Status.PUBLIE and not scheme.published_at:
            scheme.published_at = now - timedelta(days=20)
        scheme.save()
print(f"Dispositifs du guichet : {crees} créé(s), {FinancingScheme.objects.count()} au total")

# ---------------------------------------------------------------------------
# 2. Orientations (manifestations d'intérêt) à différents stades
# ---------------------------------------------------------------------------
ORIENTATIONS = [
    ("Fonds d'amorçage jeunes entrepreneurs", "fatou.ndiaye@jappandale.sn",
     SchemeReferral.Status.EN_COURS, "Dossier transmis, entretien prévu la semaine prochaine."),
    ("Programme d'appui aux filières maraîchères", "mamadou.ba@jappandale.sn",
     SchemeReferral.Status.ACCEPTE, "Financement accordé : 1 200 000 FCFA, convention signée."),
    ("Fonds d'amorçage jeunes entrepreneurs", "aissatou.sarr@jappandale.sn",
     SchemeReferral.Status.INTERET, ""),
]

crees = 0
for nom_dispositif, email, statut, note in ORIENTATIONS:
    scheme = FinancingScheme.objects.filter(name=nom_dispositif).first()
    user = porteur(email)
    if not scheme or not user:
        continue
    referral, created = SchemeReferral.objects.get_or_create(
        scheme=scheme,
        porteur=user,
        defaults={"status": statut, "note": note, "updated_by": admin},
    )
    if created:
        crees += 1
print(f"Orientations : {crees} créée(s), {SchemeReferral.objects.count()} au total")

# ---------------------------------------------------------------------------
# 3. Campagne « don avec contrepartie » + paliers de récompense
# ---------------------------------------------------------------------------
cible = Campaign.objects.filter(slug="equiper-un-atelier-ecole-de-couture-a-la-medina").first()
if cible:
    if cible.campaign_type != Campaign.CampaignType.DON_CONTREPARTIE:
        cible.campaign_type = Campaign.CampaignType.DON_CONTREPARTIE
        cible.save(update_fields=["campaign_type"])
    PALIERS = [
        ("Carte de remerciement", "Une carte manuscrite de l'atelier, avec le nom du contributeur affiché sur le mur des soutiens.", 5_000, None),
        ("Trousse en wax", "Une trousse cousue à l'atelier dans un tissu wax choisi par les apprenties.", 25_000, 40),
        ("Sac tote personnalisé", "Un sac en toile cousu main, brodé au prénom du contributeur. Série limitée.", 60_000, 15),
    ]
    crees = 0
    for titre, desc, montant, limite in PALIERS:
        _, created = Reward.objects.get_or_create(
            campaign=cible,
            title=titre,
            defaults={"description": desc, "minimum_amount": montant, "quantity_limit": limite},
        )
        if created:
            crees += 1
    print(f"Contreparties : {crees} créée(s) sur « {cible.title} »")

# ---------------------------------------------------------------------------
# 4. Campagne « investissement participatif »
# ---------------------------------------------------------------------------
proprietaire = porteur("mamadou.ba@jappandale.sn") or porteur("porteur.test@jappandale.sn")
if proprietaire and not Campaign.objects.filter(slug="moderniser-une-unite-de-transformation-de-cereales").exists():
    invest = Campaign.objects.create(
        owner=proprietaire,
        title="Moderniser une unité de transformation de céréales à Kaolack",
        slug="moderniser-une-unite-de-transformation-de-cereales",
        summary="Doubler la capacité de transformation du mil et du maïs, avec un rendement reversé aux financeurs.",
        description=(
            "L'unité transforme aujourd'hui 1,2 tonne de céréales locales par semaine avec "
            "un matériel vieillissant. L'acquisition d'une décortiqueuse et d'un moulin "
            "neufs permettrait de doubler la capacité et de servir six villages "
            "supplémentaires.\n\n"
            "Les financeurs perçoivent un rendement annuel de 8 %, versé semestriellement "
            "sur la durée du projet, adossé aux volumes réellement transformés."
        ),
        campaign_type=Campaign.CampaignType.INVESTISSEMENT_PARTICIPATIF,
        expected_return_rate=8,
        category=Campaign.Category.AGRICULTURE,
        location="Kaolack",
        beneficiaries="Six villages producteurs, une dizaine d'emplois directs à la transformation.",
        funding_plan="Décortiqueuse (1 800 000), moulin (900 000), installation électrique (300 000).",
        project_timeline="Commande à M+1, installation à M+2, montée en cadence sur M+3 et M+4.",
        goal_amount=3_000_000,
        collected_amount=750_000,
        deadline=today + timedelta(days=45),
        status=Campaign.Status.PUBLIEE,
        published_at=now - timedelta(days=12),
    )
    print(f"Campagne investissement participatif créée : {invest.slug}")

# ---------------------------------------------------------------------------
# 5. Litiges à différents stades
# ---------------------------------------------------------------------------
confirmees = list(
    Contribution.objects.filter(status=Contribution.Status.CONFIRMEE).order_by("id")
)
LITIGES = [
    (Dispute.Reason.PORTEUR_INJOIGNABLE,
     "Je n'arrive plus à joindre le porteur depuis trois semaines, malgré deux messages restés sans réponse.",
     Dispute.Status.OUVERT, ""),
    (Dispute.Reason.PROJET_NON_CONFORME,
     "Les photos publiées ne correspondent pas au matériel annoncé dans la description du projet.",
     Dispute.Status.EN_EXAMEN, "Pièces demandées au porteur, réponse attendue sous 5 jours."),
    (Dispute.Reason.ERREUR_CONTRIBUTION,
     "J'ai validé deux fois la même contribution par erreur de manipulation.",
     Dispute.Status.REJETE, "Une seule contribution figure au journal des transactions."),
]

crees = 0
for index, (motif, details, statut, note) in enumerate(LITIGES):
    if index >= len(confirmees):
        break
    contribution = confirmees[index]
    if Dispute.objects.filter(contribution=contribution).exists():
        continue
    Dispute.objects.create(
        contribution=contribution,
        reporter=contribution.contributor,
        reason=motif,
        details=details,
        status=statut,
        admin_note=note,
        resolved_at=now if statut == Dispute.Status.REJETE else None,
    )
    crees += 1
print(f"Litiges : {crees} créé(s), {Dispute.objects.count()} au total")

# ---------------------------------------------------------------------------
# 6. Actualités de campagne
# ---------------------------------------------------------------------------
ACTUALITES = [
    ("equiper-un-atelier-ecole-de-couture-a-la-medina",
     "Les deux premières machines sont arrivées",
     "Grâce aux premières contributions, deux machines à coudre industrielles ont été "
     "livrées cette semaine. Les apprenties ont déjà commencé la formation sur le "
     "surjet et l'ourlet invisible."),
    ("installer-lirrigation-dune-parcelle-maraichere-aux-niayes",
     "Le forage est terminé",
     "Le forage a été achevé lundi et donne un débit supérieur à ce que nous espérions. "
     "Prochaine étape : la pose du réseau goutte-à-goutte sur la première parcelle."),
    ("renforcer-une-boutique-de-produits-essentiels-a-pikine",
     "Merci aux 12 premiers contributeurs",
     "Un grand merci à celles et ceux qui ont soutenu le projet ce mois-ci. Le premier "
     "réapprovisionnement en huile, riz et savon est prévu la semaine prochaine."),
]

crees = 0
for slug, titre, contenu in ACTUALITES:
    campagne = Campaign.objects.filter(slug=slug).first()
    if not campagne:
        continue
    _, created = CampaignUpdate.objects.get_or_create(
        campaign=campagne, title=titre, defaults={"content": contenu}
    )
    if created:
        crees += 1
print(f"Actualités : {crees} créée(s), {CampaignUpdate.objects.count()} au total")

# ---------------------------------------------------------------------------
# 7. Messagerie — échanges entre contributeurs et porteurs
# ---------------------------------------------------------------------------
ECHANGES = [
    ("installer-lirrigation-dune-parcelle-maraichere-aux-niayes", "financeur.test@jappandale.sn", [
        ("contributeur", "Bonjour, quelle surface sera irriguée avec le budget demandé ?"),
        ("porteur", "Bonjour et merci de votre intérêt. Le budget couvre 1,5 hectare en goutte-à-goutte, avec une extension possible si la collecte dépasse l'objectif."),
        ("contributeur", "Très clair, merci. Je vais soutenir le projet."),
    ]),
    ("renforcer-une-boutique-de-produits-essentiels-a-pikine", "mariama.fall@jappandale.sn", [
        ("contributeur", "Est-ce que la boutique est ouverte le dimanche ?"),
        ("porteur", "Oui, tous les jours de 8h à 20h, y compris le dimanche matin."),
    ]),
]

fils, msgs = 0, 0
for slug, email_contributeur, echanges in ECHANGES:
    campagne = Campaign.objects.filter(slug=slug).first()
    contributeur = porteur(email_contributeur)
    if not campagne or not contributeur:
        continue
    thread, created = MessageThread.objects.get_or_create(
        campaign=campagne, other_user=contributeur, defaults={"last_message_at": now}
    )
    if created:
        fils += 1
    if thread.messages.exists():
        continue
    horodatage = now - timedelta(days=3)
    for qui, corps in echanges:
        expediteur = contributeur if qui == "contributeur" else campagne.owner
        Message.objects.create(
            thread=thread, sender=expediteur, body=corps,
            read_at=now if qui == "contributeur" else None,
        )
        horodatage += timedelta(hours=4)
        msgs += 1
    thread.last_message_at = horodatage
    thread.save(update_fields=["last_message_at"])
print(f"Messagerie : {fils} fil(s) et {msgs} message(s) créé(s)")

# ---------------------------------------------------------------------------
# 8. Espace partenaires — profils, offres, intérêts et documents de projet
# ---------------------------------------------------------------------------
PARTENAIRES = {
    "banque": {
        "email": "partenaire.banque@jappandale.sn",
        "first_name": "Aminata",
        "last_name": "Diallo",
        "phone": "+221 33 825 10 50",
        "organization_name": "Banque SenTeranga",
        "city": "Dakar",
        "partner_type": User.PartnerType.BANQUE,
        "bio": "Équipe PME et entrepreneuriat de Banque SenTeranga.",
    },
    "incubateur": {
        "email": "partenaire.incubateur@jappandale.sn",
        "first_name": "Moussa",
        "last_name": "Faye",
        "phone": "+221 77 555 08 41",
        "organization_name": "Dakar Impact Lab",
        "city": "Dakar",
        "partner_type": User.PartnerType.INCUBATEUR,
        "bio": "Incubateur dédié aux projets numériques et à impact local.",
    },
    "fonds": {
        "email": "partenaire.fonds@jappandale.sn",
        "first_name": "Khady",
        "last_name": "Seck",
        "phone": "+221 76 412 87 20",
        "organization_name": "Sahel Croissance",
        "city": "Thiès",
        "partner_type": User.PartnerType.FONDS,
        "bio": "Fonds d'investissement orienté agriculture et transformation locale.",
    },
}

partenaires = {}
for key, profile in PARTENAIRES.items():
    partner, _ = User.objects.get_or_create(email=profile["email"], defaults=profile)
    for field, value in profile.items():
        setattr(partner, field, value)
    partner.role = User.Role.PARTENAIRE
    partner.kyc_status = User.KycStatus.VALIDE
    partner.account_status = User.AccountStatus.VALIDE
    partner.email_verified_at = now
    partner.set_password("MotDePasse123!")
    partner.save()
    partenaires[key] = partner

OFFRES_PARTENAIRES = [
    {
        "partner": "banque",
        "name": "Crédit équipement PME",
        "provider_type": FinancingScheme.ProviderType.BANQUE,
        "description": "Crédit pour l'acquisition d'équipements productifs par des PME avec activité vérifiable.",
        "min_score": 65,
        "eligible_categories": ["COMMERCE", "ARTISANAT", "TECHNOLOGIE"],
        "eligible_regions": ["Dakar", "Thiès"],
        "min_goal_amount": 500_000,
        "max_goal_amount": 15_000_000,
        "status": FinancingScheme.Status.PUBLIE,
    },
    {
        "partner": "incubateur",
        "name": "Programme d'incubation Impact Numérique",
        "provider_type": FinancingScheme.ProviderType.PROGRAMME_APPUI,
        "description": "Accompagnement de six mois : mentorat, ateliers business model et mise en relation avec des investisseurs.",
        "min_score": 45,
        "eligible_categories": ["TECHNOLOGIE", "EDUCATION", "CULTURE"],
        "eligible_regions": ["Dakar"],
        "min_goal_amount": 100_000,
        "max_goal_amount": 3_000_000,
        "status": FinancingScheme.Status.PUBLIE,
    },
    {
        "partner": "fonds",
        "name": "Fonds de croissance agroalimentaire",
        "provider_type": FinancingScheme.ProviderType.BAILLEUR,
        "description": "Financement patient et appui à la structuration pour les unités de transformation agricole.",
        "min_score": 70,
        "eligible_categories": ["AGRICULTURE"],
        "eligible_regions": ["Kaolack", "Thiès", "Saint-Louis"],
        "min_goal_amount": 1_000_000,
        "max_goal_amount": 25_000_000,
        "status": FinancingScheme.Status.BROUILLON,
    },
]

offres_creees = 0
for item in OFFRES_PARTENAIRES:
    partner = partenaires[item["partner"]]
    defaults = {
        "provider_name": partner.organization_name,
        "provider_type": item["provider_type"],
        "description": item["description"],
        "min_score": item["min_score"],
        "requires_kyc_valide": True,
        "diaspora_requirement": FinancingScheme.DiasporaRequirement.INDIFFERENT,
        "eligible_categories": item["eligible_categories"],
        "eligible_regions": item["eligible_regions"],
        "min_goal_amount": item["min_goal_amount"],
        "max_goal_amount": item["max_goal_amount"],
        "status": item["status"],
        "created_by": partner,
    }
    offer, created = FinancingScheme.objects.get_or_create(name=item["name"], defaults=defaults)
    if created:
        if offer.status == FinancingScheme.Status.PUBLIE:
            offer.published_at = now - timedelta(days=5)
            offer.save(update_fields=["published_at"])
        offres_creees += 1

INTERETS_PARTENAIRES = [
    ("banque", "equiper-un-atelier-ecole-de-couture-a-la-medina", PartnerProjectInterest.Status.EN_COURS, "Premier échange prévu avec le porteur pour analyser le besoin en équipement."),
    ("incubateur", "renforcer-une-boutique-de-produits-essentiels-a-pikine", PartnerProjectInterest.Status.CONTACTE, "Le porteur a été invité à présenter son projet lors du prochain comité."),
    ("fonds", "moderniser-une-unite-de-transformation-de-cereales", PartnerProjectInterest.Status.INTERESSE, "Analyse du potentiel de transformation locale en cours."),
]

interets_crees = 0
for partner_key, campaign_slug, interest_status, note in INTERETS_PARTENAIRES:
    campaign = Campaign.objects.filter(slug=campaign_slug).first()
    if not campaign:
        continue
    _, created = PartnerProjectInterest.objects.get_or_create(
        partner=partenaires[partner_key],
        campaign=campaign,
        defaults={"status": interest_status, "note": note},
    )
    if created:
        interets_crees += 1

DOCUMENTS_PROJETS = [
    ("equiper-un-atelier-ecole-de-couture-a-la-medina", "Business plan — Atelier Sunu Couture", ProjectDocument.DocumentType.BUSINESS_PLAN, True),
    ("equiper-un-atelier-ecole-de-couture-a-la-medina", "Budget prévisionnel des équipements", ProjectDocument.DocumentType.BUDGET, True),
    ("moderniser-une-unite-de-transformation-de-cereales", "Pitch deck — Unité céréalière", ProjectDocument.DocumentType.PITCH_DECK, True),
    ("renforcer-une-boutique-de-produits-essentiels-a-pikine", "Justificatif commercial interne", ProjectDocument.DocumentType.JUSTIFICATIF, False),
]

documents_crees = 0
for campaign_slug, title, document_type, shared in DOCUMENTS_PROJETS:
    campaign = Campaign.objects.filter(slug=campaign_slug).first()
    if not campaign:
        continue
    document, created = ProjectDocument.objects.get_or_create(
        campaign=campaign,
        title=title,
        defaults={
            "uploaded_by": campaign.owner,
            "document_type": document_type,
            "shared_with_partners": shared,
        },
    )
    if created:
        document.file.save(
            f"{campaign.slug}-{document_type.lower()}.pdf",
            ContentFile(
                (
                    "%PDF-1.4\n"
                    "% Document de démonstration Jappandale — sans valeur contractuelle\n"
                    f"% Projet : {campaign.title}\n"
                ).encode()
            ),
            save=True,
        )
        documents_crees += 1

print(
    "Espace partenaires : "
    f"{len(partenaires)} profil(s), {offres_creees} offre(s), "
    f"{interets_crees} intérêt(s) et {documents_crees} document(s) créés."
)

print("\nPeuplement de démonstration terminé.")
