import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  ArrowRight,
  Check,
  FileText,
  Globe,
  Hammer,
  Heart,
  Lightbulb,
  ShieldCheck,
  Sprout,
  Store,
  TrendingUp,
} from "lucide-react"

import { Reveal } from "@/components/Reveal"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"

const audiences = [
  {
    icon: Lightbulb,
    photo: "/photos/commerce.jpg",
    photoAlt: "Commerçant sénégalais confiant devant sa boutique",
    title: "Vous portez un projet",
    description:
      "Entrepreneur, artisan, coopérative ou association : présentez votre projet, faites-le vérifier et collectez les fonds pour le concrétiser.",
    points: [
      "Créez votre campagne en quelques minutes",
      "Profil vérifié : votre communauté contribue en confiance",
      "Recevez les fonds et partagez vos avancées",
    ],
    cta: "Lancer mon projet",
  },
  {
    icon: Heart,
    photo: "/photos/communaute.jpg",
    photoAlt: "Rassemblement communautaire, un groupe de personnes réunies",
    title: "Vous voulez contribuer",
    description:
      "Depuis Dakar, Paris ou New York : soutenez des projets sénégalais vérifiés et suivez concrètement l'impact de chaque franc investi.",
    points: [
      "Découvrez des projets vérifiés et notés",
      "Contribuez au montant de votre choix",
      "Suivez l'évolution des projets que vous soutenez",
    ],
    cta: "Devenir contributeur",
  },
]

const steps = [
  {
    number: "1",
    title: "Le projet est présenté",
    description:
      "Le porteur décrit son projet, son objectif de collecte et son plan d'action. Chaque profil passe une vérification d'identité.",
  },
  {
    number: "2",
    title: "La communauté contribue",
    description:
      "Donateurs, investisseurs et diaspora participent à la campagne et suivent la progression de la collecte en temps réel.",
  },
  {
    number: "3",
    title: "Le projet prend vie",
    description:
      "Les fonds sont reversés au porteur, qui tient sa communauté informée des avancées et construit son historique de confiance.",
  },
]

const sectors = [
  { icon: Hammer, label: "Artisanat", photo: "/photos/artisan.jpg", alt: "Artisan travaillant le bois dans son atelier" },
  { icon: Store, label: "Commerce", photo: "/photos/marche.jpg", alt: "Commerçant devant son étal de fruits, pouce levé" },
  { icon: Sprout, label: "Agriculture", photo: "/photos/agriculture.jpg", alt: "Agriculteurs récoltant des légumes verts dans un champ" },
  { icon: Heart, label: "Mode & couture", photo: "/photos/porteur.jpg", alt: "Jeune tailleur souriant dans son atelier de couture" },
]

const pillars = [
  {
    icon: ShieldCheck,
    title: "Profils vérifiés",
    description:
      "Chaque porteur de projet passe une vérification d'identité (KYC) avant de pouvoir collecter le moindre franc.",
    soon: false,
  },
  {
    icon: TrendingUp,
    title: "Score Jappandale®",
    description:
      "Une notation indépendante de la fiabilité de chaque projet, pour contribuer en connaissance de cause.",
    soon: true,
  },
  {
    icon: FileText,
    title: "Passeport Financier®",
    description:
      "Chaque campagne réussie enrichit l'historique financier du porteur — un capital de confiance réutilisable.",
    soon: true,
  },
  {
    icon: Globe,
    title: "Pensé pour la diaspora",
    description:
      "Contribuez depuis l'étranger et suivez vos projets à distance, avec la même transparence qu'à Dakar.",
    soon: false,
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
          className="pointer-events-none absolute inset-x-0 top-0 h-[40rem] bg-[radial-gradient(ellipse_55%_45%_at_70%_-5%,rgba(250,197,2,0.16),transparent)]"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pt-14 pb-20 sm:pt-20 sm:pb-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <span className="animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold tracking-[3px] text-gold-dark uppercase duration-700 motion-reduce:animate-none">
              Financement participatif · Sénégal
            </span>

            <h1 className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards mt-6 font-heading text-4xl leading-[1.05] font-bold text-balance text-ink delay-100 duration-700 motion-reduce:animate-none sm:text-5xl xl:text-6xl">
              Connecter les projets aux{" "}
              <span className="text-gold-dark">opportunités de financement</span>
            </h1>

            <div
              aria-hidden="true"
              className="animate-in fade-in zoom-in-75 fill-mode-backwards mt-7 h-[3px] w-20 rounded-full bg-gradient-to-r from-gold to-gold-dark delay-200 duration-700 motion-reduce:animate-none"
            />

            <p className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards mt-7 max-w-xl text-base leading-relaxed text-ink-secondary delay-300 duration-700 motion-reduce:animate-none sm:text-lg">
              Jappandale relie les porteurs de projets sénégalais à une communauté de
              donateurs, d'investisseurs et de membres de la diaspora. Des campagnes
              vérifiées, une collecte transparente, un suivi de bout en bout.
            </p>

            <div className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards mt-9 flex flex-col items-center gap-4 delay-400 duration-700 motion-reduce:animate-none sm:flex-row sm:gap-5">
              <Button
                asChild
                className="h-12 rounded-full bg-gold px-8 text-base font-semibold text-ink shadow-md shadow-gold/25 transition-all hover:bg-gold-light hover:shadow-lg hover:shadow-gold/30"
              >
                <Link to="/inscription">Lancer mon projet</Link>
              </Button>
              <a
                href="#comment-ca-marche"
                className="group inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-ink-secondary transition-colors outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-gold-dark/50"
              >
                Comment ça marche
                <span
                  aria-hidden="true"
                  className="transition-transform duration-300 group-hover:translate-y-0.5"
                >
                  ↓
                </span>
              </a>
            </div>

            <ul className="animate-in fade-in fill-mode-backwards mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-muted delay-500 duration-700 motion-reduce:animate-none lg:justify-start">
              {["Projets vérifiés", "Collecte transparente", "Ouvert à la diaspora"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <Check aria-hidden="true" className="size-4 text-gold-dark" />
                    {item}
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Visuel héro */}
          <div className="animate-in fade-in zoom-in-95 fill-mode-backwards relative mx-auto w-full max-w-md delay-200 duration-700 motion-reduce:animate-none lg:max-w-none">
            <div
              aria-hidden="true"
              className="absolute -inset-4 -z-10 rounded-[36px] bg-gold/15 blur-3xl"
            />
            <div className="overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-xl shadow-black/10">
              <img
                src="/photos/porteur.jpg"
                alt="Jeune tailleur sénégalais souriant devant sa machine à coudre, son téléphone à la main"
                className="aspect-[4/3] w-full object-cover"
                width={1200}
                height={900}
                fetchPriority="high"
              />
            </div>
            <div className="absolute -bottom-5 -left-3 flex items-center gap-3 rounded-2xl border border-black/5 bg-white/95 px-4 py-3 shadow-lg backdrop-blur sm:-left-6">
              <span
                aria-hidden="true"
                className="flex size-10 items-center justify-center rounded-xl bg-gold/15 text-gold-dark"
              >
                <ShieldCheck className="size-5" />
              </span>
              <span className="text-sm leading-tight font-medium text-ink">
                Chaque projet
                <br />
                <span className="text-ink-secondary">est vérifié</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Pour qui */}
      <section className="border-t border-black/5 bg-surface-alt">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <Reveal className="flex flex-col items-center text-center">
            <span className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">
              Une plateforme, deux communautés
            </span>
            <h2 className="mt-4 font-heading text-3xl font-bold text-ink sm:text-4xl">
              Jappandale est fait pour vous
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            {audiences.map((audience, index) => (
              <Reveal key={audience.title} delay={index * 120} className="h-full">
                <article className="group flex h-full flex-col overflow-hidden rounded-[20px] border border-transparent bg-surface shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                  <div className="relative overflow-hidden">
                    <img
                      src={audience.photo}
                      alt={audience.photoAlt}
                      loading="lazy"
                      width={1200}
                      height={800}
                      className="aspect-[16/9] w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute top-4 left-4 flex size-11 items-center justify-center rounded-2xl bg-white/95 text-gold-dark shadow-sm backdrop-blur"
                    >
                      <audience.icon className="size-5" />
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-8">
                    <h3 className="font-heading text-2xl font-bold text-ink">{audience.title}</h3>
                    <p className="mt-3 leading-relaxed text-ink-secondary">{audience.description}</p>
                    <ul className="mt-6 space-y-3">
                      {audience.points.map((point) => (
                        <li key={point} className="flex items-start gap-3 text-sm text-ink-secondary">
                          <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-gold-dark" />
                          {point}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-8 pt-2">
                      <Button
                        asChild
                        variant="outline"
                        className="rounded-full border-black/10 px-6 font-medium text-ink transition-all hover:border-gold hover:bg-gold/10 hover:text-gold-dark"
                      >
                        <Link to="/inscription">
                          {audience.cta}
                          <ArrowRight aria-hidden="true" className="size-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section id="comment-ca-marche" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <Reveal className="flex flex-col items-center text-center">
            <span className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">
              Comment ça marche
            </span>
            <h2 className="mt-4 font-heading text-3xl font-bold text-ink sm:text-4xl">
              Trois étapes, une communauté
            </h2>
          </Reveal>

          <ol className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {steps.map((step, index) => (
              <li key={step.number}>
                <Reveal delay={index * 120} className="h-full">
                  <div className="group h-full rounded-[20px] border border-black/5 bg-surface p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                    <span className="font-heading text-4xl font-bold text-gold" aria-hidden="true">
                      {step.number}
                    </span>
                    <h3 className="mt-4 font-heading text-xl font-bold text-ink">{step.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
                      {step.description}
                    </p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Secteurs financés */}
      <section className="border-t border-black/5 bg-surface-alt">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <Reveal className="flex flex-col items-center text-center">
            <span className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">
              Des projets bien réels
            </span>
            <h2 className="mt-4 font-heading text-3xl font-bold text-ink sm:text-4xl">
              Tous les secteurs qui font le Sénégal
            </h2>
            <p className="mt-4 max-w-2xl text-ink-secondary">
              De l'atelier de couture à la coopérative agricole, Jappandale accompagne la
              diversité des porteurs de projets d'ici.
            </p>
          </Reveal>

          <ul className="mt-14 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {sectors.map((sector, index) => (
              <li key={sector.label}>
                <Reveal delay={index * 100}>
                  <figure className="group relative overflow-hidden rounded-[20px] shadow-sm">
                    <img
                      src={sector.photo}
                      alt={sector.alt}
                      loading="lazy"
                      width={800}
                      height={1000}
                      className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"
                    />
                    <figcaption className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-4 text-white">
                      <sector.icon aria-hidden="true" className="size-5 text-gold" />
                      <span className="font-heading text-lg font-bold">{sector.label}</span>
                    </figcaption>
                  </figure>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Les piliers de la confiance */}
      <section>
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <Reveal className="flex flex-col items-center text-center">
            <span className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">
              Pourquoi Jappandale
            </span>
            <h2 className="mt-4 font-heading text-3xl font-bold text-ink sm:text-4xl">
              La confiance au cœur de la plateforme
            </h2>
            <p className="mt-4 max-w-2xl text-ink-secondary">
              Financer un projet, c'est d'abord une question de confiance. Chaque brique de
              Jappandale est pensée pour la construire et la mesurer.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((pillar, index) => (
              <Reveal key={pillar.title} delay={index * 100} className="h-full">
                <article className="group relative h-full rounded-[20px] border border-transparent bg-surface p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                  {pillar.soon && (
                    <span className="absolute top-5 right-5 rounded-full bg-gold/15 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-gold-dark uppercase">
                      Bientôt
                    </span>
                  )}
                  <span
                    aria-hidden="true"
                    className="flex size-11 items-center justify-center rounded-xl bg-gold/15 text-gold-dark transition-colors group-hover:bg-gold/25"
                  >
                    <pillar.icon className="size-5" />
                  </span>
                  <h3 className="mt-5 font-heading text-lg font-bold text-ink">{pillar.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                    {pillar.description}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Appel à l'action final */}
      <section className="relative overflow-hidden bg-ink">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_50%_0%,rgba(250,197,2,0.14),transparent)]"
        />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 py-20 text-center sm:py-24">
          <Reveal className="flex flex-col items-center">
            <span className="text-xs font-semibold tracking-[4px] text-gold uppercase">
              Rejoignez le mouvement
            </span>
            <h2 className="mt-5 font-heading text-3xl font-bold text-balance text-white sm:text-5xl">
              Votre projet mérite sa chance.
              <br />
              Votre soutien change tout.
            </h2>
            <p className="mt-6 max-w-xl leading-relaxed text-white/70">
              Créez votre compte gratuitement — que ce soit pour lancer votre campagne ou
              pour soutenir les idées qui font avancer le Sénégal.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
              <Button
                asChild
                className="h-12 rounded-full bg-gold px-8 text-base font-semibold text-ink shadow-lg shadow-gold/20 transition-all hover:bg-gold-light hover:shadow-xl hover:shadow-gold/25"
              >
                <Link to="/inscription">Créer mon compte</Link>
              </Button>
              <Link
                to="/connexion"
                className="group inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-white/70 transition-colors outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-gold/60"
              >
                J'ai déjà un compte
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Statut technique discret */}
      <div className="border-t border-black/5 bg-surface-alt">
        <div className="mx-auto flex max-w-6xl justify-center px-6 py-6">
          <ApiStatus />
        </div>
      </div>
    </>
  )
}

export default HomePage
