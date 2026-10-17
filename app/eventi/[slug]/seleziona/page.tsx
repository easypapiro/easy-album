"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useOwnedEvent } from "@/components/account-context";
import { MediaThumb } from "@/components/media-thumb";
import { ArrowRight, ImageIcon } from "@/components/ui/icons";
import { BackHeader, Button, Chip, Spinner, useResetOnHide, useToast } from "@/components/ui/kit";
import { listAllMedia } from "@/lib/album";
import { errorMessage } from "@/lib/errors";
import { getVideoDraft, saveVideoDraft } from "@/lib/events";
import type { Media } from "@/lib/types";

const FILTERS = [
  { id: "all", label: "Tutti" },
  { id: "photo", label: "Foto" },
  { id: "video", label: "Video" },
  { id: "loved", label: "Più amati" },
] as const;

type Filter = (typeof FILTERS)[number]["id"];

export default function Seleziona() {
  const { event } = useOwnedEvent();
  const router = useRouter();
  const [media, setMedia] = useState<Media[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [saving, setSaving] = useState(false);
  const [toast, showToast] = useToast();
  useResetOnHide(() => setSaving(false));

  useEffect(() => {
    Promise.all([listAllMedia(event.slug), getVideoDraft(event.slug)])
      .then(([all, draft]) => {
        const ids = new Set(all.map((m) => m.id));
        setMedia(all);
        setSelected(draft.mediaIds.filter((id) => ids.has(id)));
      })
      .catch((e) => {
        setMedia([]);
        showToast(errorMessage(e));
      });
  }, [event.slug, showToast]);

  const visible = useMemo(() => {
    if (!media) return [];
    if (filter === "photo" || filter === "video") return media.filter((m) => m.type === filter);
    if (filter === "loved") {
      return media.filter((m) => m.likesCount > 0).sort((a, b) => b.likesCount - a.likesCount);
    }
    return media;
  }, [media, filter]);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function next() {
    setSaving(true);
    try {
      await saveVideoDraft(event.slug, { mediaIds: selected });
      router.push(`/eventi/${event.slug}/video`);
    } catch (e) {
      showToast(errorMessage(e));
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-cream">
      <header className="sticky top-0 z-10 flex flex-col gap-3 bg-cream px-4 pt-3 pb-3.5">
        <BackHeader
          href={`/eventi/${event.slug}`}
          label="Torna alla gestione dell'evento"
          title="Scegliete i ricordi"
          subtitle="Toccateli nell'ordine in cui volete vederli nel video"
        />
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {FILTERS.map((f) => (
            <Chip key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </Chip>
          ))}
        </div>
      </header>

      <main className="flex-1 pb-28">
        {media === null ? (
          <div className="flex justify-center py-20 text-olive">
            <Spinner />
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-10 py-20 text-center text-muted">
            <ImageIcon size={32} />
            <p className="text-sm">
              {media.length === 0
                ? "Gli invitati non hanno ancora caricato ricordi."
                : "Nessun ricordo per questo filtro."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-[3px]">
            {visible.map((m) => {
              const order = selected.indexOf(m.id);
              const on = order >= 0;
              return (
                <button
                  key={m.id}
                  onClick={() => toggle(m.id)}
                  aria-pressed={on}
                  aria-label={`${m.type === "video" ? "Video" : "Foto"} di ${m.uploaderName}`}
                  className="relative aspect-square"
                >
                  <MediaThumb media={m} className="size-full" />
                  {on ? (
                    <>
                      <span className="absolute inset-0 bg-olive/20 shadow-[inset_0_0_0_3px_#5E6B4E]" />
                      <span className="absolute top-1.5 right-1.5 flex size-[26px] items-center justify-center rounded-full bg-olive text-[13px] font-semibold text-white">
                        {order + 1}
                      </span>
                    </>
                  ) : (
                    <span className="absolute top-1.5 right-1.5 size-[22px] rounded-full border-2 border-white bg-ink/20" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </main>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-10 mx-auto flex w-full max-w-[480px] items-center gap-3.5 border-t border-line bg-white px-4 pt-3">
        <div className="flex flex-1 flex-col">
          <span className="text-[15px] font-semibold">{selected.length} selezionati</span>
          <span className="text-[13px] text-muted">
            {selected.length ? "Nell'ordine in cui li avete toccati" : "Scegliete almeno un ricordo"}
          </span>
        </div>
        {selected.length > 0 && (
          <button onClick={() => setSelected([])} className="h-11 px-2 text-sm font-medium text-muted">
            Azzera
          </button>
        )}
        <Button size="md" className="px-[22px]" disabled={!selected.length} loading={saving} onClick={next}>
          Avanti
          <ArrowRight size={18} />
        </Button>
      </div>
      {toast}
    </div>
  );
}
