import { t as T } from '../../i18n';
import type { BiomeId, DelveState, GameState, Item, Slot } from '../types';
import { BIOMES, BIOME_IDS, DUNGEON_MODIFIERS } from '../data/enemies';
import { TALKERS } from '../data/dialogues';
import { hashStr, mulberry32, pick, todayKey } from '../rng';
import { addFlag, addRes, chronicle, displayName, hasFlag, toast } from './state';
import { addItem } from './hero';
import { applyEffect } from './meta';
import { reqOk } from './dialogue';
import { submitScore } from '../platform';

// ============================================================
// Sistemi di "voglia di tornare": Livelli di Krak, Presagi, Voci del
// villaggio, Doni ai compagni, Sfida del giorno, Stanze-enigma,
// il risveglio di Krak e la bisaccia perduta.
// ============================================================

// ------------------------------------------------------------
// Livelli di Krak (difficoltà crescente dopo il primo Ciclo)
// ------------------------------------------------------------
export const KRAK_RULES: { n: number; name: string; desc: string }[] = [
  { n: 1, name: T('Il Primo Sussurro'), desc: T('Ogni Livello di Krak rende i nemici più forti del 12% e il bottino più ricco del 10%.') },
  { n: 2, name: T('Fame'), desc: T('I santuari curano il 30% invece del 45%.') },
  { n: 3, name: T('Cuori fragili'), desc: T('I compagni accumulano Peso il 50% più in fretta.') },
  { n: 4, name: T('Notti corte'), desc: T('I presagi si compiono con una discesa in meno.') },
  { n: 5, name: T('Lame nascoste'), desc: T('Le trappole fanno il 50% di danni in più.') },
  { n: 6, name: T('Il buio ha un volto'), desc: T('Le stanze Élite sono molto più frequenti.') },
  { n: 7, name: T('Nessuna pietà'), desc: T('Se cadi perdi tutta la bisaccia.') },
  { n: 8, name: T('Provviste marce'), desc: T('Scendendo, a volte una provvista marcisce.') },
  { n: 9, name: T('Boss furiosi'), desc: T('I boss hanno il 25% di forza in più.') },
  { n: 10, name: T('Il Cuore aperto'), desc: T('Krak ti guarda direttamente: nemici +20% ulteriore.') },
];

export const krakOn = (s: GameState, n: number) => (s.krak?.level || 0) >= n;
export function krakEnemyMult(s: GameState) { const L = s.krak?.level || 0; return 1 + 0.12 * L + (L >= 10 ? 0.2 : 0); }
export function krakLootMult(s: GameState) { return 1 + 0.1 * (s.krak?.level || 0); }
export function setKrakLevel(s: GameState, n: number) {
  if (s.delve) return;
  s.krak.level = Math.max(0, Math.min(s.krak.max, n));
}

// ------------------------------------------------------------
// Presagi: conti alla rovescia reali in discese
// ------------------------------------------------------------
interface OmenDef { id: string; icon: string; text: string; fail: string; apply: (s: GameState) => void }
export const OMENS: OmenDef[] = [
  { id: 'culto', icon: '🩸', text: T('Il Culto verrà a prendere i figli del mugnaio. Raggiungi il piano {floor} di {biome} per spezzare il loro rito.'),
    fail: T('Il Culto è venuto nella notte. La casa del mugnaio è vuota, e nessuno ti guarda più negli occhi.'),
    apply: s => applyEffect(s, { factions: { culto: 8, contadini: -15 }, prosperity: -10, flags: ['omen_culto_failed'] }) },
  { id: 'pozzo', icon: '🪣', text: T('Il pozzo di Hondovalle verrà avvelenato. Scendi al piano {floor} di {biome} e trova chi lo vuole morto.'),
    fail: T('L’acqua del pozzo è diventata nera. Metà delle provviste è marcita.'),
    apply: s => { s.res.provviste = Math.floor(s.res.provviste / 2); applyEffect(s, { blight: 6 }); } },
  { id: 'eclissi', icon: '🌑', text: T('Il sole si spegnerà sulla valle. Solo al piano {floor} di {biome} puoi riaccenderlo.'),
    fail: T('L’eclissi è caduta. I nemici sono più numerosi e il buio non se ne va.'),
    apply: s => { s.valley.eclipseUntil = Math.max(s.valley.eclipseUntil, Date.now()) + 40 * 60_000; applyEffect(s, { blight: 8 }); } },
  { id: 'tomba', icon: '⚰️', text: T('Una tomba si aprirà sotto la locanda. Chiudila dal basso: piano {floor} di {biome}.'),
    fail: T('La tomba si è aperta. Qualcosa è salito, e ora vive dentro di te.'),
    apply: s => applyEffect(s, { corruption: 12, blight: 10 }) },
  { id: 'nome', icon: '🫥', text: T('Qualcuno che ami dimenticherà il tuo nome. Ricordalo a Krak al piano {floor} di {biome}.'),
    fail: T('I tuoi compagni ti guardano come un estraneo. La fiducia si incrina.'),
    apply: s => { for (const c of s.companions) if (c.recruited && !c.left) c.trust = Math.max(1, c.trust - 10); } },
];
export const omenDef = (id: string) => OMENS.find(o => o.id === id)!;

export function omenText(s: GameState, o: GameState['omens'][number]) {
  return omenDef(o.id).text.replace('{floor}', String(o.floor)).replace('{biome}', BIOMES[o.biome].name);
}

function spawnOmen(s: GameState) {
  const max = krakOn(s, 4) ? 2 : 1;
  if (s.omens.length >= max || (s.totals.delves || 0) < 2 || Math.random() > 0.4) return;
  const free = OMENS.filter(o => !s.omens.some(x => x.id === o.id));
  if (!free.length) return;
  const def = pick(free);
  const biomes = BIOME_IDS.filter(b => b === 'cimitero' || (BIOMES[b].requires && s.biomes[BIOMES[b].requires!].conquered));
  const biome = pick(biomes);
  const B = BIOMES[biome];
  const best = s.biomes[biome].best;
  const floor = Math.max(3, Math.min(B.depth || 999, best));
  const o = { id: def.id, left: krakOn(s, 4) ? 2 : 3, biome, floor };
  s.omens.push(o);
  toast(s, T('{icon} Un presagio: {text}', { icon: def.icon, text: omenText(s, o) }), 'fate');
  chronicle(s, T('Presagio: {text}', { text: omenText(s, o) }), 'fate');
}

/** Chiamata alla fine di ogni discesa: compie, consuma o genera presagi. Restituisce righe per il resoconto. */
export function tickOmens(s: GameState, d: DelveState, success: boolean): string[] {
  const lines: string[] = [];
  const reached = d.floorCleared ? d.floor : d.floor - 1;
  for (const o of [...s.omens]) {
    const def = omenDef(o.id);
    if (success && d.biome === o.biome && reached >= o.floor) {
      s.omens = s.omens.filter(x => x !== o);
      s.reliquie += 1;
      addRes(s, { cenere: 60 + o.floor * 15 });
      applyEffect(s, { resonance: 2, prosperity: 5 });
      lines.push(T('{icon} Hai spezzato il presagio. +1 reliquia, la valle respira.', { icon: def.icon }));
      chronicle(s, T('Hai spezzato un presagio prima che si compisse.'), 'fate');
      continue;
    }
    o.left--;
    if (o.left <= 0) {
      s.omens = s.omens.filter(x => x !== o);
      def.apply(s);
      addFlag(s, `omen_${o.id}_done`);
      lines.push(`${def.icon} ${def.fail}`);
      chronicle(s, def.fail, 'fate');
      toast(s, `${def.icon} ${def.fail}`, 'bad');
    }
  }
  spawnOmen(s);
  return lines;
}

// ------------------------------------------------------------
// Il villaggio reagisce a ogni discesa
// ------------------------------------------------------------
export function villageVoices(s: GameState, d: DelveState, success: boolean): { id: string; text: string }[] {
  const sn = d.snap;
  const name = displayName(s);
  const vis = (id: string) => { const tk = TALKERS.find(x => x.id === id); return !!tk && reqOk(s, tk.appear); };
  const cand: { id: string; text: string; w: number }[] = [];
  const add = (id: string, text: string, w = 1) => { if (vis(id)) cand.push({ id, text: text.replace('{name}', name), w }); };
  const reached = d.floorCleared ? d.floor : d.floor - 1;
  const bosses = (s.totals.bosses || 0) - (sn?.bosses ?? (s.totals.bosses || 0));
  const dCorr = sn ? s.corruption - sn.corr : 0;
  const broken = sn ? s.promises.filter(p => p.status === 'broken').length - sn.broken : 0;
  const loot = sn ? (s.totals.cenereEarned || 0) - (sn.cenere ?? 0) : 0;
  if (!success) {
    add('orsola', T('Ti hanno riportato su a braccia, {name}. Mangia qualcosa. Poi mi racconti chi ti ha fatto questo.'), 3);
    add('garrik', T('Cadere fa parte del mestiere. Rialzarsi è il mestiere. Alla Capitale ce lo insegnavano a frustate.'), 2);
    add('nym', T('Sei morto un pochino. Lo so perché laggiù ti hanno salutato.'), 2);
  }
  if (bosses > 0) {
    add('sibilla', T('Per un istante il dungeon ha smesso di battere. La mia mappa si è zittita. Sei stato tu?'), 4);
    add('orsola', T('Stasera la birra è gratis. Non per te: per chi ha smesso di avere incubi grazie a te.'), 3);
  }
  if (reached >= 10) add('varo', T('Così in fondo? Laggiù i nomi pesano di più. Se ne hai portato su qualcuno, te lo compro.'), 3);
  if (dCorr >= 5) { add('nym', T('Hai portato su qualcosa. Lo sento muoversi sotto la tua pelle. Non dargli il tuo nome.'), 4); add('orsola', T('Hai gli occhi di chi è stato troppo vicino al Cuore. Stanotte la candela resta accesa per te.'), 2); }
  if (dCorr <= -5) add('sibilla', T('La tua ombra è più leggera. Le linee della mappa ti seguono di nuovo.'), 2);
  if (broken > 0) { add('orsola', T('In paese si dice che la tua parola valga meno della cenere. Io non lo dico. Ma lo sento dire.'), 4); add('garrik', T('Una promessa infranta è un debito con gli interessi. Lo so bene.'), 3); }
  for (const c of s.companions.filter(c => c.recruited && !c.left)) {
    if (c.mood === 'broken') add('garrik', T('{c} non parla da quando siete tornati. Ho visto quello sguardo in guerra. Dagli tempo.').replace('{c}', c.name), 5);
    if (c.mood === 'virtue') add('sibilla', T('{c} brilla di una luce strana. Qualcosa laggiù l’ha reso più forte di te.').replace('{c}', c.name), 5);
  }
  if (loot >= 300) add('varo', T('Bisaccia piena, eh? Le Ombre del Mercato annusano già l’aria. Passa da me prima che passino loro.'), 2);
  if (d.daily) add('sibilla', T('La Sfida del giorno è uguale per tutti i portatori della valle. Oggi il tuo nome è sulla mappa.'), 2);
  if (success && reached <= 2) add('garrik', T('Due piani e già risali? Prudente. Mi piace. I prudenti invecchiano.'), 1);
  if (success) {
    add('orsola', T('Hai l’odore del sottosuolo addosso. Siediti, la zuppa è ancora calda.'), 1);
    add('nym', T('Hanno chiesto di te, laggiù. Ho detto che saresti tornato. Ho detto bene?'), 1);
    add('varo', T('Ogni volta che risali, la valle ti ricorda un po’ meglio. E il ricordo, amico mio, ha un prezzo.'), 1);
  }
  if (!cand.length) return [];
  cand.sort((a, b) => b.w - a.w + (Math.random() - 0.5) * 1.5);
  const out: { id: string; text: string }[] = [];
  for (const c of cand) { if (!out.some(o => o.id === c.id)) out.push({ id: c.id, text: c.text }); if (out.length >= 2) break; }
  return out;
}

// ------------------------------------------------------------
// Doni ai compagni
// ------------------------------------------------------------
export const GIFT_LIKES: Record<string, Slot[]> = { kael: ['arma', 'scudo'], lyra: ['amuleto', 'anello'], brann: ['corazza', 'elmo', 'scudo'], mira: ['anello', 'stivali', 'arma'] };
const GIFT_SCENES: Record<string, string[]> = {
  kael: [
    T('Kael rigira il dono tra le mani. «Tomas mi regalava sempre cose inutili. Questo no. Questo… grazie.»'),
    T('Di notte Kael ti mostra una lettera mai spedita, scritta a suo fratello. Non la leggi. Lui la brucia nel fuoco, sollevato. (Kael accumula meno Peso.)'),
    T('«Se Tomas è ancora vivo oltre il portale, voglio che sia tu ad aprirlo con me.» Kael ora combatte come chi ha di nuovo qualcosa da perdere. (Kael +10% salute e attacco.)'),
  ],
  lyra: [
    T('Lyra sorride, per la prima volta senza stanchezza. «Elara diceva che chi cura non riceve mai niente. Si sbagliava.»'),
    T('Lyra ti confessa di aver lasciato morire un uomo, una volta, perché aveva paura. «Tu sei il primo a cui lo dico.» (Lyra accumula meno Peso.)'),
    T('Lyra intreccia il tuo nome in una preghiera di guarigione. Ora, quando ti cura, la ferita ricorda chi sei. (Lyra +10% salute e attacco.)'),
  ],
  brann: [
    T('Brann annuisce, rigido. Poi, quando pensa che tu non lo veda, stringe il dono come un bambino stringe un giocattolo.'),
    T('Brann ti racconta del giorno in cui la sua compagnia è caduta e lui no. «Ho giurato che non sarebbe successo più. Tu mi aiuti a mantenerlo.» (Brann accumula meno Peso.)'),
    T('Brann incide il tuo nome accanto a quelli dei suoi compagni morti, sullo scudo. «Non per ricordarti. Per proteggerti.» (Brann +10% salute e attacco.)'),
  ],
  mira: [
    T('Mira solleva un sopracciglio. «Un dono? Di solito la gente mi lancia pietre.» Lo tiene comunque.'),
    T('Mira ti insegna a leggere i testi proibiti al contrario. Ridete fino all’alba, e per una notte la valle non fa paura. (Mira accumula meno Peso.)'),
    T('Mira brucia la sua ultima pagina sacra per scaldarti le mani. «Ora non ho più niente in cui credere. A parte te.» (Mira +10% salute e attacco.)'),
  ],
};
const GIFT_TIERS = [1, 3, 6];

export function giftableItems(s: GameState): Item[] {
  const eq = new Set(Object.values(s.hero.equipped));
  return s.inventory.filter(i => !eq.has(i.uid) && !i.locked);
}

export function giveGift(s: GameState, compId: string, itemUid: string) {
  const c = s.companions.find(x => x.id === compId);
  const idx = s.inventory.findIndex(i => i.uid === itemUid);
  if (!c || !c.recruited || c.left || idx < 0) return;
  const it = s.inventory[idx];
  if (Object.values(s.hero.equipped).includes(itemUid) || it.locked) return;
  s.inventory.splice(idx, 1);
  const liked = (GIFT_LIKES[compId] || []).includes(it.slot);
  const gain = Math.round((4 + it.rarity * 3) * (liked ? 2 : 1));
  c.trust = Math.min(100, c.trust + gain);
  c.weight = Math.max(0, (c.weight || 0) - 15);
  if ((c.weight || 0) < 25) c.mood = null;
  c.gifts = (c.gifts || 0) + 1;
  toast(s, liked ? T('🎁 {c} adora il dono! Fiducia +{n}', { c: c.name, n: gain }) : T('🎁 {c} accetta il dono. Fiducia +{n}', { c: c.name, n: gain }), 'good');
  const tier = GIFT_TIERS.indexOf(c.gifts);
  if (tier >= 0 && GIFT_SCENES[compId]) {
    if (tier >= 1) addFlag(s, `gift${tier + 1}_${compId}`);
    const text = GIFT_SCENES[compId][tier];
    s.modal = { kind: 'info', title: T('💞 Scena privata: {c}', { c: c.name }), text };
    chronicle(s, T('Un momento con {c}: {text}', { c: c.name, text }), 'choice');
  }
}
export const nextGiftScene = (c: { gifts?: number }) => GIFT_TIERS.find(t => t > (c.gifts || 0)) ?? null;

// ------------------------------------------------------------
// Sfida del giorno: lo stesso dungeon per tutti, oggi
// ------------------------------------------------------------
export const DAILY_LB = 'krak_daily';
export function dailyMods(day = todayKey()): string[] {
  const r = mulberry32(hashStr('krak-daily-' + day));
  const keys = Object.keys(DUNGEON_MODIFIERS);
  const out: string[] = [];
  while (out.length < 2 && out.length < keys.length) { const k = pick(keys, r); if (!out.includes(k)) out.push(k); }
  return out;
}
export function ensureDailyRun(s: GameState) {
  const day = todayKey();
  if (s.dailyRun.day !== day) s.dailyRun = { day, best: 0, tries: 0, allBest: s.dailyRun.allBest || 0 };
}
export function finishDailyRun(s: GameState, d: DelveState): string[] {
  ensureDailyRun(s);
  const score = d.floorCleared ? d.floor : d.floor - 1;
  const lines = [T('🗓️ Sfida del giorno: piano {n} raggiunto.', { n: score })];
  if (score > s.dailyRun.best) {
    s.dailyRun.best = score;
    lines.push(T('Nuovo record personale di oggi!'));
    const cen = 25 * score;
    if (cen) addRes(s, { cenere: cen });
    if (score >= 8 && !hasFlag(s, 'daily_relic_' + s.dailyRun.day)) { s.reliquie++; addFlag(s, 'daily_relic_' + s.dailyRun.day); lines.push(T('Oltre l’ottavo piano: +1 reliquia.')); }
    submitScore(DAILY_LB, score);
  }
  s.dailyRun.allBest = Math.max(s.dailyRun.allBest || 0, score);
  return lines;
}

// ------------------------------------------------------------
// Stanze-enigma: sequenza di candele / riparazione del sigillo
// ------------------------------------------------------------
export const PUZZLE_SYMBOLS = ['🕯️', '👁️', '🩸', '🌙', '💀', '🗝️'];
export function makePuzzle(floor: number, r: () => number): NonNullable<NonNullable<DelveState['room']>['puzzle']> {
  const mode = r() < 0.5 ? 'candele' : 'sigillo';
  const len = Math.min(7, 3 + Math.floor(floor / 4));
  const seq: number[] = [];
  for (let i = 0; i < len; i++) seq.push(Math.floor(r() * (mode === 'candele' ? 4 : 6)));
  return { seq, input: [], mode };
}

// ------------------------------------------------------------
// Il risveglio di Krak: una sola volta, a metà del primo Ciclo
// ------------------------------------------------------------
export function maybeKrakWakes(s: GameState) {
  if (hasFlag(s, 'krak_woke') || s.cycle.n > 1) return;
  if ((s.totals.delves || 0) < 10 || s.hero.level < 6) return;
  addFlag(s, 'krak_woke');
  addFlag(s, 'krak_wake_pending');
  chronicle(s, T('Krak ti ha parlato. Non attraverso la valle: attraverso il vetro.'), 'fate');
}
export function closeKrakWake(s: GameState) {
  s.flags = s.flags.filter(f => f !== 'krak_wake_pending');
  s.glitchUntil = Date.now() + 75_000;
  s.corruption = Math.min(100, s.corruption + 3);
}

// ------------------------------------------------------------
// Bisaccia perduta: si può recuperare una volta guardando una pubblicità
// ------------------------------------------------------------
export function recoverSatchel(s: GameState) {
  const L = s.lostSatchel;
  if (!L) return;
  addRes(s, { cenere: L.cenere, legno: L.legno, pietra: L.pietra, ferro: L.ferro });
  for (const it of L.items) addItem(s, it);
  s.lostSatchel = null;
  toast(s, T('🎒 Sei tornato a prenderla: la bisaccia perduta è di nuovo tua.'), 'good');
}
