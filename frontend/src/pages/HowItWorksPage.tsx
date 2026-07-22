import { Link } from "react-router-dom"
import { CheckCircle2, FileText, HandCoins, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"

const steps = [
  { icon: FileText, title: "Présenter le projet", text: "Le porteur décrit le besoin, les bénéficiaires, le budget et le calendrier prévu." },
  { icon: ShieldCheck, title: "Faire vérifier le dossier", text: "L’identité, l’activité et les informations de campagne sont relues avant publication." },
  { icon: HandCoins, title: "Mobiliser les contributeurs", text: "La page publique permet de suivre l’objectif, les soutiens et les actualités du projet." },
  { icon: CheckCircle2, title: "Rendre compte", text: "Le porteur publie des nouvelles sur les étapes franchies et les éventuelles difficultés." },
]

export default function HowItWorksPage() {
  return <div><section className="border-b border-black/5 bg-[#fbfaf6]"><div className="mx-auto max-w-4xl px-6 py-16 text-center sm:py-24"><p className="text-xs font-semibold tracking-[4px] text-gold-dark uppercase">Fonctionnement</p><h1 className="mt-4 font-heading text-4xl font-bold text-ink sm:text-5xl">Un parcours clair, de l’idée au suivi.</h1><p className="mx-auto mt-5 max-w-2xl leading-relaxed text-ink-secondary">Jappandale met la transparence du projet et la vérification du porteur au centre de chaque campagne.</p></div></section><section className="mx-auto grid max-w-6xl gap-px bg-black/5 px-6 py-16 sm:grid-cols-2 sm:py-20">{steps.map(({icon: Icon,title,text}, index)=><article key={title} className="bg-white p-7 sm:p-9"><div className="flex items-center justify-between"><Icon className="size-6 text-gold-dark" /><span className="font-heading text-2xl font-bold text-black/10">0{index+1}</span></div><h2 className="mt-6 font-heading text-2xl font-bold text-ink">{title}</h2><p className="mt-3 text-sm leading-relaxed text-ink-secondary">{text}</p></article>)}</section><section className="px-6 pb-20 text-center"><h2 className="font-heading text-3xl font-bold text-ink">Prêt à commencer ?</h2><div className="mt-6 flex flex-wrap justify-center gap-3"><Button asChild className="rounded-full bg-gold px-7 text-ink"><Link to="/campagnes">Découvrir les projets</Link></Button><Button asChild variant="outline" className="rounded-full px-7"><Link to="/inscription">Créer un compte</Link></Button></div></section></div>
}
