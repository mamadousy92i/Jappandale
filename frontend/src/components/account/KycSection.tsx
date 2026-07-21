import { useState } from "react"
import type { FormEvent } from "react"
import { CheckCircle2, Clock, ShieldCheck, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { KycStatus } from "@/lib/types"

const documentTypes = [
  { value: "CNI", label: "Carte nationale d'identité" },
  { value: "PASSEPORT", label: "Passeport" },
  { value: "JUSTIFICATIF_ACTIVITE", label: "Justificatif d'activité" },
]

function StatutValide() {
  return (
    <div className="flex items-start gap-4 rounded-[20px] border border-emerald-200 bg-emerald-50 p-6">
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"
      >
        <CheckCircle2 className="size-5" />
      </span>
      <div>
        <p className="font-heading text-lg font-bold text-ink">Identité vérifiée</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
          Votre identité a été validée. Vous pouvez créer des campagnes et contribuer en
          toute confiance.
        </p>
      </div>
    </div>
  )
}

function StatutEnAttente() {
  return (
    <div className="flex items-start gap-4 rounded-[20px] border border-black/5 bg-surface-alt p-6">
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold-dark"
      >
        <Clock className="size-5" />
      </span>
      <div>
        <p className="font-heading text-lg font-bold text-ink">Dossier en cours de vérification</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
          Nos équipes examinent vos documents. Vous serez informé dès que votre identité
          sera validée.
        </p>
      </div>
    </div>
  )
}

function FormulaireUpload({ rejete }: { rejete: boolean }) {
  const { authFetch, refreshUser } = useAuth()
  const [documentType, setDocumentType] = useState(documentTypes[0].value)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!file) {
      setError("Veuillez sélectionner un fichier.")
      return
    }
    setSubmitting(true)
    try {
      const data = new FormData()
      data.append("document_type", documentType)
      data.append("file", file)
      await authFetch("/kyc/submit/", { method: "POST", body: data })
      await refreshUser()
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError("Le document envoyé est invalide. Vérifiez le fichier et le type de pièce.")
      } else {
        setError("Une erreur est survenue. Réessayez.")
      }
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-[20px] border border-black/5 bg-surface-alt p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold-dark"
        >
          <ShieldCheck className="size-5" />
        </span>
        <div>
          <p className="font-heading text-lg font-bold text-ink">Vérifiez votre identité</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
            {rejete
              ? "Votre dossier précédent n'a pas pu être validé. Envoyez un nouveau document lisible."
              : "Envoyez une pièce d'identité pour pouvoir créer des campagnes et contribuer."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="documentType" className="text-ink">
            Type de pièce
          </Label>
          <select
            id="documentType"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="h-11 w-full rounded-xl border border-black/10 bg-surface px-3.5 text-sm text-ink outline-none focus-visible:border-gold-dark focus-visible:ring-2 focus-visible:ring-gold-dark/30"
          >
            {documentTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="kycFile" className="text-ink">
            Document (image ou PDF)
          </Label>
          <input
            id="kycFile"
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full rounded-xl border border-black/10 bg-surface text-sm text-ink-secondary file:mr-4 file:cursor-pointer file:border-0 file:bg-gold/15 file:px-4 file:py-2.5 file:font-medium file:text-gold-dark hover:file:bg-gold/25"
          />
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="h-11 rounded-full bg-gold px-6 font-semibold text-ink shadow-md shadow-gold/25 transition-all hover:bg-gold-light hover:shadow-lg hover:shadow-gold/30"
        >
          <Upload aria-hidden="true" className="size-4" />
          {submitting ? "Envoi…" : "Envoyer mon document"}
        </Button>
      </form>
    </div>
  )
}

export function KycSection({ status }: { status: KycStatus }) {
  if (status === "VALIDE") return <StatutValide />
  if (status === "EN_ATTENTE") return <StatutEnAttente />
  return <FormulaireUpload rejete={status === "REJETE"} />
}
