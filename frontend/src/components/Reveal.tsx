import type { CSSProperties, ReactNode } from "react"

import { useReveal } from "@/hooks/useReveal"

interface RevealProps {
  children: ReactNode
  className?: string
  /** Décalage d'apparition en millisecondes (effet cascade sur les grilles). */
  delay?: number
}

/**
 * Enveloppe un contenu et le fait apparaître en douceur (fondu + translation)
 * quand il entre dans le viewport. Respecte `prefers-reduced-motion`.
 */
export function Reveal({ children, className = "", delay = 0 }: RevealProps) {
  const { ref, visible } = useReveal<HTMLDivElement>()
  const style: CSSProperties | undefined = delay ? { transitionDelay: `${delay}ms` } : undefined

  return (
    <div
      ref={ref}
      style={style}
      className={`transition duration-700 ease-out will-change-transform motion-reduce:transition-none ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-8 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100"
      } ${className}`}
    >
      {children}
    </div>
  )
}
