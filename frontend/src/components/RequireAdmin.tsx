import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"

import { useAuth } from "@/lib/auth"

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-ink-muted">Chargement de l’espace de gestion…</div>
  if (!user) return <Navigate to="/connexion" replace state={{ from: location.pathname }} />
  if (user.role !== "ADMIN") return <section className="mx-auto max-w-lg px-6 py-24 text-center"><p className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">Accès protégé</p><h1 className="mt-4 font-heading text-3xl font-bold text-ink">Espace réservé à l’équipe Jappandale</h1><p className="mt-4 text-ink-secondary">Votre compte ne dispose pas des droits nécessaires pour consulter cette page.</p></section>
  return <>{children}</>
}
