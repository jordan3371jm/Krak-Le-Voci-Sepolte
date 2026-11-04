/// <reference types="vite/client" />
// Ritratti dipinti (generati con Canva). Chi non ha un ritratto usa il sigillo con l'emoji.
const files = import.meta.glob('../assets/portraits/*.webp', { eager: true, import: 'default' }) as Record<string, string>;
export const PORTRAITS: Record<string, string> = {};
for (const [p, url] of Object.entries(files)) PORTRAITS[p.split('/').pop()!.replace('.webp', '')] = url;
export const portraitOf = (id: string) => PORTRAITS[id.replace(/_t$/, '')];
