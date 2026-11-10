// ============================================================
// KRAK — LE VOCI SEPOLTE · Tipi di gioco
// "Il mondo non salva i tuoi progressi. Li ricorda."
// ============================================================

export type FardelloId = 'sacrificio' | 'sangue' | 'silenzio';
export type ClassId = 'penitente' | 'lama' | 'veggente' | 'custode';
export type Nature = 'protect' | 'sacrifice' | 'cruel' | 'betray' | 'silent' | 'faith' | 'blood' | 'neutral';

export type ResKey = 'cenere' | 'provviste' | 'legno' | 'pietra' | 'ferro' | 'intuizione';
export type Resources = Record<ResKey, number>;

export type FactionId = 'culto' | 'capitale' | 'gilde' | 'contadini' | 'guaritori' | 'eretici' | 'ombre' | 'guardiani';
export type RepState = 'Ignorato' | 'Tollerato' | 'Fidato' | 'Adorato' | 'Temuto' | 'Bandito' | 'Marchiato';

export type StatKey = 'maxHp' | 'atk' | 'def' | 'crit' | 'critDmg' | 'dodge' | 'lifesteal' | 'thorns' | 'speed';
export type Stats = Record<StatKey, number>;

export type Slot = 'arma' | 'scudo' | 'elmo' | 'corazza' | 'stivali' | 'amuleto' | 'anello';
export type Rarity = 0 | 1 | 2 | 3 | 4 | 5;

export interface Item {
  uid: string;
  name: string;
  slot: Slot;
  rarity: Rarity;
  ilvl: number;
  plus: number;
  stats: Partial<Stats>;
  origin: string;      // valutazione narrativa ("storico delle anime")
  locked?: boolean;
}

export type BiomeId = 'cimitero' | 'paludi' | 'torre' | 'abisso';
export type ValleyState = 'Fioritura' | 'Quiete' | 'Tensione' | 'Corruzione' | 'Cenere' | 'Eclisse' | 'Rinascita';
export type Emotion = 'colpa' | 'paura' | 'ambizione' | 'fede' | 'rabbia' | 'isolamento';

export type StatusType =
  | 'poison' | 'burn' | 'bleed' | 'weaken' | 'vulnerable' | 'shield'
  | 'stun' | 'regen' | 'taunt' | 'dodgeUp' | 'atkUp' | 'defUp' | 'hidden';

export interface Status { type: StatusType; dur: number; pot: number }

export type SkillTarget = 'enemy' | 'allEnemies' | 'ally' | 'self' | 'allAllies';
export type SkillKind = 'damage' | 'heal' | 'shield' | 'buff' | 'debuff' | 'drain';

export interface Skill {
  id: string;
  name: string;
  icon: string;
  desc: string;
  kind: SkillKind;
  natures: Nature[];
  target: SkillTarget;
  power: number;          // moltiplicatore dell'attacco (o della cura)
  focusCost?: number;
  focusGain?: number;
  cooldown: number;
  melee?: boolean;
  hits?: number;
  selfDamage?: number;    // frazione degli HP massimi
  dissonanceCost?: number;
  status?: Status;        // applicato al bersaglio
  selfStatus?: Status;    // applicato a chi lancia
  executeBonus?: number;  // danni extra se bersaglio < 35%
  extraTurn?: boolean;
  betrayAlly?: number;    // frazione HP tolta a un compagno
  burnSupply?: boolean;   // brucia una provvista
  ignoreDef?: boolean;
  loud?: boolean;         // abilità rumorose (Ascoltatori)
}

export interface Intent { skillId: string; targetUid: string; label: string }

export interface Combatant {
  uid: string;
  defId: string;
  name: string;
  icon: string;
  side: 'party' | 'enemy';
  row: 'front' | 'back';
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  crit: number;
  critDmg: number;
  dodge: number;
  lifesteal: number;
  thorns: number;
  speed: number;
  statuses: Status[];
  skills: string[];
  cds: Record<string, number>;
  intent?: Intent | null;
  tags: string[];
  companionId?: string;
  revealed?: boolean;
  phase?: number;
}

export interface FxEvent { id: number; uid: string; text: string; kind: 'dmg' | 'heal' | 'crit' | 'miss' | 'status' | 'echo' }

export interface CombatState {
  kind: 'delve' | 'boss' | 'worldboss' | 'shadow' | 'trial' | 'hunter' | 'ghost';
  party: Combatant[];
  enemies: Combatant[];
  round: number;
  focus: number;
  phase: 'player' | 'enemy' | 'won' | 'lost';
  log: string[];
  fx: FxEvent[];
  sacrificeBank: number;
  echoUsed: number;
  damageDealt: number;
  heroActedExtra?: boolean;
  repositioned?: boolean;
  wordUsed?: boolean;
  reviveAvailable: boolean;
  chain: number;        // Catena di Coerenza
  bestChain: number;
  title: string;
}

export interface Loot {
  cenere: number;
  legno: number;
  pietra: number;
  ferro: number;
  provviste: number;
  reliquie: number;
  xp: number;
  items: Item[];
  fragments: string[];
}

export type RoomType = 'combat' | 'elite' | 'event' | 'trap' | 'shrine' | 'treasure' | 'ghost' | 'shadow' | 'hunter' | 'boss' | 'merchant' | 'puzzle';

export interface RoomOption { type: RoomType; seed: number; hint: string }

export interface ActiveRoom {
  type: RoomType;
  eventId?: string;
  resolved: boolean;
  text?: string;
  ghostName?: string;
  ghostKind?: 'ally' | 'enemy' | 'merchant' | 'corpse';
  bossChoice?: Item[];
  merchantItems?: { item: Item; price: number }[];
  puzzle?: { seq: number[]; input: number[]; mode: 'candele' | 'sigillo' };
}

export interface DelveState {
  biome: BiomeId;
  floor: number;
  startFloor: number;
  satchel: Loot;
  doors: RoomOption[];
  room: ActiveRoom | null;
  floorCleared: boolean;
  modifiers: string[];
  emotion: Emotion;
  pledged: number;
  ghostAlly?: boolean;
  daily?: boolean;
  snap?: { t: number; coh: number; inc: number; corr: number; influence: number; factions: Record<string, number>; open: number; kept: number; broken: number; bosses?: number; cenere?: number };
  log: string[];
}

export interface Companion {
  id: string;
  name: string;
  icon: string;
  role: string;
  level: number;
  xp: number;
  trust: number;
  hp: number;           // frazione 0..1
  recruited: boolean;
  inParty: boolean;
  mission?: { locId: string; start: number; end: number } | null;
  left?: boolean;
  weight?: number;                 // Peso emotivo: a 100 si spezza o trova una Virtù
  mood?: 'broken' | 'virtue' | null;
  gifts?: number;
}

export interface PromiseState {
  uid: string;
  defId: string;
  text: string;
  createdAt: number;
  deadlineDelves: number;   // spedizioni rimanenti
  status: 'open' | 'kept' | 'broken';
}

export interface FragmentInst { uid: string; defId: string }

export interface Listing {
  uid: string;
  seller: string;
  kind: 'item' | 'fragment' | 'res';
  item?: Item;
  fragment?: string;
  res?: { key: ResKey; amount: number };
  price: number;
}

export interface Contract { uid: string; fragmentUid: string; fragmentDef: string; prediction: ValleyState; day: string; resolved?: boolean; won?: boolean }

export interface Chronicle { t: number; text: string; kind: 'choice' | 'combat' | 'promise' | 'world' | 'loot' | 'fate' }

export interface Dream { id: string; title: string; text: string; rewards: Partial<Resources> & { reliquie?: number } ; consequence?: string }

export interface Legacy {
  name: string;
  classId: ClassId;
  fardello: FardelloId | null;
  ending: string;
  level: number;
  cycle: number;
  t: number;
  kind: 'ally' | 'enemy' | 'merchant' | 'corpse';
}

export interface DailyMission { id: string; target: number; progress: number; claimed: boolean }

export interface Request { uid: string; faction: FactionId; need: Partial<Resources>; reward: { cenere?: number; reliquie?: number; rep: number }; until: number; text: string }

export interface VillageEvents {
  cart: number;        // timestamp di scadenza (0 = nessuno)
  deer: number;
  threat: { name: string; icon: string; hp: number; maxHp: number; until: number } | null;
  nextAt: number;
  buffs: { id: string; label: string; until: number; prod?: number; click?: number }[];
  bardReadyAt: number;
}

export type TabId = 'villaggio' | 'discesa' | 'eroe' | 'bussola' | 'mercato' | 'fazioni' | 'spedizioni' | 'diario' | 'eredita' | 'veglia' | 'opzioni';

export interface Modal {
  kind: 'event' | 'welcome' | 'trial' | 'info' | 'promise';
  eventId?: string;
  title?: string;
  text?: string;
  lines?: string[];
  double?: Partial<Resources>;
}

export interface Toast { id: number; text: string; kind: 'info' | 'good' | 'bad' | 'fate' }

export interface GameState {
  version: number;
  createdAt: number;
  lastTick: number;
  lastSave: number;
  scene: 'intro' | 'game' | 'ending';
  tab: TabId;

  playerName: string;
  classId: ClassId;
  fardello: FardelloId | null;
  influence: number;              // influenza del Fardello (genera l'Ombra)
  ascension: { paths: string[]; hybrid: boolean } | null;
  aberration: boolean;
  nameCorrupted: boolean;

  hero: {
    level: number;
    xp: number;
    paragon: number;
    hp: number;
    pledgedMaxHp: number;
    equipped: Partial<Record<Slot, string>>;
    talents: string[];
    talentPoints: number;
    deaths: number;
  };
  inventory: Item[];
  potions: number;
  elixirs: Record<string, number>;
  activeElixir: string | null;

  res: Resources;
  reliquie: number;
  totals: Record<string, number>;

  village: { buildings: Record<string, number>; upgrades: string[] };
  companions: Companion[];

  resonance: number;
  dissonance: number;
  corruption: number;

  factions: Record<FactionId, number>;
  flags: string[];
  chronicle: Chronicle[];
  promises: PromiseState[];
  fragments: FragmentInst[];

  delve: DelveState | null;
  biomes: Record<BiomeId, { best: number; conquered: boolean; visits: number; lastVisit: number; memory: string[] }>;
  combat: CombatState | null;

  stars: string[];

  market: { listings: Listing[]; refreshAt: number; history: string[] };
  contracts: Contract[];

  valley: { prosperity: number; tension: number; blight: number; eclipseUntil: number; rebirthUntil: number };
  world: { day: string; bossDamage: number; bossTries: number };

  daily: { day: string; chest: boolean; missions: DailyMission[]; bonus: boolean };
  weekly: { key: string; missions: DailyMission[]; bonus: boolean };
  monthly: { key: string; missions: DailyMission[]; bonus: boolean };
  achievements: string[];
  bestiary: Record<string, number>;
  fish: string[];
  bait: number;
  baitAt: number;

  requests: Request[];
  requestsAt: number;
  events: VillageEvents;

  cycle: { n: number; memorie: number; memorieTotal: number; sanctuary: Record<string, number>; card: string | null; cardOffer: string[]; heirloom: Item | null };
  legacies: Legacy[];
  dreams: Dream[];

  trial: 'none' | 'pending' | 'done';
  trialOutcome: string | null;
  ending: string | null;

  settings: { music: boolean; musicVolume: number; sfx: boolean; autoBattle: boolean; autoPotion: number; fastCombat: boolean; purifiedUntil: number; reduceFx: boolean };
  fullscreen: boolean;

  unlocked: string[];
  newTabs: string[];
  codexQueue: string[];
  tutorial: number;
  tipsSeen: string[];
  lastReport: { title: string; good: boolean; lines: string[]; voices?: { id: string; text: string }[] } | null;

  krak: { level: number; max: number };
  omens: { id: string; left: number; biome: BiomeId; floor: number }[];
  dailyRun: { day: string; best: number; tries: number; allBest: number };
  glitchUntil: number;
  lostSatchel: { cenere: number; legno: number; pietra: number; ferro: number; items: Item[] } | null;

  talk: { npc: string; node: string; log: { who: string; text: string }[]; roll: { skill: string; die: number; bonus: number; dc: number; ok: boolean } | null } | null;
  quests: Record<string, { stage: number; done?: boolean; outcome?: string }>;

  modal: Modal | null;
  toasts: Toast[];
}
