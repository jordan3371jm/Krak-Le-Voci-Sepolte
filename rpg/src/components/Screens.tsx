import { useEffect, useState } from 'react';
import type { FactionId, GameState } from '../game/types';
import type { Act } from '../game/useGame';
import { COMPANIONS, FACTIONS, FACTION_IDS } from '../game/data/core';
import { ENEMIES } from '../game/data/enemies';
import { ACHIEVEMENTS, ENDINGS, EXPEDITIONS, FATE_CARDS, FRAGMENTS, SANCTUARY } from '../game/data/world';
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
import { Bar, Btn, Empty, ItemCard, Panel, Tag } from './ui';

// ============================================================
// MERCATO DELLE ANIME
// ============================================================
export function Market({ state: s, act }: { state: GameState; act: Act }) {
  useEffect(() => { if (Date.now() >= s.market.refreshAt) act(d => refreshMarket(d)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const pm = priceMult(s);
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Panel title="Mercato delle Anime" icon="🎭" right={<span className="text-[11px] text-mist">Nuove merci tra {fmtTime(s.market.refreshAt - Date.now())} · prezzi ×{pm.toFixed(2)}</span>}>
          <p className="text-xs text-mist mb-3">Qui non si vendono solo oggetti: si commercia destino. Ogni merce porta la storia di chi l'ha posseduta. I prezzi dipendono dalla tua reputazione con le Ombre del Mercato.</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {s.market.listings.map(l => (
              <div key={l.uid} className="rounded-lg border border-stone-700 p-2 bg-black/30">
                {l.item && <ItemCard it={l.item} />}
                {l.item && <p className="text-[10px] text-fate/70 italic mt-1">«{l.item.origin}»</p>}
                {l.fragment && <div className="text-xs"><span className="text-lg">{FRAGMENTS[l.fragment].icon}</span> <b>{FRAGMENTS[l.fragment].name}</b><div className="text-mist">{FRAGMENTS[l.fragment].desc}</div></div>}
                {l.res && <div className="text-xs">📦 {l.res.amount} {l.res.key}</div>}
                <div className="flex items-center justify-between mt-2 text-[11px]"><span className="text-mist">da {l.seller}</span><Btn small kind="good" disabled={s.res.cenere < Math.round(l.price * pm)} onClick={() => act(d => buyListing(d, l.uid))}>⚱️{Math.round(l.price * pm)}</Btn></div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Vendi Frammenti" icon="💠">
          {s.fragments.length === 0 ? <Empty>Nessun frammento da vendere.</Empty> : (
            <div className="flex flex-wrap gap-2">{s.fragments.map(f => <Btn key={f.uid} small onClick={() => act(d => sellFragment(d, f.uid))}>{FRAGMENTS[f.defId].icon} {FRAGMENTS[f.defId].name} · ⚱️{Math.round(FRAGMENTS[f.defId].value * 6 / pm)}</Btn>)}</div>
          )}
          <p className="text-[10px] text-mist mt-2">Vendere frammenti oscuri incupisce la valle. Per vendere equipaggiamento, usa l'Inventario dell'Eroe.</p>
        </Panel>
      </div>
      <Panel title="Storico delle Anime" icon="📜">
        {s.market.history.length === 0 ? <Empty>Nessuno scambio ancora.</Empty> : (
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
  culto: 'Fidato: il Culto ti offre la Fonte. Bandito: fanatici nelle incursioni.',
  capitale: 'Fidato: taglie più ricche. Bandito: tasse e predoni.',
  gilde: 'Produzione globale; Fidato: forgia migliore; Adorato: edifici −10%.',
  contadini: 'Produzione di provviste e legno; ti proteggono dalle incursioni.',
  guaritori: 'Cure di Elara, rituali per sciogliere pegni e aberrazioni.',
  eretici: 'Verità nascoste; la Parola d\'Ordine li rende tuoi alleati.',
  ombre: 'Prezzi del Mercato delle Anime e Contratti di Fato.',
  guardiani: 'Sigilli di Krak: la valle respira meglio.',
};
export function Factions({ state: s }: { state: GameState }) {
  return (
    <Panel title="Reputazione nella Valle" icon="⚖️">
      <p className="text-xs text-mist mb-3">Niente karma unico. Guadagnare reputazione con una fazione spesso danneggia la sua rivale. Lo stato (Ignorato, Tollerato, Fidato, Temuto, Adorato, Bandito, Marchiato) cambia dialoghi, prezzi, eventi e finali.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {FACTION_IDS.map(f => {
          const F = FACTIONS[f];
          const v = s.factions[f];
          const st = repState(s, f);
          return (
            <div key={f} className="rounded-lg border border-stone-700 p-2">
              <div className="flex justify-between text-sm"><span>{F.icon} {F.name}</span><span className={REP_COLORS[st]}>{st} ({Math.round(v)})</span></div>
              <div className="relative h-2 bg-black/60 rounded mt-1 border border-stone-800">
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-stone-600" />
                <div className={`absolute top-0 bottom-0 ${v >= 0 ? 'bg-resonance' : 'bg-dissonance'}`} style={{ left: v >= 0 ? '50%' : `${50 + v / 2}%`, width: `${Math.abs(v) / 2}%` }} />
              </div>
              <p className="text-[11px] text-mist mt-1">{F.desc} Rivale: {FACTIONS[F.opposite].name}.</p>
              <p className="text-[10px] text-bone/60">{REP_EFFECTS[f]}</p>
            </div>
          );
        })}
      </div>
    </Panel>
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
      <Panel title="Compagni" icon="👥" right={<span className="text-xs text-mist">In gruppo: {s.companions.filter(c => c.inParty).length}/2</span>}>
        <div className="space-y-2">
          {COMPANIONS.map(def => {
            const c = s.companions.find(x => x.id === def.id)!;
            const cs = companionStats(s, c.id);
            return (
              <div key={c.id} className={`rounded-lg border p-2 ${c.left ? 'border-stone-800 opacity-40' : 'border-stone-700'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-3xl">{c.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-bone">{c.name} <span className="text-[10px] text-mist">· {c.role} · Lv {c.level}</span></div>
                    <div className="text-[11px] text-mist italic">{def.bio}</div>
                    {c.recruited && !c.left && (
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <Bar value={c.trust} max={100} color={c.trust < 25 ? 'bg-dissonance' : 'bg-amber-400'} height="h-1" label={<><span>Fiducia</span><span>{Math.round(c.trust)}</span></>} />
                        <Bar value={c.hp} max={1} color="bg-red-700" height="h-1" label={<><span>Salute</span><span>{Math.round(c.hp * 100)}%</span></>} />
                      </div>
                    )}
                    <div className="text-[10px] text-mist mt-0.5">Salute {cs.maxHp} · Attacco {cs.atk} · Difesa {cs.def} · {def.row === 'front' ? 'prima fila' : 'retrovia'}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {c.left && <Tag className="text-dissonance">Ti ha abbandonato</Tag>}
                  {!c.recruited && !c.left && <Btn small kind="good" onClick={() => act(d => recruit(d, c.id))}>Recluta · ⚱️{def.recruitCost?.cenere}{def.recruitCost?.reliquie ? ` 🏺${def.recruitCost.reliquie}` : ''}</Btn>}
                  {c.recruited && !c.left && !c.mission && <Btn small kind={c.inParty ? 'ember' : 'default'} disabled={!!s.delve} onClick={() => act(d => toggleParty(d, c.id))}>{c.inParty ? '✔ Nel gruppo' : 'Porta con te'}</Btn>}
                  {c.recruited && !c.left && !c.mission && !s.delve && <Btn small onClick={() => act(d => sendExpedition(d, c.id, loc))}>🧭 Manda in spedizione</Btn>}
                  {c.mission && (c.mission.end <= now
                    ? <Btn small kind="good" onClick={() => act(d => collectExpedition(d, c.id))}>Raccogli il bottino ({EXPEDITIONS.find(e => e.id === c.mission!.locId)?.name})</Btn>
                    : <Tag>In {EXPEDITIONS.find(e => e.id === c.mission!.locId)?.name} · torna tra {fmtTime(c.mission.end - now)}</Tag>)}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-mist mt-2">Usare un compagno come scudo ne abbassa la fiducia. Sotto 25 esita in battaglia; a 0 se ne va per sempre.</p>
      </Panel>
      <Panel title={`Spedizioni (${busy}/${expeditionSlots(s)} slot)`} icon="🧭">
        <p className="text-xs text-mist mb-2">Le spedizioni durano ore reali e continuano anche a gioco chiuso. Scegli la destinazione, poi manda un compagno.</p>
        <div className="space-y-1.5">
          {EXPEDITIONS.map(e => (
            <button key={e.id} onClick={() => setLoc(e.id)} className={`w-full text-left rounded-lg border p-2 text-xs ${loc === e.id ? 'border-ember bg-ember/10' : 'border-stone-700'}`}>
              <div className="flex justify-between"><span className="text-bone">{e.icon} {e.name}</span><span className="text-mist">{fmtTime(expeditionDuration(s, e.minutes))} · Lv {e.minLevel}+</span></div>
              <div className="text-mist">{e.desc}</div>
              <div className="text-[10px] text-bone/60">{Object.entries(e.rewards).filter(([k]) => !k.endsWith('Chance')).map(([k, v]) => `${v} ${k}`).join(' · ')}{e.rewards.itemChance ? ` · oggetto ${Math.round(e.rewards.itemChance * 100)}%` : ''}{e.rewards.fragmentChance ? ` · frammento ${Math.round(e.rewards.fragmentChance * 100)}%` : ''}</div>
            </button>
          ))}
        </div>
        {cardMod(s, 'exped') > 0 && <p className="text-[11px] text-fate mt-2">Carta del Destino: spedizioni più rapide.</p>}
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
        {(['oggi', 'cronaca', 'imprese', 'bestiario'] as const).map(t => <Btn key={t} kind={tab === t ? 'ember' : 'ghost'} onClick={() => setTab(t)}>{{ oggi: '📅 Oggi', cronaca: '📜 Cronaca', imprese: '🏆 Imprese', bestiario: '👹 Bestiario' }[t]}</Btn>)}
      </div>
      {tab === 'oggi' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Panel title="Giornaliere" icon="📅">
            <Btn kind="good" disabled={s.daily.chest} onClick={() => act(d => claimDailyChest(d))}>{s.daily.chest ? '🎁 Forziere già aperto oggi' : '🎁 Apri il forziere giornaliero'}</Btn>
            <div className="space-y-2 mt-3">
              {s.daily.missions.map(m => {
                const def = DAILY_POOL.find(d => d.id === m.id)!;
                const p = Math.min(m.target, missionProgress(s, m.id));
                return (
                  <div key={m.id} className="rounded border border-stone-700 p-2 text-xs">
                    <div className="flex justify-between gap-2"><span>{def.text(m.target)}</span>{m.claimed ? <Tag className="text-resonance">Riscossa</Tag> : <Btn small kind="good" disabled={p < m.target} onClick={() => act(d => claimMission(d, m.id))}>Riscuoti</Btn>}</div>
                    <Bar className="mt-1" value={p} max={m.target} color="bg-amber-500" height="h-1" />
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-mist mt-2">Completa tutte e tre per una reliquia. Si rinnovano ogni giorno.</p>
          </Panel>
          <Panel title="Diario Onirico" icon="🌙">
            <p className="text-xs text-mist mb-2">Il tuo salvataggio sogna mentre sei via. Torni e trovi tracce di ciò che è accaduto.</p>
            {s.dreams.length === 0 ? <Empty>Nessun sogno. Torna dopo almeno un'ora di assenza.</Empty> : s.dreams.map(d => (
              <div key={d.id} className="rounded border border-indigo-800 bg-indigo-950/30 p-2 mb-2 text-xs">
                <div className="text-bone">{d.title}</div>
                <p className="text-bone/70 italic my-1">{d.text}</p>
                <Btn small kind="fate" onClick={() => act(x => claimDream(x, d.id))}>Svegliati</Btn>
              </div>
            ))}
          </Panel>
        </div>
      )}
      {tab === 'cronaca' && (
        <Panel title="La Valle Ricorda" icon="📜">
          {s.chronicle.length === 0 ? <Empty>Ancora nulla da ricordare.</Empty> : (
            <div className="space-y-1 max-h-[600px] overflow-y-auto text-xs">
              {s.chronicle.map((c, i) => <div key={i} className="border-b border-stone-800 pb-1"><span className="text-mist">{new Date(c.t).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span> · <span className={c.kind === 'fate' ? 'text-fate' : c.kind === 'promise' ? 'text-amber-300' : c.kind === 'combat' ? 'text-red-300' : 'text-bone/80'}>{c.text}</span></div>)}
            </div>
          )}
        </Panel>
      )}
      {tab === 'imprese' && (
        <Panel title={`Imprese ${s.achievements.length}/${ACHIEVEMENTS.length}`} icon="🏆" right={<span className="text-xs text-amber-300">+{s.achievements.length * 2}% produzione</span>}>
          <div className="grid sm:grid-cols-2 gap-2">
            {ACHIEVEMENTS.map(a => <div key={a.id} className={`rounded border p-2 text-xs ${s.achievements.includes(a.id) ? 'border-amber-500 text-amber-100' : 'border-stone-800 text-mist opacity-60'}`}><b>{s.achievements.includes(a.id) ? '🏆' : '🔒'} {a.name}</b><div>{a.desc}</div></div>)}
          </div>
        </Panel>
      )}
      {tab === 'bestiario' && (
        <Panel title="Bestiario" icon="👹">
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
          <p className="text-xs text-mist mb-2">Quando il tuo portatore raggiunge il Cuore di Krak (o la valle diventa leggenda), puoi chiudere il Ciclo. Il personaggio diventa un'Eredità: un'eco che i futuri portatori incontreranno. Ottieni <b>Memorie</b> permanenti (+5% produzione e +1,5% statistiche ciascuna). Conservi reliquie, Santuario, imprese, memorie dello stagno e bestiario.</p>
          <div className="text-xs space-y-1">
            <div>Memorie accumulate: <b className="text-fate">{s.cycle.memorieTotal}</b> (+{s.cycle.memorieTotal * 5}% produzione)</div>
            <div>Cenere di questo Ciclo: {fmt(s.totals.cycleCenere || 0)}</div>
            <div>Memorie se chiudi ora: <b className="text-amber-300">{memorieGain(s)}</b></div>
            {card && <div>Carta del Destino: {card.icon} {card.name} — <span className="text-teal-200">{card.good}</span> / <span className="text-red-300">{card.bad}</span></div>}
          </div>
          <Btn kind="fate" className="mt-3" disabled={!can} onClick={() => act(d => endCycle(d))}>{can ? 'Chiudi il Ciclo e scopri il tuo finale' : 'Sconfiggi il Cuore di Krak (o accumula 150K cenere al livello 12)'}</Btn>
        </Panel>
        <Panel title="Echi dei Portatori Passati" icon="👤">
          {s.legacies.length === 0 ? <Empty>Nessuna eredità ancora. Il tuo sarà il primo nome che la valle ricorderà.</Empty> : s.legacies.map((l, i) => (
            <div key={i} className="text-xs border-b border-stone-800 py-1"><b className="text-bone">{l.name}</b> · Ciclo {l.cycle} · Lv {l.level} · <span className="text-fate">{l.ending}</span> · nei dungeon appare come {({ ally: 'alleato', enemy: 'nemico', merchant: 'mercante', corpse: 'cadavere con bottino' })[l.kind]}</div>
          ))}
        </Panel>
      </div>
      <Panel title="Santuario delle Reliquie" icon="🏺" right={<span className="text-sm text-yellow-200">🏺 {s.reliquie}</span>}>
        <p className="text-xs text-mist mb-3">Offri reliquie per potenziamenti permanenti che sopravvivono a ogni Ciclo.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {SANCTUARY.map(x => {
            const lvl = s.cycle.sanctuary[x.id] || 0;
            return (
              <button key={x.id} disabled={lvl >= x.max || s.reliquie < sanctuaryCost(s, x.id)} onClick={() => act(d => buySanctuary(d, x.id, x.max))} className="text-left rounded-lg border border-stone-700 p-2 text-xs disabled:opacity-50 hover:border-ember">
                <div className="flex justify-between"><span className="text-bone">{x.icon} {x.name}</span><span className="text-mist">{lvl}/{x.max}</span></div>
                <div className="text-mist">{x.desc}: +{lvl * x.per}{x.id === 'memoria' ? 'h' : '%'} {lvl < x.max && <span className="text-amber-300">→ costo 🏺{sanctuaryCost(s, x.id)}</span>}</div>
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
      <Panel title="Salvataggio" icon="💾">
        <p className="text-xs text-mist mb-2">Il gioco si salva da solo ogni 10 secondi e alla chiusura della scheda, con 3 backup rotanti e controllo di integrità. Per spostarlo su un altro dispositivo, copia il codice e incollalo lì.</p>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => setMsg(saveNow() ? 'Partita salvata.' : 'Salvataggio non riuscito (memoria piena?)')}>💾 Salva ora</Btn>
          <Btn onClick={() => { const c = exportCode(s); setCode(c); navigator.clipboard?.writeText(c).then(() => setMsg('Codice copiato negli appunti.'), () => setMsg('Codice pronto: selezionalo e copialo.')); }}>📋 Copia codice</Btn>
          <Btn onClick={() => { const g = importCode(code); if (g) { replace(g); setMsg('Partita caricata. Bentornato a Hondovalle.'); } else setMsg('Questo codice non funziona: controlla che sia completo.'); }}>📥 Carica codice</Btn>
        </div>
        <textarea value={code} onChange={e => setCode(e.target.value)} placeholder="Incolla qui un codice e premi «Carica codice»" className="w-full h-24 mt-2 bg-black/60 border border-stone-700 rounded p-2 text-[10px] font-mono" />
        {msg && <p className="text-xs text-resonance mt-1">{msg}</p>}
        <div className="mt-3 border-t border-stone-800 pt-2">
          <Btn kind="bad" small onClick={() => { if (!arm) { setArm(true); return; } deleteSave(); location.reload(); }}>{arm ? 'Tocca di nuovo per cancellare TUTTO' : '🗑️ Cancella il salvataggio'}</Btn>
        </div>
      </Panel>
      <Panel title="Rito e Suono" icon="🎧">
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={s.settings.music} onChange={() => act(d => { d.settings.music = !d.settings.music; })} /> Musica e ambiente</label>
          <div className="text-xs text-mist">Volume musica {Math.round((s.settings.musicVolume ?? 0.55) * 100)}%
            <input type="range" min={0} max={1} step={0.05} value={s.settings.musicVolume ?? 0.55} onChange={e => { const v = +e.target.value; act(d => { d.settings.musicVolume = v; }); }} className="w-full" />
          </div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={s.settings.sfx} onChange={() => act(d => { d.settings.sfx = !d.settings.sfx; })} /> Effetti sonori</label>
          <p className="text-[11px] text-mist">L'audio è meccanico: con il suono attivo senti (e vedi) gli intenti dei nemici invisibili. Il silenzio totale arriva quando la Dissonanza è al massimo.</p>
          <Btn onClick={onFullscreen}>{s.fullscreen ? 'Esci dal Rito' : '⛶ Entra nel Rito (schermo intero)'}</Btn>
          <p className="text-[11px] text-mist">Nel Rito: +25% Risonanza, sussurri, scelte nascoste negli eventi.</p>
          <label className="flex items-center gap-2"><input type="checkbox" checked={s.settings.reduceFx} onChange={() => act(d => { d.settings.reduceFx = !d.settings.reduceFx; })} /> Riduci animazioni ed effetti di corruzione</label>
        </div>
      </Panel>
      <Panel title="Auto-battaglia" icon="🤖">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.settings.autoBattle} onChange={() => act(d => { d.settings.autoBattle = !d.settings.autoBattle; })} /> Combatti automaticamente (rotazione coerente col Fardello)</label>
        <label className="flex items-center gap-2 text-sm mt-2"><input type="checkbox" checked={s.settings.fastCombat} onChange={() => act(d => { d.settings.fastCombat = !d.settings.fastCombat; })} /> Combattimento veloce</label>
        <div className="text-sm mt-2">Bevi una pozione sotto il {s.settings.autoPotion}% di salute
          <input type="range" min={0} max={80} step={5} value={s.settings.autoPotion} onChange={e => { const v = +e.target.value; act(d => { d.settings.autoPotion = v; }); }} className="w-full" />
        </div>
        <p className="text-[11px] text-mist">L'auto-battaglia non usa mai azioni di Dissonanza: quelle restano una scelta tua.</p>
      </Panel>
      <Panel title="Come si gioca" icon="❔">
        <ul className="text-xs text-bone/80 space-y-1 list-disc pl-4">
          <li><b>Villaggio</b>: raccogli, costruisci, la produzione continua anche offline.</li>
          <li><b>Discesa</b>: scegli le porte, combatti, poi decidi se scendere ancora o mettere al sicuro la bisaccia.</li>
          <li><b>Fardello</b>: le azioni coerenti caricano la Risonanza (→ Eco), quelle incoerenti la Dissonanza (→ azioni oscure).</li>
          <li><b>Promesse</b>: mantenerle dona frammenti; infrangerle evoca il Cacciatore di Promesse.</li>
          <li><b>Ciclo</b>: chiudilo per un finale, un'Eredità e Memorie permanenti.</li>
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
          <p className="text-xs tracking-[0.3em] text-ember uppercase">Finale del Ciclo {s.cycle.n}</p>
          <h1 className="text-3xl text-gradient-ember my-2">{E.name}</h1>
          <p className="text-bone/85 italic max-w-xl mx-auto">{E.text}</p>
          <p className="text-sm text-fate mt-4">+{gain} Memorie. {s.playerName} diventa un'Eredità: i prossimi portatori incontreranno la sua eco.</p>
        </div>
        <Panel title="Scegli la Carta del Destino per il prossimo Ciclo" icon="🃏">
          <div className="grid sm:grid-cols-3 gap-2">
            {s.cycle.cardOffer.map(id => { const c = FATE_CARDS.find(x => x.id === id)!; return (
              <button key={id} onClick={() => setCard(id)} className={`rounded-lg border p-3 text-left ${card === id ? 'border-fate bg-fate/10' : 'border-stone-700'}`}>
                <div className="text-2xl">{c.icon}</div><div className="text-sm text-bone">{c.name}</div>
                <div className="text-[11px] text-teal-200">{c.good}</div><div className="text-[11px] text-red-300">{c.bad}</div>
              </button>
            ); })}
          </div>
        </Panel>
        <Panel title="Un oggetto da tramandare (facoltativo)" icon="🗝️">
          <div className="grid sm:grid-cols-3 gap-2">{cands.map(it => <ItemCard key={it.uid} it={it} compact selected={heir === it.uid} onClick={() => setHeir(heir === it.uid ? null : it.uid)} />)}</div>
        </Panel>
        <div className="text-center flex flex-wrap gap-2 justify-center">
          <Btn kind="ghost" onClick={() => act(d => { d.scene = 'game'; d.ending = null; })}>Non ancora: torna alla valle</Btn>
          <Btn kind="fate" disabled={!card} onClick={() => replace(startNewCycle(s, card!, heir))}>Inizia il Ciclo {s.cycle.n + 1}</Btn>
        </div>
      </div>
    </div>
  );
}
