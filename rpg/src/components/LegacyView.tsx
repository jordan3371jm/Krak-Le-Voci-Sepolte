import { useState, useEffect } from 'react';
import { loadLegacyFromLocal } from '../game/save';
import type { Legacy } from '../game/types';

export default function LegacyView({ onBack }: { onBack: () => void }) {
  const [legacies, setLegacies] = useState<Legacy[]>([]);

  useEffect(() => {
    setLegacies(loadLegacyFromLocal());
  }, []);

  const worldTemp = legacies.reduce((acc, l) => {
    if (l.endingFlag === 'freed_voices') acc.fioritura++;
    if (l.endingFlag === 'silenced_voices') acc.corruzione++;
    if (l.endingFlag === 'absorbed_voices') acc.sacrificio++;
    return acc;
  }, { fioritura: 0, corruzione: 0, sacrificio: 0 });

  const dominant =
    worldTemp.fioritura > worldTemp.corruzione && worldTemp.fioritura > worldTemp.sacrificio ? 'Fioritura'
    : worldTemp.corruzione > worldTemp.sacrificio ? 'Corruzione'
    : worldTemp.sacrificio > 0 ? 'Sacrificio'
    : 'Equilibrio';

  return (
    <div className="min-h-screen pt-16 pb-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-bone mb-2">🏛️ Eredità dei Portatori</h2>
          <p className="text-sm text-mist italic">Ogni fine è un inizio per un altro Portatore.</p>
        </div>

        <div className="card-dark rounded-xl p-4 mb-6 border border-fate/30">
          <h3 className="font-bold text-fate text-sm mb-2">🌍 Temperatura Narrativa del Mondo</h3>
          <div className="text-lg text-bone">{dominant}</div>
          <p className="text-xs text-mist mt-1">
            {legacies.length} eredità registrate su questo dispositivo
          </p>
        </div>

        {legacies.length === 0 ? (
          <div className="card-dark rounded-xl p-6 text-center">
            <p className="text-sm text-mist italic">Nessuna eredità ancora. Completa un viaggio per lasciare la tua traccia.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {legacies.slice().reverse().map((leg, i) => (
              <div key={i} className="card-dark rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {leg.legacyType === 'npc' ? '👤'
                     : leg.legacyType === 'dungeon' ? '🏰'
                     : leg.legacyType === 'fragment' ? '💎' : '📜'}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-bone">{leg.playerName}</div>
                    <div className="text-xs text-mist">
                      {leg.fardelloType} • {leg.legacyType} • {new Date(leg.timestamp).toLocaleDateString()}
                    </div>
                    <div className="text-[10px] text-fate mt-1">Finale: {leg.endingFlag}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button onClick={onBack} className="mt-6 w-full py-3 rounded-lg border border-gray-700 text-mist hover:text-bone hover:border-ember/30 text-sm">
          ← Torna al Villaggio
        </button>
      </div>
    </div>
  );
}
