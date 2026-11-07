import { BG, VIDEO } from './art';

/** Sfondo di scena: video animato in loop (muto) con l'immagine come riserva e poster. */
export function SceneBg({ id, fallback, opacity = 0.5, overlay }: { id: string; fallback?: string; opacity?: number; overlay: string }) {
  const img = BG[id] || (fallback ? BG[fallback] : undefined);
  const vid = VIDEO[id];
  if (!img && !vid) return null;
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity }}>
      {img && <div className={`absolute inset-0 bg-cover bg-center ${vid ? 'scene-poster' : 'kenburns'}`} style={{ backgroundImage: `url(${img})` }} />}
      {vid && <video className="scene-video absolute inset-0 w-full h-full object-cover" poster={img} autoPlay muted loop playsInline preload="auto">{vid.webm && <source src={vid.webm} type="video/webm" />}{vid.mp4 && <source src={vid.mp4} type="video/mp4" />}</video>}
      <div className="absolute inset-0" style={{ background: overlay }} />
    </div>
  );
}
