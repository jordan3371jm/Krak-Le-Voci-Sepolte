import { t as T } from '../i18n';
import { Pic } from './Pic';
import { useEffect, useRef, useState } from 'react';
import type { FactionId, FardelloId, GameState, ResKey } from '../game/types';
import type { Act } from '../game/useGame';
import { FACTIONS, FARDELLI } from '../game/data/core';
import { BUILDINGS, FISH, RES_INFO, UPGRADE_NAMES, UPGRADE_THRESHOLDS } from '../game/data/world';
import { canAfford, displayName, fmt, fmtTime, hasFlag, repState } from '../game/engine/state';
import {
  availableUpgrades, baitMax, build, buildingCost, buildingUnlocked, buyAllUpgrades, buyUpgrade, catchFish, chooseFardello, clickCart, clickDeer,
  clickValue, completeRequest, gather, hasGoldenRod, hitThreat, nextThreshold, playBard, productionPerSec, totalBuildings, useBait,
} from '../game/engine/village';
import { activateElixir, brewElixir, brewPotion, ELIXIRS, potionCost } from '../game/engine/hero';
import { cureAberration, curePledge, pledgeCureCost, purifyUI, restoreName } from '../game/engine/meta';
import { heartbeat, sfx } from '../game/audio';
import { Bar, Btn, Cost, Panel, Tag } from './ui';
import { Icon, Sigil } from './icons';
import { isUnlocked } from '../game/engine/onboarding';
import { TalkersPanel, Face, Typewriter } from './Talk';
import { BG, pick } from './art';
import { Particles } from './Atmosphere';
import { SceneBg } from './SceneBg';
import { VillageScene } from './VillageScene';
import { OmensPanel } from './Delve';
import { TALKERS } from '../game/data/dialogues';
import { recoverSatchel } from '../game/engine/features';
import { adMode, showRewarded } from '../game/platform';

// ------------------------------------------------------------
// La Notte del Portale: la prima scelta morale (crea il Fardello)
// ------------------------------------------------------------
// Ciò che accade quella notte, qualunque voce tu scelga: è il canone su cui poggiano tutti i dialoghi.
const AFTER: Record<FardelloId, string> = {
  sacrificio: T('Tomas cade nella luce senza un grido. Il portale si richiude su di lui come una bocca. Kael resta in ginocchio davanti al sigillo fino all’alba, e non ti chiede niente. Non ancora.'),
  sangue: T('Mentre stringi la mano di Vesper, Tomas si getta da solo nel sigillo: Kael non ne ha avuto il coraggio, e tu non c’eri. Il portale si chiude. Il bambino di Elara respira. Ilyas sparisce nel fumo, tra le braccia del Culto.'),
  silenzio: T('Resti immobile. Vedi il portale strappare Tomas dalle mani di Kael. Vedi una figura con un occhio cucito sul mantello allontanarsi tra le fiamme. Il portale si chiude da solo, sazio. Nessuno ha visto te.'),
};

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

const VOICE_UI = [
  { rgb: '251,146,60', tag: T('«Aiutami a chiuderlo!»'), place: T('Vicino al sigillo') },
  { rgb: '220,38,38', tag: T('«Il Culto può salvare il bambino.»'), place: T('Tra il fumo') },
  { rgb: '167,139,250', tag: T('«Resta indietro, civile.»'), place: T('Davanti ai soldati') },
];

export function PortalScreen({ act }: { act: Act }) {
  const [node, setNode] = useState('start');
  const [seen, setSeen] = useState<string[]>([]);
  const [sealing, setSealing] = useState(false);
  useEffect(() => { heartbeat(true); return () => heartbeat(false); }, []);
  const tree = portalTree();
  const commit = node.startsWith('c') ? +node.slice(1) : null;
  const n = commit === null ? tree[node] : null;
  const wi = n?.who !== undefined ? n.who : commit;
  const who = wi !== null && wi !== undefined ? NIGHT[wi] : null;
  const ui = wi !== null && wi !== undefined ? VOICE_UI[wi] : null;
  const go = (g: string) => { sfx.click(); setSeen(x => x.includes(node) ? x : [...x, node]); setNode(g); };
  const seal = (N: typeof NIGHT[number], F: typeof FARDELLI[FardelloId]) => {
    if (sealing) return;
    setSealing(true); sfx.chain(); sfx.door();
    window.setTimeout(() => act(d => {
      chooseFardello(d, N.f);
      d.modal = { kind: 'info', title: F.name, text: T('{description}\n\nLe azioni coerenti con il tuo Fardello caricano la Risonanza; quelle contrarie accumulano Dissonanza. Il mondo ricorderà entrambe.\n\nOra ricostruisci Hondovalle. La Guida in alto ti dirà cosa puoi fare, mai cosa scegliere.', { description: F.description }) };
    }), 1400);
  };
  return (
    <div className={`min-h-screen portal-bg relative overflow-hidden flex flex-col items-center px-4 pt-10 pb-12 ${sealing ? 'seal-shake' : ''}`} style={ui ? { ['--vc' as any]: ui.rgb } : undefined}>
      <SceneBg id="portale" fallback="copertina" opacity={0.6} overlay="linear-gradient(rgba(5,4,6,.25), rgba(5,4,6,.9) 78%)" />
      <div aria-hidden className="portal-ring" />
      {ui && <div aria-hidden className="voice-wash" />}
      <Particles mode="portal" tint={ui ? ui.rgb : '190,110,255'} />
      <div className="relative z-10 flex flex-col items-center text-center mb-6">
        <p className="text-[10px] uppercase tracking-[0.5em] text-amber-300/80">{T('Prologo')}</p>
        <h1 className="text-3xl sm:text-5xl text-gradient-ember title-beat leading-tight">{T('La Notte del Portale')}</h1>
        <p className="mt-2 text-xs sm:text-sm text-bone/60 italic tracking-wide">{T('Tre voci. Una sola risposta.')}</p>
      </div>

      {/* Inizio: le tre voci come carte */}
      {node === 'start' && n && (
        <div key="start" className="relative z-10 w-full max-w-5xl animate-rise">
          <p className="text-center text-[15px] sm:text-base text-bone/85 italic max-w-2xl mx-auto leading-relaxed mb-6">{n.text}</p>
          <div className="voice-grid grid grid-cols-1 sm:grid-cols-3 gap-4">
            {NIGHT.map((N, i) => (
              <button key={N.f} onClick={() => go(n.choices[i].go)} className="voice-card group text-center" style={{ ['--vc' as any]: VOICE_UI[i].rgb }}>
                <div className="relative mx-auto w-fit"><span aria-hidden className="voice-halo" /><Face id={N.npc.toLowerCase()} emoji={N.icon} size={132} tone={N.f === 'silenzio' ? 'violet' : 'blood'} /></div>
                <div className="mt-3 font-display text-lg text-bone">{N.who}</div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-mist mt-0.5">{VOICE_UI[i].place}</div>
                <p className="mt-3 text-sm italic text-bone/85">{VOICE_UI[i].tag}</p>
                <div className="mt-4 text-xs voice-cta">{n.choices[i].text} ›</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dialogo con una voce */}
      {n && who && ui && (
        <div key={node} className="relative z-10 w-full max-w-4xl animate-rise">
          <div className="voice-panel rounded-2xl p-5 sm:p-7 grid sm:grid-cols-[180px_1fr] gap-5 items-start">
            <div className="flex flex-col items-center text-center">
              <div className="relative"><span aria-hidden className="voice-halo" /><Face id={who.npc.toLowerCase()} emoji={who.icon} size={160} tone={who.f === 'silenzio' ? 'violet' : 'blood'} /></div>
              <span className="font-display text-bone mt-3">{who.who}</span>
              <span className="text-[10px] uppercase tracking-[0.3em] text-mist">{ui.place}</span>
            </div>
            <div>
              <div className="text-[16px] sm:text-[17px] leading-relaxed text-bone/95 min-h-[5.5em]"><Typewriter text={n.text} instant={false} /></div>
              <div className="mt-5 space-y-2">
                {n.choices.map((c, i) => {
                  const isCommit = c.go.startsWith('c');
                  const back = c.go === 'start';
                  const visited = seen.includes(c.go);
                  return (
                    <button key={i} onClick={() => go(c.go)} className={`w-full text-left rounded-xl border px-4 py-2.5 text-sm flex gap-3 items-center transition ${isCommit ? 'choice-commit' : back ? 'border-stone-800 text-mist hover:text-bone hover:border-stone-600' : 'border-stone-700 text-bone hover:border-[rgb(var(--vc))] hover:bg-white/5'} ${visited && !isCommit && !back ? 'opacity-55' : ''}`}>
                      {isCommit ? <Icon name={NIGHT[+c.go.slice(1)].f} size={34} /> : <span className="text-[rgb(var(--vc))] w-4">{back ? '↺' : '›'}</span>}
                      <span className="flex-1">{c.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-3 mt-4">
            {NIGHT.map((N, i) => <button key={N.f} title={N.who} onClick={() => go(`${'kvm'[i]}1`)} className={`rounded-full transition ${i === wi ? 'ring-2 ring-[rgb(var(--vc))] scale-110' : 'opacity-45 hover:opacity-90 grayscale'}`}><Face id={N.npc.toLowerCase()} emoji={N.icon} size={40} tone="ember" /></button>)}
          </div>
        </div>
      )}

      {/* Il sigillo: la scelta diventa Fardello */}
      {commit !== null && (() => { const N = NIGHT[commit]; const F = FARDELLI[N.f]; return (
        <div key={node} className="relative z-10 w-full max-w-2xl text-center animate-rise">
          <p className="text-amber-200 text-lg sm:text-xl font-display">{N.choice}</p>
          <p className="text-[15px] text-bone/85 italic mt-3 leading-relaxed"><Typewriter text={AFTER[N.f]} instant={false} /></p>
          <div className="fardello-reveal mx-auto mt-6 mb-2"><Icon name={N.f} size={184} /></div>
          <p className="text-[10px] uppercase tracking-[0.45em] text-mist">{T('Il tuo Fardello')}</p>
          <h2 className="text-3xl sm:text-4xl text-gradient-ember title-beat font-display">{F.name}</h2>
          <p className="text-xs text-bone/70 mt-1">{N.hint}</p>
          <div className="grid sm:grid-cols-2 gap-2 mt-4 text-left text-xs">
            <div className="rounded-lg border border-teal-800/60 bg-teal-950/30 p-2"><b className="text-teal-200">{T('Dono')}</b><p className="text-bone/80">{F.advantage}</p></div>
            <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-2"><b className="text-red-200">{T('Prezzo')}</b><p className="text-bone/80">{F.mechCost} {F.socialCost}</p></div>
          </div>
          <p className="text-[11px] text-mist mt-3">{T('Non potrai tornare indietro.')}</p>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            <Btn kind="ghost" disabled={sealing} onClick={() => go(`${'kvm'[commit]}1`)}>{T('Aspetta… non ancora')}</Btn>
            <Btn kind="ember" disabled={sealing} onClick={() => seal(N, F)}>{T('Scegli. E porta il peso.')}</Btn>
          </div>
        </div>
      ); })()}
      {sealing && <div aria-hidden className="seal-flash" />}
    </div>
  );
}

// ------------------------------------------------------------
// Stagno delle Voci
// ------------------------------------------------------------
function Pond({ state: s, act }: { state: GameState; act: Act }) {
  const [phase, setPhase] = useState<'idle' | 'wait' | 'bite'>('idle');
  const [msg, setMsg] = useState(T('Tocca lo stagno per lanciare la lenza.'));
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
  const caught = s.fish.length;
  return (
    <Panel title={T('Lo Stagno delle Voci')} icon="pesca" right={<span className="flex items-center gap-1 text-[11px] text-mist">{T('Esche')}{Array.from({ length: baitMax(s) }, (_, i) => <span key={i} className={`w-1.5 h-3 rounded-full ${i < s.bait ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,.8)]' : 'bg-stone-800'}`} />)}</span>}>
      <button onClick={cast} className={`pond w-full rounded-xl relative overflow-hidden text-left ${phase === 'bite' ? 'pond-bite' : ''}`}>
        <span aria-hidden className="pond-moon" />
        <span aria-hidden className="pond-fish" style={{ top: '58%', animationDuration: '17s' }} />
        <span aria-hidden className="pond-fish" style={{ top: '74%', animationDuration: '23s', animationDelay: '-9s', transform: 'scale(.7)' }} />
        <span aria-hidden className="pond-fish rev" style={{ top: '66%', animationDuration: '29s', animationDelay: '-4s' }} />
        {phase !== 'idle' && <span aria-hidden className="pond-ripple" />}
        {phase !== 'idle' && <span aria-hidden className={`pond-float ${phase === 'bite' ? 'bite' : ''}`} />}
        {phase === 'bite' && <span aria-hidden className="pond-ripple big" />}
        <span aria-hidden className="pond-reeds left" /><span aria-hidden className="pond-reeds right" />
        <span className={`absolute inset-x-0 bottom-2 text-center text-xs sm:text-sm px-3 drop-shadow-[0_1px_3px_#000] ${phase === 'bite' ? 'text-amber-200 font-bold tracking-widest' : 'text-bone/85 italic'}`}>{msg}</span>
      </button>
      <div className="flex items-center justify-between mt-3 mb-1.5 text-[11px]">
        <span className="uppercase tracking-[0.25em] text-mist">{T('Memorie pescate')}</span>
        <span className="text-amber-200">{caught}/{FISH.length} · +{caught}%{hasGoldenRod(s) ? T(' · 🏆 Canna d\'oro') : ''}</span>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
        {FISH.map(f => { const got = s.fish.includes(f.id); return (
          <div key={f.id} title={got ? `${f.name}: ${f.lore}` : '???'} className={`flex flex-col items-center rounded-lg p-1 border ${got ? 'border-sky-800/60 bg-sky-950/20' : 'border-stone-900 bg-black/30'}`}>
            <span className={got ? '' : 'brightness-0 opacity-60'}><Icon name={pick('pesce_', f.id, f.icon)} size={40} /></span>
            <span className={`text-[9px] leading-tight text-center mt-0.5 line-clamp-2 ${got ? 'text-sky-100/90' : 'text-stone-600'}`}>{got ? f.name : '???'}</span>
          </div>
        ); })}
      </div>
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

      <VillageScene state={s} act={act} />

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
            {(() => { const keys = (Object.keys(prod) as ResKey[]).filter(k => prod[k] > 0); const top = Math.max(...keys.map(k => prod[k] * 60), 1); return (
              <div className="space-y-1.5">
                {keys.map(k => (
                  <div key={k} className="flex items-center gap-2">
                    <Icon name={k} size={28} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs"><span className="text-bone/90">{RES_INFO[k].name}</span><span className={`font-semibold ${RES_INFO[k].color}`}>+{fmt(prod[k] * 60)}{T('/min')}</span></div>
                      <div className="h-1.5 rounded bg-stone-900 overflow-hidden"><div className="h-full rounded bg-gradient-to-r from-amber-700 to-amber-300" style={{ width: `${Math.max(4, (prod[k] * 60 / top) * 100)}%` }} /></div>
                    </div>
                  </div>
                ))}
                {!keys.length && <p className="text-xs text-mist italic">{T('Nessun edificio produce ancora.')}</p>}
              </div>
            ); })()}
          </Panel>}

          <Infirmary state={s} act={act} />
          <Altar state={s} act={act} />
        </div>

        {/* Edifici */}
        <div className="space-y-4">
          {isUnlocked(s, 'f_edifici') && <Panel title={T('Edifici')} icon="villaggio" right={<span className="text-[10px] text-mist">{T('ogni edificio costa +15%')}</span>}>
            <div className="grid gap-2">
              {BUILDINGS.map(b => {
                const n = s.village.buildings[b.id] || 0;
                const unlocked = buildingUnlocked(s, b.id);
                if (!unlocked && (maxBuilt === 0 || BUILDINGS.filter(x => !buildingUnlocked(s, x.id)).indexOf(b) > 1)) return null;
                const cost = buildingCost(s, b.id);
                const maxed = !!b.max && n >= b.max;
                if (!unlocked) return (
                  <div key={b.id} id={'b-' + b.id} className="flex items-center gap-3 rounded-xl border border-dashed border-stone-800 p-2 opacity-60">
                    <span className="grayscale brightness-50"><Icon name={b.id} size={44} /></span>
                    <div className="text-xs text-mist"><div className="text-bone/60 font-display">???</div>{T('Costruisci {n} × {b}', { n: b.unlock!.count, b: BUILDINGS.find(x => x.id === b.unlock!.building)?.name || '' })}</div>
                  </div>
                );
                const nxt = nextThreshold(s, b.id);
                const prev = [0, ...UPGRADE_THRESHOLDS].filter(t => t <= n).pop() || 0;
                const mult = Math.pow(2, s.village.upgrades.filter(u => u.startsWith(b.id + '_')).length);
                const ok = !maxed && canAfford(s, cost);
                return (
                  <button key={b.id} id={'b-' + b.id} disabled={!ok} onClick={() => { sfx.build(); act(d => build(d, b.id)); }}
                    className={`group w-full text-left rounded-xl border p-2.5 flex items-center gap-3 transition bg-gradient-to-r from-black/50 to-stone-950/40 ${ok ? 'border-amber-700/60 hover:border-amber-400 hover:shadow-[0_0_18px_rgba(245,158,11,.18)]' : 'border-stone-800'} ${maxed ? 'opacity-70' : ''}`}>
                    <div className="relative shrink-0">
                      <span className={ok ? '' : 'opacity-60'}><Icon name={b.id} size={52} /></span>
                      <span className="absolute -bottom-1 -right-1 min-w-[22px] text-center text-[11px] font-bold rounded-full bg-black border border-amber-600 text-amber-200 px-1">{n}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-2"><span className="font-display text-bone text-[15px] truncate">{b.name}</span>{b.max ? <span className="text-[10px] text-mist">{n}/{b.max}</span> : null}</div>
                      <div className="text-[11px] text-mist truncate">{b.desc}</div>
                      {Object.keys(b.prod).length > 0 && <div className="text-[11px] text-amber-200/90">{Object.entries(b.prod).map(([k, v]) => `+${fmt((v || 0) * mult * 60)} ${RES_INFO[k as ResKey].name}/min ${T('ciascuno')}`).join(' · ')}{mult > 1 ? ` · ×${mult}` : ''}</div>}
                      {nxt && Object.keys(b.prod).length > 0 && <div className="mt-1 flex items-center gap-2"><div className="flex-1 h-1 rounded bg-stone-900 overflow-hidden"><div className="h-full bg-gradient-to-r from-violet-700 to-fuchsia-400" style={{ width: `${((n - prev) / (nxt - prev)) * 100}%` }} /></div><span className="text-[9px] text-violet-200/80 whitespace-nowrap">{T('×2 a {n}', { n: nxt })}</span></div>}
                      <div className="mt-1">{maxed ? <span className="text-[10px] text-teal-300">{T('Al massimo')}</span> : <Cost cost={cost} have={s.res} />}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>}
          {ups.length > 0 && (
            <Panel title={T('Miglioramenti')} icon="potenzia" right={<Btn small onClick={() => act(d => buyAllUpgrades(d))}>{T('Compra tutti')}</Btn>}>
              <div className="grid gap-2">
                {ups.slice(0, 6).map(u => {
                  const b = BUILDINGS.find(x => x.id === u.building)!;
                  const ok = canAfford(s, u.cost);
                  const tier = UPGRADE_THRESHOLDS.indexOf(u.threshold);
                  return (
                    <button key={u.id} disabled={!ok} onClick={() => { sfx.build(); act(d => buyUpgrade(d, u.id)); }}
                      className={`w-full text-left rounded-xl border p-2 flex items-center gap-3 transition ${ok ? 'border-fuchsia-700/60 bg-fuchsia-950/20 hover:border-fuchsia-400 hover:shadow-[0_0_16px_rgba(217,70,239,.2)]' : 'border-stone-800 opacity-60'}`}>
                      <div className="relative shrink-0"><Icon name={b.id} size={40} /><span className="absolute -top-1 -right-1 text-[9px] font-bold rounded bg-fuchsia-700 text-white px-1">×2</span></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-bone font-display truncate">{UPGRADE_NAMES[tier] || ''}</div>
                        <div className="text-[11px] text-mist">{T('{name}: produzione raddoppiata (soglia {n})', { name: b.name, n: u.threshold })}</div>
                        <Cost cost={u.cost} have={s.res} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </Panel>
          )}
        </div>

        {/* Persone, storie e servizi */}
        <div className="space-y-4">

          <OmensPanel state={s} />

          {totalBuildings(s) >= 1 && <TalkersPanel state={s} act={act} />}

          {isUnlocked(s, 'f_stagno') && <Pond state={s} act={act} />}

        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Infermeria di Elara
// ------------------------------------------------------------
function Infirmary({ state: s, act }: { state: GameState; act: Act }) {
  const lvl = s.village.buildings.infermeria || 0;
  if (!lvl && !s.hero.pledgedMaxHp && !s.aberration) return null;
  return (
    <section className="panel infirmary rounded-xl p-3 sm:p-4 relative overflow-hidden">
      <div aria-hidden className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_15%_0%,rgba(45,212,191,.12),transparent_55%)]" />
      <div className="relative flex items-center gap-3 mb-3">
        <Face id="elara" emoji="🌿" tone="teal" size={58} />
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base text-bone tracking-wide">{T('Infermeria di Elara')}</h3>
          <p className="text-[11px] italic text-teal-100/70">{T('«Ogni cura ha un prezzo. Io lo pago in notti insonni.»')}</p>
        </div>
        {lvl > 0 && <span className="text-[10px] uppercase tracking-widest text-teal-200/80 border border-teal-800/60 rounded-full px-2 py-0.5">{T('Livello {n}', { n: lvl })}</span>}
      </div>
      {!lvl ? <p className="relative text-xs text-mist italic">{T('Costruisci l\'Infermeria per preparare pozioni ed elisir.')}</p> : (
        <div className="relative space-y-2">
          <button onClick={() => act(d => brewPotion(d))} disabled={!canAfford(s, potionCost())} className="w-full flex items-center gap-3 rounded-xl border border-teal-800/60 bg-gradient-to-r from-teal-950/50 to-black/40 p-2 text-left hover:border-teal-400 disabled:opacity-50 transition">
            <Icon name="pozione" size={46} />
            <div className="flex-1 min-w-0"><div className="text-sm text-bone font-display">{T('Pozione di cura')}</div><Cost cost={potionCost()} have={s.res} /></div>
            <div className="text-center"><div className="font-display text-xl text-teal-200 leading-none">{s.potions}</div><div className="text-[9px] uppercase text-mist">{T('in borsa')}</div></div>
          </button>
          {lvl >= 2 ? (
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ELIXIRS).map(([id, e]) => { const owned = s.elixirs[id] || 0; const active = s.activeElixir === id; return (
                <div key={id} className={`rounded-xl border p-2 flex flex-col items-center text-center ${active ? 'border-fate bg-fate/10 shadow-[0_0_18px_rgba(168,85,247,.35)]' : 'border-stone-700 bg-black/40'}`}>
                  <Icon name={pick('elisir_', id, e.icon)} size={50} />
                  <div className="text-xs text-bone font-display mt-1 leading-tight">{e.name}</div>
                  <div className="text-[10px] text-mist leading-tight my-1">{e.desc}</div>
                  <Cost cost={e.cost} have={s.res} />
                  <div className="flex gap-1 mt-1.5">
                    <Btn small onClick={() => act(d => brewElixir(d, id))}>{T('Prepara')}</Btn>
                    <Btn small kind="fate" disabled={!owned || !!s.activeElixir} onClick={() => act(d => activateElixir(d, id))}>{T('Bevi')} ({owned})</Btn>
                  </div>
                </div>
              ); })}
            </div>
          ) : <p className="text-[10px] text-mist">{T('Infermeria livello 2: elisir per le spedizioni.')}</p>}
          {s.activeElixir && <p className="text-[11px] text-fate text-center">{T('Attivo:')}{' '}{ELIXIRS[s.activeElixir].name}</p>}
        </div>
      )}
      {s.hero.pledgedMaxHp > 0 && (
        <div className="relative mt-3 rounded-lg border border-red-900/70 bg-red-950/30 p-2 text-xs">
          <p className="text-dissonance">{T('⛓️ Pegno sulla salute futura: -')}{s.hero.pledgedMaxHp}</p>
          <Btn small className="mt-1" onClick={() => act(d => curePledge(d))}>{T('Rituale di Elara: ⚱️')}{pledgeCureCost(s).cenere} + 🏺1</Btn>
        </div>
      )}
      {s.aberration && (
        <div className="relative mt-3 rounded-lg border border-fate/60 bg-fuchsia-950/30 p-2 text-xs">
          <p className="text-fate">{T('🦷 Sei un\'Aberrazione. Elara conosce un rito per tornare umano, a un prezzo enorme.')}</p>
          <Btn small className="mt-1" onClick={() => act(d => cureAberration(d))}>{T('Rito: ⚱️3000 + 🏺8')}</Btn>
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------
// Altare della Veglia
// ------------------------------------------------------------
function Altar({ state: s, act }: { state: GameState; act: Act }) {
  if (!(s.village.buildings.altare || 0)) return null;
  const c = Math.round(s.corruption);
  const hot = c >= 60;
  return (
    <section className={`panel altar rounded-xl p-3 sm:p-4 relative overflow-hidden ${hot ? 'altar-hot' : ''}`}>
      <div aria-hidden className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_100%,rgba(245,181,68,.14),transparent_60%)]" />
      <h3 className="relative font-display text-base text-bone tracking-wide flex items-center gap-2 mb-3"><Icon name="altare" size={30} />{T('Altare della Veglia')}</h3>
      <div className="relative flex items-center gap-4">
        <div className="altar-gauge shrink-0" style={{ ['--p' as any]: `${Math.min(100, c)}%` }}>
          <div className="altar-gauge-in"><span className={`font-display text-2xl leading-none ${hot ? 'text-fuchsia-300' : 'text-amber-100'}`}>{c}%</span><span className="text-[8px] uppercase tracking-widest text-mist">{T('Corruzione')}</span></div>
        </div>
        <div className="flex-1 min-w-0">
          <div aria-hidden className="flex gap-2 mb-2">{[0, 1, 2, 3, 4].map(i => <span key={i} className={`altar-candle ${i < Math.ceil((100 - c) / 20) ? '' : 'out'}`} style={{ animationDelay: `${i * 0.37}s` }} />)}</div>
          <p className="text-[11px] text-bone/75">{T('Corruzione personale: {n}%. Oltre il 60% l\'interfaccia comincia a mentire.', { n: c })}</p>
        </div>
      </div>
      <div className="relative grid gap-2 mt-3">
        <Btn className="w-full" small kind={hot ? 'fate' : 'default'} disabled={s.corruption < 60} onClick={() => act(d => purifyUI(d))}>{T('Purifica l\'interfaccia (🔮2)')}{' '}{s.corruption < 60 ? T('· la corruzione è bassa') : ''}</Btn>
        {s.nameCorrupted && <Btn className="w-full" small kind="fate" onClick={() => act(d => restoreName(d))}>{T('Pronuncia il tuo vero nome (🏺3)')}</Btn>}
      </div>
    </section>
  );
}
