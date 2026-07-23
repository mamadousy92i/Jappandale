import { useCallback, useEffect, useState } from "react"
import type { FormEvent } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, Gift, Pencil, Plus, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { formatFcfa } from "@/lib/format"
import type { CampaignDetail, Reward } from "@/lib/types"

const EDITABLE_STATUSES = ["BROUILLON", "REJETEE", "SUSPENDUE"]

function toMessage(value: unknown): string {
  if (Array.isArray(value)) return value.join(" ")
  return String(value)
}

interface RewardFormState {
  title: string
  description: string
  minimum_amount: string
  quantity_limit: string
}

const emptyForm: RewardFormState = {
  title: "",
  description: "",
  minimum_amount: "",
  quantity_limit: "",
}

function RewardForm({
  initial,
  onCancel,
  onSaved,
  slug,
  rewardId,
}: {
  initial: RewardFormState
  onCancel?: () => void
  onSaved: (reward: Reward) => void
  slug: string
  rewardId?: number
}) {
  const { authFetch } = useAuth()
  const [form, setForm] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        minimum_amount: Number(form.minimum_amount),
        quantity_limit: form.quantity_limit.trim() === "" ? null : Number(form.quantity_limit),
      }
      const reward = (await authFetch(
        rewardId ? `/campaigns/${slug}/rewards/${rewardId}/` : `/campaigns/${slug}/rewards/`,
        { method: rewardId ? "PATCH" : "POST", body: JSON.stringify(payload) },
      )) as Reward
      onSaved(reward)
      if (!rewardId) setForm(emptyForm)
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setError(toMessage(Object.values(err.details)[0]))
      } else {
        setError("Une erreur est survenue. Réessayez.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-2xl border border-black/8 bg-surface-alt/60 p-5"
    >
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="reward-title">Titre de la contrepartie</Label>
        <Input
          id="reward-title"
          required
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          placeholder="Ex. Sac cousu main"
          className="h-12 rounded-xl"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="reward-description">
          Description <span className="font-normal text-ink-muted">(facultatif)</span>
        </Label>
        <textarea
          id="reward-description"
          rows={3}
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          placeholder="Décrivez ce que recevra le contributeur."
          className="w-full rounded-xl border border-black/10 bg-surface px-4 py-3 text-sm leading-relaxed outline-none focus:border-gold-dark focus:ring-2 focus:ring-gold/20"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="reward-minimum">Montant minimum (F CFA)</Label>
          <Input
            id="reward-minimum"
            type="number"
            inputMode="numeric"
            min={500}
            required
            value={form.minimum_amount}
            onChange={(event) => setForm({ ...form, minimum_amount: event.target.value })}
            placeholder="15 000"
            className="h-12 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reward-quantity">
            Quantité disponible{" "}
            <span className="font-normal text-ink-muted">(vide = illimitée)</span>
          </Label>
          <Input
            id="reward-quantity"
            type="number"
            inputMode="numeric"
            min={1}
            value={form.quantity_limit}
            onChange={(event) => setForm({ ...form, quantity_limit: event.target.value })}
            placeholder="20"
            className="h-12 rounded-xl"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={submitting}
          className="h-11 rounded-full bg-gold px-6 font-semibold text-ink hover:bg-gold-light"
        >
          {submitting ? "Enregistrement…" : rewardId ? "Enregistrer" : "Ajouter la contrepartie"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="h-11 rounded-full">
            Annuler
          </Button>
        )}
      </div>
    </form>
  )
}

function RewardRow({
  reward,
  slug,
  onUpdated,
  onDeleted,
}: {
  reward: Reward
  slug: string
  onUpdated: (reward: Reward) => void
  onDeleted: (id: number) => void
}) {
  const { authFetch } = useAuth()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remove = async () => {
    setError(null)
    setDeleting(true)
    try {
      await authFetch(`/campaigns/${slug}/rewards/${reward.id}/`, { method: "DELETE" })
      onDeleted(reward.id)
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setError(toMessage(Object.values(err.details)[0]))
      } else {
        setError("La suppression a échoué.")
      }
      setDeleting(false)
    }
  }

  if (editing) {
    return (
      <li>
        <RewardForm
          slug={slug}
          rewardId={reward.id}
          initial={{
            title: reward.title,
            description: reward.description,
            minimum_amount: String(reward.minimum_amount),
            quantity_limit: reward.quantity_limit === null ? "" : String(reward.quantity_limit),
          }}
          onCancel={() => setEditing(false)}
          onSaved={(updated) => {
            onUpdated(updated)
            setEditing(false)
          }}
        />
      </li>
    )
  }

  return (
    <li className="rounded-2xl border border-black/5 bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 font-heading text-base font-bold text-ink">
            {reward.title}
            {reward.sold_out && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                Épuisée
              </span>
            )}
          </p>
          {reward.description && (
            <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
              {reward.description}
            </p>
          )}
          <p className="mt-2 text-sm text-ink-secondary">
            <span className="font-semibold text-gold-dark">
              {formatFcfa(reward.minimum_amount)}
            </span>{" "}
            minimum ·{" "}
            {reward.quantity_limit === null
              ? "quantité illimitée"
              : `${reward.remaining} restante(s) sur ${reward.quantity_limit}`}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Modifier ${reward.title}`}
            className="flex size-9 items-center justify-center rounded-full border border-black/10 text-ink-secondary transition-colors hover:border-gold hover:bg-gold/10 hover:text-gold-dark"
          >
            <Pencil aria-hidden="true" className="size-4" />
          </button>
          {reward.quantity_claimed === 0 && (
            <button
              type="button"
              onClick={() => void remove()}
              disabled={deleting}
              aria-label={`Supprimer ${reward.title}`}
              className="flex size-9 items-center justify-center rounded-full border border-black/10 text-ink-secondary transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </button>
          )}
        </div>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    </li>
  )
}

export default function ManageRewardsPage() {
  const { slug } = useParams<{ slug: string }>()
  const { authFetch } = useAuth()
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    authFetch(`/campaigns/${slug}/`)
      .then((data) => {
        const detail = data as CampaignDetail
        setCampaign(detail)
        setRewards(detail.rewards)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [authFetch, slug])

  useEffect(() => {
    load()
  }, [load])

  const canManage =
    campaign &&
    campaign.campaign_type === "DON_CONTREPARTIE" &&
    EDITABLE_STATUSES.includes(campaign.status)

  return (
    <section className="mx-auto max-w-2xl px-6 py-14 sm:py-20">
      <Link
        to="/compte"
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-secondary hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Retour à mon espace
      </Link>

      <div className="mt-7 rounded-[24px] border border-black/5 bg-surface p-7 shadow-sm sm:p-10">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-gold/15 text-gold-dark">
          <Gift className="size-5" />
        </span>
        <p className="mt-5 text-xs font-semibold tracking-[3px] text-gold-dark uppercase">
          Contreparties
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-ink">
          {campaign ? `Contreparties de « ${campaign.title} »` : "Chargement…"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
          Proposez des paliers pour remercier vos contributeurs selon le montant de
          leur don.
        </p>

        {loading ? (
          <div className="mt-8 h-40 animate-pulse rounded-2xl bg-black/[0.05]" />
        ) : error || !campaign ? (
          <p className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Cette campagne est introuvable ou ne vous appartient pas.
          </p>
        ) : !canManage ? (
          <p className="mt-8 rounded-xl border border-gold/25 bg-gold/10 px-4 py-3 text-sm text-ink-secondary">
            {campaign.campaign_type !== "DON_CONTREPARTIE"
              ? "Cette campagne est de type « don libre » : elle ne propose pas de contreparties."
              : "Les contreparties ne peuvent être modifiées que sur une campagne en brouillon, rejetée ou suspendue."}
          </p>
        ) : (
          <div className="mt-8 space-y-4">
            {rewards.length > 0 && (
              <ul className="space-y-3">
                {rewards.map((reward) => (
                  <RewardRow
                    key={reward.id}
                    reward={reward}
                    slug={slug ?? ""}
                    onUpdated={(updated) =>
                      setRewards((current) =>
                        current.map((item) => (item.id === updated.id ? updated : item)),
                      )
                    }
                    onDeleted={(id) =>
                      setRewards((current) => current.filter((item) => item.id !== id))
                    }
                  />
                ))}
              </ul>
            )}

            {showForm ? (
              <RewardForm
                slug={slug ?? ""}
                initial={emptyForm}
                onCancel={() => setShowForm(false)}
                onSaved={(reward) => setRewards((current) => [...current, reward])}
              />
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(true)}
                className="h-12 rounded-full border-gold/60 px-6 text-ink hover:bg-gold/10"
              >
                <Plus aria-hidden="true" className="size-4" />
                Ajouter une contrepartie
              </Button>
            )}

            {rewards.length === 0 && !showForm && (
              <p className="flex items-center gap-2 text-sm text-ink-muted">
                <X aria-hidden="true" className="size-4" />
                Aucune contrepartie pour le moment.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
