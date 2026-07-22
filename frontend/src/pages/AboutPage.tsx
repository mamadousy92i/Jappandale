import { ArrowRight, CheckCircle2, Eye, Handshake, ShieldCheck, UsersRound } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"

const commitments = [
  {
    icon: Handshake,
    title: "Connecter",
    text: "Rapprocher les porteurs de projets sénégalais, les contributeurs, les investisseurs et la diaspora autour d’opportunités concrètes.",
  },
  {
    icon: ShieldCheck,
    title: "Évaluer",
    text: "Examiner l’identité des porteurs et la cohérence des dossiers avant leur publication sur la plateforme.",
  },
  {
    icon: Eye,
    title: "Suivre",
    text: "Rendre visibles les objectifs, l’utilisation prévue des fonds et les avancées communiquées par chaque projet.",
  },
]

const principles = [
  "Des campagnes examinées avant leur publication",
  "Des informations financières présentées clairement",
  "Des décisions et des statuts traçables",
  "Un suivi accessible aux porteurs et aux contributeurs",
]

export default function AboutPage() {
  return (
    <>
      <section className="overflow-hidden border-b border-black/5 bg-[#fbfaf6]">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-14 sm:py-20 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-24">
          <div>
            <p className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">À propos de Jappandale</p>
            <h1 className="mt-5 max-w-2xl font-heading text-4xl leading-[1.08] font-bold text-ink sm:text-5xl lg:text-6xl">
              Faire circuler la confiance autant que le financement.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-secondary sm:text-lg">
              Jappandale est une plateforme sénégalaise de financement participatif et de mise en relation financière, pensée pour rapprocher les projets locaux de celles et ceux qui souhaitent les soutenir.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="h-12 rounded-full bg-gold px-7 font-semibold text-ink hover:bg-gold-light">
                <Link to="/campagnes">Découvrir les projets <ArrowRight aria-hidden="true" className="size-4" /></Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-full border-black/15 bg-white px-7 font-semibold text-ink">
                <Link to="/#comment-ca-marche">Comprendre le parcours</Link>
              </Button>
            </div>
          </div>

          <div className="relative lg:pl-8">
            <div aria-hidden="true" className="absolute -top-10 -right-12 size-48 rounded-full bg-gold/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[26px] border border-black/5 bg-white p-5 shadow-[0_24px_70px_-35px_rgba(0,0,0,0.35)] sm:p-8">
              <img src="/logo-jappandale.jpeg" alt="Logo Jappandale — connecter les projets aux opportunités de financement" width={1280} height={1024} className="aspect-[4/3] w-full object-contain" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div className="lg:sticky lg:top-28">
          <p className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">Pourquoi Jappandale</p>
          <h2 className="mt-4 font-heading text-3xl font-bold text-ink sm:text-4xl">Un constat local, une réponse collective</h2>
        </div>
        <div className="space-y-6 text-base leading-relaxed text-ink-secondary sm:text-lg">
          <p>Au Sénégal et dans l’espace UEMOA, l’accès au financement reste un frein majeur pour de nombreux entrepreneurs, PME, coopératives et associations.</p>
          <p>Dans le même temps, la diaspora et les investisseurs de proximité recherchent des moyens plus structurés pour identifier des projets locaux, comprendre leurs besoins et suivre leur évolution.</p>
          <p className="border-l-4 border-gold bg-[#fbfaf6] p-6 font-medium text-ink">Jappandale crée ce point de rencontre : un cadre commun pour présenter, examiner, financer et suivre des initiatives à impact.</p>
        </div>
      </section>

      <section className="border-y border-black/5 bg-ink text-white">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[4px] text-gold uppercase">Notre mission</p>
            <h2 className="mt-4 font-heading text-3xl font-bold sm:text-4xl">Créer un financement plus lisible, plus proche et mieux suivi</h2>
          </div>
          <div className="mt-10 grid gap-px overflow-hidden rounded-[22px] bg-white/10 sm:grid-cols-3">
            {commitments.map(({ icon: Icon, title, text }, index) => (
              <article key={title} className="bg-ink p-7 sm:p-8">
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-gold/15 text-gold"><Icon aria-hidden="true" className="size-5" /></span>
                  <span className="font-heading text-2xl font-bold text-white/15">0{index + 1}</span>
                </div>
                <h3 className="mt-6 font-heading text-2xl font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/65">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:items-center">
        <img src="/photos/marche.jpg" alt="Activité économique dans un marché sénégalais" width={1200} height={900} loading="lazy" className="aspect-[4/3] w-full rounded-[24px] object-cover shadow-[0_20px_60px_-35px_rgba(0,0,0,0.4)]" />
        <div className="lg:pl-8">
          <p className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">Notre ancrage</p>
          <h2 className="mt-4 font-heading text-3xl font-bold text-ink sm:text-4xl">Une plateforme pensée pour l’écosystème sénégalais</h2>
          <p className="mt-5 leading-relaxed text-ink-secondary">Jappandale part des réalités des entrepreneurs, coopératives, associations et communautés qui font vivre l’économie locale au quotidien.</p>
          <p className="mt-4 leading-relaxed text-ink-secondary">Notre ambition est de mettre la technologie au service d’une relation financière plus accessible entre les initiatives locales, la diaspora et leurs communautés de soutien.</p>
        </div>
      </section>

      <section className="border-y border-black/5 bg-[#fbfaf6]">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <UsersRound aria-hidden="true" className="size-9 text-gold-dark" />
            <h2 className="mt-5 font-heading text-3xl font-bold text-ink sm:text-4xl">La confiance se construit avec des preuves</h2>
            <p className="mt-4 leading-relaxed text-ink-secondary">Une campagne vérifiée ne garantit pas sa réussite. Elle indique que les informations et les pièces demandées ont été examinées avant publication.</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {principles.map((principle) => (
              <li key={principle} className="flex gap-3 rounded-2xl border border-black/5 bg-white p-5 text-sm font-medium leading-relaxed text-ink shadow-sm">
                <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-gold-dark" />
                {principle}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16 text-center sm:py-24">
        <p className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">Participer</p>
        <h2 className="mt-4 font-heading text-3xl font-bold text-ink sm:text-4xl">Un projet à faire grandir ou une initiative à soutenir ?</h2>
        <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-ink-secondary">Rejoignez Jappandale pour présenter votre projet, découvrir les campagnes publiées et contribuer à leur progression.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild className="h-12 rounded-full bg-gold px-7 font-semibold text-ink hover:bg-gold-light"><Link to="/inscription?role=PORTEUR">Déposer un projet</Link></Button>
          <Button asChild variant="outline" className="h-12 rounded-full border-black/15 px-7 font-semibold"><Link to="/campagnes">Voir les campagnes</Link></Button>
        </div>
      </section>
    </>
  )
}
