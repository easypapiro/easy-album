/**
 * Synthesizes the three built-in soundtracks of the memory video into
 * public/music/{id}.m4a. No samples or external tools besides macOS
 * `afconvert` (WAV → AAC): every instrument is generated here.
 *
 *   node scripts/generate-tracks.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SR = 44100;
const OUT_DIR = new URL("../public/music/", import.meta.url).pathname;

const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

/** Deterministic RNG so every run produces the same files. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Mix {
  constructor(seconds) {
    this.len = Math.ceil(seconds * SR);
    this.L = new Float32Array(this.len);
    this.R = new Float32Array(this.len);
  }
  /** Adds a mono voice at `start` seconds, panned (-1 left … 1 right). */
  add(voice, start, pan = 0, gain = 1) {
    const off = Math.round(start * SR);
    const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
    const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
    for (let i = 0; i < voice.length && off + i < this.len; i++) {
      this.L[off + i] += voice[i] * gl;
      this.R[off + i] += voice[i] * gr;
    }
  }
}

// ---------------------------------------------------------------- instruments

/** Envelope multiplier with linear attack and exponential-ish release. */
function adsr(i, n, attack, release) {
  const t = i / SR;
  const end = n / SR;
  let e = attack > 0 ? Math.min(1, t / attack) : 1;
  if (t > end - release) e *= Math.max(0, (end - t) / release);
  return e;
}

/** Struck string: decaying, slightly inharmonic partials, two detuned strings. */
function piano(midi, dur, vel = 0.8) {
  const f = mtof(midi);
  const n = Math.round((dur + 1.2) * SR);
  const out = new Float32Array(n);
  const bright = 0.6 + vel * 0.6;
  for (let h = 1; h <= 9; h++) {
    const fh = f * h * Math.sqrt(1 + 0.00035 * h * h);
    if (fh > 9000) break;
    const amp = (vel / h ** (1.9 - bright * 0.5)) * 0.5;
    const decay = 0.7 + h * 0.55 + f / 900;
    for (const det of [-0.0007, 0.0007]) {
      const w = (2 * Math.PI * fh * (1 + det)) / SR;
      for (let i = 0; i < n; i++) {
        const t = i / SR;
        out[i] += amp * Math.sin(w * i) * Math.exp(-t * decay);
      }
    }
  }
  // Damper: notes fade quickly once released.
  const rel = Math.round(dur * SR);
  for (let i = 0; i < n; i++) {
    const a = Math.min(1, i / (0.004 * SR));
    const d = i > rel ? Math.exp(-((i - rel) / SR) * 7) : 1;
    out[i] *= a * d;
  }
  return out;
}

/** Karplus-Strong plucked nylon string with a soft body filter. */
function pluck(midi, dur, vel = 0.8, random = Math.random) {
  const f = mtof(midi);
  const period = SR / f;
  const p = Math.floor(period);
  const frac = period - p;
  const n = Math.round((dur + 1.5) * SR);
  const buf = new Float32Array(p + 2);
  // Softened noise burst: nylon, not steel.
  let prev = 0;
  for (let i = 0; i < buf.length; i++) {
    prev = prev * 0.55 + (random() * 2 - 1) * 0.45;
    buf[i] = prev * vel;
  }
  const out = new Float32Array(n);
  const decay = 0.9965 - Math.min(0.004, f / 400000);
  let idx = 0;
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const a = buf[idx];
    const b = buf[(idx + 1) % buf.length];
    const s = (a * (1 - frac) + b * frac + a) * 0.5 * decay;
    buf[idx] = s;
    idx = (idx + 1) % buf.length;
    lp += (s - lp) * 0.35;
    out[i] = lp;
  }
  const rel = Math.round(dur * SR);
  for (let i = rel; i < n; i++) out[i] *= Math.exp(-((i - rel) / SR) * 5);
  return out;
}

/** Glockenspiel-like bell: a few inharmonic sine partials. */
function bell(midi, dur, vel = 0.6) {
  const f = mtof(midi);
  const n = Math.round((dur + 1.4) * SR);
  const out = new Float32Array(n);
  const partials = [
    [1, 1, 2.2],
    [2.76, 0.35, 4.5],
    [5.4, 0.12, 7],
    [8.93, 0.05, 9],
  ];
  for (const [ratio, amp, decay] of partials) {
    const w = (2 * Math.PI * f * ratio) / SR;
    for (let i = 0; i < n; i++) out[i] += vel * amp * Math.sin(w * i) * Math.exp((-i / SR) * decay);
  }
  for (let i = 0; i < Math.min(n, 120); i++) out[i] *= i / 120;
  return out;
}

// Band-limited saw wavetable for strings.
const TABLE = 4096;
const SAW = new Float32Array(TABLE);
for (let h = 1; h <= 24; h++) {
  for (let i = 0; i < TABLE; i++) SAW[i] += (Math.sin((2 * Math.PI * h * i) / TABLE) / h) * (1 / (1 + (h / 10) ** 2));
}

/** Ensemble strings: detuned saws, slow bow attack, gentle vibrato. */
function strings(midi, dur, vel = 0.6, { attack = 0.35, release = 0.6, voices = 3, vibrato = 0.004 } = {}) {
  const f = mtof(midi);
  const n = Math.round((dur + release) * SR);
  const out = new Float32Array(n);
  for (let v = 0; v < voices; v++) {
    const det = 1 + (v - (voices - 1) / 2) * 0.0035;
    let phase = (v * 0.37) % 1;
    const vibRate = 5 + v * 0.4;
    for (let i = 0; i < n; i++) {
      const vib = 1 + vibrato * Math.sin((2 * Math.PI * vibRate * i) / SR) * Math.min(1, i / SR / 0.6);
      phase += (f * det * vib) / SR;
      phase -= Math.floor(phase);
      out[i] += SAW[(phase * TABLE) | 0] / voices;
    }
  }
  // One-pole low-pass keeps them warm.
  let lp = 0;
  const k = Math.min(0.5, (2 * Math.PI * Math.min(4200, f * 6)) / SR);
  for (let i = 0; i < n; i++) {
    lp += (out[i] - lp) * k;
    out[i] = lp * vel * adsr(i, n, attack, release);
  }
  return out;
}

/** Timpani-ish drum: tuned sine with a pitch drop and a noisy head. */
function timpani(midi, vel = 0.8, random = Math.random) {
  const f = mtof(midi);
  const n = Math.round(1.6 * SR);
  const out = new Float32Array(n);
  let phase = 0;
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    phase += (f * (1 + 0.25 * Math.exp(-t * 30))) / SR;
    lp += ((random() * 2 - 1) - lp) * 0.08;
    out[i] = vel * (Math.sin(2 * Math.PI * phase) * Math.exp(-t * 2.6) + lp * 0.5 * Math.exp(-t * 18));
  }
  return out;
}

/** Shaker / tambourine: high-passed noise burst. */
function shaker(vel = 0.3, len = 0.09, random = Math.random, jingle = false) {
  const n = Math.round((len + 0.15) * SR);
  const out = new Float32Array(n);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const x = random() * 2 - 1;
    const hp = x - prev;
    prev = x;
    const env = Math.min(1, t / 0.008) * Math.exp(-Math.max(0, t - 0.01) / (len / 3));
    let s = hp * env;
    if (jingle) s += Math.sin(2 * Math.PI * 7200 * t) * Math.sin(2 * Math.PI * 9100 * t) * env * 0.35;
    out[i] = s * vel;
  }
  return out;
}

/** Round sub bass (sine + a touch of second harmonic). */
function bass(midi, dur, vel = 0.7) {
  const f = mtof(midi);
  const n = Math.round((dur + 0.2) * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const w = (2 * Math.PI * f * i) / SR;
    out[i] = vel * (Math.sin(w) + 0.25 * Math.sin(2 * w)) * adsr(i, n, 0.01, 0.2);
  }
  return out;
}

// --------------------------------------------------------------------- reverb

/** Freeverb-style stereo reverb. Returns new wet buffers. */
function reverb(L, R, { room = 0.84, damp = 0.3 } = {}) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const allps = [556, 441, 341, 225];
  const run = (input, spread) => {
    const out = new Float32Array(input.length);
    for (const d of combs) {
      const buf = new Float32Array(d + spread);
      let idx = 0;
      let store = 0;
      for (let i = 0; i < input.length; i++) {
        const y = buf[idx];
        store = y * (1 - damp) + store * damp;
        buf[idx] = input[i] * 0.015 + store * room;
        idx = (idx + 1) % buf.length;
        out[i] += y;
      }
    }
    for (const d of allps) {
      const buf = new Float32Array(d + spread);
      let idx = 0;
      for (let i = 0; i < out.length; i++) {
        const b = buf[idx];
        const y = -out[i] + b;
        buf[idx] = out[i] + b * 0.5;
        idx = (idx + 1) % buf.length;
        out[i] = y;
      }
    }
    return out;
  };
  return [run(L, 0), run(R, 23)];
}

// ---------------------------------------------------------------- rendering

function master(mix, { wet = 0.28, fadeOut = 2.5 } = {}) {
  const [wl, wr] = reverb(mix.L, mix.R);
  const n = mix.len;
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  let peak = 0;
  let energy = 0;
  for (let i = 0; i < n; i++) {
    L[i] = mix.L[i] + wl[i] * wet;
    R[i] = mix.R[i] + wr[i] * wet;
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
    energy += L[i] * L[i] + R[i] * R[i];
  }
  // Same loudness for every track (about -15 dBFS RMS); the soft clipper
  // below absorbs the few transients this pushes past full scale.
  const rms = Math.sqrt(energy / (2 * n)) || 1;
  const g = Math.min(1.4 / (peak || 1), 0.178 / rms);
  const fo = fadeOut * SR;
  for (let i = 0; i < n; i++) {
    const fade = Math.min(1, i / (0.02 * SR), (n - i) / fo);
    L[i] = Math.tanh(L[i] * g * 1.1) * fade;
    R[i] = Math.tanh(R[i] * g * 1.1) * fade;
  }
  return [L, R];
}

function wav([L, R]) {
  const n = L.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4);
  }
  return buf;
}

/** Melody notes: [beat within bar, midi, length in beats]. */
function playMelody(bars, startBar, beat, play) {
  bars.forEach((notes, b) => {
    for (const [at, midi, len] of notes) play((startBar + b) * 4 * beat + at * beat, midi, len * beat);
  });
}

// ------------------------------------------------------------- "Primo ballo"

function primoBallo() {
  const bpm = 72;
  const beat = 60 / bpm;
  const bar = beat * 4;
  const r = rng(1);
  const mix = new Mix(20 * bar + 1.5);

  // F – C – Dm – Bb – F – Gm – C – C (F major)
  const chords = [
    { bass: 41, tones: [53, 57, 60] },
    { bass: 36, tones: [52, 55, 60] },
    { bass: 38, tones: [50, 53, 57] },
    { bass: 34, tones: [50, 53, 58] },
    { bass: 41, tones: [53, 57, 60] },
    { bass: 43, tones: [50, 55, 58] },
    { bass: 36, tones: [52, 55, 60] },
    { bass: 36, tones: [52, 55, 60] },
  ];
  const tonic = chords[0];
  const melody = [
    [[0, 69, 1], [1, 72, 1], [2, 77, 1.5], [3.5, 76, 0.5]],
    [[0, 76, 1.5], [1.5, 74, 0.5], [2, 72, 2]],
    [[0, 74, 1], [1, 77, 1], [2, 81, 1.5], [3.5, 79, 0.5]],
    [[0, 77, 1.5], [1.5, 74, 0.5], [2, 74, 1], [3, 72, 1]],
    [[0, 72, 1], [1, 69, 1], [2, 72, 1], [3, 77, 1]],
    [[0, 79, 1.5], [1.5, 77, 0.5], [2, 74, 2]],
    [[0, 76, 1], [1, 77, 1], [2, 79, 2]],
    [[0, 76, 4]],
  ];

  const arpeggio = (barIdx, c, vel) => {
    const pattern = [c.bass, c.bass + 7, c.tones[0], c.tones[1], c.tones[2], c.tones[1], c.tones[0], c.bass + 7];
    pattern.forEach((m, i) => {
      const t = barIdx * bar + (i * beat) / 2 + r() * 0.01;
      mix.add(piano(m, i === 0 ? bar : beat * 1.5, vel * (i === 0 ? 1 : 0.7) * (0.9 + r() * 0.2)), t, -0.25, 0.5);
    });
  };
  const lead = (t, m, len, vel = 0.85, octave = false) => {
    mix.add(piano(m, len * 0.95, vel * (0.92 + r() * 0.1)), t + r() * 0.012, 0.2, 0.75);
    if (octave) mix.add(piano(m + 12, len * 0.95, vel * 0.45), t + 0.006, 0.3, 0.45);
  };

  // Intro (2) · A (8) · B with octaves (8) · outro on F (2)
  arpeggio(0, chords[0], 0.55);
  arpeggio(1, chords[1], 0.6);
  for (let i = 0; i < 8; i++) arpeggio(2 + i, chords[i], 0.65);
  playMelody(melody, 2, beat, (t, m, len) => lead(t, m, len));
  for (let i = 0; i < 8; i++) {
    const c = i === 7 ? chords[6] : chords[i];
    arpeggio(10 + i, c, 0.72);
    // Block chord on the downbeat thickens the second half.
    for (const m of c.tones) mix.add(piano(m + 12, bar * 0.9, 0.35), (10 + i) * bar, 0, 0.35);
  }
  playMelody(melody, 10, beat, (t, m, len) => lead(t, m, len, 0.9, true));
  arpeggio(18, tonic, 0.55);
  for (const m of [tonic.bass, ...tonic.tones, 65, 69, 72, 77]) mix.add(piano(m, bar * 2, 0.5), 19 * bar + r() * 0.03, 0, 0.5);
  lead(18 * bar, 72, 2, 0.7);
  lead(18 * bar + 2 * beat, 77, 6, 0.7, true);
  return master(mix, { wet: 0.34, fadeOut: 3 });
}

// --------------------------------------------------------- "Giardino d'estate"

function giardino() {
  const bpm = 104;
  const beat = 60 / bpm;
  const bar = beat * 4;
  const r = rng(2);
  const mix = new Mix(28 * bar + 3);

  const G = [43, 47, 50, 55, 59, 67];
  const D_Fs = [42, 50, 57, 62, 66, 69];
  const Em = [40, 47, 52, 55, 59, 64];
  const C = [48, 52, 55, 60, 64, 67];
  const Am = [45, 52, 57, 60, 64, 69];
  const D = [50, 57, 62, 66, 69, 74];
  const verse = [G, D_Fs, Em, C];
  const bridge = [Am, C, G, D];

  const pick = (barIdx, chord, vel = 0.75) => {
    const order = [0, 3, 4, 5, 1, 4, 3, 4];
    order.forEach((s, i) => {
      const t = barIdx * bar + (i * beat) / 2 + r() * 0.012;
      const pan = -0.35 + (s / 5) * 0.4;
      mix.add(pluck(chord[s], beat * 1.6, vel * (i % 2 ? 0.75 : 1) * (0.9 + r() * 0.15), r), t, pan, 0.9);
    });
  };
  const strum = (t, chord, vel = 0.8, len = bar) => {
    chord.forEach((m, i) => mix.add(pluck(m, len, vel * (0.85 + r() * 0.2), r), t + i * 0.012, -0.2 + i * 0.08, 0.7));
  };
  const shake = (barIdx) => {
    for (let i = 0; i < 8; i++) {
      mix.add(shaker(i % 2 ? 0.16 : 0.08, 0.08, r), barIdx * bar + (i * beat) / 2 + r() * 0.008, 0.45, 1);
    }
  };
  const melodyA = [
    [[0, 79, 1], [1, 83, 1], [2, 86, 2]],
    [[0, 81, 1.5], [1.5, 78, 0.5], [2, 74, 2]],
    [[0, 79, 1], [1, 83, 1], [2, 88, 1.5], [3.5, 86, 0.5]],
    [[0, 84, 1.5], [1.5, 83, 0.5], [2, 79, 2]],
    [[0, 79, 1], [1, 83, 1], [2, 86, 2]],
    [[0, 81, 1.5], [1.5, 78, 0.5], [2, 74, 2]],
    [[0, 79, 1], [1, 83, 1], [2, 88, 1.5], [3.5, 86, 0.5]],
    [[0, 84, 1], [1, 86, 1], [2, 83, 2]],
  ];
  const melodyB = [
    [[0, 84, 1], [1, 81, 1], [2, 76, 2]],
    [[0, 79, 1], [1, 81, 1], [2, 84, 2]],
    [[0, 83, 1.5], [1.5, 81, 0.5], [2, 79, 2]],
    [[0, 81, 3], [3, 78, 1]],
    [[0, 84, 1], [1, 81, 1], [2, 76, 2]],
    [[0, 79, 1], [1, 81, 1], [2, 84, 2]],
    [[0, 83, 1.5], [1.5, 81, 0.5], [2, 79, 2]],
    [[0, 81, 2], [2, 83, 1], [3, 86, 1]],
  ];
  const ring = (t, m, len) => mix.add(bell(m, len, 0.32 * (0.9 + r() * 0.15)), t, 0.3, 1);

  // Intro (4) · A (8) · B (8) · A' (6) · final strum (2)
  for (let i = 0; i < 4; i++) pick(i, verse[i % 4], 0.65);
  for (let i = 0; i < 8; i++) {
    pick(4 + i, verse[i % 4]);
    shake(4 + i);
    mix.add(bass(verse[i % 4][0] - 12, bar * 0.9, 0.35), (4 + i) * bar, 0, 1);
  }
  playMelody(melodyA, 4, beat, ring);
  for (let i = 0; i < 8; i++) {
    const c = bridge[i % 4];
    strum((12 + i) * bar, c, 0.6, beat * 1.8);
    strum((12 + i) * bar + 2.5 * beat, c, 0.45, beat * 1.4);
    pick(12 + i, c, 0.5);
    shake(12 + i);
    mix.add(bass(c[0] - 12, bar * 0.9, 0.4), (12 + i) * bar, 0, 1);
  }
  playMelody(melodyB, 12, beat, ring);
  for (let i = 0; i < 6; i++) {
    pick(20 + i, verse[i % 4]);
    shake(20 + i);
    mix.add(bass(verse[i % 4][0] - 12, bar * 0.9, 0.35), (20 + i) * bar, 0, 1);
  }
  playMelody(melodyA.slice(0, 6), 20, beat, ring);
  strum(26 * bar, G, 0.85, bar * 2);
  ring(26 * bar, 79, 2);
  ring(26 * bar + beat, 83, 2);
  ring(26 * bar + 2 * beat, 86, 6);
  return master(mix, { wet: 0.22, fadeOut: 2.5 });
}

// ------------------------------------------------------------ "Gran finale"

function granFinale() {
  const bpm = 116;
  const beat = 60 / bpm;
  const bar = beat * 4;
  const r = rng(3);
  const mix = new Mix(32 * bar + 3);

  const chord = {
    D: { root: 38, tones: [50, 57, 62, 66] },
    A: { root: 33, tones: [45, 57, 61, 64] },
    Bm: { root: 35, tones: [47, 54, 59, 62] },
    G: { root: 31, tones: [43, 55, 59, 62] },
    Fsm: { root: 30, tones: [42, 54, 57, 61] },
  };
  const A = [chord.D, chord.A, chord.Bm, chord.G];
  const B = [chord.G, chord.A, chord.Fsm, chord.Bm, chord.G, chord.A, chord.D, chord.D];

  const pad = (barIdx, c, vel = 0.32) => {
    c.tones.forEach((m, i) => mix.add(strings(m, bar * 0.98, vel, { attack: 0.25 }), barIdx * bar, -0.5 + i * 0.33, 0.6));
    mix.add(strings(c.root, bar * 0.95, vel * 1.1, { attack: 0.05, release: 0.3, voices: 2 }), barIdx * bar, 0, 0.7);
  };
  const ostinato = (barIdx, c, vel = 0.35) => {
    const t = c.tones.map((m) => m + 12);
    const pattern = [t[0], t[2], t[1], t[2], t[0], t[2], t[1], t[3]];
    pattern.forEach((m, i) => {
      const note = strings(m, beat * 0.28, vel * (i % 2 ? 0.75 : 1), { attack: 0.006, release: 0.08, voices: 2, vibrato: 0 });
      mix.add(note, barIdx * bar + (i * beat) / 2 + r() * 0.006, 0.35, 0.8);
    });
  };
  const drums = (barIdx, c, vel = 0.7, fill = false) => {
    const root = c.root + 12 > 45 ? c.root : c.root + 12;
    mix.add(timpani(root, vel, r), barIdx * bar, -0.1, 0.9);
    mix.add(timpani(root, vel * 0.7, r), barIdx * bar + 2 * beat, -0.1, 0.9);
    if (fill) {
      mix.add(timpani(root, vel * 0.5, r), barIdx * bar + 3 * beat, -0.1, 0.9);
      mix.add(timpani(root + 7, vel * 0.6, r), barIdx * bar + 3.5 * beat, -0.1, 0.9);
    }
    for (let i = 0; i < 8; i++) {
      const accent = i === 2 || i === 6;
      mix.add(shaker(accent ? 0.22 : 0.08, accent ? 0.16 : 0.06, r, accent), barIdx * bar + (i * beat) / 2, 0.5, 1);
    }
  };
  const lead = (vel, octave) => (t, m, len) => {
    mix.add(strings(m, len * 0.97, vel, { attack: 0.06, release: 0.25, voices: 3, vibrato: 0.006 }), t, 0.1, 0.9);
    if (octave) mix.add(strings(m - 12, len * 0.97, vel * 0.6, { attack: 0.06, release: 0.25, voices: 3 }), t, -0.2, 0.7);
  };
  const melodyA = [
    [[0, 78, 1], [1, 81, 1], [2, 86, 1.5], [3.5, 85, 0.5]],
    [[0, 83, 1], [1, 81, 1], [2, 76, 2]],
    [[0, 78, 1], [1, 83, 1], [2, 86, 1.5], [3.5, 85, 0.5]],
    [[0, 83, 2], [2, 79, 1], [3, 81, 1]],
    [[0, 78, 1], [1, 81, 1], [2, 86, 1.5], [3.5, 85, 0.5]],
    [[0, 85, 1], [1, 86, 1], [2, 88, 2]],
    [[0, 86, 1.5], [1.5, 83, 0.5], [2, 78, 2]],
    [[0, 79, 1], [1, 81, 1], [2, 83, 1], [3, 85, 1]],
  ];
  const melodyB = [
    [[0, 86, 2], [2, 83, 2]],
    [[0, 85, 2], [2, 81, 2]],
    [[0, 81, 1], [1, 85, 1], [2, 88, 2]],
    [[0, 86, 3], [3, 83, 1]],
    [[0, 83, 1], [1, 86, 1], [2, 91, 2]],
    [[0, 88, 1], [1, 86, 1], [2, 85, 2]],
    [[0, 86, 4]],
    [[0, 81, 2], [2, 85, 2]],
  ];

  // Intro (4) · A (8) · B (8) · A' with octaves (8) · finale (4)
  for (let i = 0; i < 4; i++) {
    ostinato(i, A[i], 0.25 + i * 0.04);
    mix.add(timpani(A[i].root + 12, 0.3 + i * 0.12, r), i * bar, 0, 0.9);
  }
  for (let i = 0; i < 8; i++) {
    pad(4 + i, A[i % 4]);
    ostinato(4 + i, A[i % 4]);
    drums(4 + i, A[i % 4], 0.6, i === 7);
  }
  playMelody(melodyA, 4, beat, lead(0.42, false));
  for (let i = 0; i < 8; i++) {
    pad(12 + i, B[i], 0.36);
    ostinato(12 + i, B[i], 0.38);
    drums(12 + i, B[i], 0.68, i === 7);
  }
  playMelody(melodyB, 12, beat, lead(0.45, false));
  for (let i = 0; i < 8; i++) {
    pad(20 + i, A[i % 4], 0.38);
    ostinato(20 + i, A[i % 4], 0.4);
    drums(20 + i, A[i % 4], 0.75, i === 7);
  }
  playMelody(melodyA, 20, beat, lead(0.48, true));
  // Finale: three tutti hits, then a long D major chord.
  for (const at of [0, 1.5, 3]) {
    const t = 28 * bar + at * beat;
    for (const m of chord.D.tones) mix.add(strings(m + 12, beat * 0.9, 0.45, { attack: 0.01, release: 0.2 }), t, 0, 0.6);
    mix.add(timpani(38, 0.9, r), t, 0, 0.9);
  }
  for (const m of [...chord.D.tones, 74, 78, 81, 86]) mix.add(strings(m, bar * 2.6, 0.38, { attack: 0.08, release: 1.2 }), 29 * bar, 0, 0.55);
  mix.add(strings(26, bar * 2.6, 0.5, { attack: 0.05, release: 1.2, voices: 2 }), 29 * bar, 0, 0.7);
  for (let i = 0; i < 12; i++) mix.add(timpani(38, 0.2 + i * 0.05, r), 29 * bar + i * (beat / 3), 0, 0.7);
  mix.add(timpani(38, 1, r), 30 * bar, 0, 1);
  return master(mix, { wet: 0.3, fadeOut: 3.5 });
}

// ------------------------------------------------------------------- output

const TRACKS = { "primo-ballo": primoBallo, giardino, "gran-finale": granFinale };

mkdirSync(OUT_DIR, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), "tracks-"));
try {
  for (const [id, render] of Object.entries(TRACKS)) {
    const started = Date.now();
    const stereo = render();
    const wavPath = join(tmp, `${id}.wav`);
    writeFileSync(wavPath, wav(stereo));
    execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "160000", wavPath, join(OUT_DIR, `${id}.m4a`)]);
    const secs = (stereo[0].length / SR).toFixed(1);
    console.log(`${id}.m4a  ${secs}s  (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
