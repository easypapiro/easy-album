"use client";

import type { User } from "firebase/auth";
import { createContext, useContext } from "react";
import type { AlbumEvent } from "@/lib/types";

export const AccountContext = createContext<{ user: User } | null>(null);

/** The signed-in organizer account (everything under /eventi). */
export function useAccount(): { user: User } {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used inside /eventi");
  return ctx;
}

type EventState = { user: User; event: AlbumEvent };

export const OwnedEventContext = createContext<EventState | null>(null);

/** One of the account's events (everything under /eventi/[slug]). */
export function useOwnedEvent(): EventState {
  const ctx = useContext(OwnedEventContext);
  if (!ctx) throw new Error("useOwnedEvent must be used inside /eventi/[slug]");
  return ctx;
}
