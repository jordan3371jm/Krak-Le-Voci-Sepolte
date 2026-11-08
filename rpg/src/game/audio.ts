// ============================================================
// Audio — partitura generativa (WebAudio)
// Niente file esterni: un piccolo "ensemble" sintetizzato (archi, arpa,
// campane, coro, timpani) con riverbero da cattedrale, che suona
// progressioni modali diverse per villaggio, dungeon, combattimento e boss.
// L'audio resta un sistema di gioco (GDD §11.3, §20): la corruzione scorda
// l'armonia, il Rito (fullscreen) aggiunge il coro di sussurri, la Dissonanza
// massima porta al silenzio, le scelte morali hanno il battito cardiaco.
// ============================================================

export type Scene = 'menu' | 'village' | 'delve' | 'combat' | 'boss';
interface Mood { scene: Scene; root: number; corruption: number; fullscreen: boolean; intensity: number; silent: boolean }

import { setTrackMuted, setTrackVolume, unlockMusic } from './music';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let musicDry: GainNode | null = null;
let musicWet: GainNode | null = null;
let sfxBus: GainNode | null = null;
let reverb: ConvolverNode | null = null;
let musicOn = true;
let extMuted = false;
let recorded = false;   // un brano registrato sta suonando: la partitura generativa tace   // la piattaforma (pubblicità, scheda nascosta, pausa) chiede il silenzio
let sfxOn = true;
let musicVol = 0.55;
let sched: number | null = null;
let heartTimer: number | null = null;
let nextChordAt = 0;
let chordIdx = 0;
let mood: Mood = { scene: 'menu', root: 55, corruption: 0, fullscreen: false, intensity: 0, silent: false };

// D = 146.83 Hz. Le progressioni sono in semitoni rispetto alla tonica.
const TONIC = 146.83;
type Chord = { root: number; minor: boolean };
const PROGRESSIONS: Record<Scene, { chords: Chord[]; secs: number; tonic: number }> = {
  menu: { chords: [{ root: 0, minor: true }, { root: -4, minor: false }, { root: 3, minor: false }, { root: -2, minor: false }], secs: 7, tonic: 0 },
  village: { chords: [{ root: 0, minor: true }, { root: -4, minor: false }, { root: 3, minor: false }, { root: -2, minor: false }, { root: 0, minor: true }, { root: 5, minor: true }, { root: -4, minor: false }, { root: -5, minor: false }], secs: 6.5, tonic: 0 },
  delve: { chords: [{ root: 0, minor: true }, { root: 1, minor: false }, { root: -4, minor: false }, { root: -5, minor: true }], secs: 8, tonic: -5 },
  combat: { chords: [{ root: 0, minor: true }, { root: -4, minor: false }, { root: -2, minor: false }, { root: -5, minor: true }], secs: 3.2, tonic: -2 },
  boss: { chords: [{ root: 0, minor: true }, { root: 1, minor: false }, { root: 0, minor: true }, { root: 6, minor: false }], secs: 3.2, tonic: -3 },
};
const SCALE = [0, 2, 3, 5, 7, 8, 10, 12, 14, 15];
const hz = (semi: number, base = TONIC) => base * Math.pow(2, semi / 12);

export function initAudio() {
  unlockMusic();
  if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return; }
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3;
    master = ctx.createGain(); master.gain.value = extMuted ? 0 : 0.8;
    master.connect(comp); comp.connect(ctx.destination);
    reverb = ctx.createConvolver(); reverb.buffer = impulse(ctx, 4.2, 2.6);
    musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? musicVol : 0;
    musicDry = ctx.createGain(); musicDry.gain.value = 0.55;
    musicWet = ctx.createGain(); musicWet.gain.value = 0.75;
    musicDry.connect(musicBus); musicWet.connect(reverb); reverb.connect(musicBus);
    musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = sfxOn ? 0.5 : 0; sfxBus.connect(master);
    nextChordAt = ctx.currentTime + 0.2;
    sched = window.setInterval(schedule, 200);
  } catch {
    ctx = null;
  }
}

function impulse(c: AudioContext, secs: number, decay: number) {
  const len = Math.floor(c.sampleRate * secs);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

/** Silenzio imposto dalla piattaforma: azzera il volume generale e sospende l'audio. */
export function setExternalMute(on: boolean) {
  extMuted = on;
  setTrackMuted(on);
  if (!ctx || !master) return;
  master.gain.setTargetAtTime(on ? 0 : 0.8, ctx.currentTime, 0.05);
  if (on) ctx.suspend().catch(() => {}); else ctx.resume().catch(() => {});
}

export function setMusic(on: boolean) {
  musicOn = on;
  applyMusicGain();
}
export function setMusicVolume(v: number) {
  musicVol = Math.max(0, Math.min(1, v));
  applyMusicGain();
}
function applyMusicGain() {
  if (musicBus && ctx) musicBus.gain.setTargetAtTime(musicOn && !mood.silent && !recorded ? musicVol : 0, ctx.currentTime, 0.6);
  setTrackVolume(musicVol, musicOn && !mood.silent);
}
export function setRecorded(r: boolean) { recorded = r; applyMusicGain(); }
export function setSfx(on: boolean) {
  sfxOn = on;
  if (sfxBus && ctx) sfxBus.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, 0.05);
}

export function setMood(m: Partial<Mood>) {
  const sceneChanged = m.scene && m.scene !== mood.scene;
  mood = { ...mood, ...m };
  if (sceneChanged && ctx) { chordIdx = 0; nextChordAt = Math.max(ctx.currentTime + 0.3, Math.min(nextChordAt, ctx.currentTime + 1.5)); }
  applyMusicGain();
}

// ---------------- strumenti ----------------
function out(node: AudioNode, wet = 1) {
  if (!ctx || !musicDry || !musicWet) return;
  node.connect(musicDry);
  if (wet > 0) { const g = ctx.createGain(); g.gain.value = wet; node.connect(g); g.connect(musicWet); }
}
function panNode(p: number): AudioNode {
  if (!ctx) throw new Error();
  if ((ctx as any).createStereoPanner) { const n = ctx.createStereoPanner(); n.pan.value = p; return n; }
  return ctx.createGain();
}

// Archi: due oscillatori leggermente scordati, filtro morbido, attacco lento
function strings(freqs: number[], t: number, dur: number, vol = 0.03, bright = 900) {
  if (!ctx) return;
  const detune = mood.corruption > 55 ? 18 + mood.corruption / 5 : 6;
  for (const f of freqs) {
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = bright; lp.Q.value = 0.3;
    for (const [type, cents] of [['sawtooth', -detune], ['triangle', detune]] as const) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = cents;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 4.5 + Math.random(); const lg = ctx.createGain(); lg.gain.value = 3;
      lfo.connect(lg); lg.connect(o.detune);
      o.connect(lp); o.start(t); o.stop(t + dur + 2.5); lfo.start(t); lfo.stop(t + dur + 2.5);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(2, dur * 0.4));
    g.gain.setValueAtTime(vol, t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 2.4);
    const p = panNode((Math.random() - 0.5) * 0.7);
    lp.connect(g); g.connect(p); out(p, 0.9);
  }
}

// Arpa: pizzico con armonica e decadimento naturale
function harp(f: number, t: number, vol = 0.07) {
  if (!ctx) return;
  const g = ctx.createGain();
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(4200, t); lp.frequency.exponentialRampToValueAtTime(900, t + 1.5);
  [1, 2, 3].forEach((h, i) => {
    const o = ctx!.createOscillator(); o.type = i === 0 ? 'triangle' : 'sine'; o.frequency.value = f * h;
    const hg = ctx!.createGain(); hg.gain.value = [1, 0.35, 0.12][i];
    o.connect(hg); hg.connect(lp); o.start(t); o.stop(t + 3.2);
  });
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
  const p = panNode((Math.random() - 0.5) * 1.2);
  lp.connect(g); g.connect(p); out(p, 0.8);
}

// Campana: parziali inarmoniche (suono di chiesa lontana)
function bell(f: number, t: number, vol = 0.035) {
  if (!ctx) return;
  [[1, 1], [2.76, 0.5], [5.4, 0.25], [0.5, 0.4]].forEach(([r, a]) => {
    const o = ctx!.createOscillator(); o.type = 'sine'; o.frequency.value = f * r;
    const g = ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * a, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 5 / Math.sqrt(r));
    o.connect(g); out(g, 1.2); o.start(t); o.stop(t + 6);
  });
}

// Coro: vocale "ah" con formanti
function choir(freqs: number[], t: number, dur: number, vol = 0.012) {
  if (!ctx) return;
  for (const f of freqs) {
    const src = ctx.createOscillator(); src.type = 'sawtooth'; src.frequency.value = f;
    const vib = ctx.createOscillator(); vib.frequency.value = 5; const vg = ctx.createGain(); vg.gain.value = 4;
    vib.connect(vg); vg.connect(src.detune);
    const g = ctx.createGain();
    [700, 1150, 2600].forEach((ff, i) => {
      const bp = ctx!.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = ff; bp.Q.value = 9;
      const fg = ctx!.createGain(); fg.gain.value = [1, 0.6, 0.25][i];
      src.connect(bp); bp.connect(fg); fg.connect(g);
    });
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * 6, t + dur * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.5);
    const p = panNode((Math.random() - 0.5) * 1.4);
    g.connect(p); out(p, 1.3);
    src.start(t); src.stop(t + dur + 2); vib.start(t); vib.stop(t + dur + 2);
  }
}

// Timpano / tamburo di guerra
function drum(t: number, vol = 0.22, low = 55) {
  if (!ctx) return;
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(low * 1.8, t); o.frequency.exponentialRampToValueAtTime(low, t + 0.12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
  o.connect(g); out(g, 0.35); o.start(t); o.stop(t + 0.8);
  noiseBurst(t, 0.08, vol * 0.4, 180);
}
function noiseBurst(t: number, dur: number, vol: number, freq: number, dest: 'music' | 'sfx' = 'music', pan = 0) {
  if (!ctx) return;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = ctx.createBufferSource(); s.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = dest === 'music' ? 'lowpass' : 'bandpass'; f.frequency.value = freq; f.Q.value = 2;
  const g = ctx.createGain(); g.gain.value = vol;
  const p = panNode(pan);
  s.connect(f); f.connect(g); g.connect(p);
  if (dest === 'music') out(p, 0.5); else if (sfxBus) p.connect(sfxBus);
  s.start(t);
}

// ---------------- compositore ----------------
function schedule() {
  if (!ctx || !musicOn || mood.silent || recorded || ctx.state !== 'running') return;
  while (nextChordAt < ctx.currentTime + 0.6) {
    playChord(nextChordAt);
    nextChordAt += PROGRESSIONS[mood.scene].secs;
  }
}

function playChord(t: number) {
  const P = PROGRESSIONS[mood.scene];
  const ch = P.chords[chordIdx % P.chords.length];
  const bar = chordIdx;
  chordIdx++;
  const base = TONIC * Math.pow(2, (P.tonic) / 12) * (mood.root < 50 ? 0.94 : 1);
  const third = ch.minor ? 3 : 4;
  const tones = [ch.root, ch.root + third, ch.root + 7];
  const dur = P.secs;
  const corrupt = mood.corruption > 60;

  // basso di archi + accordo
  strings([hz(ch.root - 12, base)], t, dur, mood.scene === 'combat' || mood.scene === 'boss' ? 0.03 : 0.022, 500);
  strings(tones.map(x => hz(x, base)), t, dur, 0.012, mood.scene === 'village' ? 1100 : 800);
  if (corrupt) strings([hz(ch.root + 6, base)], t + dur * 0.3, dur * 0.6, 0.008, 700); // tritono della corruzione

  if (mood.scene === 'menu' || mood.scene === 'village') {
    // arpa: arpeggi lenti, a volte una frase melodica
    const steps = 6;
    const pattern = bar % 4 === 3 ? [0, 1, 2, 3, 4, 5] : [0, 2, 4];
    for (const i of pattern) {
      if (Math.random() < 0.18) continue;
      const deg = tones[i % 3] + (i >= 3 ? 12 : 0) + 12;
      harp(hz(deg, base), t + (i * dur) / steps + Math.random() * 0.05, 0.05);
    }
    if (bar % 2 === 1 && Math.random() < 0.7) {
      // melodia: tre note della scala sopra l'accordo
      let note = SCALE[Math.floor(Math.random() * 5) + 2] + 12;
      for (let k = 0; k < 3; k++) {
        harp(hz(note, base), t + dur * 0.55 + k * 0.55, 0.045);
        note += [-2, -1, 2, 3][Math.floor(Math.random() * 4)];
      }
    }
    if (bar % 8 === 0) bell(hz(ch.root + 12, base), t + 0.5, 0.03);
  } else if (mood.scene === 'delve') {
    // dungeon: campane lontane, gocce d'arpa, coro basso
    if (Math.random() < 0.6) bell(hz(tones[Math.floor(Math.random() * 3)] + 12, base), t + Math.random() * dur * 0.6, 0.025);
    for (let k = 0; k < 3; k++) if (Math.random() < 0.55) harp(hz(SCALE[Math.floor(Math.random() * SCALE.length)] + 12, base), t + 1 + Math.random() * (dur - 2), 0.035);
    if (bar % 2 === 0) choir([hz(ch.root, base), hz(ch.root + 7, base)], t, dur, 0.008);
  } else {
    // combattimento / boss: tamburi e ostinato
    const beats = 4;
    const beat = dur / beats;
    for (let b = 0; b < beats; b++) {
      drum(t + b * beat, b === 0 ? 0.26 : 0.14, mood.scene === 'boss' ? 46 : 55);
      if (mood.scene === 'boss' || b % 2 === 1) drum(t + b * beat + beat / 2, 0.07, 70);
      harp(hz(tones[b % 3], base), t + b * beat, 0.04);
      harp(hz(tones[(b + 1) % 3] + 12, base), t + b * beat + beat / 2, 0.03);
    }
    if (mood.scene === 'boss') choir([hz(ch.root, base), hz(ch.root + third, base), hz(ch.root + 7, base)], t, dur, 0.012);
  }

  // Rito: sussurri e coro
  if (mood.fullscreen) {
    choir([hz(ch.root + 12, base), hz(ch.root + 19, base)], t + 0.5, dur * 0.8, 0.007);
    for (let k = 0; k < 3; k++) noiseBurst(t + Math.random() * dur, 0.3, 0.02, 1200 + Math.random() * 1500, 'music', Math.random() * 2 - 1);
  }
}

// ---------------- effetti sonori ----------------
function note(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, pan = 0) {
  if (!ctx || !sfxBus) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const p = panNode(pan);
  o.connect(g); g.connect(p); p.connect(sfxBus);
  if (reverb && musicWet) { const w = ctx.createGain(); w.gain.value = 0.25; g.connect(w); w.connect(reverb); }
  o.start(t); o.stop(t + dur + 0.05);
}
const nz = (dur: number, vol: number, freq: number, delay = 0) => { if (ctx) noiseBurst(ctx.currentTime + delay, dur, vol, freq, 'sfx'); };

export const sfx = {
  click: () => note(880, 0.05, 'sine', 0.03),
  gather: () => { nz(0.06, 0.12, 900 + Math.random() * 600); note(260 + Math.random() * 60, 0.08, 'triangle', 0.04); },
  coin: () => { note(1319, 0.12, 'sine', 0.05); note(1760, 0.18, 'sine', 0.04, 0.06); },
  build: () => { nz(0.12, 0.25, 300); note(196, 0.25, 'triangle', 0.06, 0.04); note(294, 0.3, 'sine', 0.04, 0.12); },
  attack: () => { nz(0.14, 0.3, 2500); note(150, 0.14, 'triangle', 0.07); },
  hit: () => { nz(0.1, 0.25, 500); note(85, 0.18, 'sine', 0.1); },
  heal: () => [587, 740, 880].forEach((f, i) => note(f, 0.5, 'sine', 0.05, i * 0.07)),
  resonance: () => [440, 659, 880, 1319].forEach((f, i) => note(f, 0.7, 'sine', 0.035, i * 0.09)),
  dissonance: () => { note(233, 0.6, 'triangle', 0.05); note(247, 0.6, 'triangle', 0.05); },
  // eco inversa: le note crescono invece di spegnersi
  echo: () => {
    if (!ctx || !sfxBus) return;
    const t = ctx.currentTime;
    [294, 440, 587, 880].forEach((f, i) => {
      const o = ctx!.createOscillator(); const g = ctx!.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + i * 0.1); g.gain.exponentialRampToValueAtTime(0.07, t + 0.9 + i * 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.15 + i * 0.1);
      o.connect(g); g.connect(sfxBus!); if (reverb) g.connect(reverb); o.start(t + i * 0.1); o.stop(t + 1.3 + i * 0.1);
    });
  },
  chain: () => { for (let i = 0; i < 4; i++) nz(0.05, 0.18, 3500 + Math.random() * 1500, i * 0.07); },
  victory: () => [587, 740, 880, 1175].forEach((f, i) => note(f, 0.6, 'triangle', 0.05, i * 0.13)),
  defeat: () => [440, 349, 294, 220].forEach((f, i) => note(f, 0.8, 'triangle', 0.05, i * 0.22)),
  door: () => { nz(0.5, 0.12, 140); note(73, 0.8, 'sine', 0.08); },
  fish: () => { nz(0.25, 0.1, 2200); note(988, 0.15, 'sine', 0.04); },
  threat: () => [196, 185, 196, 185].forEach((f, i) => note(f, 0.25, 'triangle', 0.05, i * 0.15)),
  forge: () => { nz(0.06, 0.35, 3000); note(2093, 0.4, 'sine', 0.03); note(1568, 0.5, 'sine', 0.02, 0.02); },
  unlock: () => [587, 880, 1175, 1760].forEach((f, i) => note(f, 0.9, 'sine', 0.035, i * 0.11)),
  leitmotif: (notes: number[]) => notes.forEach((f, i) => note(f, 0.5, 'triangle', 0.045, i * 0.2)),
};

// Battito cardiaco durante le scelte morali
export function heartbeat(on: boolean) {
  if (heartTimer) { window.clearInterval(heartTimer); heartTimer = null; }
  if (!on) return;
  const beat = () => { note(55, 0.14, 'sine', 0.14); note(50, 0.16, 'sine', 0.1, 0.2); };
  beat();
  heartTimer = window.setInterval(beat, 1150);
}

export function stopMusicScheduler() {
  if (sched) window.clearInterval(sched);
  sched = null;
}
