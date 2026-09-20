import { useRef, useState } from "react";
import { Play } from "lucide-react";
import { useTranslation } from "react-i18next";

import { extractYoutubeId, youtubeEmbedUrl, youtubeThumbnailUrl } from "@/lib/video";

/** Durée (en secondes) de la boucle d'aperçu jouée avant que la personne ne lance la vidéo complète. */
const TRAILER_DURATION_SECONDS = 5;

function PlayOverlay() {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/35"
    >
      <span className="flex size-16 items-center justify-center rounded-full bg-white/90 text-ink shadow-lg transition-transform group-hover:scale-105">
        <Play className="ml-1 size-7" fill="currentColor" />
      </span>
    </span>
  );
}

/** Lecteur pour une vidéo hébergée directement (fichier téléversé ou lien direct vers un fichier vidéo).
 * Tant que la personne n'a pas cliqué, seules les {@link TRAILER_DURATION_SECONDS} premières secondes
 * sont jouées en boucle, en silence, comme un mini-aperçu — la vidéo complète ne démarre qu'au clic. */
function DirectVideoPlayer({ src }: { src: string }) {
  const { t } = useTranslation("campaignDetail");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [expanded, setExpanded] = useState(false);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video && video.currentTime >= TRAILER_DURATION_SECONDS) {
      video.currentTime = 0;
    }
  };

  return (
    <div className="group relative aspect-video w-full overflow-hidden bg-black">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        src={src}
        className="size-full object-cover"
        controls={expanded}
        autoPlay={!expanded}
        muted={!expanded}
        playsInline
        preload="metadata"
        onTimeUpdate={expanded ? undefined : handleTimeUpdate}
      />
      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label={t("video.play")}
          className="absolute inset-0"
        >
          <PlayOverlay />
        </button>
      )}
      {!expanded && (
        <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
          {t("video.previewBadge")}
        </span>
      )}
    </div>
  );
}

/** Lecteur pour une vidéo YouTube : vignette statique cliquable, l'iframe n'est chargée qu'au clic. */
function YoutubePlayer({ videoId }: { videoId: string }) {
  const { t } = useTranslation("campaignDetail");
  const [expanded, setExpanded] = useState(false);

  if (expanded) {
    return (
      <div className="aspect-video w-full overflow-hidden bg-black">
        <iframe
          src={youtubeEmbedUrl(videoId)}
          title={t("video.title")}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="size-full"
        />
      </div>
    );
  }

  return (
    <div className="group relative aspect-video w-full overflow-hidden bg-black">
      <img src={youtubeThumbnailUrl(videoId)} alt="" className="size-full object-cover" />
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-label={t("video.play")}
        className="absolute inset-0"
      >
        <PlayOverlay />
      </button>
    </div>
  );
}

/** Affiche la vidéo de présentation d'une campagne, qu'elle vienne d'un fichier téléversé ou d'un lien. */
export function CampaignVideoPlayer({
  videoFileUrl,
  videoLinkUrl,
}: {
  videoFileUrl: string | null;
  videoLinkUrl: string | null;
}) {
  const link = videoLinkUrl?.trim() || null;
  const youtubeId = link ? extractYoutubeId(link) : null;

  if (youtubeId) return <YoutubePlayer videoId={youtubeId} />;
  if (link) return <DirectVideoPlayer src={link} />;
  if (videoFileUrl) return <DirectVideoPlayer src={videoFileUrl} />;
  return null;
}
