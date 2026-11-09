import { pick, artFor, artOr } from './art';
import { totalBuildings, completeRequest } from '../game/engine/village';
import { canAfford } from '../game/engine/state';
import { Cost } from './ui';
import { t as T } from '../i18n';
import { Pic } from './Pic';
import { Icon } from './icons';
import { useEffect, useState } from 'react';
import type { FactionId, GameState } from '../game/types';
import type { Act } from '../game/useGame';
import { COMPANIONS, FACTIONS, FACTION_IDS } from '../game/data/core';
import { ENEMIES } from '../game/data/enemies';
import { ACHIEVEMENTS, ENDINGS, EXPEDITIONS, FATE_CARDS, FRAGMENTS, SANCTUARY, RES_INFO } from '../game/data/world';
import { DAILY_POOL, type MissionPeriod } from '../game/data/world';
import { cardMod, fmt, fmtTime, hasFlag, repState } from '../game/engine/state';
import { companionStats } from '../game/engine/hero';
import {
  buyListing, canEndCycle, cycleGoals, claimDream, endCycle, memorieGain, priceMult, refreshMarket, sellFragment, startNewCycle,
} from '../game/engine/meta';
import {
  buySanctuary, claimDailyChest, claimMission, missionReward, collectExpedition, expeditionDuration, expeditionSlots, missionProgress, recruit, sanctuaryCost, sendExpedition, toggleParty,
} from '../game/engine/village';
import { deleteSave, exportCode, importCode } from '../game/save';
import { GIFT_LIKES, giftableItems, giveGift, nextGiftScene } from '../game/engine/features';
import { RARITY_COLORS, SLOT_INFO } from '../game/data/world';
import { LangGrid } from './LangPicker';
import { Bar, Btn, Empty, Ico, ItemCard, Panel, Tag, rich } from './ui';

// ============================================================
// MERCATO DELLE ANIME
// ============================================================
export function Market({ state: s, act }: { state: GameState; act: Act }) {
  useEffect(() => { if (Date.now() >= s.market.refreshAt) act(d => refreshMarket(d)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const pm = priceMult(s);
  const ombre = repState(s, 'ombre');
  return (
    <div className="space-y-4">
      <section className="market-hero relative rounded-2xl overflow-hidden p-4 sm:p-6">
        <div aria-hidden className="absolute inset-0 market-bg" />
        <div className="relative flex flex-wrap items-center gap-4 sm:gap-6">
          <span className="portrait-uncanny rounded-full"><Icon name={artOr('merchant', 'mercato')} size={120} /></span>
          <div className="flex-1 min-w-[220px]">
            <p className="text-[10px] uppercase tracking-[0.45em] text-fuchsia-200/70">{T('Ombre del Mercato')}</p>
            <h2 className="font-display text-2xl sm:text-3xl text-gradient-ember">{T('Mercato delle Anime')}</h2>
            <p className="text-xs sm:text-sm text-bone/75 italic mt-1">{T('Qui non si vendono solo oggetti: si commercia destino. Ogni merce porta la storia di chi l\'ha posseduta. I prezzi dipendono dalla tua reputazione con le Ombre del Mercato.')}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="market-stat"><div className="text-[9px] uppercase tracking-widest text-mist">{T('Nuove merci tra')}</div><div className="font-display text-lg text-amber-100">{fmtTime(s.market.refreshAt - Date.now())}</div></div>
            <div className="market-stat"><div className="text-[9px] uppercase tracking-widest text-mist">{T('Prezzi')}</div><div className={`font-display text-lg ${pm < 1 ? 'text-teal-200' : pm > 1 ? 'text-red-300' : 'text-amber-100'}`}>×{pm.toFixed(2)}</div><div className="text-[9px] text-mist">{T(ombre)}</div></div>
          </div>
        </div>
      </section>
      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4">
          <Panel title={T('Merci in vendita')} icon="merchant">
            <div className="grid sm:grid-cols-2 gap-3">
              {s.market.listings.map(l => { const price = Math.round(l.price * pm); const ok = s.res.cenere >= price; return (
                <div key={l.uid} className={`ware rounded-xl p-2.5 flex flex-col ${l.item ? 'r' + l.item.rarity : l.fragment ? 'frag' : 'res'}`}>
                  {l.item && <ItemCard it={l.item} />}
                  {l.item && <p className="text-[10px] text-fate/70 italic mt-1.5 leading-snug">«{l.item.origin}»</p>}
                  {l.fragment && <div className="flex items-center gap-3"><Icon name={pick('frammento_', l.fragment, FRAGMENTS[l.fragment].icon)} size={56} /><div className="text-xs"><b className="text-fate font-display">{FRAGMENTS[l.fragment].name}</b><div className="text-mist leading-snug">{FRAGMENTS[l.fragment].desc}</div></div></div>}
                  {l.res && <div className="flex items-center gap-3"><Icon name={l.res.key} size={56} /><div><div className="font-display text-xl text-amber-100">{fmt(l.res.amount)}</div><div className="text-xs text-mist">{RES_INFO[l.res.key].name}</div></div></div>}
                  <div className="flex items-center justify-between mt-auto pt-2 text-[11px]">
                    <span className="text-mist italic truncate">{T('da')}{' '}{l.seller}</span>
                    <button disabled={!ok} onClick={() => act(d => buyListing(d, l.uid))} className="coin-btn"><Icon name="cenere" size={22} /> {fmt(price)}</button>
                  </div>
                </div>
              ); })}
            </div>
          </Panel>
          <Panel title={T('Vendi Frammenti')} icon="frammento_memoria">
            {s.fragments.length === 0 ? <Empty>{T('Nessun frammento da vendere.')}</Empty> : (
              <div className="grid sm:grid-cols-2 gap-2">{s.fragments.map(f => (
                <button key={f.uid} onClick={() => act(d => sellFragment(d, f.uid))} className="flex items-center gap-2 rounded-lg border border-stone-700 hover:border-fate bg-black/40 p-2 text-left">
                  <Icon name={pick('frammento_', f.defId, FRAGMENTS[f.defId].icon)} size={36} />
                  <span className="flex-1 text-xs text-bone">{FRAGMENTS[f.defId].name}{FRAGMENTS[f.defId].dark ? <span className="text-dissonance"> · {T('oscuro')}</span> : null}</span>
                  <span className="text-xs text-amber-200 flex items-center gap-1"><Icon name="cenere" size={20} />{fmt(Math.round(FRAGMENTS[f.defId].value * 6 / pm))}</span>
                </button>))}</div>
            )}
            <p className="text-[10px] text-mist mt-2">{T('Vendere frammenti oscuri incupisce la valle. Per vendere equipaggiamento, usa l\'Inventario dell\'Eroe.')}</p>
          </Panel>
        </div>
        <Panel title={T('Storico delle Anime')} icon="diario">
          {s.market.history.length === 0 ? <Empty>{T('Nessuno scambio ancora.')}</Empty> : (
            <div className="space-y-1.5 max-h-[560px] overflow-y-auto text-[11px] text-bone/70">{s.market.history.slice(0, 40).map((h, i) => <div key={i} className="border-l-2 border-fate/40 pl-2 py-0.5">{h}</div>)}</div>
          )}
        </Panel>
      </div>
    </div>
  );
}

// ============================================================
// FAZIONI
// ============================================================
const REP_COLORS: Record<string, string> = { Adorato: 'text-teal-200', Fidato: 'text-resonance', Tollerato: 'text-bone', Ignorato: 'text-mist', Temuto: 'text-fate', Bandito: 'text-orange-400', Marchiato: 'text-dissonance' };
const REP_EFFECTS: Record<FactionId, string> = {
  culto: T('Fidato: il Culto ti offre la Fonte. Bandito: fanatici nelle incursioni.'),
  capitale: T('Fidato: taglie più ricche. Bandito: tasse e predoni.'),
  gilde: T('Produzione globale; Fidato: forgia migliore; Adorato: edifici −10%.'),
  contadini: T('Produzione di provviste e legno; ti proteggono dalle incursioni.'),
  guaritori: T('Cure di Elara, rituali per sciogliere pegni e aberrazioni.'),
  eretici: T('Verità nascoste; la Parola d\'Ordine li rende tuoi alleati.'),
  ombre: T('Prezzi del Mercato delle Anime e Contratti di Fato.'),
  guardiani: T('Sigilli di Krak: la valle respira meglio.'),
};
export function Factions({ state: s, act }: { state: GameState; act: Act }) {
  const now = Date.now();
  return (
    <div className="space-y-4">
      <section className="panel rounded-2xl p-4 sm:p-5 relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_0%,rgba(245,181,68,.12),transparent_60%)]" />
        <h2 className="relative font-display text-2xl text-gradient-ember flex items-center gap-3"><Icon name="fazioni" size={44} />{T('Reputazione nella Valle')}</h2>
        <p className="relative text-xs text-mist mt-1 max-w-3xl">{T('Niente karma unico. Guadagnare reputazione con una fazione spesso danneggia la sua rivale. Lo stato (Ignorato, Tollerato, Fidato, Temuto, Adorato, Bandito, Marchiato) cambia dialoghi, prezzi, eventi e finali.')}</p>
      </section>
      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4 items-start">
        <div className="grid sm:grid-cols-2 gap-3">
          {FACTION_IDS.map(f => {
            const F = FACTIONS[f];
            const v = s.factions[f];
            const st = repState(s, f);
            return (
              <div key={f} className={`faction-card rounded-xl p-3 ${v >= 30 ? 'ally' : v <= -30 ? 'foe' : ''}`}>
                <div className="flex items-center gap-3">
                  <Icon name={pick('fazione_', F.id, F.icon)} size={60} />
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-bone leading-tight">{F.name}</div>
                    <div className={`text-xs ${REP_COLORS[st]}`}>{T(st)} · {Math.round(v)}</div>
                  </div>
                </div>
                <div className="rep-gauge mt-2"><span className="rep-mark" style={{ left: `${50 + v / 2}%` }} /></div>
                <div className="flex justify-between text-[9px] uppercase tracking-widest text-mist mt-0.5"><span>{T('Marchiato')}</span><span>{T('Adorato')}</span></div>
                <p className="text-[11px] text-mist mt-1.5 leading-snug">{F.desc}</p>
                <p className="text-[10px] text-bone/60 mt-1">{REP_EFFECTS[f]}</p>
                <p className="text-[10px] text-red-300/70 mt-1 flex items-center gap-1">{T('Rivale: {name}.', { name: FACTIONS[F.opposite].name })}</p>
              </div>
            );
          })}
        </div>
        <Panel title={T('Richieste delle Fazioni')} icon="missioni">
          {s.requests.length === 0 && <p className="text-xs text-mist italic">{totalBuildings(s) < 4 ? T('Le fazioni ti noteranno quando il villaggio avrà 4 edifici.') : T('Nessuna richiesta, per ora. Ne arriveranno altre.')}</p>}
          <div className="space-y-2.5">
            {s.requests.map(r => (
              <div key={r.uid} className="request-card rounded-xl p-2.5 text-xs">
                <div className="flex items-center gap-2"><Icon name={pick('fazione_', r.faction, FACTIONS[r.faction].icon)} size={36} /><span className="flex-1 text-bone font-display">{FACTIONS[r.faction].name}</span><span className="text-mist">{fmtTime(r.until - now)}</span></div>
                <p className="text-bone/75 italic my-1.5">«{r.text}»</p>
                <div className="flex items-center justify-between gap-2">
                  <span>{T('Chiede:')}{' '}<Cost cost={r.need} have={s.res} /></span>
                  <Btn small kind="good" disabled={!canAfford(s, r.need)} onClick={() => act(d => completeRequest(d, r.uid))}>{T('Consegna')}</Btn>
                </div>
                <div className="text-[10px] text-mist mt-1"><Ico>{T('Ricompensa: ⚱️{c} · reputazione +{rep} (−{down} {rival})', { c: r.reward.cenere || 0, rep: r.reward.rep, down: Math.round(r.reward.rep * 0.4), rival: FACTIONS[FACTIONS[r.faction].opposite].name })}{r.reward.reliquie ? ' · 🏺1' : ''}</Ico></div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ============================================================
// COMPAGNI E SPEDIZIONI
// ============================================================
export function Companions({ state: s, act }: { state: GameState; act: Act }) {
  const now = Date.now();
  const [loc, setLoc] = useState(EXPEDITIONS[0].id);
  const busy = s.companions.filter(c => c.mission).length;
  const [giftFor, setGiftFor] = useState<string | null>(null);
  const gifts = giftableItems(s).sort((a, b) => b.rarity - a.rarity).slice(0, 10);
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Panel title={T('Compagni')} icon="👥" right={<span className="text-xs text-mist">{T('In gruppo:')}{' '}{s.companions.filter(c => c.inParty).length}/2</span>}>
        <div className="space-y-2">
          {COMPANIONS.filter(def => (def.minCycle || 1) <= s.cycle.n).map(def => {
            const c = s.companions.find(x => x.id === def.id)!;
            const cs = companionStats(s, c.id);
            return (
              <div key={c.id} className={`rounded-lg border p-2 ${c.left ? 'border-stone-800 opacity-40' : 'border-stone-700'}`}>
                <div className="flex items-center gap-2">
                  <Pic id={c.id} emoji={c.icon} size={52} className="text-3xl" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-bone">{c.name} <span className="text-[10px] text-mist">· {c.role} · Lv {c.level}</span></div>
                    <div className="text-[11px] text-mist italic">{def.bio}</div>
                    {c.recruited && !c.left && (
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <Bar value={c.trust} max={100} color={c.trust < 25 ? 'bg-dissonance' : 'bg-amber-400'} height="h-1" label={<><span>{T('Fiducia')}</span><span>{Math.round(c.trust)}</span></>} />
                        <Bar value={c.hp} max={1} color="bg-red-700" height="h-1" label={<><span>{T('Salute')}</span><span>{Math.round(c.hp * 100)}%</span></>} />
                        <Bar value={c.weight || 0} max={100} color="bg-violet-600" height="h-1" label={<><span>{T('Peso')}{c.mood === 'broken' ? ' · 💔' : c.mood === 'virtue' ? ' · ✨' : ''}</span><span>{Math.round(c.weight || 0)}</span></>} />
                      </div>
                    )}
                    <div className="text-[10px] text-mist mt-0.5">{T('Salute {hp} · Attacco {atk} · Difesa {def}', { hp: cs.maxHp, atk: cs.atk, def: cs.def })} · {def.row === 'front' ? T('prima fila') : T('retrovia')}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {c.left && <Tag className="text-dissonance">{T('Ti ha abbandonato')}</Tag>}
                  {!c.recruited && !c.left && def.joinsByStory && <Tag className="text-amber-200 border-amber-600/60">{T('📜 Si unirà a te attraverso la sua storia')}</Tag>}
                  {!c.recruited && !c.left && !def.joinsByStory && <Btn small kind="good" onClick={() => act(d => recruit(d, c.id))}>{T('Recluta · ⚱️')}{def.recruitCost?.cenere}{def.recruitCost?.reliquie ? ` 🏺${def.recruitCost.reliquie}` : ''}</Btn>}
                  {c.recruited && !c.left && !c.mission && <Btn small kind={c.inParty ? 'ember' : 'default'} disabled={!!s.delve} onClick={() => act(d => toggleParty(d, c.id))}>{c.inParty ? T('✔ Nel gruppo') : T('Porta con te')}</Btn>}
                  {c.recruited && !c.left && !c.mission && !s.delve && <Btn small onClick={() => act(d => sendExpedition(d, c.id, loc))}>{T('🧭 Manda in spedizione')}</Btn>}
                  {c.recruited && !c.left && <Btn small kind={giftFor === c.id ? 'ember' : 'default'} onClick={() => setGiftFor(giftFor === c.id ? null : c.id)}>{T('🎁 Fai un dono')}{c.gifts ? ` · ${c.gifts}` : ''}</Btn>}
                  {c.mission && (c.mission.end <= now
                    ? <Btn small kind="good" onClick={() => act(d => collectExpedition(d, c.id))}>{T('Raccogli il bottino (')}{EXPEDITIONS.find(e => e.id === c.mission!.locId)?.name})</Btn>
                    : <Tag>{T('In {place} · torna tra {time}', { place: EXPEDITIONS.find(e => e.id === c.mission!.locId)?.name || '', time: fmtTime(c.mission.end - now) })}</Tag>)}
                </div>
                {giftFor === c.id && (
                  <div className="mt-2 rounded-lg border border-amber-700/40 bg-black/40 p-2">
                    <p className="text-[11px] text-mist mb-1">{T('Ama ricevere:')} {(GIFT_LIKES[c.id] || []).map(x => SLOT_INFO[x].icon + ' ' + SLOT_INFO[x].name).join(', ')} · {nextGiftScene(c) ? T('Prossima scena privata al dono n. {n}', { n: nextGiftScene(c)! }) : T('Hai visto tutte le sue scene private.')}</p>
                    {gifts.length ? <div className="grid sm:grid-cols-2 gap-1">{gifts.map(it => (
                      <button key={it.uid} onClick={() => act(d => giveGift(d, c.id, it.uid))} className="text-left text-xs rounded border border-stone-700 hover:border-ember px-2 py-1 flex justify-between gap-2">
                        <span className={RARITY_COLORS[it.rarity]}>{it.name}</span>{(GIFT_LIKES[c.id] || []).includes(it.slot) && <span title={T('Lo adora')}>💛</span>}
                      </button>))}</div> : <p className="text-xs text-mist">{T('Non hai oggetti da donare (quelli equipaggiati o bloccati non si possono dare).')}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-mist mt-2">{T('Usare un compagno come scudo ne abbassa la fiducia. Sotto 25 esita in battaglia; a 0 se ne va per sempre.')}</p>
      </Panel>
      <Panel title={T('Spedizioni ({busy}/{s} slot)', { busy: busy, s: expeditionSlots(s) })} icon="🧭">
        <p className="text-xs text-mist mb-2">{T('Le spedizioni durano ore reali e continuano anche a gioco chiuso. Scegli la destinazione, poi manda un compagno.')}</p>
        <div className="space-y-1.5">
          {EXPEDITIONS.map(e => (
            <button key={e.id} onClick={() => setLoc(e.id)} className={`w-full text-left rounded-lg border p-2 text-xs ${loc === e.id ? 'border-ember bg-ember/10' : 'border-stone-700'}`}>
              <div className="flex justify-between"><span className="text-bone flex items-center gap-1.5"><Pic id={e.id} emoji={e.icon} size={30} /> {e.name}</span><span className="text-mist">{fmtTime(expeditionDuration(s, e.minutes))} · Lv {e.minLevel}+</span></div>
              <div className="text-mist">{e.desc}</div>
              <div className="text-[10px] text-bone/60">{Object.entries(e.rewards).filter(([k]) => !k.endsWith('Chance')).map(([k, v]) => `${v} ${(RES_INFO as any)[k]?.name || k}`).join(' · ')}{e.rewards.itemChance ? T(' · oggetto {itemChance}%', { itemChance: Math.round(e.rewards.itemChance * 100) }) : ''}{e.rewards.fragmentChance ? T(' · frammento {fragmentChance}%', { fragmentChance: Math.round(e.rewards.fragmentChance * 100) }) : ''}</div>
            </button>
          ))}
        </div>
        {cardMod(s, 'exped') > 0 && <p className="text-[11px] text-fate mt-2">{T('Carta del Destino: spedizioni più rapide.')}</p>}
      </Panel>
    </div>
  );
}

// ============================================================
// DIARIO: giornaliere, sogni, imprese, bestiario, cronaca
// ============================================================
const MISSION_ICON: Record<string, string> = { d_floors: 'discesa', d_kills: 'combat', d_clicks: 'legno', d_build: 'villaggio', d_fish: 'pesca', d_forge: 'fucina', d_cart: 'merchant', d_req: 'fazioni', d_exp: 'spedizioni', d_cenere: 'cenere', d_delves: 'porte', d_bosses: 'boss', d_echo: 'risonanza', d_coherent: 'fardello', d_colosso: 'colosso' };
function resetIn(period: MissionPeriod) {
  const n = new Date(); const t = new Date(n);
  if (period === 'daily') { t.setHours(24, 0, 0, 0); }
  else if (period === 'weekly') { t.setHours(0, 0, 0, 0); t.setDate(t.getDate() + (8 - (t.getDay() || 7))); }
  else { t.setHours(0, 0, 0, 0); t.setMonth(t.getMonth() + 1, 1); }
  return t.getTime() - n.getTime();
}
function MissionList({ state: s, act, period }: { state: GameState; act: Act; period: MissionPeriod }) {
  const box = s[period];
  const R = missionReward(s, period);
  const title = { daily: T('Giornaliere'), weekly: T('Settimanali'), monthly: T('Mensili') }[period];
  const bonusN = period === 'daily' ? 1 : period === 'weekly' ? 3 : 8;
  return (
    <section className={`mission-box ${period} rounded-2xl p-3 sm:p-4`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="font-display text-lg text-bone flex items-center gap-2"><Icon name={period === 'daily' ? 'sfida' : period === 'weekly' ? 'missioni' : 'imprese'} size={34} />{title}</h3>
        <span className="text-[10px] uppercase tracking-widest text-mist">{T('Si rinnova tra {t}', { t: resetIn(period) > 172800000 ? T('{d}g {h}h', { d: Math.floor(resetIn(period) / 86400000), h: Math.floor((resetIn(period) % 86400000) / 3600000) }) : fmtTime(resetIn(period)) })}</span>
      </div>
      {period === 'daily' && <button disabled={s.daily.chest} onClick={() => act(d => claimDailyChest(d))} className={`w-full mb-3 flex items-center gap-3 rounded-xl border p-2 text-left ${s.daily.chest ? 'border-stone-800 opacity-50' : 'border-amber-500/70 bg-amber-900/20 hover:bg-amber-900/40 animate-pulseGlow'}`}>
        <Icon name="treasure" size={44} /><span className="flex-1 font-display text-amber-100">{s.daily.chest ? T('🎁 Forziere già aperto oggi') : T('🎁 Apri il forziere giornaliero')}</span>
      </button>}
      <div className="space-y-2">
        {box.missions.map(m => {
          const def = DAILY_POOL.find(d => d.id === m.id); if (!def) return null;
          const p = Math.min(m.target, Math.max(0, missionProgress(s, m.id, period)));
          const done = p >= m.target;
          return (
            <div key={m.id} className={`mission-row rounded-xl p-2 flex items-center gap-3 ${m.claimed ? 'claimed' : done ? 'ready' : ''}`}>
              <Icon name={MISSION_ICON[m.id] || 'missioni'} size={40} />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-bone leading-tight">{def.text(m.target)}</div>
                <div className="h-1.5 rounded-full bg-black/70 overflow-hidden mt-1"><div className={`h-full ${done ? 'bg-gradient-to-r from-teal-600 to-teal-300' : 'bg-gradient-to-r from-amber-800 to-amber-400'}`} style={{ width: `${(p / m.target) * 100}%` }} /></div>
                <div className="text-[10px] text-mist mt-0.5"><Ico>{fmt(p)}/{fmt(m.target)} · +{fmt(R.cenere)} {T('Cenere')}{R.reliquie ? ` · 🏺${R.reliquie}` : ''}</Ico></div>
              </div>
              {m.claimed ? <span className="text-teal-300 text-lg">✔</span> : <Btn small kind="good" disabled={!done} onClick={() => act(d => claimMission(d, m.id, period))}>{T('Riscuoti')}</Btn>}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-mist mt-2">{box.bonus ? T('Premio completo riscosso.') : T('Completale tutte per {n} reliquie in più.', { n: bonusN })}</p>
    </section>
  );
}

export function Journal({ state: s, act }: { state: GameState; act: Act }) {
  const [tab, setTab] = useState<'oggi' | 'cronaca' | 'imprese' | 'bestiario'>('oggi');
  const tabs = [
    { id: 'oggi' as const, icon: 'missioni', name: T('Missioni') },
    { id: 'cronaca' as const, icon: 'diario', name: T('Cronache') },
    { id: 'imprese' as const, icon: 'imprese', name: T('Imprese') },
    { id: 'bestiario' as const, icon: 'bestiario', name: T('Bestiario') },
  ];
  const kindColor: Record<string, string> = { fate: 'text-fate', promise: 'text-amber-300', combat: 'text-red-300', loot: 'text-teal-200', world: 'text-sky-200', choice: 'text-bone' };
  const kindDot: Record<string, string> = { fate: 'bg-fate', promise: 'bg-amber-400', combat: 'bg-red-500', loot: 'bg-teal-400', world: 'bg-sky-400', choice: 'bg-bone' };
  const groups: { day: string; items: typeof s.chronicle }[] = [];
  for (const c of s.chronicle) { const day = new Date(c.t).toLocaleDateString(undefined, { day: '2-digit', month: 'long' }); const g = groups[groups.length - 1]; if (g && g.day === day) g.items.push(c); else groups.push({ day, items: [c] }); }
  const seen = Object.values(ENEMIES).filter(e => !e.tags.includes('world') || s.bestiary[e.id]);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={`journal-tab ${tab === t.id ? 'on' : ''}`}><Icon name={t.icon} size={44} /><span className="font-display">{t.name}</span></button>)}
      </div>
      {tab === 'oggi' && (
        <div className="space-y-4">
          <div className="grid lg:grid-cols-3 gap-4 items-start">
            <MissionList state={s} act={act} period="daily" />
            <MissionList state={s} act={act} period="weekly" />
            <MissionList state={s} act={act} period="monthly" />
          </div>
          <Panel title={T('Diario Onirico')} icon="sogni">
            <p className="text-xs text-mist mb-2">{T('Il tuo salvataggio sogna mentre sei via. Torni e trovi tracce di ciò che è accaduto.')}</p>
            {s.dreams.length === 0 ? <Empty>{T('Nessun sogno. Torna dopo almeno un\'ora di assenza.')}</Empty> : <div className="grid sm:grid-cols-2 gap-2">{s.dreams.map(d => (
              <div key={d.id} className="rounded-xl border border-indigo-800 bg-indigo-950/30 p-3 text-xs">
                <div className="text-bone font-display">{d.title}</div>
                <p className="text-bone/70 italic my-1">{d.text}</p>
                <Btn small kind="fate" onClick={() => act(x => claimDream(x, d.id))}>{T('Svegliati')}</Btn>
              </div>
            ))}</div>}
          </Panel>
        </div>
      )}
      {tab === 'cronaca' && (
        <Panel title={T('La Valle Ricorda')} icon="diario">
          {s.chronicle.length === 0 ? <Empty>{T('Ancora nulla da ricordare.')}</Empty> : (
            <div className="max-h-[680px] overflow-y-auto pr-1">
              {groups.map(g => (
                <div key={g.day} className="mb-4">
                  <div className="sticky top-0 z-[1] bg-[#120e0c]/95 py-1 font-display text-sm text-amber-200/90 tracking-widest uppercase border-b border-amber-900/40">{g.day}</div>
                  <div className="chron-line mt-2 space-y-2">
                    {g.items.map((c, i) => (
                      <div key={i} className="relative pl-6 text-xs">
                        <span className={`absolute left-[3px] top-1 w-2.5 h-2.5 rounded-full ${kindDot[c.kind] || 'bg-bone'} shadow-[0_0_8px_currentColor]`} />
                        <span className="text-mist mr-2">{new Date(c.t).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className={kindColor[c.kind] || 'text-bone/80'}>{c.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}
      {tab === 'imprese' && (
        <Panel title={T('Imprese {achievements}/{ACHIEVEMENTS}', { achievements: s.achievements.length, ACHIEVEMENTS: ACHIEVEMENTS.length })} icon="imprese" right={<span className="text-xs text-amber-300">+{s.achievements.length * 2}{T('% produzione')}</span>}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {ACHIEVEMENTS.map(a => { const got = s.achievements.includes(a.id); const prog = a.stat && a.need ? Math.min(1, (s.totals[a.stat] || 0) / a.need) : 0; return (
              <div key={a.id} className={`feat-card rounded-xl p-3 flex flex-col items-center text-center ${got ? 'got' : ''}`}>
                <span className={got ? 'feat-medal' : 'grayscale brightness-[.35]'}><Icon name={pick('impresa_', a.id, 'imprese')} size={72} /></span>
                <div className={`font-display text-sm mt-2 leading-tight ${got ? 'text-amber-100' : 'text-mist'}`}>{a.name}</div>
                <div className="text-[10px] text-mist leading-snug mt-1">{a.desc}</div>
                {!got && a.stat && a.need && <div className="w-full h-1 rounded-full bg-black/70 overflow-hidden mt-2"><div className="h-full bg-amber-600" style={{ width: `${prog * 100}%` }} /></div>}
              </div>
            ); })}
          </div>
        </Panel>
      )}
      {tab === 'bestiario' && (
        <Panel title={T('Bestiario')} icon="bestiario" right={<span className="text-xs text-mist">{seen.filter(e => s.bestiary[e.id]).length}/{seen.length}</span>}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {seen.map(e => {
              const n = s.bestiary[e.id] || 0;
              return (
                <div key={e.id} className={`beast-card rounded-xl p-3 flex flex-col items-center text-center ${n ? '' : 'unknown'}`}>
                  <span className={n ? 'portrait-uncanny rounded-full' : 'brightness-0 opacity-70'}><Icon name={artFor(e.id) ? e.id : e.icon} size={84} /></span>
                  <div className={`font-display text-sm mt-2 ${n ? 'text-red-100' : 'text-stone-600'}`}>{n ? e.name : '???'}</div>
                  {n > 0 && <div className="text-[10px] text-mist">{T('Abbattuti: {n}', { n })}</div>}
                  {n > 0 && <p className="text-[10px] text-bone/65 italic leading-snug mt-1">{e.lore}</p>}
                  {n > 0 && e.tags.length > 0 && <div className="text-[9px] text-fate mt-1 uppercase tracking-wider">{e.tags.join(' · ')}</div>}
                </div>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
}

// ============================================================
// EREDITÀ: Ciclo, Santuario, Echi dei portatori passati
// ============================================================
export function Legacy({ state: s, act }: { state: GameState; act: Act }) {
  const can = canEndCycle(s);
  const card = FATE_CARDS.find(c => c.id === s.cycle.card);
  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title={T('Ciclo {n}', { n: s.cycle.n })} icon="♾️">
          <p className="text-xs text-mist mb-2">{rich(T('Quando il tuo portatore raggiunge il Cuore di Krak (o la valle diventa leggenda), puoi chiudere il Ciclo. Il personaggio diventa un\'Eredità: un\'eco che i futuri portatori incontreranno. Ottieni **Memorie** permanenti (+5% produzione e +1,5% statistiche ciascuna). Conservi reliquie, Santuario, imprese, memorie dello stagno e bestiario.'))}</p>
          <div className="text-xs space-y-1">
            <div>{T('Memorie accumulate:')}{' '}<b className="text-fate">{s.cycle.memorieTotal}</b> {T('(+{n}% produzione)', { n: s.cycle.memorieTotal * 5 })}</div>
            <div>{T('Cenere di questo Ciclo:')}{' '}{fmt(s.totals.cycleCenere || 0)}</div>
            <div>{T('Memorie se chiudi ora:')}{' '}<b className="text-amber-300">{memorieGain(s)}</b></div>
            {card && <div>{T('Carta del Destino:')}{' '}{card.icon} {card.name} — <span className="text-teal-200">{card.good}</span> / <span className="text-red-300">{card.bad}</span></div>}
          </div>
          <div className="mt-3 rounded-lg border border-red-900/60 bg-red-950/20 p-2 text-xs">
            <div className="flex items-center gap-2"><Icon name={artOr('cuore_krak', 'boss')} size={36} /><div><b className={hasFlag(s, 'boss_cuore_krak') ? 'text-teal-200' : 'text-red-100'}>{T('Via del Cuore')}</b>{hasFlag(s, 'boss_cuore_krak') ? ' ✔' : ''}<div className="text-mist">{T('Sconfiggi il Cuore di Krak in fondo alla Torre del Silenzio: Memorie raddoppiate.')}</div></div></div>
          </div>
          <div className="mt-2 rounded-lg border border-stone-700 bg-black/30 p-2 text-xs">
            <b className="text-bone">{T('Via lunga')}</b>
            <div className="space-y-1 mt-1">{cycleGoals(s).map(g => (
              <div key={g.label}><div className="flex justify-between"><span className={g.done ? 'text-teal-200' : 'text-bone/80'}>{g.done ? '✔ ' : ''}{g.label}</span><span className="text-mist">{fmt(Math.min(g.have, g.need))}/{fmt(g.need)}</span></div>
                <div className="h-1 rounded-full bg-black/70 overflow-hidden"><div className={`h-full ${g.done ? 'bg-teal-400' : 'bg-amber-600'}`} style={{ width: `${Math.min(100, (g.have / g.need) * 100)}%` }} /></div></div>))}</div>
          </div>
          <Btn kind="fate" className="mt-3" disabled={!can} onClick={() => act(d => endCycle(d))}>{can ? T('Chiudi il Ciclo e scopri il tuo finale') : T('Completa una delle due vie per chiudere il Ciclo')}</Btn>
        </Panel>
        <Panel title={T('Echi dei Portatori Passati')} icon="👤">
          {s.legacies.length === 0 ? <Empty>{T('Nessuna eredità ancora. Il tuo sarà il primo nome che la valle ricorderà.')}</Empty> : s.legacies.map((l, i) => (
            <div key={i} className="text-xs border-b border-stone-800 py-1"><b className="text-bone">{l.name}</b>{' '}{T('· Ciclo')}{' '}{l.cycle} · Lv {l.level} · <span className="text-fate">{l.ending}</span>{' '}{T('· nei dungeon appare come')}{' '}{({ ally: 'alleato', enemy: 'nemico', merchant: 'mercante', corpse: T('cadavere con bottino') })[l.kind]}</div>
          ))}
        </Panel>
      </div>
      <Panel title={T('Santuario delle Reliquie')} icon="reliquie" right={<span className="text-sm text-yellow-200"><Ico>{`🏺 ${s.reliquie}`}</Ico></span>}>
        <p className="text-xs text-mist mb-3">{T('Offri reliquie per potenziamenti permanenti che sopravvivono a ogni Ciclo.')}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {SANCTUARY.map(x => {
            const lvl = s.cycle.sanctuary[x.id] || 0;
            return (
              <button key={x.id} disabled={lvl >= x.max || s.reliquie < sanctuaryCost(s, x.id)} onClick={() => act(d => buySanctuary(d, x.id, x.max))} className="text-left rounded-lg border border-stone-700 p-2 text-xs disabled:opacity-50 hover:border-ember">
                <div className="flex justify-between"><span className="text-bone flex items-center gap-1.5"><Icon name={pick('eredita_', x.id, x.icon)} size={26} /> {x.name}</span><span className="text-mist">{lvl}/{x.max}</span></div>
                <div className="text-mist"><Ico>{x.desc}: +{lvl * x.per}{x.id === 'memoria' ? 'h' : '%'} {lvl < x.max && <span className="text-amber-300">{T('→ costo 🏺')}{sanctuaryCost(s, x.id)}</span>}</Ico></div>
              </button>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

// ============================================================
// OPZIONI: salvataggi, audio, accessibilità
// ============================================================
export function Settings({ state: s, act, replace, saveNow, onFullscreen }: { state: GameState; act: Act; replace: (s: GameState) => void; saveNow: () => boolean; onFullscreen: () => void }) {
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [arm, setArm] = useState(false);
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Panel title={T('Salvataggio')} icon="💾">
        <p className="text-xs text-mist mb-2">{T('Il gioco si salva da solo ogni 10 secondi e alla chiusura della scheda, con 3 backup rotanti e controllo di integrità. Per spostarlo su un altro dispositivo, copia il codice e incollalo lì.')}</p>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => setMsg(saveNow() ? T('Partita salvata.') : T('Salvataggio non riuscito (memoria piena?)'))}>{T('💾 Salva ora')}</Btn>
          <Btn onClick={() => { const c = exportCode(s); setCode(c); navigator.clipboard?.writeText(c).then(() => setMsg(T('Codice copiato negli appunti.')), () => setMsg(T('Codice pronto: selezionalo e copialo.'))); }}>{T('📋 Copia codice')}</Btn>
          <Btn onClick={() => { const g = importCode(code); if (g) { replace(g); setMsg(T('Partita caricata. Bentornato a Hondovalle.')); } else setMsg(T('Questo codice non funziona: controlla che sia completo.')); }}>{T('📥 Carica codice')}</Btn>
        </div>
        <textarea value={code} onChange={e => setCode(e.target.value)} placeholder={T('Incolla qui un codice e premi «Carica codice»')} className="w-full h-24 mt-2 bg-black/60 border border-stone-700 rounded p-2 text-[10px] font-mono" />
        {msg && <p className="text-xs text-resonance mt-1">{msg}</p>}
        <div className="mt-3 border-t border-stone-800 pt-2">
          <Btn kind="bad" small onClick={() => { if (!arm) { setArm(true); return; } deleteSave(); location.reload(); }}>{arm ? T('Tocca di nuovo per cancellare TUTTO') : T('🗑️ Cancella il salvataggio')}</Btn>
        </div>
      </Panel>
      <Panel title={T('Lingua')} icon="globo">
        <p className="text-xs text-mist mb-2">{T('Scegli la lingua del gioco.')}</p>
        <LangGrid onBeforeChange={saveNow} />
      </Panel>
      <Panel title={T('Rito e Suono')} icon="🎧">
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={s.settings.music} onChange={() => act(d => { d.settings.music = !d.settings.music; })} />{' '}{T('Musica e ambiente')}</label>
          <div className="text-xs text-mist">{T('Volume musica')}{' '}{Math.round((s.settings.musicVolume ?? 0.55) * 100)}%
            <input type="range" min={0} max={1} step={0.05} value={s.settings.musicVolume ?? 0.55} onChange={e => { const v = +e.target.value; act(d => { d.settings.musicVolume = v; }); }} className="w-full" />
          </div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={s.settings.sfx} onChange={() => act(d => { d.settings.sfx = !d.settings.sfx; })} />{' '}{T('Effetti sonori')}</label>
          <p className="text-[11px] text-mist">{T('L\'audio è meccanico: con il suono attivo senti (e vedi) gli intenti dei nemici invisibili. Il silenzio totale arriva quando la Dissonanza è al massimo.')}</p>
          <Btn onClick={onFullscreen}>{s.fullscreen ? T('Esci dal Rito') : T('⛶ Entra nel Rito (schermo intero)')}</Btn>
          <p className="text-[11px] text-mist">{T('Nel Rito: +25% Risonanza, sussurri, scelte nascoste negli eventi.')}</p>
          <label className="flex items-center gap-2"><input type="checkbox" checked={s.settings.reduceFx} onChange={() => act(d => { d.settings.reduceFx = !d.settings.reduceFx; })} />{' '}{T('Riduci animazioni ed effetti di corruzione')}</label>
        </div>
      </Panel>
      <Panel title={T('Auto-battaglia')} icon="🤖">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.settings.autoBattle} onChange={() => act(d => { d.settings.autoBattle = !d.settings.autoBattle; })} />{' '}{T('Combatti automaticamente (rotazione coerente col Fardello)')}</label>
        <label className="flex items-center gap-2 text-sm mt-2"><input type="checkbox" checked={s.settings.fastCombat} onChange={() => act(d => { d.settings.fastCombat = !d.settings.fastCombat; })} />{' '}{T('Combattimento veloce')}</label>
        <div className="text-sm mt-2">{T('Bevi una pozione sotto il {n}% di salute', { n: s.settings.autoPotion })}
          <input type="range" min={0} max={80} step={5} value={s.settings.autoPotion} onChange={e => { const v = +e.target.value; act(d => { d.settings.autoPotion = v; }); }} className="w-full" />
        </div>
        <p className="text-[11px] text-mist">{T('L\'auto-battaglia non usa mai azioni di Dissonanza: quelle restano una scelta tua.')}</p>
      </Panel>
      <Panel title={T('Come si gioca')} icon="❔">
        <ul className="text-xs text-bone/80 space-y-1 list-disc pl-4">
          <li>{rich(T('**Villaggio**: raccogli, costruisci, la produzione continua anche offline.'))}</li>
          <li>{rich(T('**Discesa**: scegli le porte, combatti, poi decidi se scendere ancora o mettere al sicuro la bisaccia.'))}</li>
          <li>{rich(T('**Fardello**: le azioni coerenti caricano la Risonanza (→ Eco), quelle incoerenti la Dissonanza (→ azioni oscure).'))}</li>
          <li>{rich(T('**Promesse**: mantenerle dona frammenti; infrangerle evoca il Cacciatore di Promesse.'))}</li>
          <li>{rich(T('**Ciclo**: chiudilo per un finale, un\'Eredità e Memorie permanenti.'))}</li>
        </ul>
      </Panel>
    </div>
  );
}

// ============================================================
// FINALE
// ============================================================
export function Ending({ state: s, act, replace }: { state: GameState; act: Act; replace: (s: GameState) => void }) {
  const [card, setCard] = useState<string | null>(null);
  const [heir, setHeir] = useState<string | null>(null);
  const E = ENDINGS[s.ending || 'cancellato'];
  const gain = memorieGain(s);
  const cands = [...s.inventory].sort((a, b) => b.rarity - a.rarity || b.ilvl - a.ilvl).slice(0, 6);
  return (
    <div className="min-h-screen px-4 py-10 flex items-center justify-center">
      <div className="max-w-3xl w-full space-y-6 animate-rise">
        <div className="text-center">
          <div className="flex justify-center mb-2"><Icon name={pick('finale_', s.ending || 'cancellato', E.icon)} size={96} /></div>
          <p className="text-xs tracking-[0.3em] text-ember uppercase">{T('Finale del Ciclo')}{' '}{s.cycle.n}</p>
          <h1 className="text-3xl text-gradient-ember my-2">{E.name}</h1>
          <p className="text-bone/85 italic max-w-xl mx-auto">{E.text}</p>
          <p className="text-sm text-fate mt-4">{T('+{gain} Memorie. {name} diventa un\'Eredità: i prossimi portatori incontreranno la sua eco.', { gain, name: s.playerName })}</p>
        </div>
        <Panel title={T('Scegli la Carta del Destino per il prossimo Ciclo')} icon="🃏">
          <div className="grid sm:grid-cols-3 gap-2">
            {s.cycle.cardOffer.map(id => { const c = FATE_CARDS.find(x => x.id === id)!; return (
              <button key={id} onClick={() => setCard(id)} className={`rounded-lg border p-3 text-left ${card === id ? 'border-fate bg-fate/10' : 'border-stone-700'}`}>
                <Icon name={pick('carta_', c.id, c.icon)} size={40} /><div className="text-sm text-bone">{c.name}</div>
                <div className="text-[11px] text-teal-200">{c.good}</div><div className="text-[11px] text-red-300">{c.bad}</div>
              </button>
            ); })}
          </div>
        </Panel>
        <Panel title={T('Un oggetto da tramandare (facoltativo)')} icon="🗝️">
          <div className="grid sm:grid-cols-3 gap-2">{cands.map(it => <ItemCard key={it.uid} it={it} compact selected={heir === it.uid} onClick={() => setHeir(heir === it.uid ? null : it.uid)} />)}</div>
        </Panel>
        <div className="text-center flex flex-wrap gap-2 justify-center">
          <Btn kind="ghost" onClick={() => act(d => { d.scene = 'game'; d.ending = null; })}>{T('Non ancora: torna alla valle')}</Btn>
          <Btn kind="fate" disabled={!card} onClick={() => replace(startNewCycle(s, card!, heir))}>{T('Inizia il Ciclo')}{' '}{s.cycle.n + 1}</Btn>
        </div>
      </div>
    </div>
  );
}
