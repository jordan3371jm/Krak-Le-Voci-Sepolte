// ============================================================
// LA VEGLIA — modalità cooperativa (1–4 portatori, bot nei posti vuoti).
// Attorno all'ultimo fuoco di Hondovalle, i portatori resistono alle
// ondate dei Sepolti. Ogni round tutti scelgono un'azione in segreto;
// l'host risolve il round. Ogni 3 ondate Krak sussurra un patto:
// si vota, e la maggioranza decide. Motore puro: niente rete qui.
// ============================================================
import { t as T } from '../i18n';
import { mulberry32 } from './rng';

export type VAction = 'strike' | 'guard' | 'tend' | 'rite';
export type VClass = 'custode' | 'penitente' | 'lama' | 'veggente';
export interface VPlayer { id: string; name: string; cls: VClass; bot: boolean; choice: VAction | null; vote: number | null; dmg: number }
export interface VEnemy { uid: number; kind: string; hp: number; max: number; atk: number }
export interface VPact { id: string; votes: Record<string, number> }
export interface VigilState {
  v: 1; seed: number; wave: number; round: number;
  phase: 'lobby' | 'choose' | 'whisper' | 'over';
  fire: number; fireMax: number; resonance: number;
  players: VPlayer[]; enemies: VEnemy[]; uidNext: number;
  deadline: number; log: string[]; pacts: string[]; offer: string[] | null;
  mods: { dmg: number; enemyAtk: number; extraEnemies: number; tend: number; riteGain: number };
}

export const ROUND_MS = 12_000, WHISPER_MS = 12_000;

export const ENEMY_KINDS: Record<string, { name: () => string; art: string; hp: number; atk: number }> = {
  eco: { name: () => T('Eco Muta'), art: 'eco_muta', hp: 22, atk: 5 },
  scheletro: { name: () => T('Ossa Rancorose'), art: 'scheletro', hp: 30, atk: 6 },
  annegato: { name: () => T('Annegato del Culto'), art: 'annegato', hp: 38, atk: 7 },
  spettro: { name: () => T('Spettro del Rimpianto'), art: 'spettro', hp: 26, atk: 9 },
  sanguisuga: { name: () => T('Sanguisuga Madre'), art: 'sanguisuga', hp: 46, atk: 6 },
  giudice: { name: () => T('Giudice Cieco'), art: 'giudice_cieco', hp: 70, atk: 11 },
  colosso: { name: () => T('Araldo del Colosso'), art: 'colosso', hp: 160, atk: 16 },
};

export const CLASS_V: Record<VClass, { strike: number; guard: number; tend: number; rite: number }> = {
  custode: { strike: 14, guard: 8, tend: 8, rite: 20 },
  penitente: { strike: 10, guard: 14, tend: 9, rite: 18 },
  lama: { strike: 18, guard: 6, tend: 6, rite: 18 },
  veggente: { strike: 11, guard: 7, tend: 11, rite: 30 },
};

export const PACTS: Record<string, { name: () => string; desc: () => string; apply: (s: VigilState) => void }> = {
  sangue: { name: () => T('Patto del Sangue'), desc: () => T('Colpi +40%, ma il fuoco perde 20 di massimo.'), apply: s => { s.mods.dmg += 0.4; s.fireMax = Math.max(40, s.fireMax - 20); s.fire = Math.min(s.fire, s.fireMax); } },
  silenzio: { name: () => T('Veglia Silenziosa'), desc: () => T('Il fuoco torna pieno, ma ogni ondata porta un Sepolto in più.'), apply: s => { s.fire = s.fireMax; s.mods.extraEnemies += 1; } },
  cenere: { name: () => T('Promessa di Cenere'), desc: () => T('Il Rito si carica il doppio, ma i nemici colpiscono +20%.'), apply: s => { s.mods.riteGain += 1; s.mods.enemyAtk += 0.2; } },
  radici: { name: () => T('Radici della Valle'), desc: () => T('Ravvivare vale il doppio, ma i colpi fanno −20%.'), apply: s => { s.mods.tend += 1; s.mods.dmg -= 0.2; } },
  ferro: { name: () => T('Voto di Ferro'), desc: () => T('Fuoco massimo +30, ma il Rito si svuota.'), apply: s => { s.fireMax += 30; s.fire += 30; s.resonance = 0; } },
  fame: { name: () => T('Fame di Krak'), desc: () => T('I nemici colpiscono −25%, ma il fuoco perde metà della vita.'), apply: s => { s.mods.enemyAtk -= 0.25; s.fire = Math.max(1, Math.floor(s.fire / 2)); } },
};

export function newVigil(seed = Math.floor(Math.random() * 1e9)): VigilState {
  return { v: 1, seed, wave: 0, round: 0, phase: 'lobby', fire: 100, fireMax: 100, resonance: 0, players: [], enemies: [], uidNext: 1, deadline: 0, log: [], pacts: [], offer: null,
    mods: { dmg: 0, enemyAtk: 0, extraEnemies: 0, tend: 0, riteGain: 0 } };
}

const BOT_NAMES = ['Orsola', 'Garrik', 'Mira', 'Brann', 'Lyra', 'Teodora', 'Ilyas', 'Kael'];
const CLASSES: VClass[] = ['custode', 'penitente', 'lama', 'veggente'];
export function addPlayer(s: VigilState, id: string, name: string, cls: VClass, bot = false) {
  if (s.players.some(p => p.id === id) || s.players.length >= 4) return;
  s.players.push({ id, name: name.slice(0, 16) || T('Portatore'), cls, bot, choice: null, vote: null, dmg: 0 });
}
export function removePlayer(s: VigilState, id: string) {
  const p = s.players.find(x => x.id === id);
  if (!p) return;
  // chi se ne va lascia il posto a un'eco che combatte al suo posto
  p.bot = true; p.name = T('Eco di {name}', { name: p.name });
}
export function fillBots(s: VigilState) {
  const r = mulberry32(s.seed + s.players.length);
  for (let i = 0; s.players.length < 4; i++) {
    const n = BOT_NAMES.filter(b => !s.players.some(p => p.name === b))[0] || `Eco ${i + 1}`;
    addPlayer(s, `bot${s.players.length}`, n, CLASSES[Math.floor(r() * 4)], true);
  }
}

function spawnWave(s: VigilState) {
  s.wave++;
  const r = mulberry32(s.seed * 31 + s.wave);
  const kinds = s.wave < 3 ? ['eco', 'scheletro'] : s.wave < 6 ? ['scheletro', 'annegato', 'spettro'] : s.wave < 10 ? ['annegato', 'spettro', 'sanguisuga', 'giudice'] : ['spettro', 'sanguisuga', 'giudice'];
  const n = Math.min(7, 1 + Math.floor(s.wave / 2) + s.mods.extraEnemies);
  const scale = 1 + (s.wave - 1) * 0.18;
  s.enemies = [];
  if (s.wave % 5 === 0) {
    const k = ENEMY_KINDS.colosso;
    s.enemies.push({ uid: s.uidNext++, kind: 'colosso', hp: Math.round(k.hp * scale), max: Math.round(k.hp * scale), atk: Math.round(k.atk * scale) });
  }
  for (let i = 0; i < n; i++) {
    const id = kinds[Math.floor(r() * kinds.length)]; const k = ENEMY_KINDS[id];
    const hp = Math.round(k.hp * scale);
    s.enemies.push({ uid: s.uidNext++, kind: id, hp, max: hp, atk: Math.round(k.atk * scale) });
  }
  s.log.unshift(T('Ondata {n}: i Sepolti escono dalla nebbia.', { n: s.wave }));
}

export function startVigil(s: VigilState, now: number) {
  fillBots(s);
  spawnWave(s);
  s.phase = 'choose'; s.round = 1; s.deadline = now + ROUND_MS;
}

/** I bot scelgono in modo sensato: proteggono il fuoco quando sta per spegnersi. */
export function botChoices(s: VigilState) {
  const r = mulberry32(s.seed + s.wave * 97 + s.round * 13);
  const incoming = s.enemies.reduce((a, e) => a + e.atk, 0) * (1 + s.mods.enemyAtk);
  for (const p of s.players) {
    if (!p.bot || p.choice) continue;
    const x = r();
    p.choice = s.fire < incoming * 1.6 ? (x < 0.5 ? 'guard' : 'tend') : s.resonance >= 70 && x < 0.4 ? 'rite' : x < 0.7 ? 'strike' : x < 0.85 ? 'rite' : 'guard';
  }
}

export function choose(s: VigilState, pid: string, a: VAction) {
  const p = s.players.find(x => x.id === pid);
  if (p && s.phase === 'choose') p.choice = a;
}
export function vote(s: VigilState, pid: string, i: number) {
  const p = s.players.find(x => x.id === pid);
  if (p && s.phase === 'whisper') p.vote = i;
}
export const allChosen = (s: VigilState) => s.players.every(p => p.choice);
export const allVoted = (s: VigilState) => s.players.every(p => p.vote !== null);

export function resolveRound(s: VigilState, now: number) {
  if (s.phase !== 'choose') return;
  botChoices(s);
  for (const p of s.players) if (!p.choice) p.choice = 'strike';
  let shield = 0;
  const lines: string[] = [];
  for (const p of s.players) {
    const c = CLASS_V[p.cls];
    if (p.choice === 'strike') {
      const t = s.enemies.find(e => e.hp > 0);
      if (t) { const d = Math.round(c.strike * (1 + s.mods.dmg) * (1 + s.wave * 0.05)); t.hp -= d; p.dmg += d; }
    } else if (p.choice === 'guard') shield += c.guard * (1 + s.wave * 0.06);
    else if (p.choice === 'tend') s.fire = Math.min(s.fireMax, s.fire + c.tend * (1 + s.mods.tend));
    else if (p.choice === 'rite') s.resonance += c.rite * (1 + s.mods.riteGain);
  }
  if (s.resonance >= 100) {
    s.resonance -= 100;
    const d = Math.round(30 + s.wave * 7);
    for (const e of s.enemies) if (e.hp > 0) e.hp -= d;
    lines.push(T('✨ Il Rito si compie: un\'Eco travolge tutti i Sepolti (−{d}).', { d }));
  }
  const alive = s.enemies.filter(e => e.hp > 0);
  const hit = Math.max(0, Math.round(alive.reduce((a, e) => a + e.atk, 0) * (1 + s.mods.enemyAtk) - shield));
  s.fire = Math.max(0, s.fire - hit);
  if (alive.length) lines.push(T('I Sepolti colpiscono il fuoco: −{n}.', { n: hit }));
  s.enemies = alive;
  s.log.unshift(...lines.reverse());
  s.log = s.log.slice(0, 14);
  for (const p of s.players) p.choice = null;
  s.round++;
  if (s.fire <= 0) { s.phase = 'over'; s.log.unshift(T('Il fuoco si spegne. La Veglia è finita all\'ondata {n}.', { n: s.wave })); return; }
  if (!s.enemies.length) {
    s.log.unshift(T('Ondata {n} respinta.', { n: s.wave }));
    s.fire = Math.min(s.fireMax, s.fire + 8);
    if (s.wave % 3 === 0) { offerPacts(s, now); return; }
    spawnWave(s);
  }
  s.deadline = now + ROUND_MS;
}

function offerPacts(s: VigilState, now: number) {
  const r = mulberry32(s.seed + s.wave * 7);
  const ids = Object.keys(PACTS).filter(id => !s.pacts.includes(id));
  const a = ids.splice(Math.floor(r() * ids.length), 1)[0] || 'sangue';
  const b = ids.splice(Math.floor(r() * ids.length), 1)[0] || 'silenzio';
  s.offer = [a, b];
  for (const p of s.players) p.vote = null;
  s.phase = 'whisper'; s.deadline = now + WHISPER_MS;
  s.log.unshift(T('Krak sussurra un patto. Votate.'));
}

export function resolveWhisper(s: VigilState, now: number) {
  if (s.phase !== 'whisper' || !s.offer) return;
  const r = mulberry32(s.seed + s.wave * 3);
  for (const p of s.players) if (p.vote === null) p.vote = r() < 0.5 ? 0 : 1;
  const v0 = s.players.filter(p => p.vote === 0).length, v1 = s.players.length - v0;
  const pick = s.offer[v1 > v0 ? 1 : 0];
  PACTS[pick].apply(s); s.pacts.push(pick);
  s.log.unshift(T('Patto stretto: {name}.', { name: PACTS[pick].name() }));
  s.offer = null; s.phase = 'choose';
  spawnWave(s);
  s.deadline = now + ROUND_MS;
}

/** Avanza l'orologio: chiamato solo dall'host. */
export function hostTick(s: VigilState, now: number): boolean {
  if (s.phase === 'choose') { botChoices(s); if (allChosen(s) || now >= s.deadline) { resolveRound(s, now); return true; } }
  if (s.phase === 'whisper') { for (const p of s.players) if (p.bot && p.vote === null) p.vote = Math.random() < 0.5 ? 0 : 1; if (allVoted(s) || now >= s.deadline) { resolveWhisper(s, now); return true; } }
  return false;
}
