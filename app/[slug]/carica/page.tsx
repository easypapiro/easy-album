"use client";

import { deleteObject, ref, type UploadTask } from "firebase/storage";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useJoinedGuest } from "@/components/guest-shell";
import { Camera, Check, Close, ImageIcon, Play } from "@/components/ui/icons";
import { BackHeader, Button, Screen, SectionLabel, useToast } from "@/components/ui/kit";
import { LeafLine } from "@/components/ui/ornaments";
import { publishMedia, type UploadedItem } from "@/lib/album";
import { errorMessage } from "@/lib/errors";
import { storage } from "@/lib/firebase";
import { duration as fmtDuration, plural } from "@/lib/format";
import { isSupported, MAX_FILE_BYTES, prepareMedia, type Prepared } from "@/lib/media";
import { MAX_UPLOADS } from "@/lib/types";
import { startUpload } from "@/lib/upload";

type Item = {
  key: string;
  prepared: Prepared | null;
  progress: number;
  status: "preparing" | "uploading" | "done" | "error";
  error?: string;
  task?: UploadTask;
  result?: UploadedItem;
};

export default function Carica() {
  const { event, user, guest, isOwner } = useJoinedGuest();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [caption, setCaption] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [toast, showToast] = useToast();
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const published = guest.uploadCount;
  const active = items.filter((i) => i.status !== "error");
  const pending = active.filter((i) => i.status !== "done").length;
  const ready = active.filter((i) => i.status === "done");
  // The organizer has no upload limit.
  const remaining = isOwner ? Infinity : Math.max(0, MAX_UPLOADS - published - active.length);

  const patch = (key: string, p: Partial<Item>) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...p } : i)));

  // Warn before leaving with files that were uploaded but not published.
  useEffect(() => {
    if (!items.length || publishing) return;
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [items.length, publishing]);

  async function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const files = Array.from(list).filter(isSupported);
    if (files.length > remaining) {
      showToast(
        remaining === 0
          ? "Hai raggiunto il limite di ricordi"
          : `Puoi aggiungere ancora ${remaining} ${plural(remaining, "ricordo", "ricordi")}`,
      );
    }
    for (const file of files.slice(0, remaining)) {
      const key = `${file.name}-${file.size}-${Math.random()}`;
      if (file.size > MAX_FILE_BYTES) {
        setItems((l) => [...l, { key, prepared: null, progress: 0, status: "error", error: "File troppo grande" }]);
        continue;
      }
      setItems((l) => [...l, { key, prepared: null, progress: 0, status: "preparing" }]);
      const prepared = await prepareMedia(file);
      // The guest may have removed it while we were reading the file.
      if (!itemsRef.current.some((i) => i.key === key)) {
        URL.revokeObjectURL(prepared.preview);
        continue;
      }
      const { task, done } = startUpload(event.slug, user.uid, file, prepared, (p) => patch(key, { progress: p }));
      patch(key, { prepared, task, status: "uploading" });
      done
        .then((result) => patch(key, { result, status: "done", progress: 1 }))
        .catch((e) => {
          if ((e as { code?: string }).code === "storage/canceled") return;
          patch(key, { status: "error", error: errorMessage(e) });
        });
    }
  }

  function remove(item: Item) {
    setItems((l) => l.filter((i) => i.key !== item.key));
    if (item.prepared) URL.revokeObjectURL(item.prepared.preview);
    if (item.status === "uploading") item.task?.cancel();
    if (item.result) {
      for (const p of [item.result.path, item.result.thumbPath]) {
        if (p) deleteObject(ref(storage(), p)).catch(() => {});
      }
    }
  }

  async function publish() {
    setPublishing(true);
    try {
      await publishMedia(
        event.slug,
        user.uid,
        guest.name,
        caption,
        ready.map((i) => i.result!),
        isOwner,
      );
      // The page stays mounted after navigating away: start fresh next time.
      items.forEach((i) => i.prepared && URL.revokeObjectURL(i.prepared.preview));
      setItems([]);
      setCaption("");
      setPublishing(false);
      router.push(`/${event.slug}/feed`);
    } catch (e) {
      showToast(errorMessage(e));
      setPublishing(false);
    }
  }

  const verb = isOwner ? "Pubblicate" : "Pubblica";
  const publishLabel =
    pending > 0
      ? `Caricamento di ${pending} ${plural(pending, "ricordo", "ricordi")}…`
      : ready.length
        ? `${verb} ${ready.length} ${plural(ready.length, "ricordo", "ricordi")}`
        : verb;

  return (
    <Screen className="safe-bottom gap-[18px] px-4 pt-3">
      <BackHeader
        href={`/${event.slug}/feed`}
        label="Torna al feed"
        title={isOwner ? "Caricate i vostri ricordi" : "Carica i tuoi ricordi"}
      />

      {!isOwner && (
      <section className="flex items-center gap-[18px] rounded-[20px] border border-line bg-white px-[18px] py-4">
        <QuotaRing published={published} pending={active.length} remaining={remaining} />
        <div className="flex flex-col gap-1.5 text-[13px] text-ink-2">
          <span className="text-[15px] font-medium text-ink">Puoi caricare {MAX_UPLOADS} ricordi</span>
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-olive" />
            {published} già {plural(published, "pubblicato", "pubblicati")}
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-gold-soft" />
            {active.length} {pending > 0 ? "in caricamento" : "da pubblicare"}
          </span>
        </div>
      </section>
      )}

      <section className="flex flex-col items-center gap-3.5 rounded-[20px] border-[1.5px] border-dashed border-dash bg-white px-4 py-5">
        <LeafLine />
        <p className="text-center text-sm text-ink-2">
          {isOwner
            ? "Scegliete foto e video dalla galleria o scattate ora"
            : remaining > 0
              ? "Scegli foto e video dalla galleria o scatta ora"
              : "Hai raggiunto il limite di ricordi"}
        </p>
        <input
          ref={galleryRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="flex w-full gap-2.5">
          <Button
            variant="outline"
            size="md"
            className="flex-1 px-3"
            disabled={remaining === 0 || publishing}
            onClick={() => galleryRef.current?.click()}
          >
            <ImageIcon size={18} />
            Galleria
          </Button>
          <Button
            variant="outline"
            size="md"
            className="flex-1 px-3"
            disabled={remaining === 0 || publishing}
            onClick={() => cameraRef.current?.click()}
          >
            <Camera size={18} />
            Fotocamera
          </Button>
        </div>
      </section>

      {items.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <SectionLabel>Selezionati · {active.length}</SectionLabel>
          <div className="grid grid-cols-4 gap-2">
            {items.map((it) => (
              <Thumb key={it.key} item={it} onRemove={() => remove(it)} disabled={publishing} />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-1.5">
        <label htmlFor="dedica" className="text-[13px] font-medium text-ink-2">
          {isOwner ? "Una didascalia" : "Un pensiero per gli sposi"}{" "}
          <span className="font-normal text-muted">(facoltativ{isOwner ? "a" : "o"})</span>
        </label>
        <textarea
          id="dedica"
          rows={2}
          maxLength={280}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder={isOwner ? "Scrivete una didascalia…" : "Scrivi una dedica…"}
          className="field h-auto resize-none py-3 text-[16px]"
        />
      </section>

      <Button
        block
        className="mt-auto"
        disabled={pending > 0 || ready.length === 0}
        loading={publishing}
        onClick={publish}
      >
        {publishLabel}
      </Button>
      {toast}
    </Screen>
  );
}

function Thumb({ item, onRemove, disabled }: { item: Item; onRemove: () => void; disabled: boolean }) {
  const p = item.prepared;
  return (
    <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-sand text-placeholder">
      {p?.type === "photo" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.preview} alt="" className="absolute inset-0 size-full object-cover" />
      )}
      {p?.type === "video" && (
        <video src={p.preview} muted playsInline preload="metadata" className="absolute inset-0 size-full object-cover" />
      )}
      {!p && item.status !== "error" && <ImageIcon size={26} strokeWidth={1.2} />}

      {p?.type === "video" && p.duration != null && (
        <span className="absolute top-1.5 left-1.5 flex items-center gap-0.5 rounded-lg bg-ink/70 px-1.5 text-[10px] text-white">
          <Play size={8} />
          {fmtDuration(p.duration)}
        </span>
      )}
      {item.status === "done" && (
        <span className="absolute right-1.5 bottom-1.5 flex size-[22px] items-center justify-center rounded-full bg-olive text-white">
          <Check size={12} strokeWidth={3} />
        </span>
      )}
      {(item.status === "uploading" || item.status === "preparing") && (
        <div className="absolute inset-x-1.5 bottom-1.5 h-[5px] overflow-hidden rounded-full bg-white/80">
          <div className="h-[5px] bg-olive transition-[width]" style={{ width: `${Math.max(4, item.progress * 100)}%` }} />
        </div>
      )}
      {item.status === "error" && (
        <span className="absolute inset-0 flex items-center justify-center bg-heart/80 p-1 text-center text-[10px] leading-tight text-white">
          {item.error}
        </span>
      )}
      <button
        onClick={onRemove}
        disabled={disabled}
        aria-label="Rimuovi"
        className="absolute top-0.5 right-0.5 flex size-7 items-center justify-center p-0"
      >
        <span className="flex size-5 items-center justify-center rounded-full bg-ink/70 text-white">
          <Close size={10} strokeWidth={3} />
        </span>
      </button>
    </div>
  );
}

function QuotaRing({ published, pending, remaining }: { published: number; pending: number; remaining: number }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const pubLen = (Math.min(published, MAX_UPLOADS) / MAX_UPLOADS) * c;
  const pendLen = (Math.min(pending, MAX_UPLOADS - published) / MAX_UPLOADS) * c;
  return (
    <div className="relative size-[84px] shrink-0">
      <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true" className="-rotate-90">
        <circle cx="42" cy="42" r={r} fill="none" stroke="#EFE8DE" strokeWidth="7" />
        <circle
          cx="42" cy="42" r={r} fill="none" stroke="#C9A46A" strokeWidth="7"
          strokeDasharray={`${pendLen} ${c}`} strokeDashoffset={-pubLen}
          className="transition-[stroke-dasharray,stroke-dashoffset] duration-300"
        />
        <circle
          cx="42" cy="42" r={r} fill="none" stroke="#5E6B4E" strokeWidth="7"
          strokeDasharray={`${pubLen} ${c}`}
          className="transition-[stroke-dasharray] duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-serif text-[30px] font-semibold">{remaining}</span>
        <span className="text-[11px] text-muted">{plural(remaining, "rimasto", "rimasti")}</span>
      </div>
    </div>
  );
}
