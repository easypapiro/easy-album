"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useAccount } from "@/components/account-context";
import { ArrowRight, ChevronLeft, Close } from "@/components/ui/icons";
import { Button, ErrorText, Field, Screen, useResetOnHide } from "@/components/ui/kit";
import { LeafLine } from "@/components/ui/ornaments";
import { errorMessage } from "@/lib/errors";
import { createEvent, setCover } from "@/lib/events";
import { resizeImage } from "@/lib/media";

export default function CreaEvento() {
  const { user } = useAccount();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [cover, setCoverFile] = useState<{ blob: Blob; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useResetOnHide(() => {
    setBusy(false);
    setError("");
  });

  async function pickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const blob = (await resizeImage(file, 2000)) ?? file;
    if (cover) URL.revokeObjectURL(cover.url);
    setCoverFile({ blob, url: URL.createObjectURL(blob) });
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true);
    setError("");
    try {
      const event = await createEvent(user.uid, {
        name1: String(f.get("name1")),
        name2: String(f.get("name2")),
        date: String(f.get("date")),
        location: String(f.get("location") ?? ""),
      });
      if (cover) await setCover(event, cover.blob).catch(() => null);
      // This page stays mounted after leaving: start empty next time.
      form.reset();
      setCoverFile(null);
      setBusy(false);
      router.replace(`/eventi/${event.slug}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Screen className="safe-bottom gap-[18px] px-4 pt-3">
      <header className="flex items-center gap-1.5">
        <Link
          href="/eventi"
          aria-label="Torna ai tuoi eventi"
          className="-ml-2.5 flex size-11 items-center justify-center rounded-full text-ink hover:bg-white"
        >
          <ChevronLeft size={22} />
        </Link>
        <h1 className="font-serif text-[28px] font-semibold">Nuovo evento</h1>
      </header>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickCover} />
      {cover ? (
        <div className="relative h-[150px] overflow-hidden rounded-[20px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover.url} alt="Anteprima della copertina" className="size-full object-cover" />
          <button
            type="button"
            aria-label="Rimuovi copertina"
            onClick={() => setCoverFile(null)}
            className="absolute top-2 right-2 flex size-9 items-center justify-center rounded-full bg-ink/70 text-white"
          >
            <Close size={14} />
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-2 left-2 h-9 rounded-full bg-cream/90 px-3.5 text-sm font-medium text-ink"
          >
            Cambia foto
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-[150px] flex-col items-center justify-center gap-2 rounded-[20px] border-[1.5px] border-dashed border-dash bg-white text-olive-dark"
        >
          <LeafLine />
          <span className="text-[15px] font-medium">Aggiungi una foto di copertina</span>
          <span className="text-xs text-muted">Facoltativa · comparirà in cima all&apos;album</span>
        </button>
      )}

      <form onSubmit={submit} className="flex flex-1 flex-col gap-3.5">
        <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
          <legend className="mb-1.5 p-0 text-[13px] font-medium text-ink-2">Nomi degli sposi</legend>
          <div className="flex flex-col gap-0.5">
            <input name="name1" aria-label="Primo nome" placeholder="Giulia" className="field" required maxLength={30} />
            <span className="self-center font-serif text-2xl leading-[1.1] text-gold italic">&amp;</span>
            <input name="name2" aria-label="Secondo nome" placeholder="Marco" className="field" required maxLength={30} />
          </div>
        </fieldset>
        <Field label="Data del matrimonio" name="date" type="date" required />
        <Field label="Luogo" hint="(facoltativo)" name="location" placeholder="Es. Villa, città" />
        <ErrorText>{error}</ErrorText>
        <Button type="submit" block loading={busy} className="mt-auto">
          Crea l&apos;album
          <ArrowRight size={18} />
        </Button>
      </form>
    </Screen>
  );
}
