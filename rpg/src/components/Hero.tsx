import { t as T } from '../i18n';
import { useEffect, useRef, useState } from 'react';
import type { GameState, Item, Slot } from '../game/types';
import type { Act } from '../game/useGame';
import { ASCENSIONS, CLASSES, FARDELLI, SKILLS, TALENTS, VIE } from '../game/data/core';
import { RARITY_NAMES, SLOTS, SLOT_INFO } from '../game/data/world';
import {
  ascend, autoEquip, canAscend, canUnlockTalent, equip, forgeCost, forgeItem, heroPower, heroStats, itemScore, respecTalents, salvage, salvageJunk,
  salvageValue, unequip, unlockTalent, upgradeCost, upgradeItem,
} from '../game/engine/hero';
import { heroSkills } from '../game/engine/combat';
import { sellItem } from '../game/engine/meta';
import { displayName } from '../game/engine/state';
import { sfx } from '../game/audio';
import { Btn, Cost, Empty, ItemCard, Panel, STAT_LABELS, Tag, rich } from './ui';

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
  return (
    <Panel title={T('Fucina')} icon="🔨">
      {!s.village.buildings.fucina ? <Empty>{T('Costruisci una Fucina nel villaggio per forgiare equipaggiamento.')}</Empty> : (
        <>
          <div className="flex flex-wrap gap-1 mb-2">{SLOTS.map(sl => <Btn key={sl} small kind={slot === sl ? 'ember' : 'default'} onClick={() => setSlot(sl)}>{SLOT_INFO[sl].icon} {SLOT_INFO[sl].name}</Btn>)}</div>
          {step < 0 ? (
            <Btn kind="ember" onClick={() => { setScores([]); setStep(0); }}>{T('Accendi la forgia ·')}{' '}<Cost cost={cost} have={s.res} /></Btn>
          ) : (
            <div>
              <p className="text-xs text-mist mb-1">{T('Colpo')}{' '}{step + 1}{T('/3 — batti quando il calore è nella zona luminosa.')}</p>
              <div className="relative h-6 rounded bg-gradient-to-r from-stone-900 via-orange-900 to-stone-900 border border-stone-700 overflow-hidden">
                <div className="absolute inset-y-0 bg-amber-400/40" style={{ left: `${zone[0] * 100}%`, width: `${(zone[1] - zone[0]) * 100}%` }} />
                <div className="absolute inset-y-0 w-1 bg-white shadow-[0_0_8px_white]" style={{ left: `${pos * 100}%` }} />
              </div>
              <Btn kind="ember" className="mt-2 w-full" onClick={strike}>{T('🔨 Batti!')}</Btn>
            </div>
          )}
          <p className="text-[11px] text-mist mt-2">{T('La qualità dei colpi aumenta la rarità. Le Gilde (Fidato) migliorano ogni forgiatura.')}</p>
        </>
      )}
    </Panel>
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
    <Panel title={T('Inventario ({inventory}/80)', { inventory: s.inventory.length })} icon="🎒" right={<div className="flex gap-1"><Btn small onClick={() => act(d => autoEquip(d))}>{T('Auto-equipaggia')}</Btn><Btn small kind="bad" onClick={() => act(d => salvageJunk(d))}>{T('Smonta comuni')}</Btn></div>}>
      <div className="flex flex-wrap gap-1 mb-2">
        <Btn small kind={filter === 'all' ? 'ember' : 'ghost'} onClick={() => setFilter('all')}>{T('Tutto')}</Btn>
        {SLOTS.map(sl => <Btn key={sl} small kind={filter === sl ? 'ember' : 'ghost'} onClick={() => setFilter(sl)}>{SLOT_INFO[sl].icon}</Btn>)}
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
        <div className="grid sm:grid-cols-2 gap-1.5 max-h-96 overflow-y-auto pr-1">
          {items.map(i => <ItemCard key={i.uid} it={i} compact equipped={equipped.has(i.uid)} selected={sel === i.uid} onClick={() => setSel(i.uid === sel ? null : i.uid)} />)}
        </div>
      )}
    </Panel>
  );
}

function Talents({ state: s, act }: { state: GameState; act: Act }) {
  return (
    <Panel title={T('Vie dei Talenti · {talentPoints} punti', { talentPoints: s.hero.talentPoints })} icon="🎓" right={<Btn small kind="ghost" onClick={() => act(d => respecTalents(d))}>{T('Azzera (')}{100 * s.hero.level}⚱️)</Btn>}>
      <p className="text-xs text-mist mb-3">{T('Non sali di livello per diventare più forte: sali per diventare qualcuno. Ogni Via avvicina una fazione e ne allontana un\'altra.')}</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {Object.entries(VIE).map(([via, v]) => (
          <div key={via} className="rounded-lg border border-stone-700 p-2">
            <div className="text-sm text-bone mb-1">{v.icon} {v.name}</div>
            <div className="text-[10px] text-mist mb-2">{v.desc}</div>
            <div className="space-y-1">
              {TALENTS.filter(t => t.via === via).map(t => {
                const has = s.hero.talents.includes(t.id);
                const can = canUnlockTalent(s, t.id);
                return (
                  <button key={t.id} disabled={!can} onClick={() => act(d => unlockTalent(d, t.id))} className={`w-full text-left rounded border p-1.5 text-xs ${has ? 'border-resonance bg-teal-950/40 text-teal-100' : can ? 'border-ember hover:bg-ember/10' : 'border-stone-800 opacity-50'}`}>
                    <b>{t.tier}. {t.name}</b> <span className="text-mist">— {t.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
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
              <div className="text-sm text-bone">{A.icon} {A.name}</div>
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
          <p className="text-xs text-mist">{cls.name} · {T('Livello {n}', { n: s.hero.level })}{s.hero.paragon ? T(' · Oltre il limite ✴{paragon}', { paragon: s.hero.paragon }) : ''}{s.aberration ? T(' · 🦷 Aberrazione') : ''}</p>
          {F && <p className="text-xs mt-1" style={{ color: F.color }}>{F.icon} {F.name} · peso {F.weight} ({F.weight <= 2 ? T('leggero: agisci prima') : F.weight >= 4 ? T('pesante: +10% danni') : 'medio'})</p>}
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs mt-3">
            {Object.entries(st).map(([k, v]) => <div key={k} className="flex justify-between"><span className="text-mist">{STAT_LABELS[k]}</span><span className="text-bone">{Math.round(v * 10) / 10}</span></div>)}
          </div>
          {F && (
            <div className="mt-3 text-[11px] text-bone/70 space-y-0.5 border-t border-stone-800 pt-2">
              <div>✔ {F.advantage}</div><div>✖ {F.mechCost}</div><div>👥 {F.socialCost}</div>
            </div>
          )}
        </Panel>
        <Panel title={T('Equipaggiamento')} icon="🛡️">
          <div className="space-y-1">
            {SLOTS.map(sl => {
              const it: Item | undefined = s.inventory.find(i => i.uid === s.hero.equipped[sl]);
              return it ? <ItemCard key={sl} it={it} compact equipped /> : <div key={sl} className="text-xs text-mist border border-dashed border-stone-800 rounded-lg p-2">{SLOT_INFO[sl].icon} {T('{slot}: vuoto', { slot: SLOT_INFO[sl].name })}</div>;
            })}
          </div>
        </Panel>
        <Panel title={T('Abilità')} icon="📜">
          <div className="space-y-1">
            {heroSkills(s).map(id => { const k = SKILLS[id]; return k ? <div key={id} className="text-xs"><span className="text-bone">{k.icon} {k.name}</span> <span className="text-mist">— {k.desc}</span></div> : null; })}
          </div>
          {F && <p className="text-[11px] text-fate mt-2">{T('Eco:')}{' '}{F.echoName} — {F.echoDesc}</p>}
        </Panel>
      </div>
      <div className="flex gap-2">
        <Btn kind={sub === 'equip' ? 'ember' : 'ghost'} onClick={() => setSub('equip')}>{T('Inventario e Fucina')}</Btn>
        <Btn kind={sub === 'talenti' ? 'ember' : 'ghost'} onClick={() => setSub('talenti')}>{T('Talenti')}{' '}{s.hero.talentPoints ? `(${s.hero.talentPoints})` : ''}</Btn>
        <Btn kind={sub === 'ascensione' ? 'ember' : 'ghost'} onClick={() => setSub('ascensione')}>{T('Ascensione')}</Btn>
      </div>
      {sub === 'equip' && <div className="grid lg:grid-cols-3 gap-4"><div className="lg:col-span-2"><Inventory state={s} act={act} /></div><Forge state={s} act={act} /></div>}
      {sub === 'talenti' && <Talents state={s} act={act} />}
      {sub === 'ascensione' && <Ascension state={s} act={act} />}
      <p className="text-[10px] text-mist">{T('Rarità:')}{' '}{RARITY_NAMES.join(' · ')}</p>
    </div>
  );
}
