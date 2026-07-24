import { useEffect, useState } from "react"
import { Camera, CheckCircle2, Circle, Clock, ShieldCheck, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { KycChecklistItem, KycDocumentType, KycStatus, Role } from "@/lib/types"

const documentTypeLabels: Record<KycDocumentType, string> = {
  CNI: "Carte nationale d'identité",
  PASSEPORT: "Passeport",
  SELFIE: "Selfie de vérification",
  JUSTIFICATIF_ACTIVITE: "Justificatif d'activité",
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

interface KycDocumentItem {
  id: number
  document_type: string
  document_type_display: string
}

interface KycStateResponse {
  kyc_status: KycStatus
  documents: KycDocumentItem[]
  checklist: KycChecklistItem[]
  is_complete: boolean
}

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

/** Carte d'une pièce déjà envoyée : coche verte, plus d'action possible. */
function RequirementDone({ item }: { item: KycChecklistItem }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
      <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-emerald-600" />
      <div>
        <p className="text-sm font-semibold text-ink">{capitalize(item.label)}</p>
        <p className="text-xs text-emerald-700">Document envoyé</p>
      </div>
    </div>
  )
}

/** Carte d'une pièce manquante : sélection du type (si plusieurs possibles) + envoi du fichier. */
function RequirementUpload({
  item,
  onUploaded,
}: {
  item: KycChecklistItem
  onUploaded: (state: KycStateResponse) => void
}) {
  const { authFetch } = useAuth()
  const [documentType, setDocumentType] = useState<KycDocumentType>(item.document_types[0])
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
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
      const state = (await authFetch("/kyc/submit/", {
        method: "POST",
        body: data,
      })) as KycStateResponse
      onUploaded(state)
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError("Le document envoyé est invalide. Vérifiez le fichier et le format.")
      } else {
        setError("Une erreur est survenue. Réessayez.")
      }
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-xl border border-black/10 bg-surface-alt/60 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <Circle aria-hidden="true" className="size-5 shrink-0 text-ink-muted" />
        <p className="text-sm font-semibold text-ink">{capitalize(item.label)}</p>
      </div>

      <div className="mt-4 space-y-3">
        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {error}
          </p>
        )}

        {item.document_types.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {item.document_types.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setDocumentType(type)}
                aria-pressed={documentType === type}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-gold-dark/50 ${
                  documentType === type
                    ? "bg-gold text-ink shadow-sm shadow-gold/25"
                    : "border border-black/10 bg-surface text-ink-secondary hover:border-gold/40 hover:text-ink"
                }`}
              >
                {documentTypeLabels[type]}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor={`kycFile-${item.key}`} className="sr-only">
            Document — {item.label}
          </Label>
          <input
            id={`kycFile-${item.key}`}
            type="file"
            accept={documentType === "SELFIE" ? "image/*" : "image/*,application/pdf"}
            capture={documentType === "SELFIE" ? "user" : undefined}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full rounded-xl border border-black/10 bg-surface text-sm text-ink-secondary file:mr-4 file:cursor-pointer file:border-0 file:bg-gold/15 file:px-4 file:py-2.5 file:font-medium file:text-gold-dark hover:file:bg-gold/25"
          />
          <p className="text-xs text-ink-muted">
            {documentType === "SELFIE" ? "JPG, PNG ou WebP" : "JPG, PNG, WebP ou PDF"} — 8 Mo maximum.
          </p>
          {documentType === "SELFIE" && (
            <p className="flex items-start gap-2 rounded-xl border border-gold/25 bg-gold/10 px-3.5 py-2.5 text-xs leading-relaxed text-ink-secondary">
              <Camera aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-gold-dark" />
              Sur mobile, cela ouvre directement votre caméra frontale. Prenez une photo
              de vous-même en pleine lumière, visage dégagé, sans lunettes de soleil ni
              couvre-chef.
            </p>
          )}
        </div>

        <Button
          type="button"
          onClick={() => void submit()}
          disabled={submitting}
          className="h-10 rounded-full bg-gold px-5 text-sm font-semibold text-ink shadow-md shadow-gold/25 transition-all hover:bg-gold-light hover:shadow-lg hover:shadow-gold/30"
        >
          <Upload aria-hidden="true" className="size-4" />
          {submitting ? "Envoi…" : "Envoyer ce document"}
        </Button>
      </div>
    </div>
  )
}

/** Liste des pièces requises : cochées une fois envoyées, sinon prêtes à recevoir un fichier. */
function RequirementsList({
  items,
  onUploaded,
}: {
  items: KycChecklistItem[]
  onUploaded: (state: KycStateResponse) => void
}) {
  if (items.length === 0) return null
  return (
    <div className="space-y-3">
      {items.map((item) =>
        item.satisfied ? (
          <RequirementDone key={item.key} item={item} />
        ) : (
          <RequirementUpload key={item.key} item={item} onUploaded={onUploaded} />
        ),
      )}
    </div>
  )
}

export function KycSection({ status, role }: { status: KycStatus; role: Role }) {
  const { authFetch } = useAuth()
  const [checklist, setChecklist] = useState<KycChecklistItem[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    authFetch("/kyc/")
      .then((data) => {
        const state = data as KycStateResponse
        setChecklist(state.checklist)
        setIsComplete(state.is_complete)
      })
      .catch(() => {
        setChecklist([])
        setIsComplete(false)
      })
      .finally(() => setLoaded(true))
  }, [authFetch])

  const handleUploaded = (state: KycStateResponse) => {
    setChecklist(state.checklist)
    setIsComplete(state.is_complete)
  }

  if (status === "VALIDE") return <StatutValide />

  const displayedChecklist = checklist.length > 0 ? checklist : placeholderChecklist(role)

  if (status === "EN_ATTENTE") {
    return (
      <div className="space-y-4">
        <StatutEnAttente />
        {isComplete ? (
          <p className="rounded-xl border border-black/5 bg-white px-4 py-3 text-sm text-ink-secondary">
            Toutes les pièces demandées ont été reçues. Votre dossier complet est en
            cours d'examen.
          </p>
        ) : (
          loaded && (
            <div className="rounded-[20px] border border-black/5 bg-surface-alt p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <span
                  aria-hidden="true"
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold-dark"
                >
                  <ShieldCheck className="size-5" />
                </span>
                <div>
                  <p className="font-heading text-lg font-bold text-ink">
                    Ajouter une pièce au dossier
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
                    Vous pouvez compléter le dossier pendant sa vérification.
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <RequirementsList items={displayedChecklist} onUploaded={handleUploaded} />
              </div>
            </div>
          )
        )}
      </div>
    )
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
            {status === "REJETE"
              ? "Votre dossier précédent n'a pas pu être validé. Envoyez de nouveaux documents lisibles."
              : "Envoyez les pièces ci-dessous pour pouvoir créer des campagnes et contribuer."}
          </p>
        </div>
      </div>
      <div className="mt-6">
        <RequirementsList items={displayedChecklist} onUploaded={handleUploaded} />
      </div>
    </div>
  )
}

function placeholderChecklist(role: Role): KycChecklistItem[] {
  const base: KycChecklistItem[] = [
    {
      key: "identite",
      label: "une carte nationale d'identité ou un passeport",
      document_types: ["CNI", "PASSEPORT"],
      satisfied: false,
    },
    {
      key: "selfie",
      label: "un selfie de vérification",
      document_types: ["SELFIE"],
      satisfied: false,
    },
  ]
  if (role === "PORTEUR") {
    base.push({
      key: "activite",
      label: "un justificatif d'activité",
      document_types: ["JUSTIFICATIF_ACTIVITE"],
      satisfied: false,
    })
  }
  return base
}
