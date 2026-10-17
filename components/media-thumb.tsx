import { ImageIcon, Play } from "./ui/icons";
import { duration as fmtDuration, toneFor } from "@/lib/format";
import type { Media } from "@/lib/types";

/** Square-ish preview used in grids; falls back to a soft placeholder. */
export function MediaThumb({
  media,
  className = "",
  showDuration = true,
}: {
  media: Media;
  className?: string;
  showDuration?: boolean;
}) {
  const src = media.thumbUrl ?? (media.type === "photo" ? media.url : null);
  return (
    <span
      className={`relative flex items-center justify-center overflow-hidden text-placeholder ${className}`}
      style={{ background: toneFor(media.id) }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
      ) : (
        <ImageIcon size={28} strokeWidth={1.1} />
      )}
      {media.type === "video" && showDuration && (
        <span className="absolute bottom-1.5 left-1.5 flex items-center gap-[3px] rounded-[10px] bg-ink/70 px-[7px] py-0.5 text-[11px] text-white">
          <Play size={9} />
          {fmtDuration(media.duration)}
        </span>
      )}
    </span>
  );
}
