import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  UserRound,
  X,
} from "lucide-react";

import { UserAvatar } from "@/components/account/UserAvatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/types";

const roleLabels: Record<Role, string> = {
  PORTEUR: "Porteur de projet",
  CONTRIBUTEUR: "Contributeur",
  ADMIN: "Administrateur",
};

export function Header() {
  const { user, logout, authFetch } = useAuth();
  const location = useLocation();
  const profileRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const closeMenus = () => {
    setMenuOpen(false);
    setProfileOpen(false);
  };
  const isCurrentPath = (path: string) =>
    path === "/campagnes"
      ? location.pathname.startsWith("/campagnes")
      : location.pathname === path;

  const handleLogout = () => {
    logout();
    closeMenus();
  };

  useEffect(() => {
    closeMenus();
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!profileOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node))
        setProfileOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [profileOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    authFetch("/notifications/unread-count/")
      .then((data) => setUnreadCount((data as { count: number }).count))
      .catch(() => setUnreadCount(0));
  }, [authFetch, user]);

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:h-[4.5rem] sm:px-6">
        <Link
          to="/"
          onClick={closeMenus}
          className="group flex shrink-0 items-center gap-2.5 rounded-md font-heading text-xl font-bold tracking-tight text-ink outline-none focus-visible:ring-2 focus-visible:ring-gold-dark/50"
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

        <nav
          aria-label="Navigation principale"
          className="hidden flex-1 items-center justify-center gap-1 md:flex"
        >
          <Link
            to="/campagnes"
            aria-current={isCurrentPath("/campagnes") ? "page" : undefined}
            className="rounded-full px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-surface-alt hover:text-ink aria-[current=page]:bg-gold/15 aria-[current=page]:text-ink"
          >
            Campagnes
          </Link>
          {user?.role === "PORTEUR" && (
            <Link
              to="/campagnes?vue=mes-campagnes"
              className="rounded-full px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-surface-alt hover:text-ink"
            >
              Mes campagnes
            </Link>
          )}
          <Link
            to="/#comment-ca-marche"
            className="rounded-full px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-surface-alt hover:text-ink"
          >
            Comment ça marche
          </Link>
          <Link
            to="/a-propos"
            aria-current={isCurrentPath("/a-propos") ? "page" : undefined}
            className="rounded-full px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-surface-alt hover:text-ink aria-[current=page]:bg-gold/15 aria-[current=page]:text-ink"
          >
            À propos
          </Link>
        </nav>

        <div className="ml-auto hidden shrink-0 items-center gap-2 md:flex">
          {user ? (
            <>
              <Link
                to="/notifications"
                aria-label={`${unreadCount} notification(s) non lue(s)`}
                className="relative flex size-10 items-center justify-center rounded-full border border-black/10 text-ink-secondary transition hover:border-gold hover:bg-gold/10 hover:text-ink"
              >
                <Bell className="size-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-gold-dark px-1 text-[10px] font-bold text-white">
                    {Math.min(unreadCount, 99)}
                  </span>
                )}
              </Link>
              <div
                ref={profileRef}
                className="relative"
                data-testid="header-user"
              >
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                  onClick={() => setProfileOpen((open) => !open)}
                  className="flex items-center gap-3 rounded-full border border-black/10 bg-white py-1.5 pr-3 pl-1.5 text-left shadow-sm transition hover:border-gold/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-dark/40"
                >
                  <UserAvatar user={user} size="sm" />
                  <span className="hidden max-w-32 leading-tight lg:block">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {user.first_name || user.email}
                    </span>
                    <span className="block truncate text-[11px] text-ink-muted">
                      {roleLabels[user.role]}
                    </span>
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`size-4 text-ink-muted transition-transform ${profileOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {profileOpen && (
                  <div
                    role="menu"
                    className="absolute top-[calc(100%+10px)] right-0 w-64 overflow-hidden rounded-2xl border border-black/10 bg-white p-2 shadow-xl shadow-black/10"
                  >
                    <div className="flex items-center gap-3 border-b border-black/5 px-3 py-3">
                      <UserAvatar user={user} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="truncate text-xs text-ink-muted">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="py-2">
                      {user.role === "ADMIN" && (
                        <Link
                          role="menuitem"
                          to="/administration"
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink hover:bg-surface-alt"
                        >
                          <LayoutDashboard className="size-4 text-gold-dark" />
                          Administration
                        </Link>
                      )}
                      {user.role === "PORTEUR" && (
                        <Link
                          role="menuitem"
                          to="/campagnes?vue=mes-campagnes"
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink hover:bg-surface-alt"
                        >
                          <FolderKanban className="size-4 text-gold-dark" />
                          Mes campagnes
                        </Link>
                      )}
                      <Link
                        role="menuitem"
                        to="/compte"
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink hover:bg-surface-alt"
                      >
                        <UserRound className="size-4 text-gold-dark" />
                        Mon profil
                      </Link>
                    </div>
                    <div className="border-t border-black/5 pt-2">
                      <button
                        role="menuitem"
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-700 hover:bg-red-50"
                      >
                        <LogOut className="size-4" />
                        Se déconnecter
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                className="rounded-full px-4 text-ink-secondary"
              >
                <Link to="/connexion">Se connecter</Link>
              </Button>
              <Button
                asChild
                className="rounded-full bg-gold px-5 font-semibold text-ink hover:bg-gold-light"
              >
                <Link to="/inscription">Créer un compte</Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-controls="mobile-navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
          className="ml-auto flex size-10 items-center justify-center rounded-full border border-black/10 text-ink md:hidden"
        >
          {menuOpen ? (
            <X aria-hidden="true" className="size-5" />
          ) : (
            <Menu aria-hidden="true" className="size-5" />
          )}
        </button>
      </div>

      {menuOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Navigation mobile"
          className="border-t border-black/5 bg-surface px-4 py-4 shadow-lg md:hidden"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-2">
            {user && (
              <div className="mb-2 flex items-center gap-3 rounded-2xl bg-surface-alt p-3">
                <UserAvatar user={user} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {roleLabels[user.role]}
                  </p>
                </div>
              </div>
            )}
            <Link
              to="/campagnes"
              onClick={closeMenus}
              aria-current={isCurrentPath("/campagnes") ? "page" : undefined}
              className="rounded-xl px-4 py-3 font-medium text-ink hover:bg-surface-alt aria-[current=page]:bg-gold/15"
            >
              Voir les campagnes
            </Link>
            <Link
              to="/#comment-ca-marche"
              onClick={closeMenus}
              className="rounded-xl px-4 py-3 font-medium text-ink hover:bg-surface-alt"
            >
              Comment ça marche
            </Link>
            <Link
              to="/a-propos"
              onClick={closeMenus}
              aria-current={isCurrentPath("/a-propos") ? "page" : undefined}
              className="rounded-xl px-4 py-3 font-medium text-ink hover:bg-surface-alt aria-[current=page]:bg-gold/15"
            >
              À propos
            </Link>
            {user ? (
              <>
                {user.role === "ADMIN" && (
                  <Link
                    to="/administration"
                    onClick={closeMenus}
                    className="rounded-xl bg-ink px-4 py-3 font-semibold text-white"
                  >
                    Administration
                  </Link>
                )}
                {user.role === "PORTEUR" && (
                  <Link
                    to="/campagnes?vue=mes-campagnes"
                    onClick={closeMenus}
                    className="rounded-xl px-4 py-3 font-medium text-ink hover:bg-surface-alt"
                  >
                    Mes campagnes
                  </Link>
                )}
                <Link
                  to="/notifications"
                  onClick={closeMenus}
                  className="flex items-center justify-between rounded-xl px-4 py-3 font-medium text-ink hover:bg-surface-alt"
                >
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-gold-dark px-2 py-0.5 text-xs font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </Link>
                <Link
                  to="/compte"
                  onClick={closeMenus}
                  className="rounded-xl px-4 py-3 font-medium text-ink hover:bg-surface-alt"
                >
                  Mon profil
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-xl px-4 py-3 text-left font-medium text-red-700 hover:bg-red-50"
                >
                  Se déconnecter
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/connexion"
                  onClick={closeMenus}
                  className="rounded-xl px-4 py-3 font-medium text-ink hover:bg-surface-alt"
                >
                  Se connecter
                </Link>
                <Link
                  to="/inscription"
                  onClick={closeMenus}
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
  );
}
