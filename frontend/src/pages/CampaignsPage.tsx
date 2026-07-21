import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { RefreshCw, Search, Sparkles } from "lucide-react"

import { Reveal } from "@/components/Reveal"
import { CampaignCard } from "@/components/campaigns/CampaignCard"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"
import type { CampaignCategory, CampaignListItem } from "@/lib/types"

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

/** Carte fantôme affichée pendant le chargement de la grille. */
function CampaignSkeleton() {
  return (
    <div className="overflow-hidden rounded-[20px] border border-black/5 bg-surface shadow-sm">
      <div className="aspect-[16/10] animate-pulse bg-black/[0.06]" />
      <div className="space-y-3 p-6">
        <div className="h-5 w-3/4 animate-pulse rounded-full bg-black/[0.06]" />
        <div className="h-3.5 w-full animate-pulse rounded-full bg-black/[0.05]" />
        <div className="h-3.5 w-2/3 animate-pulse rounded-full bg-black/[0.05]" />
        <div className="pt-3">
          <div className="h-2 w-full animate-pulse rounded-full bg-black/[0.06]" />
          <div className="mt-3 flex justify-between">
            <div className="h-4 w-24 animate-pulse rounded-full bg-black/[0.06]" />
            <div className="h-4 w-10 animate-pulse rounded-full bg-black/[0.05]" />
          </div>
        </div>
      </div>
    </div>
  )
}

function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [category, setCategory] = useState<CampaignCategory | null>(null)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [reloadKey, setReloadKey] = useState(0)

  // Anti-rebond : on attend ~300 ms après la dernière frappe avant de chercher.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)

    const params = new URLSearchParams()
    if (category) params.set("category", category)
    if (search) params.set("search", search)
    const query = params.toString()

    apiFetch(`/campaigns/${query ? `?${query}` : ""}`)
      .then((data) => {
        if (cancelled) return
        setCampaigns(data as CampaignListItem[])
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError(true)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [category, search, reloadKey])

  const hasFilters = category !== null || search !== ""

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[26rem] bg-[radial-gradient(ellipse_55%_45%_at_50%_-5%,rgba(250,197,2,0.12),transparent)]"
      />

      <div className="relative mx-auto max-w-6xl px-6 pt-14 pb-20 sm:pt-18 sm:pb-24">
        {/* En-tête de section */}
        <div className="flex flex-col items-center text-center">
          <span className="animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards text-xs font-semibold tracking-[4px] text-gold-dark uppercase duration-700 motion-reduce:animate-none">
            Les campagnes
          </span>
          <h1 className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards mt-4 font-heading text-3xl font-bold text-balance text-ink delay-100 duration-700 motion-reduce:animate-none sm:text-5xl">
            Découvrir les campagnes
          </h1>
          <div
            aria-hidden="true"
            className="animate-in fade-in zoom-in-75 fill-mode-backwards mt-6 h-[3px] w-16 rounded-full bg-gradient-to-r from-gold to-gold-dark delay-200 duration-700 motion-reduce:animate-none"
          />
          <p className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards mt-6 max-w-2xl text-ink-secondary delay-300 duration-700 motion-reduce:animate-none sm:text-lg">
            Des projets sénégalais vérifiés, portés par des femmes et des hommes qui
            construisent le pays. Trouvez celui qui vous ressemble.
          </p>
        </div>

        {/* Recherche + filtres */}
        <div className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards mt-12 delay-400 duration-700 motion-reduce:animate-none">
          <div className="relative mx-auto max-w-xl">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-muted"
            />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Rechercher un projet, un mot-clé…"
              aria-label="Rechercher une campagne"
              className="h-12 w-full rounded-full border border-black/10 bg-surface pr-5 pl-11 text-sm text-ink shadow-sm transition-all outline-none placeholder:text-ink-muted focus:border-gold/60 focus:ring-2 focus:ring-gold/30"
            />
          </div>

          <div
            role="group"
            aria-label="Filtrer par catégorie"
            className="mt-6 flex flex-wrap justify-center gap-2"
          >
            <button
              type="button"
              onClick={() => setCategory(null)}
              aria-pressed={category === null}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-gold-dark/50 ${
                category === null
                  ? "bg-gold text-ink shadow-sm shadow-gold/25"
                  : "border border-black/10 bg-surface text-ink-secondary hover:border-gold/40 hover:text-ink"
              }`}
            >
              Toutes
            </button>
            {categories.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => setCategory(item.code)}
                aria-pressed={category === item.code}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-gold-dark/50 ${
                  category === item.code
                    ? "bg-gold text-ink shadow-sm shadow-gold/25"
                    : "border border-black/10 bg-surface text-ink-secondary hover:border-gold/40 hover:text-ink"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grille des campagnes */}
        <div className="mt-12">
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
              {Array.from({ length: 6 }, (_, index) => (
                <CampaignSkeleton key={index} />
              ))}
            </div>
          ) : error ? (
            <div className="mx-auto flex max-w-md flex-col items-center rounded-[20px] border border-black/5 bg-surface-alt px-8 py-16 text-center">
              <p className="font-heading text-xl font-bold text-ink">
                Impossible de charger les campagnes
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
                Une erreur est survenue. Vérifiez votre connexion puis réessayez.
              </p>
              <Button
                variant="outline"
                onClick={() => setReloadKey((key) => key + 1)}
                className="mt-7 rounded-full border-black/10 px-6 font-medium text-ink transition-all hover:border-gold hover:bg-gold/10 hover:text-gold-dark"
              >
                <RefreshCw aria-hidden="true" className="size-4" />
                Réessayer
              </Button>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="mx-auto flex max-w-md flex-col items-center rounded-[20px] border border-black/5 bg-surface-alt px-8 py-16 text-center">
              <span
                aria-hidden="true"
                className="flex size-12 items-center justify-center rounded-2xl bg-gold/15 text-gold-dark"
              >
                <Sparkles className="size-6" />
              </span>
              <p className="mt-5 font-heading text-xl font-bold text-ink">
                {hasFilters
                  ? "Aucune campagne ne correspond"
                  : "Aucune campagne pour le moment"}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
                {hasFilters
                  ? "Essayez un autre mot-clé ou une autre catégorie. Et si le projet qui manque, c'était le vôtre ?"
                  : "Soyez parmi les premiers : lancez votre projet et ouvrez la voie."}
              </p>
              <Button
                asChild
                className="mt-7 h-11 rounded-full bg-gold px-7 font-semibold text-ink shadow-md shadow-gold/25 transition-all hover:bg-gold-light hover:shadow-lg hover:shadow-gold/30"
              >
                <Link to="/inscription">Lancer un projet</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((campaign, index) => (
                <Reveal key={campaign.id} delay={(index % 3) * 100} className="h-full">
                  <CampaignCard campaign={campaign} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default CampaignsPage
