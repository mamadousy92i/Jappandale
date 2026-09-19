import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { BriefcaseBusiness, FileText, Handshake, LoaderCircle, Plus, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth"
import { formatFcfa } from "@/lib/format"
import type { CampaignCategory, CampaignListItem, FinancingScheme, PartnerProjectInterest, ProjectDocument } from "@/lib/types"

const categories: { value: CampaignCategory | ""; label: string }[] = [
  { value: "", label: "Tous les secteurs" },
  { value: "ARTISANAT", label: "Artisanat" },
  { value: "COMMERCE", label: "Commerce" },
  { value: "AGRICULTURE", label: "Agriculture" },
  { value: "EDUCATION", label: "Éducation" },
  { value: "SANTE", label: "Santé" },
  { value: "TECHNOLOGIE", label: "Technologie" },
  { value: "CULTURE", label: "Culture" },
  { value: "AUTRE", label: "Autre" },
]

type DashboardData = {
  campaigns: CampaignListItem[]
  interests: PartnerProjectInterest[]
  schemes: FinancingScheme[]
}

function providerTypeFor(partnerType: string): FinancingScheme["provider_type"] {
  if (partnerType === "BANQUE") return "BANQUE"
  if (partnerType === "INSTITUTION_PUBLIQUE") return "FONDS_PUBLIC"
  if (partnerType === "INCUBATEUR") return "PROGRAMME_APPUI"
  return "BAILLEUR"
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
}

export default function PartnerDashboardPage() {
  const { user, authFetch } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<CampaignCategory | "">("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busySlug, setBusySlug] = useState<string | null>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignListItem | null>(null)
  const [documents, setDocuments] = useState<ProjectDocument[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [offerOpen, setOfferOpen] = useState(false)
  const [offerName, setOfferName] = useState("")
  const [offerDescription, setOfferDescription] = useState("")
  const [offerBusy, setOfferBusy] = useState(false)

  const load = async (nextSearch = search, nextCategory = category) => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (nextSearch.trim()) params.set("search", nextSearch.trim())
    if (nextCategory) params.set("category", nextCategory)
    try {
      setData((await authFetch(`/partenaires/tableau-de-bord/?${params}`)) as DashboardData)
    } catch {
      setError("Impossible de charger l’espace partenaire pour le moment.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load("", "")
    // Le tableau initial est chargé une seule fois ; les filtres sont appliqués par le bouton Rechercher.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const markInterest = async (campaign: CampaignListItem) => {
    setBusySlug(campaign.slug)
    try {
      await authFetch("/partenaires/interets/", {
        method: "POST",
        body: JSON.stringify({ campaign_slug: campaign.slug }),
      })
      await load()
    } catch {
      setError("Impossible d’enregistrer votre intérêt pour ce projet.")
    } finally {
      setBusySlug(null)
    }
  }

  const showDocuments = async (campaign: CampaignListItem) => {
    setSelectedCampaign(campaign)
    setDocumentsLoading(true)
    try {
      setDocuments((await authFetch(`/partenaires/documents/?campaign=${campaign.slug}`)) as ProjectDocument[])
    } catch {
      setDocuments([])
      setError("Les documents de ce projet ne sont pas disponibles.")
    } finally {
      setDocumentsLoading(false)
    }
  }

  const createOffer = async () => {
    if (!offerName.trim() || !offerDescription.trim() || !user) return
    setOfferBusy(true)
    try {
      await authFetch("/partenaires/offres/", {
        method: "POST",
        body: JSON.stringify({
          name: offerName,
          provider_name: user.organization_name || `${user.first_name} ${user.last_name}`.trim(),
          provider_type: providerTypeFor(user.partner_type),
          description: offerDescription,
          min_score: 0,
          requires_kyc_valide: true,
          diaspora_requirement: "INDIFFERENT",
          eligible_categories: [],
          eligible_regions: [],
        }),
      })
      setOfferName("")
      setOfferDescription("")
      setOfferOpen(false)
      await load()
    } catch {
      setError("Impossible d’enregistrer cette offre.")
    } finally {
      setOfferBusy(false)
    }
  }

  const interestedCampaignIds = new Set(data?.interests.map((interest) => interest.campaign.id) ?? [])

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">Espace partenaire</p>
          <h1 className="mt-3 font-heading text-3xl font-bold text-ink sm:text-4xl">Projets et opportunités</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-secondary">Consultez les projets publiés, accédez aux documents partagés et présentez vos dispositifs de financement.</p>
        </div>
        <Button type="button" onClick={() => setOfferOpen((open) => !open)} className="rounded-full bg-gold text-ink hover:bg-gold-light">
          <Plus className="size-4" /> Nouvelle offre
        </Button>
      </div>

      {error && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {offerOpen && (
        <section className="mt-7 rounded-[20px] border border-black/5 bg-surface p-6 shadow-sm" aria-labelledby="new-offer-title">
          <h2 id="new-offer-title" className="font-heading text-xl font-bold text-ink">Nouvelle offre de financement</h2>
          <p className="mt-1 text-sm text-ink-muted">Votre offre restera en brouillon jusqu’à sa validation par l’équipe Jappandale.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium text-ink">
              <span>Nom de l’offre</span>
              <Input value={offerName} onChange={(event) => setOfferName(event.target.value)} className="h-11 rounded-xl" />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-ink sm:col-span-2">
              <span>Description et conditions principales</span>
              <textarea value={offerDescription} onChange={(event) => setOfferDescription(event.target.value)} rows={4} maxLength={3000} className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-gold/20" />
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOfferOpen(false)} className="rounded-full">Annuler</Button>
            <Button type="button" disabled={offerBusy || !offerName.trim() || !offerDescription.trim()} onClick={() => void createOffer()} className="rounded-full bg-gold text-ink hover:bg-gold-light">
              {offerBusy ? "Enregistrement…" : "Enregistrer l’offre"}
            </Button>
          </div>
        </section>
      )}

      <section className="mt-8 rounded-[20px] border border-black/5 bg-surface p-5 shadow-sm" aria-label="Filtres des projets">
        <div className="grid gap-3 md:grid-cols-[1fr_13rem_auto]">
          <div className="relative">
            <Search aria-hidden="true" className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un projet" className="h-11 rounded-xl pl-10" />
          </div>
          <select value={category} onChange={(event) => setCategory(event.target.value as CampaignCategory | "")} className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm text-ink">
            {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <Button type="button" onClick={() => void load()} className="h-11 rounded-xl bg-ink px-5 text-white hover:bg-ink/90">Rechercher</Button>
        </div>
      </section>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_20rem]">
        <section aria-labelledby="projects-title">
          <div className="flex items-center gap-2">
            <BriefcaseBusiness className="size-5 text-gold-dark" />
            <h2 id="projects-title" className="font-heading text-2xl font-bold text-ink">Projets publiés</h2>
          </div>
          {loading ? <div className="mt-5 h-64 animate-pulse rounded-[20px] bg-black/[0.05]" /> : data?.campaigns.length === 0 ? <p className="mt-5 rounded-[20px] border border-dashed border-black/10 p-8 text-sm text-ink-muted">Aucun projet ne correspond à cette recherche.</p> : <div className="mt-5 grid gap-4 md:grid-cols-2">{data?.campaigns.map((campaign) => (
            <article key={campaign.id} className="rounded-[20px] border border-black/5 bg-surface p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-xs font-semibold text-gold-dark">{campaign.category_display}</p><h3 className="mt-1 font-heading text-lg font-bold text-ink">{campaign.title}</h3></div>
                <span className="shrink-0 rounded-full bg-gold/15 px-2.5 py-1 text-xs font-semibold text-gold-dark">{campaign.progress_percent}%</span>
              </div>
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-secondary">{campaign.summary}</p>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted"><span>{campaign.location || "Localisation non précisée"}</span><span>{formatFcfa(campaign.goal_amount)}</span><span>Jusqu’au {formatDate(campaign.deadline)}</span></div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline" className="rounded-full"><Link to={`/campagnes/${campaign.slug}`}>Voir le projet</Link></Button>
                <Button type="button" size="sm" variant="outline" onClick={() => void showDocuments(campaign)} className="rounded-full"><FileText className="size-3.5" />Documents</Button>
                <Button type="button" size="sm" disabled={busySlug === campaign.slug || interestedCampaignIds.has(campaign.id)} onClick={() => void markInterest(campaign)} className="rounded-full bg-gold text-ink hover:bg-gold-light"><Handshake className="size-3.5" />{interestedCampaignIds.has(campaign.id) ? "Intérêt enregistré" : busySlug === campaign.slug ? "Envoi…" : "Je suis intéressé"}</Button>
              </div>
            </article>
          ))}</div>}
        </section>

        <aside className="space-y-6">
          <section className="rounded-[20px] border border-black/5 bg-surface p-5 shadow-sm" aria-labelledby="interests-title">
            <h2 id="interests-title" className="font-heading text-lg font-bold text-ink">Mes intérêts</h2>
            <div className="mt-4 space-y-3">{data?.interests.length ? data.interests.map((interest) => <div key={interest.id} className="rounded-xl bg-surface-alt p-3"><p className="text-sm font-semibold text-ink">{interest.campaign.title}</p><p className="mt-1 text-xs text-ink-muted">{interest.status_display}</p></div>) : <p className="text-sm text-ink-muted">Aucun projet suivi pour le moment.</p>}</div>
          </section>
          <section className="rounded-[20px] border border-black/5 bg-surface p-5 shadow-sm" aria-labelledby="offers-title">
            <h2 id="offers-title" className="font-heading text-lg font-bold text-ink">Mes offres</h2>
            <div className="mt-4 space-y-3">{data?.schemes.length ? data.schemes.map((scheme) => <div key={scheme.id} className="rounded-xl bg-surface-alt p-3"><p className="text-sm font-semibold text-ink">{scheme.name}</p><p className="mt-1 text-xs text-ink-muted">{scheme.status === "PUBLIE" ? "Publiée" : "En attente de validation"}</p></div>) : <p className="text-sm text-ink-muted">Aucune offre créée.</p>}</div>
          </section>
        </aside>
      </div>

      {selectedCampaign && <section className="mt-8 rounded-[20px] border border-black/5 bg-surface p-6 shadow-sm" aria-labelledby="documents-title"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold tracking-[3px] text-gold-dark uppercase">Bibliothèque du projet</p><h2 id="documents-title" className="mt-2 font-heading text-xl font-bold text-ink">{selectedCampaign.title}</h2></div><Button type="button" variant="ghost" onClick={() => setSelectedCampaign(null)} className="rounded-full">Fermer</Button></div>{documentsLoading ? <LoaderCircle className="mt-5 size-5 animate-spin text-gold-dark" /> : documents.length ? <ul className="mt-5 divide-y divide-black/5">{documents.map((document) => <li key={document.id} className="flex items-center justify-between gap-4 py-3"><div><p className="text-sm font-semibold text-ink">{document.title}</p><p className="text-xs text-ink-muted">{document.document_type_display}</p></div><a href={document.file_url} className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold text-ink hover:border-gold">Télécharger</a></li>)}</ul> : <p className="mt-5 text-sm text-ink-muted">Aucun document n’a été partagé pour ce projet.</p>}</section>}
    </section>
  )
}
