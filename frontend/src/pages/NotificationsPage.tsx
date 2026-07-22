import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Bell, CheckCheck, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"
import type { Notification } from "@/lib/types"

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function NotificationsPage() {
  const { authFetch } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    authFetch("/notifications/")
      .then((data) => setNotifications(data as Notification[]))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [authFetch])

  useEffect(() => load(), [load])

  const markRead = async (notification: Notification) => {
    if (notification.is_read) return
    await authFetch(`/notifications/${notification.id}/read/`, { method: "POST" })
    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, is_read: true } : item
      )
    )
  }

  const markAllRead = async () => {
    await authFetch("/notifications/read-all/", { method: "POST" })
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })))
  }

  const hasUnread = notifications.some((notification) => !notification.is_read)

  return (
    <section className="mx-auto max-w-3xl px-6 py-14 sm:py-20">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">Mon espace</p>
          <h1 className="mt-2 font-heading text-3xl font-bold text-ink sm:text-4xl">Notifications</h1>
          <p className="mt-2 text-sm text-ink-secondary">Décisions KYC, campagnes et activité de vos contributions.</p>
        </div>
        {hasUnread && (
          <Button variant="outline" onClick={() => void markAllRead()} className="rounded-full border-black/10">
            <CheckCheck className="size-4" />Tout marquer comme lu
          </Button>
        )}
      </div>

      {loading ? (
        <div className="mt-9 space-y-3" aria-hidden="true">{[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-black/[0.05]" />)}</div>
      ) : error ? (
        <div className="mt-9 rounded-2xl border border-red-100 bg-red-50 p-6"><p className="text-sm text-red-700">Impossible de charger vos notifications.</p><Button onClick={load} variant="outline" size="sm" className="mt-4 rounded-full"><RefreshCw className="size-3.5" />Réessayer</Button></div>
      ) : notifications.length === 0 ? (
        <div className="mt-9 rounded-[24px] border border-dashed border-black/10 bg-surface-alt px-6 py-14 text-center"><Bell className="mx-auto size-8 text-gold-dark" /><h2 className="mt-4 font-heading text-xl font-bold text-ink">Rien de nouveau</h2><p className="mt-2 text-sm text-ink-secondary">Vos prochaines confirmations apparaîtront ici.</p></div>
      ) : (
        <ol className="mt-9 space-y-3">
          {notifications.map((notification) => {
            const content = (
              <div className="flex gap-4">
                <span className={`mt-1 size-2.5 shrink-0 rounded-full ${notification.is_read ? "bg-black/10" : "bg-gold-dark"}`} />
                <div className="min-w-0 flex-1"><div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"><h2 className="font-heading text-lg font-bold text-ink">{notification.subject}</h2><time className="shrink-0 text-xs text-ink-muted">{formatDate(notification.created_at)}</time></div><p className="mt-2 text-sm leading-relaxed text-ink-secondary">{notification.message}</p>{notification.action_url && <p className="mt-3 text-xs font-semibold text-gold-dark">Voir le détail →</p>}</div>
              </div>
            )
            return (
              <li key={notification.id} className={`rounded-[20px] border p-5 transition-colors sm:p-6 ${notification.is_read ? "border-black/5 bg-surface" : "border-gold/30 bg-gold/[0.06]"}`}>
                {notification.action_url ? <Link to={notification.action_url} onClick={() => void markRead(notification)}>{content}</Link> : <button type="button" onClick={() => void markRead(notification)} className="w-full text-left">{content}</button>}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
