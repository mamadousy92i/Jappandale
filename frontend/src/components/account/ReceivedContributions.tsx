import { useEffect, useState } from "react"
import { Inbox } from "lucide-react"

import { useAuth } from "@/lib/auth"
import { formatFcfa } from "@/lib/format"
import type { Contribution } from "@/lib/types"

export function ReceivedContributions() {
  const { authFetch } = useAuth()
  const [items, setItems] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    authFetch("/contributions/received/")
      .then((data) => setItems(data as Contribution[]))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [authFetch])

  return (
    <section className="rounded-[20px] border border-black/5 bg-surface p-8 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.08)] sm:p-10">
      <h2 className="font-heading text-xl font-bold text-ink">Contributions reçues</h2>
      <p className="mt-1 text-sm text-ink-muted">Suivi des tentatives et confirmations sur vos campagnes.</p>
      {loading ? (
        <div className="mt-6 h-24 animate-pulse rounded-2xl bg-black/[0.05]" />
      ) : error ? (
        <p className="mt-6 text-sm text-red-600">Impossible de charger les contributions reçues.</p>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-black/10 bg-surface-alt p-8 text-center">
          <Inbox className="mx-auto size-6 text-gold-dark" />
          <p className="mt-3 text-sm text-ink-secondary">Aucune contribution reçue pour le moment.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((item) => (
            <li key={item.public_reference} className="rounded-2xl bg-surface-alt p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-ink">{item.contributor_display}</p>
                  <p className="mt-1 text-xs text-ink-muted">{item.campaign.title} · {item.status.toLowerCase()}</p>
                </div>
                <span className="font-heading font-bold text-ink">{formatFcfa(item.amount)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
