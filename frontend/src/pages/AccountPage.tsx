import { useState } from "react"
import type { FormEvent } from "react"

import { KycSection } from "@/components/account/KycSection"
import { MyCampaigns } from "@/components/account/MyCampaigns"
import { MyContributions } from "@/components/account/MyContributions"
import { ReceivedContributions } from "@/components/account/ReceivedContributions"
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

function AccountPage() {
  const { user, authFetch, refreshUser } = useAuth()

  const [firstName, setFirstName] = useState(user?.first_name ?? "")
  const [lastName, setLastName] = useState(user?.last_name ?? "")
  const [phone, setPhone] = useState(user?.phone ?? "")
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // La route est protégée par RequireAuth : user est garanti non nul ici.
  if (!user) return null

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSaved(false)
    setSubmitting(true)
    try {
      await authFetch("/auth/me/", {
        method: "PATCH",
        body: JSON.stringify({ first_name: firstName, last_name: lastName, phone }),
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

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[24rem] bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(250,197,2,0.12),transparent)]"
      />

      <div className="relative mx-auto max-w-3xl px-6 pt-16 pb-24 sm:pt-20">
        {/* En-tête compte */}
        <div className="animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards flex flex-col items-start gap-4 duration-700 motion-reduce:animate-none sm:flex-row sm:items-center sm:gap-5">
          <span
            aria-hidden="true"
            className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gold/15 font-heading text-2xl font-bold text-gold-dark"
          >
            {(user.first_name || user.email).charAt(0).toUpperCase()}
          </span>
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

        {/* Formulaire de profil */}
        <form
          data-testid="account-form"
          onSubmit={handleSubmit}
          noValidate
          className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards mt-10 rounded-[20px] border border-black/5 bg-surface p-8 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.08)] delay-150 duration-700 motion-reduce:animate-none sm:p-10"
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
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="mt-8 h-12 rounded-full bg-gold px-8 text-base font-semibold text-ink shadow-md shadow-gold/25 transition-all hover:bg-gold-light hover:shadow-lg hover:shadow-gold/30"
          >
            {submitting ? "Enregistrement…" : "Enregistrer les modifications"}
          </Button>
        </form>

        {/* Vérification d'identité (KYC) */}
        <div className="animate-in fade-in fill-mode-backwards mt-6 delay-300 duration-700 motion-reduce:animate-none">
          <KycSection status={user.kyc_status} role={user.role} />
        </div>

        {/* Mes campagnes (porteurs uniquement) */}
        {user.role === "PORTEUR" && (
          <div className="animate-in fade-in fill-mode-backwards mt-6 delay-500 duration-700 motion-reduce:animate-none">
            <MyCampaigns />
          </div>
        )}

        <div className="animate-in fade-in fill-mode-backwards mt-6 delay-500 duration-700 motion-reduce:animate-none">
          <MyContributions />
        </div>

        {user.role === "PORTEUR" && (
          <div className="animate-in fade-in fill-mode-backwards mt-6 delay-500 duration-700 motion-reduce:animate-none">
            <ReceivedContributions />
          </div>
        )}
      </div>
    </section>
  )
}

export default AccountPage
