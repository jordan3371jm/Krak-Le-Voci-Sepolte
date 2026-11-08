import { t as T } from '../i18n';
import { useEffect, useRef, useState } from 'react';
import type { Combatant, GameState, Skill } from '../game/types';
import type { Act } from '../game/useGame';
import { DISSONANCE_SKILLS, FARDELLI } from '../game/data/core';
import { ENEMIES, getSkill } from '../game/data/enemies';
import { autoAct, canUseSkill, enemyPhase, fleeCombat, heroStunned, intentVisible, legalTargets, playerAct, reposition, skipTurn, speakWord, statusLabel, useEcho, usePotion } from '../game/engine/combat';
import { finishCombat } from '../game/engine/delve';
import { resonanceMax } from '../game/engine/hero';
import { hasFlag } from '../game/engine/state';
import { sfx } from '../game/audio';
import { Bar, Btn, Tag, rich } from './ui';
import { Icon, Sigil } from './icons';
import { artFor } from './art';
import { Tip } from './Guide';
import { isUnlocked } from '../game/engine/onboarding';

const NATURE_LABEL: Record<string, string> = { protect: T('protezione'), sacrifice: T('sacrificio'), cruel: T('crudeltà'), betray: T('tradimento'), silent: T('silenzio'), faith: T('fede'), blood: T('sangue'), neutral: T('neutra') };

function Unit({ u, s, targetable, onClick }: { u: Combatant; s: GameState; targetable: boolean; onClick?: () => void }) {
  const c = s.combat!;
  const fx = c.fx.filter(f => f.uid === u.uid);
  const dead = u.hp <= 0;
  const intent = u.side === 'enemy' && u.intent && !dead ? (intentVisible(s, u) ? u.intent.label : '❓ ???') : null;
  const prevHp = useRef(u.hp);
  const [pulse, setPulse] = useState<'' | 'hit' | 'healed'>('');
  useEffect(() => {
    const d = u.hp - prevHp.current; prevHp.current = u.hp;
    if (d === 0 || s.settings.reduceFx) return;
    setPulse(d < 0 ? 'hit' : 'healed');
    const tm = window.setTimeout(() => setPulse(''), 600);
    return () => window.clearTimeout(tm);
  }, [u.hp]); // eslint-disable-line react-hooks/exhaustive-deps
  const boss = u.tags.includes('boss');
  return (
    <button
      disabled={!targetable}
      onClick={onClick}
      className={`relative rounded-xl border p-2 text-left transition w-full ${pulse} ${u.side === 'enemy' && !dead && !targetable ? 'threat' : ''} ${dead ? 'dead border-stone-800' : targetable ? 'border-ember ring-2 ring-ember/60 cursor-pointer hover:bg-ember/10' : boss ? 'border-red-800 bg-red-950/20' : 'border-stone-700 bg-black/40'} ${fx.some(f => f.kind === 'dmg' || f.kind === 'crit') ? 'animate-shake' : ''}`}
    >
      {fx.slice(-3).map((f, i) => (
        <span key={f.id} className={`fx-float text-sm ${f.kind === 'heal' ? 'text-green-300' : f.kind === 'crit' ? 'text-yellow-300 text-lg' : f.kind === 'miss' ? 'text-sky-300' : f.kind === 'echo' ? 'text-teal-200 text-lg' : f.kind === 'status' ? 'text-purple-300 text-xs' : 'text-red-300'}`} style={{ top: `${-4 - i * 14}px` }}>{f.text}</span>
      ))}
      <div className="flex items-center gap-2">
        {u.uid === 'hero' ? <Icon name={s.aberration ? 'corruzione' : s.classId} size={46} /> : (artFor(u.defId) ? <img src={artFor(u.defId)} alt="" className={`rounded-full object-cover ${u.side === 'enemy' && !dead ? 'portrait-uncanny' : 'portrait-alive'} shrink-0 ${boss ? 'ring-2 ring-red-500/70' : 'ring-1 ring-ember/50'}`} style={{ width: boss ? 64 : 48, height: boss ? 64 : 48 }} /> : <Sigil emoji={u.icon} size={boss ? 56 : 44} tone={u.side === 'enemy' ? (boss ? 'blood' : 'ember') : 'teal'} />)}
        <div className="min-w-0 flex-1">
          <div className="text-xs text-bone truncate">{u.name}{u.row === 'back' ? <span className="text-[9px] text-mist">{' '}{T('· retrovia')}</span> : ''}</div>
          <Bar value={u.hp} max={u.maxHp} color={u.side === 'enemy' ? 'bg-gradient-to-r from-red-900 to-red-500' : 'bg-gradient-to-r from-emerald-800 to-emerald-500'} height="h-1.5" />
          <div className="text-[10px] text-mist">{Math.max(0, Math.round(u.hp))}/{u.maxHp}{u.tags.includes('liar') && (u.revealed || hasFlag(s, 'know_word')) ? T(' · 🎭 bugiardo') : ''}{u.tags.includes('listener') ? ' · 👂' : ''}</div>
        </div>
      </div>
      {u.companionId && (() => { const comp = s.companions.find(x => x.id === u.companionId); if (!comp) return null; const w = Math.round(comp.weight || 0); return (
        <div className="mt-1 flex items-center gap-1.5" title={T('Peso: a 100 il compagno si spezza o trova una Virtù')}>
          <span className="text-[9px] text-violet-300 w-8">{T('Peso')}</span>
          <div className="flex-1 h-1 bg-stone-800 rounded"><div className={`h-full rounded ${w >= 80 ? 'bg-gradient-to-r from-violet-600 to-red-500 animate-flicker' : 'bg-violet-600'}`} style={{ width: `${w}%` }} /></div>
          {comp.mood === 'broken' && <span className="text-[9px] text-red-300">💔 {T('Spezzato')}</span>}
          {comp.mood === 'virtue' && <span className="text-[9px] text-amber-200">✨ {T('Virtù')}</span>}
        </div>); })()}
      {u.statuses.length > 0 && <div className="flex flex-wrap gap-0.5 mt-1">{u.statuses.map((x, i) => <span key={i} className="text-[9px] px-1 rounded bg-black/60 border border-stone-700">{statusLabel(x.type)}{x.type === 'shield' ? ` ${x.pot}` : ''} {x.dur}</span>)}</div>}
      {intent && <div className="text-[10px] mt-1 text-orange-300 truncate">⚠️ {intent}</div>}
    </button>
  );
}

export default function Combat({ state: s, act }: { state: GameState; act: Act }) {
  const c = s.combat!;
  const [pending, setPending] = useState<Skill | null>(null);
  const [word, setWord] = useState('');
  const lastFx = useRef(0);
  const bossUnit = c.enemies.find(e => e.tags.includes('boss') && !e.tags.includes('world'));
  const [intro, setIntro] = useState<string | null>(bossUnit && c.round === 1 ? c.title : null);
  useEffect(() => { if (!intro) return; const tm = window.setTimeout(() => setIntro(null), 3200); return () => window.clearTimeout(tm); }, [intro]);
  const logRef = useRef<HTMLDivElement>(null);
  const speed = s.settings.fastCombat ? 250 : 750;
  const hero = c.party.find(p => p.uid === 'hero')!;
  const rmax = resonanceMax(s);
  const F = s.fardello ? FARDELLI[s.fardello] : null;

  // fase nemica e auto-battaglia
  useEffect(() => {
    if (intro) return;
    if (c.phase === 'enemy') { const t = window.setTimeout(() => act(d => enemyPhase(d)), speed); return () => window.clearTimeout(t); }
    if (c.phase === 'player' && heroStunned(s)) { const t = window.setTimeout(() => act(d => skipTurn(d)), speed + 300); return () => window.clearTimeout(t); }
    if (c.phase === 'player' && s.settings.autoBattle) { const t = window.setTimeout(() => act(d => autoAct(d)), speed + 150); return () => window.clearTimeout(t); }
  }, [c.phase, c.round, c.fx.length, s.settings.autoBattle, speed, act, intro]); // eslint-disable-line react-hooks/exhaustive-deps

  // suoni dagli effetti
  useEffect(() => {
    const fresh = c.fx.filter(f => f.id > lastFx.current);
    if (!fresh.length) return;
    lastFx.current = Math.max(...fresh.map(f => f.id));
    if (fresh.some(f => f.kind === 'echo')) sfx.echo();
    else if (fresh.some(f => f.kind === 'crit')) sfx.attack();
    else if (fresh.some(f => f.kind === 'dmg')) sfx.hit();
    else if (fresh.some(f => f.kind === 'heal')) sfx.heal();
  }, [c.fx]);
  useEffect(() => { if (c.phase === 'won') sfx.victory(); if (c.phase === 'lost') sfx.defeat(); }, [c.phase]);
  useEffect(() => { logRef.current?.scrollTo({ top: 99999 }); }, [c.log.length]);

  const choose = (sk: Skill) => {
    if (c.phase !== 'player') return;
    if (sk.target === 'enemy') {
      const legal = legalTargets(c, sk, 'enemy');
      if (legal.length <= 1) { act(d => playerAct(d, sk.id, legal[0]?.uid)); setPending(null); return; }
      setPending(sk); return;
    }
    if (sk.target === 'ally') {
      const allies = c.party.filter(p => p.hp > 0);
      if (allies.length <= 1) { act(d => playerAct(d, sk.id, 'hero')); return; }
      setPending(sk); return;
    }
    act(d => playerAct(d, sk.id));
    setPending(null);
  };
  const legalEnemy = pending?.target === 'enemy' ? new Set(legalTargets(c, pending, 'enemy').map(e => e.uid)) : new Set<string>();
  const targetAlly = pending?.target === 'ally';

  const coherenceOf = (sk: Skill) => {
    if (!F) return '';
    if (sk.natures.some(n => F.incoherent.includes(n))) return 'border-dissonance/70';
    if (sk.natures.some(n => F.coherent.includes(n))) return 'border-resonance/70';
    return 'border-stone-700';
  };
  const skills = hero.skills.map(id => getSkill(id)!).filter(Boolean);
  const mainSkills = skills.filter(sk => !DISSONANCE_SKILLS.includes(sk.id));
  const darkSkills = skills.filter(sk => DISSONANCE_SKILLS.includes(sk.id));
  const hasLiar = c.enemies.some(e => e.hp > 0 && e.tags.includes('liar'));
  const front = (arr: Combatant[]) => arr.filter(u => u.row === 'front');
  const back = (arr: Combatant[]) => arr.filter(u => u.row === 'back');
  const enemyRows = [back(c.enemies), front(c.enemies)].filter(r => r.length);
  const partyRows = [front(c.party), back(c.party)].filter(r => r.length);

  return (
    <div className="max-w-5xl mx-auto space-y-3">
      {intro && bossUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 animate-fade cursor-pointer" onClick={() => setIntro(null)}>
          <div className="text-center px-6 animate-rise max-w-lg">
            <div className="flex justify-center mb-4">{artFor(bossUnit.defId) ? <img src={artFor(bossUnit.defId)} alt="" className="rounded-full ring-2 ring-red-500/70 shadow-2xl object-cover portrait-uncanny" style={{ width: 220, height: 220 }} /> : <Sigil emoji={bossUnit.icon} size={120} tone="blood" />}</div>
            <p className="text-[10px] uppercase tracking-[0.5em] text-red-400">{T('Si risveglia')}</p>
            <h2 className="text-3xl sm:text-4xl text-gradient-ember my-2">{bossUnit.name}</h2>
            <p className="text-sm text-bone/80 italic">{ENEMIES[bossUnit.defId]?.lore}</p>
            <p className="text-[10px] text-mist mt-6">{T('Tocca per combattere')}</p>
          </div>
        </div>
      )}
      {(s.totals.kills || 0) === 0 && (
        <Tip id="combat" state={s} act={act} title={T('Il tuo primo scontro')}>
          <p>{rich(T('1. Tocca un\'**abilità**, poi il **nemico** da colpire. L\'attacco base dà Focus (◆), le abilità forti lo spendono.'))}</p>
          <p>{rich(T('2. Bordo **verde** = l\'azione è coerente col tuo Fardello e carica la Risonanza. Bordo **rosso** = gli è contraria e genera Dissonanza. Nessuna è sbagliata.'))}</p>
          <p>{T('3. Sotto ogni nemico (⚠) vedi la sua prossima mossa. Le pozioni non consumano il turno.')}</p>
        </Tip>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base sm:text-lg text-bone">{c.title}</h2>
        <div className="flex items-center gap-2 text-xs">
          <Tag>{T('Round')}{' '}{c.round}</Tag>
          {(c.chain || 0) >= 2 && <Tag className="border-resonance text-resonance animate-pulseGlow">{T('🔗 Catena ×{n}', { n: c.chain })}</Tag>}
          {c.kind === 'boss' && <Tag className="border-red-700 text-red-300">{T('Scacchiera del boss')}</Tag>}
          {isUnlocked(s, 'f_auto') && <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={s.settings.autoBattle} onChange={() => act(d => { d.settings.autoBattle = !d.settings.autoBattle; })} />{T('Auto')}</label>}
          <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={s.settings.fastCombat} onChange={() => act(d => { d.settings.fastCombat = !d.settings.fastCombat; })} />{T('Veloce')}</label>
        </div>
      </div>

      {/* Nemici */}
      <div className="space-y-2">
        {enemyRows.map((row, ri) => (
          <div key={ri} className={`grid gap-2 ${row.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : row.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
            {row.map(e => <Unit key={e.uid} u={e} s={s} targetable={legalEnemy.has(e.uid) && e.hp > 0} onClick={() => { if (pending) { act(d => playerAct(d, pending.id, e.uid)); setPending(null); } }} />)}
          </div>
        ))}
      </div>

      <div className="text-center text-[11px] text-mist">
        {c.phase === 'player' ? (pending ? T('Scegli il bersaglio per {pendingName}{fila} · ', { pendingName: pending.name, fila: pending.melee ? ' (in mischia: solo prima fila)' : '' }) : T('⚔️ Il tuo turno')) : c.phase === 'enemy' ? T('…i nemici agiscono…') : ''}
        {pending && <button className="underline" onClick={() => setPending(null)}>{T('annulla')}</button>}
      </div>

      {/* Gruppo */}
      <div className="space-y-2">
        {partyRows.map((row, ri) => (
          <div key={ri} className={`grid gap-2 ${row.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : row.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {row.map(p => <Unit key={p.uid} u={p} s={s} targetable={targetAlly && p.hp > 0} onClick={() => { if (pending) { act(d => playerAct(d, pending.id, p.uid)); setPending(null); } }} />)}
          </div>
        ))}
      </div>

      {/* Barre narrative */}
      <div className="grid grid-cols-3 gap-2 text-[11px]">
        <Bar value={s.resonance} max={rmax} color={`bg-resonance ${s.resonance >= rmax ? 'res-glow' : ''}`} label={<><span className="text-resonance">{T('◈ Risonanza')}</span><span>{Math.floor(s.resonance)}/{rmax}</span></>} />
        <Bar value={s.dissonance} max={15} color="bg-dissonance" label={<><span className="text-dissonance">{T('〰 Dissonanza')}</span><span>{Math.floor(s.dissonance)}/15</span></>} />
        <Bar value={c.focus} max={5} color="bg-amber-500" label={<><span className="text-amber-300">{T('◆ Focus')}</span><span>{c.focus}/5</span></>} />
      </div>

      {/* Azioni */}
      {c.phase !== 'won' && c.phase !== 'lost' && (
        <div className="panel rounded-xl p-3 space-y-2">
          {F && (
            <button disabled={s.resonance < rmax || c.phase !== 'player'} onClick={() => act(d => useEcho(d))} className={`w-full rounded-lg border p-2 text-left transition ${s.resonance >= rmax ? 'border-resonance bg-teal-900/30 res-glow' : 'border-stone-800 opacity-40'}`}>
              <span className="text-sm text-teal-200">✨ {F.echoName}</span> <span className="text-[11px] text-mist">— {F.echoDesc}</span>
            </button>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {mainSkills.map(sk => {
              const ok = canUseSkill(s, sk.id);
              return (
                <button key={sk.id} disabled={!ok.ok || c.phase !== 'player'} onClick={() => choose(sk)} title={T('{desc} · natura: {n}', { desc: sk.desc, n: sk.natures.map(n => NATURE_LABEL[n]).join(', ') })}
                  className={`rounded-lg border ${coherenceOf(sk)} bg-black/40 p-2 text-left disabled:opacity-35 hover:bg-white/5 ${pending?.id === sk.id ? 'ring-2 ring-ember' : ''}`}>
                  <div className="text-sm text-bone flex items-center gap-2">{artFor('skill_' + sk.id) ? <Icon name={'skill_' + sk.id} size={34} /> : sk.icon} <span>{sk.name}</span></div>
                  <div className="text-[10px] text-mist">{sk.focusCost ? `◆${sk.focusCost} ` : ''}{sk.focusGain ? '+1◆ ' : ''}{ok.why || sk.natures.map(n => NATURE_LABEL[n]).join('·')}</div>
                </button>
              );
            })}
          </div>
          {isUnlocked(s, 'f_dark') && <details className="text-xs">
            <summary className="cursor-pointer text-dissonance/90">{T('〰 Azioni di Dissonanza (potenti, destabilizzanti)')}</summary>
            <div className="grid sm:grid-cols-3 gap-2 mt-2">
              {darkSkills.map(sk => { const ok = canUseSkill(s, sk.id); return (
                <button key={sk.id} disabled={!ok.ok || c.phase !== 'player'} onClick={() => choose(sk)} className="rounded-lg border border-red-900 bg-red-950/30 p-2 text-left disabled:opacity-35">
                  <div className="text-sm text-red-200 flex items-center gap-2">{artFor('skill_' + sk.id) ? <Icon name={'skill_' + sk.id} size={34} /> : sk.icon} <span>{sk.name}</span></div>
                  <div className="text-[10px] text-mist">{ok.why || sk.desc}</div>
                </button>
              ); })}
            </div>
          </details>}
          <div className="flex flex-wrap gap-2 items-center">
            <Btn small kind="good" disabled={s.potions < 1 || c.phase !== 'player' || (hero.cds['__potion'] || 0) > 0} onClick={() => act(d => usePotion(d))}>{T('🧪 Pozione (')}{s.potions})</Btn>
            <Btn small disabled={c.phase !== 'player' || c.repositioned} onClick={() => act(d => reposition(d))}>↔️ {hero.row === 'front' ? T('Arretra') : T('Avanza')}</Btn>
            {F && hasLiar && !c.wordUsed && (hasFlag(s, 'know_word') || s.hero.level >= 4) && (
              <span className="flex items-center gap-1">
                <input value={word} onChange={e => setWord(e.target.value)} placeholder={T('Parola d\'Ordine…')} className="bg-black/60 border border-fate/50 rounded px-2 py-1 text-xs w-32" />
                <Btn small kind="fate" disabled={!word || c.phase !== 'player'} onClick={() => { act(d => { speakWord(d, word); }); setWord(''); }}>{T('Pronuncia')}</Btn>
                {hasFlag(s, 'know_word') && <span className="text-[10px] text-fate">(è «{F.secretWord}»)</span>}
              </span>
            )}
            {c.kind !== 'boss' && c.kind !== 'trial' && c.kind !== 'shadow' && <Btn small kind="ghost" onClick={() => act(d => fleeCombat(d))}>{c.kind === 'worldboss' ? T('Ritirati') : T('🏃 Fuggi (perdi metà bisaccia)')}</Btn>}
          </div>
        </div>
      )}

      {(c.phase === 'won' || c.phase === 'lost') && (
        <div className={`panel rounded-xl p-4 text-center animate-rise ${c.phase === 'won' ? 'border-resonance/60' : 'border-dissonance/60'}`}>
          <h3 className="text-xl mb-1">{c.kind === 'worldboss' ? T('🗻 Fine dello scontro') : c.phase === 'won' ? T('🏆 Vittoria') : T('☠️ Sconfitta')}</h3>
          <p className="text-xs text-mist mb-3">{c.kind === 'worldboss' ? T('Danni inflitti: {damageDealt}', { damageDealt: c.damageDealt }) : c.phase === 'won' ? c.enemies.map(e => ENEMIES[e.defId]?.lore).filter(Boolean)[0] : T('La valle ti riporta in superficie, più povero.')}</p>
          <Btn kind={c.phase === 'won' ? 'good' : 'bad'} onClick={() => act(d => finishCombat(d))}>{T('Continua')}</Btn>
        </div>
      )}

      <div ref={logRef} className="panel rounded-xl p-2 h-28 overflow-y-auto text-[11px] text-bone/70 space-y-0.5">
        {c.log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}
