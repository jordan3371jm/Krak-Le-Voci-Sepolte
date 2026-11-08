import { useState } from 'react';
import { LANGS, getLang, setLang, t as T, type Lang } from '../i18n';
import { Icon } from './icons';

// Selettore lingua: icona universale (globo) e nomi delle lingue nella lingua stessa (requisito Playgama 3.4.4)
/** Tutte le lingue visibili insieme, senza tendina (Opzioni e menu). */
export function LangGrid({ onBeforeChange }: { onBeforeChange?: () => void }) {
  const cur = getLang();
  return (
    <div>
      <div className="grid grid-cols-3 gap-1.5">
        {LANGS.map(l => (
          <button key={l.id} onClick={() => { if (l.id === cur) return; onBeforeChange?.(); setLang(l.id); location.reload(); }}
            className={`flex flex-col items-center gap-0.5 rounded-lg border px-1 py-1.5 text-[11px] leading-tight transition ${l.id === cur ? 'border-amber-500 bg-amber-900/40 text-amber-100' : 'border-stone-700 text-bone hover:border-amber-500/60 hover:bg-white/5'}`}>
            <span className="text-lg">{l.flag}</span><span>{l.name}</span>
          </button>
        ))}
      </div>
      <p className="text-[10px] text-mist mt-1.5">{T('Il gioco si ricarica per cambiare lingua.')}</p>
    </div>
  );
}

export function LangPicker({ onBeforeChange, compact }: { onBeforeChange?: () => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const cur = LANGS.find(l => l.id === getLang())!;
  const choose = (l: Lang) => {
    if (l === getLang()) { setOpen(false); return; }
    onBeforeChange?.();
    setLang(l);
    location.reload();
  };
  return (
    <div className="relative inline-block">
      <button onClick={() => setOpen(!open)} title="Language" className={`flex items-center gap-2 rounded-full border border-stone-700 hover:border-amber-500/70 ${compact ? 'p-1' : 'px-3 py-1.5'}`}>
        <Icon name="globo" size={compact ? 28 : 26} plain={compact} />
        {!compact && <span className="text-sm text-bone">{cur.flag} {cur.name}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-amber-800/60 bg-black/95 p-1 shadow-2xl">
          {LANGS.map(l => (
            <button key={l.id} onClick={() => choose(l.id)} className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${l.id === cur.id ? 'bg-amber-900/40 text-amber-100' : 'text-bone hover:bg-white/5'}`}>
              <span>{l.flag}</span><span>{l.name}</span>
            </button>
          ))}
          <p className="text-[10px] text-mist px-3 py-1">{T('Il gioco si ricarica per cambiare lingua.')}</p>
        </div>
      )}
    </div>
  );
}
