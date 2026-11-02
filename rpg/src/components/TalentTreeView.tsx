import type { GameState } from '../game/types';

interface TalentTreeViewProps {
  state: GameState;
  onUnlockTalent: (talentId: string) => void;
  onBack: () => void;
}

export default function TalentTreeView({ state, onUnlockTalent, onBack }: TalentTreeViewProps) {
  if (!state.talentTree) {
    return (
      <div className="min-h-screen pt-16 pb-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-bone mb-2">🎓 Albero dei Talenti</h2>
            <p className="text-sm text-mist italic">
              Non hai ancora scelto un Fardello.
            </p>
          </div>
          <button
            onClick={onBack}
            className="w-full py-3 rounded-lg border border-gray-700 text-mist hover:text-bone hover:border-ember/30 transition-colors text-sm"
          >
            ← Torna al Villaggio
          </button>
        </div>
      </div>
    );
  }

  const { via, talents, unlockedTalents } = state.talentTree;

  return (
    <div className="min-h-screen pt-16 pb-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-bone mb-2">🎓 Albero dei Talenti</h2>
          <p className="text-sm text-mist italic">
            Via del {via.charAt(0).toUpperCase() + via.slice(1)}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-fate/30 bg-fate/5">
            <span className="text-xs text-fate">Punti Talento: {state.talentPoints}</span>
          </div>
        </div>

        <div className="space-y-4">
          {talents.map((talent, index) => {
            const isUnlocked = unlockedTalents.includes(talent.id);
            const canUnlock = !isUnlocked && state.talentPoints > 0 && 
              (!talent.requires || talent.requires.every(r => unlockedTalents.includes(r)));
            const isLocked = !isUnlocked && !canUnlock;

            return (
              <div
                key={talent.id}
                className={`card-dark rounded-xl p-5 border transition-all ${
                  isUnlocked
                    ? 'border-resonance/50 bg-resonance/5'
                    : canUnlock
                    ? 'border-fate/50 hover:border-fate cursor-pointer'
                    : 'border-gray-800 opacity-50'
                }`}
                onClick={() => canUnlock && onUnlockTalent(talent.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-mist">Talento {index + 1}</span>
                      {isUnlocked && <span className="text-xs text-resonance">✓ Sbloccato</span>}
                    </div>
                    <h3 className="text-lg font-bold text-bone">{talent.name}</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-mist">Costo</div>
                    <div className="text-sm font-bold text-fate">{talent.cost} PT</div>
                  </div>
                </div>

                <p className="text-sm text-bone/70 mb-3">{talent.description}</p>

                <div className="flex flex-wrap gap-2 text-xs">
                  {talent.effect.hp && (
                    <span className="px-2 py-1 rounded bg-resonance/10 text-resonance">
                      +{talent.effect.hp} HP
                    </span>
                  )}
                  {talent.effect.attack && (
                    <span className="px-2 py-1 rounded bg-ember/10 text-ember">
                      +{talent.effect.attack} Attacco
                    </span>
                  )}
                  {talent.effect.defense && (
                    <span className="px-2 py-1 rounded bg-fate/10 text-fate">
                      +{talent.effect.defense} Difesa
                    </span>
                  )}
                </div>

                {talent.requires && talent.requires.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-800">
                    <div className="text-xs text-mist">
                      Richiede: {talent.requires.map(r => {
                        const req = talents.find(t => t.id === r);
                        return req ? req.name : r;
                      }).join(', ')}
                    </div>
                  </div>
                )}

                {isLocked && !isUnlocked && (
                  <div className="mt-3 text-xs text-mist italic">
                    🔒 Sblocca i talenti precedenti per accedere a questo
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={onBack}
          className="w-full py-3 rounded-lg border border-gray-700 text-mist hover:text-bone hover:border-ember/30 transition-colors text-sm mt-6"
        >
          ← Torna al Villaggio
        </button>
      </div>
    </div>
  );
}
