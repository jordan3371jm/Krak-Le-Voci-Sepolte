import { t as T } from '../i18n';
import { BG, artFor, artOr, pick } from './art';
import { useEffect, useRef, useState } from 'react';
import type { BiomeId, GameState } from '../game/types';
import type { Act } from '../game/useGame';
import { BIOMES, BIOME_IDS, DUNGEON_MODIFIERS } from '../game/data/enemies';
import { FARDELLI } from '../game/data/core';
import { FRAGMENTS, RARITY_COLORS } from '../game/data/world';
import { biomeName, corruptedUI, fillText, fmt, valleyFx } from '../game/engine/state';
import {
  bankAndLeave, biomeLifecycle, biomeUnlocked, buyFromGhostMerchant, checkpoints, chooseBossItem, chooseDelveEvent, choiceAvailable, choosePostBoss,
  chooseDoor, descend, descendCost, enterDelve, findEvent, leaveRoom, resolveTrap, ROOM_ICONS, ROOM_NAMES, startWorldBoss, useShrine,
} from '../game/engine/delve';
import { heroStats } from '../game/engine/hero';
import { sharedWorld } from '../game/engine/meta';
import { todayKey } from '../game/rng';
import { sfx } from '../game/audio';
import { AdBtn, Bar, Btn, ItemCard, Panel, Tag, iconize, rich } from './ui';
import { adBossReady, adBossTry, adSupplies } from '../game/engine/rewards';
import { Icon, Sigil } from './icons';
import { Tip } from './Guide';
import { isUnlocked } from '../game/engine/onboarding';
import { KRAK_RULES, OMENS, PUZZLE_SYMBOLS, dailyMods, omenText, setKrakLevel } from '../game/engine/features';
import { puzzlePress } from '../game/engine/delve';
import { hasLeaderboard } from '../game/platform';

function BiomeMedal({ id }: { id: string }) {
  if (artFor('bioma_' + id)) return <Icon name={'bioma_' + id} size={44} />;
  return BG[id] ? <span className="inline-block w-11 h-11 rounded-full ring-2 ring-amber-700/70 shadow-[0_0_12px_rgba(0,0,0,.8)] bg-cover bg-center shrink-0" style={{ backgroundImage: `url(${BG[id]})` }} /> : <Icon name="discesa" size={44} />;
}

export function OmensPanel({ state: s }: { state: GameState }) {
  if (!s.omens.length) return null;
  return (
    <Panel title={T('Presagi')} icon={artOr('presagi', '👁️')} right={<span className="text-[10px] uppercase tracking-widest text-fate/80">{s.omens.length}</span>}>
      <div className="space-y-2.5">
        {s.omens.map(o => {
          const def = OMENS.find(x => x.id === o.id)!;
          const doom = o.left <= 1;
          return (
            <div key={o.id} className={`omen-card flex gap-3 items-center p-2.5 ${doom ? 'doom' : ''}`}>
              <span className={`relative shrink-0 ${doom ? 'portrait-uncanny' : 'portrait-alive'}`}><Icon name={artOr('omen_' + o.id, def.icon)} size={60} /></span>
              <div className="relative flex-1 text-xs text-bone/90 leading-snug">{omenText(s, o)}</div>
              <div className="relative omen-seal shrink-0"><span className="font-display text-xl text-red-50 leading-none">{o.left}</span><span className="text-[7px] uppercase tracking-wider text-red-200/80">{T('discese')}</span></div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-mist mt-2 italic">{T('Ogni discesa consuma un giorno del presagio. Se lo ignori, si compie.')}</p>
    </Panel>
  );
}

function PuzzleRoom({ state: s, act }: { state: GameState; act: Act }) {
  const P = s.delve!.room!.puzzle!;
  const syms = P.mode === 'candele' ? PUZZLE_SYMBOLS.slice(0, 4) : PUZZLE_SYMBOLS;
  const [phase, setPhase] = useState<'idle' | 'show' | 'input'>(P.input.length ? 'input' : 'idle');
  const [lit, setLit] = useState<number | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(t => clearTimeout(t)), []);
  const play = () => {
    setPhase('show');
    const on = s.settings.reduceFx ? 900 : 650, off = 260;
    P.seq.forEach((v, i) => {
      timers.current.push(window.setTimeout(() => { setLit(v); sfx.click?.(); }, 400 + i * (on + off)));
      timers.current.push(window.setTimeout(() => setLit(null), 400 + i * (on + off) + on));
    });
    timers.current.push(window.setTimeout(() => setPhase('input'), 400 + P.seq.length * (on + off)));
  };
  const press = (i: number) => {
    if (phase !== 'input') return;
    setLit(i);
    timers.current.push(window.setTimeout(() => setLit(null), 200));
    act(x => puzzlePress(x, i));
  };
  return (
    <div className="space-y-3">
      <div className={`grid gap-2 ${syms.length === 4 ? 'grid-cols-4' : 'grid-cols-3 sm:grid-cols-6'}`}>
        {syms.map((g, i) => (
          <button key={i} onClick={() => press(i)} disabled={phase !== 'input'}
            className={`aspect-square rounded-xl border text-3xl sm:text-4xl flex items-center justify-center transition duration-150 ${lit === i ? 'bg-amber-500/40 border-amber-300 scale-105 shadow-[0_0_24px_rgba(251,191,36,.7)]' : 'bg-black/60 border-stone-700'} ${phase === 'input' ? 'hover:border-ember cursor-pointer' : 'opacity-80'}`}>
            <span className={lit === i ? '' : 'grayscale opacity-60'}>{g}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1 justify-center">{P.seq.map((_, i) => <span key={i} className={`w-2.5 h-2.5 rounded-full ${i < P.input.length ? 'bg-ember' : 'bg-stone-700'}`} />)}</div>
      {phase === 'idle' && <Btn kind="ember" className="w-full" onClick={play}>{T('👁️ Osserva la sequenza')}</Btn>}
      {phase === 'show' && <p className="text-center text-xs text-amber-200 animate-pulse">{T('Guarda… e ricorda.')}</p>}
      {phase === 'input' && <p className="text-center text-xs text-bone/80">{T('Ora ripeti la sequenza. Un errore e il buio risponde.')}</p>}
    </div>
  );
}

function KrakPanel({ state: s, act }: { state: GameState; act: Act }) {
  if (!s.krak || s.krak.max < 1) return null;
  const L = s.krak.level;
  return (
    <Panel title={T('Livelli di Krak')} icon={artOr('krak_livelli', '💀')} right={<span className="text-xs text-mist">{T('Sbloccati: {n}/10', { n: s.krak.max })}</span>}>
      <p className="text-xs text-bone/70 mb-2">{T('Krak ricorda che sei tornato. Ogni livello aggiunge una regola crudele e rende il bottino più ricco. Superare un Ciclo al livello più alto ne sblocca un altro.')}</p>
      <div className="flex flex-wrap gap-1 mb-2">
        {Array.from({ length: s.krak.max + 1 }, (_, i) => (
          <button key={i} disabled={!!s.delve} onClick={() => act(d => setKrakLevel(d, i))} className={`w-9 h-9 rounded-lg border text-sm font-bold ${i === L ? 'bg-red-900/70 border-red-400 text-white' : 'border-stone-700 text-mist hover:border-ember'}`}>{i}</button>
        ))}
      </div>
      <ul className="text-[11px] space-y-0.5">
        {KRAK_RULES.filter(r => r.n <= Math.max(L, 1)).map(r => <li key={r.n} className={r.n <= L ? 'text-red-200' : 'text-mist'}>{r.n}. <b>{r.name}</b>: {r.desc}</li>)}
      </ul>
      {L > 0 && <p className="text-[11px] text-ember mt-1">{T('Nemici +{e}% · Bottino +{l}%', { e: Math.round(12 * L + (L >= 10 ? 20 : 0)), l: 10 * L })}</p>}
    </Panel>
  );
}

function DailyPanel({ state: s, act }: { state: GameState; act: Act }) {
  const today = todayKey();
  const run = s.dailyRun.day === today ? s.dailyRun : { best: 0, tries: 0, allBest: s.dailyRun.allBest || 0 };
  const mods = dailyMods(today);
  return (
    <Panel title={T('Sfida del giorno')} icon={artOr('sfida', '🗓️')} right={<span className="text-xs text-mist">{T('Tentativi: {n}/3', { n: run.tries })}</span>}>
      <p className="text-xs text-bone/70 mb-2">{T('Oggi il Cimitero dei Traditi è uguale per tutti i portatori: stesse porte, stessi nemici, stesse maledizioni. Scendi più in fondo che puoi.')}</p>
      <div className="flex flex-wrap gap-1 mb-2">{mods.map(m => <Tag key={m} className="border-fate/50 text-purple-200"><span title={DUNGEON_MODIFIERS[m].desc}>{DUNGEON_MODIFIERS[m].name}</span></Tag>)}</div>
      <div className="flex flex-wrap items-center gap-3">
        <Btn kind="fate" disabled={!s.fardello || !!s.delve || run.tries >= 3 || s.res.provviste < 1} onClick={() => { sfx.door(); act(d => enterDelve(d, 'cimitero', 1, true)); }}>{T('Affronta la sfida (🍞1)')}</Btn>
        <span className="text-xs text-mist">{T('Record di oggi: piano {n}', { n: run.best })} · {T('Record assoluto: {n}', { n: run.allBest })}</span>
      </div>
      <p className="text-[10px] text-mist mt-1">{hasLeaderboard() ? T('Il tuo record viene inviato alla classifica della piattaforma.') : T('Ogni nuovo record ti dà cenere; oltre l’ottavo piano, una reliquia.')}</p>
    </Panel>
  );
}

function BiomeSelect({ state: s, act }: { state: GameState; act: Act }) {
  const [start, setStart] = useState<Record<string, number>>({});
  const w = sharedWorld(todayKey(), s);
  const bossHp = Math.max(0, w.bossMax - w.bossOthers - s.world.bossDamage);
  return (
    <div className="space-y-4">
      <OmensPanel state={s} />
      {!s.fardello && <Panel><p className="text-sm text-mist">{T('Prima di scendere devi scegliere il tuo Fardello, al villaggio. I dungeon nascono dalle tue scelte.')}</p></Panel>}
      <div className="grid md:grid-cols-2 gap-4">
        {BIOME_IDS.map(id => {
          const B = BIOMES[id];
          const b = s.biomes[id];
          const unlocked = biomeUnlocked(s, id);
          const lc = biomeLifecycle(s, id);
          const cps = checkpoints(s, id);
          const sel = start[id] || 1;
          return (
            <section key={id} className={`biome-card group relative rounded-2xl overflow-hidden ${unlocked ? '' : 'locked'}`}>
              {BG[id] && <div aria-hidden className="absolute inset-0 bg-cover bg-center biome-bg" style={{ backgroundImage: `url(${BG[id]})` }} />}
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/20" />
              {!unlocked && <div aria-hidden className="absolute inset-0 biome-chains" />}
              <div className="relative p-4 flex flex-col min-h-[300px]">
                <div className="flex items-start justify-between gap-2">
                  <BiomeMedal id={id} />
                  <span className="hamlet-chip text-bone/90">{lc.name}</span>
                </div>
                <div className="mt-auto">
                  <h3 className="font-display text-2xl text-bone drop-shadow-[0_2px_6px_#000]">{biomeName(s, id, B)}</h3>
                  {s.fardello && biomeName(s, id, B) !== B.name && <p className="text-[10px] text-mist">{T('Gli altri lo chiamano «')}{B.name}{T('». Tu lo vedi diversamente.')}</p>}
                  <p className="text-xs text-bone/75 italic mt-1">{B.desc}</p>
                  <p className="text-[11px] text-mist mt-1">{lc.desc}</p>
                  <div className="mt-2">
                    <div className="flex justify-between text-[10px] uppercase tracking-widest text-mist"><span>{T('Profondità')}</span><span className="text-amber-200">{B.depth ? `${b.best}/${B.depth}` : `${b.best} · ∞`}{b.conquered ? ' · 🏆' : ''}</span></div>
                    <div className="h-1.5 rounded-full bg-black/70 overflow-hidden mt-1 border border-stone-800"><div className="h-full bg-gradient-to-r from-red-900 via-ember to-amber-300" style={{ width: `${B.depth ? Math.min(100, (b.best / B.depth) * 100) : Math.min(100, b.best * 2)}%` }} /></div>
                  </div>
                  <div className="text-[11px] text-mist mt-1">{T('Livello consigliato:')}{' '}{B.minLevel}+</div>
                  {b.memory.length > 0 && <div className="text-[11px] text-fate/80 italic mt-1">{T('Ricorda: «')}{b.memory[0]}»</div>}
                  {unlocked ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {cps.length > 1 && (
                        <select value={sel} onChange={e => setStart({ ...start, [id]: +e.target.value })} className="bg-black/70 border border-stone-700 rounded-lg px-2 py-2 text-xs">
                          {cps.map(f => <option key={f} value={f}>{T('Dal piano')}{' '}{f}</option>)}
                        </select>
                      )}
                      <button disabled={!s.fardello || !!s.delve || s.res.provviste < 1} onClick={() => { sfx.door(); act(d => enterDelve(d, id as BiomeId, sel)); }} className="descend-btn flex-1">{iconize(T('Scendi (🍞1)'))}</button>
                      {s.fardello && !s.delve && s.res.provviste < 1 && <AdBtn className="basis-full justify-center" placement="supplies" onReward={() => act(d => adSupplies(d))} label={T('+3 Provviste per scendere')} />}
                      {s.fardello && !s.delve && s.res.provviste < 1 && <p className="basis-full text-[11px] text-amber-300/90 mt-1">{T('Ti serve 1 provvista per scendere: premi «Raccogli» al villaggio o costruisci una Capanna dei Raccoglitori.')}</p>}
                      {s.hero.level < B.minLevel && <span className="basis-full text-[11px] text-dissonance">{T('Sei di livello {n}: pericoloso.', { n: s.hero.level })}</span>}
                    </div>
                  ) : <p className="text-xs text-mist mt-3">{T('🔒 Conquista')}{' '}{BIOMES[B.requires!].name}{' '}{T('per sbloccarlo.')}</p>}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {(s.totals.delves || 0) >= 1 && <DailyPanel state={s} act={act} />}
        <KrakPanel state={s} act={act} />
      </div>

      {isUnlocked(s, 'f_worldboss') && (
        <section className="colossus relative rounded-2xl overflow-hidden">
          <div aria-hidden className="absolute inset-0 colossus-bg" />
          <div className="relative grid sm:grid-cols-[auto_1fr] gap-4 sm:gap-6 items-center p-4 sm:p-6">
            <div className="flex justify-center"><span className="colossus-portrait"><Icon name={artOr('colosso', 'boss')} size={170} /></span></div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.45em] text-red-300/80">{T('Boss Mondiale')}</p>
              <h3 className="font-display text-2xl sm:text-3xl text-red-50 title-beat">{T('Il Colosso di Cenere')}</h3>
              <p className="text-xs text-bone/75 mt-1">{T('Ogni giorno tutti i portatori della valle colpiscono lo stesso Colosso.')}{' '}{w.bearers}{' '}{T('portatori oggi. Più danni infliggi in 10 round, migliori le ricompense.')}</p>
              <div className="mt-3">
                <div className="flex justify-between text-[11px] text-red-100/90 mb-1"><span className="uppercase tracking-widest">{T('Salute condivisa')}</span><span className="font-display">{fmt(bossHp)} / {fmt(w.bossMax)}</span></div>
                <div className="colossus-hp"><div className="h-full colossus-hp-fill" style={{ width: `${(bossHp / Math.max(1, w.bossMax)) * 100}%` }} /></div>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <button className="descend-btn blood" disabled={!s.fardello || !!s.delve || s.world.bossTries >= 3 || s.hero.hp < heroStats(s).maxHp * 0.3} onClick={() => act(d => startWorldBoss(d))}>{T('Affronta il Colosso')}</button>
                <div className="flex items-center gap-1" title={T('Tentativi oggi:')}>{[0, 1, 2].map(i => <span key={i} className={`w-3 h-3 rotate-45 border ${i < 3 - s.world.bossTries ? 'bg-red-500 border-red-300 shadow-[0_0_8px_rgba(239,68,68,.8)]' : 'bg-black border-stone-700'}`} />)}</div>
                {adBossReady(s) && <AdBtn placement="boss_try" disabled={!!s.delve} onReward={() => act(d => adBossTry(d))} label={T('Un tentativo in più')} />}
                <span className="text-xs text-red-100/80">{T('I tuoi danni oggi:')}{' '}<b className="text-amber-200">{fmt(s.world.bossDamage)}</b></span>
              </div>
            </div>
          </div>
        </section>
      )}

      {s.fardello && s.influence >= 8 && (
        <Panel title={T('L\'Ombra del Fardello: {shadowName}', { shadowName: FARDELLI[s.fardello].shadowName })} icon="shadow">
          <Bar value={s.influence} max={40} color="bg-gradient-to-r from-stone-700 to-black" label={<><span>{T('Influenza del Fardello')}</span><span>{Math.floor(s.influence)}/40</span></>} />
          <p className="text-xs text-mist mt-2">{T('Ogni azione coerente nutre il tuo Fardello. Oltre 40, la sua Ombra (la versione estrema della tua scelta) inizia ad apparire nei dungeon come boss opzionale. Sconfiggerla lascia un Frammento e riduce l\'influenza.')}</p>
        </Panel>
      )}
    </div>
  );
}

function DelveRun({ state: s, act }: { state: GameState; act: Act }) {
  const d = s.delve!;
  const B = BIOMES[d.biome];
  const room = d.room;
  const lie = corruptedUI(s);
  const cost = descendCost(s);
  const atBottom = !!B.depth && d.floor >= B.depth;
  const ev = room?.eventId ? findEvent(room.eventId) : undefined;
  const postBoss = room?.type === 'boss' && room.eventId && !room.resolved;
  const st = heroStats(s);
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <section className="delve-head relative rounded-2xl overflow-hidden p-4 sm:p-5">
          {BG[d.biome] && <div aria-hidden className="absolute inset-0 bg-cover bg-center kenburns opacity-60" style={{ backgroundImage: `url(${BG[d.biome]})` }} />}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/85" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <BiomeMedal id={d.biome} />
              <div>
                <h2 className="font-display text-xl sm:text-2xl text-bone">{biomeName(s, d.biome, B)}</h2>
                <p className="text-xs text-mist">{T('Specchio:')} <span className="text-fate">{T(d.emotion)}</span></p>
              </div>
            </div>
            <div className="text-right"><div className="text-[10px] uppercase tracking-[0.4em] text-mist">{T('Piano')}</div><div className="font-display text-4xl text-ember leading-none drop-shadow-[0_0_12px_rgba(196,66,26,.7)]">{d.floor}<span className="text-base text-mist">{B.depth ? ` / ${B.depth}` : ''}</span></div></div>
          </div>
          <div className="relative flex flex-wrap items-center justify-between gap-2 mt-2">
            <div className="flex flex-wrap gap-1">{d.modifiers.map(m => <Tag key={m} className="border-fate/50 text-purple-200"><span title={DUNGEON_MODIFIERS[m].desc}>{DUNGEON_MODIFIERS[m].name}</span></Tag>)}{d.ghostAlly && <Tag className="text-teal-200">{T('👻 Eco alleata')}</Tag>}{d.daily && <Tag className="text-amber-200 border-amber-500/60">{T('🗓️ Sfida del giorno')}</Tag>}{s.krak.level > 0 && <Tag className="text-red-200 border-red-500/60">{T('💀 Krak {n}', { n: s.krak.level })}</Tag>}</div>
          </div>
          <div className="relative mt-2 text-[11px] text-mist">{d.modifiers.map(m => DUNGEON_MODIFIERS[m].desc).join(' · ')}</div>
        </section>

        {/* Porte */}
        {d.floor === 1 && !room && !d.floorCleared && (
          <Tip id="delve" state={s} act={act} title={T('Come si scende')}>
            <p>{rich(T('Ogni piano ti offre delle porte: scegline una. **Spade** = scontro, **?** = evento narrativo, **candela** = santuario per curarti, **forziere** = tesoro.'))}</p>
            <p>{rich(T('Il bottino va nella **Bisaccia** (a destra): è al sicuro solo quando torni in superficie. Ogni piano costa 1 Provvista. Ogni 5 piani c\'è un boss.'))}</p>
          </Tip>
        )}
        {!room && !d.floorCleared && (
          <Panel title={T('Scegli una porta')} icon="porte">
            <div className={`grid gap-3 ${d.doors.length === 1 ? '' : d.doors.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
              {d.doors.map((o, i) => (
                <button key={i} onClick={() => { sfx.door(); act(x => chooseDoor(x, i)); }} className={`door-card ${o.type === 'boss' ? 'boss' : ''}`}>
                  <span aria-hidden className="door-light" />
                  <div className="relative flex justify-center mb-2"><Icon name={lie && o.type !== 'boss' ? 'event' : o.type === 'puzzle' ? artOr('puzzle', '🕯️') : o.type} size={84} /></div>
                  <div className="text-sm text-bone">{lie && o.type !== 'boss' ? '???' : ROOM_NAMES[o.type]}</div>
                  <div className="text-[11px] text-mist italic mt-1">«{o.hint}»</div>
                </button>
              ))}
            </div>
            {lie && <p className="text-[11px] text-fate mt-2">{T('La corruzione confonde i segni. Purifica l\'interfaccia all\'Altare per leggerli di nuovo.')}</p>}
          </Panel>
        )}

        {/* Stanza */}
        {room && (
          <Panel title={ev && !postBoss ? ev.title : ROOM_NAMES[room.type]} icon={ev && !postBoss ? pick('evento_', ev.id, ev.icon) : room.type === 'puzzle' ? artOr('puzzle', '🕯️') : room.type}>
            {room.text && <p className="text-sm text-bone/85 mb-3 whitespace-pre-line">{room.text}</p>}
            {room.type === 'event' && ev && !room.resolved && (
              <>
                <p className="text-sm text-bone/85 italic mb-3">{fillText(s, ev.text)}</p>
                <div className="space-y-2">
                  {ev.choices.map((c, i) => {
                    const av = choiceAvailable(s, c);
                    if (c.req?.fullscreen && !s.fullscreen) return <div key={i} className="text-[11px] text-mist/50 italic border border-dashed border-stone-800 rounded p-2">{T('… qualcosa sussurra ai margini. (Solo nel Rito: schermo intero)')}</div>;
                    return <Btn key={i} className="w-full text-left" disabled={!av.ok} onClick={() => act(x => chooseDelveEvent(x, i))}>{fillText(s, c.text)}{!av.ok && av.why ? <span className="text-[10px] text-dissonance"> · {av.why}</span> : null}</Btn>;
                  })}
                </div>
              </>
            )}
            {postBoss && ev && (
              <>
                <p className="text-sm text-bone/85 italic mb-3">{fillText(s, ev.text)}</p>
                <div className="space-y-2">{ev.choices.map((c, i) => <Btn key={i} kind="fate" className="w-full text-left" onClick={() => act(x => choosePostBoss(x, i))}>{c.text}</Btn>)}</div>
              </>
            )}
            {room.type === 'puzzle' && room.puzzle && !room.resolved && <PuzzleRoom key={d.floor} state={s} act={act} />}
            {room.type === 'trap' && !room.resolved && (
              <div className="grid sm:grid-cols-3 gap-2">
                <Btn onClick={() => act(x => resolveTrap(x, 'disarm'))}>{T('🛠️ Disinnesca (')}{Math.round(Math.min(90, 35 + st.dodge + st.speed * 2))}%)</Btn>
                <Btn onClick={() => act(x => resolveTrap(x, 'endure'))}>{T('🩹 Attraversa (−10%)')}</Btn>
                <Btn kind="fate" onClick={() => act(x => resolveTrap(x, 'blood'))}>{T('🩸 Offri sangue (sacrificio)')}</Btn>
              </div>
            )}
            {room.type === 'shrine' && !room.resolved && (
              <div className="grid sm:grid-cols-3 gap-2">
                <Btn kind="good" disabled={d.satchel.provviste < 1 && s.res.provviste < 1} onClick={() => act(x => useShrine(x, 'rest'))}>{T('🛏️ Riposa (🍞1, +45%)')}</Btn>
                <Btn kind="fate" onClick={() => act(x => useShrine(x, 'pray'))}>{T('🙏 Prega (+Risonanza)')}</Btn>
                <Btn kind="ghost" onClick={() => act(x => useShrine(x, 'leave'))}>{T('Prosegui')}</Btn>
                <Btn onClick={() => act(x => useShrine(x, 'purify'))}>{T('🕯️ Purificati')}</Btn>
              </div>
            )}
            {room.merchantItems && !room.resolved && (
              <div className="space-y-2">
                {room.merchantItems.map((m, i) => (
                  <div key={m.item.uid} className="flex items-center gap-2">
                    <div className="flex-1"><ItemCard it={m.item} /></div>
                    <Btn small onClick={() => act(x => buyFromGhostMerchant(x, i))}>⚱️{m.price}</Btn>
                  </div>
                ))}
                <Btn kind="ghost" onClick={() => act(x => leaveRoom(x))}>{T('Prosegui')}</Btn>
              </div>
            )}
            {room.bossChoice && (
              <div className="mt-3">
                <p className="text-xs text-ember mb-2">{T('Il boss ha lasciato una scelta: prendine una.')}</p>
                <div className="grid sm:grid-cols-3 gap-2">{room.bossChoice.map((it, i) => <ItemCard key={it.uid} it={it} onClick={() => act(x => chooseBossItem(x, i))} />)}</div>
              </div>
            )}
          </Panel>
        )}

        {d.floorCleared && !postBoss && (
          <Panel title={T('Piano {floor} superato', { floor: d.floor })} icon="✅">
            <div className="flex flex-wrap gap-2">
              {!atBottom && cost.provviste && <Btn kind="ember" disabled={!!room?.bossChoice} onClick={() => { sfx.door(); act(x => descend(x)); }}>{T('⬇️ Scendi al piano')}{' '}{d.floor + 1} (🍞1)</Btn>}
              {!atBottom && !cost.provviste && <AdBtn placement="supplies" disabled={!!room?.bossChoice} onReward={() => act(x => adSupplies(x))} label={T('+3 Provviste per continuare')} />}
              {!atBottom && !cost.provviste && (
                <Btn kind="bad" disabled={!!room?.bossChoice} onClick={() => act(x => descend(x, true))} title={T('Soglia di Ritiro')}>{T('⛓️ Pegna il tuo futuro: −')}{cost.pledge}{' '}{T('salute massima per scendere')}</Btn>
              )}
              <Btn kind="good" disabled={!!room?.bossChoice} onClick={() => { sfx.coin(); act(x => bankAndLeave(x)); }}>{T('⬆️ Torna in superficie e metti al sicuro la bisaccia')}</Btn>
            </div>
            {!cost.provviste && !atBottom && <p className="text-[11px] text-dissonance mt-2">{T('Provviste finite. Puoi pegnorare salute massima futura: se torni vivo ne recuperi metà, se muori il pegno diventa permanente finché Elara non lo scioglie.')}</p>}
            {atBottom && <p className="text-xs text-ember mt-2">{T('Hai raggiunto il fondo di questo strato.')}</p>}
            <p className="text-[11px] text-mist mt-2">{T('Scendere è più ricco e più pericoloso. Se cadi perdi tre quarti della bisaccia.')}</p>
          </Panel>
        )}
      </div>

      {/* Bisaccia */}
      <div className="space-y-4">
        <OmensPanel state={s} />
        <Panel title={T('Bisaccia (non al sicuro)')} icon="bisaccia">
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            {(['cenere', 'ferro', 'legno', 'pietra', 'provviste', 'reliquie'] as const).map(k => (
              <div key={k} className="flex flex-col items-center rounded-lg border border-stone-800 bg-black/40 py-1.5"><Icon name={k} size={30} /><span className="text-bone mt-0.5">{fmt((d.satchel as any)[k] || 0)}</span></div>
            ))}
          </div>
          {d.satchel.fragments.length > 0 && <div className="text-xs mt-2 text-fate">{d.satchel.fragments.map((f, i) => <span key={i} className="mr-2">{FRAGMENTS[f].icon} {FRAGMENTS[f].name}</span>)}</div>}
          <div className="mt-2 space-y-1">{d.satchel.items.map(it => <div key={it.uid} className={`text-xs ${RARITY_COLORS[it.rarity]}`}>• {it.name}</div>)}</div>
          {d.pledged > 0 && <p className="text-[11px] text-dissonance mt-2">{T('⛓️ Pegnorati in questa discesa:')}{' '}{d.pledged}</p>}
          <div className="mt-3 text-[11px] text-mist">{T('Provviste al villaggio: {p} · Pozioni: {n}', { p: Math.floor(s.res.provviste), n: s.potions })}</div>
          <Btn small className="mt-2" disabled={s.potions < 1 || s.hero.hp >= st.maxHp} onClick={() => act(x => { x.potions--; x.hero.hp = Math.min(st.maxHp, x.hero.hp + st.maxHp * 0.4); })}>{T('🧪 Bevi una pozione')}</Btn>
        </Panel>
        <Panel title={T('Gruppo')} icon="compagni">
          <Bar value={s.hero.hp} max={st.maxHp} color="bg-red-600" label={<><span>{s.playerName}</span><span>{Math.round(s.hero.hp)}/{st.maxHp}</span></>} />
          {s.companions.filter(c => c.inParty && c.recruited && !c.left && !c.mission).map(c => (
            <Bar key={c.id} className="mt-2" value={c.hp} max={1} color="bg-red-800" label={<><span>{c.icon} {c.name} · {T('fiducia {n}', { n: Math.round(c.trust) })}</span><span>{Math.round(c.hp * 100)}%</span></>} />
          ))}
        </Panel>
      </div>
    </div>
  );
}

export default function Delve(props: { state: GameState; act: Act }) {
  return props.state.delve ? <DelveRun {...props} /> : <BiomeSelect {...props} />;
}
