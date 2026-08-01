import { useState } from "react"
import type { FormEvent } from "react"
import { Flag, ShieldCheck } from "lucide-react"
import { Link, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth"

const reasonKeys = ["FRAUDE", "INFORMATION_TROMPEUSE", "CONTENU_INAPPROPRIE", "USURPATION", "AUTRE"] as const

export default function ReportCampaignPage() {
  const { t } = useTranslation("reportCampaign")
  const { slug } = useParams<{ slug: string }>()
  const { authFetch } = useAuth()
  const [reason, setReason] = useState("INFORMATION_TROMPEUSE")
  const [details, setDetails] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await authFetch(`/campaigns/${slug}/report/`, {
        method: "POST",
        body: JSON.stringify({ reason, details }),
      })
      setSent(true)
    } catch {
      setError(t("submitError"))
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return <section className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6 sm:py-28"><span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><ShieldCheck className="size-7" /></span><h1 className="mt-6 font-heading text-3xl font-bold text-ink">{t("sent.title")}</h1><p className="mt-4 leading-relaxed text-ink-secondary">{t("sent.text")}</p><Button asChild className="mt-8 rounded-full bg-gold text-ink hover:bg-gold-light"><Link to={`/campagnes/${slug}`}>{t("sent.back")}</Link></Button></section>
  }

  return <section className="mx-auto max-w-xl px-4 py-16 sm:px-6 sm:py-24"><Flag className="size-7 text-gold-dark" /><p className="mt-5 text-xs font-semibold tracking-[4px] text-gold-dark uppercase">{t("eyebrow")}</p><h1 className="mt-3 font-heading text-4xl font-bold text-ink">{t("title")}</h1><p className="mt-4 leading-relaxed text-ink-secondary">{t("intro")}</p><form onSubmit={submit} className="mt-9 space-y-6 rounded-[20px] border border-black/5 bg-surface p-5 shadow-sm sm:p-7"><div className="space-y-2"><Label htmlFor="reason">{t("reasonLabel")}</Label><select id="reason" value={reason} onChange={(event) => setReason(event.target.value)} className="h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-gold-dark/30">{reasonKeys.map((key) => <option key={key} value={key}>{t(`reasons.${key}`)}</option>)}</select></div><div className="space-y-2"><Label htmlFor="details">{t("detailsLabel")}</Label><textarea id="details" required minLength={20} maxLength={1500} rows={7} value={details} onChange={(event) => setDetails(event.target.value)} placeholder={t("detailsPlaceholder")} className="w-full resize-y rounded-xl border border-input bg-transparent px-3 py-3 text-sm text-ink outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-gold-dark/30" /><p className="text-right text-xs text-ink-muted">{details.length}/1500</p></div>{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<Button type="submit" disabled={submitting || details.trim().length < 20} className="h-12 w-full rounded-full bg-gold text-ink hover:bg-gold-light">{submitting ? t("submitting") : t("submit")}</Button></form></section>
}
