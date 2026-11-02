// Game Types - Hondovalle: Echi di Krak

export type FardelloType = 'sacrificio' | 'sangue' | 'silenzio' | null;

export type FactionRep = {
  culto: number;
  capitale: number;
  contadini: number;
  guaritori: number;
  eretici: number;
};

export type Fardello = {
  type: FardelloType;
  name: string;
  description: string;
  icon: string;
  weight: number;
  resonanceMax: number;
  echoName: string;
  echoDescription: string;
  shadowName: string;
  secretWord?: string; // FEATURE: Parola d'Ordine del Fardello
};

export type StatusEffectType = 'poison' | 'weaken' | 'shield' | 'stun' | 'regen';

export type StatusEffect = {
  type: StatusEffectType;
  duration: number;
  potency: number;
};

export type EnemyIntent = {
  abilityId: string;
  abilityName: string;
  targetId: string;
  description: string;
};

export type Position = {
  x: number;
  y: number;
};

export type Talent = {
  id: string;
  name: string;
  description: string;
  cost: number;
  requires?: string[];
  effect: {
    hp?: number;
    attack?: number;
    defense?: number;
  };
};

export type TalentTree = {
  via: 'sacrificio' | 'sangue' | 'silenzio';
  talents: Talent[];
  unlockedTalents: string[];
};

export type Character = {
  id: string;
  name: string;
  role: 'player' | 'ally' | 'enemy';
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  abilities: Ability[];
  statusEffects: StatusEffect[];
  isCorrupted?: boolean;
  intent?: EnemyIntent | null;
  position?: Position;
  moveRange?: number;
  attackRange?: number;
};

export type Ability = {
  id: string;
  name: string;
  description: string;
  type: 'attack' | 'defend' | 'sacrifice' | 'betray' | 'echo' | 'heal' | 'dark';
  power: number;
  cooldown: number;
  currentCooldown: number;
  resonanceGain: number;
  dissonanceGain: number;
  corruptionChange: number;
  targetAlly?: boolean;
  targetEnemy?: boolean;
  requiresDissonance?: number;
  appliesStatus?: StatusEffect;
};

export type DungeonRoom = {
  id: string;
  name: string;
  description: string;
  type: 'narrative' | 'combat' | 'trap' | 'choice' | 'boss';
  enemies?: string[];
  event?: string;
  choices?: RoomChoice[];
  postBattleChoices?: RoomChoice[];
  corruption: number;
  cleared: boolean;
};

export type RoomChoice = {
  id: string;
  text: string;
  effect: {
    resonance?: number;
    dissonance?: number;
    corruption?: number;
    hp?: number;
    faction?: keyof FactionRep;
    factionChange?: number;
    flag?: string;
    xp?: number;
    endingFlag?: string;
    promiseText?: string; // Se presente, crea una promessa narrativa
  };
  result: string;
};

export type NPC = {
  id: string;
  name: string;
  role: string;
  faction: keyof FactionRep;
  icon: string;
  dialogue: string[];
  quest?: string;
};

export type GameScene = 'intro' | 'hub' | 'dungeon' | 'combat' | 'post_combat' | 'map' | 'market' | 'ascension' | 'dreams' | 'talents' | 'legacy' | 'ending' | 'menu';

export type FateFragment = {
  id: string;
  name: string;
  description: string;
  constraint?: FardelloType; // Vincolo narrativo
  effect: string;
  value: number;
};

export type MarketListing = {
  id: string;
  seller: string; // 'player' | 'bot'
  item: FateFragment | Equipment;
  price: number;
  timestamp: number;
};

export type Equipment = {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'trinket';
  bonus: {
    attack?: number;
    defense?: number;
    hp?: number;
    resonance?: number;
  };
};

export type Ascension = {
  id: string;
  name: string;
  description: string;
  requirements: {
    level: number;
    bossesDefeated: number;
  };
  benefits: {
    attack?: number;
    defense?: number;
    hp?: number;
    resonance?: number;
    special?: string;
  };
  costs: {
    hp?: number;
    resonance?: number;
  };
};

export type OfflineDream = {
  id: string;
  timestamp: number;
  title: string;
  description: string;
  rewards: {
    fragments?: number;
    cenere?: number;
    resonance?: number;
    dissonance?: number;
    provviste?: number;
  };
  consequences: string[];
};

export type Legacy = {
  playerName: string;
  fardelloType: FardelloType;
  endingFlag: string;
  timestamp: number;
  legacyType: 'npc' | 'dungeon' | 'fragment' | 'legend';
};

export type GameState = {
  scene: GameScene;
  playerName: string;
  fardello: Fardello | null;
  resonance: number;
  dissonance: number;
  corruption: number;
  party: Character[];
  currentRoom: number;
  dungeonRooms: DungeonRoom[];
  dungeonCompleted: boolean;
  factionRep: FactionRep;
  flags: string[];
  promises: GamePromise[];
  fragments: number;
  cenere: number;
  provviste: number;
  intuizione: number;
  constellationStars: string[];
  combatLog: string[];
  currentEnemy: Character | null;
  turn: number;
  dialogueQueue: DialogueLine[];
  notifications: string[];
  visitedScenes: string[];
  choicesMade: number;
  bossesDefeated: number;
  level: number;
  experience: number;
  experienceToNext: number;
  endingFlags: string[];
  pendingPostBattleChoice: RoomChoice[] | null;
  skipAnimations: boolean;
  // Nuove feature GDD
  fateFragments: FateFragment[];
  marketListings: MarketListing[];
  equipment: Equipment[];
  talentTree: TalentTree | null;
  ascension: Ascension | null;
  offlineDreams: OfflineDream[];
  legacies: Legacy[];
  lastSaveTimestamp: number;
  fullscreenBonus: boolean;
  corruptedUI: boolean;
  // Shadow Battle
  isShadowBattle: boolean;
  shadowBattleActive: boolean;
  shadowBattleReturnScene: 'hub' | 'dungeon';
  talentPoints: number;
  // Griglia tattica
  combatMode: 'turn' | 'tactical';
  // FEATURE: Soglia di Ritiro / Pegno del Futuro
  pledgedMaxHp: number; // HP massimi pegnorati
};

export type GamePromise = {
  id: string;
  text: string;
  kept: boolean;
  broken: boolean;
};

export type DialogueLine = {
  speaker: string;
  text: string;
  icon?: string;
  choices?: { text: string; action: string }[];
};
