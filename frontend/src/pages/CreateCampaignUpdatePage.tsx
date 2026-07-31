import { useEffect, useState } from "react"
import type { FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Newspaper } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth"
import type { CampaignDetail } from "@/lib/types"

export default function CreateCampaignUpdatePage() {
  const { t } = useTranslation("createCampaign")
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { authFetch } = useAuth()
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    authFetch(`/campaigns/${slug}/`)
      .then((data) => setCampaign(data as CampaignDetail))
      .catch(() => setError(t("update.notFound")))
  }, [authFetch, slug])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (title.trim().length < 5 || content.trim().length < 20) {
      setError(t("update.validationError"))
      return
    }
    setSubmitting(true)
    const formData = new FormData()
    formData.append("title", title.trim())
    formData.append("content", content.trim())
    try {
      await authFetch(`/campaigns/${slug}/updates/`, { method: "POST", body: formData })
      navigate(`/campagnes/${slug}`)
    } catch {
      setError(t("update.publishError"))
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-14 sm:px-6 sm:py-20">
      <Link to="/compte" className="inline-flex items-center gap-2 text-sm font-medium text-ink-secondary hover:text-ink"><ArrowLeft className="size-4" />{t("update.backToAccount")}</Link>
      <div className="mt-7 rounded-[24px] border border-black/5 bg-surface p-7 shadow-sm sm:p-10">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-gold/15 text-gold-dark"><Newspaper className="size-5" /></span>
        <p className="mt-5 text-xs font-semibold tracking-[3px] text-gold-dark uppercase">{t("update.eyebrow")}</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-ink">{t("update.title")}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-secondary">{campaign ? t("update.introWithCampaign", { title: campaign.title }) : t("update.loading")}</p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <div className="space-y-2"><Label htmlFor="update-title">{t("update.titleLabel")}</Label><Input id="update-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder={t("update.titlePlaceholder")} className="h-12 rounded-xl" /></div>
          <div className="space-y-2"><Label htmlFor="update-content">{t("update.messageLabel")}</Label><textarea id="update-content" value={content} onChange={(event) => setContent(event.target.value)} rows={8} placeholder={t("update.messagePlaceholder")} className="w-full rounded-xl border border-black/10 bg-transparent px-4 py-3 text-sm leading-relaxed outline-none focus:border-gold-dark focus:ring-2 focus:ring-gold/20" /></div>
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <Button type="submit" disabled={submitting || !campaign} className="h-12 rounded-full bg-gold px-7 font-semibold text-ink hover:bg-gold-light">{submitting ? t("update.publishing") : t("update.publish")}</Button>
        </form>
      </div>
    </section>
  )
}
