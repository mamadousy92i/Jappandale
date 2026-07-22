import { useState } from "react"
import type { FormEvent } from "react"
import { CircleCheck } from "lucide-react"
import { Link, useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiFetch } from "@/lib/api"

export default function ResetPasswordPage() {
  const { uid, token } = useParams<{ uid: string; token: string }>()
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (password !== confirmation) return setError("Les deux mots de passe ne correspondent pas.")
    setSubmitting(true)
    setError(null)
    try {
      await apiFetch("/auth/password-reset/confirm/", {
        method: "POST",
        body: JSON.stringify({ uid, token, new_password: password }),
      })
      setSuccess(true)
    } catch {
      setError("Ce lien est invalide, expiré ou le mot de passe choisi est insuffisamment sécurisé.")
    } finally {
      setSubmitting(false)
    }
  }

  if (success) return <section className="mx-auto max-w-md px-6 py-24 text-center"><CircleCheck className="mx-auto size-12 text-emerald-600" /><h1 className="mt-6 font-heading text-3xl font-bold text-ink">Mot de passe mis à jour</h1><p className="mt-4 text-ink-secondary">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p><Button asChild className="mt-8 rounded-full bg-gold text-ink hover:bg-gold-light"><Link to="/connexion">Se connecter</Link></Button></section>

  return <section className="mx-auto max-w-md px-6 py-20 sm:py-28"><p className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">Sécurité du compte</p><h1 className="mt-4 font-heading text-4xl font-bold text-ink">Choisir un nouveau mot de passe</h1><p className="mt-4 text-sm leading-relaxed text-ink-secondary">Utilisez au moins 8 caractères et évitez un mot de passe trop courant.</p><form onSubmit={submit} className="mt-9 space-y-5 rounded-[20px] border border-black/5 bg-surface p-8 shadow-sm"><div className="space-y-2"><Label htmlFor="new-password">Nouveau mot de passe</Label><Input id="new-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 rounded-xl" /></div><div className="space-y-2"><Label htmlFor="confirm-password">Confirmer le mot de passe</Label><Input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="h-11 rounded-xl" /></div>{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<Button type="submit" disabled={submitting} className="h-12 w-full rounded-full bg-gold text-ink hover:bg-gold-light">{submitting ? "Mise à jour…" : "Mettre à jour"}</Button></form></section>
}
