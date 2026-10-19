/**
 * Builds the memory video in the browser: the selected photos and clips are
 * drawn on a canvas with the chosen transition, the soundtrack is mixed with
 * Web Audio, and MediaRecorder captures both in real time.
 */
import { detectTempo, MAX_CLIP, OUTRO, planTimeline, type Tempo } from "./tempo";
import type { Media, Transition } from "./types";

const WIDTH = 1280;
const HEIGHT = 720;
/** How long a transition lasts; it starts exactly on the cut (the beat). */
const OVERLAP: Record<Transition, number> = { fade: 0.55, zoom: 0.6, slide: 0.45 };

const CREAM = "#FBF8F4";
const INK = "#2B2622";
const MUTED = "#6B625A";
const GOLD = "#A07E4A";

export type RenderPhase = "prepare" | "record";

export type RenderOptions = {
  canvas: HTMLCanvasElement;
  scenes: Media[];
  transition: Transition;
  trackUrl: string;
  /** Beat grid of the track; null to detect it from the audio. */
  tempo: Tempo | null;
  title: string;
  subtitle: string;
  onProgress: (phase: RenderPhase, progress: number) => void;
  signal: AbortSignal;
};

export type RenderedVideo = { blob: Blob; mimeType: string; ext: "mp4" | "webm" };

type Visual =
  | { kind: "image"; source: ImageBitmap; w: number; h: number }
  | { kind: "video"; source: HTMLVideoElement; w: number; h: number };

type Shot = {
  media: Media | null;
  visual: Visual | null;
  start: number;
  end: number;
  card?: "intro" | "outro";
};

const RECORDER_TYPES = [
  "video/mp4;codecs=avc1.42E01F,mp4a.40.2",
  "video/mp4;codecs=avc1,mp4a",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

export function canRenderVideo(): boolean {
  return (
    typeof MediaRecorder !== "undefined" &&
    typeof HTMLCanvasElement.prototype.captureStream === "function" &&
    RECORDER_TYPES.some((t) => MediaRecorder.isTypeSupported(t))
  );
}

export class RenderInterrupted extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RenderInterrupted";
  }
}

/**
 * Must be called straight from the click handler: the AudioContext is created
 * before the first `await`, which is what lets Safari start it.
 */
export async function renderVideo(opts: RenderOptions): Promise<RenderedVideo> {
  const { canvas, scenes, transition, signal, onProgress } = opts;
  const audio = new AudioContext();
  audio.resume().catch(() => {});
  const cleanups: (() => void)[] = [() => audio.close().catch(() => {})];
  const cleanup = () => cleanups.splice(0).reverse().forEach((fn) => fn());
  const checkAbort = () => {
    if (signal.aborted) throw new DOMException("Generazione annullata", "AbortError");
  };

  try {
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext("2d")!;
    const fonts = await loadFonts();
    const cards = { title: opts.title, subtitle: opts.subtitle, fonts };
    drawCard(ctx, "intro", cards, 1);

    // ---- preparation: soundtrack + every photo and clip
    onProgress("prepare", 0);
    let done = 0;
    const tick = () => onProgress("prepare", ++done / (scenes.length + 1));
    const [music, visuals] = await Promise.all([
      loadTrack(audio, opts.trackUrl).finally(tick),
      mapLimit(scenes, 4, (m) => loadVisual(m, cleanups).finally(tick)),
    ]);
    checkAbort();

    // ---- timeline, with every cut on a beat of the track
    // Unreadable files are skipped.
    const kept = scenes.flatMap((m, i) => (visuals[i] ? [{ media: m, visual: visuals[i] }] : []));
    if (!kept.length) throw new Error("Non è stato possibile leggere i ricordi scelti. Riprovate più tardi.");
    const plan = planTimeline(
      kept.map((k) => k.media),
      opts.tempo ?? detectTempo(music),
    );
    const shots: Shot[] = [{ media: null, visual: null, start: 0, end: plan.intro, card: "intro" }];
    let t = plan.intro;
    kept.forEach(({ media, visual }, i) => {
      shots.push({ media, visual, start: t, end: t + plan.scenes[i] });
      t += plan.scenes[i];
    });
    shots.push({ media: null, visual: null, start: t, end: t + OUTRO, card: "outro" });
    const total = plan.total;

    // ---- soundtrack routing
    const dest = audio.createMediaStreamDestination();
    const master = audio.createGain();
    master.connect(dest);
    const t0 = audio.currentTime + 0.25;
    scheduleTrack(audio, music, master, t0, total);
    master.gain.setValueAtTime(0, t0);
    master.gain.linearRampToValueAtTime(1, t0 + 0.6);
    master.gain.setValueAtTime(1, t0 + total - 3);
    master.gain.linearRampToValueAtTime(0, t0 + total);

    // ---- recorder
    const mimeType = RECORDER_TYPES.find((t) => MediaRecorder.isTypeSupported(t))!;
    const stream = new MediaStream([
      ...canvas.captureStream(30).getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);
    cleanups.push(() => stream.getTracks().forEach((tr) => tr.stop()));
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 6_000_000,
      audioBitsPerSecond: 160_000,
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));

    const wakeLock = await navigator.wakeLock?.request("screen").catch(() => null);
    if (wakeLock) cleanups.push(() => wakeLock.release().catch(() => {}));

    // ---- real-time playback of the timeline
    await waitUntil(audio, t0);
    checkAbort();
    recorder.start(1000);
    onProgress("record", 0);

    const overlap = OVERLAP[transition];
    await new Promise<void>((resolve, reject) => {
      let frame = 0;
      const onHidden = () => {
        if (document.visibilityState === "hidden") {
          fail(
            new RenderInterrupted(
              "La generazione si è interrotta perché la pagina è passata in secondo piano. Riprovate tenendo lo schermo acceso.",
            ),
          );
        }
      };
      const onAbort = () => fail(new DOMException("Generazione annullata", "AbortError"));
      const stopLoop = () => {
        cancelAnimationFrame(frame);
        document.removeEventListener("visibilitychange", onHidden);
        signal.removeEventListener("abort", onAbort);
      };
      const fail = (e: Error) => {
        stopLoop();
        if (recorder.state !== "inactive") recorder.stop();
        reject(e);
      };
      document.addEventListener("visibilitychange", onHidden);
      signal.addEventListener("abort", onAbort);

      const draw = () => {
        const now = audio.currentTime - t0;
        renderFrame(ctx, shots, now, transition, overlap, cards);
        onProgress("record", Math.min(1, now / total));
        if (now >= total) {
          stopLoop();
          // Let the recorder catch the last frames before closing the file.
          setTimeout(() => {
            if (recorder.state !== "inactive") recorder.stop();
            resolve();
          }, 300);
          return;
        }
        frame = requestAnimationFrame(draw);
      };
      frame = requestAnimationFrame(draw);
    });
    await stopped;
    const type = mimeType.split(";")[0];
    return { blob: new Blob(chunks, { type }), mimeType: type, ext: type === "video/mp4" ? "mp4" : "webm" };
  } finally {
    cleanup();
  }
}

// ------------------------------------------------------------------ drawing

type CardText = { title: string; subtitle: string; fonts: { serif: string; sans: string } };

function renderFrame(
  ctx: CanvasRenderingContext2D,
  shots: Shot[],
  t: number,
  transition: Transition,
  overlap: number,
  cards: CardText,
) {
  // The shot on screen, plus the previous one while the transition that
  // started on the cut is still running.
  let i = shots.findIndex((s) => t < s.end);
  if (i < 0) i = shots.length - 1;
  const cur = shots[i];
  const prev = i > 0 && t - cur.start < overlap ? shots[i - 1] : null;

  syncVideo(cur, t, overlap);
  if (prev) syncVideo(prev, t, overlap);
  // Clips that are no longer on screen stop decoding.
  for (const s of shots) if (s !== cur && s !== prev) pauseVideo(s);

  ctx.globalAlpha = 1;
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  if (prev) {
    const p = ease(Math.min(1, (t - cur.start) / overlap));
    if (transition === "slide") {
      drawShot(ctx, prev, t, transition, cards, 1, -p * WIDTH * 0.35);
      drawShot(ctx, cur, t, transition, cards, 1, (1 - p) * WIDTH);
    } else {
      drawShot(ctx, prev, t, transition, cards, 1, 0);
      drawShot(ctx, cur, t, transition, cards, p, 0);
    }
  } else {
    drawShot(ctx, cur, t, transition, cards, 1, 0);
  }
  ctx.globalAlpha = 1;
}

function drawShot(
  ctx: CanvasRenderingContext2D,
  shot: Shot,
  t: number,
  transition: Transition,
  cards: CardText,
  alpha: number,
  dx: number,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(dx, 0);
  if (shot.card) {
    drawCard(ctx, shot.card, cards, alpha, t - shot.start);
  } else if (shot.visual) {
    const life = (t - shot.start + 1) / (shot.end - shot.start + 1);
    const zoom = transition === "zoom" ? 1 + 0.1 * Math.max(0, Math.min(1, life)) : 1;
    drawVisual(ctx, shot.visual, zoom);
    if (shot.media) drawCredit(ctx, shot.media.uploaderName, cards.fonts.sans);
  }
  ctx.restore();
}

/** Cover-fit for landscape shots; portraits sit on a blurred copy of themselves. */
function drawVisual(ctx: CanvasRenderingContext2D, v: Visual, zoom: number) {
  if (!v.w || !v.h) return;
  const ratio = v.w / v.h;
  const cover = Math.max(WIDTH / v.w, HEIGHT / v.h) * zoom;
  if (ratio >= 1.25) {
    const w = v.w * cover;
    const h = v.h * cover;
    ctx.drawImage(v.source, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h);
    return;
  }
  const bg = cover * 1.15;
  ctx.save();
  if (CANVAS_FILTER) ctx.filter = "blur(28px) brightness(0.7)";
  ctx.drawImage(v.source, (WIDTH - v.w * bg) / 2, (HEIGHT - v.h * bg) / 2, v.w * bg, v.h * bg);
  ctx.restore();
  if (!CANVAS_FILTER) {
    // Safari ignores canvas filters: dim the background instead.
    ctx.save();
    ctx.globalAlpha *= 0.55;
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.restore();
  }
  const fit = Math.min(WIDTH / v.w, HEIGHT / v.h) * zoom;
  const w = v.w * fit;
  const h = v.h * fit;
  ctx.drawImage(v.source, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h);
}

function drawCredit(ctx: CanvasRenderingContext2D, name: string, sans: string) {
  const text = `di ${name}`;
  ctx.font = `500 22px ${sans}`;
  const w = ctx.measureText(text).width;
  ctx.save();
  ctx.globalAlpha *= 0.85;
  ctx.fillStyle = "rgba(43, 38, 34, 0.55)";
  roundRect(ctx, 32, HEIGHT - 72, w + 36, 42, 21);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = CREAM;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(text, 50, HEIGHT - 51);
}

function drawCard(ctx: CanvasRenderingContext2D, kind: "intro" | "outro", c: CardText, alpha: number, t = 1) {
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  // The card starts fading in before its own start time: hold the text still
  // until then, otherwise it'd be drawn far below and then jump into place.
  const local = Math.max(0, t);
  // Text rises gently into place during the first second.
  const rise = (1 - ease(Math.min(1, local / 1.2))) * 18;
  ctx.save();
  ctx.globalAlpha = alpha * Math.min(1, 0.15 + local / 1.2);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const cy = HEIGHT / 2 + rise;

  ctx.fillStyle = MUTED;
  ctx.font = `500 20px ${c.fonts.sans}`;
  ctx.letterSpacing = "5px";
  ctx.fillText(kind === "intro" ? "IL NOSTRO MATRIMONIO" : "GRAZIE DI CUORE", WIDTH / 2, cy - 110);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = INK;
  ctx.font = `italic 500 ${fitFont(ctx, c.title, 96, WIDTH - 160, c.fonts.serif)}px ${c.fonts.serif}`;
  ctx.fillText(c.title, WIDTH / 2, cy - 20);

  drawRings(ctx, WIDTH / 2, cy + 62);

  const line = kind === "intro" ? c.subtitle : "a tutti voi che c'eravate";
  if (line) {
    ctx.fillStyle = MUTED;
    ctx.font = `400 26px ${c.fonts.sans}`;
    ctx.fillText(line, WIDTH / 2, cy + 118);
  }
  ctx.restore();
}

function drawRings(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 130, y);
  ctx.lineTo(x - 30, y);
  ctx.moveTo(x + 30, y);
  ctx.lineTo(x + 130, y);
  ctx.stroke();
  for (const ox of [-9, 9]) {
    ctx.beginPath();
    ctx.arc(x + ox, y, 13, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, size: number, max: number, family: string) {
  let s = size;
  while (s > 40) {
    ctx.font = `italic 500 ${s}px ${family}`;
    if (ctx.measureText(text).width <= max) break;
    s -= 4;
  }
  return s;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const CANVAS_FILTER = typeof window !== "undefined" && "filter" in CanvasRenderingContext2D.prototype;

const ease = (p: number) => 1 - (1 - p) ** 3;

// ------------------------------------------------------------- video clips

function syncVideo(shot: Shot, t: number, overlap: number) {
  if (shot.visual?.kind !== "video") return;
  const v = shot.visual.source;
  // Clips start on their cut and keep running while they fade out.
  const local = t - shot.start;
  if (local < 0 || t >= shot.end + overlap) return pauseVideo(shot);
  if (v.paused && !v.ended) {
    if (Math.abs(v.currentTime - local) > 0.4) v.currentTime = Math.min(local, (v.duration || MAX_CLIP) - 0.05);
    v.play().catch(() => {});
  }
}

function pauseVideo(shot: Shot) {
  if (shot.visual?.kind === "video" && !shot.visual.source.paused) shot.visual.source.pause();
}

// ----------------------------------------------------------------- loading

async function loadFonts() {
  const root = getComputedStyle(document.documentElement);
  const serif = root.getPropertyValue("--font-serif").trim() || "Georgia, serif";
  const sans = root.getPropertyValue("--font-sans").trim() || "system-ui, sans-serif";
  await Promise.all([
    document.fonts.load(`italic 500 64px ${serif}`),
    document.fonts.load(`500 20px ${sans}`),
    document.fonts.load(`400 20px ${sans}`),
  ]).catch(() => {});
  return { serif, sans };
}

async function loadTrack(audio: AudioContext, url: string): Promise<AudioBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Non è stato possibile scaricare la musica.");
  return audio.decodeAudioData(await res.arrayBuffer());
}

/** Plays the track from t0, looping with a short crossfade when the video is longer. */
function scheduleTrack(audio: AudioContext, buffer: AudioBuffer, out: AudioNode, t0: number, total: number) {
  const fade = 2;
  const step = Math.max(buffer.duration - fade, 1);
  for (let at = 0; at < total; at += step) {
    const src = audio.createBufferSource();
    src.buffer = buffer;
    const g = audio.createGain();
    src.connect(g).connect(out);
    if (at > 0) {
      g.gain.setValueAtTime(0, t0 + at);
      g.gain.linearRampToValueAtTime(1, t0 + at + fade);
    }
    if (at + step < total) {
      g.gain.setValueAtTime(1, t0 + at + step);
      g.gain.linearRampToValueAtTime(0, t0 + at + buffer.duration);
    }
    src.start(t0 + at);
    src.stop(t0 + Math.min(total, at + buffer.duration));
  }
}

async function loadVisual(m: Media, cleanups: (() => void)[]): Promise<Visual | null> {
  if (m.type === "video") {
    const video = await loadClip(m.url).catch(() => null);
    if (video) {
      cleanups.push(() => {
        video.pause();
        video.removeAttribute("src");
        video.load();
      });
      return { kind: "video", source: video, w: video.videoWidth, h: video.videoHeight };
    }
  }
  // Photos, and clips the browser can't play, fall back to the JPEG preview
  // (also covers HEIC originals that desktop browsers can't decode).
  for (const url of m.type === "photo" ? [m.url, m.thumbUrl] : [m.thumbUrl]) {
    if (!url) continue;
    const bmp = await loadImage(url).catch(() => null);
    if (bmp) {
      cleanups.push(() => bmp.close());
      return { kind: "image", source: bmp, w: bmp.width, h: bmp.height };
    }
  }
  return null;
}

async function loadImage(url: string): Promise<ImageBitmap> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(String(res.status));
  const blob = await res.blob();
  const probe = await createImageBitmap(blob);
  // Keep memory in check: nothing bigger than what the canvas can show.
  const scale = Math.min(1, (WIDTH * 1.3) / probe.width, (HEIGHT * 1.3) / probe.height);
  if (scale === 1) return probe;
  const w = Math.round(probe.width * scale);
  const h = Math.round(probe.height * scale);
  probe.close();
  return createImageBitmap(blob, { resizeWidth: w, resizeHeight: h, resizeQuality: "high" });
}

function loadClip(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    // Canvas frames from another origin need CORS, or the recording is blocked.
    v.crossOrigin = "anonymous";
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    const timer = setTimeout(() => reject(new Error("timeout")), 20_000);
    v.oncanplay = () => {
      clearTimeout(timer);
      resolve(v);
    };
    v.onerror = () => {
      clearTimeout(timer);
      reject(new Error("video"));
    };
    v.src = url;
    v.load();
  });
}

function waitUntil(audio: AudioContext, time: number) {
  return new Promise<void>((resolve) => {
    const check = () => (audio.currentTime >= time ? resolve() : setTimeout(check, 10));
    check();
  });
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
