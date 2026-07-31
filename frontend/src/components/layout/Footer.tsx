import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

export function Footer() {
  const { t } = useTranslation("common")
  return (
    <footer className="border-t border-black/5 bg-surface-alt">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="flex flex-col items-start justify-between gap-10 sm:flex-row sm:items-center">
          <div className="max-w-sm space-y-3">
            <p className="flex items-center gap-2.5 font-heading text-2xl font-bold text-ink">
              <img
                src="/logo-mark.png"
                alt=""
                aria-hidden="true"
                className="size-10 rounded-full object-cover"
                width={640}
                height={640}
              />
              <span>
                Jappandale<span className="text-gold">.</span>
              </span>
            </p>
            <div aria-hidden="true" className="h-[3px] w-20 rounded-full bg-gradient-to-r from-gold to-gold-dark" />
            <p className="text-sm leading-relaxed text-ink-secondary">
              {t("footer.tagline")}
            </p>
          </div>

          <div className="grid w-full gap-8 text-sm min-[430px]:grid-cols-2 sm:w-auto sm:grid-cols-3 sm:gap-10">
          <nav aria-label={t("footer.understandLabel")} className="flex flex-col gap-2">
            <span className="text-xs font-semibold tracking-[3px] text-ink-muted uppercase">{t("footer.understandLabel")}</span>
            <Link to="/#comment-ca-marche" className="w-fit text-ink-secondary hover:text-gold-dark">{t("footer.howItWorks")}</Link>
            <Link to="/a-propos" className="w-fit text-ink-secondary hover:text-gold-dark">{t("footer.about")}</Link>
            <Link to="/confiance" className="w-fit text-ink-secondary hover:text-gold-dark">{t("footer.trust")}</Link>
            <Link to="/contact" className="w-fit text-ink-secondary hover:text-gold-dark">{t("footer.support")}</Link>
          </nav>
          <nav aria-label={t("footer.accountLabel")} className="flex flex-col gap-2">
            <span className="text-xs font-semibold tracking-[3px] text-ink-muted uppercase">{t("footer.accountLabel")}</span>
            <Link
              to="/inscription"
              className="w-fit rounded-sm text-ink-secondary transition-colors outline-none hover:text-gold-dark focus-visible:ring-2 focus-visible:ring-gold-dark/50"
            >
              {t("footer.createAccount")}
            </Link>
            <Link
              to="/connexion"
              className="w-fit rounded-sm text-ink-secondary transition-colors outline-none hover:text-gold-dark focus-visible:ring-2 focus-visible:ring-gold-dark/50"
            >
              {t("footer.login")}
            </Link>
          </nav>
          <nav aria-label={t("footer.legalNavLabel")} className="flex flex-col gap-2">
            <span className="text-xs font-semibold tracking-[3px] text-ink-muted uppercase">{t("footer.legalLabel")}</span>
            <Link to="/mentions-legales" className="w-fit text-ink-secondary hover:text-gold-dark">{t("footer.legalNotice")}</Link>
            <Link to="/confidentialite" className="w-fit text-ink-secondary hover:text-gold-dark">{t("footer.privacy")}</Link>
            <Link to="/conditions" className="w-fit text-ink-secondary hover:text-gold-dark">{t("footer.terms")}</Link>
          </nav>
          </div>
        </div>

        <div className="mt-12 border-t border-black/5 pt-6">
          <p className="text-xs text-ink-muted">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  )
}
