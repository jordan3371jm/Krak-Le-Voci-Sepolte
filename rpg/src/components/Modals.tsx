import { pick } from './art';
import { t as T } from '../i18n';
import { useEffect } from 'react';
import type { GameState } from '../game/types';
import type { Act } from '../game/useGame';
import { FARDELLI } from '../game/data/core';
import { choiceAvailable, findEvent } from '../game/engine/delve';
import { applyEffect, trialRespond, trialScores } from '../game/engine/meta';
import { addFlag, fillText } from '../game/engine/state';
import { heartbeat, sfx } from '../game/audio';
import { Btn, Modal } from './ui';
import { Icon } from './icons';
import { adMode, showRewarded } from '../game/platform';
import { addRes, toast } from '../game/engine/state';

export default function Modals({ state: s, act }: { state: GameState; act: Act }) {
  const m = s.modal;
  const moral = m?.kind === 'event' || m?.kind === 'trial';
  useEffect(() => { heartbeat(!!moral); return () => heartbeat(false); }, [moral]);
  if (!m) return null;
  const close = () => act(d => { d.modal = null; });

  if (m.kind === 'event' && m.eventId) {
    const ev = findEvent(m.eventId);
    if (!ev) { close(); return null; }
    return (
      <Modal>
        <div className="flex justify-center mb-2"><Icon name={pick('evento_', ev.id, ev.icon)} size={72} /></div>
        <h2 className="text-xl text-center text-bone mb-1">{ev.title}</h2>
        <p className="text-[11px] text-center text-mist mb-3">{T('Il mondo ricorda. Una conseguenza ti aspettava al villaggio.')}</p>
        <p className="text-sm text-bone/85 italic mb-4">{fillText(s, ev.text)}</p>
        <div className="space-y-2">
          {ev.choices.map((c, i) => {
            const av = choiceAvailable(s, c);
            if (c.req?.fullscreen && !s.fullscreen) return null;
            return (
              <Btn key={i} className="w-full text-left" disabled={!av.ok} onClick={() => {
                sfx.chain();
                act(d => {
                  addFlag(d, `ev_${ev.id}`);
                  d.modal = { kind: 'info', title: ev.title, text: fillText(d, c.result) };
                  applyEffect(d, c.effect, `${ev.title}: ${fillText(d, c.text)}`);
                });
              }}>{fillText(s, c.text)}{!av.ok && av.why ? <span className="text-[10px] text-dissonance"> · {av.why}</span> : null}</Btn>
            );
          })}
        </div>
      </Modal>
    );
  }

  if (m.kind === 'trial') {
    const sc = trialScores(s);
    const F = s.fardello ? FARDELLI[s.fardello] : null;
    return (
      <Modal wide>
        <div className="flex justify-center mb-2"><Icon name="fazioni" size={80} /></div>
        <h2 className="text-2xl text-center text-bone">{T('Il Processo alle Proprie Scelte')}</h2>
        <p className="text-sm text-center text-bone/70 italic mb-4">{T('Ti svegli in un\'aula di pietra. I giudici hanno il tuo volto.')}{' '}{F ? T('Il testimone principale è {FName}.', { FName: F.name }) : ''}{' '}{T('Le tue Echi siedono tra il pubblico.')}</p>
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg border border-dissonance/50 p-3"><h4 className="text-sm text-dissonance mb-1">{T('Accuse')}</h4>{sc.acc.length ? sc.acc.map((a, i) => <p key={i} className="text-xs text-bone/80">• {a}</p>) : <p className="text-xs text-mist">{T('Nessuna accusa grave.')}</p>}</div>
          <div className="rounded-lg border border-resonance/50 p-3"><h4 className="text-sm text-resonance mb-1">{T('Difese')}</h4>{sc.def.length ? sc.def.map((a, i) => <p key={i} className="text-xs text-bone/80">• {a}</p>) : <p className="text-xs text-mist">{T('Nessuna difesa.')}</p>}</div>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          <Btn onClick={() => act(d => trialRespond(d, 'confessare'))}>{T('🙇 Confessare tutto')}</Btn>
          <Btn onClick={() => act(d => trialRespond(d, 'difendersi'))}>{T('🛡️ Difendersi (rischi lo scontro)')}</Btn>
          <Btn kind="bad" onClick={() => act(d => trialRespond(d, 'rinnegare'))}>{T('💔 Rinnegare il Fardello (rottura)')}</Btn>
          <Btn kind="fate" onClick={() => act(d => trialRespond(d, 'accettare'))}>{T('⛓️ Accettare la condanna')}</Btn>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={close}>
      {m.title && <h2 className="text-xl text-bone mb-2 text-center">{m.title}</h2>}
      {m.text && <p className="text-sm text-bone/85 whitespace-pre-line mb-3">{m.text}</p>}
      {m.lines?.map((l, i) => <p key={i} className="text-xs text-bone/70 mb-1">{l}</p>)}
      {m.kind === 'welcome' && m.double && (
        <div className="mt-3 rounded-lg border border-amber-600/50 bg-amber-950/30 p-3 text-center">
          <p className="text-xs text-amber-100 mb-2">{adMode() === 'none' ? T('La valle ti offre un dono di bentornato: +50% di ciò che ha prodotto mentre eri via.') : T('Guarda una breve pubblicità per raddoppiare ciò che la valle ha prodotto mentre eri via.')}</p>
          <Btn kind="ember" onClick={() => { const g = adMode() === 'none' ? Object.fromEntries(Object.entries(m.double!).map(([k, v]) => [k, Math.floor((v || 0) / 2)])) : m.double!; showRewarded('double_offline').then(ok => { if (ok) act(d => { addRes(d, g, false); d.modal = null; if (adMode() !== 'none') toast(d, T('✨ Produzione offline raddoppiata!'), 'good'); }); }); }}>{adMode() === 'none' ? T('🎁 Accetta il dono (+50%)') : T('📺 Raddoppia (pubblicità)')}</Btn>
        </div>
      )}
      <div className="text-center mt-4"><Btn kind="ember" onClick={close}>{T('Continua')}</Btn></div>
    </Modal>
  );
}
