import { kvGet, kvSet, kvDel, kvUsesBridge } from './kv';
// Salvataggio robusto (GDD §21): autosave, backup rotanti, checksum, migrazione, codice di esportazione.
import type { GameState } from './types';
import { newGame, SAVE_VERSION } from './engine/state';
import { hashStr } from './rng';
import { onboard } from './engine/onboarding';

const KEY = 'krak_voci_sepolte_save';
const BAK = 'krak_voci_sepolte_bak_';
const BAK_SLOTS = 3;
const LEGACY_KEY = 'hondovalle_save_v1';

function strip(s: GameState): GameState {
  return { ...s, toasts: [], modal: s.modal && s.modal.kind === 'welcome' ? null : s.modal };
}
function wrap(s: GameState): string {
  const body = JSON.stringify(strip(s));
  return JSON.stringify({ v: SAVE_VERSION, sum: hashStr(body), body });
}
function unwrap(raw: string | null): GameState | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw);
    if (!o || typeof o.body !== 'string') return null;
    if (hashStr(o.body) !== o.sum) return null; // corruzione rilevata
    return migrate(JSON.parse(o.body));
  } catch {
    return null;
  }
}

// Completa i campi mancanti con i valori di default (compatibilità tra versioni)
export function migrate(raw: any): GameState | null {
  if (!raw || typeof raw !== 'object' || !raw.hero || !raw.res) return null;
  const base = newGame();
  const out: any = { ...base, ...raw };
  for (const k of ['hero', 'res', 'village', 'valley', 'world', 'daily', 'events', 'cycle', 'settings', 'market', 'biomes', 'factions'] as const) {
    out[k] = { ...(base as any)[k], ...(raw[k] || {}) };
  }
  for (const b of Object.keys(base.biomes)) out.biomes[b] = { ...(base.biomes as any)[b], ...(raw.biomes?.[b] || {}) };
  // nuovi compagni aggiunti in versioni successive
  for (const c of base.companions) if (!out.companions.some((x: any) => x.id === c.id)) out.companions.push(c);
  out.toasts = [];
  if ((raw.version || 0) < 3) {
    // partite precedenti: sblocca subito ciò che il giocatore ha già raggiunto e riaccende la nuova musica
    out.settings.music = true;
    if (out.scene === 'game') { onboard(out, true); out.toasts = []; }
  }
  out.version = SAVE_VERSION;
  if (out.combat && !out.combat.party) out.combat = null;
  if (out.combat) { out.combat.chain ??= 0; out.combat.bestChain ??= 0; }
  out.lastReport ??= null;
  out.talk ??= null;
  out.quests ??= {};
  out.krak ??= { level: 0, max: out.cycle?.n > 1 ? 1 : 0 };
  out.omens ??= [];
  out.dailyRun ??= { day: '', best: 0, tries: 0, allBest: 0 };
  out.glitchUntil ??= 0;
  out.lostSatchel ??= null;
  return out as GameState;
}

let lastBackup = 0;
export function saveGame(s: GameState): boolean {
  if (s.scene === 'intro' && !s.playerName && s.cycle.n === 1) return false;
  try {
    const data = wrap({ ...s, lastSave: Date.now() });
    kvSet(KEY, data);
    const now = Date.now();
    if (!kvUsesBridge() && now - lastBackup > 5 * 60_000) {
      lastBackup = now;
      const slot = Math.floor(now / (5 * 60_000)) % BAK_SLOTS;
      kvSet(BAK + slot, data);
    }
    return true;
  } catch (e) {
    console.warn('Salvataggio fallito', e);
    return false;
  }
}

export function loadGame(): GameState | null {
  try {
    const main = unwrap(kvGet(KEY));
    if (main) return main;
    // fallback sui backup rotanti, il più recente valido
    const baks: GameState[] = [];
    for (let i = 0; i < BAK_SLOTS; i++) { const b = unwrap(kvGet(BAK + i)); if (b) baks.push(b); }
    baks.sort((a, b) => b.lastSave - a.lastSave);
    return baks[0] || null;
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  try { return !!loadGame(); } catch { return false; }
}
export function hasOldSave(): boolean {
  try { return !!kvGet(LEGACY_KEY); } catch { return false; }
}

export function deleteSave() {
  try {
    kvDel(KEY);
    for (let i = 0; i < BAK_SLOTS; i++) kvDel(BAK + i);
  } catch { /* ignora */ }
}

// Codice di esportazione (Save Claim su un altro dispositivo)
export function exportCode(s: GameState): string {
  const body = JSON.stringify(strip(s));
  const payload = JSON.stringify({ v: SAVE_VERSION, sum: hashStr(body), body });
  return 'KRAK1.' + btoa(unescape(encodeURIComponent(payload)));
}
export function importCode(code: string): GameState | null {
  try {
    const c = code.trim().replace(/^KRAK1\./, '');
    const payload = decodeURIComponent(escape(atob(c)));
    return unwrap(payload);
  } catch {
    return null;
  }
}
