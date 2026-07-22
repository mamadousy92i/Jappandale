import { useState } from "react"
import type { FormEvent } from "react"
import { MailCheck } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiFetch } from "@/lib/api"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await apiFetch("/auth/password-reset/", { method: "POST", body: JSON.stringify({ email }) })
      setSent(true)
    } catch {
      setError("La demande n’a pas pu être traitée. Réessayez dans quelques instants.")
    } finally {
      setSubmitting(false)
    }
  }

  return <section className="mx-auto max-w-md px-6 py-20 sm:py-28">{sent ? <div className="text-center"><MailCheck className="mx-auto size-12 text-emerald-600" /><h1 className="mt-6 font-heading text-3xl font-bold text-ink">Consultez votre messagerie</h1><p className="mt-4 leading-relaxed text-ink-secondary">Si un compte correspond à cette adresse, vous recevrez un lien valable pendant une heure.</p><Link to="/connexion" className="mt-8 inline-block font-semibold text-gold-dark hover:underline">Retour à la connexion</Link></div> : <><p className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">Accès au compte</p><h1 className="mt-4 font-heading text-4xl font-bold text-ink">Mot de passe oublié ?</h1><p className="mt-4 leading-relaxed text-ink-secondary">Indiquez l’adresse associée à votre compte. Nous vous enverrons un lien sécurisé.</p><form onSubmit={submit} className="mt-9 rounded-[20px] border border-black/5 bg-surface p-8 shadow-sm"><div className="space-y-2"><Label htmlFor="reset-email">Adresse e-mail</Label><Input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 rounded-xl" /></div>{error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<Button type="submit" disabled={submitting} className="mt-7 h-12 w-full rounded-full bg-gold text-ink hover:bg-gold-light">{submitting ? "Envoi…" : "Recevoir le lien"}</Button></form></>}</section>
}
