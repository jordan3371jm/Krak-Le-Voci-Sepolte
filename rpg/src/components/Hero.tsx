import { t as T } from '../i18n';
import { canAfford } from '../game/engine/state';
import { useEffect, useRef, useState } from 'react';
import type { GameState, Item, Slot } from '../game/types';
import type { Act } from '../game/useGame';
import { ASCENSIONS, CLASSES, FARDELLI, SKILLS, TALENTS, VIE } from '../game/data/core';
import { RARITY_BORDERS, RARITY_COLORS, RARITY_NAMES, SLOTS, SLOT_INFO } from '../game/data/world';
import {
  ascend, autoEquip, canAscend, canUnlockTalent, equip, forgeCost, forgeItem, heroPower, heroStats, itemScore, respecTalents, salvage, salvageJunk,
  salvageValue, unequip, unlockTalent, upgradeCost, upgradeItem,
} from '../game/engine/hero';
import { heroSkills } from '../game/engine/combat';
import { sellItem } from '../game/engine/meta';
import { displayName } from '../game/engine/state';
import { sfx } from '../game/audio';
import { Btn, Cost, Empty, ItemCard, Panel, STAT_LABELS, Tag, rich } from './ui';
import { Icon, Sigil } from './icons';
import { artFor, artOr } from './art';


const RARITY_GLOW = ['', 'shadow-[0_0_10px_rgba(56,189,248,.35)]', 'shadow-[0_0_12px_rgba(217,70,239,.4)]', 'shadow-[0_0_14px_rgba(251,191,36,.45)]', 'shadow-[0_0_16px_rgba(239,68,68,.5)]', 'shadow-[0_0_18px_rgba(94,234,212,.55)]'];
function SlotArt({ slot, size, tone = 0 }: { slot: Slot; size: number; tone?: number }) {
  return artFor('slot_' + slot) ? <Icon name={'slot_' + slot} size={size} /> : <Sigil emoji={SLOT_INFO[slot].icon} size={size} tone={(['bone', 'teal', 'violet', 'gold', 'blood', 'teal'] as const)[tone]} />;
}
/** Riquadro di un oggetto: icona, cornice del colore della rarità, potenziamento. */
function ItemTile({ it, selected, equipped, onClick }: { it: Item; selected?: boolean; equipped?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} title={it.name} className={`relative flex flex-col items-center rounded-xl border-2 ${RARITY_BORDERS[it.rarity]} ${RARITY_GLOW[it.rarity]} bg-gradient-to-b from-stone-900/80 to-black/80 p-1.5 transition hover:-translate-y-0.5 ${selected ? 'ring-2 ring-ember scale-[1.03]' : ''}`}>
      <SlotArt slot={it.slot} size={44} tone={it.rarity} />
      {it.plus > 0 && <span className="absolute top-0.5 right-1 text-[10px] font-bold text-amber-300">+{it.plus}</span>}
      {equipped && <span className="absolute top-0.5 left-1 text-[10px] text-teal-300">✔</span>}
      {it.locked && <span className="absolute bottom-6 right-1 text-[9px]">🔒</span>}
      <span className={`mt-1 w-full text-center text-[10px] leading-tight truncate ${RARITY_COLORS[it.rarity]}`}>{it.name}</span>
    </button>
  );
}

function Forge({ state: s, act }: { state: GameState; act: Act }) {
  const [slot, setSlot] = useState<Slot>('arma');
  const [step, setStep] = useState(-1);
  const [scores, setScores] = useState<number[]>([]);
  const [pos, setPos] = useState(0);
  const raf = useRef(0);
  const t0 = useRef(0);
  useEffect(() => {
    if (step < 0 || step > 2) return;
    t0.current = performance.now();
    const loop = (t: number) => { setPos((Math.sin((t - t0.current) / (420 - step * 90)) + 1) / 2); raf.current = requestAnimationFrame(loop); };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [step]);
  const zone = [0.5 - (0.14 - step * 0.03), 0.5 + (0.14 - step * 0.03)];
  const strike = () => {
    sfx.forge();
    const acc = Math.max(0, 1 - Math.abs(pos - 0.5) / 0.5);
    const next = [...scores, pos >= zone[0] && pos <= zone[1] ? 1 : acc * 0.6];
    setScores(next);
    if (step >= 2) {
      const q = next.reduce((a, b) => a + b, 0) / next.length;
      cancelAnimationFrame(raf.current);
      act(d => forgeItem(d, slot, q));
      setStep(-1); setScores([]);
    } else setStep(step + 1);
  };
  const cost = forgeCost(s);
  const [sparks, setSparks] = useState(0);
  const hit = () => { setSparks(x => x + 1); strike(); };
  if (!s.village.buildings.fucina) return <Panel title={T('Fucina')} icon="fucina"><Empty>{T('Costruisci una Fucina nel villaggio per forgiare equipaggiamento.')}</Empty></Panel>;
  return (
    <section className="forge rounded-2xl relative overflow-hidden p-4 sm:p-5">
      <div aria-hidden className="absolute inset-0 pointer-events-none forge-glow" />
      <div className="relative flex items-center gap-3 mb-4">
        <span className="animate-flicker"><Icon name="fucina" size={52} /></span>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-xl sm:text-2xl text-amber-100 tracking-wide">{T('Fucina')}</h3>
          <p className="text-[11px] sm:text-xs text-bone/70 italic">{T('Scegli cosa forgiare, poi batti il ferro tre volte nel momento giusto.')}</p>
        </div>
        <span className="hidden sm:block text-[10px] uppercase tracking-widest text-orange-200/80 border border-orange-900/70 rounded-full px-2 py-0.5">{T('Livello {n}', { n: s.village.buildings.fucina })}</span>
      </div>
      <div className="relative grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-5 items-center">
        <div className="flex flex-col items-center">
          <div className="forge-anvil relative">
            <span key={sparks} aria-hidden className={sparks ? 'forge-sparks' : ''} />
            <SlotArt slot={slot} size={128} />
          </div>
          <div className="font-display text-lg text-amber-100 mt-2">{SLOT_INFO[slot].name}</div>
          <div className="grid grid-cols-7 gap-1.5 mt-3 w-full max-w-sm">{SLOTS.map(sl => (
            <button key={sl} disabled={step >= 0} onClick={() => setSlot(sl)} title={SLOT_INFO[sl].name} className={`rounded-full transition ${slot === sl ? 'ring-2 ring-amber-400 shadow-[0_0_14px_rgba(245,158,11,.55)] scale-110' : 'opacity-60 hover:opacity-100'}`}>
              <SlotArt slot={sl} size={40} />
            </button>))}</div>
        </div>
        <div>
          <div className="flex justify-center gap-3 mb-3">{[0, 1, 2].map(i => (
            <span key={i} className={`forge-pip ${scores[i] === undefined ? (i === step ? 'now' : '') : scores[i] >= 1 ? 'perfect' : scores[i] > 0.3 ? 'good' : 'bad'}`}>{scores[i] === undefined ? i + 1 : scores[i] >= 1 ? '✦' : scores[i] > 0.3 ? '•' : '✕'}</span>))}</div>
          <div className="forge-bar relative h-12 sm:h-14 rounded-xl overflow-hidden">
            {step >= 0 && <div className="absolute inset-y-0 forge-zone" style={{ left: `${zone[0] * 100}%`, width: `${(zone[1] - zone[0]) * 100}%` }} />}
            {step >= 0 && <div className="absolute inset-y-0 w-1.5 -ml-[3px] bg-white shadow-[0_0_14px_white,0_0_30px_rgba(255,200,120,.9)]" style={{ left: `${pos * 100}%` }} />}
            {step < 0 && <div className="absolute inset-0 flex items-center justify-center text-xs text-orange-100/60 italic">{T('La forgia è spenta.')}</div>}
          </div>
          {step < 0 ? (
            <button onClick={() => { setScores([]); setStep(0); }} disabled={!canAfford(s, cost)} className="forge-btn mt-3 w-full">
              <span className="font-display tracking-wider">{T('Accendi la forgia')}</span> <Cost cost={cost} have={s.res} />
            </button>
          ) : (
            <button onClick={hit} className="forge-btn hot mt-3 w-full"><span className="font-display text-lg tracking-widest">{T('🔨 Batti!')}</span><span className="block text-[10px] opacity-80">{T('Colpo')}{' '}{step + 1}{T('/3 — batti quando il calore è nella zona luminosa.')}</span></button>
          )}
          <p className="text-[11px] text-mist mt-2">{T('La qualità dei colpi aumenta la rarità. Le Gilde (Fidato) migliorano ogni forgiatura.')}</p>
        </div>
      </div>
    </section>
  );
}

function Inventory({ state: s, act }: { state: GameState; act: Act }) {
  const [sel, setSel] = useState<string | null>(null);
  const [filter, setFilter] = useState<Slot | 'all'>('all');
  const equipped = new Set(Object.values(s.hero.equipped));
  const items = s.inventory.filter(i => filter === 'all' || i.slot === filter).sort((a, b) => itemScore(b) - itemScore(a));
  const it = s.inventory.find(i => i.uid === sel);
  const current = it ? s.inventory.find(i => i.uid === s.hero.equipped[it.slot]) : undefined;
  return (
    <Panel title={T('Inventario ({inventory}/80)', { inventory: s.inventory.length })} icon="bisaccia" right={<div className="flex gap-1"><Btn small onClick={() => act(d => autoEquip(d))}>{T('Auto-equipaggia')}</Btn><Btn small kind="bad" onClick={() => act(d => salvageJunk(d))}>{T('Smonta comuni')}</Btn></div>}>
      <div className="flex flex-wrap gap-1 mb-2">
        <Btn small kind={filter === 'all' ? 'ember' : 'ghost'} onClick={() => setFilter('all')}>{T('Tutto')}</Btn>
        {SLOTS.map(sl => <button key={sl} title={SLOT_INFO[sl].name} onClick={() => setFilter(sl)} className={`rounded-lg border p-0.5 ${filter === sl ? 'border-amber-400 bg-amber-900/30' : 'border-stone-800 hover:border-amber-700'}`}><SlotArt slot={sl} size={28} /></button>)}
      </div>
      {it && (
        <div className="rounded-lg border border-ember/40 p-2 mb-2 bg-black/40 animate-fade">
          <ItemCard it={it} equipped={equipped.has(it.uid)} />
          <p className="text-[11px] text-fate/80 italic mt-1">«{it.origin}»</p>
          {current && current.uid !== it.uid && <p className="text-[11px] mt-1">{T('Confronto:')}{' '}{itemScore(it) > itemScore(current) ? <span className="text-resonance">{T('▲ migliore di {name}', { name: current.name })}</span> : <span className="text-dissonance">{T('▼ peggiore di {name}', { name: current.name })}</span>}</p>}
          <div className="flex flex-wrap gap-1 mt-2">
            {equipped.has(it.uid) ? <Btn small onClick={() => act(d => unequip(d, it.slot))}>{T('Togli')}</Btn> : <Btn small kind="good" onClick={() => act(d => equip(d, it.uid))}>{T('Equipaggia')}</Btn>}
            <Btn small onClick={() => act(d => upgradeItem(d, it.uid))} disabled={it.plus >= 15}>{T('Potenzia +')}{it.plus + 1} <Cost cost={upgradeCost(it)} have={s.res} /></Btn>
            <Btn small onClick={() => act(d => { const x = d.inventory.find(i => i.uid === it.uid); if (x) x.locked = !x.locked; })}>{it.locked ? T('🔓 Sblocca') : T('🔒 Blocca')}</Btn>
            {!equipped.has(it.uid) && !it.locked && <>
              <Btn small kind="bad" onClick={() => { act(d => salvage(d, it.uid)); setSel(null); }}>{T('Smonta (⛓️')}{salvageValue(it).ferro})</Btn>
              <Btn small kind="fate" onClick={() => { act(d => sellItem(d, it.uid)); setSel(null); }}>{T('Vendi al Mercato')}</Btn>
            </>}
          </div>
        </div>
      )}
      {items.length === 0 ? <Empty>{T('Nessun oggetto. Scendi nei dungeon o forgia.')}</Empty> : (
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2 max-h-[26rem] overflow-y-auto pr-1">
          {items.map(i => <ItemTile key={i.uid} it={i} equipped={equipped.has(i.uid)} selected={sel === i.uid} onClick={() => setSel(i.uid === sel ? null : i.uid)} />)}
        </div>
      )}
    </Panel>
  );
}

const VIA_ART: Record<string, string> = { culto: 'fazione_culto', capitale: 'fazione_capitale', contadini: 'fazione_contadini', rivolta: 'fazione_eretici' };
const VIA_RGB: Record<string, string> = { culto: '220,38,38', capitale: '212,175,55', contadini: '132,204,22', rivolta: '168,85,247' };
function Talents({ state: s, act }: { state: GameState; act: Act }) {
  const spent = s.hero.talents.length;
  return (
    <Panel title={T('Vie dei Talenti')} icon="talenti" right={<div className="flex items-center gap-2"><Tag className="border-amber-500/70 text-amber-200">{T('Punti: {n}', { n: s.hero.talentPoints })}</Tag><Btn small kind="ghost" onClick={() => act(d => respecTalents(d))}>{T('Azzera (')}{100 * s.hero.level}⚱️)</Btn></div>}>
      <p className="text-xs text-mist mb-3">{T('Non sali di livello per diventare più forte: sali per diventare qualcuno. Ogni Via avvicina una fazione e ne allontana un\'altra.')} {T('Talenti presi: {n}/{tot}', { n: spent, tot: TALENTS.length })}</p>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {Object.entries(VIE).map(([via, v]) => {
          const list = TALENTS.filter(t => t.via === via);
          const own = list.filter(t => s.hero.talents.includes(t.id)).length;
          return (
            <div key={via} className="rounded-2xl border p-3 bg-gradient-to-b from-black/60 to-stone-950/60" style={{ borderColor: `rgba(${VIA_RGB[via]},.45)`, ['--vc' as any]: VIA_RGB[via] }}>
              <div className="flex items-center gap-2 mb-1"><Icon name={VIA_ART[via]} size={40} /><div><div className="font-display text-bone leading-tight">{v.name}</div><div className="text-[10px] text-mist">{v.desc}</div></div></div>
              <div className="h-1 rounded bg-stone-900 overflow-hidden mb-2"><div className="h-full" style={{ width: `${(own / list.length) * 100}%`, background: `rgb(${VIA_RGB[via]})` }} /></div>
              {[1, 2, 3, 4, 5, 6].map(tier => {
                const row = list.filter(t => t.tier === tier);
                return (
                  <div key={tier}>
                    {tier > 1 && <div className="mx-auto w-px h-3" style={{ background: `rgba(${VIA_RGB[via]},.5)` }} />}
                    <div className={`grid gap-2 ${row.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {row.map(t => {
                        const has = s.hero.talents.includes(t.id);
                        const can = canUnlockTalent(s, t.id);
                        return (
                          <button key={t.id} disabled={!can} onClick={() => { sfx.click(); act(d => unlockTalent(d, t.id)); }} title={t.desc}
                            className={`flex flex-col items-center text-center rounded-xl border p-1.5 transition ${has ? 'bg-[rgba(var(--vc),.14)] border-[rgba(var(--vc),.8)] shadow-[0_0_14px_rgba(var(--vc),.35)]' : can ? 'border-amber-500/70 hover:bg-white/5 animate-breathe' : 'border-stone-800 opacity-45'}`}>
                            <span className={has ? '' : can ? '' : 'grayscale'}><Icon name={artOr('tal_' + t.id, VIA_ART[via])} size={tier === 6 ? 46 : 36} /></span>
                            <span className={`text-[11px] leading-tight mt-1 font-display ${has ? 'text-bone' : 'text-bone/80'}`}>{t.name}</span>
                            <span className="text-[9.5px] leading-tight text-mist">{t.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function Ascension({ state: s, act }: { state: GameState; act: Act }) {
  const [sel, setSel] = useState<string[]>([]);
  if (!s.fardello) return <Panel title={T('Ascensione del Fardello')} icon="⬆️"><Empty>{T('Serve un Fardello.')}</Empty></Panel>;
  const F = FARDELLI[s.fardello];
  const paths = F.ascensions;
  if (s.ascension) {
    return (
      <Panel title={T('Ascensione del Fardello')} icon="⬆️">
        <p className="text-sm text-bone mb-2">{s.ascension.hybrid ? T('Ascensione Parallela (ibrido)') : T('Ascensione')}: {s.ascension.paths.map(p => `${ASCENSIONS[p].icon} ${ASCENSIONS[p].name}`).join(' + ')}</p>
        {s.ascension.paths.map(p => <div key={p} className="text-xs text-mist mb-1">✔ {ASCENSIONS[p].perks.join(' · ')} — ✖ {ASCENSIONS[p].costs.join(' · ')}</div>)}
        {s.ascension.hybrid && <p className="text-[11px] text-fate">{T('Ibrido: ogni cammino conta al 60%, ma ne porti entrambi i costi.')}</p>}
      </Panel>
    );
  }
  const ready = canAscend(s);
  return (
    <Panel title={T('Ascensione del Fardello')} icon="⬆️">
      <p className="text-xs text-mist mb-2">{rich(T('Oltre il livello: il Fardello evolve in forme più potenti e vincolanti. Scegli un cammino, oppure due per un\'**Ascensione Parallela** (ibrido: richiede il Frammento del Patto Spezzato o 5 reliquie).'))}</p>
      {!ready && <p className="text-xs text-dissonance mb-2">{T('Richiede livello 15 e il Cimitero conquistato (o 4 boss sconfitti).')}</p>}
      <div className="grid sm:grid-cols-3 gap-2">
        {paths.map(p => {
          const A = ASCENSIONS[p];
          const on = sel.includes(p);
          return (
            <button key={p} disabled={!ready} onClick={() => setSel(on ? sel.filter(x => x !== p) : sel.length < 2 ? [...sel, p] : [sel[1], p])} className={`text-left rounded-lg border p-2 ${on ? 'border-fate bg-fate/10' : 'border-stone-700'} disabled:opacity-50`}>
              <div className="text-sm text-bone flex items-center gap-2">{artFor('asc_' + A.id) ? <Icon name={'asc_' + A.id} size={36} /> : A.icon} <span>{A.name}</span></div>
              <div className="text-[11px] text-teal-200 mt-1">{A.perks.join(' · ')}</div>
              <div className="text-[11px] text-red-300">{A.costs.join(' · ')}</div>
            </button>
          );
        })}
      </div>
      {sel.length > 0 && <Btn kind="fate" className="mt-3" onClick={() => act(d => ascend(d, sel))}>{sel.length === 2 ? T('Ascensione Parallela: {name}', { name: sel.map(p => ASCENSIONS[p].name).join(' + ') }) : `Ascendi: ${ASCENSIONS[sel[0]].name}`}</Btn>}
    </Panel>
  );
}

export default function Hero({ state: s, act }: { state: GameState; act: Act }) {
  const [sub, setSub] = useState<'equip' | 'talenti' | 'ascensione'>('equip');
  const st = heroStats(s);
  const cls = CLASSES[s.classId];
  const F = s.fardello ? FARDELLI[s.fardello] : null;
  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-3 gap-4">
        <Panel title={displayName(s)} icon={cls.icon} right={<Tag>{T('Potenza')}{' '}{heroPower(s)}</Tag>}>
          <div className="flex items-center gap-3 mb-2"><Icon name={s.aberration ? 'corruzione' : s.classId} size={84} />{F && <Icon name={s.fardello!} size={52} />}</div>
          <p className="text-xs text-mist">{cls.name} · {T('Livello {n}', { n: s.hero.level })}{s.hero.paragon ? T(' · Oltre il limite ✴{paragon}', { paragon: s.hero.paragon }) : ''}{s.aberration ? T(' · 🦷 Aberrazione') : ''}</p>
          {F && <p className="text-xs mt-1" style={{ color: F.color }}>{F.name} · peso {F.weight} ({F.weight <= 2 ? T('leggero: agisci prima') : F.weight >= 4 ? T('pesante: +10% danni') : 'medio'})</p>}
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs mt-3">
            {Object.entries(st).map(([k, v]) => <div key={k} className="flex justify-between"><span className="text-mist">{STAT_LABELS[k]}</span><span className="text-bone">{Math.round(v * 10) / 10}</span></div>)}
          </div>
          {F && (
            <div className="mt-3 text-[11px] text-bone/70 space-y-0.5 border-t border-stone-800 pt-2">
              <div>✔ {F.advantage}</div><div>✖ {F.mechCost}</div><div>👥 {F.socialCost}</div>
            </div>
          )}
        </Panel>
        <Panel title={T('Equipaggiamento')} icon="equipaggiamento">
          {(() => {
            const slotCell = (sl: Slot) => {
              const it: Item | undefined = s.inventory.find(i => i.uid === s.hero.equipped[sl]);
              return (
                <button key={sl} title={it ? `${it.name} · ${SLOT_INFO[sl].name}` : SLOT_INFO[sl].name} onClick={() => it && act(d => unequip(d, sl))}
                  className={`relative flex flex-col items-center rounded-xl border-2 p-1 w-full transition ${it ? `${RARITY_BORDERS[it.rarity]} ${RARITY_GLOW[it.rarity]} bg-black/60 hover:brightness-110` : 'border-dashed border-stone-800 bg-black/30'}`}>
                  <span className={it ? '' : 'opacity-30 grayscale'}><SlotArt slot={sl} size={40} tone={it?.rarity || 0} /></span>
                  {it?.plus ? <span className="absolute top-0.5 right-1 text-[9px] font-bold text-amber-300">+{it.plus}</span> : null}
                  <span className={`text-[9px] leading-tight truncate w-full text-center ${it ? RARITY_COLORS[it.rarity] : 'text-mist'}`}>{it ? it.name : SLOT_INFO[sl].name}</span>
                </button>
              );
            };
            return (
              <div className="grid grid-cols-[1fr_1.3fr_1fr] gap-2 items-center">
                <div className="space-y-2">{(['elmo', 'corazza', 'stivali'] as Slot[]).map(slotCell)}</div>
                <div className="flex flex-col items-center text-center">
                  <div className="relative"><span aria-hidden className="absolute inset-0 rounded-full blur-xl bg-amber-500/20" /><Icon name={s.aberration ? 'corruzione' : s.classId} size={110} /></div>
                  <div className="mt-2 text-[10px] uppercase tracking-[0.25em] text-mist">{T('Potenza')}</div>
                  <div className="font-display text-2xl text-gradient-ember">{heroPower(s)}</div>
                  <Btn small className="mt-1" onClick={() => act(d => autoEquip(d))}>{T('Auto-equipaggia')}</Btn>
                </div>
                <div className="space-y-2">{(['arma', 'scudo', 'amuleto', 'anello'] as Slot[]).map(slotCell)}</div>
              </div>
            );
          })()}
          <p className="text-[10px] text-mist mt-2 text-center">{T('Tocca un oggetto indossato per toglierlo.')}</p>
        </Panel>
        <Panel title={T('Abilità')} icon="combat">
          <div className="grid gap-1.5">
            {heroSkills(s).map(id => { const k = SKILLS[id]; return k ? (
              <div key={id} className="flex gap-2 items-start rounded-lg border border-stone-800 bg-black/40 p-1.5">
                {artFor('skill_' + id) ? <Icon name={'skill_' + id} size={38} /> : <Sigil emoji={k.icon} size={36} tone="gold" />}
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2"><span className="text-xs text-bone font-display">{k.name}</span>{k.focusCost ? <span className="text-[10px] text-sky-300">◆{k.focusCost}</span> : k.focusGain ? <span className="text-[10px] text-teal-300">+1◆</span> : null}</div>
                  <div className="text-[10.5px] text-mist leading-snug">{k.desc}</div>
                </div>
              </div>) : null; })}
          </div>
          {F && <div className="mt-2 rounded-lg border border-fate/40 bg-fate/10 p-2 flex gap-2 items-start"><Icon name={s.fardello!} size={36} /><div className="text-[11px]"><b className="text-fate">{F.echoName}</b><p className="text-bone/75">{F.echoDesc}</p></div></div>}
        </Panel>
      </div>
      <div className="flex gap-2">
        <Btn kind={sub === 'equip' ? 'ember' : 'ghost'} onClick={() => setSub('equip')}>{T('Inventario e Fucina')}</Btn>
        <Btn kind={sub === 'talenti' ? 'ember' : 'ghost'} onClick={() => setSub('talenti')}>{T('Talenti')}{' '}{s.hero.talentPoints ? `(${s.hero.talentPoints})` : ''}</Btn>
        <Btn kind={sub === 'ascensione' ? 'ember' : 'ghost'} onClick={() => setSub('ascensione')}>{T('Ascensione')}</Btn>
      </div>
      {sub === 'equip' && <div className="space-y-4"><Forge state={s} act={act} /><Inventory state={s} act={act} /></div>}
      {sub === 'talenti' && <Talents state={s} act={act} />}
      {sub === 'ascensione' && <Ascension state={s} act={act} />}
      <p className="text-[10px] text-mist">{T('Rarità:')}{' '}{RARITY_NAMES.join(' · ')}</p>
    </div>
  );
}
