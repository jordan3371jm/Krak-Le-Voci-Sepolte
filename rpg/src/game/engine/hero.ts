import { t as T } from '../../i18n';
import type { GameState, Item, Rarity, Slot, Stats, StatKey } from '../types';
import { ASCENSIONS, CLASSES, COMPANIONS, FARDELLI, TALENTS } from '../data/core';
import { AFFIXES, ORIGINS, RARITY_MULT, RARITY_NAMES, SLOTS, SLOT_INFO } from '../data/world';
import { pick, uid, weighted } from '../rng';
import { addFlag, cardMod, chronicle, consMod, MAX_LEVEL, pay, sanct, stat, toast } from './state';

export function xpForLevel(l: number) {
  return Math.round(50 * Math.pow(l, 1.55));
}

// ---------------- Statistiche ----------------
export function itemPower(it: Item) {
  return 1 + it.plus * 0.08;
}

export function heroStats(s: GameState): Stats {
  const cls = CLASSES[s.classId];
  const L = s.hero.level - 1;
  const st: Stats = { ...cls.base };
  for (const [k, v] of Object.entries(cls.growth)) st[k as StatKey] += (v || 0) * L;
  st.atk += s.hero.paragon * 1;
  st.maxHp += s.hero.paragon * 6;

  // Equipaggiamento
  for (const slot of SLOTS) {
    const id = s.hero.equipped[slot];
    const it = id ? s.inventory.find(i => i.uid === id) : undefined;
    if (!it) continue;
    const p = itemPower(it);
    for (const [k, v] of Object.entries(it.stats)) st[k as StatKey] += (v || 0) * p;
  }
  // Talenti
  for (const tid of s.hero.talents) {
    const t = TALENTS.find(t => t.id === tid);
    if (t?.stats) for (const [k, v] of Object.entries(t.stats)) st[k as StatKey] += v || 0;
  }
  // Ascensione
  if (s.ascension) {
    const part = s.ascension.hybrid ? 0.6 : 1;
    for (const pid of s.ascension.paths) {
      const a = ASCENSIONS[pid];
      for (const [k, v] of Object.entries(a.stats)) st[k as StatKey] += (v || 0) * part;
    }
    if (s.ascension.paths.includes('martire')) st.maxHp *= 0.85;
  }
  // Fardello
  switch (s.fardello) {
    case 'sacrificio': st.maxHp *= 0.9; break;
    case 'sangue': st.atk += 5; st.def -= 2; st.lifesteal += 6; break;
    case 'silenzio': st.speed += 3; st.dodge += 8; break;
  }
  if (s.aberration) { st.atk *= 1.25; st.maxHp *= 1.2; st.def += 3; }
  // Costellazioni complete
  st.lifesteal += consMod(s, 'lifesteal');
  st.critDmg += consMod(s, 'critDmg');
  st.dodge += consMod(s, 'dodge');
  st.atk *= 1 + consMod(s, 'atkPct');
  // Eredità
  const legacy = 1 + sanct(s, 'sangue_antico') / 100 + s.cycle.memorieTotal * 0.015;
  st.atk *= legacy; st.maxHp *= legacy; st.def *= legacy;
  st.maxHp *= 1 + cardMod(s, 'hp');
  // Elisir
  if (s.activeElixir === 'forza') st.atk *= 1.2;
  if (s.activeElixir === 'pietra') st.def *= 1.4;
  if (s.activeElixir === 'vita') st.maxHp *= 1.25;

  st.maxHp = Math.max(20, Math.round(st.maxHp - s.hero.pledgedMaxHp));
  st.atk = Math.max(1, Math.round(st.atk));
  st.def = Math.max(0, Math.round(st.def));
  st.crit = Math.min(75, st.crit);
  st.dodge = Math.min(60, st.dodge);
  st.lifesteal = Math.min(40, st.lifesteal);
  st.critDmg = Math.min(300, st.critDmg);
  st.thorns = Math.min(50, st.thorns);
  return st;
}

export function heroPower(s: GameState) {
  const st = heroStats(s);
  return Math.round(st.atk * 4 + st.maxHp * 0.6 + st.def * 3 + st.crit * 2 + st.dodge * 2);
}

export function clampHeroHp(s: GameState) {
  const max = heroStats(s).maxHp;
  if (s.hero.hp > max) s.hero.hp = max;
  if (s.hero.hp < 0) s.hero.hp = 0;
}

export function companionStats(s: GameState, id: string) {
  const def = COMPANIONS.find(c => c.id === id)!;
  const c = s.companions.find(c => c.id === id)!;
  const L = c.level - 1;
  const legacy = (1 + s.cycle.memorieTotal * 0.015) * (s.flags.includes('gift3_' + id) ? 1.1 : 1);
  return {
    maxHp: Math.round((def.base.maxHp + L * 9) * legacy),
    atk: Math.round((def.base.atk + L * 1.8) * legacy),
    def: Math.round(def.base.def + L * 0.8),
    speed: def.base.speed,
  };
}

// ---------------- Esperienza ----------------
export function gainXp(s: GameState, amount: number) {
  if (amount <= 0) return;
  const mult = 1 + (s.valley.rebirthUntil > Date.now() ? 0.25 : 0);
  s.hero.xp += Math.round(amount * mult);
  while (s.hero.xp >= xpForLevel(s.hero.level)) {
    s.hero.xp -= xpForLevel(s.hero.level);
    if (s.hero.level < MAX_LEVEL) {
      s.hero.level++;
      s.hero.talentPoints++;
      s.hero.hp = heroStats(s).maxHp;
      toast(s, T('⬆️ Livello {level}! +1 Punto Talento', { level: s.hero.level }), 'good');
      chronicle(s, T('Hai raggiunto il livello {level}.', { level: s.hero.level }), 'world');
      if (s.hero.level % 5 === 0) s.potions += 1;
    } else {
      s.hero.paragon++;
      if (s.hero.paragon % 3 === 0) s.hero.talentPoints++;
      toast(s, T('✴️ Oltre il limite: Ascesa {paragon}', { paragon: s.hero.paragon }), 'fate');
    }
  }
}

export function companionXp(s: GameState, id: string, amount: number) {
  const c = s.companions.find(c => c.id === id);
  if (!c) return;
  c.xp += Math.round(amount * (1 + cardMod(s, 'exped') * 1.6));
  while (c.xp >= xpForLevel(c.level) * 0.8) {
    c.xp -= Math.round(xpForLevel(c.level) * 0.8);
    c.level++;
    toast(s, T('{c} {cName} raggiunge il livello {level}', { c: c.icon, cName: c.name, level: c.level }), 'good');
  }
}

// ---------------- Talenti ----------------
export function canUnlockTalent(s: GameState, id: string) {
  const t = TALENTS.find(t => t.id === id);
  if (!t || s.hero.talents.includes(id) || s.hero.talentPoints < 1) return false;
  if (t.requires && !s.hero.talents.includes(t.requires)) return false;
  return true;
}
export function unlockTalent(s: GameState, id: string) {
  if (!canUnlockTalent(s, id)) return;
  const t = TALENTS.find(t => t.id === id)!;
  s.hero.talents.push(id);
  s.hero.talentPoints--;
  // le Vie narrative toccano le fazioni
  const facMap: Record<string, [keyof GameState['factions'], keyof GameState['factions']]> = {
    culto: ['culto', 'guaritori'], capitale: ['capitale', 'eretici'], contadini: ['contadini', 'capitale'], rivolta: ['eretici', 'capitale'],
  };
  const [up, down] = facMap[t.via];
  s.factions[up] += 2; s.factions[down] -= 1;
  toast(s, T('🎓 Talento: {tName}', { tName: t.name }), 'good');
}
export function hasTalent(s: GameState, special: string) {
  return s.hero.talents.some(id => TALENTS.find(t => t.id === id)?.special === special);
}
export function respecTalents(s: GameState) {
  const cost = 100 * s.hero.level;
  if (!pay(s, { cenere: cost })) { toast(s, T('Servono {cost} Cenere', { cost: cost }), 'bad'); return; }
  s.hero.talentPoints += s.hero.talents.length;
  s.hero.talents = [];
  toast(s, T('Talenti azzerati'), 'info');
}

// ---------------- Oggetti ----------------
const STAT_BASE: Record<Slot, [StatKey, number][]> = {
  arma: [['atk', 1.6]],
  scudo: [['def', 0.9], ['maxHp', 3]],
  elmo: [['maxHp', 5], ['def', 0.4]],
  corazza: [['maxHp', 7], ['def', 0.7]],
  stivali: [['speed', 0.08], ['dodge', 0.12], ['maxHp', 2]],
  amuleto: [['crit', 0.15], ['critDmg', 0.5]],
  anello: [['atk', 0.7], ['crit', 0.1]],
};
const AFFIX_SCALE: Record<string, number> = { lifesteal: 0.08, crit: 0.14, def: 0.5, maxHp: 4, critDmg: 0.6, atk: 0.6, dodge: 0.12, thorns: 0.25, speed: 0.06 };

export function rollRarity(bonus = 0, r: () => number = Math.random): Rarity {
  const w: [Rarity, number][] = [
    [0, Math.max(5, 60 - bonus * 12)], [1, 26 + bonus * 2], [2, 10 + bonus * 3], [3, 3 + bonus * 2.2], [4, 0.8 + bonus * 1.2], [5, 0.15 + bonus * 0.5],
  ];
  return weighted(w, r);
}

export function makeItem(ilvl: number, rarity?: Rarity, slot?: Slot, r: () => number = Math.random): Item {
  const sl = slot || pick(SLOTS, r);
  const rar = rarity ?? rollRarity(0, r);
  const mult = RARITY_MULT[rar] * (1 + ilvl * 0.12);
  const stats: Partial<Stats> = {};
  for (const [k, v] of STAT_BASE[sl]) stats[k] = round1(v * mult * (0.85 + r() * 0.3) * (k === 'speed' || k === 'crit' || k === 'dodge' ? 3 : 1));
  const affixes: string[] = [];
  for (let i = 0; i < rar; i++) {
    const a = pick(AFFIXES, r);
    affixes.push(a.name);
    const k = a.stat as StatKey;
    stats[k] = round1((stats[k] || 0) + AFFIX_SCALE[k] * (6 + ilvl) * (0.7 + r() * 0.6));
  }
  const base = pick(SLOT_INFO[sl].bases, r);
  const name = rar === 0 ? base : `${base} ${affixes[0] || ''}`.trim() + (rar >= 3 ? ' ' + T('di {x}', { x: pick(['Krak', 'Vhalzareth', 'Hondovalle', 'Tomas', 'Elara', T('Cenere'), T('Silenzio')], r) }) : '');
  return { uid: uid('it'), name, slot: sl, rarity: rar, ilvl, plus: 0, stats, origin: pick(ORIGINS, r) };
}
const round1 = (n: number) => Math.round(n * 10) / 10;

export function itemScore(it: Item) {
  const st = it.stats;
  return ((st.atk || 0) * 4 + (st.maxHp || 0) * 0.6 + (st.def || 0) * 3 + (st.crit || 0) * 2 + (st.critDmg || 0) * 0.7 + (st.dodge || 0) * 2 + (st.lifesteal || 0) * 2.5 + (st.thorns || 0) * 1 + (st.speed || 0) * 2) * itemPower(it);
}

export function addItem(s: GameState, it: Item) {
  s.inventory.push(it);
  if (it.rarity >= 3) { addFlag(s, 'legendary'); chronicle(s, T('Hai trovato {itName} ({rarity}).', { itName: it.name, rarity: RARITY_NAMES[it.rarity] }), 'loot'); }
  if (s.inventory.length > 80) {
    // scarta automaticamente il peggiore non equipaggiato e non bloccato
    const equipped = new Set(Object.values(s.hero.equipped));
    const cands = s.inventory.filter(i => !equipped.has(i.uid) && !i.locked).sort((a, b) => itemScore(a) - itemScore(b));
    if (cands[0]) salvage(s, cands[0].uid, true);
  }
}

export function equip(s: GameState, itemUid: string) {
  const it = s.inventory.find(i => i.uid === itemUid);
  if (!it) return;
  const before = heroStats(s).maxHp;
  s.hero.equipped[it.slot] = it.uid;
  const after = heroStats(s).maxHp;
  if (after > before) s.hero.hp += after - before;
  clampHeroHp(s);
}
export function unequip(s: GameState, slot: Slot) {
  delete s.hero.equipped[slot];
  clampHeroHp(s);
}
export function autoEquip(s: GameState) {
  for (const slot of SLOTS) {
    const best = s.inventory.filter(i => i.slot === slot).sort((a, b) => itemScore(b) - itemScore(a))[0];
    if (best) s.hero.equipped[slot] = best.uid;
  }
  clampHeroHp(s);
  toast(s, T('Equipaggiato il meglio in ogni slot'), 'good');
}
export function salvageValue(it: Item) {
  return { ferro: Math.round((3 + it.ilvl) * (1 + it.rarity) * 0.8), cenere: Math.round((5 + it.ilvl * 2) * (1 + it.rarity)) };
}
export function salvage(s: GameState, itemUid: string, silent = false) {
  const idx = s.inventory.findIndex(i => i.uid === itemUid);
  if (idx < 0) return;
  const it = s.inventory[idx];
  if (Object.values(s.hero.equipped).includes(itemUid) || it.locked) return;
  const v = salvageValue(it);
  s.res.ferro += v.ferro; s.res.cenere += v.cenere;
  s.inventory.splice(idx, 1);
  if (!silent) toast(s, T('Smontato: +{ferro} ferro, +{cenere} cenere', { ferro: v.ferro, cenere: v.cenere }));
}
export function salvageJunk(s: GameState) {
  const equipped = new Set(Object.values(s.hero.equipped));
  const junk = s.inventory.filter(i => !equipped.has(i.uid) && !i.locked && i.rarity <= 1);
  junk.forEach(i => salvage(s, i.uid, true));
  toast(s, T('Smontati {junk} oggetti comuni e rari', { junk: junk.length }));
}
export function upgradeCost(it: Item) {
  return { ferro: Math.round((10 + it.ilvl * 2) * Math.pow(1.35, it.plus) * (1 + it.rarity * 0.3)), cenere: Math.round((20 + it.ilvl * 4) * Math.pow(1.4, it.plus)) };
}
export function upgradeItem(s: GameState, itemUid: string) {
  const it = s.inventory.find(i => i.uid === itemUid);
  if (!it || it.plus >= 15) return;
  const cost = upgradeCost(it);
  if (!pay(s, cost)) { toast(s, T('Risorse insufficienti'), 'bad'); return; }
  it.plus++;
  toast(s, `${it.name} +${it.plus}`, 'good');
}

// Forgia con minigioco (qualità 0..1 data dal tempismo)
export function forgeCost(s: GameState) {
  const L = s.hero.level;
  return { ferro: 25 + L * 6, legno: 20 + L * 4, cenere: 30 + L * 10 };
}
export function forgeItem(s: GameState, slot: Slot, quality: number) {
  if ((s.village.buildings.fucina || 0) < 1) { toast(s, T('Serve una Fucina nel villaggio'), 'bad'); return; }
  if (!pay(s, forgeCost(s))) { toast(s, T('Risorse insufficienti per forgiare'), 'bad'); return; }
  const bonus = quality * 2.5 + (s.factions.gilde >= 30 ? 0.6 : 0);
  const it = makeItem(s.hero.level + Math.round(quality * 3), rollRarity(bonus), slot);
  it.origin = quality > 0.85 ? T('Forgiato a regola d\'arte nella Fucina di Hondovalle.') : T('Forgiato nella Fucina di Hondovalle.');
  addItem(s, it);
  stat(s, 'forged');
  toast(s, T('🔨 Forgiato: {itName} ({rarity})', { itName: it.name, rarity: RARITY_NAMES[it.rarity] }), it.rarity >= 2 ? 'fate' : 'good');
}

// Pozioni ed elisir (Infermeria / alchimia)
export function potionCost() { return { provviste: 2, cenere: 25 }; }
export function brewPotion(s: GameState) {
  if ((s.village.buildings.infermeria || 0) < 1) { toast(s, T('Serve l\'Infermeria di Elara'), 'bad'); return; }
  if (s.potions >= 10 + (s.village.buildings.infermeria || 0)) { toast(s, T('Borsa delle pozioni piena'), 'bad'); return; }
  if (!pay(s, potionCost())) { toast(s, T('Servono 2 provviste e 25 cenere'), 'bad'); return; }
  s.potions++;
  toast(s, T('🧪 Pozione preparata'), 'good');
}
export const ELIXIRS: Record<string, { name: string; icon: string; desc: string; cost: Partial<GameState['res']> }> = {
  forza: { name: T('Elisir di Forza'), icon: '💪', desc: T('+20% attacco per la prossima spedizione'), cost: { provviste: 3, intuizione: 1, cenere: 60 } },
  pietra: { name: T('Pelle di Pietra'), icon: '🪨', desc: T('+40% difesa per la prossima spedizione'), cost: { provviste: 3, pietra: 80, cenere: 60 } },
  vita: { name: T('Elisir di Vita'), icon: '❤️', desc: T('+25% salute per la prossima spedizione'), cost: { provviste: 4, cenere: 80 } },
  lucidita: { name: T('Lucidità'), icon: '🔮', desc: T('Risonanza +50% per la prossima spedizione'), cost: { intuizione: 2, cenere: 80 } },
};
export function brewElixir(s: GameState, id: string) {
  const e = ELIXIRS[id];
  if (!e) return;
  if ((s.village.buildings.infermeria || 0) < 2) { toast(s, T('Serve l\'Infermeria livello 2'), 'bad'); return; }
  if (!pay(s, e.cost)) { toast(s, T('Risorse insufficienti'), 'bad'); return; }
  s.elixirs[id] = (s.elixirs[id] || 0) + 1;
  toast(s, T('{icon} {name} preparato', { icon: e.icon, name: e.name }), 'good');
}
export function activateElixir(s: GameState, id: string) {
  if (!s.elixirs[id] || s.activeElixir) return;
  s.elixirs[id]--;
  s.activeElixir = id;
  toast(s, T('{id} {idName} attivo fino alla fine della prossima spedizione', { id: ELIXIRS[id].icon, idName: ELIXIRS[id].name }), 'good');
}

// Ascensione del Fardello
export function canAscend(s: GameState) {
  return !!s.fardello && !s.ascension && s.hero.level >= 15 && (s.biomes.cimitero.conquered || s.totals.bosses >= 4);
}
export function ascend(s: GameState, paths: string[]) {
  if (!canAscend(s) || paths.length < 1 || paths.length > 2) return;
  const hybrid = paths.length === 2;
  if (hybrid && s.fragments.findIndex(f => f.defId === 'spezzato') < 0 && s.reliquie < 5) { toast(s, T('L\'Ascensione Parallela richiede un Frammento del Patto Spezzato o 5 reliquie'), 'bad'); return; }
  if (hybrid) {
    const fi = s.fragments.findIndex(f => f.defId === 'spezzato');
    if (fi >= 0) s.fragments.splice(fi, 1); else s.reliquie -= 5;
  }
  s.ascension = { paths, hybrid };
  addFlag(s, 'ascended');
  const names = paths.map(p => ASCENSIONS[p].name).join(' + ');
  chronicle(s, T('Ascensione del Fardello: {ibrido}{names}.', { ibrido: hybrid ? T('(ibrido) ') : '', names: names }), 'fate');
  toast(s, T('⬆️ Ascensione: {names}', { names: names }), 'fate');
  s.influence += 20;
  clampHeroHp(s);
}
export function resonanceMax(s: GameState) {
  if (!s.fardello) return 10;
  let m = FARDELLI[s.fardello].resonanceMax;
  if (s.ascension?.paths.includes('spezzato')) m += 4;
  return m;
}
