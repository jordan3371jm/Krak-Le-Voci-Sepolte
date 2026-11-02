import type { GameState } from '../game/types';

interface AscensionViewProps {
  state: GameState;
  onBack: () => void;
  onAscend: (type: string) => void;
}

export default function AscensionView({ state, onBack, onAscend }: AscensionViewProps) {
  const canAscend = state.level >= 5 && state.bossesDefeated >= 2 && !state.ascension;

  const ascensions = [
    {
      id: 'martyr',
      name: 'Martire della Valle',
      description: 'Resurrezione una volta per spedizione',
      benefits: '+20 HP, resurrezione automatica',
      costs: '-10 HP permanente',
      icon: '🩸',
      color: '#2dd4bf',
    },
    {
      id: 'judge',
      name: 'Giudice Silenzioso',
      description: 'Vedi punti deboli nemici',
      benefits: '+5 Attacco, rivela debolezze',
      costs: '-3 Risonanza attuale',
      icon: '⚖️',
      color: '#a855f7',
    },
    {
      id: 'broken',
      name: 'Portatore Spezzato',
      description: 'Risonanza più veloce, echi corrotti',
      benefits: '+5 Risonanza, echi corrotti',
      costs: '-15 HP permanente',
      icon: '💔',
      color: '#ef4444',
    },
  ];

  return (
    <div className="min-h-screen pt-16 pb-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-bone mb-2">⬆️ Ascensione del Fardello</h2>
          <p className="text-sm text-mist italic">
            Evolvi il tuo Fardello in una forma più potente e vincolante.
          </p>
        </div>

        {/* Requirements */}
        <div className="card-dark rounded-xl p-4 mb-6">
          <h3 className="text-sm font-bold text-bone mb-3">Requisiti</h3>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className={`border rounded-lg p-3 ${state.level >= 5 ? 'border-resonance/30' : 'border-gray-800'}`}>
              <div className={`text-lg font-bold ${state.level >= 5 ? 'text-resonance' : 'text-mist'}`}>
                {state.level >= 5 ? '✓' : '✗'} Livello 5
              </div>
              <div className="text-xs text-mist">Attuale: {state.level}</div>
            </div>
            <div className={`border rounded-lg p-3 ${state.bossesDefeated >= 2 ? 'border-resonance/30' : 'border-gray-800'}`}>
              <div className={`text-lg font-bold ${state.bossesDefeated >= 2 ? 'text-resonance' : 'text-mist'}`}>
                {state.bossesDefeated >= 2 ? '✓' : '✗'} 2 Boss Sconfitti
              </div>
              <div className="text-xs text-mist">Attuali: {state.bossesDefeated}</div>
            </div>
          </div>
        </div>

        {/* Current Ascension */}
        {state.ascension && (
          <div className="card-dark rounded-xl p-4 mb-6 border border-fate/30">
            <h3 className="text-sm font-bold text-fate mb-2">Ascensione Attuale</h3>
            <div className="text-lg font-bold text-bone">{state.ascension.name}</div>
            <div className="text-xs text-bone/70 mt-1">{state.ascension.description}</div>
          </div>
        )}

        {/* Ascension Options */}
        {canAscend && (
          <div className="card-dark rounded-xl p-4 mb-6">
            <h3 className="text-sm font-bold text-bone mb-3">Scegli la tua Evoluzione</h3>
            <div className="space-y-3">
              {ascensions.map(asc => (
                <div key={asc.id} className="border border-gray-800 rounded-lg p-4 hover:border-ember/50 transition-colors">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="text-3xl">{asc.icon}</div>
                    <div className="flex-1">
                      <div className="text-sm font-bold" style={{ color: asc.color }}>{asc.name}</div>
                      <div className="text-xs text-bone/70 mt-1">{asc.description}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="text-resonance">✓ {asc.benefits}</div>
                    <div className="text-dissonance">✗ {asc.costs}</div>
                  </div>
                  <button
                    onClick={() => onAscend(asc.id)}
                    className="w-full py-2 rounded border border-fate/30 text-fate text-xs hover:bg-fate/10 transition-colors"
                  >
                    Ascendi a {asc.name}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!canAscend && !state.ascension && (
          <div className="card-dark rounded-xl p-6 text-center">
            <div className="text-4xl mb-3">🔒</div>
            <p className="text-sm text-mist">
              Non hai ancora raggiunto i requisiti per l'Ascensione.
            </p>
          </div>
        )}

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
