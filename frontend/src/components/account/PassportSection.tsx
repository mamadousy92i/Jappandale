import { useEffect, useState } from "react"
import { Copy, Download, Eye, EyeOff, ScrollText } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"
import { formatFcfa } from "@/lib/format"
import type { PassportData, PassportExport } from "@/lib/types"

export function PassportSection() {
  const { t } = useTranslation("account")
  const { authFetch, authFetchBlob } = useAuth()
  const [data, setData] = useState<PassportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exports, setExports] = useState<PassportExport[]>([])
  const [updatingExportId, setUpdatingExportId] = useState<string | null>(null)

  const loadExports = () =>
    authFetch("/passeport/mine/exports/")
      .then((result) => setExports(result as PassportExport[]))
      .catch(() => setExports([]))

  useEffect(() => {
    authFetch("/passeport/mine/")
      .then((result) => setData(result as PassportData))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [authFetch])

  useEffect(() => {
    void loadExports()
    // authFetch changes only when the authenticated session changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      await loadExports()
    } catch {
      setError(t("passport.exportError"))
    } finally {
      setExporting(false)
    }
  }

  const setSharing = async (exportItem: PassportExport, is_shared: boolean) => {
    setUpdatingExportId(exportItem.verification_id)
    setError(null)
    try {
      await authFetch(`/passeport/mine/exports/${exportItem.verification_id}/sharing/`, {
        method: "PATCH",
        body: JSON.stringify({ is_shared }),
      })
      await loadExports()
    } catch {
      setError(t("passport.sharingError"))
    } finally {
      setUpdatingExportId(null)
    }
  }

  const copyVerificationLink = async (verificationId: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/passeport/verifier/${verificationId}`)
    } catch {
      setError(t("passport.copyError"))
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
            <p className="font-heading text-lg font-bold text-ink">{t("passport.title")}</p>
            <p className="text-sm text-ink-muted">{t("passport.subtitle")}</p>
          </div>
        </div>
        <Button
          type="button"
          disabled={exporting}
          onClick={() => void exportPdf()}
          className="rounded-full bg-gold px-4 text-ink hover:bg-gold-light"
        >
          <Download className="size-4" />
          {exporting ? t("passport.exporting") : t("passport.export")}
        </Button>
      </div>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-ink-muted">{t("passport.stats.campaignsTotal")}</dt>
          <dd className="font-heading text-xl font-bold text-ink">{data.campaigns_total}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{t("passport.stats.campaignsSuccess")}</dt>
          <dd className="font-heading text-xl font-bold text-ink">{data.campaigns_closed_success}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{t("passport.stats.totalCollected")}</dt>
          <dd className="font-heading text-xl font-bold text-ink">{formatFcfa(data.total_collected)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{t("passport.stats.distinctContributors")}</dt>
          <dd className="font-heading text-xl font-bold text-ink">{data.distinct_contributors}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{t("passport.stats.confirmedContributions")}</dt>
          <dd className="font-heading text-xl font-bold text-ink">{data.confirmed_contributions_count}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{t("passport.stats.disputesReceived")}</dt>
          <dd className="font-heading text-xl font-bold text-ink">{data.disputes_received}</dd>
        </div>
      </dl>
      {exports.length > 0 && (
        <section className="mt-7 border-t border-black/5 pt-6" aria-labelledby="passport-exports-title">
          <h3 id="passport-exports-title" className="font-heading text-lg font-bold text-ink">{t("passport.exportsTitle")}</h3>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t("passport.exportsHint")}</p>
          <ul className="mt-4 space-y-3">
            {exports.map((exportItem) => (
              <li key={exportItem.verification_id} className="rounded-xl border border-black/5 bg-surface-alt p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-sm font-semibold text-ink">{t("passport.exportDate", { date: new Date(exportItem.generated_at).toLocaleDateString("fr-FR") })}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                      {exportItem.is_shared ? <Eye className="size-3.5 text-emerald-700" /> : <EyeOff className="size-3.5" />}
                      {exportItem.is_shared ? t("passport.linkActive") : t("passport.linkPrivate")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {exportItem.is_shared && (
                      <Button type="button" variant="outline" onClick={() => void copyVerificationLink(exportItem.verification_id)} className="h-10 rounded-full text-xs">
                        <Copy className="size-3.5" /> {t("passport.copyLink")}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant={exportItem.is_shared ? "outline" : "default"}
                      disabled={updatingExportId === exportItem.verification_id}
                      onClick={() => void setSharing(exportItem, !exportItem.is_shared)}
                      className={exportItem.is_shared ? "h-10 rounded-full text-xs" : "h-10 rounded-full bg-gold text-xs text-ink hover:bg-gold-light"}
                    >
                      {exportItem.is_shared ? t("passport.makePrivate") : t("passport.allowSharing")}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
