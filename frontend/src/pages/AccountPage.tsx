import { useState } from "react"
import type { ChangeEvent, FormEvent, ReactNode } from "react"
import { Camera, IdCard, LayoutDashboard, LoaderCircle, Pencil, Trash2, UserRound, WalletCards } from "lucide-react"
import { Link, useSearchParams } from "react-router-dom"

import { KycSection } from "@/components/account/KycSection"
import { MyContributions } from "@/components/account/MyContributions"
import { PassportSection } from "@/components/account/PassportSection"
import { ReceivedContributions } from "@/components/account/ReceivedContributions"
import { ScoreCard } from "@/components/account/ScoreCard"
import { UserAvatar } from "@/components/account/UserAvatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { Role } from "@/lib/types"

const roleLabels: Record<Role, string> = {
  PORTEUR: "Porteur de projet",
  CONTRIBUTEUR: "Contributeur",
  ADMIN: "Administrateur",
}

type TabKey = "apercu" | "profil" | "kyc" | "contributions"

function AccountPage() {
  const { user, authFetch, refreshUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [firstName, setFirstName] = useState(user?.first_name ?? "")
  const [lastName, setLastName] = useState(user?.last_name ?? "")
  const [phone, setPhone] = useState(user?.phone ?? "")
  const [organizationName, setOrganizationName] = useState(user?.organization_name ?? "")
  const [city, setCity] = useState(user?.city ?? "")
  const [bio, setBio] = useState(user?.bio ?? "")
  const [isDiaspora, setIsDiaspora] = useState(user?.is_diaspora ?? false)
  const [country, setCountry] = useState(user?.country ?? "")
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  // La route est protégée par RequireAuth : user est garanti non nul ici.
  if (!user) return null

  const defaultTab: TabKey = user.role === "PORTEUR" ? "apercu" : "profil"
  const requestedTab = searchParams.get("onglet")
  const activeTab: TabKey =
    requestedTab === "apercu" || requestedTab === "kyc" || requestedTab === "contributions"
      ? requestedTab
      : requestedTab === "profil"
        ? "profil"
        : defaultTab

  const goToTab = (tab: TabKey) => {
    setSearchParams(tab === defaultTab ? {} : { onglet: tab })
  }

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setAvatarMessage(null)
    setAvatarError(null)
    if (!file.type.match(/^image\/(jpeg|png|webp)$/) || file.size > 3 * 1024 * 1024) {
      setAvatarError("Choisissez une image JPG, PNG ou WebP de 3 Mo maximum.")
      return
    }
    setAvatarBusy(true)
    const payload = new FormData()
    payload.append("avatar", file)
    try {
      await authFetch("/auth/me/", { method: "PATCH", body: payload })
      await refreshUser()
      setAvatarMessage("Votre photo de profil a été mise à jour.")
    } catch (err) {
      const details = err instanceof ApiError ? err.details?.avatar : null
      setAvatarError(details?.join(" ") || "Impossible d’enregistrer cette photo.")
    } finally {
      setAvatarBusy(false)
    }
  }

  const removeAvatar = async () => {
    setAvatarBusy(true)
    setAvatarMessage(null)
    setAvatarError(null)
    try {
      await authFetch("/auth/me/", {
        method: "PATCH",
        body: JSON.stringify({ avatar: null }),
      })
      await refreshUser()
      setAvatarMessage("La photo a été supprimée.")
    } catch {
      setAvatarError("Impossible de supprimer cette photo.")
    } finally {
      setAvatarBusy(false)
    }
  }

  const cancelEdit = () => {
    setFirstName(user?.first_name ?? "")
    setLastName(user?.last_name ?? "")
    setPhone(user?.phone ?? "")
    setOrganizationName(user?.organization_name ?? "")
    setCity(user?.city ?? "")
    setBio(user?.bio ?? "")
    setIsDiaspora(user?.is_diaspora ?? false)
    setCountry(user?.country ?? "")
    setError(null)
    setSaved(false)
    setIsEditing(false)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSaved(false)
    setSubmitting(true)
    try {
      await authFetch("/auth/me/", {
        method: "PATCH",
        body: JSON.stringify({ first_name: firstName, last_name: lastName, phone, organization_name: organizationName, city, bio, is_diaspora: isDiaspora, country: isDiaspora ? country : "" }),
      })
      await refreshUser()
      setSaved(true)
      setIsEditing(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError("Certaines informations sont invalides. Vérifiez le formulaire.")
      } else {
        setError("Une erreur est survenue. Réessayez.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  const tabs: { key: TabKey; label: string; icon: typeof UserRound; alert?: boolean }[] = [
    ...(user.role === "PORTEUR"
      ? [{ key: "apercu" as const, label: "Vue d'ensemble", icon: LayoutDashboard }]
      : []),
    { key: "profil", label: "Informations personnelles", icon: UserRound },
    { key: "kyc", label: "Vérification d'identité", icon: IdCard, alert: user.kyc_status !== "VALIDE" },
    { key: "contributions", label: "Contributions", icon: WalletCards },
  ]

  let tabContent: ReactNode
  if (activeTab === "apercu") {
    tabContent = (
      <div className="space-y-6">
        <ScoreCard />
        <PassportSection />
      </div>
    )
  } else if (activeTab === "kyc") {
    tabContent = <KycSection status={user.kyc_status} role={user.role} />
  } else if (activeTab === "contributions") {
    tabContent = (
      <div className="space-y-6">
        <MyContributions />
        {user.role === "PORTEUR" && <ReceivedContributions />}
      </div>
    )
  } else {
    tabContent = (
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 rounded-[20px] border border-black/5 bg-surface p-5 shadow-sm sm:flex-row sm:items-center">
          <div>
            <p className="font-semibold text-ink">Photo de profil</p>
            <p className="mt-1 text-sm text-ink-muted">JPG, PNG ou WebP · 3 Mo maximum.</p>
            {avatarMessage && <p role="status" className="mt-2 text-sm text-emerald-700">{avatarMessage}</p>}
            {avatarError && <p role="alert" className="mt-2 text-sm text-red-700">{avatarError}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-gold px-4 text-sm font-semibold text-ink transition hover:bg-gold-light ${avatarBusy ? "pointer-events-none opacity-60" : ""}`}>
              {avatarBusy ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Camera aria-hidden="true" className="size-4" />}
              {user.avatar ? "Changer la photo" : "Ajouter une photo"}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void handleAvatarChange(event)} disabled={avatarBusy} className="sr-only" />
            </label>
            {user.avatar && <Button type="button" variant="outline" disabled={avatarBusy} onClick={() => void removeAvatar()} className="h-10 rounded-full border-red-200 text-red-700 hover:bg-red-50"><Trash2 aria-hidden="true" className="size-4" />Supprimer</Button>}
          </div>
        </div>

        {!user.email_verified && <div className="flex flex-col justify-between gap-4 rounded-[20px] border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center"><div><p className="font-semibold text-amber-900">Adresse e-mail non vérifiée</p><p className="mt-1 text-sm text-amber-800">Saisissez le code reçu par e-mail pour sécuriser votre compte.</p></div><Button asChild className="shrink-0 rounded-full bg-ink text-white"><Link to="/verifier-email">Vérifier maintenant</Link></Button></div>}

        <form
          data-testid="account-form"
          onSubmit={handleSubmit}
          noValidate
          className="rounded-[20px] border border-black/5 bg-surface p-8 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.08)] sm:p-10"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-heading text-xl font-bold text-ink">Informations personnelles</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Votre adresse e-mail et votre rôle ne sont pas modifiables.
              </p>
            </div>
            {!isEditing && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="shrink-0 h-9 rounded-full border-black/15 px-4 text-sm font-semibold text-ink-secondary hover:text-ink"
              >
                <Pencil aria-hidden="true" className="size-3.5" />
                Modifier
              </Button>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}
          {saved && (
            <p
              role="status"
              className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
            >
              Vos informations ont été enregistrées.
            </p>
          )}

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-ink">
                Prénom
              </Label>
              <Input
                id="firstName"
                autoComplete="given-name"
                readOnly={!isEditing}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={`h-11 rounded-xl px-3.5 transition-colors ${!isEditing ? "cursor-default border-transparent bg-black/[0.03] shadow-none focus-visible:ring-0" : ""}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-ink">
                Nom
              </Label>
              <Input
                id="lastName"
                autoComplete="family-name"
                readOnly={!isEditing}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={`h-11 rounded-xl px-3.5 transition-colors ${!isEditing ? "cursor-default border-transparent bg-black/[0.03] shadow-none focus-visible:ring-0" : ""}`}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="phone" className="text-ink">
                Téléphone <span className="font-normal text-ink-muted">(facultatif)</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder={isEditing ? "+221 77 000 00 00" : "—"}
                readOnly={!isEditing}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`h-11 rounded-xl px-3.5 transition-colors ${!isEditing ? "cursor-default border-transparent bg-black/[0.03] shadow-none focus-visible:ring-0" : ""}`}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className={`flex items-start gap-3 text-sm text-ink-secondary ${isEditing ? "cursor-pointer" : "cursor-default"}`}>
                <input
                  type="checkbox"
                  checked={isDiaspora}
                  disabled={!isEditing}
                  onChange={(event) => setIsDiaspora(event.target.checked)}
                  className="mt-0.5 size-4 accent-[#d4a900] disabled:opacity-60"
                />
                <span>
                  <span className="font-medium text-ink">Je réside à l’étranger (diaspora)</span>
                  <br />
                  <span className="text-xs text-ink-muted">
                    Une vérification renforcée (justificatif de résidence et origine des
                    fonds) sera demandée dans l’onglet Vérification d’identité.
                  </span>
                </span>
              </label>
            </div>
            {isDiaspora && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="country" className="text-ink">
                  Pays de résidence
                </Label>
                {isEditing ? (
                  <select
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="h-11 w-full rounded-xl border border-input bg-transparent px-3.5 text-sm text-ink outline-none focus:ring-2 focus:ring-gold-dark/30"
                  >
                    <option value="">— Sélectionnez un pays —</option>
                    <optgroup label="Afrique de l’Ouest">
                      <option value="Sénégal">Sénégal</option>
                      <option value="Côte d’Ivoire">Côte d’Ivoire</option>
                      <option value="Mali">Mali</option>
                      <option value="Guinée">Guinée</option>
                      <option value="Mauritanie">Mauritanie</option>
                      <option value="Gambie">Gambie</option>
                      <option value="Ghana">Ghana</option>
                      <option value="Nigeria">Nigeria</option>
                      <option value="Bénin">Bénin</option>
                      <option value="Burkina Faso">Burkina Faso</option>
                      <option value="Togo">Togo</option>
                      <option value="Niger">Niger</option>
                      <option value="Cap-Vert">Cap-Vert</option>
                      <option value="Sierra Leone">Sierra Leone</option>
                      <option value="Liberia">Liberia</option>
                    </optgroup>
                    <optgroup label="Afrique centrale et du Nord">
                      <option value="Maroc">Maroc</option>
                      <option value="Algérie">Algérie</option>
                      <option value="Tunisie">Tunisie</option>
                      <option value="Égypte">Égypte</option>
                      <option value="Cameroun">Cameroun</option>
                      <option value="Gabon">Gabon</option>
                      <option value="Congo">Congo</option>
                      <option value="RD Congo">RD Congo</option>
                    </optgroup>
                    <optgroup label="Europe">
                      <option value="France">France</option>
                      <option value="Espagne">Espagne</option>
                      <option value="Italie">Italie</option>
                      <option value="Allemagne">Allemagne</option>
                      <option value="Belgique">Belgique</option>
                      <option value="Portugal">Portugal</option>
                      <option value="Pays-Bas">Pays-Bas</option>
                      <option value="Royaume-Uni">Royaume-Uni</option>
                      <option value="Suisse">Suisse</option>
                      <option value="Suède">Suède</option>
                      <option value="Norvège">Norvège</option>
                      <option value="Autriche">Autriche</option>
                    </optgroup>
                    <optgroup label="Amérique du Nord">
                      <option value="États-Unis">États-Unis</option>
                      <option value="Canada">Canada</option>
                    </optgroup>
                    <optgroup label="Moyen-Orient">
                      <option value="Arabie Saoudite">Arabie Saoudite</option>
                      <option value="Émirats arabes unis">Émirats arabes unis</option>
                      <option value="Qatar">Qatar</option>
                    </optgroup>
                    <optgroup label="Asie">
                      <option value="Chine">Chine</option>
                      <option value="Turquie">Turquie</option>
                    </optgroup>
                  </select>
                ) : (
                  <div className="flex h-11 items-center rounded-xl border-transparent bg-black/[0.03] px-3.5 text-sm text-ink">
                    {country || <span className="text-ink-muted">—</span>}
                  </div>
                )}
              </div>
            )}
            {user.role === "PORTEUR" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="organization">Organisation <span className="font-normal text-ink-muted">(facultatif)</span></Label>
                  <Input id="organization" readOnly={!isEditing} value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} placeholder={isEditing ? "Nom de l’association ou de l’activité" : "—"} className={`h-11 rounded-xl transition-colors ${!isEditing ? "cursor-default border-transparent bg-black/[0.03] shadow-none focus-visible:ring-0" : ""}`} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ville</Label>
                  <Input id="city" readOnly={!isEditing} value={city} onChange={(event) => setCity(event.target.value)} placeholder={isEditing ? "Dakar" : "—"} className={`h-11 rounded-xl transition-colors ${!isEditing ? "cursor-default border-transparent bg-black/[0.03] shadow-none focus-visible:ring-0" : ""}`} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="bio">Présentation publique</Label>
                  <textarea id="bio" rows={4} maxLength={700} readOnly={!isEditing} value={bio} onChange={(event) => setBio(event.target.value)} placeholder={isEditing ? "Présentez votre expérience et ce qui vous motive…" : "—"} className={`w-full rounded-xl border px-3 py-3 text-sm text-ink outline-none transition-colors ${isEditing ? "border-input bg-transparent focus:ring-2 focus:ring-gold-dark/30" : "cursor-default border-transparent bg-black/[0.03]"}`} />
                  {isEditing && <p className="text-right text-xs text-ink-muted">{bio.length}/700</p>}
                </div>
              </>
            )}
          </div>

          {isEditing && (
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                type="submit"
                disabled={submitting}
                className="h-12 rounded-full bg-gold px-8 text-base font-semibold text-ink shadow-md shadow-gold/25 transition-all hover:bg-gold-light hover:shadow-lg hover:shadow-gold/30"
              >
                {submitting ? "Enregistrement…" : "Enregistrer les modifications"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={cancelEdit}
                className="h-12 rounded-full px-8 text-base font-semibold"
              >
                Annuler
              </Button>
            </div>
          )}
        </form>
      </div>
    )
  }

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[24rem] bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(250,197,2,0.12),transparent)]"
      />

      <div className="relative mx-auto max-w-5xl px-4 pt-16 pb-24 sm:px-6 sm:pt-20">
        {/* En-tête compte */}
        <div className="animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards flex flex-col items-start gap-5 duration-700 motion-reduce:animate-none sm:flex-row sm:items-center">
          <UserAvatar user={user} size="lg" className="shadow-md shadow-black/10" />
          <div>
            <span className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">
              Mon compte
            </span>
            <h1 className="mt-1 font-heading text-3xl font-bold text-ink sm:text-4xl">
              Bonjour {user.first_name || "à vous"}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-secondary">
              <span className="rounded-full bg-gold/15 px-3 py-0.5 text-xs font-semibold text-gold-dark">
                {roleLabels[user.role]}
              </span>
              <span>{user.email}</span>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div
          role="tablist"
          aria-label="Sections de mon compte"
          className="mt-9 flex gap-2 overflow-x-auto border-b border-black/8 pb-px"
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`tab-${tab.key}`}
              aria-selected={activeTab === tab.key}
              aria-controls={`panel-${tab.key}`}
              onClick={() => goToTab(tab.key)}
              className={`relative flex items-center gap-2 rounded-t-xl px-4 py-3 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-gold-dark/50 ${
                activeTab === tab.key
                  ? "border-b-2 border-gold-dark text-ink"
                  : "border-b-2 border-transparent text-ink-secondary hover:text-ink"
              }`}
            >
              <tab.icon aria-hidden="true" className="size-4" />
              {tab.label}
              {tab.alert && (
                <span
                  aria-label="Action requise"
                  className="size-1.5 rounded-full bg-gold-dark"
                />
              )}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          className="animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards mt-6 duration-500 motion-reduce:animate-none"
        >
          {tabContent}
        </div>
      </div>
    </section>
  )
}

export default AccountPage
