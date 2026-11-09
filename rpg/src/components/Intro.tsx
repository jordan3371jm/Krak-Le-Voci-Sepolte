import { t as T } from '../i18n';
import { useEffect, useState } from 'react';
import type { ClassId, GameState } from '../game/types';
import { CLASSES, COMPANIONS } from '../game/data/core';
import { TALKERS } from '../game/data/dialogues';
import { Face } from './Talk';
import { FATE_CARDS } from '../game/data/world';
import type { Act } from '../game/useGame';
import { beginGame } from '../game/engine/village';
import { initAudio, sfx } from '../game/audio';
import { tryAutoplay } from '../game/music';
import { Btn } from './ui';
import { Icon } from './icons';
import { LangPicker } from './LangPicker';
import { BG } from './art';
import { Particles } from './Atmosphere';

const NAMES = ['Nera', 'Aldo', 'Mirra', 'Teo', 'Sabra', 'Ilde', 'Corvo', 'Lena', 'Bruno', 'Vesna', 'Oren', 'Ada'];
const VISION = [
  T('La notte in cui si aprì il portale, Hondovalle bruciava.'),
  T('Sotto la valle, qualcosa di sepolto cominciò a parlare.'),
  T('Lo chiamano Krak. Non ha bocca. Ha solo le tue scelte.'),
  T('Il mondo non salva i tuoi progressi.'),
  T('Li ricorda.'),
];

export default function Intro({ state, act }: { state: GameState; act: Act }) {
  const [step, setStep] = useState(0);
  const [awake, setAwake] = useState(false);
  useEffect(() => { tryAutoplay(); }, []);
  const [line, setLine] = useState(0);
  const [name, setName] = useState(() => NAMES[Math.floor(Math.random() * NAMES.length)]);
  const [cls, setCls] = useState<ClassId>('custode');
  const newCycle = state.cycle.n > 1;
  const legacy = state.legacies[0];
  const card = FATE_CARDS.find(c => c.id === state.cycle.card);
  // la visione scorre da sola: niente clic inutili
  useEffect(() => {
    if (!awake || step !== 0 || line >= VISION.length - 1) return;
    const t = window.setTimeout(() => setLine(l => l + 1), 2300);
    return () => window.clearTimeout(t);
  }, [step, line, awake]);

  if (step === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative overflow-hidden">
        <div className="absolute top-4 right-4 z-10"><LangPicker /></div>
        <Particles mode="portal" tint="255,120,50" />
        {BG.copertina && <div aria-hidden className="absolute inset-0 bg-cover bg-center opacity-60 pointer-events-none kenburns" style={{ backgroundImage: `radial-gradient(ellipse at center, rgba(5,4,6,.35), rgba(5,4,6,.92)), url(${BG.copertina})` }} />}
        <div className="absolute inset-0 bg-gradient-to-t from-red-950/60 via-transparent to-transparent animate-breathe pointer-events-none" />
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-orange-900/30 to-transparent animate-flicker pointer-events-none" />
        <p className="text-xs tracking-[0.4em] text-ember/80 mb-4 uppercase">{newCycle ? T('Ciclo {n}', { n: state.cycle.n }) : T('Un RPG che ricorda')}</p>
        <h1 className="text-4xl sm:text-6xl font-black text-gradient-ember title-beat mb-2 leading-tight">{T('KRAK')}</h1>
        <h2 className="text-lg sm:text-2xl text-bone/90 mb-10 tracking-widest">{T('Le Voci Sepolte')}</h2>
        {!awake ? (
          <button onClick={() => { initAudio(); sfx.door(); if (newCycle) setAwake(true); else setStep(1); }} className="relative z-10 mt-2 px-8 py-4 rounded-full border-2 border-ember/80 bg-black/60 text-ember text-lg sm:text-xl font-display tracking-[0.2em] uppercase animate-breathe hover:bg-ember/15 shadow-[0_0_40px_rgba(251,146,60,.35)]">▶ {T('Ascolta la valle')}</button>
        ) : (
        <div className="min-h-[140px] max-w-2xl relative z-10 space-y-2">
          {VISION.slice(0, line + 1).map((l, i) => (
            <p key={i} style={{ textShadow: '0 2px 10px #000, 0 0 2px #000' }} className={`animate-rise ${i === VISION.length - 1 ? 'text-ember text-2xl sm:text-3xl font-bold mt-3' : 'text-bone text-lg sm:text-xl font-semibold italic'}`}>{l}</p>
          ))}
        </div>
        )}
        {newCycle && legacy && (
          <p className="mt-6 text-sm text-fate max-w-md">{T('L\'eco di {name} ({ending}) vaga ancora nella valle. Le tue Memorie: +{prod}% produzione, +{stats}% statistiche.', { name: legacy.name, ending: legacy.ending, prod: state.cycle.memorieTotal * 5, stats: Math.round(state.cycle.memorieTotal * 1.5) })}{card && <> {T('Carta del Destino:')} <b>{card.icon} {card.name}</b>.</>}</p>
        )}
        {newCycle && (() => {
          const faces = TALKERS.filter(tk => tk.appear?.cycle === state.cycle.n && !tk.id.endsWith('_t'));
          const comps = COMPANIONS.filter(c => c.minCycle === state.cycle.n);
          if (!faces.length && !comps.length) return <p className="mt-4 text-xs text-mist italic relative z-10">{T('La valle si è riavvolta. Ma chi ricorda, ricorda più di prima.')}</p>;
          return (
            <div className="mt-6 relative z-10 animate-rise">
              <p className="text-[10px] uppercase tracking-[0.4em] text-amber-300/80 mb-2">{T('Nuovi volti in questo Ciclo')}</p>
              <div className="flex flex-wrap justify-center gap-4">
                {faces.map(tk => <div key={tk.id} className="flex flex-col items-center w-24"><Face id={tk.id} emoji={tk.icon} tone={tk.tone} size={64} /><span className="text-xs text-bone mt-1">{tk.name}</span><span className="text-[10px] text-mist leading-tight">{tk.title}</span></div>)}
                {comps.map(c => <div key={c.id} className="flex flex-col items-center w-24"><Face id={c.id} emoji={c.icon} tone="teal" size={64} /><span className="text-xs text-bone mt-1">{c.name}</span><span className="text-[10px] text-mist leading-tight">{T('Compagno reclutabile')}</span></div>)}
              </div>
            </div>
          );
        })()}
        {awake && <div className="mt-10 relative z-10">
          <Btn kind="ember" onClick={() => { initAudio(); sfx.door(); setStep(1); }}>{line < VISION.length - 1 ? T('Salta ›') : T('Entra nella valle')}</Btn>
        </div>}
        <p className="absolute bottom-4 text-[11px] text-mist/60">{T('Suggerimento: cuffie e schermo intero rendono il rito più profondo.')}</p>
      </div>
    );
  }

  const CC: Record<string, string> = { penitente: '214,160,90', lama: '220,38,38', veggente: '167,139,250', custode: '251,146,60' };
  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-10 sm:py-10 relative overflow-hidden">
      {BG.copertina && <div aria-hidden className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none kenburns" style={{ backgroundImage: `radial-gradient(ellipse at center, rgba(5,4,6,.45), rgba(5,4,6,.96)), url(${BG.copertina})` }} />}
      <div aria-hidden className="absolute inset-0 pointer-events-none transition-[background] duration-700" style={{ background: `radial-gradient(ellipse at 50% 60%, rgba(${CC[cls]}, .16), transparent 60%)` }} />
      <Particles mode="portal" tint={CC[cls]} intensity={0.6} />
      <div className="absolute top-4 right-4 z-10"><LangPicker /></div>
      <div className="w-full max-w-5xl animate-rise relative z-10">
        <p className="text-center text-[10px] uppercase tracking-[0.5em] text-amber-300/80 mb-1">{T('Prologo')}</p>
        <h2 className="text-3xl sm:text-4xl text-center text-gradient-ember title-beat mb-1">{T('Chi porta il Fardello?')}</h2>
        <p className="text-center text-sm text-mist mb-4 italic">{T('Il tuo nome diventerà un incantesimo. Alcuni lo pronunceranno con amore, altri lo malediranno.')}</p>
        <div className="text-center mb-5"><Btn kind="ember" disabled={!name.trim()} onClick={() => { initAudio(); sfx.door(); act(d => beginGame(d, name, cls)); }}>{T('Scendi a Hondovalle Bassa')}</Btn></div>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={20}
          placeholder={T('Il tuo nome')}
          className="w-full max-w-sm mx-auto block bg-black/60 border border-ember/40 rounded-xl px-4 py-3 text-center text-xl font-display tracking-wider text-bone focus:outline-none focus:border-ember focus:shadow-[0_0_30px_rgba(251,146,60,.25)] mb-8"
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {Object.values(CLASSES).map(c => {
            const st: [string, number, number][] = [[T('Salute'), c.base.maxHp, 120], [T('Attacco'), c.base.atk, 16], [T('Difesa'), c.base.def, 9]];
            return (
              <button key={c.id} onClick={() => { sfx.click(); setCls(c.id); }} className={`class-card p-3 sm:p-4 text-center flex flex-col items-center ${cls === c.id ? 'sel' : ''}`} style={{ ['--cc' as any]: CC[c.id] }}>
                <span aria-hidden className="halo" />
                {c.id === 'custode' && <span className="absolute top-2 left-1/2 -translate-x-1/2 z-[1] text-[9px] uppercase tracking-[0.25em] rounded-full border border-amber-400/70 bg-black/80 text-amber-200 px-2 py-0.5">{T('Consigliata')}</span>}
                <div className="relative"><Icon name={c.id} size={120} /></div>
                <span className="font-display text-bone mt-3 leading-tight text-[15px]">{c.name}</span>
                <p className="text-[11px] text-mist mt-1 min-h-[2.5em]">{c.desc}</p>
                <div className="w-full mt-3 pt-2 border-t border-[rgba(var(--cc),.25)] space-y-1.5">
                  {st.map(([l, v, m]) => {
                    const n = Math.max(1, Math.min(5, Math.round((v / m) * 5)));
                    return (
                      <div key={l} className="flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-[0.18em] text-bone/70 font-display">{l}</span>
                        <span className="flex gap-1">{[0, 1, 2, 3, 4].map(k => <span key={k} className={`stat-gem ${k < n ? 'on' : ''}`} />)}</span>
                      </div>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
        {!name.trim() && <p className="text-center text-[11px] text-mist">{T('Scrivi il tuo nome per cominciare.')}</p>}
      </div>
    </div>
  );
}
