import type { GameState } from '../game/types';
import { playVictorySound, playDefeatSound } from '../game/audio';
import { useEffect, useState } from 'react';
import { createLegacy, persistState } from '../game/store';

interface EndingProps {
  state: GameState;
  onRestart: () => void;
  onNewGame: () => void;
}

export default function Ending({ state, onRestart, onNewGame }: EndingProps) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    setTimeout(() => setShowContent(true), 500);

    // Play appropriate sound
    const allDead = state.party.every(p => p.hp <= 0);
    if (allDead) {
      playDefeatSound();
    } else {
      playVictorySound();
    }
  }, []);

  const allDead = state.party.every(p => p.hp <= 0);
  const dungeonComplete = state.dungeonCompleted;

  // Determine ending archetype based on endingFlags, fardello, resonance, dissonance
  const getEnding = () => {
    if (allDead) {
      return {
        title: 'La Valle Brucia Con Te',
        description: 'Il tuo viaggio termina qui. Ma le tue scelte hanno lasciato un\'eco nel mondo. Forse un altro Portatore raccoglierà il tuo Fardello.',
        color: '#ef4444',
        icon: '🔥',
      };
    }

    // Finali basati sulle endingFlags del boss (scelta narrativa finale)
    if (state.endingFlags.includes('freed_voices')) {
      if (state.resonance >= 8) {
        return {
          title: 'Il Liberatore Silenzioso',
          description: 'Hai liberato le voci e hai portato la Risonanza al suo apice. La valle respira di nuovo. Il tuo nome sarà cantato dai venti, anche se nessuno lo pronuncerà mai ad alta voce.',
          color: '#2dd4bf',
          icon: '🕊️',
        };
      }
      return {
        title: 'L\'Eco della Libertà',
        description: 'Hai liberato le voci, ma la dissonanza ti ha segnato. La valle è libera, ma tu sei perduto. Un sacrificio incompleto.',
        color: '#b45309',
        icon: '🌫️',
      };
    }

    if (state.endingFlags.includes('absorbed_voices')) {
      if (state.fardello?.type === 'sacrificio') {
        return {
          title: 'Il Martire Che Non Viene Ricordato',
          description: 'Hai portato il peso del sacrificio fino in fondo, assorbendo il dolore di tutti. La valle ti dimenticherà, ma le cicatrici della tua scelta rimarranno per sempre incise nella realtà.',
          color: '#2dd4bf',
          icon: '🩸',
        };
      }
      return {
        title: 'Il Portatore del Dolore',
        description: 'Hai assorbito le voci nel tuo Fardello. Il loro peso ti schiaccerà, ma la valle è salva. Un sacrificio che nessuno comprenderà mai.',
        color: '#a855f7',
        icon: '💀',
      };
    }

    if (state.endingFlags.includes('silenced_voices')) {
      if (state.dissonance >= 8) {
        return {
          title: 'Il Mercante del Destino',
          description: 'Hai commerciato con il destino e hai vinto. Le voci sono state ridotte al silenzio, il tuo potere è assoluto. Ma il prezzo pagato ti ha trasformato in qualcosa di più e di meno di umano.',
          color: '#8b1a1a',
          icon: '⛓️',
        };
      }
      return {
        title: 'Il Tiranno del Silenzio',
        description: 'Hai imposto il silenzio con la forza. La valle obbedisce, ma non ti ama. Il tuo regno è costruito sulle ossa di chi non ha potuto parlare.',
        color: '#ef4444',
        icon: '👑',
      };
    }

    // Fallback per fardello senza scelta finale
    if (dungeonComplete && state.fardello) {
      switch (state.fardello.type) {
        case 'sacrificio':
          if (state.resonance >= 8) {
            return {
              title: 'Il Martire Che Non Viene Ricordato',
              description: 'Hai portato il peso del sacrificio fino in fondo. La valle ti dimenticherà, ma le cicatrici della tua scelta rimarranno per sempre incise nella realtà.',
              color: '#2dd4bf',
              icon: '🩸',
            };
          }
          return {
            title: 'Il Ciclo Spezzato',
            description: 'Il sacrificio è stato compiuto, ma la dissonanza ti ha corrotto. Il ciclo continua, ma qualcosa è cambiato per sempre.',
            color: '#b45309',
            icon: '⛓️',
          };

        case 'sangue':
          if (state.dissonance >= 8) {
            return {
              title: 'Il Mercante del Destino',
              description: 'Hai commerciato con il destino e hai vinto. Ma il prezzo pagato ti ha trasformato in qualcosa di più e di meno di umano.',
              color: '#8b1a1a',
              icon: '⛓️',
            };
          }
          return {
            title: 'Il Nome Cancellato',
            description: 'Il debito è stato pagato. Ma il tuo nome è stato cancellato dai registri della realtà. Esisti, ma nessuno ti ricorderà.',
            color: '#a855f7',
            icon: '👻',
          };

        case 'silenzio':
          if (state.resonance >= 6) {
            return {
              title: 'Il Dio Silenzioso',
              description: 'Hai scelto di osservare, di non intervenire. Ma il silenzio stesso è diventato il tuo potere. La valle ti teme e ti venera.',
              color: '#a855f7',
              icon: '👁️',
            };
          }
          return {
            title: "L'Aberrazione Redenta",
            description: 'Il silenzio ti ha corrotto, ma alla fine hai trovato una via di redenzione. Non sei più umano, ma non sei nemmeno mostro.',
            color: '#4a0e4e',
            icon: '💀',
          };

        default:
          return {
            title: 'La Comunità dei Frammenti',
            description: 'Il tuo viaggio è terminato. I Frammenti che hai raccolto raccontano la tua storia al mondo condiviso.',
            color: '#b45309',
            icon: '💎',
          };
      }
    }

    return {
      title: 'Il Viaggio Interrotto',
      description: 'La tua spedizione si è conclusa prima del previsto. Ma il mondo ricorda ciò che hai fatto.',
      color: '#9ca3af',
      icon: '🌫️',
    };
  };

  const ending = getEnding();

  return (
    <div className="min-h-screen pt-16 pb-8 px-4 flex items-center justify-center">
      <div className={`max-w-2xl mx-auto text-center transition-all duration-1000 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Ending icon */}
        <div className="text-6xl mb-6 animate-float">{ending.icon}</div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: ending.color }}>
          {ending.title}
        </h1>

        {/* Description */}
        <p className="text-sm text-bone/80 leading-relaxed italic mb-8">
          {ending.description}
        </p>

        {/* Stats summary */}
        <div className="card-dark rounded-xl p-6 mb-8">
          <h3 className="font-bold text-bone mb-4 text-sm">Il tuo Viaggio</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-ember">{state.choicesMade}</div>
              <div className="text-[10px] text-mist">Scelte Fatte</div>
            </div>
            <div>
              <div className="text-lg font-bold text-resonance">{state.resonance}</div>
              <div className="text-[10px] text-mist">Risonanza Finale</div>
            </div>
            <div>
              <div className="text-lg font-bold text-dissonance">{state.dissonance}</div>
              <div className="text-[10px] text-mist">Dissonanza Finale</div>
            </div>
            <div>
              <div className="text-lg font-bold text-fate">{state.fragments}</div>
              <div className="text-[10px] text-mist">Frammenti Raccolti</div>
            </div>
          </div>

          {state.fardello && (
            <div className="mt-4 pt-4 border-t border-gray-800">
              <div className="text-xs text-mist">Fardello Portato:</div>
              <div className="text-sm font-semibold mt-1" style={{ color: ending.color }}>
                {state.fardello.icon} {state.fardello.name}
              </div>
            </div>
          )}
        </div>

        {/* Legacy message */}
        <div className="mb-8 p-4 border border-fate/20 rounded-xl bg-fate/5">
          <p className="text-xs text-fate/80 italic">
            La tua eredità rimarrà nel mondo condiviso. Un altro Portatore potrebbe incontrare
            l'eco delle tue scelte, raccogliere i Frammenti che hai lasciato, o affrontare
            l'Ombra che hai generato.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={onRestart}
            className="w-full py-3 rounded-lg border border-ember/30 text-ember hover:bg-ember/10 transition-colors text-sm font-semibold"
          >
            ↺ Ricomincia la Spedizione
          </button>
          <button
            onClick={() => {
              // Salva eredità prima di iniziare un nuovo gioco
              const withLegacy = createLegacy(state);
              persistState(withLegacy);
              onNewGame();
            }}
            className="w-full py-3 rounded-lg border border-gray-700 text-mist hover:text-bone hover:border-ember/30 transition-colors text-sm"
          >
            ✦ Nuovo Personaggio
          </button>
        </div>

        {/* Footer quote */}
        <div className="mt-12 text-xs text-mist/50 italic">
          "Il mondo non salva i tuoi progressi. Li ricorda."
        </div>
      </div>
    </div>
  );
}
