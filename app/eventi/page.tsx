"use client";

import { signOut } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccount } from "@/components/account-context";
import { ChevronRight, LogOut, Plus } from "@/components/ui/icons";
import { buttonClass, Screen, Sheet, SheetAction, Spinner, useResetOnHide, useToast } from "@/components/ui/kit";
import { Branch, Rings } from "@/components/ui/ornaments";
import { errorMessage } from "@/lib/errors";
import { getEventsByOwner } from "@/lib/events";
import { auth } from "@/lib/firebase";
import { eventTitle, firstName, longDate, toneFor } from "@/lib/format";
import type { AlbumEvent } from "@/lib/types";

export default function IVostriEventi() {
  const { user } = useAccount();
  const router = useRouter();
  const [events, setEvents] = useState<AlbumEvent[] | null>(null);
  const [menu, setMenu] = useState(false);
  const [toast, showToast] = useToast();
  useResetOnHide(() => setMenu(false));

  // Re-runs each time the page is shown again, so a newly created event appears.
  useEffect(() => {
    getEventsByOwner(user.uid)
      .then(setEvents)
      .catch((e) => {
        setEvents([]);
        showToast(errorMessage(e));
      });
  }, [user.uid, showToast]);

  const today = new Date().toISOString().slice(0, 10);
  const name = user.displayName ? firstName(user.displayName) : "";

  return (
    <Screen className="overflow-hidden px-4 pt-[18px] pb-32">
      <Branch size={140} className="pointer-events-none absolute -top-1.5 -right-[18px]" />

      <header className="relative flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs tracking-[0.2em] text-muted uppercase">
            {name ? `Ciao ${name}` : "Il tuo account"}
          </span>
          <h1 className="font-serif text-[34px] leading-[1.05] font-semibold">I tuoi eventi</h1>
        </div>
        <button
          onClick={() => setMenu(true)}
          aria-label="Menu account"
          className="flex h-11 shrink-0 items-center rounded-full bg-sage-soft px-3.5 text-xs font-semibold text-olive-dark"
        >
          Account
        </button>
      </header>

      <main className="relative mt-6 flex flex-col gap-3">
        {events === null ? (
          <div className="flex justify-center py-20 text-olive">
            <Spinner />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[22px] border border-line bg-white px-6 py-12 text-center">
            <Rings width={48} />
            <h2 className="font-serif text-[26px] font-semibold">Ancora nessun evento</h2>
            <p className="text-sm leading-normal text-muted">
              Crea il tuo primo evento: in pochi minuti avrai il QR da mettere sui tavoli.
            </p>
          </div>
        ) : (
          events.map((e) => {
            const past = e.date < today;
            return (
              <Link
                key={e.slug}
                href={`/eventi/${e.slug}`}
                className="flex items-center gap-3.5 rounded-[22px] border border-line bg-white p-3 pr-4 text-ink no-underline transition-colors hover:border-line-strong"
              >
                <span
                  className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl"
                  style={{ background: toneFor(e.slug) }}
                >
                  {e.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.coverUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <Rings width={34} />
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-serif text-[22px] leading-tight font-semibold">{eventTitle(e)}</span>
                  <span className="truncate text-[13px] text-muted">
                    {longDate(e.date)}
                    {e.location && ` · ${e.location}`}
                  </span>
                  {past && (
                    <span className="mt-1 self-start rounded-full bg-line-soft px-2 py-0.5 text-[11px] font-medium text-muted">
                      Concluso
                    </span>
                  )}
                </span>
                <ChevronRight size={20} className="shrink-0 text-muted" />
              </Link>
            );
          })
        )}
      </main>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-10 mx-auto w-full max-w-[480px] border-t border-line bg-white px-4 pt-3">
        <Link href="/eventi/nuovo" className={buttonClass({ block: true })}>
          <Plus size={18} />
          Crea un nuovo evento
        </Link>
      </div>

      <Sheet open={menu} onClose={() => setMenu(false)} title={user.displayName || "Account"}>
        <p className="mb-2 px-1 text-sm text-muted">{user.email}</p>
        <SheetAction
          icon={<LogOut size={20} />}
          danger
          onClick={() => signOut(auth()).then(() => router.replace("/"))}
        >
          Esci
        </SheetAction>
      </Sheet>
      {toast}
    </Screen>
  );
}
