import { useEffect, useState } from "react"
import { Download, ScrollText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"
import { formatFcfa } from "@/lib/format"
import type { PassportData } from "@/lib/types"

export function PassportSection() {
  const { authFetch, authFetchBlob } = useAuth()
  const [data, setData] = useState<PassportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    authFetch("/passeport/mine/")
      .then((result) => setData(result as PassportData))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [authFetch])

  const exportPdf = async () => {
    setExporting(true)
    setError(null)
    try {
      const blob = await authFetchBlob("/passeport/mine/export/", { method: "POST" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "passeport-financier-jappandale.pdf"
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      setError("Impossible de générer le PDF pour le moment. Réessayez.")
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-[20px] bg-black/[0.05]" />
  }

  if (!data) return null

  return (
    <div className="rounded-[20px] border border-black/5 bg-surface p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold-dark">
            <ScrollText className="size-5" />
          </span>
          <div>
            <p className="font-heading text-lg font-bold text-ink">Passeport Financier Jappandale®</p>
            <p className="text-sm text-ink-muted">Votre historique consolidé, exportable et vérifiable.</p>
          </div>
        </div>
        <Button
          type="button"
          disabled={exporting}
          onClick={() => void exportPdf()}
          className="rounded-full bg-gold px-4 text-ink hover:bg-gold-light"
        >
          <Download className="size-4" />
          {exporting ? "Génération…" : "Exporter en PDF"}
        </Button>
      </div>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-ink-muted">Campagnes créées</dt>
          <dd className="font-heading text-xl font-bold text-ink">{data.campaigns_total}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Clôturées avec succès</dt>
          <dd className="font-heading text-xl font-bold text-ink">{data.campaigns_closed_success}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Montant collecté</dt>
          <dd className="font-heading text-xl font-bold text-ink">{formatFcfa(data.total_collected)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Financeurs distincts</dt>
          <dd className="font-heading text-xl font-bold text-ink">{data.distinct_contributors}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Contributions reçues</dt>
          <dd className="font-heading text-xl font-bold text-ink">{data.confirmed_contributions_count}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Litiges reçus</dt>
          <dd className="font-heading text-xl font-bold text-ink">{data.disputes_received}</dd>
        </div>
      </dl>
    </div>
  )
}
