import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Bell, Menu, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"

export function Header() {
  const { user, logout, authFetch } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const closeMenu = () => setMenuOpen(false)

  const handleLogout = () => {
    logout()
    closeMenu()
  }

  useEffect(() => {
    if (!user) {
      setUnreadCount(0)
      return
    }
    authFetch("/notifications/unread-count/")
      .then((data) => setUnreadCount((data as { count: number }).count))
      .catch(() => setUnreadCount(0))
  }, [authFetch, user])

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:h-[4.5rem] sm:px-6">
        <Link
          to="/"
          onClick={closeMenu}
          className="group flex items-center gap-2.5 rounded-md font-heading text-xl font-bold tracking-tight text-ink outline-none focus-visible:ring-2 focus-visible:ring-gold-dark/50"
        >
          <img
            src="/logo-mark.png"
            alt=""
            aria-hidden="true"
            className="size-9 shrink-0 rounded-full object-cover sm:size-10"
            width={160}
            height={160}
          />
          <span>
            Jappandale<span className="text-gold">.</span>
          </span>
        </Link>

        <nav aria-label="Navigation principale" className="hidden items-center gap-3 md:flex">
          <Link
            to="/campagnes"
            className="rounded-full px-3 py-1.5 text-sm font-medium text-ink-secondary hover:text-ink"
          >
            Campagnes
          </Link>
          {user ? (
            <div className="flex items-center gap-3" data-testid="header-user">
              {user.role === "ADMIN" && <Link to="/administration" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-black">Administration</Link>}
              <Link to="/notifications" aria-label={`${unreadCount} notification(s) non lue(s)`} className="relative flex size-10 items-center justify-center rounded-full border border-black/10 text-ink-secondary hover:border-gold hover:text-ink">
                <Bell className="size-4.5" />
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-gold-dark px-1 text-[10px] font-bold text-white">{Math.min(unreadCount, 99)}</span>}
              </Link>
              <Link to="/compte" className="text-sm font-medium text-ink-secondary hover:text-ink">
                {user.first_name || user.email}
              </Link>
              <Button
                variant="outline"
                onClick={logout}
                className="rounded-full border-black/10 px-4 text-ink-secondary"
              >
                Se déconnecter
              </Button>
            </div>
          ) : (
            <>
              <Button asChild variant="ghost" className="rounded-full px-4 text-ink-secondary">
                <Link to="/connexion">Se connecter</Link>
              </Button>
              <Button asChild className="rounded-full bg-gold px-5 font-semibold text-ink hover:bg-gold-light">
                <Link to="/inscription">Créer un compte</Link>
              </Button>
            </>
          )}
        </nav>

        <button
          type="button"
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
          className="flex size-10 items-center justify-center rounded-full border border-black/10 text-ink md:hidden"
        >
          {menuOpen ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
        </button>
      </div>

      {menuOpen && (
        <nav
          aria-label="Navigation mobile"
          className="border-t border-black/5 bg-surface px-4 py-4 shadow-lg md:hidden"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-2">
            <Link
              to="/campagnes"
              onClick={closeMenu}
              className="rounded-xl px-4 py-3 font-medium text-ink hover:bg-surface-alt"
            >
              Voir les campagnes
            </Link>
            {user ? (
              <>
                {user.role === "ADMIN" && <Link to="/administration" onClick={closeMenu} className="rounded-xl bg-ink px-4 py-3 font-semibold text-white">Administration</Link>}
                <Link to="/notifications" onClick={closeMenu} className="flex items-center justify-between rounded-xl px-4 py-3 font-medium text-ink hover:bg-surface-alt"><span>Notifications</span>{unreadCount > 0 && <span className="rounded-full bg-gold-dark px-2 py-0.5 text-xs font-bold text-white">{unreadCount}</span>}</Link>
                <Link
                  to="/compte"
                  onClick={closeMenu}
                  className="rounded-xl px-4 py-3 font-medium text-ink hover:bg-surface-alt"
                >
                  Mon espace
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-xl px-4 py-3 text-left font-medium text-ink-secondary hover:bg-surface-alt"
                >
                  Se déconnecter
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/connexion"
                  onClick={closeMenu}
                  className="rounded-xl px-4 py-3 font-medium text-ink hover:bg-surface-alt"
                >
                  Se connecter
                </Link>
                <Link
                  to="/inscription"
                  onClick={closeMenu}
                  className="rounded-xl bg-gold px-4 py-3 text-center font-semibold text-ink"
                >
                  Créer un compte
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}
