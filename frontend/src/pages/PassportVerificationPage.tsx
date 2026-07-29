import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { BadgeCheck, ScrollText, ShieldAlert } from "lucide-react"

import { ApiError, apiFetch } from "@/lib/api"
import { formatFcfa } from "@/lib/format"
import type { PassportVerification } from "@/lib/types"

export default function PassportVerificationPage() {
  const { verificationId } = useParams<{ verificationId: string }>()
  const [verification, setVerification] = useState<PassportVerification | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    apiFetch(`/passeport/verifier/${verificationId}/`)
      .then((data) => setVerification(data as PassportVerification))
      .catch((error: unknown) => {
        setNotFound(error instanceof ApiError ? error.status === 404 : false)
      })
      .finally(() => setLoading(false))
  }, [verificationId])

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6" aria-busy="true">
        <div className="h-64 animate-pulse rounded-[24px] bg-black/[0.05]" />
      </div>
    )
  }

  if (!verification) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center sm:px-6">
        <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <ShieldAlert className="size-6" />
        </span>
        <h1 className="mt-5 font-heading text-2xl font-bold text-ink">Document introuvable</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
          {notFound
            ? "Cet identifiant de vérification ne correspond à aucun Passeport Financier Jappandale."
            : "Impossible de vérifier ce document pour le moment."}
        </p>
        <Link to="/" className="mt-8 font-semibold text-gold-dark hover:underline">
          Retour à l'accueil
        </Link>
      </div>
    )
  }

  const { resume } = verification

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <BadgeCheck className="size-6 shrink-0 text-emerald-600" />
        <div>
          <p className="font-heading text-lg font-bold text-ink">Document authentique</p>
          <p className="text-sm text-emerald-800">
            Ce Passeport Financier a été émis par Jappandale le{" "}
            {new Date(verification.genere_le).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            .
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-[20px] border border-black/5 bg-surface p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold-dark">
            <ScrollText className="size-5" />
          </span>
          <div>
            <p className="font-heading text-lg font-bold text-ink">{verification.porteur}</p>
            <p className="text-sm text-ink-muted">Score Jappandale® : {resume.score} / 100</p>
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-ink-muted">Campagnes créées</dt>
            <dd className="font-heading text-xl font-bold text-ink">{resume.campaigns_total}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Clôturées avec succès</dt>
            <dd className="font-heading text-xl font-bold text-ink">{resume.campaigns_closed_success}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Montant collecté</dt>
            <dd className="font-heading text-xl font-bold text-ink">{formatFcfa(resume.total_collected)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Financeurs distincts</dt>
            <dd className="font-heading text-xl font-bold text-ink">{resume.distinct_contributors}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
