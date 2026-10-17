"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useGuest } from "@/components/guest-shell";
import { ArrowRight, QrIcon } from "@/components/ui/icons";
import { Button, ErrorText, Screen, useResetOnHide } from "@/components/ui/kit";
import { Branch, RingDivider } from "@/components/ui/ornaments";
import { joinAlbum } from "@/lib/album";
import { errorMessage } from "@/lib/errors";
import { longDate } from "@/lib/format";
import { MAX_UPLOADS } from "@/lib/types";

export default function Benvenuto() {
  const { event, guest, user } = useGuest();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useResetOnHide(() => {
    setBusy(false);
    setError("");
  });

  async function enter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name")).trim().replace(/\s+/g, " ");
    if (name.length < 2) {
      setError("Scrivi il tuo nome, così gli sposi sapranno chi ha condiviso i ricordi.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await joinAlbum(event.slug, name);
      router.push(`/${event.slug}/feed`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Screen className="items-center overflow-hidden px-7 pt-[72px] pb-7">
      <Branch className="pointer-events-none absolute -top-1.5 -right-[18px]" />
      <Branch className="pointer-events-none absolute -bottom-1.5 -left-[18px] rotate-180" />

      <p className="text-xs tracking-[0.24em] text-muted uppercase">Benvenuti al matrimonio di</p>
      <div className="mt-[18px] flex flex-col items-center text-center font-serif leading-[0.95]">
        <h1 className="text-[60px] font-medium break-words">{event.name1}</h1>
        <span className="text-[40px] text-gold italic">&amp;</span>
        <h1 className="text-[60px] font-medium break-words">{event.name2}</h1>
      </div>
      <RingDivider className="mt-5" />
      {event.date && (
        <p className="mt-3.5 font-serif text-[22px] text-ink-2 italic">{longDate(event.date)}</p>
      )}

      <form
        onSubmit={enter}
        className="relative mt-10 flex w-full flex-col gap-3.5 rounded-[20px] border border-line bg-white px-5 py-6"
      >
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-[26px] font-semibold">Condividi i tuoi ricordi</h2>
          <p className="text-sm leading-normal text-muted">
            Carica fino a {MAX_UPLOADS} foto e video e guarda quelli degli altri invitati, in tempo reale.
          </p>
        </div>
        <label htmlFor="nome" className="text-[13px] font-medium text-ink-2">
          Come ti chiami?
        </label>
        <input
          id="nome"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Nome e cognome"
          defaultValue={guest?.name ?? (user && !user.isAnonymous ? user.displayName ?? "" : "")}
          maxLength={60}
          className="field bg-cream"
        />
        <ErrorText>{error}</ErrorText>
        <Button type="submit" block loading={busy}>
          {guest ? "Torna all'album" : "Entra nell'album"}
          <ArrowRight size={18} />
        </Button>
      </form>

      <div className="relative mt-auto flex items-center gap-2 pt-8 text-[13px] text-muted">
        <QrIcon size={16} />
        Nessuna app e nessuna registrazione
      </div>
    </Screen>
  );
}
