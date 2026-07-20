import { useState } from "react"
import type { FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { RegisterData } from "@/lib/types"

type RegisterRole = RegisterData["role"]

const roleOptions: {
  value: RegisterRole
  title: string
  description: string
}[] = [
  {
    value: "PORTEUR",
    title: "Je porte un projet",
    description: "Je souhaite collecter des fonds pour donner vie à mon idée.",
  },
  {
    value: "CONTRIBUTEUR",
    title: "Je veux contribuer",
    description: "Je souhaite soutenir les projets qui me tiennent à cœur.",
  },
]

const fieldLabels: Record<string, string> = {
  first_name: "Prénom",
  last_name: "Nom",
  email: "Adresse e-mail",
  password: "Mot de passe",
  phone: "Téléphone",
  role: "Profil",
}

function toMessage(value: unknown): string {
  if (Array.isArray(value)) return value.join(" ")
  return String(value)
}

function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState<RegisterRole>("CONTRIBUTEUR")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFieldErrors({})
    setGlobalError(null)
    setSubmitting(true)

    const data: RegisterData = {
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      role,
      ...(phone.trim() ? { phone: phone.trim() } : {}),
    }

    try {
      await register(data)
      navigate("/compte")
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        const nextErrors: Record<string, string> = {}
        for (const [key, value] of Object.entries(err.details)) {
          if (key in fieldLabels) nextErrors[key] = toMessage(value)
        }
        if (Object.keys(nextErrors).length > 0) {
          setFieldErrors(nextErrors)
        } else {
          setGlobalError("Une erreur est survenue. Réessayez.")
        }
      } else {
        setGlobalError("Une erreur est survenue. Réessayez.")
      }
      setSubmitting(false)
    }
  }

  const errorFor = (name: string) =>
    fieldErrors[name] ? (
      <p id={`${name}-error`} role="alert" className="text-sm text-red-600">
        {fieldErrors[name]}
      </p>
    ) : null

  const invalidProps = (name: string) =>
    fieldErrors[name]
      ? { "aria-invalid": true as const, "aria-describedby": `${name}-error` }
      : {}

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(250,197,2,0.14),transparent)]"
      />

      <div className="relative mx-auto flex max-w-lg flex-col items-center px-6 pt-16 pb-24 sm:pt-24 sm:pb-32">
        <div className="animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards flex flex-col items-center text-center duration-700 motion-reduce:animate-none">
          <span className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">
            Rejoindre Jappandale
          </span>
          <h1 className="mt-4 font-heading text-3xl font-bold text-ink sm:text-4xl">
            Créez votre compte
          </h1>
          <div
            aria-hidden="true"
            className="mt-6 h-[3px] w-16 rounded-full bg-gradient-to-r from-gold to-gold-dark"
          />
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-ink-secondary">
            Quelques instants suffisent pour rejoindre la communauté et faire
            avancer les projets d'ici.
          </p>
        </div>

        <form
          data-testid="register-form"
          onSubmit={handleSubmit}
          noValidate
          className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards mt-10 w-full rounded-[20px] border border-black/5 bg-surface p-8 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.08)] delay-150 duration-700 motion-reduce:animate-none sm:p-10"
        >
          {globalError && (
            <p
              role="alert"
              className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {globalError}
            </p>
          )}

          <fieldset className="space-y-3">
            <legend className="mb-3 text-sm leading-none font-medium text-ink">
              Vous êtes…
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {roleOptions.map((option) => (
                <label
                  key={option.value}
                  className="cursor-pointer rounded-2xl border border-black/10 bg-surface p-4 transition-all duration-200 hover:border-gold/50 has-checked:border-gold has-checked:bg-gold/8 has-focus-visible:ring-2 has-focus-visible:ring-gold-dark/50 motion-reduce:transition-none"
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={role === option.value}
                    onChange={() => setRole(option.value)}
                    className="sr-only"
                  />
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ink">
                      {option.title}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        role === option.value
                          ? "border-gold-dark bg-gold-dark"
                          : "border-black/20 bg-surface"
                      }`}
                    >
                      {role === option.value && (
                        <span className="size-1.5 rounded-full bg-surface" />
                      )}
                    </span>
                  </span>
                  <span className="mt-1.5 block text-xs leading-relaxed text-ink-secondary">
                    {option.description}
                  </span>
                </label>
              ))}
            </div>
            {errorFor("role")}
          </fieldset>

          <div className="mt-7 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-ink">
                  Prénom
                </Label>
                <Input
                  id="first_name"
                  autoComplete="given-name"
                  required
                  placeholder="Awa"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-11 rounded-xl px-3.5"
                  {...invalidProps("first_name")}
                />
                {errorFor("first_name")}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-ink">
                  Nom
                </Label>
                <Input
                  id="last_name"
                  autoComplete="family-name"
                  required
                  placeholder="Diop"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-11 rounded-xl px-3.5"
                  {...invalidProps("last_name")}
                />
                {errorFor("last_name")}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-ink">
                Adresse e-mail
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="vous@exemple.sn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-xl px-3.5"
                {...invalidProps("email")}
              />
              {errorFor("email")}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-ink">
                Mot de passe
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="8 caractères minimum"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-xl px-3.5"
                {...invalidProps("password")}
              />
              {errorFor("password")}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-ink">
                Téléphone{" "}
                <span className="font-normal text-ink-muted">(optionnel)</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+221 77 000 00 00"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-11 rounded-xl px-3.5"
                {...invalidProps("phone")}
              />
              {errorFor("phone")}
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="mt-8 h-12 w-full rounded-full bg-gold text-base font-semibold text-ink shadow-md shadow-gold/25 transition-all hover:bg-gold-light hover:shadow-lg hover:shadow-gold/30"
          >
            {submitting ? "Création du compte…" : "Créer mon compte"}
          </Button>
        </form>

        <p className="animate-in fade-in fill-mode-backwards mt-8 text-sm text-ink-secondary delay-300 duration-700 motion-reduce:animate-none">
          Déjà un compte ?{" "}
          <Link
            to="/connexion"
            className="rounded-sm font-semibold text-gold-dark underline-offset-4 transition-colors outline-none hover:text-ink hover:underline focus-visible:ring-2 focus-visible:ring-gold-dark/50"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </section>
  )
}

export default RegisterPage
