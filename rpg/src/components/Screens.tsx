import { totalBuildings, completeRequest } from '../game/engine/village';
import { canAfford } from '../game/engine/state';
import { Cost } from './ui';
import { t as T } from '../i18n';
import { Pic } from './Pic';
import { useEffect, useState } from 'react';
import type { FactionId, GameState } from '../game/types';
import type { Act } from '../game/useGame';
import { COMPANIONS, FACTIONS, FACTION_IDS } from '../game/data/core';
import { ENEMIES } from '../game/data/enemies';
import { ACHIEVEMENTS, ENDINGS, EXPEDITIONS, FATE_CARDS, FRAGMENTS, SANCTUARY, RES_INFO } from '../game/data/world';
import { DAILY_POOL } from '../game/data/world';
import { cardMod, fmt, fmtTime, repState } from '../game/engine/state';
import { companionStats } from '../game/engine/hero';
import {
  buyListing, canEndCycle, claimDream, endCycle, memorieGain, priceMult, refreshMarket, sellFragment, startNewCycle,
} from '../game/engine/meta';
import {
  buySanctuary, claimDailyChest, claimMission, collectExpedition, expeditionDuration, expeditionSlots, missionProgress, recruit, sanctuaryCost, sendExpedition, toggleParty,
} from '../game/engine/village';
import { deleteSave, exportCode, importCode } from '../game/save';
import { LangPicker } from './LangPicker';
import { Bar, Btn, Empty, ItemCard, Panel, Tag, rich } from './ui';

// ============================================================
// MERCATO DELLE ANIME
// ============================================================
export function Market({ state: s, act }: { state: GameState; act: Act }) {
  useEffect(() => { if (Date.now() >= s.market.refreshAt) act(d => refreshMarket(d)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const pm = priceMult(s);
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Panel title={T('Mercato delle Anime')} icon="🎭" right={<span className="text-[11px] text-mist">{T('Nuove merci tra')}{' '}{fmtTime(s.market.refreshAt - Date.now())} · prezzi ×{pm.toFixed(2)}</span>}>
          <p className="text-xs text-mist mb-3">{T('Qui non si vendono solo oggetti: si commercia destino. Ogni merce porta la storia di chi l\'ha posseduta. I prezzi dipendono dalla tua reputazione con le Ombre del Mercato.')}</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {s.market.listings.map(l => (
              <div key={l.uid} className="rounded-lg border border-stone-700 p-2 bg-black/30">
                {l.item && <ItemCard it={l.item} />}
                {l.item && <p className="text-[10px] text-fate/70 italic mt-1">«{l.item.origin}»</p>}
                {l.fragment && <div className="text-xs"><Pic id={`frammento_${l.fragment}`} emoji={FRAGMENTS[l.fragment].icon} size={28} /> <b>{FRAGMENTS[l.fragment].name}</b><div className="text-mist">{FRAGMENTS[l.fragment].desc}</div></div>}
                {l.res && <div className="text-xs">📦 {l.res.amount} {RES_INFO[l.res.key].name}</div>}
                <div className="flex items-center justify-between mt-2 text-[11px]"><span className="text-mist">{T('da')}{' '}{l.seller}</span><Btn small kind="good" disabled={s.res.cenere < Math.round(l.price * pm)} onClick={() => act(d => buyListing(d, l.uid))}>⚱️{Math.round(l.price * pm)}</Btn></div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title={T('Vendi Frammenti')} icon="💠">
          {s.fragments.length === 0 ? <Empty>{T('Nessun frammento da vendere.')}</Empty> : (
            <div className="flex flex-wrap gap-2">{s.fragments.map(f => <Btn key={f.uid} small onClick={() => act(d => sellFragment(d, f.uid))}><Pic id={`frammento_${f.defId}`} emoji={FRAGMENTS[f.defId].icon} size={20} /> {FRAGMENTS[f.defId].name} · ⚱️{Math.round(FRAGMENTS[f.defId].value * 6 / pm)}</Btn>)}</div>
          )}
          <p className="text-[10px] text-mist mt-2">{T('Vendere frammenti oscuri incupisce la valle. Per vendere equipaggiamento, usa l\'Inventario dell\'Eroe.')}</p>
        </Panel>
      </div>
      <Panel title={T('Storico delle Anime')} icon="📜">
        {s.market.history.length === 0 ? <Empty>{T('Nessuno scambio ancora.')}</Empty> : (
          <div className="space-y-1 max-h-[500px] overflow-y-auto text-[11px] text-bone/70">{s.market.history.slice(0, 40).map((h, i) => <div key={i} className="border-b border-stone-800 pb-1">{h}</div>)}</div>
        )}
      </Panel>
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
    <div className="grid lg:grid-cols-[1fr_1.4fr] gap-4 items-start">
          <Panel title={T('Richieste delle Fazioni')} icon="fazioni">
            {s.requests.length === 0 && <p className="text-xs text-mist italic">{totalBuildings(s) < 4 ? T('Le fazioni ti noteranno quando il villaggio avrà 4 edifici.') : T('Nessuna richiesta, per ora. Ne arriveranno altre.')}</p>}
            <div className="space-y-2">
              {s.requests.map(r => (
                <div key={r.uid} className="rounded-lg border border-stone-700 p-2 text-xs">
                  <div className="flex justify-between"><span className="text-bone flex items-center gap-1"><Pic id={`fazione_${r.faction}`} emoji={FACTIONS[r.faction].icon} size={20} /> {FACTIONS[r.faction].name}</span><span className="text-mist">{fmtTime(r.until - now)}</span></div>
                  <p className="text-bone/70 italic my-1">{r.text}</p>
                  <div className="flex items-center justify-between gap-2">
                    <span>{T('Chiede:')}{' '}<Cost cost={r.need} have={s.res} /></span>
                    <Btn small kind="good" disabled={!canAfford(s, r.need)} onClick={() => act(d => completeRequest(d, r.uid))}>{T('Consegna')}</Btn>
                  </div>
                  <div className="text-[10px] text-mist mt-1">{T('Ricompensa: ⚱️{c} · reputazione +{rep} (−{down} {rival})', { c: r.reward.cenere || 0, rep: r.reward.rep, down: Math.round(r.reward.rep * 0.4), rival: FACTIONS[FACTIONS[r.faction].opposite].name })}{r.reward.reliquie ? ' · 🏺1' : ''}</div>
                </div>
              ))}
            </div>
          </Panel>
    <Panel title={T('Reputazione nella Valle')} icon="⚖️">
      <p className="text-xs text-mist mb-3">{T('Niente karma unico. Guadagnare reputazione con una fazione spesso danneggia la sua rivale. Lo stato (Ignorato, Tollerato, Fidato, Temuto, Adorato, Bandito, Marchiato) cambia dialoghi, prezzi, eventi e finali.')}</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {FACTION_IDS.map(f => {
          const F = FACTIONS[f];
          const v = s.factions[f];
          const st = repState(s, f);
          return (
            <div key={f} className="rounded-lg border border-stone-700 p-2">
              <div className="flex justify-between text-sm"><span className="flex items-center gap-1.5"><Pic id={`fazione_${F.id}`} emoji={F.icon} size={28} /> {F.name}</span><span className={REP_COLORS[st]}>{T(st)} ({Math.round(v)})</span></div>
              <div className="relative h-2 bg-black/60 rounded mt-1 border border-stone-800">
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-stone-600" />
                <div className={`absolute top-0 bottom-0 ${v >= 0 ? 'bg-resonance' : 'bg-dissonance'}`} style={{ left: v >= 0 ? '50%' : `${50 + v / 2}%`, width: `${Math.abs(v) / 2}%` }} />
              </div>
              <p className="text-[11px] text-mist mt-1">{F.desc} {T('Rivale: {name}.', { name: FACTIONS[F.opposite].name })}</p>
              <p className="text-[10px] text-bone/60">{REP_EFFECTS[f]}</p>
            </div>
          );
        })}
      </div>
    </Panel>
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
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Panel title={T('Compagni')} icon="👥" right={<span className="text-xs text-mist">{T('In gruppo:')}{' '}{s.companions.filter(c => c.inParty).length}/2</span>}>
        <div className="space-y-2">
          {COMPANIONS.map(def => {
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
                      </div>
                    )}
                    <div className="text-[10px] text-mist mt-0.5">{T('Salute {hp} · Attacco {atk} · Difesa {def}', { hp: cs.maxHp, atk: cs.atk, def: cs.def })} · {def.row === 'front' ? T('prima fila') : T('retrovia')}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {c.left && <Tag className="text-dissonance">{T('Ti ha abbandonato')}</Tag>}
                  {!c.recruited && !c.left && <Btn small kind="good" onClick={() => act(d => recruit(d, c.id))}>{T('Recluta · ⚱️')}{def.recruitCost?.cenere}{def.recruitCost?.reliquie ? ` 🏺${def.recruitCost.reliquie}` : ''}</Btn>}
                  {c.recruited && !c.left && !c.mission && <Btn small kind={c.inParty ? 'ember' : 'default'} disabled={!!s.delve} onClick={() => act(d => toggleParty(d, c.id))}>{c.inParty ? T('✔ Nel gruppo') : T('Porta con te')}</Btn>}
                  {c.recruited && !c.left && !c.mission && !s.delve && <Btn small onClick={() => act(d => sendExpedition(d, c.id, loc))}>{T('🧭 Manda in spedizione')}</Btn>}
                  {c.mission && (c.mission.end <= now
                    ? <Btn small kind="good" onClick={() => act(d => collectExpedition(d, c.id))}>{T('Raccogli il bottino (')}{EXPEDITIONS.find(e => e.id === c.mission!.locId)?.name})</Btn>
                    : <Tag>{T('In {place} · torna tra {time}', { place: EXPEDITIONS.find(e => e.id === c.mission!.locId)?.name || '', time: fmtTime(c.mission.end - now) })}</Tag>)}
                </div>
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
export function Journal({ state: s, act }: { state: GameState; act: Act }) {
  const [tab, setTab] = useState<'oggi' | 'cronaca' | 'imprese' | 'bestiario'>('oggi');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(['oggi', 'cronaca', 'imprese', 'bestiario'] as const).map(t => <Btn key={t} kind={tab === t ? 'ember' : 'ghost'} onClick={() => setTab(t)}>{{ oggi: T('📅 Oggi'), cronaca: T('📜 Cronaca'), imprese: T('🏆 Imprese'), bestiario: T('👹 Bestiario') }[t]}</Btn>)}
      </div>
      {tab === 'oggi' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Panel title={T('Giornaliere')} icon="📅">
            <Btn kind="good" disabled={s.daily.chest} onClick={() => act(d => claimDailyChest(d))}>{s.daily.chest ? T('🎁 Forziere già aperto oggi') : T('🎁 Apri il forziere giornaliero')}</Btn>
            <div className="space-y-2 mt-3">
              {s.daily.missions.map(m => {
                const def = DAILY_POOL.find(d => d.id === m.id)!;
                const p = Math.min(m.target, missionProgress(s, m.id));
                return (
                  <div key={m.id} className="rounded border border-stone-700 p-2 text-xs">
                    <div className="flex justify-between gap-2"><span>{def.text(m.target)}</span>{m.claimed ? <Tag className="text-resonance">{T('Riscossa')}</Tag> : <Btn small kind="good" disabled={p < m.target} onClick={() => act(d => claimMission(d, m.id))}>{T('Riscuoti')}</Btn>}</div>
                    <Bar className="mt-1" value={p} max={m.target} color="bg-amber-500" height="h-1" />
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-mist mt-2">{T('Completa tutte e tre per una reliquia. Si rinnovano ogni giorno.')}</p>
          </Panel>
          <Panel title={T('Diario Onirico')} icon="🌙">
            <p className="text-xs text-mist mb-2">{T('Il tuo salvataggio sogna mentre sei via. Torni e trovi tracce di ciò che è accaduto.')}</p>
            {s.dreams.length === 0 ? <Empty>{T('Nessun sogno. Torna dopo almeno un\'ora di assenza.')}</Empty> : s.dreams.map(d => (
              <div key={d.id} className="rounded border border-indigo-800 bg-indigo-950/30 p-2 mb-2 text-xs">
                <div className="text-bone">{d.title}</div>
                <p className="text-bone/70 italic my-1">{d.text}</p>
                <Btn small kind="fate" onClick={() => act(x => claimDream(x, d.id))}>{T('Svegliati')}</Btn>
              </div>
            ))}
          </Panel>
        </div>
      )}
      {tab === 'cronaca' && (
        <Panel title={T('La Valle Ricorda')} icon="📜">
          {s.chronicle.length === 0 ? <Empty>{T('Ancora nulla da ricordare.')}</Empty> : (
            <div className="space-y-1 max-h-[600px] overflow-y-auto text-xs">
              {s.chronicle.map((c, i) => <div key={i} className="border-b border-stone-800 pb-1"><span className="text-mist">{new Date(c.t).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span> · <span className={c.kind === 'fate' ? 'text-fate' : c.kind === 'promise' ? 'text-amber-300' : c.kind === 'combat' ? 'text-red-300' : 'text-bone/80'}>{c.text}</span></div>)}
            </div>
          )}
        </Panel>
      )}
      {tab === 'imprese' && (
        <Panel title={T('Imprese {achievements}/{ACHIEVEMENTS}', { achievements: s.achievements.length, ACHIEVEMENTS: ACHIEVEMENTS.length })} icon="🏆" right={<span className="text-xs text-amber-300">+{s.achievements.length * 2}{T('% produzione')}</span>}>
          <div className="grid sm:grid-cols-2 gap-2">
            {ACHIEVEMENTS.map(a => <div key={a.id} className={`rounded border p-2 text-xs ${s.achievements.includes(a.id) ? 'border-amber-500 text-amber-100' : 'border-stone-800 text-mist opacity-60'}`}><b>{s.achievements.includes(a.id) ? '🏆' : '🔒'} {a.name}</b><div>{a.desc}</div></div>)}
          </div>
        </Panel>
      )}
      {tab === 'bestiario' && (
        <Panel title={T('Bestiario')} icon="👹">
          <div className="grid sm:grid-cols-2 gap-2">
            {Object.values(ENEMIES).filter(e => !e.tags.includes('world') || s.bestiary[e.id]).map(e => {
              const n = s.bestiary[e.id] || 0;
              return <div key={e.id} className={`rounded border p-2 text-xs ${n ? 'border-stone-700' : 'border-stone-900 opacity-40'}`}><div className="text-bone">{n ? e.icon : '❔'} {n ? e.name : '???'} {n ? <span className="text-mist">×{n}</span> : null}</div>{n > 0 && <div className="text-mist italic">{e.lore}</div>}{n > 0 && e.tags.length > 0 && <div className="text-[10px] text-fate">{e.tags.join(' · ')}</div>}</div>;
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
        <Panel title={`Ciclo ${s.cycle.n}`} icon="♾️">
          <p className="text-xs text-mist mb-2">{rich(T('Quando il tuo portatore raggiunge il Cuore di Krak (o la valle diventa leggenda), puoi chiudere il Ciclo. Il personaggio diventa un\'Eredità: un\'eco che i futuri portatori incontreranno. Ottieni **Memorie** permanenti (+5% produzione e +1,5% statistiche ciascuna). Conservi reliquie, Santuario, imprese, memorie dello stagno e bestiario.'))}</p>
          <div className="text-xs space-y-1">
            <div>{T('Memorie accumulate:')}{' '}<b className="text-fate">{s.cycle.memorieTotal}</b> {T('(+{n}% produzione)', { n: s.cycle.memorieTotal * 5 })}</div>
            <div>{T('Cenere di questo Ciclo:')}{' '}{fmt(s.totals.cycleCenere || 0)}</div>
            <div>{T('Memorie se chiudi ora:')}{' '}<b className="text-amber-300">{memorieGain(s)}</b></div>
            {card && <div>{T('Carta del Destino:')}{' '}{card.icon} {card.name} — <span className="text-teal-200">{card.good}</span> / <span className="text-red-300">{card.bad}</span></div>}
          </div>
          <Btn kind="fate" className="mt-3" disabled={!can} onClick={() => act(d => endCycle(d))}>{can ? T('Chiudi il Ciclo e scopri il tuo finale') : T('Sconfiggi il Cuore di Krak (o accumula 150K cenere al livello 12)')}</Btn>
        </Panel>
        <Panel title={T('Echi dei Portatori Passati')} icon="👤">
          {s.legacies.length === 0 ? <Empty>{T('Nessuna eredità ancora. Il tuo sarà il primo nome che la valle ricorderà.')}</Empty> : s.legacies.map((l, i) => (
            <div key={i} className="text-xs border-b border-stone-800 py-1"><b className="text-bone">{l.name}</b>{' '}{T('· Ciclo')}{' '}{l.cycle} · Lv {l.level} · <span className="text-fate">{l.ending}</span>{' '}{T('· nei dungeon appare come')}{' '}{({ ally: 'alleato', enemy: 'nemico', merchant: 'mercante', corpse: T('cadavere con bottino') })[l.kind]}</div>
          ))}
        </Panel>
      </div>
      <Panel title={T('Santuario delle Reliquie')} icon="🏺" right={<span className="text-sm text-yellow-200">🏺 {s.reliquie}</span>}>
        <p className="text-xs text-mist mb-3">{T('Offri reliquie per potenziamenti permanenti che sopravvivono a ogni Ciclo.')}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {SANCTUARY.map(x => {
            const lvl = s.cycle.sanctuary[x.id] || 0;
            return (
              <button key={x.id} disabled={lvl >= x.max || s.reliquie < sanctuaryCost(s, x.id)} onClick={() => act(d => buySanctuary(d, x.id, x.max))} className="text-left rounded-lg border border-stone-700 p-2 text-xs disabled:opacity-50 hover:border-ember">
                <div className="flex justify-between"><span className="text-bone">{x.icon} {x.name}</span><span className="text-mist">{lvl}/{x.max}</span></div>
                <div className="text-mist">{x.desc}: +{lvl * x.per}{x.id === 'memoria' ? 'h' : '%'} {lvl < x.max && <span className="text-amber-300">{T('→ costo 🏺')}{sanctuaryCost(s, x.id)}</span>}</div>
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
        <LangPicker onBeforeChange={saveNow} />
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
          <div className="text-6xl mb-2">{E.icon}</div>
          <p className="text-xs tracking-[0.3em] text-ember uppercase">{T('Finale del Ciclo')}{' '}{s.cycle.n}</p>
          <h1 className="text-3xl text-gradient-ember my-2">{E.name}</h1>
          <p className="text-bone/85 italic max-w-xl mx-auto">{E.text}</p>
          <p className="text-sm text-fate mt-4">{T('+{gain} Memorie. {name} diventa un\'Eredità: i prossimi portatori incontreranno la sua eco.', { gain, name: s.playerName })}</p>
        </div>
        <Panel title={T('Scegli la Carta del Destino per il prossimo Ciclo')} icon="🃏">
          <div className="grid sm:grid-cols-3 gap-2">
            {s.cycle.cardOffer.map(id => { const c = FATE_CARDS.find(x => x.id === id)!; return (
              <button key={id} onClick={() => setCard(id)} className={`rounded-lg border p-3 text-left ${card === id ? 'border-fate bg-fate/10' : 'border-stone-700'}`}>
                <div className="text-2xl">{c.icon}</div><div className="text-sm text-bone">{c.name}</div>
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
