/// <reference types="vite/client" />
// ============================================================
// Colonna sonora registrata: un brano per scena, in loop, con dissolvenza.
// Se per una scena non c'è un file, suona la partitura generativa (audio.ts).
// ============================================================
const files = import.meta.glob('../assets/music/*.mp3', { eager: true, import: 'default' }) as Record<string, string>;
export const TRACKS: Record<string, string> = {};
for (const [p, url] of Object.entries(files)) TRACKS[p.split('/').pop()!.replace('.mp3', '')] = url;

let current: { name: string; el: HTMLAudioElement } | null = null;
let vol = 0.55, on = true, muted = false, unlocked = false, wanted: string | null = null;
const target = () => (on && !muted ? vol : 0);

function fade(el: HTMLAudioElement, to: number, ms: number, done?: () => void) {
  const from = el.volume, t0 = performance.now();
  const step = () => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
    if (k < 1) requestAnimationFrame(step); else done?.();
  };
  requestAnimationFrame(step);
}

/** Vero se esiste un brano registrato per questa scena (la partitura generativa allora tace). */
export const hasTrack = (name: string | null) => !!name && !!TRACKS[name];

export function playTrack(name: string | null) {
  wanted = name;
  if (!unlocked) return;
  const src = name ? TRACKS[name] : undefined;
  if (current && current.name === name) return;
  const old = current;
  if (old) fade(old.el, 0, 1500, () => { old.el.pause(); old.el.src = ''; });
  current = null;
  if (!src || !name) return;
  const el = new Audio(src);
  el.loop = true; el.volume = 0;
  current = { name, el };
  el.play().then(() => fade(el, target(), 1800)).catch(() => { if (current?.el === el) current = null; unlocked = false; });
}

/** Il primo gesto del giocatore sblocca l'audio del browser. */
export function unlockMusic() { if (unlocked) return; unlocked = true; playTrack(wanted); }
export function setTrackVolume(v: number, isOn: boolean) { vol = v; on = isOn; if (current) current.el.volume = target(); }
export function setTrackMuted(m: boolean) {
  muted = m;
  if (!current) return;
  if (m) current.el.pause(); else { current.el.volume = target(); current.el.play().catch(() => {}); }
}

// Effetti brevi registrati (vittoria, sconfitta, livello, Fardello, presagio, Virtù, Rottura)
const sfxFiles = import.meta.glob('../assets/sfx/*.mp3', { eager: true, import: 'default' }) as Record<string, string>;
const CLIPS: Record<string, string> = {};
for (const [p, url] of Object.entries(sfxFiles)) CLIPS[p.split('/').pop()!.replace('.mp3', '')] = url;
let clipsOn = true;
export function setClipsOn(v: boolean) { clipsOn = v; }
export function playClip(name: string, volume = 0.8) {
  const src = CLIPS[name];
  if (!src || !clipsOn || muted || !unlocked) return;
  const el = new Audio(src); el.volume = volume;
  // abbassa la musica mentre suona l'effetto
  if (current) { const c = current.el; fade(c, target() * 0.35, 200); el.onended = () => { if (current?.el === c) fade(c, target(), 900); }; }
  el.play().catch(() => {});
}

/** Prova a far partire la musica subito (riesce se il browser lo consente). */
export function tryAutoplay() { if (!unlocked) { unlocked = true; playTrack(wanted); } }
