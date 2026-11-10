// ============================================================
// Piattaforma: pubblicità con ricompensa e classifiche.
// Usa Playgama Bridge (window.bridge) o il CrazyGames SDK se presenti.
// La ricompensa si concede SOLO quando la pubblicità è stata vista
// (stato `rewarded`). Senza piattaforma (file locale) il pulsante diventa
// un piccolo dono della valle, usabile alle stesse condizioni.
// ============================================================
import { kvInit, bridgeActive } from './kv';
import { setExternalMute } from './audio';

const w = () => (typeof window !== 'undefined' ? (window as any) : {});

// ------------------------------------------------------------
// Avvio: Bridge si inizializza PRIMA che il gioco carichi testi e salvataggi.
// ------------------------------------------------------------
let audioAllowed = true, paused = false, adOpen = false;
const applyMute = () => setExternalMute(!audioAllowed || paused || adOpen || (typeof document !== 'undefined' && document.hidden));

export async function bootPlatform(keys: string[]) {
  const b = w().bridge;
  if (b?.initialize) {
    try { await Promise.race([b.initialize(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10_000))]); } catch { /* si gioca comunque */ }
  }
  if (bridgeActive()) {
    try { b.advertisement?.setMinimumDelayBetweenInterstitial?.(300); } catch { /* */ }
    await kvInit(keys);
    try {
      audioAllowed = b.platform.isAudioEnabled !== false;
      const E = b.EVENT_NAME || {};
      b.platform.on?.(E.AUDIO_STATE_CHANGED || 'audio_state_changed', (on: boolean) => { audioAllowed = on !== false; applyMute(); });
      b.platform.on?.(E.PAUSE_STATE_CHANGED || 'pause_state_changed', (p: boolean) => { paused = !!p; applyMute(); });
      b.advertisement?.on?.(E.INTERSTITIAL_STATE_CHANGED || 'interstitial_state_changed', (st: string) => { adOpen = st === 'opened'; applyMute(); });
      b.advertisement?.on?.(E.REWARDED_STATE_CHANGED || 'rewarded_state_changed', (st: string) => { adOpen = st === 'opened'; applyMute(); });
    } catch { /* */ }
  }
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', applyMute);
  applyMute();
}

/** Il primo fotogramma giocabile è pronto: la piattaforma nasconde il suo caricamento. */
let readySent = false;
export function gameReady() {
  if (readySent) return; readySent = true;
  try { w().bridge?.platform?.sendMessage?.('game_ready'); } catch { /* */ }
}
/** Messaggi di ciclo di vita (inizio/fine livello) per le piattaforme che li usano. */
export function platformMessage(msg: 'level_started' | 'level_completed' | 'level_failed' | 'player_got_achievement', data?: Record<string, string>) {
  try { w().bridge?.platform?.sendMessage?.(msg, data); } catch { /* */ }
}
/** Pausa naturale (ritorno dal dungeon, fine Ciclo): Bridge decide se mostrare davvero un annuncio. */
export function interstitial(placement = 'pause') {
  try { const a = w().bridge?.advertisement; if (a?.showInterstitial && bridgeActive()) a.showInterstitial(placement); } catch { /* */ }
}

export type AdMode = 'bridge' | 'crazy' | 'none';
export function adMode(): AdMode {
  const b = w().bridge;
  if (bridgeActive() && b?.advertisement && b.advertisement.isRewardedSupported) return 'bridge';
  if (w().CrazyGames?.SDK?.ad?.requestAd) return 'crazy';
  return 'none';
}

let busy = false;
/** Avvisa l'interfaccia che la pubblicità non è arrivata (niente premio, ma il giocatore deve saperlo). */
function adFailed() { try { window.dispatchEvent(new CustomEvent('krak-ad-failed')); } catch { /* */ } }
/** Le ricompense con pubblicità si mostrano solo dove una pubblicità esiste davvero. */
export function rewardedAvailable() { return adMode() !== 'none'; }
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
        if (st === 'failed') { try { b.advertisement.off?.(ev, h); } catch { /* */ } adFailed(); finish(false); }
      };
      try { b.advertisement.on(ev, h); b.advertisement.showRewarded(placement); } catch { finish(false); }
      window.setTimeout(() => { if (!done && !rewarded) adFailed(); finish(rewarded); }, 60_000);
    } else {
      try {
        w().CrazyGames.SDK.ad.requestAd('rewarded', { adFinished: () => finish(true), adError: () => { adFailed(); finish(false); }, adStarted: () => {} });
      } catch { finish(false); }
      window.setTimeout(() => finish(false), 90_000);
    }
  });
}

/** Invia un punteggio alla classifica della piattaforma, solo se ne esiste una. */
export function submitScore(id: string, score: number) {
  try {
    const lb = w().bridge?.leaderboards;
    if (bridgeActive() && lb?.setScore && lb.type && lb.type !== 'not_available') lb.setScore(id, score)?.catch?.(() => {});
  } catch { /* nessuna classifica */ }
}
export function hasLeaderboard() {
  const lb = w().bridge?.leaderboards;
  return bridgeActive() && !!lb && !!lb.type && lb.type !== 'not_available';
}

// ------------------------------------------------------------
// Banner: solo nelle schermate tranquille (villaggio, menu), mai in combattimento.
// ------------------------------------------------------------
let bannerOn = false;
// Sul portale Playgama (e su CrazyGames/MSN) si usano gli Advanced Banners; altrove il banner classico.
function advancedOk() { try { return bridgeActive() && !!w().bridge?.advertisement?.isAdvancedBannersSupported; } catch { return false; } }
function classicOk() { try { return bridgeActive() && !!w().bridge?.advertisement?.isBannerSupported; } catch { return false; } }
export function bannerSupported() { return advancedOk() || classicOk(); }
export function setBanner(show: boolean) {
  if (!bannerSupported() || show === bannerOn) return;
  bannerOn = show;
  try {
    const a = w().bridge.advertisement;
    if (advancedOk()) { if (show) a.showAdvancedBanners('idle'); else a.hideAdvancedBanners(); }
    else if (show) a.showBanner('bottom', 'idle'); else a.hideBanner();
  } catch { /* */ }
}

// ------------------------------------------------------------
// Telemetria del percorso del giocatore (Bridge analytics): ogni tappa una volta sola.
// ------------------------------------------------------------
const TM_KEY = 'krak_tm';
let tmSent: Set<string> | null = null;
export function trackOnce(id: string) {
  try {
    if (!tmSent) { let raw: string | null = null; try { raw = localStorage.getItem(TM_KEY); } catch { /* */ } tmSent = new Set(raw ? JSON.parse(raw) : []); }
    if (tmSent.has(id)) return;
    tmSent.add(id);
    try { localStorage.setItem(TM_KEY, JSON.stringify([...tmSent])); } catch { /* */ }
    w().bridge?.platform?.sendCustomMessage?.(id);
  } catch { /* */ }
}
