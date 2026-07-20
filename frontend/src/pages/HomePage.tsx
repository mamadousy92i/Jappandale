import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"

const steps = [
  {
    number: "1",
    title: "Présentez votre projet",
    description:
      "Décrivez votre idée, fixez votre objectif de collecte et racontez ce qui vous anime.",
  },
  {
    number: "2",
    title: "Mobilisez votre communauté",
    description:
      "Partagez votre campagne : chaque contribution, petite ou grande, vous rapproche du but.",
  },
  {
    number: "3",
    title: "Donnez vie à votre idée",
    description:
      "Recevez les fonds collectés et tenez vos contributeurs informés de vos avancées.",
  },
]

function ApiStatus() {
  const [apiOk, setApiOk] = useState<boolean | null>(null)

  useEffect(() => {
    apiFetch("/health/")
      .then(() => setApiOk(true))
      .catch(() => setApiOk(false))
  }, [])

  return (
    <p className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-surface px-4 py-1.5 text-xs text-ink-muted">
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${
          apiOk === null ? "animate-pulse bg-ink-muted" : apiOk ? "bg-emerald-500" : "bg-red-400"
        }`}
      />
      API backend :{" "}
      {apiOk === null ? "vérification en cours…" : apiOk ? "connectée" : "injoignable"}
    </p>
  )
}

function HomePage() {
  return (
    <>
      {/* Héro */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(250,197,2,0.14),transparent)]"
        />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 pt-24 pb-20 text-center sm:pt-32 sm:pb-28">
          <span className="animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards text-xs font-semibold tracking-[4px] text-gold-dark uppercase duration-700 motion-reduce:animate-none">
            Financement participatif · Sénégal
          </span>

          <h1 className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards mt-6 font-heading text-4xl leading-tight font-bold text-balance text-ink delay-100 duration-700 motion-reduce:animate-none sm:text-6xl md:text-7xl">
            Ensemble, donnons vie aux projets sénégalais
          </h1>

          <div
            aria-hidden="true"
            className="animate-in fade-in zoom-in-75 fill-mode-backwards mt-8 h-[3px] w-20 rounded-full bg-gradient-to-r from-gold to-gold-dark delay-200 duration-700 motion-reduce:animate-none"
          />

          <p className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards mt-8 max-w-2xl text-base leading-relaxed text-ink-secondary delay-300 duration-700 motion-reduce:animate-none sm:text-lg">
            Jappandale met en relation les porteurs de projets et celles et ceux qui
            croient en eux. Une plateforme pensée à Dakar, pour financer les idées
            d'ici, en toute confiance.
          </p>

          <div className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards mt-10 flex flex-col items-center gap-4 delay-400 duration-700 motion-reduce:animate-none sm:flex-row sm:gap-6">
            <Button
              asChild
              className="h-12 rounded-full bg-gold px-8 text-base font-semibold text-ink shadow-md shadow-gold/25 transition-all hover:bg-gold-light hover:shadow-lg hover:shadow-gold/30"
            >
              <Link to="/inscription">Créer mon compte</Link>
            </Button>
            <Link
              to="/connexion"
              className="group rounded-sm text-sm font-medium text-ink-secondary transition-colors outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-gold-dark/50"
            >
              J'ai déjà un compte{" "}
              <span
                aria-hidden="true"
                className="[display:inline-block] transition-transform duration-300 group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          </div>

          <div className="animate-in fade-in fill-mode-backwards mt-16 delay-500 duration-700 motion-reduce:animate-none">
            <ApiStatus />
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="border-t border-black/5 bg-surface-alt">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="flex flex-col items-center text-center">
            <span className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">
              Comment ça marche
            </span>
            <h2 className="mt-4 font-heading text-3xl font-bold text-ink sm:text-4xl">
              Trois étapes, une communauté
            </h2>
          </div>

          <ol className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {steps.map((step) => (
              <li
                key={step.number}
                className="group rounded-[20px] border border-transparent bg-surface p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <span className="font-heading text-4xl font-bold text-gold" aria-hidden="true">
                  {step.number}
                </span>
                <h3 className="mt-4 font-heading text-xl font-bold text-ink">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  )
}

export default HomePage
