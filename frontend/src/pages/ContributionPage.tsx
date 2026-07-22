import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, CheckCircle2, ShieldCheck, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError, apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { formatFcfa } from "@/lib/format"
import type { CampaignDetail, Contribution } from "@/lib/types"

const suggestedAmounts = [5_000, 10_000, 25_000, 50_000]

function apiMessage(error: unknown): string {
  if (error instanceof ApiError && error.details) {
    const first = Object.values(error.details).flat()[0]
    if (first) return String(first)
  }
  return "L’opération a échoué. Vérifiez les informations puis réessayez."
}

export default function ContributionPage() {
  const { slug } = useParams<{ slug: string }>()
  const { user, authFetch } = useAuth()
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [amount, setAmount] = useState(10_000)
  const [anonymous, setAnonymous] = useState(false)
  const [contribution, setContribution] = useState<Contribution | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch(`/campaigns/${slug}/`)
      .then((data) => setCampaign(data as CampaignDetail))
      .catch(() => setError("Cette campagne est introuvable ou indisponible."))
      .finally(() => setLoading(false))
  }, [slug])

  const initiate = async () => {
    setError(null)
    if (amount < 1_000 || amount > 5_000_000) {
      setError("Le montant doit être compris entre 1 000 et 5 000 000 FCFA.")
      return
    }
    setSubmitting(true)
    try {
      const data = await authFetch("/contributions/", {
        method: "POST",
        body: JSON.stringify({ campaign_slug: slug, amount, anonymous }),
      })
      setContribution(data as Contribution)
    } catch (err) {
      setError(apiMessage(err))
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
      setError(apiMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="mx-auto max-w-2xl px-6 py-24 text-center text-ink-muted">Chargement…</div>

  if (!campaign) {
    return <div className="mx-auto max-w-2xl px-6 py-24 text-center"><p className="text-red-700">{error}</p><Link className="mt-6 inline-block font-semibold text-gold-dark" to="/campagnes">Retour aux campagnes</Link></div>
  }

  if (user?.kyc_status !== "VALIDE") {
    return (
      <section className="mx-auto max-w-2xl px-6 py-20">
        <TriangleAlert className="size-10 text-gold-dark" />
        <h1 className="mt-5 font-heading text-3xl font-bold text-ink">Vérification d’identité requise</h1>
        <p className="mt-3 leading-relaxed text-ink-secondary">Votre identité doit être validée avant de contribuer. Retrouvez les documents demandés et le statut de votre dossier dans votre compte.</p>
        <Button asChild className="mt-7 rounded-full bg-gold font-semibold text-ink"><Link to="/compte">Accéder à mon compte</Link></Button>
      </section>
    )
  }

  const finished = contribution && contribution.status !== "INITIEE"

  return (
    <section className="mx-auto max-w-2xl px-6 py-12 sm:py-20">
      <Link to={`/campagnes/${campaign.slug}`} className="inline-flex items-center gap-2 text-sm font-medium text-ink-secondary hover:text-ink"><ArrowLeft className="size-4" />Retour à la campagne</Link>
      <div className="mt-7 rounded-[24px] border border-black/5 bg-surface p-7 shadow-sm sm:p-10">
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gold/15 text-gold-dark"><ShieldCheck className="size-5" /></span>
          <div>
            <p className="text-xs font-semibold tracking-[3px] text-gold-dark uppercase">Paiement simulé</p>
            <h1 className="mt-2 font-heading text-2xl font-bold text-ink sm:text-3xl">Contribuer à {campaign.title}</h1>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm leading-relaxed text-ink-secondary">
          Démonstration uniquement : aucun compte ni moyen de paiement ne sera débité.
        </div>

        {!contribution ? (
          <div className="mt-8">
            <Label htmlFor="amount">Montant en FCFA</Label>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {suggestedAmounts.map((value) => (
                <button key={value} type="button" onClick={() => setAmount(value)} className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${amount === value ? "border-gold-dark bg-gold/15 text-ink" : "border-black/10 text-ink-secondary hover:border-gold"}`}>{formatFcfa(value)}</button>
              ))}
            </div>
            <Input id="amount" type="number" min={1000} max={5000000} step={500} value={amount} onChange={(event) => setAmount(Number(event.target.value))} className="mt-3 h-12 rounded-xl" />
            <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-ink-secondary">
              <input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} className="mt-0.5 size-4 accent-[#d4a900]" />
              Masquer mon nom dans la liste publique des contributeurs
            </label>
            <Button onClick={() => void initiate()} disabled={submitting} className="mt-7 h-12 w-full rounded-full bg-gold font-semibold text-ink hover:bg-gold-light">{submitting ? "Préparation…" : "Continuer vers la simulation"}</Button>
          </div>
        ) : finished ? (
          <div className="mt-9 text-center">
            {contribution.status === "CONFIRMEE" ? <CheckCircle2 className="mx-auto size-12 text-emerald-600" /> : <TriangleAlert className="mx-auto size-12 text-red-600" />}
            <h2 className="mt-4 font-heading text-2xl font-bold text-ink">{contribution.status === "CONFIRMEE" ? "Contribution confirmée" : "Paiement simulé échoué"}</h2>
            <p className="mt-2 text-ink-secondary">{formatFcfa(contribution.amount)} · référence {contribution.public_reference.slice(0, 8)}</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3"><Button asChild className="rounded-full bg-gold text-ink"><Link to={`/campagnes/${campaign.slug}`}>Voir la campagne</Link></Button><Button asChild variant="outline" className="rounded-full"><Link to="/compte">Voir mon historique</Link></Button></div>
          </div>
        ) : (
          <div className="mt-8">
            <h2 className="font-heading text-xl font-bold text-ink">Confirmer la simulation</h2>
            <dl className="mt-5 space-y-3 rounded-2xl bg-surface-alt p-5 text-sm"><div className="flex justify-between gap-4"><dt className="text-ink-muted">Montant</dt><dd className="font-bold text-ink">{formatFcfa(contribution.amount)}</dd></div><div className="flex justify-between gap-4"><dt className="text-ink-muted">Affichage</dt><dd className="font-medium text-ink">{contribution.anonymous ? "Anonyme" : "Nom visible"}</dd></div><div className="flex justify-between gap-4"><dt className="text-ink-muted">Fournisseur</dt><dd className="font-medium text-ink">Paiement simulé</dd></div></dl>
            <p className="mt-5 text-sm leading-relaxed text-ink-secondary">Choisissez le résultat à tester. En production, cette décision viendra du prestataire de paiement après vérification de la transaction.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2"><Button onClick={() => void confirm("SUCCESS")} disabled={submitting} className="h-12 rounded-full bg-emerald-600 font-semibold text-white hover:bg-emerald-700">Simuler une réussite</Button><Button onClick={() => void confirm("FAILURE")} disabled={submitting} variant="outline" className="h-12 rounded-full border-red-200 text-red-700 hover:bg-red-50">Simuler un échec</Button></div>
          </div>
        )}
        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      </div>
    </section>
  )
}
