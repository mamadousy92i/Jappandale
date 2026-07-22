import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowDown, ArrowRight, Check, CheckCircle2, FileSearch, FileText, HandCoins, MapPin, Maximize2, ShieldCheck, X } from "lucide-react"

import { CampaignCard } from "@/components/campaigns/CampaignCard"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"
import type { CampaignListItem } from "@/lib/types"

const reviewSteps = [
  {
    title: "Identité et activité",
    text: "Le porteur transmet ses justificatifs. L’équipe vérifie le dossier avant toute publication.",
  },
  {
    title: "Projet et besoin financier",
    text: "Le montant, l’utilisation des fonds, les bénéficiaires et le calendrier sont relus.",
  },
  {
    title: "Publication encadrée",
    text: "La campagne n’est visible qu’après validation. Un rejet doit être motivé et corrigé.",
  },
]

const journeySteps = [
  { icon: FileText, title: "Présenter le projet", text: "Décrivez le besoin, les bénéficiaires, le budget et les étapes prévues.", image: "/screenshots/parcours-creation.jpg", alt: "Formulaire de création d’une campagne Jappandale" },
  { icon: ShieldCheck, title: "Faire vérifier le dossier", text: "L’identité, l’activité et les informations de campagne sont relues avant publication.", image: "/screenshots/parcours-verification.jpg", alt: "Profil Jappandale avec identité vérifiée" },
  { icon: HandCoins, title: "Mobiliser les contributeurs", text: "Partagez la page publique et suivez l’évolution de la collecte en toute clarté.", image: "/screenshots/parcours-publication.jpg", alt: "Page publique d’une campagne vérifiée" },
  { icon: CheckCircle2, title: "Rendre compte", text: "Pilotez vos collectes et publiez des nouvelles sur les étapes franchies.", image: "/screenshots/parcours-suivi.jpg", alt: "Tableau de suivi des campagnes d’un porteur" },
]

function HomePage() {
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([])
  const [selectedJourneyStep, setSelectedJourneyStep] = useState<(typeof journeySteps)[number] | null>(null)

  useEffect(() => {
    apiFetch("/campaigns/")
      .then((data) => setCampaigns((data as CampaignListItem[]).slice(0, 3)))
      .catch(() => setCampaigns([]))
  }, [])

  useEffect(() => {
    if (!selectedJourneyStep) return

    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedJourneyStep(null)
    }

    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", closeOnEscape)
    }
  }, [selectedJourneyStep])

  return (
    <>
      <section className="border-b border-black/5 bg-[#fbfaf6]">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div>
            <p className="text-sm font-semibold text-gold-dark">Plateforme de projets sénégalais</p>
            <h1 className="mt-4 max-w-3xl font-heading text-4xl leading-[1.05] font-bold text-ink sm:text-5xl lg:text-6xl">
              Financer les projets qui font avancer le Sénégal.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-secondary sm:text-lg">
              Découvrez des projets locaux documentés, portés par des personnes vérifiées,
              et suivez concrètement l’utilisation prévue des fonds et leur avancement.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                className="h-12 rounded-full bg-gold px-7 font-semibold text-ink shadow-sm hover:bg-gold-light"
              >
                <Link to="/campagnes">
                  Voir les projets publiés
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 rounded-full border-black/15 bg-white px-7 font-semibold text-ink hover:border-gold"
              >
                <Link to="/inscription">Déposer un projet</Link>
              </Button>
            </div>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-ink-muted">
              Chaque contribution est enregistrée et peut être suivie depuis votre espace personnel.
            </p>
          </div>

          <figure className="relative">
            <img
              src="/photos/porteur.jpg"
              alt="Tailleur dans son atelier à Dakar"
              width={1200}
              height={900}
              fetchPriority="high"
              className="aspect-[4/3] w-full rounded-[24px] object-cover shadow-[0_20px_60px_-30px_rgba(0,0,0,0.35)]"
            />
            <figcaption className="absolute right-4 bottom-4 left-4 flex items-center gap-2 rounded-xl bg-black/70 px-4 py-3 text-sm text-white backdrop-blur-sm">
              <MapPin aria-hidden="true" className="size-4 text-gold" />
              Atelier de couture — Médina, Dakar
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-gold-dark">En cours de préparation</p>
            <h2 className="mt-2 font-heading text-3xl font-bold text-ink sm:text-4xl">
              Les projets publiés
            </h2>
            <p className="mt-3 max-w-2xl text-ink-secondary">
              Chaque fiche présente le besoin, le lieu, les bénéficiaires et l’usage prévu
              du financement.
            </p>
          </div>
          <Link
            to="/campagnes"
            className="inline-flex items-center gap-2 text-sm font-semibold text-ink hover:text-gold-dark"
          >
            Toutes les campagnes
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>

        {campaigns.length > 0 ? (
          <div className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        ) : (
          <div className="mt-9 rounded-2xl border border-dashed border-black/15 bg-surface-alt px-6 py-10 text-sm text-ink-secondary">
            Les campagnes seront affichées ici dès que le service sera disponible.
          </div>
        )}
      </section>

      <section id="comment-ca-marche" className="scroll-mt-24 border-y border-black/5 bg-[#fbfaf6]">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">Comment ça marche</p>
            <h2 className="mt-4 font-heading text-3xl font-bold text-ink sm:text-4xl">Un parcours clair, de l’idée au suivi</h2>
            <p className="mt-4 leading-relaxed text-ink-secondary">Jappandale accompagne chaque projet à travers quatre étapes simples, avec la transparence comme fil conducteur.</p>
          </div>
          <ol className="relative mt-12 space-y-12 before:absolute before:top-6 before:bottom-6 before:left-[23px] before:w-px before:bg-gradient-to-b before:from-gold before:via-gold/70 before:to-gold/20 before:content-[''] lg:space-y-16 lg:before:left-1/2">
            {journeySteps.map(({ icon: Icon, title, text, image, alt }, index) => (
              <li key={title} className="relative pl-16 lg:grid lg:grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)] lg:items-center lg:pl-0">
                <article className={`group row-start-1 overflow-hidden rounded-[22px] border border-black/5 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl motion-reduce:transform-none ${index % 2 === 0 ? "lg:col-start-1" : "lg:col-start-3"}`}>
                  <button type="button" onClick={() => setSelectedJourneyStep(journeySteps[index])} className="relative block w-full cursor-zoom-in overflow-hidden border-b border-black/5 bg-surface-alt text-left" aria-label={`Agrandir la capture : ${title}`}>
                    <img src={image} alt={alt} width={1280} height={720} loading="lazy" className="aspect-video w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06] motion-reduce:transition-none" />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <span className="absolute right-4 bottom-4 flex translate-y-2 items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-semibold text-ink opacity-0 shadow-lg transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
                      <Maximize2 aria-hidden="true" className="size-4" />
                      Agrandir
                    </span>
                  </button>
                  <div className="p-6 sm:p-7">
                    <span className="font-heading text-sm font-bold tracking-[0.18em] text-gold-dark">ÉTAPE 0{index + 1}</span>
                    <h3 className="mt-3 font-heading text-2xl font-bold text-ink">{title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-ink-secondary">{text}</p>
                  </div>
                </article>
                <div className="absolute top-5 left-0 z-10 row-start-1 flex flex-col items-center lg:static lg:col-start-2 lg:justify-self-center">
                  <span className="flex size-12 items-center justify-center rounded-full border-4 border-[#fbfaf6] bg-gold text-ink shadow-md">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  {index < journeySteps.length - 1 && <ArrowDown aria-hidden="true" className="mt-3 size-5 text-gold-dark" />}
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button asChild className="rounded-full bg-gold px-7 font-semibold text-ink hover:bg-gold-light"><Link to="/campagnes">Découvrir les projets</Link></Button>
            <Button asChild variant="outline" className="rounded-full border-black/15 px-7 font-semibold"><Link to="/inscription?role=PORTEUR">Déposer un projet</Link></Button>
          </div>
        </div>
      </section>

      {selectedJourneyStep && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Capture agrandie : ${selectedJourneyStep.title}`}
          className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 duration-200 sm:p-8"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedJourneyStep(null)
          }}
        >
          <div className="animate-in zoom-in-95 relative w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl duration-300">
            <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-gold-dark uppercase">Aperçu du parcours</p>
                <h2 className="mt-1 font-heading text-lg font-bold text-ink">{selectedJourneyStep.title}</h2>
              </div>
              <button type="button" onClick={() => setSelectedJourneyStep(null)} className="flex size-10 items-center justify-center rounded-full border border-black/10 text-ink transition-colors hover:bg-surface-alt" aria-label="Fermer l’aperçu">
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
            <div className="bg-[#121212] p-2 sm:p-4">
              <img src={selectedJourneyStep.image} alt={selectedJourneyStep.alt} width={1280} height={720} className="max-h-[75vh] w-full object-contain" />
            </div>
          </div>
        </div>
      )}

      <section className="border-y border-black/5 bg-ink text-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 sm:py-20 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <ShieldCheck aria-hidden="true" className="size-9 text-gold" />
            <h2 className="mt-5 font-heading text-3xl font-bold sm:text-4xl">
              Ce que signifie « projet vérifié »
            </h2>
            <p className="mt-5 leading-relaxed text-white/70">
              Une validation ne garantit pas la réussite du projet. Elle confirme que le
              porteur a transmis les pièces demandées et que les informations de la
              campagne ont été relues avant publication.
            </p>
          </div>

          <ol className="divide-y divide-white/10 border-y border-white/10">
            {reviewSteps.map((step, index) => (
              <li key={step.title} className="grid grid-cols-[2.5rem_1fr] gap-4 py-6">
                <span className="font-heading text-2xl font-bold text-gold">0{index + 1}</span>
                <div>
                  <h3 className="font-heading text-xl font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-16 sm:py-20 lg:grid-cols-2">
        <article className="border-l-4 border-gold pl-6 sm:pl-8">
          <Check aria-hidden="true" className="size-6 text-gold-dark" />
          <h2 className="mt-4 font-heading text-2xl font-bold text-ink">
            Disponible aujourd’hui
          </h2>
          <ul className="mt-5 space-y-3 text-sm text-ink-secondary">
            <li>Création de compte et profil porteur</li>
            <li>Dépôt et revue manuelle des pièces KYC</li>
            <li>Création, modération et publication d’une campagne</li>
            <li>Consultation publique des projets publiés</li>
          </ul>
        </article>

        <article className="border-l-4 border-black/15 pl-6 sm:pl-8">
          <FileSearch aria-hidden="true" className="size-6 text-ink-muted" />
          <h2 className="mt-4 font-heading text-2xl font-bold text-ink">Parcours de contribution</h2>
          <p className="mt-5 text-sm leading-relaxed text-ink-secondary">
            Choisissez un montant, confirmez votre contribution et retrouvez immédiatement
            son statut dans votre historique personnel.
          </p>
          <Button
            asChild
            variant="outline"
            className="mt-6 rounded-full border-black/15 px-6 font-semibold"
          >
            <Link to="/inscription">Créer mon espace</Link>
          </Button>
        </article>
      </section>
    </>
  )
}

export default HomePage
