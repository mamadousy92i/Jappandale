import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { CampaignListItem } from "@/lib/types";

const SLIDE_INTERVAL_MS = 5000;
const MAX_SLIDES = 6;

/** Image d'accueil : fait défiler les photos des projets publiés ; sans photo, garde l'image d'origine. */
export function HeroCarousel({ campaigns }: { campaigns: CampaignListItem[] }) {
  const { t } = useTranslation();
  const slides = campaigns
    .filter((campaign) => campaign.status === "PUBLIEE" && campaign.cover_image)
    .slice(0, MAX_SLIDES);
  const count = slides.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (active >= count) setActive(0);
  }, [active, count]);

  useEffect(() => {
    if (count < 2 || paused || reducedMotion) return;
    const timer = setInterval(() => {
      if (!document.hidden) setActive((index) => (index + 1) % count);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [count, paused, reducedMotion, active]);

  const frame =
    "aspect-[4/3] w-full rounded-[24px] object-cover shadow-[0_20px_60px_-30px_rgba(0,0,0,0.35)]";
  const captionBox =
    "absolute right-4 bottom-4 left-4 flex items-center justify-between gap-3 rounded-xl bg-black/70 px-4 py-3 text-sm text-white backdrop-blur-sm";

  if (count === 0) {
    return (
      <figure className="relative">
        <img
          src="/photos/porteur.jpg"
          alt={t("homepage.hero.imageAlt")}
          width={1200}
          height={900}
          fetchPriority="high"
          className={frame}
        />
        <figcaption className={captionBox}>
          <span className="flex items-center gap-2">
            <MapPin aria-hidden="true" className="size-4 text-gold" />
            {t("homepage.hero.imageCaption")}
          </span>
        </figcaption>
      </figure>
    );
  }

  const current = slides[Math.min(active, count - 1)];

  return (
    <figure
      className="relative"
      aria-roledescription="carousel"
      aria-label={t("homepage.hero.carouselLabel")}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[24px] bg-surface-alt shadow-[0_20px_60px_-30px_rgba(0,0,0,0.35)]">
        {slides.map((campaign, index) => (
          <img
            key={campaign.id}
            src={campaign.cover_image ?? ""}
            alt={index === active ? campaign.title : ""}
            aria-hidden={index !== active}
            width={1200}
            height={900}
            loading={index === 0 ? "eager" : "lazy"}
            fetchPriority={index === 0 ? "high" : "auto"}
            className={`absolute inset-0 size-full object-cover transition-opacity duration-700 motion-reduce:transition-none ${
              index === active ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </div>
      <figcaption className={captionBox}>
        <Link
          to={`/campagnes/${current.slug}`}
          className="flex min-w-0 items-center gap-2 hover:underline"
        >
          <MapPin aria-hidden="true" className="size-4 shrink-0 text-gold" />
          <span className="truncate">
            {current.title}
            {current.location ? ` — ${current.location}` : ""}
          </span>
        </Link>
        {count > 1 && (
          <div className="flex shrink-0 items-center">
            {slides.map((campaign, index) => (
              <button
                key={campaign.id}
                type="button"
                onClick={() => setActive(index)}
                aria-label={t("homepage.hero.slide", { n: index + 1 })}
                aria-current={index === active}
                className="group p-1"
              >
                <span
                  className={`block size-2 rounded-full transition-colors ${
                    index === active ? "bg-gold" : "bg-white/40 group-hover:bg-white/70"
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </figcaption>
    </figure>
  );
}
