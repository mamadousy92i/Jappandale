import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, Check, FileSearch, MapPin, ShieldCheck } from "lucide-react"

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

function HomePage() {
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([])

  useEffect(() => {
    apiFetch("/campaigns/")
      .then((data) => setCampaigns((data as CampaignListItem[]).slice(0, 3)))
      .catch(() => setCampaigns([]))
  }, [])

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
              Le parcours de contribution fonctionne en mode démonstration. Aucun
              compte ni moyen de paiement réel n’est débité.
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
          <h2 className="mt-4 font-heading text-2xl font-bold text-ink">Paiement en démonstration</h2>
          <p className="mt-5 text-sm leading-relaxed text-ink-secondary">
            Vous pouvez maintenant tester une contribution, son historique et son effet
            sur la collecte. Le raccordement à un prestataire de paiement réel viendra
            après validation des règles financières et des tests de sécurité.
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
