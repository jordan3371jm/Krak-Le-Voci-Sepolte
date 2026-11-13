import { t as T } from '../i18n';
import { useEffect, useRef, useState } from 'react';
import type { GameState } from '../game/types';
import type { Act } from '../game/useGame';
import { CLASS_V, ENEMY_KINDS, PACTS, ROUND_MS, WHISPER_MS, addPlayer, choose, hostTick, newVigil, removePlayer, startVigil, vote, type VAction, type VClass, type VigilState } from '../game/vigil';
import { mpCloseRoom as mpClose, mpCreate as mpCreateRoom, mpInvite, mpInviteSupported, mpIsHost, mpJoin as mpJoinRoom, mpLaunchRoom, mpLeave as mpLeaveRoom, mpPlayerId, mpPlayers, mpQuick as mpQuickMatch, mpRoomId, mpSend as mpSendHost, mpSetState, mpSupported } from '../game/mp';
import { submitScore, hasLeaderboard, trackOnce } from '../game/platform';
import { addRes, toast } from '../game/engine/state';
import { sfx } from '../game/audio';
import { AdBtn, Btn, Panel } from './ui';
import { Icon } from './icons';
import { artOr, BG } from './art';

const ACTIONS: { id: VAction; icon: string; name: () => string; desc: () => string }[] = [
  { id: 'strike', icon: 'combat', name: () => T('Colpisci'), desc: () => T('Ferisci il Sepolto più vicino.') },
  { id: 'guard', icon: 'slot_scudo', name: () => T('Proteggi'), desc: () => T('Para i colpi diretti al fuoco.') },
  { id: 'tend', icon: 'altare', name: () => T('Ravviva'), desc: () => T('Ridai vita al fuoco.') },
  { id: 'rite', icon: 'risonanza', name: () => T('Rito'), desc: () => T('Carica l\'Eco comune: a 100 travolge tutti.') },
];

const TUTORIAL: { icon: string; title: () => string; text: () => string }[] = [
  { icon: 'compagni', title: () => T('Cos\'è la Veglia'), text: () => T('La Veglia è il multigiocatore di KRAK: da 1 a 4 portatori difendono insieme l\'ultimo fuoco di Hondovalle dalle ondate dei Sepolti. I posti vuoti li prendono le eco, compagni guidati dal gioco.') },
  { icon: 'portale', title: () => T('Come entrare'), text: () => T('Partita rapida ti unisce a una Veglia aperta. Crea una Veglia privata ti dà un codice da condividere con gli amici, che lo scrivono nel campo Codice e premono Entra. Veglia da solo ti fa giocare subito con le eco, anche senza connessione.') },
  { icon: 'combat', title: () => T('Il round'), text: () => T('Ogni round avete 12 secondi. Ognuno sceglie un\'azione: Colpisci ferisce il Sepolto più vicino, Proteggi para i colpi diretti al fuoco, Ravviva ridà vita al fuoco, Rito carica l\'Eco comune che a 100 travolge tutti i nemici. Chi non sceglie, colpisce.') },
  { icon: 'altare', title: () => T('Il fuoco'), text: () => T('Il fuoco è la vita di tutto il gruppo. I Sepolti che arrivano al cerchio lo attaccano: se si spegne, la Veglia finisce. Dividetevi i compiti: qualcuno colpisce, qualcuno protegge, qualcuno ravviva.') },
  { icon: 'risonanza', title: () => T('I patti di Krak'), text: () => T('Ogni 3 ondate Krak sussurra due patti: votate, e la maggioranza decide. Ogni patto dà un vantaggio e un prezzo, e resta fino alla fine della notte.') },
  { icon: 'imprese', title: () => T('Ricompense'), text: () => T('Ogni ondata superata vale 60 cenere per il tuo villaggio, e ogni 5 ondate guadagni una reliquia (massimo 3 al giorno). Il tuo record entra nella classifica. Pronto? Prova una Veglia da solo per imparare.') },
];

export default function Vigil({ state: s, act }: { state: GameState; act: Act }) {
  const [mode, setMode] = useState<'menu' | 'solo' | 'online'>('menu');
  const [, force] = useState(0);
  const vs = useRef<VigilState | null>(null);
  const me = useRef('me');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [tut, setTut] = useState<number | null>(() => s.flags.includes('seen_vigil_tut') ? null : 0);
  const rewarded = useRef(false);
  const [doubled, setDoubled] = useState(false);
  const rerender = () => force(x => x + 1);
  const cls = (['custode', 'penitente', 'lama', 'veggente'].includes(s.classId) ? s.classId : 'custode') as VClass;
  const online = mode === 'online';

  // Orologio: l'host (o il gioco in solitario) fa avanzare la Veglia
  useEffect(() => {
    if (mode === 'menu') return;
    const id = window.setInterval(() => {
      const v = vs.current; if (!v) return;
      if (online) {
        if (!mpIsHost()) { rerender(); return; }
        // allinea i giocatori della stanza
        const ps = mpPlayers();
        if (v.phase === 'lobby') for (const p of ps) addPlayer(v, p.id, String(p.properties?.name || p.name || ''), (p.properties?.cls || 'custode') as VClass);
        for (const p of v.players) if (!p.bot && !ps.some(x => x.id === p.id)) removePlayer(v, p.id);
      }
      if (v.phase !== 'lobby' && v.phase !== 'over') hostTick(v, Date.now());
      if (online) mpSetState(v);
      rerender();
    }, 400);
    return () => clearInterval(id);
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { if (online) mpLeaveRoom(); }, [online]);

  // Fine della Veglia: classifica e piccola ricompensa (al massimo 3 reliquie al giorno)
  const v = vs.current;
  const busyPhase = !!v && (v.phase === 'choose' || v.phase === 'whisper');
  useEffect(() => { window.dispatchEvent(new CustomEvent('krak-vigil-busy', { detail: busyPhase })); return () => { window.dispatchEvent(new CustomEvent('krak-vigil-busy', { detail: false })); }; }, [busyPhase]);
  useEffect(() => {
    if (!v || v.phase !== 'over' || rewarded.current) return;
    rewarded.current = true;
    trackOnce('fun_vigil_played');
    submitScore('krak_veglia', v.wave);
    act(d => {
      const day = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
      if (d.totals.vigilDay !== day) { d.totals.vigilDay = day; d.totals.vigilRel = 0; }
      const rel = Math.min(3 - (d.totals.vigilRel || 0), Math.floor(v.wave / 5));
      if (rel > 0) { d.reliquie += rel; d.totals.vigilRel = (d.totals.vigilRel || 0) + rel; }
      addRes(d, { cenere: v.wave * 60 });
      d.totals.vigilBest = Math.max(d.totals.vigilBest || 0, v.wave);
      toast(d, T('🔥 La Veglia ti ricompensa: +{c} cenere{r}', { c: v.wave * 60, r: rel > 0 ? T(', +{n} reliquie', { n: rel }) : '' }), 'good');
    });
  }, [v?.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlers = {
    onState: (st: VigilState) => { if (!mpIsHost()) { vs.current = st; rerender(); } },
    applyState: (st: VigilState) => { vs.current = st; rerender(); },
    getState: () => vs.current || newVigil(),
    onMessage: (m: { type: string; data: any; from: string }) => {
      const cur = vs.current; if (!cur || !mpIsHost()) return;
      if (m.type === 'act') choose(cur, m.from, m.data?.a);
      if (m.type === 'vote') vote(cur, m.from, Number(m.data?.i));
    },
    onPlayers: () => rerender(),
    onLeft: (r: string) => { setMode('menu'); vs.current = null; setErr(r === 'left' ? '' : T('Connessione persa con la Veglia.')); },
  };
  const props = { name: s.playerName.slice(0, 16), cls };

  const startSolo = () => {
    const nv = newVigil(); me.current = 'me'; addPlayer(nv, 'me', s.playerName, cls); startVigil(nv, Date.now());
    vs.current = nv; rewarded.current = false; setDoubled(false); setMode('solo'); sfx.door();
  };
  const enter = async (how: 'quick' | 'create' | 'join') => {
    setBusy(true); setErr('');
    const nv = newVigil(); vs.current = nv; rewarded.current = false; setDoubled(false);
    try {
      if (how === 'quick') await mpQuickMatch(handlers, props);
      else if (how === 'create') await mpCreateRoom(handlers, props);
      else await mpJoinRoom(handlers, code, props);
      me.current = mpPlayerId();
      if (mpIsHost()) addPlayer(nv, me.current, s.playerName, cls);
      setMode('online'); sfx.door();
    } catch (e: any) {
      vs.current = null;
      setErr(({ MULTIPLAYER_ROOM_NOT_FOUND: T('Nessuna Veglia con questo codice.'), MULTIPLAYER_ROOM_FULL: T('Questa Veglia è piena.'), MULTIPLAYER_ROOM_CLOSED: T('Questa Veglia è già cominciata.') } as Record<string, string>)[e?.code] || T('Impossibile raggiungere le altre Veglie. Riprova.'));
    }
    setBusy(false);
  };
  // Invito ricevuto: entra subito nella stanza
  useEffect(() => { const r = mpLaunchRoom(); if (r && mpSupported() && mode === 'menu') { setCode(r); void (async () => { setBusy(true); try { vs.current = newVigil(); await mpJoinRoom(handlers, r, props); me.current = mpPlayerId(); setMode('online'); } catch { setErr(T('L\'invito è scaduto.')); vs.current = null; } setBusy(false); })(); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const leave = () => { if (online) mpLeaveRoom(); vs.current = null; setMode('menu'); };
  const pick = (a: VAction) => {
    const cur = vs.current; if (!cur || cur.phase !== 'choose') return; sfx.click();
    if (!online || mpIsHost()) choose(cur, me.current, a); else { mpSendHost('act', { a }); const p = cur.players.find(x => x.id === me.current); if (p) p.choice = a; }
    rerender();
  };
  const castVote = (i: number) => {
    const cur = vs.current; if (!cur) return; sfx.click();
    if (!online || mpIsHost()) vote(cur, me.current, i); else { mpSendHost('vote', { i }); const p = cur.players.find(x => x.id === me.current); if (p) p.vote = i; }
    rerender();
  };
  const begin = () => { const cur = vs.current; if (!cur) return; startVigil(cur, Date.now()); if (online) { mpClose(); mpSetState(cur); } sfx.door(); rerender(); };

  // ---------------- Menu ----------------
  if (mode === 'menu' || !v) {
    const sup = mpSupported();
    const closeTut = () => { setTut(null); if (!s.flags.includes('seen_vigil_tut')) act(d => { if (!d.flags.includes('seen_vigil_tut')) d.flags.push('seen_vigil_tut'); }); };
    const step = tut !== null ? TUTORIAL[tut] : null;
    return (
      <div className="space-y-4">
        {step && tut !== null && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-md rounded-2xl border border-amber-700/60 bg-stone-950/95 p-5 shadow-[0_0_40px_rgba(251,146,60,.25)] animate-rise">
              <p className="text-[10px] uppercase tracking-[0.4em] text-amber-200/70">{T('Tutorial della Veglia · {a}/{b}', { a: tut + 1, b: TUTORIAL.length })}</p>
              <div className="flex items-center gap-3 mt-2"><Icon name={step.icon} size={48} /><h3 className="font-display text-xl text-bone">{step.title()}</h3></div>
              <p className="text-sm text-bone/85 mt-3 leading-relaxed">{step.text()}</p>
              <div className="flex gap-1 mt-4 justify-center">{TUTORIAL.map((_, i) => <span key={i} className={`h-1.5 w-6 rounded-full ${i <= tut ? 'bg-amber-400' : 'bg-stone-700'}`} />)}</div>
              <div className="flex flex-wrap gap-2 mt-4 justify-between">
                <Btn small kind="ghost" onClick={closeTut}>{T('Salta')}</Btn>
                <div className="flex gap-2">
                  {tut > 0 && <Btn small kind="ghost" onClick={() => setTut(tut - 1)}>{T('‹ Indietro')}</Btn>}
                  {tut < TUTORIAL.length - 1
                    ? <Btn small kind="ember" onClick={() => { sfx.click(); setTut(tut + 1); }}>{T('Avanti ›')}</Btn>
                    : <><Btn small onClick={closeTut}>{T('Ho capito')}</Btn><Btn small kind="ember" onClick={() => { closeTut(); startSolo(); }}>{T('Prova da solo')}</Btn></>}
                </div>
              </div>
            </div>
          </div>
        )}
        <section className="vigil-hero relative rounded-2xl overflow-hidden p-5 sm:p-8">
          {BG.villaggio_1 && <div aria-hidden className="absolute inset-0 bg-cover bg-center opacity-50 kenburns" style={{ backgroundImage: `url(${BG.villaggio_1})` }} />}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
          <div aria-hidden className="campfire !w-[260px] !h-[140px] !bottom-0" />
          <div className="relative max-w-2xl">
            <p className="text-[10px] uppercase tracking-[0.45em] text-amber-200/70">{T('Multigiocatore · 1–4 portatori')}</p>
            <h2 className="font-display text-3xl sm:text-5xl text-gradient-ember title-beat">{T('La Veglia')}</h2>
            <p className="text-sm text-bone/80 italic mt-2">{T('Una notte fuori dal tempo. Attorno all\'ultimo fuoco di Hondovalle, portatori di valli diverse resistono insieme alle ondate dei Sepolti. Ogni tre ondate Krak sussurra un patto: votate, e la maggioranza decide.')}</p>
            <div className="flex flex-wrap gap-2 mt-5">
              <button disabled={!sup || busy} onClick={() => enter('quick')} className="descend-btn">{T('Partita rapida')}</button>
              <button disabled={!sup || busy} onClick={() => enter('create')} className="descend-btn">{T('Crea una Veglia privata')}</button>
              <button disabled={busy} onClick={startSolo} className="descend-btn blood">{T('Veglia da solo (con le eco)')}</button>
            </div>
            {sup && <div className="flex gap-2 mt-3 items-center">
              <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={8} placeholder={T('Codice')} className="w-36 bg-black/70 border border-stone-700 rounded-lg px-3 py-2 font-display tracking-[0.25em] text-bone" />
              <Btn disabled={busy || code.length < 6} onClick={() => enter('join')}>{T('Entra')}</Btn>
            </div>}
            {!sup && <p className="text-[11px] text-mist mt-3">{T('Le partite online sono disponibili quando giochi su Playgama. Qui puoi vegliare con le eco.')}</p>}
            {busy && <p className="text-xs text-amber-200 mt-3 animate-pulse">{T('Cerchi altri fuochi nella notte…')}</p>}
            {err && <p className="text-xs text-dissonance mt-3">{err}</p>}
          </div>
        </section>
        <div className="grid md:grid-cols-2 gap-4">
          <Panel title={T('Come si gioca')} icon="diario" right={<Btn small kind="ghost" onClick={() => setTut(0)}>{T('Tutorial')}</Btn>}>
            <ul className="text-xs text-bone/80 space-y-2">
              {ACTIONS.map(a => <li key={a.id} className="flex gap-2 items-center"><Icon name={a.icon} size={30} /><span><b className="text-bone">{a.name()}</b>: {a.desc()}</span></li>)}
              <li className="text-mist">{T('Ogni round avete 12 secondi per scegliere. Chi non sceglie, colpisce. Se il fuoco si spegne, la Veglia finisce.')}</li>
              <li className="text-mist">{T('Ogni classe è più forte in un\'azione: il Penitente protegge, la Lama colpisce, la Veggente carica il Rito, il Custode fa un po\' di tutto.')}</li>
            </ul>
          </Panel>
          <Panel title={T('I tuoi record')} icon="imprese">
            <div className="text-sm text-bone">{T('Ondata più alta: {n}', { n: s.totals.vigilBest || 0 })}</div>
            <p className="text-[11px] text-mist mt-2">{T('Ricompense: 60 cenere per ondata e 1 reliquia ogni 5 ondate (massimo 3 reliquie al giorno).')}</p>
            <p className="text-[11px] text-mist mt-1">{hasLeaderboard() ? T('Il tuo record entra nella classifica della Veglia.') : T('Su Playgama il tuo record entra nella classifica della Veglia.')}</p>
          </Panel>
        </div>
      </div>
    );
  }

  // ---------------- Stanza d'attesa ----------------
  const meP = v.players.find(p => p.id === me.current);
  const now = Date.now();
  if (v.phase === 'lobby') {
    const host = !online || mpIsHost();
    return (
      <Panel title={T('La Veglia · in attesa')} icon="compagni" right={<Btn small kind="ghost" onClick={leave}>{T('Esci')}</Btn>}>
        <div className="text-center my-3">
          <div className="text-[10px] uppercase tracking-[0.4em] text-mist">{T('Codice della Veglia')}</div>
          <div className="font-display text-3xl tracking-[0.3em] text-amber-200 select-text">{mpRoomId()}</div>
          {mpInviteSupported() && <Btn small className="mt-2" onClick={() => mpInvite(T('Veglia con me attorno all\'ultimo fuoco di Hondovalle!'))}>{T('Invita un amico')}</Btn>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[0, 1, 2, 3].map(i => { const p = v.players[i]; return (
            <div key={i} className={`rounded-xl border p-3 text-center ${p ? 'border-amber-700/60 bg-black/40' : 'border-dashed border-stone-800 opacity-50'}`}>
              {p ? <><Icon name={p.cls} size={56} /><div className="text-sm text-bone mt-1 truncate">{p.name}</div></> : <div className="text-xs text-mist py-6">{T('Posto libero: lo prenderà un\'eco')}</div>}
            </div>); })}
        </div>
        {host ? <div className="text-center mt-4"><button className="descend-btn" onClick={begin}>{T('Accendi il fuoco e comincia')}</button></div>
          : <p className="text-center text-xs text-mist mt-4 animate-pulse">{T('In attesa che l\'host accenda il fuoco…')}</p>}
      </Panel>
    );
  }

  // ---------------- Partita ----------------
  const left = Math.max(0, v.deadline - now);
  const total = v.phase === 'whisper' ? WHISPER_MS : ROUND_MS;
  return (
    <div className="space-y-3">
      <section className="vigil-stage relative rounded-2xl overflow-hidden p-3 sm:p-5">
        {BG.villaggio_1 && <div aria-hidden className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${BG.villaggio_1})` }} />}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/90" />
        <div className="relative flex items-center justify-between gap-2">
          <div><div className="text-[10px] uppercase tracking-[0.4em] text-mist">{T('Ondata')}</div><div className="font-display text-3xl text-ember leading-none">{v.wave}</div></div>
          <div className="flex-1 max-w-md">
            <div className="flex justify-between text-[10px] uppercase tracking-widest text-amber-100"><span>{T('Il fuoco')}</span><span>{Math.round(v.fire)}/{v.fireMax}</span></div>
            <div className="h-3 rounded-full bg-black/70 border border-amber-900 overflow-hidden"><div className="h-full bg-gradient-to-r from-red-700 via-orange-500 to-amber-300 transition-all" style={{ width: `${(v.fire / v.fireMax) * 100}%` }} /></div>
            <div className="flex justify-between text-[10px] uppercase tracking-widest text-teal-200 mt-1"><span>{T('Rito')}</span><span>{Math.round(v.resonance)}/100</span></div>
            <div className="h-1.5 rounded-full bg-black/70 overflow-hidden"><div className="h-full bg-gradient-to-r from-teal-700 to-teal-300" style={{ width: `${Math.min(100, v.resonance)}%` }} /></div>
          </div>
          <Btn small kind="ghost" onClick={leave}>{T('Esci')}</Btn>
        </div>
        {/* nemici */}
        <div className="relative flex flex-wrap justify-center gap-2 mt-4 min-h-[96px]">
          {v.enemies.map(e => { const k = ENEMY_KINDS[e.kind]; return (
            <div key={e.uid} className="w-[86px] text-center">
              <span className="portrait-uncanny inline-block rounded-full"><Icon name={artOr(k.art, 'elite')} size={e.kind === 'colosso' ? 76 : 56} /></span>
              <div className="text-[10px] text-red-100 truncate">{k.name()}</div>
              <div className="h-1 rounded-full bg-black/70 overflow-hidden"><div className="h-full bg-red-600" style={{ width: `${Math.max(0, e.hp / e.max) * 100}%` }} /></div>
            </div>); })}
        </div>
        {/* fuoco e portatori */}
        <div className="relative flex justify-center items-end gap-3 sm:gap-6 mt-4">
          {v.players.map(p => (
            <div key={p.id} className={`text-center w-[72px] ${p.id === me.current ? 'scale-110' : ''}`}>
              <Icon name={p.cls} size={48} />
              <div className={`text-[10px] truncate ${p.id === me.current ? 'text-amber-200' : 'text-bone/80'}`}>{p.name}</div>
              <div className="text-[9px] text-mist">{v.phase === 'choose' ? (p.choice ? '✓' : '…') : v.phase === 'whisper' ? (p.vote !== null ? '✓' : '…') : `${p.dmg}`}</div>
            </div>
          ))}
        </div>
        <span aria-hidden className="campfire !bottom-[-20px]" style={{ opacity: 0.4 + (v.fire / v.fireMax) * 0.6 }} />
      </section>

      {v.phase !== 'over' && <div className="h-1 rounded-full bg-black/70 overflow-hidden"><div className="h-full bg-amber-500 transition-[width] duration-300" style={{ width: `${(left / total) * 100}%` }} /></div>}

      {v.phase === 'choose' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ACTIONS.map(a => (
            <button key={a.id} disabled={!meP} onClick={() => pick(a.id)} className={`vigil-act rounded-xl border p-3 text-left ${meP?.choice === a.id ? 'on' : ''}`}>
              <div className="flex items-center gap-2"><Icon name={a.icon} size={40} /><div><div className="font-display text-bone">{a.name()}</div><div className="text-[10px] text-mist">{meP ? `${CLASS_V[meP.cls][a.id]}` : ''}</div></div></div>
              <div className="text-[10px] text-bone/60 mt-1">{a.desc()}</div>
            </button>
          ))}
        </div>
      )}

      {v.phase === 'whisper' && v.offer && (
        <Panel title={T('Krak sussurra un patto')} icon="omen_pozzo">
          <div className="grid sm:grid-cols-2 gap-3">
            {v.offer.map((id, i) => { const P = PACTS[id]; const votes = v.players.filter(p => p.vote === i).length; return (
              <button key={id} onClick={() => castVote(i)} className={`vigil-act rounded-xl border p-4 text-left ${meP?.vote === i ? 'on' : ''}`}>
                <div className="font-display text-lg text-fate">{P.name()}</div>
                <div className="text-xs text-bone/80 mt-1">{P.desc()}</div>
                <div className="text-[10px] text-mist mt-2">{T('Voti: {n}', { n: votes })}</div>
              </button>); })}
          </div>
        </Panel>
      )}

      {v.phase === 'over' && (
        <Panel title={T('Il fuoco si è spento')} icon="cenere">
          <div className="text-center">
            <div className="font-display text-5xl text-ember">{v.wave}</div>
            <div className="text-xs text-mist uppercase tracking-widest">{T('ondate')}</div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">{[...v.players].sort((a, b) => b.dmg - a.dmg).map(p => <div key={p.id} className="rounded border border-stone-800 p-2"><b className="text-bone">{p.name}</b><div className="text-mist">{T('{n} danni', { n: p.dmg })}</div></div>)}</div>
            {v.wave > 0 && !doubled && <div className="mt-4"><AdBtn placement="vigil_double" label={T('📺 Raddoppia la cenere (+{c})', { c: v.wave * 60 })} onReward={() => { setDoubled(true); act(d => { addRes(d, { cenere: v.wave * 60 }); toast(d, T('🔥 Cenere della Veglia raddoppiata!'), 'good'); }); }} /></div>}
            <div className="flex justify-center gap-2 mt-4"><Btn kind="ember" onClick={leave}>{T('Torna al fuoco di casa')}</Btn>{!online && <Btn onClick={startSolo}>{T('Ancora una Veglia')}</Btn>}</div>
          </div>
        </Panel>
      )}

      <div className="panel rounded-xl p-2 h-24 overflow-y-auto text-[11px] text-bone/70 space-y-0.5">{v.log.map((l, i) => <div key={i} className={i === 0 ? 'text-bone' : ''}>{l}</div>)}</div>
    </div>
  );
}
