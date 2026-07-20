import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"

export function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:h-[4.5rem] sm:px-6">
        <Link
          to="/"
          className="group rounded-md font-heading text-xl font-bold tracking-tight text-ink transition-colors outline-none hover:text-ink/80 focus-visible:ring-2 focus-visible:ring-gold-dark/50 sm:text-2xl"
        >
          Jappandale
          <span className="text-gold transition-transform duration-300 [display:inline-block] group-hover:-translate-y-0.5">
            .
          </span>
        </Link>

        <nav aria-label="Navigation principale" className="flex items-center gap-1.5 sm:gap-3">
          {user ? (
            <div className="flex items-center gap-2 sm:gap-4" data-testid="header-user">
              <Link
                to="/compte"
                className="group flex max-w-40 items-center gap-2 rounded-full py-1 pr-1 pl-1 outline-none focus-visible:ring-2 focus-visible:ring-gold-dark/50 sm:max-w-56"
              >
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gold/15 font-heading text-sm font-bold text-gold-dark transition-colors group-hover:bg-gold/25"
                >
                  {(user.first_name || user.email).charAt(0).toUpperCase()}
                </span>
                <span className="hidden truncate text-sm font-medium text-ink-secondary transition-colors group-hover:text-ink sm:inline">
                  {user.first_name || user.email}
                </span>
              </Link>
              <Button
                variant="outline"
                onClick={logout}
                className="rounded-full border-black/10 px-4 text-ink-secondary transition-all hover:border-black/20 hover:bg-surface-alt hover:text-ink"
              >
                Se déconnecter
              </Button>
            </div>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                className="rounded-full px-3 text-ink-secondary hover:bg-surface-alt hover:text-ink sm:px-4"
              >
                <Link to="/connexion">Se connecter</Link>
              </Button>
              <Button
                asChild
                className="rounded-full bg-gold px-4 font-semibold text-ink shadow-sm transition-all hover:bg-gold-light hover:shadow-md sm:px-5"
              >
                <Link to="/inscription">S'inscrire</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
