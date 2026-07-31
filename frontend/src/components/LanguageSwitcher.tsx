import { useTranslation } from "react-i18next"

import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/i18n"

const languageLabels: Record<SupportedLanguage, string> = {
  fr: "Français",
  wo: "Wolof",
}

/** Bascule la langue de l'interface (français / wolof). */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { i18n } = useTranslation()

  return (
    <div
      role="group"
      aria-label="Langue de l'interface"
      className={`inline-flex items-center gap-0.5 rounded-full border border-black/10 bg-surface p-1 text-xs font-semibold ${className}`}
    >
      {SUPPORTED_LANGUAGES.map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => void i18n.changeLanguage(lang)}
          aria-pressed={i18n.resolvedLanguage === lang}
          className={`rounded-full px-3 py-1.5 transition-colors ${
            i18n.resolvedLanguage === lang
              ? "bg-gold text-ink"
              : "text-ink-secondary hover:text-ink"
          }`}
        >
          {languageLabels[lang]}
        </button>
      ))}
    </div>
  )
}
