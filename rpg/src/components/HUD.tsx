import type { GameState, ResKey, TabId } from '../game/types';
import { FARDELLI } from '../game/data/core';
import { RES_INFO, VALLEY_EFFECTS } from '../game/data/world';
import { corruptedUI, displayName, fmt, intuitionCap, valleyState } from '../game/engine/state';
import { heroStats, resonanceMax, xpForLevel } from '../game/engine/hero';
import { productionPerSec } from '../game/engine/village';
import type { Act } from '../game/useGame';
import { missionProgress } from '../game/engine/village';
import { Bar } from './ui';

// numeri che mentono quando la corruzione è alta (UI diegetica)
function lie(n: number, on: boolean) {
  if (!on) return fmt(n);
  const f = 1 + (Math.sin(Date.now() / 900 + n) * 0.18);
  return fmt(n * f);
}

export default function HUD({ state: s, act, onFullscreen }: { state: GameState; act: Act; onFullscreen: () => void }) {
  const st = heroStats(s);
  const corrupt = corruptedUI(s);
  const prod = productionPerSec(s);
  const vs = valleyState(s);
  const VE = VALLEY_EFFECTS[vs];
  const F = s.fardello ? FARDELLI[s.fardello] : null;
  const rmax = resonanceMax(s);
  const keys: ResKey[] = ['cenere', 'provviste', 'legno', 'pietra', 'ferro', 'intuizione'];
  return (
    <header className="bg-black/85 backdrop-blur border-b border-ember/20">
      <div className="max-w-6xl mx-auto px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl">{s.aberration ? '🦷' : F?.icon || '🕯️'}</span>
          <div className="min-w-0">
            <div className={`font-display text-sm text-bone truncate max-w-[140px] ${s.nameCorrupted ? 'animate-glitch text-fate' : ''}`}>{displayName(s)}</div>
            <div className="text-[10px] text-mist">Lv {s.hero.level}{s.hero.paragon ? ` ✴${s.hero.paragon}` : ''} · Ciclo {s.cycle.n}</div>
          </div>
        </div>
        <div className="w-28 sm:w-36 space-y-1">
          <Bar value={s.hero.hp} max={st.maxHp} color="bg-gradient-to-r from-red-800 to-red-500" label={<><span>❤️ {lie(s.hero.hp, corrupt)}/{st.maxHp}</span>{s.hero.pledgedMaxHp > 0 && <span className="text-dissonance">⛓️-{s.hero.pledgedMaxHp}</span>}</>} />
          <Bar value={s.hero.xp} max={xpForLevel(s.hero.level)} color="bg-fate/70" height="h-1" />
        </div>
        {F && (
          <div className="w-28 sm:w-36 space-y-1" title="Risonanza / Dissonanza / Corruzione">
            <Bar value={s.resonance} max={rmax} color={`bg-resonance ${s.resonance >= rmax ? 'res-glow' : ''}`} height="h-1.5" label={<><span className="text-resonance">◈ {Math.floor(s.resonance)}/{rmax}</span><span className="text-dissonance">〰 {Math.floor(s.dissonance)}</span></>} />
            <Bar value={s.corruption} max={100} color="bg-gradient-to-r from-purple-900 to-fuchsia-600" height="h-1" />
          </div>
        )}
        <div className={`flex flex-wrap gap-x-3 gap-y-0.5 text-xs ${corrupt ? 'corruptible' : ''}`}>
          {keys.map(k => (
            <span key={k} className={`${RES_INFO[k].color} ${corrupt ? 'corrupt-num' : ''}`} title={`${RES_INFO[k].name}${prod[k] ? ` · +${fmt(prod[k])}/s` : ''}`}>
              {RES_INFO[k].icon}{lie(s.res[k], corrupt)}{k === 'intuizione' ? `/${intuitionCap(s)}` : ''}
              {prod[k] > 0 && k !== 'intuizione' && <span className="text-[9px] text-mist">+{fmt(prod[k])}/s</span>}
            </span>
          ))}
          <span className="text-yellow-200" title="Reliquie">🏺{s.reliquie}</span>
          <span className="text-red-300" title="Pozioni">🧪{s.potions}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`text-xs ${VE.color}`} title={VE.desc}>{VE.icon} {vs}</span>
          <button className="text-sm px-2 py-1 rounded border border-stone-700 hover:border-ember" title="Musica" onClick={() => act(d => { d.settings.music = !d.settings.music; })}>{s.settings.music ? '🎵' : '🔇'}</button>
          <button className="text-sm px-2 py-1 rounded border border-stone-700 hover:border-ember" title="Effetti sonori" onClick={() => act(d => { d.settings.sfx = !d.settings.sfx; })}>{s.settings.sfx ? '🔊' : '🔈'}</button>
          <button className={`text-sm px-2 py-1 rounded border ${s.fullscreen ? 'border-blood bg-blood/30' : 'border-stone-700 hover:border-ember'}`} title="Rito (schermo intero)" onClick={onFullscreen}>{s.fullscreen ? '👁️' : '⛶'}</button>
        </div>
      </div>
    </header>
  );
}

const TABS: { id: TabId; icon: string; name: string }[] = [
  { id: 'villaggio', icon: '🏘️', name: 'Villaggio' },
  { id: 'discesa', icon: '🕳️', name: 'Discesa' },
  { id: 'eroe', icon: '⚔️', name: 'Eroe' },
  { id: 'bussola', icon: '✨', name: 'Bussola' },
  { id: 'spedizioni', icon: '🧭', name: 'Compagni' },
  { id: 'mercato', icon: '🎭', name: 'Mercato' },
  { id: 'fazioni', icon: '⚖️', name: 'Fazioni' },
  { id: 'diario', icon: '📖', name: 'Diario' },
  { id: 'eredita', icon: '🏺', name: 'Eredità' },
  { id: 'opzioni', icon: '⚙️', name: 'Opzioni' },
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
  return (
    <nav className="bg-black/70 backdrop-blur border-b border-stone-800">
      <div className="max-w-6xl mx-auto flex overflow-x-auto no-scrollbar">
        {TABS.map(t => (
          <button key={t.id} onClick={() => act(d => { d.tab = t.id; })} className={`relative shrink-0 px-3 py-2 text-xs sm:text-sm flex items-center gap-1 border-b-2 transition ${s.tab === t.id ? 'border-ember text-bone' : 'border-transparent text-mist hover:text-bone'}`}>
            <span>{t.icon}</span><span className="hidden sm:inline">{t.name}</span>
            {!!badge[t.id] && <span className="absolute top-0.5 right-0.5 text-[9px] bg-ember text-white rounded-full px-1 leading-4">{badge[t.id]}</span>}
          </button>
        ))}
      </div>
    </nav>
  );
}
