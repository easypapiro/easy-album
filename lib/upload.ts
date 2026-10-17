import {
  getDownloadURL,
  ref,
  uploadBytes,
  uploadBytesResumable,
  type UploadTask,
} from "firebase/storage";
import { storage } from "./firebase";
import type { Prepared } from "./media";
import type { UploadedItem } from "./album";

function extOf(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type.split("/")[1] ?? "bin";
}

/**
 * Uploads the original file (resumable, with progress) and its thumbnail.
 * Returns the task so the caller can cancel it, plus a promise of the result.
 */
export function startUpload(
  slug: string,
  uid: string,
  file: File,
  prepared: Prepared,
  onProgress: (pct: number) => void,
): { task: UploadTask; done: Promise<UploadedItem> } {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const base = `events/${slug}/media/${uid}/${id}`;
  const path = `${base}.${extOf(file)}`;
  const task = uploadBytesResumable(ref(storage(), path), file, {
    contentType: file.type,
    cacheControl: "public, max-age=31536000",
  });
  task.on("state_changed", (s) => {
    if (s.totalBytes) onProgress(s.bytesTransferred / s.totalBytes);
  });

  const done = (async (): Promise<UploadedItem> => {
    const thumbPath = prepared.thumb ? `${base}_thumb.jpg` : null;
    const thumbUpload = prepared.thumb
      ? uploadBytes(ref(storage(), thumbPath!), prepared.thumb, {
          contentType: "image/jpeg",
          cacheControl: "public, max-age=31536000",
        }).then((r) => getDownloadURL(r.ref))
      : Promise.resolve(null);
    const snap = await task;
    const [url, thumbUrl] = await Promise.all([getDownloadURL(snap.ref), thumbUpload]);
    return {
      path,
      url,
      thumbPath,
      thumbUrl,
      type: prepared.type,
      width: prepared.width,
      height: prepared.height,
      duration: prepared.duration,
    };
  })();

  return { task, done };
}
