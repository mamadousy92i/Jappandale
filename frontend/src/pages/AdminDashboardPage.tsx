import { useCallback, useEffect, useMemo, useState } from "react"
import {
  BadgeCheck,
  Banknote,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  FolderClock,
  Headphones,
  LayoutDashboard,
  Mail,
  RefreshCw,
  Search,
  ShieldAlert,
  UserCog,
  Users,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth"
import { formatFcfa } from "@/lib/format"

type Tab = "overview" | "kyc" | "campaigns" | "reports" | "support" | "users"
type Person = { id: number; name: string; email: string; phone: string; role: string }
type MetricKey = "pending_kyc" | "pending_campaigns" | "open_reports" | "open_support"
type CampaignStatus = "EN_MODERATION" | "PUBLIEE" | "SUSPENDUE"

interface DashboardData {
  metrics: Record<MetricKey, number> & { suspended_campaigns: number; published_campaigns: number; users: number; confirmed_contributions: number; confirmed_amount: number }
  admins: Person[]
  kyc: Array<{ user: Person; submitted_at: string; assigned_to: Person | null; documents: Array<{ id: number; type_display: string; file_url: string }> }>
  campaigns: Array<{ id: number; slug: string; title: string; summary: string; category: string; location: string; goal_amount: number; owner: Person; submitted_at: string; status: CampaignStatus; status_display: string; suspension_note: string; assigned_to: Person | null; audit: Array<{ action: string; note: string; actor: string; created_at: string }> }>
  reports: Array<{ id: number; campaign: { slug: string; title: string }; reporter: Person; reason: string; details: string; status: string; admin_note: string; assigned_to: Person | null; created_at: string }>
  support: Array<{ id: number; name: string; email: string; subject: string; message: string; status: string; admin_note: string; assigned_to: Person | null; created_at: string; replies: Array<{ id: number; subject: string; message: string; sender: string; delivery_status: string; created_at: string }> }>
  recent_contributions: Array<{ reference: string; campaign: string; contributor: string; amount: number; confirmed_at: string | null }>
}

interface ManagedUser extends Person { is_active: boolean; email_verified: boolean; kyc_status: string; date_joined: string; last_login: string | null }
interface UserPage { count: number; page: number; pages: number; results: ManagedUser[] }
interface Confirmation { title: string; description: string; confirmLabel: string; danger?: boolean; run: () => Promise<void> }

const tabItems: Array<{ id: Tab; label: string; icon: LucideIcon; count?: MetricKey }> = [
  { id: "overview", label: "Vue d’ensemble", icon: LayoutDashboard },
  { id: "kyc", label: "Identités", icon: BadgeCheck, count: "pending_kyc" },
  { id: "campaigns", label: "Campagnes", icon: FolderClock, count: "pending_campaigns" },
  { id: "reports", label: "Signalements", icon: ShieldAlert, count: "open_reports" },
  { id: "support", label: "Assistance", icon: Headphones, count: "open_support" },
  { id: "users", label: "Utilisateurs", icon: UserCog },
]

const PAGE_SIZE = 8

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"
}

function StatusPill({ status, label }: { status: string; label?: string }) {
  const colors = status === "PUBLIEE" || status === "VALIDE" ? "bg-emerald-50 text-emerald-700" : status === "SUSPENDUE" || status === "REJETEE" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"
  return <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${colors}`}>{label ?? status.replaceAll("_", " ")}</span>
}

function EmptyQueue({ label }: { label: string }) {
  return <div className="rounded-[20px] border border-dashed border-black/10 bg-white/60 px-6 py-14 text-center"><CheckCircle2 className="mx-auto size-9 text-emerald-600" /><p className="mt-4 font-heading text-xl font-bold text-ink">Tout est à jour</p><p className="mt-2 text-sm text-ink-muted">Aucun {label} à traiter actuellement.</p></div>
}

function NoteField({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (value: string) => void; placeholder: string; rows?: number }) {
  return <textarea aria-label={placeholder} value={value} onChange={(event) => onChange(event.target.value)} rows={rows} maxLength={5000} placeholder={placeholder} className="w-full resize-y rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-gold-dark focus:ring-2 focus:ring-gold/20" />
}

function Assignment({ admins, value, onChange }: { admins: Person[]; value: Person | null; onChange: (adminId: number | null) => void }) {
  return <label className="flex items-center gap-2 text-xs font-medium text-ink-muted"><span>Responsable</span><select aria-label="Responsable du dossier" value={value?.id ?? ""} onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)} className="rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs text-ink"><option value="">Non attribué</option>{admins.map((admin) => <option key={admin.id} value={admin.id}>{admin.name}</option>)}</select></label>
}

function Pager({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) {
  if (pages <= 1) return null
  return <nav aria-label="Pagination" className="flex items-center justify-center gap-3 pt-3"><Button variant="outline" disabled={page <= 1} onClick={() => onChange(page - 1)} className="rounded-full">Précédent</Button><span className="text-sm text-ink-secondary">Page {page} sur {pages}</span><Button variant="outline" disabled={page >= pages} onClick={() => onChange(page + 1)} className="rounded-full">Suivant</Button></nav>
}

function ConfirmDialog({ confirmation, busy, onCancel, onConfirm }: { confirmation: Confirmation; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}><div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description" className="w-full max-w-md rounded-[22px] bg-white p-7 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 id="confirm-title" className="font-heading text-2xl font-bold text-ink">{confirmation.title}</h2><p id="confirm-description" className="mt-3 text-sm leading-relaxed text-ink-secondary">{confirmation.description}</p></div><button type="button" onClick={onCancel} aria-label="Fermer" className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-black/5"><X className="size-4" /></button></div><div className="mt-7 flex justify-end gap-3"><Button variant="outline" onClick={onCancel} disabled={busy} className="rounded-full">Annuler</Button><Button onClick={onConfirm} disabled={busy} className={`rounded-full ${confirmation.danger ? "bg-red-600 text-white hover:bg-red-700" : "bg-ink text-white hover:bg-black"}`}>{busy ? "Enregistrement…" : confirmation.confirmLabel}</Button></div></div></div>
}

export default function AdminDashboardPage() {
  const { user, authFetch } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [tab, setTab] = useState<Tab>("overview")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("TOUS")
  const [localPage, setLocalPage] = useState(1)
  const [userRole, setUserRole] = useState("")
  const [userActive, setUserActive] = useState("")
  const [userPage, setUserPage] = useState(1)
  const [users, setUsers] = useState<UserPage | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try { setData((await authFetch("/backoffice/dashboard/")) as DashboardData) }
    catch { setError("Impossible de charger l’espace de gestion.") }
    finally { setLoading(false) }
  }, [authFetch])

  const loadUsers = useCallback(async () => {
    const params = new URLSearchParams({ page: String(userPage) })
    if (search.trim()) params.set("search", search.trim())
    if (userRole) params.set("role", userRole)
    if (userActive) params.set("active", userActive)
    try { setUsers((await authFetch(`/backoffice/users/?${params}`)) as UserPage) }
    catch { setError("Impossible de charger les utilisateurs.") }
  }, [authFetch, search, userActive, userPage, userRole])

  useEffect(() => { void load() }, [load])
  useEffect(() => { if (tab !== "users") return; const timer = window.setTimeout(() => void loadUsers(), 250); return () => window.clearTimeout(timer) }, [loadUsers, tab])
  useEffect(() => { setLocalPage(1) }, [search, statusFilter, tab])

  const perform = async (path: string, method: "POST" | "PATCH", body: object, message: string, refreshUsers = false) => {
    setBusy(true); setError(null); setSuccess(null)
    try {
      await authFetch(path, { method, body: JSON.stringify(body) })
      setSuccess(message)
      await load()
      if (refreshUsers) await loadUsers()
    } catch { setError("L’action n’a pas été enregistrée. Vérifiez les informations saisies.") }
    finally { setBusy(false); setConfirmation(null) }
  }

  const ask = (title: string, description: string, confirmLabel: string, run: () => Promise<void>, danger = false) => setConfirmation({ title, description, confirmLabel, run, danger })
  const assign = (kind: string, objectId: number, adminId: number | null) => void perform("/backoffice/assign/", "POST", { kind, object_id: objectId, admin_id: adminId }, "Responsable mis à jour.")
  const exportCsv = async (kind: string) => {
    try { const ticket = await authFetch(`/backoffice/exports/${kind}/ticket/`, { method: "POST" }) as { url: string }; window.location.assign(ticket.url) }
    catch { setError("L’export n’a pas pu être préparé.") }
  }

  const currentItems = useMemo(() => {
    if (!data) return [] as unknown[]
    const term = search.trim().toLocaleLowerCase("fr")
    let items: unknown[] = tab === "kyc" ? data.kyc : tab === "campaigns" ? data.campaigns : tab === "reports" ? data.reports : tab === "support" ? data.support : []
    if (term) items = items.filter((item) => JSON.stringify(item).toLocaleLowerCase("fr").includes(term))
    if (statusFilter !== "TOUS") items = items.filter((item) => (item as { status?: string }).status === statusFilter)
    return items
  }, [data, search, statusFilter, tab])
  const pages = Math.max(Math.ceil(currentItems.length / PAGE_SIZE), 1)
  const visibleItems = currentItems.slice((localPage - 1) * PAGE_SIZE, localPage * PAGE_SIZE)

  if (loading && !data) return <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-6 text-ink-muted"><RefreshCw className="mr-3 size-5 animate-spin" />Préparation du tableau de bord…</div>
  if (!data) return <section className="mx-auto max-w-lg px-6 py-24 text-center"><ShieldAlert className="mx-auto size-10 text-red-600" /><h1 className="mt-5 font-heading text-2xl font-bold text-ink">Le tableau de bord est indisponible</h1><p className="mt-3 text-ink-secondary">{error}</p><Button onClick={() => void load()} className="mt-7 rounded-full bg-gold text-ink">Réessayer</Button></section>

  const metrics: Array<{ label: string; value: string | number; icon: LucideIcon; target?: Tab }> = [
    { label: "Identités à vérifier", value: data.metrics.pending_kyc, icon: BadgeCheck, target: "kyc" },
    { label: "Campagnes à décider", value: data.metrics.pending_campaigns, icon: FolderClock, target: "campaigns" },
    { label: "Signalements ouverts", value: data.metrics.open_reports, icon: ShieldAlert, target: "reports" },
    { label: "Demandes d’assistance", value: data.metrics.open_support, icon: Headphones, target: "support" },
    { label: "Montant simulé confirmé", value: formatFcfa(data.metrics.confirmed_amount), icon: Banknote },
    { label: "Utilisateurs actifs", value: data.metrics.users, icon: Users, target: "users" },
  ]

  const queueToolbar = tab !== "overview" && tab !== "users" ? <div className="mt-6 flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" /><Input aria-label="Rechercher dans cette file" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un nom, un e-mail ou une campagne…" className="h-11 rounded-xl bg-white pl-10" /></div>{tab !== "kyc" && <select aria-label="Filtrer par statut" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm text-ink"><option value="TOUS">Tous les statuts</option>{tab === "campaigns" && <><option value="EN_MODERATION">En modération</option><option value="PUBLIEE">Publiées</option><option value="SUSPENDUE">Suspendues</option></>}{tab === "reports" && <><option value="NOUVEAU">Nouveaux</option><option value="EN_COURS">En cours</option></>}{tab === "support" && <><option value="NOUVELLE">Nouvelles</option><option value="EN_COURS">En cours</option></>}</select>}</div> : null

  return <div className="min-h-[calc(100vh-4.5rem)] bg-[#f7f6f1]"><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10"><header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">Espace de gestion</p><h1 className="mt-3 font-heading text-3xl font-bold text-ink sm:text-4xl">Bonjour {user?.first_name || "équipe Jappandale"}</h1><p className="mt-2 text-sm text-ink-secondary">Les priorités, décisions et échanges de l’équipe dans un seul espace.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading} className="w-fit rounded-full border-black/10 bg-white"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />Actualiser</Button></header>

  {error && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
  {success && <p role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p>}

  <nav aria-label="Sections de gestion" className="mt-8 overflow-x-auto"><div className="flex min-w-max gap-2 rounded-2xl border border-black/5 bg-white p-2 shadow-sm">{tabItems.map(({ id, label, icon: Icon, count }) => <button key={id} type="button" onClick={() => setTab(id)} aria-current={tab === id ? "page" : undefined} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${tab === id ? "bg-ink text-white" : "text-ink-secondary hover:bg-surface-alt hover:text-ink"}`}><Icon className="size-4" />{label}{count && data.metrics[count] > 0 && <span className={`rounded-full px-2 py-0.5 text-[11px] ${tab === id ? "bg-gold text-ink" : "bg-gold/20 text-gold-dark"}`}>{data.metrics[count]}</span>}</button>)}</div></nav>

  {tab === "overview" && <section className="mt-8" aria-labelledby="overview-title"><h2 id="overview-title" className="sr-only">Vue d’ensemble</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{metrics.map(({ label, value, icon: Icon, target }) => { const content = <><span className="flex size-10 items-center justify-center rounded-xl bg-gold/15 text-gold-dark"><Icon className="size-5" /></span><strong className="mt-5 block font-heading text-3xl text-ink">{value}</strong><span className="mt-1 block text-sm text-ink-secondary">{label}</span></>; return target ? <button key={label} type="button" onClick={() => setTab(target)} className="rounded-[20px] border border-black/5 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-md">{content}</button> : <article key={label} className="rounded-[20px] border border-black/5 bg-white p-6 shadow-sm">{content}</article> })}</div><section className="mt-8 rounded-[20px] border border-black/5 bg-white p-6 shadow-sm"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="font-heading text-2xl font-bold text-ink">Exports de gestion</h2><p className="mt-1 text-sm text-ink-muted">Fichiers CSV temporaires, réservés aux administrateurs.</p></div><div className="flex flex-wrap gap-2">{[["users","Utilisateurs"],["campaigns","Campagnes"],["contributions","Contributions"],["reports","Signalements"],["support","Assistance"]].map(([kind,label]) => <Button key={kind} variant="outline" onClick={() => void exportCsv(kind)} className="rounded-full"><Download className="size-4" />{label}</Button>)}</div></div></section></section>}

  {queueToolbar}

  {tab === "kyc" && <section className="mt-6 space-y-4" aria-labelledby="kyc-title"><div><h2 id="kyc-title" className="font-heading text-2xl font-bold text-ink">Identités à vérifier</h2><p className="mt-1 text-sm text-ink-secondary">Consultez les pièces, attribuez le dossier, puis prenez une décision.</p></div>{visibleItems.length === 0 ? <EmptyQueue label="dossier d’identité" /> : (visibleItems as DashboardData["kyc"]).map((item) => { const key = `kyc-${item.user.id}`; return <article key={item.user.id} className="rounded-[20px] border border-black/5 bg-white p-6 shadow-sm"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><h3 className="font-heading text-xl font-bold text-ink">{item.user.name}</h3><p className="mt-1 text-sm text-ink-secondary">{item.user.email}{item.user.phone ? ` · ${item.user.phone}` : ""}</p><p className="mt-1 text-xs text-ink-muted">Reçu le {formatDate(item.submitted_at)}</p></div><Assignment admins={data.admins} value={item.assigned_to} onChange={(adminId) => assign("kyc", item.user.id, adminId)} /></div><div className="mt-5 flex flex-wrap gap-2">{item.documents.map((document) => <a key={document.id} href={document.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-ink hover:border-gold"><FileText className="size-4 text-gold-dark" />{document.type_display}<ExternalLink className="size-3.5" /></a>)}</div><div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]"><NoteField value={drafts[key] ?? ""} onChange={(value) => setDrafts((current) => ({ ...current, [key]: value }))} placeholder="Note de décision ou corrections demandées" /><div className="flex flex-wrap items-end gap-2"><Button variant="outline" disabled={!(drafts[key] ?? "").trim()} onClick={() => ask("Demander des corrections ?", "Le membre recevra le motif saisi et devra compléter son dossier.", "Envoyer la demande", () => perform(`/backoffice/kyc/${item.user.id}/decision/`, "POST", { decision: "REJETE", note: drafts[key] ?? "" }, "Demande de correction envoyée."), true)} className="rounded-full border-red-200 text-red-700">Corrections</Button><Button onClick={() => ask("Valider cette identité ?", "Confirmez que toutes les pièces sont lisibles et cohérentes.", "Valider", () => perform(`/backoffice/kyc/${item.user.id}/decision/`, "POST", { decision: "VALIDE", note: drafts[key] ?? "" }, "Identité validée."))} className="rounded-full bg-emerald-600 text-white">Valider</Button></div></div></article> })}<Pager page={localPage} pages={pages} onChange={setLocalPage} /></section>}

  {tab === "campaigns" && <section className="mt-6 space-y-4" aria-labelledby="campaign-title"><div><h2 id="campaign-title" className="font-heading text-2xl font-bold text-ink">Gestion des campagnes</h2><p className="mt-1 text-sm text-ink-secondary">Modération, suspension et historique des décisions.</p></div>{visibleItems.length === 0 ? <EmptyQueue label="campagne" /> : (visibleItems as DashboardData["campaigns"]).map((item) => { const key = `campaign-${item.id}`; const note = drafts[key] ?? ""; return <article key={item.id} className="rounded-[20px] border border-black/5 bg-white p-6 shadow-sm"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div className="space-y-2"><StatusPill status={item.status} label={item.status_display} /><h3 className="font-heading text-xl font-bold text-ink">{item.title}</h3><p className="max-w-3xl text-sm leading-relaxed text-ink-secondary">{item.summary}</p><p className="text-xs text-ink-muted">{item.owner.name} · {formatFcfa(item.goal_amount)} · {item.location}</p></div><div className="flex flex-col items-end gap-3"><Link to={`/campagnes/${item.slug}`} target="_blank" className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-ink">Prévisualiser<ExternalLink className="size-4" /></Link><Assignment admins={data.admins} value={item.assigned_to} onChange={(adminId) => assign("campaign", item.id, adminId)} /></div></div><div className="mt-5"><NoteField value={note} onChange={(value) => setDrafts((current) => ({ ...current, [key]: value }))} placeholder={item.status === "EN_MODERATION" ? "Motif à transmettre en cas de refus" : "Motif obligatoire pour suspendre ou clôturer"} /></div><div className="mt-3 flex flex-wrap justify-end gap-2">{item.status === "EN_MODERATION" && <><Button variant="outline" disabled={!note.trim()} onClick={() => ask("Refuser cette campagne ?", "Le porteur recevra le motif et pourra modifier son projet.", "Refuser", () => perform(`/backoffice/campaigns/${item.id}/decision/`, "POST", { decision: "REJETEE", note }, "Campagne renvoyée au porteur."), true)} className="rounded-full border-red-200 text-red-700">Demander des corrections</Button><Button onClick={() => ask("Publier cette campagne ?", "Elle deviendra immédiatement visible et pourra recevoir des contributions simulées.", "Publier", () => perform(`/backoffice/campaigns/${item.id}/decision/`, "POST", { decision: "PUBLIEE", note: "" }, "Campagne publiée."))} className="rounded-full bg-emerald-600 text-white">Publier</Button></>}{item.status === "PUBLIEE" && <><Button variant="outline" disabled={!note.trim()} onClick={() => ask("Suspendre cette campagne ?", "Elle ne sera plus visible publiquement jusqu’à sa réactivation.", "Suspendre", () => perform(`/backoffice/campaigns/${item.id}/workflow/`, "POST", { action: "SUSPEND", note }, "Campagne suspendue."), true)} className="rounded-full border-red-200 text-red-700">Suspendre</Button><Button variant="outline" disabled={!note.trim()} onClick={() => ask("Clôturer définitivement ?", "La campagne n’acceptera plus de contribution.", "Clôturer", () => perform(`/backoffice/campaigns/${item.id}/workflow/`, "POST", { action: "CLOSE", note }, "Campagne clôturée."), true)} className="rounded-full">Clôturer</Button></>}{item.status === "SUSPENDUE" && <><Button onClick={() => ask("Réactiver cette campagne ?", "Elle redeviendra visible publiquement.", "Réactiver", () => perform(`/backoffice/campaigns/${item.id}/workflow/`, "POST", { action: "REACTIVATE", note: "" }, "Campagne réactivée."))} className="rounded-full bg-emerald-600 text-white">Réactiver</Button><Button variant="outline" disabled={!note.trim()} onClick={() => ask("Clôturer cette campagne ?", "Cette décision arrêtera définitivement la collecte.", "Clôturer", () => perform(`/backoffice/campaigns/${item.id}/workflow/`, "POST", { action: "CLOSE", note }, "Campagne clôturée."), true)} className="rounded-full">Clôturer</Button></>}</div>{item.audit.length > 0 && <details className="mt-5 border-t border-black/5 pt-4"><summary className="cursor-pointer text-sm font-semibold text-ink-secondary">Voir l’historique ({item.audit.length})</summary><ol className="mt-3 space-y-2">{item.audit.map((event, index) => <li key={`${event.created_at}-${index}`} className="text-xs text-ink-muted"><strong className="text-ink">{event.action}</strong> · {event.actor} · {formatDate(event.created_at)}{event.note ? ` — ${event.note}` : ""}</li>)}</ol></details>}</article> })}<Pager page={localPage} pages={pages} onChange={setLocalPage} /></section>}

  {tab === "reports" && <section className="mt-6 space-y-4" aria-labelledby="reports-title"><div><h2 id="reports-title" className="font-heading text-2xl font-bold text-ink">Signalements ouverts</h2><p className="mt-1 text-sm text-ink-secondary">Attribuez, examinez et consignez la conclusion.</p></div>{visibleItems.length === 0 ? <EmptyQueue label="signalement" /> : (visibleItems as DashboardData["reports"]).map((item) => { const key = `report-${item.id}`; const note = drafts[key] ?? item.admin_note; return <article key={item.id} className="rounded-[20px] border border-black/5 bg-white p-6 shadow-sm"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><StatusPill status={item.status} label={item.reason} /><h3 className="mt-3 font-heading text-xl font-bold text-ink">{item.campaign.title}</h3><p className="mt-3 max-w-3xl text-sm text-ink-secondary">{item.details}</p><p className="mt-3 text-xs text-ink-muted">{item.reporter.email} · {formatDate(item.created_at)}</p></div><div className="flex flex-col items-end gap-3"><Link to={`/campagnes/${item.campaign.slug}`} target="_blank" className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-ink">Voir<ExternalLink className="size-4" /></Link><Assignment admins={data.admins} value={item.assigned_to} onChange={(adminId) => assign("report", item.id, adminId)} /></div></div><div className="mt-5"><NoteField value={note} onChange={(value) => setDrafts((current) => ({ ...current, [key]: value }))} placeholder="Conclusion interne de l’examen" /></div><div className="mt-3 flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => void perform(`/backoffice/reports/${item.id}/`, "PATCH", { status: "EN_COURS", admin_note: note, assigned_to: item.assigned_to?.id ?? user?.id }, "Signalement pris en charge.")} className="rounded-full">Prendre en charge</Button><Button variant="outline" onClick={() => ask("Classer ce signalement ?", "Le dossier quittera la file active sans action sur la campagne.", "Classer", () => perform(`/backoffice/reports/${item.id}/`, "PATCH", { status: "CLASSE", admin_note: note, assigned_to: item.assigned_to?.id ?? user?.id }, "Signalement classé."))} className="rounded-full">Classer</Button><Button onClick={() => ask("Marquer ce signalement résolu ?", "Assurez-vous que la conclusion est consignée dans la note interne.", "Résoudre", () => perform(`/backoffice/reports/${item.id}/`, "PATCH", { status: "RESOLU", admin_note: note, assigned_to: item.assigned_to?.id ?? user?.id }, "Signalement résolu."))} className="rounded-full bg-ink text-white">Résoudre</Button></div></article> })}<Pager page={localPage} pages={pages} onChange={setLocalPage} /></section>}

  {tab === "support" && <section className="mt-6 space-y-4" aria-labelledby="support-title"><div><h2 id="support-title" className="font-heading text-2xl font-bold text-ink">Demandes d’assistance</h2><p className="mt-1 text-sm text-ink-secondary">Répondez depuis Jappandale et conservez l’historique.</p></div>{visibleItems.length === 0 ? <EmptyQueue label="demande" /> : (visibleItems as DashboardData["support"]).map((item) => { const noteKey = `support-note-${item.id}`; const subjectKey = `support-subject-${item.id}`; const replyKey = `support-reply-${item.id}`; const note = drafts[noteKey] ?? item.admin_note; const subject = drafts[subjectKey] ?? `Re: ${item.subject}`; const reply = drafts[replyKey] ?? ""; return <article key={item.id} className="rounded-[20px] border border-black/5 bg-white p-6 shadow-sm"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><StatusPill status={item.status} /><h3 className="mt-3 font-heading text-xl font-bold text-ink">{item.subject}</h3><p className="mt-1 text-sm text-ink-secondary">{item.name} · {item.email}</p><p className="mt-4 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-ink-secondary">{item.message}</p></div><Assignment admins={data.admins} value={item.assigned_to} onChange={(adminId) => assign("support", item.id, adminId)} /></div>{item.replies.length > 0 && <div className="mt-5 rounded-xl bg-surface-alt p-4"><p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Historique des réponses</p>{item.replies.map((sent) => <div key={sent.id} className="mt-3 border-t border-black/5 pt-3 text-sm"><p className="font-semibold text-ink">{sent.subject}</p><p className="mt-1 whitespace-pre-line text-ink-secondary">{sent.message}</p><p className="mt-2 text-xs text-ink-muted">{sent.sender} · {formatDate(sent.created_at)} · {sent.delivery_status === "SENT" ? "Envoyée" : "Échec"}</p></div>)}</div>}<div className="mt-5 grid gap-3"><Input aria-label="Objet de la réponse" value={subject} onChange={(event) => setDrafts((current) => ({ ...current, [subjectKey]: event.target.value }))} className="h-11 rounded-xl" /><NoteField value={reply} onChange={(value) => setDrafts((current) => ({ ...current, [replyKey]: value }))} placeholder="Réponse à envoyer par e-mail" rows={5} /><div className="flex justify-end"><Button disabled={!reply.trim()} onClick={() => ask("Envoyer cette réponse ?", `L’e-mail sera envoyé à ${item.email} et conservé dans l’historique.`, "Envoyer", () => perform(`/backoffice/support/${item.id}/reply/`, "POST", { subject, message: reply }, "Réponse envoyée."))} className="rounded-full bg-gold text-ink"><Mail className="size-4" />Envoyer par e-mail</Button></div><NoteField value={note} onChange={(value) => setDrafts((current) => ({ ...current, [noteKey]: value }))} placeholder="Note interne pour l’équipe" /></div><div className="mt-3 flex justify-end gap-2"><Button variant="outline" onClick={() => void perform(`/backoffice/support/${item.id}/`, "PATCH", { status: "EN_COURS", admin_note: note, assigned_to: item.assigned_to?.id ?? user?.id }, "Demande prise en charge.")} className="rounded-full">En cours</Button><Button onClick={() => ask("Clôturer cette demande ?", "Elle quittera la file active mais son historique restera conservé.", "Clôturer", () => perform(`/backoffice/support/${item.id}/`, "PATCH", { status: "RESOLUE", admin_note: note, assigned_to: item.assigned_to?.id ?? user?.id }, "Demande clôturée."))} className="rounded-full bg-ink text-white">Clôturer</Button></div></article> })}<Pager page={localPage} pages={pages} onChange={setLocalPage} /></section>}

  {tab === "users" && <section className="mt-8" aria-labelledby="users-title"><div><h2 id="users-title" className="font-heading text-2xl font-bold text-ink">Utilisateurs</h2><p className="mt-1 text-sm text-ink-secondary">Recherchez un compte, contrôlez son statut et gérez ses droits.</p></div><div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto_auto]"><div className="relative"><Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" /><Input aria-label="Rechercher un utilisateur" value={search} onChange={(event) => { setSearch(event.target.value); setUserPage(1) }} placeholder="Nom, e-mail ou téléphone…" className="h-11 rounded-xl bg-white pl-10" /></div><select aria-label="Filtrer par rôle" value={userRole} onChange={(event) => { setUserRole(event.target.value); setUserPage(1) }} className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm"><option value="">Tous les rôles</option><option value="PORTEUR">Porteurs</option><option value="CONTRIBUTEUR">Contributeurs</option><option value="ADMIN">Administrateurs</option></select><select aria-label="Filtrer par activité" value={userActive} onChange={(event) => { setUserActive(event.target.value); setUserPage(1) }} className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm"><option value="">Tous les comptes</option><option value="true">Actifs</option><option value="false">Désactivés</option></select></div><div className="mt-5 overflow-hidden rounded-[20px] border border-black/5 bg-white shadow-sm">{!users ? <p className="p-8 text-center text-ink-muted">Chargement…</p> : users.results.length === 0 ? <p className="p-8 text-center text-ink-muted">Aucun utilisateur trouvé.</p> : <div className="divide-y divide-black/5">{users.results.map((member) => <article key={member.id} className="flex flex-col justify-between gap-4 p-5 lg:flex-row lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-ink">{member.name}</h3><StatusPill status={member.is_active ? "PUBLIEE" : "SUSPENDUE"} label={member.is_active ? "Actif" : "Désactivé"} />{!member.email_verified && <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">E-mail non vérifié</span>}</div><p className="mt-1 text-sm text-ink-secondary">{member.email}{member.phone ? ` · ${member.phone}` : ""}</p><p className="mt-1 text-xs text-ink-muted">Inscrit le {formatDate(member.date_joined)} · KYC {member.kyc_status.replaceAll("_", " ")}</p></div><div className="flex flex-wrap items-center gap-2"><select aria-label={`Rôle de ${member.name}`} value={member.role} onChange={(event) => ask("Modifier le rôle ?", `${member.name} recevra les droits correspondant au nouveau rôle.`, "Modifier", () => perform(`/backoffice/users/${member.id}/`, "PATCH", { role: event.target.value }, "Rôle mis à jour.", true), member.role === "ADMIN")} className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm"><option value="CONTRIBUTEUR">Contributeur</option><option value="PORTEUR">Porteur</option><option value="ADMIN">Administrateur</option></select><Button variant="outline" onClick={() => ask(member.is_active ? "Désactiver ce compte ?" : "Réactiver ce compte ?", member.is_active ? "La connexion sera bloquée jusqu’à réactivation." : "Le membre pourra de nouveau se connecter.", member.is_active ? "Désactiver" : "Réactiver", () => perform(`/backoffice/users/${member.id}/`, "PATCH", { is_active: !member.is_active }, member.is_active ? "Compte désactivé." : "Compte réactivé.", true), member.is_active)} className={`rounded-full ${member.is_active ? "border-red-200 text-red-700" : "border-emerald-200 text-emerald-700"}`}>{member.is_active ? "Désactiver" : "Réactiver"}</Button></div></article>)}</div>}</div>{users && <Pager page={users.page} pages={users.pages} onChange={setUserPage} />}</section>}
  </div>{confirmation && <ConfirmDialog confirmation={confirmation} busy={busy} onCancel={() => !busy && setConfirmation(null)} onConfirm={() => void confirmation.run()} />}</div>
}
