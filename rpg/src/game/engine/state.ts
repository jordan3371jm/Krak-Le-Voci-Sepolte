import { t as T } from '../../i18n';
import type { BiomeId, Chronicle, FactionId, GameState, Loot, Resources, Toast, ValleyState } from '../types';
import { COMPANIONS, FACTION_IDS, FARDELLI } from '../data/core';
import { CONSTELLATIONS, FATE_CARDS, SANCTUARY, STARS, VALLEY_EFFECTS } from '../data/world';
import { clamp, todayKey } from '../rng';

export const SAVE_VERSION = 3;
export const MAX_LEVEL = 40;

export function emptyRes(): Resources {
  return { cenere: 0, provviste: 0, legno: 0, pietra: 0, ferro: 0, intuizione: 0 };
}
export function emptyLoot(): Loot {
  return { cenere: 0, legno: 0, pietra: 0, ferro: 0, provviste: 0, reliquie: 0, xp: 0, items: [], fragments: [] };
}

export function newGame(): GameState {
  const now = Date.now();
  const factions = {} as Record<FactionId, number>;
  FACTION_IDS.forEach(f => (factions[f] = 0));
  const biome = () => ({ best: 0, conquered: false, visits: 0, lastVisit: 0, memory: [] as string[] });
  return {
    version: SAVE_VERSION, createdAt: now, lastTick: now, lastSave: now,
    scene: 'intro', tab: 'villaggio',
    playerName: '', classId: 'custode', fardello: null, influence: 0, ascension: null, aberration: false, nameCorrupted: false,
    hero: { level: 1, xp: 0, paragon: 0, hp: 999, pledgedMaxHp: 0, equipped: {}, talents: [], talentPoints: 0, deaths: 0 },
    inventory: [], potions: 3, elixirs: {}, activeElixir: null,
    res: { cenere: 30, provviste: 10, legno: 0, pietra: 0, ferro: 0, intuizione: 3 },
    reliquie: 0,
    totals: {},
    village: { buildings: {}, upgrades: [] },
    companions: COMPANIONS.map(c => ({ id: c.id, name: c.name, icon: c.icon, role: c.role, level: 1, xp: 0, trust: 60, hp: 1, recruited: !c.recruitCost && !c.joinsByStory, inParty: !c.recruitCost && !c.joinsByStory, mission: null })),
    resonance: 0, dissonance: 0, corruption: 10,
    factions, flags: [], chronicle: [], promises: [], fragments: [],
    delve: null,
    biomes: { cimitero: biome(), paludi: biome(), torre: biome(), abisso: biome() },
    combat: null,
    stars: [],
    market: { listings: [], refreshAt: 0, history: [] },
    contracts: [],
    valley: { prosperity: 30, tension: 20, blight: 25, eclipseUntil: 0, rebirthUntil: 0 },
    world: { day: todayKey(), bossDamage: 0, bossTries: 0 },
    daily: { day: '', chest: false, missions: [], bonus: false },
    weekly: { key: '', missions: [], bonus: false },
    monthly: { key: '', missions: [], bonus: false },
    achievements: [], bestiary: {}, fish: [], bait: 5, baitAt: now,
    requests: [], requestsAt: 0,
    events: { cart: 0, deer: 0, threat: null, nextAt: now + 90_000, buffs: [], bardReadyAt: 0 },
    cycle: { n: 1, memorie: 0, memorieTotal: 0, sanctuary: {}, card: null, cardOffer: [], heirloom: null },
    legacies: [], dreams: [],
    trial: 'none', trialOutcome: null, ending: null,
    settings: { music: true, musicVolume: 0.55, sfx: true, autoBattle: false, autoPotion: 35, fastCombat: false, purifiedUntil: 0, reduceFx: false },
    fullscreen: false,
    unlocked: [], newTabs: [], codexQueue: [], tutorial: 0, tipsSeen: [], lastReport: null,
    krak: { level: 0, max: 0 }, omens: [], dailyRun: { day: '', best: 0, tries: 0, allBest: 0 }, glitchUntil: 0, lostSatchel: null,
    talk: null, quests: {},
    modal: null, toasts: [],
  };
}

// ---------------- helper narrativi/UI ----------------
let toastId = 1;
export function toast(s: GameState, text: string, kind: Toast['kind'] = 'info') {
  s.toasts.push({ id: toastId++, text, kind });
  if (s.toasts.length > 5) s.toasts.splice(0, s.toasts.length - 5);
}
export function chronicle(s: GameState, text: string, kind: Chronicle['kind'] = 'choice') {
  s.chronicle.unshift({ t: Date.now(), text, kind });
  if (s.chronicle.length > 150) s.chronicle.length = 150;
}
export function addFlag(s: GameState, f: string) {
  if (!s.flags.includes(f)) s.flags.push(f);
}
export function hasFlag(s: GameState, f: string) {
  return s.flags.includes(f);
}
export function stat(s: GameState, key: string, n = 1) {
  s.totals[key] = (s.totals[key] || 0) + n;
}
export function fmt(n: number): string {
  if (!isFinite(n)) return '∞';
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(2) + 'G';
  if (a >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (a >= 1e3) return (n / 1e3).toFixed(a >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'K';
  if (a >= 100) return Math.floor(n).toString();
  if (a >= 10) return n.toFixed(1).replace(/\.0$/, '');
  return n.toFixed(a < 1 && a > 0 ? 2 : 1).replace(/\.0+$/, '');
}
export function fmtTime(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}
export function displayName(s: GameState): string {
  if (!s.nameCorrupted) return s.playerName;
  return s.playerName.split('').map((c, i) => (i % 2 ? '̷' + c : c)).join('');
}
export function fillText(s: GameState, t: string): string {
  return t.replace(/\{name\}/g, displayName(s)).replace(/\{fardello\}/g, s.fardello ? FARDELLI[s.fardello].name : T('nessun Fardello'))
    .replace(/\{legacy\}/g, s.legacies[0]?.name || T('il portatore di prima')).replace(/\{cycle\}/g, String(s.cycle.n));
}

// ---------------- Risorse ----------------
export function intuitionCap(s: GameState) {
  return 10 + 2 * (s.village.buildings.altare || 0);
}
export function addRes(s: GameState, r: Partial<Resources>, track = true) {
  for (const k in r) {
    const key = k as keyof Resources;
    const v = r[key] || 0;
    s.res[key] = Math.max(0, s.res[key] + v);
    if (track && key === 'cenere' && v > 0) {
      stat(s, 'cenereEarned', v);
      stat(s, 'cycleCenere', v);
    }
  }
  s.res.intuizione = Math.min(s.res.intuizione, intuitionCap(s));
}
export function canAfford(s: GameState, cost: Partial<Resources>) {
  return Object.entries(cost).every(([k, v]) => s.res[k as keyof Resources] >= (v || 0));
}
export function pay(s: GameState, cost: Partial<Resources>): boolean {
  if (!canAfford(s, cost)) return false;
  for (const [k, v] of Object.entries(cost)) s.res[k as keyof Resources] -= v || 0;
  return true;
}

// ---------------- Stato della Valle ----------------
export function valleyState(s: GameState, now = Date.now()): ValleyState {
  if (s.valley.eclipseUntil > now) return 'Eclisse';
  if (s.valley.rebirthUntil > now) return 'Rinascita';
  if (s.valley.blight >= 75) return 'Cenere';
  if (s.valley.blight >= 50) return 'Corruzione';
  if (s.valley.tension >= 55) return 'Tensione';
  if (s.valley.prosperity >= 55) return 'Fioritura';
  return 'Quiete';
}
export function valleyFx(s: GameState) {
  return VALLEY_EFFECTS[valleyState(s)];
}

export function cardMod(s: GameState, key: string): number {
  const c = FATE_CARDS.find(c => c.id === s.cycle.card);
  return c?.mods[key] || 0;
}
export function sanct(s: GameState, id: string): number {
  const lvl = s.cycle.sanctuary[id] || 0;
  const def = SANCTUARY.find(d => d.id === id);
  return lvl * (def?.per || 0);
}
export function litConstellations(s: GameState): string[] {
  return Object.keys(CONSTELLATIONS).filter(c => STARS.filter(st => st.cons === c).every(st => s.stars.includes(st.id)));
}
export function consMod(s: GameState, key: string): number {
  return litConstellations(s).reduce((a, c) => a + (CONSTELLATIONS[c].mods[key] || 0), 0);
}

// Moltiplicatore globale di produzione
export function prodMult(s: GameState, key: keyof Resources | 'all', now = Date.now()): number {
  let m = 1;
  m += 0.02 * s.achievements.length;
  m += 0.05 * s.cycle.memorieTotal;
  m += 0.01 * s.fish.length;
  m += 0.03 * (s.village.works?.granaio || 0);
  m += valleyFx(s).prod;
  m += cardMod(s, 'all');
  m += sanct(s, 'saggi') / 100;
  if (key !== 'all') {
    m += cardMod(s, key);
    if (key === 'provviste' || key === 'legno') m += sanct(s, 'raccolto') / 100;
    if (key === 'pietra' || key === 'ferro') m += sanct(s, 'scalpellini') / 100;
    if (key === 'cenere') m += sanct(s, 'forziere') / 100;
    if (key === 'intuizione') m += sanct(s, 'pozzo') / 100;
  }
  // reputazione delle gilde/contadini influenza la produzione
  m += clamp(s.factions.gilde, -50, 100) / 500;
  m += clamp(s.factions.contadini, -50, 100) / 600;
  let buff = 1;
  for (const b of s.events.buffs) if (b.until > now && b.prod) buff *= b.prod;
  return Math.max(0.1, m) * buff;
}

export function lootMult(s: GameState): number {
  const talent = s.hero.talents.includes('ca4b') ? 0.2 : 0;
  return 1 + valleyFx(s).loot + cardMod(s, 'loot') + sanct(s, 'bottino') / 100 + consMod(s, 'loot') + s.corruption / 250 + talent;
}

export function repState(s: GameState, f: FactionId): string {
  const r = s.factions[f];
  if (r >= 60) return 'Adorato';
  if (r >= 30) return 'Fidato';
  if (r >= 10) return 'Tollerato';
  if (r > -10) return 'Ignorato';
  if (r > -30) return (s.corruption >= 50 || hasFlag(s, 'feared')) ? 'Temuto' : 'Tollerato';
  if (r > -60) return (s.corruption >= 50 || hasFlag(s, 'feared')) ? 'Temuto' : 'Bandito';
  return 'Marchiato';
}

export function biomeName(s: GameState, id: BiomeId, base: { name: string; altNames: Record<string, string> }) {
  return s.fardello ? base.altNames[s.fardello] || base.name : base.name;
}

export function corruptedUI(s: GameState, now = Date.now()) {
  return s.corruption >= 60 && s.settings.purifiedUntil < now;
}

export function dayKey() {
  return todayKey();
}
