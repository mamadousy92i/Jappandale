import { useState } from "react"
import type { ChangeEvent, FormEvent, ReactNode } from "react"
import { Camera, IdCard, LoaderCircle, Trash2, UserRound, WalletCards } from "lucide-react"
import { Link, useSearchParams } from "react-router-dom"

import { KycSection } from "@/components/account/KycSection"
import { MyContributions } from "@/components/account/MyContributions"
import { ReceivedContributions } from "@/components/account/ReceivedContributions"
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

type TabKey = "profil" | "kyc" | "contributions"

function AccountPage() {
  const { user, authFetch, refreshUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [firstName, setFirstName] = useState(user?.first_name ?? "")
  const [lastName, setLastName] = useState(user?.last_name ?? "")
  const [phone, setPhone] = useState(user?.phone ?? "")
  const [organizationName, setOrganizationName] = useState(user?.organization_name ?? "")
  const [city, setCity] = useState(user?.city ?? "")
  const [bio, setBio] = useState(user?.bio ?? "")
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  // La route est protégée par RequireAuth : user est garanti non nul ici.
  if (!user) return null

  const requestedTab = searchParams.get("onglet")
  const activeTab: TabKey =
    requestedTab === "kyc" || requestedTab === "contributions" ? requestedTab : "profil"

  const goToTab = (tab: TabKey) => {
    setSearchParams(tab === "profil" ? {} : { onglet: tab })
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSaved(false)
    setSubmitting(true)
    try {
      await authFetch("/auth/me/", {
        method: "PATCH",
        body: JSON.stringify({ first_name: firstName, last_name: lastName, phone, organization_name: organizationName, city, bio }),
      })
      await refreshUser()
      setSaved(true)
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
    { key: "profil", label: "Informations personnelles", icon: UserRound },
    { key: "kyc", label: "Vérification d'identité", icon: IdCard, alert: user.kyc_status !== "VALIDE" },
    { key: "contributions", label: "Contributions", icon: WalletCards },
  ]

  let tabContent: ReactNode
  if (activeTab === "kyc") {
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
          <h2 className="font-heading text-xl font-bold text-ink">Informations personnelles</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Votre adresse e-mail et votre rôle ne sont pas modifiables.
          </p>

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
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-11 rounded-xl px-3.5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-ink">
                Nom
              </Label>
              <Input
                id="lastName"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-11 rounded-xl px-3.5"
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
                placeholder="+221 77 000 00 00"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-11 rounded-xl px-3.5"
              />
            </div>
            {user.role === "PORTEUR" && <><div className="space-y-2"><Label htmlFor="organization">Organisation <span className="font-normal text-ink-muted">(facultatif)</span></Label><Input id="organization" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} placeholder="Nom de l’association ou de l’activité" className="h-11 rounded-xl" /></div><div className="space-y-2"><Label htmlFor="city">Ville</Label><Input id="city" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Dakar" className="h-11 rounded-xl" /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="bio">Présentation publique</Label><textarea id="bio" rows={4} maxLength={700} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Présentez votre expérience et ce qui vous motive…" className="w-full rounded-xl border border-input bg-transparent px-3 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-gold-dark/30" /><p className="text-right text-xs text-ink-muted">{bio.length}/700</p></div></>}
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="mt-8 h-12 rounded-full bg-gold px-8 text-base font-semibold text-ink shadow-md shadow-gold/25 transition-all hover:bg-gold-light hover:shadow-lg hover:shadow-gold/30"
          >
            {submitting ? "Enregistrement…" : "Enregistrer les modifications"}
          </Button>
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

      <div className="relative mx-auto max-w-3xl px-6 pt-16 pb-24 sm:pt-20">
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
          className="mt-9 flex flex-wrap gap-2 border-b border-black/8 pb-px"
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
