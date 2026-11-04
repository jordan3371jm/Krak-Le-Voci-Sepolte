import type { FactionId, GameState } from '../types';
import { t as T } from '../../i18n';
import { DIALOGUES, TALKERS, QUESTS, type DChoice, type DReq, type SkillCheck } from '../data/dialogues';
import { applyEffect } from './meta';
import { addFlag, chronicle, hasFlag, toast } from './state';
import { heroStats } from './hero';

// ============================================================
// Dialoghi ramificati con prove d20 (stile CRPG)
// ============================================================

export const CHECK_NAME: Record<SkillCheck, string> = {
  persuasione: T('Persuasione'),
  intimidire: T('Intimidire'),
  intuito: T('Intuito'),
  inganno: T('Inganno'),
  sapere: T('Sapere'),
};

/** Bonus del personaggio a una prova: nasce da classe, Fardello, stato e scelte passate. */
export function checkBonus(s: GameState, k: SkillCheck): number {
  const lvl = Math.floor(s.hero.level / 4);
  const st = heroStats(s);
  let b = lvl;
  switch (k) {
    case 'persuasione':
      b += (s.classId === 'custode' ? 2 : 0) + (s.fardello === 'sacrificio' ? 1 : 0) + Math.floor(s.resonance / 4) - (s.aberration ? 3 : 0) - (s.nameCorrupted ? 2 : 0);
      break;
    case 'intimidire':
      b += Math.floor(st.atk / 12) + (s.fardello === 'sangue' ? 2 : 0) + (s.aberration ? 3 : 0) + Math.floor(s.corruption / 30);
      break;
    case 'intuito':
      b += (s.classId === 'veggente' ? 3 : 0) + (s.fardello === 'silenzio' ? 2 : 0) + Math.floor(s.res.intuizione / 5);
      break;
    case 'inganno':
      b += (s.classId === 'lama' ? 2 : 0) + (s.fardello === 'silenzio' ? 1 : 0) + Math.floor(s.dissonance / 3);
      break;
    case 'sapere':
      b += (s.classId === 'veggente' ? 2 : 0) + (s.classId === 'penitente' ? 1 : 0) + Math.min(4, Math.floor(s.stars.length / 3));
      break;
  }
  return b;
}

export function reqOk(s: GameState, r?: DReq): boolean {
  if (!r) return true;
  if (r.flag && !hasFlag(s, r.flag)) return false;
  if (r.flags && !r.flags.every(f => hasFlag(s, f))) return false;
  if (r.noFlag && hasFlag(s, r.noFlag)) return false;
  if (r.anyFlag && !r.anyFlag.some(f => hasFlag(s, f))) return false;
  if (r.fardello && s.fardello !== r.fardello) return false;
  if (r.classId && s.classId !== r.classId) return false;
  if (r.level && s.hero.level < r.level) return false;
  if (r.aberration !== undefined && s.aberration !== r.aberration) return false;
  if (r.res) for (const [k, v] of Object.entries(r.res)) if ((s.res as any)[k] < (v || 0)) return false;
  if (r.reliquie && s.reliquie < r.reliquie) return false;
  if (r.rep) for (const [f, v] of Object.entries(r.rep)) if (s.factions[f as FactionId] < (v || 0)) return false;
  if (r.floor) for (const [b, v] of Object.entries(r.floor)) if (((s.biomes as any)[b]?.best || 0) < (v || 0)) return false;
  if (r.companion && !s.companions.find(c => c.id === r.companion && c.recruited && !c.left)) return false;
  if (r.trust) for (const [id, v] of Object.entries(r.trust)) { const c = s.companions.find(c => c.id === id); if (!c || c.trust < (v || 0)) return false; }
  if (r.quest) for (const [q, st] of Object.entries(r.quest)) if (questStage(s, q) !== st) return false;
  return true;
}

export function questStage(s: GameState, q: string) { return s.quests[q]?.stage ?? 0; }

function setQuest(s: GameState, q: string, stage: number, outcome?: string) {
  const def = QUESTS[q];
  const prev = s.quests[q]?.stage ?? 0;
  s.quests[q] = { stage, done: stage >= 99, outcome: outcome ?? s.quests[q]?.outcome };
  if (!def) return;
  if (prev === 0 && stage > 0) { toast(s, T('📜 Nuova missione: {q}', { q: def.title }), 'fate'); chronicle(s, T('Missione iniziata: {q}.', { q: def.title }), 'choice'); }
  else if (stage >= 99) { toast(s, T('📜 Missione conclusa: {q}', { q: def.title }), 'good'); chronicle(s, T('Missione conclusa: {q}. {o}', { q: def.title, o: outcome || '' }), 'fate'); }
  else if (stage !== prev) toast(s, T('📜 Missione aggiornata: {q}', { q: def.title }), 'info');
}

/** Nodo d'ingresso per un PNG: il primo `entry` con requisiti soddisfatti. */
export function entryNode(s: GameState, npc: string): string | null {
  const d = DIALOGUES[npc];
  if (!d) return null;
  for (const e of d.entries) if (reqOk(s, e.req)) return e.node;
  return null;
}

/** Ha qualcosa di nuovo da dire? (un ingresso diverso dal saluto generico) */
export function npcHasNews(s: GameState, npc: string) {
  const d = DIALOGUES[npc];
  if (!d) return false;
  const n = entryNode(s, npc);
  return !!n && n !== d.idle;
}

export function talkerVisible(s: GameState, npc: string) {
  const tk = TALKERS.find(x => x.id === npc);
  return !!tk && reqOk(s, tk.appear);
}

export function startTalk(s: GameState, npc: string) {
  const node = entryNode(s, npc);
  if (!node) return;
  s.talk = { npc, node, log: [], roll: null };
  pushNodeLine(s);
  addFlag(s, 'met_' + npc);
}

function pushNodeLine(s: GameState) {
  if (!s.talk) return;
  const n = DIALOGUES[s.talk.npc].nodes[s.talk.node];
  if (!n) return;
  if (n.onEnter) applyNode(s, n.onEnter);
  s.talk.log.push({ who: n.speaker || s.talk.npc, text: n.text });
  if (s.talk.log.length > 30) s.talk.log.splice(0, s.talk.log.length - 30);
}

function applyNode(s: GameState, c: Pick<DChoice, 'effect' | 'quest' | 'flags'>) {
  if (c.effect) applyEffect(s, c.effect);
  if (c.flags) c.flags.forEach(f => addFlag(s, f));
  if (c.quest) setQuest(s, c.quest.id, c.quest.stage, c.quest.outcome);
}

export function visibleChoices(s: GameState): { c: DChoice; i: number; ok: boolean }[] {
  if (!s.talk) return [];
  const n = DIALOGUES[s.talk.npc].nodes[s.talk.node];
  if (!n) return [];
  return n.choices.map((c, i) => ({ c, i, ok: reqOk(s, c.req) })).filter(x => x.ok || x.c.showLocked);
}

export function chooseTalk(s: GameState, idx: number, rng: () => number = Math.random) {
  if (!s.talk) return;
  const n = DIALOGUES[s.talk.npc].nodes[s.talk.node];
  const c = n?.choices[idx];
  if (!c || !reqOk(s, c.req)) return;
  s.talk.log.push({ who: 'player', text: c.text });
  let next = c.goto;
  if (c.check) {
    const die = 1 + Math.floor(rng() * 20);
    const bonus = checkBonus(s, c.check.skill);
    const total = die + bonus;
    const ok = die === 20 || (die !== 1 && total >= c.check.dc);
    s.talk.roll = { skill: c.check.skill, die, bonus, dc: c.check.dc, ok };
    s.talk.log.push({ who: 'roll', text: `🎲 ${CHECK_NAME[c.check.skill]}: ${die} ${bonus >= 0 ? '+' : '−'} ${Math.abs(bonus)} = ${total} / ${T('CD')} ${c.check.dc} — ${ok ? (die === 20 ? T('SUCCESSO CRITICO') : T('Successo')) : (die === 1 ? T('FALLIMENTO CRITICO') : T('Fallimento'))}` });
    if (ok) { applyNode(s, c); next = c.goto; }
    else { if (c.failEffect) applyEffect(s, c.failEffect); next = c.fail || c.goto; }
  } else {
    s.talk.roll = null;
    applyNode(s, c);
  }
  if (c.approval) {
    for (const [id, v] of Object.entries(c.approval)) {
      const comp = s.companions.find(x => x.id === id && x.recruited && !x.left);
      if (!comp) continue;
      applyEffect(s, { trust: v, trustOf: id });
      s.talk.log.push({ who: 'approval', text: `${comp.icon} ${comp.name} ${v > 0 ? T('approva') : T('disapprova')}${Math.abs(v) >= 8 ? (v > 0 ? T(' fortemente') : T(' fortemente')) : ''}.` });
    }
  }
  if (!next || next === 'end') { s.talk = null; return; }
  s.talk.node = next;
  pushNodeLine(s);
}

export function endTalk(s: GameState) { s.talk = null; }

export function activeQuests(s: GameState) {
  return Object.entries(s.quests).filter(([id, q]) => QUESTS[id] && q.stage > 0).map(([id, q]) => ({ id, def: QUESTS[id], ...q }));
}
