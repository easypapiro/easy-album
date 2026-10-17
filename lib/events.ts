import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase";
import type { AlbumEvent, VideoDraft } from "./types";

/** Paths that would collide with the app's own routes (also /eventi/nuovo). */
const RESERVED = new Set(["accedi", "registrati", "sposi", "eventi", "nuovo", "api", "admin", "_next"]);

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function baseSlug(name1: string, name2: string): string {
  return slugify(`${name1}-${name2}`) || "album";
}

export async function getEvent(slug: string): Promise<AlbumEvent | null> {
  const snap = await getDoc(doc(db(), "events", slug));
  return snap.exists() ? (snap.data() as AlbumEvent) : null;
}

/** All events of an account, upcoming first, then past ones (most recent first). */
export async function getEventsByOwner(uid: string): Promise<AlbumEvent[]> {
  const q = query(collection(db(), "events"), where("ownerId", "==", uid), limit(100));
  const events = (await getDocs(q)).docs.map((d) => d.data() as AlbumEvent);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = events.filter((e) => e.date < today).sort((a, b) => b.date.localeCompare(a.date));
  return [...upcoming, ...past];
}

type NewEvent = { name1: string; name2: string; date: string; location: string };

/** Creates the event under the first free slug (giulia-marco, giulia-marco-2, …). */
export async function createEvent(ownerId: string, data: NewEvent): Promise<AlbumEvent> {
  const base = baseSlug(data.name1, data.name2);
  for (let n = 1; n < 50; n++) {
    const slug = n === 1 && !RESERVED.has(base) ? base : `${base}-${n}`;
    if (RESERVED.has(slug)) continue;
    const event: AlbumEvent = {
      slug,
      ownerId,
      name1: data.name1.trim(),
      name2: data.name2.trim(),
      date: data.date,
      location: data.location.trim(),
      coverUrl: null,
      coverPath: null,
      createdAt: null,
    };
    const created = await runTransaction(db(), async (tx) => {
      const r = doc(db(), "events", slug);
      if ((await tx.get(r)).exists()) return false;
      tx.set(r, { ...event, createdAt: serverTimestamp() });
      return true;
    });
    if (created) return event;
  }
  throw new Error("Non è stato possibile creare l'indirizzo dell'album. Riprova.");
}

export async function setCover(event: AlbumEvent, file: Blob): Promise<string> {
  const path = `events/${event.slug}/cover/${Date.now()}.jpg`;
  const r = ref(storage(), path);
  await uploadBytes(r, file, { contentType: "image/jpeg" });
  const url = await getDownloadURL(r);
  await updateDoc(doc(db(), "events", event.slug), { coverUrl: url, coverPath: path });
  if (event.coverPath) deleteObject(ref(storage(), event.coverPath)).catch(() => {});
  return url;
}

export async function getEventStats(slug: string) {
  const media = collection(db(), "events", slug, "media");
  const [photos, videos] = await Promise.all([
    getCountFromServer(query(media, where("type", "==", "photo"))),
    getCountFromServer(query(media, where("type", "==", "video"))),
  ]);
  return {
    photos: photos.data().count,
    videos: videos.data().count,
  };
}

export const DEFAULT_DRAFT: VideoDraft = {
  mediaIds: [],
  track: "primo-ballo",
  customTrackName: null,
  customTrackUrl: null,
  customTrackPath: null,
  transition: "fade",
};

const draftRef = (slug: string) => doc(db(), "events", slug, "video", "draft");

export async function getVideoDraft(slug: string): Promise<VideoDraft> {
  const snap = await getDoc(draftRef(slug));
  return snap.exists() ? { ...DEFAULT_DRAFT, ...(snap.data() as Partial<VideoDraft>) } : DEFAULT_DRAFT;
}

export async function saveVideoDraft(slug: string, patch: Partial<VideoDraft>) {
  await setDoc(draftRef(slug), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
}

export async function uploadTrack(slug: string, file: File) {
  const path = `events/${slug}/music/${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ""))}.mp3`;
  const r = ref(storage(), path);
  await uploadBytes(r, file, { contentType: file.type || "audio/mpeg" });
  return { path, url: await getDownloadURL(r) };
}
