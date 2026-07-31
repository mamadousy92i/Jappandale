import { useEffect, useState } from "react"
import { Gauge } from "lucide-react"
import { useTranslation } from "react-i18next"

import { useAuth } from "@/lib/auth"
import type { Score } from "@/lib/types"

const factorKeys = [
  "base",
  "kyc",
  "anciennete",
  "activite",
  "reussite",
  "montant_collecte",
  "litiges",
  "signalements",
  "campagnes_rejetees",
]

export function ScoreCard() {
  const { t } = useTranslation("account")
  const factorLabels: Record<string, string> = Object.fromEntries(
    factorKeys.map((key) => [key, t(`score.factors.${key}`)]),
  )
  const { authFetch } = useAuth()
  const [score, setScore] = useState<Score | null>(null)
  const [history, setHistory] = useState<Score[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([authFetch("/scoring/mine/"), authFetch("/scoring/mine/history/")])
      .then(([current, entries]) => {
        setScore(current as Score)
        setHistory(entries as Score[])
      })
      .catch(() => {
        setScore(null)
        setHistory([])
      })
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
          <p className="font-heading text-lg font-bold text-ink">{t("score.title")}</p>
          <p className="text-sm text-ink-muted">{t("score.subtitle")}</p>
        </div>
      </div>
      <div className="mt-5 flex items-end gap-2">
        <span className="font-heading text-4xl font-bold text-ink">{score.effective_value}</span>
        <span className="mb-1 text-sm text-ink-muted">/ 100</span>
        {score.is_manual_override && (
          <span className="mb-1.5 ml-2 rounded-full bg-gold/15 px-2.5 py-1 text-xs font-semibold text-gold-dark">
            {t("score.manualOverride")}
          </span>
        )}
      </div>
      {score.is_manual_override && score.override_note && (
        <p className="mt-2 text-xs text-ink-muted">{t("score.overrideNote", { note: score.override_note })}</p>
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
      {history.length > 1 && (
        <div className="mt-6 border-t border-black/5 pt-5">
          <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{t("score.recentEvolution")}</p>
          <div className="mt-3 flex h-14 items-end gap-1.5" aria-label={t("score.historyLabel")}>
            {history.slice().reverse().map((entry) => (
              <span
                key={entry.computed_at}
                title={`${entry.effective_value}/100 — ${new Date(entry.computed_at).toLocaleDateString("fr-FR")}`}
                className="min-w-2 flex-1 rounded-t bg-gold/70"
                style={{ height: `${Math.max(entry.effective_value, 6)}%` }}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-muted">{t("score.historyHint")}</p>
        </div>
      )}
    </div>
  )
}
