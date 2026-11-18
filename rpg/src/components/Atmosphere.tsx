import { t as T } from '../i18n';
import { useEffect, useRef, useState } from 'react';

// ============================================================
// Atmosfera: cenere che cade, braci, nebbia, sussurri ai margini
// e occhi nel buio. Tutto leggero e disattivabile (Riduci animazioni).
// ============================================================

export type AtmoMode = 'village' | 'delve' | 'portal' | 'combat';

interface P { x: number; y: number; r: number; vx: number; vy: number; a: number; ember: boolean; ph: number }

export function Particles({ mode, tint = '255,140,60', intensity = 1 }: { mode: AtmoMode; tint?: string; intensity?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    let w = 0, h = 0, raf = 0, last = performance.now();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => { w = window.innerWidth; h = window.innerHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize(); window.addEventListener('resize', resize);
    const n = Math.round((w < 640 ? 26 : 48) * intensity);
    const rising = mode !== 'village';
    const mk = (init: boolean): P => {
      const ember = mode === 'village' ? Math.random() < 0.12 : Math.random() < 0.55;
      return { x: Math.random() * w, y: init ? Math.random() * h : rising ? h + 10 : -10, r: ember ? 0.8 + Math.random() * 1.6 : 1 + Math.random() * 2.2,
        vx: (Math.random() - 0.5) * 12, vy: (rising ? -1 : 1) * (6 + Math.random() * (ember ? 26 : 14)), a: 0.15 + Math.random() * 0.5, ember, ph: Math.random() * 6.28 };
    };
    const ps: P[] = Array.from({ length: n }, () => mk(true));
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        p.ph += dt * 1.3;
        p.x += (p.vx + Math.sin(p.ph) * 8) * dt; p.y += p.vy * dt;
        if (p.y < -12 || p.y > h + 12 || p.x < -12 || p.x > w + 12) { ps[i] = mk(false); continue; }
        const fl = p.ember ? 0.6 + 0.4 * Math.sin(p.ph * 4) : 1;
        if (p.ember) {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
          g.addColorStop(0, `rgba(${tint},${p.a * fl})`); g.addColorStop(1, `rgba(${tint},0)`);
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, 6.283); ctx.fill();
        } else {
          ctx.fillStyle = `rgba(170,160,150,${p.a * 0.55})`;
          ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * 0.6, p.ph, 0, 6.283); ctx.fill();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    const vis = () => { cancelAnimationFrame(raf); if (!document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } };
    document.addEventListener('visibilitychange', vis);
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', vis); };
  }, [mode, tint, intensity]);
  return <canvas ref={ref} aria-hidden className="fixed inset-0 z-[1] pointer-events-none" />;
}

const WHISPERS = () => [
  T('…ti ricordi di lui?'), T('non era colpa tua'), T('era colpa tua'), T('scendi'), T('ti stiamo guardando'),
  T('il tuo nome ha un sapore dolce'), T('chi hai lasciato indietro?'), T('anche loro avevano un nome'), T('più giù… più giù…'), T('Krak ascolta'),
];

/** Frasi che compaiono, rare e sbiadite, ai margini dello schermo. */
export function Whispers({ every = 60, corruption = 0 }: { every?: number; corruption?: number }) {
  const [w, setW] = useState<{ id: number; text: string; x: number; y: number; rot: number } | null>(null);
  useEffect(() => {
    let tm = 0;
    const schedule = () => {
      const base = every * (1 - Math.min(0.6, corruption / 160));
      tm = window.setTimeout(() => {
        const list = WHISPERS();
        const side = Math.random();
        const x = side < 0.5 ? 2 + Math.random() * 10 : 78 + Math.random() * 14;
        setW({ id: Date.now(), text: list[Math.floor(Math.random() * list.length)], x, y: 20 + Math.random() * 65, rot: (Math.random() - 0.5) * 10 });
        schedule();
      }, (base * 0.6 + Math.random() * base * 0.8) * 1000);
    };
    schedule();
    return () => clearTimeout(tm);
  }, [every, corruption]);
  if (!w) return null;
  return <div key={w.id} aria-hidden className="whisper fixed z-[2] pointer-events-none italic text-sm sm:text-base" style={{ left: `${w.x}%`, top: `${w.y}%`, transform: `rotate(${w.rot}deg)` }}>{w.text}</div>;
}

/** Due occhi che si aprono nel buio per un istante. */
export function Eyes({ every = 40 }: { every?: number }) {
  const [e, setE] = useState<{ id: number; x: number; y: number; s: number } | null>(null);
  useEffect(() => {
    let tm = 0;
    const go = () => { tm = window.setTimeout(() => { setE({ id: Date.now(), x: 4 + Math.random() * 88, y: 12 + Math.random() * 70, s: 0.6 + Math.random() * 0.9 }); go(); }, (every * 0.5 + Math.random() * every) * 1000); };
    go();
    return () => clearTimeout(tm);
  }, [every]);
  if (!e) return null;
  return (
    <div key={e.id} aria-hidden className="eyes fixed z-[2] pointer-events-none flex gap-3" style={{ left: `${e.x}%`, top: `${e.y}%`, transform: `scale(${e.s})` }}>
      <span className="eye" /><span className="eye" />
    </div>
  );
}

export function Fog() {
  return <div aria-hidden className="fixed inset-0 z-[1] pointer-events-none overflow-hidden"><div className="fog fog-a" /><div className="fog fog-b" /></div>;
}

// ============================================================
// Il Terrore: apparizioni rare e brevi, mai bloccanti.
// Più frequenti nei dungeon e con la corruzione alta.
// ============================================================
type DreadKind = 'flicker' | 'hand' | 'shadow' | 'scratch' | 'face' | 'drip';
export function Dread({ every = 80, corruption = 0, deep = false }: { every?: number; corruption?: number; deep?: boolean }) {
  const [d, setD] = useState<{ id: number; kind: DreadKind; x: number; y: number; flip: boolean } | null>(null);
  useEffect(() => {
    let tm = 0;
    const kinds: DreadKind[] = ['flicker', 'hand', 'shadow', 'scratch', 'drip', ...(deep || corruption > 30 ? ['face' as DreadKind, 'hand' as DreadKind] : [])];
    const go = () => {
      const base = every * (1 - Math.min(0.55, corruption / 180)) * (deep ? 0.7 : 1);
      tm = window.setTimeout(() => {
        setD({ id: Date.now(), kind: kinds[Math.floor(Math.random() * kinds.length)], x: Math.random(), y: Math.random(), flip: Math.random() < 0.5 });
        go();
      }, (base * 0.6 + Math.random() * base * 0.8) * 1000);
    };
    go();
    return () => clearTimeout(tm);
  }, [every, corruption, deep]);
  if (!d) return null;
  const side = d.flip ? { right: `${2 + d.x * 8}%` } : { left: `${2 + d.x * 8}%` };
  switch (d.kind) {
    case 'flicker': return <div key={d.id} aria-hidden className="dread-flicker fixed inset-0 z-[45] pointer-events-none" />;
    case 'shadow': return <div key={d.id} aria-hidden className={`dread-shadow fixed z-[3] pointer-events-none ${d.flip ? 'rev' : ''}`} style={{ top: `${15 + d.y * 40}%` }} />;
    case 'face': return (
      <div key={d.id} aria-hidden className="dread-face fixed z-[3] pointer-events-none" style={{ ...side, top: `${20 + d.y * 45}%` }}>
        <svg viewBox="0 0 60 80" width="90"><ellipse cx="30" cy="38" rx="20" ry="28" fill="rgba(220,210,200,.16)" /><ellipse cx="22" cy="32" rx="4" ry="6" fill="#000" /><ellipse cx="38" cy="32" rx="4" ry="6" fill="#000" /><path d="M21 54 Q30 64 39 54 Q30 58 21 54Z" fill="#000" /></svg>
      </div>);
    case 'hand': return (
      <div key={d.id} aria-hidden className="dread-hand fixed z-[3] pointer-events-none" style={{ ...side, top: `${15 + d.y * 55}%`, transform: `rotate(${(d.x - 0.5) * 60}deg)` }}>
        <svg viewBox="0 0 60 80" width="70"><path d="M18 78 C10 60 8 48 10 38 L8 14 C8 9 14 9 15 14 L17 34 L18 6 C18 1 25 1 25 6 L26 33 L28 3 C28 -2 35 -2 35 3 L35 33 L38 9 C38 4 45 4 45 9 L43 38 C48 32 54 30 56 34 C54 44 48 52 46 62 L44 78Z" fill="rgba(110,8,8,.7)" /></svg>
      </div>);
    case 'scratch': return (
      <div key={d.id} aria-hidden className="dread-scratch fixed z-[3] pointer-events-none" style={{ ...side, top: `${10 + d.y * 60}%` }}>
        <svg viewBox="0 0 120 90" width="150">{[0, 1, 2, 3].map(i => <path key={i} d={`M${10 + i * 22} 4 Q${26 + i * 22} 45 ${18 + i * 24} 86`} stroke="rgba(140,15,15,.75)" strokeWidth="3.5" fill="none" strokeLinecap="round" />)}</svg>
      </div>);
    case 'drip': return (
      <div key={d.id} aria-hidden className="fixed top-0 inset-x-0 z-[3] pointer-events-none h-0">
        {Array.from({ length: 5 }, (_, i) => <span key={i} className="dread-drip" style={{ left: `${(d.x * 70 + i * 6.5) % 98}%`, animationDelay: `${i * 0.35}s`, height: `${40 + ((i * 37) % 70)}px` }} />)}
      </div>);
  }
}
