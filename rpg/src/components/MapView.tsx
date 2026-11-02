import type { GameState } from '../game/types';
import ConstellationMap from './ConstellationMap';

interface MapViewProps {
  state: GameState;
  onBack: () => void;
  onSpendIntuition: () => void;
  onResolvePromise: (promiseId: string, keep: boolean) => void;
}

export default function MapView({ state, onBack, onSpendIntuition, onResolvePromise }: MapViewProps) {
  const valleyStates = [
    { name: 'Fioritura', active: state.factionRep.guaritori > 3, color: '#2dd4bf' },
    { name: 'Tensione', active: state.dissonance > 5, color: '#b45309' },
    { name: 'Corruzione', active: state.corruption > 50, color: '#4a0e4e' },
    { name: 'Cenere', active: state.factionRep.culto > 3, color: '#8b1a1a' },
    { name: 'Eclipse', active: state.factionRep.culto > 5 && state.corruption > 60, color: '#ef4444' },
    { name: 'Rinascita', active: state.factionRep.guaritori > 5 && state.resonance > 8, color: '#22c55e' },
  ];

  const activeStates = valleyStates.filter(s => s.active);

  return (
    <div className="min-h-screen pt-16 pb-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-bone mb-2">Bussola del Fato</h2>
          <p className="text-sm text-mist italic">
            Le costellazioni narrano la storia delle tue scelte.
          </p>
        </div>

        {/* Constellation */}
        <div className="card-dark rounded-xl p-6 mb-8">
          <ConstellationMap activeStars={state.constellationStars} />
        </div>

        {/* Valley state */}
        <div className="card-dark rounded-xl p-6 mb-8">
          <h3 className="font-bold text-bone mb-4 text-sm">Stato della Valle</h3>
          {activeStates.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {activeStates.map(s => (
                <span
                  key={s.name}
                  className="text-xs px-3 py-1.5 rounded-full border animate-pulse"
                  style={{ borderColor: s.color, color: s.color }}
                >
                  {s.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-mist italic">La valle è in equilibrio... per ora.</p>
          )}
        </div>

        {/* Faction reputation */}
        <div className="card-dark rounded-xl p-6 mb-8">
          <h3 className="font-bold text-bone mb-4 text-sm">Reputazione tra le Fazioni</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { key: 'culto' as const, name: 'Culto di Vhalzareth', color: '#8b1a1a', icon: '🕯️' },
              { key: 'capitale' as const, name: 'Capitale', color: '#c4421a', icon: '🏛️' },
              { key: 'contadini' as const, name: 'Contadini', color: '#2dd4bf', icon: '🌾' },
              { key: 'guaritori' as const, name: 'Guaritori', color: '#22c55e', icon: '🌿' },
              { key: 'eretici' as const, name: 'Eretici', color: '#a855f7', icon: '🔮' },
            ].map(f => {
              const rep = state.factionRep[f.key];
              const stateName = rep <= -3 ? 'Bandito' : rep <= -1 ? 'Temuto' : rep === 0 ? 'Ignorato' : rep <= 2 ? 'Tollerato' : rep <= 4 ? 'Fidato' : 'Adorato';
              return (
                <div key={f.key} className="flex items-center gap-3 border border-gray-800 rounded-lg p-3">
                  <span className="text-lg">{f.icon}</span>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-bone">{f.name}</div>
                    <div className="text-[10px]" style={{ color: f.color }}>{stateName}</div>
                  </div>
                  <div className={`text-sm font-bold ${rep > 0 ? 'text-resonance' : rep < 0 ? 'text-dissonance' : 'text-mist'}`}>
                    {rep > 0 ? '+' : ''}{rep}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Intuizione */}
        <div className="card-dark rounded-xl p-6 mb-8">
          <h3 className="font-bold text-bone mb-3 text-sm">Spendi Intuizione</h3>
          <p className="text-xs text-mist mb-3">
            Rivela una stella nascosta nella costellazione del tuo destino.
          </p>
          <button
            onClick={onSpendIntuition}
            disabled={state.intuizione <= 0}
            className="w-full py-2 rounded-lg border border-fate/30 text-fate hover:bg-fate/10 transition-colors text-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            🔮 Rivela Stella ({state.intuizione} Intuizione)
          </button>
        </div>

        {/* Promesse Differite */}
        {state.promises.length > 0 && (
          <div className="card-dark rounded-xl p-6 mb-8">
            <h3 className="font-bold text-bone mb-3 text-sm">Promesse Differite</h3>
            <p className="text-xs text-mist mb-3">
              Le tue scelte hanno creato Promesse. Mantienile per guadagnare Risonanza, o infrangile per aumentare la Dissonanza.
            </p>
            <div className="space-y-2">
              {state.promises.map(promise => (
                <div key={promise.id} className="border border-gray-800 rounded-lg p-3">
                  <p className="text-xs text-bone/80 mb-2">{promise.text}</p>
                  {promise.kept ? (
                    <div className="text-xs text-resonance">✨ Promessa mantenuta</div>
                  ) : promise.broken ? (
                    <div className="text-xs text-dissonance">💔 Promessa infranta</div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => onResolvePromise(promise.id, true)}
                        className="flex-1 py-1 rounded border border-resonance/30 text-resonance text-xs hover:bg-resonance/10 transition-colors"
                      >
                        ✓ Mantieni
                      </button>
                      <button
                        onClick={() => onResolvePromise(promise.id, false)}
                        className="flex-1 py-1 rounded border border-dissonance/30 text-dissonance text-xs hover:bg-dissonance/10 transition-colors"
                      >
                        ✗ Infrangi
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fardello info */}
        {state.fardello && (
          <div className="card-dark rounded-xl p-6 mb-8">
            <h3 className="font-bold text-bone mb-3 text-sm">Il tuo Fardello</h3>
            <div className="flex items-start gap-4">
              <span className="text-3xl">{state.fardello.icon}</span>
              <div>
                <h4 className="font-bold text-ember">{state.fardello.name}</h4>
                <p className="text-xs text-bone/70 mt-1">{state.fardello.description}</p>
                <div className="mt-2 text-xs text-mist">
                  <div>Eco: <span className="text-resonance">{state.fardello.echoName}</span></div>
                  <div>Ombra: <span className="text-dissonance">{state.fardello.shadowName}</span></div>
                  <div>Peso: {'●'.repeat(state.fardello.weight)}{'○'.repeat(5 - state.fardello.weight)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="card-dark rounded-xl p-6">
          <h3 className="font-bold text-bone mb-3 text-sm">Statistiche</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div>
              <div className="text-lg font-bold text-ember">{state.choicesMade}</div>
              <div className="text-[10px] text-mist">Scelte</div>
            </div>
            <div>
              <div className="text-lg font-bold text-resonance">{state.bossesDefeated}</div>
              <div className="text-[10px] text-mist">Boss Sconfitti</div>
            </div>
            <div>
              <div className="text-lg font-bold text-fate">{state.fragments}</div>
              <div className="text-[10px] text-mist">Frammenti</div>
            </div>
            <div>
              <div className="text-lg font-bold text-rust">{state.constellationStars.length}</div>
              <div className="text-[10px] text-mist">Stelle Accese</div>
            </div>
          </div>
        </div>

        <button
          onClick={onBack}
          className="mt-6 w-full py-3 rounded-lg border border-gray-700 text-mist hover:text-bone hover:border-ember/30 transition-colors text-sm"
        >
          ← Torna al villaggio
        </button>
      </div>
    </div>
  );
}
