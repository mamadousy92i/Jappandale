import { useEffect, useRef, useState } from "react"

/**
 * Révèle un élément lorsqu'il entre dans le viewport (une seule fois).
 * Retourne une ref à poser sur l'élément et un booléen `visible`.
 * Se dégrade proprement si IntersectionObserver est indisponible.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
            break
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return { ref, visible }
}
