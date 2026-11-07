// ============================================================
// Piattaforma: pubblicità con ricompensa e classifiche.
// Usa Playgama Bridge (window.bridge) o il CrazyGames SDK se presenti.
// La ricompensa si concede SOLO quando la pubblicità è stata vista
// (stato `rewarded`). Senza piattaforma (file locale) il pulsante diventa
// un piccolo dono della valle, usabile alle stesse condizioni.
// ============================================================
const w = () => (typeof window !== 'undefined' ? (window as any) : {});

export type AdMode = 'bridge' | 'crazy' | 'none';
export function adMode(): AdMode {
  const b = w().bridge;
  if (b?.advertisement && b.advertisement.isRewardedSupported !== false) return 'bridge';
  if (w().CrazyGames?.SDK?.ad?.requestAd) return 'crazy';
  return 'none';
}

let busy = false;
export function showRewarded(placement = 'reward'): Promise<boolean> {
  if (busy) return Promise.resolve(false);
  const mode = adMode();
  if (mode === 'none') return Promise.resolve(true);
  busy = true;
  return new Promise<boolean>(resolve => {
    let done = false;
    const finish = (ok: boolean) => { if (done) return; done = true; busy = false; resolve(ok); };
    if (mode === 'bridge') {
      const b = w().bridge;
      const ev = b.EVENT_NAME?.REWARDED_STATE_CHANGED || 'rewarded_state_changed';
      let rewarded = false;
      const h = (st: string) => {
        if (st === 'rewarded') rewarded = true;
        if (st === 'closed') { try { b.advertisement.off?.(ev, h); } catch { /* */ } finish(rewarded); }
        if (st === 'failed') { try { b.advertisement.off?.(ev, h); } catch { /* */ } finish(false); }
      };
      try { b.advertisement.on(ev, h); b.advertisement.showRewarded(placement); } catch { finish(false); }
      window.setTimeout(() => finish(rewarded), 90_000);
    } else {
      try {
        w().CrazyGames.SDK.ad.requestAd('rewarded', { adFinished: () => finish(true), adError: () => finish(false), adStarted: () => {} });
      } catch { finish(false); }
      window.setTimeout(() => finish(false), 90_000);
    }
  });
}

/** Invia un punteggio alla classifica della piattaforma, solo se ne esiste una. */
export function submitScore(id: string, score: number) {
  try {
    const lb = w().bridge?.leaderboards;
    if (lb?.setScore && lb.type && lb.type !== 'not_available') lb.setScore(id, score)?.catch?.(() => {});
  } catch { /* nessuna classifica */ }
}
export function hasLeaderboard() {
  const lb = w().bridge?.leaderboards;
  return !!lb && !!lb.type && lb.type !== 'not_available';
}
