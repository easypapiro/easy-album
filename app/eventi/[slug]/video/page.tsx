"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useOwnedEvent } from "@/components/account-context";
import { Check, ImageIcon, Music, Pause, Play, Plus, Sparkle } from "@/components/ui/icons";
import { BackHeader, Button, Chip, Screen, SectionLabel, Sheet, Spinner, useResetOnHide, useToast } from "@/components/ui/kit";
import { cx } from "@/components/ui/button-class";
import { RingDivider } from "@/components/ui/ornaments";
import { listAllMedia } from "@/lib/album";
import { errorMessage } from "@/lib/errors";
import { DEFAULT_DRAFT, getVideoDraft, saveVideoDraft, uploadTrack } from "@/lib/events";
import { eventTitle, duration as fmtDuration, shortDate, toneFor } from "@/lib/format";
import type { Media, Transition, VideoDraft } from "@/lib/types";

const TRACKS = [
  { id: "primo-ballo", title: "Primo ballo", mood: "Pianoforte · romantica", dot: "#EAD9D0" },
  { id: "giardino", title: "Giardino d'estate", mood: "Chitarra acustica · luminosa", dot: "#DDE1D3" },
  { id: "gran-finale", title: "Gran finale", mood: "Archi e percussioni · festosa", dot: "#EFE3D6" },
];

const TRANSITIONS: { id: Transition; label: string }[] = [
  { id: "fade", label: "Dissolvenza" },
  { id: "zoom", label: "Zoom lento" },
  { id: "slide", label: "Scorrimento" },
];

/** Seconds each photo stays on screen in the preview. */
const SCENE = 2.5;

const ANIMATION: Record<Transition, string> = {
  fade: "animate-[fade-in_.8s_ease-out]",
  zoom: "animate-[ken-burns_2.5s_ease-out_forwards]",
  slide: "animate-[slide-in_.6s_ease-out]",
};

export default function CreaVideo() {
  const { event } = useOwnedEvent();
  const router = useRouter();
  const [draft, setDraft] = useState<VideoDraft | null>(null);
  const [scenes, setScenes] = useState<Media[]>([]);
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const [uploadingTrack, setUploadingTrack] = useState(false);
  const [comingSoon, setComingSoon] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, showToast] = useToast();
  const trackInput = useRef<HTMLInputElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  useResetOnHide(() => {
    setPlaying(false);
    setComingSoon(false);
  });

  useEffect(() => {
    Promise.all([getVideoDraft(event.slug), listAllMedia(event.slug)])
      .then(([d, all]) => {
        const byId = new Map(all.map((m) => [m.id, m]));
        const picked = d.mediaIds.map((id) => byId.get(id)).filter((m): m is Media => Boolean(m));
        if (!picked.length) {
          router.replace(`/eventi/${event.slug}/seleziona`);
          return;
        }
        setScenes(picked);
        setDraft(d);
      })
      .catch((e) => {
        showToast(errorMessage(e));
        setDraft(DEFAULT_DRAFT);
      });
  }, [event.slug, router, showToast]);

  // Preview playback: advance one scene every SCENE seconds, loop at the end.
  useEffect(() => {
    if (!playing || scenes.length === 0) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % scenes.length), SCENE * 1000);
    return () => clearInterval(t);
  }, [playing, scenes.length]);

  const customSelected = draft?.track === "custom" && Boolean(draft.customTrackUrl);
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    if (playing && customSelected) a.play().catch(() => {});
    else a.pause();
  }, [playing, customSelected]);

  const total = useMemo(
    () => scenes.reduce((s, m) => s + (m.type === "video" ? Math.min(m.duration ?? SCENE, 8) : SCENE), 0),
    [scenes],
  );

  function update(p: Partial<VideoDraft>) {
    setDraft((d) => (d ? { ...d, ...p } : d));
    saveVideoDraft(event.slug, p).catch(() => {});
  }

  async function pickTrack(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 30 * 1024 * 1024) {
      showToast("Il brano deve pesare meno di 30 MB");
      return;
    }
    setUploadingTrack(true);
    try {
      const { url, path } = await uploadTrack(event.slug, file);
      update({
        track: "custom",
        customTrackUrl: url,
        customTrackPath: path,
        customTrackName: file.name.replace(/\.[^.]+$/, ""),
      });
    } catch (err) {
      showToast(errorMessage(err));
    } finally {
      setUploadingTrack(false);
    }
  }

  async function generate() {
    if (!draft) return;
    setSaving(true);
    try {
      await saveVideoDraft(event.slug, draft);
      setPlaying(false);
      setComingSoon(true);
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (!draft) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-olive">
        <Spinner />
      </div>
    );
  }

  const current = scenes[index] ?? scenes[0];
  const elapsed = scenes.slice(0, index).reduce((s, m) => s + (m.type === "video" ? Math.min(m.duration ?? SCENE, 8) : SCENE), 0);
  const tracks = [
    ...TRACKS,
    ...(draft.customTrackUrl
      ? [{ id: "custom", title: draft.customTrackName ?? "Il vostro brano", mood: "Brano caricato da voi", dot: "#E4DCCF" }]
      : []),
  ];

  return (
    <Screen className="safe-bottom gap-[18px] px-4 pt-3">
      <BackHeader href={`/eventi/${event.slug}/seleziona`} label="Torna alla selezione" title="Il vostro video" />

      <section className="flex flex-col gap-2.5">
        <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-[18px] bg-sand text-placeholder">
          {current && (
            <PreviewFrame key={`${current.id}-${index}-${draft.transition}`} media={current} animation={playing ? ANIMATION[draft.transition] : ""} />
          )}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-ink/60 px-4 py-3 text-cream">
            <span className="truncate font-serif text-[22px] italic">
              {eventTitle(event)}
              {event.date && ` · ${shortDate(event.date)}`}
            </span>
            <button
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pausa anteprima" : "Riproduci anteprima"}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-cream text-ink"
            >
              {playing ? <Pause size={18} /> : <Play size={18} />}
            </button>
          </div>
        </div>

        <div className="no-scrollbar flex gap-[3px] overflow-x-auto">
          {scenes.map((m, i) => (
            <button
              key={m.id}
              onClick={() => setIndex(i)}
              aria-label={`Scena ${i + 1}`}
              aria-current={i === index}
              className={cx(
                "relative h-11 min-w-[42px] flex-1 shrink-0 overflow-hidden rounded-md",
                i === index && "outline-2 outline-offset-1 outline-ink",
              )}
              style={{ background: toneFor(m.id) }}
            >
              {(m.thumbUrl || m.type === "photo") && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.thumbUrl ?? m.url} alt="" loading="lazy" className="size-full object-cover" />
              )}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted">
          <span>
            {fmtDuration(elapsed)} / {fmtDuration(total)}
          </span>
          <span>
            {scenes.length} {scenes.length === 1 ? "scena" : "scene"}
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <SectionLabel>Musica</SectionLabel>
        {tracks.map((t) => {
          const on = draft.track === t.id;
          return (
            <button
              key={t.id}
              onClick={() => update({ track: t.id })}
              aria-pressed={on}
              className={cx(
                "flex items-center gap-3 rounded-[14px] bg-white px-3 py-2.5 text-left",
                on ? "border-2 border-olive" : "border border-line",
              )}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full text-ink" style={{ background: t.dot }}>
                <Music size={16} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-medium">{t.title}</span>
                <span className="text-xs text-muted">{t.mood}</span>
              </span>
              {on && <Check size={20} className="text-olive" />}
            </button>
          );
        })}
        <input ref={trackInput} type="file" accept="audio/mpeg,audio/mp3,audio/*" className="hidden" onChange={pickTrack} />
        <button
          onClick={() => trackInput.current?.click()}
          disabled={uploadingTrack}
          className="flex h-11 items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-dash text-sm font-medium text-olive-dark"
        >
          {uploadingTrack ? <Spinner className="size-4" /> : <Plus size={16} />}
          {draft.customTrackUrl ? "Sostituite il vostro brano (MP3)" : "Caricate il vostro brano (MP3)"}
        </button>
        {draft.customTrackUrl && <audio ref={audio} src={draft.customTrackUrl} loop preload="none" />}
      </section>

      <section className="flex flex-col gap-2">
        <SectionLabel>Transizione</SectionLabel>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {TRANSITIONS.map((t) => (
            <Chip key={t.id} active={draft.transition === t.id} onClick={() => update({ transition: t.id })}>
              {t.label}
            </Chip>
          ))}
        </div>
      </section>

      <Button size="xl" block className="mt-auto" loading={saving} onClick={generate}>
        <Sparkle size={20} />
        Genera video
      </Button>

      <Sheet open={comingSoon} onClose={() => setComingSoon(false)}>
        <div className="flex flex-col items-center gap-3 px-2 pt-2 pb-4 text-center">
          <RingDivider />
          <h2 className="font-serif text-[28px] font-semibold">Ci siamo quasi</h2>
          <p className="text-[15px] leading-normal text-ink-2">
            Abbiamo salvato le vostre scelte: {scenes.length} {scenes.length === 1 ? "scena" : "scene"}, musica e
            transizione. La generazione del video sarà disponibile a breve.
          </p>
          <Button block className="mt-2" onClick={() => setComingSoon(false)}>
            Va bene
          </Button>
        </div>
      </Sheet>
      {toast}
    </Screen>
  );
}

function PreviewFrame({ media, animation }: { media: Media; animation: string }) {
  const src = media.type === "photo" ? media.url : media.thumbUrl;
  if (!src) return <ImageIcon size={56} strokeWidth={1} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={cx("absolute inset-0 size-full object-cover", animation)}
      style={media.thumbUrl ? { backgroundImage: `url(${media.thumbUrl})`, backgroundSize: "cover" } : undefined}
    />
  );
}
