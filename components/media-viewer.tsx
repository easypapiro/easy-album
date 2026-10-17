"use client";

import { useEffect } from "react";
import { Close } from "./ui/icons";
import type { Media } from "@/lib/types";

/** Full-screen view of one photo or video at original quality. */
export function MediaViewer({ media, onClose }: { media: Media | null; onClose: () => void }) {
  useEffect(() => {
    if (!media) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [media, onClose]);

  if (!media) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Ricordo di ${media.uploaderName}`}
      className="fixed inset-0 z-50 flex flex-col bg-black animate-[fade-in_.15s_ease-out]"
    >
      <div className="flex items-center justify-between px-3 pt-[max(12px,env(safe-area-inset-top))] pb-2 text-white">
        <span className="pl-1 text-sm">{media.uploaderName}</span>
        <button
          onClick={onClose}
          aria-label="Chiudi"
          className="flex size-11 items-center justify-center rounded-full bg-white/10"
        >
          <Close size={18} />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center pb-[env(safe-area-inset-bottom)]">
        {media.type === "video" ? (
          <video
            src={media.url}
            poster={media.thumbUrl ?? undefined}
            controls
            autoPlay
            playsInline
            className="max-h-full max-w-full"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.url}
            alt={media.caption || `Foto di ${media.uploaderName}`}
            className="max-h-full max-w-full object-contain"
            style={media.thumbUrl ? { backgroundImage: `url(${media.thumbUrl})`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" } : undefined}
          />
        )}
      </div>
    </div>
  );
}
