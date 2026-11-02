import { useEffect, useRef, useState } from 'react';
import type { FactionId, FardelloId, GameState, ResKey } from '../game/types';
import type { Act } from '../game/useGame';
import { FACTIONS, FARDELLI } from '../game/data/core';
import { BUILDINGS, FISH, RES_INFO } from '../game/data/world';
import { canAfford, displayName, fmt, fmtTime, hasFlag, repState } from '../game/engine/state';
import {
  availableUpgrades, baitMax, build, buildingCost, buildingUnlocked, buyAllUpgrades, buyUpgrade, catchFish, chooseFardello, clickCart, clickDeer,
  clickValue, completeRequest, gather, hasGoldenRod, hitThreat, playBard, productionPerSec, totalBuildings, useBait,
} from '../game/engine/village';
import { activateElixir, brewElixir, brewPotion, ELIXIRS, potionCost } from '../game/engine/hero';
import { cureAberration, curePledge, pledgeCureCost, purifyUI, restoreName } from '../game/engine/meta';
import { heartbeat, sfx } from '../game/audio';
import { Bar, Btn, Cost, Panel, Tag } from './ui';

// ------------------------------------------------------------
// La Notte del Portale: la prima scelta morale (crea il Fardello)
// ------------------------------------------------------------
const NIGHT: { f: FardelloId; npc: string; icon: string; who: string; text: string; choice: string; hint: string }[] = [
  { f: 'sacrificio', npc: 'Kael', icon: '🧔', who: 'Kael, spadaccino', text: '"Il portale si allarga! Tomas, mio fratello, è il più vicino al sigillo. Se qualcuno lo spinge dentro, il portale si chiude con lui."', choice: 'Sigillare il portale sacrificando Tomas', hint: 'Segnato dal Sacrificio · pesante, potente' },
  { f: 'sangue', npc: 'Vesper', icon: '🕯️', who: 'Vesper, emissario del Culto', text: '"Il bambino di Elara muore avvelenato. Il Culto ha l\'antidoto. Il prezzo? Quel profugo, Ilyas. Consegnacelo."', choice: 'Consegnare Ilyas al Culto per salvare il bambino', hint: 'Debito di Sangue · rubavita, attacco' },
  { f: 'silenzio', npc: 'Marcus', icon: '⚔️', who: 'Marcus, capitano della Capitale', text: '"Resta indietro, civile. Qui decidiamo noi." Intorno a te la valle brucia. Puoi solo guardare, e ricordare ogni volto.', choice: 'Non intervenire. Guardare. Ricordare.', hint: 'Testimone Silenzioso · leggero, veloce' },
];

function PortalNight({ act }: { act: Act }) {
  const [sel, setSel] = useState<number | null>(null);
  useEffect(() => { heartbeat(true); return () => heartbeat(false); }, []);
  return (
    <Panel title="La Notte del Portale" icon="🌀" className="border-blood/50">
      <p className="text-sm text-bone/80 italic mb-4">Hondovalle brucia. Un portale di carne e metallo si apre sopra il pozzo. Tre voci ti chiamano nello stesso istante. Puoi rispondere a una sola.</p>
      <div className="grid md:grid-cols-3 gap-3">
        {NIGHT.map((n, i) => (
          <button key={n.f} onClick={() => { sfx.click(); setSel(i); }} className={`text-left rounded-xl border p-3 transition ${sel === i ? 'border-ember bg-ember/10' : 'border-stone-700 hover:border-ember/50'}`}>
            <div className="flex items-center gap-2 mb-2"><span className="text-2xl">{n.icon}</span><span className="text-xs text-mist">{n.who}</span></div>
            <p className="text-sm text-bone/85 mb-3">{n.text}</p>
            <p className="text-sm font-semibold text-ember">{n.choice}</p>
            <p className="text-[11px] text-mist mt-1">{FARDELLI[n.f].icon} {n.hint}</p>
          </button>
        ))}
      </div>
      {sel !== null && (
        <div className="mt-4 text-center animate-rise">
          <p className="text-xs text-mist mb-2">{FARDELLI[NIGHT[sel].f].origin} Non potrai tornare indietro.</p>
          <Btn kind="ember" onClick={() => { sfx.chain(); act(d => {
            chooseFardello(d, NIGHT[sel].f);
            d.modal = { kind: 'info', title: `${FARDELLI[NIGHT[sel].f].icon} ${FARDELLI[NIGHT[sel].f].name}`, text: `${FARDELLI[NIGHT[sel].f].description}\n\nOgni azione coerente con il tuo Fardello caricherà la Risonanza; ogni azione contraria accumulerà Dissonanza. Il mondo ricorderà.\n\nPer vivere il Rito: attiva l'audio e lo schermo intero (⛶). Alcune verità si sentono solo così.` };
          }); }}>Scegli. E porta il peso.</Btn>
        </div>
      )}
    </Panel>
  );
}

// ------------------------------------------------------------
// PNG che ricordano
// ------------------------------------------------------------
const NPCS: { id: string; name: string; icon: string; faction: FactionId }[] = [
  { id: 'elara', name: 'Elara', icon: '🌿', faction: 'guaritori' },
  { id: 'marcus', name: 'Marcus', icon: '⚔️', faction: 'capitale' },
  { id: 'vesper', name: 'Vesper', icon: '🕯️', faction: 'culto' },
];
function npcLine(s: GameState, id: string): string {
  const n = displayName(s);
  const st = repState(s, NPCS.find(x => x.id === id)!.faction);
  if (s.aberration && id !== 'vesper') return id === 'elara' ? '"Cosa… cosa ti sei fatto? Posso ancora curarti, se me lo permetti."' : '"Stai lontano dalla piazza, mostro. La gente ha paura."';
  if (s.nameCorrupted) return '"…Come ti chiamavi? Ce l\'ho sulla punta della lingua."';
  if (id === 'elara') {
    if (hasFlag(s, 'child_fed')) return `"${n}, il bambino ha chiesto di te oggi. Ha detto il tuo nome per la prima volta."`;
    return ({ Adorato: `"${n}, la mia casa è la tua."`, Fidato: `"Siediti, ${n}. Ti cambio le bende."`, Tollerato: `"${n}. Hai bisogno di cure, o di perdono?"`, Ignorato: '"Un altro portatore. Spero tu sia diverso dagli altri."', Temuto: `"Non… non farmi del male, ${n}."`, Bandito: '"Fuori dalla mia infermeria."', Marchiato: '"Hai il marchio del Culto addosso. Vattene."' } as Record<string, string>)[st];
  }
  if (id === 'marcus') {
    if (hasFlag(s, 'burned_edict')) return '"Hai bruciato l\'editto della Capitale. Lo ricorderò, portatore."';
    return ({ Adorato: `"Portatore ${n}! La Capitale ha bisogno di uomini come te."`, Fidato: `"${n}. Un rapporto, prego."`, Tollerato: '"Muoviti. Ho una guarnigione da sfamare."', Ignorato: '"Chi sei? Non mi interessa. Circola."', Temuto: '"…Prego, passa pure."', Bandito: '"Un altro passo e ti faccio arrestare."', Marchiato: '"Ricercato. Vivo o morto."' } as Record<string, string>)[st];
  }
  if (s.fardello === 'sangue') return `"Fratello ${n}. Il Culto non dimentica chi gli ha dato un figlio."`;
  return ({ Adorato: `"${n}, la Fonte ti attende."`, Fidato: '"Il Culto ti osserva con favore."', Tollerato: '"Ogni potere ha un prezzo. Sempre."', Ignorato: '"La valle muore. Solo il Culto può salvarla… o distruggerla."', Temuto: '"Anche il Culto sa riconoscere un predatore."', Bandito: '"Eretico."', Marchiato: '"Il tuo sangue sarà nostro."' } as Record<string, string>)[st];
}

// ------------------------------------------------------------
// Stagno delle Voci
// ------------------------------------------------------------
function Pond({ state: s, act }: { state: GameState; act: Act }) {
  const [phase, setPhase] = useState<'idle' | 'wait' | 'bite'>('idle');
  const [msg, setMsg] = useState('Tocca lo stagno per lanciare la lenza.');
  const biteAt = useRef(0);
  const timer = useRef<number | null>(null);
  const windowMs = hasGoldenRod(s) ? 1300 : 900;
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  const cast = () => {
    if (phase === 'wait') { if (timer.current) window.clearTimeout(timer.current); setPhase('idle'); setMsg('Troppo presto! L\'esca è persa.'); return; }
    if (phase === 'bite') {
      const react = Date.now() - biteAt.current;
      if (timer.current) window.clearTimeout(timer.current);
      const q = Math.max(0, 1 - react / windowMs);
      act(d => { catchFish(d, q); });
      sfx.fish();
      setPhase('idle');
      setMsg(q > 0.7 ? 'Presa perfetta! Una memoria emerge dall\'acqua.' : 'Una memoria emerge dall\'acqua.');
      return;
    }
    if (s.bait <= 0) { setMsg('Niente esche. Torneranno col tempo.'); return; }
    act(d => { useBait(d); });
    setPhase('wait'); setMsg('…la lenza affonda nell\'acqua scura…');
    timer.current = window.setTimeout(() => {
      biteAt.current = Date.now();
      setPhase('bite'); setMsg('ABBOCCA! Tocca ora!'); sfx.fish();
      timer.current = window.setTimeout(() => { setPhase('idle'); setMsg('È scappato…'); }, windowMs);
    }, 1500 + Math.random() * 3500);
  };
  return (
    <Panel title="Lo Stagno delle Voci" icon="🎣" right={<span className="text-xs text-mist">Esche {s.bait}/{baitMax(s)}</span>}>
      <button onClick={cast} className={`w-full h-24 rounded-xl border transition relative overflow-hidden ${phase === 'bite' ? 'border-resonance bg-teal-900/40 animate-shake' : 'border-sky-900 bg-gradient-to-b from-sky-950 to-slate-950'}`}>
        <span className={`text-2xl ${phase === 'wait' ? 'animate-bob inline-block' : ''}`}>{phase === 'bite' ? '💥' : phase === 'wait' ? '🎈' : '🌊'}</span>
        <div className="text-xs text-bone/80 mt-1">{msg}</div>
      </button>
      <p className="text-[11px] text-mist mt-2">Ogni specie è una memoria della valle: +1% produzione per sempre. Memorie: {s.fish.length}/{FISH.length}{hasGoldenRod(s) ? ' · 🏆 Canna d\'oro' : ''}</p>
      <div className="flex flex-wrap gap-1 mt-1">{FISH.map(f => <span key={f.id} title={s.fish.includes(f.id) ? `${f.name}: ${f.lore}` : '???'} className={s.fish.includes(f.id) ? '' : 'opacity-20 grayscale'}>{f.icon}</span>)}</div>
    </Panel>
  );
}

// ------------------------------------------------------------
export default function Village({ state: s, act }: { state: GameState; act: Act }) {
  const prod = productionPerSec(s);
  const now = Date.now();
  const ups = availableUpgrades(s);
  const T = s.events.threat;
  const maxBuilt = Math.max(...BUILDINGS.map(b => s.village.buildings[b.id] || 0), 0);

  return (
    <div className="space-y-4">
      {!s.fardello && <PortalNight act={act} />}

      {/* Scena del villaggio */}
      <section className="panel rounded-xl p-4 relative overflow-hidden min-h-[150px]">
        <div className="absolute inset-0 bg-gradient-to-t from-orange-950/40 via-transparent to-indigo-950/30 pointer-events-none" />
        <div className="relative flex items-start justify-between gap-2 mb-2">
          <div>
            <h2 className="text-xl text-bone">Hondovalle Bassa</h2>
            <p className="text-xs text-mist italic">{totalBuildings(s) === 0 ? 'Solo cenere e un fuoco morente. Ricostruisci.' : totalBuildings(s) < 15 ? 'Il villaggio rinasce, una trave alla volta.' : totalBuildings(s) < 60 ? 'Hondovalle vive di nuovo. I bambini corrono tra le case.' : 'Hondovalle è diventata la capitale della valle.'}</p>
          </div>
          {s.events.buffs.filter(b => b.until > now).map(b => <Tag key={b.id} className="border-fate text-fate">{b.label} · {fmtTime(b.until - now)}</Tag>)}
        </div>
        <div className="relative flex flex-wrap gap-1 text-2xl min-h-[44px] items-end">
          <span title="Fuoco" className="animate-flicker">🔥</span>
          {BUILDINGS.filter(b => s.village.buildings[b.id]).map(b => (
            <span key={b.id} title={`${b.name} ×${s.village.buildings[b.id]}`} className="relative">
              {b.icon}<span className="absolute -bottom-1 -right-1 text-[9px] bg-black/80 rounded px-0.5 text-bone">{s.village.buildings[b.id]}</span>
            </span>
          ))}
          {s.valley.blight > 60 && <span title="Case bruciate">🏚️</span>}
          {s.companions.filter(c => c.recruited && !c.mission && !c.left).map(c => <span key={c.id} className="text-lg" title={c.name}>{c.icon}</span>)}
        </div>
        {/* eventi */}
        <div className="relative flex flex-wrap gap-2 mt-3">
          {s.events.cart > now && <Btn kind="good" onClick={() => { sfx.coin(); act(d => clickCart(d)); }}>🛒 Un mercante è arrivato! ({fmtTime(s.events.cart - now)})</Btn>}
          {s.events.deer > now && <button onClick={() => { sfx.resonance(); act(d => clickDeer(d)); }} className="text-3xl animate-bob" title="Il Cervo di Cenere!">🦌✨</button>}
          {T && (
            <div className="w-full rounded-lg border border-dissonance/60 bg-red-950/40 p-2">
              <div className="flex items-center justify-between text-sm mb-1"><span>{T.icon} Incursione: {T.name}</span><span className="text-xs text-mist">{fmtTime(T.until - now)}</span></div>
              <Bar value={T.hp} max={T.maxHp} color="bg-dissonance" />
              <Btn kind="bad" className="mt-2 w-full" onClick={() => { sfx.hit(); act(d => hitThreat(d)); }}>⚔️ Colpisci! {s.village.buildings.torre ? `(le ${s.village.buildings.torre} torri aiutano)` : ''}</Btn>
            </div>
          )}
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Raccolta & PNG */}
        <div className="space-y-4">
          <Panel title="Raccolta" icon="✋">
            <div className="grid grid-cols-3 gap-2">
              {(['legno', 'pietra', 'provviste'] as ResKey[]).map(k => (
                <button key={k} onClick={() => { sfx.gather(); act(d => gather(d, k)); }} className="rounded-xl border border-stone-700 hover:border-ember bg-black/40 py-3 active:scale-95 transition">
                  <div className="text-2xl">{RES_INFO[k].icon}</div>
                  <div className="text-xs text-bone">{k === 'legno' ? 'Taglia' : k === 'pietra' ? 'Scava' : 'Raccogli'}</div>
                  <div className="text-[10px] text-mist">+{fmt(clickValue(s, k))}</div>
                </button>
              ))}
            </div>
            <Btn className="w-full mt-2" kind="fate" disabled={now < s.events.bardReadyAt} onClick={() => act(d => playBard(d))}>
              🎻 {now < s.events.bardReadyAt ? `Il cantastorie torna tra ${fmtTime(s.events.bardReadyAt - now)}` : 'Ascolta il cantastorie (produzione ×2)'}
            </Btn>
          </Panel>

          <Panel title="Volti di Hondovalle" icon="👥">
            <div className="space-y-2">
              {NPCS.map(n => (
                <button key={n.id} onClick={() => sfx.leitmotif(FACTIONS[n.faction].leitmotif)} className="w-full text-left flex gap-2 items-start rounded-lg p-2 hover:bg-white/5">
                  <span className="text-2xl">{n.icon}</span>
                  <div>
                    <div className="text-sm text-bone">{n.name} <span className="text-[10px] text-mist">· {FACTIONS[n.faction].name} · {repState(s, n.faction)}</span></div>
                    <p className="text-xs text-bone/70 italic">{npcLine(s, n.id)}</p>
                  </div>
                </button>
              ))}
            </div>
          </Panel>

          <Pond state={s} act={act} />
        </div>

        {/* Edifici */}
        <div className="space-y-4">
          <Panel title="Edifici" icon="🏗️" right={<span className="text-[10px] text-mist">ogni edificio costa +15%</span>}>
            <div className="space-y-2">
              {BUILDINGS.map(b => {
                const n = s.village.buildings[b.id] || 0;
                const unlocked = buildingUnlocked(s, b.id);
                if (!unlocked && (maxBuilt === 0 || BUILDINGS.filter(x => !buildingUnlocked(s, x.id)).indexOf(b) > 1)) return null;
                const cost = buildingCost(s, b.id);
                const maxed = b.max && n >= b.max;
                if (!unlocked) return <div key={b.id} className="text-xs text-mist/60 border border-dashed border-stone-800 rounded-lg p-2">??? · costruisci {b.unlock!.count} {BUILDINGS.find(x => x.id === b.unlock!.building)?.name}</div>;
                return (
                  <button key={b.id} disabled={!!maxed || !canAfford(s, cost)} onClick={() => { sfx.build(); act(d => build(d, b.id)); }} className="w-full text-left rounded-lg border border-stone-700 hover:border-ember/60 disabled:opacity-50 p-2 flex items-center gap-2">
                    <span className="text-2xl">{b.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-bone flex justify-between"><span>{b.name}</span><span className="text-ember">{n}{b.max ? `/${b.max}` : ''}</span></div>
                      <div className="text-[10px] text-mist truncate">{b.desc} {Object.entries(b.prod).map(([k, v]) => `+${fmt((v || 0) * Math.pow(2, s.village.upgrades.filter(u => u.startsWith(b.id + '_')).length))} ${RES_INFO[k as ResKey].icon}/s`).join(' ')}</div>
                      {!maxed && <Cost cost={cost} have={s.res} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>
          {ups.length > 0 && (
            <Panel title="Miglioramenti" icon="⚙️" right={<Btn small onClick={() => act(d => buyAllUpgrades(d))}>Compra tutti</Btn>}>
              <div className="space-y-1">
                {ups.slice(0, 6).map(u => {
                  const b = BUILDINGS.find(x => x.id === u.building)!;
                  return (
                    <button key={u.id} disabled={!canAfford(s, u.cost)} onClick={() => act(d => buyUpgrade(d, u.id))} className="w-full text-left text-xs rounded border border-stone-700 p-2 disabled:opacity-50 hover:border-ember">
                      {b.icon} {b.name} ({u.threshold}): produzione ×2 · <Cost cost={u.cost} have={s.res} />
                    </button>
                  );
                })}
              </div>
            </Panel>
          )}
          <Panel title="Produzione" icon="📈">
            <div className="grid grid-cols-2 gap-1 text-xs">
              {(Object.keys(prod) as ResKey[]).map(k => <div key={k} className={RES_INFO[k].color}>{RES_INFO[k].icon} {RES_INFO[k].name}: +{fmt(prod[k] * 60)}/min</div>)}
            </div>
          </Panel>
        </div>

        {/* Servizi */}
        <div className="space-y-4">
          <Panel title="Richieste delle Fazioni" icon="📜">
            {s.requests.length === 0 && <p className="text-xs text-mist italic">{totalBuildings(s) < 4 ? 'Le fazioni ti noteranno quando il villaggio avrà 4 edifici.' : 'Nessuna richiesta, per ora. Ne arriveranno altre.'}</p>}
            <div className="space-y-2">
              {s.requests.map(r => (
                <div key={r.uid} className="rounded-lg border border-stone-700 p-2 text-xs">
                  <div className="flex justify-between"><span className="text-bone">{FACTIONS[r.faction].icon} {FACTIONS[r.faction].name}</span><span className="text-mist">{fmtTime(r.until - now)}</span></div>
                  <p className="text-bone/70 italic my-1">{r.text}</p>
                  <div className="flex items-center justify-between gap-2">
                    <span>Chiede: <Cost cost={r.need} have={s.res} /></span>
                    <Btn small kind="good" disabled={!canAfford(s, r.need)} onClick={() => act(d => completeRequest(d, r.uid))}>Consegna</Btn>
                  </div>
                  <div className="text-[10px] text-mist mt-1">Ricompensa: ⚱️{r.reward.cenere} · reputazione +{r.reward.rep} (−{Math.round(r.reward.rep * 0.4)} {FACTIONS[FACTIONS[r.faction].opposite].name}){r.reward.reliquie ? ' · 🏺1' : ''}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Infermeria di Elara" icon="🏥">
            {!s.village.buildings.infermeria ? <p className="text-xs text-mist italic">Costruisci l'Infermeria per preparare pozioni ed elisir.</p> : (
              <div className="space-y-2">
                <Btn className="w-full" onClick={() => act(d => brewPotion(d))}>🧪 Prepara pozione ({s.potions}) · <Cost cost={potionCost()} have={s.res} /></Btn>
                {(s.village.buildings.infermeria || 0) >= 2 && Object.entries(ELIXIRS).map(([id, e]) => (
                  <div key={id} className="flex items-center gap-2 text-xs">
                    <Btn small onClick={() => act(d => brewElixir(d, id))}>{e.icon} {e.name} <Cost cost={e.cost} have={s.res} /></Btn>
                    {(s.elixirs[id] || 0) > 0 && <Btn small kind="fate" disabled={!!s.activeElixir} onClick={() => act(d => activateElixir(d, id))}>Bevi ({s.elixirs[id]})</Btn>}
                  </div>
                ))}
                {(s.village.buildings.infermeria || 0) < 2 && <p className="text-[10px] text-mist">Infermeria livello 2: elisir per le spedizioni.</p>}
                {s.activeElixir && <Tag className="border-fate text-fate">Attivo: {ELIXIRS[s.activeElixir].name}</Tag>}
              </div>
            )}
            {s.hero.pledgedMaxHp > 0 && (
              <div className="mt-3 border-t border-stone-800 pt-2 text-xs">
                <p className="text-dissonance">⛓️ Pegno sulla salute futura: -{s.hero.pledgedMaxHp}</p>
                <Btn small className="mt-1" onClick={() => act(d => curePledge(d))}>Rituale di Elara: ⚱️{pledgeCureCost(s).cenere} + 🏺1</Btn>
              </div>
            )}
            {s.aberration && (
              <div className="mt-3 border-t border-stone-800 pt-2 text-xs">
                <p className="text-fate">🦷 Sei un'Aberrazione. Elara conosce un rito per tornare umano, a un prezzo enorme.</p>
                <Btn small className="mt-1" onClick={() => act(d => cureAberration(d))}>Rito: ⚱️3000 + 🏺8</Btn>
              </div>
            )}
          </Panel>

          {(s.village.buildings.altare || 0) > 0 && (
            <Panel title="Altare della Veglia" icon="🕯️">
              <div className="space-y-2 text-xs">
                <Btn className="w-full" small disabled={s.corruption < 60} onClick={() => act(d => purifyUI(d))}>Purifica l'interfaccia (🔮2) {s.corruption < 60 ? '· la corruzione è bassa' : ''}</Btn>
                {s.nameCorrupted && <Btn className="w-full" small kind="fate" onClick={() => act(d => restoreName(d))}>Pronuncia il tuo vero nome (🏺3)</Btn>}
                <p className="text-mist">Corruzione personale: {Math.round(s.corruption)}%. Oltre il 60% l'interfaccia comincia a mentire.</p>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
