"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useJoinedGuest } from "@/components/guest-shell";
import { MediaThumb } from "@/components/media-thumb";
import { MediaViewer } from "@/components/media-viewer";
import { ChevronLeft, Dots, Download, Grid, Heart, ImageIcon, List, Play, Plus, Trash } from "@/components/ui/icons";
import { Sheet, SheetAction, Spinner, useResetOnHide, useToast } from "@/components/ui/kit";
import { buttonClass } from "@/components/ui/button-class";
import { Rings } from "@/components/ui/ornaments";
import { deleteMedia, downloadMedia, toggleLike, watchFeed } from "@/lib/album";
import { errorMessage } from "@/lib/errors";
import { getEventStats } from "@/lib/events";
import {
  eventTitle,
  duration as fmtDuration,
  firstName,
  initials,
  plural,
  timeAgo,
  toneFor,
} from "@/lib/format";
import { MAX_UPLOADS, type Media } from "@/lib/types";

const PAGE = 20;

export default function Feed() {
  const { event, user, guest, isOwner } = useJoinedGuest();
  const [items, setItems] = useState<Media[] | null>(null);
  const [max, setMax] = useState(PAGE);
  const [view, setView] = useState<"list" | "grid">("list");
  const [total, setTotal] = useState<number | null>(null);
  const [menuFor, setMenuFor] = useState<Media | null>(null);
  const [viewing, setViewing] = useState<Media | null>(null);
  const [toast, showToast] = useToast();
  const sentinel = useRef<HTMLDivElement>(null);
  useResetOnHide(() => {
    setMenuFor(null);
    setViewing(null);
  });

  useEffect(
    () => watchFeed(event.slug, max, setItems, (e) => showToast(errorMessage(e))),
    [event.slug, max, showToast],
  );

  // Header count refreshes whenever a new memory lands at the top.
  const newest = items?.[0]?.id;
  useEffect(() => {
    getEventStats(event.slug)
      .then((s) => setTotal(s.photos + s.videos))
      .catch(() => {});
  }, [event.slug, newest]);

  const hasMore = items !== null && items.length >= max;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && setMax((m) => m + PAGE),
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, view]);

  const like = useCallback(
    (m: Media) => toggleLike(event.slug, m, user.uid).catch((e) => showToast(errorMessage(e))),
    [event.slug, user.uid, showToast],
  );

  async function remove(m: Media) {
    setMenuFor(null);
    if (!window.confirm("Eliminare questo ricordo? L'operazione non si può annullare.")) return;
    try {
      await deleteMedia(event.slug, m, event.ownerId);
      showToast("Ricordo eliminato");
    } catch (e) {
      showToast(errorMessage(e));
    }
  }

  const used = guest.uploadCount;
  const full = !isOwner && used >= MAX_UPLOADS;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-cream">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-line bg-cream/95 px-4 pt-[max(18px,env(safe-area-inset-top))] pb-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-1">
          {isOwner && (
            <Link
              href={`/eventi/${event.slug}`}
              aria-label="Torna alla gestione dell'evento"
              className="-ml-2.5 flex size-11 shrink-0 items-center justify-center rounded-full text-ink"
            >
              <ChevronLeft size={22} />
            </Link>
          )}
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <Rings className="shrink-0" />
              <h1 className="truncate font-serif text-[28px] leading-none font-semibold">{eventTitle(event)}</h1>
            </div>
            <p className="truncate text-xs tracking-[0.04em] text-muted">
              Album condiviso
              {total !== null && ` · ${total} ${plural(total, "ricordo", "ricordi")}`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setView((v) => (v === "list" ? "grid" : "list"))}
          aria-label={view === "list" ? "Vista griglia" : "Vista elenco"}
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink"
        >
          {view === "list" ? <Grid size={20} /> : <List size={20} />}
        </button>
      </header>

      <main className="flex-1 pb-32">
        {event.coverUrl && view === "list" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.coverUrl} alt="" className="h-48 w-full object-cover" />
        )}

        {items === null ? (
          <div className="flex justify-center py-20 text-olive">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <EmptyFeed slug={event.slug} />
        ) : view === "grid" ? (
          <div className="grid grid-cols-3 gap-[3px]">
            {items.map((m) => (
              <button key={m.id} onClick={() => setViewing(m)} aria-label={`Apri ricordo di ${m.uploaderName}`} className="aspect-square">
                <MediaThumb media={m} className="size-full" />
              </button>
            ))}
          </div>
        ) : (
          items.map((m) => (
            <Post
              key={m.id}
              media={m}
              liked={m.likedBy.includes(user.uid)}
              onLike={() => like(m)}
              onMenu={() => setMenuFor(m)}
              onOpen={() => setViewing(m)}
              onDownload={() => downloadMedia(m)}
            />
          ))
        )}
        {hasMore && (
          <div ref={sentinel} className="flex justify-center py-8 text-olive">
            <Spinner />
          </div>
        )}
      </main>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-[480px] items-center gap-3.5 border-t border-line bg-white px-4 pt-3">
        {isOwner ? (
          <span className="flex-1 text-[13px] leading-snug text-ink-2">
            Aggiungete anche voi foto e video, senza limiti
          </span>
        ) : (
          <div className="flex flex-1 flex-col gap-1.5">
            <span className="text-[13px] text-ink-2">
              Hai caricato{" "}
              <strong className="font-semibold text-ink">
                {used} di {MAX_UPLOADS}
              </strong>{" "}
              ricordi
            </span>
            <div className="h-1.5 overflow-hidden rounded-full bg-line-soft">
              <div className="h-1.5 bg-olive transition-[width]" style={{ width: `${(used / MAX_UPLOADS) * 100}%` }} />
            </div>
          </div>
        )}
        {full ? (
          <span className="flex h-12 items-center rounded-full bg-sage-soft px-5 text-[15px] font-medium text-olive-dark">
            Completo
          </span>
        ) : (
          <Link href={`/${event.slug}/carica`} className={buttonClass({ size: "md", className: "px-5" })}>
            <Plus size={18} />
            Carica
          </Link>
        )}
      </div>

      <Sheet open={menuFor !== null} onClose={() => setMenuFor(null)}>
        {menuFor && (
          <>
            <SheetAction
              icon={<Download size={20} />}
              onClick={() => {
                const m = menuFor;
                setMenuFor(null);
                downloadMedia(m);
              }}
            >
              Scarica
            </SheetAction>
            {(menuFor.uploaderId === user.uid || isOwner) && (
              <SheetAction icon={<Trash size={20} />} danger onClick={() => remove(menuFor)}>
                Elimina
              </SheetAction>
            )}
          </>
        )}
      </Sheet>
      <MediaViewer media={viewing} onClose={() => setViewing(null)} />
      {toast}
    </div>
  );
}

function Post({
  media: m,
  liked,
  onLike,
  onMenu,
  onOpen,
  onDownload,
}: {
  media: Media;
  liked: boolean;
  onLike: () => void;
  onMenu: () => void;
  onOpen: () => void;
  onDownload: () => void;
}) {
  const ratio = m.width && m.height ? Math.min(Math.max(m.width / m.height, 0.8), 1.6) : 1;
  return (
    <article className="flex flex-col border-b border-line-soft pb-2.5">
      <div className="flex items-center gap-2.5 py-3 pr-2 pl-4">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-ink"
          style={{ background: toneFor(m.uploaderId) }}
        >
          {initials(m.uploaderName)}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{m.uploaderName}</span>
          <span className="text-xs text-muted">{timeAgo(m.createdAt)}</span>
        </div>
        <button onClick={onMenu} aria-label="Altre azioni" className="flex size-11 items-center justify-center text-muted">
          <Dots />
        </button>
      </div>

      <button
        onClick={onOpen}
        aria-label={m.type === "video" ? "Guarda il video" : "Apri la foto"}
        className="relative flex w-full items-center justify-center overflow-hidden text-placeholder"
        style={{ aspectRatio: ratio, background: toneFor(m.id) }}
      >
        {m.thumbUrl || m.type === "photo" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={m.thumbUrl ?? m.url}
            alt={m.caption || `Ricordo di ${m.uploaderName}`}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <ImageIcon size={56} strokeWidth={1} />
        )}
        {m.type === "video" && (
          <>
            <span className="absolute flex size-16 items-center justify-center rounded-full bg-ink/55 text-white">
              <Play size={26} />
            </span>
            {m.duration != null && (
              <span className="absolute top-3 right-3 rounded-xl bg-ink/70 px-2.5 py-1 text-xs text-white">
                {fmtDuration(m.duration)}
              </span>
            )}
          </>
        )}
      </button>

      <div className="flex items-center gap-1 px-2 pt-1.5">
        <button
          onClick={onLike}
          aria-label={liked ? "Non mi piace più" : "Mi piace"}
          aria-pressed={liked}
          className="flex size-11 items-center justify-center text-heart transition-transform active:scale-90"
        >
          <Heart filled={liked} />
        </button>
        <span className="text-sm font-medium">{m.likesCount}</span>
        <button onClick={onDownload} aria-label="Scarica" className="ml-auto flex size-11 items-center justify-center text-ink">
          <Download size={22} />
        </button>
      </div>
      {m.caption && (
        <p className="px-4 text-sm leading-snug">
          <strong className="font-semibold">{firstName(m.uploaderName)}</strong> {m.caption}
        </p>
      )}
    </article>
  );
}

function EmptyFeed({ slug }: { slug: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-10 py-20 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-sage-soft text-olive">
        <ImageIcon size={28} />
      </span>
      <h2 className="font-serif text-[26px] font-semibold">Ancora nessun ricordo</h2>
      <p className="text-sm leading-normal text-muted">Sii il primo a condividere una foto o un video della giornata.</p>
      <Link href={`/${slug}/carica`} className={buttonClass({ size: "md", className: "mt-2" })}>
        <Plus size={18} />
        Carica
      </Link>
    </div>
  );
}
