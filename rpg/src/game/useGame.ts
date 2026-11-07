import { kvUsesBridge } from './kv';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState } from './types';
import { newGame } from './engine/state';
import { catchUp, tick } from './engine/village';
import { loadGame, saveGame } from './save';

export type Act = (fn: (d: GameState) => void) => void;

function boot(): GameState {
  const loaded = loadGame();
  if (loaded) {
    catchUp(loaded);
    loaded.fullscreen = false;
    return loaded;
  }
  return newGame();
}

export function useGame() {
  const [state, setState] = useState<GameState>(boot);
  const ref = useRef(state);
  ref.current = state;

  const act: Act = useCallback(fn => {
    setState(prev => {
      const d = structuredClone(prev);
      fn(d);
      return d;
    });
  }, []);

  const replace = useCallback((s: GameState) => setState(s), []);

  // tick di gioco (1s)
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      act(d => tick(d, Math.min(now - d.lastTick, 5000), now));
    }, 1000);
    return () => window.clearInterval(id);
  }, [act]);

  // autosalvataggio ogni 10 secondi + alla chiusura della scheda
  useEffect(() => {
    const save = () => saveGame(ref.current);
    const id = window.setInterval(save, kvUsesBridge() ? 30_000 : 10_000);
    const onHide = () => { if (document.visibilityState === 'hidden') save(); };
    window.addEventListener('beforeunload', save);
    document.addEventListener('visibilitychange', onHide);
    return () => { window.clearInterval(id); window.removeEventListener('beforeunload', save); document.removeEventListener('visibilitychange', onHide); };
  }, []);

  const saveNow = useCallback(() => saveGame(ref.current), []);

  return { state, act, replace, saveNow };
}
