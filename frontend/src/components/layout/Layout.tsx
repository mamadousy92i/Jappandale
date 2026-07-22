import { Outlet } from "react-router-dom"

import { Footer } from "./Footer"
import { Header } from "./Header"

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <a href="#main-content" className="sr-only z-[200] rounded-lg bg-ink px-4 py-3 text-white focus:fixed focus:top-3 focus:left-3 focus:not-sr-only">Aller au contenu principal</a>
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
