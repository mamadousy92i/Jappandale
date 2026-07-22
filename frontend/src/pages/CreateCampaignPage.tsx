import { useState } from "react"
import type { FormEvent, ReactNode } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ImagePlus, ShieldCheck, Sparkles, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { CampaignCategory } from "@/lib/types"

const categories: { code: CampaignCategory; label: string }[] = [
  { code: "ARTISANAT", label: "Artisanat" },
  { code: "COMMERCE", label: "Commerce" },
  { code: "AGRICULTURE", label: "Agriculture" },
  { code: "EDUCATION", label: "Éducation" },
  { code: "SANTE", label: "Santé" },
  { code: "TECHNOLOGIE", label: "Technologie" },
  { code: "CULTURE", label: "Culture" },
  { code: "AUTRE", label: "Autre" },
]

const fieldNames = [
  "title",
  "summary",
  "description",
  "location",
  "beneficiaries",
  "funding_plan",
  "project_timeline",
  "category",
  "goal_amount",
  "deadline",
  "cover_image",
]

/** Date de demain au format YYYY-MM-DD (minimum autorisé pour l'échéance). */
function tomorrowIso(): string {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function toMessage(value: unknown): string {
  if (Array.isArray(value)) return value.join(" ")
  return String(value)
}

/** Écran affiché quand l'utilisateur n'a pas le droit de créer une campagne. */
function AccessNotice({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards mx-auto mt-10 flex w-full max-w-lg flex-col items-center rounded-[20px] border border-black/5 bg-surface px-8 py-14 text-center shadow-[0_10px_40px_-12px_rgba(0,0,0,0.08)] delay-150 duration-700 motion-reduce:animate-none">
      <span
        aria-hidden="true"
        className="flex size-12 items-center justify-center rounded-2xl bg-gold/15 text-gold-dark"
      >
        <ShieldCheck className="size-6" />
      </span>
      <p className="mt-5 font-heading text-xl font-bold text-ink">{title}</p>
      <div className="mt-3 text-sm leading-relaxed text-ink-secondary">{children}</div>
    </div>
  )
}

function CreateCampaignForm() {
  const { authFetch } = useAuth()
  const navigate = useNavigate()

  const [title, setTitle] = useState("")
  const [summary, setSummary] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [beneficiaries, setBeneficiaries] = useState("")
  const [fundingPlan, setFundingPlan] = useState("")
  const [projectTimeline, setProjectTimeline] = useState("")
  const [category, setCategory] = useState<CampaignCategory>("ARTISANAT")
  const [goalAmount, setGoalAmount] = useState("")
  const [deadline, setDeadline] = useState("")
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const minDeadline = tomorrowIso()

  const handleCoverChange = (file: File | null) => {
    setCoverImage(file)
    setCoverPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous)
      return file ? URL.createObjectURL(file) : null
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFieldErrors({})
    setGlobalError(null)
    setSubmitting(true)

    const data = new FormData()
    data.append("title", title)
    data.append("summary", summary)
    data.append("description", description)
    data.append("location", location)
    data.append("beneficiaries", beneficiaries)
    data.append("funding_plan", fundingPlan)
    data.append("project_timeline", projectTimeline)
    data.append("category", category)
    data.append("goal_amount", goalAmount)
    data.append("deadline", deadline)
    if (coverImage) data.append("cover_image", coverImage)

    try {
      await authFetch("/campaigns/", { method: "POST", body: data })
      navigate("/compte")
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setGlobalError(
          err.details?.detail
            ? toMessage(err.details.detail)
            : "Vous n'êtes pas autorisé à créer une campagne."
        )
      } else if (err instanceof ApiError && err.status === 400 && err.details) {
        const nextErrors: Record<string, string> = {}
        for (const [key, value] of Object.entries(err.details)) {
          if (fieldNames.includes(key)) nextErrors[key] = toMessage(value)
        }
        if (Object.keys(nextErrors).length > 0) {
          setFieldErrors(nextErrors)
        } else {
          setGlobalError("Certaines informations sont invalides. Vérifiez le formulaire.")
        }
      } else {
        setGlobalError("Une erreur est survenue. Réessayez.")
      }
      setSubmitting(false)
    }
  }

  const errorFor = (name: string) =>
    fieldErrors[name] ? (
      <p id={`${name}-error`} role="alert" className="text-sm text-red-600">
        {fieldErrors[name]}
      </p>
    ) : null

  const invalidProps = (name: string) =>
    fieldErrors[name]
      ? { "aria-invalid": true as const, "aria-describedby": `${name}-error` }
      : {}

  return (
    <form
      data-testid="create-campaign-form"
      onSubmit={handleSubmit}
      noValidate
      className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards mt-10 w-full rounded-[20px] border border-black/5 bg-surface p-8 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.08)] delay-150 duration-700 motion-reduce:animate-none sm:p-10"
    >
      {globalError && (
        <p
          role="alert"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {globalError}
        </p>
      )}

      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="title" className="text-ink">
            Titre de la campagne
          </Label>
          <Input
            id="title"
            required
            placeholder="Un atelier de couture à Thiès"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-11 rounded-xl px-3.5"
            {...invalidProps("title")}
          />
          {errorFor("title")}
        </div>

        <div className="space-y-2">
          <Label htmlFor="summary" className="text-ink">
            Accroche{" "}
            <span className="font-normal text-ink-muted">(une ou deux phrases)</span>
          </Label>
          <Input
            id="summary"
            required
            placeholder="Résumez votre projet en quelques mots percutants."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="h-11 rounded-xl px-3.5"
            {...invalidProps("summary")}
          />
          {errorFor("summary")}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-ink">
            Description détaillée
          </Label>
          <textarea
            id="description"
            required
            rows={8}
            placeholder={
              "Racontez votre histoire : d'où vient le projet, à quoi serviront les fonds, quel impact pour votre communauté…"
            }
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-surface px-3.5 py-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink-muted focus-visible:border-gold-dark focus-visible:ring-2 focus-visible:ring-gold-dark/30"
            {...invalidProps("description")}
          />
          {errorFor("description")}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="location" className="text-ink">
              Localisation du projet
            </Label>
            <Input
              id="location"
              required
              placeholder="Médina, Dakar"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="h-11 rounded-xl px-3.5"
              {...invalidProps("location")}
            />
            {errorFor("location")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="beneficiaries" className="text-ink">
              Bénéficiaires attendus
            </Label>
            <Input
              id="beneficiaries"
              required
              placeholder="10 apprenties couturières"
              value={beneficiaries}
              onChange={(e) => setBeneficiaries(e.target.value)}
              className="h-11 rounded-xl px-3.5"
              {...invalidProps("beneficiaries")}
            />
            {errorFor("beneficiaries")}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="funding_plan" className="text-ink">
            Utilisation prévue des fonds
          </Label>
          <textarea
            id="funding_plan"
            required
            rows={4}
            placeholder={"Une dépense par ligne, par exemple :\n3 machines à coudre — 450 000 F CFA\nAménagement — 200 000 F CFA"}
            value={fundingPlan}
            onChange={(e) => setFundingPlan(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-surface px-3.5 py-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink-muted focus-visible:border-gold-dark focus-visible:ring-2 focus-visible:ring-gold-dark/30"
            {...invalidProps("funding_plan")}
          />
          {errorFor("funding_plan")}
        </div>

        <div className="space-y-2">
          <Label htmlFor="project_timeline" className="text-ink">
            Étapes prévues du projet
          </Label>
          <textarea
            id="project_timeline"
            required
            rows={4}
            placeholder={"Une étape par ligne, par exemple :\nAchat du matériel — semaine 1\nInstallation et démarrage — semaine 2"}
            value={projectTimeline}
            onChange={(e) => setProjectTimeline(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-surface px-3.5 py-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink-muted focus-visible:border-gold-dark focus-visible:ring-2 focus-visible:ring-gold-dark/30"
            {...invalidProps("project_timeline")}
          />
          {errorFor("project_timeline")}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="category" className="text-ink">
              Catégorie
            </Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as CampaignCategory)}
              className="h-11 w-full rounded-xl border border-black/10 bg-surface px-3.5 text-sm text-ink outline-none focus-visible:border-gold-dark focus-visible:ring-2 focus-visible:ring-gold-dark/30"
              {...invalidProps("category")}
            >
              {categories.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
            {errorFor("category")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal_amount" className="text-ink">
              Objectif <span className="font-normal text-ink-muted">(F CFA)</span>
            </Label>
            <Input
              id="goal_amount"
              type="number"
              inputMode="numeric"
              min={1000}
              step={1}
              required
              placeholder="500 000"
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
              className="h-11 rounded-xl px-3.5"
              {...invalidProps("goal_amount")}
            />
            {errorFor("goal_amount")}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="deadline" className="text-ink">
            Échéance de la collecte
          </Label>
          <Input
            id="deadline"
            type="date"
            required
            min={minDeadline}
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="h-11 rounded-xl px-3.5"
            {...invalidProps("deadline")}
          />
          {errorFor("deadline")}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cover_image" className="text-ink">
            Image de couverture{" "}
            <span className="font-normal text-ink-muted">(facultatif)</span>
          </Label>
          <input
            id="cover_image"
            type="file"
            accept="image/*"
            onChange={(e) => handleCoverChange(e.target.files?.[0] ?? null)}
            className="block w-full rounded-xl border border-black/10 bg-surface text-sm text-ink-secondary file:mr-4 file:cursor-pointer file:border-0 file:bg-gold/15 file:px-4 file:py-2.5 file:font-medium file:text-gold-dark hover:file:bg-gold/25"
            {...invalidProps("cover_image")}
          />
          {errorFor("cover_image")}
          {coverPreview ? (
            <div className="relative mt-3 overflow-hidden rounded-2xl border border-black/5">
              <img
                src={coverPreview}
                alt="Aperçu de l'image de couverture"
                className="aspect-[16/9] w-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleCoverChange(null)}
                aria-label="Retirer l'image sélectionnée"
                className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm backdrop-blur transition-colors outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-gold-dark/50"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-xs text-ink-muted">
              <ImagePlus aria-hidden="true" className="size-4" />
              Une belle image donne deux fois plus envie de contribuer.
            </p>
          )}
        </div>
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="mt-8 h-12 w-full rounded-full bg-gold text-base font-semibold text-ink shadow-md shadow-gold/25 transition-all hover:bg-gold-light hover:shadow-lg hover:shadow-gold/30 sm:w-auto sm:px-10"
      >
        <Sparkles aria-hidden="true" className="size-4" />
        {submitting ? "Création…" : "Créer ma campagne"}
      </Button>
      <p className="mt-4 text-xs leading-relaxed text-ink-muted">
        Votre campagne sera d'abord enregistrée en brouillon. Vous pourrez la soumettre à
        validation depuis votre espace « Mes campagnes ».
      </p>
    </form>
  )
}

function CreateCampaignPage() {
  const { user } = useAuth()

  // La route est protégée par RequireAuth : user est garanti non nul ici.
  if (!user) return null

  let content: ReactNode
  if (user.role !== "PORTEUR") {
    content = (
      <AccessNotice title="Espace réservé aux porteurs de projet">
        <p>
          La création de campagnes est réservée aux porteurs de projet. Votre compte est
          enregistré comme contributeur : vous pouvez soutenir les campagnes existantes.
        </p>
      </AccessNotice>
    )
  } else if (user.kyc_status !== "VALIDE") {
    content = (
      <AccessNotice title="Vérifiez d'abord votre identité">
        <p>
          Pour lancer une campagne, votre identité doit être vérifiée. Complétez la
          vérification depuis votre espace compte : cela ne prend que quelques minutes.
        </p>
        <Button
          asChild
          className="mt-6 h-11 rounded-full bg-gold px-7 font-semibold text-ink shadow-md shadow-gold/25 transition-all hover:bg-gold-light hover:shadow-lg hover:shadow-gold/30"
        >
          <Link to="/compte">Compléter ma vérification</Link>
        </Button>
      </AccessNotice>
    )
  } else {
    content = <CreateCampaignForm />
  }

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(250,197,2,0.14),transparent)]"
      />

      <div className="relative mx-auto flex max-w-2xl flex-col px-6 pt-16 pb-24 sm:pt-24 sm:pb-32">
        <div className="animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards flex flex-col items-center text-center duration-700 motion-reduce:animate-none">
          <span className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">
            Nouvelle campagne
          </span>
          <h1 className="mt-4 font-heading text-3xl font-bold text-ink sm:text-4xl">
            Lancer votre campagne
          </h1>
          <div
            aria-hidden="true"
            className="mt-6 h-[3px] w-16 rounded-full bg-gradient-to-r from-gold to-gold-dark"
          />
          <p className="mt-6 max-w-md text-sm leading-relaxed text-ink-secondary">
            Présentez votre projet avec soin : notre équipe le relira avant publication
            pour garantir la confiance des contributeurs.
          </p>
        </div>

        {content}
      </div>
    </section>
  )
}

export default CreateCampaignPage
