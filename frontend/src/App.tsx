import { useEffect, useState } from "react"

import { apiFetch } from "@/lib/api"

function App() {
  const [apiOk, setApiOk] = useState<boolean | null>(null)

  useEffect(() => {
    apiFetch("/health/")
      .then(() => setApiOk(true))
      .catch(() => setApiOk(false))
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="text-xs font-semibold uppercase tracking-[4px] text-gold-dark">
        Financement participatif
      </span>
      <h1 className="font-heading text-5xl">Jappandale</h1>
      <p className="max-w-md text-ink-secondary">
        La plateforme sénégalaise de financement participatif. En construction.
      </p>
      <p className="text-sm text-ink-muted">
        API backend :{" "}
        {apiOk === null ? "vérification…" : apiOk ? "✅ connectée" : "❌ injoignable"}
      </p>
    </main>
  )
}

export default App
