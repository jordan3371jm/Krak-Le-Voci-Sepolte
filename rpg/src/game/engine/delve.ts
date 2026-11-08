import { t as T } from '../../i18n';
import type { ActiveRoom, BiomeId, DelveState, Emotion, GameState, Loot, RoomOption, RoomType } from '../types';
import { BIOMES, DUNGEON_MODIFIERS, ENEMIES } from '../data/enemies';
import { FACTIONS, FARDELLI } from '../data/core';
import { EVENTS, type NarrEvent } from '../data/events';
import { BOT_NAMES } from '../data/world';
import { hashStr, mulberry32, pick, weighted } from '../rng';
import { addFlag, addRes, chronicle, emptyLoot, hasFlag, lootMult, stat, toast } from './state';
import { addItem, clampHeroHp, companionXp, gainXp, heroStats, makeItem, rollRarity } from './hero';
import { startCombat, syncPartyBack } from './combat';
import { applyEffect, checkPromises, checkTrial, randomFragment, pushValley } from './meta';
import { dailyMods, ensureDailyRun, finishDailyRun, krakEnemyMult, krakLootMult, krakOn, makePuzzle, maybeKrakWakes, tickOmens, villageVoices } from './features';
import { todayKey } from '../rng';

// ------------------------------------------------------------
// Ciclo di vita del dungeon: Seme → Fioritura → Decadimento → Eco
// ------------------------------------------------------------
export function biomeLifecycle(s: GameState, id: BiomeId): { name: string; icon: string; desc: string; enemy: number; loot: number } {
  const b = s.biomes[id];
  if (b.visits === 0) return { name: T('Seme'), icon: '🌱', desc: T('Mai visitato. Nasce dalla tua scelta.'), enemy: 0, loot: 0 };
  if (b.conquered) return { name: T('Eco'), icon: '🔊', desc: T('Lo hai conquistato. Ora ricorda le tue visite.'), enemy: 0.05, loot: 0.1 };
  if (Date.now() - b.lastVisit > 20 * 3600_000) return { name: T('Decadimento'), icon: '🍂', desc: T('Ignorato troppo a lungo: si è corrotto. Nemici +20%, bottino +30%.'), enemy: 0.2, loot: 0.3 };
  return { name: T('Fioritura'), icon: '🌺', desc: T('Pieno di nemici, risorse e segreti.'), enemy: 0, loot: 0.05 };
}

export function biomeUnlocked(s: GameState, id: BiomeId) {
  const b = BIOMES[id];
  return !b.requires || s.biomes[b.requires].conquered;
}

export function checkpoints(s: GameState, id: BiomeId): number[] {
  const best = s.biomes[id].best;
  const step = id === 'abisso' ? 10 : 5;
  const out = [1];
  for (let f = step + 1; f <= best + 1; f += step) out.push(f);
  return out;
}

function mirrorEmotion(s: GameState): Emotion {
  if (s.dissonance >= 10) return 'rabbia';
  if (s.corruption >= 60) return 'paura';
  if (s.promises.some(p => p.status === 'broken')) return 'colpa';
  return s.fardello ? FARDELLI[s.fardello].emotion : 'paura';
}

// ------------------------------------------------------------
// Ingresso
// ------------------------------------------------------------
export function enterDelve(s: GameState, biome: BiomeId, startFloor = 1, daily = false) {
  if (s.delve) return;
  if (daily) { ensureDailyRun(s); if (s.dailyRun.tries >= 3) { toast(s, T('Hai già tentato la Sfida del giorno 3 volte. Torna domani.'), 'bad'); return; } }
  if (!s.fardello) { toast(s, T('Prima devi scegliere il tuo Fardello'), 'bad'); return; }
  if (!biomeUnlocked(s, biome)) { toast(s, T('Conquista prima il dungeon precedente'), 'bad'); return; }
  if (s.res.provviste < 1) { toast(s, T('Serve almeno 1 Provvista per scendere'), 'bad'); return; }
  if (s.hero.hp < heroStats(s).maxHp * 0.15) { toast(s, T('Sei troppo ferito. Riposa al villaggio o bevi una pozione.'), 'bad'); return; }
  s.res.provviste -= 1;
  s.lostSatchel = null;
  const emotion = mirrorEmotion(s);
  const r = mulberry32(hashStr(`${s.createdAt}-${biome}-${s.biomes[biome].visits}`));
  const pool = Object.entries(DUNGEON_MODIFIERS);
  const matching = pool.filter(([, m]) => m.emotion === emotion).map(([k]) => k);
  const mods: string[] = [];
  if (matching.length) mods.push(pick(matching, r));
  while (mods.length < 2) { const k = pick(pool, r)[0]; if (!mods.includes(k)) mods.push(k); }
  const d: DelveState = { biome, floor: startFloor, startFloor, satchel: emptyLoot(), doors: [], room: null, floorCleared: false, modifiers: mods, emotion, pledged: 0, log: [],
    snap: { t: Date.now(), coh: s.totals.coherent || 0, inc: s.totals.incoherent || 0, corr: s.corruption, influence: s.influence, factions: { ...s.factions }, open: s.promises.filter(p => p.status === 'open').length, kept: s.promises.filter(p => p.status === 'kept').length, broken: s.promises.filter(p => p.status === 'broken').length, bosses: s.totals.bosses || 0, cenere: s.totals.cenereEarned || 0 } };
  if (daily) { d.daily = true; d.modifiers = dailyMods(); s.dailyRun.tries++; }
  // frammenti attivati per la prossima spedizione
  if (hasFlag(s, 'ghost_next')) { d.ghostAlly = true; s.flags = s.flags.filter(f => f !== 'ghost_next'); }
  if (hasFlag(s, 'voce_next')) { addFlag(s, 'revive_ready'); s.flags = s.flags.filter(f => f !== 'voce_next'); }
  if (hasFlag(s, 'sussurro_next')) { addFlag(s, 'sussurro_active'); s.flags = s.flags.filter(f => f !== 'sussurro_next'); }
  if (hasFlag(s, 'sangue_next')) { addFlag(s, 'blood_active'); s.flags = s.flags.filter(f => f !== 'sangue_next'); }
  s.delve = d;
  s.biomes[biome].visits++;
  s.biomes[biome].lastVisit = Date.now();
  addFlag(s, 'delve_1');
  s.tab = 'discesa';
  d.doors = genDoors(s);
  const B = BIOMES[biome];
  chronicle(s, T('Sei sceso in {BName} (piano {startFloor}). Tema dello Specchio: {emotion}.', { BName: B.name, startFloor: startFloor, emotion: emotion }), 'world');
}

// ------------------------------------------------------------
// Porte (scelta del percorso)
// ------------------------------------------------------------
const ROOM_HINTS: Record<RoomType, string[]> = {
  combat: [T('Senti passi e respiri'), T('Odore di sangue fresco'), T('Ossa che scricchiolano')],
  elite: [T('Una presenza pesante'), T('Qualcuno ti aspetta'), T('Il buio qui ha un volto')],
  event: [T('Una voce ti chiama per nome'), T('Una luce strana'), T('Qualcosa da decidere')],
  trap: [T('Il pavimento sembra respirare'), T('Fili sottili nel buio'), T('Silenzio sospetto')],
  shrine: [T('Una candela accesa'), T('Aria pulita, per una volta'), T('Un altare intatto')],
  treasure: [T('Un luccichio'), T('Un forziere solitario'), T('Monete sparse')],
  ghost: [T('Un\'eco di passi non tuoi'), T('Un altro portatore è passato di qui'), T('Un nome inciso di fresco')],
  shadow: [T('Il tuo Fardello ha un\'ombra'), T('Qualcuno con il tuo volto'), T('Una forma che conosci')],
  hunter: [T('Catene che tintinnano'), T('Qualcuno ripete le tue promesse'), T('Un cacciatore ti segue')],
  boss: [T('Il cuore del dungeon batte qui'), T('Non c\'è altra strada'), T('La fine di questo strato')],
  merchant: [T('Una lanterna oscillante'), T('Qualcuno contratta col buio'), T('Un\'Ombra del Mercato')],
  puzzle: [T('Candele che si accendono da sole'), T('Un sigillo incrinato'), T('Simboli che ti fissano')],
};
export const ROOM_ICONS: Record<RoomType, string> = { combat: '⚔️', elite: '💀', event: '❓', trap: '🕸️', shrine: '🕯️', treasure: '💰', ghost: '👤', shadow: '🖤', hunter: '🔗', boss: '👑', merchant: '🎭', puzzle: '🕯️' };
export const ROOM_NAMES: Record<RoomType, string> = { combat: T('Scontro'), elite: T('Élite'), event: T('Evento'), trap: T('Trappola'), shrine: T('Santuario'), treasure: T('Tesoro'), ghost: T('Eco di Portatore'), shadow: T('Ombra del Fardello'), hunter: T('Cacciatore'), boss: T('Boss'), merchant: T('Mercante Ombra'), puzzle: T('Enigma') };

function bossAt(s: GameState): string | null {
  const d = s.delve!;
  const B = BIOMES[d.biome];
  if (d.biome === 'abisso') return d.floor % 10 === 0 ? 'sovrano_vuoto' : null;
  return B.bosses[d.floor] || null;
}

export function genDoors(s: GameState): RoomOption[] {
  const d = s.delve!;
  const r = mulberry32(hashStr(d.daily ? `krak-daily-${todayKey()}-${d.floor}` : `${s.createdAt}-${d.biome}-${s.biomes[d.biome].visits}-${d.floor}`));
  if (bossAt(s)) return [{ type: 'boss', seed: r() * 1e9, hint: pick(ROOM_HINTS.boss, r) }];
  const broken = s.promises.filter(p => p.status === 'broken').length;
  const shadowReady = s.influence >= 40 && !hasFlag(s, `shadow_floor_${d.floor}`);
  const mod = d.modifiers;
  const w: [RoomType, number][] = [
    ['combat', 40], ['event', 22], ['trap', mod.includes('claustrofobia') ? 14 : 7], ['shrine', mod.includes('reliquiario') ? 14 : 7],
    ['treasure', mod.includes('reliquiario') ? 10 : 5], ['elite', d.floor >= 3 ? (krakOn(s, 6) ? 20 : 9) : 0], ['puzzle', d.floor >= 2 ? 8 : 0], ['ghost', mod.includes('eco_vuota') ? 12 : 6],
    ['merchant', 4], ['shadow', shadowReady ? 7 : 0], ['hunter', broken ? 5 + broken * 3 : 0],
  ];
  const n = mod.includes('claustrofobia') ? 2 : 3;
  const out: RoomOption[] = [];
  let guard = 0;
  while (out.length < n && guard++ < 50) {
    const t = weighted(w, r);
    if (out.some(o => o.type === t) && t !== 'combat') continue;
    out.push({ type: t, seed: Math.floor(r() * 1e9), hint: pick(ROOM_HINTS[t], r) });
  }
  // la prima discesa di sempre: il primo scontro è subito dietro una porta
  if (!(s.totals.delves || 0) && d.floor === 1 && !out.some(o => o.type === 'combat')) out[0] = { type: 'combat', seed: Math.floor(r() * 1e9), hint: pick(ROOM_HINTS.combat, r) };
  // Una missione secondaria attende qui: garantisce una porta-evento con un indizio.
  const questEv = EVENTS.find(e => e.priority && e.where !== 'village' && (e.where === 'any' || e.where.includes(d.biome)) && (!e.minFloor || d.floor >= e.minFloor) && !hasFlag(s, `ev_${e.id}`) && (!e.cond || e.cond(s)));
  if (questEv && !out.some(o => o.type === 'event')) out[out.length - 1] = { type: 'event', seed: Math.floor(r() * 1e9), hint: T('📜 Un indizio della tua missione') };
  return out;
}

// ------------------------------------------------------------
// Stanze
// ------------------------------------------------------------
function biomeScale(s: GameState) {
  const d = s.delve!;
  const B = BIOMES[d.biome];
  return B.scale * (1 + biomeLifecycle(s, d.biome).enemy) * krakEnemyMult(s);
}

function encounter(s: GameState, r: () => number): string[] {
  const d = s.delve!;
  const B = BIOMES[d.biome];
  let n = 1 + (d.floor >= 2 ? 1 : 0) + (d.floor >= 7 && r() < 0.35 ? 1 : 0);
  if (d.modifiers.includes('ombre_doppie') && r() < 0.5) n++;
  if (s.valley.eclipseUntil > Date.now() && r() < 0.4) n++;
  n = Math.min(4, n);
  const ids: string[] = [];
  for (let i = 0; i < n; i++) ids.push(pick(B.normal, r));
  return ids;
}

export function chooseDoor(s: GameState, idx: number) {
  const d = s.delve;
  if (!d || d.room || d.floorCleared) return;
  const opt = d.doors[idx];
  if (!opt) return;
  const r = mulberry32(opt.seed);
  const room: ActiveRoom = { type: opt.type, resolved: false };
  d.room = room;
  const B = BIOMES[d.biome];
  const scale = biomeScale(s);
  const title = (t: string) => `${T('Piano {n}', { n: d.floor })} · ${t}`;
  switch (opt.type) {
    case 'combat':
      startCombat(s, encounter(s, r), { floor: d.floor, scale, title: title(T('Scontro')), kind: 'delve' });
      break;
    case 'elite': {
      const ids = [pick(B.elites, r)];
      if (d.floor >= 5) ids.push(pick(B.normal, r));
      startCombat(s, ids, { floor: d.floor, scale, title: title(T('Élite')), kind: 'delve' });
      break;
    }
    case 'boss': {
      const id = bossAt(s)!;
      const ids = [id];
      if (d.floor >= 10 && d.biome !== 'cimitero' && d.floor !== B.depth) ids.push(pick(B.normal, r));
      startCombat(s, ids, { floor: d.floor, scale: scale * (krakOn(s, 9) ? 1.25 : 1), title: title(`Boss: ${ENEMIES[id].name}`), kind: 'boss' });
      break;
    }
    case 'shadow': {
      const sid = FARDELLI[s.fardello!].shadowId;
      addFlag(s, `shadow_floor_${d.floor}`);
      addFlag(s, 'shadow_met');
      room.text = T('{shadowName} emerge dal tuo Fardello. "Io sono ciò che diventerai."', { shadowName: FARDELLI[s.fardello!].shadowName });
      startCombat(s, [sid], { floor: d.floor, scale: scale * 0.9, title: title(FARDELLI[s.fardello!].shadowName), kind: 'shadow' });
      break;
    }
    case 'hunter':
      room.text = T('Il Cacciatore di Promesse porta le tue parole infrante appese alla cintura.');
      startCombat(s, ['cacciatore_promesse'], { floor: d.floor, scale, title: title(T('Cacciatore di Promesse')), kind: 'hunter' });
      break;
    case 'event': {
      const ev = pickEvent(s, r);
      if (ev) { room.eventId = ev.id; }
      else { room.type = 'treasure'; openTreasure(s, r); }
      break;
    }
    case 'trap':
      room.text = pick([T('Il pavimento cede sotto i tuoi piedi.'), T('Lame d\'osso scattano dalle pareti.'), T('Un gas verdastro sale dalle crepe.')], r);
      break;
    case 'shrine':
      room.text = T('Un piccolo santuario, intatto. Qui il dungeon trattiene il respiro.');
      break;
    case 'treasure':
      openTreasure(s, r);
      break;
    case 'merchant': {
      room.text = T('Un\'Ombra del Mercato ti offre merci strappate ai caduti. Accetta Cenere della bisaccia o del villaggio.');
      room.merchantItems = [0, 1, 2].map(() => {
        const it = makeItem(ilvl(s), rollRarity(1.2, r), undefined, r);
        return { item: it, price: Math.round((40 + it.ilvl * 12) * (1 + it.rarity * 0.8) * (s.factions.ombre >= 30 ? 0.8 : 1)) };
      });
      break;
    }
    case 'ghost': openGhost(s, r); break;
    case 'puzzle':
      room.puzzle = makePuzzle(d.floor, r);
      room.text = room.puzzle.mode === 'candele'
        ? T('Quattro candele nere. Si accendono una alla volta, in un ordine che sembra una preghiera. Ripetilo.')
        : T('Un sigillo di Krak è incrinato. I simboli pulsano in sequenza: ricomponili nello stesso ordine prima che si spezzi.');
      break;
  }
}

/** Enigma: il giocatore ripete la sequenza mostrata. */
export function puzzlePress(s: GameState, sym: number) {
  const d = s.delve;
  const room = d?.room;
  const P = room?.puzzle;
  if (!d || !room || !P || room.resolved) return;
  P.input.push(sym);
  const i = P.input.length - 1;
  if (P.seq[i] !== sym) {
    const st = heroStats(s);
    const dmg = Math.round(st.maxHp * 0.15);
    s.hero.hp = Math.max(1, s.hero.hp - dmg);
    s.corruption = Math.min(100, s.corruption + 4);
    room.text = P.mode === 'candele' ? T('Le candele si spengono tutte insieme. Nel buio, qualcosa ti morde. -{dmg} salute.', { dmg }) : T('Il sigillo si spezza tra le tue dita. Una scheggia di Krak ti entra nel sangue. -{dmg} salute.', { dmg });
    room.resolved = true;
    clearFloor(s);
    return;
  }
  if (P.input.length >= P.seq.length) {
    const n = P.seq.length;
    d.satchel.cenere += Math.round((30 + d.floor * 12) * n / 3 * lootMult(s));
    if (n >= 5 || Math.random() < 0.25) d.satchel.reliquie += 1;
    s.corruption = Math.max(0, s.corruption - 5);
    gainXp(s, 15 + d.floor * 3);
    if (Math.random() < 0.35) d.satchel.items.push(makeItem(ilvl(s) + 1, rollRarity(1)));
    room.text = P.mode === 'candele' ? T('Le candele ardono insieme, ferme. Sotto l’altare trovi ciò che qualcuno ha nascosto. La corruzione arretra.') : T('Il sigillo si richiude con un sospiro. Krak, per un attimo, tace. Tra le crepe brilla qualcosa.');
    room.resolved = true;
    clearFloor(s);
  }
}

function ilvl(s: GameState) {
  const d = s.delve!;
  return Math.round(BIOMES[d.biome].tier * 8 + d.floor * 0.8);
}

function pickEvent(s: GameState, r: () => number): NarrEvent | null {
  const d = s.delve!;
  const pool = EVENTS.filter(e => e.where !== 'village' && (e.where === 'any' || e.where.includes(d.biome)) && (!e.minFloor || d.floor >= e.minFloor) && (!e.once || !hasFlag(s, `ev_${e.id}`)) && (!e.cond || e.cond(s)));
  const prio = pool.filter(e => e.priority);
  if (prio.length) pool.splice(0, pool.length, ...prio);
  if (!pool.length) return null;
  return pick(pool, r);
}

function openTreasure(s: GameState, r: () => number) {
  const d = s.delve!;
  const room = d.room!;
  if (r() < 0.12) {
    room.text = T('Il forziere spalanca le fauci: è un mimic!');
    startCombat(s, [pick(BIOMES[d.biome].normal, r), pick(BIOMES[d.biome].normal, r)], { floor: d.floor, scale: biomeScale(s), title: T('Piano {floor} · Mimic', { floor: d.floor }), kind: 'delve' });
    return;
  }
  const m = lootMult(s) * krakLootMult(s) * (1 + biomeLifecycle(s, d.biome).loot);
  const c = Math.round((25 + d.floor * 8) * BIOMES[d.biome].scale * m);
  d.satchel.cenere += c;
  d.satchel.ferro += Math.round((4 + d.floor) * m);
  let txt = T('Nel forziere: {c} Cenere e un po\' di ferro.', { c: c });
  if (r() < 0.55) { const it = makeItem(ilvl(s), rollRarity(0.8, r), undefined, r); d.satchel.items.push(it); txt += ` E ${it.name}.`; }
  if (r() < 0.08) { const f = randomFragment(s, r); d.satchel.fragments.push(f); txt += T(' Un Frammento di Fato brilla sul fondo!'); }
  room.text = txt;
  room.resolved = true;
  clearFloor(s);
}

function openGhost(s: GameState, r: () => number) {
  const d = s.delve!;
  const room = d.room!;
  const own = s.legacies.length && r() < 0.5 ? pick(s.legacies, r) : null;
  const name = own ? T('{ownName} (tuo Ciclo {cycle})', { ownName: own.name, cycle: own.cycle }) : pick(BOT_NAMES, r);
  const kind = own ? own.kind : weighted<'ally' | 'enemy' | 'merchant' | 'corpse'>([['ally', 3], ['enemy', 3], ['merchant', 2], ['corpse', 3]], r);
  room.ghostName = name;
  room.ghostKind = kind;
  if (kind === 'enemy') {
    room.text = T('L\'Eco di {name} non ha trovato pace. Ti scambia per chi l\'ha tradito.', { name: name });
    startCombat(s, ['eco_portatore'], { floor: d.floor, scale: biomeScale(s), title: T('Eco di {name}', { name: name }), kind: 'ghost' });
  } else if (kind === 'ally') {
    room.text = T('L\'Eco di {name} cammina con te per il resto della discesa.', { name: name });
    d.ghostAlly = true;
    room.resolved = true;
    clearFloor(s);
  } else if (kind === 'merchant') {
    room.text = T('{name} è diventato un mercante d\'ombra. "Ho tenuto da parte qualcosa per chi sarebbe venuto dopo."', { name: name });
    room.merchantItems = [0, 1].map(() => { const it = makeItem(ilvl(s) + 2, rollRarity(1.8, r), undefined, r); return { item: it, price: Math.round((50 + it.ilvl * 12) * (1 + it.rarity * 0.7)) }; });
  } else {
    room.text = T('Il corpo di {name}. Aveva aperto questa porta sacrificando la sua salute, poi è caduto. Completi tu ciò che ha iniziato: il dungeon ricorderà entrambi.', { name: name });
    const it = makeItem(ilvl(s) + 3, rollRarity(1.5, r), undefined, r);
    it.origin = T('Appartenuto a {name}, caduto al piano {floor}.', { name: name, floor: d.floor });
    d.satchel.items.push(it);
    if (r() < 0.3) d.satchel.fragments.push('corrotto');
    room.resolved = true;
    clearFloor(s);
  }
}

export function resolveTrap(s: GameState, how: 'disarm' | 'endure' | 'blood') {
  const d = s.delve;
  if (!d?.room || d.room.type !== 'trap' || d.room.resolved) return;
  const st = heroStats(s);
  const half = (s.hero.talents.includes('co3') ? 0.5 : 1) * (krakOn(s, 5) ? 1.5 : 1);
  if (how === 'disarm') {
    const chance = Math.min(0.9, 0.35 + st.dodge / 100 + st.speed / 50);
    if (Math.random() < chance) { d.room.text = T('Disinneschi il meccanismo. Tra gli ingranaggi, un po\' di ferro.'); d.satchel.ferro += 8 + d.floor; gainXp(s, 10 + d.floor * 2); }
    else { const dmg = Math.round(st.maxHp * 0.18 * half); s.hero.hp = Math.max(1, s.hero.hp - dmg); d.room.text = T('Il meccanismo scatta! -{dmg} salute.', { dmg: dmg }); }
  } else if (how === 'endure') {
    const dmg = Math.round(st.maxHp * 0.1 * half); s.hero.hp = Math.max(1, s.hero.hp - dmg); d.room.text = T('Attraversi a denti stretti. -{dmg} salute.', { dmg: dmg });
  } else {
    const dmg = Math.round(st.maxHp * 0.12); s.hero.hp = Math.max(1, s.hero.hp - dmg);
    s.corruption = Math.max(0, s.corruption - 5);
    applyEffect(s, { nature: 'sacrifice' }, 'trap');
    d.room.text = T('Offri il tuo sangue: la trappola si placa. -{dmg} salute, la corruzione cala.', { dmg: dmg });
  }
  d.room.resolved = true;
  clearFloor(s);
}

export function useShrine(s: GameState, how: 'rest' | 'pray' | 'purify' | 'leave') {
  const d = s.delve;
  if (!d?.room || d.room.type !== 'shrine' || d.room.resolved) return;
  const st = heroStats(s);
  if (how === 'leave') { d.room.text = T('Passi oltre il santuario senza fermarti.'); d.room.resolved = true; clearFloor(s); return; }
  if (how === 'rest') {
    if (d.satchel.provviste < 1 && s.res.provviste < 1) { toast(s, T('Serve 1 Provvista per riposare'), 'bad'); return; }
    if (d.modifiers.includes('reliquiario')) {
      if (s.res.cenere < 30) { toast(s, T('Il Reliquiario chiede 30 Cenere'), 'bad'); return; }
      s.res.cenere -= 30;
    }
    if (d.satchel.provviste >= 1) d.satchel.provviste--; else s.res.provviste--;
    s.hero.hp = Math.min(st.maxHp, s.hero.hp + Math.round(st.maxHp * (krakOn(s, 2) ? 0.3 : 0.45)));
    for (const c of s.companions) if (c.inParty && c.hp > 0) c.hp = Math.min(1, c.hp + 0.45);
    d.room.text = T('Consumi una provvista e riposi. Le ferite si chiudono.');
    for (const c of s.companions) if (c.inParty) { c.weight = Math.max(0, (c.weight || 0) - 30); if (c.weight < 25) c.mood = null; }
  } else if (how === 'pray') {
    applyEffect(s, { nature: 'faith', resonance: 2 }, 'shrine');
    d.room.text = T('Preghi. Il Fardello vibra, coerente.');
  } else {
    s.corruption = Math.max(0, s.corruption - 15);
    s.dissonance = Math.max(0, s.dissonance - 2);
    d.room.text = T('Purifichi te stesso. La corruzione arretra.');
  }
  d.room.resolved = true;
  clearFloor(s);
}

export function buyFromGhostMerchant(s: GameState, i: number) {
  const d = s.delve;
  const m = d?.room?.merchantItems?.[i];
  if (!d || !m) return;
  const fromSatchel = Math.min(d.satchel.cenere, m.price);
  const rest = m.price - fromSatchel;
  if (rest > s.res.cenere) { toast(s, T('Cenere insufficiente'), 'bad'); return; }
  d.satchel.cenere -= fromSatchel; s.res.cenere -= rest;
  d.satchel.items.push(m.item);
  d.room!.merchantItems!.splice(i, 1);
  stat(s, 'trades');
  toast(s, `Acquistato ${m.item.name}`, 'good');
}

export function leaveRoom(s: GameState) {
  const d = s.delve;
  if (!d?.room) return;
  if (d.room.type === 'merchant' || (d.room.type === 'ghost' && d.room.ghostKind === 'merchant')) {
    d.room.resolved = true;
    clearFloor(s);
  }
}

export function chooseDelveEvent(s: GameState, choiceIdx: number) {
  const d = s.delve;
  if (!d?.room?.eventId || d.room.resolved) return;
  const ev = findEvent(d.room.eventId);
  const ch = ev?.choices[choiceIdx];
  if (!ev || !ch) return;
  if (!choiceAvailable(s, ch).ok) return;
  addFlag(s, `ev_${ev.id}`);
  d.room.text = ch.result;
  d.room.resolved = true;
  s.biomes[d.biome].memory.unshift(`${ev.title}: ${ch.text}`);
  s.biomes[d.biome].memory = s.biomes[d.biome].memory.slice(0, 12);
  applyEffect(s, ch.effect, ev.title);
  if (ch.effect.combat && !s.combat) {
    startCombat(s, ch.effect.combat, { floor: d.floor, scale: biomeScale(s), title: T('Piano {floor} · {title}', { floor: d.floor, title: ev.title }), kind: 'delve' });
    d.room.resolved = false;
    return;
  }
  if (!s.combat) clearFloor(s);
}

export function choiceAvailable(s: GameState, ch: NarrEvent['choices'][number]): { ok: boolean; why?: string } {
  const q = ch.req;
  if (!q) return { ok: true };
  if (q.fullscreen && !s.fullscreen) return { ok: false, why: ch.reqText };
  if (q.flag && !hasFlag(s, q.flag)) return { ok: false, why: ch.reqText };
  if (q.noFlag && hasFlag(s, q.noFlag)) return { ok: false, why: ch.reqText };
  if (q.fardello && s.fardello !== q.fardello) return { ok: false, why: ch.reqText };
  if (q.res && Object.entries(q.res).some(([k, v]) => (s.res as any)[k] < (v || 0))) return { ok: false, why: ch.reqText };
  if (q.dissonance && s.dissonance < q.dissonance) return { ok: false, why: ch.reqText };
  if (q.resonance && s.resonance < q.resonance) return { ok: false, why: ch.reqText };
  if (q.aberration && !s.aberration) return { ok: false, why: ch.reqText };
  if (q.fragment && !s.fragments.length) return { ok: false, why: ch.reqText };
  if (q.reliquie && s.reliquie < q.reliquie) return { ok: false, why: ch.reqText };
  return { ok: true };
}

export function clearFloor(s: GameState) {
  const d = s.delve;
  if (!d) return;
  d.floorCleared = true;
  stat(s, 'floors');
  stat(s, 'dailyFloors');
  const b = s.biomes[d.biome];
  if (d.floor > b.best) b.best = d.floor;
  if (d.biome === 'abisso') s.totals.abyssBest = Math.max(s.totals.abyssBest || 0, d.floor);
}

// ------------------------------------------------------------
// Fine scontro (tutti i tipi)
// ------------------------------------------------------------
const POST_BOSS: Record<string, NarrEvent> = {
  coro: {
    id: 'post_coro', title: T('Le Voci del Coro'), icon: '🎶', where: [],
    text: T('Il Coro si sgretola. Le voci di chi avresti potuto salvare ti circondano, in attesa.'),
    choices: [
      { text: T('Assorbire le voci nel tuo Fardello'), effect: { resonance: 5, hp: -0.2, corruption: -15, influence: 15, flags: ['absorbed_voices'] }, result: T('Il dolore ti attraversa. Le voci trovano pace dentro di te.') },
      { text: T('Ridurle al silenzio per sempre'), effect: { dissonance: 4, corruption: 15, flags: ['silenced_voices'], nature: 'cruel' }, result: T('Il silenzio che imponi è più crudele della morte.') },
      { text: T('Liberarle nella valle'), effect: { resonance: 3, hp: -0.3, prosperity: 20, flags: ['freed_voices'], fragment: 'voce', nature: 'protect' }, result: T('Le voci si disperdono. Torneranno… ma non ora. Ti lasciano la Voce dei Sopravvissuti.') },
    ],
  },
  madre_vhalzareth: {
    id: 'post_madre', title: T('Il Sangue della Madre'), icon: '🩸', where: [],
    text: T('La Madre di Vhalzareth giace nella Fonte. "Prendi il mio posto, figlio. Oppure uccidimi davvero."'),
    choices: [
      { text: T('Prendere il suo posto'), effect: { factions: { culto: 30, guaritori: -20 }, aberration: true, flags: ['cult_heir', 'aberration'], corruption: 20 }, result: T('Il Culto si inginocchia. La Fonte ora batte con il tuo cuore.') },
      { text: T('Sigillare la Fonte'), effect: { factions: { culto: -30, guardiani: 20, guaritori: 15 }, blight: -25, flags: ['fountain_sealed'], nature: 'faith' }, result: T('La Fonte si secca. La palude respira, per la prima volta da secoli.') },
      { text: T('Vendere il suo sangue alle Ombre'), effect: { factions: { ombre: 25, gilde: -10 }, reliquie: 3, fragment: 'cenere', flags: ['sold_blood'], nature: 'blood' }, result: T('Le Ombre del Mercato pagano bene. Molto bene.') },
    ],
  },
  cuore_krak: {
    id: 'post_cuore', title: T('Il Silenzio del Cuore'), icon: '🫀', where: [],
    text: T('Il Cuore di Krak smette di battere. Tutte le voci sepolte tacciono. Senti la valle aspettare la tua ultima scelta.'),
    choices: [
      { text: T('Ascoltare l\'ultima voce'), effect: { flags: ['heart_heard'], resonance: 5 }, result: T('La voce dice il tuo nome. Poi tace. Il Ciclo può concludersi.') },
    ],
  },
};
export function findEvent(id: string): NarrEvent | undefined {
  return EVENTS.find(e => e.id === id) || Object.values(POST_BOSS).find(e => e.id === id);
}

export function finishCombat(s: GameState) {
  const c = s.combat;
  if (!c || (c.phase !== 'won' && c.phase !== 'lost')) return;
  syncPartyBack(s);
  const won = c.phase === 'won';
  const fled = hasFlag(s, '__fled');
  s.flags = s.flags.filter(f => f !== '__fled');

  if (c.kind === 'worldboss') { finishWorldBoss(s); return; }
  if (c.kind === 'trial') { finishTrialCombat(s, won); return; }

  const d = s.delve;
  s.combat = null;
  if (!d) return;
  if (!won) {
    if (fled) { fleeDelve(s); return; }
    deathInDelve(s);
    return;
  }
  // bottino
  const m = lootMult(s) * (1 + biomeLifecycle(s, d.biome).loot) * (d.modifiers.includes('sete') ? 1.4 : 1);
  const scale = BIOMES[d.biome].scale;
  let xp = 0, cen = 0;
  for (const e of c.enemies) {
    const def = ENEMIES[e.defId];
    xp += def.xp * (1 + 0.08 * d.floor) * Math.sqrt(scale) * 1.5;
    cen += def.cenere * (1 + 0.06 * d.floor) * scale * m;
  }
  gainXp(s, xp);
  for (const comp of s.companions) if (comp.inParty && comp.recruited && !comp.mission) companionXp(s, comp.id, xp * 0.5);
  d.satchel.cenere += Math.round(cen);
  d.satchel.legno += Math.round(Math.random() * 6 * scale);
  d.satchel.pietra += Math.round(Math.random() * 6 * scale);
  d.satchel.ferro += Math.round(Math.random() * 4 * scale * m);
  if (Math.random() < 0.15) d.satchel.provviste += 1;
  const isElite = c.enemies.some(e => e.tags.includes('elite'));
  const isBoss = c.kind === 'boss';
  if (isElite || Math.random() < 0.22 * m) d.satchel.items.push(makeItem(ilvl(s), rollRarity(isElite ? 1.2 : 0.3 + d.floor / 30)));
  s.totals.bosses = (s.totals.bosses || 0) + (isBoss ? 1 : 0);

  if (c.kind === 'shadow') {
    addFlag(s, 'shadow_defeated');
    d.satchel.fragments.push(FARDELLI[s.fardello!].fragment);
    d.satchel.reliquie += 1;
    s.influence = Math.max(0, s.influence - 25);
    chronicle(s, T('Hai sconfitto {shadowName}, l\'Ombra del tuo Fardello.', { shadowName: FARDELLI[s.fardello!].shadowName }), 'fate');
  }
  if (c.kind === 'hunter') {
    const b = s.promises.find(p => p.status === 'broken');
    if (b) { b.status = 'kept'; b.text += ' (riscattata)'; }
    chronicle(s, T('Hai sconfitto il Cacciatore di Promesse: una promessa infranta è stata riscattata.'), 'promise');
    d.satchel.reliquie += 1;
  }
  if (c.kind === 'ghost') { d.satchel.items.push(makeItem(ilvl(s) + 2, rollRarity(1.5))); }

  const room = d.room;
  if (isBoss) {
    const bossId = c.enemies[0].defId;
    addFlag(s, `boss_${bossId}`);
    d.satchel.reliquie += 1;
    if (Math.random() < 0.5) d.satchel.fragments.push(randomFragment(s));
    if (room) room.bossChoice = [0, 1, 2].map(() => makeItem(ilvl(s) + 4, rollRarity(2 + d.floor / 10)));
    chronicle(s, T('Hai sconfitto {bossIdName} al piano {floor}.', { bossIdName: ENEMIES[bossId].name, floor: d.floor }), 'combat');
    const B = BIOMES[d.biome];
    if (B.depth && d.floor >= B.depth) {
      s.biomes[d.biome].conquered = true;
      toast(s, T('🏆 {BName} conquistato!', { BName: B.name }), 'fate');
      if (POST_BOSS[bossId] && room) { room.eventId = POST_BOSS[bossId].id; room.resolved = false; }
      checkTrial(s);
    }
  }
  const pendingPostBoss = !!(room && room.type === 'boss' && room.eventId?.startsWith('post_'));
  if (room && !pendingPostBoss) room.resolved = true;
  if (!pendingPostBoss) clearFloor(s);
}

export function chooseBossItem(s: GameState, i: number) {
  const d = s.delve;
  const it = d?.room?.bossChoice?.[i];
  if (!d || !it) return;
  d.satchel.items.push(it);
  d.room!.bossChoice = undefined;
  toast(s, `Scelto: ${it.name}`, 'good');
}

export function choosePostBoss(s: GameState, i: number) {
  const d = s.delve;
  if (!d?.room?.eventId) return;
  const ev = findEvent(d.room.eventId);
  const ch = ev?.choices[i];
  if (!ev || !ch) return;
  applyEffect(s, ch.effect, ev.title);
  d.room.text = ch.result;
  d.room.eventId = undefined;
  d.room.resolved = true;
  chronicle(s, `${ev.title}: ${ch.text}.`, 'choice');
  clearFloor(s);
}

// ------------------------------------------------------------
// Scendere / Mettere al sicuro (Soglia di Ritiro)
// ------------------------------------------------------------
export function descendCost(s: GameState): { provviste: boolean; pledge: number } {
  const d = s.delve!;
  const have = d.satchel.provviste + s.res.provviste;
  return { provviste: have >= 1, pledge: have >= 1 ? 0 : Math.max(5, Math.round(heroStats(s).maxHp * 0.08)) };
}

export function descend(s: GameState, pledge = false) {
  const d = s.delve;
  if (!d || !d.floorCleared) return;
  const B = BIOMES[d.biome];
  if (B.depth && d.floor >= B.depth) { toast(s, T('Sei sul fondo di questo strato. Torna in superficie.'), 'info'); return; }
  const cost = descendCost(s);
  if (cost.provviste) {
    if (d.satchel.provviste >= 1) d.satchel.provviste--; else s.res.provviste--;
  } else if (pledge) {
    d.pledged += cost.pledge;
    s.hero.pledgedMaxHp += cost.pledge;
    clampHeroHp(s);
    chronicle(s, T('Hai pegnorato {pledge} salute massima futura per continuare.', { pledge: cost.pledge }), 'fate');
    toast(s, T('⛓️ Pegno: -{pledge} salute massima', { pledge: cost.pledge }), 'bad');
  } else return;
  if (d.modifiers.includes('decimo')) s.res.cenere = Math.max(0, s.res.cenere - 5);
  if (krakOn(s, 8) && Math.random() < 0.2 && s.res.provviste >= 1) { s.res.provviste--; toast(s, T('🍞 Una provvista è marcita nella bisaccia.'), 'bad'); }
  d.floor++;
  d.room = null;
  d.floorCleared = false;
  d.doors = genDoors(s);
  // allucinazioni del Sacrificio nei piani profondi
  if (s.fardello === 'sacrificio' && d.floor >= 12 && Math.random() < 0.15) toast(s, T('👁️ Per un istante vedi Tomas tra le ombre…'), 'fate');
}

export function bankAndLeave(s: GameState) {
  const d = s.delve;
  if (!d || s.combat) return;
  if (d.room && !d.room.resolved && d.room.type !== 'merchant') { toast(s, T('Risolvi prima la stanza'), 'bad'); return; }
  const L = d.satchel;
  addRes(s, { cenere: L.cenere, legno: L.legno, pietra: L.pietra, ferro: L.ferro, provviste: L.provviste });
  s.reliquie += L.reliquie;
  for (const it of L.items) addItem(s, it);
  for (const f of L.fragments) s.fragments.push({ uid: `fr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, defId: f });
  const refund = Math.floor(d.pledged / 2);
  s.hero.pledgedMaxHp = Math.max(0, s.hero.pledgedMaxHp - refund);
  toast(s, T('🎒 Bottino al sicuro: {cenere} cenere, {items} oggetti{reliquie}', { cenere: L.cenere, items: L.items.length, reliquie: L.reliquie ? T(', {reliquie} reliquie', { reliquie: L.reliquie }) : '' }), 'good');
  chronicle(s, T('Sei risalito da {biomeName} al piano {floor} con la bisaccia piena.', { biomeName: BIOMES[d.biome].name, floor: d.floor }), 'loot');
  endDelve(s, true);
}

function fleeDelve(s: GameState) {
  const d = s.delve!;
  const L = d.satchel;
  addRes(s, { cenere: Math.round(L.cenere / 2), legno: Math.round(L.legno / 2), pietra: Math.round(L.pietra / 2), ferro: Math.round(L.ferro / 2) });
  toast(s, T('🏃 Sei fuggito: metà della bisaccia è persa.'), 'bad');
  chronicle(s, T('Sei fuggito da {biomeName} al piano {floor}.', { biomeName: BIOMES[d.biome].name, floor: d.floor }), 'combat');
  s.hero.hp = Math.max(1, s.hero.hp);
  endDelve(s, false);
}

function deathInDelve(s: GameState) {
  const d = s.delve!;
  const L = d.satchel;
  const keep = krakOn(s, 7) ? 0 : 0.25;
  addRes(s, { cenere: Math.round(L.cenere * keep), legno: Math.round(L.legno * keep), pietra: Math.round(L.pietra * keep), ferro: Math.round(L.ferro * keep) });
  const items = [...L.items].sort((a, b) => b.rarity - a.rarity);
  if (items.length && !krakOn(s, 7)) addItem(s, items.shift()!);
  const lost = { cenere: Math.round(L.cenere * (1 - keep)), legno: Math.round(L.legno * (1 - keep)), pietra: Math.round(L.pietra * (1 - keep)), ferro: Math.round(L.ferro * (1 - keep)), items };
  s.lostSatchel = lost.cenere + lost.legno + lost.pietra + lost.ferro + lost.items.length > 0 ? lost : null;
  s.hero.deaths++;
  s.hero.hp = Math.round(heroStats(s).maxHp * 0.3);
  s.valley.blight = Math.min(100, s.valley.blight + 2);
  if (d.pledged) chronicle(s, T('Sei caduto: il pegno di {pledged} salute massima diventa permanente (Elara può scioglierlo).', { pledged: d.pledged }), 'fate');
  toast(s, T('☠️ Sei caduto. La valle ti riporta in superficie. Hai perso gran parte della bisaccia.'), 'bad');
  chronicle(s, T('Sei caduto al piano {floor} di {biomeName}.', { floor: d.floor, biomeName: BIOMES[d.biome].name }), 'combat');
  endDelve(s, false);
}

function endDelve(s: GameState, success: boolean) {
  const d = s.delve!;
  stat(s, 'delves');
  s.delve = null;
  s.combat = null;
  s.activeElixir = null;
  s.flags = s.flags.filter(f => !['sussurro_active', 'blood_active', 'revive_ready'].includes(f));
  for (const c of s.companions) if (c.hp <= 0.05) c.hp = 0.3;
  clampHeroHp(s);
  s.biomes[d.biome].lastVisit = Date.now();
  // il mondo reagisce
  pushValley(s, success ? { prosperity: 1 } : { blight: 1 });
  for (const p of s.promises) if (p.status === 'open') p.deadlineDelves--;
  checkPromises(s);
  const extra = [...tickOmens(s, d, success), ...(d.daily ? finishDailyRun(s, d) : [])];
  s.lastReport = buildReport(s, d, success);
  if (s.lastReport) { s.lastReport.lines.splice(1, 0, ...extra); s.lastReport.voices = villageVoices(s, d, success); }
  if (success) s.lostSatchel = null;
  maybeKrakWakes(s);
  s.tab = 'villaggio';
  const ev = EVENTS.filter(e => e.where === 'village' && (!e.once || !hasFlag(s, `ev_${e.id}`)) && (!e.cond || e.cond(s)));
  if (ev.length && Math.random() < 0.85) {
    s.modal = { kind: 'event', eventId: ev[0].id };
  }
}

// Boss mondiale condiviso (Krak Realm: World Boss)
export function startWorldBoss(s: GameState) {
  if (s.delve || s.combat) return;
  if (s.world.bossTries >= 3) { toast(s, T('Hai già affrontato il Colosso 3 volte oggi'), 'bad'); return; }
  if (s.hero.hp < heroStats(s).maxHp * 0.3) { toast(s, T('Sei troppo ferito'), 'bad'); return; }
  s.world.bossTries++;
  startCombat(s, ['colosso'], { floor: 1, scale: 1, title: T('Boss Mondiale: Il Colosso di Cenere'), kind: 'worldboss' });
  s.tab = 'discesa';
}
function finishWorldBoss(s: GameState) {
  const c = s.combat!;
  const dmg = c.damageDealt;
  s.world.bossDamage += dmg;
  s.totals.worldBossDmg = (s.totals.worldBossDmg || 0) + dmg;
  const tier = dmg >= 20000 ? 4 : dmg >= 8000 ? 3 : dmg >= 2500 ? 2 : dmg >= 600 ? 1 : 0;
  const cen = 80 + Math.round(dmg * 0.25);
  addRes(s, { cenere: cen, ferro: 20 * (tier + 1) });
  s.reliquie += tier >= 2 ? tier - 1 : 0;
  if (tier >= 1) addItem(s, makeItem(s.hero.level + 2, rollRarity(tier)));
  gainXp(s, 40 + dmg * 0.05);
  s.combat = null;
  s.hero.hp = Math.max(1, s.hero.hp);
  s.modal = { kind: 'info', title: T('🗻 Il Colosso di Cenere'), text: T('Hai inflitto {dmg} danni (fascia {tier}). Ricompense: {cen} cenere{oggetto}{reliquie}.', { dmg: dmg, tier: tier, cen: cen, oggetto: tier >= 1 ? T(', un oggetto') : '', reliquie: tier >= 2 ? T(', {tier} reliquie', { tier: tier - 1 }) : '' }) };
}

// Processo alle Proprie Scelte: combattimento di condanna
function finishTrialCombat(s: GameState, won: boolean) {
  s.combat = null;
  if (won) {
    s.trialOutcome = 'integrazione';
    s.reliquie += 3;
    s.dissonance = 0;
    chronicle(s, T('Hai sconfitto il Tribunale degli Echi: le tue scelte sono integrate.'), 'fate');
    s.modal = { kind: 'info', title: T('⚖️ Integrazione'), text: T('Il Tribunale cade. Accusa e difesa diventano una cosa sola: sei tutte le tue scelte. Dissonanza azzerata, +3 reliquie.') };
  } else {
    s.trialOutcome = 'condanna';
    s.nameCorrupted = true;
    s.hero.hp = Math.round(heroStats(s).maxHp * 0.3);
    chronicle(s, T('Il Tribunale degli Echi ti ha condannato. Il tuo nome si corrompe.'), 'fate');
    s.modal = { kind: 'info', title: T('⚖️ Condanna'), text: T('Cadi davanti ai tuoi Fardelli. Il tuo nome si sfalda: da ora la valle lo pronuncerà storpiato.') };
  }
  s.trial = 'done';
  addFlag(s, 'trial_done');
}

export function delveTotalLoot(L: Loot) {
  return L.cenere + L.items.length * 50 + L.reliquie * 200;
}

// Resoconto "Il mondo ricorda": cosa è cambiato durante la spedizione
function buildReport(s: GameState, d: DelveState, success: boolean): GameState['lastReport'] {
  const sn = d.snap;
  const B = BIOMES[d.biome];
  const lines: string[] = [];
  lines.push(success ? T('Sei risalito vivo dal piano {floor}.', { floor: d.floor }) : T('Sei caduto al piano {floor}: la valle ti ha riportato su.', { floor: d.floor }));
  if (!sn) return { title: B.name, good: success, lines };
  const coh = (s.totals.coherent || 0) - sn.coh, inc = (s.totals.incoherent || 0) - sn.inc;
  if (coh + inc > 0) lines.push(T('Hai agito {coh} volte secondo il tuo Fardello e {inc} volte contro.', { coh, inc }));
  const dc = Math.round(s.corruption - sn.corr);
  if (Math.abs(dc) >= 2) lines.push(dc > 0 ? T('La corruzione dentro di te è salita di {n}.', { n: dc }) : T('La corruzione dentro di te è scesa di {n}.', { n: -dc }));
  for (const [f, v] of Object.entries(s.factions)) {
    const dv = Math.round(v - (sn.factions[f] || 0));
    if (Math.abs(dv) >= 2) lines.push(T('{faction}: reputazione {sign}{n}.', { faction: FACTIONS[f as keyof typeof FACTIONS].name, sign: dv > 0 ? '+' : '−', n: Math.abs(dv) }));
  }
  const kept = s.promises.filter(p => p.status === 'kept').length - sn.kept;
  const broken = s.promises.filter(p => p.status === 'broken').length - sn.broken;
  if (kept > 0) lines.push(T('Hai mantenuto {n} promesse.', { n: kept }));
  if (broken > 0) lines.push(T('Hai infranto {n} promesse. Qualcuno ti darà la caccia.', { n: broken }));
  const open = s.promises.filter(p => p.status === 'open');
  if (open.length) lines.push(T('Promessa più vicina alla scadenza: «{text}» ({n} spedizioni).', { text: open.sort((a, b) => a.deadlineDelves - b.deadlineDelves)[0].text, n: Math.max(0, open[0].deadlineDelves) }));
  if (s.influence >= 40 && sn.influence < 40) lines.push(T('Il tuo Fardello è diventato così forte che la sua Ombra ora ti aspetta nei dungeon.'));
  const memories = s.chronicle.filter(c => c.t >= sn.t && (c.kind === 'choice' || c.kind === 'fate')).slice(0, 3);
  for (const m of memories) lines.push('“' + m.text + '”');
  return { title: T('Il mondo ricorda · {biome}', { biome: B.name }), good: success, lines };
}
