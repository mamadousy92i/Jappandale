import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"

import { useAuth } from "@/lib/auth"

export function RequireVerifiedEmail({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (user && !user.email_verified) return <Navigate to="/verifier-email" replace />
  return <>{children}</>
}
