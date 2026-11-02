import type { ActiveRoom, BiomeId, DelveState, Emotion, GameState, Loot, RoomOption, RoomType } from '../types';
import { BIOMES, DUNGEON_MODIFIERS, ENEMIES } from '../data/enemies';
import { FARDELLI } from '../data/core';
import { EVENTS, type NarrEvent } from '../data/events';
import { BOT_NAMES } from '../data/world';
import { hashStr, mulberry32, pick, weighted } from '../rng';
import { addFlag, addRes, chronicle, emptyLoot, hasFlag, lootMult, stat, toast } from './state';
import { addItem, clampHeroHp, companionXp, gainXp, heroStats, makeItem, rollRarity } from './hero';
import { startCombat, syncPartyBack } from './combat';
import { applyEffect, checkPromises, checkTrial, randomFragment, pushValley } from './meta';

// ------------------------------------------------------------
// Ciclo di vita del dungeon: Seme → Fioritura → Decadimento → Eco
// ------------------------------------------------------------
export function biomeLifecycle(s: GameState, id: BiomeId): { name: string; icon: string; desc: string; enemy: number; loot: number } {
  const b = s.biomes[id];
  if (b.visits === 0) return { name: 'Seme', icon: '🌱', desc: 'Mai visitato. Nasce dalla tua scelta.', enemy: 0, loot: 0 };
  if (b.conquered) return { name: 'Eco', icon: '🔊', desc: 'Lo hai conquistato. Ora ricorda le tue visite.', enemy: 0.05, loot: 0.1 };
  if (Date.now() - b.lastVisit > 20 * 3600_000) return { name: 'Decadimento', icon: '🍂', desc: 'Ignorato troppo a lungo: si è corrotto. Nemici +20%, bottino +30%.', enemy: 0.2, loot: 0.3 };
  return { name: 'Fioritura', icon: '🌺', desc: 'Pieno di nemici, risorse e segreti.', enemy: 0, loot: 0.05 };
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
export function enterDelve(s: GameState, biome: BiomeId, startFloor = 1) {
  if (s.delve) return;
  if (!s.fardello) { toast(s, 'Prima devi scegliere il tuo Fardello', 'bad'); return; }
  if (!biomeUnlocked(s, biome)) { toast(s, 'Conquista prima il dungeon precedente', 'bad'); return; }
  if (s.res.provviste < 1) { toast(s, 'Serve almeno 1 Provvista per scendere', 'bad'); return; }
  if (s.hero.hp < heroStats(s).maxHp * 0.15) { toast(s, 'Sei troppo ferito. Riposa al villaggio o bevi una pozione.', 'bad'); return; }
  s.res.provviste -= 1;
  const emotion = mirrorEmotion(s);
  const r = mulberry32(hashStr(`${s.createdAt}-${biome}-${s.biomes[biome].visits}`));
  const pool = Object.entries(DUNGEON_MODIFIERS);
  const matching = pool.filter(([, m]) => m.emotion === emotion).map(([k]) => k);
  const mods: string[] = [];
  if (matching.length) mods.push(pick(matching, r));
  while (mods.length < 2) { const k = pick(pool, r)[0]; if (!mods.includes(k)) mods.push(k); }
  const d: DelveState = { biome, floor: startFloor, startFloor, satchel: emptyLoot(), doors: [], room: null, floorCleared: false, modifiers: mods, emotion, pledged: 0, log: [] };
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
  chronicle(s, `Sei sceso in ${B.name} (piano ${startFloor}). Tema dello Specchio: ${emotion}.`, 'world');
}

// ------------------------------------------------------------
// Porte (scelta del percorso)
// ------------------------------------------------------------
const ROOM_HINTS: Record<RoomType, string[]> = {
  combat: ['Senti passi e respiri', 'Odore di sangue fresco', 'Ossa che scricchiolano'],
  elite: ['Una presenza pesante', 'Qualcuno ti aspetta', 'Il buio qui ha un volto'],
  event: ['Una voce ti chiama per nome', 'Una luce strana', 'Qualcosa da decidere'],
  trap: ['Il pavimento sembra respirare', 'Fili sottili nel buio', 'Silenzio sospetto'],
  shrine: ['Una candela accesa', 'Aria pulita, per una volta', 'Un altare intatto'],
  treasure: ['Un luccichio', 'Un forziere solitario', 'Monete sparse'],
  ghost: ['Un\'eco di passi non tuoi', 'Un altro portatore è passato di qui', 'Un nome inciso di fresco'],
  shadow: ['Il tuo Fardello ha un\'ombra', 'Qualcuno con il tuo volto', 'Una forma che conosci'],
  hunter: ['Catene che tintinnano', 'Qualcuno ripete le tue promesse', 'Un cacciatore ti segue'],
  boss: ['Il cuore del dungeon batte qui', 'Non c\'è altra strada', 'La fine di questo strato'],
  merchant: ['Una lanterna oscillante', 'Qualcuno contratta col buio', 'Un\'Ombra del Mercato'],
};
export const ROOM_ICONS: Record<RoomType, string> = { combat: '⚔️', elite: '💀', event: '❓', trap: '🕸️', shrine: '🕯️', treasure: '💰', ghost: '👤', shadow: '🖤', hunter: '🔗', boss: '👑', merchant: '🎭' };
export const ROOM_NAMES: Record<RoomType, string> = { combat: 'Scontro', elite: 'Élite', event: 'Evento', trap: 'Trappola', shrine: 'Santuario', treasure: 'Tesoro', ghost: 'Eco di Portatore', shadow: 'Ombra del Fardello', hunter: 'Cacciatore', boss: 'Boss', merchant: 'Mercante Ombra' };

function bossAt(s: GameState): string | null {
  const d = s.delve!;
  const B = BIOMES[d.biome];
  if (d.biome === 'abisso') return d.floor % 10 === 0 ? 'sovrano_vuoto' : null;
  return B.bosses[d.floor] || null;
}

export function genDoors(s: GameState): RoomOption[] {
  const d = s.delve!;
  const r = mulberry32(hashStr(`${s.createdAt}-${d.biome}-${s.biomes[d.biome].visits}-${d.floor}`));
  if (bossAt(s)) return [{ type: 'boss', seed: r() * 1e9, hint: pick(ROOM_HINTS.boss, r) }];
  const broken = s.promises.filter(p => p.status === 'broken').length;
  const shadowReady = s.influence >= 40 && !hasFlag(s, `shadow_floor_${d.floor}`);
  const mod = d.modifiers;
  const w: [RoomType, number][] = [
    ['combat', 40], ['event', 22], ['trap', mod.includes('claustrofobia') ? 14 : 7], ['shrine', mod.includes('reliquiario') ? 14 : 7],
    ['treasure', mod.includes('reliquiario') ? 10 : 5], ['elite', d.floor >= 3 ? 9 : 0], ['ghost', mod.includes('eco_vuota') ? 12 : 6],
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
  return out;
}

// ------------------------------------------------------------
// Stanze
// ------------------------------------------------------------
function biomeScale(s: GameState) {
  const d = s.delve!;
  const B = BIOMES[d.biome];
  return B.scale * (1 + biomeLifecycle(s, d.biome).enemy);
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
  const title = (t: string) => `Piano ${d.floor} · ${t}`;
  switch (opt.type) {
    case 'combat':
      startCombat(s, encounter(s, r), { floor: d.floor, scale, title: title('Scontro'), kind: 'delve' });
      break;
    case 'elite': {
      const ids = [pick(B.elites, r)];
      if (d.floor >= 5) ids.push(pick(B.normal, r));
      startCombat(s, ids, { floor: d.floor, scale, title: title('Élite'), kind: 'delve' });
      break;
    }
    case 'boss': {
      const id = bossAt(s)!;
      const ids = [id];
      if (d.floor >= 10 && d.biome !== 'cimitero' && d.floor !== B.depth) ids.push(pick(B.normal, r));
      startCombat(s, ids, { floor: d.floor, scale, title: title(`Boss: ${ENEMIES[id].name}`), kind: 'boss' });
      break;
    }
    case 'shadow': {
      const sid = FARDELLI[s.fardello!].shadowId;
      addFlag(s, `shadow_floor_${d.floor}`);
      addFlag(s, 'shadow_met');
      room.text = `${FARDELLI[s.fardello!].shadowName} emerge dal tuo Fardello. "Io sono ciò che diventerai."`;
      startCombat(s, [sid], { floor: d.floor, scale: scale * 0.9, title: title(FARDELLI[s.fardello!].shadowName), kind: 'shadow' });
      break;
    }
    case 'hunter':
      room.text = 'Il Cacciatore di Promesse porta le tue parole infrante appese alla cintura.';
      startCombat(s, ['cacciatore_promesse'], { floor: d.floor, scale, title: title('Cacciatore di Promesse'), kind: 'hunter' });
      break;
    case 'event': {
      const ev = pickEvent(s, r);
      if (ev) { room.eventId = ev.id; }
      else { room.type = 'treasure'; openTreasure(s, r); }
      break;
    }
    case 'trap':
      room.text = pick(['Il pavimento cede sotto i tuoi piedi.', 'Lame d\'osso scattano dalle pareti.', 'Un gas verdastro sale dalle crepe.'], r);
      break;
    case 'shrine':
      room.text = 'Un piccolo santuario, intatto. Qui il dungeon trattiene il respiro.';
      break;
    case 'treasure':
      openTreasure(s, r);
      break;
    case 'merchant': {
      room.text = 'Un\'Ombra del Mercato ti offre merci strappate ai caduti. Accetta Cenere della bisaccia o del villaggio.';
      room.merchantItems = [0, 1, 2].map(() => {
        const it = makeItem(ilvl(s), rollRarity(1.2, r), undefined, r);
        return { item: it, price: Math.round((40 + it.ilvl * 12) * (1 + it.rarity * 0.8) * (s.factions.ombre >= 30 ? 0.8 : 1)) };
      });
      break;
    }
    case 'ghost': openGhost(s, r); break;
  }
}

function ilvl(s: GameState) {
  const d = s.delve!;
  return Math.round(BIOMES[d.biome].tier * 8 + d.floor * 0.8);
}

function pickEvent(s: GameState, r: () => number): NarrEvent | null {
  const d = s.delve!;
  const pool = EVENTS.filter(e => e.where !== 'village' && (e.where === 'any' || e.where.includes(d.biome)) && (!e.minFloor || d.floor >= e.minFloor) && (!e.once || !hasFlag(s, `ev_${e.id}`)) && (!e.cond || e.cond(s)));
  if (!pool.length) return null;
  return pick(pool, r);
}

function openTreasure(s: GameState, r: () => number) {
  const d = s.delve!;
  const room = d.room!;
  if (r() < 0.12) {
    room.text = 'Il forziere spalanca le fauci: è un mimic!';
    startCombat(s, [pick(BIOMES[d.biome].normal, r), pick(BIOMES[d.biome].normal, r)], { floor: d.floor, scale: biomeScale(s), title: `Piano ${d.floor} · Mimic`, kind: 'delve' });
    return;
  }
  const m = lootMult(s) * (1 + biomeLifecycle(s, d.biome).loot);
  const c = Math.round((25 + d.floor * 8) * BIOMES[d.biome].scale * m);
  d.satchel.cenere += c;
  d.satchel.ferro += Math.round((4 + d.floor) * m);
  let txt = `Nel forziere: ${c} Cenere e un po' di ferro.`;
  if (r() < 0.55) { const it = makeItem(ilvl(s), rollRarity(0.8, r), undefined, r); d.satchel.items.push(it); txt += ` E ${it.name}.`; }
  if (r() < 0.08) { const f = randomFragment(s, r); d.satchel.fragments.push(f); txt += ' Un Frammento di Fato brilla sul fondo!'; }
  room.text = txt;
  room.resolved = true;
  clearFloor(s);
}

function openGhost(s: GameState, r: () => number) {
  const d = s.delve!;
  const room = d.room!;
  const own = s.legacies.length && r() < 0.5 ? pick(s.legacies, r) : null;
  const name = own ? `${own.name} (tuo Ciclo ${own.cycle})` : pick(BOT_NAMES, r);
  const kind = own ? own.kind : weighted<'ally' | 'enemy' | 'merchant' | 'corpse'>([['ally', 3], ['enemy', 3], ['merchant', 2], ['corpse', 3]], r);
  room.ghostName = name;
  room.ghostKind = kind;
  if (kind === 'enemy') {
    room.text = `L'Eco di ${name} non ha trovato pace. Ti scambia per chi l'ha tradito.`;
    startCombat(s, ['eco_portatore'], { floor: d.floor, scale: biomeScale(s), title: `Eco di ${name}`, kind: 'ghost' });
  } else if (kind === 'ally') {
    room.text = `L'Eco di ${name} cammina con te per il resto della discesa.`;
    d.ghostAlly = true;
    room.resolved = true;
    clearFloor(s);
  } else if (kind === 'merchant') {
    room.text = `${name} è diventato un mercante d'ombra. "Ho tenuto da parte qualcosa per chi sarebbe venuto dopo."`;
    room.merchantItems = [0, 1].map(() => { const it = makeItem(ilvl(s) + 2, rollRarity(1.8, r), undefined, r); return { item: it, price: Math.round((50 + it.ilvl * 12) * (1 + it.rarity * 0.7)) }; });
  } else {
    room.text = `Il corpo di ${name}. Aveva aperto questa porta sacrificando la sua salute, poi è caduto. Completi tu ciò che ha iniziato: il dungeon ricorderà entrambi.`;
    const it = makeItem(ilvl(s) + 3, rollRarity(1.5, r), undefined, r);
    it.origin = `Appartenuto a ${name}, caduto al piano ${d.floor}.`;
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
  const half = s.hero.talents.includes('co3') ? 0.5 : 1;
  if (how === 'disarm') {
    const chance = Math.min(0.9, 0.35 + st.dodge / 100 + st.speed / 50);
    if (Math.random() < chance) { d.room.text = 'Disinneschi il meccanismo. Tra gli ingranaggi, un po\' di ferro.'; d.satchel.ferro += 8 + d.floor; gainXp(s, 10 + d.floor * 2); }
    else { const dmg = Math.round(st.maxHp * 0.18 * half); s.hero.hp = Math.max(1, s.hero.hp - dmg); d.room.text = `Il meccanismo scatta! -${dmg} salute.`; }
  } else if (how === 'endure') {
    const dmg = Math.round(st.maxHp * 0.1 * half); s.hero.hp = Math.max(1, s.hero.hp - dmg); d.room.text = `Attraversi a denti stretti. -${dmg} salute.`;
  } else {
    const dmg = Math.round(st.maxHp * 0.12); s.hero.hp = Math.max(1, s.hero.hp - dmg);
    s.corruption = Math.max(0, s.corruption - 5);
    applyEffect(s, { nature: 'sacrifice' }, 'trap');
    d.room.text = `Offri il tuo sangue: la trappola si placa. -${dmg} salute, la corruzione cala.`;
  }
  d.room.resolved = true;
  clearFloor(s);
}

export function useShrine(s: GameState, how: 'rest' | 'pray' | 'purify') {
  const d = s.delve;
  if (!d?.room || d.room.type !== 'shrine' || d.room.resolved) return;
  const st = heroStats(s);
  if (d.modifiers.includes('reliquiario')) {
    if (s.res.cenere < 30) { toast(s, 'Il Reliquiario chiede 30 Cenere', 'bad'); return; }
    s.res.cenere -= 30;
  }
  if (how === 'rest') {
    if (d.satchel.provviste >= 1) d.satchel.provviste--; else if (s.res.provviste >= 1) s.res.provviste--; else { toast(s, 'Serve 1 Provvista per riposare', 'bad'); return; }
    s.hero.hp = Math.min(st.maxHp, s.hero.hp + Math.round(st.maxHp * 0.45));
    for (const c of s.companions) if (c.inParty && c.hp > 0) c.hp = Math.min(1, c.hp + 0.45);
    d.room.text = 'Consumi una provvista e riposi. Le ferite si chiudono.';
  } else if (how === 'pray') {
    applyEffect(s, { nature: 'faith', resonance: 2 }, 'shrine');
    d.room.text = 'Preghi. Il Fardello vibra, coerente.';
  } else {
    s.corruption = Math.max(0, s.corruption - 15);
    s.dissonance = Math.max(0, s.dissonance - 2);
    d.room.text = 'Purifichi te stesso. La corruzione arretra.';
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
  if (rest > s.res.cenere) { toast(s, 'Cenere insufficiente', 'bad'); return; }
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
    startCombat(s, ch.effect.combat, { floor: d.floor, scale: biomeScale(s), title: `Piano ${d.floor} · ${ev.title}`, kind: 'delve' });
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
    id: 'post_coro', title: 'Le Voci del Coro', icon: '🎶', where: [],
    text: 'Il Coro si sgretola. Le voci di chi avresti potuto salvare ti circondano, in attesa.',
    choices: [
      { text: 'Assorbire le voci nel tuo Fardello', effect: { resonance: 5, hp: -0.2, corruption: -15, influence: 15, flags: ['absorbed_voices'] }, result: 'Il dolore ti attraversa. Le voci trovano pace dentro di te.' },
      { text: 'Ridurle al silenzio per sempre', effect: { dissonance: 4, corruption: 15, flags: ['silenced_voices'], nature: 'cruel' }, result: 'Il silenzio che imponi è più crudele della morte.' },
      { text: 'Liberarle nella valle', effect: { resonance: 3, hp: -0.3, prosperity: 20, flags: ['freed_voices'], fragment: 'voce', nature: 'protect' }, result: 'Le voci si disperdono. Torneranno… ma non ora. Ti lasciano la Voce dei Sopravvissuti.' },
    ],
  },
  madre_vhalzareth: {
    id: 'post_madre', title: 'Il Sangue della Madre', icon: '🩸', where: [],
    text: 'La Madre di Vhalzareth giace nella Fonte. "Prendi il mio posto, figlio. Oppure uccidimi davvero."',
    choices: [
      { text: 'Prendere il suo posto', effect: { factions: { culto: 30, guaritori: -20 }, aberration: true, flags: ['cult_heir', 'aberration'], corruption: 20 }, result: 'Il Culto si inginocchia. La Fonte ora batte con il tuo cuore.' },
      { text: 'Sigillare la Fonte', effect: { factions: { culto: -30, guardiani: 20, guaritori: 15 }, blight: -25, flags: ['fountain_sealed'], nature: 'faith' }, result: 'La Fonte si secca. La palude respira, per la prima volta da secoli.' },
      { text: 'Vendere il suo sangue alle Ombre', effect: { factions: { ombre: 25, gilde: -10 }, reliquie: 3, fragment: 'cenere', flags: ['sold_blood'], nature: 'blood' }, result: 'Le Ombre del Mercato pagano bene. Molto bene.' },
    ],
  },
  cuore_krak: {
    id: 'post_cuore', title: 'Il Silenzio del Cuore', icon: '🫀', where: [],
    text: 'Il Cuore di Krak smette di battere. Tutte le voci sepolte tacciono. Senti la valle aspettare la tua ultima scelta.',
    choices: [
      { text: 'Ascoltare l\'ultima voce', effect: { flags: ['heart_heard'], resonance: 5 }, result: 'La voce dice il tuo nome. Poi tace. Il Ciclo può concludersi.' },
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
    chronicle(s, `Hai sconfitto ${FARDELLI[s.fardello!].shadowName}, l'Ombra del tuo Fardello.`, 'fate');
  }
  if (c.kind === 'hunter') {
    const b = s.promises.find(p => p.status === 'broken');
    if (b) { b.status = 'kept'; b.text += ' (riscattata)'; }
    chronicle(s, 'Hai sconfitto il Cacciatore di Promesse: una promessa infranta è stata riscattata.', 'promise');
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
    chronicle(s, `Hai sconfitto ${ENEMIES[bossId].name} al piano ${d.floor}.`, 'combat');
    const B = BIOMES[d.biome];
    if (B.depth && d.floor >= B.depth) {
      s.biomes[d.biome].conquered = true;
      toast(s, `🏆 ${B.name} conquistato!`, 'fate');
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
  if (B.depth && d.floor >= B.depth) { toast(s, 'Sei sul fondo di questo strato. Torna in superficie.', 'info'); return; }
  const cost = descendCost(s);
  if (cost.provviste) {
    if (d.satchel.provviste >= 1) d.satchel.provviste--; else s.res.provviste--;
  } else if (pledge) {
    d.pledged += cost.pledge;
    s.hero.pledgedMaxHp += cost.pledge;
    clampHeroHp(s);
    chronicle(s, `Hai pegnorato ${cost.pledge} salute massima futura per continuare.`, 'fate');
    toast(s, `⛓️ Pegno: -${cost.pledge} salute massima`, 'bad');
  } else return;
  if (d.modifiers.includes('decimo')) s.res.cenere = Math.max(0, s.res.cenere - 5);
  d.floor++;
  d.room = null;
  d.floorCleared = false;
  d.doors = genDoors(s);
  // allucinazioni del Sacrificio nei piani profondi
  if (s.fardello === 'sacrificio' && d.floor >= 12 && Math.random() < 0.15) toast(s, '👁️ Per un istante vedi Tomas tra le ombre…', 'fate');
}

export function bankAndLeave(s: GameState) {
  const d = s.delve;
  if (!d || s.combat) return;
  if (d.room && !d.room.resolved && d.room.type !== 'merchant') { toast(s, 'Risolvi prima la stanza', 'bad'); return; }
  const L = d.satchel;
  addRes(s, { cenere: L.cenere, legno: L.legno, pietra: L.pietra, ferro: L.ferro, provviste: L.provviste });
  s.reliquie += L.reliquie;
  for (const it of L.items) addItem(s, it);
  for (const f of L.fragments) s.fragments.push({ uid: `fr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, defId: f });
  const refund = Math.floor(d.pledged / 2);
  s.hero.pledgedMaxHp = Math.max(0, s.hero.pledgedMaxHp - refund);
  toast(s, `🎒 Bottino al sicuro: ${L.cenere} cenere, ${L.items.length} oggetti${L.reliquie ? `, ${L.reliquie} reliquie` : ''}`, 'good');
  chronicle(s, `Sei risalito da ${BIOMES[d.biome].name} al piano ${d.floor} con la bisaccia piena.`, 'loot');
  endDelve(s, true);
}

function fleeDelve(s: GameState) {
  const d = s.delve!;
  const L = d.satchel;
  addRes(s, { cenere: Math.round(L.cenere / 2), legno: Math.round(L.legno / 2), pietra: Math.round(L.pietra / 2), ferro: Math.round(L.ferro / 2) });
  toast(s, '🏃 Sei fuggito: metà della bisaccia è persa.', 'bad');
  chronicle(s, `Sei fuggito da ${BIOMES[d.biome].name} al piano ${d.floor}.`, 'combat');
  s.hero.hp = Math.max(1, s.hero.hp);
  endDelve(s, false);
}

function deathInDelve(s: GameState) {
  const d = s.delve!;
  const L = d.satchel;
  addRes(s, { cenere: Math.round(L.cenere / 4), legno: Math.round(L.legno / 4), pietra: Math.round(L.pietra / 4), ferro: Math.round(L.ferro / 4) });
  if (L.items.length) addItem(s, L.items.sort((a, b) => b.rarity - a.rarity)[0]);
  s.hero.deaths++;
  s.hero.hp = Math.round(heroStats(s).maxHp * 0.3);
  s.valley.blight = Math.min(100, s.valley.blight + 2);
  if (d.pledged) chronicle(s, `Sei caduto: il pegno di ${d.pledged} salute massima diventa permanente (Elara può scioglierlo).`, 'fate');
  toast(s, '☠️ Sei caduto. La valle ti riporta in superficie. Hai perso gran parte della bisaccia.', 'bad');
  chronicle(s, `Sei caduto al piano ${d.floor} di ${BIOMES[d.biome].name}.`, 'combat');
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
  s.tab = 'villaggio';
  const ev = EVENTS.filter(e => e.where === 'village' && (!e.once || !hasFlag(s, `ev_${e.id}`)) && (!e.cond || e.cond(s)));
  if (ev.length && Math.random() < 0.85) {
    s.modal = { kind: 'event', eventId: ev[0].id };
  }
}

// Boss mondiale condiviso (Krak Realm: World Boss)
export function startWorldBoss(s: GameState) {
  if (s.delve || s.combat) return;
  if (s.world.bossTries >= 3) { toast(s, 'Hai già affrontato il Colosso 3 volte oggi', 'bad'); return; }
  if (s.hero.hp < heroStats(s).maxHp * 0.3) { toast(s, 'Sei troppo ferito', 'bad'); return; }
  s.world.bossTries++;
  startCombat(s, ['colosso'], { floor: 1, scale: 1, title: 'Boss Mondiale: Il Colosso di Cenere', kind: 'worldboss' });
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
  s.modal = { kind: 'info', title: '🗻 Il Colosso di Cenere', text: `Hai inflitto ${dmg} danni (fascia ${tier}). Ricompense: ${cen} cenere${tier >= 1 ? ', un oggetto' : ''}${tier >= 2 ? `, ${tier - 1} reliquie` : ''}.` };
}

// Processo alle Proprie Scelte: combattimento di condanna
function finishTrialCombat(s: GameState, won: boolean) {
  s.combat = null;
  if (won) {
    s.trialOutcome = 'integrazione';
    s.reliquie += 3;
    s.dissonance = 0;
    chronicle(s, 'Hai sconfitto il Tribunale degli Echi: le tue scelte sono integrate.', 'fate');
    s.modal = { kind: 'info', title: '⚖️ Integrazione', text: 'Il Tribunale cade. Accusa e difesa diventano una cosa sola: sei tutte le tue scelte. Dissonanza azzerata, +3 reliquie.' };
  } else {
    s.trialOutcome = 'condanna';
    s.nameCorrupted = true;
    s.hero.hp = Math.round(heroStats(s).maxHp * 0.3);
    chronicle(s, 'Il Tribunale degli Echi ti ha condannato. Il tuo nome si corrompe.', 'fate');
    s.modal = { kind: 'info', title: '⚖️ Condanna', text: 'Cadi davanti ai tuoi Fardelli. Il tuo nome si sfalda: da ora la valle lo pronuncerà storpiato.' };
  }
  s.trial = 'done';
  addFlag(s, 'trial_done');
}

export function delveTotalLoot(L: Loot) {
  return L.cenere + L.items.length * 50 + L.reliquie * 200;
}
