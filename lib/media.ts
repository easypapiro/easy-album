/** Client-side helpers to read media files before uploading them. */

export type Prepared = {
  type: "photo" | "video";
  width: number | null;
  height: number | null;
  duration: number | null;
  /** small JPEG used in feeds and grids */
  thumb: Blob | null;
  /** object URL for the local preview */
  preview: string;
};

const THUMB_MAX = 900;

function canvasToJpeg(canvas: HTMLCanvasElement, quality = 0.82): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", quality));
}

function drawScaled(
  source: CanvasImageSource,
  w: number,
  h: number,
  max: number,
): HTMLCanvasElement {
  const scale = Math.min(1, max / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext("2d")!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function resizeImage(file: Blob, max: number): Promise<Blob | null> {
  try {
    const bmp = await createImageBitmap(file);
    const canvas = drawScaled(bmp, bmp.width, bmp.height, max);
    bmp.close();
    return canvasToJpeg(canvas);
  } catch {
    return null;
  }
}

async function preparePhoto(file: File, preview: string): Promise<Prepared> {
  try {
    const bmp = await createImageBitmap(file);
    const { width, height } = bmp;
    const thumb = await canvasToJpeg(drawScaled(bmp, width, height, THUMB_MAX));
    bmp.close();
    return { type: "photo", width, height, duration: null, thumb, preview };
  } catch {
    // Formats the browser can't decode (e.g. HEIC on desktop) still upload as-is.
    return { type: "photo", width: null, height: null, duration: null, thumb: null, preview };
  }
}

function prepareVideo(file: File, preview: string): Promise<Prepared> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const fallback: Prepared = {
      type: "video", width: null, height: null, duration: null, thumb: null, preview,
    };
    const timer = setTimeout(() => resolve(fallback), 8000);
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = preview;
    video.onerror = () => {
      clearTimeout(timer);
      resolve(fallback);
    };
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
    };
    video.onseeked = async () => {
      clearTimeout(timer);
      const w = video.videoWidth;
      const h = video.videoHeight;
      const thumb = w && h ? await canvasToJpeg(drawScaled(video, w, h, THUMB_MAX)) : null;
      resolve({
        type: "video",
        width: w || null,
        height: h || null,
        duration: Number.isFinite(video.duration) ? video.duration : null,
        thumb,
        preview,
      });
    };
  });
}

export function prepareMedia(file: File): Promise<Prepared> {
  const preview = URL.createObjectURL(file);
  return file.type.startsWith("video/") ? prepareVideo(file, preview) : preparePhoto(file, preview);
}

export function isSupported(file: File): boolean {
  return file.type.startsWith("image/") || file.type.startsWith("video/");
}

export const MAX_FILE_BYTES = 300 * 1024 * 1024;
