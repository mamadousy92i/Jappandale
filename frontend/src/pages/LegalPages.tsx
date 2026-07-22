import type { ReactNode } from "react"

function LegalLayout({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
      <p className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">{eyebrow}</p>
      <h1 className="mt-4 font-heading text-4xl font-bold text-ink sm:text-5xl">{title}</h1>
      <p className="mt-6 max-w-3xl text-lg leading-relaxed text-ink-secondary">{intro}</p>
      <div className="mt-12 space-y-9 [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-ink [&_p]:mt-3 [&_p]:leading-relaxed [&_p]:text-ink-secondary [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ul]:text-ink-secondary">{children}</div>
      <p className="mt-12 border-t border-black/10 pt-6 text-xs text-ink-muted">Version du 22 juillet 2026 — Jappandale.</p>
    </article>
  )
}

export function LegalNoticePage() {
  return (
    <LegalLayout eyebrow="Informations légales" title="Mentions légales" intro="Les informations essentielles sur l’édition et le fonctionnement actuel de Jappandale.">
      <section><h2>Éditeur du service</h2><p>Jappandale est une plateforme sénégalaise de financement participatif exploitée par l’équipe projet Jappandale, à Dakar, Sénégal.</p><p>Contact : utilisez le formulaire d’assistance disponible sur la plateforme.</p></section>
      <section><h2>Hébergement et responsabilité</h2><p>Les coordonnées de l’hébergeur seront renseignées dans le présent document dès sa désignation. Jappandale modère les campagnes avant publication, sans garantir leur réussite ni se substituer au porteur dans l’exécution du projet.</p></section>
      <section><h2>Fonctionnement du service</h2><p>Jappandale présente le montant, la campagne concernée et le statut de chaque contribution dans l’espace personnel du membre.</p></section>
    </LegalLayout>
  )
}

export function PrivacyPage() {
  return (
    <LegalLayout eyebrow="Données personnelles" title="Politique de confidentialité" intro="Jappandale limite la collecte de données à ce qui est nécessaire au fonctionnement, à la sécurité et à la modération du service.">
      <section><h2>Données traitées</h2><ul><li>identité, coordonnées et informations de compte ;</li><li>documents transmis pour la vérification KYC ;</li><li>campagnes, contributions, notifications et demandes d’assistance ;</li><li>signalements et journaux de décisions administratives.</li></ul></section>
      <section><h2>Finalités et accès</h2><p>Ces données servent à gérer les comptes, vérifier les porteurs, modérer les campagnes, sécuriser les parcours et répondre aux demandes. Les documents KYC et notes internes sont réservés aux personnes habilitées.</p></section>
      <section><h2>Durée, droits et sécurité</h2><p>Les durées de conservation sont définies selon les obligations applicables au Sénégal. Toute demande d’accès, de correction ou de suppression peut être adressée via le formulaire d’assistance. Les mots de passe sont stockés sous forme hachée et les liens de réinitialisation sont temporaires.</p></section>
    </LegalLayout>
  )
}

export function TermsPage() {
  return (
    <LegalLayout eyebrow="Règles d’utilisation" title="Conditions générales d’utilisation" intro="L’utilisation de Jappandale implique une présentation honnête des projets et un comportement respectueux envers la communauté.">
      <section><h2>Comptes et campagnes</h2><p>L’utilisateur fournit des informations exactes, protège ses identifiants et ne publie aucun contenu illicite, trompeur ou portant atteinte aux droits d’autrui. Une campagne peut être refusée, suspendue ou clôturée après examen.</p></section>
      <section><h2>Contributions</h2><p>Chaque contribution est rattachée au compte du membre et à la campagne concernée. Son montant, son statut et sa référence restent accessibles dans l’historique personnel.</p></section>
      <section><h2>Signalements et assistance</h2><p>Un utilisateur peut signaler une campagne avec des éléments précis. Les signalements abusifs sont interdits. Les décisions sont prises après revue et les informations internes d’enquête restent confidentielles.</p></section>
      <section><h2>Modalités financières</h2><p>Toute évolution relative aux frais, remboursements, reversements, responsabilités ou modalités de clôture fera l’objet d’une information claire dans le parcours concerné.</p></section>
    </LegalLayout>
  )
}
