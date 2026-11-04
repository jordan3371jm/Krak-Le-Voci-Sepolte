import { t as T } from '../i18n';
import { useState } from 'react';
import type { GameState, ValleyState } from '../game/types';
import type { Act } from '../game/useGame';
import { FARDELLI } from '../game/data/core';
import { CONSTELLATIONS, FRAGMENTS, STARS, VALLEY_EFFECTS } from '../game/data/world';
import { fmt, litConstellations, valleyState } from '../game/engine/state';
import { fragmentUsable, placeContract, readStar, sharedWorld, useFragment } from '../game/engine/meta';
import { todayKey } from '../game/rng';
import { sfx } from '../game/audio';
import { Bar, Btn, Empty, Panel, Tag } from './ui';

function starPos(cons: string, i: number) {
  const c = CONSTELLATIONS[cons];
  const a = (i / 5) * Math.PI * 2 + cons.length;
  const r = 7 + (i % 2) * 3;
  return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r * 0.9 };
}

export default function Compass({ state: s, act }: { state: GameState; act: Act }) {
  const [hover, setHover] = useState<string | null>(null);
  const [contractFrag, setContractFrag] = useState('');
  const [prediction, setPrediction] = useState<ValleyState>('Corruzione');
  const lit = litConstellations(s);
  const w = sharedWorld(todayKey(), s);
  const vs = valleyState(s);
  const hs = hover ? STARS.find(x => x.id === hover) : null;
  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Panel title={T('Bussola del Fato')} icon="✨" right={<span className="text-xs text-violet-300">🔮 {Math.floor(s.res.intuizione)}{' '}{T('Intuizione')}</span>}>
            <p className="text-xs text-mist mb-2">{T('La valle non è un menu di livelli: è una costellazione viva. Le tue scelte accendono stelle; con l\'Intuizione puoi leggerne altre e rivelare segreti, PNG, minacce e memorie del mondo.')}</p>
            <div className="relative w-full aspect-[16/10] rounded-xl bg-[radial-gradient(ellipse_at_center,#1e1033_0%,#05050a_70%)] border border-indigo-900 overflow-hidden">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                {Object.keys(CONSTELLATIONS).map(cons => {
                  const pts = STARS.filter(x => x.cons === cons).map((_, i) => starPos(cons, i));
                  return <polyline key={cons} points={[...pts, pts[0]].map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={lit.includes(cons) ? '#a855f7' : '#3b2a55'} strokeWidth={0.3} strokeDasharray="1 1" />;
                })}
              </svg>
              {Object.entries(CONSTELLATIONS).map(([cons, c]) => (
                <div key={cons} className="absolute -translate-x-1/2 text-center" style={{ left: `${c.x}%`, top: `${c.y + 13}%` }}>
                  <div className={`text-[10px] whitespace-nowrap ${lit.includes(cons) ? 'text-fate' : 'text-mist/70'}`}>{c.icon} {c.name}</div>
                  <button onClick={() => { sfx.resonance(); act(d => readStar(d, cons)); }} className="text-[9px] text-violet-300 underline">{T('leggi')}</button>
                </div>
              ))}
              {STARS.map(st => {
                const i = STARS.filter(x => x.cons === st.cons).indexOf(st);
                const p = starPos(st.cons, i);
                const on = s.stars.includes(st.id);
                return (
                  <button key={st.id} onMouseEnter={() => setHover(st.id)} onClick={() => setHover(st.id)} className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${on ? 'w-3 h-3 bg-yellow-100 shadow-[0_0_10px_#fde68a] animate-twinkle' : 'w-2 h-2 bg-indigo-900 border border-indigo-500/40'}`} style={{ left: `${p.x}%`, top: `${p.y}%` }} />
                );
              })}
            </div>
            <div className="min-h-[48px] mt-2 text-xs">
              {hs ? (
                <div><b className={s.stars.includes(hs.id) ? 'text-yellow-100' : 'text-mist'}>{hs.name}</b> · {CONSTELLATIONS[hs.cons].name} — {s.stars.includes(hs.id) ? <span className="text-bone/80">{hs.text}</span> : <span className="text-mist italic">{hs.flag ? T('Si accende solo con una scelta.') : T('Si può leggere con l\'Intuizione.')}</span>}</div>
              ) : <span className="text-mist">{T('Stelle accese: {lit}/{total}. Costellazioni complete: {list}.', { lit: s.stars.length, total: STARS.length, list: lit.map(c => CONSTELLATIONS[c].name).join(', ') || T('nessuna') })}</span>}
            </div>
            <div className="flex flex-wrap gap-1 mt-1">{Object.entries(CONSTELLATIONS).map(([k, c]) => <Tag key={k} className={lit.includes(k) ? 'border-fate text-fate' : ''}>{c.icon} {c.bonus}</Tag>)}</div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title={T('Promesse')} icon="🔗">
            {s.promises.length === 0 && <Empty>{T('Nessuna promessa. Le promesse nascono dalle scelte importanti.')}</Empty>}
            <div className="space-y-1.5">
              {s.promises.map(p => (
                <div key={p.uid} className={`text-xs rounded border p-2 ${p.status === 'open' ? 'border-amber-700' : p.status === 'kept' ? 'border-resonance/60 text-teal-200' : 'border-dissonance/60 text-red-300 line-through'}`}>
                  «{p.text}»
                  <div className="text-[10px] text-mist no-underline">{p.status === 'open' ? T('Spedizioni rimaste: {deadlineDelves}', { deadlineDelves: Math.max(0, p.deadlineDelves) }) : p.status === 'kept' ? T('Mantenuta') : T('Infranta: un Cacciatore ti cerca')}</div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title={T('Temperatura narrativa')} icon="🌡️">
            <p className="text-xs mb-1">{T('La tua valle:')}{' '}<span className={VALLEY_EFFECTS[vs].color}>{VALLEY_EFFECTS[vs].icon} {T(vs)}</span></p>
            <p className="text-[11px] text-mist mb-2">{VALLEY_EFFECTS[vs].desc}</p>
            <Bar value={s.valley.prosperity} max={100} color="bg-pink-400" label={<><span>{T('Fioritura')}</span><span>{Math.round(s.valley.prosperity)}</span></>} />
            <Bar className="mt-1" value={s.valley.blight} max={100} color="bg-fuchsia-700" label={<><span>{T('Corruzione della valle')}</span><span>{Math.round(s.valley.blight)}</span></>} />
            <Bar className="mt-1" value={s.valley.tension} max={100} color="bg-yellow-500" label={<><span>{T('Tensione')}</span><span>{Math.round(s.valley.tension)}</span></>} />
            <div className="mt-3 border-t border-stone-800 pt-2 text-[11px] text-mist">
              <p className="text-bone/80 mb-1">{T('🌐 Mondo a Semi — oggi {n} portatori:', { n: w.bearers })}</p>
              {Object.entries(w.split).map(([f, v]) => <div key={f}>{FARDELLI[f as keyof typeof FARDELLI].icon} {FARDELLI[f as keyof typeof FARDELLI].name}: {Math.round(v * 100)}%</div>)}
              <p className="mt-1">{T('La valle condivisa oggi:')}{' '}<b className={VALLEY_EFFECTS[w.state].color}>{T(w.state)}</b></p>
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title={T('Frammenti di Fato')} icon="💠">
          {s.fragments.length === 0 && <Empty>{T('Nessun frammento. Si ottengono da scelte difficili, boss, promesse e dal Mercato.')}</Empty>}
          <div className="space-y-1.5">
            {s.fragments.map(f => {
              const def = FRAGMENTS[f.defId];
              const u = fragmentUsable(s, f.defId);
              return (
                <div key={f.uid} className="flex items-center gap-2 text-xs rounded border border-stone-700 p-2">
                  <span className="text-xl">{def.icon}</span>
                  <div className="flex-1"><div className="text-bone">{def.name}{def.dark ? T(' · oscuro') : ''}</div><div className="text-mist">{def.desc}</div>{!u.ok && <div className="text-dissonance text-[10px]">{u.why}</div>}</div>
                  <Btn small kind="fate" disabled={!u.ok} onClick={() => act(d => useFragment(d, f.uid))}>{T('Attiva')}</Btn>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-mist mt-2">{T('Anti-griefing: i frammenti oscuri hanno una ricarica di 1 ora; i loro effetti restano nella tua valle.')}</p>
        </Panel>
        <Panel title={T('Contratti di Fato')} icon="📜">
          <p className="text-xs text-mist mb-2">{T('Scommetti un frammento sullo stato della valle condivisa di domani. Se hai ragione guadagni influenza (+2 reliquie e un frammento in più); se sbagli il frammento si corrompe. Solo economia interna, niente soldi veri.')}</p>
          <div className="flex flex-wrap gap-2 items-center text-xs">
            <select value={contractFrag} onChange={e => setContractFrag(e.target.value)} className="bg-black/60 border border-stone-700 rounded px-2 py-1">
              <option value="">{T('— frammento —')}</option>
              {s.fragments.map(f => <option key={f.uid} value={f.uid}>{FRAGMENTS[f.defId].name}</option>)}
            </select>
            <select value={prediction} onChange={e => setPrediction(e.target.value as ValleyState)} className="bg-black/60 border border-stone-700 rounded px-2 py-1">
              {(['Fioritura', 'Quiete', 'Tensione', 'Corruzione', 'Cenere'] as ValleyState[]).map(v => <option key={v} value={v}>{T('Domani:')}{' '}{v}</option>)}
            </select>
            <Btn small kind="fate" disabled={!contractFrag} onClick={() => { act(d => placeContract(d, contractFrag, prediction)); setContractFrag(''); }}>{T('Firma')}</Btn>
          </div>
          <div className="mt-2 space-y-1">
            {s.contracts.map(c => <div key={c.uid} className="text-[11px] text-mist">📜 {FRAGMENTS[c.fragmentDef].name} su «{c.prediction}» ({c.day}) — {c.resolved ? (c.won ? T('✔ avverato') : T('✖ fallito')) : T('in attesa')}</div>)}
          </div>
          <p className="text-[10px] text-mist mt-2">{T('Oggi la valle condivisa è in «{state}». Danni totali al Colosso oggi: {dmg}.', { state: T(w.state), dmg: fmt(w.bossOthers + s.world.bossDamage) })}</p>
        </Panel>
      </div>
    </div>
  );
}
