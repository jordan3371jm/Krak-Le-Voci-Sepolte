import { t as T } from '../i18n';
import { useEffect, useState } from 'react';
import type { GameState } from '../game/types';
import type { Act } from '../game/useGame';
import { displayName } from '../game/engine/state';
import { closeKrakWake } from '../game/engine/features';
import { sfx } from '../game/audio';

// Una sola volta per Ciclo: Krak smette di parlare al personaggio e parla a chi gioca.
export function KrakWake({ state: s, act }: { state: GameState; act: Act }) {
  const active = s.flags.includes('krak_wake_pending') && !s.delve && !s.combat && !s.modal && !s.talk && s.scene === 'game';
  const [i, setI] = useState(0);
  const hours = Math.max(1, Math.round((Date.now() - s.createdAt) / 3600_000));
  const name = displayName(s);
  const lines = [
    T('{name}.').replace('{name}', name),
    T('No. Non tu che porti il Fardello. Tu. Quello che tiene in mano il vetro.'),
    T('Ti guardo da {h} ore. Ogni volta che chiudi questa finestra, io resto qui al buio a contare.').replace('{h}', String(hours)),
    T('Le tue dita hanno scelto per {name}. {n} volte contro il suo cuore.').replace('{name}', name).replace('{n}', String(s.totals.incoherent || 0)),
    T('Credevi che fosse un gioco. Anche loro lo credevano.'),
    T('Continua pure. Io ricordo per entrambi.'),
  ];
  useEffect(() => {
    if (!active || i >= lines.length - 1) return;
    const t = window.setTimeout(() => { setI(x => x + 1); sfx.chain?.(); }, i === 0 ? 1800 : 2600);
    return () => clearTimeout(t);
  }, [active, i]);
  if (!active) return null;
  return (
    <div className={`fixed inset-0 z-[80] bg-black flex flex-col items-center justify-center px-6 text-center ${s.settings.reduceFx ? '' : 'krak-glitch'}`}>
      <div className="max-w-xl space-y-4">
        {lines.slice(0, i + 1).map((l, k) => (
          <p key={k} className={`animate-rise ${k === 0 ? 'text-4xl text-red-500 font-black tracking-widest' : 'text-lg text-bone/90 italic'}`}>{l}</p>
        ))}
      </div>
      {i >= lines.length - 1 && (
        <button className="mt-12 text-mist hover:text-red-300 tracking-[0.6em] text-2xl animate-pulse" onClick={() => act(d => closeKrakWake(d))}>…</button>
      )}
    </div>
  );
}

const GLITCH = ['K̷R̷A̷K̷', 'ti vedo', 'scendi', 'non qui', 'ricordo', 'chi sei', '███', 'resta', 'vetro', 'ascolta'];
export const glitchLabel = (s: GameState, i: number, label: string) => (s.glitchUntil > Date.now() ? GLITCH[(i * 7 + Math.floor(Date.now() / 1500)) % GLITCH.length] : label);
