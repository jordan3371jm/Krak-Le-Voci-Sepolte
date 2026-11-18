// ============================================================
// Archivio chiave/valore: su Playgama (e piattaforme Bridge) i salvataggi
// passano SOLO da bridge.storage (anche cloud); altrove da localStorage.
// L'API è sincrona: all'avvio si leggono tutte le chiavi in un'unica
// chiamata, poi le scritture aggiornano la memoria e partono in background.
// ============================================================
const w = () => (typeof window !== 'undefined' ? (window as any) : {});
const mem = new Map<string, string>();
let useBridge = false;

export function bridgeActive(): boolean {
  const b = w().bridge;
  return !!b && !!b.platform && b.platform.id && b.platform.id !== 'mock';
}

export async function kvInit(keys: string[]) {
  if (!bridgeActive()) return;
  try {
    const vals: any[] = await w().bridge.storage.get(keys);
    keys.forEach((k, i) => {
      const v = vals?.[i];
      if (v !== null && v !== undefined) mem.set(k, typeof v === 'string' ? v : JSON.stringify(v));
      else { try { const l = localStorage.getItem(k); if (l) mem.set(k, l); } catch { /* */ } }
    });
    useBridge = true;
  } catch { useBridge = false; }
}

export const kvUsesBridge = () => useBridge;

export function kvGet(k: string): string | null {
  if (useBridge) return mem.get(k) ?? null;
  try { return localStorage.getItem(k); } catch { return null; }
}

export function kvSet(k: string, v: string) {
  if (useBridge) {
    if (mem.get(k) === v) return;
    mem.set(k, v);
    try { w().bridge.storage.set([k], [v])?.catch?.(() => {}); } catch { /* */ }
    return;
  }
  localStorage.setItem(k, v);
}

export function kvDel(k: string) {
  if (useBridge) { mem.delete(k); try { w().bridge.storage.delete([k])?.catch?.(() => {}); } catch { /* */ } return; }
  try { localStorage.removeItem(k); } catch { /* */ }
}
