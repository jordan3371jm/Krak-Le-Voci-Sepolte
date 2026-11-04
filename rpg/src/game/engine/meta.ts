import { t as T } from '../../i18n';
import type { FactionId, FardelloId, GameState, Item, Listing, Nature, ValleyState } from '../types';
import { ASCENSIONS, FACTIONS, FARDELLI, TALENTS } from '../data/core';
import type { Effect } from '../data/events';
import { PROMISES } from '../data/events';
import { BOT_NAMES, CONSTELLATIONS, ENDINGS, FATE_CARDS, FRAGMENTS, STARS, RES_INFO } from '../data/world';
import { clamp, hashStr, mulberry32, pick, todayKey, uid } from '../rng';
import { addFlag, addRes, cardMod, chronicle, hasFlag, newGame, stat, toast, valleyState } from './state';
import { addItem, clampHeroHp, gainXp, hasTalent, heroStats, itemScore, makeItem, resonanceMax, rollRarity, salvageValue } from './hero';
import { startCombat } from './combat';

// ============================================================
// Effetti narrativi
// ============================================================
export function changeRep(s: GameState, f: FactionId, v: number) {
  const mult = valleyState(s) === 'Tensione' ? 1.5 : 1;
  s.factions[f] = clamp(s.factions[f] + v * mult, -100, 100);
  if (v > 0) {
    const opp = FACTIONS[f].opposite;
    s.factions[opp] = clamp(s.factions[opp] - v * 0.4 * mult, -100, 100);
  }
  s.valley.tension = clamp(s.valley.tension + Math.abs(v) * 0.15, 0, 100);
}

export function pushValley(s: GameState, d: { prosperity?: number; blight?: number; tension?: number }) {
  if (d.prosperity) s.valley.prosperity = clamp(s.valley.prosperity + d.prosperity, 0, 100);
  if (d.blight) s.valley.blight = clamp(s.valley.blight + d.blight, 0, 100);
  if (d.tension) s.valley.tension = clamp(s.valley.tension + d.tension, 0, 100);
}

export function natureOutOfCombat(s: GameState, n: Nature) {
  if (!s.fardello) return;
  const F = FARDELLI[s.fardello];
  const mult = 1 + (s.fullscreen ? 0.25 : 0) + cardMod(s, 'resonance');
  if (F.coherent.includes(n)) { s.resonance = Math.min(resonanceMax(s), s.resonance + 2 * mult); s.influence += 2; stat(s, 'coherent'); }
  if (F.incoherent.includes(n)) { s.dissonance = Math.min(15, s.dissonance + 2); stat(s, 'incoherent'); }
  if (n === 'cruel' || n === 'betray' || n === 'blood') s.corruption = Math.min(100, s.corruption + 3);
  if (n === 'protect' || n === 'faith') s.corruption = Math.max(0, s.corruption - 2);
}

export function applyEffect(s: GameState, e: Effect, source = '') {
  const inDelve = !!s.delve;
  if (e.res) {
    if (inDelve) {
      const pos: Record<string, number> = {};
      for (const [k, v] of Object.entries(e.res)) if ((v || 0) > 0 && k !== 'intuizione') pos[k] = v!;
      for (const [k, v] of Object.entries(pos)) (s.delve!.satchel as any)[k] += v;
      const rest: Record<string, number> = {};
      for (const [k, v] of Object.entries(e.res)) if (!(k in pos)) rest[k] = v!;
      addRes(s, rest);
    } else addRes(s, e.res);
  }
  if (e.satchel) {
    if (inDelve) for (const [k, v] of Object.entries(e.satchel)) { if (typeof v === 'number') (s.delve!.satchel as any)[k] += v; }
    else addRes(s, e.satchel as any);
  }
  if (e.reliquie) s.reliquie = Math.max(0, s.reliquie + e.reliquie);
  if (e.hp) {
    const max = heroStats(s).maxHp;
    s.hero.hp = clamp(Math.round(s.hero.hp + max * e.hp), 1, max);
  }
  if (e.resonance) s.resonance = clamp(s.resonance + e.resonance * (e.resonance > 0 && s.fullscreen ? 1.25 : 1), 0, resonanceMax(s));
  if (e.dissonance) s.dissonance = clamp(s.dissonance + e.dissonance, 0, 15);
  if (e.corruption) s.corruption = clamp(s.corruption + e.corruption, 0, 100);
  if (e.factions) for (const [f, v] of Object.entries(e.factions)) changeRep(s, f as FactionId, v || 0);
  if (e.flags) e.flags.forEach(f => addFlag(s, f));
  if (e.promise) createPromise(s, e.promise);
  if (e.xp) gainXp(s, e.xp);
  if (e.item !== undefined) {
    const it = makeItem(s.hero.level + 2, rollRarity(e.item + 0.5));
    if (inDelve) s.delve!.satchel.items.push(it); else addItem(s, it);
  }
  if (e.fragment) {
    const f = e.fragment === 'random' ? randomFragment(s) : e.fragment;
    if (inDelve) s.delve!.satchel.fragments.push(f); else s.fragments.push({ uid: uid('fr'), defId: f });
    toast(s, `${FRAGMENTS[f].icon} ${FRAGMENTS[f].name}`, 'fate');
  }
  if (e.loseFragment && s.fragments.length) s.fragments.shift();
  if (e.influence) s.influence = Math.max(0, s.influence + e.influence);
  if (e.trust) {
    for (const c of s.companions) {
      if (e.trustOf ? c.id !== e.trustOf : !c.inParty) continue;
      c.trust = clamp(c.trust + e.trust, 0, 100);
      if (c.trust <= 5 && !c.left) {
        c.left = true; c.inParty = false;
        chronicle(s, T('{cName} ha perso ogni fiducia in te e se n\'è andato.', { cName: c.name }), 'choice');
        toast(s, T('{c} {cName} ti abbandona.', { c: c.icon, cName: c.name }), 'bad');
      }
    }
  }
  if (e.aberration && !s.aberration) {
    s.aberration = true;
    addFlag(s, 'aberration');
    chronicle(s, T('Il tuo corpo è cambiato: sei un\'Aberrazione. Alcuni PNG non ti parlano più.'), 'fate');
    toast(s, T('🦷 Sei diventato un\'Aberrazione'), 'fate');
    clampHeroHp(s);
  }
  if (e.nature) natureOutOfCombat(s, e.nature);
  if (e.prosperity) pushValley(s, { prosperity: e.prosperity });
  if (e.blight) pushValley(s, { blight: e.blight });
  if (e.companion) { const c = s.companions.find(c => c.id === e.companion); if (c) c.recruited = true; }
  stat(s, 'choices');
  if (source) chronicle(s, `${source}.`, 'choice');
  checkPromises(s);
  checkStars(s);
  checkTrial(s);
}

// ============================================================
// Promesse Differite
// ============================================================
export function createPromise(s: GameState, defId: string) {
  const def = PROMISES[defId];
  if (!def || s.promises.some(p => p.defId === defId && p.status === 'open')) return;
  s.promises.push({ uid: uid('pr'), defId, text: def.text, createdAt: Date.now(), deadlineDelves: def.deadline, status: 'open' });
  chronicle(s, T('Hai promesso: "{text}"', { text: def.text }), 'promise');
  toast(s, T('🔗 Promessa: {text}', { text: def.text }), 'fate');
}

export function checkPromises(s: GameState) {
  for (const p of s.promises) {
    if (p.status !== 'open') continue;
    const def = PROMISES[p.defId];
    let res: 'kept' | 'broken' | null = null;
    if (def.brokenFlag && hasFlag(s, def.brokenFlag)) res = 'broken';
    else if ((def.keptFlag && hasFlag(s, def.keptFlag)) || def.keptCheck?.(s)) res = 'kept';
    else if (p.deadlineDelves <= 0) res = def.keepOnExpire ? 'kept' : 'broken';
    if (!res) continue;
    p.status = res;
    if (res === 'kept') {
      s.resonance = Math.min(resonanceMax(s), s.resonance + 3);
      const f = pick(['fioritura', 'memoria', 'purezza', 'voce']);
      s.fragments.push({ uid: uid('fr'), defId: f });
      changeRep(s, 'contadini', 3); changeRep(s, 'guaritori', 3);
      pushValley(s, { prosperity: 5 });
      addFlag(s, 'promise_kept');
      chronicle(s, T('Promessa mantenuta: "{text}"', { text: p.text }), 'promise');
      toast(s, T('✨ Promessa mantenuta! +3 Risonanza, {fName}', { fName: FRAGMENTS[f].name }), 'good');
    } else {
      s.dissonance = Math.min(15, s.dissonance + 4);
      changeRep(s, 'contadini', -3);
      pushValley(s, { blight: 5 });
      addFlag(s, 'promise_broken');
      chronicle(s, T('Promessa infranta: "{text}". Un Cacciatore di Promesse ti cerca.', { text: p.text }), 'promise');
      toast(s, T('💔 Promessa infranta: {text}', { text: p.text }), 'bad');
    }
  }
}

// ============================================================
// Processo alle Proprie Scelte (GDD §11.7)
// ============================================================
export function checkTrial(s: GameState) {
  if (s.trial !== 'none' || !s.fardello) return;
  if (s.biomes.paludi.conquered || (s.hero.level >= 14 && (s.totals.choices || 0) >= 15)) {
    s.trial = 'pending';
    if (!s.combat) s.modal = { kind: 'trial' };
  }
}
export function trialScores(s: GameState) {
  const broken = s.promises.filter(p => p.status === 'broken');
  const kept = s.promises.filter(p => p.status === 'kept');
  const acc: string[] = broken.map(p => T('Promessa infranta: "{text}"', { text: p.text }));
  if (hasFlag(s, 'killed_innocent')) acc.push(T('Hai ucciso un ragazzo che implorava pietà.'));
  if (hasFlag(s, 'betrayed')) acc.push(T('Hai usato i tuoi compagni come scudi.'));
  if (hasFlag(s, 'lied_family')) acc.push(T('Hai mentito alla madre di Tomas.'));
  if (hasFlag(s, 'sold_ilyas_twice')) acc.push(T('Hai venduto Ilyas due volte.'));
  if ((s.totals.incoherent || 0) > 10) acc.push(T('Hai agito {incoherent} volte contro il tuo stesso Fardello.', { incoherent: s.totals.incoherent }));
  const def: string[] = kept.map(p => T('Promessa mantenuta: "{text}"', { text: p.text }));
  if (hasFlag(s, 'spared_innocent')) def.push(T('Hai risparmiato il disertore.'));
  if (hasFlag(s, 'freed_ilyas')) def.push(T('Hai liberato Ilyas.'));
  if (hasFlag(s, 'told_truth')) def.push(T('Hai detto la verità sulla morte di Tomas.'));
  if (hasFlag(s, 'freed_voices')) def.push(T('Hai liberato le voci del Coro.'));
  if ((s.totals.coherent || 0) > 20) def.push(T('Sei rimasto fedele al tuo Fardello {coherent} volte.', { coherent: s.totals.coherent }));
  return { acc, def, a: acc.length * 2 + (s.totals.incoherent || 0) / 10, d: def.length * 2 + (s.totals.coherent || 0) / 15 };
}
export function trialRespond(s: GameState, resp: 'confessare' | 'difendersi' | 'rinnegare' | 'accettare') {
  if (s.trial !== 'pending') return;
  const { a, d } = trialScores(s);
  let outcome = '';
  let text = '';
  if (resp === 'confessare') {
    if (a <= d + 2) { outcome = 'assoluzione'; s.dissonance = 0; s.reliquie += 2; text = T('Confessi tutto. I tuoi Fardelli ti guardano e annuiscono. Sei assolto: Dissonanza azzerata, +2 reliquie.'); }
    else { outcome = 'integrazione'; s.resonance = resonanceMax(s); s.influence += 15; text = T('Confessi. Le accuse sono troppe per un\'assoluzione, ma le accetti come parte di te: Risonanza piena, il Fardello si integra.'); }
  } else if (resp === 'difendersi') {
    if (d > a) { outcome = 'assoluzione'; s.reliquie += 3; text = T('Le tue difese prevalgono. Il Tribunale si dissolve: +3 reliquie.'); }
    else {
      s.modal = null;
      startCombat(s, ['tribunale'], { floor: 10, scale: 1 + s.hero.level / 10, title: T('Il Tribunale degli Echi'), kind: 'trial' });
      s.tab = 'discesa';
      chronicle(s, T('Ti sei difeso davanti al Tribunale degli Echi. Il Tribunale non è d\'accordo.'), 'fate');
      return;
    }
  } else if (resp === 'rinnegare') {
    outcome = 'rottura'; s.influence = 0; s.resonance = 0; s.dissonance = 0; s.hero.talentPoints += 2; addFlag(s, 'fardello_broken');
    text = T('Rinneghi il tuo Fardello. Si spezza con un suono di vetro. Perdi la sua influenza, guadagni 2 Punti Talento e una libertà che fa paura.');
  } else {
    if (!s.ascension && s.fardello && s.hero.level >= 12) {
      outcome = T('ascensione forzata'); const p = FARDELLI[s.fardello].ascensions[0]; s.ascension = { paths: [p], hybrid: false }; addFlag(s, 'ascended');
      text = T('Accetti la condanna. Il Fardello ti divora e ti ricostruisce: Ascensione forzata in {pName}.', { pName: ASCENSIONS[p].name });
    } else { outcome = 'condanna'; s.nameCorrupted = true; s.reliquie += 1; text = T('Accetti la condanna. Il tuo nome si sfalda: la valle lo pronuncerà storpiato.'); }
  }
  s.trial = 'done'; s.trialOutcome = outcome; addFlag(s, 'trial_done');
  chronicle(s, T('Processo alle Proprie Scelte: {outcome}.', { outcome: outcome }), 'fate');
  s.modal = { kind: 'info', title: `⚖️ ${outcome[0].toUpperCase()}${outcome.slice(1)}`, text };
  checkStars(s);
}

// ============================================================
// Frammenti di Fato
// ============================================================
export function randomFragment(s: GameState, r: () => number = Math.random): string {
  const ids = Object.keys(FRAGMENTS).filter(id => id !== 'spezzato');
  const comp = ids.filter(id => !FRAGMENTS[id].constraint || (s.fardello && FRAGMENTS[id].constraint!.includes(s.fardello)));
  return pick(comp.length ? comp : ids, r);
}
export function fragmentUsable(s: GameState, defId: string): { ok: boolean; why?: string } {
  const f = FRAGMENTS[defId];
  if (f.constraint && (!s.fardello || !f.constraint.includes(s.fardello))) return { ok: false, why: `Vincolo: ${f.constraint.map(c => FARDELLI[c as FardelloId].name).join(' o ')}` };
  if (f.dark && (s.totals.darkFragAt || 0) > Date.now()) return { ok: false, why: T('Frammenti oscuri in ricarica (anti-griefing)') };
  if (defId === 'patto') return { ok: false, why: T('Si usa nei Contratti di Fato') };
  return { ok: true };
}
export function useFragment(s: GameState, fuid: string) {
  const i = s.fragments.findIndex(f => f.uid === fuid);
  if (i < 0) return;
  const defId = s.fragments[i].defId;
  if (!fragmentUsable(s, defId).ok) return;
  const f = FRAGMENTS[defId];
  const now = Date.now();
  switch (defId) {
    case 'eclissi': s.valley.eclipseUntil = now + 3600_000; addFlag(s, 'eco_eclissi'); break;
    case 'sussurro': addFlag(s, 'sussurro_next'); break;
    case 'sangue': addFlag(s, 'sangue_next'); break;
    case 'memoria': addFlag(s, 'ghost_next'); break;
    case 'fioritura': pushValley(s, { prosperity: 30, blight: -10 }); break;
    case 'cenere': pushValley(s, { blight: 30 }); break;
    case 'voce': addFlag(s, 'voce_next'); break;
    case 'spezzato': s.hero.talentPoints += 3; break;
    case 'purezza': s.corruption = Math.max(0, s.corruption - 40); s.dissonance = Math.max(0, s.dissonance - 5); break;
    case 'corrotto': {
      const r = Math.random();
      if (r < 0.33) { s.corruption = Math.min(100, s.corruption + 20); s.reliquie += 1; toast(s, T('Il frammento ti marcia dentro: +20 corruzione, +1 reliquia'), 'fate'); }
      else if (r < 0.66) { s.dissonance = Math.min(15, s.dissonance + 3); addRes(s, { cenere: 300 }); toast(s, T('Il frammento sussurra: +3 Dissonanza, +300 cenere'), 'fate'); }
      else { s.valley.eclipseUntil = now + 1800_000; toast(s, T('Il frammento oscura il cielo: Eclisse per 30 minuti'), 'fate'); }
      break;
    }
  }
  if (f.dark) s.totals.darkFragAt = now + 3600_000;
  s.fragments.splice(i, 1);
  stat(s, 'fragmentsUsed');
  chronicle(s, T('Hai attivato {fName}. {desc}', { fName: f.name, desc: f.desc }), 'fate');
  toast(s, T('{icon} {name} attivato', { icon: f.icon, name: f.name }), 'fate');
}

// ============================================================
// Mondo condiviso simulato (Mondo a Semi, Boss Mondiale, Contratti)
// ============================================================
export function sharedWorld(day: string, s?: GameState) {
  const r = mulberry32(hashStr('krak-world-' + day));
  const bearers = 800 + Math.floor(r() * 900);
  const sac = 0.25 + r() * 0.2, san = 0.2 + r() * 0.2;
  const sil = Math.max(0.1, 1 - sac - san);
  let prosperity = 30 + r() * 45, blight = 20 + r() * 55, tension = 20 + r() * 50;
  if (s) { prosperity += (s.valley.prosperity - 50) / 50; blight += (s.valley.blight - 50) / 50; }
  const state: ValleyState = blight >= 70 ? 'Cenere' : blight >= 50 ? 'Corruzione' : tension >= 55 ? 'Tensione' : prosperity >= 55 ? 'Fioritura' : 'Quiete';
  const bossMax = 5_000_000;
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  const others = day === todayKey() ? Math.min(0.95, (h / 24) * (0.7 + r() * 0.4)) : 1;
  return { bearers, split: { sacrificio: sac, sangue: san, silenzio: sil }, prosperity, blight, tension, state, bossMax, bossOthers: Math.round(bossMax * others) };
}

export function placeContract(s: GameState, fuid: string, prediction: ValleyState) {
  const f = s.fragments.find(f => f.uid === fuid);
  if (!f) return;
  if (s.contracts.filter(c => !c.resolved).length >= 3) { toast(s, T('Massimo 3 contratti aperti'), 'bad'); return; }
  s.fragments = s.fragments.filter(x => x.uid !== fuid);
  s.contracts.push({ uid: uid('ct'), fragmentUid: f.uid, fragmentDef: f.defId, prediction, day: todayKey() });
  toast(s, T('📜 Contratto di Fato: «Domani la valle condivisa sarà in {prediction}»', { prediction: T(prediction) }), 'fate');
}
export function resolveContracts(s: GameState) {
  const today = todayKey();
  for (const c of s.contracts) {
    if (c.resolved || c.day === today) continue;
    const w = sharedWorld(today);
    c.resolved = true;
    c.won = w.state === c.prediction;
    if (c.won) {
      s.reliquie += 2;
      s.fragments.push({ uid: uid('fr'), defId: c.fragmentDef }, { uid: uid('fr'), defId: randomFragment(s) });
      changeRep(s, 'ombre', 5);
      chronicle(s, T('Il Contratto di Fato si è avverato ({prediction}): influenza narrativa, +2 reliquie.', { prediction: c.prediction }), 'fate');
      toast(s, T('📜 Contratto avverato!'), 'good');
    } else {
      s.fragments.push({ uid: uid('fr'), defId: 'corrotto' });
      chronicle(s, T('Il Contratto di Fato è fallito (era {state}): il frammento si è corrotto.', { state: w.state }), 'fate');
      toast(s, T('📜 Contratto fallito: frammento corrotto'), 'bad');
    }
  }
  s.contracts = s.contracts.filter(c => !c.resolved || Date.now() - hashStrTime(c.day) < 7 * 86400_000);
}
const hashStrTime = (day: string) => new Date(day + 'T00:00:00').getTime();

// ============================================================
// Mercato delle Anime
// ============================================================
export function priceMult(s: GameState) {
  let m = 1;
  const o = s.factions.ombre;
  if (o >= 60) m -= 0.2; else if (o >= 30) m -= 0.1; else if (o <= -30) m += 0.3;
  if (valleyState(s) === 'Fioritura') m -= 0.1;
  if (hasTalent(s, 'cheap')) m -= 0.15;
  return Math.max(0.5, m);
}
export function refreshMarket(s: GameState, force = false) {
  const now = Date.now();
  if (!force && now < s.market.refreshAt && s.market.listings.length) return;
  const L: Listing[] = [];
  const lv = s.hero.level;
  for (let i = 0; i < 4; i++) {
    const it = makeItem(lv + 1, rollRarity(1 + Math.random()));
    L.push({ uid: uid('ls'), seller: pick(BOT_NAMES), kind: 'item', item: it, price: Math.round((40 + it.ilvl * 14) * (1 + it.rarity * 0.9)) });
  }
  for (let i = 0; i < 2; i++) {
    const f = randomFragment(s);
    L.push({ uid: uid('ls'), seller: pick(BOT_NAMES), kind: 'fragment', fragment: f, price: FRAGMENTS[f].value * 9 });
  }
  const rk = pick(['provviste', 'ferro', 'pietra', 'intuizione'] as const);
  const amt = rk === 'provviste' ? 8 : rk === 'intuizione' ? 2 : 100 + lv * 20;
  L.push({ uid: uid('ls'), seller: T('Gilde di Hondovalle'), kind: 'res', res: { key: rk, amount: amt }, price: rk === 'provviste' ? 90 : rk === 'intuizione' ? 120 : Math.round(amt * 1.2) });
  s.market.listings = L;
  s.market.refreshAt = now + 10 * 60_000;
}
export function buyListing(s: GameState, luid: string) {
  const l = s.market.listings.find(x => x.uid === luid);
  if (!l) return;
  const price = Math.round(l.price * priceMult(s));
  if (s.res.cenere < price) { toast(s, T('Cenere insufficiente'), 'bad'); return; }
  s.res.cenere -= price;
  if (l.item) addItem(s, l.item);
  if (l.fragment) s.fragments.push({ uid: uid('fr'), defId: l.fragment });
  if (l.res) addRes(s, { [l.res.key]: l.res.amount }, false);
  s.market.listings = s.market.listings.filter(x => x.uid !== luid);
  const what = l.item?.name || (l.fragment && FRAGMENTS[l.fragment].name) || `${l.res!.amount} ${RES_INFO[l.res!.key].name}`;
  s.market.history.unshift(T('{playerName} ha comprato {what} da {seller} per {price} cenere.', { playerName: s.playerName, what: what, seller: l.seller, price: price }));
  stat(s, 'trades');
  changeRep(s, 'ombre', 1);
  toast(s, `🛒 ${what}`, 'good');
}
export function sellItem(s: GameState, iuid: string) {
  const it = s.inventory.find(i => i.uid === iuid);
  if (!it || Object.values(s.hero.equipped).includes(iuid) || it.locked) return;
  const price = Math.round(salvageValue(it).cenere * 2.2 / priceMult(s));
  s.inventory = s.inventory.filter(i => i.uid !== iuid);
  addRes(s, { cenere: price });
  const buyer = pick(BOT_NAMES);
  s.market.history.unshift(T('{buyer} ha comprato {itName} da {playerName} per {price} cenere. "{origin}"', { buyer: buyer, itName: it.name, playerName: s.playerName, price: price, origin: it.origin }));
  stat(s, 'trades');
  toast(s, T('💰 Venduto a {buyer}: +{price}', { buyer: buyer, price: price }), 'good');
}
export function sellFragment(s: GameState, fuid: string) {
  const f = s.fragments.find(x => x.uid === fuid);
  if (!f) return;
  const def = FRAGMENTS[f.defId];
  const price = Math.round(def.value * 6 / priceMult(s));
  s.fragments = s.fragments.filter(x => x.uid !== fuid);
  addRes(s, { cenere: price });
  if (def.dark) { pushValley(s, { blight: 3 }); }
  const buyer = pick(BOT_NAMES);
  s.market.history.unshift(T('{buyer} ha comprato {defName} da {playerName} per {price} cenere.{incupisce}', { buyer: buyer, defName: def.name, playerName: s.playerName, price: price, incupisce: def.dark ? T(' La valle si incupisce.') : '' }));
  stat(s, 'trades');
  toast(s, `💰 ${def.name}: +${price}`, 'good');
}

// ============================================================
// Costellazioni
// ============================================================
function starFlagMet(s: GameState, flag: string) {
  if (flag === 'f_any') return !!s.fardello;
  if (flag === 'f_sangue') return s.fardello === 'sangue';
  if (flag === 'f_silenzio') return s.fardello === 'silenzio';
  return hasFlag(s, flag);
}
function giveStar(s: GameState, id: string) {
  const st = STARS.find(x => x.id === id)!;
  s.stars.push(id);
  s.totals.starsLit = s.stars.length;
  const r = st.reward;
  if (r.res) addRes(s, r.res);
  if (r.reliquie) s.reliquie += r.reliquie;
  if (r.flag) addFlag(s, r.flag);
  if (r.fragment) s.fragments.push({ uid: uid('fr'), defId: r.fragment });
  chronicle(s, T('Stella accesa: {stName} ({consName}). {text}', { stName: st.name, consName: CONSTELLATIONS[st.cons].name, text: st.text }), 'fate');
  toast(s, `⭐ ${st.name}`, 'fate');
  const consStars = STARS.filter(x => x.cons === st.cons);
  if (consStars.every(x => s.stars.includes(x.id))) toast(s, T('🌌 {consName} completa: {bonus}', { consName: CONSTELLATIONS[st.cons].name, bonus: CONSTELLATIONS[st.cons].bonus }), 'fate');
}
export function checkStars(s: GameState) {
  for (const st of STARS) if (st.flag && !s.stars.includes(st.id) && starFlagMet(s, st.flag)) giveStar(s, st.id);
}
export function readStar(s: GameState, cons: string) {
  const lit = STARS.filter(x => x.cons === cons && s.stars.includes(x.id)).length;
  const cost = lit > 0 ? 2 : 4;
  const cands = STARS.filter(x => x.cons === cons && !x.flag && !s.stars.includes(x.id));
  if (!cands.length) { toast(s, T('Nessuna stella da leggere qui: le altre si accendono solo con le scelte'), 'info'); return; }
  if (s.res.intuizione < cost) { toast(s, T('Servono {cost} Intuizione', { cost: cost }), 'bad'); return; }
  s.res.intuizione -= cost;
  giveStar(s, pick(cands).id);
}

// ============================================================
// Rituali del villaggio
// ============================================================
export function purifyUI(s: GameState) {
  if (s.res.intuizione < 2) { toast(s, T('Servono 2 Intuizione'), 'bad'); return; }
  s.res.intuizione -= 2;
  s.settings.purifiedUntil = Date.now() + 15 * 60_000;
  toast(s, T('🕯️ L\'interfaccia è purificata per 15 minuti'), 'good');
}
export function pledgeCureCost(s: GameState) {
  return { cenere: Math.round(s.hero.pledgedMaxHp * (hasFlag(s, 'elara_cure') ? 12 : 25)), reliquie: 1 };
}
export function curePledge(s: GameState) {
  if (s.hero.pledgedMaxHp <= 0) return;
  const c = pledgeCureCost(s);
  if (s.res.cenere < c.cenere || s.reliquie < c.reliquie) { toast(s, T('Servono {cenere} cenere e 1 reliquia', { cenere: c.cenere }), 'bad'); return; }
  s.res.cenere -= c.cenere; s.reliquie -= 1;
  chronicle(s, T('Elara ha sciolto il tuo pegno di {pledgedMaxHp} salute.', { pledgedMaxHp: s.hero.pledgedMaxHp }), 'fate');
  s.hero.pledgedMaxHp = 0;
  changeRep(s, 'guaritori', 3);
  toast(s, T('🌿 Pegno sciolto'), 'good');
}
export function cureAberration(s: GameState) {
  if (!s.aberration) return;
  if (s.reliquie < 8 || s.res.cenere < 3000) { toast(s, T('Servono 8 reliquie e 3000 cenere'), 'bad'); return; }
  s.reliquie -= 8; s.res.cenere -= 3000;
  s.aberration = false;
  chronicle(s, T('Il rituale di Elara ti ha restituito un corpo umano. Il prezzo è stato enorme.'), 'fate');
  toast(s, T('Torni umano'), 'good');
  clampHeroHp(s);
}
export function restoreName(s: GameState) {
  if (!s.nameCorrupted) return;
  if (s.reliquie < 3) { toast(s, T('Servono 3 reliquie'), 'bad'); return; }
  s.reliquie -= 3;
  s.nameCorrupted = false;
  addFlag(s, 'name_spoken');
  chronicle(s, T('Hai pronunciato il tuo nome all\'Altare: {playerName}. La valle se lo ricorda di nuovo.', { playerName: s.playerName }), 'fate');
  checkStars(s);
}

// ============================================================
// Fine del Ciclo, finali ed Eredità
// ============================================================
export function canEndCycle(s: GameState) {
  return hasFlag(s, 'boss_cuore_krak') || ((s.totals.cycleCenere || 0) >= 150_000 && s.hero.level >= 12);
}
export function computeEnding(s: GameState): string {
  const kept = s.promises.filter(p => p.status === 'kept').length;
  const broken = s.promises.filter(p => p.status === 'broken').length;
  const sc: Record<string, number> = {
    brucia: s.valley.blight / 10 + s.corruption / 15 + s.dissonance / 3,
    martire: (s.fardello === 'sacrificio' ? 4 : 0) + kept * 1.5 + (s.totals.coherent || 0) / 20 - broken,
    dio: (s.fardello === 'silenzio' ? 4 : 0) + (s.ascension ? 2 : 0) + (hasFlag(s, 'name_hidden') ? 2 : 0) + (s.totals.coherent || 0) / 25,
    aberrazione: s.aberration ? 4 + kept * 1.5 : 0,
    mercante: (s.totals.trades || 0) / 4 + Math.max(0, s.factions.ombre) / 15,
    comunita: (s.totals.fragmentsUsed || 0) / 2 + s.valley.prosperity / 15,
    spezzato: (s.trialOutcome === 'rottura' || s.trialOutcome === 'integrazione' ? 5 : 0) + (s.biomes.torre.conquered ? 2 : 0),
    cancellato: (s.nameCorrupted ? 6 : 0) + (s.aberration ? 1 : 0) + s.dissonance / 4,
  };
  return Object.entries(sc).sort((a, b) => b[1] - a[1])[0][0];
}
export function memorieGain(s: GameState) {
  const base = Math.pow((s.totals.cycleCenere || 0) / 20000, 0.25) * 2 + s.hero.level / 10 + (hasFlag(s, 'boss_cuore_krak') ? 5 : 0)
    + (['cimitero', 'paludi', 'torre'] as const).filter(b => s.biomes[b].conquered).length * 2 + (s.totals.abyssBest || 0) / 10;
  return Math.max(1, Math.floor(base * (1 + cardMod(s, 'memorie'))));
}
export function endCycle(s: GameState) {
  if (!canEndCycle(s)) return;
  const end = computeEnding(s);
  s.ending = end;
  s.scene = 'ending';
  s.cycle.cardOffer = pickCards(3);
  chronicle(s, T('Finale: {endName}.', { endName: ENDINGS[end].name }), 'fate');
}
function pickCards(n: number) {
  const pool = [...FATE_CARDS];
  const out: string[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0].id);
  return out;
}
export function rerollCards(s: GameState) {
  if (s.reliquie < 1) { toast(s, T('Serve 1 reliquia'), 'bad'); return; }
  s.reliquie--;
  s.cycle.cardOffer = pickCards(3);
}
export function startNewCycle(s: GameState, cardId: string, heirloomUid: string | null): GameState {
  const gain = memorieGain(s);
  const end = s.ending || computeEnding(s);
  const heirloom = heirloomUid ? s.inventory.find(i => i.uid === heirloomUid) || null : null;
  const legacy = { name: s.playerName, classId: s.classId, fardello: s.fardello, ending: ENDINGS[end].name, level: s.hero.level, cycle: s.cycle.n, t: Date.now(), kind: ENDINGS[end].legacy };
  const n = newGame();
  const keepTotals = ['cenereEarned', 'kills', 'floors', 'delves', 'trades', 'forged', 'clicks', 'built', 'threats', 'worldBossDmg', 'abyssBest', 'fished', 'expeditions', 'bosses'];
  for (const k of keepTotals) if (s.totals[k]) n.totals[k] = s.totals[k];
  n.totals.cycles = (s.totals.cycles || 0) + 1;
  n.reliquie = s.reliquie;
  n.achievements = s.achievements;
  n.bestiary = s.bestiary;
  n.fish = s.fish;
  n.legacies = [legacy, ...s.legacies].slice(0, 20);
  n.settings = s.settings;
  n.market.history = s.market.history.slice(0, 30);
  n.cycle = { n: s.cycle.n + 1, memorie: s.cycle.memorie + gain, memorieTotal: s.cycle.memorieTotal + gain, sanctuary: s.cycle.sanctuary, card: cardId, cardOffer: [], heirloom: heirloom ? { ...heirloom, locked: true } : null };
  n.valley.rebirthUntil = Date.now() + 3600_000;
  n.valley.prosperity = 45; n.valley.blight = 15;
  n.flags = ['new_cycle'];
  // dal secondo Ciclo in poi niente guida: il portatore conosce già la valle
  n.unlocked = [...s.unlocked];
  n.tipsSeen = [...s.tipsSeen];
  n.tutorial = 999;
  n.scene = 'intro';
  return n;
}

// ============================================================
// Salvataggio Vivente: sogni e spedizioni oniriche offline
// ============================================================
export function generateDreams(s: GameState, hours: number) {
  if (hours < 1 || !s.fardello) return;
  const count = Math.min(3, 1 + Math.floor(hours / 3));
  const r = Math.random;
  for (let i = 0; i < count; i++) {
    const roll = r();
    const id = uid('dr');
    if (roll < 0.3) {
      const t = { sacrificio: [T('Sogno di Sacrificio'), T('Sei tornato al portale. Tomas ti tendeva la mano, ma non riuscivi a raggiungerla.')], sangue: [T('Il Debito Bussa'), T('Vesper contava monete d\'osso sul tuo letto. "Il debito cresce anche quando dormi."')], silenzio: [T('Il Testimone Sogna'), T('Hai rivisto la notte dell\'incendio. Questa volta hai notato un volto in più.')] }[s.fardello];
      s.dreams.push({ id, title: t[0], text: t[1], rewards: { intuizione: 1, cenere: 40 } });
    } else if (roll < 0.5) {
      const f = pick(Object.keys(FACTIONS) as FactionId[]);
      s.dreams.push({ id, title: T('Un PNG ti ha cercato'), text: T('Mentre eri via, un messaggero di {fName} ha bussato alla tua porta. Ha lasciato un dono.', { fName: FACTIONS[f].name }), rewards: { cenere: 80, provviste: 2 }, consequence: `rep_${f}` });
    } else if (roll < 0.65 && s.promises.some(p => p.status === 'open')) {
      s.dreams.push({ id, title: T('Una Promessa Scade nel Sonno'), text: T('Hai sognato catene. Una delle tue promesse si è fatta più urgente (una spedizione in meno per mantenerla).'), rewards: { intuizione: 1 }, consequence: 'promise_tick' });
    } else if (roll < 0.8) {
      s.dreams.push({ id, title: T('Frammento nel Magazzino'), text: T('Al risveglio, nel magazzino c\'è un frammento che nessuno ricorda di aver portato. È tiepido. È corrotto.'), rewards: {}, consequence: 'fragment_corrupt' });
    } else {
      s.dreams.push({ id, title: T('Spedizione Onirica'), text: T('In sogno hai visitato una versione corrotta di un dungeon già esplorato. Ti sei svegliato con le tasche piene.'), rewards: { cenere: 120, ferro: 30, provviste: 1 } });
    }
  }
}
export function claimDream(s: GameState, id: string) {
  const d = s.dreams.find(x => x.id === id);
  if (!d) return;
  const { reliquie, ...res } = d.rewards;
  addRes(s, res);
  if (reliquie) s.reliquie += reliquie;
  if (d.consequence?.startsWith('rep_')) changeRep(s, d.consequence.slice(4) as FactionId, 3);
  if (d.consequence === 'promise_tick') { const p = s.promises.find(p => p.status === 'open'); if (p) { p.deadlineDelves--; checkPromises(s); } }
  if (d.consequence === 'fragment_corrupt') s.fragments.push({ uid: uid('fr'), defId: 'corrotto' });
  s.dreams = s.dreams.filter(x => x.id !== id);
  chronicle(s, T('Sogno: {title}.', { title: d.title }), 'world');
}

export function bestHeirloomCandidates(s: GameState): Item[] {
  return [...s.inventory].sort((a, b) => itemScore(b) - itemScore(a)).slice(0, 6);
}
export const talentName = (id: string) => TALENTS.find(t => t.id === id)?.name || id;
