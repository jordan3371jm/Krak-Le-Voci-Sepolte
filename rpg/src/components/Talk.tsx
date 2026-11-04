import { t as T } from '../i18n';
import { useEffect, useRef } from 'react';
import type { GameState } from '../game/types';
import type { Act } from '../game/useGame';
import { DIALOGUES, TALKERS, type DChoice } from '../game/data/dialogues';
import { CHECK_NAME, checkBonus, chooseTalk, endTalk, npcHasNews, startTalk, talkerVisible, visibleChoices, activeQuests } from '../game/engine/dialogue';
import { FARDELLI, CLASSES, FACTIONS } from '../game/data/core';
import { displayName } from '../game/engine/state';
import { sfx } from '../game/audio';
import { Panel } from './ui';
import { Sigil } from './icons';

function tagFor(s: GameState, c: DChoice): { label: string; cls: string } | null {
  if (c.check) {
    const b = checkBonus(s, c.check.skill);
    const chance = Math.max(5, Math.min(95, Math.round(((21 - (c.check.dc - b)) / 20) * 100)));
    return { label: `🎲 ${CHECK_NAME[c.check.skill]} · ${T('CD')} ${c.check.dc} · ${chance}%`, cls: 'border-sky-500/60 text-sky-200' };
  }
  if (c.req?.fardello) return { label: FARDELLI[c.req.fardello].name, cls: 'border-fate/60 text-purple-200' };
  if (c.req?.classId) return { label: CLASSES[c.req.classId].name, cls: 'border-amber-500/60 text-amber-200' };
  return null;
}

export function TalkOverlay({ state: s, act }: { state: GameState; act: Act }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [s.talk?.log.length]);
  if (!s.talk) return null;
  const tk = TALKERS.find(x => x.id === s.talk!.npc)!;
  const choices = visibleChoices(s);
  return (
    <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-6">
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl border border-ember/40 bg-gradient-to-b from-stone-950 to-black shadow-2xl animate-rise">
        <div className="flex items-center gap-3 p-4 border-b border-stone-800">
          <Sigil emoji={tk.icon} size={56} tone={tk.tone as any} />
          <div className="flex-1">
            <div className="text-lg text-bone font-display">{tk.name}</div>
            <div className="text-xs text-mist">{tk.title}{tk.faction ? ` · ${FACTIONS[tk.faction].name}` : ''}</div>
          </div>
          <button className="text-mist hover:text-bone text-sm px-2" onClick={() => act(d => endTalk(d))}>✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-[15px] leading-relaxed">
          {s.talk.log.map((l, i) => (
            l.who === 'player' ? <div key={i} className="text-right text-ember/90 italic">— {l.text}</div>
            : l.who === 'roll' ? <div key={i} className={`text-center text-xs font-mono rounded-md py-1 ${l.text.includes(T('Successo')) || l.text.includes(T('SUCCESSO CRITICO')) ? 'bg-teal-950/60 text-teal-200' : 'bg-red-950/60 text-red-200'}`}>{l.text}</div>
            : l.who === 'approval' ? <div key={i} className="text-center text-xs text-amber-200/90">{l.text}</div>
            : <div key={i} className={`text-bone/90 ${i === s.talk!.log.length - 1 ? '' : 'opacity-70'}`}>{l.text.replace(/\{name\}/g, displayName(s))}</div>
          ))}
          <div ref={end} />
        </div>
        <div className="p-3 border-t border-stone-800 space-y-1.5">
          {choices.map(({ c, i, ok }) => {
            const tag = tagFor(s, c);
            return (
              <button key={i} disabled={!ok} onClick={() => { sfx.click?.(); act(d => chooseTalk(d, i)); }}
                className="w-full text-left rounded-lg border border-stone-700 hover:border-ember/70 hover:bg-white/5 disabled:opacity-40 px-3 py-2 text-sm text-bone flex flex-wrap gap-2 items-center">
                <span className="text-ember">{i + 1}.</span>
                {tag && <span className={`text-[10px] uppercase tracking-wide border rounded px-1.5 py-0.5 ${tag.cls}`}>{tag.label}</span>}
                <span className="flex-1 min-w-[50%]">{c.text.replace(/\{name\}/g, displayName(s))}</span>
                {!ok && <span className="text-[10px] text-red-300">{T('Requisito mancante')}</span>}
              </button>
            );
          })}
          {!choices.length && <button className="w-full rounded-lg border border-stone-700 px-3 py-2 text-sm" onClick={() => act(d => endTalk(d))}>{T('Fine')}</button>}
        </div>
      </div>
    </div>
  );
}

export function TalkersPanel({ state: s, act }: { state: GameState; act: Act }) {
  const list = TALKERS.filter(tk => talkerVisible(s, tk.id) && DIALOGUES[tk.id]);
  if (!list.length) return null;
  return (
    <Panel title={T('Personaggi e storie')} icon="compagni">
      <div className="space-y-2">
        {list.map(tk => {
          const news = npcHasNews(s, tk.id);
          return (
            <button key={tk.id} onClick={() => act(d => startTalk(d, tk.id))} className="w-full text-left flex gap-2 items-start rounded-lg p-2 hover:bg-white/5 border border-transparent hover:border-ember/40">
              <Sigil emoji={tk.icon} size={40} tone={tk.tone as any} />
              <div className="flex-1">
                <div className="text-sm text-bone">{tk.name} <span className="text-[10px] text-mist">· {tk.title}</span> {news && <span className="ml-1 text-[10px] bg-ember text-black rounded px-1">{T('! nuovo')}</span>}</div>
                <p className="text-xs text-bone/60 italic">{tk.bio}</p>
              </div>
              <span className="text-xs text-ember self-center">{T('Parla')} ›</span>
            </button>
          );
        })}
      </div>
      <QuestLog state={s} />
    </Panel>
  );
}

export function QuestLog({ state: s }: { state: GameState }) {
  const qs = activeQuests(s);
  if (!qs.length) return null;
  return (
    <div className="mt-3 border-t border-stone-800 pt-2 space-y-2">
      <div className="text-xs uppercase tracking-widest text-mist">{T('📜 Missioni')}</div>
      {qs.sort((a, b) => Number(!!a.done) - Number(!!b.done)).map(q => (
        <div key={q.id} className={`text-xs rounded-md p-2 border ${q.done ? 'border-stone-800 text-mist' : 'border-ember/30 text-bone'}`}>
          <div className="font-semibold">{q.done ? '✔ ' : '◆ '}{q.def.title}</div>
          <div className="opacity-80">{q.done ? (q.outcome || q.def.stages[99]) : q.def.stages[q.stage]}</div>
        </div>
      ))}
    </div>
  );
}
