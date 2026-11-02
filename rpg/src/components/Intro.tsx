import { useState } from 'react';
import { initAudio, playAmbientDrone } from '../game/audio';

interface IntroProps {
  onStart: (name: string) => void;
  hasSave: boolean;
  onContinue: () => void;
}

export default function Intro({ onStart, hasSave, onContinue }: IntroProps) {
  const [name, setName] = useState('');
  const [phase, setPhase] = useState<'title' | 'name'>('title');

  const handleStart = () => {
    initAudio();
    playAmbientDrone();
    setPhase('name');
  };

  const handleConfirmName = () => {
    if (name.trim().length > 0) {
      onStart(name.trim());
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-ember/5 rounded-full blur-3xl animate-breathe"></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-corruption/10 rounded-full blur-3xl animate-breathe" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 text-center max-w-lg">
        {phase === 'title' ? (
          <>
            {/* Title */}
            <p className="text-mist text-xs tracking-[0.3em] uppercase mb-4 animate-flicker">
              Un RPG Narrativo Tattico
            </p>

            <h1 className="text-4xl md:text-6xl font-bold mb-2">
              <span className="text-gradient-ember">HONDOVALLE</span>
            </h1>
            <h2 className="text-xl md:text-2xl font-light text-bone/80 mb-8">
              Echi di Krak
            </h2>

            <p className="text-sm text-mist italic mb-12 max-w-md mx-auto">
              Il mondo non salva i tuoi progressi. Li ricorda.
            </p>

            {/* Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleStart}
                className="w-full py-3 px-8 rounded-lg border border-ember/40 text-ember hover:bg-ember/10 transition-all text-sm font-semibold"
              >
                ✦ Nuovo Viaggio
              </button>

              {hasSave && (
                <button
                  onClick={onContinue}
                  className="w-full py-3 px-8 rounded-lg border border-resonance/30 text-resonance hover:bg-resonance/10 transition-all text-sm"
                >
                  ↻ Continua Partita Salvata
                </button>
              )}
            </div>

            <div className="mt-12 text-[10px] text-mist/30">
              Si consiglia l'uso di cuffie. Fullscreen consigliato per l'esperienza completa.
            </div>
          </>
        ) : (
          <>
            {/* Name input */}
            <div className="mb-8">
              <p className="text-sm text-mist mb-2">Come ti chiami, Portatore?</p>
              <p className="text-xs text-bone/50 italic mb-6">
                Il tuo nome sarà pronunciato dai PNG, maledetto dai nemici, e forse cancellato dalla realtà.
              </p>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmName()}
                placeholder="Inserisci il tuo nome..."
                maxLength={20}
                className="w-full px-4 py-3 bg-ink border border-gray-700 rounded-lg text-bone text-center text-lg focus:border-ember/50 focus:outline-none transition-colors placeholder:text-mist/30"
                autoFocus
              />
            </div>

            <button
              onClick={handleConfirmName}
              disabled={name.trim().length === 0}
              className="w-full py-3 px-8 rounded-lg border border-ember/40 text-ember hover:bg-ember/10 transition-all text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Entra nella Valle →
            </button>

            <button
              onClick={() => setPhase('title')}
              className="mt-4 text-xs text-mist hover:text-bone transition-colors"
            >
              ← Indietro
            </button>
          </>
        )}
      </div>
    </div>
  );
}
