import type { GameState } from '../game/types';
import { isAudioEnabled, toggleAudio } from '../game/audio';
import { exportSaveCode } from '../game/save';
import { useState } from 'react';

interface HUDProps {
  state: GameState;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
}

export default function HUD({ state, onToggleFullscreen, isFullscreen }: HUDProps) {
  const [audioOn, setAudioOn] = useState(isAudioEnabled());
  const resonanceMax = state.fardello?.resonanceMax || 12;
  
  // FEATURE: UI Diegetica - Corruzione dell'interfaccia
  const isCorrupted = state.corruption > 60;

  const handleToggleAudio = () => {
    const newState = toggleAudio();
    setAudioOn(newState);
  };

  return (
    <div className={`fixed top-0 left-0 right-0 z-30 pointer-events-none ${isCorrupted ? 'animate-text-glitch' : ''}`}>
      <div className={`bg-ink/90 backdrop-blur-md border-b pointer-events-auto ${
        isCorrupted ? 'border-dissonance/50' : 'border-gray-800/50'
      }`}>
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          {/* Left - Player info */}
          <div className="flex items-center gap-3">
            {state.fardello && (
              <span className="text-lg" title={state.fardello.name}>{state.fardello.icon}</span>
            )}
            <div>
              <div className="text-xs text-bone font-semibold">{state.playerName || 'Portatore'}</div>
              {state.fardello && (
                <div className="text-[10px] text-mist">{state.fardello.name}</div>
              )}
            </div>
          </div>

          {/* Center - Bars */}
          <div className="flex-1 max-w-md space-y-1">
            {/* Resonance */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-resonance w-16">Risonanza</span>
              <div className="flex-1 h-2 bg-ink rounded-full overflow-hidden border border-gray-800">
                <div
                  className="h-full resonance-bar rounded-full transition-all duration-500"
                  style={{ width: `${(state.resonance / resonanceMax) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-mist w-8">{state.resonance}/{resonanceMax}</span>
            </div>
            {/* Dissonance */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-dissonance w-16">Dissonanza</span>
              <div className="flex-1 h-2 bg-ink rounded-full overflow-hidden border border-gray-800">
                <div
                  className="h-full dissonance-bar rounded-full transition-all duration-500"
                  style={{ width: `${(state.dissonance / 15) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-mist w-8">{state.dissonance}/15</span>
            </div>
          </div>

            {/* Right - Resources */}
            <div className="flex items-center gap-3 text-xs">
              <div className="text-center">
                {/* FEATURE: Numeri corrotti quando corruption > 60 */}
                <div className={`text-rust font-bold ${isCorrupted ? 'animate-text-glitch' : ''}`}>
                  {isCorrupted && Math.random() > 0.7 ? state.cenere + Math.floor(Math.random() * 10) - 5 : state.cenere}
                </div>
                <div className="text-[9px] text-mist">Cenere</div>
              </div>
              <div className="text-center">
                <div className={`text-ember font-bold ${isCorrupted ? 'animate-text-glitch' : ''}`}>
                  {isCorrupted && Math.random() > 0.7 ? state.provviste + Math.floor(Math.random() * 3) - 1 : state.provviste}
                </div>
                <div className="text-[9px] text-mist">Provviste</div>
              </div>
              <div className="text-center">
                <div className={`text-fate font-bold ${isCorrupted ? 'animate-text-glitch' : ''}`}>
                  {state.intuizione}
                </div>
                <div className="text-[9px] text-mist">Intuizione</div>
              </div>
              <div className="text-center">
                <div className={`text-resonance font-bold ${isCorrupted ? 'animate-text-glitch' : ''}`}>
                  {state.fragments}
                </div>
                <div className="text-[9px] text-mist">Frammenti</div>
              </div>
            {/* Controls */}
            <div className="flex gap-1 ml-2 border-l border-gray-800 pl-2">
              <button
                onClick={() => {
                  const code = exportSaveCode(state);
                  navigator.clipboard.writeText(code).then(() => {
                    alert('✅ Codice salvataggio copiato negli appunti!');
                  }).catch(() => {
                    prompt('Copia questo codice:', code);
                  });
                }}
                className="p-1.5 hover:bg-fate/10 rounded transition-colors"
                title="Esporta codice salvataggio"
              >
                <span className="text-sm">💾</span>
              </button>
              <button
                onClick={handleToggleAudio}
                className="p-1.5 hover:bg-ember/10 rounded transition-colors"
                title={audioOn ? 'Disattiva audio' : 'Attiva audio'}
              >
                <span className="text-sm">{audioOn ? '🔊' : '🔇'}</span>
              </button>
              <button
                onClick={onToggleFullscreen}
                className="p-1.5 hover:bg-ember/10 rounded transition-colors"
                title={isFullscreen ? 'Esci da fullscreen' : 'Fullscreen rituale'}
              >
                <span className="text-sm">{isFullscreen ? '⊡' : '⊞'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Corruption bar */}
        {state.corruption > 0 && (
          <div className="h-1 bg-ink">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${state.corruption}%`,
                background: state.corruption > 60
                  ? 'linear-gradient(90deg, #4a0e4e, #ef4444)'
                  : 'linear-gradient(90deg, #4a0e4e, #a855f7)',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
