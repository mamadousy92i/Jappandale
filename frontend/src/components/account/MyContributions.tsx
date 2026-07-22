import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowUpRight, HandCoins } from "lucide-react"

import { useAuth } from "@/lib/auth"
import { formatFcfa } from "@/lib/format"
import type { Contribution, ContributionStatus } from "@/lib/types"

const statusLabels: Record<ContributionStatus, string> = {
  INITIEE: "En attente",
  CONFIRMEE: "Confirmée",
  ECHOUEE: "Échouée",
  REMBOURSEE: "Remboursée",
}

export function MyContributions() {
  const { authFetch } = useAuth()
  const [items, setItems] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    authFetch("/contributions/mine/")
      .then((data) => setItems(data as Contribution[]))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [authFetch])

  return (
    <section className="rounded-[20px] border border-black/5 bg-surface p-8 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.08)] sm:p-10">
      <h2 className="font-heading text-xl font-bold text-ink">Mes contributions</h2>
      <p className="mt-1 text-sm text-ink-muted">Historique de vos contributions réalisées sur Jappandale.</p>
      {loading ? (
        <div className="mt-6 h-24 animate-pulse rounded-2xl bg-black/[0.05]" />
      ) : error ? (
        <p className="mt-6 text-sm text-red-600">Impossible de charger vos contributions.</p>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-black/10 bg-surface-alt p-8 text-center">
          <HandCoins className="mx-auto size-6 text-gold-dark" />
          <p className="mt-3 text-sm text-ink-secondary">Vous n’avez pas encore contribué à une campagne.</p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-black/5">
          {items.map((item) => (
            <li key={item.public_reference} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Link className="font-semibold text-ink hover:text-gold-dark" to={`/campagnes/${item.campaign.slug}`}>
                  {item.campaign.title} <ArrowUpRight className="inline size-3.5" />
                </Link>
                <p className="mt-1 text-xs text-ink-muted">{item.anonymous ? "Contribution anonyme" : "Nom visible"} · {statusLabels[item.status]}</p>
              </div>
              <span className="font-heading font-bold text-ink">{formatFcfa(item.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
