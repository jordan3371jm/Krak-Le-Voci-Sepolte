import { t as T } from '../i18n';
import { BG } from './art';
import { useState } from 'react';
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
import { Bar, Btn, ItemCard, Panel, Tag, rich } from './ui';
import { Icon, Sigil } from './icons';
import { Tip } from './Guide';
import { isUnlocked } from '../game/engine/onboarding';

function BiomeSelect({ state: s, act }: { state: GameState; act: Act }) {
  const [start, setStart] = useState<Record<string, number>>({});
  const w = sharedWorld(todayKey(), s);
  const bossHp = Math.max(0, w.bossMax - w.bossOthers - s.world.bossDamage);
  return (
    <div className="space-y-4">
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
            <section key={id} className={`panel rounded-xl p-4 bg-gradient-to-br ${B.bg} ${unlocked ? '' : 'opacity-50'} bg-cover bg-center`} style={BG[id] ? { backgroundImage: `linear-gradient(to bottom, rgba(8,6,10,.72), rgba(8,6,10,.93)), url(${BG[id]})` } : undefined}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg text-bone flex items-center gap-2"><Sigil emoji={B.icon} size={36} tone="violet" /> {biomeName(s, id, B)}</h3>
                  {s.fardello && biomeName(s, id, B) !== B.name && <p className="text-[10px] text-mist">{T('Gli altri lo chiamano «')}{B.name}{T('». Tu lo vedi diversamente.')}</p>}
                  <p className="text-xs text-bone/70 italic mt-1">{B.desc}</p>
                </div>
                <Tag className="shrink-0" >{lc.icon} {lc.name}</Tag>
              </div>
              <div className="text-xs text-mist mt-2 space-y-0.5">
                <div>{lc.desc}</div>
                <div>{T('Livello consigliato:')}{' '}{B.minLevel}+ · Record: piano {b.best}{B.depth ? `/${B.depth}` : ' (infinito)'} {b.conquered ? T('· 🏆 Conquistato') : ''}</div>
                {b.memory.length > 0 && <div className="text-fate/80">{T('Ricorda: «')}{b.memory[0]}»</div>}
              </div>
              {unlocked ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {cps.length > 1 && (
                    <select value={sel} onChange={e => setStart({ ...start, [id]: +e.target.value })} className="bg-black/60 border border-stone-700 rounded px-2 py-1 text-xs">
                      {cps.map(f => <option key={f} value={f}>{T('Dal piano')}{' '}{f}</option>)}
                    </select>
                  )}
                  <Btn kind="ember" disabled={!s.fardello || !!s.delve || s.res.provviste < 1} onClick={() => { sfx.door(); act(d => enterDelve(d, id as BiomeId, sel)); }}>{T('Scendi (🍞1)')}</Btn>
                  {s.fardello && !s.delve && s.res.provviste < 1 && <p className="basis-full text-[11px] text-amber-300/90 mt-1">{T('Ti serve 1 provvista per scendere: premi «Raccogli» al villaggio o costruisci una Capanna dei Raccoglitori.')}</p>}
                  {s.hero.level < B.minLevel && <span className="text-[11px] text-dissonance">{T('Sei di livello')}{' '}{s.hero.level}: pericoloso.</span>}
                </div>
              ) : <p className="text-xs text-mist mt-3">{T('🔒 Conquista')}{' '}{BIOMES[B.requires!].name}{' '}{T('per sbloccarlo.')}</p>}
            </section>
          );
        })}
      </div>

      {isUnlocked(s, 'f_worldboss') && <Panel title={T('Boss Mondiale: il Colosso di Cenere')} icon="boss" right={<span className="text-xs text-mist">{T('Tentativi oggi:')}{' '}{s.world.bossTries}/3</span>}>
        <p className="text-xs text-bone/70 mb-2">{T('Ogni giorno tutti i portatori della valle colpiscono lo stesso Colosso.')}{' '}{w.bearers}{' '}{T('portatori oggi. Più danni infliggi in 10 round, migliori le ricompense.')}</p>
        <Bar value={bossHp} max={w.bossMax} color="bg-gradient-to-r from-orange-700 to-red-600" label={<><span>{T('Salute condivisa')}</span><span>{fmt(bossHp)} / {fmt(w.bossMax)}</span></>} />
        <div className="flex items-center gap-3 mt-2">
          <Btn kind="bad" disabled={!s.fardello || !!s.delve || s.world.bossTries >= 3 || s.hero.hp < heroStats(s).maxHp * 0.3} onClick={() => act(d => startWorldBoss(d))}>{T('Affronta il Colosso')}</Btn>
          <span className="text-xs text-mist">{T('I tuoi danni oggi:')}{' '}{fmt(s.world.bossDamage)}</span>
        </div>
      </Panel>}

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
        <section className={`panel rounded-xl p-4 bg-gradient-to-br ${B.bg}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg text-bone flex items-center gap-2"><Sigil emoji={B.icon} size={34} tone="violet" /> {biomeName(s, d.biome, B)}</h2>
              <p className="text-xs text-mist">{T('Piano')}{' '}<b className="text-ember text-base">{d.floor}</b>{B.depth ? ` / ${B.depth}` : ''} · {T('Specchio:')} <span className="text-fate">{T(d.emotion)}</span> · {valleyFx(s).icon}</p>
            </div>
            <div className="flex flex-wrap gap-1">{d.modifiers.map(m => <Tag key={m} className="border-fate/50 text-purple-200"><span title={DUNGEON_MODIFIERS[m].desc}>{DUNGEON_MODIFIERS[m].name}</span></Tag>)}{d.ghostAlly && <Tag className="text-teal-200">{T('👻 Eco alleata')}</Tag>}</div>
          </div>
          <div className="mt-2 text-[11px] text-mist">{d.modifiers.map(m => DUNGEON_MODIFIERS[m].desc).join(' · ')}</div>
        </section>

        {/* Porte */}
        {d.floor === 1 && !room && !d.floorCleared && (
          <Tip id="delve" state={s} act={act} title={T('Come si scende')}>
            <p>{rich(T('Ogni piano ti offre delle porte: scegline una. **Spade** = scontro, **?** = evento narrativo, **candela** = santuario per curarti, **forziere** = tesoro.'))}</p>
            <p>{rich(T('Il bottino va nella **Bisaccia** (a destra): è al sicuro solo quando torni in superficie. Ogni piano costa 1 Provvista. Ogni 5 piani c\'è un boss.'))}</p>
          </Tip>
        )}
        {!room && !d.floorCleared && (
          <Panel title={T('Scegli una porta')} icon="🚪">
            <div className={`grid gap-3 ${d.doors.length === 1 ? '' : d.doors.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
              {d.doors.map((o, i) => (
                <button key={i} onClick={() => { sfx.door(); act(x => chooseDoor(x, i)); }} className="rounded-xl border border-stone-700 hover:border-ember bg-black/50 p-4 text-center transition hover:-translate-y-0.5">
                  <div className="flex justify-center mb-2"><Icon name={lie && o.type !== 'boss' ? 'event' : o.type} size={64} /></div>
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
          <Panel title={ev && !postBoss ? ev.title : ROOM_NAMES[room.type]} icon={ev && !postBoss ? ev.icon : room.type}>
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
            {room.type === 'trap' && !room.resolved && (
              <div className="grid sm:grid-cols-3 gap-2">
                <Btn onClick={() => act(x => resolveTrap(x, 'disarm'))}>{T('🛠️ Disinnesca (')}{Math.round(Math.min(90, 35 + st.dodge + st.speed * 2))}%)</Btn>
                <Btn onClick={() => act(x => resolveTrap(x, 'endure'))}>{T('🩹 Attraversa (−10%)')}</Btn>
                <Btn kind="fate" onClick={() => act(x => resolveTrap(x, 'blood'))}>{T('🩸 Offri sangue (sacrificio)')}</Btn>
              </div>
            )}
            {room.type === 'shrine' && !room.resolved && (
              <div className="grid sm:grid-cols-3 gap-2">
                <Btn kind="good" onClick={() => act(x => useShrine(x, 'rest'))}>{T('🛏️ Riposa (🍞1, +45%)')}</Btn>
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
        <Panel title={T('Bisaccia (non al sicuro)')} icon="🎒">
          <div className="grid grid-cols-2 gap-1 text-xs">
            <span>⚱️ {fmt(d.satchel.cenere)}</span><span>⛓️ {fmt(d.satchel.ferro)}</span>
            <span>🪵 {fmt(d.satchel.legno)}</span><span>🪨 {fmt(d.satchel.pietra)}</span>
            <span>🍞 {d.satchel.provviste}</span><span>🏺 {d.satchel.reliquie}</span>
          </div>
          {d.satchel.fragments.length > 0 && <div className="text-xs mt-2 text-fate">{d.satchel.fragments.map((f, i) => <span key={i} className="mr-2">{FRAGMENTS[f].icon} {FRAGMENTS[f].name}</span>)}</div>}
          <div className="mt-2 space-y-1">{d.satchel.items.map(it => <div key={it.uid} className={`text-xs ${RARITY_COLORS[it.rarity]}`}>• {it.name}</div>)}</div>
          {d.pledged > 0 && <p className="text-[11px] text-dissonance mt-2">{T('⛓️ Pegnorati in questa discesa:')}{' '}{d.pledged}</p>}
          <div className="mt-3 text-[11px] text-mist">{T('Provviste al villaggio: {p} · Pozioni: {n}', { p: Math.floor(s.res.provviste), n: s.potions })}</div>
          <Btn small className="mt-2" disabled={s.potions < 1 || s.hero.hp >= st.maxHp} onClick={() => act(x => { x.potions--; x.hero.hp = Math.min(st.maxHp, x.hero.hp + st.maxHp * 0.4); })}>{T('🧪 Bevi una pozione')}</Btn>
        </Panel>
        <Panel title={T('Gruppo')} icon="👥">
          <Bar value={s.hero.hp} max={st.maxHp} color="bg-red-600" label={<><span>{s.playerName}</span><span>{Math.round(s.hero.hp)}/{st.maxHp}</span></>} />
          {s.companions.filter(c => c.inParty && c.recruited && !c.left && !c.mission).map(c => (
            <Bar key={c.id} className="mt-2" value={c.hp} max={1} color="bg-red-800" label={<><span>{c.icon} {c.name} · fiducia {Math.round(c.trust)}</span><span>{Math.round(c.hp * 100)}%</span></>} />
          ))}
        </Panel>
      </div>
    </div>
  );
}

export default function Delve(props: { state: GameState; act: Act }) {
  return props.state.delve ? <DelveRun {...props} /> : <BiomeSelect {...props} />;
}
