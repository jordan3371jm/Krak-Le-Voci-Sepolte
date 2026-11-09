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
import { Icon } from './icons';
import { artOr, artFor } from './art';

// stelle di sfondo fisse (pseudo-casuali ma stabili)
const BG_STARS = Array.from({ length: 90 }, (_, i) => ({ x: (i * 37.3) % 100, y: (i * 61.7 + i * i * 0.13) % 100, r: 0.15 + ((i * 13) % 7) / 25, o: 0.2 + ((i * 7) % 10) / 20 }));

// Le costellazioni stanno dentro un riquadro sicuro: niente esce dal bordo.
function cpos(cons: string) { const c = CONSTELLATIONS[cons]; return { x: 8 + c.x * 0.84, y: 6 + c.y * 0.7 }; }
function starPos(cons: string, i: number) {
  const c = cpos(cons);
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
          <Panel title={T('Bussola del Fato')} icon="bussola" right={<span className="text-xs text-violet-300">🔮 {Math.floor(s.res.intuizione)}{' '}{T('Intuizione')}</span>}>
            <p className="text-xs text-mist mb-2">{T('La valle non è un menu di livelli: è una costellazione viva. Le tue scelte accendono stelle; con l\'Intuizione puoi leggerne altre e rivelare segreti, PNG, minacce e memorie del mondo.')}</p>
            <div className="relative w-full aspect-[4/3] sm:aspect-[16/11] rounded-2xl border border-amber-900/60 overflow-hidden shadow-[inset_0_0_60px_rgba(0,0,0,.9)]" style={{ background: 'radial-gradient(ellipse at 50% 55%, #2a1446 0%, #120a22 45%, #05040a 80%)' }}>
              {/* nebulosa e stelle di fondo */}
              <div aria-hidden className="absolute inset-0 opacity-60" style={{ background: 'radial-gradient(circle at 20% 30%, rgba(168,85,247,.25), transparent 35%), radial-gradient(circle at 80% 70%, rgba(220,38,38,.18), transparent 40%), radial-gradient(circle at 60% 20%, rgba(56,189,248,.12), transparent 30%)' }} />
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                {BG_STARS.map((b, i) => <circle key={i} cx={b.x} cy={b.y} r={b.r} fill="#fff" opacity={b.o} />)}
              </svg>
              {/* rosa dei venti d'ottone che ruota lenta */}
              <svg aria-hidden viewBox="0 0 200 200" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[92%] opacity-40 compass-spin">
                <circle cx="100" cy="100" r="92" fill="none" stroke="#b08a3e" strokeWidth="1.2" />
                <circle cx="100" cy="100" r="80" fill="none" stroke="#7a5a22" strokeWidth="0.6" strokeDasharray="2 3" />
                {Array.from({ length: 72 }, (_, i) => { const a = (i / 72) * Math.PI * 2; const l = i % 6 === 0 ? 8 : 3; return <line key={i} x1={100 + Math.cos(a) * 92} y1={100 + Math.sin(a) * 92} x2={100 + Math.cos(a) * (92 - l)} y2={100 + Math.sin(a) * (92 - l)} stroke="#b08a3e" strokeWidth={i % 6 === 0 ? 1 : 0.5} />; })}
                <polygon points="100,18 106,100 100,182 94,100" fill="rgba(176,138,62,.25)" stroke="#b08a3e" strokeWidth="0.6" />
                <polygon points="18,100 100,94 182,100 100,106" fill="rgba(176,138,62,.18)" stroke="#b08a3e" strokeWidth="0.6" />
              </svg>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                {Object.keys(CONSTELLATIONS).map(cons => {
                  const pts = STARS.filter(x => x.cons === cons).map((_, i) => starPos(cons, i));
                  const on = lit.includes(cons);
                  return <polyline key={cons} points={[...pts, pts[0]].map(p => `${p.x},${p.y}`).join(' ')} fill={on ? 'rgba(168,85,247,.08)' : 'none'} stroke={on ? '#d8b4fe' : '#4c3a6b'} strokeWidth={on ? 0.45 : 0.25} strokeDasharray={on ? undefined : '1 1'} style={on ? { filter: 'drop-shadow(0 0 1.5px #a855f7)' } : undefined} />;
                })}
              </svg>
              {Object.entries(CONSTELLATIONS).map(([cons, c]) => (
                <div key={cons} className="absolute -translate-x-1/2 flex flex-col items-center text-center z-[2]" style={{ left: `${cpos(cons).x}%`, top: `${cpos(cons).y + 10}%` }}>
                  <span className={lit.includes(cons) ? 'drop-shadow-[0_0_8px_rgba(216,180,254,.8)]' : 'opacity-60 grayscale'}><Icon name={artOr('cost_' + cons, c.icon)} size={38} /></span>
                  <div className={`text-[10px] whitespace-nowrap font-display ${lit.includes(cons) ? 'text-fate' : 'text-mist/80'}`}>{c.name}</div>
                  <button onClick={() => { sfx.resonance(); act(d => readStar(d, cons)); }} className="mt-0.5 text-[9px] rounded-full border border-violet-500/60 bg-violet-950/60 px-2 text-violet-200 hover:bg-violet-800/60">🔮 {T('leggi')}</button>
                </div>
              ))}
              {STARS.map(st => {
                const i = STARS.filter(x => x.cons === st.cons).indexOf(st);
                const p = starPos(st.cons, i);
                const on = s.stars.includes(st.id);
                return (
                  <button key={st.id} title={st.name} onMouseEnter={() => setHover(st.id)} onClick={() => setHover(st.id)} className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition ${on ? 'w-3.5 h-3.5 bg-yellow-100 shadow-[0_0_14px_#fde68a,0_0_4px_#fff] animate-twinkle' : 'w-2 h-2 bg-indigo-950 border border-indigo-400/50 hover:border-yellow-200'} ${hover === st.id ? 'ring-2 ring-amber-300' : ''}`} style={{ left: `${p.x}%`, top: `${p.y}%` }} />
                );
              })}
            </div>
            <div className="min-h-[48px] mt-2 text-xs">
              {hs ? (
                <div><b className={s.stars.includes(hs.id) ? 'text-yellow-100' : 'text-mist'}>{hs.name}</b> · {CONSTELLATIONS[hs.cons].name} — {s.stars.includes(hs.id) ? <span className="text-bone/80">{hs.text}</span> : <span className="text-mist italic">{hs.flag ? T('Si accende solo con una scelta.') : T('Si può leggere con l\'Intuizione.')}</span>}</div>
              ) : <span className="text-mist">{T('Stelle accese: {lit}/{total}. Costellazioni complete: {list}.', { lit: s.stars.length, total: STARS.length, list: lit.map(c => CONSTELLATIONS[c].name).join(', ') || T('nessuna') })}</span>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-2">{Object.entries(CONSTELLATIONS).map(([k, c]) => (
              <div key={k} className={`flex items-center gap-2 rounded-lg border px-2 py-1 text-[11px] ${lit.includes(k) ? 'border-fate/70 bg-fate/10 text-purple-100' : 'border-stone-800 text-mist'}`}><Icon name={artOr('cost_' + k, c.icon)} size={22} /><span className="leading-tight">{c.bonus}</span></div>))}</div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title={T('Promesse')} icon="promessa">
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
          <Panel title={T('Temperatura narrativa')} icon="valle">
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
                  <Icon name={artFor('frammento_' + f.defId) ? 'frammento_' + f.defId : def.icon} size={34} />
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
