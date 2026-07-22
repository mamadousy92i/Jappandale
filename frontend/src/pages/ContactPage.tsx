import { useState } from "react"
import type { FormEvent } from "react"
import { CircleCheck, Headphones } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"

export default function ContactPage() {
  const { user, authFetch } = useAuth()
  const [name, setName] = useState(user ? `${user.first_name} ${user.last_name}`.trim() : "")
  const [email, setEmail] = useState(user?.email ?? "")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const options = { method: "POST", body: JSON.stringify({ name, email, subject, message }) }
    try {
      if (user) await authFetch("/support/requests/", options)
      else await apiFetch("/support/requests/", options)
      setSent(true)
    } catch {
      setError("Votre demande n’a pas pu être envoyée. Vérifiez les informations saisies.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto grid max-w-5xl gap-12 px-6 py-16 sm:py-24 lg:grid-cols-[0.8fr_1.2fr]">
      <div>
        <Headphones className="size-8 text-gold-dark" />
        <p className="mt-6 text-xs font-semibold tracking-[4px] text-gold-dark uppercase">Assistance</p>
        <h1 className="mt-4 font-heading text-4xl font-bold text-ink sm:text-5xl">Comment pouvons-nous vous aider ?</h1>
        <p className="mt-6 leading-relaxed text-ink-secondary">Une question sur une campagne, le KYC ou une contribution ? Décrivez votre situation sans transmettre de mot de passe ni de donnée bancaire.</p>
        <div className="mt-8 border-l-4 border-gold bg-[#fbfaf6] p-5 text-sm leading-relaxed text-ink-secondary">Pour signaler un contenu préoccupant, utilisez plutôt le bouton « Signaler » présent sur la campagne concernée.</div>
      </div>
      {sent ? (
        <div className="flex min-h-80 flex-col items-center justify-center rounded-[20px] border border-black/5 bg-surface p-8 text-center shadow-sm">
          <CircleCheck className="size-12 text-emerald-600" />
          <h2 className="mt-5 font-heading text-2xl font-bold text-ink">Demande bien reçue</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-secondary">Elle est maintenant enregistrée dans l’espace d’assistance de Jappandale.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5 rounded-[20px] border border-black/5 bg-surface p-7 shadow-sm sm:p-9">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="name">Nom complet</Label><Input id="name" required maxLength={150} value={name} onChange={(event) => setName(event.target.value)} className="h-11 rounded-xl" /></div>
            <div className="space-y-2"><Label htmlFor="contact-email">Adresse e-mail</Label><Input id="contact-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 rounded-xl" /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="subject">Objet</Label><Input id="subject" required maxLength={160} value={subject} onChange={(event) => setSubject(event.target.value)} className="h-11 rounded-xl" /></div>
          <div className="space-y-2"><Label htmlFor="message">Votre message</Label><textarea id="message" required minLength={10} maxLength={3000} rows={8} value={message} onChange={(event) => setMessage(event.target.value)} className="w-full resize-y rounded-xl border border-input bg-transparent px-3 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-gold-dark/30" /></div>
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <Button type="submit" disabled={submitting} className="h-12 w-full rounded-full bg-gold text-ink hover:bg-gold-light">{submitting ? "Envoi…" : "Envoyer la demande"}</Button>
        </form>
      )}
    </section>
  )
}
