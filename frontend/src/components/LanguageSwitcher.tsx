import { useEffect, useRef, useState } from "react"
import { ChevronDown, Globe } from "lucide-react"
import { useTranslation } from "react-i18next"

import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/i18n"

const languageLabels: Record<SupportedLanguage, string> = {
  fr: "Français",
  wo: "Wolof",
  it: "Italiano",
  es: "Español",
}

const languageShortLabels: Record<SupportedLanguage, string> = {
  fr: "FR",
  wo: "WO",
  it: "IT",
  es: "ES",
}

/** Bascule la langue de l'interface (français / wolof / italien / espagnol), sous forme de liste déroulante. */
export function LanguageSwitcher({
  className = "",
  align = "right",
}: {
  className?: string
  /** Côté vers lequel la liste s'ouvre — à choisir selon la position du bouton à l'écran. */
  align?: "left" | "right"
}) {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const current = (i18n.resolvedLanguage as SupportedLanguage) || "fr"

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Langue de l'interface"
        className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-surface px-3 py-1.5 text-xs font-semibold text-ink-secondary transition-colors hover:border-gold hover:text-ink"
      >
        <Globe aria-hidden="true" className="size-3.5" />
        {languageShortLabels[current]}
        <ChevronDown className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute top-full z-30 mt-1.5 w-40 rounded-xl border border-black/5 bg-white p-1.5 shadow-lg ${
            align === "left" ? "left-0" : "right-0"
          }`}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              role="menuitemradio"
              aria-checked={current === lang}
              onClick={() => {
                void i18n.changeLanguage(lang)
                setOpen(false)
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium ${
                current === lang
                  ? "bg-gold/15 text-ink"
                  : "text-ink-secondary hover:bg-surface-alt hover:text-ink"
              }`}
            >
              {languageLabels[lang]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
