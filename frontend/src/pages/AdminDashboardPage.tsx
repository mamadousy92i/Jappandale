import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Archive, ArrowRight, BadgeCheck, Banknote, CheckCircle2, ChevronDown, Download, ExternalLink, FileText, FolderClock, Gauge, Headphones, Landmark, LayoutDashboard, Mail, Pencil, Plus, RefreshCw, Search, ShieldAlert, Trash2, UserCog, UserPlus, Users, X } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { CampaignStatusChart, WorkloadChart } from "@/components/admin/DashboardCharts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { formatFcfa } from "@/lib/format"
import { confirmAction, notifyError, notifySuccess } from "@/lib/swal"
import type { CampaignCategory, FinancingScheme } from "@/lib/types"

type Tab = "overview" | "kyc" | "campaigns" | "reports" | "support" | "users" | "payouts" | "message_reports" | "disputes" | "scores" | "guichet"
type Person = {
  id: number
  name: string
  email: string
  phone: string
  role: string
}
type MetricKey = "pending_kyc" | "pending_campaigns" | "open_reports" | "open_support" | "open_message_reports" | "open_disputes"
type CampaignStatus = "EN_MODERATION" | "PUBLIEE" | "SUSPENDUE"

interface DashboardData {
  metrics: Record<MetricKey, number> & {
    suspended_campaigns: number
    published_campaigns: number
    users: number
    confirmed_contributions: number
    confirmed_amount: number
    total_en_sequestre: number
    total_reverse: number
  }
  admins: Person[]
  kyc: Array<{
    user: Person
    submitted_at: string
    assigned_to: Person | null
    documents: Array<{ id: number; type_display: string; file_url: string }>
  }>
  campaigns: Array<{
    id: number
    slug: string
    title: string
    summary: string
    category: string
    location: string
    goal_amount: number
    owner: Person
    submitted_at: string
    status: CampaignStatus
    status_display: string
    suspension_note: string
    assigned_to: Person | null
    audit: Array<{
      action: string
      note: string
      actor: string
      created_at: string
    }>
  }>
  reports: Array<{
    id: number
    campaign: { slug: string; title: string }
    reporter: Person
    reason: string
    details: string
    status: string
    admin_note: string
    assigned_to: Person | null
    created_at: string
  }>
  support: Array<{
    id: number
    name: string
    email: string
    subject: string
    message: string
    status: string
    admin_note: string
    assigned_to: Person | null
    created_at: string
    replies: Array<{
      id: number
      subject: string
      message: string
      sender: string
      delivery_status: string
      created_at: string
    }>
  }>
  recent_contributions: Array<{
    reference: string
    campaign: string
    contributor: string
    amount: number
    confirmed_at: string | null
  }>
  payouts: Array<{
    campaign: { id: number; slug: string; title: string; owner: Person }
    contributions_count: number
    gross_amount: number
    net_amount: number
  }>
  message_reports: Array<{
    id: number
    campaign: { slug: string; title: string }
    message_excerpt: string
    reporter: Person
    reason: string
    details: string
    status: string
    admin_note: string
    created_at: string
    assigned_to: Person | null
  }>
  disputes: Array<{
    id: number
    contribution_reference: string
    campaign: { slug: string; title: string }
    amount: number
    reporter: Person
    reason: string
    details: string
    status: string
    admin_note: string
    created_at: string
    assigned_to: Person | null
  }>
  porteurs_scores: Array<{
    porteur: Person
    effective_value: number | null
    is_manual_override: boolean
    computed_at: string | null
  }>
  scoring_settings: Record<string, string>
}

interface ManagedUser extends Person {
  first_name: string
  last_name: string
  organization_name: string
  city: string
  is_active: boolean
  email_verified: boolean
  kyc_status: string
  account_status: string
  account_status_display: string
  date_joined: string
  last_login: string | null
}
interface UserPage {
  count: number
  page: number
  pages: number
  results: ManagedUser[]
}
interface DocumentPreview {
  title: string
  url: string
}

type TabItem = { id: Tab; label: string; icon: LucideIcon; count?: MetricKey }

const primaryTabItems: TabItem[] = [
  { id: "overview", label: "Vue d’ensemble", icon: LayoutDashboard },
  { id: "kyc", label: "Identités", icon: BadgeCheck, count: "pending_kyc" },
  {
    id: "campaigns",
    label: "Campagnes",
    icon: FolderClock,
    count: "pending_campaigns",
  },
  {
    id: "reports",
    label: "Signalements",
    icon: ShieldAlert,
    count: "open_reports",
  },
  {
    id: "support",
    label: "Assistance",
    icon: Headphones,
    count: "open_support",
  },
  { id: "users", label: "Utilisateurs", icon: UserCog },
]

const moreTabItems: TabItem[] = [
  { id: "payouts", label: "Reversements", icon: Banknote },
  { id: "message_reports", label: "Signalements messages", icon: ShieldAlert, count: "open_message_reports" },
  { id: "disputes", label: "Litiges", icon: ShieldAlert, count: "open_disputes" },
  { id: "scores", label: "Scores", icon: Gauge },
  { id: "guichet", label: "Guichet Unique", icon: Landmark },
]

type AdminReferral = {
  id: number
  scheme: FinancingScheme
  scheme_name: string
  porteur: { id: number; name: string; email: string }
  status: "INTERET" | "EN_COURS" | "ACCEPTE" | "REFUSE" | "ABANDONNE"
  status_display: string
  note: string
  created_at: string
  updated_at: string
}

type GuichetStats = {
  global: { total_referrals: number; accepted: number; transformation_rate: number | null }
  published_schemes: number
  open_referrals: number
  per_scheme: Array<{
    scheme_id: number
    scheme_name: string
    total_referrals: number
    accepted: number
    transformation_rate: number | null
  }>
}

const providerTypeOptions = [
  { value: "FONDS_PUBLIC", label: "Fonds public" },
  { value: "BAILLEUR", label: "Bailleur" },
  { value: "BANQUE", label: "Banque partenaire" },
  { value: "PROGRAMME_APPUI", label: "Programme d'appui" },
] as const

const diasporaRequirementOptions = [
  { value: "INDIFFERENT", label: "Indifférent" },
  { value: "DIASPORA_UNIQUEMENT", label: "Réservé à la diaspora" },
  { value: "DIASPORA_EXCLUE", label: "Diaspora non éligible" },
] as const

const guichetCategoryOptions: { code: CampaignCategory; label: string }[] = [
  { code: "ARTISANAT", label: "Artisanat" },
  { code: "COMMERCE", label: "Commerce" },
  { code: "AGRICULTURE", label: "Agriculture" },
  { code: "EDUCATION", label: "Éducation" },
  { code: "SANTE", label: "Santé" },
  { code: "TECHNOLOGIE", label: "Technologie" },
  { code: "CULTURE", label: "Culture" },
  { code: "AUTRE", label: "Autre" },
]

type GuichetFormState = {
  name: string
  provider_name: string
  provider_type: string
  description: string
  website_url: string
  contact_email: string
  min_score: string
  requires_kyc_valide: boolean
  diaspora_requirement: string
  eligible_categories: CampaignCategory[]
  eligible_regions: string
  min_goal_amount: string
  max_goal_amount: string
}

const emptyGuichetForm: GuichetFormState = {
  name: "",
  provider_name: "",
  provider_type: "FONDS_PUBLIC",
  description: "",
  website_url: "",
  contact_email: "",
  min_score: "0",
  requires_kyc_valide: true,
  diaspora_requirement: "INDIFFERENT",
  eligible_categories: [],
  eligible_regions: "",
  min_goal_amount: "",
  max_goal_amount: "",
}

function schemeToForm(scheme: FinancingScheme): GuichetFormState {
  return {
    name: scheme.name,
    provider_name: scheme.provider_name,
    provider_type: scheme.provider_type,
    description: scheme.description,
    website_url: scheme.website_url,
    contact_email: scheme.contact_email,
    min_score: String(scheme.min_score),
    requires_kyc_valide: scheme.requires_kyc_valide,
    diaspora_requirement: scheme.diaspora_requirement,
    eligible_categories: scheme.eligible_categories,
    eligible_regions: scheme.eligible_regions.join(", "),
    min_goal_amount: scheme.min_goal_amount != null ? String(scheme.min_goal_amount) : "",
    max_goal_amount: scheme.max_goal_amount != null ? String(scheme.max_goal_amount) : "",
  }
}

function formToPayload(form: GuichetFormState) {
  return {
    name: form.name,
    provider_name: form.provider_name,
    provider_type: form.provider_type,
    description: form.description,
    website_url: form.website_url,
    contact_email: form.contact_email,
    min_score: Number(form.min_score) || 0,
    requires_kyc_valide: form.requires_kyc_valide,
    diaspora_requirement: form.diaspora_requirement,
    eligible_categories: form.eligible_categories,
    eligible_regions: form.eligible_regions
      .split(",")
      .map((region) => region.trim())
      .filter(Boolean),
    min_goal_amount: form.min_goal_amount ? Number(form.min_goal_amount) : null,
    max_goal_amount: form.max_goal_amount ? Number(form.max_goal_amount) : null,
  }
}

const guichetStatusBadges: Record<string, { label: string; className: string }> = {
  BROUILLON: { label: "Brouillon", className: "bg-black/[0.06] text-ink-secondary" },
  PUBLIE: { label: "Publié", className: "bg-emerald-100 text-emerald-700" },
  ARCHIVE: { label: "Archivé", className: "bg-ink/85 text-surface" },
}

const scoreSettingFields = [
  { key: "score_base", label: "Score de base" },
  { key: "poids_kyc", label: "Bonus KYC validé" },
  { key: "poids_anciennete_max", label: "Bonus ancienneté maximum" },
  { key: "poids_activite_max", label: "Bonus activité maximum" },
  { key: "poids_reussite_max", label: "Bonus réussite maximum" },
  { key: "poids_montant_max", label: "Bonus montant collecté maximum" },
  { key: "penalite_litige_max", label: "Pénalité litiges maximum" },
  { key: "penalite_signalement_unite", label: "Pénalité par signalement" },
  { key: "penalite_signalement_max", label: "Pénalité signalements maximum" },
  { key: "penalite_campagne_rejetee_unite", label: "Pénalité par campagne rejetée/suspendue" },
  { key: "penalite_campagne_rejetee_max", label: "Pénalité campagnes rejetées maximum" },
] as const

const PAGE_SIZE = 8

function formatDate(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—"
}

function StatusPill({ status, label }: { status: string; label?: string }) {
  const colors = status === "PUBLIEE" || status === "VALIDE" ? "bg-emerald-50 text-emerald-700" : status === "SUSPENDUE" || status === "REJETEE" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"
  return <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${colors}`}>{label ?? status.replaceAll("_", " ")}</span>
}

function EmptyQueue({ label }: { label: string }) {
  return (
    <div className="rounded-[20px] border border-dashed border-black/10 bg-white/60 px-6 py-14 text-center">
      <CheckCircle2 className="mx-auto size-9 text-emerald-600" />
      <p className="mt-4 font-heading text-xl font-bold text-ink">Tout est à jour</p>
      <p className="mt-2 text-sm text-ink-muted">Aucun {label} à traiter actuellement.</p>
    </div>
  )
}

function NoteField({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (value: string) => void; placeholder: string; rows?: number }) {
  return <textarea aria-label={placeholder} value={value} onChange={(event) => onChange(event.target.value)} rows={rows} maxLength={5000} placeholder={placeholder} className="w-full resize-y rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-gold-dark focus:ring-2 focus:ring-gold/20" />
}

function Assignment({ admins, value, onChange }: { admins: Person[]; value: Person | null; onChange: (adminId: number | null) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
      <span>Responsable</span>
      <select aria-label="Responsable du dossier" value={value?.id ?? ""} onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)} className="rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs text-ink">
        <option value="">Non attribué</option>
        {admins.map((admin) => (
          <option key={admin.id} value={admin.id}>
            {admin.name}
          </option>
        ))}
      </select>
    </label>
  )
}

function Pager({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) {
  if (pages <= 1) return null
  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-3 pt-3">
      <Button variant="outline" disabled={page <= 1} onClick={() => onChange(page - 1)} className="rounded-full">
        Précédent
      </Button>
      <span className="text-sm text-ink-secondary">
        Page {page} sur {pages}
      </span>
      <Button variant="outline" disabled={page >= pages} onClick={() => onChange(page + 1)} className="rounded-full">
        Suivant
      </Button>
    </nav>
  )
}

function DocumentPreviewDialog({ preview, onClose }: { preview: DocumentPreview; onClose: () => void }) {
  useEffect(() => {
    const documentElement = window.document.documentElement
    const previousOverflow = documentElement.style.overflow
    documentElement.style.overflow = "hidden"
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => {
      documentElement.style.overflow = previousOverflow
      window.removeEventListener("keydown", closeOnEscape)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/65 p-3 sm:p-6" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="document-preview-title" className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[22px] bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-4 border-b border-black/10 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-gold-dark uppercase">Document KYC</p>
            <h2 id="document-preview-title" className="truncate font-heading text-lg font-bold text-ink sm:text-xl">
              {preview.title}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a href={preview.url} download className="hidden items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-ink hover:border-gold sm:inline-flex">
              <Download className="size-4" />
              Télécharger
            </a>
            <a href={preview.url} target="_blank" rel="noreferrer" aria-label="Ouvrir le document dans un nouvel onglet" className="flex size-10 items-center justify-center rounded-full border border-black/10 text-ink hover:border-gold">
              <ExternalLink className="size-4" />
            </a>
            <button type="button" autoFocus onClick={onClose} aria-label="Fermer l’aperçu" className="flex size-10 items-center justify-center rounded-full bg-ink text-white hover:bg-black">
              <X className="size-4" />
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 bg-[#e9e8e3] p-2 sm:p-4">
          <iframe src={preview.url} title={`Aperçu — ${preview.title}`} className="size-full rounded-xl border-0 bg-white shadow-inner" />
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const { user, authFetch } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [tab, setTab] = useState<Tab>("overview")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [documentPreview, setDocumentPreview] = useState<DocumentPreview | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [scoreOverrideOpenId, setScoreOverrideOpenId] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("TOUS")
  const [localPage, setLocalPage] = useState(1)
  const [userRole, setUserRole] = useState("")
  const [userActive, setUserActive] = useState("")
  const [userPage, setUserPage] = useState(1)
  const [users, setUsers] = useState<UserPage | null>(null)
  const [userFormOpen, setUserFormOpen] = useState(false)
  const [userForm, setUserForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    role: "CONTRIBUTEUR",
    phone: "",
  })
  const [userFormBusy, setUserFormBusy] = useState(false)
  const [userFormError, setUserFormError] = useState<string | null>(null)
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [userEditForm, setUserEditForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    organization_name: "",
    city: "",
  })
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set())
  const [bulkDeleteNote, setBulkDeleteNote] = useState("")
  const [bulkDeleteBusy, setBulkDeleteBusy] = useState(false)
  const [guichetSchemes, setGuichetSchemes] = useState<FinancingScheme[]>([])
  const [guichetReferrals, setGuichetReferrals] = useState<AdminReferral[]>([])
  const [guichetStats, setGuichetStats] = useState<GuichetStats | null>(null)
  const [guichetBusy, setGuichetBusy] = useState(false)
  const [guichetError, setGuichetError] = useState<string | null>(null)
  const [guichetFormOpen, setGuichetFormOpen] = useState(false)
  const [guichetEditingId, setGuichetEditingId] = useState<number | null>(null)
  const [guichetForm, setGuichetForm] = useState<GuichetFormState>(emptyGuichetForm)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!moreOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [moreOpen])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData((await authFetch("/backoffice/dashboard/")) as DashboardData)
    } catch {
      const message = "Impossible de charger l’espace de gestion."
      setError(message)
      notifyError(message)
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  const loadUsers = useCallback(async () => {
    const params = new URLSearchParams({ page: String(userPage) })
    if (search.trim()) params.set("search", search.trim())
    if (userRole) params.set("role", userRole)
    if (userActive) params.set("active", userActive)
    try {
      setUsers((await authFetch(`/backoffice/users/?${params}`)) as UserPage)
    } catch {
      notifyError("Impossible de charger les utilisateurs.")
    }
  }, [authFetch, search, userActive, userPage, userRole])

  const submitUserForm = async () => {
    setUserFormBusy(true)
    setUserFormError(null)
    try {
      await authFetch("/backoffice/users/", {
        method: "POST",
        body: JSON.stringify(userForm),
      })
      setUserFormOpen(false)
      setUserForm({ email: "", first_name: "", last_name: "", role: "CONTRIBUTEUR", phone: "" })
      notifySuccess("Utilisateur créé. Un e-mail lui a été envoyé pour choisir son mot de passe.")
      await loadUsers()
    } catch (err) {
      setUserFormError(
        err instanceof ApiError && err.details?.email
          ? err.details.email.join(" ")
          : "Certaines informations sont invalides. Vérifiez le formulaire.",
      )
    } finally {
      setUserFormBusy(false)
    }
  }

  const startEditingUser = (member: ManagedUser) => {
    setEditingUserId(member.id)
    setUserEditForm({
      first_name: member.first_name,
      last_name: member.last_name,
      phone: member.phone,
      organization_name: member.organization_name,
      city: member.city,
    })
  }

  const saveUserEdit = (userId: number) =>
    perform(`/backoffice/users/${userId}/`, "PATCH", userEditForm, "Informations mises à jour.", true).then(
      () => setEditingUserId(null),
    )

  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds((current) => {
      const next = new Set(current)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const selectablePageIds = (users?.results ?? [])
    .map((member) => member.id)
    .filter((id) => id !== user?.id)
  const allOnPageSelected = selectablePageIds.length > 0 && selectablePageIds.every((id) => selectedUserIds.has(id))

  const toggleSelectAllOnPage = () => {
    setSelectedUserIds((current) => {
      const allSelected = selectablePageIds.length > 0 && selectablePageIds.every((id) => current.has(id))
      if (allSelected) {
        const next = new Set(current)
        selectablePageIds.forEach((id) => next.delete(id))
        return next
      }
      return new Set([...current, ...selectablePageIds])
    })
  }

  const bulkDeleteUsers = async () => {
    setBulkDeleteBusy(true)
    const ids = Array.from(selectedUserIds)
    let succeeded = 0
    let failed = 0
    for (const id of ids) {
      try {
        await authFetch(`/backoffice/users/${id}/`, { method: "DELETE", body: JSON.stringify({ note: bulkDeleteNote }) })
        succeeded += 1
      } catch {
        failed += 1
      }
    }
    if (failed === 0) {
      notifySuccess(`${succeeded} compte(s) supprimé(s).`)
    } else {
      notifyError(`${succeeded} compte(s) supprimé(s), ${failed} échec(s) (motif manquant ou compte protégé).`)
    }
    setSelectedUserIds(new Set())
    setBulkDeleteNote("")
    setBulkDeleteBusy(false)
    await loadUsers()
  }

  const loadGuichet = useCallback(async () => {
    setGuichetError(null)
    try {
      const [schemes, referrals, stats] = await Promise.all([
        authFetch("/guichet/admin/dispositifs/"),
        authFetch("/guichet/admin/orientations/"),
        authFetch("/guichet/admin/stats/"),
      ])
      setGuichetSchemes(schemes as FinancingScheme[])
      setGuichetReferrals(referrals as AdminReferral[])
      setGuichetStats(stats as GuichetStats)
    } catch {
      setGuichetError("Impossible de charger le Guichet Unique.")
    }
  }, [authFetch])

  useEffect(() => {
    void load()
  }, [load])
  useEffect(() => {
    if (tab !== "users") return
    const timer = window.setTimeout(() => void loadUsers(), 250)
    return () => window.clearTimeout(timer)
  }, [loadUsers, tab])
  useEffect(() => {
    if (tab !== "guichet") return
    void loadGuichet()
  }, [loadGuichet, tab])
  useEffect(() => {
    setLocalPage(1)
  }, [search, statusFilter, tab])
  useEffect(() => {
    setSelectedUserIds(new Set())
    setBulkDeleteNote("")
  }, [userPage, userRole, userActive, tab])

  const submitGuichetForm = async () => {
    setGuichetBusy(true)
    setGuichetError(null)
    try {
      const payload = formToPayload(guichetForm)
      if (guichetEditingId) {
        await authFetch(`/guichet/admin/dispositifs/${guichetEditingId}/`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      } else {
        await authFetch("/guichet/admin/dispositifs/", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      }
      setGuichetFormOpen(false)
      setGuichetEditingId(null)
      setGuichetForm(emptyGuichetForm)
      await loadGuichet()
    } catch {
      setGuichetError("Certaines informations sont invalides. Vérifiez le formulaire.")
    } finally {
      setGuichetBusy(false)
    }
  }

  const setSchemeStatus = async (schemeId: number, status: string) => {
    setGuichetBusy(true)
    setGuichetError(null)
    try {
      await authFetch(`/guichet/admin/dispositifs/${schemeId}/`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      })
      await loadGuichet()
    } catch {
      setGuichetError("Impossible de mettre à jour ce dispositif.")
    } finally {
      setGuichetBusy(false)
    }
  }

  const updateReferral = async (referralId: number, patch: { status?: string; note?: string }) => {
    setGuichetBusy(true)
    setGuichetError(null)
    try {
      await authFetch(`/guichet/admin/orientations/${referralId}/`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      })
      await loadGuichet()
    } catch {
      setGuichetError("Impossible de mettre à jour cette orientation.")
    } finally {
      setGuichetBusy(false)
    }
  }

  const perform = async (path: string, method: "POST" | "PATCH" | "DELETE", body: object, message: string, refreshUsers = false) => {
    setBusy(true)
    try {
      await authFetch(path, { method, body: JSON.stringify(body) })
      notifySuccess(message)
      await load()
      if (refreshUsers) await loadUsers()
    } catch {
      notifyError("L’action n’a pas été enregistrée. Vérifiez les informations saisies.")
    } finally {
      setBusy(false)
    }
  }

  const ask = (title: string, description: string, confirmLabel: string, run: () => Promise<void>, danger = false) =>
    void confirmAction({ title, description, confirmLabel, danger, run })
  const askWithNote = (note: string, title: string, description: string, confirmLabel: string, run: () => Promise<void>) => {
    if (!note.trim()) {
      notifyError("Indiquez un motif avant de continuer.")
      return
    }
    ask(title, description, confirmLabel, run, true)
  }
  const assign = (kind: string, objectId: number, adminId: number | null) => void perform("/backoffice/assign/", "POST", { kind, object_id: objectId, admin_id: adminId }, "Responsable mis à jour.")
  const exportCsv = async (kind: string) => {
    try {
      const ticket = (await authFetch(`/backoffice/exports/${kind}/ticket/`, {
        method: "POST",
      })) as { url: string }
      window.location.assign(ticket.url)
    } catch {
      notifyError("L’export n’a pas pu être préparé.")
    }
  }

  const currentItems = useMemo(() => {
    if (!data) return [] as unknown[]
    const term = search.trim().toLocaleLowerCase("fr")
    let items: unknown[] = tab === "kyc" ? data.kyc : tab === "campaigns" ? data.campaigns : tab === "reports" ? data.reports : tab === "support" ? data.support : tab === "payouts" ? data.payouts : tab === "message_reports" ? data.message_reports : tab === "disputes" ? data.disputes : tab === "scores" ? data.porteurs_scores : []
    if (term) items = items.filter((item) => JSON.stringify(item).toLocaleLowerCase("fr").includes(term))
    if (statusFilter !== "TOUS") items = items.filter((item) => (item as { status?: string }).status === statusFilter)
    return items
  }, [data, search, statusFilter, tab])
  const pages = Math.max(Math.ceil(currentItems.length / PAGE_SIZE), 1)
  const visibleItems = currentItems.slice((localPage - 1) * PAGE_SIZE, localPage * PAGE_SIZE)

  if (loading && !data)
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-6 text-ink-muted">
        <RefreshCw className="mr-3 size-5 animate-spin" />
        Préparation du tableau de bord…
      </div>
    )
  if (!data)
    return (
      <section className="mx-auto max-w-lg px-6 py-24 text-center">
        <ShieldAlert className="mx-auto size-10 text-red-600" />
        <h1 className="mt-5 font-heading text-2xl font-bold text-ink">Le tableau de bord est indisponible</h1>
        <p className="mt-3 text-ink-secondary">{error}</p>
        <Button onClick={() => void load()} className="mt-7 rounded-full bg-gold text-ink">
          Réessayer
        </Button>
      </section>
    )

  type Metric = { label: string; value: string | number; icon: LucideIcon; target?: Tab }

  const queueMetrics: Metric[] = [
    {
      label: "Identités à vérifier",
      value: data.metrics.pending_kyc,
      icon: BadgeCheck,
      target: "kyc",
    },
    {
      label: "Campagnes à décider",
      value: data.metrics.pending_campaigns,
      icon: FolderClock,
      target: "campaigns",
    },
    {
      label: "Signalements ouverts",
      value: data.metrics.open_reports,
      icon: ShieldAlert,
      target: "reports",
    },
    {
      label: "Demandes d’assistance",
      value: data.metrics.open_support,
      icon: Headphones,
      target: "support",
    },
  ]

  const summaryMetrics: Metric[] = [
    {
      label: "Montant des contributions confirmées",
      value: formatFcfa(data.metrics.confirmed_amount),
      icon: Banknote,
    },
    {
      label: "Fonds en séquestre",
      value: formatFcfa(data.metrics.total_en_sequestre),
      icon: Banknote,
      target: "payouts",
    },
    {
      label: "Fonds déjà reversés",
      value: formatFcfa(data.metrics.total_reverse),
      icon: CheckCircle2,
    },
    {
      label: "Utilisateurs actifs",
      value: data.metrics.users,
      icon: Users,
      target: "users",
    },
  ]

  const queueToolbar =
    tab !== "overview" && tab !== "users" && tab !== "payouts" && tab !== "scores" ? (
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
          <Input aria-label="Rechercher dans cette file" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un nom, un e-mail ou une campagne…" className="h-11 rounded-xl bg-white pl-10" />
        </div>
        {tab !== "kyc" && (
          <select aria-label="Filtrer par statut" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm text-ink">
            <option value="TOUS">Tous les statuts</option>
            {tab === "campaigns" && (
              <>
                <option value="EN_MODERATION">En modération</option>
                <option value="PUBLIEE">Publiées</option>
                <option value="SUSPENDUE">Suspendues</option>
              </>
            )}
            {(tab === "reports" || tab === "message_reports") && (
              <>
                <option value="NOUVEAU">Nouveaux</option>
                <option value="EN_COURS">En cours</option>
              </>
            )}
            {tab === "support" && (
              <>
                <option value="NOUVELLE">Nouvelles</option>
                <option value="EN_COURS">En cours</option>
              </>
            )}
          </select>
        )}
      </div>
    ) : null

  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-[#f7f6f1]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">Espace de gestion</p>
            <h1 className="mt-3 font-heading text-3xl font-bold text-ink sm:text-4xl">Bonjour {user?.first_name || "équipe Jappandale"}</h1>
            <p className="mt-2 text-sm text-ink-secondary">Les priorités, décisions et échanges de l’équipe dans un seul espace.</p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading} className="w-fit rounded-full border-black/10 bg-white">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </header>


        <nav aria-label="Sections de gestion" className="mt-8">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-black/5 bg-white p-2 shadow-sm">
            {primaryTabItems.map(({ id, label, icon: Icon, count }) => (
              <button key={id} type="button" onClick={() => setTab(id)} aria-current={tab === id ? "page" : undefined} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${tab === id ? "bg-ink text-white" : "text-ink-secondary hover:bg-surface-alt hover:text-ink"}`}>
                <Icon className="size-4" />
                {label}
                {count && data.metrics[count] > 0 && <span className={`rounded-full px-2 py-0.5 text-[11px] ${tab === id ? "bg-gold text-ink" : "bg-gold/20 text-gold-dark"}`}>{data.metrics[count]}</span>}
              </button>
            ))}

            <div className="relative" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setMoreOpen((open) => !open)}
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                aria-current={moreTabItems.some((item) => item.id === tab) ? "page" : undefined}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${
                  moreTabItems.some((item) => item.id === tab) ? "bg-ink text-white" : "text-ink-secondary hover:bg-surface-alt hover:text-ink"
                }`}
              >
                Plus
                {moreTabItems.some(
                  (item) => item.count && data.metrics[item.count] > 0,
                ) && (
                  <span className="size-1.5 rounded-full bg-gold-dark" aria-hidden="true" />
                )}
                <ChevronDown className={`size-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
              </button>
              {moreOpen && (
                <div role="menu" className="absolute top-full left-0 z-20 mt-1 w-64 rounded-xl border border-black/5 bg-white p-1.5 shadow-lg">
                  {moreTabItems.map(({ id, label, icon: Icon, count }) => (
                    <button
                      key={id}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setTab(id)
                        setMoreOpen(false)
                      }}
                      aria-current={tab === id ? "page" : undefined}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold ${tab === id ? "bg-surface-alt text-ink" : "text-ink-secondary hover:bg-surface-alt hover:text-ink"}`}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="flex-1">{label}</span>
                      {count && data.metrics[count] > 0 && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[11px] text-gold-dark">{data.metrics[count]}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </nav>

        {tab === "overview" && (
          <section className="mt-8 space-y-10" aria-labelledby="overview-title">
            <h2 id="overview-title" className="sr-only">
              Vue d’ensemble
            </h2>

            <section aria-labelledby="overview-queues-title">
              <div className="flex items-baseline justify-between gap-3">
                <p id="overview-queues-title" className="text-xs font-semibold tracking-[3px] text-gold-dark uppercase">
                  À traiter
                </p>
                <p className="text-xs text-ink-muted">Cliquez une carte pour ouvrir la file correspondante</p>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {queueMetrics.map(({ label, value, icon: Icon, target }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => target && setTab(target)}
                    className="group cursor-pointer rounded-[20px] border border-black/5 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-gold/15 text-gold-dark">
                        <Icon className="size-5" />
                      </span>
                      <ArrowRight
                        aria-hidden="true"
                        className="size-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-gold-dark"
                      />
                    </div>
                    <strong className="mt-5 block font-heading text-3xl text-ink">{value}</strong>
                    <span className="mt-1 block text-sm text-ink-secondary">{label}</span>
                  </button>
                ))}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <WorkloadChart
                  onSelect={(target) => setTab(target as Tab)}
                  items={[
                    { key: "kyc", label: "Identités à vérifier", value: data.metrics.pending_kyc, target: "kyc" },
                    { key: "campaigns", label: "Campagnes à décider", value: data.metrics.pending_campaigns, target: "campaigns" },
                    { key: "reports", label: "Signalements de campagnes", value: data.metrics.open_reports, target: "reports" },
                    { key: "message_reports", label: "Signalements de messages", value: data.metrics.open_message_reports, target: "message_reports" },
                    { key: "support", label: "Demandes d’assistance", value: data.metrics.open_support, target: "support" },
                    { key: "disputes", label: "Litiges ouverts", value: data.metrics.open_disputes, target: "disputes" },
                  ]}
                />
                <CampaignStatusChart
                  onSelect={(target) => setTab(target as Tab)}
                  segments={[
                    { key: "moderation", label: "En modération", value: data.metrics.pending_campaigns, colorClass: "bg-gold-dark", target: "campaigns" },
                    { key: "publiees", label: "Publiées", value: data.metrics.published_campaigns, colorClass: "bg-emerald-500", target: "campaigns" },
                    { key: "suspendues", label: "Suspendues", value: data.metrics.suspended_campaigns, colorClass: "bg-red-500", target: "campaigns" },
                  ]}
                />
              </div>
            </section>

            <section aria-labelledby="overview-summary-title">
              <p id="overview-summary-title" className="text-xs font-semibold tracking-[3px] text-gold-dark uppercase">
                Activité et finances
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {summaryMetrics.map(({ label, value, icon: Icon, target }) => {
                  const content = (
                    <>
                      <div className="flex items-start justify-between">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-gold/15 text-gold-dark">
                          <Icon className="size-5" />
                        </span>
                        {target && (
                          <ArrowRight
                            aria-hidden="true"
                            className="size-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-gold-dark"
                          />
                        )}
                      </div>
                      <strong className="mt-5 block font-heading text-3xl text-ink">{value}</strong>
                      <span className="mt-1 block text-sm text-ink-secondary">{label}</span>
                    </>
                  )
                  return target ? (
                    <button key={label} type="button" onClick={() => setTab(target)} className="group cursor-pointer rounded-[20px] border border-black/5 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-md">
                      {content}
                    </button>
                  ) : (
                    <article key={label} className="rounded-[20px] border border-black/5 bg-white p-6 shadow-sm">
                      {content}
                    </article>
                  )
                })}
              </div>
            </section>

            <section aria-labelledby="overview-exports-title" className="rounded-[20px] border border-black/5 bg-surface-alt/60 p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p id="overview-exports-title" className="text-xs font-semibold tracking-[3px] text-ink-muted uppercase">
                    Exports de gestion
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">Fichiers CSV temporaires, réservés aux administrateurs.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["users", "Utilisateurs"],
                    ["campaigns", "Campagnes"],
                    ["contributions", "Contributions"],
                    ["reports", "Signalements"],
                    ["support", "Assistance"],
                    ["bceao", "Rapport réglementaire (BCEAO)"],
                  ].map(([kind, label]) => (
                    <Button key={kind} variant="outline" onClick={() => void exportCsv(kind)} className="rounded-full bg-white">
                      <Download className="size-4" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </section>
          </section>
        )}

        {queueToolbar}

        {tab === "kyc" && (
          <section className="mt-6 space-y-4" aria-labelledby="kyc-title">
            <div>
              <h2 id="kyc-title" className="font-heading text-2xl font-bold text-ink">
                Identités à vérifier
              </h2>
              <p className="mt-1 text-sm text-ink-secondary">Consultez les pièces, attribuez le dossier, puis prenez une décision.</p>
            </div>
            {visibleItems.length === 0 ? (
              <EmptyQueue label="dossier d’identité" />
            ) : (
              (visibleItems as DashboardData["kyc"]).map((item) => {
                const key = `kyc-${item.user.id}`
                return (
                  <article key={item.user.id} className="rounded-[20px] border border-black/5 bg-white p-6 shadow-sm">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row">
                      <div>
                        <h3 className="font-heading text-xl font-bold text-ink">{item.user.name}</h3>
                        <p className="mt-1 text-sm text-ink-secondary">
                          {item.user.email}
                          {item.user.phone ? ` · ${item.user.phone}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-ink-muted">Reçu le {formatDate(item.submitted_at)}</p>
                      </div>
                      <Assignment admins={data.admins} value={item.assigned_to} onChange={(adminId) => assign("kyc", item.user.id, adminId)} />
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {item.documents.map((document) => (
                        <button
                          key={document.id}
                          type="button"
                          onClick={() =>
                            setDocumentPreview({
                              title: `${document.type_display} — ${item.user.name}`,
                              url: document.file_url,
                            })
                          }
                          className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-ink hover:border-gold hover:bg-gold/5"
                        >
                          <FileText className="size-4 text-gold-dark" />
                          {document.type_display}
                          <span className="text-xs text-ink-muted">Aperçu</span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
                      <NoteField value={drafts[key] ?? ""} onChange={(value) => setDrafts((current) => ({ ...current, [key]: value }))} placeholder="Note de décision ou corrections demandées" />
                      <div className="flex flex-wrap items-end gap-2">
                        <Button
                          variant="outline"
                          disabled={!(drafts[key] ?? "").trim()}
                          onClick={() =>
                            ask(
                              "Demander des corrections ?",
                              "Le membre recevra le motif saisi et devra compléter son dossier.",
                              "Envoyer la demande",
                              () =>
                                perform(
                                  `/backoffice/kyc/${item.user.id}/decision/`,
                                  "POST",
                                  {
                                    decision: "REJETE",
                                    note: drafts[key] ?? "",
                                  },
                                  "Demande de correction envoyée.",
                                ),
                              true,
                            )
                          }
                          className="rounded-full border-red-200 text-red-700"
                        >
                          Corrections
                        </Button>
                        <Button
                          onClick={() =>
                            ask("Valider cette identité ?", "Confirmez que toutes les pièces sont lisibles et cohérentes.", "Valider", () =>
                              perform(
                                `/backoffice/kyc/${item.user.id}/decision/`,
                                "POST",
                                {
                                  decision: "VALIDE",
                                  note: drafts[key] ?? "",
                                },
                                "Identité validée.",
                              ),
                            )
                          }
                          className="rounded-full bg-emerald-600 text-white"
                        >
                          Valider
                        </Button>
                      </div>
                    </div>
                  </article>
                )
              })
            )}
            <Pager page={localPage} pages={pages} onChange={setLocalPage} />
          </section>
        )}

        {tab === "campaigns" && (
          <section className="mt-6 space-y-4" aria-labelledby="campaign-title">
            <div>
              <h2 id="campaign-title" className="font-heading text-2xl font-bold text-ink">
                Gestion des campagnes
              </h2>
              <p className="mt-1 text-sm text-ink-secondary">Modération, suspension et historique des décisions.</p>
            </div>
            {visibleItems.length === 0 ? (
              <EmptyQueue label="campagne" />
            ) : (
              (visibleItems as DashboardData["campaigns"]).map((item) => {
                const key = `campaign-${item.id}`
                const note = drafts[key] ?? ""
                return (
                  <article key={item.id} className="rounded-[20px] border border-black/5 bg-white p-6 shadow-sm">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row">
                      <div className="space-y-2">
                        <StatusPill status={item.status} label={item.status_display} />
                        <h3 className="font-heading text-xl font-bold text-ink">{item.title}</h3>
                        <p className="max-w-3xl text-sm leading-relaxed text-ink-secondary">{item.summary}</p>
                        <p className="text-xs text-ink-muted">
                          {item.owner.name} · {formatFcfa(item.goal_amount)} · {item.location}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <Link to={`/campagnes/${item.slug}`} target="_blank" className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-ink">
                          Prévisualiser
                          <ExternalLink className="size-4" />
                        </Link>
                        <Assignment admins={data.admins} value={item.assigned_to} onChange={(adminId) => assign("campaign", item.id, adminId)} />
                      </div>
                    </div>
                    <div className="mt-5">
                      <NoteField value={note} onChange={(value) => setDrafts((current) => ({ ...current, [key]: value }))} placeholder={item.status === "EN_MODERATION" ? "Motif à transmettre en cas de refus" : "Motif obligatoire pour suspendre ou clôturer"} />
                    </div>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      {item.status === "EN_MODERATION" && (
                        <>
                          <Button variant="outline" disabled={!note.trim()} onClick={() => ask("Refuser cette campagne ?", "Le porteur recevra le motif et pourra modifier son projet.", "Refuser", () => perform(`/backoffice/campaigns/${item.id}/decision/`, "POST", { decision: "REJETEE", note }, "Campagne renvoyée au porteur."), true)} className="rounded-full border-red-200 text-red-700">
                            Demander des corrections
                          </Button>
                          <Button onClick={() => ask("Publier cette campagne ?", "Elle deviendra immédiatement visible et pourra recevoir des contributions.", "Publier", () => perform(`/backoffice/campaigns/${item.id}/decision/`, "POST", { decision: "PUBLIEE", note: "" }, "Campagne publiée."))} className="rounded-full bg-emerald-600 text-white">
                            Publier
                          </Button>
                        </>
                      )}
                      {item.status === "PUBLIEE" && (
                        <>
                          <Button variant="outline" disabled={!note.trim()} onClick={() => ask("Suspendre cette campagne ?", "Elle ne sera plus visible publiquement jusqu’à sa réactivation.", "Suspendre", () => perform(`/backoffice/campaigns/${item.id}/workflow/`, "POST", { action: "SUSPEND", note }, "Campagne suspendue."), true)} className="rounded-full border-red-200 text-red-700">
                            Suspendre
                          </Button>
                          <Button variant="outline" disabled={!note.trim()} onClick={() => ask("Clôturer définitivement ?", "La campagne n’acceptera plus de contribution.", "Clôturer", () => perform(`/backoffice/campaigns/${item.id}/workflow/`, "POST", { action: "CLOSE", note }, "Campagne clôturée."), true)} className="rounded-full">
                            Clôturer
                          </Button>
                        </>
                      )}
                      {item.status === "SUSPENDUE" && (
                        <>
                          <Button onClick={() => ask("Réactiver cette campagne ?", "Elle redeviendra visible publiquement.", "Réactiver", () => perform(`/backoffice/campaigns/${item.id}/workflow/`, "POST", { action: "REACTIVATE", note: "" }, "Campagne réactivée."))} className="rounded-full bg-emerald-600 text-white">
                            Réactiver
                          </Button>
                          <Button variant="outline" disabled={!note.trim()} onClick={() => ask("Clôturer cette campagne ?", "Cette décision arrêtera définitivement la collecte.", "Clôturer", () => perform(`/backoffice/campaigns/${item.id}/workflow/`, "POST", { action: "CLOSE", note }, "Campagne clôturée."), true)} className="rounded-full">
                            Clôturer
                          </Button>
                        </>
                      )}
                    </div>
                    {item.audit.length > 0 && (
                      <details className="mt-5 border-t border-black/5 pt-4">
                        <summary className="cursor-pointer text-sm font-semibold text-ink-secondary">Voir l’historique ({item.audit.length})</summary>
                        <ol className="mt-3 space-y-2">
                          {item.audit.map((event, index) => (
                            <li key={`${event.created_at}-${index}`} className="text-xs text-ink-muted">
                              <strong className="text-ink">{event.action}</strong> · {event.actor} · {formatDate(event.created_at)}
                              {event.note ? ` — ${event.note}` : ""}
                            </li>
                          ))}
                        </ol>
                      </details>
                    )}
                  </article>
                )
              })
            )}
            <Pager page={localPage} pages={pages} onChange={setLocalPage} />
          </section>
        )}

        {tab === "payouts" && (
          <section className="mt-6 space-y-4" aria-labelledby="payout-title">
            <div>
              <h2 id="payout-title" className="font-heading text-2xl font-bold text-ink">
                Reversements en attente
              </h2>
              <p className="mt-1 text-sm text-ink-secondary">
                Campagnes clôturées dont les fonds sont encore en séquestre.
              </p>
            </div>
            {visibleItems.length === 0 ? (
              <EmptyQueue label="reversement" />
            ) : (
              (visibleItems as DashboardData["payouts"]).map((item) => (
                <article key={item.campaign.id} className="rounded-[20px] border border-black/5 bg-white p-6 shadow-sm">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="space-y-1">
                      <h3 className="font-heading text-xl font-bold text-ink">{item.campaign.title}</h3>
                      <p className="text-xs text-ink-muted">
                        {item.campaign.owner.name} · {item.contributions_count} contribution(s)
                      </p>
                      <p className="text-sm text-ink-secondary">
                        Brut {formatFcfa(item.gross_amount)} · Net à reverser {formatFcfa(item.net_amount)}
                      </p>
                    </div>
                    <Button
                      onClick={() =>
                        ask(
                          "Reverser les fonds de cette campagne ?",
                          `${item.contributions_count} contribution(s) seront marquées reversées pour un montant net de ${formatFcfa(item.net_amount)}.`,
                          "Reverser",
                          () => perform(`/backoffice/campaigns/${item.campaign.id}/reverser/`, "POST", {}, "Fonds reversés."),
                        )
                      }
                      className="rounded-full bg-emerald-600 text-white"
                    >
                      Reverser les fonds
                    </Button>
                  </div>
                </article>
              ))
            )}
            <Pager page={localPage} pages={pages} onChange={setLocalPage} />
          </section>
        )}

        {tab === "message_reports" && (
          <section className="mt-6 space-y-4" aria-labelledby="message-report-title">
            <div>
              <h2 id="message-report-title" className="font-heading text-2xl font-bold text-ink">
                Signalements de messages
              </h2>
              <p className="mt-1 text-sm text-ink-secondary">Attribuez, examinez et consignez la conclusion.</p>
            </div>
            {visibleItems.length === 0 ? (
              <EmptyQueue label="signalement de message" />
            ) : (
              (visibleItems as DashboardData["message_reports"]).map((item) => {
                const key = `message-report-${item.id}`
                const note = drafts[key] ?? item.admin_note
                return (
                  <article key={item.id} className="rounded-[20px] border border-black/5 bg-white p-6 shadow-sm">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row">
                      <div>
                        <StatusPill status={item.status} label={item.reason} />
                        <h3 className="mt-3 font-heading text-xl font-bold text-ink">{item.campaign.title}</h3>
                        <p className="mt-3 max-w-3xl rounded-lg bg-surface-alt px-3 py-2 text-sm text-ink-secondary">« {item.message_excerpt} »</p>
                        <p className="mt-3 max-w-3xl text-sm text-ink-secondary">{item.details}</p>
                        <p className="mt-3 text-xs text-ink-muted">
                          {item.reporter.email} · {formatDate(item.created_at)}
                        </p>
                      </div>
                      <Assignment admins={data.admins} value={item.assigned_to} onChange={(adminId) => assign("message_report", item.id, adminId)} />
                    </div>
                    <div className="mt-5">
                      <NoteField value={note} onChange={(value) => setDrafts((current) => ({ ...current, [key]: value }))} placeholder="Conclusion interne de l’examen" />
                    </div>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          void perform(
                            `/backoffice/message-reports/${item.id}/`,
                            "PATCH",
                            { status: "EN_COURS", admin_note: note, assigned_to: item.assigned_to?.id ?? user?.id },
                            "Signalement pris en charge.",
                          )
                        }
                        className="rounded-full"
                      >
                        Prendre en charge
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          ask("Classer ce signalement ?", "Le dossier quittera la file active sans action.", "Classer", () =>
                            perform(
                              `/backoffice/message-reports/${item.id}/`,
                              "PATCH",
                              { status: "CLASSE", admin_note: note, assigned_to: item.assigned_to?.id ?? user?.id },
                              "Signalement classé.",
                            ),
                          )
                        }
                        className="rounded-full"
                      >
                        Classer
                      </Button>
                      <Button
                        onClick={() =>
                          ask("Marquer ce signalement résolu ?", "Assurez-vous que la conclusion est consignée dans la note interne.", "Résoudre", () =>
                            perform(
                              `/backoffice/message-reports/${item.id}/`,
                              "PATCH",
                              { status: "RESOLU", admin_note: note, assigned_to: item.assigned_to?.id ?? user?.id },
                              "Signalement résolu.",
                            ),
                          )
                        }
                        className="rounded-full bg-ink text-white"
                      >
                        Résoudre
                      </Button>
                    </div>
                  </article>
                )
              })
            )}
            <Pager page={localPage} pages={pages} onChange={setLocalPage} />
          </section>
        )}

        {tab === "disputes" && (
          <section className="mt-6 space-y-4" aria-labelledby="dispute-title">
            <div>
              <h2 id="dispute-title" className="font-heading text-2xl font-bold text-ink">
                Litiges
              </h2>
              <p className="mt-1 text-sm text-ink-secondary">Examinez et tranchez les litiges ouverts par les financeurs.</p>
            </div>
            {visibleItems.length === 0 ? (
              <EmptyQueue label="litige" />
            ) : (
              (visibleItems as DashboardData["disputes"]).map((item) => {
                const key = `dispute-${item.id}`
                const note = drafts[key] ?? item.admin_note
                return (
                  <article key={item.id} className="rounded-[20px] border border-black/5 bg-white p-6 shadow-sm">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row">
                      <div>
                        <StatusPill status={item.status} label={item.reason} />
                        <h3 className="mt-3 font-heading text-xl font-bold text-ink">{item.campaign.title}</h3>
                        <p className="mt-2 text-sm text-ink-secondary">Contribution de {formatFcfa(item.amount)}</p>
                        <p className="mt-3 max-w-3xl text-sm text-ink-secondary">{item.details}</p>
                        <p className="mt-3 text-xs text-ink-muted">
                          {item.reporter.email} · {formatDate(item.created_at)}
                        </p>
                      </div>
                      <Assignment admins={data.admins} value={item.assigned_to} onChange={(adminId) => assign("dispute", item.id, adminId)} />
                    </div>
                    <div className="mt-5">
                      <NoteField value={note} onChange={(value) => setDrafts((current) => ({ ...current, [key]: value }))} placeholder="Conclusion interne de l’examen" />
                    </div>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          void perform(
                            `/backoffice/disputes/${item.id}/`,
                            "PATCH",
                            { status: "EN_EXAMEN", admin_note: note, assigned_to: item.assigned_to?.id ?? user?.id },
                            "Litige pris en charge.",
                          )
                        }
                        className="rounded-full"
                      >
                        Prendre en charge
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          ask("Rejeter ce litige ?", "Aucune action ne sera prise sur la contribution.", "Rejeter", () =>
                            perform(
                              `/backoffice/disputes/${item.id}/`,
                              "PATCH",
                              { status: "REJETE", admin_note: note, assigned_to: item.assigned_to?.id ?? user?.id },
                              "Litige rejeté.",
                            ),
                          )
                        }
                        className="rounded-full border-red-200 text-red-700"
                      >
                        Rejeter
                      </Button>
                      <Button
                        onClick={() =>
                          ask(
                            "Accepter ce litige ?",
                            "La contribution sera marquée remboursée, même si les fonds ont déjà été reversés au porteur.",
                            "Accepter",
                            () =>
                              perform(
                                `/backoffice/disputes/${item.id}/`,
                                "PATCH",
                                { status: "ACCEPTE", admin_note: note, assigned_to: item.assigned_to?.id ?? user?.id },
                                "Litige accepté.",
                              ),
                            true,
                          )
                        }
                        className="rounded-full bg-emerald-600 text-white"
                      >
                        Accepter
                      </Button>
                    </div>
                  </article>
                )
              })
            )}
            <Pager page={localPage} pages={pages} onChange={setLocalPage} />
          </section>
        )}

        {tab === "scores" && (
          <section className="mt-6 space-y-4" aria-labelledby="scores-title">
            <div>
              <h2 id="scores-title" className="font-heading text-2xl font-bold text-ink">
                Scores Jappandale
              </h2>
              <p className="mt-1 text-sm text-ink-secondary">Porteurs avec une identité vérifiée et leur score courant.</p>
            </div>
            <details className="rounded-[20px] border border-black/5 bg-white p-5 shadow-sm">
              <summary className="cursor-pointer font-heading text-lg font-bold text-ink">Règles de calcul du Score</summary>
              <p className="mt-2 text-sm text-ink-secondary">Ces coefficients s’appliquent aux prochains calculs. Les décisions humaines déjà enregistrées restent tracées dans l’historique.</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {scoreSettingFields.map(({ key, label }) => {
                  const draftKey = `score-setting-${key}`
                  return (
                    <label key={key} className="space-y-1.5 text-sm font-medium text-ink">
                      <span>{label}</span>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={drafts[draftKey] ?? data.scoring_settings[key]}
                        onChange={(event) => setDrafts((current) => ({ ...current, [draftKey]: event.target.value }))}
                        className="h-10 rounded-xl bg-surface"
                      />
                    </label>
                  )
                })}
              </div>
              <div className="mt-5 flex justify-end">
                <Button
                  disabled={busy || scoreSettingFields.some(({ key }) => Number.isNaN(Number(drafts[`score-setting-${key}`] ?? data.scoring_settings[key])))}
                  onClick={() =>
                    void perform(
                      "/backoffice/scoring-settings/",
                      "PATCH",
                      Object.fromEntries(scoreSettingFields.map(({ key }) => [key, Number(drafts[`score-setting-${key}`] ?? data.scoring_settings[key])])),
                      "Règles du Score mises à jour.",
                    )
                  }
                  className="rounded-full bg-gold text-ink hover:bg-gold-light"
                >
                  Enregistrer les règles
                </Button>
              </div>
            </details>
            {visibleItems.length === 0 ? (
              <EmptyQueue label="porteur" />
            ) : (
              (visibleItems as DashboardData["porteurs_scores"]).map((item) => {
                const noteKey = `score-note-${item.porteur.id}`
                const valueKey = `score-value-${item.porteur.id}`
                const note = drafts[noteKey] ?? ""
                const overrideValue = drafts[valueKey] ?? ""
                return (
                  <article key={item.porteur.id} className="rounded-[20px] border border-black/5 bg-white p-6 shadow-sm">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      <div>
                        <h3 className="font-heading text-xl font-bold text-ink">{item.porteur.name}</h3>
                        <p className="mt-1 text-xs text-ink-muted">{item.porteur.email}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-heading text-3xl font-bold text-ink">
                          {item.effective_value ?? "—"}
                        </span>
                        <span className="ml-1 text-sm text-ink-muted">/ 100</span>
                        {item.is_manual_override && (
                          <p className="text-xs font-semibold text-gold-dark">Validé manuellement</p>
                        )}
                      </div>
                    </div>
                    {scoreOverrideOpenId === item.porteur.id ? (
                      <div className="mt-4 space-y-2 rounded-xl border border-black/10 bg-surface-alt p-4">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-ink-secondary" htmlFor={valueKey}>
                            Score imposé (0-100)
                          </label>
                          <input
                            id={valueKey}
                            type="number"
                            min={0}
                            max={100}
                            value={overrideValue}
                            onChange={(event) => setDrafts((current) => ({ ...current, [valueKey]: event.target.value }))}
                            className="h-9 w-20 rounded-lg border border-black/10 bg-white px-2 text-sm"
                          />
                        </div>
                        <NoteField value={note} onChange={(value) => setDrafts((current) => ({ ...current, [noteKey]: value }))} placeholder="Justification de la validation humaine" rows={2} />
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setScoreOverrideOpenId(null)} className="rounded-full">
                            Annuler
                          </Button>
                          <Button
                            disabled={!note.trim() || overrideValue === ""}
                            onClick={() =>
                              void perform(
                                `/backoffice/scores/${item.porteur.id}/override/`,
                                "POST",
                                { override_value: Number(overrideValue), note },
                                "Score ajusté manuellement.",
                              ).then(() => setScoreOverrideOpenId(null))
                            }
                            className="rounded-full bg-gold text-ink"
                          >
                            Valider le score
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 flex justify-end">
                        <Button variant="outline" onClick={() => setScoreOverrideOpenId(item.porteur.id)} className="rounded-full">
                          Ajuster manuellement
                        </Button>
                      </div>
                    )}
                  </article>
                )
              })
            )}
            <Pager page={localPage} pages={pages} onChange={setLocalPage} />
          </section>
        )}

        {tab === "reports" && (
          <section className="mt-6 space-y-4" aria-labelledby="reports-title">
            <div>
              <h2 id="reports-title" className="font-heading text-2xl font-bold text-ink">
                Signalements ouverts
              </h2>
              <p className="mt-1 text-sm text-ink-secondary">Attribuez, examinez et consignez la conclusion.</p>
            </div>
            {visibleItems.length === 0 ? (
              <EmptyQueue label="signalement" />
            ) : (
              (visibleItems as DashboardData["reports"]).map((item) => {
                const key = `report-${item.id}`
                const note = drafts[key] ?? item.admin_note
                return (
                  <article key={item.id} className="rounded-[20px] border border-black/5 bg-white p-6 shadow-sm">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row">
                      <div>
                        <StatusPill status={item.status} label={item.reason} />
                        <h3 className="mt-3 font-heading text-xl font-bold text-ink">{item.campaign.title}</h3>
                        <p className="mt-3 max-w-3xl text-sm text-ink-secondary">{item.details}</p>
                        <p className="mt-3 text-xs text-ink-muted">
                          {item.reporter.email} · {formatDate(item.created_at)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <Link to={`/campagnes/${item.campaign.slug}`} target="_blank" className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-ink">
                          Voir
                          <ExternalLink className="size-4" />
                        </Link>
                        <Assignment admins={data.admins} value={item.assigned_to} onChange={(adminId) => assign("report", item.id, adminId)} />
                      </div>
                    </div>
                    <div className="mt-5">
                      <NoteField value={note} onChange={(value) => setDrafts((current) => ({ ...current, [key]: value }))} placeholder="Conclusion interne de l’examen" />
                    </div>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          void perform(
                            `/backoffice/reports/${item.id}/`,
                            "PATCH",
                            {
                              status: "EN_COURS",
                              admin_note: note,
                              assigned_to: item.assigned_to?.id ?? user?.id,
                            },
                            "Signalement pris en charge.",
                          )
                        }
                        className="rounded-full"
                      >
                        Prendre en charge
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          ask("Classer ce signalement ?", "Le dossier quittera la file active sans action sur la campagne.", "Classer", () =>
                            perform(
                              `/backoffice/reports/${item.id}/`,
                              "PATCH",
                              {
                                status: "CLASSE",
                                admin_note: note,
                                assigned_to: item.assigned_to?.id ?? user?.id,
                              },
                              "Signalement classé.",
                            ),
                          )
                        }
                        className="rounded-full"
                      >
                        Classer
                      </Button>
                      <Button
                        onClick={() =>
                          ask("Marquer ce signalement résolu ?", "Assurez-vous que la conclusion est consignée dans la note interne.", "Résoudre", () =>
                            perform(
                              `/backoffice/reports/${item.id}/`,
                              "PATCH",
                              {
                                status: "RESOLU",
                                admin_note: note,
                                assigned_to: item.assigned_to?.id ?? user?.id,
                              },
                              "Signalement résolu.",
                            ),
                          )
                        }
                        className="rounded-full bg-ink text-white"
                      >
                        Résoudre
                      </Button>
                    </div>
                  </article>
                )
              })
            )}
            <Pager page={localPage} pages={pages} onChange={setLocalPage} />
          </section>
        )}

        {tab === "support" && (
          <section className="mt-6 space-y-4" aria-labelledby="support-title">
            <div>
              <h2 id="support-title" className="font-heading text-2xl font-bold text-ink">
                Demandes d’assistance
              </h2>
              <p className="mt-1 text-sm text-ink-secondary">Répondez depuis Jappandale et conservez l’historique.</p>
            </div>
            {visibleItems.length === 0 ? (
              <EmptyQueue label="demande" />
            ) : (
              (visibleItems as DashboardData["support"]).map((item) => {
                const noteKey = `support-note-${item.id}`
                const subjectKey = `support-subject-${item.id}`
                const replyKey = `support-reply-${item.id}`
                const note = drafts[noteKey] ?? item.admin_note
                const subject = drafts[subjectKey] ?? `Re: ${item.subject}`
                const reply = drafts[replyKey] ?? ""
                return (
                  <article key={item.id} className="rounded-[20px] border border-black/5 bg-white p-6 shadow-sm">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row">
                      <div>
                        <StatusPill status={item.status} />
                        <h3 className="mt-3 font-heading text-xl font-bold text-ink">{item.subject}</h3>
                        <p className="mt-1 text-sm text-ink-secondary">
                          {item.name} · {item.email}
                        </p>
                        <p className="mt-4 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-ink-secondary">{item.message}</p>
                      </div>
                      <Assignment admins={data.admins} value={item.assigned_to} onChange={(adminId) => assign("support", item.id, adminId)} />
                    </div>
                    {item.replies.length > 0 && (
                      <div className="mt-5 rounded-xl bg-surface-alt p-4">
                        <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Historique des réponses</p>
                        {item.replies.map((sent) => (
                          <div key={sent.id} className="mt-3 border-t border-black/5 pt-3 text-sm">
                            <p className="font-semibold text-ink">{sent.subject}</p>
                            <p className="mt-1 whitespace-pre-line text-ink-secondary">{sent.message}</p>
                            <p className="mt-2 text-xs text-ink-muted">
                              {sent.sender} · {formatDate(sent.created_at)} · {sent.delivery_status === "SENT" ? "Envoyée" : "Échec"}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-5 grid gap-3">
                      <Input
                        aria-label="Objet de la réponse"
                        value={subject}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [subjectKey]: event.target.value,
                          }))
                        }
                        className="h-11 rounded-xl"
                      />
                      <NoteField
                        value={reply}
                        onChange={(value) =>
                          setDrafts((current) => ({
                            ...current,
                            [replyKey]: value,
                          }))
                        }
                        placeholder="Réponse à envoyer par e-mail"
                        rows={5}
                      />
                      <div className="flex justify-end">
                        <Button disabled={!reply.trim()} onClick={() => ask("Envoyer cette réponse ?", `L’e-mail sera envoyé à ${item.email} et conservé dans l’historique.`, "Envoyer", () => perform(`/backoffice/support/${item.id}/reply/`, "POST", { subject, message: reply }, "Réponse envoyée."))} className="rounded-full bg-gold text-ink">
                          <Mail className="size-4" />
                          Envoyer par e-mail
                        </Button>
                      </div>
                      <NoteField
                        value={note}
                        onChange={(value) =>
                          setDrafts((current) => ({
                            ...current,
                            [noteKey]: value,
                          }))
                        }
                        placeholder="Note interne pour l’équipe"
                      />
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          void perform(
                            `/backoffice/support/${item.id}/`,
                            "PATCH",
                            {
                              status: "EN_COURS",
                              admin_note: note,
                              assigned_to: item.assigned_to?.id ?? user?.id,
                            },
                            "Demande prise en charge.",
                          )
                        }
                        className="rounded-full"
                      >
                        En cours
                      </Button>
                      <Button
                        onClick={() =>
                          ask("Clôturer cette demande ?", "Elle quittera la file active mais son historique restera conservé.", "Clôturer", () =>
                            perform(
                              `/backoffice/support/${item.id}/`,
                              "PATCH",
                              {
                                status: "RESOLUE",
                                admin_note: note,
                                assigned_to: item.assigned_to?.id ?? user?.id,
                              },
                              "Demande clôturée.",
                            ),
                          )
                        }
                        className="rounded-full bg-ink text-white"
                      >
                        Clôturer
                      </Button>
                    </div>
                  </article>
                )
              })
            )}
            <Pager page={localPage} pages={pages} onChange={setLocalPage} />
          </section>
        )}

        {tab === "users" && (
          <section className="mt-8" aria-labelledby="users-title">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 id="users-title" className="font-heading text-2xl font-bold text-ink">
                  Utilisateurs
                </h2>
                <p className="mt-1 text-sm text-ink-secondary">Recherchez un compte, contrôlez son statut et gérez ses droits.</p>
              </div>
              <Button
                onClick={() => {
                  setUserFormError(null)
                  setUserFormOpen((open) => !open)
                }}
                className="rounded-full bg-gold text-ink hover:bg-gold-light"
              >
                <UserPlus className="size-4" />
                Ajouter un utilisateur
              </Button>
            </div>

            {userFormOpen && (
              <div className="mt-5 rounded-[20px] border border-black/5 bg-white p-6 shadow-sm">
                <h3 className="font-heading text-lg font-bold text-ink">Nouvel utilisateur</h3>
                <p className="mt-1 text-sm text-ink-muted">
                  Un e-mail lui sera envoyé pour choisir son mot de passe.
                </p>
                {userFormError && (
                  <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {userFormError}
                  </p>
                )}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5 text-sm font-medium text-ink">
                    <span>Prénom</span>
                    <Input
                      value={userForm.first_name}
                      onChange={(event) => setUserForm((form) => ({ ...form, first_name: event.target.value }))}
                      className="h-10 rounded-xl"
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-ink">
                    <span>Nom</span>
                    <Input
                      value={userForm.last_name}
                      onChange={(event) => setUserForm((form) => ({ ...form, last_name: event.target.value }))}
                      className="h-10 rounded-xl"
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-ink sm:col-span-2">
                    <span>Adresse e-mail</span>
                    <Input
                      type="email"
                      value={userForm.email}
                      onChange={(event) => setUserForm((form) => ({ ...form, email: event.target.value }))}
                      className="h-10 rounded-xl"
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-ink">
                    <span>Rôle</span>
                    <select
                      value={userForm.role}
                      onChange={(event) => setUserForm((form) => ({ ...form, role: event.target.value }))}
                      className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm"
                    >
                      <option value="CONTRIBUTEUR">Contributeur</option>
                      <option value="PORTEUR">Porteur</option>
                      <option value="ADMIN">Administrateur</option>
                    </select>
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-ink">
                    <span>Téléphone <span className="font-normal text-ink-muted">(facultatif)</span></span>
                    <Input
                      value={userForm.phone}
                      onChange={(event) => setUserForm((form) => ({ ...form, phone: event.target.value }))}
                      className="h-10 rounded-xl"
                    />
                  </label>
                </div>
                <div className="mt-5 flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setUserFormOpen(false)} className="rounded-full">
                    Annuler
                  </Button>
                  <Button
                    disabled={userFormBusy || !userForm.email.trim() || !userForm.first_name.trim() || !userForm.last_name.trim()}
                    onClick={() => void submitUserForm()}
                    className="rounded-full bg-gold text-ink hover:bg-gold-light"
                  >
                    {userFormBusy ? "Création…" : "Créer le compte"}
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
                <Input
                  aria-label="Rechercher un utilisateur"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setUserPage(1)
                  }}
                  placeholder="Nom, e-mail ou téléphone…"
                  className="h-11 rounded-xl bg-white pl-10"
                />
              </div>
              <select
                aria-label="Filtrer par rôle"
                value={userRole}
                onChange={(event) => {
                  setUserRole(event.target.value)
                  setUserPage(1)
                }}
                className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm"
              >
                <option value="">Tous les rôles</option>
                <option value="PORTEUR">Porteurs</option>
                <option value="CONTRIBUTEUR">Contributeurs</option>
                <option value="ADMIN">Administrateurs</option>
              </select>
              <select
                aria-label="Filtrer par activité"
                value={userActive}
                onChange={(event) => {
                  setUserActive(event.target.value)
                  setUserPage(1)
                }}
                className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm"
              >
                <option value="">Tous les comptes</option>
                <option value="true">Actifs</option>
                <option value="false">Désactivés</option>
              </select>
            </div>

            {users && users.results.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-black/10 bg-surface-alt px-4 py-3">
                <label className="flex items-center gap-2 text-sm font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAllOnPage}
                    className="size-4 accent-[#c99a00]"
                  />
                  Tout sélectionner sur cette page
                </label>
                {selectedUserIds.size > 0 && (
                  <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
                    <span className="text-sm font-semibold text-ink">{selectedUserIds.size} sélectionné(s)</span>
                    <NoteField
                      value={bulkDeleteNote}
                      onChange={setBulkDeleteNote}
                      placeholder="Motif requis pour supprimer la sélection"
                      rows={1}
                    />
                    <Button
                      variant="outline"
                      disabled={bulkDeleteBusy}
                      onClick={() =>
                        askWithNote(
                          bulkDeleteNote,
                          `Supprimer ${selectedUserIds.size} compte(s) ?`,
                          "Cette action est irréversible : les informations personnelles de chaque compte seront anonymisées et la connexion définitivement bloquée. L'historique (campagnes, contributions) est conservé.",
                          "Supprimer la sélection",
                          bulkDeleteUsers,
                        )
                      }
                      className="rounded-full border-red-200 text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="size-3.5" />
                      Supprimer la sélection
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 overflow-hidden rounded-[20px] border border-black/5 bg-white shadow-sm">
              {!users ? (
                <p className="p-8 text-center text-ink-muted">Chargement…</p>
              ) : users.results.length === 0 ? (
                <p className="p-8 text-center text-ink-muted">Aucun utilisateur trouvé.</p>
              ) : (
                <div className="divide-y divide-black/5">
                  {users.results.map((member) => {
                    const key = `user-${member.id}`
                    const note = drafts[key] ?? ""
                    const isSelf = member.id === user?.id
                    return (
                    <article key={member.id} className="flex flex-col gap-4 p-5">
                      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.has(member.id)}
                            onChange={() => toggleUserSelection(member.id)}
                            disabled={isSelf}
                            aria-label={`Sélectionner ${member.name}`}
                            title={isSelf ? "Vous ne pouvez pas sélectionner votre propre compte." : undefined}
                            className="mt-1 size-4 shrink-0 accent-[#c99a00] disabled:opacity-30"
                          />
                          <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-ink">{member.name}</h3>
                            <StatusPill
                              status={member.account_status === "VALIDE" ? "PUBLIEE" : member.account_status === "EN_ATTENTE" ? "EN_MODERATION" : "SUSPENDUE"}
                              label={member.account_status_display}
                            />
                            {!member.email_verified && <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">E-mail non vérifié</span>}
                          </div>
                          <p className="mt-1 text-sm text-ink-secondary">
                            {member.email}
                            {member.phone ? ` · ${member.phone}` : ""}
                          </p>
                          <p className="mt-1 text-xs text-ink-muted">
                            Inscrit le {formatDate(member.date_joined)} · KYC {member.kyc_status.replaceAll("_", " ")}
                          </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <select aria-label={`Rôle de ${member.name}`} value={member.role} onChange={(event) => ask("Modifier le rôle ?", `${member.name} recevra les droits correspondant au nouveau rôle.`, "Modifier", () => perform(`/backoffice/users/${member.id}/`, "PATCH", { role: event.target.value }, "Rôle mis à jour.", true), member.role === "ADMIN")} className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm">
                              <option value="CONTRIBUTEUR">Contributeur</option>
                              <option value="PORTEUR">Porteur</option>
                              <option value="ADMIN">Administrateur</option>
                            </select>
                            <Button
                              variant="outline"
                              onClick={() => (editingUserId === member.id ? setEditingUserId(null) : startEditingUser(member))}
                              className="rounded-full"
                            >
                              <Pencil className="size-3.5" />
                              {editingUserId === member.id ? "Fermer" : "Modifier"}
                            </Button>
                            {member.account_status !== "VALIDE" && (
                              <Button
                                variant="outline"
                                onClick={() =>
                                  ask("Réactiver ce compte ?", "Le membre pourra de nouveau se connecter normalement.", "Réactiver", () =>
                                    perform(`/backoffice/users/${member.id}/`, "PATCH", { account_status: "VALIDE" }, "Compte réactivé.", true),
                                  )
                                }
                                className="rounded-full border-emerald-200 text-emerald-700"
                              >
                                Réactiver
                              </Button>
                            )}
                            {member.account_status !== "SUSPENDU" && (
                              <Button
                                variant="outline"
                                onClick={() =>
                                  askWithNote(note, "Suspendre ce compte ?", "La connexion sera bloquée jusqu’à réactivation.", "Suspendre", () =>
                                    perform(`/backoffice/users/${member.id}/`, "PATCH", { account_status: "SUSPENDU", note }, "Compte suspendu.", true),
                                  )
                                }
                                className="rounded-full border-amber-200 text-amber-800"
                              >
                                Suspendre
                              </Button>
                            )}
                            {member.account_status !== "REJETE" && (
                              <Button
                                variant="outline"
                                onClick={() =>
                                  askWithNote(note, "Rejeter ce compte ?", "La connexion sera bloquée définitivement, sauf nouvelle décision.", "Rejeter", () =>
                                    perform(`/backoffice/users/${member.id}/`, "PATCH", { account_status: "REJETE", note }, "Compte rejeté.", true),
                                  )
                                }
                                className="rounded-full border-red-200 text-red-700"
                              >
                                Rejeter
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              disabled={isSelf}
                              title={isSelf ? "Vous ne pouvez pas supprimer votre propre compte." : undefined}
                              onClick={() =>
                                askWithNote(
                                  note,
                                  "Supprimer ce compte ?",
                                  "Cette action est irréversible : les informations personnelles du compte seront anonymisées et la connexion définitivement bloquée. L'historique (campagnes, contributions) est conservé.",
                                  "Supprimer",
                                  () => perform(`/backoffice/users/${member.id}/`, "DELETE", { note }, "Compte supprimé.", true),
                                )
                              }
                              className="rounded-full border-red-200 text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="size-3.5" />
                              Supprimer
                            </Button>
                          </div>
                          <NoteField value={note} onChange={(value) => setDrafts((current) => ({ ...current, [key]: value }))} placeholder="Motif requis pour suspendre, rejeter ou supprimer" rows={1} />
                        </div>
                      </div>

                      {editingUserId === member.id && (
                        <div className="rounded-xl border border-black/10 bg-surface-alt p-4">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="space-y-1 text-xs font-medium text-ink-secondary">
                              <span>Prénom</span>
                              <Input value={userEditForm.first_name} onChange={(event) => setUserEditForm((form) => ({ ...form, first_name: event.target.value }))} className="h-9 rounded-lg bg-white text-sm" />
                            </label>
                            <label className="space-y-1 text-xs font-medium text-ink-secondary">
                              <span>Nom</span>
                              <Input value={userEditForm.last_name} onChange={(event) => setUserEditForm((form) => ({ ...form, last_name: event.target.value }))} className="h-9 rounded-lg bg-white text-sm" />
                            </label>
                            <label className="space-y-1 text-xs font-medium text-ink-secondary">
                              <span>Téléphone</span>
                              <Input value={userEditForm.phone} onChange={(event) => setUserEditForm((form) => ({ ...form, phone: event.target.value }))} className="h-9 rounded-lg bg-white text-sm" />
                            </label>
                            <label className="space-y-1 text-xs font-medium text-ink-secondary">
                              <span>Organisation</span>
                              <Input value={userEditForm.organization_name} onChange={(event) => setUserEditForm((form) => ({ ...form, organization_name: event.target.value }))} className="h-9 rounded-lg bg-white text-sm" />
                            </label>
                            <label className="space-y-1 text-xs font-medium text-ink-secondary">
                              <span>Ville</span>
                              <Input value={userEditForm.city} onChange={(event) => setUserEditForm((form) => ({ ...form, city: event.target.value }))} className="h-9 rounded-lg bg-white text-sm" />
                            </label>
                          </div>
                          <div className="mt-3 flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setEditingUserId(null)} className="rounded-full">
                              Annuler
                            </Button>
                            <Button size="sm" disabled={busy} onClick={() => void saveUserEdit(member.id)} className="rounded-full bg-gold text-ink hover:bg-gold-light">
                              Enregistrer
                            </Button>
                          </div>
                        </div>
                      )}
                    </article>
                    )
                  })}
                </div>
              )}
            </div>
            {users && <Pager page={users.page} pages={users.pages} onChange={setUserPage} />}
          </section>
        )}

        {tab === "guichet" && (
          <section className="mt-8 space-y-6" aria-labelledby="guichet-title">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="guichet-title" className="font-heading text-2xl font-bold text-ink">
                  Guichet Unique du Financement
                </h2>
                <p className="mt-1 text-sm text-ink-secondary">
                  Référentiel des dispositifs, orientations et taux de transformation.
                </p>
              </div>
              <Button
                onClick={() => {
                  setGuichetEditingId(null)
                  setGuichetForm(emptyGuichetForm)
                  setGuichetFormOpen(true)
                }}
                className="rounded-full bg-gold text-ink hover:bg-gold-light"
              >
                <Plus className="size-4" />
                Nouveau dispositif
              </Button>
            </div>

            {guichetError && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {guichetError}
              </p>
            )}

            {guichetStats && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[20px] border border-black/5 bg-white p-5 shadow-sm">
                  <p className="text-xs text-ink-muted">Dispositifs publiés</p>
                  <p className="mt-1 font-heading text-2xl font-bold text-ink">{guichetStats.published_schemes}</p>
                </div>
                <div className="rounded-[20px] border border-black/5 bg-white p-5 shadow-sm">
                  <p className="text-xs text-ink-muted">Orientations en cours</p>
                  <p className="mt-1 font-heading text-2xl font-bold text-ink">{guichetStats.open_referrals}</p>
                </div>
                <div className="rounded-[20px] border border-black/5 bg-white p-5 shadow-sm">
                  <p className="text-xs text-ink-muted">Taux de transformation global</p>
                  <p className="mt-1 font-heading text-2xl font-bold text-ink">
                    {guichetStats.global.transformation_rate != null
                      ? `${Math.round(guichetStats.global.transformation_rate * 100)}%`
                      : "—"}
                  </p>
                </div>
              </div>
            )}

            {guichetFormOpen && (
              <div className="rounded-[20px] border border-black/5 bg-white p-6 shadow-sm">
                <h3 className="font-heading text-lg font-bold text-ink">
                  {guichetEditingId ? "Modifier le dispositif" : "Nouveau dispositif"}
                </h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5 text-sm font-medium text-ink">
                    <span>Nom du dispositif</span>
                    <Input
                      value={guichetForm.name}
                      onChange={(event) => setGuichetForm((form) => ({ ...form, name: event.target.value }))}
                      className="h-10 rounded-xl"
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-ink">
                    <span>Organisme</span>
                    <Input
                      value={guichetForm.provider_name}
                      onChange={(event) => setGuichetForm((form) => ({ ...form, provider_name: event.target.value }))}
                      className="h-10 rounded-xl"
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-ink">
                    <span>Type d'organisme</span>
                    <select
                      value={guichetForm.provider_type}
                      onChange={(event) => setGuichetForm((form) => ({ ...form, provider_type: event.target.value }))}
                      className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm"
                    >
                      {providerTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-ink">
                    <span>Condition diaspora</span>
                    <select
                      value={guichetForm.diaspora_requirement}
                      onChange={(event) =>
                        setGuichetForm((form) => ({ ...form, diaspora_requirement: event.target.value }))
                      }
                      className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm"
                    >
                      {diasporaRequirementOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-ink sm:col-span-2">
                    <span>Description</span>
                    <textarea
                      rows={3}
                      value={guichetForm.description}
                      onChange={(event) => setGuichetForm((form) => ({ ...form, description: event.target.value }))}
                      className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-ink">
                    <span>Site web (facultatif)</span>
                    <Input
                      value={guichetForm.website_url}
                      onChange={(event) => setGuichetForm((form) => ({ ...form, website_url: event.target.value }))}
                      className="h-10 rounded-xl"
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-ink">
                    <span>E-mail de contact (facultatif)</span>
                    <Input
                      value={guichetForm.contact_email}
                      onChange={(event) => setGuichetForm((form) => ({ ...form, contact_email: event.target.value }))}
                      className="h-10 rounded-xl"
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-ink">
                    <span>Score Jappandale minimum</span>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={guichetForm.min_score}
                      onChange={(event) => setGuichetForm((form) => ({ ...form, min_score: event.target.value }))}
                      className="h-10 rounded-xl"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-ink">
                    <input
                      type="checkbox"
                      checked={guichetForm.requires_kyc_valide}
                      onChange={(event) =>
                        setGuichetForm((form) => ({ ...form, requires_kyc_valide: event.target.checked }))
                      }
                      className="size-4 accent-[#d4a900]"
                    />
                    <span>Identité vérifiée (KYC) requise</span>
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-ink">
                    <span>Objectif minimum (FCFA, facultatif)</span>
                    <Input
                      type="number"
                      min={0}
                      value={guichetForm.min_goal_amount}
                      onChange={(event) => setGuichetForm((form) => ({ ...form, min_goal_amount: event.target.value }))}
                      className="h-10 rounded-xl"
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-ink">
                    <span>Objectif maximum (FCFA, facultatif)</span>
                    <Input
                      type="number"
                      min={0}
                      value={guichetForm.max_goal_amount}
                      onChange={(event) => setGuichetForm((form) => ({ ...form, max_goal_amount: event.target.value }))}
                      className="h-10 rounded-xl"
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-ink sm:col-span-2">
                    <span>Villes/régions éligibles (facultatif, séparées par des virgules)</span>
                    <Input
                      value={guichetForm.eligible_regions}
                      onChange={(event) => setGuichetForm((form) => ({ ...form, eligible_regions: event.target.value }))}
                      placeholder="Dakar, Thiès, Saint-Louis"
                      className="h-10 rounded-xl"
                    />
                  </label>
                  <div className="space-y-1.5 text-sm font-medium text-ink sm:col-span-2">
                    <span>Catégories de projets éligibles (aucune sélection = toutes)</span>
                    <div className="flex flex-wrap gap-2">
                      {guichetCategoryOptions.map((option) => {
                        const checked = guichetForm.eligible_categories.includes(option.code)
                        return (
                          <label
                            key={option.code}
                            className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                              checked ? "border-gold bg-gold/15 text-gold-dark" : "border-black/10 text-ink-secondary"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setGuichetForm((form) => ({
                                  ...form,
                                  eligible_categories: checked
                                    ? form.eligible_categories.filter((code) => code !== option.code)
                                    : [...form.eligible_categories, option.code],
                                }))
                              }
                              className="sr-only"
                            />
                            {option.label}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setGuichetFormOpen(false)
                      setGuichetEditingId(null)
                    }}
                    className="rounded-full"
                  >
                    Annuler
                  </Button>
                  <Button
                    disabled={
                      guichetBusy ||
                      !guichetForm.name.trim() ||
                      !guichetForm.provider_name.trim() ||
                      !guichetForm.description.trim()
                    }
                    onClick={() => void submitGuichetForm()}
                    className="rounded-full bg-gold text-ink hover:bg-gold-light"
                  >
                    {guichetBusy ? "Enregistrement…" : guichetEditingId ? "Enregistrer" : "Créer le dispositif"}
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-heading text-lg font-bold text-ink">Dispositifs référencés</h3>
              {guichetSchemes.length === 0 ? (
                <EmptyQueue label="dispositif" />
              ) : (
                guichetSchemes.map((scheme) => {
                  const badge = guichetStatusBadges[scheme.status]
                  const stats = guichetStats?.per_scheme.find((item) => item.scheme_id === scheme.id)
                  return (
                    <article key={scheme.id} className="rounded-[20px] border border-black/5 bg-white p-6 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-heading text-lg font-bold text-ink">{scheme.name}</h4>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}>
                              {badge.label}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-ink-secondary">
                            {scheme.provider_name} · {scheme.provider_type_display}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setGuichetEditingId(scheme.id)
                              setGuichetForm(schemeToForm(scheme))
                              setGuichetFormOpen(true)
                            }}
                            className="rounded-full"
                          >
                            <Pencil className="size-3.5" />
                            Modifier
                          </Button>
                          {scheme.status !== "PUBLIE" && (
                            <Button
                              size="sm"
                              disabled={guichetBusy}
                              onClick={() => void setSchemeStatus(scheme.id, "PUBLIE")}
                              className="rounded-full bg-gold text-ink hover:bg-gold-light"
                            >
                              Publier
                            </Button>
                          )}
                          {scheme.status !== "ARCHIVE" && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={guichetBusy}
                              onClick={() => void setSchemeStatus(scheme.id, "ARCHIVE")}
                              className="rounded-full border-black/10"
                            >
                              <Archive className="size-3.5" />
                              Archiver
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-ink-secondary">{scheme.description}</p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                        <span>Score minimum : {scheme.min_score}/100</span>
                        {stats && (
                          <span>
                            {stats.total_referrals} orientation(s) ·{" "}
                            {stats.transformation_rate != null
                              ? `${Math.round(stats.transformation_rate * 100)}% transformées`
                              : "aucune clôturée"}
                          </span>
                        )}
                      </div>
                    </article>
                  )
                })
              )}
            </div>

            <div className="space-y-4">
              <h3 className="font-heading text-lg font-bold text-ink">Orientations récentes</h3>
              {guichetReferrals.length === 0 ? (
                <EmptyQueue label="orientation" />
              ) : (
                guichetReferrals.map((referral) => {
                  const noteKey = `referral-note-${referral.id}`
                  const note = drafts[noteKey] ?? referral.note
                  return (
                    <article key={referral.id} className="rounded-[20px] border border-black/5 bg-white p-5 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-ink">{referral.porteur.name}</h4>
                          <p className="mt-1 text-xs text-ink-muted">
                            {referral.porteur.email} · {referral.scheme_name}
                          </p>
                          <p className="mt-1 text-xs text-ink-muted">Orienté le {formatDate(referral.created_at)}</p>
                        </div>
                        <select
                          aria-label={`Statut de l'orientation de ${referral.porteur.name}`}
                          value={referral.status}
                          disabled={guichetBusy}
                          onChange={(event) => void updateReferral(referral.id, { status: event.target.value })}
                          className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm"
                        >
                          <option value="INTERET">Intérêt manifesté</option>
                          <option value="EN_COURS">Contact engagé</option>
                          <option value="ACCEPTE">Financement obtenu</option>
                          <option value="REFUSE">Refusé</option>
                          <option value="ABANDONNE">Abandonné</option>
                        </select>
                      </div>
                      <div className="mt-3 flex items-end gap-2">
                        <NoteField
                          value={note}
                          onChange={(value) => setDrafts((current) => ({ ...current, [noteKey]: value }))}
                          placeholder="Note de suivi"
                          rows={1}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={guichetBusy || note === referral.note}
                          onClick={() => void updateReferral(referral.id, { note })}
                          className="rounded-full"
                        >
                          Enregistrer
                        </Button>
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          </section>
        )}
      </div>
      {documentPreview && <DocumentPreviewDialog preview={documentPreview} onClose={() => setDocumentPreview(null)} />}
    </div>
  )
}
