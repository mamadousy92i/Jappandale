import { Link } from "react-router-dom"

export function Footer() {
  return (
    <footer className="border-t border-black/5 bg-surface-alt">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="flex flex-col items-start justify-between gap-10 sm:flex-row sm:items-center">
          <div className="max-w-sm space-y-3">
            <p className="font-heading text-2xl font-bold text-ink">
              Jappandale<span className="text-gold">.</span>
            </p>
            <div aria-hidden="true" className="h-[3px] w-20 rounded-full bg-gradient-to-r from-gold to-gold-dark" />
            <p className="text-sm leading-relaxed text-ink-secondary">
              Le financement participatif au service des projets sénégalais. Ensemble,
              donnons vie aux idées d'ici.
            </p>
          </div>

          <nav aria-label="Liens du pied de page" className="flex flex-col gap-2 text-sm">
            <span className="text-xs font-semibold tracking-[3px] text-ink-muted uppercase">
              Rejoindre
            </span>
            <Link
              to="/inscription"
              className="w-fit rounded-sm text-ink-secondary transition-colors outline-none hover:text-gold-dark focus-visible:ring-2 focus-visible:ring-gold-dark/50"
            >
              Créer un compte
            </Link>
            <Link
              to="/connexion"
              className="w-fit rounded-sm text-ink-secondary transition-colors outline-none hover:text-gold-dark focus-visible:ring-2 focus-visible:ring-gold-dark/50"
            >
              Se connecter
            </Link>
          </nav>
        </div>

        <div className="mt-12 border-t border-black/5 pt-6">
          <p className="text-xs text-ink-muted">
            © {new Date().getFullYear()} Jappandale — Dakar, Sénégal
          </p>
        </div>
      </div>
    </footer>
  )
}
