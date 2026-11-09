import { t as T } from '../i18n';
import { useEffect, useRef, useState } from 'react';
import type { GameState } from '../game/types';
import type { Act } from '../game/useGame';
import { BUILDINGS } from '../game/data/world';
import { displayName, fmtTime, valleyFx, valleyState } from '../game/engine/state';
import { buildingUnlocked, clickCart, clickDeer, hitThreat, totalBuildings } from '../game/engine/village';
import { sfx } from '../game/audio';
import { BG } from './art';
import { Icon } from './icons';
import { Face } from './Talk';

// Dove sorge ogni edificio nel panorama dipinto di Hondovalle (percentuali).
const SPOT: Record<string, { x: number; y: number }> = {
  segheria: { x: 27, y: 64 }, capanna: { x: 35, y: 63 }, bottega: { x: 46.5, y: 72 }, cava: { x: 84, y: 74 },
  fucina: { x: 61, y: 61 }, altare: { x: 59, y: 41 }, infermeria: { x: 68, y: 79 }, locanda: { x: 41, y: 48 },
  torre: { x: 70, y: 42 }, boschi: { x: 8, y: 56 }, rovine: { x: 80.5, y: 38 }, miniere: { x: 77, y: 25 },
};

// Una illustrazione per ogni fase di crescita del villaggio (se presente), con le sue posizioni.
const STAGE_SPOTS: Record<string, Record<string, { x: number; y: number }>> = {};
function stageOf(total: number) { return total === 0 ? 1 : total < 15 ? 2 : total < 60 ? 3 : 4; }
export function villageArt(total: number) {
  for (let st = stageOf(total); st >= 1; st--) { const k = 'villaggio_' + st; if (BG[k]) return { img: BG[k], spots: STAGE_SPOTS[k] || SPOT }; }
  return { img: BG.villaggio, spots: SPOT };
}

export function scrollToBuilding(id: string) {
  const el = document.getElementById('b-' + id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.remove('flash-target'); void el.offsetWidth; el.classList.add('flash-target');
}

function Bird({ d, top, s }: { d: number; top: number; s: number }) {
  return (
    <svg aria-hidden viewBox="0 0 40 16" className="crow absolute pointer-events-none" style={{ top: `${top}%`, width: 26 * s, animationDuration: `${d}s` }}>
      <path d="M0 8 Q10 0 20 8 Q30 0 40 8 Q30 4 20 12 Q10 4 0 8Z" fill="#050405" />
    </svg>
  );
}

export function VillageScene({ state: s, act }: { state: GameState; act: Act }) {
  const now = Date.now();
  const [, tick] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = scroller.current; if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2; }, []);
  const [stalker, setStalker] = useState<{ id: number; x: number } | null>(null);
  useEffect(() => { const i = window.setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(i); }, []);
  // Una figura immobile tra gli alberi morti, per un istante.
  useEffect(() => {
    if (s.settings.reduceFx) return;
    let tm = 0;
    const go = () => { tm = window.setTimeout(() => { setStalker({ id: Date.now(), x: Math.random() < 0.5 ? 4 + Math.random() * 10 : 86 + Math.random() * 9 }); go(); }, (25 + Math.random() * 40) * 1000); };
    go();
    return () => clearTimeout(tm);
  }, [s.settings.reduceFx]);

  const vs = valleyState(s);
  const VE = valleyFx(s);
  const total = totalBuildings(s);
  const art = villageArt(total);
  const souls = 3 + total * 3 + s.companions.filter(c => c.recruited && !c.left).length;
  const blight = s.valley.blight;
  const TH = s.events.threat;
  const night = vs === 'Eclisse' || s.corruption >= 60;
  const tint = vs === 'Cenere' ? 'rgba(160,40,10,.38)' : vs === 'Corruzione' ? 'rgba(90,20,110,.35)' : vs === 'Eclisse' ? 'rgba(20,20,70,.55)' : vs === 'Fioritura' || vs === 'Rinascita' ? 'rgba(200,120,40,.12)' : 'rgba(0,0,0,0)';
  const companions = s.companions.filter(c => c.recruited && !c.mission && !c.left);
  const subtitle = total === 0 ? T('Solo cenere e un fuoco morente. Ricostruisci.') : total < 15 ? T('Il villaggio rinasce, una trave alla volta.') : total < 60 ? T('Hondovalle vive di nuovo. I bambini corrono tra le case.') : T('Hondovalle è diventata la capitale della valle.');

  return (
    <section className={`hamlet relative rounded-2xl overflow-hidden ${TH ? 'hamlet-raid' : ''} ${s.corruption >= 60 && !s.settings.reduceFx ? 'hamlet-corrupt' : ''}`}>
      {/* Panorama */}
      <div className="hamlet-stage relative w-full">
        <div ref={scroller} className="hamlet-scroll absolute inset-0 no-scrollbar"><div className="hamlet-canvas relative h-full">
        <div aria-hidden className={`absolute inset-0 bg-cover bg-center ${s.settings.reduceFx ? '' : 'hamlet-pan'}`} style={{ backgroundImage: `url(${art.img})`, filter: `saturate(${0.75 + Math.min(total, 40) / 160}) brightness(${night ? 0.55 : 0.8 + Math.min(total, 40) / 200})` }} />
        <div aria-hidden className="absolute inset-0" style={{ background: tint, mixBlendMode: 'multiply' }} />
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,transparent_35%,rgba(4,3,5,.85)_100%)]" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/80" />
        {!s.settings.reduceFx && <div aria-hidden className="absolute inset-0 overflow-hidden"><div className="fog fog-a" /><div className="fog fog-b" /></div>}
        {/* Braci che salgono dal villaggio */}
        {!s.settings.reduceFx && <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 16 }, (_, i) => <span key={i} className="hamlet-ember" style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i * 1.7) % 9}s`, animationDuration: `${7 + (i % 5) * 1.6}s` }} />)}
          {[0, 1, 2].map(i => <Bird key={i} d={26 + i * 9} top={8 + i * 7} s={0.7 + i * 0.25} />)}
        </div>}
        {/* Case bruciate quando la valle marcisce */}
        {blight > 55 && <div aria-hidden className="absolute inset-0 hamlet-burn pointer-events-none" style={{ opacity: Math.min(1, (blight - 55) / 35) }} />}

        {/* Luci alle finestre: più edifici, più vita */}
        {BUILDINGS.filter(b => (s.village.buildings[b.id] || 0) > 0 && art.spots[b.id]).map(b => (
          <span key={'l' + b.id} aria-hidden className="hamlet-light" style={{ left: `${art.spots[b.id].x}%`, top: `${art.spots[b.id].y}%`, ['--w' as any]: `${Math.min(110, 46 + (s.village.buildings[b.id] || 0) * 3)}px` }} />
        ))}

        {/* La figura tra gli alberi */}
        {stalker && <div key={stalker.id} aria-hidden className="stalker absolute pointer-events-none" style={{ left: `${stalker.x}%`, bottom: '18%' }}>
          <svg viewBox="0 0 30 90" width="22"><path d="M15 4 C9 4 8 12 10 17 C5 20 4 32 5 48 L7 86 L12 86 L14 56 L16 56 L18 86 L23 86 L25 48 C26 32 25 20 20 17 C22 12 21 4 15 4Z" fill="#030203" /><circle cx="12.5" cy="11" r="1.1" fill="#ff5a2a" /><circle cx="17.5" cy="11" r="1.1" fill="#ff5a2a" /></svg>
        </div>}

        {/* Edifici sulla mappa */}
        {BUILDINGS.filter(b => art.spots[b.id] && buildingUnlocked(s, b.id)).map(b => {
          const n = s.village.buildings[b.id] || 0;
          return (
            <button key={b.id} onClick={() => { sfx.click(); scrollToBuilding(b.id); }} title={`${b.name}${n ? ` ×${n}` : ''}`}
              className={`hamlet-pin group ${n ? 'built' : 'ghost'}`} style={{ left: `${art.spots[b.id].x}%`, top: `${art.spots[b.id].y}%` }}>
              <span className="hamlet-pin-ring relative"><Icon name={b.id} size={n ? 44 : 34} />
                {n > 0 && <span className="hamlet-pin-count">{n}</span>}
                {!n && <span className="hamlet-pin-count ghost">+</span>}</span>
              <span className="hamlet-pin-label">{b.name}</span>
            </button>
          );
        })}

        {/* Il fuoco del portatore */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[4%] flex items-end gap-1 sm:gap-2 z-[3]">
          {companions.slice(0, 2).map(c => <span key={c.id} title={c.name} className="hidden sm:block"><Face id={c.id} emoji={c.icon} size={40} tone="teal" /></span>)}
          <div className="relative flex flex-col items-center">
            <span aria-hidden className="campfire" />
            <span title={displayName(s)} className="relative z-[1]"><Icon name={s.aberration ? 'corruzione' : s.classId} size={56} /></span>
          </div>
          {companions.slice(2, 4).map(c => <span key={c.id} title={c.name} className="hidden sm:block"><Face id={c.id} emoji={c.icon} size={40} tone="teal" /></span>)}
        </div>

        {/* Eventi del villaggio, dentro la scena */}
        {s.events.cart > now && (
          <button onClick={() => { sfx.coin(); act(d => clickCart(d)); }} className="hamlet-event absolute left-[14%] bottom-[16%] z-[4]">
            <Icon name="merchant" size={52} /><span className="hamlet-event-label">{T('Un mercante è arrivato!')} · {fmtTime(s.events.cart - now)}</span>
          </button>
        )}
        {s.events.deer > now && (
          <button onClick={() => { sfx.resonance(); act(d => clickDeer(d)); }} className="absolute right-[24%] top-[30%] z-[4] deer-ghost" title={T('Il Cervo di Cenere!')}>
            <span className="text-4xl sm:text-5xl">🦌</span>
          </button>
        )}

        </div></div>
        {/* Intestazione */}
        <div className="absolute left-0 top-0 p-3 sm:p-5 z-[5] max-w-[70%] pointer-events-none">
          <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.45em] text-amber-200/70">{T('Il villaggio')}</p>
          <h2 className="font-display text-2xl sm:text-4xl text-gradient-ember title-beat leading-none drop-shadow-[0_2px_8px_#000]">{T('Hondovalle Bassa')}</h2>
          <p className="text-[11px] sm:text-sm text-bone/80 italic mt-1 drop-shadow-[0_1px_4px_#000]">{subtitle}</p>
        </div>
        <div className="absolute right-0 top-0 p-3 sm:p-5 z-[5] flex flex-col items-end gap-1.5">
          <span className={`hamlet-chip ${VE.color}`} title={VE.desc}>{T(vs)}</span>
          {s.events.buffs.filter(b => b.until > now).map(b => <span key={b.id} className="hamlet-chip text-fate">{b.label} · {fmtTime(b.until - now)}</span>)}
        </div>

        {/* Incursione: la scena si tinge di sangue */}
        {TH && (
          <div className="absolute inset-x-0 bottom-0 z-[6] p-3 sm:p-4 bg-gradient-to-t from-red-950/95 via-red-950/70 to-transparent">
            <div className="flex items-center gap-3 max-w-xl mx-auto">
              <span className="raid-foe"><Icon name={TH.icon} size={58} /></span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-xs sm:text-sm text-red-100"><b className="font-display">{T('Incursione: {name}', { name: TH.name })}</b><span>{fmtTime(TH.until - now)}</span></div>
                <div className="h-2.5 rounded-full bg-black/70 border border-red-900 overflow-hidden mt-1"><div className="h-full bg-gradient-to-r from-red-800 to-red-500 transition-all" style={{ width: `${(TH.hp / TH.maxHp) * 100}%` }} /></div>
                <button onClick={() => { sfx.hit(); act(d => hitThreat(d)); }} className="mt-2 w-full rounded-lg border border-red-500/70 bg-red-900/60 hover:bg-red-800/80 py-1.5 text-sm text-red-50 font-display tracking-wider">
                  {T('⚔️ Colpisci!')} {s.village.buildings.torre ? T('(le {torre} torri aiutano)', { torre: s.village.buildings.torre }) : ''}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stato della valle */}
      <div className="hamlet-foot relative z-[8] grid grid-cols-2 sm:grid-cols-4 gap-px">
        <Stat label={T('Anime')} value={String(souls)} icon="compagni" />
        <Meter label={T('Prosperità')} v={s.valley.prosperity} color="from-amber-700 to-amber-300" icon="villaggio" />
        <Meter label={T('Tensione')} v={s.valley.tension} color="from-yellow-800 to-yellow-400" icon="fazioni" />
        <Meter label={T('Piaga')} v={blight} color="from-red-900 to-red-500" icon="corruzione" warn={blight >= 50} />
      </div>
    </section>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-black/60">
      <Icon name={icon} size={30} />
      <div><div className="text-[9px] uppercase tracking-[0.25em] text-mist">{label}</div><div className="font-display text-lg text-amber-100 leading-none">{value}</div></div>
    </div>
  );
}
function Meter({ label, v, color, icon, warn }: { label: string; v: number; color: string; icon: string; warn?: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 bg-black/60 ${warn ? 'animate-pulse' : ''}`}>
      <Icon name={icon} size={30} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-[9px] uppercase tracking-[0.25em] text-mist"><span>{label}</span><span className="text-bone/80">{Math.round(v)}</span></div>
        <div className="h-1.5 rounded-full bg-stone-900 overflow-hidden mt-1"><div className={`h-full bg-gradient-to-r ${color}`} style={{ width: `${Math.max(2, Math.min(100, v))}%` }} /></div>
      </div>
    </div>
  );
}
