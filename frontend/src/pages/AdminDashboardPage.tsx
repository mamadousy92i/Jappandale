import { useCallback, useEffect, useState } from "react"
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileText,
  FolderClock,
  Headphones,
  LayoutDashboard,
  RefreshCw,
  ShieldAlert,
  Users,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"
import { formatFcfa } from "@/lib/format"

type Tab = "overview" | "kyc" | "campaigns" | "reports" | "support"

interface Person { id: number; name: string; email: string; phone: string; role: string }
interface DashboardData {
  metrics: { pending_kyc: number; pending_campaigns: number; open_reports: number; open_support: number; published_campaigns: number; users: number; confirmed_contributions: number; confirmed_amount: number }
  kyc: Array<{ user: Person; submitted_at: string; documents: Array<{ id: number; type_display: string; file_url: string }> }>
  campaigns: Array<{ id: number; slug: string; title: string; summary: string; category: string; location: string; goal_amount: number; owner: Person; submitted_at: string }>
  reports: Array<{ id: number; campaign: { slug: string; title: string }; reporter: Person; reason: string; details: string; status: string; admin_note: string; created_at: string }>
  support: Array<{ id: number; name: string; email: string; subject: string; message: string; status: string; admin_note: string; created_at: string }>
  recent_contributions: Array<{ reference: string; campaign: string; contributor: string; amount: number; confirmed_at: string | null }>
}

const tabs: Array<{ id: Tab; label: string; icon: LucideIcon; count?: keyof DashboardData["metrics"] }> = [
  { id: "overview", label: "Vue d’ensemble", icon: LayoutDashboard },
  { id: "kyc", label: "Identités", icon: BadgeCheck, count: "pending_kyc" },
  { id: "campaigns", label: "Campagnes", icon: FolderClock, count: "pending_campaigns" },
  { id: "reports", label: "Signalements", icon: ShieldAlert, count: "open_reports" },
  { id: "support", label: "Assistance", icon: Headphones, count: "open_support" },
]

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function EmptyQueue({ label }: { label: string }) {
  return <div className="rounded-[20px] border border-dashed border-black/10 bg-white/50 px-6 py-14 text-center"><CheckCircle2 className="mx-auto size-9 text-emerald-600" /><p className="mt-4 font-heading text-xl font-bold text-ink">Tout est à jour</p><p className="mt-2 text-sm text-ink-muted">Aucun {label} à traiter actuellement.</p></div>
}

function NoteField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <textarea aria-label={placeholder} value={value} onChange={(event) => onChange(event.target.value)} rows={3} maxLength={2000} placeholder={placeholder} className="w-full resize-y rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-gold-dark focus:ring-2 focus:ring-gold/20" />
}

function MetricCard({ label, value, icon: Icon, urgent, onOpen }: { label: string; value: string | number; icon: LucideIcon; urgent?: boolean; onOpen?: () => void }) {
  const content = <><div className="flex items-start justify-between"><span className={`flex size-10 items-center justify-center rounded-xl ${urgent ? "bg-gold/20 text-gold-dark" : "bg-black/[0.04] text-ink-secondary"}`}><Icon className="size-5" /></span>{onOpen && <span className="text-xs font-semibold text-gold-dark">Ouvrir →</span>}</div><strong className="mt-5 block font-heading text-3xl font-bold text-ink">{value}</strong><span className="mt-1 block text-sm text-ink-secondary">{label}</span></>
  const classes = `rounded-[20px] border bg-white p-6 text-left shadow-sm ${urgent ? "border-gold/50" : "border-black/5"}`
  return onOpen ? <button type="button" onClick={onOpen} className={`${classes} transition-all hover:-translate-y-0.5 hover:shadow-md`}>{content}</button> : <article className={classes}>{content}</article>
}

export default function AdminDashboardPage() {
  const { user, authFetch } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [tab, setTab] = useState<Tab>("overview")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try { setData((await authFetch("/backoffice/dashboard/")) as DashboardData) }
    catch { setError("Impossible de charger l’espace de gestion.") }
    finally { setLoading(false) }
  }, [authFetch])

  useEffect(() => { void load() }, [load])

  const act = async (key: string, path: string, method: "POST" | "PATCH", body: object) => {
    setBusy(key)
    setError(null)
    try {
      await authFetch(path, { method, body: JSON.stringify(body) })
      await load()
    } catch { setError("L’action n’a pas été enregistrée. Vérifiez le motif ou les pièces requises.") }
    finally { setBusy(null) }
  }

  if (loading && !data) return <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-6 text-ink-muted"><RefreshCw className="mr-3 size-5 animate-spin" />Préparation du tableau de bord…</div>
  if (!data) return <section className="mx-auto max-w-lg px-6 py-24 text-center"><AlertTriangle className="mx-auto size-10 text-red-600" /><h1 className="mt-5 font-heading text-2xl font-bold text-ink">Le tableau de bord est indisponible</h1><p className="mt-3 text-ink-secondary">{error}</p><Button onClick={() => void load()} className="mt-7 rounded-full bg-gold text-ink hover:bg-gold-light">Réessayer</Button></section>

  const metricCards: Array<{ label: string; value: string | number; icon: LucideIcon; target?: Tab; urgent?: boolean }> = [
    { label: "Identités à vérifier", value: data.metrics.pending_kyc, icon: BadgeCheck, target: "kyc", urgent: data.metrics.pending_kyc > 0 },
    { label: "Campagnes à décider", value: data.metrics.pending_campaigns, icon: FolderClock, target: "campaigns", urgent: data.metrics.pending_campaigns > 0 },
    { label: "Signalements ouverts", value: data.metrics.open_reports, icon: ShieldAlert, target: "reports", urgent: data.metrics.open_reports > 0 },
    { label: "Demandes d’assistance", value: data.metrics.open_support, icon: Headphones, target: "support", urgent: data.metrics.open_support > 0 },
    { label: "Montant simulé confirmé", value: formatFcfa(data.metrics.confirmed_amount), icon: Banknote },
    { label: "Utilisateurs actifs", value: data.metrics.users, icon: Users },
  ]

  return <div className="min-h-[calc(100vh-4.5rem)] bg-[#f7f6f1]"><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10"><header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">Espace de gestion</p><h1 className="mt-3 font-heading text-3xl font-bold text-ink sm:text-4xl">Bonjour {user?.first_name || "équipe Jappandale"}</h1><p className="mt-2 text-sm text-ink-secondary">Les priorités opérationnelles de la plateforme, sans jargon technique.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading} className="w-fit rounded-full border-black/10 bg-white"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />Actualiser</Button></header>

  {error && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

  <nav aria-label="Sections de gestion" className="mt-8 overflow-x-auto"><div className="flex min-w-max gap-2 rounded-2xl border border-black/5 bg-white p-2 shadow-sm">{tabs.map(({ id, label, icon: Icon, count }) => <button key={id} type="button" onClick={() => setTab(id)} aria-current={tab === id ? "page" : undefined} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${tab === id ? "bg-ink text-white" : "text-ink-secondary hover:bg-surface-alt hover:text-ink"}`}><Icon className="size-4" />{label}{count && data.metrics[count] > 0 && <span className={`rounded-full px-2 py-0.5 text-[11px] ${tab === id ? "bg-gold text-ink" : "bg-gold/20 text-gold-dark"}`}>{data.metrics[count]}</span>}</button>)}</div></nav>

  {tab === "overview" && <section aria-labelledby="overview-title" className="mt-8"><h2 id="overview-title" className="sr-only">Vue d’ensemble</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{metricCards.map(({ label, value, icon, target, urgent }) => <MetricCard key={label} label={label} value={value} icon={icon} urgent={urgent} onOpen={target ? () => setTab(target) : undefined} />)}</div><section className="mt-8 rounded-[20px] border border-black/5 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-heading text-2xl font-bold text-ink">Dernières contributions simulées</h2><p className="mt-1 text-sm text-ink-muted">Contrôle rapide de l’activité récente.</p></div><ClipboardCheck className="size-6 text-gold-dark" /></div>{data.recent_contributions.length ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-black/10 text-xs tracking-wide text-ink-muted uppercase"><tr><th className="py-3 pr-4">Date</th><th className="py-3 pr-4">Campagne</th><th className="py-3 pr-4">Contributeur</th><th className="py-3 text-right">Montant</th></tr></thead><tbody>{data.recent_contributions.map((item) => <tr key={item.reference} className="border-b border-black/5 last:border-0"><td className="py-4 pr-4 text-ink-muted">{formatDate(item.confirmed_at)}</td><td className="py-4 pr-4 font-medium text-ink">{item.campaign}</td><td className="py-4 pr-4 text-ink-secondary">{item.contributor}</td><td className="py-4 text-right font-semibold text-gold-dark">{formatFcfa(item.amount)}</td></tr>)}</tbody></table></div> : <p className="mt-6 text-sm text-ink-muted">Aucune contribution confirmée.</p>}</section></section>}

  {tab === "kyc" && <section className="mt-8 space-y-4" aria-labelledby="kyc-title"><div><h2 id="kyc-title" className="font-heading text-2xl font-bold text-ink">Identités à vérifier</h2><p className="mt-1 text-sm text-ink-secondary">Consultez les pièces, puis validez ou expliquez clairement ce qui manque.</p></div>{data.kyc.length === 0 ? <EmptyQueue label="dossier d’identité" /> : data.kyc.map((item) => { const noteKey = `kyc-${item.user.id}`; return <article key={item.user.id} className="rounded-[20px] border border-black/5 bg-white p-6 shadow-sm"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><h3 className="font-heading text-xl font-bold text-ink">{item.user.name}</h3><p className="mt-1 text-sm text-ink-secondary">{item.user.email}{item.user.phone ? ` · ${item.user.phone}` : ""}</p><p className="mt-1 text-xs text-ink-muted">Dossier reçu le {formatDate(item.submitted_at)}</p></div><span className="h-fit w-fit rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-gold-dark">{item.user.role === "PORTEUR" ? "Porteur de projet" : "Contributeur"}</span></div><div className="mt-5 flex flex-wrap gap-2">{item.documents.map((document) => <a key={document.id} href={document.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-ink hover:border-gold"><FileText className="size-4 text-gold-dark" />{document.type_display}<ExternalLink className="size-3.5 text-ink-muted" /></a>)}</div><div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]"><NoteField value={notes[noteKey] ?? ""} onChange={(value) => setNotes((current) => ({ ...current, [noteKey]: value }))} placeholder="Note de décision ou corrections demandées" /><div className="flex flex-wrap items-end gap-2"><Button variant="outline" disabled={busy === noteKey || !(notes[noteKey] ?? "").trim()} onClick={() => void act(noteKey, `/backoffice/kyc/${item.user.id}/decision/`, "POST", { decision: "REJETE", note: notes[noteKey] ?? "" })} className="rounded-full border-red-200 text-red-700 hover:bg-red-50">Demander des corrections</Button><Button disabled={busy === noteKey} onClick={() => void act(noteKey, `/backoffice/kyc/${item.user.id}/decision/`, "POST", { decision: "VALIDE", note: notes[noteKey] ?? "" })} className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700">Valider l’identité</Button></div></div></article> })}</section>}

  {tab === "campaigns" && <section className="mt-8 space-y-4" aria-labelledby="campaigns-title"><div><h2 id="campaigns-title" className="font-heading text-2xl font-bold text-ink">Campagnes à décider</h2><p className="mt-1 text-sm text-ink-secondary">Relisez le projet public avant de le publier ou de demander une correction.</p></div>{data.campaigns.length === 0 ? <EmptyQueue label="campagne" /> : data.campaigns.map((item) => { const noteKey = `campaign-${item.id}`; return <article key={item.id} className="rounded-[20px] border border-black/5 bg-white p-6 shadow-sm"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><span className="text-xs font-semibold text-gold-dark">{item.category} · {item.location}</span><h3 className="mt-2 font-heading text-xl font-bold text-ink">{item.title}</h3><p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-secondary">{item.summary}</p><p className="mt-3 text-xs text-ink-muted">Par {item.owner.name} · Objectif {formatFcfa(item.goal_amount)} · Soumise le {formatDate(item.submitted_at)}</p></div><Link to={`/campagnes/${item.slug}`} target="_blank" className="flex h-fit w-fit items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-ink hover:border-gold">Prévisualiser<ExternalLink className="size-4" /></Link></div><div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]"><NoteField value={notes[noteKey] ?? ""} onChange={(value) => setNotes((current) => ({ ...current, [noteKey]: value }))} placeholder="Motif à transmettre au porteur en cas de refus" /><div className="flex flex-wrap items-end gap-2"><Button variant="outline" disabled={busy === noteKey || !(notes[noteKey] ?? "").trim()} onClick={() => void act(noteKey, `/backoffice/campaigns/${item.id}/decision/`, "POST", { decision: "REJETEE", note: notes[noteKey] ?? "" })} className="rounded-full border-red-200 text-red-700 hover:bg-red-50">Demander des corrections</Button><Button disabled={busy === noteKey} onClick={() => void act(noteKey, `/backoffice/campaigns/${item.id}/decision/`, "POST", { decision: "PUBLIEE", note: "" })} className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700">Publier</Button></div></div></article> })}</section>}

  {tab === "reports" && <section className="mt-8 space-y-4" aria-labelledby="reports-title"><div><h2 id="reports-title" className="font-heading text-2xl font-bold text-ink">Signalements ouverts</h2><p className="mt-1 text-sm text-ink-secondary">Examinez les faits signalés et consignez la conclusion en interne.</p></div>{data.reports.length === 0 ? <EmptyQueue label="signalement" /> : data.reports.map((item) => { const noteKey = `report-${item.id}`; return <article key={item.id} className="rounded-[20px] border border-black/5 bg-white p-6 shadow-sm"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">{item.reason}</span><h3 className="mt-3 font-heading text-xl font-bold text-ink">{item.campaign.title}</h3><p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-secondary">{item.details}</p><p className="mt-3 text-xs text-ink-muted">Signalé par {item.reporter.email} le {formatDate(item.created_at)}</p></div><Link to={`/campagnes/${item.campaign.slug}`} target="_blank" className="flex h-fit w-fit items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-ink">Voir la campagne<ExternalLink className="size-4" /></Link></div><div className="mt-5"><NoteField value={notes[noteKey] ?? item.admin_note} onChange={(value) => setNotes((current) => ({ ...current, [noteKey]: value }))} placeholder="Conclusion interne de l’examen" /></div><div className="mt-3 flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={busy === noteKey} onClick={() => void act(noteKey, `/backoffice/reports/${item.id}/`, "PATCH", { status: "EN_COURS", admin_note: notes[noteKey] ?? item.admin_note })} className="rounded-full">Prendre en charge</Button><Button variant="outline" disabled={busy === noteKey} onClick={() => void act(noteKey, `/backoffice/reports/${item.id}/`, "PATCH", { status: "CLASSE", admin_note: notes[noteKey] ?? item.admin_note })} className="rounded-full">Classer sans suite</Button><Button disabled={busy === noteKey} onClick={() => void act(noteKey, `/backoffice/reports/${item.id}/`, "PATCH", { status: "RESOLU", admin_note: notes[noteKey] ?? item.admin_note })} className="rounded-full bg-ink text-white hover:bg-black">Marquer résolu</Button></div></article> })}</section>}

  {tab === "support" && <section className="mt-8 space-y-4" aria-labelledby="support-title"><div><h2 id="support-title" className="font-heading text-2xl font-bold text-ink">Demandes d’assistance</h2><p className="mt-1 text-sm text-ink-secondary">Répondez par e-mail, puis notez le suivi pour l’équipe.</p></div>{data.support.length === 0 ? <EmptyQueue label="demande" /> : data.support.map((item) => { const noteKey = `support-${item.id}`; return <article key={item.id} className="rounded-[20px] border border-black/5 bg-white p-6 shadow-sm"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><h3 className="font-heading text-xl font-bold text-ink">{item.subject}</h3><p className="mt-1 text-sm text-ink-secondary">{item.name} · <a href={`mailto:${item.email}`} className="font-medium text-gold-dark hover:underline">{item.email}</a></p><p className="mt-4 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-ink-secondary">{item.message}</p><p className="mt-3 text-xs text-ink-muted">Reçue le {formatDate(item.created_at)}</p></div><a href={`mailto:${item.email}?subject=${encodeURIComponent(`Re: ${item.subject}`)}`} className="flex h-fit w-fit items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink">Répondre par e-mail<ExternalLink className="size-4" /></a></div><div className="mt-5"><NoteField value={notes[noteKey] ?? item.admin_note} onChange={(value) => setNotes((current) => ({ ...current, [noteKey]: value }))} placeholder="Note interne : réponse apportée, prochaine étape…" /></div><div className="mt-3 flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={busy === noteKey} onClick={() => void act(noteKey, `/backoffice/support/${item.id}/`, "PATCH", { status: "EN_COURS", admin_note: notes[noteKey] ?? item.admin_note })} className="rounded-full">Marquer en cours</Button><Button disabled={busy === noteKey} onClick={() => void act(noteKey, `/backoffice/support/${item.id}/`, "PATCH", { status: "RESOLUE", admin_note: notes[noteKey] ?? item.admin_note })} className="rounded-full bg-ink text-white hover:bg-black">Clôturer la demande</Button></div></article> })}</section>}
  </div></div>
}
