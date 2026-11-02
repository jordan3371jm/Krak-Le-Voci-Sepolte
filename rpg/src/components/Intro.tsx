import { useEffect, useState } from 'react';
import type { ClassId, GameState } from '../game/types';
import { CLASSES } from '../game/data/core';
import { FATE_CARDS } from '../game/data/world';
import type { Act } from '../game/useGame';
import { beginGame } from '../game/engine/village';
import { initAudio, sfx } from '../game/audio';
import { Btn } from './ui';
import { Icon } from './icons';

const VISION = [
  'La notte in cui si aprì il portale, Hondovalle bruciava.',
  'Sotto la valle, qualcosa di sepolto cominciò a parlare.',
  'Lo chiamano Krak. Non ha bocca. Ha solo le tue scelte.',
  'Il mondo non salva i tuoi progressi.',
  'Li ricorda.',
];

export default function Intro({ state, act }: { state: GameState; act: Act }) {
  const [step, setStep] = useState(0);
  const [line, setLine] = useState(0);
  const [name, setName] = useState('');
  const [cls, setCls] = useState<ClassId>('custode');
  const newCycle = state.cycle.n > 1;
  const legacy = state.legacies[0];
  const card = FATE_CARDS.find(c => c.id === state.cycle.card);
  // la visione scorre da sola: niente clic inutili
  useEffect(() => {
    if (step !== 0 || line >= VISION.length - 1) return;
    const t = window.setTimeout(() => setLine(l => l + 1), 2300);
    return () => window.clearTimeout(t);
  }, [step, line]);

  if (step === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-red-950/60 via-transparent to-transparent animate-breathe pointer-events-none" />
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-orange-900/30 to-transparent animate-flicker pointer-events-none" />
        <p className="text-xs tracking-[0.4em] text-ember/80 mb-4 uppercase">{newCycle ? `Ciclo ${state.cycle.n}` : 'Un RPG che ricorda'}</p>
        <h1 className="text-4xl sm:text-6xl font-black text-gradient-ember mb-2 leading-tight">KRAK</h1>
        <h2 className="text-lg sm:text-2xl text-bone/90 mb-10 tracking-widest">Le Voci Sepolte</h2>
        <div className="min-h-[96px] max-w-xl">
          {VISION.slice(0, line + 1).map((l, i) => (
            <p key={i} className={`animate-rise ${i === VISION.length - 1 ? 'text-ember text-xl mt-2' : 'text-bone/80 italic'}`}>{l}</p>
          ))}
        </div>
        {newCycle && legacy && (
          <p className="mt-6 text-sm text-fate max-w-md">L'eco di <b>{legacy.name}</b> ({legacy.ending}) vaga ancora nella valle. Le tue Memorie: +{state.cycle.memorieTotal * 5}% produzione, +{Math.round(state.cycle.memorieTotal * 1.5)}% statistiche.{card && <> Carta del Destino: <b>{card.icon} {card.name}</b>.</>}</p>
        )}
        <div className="mt-10">
          <Btn kind="ember" onClick={() => { initAudio(); sfx.door(); setStep(1); }}>{line < VISION.length - 1 ? 'Salta ›' : 'Entra nella valle'}</Btn>
        </div>
        <p className="absolute bottom-4 text-[11px] text-mist/60">Suggerimento: cuffie e schermo intero rendono il rito più profondo.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl animate-rise">
        <h2 className="text-2xl text-center text-bone mb-1">Chi porta il Fardello?</h2>
        <p className="text-center text-sm text-mist mb-6 italic">Il tuo nome diventerà un incantesimo. Alcuni lo pronunceranno con amore, altri lo malediranno.</p>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={20}
          placeholder="Il tuo nome"
          className="w-full max-w-sm mx-auto block bg-black/50 border border-ember/40 rounded-lg px-4 py-3 text-center text-lg text-bone focus:outline-none focus:border-ember mb-8"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {Object.values(CLASSES).map(c => (
            <button key={c.id} onClick={() => { sfx.click(); setCls(c.id); }} className={`panel rounded-xl p-4 text-left transition ${cls === c.id ? 'ring-2 ring-ember' : 'opacity-80 hover:opacity-100'}`}>
              <div className="flex items-center gap-3 mb-1"><Icon name={c.id} size={52} /><span className="font-display text-bone">{c.name}</span></div>
              <p className="text-xs text-mist">{c.desc}</p>
              <p className="text-[11px] text-bone/60 mt-2">Salute {c.base.maxHp} · Attacco {c.base.atk} · Difesa {c.base.def} · Critico {c.base.crit}%</p>
            </button>
          ))}
        </div>
        <div className="text-center">
          <Btn kind="ember" disabled={!name.trim()} onClick={() => { initAudio(); sfx.door(); act(d => beginGame(d, name, cls)); }}>Scendi a Hondovalle Bassa</Btn>
        </div>
      </div>
    </div>
  );
}
