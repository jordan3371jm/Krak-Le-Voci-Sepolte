import type { ReactNode } from 'react';
import type { Item, Resources } from '../game/types';
import { RARITY_BORDERS, RARITY_COLORS, RARITY_NAMES, RES_INFO, SLOT_INFO } from '../game/data/world';
import { fmt } from '../game/engine/state';
import { sfx } from '../game/audio';

export function Panel({ title, icon, children, className = '', right }: { title?: ReactNode; icon?: string; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <section className={`panel rounded-xl p-3 sm:p-4 ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="font-display text-sm sm:text-base text-bone tracking-wide flex items-center gap-2">{icon && <span>{icon}</span>}{title}</h3>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Btn({ children, onClick, disabled, kind = 'default', className = '', title, small }: { children: ReactNode; onClick?: () => void; disabled?: boolean; kind?: 'default' | 'ember' | 'fate' | 'good' | 'bad' | 'ghost'; className?: string; title?: string; small?: boolean }) {
  const k = {
    default: 'border-stone-600 hover:border-ember/70 hover:bg-ember/10 text-bone',
    ember: 'border-ember/70 bg-ember/15 hover:bg-ember/30 text-orange-100',
    fate: 'border-fate/60 bg-fate/10 hover:bg-fate/25 text-purple-100',
    good: 'border-resonance/60 bg-resonance/10 hover:bg-resonance/25 text-teal-100',
    bad: 'border-dissonance/60 bg-dissonance/10 hover:bg-dissonance/25 text-red-100',
    ghost: 'border-transparent hover:border-stone-600 text-mist hover:text-bone',
  }[kind];
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={() => { if (!disabled) { sfx.click(); onClick?.(); } }}
      className={`rounded-lg border transition-colors ${small ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'} disabled:opacity-35 disabled:cursor-not-allowed ${k} ${className}`}
    >
      {children}
    </button>
  );
}

export function Bar({ value, max, color = 'bg-ember', className = '', label, height = 'h-2' }: { value: number; max: number; color?: string; className?: string; label?: ReactNode; height?: string }) {
  const p = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className={className}>
      {label && <div className="flex justify-between text-[11px] text-mist mb-0.5">{label}</div>}
      <div className={`${height} bg-black/60 rounded-full overflow-hidden border border-stone-800`}>
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

export function Cost({ cost, have, extra }: { cost: Partial<Resources>; have?: Resources; extra?: ReactNode }) {
  return (
    <span className="inline-flex flex-wrap gap-x-2 gap-y-0.5 text-[11px]">
      {Object.entries(cost).map(([k, v]) => {
        const ok = !have || have[k as keyof Resources] >= (v || 0);
        return <span key={k} className={ok ? 'text-bone/80' : 'text-dissonance'}>{RES_INFO[k as keyof Resources].icon}{fmt(v || 0)}</span>;
      })}
      {extra}
    </span>
  );
}

export function Tag({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded border border-stone-700 text-mist ${className}`}>{children}</span>;
}

export const STAT_LABELS: Record<string, string> = { maxHp: 'Salute', atk: 'Attacco', def: 'Difesa', crit: 'Critico %', critDmg: 'Danno critico %', dodge: 'Schivata %', lifesteal: 'Rubavita %', thorns: 'Rivalsa %', speed: 'Velocità' };

export function ItemCard({ it, onClick, selected, equipped, compact }: { it: Item; onClick?: () => void; selected?: boolean; equipped?: boolean; compact?: boolean }) {
  return (
    <button onClick={onClick} className={`text-left rounded-lg border ${RARITY_BORDERS[it.rarity]} bg-black/40 p-2 w-full transition ${selected ? 'ring-2 ring-ember' : ''} hover:bg-white/5`}>
      <div className="flex items-start gap-2">
        <span className="text-lg">{SLOT_INFO[it.slot].icon}</span>
        <div className="min-w-0 flex-1">
          <div className={`text-xs font-semibold truncate ${RARITY_COLORS[it.rarity]}`}>{it.name}{it.plus ? ` +${it.plus}` : ''}{it.locked ? ' 🔒' : ''}</div>
          <div className="text-[10px] text-mist">{RARITY_NAMES[it.rarity]} · Lv {it.ilvl}{equipped ? ' · equipaggiato' : ''}</div>
          {!compact && (
            <div className="text-[10px] text-bone/70 mt-0.5 flex flex-wrap gap-x-2">
              {Object.entries(it.stats).map(([k, v]) => <span key={k}>{STAT_LABELS[k] || k} +{Math.round((v || 0) * (1 + it.plus * 0.08) * 10) / 10}</span>)}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

export function Modal({ children, onClose, wide }: { children: ReactNode; onClose?: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 animate-fade" onClick={onClose}>
      <div className={`panel rounded-2xl p-4 sm:p-6 w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto animate-rise`} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-xs text-mist italic py-2">{children}</p>;
}
