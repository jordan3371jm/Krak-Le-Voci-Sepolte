import { t as T } from '../i18n';
import { useEffect, useRef, useState } from 'react';
import type { GameState, ResKey, TabId } from '../game/types';
import { RES_INFO, VALLEY_EFFECTS } from '../game/data/world';
import { corruptedUI, displayName, fmt, intuitionCap, valleyState } from '../game/engine/state';
import { heroStats, resonanceMax, xpForLevel } from '../game/engine/hero';
import { missionProgress, productionPerSec } from '../game/engine/village';
import { isUnlocked } from '../game/engine/onboarding';
import type { Act } from '../game/useGame';
import { Bar } from './ui';
import { Icon } from './icons';
import { LangPicker } from './LangPicker';

// numeri che mentono quando la corruzione è alta (UI diegetica)
function lie(n: number, on: boolean) {
  if (!on) return fmt(n);
  const f = 1 + (Math.sin(Date.now() / 900 + n) * 0.18);
  return fmt(n * f);
}

const iconBtn = 'w-9 h-9 flex items-center justify-center rounded-full border border-stone-700 hover:border-amber-500/70 transition';

export default function HUD({ state: s, act, onFullscreen, onCodex, onSave }: { state: GameState; act: Act; onFullscreen: () => void; onCodex: () => void; onSave?: () => void }) {
  const st = heroStats(s);
  const corrupt = corruptedUI(s);
  const prod = productionPerSec(s);
  const vs = valleyState(s);
  const VE = VALLEY_EFFECTS[vs];
  const rmax = resonanceMax(s);
  // le risorse compaiono solo quando entrano nella tua vita
  const keys = (['cenere', 'provviste', 'legno', 'pietra', 'ferro', 'intuizione'] as ResKey[]).filter(k => s.res[k] >= 1 || prod[k] > 0 || k === 'cenere' || (k === 'provviste' && isUnlocked(s, 'discesa')));
  const heroIcon = s.aberration ? 'corruzione' : s.fardello || 'portale';
  return (
    <header className="bg-black/85 backdrop-blur border-b border-amber-900/40">
      <div className="max-w-6xl mx-auto px-3 pt-2 flex items-center gap-3">
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <Icon name={heroIcon} size={42} />
          <div className="min-w-0">
            <div className={`font-display text-sm text-bone truncate max-w-[120px] sm:max-w-[160px] ${s.nameCorrupted ? 'animate-glitch text-fate' : ''}`}>{displayName(s)}</div>
            <div className="text-[10px] text-mist whitespace-nowrap">{T('Livello')}{' '}{s.hero.level}{s.hero.paragon ? ` ✴${s.hero.paragon}` : ''}{s.cycle.n > 1 ? T(' · Ciclo {n}', { n: s.cycle.n }) : ''}</div>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 min-w-0 max-w-md">
          <div className="space-y-1">
            <Bar value={s.hero.hp} max={st.maxHp} color="bg-gradient-to-r from-red-800 to-red-500" label={<><span>{T('Salute')}{' '}{lie(s.hero.hp, corrupt)}/{st.maxHp}</span>{s.hero.pledgedMaxHp > 0 && <span className="text-dissonance">{T('pegno −')}{s.hero.pledgedMaxHp}</span>}</>} />
            <Bar value={s.hero.xp} max={xpForLevel(s.hero.level)} color="bg-fate/70" height="h-1" />
          </div>
          {s.fardello && (
            <div className="space-y-1 hidden sm:block" title={T('Risonanza / Dissonanza / Corruzione')}>
              <Bar value={s.resonance} max={rmax} color={`bg-resonance ${s.resonance >= rmax ? 'res-glow' : ''}`} height="h-1.5" label={<><span className="text-resonance">{T('Risonanza')}{' '}{Math.floor(s.resonance)}/{rmax}</span>{s.dissonance >= 1 && <span className="text-dissonance">{T('Diss.')}{' '}{Math.floor(s.dissonance)}</span>}</>} />
              <Bar value={s.corruption} max={100} color="bg-gradient-to-r from-purple-900 to-fuchsia-600" height="h-1" />
            </div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {s.fardello && <span className={`text-xs ${VE.color} hidden md:inline whitespace-nowrap`} title={VE.desc}>{VE.icon} {T(vs)}</span>}
          <GameMenu state={s} act={act} onFullscreen={onFullscreen} onCodex={onCodex} onSave={onSave} />
        </div>
      </div>
      <div className={`max-w-6xl mx-auto px-3 py-1.5 flex gap-1.5 overflow-x-auto no-scrollbar ${corrupt ? 'corruptible' : ''}`}>
        {keys.map(k => (
          <div key={k} className={`shrink-0 flex items-center gap-1.5 rounded-full bg-white/[.03] border border-stone-800 pl-0.5 pr-2.5 py-0.5 ${RES_INFO[k].color} ${corrupt ? 'corrupt-num' : ''}`} title={`${RES_INFO[k].name}${prod[k] ? ` · +${fmt(prod[k])}/s` : ''}`}>
            <Icon name={k} size={30} />
            <div className="leading-none">
              <div className="text-sm tabular-nums min-w-[2.6em]">{lie(s.res[k], corrupt)}{k === 'intuizione' ? `/${intuitionCap(s)}` : ''}</div>
              {prod[k] > 0 && k !== 'intuizione' && <div className="text-[9px] text-mist tabular-nums">+{fmt(prod[k])}/s</div>}
            </div>
          </div>
        ))}
        {s.reliquie > 0 && <div className="shrink-0 flex items-center gap-1.5 rounded-full bg-white/[.03] border border-stone-800 pl-0.5 pr-2.5 py-0.5 text-yellow-200" title={T('Reliquie')}><Icon name="reliquie" size={30} /><span className="text-sm tabular-nums">{s.reliquie}</span></div>}
        {isUnlocked(s, 'discesa') && <div className="shrink-0 flex items-center gap-1.5 rounded-full bg-white/[.03] border border-stone-800 pl-1 pr-2.5 py-0.5 text-red-300" title={T('Pozioni')}><Icon name="pozione" size={26} /><span className="text-sm tabular-nums">{s.potions}</span></div>}
      </div>
    </header>
  );
}

// Menu di gioco: un solo pulsante che apre tutte le impostazioni rapide (spazio per aggiungerne altre in futuro)
function GameMenu({ state: s, act, onFullscreen, onCodex, onSave }: { state: GameState; act: Act; onFullscreen: () => void; onCodex: () => void; onSave?: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);
  const row = 'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-bone hover:bg-white/5 text-left';
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} title={T('Menu')} className={`w-11 h-11 flex flex-col items-center justify-center gap-[5px] rounded-full border transition ${open ? 'border-amber-500 bg-amber-900/30' : 'border-stone-700 hover:border-amber-500/70'}`}>
        <span className="block w-5 h-[2px] bg-bone/80 rounded" /><span className="block w-5 h-[2px] bg-bone/80 rounded" /><span className="block w-5 h-[2px] bg-bone/80 rounded" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-amber-800/60 bg-black/95 p-1.5 shadow-2xl animate-rise">
          <div className="px-3 py-2"><LangPicker onBeforeChange={onSave} /></div>
          <button className={row} onClick={() => { setOpen(false); onCodex(); }}><Icon name="diario" size={28} plain />{T('Codex: come funziona')}</button>
          <button className={row} onClick={() => act(d => { d.settings.music = !d.settings.music; })}><span className={s.settings.music ? '' : 'opacity-40'}><Icon name="musica" size={28} plain /></span>{s.settings.music ? T('Musica attiva') : T('Musica spenta')}</button>
          <button className={row} onClick={() => { setOpen(false); onFullscreen(); }}><Icon name="rito" size={28} plain />{T('Il Rito (schermo intero)')}</button>
          {onSave && <button className={row} onClick={() => { onSave(); setOpen(false); }}><Icon name="opzioni" size={28} plain />{T('💾 Salva ora')}</button>}
        </div>
      )}
    </div>
  );
}

const TABS: { id: TabId; icon: string; name: string }[] = [
  { id: 'villaggio', icon: 'villaggio', name: T('Villaggio') },
  { id: 'discesa', icon: 'discesa', name: T('Discesa') },
  { id: 'eroe', icon: 'eroe', name: T('Eroe') },
  { id: 'bussola', icon: 'bussola', name: T('Bussola') },
  { id: 'spedizioni', icon: 'compagni', name: T('Compagni') },
  { id: 'mercato', icon: 'mercato', name: T('Mercato') },
  { id: 'fazioni', icon: 'fazioni', name: T('Fazioni') },
  { id: 'diario', icon: 'diario', name: T('Diario') },
  { id: 'eredita', icon: 'eredita', name: T('Eredità') },
  { id: 'opzioni', icon: 'opzioni', name: T('Opzioni') },
];

export function Nav({ state: s, act }: { state: GameState; act: Act }) {
  const now = Date.now();
  const badge: Partial<Record<TabId, number | string>> = {
    diario: (s.dreams.length + (s.daily.chest ? 0 : 1) + s.daily.missions.filter(m => !m.claimed && missionProgress(s, m.id) >= m.target).length) || 0,
    spedizioni: s.companions.filter(c => c.mission && c.mission.end <= now).length || 0,
    eroe: s.hero.talentPoints || 0,
    discesa: s.delve ? '●' : 0,
    villaggio: (s.events.cart || s.events.deer || s.events.threat) ? '!' : 0,
  };
  const tabs = TABS.filter(t => isUnlocked(s, t.id));
  return (
    <nav className="bg-black/70 backdrop-blur border-b border-stone-800">
      <div className="max-w-6xl mx-auto flex overflow-x-auto no-scrollbar">
        {tabs.map(t => {
          const isNew = s.newTabs.includes(t.id) && s.tab !== t.id;
          return (
            <button key={t.id} onClick={() => act(d => { d.tab = t.id; d.newTabs = d.newTabs.filter(x => x !== t.id); if (t.id === 'bussola' && !d.flags.includes('seen_bussola')) d.flags.push('seen_bussola'); })}
              className={`relative shrink-0 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm flex items-center gap-1.5 border-b-2 transition ${s.tab === t.id ? 'border-amber-500 text-bone' : 'border-transparent text-mist hover:text-bone'}`}>
              <span className={isNew ? 'tab-new' : ''}><Icon name={t.icon} size={30} /></span>
              <span className="hidden sm:inline">{t.name}</span>
              {isNew && <span title={T('nuovo')} className="absolute top-1 left-1.5 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,.9)]" />}
              {!!badge[t.id] && <span className="absolute top-0.5 right-0.5 text-[9px] bg-ember text-white rounded-full px-1 leading-4">{badge[t.id]}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
