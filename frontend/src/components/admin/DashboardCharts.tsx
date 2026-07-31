import { useState } from "react"

type Tab = string

interface WorkloadItem {
  key: string
  label: string
  value: number
  target: Tab
}

/** Comparaison de magnitude (files d'attente) : une seule teinte, trié décroissant. */
export function WorkloadChart({
  items,
  onSelect,
}: {
  items: WorkloadItem[]
  onSelect: (target: Tab) => void
}) {
  const [hovered, setHovered] = useState<string | null>(null)
  const sorted = [...items].sort((a, b) => b.value - a.value)
  const max = Math.max(...sorted.map((item) => item.value), 1)
  const total = sorted.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="rounded-[20px] border border-black/5 bg-white p-6 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-heading text-lg font-bold text-ink">Charge de travail</h3>
        <span className="text-xs text-ink-muted">{total} en attente au total</span>
      </div>

      {total === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">Aucune file d’attente en cours. Tout est traité.</p>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {sorted.map((item) => {
            const widthPercent = Math.max((item.value / max) * 100, item.value > 0 ? 4 : 0)
            const isHovered = hovered === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelect(item.target)}
                onMouseEnter={() => setHovered(item.key)}
                onMouseLeave={() => setHovered((current) => (current === item.key ? null : current))}
                onFocus={() => setHovered(item.key)}
                onBlur={() => setHovered((current) => (current === item.key ? null : current))}
                className="group relative w-full cursor-pointer rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-gold-dark/50"
                aria-label={`${item.label} : ${item.value} en attente — ouvrir cette file`}
              >
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-ink-secondary group-hover:text-ink">{item.label}</span>
                  <span className="font-semibold text-ink tabular-nums">{item.value}</span>
                </div>
                <div className="mt-1.5 h-[10px] w-full overflow-hidden rounded-full bg-black/[0.05]">
                  <div
                    className="h-full rounded-full bg-gold-dark transition-[width] duration-300 ease-out group-hover:bg-gold-dark/80"
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
                {isHovered && (
                  <div className="absolute top-full left-0 z-10 mt-1 rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium text-white shadow-lg">
                    {item.label} : {item.value}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface StatusSegment {
  key: string
  label: string
  value: number
  colorClass: string
  target: Tab
}

/** Part-à-tout : répartition des campagnes actives par statut, couleurs de statut fixes. */
export function CampaignStatusChart({
  segments,
  onSelect,
}: {
  segments: StatusSegment[]
  onSelect: (target: Tab) => void
}) {
  const [hovered, setHovered] = useState<string | null>(null)
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)

  return (
    <div className="rounded-[20px] border border-black/5 bg-white p-6 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-heading text-lg font-bold text-ink">Campagnes actives par statut</h3>
        <span className="text-xs text-ink-muted">{total} au total</span>
      </div>

      {total === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">Aucune campagne en modération, publiée ou suspendue.</p>
      ) : (
        <>
          <div className="mt-5 flex h-7 w-full gap-0.5 overflow-hidden rounded-full">
            {segments
              .filter((segment) => segment.value > 0)
              .map((segment) => (
                <button
                  key={segment.key}
                  type="button"
                  onClick={() => onSelect(segment.target)}
                  onMouseEnter={() => setHovered(segment.key)}
                  onMouseLeave={() => setHovered((current) => (current === segment.key ? null : current))}
                  className={`group relative cursor-pointer transition-opacity hover:opacity-85 ${segment.colorClass}`}
                  style={{ width: `${(segment.value / total) * 100}%` }}
                  aria-label={`${segment.label} : ${segment.value} campagne(s) — ouvrir cette file`}
                >
                  {hovered === segment.key && (
                    <div className="absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white shadow-lg">
                      {segment.label} : {segment.value}
                    </div>
                  )}
                </button>
              ))}
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            {segments.map((segment) => (
              <li key={segment.key} className="flex items-center gap-1.5 text-xs text-ink-secondary">
                <span className={`size-2.5 shrink-0 rounded-full ${segment.colorClass}`} aria-hidden="true" />
                {segment.label} <span className="font-semibold text-ink tabular-nums">{segment.value}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
