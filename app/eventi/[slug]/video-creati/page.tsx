"use client";

import { useEffect, useState } from "react";
import { useOwnedEvent } from "@/components/account-context";
import { Download, Film, Music, Sparkle, Trash } from "@/components/ui/icons";
import { BackHeader, Button, ButtonLink, Screen, Spinner, useToast } from "@/components/ui/kit";
import { downloadUrl } from "@/lib/album";
import { errorMessage } from "@/lib/errors";
import { deleteVideo, listVideos } from "@/lib/events";
import { duration as fmtDuration } from "@/lib/format";
import type { GeneratedVideo, Transition } from "@/lib/types";

const TRANSITION_LABEL: Record<Transition, string> = {
  fade: "Dissolvenza",
  zoom: "Zoom lento",
  slide: "Scorrimento",
};

function createdLabel(v: GeneratedVideo): string {
  if (!v.createdAt) return "Appena creato";
  return v.createdAt.toDate().toLocaleString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function VideoCreati() {
  const { event } = useOwnedEvent();
  const [videos, setVideos] = useState<GeneratedVideo[] | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast, showToast] = useToast();

  useEffect(() => {
    listVideos(event.slug)
      .then(setVideos)
      .catch((e) => {
        setVideos([]);
        showToast(errorMessage(e));
      });
  }, [event.slug, showToast]);

  async function remove(v: GeneratedVideo) {
    if (!window.confirm("Eliminare questo video? L'operazione non si può annullare.")) return;
    setDeleting(v.id);
    try {
      await deleteVideo(event.slug, v);
      setVideos((list) => list?.filter((x) => x.id !== v.id) ?? null);
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Screen className="safe-bottom gap-[18px] px-4 pt-3">
      <BackHeader
        href={`/eventi/${event.slug}`}
        label="Torna alla gestione dell'evento"
        title="I vostri video"
        subtitle={
          videos?.length ? `${videos.length} ${videos.length === 1 ? "video creato" : "video creati"}` : undefined
        }
      />

      {videos === null ? (
        <div className="flex justify-center py-20 text-olive">
          <Spinner />
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-8 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-sage-soft text-olive-dark">
            <Film size={26} />
          </span>
          <p className="text-[15px] leading-normal text-ink-2">
            Non avete ancora creato nessun video. Scegliete i ricordi più belli e la musica: qui ritroverete ogni
            versione.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {videos.map((v) => {
            const ext = v.mimeType === "video/webm" ? "webm" : "mp4";
            return (
              <li key={v.id} className="flex flex-col gap-3 rounded-[22px] border border-line bg-white p-3">
                <video
                  src={v.url}
                  controls
                  playsInline
                  preload="metadata"
                  className="aspect-video w-full rounded-[14px] bg-ink"
                />
                <div className="flex flex-col gap-1 px-1">
                  <span className="text-[15px] font-medium">{createdLabel(v)}</span>
                  <span className="flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
                    <span>{fmtDuration(v.duration)}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {v.sceneCount} {v.sceneCount === 1 ? "scena" : "scene"}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{TRANSITION_LABEL[v.transition] ?? v.transition}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-[13px] text-muted">
                    <Music size={14} />
                    <span className="truncate">{v.trackTitle}</span>
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="md"
                    className="flex-1 text-sm"
                    onClick={() => downloadUrl(v.url, `video-ricordo-${event.slug}-${v.id}.${ext}`)}
                  >
                    <Download size={18} />
                    Scarica
                  </Button>
                  <Button
                    size="md"
                    variant="outline"
                    className="text-sm text-heart"
                    aria-label="Elimina video"
                    loading={deleting === v.id}
                    onClick={() => remove(v)}
                  >
                    <Trash size={18} />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ButtonLink size="xl" block className="mt-auto" href={`/eventi/${event.slug}/seleziona`}>
        <Sparkle size={20} />
        Crea un nuovo video
      </ButtonLink>
      {toast}
    </Screen>
  );
}
