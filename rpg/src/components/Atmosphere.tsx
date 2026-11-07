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
