import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Hammer,
  HeartPulse,
  Landmark,
  Laptop,
  Newspaper,
  Sprout,
  Store,
  Tag,
  UserRound,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { ProgressBar } from "@/components/campaigns/CampaignCard"
import { Button } from "@/components/ui/button"
import { ApiError, apiFetch } from "@/lib/api"
import { formatFcfa } from "@/lib/format"
import type { CampaignCategory, CampaignDetail } from "@/lib/types"

const categoryIcons: Record<CampaignCategory, LucideIcon> = {
  ARTISANAT: Hammer,
  COMMERCE: Store,
  AGRICULTURE: Sprout,
  EDUCATION: BookOpen,
  SANTE: HeartPulse,
  TECHNOLOGIE: Laptop,
  CULTURE: Landmark,
  AUTRE: Tag,
}

/** Formate une date ISO en français, ex. « 21 juillet 2026 ». */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

/** Nom public du porteur : « Awa N. » (prénom + initiale du nom). */
function ownerName(owner: CampaignDetail["owner"]): string {
  const initial = owner.last_name ? ` ${owner.last_name.charAt(0).toUpperCase()}.` : ""
  return `${owner.first_name}${initial}`
}

/** Carte de collecte : montants, progression et appel à contribuer. */
function DonationCard({ campaign }: { campaign: CampaignDetail }) {
  return (
    <div className="rounded-[20px] border border-black/5 bg-surface p-7 shadow-sm">
      <p className="font-heading text-3xl font-bold text-ink">
        {formatFcfa(campaign.collected_amount)}
      </p>
      <p className="mt-1 text-sm text-ink-muted">
        collectés sur un objectif de {formatFcfa(campaign.goal_amount)}
      </p>

      <div className="mt-5">
        <ProgressBar percent={campaign.progress_percent} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-black/5 pt-4">
        <div>
          <p className="font-heading text-xl font-bold text-gold-dark">
            {campaign.progress_percent}%
          </p>
          <p className="text-xs text-ink-muted">de l'objectif</p>
        </div>
        <div>
          <p className="font-heading text-xl font-bold text-ink">
            {campaign.days_left > 0 ? `J-${campaign.days_left}` : "Terminée"}
          </p>
          <p className="text-xs text-ink-muted">
            {campaign.days_left > 0 ? "avant la clôture" : "campagne clôturée"}
          </p>
        </div>
      </div>

      <Button
        disabled
        className="mt-6 h-12 w-full rounded-full bg-gold text-base font-semibold text-ink shadow-md shadow-gold/25 disabled:opacity-60"
      >
        Contribuer — bientôt
      </Button>
      <p className="mt-3 text-center text-xs leading-relaxed text-ink-muted">
        Les contributions en ligne arrivent très bientôt.
      </p>
    </div>
  )
}

function CampaignDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    setCampaign(null)

    apiFetch(`/campaigns/${slug}/`)
      .then((data) => {
        if (cancelled) return
        setCampaign(data as CampaignDetail)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setNotFound(err instanceof ApiError ? err.status === 404 : false)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-14" aria-busy="true">
        <div className="aspect-[21/9] w-full animate-pulse rounded-[28px] bg-black/[0.06]" />
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_24rem]">
          <div className="space-y-4">
            <div className="h-9 w-3/4 animate-pulse rounded-full bg-black/[0.06]" />
            <div className="h-4 w-1/3 animate-pulse rounded-full bg-black/[0.05]" />
            <div className="h-4 w-full animate-pulse rounded-full bg-black/[0.05]" />
            <div className="h-4 w-full animate-pulse rounded-full bg-black/[0.05]" />
            <div className="h-4 w-2/3 animate-pulse rounded-full bg-black/[0.05]" />
          </div>
          <div className="h-72 animate-pulse rounded-[20px] bg-black/[0.06]" />
        </div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center sm:py-32">
        <span
          aria-hidden="true"
          className="flex size-12 items-center justify-center rounded-2xl bg-gold/15 text-gold-dark"
        >
          <Tag className="size-6" />
        </span>
        <h1 className="mt-5 font-heading text-2xl font-bold text-ink sm:text-3xl">
          Campagne introuvable
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
          {notFound
            ? "Cette campagne n'existe pas ou n'est plus disponible."
            : "Impossible de charger cette campagne pour le moment."}
        </p>
        <Button
          asChild
          variant="outline"
          className="mt-8 rounded-full border-black/10 px-6 font-medium text-ink transition-all hover:border-gold hover:bg-gold/10 hover:text-gold-dark"
        >
          <Link to="/campagnes">
            <ArrowLeft aria-hidden="true" className="size-4" />
            Retour aux campagnes
          </Link>
        </Button>
      </div>
    )
  }

  const Icon = categoryIcons[campaign.category]

  return (
    <article className="mx-auto max-w-6xl px-6 pt-8 pb-20 sm:pt-10 sm:pb-24">
      {/* Fil de retour */}
      <Link
        to="/campagnes"
        className="group inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-ink-secondary transition-colors outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-gold-dark/50"
      >
        <ArrowLeft
          aria-hidden="true"
          className="size-4 transition-transform duration-300 group-hover:-translate-x-1"
        />
        Toutes les campagnes
      </Link>

      {/* Couverture */}
      <div className="animate-in fade-in fill-mode-backwards relative mt-6 overflow-hidden rounded-[28px] border border-black/5 shadow-md duration-700 motion-reduce:animate-none">
        {campaign.cover_image ? (
          <img
            src={campaign.cover_image}
            alt=""
            className="aspect-[16/9] w-full object-cover sm:aspect-[21/9]"
          />
        ) : (
          <div className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-gold/20 to-surface-alt sm:aspect-[21/9]">
            <Icon aria-hidden="true" className="size-16 text-gold-dark/70" />
          </div>
        )}
        <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-ink-secondary shadow-sm backdrop-blur">
          <Icon aria-hidden="true" className="size-3.5 text-gold-dark" />
          {campaign.category_display}
        </span>
      </div>

      {/* Titre + porteur */}
      <header className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards mt-8 delay-100 duration-700 motion-reduce:animate-none">
        <h1 className="font-heading text-3xl leading-tight font-bold text-balance text-ink sm:text-4xl lg:text-5xl">
          {campaign.title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-secondary">
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex size-7 items-center justify-center rounded-full bg-gold/15 text-gold-dark"
            >
              <UserRound className="size-4" />
            </span>
            Porté par{" "}
            <span className="font-semibold text-ink">{ownerName(campaign.owner)}</span>
          </span>
          {campaign.published_at && (
            <span className="inline-flex items-center gap-1.5 text-ink-muted">
              <CalendarDays aria-hidden="true" className="size-4" />
              Publiée le {formatDate(campaign.published_at)}
            </span>
          )}
        </div>
      </header>

      {/* Contenu + carte de collecte */}
      <div className="mt-10 grid items-start gap-10 lg:grid-cols-[1fr_24rem] lg:gap-14">
        {/* Colonne latérale : première sur mobile, sticky à droite sur desktop */}
        <aside className="order-first lg:order-last lg:sticky lg:top-24">
          <DonationCard campaign={campaign} />
        </aside>

        <div className="min-w-0">
          <section aria-labelledby="a-propos">
            <h2
              id="a-propos"
              className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase"
            >
              À propos du projet
            </h2>
            <p className="mt-5 leading-relaxed whitespace-pre-line text-ink-secondary">
              {campaign.description}
            </p>
          </section>

          {campaign.updates.length > 0 && (
            <section aria-labelledby="actualites" className="mt-14">
              <h2
                id="actualites"
                className="flex items-center gap-2 text-xs font-semibold tracking-[4px] text-gold-dark uppercase"
              >
                <Newspaper aria-hidden="true" className="size-4" />
                Actualités
              </h2>
              <ol className="mt-6 space-y-5">
                {campaign.updates.map((update) => (
                  <li
                    key={update.id}
                    className="rounded-[20px] border border-black/5 bg-surface p-6 shadow-sm transition-all duration-300 hover:border-gold/40 hover:shadow-md motion-reduce:transition-none sm:p-7"
                  >
                    <time
                      dateTime={update.created_at}
                      className="text-xs font-medium text-ink-muted"
                    >
                      {formatDate(update.created_at)}
                    </time>
                    <h3 className="mt-2 font-heading text-lg font-bold text-ink">
                      {update.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink-secondary">
                      {update.content}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </div>
    </article>
  )
}

export default CampaignDetailPage
