import type { GameState, ResKey, TabId } from '../game/types';
import { RES_INFO, VALLEY_EFFECTS } from '../game/data/world';
import { corruptedUI, displayName, fmt, intuitionCap, valleyState } from '../game/engine/state';
import { heroStats, resonanceMax, xpForLevel } from '../game/engine/hero';
import { missionProgress, productionPerSec } from '../game/engine/village';
import { isUnlocked } from '../game/engine/onboarding';
import type { Act } from '../game/useGame';
import { Bar } from './ui';
import { Icon } from './icons';

// numeri che mentono quando la corruzione è alta (UI diegetica)
function lie(n: number, on: boolean) {
  if (!on) return fmt(n);
  const f = 1 + (Math.sin(Date.now() / 900 + n) * 0.18);
  return fmt(n * f);
}

const iconBtn = 'w-9 h-9 flex items-center justify-center rounded-full border border-stone-700 hover:border-amber-500/70 transition';

export default function HUD({ state: s, act, onFullscreen, onCodex }: { state: GameState; act: Act; onFullscreen: () => void; onCodex: () => void }) {
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
      <div className="max-w-6xl mx-auto px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name={heroIcon} size={38} />
          <div className="min-w-0">
            <div className={`font-display text-sm text-bone truncate max-w-[140px] ${s.nameCorrupted ? 'animate-glitch text-fate' : ''}`}>{displayName(s)}</div>
            <div className="text-[10px] text-mist">Livello {s.hero.level}{s.hero.paragon ? ` ✴${s.hero.paragon}` : ''}{s.cycle.n > 1 ? ` · Ciclo ${s.cycle.n}` : ''}</div>
          </div>
        </div>
        <div className="w-28 sm:w-36 space-y-1">
          <Bar value={s.hero.hp} max={st.maxHp} color="bg-gradient-to-r from-red-800 to-red-500" label={<><span>Salute {lie(s.hero.hp, corrupt)}/{st.maxHp}</span>{s.hero.pledgedMaxHp > 0 && <span className="text-dissonance">pegno −{s.hero.pledgedMaxHp}</span>}</>} />
          <Bar value={s.hero.xp} max={xpForLevel(s.hero.level)} color="bg-fate/70" height="h-1" />
        </div>
        {s.fardello && (
          <div className="w-28 sm:w-36 space-y-1" title="Risonanza / Dissonanza / Corruzione">
            <Bar value={s.resonance} max={rmax} color={`bg-resonance ${s.resonance >= rmax ? 'res-glow' : ''}`} height="h-1.5" label={<><span className="text-resonance">Risonanza {Math.floor(s.resonance)}/{rmax}</span>{s.dissonance >= 1 && <span className="text-dissonance">Diss. {Math.floor(s.dissonance)}</span>}</>} />
            <Bar value={s.corruption} max={100} color="bg-gradient-to-r from-purple-900 to-fuchsia-600" height="h-1" />
          </div>
        )}
        <div className={`flex flex-wrap gap-x-3 gap-y-1 text-xs items-center ${corrupt ? 'corruptible' : ''}`}>
          {keys.map(k => (
            <span key={k} className={`flex items-center gap-1 ${RES_INFO[k].color} ${corrupt ? 'corrupt-num' : ''}`} title={`${RES_INFO[k].name}${prod[k] ? ` · +${fmt(prod[k])}/s` : ''}`}>
              <Icon name={k} size={22} />
              <span>{lie(s.res[k], corrupt)}{k === 'intuizione' ? `/${intuitionCap(s)}` : ''}{prod[k] > 0 && k !== 'intuizione' && <span className="text-[9px] text-mist"> +{fmt(prod[k])}/s</span>}</span>
            </span>
          ))}
          {s.reliquie > 0 && <span className="flex items-center gap-1 text-yellow-200" title="Reliquie"><Icon name="reliquie" size={22} />{s.reliquie}</span>}
          {isUnlocked(s, 'discesa') && <span className="flex items-center gap-1 text-red-300" title="Pozioni"><Icon name="pozione" size={22} />{s.potions}</span>}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {s.fardello && <span className={`text-xs ${VE.color} hidden sm:inline`} title={VE.desc}>{VE.icon} {vs}</span>}
          <button className={iconBtn} title="Codex: come funziona" onClick={onCodex}><Icon name="diario" size={28} plain /></button>
          <button className={`${iconBtn} ${s.settings.music ? '' : 'opacity-40'}`} title={s.settings.music ? 'Musica attiva' : 'Musica spenta'} onClick={() => act(d => { d.settings.music = !d.settings.music; })}><Icon name="musica" size={28} plain /></button>
          <button className={`${iconBtn} ${s.fullscreen ? 'border-blood bg-blood/30' : ''}`} title="Il Rito (schermo intero)" onClick={onFullscreen}><Icon name="rito" size={28} plain /></button>
        </div>
      </div>
    </header>
  );
}

const TABS: { id: TabId; icon: string; name: string }[] = [
  { id: 'villaggio', icon: 'villaggio', name: 'Villaggio' },
  { id: 'discesa', icon: 'discesa', name: 'Discesa' },
  { id: 'eroe', icon: 'eroe', name: 'Eroe' },
  { id: 'bussola', icon: 'bussola', name: 'Bussola' },
  { id: 'spedizioni', icon: 'compagni', name: 'Compagni' },
  { id: 'mercato', icon: 'mercato', name: 'Mercato' },
  { id: 'fazioni', icon: 'fazioni', name: 'Fazioni' },
  { id: 'diario', icon: 'diario', name: 'Diario' },
  { id: 'eredita', icon: 'eredita', name: 'Eredità' },
  { id: 'opzioni', icon: 'opzioni', name: 'Opzioni' },
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
              {isNew && <span className="absolute top-0 left-1 text-[8px] uppercase tracking-wider bg-amber-500 text-black rounded px-1">nuovo</span>}
              {!!badge[t.id] && <span className="absolute top-0.5 right-0.5 text-[9px] bg-ember text-white rounded-full px-1 leading-4">{badge[t.id]}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
