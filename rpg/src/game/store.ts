import type { GameState, Character, RoomChoice, StatusEffect, EnemyIntent, FardelloType, FateFragment, Equipment, MarketListing, Ascension, OfflineDream, Legacy, Position, Talent } from './types';
import { FARDELLI, INITIAL_ROOMS, ENEMIES, PARTY_ABILITIES, ALLY_CHARACTERS, TALENT_TREES } from './data';
import { saveGame, loadGame, saveLegacyToLocal } from './save';

function xpForLevel(level: number): number { return 50 + level * 30; }

export function createInitialState(): GameState {
  return {
    scene: 'intro', playerName: '', fardello: null,
    resonance: 0, dissonance: 0, corruption: 0,
    party: [], currentRoom: 0,
    dungeonRooms: JSON.parse(JSON.stringify(INITIAL_ROOMS)),
    dungeonCompleted: false,
    factionRep: { culto: 0, capitale: 0, contadini: 0, guaritori: 0, eretici: 0 },
    flags: [], promises: [], fragments: 0,
    cenere: 50, provviste: 10, intuizione: 3,
    constellationStars: [], combatLog: [],
    currentEnemy: null, turn: 1,
    dialogueQueue: [], notifications: [], visitedScenes: [],
    choicesMade: 0, bossesDefeated: 0,
    level: 1, experience: 0, experienceToNext: xpForLevel(1),
    endingFlags: [], pendingPostBattleChoice: null, skipAnimations: false,
    fateFragments: [], marketListings: [], equipment: [],
    talentTree: null, talentPoints: 0,
    ascension: null,
    offlineDreams: [], legacies: [],
    lastSaveTimestamp: Date.now(),
    fullscreenBonus: false, corruptedUI: false,
    isShadowBattle: false,
    shadowBattleActive: false,
    shadowBattleReturnScene: 'hub',
    combatMode: 'turn',
    pledgedMaxHp: 0, // FEATURE: Soglia di Ritiro
  };
}

export function createPlayer(name: string): Character {
  return {
    id: 'player', name: name || 'Portatore', role: 'player',
    hp: 80, maxHp: 80, attack: 14, defense: 6, speed: 5,
    abilities: PARTY_ABILITIES.map(a => ({ ...a })),
    statusEffects: [], intent: null,
    position: { x: 0, y: 2 }, moveRange: 2, attackRange: 1,
  };
}

export function createParty(playerName: string): Character[] {
  const player = createPlayer(playerName);
  const allies = ALLY_CHARACTERS.map((a, i) => ({
    ...a,
    abilities: a.abilities.map(ab => ({ ...ab })),
    position: { x: i + 1, y: 2 } as Position,
    moveRange: 2, attackRange: 1,
  }));
  return [player, ...allies];
}

export function applyFardello(state: GameState, type: 'sacrificio' | 'sangue' | 'silenzio'): GameState {
  const fardello = FARDELLI[type];
  let newFactionRep = { ...state.factionRep };
  let newConstellationStars = [...state.constellationStars];
  let talentTree = state.talentTree;

  switch (type) {
    case 'sacrificio':
      newFactionRep = { ...state.factionRep, guaritori: state.factionRep.guaritori + 2, culto: state.factionRep.culto - 1 };
      newConstellationStars = [...state.constellationStars, 'salvati'];
      talentTree = { via: 'sacrificio', talents: TALENT_TREES.sacrificio, unlockedTalents: [] };
      break;
    case 'sangue':
      newFactionRep = { ...state.factionRep, capitale: state.factionRep.capitale + 2, culto: state.factionRep.culto + 1, contadini: state.factionRep.contadini - 2 };
      newConstellationStars = [...state.constellationStars, 'culto'];
      talentTree = { via: 'sangue', talents: TALENT_TREES.sangue, unlockedTalents: [] };
      break;
    case 'silenzio':
      newFactionRep = { ...state.factionRep, eretici: state.factionRep.eretici + 1 };
      newConstellationStars = [...state.constellationStars, 'silenzio'];
      talentTree = { via: 'silenzio', talents: TALENT_TREES.silenzio, unlockedTalents: [] };
      break;
  }
  return { ...state, fardello, factionRep: newFactionRep, constellationStars: newConstellationStars, talentTree };
}

export function addExperience(state: GameState, xp: number): GameState {
  let newXP = state.experience + xp;
  let newLevel = state.level;
  let newToNext = state.experienceToNext;
  let newParty = state.party.map(p => ({ ...p }));
  let newTalentPoints = state.talentPoints;
  let levelUpMessage = '';

  while (newXP >= newToNext) {
    newXP -= newToNext;
    newLevel += 1;
    newToNext = xpForLevel(newLevel);
    newTalentPoints += 1;
    newParty = newParty.map(p => ({ ...p, maxHp: p.maxHp + 10, hp: p.hp + 10, attack: p.attack + 2, defense: p.defense + 1 }));
    levelUpMessage = `⬆️ LIVELLO ${newLevel}! +1 Punto Talento. Stats aumentate.`;
  }

  return { ...state, level: newLevel, experience: newXP, experienceToNext: newToNext, party: newParty, talentPoints: newTalentPoints,
    combatLog: levelUpMessage ? [...state.combatLog.slice(-8), levelUpMessage] : state.combatLog };
}

export function unlockTalent(state: GameState, talentId: string): GameState {
  if (!state.talentTree || state.talentPoints <= 0) return state;
  const talent = state.talentTree.talents.find(t => t.id === talentId);
  if (!talent || state.talentTree.unlockedTalents.includes(talentId)) return state;
  if (talent.requires && !talent.requires.every(r => state.talentTree!.unlockedTalents.includes(r))) return state;

  const newParty = state.party.map(p => ({
    ...p,
    maxHp: p.maxHp + (talent.effect.hp || 0),
    hp: p.hp + (talent.effect.hp || 0),
    attack: p.attack + (talent.effect.attack || 0),
    defense: p.defense + (talent.effect.defense || 0),
  }));

  return { ...state, party: newParty, talentPoints: state.talentPoints - 1,
    talentTree: { ...state.talentTree, unlockedTalents: [...state.talentTree.unlockedTalents, talentId] },
    combatLog: [...state.combatLog.slice(-8), `🎓 Talento: ${talent.name}`] };
}

export function generateEnemyIntent(state: GameState, enemy: Character): EnemyIntent {
  const avail = enemy.abilities.filter(a => a.currentCooldown === 0);
  if (avail.length === 0) return { abilityId: 'rest', abilityName: 'Ripresa', targetId: 'self', description: `${enemy.name} riprende fiato...` };
  const heal = avail.find(a => a.type === 'heal');
  const chosen = enemy.hp < enemy.maxHp * 0.3 && heal ? heal : avail[Math.floor(Math.random() * avail.length)];
  const alive = state.party.filter(p => p.hp > 0);
  const target = alive[Math.floor(Math.random() * alive.length)] || state.party[0];
  return { abilityId: chosen.id, abilityName: chosen.name, targetId: target?.id || 'player', description: `${enemy.name} prepara: ${chosen.name}` };
}

function applyStatusEffect(target: Character, effect: StatusEffect): Character {
  if (target.statusEffects.find(e => e.type === effect.type)) {
    return { ...target, statusEffects: target.statusEffects.map(e => e.type === effect.type ? { ...e, duration: Math.max(e.duration, effect.duration), potency: Math.max(e.potency, effect.potency) } : e) };
  }
  return { ...target, statusEffects: [...target.statusEffects, effect] };
}

function processStatusEffects(state: GameState): GameState {
  let log = '';
  let newParty = state.party.map(p => ({ ...p, statusEffects: p.statusEffects.map(e => ({ ...e })) }));
  let newEnemy = state.currentEnemy ? { ...state.currentEnemy, statusEffects: state.currentEnemy.statusEffects.map(e => ({ ...e })) } : null;

  newParty = newParty.map(p => {
    let hp = p.hp; const effects: StatusEffect[] = [];
    p.statusEffects.forEach(e => {
      if (e.type === 'poison') { hp = Math.max(0, hp - e.potency); log += `☠️ ${p.name} -${e.potency} HP. `; }
      else if (e.type === 'regen') { hp = Math.min(p.maxHp, hp + e.potency); log += `💚 ${p.name} +${e.potency} HP. `; }
      if (e.duration > 1) effects.push({ ...e, duration: e.duration - 1 });
    });
    return { ...p, hp, statusEffects: effects };
  });

  if (newEnemy) {
    let hp = newEnemy.hp; const effects: StatusEffect[] = [];
    newEnemy.statusEffects.forEach(e => {
      if (e.type === 'poison') { hp = Math.max(0, hp - e.potency); log += `☠️ ${newEnemy!.name} -${e.potency} HP. `; }
      if (e.duration > 1) effects.push({ ...e, duration: e.duration - 1 });
    });
    newEnemy = { ...newEnemy, hp, statusEffects: effects };
  }
  return { ...state, party: newParty, currentEnemy: newEnemy, combatLog: log ? [...state.combatLog.slice(-8), log] : state.combatLog };
}

// Applica progressione (talenti + livello) al party
function applyProgressionToParty(baseParty: Character[], state: GameState): Character[] {
  return baseParty.map((char, idx) => {
    if (idx !== 0) return char; // Solo il player ha progressione
    
    let newChar = { ...char };
    
    // Bonus livello (ogni livello dà +10 HP, +2 ATK, +1 DEF)
    const levelBonus = state.level - 1;
    if (levelBonus > 0) {
      newChar.maxHp += levelBonus * 10;
      newChar.hp += levelBonus * 10;
      newChar.attack += levelBonus * 2;
      newChar.defense += levelBonus * 1;
    }
    
    // Bonus talenti sbloccati
    if (state.talentTree) {
      state.talentTree.unlockedTalents.forEach(talentId => {
        const talent = state.talentTree!.talents.find(t => t.id === talentId);
        if (talent) {
          if (talent.effect.hp) {
            newChar.maxHp += talent.effect.hp;
            newChar.hp += talent.effect.hp;
          }
          if (talent.effect.attack) newChar.attack += talent.effect.attack;
          if (talent.effect.defense) newChar.defense += talent.effect.defense;
        }
      });
    }
    
    return newChar;
  });
}

export function enterDungeon(state: GameState): GameState {
  let party = createParty(state.playerName);
  
  // Applica progressione (talenti + livello)
  party = applyProgressionToParty(party, state);
  
  // Applica modificatori del fardello
  if (state.fardello) {
    switch (state.fardello.type) {
      case 'sacrificio': party[0].maxHp = Math.floor(party[0].maxHp * 0.9); party[0].hp = party[0].maxHp; party[0].attack += 3; break;
      case 'sangue': party[0].attack += 5; party[0].defense -= 2; break;
      case 'silenzio': party[0].speed += 3; party[0].defense += 2; break;
    }
  }
  
  // FEATURE: ghost_hero_available aggiunge un alleato spettrale
  let newFlags = [...state.flags];
  if (state.flags.includes('ghost_hero_available')) {
    const ghostHero: Character = {
      id: 'ghost_hero',
      name: 'Eroe Fantasma',
      role: 'ally',
      hp: 40,
      maxHp: 40,
      attack: 12,
      defense: 5,
      speed: 8,
      statusEffects: [],
      intent: null,
      position: { x: 3, y: 2 },
      moveRange: 2,
      attackRange: 1,
      abilities: [{
        id: 'ghost_strike',
        name: 'Colpo Spettrale',
        description: 'Attacco etereo',
        type: 'attack',
        power: 12,
        cooldown: 0,
        currentCooldown: 0,
        resonanceGain: 0,
        dissonanceGain: 0,
        corruptionChange: 0,
        targetEnemy: true,
      }],
    };
    party.push(ghostHero);
    newFlags = newFlags.filter(f => f !== 'ghost_hero_available'); // Consuma il flag
  }
  
  return { ...state, scene: 'dungeon', party, currentRoom: 0, flags: newFlags,
    dungeonRooms: JSON.parse(JSON.stringify(INITIAL_ROOMS)),
    provviste: state.provviste - 3, pendingPostBattleChoice: null, combatMode: 'turn' };
}

export function startCombat(state: GameState, enemyId: string, isShadow: boolean = false): GameState {
  const enemy = ENEMIES[enemyId];
  if (!enemy) return state;
  const corruptionMultiplier = state.corruption >= 80 ? 1.5 : state.corruption >= 50 ? 1.25 : state.corruption >= 30 ? 1.1 : 1;
  const dissonancePenalty = state.dissonance >= 12 ? 1.2 : 1;
  const scaledMaxHp = Math.floor(enemy.maxHp * corruptionMultiplier);
  const scaledAttack = Math.floor(enemy.attack * dissonancePenalty);
  const isBoss = enemy.role === 'enemy' && (enemyId.includes('boss') || enemyId.includes('shadow'));

  const clonedEnemy: Character = {
    ...enemy, hp: scaledMaxHp, maxHp: scaledMaxHp, attack: scaledAttack,
    abilities: enemy.abilities.map(a => ({ ...a, currentCooldown: 0 })),
    statusEffects: [], intent: null,
    position: isBoss ? { x: 4, y: 2 } : undefined,
    moveRange: 2, attackRange: 1,
  };

  const initialStateWithEnemy = { ...state, party: state.party, currentEnemy: clonedEnemy };
  clonedEnemy.intent = generateEnemyIntent(initialStateWithEnemy, clonedEnemy);

  // FEATURE: Peso del Fardello influenza iniziativa (velocità)
  const fardelloWeight = state.fardello?.weight || 1;
  const player = state.party.find(p => p.id === 'player');
  const playerFirst = player && (player.speed + (fardelloWeight <= 2 ? 3 : 0)) >= clonedEnemy.speed;

  return {
    ...state, scene: 'combat', currentEnemy: clonedEnemy, turn: 1,
    combatMode: isBoss ? 'tactical' : 'turn',
    shadowBattleActive: isShadow,
    shadowBattleReturnScene: isShadow ? 'hub' : 'dungeon',
    combatLog: [
      `⚔️ ${clonedEnemy.name} appare!`,
      clonedEnemy.intent ? `⚠️ ${clonedEnemy.intent.description}` : '',
      playerFirst ? `💨 ${player?.name} agisce per primo! [Fardello Leggero]` : '',
    ].filter(Boolean),
  };
}

// GRIGLIA TATTICA: movimento
export function moveCharacter(state: GameState, charId: string, target: Position): GameState {
  if (state.combatMode !== 'tactical') return state;
  const char = state.party.find(p => p.id === charId);
  if (!char || char.hp <= 0 || !char.position) return state;
  const enemy = state.currentEnemy;
  if (!enemy) return state;

  // Distanza Manhattan
  const dist = Math.abs(char.position.x - target.x) + Math.abs(char.position.y - target.y);
  if (dist > (char.moveRange || 2) || dist === 0) return state;

  // Celle occupate
  const occupied = state.party.filter(p => p.hp > 0 && p.position).map(p => `${p.position!.x},${p.position!.y}`);
  if (enemy.position) occupied.push(`${enemy.position.x},${enemy.position.y}`);
  if (occupied.includes(`${target.x},${target.y}`)) return state;

  // Bounds
  if (target.x < 0 || target.x > 4 || target.y < 0 || target.y > 4) return state;

  const newParty = state.party.map(p => p.id === charId ? { ...p, position: target } : p);
  return { ...state, party: newParty, combatLog: [...state.combatLog.slice(-8), `👣 ${char.name} si muove.`] };
}

export function performCombatAction(state: GameState, abilityId: string, targetId: string): GameState {
  const player = state.party.find(p => p.id === 'player');
  const enemy = state.currentEnemy;
  if (!player || !enemy) return state;
  const ability = player.abilities.find(a => a.id === abilityId);
  if (!ability || ability.currentCooldown > 0) return state;
  if (ability.requiresDissonance && state.dissonance < ability.requiresDissonance) return state;

  // GRIGLIA: check range per abilità melee (attack/sacrifice/betray)
  if (state.combatMode === 'tactical' && player.position && enemy.position) {
    const meleeTypes = ['attack', 'sacrifice', 'betray', 'dark'];
    if (meleeTypes.includes(ability.type)) {
      const dist = Math.abs(player.position.x - enemy.position.x) + Math.abs(player.position.y - enemy.position.y);
      if (dist > (player.attackRange || 1)) {
        return { ...state, combatLog: [...state.combatLog.slice(-8), `❌ Fuori portata! (distanza ${dist})`] };
      }
    }
  }

  let stateWithEffects = processStatusEffects(state);
  let newParty = stateWithEffects.party.map(p => ({ ...p, abilities: [...p.abilities], statusEffects: [...p.statusEffects] }));
  let newPlayer = { ...newParty.find(p => p.id === 'player')! };
  // Usa l'enemy dopo processStatusEffects per preservare i danni da status
  let newEnemy = stateWithEffects.currentEnemy 
    ? { ...stateWithEffects.currentEnemy, statusEffects: [...stateWithEffects.currentEnemy.statusEffects] }
    : { ...enemy, statusEffects: [...enemy.statusEffects] };
  let log = ''; let xpGain = 0;

  const playerWeaken = newPlayer.statusEffects.find(e => e.type === 'weaken');
  const effAtk = Math.max(1, newPlayer.attack - (playerWeaken?.potency || 0));
  const enemyShield = newEnemy.statusEffects.find(e => e.type === 'shield');
  const effDef = newEnemy.defense + (enemyShield?.potency || 0);

  // FEATURE: Peso del Fardello influenza il combattimento
  const fardelloWeight = state.fardello?.weight || 1;
  const weightBonus = fardelloWeight >= 4 ? 1.2 : fardelloWeight <= 2 ? 0.9 : 1.0; // Fardelli pesanti +20% danno, leggeri -10%
  
  switch (ability.type) {
    case 'attack': { 
      const baseDmg = Math.max(1, effAtk + ability.power - effDef);
      const dmg = Math.floor(baseDmg * weightBonus);
      newEnemy = { ...newEnemy, hp: Math.max(0, newEnemy.hp - dmg) }; 
      log = `⚔️ ${newPlayer.name}: ${dmg} danni!${fardelloWeight >= 4 ? ' [Fardello Pesante]' : fardelloWeight <= 2 ? ' [Fardello Leggero]' : ''}`; 
      break; 
    }
    case 'defend': {
      // FIX: Applica lo scudo al targetId (alleato) invece che sempre al player
      const defendTarget = newParty.find(p => p.id === targetId) || newPlayer;
      const defendIdx = newParty.findIndex(p => p.id === defendTarget.id);
      if (defendIdx >= 0) {
        newParty[defendIdx] = applyStatusEffect(newParty[defendIdx], { type: 'shield', duration: 2, potency: 5 });
      }
      log = `🛡️ ${newPlayer.name} protegge ${defendTarget.name}!`;
      break;
    }
    case 'sacrifice': {
      const dmg = Math.max(1, effAtk + ability.power - effDef);
      newPlayer = { ...newPlayer, hp: Math.max(1, newPlayer.hp - 15) };
      newEnemy = { ...newEnemy, hp: Math.max(0, newEnemy.hp - dmg) };
      if (ability.appliesStatus) newEnemy = applyStatusEffect(newEnemy, ability.appliesStatus);
      log = `💀 ${newPlayer.name}: ${dmg} danni sacri (-15 HP)`; break;
    }
    case 'betray': {
      const dmg = Math.max(1, effAtk + ability.power - effDef);
      const allyIdx = newParty.findIndex(p => p.id !== 'player' && p.hp > 0);
      if (allyIdx >= 0) { newParty[allyIdx] = { ...newParty[allyIdx], hp: Math.max(0, newParty[allyIdx].hp - 10) }; log = `🗡️ ${newPlayer.name} tradisce ${newParty[allyIdx].name}! ${dmg} danni.`; }
      else log = `🗡️ ${newPlayer.name}: ${dmg} danni.`;
      newEnemy = { ...newEnemy, hp: Math.max(0, newEnemy.hp - dmg) }; break;
    }
    case 'echo': { const missing = newPlayer.maxHp - newPlayer.hp; const dmg = Math.max(1, ability.power + Math.floor(missing * 0.5)); newEnemy = { ...newEnemy, hp: Math.max(0, newEnemy.hp - dmg) }; log = `✨ ${ability.name}! ${dmg} danni.`; xpGain += 10; break; }
    case 'dark': {
      // FEATURE: dark_power_active aumenta il danno del 50%
      const baseDmg = ability.power;
      const dmg = state.flags.includes('dark_power_active') ? Math.floor(baseDmg * 1.5) : baseDmg;
      newPlayer = { ...newPlayer, hp: Math.max(1, newPlayer.hp - 20) };
      newEnemy = { ...newEnemy, hp: Math.max(0, newEnemy.hp - dmg) };
      log = `🌑 ${dmg} danni puri (-20 HP)${state.flags.includes('dark_power_active') ? ' [Potenziato]' : ''}`;
      break;
    }
    case 'heal': {
      const target = newParty.find(p => p.id === targetId) || newPlayer;
      const idx = newParty.findIndex(p => p.id === target.id);
      if (idx >= 0) newParty[idx] = { ...newParty[idx], hp: Math.min(newParty[idx].maxHp, newParty[idx].hp + ability.power) };
      log = `💚 ${newPlayer.name} cura ${target.name}: +${ability.power} HP`; break;
    }
  }

  const playerIdx = newParty.findIndex(p => p.id === 'player');
  newParty[playerIdx] = newPlayer;

  let dissDelta = ability.dissonanceGain;
  if (ability.requiresDissonance && state.dissonance >= ability.requiresDissonance) dissDelta = -ability.requiresDissonance + ability.dissonanceGain;

  const newResonance = Math.max(0, Math.min(state.fardello?.resonanceMax || 12, state.resonance + ability.resonanceGain));
  const newDissonance = Math.max(0, Math.min(15, state.dissonance + dissDelta));
  const newCorruption = Math.max(0, Math.min(100, state.corruption + ability.corruptionChange));

  const updatedAbilities = [...newParty[playerIdx].abilities];
  const abIdx = updatedAbilities.findIndex(a => a.id === abilityId);
  if (abIdx >= 0) updatedAbilities[abIdx] = { ...updatedAbilities[abIdx], currentCooldown: ability.cooldown };
  newParty[playerIdx] = { ...newParty[playerIdx], abilities: updatedAbilities };

  const newCombatLog = [...stateWithEffects.combatLog.slice(-8), log];

  if (newEnemy.hp <= 0) {
    // Usa la funzione helper per gestire la vittoria
    const stateWithResonance = {
      ...stateWithEffects,
      resonance: newResonance,
      dissonance: newDissonance,
      corruption: newCorruption,
    };
    return handleCombatVictory(stateWithResonance, newEnemy, newParty, newCombatLog, xpGain);
  }

  const finalState: GameState = {
    ...stateWithEffects, party: newParty, currentEnemy: newEnemy,
    resonance: newResonance, dissonance: newDissonance, corruption: newCorruption, combatLog: newCombatLog,
  };
  return xpGain > 0 ? addExperience(finalState, xpGain) : finalState;
}

// Funzione helper per gestire la vittoria in combattimento
function handleCombatVictory(state: GameState, defeatedEnemy: Character, newParty: Character[], combatLog: string[], xpGain: number): GameState {
  const victoryLog = [...combatLog, `💀 ${defeatedEnemy.name} sconfitto!`];
  const newDungeonRooms = [...state.dungeonRooms];
  const currentRoom = newDungeonRooms[state.currentRoom];
  newDungeonRooms[state.currentRoom] = { ...currentRoom, cleared: true };
  const isLastRoom = state.currentRoom >= state.dungeonRooms.length - 1;
  const hasPostBattleChoices = currentRoom.postBattleChoices && currentRoom.postBattleChoices.length > 0;
  xpGain += 25;

  let nextState: GameState = {
    ...state,
    party: newParty,
    currentEnemy: defeatedEnemy,
    combatLog: victoryLog,
    bossesDefeated: state.bossesDefeated + 1,
    fragments: state.fragments + 1,
    cenere: state.cenere + 30,
    dungeonRooms: newDungeonRooms,
    dungeonCompleted: isLastRoom,
    pendingPostBattleChoice: hasPostBattleChoices && currentRoom.postBattleChoices ? [...currentRoom.postBattleChoices] : null,
  };
  nextState = addExperience(nextState, xpGain);

  // Shadow battle → torna al hub
  if (state.shadowBattleActive) {
    return { ...nextState, scene: state.shadowBattleReturnScene, shadowBattleActive: false, combatMode: 'turn',
      resonance: Math.min(state.fardello?.resonanceMax || 12, state.resonance + 3) };
  }

  if (hasPostBattleChoices) nextState.scene = 'post_combat';
  else if (isLastRoom) nextState.scene = 'ending';
  else nextState.scene = 'dungeon';
  return nextState;
}

export function enemyTurn(state: GameState): GameState {
  const enemy = state.currentEnemy;
  if (!enemy || enemy.hp <= 0) return state;
  let stateWithEffects = processStatusEffects(state);
  let newEnemy = stateWithEffects.currentEnemy ? { ...stateWithEffects.currentEnemy } : { ...enemy };
  if (!newEnemy) return state;
  
  // FIX: Se il nemico è morto per status effects (es. veleno), chiudi il combattimento
  if (newEnemy.hp <= 0) {
    return handleCombatVictory(state, newEnemy, stateWithEffects.party, stateWithEffects.combatLog, 0);
  }
  
  let newParty = stateWithEffects.party.map(p => ({ ...p, abilities: p.abilities.map(a => ({ ...a })), statusEffects: [...p.statusEffects] }));
  let log = '';

  const stunned = newEnemy.statusEffects.find(e => e.type === 'stun');
  if (stunned) { log = `💫 ${newEnemy.name} è stordito!`; newEnemy = { ...newEnemy, statusEffects: newEnemy.statusEffects.filter(e => e.type !== 'stun') }; }
  else {
    const intent = newEnemy.intent;
    const ability = intent ? newEnemy.abilities.find(a => a.id === intent.abilityId) : newEnemy.abilities.find(a => a.currentCooldown === 0);
    if (ability && ability.currentCooldown === 0) {
      if (ability.type === 'heal') { newEnemy = { ...newEnemy, hp: Math.min(newEnemy.maxHp, newEnemy.hp + ability.power) }; log = `💚 ${newEnemy.name} si cura +${ability.power} HP.`; }
      else {
        const tId = intent?.targetId || newParty.filter(p => p.hp > 0)[0]?.id;
        const target = newParty.find(p => p.id === tId && p.hp > 0) || newParty.find(p => p.hp > 0);
        if (target) {
          const shield = target.statusEffects.find(e => e.type === 'shield');
          const dmg = Math.max(1, newEnemy.attack + ability.power - target.defense - (shield?.potency || 0));
          const tIdx = newParty.findIndex(p => p.id === target.id);
          newParty[tIdx] = { ...newParty[tIdx], hp: Math.max(0, newParty[tIdx].hp - dmg) };
          log = `💥 ${newEnemy.name}: ${dmg} danni a ${target.name}`;
          if (ability.appliesStatus) newParty[tIdx] = applyStatusEffect(newParty[tIdx], ability.appliesStatus);
        }
      }
      newEnemy = { ...newEnemy, abilities: newEnemy.abilities.map(a => a.id === ability.id ? { ...a, currentCooldown: ability.cooldown } : a) };
    } else log = `⏸️ ${newEnemy.name} esita.`;
  }

  newParty = newParty.map(p => ({ ...p, abilities: p.abilities.map(a => ({ ...a, currentCooldown: Math.max(0, a.currentCooldown - 1) })) }));
  newEnemy = { ...newEnemy, abilities: newEnemy.abilities.map(a => ({ ...a, currentCooldown: Math.max(0, a.currentCooldown - 1) })) };

  const newCombatLog = [...stateWithEffects.combatLog.slice(-8), log];
  const newTurn = state.turn + 1;

  if (newParty.every(p => p.hp <= 0)) {
    return { ...stateWithEffects, party: newParty, currentEnemy: newEnemy, combatLog: [...newCombatLog, '☠️ Gruppo caduto...'], turn: newTurn, scene: 'ending' };
  }

  // Alleati agiscono
  const allies = newParty.filter(p => p.role === 'ally' && p.hp > 0);
  let allyLog = '';
  allies.forEach(ally => {
    const ability = ally.abilities.find(a => a.currentCooldown === 0);
    if (!ability) return;
    if (ability.type === 'heal') {
      const wounded = newParty.filter(p => p.hp > 0 && p.hp < p.maxHp).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
      if (wounded) {
        const idx = newParty.findIndex(p => p.id === wounded.id);
        const heal = Math.min(ability.power, newParty[idx].maxHp - newParty[idx].hp);
        newParty[idx] = { ...newParty[idx], hp: newParty[idx].hp + heal };
        allyLog += `💚 ${ally.name} cura ${wounded.name} +${heal}. `;
      }
    } else if (ability.type === 'attack' && newEnemy.hp > 0) {
      const dmg = Math.max(1, ally.attack + ability.power - newEnemy.defense);
      newEnemy = { ...newEnemy, hp: Math.max(0, newEnemy.hp - dmg) };
      allyLog += `⚔️ ${ally.name}: ${dmg} danni. `;
    }
    const idx = newParty.findIndex(p => p.id === ally.id);
    newParty[idx] = { ...newParty[idx], abilities: newParty[idx].abilities.map(a => a.id === ability.id ? { ...a, currentCooldown: ability.cooldown } : a) };
  });

  const logWithAllies = allyLog ? [...newCombatLog, allyLog.trim()] : newCombatLog;

  if (newEnemy.hp <= 0 && allyLog) {
    const victoryLog = [...logWithAllies, `💀 ${newEnemy.name} sconfitto dagli alleati!`];
    const newDungeonRooms = [...state.dungeonRooms];
    const currentRoom = newDungeonRooms[state.currentRoom];
    newDungeonRooms[state.currentRoom] = { ...currentRoom, cleared: true };
    const isLastRoom = state.currentRoom >= state.dungeonRooms.length - 1;
    const hasChoices = currentRoom.postBattleChoices && currentRoom.postBattleChoices.length > 0;
    let next: GameState = { ...stateWithEffects, party: newParty, currentEnemy: newEnemy, combatLog: victoryLog,
      bossesDefeated: state.bossesDefeated + 1, fragments: state.fragments + 1, cenere: state.cenere + 30,
      dungeonRooms: newDungeonRooms, dungeonCompleted: isLastRoom,
      pendingPostBattleChoice: hasChoices && currentRoom.postBattleChoices ? [...currentRoom.postBattleChoices] : null, turn: newTurn };
    next = addExperience(next, 25);
    if (state.shadowBattleActive) return { ...next, scene: state.shadowBattleReturnScene, shadowBattleActive: false, combatMode: 'turn' };
    if (hasChoices) next.scene = 'post_combat';
    else if (isLastRoom) next.scene = 'ending';
    else next.scene = 'dungeon';
    return next;
  }

  newEnemy.intent = generateEnemyIntent({ ...stateWithEffects, party: newParty, currentEnemy: newEnemy }, newEnemy);

  return { ...stateWithEffects, party: newParty, currentEnemy: newEnemy,
    combatLog: newEnemy.intent ? [...logWithAllies, `⚠️ ${newEnemy.intent.description}`] : logWithAllies, turn: newTurn };
}

export function applyRoomChoice(state: GameState, choiceId: string): GameState {
  const room = state.dungeonRooms[state.currentRoom];
  if (!room || !room.choices) return state;
  const choice = room.choices.find(c => c.id === choiceId);
  if (!choice) return state;

  let newResonance = state.resonance, newDissonance = state.dissonance, newCorruption = state.corruption;
  let newParty = state.party, newFactionRep = state.factionRep, newFlags = state.flags;

  if (choice.effect.resonance) newResonance = Math.min(state.fardello?.resonanceMax || 12, state.resonance + choice.effect.resonance);
  if (choice.effect.dissonance) newDissonance = Math.min(15, state.dissonance + choice.effect.dissonance);
  if (choice.effect.corruption) newCorruption = Math.max(0, Math.min(100, state.corruption + choice.effect.corruption));
  if (choice.effect.hp) {
    const pIdx = state.party.findIndex(p => p.id === 'player');
    if (pIdx >= 0) { newParty = [...state.party]; newParty[pIdx] = { ...newParty[pIdx], hp: Math.max(1, Math.min(newParty[pIdx].maxHp, newParty[pIdx].hp + choice.effect.hp)) }; }
  }
  if (choice.effect.faction && choice.effect.factionChange) newFactionRep = { ...state.factionRep, [choice.effect.faction]: state.factionRep[choice.effect.faction] + choice.effect.factionChange };
  if (choice.effect.flag) newFlags = [...state.flags, choice.effect.flag];

  const newDungeonRooms = [...state.dungeonRooms];
  newDungeonRooms[state.currentRoom] = { ...room, cleared: true };

  const newPromises = [...state.promises];
  if (choice.effect.promiseText) newPromises.push({ id: `promise_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, text: choice.effect.promiseText, kept: false, broken: false });

  let newState: GameState = { ...state, resonance: newResonance, dissonance: newDissonance, corruption: newCorruption,
    party: newParty, factionRep: newFactionRep, flags: newFlags, promises: newPromises,
    dungeonRooms: newDungeonRooms, choicesMade: state.choicesMade + 1,
    combatLog: [...state.combatLog.slice(-8), `📜 ${choice.result}`] };

  if (choice.effect.xp) newState = addExperience(newState, choice.effect.xp);
  return newState;
}

export function advanceRoom(state: GameState): GameState {
  const nextRoom = state.currentRoom + 1;
  if (nextRoom >= state.dungeonRooms.length) return { ...state, dungeonCompleted: true, scene: 'ending' };
  const room = state.dungeonRooms[nextRoom];
  if (room.choices && room.choices.length > 0 && !room.cleared) return { ...state, currentRoom: nextRoom };
  if (room.type === 'combat' || room.type === 'boss') {
    const enemyId = room.enemies?.[0];
    if (enemyId) return startCombat({ ...state, currentRoom: nextRoom }, enemyId);
  }
  return { ...state, currentRoom: nextRoom };
}

export function applyPostBattleChoice(state: GameState, choiceId: string): GameState {
  const choices = state.pendingPostBattleChoice;
  if (!choices || choices.length === 0) return { ...state, scene: 'ending', pendingPostBattleChoice: null };
  const choice = choices.find(c => c.id === choiceId);
  if (!choice) return { ...state, scene: 'ending', pendingPostBattleChoice: null };

  let newResonance = state.resonance, newDissonance = state.dissonance, newCorruption = state.corruption;
  let newParty = state.party, newEndingFlags = [...state.endingFlags];

  if (choice.effect.resonance) newResonance = Math.min(state.fardello?.resonanceMax || 12, state.resonance + choice.effect.resonance);
  if (choice.effect.dissonance) newDissonance = Math.min(15, state.dissonance + choice.effect.dissonance);
  if (choice.effect.corruption) newCorruption = Math.max(0, Math.min(100, state.corruption + choice.effect.corruption));
  if (choice.effect.hp) {
    const pIdx = state.party.findIndex(p => p.id === 'player');
    if (pIdx >= 0) { newParty = [...state.party]; newParty[pIdx] = { ...newParty[pIdx], hp: Math.max(1, Math.min(newParty[pIdx].maxHp, newParty[pIdx].hp + choice.effect.hp)) }; }
  }
  if (choice.effect.endingFlag) newEndingFlags.push(choice.effect.endingFlag);

  let newState: GameState = { ...state, resonance: newResonance, dissonance: newDissonance, corruption: newCorruption,
    party: newParty, endingFlags: newEndingFlags, choicesMade: state.choicesMade + 1,
    pendingPostBattleChoice: null, combatLog: [...state.combatLog.slice(-8), `📜 ${choice.result}`], scene: 'ending' };
  if (choice.effect.xp) newState = addExperience(newState, choice.effect.xp);
  return newState;
}

export function resolvePromise(state: GameState, promiseId: string, keep: boolean): GameState {
  const promise = state.promises.find(p => p.id === promiseId);
  if (!promise || promise.kept || promise.broken) return state;
  const newPromises = state.promises.map(p => p.id === promiseId ? { ...p, kept: keep, broken: !keep } : p);
  let newResonance = state.resonance, newDissonance = state.dissonance, newFragments = state.fragments;
  let newFactionRep = { ...state.factionRep }; let log = '';
  if (keep) { newResonance = Math.min(state.fardello?.resonanceMax || 12, state.resonance + 3); newFragments += 1; log = `✨ Promessa mantenuta! +3 Ris, +1 Frammento`; }
  else { newDissonance = Math.min(15, state.dissonance + 4); newFactionRep = { ...state.factionRep, guaritori: state.factionRep.guaritori - 1, contadini: state.factionRep.contadini - 1 }; log = `💔 Promessa infranta! +4 Dis`; }
  return { ...state, promises: newPromises, resonance: newResonance, dissonance: newDissonance, fragments: newFragments, factionRep: newFactionRep, combatLog: [...state.combatLog.slice(-8), log] };
}

export function spendIntuition(state: GameState): GameState {
  if (state.intuizione <= 0) return state;
  const newStars = [...state.constellationStars];
  const possible = ['salvati', 'culto', 'silenzio', 'dungeon_complete', 'father_echo'];
  const unrevealed = possible.filter(s => !newStars.includes(s));
  if (unrevealed.length === 0) return state;
  const star = unrevealed[Math.floor(Math.random() * unrevealed.length)];
  newStars.push(star);
  return { ...state, intuizione: state.intuizione - 1, constellationStars: newStars, combatLog: [...state.combatLog.slice(-8), `✨ Stella "${star}" rivelata.`] };
}

export function buyPotion(state: GameState): GameState {
  const cost = 20;
  const pIdx = state.party.findIndex(p => p.id === 'player');
  if (pIdx < 0) return state;
  const player = state.party[pIdx];
  if (player.hp >= player.maxHp || state.cenere < cost) return state;
  const heal = Math.min(30, player.maxHp - player.hp);
  const newParty = [...state.party];
  newParty[pIdx] = { ...player, hp: player.hp + heal };
  return { ...state, cenere: state.cenere - cost, party: newParty, combatLog: [...state.combatLog.slice(-8), `💚 +${heal} HP (-20 Cenere)`] };
}

export function performDarkSacrifice(state: GameState): GameState {
  if (state.dissonance < 5) return state;
  const enemy = state.currentEnemy;
  const player = state.party.find(p => p.id === 'player');
  if (!enemy || !player || enemy.hp <= 0) return state;
  const dmg = Math.max(1, (player.attack * 2) - enemy.defense);
  const newEnemy = { ...enemy, hp: Math.max(0, enemy.hp - dmg) };

  if (newEnemy.hp <= 0) {
    const newDungeonRooms = [...state.dungeonRooms];
    const currentRoom = newDungeonRooms[state.currentRoom];
    newDungeonRooms[state.currentRoom] = { ...currentRoom, cleared: true };
    const isLastRoom = state.currentRoom >= state.dungeonRooms.length - 1;
    const hasChoices = currentRoom.postBattleChoices && currentRoom.postBattleChoices.length > 0;
    let next: GameState = { ...state, dissonance: state.dissonance - 5, currentEnemy: newEnemy,
      combatLog: [...state.combatLog.slice(-8), `🌑 Sacrificio Oscuro! ${dmg} danni puri`, `💀 ${enemy.name} sconfitto!`],
      bossesDefeated: state.bossesDefeated + 1, fragments: state.fragments + 1, cenere: state.cenere + 30,
      dungeonRooms: newDungeonRooms, dungeonCompleted: isLastRoom,
      pendingPostBattleChoice: hasChoices && currentRoom.postBattleChoices ? [...currentRoom.postBattleChoices] : null };
    next = addExperience(next, 25);
    if (state.shadowBattleActive) return { ...next, scene: state.shadowBattleReturnScene, shadowBattleActive: false, combatMode: 'turn' };
    if (hasChoices) next.scene = 'post_combat';
    else if (isLastRoom) next.scene = 'ending';
    else next.scene = 'dungeon';
    return next;
  }
  return { ...state, dissonance: state.dissonance - 5, currentEnemy: newEnemy, combatLog: [...state.combatLog.slice(-8), `🌑 ${dmg} danni puri (-5 Dis)`] };
}

// META-LOOP: Mercato
export function generateFateFragment(fardelloType: FardelloType): FateFragment {
  const fragments: FateFragment[] = [
    { id: 'eclipse', name: 'Frammento di Eclissi', description: 'Oscura la valle', constraint: 'sacrificio', effect: 'corruption', value: 20 },
    { id: 'whisper', name: 'Frammento del Sussurro', description: 'Rivela intenti', constraint: 'silenzio', effect: 'reveal', value: 1 },
    { id: 'blood', name: 'Frammento di Sangue', description: 'Potenzia oscuri', constraint: 'sangue', effect: 'dark_power', value: 10 },
    { id: 'memory', name: 'Frammento di Memoria', description: 'Evoca eroe fantasma', constraint: null, effect: 'ghost_hero', value: 1 },
    { id: 'pact', name: 'Frammento del Patto', description: 'Contratto di fato', constraint: null, effect: 'contract', value: 1 },
  ];
  const compat = fragments.filter(f => !f.constraint || f.constraint === fardelloType);
  const pool = compat.length > 0 ? compat : fragments;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function buyFromMarket(state: GameState, listingId: string): GameState {
  const listing = state.marketListings.find(l => l.id === listingId);
  if (!listing || state.cenere < listing.price) return state;
  let newState = { ...state, cenere: state.cenere - listing.price };

  if ('name' in listing.item && 'effect' in listing.item) {
    // FIX: ID univoco
    const uniqueFragment = { ...listing.item as FateFragment, id: `frag_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
    newState.fateFragments = [...state.fateFragments, uniqueFragment];
  } else {
    newState.equipment = [...state.equipment, listing.item as Equipment];
  }
  newState.marketListings = state.marketListings.filter(l => l.id !== listingId);
  newState.combatLog = [...state.combatLog.slice(-8), `🛒 Acquistato: ${listing.item.name}`];
  return newState;
}

export function sellToMarket(state: GameState, fragmentId: string): GameState {
  const fragment = state.fateFragments.find(f => f.id === fragmentId);
  if (!fragment) return state;
  const price = fragment.value * 10;
  const listing: MarketListing = { id: `listing_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, seller: 'player', item: fragment, price, timestamp: Date.now() };
  return { ...state, fateFragments: state.fateFragments.filter(f => f.id !== fragmentId), marketListings: [...state.marketListings, listing], cenere: state.cenere + price, combatLog: [...state.combatLog.slice(-8), `💰 Venduto per ${price} Cenere`] };
}

export function useFateFragment(state: GameState, fragmentId: string): GameState {
  const fragment = state.fateFragments.find(f => f.id === fragmentId);
  if (!fragment) return state;

  // FIX: check constraint
  if (fragment.constraint && state.fardello?.type !== fragment.constraint) {
    return { ...state, combatLog: [...state.combatLog.slice(-8), `❌ Richiede Fardello "${fragment.constraint}"`] };
  }

  let newState = { ...state };
  switch (fragment.effect) {
    case 'corruption': newState.corruption = Math.min(100, state.corruption + fragment.value); break;
    case 'dark_power': newState.flags = [...state.flags, 'dark_power_active']; break;
    case 'reveal': newState.flags = [...state.flags, 'reveal_active_3']; break;
    case 'ghost_hero': newState.flags = [...state.flags, 'ghost_hero_available']; break;
    case 'contract': newState.flags = [...state.flags, 'fate_contract_active']; break;
    default: return state; // FIX: non consumare se non gestito
  }
  newState.fateFragments = state.fateFragments.filter(f => f.id !== fragmentId);
  newState.combatLog = [...state.combatLog.slice(-8), `✨ Usato: ${fragment.name}`];
  return newState;
}

export function spawnShadowBoss(state: GameState): GameState {
  if (!state.fardello || state.dissonance < 10) return state;
  const shadowMap: Record<string, string> = { sacrificio: 'shadow_martyr', sangue: 'shadow_collector', silenzio: 'shadow_mirror' };
  const bossId = shadowMap[state.fardello.type!];
  if (!bossId) return state;
  return startCombat({ ...state, dissonance: state.dissonance - 10 }, bossId, true);
}

// Ascension
export function canAscend(state: GameState): boolean {
  return state.level >= 5 && state.bossesDefeated >= 2 && !state.ascension;
}

export function performAscension(state: GameState, ascensionType: string): GameState {
  if (!canAscend(state) || !state.fardello) return state;
  const ascensions: Record<string, Ascension> = {
    martyr: { id: 'martyr', name: 'Martire della Valle', description: 'Resurrezione una volta per spedizione',
      requirements: { level: 5, bossesDefeated: 2 }, benefits: { hp: 20, special: 'resurrection' }, costs: { hp: -10 } },
    judge: { id: 'judge', name: 'Giudice Silenzioso', description: 'Vedi punti deboli nemici',
      requirements: { level: 5, bossesDefeated: 2 }, benefits: { attack: 5, special: 'see_weakness' }, costs: { resonance: -3 } },
    broken: { id: 'broken', name: 'Portatore Spezzato', description: 'Risonanza più veloce',
      requirements: { level: 5, bossesDefeated: 2 }, benefits: { resonance: 5, special: 'corrupt_echo' }, costs: { hp: -15 } },
  };
  const asc = ascensions[ascensionType];
  if (!asc) return state;

  const newParty = state.party.map(p => ({
    ...p,
    maxHp: p.maxHp + (asc.benefits.hp || 0) + (asc.costs.hp || 0),
    hp: p.hp + (asc.benefits.hp || 0) + (asc.costs.hp || 0),
    attack: p.attack + (asc.benefits.attack || 0),
  }));

  // FIX: applica benefits.resonance come cap extra
  const resonanceBoost = asc.benefits.resonance || 0;
  let updatedFardello = state.fardello;
  if (resonanceBoost > 0 && state.fardello) {
    updatedFardello = { ...state.fardello, resonanceMax: state.fardello.resonanceMax + resonanceBoost };
  }

  return { ...state, party: newParty, fardello: updatedFardello, ascension: asc,
    resonance: Math.max(0, state.resonance + (asc.costs.resonance || 0)),
    combatLog: [...state.combatLog.slice(-8), `⬆️ Ascensione: ${asc.name}`] };
}

// Sogni offline
export function generateOfflineDreams(state: GameState): GameState {
  const hours = (Date.now() - state.lastSaveTimestamp) / (1000 * 60 * 60);
  if (hours < 1) return state;
  const dreams: OfflineDream[] = [];
  const count = Math.min(3, Math.floor(hours / 2));
  for (let i = 0; i < count; i++) {
    dreams.push({
      id: `dream_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      title: ['Sogno di Sacrificio', 'Visione Corrotta', 'Eco del Passato'][i % 3],
      description: 'Il tuo personaggio ha sognato mentre eri via...',
      rewards: {
        fragments: Math.random() > 0.7 ? 1 : 0,
        cenere: Math.floor(Math.random() * 20) + 10,
        provviste: Math.floor(Math.random() * 2) + 1, // FIX: provviste ai sogni!
      },
      consequences: ['Un PNG ti ha cercato', 'Una promessa è scaduta'],
    });
  }
  return { ...state, offlineDreams: [...state.offlineDreams, ...dreams], lastSaveTimestamp: Date.now() };
}

export function createLegacy(state: GameState): GameState {
  if (!state.fardello || state.endingFlags.length === 0) return state;
  const legacy: Legacy = {
    playerName: state.playerName, fardelloType: state.fardello.type,
    endingFlag: state.endingFlags[0], timestamp: Date.now(),
    legacyType: ['npc', 'dungeon', 'fragment', 'legend'][Math.floor(Math.random() * 4)] as Legacy['legacyType'],
  };
  saveLegacyToLocal(legacy);
  return { ...state, legacies: [...state.legacies, legacy] };
}

export function useNameAsSpell(state: GameState): GameState {
  if (!state.playerName || state.intuizione < 1) return state;
  const flags = ['secret_passage', 'hidden_treasure', 'ancient_truth'];
  const revealed = flags[Math.floor(Math.random() * flags.length)];
  return { ...state, intuizione: state.intuizione - 1, flags: [...state.flags, revealed],
    combatLog: [...state.combatLog.slice(-8), `✨ "${state.playerName}" rivela: ${revealed}`] };
}

export function generateMarketListings(state: GameState): GameState {
  if (state.marketListings.length >= 5) return state;
  const listings: MarketListing[] = [];
  const count = Math.floor(Math.random() * 3) + 1;
  for (let i = 0; i < count; i++) {
    const fragment = generateFateFragment(state.fardello?.type || null);
    listings.push({
      id: `bot_listing_${Date.now()}_${i}`,
      seller: 'bot',
      item: fragment,
      price: fragment.value * 15 + Math.floor(Math.random() * 20),
      timestamp: Date.now(),
    });
  }
  return { ...state, marketListings: [...state.marketListings, ...listings] };
}

export function persistState(state: GameState): GameState {
  const stateWithTimestamp = { ...state, lastSaveTimestamp: Date.now() };
  saveGame(stateWithTimestamp);
  return stateWithTimestamp;
}

export function restoreState(): GameState | null {
  const state = loadGame();
  if (!state) return null;
  return generateOfflineDreams(state);
}
