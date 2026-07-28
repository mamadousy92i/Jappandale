import { useEffect, useRef, useState } from "react"
import { Flag, Inbox, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"
import type { MessageReportReason, MessageThreadListItem, ThreadMessage } from "@/lib/types"

const reasonLabels: Record<MessageReportReason, string> = {
  SPAM: "Spam ou sollicitation",
  HARCELEMENT: "Harcèlement",
  CONTENU_INAPPROPRIE: "Contenu inapproprié",
  TENTATIVE_CONTOURNEMENT: "Tentative de contournement de la plateforme",
  AUTRE: "Autre motif",
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function ReportForm({ onSubmit, onCancel }: { onSubmit: (reason: MessageReportReason, details: string) => Promise<void>; onCancel: () => void }) {
  const [reason, setReason] = useState<MessageReportReason>("AUTRE")
  const [details, setDetails] = useState("")
  const [submitting, setSubmitting] = useState(false)

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
      <select
        aria-label="Motif du signalement"
        value={reason}
        onChange={(event) => setReason(event.target.value as MessageReportReason)}
        className="w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs text-ink"
      >
        {Object.entries(reasonLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <textarea
        aria-label="Précisions"
        value={details}
        onChange={(event) => setDetails(event.target.value)}
        rows={2}
        maxLength={1500}
        placeholder="Précisions (facultatif)"
        className="w-full resize-y rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs text-ink"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="h-8 rounded-full px-3 text-xs">
          Annuler
        </Button>
        <Button
          type="button"
          disabled={submitting}
          onClick={() => {
            setSubmitting(true)
            void onSubmit(reason, details).finally(() => setSubmitting(false))
          }}
          className="h-8 rounded-full bg-red-600 px-3 text-xs text-white hover:bg-red-700"
        >
          Signaler
        </Button>
      </div>
    </div>
  )
}

function Conversation({ thread }: { thread: MessageThreadListItem }) {
  const { authFetch } = useAuth()
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [reportingId, setReportingId] = useState<number | null>(null)
  const [reportedIds, setReportedIds] = useState<number[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = () =>
    authFetch(`/messagerie/threads/${thread.id}/messages/`).then((data) => setMessages(data as ThreadMessage[]))

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), 8000)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  const send = async () => {
    if (!body.trim()) return
    setSending(true)
    try {
      await authFetch(`/messagerie/threads/${thread.id}/messages/`, {
        method: "POST",
        body: JSON.stringify({ body }),
      })
      setBody("")
      await load()
    } finally {
      setSending(false)
    }
  }

  const report = async (messageId: number, reason: MessageReportReason, details: string) => {
    await authFetch(`/messagerie/messages/${messageId}/report/`, {
      method: "POST",
      body: JSON.stringify({ reason, details }),
    })
    setReportedIds((current) => [...current, messageId])
    setReportingId(null)
  }

  return (
    <div className="flex h-[28rem] flex-col rounded-2xl border border-black/5 bg-surface-alt">
      <header className="border-b border-black/5 px-4 py-3">
        <p className="font-semibold text-ink">{thread.other_participant.name}</p>
        <p className="text-xs text-ink-muted">{thread.campaign.title}</p>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.map((message) => (
          <div key={message.id} className={`flex flex-col ${message.is_mine ? "items-end" : "items-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${message.is_mine ? "bg-gold/20 text-ink" : "bg-white text-ink shadow-sm"}`}>
              {message.body}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-muted">
              {formatDateTime(message.created_at)}
              {!message.is_mine && !reportedIds.includes(message.id) && (
                <button type="button" onClick={() => setReportingId(message.id)} className="inline-flex items-center gap-1 text-ink-muted hover:text-red-700">
                  <Flag className="size-3" />
                  Signaler
                </button>
              )}
              {reportedIds.includes(message.id) && <span className="text-emerald-700">Signalé</span>}
            </div>
            {reportingId === message.id && (
              <div className="w-full max-w-[80%]">
                <ReportForm onSubmit={(reason, details) => report(message.id, reason, details)} onCancel={() => setReportingId(null)} />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 border-t border-black/5 p-3">
        <textarea
          aria-label="Votre message"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={1}
          maxLength={3000}
          placeholder="Écrivez votre message…"
          className="flex-1 resize-none rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-gold/20"
        />
        <Button type="button" disabled={sending || !body.trim()} onClick={() => void send()} className="h-10 shrink-0 rounded-full bg-gold px-4 text-ink hover:bg-gold-light">
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  )
}

export function MessagesSection() {
  const { authFetch } = useAuth()
  const [threads, setThreads] = useState<MessageThreadListItem[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const loadThreads = () =>
    authFetch("/messagerie/threads/").then((data) => setThreads(data as MessageThreadListItem[]))

  useEffect(() => {
    void loadThreads().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selected = threads.find((thread) => thread.id === selectedId) ?? null

  if (loading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-black/[0.05]" />
  }

  if (threads.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/10 bg-surface-alt p-8 text-center">
        <Inbox className="mx-auto size-6 text-gold-dark" />
        <p className="mt-3 text-sm text-ink-secondary">Aucune conversation pour le moment.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
      <ul className="space-y-2">
        {threads.map((thread) => (
          <li key={thread.id}>
            <button
              type="button"
              onClick={() => setSelectedId(thread.id)}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                selectedId === thread.id ? "border-gold-dark bg-gold/10" : "border-black/5 bg-surface hover:border-gold/40"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-semibold text-ink">{thread.other_participant.name}</span>
                {thread.unread_count > 0 && (
                  <span className="rounded-full bg-gold-dark px-2 py-0.5 text-[11px] font-semibold text-white">
                    {thread.unread_count}
                  </span>
                )}
              </span>
              <span className="mt-0.5 block truncate text-xs text-ink-muted">{thread.campaign.title}</span>
              {thread.last_message && <span className="mt-1 block truncate text-xs text-ink-secondary">{thread.last_message.body}</span>}
            </button>
          </li>
        ))}
      </ul>
      {selected ? (
        <Conversation key={selected.id} thread={selected} />
      ) : (
        <div className="flex h-[28rem] items-center justify-center rounded-2xl border border-dashed border-black/10 text-sm text-ink-muted">
          Sélectionnez une conversation.
        </div>
      )}
    </div>
  )
}
