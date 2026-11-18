import { artFor } from './art';
/** Illustrazione dipinta se esiste, altrimenti l'emoji originale. */
export function Pic({ id, emoji, size = 18, className = '' }: { id: string; emoji: string; size?: number; className?: string }) {
  const src = size >= 20 ? artFor(id) : undefined;
  if (!src) return <span className={className}>{emoji}</span>;
  return <img src={src} alt="" width={size} height={size} className={`inline-block align-middle rounded-full object-cover ${className}`} style={{ width: size, height: size }} />;
}
