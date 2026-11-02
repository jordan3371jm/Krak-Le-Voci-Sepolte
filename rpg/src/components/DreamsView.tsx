import type { GameState } from '../game/types';

interface DreamsViewProps {
  state: GameState;
  onBack: () => void;
  onClaimDream: (dreamId: string) => void;
}

export default function DreamsView({ state, onBack, onClaimDream }: DreamsViewProps) {
  const unclaimedDreams = state.offlineDreams;

  return (
    <div className="min-h-screen pt-16 pb-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-bone mb-2">🌙 Sogni del Portatore</h2>
          <p className="text-sm text-mist italic">
            Mentre eri via, il tuo personaggio ha sognato...
          </p>
        </div>

        {unclaimedDreams.length === 0 ? (
          <div className="card-dark rounded-xl p-6 text-center">
            <div className="text-4xl mb-3">💤</div>
            <p className="text-sm text-mist">
              Nessun sogno non reclamato. Torna dopo essere stato offline per un po'.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {unclaimedDreams.map(dream => (
              <div key={dream.id} className="card-dark rounded-xl p-4 border border-fate/30">
                <div className="flex items-start gap-3 mb-3">
                  <div className="text-3xl">🌙</div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-fate">{dream.title}</div>
                    <div className="text-xs text-bone/70 mt-1">{dream.description}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  {dream.rewards.fragments && dream.rewards.fragments > 0 && (
                    <div className="border border-fate/20 rounded p-2 text-center">
                      <div className="text-fate font-bold">+{dream.rewards.fragments}</div>
                      <div className="text-mist">Frammenti</div>
                    </div>
                  )}
                  {dream.rewards.cenere && dream.rewards.cenere > 0 && (
                    <div className="border border-rust/20 rounded p-2 text-center">
                      <div className="text-rust font-bold">+{dream.rewards.cenere}</div>
                      <div className="text-mist">Cenere</div>
                    </div>
                  )}
                </div>

                {dream.consequences.length > 0 && (
                  <div className="text-xs text-mist italic mb-3">
                    Conseguenze: {dream.consequences.join(', ')}
                  </div>
                )}

                <button
                  onClick={() => onClaimDream(dream.id)}
                  className="w-full py-2 rounded border border-fate/30 text-fate text-xs hover:bg-fate/10 transition-colors"
                >
                  Reclama Ricompense
                </button>
              </div>
            ))}
          </div>
        )}

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
