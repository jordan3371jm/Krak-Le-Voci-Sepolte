// RNG deterministico (mulberry32) per dungeon, mondo condiviso e semi giornalieri.
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const rand = () => Math.random();
export const randInt = (min: number, max: number, r: () => number = Math.random) => Math.floor(r() * (max - min + 1)) + min;
export function pick<T>(arr: readonly T[], r: () => number = Math.random): T {
  return arr[Math.floor(r() * arr.length)];
}
export function weighted<T>(entries: [T, number][], r: () => number = Math.random): T {
  const total = entries.reduce((a, [, w]) => a + Math.max(0, w), 0);
  let x = r() * total;
  for (const [v, w] of entries) {
    x -= Math.max(0, w);
    if (x <= 0) return v;
  }
  return entries[entries.length - 1][0];
}
export function uid(prefix = 'u'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
export function todayKey(t = Date.now()): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
