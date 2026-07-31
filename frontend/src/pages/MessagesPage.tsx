import { useTranslation } from "react-i18next"

import { MessagesSection } from "@/components/account/MessagesSection"

export default function MessagesPage() {
  const { t } = useTranslation("activity")
  return (
    <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
      <div>
        <p className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">{t("messages.eyebrow")}</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-ink sm:text-4xl">{t("messages.title")}</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          {t("messages.intro")}
        </p>
      </div>

      <div className="mt-9">
        <MessagesSection />
      </div>
    </section>
  )
}
