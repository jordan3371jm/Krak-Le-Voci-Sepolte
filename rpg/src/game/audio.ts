// Audio procedurale (WebAudio) — l'audio è un sistema di gioco (GDD §11.3, §20):
// drone che si scorda con la corruzione, sussurri nel Rito (fullscreen), silenzio meccanico
// con Dissonanza massima, battito cardiaco nelle scelte morali, catene per le promesse.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
let musicOn = true;
let sfxOn = true;
let drone: { o1: OscillatorNode; o2: OscillatorNode; lp: BiquadFilterNode; g: GainNode } | null = null;
let arpTimer: number | null = null;
let whisperTimer: number | null = null;
let heartTimer: number | null = null;

interface Mood { root: number; corruption: number; fullscreen: boolean; intensity: number; silent: boolean }
let mood: Mood = { root: 55, corruption: 0, fullscreen: false, intensity: 0, silent: false };

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return; }
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? 0.35 : 0; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = sfxOn ? 0.6 : 0; sfxBus.connect(master);
    startDrone();
    startArp();
  } catch {
    ctx = null;
  }
}

export function setMusic(on: boolean) {
  musicOn = on;
  if (musicBus && ctx) musicBus.gain.setTargetAtTime(on && !mood.silent ? 0.35 : 0, ctx.currentTime, 0.4);
}
export function setSfx(on: boolean) {
  sfxOn = on;
  if (sfxBus && ctx) sfxBus.gain.setTargetAtTime(on ? 0.6 : 0, ctx.currentTime, 0.05);
}

function startDrone() {
  if (!ctx || !musicBus) return;
  const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400;
  const g = ctx.createGain(); g.gain.value = 0.12;
  o1.type = 'sawtooth'; o2.type = 'sine';
  o1.frequency.value = mood.root; o2.frequency.value = mood.root * 1.5;
  o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(musicBus);
  o1.start(); o2.start();
  drone = { o1, o2, lp, g };
}

const SCALE = [0, 3, 5, 7, 10, 12, 15];
function startArp() {
  if (arpTimer) window.clearInterval(arpTimer);
  const step = () => {
    if (!ctx || !musicBus || mood.silent) return;
    const deg = SCALE[Math.floor(Math.random() * SCALE.length)];
    const f = mood.root * 4 * Math.pow(2, deg / 12) * (mood.corruption > 60 && Math.random() < 0.3 ? 1.06 : 1);
    note(f, 1.6, 'triangle', 0.05 + mood.intensity * 0.02, musicBus, (Math.random() - 0.5) * 0.8);
    if (mood.intensity > 0.5 && Math.random() < 0.5) note(mood.root * 2, 0.4, 'square', 0.03, musicBus);
  };
  arpTimer = window.setInterval(step, 1300);
}

export function setMood(m: Partial<Mood>) {
  mood = { ...mood, ...m };
  if (!ctx || !drone) return;
  const t = ctx.currentTime;
  const detune = mood.corruption / 100 * 35;
  drone.o1.frequency.setTargetAtTime(mood.root, t, 1.5);
  drone.o2.frequency.setTargetAtTime(mood.root * 1.5, t, 1.5);
  drone.o2.detune.setTargetAtTime(detune, t, 2);
  drone.lp.frequency.setTargetAtTime(300 + mood.intensity * 600 + mood.corruption * 4, t, 1);
  if (musicBus) musicBus.gain.setTargetAtTime(musicOn && !mood.silent ? 0.35 : 0, t, 0.8);
  // Rito: sussurri che solo il fullscreen fa emergere
  if (mood.fullscreen && !whisperTimer) whisperTimer = window.setInterval(whisper, 7000);
  if (!mood.fullscreen && whisperTimer) { window.clearInterval(whisperTimer); whisperTimer = null; }
}

function note(freq: number, dur: number, type: OscillatorType, vol: number, bus: GainNode | null = sfxBus, pan = 0, delay = 0) {
  if (!ctx || !bus) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node: AudioNode = g;
  if (pan && (ctx as any).createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
  o.connect(g); node.connect(bus);
  o.start(t); o.stop(t + dur + 0.05);
}

function noise(dur: number, vol: number, freq: number, pan = 0, bus: GainNode | null = sfxBus) {
  if (!ctx || !bus) return;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 3;
  const g = ctx.createGain(); g.gain.value = vol;
  src.connect(bp); bp.connect(g);
  let node: AudioNode = g;
  if ((ctx as any).createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
  node.connect(bus);
  src.start();
}

function whisper() {
  if (!ctx || !musicOn) return;
  for (let i = 0; i < 3; i++) setTimeout(() => noise(0.35, 0.08, 900 + Math.random() * 1800, Math.random() * 2 - 1, musicBus), i * 140);
}

// ---------------- effetti ----------------
export const sfx = {
  click: () => note(660, 0.06, 'triangle', 0.05),
  gather: () => note(300 + Math.random() * 80, 0.08, 'triangle', 0.06),
  coin: () => { note(988, 0.08, 'square', 0.04); note(1319, 0.12, 'square', 0.04, sfxBus, 0, 0.06); },
  build: () => { noise(0.15, 0.2, 200); note(220, 0.2, 'square', 0.05, sfxBus, 0, 0.05); },
  attack: () => { noise(0.12, 0.3, 1200); note(140, 0.12, 'sawtooth', 0.08); },
  hit: () => { noise(0.1, 0.25, 400); note(90, 0.15, 'square', 0.08); },
  heal: () => [523, 659, 784].forEach((f, i) => note(f, 0.3, 'sine', 0.07, sfxBus, 0, i * 0.08)),
  resonance: () => [440, 660, 880].forEach((f, i) => note(f, 0.4, 'sine', 0.06, sfxBus, 0, i * 0.1)),
  dissonance: () => { note(150, 0.4, 'sawtooth', 0.08); note(159, 0.4, 'sawtooth', 0.08); },
  // eco inversa: crescendo invece di decadimento
  echo: () => {
    if (!ctx || !sfxBus) return;
    const t = ctx.currentTime;
    [220, 330, 440, 660].forEach((f, i) => {
      const o = ctx!.createOscillator(); const g = ctx!.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + i * 0.12); g.gain.exponentialRampToValueAtTime(0.09, t + 0.8 + i * 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0 + i * 0.12);
      o.connect(g); g.connect(sfxBus!); o.start(t + i * 0.12); o.stop(t + 1.1 + i * 0.12);
    });
  },
  chain: () => { for (let i = 0; i < 4; i++) setTimeout(() => noise(0.06, 0.25, 3000 + Math.random() * 1500), i * 70); },
  victory: () => [523, 659, 784, 1047].forEach((f, i) => note(f, 0.35, 'triangle', 0.07, sfxBus, 0, i * 0.12)),
  defeat: () => [440, 330, 220, 110].forEach((f, i) => note(f, 0.5, 'sawtooth', 0.06, sfxBus, 0, i * 0.18)),
  door: () => { noise(0.4, 0.15, 120); note(70, 0.5, 'sine', 0.1); },
  fish: () => { noise(0.2, 0.15, 2500); note(880, 0.1, 'sine', 0.05); },
  threat: () => [196, 185, 196, 185].forEach((f, i) => note(f, 0.2, 'square', 0.05, sfxBus, 0, i * 0.15)),
  forge: () => { noise(0.08, 0.35, 2500); note(1800, 0.25, 'triangle', 0.04); },
  leitmotif: (notes: number[]) => notes.forEach((f, i) => note(f, 0.35, 'triangle', 0.06, sfxBus, 0, i * 0.18)),
};

// Battito cardiaco durante le scelte morali
export function heartbeat(on: boolean) {
  if (heartTimer) { window.clearInterval(heartTimer); heartTimer = null; }
  if (!on) return;
  const beat = () => { note(55, 0.12, 'sine', 0.18); note(50, 0.14, 'sine', 0.14, sfxBus, 0, 0.18); };
  beat();
  heartTimer = window.setInterval(beat, 1100);
}
