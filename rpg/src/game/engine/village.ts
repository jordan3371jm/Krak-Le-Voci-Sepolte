import type { ClassId, FactionId, FardelloId, GameState, ResKey, Resources } from '../types';
import { COMPANIONS, FACTIONS, FACTION_IDS, FARDELLI } from '../data/core';
import { ACHIEVEMENTS, BUILDINGS, DAILY_POOL, EXPEDITIONS, FISH, UPGRADE_THRESHOLDS, type FishDef } from '../data/world';
import { pick, todayKey, uid, weighted } from '../rng';
import { addFlag, addRes, canAfford, cardMod, chronicle, hasFlag, intuitionCap, pay, prodMult, sanct, stat, toast, valleyState } from './state';
import { addItem, companionXp, equip, gainXp, heroStats, makeItem, rollRarity } from './hero';
import { changeRep, checkStars, createPromise, generateDreams, pushValley, randomFragment, refreshMarket, resolveContracts } from './meta';

// ============================================================
// Inizio partita / scelta del Fardello (onboarding < 5 minuti)
// ============================================================
export function beginGame(s: GameState, name: string, classId: ClassId) {
  s.playerName = name.trim().slice(0, 20) || 'Portatore';
  s.classId = classId;
  s.scene = 'game';
  s.tab = 'villaggio';
  s.hero.hp = heroStats(s).maxHp;
  if (s.cycle.heirloom) {
    const h = { ...s.cycle.heirloom, uid: uid('it'), origin: `Eredità del Ciclo ${s.cycle.n - 1}. ${s.cycle.heirloom.origin}` };
    addItem(s, h);
    equip(s, h.uid);
    s.cycle.heirloom = null;
  }
  s.hero.hp = heroStats(s).maxHp;
  chronicle(s, `${s.playerName} arriva a Hondovalle Bassa. La valle brucia. (Ciclo ${s.cycle.n})`, 'world');
  ensureDaily(s);
  refreshMarket(s, true);
}

export function chooseFardello(s: GameState, f: FardelloId) {
  if (s.fardello) return;
  s.fardello = f;
  const F = FARDELLI[f];
  addFlag(s, 'f_any');
  addFlag(s, `f_${f}`);
  if (f === 'sacrificio') { changeRep(s, 'guaritori', 8); changeRep(s, 'contadini', -6); createPromise(s, 'p_tomas'); const k = s.companions.find(c => c.id === 'kael'); if (k) k.trust = 35; }
  if (f === 'sangue') { changeRep(s, 'culto', 10); changeRep(s, 'capitale', 4); changeRep(s, 'contadini', -10); createPromise(s, 'p_ilyas'); createPromise(s, 'p_bambino'); }
  if (f === 'silenzio') { changeRep(s, 'eretici', 6); changeRep(s, 'guaritori', -5); createPromise(s, 'p_testimone'); }
  s.hero.hp = heroStats(s).maxHp;
  chronicle(s, `${F.origin} Ora porti il Fardello: ${F.name}.`, 'fate');
  toast(s, `${F.icon} ${F.name}: il tuo Fardello è stato forgiato`, 'fate');
  checkStars(s);
}

// ============================================================
// Edifici e produzione
// ============================================================
export function buildingCost(s: GameState, id: string): Partial<Resources> {
  const b = BUILDINGS.find(b => b.id === id)!;
  const n = s.village.buildings[id] || 0;
  const disc = 1 - cardMod(s, 'build') - (s.factions.gilde >= 60 ? 0.1 : 0);
  const out: Partial<Resources> = {};
  for (const [k, v] of Object.entries(b.cost)) out[k as ResKey] = Math.ceil((v || 0) * Math.pow(1.15, n) * disc);
  return out;
}
export function buildingUnlocked(s: GameState, id: string) {
  const b = BUILDINGS.find(b => b.id === id)!;
  return !b.unlock || (s.village.buildings[b.unlock.building] || 0) >= b.unlock.count;
}
export function build(s: GameState, id: string) {
  const b = BUILDINGS.find(b => b.id === id);
  if (!b || !buildingUnlocked(s, id)) return;
  const n = s.village.buildings[id] || 0;
  if (b.max && n >= b.max) return;
  if (!pay(s, buildingCost(s, id))) return;
  s.village.buildings[id] = n + 1;
  stat(s, 'built');
  pushValley(s, { prosperity: 0.4 });
  if (n === 0) { toast(s, `${b.icon} ${b.name} costruita!`, 'good'); chronicle(s, `Hai costruito ${b.name} a Hondovalle.`, 'world'); }
}
export function totalBuildings(s: GameState) {
  return Object.values(s.village.buildings).reduce((a, b) => a + b, 0);
}
export function upgradeId(b: string, t: number) { return `${b}_${t}`; }
export function availableUpgrades(s: GameState) {
  const out: { id: string; building: string; threshold: number; cost: Partial<Resources> }[] = [];
  for (const b of BUILDINGS) {
    if (!Object.keys(b.prod).length) continue;
    const n = s.village.buildings[b.id] || 0;
    for (const t of UPGRADE_THRESHOLDS) {
      const id = upgradeId(b.id, t);
      if (n >= t && !s.village.upgrades.includes(id)) {
        const cost: Partial<Resources> = {};
        for (const [k, v] of Object.entries(b.cost)) cost[k as ResKey] = Math.ceil((v || 0) * 12 * Math.pow(t, 1.6));
        out.push({ id, building: b.id, threshold: t, cost });
      }
    }
  }
  return out;
}
export function buyUpgrade(s: GameState, id: string) {
  const u = availableUpgrades(s).find(u => u.id === id);
  if (!u || !pay(s, u.cost)) return;
  s.village.upgrades.push(id);
  const b = BUILDINGS.find(b => b.id === u.building)!;
  toast(s, `⚙️ ${b.name}: produzione ×2`, 'good');
}
export function buyAllUpgrades(s: GameState) {
  let n = 0;
  for (const u of availableUpgrades(s)) if (canAfford(s, u.cost)) { buyUpgrade(s, u.id); n++; }
  if (!n) toast(s, 'Nessun miglioramento acquistabile', 'info');
}

export function productionPerSec(s: GameState): Resources {
  const out: Resources = { cenere: 0, provviste: 0, legno: 0, pietra: 0, ferro: 0, intuizione: 0 };
  const now = Date.now();
  for (const b of BUILDINGS) {
    const n = s.village.buildings[b.id] || 0;
    if (!n) continue;
    const ups = s.village.upgrades.filter(u => u.startsWith(b.id + '_')).length;
    for (const [k, v] of Object.entries(b.prod)) out[k as ResKey] += (v || 0) * n * Math.pow(2, ups);
  }
  // le spedizioni dei compagni sono lavoro: piccola produzione passiva
  for (const k of Object.keys(out) as ResKey[]) out[k] *= prodMult(s, k, now);
  if (s.res.intuizione < 1 && !out.intuizione) out.intuizione = 0.001;
  return out;
}

export function clickValue(s: GameState, k: ResKey) {
  const now = Date.now();
  let v = 1 + totalBuildings(s) * 0.06 + s.hero.level * 0.15;
  v *= 1 + cardMod(s, 'click');
  for (const b of s.events.buffs) if (b.until > now && b.click) v *= b.click;
  if (k === 'provviste') v *= 0.12;
  if (k === 'pietra') v *= 0.7;
  return v;
}
export function gather(s: GameState, k: ResKey) {
  if (!['legno', 'pietra', 'provviste'].includes(k)) return;
  addRes(s, { [k]: clickValue(s, k) });
  stat(s, 'clicks');
}

// ============================================================
// Tick principale (anche offline)
// ============================================================
export function tick(s: GameState, dtMs: number, now = Date.now(), offline = false) {
  if (s.scene !== 'game') { s.lastTick = now; return; }
  const dt = Math.max(0, dtMs) / 1000;
  const p = productionPerSec(s);
  const gained: Partial<Resources> = {};
  for (const k of Object.keys(p) as ResKey[]) gained[k] = p[k] * dt;
  addRes(s, gained);
  s.res.intuizione = Math.min(s.res.intuizione, intuitionCap(s));

  // guarigione al villaggio
  if (!s.delve && !s.combat) {
    const max = heroStats(s).maxHp;
    const rate = 0.01 * (1 + 0.5 * (s.village.buildings.infermeria || 0));
    s.hero.hp = Math.min(max, s.hero.hp + max * rate * dt);
    for (const c of s.companions) if (!c.left) c.hp = Math.min(1, c.hp + rate * dt);
  }
  // esche dello stagno
  const maxBait = baitMax(s);
  const baitEvery = 8 * 60_000 / (cardMod(s, 'fish') ? 2 : 1);
  if (s.bait >= maxBait) s.baitAt = now;
  else while (now - s.baitAt >= baitEvery && s.bait < maxBait) { s.bait++; s.baitAt += baitEvery; }

  // valle che respira: deriva lenta
  const drift = dt / 60;
  const repVals = FACTION_IDS.map(f => s.factions[f]);
  const tensionTarget = Math.min(100, (Math.max(...repVals) - Math.min(...repVals)) / 2);
  s.valley.tension += (tensionTarget - s.valley.tension) * 0.02 * drift;
  const blightTarget = Math.max(20, s.corruption * 0.7);
  s.valley.blight += (blightTarget - s.valley.blight) * 0.015 * drift;
  const prosTarget = Math.min(90, 20 + totalBuildings(s) * 0.5 + s.promises.filter(x => x.status === 'kept').length * 5);
  s.valley.prosperity += (prosTarget - s.valley.prosperity) * 0.015 * drift;
  if (s.valley.eclipseUntil && s.valley.eclipseUntil < now) { s.valley.eclipseUntil = 0; s.flags = s.flags.filter(f => f !== 'eco_eclissi'); }

  if (offline) { s.lastTick = now; return; }

  // eventi del villaggio
  villageEvents(s, now, dt);
  s.events.buffs = s.events.buffs.filter(b => b.until > now);
  // richieste delle fazioni
  if (now >= s.requestsAt) refreshRequests(s, now);
  s.requests = s.requests.filter(r => r.until > now);
  // giorno nuovo
  ensureDaily(s);
  if (s.world.day !== todayKey()) { s.world = { day: todayKey(), bossDamage: 0, bossTries: 0 }; }
  resolveContracts(s);
  checkAchievements(s);
  s.lastTick = now;
}

// Ritorno dopo un'assenza: produzione offline + Salvataggio Vivente
export function catchUp(s: GameState) {
  const now = Date.now();
  const away = now - s.lastTick;
  if (s.scene !== 'game' || away < 60_000) { s.lastTick = now; return; }
  const capH = 8 + (s.cycle.sanctuary.memoria || 0);
  const counted = Math.min(away, capH * 3600_000);
  const before = { ...s.res };
  tick(s, counted, now, true);
  const lines: string[] = [];
  for (const k of Object.keys(before) as ResKey[]) {
    const d = s.res[k] - before[k];
    if (d >= 1) lines.push(`+${Math.floor(d)} ${k}`);
  }
  const hours = away / 3600_000;
  generateDreams(s, hours);
  const ready = s.companions.filter(c => c.mission && c.mission.end <= now).length;
  s.modal = {
    kind: 'welcome',
    title: 'Bentornato a Hondovalle',
    text: `Sei stato via ${fmtAway(away)}${away > counted ? ` (contano fino a ${capH}h)` : ''}. La valle ha continuato a vivere.`,
    lines: [
      ...(lines.length ? [lines.join(' · ')] : []),
      ...(ready ? [`🧭 ${ready} compagni sono tornati dalle spedizioni.`] : []),
      ...(s.dreams.length ? [`🌙 ${s.dreams.length} sogni ti aspettano nel Diario.`] : []),
    ],
  };
}
function fmtAway(ms: number) {
  const h = Math.floor(ms / 3600_000), m = Math.floor((ms % 3600_000) / 60_000);
  return h ? `${h}h ${m}m` : `${m} minuti`;
}

// ============================================================
// Eventi del villaggio: mercante, cervo di cenere, incursioni, cantastorie
// ============================================================
function villageEvents(s: GameState, now: number, dt: number) {
  const E = s.events;
  if (E.cart && E.cart < now) E.cart = 0;
  if (E.deer && E.deer < now) E.deer = 0;
  if (E.threat) {
    const towers = s.village.buildings.torre || 0;
    if (towers) E.threat.hp -= towers * (4 + s.hero.level) * dt;
    if (E.threat.hp <= 0) defeatThreat(s);
    else if (E.threat.until < now) {
      const lostC = Math.floor(s.res.cenere * 0.1), lostL = Math.floor(s.res.legno * 0.1);
      s.res.cenere -= lostC; s.res.legno -= lostL;
      pushValley(s, { blight: 2, tension: 3 });
      toast(s, `🔥 ${E.threat.name} ha saccheggiato il villaggio: -${lostC} cenere, -${lostL} legno`, 'bad');
      chronicle(s, `${E.threat.name} ha razziato Hondovalle.`, 'world');
      E.threat = null;
    }
  }
  if (totalBuildings(s) < 3 || now < E.nextAt || E.cart || E.deer || E.threat) return;
  const vs = valleyState(s);
  const threatW = 25 * (1 + cardMod(s, 'threats')) * (vs === 'Tensione' || vs === 'Cenere' ? 1.6 : 1);
  const kind = weighted<'cart' | 'deer' | 'threat'>([['cart', 35], ['deer', 25], ['threat', threatW]]);
  if (kind === 'cart') E.cart = now + 25_000;
  else if (kind === 'deer') E.deer = now + 15_000;
  else {
    const hp = Math.round(80 * Math.pow(1.25, s.hero.level) + totalBuildings(s) * 8);
    const t = pick([{ name: 'Predoni della Capitale', icon: '🪖' }, { name: 'Lupi di Cenere', icon: '🐺' }, { name: 'Fanatici del Culto', icon: '🕯️' }, { name: 'Ossa Erranti', icon: '💀' }]);
    E.threat = { ...t, hp, maxHp: hp, until: now + 40_000 };
    toast(s, `⚠️ Incursione: ${t.name}! Colpiscili o lascia fare alle torri.`, 'bad');
  }
  E.nextAt = now + (120 + Math.random() * 180) * 1000;
}
export function clickCart(s: GameState) {
  if (!s.events.cart) return;
  s.events.cart = 0;
  const p = productionPerSec(s);
  const k = pick(['legno', 'pietra', 'ferro', 'cenere'] as ResKey[]);
  const amt = Math.max(30, p[k] * 90 + s.hero.level * 10);
  addRes(s, { [k]: amt, cenere: Math.max(20, p.cenere * 30) });
  if (Math.random() < 0.15) { s.potions++; toast(s, '🛒 Il mercante regala anche una pozione!', 'good'); }
  stat(s, 'carts');
  toast(s, `🛒 Mercante generoso: +${Math.floor(amt)} ${k}`, 'good');
}
export function clickDeer(s: GameState) {
  if (!s.events.deer) return;
  s.events.deer = 0;
  const now = Date.now();
  const r = Math.random();
  if (r < 0.45) { s.events.buffs.push({ id: 'deer_prod', label: 'Benedizione di Cenere ×3', until: now + 30_000, prod: 3 }); toast(s, '🦌 Benedizione: produzione ×3 per 30s', 'fate'); }
  else if (r < 0.8) { s.events.buffs.push({ id: 'deer_click', label: 'Frenesia ×10', until: now + 30_000, click: 10 }); toast(s, '🦌 Frenesia: raccolta manuale ×10 per 30s', 'fate'); }
  else { s.res.intuizione = intuitionCap(s); toast(s, '🦌 Sorgente di lucidità: Intuizione piena', 'fate'); }
  stat(s, 'carts');
}
export function hitThreat(s: GameState) {
  const T = s.events.threat;
  if (!T) return;
  const dmg = (5 + heroStats(s).atk * 0.6) * (1 + sanct(s, 'sentinelle') / 100) * (1 + (s.village.buildings.torre || 0) * 0.2);
  T.hp -= dmg;
  if (T.hp <= 0) defeatThreat(s);
}
function defeatThreat(s: GameState) {
  const T = s.events.threat!;
  const mult = 1 + cardMod(s, 'loot') * 2;
  const c = Math.round((40 + s.hero.level * 25) * mult);
  addRes(s, { cenere: c, ferro: Math.round(10 + s.hero.level * 4) });
  if (Math.random() < 0.3 * mult) addItem(s, makeItem(s.hero.level, rollRarity(0.5)));
  gainXp(s, 15 + s.hero.level * 4);
  changeRep(s, 'contadini', 1);
  stat(s, 'threats');
  toast(s, `🛡️ ${T.name} respinti! +${c} cenere`, 'good');
  s.events.threat = null;
}
export function playBard(s: GameState) {
  const now = Date.now();
  if (now < s.events.bardReadyAt) return;
  s.events.bardReadyAt = now + 10 * 60_000;
  s.events.buffs.push({ id: 'bard', label: 'Ballata del Cantastorie ×2', until: now + 90_000, prod: 2 });
  toast(s, '🎻 Il cantastorie racconta la tua storia: produzione ×2 per 90s', 'fate');
}

// ============================================================
// Richieste delle fazioni (ordini del villaggio)
// ============================================================
function refreshRequests(s: GameState, now: number) {
  s.requestsAt = now + 8 * 60_000;
  if (s.requests.length >= 3 || totalBuildings(s) < 4) return;
  const f = pick(FACTION_IDS);
  const p = productionPerSec(s);
  const keys = (['legno', 'pietra', 'ferro', 'provviste', 'cenere'] as ResKey[]).filter(k => p[k] > 0 || k === 'legno');
  const k1 = pick(keys), k2 = pick(keys.filter(k => k !== k1).length ? keys.filter(k => k !== k1) : keys);
  const need: Partial<Resources> = {};
  need[k1] = Math.ceil(Math.max(20, p[k1] * 240) * (k1 === 'provviste' ? 0.3 : 1));
  if (k2 !== k1 && Math.random() < 0.6) need[k2] = Math.ceil(Math.max(15, p[k2] * 160) * (k2 === 'provviste' ? 0.3 : 1));
  const texts: Record<FactionId, string> = {
    culto: 'Il Culto chiede offerte per l\'altare di Vhalzareth.', capitale: 'Il Capitano Marcus requisisce materiali per la guarnigione.',
    gilde: 'Le Gilde ordinano materie prime per i telai.', contadini: 'I contadini chiedono aiuto per ricostruire i fienili.',
    guaritori: 'Elara ha bisogno di scorte per l\'Infermeria.', eretici: 'Gli Eretici cercano materiale per una stamperia clandestina.',
    ombre: 'Una figura senza volto ordina merci "senza domande".', guardiani: 'I Guardiani chiedono pietra per i sigilli.',
  };
  s.requests.push({ uid: uid('rq'), faction: f, need, reward: { cenere: Math.round(60 + s.hero.level * 30), reliquie: Math.random() < 0.15 ? 1 : 0, rep: 6 }, until: now + 30 * 60_000, text: texts[f] });
}
export function completeRequest(s: GameState, ruid: string) {
  const r = s.requests.find(x => x.uid === ruid);
  if (!r || !pay(s, r.need)) return;
  addRes(s, { cenere: r.reward.cenere || 0 });
  if (r.reward.reliquie) s.reliquie += r.reward.reliquie;
  changeRep(s, r.faction, r.reward.rep);
  s.requests = s.requests.filter(x => x.uid !== ruid);
  stat(s, 'requests');
  toast(s, `${FACTIONS[r.faction].icon} Richiesta completata per ${FACTIONS[r.faction].name}`, 'good');
}

// ============================================================
// Compagni e spedizioni in tempo reale
// ============================================================
export function expeditionSlots(s: GameState) { return 1 + (s.village.buildings.locanda || 0); }
export function expeditionDuration(s: GameState, minutes: number) {
  return minutes * 60_000 * (1 - cardMod(s, 'exped')) * (1 - sanct(s, 'sentieri') / 100);
}
export function sendExpedition(s: GameState, compId: string, locId: string) {
  const c = s.companions.find(c => c.id === compId);
  const L = EXPEDITIONS.find(e => e.id === locId);
  if (!c || !L || !c.recruited || c.left || c.mission || s.delve) return;
  if (c.level < L.minLevel) { toast(s, `${c.name} deve essere almeno di livello ${L.minLevel}`, 'bad'); return; }
  if (s.companions.filter(x => x.mission).length >= expeditionSlots(s)) { toast(s, 'Nessuno slot libero: costruisci la Locanda', 'bad'); return; }
  const now = Date.now();
  c.mission = { locId, start: now, end: now + expeditionDuration(s, L.minutes) };
  toast(s, `${c.icon} ${c.name} parte per ${L.name}`, 'info');
}
export function collectExpedition(s: GameState, compId: string) {
  const c = s.companions.find(c => c.id === compId);
  if (!c?.mission || c.mission.end > Date.now()) return;
  const L = EXPEDITIONS.find(e => e.id === c.mission!.locId)!;
  const m = (1 + c.level * 0.12) * Math.sqrt(prodMult(s, 'all'));
  const { reliquie, itemChance, fragmentChance, ...res } = L.rewards;
  const got: Partial<Resources> = {};
  for (const [k, v] of Object.entries(res)) got[k as ResKey] = Math.round((v || 0) * m);
  addRes(s, got);
  const parts = Object.entries(got).map(([k, v]) => `${v} ${k}`);
  if (reliquie) { s.reliquie += reliquie; parts.push(`${reliquie} reliquie`); }
  if (itemChance && Math.random() < itemChance) { const it = makeItem(s.hero.level + 1, rollRarity(0.6 + c.level / 10)); addItem(s, it); parts.push(it.name); }
  if (fragmentChance && Math.random() < fragmentChance) { s.fragments.push({ uid: uid('fr'), defId: randomFragment(s) }); parts.push('un Frammento di Fato'); }
  companionXp(s, c.id, L.minutes * 5);
  c.mission = null;
  stat(s, 'expeditions');
  toast(s, `${c.icon} ${c.name} torna da ${L.name}: ${parts.join(', ')}`, 'good');
}
export function recruit(s: GameState, id: string) {
  const def = COMPANIONS.find(c => c.id === id);
  const c = s.companions.find(c => c.id === id);
  if (!def || !c || c.recruited) return;
  const cost = def.recruitCost || { cenere: 0 };
  if (s.res.cenere < cost.cenere || s.reliquie < (cost.reliquie || 0)) { toast(s, 'Risorse insufficienti', 'bad'); return; }
  if ((s.village.buildings.locanda || 0) < 1) { toast(s, 'Serve la Locanda dei Viandanti', 'bad'); return; }
  s.res.cenere -= cost.cenere; s.reliquie -= cost.reliquie || 0;
  c.recruited = true;
  c.level = Math.max(1, Math.floor(s.hero.level * 0.7));
  if (def.faction) changeRep(s, def.faction, 4);
  chronicle(s, `${c.name} si unisce a te.`, 'world');
  toast(s, `${c.icon} ${c.name} si unisce al gruppo`, 'good');
}
export function toggleParty(s: GameState, id: string) {
  const c = s.companions.find(c => c.id === id);
  if (!c || !c.recruited || c.left || s.delve) return;
  if (!c.inParty && s.companions.filter(x => x.inParty).length >= 2) { toast(s, 'Massimo 2 compagni in spedizione', 'bad'); return; }
  c.inParty = !c.inParty;
}

// ============================================================
// Stagno delle Voci (pesca di memorie)
// ============================================================
export function baitMax(s: GameState) {
  const commons = FISH.filter(f => f.rarity === 0);
  return 5 + (commons.every(f => s.fish.includes(f.id)) ? 1 : 0);
}
export function hasGoldenRod(s: GameState) { return FISH.every(f => s.fish.includes(f.id)); }
export function useBait(s: GameState): boolean {
  if (s.bait <= 0) return false;
  if (s.bait >= baitMax(s)) s.baitAt = Date.now();
  s.bait--;
  return true;
}
export function catchFish(s: GameState, quality: number): FishDef | null {
  const h = new Date().getHours();
  const night = h >= 20 || h < 6;
  const pool = FISH.filter(f => (!f.night || night) && (!f.day || !night));
  const rod = hasGoldenRod(s) ? 0.6 : 0;
  const rarity = weighted<0 | 1 | 2 | 3>([[0, 60 - quality * 25], [1, 25 + quality * 10], [2, 10 + quality * 10 + rod * 10], [3, 2 + quality * 6 + rod * 6]]);
  const cands = pool.filter(f => f.rarity === rarity);
  const f = pick(cands.length ? cands : pool);
  stat(s, 'fished');
  if (!s.fish.includes(f.id)) {
    s.fish.push(f.id);
    s.totals.species = s.fish.length;
    chronicle(s, `Dallo Stagno delle Voci hai ripescato una memoria: ${f.name}. "${f.lore}"`, 'world');
    toast(s, `🎣 Nuova memoria: ${f.name}! +1% produzione`, 'fate');
  } else {
    addRes(s, { cenere: 15 * (f.rarity + 1) * s.hero.level });
    toast(s, `🎣 ${f.name} (già nota): +cenere`, 'info');
  }
  return f;
}

// ============================================================
// Giornaliere e imprese
// ============================================================
export function ensureDaily(s: GameState) {
  const today = todayKey();
  if (s.daily.day === today) return;
  const pool = [...DAILY_POOL];
  const missions = [];
  for (let i = 0; i < 3; i++) {
    const m = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    const target = Math.round(m.base * (1 + s.hero.level / 12) * (m.id === 'd_cenere' ? 1 + s.hero.level / 3 : 1));
    s.totals[`dbase_${m.id}`] = s.totals[m.stat] || 0;
    missions.push({ id: m.id, target, progress: 0, claimed: false });
  }
  s.daily = { day: today, chest: false, missions, bonus: false };
}
export function missionProgress(s: GameState, id: string) {
  const def = DAILY_POOL.find(d => d.id === id)!;
  return (s.totals[def.stat] || 0) - (s.totals[`dbase_${id}`] || 0);
}
export function claimDailyChest(s: GameState) {
  if (s.daily.chest) return;
  s.daily.chest = true;
  addRes(s, { cenere: 100 + s.hero.level * 40, provviste: 3, intuizione: 1 });
  s.potions++;
  if (Math.random() < 0.25) s.reliquie++;
  toast(s, '🎁 Forziere giornaliero aperto', 'good');
}
export function claimMission(s: GameState, id: string) {
  const m = s.daily.missions.find(m => m.id === id);
  if (!m || m.claimed || missionProgress(s, id) < m.target) return;
  m.claimed = true;
  addRes(s, { cenere: 80 + s.hero.level * 30, intuizione: 1 });
  gainXp(s, 30 + s.hero.level * 10);
  toast(s, '✅ Missione giornaliera completata', 'good');
  if (s.daily.missions.every(x => x.claimed) && !s.daily.bonus) {
    s.daily.bonus = true;
    s.reliquie++;
    toast(s, '🏺 Tutte le missioni: +1 reliquia', 'fate');
  }
}
export function checkAchievements(s: GameState) {
  for (const a of ACHIEVEMENTS) {
    if (s.achievements.includes(a.id)) continue;
    let ok = false;
    if (a.flag) ok = a.flag === 'f_any' ? !!s.fardello : hasFlag(s, a.flag);
    else if (a.stat) ok = (a.stat === 'species' ? s.fish.length : a.stat === 'starsLit' ? s.stars.length : s.totals[a.stat] || 0) >= (a.need || 0);
    if (ok) {
      s.achievements.push(a.id);
      toast(s, `🏆 Impresa: ${a.name} (+2% produzione)`, 'fate');
    }
  }
}

// Santuario delle Reliquie
export function sanctuaryCost(s: GameState, id: string) {
  const lvl = s.cycle.sanctuary[id] || 0;
  return Math.ceil(Math.pow(lvl + 1, 1.5));
}
export function buySanctuary(s: GameState, id: string, max: number) {
  const lvl = s.cycle.sanctuary[id] || 0;
  if (lvl >= max) return;
  const c = sanctuaryCost(s, id);
  if (s.reliquie < c) { toast(s, `Servono ${c} reliquie`, 'bad'); return; }
  s.reliquie -= c;
  s.cycle.sanctuary[id] = lvl + 1;
  toast(s, '🏺 Offerta accettata dal Santuario', 'good');
}
