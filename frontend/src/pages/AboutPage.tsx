import { ArrowRight, CheckCircle2, Eye, Handshake, ShieldCheck, UsersRound } from "lucide-react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

const commitmentKeys = [
  { key: "connect", icon: Handshake },
  { key: "evaluate", icon: ShieldCheck },
  { key: "follow", icon: Eye },
] as const

export default function AboutPage() {
  const { t } = useTranslation("about")
  const commitments = commitmentKeys.map(({ key, icon }) => ({
    key,
    icon,
    title: t(`mission.commitments.${key}.title`),
    text: t(`mission.commitments.${key}.text`),
  }))
  const principles = t("trustSection.principles", { returnObjects: true }) as string[]

  return (
    <>
      <section className="overflow-hidden border-b border-black/5 bg-[#fbfaf6]">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-24">
          <div>
            <p className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">{t("hero.eyebrow")}</p>
            <h1 className="mt-5 max-w-2xl font-heading text-4xl leading-[1.08] font-bold text-ink sm:text-5xl lg:text-6xl">
              {t("hero.title")}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-secondary sm:text-lg">
              {t("hero.intro")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="h-12 rounded-full bg-gold px-7 font-semibold text-ink hover:bg-gold-light">
                <Link to="/campagnes">{t("hero.discover")} <ArrowRight aria-hidden="true" className="size-4" /></Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-full border-black/15 bg-white px-7 font-semibold text-ink">
                <Link to="/#comment-ca-marche">{t("hero.understand")}</Link>
              </Button>
            </div>
          </div>

          <div className="relative lg:pl-8">
            <div aria-hidden="true" className="absolute -top-10 -right-12 size-48 rounded-full bg-gold/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[26px] border border-black/5 bg-white p-5 shadow-[0_24px_70px_-35px_rgba(0,0,0,0.35)] sm:p-8">
              <img src="/logo-jappandale.jpeg" alt={t("hero.imageAlt")} width={1280} height={1024} className="aspect-[4/3] w-full object-contain" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div className="lg:sticky lg:top-28">
          <p className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">{t("why.eyebrow")}</p>
          <h2 className="mt-4 font-heading text-3xl font-bold text-ink sm:text-4xl">{t("why.title")}</h2>
        </div>
        <div className="space-y-6 text-base leading-relaxed text-ink-secondary sm:text-lg">
          <p>{t("why.p1")}</p>
          <p>{t("why.p2")}</p>
          <p className="border-l-4 border-gold bg-[#fbfaf6] p-6 font-medium text-ink">{t("why.p3")}</p>
        </div>
      </section>

      <section className="border-y border-black/5 bg-ink text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[4px] text-gold uppercase">{t("mission.eyebrow")}</p>
            <h2 className="mt-4 font-heading text-3xl font-bold sm:text-4xl">{t("mission.title")}</h2>
          </div>
          <div className="mt-10 grid gap-px overflow-hidden rounded-[22px] bg-white/10 sm:grid-cols-3">
            {commitments.map(({ key, icon: Icon, title, text }, index) => (
              <article key={key} className="bg-ink p-7 sm:p-8">
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

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center">
        <img src="/photos/marche.jpg" alt={t("roots.imageAlt")} width={1200} height={900} loading="lazy" className="aspect-[4/3] w-full rounded-[24px] object-cover shadow-[0_20px_60px_-35px_rgba(0,0,0,0.4)]" />
        <div className="lg:pl-8">
          <p className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">{t("roots.eyebrow")}</p>
          <h2 className="mt-4 font-heading text-3xl font-bold text-ink sm:text-4xl">{t("roots.title")}</h2>
          <p className="mt-5 leading-relaxed text-ink-secondary">{t("roots.p1")}</p>
          <p className="mt-4 leading-relaxed text-ink-secondary">{t("roots.p2")}</p>
        </div>
      </section>

      <section className="border-y border-black/5 bg-[#fbfaf6]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <UsersRound aria-hidden="true" className="size-9 text-gold-dark" />
            <h2 className="mt-5 font-heading text-3xl font-bold text-ink sm:text-4xl">{t("trustSection.title")}</h2>
            <p className="mt-4 leading-relaxed text-ink-secondary">{t("trustSection.text")}</p>
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

      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24">
        <p className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">{t("cta.eyebrow")}</p>
        <h2 className="mt-4 font-heading text-3xl font-bold text-ink sm:text-4xl">{t("cta.title")}</h2>
        <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-ink-secondary">{t("cta.text")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild className="h-12 rounded-full bg-gold px-7 font-semibold text-ink hover:bg-gold-light"><Link to="/inscription?role=PORTEUR">{t("cta.submit")}</Link></Button>
          <Button asChild variant="outline" className="h-12 rounded-full border-black/15 px-7 font-semibold"><Link to="/campagnes">{t("cta.see")}</Link></Button>
        </div>
      </section>
    </>
  )
}
