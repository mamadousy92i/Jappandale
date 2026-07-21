import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"

import { useAuth } from "@/lib/auth"

/**
 * Protège une route : redirige vers /connexion si l'utilisateur n'est pas
 * authentifié, en attendant la fin du chargement initial de la session.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-ink-muted">
        Chargement…
      </div>
    )
  }

  if (!user) return <Navigate to="/connexion" replace />

  return <>{children}</>
}
