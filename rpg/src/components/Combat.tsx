import { useState, useEffect } from 'react';
import type { GameState, Ability, Position } from '../game/types';
import {
  playAttackSound, playHealSound, playEchoSound, playResonanceSound
} from '../game/audio';
import TacticalGrid from './TacticalGrid';

interface CombatProps {
  state: GameState;
  onAction: (abilityId: string, targetId: string) => void;
  onEnemyTurn: () => void;
  onUseEcho: () => void;
  onToggleSkip: () => void;
  onDarkSacrifice: () => void;
  onMoveCharacter?: (charId: string, target: Position) => void;
}

const STATUS_ICONS: Record<string, string> = {
  poison: '☠️',
  weaken: '📉',
  shield: '🛡️',
  stun: '💫',
  regen: '💚',
};

export default function Combat({ state, onAction, onEnemyTurn, onUseEcho, onToggleSkip, onDarkSacrifice, onMoveCharacter }: CombatProps) {
  const [selectedAbility, setSelectedAbility] = useState<Ability | null>(null);
  const [animating, setAnimating] = useState(false);
  const [shakeEnemy, setShakeEnemy] = useState(false);
  const [shakePlayer, setShakePlayer] = useState(false);
  const [floatingDamage, setFloatingDamage] = useState<{ id: number; amount: number; target: 'player' | 'enemy' } | null>(null);
  const [selectedCharId, setSelectedCharId] = useState<string | null>('player');
  const [secretWordInput, setSecretWordInput] = useState('');
  const [showSecretWordInput, setShowSecretWordInput] = useState(false);

  // Auto-seleziona il player all'inizio del turno in modalità tattica
  useEffect(() => {
    if (state.combatMode === 'tactical') {
      setSelectedCharId('player');
    }
  }, [state.turn, state.combatMode]);

  useEffect(() => {
    setSelectedAbility(null);
    setAnimating(false);
  }, [state.scene, state.currentEnemy?.id]);

  const player = state.party.find(p => p.id === 'player');
  const enemy = state.currentEnemy;

  if (!player || !enemy) return null;

  const resonanceMax = state.fardello?.resonanceMax || 12;
  const echoReady = state.resonance >= resonanceMax;

  const availableAbilities = player.abilities.filter(a => {
    if (a.requiresDissonance && state.dissonance < a.requiresDissonance) return false;
    return true;
  });

  const handleAbilityClick = (ability: Ability) => {
    if (ability.currentCooldown > 0 || animating) return;
    // FIX: Rimosso playAttackSound() per evitare doppio suono
    setSelectedAbility(ability);
  };

  const handleTargetClick = (targetId: string) => {
    if (!selectedAbility || animating) return;
    setAnimating(true);

    // Calcola il danno atteso per il floating damage
    let expectedDamage = 0;
    if (selectedAbility.type !== 'defend' && selectedAbility.type !== 'heal') {
      const playerWeaken = player.statusEffects.find(e => e.type === 'weaken');
      const effectiveAttack = Math.max(1, player.attack - (playerWeaken?.potency || 0));
      const enemyShield = enemy.statusEffects.find(e => e.type === 'shield');
      const effectiveDefense = enemy.defense + (enemyShield?.potency || 0);

      switch (selectedAbility.type) {
        case 'attack':
          expectedDamage = Math.max(1, effectiveAttack + selectedAbility.power - effectiveDefense);
          break;
        case 'sacrifice':
          expectedDamage = Math.max(1, effectiveAttack + selectedAbility.power - effectiveDefense);
          break;
        case 'betray':
          expectedDamage = Math.max(1, effectiveAttack + selectedAbility.power - effectiveDefense);
          break;
        case 'dark':
          expectedDamage = selectedAbility.power;
          break;
        case 'echo':
          expectedDamage = Math.max(1, selectedAbility.power + Math.floor((player.maxHp - player.hp) * 0.5));
          break;
      }

      setShakeEnemy(true);
      setTimeout(() => setShakeEnemy(false), 300);
      setFloatingDamage({ id: Date.now(), amount: expectedDamage, target: 'enemy' });
    }

    switch (selectedAbility.type) {
      case 'attack':
      case 'sacrifice':
      case 'betray':
      case 'dark':
        playAttackSound();
        break;
      case 'defend':
      case 'heal':
        playHealSound();
        break;
      case 'echo':
        playEchoSound();
        break;
    }

    setTimeout(() => {
      onAction(selectedAbility.id, targetId);
      setSelectedAbility(null);
      setTimeout(() => {
        onEnemyTurn();
        setAnimating(false);
        setFloatingDamage(null);
      }, state.skipAnimations ? 100 : 800);
    }, state.skipAnimations ? 50 : 400);
  };

  const handleEcho = () => {
    if (!echoReady || animating) return;
    setAnimating(true);
    playEchoSound();
    setShakeEnemy(true);
    setTimeout(() => setShakeEnemy(false), 500);

    // Calcola floating damage per Echo
    const echoDamage = Math.max(1, 30 + Math.floor((player.maxHp - player.hp) * 0.5));
    setFloatingDamage({ id: Date.now(), amount: echoDamage, target: 'enemy' });

    setTimeout(() => {
      onUseEcho();
      setTimeout(() => {
        onEnemyTurn();
        setAnimating(false);
        setFloatingDamage(null);
      }, state.skipAnimations ? 100 : 800);
    }, state.skipAnimations ? 50 : 400);
  };

  // FEATURE: Parola d'Ordine del Fardello
  const handleSecretWord = () => {
    if (!state.fardello?.secretWord) return;
    
    if (secretWordInput.toLowerCase().trim() === state.fardello.secretWord.toLowerCase()) {
      // Parola corretta! Aggiunge un flag temporaneo per bonus
      playResonanceSound();
      setSecretWordInput('');
      setShowSecretWordInput(false);
      alert(`✨ "${state.fardello.secretWord}" - La Parola d'Ordine risuona! Bonus attivo per questo turno.`);
    } else {
      alert(`❌ Parola errata. La Parola d'Ordine del tuo Fardello è nascosta nella tua scelta.`);
      setSecretWordInput('');
    }
  };

  return (
    <div className="min-h-screen pt-16 pb-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Top bar: Turno, XP, Skip */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <span className="text-xs text-mist">Turno {state.turn}</span>
            <span className="text-xs text-fate">Lv. {state.level}</span>
            <div className="w-24 h-1.5 bg-ink rounded-full overflow-hidden border border-gray-800">
              <div
                className="h-full bg-gradient-to-r from-fate to-purple-600"
                style={{ width: `${(state.experience / state.experienceToNext) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-mist">{state.experience}/{state.experienceToNext} XP</span>
            {state.combatMode === 'tactical' && (
              <span className="text-xs text-ember px-2 py-0.5 border border-ember/30 rounded">
                ⚔️ Tattico
              </span>
            )}
          </div>
          <button
            onClick={onToggleSkip}
            className="text-[10px] text-mist hover:text-ember transition-colors px-2 py-1 border border-gray-800 rounded"
          >
            {state.skipAnimations ? '▶️ Animazioni ON' : '⏩ Salta animazioni'}
          </button>
        </div>

        {/* Griglia Tattica */}
        {state.combatMode === 'tactical' && onMoveCharacter && (
          <TacticalGrid
            state={state}
            onMove={onMoveCharacter}
            selectedCharId={selectedCharId}
          />
        )}

        {/* FEATURE: Frammenti di Fato attivi - mostra informazioni extra */}
        {state.flags.includes('reveal_active_3') && enemy.intent && (
          <div className="mb-2 p-2 rounded-lg border border-fate/30 bg-fate/5 text-center">
            <span className="text-xs text-fate">
              🔮 <span className="font-semibold">Frammento del Sussurro attivo!</span> Punti deboli rivelati
            </span>
          </div>
        )}
        
        {state.flags.includes('dark_power_active') && (
          <div className="mb-2 p-2 rounded-lg border border-dissonance/30 bg-dissonance/5 text-center">
            <span className="text-xs text-dissonance">
              🌑 <span className="font-semibold">Frammento di Sangue attivo!</span> +50% danno oscuro
            </span>
          </div>
        )}

        {/* FEATURE: Parola d'Ordine del Fardello */}
        {state.fardello?.secretWord && (
          <div className="mb-4">
            {!showSecretWordInput ? (
              <button
                onClick={() => setShowSecretWordInput(true)}
                className="w-full p-2 rounded-lg border border-fate/30 bg-fate/5 text-fate text-xs hover:bg-fate/10 transition-colors"
              >
                🔮 Pronuncia la Parola d'Ordine del Fardello
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={secretWordInput}
                  onChange={(e) => setSecretWordInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSecretWord()}
                  placeholder="Inserisci la Parola d'Ordine..."
                  className="flex-1 px-3 py-2 rounded-lg bg-ink border border-fate/30 text-bone text-sm focus:outline-none focus:border-fate"
                  autoFocus
                />
                <button
                  onClick={handleSecretWord}
                  className="px-4 py-2 rounded-lg border border-fate/30 text-fate text-sm hover:bg-fate/10 transition-colors"
                >
                  ✓
                </button>
                <button
                  onClick={() => {
                    setShowSecretWordInput(false);
                    setSecretWordInput('');
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-700 text-mist text-sm hover:bg-gray-800/50 transition-colors"
                >
                  ✗
                </button>
              </div>
            )}
          </div>
        )}

        {/* Enemy intent banner */}
        {enemy.intent && (
          <div className={`mb-4 p-3 rounded-lg border text-center transition-all ${
            enemy.intent.abilityName === 'Ripresa'
              ? 'border-gray-700 bg-gray-800/30'
              : 'border-dissonance/40 bg-dissonance/10 animate-pulse'
          }`}>
            <span className="text-xs text-bone/80">
              ⚠️ <span className="font-semibold">{enemy.intent.description}</span>
            </span>
          </div>
        )}

        {/* Battlefield */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Party */}
          <div className="space-y-2">
            <h3 className="text-xs text-resonance font-semibold mb-2">
              Il tuo Gruppo
              {state.combatMode === 'tactical' && <span className="text-fate ml-2">⚔️ Tattico</span>}
            </h3>
            {state.party.map(member => {
              const isSelected = selectedCharId === member.id;
              const isTactical = state.combatMode === 'tactical';
              const canSelect = isTactical && member.hp > 0 && !selectedAbility;
              
              return (
              <button
                key={member.id}
                onClick={() => {
                  if (canSelect) {
                    setSelectedCharId(member.id);
                  } else if (selectedAbility?.targetAlly) {
                    handleTargetClick(member.id);
                  }
                }}
                disabled={member.hp <= 0 || (!selectedAbility?.targetAlly && !canSelect) || animating}
                className={`w-full p-3 rounded-lg border text-left transition-all relative ${
                  member.hp <= 0
                    ? 'border-dissonance/30 opacity-40'
                    : isSelected
                    ? 'border-fate bg-fate/10 ring-2 ring-fate/30'
                    : selectedAbility?.targetAlly
                    ? 'border-resonance/50 hover:bg-resonance/10 cursor-pointer animate-pulse-glow'
                    : canSelect
                    ? 'border-gray-600 hover:border-fate/50 hover:bg-fate/5 cursor-pointer'
                    : 'border-gray-800'
                } ${shakePlayer && member.id === 'player' ? 'animate-text-glitch' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-bone">{member.name}</span>
                  <div className="flex gap-1">
                    {isSelected && <span className="text-[9px] text-fate">● SELEZIONATO</span>}
                    {member.id === 'player' && <span className="text-[9px] text-ember">TU</span>}
                  </div>
                </div>
                <div className="text-[10px] text-mist mb-1">
                  ❤️ {member.hp}/{member.maxHp}
                </div>
                <div className="h-2 bg-ink rounded-full overflow-hidden flex">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 border-r border-ink last:border-r-0"
                      style={{
                        background:
                          i < Math.ceil((member.hp / member.maxHp) * 10)
                            ? member.hp / member.maxHp > 0.5
                              ? '#2dd4bf'
                              : member.hp / member.maxHp > 0.25
                              ? '#b45309'
                              : '#ef4444'
                            : '#1a1a1a',
                      }}
                    />
                  ))}
                </div>
                {/* Status effects */}
                {member.statusEffects.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {member.statusEffects.map((e, i) => (
                      <span key={i} className="text-[10px]" title={`${e.type} (${e.duration} turni)`}>
                        {STATUS_ICONS[e.type] || '❓'}{e.duration}
                      </span>
                    ))}
                  </div>
                )}
              </button>
              );
            })}
          </div>

          {/* Enemy */}
          <div className="flex flex-col items-center justify-center gap-3">
            <button
              onClick={() => selectedAbility?.targetEnemy && handleTargetClick(enemy.id)}
              disabled={!selectedAbility?.targetEnemy || animating}
              className={`p-6 rounded-xl border-2 text-center transition-all relative ${
                selectedAbility?.targetEnemy
                  ? 'border-dissonance/50 hover:bg-dissonance/10 cursor-pointer animate-pulse-glow'
                  : 'border-gray-800'
              } ${shakeEnemy ? 'animate-text-glitch' : ''}`}
            >
              <div className="text-4xl mb-2">{enemy.isCorrupted ? '💀' : '⚔️'}</div>
              <h3 className="font-bold text-bone text-sm mb-1">{enemy.name}</h3>
              <div className="text-xs text-mist">
                ❤️ {enemy.hp}/{enemy.maxHp}
              </div>
              <div className="h-2 bg-ink rounded-full mt-2 overflow-hidden w-40 mx-auto">
                <div
                  className="h-full bg-gradient-to-r from-dissonance to-red-600 rounded-full transition-all"
                  style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }}
                />
              </div>
              <div className="mt-2 flex justify-center gap-3 text-[10px] text-mist">
                <span>⚔️ {enemy.attack}</span>
                <span>🛡️ {enemy.defense}</span>
              </div>
              {/* Enemy status effects */}
              {enemy.statusEffects.length > 0 && (
                <div className="flex justify-center gap-1 mt-2">
                  {enemy.statusEffects.map((e, i) => (
                    <span key={i} className="text-xs" title={`${e.type} (${e.duration})`}>
                      {STATUS_ICONS[e.type] || '❓'}
                    </span>
                  ))}
                </div>
              )}
              {/* Floating damage */}
              {floatingDamage && (
                <div
                  key={floatingDamage.id}
                  className="absolute top-0 left-1/2 -translate-x-1/2 text-2xl font-bold text-dissonance animate-slide-up pointer-events-none"
                >
                  -{floatingDamage.amount}
                </div>
              )}
            </button>
          </div>

          {/* Bars */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-resonance font-semibold">Risonanza</span>
                <span className="text-mist">{state.resonance}/{resonanceMax}</span>
              </div>
              <div className={`h-3 bg-ink rounded-full overflow-hidden border ${echoReady ? 'border-resonance animate-pulse-glow' : 'border-gray-800'}`}>
                <div
                  className="h-full resonance-bar rounded-full transition-all duration-500"
                  style={{ width: `${(state.resonance / resonanceMax) * 100}%` }}
                />
              </div>
              {echoReady && (
                <button
                  onClick={handleEcho}
                  disabled={animating}
                  className="w-full mt-2 py-2 rounded-lg bg-gradient-to-r from-teal-900/50 to-purple-900/50 border border-resonance/50 text-resonance text-xs font-semibold hover:border-resonance transition-all animate-pulse-glow"
                >
                  ✨ {state.fardello?.echoName || 'Eco del Fardello'}
                </button>
              )}
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-dissonance font-semibold">Dissonanza</span>
                <span className="text-mist">{state.dissonance}/15</span>
              </div>
              <div className="h-3 bg-ink rounded-full overflow-hidden border border-gray-800">
                <div
                  className="h-full dissonance-bar rounded-full transition-all duration-500"
                  style={{ width: `${(state.dissonance / 15) * 100}%` }}
                />
              </div>
              {state.dissonance >= 12 && (
                <div className="mt-1 text-[10px] text-dissonance animate-pulse">
                  ⚠️ I nemici sono più forti!
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-fate font-semibold">Corruzione</span>
                <span className="text-mist">{state.corruption}%</span>
              </div>
              <div className="h-3 bg-ink rounded-full overflow-hidden border border-gray-800">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${state.corruption}%`,
                    background: state.corruption > 60 ? 'linear-gradient(90deg, #4a0e4e, #ef4444)' : 'linear-gradient(90deg, #4a0e4e, #a855f7)',
                  }}
                />
              </div>
              {state.corruption >= 50 && (
                <div className="mt-1 text-[10px] text-fate animate-pulse">
                  ⚠️ I nemici sono potenziati!
                </div>
              )}
            </div>

            {/* Sacrificio Oscuro */}
            {state.dissonance >= 5 && (
              <button
                onClick={() => {
                  if (animating) return;
                  setAnimating(true);
                  playAttackSound();
                  setShakeEnemy(true);
                  setTimeout(() => setShakeEnemy(false), 300);
                  onDarkSacrifice();
                  setTimeout(() => setAnimating(false), state.skipAnimations ? 200 : 800);
                }}
                disabled={animating}
                className="w-full py-2 rounded-lg bg-gradient-to-r from-red-900/50 to-purple-900/50 border border-dissonance/50 text-dissonance text-xs font-semibold hover:border-dissonance transition-all"
                title="Spendi 5 Dissonanza per un attacco potente che ignora la difesa"
              >
                🌑 Sacrificio Oscuro (-5 Dissonanza)
              </button>
            )}
          </div>
        </div>

        {/* Abilities */}
        <div className="card-dark rounded-xl p-4 mb-4">
          <h3 className="text-xs text-mist font-semibold mb-3">
            {selectedAbility
              ? `Seleziona bersaglio per: ${selectedAbility.name}`
              : `Scegli un'abilità (${availableAbilities.length}/${player.abilities.length})`}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {player.abilities.map(ability => {
              const locked = !!(ability.requiresDissonance && state.dissonance < ability.requiresDissonance);
              return (
                <button
                  key={ability.id}
                  onClick={() => !locked && handleAbilityClick(ability)}
                  disabled={ability.currentCooldown > 0 || animating || locked}
                  className={`p-3 rounded-lg border text-left transition-all relative ${
                    selectedAbility?.id === ability.id
                      ? 'border-ember bg-ember/10'
                      : locked
                      ? 'border-gray-800 opacity-30 cursor-not-allowed'
                      : ability.currentCooldown > 0
                      ? 'border-gray-800 opacity-40 cursor-not-allowed'
                      : ability.type === 'dark'
                      ? 'border-fate/40 hover:border-fate hover:bg-fate/5'
                      : 'border-gray-700 hover:border-ember/50 hover:bg-ember/5'
                  }`}
                  title={ability.description}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-semibold text-bone">{ability.name}</div>
                    {ability.type === 'dark' && <span className="text-[10px] text-fate">🌑</span>}
                  </div>
                  <div className="text-[10px] text-mist line-clamp-2">{ability.description}</div>
                  <div className="flex gap-1 mt-1 text-[9px] flex-wrap">
                    {ability.resonanceGain > 0 && <span className="text-resonance">+{ability.resonanceGain}R</span>}
                    {ability.dissonanceGain > 0 && <span className="text-dissonance">+{ability.dissonanceGain}D</span>}
                    {ability.currentCooldown > 0 && <span className="text-mist">CD:{ability.currentCooldown}</span>}
                    {locked && <span className="text-fate">🔒 Dis.{ability.requiresDissonance}+</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Log */}
        <div className="bg-ink/80 rounded-lg p-3 border border-gray-800/50 max-h-40 overflow-y-auto">
          <div className="text-xs text-mist mb-2 font-semibold">Log Combattimento</div>
          {state.combatLog.map((entry, i) => (
            <div
              key={i}
              className={`text-xs py-0.5 ${
                entry.includes('💀') ? 'text-dissonance' :
                entry.includes('✨') ? 'text-resonance' :
                entry.includes('🌑') ? 'text-fate' :
                entry.includes('⬆️') ? 'text-green-400' :
                entry.includes('💥') ? 'text-ember' :
                entry.includes('⚠️') ? 'text-yellow-400' :
                'text-bone/70'
              }`}
            >
              {entry}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
