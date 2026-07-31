import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  BookOpen,
  Hammer,
  HeartPulse,
  Landmark,
  Laptop,
  MapPin,
  Sprout,
  Store,
  Tag,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { formatFcfa } from "@/lib/format"
import type { CampaignCategory, CampaignListItem } from "@/lib/types"

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

export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-black/[0.06]"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-gold to-gold-dark transition-[width] duration-700 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

export function CampaignCard({ campaign }: { campaign: CampaignListItem }) {
  const { t } = useTranslation("campaigns")
  const Icon = categoryIcons[campaign.category]

  return (
    <Link
      to={`/campagnes/${campaign.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-[20px] border border-black/5 bg-surface shadow-sm outline-none transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-gold-dark/50 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-alt">
        {campaign.cover_image ? (
          <img
            src={campaign.cover_image}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-gold/15 to-surface-alt bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.05)_1px,transparent_0)] bg-[length:16px_16px]">
            <span className="flex size-12 items-center justify-center rounded-full border border-gold/20 bg-white/70 shadow-sm backdrop-blur-sm">
              <Icon aria-hidden="true" className="size-5 text-gold-dark/80" />
            </span>
          </div>
        )}
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-ink-secondary shadow-sm backdrop-blur">
          <Icon aria-hidden="true" className="size-3.5 text-gold-dark" />
          {campaign.category_display}
        </span>
        {campaign.campaign_type === "INVESTISSEMENT_PARTICIPATIF" &&
          campaign.expected_return_rate != null && (
            <span className="absolute top-3 right-3 rounded-full bg-gold px-3 py-1 text-xs font-semibold text-ink shadow-sm">
              +{campaign.expected_return_rate}%
            </span>
          )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-heading text-lg font-bold text-ink transition-colors group-hover:text-gold-dark">
          {campaign.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-secondary">
          {campaign.summary}
        </p>
        {campaign.location && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-ink-muted">
            <MapPin aria-hidden="true" className="size-3.5 text-gold-dark" />
            {campaign.location}
          </p>
        )}

        <div className="mt-auto pt-5">
          <ProgressBar percent={campaign.progress_percent} />
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <span className="text-sm font-bold text-ink">
              {formatFcfa(campaign.collected_amount)}
            </span>
            <span className="text-sm font-semibold text-gold-dark">
              {campaign.progress_percent}%
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-ink-muted">
            <span>{t("card.amountOutOf", { amount: formatFcfa(campaign.goal_amount) })}</span>
            <span>
              {campaign.days_left > 0
                ? t("card.daysLeft", { count: campaign.days_left })
                : t("card.ended")}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
