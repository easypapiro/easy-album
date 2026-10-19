/**
 * Beat grid of the soundtrack, used to cut scenes on the beat.
 * Built-in tracks declare their tempo; uploaded ones are analysed.
 */
import type { Media } from "./types";

/** First beat at `offset` seconds, then one every 60/bpm seconds. */
export type Tempo = { bpm: number; offset: number };

/** Seconds a photo stays on screen when there's no beat to follow. */
export const SCENE = 2.5;
/** Guest clips are trimmed to this length. */
export const MAX_CLIP = 8;
const INTRO = 3.5;
export const OUTRO = 4;

export type Plan = { intro: number; scenes: number[]; total: number };

/**
 * Scene lengths snapped to whole beats: photos get the even number of beats
 * closest to SCENE, clips the even number of beats that fits in them, and the
 * intro ends on a bar line, so every cut lands on a beat.
 */
export function planTimeline(media: Media[], tempo: Tempo | null): Plan {
  const clip = (m: Media) => Math.min(m.duration ?? SCENE, MAX_CLIP);
  if (!tempo) {
    const scenes = media.map((m) => (m.type === "video" ? clip(m) : SCENE));
    return { intro: INTRO, scenes, total: INTRO + sum(scenes) + OUTRO };
  }
  const beat = 60 / tempo.bpm;
  const photoBeats = Math.max(2, 2 * Math.round(SCENE / beat / 2 + 0.01));
  const introBeats = Math.max(4, 4 * Math.round(INTRO / beat / 4 + 0.01));
  const intro = tempo.offset + introBeats * beat;
  const scenes = media.map((m) =>
    m.type === "video" ? Math.max(2, 2 * Math.floor(clip(m) / beat / 2)) * beat : photoBeats * beat,
  );
  return { intro, scenes, total: intro + sum(scenes) + OUTRO };
}

const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

/**
 * Estimates tempo and beat phase from an onset-strength envelope
 * (autocorrelation for the period, comb alignment for the phase).
 * Returns null when no steady beat stands out.
 */
export function detectTempo(buffer: AudioBuffer): Tempo | null {
  const sr = buffer.sampleRate;
  const hop = 512;
  const win = 1024;
  const fps = sr / hop;
  // The first 90 seconds are plenty to lock the tempo.
  const n = Math.min(buffer.length, Math.round(sr * 90));
  const chans = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c));

  const frames = Math.floor((n - win) / hop);
  if (frames < fps * 8) return null;
  const energy = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let e = 0;
    const start = f * hop;
    for (let i = start; i < start + win; i += 2) {
      let x = 0;
      for (const ch of chans) x += ch[i];
      e += x * x;
    }
    energy[f] = Math.log(1e-6 + e);
  }
  // Onset strength: rises in energy only, minus a local mean.
  const odf = new Float32Array(frames);
  for (let f = 1; f < frames; f++) odf[f] = Math.max(0, energy[f] - energy[f - 1]);
  const smooth = new Float32Array(frames);
  const span = Math.round(fps * 0.5);
  let acc = 0;
  for (let f = 0; f < frames; f++) {
    acc += odf[f];
    if (f >= span) acc -= odf[f - span];
    smooth[f] = Math.max(0, odf[f] - acc / Math.min(f + 1, span));
  }

  // Period: autocorrelation over 60–180 BPM, gently favouring ~110 BPM.
  const minLag = Math.floor((60 * fps) / 180);
  const maxLag = Math.ceil((60 * fps) / 60);
  let zero = 0;
  for (let f = 0; f < frames; f++) zero += smooth[f] * smooth[f];
  if (!zero) return null;
  const acf = new Float32Array(maxLag + 2);
  for (let lag = minLag - 1; lag <= maxLag + 1; lag++) {
    let s = 0;
    for (let f = lag; f < frames; f++) s += smooth[f] * smooth[f - lag];
    acf[lag] = s / (frames - lag);
  }
  let best = 0;
  let bestScore = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    const bpm = (60 * fps) / lag;
    const prior = Math.exp(-0.5 * (Math.log2(bpm / 110) / 0.6) ** 2);
    const score = acf[lag] * prior;
    if (score > bestScore) {
      bestScore = score;
      best = lag;
    }
  }
  if (acf[best] / (zero / frames) < 0.08) return null;

  // Refine tempo and phase together: the beat comb that collects the most
  // onsets over the whole excerpt. Small tempo errors add up over a minute,
  // so this matters more than the autocorrelation peak's precision.
  const at = (x: number) => {
    const i = Math.floor(x);
    const fr = x - i;
    return (smooth[i] ?? 0) * (1 - fr) + (smooth[i + 1] ?? 0) * fr;
  };
  const coarse = (60 * fps) / best;
  let bpm = coarse;
  let phase = 0;
  let top = -Infinity;
  for (let cand = coarse * 0.97; cand <= coarse * 1.03; cand += 0.02) {
    const period = (60 * fps) / cand;
    for (let p = 0; p < period; p += 0.5) {
      let s = 0;
      let k = 0;
      for (let f = p; f < frames - 1; f += period, k++) s += at(f);
      s /= k || 1;
      if (s > top) {
        top = s;
        bpm = cand;
        phase = p;
      }
    }
  }
  // The odf frame marks the end of the analysis window that saw the onset.
  const beat = 60 / bpm;
  const offset = (phase * hop + win * 0.75) / sr;
  return { bpm, offset: ((offset % beat) + beat) % beat };
}
