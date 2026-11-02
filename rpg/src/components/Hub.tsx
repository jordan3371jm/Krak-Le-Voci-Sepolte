import { useState } from 'react';
import type { GameState } from '../game/types';
import { NPCS } from '../game/data';
import { playChoiceSound } from '../game/audio';

interface HubProps {
  state: GameState;
  onChoice: (fardello: 'sacrificio' | 'sangue' | 'silenzio') => void;
  onEnterDungeon: () => void;
  onViewMap: () => void;
  onBuyPotion: () => void;
  onOpenMarket: () => void;
  onOpenAscension: () => void;
  onOpenDreams: () => void;
  onSpawnShadowBoss: () => void;
  onUseNameAsSpell: () => void;
  onOpenTalents: () => void;
  onOpenLegacies: () => void;
}

export default function Hub({ state, onChoice, onEnterDungeon, onViewMap, onBuyPotion, onOpenMarket, onOpenAscension, onOpenDreams, onSpawnShadowBoss, onUseNameAsSpell, onOpenTalents, onOpenLegacies }: HubProps) {
  const [selectedNPC, setSelectedNPC] = useState<string | null>(null);
  const [dialogueStep, setDialogueStep] = useState(0);
  const [showChoice, setShowChoice] = useState(false);

  const currentNPC = selectedNPC ? NPCS.find(n => n.id === selectedNPC) : null;
  const hasFardello = state.fardello !== null;

  const handleNPCClick = (npcId: string) => {
    if (hasFardello) return; // Can't talk to NPCs after choosing a fardello
    setSelectedNPC(npcId);
    setDialogueStep(0);
    setShowChoice(false);
    playChoiceSound();
  };

  const handleNextDialogue = () => {
    if (!currentNPC) return;

    if (dialogueStep < currentNPC.dialogue.length - 1) {
      setDialogueStep(dialogueStep + 1);
      playChoiceSound();
    } else {
      setShowChoice(true);
    }
  };

  const handleFardelloChoice = (type: 'sacrificio' | 'sangue' | 'silenzio') => {
    onChoice(type);
  };

  const handleCloseDialogue = () => {
    setSelectedNPC(null);
    setDialogueStep(0);
    setShowChoice(false);
  };

  return (
    <div className="min-h-screen pt-16 pb-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Village header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-bone mb-2">Hondovalle Bassa</h2>
          <p className="text-sm text-mist italic">
            Un villaggio morente ai confini della valle. Tre figure ti aspettano.
          </p>
          {state.fardello && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-ember/30 bg-ember/5">
              <span>{state.fardello.icon}</span>
              <span className="text-xs text-ember">{state.fardello.name}</span>
            </div>
          )}
        </div>

        {/* NPCs */}
        {!selectedNPC && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {NPCS.map(npc => (
              <button
                key={npc.id}
                onClick={() => handleNPCClick(npc.id)}
                className="card-dark rounded-xl p-6 text-left hover:border-ember/50 transition-all group"
              >
                <div className="text-4xl mb-3 group-hover:animate-float">{npc.icon}</div>
                <h3 className="font-bold text-bone mb-1">{npc.name}</h3>
                <p className="text-xs text-mist mb-2">{npc.role}</p>
                <p className="text-xs text-bone/60">
                  Reputazione: <span className={
                    state.factionRep[npc.faction] > 0 ? 'text-resonance' :
                    state.factionRep[npc.faction] < 0 ? 'text-dissonance' : 'text-mist'
                  }>
                    {state.factionRep[npc.faction] > 0 ? '+' : ''}{state.factionRep[npc.faction]}
                  </span>
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Dialogue */}
        {selectedNPC && currentNPC && !hasFardello && (
          <div className="card-dark rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4 mb-4">
              <div className="text-4xl">{currentNPC.icon}</div>
              <div className="flex-1">
                <h3 className="font-bold text-bone mb-2">{currentNPC.name}</h3>
                <p className="text-sm text-bone/80 leading-relaxed">
                  {currentNPC.dialogue[dialogueStep]}
                </p>
              </div>
            </div>

            {!showChoice ? (
              <button
                onClick={handleNextDialogue}
                className="w-full py-2 rounded-lg border border-ember/30 text-ember hover:bg-ember/10 transition-colors text-sm"
              >
                Continua →
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-mist mb-3 italic">Cosa fai?</p>
                {currentNPC.id === 'elara' && (
                  <>
                    <button
                      onClick={() => handleFardelloChoice('sacrificio')}
                      className="w-full p-3 rounded-lg border border-resonance/30 text-left hover:bg-resonance/5 transition-colors"
                    >
                      <div className="text-sm font-semibold text-resonance">Sacrificare la tua salute per salvare il bambino</div>
                      <div className="text-xs text-bone/60 mt-1">Il tuo sangue salverà una vita. Ma il prezzo sarà alto.</div>
                    </button>
                    <button
                      onClick={handleCloseDialogue}
                      className="w-full p-3 rounded-lg border border-gray-700 text-left hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="text-sm text-bone/70">Non puoi aiutare. Ti dispiace.</div>
                    </button>
                  </>
                )}
                {currentNPC.id === 'marcus' && (
                  <>
                    <button
                      onClick={() => handleFardelloChoice('sangue')}
                      className="w-full p-3 rounded-lg border border-dissonance/30 text-left hover:bg-dissonance/5 transition-colors"
                    >
                      <div className="text-sm font-semibold text-dissonance">Consegnare il profugo alla Capitale</div>
                      <div className="text-xs text-bone/60 mt-1">Ordine e sicurezza. Ma a quale prezzo?</div>
                    </button>
                    <button
                      onClick={handleCloseDialogue}
                      className="w-full p-3 rounded-lg border border-gray-700 text-left hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="text-sm text-bone/70">Rifiutare. Il profugo è sotto la tua protezione.</div>
                    </button>
                  </>
                )}
                {currentNPC.id === 'vesper' && (
                  <>
                    <button
                      onClick={() => handleFardelloChoice('silenzio')}
                      className="w-full p-3 rounded-lg border border-fate/30 text-left hover:bg-fate/5 transition-colors"
                    >
                      <div className="text-sm font-semibold text-fate">Rifiutare il patto, ma ascoltare le sue parole</div>
                      <div className="text-xs text-bone/60 mt-1">Il silenzio è una scelta. Ma non senza conseguenze.</div>
                    </button>
                    <button
                      onClick={handleCloseDialogue}
                      className="w-full p-3 rounded-lg border border-gray-700 text-left hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="text-sm text-bone/70">Allontanarti senza una parola.</div>
                    </button>
                  </>
                )}
              </div>
            )}

            <button
              onClick={handleCloseDialogue}
              className="mt-4 text-xs text-mist hover:text-bone transition-colors"
            >
              ← Torna al villaggio
            </button>
          </div>
        )}

        {/* Actions after choice */}
        {hasFardello && (
          <div className="space-y-4">
            <div className="card-dark rounded-xl p-6 text-center">
              <div className="text-4xl mb-3">{state.fardello?.icon}</div>
              <h3 className="text-xl font-bold text-bone mb-2">{state.fardello?.name}</h3>
              <p className="text-sm text-bone/70 italic mb-4">{state.fardello?.description}</p>
              <div className="text-xs text-mist">
                Il tuo Fardello è stato forgiato. Le conseguenze si propagheranno.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={onEnterDungeon}
                className="card-dark rounded-xl p-6 text-left hover:border-ember/50 transition-all group"
              >
                <div className="text-2xl mb-2">🗺️</div>
                <h4 className="font-bold text-bone mb-1">Il Cimitero dei Traditi</h4>
                <p className="text-xs text-mist">
                  Un dungeon che rispecchia il tuo Fardello.
                </p>
                <div className="mt-3 text-xs text-ember">
                  Entra nella spedizione →
                </div>
              </button>

              <button
                onClick={onViewMap}
                className="card-dark rounded-xl p-6 text-left hover:border-fate/50 transition-all group"
              >
                <div className="text-2xl mb-2">✨</div>
                <h4 className="font-bold text-bone mb-1">Bussola del Fato</h4>
                <p className="text-xs text-mist">
                  Costellazioni e Promesse.
                </p>
                <div className="mt-3 text-xs text-fate">
                  Apri la mappa →
                </div>
              </button>

              <button
                onClick={onBuyPotion}
                disabled={state.cenere < 20 || (state.party.find(p => p.id === 'player')?.hp ?? 0) >= (state.party.find(p => p.id === 'player')?.maxHp ?? 1)}
                className="card-dark rounded-xl p-6 text-left hover:border-resonance/50 transition-all group disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="text-2xl mb-2">💚</div>
                <h4 className="font-bold text-bone mb-1">Guaritrice</h4>
                <p className="text-xs text-mist">
                  Pozione curativa.
                </p>
                <div className="mt-3 text-xs text-resonance">
                  {(state.party.find(p => p.id === 'player')?.hp ?? 0) >= (state.party.find(p => p.id === 'player')?.maxHp ?? 1)
                    ? 'HP già pieni'
                    : '20 Cenere'}
                </div>
              </button>

              <button
                onClick={onOpenMarket}
                className="card-dark rounded-xl p-6 text-left hover:border-rust/50 transition-all group"
              >
                <div className="text-2xl mb-2">🏪</div>
                <h4 className="font-bold text-bone mb-1">Mercato delle Anime</h4>
                <p className="text-xs text-mist">
                  Commercia Frammenti di Fato.
                </p>
                <div className="mt-3 text-xs text-rust">
                  Apri mercato →
                </div>
              </button>

              <button
                onClick={onOpenAscension}
                disabled={!(state.level >= 5 && state.bossesDefeated >= 2 && !state.ascension)}
                className="card-dark rounded-xl p-6 text-left hover:border-fate/50 transition-all group disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="text-2xl mb-2">⬆️</div>
                <h4 className="font-bold text-bone mb-1">Ascensione</h4>
                <p className="text-xs text-mist">
                  Evolvi il tuo Fardello.
                </p>
                <div className="mt-3 text-xs text-fate">
                  {state.ascension ? 'Completata' : state.level >= 5 && state.bossesDefeated >= 2 ? 'Disponibile!' : 'Bloccata'}
                </div>
              </button>

              <button
                onClick={onOpenDreams}
                disabled={state.offlineDreams.length === 0}
                className="card-dark rounded-xl p-6 text-left hover:border-purple-500/50 transition-all group disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="text-2xl mb-2">🌙</div>
                <h4 className="font-bold text-bone mb-1">Sogni</h4>
                <p className="text-xs text-mist">
                  Ricompense offline.
                </p>
                <div className="mt-3 text-xs text-purple-400">
                  {state.offlineDreams.length > 0 ? `${state.offlineDreams.length} sogni` : 'Nessun sogno'}
                </div>
              </button>

              <button
                onClick={onSpawnShadowBoss}
                disabled={state.dissonance < 10 || !state.fardello}
                className="card-dark rounded-xl p-6 text-left hover:border-dissonance/50 transition-all group disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="text-2xl mb-2">👁️</div>
                <h4 className="font-bold text-bone mb-1">Ombra del Fardello</h4>
                <p className="text-xs text-mist">
                  Affronta la tua ombra.
                </p>
                <div className="mt-3 text-xs text-dissonance">
                  {state.dissonance >= 10 ? 'Evoca (10 Dissonanza)' : 'Richiede 10 Dissonanza'}
                </div>
              </button>

              <button
                onClick={onUseNameAsSpell}
                disabled={state.intuizione < 1}
                className="card-dark rounded-xl p-6 text-left hover:border-ember/50 transition-all group disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="text-2xl mb-2">✨</div>
                <h4 className="font-bold text-bone mb-1">Nome come Incantesimo</h4>
                <p className="text-xs text-mist">
                  Rivela segreti nascosti.
                </p>
                <div className="mt-3 text-xs text-ember">
                  {state.intuizione >= 1 ? 'Usa (1 Intuizione)' : 'Richiede Intuizione'}
                </div>
              </button>

              <button
                onClick={onOpenTalents}
                disabled={!state.talentTree}
                className="card-dark rounded-xl p-6 text-left hover:border-fate/50 transition-all group disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="text-2xl mb-2">🎓</div>
                <h4 className="font-bold text-bone mb-1">Albero Talenti</h4>
                <p className="text-xs text-mist">
                  Sblocca abilità speciali.
                </p>
                <div className="mt-3 text-xs text-fate">
                  {state.talentTree ? `${state.talentPoints} PT disponibili` : 'Scegli un Fardello'}
                </div>
              </button>

              <button
                onClick={onOpenLegacies}
                className="card-dark rounded-xl p-6 text-left hover:border-fate/50 transition-all group"
              >
                <div className="text-2xl mb-2">🏛️</div>
                <h4 className="font-bold text-bone mb-1">Eredità</h4>
                <p className="text-xs text-mist">
                  I Portatori passati.
                </p>
                <div className="mt-3 text-xs text-fate">
                  Visualizza eredità →
                </div>
              </button>
            </div>
          </div>
        )}

        {/* No choice yet - prompt */}
        {!selectedNPC && !hasFardello && (
          <div className="text-center text-sm text-mist italic">
            Parla con i PNG per fare la tua prima scelta morale.
          </div>
        )}
      </div>
    </div>
  );
}
