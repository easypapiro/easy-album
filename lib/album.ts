import { signInAnonymously } from "firebase/auth";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import { auth, db, storage } from "./firebase";
import type { Guest, Media } from "./types";

const guestRef = (slug: string, uid: string) => doc(db(), "events", slug, "guests", uid);
const mediaCol = (slug: string) => collection(db(), "events", slug, "media");

export function toMedia(d: QueryDocumentSnapshot): Media {
  return { id: d.id, ...(d.data() as Omit<Media, "id">) };
}

/** Guests don't register: they get an anonymous Firebase account bound to their name. */
export async function joinAlbum(slug: string, name: string): Promise<void> {
  const a = auth();
  const user = a.currentUser ?? (await signInAnonymously(a)).user;
  const r = guestRef(slug, user.uid);
  const existing = await getDoc(r);
  if (existing.exists()) {
    if ((existing.data() as Guest).name !== name) await updateDoc(r, { name });
  } else {
    await setDoc(r, { name, uploadCount: 0, joinedAt: serverTimestamp() });
  }
}

export function watchGuest(
  slug: string,
  uid: string,
  cb: (g: Guest | null) => void,
): () => void {
  return onSnapshot(
    guestRef(slug, uid),
    (s) => cb(s.exists() ? (s.data() as Guest) : null),
    () => cb(null),
  );
}

export function watchFeed(
  slug: string,
  max: number,
  cb: (items: Media[]) => void,
  onError?: (e: Error) => void,
): () => void {
  const q = query(mediaCol(slug), orderBy("createdAt", "desc"), limit(max));
  return onSnapshot(q, (s) => cb(s.docs.map(toMedia)), onError);
}

export async function listAllMedia(slug: string): Promise<Media[]> {
  const s = await getDocs(query(mediaCol(slug), orderBy("createdAt", "desc"), limit(2000)));
  return s.docs.map(toMedia);
}

export async function toggleLike(slug: string, media: Media, uid: string) {
  const liked = media.likedBy.includes(uid);
  await updateDoc(doc(mediaCol(slug), media.id), {
    likedBy: liked ? arrayRemove(uid) : arrayUnion(uid),
    likesCount: increment(liked ? -1 : 1),
  });
}

export type UploadedItem = {
  path: string;
  url: string;
  thumbPath: string | null;
  thumbUrl: string | null;
  type: "photo" | "video";
  width: number | null;
  height: number | null;
  duration: number | null;
};

/**
 * Publishes already-uploaded files. Each media doc is written together with
 * the guest's counter bump, which is what the security rules check.
 */
export async function publishMedia(
  slug: string,
  uid: string,
  uploaderName: string,
  caption: string,
  items: UploadedItem[],
  /** The organizer has no guest record and no upload limit. */
  isOwner = false,
) {
  for (const item of items) {
    const batch = writeBatch(db());
    batch.set(doc(mediaCol(slug)), {
      ...item,
      uploaderId: uid,
      uploaderName,
      caption: caption.trim(),
      likedBy: [],
      likesCount: 0,
      createdAt: serverTimestamp(),
    });
    if (!isOwner) batch.update(guestRef(slug, uid), { uploadCount: increment(1) });
    await batch.commit();
  }
}

/** Uploaders delete their own media; the event owner can delete anyone's. */
export async function deleteMedia(slug: string, media: Media, ownerId: string) {
  const batch = writeBatch(db());
  batch.delete(doc(mediaCol(slug), media.id));
  // Frees the slot so the guest can upload something else (the organizer has none).
  if (media.uploaderId !== ownerId) {
    batch.update(guestRef(slug, media.uploaderId), { uploadCount: increment(-1) });
  }
  await batch.commit();
  await Promise.all(
    [media.path, media.thumbPath]
      .filter((p): p is string => Boolean(p))
      .map((p) => deleteObject(ref(storage(), p)).catch(() => {})),
  );
}

export async function downloadMedia(media: Media) {
  const ext = media.type === "video" ? "mp4" : "jpg";
  const name = `${media.uploaderName.replace(/\s+/g, "-")}-${media.id}.${ext}`;
  try {
    const res = await fetch(media.url);
    const blob = await res.blob();
    const file = new File([blob], name, { type: blob.type });
    // On phones the share sheet is the natural way to "save to gallery".
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
    window.open(media.url, "_blank", "noopener");
  }
}
