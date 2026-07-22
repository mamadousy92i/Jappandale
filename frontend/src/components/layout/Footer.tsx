import { Link } from "react-router-dom"

export function Footer() {
  return (
    <footer className="border-t border-black/5 bg-surface-alt">
      <div className="mx-auto max-w-6xl px-6 py-14">
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
              Le financement participatif au service des projets sénégalais. Ensemble,
              donnons vie aux idées d'ici.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
          <nav aria-label="Comprendre" className="flex flex-col gap-2">
            <span className="text-xs font-semibold tracking-[3px] text-ink-muted uppercase">Comprendre</span>
            <Link to="/comment-ca-marche" className="w-fit text-ink-secondary hover:text-gold-dark">Comment ça marche</Link>
            <Link to="/confiance" className="w-fit text-ink-secondary hover:text-gold-dark">Confiance et transparence</Link>
            <Link to="/contact" className="w-fit text-ink-secondary hover:text-gold-dark">Assistance</Link>
          </nav>
          <nav aria-label="Compte" className="flex flex-col gap-2">
            <span className="text-xs font-semibold tracking-[3px] text-ink-muted uppercase">Compte</span>
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
          <nav aria-label="Informations légales" className="flex flex-col gap-2">
            <span className="text-xs font-semibold tracking-[3px] text-ink-muted uppercase">Légal</span>
            <Link to="/mentions-legales" className="w-fit text-ink-secondary hover:text-gold-dark">Mentions légales</Link>
            <Link to="/confidentialite" className="w-fit text-ink-secondary hover:text-gold-dark">Confidentialité</Link>
            <Link to="/conditions" className="w-fit text-ink-secondary hover:text-gold-dark">Conditions d’utilisation</Link>
          </nav>
          </div>
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
