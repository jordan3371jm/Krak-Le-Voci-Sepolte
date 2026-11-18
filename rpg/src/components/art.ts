/// <reference types="vite/client" />
// Illustrazioni dipinte di nemici, boss e classi. Chi non ne ha una usa il sigillo SVG/emoji.
const files = import.meta.glob('../assets/art/*.webp', { eager: true, import: 'default' }) as Record<string, string>;
export const ART: Record<string, string> = {};
for (const [p, url] of Object.entries(files)) ART[p.split('/').pop()!.replace('.webp', '')] = url;
import { PORTRAITS } from './portraits';
export const artFor = (id?: string) => (id ? ART[id] || PORTRAITS[id] || (id.startsWith('shadow_') ? ART.ombra : undefined) : undefined);
const bgFiles = import.meta.glob('../assets/bg/*.webp', { eager: true, import: 'default' }) as Record<string, string>;
export const BG: Record<string, string> = {};
for (const [p, url] of Object.entries(bgFiles)) BG[p.split('/').pop()!.replace('.webp', '')] = url;

/** Usa l'illustrazione `id` se esiste, altrimenti il simbolo di riserva. */
export const artOr = (id: string, fallback: string) => (artFor(id) ? id : fallback);
const vidFiles = import.meta.glob('../assets/video/*.{mp4,webm}', { eager: true, import: 'default' }) as Record<string, string>;
export const VIDEO: Record<string, { mp4?: string; webm?: string }> = {};
for (const [p, url] of Object.entries(vidFiles)) { const [n, ext] = p.split('/').pop()!.split('.'); (VIDEO[n] ||= {})[ext as 'mp4' | 'webm'] = url; }
export const pick = (prefix: string, id: string, fallback: string) => (artFor(prefix + id) ? prefix + id : fallback);
