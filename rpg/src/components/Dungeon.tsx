import { useState } from 'react';
import type { GameState, RoomChoice } from '../game/types';
import { playChoiceSound, playCorruptionSound } from '../game/audio';

interface DungeonProps {
  state: GameState;
  onChoice: (choiceId: string) => void;
  onAdvance: () => void;
  onRetreat: () => void;
}

export default function Dungeon({ state, onChoice, onAdvance, onRetreat }: DungeonProps) {
  const [selectedChoice, setSelectedChoice] = useState<RoomChoice | null>(null);
  const [showResult, setShowResult] = useState(false);

  const currentRoom = state.dungeonRooms[state.currentRoom];
  if (!currentRoom) return null;

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

  const handleNextRoom = () => {
    onAdvance();
  };

  const corruptionVisual = state.corruption > 60 ? 'border-dissonance/40' : state.corruption > 30 ? 'border-fate/30' : 'border-gray-800';

  return (
    <div className="min-h-screen pt-16 pb-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Room progress */}
        <div className="flex items-center gap-2 mb-6">
          {state.dungeonRooms.map((room, i) => (
            <div key={room.id} className="flex-1">
              <div className={`h-1 rounded-full ${
                i < state.currentRoom ? 'bg-ember' :
                i === state.currentRoom ? 'bg-resonance animate-pulse' :
                'bg-gray-800'
              }`} />
              <div className="text-[9px] text-mist mt-1 text-center truncate">
                {i + 1}. {room.name.split(' ')[0]}
              </div>
            </div>
          ))}
        </div>

        {/* Current room */}
        <div className={`card-dark rounded-xl p-6 border ${corruptionVisual} relative overflow-hidden`}>
          {/* Corruption overlay */}
          {state.corruption > 50 && (
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                background: `radial-gradient(circle at ${50 + Math.sin(Date.now() / 1000) * 20}% ${50 + Math.cos(Date.now() / 1000) * 20}%, rgba(74, 14, 78, 0.3), transparent)`,
              }}
            />
          )}

          <div className="relative z-10">
            {/* Room header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs text-mist">Stanza {state.currentRoom + 1}/{state.dungeonRooms.length}</span>
                <h2 className="text-xl font-bold text-bone">{currentRoom.name}</h2>
              </div>
              <div className="text-right">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  currentRoom.type === 'boss' ? 'bg-dissonance/20 text-dissonance' :
                  currentRoom.type === 'combat' ? 'bg-ember/20 text-ember' :
                  currentRoom.type === 'trap' ? 'bg-fate/20 text-fate' :
                  'bg-gray-800 text-mist'
                }`}>
                  {currentRoom.type === 'boss' ? '💀 BOSS' :
                   currentRoom.type === 'combat' ? '⚔️ Combattimento' :
                   currentRoom.type === 'trap' ? '⚡ Trappole' :
                   '📜 Narrativa'}
                </span>
              </div>
            </div>

            {/* Room description */}
            <p className="text-sm text-bone/80 leading-relaxed mb-6 italic">
              {currentRoom.description}
            </p>

            {/* Party status */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {state.party.map(member => (
                <div key={member.id} className={`border rounded-lg p-2 text-center ${
                  member.hp <= 0 ? 'border-dissonance/30 opacity-50' : 'border-gray-800'
                }`}>
                  <div className="text-xs font-semibold text-bone">{member.name}</div>
                  <div className="text-[10px] text-mist">
                    ❤️ {member.hp}/{member.maxHp}
                  </div>
                  <div className="h-1 bg-ink rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(member.hp / member.maxHp) * 100}%`,
                        background: member.hp / member.maxHp > 0.5 ? '#2dd4bf' : member.hp / member.maxHp > 0.25 ? '#b45309' : '#ef4444',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Choices or continue */}
            {!showResult && !currentRoom.cleared && currentRoom.choices && (
              <div className="space-y-2">
                <p className="text-xs text-mist mb-3">Cosa fai?</p>
                {currentRoom.choices.map(choice => (
                  <button
                    key={choice.id}
                    onClick={() => handleChoice(choice)}
                    className="w-full p-3 rounded-lg border border-gray-700 text-left hover:border-ember/50 hover:bg-ember/5 transition-all text-sm"
                  >
                    <div className="text-bone/90">{choice.text}</div>
                    <div className="flex gap-2 mt-1 text-[10px]">
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
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Result */}
            {showResult && selectedChoice && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-ink/50 border border-gray-800">
                  <p className="text-sm text-bone/80 italic">{selectedChoice.result}</p>
                </div>
                <button
                  onClick={handleContinue}
                  className="w-full py-2 rounded-lg border border-ember/30 text-ember hover:bg-ember/10 transition-colors text-sm"
                >
                  Continua →
                </button>
              </div>
            )}

            {/* Room cleared - advance */}
            {currentRoom.cleared && !showResult && (
              <div className="space-y-3">
                <div className="text-center text-sm text-resonance">✓ Stanza completata</div>
                {state.currentRoom < state.dungeonRooms.length - 1 ? (
                  <button
                    onClick={handleNextRoom}
                    className="w-full py-3 rounded-lg border border-ember/30 text-ember hover:bg-ember/10 transition-colors text-sm font-semibold"
                  >
                    Avanza alla stanza successiva →
                  </button>
                ) : (
                  <button
                    onClick={onRetreat}
                    className="w-full py-3 rounded-lg border border-resonance/30 text-resonance hover:bg-resonance/10 transition-colors text-sm font-semibold"
                  >
                    Completa la spedizione ✓
                  </button>
                )}
              </div>
            )}

            {/* Retreat button */}
            {!currentRoom.cleared && !showResult && (
              <button
                onClick={onRetreat}
                className="mt-4 text-xs text-mist hover:text-dissonance transition-colors"
              >
                ← Ritirati dalla spedizione
              </button>
            )}
          </div>
        </div>

        {/* Combat log */}
        {state.combatLog.length > 0 && (
          <div className="mt-4 bg-ink/80 rounded-lg p-3 border border-gray-800/50 max-h-32 overflow-y-auto">
            <div className="text-xs text-mist mb-2 font-semibold">Log Spedizione</div>
            {state.combatLog.map((entry, i) => (
              <div key={i} className="text-xs text-bone/70 py-0.5">{entry}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
