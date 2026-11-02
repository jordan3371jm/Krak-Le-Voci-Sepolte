import type { Skill, BiomeId, Emotion } from '../types';
import { SKILLS } from './core';

export const ENEMY_SKILLS: Record<string, Skill> = {
  e_colpo: { id: 'e_colpo', name: 'Colpo', icon: '👊', desc: '', kind: 'damage', natures: ['neutral'], target: 'enemy', power: 1, cooldown: 0, melee: true },
  e_artiglio: { id: 'e_artiglio', name: 'Artiglio Marcio', icon: '🦴', desc: '', kind: 'damage', natures: ['neutral'], target: 'enemy', power: 0.9, cooldown: 2, melee: true, status: { type: 'poison', dur: 3, pot: 0.3 } },
  e_sussurro: { id: 'e_sussurro', name: 'Sussurro Corrotto', icon: '🗣️', desc: '', kind: 'debuff', natures: ['neutral'], target: 'enemy', power: 0.6, cooldown: 2, status: { type: 'weaken', dur: 2, pot: 25 } },
  e_lamento: { id: 'e_lamento', name: 'Lamento', icon: '😱', desc: '', kind: 'damage', natures: ['neutral'], target: 'allEnemies', power: 0.6, cooldown: 3 },
  e_cura: { id: 'e_cura', name: 'Rigenerazione Corrotta', icon: '💚', desc: '', kind: 'heal', natures: ['neutral'], target: 'self', power: 0.12, cooldown: 3 },
  e_scudo: { id: 'e_scudo', name: 'Guscio d\'Ossa', icon: '🦴', desc: '', kind: 'buff', natures: ['neutral'], target: 'self', power: 0, cooldown: 3, selfStatus: { type: 'defUp', dur: 2, pot: 60 } },
  e_furia: { id: 'e_furia', name: 'Furia', icon: '💢', desc: '', kind: 'buff', natures: ['neutral'], target: 'self', power: 0, cooldown: 4, selfStatus: { type: 'atkUp', dur: 3, pot: 40 } },
  e_pesante: { id: 'e_pesante', name: 'Colpo Pesante', icon: '🔨', desc: '', kind: 'damage', natures: ['neutral'], target: 'enemy', power: 1.7, cooldown: 3, melee: true },
  e_freccia: { id: 'e_freccia', name: 'Dardo Avvelenato', icon: '🏹', desc: '', kind: 'damage', natures: ['neutral'], target: 'enemy', power: 0.8, cooldown: 1, status: { type: 'poison', dur: 3, pot: 0.25 } },
  e_morso: { id: 'e_morso', name: 'Morso', icon: '🦷', desc: '', kind: 'drain', natures: ['neutral'], target: 'enemy', power: 1.1, cooldown: 2, melee: true },
  e_fiamma: { id: 'e_fiamma', name: 'Fiamma Nera', icon: '🔥', desc: '', kind: 'damage', natures: ['neutral'], target: 'allEnemies', power: 0.55, cooldown: 3, status: { type: 'burn', dur: 2, pot: 0.25 } },
  e_stordire: { id: 'e_stordire', name: 'Urlo Paralizzante', icon: '💫', desc: '', kind: 'debuff', natures: ['neutral'], target: 'enemy', power: 0.4, cooldown: 4, status: { type: 'stun', dur: 1, pot: 1 } },
  e_accusa: { id: 'e_accusa', name: 'Accusa', icon: '⚖️', desc: 'Più forte per ogni Promessa infranta.', kind: 'damage', natures: ['neutral'], target: 'enemy', power: 1.5, cooldown: 2 },
  e_imitazione: { id: 'e_imitazione', name: 'Volto Tradito', icon: '🎭', desc: 'Imita un alleato tradito.', kind: 'damage', natures: ['neutral'], target: 'enemy', power: 1.3, cooldown: 2, status: { type: 'vulnerable', dur: 2, pot: 25 } },
  e_vuoto: { id: 'e_vuoto', name: 'Sguardo del Vuoto', icon: '🕳️', desc: '', kind: 'damage', natures: ['neutral'], target: 'enemy', power: 1.2, cooldown: 2, ignoreDef: true },
  e_fulmine: { id: 'e_fulmine', name: 'Fulmine in Gabbia', icon: '⚡', desc: '', kind: 'damage', natures: ['neutral'], target: 'allEnemies', power: 0.8, cooldown: 3 },
  e_terremoto: { id: 'e_terremoto', name: 'Passo del Colosso', icon: '🌋', desc: '', kind: 'damage', natures: ['neutral'], target: 'allEnemies', power: 0.9, cooldown: 2 },
};

export function getSkill(id: string): Skill | undefined {
  return SKILLS[id] || ENEMY_SKILLS[id];
}

export interface EnemyDef {
  id: string;
  name: string;
  icon: string;
  hp: number; atk: number; def: number; speed: number;
  crit?: number; dodge?: number;
  row: 'front' | 'back';
  skills: string[];
  tags: string[];   // 'elite','boss','liar','invisible','listener','cult','undead','shadow'
  lore: string;
  xp: number;
  cenere: number;
  phases?: { at: number; summon?: string; heal?: number; text: string }[];
}

const E = (d: EnemyDef) => d;

export const ENEMIES: Record<string, EnemyDef> = {
  // ---------------- Cimitero dei Traditi ----------------
  scheletro: E({ id: 'scheletro', name: 'Ossa Rancorose', icon: '💀', hp: 34, atk: 8, def: 3, speed: 4, row: 'front', skills: ['e_colpo', 'e_scudo'], tags: ['undead'], lore: 'Ossa che ricordano solo il torto subito.', xp: 10, cenere: 6 }),
  spettro: E({ id: 'spettro', name: 'Spettro del Rimpianto', icon: '👻', hp: 26, atk: 10, def: 1, speed: 7, dodge: 15, row: 'back', skills: ['e_sussurro', 'e_colpo'], tags: ['undead', 'invisible'], lore: 'Si vede solo ascoltandolo. Con l\'audio spento, il suo intento è un mistero.', xp: 11, cenere: 7 }),
  becchino: E({ id: 'becchino', name: 'Becchino Corrotto', icon: '⚰️', hp: 44, atk: 9, def: 4, speed: 4, row: 'front', skills: ['e_pesante', 'e_artiglio'], tags: ['cult'], lore: 'Seppellisce i vivi. Dice che è più gentile.', xp: 13, cenere: 9 }),
  corvo: E({ id: 'corvo', name: 'Corvo Bugiardo', icon: '🐦‍⬛', hp: 22, atk: 9, def: 1, speed: 9, dodge: 20, row: 'back', skills: ['e_freccia', 'e_sussurro'], tags: ['liar'], lore: 'Ripete il tuo nome con la voce di chi hai perso. Mente sempre.', xp: 10, cenere: 6 }),
  ombra_tradimento: E({ id: 'ombra_tradimento', name: 'Ombra del Tradimento', icon: '🎭', hp: 85, atk: 12, def: 5, speed: 6, row: 'front', skills: ['e_imitazione', 'e_colpo', 'e_sussurro'], tags: ['elite', 'shadow'], lore: 'Ha il volto dell\'ultimo alleato che hai deluso.', xp: 35, cenere: 30 }),
  custode_lapidi: E({ id: 'custode_lapidi', name: 'Custode delle Lapidi', icon: '🪦', hp: 140, atk: 13, def: 8, speed: 3, row: 'front', skills: ['e_pesante', 'e_scudo', 'e_lamento'], tags: ['boss', 'undead'], lore: 'Ogni lapide è un nome. Ogni nome, un colpo.', xp: 70, cenere: 60 }),
  coro: E({ id: 'coro', name: 'Coro dei Salvati Non Uccisi', icon: '🎶', hp: 260, atk: 15, def: 7, speed: 4, row: 'front', skills: ['e_lamento', 'e_accusa', 'e_cura'], tags: ['boss', 'liar'], lore: 'Le voci di tutti coloro che avresti potuto salvare. Si cura se hai mentito, si rafforza con le Promesse infrante.', xp: 160, cenere: 150, phases: [{ at: 0.5, summon: 'spettro', text: 'Il Coro chiama una voce dal fondo della fossa!' }] }),

  // ---------------- Paludi di Vhalzareth ----------------
  annegato: E({ id: 'annegato', name: 'Annegato del Culto', icon: '🧟', hp: 60, atk: 14, def: 5, speed: 4, row: 'front', skills: ['e_colpo', 'e_morso'], tags: ['cult', 'undead'], lore: 'Il Culto li immerge finché smettono di dubitare.', xp: 20, cenere: 14 }),
  sanguisuga: E({ id: 'sanguisuga', name: 'Sanguisuga Madre', icon: '🪱', hp: 48, atk: 13, def: 3, speed: 6, row: 'front', skills: ['e_morso', 'e_artiglio'], tags: [], lore: 'Ha bevuto da ogni pellegrino della palude.', xp: 18, cenere: 12 }),
  accolito: E({ id: 'accolito', name: 'Accolito Ascoltatore', icon: '🕯️', hp: 42, atk: 15, def: 3, speed: 7, row: 'back', skills: ['e_fiamma', 'e_cura', 'e_sussurro'], tags: ['cult', 'listener', 'liar'], lore: 'Sente le abilità rumorose e si infuria.', xp: 22, cenere: 16 }),
  vipera: E({ id: 'vipera', name: 'Vipera dei Canneti', icon: '🐍', hp: 38, atk: 16, def: 2, speed: 10, dodge: 15, row: 'back', skills: ['e_freccia', 'e_morso'], tags: ['invisible'], lore: 'Il fruscio la tradisce, se hai orecchie per sentirlo.', xp: 19, cenere: 13 }),
  sacerdotessa: E({ id: 'sacerdotessa', name: 'Sacerdotessa della Fonte', icon: '🧛‍♀️', hp: 150, atk: 18, def: 6, speed: 6, row: 'back', skills: ['e_fiamma', 'e_cura', 'e_stordire'], tags: ['elite', 'cult', 'liar'], lore: 'Offre di rimuovere il tuo Fardello, in cambio di un tradimento.', xp: 60, cenere: 55 }),
  bestia_palude: E({ id: 'bestia_palude', name: 'Ciò che Beve dalla Palude', icon: '🐊', hp: 300, atk: 20, def: 9, speed: 5, row: 'front', skills: ['e_morso', 'e_pesante', 'e_furia'], tags: ['boss'], lore: 'La palude ingoia eserciti e ne chiede ancora.', xp: 140, cenere: 120 }),
  madre_vhalzareth: E({ id: 'madre_vhalzareth', name: 'La Madre di Vhalzareth', icon: '🩸', hp: 520, atk: 23, def: 9, speed: 6, row: 'front', skills: ['e_fiamma', 'e_morso', 'e_cura', 'e_stordire'], tags: ['boss', 'cult'], lore: 'Sorgente del Culto. Il suo sangue cambia chi lo beve.', xp: 300, cenere: 280, phases: [{ at: 0.6, summon: 'accolito', text: 'La Madre chiama i suoi figli!' }, { at: 0.3, heal: 0.1, text: 'Il sangue della Fonte la rinvigorisce.' }] }),

  // ---------------- Torre del Silenzio ----------------
  eco_muta: E({ id: 'eco_muta', name: 'Eco Muta', icon: '🌫️', hp: 95, atk: 20, def: 8, speed: 7, dodge: 15, row: 'back', skills: ['e_vuoto', 'e_sussurro'], tags: ['invisible'], lore: 'Una voce a cui è stata tolta la bocca.', xp: 32, cenere: 24 }),
  guardia_sigillo: E({ id: 'guardia_sigillo', name: 'Guardia del Sigillo', icon: '🗿', hp: 140, atk: 19, def: 14, speed: 3, row: 'front', skills: ['e_pesante', 'e_scudo'], tags: [], lore: 'Fu un Guardiano della Valle. Ora custodisce solo il silenzio.', xp: 35, cenere: 26 }),
  giudice_cieco: E({ id: 'giudice_cieco', name: 'Giudice Cieco', icon: '⚖️', hp: 110, atk: 22, def: 9, speed: 5, row: 'back', skills: ['e_accusa', 'e_stordire', 'e_fulmine'], tags: ['liar'], lore: 'Condanna senza guardare. Non ha mai assolto nessuno.', xp: 38, cenere: 30 }),
  falena: E({ id: 'falena', name: 'Falena di Krak', icon: '🦋', hp: 80, atk: 21, def: 5, speed: 11, dodge: 25, row: 'back', skills: ['e_freccia', 'e_fulmine'], tags: ['listener'], lore: 'Vola verso il rumore come verso una fiamma.', xp: 30, cenere: 22 }),
  araldo: E({ id: 'araldo', name: 'Araldo del Silenzio', icon: '📯', hp: 260, atk: 26, def: 12, speed: 7, row: 'front', skills: ['e_fulmine', 'e_vuoto', 'e_furia'], tags: ['elite'], lore: 'Annuncia la fine di ogni parola.', xp: 90, cenere: 80 }),
  campanaro: E({ id: 'campanaro', name: 'Il Campanaro Senza Lingua', icon: '🔔', hp: 520, atk: 28, def: 13, speed: 5, row: 'front', skills: ['e_lamento', 'e_stordire', 'e_pesante'], tags: ['boss', 'listener'], lore: 'Suona campane che solo i morti sentono.', xp: 260, cenere: 240 }),
  cuore_krak: E({ id: 'cuore_krak', name: 'Il Cuore di Krak', icon: '🫀', hp: 780, atk: 29, def: 14, speed: 6, row: 'front', skills: ['e_terremoto', 'e_vuoto', 'e_accusa', 'e_cura'], tags: ['boss'], lore: 'La voce sepolta sotto la valle. Ogni fardello è un battito del suo cuore.', xp: 600, cenere: 600, phases: [{ at: 0.66, summon: 'eco_muta', text: 'Il Cuore pulsa: le voci sepolte si alzano!' }, { at: 0.33, summon: 'giudice_cieco', heal: 0.08, text: 'Krak giudica le tue scelte!' }] }),

  // ---------------- Abisso degli Echi (infinito) ----------------
  eco_abisso: E({ id: 'eco_abisso', name: 'Eco dell\'Abisso', icon: '🌀', hp: 170, atk: 30, def: 12, speed: 8, row: 'front', skills: ['e_vuoto', 'e_morso', 'e_lamento'], tags: ['shadow'], lore: 'Frammenti di portatori caduti.', xp: 55, cenere: 40 }),
  divoratore: E({ id: 'divoratore', name: 'Divoratore di Nomi', icon: '👁️‍🗨️', hp: 150, atk: 33, def: 10, speed: 9, row: 'back', skills: ['e_sussurro', 'e_fulmine', 'e_vuoto'], tags: ['liar', 'invisible'], lore: 'Mangia i nomi. Poi le persone dimenticano di averli avuti.', xp: 58, cenere: 44 }),
  sovrano_vuoto: E({ id: 'sovrano_vuoto', name: 'Sovrano del Vuoto', icon: '👑', hp: 700, atk: 38, def: 16, speed: 7, row: 'front', skills: ['e_terremoto', 'e_vuoto', 'e_furia', 'e_cura'], tags: ['boss'], lore: 'Un trono martellato dal nulla assoluto.', xp: 400, cenere: 380 }),

  // ---------------- Ombre dei Fardelli (GDD §G) ----------------
  shadow_martyr: E({ id: 'shadow_martyr', name: 'Il Martire Nero', icon: '🖤', hp: 260, atk: 20, def: 8, speed: 5, row: 'front', skills: ['e_pesante', 'e_imitazione', 'e_cura'], tags: ['boss', 'shadow'], lore: 'La versione estrema del tuo sacrificio: chi muore per tutti, e pretende che tutti muoiano per lui.', xp: 180, cenere: 160 }),
  shadow_collector: E({ id: 'shadow_collector', name: "L'Esattore", icon: '💰', hp: 240, atk: 22, def: 7, speed: 7, row: 'front', skills: ['e_morso', 'e_artiglio', 'e_furia'], tags: ['boss', 'shadow', 'liar'], lore: 'Viene a riscuotere il tuo debito. Con gli interessi.', xp: 180, cenere: 160 }),
  shadow_mirror: E({ id: 'shadow_mirror', name: 'Lo Specchio Vuoto', icon: '🪞', hp: 220, atk: 21, def: 11, speed: 8, dodge: 15, row: 'front', skills: ['e_vuoto', 'e_sussurro', 'e_stordire'], tags: ['boss', 'shadow', 'invisible'], lore: 'Mostra ciò che hai visto e non hai fermato.', xp: 180, cenere: 160 }),

  // ---------------- Speciali ----------------
  cacciatore_promesse: E({ id: 'cacciatore_promesse', name: 'Cacciatore di Promesse', icon: '🔗', hp: 120, atk: 18, def: 7, speed: 8, row: 'front', skills: ['e_accusa', 'e_freccia', 'e_stordire'], tags: ['elite'], lore: 'Nasce da ogni promessa infranta. Porta le tue parole appese alla cintura.', xp: 60, cenere: 50 }),
  eco_portatore: E({ id: 'eco_portatore', name: 'Eco di un Portatore', icon: '👤', hp: 110, atk: 16, def: 6, speed: 6, row: 'front', skills: ['e_colpo', 'e_furia', 'e_imitazione'], tags: ['elite', 'shadow'], lore: 'La corsa fallita di un altro portatore, rimasta a vagare.', xp: 50, cenere: 45 }),
  tribunale: E({ id: 'tribunale', name: 'Il Tribunale degli Echi', icon: '⚖️', hp: 380, atk: 22, def: 10, speed: 6, row: 'front', skills: ['e_accusa', 'e_stordire', 'e_lamento'], tags: ['boss'], lore: 'I tuoi Fardelli testimoniano. Le tue Promesse infrante accusano.', xp: 250, cenere: 200 }),
  colosso: E({ id: 'colosso', name: 'Il Colosso di Cenere', icon: '🗻', hp: 999999, atk: 24, def: 10, speed: 2, row: 'front', skills: ['e_terremoto', 'e_pesante', 'e_furia'], tags: ['boss', 'world'], lore: 'Boss mondiale. Tutti i portatori della valle lo colpiscono ogni giorno.', xp: 0, cenere: 0 }),
  predone: E({ id: 'predone', name: 'Predone della Capitale', icon: '🪖', hp: 50, atk: 12, def: 5, speed: 5, row: 'front', skills: ['e_colpo', 'e_pesante'], tags: [], lore: 'Arruolato a forza, saccheggia per non essere saccheggiato.', xp: 14, cenere: 12 }),
};

// ------------------------------------------------------------
// BIOMI — Dungeon Specchio che Respira (GDD §5.2, §24)
// ------------------------------------------------------------
export interface BiomeDef {
  id: BiomeId;
  name: string;
  altNames: Record<string, string>;   // Mappe personalizzate per Fardello
  icon: string;
  desc: string;
  tier: number;
  scale: number;
  depth: number;          // piani (0 = infinito)
  minLevel: number;
  requires?: BiomeId;
  normal: string[];
  elites: string[];
  bosses: Record<number, string>;
  bg: string;
  drone: number;
}

export const BIOMES: Record<BiomeId, BiomeDef> = {
  cimitero: {
    id: 'cimitero', name: 'Il Cimitero dei Traditi', icon: '🪦', tier: 1, scale: 1, depth: 20, minLevel: 1,
    altNames: { sacrificio: 'Il Campo dei Sacrificati', sangue: 'Il Mercato delle Ossa', silenzio: 'Il Cimitero che Ricordi' },
    desc: 'Le tombe portano i nomi di chi hai deluso.',
    normal: ['scheletro', 'spettro', 'becchino', 'corvo'], elites: ['ombra_tradimento'], bosses: { 5: 'custode_lapidi', 10: 'ombra_tradimento', 15: 'custode_lapidi', 20: 'coro' },
    bg: 'from-stone-900 via-zinc-950 to-black', drone: 55,
  },
  paludi: {
    id: 'paludi', name: 'Le Paludi di Vhalzareth', icon: '🩸', tier: 2, scale: 2.0, depth: 20, minLevel: 8, requires: 'cimitero',
    altNames: { sacrificio: 'Le Acque dei Martiri', sangue: 'La Fonte dei Fratelli', silenzio: 'La Palude che Tace' },
    desc: 'Una palude cremisi che ingoia eserciti e ne chiede ancora.',
    normal: ['annegato', 'sanguisuga', 'accolito', 'vipera'], elites: ['sacerdotessa'], bosses: { 5: 'bestia_palude', 10: 'sacerdotessa', 15: 'bestia_palude', 20: 'madre_vhalzareth' },
    bg: 'from-red-950 via-stone-950 to-black', drone: 49,
  },
  torre: {
    id: 'torre', name: 'La Torre del Silenzio', icon: '🗼', tier: 3, scale: 3.0, depth: 20, minLevel: 16, requires: 'paludi',
    altNames: { sacrificio: 'La Scala del Prezzo', sangue: 'La Torre del Debito', silenzio: 'La Casa del Testimone' },
    desc: 'Una scala intagliata per giganti, che sprofonda verso il Cuore di Krak.',
    normal: ['eco_muta', 'guardia_sigillo', 'giudice_cieco', 'falena'], elites: ['araldo'], bosses: { 5: 'campanaro', 10: 'araldo', 15: 'campanaro', 20: 'cuore_krak' },
    bg: 'from-indigo-950 via-slate-950 to-black', drone: 41,
  },
  abisso: {
    id: 'abisso', name: "L'Abisso degli Echi", icon: '🌀', tier: 4, scale: 4.4, depth: 0, minLevel: 24, requires: 'torre',
    altNames: { sacrificio: "L'Abisso dei Debiti Pagati", sangue: "L'Abisso del Patto", silenzio: "L'Abisso del Non Detto" },
    desc: 'Senza fondo. Ogni piano più profondo, ogni eco più antica. Progressione infinita.',
    normal: ['eco_abisso', 'divoratore', 'eco_muta', 'annegato'], elites: ['araldo', 'eco_portatore'], bosses: {},
    bg: 'from-violet-950 via-black to-black', drone: 36,
  },
};
export const BIOME_IDS: BiomeId[] = ['cimitero', 'paludi', 'torre', 'abisso'];

// Modificatori del Dungeon Specchio: ogni dungeon ha 1 tema emotivo e 2 meccaniche speciali.
export const DUNGEON_MODIFIERS: Record<string, { name: string; desc: string; emotion: Emotion }> = {
  claustrofobia: { name: 'Claustrofobia', desc: 'Solo due porte per piano; trappole più frequenti.', emotion: 'paura' },
  cure_negate: { name: 'Ferite che non si chiudono', desc: 'Tutte le cure -40%.', emotion: 'colpa' },
  volti_traditi: { name: 'Volti Traditi', desc: 'I nemici imitano alleati traditi: +20% attacco se hai tradito.', emotion: 'colpa' },
  sete: { name: 'Sete di Vittoria', desc: 'Nemici +25% salute, bottino +40%.', emotion: 'ambizione' },
  reliquiario: { name: 'Reliquiario', desc: 'Più santuari e tesori, ma ogni santuario costa Cenere.', emotion: 'fede' },
  furia_cieca: { name: 'Furia Cieca', desc: 'Tutti infliggono +25% danni (anche tu).', emotion: 'rabbia' },
  eco_vuota: { name: 'Eco Vuota', desc: 'I compagni infliggono -30% danni. Più Echi di portatori.', emotion: 'isolamento' },
  ombre_doppie: { name: 'Ombre Doppie', desc: 'Gli scontri hanno spesso un nemico in più.', emotion: 'paura' },
  decimo: { name: 'La Decima', desc: 'Ogni piano costa anche 5 Cenere.', emotion: 'ambizione' },
  preghiera: { name: 'Preghiera Muta', desc: 'Le azioni di fede danno doppia Risonanza.', emotion: 'fede' },
};
