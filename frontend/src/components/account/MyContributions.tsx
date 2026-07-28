import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowUpRight, HandCoins } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"
import { formatFcfa } from "@/lib/format"
import type { Contribution, ContributionStatus, Dispute, DisputeReason } from "@/lib/types"

const statusLabels: Record<ContributionStatus, string> = {
  INITIEE: "En attente",
  CONFIRMEE: "Confirmée",
  ECHOUEE: "Échouée",
  REMBOURSEE: "Remboursée",
}

const disputeReasonLabels: Record<DisputeReason, string> = {
  PROJET_NON_CONFORME: "Projet non conforme / fonds mal utilisés",
  PORTEUR_INJOIGNABLE: "Porteur injoignable",
  ERREUR_CONTRIBUTION: "Contribution non voulue / erreur",
  AUTRE: "Autre motif",
}

function DisputeForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (reason: DisputeReason, details: string) => Promise<void>
  onCancel: () => void
}) {
  const [reason, setReason] = useState<DisputeReason>("AUTRE")
  const [details, setDetails] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!details.trim()) {
      setError("Décrivez le problème rencontré.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(reason, details)
    } catch {
      setError("Impossible d’ouvrir ce litige. Réessayez.")
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
      {error && <p className="text-xs text-red-700">{error}</p>}
      <select
        aria-label="Motif du litige"
        value={reason}
        onChange={(event) => setReason(event.target.value as DisputeReason)}
        className="w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs text-ink"
      >
        {Object.entries(disputeReasonLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <textarea
        aria-label="Détails du litige"
        value={details}
        onChange={(event) => setDetails(event.target.value)}
        rows={2}
        maxLength={1500}
        placeholder="Décrivez le problème rencontré…"
        className="w-full resize-y rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs text-ink"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting} className="h-8 rounded-full px-3 text-xs">
          Annuler
        </Button>
        <Button type="button" disabled={submitting} onClick={() => void submit()} className="h-8 rounded-full bg-red-600 px-3 text-xs text-white hover:bg-red-700">
          Ouvrir le litige
        </Button>
      </div>
    </div>
  )
}

export function MyContributions() {
  const { authFetch } = useAuth()
  const [items, setItems] = useState<Contribution[]>([])
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [openingId, setOpeningId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      authFetch("/contributions/mine/"),
      authFetch("/litiges/"),
    ])
      .then(([contributions, disputeList]) => {
        setItems(contributions as Contribution[])
        setDisputes(disputeList as Dispute[])
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [authFetch])

  const openDispute = async (reference: string, reason: DisputeReason, details: string) => {
    const dispute = (await authFetch("/litiges/", {
      method: "POST",
      body: JSON.stringify({ contribution_reference: reference, reason, details }),
    })) as Dispute
    setDisputes((current) => [dispute, ...current])
    setOpeningId(null)
  }

  const activeDispute = (reference: string) =>
    disputes.find(
      (dispute) =>
        dispute.contribution_reference === reference &&
        (dispute.status === "OUVERT" || dispute.status === "EN_EXAMEN"),
    )

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
          {items.map((item) => {
            const active = activeDispute(item.public_reference)
            return (
              <li key={item.public_reference} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Link className="font-semibold text-ink hover:text-gold-dark" to={`/campagnes/${item.campaign.slug}`}>
                      {item.campaign.title} <ArrowUpRight className="inline size-3.5" />
                    </Link>
                    <p className="mt-1 text-xs text-ink-muted">{item.anonymous ? "Contribution anonyme" : "Nom visible"} · {statusLabels[item.status]}</p>
                  </div>
                  <span className="font-heading font-bold text-ink">{formatFcfa(item.amount)}</span>
                </div>
                {item.status === "CONFIRMEE" && (
                  active ? (
                    <p className="text-xs font-semibold text-ink-secondary">Litige : {active.status_display}</p>
                  ) : openingId === item.public_reference ? (
                    <DisputeForm
                      onSubmit={(reason, details) => openDispute(item.public_reference, reason, details)}
                      onCancel={() => setOpeningId(null)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setOpeningId(item.public_reference)}
                      className="w-fit text-xs font-semibold text-red-700 hover:underline"
                    >
                      Ouvrir un litige
                    </button>
                  )
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
