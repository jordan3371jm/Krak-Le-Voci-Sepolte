import { t as T } from '../i18n';
import { Pic } from './Pic';
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
import { Icon, Sigil } from './icons';
import { isUnlocked } from '../game/engine/onboarding';
import { TalkersPanel, Face } from './Talk';
import { BG } from './art';
import { Particles } from './Atmosphere';
import { OmensPanel } from './Delve';
import { TALKERS } from '../game/data/dialogues';
import { recoverSatchel } from '../game/engine/features';
import { adMode, showRewarded } from '../game/platform';

// ------------------------------------------------------------
// La Notte del Portale: la prima scelta morale (crea il Fardello)
// ------------------------------------------------------------
const NIGHT: { f: FardelloId; npc: string; icon: string; who: string; text: string; choice: string; hint: string }[] = [
  { f: 'sacrificio', npc: 'Kael', icon: '🧔', who: T('Kael, spadaccino'), text: T('«Il portale si allarga! Tomas, mio fratello, è il più vicino al sigillo. Se qualcuno lo spinge dentro, il portale si chiude con lui.»'), choice: T('Sigillare il portale sacrificando Tomas'), hint: T('Fardello pesante: colpi potenti, Risonanza proteggendo gli altri') },
  { f: 'sangue', npc: 'Vesper', icon: '🕯️', who: T('Vesper, emissario del Culto'), text: T('«Il bambino di Elara muore avvelenato. Il Culto ha l\'antidoto. Il prezzo? Quel profugo, Ilyas. Consegnacelo.»'), choice: T('Consegnare Ilyas al Culto per salvare il bambino'), hint: T('Fardello pesantissimo: rubavita e attacco, il Culto ti chiama fratello') },
  { f: 'silenzio', npc: 'Marcus', icon: '⚔️', who: T('Marcus, capitano della Capitale'), text: T('«Resta indietro, civile. Qui decidiamo noi.» Intorno a te la valle brucia. Puoi solo guardare, e ricordare ogni volto.'), choice: T('Non intervenire. Guardare. Ricordare.'), hint: T('Fardello leggero: agisci per primo, schivi, vedi ciò che è nascosto') },
];

// Prima schermata di gioco: la Notte del Portale come dialogo.
type PNode = { who?: number; text: string; choices: { text: string; go: string }[] };
function portalTree(): Record<string, PNode> {
  const other = { text: T('Ascoltare un\'altra voce'), go: 'start' };
  return {
    start: { text: T('Hondovalle brucia. Un portale di carne e metallo si apre sopra il pozzo. Tre voci ti chiamano nello stesso istante. Puoi rispondere a una sola. Nessuna è giusta. Tutte verranno ricordate.'), choices: [
      { text: T('Correre da Kael, vicino al sigillo'), go: 'k1' }, { text: T('Avvicinarti a Vesper, tra il fumo'), go: 'v1' }, { text: T('Fermarti davanti a Marcus e ai suoi soldati'), go: 'm1' }] },
    k1: { who: 0, text: NIGHT[0].text, choices: [{ text: T('Perché non lo fai tu?'), go: 'k2' }, { text: T('Non c\'è un altro modo?'), go: 'k3' }, { text: NIGHT[0].choice, go: 'c0' }, other] },
    k2: { who: 0, text: T('«Perché è mio fratello!» Gli trema la voce. «E perché tu non hai nessuno da perdere, qui. Io sì.» Tomas ti guarda. Ha capito. Non scappa.'), choices: [{ text: T('Non c\'è un altro modo?'), go: 'k3' }, { text: NIGHT[0].choice, go: 'c0' }, other] },
    k3: { who: 0, text: T('«Guarda il cielo. Guarda le case.» Il portale ruggisce e una casa intera sparisce dentro la luce. «Ogni respiro che sprechiamo, muore qualcuno.»'), choices: [{ text: T('Perché non lo fai tu?'), go: 'k2' }, { text: NIGHT[0].choice, go: 'c0' }, other] },
    v1: { who: 1, text: NIGHT[1].text, choices: [{ text: T('Perché proprio Ilyas?'), go: 'v2' }, { text: T('Come so che l\'antidoto funziona?'), go: 'v3' }, { text: NIGHT[1].choice, go: 'c1' }, other] },
    v2: { who: 1, text: T('«Perché ha visto cose che il Culto non vuole raccontate. E perché nessuno lo piangerà.» Sorride, lento. «Tranne te, forse. Lo vedo già nei tuoi occhi.»'), choices: [{ text: T('Come so che l\'antidoto funziona?'), go: 'v3' }, { text: NIGHT[1].choice, go: 'c1' }, other] },
    v3: { who: 1, text: T('«Non lo sai.» Ti mette in mano una fiala calda, che pulsa come un cuore. «La fede è questo, fratello. Scegliere senza sapere.» Il bambino di Elara tossisce sangue.'), choices: [{ text: T('Perché proprio Ilyas?'), go: 'v2' }, { text: NIGHT[1].choice, go: 'c1' }, other] },
    m1: { who: 2, text: NIGHT[2].text, choices: [{ text: T('Chi ha appiccato il fuoco?'), go: 'm2' }, { text: T('Posso aiutare?'), go: 'm3' }, { text: NIGHT[2].choice, go: 'c2' }, other] },
    m2: { who: 2, text: T('«Non sono domande per un civile.» Ma i suoi occhi corrono, per un istante, verso una figura incappucciata tra le fiamme. Un occhio cucito di filo nero sul mantello. Ricorderai quel volto.'), choices: [{ text: T('Posso aiutare?'), go: 'm3' }, { text: NIGHT[2].choice, go: 'c2' }, other] },
    m3: { who: 2, text: T('«Puoi restare vivo e tacere. È il miglior aiuto che un civile possa dare.» Dietro di lui, qualcuno grida il tuo nome. Poi smette.'), choices: [{ text: T('Chi ha appiccato il fuoco?'), go: 'm2' }, { text: NIGHT[2].choice, go: 'c2' }, other] },
  };
}

export function PortalScreen({ act }: { act: Act }) {
  const [node, setNode] = useState('start');
  const [seen, setSeen] = useState<string[]>([]);
  useEffect(() => { heartbeat(true); return () => heartbeat(false); }, []);
  const tree = portalTree();
  const commit = node.startsWith('c') ? +node.slice(1) : null;
  const n = commit === null ? tree[node] : null;
  const who = n?.who !== undefined ? NIGHT[n.who] : commit !== null ? NIGHT[commit] : null;
  const go = (g: string) => { sfx.click(); setSeen(x => x.includes(node) ? x : [...x, node]); setNode(g); };
  return (
    <div className="min-h-screen portal-bg flex items-center justify-center px-4 py-10 relative">
      <Particles mode="portal" tint="190,110,255" />
      {BG.copertina && <div aria-hidden className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none kenburns" style={{ backgroundImage: `linear-gradient(rgba(5,4,6,.6), rgba(5,4,6,.95)), url(${BG.copertina})` }} />}
      <div className="max-w-2xl w-full relative">
        <div className="flex flex-col items-center text-center mb-6">
          <p className="text-[10px] uppercase tracking-[0.4em] text-amber-300/80">{T('Prologo')}</p>
          <h1 className="text-3xl sm:text-4xl text-gradient-ember title-beat">{T('La Notte del Portale')}</h1>
        </div>
        <div key={node} className="panel rounded-2xl p-5 sm:p-6 animate-rise">
          <div className="flex flex-col items-center text-center gap-2 mb-4">
            {who ? <Face id={who.npc.toLowerCase()} emoji={who.icon} size={120} tone={who.f === 'silenzio' ? 'violet' : 'blood'} />
              : <div className="unlock-glow"><Icon name="portale" size={110} /></div>}
            {who && <span className="font-display text-bone">{who.who}</span>}
          </div>
          {n && <>
            <p className={`text-[15px] leading-relaxed ${who ? 'text-bone/90' : 'text-bone/80 italic text-center'}`}>{n.text}</p>
            <div className="mt-5 space-y-1.5">
              {n.choices.map((c, i) => {
                const isCommit = c.go.startsWith('c');
                const visited = seen.includes(c.go);
                return (
                  <button key={i} onClick={() => go(c.go)} className={`w-full text-left rounded-lg border px-3 py-2 text-sm flex gap-2 items-center transition ${isCommit ? 'border-amber-600/70 text-amber-200 hover:bg-amber-900/20' : 'border-stone-700 text-bone hover:border-ember/70 hover:bg-white/5'} ${visited && !isCommit ? 'opacity-60' : ''}`}>
                    <span className="text-ember">{i + 1}.</span>
                    {isCommit && <Icon name={NIGHT[+c.go.slice(1)].f} size={30} />}
                    <span className="flex-1">{c.text}</span>
                  </button>
                );
              })}
            </div>
          </>}
          {commit !== null && (() => { const N = NIGHT[commit]; const F = FARDELLI[N.f]; return (
            <div className="text-center">
              <p className="text-amber-200 font-semibold">{N.choice}</p>
              <div className="flex items-center justify-center gap-3 my-4"><Icon name={N.f} size={72} /><div className="text-left"><p className="text-[10px] uppercase tracking-widest text-mist">{T('Fardello')}</p><p className="text-bone font-display">{F.name}</p><p className="text-[11px] text-mist">{N.hint}</p></div></div>
              <p className="text-xs text-mist mb-4 max-w-md mx-auto">{F.origin}{' '}{T('Non potrai tornare indietro.')}</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Btn kind="ghost" onClick={() => go(`${'kvm'[commit]}1`)}>{T('Aspetta… non ancora')}</Btn>
                <Btn kind="ember" onClick={() => { sfx.chain(); act(d => {
                  chooseFardello(d, N.f);
                  d.modal = { kind: 'info', title: F.name, text: T('{description}\n\nLe azioni coerenti con il tuo Fardello caricano la Risonanza; quelle contrarie accumulano Dissonanza. Il mondo ricorderà entrambe.\n\nOra ricostruisci Hondovalle. La Guida in alto ti dirà cosa puoi fare, mai cosa scegliere.', { description: F.description }) };
                }); }}>{T('Scegli. E porta il peso.')}</Btn>
              </div>
            </div>
          ); })()}
        </div>
      </div>
    </div>
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
  if (s.aberration && id !== 'vesper') return id === 'elara' ? T('"Cosa… cosa ti sei fatto? Posso ancora curarti, se me lo permetti."') : T('"Stai lontano dalla piazza, mostro. La gente ha paura."');
  if (s.nameCorrupted) return T('"…Come ti chiamavi? Ce l\'ho sulla punta della lingua."');
  if (id === 'elara') {
    if (hasFlag(s, 'child_fed')) return T('"{n}, il bambino ha chiesto di te oggi. Ha detto il tuo nome per la prima volta."', { n: n });
    return ({ Adorato: T('"{n}, la mia casa è la tua."', { n: n }), Fidato: T('"Siediti, {n}. Ti cambio le bende."', { n: n }), Tollerato: T('"{n}. Hai bisogno di cure, o di perdono?"', { n: n }), Ignorato: T('"Un altro portatore. Spero tu sia diverso dagli altri."'), Temuto: T('"Non… non farmi del male, {n}."', { n: n }), Bandito: T('"Fuori dalla mia infermeria."'), Marchiato: T('"Hai il marchio del Culto addosso. Vattene."') } as Record<string, string>)[st];
  }
  if (id === 'marcus') {
    if (hasFlag(s, 'burned_edict')) return T('"Hai bruciato l\'editto della Capitale. Lo ricorderò, portatore."');
    return ({ Adorato: T('"Portatore {n}! La Capitale ha bisogno di uomini come te."', { n: n }), Fidato: T('"{n}. Un rapporto, prego."', { n: n }), Tollerato: T('"Muoviti. Ho una guarnigione da sfamare."'), Ignorato: T('"Chi sei? Non mi interessa. Circola."'), Temuto: T('"…Prego, passa pure."'), Bandito: T('"Un altro passo e ti faccio arrestare."'), Marchiato: T('"Ricercato. Vivo o morto."') } as Record<string, string>)[st];
  }
  if (s.fardello === 'sangue') return T('"Fratello {n}. Il Culto non dimentica chi gli ha dato un figlio."', { n: n });
  return ({ Adorato: T('"{n}, la Fonte ti attende."', { n: n }), Fidato: T('"Il Culto ti osserva con favore."'), Tollerato: T('"Ogni potere ha un prezzo. Sempre."'), Ignorato: T('"La valle muore. Solo il Culto può salvarla… o distruggerla."'), Temuto: T('"Anche il Culto sa riconoscere un predatore."'), Bandito: '"Eretico."', Marchiato: T('"Il tuo sangue sarà nostro."') } as Record<string, string>)[st];
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
    if (phase === 'wait') { if (timer.current) window.clearTimeout(timer.current); setPhase('idle'); setMsg(T('Troppo presto! L\'esca è persa.')); return; }
    if (phase === 'bite') {
      const react = Date.now() - biteAt.current;
      if (timer.current) window.clearTimeout(timer.current);
      const q = Math.max(0, 1 - react / windowMs);
      act(d => { catchFish(d, q); });
      sfx.fish();
      setPhase('idle');
      setMsg(q > 0.7 ? T('Presa perfetta! Una memoria emerge dall\'acqua.') : T('Una memoria emerge dall\'acqua.'));
      return;
    }
    if (s.bait <= 0) { setMsg(T('Niente esche. Torneranno col tempo.')); return; }
    act(d => { useBait(d); });
    setPhase('wait'); setMsg(T('…la lenza affonda nell\'acqua scura…'));
    timer.current = window.setTimeout(() => {
      biteAt.current = Date.now();
      setPhase('bite'); setMsg(T('ABBOCCA! Tocca ora!')); sfx.fish();
      timer.current = window.setTimeout(() => { setPhase('idle'); setMsg(T('È scappato…')); }, windowMs);
    }, 1500 + Math.random() * 3500);
  };
  return (
    <Panel title={T('Lo Stagno delle Voci')} icon="pesca" right={<span className="text-xs text-mist">{T('Esche')}{' '}{s.bait}/{baitMax(s)}</span>}>
      <button onClick={cast} className={`w-full h-24 rounded-xl border transition relative overflow-hidden ${phase === 'bite' ? 'border-resonance bg-teal-900/40 animate-shake' : 'border-sky-900 bg-gradient-to-b from-sky-950 to-slate-950'}`}>
        <span className={`text-2xl ${phase === 'wait' ? 'animate-bob inline-block' : ''}`}>{phase === 'bite' ? '💥' : phase === 'wait' ? '🎈' : '🌊'}</span>
        <div className="text-xs text-bone/80 mt-1">{msg}</div>
      </button>
      <p className="text-[11px] text-mist mt-2">{T('Ogni specie è una memoria della valle: +1% produzione per sempre. Memorie:')}{' '}{s.fish.length}/{FISH.length}{hasGoldenRod(s) ? T(' · 🏆 Canna d\'oro') : ''}</p>
      <div className="flex flex-wrap gap-1 mt-1">{FISH.map(f => <span key={f.id} title={s.fish.includes(f.id) ? `${f.name}: ${f.lore}` : '???'} className={s.fish.includes(f.id) ? '' : 'opacity-20 grayscale'}>{f.icon}</span>)}</div>
    </Panel>
  );
}

// ------------------------------------------------------------
export default function Village({ state: s, act }: { state: GameState; act: Act }) {
  const prod = productionPerSec(s);
  const now = Date.now();
  const ups = availableUpgrades(s);
  const TH = s.events.threat;
  const maxBuilt = Math.max(...BUILDINGS.map(b => s.village.buildings[b.id] || 0), 0);

  return (
    <div className="space-y-4">
      {s.lastReport && (
        <section className={`tip-card rounded-xl p-4 animate-rise ${s.lastReport.good ? '' : 'border-dissonance/50'}`}>
          <div className="flex items-start gap-3">
            <Icon name={s.lastReport.good ? 'bussola' : 'shadow'} size={46} />
            <div className="flex-1 min-w-0">
              <h3 className="text-base text-amber-100">{s.lastReport.title}</h3>
              <ul className="mt-1 space-y-0.5 text-xs text-bone/85">{s.lastReport.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
              {!!s.lastReport.voices?.length && (
                <div className="mt-3 space-y-2 border-t border-amber-900/40 pt-2">
                  <div className="text-[10px] uppercase tracking-widest text-mist">{T('Hondovalle ne parla')}</div>
                  {s.lastReport.voices.map(v => { const tk = TALKERS.find(x => x.id === v.id); return tk ? (
                    <div key={v.id} className="flex gap-2 items-start animate-rise">
                      <Face id={tk.id} emoji={tk.icon} tone={tk.tone} size={40} />
                      <div className="text-xs"><b className="text-amber-100">{tk.name}</b><p className="italic text-bone/85">«{v.text}»</p></div>
                    </div>) : null; })}
                </div>
              )}
              {s.lostSatchel && (
                <div className="mt-3 rounded-lg border border-dissonance/50 bg-red-950/30 p-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-bone/85 flex-1">{T('La tua bisaccia è rimasta laggiù: {c} cenere e {n} oggetti.', { c: fmt(s.lostSatchel.cenere), n: s.lostSatchel.items.length })}</span>
                  {adMode() === 'none'
                    ? <Btn small kind="ember" disabled={s.res.provviste < 2} onClick={() => act(d => { d.res.provviste -= 2; recoverSatchel(d); })}>{T('🎒 Torna a prenderla (🍞2)')}</Btn>
                    : <Btn small kind="ember" onClick={() => showRewarded('recover_satchel').then(ok => { if (ok) act(d => recoverSatchel(d)); })}>{T('📺 Recuperala (pubblicità)')}</Btn>}
                </div>
              )}
            </div>
            <Btn small kind="ghost" onClick={() => act(d => { d.lastReport = null; })}>✕</Btn>
          </div>
        </section>
      )}

      <OmensPanel state={s} />

      {/* Scena del villaggio */}
      <section className="panel rounded-xl p-4 relative overflow-hidden min-h-[150px]">
        <div className="absolute inset-0 bg-gradient-to-t from-orange-950/40 via-transparent to-indigo-950/30 pointer-events-none" />
        <div className="relative flex items-start justify-between gap-2 mb-2">
          <div>
            <h2 className="text-xl text-bone">{T('Hondovalle Bassa')}</h2>
            <p className="text-xs text-mist italic">{totalBuildings(s) === 0 ? T('Solo cenere e un fuoco morente. Ricostruisci.') : totalBuildings(s) < 15 ? T('Il villaggio rinasce, una trave alla volta.') : totalBuildings(s) < 60 ? T('Hondovalle vive di nuovo. I bambini corrono tra le case.') : T('Hondovalle è diventata la capitale della valle.')}</p>
          </div>
          {s.events.buffs.filter(b => b.until > now).map(b => <Tag key={b.id} className="border-fate text-fate">{b.label} · {fmtTime(b.until - now)}</Tag>)}
        </div>
        <div className="relative flex flex-wrap gap-1 text-2xl min-h-[44px] items-end">
          <span title={T('Il fuoco di Hondovalle')} className="animate-flicker"><Icon name="custode" size={44} /></span>
          {BUILDINGS.filter(b => s.village.buildings[b.id]).map(b => (
            <span key={b.id} title={`${b.name} ×${s.village.buildings[b.id]}`} className="relative">
              <Icon name={b.id} size={44} /><span className="absolute -bottom-1 -right-1 text-[9px] bg-black/85 border border-amber-800 rounded px-1 text-bone">{s.village.buildings[b.id]}</span>
            </span>
          ))}
          {s.valley.blight > 60 && <span title={T('Case bruciate')}>🏚️</span>}
          {s.companions.filter(c => c.recruited && !c.mission && !c.left).map(c => <span key={c.id} title={c.name}><Face id={c.id} emoji={c.icon} size={34} tone="teal" /></span>)}
        </div>
        {/* eventi */}
        <div className="relative flex flex-wrap gap-2 mt-3">
          {s.events.cart > now && <Btn kind="good" onClick={() => { sfx.coin(); act(d => clickCart(d)); }}>{T('🛒 Un mercante è arrivato! (')}{fmtTime(s.events.cart - now)})</Btn>}
          {s.events.deer > now && <button onClick={() => { sfx.resonance(); act(d => clickDeer(d)); }} className="text-3xl animate-bob" title={T('Il Cervo di Cenere!')}>🦌✨</button>}
          {TH && (
            <div className="w-full rounded-lg border border-dissonance/60 bg-red-950/40 p-2">
              <div className="flex items-center justify-between text-sm mb-1"><span>{TH.icon} {T('Incursione: {name}', { name: TH.name })}</span><span className="text-xs text-mist">{fmtTime(TH.until - now)}</span></div>
              <Bar value={TH.hp} max={TH.maxHp} color="bg-dissonance" />
              <Btn kind="bad" className="mt-2 w-full" onClick={() => { sfx.hit(); act(d => hitThreat(d)); }}>{T('⚔️ Colpisci!')}{' '}{s.village.buildings.torre ? T('(le {torre} torri aiutano)', { torre: s.village.buildings.torre }) : ''}</Btn>
            </div>
          )}
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Raccolta e produzione */}
        <div className="space-y-4">
          <Panel title={T('Raccolta')} icon="legno">
            <div className="grid grid-cols-3 gap-2">
              {(['legno', 'pietra', 'provviste'] as ResKey[]).map(k => (
                <button key={k} onClick={() => { sfx.gather(); act(d => gather(d, k)); }} className="rounded-xl border border-stone-700 hover:border-ember bg-black/40 py-3 active:scale-95 transition">
                  <div className="flex justify-center mb-1"><Icon name={k} size={44} /></div>
                  <div className="text-xs text-bone">{k === 'legno' ? T('Taglia') : k === 'pietra' ? T('Scava') : T('Raccogli')}</div>
                  <div className="text-[10px] text-mist">+{fmt(clickValue(s, k))}</div>
                </button>
              ))}
            </div>
            {isUnlocked(s, 'f_cantastorie') && <Btn className="w-full mt-2" kind="fate" disabled={now < s.events.bardReadyAt} onClick={() => act(d => playBard(d))}>
              {now < s.events.bardReadyAt ? T('Il cantastorie torna tra {now}', { now: fmtTime(s.events.bardReadyAt - now) }) : T('Ascolta il cantastorie (produzione ×2)')}
            </Btn>}
          </Panel>

          {isUnlocked(s, 'f_produzione') && <Panel title={T('Produzione')} icon="bottega">
            <div className="grid grid-cols-2 gap-1 text-xs">
              {(Object.keys(prod) as ResKey[]).map(k => <div key={k} className={RES_INFO[k].color}><Pic id={k} emoji={RES_INFO[k].icon} size={16} /> {RES_INFO[k].name}: +{fmt(prod[k] * 60)}{T('/min')}</div>)}
            </div>
          </Panel>}

        </div>

        {/* Edifici */}
        <div className="space-y-4">
          {isUnlocked(s, 'f_edifici') && <Panel title={T('Edifici')} icon="villaggio" right={<span className="text-[10px] text-mist">{T('ogni edificio costa +15%')}</span>}>
            <div className="space-y-2">
              {BUILDINGS.map(b => {
                const n = s.village.buildings[b.id] || 0;
                const unlocked = buildingUnlocked(s, b.id);
                if (!unlocked && (maxBuilt === 0 || BUILDINGS.filter(x => !buildingUnlocked(s, x.id)).indexOf(b) > 1)) return null;
                const cost = buildingCost(s, b.id);
                const maxed = b.max && n >= b.max;
                if (!unlocked) return <div key={b.id} className="text-xs text-mist/60 border border-dashed border-stone-800 rounded-lg p-2">{T('??? · costruisci')}{' '}{b.unlock!.count} {BUILDINGS.find(x => x.id === b.unlock!.building)?.name}</div>;
                return (
                  <button key={b.id} disabled={!!maxed || !canAfford(s, cost)} onClick={() => { sfx.build(); act(d => build(d, b.id)); }} className="w-full text-left rounded-lg border border-stone-700 hover:border-ember/60 disabled:opacity-50 p-2 flex items-center gap-2">
                    <Icon name={b.id} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-bone flex justify-between"><span>{b.name}</span><span className="text-ember">{n}{b.max ? `/${b.max}` : ''}</span></div>
                      <div className="text-[10px] text-mist truncate">{b.desc} {Object.entries(b.prod).map(([k, v]) => `+${fmt((v || 0) * Math.pow(2, s.village.upgrades.filter(u => u.startsWith(b.id + '_')).length))} ${RES_INFO[k as ResKey].icon}/s`).join(' ')}</div>
                      {!maxed && <Cost cost={cost} have={s.res} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>}
          {ups.length > 0 && (
            <Panel title={T('Miglioramenti')} icon="opzioni" right={<Btn small onClick={() => act(d => buyAllUpgrades(d))}>{T('Compra tutti')}</Btn>}>
              <div className="space-y-1">
                {ups.slice(0, 6).map(u => {
                  const b = BUILDINGS.find(x => x.id === u.building)!;
                  return (
                    <button key={u.id} disabled={!canAfford(s, u.cost)} onClick={() => act(d => buyUpgrade(d, u.id))} className="w-full text-left text-xs rounded border border-stone-700 p-2 disabled:opacity-50 hover:border-ember">
                      {b.icon} {T('{name} ({n}): produzione ×2', { name: b.name, n: u.threshold })} · <Cost cost={u.cost} have={s.res} />
                    </button>
                  );
                })}
              </div>
            </Panel>
          )}
        </div>

        {/* Persone, storie e servizi */}
        <div className="space-y-4">

          {isUnlocked(s, 'f_volti') && <TalkersPanel state={s} act={act} />}

          {isUnlocked(s, 'f_stagno') && <Pond state={s} act={act} />}

          {(s.village.buildings.infermeria || 0) > 0 || s.hero.pledgedMaxHp > 0 || s.aberration ? <Panel title={T('Infermeria di Elara')} icon="infermeria">
            {!s.village.buildings.infermeria ? <p className="text-xs text-mist italic">{T('Costruisci l\'Infermeria per preparare pozioni ed elisir.')}</p> : (
              <div className="space-y-2">
                <Btn className="w-full" onClick={() => act(d => brewPotion(d))}>{T('🧪 Prepara pozione (')}{s.potions}) · <Cost cost={potionCost()} have={s.res} /></Btn>
                {(s.village.buildings.infermeria || 0) >= 2 && Object.entries(ELIXIRS).map(([id, e]) => (
                  <div key={id} className="flex items-center gap-2 text-xs">
                    <Btn small onClick={() => act(d => brewElixir(d, id))}>{e.icon} {e.name} <Cost cost={e.cost} have={s.res} /></Btn>
                    {(s.elixirs[id] || 0) > 0 && <Btn small kind="fate" disabled={!!s.activeElixir} onClick={() => act(d => activateElixir(d, id))}>{T('Bevi (')}{s.elixirs[id]})</Btn>}
                  </div>
                ))}
                {(s.village.buildings.infermeria || 0) < 2 && <p className="text-[10px] text-mist">{T('Infermeria livello 2: elisir per le spedizioni.')}</p>}
                {s.activeElixir && <Tag className="border-fate text-fate">{T('Attivo:')}{' '}{ELIXIRS[s.activeElixir].name}</Tag>}
              </div>
            )}
            {s.hero.pledgedMaxHp > 0 && (
              <div className="mt-3 border-t border-stone-800 pt-2 text-xs">
                <p className="text-dissonance">{T('⛓️ Pegno sulla salute futura: -')}{s.hero.pledgedMaxHp}</p>
                <Btn small className="mt-1" onClick={() => act(d => curePledge(d))}>{T('Rituale di Elara: ⚱️')}{pledgeCureCost(s).cenere} + 🏺1</Btn>
              </div>
            )}
            {s.aberration && (
              <div className="mt-3 border-t border-stone-800 pt-2 text-xs">
                <p className="text-fate">{T('🦷 Sei un\'Aberrazione. Elara conosce un rito per tornare umano, a un prezzo enorme.')}</p>
                <Btn small className="mt-1" onClick={() => act(d => cureAberration(d))}>{T('Rito: ⚱️3000 + 🏺8')}</Btn>
              </div>
            )}
          </Panel> : null}

          {(s.village.buildings.altare || 0) > 0 && (
            <Panel title={T('Altare della Veglia')} icon="altare">
              <div className="space-y-2 text-xs">
                <Btn className="w-full" small disabled={s.corruption < 60} onClick={() => act(d => purifyUI(d))}>{T('Purifica l\'interfaccia (🔮2)')}{' '}{s.corruption < 60 ? T('· la corruzione è bassa') : ''}</Btn>
                {s.nameCorrupted && <Btn className="w-full" small kind="fate" onClick={() => act(d => restoreName(d))}>{T('Pronuncia il tuo vero nome (🏺3)')}</Btn>}
                <p className="text-mist">{T('Corruzione personale: {n}%. Oltre il 60% l\'interfaccia comincia a mentire.', { n: Math.round(s.corruption) })}</p>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
