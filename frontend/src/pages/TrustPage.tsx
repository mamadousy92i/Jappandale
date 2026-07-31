import { Eye, Flag, Scale, ShieldCheck, WalletCards } from "lucide-react"
import { useTranslation } from "react-i18next"

const principleKeys = [
  { key: "identity", icon: ShieldCheck },
  { key: "budget", icon: Eye },
  { key: "promises", icon: Scale },
  { key: "contributions", icon: WalletCards },
  { key: "reports", icon: Flag },
] as const

export default function TrustPage() {
  const { t } = useTranslation()
  const principles = principleKeys.map(({ key, icon }) => ({
    key,
    icon,
    title: t(`trust.principles.${key}.title`),
    text: t(`trust.principles.${key}.text`),
  }))

  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <p className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">{t("trust.eyebrow")}</p>
      <h1 className="mt-4 max-w-3xl font-heading text-4xl font-bold text-ink sm:text-5xl">{t("trust.title")}</h1>
      <p className="mt-6 max-w-3xl text-lg leading-relaxed text-ink-secondary">{t("trust.intro")}</p>
      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {principles.map(({ key, icon: Icon, title, text }) => (
          <article key={key} className="rounded-[20px] border border-black/5 bg-surface p-7 shadow-sm">
            <Icon className="size-6 text-gold-dark" />
            <h2 className="mt-5 font-heading text-2xl font-bold text-ink">{title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-secondary">{text}</p>
          </article>
        ))}
      </div>
      <section className="mt-12 border-l-4 border-gold bg-[#fbfaf6] p-7">
        <h2 className="font-heading text-2xl font-bold text-ink">{t("trust.transparency.title")}</h2>
        <p className="mt-3 leading-relaxed text-ink-secondary">{t("trust.transparency.text")}</p>
      </section>
    </section>
  )
}
