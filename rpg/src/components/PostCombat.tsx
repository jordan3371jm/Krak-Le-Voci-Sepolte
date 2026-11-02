import { useState } from 'react';
import type { GameState, RoomChoice } from '../game/types';
import { playChoiceSound, playCorruptionSound } from '../game/audio';

interface PostCombatProps {
  state: GameState;
  onChoice: (choiceId: string) => void;
}

export default function PostCombat({ state, onChoice }: PostCombatProps) {
  const [selectedChoice, setSelectedChoice] = useState<RoomChoice | null>(null);
  const [showResult, setShowResult] = useState(false);

  const choices = state.pendingPostBattleChoice;
  
  // Fallback: se non ci sono scelte, vai direttamente al finale
  if (!choices || choices.length === 0) {
    return (
      <div className="min-h-screen pt-16 pb-8 px-4 flex items-center justify-center">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-6xl mb-6 animate-float">💀</div>
          <h2 className="text-2xl font-bold text-bone mb-4">Il Boss è Caduto</h2>
          <p className="text-sm text-mist italic mb-8">
            Le voci si sono dissolte nel silenzio. Il tuo destino è segnato.
          </p>
          <button
            onClick={() => onChoice('default')}
            className="px-6 py-3 rounded-lg border border-ember/40 text-ember hover:bg-ember/10 transition-all text-sm font-semibold"
          >
            Affronta le conseguenze →
          </button>
        </div>
      </div>
    );
  }

  const handleChoice = (choice: RoomChoice) => {
    setSelectedChoice(choice);
    setShowResult(true);
    if (choice.effect.corruption && choice.effect.corruption > 0) {
      playCorruptionSound();
    } else {
      playChoiceSound();
    }
  };

  const handleContinue = () => {
    onChoice(selectedChoice!.id);
    setShowResult(false);
    setSelectedChoice(null);
  };

  return (
    <div className="min-h-screen pt-16 pb-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4 animate-float">💀</div>
          <h2 className="text-2xl font-bold text-bone mb-2">Il Boss è Caduto</h2>
          <p className="text-sm text-mist italic">
            Le voci tacciono... per ora. Ma il loro destino è nelle tue mani.
          </p>
        </div>

        <div className="card-dark rounded-xl p-6 border border-ember/30">
          {!showResult ? (
            <div className="space-y-3">
              <p className="text-xs text-mist mb-3 italic">Cosa fai con le voci?</p>
              {choices.map(choice => (
                <button
                  key={choice.id}
                  onClick={() => handleChoice(choice)}
                  className="w-full p-4 rounded-lg border border-gray-700 text-left hover:border-ember/50 hover:bg-ember/5 transition-all"
                >
                  <div className="text-sm font-semibold text-bone mb-1">{choice.text}</div>
                  <div className="flex gap-2 mt-2 text-[10px]">
                    {choice.effect.resonance && choice.effect.resonance > 0 && (
                      <span className="text-resonance">+{choice.effect.resonance} Ris</span>
                    )}
                    {choice.effect.dissonance && choice.effect.dissonance > 0 && (
                      <span className="text-dissonance">+{choice.effect.dissonance} Dis</span>
                    )}
                    {choice.effect.corruption && choice.effect.corruption > 0 && (
                      <span className="text-fate">+{choice.effect.corruption}% Corr</span>
                    )}
                    {choice.effect.corruption && choice.effect.corruption < 0 && (
                      <span className="text-resonance">{choice.effect.corruption}% Corr</span>
                    )}
                    {choice.effect.hp && choice.effect.hp < 0 && (
                      <span className="text-dissonance">{choice.effect.hp} HP</span>
                    )}
                    {choice.effect.xp && (
                      <span className="text-fate">+{choice.effect.xp} XP</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-ink/50 border border-gray-800">
                <p className="text-sm text-bone/80 italic">{selectedChoice?.result}</p>
              </div>
              <button
                onClick={handleContinue}
                className="w-full py-3 rounded-lg border border-ember/40 text-ember hover:bg-ember/10 transition-colors text-sm font-semibold"
              >
                Affronta le conseguenze →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
