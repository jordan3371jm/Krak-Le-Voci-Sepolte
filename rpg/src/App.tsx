import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameState } from './game/types';
import {
  createInitialState,
  createParty,
  applyFardello,
  enterDungeon,
  performCombatAction,
  enemyTurn,
  applyRoomChoice,
  advanceRoom,
  applyPostBattleChoice,
  resolvePromise,
  spendIntuition,
  buyPotion,
  performDarkSacrifice,
  generateMarketListings,
  buyFromMarket,
  sellToMarket,
  useFateFragment,
  performAscension,
  spawnShadowBoss,
  useNameAsSpell,
  moveCharacter,
  unlockTalent,
  persistState,
  restoreState,
} from './game/store';
import { loadGame } from './game/save';
import { ENEMIES } from './game/data';
import { initAudio, playResonanceSound, playDissonanceSound, playCorruptionSound, playVictorySound } from './game/audio';
import Intro from './components/Intro';
import Hub from './components/Hub';
import Dungeon from './components/Dungeon';
import Combat from './components/Combat';
import PostCombat from './components/PostCombat';
import MapView from './components/MapView';
import MarketView from './components/MarketView';
import AscensionView from './components/AscensionView';
import DreamsView from './components/DreamsView';
import TalentTreeView from './components/TalentTreeView';
import LegacyView from './components/LegacyView';
import Ending from './components/Ending';
import HUD from './components/HUD';

export default function App() {
  const [state, setState] = useState<GameState>(createInitialState());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [hasSave, setHasSave] = useState(false);

  // Check for existing save on mount
  useEffect(() => {
    const saved = loadGame();
    setHasSave(saved !== null);
  }, []);

  // Auto-save on state changes (except intro)
  useEffect(() => {
    if (state.scene !== 'intro') {
      persistState(state);
    }
  }, [state]);

  // Show notification
  const showNotification = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Watch for resonance/dissonance changes using refs
  const prevResonanceRef = useRef(state.resonance);
  const prevDissonanceRef = useRef(state.dissonance);
  const prevCorruptionRef = useRef(state.corruption);

  useEffect(() => {
    if (state.resonance > prevResonanceRef.current && state.resonance > 0) {
      playResonanceSound();
    }
    if (state.dissonance > prevDissonanceRef.current && state.dissonance > 0) {
      playDissonanceSound();
    }
    if (state.corruption > 60 && prevCorruptionRef.current <= 60) {
      playCorruptionSound();
    }

    prevResonanceRef.current = state.resonance;
    prevDissonanceRef.current = state.dissonance;
    prevCorruptionRef.current = state.corruption;
  }, [state.resonance, state.dissonance, state.corruption]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
        showNotification('🖥️ Fullscreen rituale attivato');
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        showNotification('Distogli lo sguardo dalla valle.');
      }).catch(() => {});
    }
  };

  // Game actions
  const handleStartGame = (name: string) => {
    const newState = { ...createInitialState(), playerName: name, scene: 'hub' as const };
    setState(newState);
    showNotification(`Benvenuto, ${name}. La valle ti attende.`);
  };

  const handleContinue = () => {
    initAudio(); // FIX: Inizializza audio anche su "Continua"
    const saved = restoreState();
    if (saved) {
      setState(saved);
      showNotification('Partita ripristinata.');
    }
  };

  const handleFardelloChoice = (type: 'sacrificio' | 'sangue' | 'silenzio') => {
    const newState = applyFardello(state, type);
    setState(newState);
    showNotification(`⚡ ${newState.fardello?.name} — Il tuo Fardello è stato forgiato.`);
  };

  const handleEnterDungeon = () => {
    if (state.provviste < 3) {
      showNotification('❌ Provviste insufficienti!');
      return;
    }
    const newState = enterDungeon(state);
    setState(newState);
    showNotification('🗺️ Entri nel Cimitero dei Traditi...');
  };

  const handleViewMap = () => {
    setState({ ...state, scene: 'map' });
  };

  const handleRoomChoice = (choiceId: string) => {
    let newState = applyRoomChoice(state, choiceId);

    // After choice, if room has enemies and is now cleared, start combat
    const currentRoom = newState.dungeonRooms[newState.currentRoom];
    if (currentRoom.cleared && currentRoom.enemies && currentRoom.enemies.length > 0) {
      const enemyId = currentRoom.enemies[0];
      const enemyData = ENEMIES[enemyId];
      newState = {
        ...newState,
        scene: 'combat' as const,
        currentEnemy: { ...enemyData, abilities: enemyData.abilities.map(a => ({ ...a })) },
        turn: 1,
        combatLog: [...newState.combatLog, `⚔️ ${enemyData.name} appare!`],
      };
    }

    setState(newState);
  };

  const handleAdvanceRoom = () => {
    const newState = advanceRoom(state);
    setState(newState);
  };

  const handleRetreat = () => {
    // Return to hub with current state
    const newState = { ...state, scene: 'hub' as const };
    if (state.dungeonCompleted) {
      newState.fragments += 1;
      newState.cenere += 50;
      newState.constellationStars = [...new Set([...state.constellationStars, 'dungeon_complete'])];
      showNotification('✨ Spedizione completata! +1 Frammento, +50 Cenere');
    }
    setState(newState);
  };

  const handleCombatAction = useCallback((abilityId: string, targetId: string) => {
    setState(prev => performCombatAction(prev, abilityId, targetId));
  }, []);

  const handleEnemyTurn = useCallback(() => {
    setState(prev => enemyTurn(prev));
  }, []);

  const handleUseEcho = useCallback(() => {
    const echoName = state.fardello?.echoName || 'Eco del Fardello';
    setState(prev => {
      const playerIdx = prev.party.findIndex(p => p.id === 'player');
      if (playerIdx < 0) return prev;

      const echoAbility = {
        id: 'echo_ability',
        name: prev.fardello?.echoName || 'Eco del Fardello',
        description: prev.fardello?.echoDescription || '',
        type: 'echo' as const,
        power: 30,
        cooldown: 0,
        currentCooldown: 0,
        resonanceGain: -prev.resonance,
        dissonanceGain: 0,
        corruptionChange: -20,
        targetEnemy: true,
      };

      const updatedParty = [...prev.party];
      updatedParty[playerIdx] = {
        ...updatedParty[playerIdx],
        abilities: [...updatedParty[playerIdx].abilities, echoAbility],
      };

      const stateWithEcho = { ...prev, party: updatedParty };
      let newState = performCombatAction(stateWithEcho, 'echo_ability', prev.currentEnemy?.id || '');

      if (newState.party[playerIdx]) {
        newState = {
          ...newState,
          party: newState.party.map((p, i) =>
            i === playerIdx
              ? { ...p, abilities: p.abilities.filter(a => a.id !== 'echo_ability') }
              : p
          ),
        };
      }

      return newState;
    });
    showNotification(`✨ ${echoName} attivato!`);
  }, [state.fardello?.echoName, showNotification]);

  const handlePostBattleChoice = (choiceId: string) => {
    const newState = applyPostBattleChoice(state, choiceId);
    setState(newState);
    showNotification('📜 Il tuo destino si compie...');
  };

  const handleToggleSkip = () => {
    setState({ ...state, skipAnimations: !state.skipAnimations });
  };

  const handleResolvePromise = useCallback((promiseId: string, keep: boolean) => {
    setState(prev => resolvePromise(prev, promiseId, keep));
    showNotification(keep ? '✨ Promessa mantenuta!' : '💔 Promessa infranta!');
  }, [showNotification]);

  const handleSpendIntuition = useCallback(() => {
    let spent = false;
    setState(prev => {
      const next = spendIntuition(prev);
      spent = next !== prev;
      return next;
    });
    showNotification(spent ? '🔮 Stella rivelata!' : '❌ Nessuna stella da rivelare');
  }, [showNotification]);

  const handleBuyPotion = useCallback(() => {
    let bought = false;
    setState(prev => {
      const next = buyPotion(prev);
      bought = next !== prev;
      return next;
    });
    if (bought) {
      showNotification('💚 Pozione acquistata!');
    } else {
      showNotification('❌ HP già pieni o Cenere insufficiente');
    }
  }, [showNotification]);

  const handleDarkSacrifice = useCallback(() => {
    let triggerEnemyTurn = false;
    setState(prev => {
      const next = performDarkSacrifice(prev);
      triggerEnemyTurn = next !== prev && next.currentEnemy !== null && next.currentEnemy.hp > 0 && next.scene === 'combat';
      return next;
    });
    if (triggerEnemyTurn) {
      setTimeout(() => setState(p => enemyTurn(p)), 400);
    }
  }, []);

  const handleRestart = () => {
    // Restart dungeon with same character
    const newState = enterDungeon(state);
    setState(newState);
    showNotification('🗺️ Nuova spedizione iniziata.');
  };

  const handleNewGame = () => {
    // FIX: Non cancellare il save, le legacy sono già state salvate separatamente
    setState(createInitialState());
    setHasSave(false);
    // localStorage.removeItem('hondovalle_save_v1'); // Rimosso: ridondante e pericoloso
  };

  const handleBackToHub = () => {
    setState({ ...state, scene: 'hub' });
  };

  // Nuovi handler per feature GDD
  const handleOpenMarket = useCallback(() => {
    setState(prev => {
      const withListings = generateMarketListings(prev);
      return { ...withListings, scene: 'market' };
    });
  }, []);

  const handleBuyFromMarket = useCallback((listingId: string) => {
    setState(prev => buyFromMarket(prev, listingId));
    showNotification('🛒 Acquisto completato!');
  }, [showNotification]);

  const handleSellToMarket = useCallback((fragmentId: string) => {
    setState(prev => sellToMarket(prev, fragmentId));
    showNotification('💰 Vendita completata!');
  }, [showNotification]);

  const handleUseFragment = useCallback((fragmentId: string) => {
    setState(prev => useFateFragment(prev, fragmentId));
    showNotification('✨ Frammento attivato!');
  }, [showNotification]);

  const handleOpenAscension = useCallback(() => {
    setState(prev => ({ ...prev, scene: 'ascension' }));
  }, []);

  const handleAscend = useCallback((type: string) => {
    setState(prev => performAscension(prev, type));
    showNotification('⬆️ Ascensione completata!');
  }, [showNotification]);

  const handleOpenDreams = useCallback(() => {
    setState(prev => ({ ...prev, scene: 'dreams' }));
  }, []);

  const handleClaimDream = useCallback((dreamId: string) => {
    setState(prev => {
      const dream = prev.offlineDreams.find(d => d.id === dreamId);
      if (!dream) return prev;
      return {
        ...prev,
        cenere: prev.cenere + (dream.rewards.cenere || 0),
        fragments: prev.fragments + (dream.rewards.fragments || 0),
        provviste: prev.provviste + (dream.rewards.provviste || 0),
        offlineDreams: prev.offlineDreams.filter(d => d.id !== dreamId),
      };
    });
    showNotification('🌙 Ricompense reclamate!');
  }, [showNotification]);

  const handleSpawnShadowBoss = useCallback(() => {
    setState(prev => spawnShadowBoss(prev));
    showNotification('👁️ L\'Ombra del Fardello appare!');
  }, [showNotification]);

  const handleUseNameAsSpell = useCallback(() => {
    setState(prev => useNameAsSpell(prev));
    showNotification('✨ Il tuo nome rivela segreti!');
  }, [showNotification]);

  const handleMoveCharacter = useCallback((charId: string, target: { x: number; y: number }) => {
    setState(prev => moveCharacter(prev, charId, target));
  }, []);

  const handleUnlockTalent = useCallback((talentId: string) => {
    setState(prev => {
      const newState = unlockTalent(prev, talentId);
      if (newState !== prev) {
        showNotification('🎓 Talento sbloccato!');
      }
      return newState;
    });
  }, [showNotification]);

  const handleOpenTalents = useCallback(() => {
    setState(prev => ({ ...prev, scene: 'talents' }));
  }, []);

  const handleOpenLegacies = useCallback(() => {
    setState(prev => ({ ...prev, scene: 'legacy' }));
  }, []);

  return (
    <div className="min-h-screen bg-ink text-bone">
      {/* HUD - shown in game scenes */}
      {state.scene !== 'intro' && (
        <HUD
          state={state}
          onToggleFullscreen={toggleFullscreen}
          isFullscreen={isFullscreen}
        />
      )}

      {/* Notification */}
      {notification && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-ink/95 border border-ember/30 rounded-lg px-4 py-2 text-sm text-bone shadow-lg">
            {notification}
          </div>
        </div>
      )}

      {/* Scenes */}
      {state.scene === 'intro' && (
        <Intro
          onStart={handleStartGame}
          hasSave={hasSave}
          onContinue={handleContinue}
        />
      )}

      {state.scene === 'hub' && (
        <Hub
          state={state}
          onChoice={handleFardelloChoice}
          onEnterDungeon={handleEnterDungeon}
          onViewMap={handleViewMap}
          onBuyPotion={handleBuyPotion}
          onOpenMarket={handleOpenMarket}
          onOpenAscension={handleOpenAscension}
          onOpenDreams={handleOpenDreams}
          onSpawnShadowBoss={handleSpawnShadowBoss}
          onUseNameAsSpell={handleUseNameAsSpell}
          onOpenTalents={handleOpenTalents}
          onOpenLegacies={handleOpenLegacies}
        />
      )}

      {state.scene === 'dungeon' && (
        <Dungeon
          state={state}
          onChoice={handleRoomChoice}
          onAdvance={handleAdvanceRoom}
          onRetreat={handleRetreat}
        />
      )}

      {state.scene === 'combat' && (
        <Combat
          state={state}
          onAction={handleCombatAction}
          onEnemyTurn={handleEnemyTurn}
          onUseEcho={handleUseEcho}
          onToggleSkip={handleToggleSkip}
          onDarkSacrifice={handleDarkSacrifice}
          onMoveCharacter={handleMoveCharacter}
        />
      )}

      {state.scene === 'post_combat' && (
        <PostCombat
          state={state}
          onChoice={handlePostBattleChoice}
        />
      )}

      {state.scene === 'map' && (
        <MapView
          state={state}
          onBack={handleBackToHub}
          onSpendIntuition={handleSpendIntuition}
          onResolvePromise={handleResolvePromise}
        />
      )}

      {state.scene === 'market' && (
        <MarketView
          state={state}
          onBack={handleBackToHub}
          onBuy={handleBuyFromMarket}
          onSell={handleSellToMarket}
          onUseFragment={handleUseFragment}
        />
      )}

      {state.scene === 'ascension' && (
        <AscensionView
          state={state}
          onBack={handleBackToHub}
          onAscend={handleAscend}
        />
      )}

      {state.scene === 'dreams' && (
        <DreamsView
          state={state}
          onBack={handleBackToHub}
          onClaimDream={handleClaimDream}
        />
      )}

      {state.scene === 'talents' && (
        <TalentTreeView
          state={state}
          onUnlockTalent={handleUnlockTalent}
          onBack={handleBackToHub}
        />
      )}

      {state.scene === 'legacy' && (
        <LegacyView
          onBack={handleBackToHub}
        />
      )}

      {state.scene === 'ending' && (
        <Ending
          state={state}
          onRestart={handleRestart}
          onNewGame={handleNewGame}
        />
      )}
    </div>
  );
}
