import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, CheckCircle2, Gift, ShieldCheck, TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError, apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { formatFcfa } from "@/lib/format"
import type { CampaignDetail, Contribution } from "@/lib/types"

const suggestedAmounts = [5_000, 10_000, 25_000, 50_000]

function apiMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.details) {
    const first = Object.values(error.details).flat()[0]
    if (first) return String(first)
  }
  return fallback
}

export default function ContributionPage() {
  const { t } = useTranslation("activity")
  const { slug } = useParams<{ slug: string }>()
  const { user, authFetch } = useAuth()
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [amount, setAmount] = useState(10_000)
  const [selectedRewardId, setSelectedRewardId] = useState<number | null>(null)
  const [anonymous, setAnonymous] = useState(false)
  const [contribution, setContribution] = useState<Contribution | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch(`/campaigns/${slug}/`)
      .then((data) => setCampaign(data as CampaignDetail))
      .catch(() => setError(t("contribution.notFound")))
      .finally(() => setLoading(false))
  }, [slug])

  const selectedReward =
    campaign?.rewards.find((reward) => reward.id === selectedRewardId) ?? null

  const selectReward = (rewardId: number | null) => {
    setSelectedRewardId(rewardId)
    const reward = campaign?.rewards.find((item) => item.id === rewardId)
    if (reward && amount < reward.minimum_amount) {
      setAmount(reward.minimum_amount)
    }
  }

  const initiate = async () => {
    setError(null)
    if (amount < 1_000 || amount > 5_000_000) {
      setError(t("contribution.amountRange"))
      return
    }
    if (selectedReward && amount < selectedReward.minimum_amount) {
      setError(
        t("contribution.rewardMinimum", { amount: formatFcfa(selectedReward.minimum_amount) }),
      )
      return
    }
    setSubmitting(true)
    try {
      const data = await authFetch("/contributions/", {
        method: "POST",
        body: JSON.stringify({
          campaign_slug: slug,
          amount,
          anonymous,
          reward_id: selectedRewardId,
        }),
      })
      setContribution(data as Contribution)
    } catch (err) {
      setError(apiMessage(err, t("contribution.genericError")))
    } finally {
      setSubmitting(false)
    }
  }

  const confirm = async (outcome: "SUCCESS" | "FAILURE") => {
    if (!contribution) return
    setSubmitting(true)
    setError(null)
    try {
      const data = await authFetch(`/contributions/${contribution.public_reference}/confirm/`, {
        method: "POST",
        body: JSON.stringify({ outcome }),
      })
      setContribution(data as Contribution)
    } catch (err) {
      setError(apiMessage(err, t("contribution.genericError")))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="mx-auto max-w-2xl px-4 py-24 text-center text-ink-muted sm:px-6">{t("contribution.loading")}</div>

  if (!campaign) {
    return <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6"><p className="text-red-700">{error}</p><Link className="mt-6 inline-block font-semibold text-gold-dark" to="/campagnes">{t("contribution.backToCampaigns")}</Link></div>
  }

  if (user?.kyc_status !== "VALIDE") {
    return (
      <section className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <TriangleAlert className="size-10 text-gold-dark" />
        <h1 className="mt-5 font-heading text-3xl font-bold text-ink">{t("contribution.kycRequired.title")}</h1>
        <p className="mt-3 leading-relaxed text-ink-secondary">{t("contribution.kycRequired.text")}</p>
        <Button asChild className="mt-7 rounded-full bg-gold font-semibold text-ink"><Link to="/compte?onglet=kyc">{t("contribution.kycRequired.cta")}</Link></Button>
      </section>
    )
  }

  const finished = contribution && contribution.status !== "INITIEE"

  return (
    <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-20">
      <Link to={`/campagnes/${campaign.slug}`} className="inline-flex items-center gap-2 text-sm font-medium text-ink-secondary hover:text-ink"><ArrowLeft className="size-4" />{t("contribution.backToCampaign")}</Link>
      <div className="mt-7 rounded-[24px] border border-black/5 bg-surface p-5 shadow-sm sm:p-10">
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gold/15 text-gold-dark"><ShieldCheck className="size-5" /></span>
          <div>
            <p className="text-xs font-semibold tracking-[3px] text-gold-dark uppercase">{t("contribution.eyebrow")}</p>
            <h1 className="mt-2 font-heading text-2xl font-bold text-ink sm:text-3xl">{t("contribution.title", { campaign: campaign.title })}</h1>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm leading-relaxed text-ink-secondary">
          {t("contribution.verifyNote")}
        </div>

        {!contribution ? (
          <div className="mt-8">
            {campaign.campaign_type === "DON_CONTREPARTIE" && campaign.rewards.length > 0 && (
              <div className="mb-7">
                <Label>{t("contribution.reward.label")}</Label>
                <div className="mt-3 grid gap-3">
                  <label
                    className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
                      selectedRewardId === null
                        ? "border-gold bg-gold/8"
                        : "border-black/10 hover:border-gold/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="reward"
                      checked={selectedRewardId === null}
                      onChange={() => selectReward(null)}
                      className="sr-only"
                    />
                    <span className="text-sm font-semibold text-ink">
                      {t("contribution.reward.none")}
                    </span>
                  </label>
                  {campaign.rewards.map((reward) => (
                    <label
                      key={reward.id}
                      className={`rounded-2xl border p-4 transition-all duration-200 ${
                        reward.sold_out
                          ? "cursor-not-allowed border-black/5 bg-surface-alt opacity-60"
                          : selectedRewardId === reward.id
                            ? "cursor-pointer border-gold bg-gold/8"
                            : "cursor-pointer border-black/10 hover:border-gold/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="reward"
                        disabled={reward.sold_out}
                        checked={selectedRewardId === reward.id}
                        onChange={() => selectReward(reward.id)}
                        className="sr-only"
                      />
                      <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                        <Gift aria-hidden="true" className="size-4 text-gold-dark" />
                        {reward.title}
                        {reward.sold_out && (
                          <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-xs font-semibold text-ink-secondary">
                            {t("contribution.reward.soldOut")}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-xs text-ink-secondary">
                        {t("contribution.reward.from", { amount: formatFcfa(reward.minimum_amount) })}
                        {reward.quantity_limit !== null &&
                          t("contribution.reward.remaining", { count: reward.remaining })}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Label htmlFor="amount">{t("contribution.amountLabel")}</Label>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {suggestedAmounts.map((value) => (
                <button key={value} type="button" onClick={() => setAmount(value)} className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${amount === value ? "border-gold-dark bg-gold/15 text-ink" : "border-black/10 text-ink-secondary hover:border-gold"}`}>{formatFcfa(value)}</button>
              ))}
            </div>
            <Input id="amount" type="number" min={1000} max={5000000} step={500} value={amount} onChange={(event) => setAmount(Number(event.target.value))} className="mt-3 h-12 rounded-xl" />
            <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-ink-secondary">
              <input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} className="mt-0.5 size-4 accent-[#d4a900]" />
              {t("contribution.hideNameLabel")}
            </label>
            <Button onClick={() => void initiate()} disabled={submitting} className="mt-7 h-12 w-full rounded-full bg-gold font-semibold text-ink hover:bg-gold-light">{submitting ? t("contribution.preparing") : t("contribution.continue")}</Button>
          </div>
        ) : finished ? (
          <div className="mt-9 text-center">
            {contribution.status === "CONFIRMEE" ? <CheckCircle2 className="mx-auto size-12 text-emerald-600" /> : <TriangleAlert className="mx-auto size-12 text-red-600" />}
            <h2 className="mt-4 font-heading text-2xl font-bold text-ink">{contribution.status === "CONFIRMEE" ? t("contribution.confirmed") : t("contribution.notConfirmed")}</h2>
            <p className="mt-2 text-ink-secondary">{formatFcfa(contribution.amount)}{contribution.reward && ` · ${contribution.reward.title}`} · {t("contribution.reference", { ref: contribution.public_reference.slice(0, 8) })}</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3"><Button asChild className="rounded-full bg-gold text-ink"><Link to={`/campagnes/${campaign.slug}`}>{t("contribution.seeCampaign")}</Link></Button><Button asChild variant="outline" className="rounded-full"><Link to="/compte?onglet=contributions">{t("contribution.seeHistory")}</Link></Button></div>
          </div>
        ) : (
          <div className="mt-8">
            <h2 className="font-heading text-xl font-bold text-ink">{t("contribution.reviewTitle")}</h2>
            <dl className="mt-5 space-y-3 rounded-2xl bg-surface-alt p-5 text-sm"><div className="flex justify-between gap-4"><dt className="text-ink-muted">{t("contribution.amount")}</dt><dd className="font-bold text-ink">{formatFcfa(contribution.amount)}</dd></div>{contribution.reward && <div className="flex justify-between gap-4"><dt className="text-ink-muted">{t("contribution.reward.label")}</dt><dd className="font-medium text-ink">{contribution.reward.title}</dd></div>}<div className="flex justify-between gap-4"><dt className="text-ink-muted">{t("contribution.display")}</dt><dd className="font-medium text-ink">{contribution.anonymous ? t("contribution.anonymous") : t("contribution.nameVisible")}</dd></div><div className="flex justify-between gap-4"><dt className="text-ink-muted">{t("contribution.status")}</dt><dd className="font-medium text-ink">{t("contribution.pending")}</dd></div></dl>
            <p className="mt-5 text-sm leading-relaxed text-ink-secondary">{t("contribution.confirmHint")}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2"><Button onClick={() => void confirm("SUCCESS")} disabled={submitting} className="h-12 rounded-full bg-emerald-600 font-semibold text-white hover:bg-emerald-700">{t("contribution.confirmSubmit")}</Button><Button onClick={() => void confirm("FAILURE")} disabled={submitting} variant="outline" className="h-12 rounded-full border-red-200 text-red-700 hover:bg-red-50">{t("contribution.cancel")}</Button></div>
          </div>
        )}
        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      </div>
    </section>
  )
}
