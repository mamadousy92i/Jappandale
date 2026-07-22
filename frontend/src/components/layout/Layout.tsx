import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { Footer } from "./Footer";
import { Header } from "./Header";

const routeMeta = [
  {
    pattern: /^\/$/,
    title: "Jappandale — Financement participatif au Sénégal",
    description:
      "Découvrez et soutenez des projets sénégalais transparents et porteurs d’impact.",
  },
  {
    pattern: /^\/campagnes\/nouvelle/,
    title: "Créer une campagne — Jappandale",
    description:
      "Présentez votre projet et préparez votre campagne de financement participatif.",
  },
  {
    pattern: /^\/campagnes/,
    title: "Campagnes — Jappandale",
    description:
      "Explorez les campagnes de financement participatif disponibles sur Jappandale.",
  },
  {
    pattern: /^\/a-propos/,
    title: "À propos — Jappandale",
    description:
      "Découvrez la mission, les engagements et le fonctionnement de Jappandale.",
  },
  {
    pattern: /^\/administration/,
    title: "Administration — Jappandale",
    description:
      "Pilotez les campagnes, les vérifications et l’activité de la plateforme.",
  },
  {
    pattern: /^\/compte/,
    title: "Mon compte — Jappandale",
    description: "Gérez votre profil et vos informations sur Jappandale.",
  },
  {
    pattern: /^\/connexion/,
    title: "Connexion — Jappandale",
    description: "Connectez-vous à votre espace Jappandale.",
  },
  {
    pattern: /^\/inscription/,
    title: "Créer un compte — Jappandale",
    description:
      "Rejoignez Jappandale comme porteur de projet ou contributeur.",
  },
];

export function Layout() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    const meta = routeMeta.find((item) => item.pattern.test(pathname)) ?? {
      title: "Jappandale",
      description: "Plateforme sénégalaise de financement participatif.",
    };
    document.title = meta.title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", meta.description);
  }, [pathname]);

  useEffect(() => {
    if (hash) {
      window.requestAnimationFrame(() => {
        document.getElementById(hash.slice(1))?.scrollIntoView();
      });
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <a
        href="#main-content"
        className="sr-only z-[200] rounded-lg bg-ink px-4 py-3 text-white focus:fixed focus:top-3 focus:left-3 focus:not-sr-only"
      >
        Aller au contenu principal
      </a>
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
