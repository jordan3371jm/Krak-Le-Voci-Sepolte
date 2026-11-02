import { useState } from 'react';
import type { GameState } from '../game/types';
import type { Act } from '../game/useGame';
import { CODEX_CORE, TUTORIAL, UNLOCKS, currentStep } from '../game/engine/onboarding';
import { Btn, Modal } from './ui';
import { Icon } from './icons';

// Barra della guida: un obiettivo alla volta, mai un suggerimento sulle scelte morali.
export function GuideBar({ state: s, act }: { state: GameState; act: Act }) {
  const [open, setOpen] = useState(true);
  const step = currentStep(s);
  if (!step || !s.fardello) return null;
  const idx = TUTORIAL.indexOf(step);
  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 pt-3">
      <div className="guide-bar rounded-xl px-3 py-2 flex items-start gap-3">
        <Icon name="guida" size={34} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-amber-300/80">
            Guida del Portatore · {idx + 1}/{TUTORIAL.length}
            <button className="ml-auto normal-case tracking-normal text-mist hover:text-bone" onClick={() => setOpen(!open)}>{open ? 'riduci' : 'mostra'}</button>
          </div>
          <div className="text-sm text-bone font-semibold">{step.title}</div>
          {open && <div className="text-xs text-bone/70">{step.hint}</div>}
        </div>
        {step.tab && s.tab !== step.tab && !s.combat && (
          <Btn small kind="ember" onClick={() => act(d => { d.tab = step.tab!; })}>Vai</Btn>
        )}
      </div>
      <div className="h-1 mt-1 rounded bg-black/50 overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-600 to-ember" style={{ width: `${(idx / TUTORIAL.length) * 100}%` }} /></div>
    </div>
  );
}

// Carta di sblocco: spiega il nuovo sistema la prima volta che appare
export function UnlockCard({ state: s, act }: { state: GameState; act: Act }) {
  const id = s.codexQueue[0];
  const u = UNLOCKS.find(x => x.id === id);
  if (!u) return null;
  if (u.kind === 'feature') {
    // le funzioni minori non interrompono il gioco: un cartiglio in basso a sinistra
    return (
      <div className="fixed bottom-3 left-3 z-40 w-[min(92vw,360px)] tip-card rounded-xl p-3 animate-rise shadow-2xl">
        <div className="flex gap-3">
          <Icon name={u.icon} size={48} />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] uppercase tracking-[0.25em] text-amber-300">Nuova possibilità</p>
            <div className="text-sm text-bone font-semibold">{u.name}</div>
            <p className="text-xs text-bone/80 mt-1">{u.codex}</p>
            <div className="text-right mt-2"><Btn small kind="ember" onClick={() => act(d => { d.codexQueue.shift(); })}>Ho capito</Btn></div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <Modal>
      <div className="flex flex-col items-center text-center">
        <div className="unlock-glow mb-3"><Icon name={u.icon} size={84} /></div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-amber-300">{u.kind === 'tab' ? 'Nuova sezione' : 'Nuova possibilità'}</p>
        <h2 className="text-2xl text-bone mb-3">{u.name}</h2>
        <p className="text-sm text-bone/80 leading-relaxed">{u.codex}</p>
        <div className="flex gap-2 mt-5">
          {u.kind === 'tab' && <Btn kind="ember" onClick={() => act(d => { d.codexQueue.shift(); d.tab = u.id as GameState['tab']; d.newTabs = d.newTabs.filter(x => x !== u.id); })}>Apri ora</Btn>}
          <Btn kind={u.kind === 'tab' ? 'ghost' : 'ember'} onClick={() => act(d => { d.codexQueue.shift(); })}>Ho capito</Btn>
        </div>
      </div>
    </Modal>
  );
}

// Codex: tutti i sistemi sbloccati, rileggibili quando vuoi
export function Codex({ state: s, onClose }: { state: GameState; onClose: () => void }) {
  const core = CODEX_CORE.filter(c => c.cond(s));
  const unl = UNLOCKS.filter(u => s.unlocked.includes(u.id));
  const [sel, setSel] = useState<string>(core[0]?.id || unl[0]?.id || '');
  const all = [...core.map(c => ({ id: c.id, name: c.name, icon: c.icon, text: c.text })), ...unl.map(u => ({ id: u.id, name: u.name, icon: u.icon, text: u.codex }))];
  const cur = all.find(x => x.id === sel) || all[0];
  return (
    <Modal wide onClose={onClose}>
      <h2 className="text-xl text-bone mb-3 flex items-center gap-2"><Icon name="diario" size={28} /> Codex del Portatore</h2>
      <div className="grid sm:grid-cols-[200px_1fr] gap-4">
        <div className="space-y-1 max-h-[55vh] overflow-y-auto pr-1">
          {all.map(e => (
            <button key={e.id} onClick={() => setSel(e.id)} className={`w-full text-left flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${cur?.id === e.id ? 'bg-ember/15 text-bone' : 'text-mist hover:text-bone'}`}>
              <Icon name={e.icon} size={22} /> {e.name}
            </button>
          ))}
        </div>
        {cur && (
          <div className="rounded-xl border border-stone-700 p-4 bg-black/30">
            <div className="flex items-center gap-3 mb-3"><Icon name={cur.icon} size={56} /><h3 className="text-lg text-bone">{cur.name}</h3></div>
            <p className="text-sm text-bone/85 leading-relaxed">{cur.text}</p>
          </div>
        )}
      </div>
      <p className="text-[11px] text-mist mt-3">Nuove voci compaiono man mano che scopri la valle.</p>
      <div className="text-right mt-3"><Btn kind="ember" onClick={onClose}>Chiudi</Btn></div>
    </Modal>
  );
}

// Consiglio contestuale mostrato una sola volta
export function Tip({ id, state: s, act, title, children }: { id: string; state: GameState; act: Act; title: string; children: React.ReactNode }) {
  if (s.tipsSeen.includes(id)) return null;
  return (
    <div className="tip-card rounded-xl p-3 mb-3 animate-rise">
      <div className="flex items-start gap-3">
        <Icon name="guida" size={30} />
        <div className="flex-1 text-xs text-bone/85 space-y-1">
          <div className="text-sm text-amber-200 font-semibold">{title}</div>
          {children}
        </div>
        <Btn small kind="ghost" onClick={() => act(d => { d.tipsSeen.push(id); })}>Capito ✕</Btn>
      </div>
    </div>
  );
}
