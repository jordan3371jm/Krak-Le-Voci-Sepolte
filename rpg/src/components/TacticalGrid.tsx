import type { GameState, Position } from '../game/types';

interface TacticalGridProps {
  state: GameState;
  onMove: (charId: string, target: Position) => void;
  selectedCharId: string | null;
}

export default function TacticalGrid({ state, onMove, selectedCharId }: TacticalGridProps) {
  const gridSize = 5;
  const selectedChar = state.party.find(p => p.id === selectedCharId);

  const handleCellClick = (x: number, y: number) => {
    if (!selectedChar || !selectedChar.position) return;
    
    // Verifica se la cella è raggiungibile
    const dist = Math.abs(selectedChar.position.x - x) + Math.abs(selectedChar.position.y - y);
    if (dist > 0 && dist <= (selectedChar.moveRange || 2)) {
      onMove(selectedChar.id, { x, y });
    }
  };

  const isReachable = (x: number, y: number): boolean => {
    if (!selectedChar || !selectedChar.position) return false;
    const dist = Math.abs(selectedChar.position.x - x) + Math.abs(selectedChar.position.y - y);
    return dist > 0 && dist <= (selectedChar.moveRange || 2);
  };

  const isOccupied = (x: number, y: number): { type: 'player' | 'ally' | 'enemy'; name: string } | null => {
    const char = state.party.find(p => p.position?.x === x && p.position?.y === y && p.hp > 0);
    if (char) return { type: char.role === 'player' ? 'player' : 'ally', name: char.name };
    
    if (state.currentEnemy?.position?.x === x && state.currentEnemy?.position?.y === y) {
      return { type: 'enemy', name: state.currentEnemy.name };
    }
    
    return null;
  };

  return (
    <div className="card-dark rounded-xl p-4 mb-4">
      <h3 className="text-xs text-mist font-semibold mb-3">Griglia Tattica 5x5</h3>
      <div className="grid grid-cols-5 gap-1 max-w-xs mx-auto">
        {Array.from({ length: gridSize }).map((_, y) =>
          Array.from({ length: gridSize }).map((_, x) => {
            const occupied = isOccupied(x, y);
            const reachable = isReachable(x, y);
            const isSelected = selectedChar?.position?.x === x && selectedChar?.position?.y === y;

            return (
              <button
                key={`${x}-${y}`}
                onClick={() => handleCellClick(x, y)}
                disabled={!reachable}
                className={`aspect-square rounded border-2 flex items-center justify-center text-xs transition-all ${
                  isSelected
                    ? 'border-resonance bg-resonance/20'
                    : occupied
                    ? occupied.type === 'player'
                      ? 'border-ember bg-ember/20'
                      : occupied.type === 'ally'
                      ? 'border-resonance bg-resonance/10'
                      : 'border-dissonance bg-dissonance/20'
                    : reachable
                    ? 'border-gray-600 bg-gray-800/50 hover:bg-gray-700/50 cursor-pointer'
                    : 'border-gray-800 bg-ink/50'
                }`}
                title={occupied ? occupied.name : `(${x}, ${y})`}
              >
                {occupied ? (
                  <span className="text-lg">
                    {occupied.type === 'player' ? '👤' : occupied.type === 'ally' ? '👥' : '💀'}
                  </span>
                ) : reachable ? (
                  <span className="text-gray-600 text-xs">•</span>
                ) : null}
              </button>
            );
          })
        )}
      </div>
      {selectedChar && (
        <div className="mt-3 text-center text-xs text-mist">
          Selezionato: <span className="text-bone font-semibold">{selectedChar.name}</span>
          {selectedChar.position && (
            <span className="ml-2 text-gray-500">
              Posizione: ({selectedChar.position.x}, {selectedChar.position.y})
            </span>
          )}
        </div>
      )}
    </div>
  );
}
