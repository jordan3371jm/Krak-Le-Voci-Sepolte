import { useState, useEffect } from 'react';

interface CombatAction {
  name: string;
  type: 'attack' | 'defend' | 'sacrifice' | 'betray';
  resonance: number;
  dissonance: number;
  description: string;
}

const actions: CombatAction[] = [
  { name: 'Colpo del Fardello', type: 'attack', resonance: 2, dissonance: 0, description: 'Un attacco che porta il peso delle tue scelte.' },
  { name: 'Scudo del Martire', type: 'defend', resonance: 3, dissonance: 0, description: 'Proteggi un alleato subendo danno al posto suo.' },
  { name: 'Sacrificio di Sangue', type: 'sacrifice', resonance: 4, dissonance: 0, description: 'Sacrifichi salute per infliggere danno sacro.' },
  { name: 'Tradimento Tattico', type: 'betray', resonance: 0, dissonance: 3, description: 'Usi un alleato come scudo. Potente ma corrotto.' },
];

export default function CombatDemo() {
  const [resonance, setResonance] = useState(0);
  const [dissonance, setDissonance] = useState(0);
  const [corruption, setCorruption] = useState(30);
  const [log, setLog] = useState<string[]>(['⚔️ Il combattimento inizia...']);
  const [echoReady, setEchoReady] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  useEffect(() => {
    if (resonance >= 10 && !echoReady) {
      setEchoReady(true);
      setLog(prev => [...prev, '🌟 Risonanza al massimo! Eco del Fardello disponibile!']);
    }
  }, [resonance, echoReady]);

  const performAction = (action: CombatAction) => {
    if (animating) return;
    setAnimating(true);
    setLastAction(action.name);

    const newResonance = Math.min(15, resonance + action.resonance);
    const newDissonance = Math.min(15, dissonance + action.dissonance);
    const corruptionDelta = action.type === 'betray' ? 10 : action.type === 'sacrifice' ? -5 : 0;
    const newCorruption = Math.max(0, Math.min(100, corruption + corruptionDelta));

    setResonance(newResonance);
    setDissonance(newDissonance);
    setCorruption(newCorruption);

    let logEntry = '';
    switch (action.type) {
      case 'attack':
        logEntry = `⚔️ ${action.name} — +${action.resonance} Risonanza`;
        break;
      case 'defend':
        logEntry = `🛡️ ${action.name} — +${action.resonance} Risonanza, alleato protetto`;
        break;
      case 'sacrifice':
        logEntry = `💀 ${action.name} — +${action.resonance} Risonanza, -5% Corruzione`;
        break;
      case 'betray':
        logEntry = `🗡️ ${action.name} — +${action.dissonance} Dissonanza, +10% Corruzione`;
        break;
    }
    setLog(prev => [...prev.slice(-5), logEntry]);

    setTimeout(() => {
      setAnimating(false);
      setLastAction(null);
    }, 800);
  };

  const useEcho = () => {
    if (!echoReady) return;
    setResonance(0);
    setEchoReady(false);
    setLog(prev => [...prev.slice(-5), '✨ ECO DEL SACRIFICIO attivato! Danno pari alla salute persa proteggendo alleati.']);
  };

  const reset = () => {
    setResonance(0);
    setDissonance(0);
    setCorruption(30);
    setEchoReady(false);
    setLog(['⚔️ Il combattimento ricomincia...']);
  };

  return (
    <div className="card-dark rounded-xl p-6 max-w-2xl mx-auto">
      {/* Status bars */}
      <div className="space-y-3 mb-6">
        {/* Resonance */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-resonance font-semibold">Risonanza</span>
            <span className="text-mist">{resonance}/15</span>
          </div>
          <div className="h-3 bg-ink rounded-full overflow-hidden border border-gray-800">
            <div
              className="h-full resonance-bar rounded-full transition-all duration-500"
              style={{ width: `${(resonance / 15) * 100}%` }}
            />
          </div>
        </div>

        {/* Dissonance */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-dissonance font-semibold">Dissonanza</span>
            <span className="text-mist">{dissonance}/15</span>
          </div>
          <div className="h-3 bg-ink rounded-full overflow-hidden border border-gray-800">
            <div
              className="h-full dissonance-bar rounded-full transition-all duration-500"
              style={{ width: `${(dissonance / 15) * 100}%` }}
            />
          </div>
        </div>

        {/* Corruption */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-fate font-semibold">Corruzione Ambientale</span>
            <span className="text-mist">{corruption}%</span>
          </div>
          <div className="h-3 bg-ink rounded-full overflow-hidden border border-gray-800">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${corruption}%`,
                background: `linear-gradient(90deg, #0d0d0d, ${corruption > 60 ? '#ef4444' : '#4a0e4e'})`
              }}
            />
          </div>
        </div>
      </div>

      {/* Echo button */}
      {echoReady && (
        <button
          onClick={useEcho}
          className="w-full mb-4 py-3 rounded-lg bg-gradient-to-r from-teal-900/50 to-purple-900/50 border border-resonance/50 text-resonance font-semibold hover:border-resonance transition-all animate-pulse-glow"
        >
          ✨ Attiva Eco del Sacrificio
        </button>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {actions.map((action) => (
          <button
            key={action.name}
            onClick={() => performAction(action)}
            disabled={animating}
            className={`p-3 rounded-lg border text-left transition-all ${
              lastAction === action.name
                ? 'border-ember bg-ember/10 scale-95'
                : action.type === 'betray'
                ? 'border-dissonance/30 hover:border-dissonance/60 bg-ink/50'
                : 'border-ember/20 hover:border-ember/50 bg-ink/50'
            } ${animating ? 'opacity-50' : ''}`}
          >
            <div className="text-sm font-semibold text-bone">{action.name}</div>
            <div className="text-xs text-mist mt-1">{action.description}</div>
            <div className="flex gap-2 mt-2 text-xs">
              {action.resonance > 0 && (
                <span className="text-resonance">+{action.resonance} Ris</span>
              )}
              {action.dissonance > 0 && (
                <span className="text-dissonance">+{action.dissonance} Dis</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Combat log */}
      <div className="bg-ink/80 rounded-lg p-3 border border-gray-800/50 max-h-32 overflow-y-auto">
        <div className="text-xs text-mist mb-2 font-semibold">Log Combattimento</div>
        {log.map((entry, i) => (
          <div key={i} className="text-xs text-bone/70 py-0.5">{entry}</div>
        ))}
      </div>

      {/* Reset */}
      <button
        onClick={reset}
        className="mt-3 text-xs text-mist hover:text-ember transition-colors"
      >
        ↺ Reset combattimento demo
      </button>
    </div>
  );
}
