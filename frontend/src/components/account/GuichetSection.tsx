import { useEffect, useState } from "react"
import { CheckCircle2, ExternalLink, Landmark, Mail, XCircle } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { formatFcfa } from "@/lib/format"
import type { EligibleFinancingScheme, SchemeReferral } from "@/lib/types"

const referralStatusStyles: Record<string, string> = {
  INTERET: "bg-gold/15 text-gold-dark",
  EN_COURS: "bg-blue-100 text-blue-700",
  ACCEPTE: "bg-emerald-100 text-emerald-700",
  REFUSE: "bg-red-100 text-red-700",
  ABANDONNE: "bg-black/[0.06] text-ink-secondary",
}

function SchemeCard({
  scheme,
  referral,
  onExpressInterest,
  busy,
}: {
  scheme: EligibleFinancingScheme
  referral: SchemeReferral | undefined
  onExpressInterest: (schemeId: number) => void
  busy: boolean
}) {
  const { t } = useTranslation("account")
  return (
    <li
      className={`rounded-[18px] border p-5 shadow-sm ${
        scheme.eligible ? "border-black/5 bg-surface" : "border-black/5 bg-surface-alt opacity-90"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-gold-dark uppercase">
            {scheme.provider_type_display}
          </p>
          <p className="mt-1 font-heading text-lg font-bold text-ink">{scheme.name}</p>
          <p className="mt-0.5 text-sm text-ink-muted">{scheme.provider_name}</p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            scheme.eligible ? "bg-emerald-100 text-emerald-700" : "bg-black/[0.06] text-ink-secondary"
          }`}
        >
          {scheme.eligible ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
          {scheme.eligible ? t("guichet.eligible") : t("guichet.notEligible")}
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-ink-secondary">{scheme.description}</p>

      {!scheme.eligible && scheme.ineligibility_reasons.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-xl bg-black/[0.03] p-3 text-xs text-ink-muted">
          {scheme.ineligibility_reasons.map((reason) => (
            <li key={reason}>· {reason}</li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
        <span>{t("guichet.minScore", { score: scheme.min_score })}</span>
        {(scheme.min_goal_amount || scheme.max_goal_amount) && (
          <span>
            {t("guichet.goalRange", {
              min: scheme.min_goal_amount ? formatFcfa(scheme.min_goal_amount) : "—",
              max: scheme.max_goal_amount ? formatFcfa(scheme.max_goal_amount) : "—",
            })}
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {scheme.website_url && (
          <a
            href={scheme.website_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold-dark hover:underline"
          >
            <ExternalLink className="size-3.5" />
            {t("guichet.websiteLink")}
          </a>
        )}
        {scheme.contact_email && (
          <a
            href={`mailto:${scheme.contact_email}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary hover:underline"
          >
            <Mail className="size-3.5" />
            {scheme.contact_email}
          </a>
        )}
      </div>

      {scheme.eligible && (
        <div className="mt-4">
          {referral ? (
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                referralStatusStyles[referral.status] ?? "bg-black/[0.06] text-ink-secondary"
              }`}
            >
              {t("guichet.referralPrefix", { status: referral.status_display })}
            </span>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => onExpressInterest(scheme.id)}
              className="rounded-full bg-gold px-4 text-xs font-semibold text-ink hover:bg-gold-light"
            >
              {t("guichet.expressInterest")}
            </Button>
          )}
        </div>
      )}
    </li>
  )
}

export function GuichetSection() {
  const { t } = useTranslation("account")
  const { authFetch } = useAuth()
  const [schemes, setSchemes] = useState<EligibleFinancingScheme[] | null>(null)
  const [referrals, setReferrals] = useState<SchemeReferral[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busySchemeId, setBusySchemeId] = useState<number | null>(null)

  const loadReferrals = () =>
    authFetch("/guichet/mes-orientations/")
      .then((result) => setReferrals(result as SchemeReferral[]))
      .catch(() => setReferrals([]))

  useEffect(() => {
    authFetch("/guichet/dispositifs/")
      .then((result) => setSchemes(result as EligibleFinancingScheme[]))
      .catch(() => setSchemes([]))
      .finally(() => setLoading(false))
    void loadReferrals()
    // authFetch ne change que lorsque la session change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authFetch])

  const expressInterest = async (schemeId: number) => {
    setBusySchemeId(schemeId)
    setError(null)
    try {
      await authFetch(`/guichet/dispositifs/${schemeId}/interet/`, { method: "POST" })
      await loadReferrals()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? t("guichet.eligibilityLostError")
          : t("guichet.genericError"),
      )
    } finally {
      setBusySchemeId(null)
    }
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-[20px] bg-black/[0.05]" />
  }

  const referralBySchemeId = new Map(referrals.map((referral) => [referral.scheme.id, referral]))

  return (
    <div className="rounded-[20px] border border-black/5 bg-surface p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold-dark">
          <Landmark className="size-5" />
        </span>
        <div>
          <p className="font-heading text-lg font-bold text-ink">{t("guichet.title")}</p>
          <p className="text-sm text-ink-muted">
            {t("guichet.subtitle")}
          </p>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      {!schemes || schemes.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">
          {t("guichet.empty")}
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {schemes.map((scheme) => (
            <SchemeCard
              key={scheme.id}
              scheme={scheme}
              referral={referralBySchemeId.get(scheme.id)}
              onExpressInterest={(id) => void expressInterest(id)}
              busy={busySchemeId === scheme.id}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
