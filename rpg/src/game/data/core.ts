import type { ClassId, FactionId, FardelloId, Nature, Skill, Stats } from '../types';
import { t } from '../../i18n';

// ------------------------------------------------------------
// FARDELLI — matrice Fardello-Impatto (GDD §22)
// ------------------------------------------------------------
export interface FardelloDef {
  id: FardelloId;
  name: string;
  icon: string;
  origin: string;
  description: string;
  weight: number;            // peso narrativo: leggero = veloce, pesante = potente
  resonanceMax: number;
  advantage: string;
  mechCost: string;
  socialCost: string;
  coherent: Nature[];
  incoherent: Nature[];
  echoName: string;
  echoDesc: string;
  shadowName: string;
  shadowId: string;
  fragment: string;
  secretWord: string;
  signature: string;         // abilità firma
  emotion: 'colpa' | 'paura' | 'ambizione' | 'fede' | 'rabbia' | 'isolamento';
  ascensions: [string, string, string];
  color: string;
}

export const FARDELLI: Record<FardelloId, FardelloDef> = {
  sacrificio: {
    id: 'sacrificio', name: t('Segnato dal Sacrificio'), icon: '🩸',
    origin: t('Hai sigillato il portale sacrificando Tomas, il fratello di Kael.'),
    description: t('Una parte di te è rimasta dall\'altra parte del portale. Il tuo corpo porta il segno di quella scelta.'),
    weight: 4, resonanceMax: 12,
    advantage: t('+20% danni contro i nemici del Culto; Risonanza proteggendo gli alleati.'),
    mechCost: t('-10% salute massima; allucinazioni nei piani profondi.'),
    socialCost: t('I Contadini diffidano di te. Kael ti guarda in silenzio.'),
    coherent: ['protect', 'sacrifice', 'faith'], incoherent: ['cruel', 'betray'],
    echoName: t('Eco del Sacrificio'), echoDesc: t('Danni a tutti i nemici pari al tuo attacco + tutta la salute persa dal gruppo in questo scontro. Scudo agli alleati.'),
    shadowName: t('Il Martire Nero'), shadowId: 'shadow_martyr', fragment: 'spezzato',
    secretWord: 'Tomas', signature: 'offerta', emotion: 'colpa',
    ascensions: ['martire', 'giudice', 'spezzato'], color: '#ef4444',
  },
  sangue: {
    id: 'sangue', name: t('Debito di Sangue'), icon: '⛓️',
    origin: t('Hai consegnato il profugo Ilyas al Culto, in cambio dell\'antidoto che ha salvato il bambino.'),
    description: t('Una vita salvata, una vita venduta. Il Culto ricorda il tuo nome e ti chiama "fratello".'),
    weight: 5, resonanceMax: 15,
    advantage: t('+5 attacco, rubavita innato del 6%.'),
    mechCost: t('-2 difesa; le cure ricevute sono ridotte del 20%.'),
    socialCost: t('I Contadini ti chiamano venduto. Il Culto ti apre le porte.'),
    coherent: ['blood', 'cruel'], incoherent: ['protect', 'faith'],
    echoName: t('Eco del Sangue'), echoDesc: t('Un colpo che drena tre volte il tuo attacco e cura il gruppo della metà del danno.'),
    shadowName: t("L'Esattore"), shadowId: 'shadow_collector', fragment: 'sangue',
    secretWord: 'Ilyas', signature: 'tributo', emotion: 'ambizione',
    ascensions: ['esattore', 'giudice', 'spezzato'], color: '#b91c1c',
  },
  silenzio: {
    id: 'silenzio', name: t('Testimone Silenzioso'), icon: '👁️',
    origin: t('Hai guardato la valle bruciare senza intervenire. Hai visto tutto. Ricordi tutto.'),
    description: t('Il silenzio è diventato il tuo mantello. Nessuno ti ha visto, ma tu hai visto loro.'),
    weight: 2, resonanceMax: 10,
    advantage: t('+3 velocità, +8% schivata; vedi gli intenti nemici nascosti.'),
    mechCost: t('Risonanza massima più bassa; le abilità rumorose generano Dissonanza.'),
    socialCost: t('Gli Eretici ti cercano. I Guaritori ti chiamano codardo.'),
    coherent: ['silent', 'neutral'], incoherent: ['betray', 'blood'],
    echoName: t('Eco del Silenzio'), echoDesc: t('Rivela i punti deboli di tutti i nemici (+40% danni subiti per 3 turni) e li stordisce.'),
    shadowName: t('Lo Specchio Vuoto'), shadowId: 'shadow_mirror', fragment: 'sussurro',
    secretWord: 'Verità', signature: 'voto', emotion: 'isolamento',
    ascensions: ['dio_silenzioso', 'giudice', 'spezzato'], color: '#a855f7',
  },
};

export const FARDELLO_IDS: FardelloId[] = ['sacrificio', 'sangue', 'silenzio'];

// Ascensione del Fardello (GDD §7). Due cammini scelti = Ascensione Parallela (ibrido).
export interface AscensionDef { id: string; name: string; icon: string; desc: string; perks: string[]; costs: string[]; stats: Partial<Stats>; resMax?: number }
export const ASCENSIONS: Record<string, AscensionDef> = {
  martire: { id: 'martire', name: t('Martire della Valle'), icon: '🕯️', desc: t('Resurrezione una volta per spedizione.'), perks: [t('Resurrezione 1 volta/spedizione'), t('+30 salute massima')], costs: [t('-15% salute massima effettiva'), t('I nemici ti danno priorità')], stats: { maxHp: 30 } },
  giudice: { id: 'giudice', name: t('Giudice Silenzioso'), icon: '⚖️', desc: t('Vedi i punti deboli. Le menzogne dei PNG sono evidenziate.'), perks: [t('+12% critico'), t('Nemici bugiardi rivelati')], costs: [t('Non ricevi cure dagli alleati')], stats: { crit: 12, atk: 4 } },
  spezzato: { id: 'spezzato', name: t('Portatore Spezzato'), icon: '💔', desc: t('Carichi Risonanza più velocemente. Sblocchi Echi corrotti.'), perks: [t('Risonanza +50%'), t('Risonanza massima +4')], costs: [t('Ogni azione di sacrificio ti infligge danno extra')], stats: { atk: 6 }, resMax: 4 },
  esattore: { id: 'esattore', name: t('Esattore del Patto'), icon: '🩸', desc: t('Ogni colpo esige un tributo.'), perks: [t('+10% rubavita'), t('+6 attacco')], costs: [t('-4 difesa'), t('Il Culto pretende decime')], stats: { lifesteal: 10, atk: 6, def: -4 } },
  dio_silenzioso: { id: 'dio_silenzioso', name: t('Il Dio Silenzioso'), icon: '🌑', desc: t('Il silenzio diventa legge.'), perks: [t('+15% schivata'), t('Primo colpo sempre critico')], costs: [t('Gli alleati perdono fiducia più in fretta')], stats: { dodge: 15, speed: 4 } },
};

// ------------------------------------------------------------
// CLASSI (ispirate a Krak Realm)
// ------------------------------------------------------------
export interface ClassDef { id: ClassId; name: string; icon: string; desc: string; base: Stats; growth: Partial<Stats>; skills: string[] }
const baseStats = (s: Partial<Stats>): Stats => ({ maxHp: 90, atk: 12, def: 5, crit: 5, critDmg: 50, dodge: 3, lifesteal: 0, thorns: 0, speed: 5, ...s });

export const CLASSES: Record<ClassId, ClassDef> = {
  penitente: { id: 'penitente', name: t('Penitente di Cenere'), icon: '⛪', desc: t('Corazzato, protegge e si sacrifica. Molta salute, rivalsa.'), base: baseStats({ maxHp: 106, atk: 7, def: 9, thorns: 12 }), growth: { maxHp: 14.5, atk: 2.0, def: 1.5 }, skills: ['colpo_cenere', 'scudo_martire', 'flagello', 'voto_ferro'] },
  lama: { id: 'lama', name: t('Lama del Debito'), icon: '🗡️', desc: t('Critici e sanguinamenti. Fragile ma letale.'), base: baseStats({ maxHp: 80, atk: 15, def: 3, crit: 15, critDmg: 70, dodge: 8, speed: 8 }), growth: { maxHp: 9, atk: 2.8, def: 0.7, crit: 0.3 }, skills: ['taglio', 'salasso', 'esecuzione', 'passo_ombra'] },
  veggente: { id: 'veggente', name: t('Veggente Muta'), icon: '🔮', desc: t('Debolezze, cure e tempeste di sussurri.'), base: baseStats({ maxHp: 82, atk: 14, def: 6, crit: 8, speed: 6 }), growth: { maxHp: 10.5, atk: 2.5, def: 1.0 }, skills: ['dardo', 'sguardo_vero', 'litania', 'tempesta_sussurri'] },
  custode: { id: 'custode', name: t('Custode della Fiamma'), icon: '🔥', desc: t('Guerriero equilibrato: roghi, cariche e benedizioni.'), base: baseStats({ maxHp: 100, atk: 13, def: 6 }), growth: { maxHp: 12, atk: 2.3, def: 1.1 }, skills: ['fendente', 'rogo', 'benedizione', 'carica'] },
};

// ------------------------------------------------------------
// ABILITÀ
// ------------------------------------------------------------
export const SKILLS: Record<string, Skill> = {
  // Penitente
  colpo_cenere: { id: 'colpo_cenere', name: t('Colpo di Cenere'), icon: '⚒️', desc: t('Attacco base. +1 Focus.'), kind: 'damage', natures: ['neutral'], target: 'enemy', power: 1, focusGain: 1, cooldown: 0, melee: true },
  scudo_martire: { id: 'scudo_martire', name: t('Scudo del Martire'), icon: '🛡️', desc: t('Scudo su un alleato e lo proteggi (provocazione su di te).'), kind: 'shield', natures: ['protect'], target: 'ally', power: 1.6, focusCost: 1, cooldown: 2, selfStatus: { type: 'taunt', dur: 2, pot: 1 } },
  flagello: { id: 'flagello', name: t('Flagello'), icon: '🩸', desc: t('Sacrifichi l\'8% della salute per un colpo sacro.'), kind: 'damage', natures: ['sacrifice'], target: 'enemy', power: 2.4, focusCost: 2, cooldown: 2, selfDamage: 0.08, melee: true, status: { type: 'weaken', dur: 2, pot: 25 } },
  voto_ferro: { id: 'voto_ferro', name: t('Voto di Ferro'), icon: '⛓️', desc: t('+60% difesa e rivalsa per 3 turni.'), kind: 'buff', natures: ['faith'], target: 'self', power: 0, focusCost: 1, cooldown: 4, selfStatus: { type: 'defUp', dur: 3, pot: 60 } },
  // Lama
  taglio: { id: 'taglio', name: t('Taglio'), icon: '🗡️', desc: t('Attacco base rapido. +1 Focus.'), kind: 'damage', natures: ['neutral'], target: 'enemy', power: 1, focusGain: 1, cooldown: 0, melee: true },
  salasso: { id: 'salasso', name: t('Salasso'), icon: '🩸', desc: t('Fa sanguinare il bersaglio per 3 turni.'), kind: 'damage', natures: ['blood'], target: 'enemy', power: 0.9, focusCost: 1, cooldown: 1, melee: true, status: { type: 'bleed', dur: 3, pot: 0.35 } },
  esecuzione: { id: 'esecuzione', name: t('Esecuzione'), icon: '💀', desc: t('Danni enormi se il bersaglio è sotto il 35%.'), kind: 'damage', natures: ['cruel'], target: 'enemy', power: 1.8, focusCost: 3, cooldown: 2, melee: true, executeBonus: 1.6 },
  passo_ombra: { id: 'passo_ombra', name: t('Passo d\'Ombra'), icon: '🌫️', desc: t('+40% schivata per 2 turni e colpo furtivo.'), kind: 'damage', natures: ['silent'], target: 'enemy', power: 1.1, focusCost: 1, cooldown: 3, selfStatus: { type: 'dodgeUp', dur: 2, pot: 40 } },
  // Veggente
  dardo: { id: 'dardo', name: t('Dardo di Lucidità'), icon: '✴️', desc: t('Attacco base a distanza. +1 Focus.'), kind: 'damage', natures: ['silent'], target: 'enemy', power: 1, focusGain: 1, cooldown: 0 },
  sguardo_vero: { id: 'sguardo_vero', name: t('Sguardo Vero'), icon: '👁️', desc: t('Il bersaglio subisce +35% danni per 3 turni.'), kind: 'debuff', natures: ['silent'], target: 'enemy', power: 0.6, focusCost: 1, cooldown: 2, status: { type: 'vulnerable', dur: 3, pot: 35 } },
  litania: { id: 'litania', name: t('Litania dei Salvati'), icon: '🕊️', desc: t('Cura tutto il gruppo.'), kind: 'heal', natures: ['faith', 'protect'], target: 'allAllies', power: 0.9, focusCost: 2, cooldown: 3 },
  tempesta_sussurri: { id: 'tempesta_sussurri', name: t('Tempesta di Sussurri'), icon: '🌪️', desc: t('Danni a tutti i nemici. Rumorosa.'), kind: 'damage', natures: ['neutral'], target: 'allEnemies', power: 1.1, focusCost: 3, cooldown: 2, loud: true },
  // Custode
  fendente: { id: 'fendente', name: t('Fendente'), icon: '⚔️', desc: t('Attacco base. +1 Focus.'), kind: 'damage', natures: ['neutral'], target: 'enemy', power: 1, focusGain: 1, cooldown: 0, melee: true },
  rogo: { id: 'rogo', name: t('Rogo'), icon: '🔥', desc: t('Incendia tutti i nemici. Rumoroso.'), kind: 'damage', natures: ['cruel'], target: 'allEnemies', power: 0.7, focusCost: 2, cooldown: 2, status: { type: 'burn', dur: 2, pot: 0.3 }, loud: true },
  benedizione: { id: 'benedizione', name: t('Benedizione della Fiamma'), icon: '✨', desc: t('+30% attacco e rigenerazione al gruppo.'), kind: 'buff', natures: ['faith', 'protect'], target: 'allAllies', power: 0, focusCost: 2, cooldown: 4, status: { type: 'atkUp', dur: 3, pot: 30 } },
  carica: { id: 'carica', name: t('Carica'), icon: '🐂', desc: t('Stordisce il bersaglio. Rumorosa.'), kind: 'damage', natures: ['neutral'], target: 'enemy', power: 1.3, focusCost: 2, cooldown: 3, melee: true, status: { type: 'stun', dur: 1, pot: 1 }, loud: true },

  // Abilità firma dei Fardelli
  offerta: { id: 'offerta', name: t('Offerta'), icon: '🫀', desc: t('Doni il 15% della tua salute: l\'alleato guarisce il doppio.'), kind: 'heal', natures: ['sacrifice', 'protect'], target: 'ally', power: 0, focusCost: 1, cooldown: 2, selfDamage: 0.15 },
  tributo: { id: 'tributo', name: t('Tributo di Sangue'), icon: '🍷', desc: t('Drena la vita del bersaglio.'), kind: 'drain', natures: ['blood'], target: 'enemy', power: 1.5, focusCost: 2, cooldown: 2 },
  voto: { id: 'voto', name: t('Voto del Silenzio'), icon: '🤫', desc: t('Diventi invisibile 1 turno; il prossimo colpo è critico.'), kind: 'buff', natures: ['silent'], target: 'self', power: 0, focusCost: 1, cooldown: 3, selfStatus: { type: 'hidden', dur: 1, pot: 1 } },

  // Dissonanza: azioni potenti ma destabilizzanti (GDD §6)
  patto_oscuro: { id: 'patto_oscuro', name: t('Patto Oscuro'), icon: '🌑', desc: t('Spendi 6 Dissonanza e il 15% di salute: danni puri enormi.'), kind: 'damage', natures: ['blood', 'cruel'], target: 'enemy', power: 3.2, cooldown: 3, dissonanceCost: 6, selfDamage: 0.15, ignoreDef: true },
  tradimento: { id: 'tradimento', name: t('Tradimento Tattico'), icon: '🗡️', desc: t('Spendi 4 Dissonanza: usi un compagno come scudo (-20% salute sua) e ottieni un turno extra.'), kind: 'buff', natures: ['betray'], target: 'self', power: 0, cooldown: 4, dissonanceCost: 4, betrayAlly: 0.2, extraTurn: true },
  rogo_provviste: { id: 'rogo_provviste', name: t('Rogo delle Provviste'), icon: '🔥', desc: t('Spendi 5 Dissonanza e brucia 2 Provviste: danni massicci a tutti.'), kind: 'damage', natures: ['cruel'], target: 'allEnemies', power: 2.2, cooldown: 4, dissonanceCost: 5, burnSupply: true, loud: true },

  // Aberrazione
  fauci: { id: 'fauci', name: t('Fauci della Fonte'), icon: '🦷', desc: t('Forma aberrante: divora il bersaglio.'), kind: 'drain', natures: ['blood', 'cruel'], target: 'enemy', power: 2.2, focusCost: 2, cooldown: 2, melee: true },

  // Compagni
  c_lama_rapida: { id: 'c_lama_rapida', name: t('Lama Rapida'), icon: '⚔️', desc: '', kind: 'damage', natures: ['neutral'], target: 'enemy', power: 1, cooldown: 0, melee: true },
  c_toccasana: { id: 'c_toccasana', name: t('Toccasana'), icon: '🌿', desc: '', kind: 'heal', natures: ['protect'], target: 'ally', power: 1.2, cooldown: 2 },
  c_scudo: { id: 'c_scudo', name: t('Muro di Brann'), icon: '🛡️', desc: '', kind: 'buff', natures: ['protect'], target: 'self', power: 0, cooldown: 3, selfStatus: { type: 'taunt', dur: 2, pot: 1 } },
  c_maglio: { id: 'c_maglio', name: t('Maglio'), icon: '🔨', desc: '', kind: 'damage', natures: ['neutral'], target: 'enemy', power: 1.1, cooldown: 0, melee: true },
  c_freccia: { id: 'c_freccia', name: t('Freccia Eretica'), icon: '🏹', desc: '', kind: 'damage', natures: ['neutral'], target: 'enemy', power: 1.1, cooldown: 0, status: { type: 'poison', dur: 2, pot: 0.25 } },
  c_spettro: { id: 'c_spettro', name: t('Colpo Spettrale'), icon: '👻', desc: '', kind: 'damage', natures: ['neutral'], target: 'enemy', power: 1.2, cooldown: 0, ignoreDef: true },
};

export const DISSONANCE_SKILLS = ['patto_oscuro', 'tradimento', 'rogo_provviste'];

// ------------------------------------------------------------
// COMPAGNI
// ------------------------------------------------------------
export interface CompanionDef { id: string; name: string; icon: string; role: string; row: 'front' | 'back'; base: { maxHp: number; atk: number; def: number; speed: number }; skills: string[]; recruitCost?: { cenere: number; reliquie?: number }; faction?: FactionId; bio: string; minCycle?: number; joinsByStory?: string }
export const COMPANIONS: CompanionDef[] = [
  { id: 'kael', name: t('Kael'), icon: '🧔', role: t('Spadaccino'), row: 'front', base: { maxHp: 70, atk: 11, def: 5, speed: 7 }, skills: ['c_lama_rapida'], bio: t('Fratello di Tomas. Ti segue, ma non ha ancora deciso se perdonarti.') },
  { id: 'lyra', name: t('Lyra'), icon: '👩‍⚕️', role: t('Guaritrice'), row: 'back', base: { maxHp: 55, atk: 8, def: 3, speed: 8 }, skills: ['c_toccasana', 'c_lama_rapida'], faction: 'guaritori', bio: t('Allieva di Elara. Cura chiunque, anche chi non lo merita.') },
  { id: 'brann', name: t('Brann'), icon: '🛡️', role: t('Muro'), row: 'front', base: { maxHp: 110, atk: 9, def: 9, speed: 3 }, skills: ['c_scudo', 'c_maglio'], recruitCost: { cenere: 250 }, faction: 'guardiani', bio: t('Ex Guardiano della Valle. Ha giurato di non lasciar morire più nessuno.') },
  { id: 'mira', name: t('Mira'), icon: '🏹', role: t('Arciera Eretica'), row: 'back', base: { maxHp: 60, atk: 13, def: 3, speed: 9 }, skills: ['c_freccia'], recruitCost: { cenere: 400, reliquie: 1 }, faction: 'eretici', bio: t('Brucia i testi sacri per scaldarsi. Ride poco, mira sempre.') },
];

// ------------------------------------------------------------
// FAZIONI
// ------------------------------------------------------------
export interface FactionDef { id: FactionId; name: string; icon: string; desc: string; opposite: FactionId; leitmotif: number[] }
export const FACTIONS: Record<FactionId, FactionDef> = {
  culto: { id: 'culto', name: t('Culto di Vhalzareth'), icon: '🕯️', desc: t('Sangue, visione, sacrificio. Promettono di salvare la valle bruciandola.'), opposite: 'guaritori', leitmotif: [220, 233, 277, 220] },
  capitale: { id: 'capitale', name: t('La Capitale'), icon: '🏰', desc: t('Ordine, comando, repressione.'), opposite: 'eretici', leitmotif: [262, 330, 392, 523] },
  gilde: { id: 'gilde', name: t('Gilde Locali'), icon: '⚒️', desc: t('Artigiani e mercanti di Hondovalle.'), opposite: 'ombre', leitmotif: [294, 370, 440, 370] },
  contadini: { id: 'contadini', name: t('Contadini'), icon: '🌾', desc: t('Resistenza, cura, trappole naturali.'), opposite: 'capitale', leitmotif: [196, 247, 294, 247] },
  guaritori: { id: 'guaritori', name: t('Guaritori'), icon: '🌿', desc: t('Elara e i suoi allievi. Curano senza chiedere.'), opposite: 'culto', leitmotif: [349, 440, 523, 440] },
  eretici: { id: 'eretici', name: t('Eretici'), icon: '📜', desc: t('Rivolta, sabotaggio, verità scomode.'), opposite: 'capitale', leitmotif: [233, 277, 311, 277] },
  ombre: { id: 'ombre', name: t('Ombre del Mercato'), icon: '🎭', desc: t('Commerciano destino. Nessuno sa chi siano.'), opposite: 'gilde', leitmotif: [185, 220, 185, 164] },
  guardiani: { id: 'guardiani', name: t('Guardiani della Valle'), icon: '🗿', desc: t('Antichi custodi dei sigilli di Krak.'), opposite: 'culto', leitmotif: [174, 220, 262, 220] },
};
export const FACTION_IDS = Object.keys(FACTIONS) as FactionId[];

// ------------------------------------------------------------
// TALENTI — "Vie" narrative (GDD §7)
// ------------------------------------------------------------
export interface TalentDef { id: string; via: string; name: string; desc: string; tier: number; requires?: string; requiresAny?: string[]; stats?: Partial<Stats>; special?: string }
export const VIE: Record<string, { name: string; icon: string; desc: string; faction: FactionId }> = {
  culto: { name: t('Via del Culto'), icon: '🕯️', desc: t('Sangue, visione, sacrificio.'), faction: 'culto' },
  capitale: { name: t('Via della Capitale'), icon: '🏰', desc: t('Comando, ordine, repressione.'), faction: 'capitale' },
  contadini: { name: t('Via dei Contadini'), icon: '🌾', desc: t('Resistenza, cura, trappole naturali.'), faction: 'contadini' },
  rivolta: { name: t('Via della Rivolta'), icon: '📜', desc: t('Sabotaggio, carisma, caos.'), faction: 'eretici' },
};
// Ogni Via: 6 livelli, con due bivi (livello 2 e 4) in cui scegliere un ramo o prenderli entrambi.
export const TALENTS: TalentDef[] = [
  { id: 'cu1', via: 'culto', tier: 1, name: t('Sete Rituale'), desc: t('+5% rubavita'), stats: { lifesteal: 5 } },
  { id: 'cu2', via: 'culto', tier: 2, requires: 'cu1', name: t('Occhio della Fonte'), desc: t('+8% critico, +20% danni critici'), stats: { crit: 8, critDmg: 20 } },
  { id: 'cu2b', via: 'culto', tier: 2, requires: 'cu1', name: t('Pelle di Cera'), desc: t('+30 salute, +3 difesa'), stats: { maxHp: 30, def: 3 } },
  { id: 'cu3', via: 'culto', tier: 3, requiresAny: ['cu2', 'cu2b'], name: t('Sacramento di Sangue'), desc: t('Le abilità di sangue danno +1 Risonanza'), special: 'blood_res' },
  { id: 'cu4', via: 'culto', tier: 4, requires: 'cu3', name: t('Visione di Vhalzareth'), desc: t('+10 attacco'), stats: { atk: 10 } },
  { id: 'cu4b', via: 'culto', tier: 4, requires: 'cu3', name: t('Calice Rovesciato'), desc: t('+8% rubavita, +15% danni critici'), stats: { lifesteal: 8, critDmg: 15 } },
  { id: 'cu5', via: 'culto', tier: 5, requiresAny: ['cu4', 'cu4b'], name: t('Litania del Pozzo'), desc: t('Inizi ogni scontro con +2 Risonanza'), special: 'res_start' },
  { id: 'cu6', via: 'culto', tier: 6, requires: 'cu5', name: t('Figlio della Fonte'), desc: t('+15 attacco, +10% critico'), stats: { atk: 15, crit: 10 } },
  { id: 'ca1', via: 'capitale', tier: 1, name: t('Disciplina'), desc: t('+5 difesa'), stats: { def: 5 } },
  { id: 'ca2', via: 'capitale', tier: 2, requires: 'ca1', name: t('Comando'), desc: t('I compagni infliggono +25% danni'), special: 'command' },
  { id: 'ca2b', via: 'capitale', tier: 2, requires: 'ca1', name: t('Scudo d’Ordinanza'), desc: t('+6 difesa, +20 salute'), stats: { def: 6, maxHp: 20 } },
  { id: 'ca3', via: 'capitale', tier: 3, requiresAny: ['ca2', 'ca2b'], name: t('Repressione'), desc: t('+6 attacco, +30 salute'), stats: { atk: 6, maxHp: 30 } },
  { id: 'ca4', via: 'capitale', tier: 4, requires: 'ca3', name: t('Legge Marziale'), desc: t('Inizi ogni scontro con 2 Focus'), special: 'focus_start' },
  { id: 'ca4b', via: 'capitale', tier: 4, requires: 'ca3', name: t('Paga del Soldato'), desc: t('+20% bottino nei dungeon'), special: 'loot_plus' },
  { id: 'ca5', via: 'capitale', tier: 5, requiresAny: ['ca4', 'ca4b'], name: t('Catena di Comando'), desc: t('+10 difesa, +2 velocità'), stats: { def: 10, speed: 2 } },
  { id: 'ca6', via: 'capitale', tier: 6, requires: 'ca5', name: t('Editto Imperiale'), desc: t('+10 attacco, +60 salute'), stats: { atk: 10, maxHp: 60 } },
  { id: 'co1', via: 'contadini', tier: 1, name: t('Pelle Dura'), desc: t('+40 salute massima'), stats: { maxHp: 40 } },
  { id: 'co2', via: 'contadini', tier: 2, requires: 'co1', name: t('Erbe di Campo'), desc: t('Le pozioni curano il 50% in più'), special: 'potion_plus' },
  { id: 'co2b', via: 'contadini', tier: 2, requires: 'co1', name: t('Mani Callose'), desc: t('+4 attacco, +3 difesa'), stats: { atk: 4, def: 3 } },
  { id: 'co3', via: 'contadini', tier: 3, requiresAny: ['co2', 'co2b'], name: t('Trappole Naturali'), desc: t('+10% rivalsa, le trappole del dungeon ti feriscono la metà'), stats: { thorns: 10 }, special: 'trap_half' },
  { id: 'co4', via: 'contadini', tier: 4, requires: 'co3', name: t('Radici'), desc: t('+8 difesa, +60 salute'), stats: { def: 8, maxHp: 60 } },
  { id: 'co4b', via: 'contadini', tier: 4, requires: 'co3', name: t('Raccolto Abbondante'), desc: t('+20% esperienza'), special: 'xp_plus' },
  { id: 'co5', via: 'contadini', tier: 5, requiresAny: ['co4', 'co4b'], name: t('Pazienza della Terra'), desc: t('+10% rivalsa, +40 salute'), stats: { thorns: 10, maxHp: 40 } },
  { id: 'co6', via: 'contadini', tier: 6, requires: 'co5', name: t('Cuore della Valle'), desc: t('+12 difesa, +100 salute'), stats: { def: 12, maxHp: 100 } },
  { id: 'ri1', via: 'rivolta', tier: 1, name: t('Sabotaggio'), desc: t('+6% schivata, +2 velocità'), stats: { dodge: 6, speed: 2 } },
  { id: 'ri2', via: 'rivolta', tier: 2, requires: 'ri1', name: t('Carisma'), desc: t('Prezzi del Mercato -15%'), special: 'cheap' },
  { id: 'ri2b', via: 'rivolta', tier: 2, requires: 'ri1', name: t('Lama Nascosta'), desc: t('+8% critico, +3 attacco'), stats: { crit: 8, atk: 3 } },
  { id: 'ri3', via: 'rivolta', tier: 3, requiresAny: ['ri2', 'ri2b'], name: t('Caos'), desc: t('La Dissonanza costa 1 in meno per azione'), special: 'cheap_dis' },
  { id: 'ri4', via: 'rivolta', tier: 4, requires: 'ri3', name: t('Fuoco della Rivolta'), desc: t('+8 attacco, +10% critico'), stats: { atk: 8, crit: 10 } },
  { id: 'ri4b', via: 'rivolta', tier: 4, requires: 'ri3', name: t('Voci nella Folla'), desc: t('+8% schivata, +2 velocità'), stats: { dodge: 8, speed: 2 } },
  { id: 'ri5', via: 'rivolta', tier: 5, requiresAny: ['ri4', 'ri4b'], name: t('Barricate'), desc: t('+25% danni critici, +6% schivata'), stats: { critDmg: 25, dodge: 6 } },
  { id: 'ri6', via: 'rivolta', tier: 6, requires: 'ri5', name: t('La Valle Insorge'), desc: t('+12 attacco, +12% critico'), stats: { atk: 12, crit: 12 } },
];

import { CYCLE_COMPANIONS } from './cycles';
COMPANIONS.push(...CYCLE_COMPANIONS);
