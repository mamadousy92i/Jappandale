import { useEffect, useState } from "react"
import { Gauge } from "lucide-react"

import { useAuth } from "@/lib/auth"
import type { Score } from "@/lib/types"

const factorLabels: Record<string, string> = {
  base: "Score de base",
  kyc: "Identité vérifiée",
  anciennete: "Ancienneté du compte",
  activite: "Campagnes publiées",
  reussite: "Taux de réussite",
  montant_collecte: "Montant collecté",
  litiges: "Litiges",
  signalements: "Signalements",
  campagnes_rejetees: "Campagnes rejetées/suspendues",
}

export function ScoreCard() {
  const { authFetch } = useAuth()
  const [score, setScore] = useState<Score | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authFetch("/scoring/mine/")
      .then((data) => setScore(data as Score))
      .catch(() => setScore(null))
      .finally(() => setLoading(false))
  }, [authFetch])

  if (loading) {
    return <div className="h-40 animate-pulse rounded-[20px] bg-black/[0.05]" />
  }

  if (!score) return null

  return (
    <div className="rounded-[20px] border border-black/5 bg-surface p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold-dark">
          <Gauge className="size-5" />
        </span>
        <div>
          <p className="font-heading text-lg font-bold text-ink">Score Jappandale®</p>
          <p className="text-sm text-ink-muted">Indicateur de fiabilité calculé à partir de votre historique.</p>
        </div>
      </div>
      <div className="mt-5 flex items-end gap-2">
        <span className="font-heading text-4xl font-bold text-ink">{score.effective_value}</span>
        <span className="mb-1 text-sm text-ink-muted">/ 100</span>
        {score.is_manual_override && (
          <span className="mb-1.5 ml-2 rounded-full bg-gold/15 px-2.5 py-1 text-xs font-semibold text-gold-dark">
            Validé manuellement
          </span>
        )}
      </div>
      {score.is_manual_override && score.override_note && (
        <p className="mt-2 text-xs text-ink-muted">Note de l'équipe Jappandale : {score.override_note}</p>
      )}
      <ul className="mt-5 space-y-1.5 text-xs text-ink-secondary">
        {Object.entries(score.breakdown).map(([key, points]) => (
          <li key={key} className="flex items-center justify-between">
            <span>{factorLabels[key] ?? key}</span>
            <span className={points < 0 ? "font-semibold text-red-700" : "font-semibold text-ink"}>
              {points > 0 ? "+" : ""}
              {points}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
