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
// Tutti gli elementi audio vivi (brano attuale, brani in dissolvenza, effetti):
// quando arriva il silenzio (pulsante muto, scheda nascosta, pubblicità) si fermano tutti.
const live = new Set<HTMLAudioElement>();
const fades = new WeakMap<HTMLAudioElement, number>();
const hidden = () => typeof document !== 'undefined' && document.hidden;

function kill(el: HTMLAudioElement) { try { el.pause(); el.removeAttribute('src'); el.load(); } catch { /* */ } live.delete(el); }

// Dissolvenza a tempo (non requestAnimationFrame, che si ferma nelle schede nascoste);
// una nuova dissolvenza sullo stesso elemento annulla la precedente.
function fade(el: HTMLAudioElement, to: number, ms: number, done?: () => void) {
  const prev = fades.get(el); if (prev) window.clearInterval(prev);
  if (ms <= 0 || hidden() || muted) { el.volume = Math.max(0, Math.min(1, to)); fades.delete(el); done?.(); return; }
  const from = el.volume, t0 = performance.now();
  const id = window.setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
    if (k >= 1) { window.clearInterval(id); fades.delete(el); done?.(); }
  }, 40);
  fades.set(el, id);
}

/** Il brano attuale suona solo se c'è qualcosa da sentire: su iOS il volume 0 viene ignorato, quindi si mette in pausa. */
function sync(fadeMs = 600) {
  if (!current) return;
  const el = current.el;
  if (target() <= 0 || !unlocked) { const f = fades.get(el); if (f) { window.clearInterval(f); fades.delete(el); } el.volume = 0; el.pause(); return; }
  if (el.paused) { el.volume = 0; el.play().then(() => { if (current?.el === el) fade(el, target(), fadeMs); }).catch(() => { /* il browser vuole un gesto */ }); }
  else fade(el, target(), fadeMs);
}

/** Vero se esiste un brano registrato per questa scena (la partitura generativa allora tace). */
export const hasTrack = (name: string | null) => !!name && !!TRACKS[name];

export function playTrack(name: string | null) {
  wanted = name;
  if (!unlocked) return;
  const src = name ? TRACKS[name] : undefined;
  if (current && current.name === name) { sync(); return; }
  const old = current;
  if (old) { if (muted || hidden() || old.el.paused) kill(old.el); else fade(old.el, 0, 1500, () => kill(old.el)); }
  current = null;
  if (!src || !name) return;
  const el = new Audio(src);
  el.loop = true; el.volume = 0;
  live.add(el);
  current = { name, el };
  sync(1800);
}

/** Il primo gesto del giocatore sblocca l'audio del browser. */
export function unlockMusic() { if (unlocked) { sync(); return; } unlocked = true; playTrack(wanted); }
export function setTrackVolume(v: number, isOn: boolean) { vol = v; on = isOn; sync(400); }
export function setTrackMuted(m: boolean) {
  if (muted === m) return;
  muted = m;
  if (m) { for (const el of [...live]) { if (current?.el === el) { el.pause(); } else kill(el); } return; }
  sync(500);
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
  live.add(el);
  // abbassa la musica mentre suona l'effetto
  const c = current && !current.el.paused ? current.el : null;
  if (c) fade(c, target() * 0.35, 200);
  el.onended = () => { live.delete(el); if (c && current?.el === c && !muted) fade(c, target(), 900); };
  el.play().catch(() => live.delete(el));
}

/** Prova a far partire la musica subito (riesce se il browser lo consente). */
export function tryAutoplay() { if (!unlocked) { unlocked = true; playTrack(wanted); } }
/** Stato attuale del silenzio (per i test e per l'interfaccia). */
export const musicMuted = () => muted;
