import type { GameState } from './types';

const SAVE_KEY = 'hondovalle_save_v1';

export function saveGame(state: GameState): boolean {
  try {
    const data = JSON.stringify(state);
    localStorage.setItem(SAVE_KEY, data);
    return true;
  } catch (e) {
    console.error('Save failed:', e);
    return false;
  }
}

export function loadGame(): GameState | null {
  try {
    const data = localStorage.getItem(SAVE_KEY);
    if (!data) return null;
    return JSON.parse(data) as GameState;
  } catch (e) {
    console.error('Load failed:', e);
    return null;
  }
}

export function deleteSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

export function exportSaveCode(state: GameState): string {
  try {
    const data = JSON.stringify(state);
    return btoa(encodeURIComponent(data));
  } catch {
    return '';
  }
}

export function importSaveCode(code: string): GameState | null {
  try {
    const data = decodeURIComponent(atob(code));
    return JSON.parse(data) as GameState;
  } catch {
    return null;
  }
}

const LEGACY_KEY = 'hondovalle_legacy';

export function saveLegacyToLocal(legacy: any): void {
  try {
    const existing = loadLegacyFromLocal();
    const updated = [...existing, legacy];
    localStorage.setItem(LEGACY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Legacy save failed:', e);
  }
}

export function loadLegacyFromLocal(): any[] {
  try {
    const data = localStorage.getItem(LEGACY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}
