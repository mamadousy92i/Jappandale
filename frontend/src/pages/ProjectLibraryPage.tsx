import { useEffect, useState } from "react"
import { FileText, LoaderCircle, Trash2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth"
import type { CampaignListItem, ProjectDocument } from "@/lib/types"

const documentTypes = [
  ["BUSINESS_PLAN", "Business plan"],
  ["PITCH_DECK", "Pitch deck"],
  ["BUDGET", "Budget / prévisions"],
  ["JUSTIFICATIF", "Justificatif"],
  ["AUTRE", "Autre document"],
] as const

export default function ProjectLibraryPage() {
  const { user, authFetch } = useAuth()
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([])
  const [campaignSlug, setCampaignSlug] = useState("")
  const [documents, setDocuments] = useState<ProjectDocument[]>([])
  const [title, setTitle] = useState("")
  const [documentType, setDocumentType] = useState<(typeof documentTypes)[number][0]>("BUSINESS_PLAN")
  const [file, setFile] = useState<File | null>(null)
  const [shared, setShared] = useState(true)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isOwner = user?.role === "PORTEUR"
  const isAdmin = user?.role === "ADMIN"

  const loadDocuments = async (slug: string) => {
    const suffix = slug ? `?campaign=${slug}` : ""
    setDocuments((await authFetch(`/partenaires/documents/${suffix}`)) as ProjectDocument[])
  }

  useEffect(() => {
    if (isAdmin) {
      void loadDocuments("").catch(() => setError("Impossible de charger les documents."))
      setLoading(false)
      return
    }
    if (!isOwner) return
    void authFetch("/campaigns/mine/")
      .then((data) => {
        const nextCampaigns = data as CampaignListItem[]
        setCampaigns(nextCampaigns)
        if (nextCampaigns[0]) setCampaignSlug(nextCampaigns[0].slug)
      })
      .catch(() => setError("Impossible de charger vos projets."))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isOwner])

  useEffect(() => {
    if (!campaignSlug || isAdmin) return
    void loadDocuments(campaignSlug).catch(() => setError("Impossible de charger les documents."))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignSlug, isAdmin])

  if (!isOwner && !isAdmin) return <section className="mx-auto max-w-xl px-4 py-24 text-center text-ink-secondary">Cet espace est réservé aux porteurs de projet et à l’administration.</section>

  const upload = async () => {
    if (!file || !title.trim() || !campaignSlug) return
    setBusy(true)
    setError(null)
    const payload = new FormData()
    payload.append("campaign_slug", campaignSlug)
    payload.append("title", title)
    payload.append("document_type", documentType)
    payload.append("shared_with_partners", String(shared))
    payload.append("file", file)
    try {
      await authFetch("/partenaires/documents/", { method: "POST", body: payload })
      setTitle("")
      setFile(null)
      await loadDocuments(campaignSlug)
    } catch {
      setError("Impossible d’ajouter ce document. Vérifiez son format et sa taille.")
    } finally {
      setBusy(false)
    }
  }

  const remove = async (document: ProjectDocument) => {
    if (!window.confirm(`Supprimer « ${document.title} » ?`)) return
    setBusy(true)
    try {
      await authFetch(`/partenaires/documents/${document.id}/`, { method: "DELETE" })
      await loadDocuments(campaignSlug)
    } catch {
      setError("Impossible de supprimer ce document.")
    } finally {
      setBusy(false)
    }
  }

  return <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16"><p className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">Bibliothèque</p><h1 className="mt-3 font-heading text-3xl font-bold text-ink">{isAdmin ? "Documents des projets" : "Documents de mes projets"}</h1><p className="mt-2 text-sm text-ink-secondary">{isAdmin ? "Consultez et gérez les documents ajoutés aux projets." : "Ajoutez les documents à partager avec les partenaires financiers. Les pièces KYC restent privées."}</p>{error && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}{loading ? <LoaderCircle className="mt-10 size-6 animate-spin text-gold-dark" /> : <>{isOwner && <section className="mt-8 rounded-[20px] border border-black/5 bg-surface p-6 shadow-sm"><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-sm font-medium text-ink sm:col-span-2"><span>Projet</span><select value={campaignSlug} onChange={(event) => setCampaignSlug(event.target.value)} className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm">{campaigns.map((campaign) => <option key={campaign.id} value={campaign.slug}>{campaign.title}</option>)}</select></label><label className="space-y-1.5 text-sm font-medium text-ink"><span>Titre du document</span><Input value={title} onChange={(event) => setTitle(event.target.value)} className="h-11 rounded-xl" /></label><label className="space-y-1.5 text-sm font-medium text-ink"><span>Catégorie</span><select value={documentType} onChange={(event) => setDocumentType(event.target.value as typeof documentType)} className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm">{documentTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="space-y-1.5 text-sm font-medium text-ink sm:col-span-2"><span>Fichier PDF, image ou document (10 Mo maximum)</span><Input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="h-11 cursor-pointer rounded-xl" /></label><label className="flex items-start gap-3 text-sm text-ink-secondary sm:col-span-2"><input type="checkbox" checked={shared} onChange={(event) => setShared(event.target.checked)} className="mt-0.5 size-4 accent-[#d4a900]" /><span><span className="font-semibold text-ink">Partager avec les partenaires financiers</span><br />Les partenaires vérifiés pourront uniquement consulter ce document depuis la fiche du projet.</span></label></div><div className="mt-5 flex justify-end"><Button type="button" disabled={busy || !file || !title.trim() || !campaignSlug} onClick={() => void upload()} className="rounded-full bg-gold text-ink hover:bg-gold-light"><Upload className="size-4" />{busy ? "Ajout…" : "Ajouter le document"}</Button></div></section>}<section className="mt-8"><h2 className="flex items-center gap-2 font-heading text-xl font-bold text-ink"><FileText className="size-5 text-gold-dark" />{isAdmin ? "Tous les documents" : "Documents du projet"}</h2>{documents.length ? <ul className="mt-4 divide-y divide-black/5 rounded-[20px] border border-black/5 bg-surface px-5">{documents.map((document) => <li key={document.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-semibold text-ink">{document.title}</p><p className="mt-1 text-xs text-ink-muted">{document.document_type_display} · {document.shared_with_partners ? "Partagé avec les partenaires" : "Privé"}</p></div><div className="flex gap-2"><a href={document.file_url} className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold text-ink hover:border-gold">Télécharger</a><Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void remove(document)} className="rounded-full border-red-200 text-red-700 hover:bg-red-50"><Trash2 className="size-3.5" />Supprimer</Button></div></li>)}</ul> : <p className="mt-4 rounded-[20px] border border-dashed border-black/10 p-7 text-sm text-ink-muted">Aucun document ajouté pour ce projet.</p>}</section></>}</section>
}
