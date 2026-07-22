import { Eye, Flag, LockKeyhole, Scale, ShieldCheck } from "lucide-react"

const principles = [
  { icon: ShieldCheck, title: "Identité contrôlée", text: "Une campagne n’est publiée qu’après vérification des pièces requises du porteur et revue manuelle du dossier." },
  { icon: Eye, title: "Budget visible", text: "Les bénéficiaires, l’utilisation prévue des fonds, le calendrier et les actualités restent accessibles sur la page du projet." },
  { icon: Scale, title: "Promesses mesurées", text: "La vérification confirme la cohérence du dossier ; elle ne garantit ni le succès du projet ni un rendement financier." },
  { icon: LockKeyhole, title: "Paiement encore simulé", text: "Le MVP ne débite aucun compte réel. Wave et Orange Money ne seront affichés qu’après une intégration et des tests effectifs." },
  { icon: Flag, title: "Signalements examinés", text: "Chaque membre peut transmettre un signalement confidentiel. Il est conservé et traité depuis le back-office." },
]

export default function TrustPage() {
  return <section className="mx-auto max-w-5xl px-6 py-16 sm:py-24"><p className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">Confiance et transparence</p><h1 className="mt-4 max-w-3xl font-heading text-4xl font-bold text-ink sm:text-5xl">Ce que Jappandale vérifie — et ce qu’elle ne promet pas.</h1><p className="mt-6 max-w-3xl text-lg leading-relaxed text-ink-secondary">La confiance vient d’informations précises, de décisions traçables et d’une communication honnête sur les limites du service.</p><div className="mt-12 grid gap-5 sm:grid-cols-2">{principles.map(({icon:Icon,title,text})=><article key={title} className="rounded-[20px] border border-black/5 bg-surface p-7 shadow-sm"><Icon className="size-6 text-gold-dark"/><h2 className="mt-5 font-heading text-2xl font-bold text-ink">{title}</h2><p className="mt-3 text-sm leading-relaxed text-ink-secondary">{text}</p></article>)}</div><section className="mt-12 border-l-4 border-gold bg-[#fbfaf6] p-7"><h2 className="font-heading text-2xl font-bold text-ink">Une plateforme encore en phase MVP</h2><p className="mt-3 leading-relaxed text-ink-secondary">Les contributions servent actuellement à tester le parcours, les statuts de transaction et les tableaux de bord. Aucun débit, séquestre ou reversement réel n’est réalisé.</p></section></section>
}
