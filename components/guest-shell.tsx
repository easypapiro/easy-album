"use client";

import type { User } from "firebase/auth";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./auth-provider";
import { buttonClass, FullScreenLoader, Screen } from "./ui/kit";
import { Rings } from "./ui/ornaments";
import { watchGuest } from "@/lib/album";
import { getEvent } from "@/lib/events";
import type { AlbumEvent, Guest } from "@/lib/types";

type GuestState = {
  event: AlbumEvent;
  user: User | null;
  /** null until the visitor has entered their name */
  guest: Guest | null;
  /** The event's organizer: in the album automatically, not counted as a guest. */
  isOwner: boolean;
};

const GuestContext = createContext<GuestState | null>(null);

export function useGuest(): GuestState {
  const ctx = useContext(GuestContext);
  if (!ctx) throw new Error("useGuest must be used inside an album route");
  return ctx;
}

/** Same as useGuest, for pages only reachable after joining. */
export function useJoinedGuest(): GuestState & { user: User; guest: Guest } {
  return useGuest() as GuestState & { user: User; guest: Guest };
}

export function GuestShell({ children }: { children: React.ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [event, setEvent] = useState<AlbumEvent | null | undefined>(undefined);
  const [guest, setGuest] = useState<{ uid: string; data: Guest | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getEvent(slug)
      .then((e) => !cancelled && setEvent(e))
      .catch(() => !cancelled && setEvent(null));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const uid = user?.uid ?? null;
  const isOwner = Boolean(uid && event && uid === event.ownerId);

  useEffect(() => {
    if (!uid || !event || isOwner) return;
    return watchGuest(slug, uid, (data) => setGuest({ uid, data }));
  }, [slug, uid, event, isOwner]);

  // The organizer has no guest record: they post under their account name, with no upload limit.
  const guestData: Guest | null = isOwner
    ? { name: accountName(user!), uploadCount: 0, joinedAt: null }
    : uid && guest?.uid === uid
      ? guest.data
      : null;
  const guestLoading = authLoading || (Boolean(uid) && !isOwner && guest?.uid !== uid);
  const isWelcome = pathname === `/${slug}`;
  const mustJoin = !isWelcome && !guestLoading && !guestData;

  useEffect(() => {
    if (event && mustJoin) router.replace(`/${slug}`);
    // No name to ask the organizer for: straight to the feed.
    if (isOwner && isWelcome) router.replace(`/${slug}/feed`);
  }, [event, mustJoin, isOwner, isWelcome, slug, router]);

  if (event === undefined || (event && guestLoading)) return <FullScreenLoader />;
  if (event === null) return <AlbumNotFound />;
  if (mustJoin || (isOwner && isWelcome)) return <FullScreenLoader />;

  return (
    <GuestContext.Provider value={{ event, user, guest: guestData, isOwner }}>
      {children}
    </GuestContext.Provider>
  );
}

function AlbumNotFound() {
  return (
    <Screen className="items-center justify-center gap-4 px-8 text-center">
      <Rings width={48} />
      <h1 className="font-serif text-4xl font-semibold">Album non trovato</h1>
      <p className="text-[15px] leading-normal text-muted">
        Controlla il link o inquadra di nuovo il QR che trovi sui tavoli.
      </p>
      <Link href="/" className={buttonClass({ variant: "outline", size: "md", className: "mt-2" })}>
        Vai a EasyAlbum
      </Link>
    </Screen>
  );
}

/** Name given at sign-up, falling back to the email's local part. */
function accountName(user: User): string {
  return user.displayName?.trim() || user.email?.split("@")[0] || "Organizzatore";
}
