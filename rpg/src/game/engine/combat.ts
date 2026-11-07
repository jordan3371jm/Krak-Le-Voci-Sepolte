import { t as T } from '../../i18n';
import type { Combatant, CombatState, GameState, Nature, Skill, Status, StatusType } from '../types';
import { CLASSES, COMPANIONS, DISSONANCE_SKILLS, FARDELLI } from '../data/core';
import { BIOMES, ENEMIES, getSkill } from '../data/enemies';
import { pick } from '../rng';
import { addFlag, cardMod, consMod, hasFlag, toast, valleyFx } from './state';
import { companionStats, hasTalent, heroStats, resonanceMax } from './hero';

const DOT: StatusType[] = ['poison', 'burn', 'bleed'];
let fxId = 1;

// ============================================================
// Creazione dello scontro
// ============================================================
export interface CombatOpts { floor: number; scale: number; title: string; kind: CombatState['kind'] }

export function heroSkills(s: GameState): string[] {
  const list = [...CLASSES[s.classId].skills];
  if (s.fardello) list.push(FARDELLI[s.fardello].signature);
  if (s.aberration) list.push('fauci');
  list.push(...DISSONANCE_SKILLS);
  return list;
}

export function makeEnemy(s: GameState, id: string, floor: number, scale: number, idx: number): Combatant {
  const d = ENEMIES[id];
  const mod = 1 + valleyFx(s).enemy + s.corruption / 400 + (s.delve?.modifiers.includes('sete') ? 0.25 : 0);
  const f = Math.max(0, floor - 1);
  const isWorld = d.tags.includes('world');
  const hp = isWorld ? d.hp : Math.round(d.hp * scale * (1 + 0.075 * f) * mod);
  const atk = Math.round(d.atk * Math.pow(scale, 0.85) * (1 + 0.05 * f) * mod * (isWorld ? 1 + s.hero.level * 0.08 : 1));
  return {
    uid: `e${idx}_${id}_${Math.random().toString(36).slice(2, 6)}`, defId: id, name: d.name, icon: d.icon, side: 'enemy', row: d.row,
    hp, maxHp: hp, atk, def: Math.round(d.def * Math.sqrt(scale) * (1 + 0.03 * f)), crit: d.crit ?? 5, critDmg: 50, dodge: d.dodge ?? 0,
    lifesteal: 0, thorns: 0, speed: d.speed, statuses: [], skills: d.skills, cds: {}, intent: null, tags: [...d.tags], phase: 0,
  };
}

export function startCombat(s: GameState, enemyIds: string[], o: CombatOpts) {
  const st = heroStats(s);
  if (s.hero.hp <= 0) s.hero.hp = 1;
  const hero: Combatant = {
    uid: 'hero', defId: 'hero', name: s.playerName, icon: s.aberration ? '🦷' : CLASSES[s.classId].icon, side: 'party', row: 'front',
    hp: Math.min(s.hero.hp, st.maxHp), maxHp: st.maxHp, atk: st.atk, def: st.def, crit: st.crit, critDmg: st.critDmg, dodge: st.dodge,
    lifesteal: st.lifesteal, thorns: st.thorns, speed: st.speed, statuses: [], skills: heroSkills(s), cds: {}, tags: [],
  };
  const party: Combatant[] = [hero];
  for (const c of s.companions) {
    if (!c.recruited || !c.inParty || c.mission || c.left || c.hp <= 0.05) continue;
    const def = COMPANIONS.find(d => d.id === c.id)!;
    const cs = companionStats(s, c.id);
    party.push({
      uid: `c_${c.id}`, defId: c.id, companionId: c.id, name: c.name, icon: c.icon, side: 'party', row: def.row,
      hp: Math.round(cs.maxHp * c.hp), maxHp: cs.maxHp, atk: cs.atk, def: cs.def, crit: 5, critDmg: 50, dodge: 3, lifesteal: 0, thorns: 0,
      speed: cs.speed, statuses: [], skills: def.skills, cds: {}, tags: [],
    });
    if (party.length >= 3) break;
  }
  if (s.delve?.ghostAlly) {
    party.push({
      uid: 'ghost', defId: 'ghost', name: T('Eroe Fantasma'), icon: '👻', side: 'party', row: 'back',
      hp: Math.round(st.maxHp * 0.6), maxHp: Math.round(st.maxHp * 0.6), atk: Math.round(st.atk * 0.8), def: 4, crit: 10, critDmg: 50, dodge: 15, lifesteal: 0, thorns: 0,
      speed: 8, statuses: [], skills: ['c_spettro'], cds: {}, tags: ['ghost'],
    });
  }
  const enemies = enemyIds.map((id, i) => makeEnemy(s, id, o.floor, o.scale, i));
  // Rivelazione: frammento del sussurro, ascensione giudice, audio
  const sussurro = s.delve && hasFlag(s, 'sussurro_active');
  for (const e of enemies) {
    if (sussurro || s.ascension?.paths.includes('giudice')) e.revealed = true;
  }
  const c: CombatState = {
    kind: o.kind, party, enemies, round: 1, focus: hasTalent(s, 'focus_start') ? 2 : 0, phase: 'player',
    log: [], fx: [], sacrificeBank: 0, echoUsed: 0, damageDealt: 0,
    reviveAvailable: !!(s.ascension?.paths.includes('martire') || hasFlag(s, 'revive_ready')),
    chain: 0, bestChain: 0,
    title: o.title,
  };
  s.combat = c;
  for (const e of enemies) chooseIntent(s, e);
  log(c, `⚔️ ${o.title}`);
  // Iniziativa: il peso del Fardello conta
  const w = s.fardello ? FARDELLI[s.fardello].weight : 3;
  const heroInit = hero.speed + (w <= 2 ? 3 : 0) - (w >= 5 ? 1 : 0);
  const fastest = Math.max(...enemies.map(e => e.speed));
  if (heroInit < fastest && o.kind !== 'worldboss') {
    c.phase = 'enemy';
    log(c, T('💨 I nemici sono più rapidi: agiscono per primi!'));
  } else if (w <= 2) {
    log(c, T('🪶 Fardello leggero: agisci per primo.'));
  }
}

function log(c: CombatState, line: string) {
  c.log.push(line);
  if (c.log.length > 40) c.log.splice(0, c.log.length - 40);
}
function fx(c: CombatState, uid: string, text: string, kind: CombatState['fx'][number]['kind']) {
  c.fx.push({ id: fxId++, uid, text, kind });
  if (c.fx.length > 12) c.fx.splice(0, c.fx.length - 12);
}

// ============================================================
// Utilità
// ============================================================
const alive = (arr: Combatant[]) => arr.filter(x => x.hp > 0);
const st = (u: Combatant, t: StatusType) => u.statuses.find(x => x.type === t);
const pct = (u: Combatant, t: StatusType) => (st(u, t)?.pot || 0) / 100;

export function legalTargets(c: CombatState, skill: Skill, side: 'enemy' | 'party'): Combatant[] {
  const pool = alive(side === 'enemy' ? c.enemies : c.party);
  if (side === 'enemy' && skill.melee) {
    const front = pool.filter(e => e.row === 'front');
    if (front.length) return front;
  }
  return pool;
}

function applyStatus(c: CombatState, target: Combatant, status: Status, source?: Combatant) {
  let pot = status.pot;
  if (DOT.includes(status.type) && pot < 5 && source) pot = Math.max(1, Math.round(source.atk * pot));
  if (status.type === 'shield' && source) pot = Math.round(pot);
  // gli stati inflitti dai nemici durante il loro turno devono sopravvivere alla fine del round
  const dur = target.side === 'party' && source?.side === 'enemy' ? status.dur + 1 : status.dur;
  status = { ...status, dur };
  const ex = st(target, status.type);
  if (ex) {
    ex.dur = Math.max(ex.dur, status.dur);
    ex.pot = status.type === 'shield' ? ex.pot + pot : Math.max(ex.pot, pot);
  } else target.statuses.push({ type: status.type, dur: status.dur, pot });
  fx(c, target.uid, statusLabel(status.type), 'status');
}
export function statusLabel(t: StatusType) {
  return ({ poison: T('☠️ Veleno'), burn: T('🔥 Rogo'), bleed: T('🩸 Sanguina'), weaken: T('📉 Indebolito'), vulnerable: T('🎯 Vulnerabile'), shield: T('🛡️ Scudo'), stun: T('💫 Stordito'), regen: T('💚 Rigenera'), taunt: T('📣 Provoca'), dodgeUp: T('🌫️ Schivata'), atkUp: T('💢 Furia'), defUp: T('🧱 Difesa'), hidden: T('🤫 Invisibile') } as Record<StatusType, string>)[t];
}

interface DmgOpts { ignoreDef?: boolean; forceCrit?: boolean; mult?: number; noDodge?: boolean }
function dealDamage(s: GameState, c: CombatState, att: Combatant, tgt: Combatant, raw: number, o: DmgOpts = {}): number {
  if (tgt.hp <= 0) return 0;
  const dodge = tgt.dodge + (st(tgt, 'dodgeUp')?.pot || 0);
  if (!o.noDodge && Math.random() * 100 < dodge) {
    fx(c, tgt.uid, 'Schivato!', 'miss');
    log(c, T('💨 {tgtName} schiva.', { tgtName: tgt.name }));
    return 0;
  }
  let dmg = raw * (o.mult ?? 1);
  dmg *= 1 + pct(att, 'atkUp');
  dmg *= 1 - pct(att, 'weaken');
  dmg *= 1 + pct(tgt, 'vulnerable');
  if (s.delve?.modifiers.includes('furia_cieca')) dmg *= 1.25;
  const defv = tgt.def * (1 + pct(tgt, 'defUp'));
  if (!o.ignoreDef) dmg *= 100 / (100 + defv * 2.5);
  let crit = o.forceCrit || Math.random() * 100 < att.crit;
  if (att.uid === 'hero' && st(att, 'hidden')) { crit = true; att.statuses = att.statuses.filter(x => x.type !== 'hidden'); }
  if (crit) dmg *= 1 + att.critDmg / 100;
  dmg = Math.max(1, Math.round(dmg * (0.92 + Math.random() * 0.16)));
  // scudo
  const sh = st(tgt, 'shield');
  if (sh) {
    const abs = Math.min(sh.pot, dmg);
    sh.pot -= abs; dmg -= abs;
    if (sh.pot <= 0) tgt.statuses = tgt.statuses.filter(x => x !== sh);
    if (abs > 0) fx(c, tgt.uid, `🛡️ -${abs}`, 'status');
  }
  if (dmg > 0) {
    tgt.hp = Math.max(0, tgt.hp - dmg);
    fx(c, tgt.uid, `${crit ? '💥' : ''}-${dmg}`, crit ? 'crit' : 'dmg');
    if (tgt.side === 'party') {
      c.sacrificeBank += dmg;
      if (tgt.companionId) addWeight(s, c, tgt.companionId, (dmg / tgt.maxHp) * 32 + (crit ? 7 : 0));
      else for (const p of c.party) if (p.companionId && p.hp > 0) addWeight(s, c, p.companionId, (dmg / tgt.maxHp) * 12 + (crit ? 4 : 0));
    }
    if (att.side === 'party') c.damageDealt += dmg;
    if (att.lifesteal > 0) heal(s, c, att, att, dmg * att.lifesteal / 100, true);
    if (tgt.thorns > 0 && att.hp > 0) {
      const back = Math.max(1, Math.round(dmg * tgt.thorns / 100));
      att.hp = Math.max(0, att.hp - back);
      fx(c, att.uid, `🌵-${back}`, 'dmg');
    }
  }
  return dmg;
}

// ============================================================
// Peso emotivo dei compagni (stile Darkest Dungeon): a 100 si spezzano o trovano una Virtù
// ============================================================
const BARKS: Record<string, { broken: string[]; virtue: string[] }> = {
  kael: { broken: [T('«Tomas urlava così. Proprio così.»'), T('«Basta. Non sono il tuo scudo.»')], virtue: [T('«Per Tomas. Per tutti quelli che non ho salvato.»'), T('«Stavolta resto in piedi.»')] },
  lyra: { broken: [T('«Non posso curare tutti… non posso…»'), T('«Le mie mani non smettono di tremare.»')], virtue: [T('«Elara diceva: la paura è solo un\'altra ferita.»'), T('«Nessuno muore oggi. Nessuno.»')] },
  brann: { broken: [T('«Ho giurato… e ho fallito di nuovo.»')], virtue: [T('«Dietro di me. Tutti.»')] },
  mira: { broken: [T('«Brucia. Brucia tutto.»')], virtue: [T('«Una freccia. Un respiro. Un nome in meno.»')] },
};
function bark(id: string, k: 'broken' | 'virtue') { const b = BARKS[id]?.[k] || [T('«…»')]; return b[Math.floor(Math.random() * b.length)]; }

export function addWeight(s: GameState, c: CombatState | null, compId: string, v: number) {
  const comp = s.companions.find(x => x.id === compId);
  if (!comp || comp.left) return;
  if (v > 0) v *= (s.flags.includes('gift2_' + compId) ? 0.75 : 1) * ((s.krak?.level || 0) >= 3 ? 1.5 : 1);
  comp.weight = Math.max(0, Math.min(100, (comp.weight || 0) + v));
  if (comp.weight >= 100 && !comp.mood && c) {
    const p = c.party.find(x => x.companionId === compId);
    const virtueChance = 0.25 + (comp.trust >= 70 ? 0.15 : 0) + (s.fardello === 'sacrificio' ? 0.05 : 0);
    if (Math.random() < virtueChance) {
      comp.mood = 'virtue'; comp.weight = 45;
      if (p) { p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.35); applyStatus(c, p, { type: 'atkUp', dur: 99, pot: 40 }, p); fx(c, p.uid, T('✨ VIRTÙ'), 'echo'); }
      for (const a of c.party) if (a.hp > 0) a.hp = Math.min(a.maxHp, a.hp + a.maxHp * 0.1);
      log(c, T('✨ {n} trova una Virtù! {b}', { n: comp.name, b: bark(compId, 'virtue') }));
    } else {
      comp.mood = 'broken'; comp.weight = 70;
      comp.trust = Math.max(0, comp.trust - 6);
      if (p) fx(c, p.uid, T('💔 SPEZZATO'), 'status');
      log(c, T('💔 {n} si spezza. {b}', { n: comp.name, b: bark(compId, 'broken') }));
    }
  }
}

function heal(s: GameState, c: CombatState, from: Combatant, to: Combatant, amount: number, quiet = false): number {
  if (to.hp <= 0) return 0;
  if (to.uid === 'hero' && from.uid !== 'hero' && s.ascension?.paths.includes('giudice')) return 0;
  let a = amount * (1 + consMod(s, 'heal'));
  if (s.delve?.modifiers.includes('cure_negate')) a *= 0.6;
  if (to.uid === 'hero' && s.fardello === 'sangue') a *= 0.8;
  a = Math.round(a);
  const real = Math.min(a, to.maxHp - to.hp);
  if (real <= 0) return 0;
  to.hp += real;
  if (!quiet || real >= 5) fx(c, to.uid, `+${real}`, 'heal');
  return real;
}

function rawFor(att: Combatant, skill: Skill, s: GameState): number {
  let r = att.atk * skill.power;
  if (att.uid === 'hero' && s.fardello && FARDELLI[s.fardello].weight >= 4) r *= 1.1;
  if (att.uid === 'hero' && s.fardello === 'sacrificio') r *= 1; // bonus vs culto calcolato sotto
  if (att.side === 'party' && att.uid !== 'hero') {
    if (hasTalent(s, 'command')) r *= 1.25;
    if (s.delve?.modifiers.includes('eco_vuota')) r *= 0.7;
  }
  return r;
}

// ============================================================
// Coerenza narrativa: Risonanza / Dissonanza / Corruzione
// ============================================================
function coherence(s: GameState, c: CombatState, natures: Nature[], loud?: boolean) {
  if (!s.fardello) return;
  const F = FARDELLI[s.fardello];
  const coh = natures.some(n => F.coherent.includes(n));
  const inc = natures.some(n => F.incoherent.includes(n));
  let resMult = 1 + valleyFx(s).resonance + cardMod(s, 'resonance') + (s.fullscreen ? 0.25 : 0) + (s.activeElixir === 'lucidita' ? 0.5 : 0) + (s.ascension?.paths.includes('spezzato') ? 0.5 : 0);
  if (s.delve?.modifiers.includes('preghiera') && natures.includes('faith')) resMult *= 2;
  if (coh) {
    let gain = natures.includes('neutral') && natures.length === 1 ? 0.5 : 1.5;
    if (natures.includes('blood') && hasTalent(s, 'blood_res')) gain += 1;
    // Catena di Coerenza: azioni coerenti consecutive amplificano la Risonanza
    if (!(natures.includes('neutral') && natures.length === 1)) {
      c.chain = (c.chain || 0) + 1;
      c.bestChain = Math.max(c.bestChain || 0, c.chain);
      if (c.chain >= 2) log(c, T('🔗 Catena di Coerenza ×{n}', { n: c.chain }));
    }
    const chainMult = 1 + 0.25 * Math.min(4, Math.max(0, (c.chain || 0) - 1));
    s.resonance = Math.min(resonanceMax(s), s.resonance + gain * resMult * chainMult);
    s.influence += 0.3;
    s.totals.coherent = (s.totals.coherent || 0) + 1;
  }
  if (inc) {
    if ((c.chain || 0) >= 2) log(c, T('⛓️ La Catena di Coerenza si spezza.'));
    c.chain = 0;
    s.dissonance = Math.min(15, s.dissonance + (hasTalent(s, 'cheap_dis') ? 1 : 1.5));
    s.totals.incoherent = (s.totals.incoherent || 0) + 1;
    if (Math.random() < 0.3) log(c, T('〰️ Dissonanza: agisci contro il tuo Fardello.'));
  }
  if (loud && s.fardello === 'silenzio') s.dissonance = Math.min(15, s.dissonance + 0.5);
  // Respiro della Corruzione
  if (natures.some(n => n === 'cruel' || n === 'betray' || n === 'blood')) s.corruption = Math.min(100, s.corruption + 1.5);
  if (natures.some(n => n === 'protect' || n === 'faith')) s.corruption = Math.max(0, s.corruption - 1);
}

// ============================================================
// Azioni dell'eroe
// ============================================================
export function canUseSkill(s: GameState, skillId: string): { ok: boolean; why?: string } {
  const c = s.combat;
  const hero = c?.party.find(p => p.uid === 'hero');
  const sk = getSkill(skillId);
  if (!c || !hero || !sk) return { ok: false };
  if ((hero.cds[skillId] || 0) > 0) return { ok: false, why: `Ricarica ${hero.cds[skillId]}` };
  if ((sk.focusCost || 0) > c.focus) return { ok: false, why: `Focus ${sk.focusCost}` };
  if (sk.dissonanceCost) {
    const cost = Math.max(1, sk.dissonanceCost - (hasTalent(s, 'cheap_dis') ? 1 : 0));
    if (s.dissonance < cost) return { ok: false, why: `Dissonanza ${cost}` };
  }
  if (sk.betrayAlly && !alive(c.party).some(p => p.uid !== 'hero' && p.companionId)) return { ok: false, why: T('Nessun compagno') };
  if (sk.burnSupply && s.res.provviste < 2 && (s.delve?.satchel.provviste || 0) < 2) return { ok: false, why: T('2 Provviste') };
  return { ok: true };
}

export function playerAct(s: GameState, skillId: string, targetUid?: string) {
  const c = s.combat;
  if (!c || c.phase !== 'player') return;
  const hero = c.party.find(p => p.uid === 'hero')!;
  const sk = getSkill(skillId);
  if (!sk || !hero.skills.includes(skillId) || !canUseSkill(s, skillId).ok) return;
  c.fx = [];

  // bersaglio
  let target: Combatant | undefined;
  if (sk.target === 'enemy') {
    const legal = legalTargets(c, sk, 'enemy');
    target = legal.find(e => e.uid === targetUid) || legal.sort((a, b) => a.hp - b.hp)[0];
    if (targetUid && !legal.some(e => e.uid === targetUid)) log(c, T('🚫 Bersaglio in retrovia: l\'attacco in mischia colpisce la prima fila.'));
  } else if (sk.target === 'ally') {
    target = alive(c.party).find(p => p.uid === targetUid) || alive(c.party).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  }

  // costi
  if (sk.focusCost) c.focus -= sk.focusCost;
  if (sk.focusGain) c.focus = Math.min(5, c.focus + sk.focusGain);
  if (sk.dissonanceCost) {
    s.dissonance = Math.max(0, s.dissonance - Math.max(1, sk.dissonanceCost - (hasTalent(s, 'cheap_dis') ? 1 : 0)));
    if (skillId === 'patto_oscuro') addFlag(s, 'dark_pact');
  }
  if (sk.selfDamage) {
    let self = Math.round(hero.maxHp * sk.selfDamage * (s.ascension?.paths.includes('spezzato') && sk.natures.includes('sacrifice') ? 1.4 : 1));
    self = Math.min(self, hero.hp - 1);
    hero.hp -= self; c.sacrificeBank += self;
    fx(c, 'hero', `-${self}`, 'dmg');
  }
  hero.cds[skillId] = sk.cooldown;
  const darkBoost = sk.dissonanceCost && hasFlag(s, 'blood_active') ? 1.5 : 1;

  switch (sk.kind) {
    case 'damage': case 'debuff': case 'drain': {
      const targets = sk.target === 'allEnemies' ? alive(c.enemies) : target ? [target] : [];
      for (const t of targets) {
        let mult = darkBoost;
        if (sk.executeBonus && t.hp / t.maxHp < 0.35) mult *= 1 + sk.executeBonus;
        if (s.fardello === 'sacrificio' && t.tags.includes('cult')) mult *= 1.2;
        const hits = sk.hits || 1;
        let total = 0;
        for (let h = 0; h < hits; h++) total += dealDamage(s, c, hero, t, rawFor(hero, sk, s), { ignoreDef: sk.ignoreDef, mult });
        if (sk.status && total >= 0 && t.hp > 0) applyStatus(c, t, sk.status, hero);
        if (sk.kind === 'drain' && total > 0) heal(s, c, hero, hero, total * 0.6);
      }
      log(c, `${sk.icon} ${hero.name}: ${sk.name}${target && sk.target === 'enemy' ? ` → ${target.name}` : ''}`);
      break;
    }
    case 'heal': {
      if (skillId === 'offerta' && target) {
        const amt = Math.round(hero.maxHp * 0.15 * 2);
        heal(s, c, hero, target.uid === 'hero' ? hero : target, amt);
      } else {
        const targets = sk.target === 'allAllies' ? alive(c.party) : target ? [target] : [];
        for (const t of targets) heal(s, c, hero, t, hero.atk * sk.power + t.maxHp * 0.05);
      }
      log(c, `${sk.icon} ${hero.name}: ${sk.name}`);
      break;
    }
    case 'shield': {
      if (target) applyStatus(c, target, { type: 'shield', dur: 2, pot: Math.round(target.maxHp * 0.15 * sk.power) }, hero);
      log(c, `${sk.icon} ${hero.name} protegge ${target?.name}`);
      break;
    }
    case 'buff': {
      if (sk.target === 'allAllies' && sk.status) for (const p of alive(c.party)) applyStatus(c, p, sk.status, hero);
      if (sk.target === 'allAllies' && skillId === 'benedizione') for (const p of alive(c.party)) applyStatus(c, p, { type: 'regen', dur: 3, pot: Math.round(p.maxHp * 0.05) }, hero);
      log(c, `${sk.icon} ${hero.name}: ${sk.name}`);
      break;
    }
  }
  if (sk.selfStatus) applyStatus(c, hero, sk.selfStatus, hero);

  // Tradimento Tattico: un compagno fa da scudo, turno extra
  if (sk.betrayAlly) {
    const ally = alive(c.party).filter(p => p.companionId).sort((a, b) => b.hp - a.hp)[0];
    if (ally) {
      const loss = Math.round(ally.maxHp * sk.betrayAlly);
      ally.hp = Math.max(1, ally.hp - loss);
      fx(c, ally.uid, `-${loss}`, 'dmg');
      const comp = s.companions.find(x => x.id === ally.companionId);
      if (comp) addWeight(s, c, comp.id, 25);
      if (comp) comp.trust = Math.max(0, comp.trust - 12);
      addFlag(s, 'betrayed');
      log(c, T('🗡️ Usi {allyName} come scudo! Turno extra. (Fiducia -12)', { allyName: ally.name }));
    }
  }
  if (sk.burnSupply) {
    if ((s.delve?.satchel.provviste || 0) >= 2) s.delve!.satchel.provviste -= 2; else s.res.provviste -= 2;
  }
  // Ascoltatori: i suoni li infuriano
  if (sk.loud) for (const e of alive(c.enemies)) if (e.tags.includes('listener')) { applyStatus(c, e, { type: 'atkUp', dur: 2, pot: 30 }); log(c, T('👂 {eName} sente il rumore e si infuria!', { eName: e.name })); }

  coherence(s, c, sk.natures, sk.loud);
  if (sk.natures.includes('protect')) for (const p of c.party) if (p.companionId) { const comp = s.companions.find(x => x.id === p.companionId); if (comp) comp.trust = Math.min(100, comp.trust + 1); }

  afterHeroAction(s, !!sk.extraTurn);
}

export function useEcho(s: GameState) {
  const c = s.combat;
  if (!c || c.phase !== 'player' || !s.fardello || s.resonance < resonanceMax(s)) return;
  const hero = c.party.find(p => p.uid === 'hero')!;
  c.fx = [];
  const F = FARDELLI[s.fardello];
  fx(c, 'hero', `✨ ${F.echoName}`, 'echo');
  if (s.fardello === 'sacrificio') {
    for (const e of alive(c.enemies)) dealDamage(s, c, hero, e, hero.atk + c.sacrificeBank, { ignoreDef: true, noDodge: true });
    for (const p of alive(c.party)) applyStatus(c, p, { type: 'shield', dur: 2, pot: Math.round(p.maxHp * 0.2) });
  } else if (s.fardello === 'sangue') {
    const t = alive(c.enemies).sort((a, b) => b.hp - a.hp)[0];
    if (t) {
      const d = dealDamage(s, c, hero, t, hero.atk * 3, { noDodge: true });
      for (const p of alive(c.party)) heal(s, c, hero, p, d / 2);
    }
    s.corruption = Math.min(100, s.corruption + 5);
  } else {
    for (const e of alive(c.enemies)) {
      applyStatus(c, e, { type: 'vulnerable', dur: 3, pot: 40 });
      applyStatus(c, e, { type: 'stun', dur: 1, pot: 1 });
      e.revealed = true;
    }
    for (const e of alive(c.enemies)) dealDamage(s, c, hero, e, hero.atk * 0.8, { noDodge: true });
  }
  log(c, `✨ ${F.echoName}! ${F.echoDesc}`);
  s.resonance = 0;
  c.echoUsed++;
  s.influence += 3;
  s.totals.echoes = (s.totals.echoes || 0) + 1;
  afterHeroAction(s, false);
}

export function heroStunned(s: GameState) {
  const hero = s.combat?.party.find(p => p.uid === 'hero');
  return !!hero && !!st(hero, 'stun');
}
export function skipTurn(s: GameState) {
  const c = s.combat;
  if (!c || c.phase !== 'player') return;
  c.fx = [];
  log(c, T('💫 {partyName} è stordito e perde il turno.', { partyName: c.party[0].name }));
  afterHeroAction(s, false);
}

export function usePotion(s: GameState) {
  const c = s.combat;
  if (!c || c.phase !== 'player' || s.potions <= 0) return;
  const hero = c.party.find(p => p.uid === 'hero')!;
  if ((hero.cds['__potion'] || 0) > 0) return;
  s.potions--;
  const amt = hero.maxHp * 0.4 * (hasTalent(s, 'potion_plus') ? 1.5 : 1);
  c.fx = [];
  heal(s, c, hero, hero, amt);
  hero.cds['__potion'] = 1;
  log(c, T('🧪 Pozione: {heroName} si cura.', { heroName: hero.name }));
}

export function reposition(s: GameState) {
  const c = s.combat;
  if (!c || c.phase !== 'player' || c.repositioned) return;
  const hero = c.party.find(p => p.uid === 'hero')!;
  hero.row = hero.row === 'front' ? 'back' : 'front';
  c.repositioned = true;
  log(c, T('↔️ {heroName} si sposta in {retrovia}.', { heroName: hero.name, retrovia: hero.row === 'front' ? T('prima fila') : 'retrovia' }));
}

// Parola d'Ordine del Fardello (GDD §C)
export function speakWord(s: GameState, word: string): boolean {
  const c = s.combat;
  if (!c || !s.fardello || c.wordUsed) return false;
  const ok = word.trim().toLowerCase() === FARDELLI[s.fardello].secretWord.toLowerCase();
  if (!ok) { log(c, T('❔ "{word}" non risuona.', { word: word })); return false; }
  c.wordUsed = true;
  const liars = alive(c.enemies).filter(e => e.tags.includes('liar'));
  if (!liars.length) { log(c, T('🗝️ La parola risuona, ma qui nessuno mente.')); s.resonance = Math.min(resonanceMax(s), s.resonance + 2); return true; }
  for (const l of liars) { applyStatus(c, l, { type: 'vulnerable', dur: 4, pot: 60 }); l.revealed = true; }
  s.factions.eretici += 3;
  addFlag(s, 'ombre_watch');
  log(c, T('🗝️ "{secretWord}"! Le menzogne si spezzano: punti deboli rivelati. (Le Ombre del Mercato ti hanno sentito.)', { secretWord: FARDELLI[s.fardello].secretWord }));
  return true;
}

function afterHeroAction(s: GameState, extraTurn: boolean) {
  const c = s.combat!;
  checkPhases(s, c);
  if (checkEnd(s, c)) return;
  if (extraTurn) { log(c, T('⏩ Turno extra!')); return; }
  companionsAct(s, c);
  checkPhases(s, c);
  if (checkEnd(s, c)) return;
  c.phase = 'enemy';
}

function companionsAct(s: GameState, c: CombatState) {
  for (const p of alive(c.party)) {
    if (p.uid === 'hero') continue;
    if (st(p, 'stun')) continue;
    const comp = p.companionId ? s.companions.find(x => x.id === p.companionId) : undefined;
    if (comp && comp.trust < 20 && Math.random() < 0.35) { log(c, T('😶 {pName} esita: non si fida di te.', { pName: p.name })); continue; }
    if (comp?.mood === 'broken') {
      const r = Math.random();
      if (r < 0.3) { log(c, T('💔 {n} si rannicchia e non agisce.', { n: p.name })); continue; }
      if (r < 0.5) {
        const victim = alive(c.party).filter(x => x.uid !== p.uid)[Math.floor(Math.random() * (alive(c.party).length - 1))];
        if (victim) { victim.hp = Math.max(1, victim.hp - Math.round(p.atk * 0.6)); fx(c, victim.uid, `-${Math.round(p.atk * 0.6)}`, 'dmg'); log(c, T('💔 {n} colpisce {v} nella furia.', { n: p.name, v: victim.name })); continue; }
      }
      if (r < 0.62) { comp.trust = Math.max(0, comp.trust - 3); log(c, T('💔 {n}: «Perché ti seguo ancora?»', { n: p.name })); }
    }
    const ready = p.skills.map(id => getSkill(id)!).filter(sk => (p.cds[sk.id] || 0) <= 0);
    const hurt = alive(c.party).filter(x => x.hp / x.maxHp < 0.55).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    let sk = ready.find(k => k.kind === 'heal' && hurt) || ready.find(k => k.kind === 'buff' && k.selfStatus?.type === 'taunt' && alive(c.party).some(x => x.uid === 'hero' && x.hp / x.maxHp < 0.5)) || ready.find(k => k.kind === 'damage') || ready[0];
    if (!sk) continue;
    p.cds[sk.id] = sk.cooldown;
    if (sk.kind === 'heal' && hurt) { heal(s, c, p, hurt, p.atk * sk.power + hurt.maxHp * 0.06); log(c, T('{sk} {pName} cura {hurtName}.', { sk: sk.icon, pName: p.name, hurtName: hurt.name })); }
    else if (sk.kind === 'buff') { if (sk.selfStatus) applyStatus(c, p, sk.selfStatus, p); log(c, `${sk.icon} ${p.name}: ${sk.name}`); }
    else {
      const legal = legalTargets(c, sk, 'enemy');
      const t = legal.sort((a, b) => a.hp - b.hp)[0];
      if (!t) continue;
      dealDamage(s, c, p, t, rawFor(p, sk, s), { ignoreDef: sk.ignoreDef });
      if (sk.status && t.hp > 0) applyStatus(c, t, sk.status, p);
      log(c, `${sk.icon} ${p.name} → ${t.name}`);
    }
  }
}

// ============================================================
// Fase nemica
// ============================================================
export function chooseIntent(s: GameState, e: Combatant) {
  const c = s.combat!;
  const ready = e.skills.filter(id => (e.cds[id] || 0) <= 0);
  let pickId = ready.length ? pick(ready) : e.skills[0];
  const healSk = ready.find(id => getSkill(id)?.kind === 'heal');
  if (healSk && e.hp / e.maxHp < 0.4) pickId = healSk;
  const sk = getSkill(pickId)!;
  let targets = alive(c.party).filter(p => !st(p, 'hidden'));
  if (!targets.length) targets = alive(c.party);
  const taunter = targets.find(p => st(p, 'taunt'));
  if (sk.melee) { const front = targets.filter(p => p.row === 'front'); if (front.length) targets = front; }
  let t = taunter && (!sk.melee || taunter.row === 'front') ? taunter : pick(targets);
  if (s.ascension?.paths.includes('martire') && Math.random() < 0.5) t = targets.find(p => p.uid === 'hero') || t;
  e.intent = { skillId: pickId, targetUid: sk.target === 'self' ? e.uid : t?.uid || 'hero', label: `${sk.icon} ${sk.name}${sk.target === 'allEnemies' ? T(' (tutti)') : sk.target === 'self' ? '' : ` → ${t?.name || ''}`}` };
}

export function intentVisible(s: GameState, e: Combatant): boolean {
  if (e.revealed) return true;
  if (e.tags.includes('invisible')) return s.settings.sfx || s.settings.music; // l'audio rivela i nemici invisibili
  if (valleyFxIsEclipse(s) && e.tags.includes('shadow')) return false;
  return true;
}
const valleyFxIsEclipse = (s: GameState) => s.valley.eclipseUntil > Date.now();

export function enemyPhase(s: GameState) {
  const c = s.combat;
  if (!c || c.phase !== 'enemy') return;
  c.fx = [];
  const order = alive(c.enemies).sort((a, b) => b.speed - a.speed);
  const broken = s.promises.filter(p => p.status === 'broken').length;
  for (const e of order) {
    if (e.hp <= 0) continue;
    if (st(e, 'stun')) { log(c, T('💫 {eName} è stordito.', { eName: e.name })); continue; }
    if (!e.intent) chooseIntent(s, e);
    const sk = getSkill(e.intent!.skillId)!;
    e.cds[sk.id] = sk.cooldown;
    let mult = 1;
    if (sk.id === 'e_accusa') mult += 0.15 * broken;
    if (sk.id === 'e_imitazione' && hasFlag(s, 'betrayed') && s.delve?.modifiers.includes('volti_traditi')) mult += 0.2;
    if (sk.kind === 'heal') {
      let amt = e.maxHp * sk.power;
      if (e.defId === 'coro' && (hasFlag(s, 'lied_family') || hasFlag(s, 'name_lied'))) amt *= 1.8;
      heal(s, c, e, e, amt);
      log(c, `${sk.icon} ${e.name}: ${sk.name}`);
    } else if (sk.kind === 'buff') {
      if (sk.selfStatus) applyStatus(c, e, sk.selfStatus, e);
      log(c, `${sk.icon} ${e.name}: ${sk.name}`);
    } else {
      let targets: Combatant[];
      if (sk.target === 'allEnemies') targets = alive(c.party);
      else {
        let t = c.party.find(p => p.uid === e.intent!.targetUid && p.hp > 0 && !st(p, 'hidden'));
        if (!t) {
          let pool = alive(c.party).filter(p => !st(p, 'hidden'));
          if (!pool.length) pool = alive(c.party);
          const taunter = pool.find(p => st(p, 'taunt'));
          if (sk.melee) { const fr = pool.filter(p => p.row === 'front'); if (fr.length) pool = fr; }
          t = taunter || pick(pool);
        }
        targets = t ? [t] : [];
      }
      for (const t of targets) {
        const backRow = sk.melee && t.row === 'back' ? 0.75 : 1;
        const d = dealDamage(s, c, e, t, e.atk * sk.power, { ignoreDef: sk.ignoreDef, mult: mult * backRow });
        if (sk.status && d > 0 && t.hp > 0) applyStatus(c, t, sk.status, e);
        if (sk.kind === 'drain' && d > 0) heal(s, c, e, e, d * 0.5);
      }
      log(c, `${sk.icon} ${e.name}: ${sk.name}${targets.length === 1 ? ` → ${targets[0].name}` : ''}`);
    }
    if (checkHeroDown(s, c)) return;
  }
  endRound(s, c);
}

function checkHeroDown(s: GameState, c: CombatState): boolean {
  const hero = c.party.find(p => p.uid === 'hero')!;
  if (hero.hp > 0) return false;
  if (c.reviveAvailable) {
    c.reviveAvailable = false;
    hero.hp = Math.round(hero.maxHp * 0.5);
    s.flags = s.flags.filter(f => f !== 'revive_ready');
    fx(c, 'hero', T('🕯️ Risorgi!'), 'echo');
    log(c, T('🕯️ {heroName} risorge dalle proprie ceneri!', { heroName: hero.name }));
    return false;
  }
  c.phase = 'lost';
  log(c, T('☠️ {heroName} cade.', { heroName: hero.name }));
  return true;
}

function endRound(s: GameState, c: CombatState) {
  // stati alterati: danni periodici, durata
  for (const u of [...c.party, ...c.enemies]) {
    if (u.hp <= 0) { u.statuses = []; continue; }
    for (const x of u.statuses) {
      if (DOT.includes(x.type)) { u.hp = Math.max(0, u.hp - x.pot); fx(c, u.uid, `${x.type === 'burn' ? '🔥' : x.type === 'bleed' ? '🩸' : '☠️'}-${x.pot}`, 'dmg'); if (u.side === 'enemy') c.damageDealt += x.pot; }
      if (x.type === 'regen') { u.hp = Math.min(u.maxHp, u.hp + x.pot); fx(c, u.uid, `+${x.pot}`, 'heal'); }
    }
    u.statuses = u.statuses.map(x => ({ ...x, dur: x.dur - 1 })).filter(x => x.dur > 0);
    for (const k of Object.keys(u.cds)) u.cds[k] = Math.max(0, u.cds[k] - 1);
  }
  // terreno corrotto nei boss (Scacchiera tattica: la prima fila soffre la corruzione)
  if (c.kind === 'boss' && s.corruption >= 50) {
    for (const p of alive(c.party).filter(p => p.row === 'front')) {
      const d = Math.max(1, Math.round(p.maxHp * 0.03));
      p.hp = Math.max(1, p.hp - d);
      fx(c, p.uid, `🦠-${d}`, 'dmg');
    }
    if (c.round === 1) log(c, T('🦠 Il terreno corrotto ferisce chi sta in prima fila.'));
  }
  if (checkHeroDown(s, c)) return;
  checkPhases(s, c);
  if (checkEnd(s, c)) return;
  c.round++;
  c.repositioned = false;
  // anti-stallo: il dungeon si stringe e i nemici si infuriano
  const enrageAt = c.kind === 'boss' || c.kind === 'shadow' || c.kind === 'trial' ? 22 : 15;
  if (c.round >= enrageAt && c.kind !== 'worldboss') {
    if (c.round === enrageAt) log(c, T('🩸 Il dungeon si stringe: i nemici si infuriano a ogni round!'));
    for (const e of alive(c.enemies)) e.atk = Math.round(e.atk * 1.12);
  }
  for (const e of alive(c.enemies)) chooseIntent(s, e);
  // il Colosso si ritira dopo 10 round
  if (c.kind === 'worldboss' && c.round > 10) { c.phase = 'won'; log(c, T('🗻 Il Colosso si ritira tra le nubi di cenere.')); return; }
  c.phase = 'player';
}

function checkPhases(s: GameState, c: CombatState) {
  for (const e of c.enemies) {
    const def = ENEMIES[e.defId];
    if (!def?.phases || e.hp <= 0) continue;
    const ph = def.phases[e.phase || 0];
    if (ph && e.hp / e.maxHp <= ph.at) {
      e.phase = (e.phase || 0) + 1;
      log(c, `⚠️ ${ph.text}`);
      if (ph.summon && c.enemies.filter(x => x.hp > 0).length < 4) {
        const add = makeEnemy(s, ph.summon, s.delve?.floor || 10, scaleFor(s), c.enemies.length);
        c.enemies.push(add);
        chooseIntent(s, add);
      }
      if (ph.heal) e.hp = Math.min(e.maxHp, e.hp + Math.round(e.maxHp * ph.heal));
    }
  }
}
function scaleFor(s: GameState) {
  const b = s.delve?.biome;
  return b ? BIOMES[b].scale : 1;
}

function checkEnd(s: GameState, c: CombatState): boolean {
  if (c.phase === 'lost') return true;
  const hero = c.party.find(p => p.uid === 'hero')!;
  if (hero.hp <= 0 && checkHeroDown(s, c)) return true;
  if (alive(c.enemies).length === 0) {
    c.phase = 'won';
    for (const e of c.enemies) {
      s.bestiary[e.defId] = (s.bestiary[e.defId] || 0) + 1;
      s.totals.kills = (s.totals.kills || 0) + 1;
    }
    log(c, T('🏆 Vittoria!'));
    return true;
  }
  return false;
}

// ============================================================
// Auto-battaglia (Krak Realm): rotazione + auto-pozione
// ============================================================
export function autoAct(s: GameState) {
  const c = s.combat;
  if (!c || c.phase !== 'player') return;
  const hero = c.party.find(p => p.uid === 'hero')!;
  if (hero.hp / hero.maxHp * 100 < s.settings.autoPotion && s.potions > 0 && !(hero.cds['__potion'] > 0)) usePotion(s);
  if (s.fardello && s.resonance >= resonanceMax(s)) { useEcho(s); return; }
  const skills = hero.skills.filter(id => !DISSONANCE_SKILLS.includes(id)).map(id => getSkill(id)!).filter(sk => canUseSkill(s, sk.id).ok);
  const hurt = alive(c.party).find(p => p.hp / p.maxHp < 0.45);
  let choice = hurt ? skills.find(sk => sk.kind === 'heal' || sk.kind === 'shield') : undefined;
  if (!choice) {
    const coherentFirst = (sk: Skill) => (s.fardello && sk.natures.some(n => FARDELLI[s.fardello!].coherent.includes(n)) ? 1 : 0);
    choice = skills.filter(sk => sk.kind === 'damage' || sk.kind === 'drain' || sk.kind === 'debuff' || (sk.kind === 'buff' && !sk.selfDamage))
      .sort((a, b) => (b.focusCost || 0) - (a.focusCost || 0) || coherentFirst(b) - coherentFirst(a) || b.power - a.power)[0];
  }
  if (!choice) choice = getSkill(hero.skills[0])!;
  if (choice.selfDamage && hero.hp / hero.maxHp < 0.4) choice = getSkill(hero.skills[0])!;
  const target = choice.target === 'enemy' ? legalTargets(c, choice, 'enemy').sort((a, b) => a.hp - b.hp)[0]?.uid : choice.target === 'ally' ? (hurt || hero).uid : undefined;
  playerAct(s, choice.id, target);
}

export function fleeCombat(s: GameState) {
  const c = s.combat;
  if (!c || c.kind === 'boss' || c.kind === 'trial' || c.kind === 'shadow') return;
  c.phase = 'lost';
  c.log.push(T('🏃 Fuggi verso la superficie!'));
  s.flags.push('__fled');
  toast(s, 'Fuga!', 'bad');
}

export function syncPartyBack(s: GameState) {
  const c = s.combat;
  if (!c) return;
  const hero = c.party.find(p => p.uid === 'hero');
  if (hero) s.hero.hp = Math.max(0, hero.hp);
  for (const p of c.party) {
    if (!p.companionId) continue;
    const comp = s.companions.find(x => x.id === p.companionId);
    if (!comp) continue;
    comp.hp = Math.max(0, p.hp / p.maxHp);
    if (comp.trust <= 5 && !comp.left) {
      comp.left = true; comp.inParty = false;
      toast(s, T('{comp} {compName} non si fida più di te e ti abbandona.', { comp: comp.icon, compName: comp.name }), 'bad');
    }
  }
}
