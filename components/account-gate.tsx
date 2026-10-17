"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isRegistered, useAuth } from "./auth-provider";
import { AccountContext, OwnedEventContext, useAccount } from "./account-context";
import { buttonClass, FullScreenLoader, Screen } from "./ui/kit";
import { Rings } from "./ui/ornaments";
import { getEvent } from "@/lib/events";
import type { AlbumEvent } from "@/lib/types";

/** Client-side guard for /eventi: requires a registered (email) account. */
export function AccountGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const signedIn = isRegistered(user);

  useEffect(() => {
    if (!loading && !signedIn) router.replace("/accedi");
  }, [loading, signedIn, router]);

  if (!isRegistered(user)) return <FullScreenLoader />;
  return <AccountContext.Provider value={{ user }}>{children}</AccountContext.Provider>;
}

/** Loads /eventi/[slug] and checks that the event belongs to this account. */
export function OwnedEventGate({ children }: { children: React.ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAccount();
  const [loaded, setLoaded] = useState<{ slug: string; event: AlbumEvent | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getEvent(slug)
      .then((e) => !cancelled && setLoaded({ slug, event: e && e.ownerId === user.uid ? e : null }))
      .catch(() => !cancelled && setLoaded({ slug, event: null }));
    return () => {
      cancelled = true;
    };
  }, [slug, user.uid]);

  if (loaded?.slug !== slug) return <FullScreenLoader />;
  if (!loaded.event) return <EventNotFound />;

  return (
    <OwnedEventContext.Provider value={{ user, event: loaded.event }}>{children}</OwnedEventContext.Provider>
  );
}

function EventNotFound() {
  return (
    <Screen className="items-center justify-center gap-4 px-8 text-center">
      <Rings width={48} />
      <h1 className="font-serif text-4xl font-semibold">Evento non trovato</h1>
      <p className="text-[15px] leading-normal text-muted">
        Questo evento non esiste o appartiene a un altro account.
      </p>
      <Link href="/eventi" className={buttonClass({ variant: "outline", size: "md", className: "mt-2" })}>
        I tuoi eventi
      </Link>
    </Screen>
  );
}
