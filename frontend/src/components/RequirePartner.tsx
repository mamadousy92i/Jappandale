import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"

import { useAuth } from "@/lib/auth"

export function RequirePartner({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  if (user?.role !== "PARTENAIRE") return <Navigate to="/compte" replace />

  return <>{children}</>
}
