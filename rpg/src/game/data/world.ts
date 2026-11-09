import type { FardelloId, ResKey, Resources, Slot, ValleyState } from '../types';
import { t } from '../../i18n';

export const RES_INFO: Record<ResKey | 'reliquie', { name: string; icon: string; color: string }> = {
  cenere: { name: t('Cenere'), icon: '⚱️', color: 'text-amber-300' },
  provviste: { name: t('Provviste'), icon: '🍞', color: 'text-lime-300' },
  legno: { name: t('Legno'), icon: '🪵', color: 'text-orange-300' },
  pietra: { name: t('Pietra'), icon: '🪨', color: 'text-slate-300' },
  ferro: { name: t('Ferro'), icon: '⛓️', color: 'text-sky-300' },
  intuizione: { name: t('Intuizione'), icon: '🔮', color: 'text-violet-300' },
  reliquie: { name: t('Reliquie'), icon: '🏺', color: 'text-yellow-200' },
};

// ------------------------------------------------------------
// VILLAGGIO — idle (ispirato a Hondovalle)
// ------------------------------------------------------------
export interface BuildingDef { id: string; name: string; icon: string; desc: string; cost: Partial<Resources>; prod: Partial<Resources>; max?: number; unlock?: { building: string; count: number } }
export const BUILDINGS: BuildingDef[] = [
  { id: 'segheria', name: t('Segheria'), icon: '🪓', desc: t('Produce legno.'), cost: { cenere: 12 }, prod: { legno: 0.3 } },
  { id: 'capanna', name: t('Capanna dei Raccoglitori'), icon: '🛖', desc: t('Produce provviste per le spedizioni.'), cost: { legno: 20 }, prod: { provviste: 0.06 } },
  { id: 'bottega', name: t('Bottega delle Gilde'), icon: '🏪', desc: t('Produce cenere.'), cost: { legno: 25, pietra: 5 }, prod: { cenere: 0.35 }, unlock: { building: 'segheria', count: 1 } },
  { id: 'cava', name: t('Cava di Pietra'), icon: '⛏️', desc: t('Produce pietra.'), cost: { legno: 35 }, prod: { pietra: 0.18 }, unlock: { building: 'segheria', count: 2 } },
  { id: 'fucina', name: t('Fucina'), icon: '🔥', desc: t('Produce ferro.'), cost: { pietra: 45, legno: 25 }, prod: { ferro: 0.09 }, unlock: { building: 'cava', count: 2 } },
  { id: 'altare', name: t('Altare della Veglia'), icon: '🕯️', desc: t('Genera Intuizione e ne alza il limite.'), cost: { pietra: 70, cenere: 60 }, prod: { intuizione: 0.004 }, max: 15, unlock: { building: 'cava', count: 3 } },
  { id: 'infermeria', name: t('Infermeria di Elara'), icon: '🏥', desc: t('Rigenera il gruppo più in fretta. Permette di preparare pozioni.'), cost: { legno: 60, pietra: 50 }, prod: {}, max: 10, unlock: { building: 'capanna', count: 2 } },
  { id: 'locanda', name: t('Locanda dei Viandanti'), icon: '🍺', desc: t('Ogni livello: +1 compagno in spedizione contemporanea.'), cost: { legno: 90, cenere: 90 }, prod: {}, max: 4, unlock: { building: 'bottega', count: 3 } },
  { id: 'torre', name: t('Torre di Guardia'), icon: '🗼', desc: t('Respinge le incursioni da sola e potenzia i tuoi colpi.'), cost: { pietra: 90, ferro: 25 }, prod: {}, max: 20, unlock: { building: 'fucina', count: 1 } },
];
// Ogni soglia raggiunta sblocca un miglioramento che raddoppia la produzione dell'edificio.
export const UPGRADE_THRESHOLDS = [5, 15, 30, 60, 100];
export const UPGRADE_NAMES = [t('Attrezzi migliori'), t('Maestranze della valle'), t('Metodi antichi'), t('Benedizione dei Guardiani'), t('Opera leggendaria')];

// Spedizioni dei compagni in tempo reale (proseguono offline)
export interface ExpeditionDef { id: string; name: string; icon: string; minutes: number; minLevel: number; rewards: Partial<Resources> & { reliquie?: number; itemChance?: number; fragmentChance?: number }; desc: string }
export const EXPEDITIONS: ExpeditionDef[] = [
  { id: 'boschi', name: t('Boschi Bruciati'), icon: '🌲', minutes: 5, minLevel: 1, rewards: { legno: 60, provviste: 3 }, desc: t('Legna e radici tra la cenere.') },
  { id: 'rovine', name: t('Rovine di Hondovalle Alta'), icon: '🏚️', minutes: 20, minLevel: 1, rewards: { pietra: 90, cenere: 60, itemChance: 0.3 }, desc: t('Ciò che resta del villaggio di sopra.') },
  { id: 'miniere', name: t('Miniere del Nord'), icon: '⛰️', minutes: 60, minLevel: 3, rewards: { ferro: 80, pietra: 120, itemChance: 0.5 }, desc: t('Ferro e voci nelle gallerie.') },
  { id: 'carovana', name: t('Carovana per la Capitale'), icon: '🐫', minutes: 120, minLevel: 4, rewards: { cenere: 400, provviste: 12, reliquie: 1, fragmentChance: 0.25 }, desc: t('Commercio, rischi e notizie.') },
  { id: 'santuari', name: t('Santuari Dimenticati'), icon: '⛩️', minutes: 360, minLevel: 6, rewards: { intuizione: 4, reliquie: 2, itemChance: 1, fragmentChance: 0.6 }, desc: t('Pellegrinaggio lungo, ricompense rare.') },
  { id: 'oltre', name: t('Oltre il Portale'), icon: '🌀', minutes: 720, minLevel: 10, rewards: { cenere: 1500, ferro: 300, reliquie: 4, itemChance: 1, fragmentChance: 1 }, desc: t('Dove è rimasto Tomas. Pochi tornano uguali.') },
];

// Santuario delle Reliquie — permanenti tra i Cicli
export interface SanctuaryDef { id: string; name: string; icon: string; desc: string; per: number; max: number }
export const SANCTUARY: SanctuaryDef[] = [
  { id: 'raccolto', name: t('Raccolto Eterno'), icon: '🌾', desc: t('Provviste e legno'), per: 10, max: 20 },
  { id: 'saggi', name: t('Concilio dei Saggi'), icon: '📚', desc: t('Tutta la produzione'), per: 5, max: 30 },
  { id: 'scalpellini', name: t('Scalpellini Sacri'), icon: '🪨', desc: t('Pietra e ferro'), per: 10, max: 20 },
  { id: 'forziere', name: t('Forziere della Valle'), icon: '⚱️', desc: t('Cenere'), per: 10, max: 20 },
  { id: 'sentieri', name: t('Sentieri Segreti'), icon: '🧭', desc: t('Durata spedizioni (−%)'), per: 4, max: 10 },
  { id: 'memoria', name: t('Memoria della Valle'), icon: '🌙', desc: t('Ore offline conteggiate (+1h)'), per: 1, max: 16 },
  { id: 'pozzo', name: t('Pozzo di Lucidità'), icon: '🔮', desc: t('Intuizione'), per: 15, max: 10 },
  { id: 'sentinelle', name: t('Sentinelle'), icon: '🗡️', desc: t('Danni alle incursioni'), per: 25, max: 10 },
  { id: 'bottino', name: t('Bottino degli Echi'), icon: '💰', desc: t('Bottino nei dungeon'), per: 6, max: 20 },
  { id: 'sangue_antico', name: t('Sangue Antico'), icon: '🩸', desc: t('Statistiche dell\'eroe'), per: 3, max: 20 },
];

// Carte del Destino — una per Ciclo, cambia le regole (Hondovalle "Choose your fate")
export interface FateCardDef { id: string; name: string; icon: string; good: string; bad: string; mods: Record<string, number> }
export const FATE_CARDS: FateCardDef[] = [
  { id: 'vena', name: t('Vena Profonda'), icon: '⛏️', good: t('Pietra e ferro +60%'), bad: t('Provviste −20%'), mods: { pietra: 0.6, ferro: 0.6, provviste: -0.2 } },
  { id: 'febbre', name: t('Febbre della Cenere'), icon: '⚱️', good: t('Cenere +50%'), bad: t('Legno −20%'), mods: { cenere: 0.5, legno: -0.2 } },
  { id: 'bosco', name: t('Bosco Generoso'), icon: '🌲', good: t('Legno +60%, provviste +20%'), bad: t('Pietra −20%'), mods: { legno: 0.6, provviste: 0.2, pietra: -0.2 } },
  { id: 'mani', name: t('Mani di Ferro'), icon: '✊', good: t('Raccolta manuale ×3'), bad: t('Produzione −10%'), mods: { click: 2, all: -0.1 } },
  { id: 'luna', name: t('Luna d\'Argento'), icon: '🌙', good: t('Intuizione +80%'), bad: t('Provviste −10%'), mods: { intuizione: 0.8, provviste: -0.1 } },
  { id: 'mostri', name: t('Terra di Mostri'), icon: '👹', good: t('Bottino dei dungeon +50%'), bad: t('Incursioni il doppio più frequenti'), mods: { loot: 0.5, threats: 1 } },
  { id: 'avventura', name: t('Spirito Avventuroso'), icon: '🧭', good: t('Spedizioni −30% tempo, XP compagni +50%'), bad: t('Produzione −10%'), mods: { exped: 0.3, all: -0.1 } },
  { id: 'gilda', name: t('Gilda dei Costruttori'), icon: '🏗️', good: t('Edifici −20% costo'), bad: t('Cenere −20%'), mods: { build: 0.2, cenere: -0.2 } },
  { id: 'eco', name: t('Scommessa dell\'Eco'), icon: '🎲', good: t('+30% Memorie alla fine del Ciclo'), bad: t('Produzione −15%'), mods: { memorie: 0.3, all: -0.15 } },
  { id: 'martirio', name: t('Martirio'), icon: '🕯️', good: t('Risonanza +40%'), bad: t('Salute massima −10%'), mods: { resonance: 0.4, hp: -0.1 } },
];

// Stagno delle Voci — pesca di memorie (Hondovalle "Pond Fishing")
export interface FishDef { id: string; name: string; icon: string; rarity: 0 | 1 | 2 | 3; night?: boolean; day?: boolean; lore: string }
export const FISH: FishDef[] = [
  { id: 'trota', name: t('Trota della Ninna Nanna'), icon: '🐟', rarity: 0, lore: t('Canticchia una melodia che tua madre conosceva.') },
  { id: 'carpa', name: t('Carpa del Mulino'), icon: '🐠', rarity: 0, lore: t('Ricorda il rumore delle macine.') },
  { id: 'perca', name: t('Perca Striata'), icon: '🐡', rarity: 0, lore: t('Una memoria di estate, prima della cenere.') },
  { id: 'stivale', name: t('Vecchio Stivale'), icon: '🥾', rarity: 0, lore: t('Almeno è della tua misura.') },
  { id: 'anguilla', name: t('Anguilla del Rimorso'), icon: '🐍', rarity: 1, night: true, lore: t('Scivola via ogni volta che provi a ricordare.') },
  { id: 'salmone', name: t('Salmone d\'Argento'), icon: '🐟', rarity: 1, lore: t('Risale il fiume dei ricordi.') },
  { id: 'pescesole', name: t('Pesce Sole'), icon: '🌞', rarity: 1, day: true, lore: t('Una giornata in cui hai riso.') },
  { id: 'pesceluna', name: t('Pesce Luna'), icon: '🌙', rarity: 2, night: true, lore: t('Una promessa fatta sottovoce.') },
  { id: 'koi', name: t('Koi Spirito'), icon: '🎏', rarity: 2, lore: t('Ha gli occhi di Tomas.') },
  { id: 'cristallo', name: t('Pesce di Cristallo'), icon: '💎', rarity: 3, lore: t('Dentro, vedi la valle come era.') },
  { id: 'drago', name: t('Drago dello Stagno'), icon: '🐉', rarity: 3, night: true, lore: t('La memoria più antica di Krak.') },
];

// ------------------------------------------------------------
// FRAMMENTI DI FATO (vincolati — GDD §J)
// ------------------------------------------------------------
export interface FragmentDef { id: string; name: string; icon: string; desc: string; constraint?: FardelloId[]; value: number; dark?: boolean }
export const FRAGMENTS: Record<string, FragmentDef> = {
  eclissi: { id: 'eclissi', name: t('Frammento di Eclissi'), icon: '🌒', desc: t('La valle entra in Eclisse per 1 ora: Risonanza +50%, nemici d\'ombra.'), constraint: ['sacrificio', 'sangue'], value: 60, dark: true },
  sussurro: { id: 'sussurro', name: t('Frammento del Sussurro'), icon: '🌬️', desc: t('Prossima spedizione: tutti gli intenti e i bugiardi rivelati.'), constraint: ['silenzio'], value: 35 },
  sangue: { id: 'sangue', name: t('Frammento di Sangue'), icon: '🩸', desc: t('Prossima spedizione: azioni di Dissonanza +50% danni.'), constraint: ['sangue'], value: 40, dark: true },
  memoria: { id: 'memoria', name: t('Frammento di Memoria'), icon: '🫧', desc: t('Prossima spedizione: un Eroe Fantasma combatte con te.'), value: 30 },
  patto: { id: 'patto', name: t('Frammento del Patto'), icon: '📜', desc: t('Si usa nei Contratti di Fato.'), value: 25 },
  fioritura: { id: 'fioritura', name: t('Frammento di Fioritura'), icon: '🌸', desc: t('Prosperità della valle +30.'), constraint: ['sacrificio', 'silenzio'], value: 45 },
  cenere: { id: 'cenere', name: t('Frammento di Cenere'), icon: '🌋', desc: t('Corruzione della valle +30: nemici più forti, bottino più ricco.'), constraint: ['sangue'], value: 30, dark: true },
  voce: { id: 'voce', name: t('Voce dei Sopravvissuti'), icon: '🎶', desc: t('Prossima spedizione: risorgi una volta.'), value: 70 },
  spezzato: { id: 'spezzato', name: t('Frammento del Patto Spezzato'), icon: '💔', desc: t('+3 Punti Talento. Lasciato dall\'Ombra del Fardello.'), value: 90 },
  corrotto: { id: 'corrotto', name: t('Frammento Corrotto'), icon: '🦠', desc: t('Effetto oscuro casuale. Nato da un contratto fallito o da un sogno.'), value: 10, dark: true },
  purezza: { id: 'purezza', name: t('Frammento di Purezza'), icon: '🤍', desc: t('Corruzione personale −40, Dissonanza −5.'), value: 50 },
};

// ------------------------------------------------------------
// STATO DELLA VALLE (organismo — GDD §I)
// ------------------------------------------------------------
export const VALLEY_EFFECTS: Record<ValleyState, { icon: string; desc: string; prod: number; enemy: number; loot: number; resonance: number; color: string }> = {
  Fioritura: { icon: '🌸', desc: t('La valle respira. Produzione +25%, prezzi −10%.'), prod: 0.25, enemy: 0, loot: 0, resonance: 0, color: 'text-pink-300' },
  Quiete: { icon: '🌫️', desc: t('Un silenzio incerto.'), prod: 0, enemy: 0, loot: 0, resonance: 0, color: 'text-slate-300' },
  Tensione: { icon: '⚡', desc: t('Le fazioni si guardano in cagnesco. Reputazione ×1.5, più incursioni.'), prod: 0, enemy: 0.05, loot: 0.05, resonance: 0, color: 'text-yellow-300' },
  Corruzione: { icon: '🦠', desc: t('Nemici +15%, bottino +20%.'), prod: -0.1, enemy: 0.15, loot: 0.2, resonance: 0, color: 'text-fuchsia-400' },
  Cenere: { icon: '🌋', desc: t('La valle brucia. Produzione −25%, nemici +30%, bottino +40%.'), prod: -0.25, enemy: 0.3, loot: 0.4, resonance: 0.1, color: 'text-orange-400' },
  Eclisse: { icon: '🌒', desc: t('Notte innaturale. Risonanza +50%, nemici d\'ombra.'), prod: -0.1, enemy: 0.1, loot: 0.15, resonance: 0.5, color: 'text-indigo-300' },
  Rinascita: { icon: '🌅', desc: t('Dopo la fine, un inizio. Produzione +50%, XP +25%.'), prod: 0.5, enemy: -0.1, loot: 0.1, resonance: 0.1, color: 'text-amber-200' },
};

// ------------------------------------------------------------
// COSTELLAZIONI — Bussola del Fato (GDD §9)
// ------------------------------------------------------------
export interface StarDef { id: string; cons: string; name: string; flag?: string; text: string; reward: { res?: Partial<Resources>; reliquie?: number; flag?: string; fragment?: string } }
export const CONSTELLATIONS: Record<string, { name: string; icon: string; bonus: string; mods: Record<string, number>; x: number; y: number }> = {
  culto: { name: t('Via del Culto'), icon: '🕯️', bonus: t('+10% rubavita in spedizione'), mods: { lifesteal: 10 }, x: 18, y: 25 },
  rivolta: { name: t('Via della Rivolta'), icon: '📜', bonus: t('+15% danni critici'), mods: { critDmg: 15 }, x: 50, y: 14 },
  salvati: { name: t('Via dei Salvati'), icon: '🕊️', bonus: t('+20% cure'), mods: { heal: 0.2 }, x: 82, y: 25 },
  ceneri: { name: t('Via delle Ceneri'), icon: '🌋', bonus: t('+20% bottino'), mods: { loot: 0.2 }, x: 18, y: 72 },
  silenzio: { name: t('Via del Silenzio'), icon: '🤫', bonus: t('+8% schivata'), mods: { dodge: 8 }, x: 50, y: 84 },
  sangue_nero: { name: t('Via del Sangue Nero'), icon: '🖤', bonus: t('+15% attacco'), mods: { atkPct: 0.15 }, x: 82, y: 72 },
};
export const STARS: StarDef[] = [
  { id: 'cu_a', cons: 'culto', name: t('Il Primo Voto'), flag: 'f_sangue', text: t('Hai dato un innocente al Culto. La stella brilla rossa.'), reward: { res: { cenere: 100 } } },
  { id: 'cu_b', cons: 'culto', name: t('Fratello di Fonte'), flag: 'drank_fountain', text: t('Hai bevuto alla Fonte.'), reward: { reliquie: 1 } },
  { id: 'cu_c', cons: 'culto', name: t('L\'Altare Nascosto'), text: t('Lettura: un altare del Culto nella palude custodisce ferro antico.'), reward: { res: { ferro: 120 } } },
  { id: 'cu_d', cons: 'culto', name: t('La Madre'), flag: 'boss_madre_vhalzareth', text: t('Hai affrontato la Madre di Vhalzareth.'), reward: { reliquie: 2 } },
  { id: 'cu_e', cons: 'culto', name: t('Parola del Culto'), text: t('Lettura: il Culto ha una parola segreta. Ora la conosci.'), reward: { flag: 'know_word' } },
  { id: 'ri_a', cons: 'rivolta', name: t('Il Dubbio'), flag: 'helped_heretics', text: t('Hai aiutato gli Eretici.'), reward: { res: { cenere: 120 } } },
  { id: 'ri_b', cons: 'rivolta', name: t('La Torcia'), flag: 'burned_edict', text: t('Hai bruciato un editto della Capitale.'), reward: { reliquie: 1 } },
  { id: 'ri_c', cons: 'rivolta', name: t('Il Sabotatore'), text: t('Lettura: un PNG nascosto vende segreti alla Bottega.'), reward: { res: { intuizione: 3 } } },
  { id: 'ri_d', cons: 'rivolta', name: t('Il Mercato Nero'), text: t('Lettura: le Ombre del Mercato ti offrono un frammento.'), reward: { fragment: 'patto' } },
  { id: 'ri_e', cons: 'rivolta', name: t('Il Processo'), flag: 'trial_done', text: t('Sei stato processato dalle tue Echi.'), reward: { reliquie: 2 } },
  { id: 'sa_a', cons: 'salvati', name: t('Il Bambino'), flag: 'f_any', text: t('Un bambino vive grazie (o nonostante) te.'), reward: { res: { provviste: 5 } } },
  { id: 'sa_b', cons: 'salvati', name: t('La Promessa Mantenuta'), flag: 'promise_kept', text: t('Hai mantenuto una promessa.'), reward: { reliquie: 1 } },
  { id: 'sa_c', cons: 'salvati', name: t('Il Profugo Liberato'), flag: 'freed_ilyas', text: t('Hai liberato Ilyas.'), reward: { reliquie: 2 } },
  { id: 'sa_d', cons: 'salvati', name: t('La Fonte di Elara'), text: t('Lettura: Elara conosce un infuso che cura i pegni.'), reward: { flag: 'elara_cure' } },
  { id: 'sa_e', cons: 'salvati', name: t('Le Voci Liberate'), flag: 'freed_voices', text: t('Hai liberato il Coro.'), reward: { fragment: 'voce' } },
  { id: 'ce_a', cons: 'ceneri', name: t('Il Primo Piano'), flag: 'delve_1', text: t('Sei sceso nel Cimitero.'), reward: { res: { cenere: 50 } } },
  { id: 'ce_b', cons: 'ceneri', name: t('Il Coro'), flag: 'boss_coro', text: t('Hai sconfitto il Coro dei Salvati Non Uccisi.'), reward: { reliquie: 1 } },
  { id: 'ce_c', cons: 'ceneri', name: t('La Vena di Cenere'), text: t('Lettura: sotto la Cava scorre una vena di cenere pura.'), reward: { res: { cenere: 300 } } },
  { id: 'ce_d', cons: 'ceneri', name: t('La Minaccia'), text: t('Lettura: un\'incursione si prepara. Le torri sono pronte.'), reward: { res: { pietra: 150 } } },
  { id: 'ce_e', cons: 'ceneri', name: t('Il Cuore'), flag: 'boss_cuore_krak', text: t('Hai udito il Cuore di Krak.'), reward: { reliquie: 3 } },
  { id: 'si_a', cons: 'silenzio', name: t('Il Testimone'), flag: 'f_silenzio', text: t('Hai scelto di guardare.'), reward: { res: { intuizione: 2 } } },
  { id: 'si_b', cons: 'silenzio', name: t('Il Padre'), flag: 'father_echo', text: t('Hai parlato al fantasma di tuo padre.'), reward: { reliquie: 1 } },
  { id: 'si_c', cons: 'silenzio', name: t('La Memoria del Mondo'), text: t('Lettura: la valle ricorda un sentiero segreto nel Cimitero.'), reward: { flag: 'secret_path' } },
  { id: 'si_d', cons: 'silenzio', name: t('Il Campanaro'), flag: 'boss_campanaro', text: t('Il Campanaro tace per sempre.'), reward: { reliquie: 2 } },
  { id: 'si_e', cons: 'silenzio', name: t('Il Nome'), flag: 'name_spoken', text: t('Hai pronunciato il tuo nome all\'Altare.'), reward: { res: { intuizione: 3 } } },
  { id: 'sn_a', cons: 'sangue_nero', name: t('Il Tradimento'), flag: 'betrayed', text: t('Hai usato un compagno come scudo.'), reward: { res: { ferro: 60 } } },
  { id: 'sn_b', cons: 'sangue_nero', name: t('Il Patto Oscuro'), flag: 'dark_pact', text: t('Hai stretto un Patto Oscuro.'), reward: { res: { cenere: 150 } } },
  { id: 'sn_c', cons: 'sangue_nero', name: t('L\'Ombra'), flag: 'shadow_met', text: t('Hai affrontato l\'Ombra del tuo Fardello.'), reward: { reliquie: 2 } },
  { id: 'sn_d', cons: 'sangue_nero', name: t('L\'Aberrazione'), flag: 'aberration', text: t('Il tuo corpo è cambiato.'), reward: { reliquie: 1 } },
  { id: 'sn_e', cons: 'sangue_nero', name: t('La Promessa Infranta'), flag: 'promise_broken', text: t('Hai infranto una promessa.'), reward: { res: { cenere: 100 } } },
];

// ------------------------------------------------------------
// GIORNALIERE, IMPRESE
// ------------------------------------------------------------
export const DAILY_POOL: { id: string; text: (n: number) => string; stat: string; base: number }[] = [
  { id: 'd_floors', text: n => t('Scendi {n} piani nei dungeon', { n }), stat: 'floors', base: 6 },
  { id: 'd_kills', text: n => t('Sconfiggi {n} nemici', { n }), stat: 'kills', base: 10 },
  { id: 'd_clicks', text: n => t('Raccogli a mano {n} volte', { n }), stat: 'clicks', base: 60 },
  { id: 'd_build', text: n => t('Costruisci {n} edifici', { n }), stat: 'built', base: 8 },
  { id: 'd_fish', text: n => t('Pesca {n} memorie nello Stagno', { n }), stat: 'fished', base: 3 },
  { id: 'd_forge', text: n => t('Forgia {n} oggetti', { n }), stat: 'forged', base: 2 },
  { id: 'd_cart', text: n => t('Accogli {n} mercanti o cervi', { n }), stat: 'carts', base: 2 },
  { id: 'd_req', text: n => t('Completa {n} richieste delle fazioni', { n }), stat: 'requests', base: 2 },
  { id: 'd_exp', text: n => t('Completa {n} spedizioni dei compagni', { n }), stat: 'expeditions', base: 2 },
  { id: 'd_cenere', text: n => t('Guadagna {n} Cenere', { n }), stat: 'cenereEarned', base: 1500 },
  { id: 'd_delves', text: n => t('Torna vivo da {n} discese', { n }), stat: 'delves', base: 2 },
  { id: 'd_bosses', text: n => t('Abbatti {n} boss nei dungeon', { n }), stat: 'bosses', base: 1 },
  { id: 'd_echo', text: n => t('Scatena {n} Eco', { n }), stat: 'echoes', base: 2 },
  { id: 'd_coherent', text: n => t('Agisci {n} volte secondo il tuo Fardello', { n }), stat: 'coherent', base: 10 },
  { id: 'd_colosso', text: n => t('Infliggi {n} danni al Colosso di Cenere', { n }), stat: 'worldBossDmg', base: 1500 },
];

export type MissionPeriod = 'daily' | 'weekly' | 'monthly';
export const MISSION_PERIODS: Record<MissionPeriod, { count: number; mult: number; prefix: string }> = {
  daily: { count: 5, mult: 1, prefix: 'dbase_' },
  weekly: { count: 4, mult: 6, prefix: 'wbase_' },
  monthly: { count: 3, mult: 22, prefix: 'mbase_' },
};

export interface AchievementDef { id: string; name: string; desc: string; stat?: string; need?: number; flag?: string }
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'a_first', name: t('Il Primo Fardello'), desc: t('Scegli un Fardello.'), flag: 'f_any' },
  { id: 'a_floor10', name: t('Dieci Piani Sotto'), desc: t('Scendi 10 piani in totale.'), stat: 'floors', need: 10 },
  { id: 'a_floor100', name: t('Il Fondo Non Esiste'), desc: t('Scendi 100 piani in totale.'), stat: 'floors', need: 100 },
  { id: 'a_kill50', name: t('Cinquanta Echi'), desc: t('Sconfiggi 50 nemici.'), stat: 'kills', need: 50 },
  { id: 'a_kill500', name: t('Mietitore'), desc: t('Sconfiggi 500 nemici.'), stat: 'kills', need: 500 },
  { id: 'a_boss1', name: t('Coro Zittito'), desc: t('Sconfiggi il Coro dei Salvati Non Uccisi.'), flag: 'boss_coro' },
  { id: 'a_boss2', name: t('Figlio della Fonte'), desc: t('Sconfiggi la Madre di Vhalzareth.'), flag: 'boss_madre_vhalzareth' },
  { id: 'a_boss3', name: t('Il Cuore Si Ferma'), desc: t('Sconfiggi il Cuore di Krak.'), flag: 'boss_cuore_krak' },
  { id: 'a_build25', name: t('Hondovalle Rinasce'), desc: t('Costruisci 25 edifici.'), stat: 'built', need: 25 },
  { id: 'a_build150', name: t('Capitale della Valle'), desc: t('Costruisci 150 edifici.'), stat: 'built', need: 150 },
  { id: 'a_click500', name: t('Mani Callose'), desc: t('Raccogli a mano 500 volte.'), stat: 'clicks', need: 500 },
  { id: 'a_cenere10k', name: t('Re della Cenere'), desc: t('Guadagna 10.000 Cenere.'), stat: 'cenereEarned', need: 10000 },
  { id: 'a_cenere1m', name: t('Mercante del Destino'), desc: t('Guadagna 1.000.000 Cenere.'), stat: 'cenereEarned', need: 1000000 },
  { id: 'a_promise', name: t('Di Parola'), desc: t('Mantieni una promessa.'), flag: 'promise_kept' },
  { id: 'a_broken', name: t('Spergiuro'), desc: t('Infrangi una promessa.'), flag: 'promise_broken' },
  { id: 'a_shadow', name: t('Faccia a Faccia'), desc: t('Sconfiggi l\'Ombra del tuo Fardello.'), flag: 'shadow_defeated' },
  { id: 'a_ascend', name: t('Oltre il Limite'), desc: t('Compi l\'Ascensione del Fardello.'), flag: 'ascended' },
  { id: 'a_fish5', name: t('Pescatore di Memorie'), desc: t('Pesca 5 specie diverse.'), stat: 'species', need: 5 },
  { id: 'a_fishall', name: t('La Valle Ricordata'), desc: t('Pesca tutte le specie.'), stat: 'species', need: 11 },
  { id: 'a_forge10', name: t('Fabbro dei Fardelli'), desc: t('Forgia 10 oggetti.'), stat: 'forged', need: 10 },
  { id: 'a_legend', name: t('Leggendario'), desc: t('Trova un oggetto leggendario o superiore.'), flag: 'legendary' },
  { id: 'a_market', name: t('Anima in Vendita'), desc: t('Completa 10 scambi al Mercato delle Anime.'), stat: 'trades', need: 10 },
  { id: 'a_cycle', name: t('Il Ciclo Ricomincia'), desc: t('Concludi un Ciclo.'), stat: 'cycles', need: 1 },
  { id: 'a_trial', name: t('Imputato'), desc: t('Affronta il Processo alle Proprie Scelte.'), flag: 'trial_done' },
  { id: 'a_abyss10', name: t('L\'Abisso Guarda'), desc: t('Raggiungi il piano 10 dell\'Abisso.'), stat: 'abyssBest', need: 10 },
  { id: 'a_worldboss', name: t('Contro il Colosso'), desc: t('Infliggi 10.000 danni al Colosso di Cenere.'), stat: 'worldBossDmg', need: 10000 },
  { id: 'a_stars', name: t('Lettore di Stelle'), desc: t('Accendi 15 stelle.'), stat: 'starsLit', need: 15 },
  { id: 'a_threat', name: t('Sentinella'), desc: t('Respingi 10 incursioni.'), stat: 'threats', need: 10 },
];

// ------------------------------------------------------------
// OGGETTI
// ------------------------------------------------------------
export const RARITY_NAMES = [t('Comune'), t('Raro'), t('Epico'), t('Leggendario'), t('Mitico'), t('Ancestrale')];
export const RARITY_COLORS = ['text-stone-300', 'text-sky-300', 'text-fuchsia-300', 'text-amber-300', 'text-red-400', 'text-teal-200'];
export const RARITY_BORDERS = ['border-stone-600', 'border-sky-500', 'border-fuchsia-500', 'border-amber-400', 'border-red-500', 'border-teal-300'];
export const RARITY_MULT = [1, 1.3, 1.7, 2.2, 3, 4];
export const SLOT_INFO: Record<Slot, { name: string; icon: string; bases: string[] }> = {
  arma: { name: t('Arma'), icon: '⚔️', bases: [t('Spada'), t('Ascia'), t('Falcetto'), t('Mazza'), t('Lancia'), t('Bastone')] },
  scudo: { name: t('Mano secondaria'), icon: '🛡️', bases: [t('Scudo'), t('Pugnale da parata'), t('Lanterna'), t('Scrigno')] },
  elmo: { name: t('Elmo'), icon: '⛑️', bases: [t('Elmo'), t('Cappuccio'), t('Corona di rovi'), t('Maschera')] },
  corazza: { name: t('Corazza'), icon: '🥋', bases: [t('Corazza'), t('Mantello'), t('Cotta'), t('Sudario')] },
  stivali: { name: t('Stivali'), icon: '🥾', bases: [t('Stivali'), t('Calzari'), t('Schinieri')] },
  amuleto: { name: t('Amuleto'), icon: '📿', bases: [t('Amuleto'), t('Talismano'), t('Ciondolo'), t('Medaglione')] },
  anello: { name: t('Anello'), icon: '💍', bases: [t('Anello'), t('Sigillo'), t('Cerchio')] },
};
export const SLOTS: Slot[] = ['arma', 'scudo', 'elmo', 'corazza', 'stivali', 'amuleto', 'anello'];
export const AFFIXES: { name: string; stat: string }[] = [
  { name: t('Vampirico'), stat: 'lifesteal' }, { name: t('Focalizzato'), stat: 'crit' }, { name: t('Saldo'), stat: 'def' },
  { name: t('Titanico'), stat: 'maxHp' }, { name: t('Spietato'), stat: 'critDmg' }, { name: t('Sepolto'), stat: 'atk' },
  { name: t('Sfuggente'), stat: 'dodge' }, { name: t('Spinato'), stat: 'thorns' }, { name: t('Lesto'), stat: 'speed' },
];
export const ORIGINS = [
  t('Strappato a un portatore caduto nel Cimitero.'), t('Forgiato con la cenere di Hondovalle Alta.'), t('Trovato nella bocca di un annegato.'),
  t('Barattato da un\'Ombra del Mercato per un ricordo.'), t('Benedetto da Elara, maledetto dal Culto.'), t('Appartenuto a un Guardiano della Valle.'),
  t('Inciso con un nome che nessuno ricorda.'), t('Caldo come se qualcuno l\'avesse appena lasciato.'), t('Sussurra quando lo impugni.'),
  t('Pagato con una promessa infranta.'), t('Emerso dallo Stagno delle Voci.'), t('Lasciato da un Eco di un altro portatore.'),
];

// ------------------------------------------------------------
// FINALI (GDD §26)
// ------------------------------------------------------------
export const ENDINGS: Record<string, { name: string; icon: string; text: string; legacy: 'ally' | 'enemy' | 'merchant' | 'corpse' }> = {
  brucia: { name: t('La Valle Brucia Con Te'), icon: '🔥', text: t('Hai portato il fuoco fino al Cuore di Krak, e il Cuore ti ha riconosciuto come suo. La valle brucia. Tu bruci con lei, e per la prima volta il dolore ha un senso.'), legacy: 'enemy' },
  martire: { name: t('Il Martire Che Non Viene Ricordato'), icon: '🕯️', text: t('Hai dato tutto. La valle vive. Nessuno canta il tuo nome, perché nessuno sa cosa hai fatto. Solo Kael, la notte, a volte lo sussurra.'), legacy: 'ally' },
  dio: { name: t('Il Dio Silenzioso'), icon: '🌑', text: t('Hai visto tutto e non hai detto nulla. Ora la valle ti prega senza sapere il tuo nome. Rispondi con il silenzio, come sempre.'), legacy: 'corpse' },
  aberrazione: { name: t("L'Aberrazione Redenta"), icon: '🦷', text: t('Il tuo corpo è un mostro. Le tue promesse no. I bambini hanno paura di te, ma vivono.'), legacy: 'ally' },
  mercante: { name: t('Il Mercante del Destino'), icon: '🎭', text: t('Hai comprato e venduto destini finché il tuo non è diventato la moneta più preziosa della valle.'), legacy: 'merchant' },
  comunita: { name: t('La Comunità dei Frammenti'), icon: '🌸', text: t('Hai sparso i Frammenti di Fato come semi. La valle condivisa fiorisce, un portatore alla volta.'), legacy: 'ally' },
  spezzato: { name: t('Il Ciclo Spezzato'), icon: '♾️', text: t('Hai processato te stesso e hai scelto di non ripeterti. Il Cuore di Krak smette di battere al ritmo dei fardelli.'), legacy: 'merchant' },
  cancellato: { name: t('Il Nome Cancellato'), icon: '✖️', text: t('Alla fine, nessuno ricorda come ti chiamavi. Nemmeno tu.'), legacy: 'enemy' },
};

export const BOT_NAMES = ['Aldra', 'Corvino', 'Settimia', 'Bruno di Fossa', 'Iselda', 'Ombretta', 'Fra\' Malachia', 'Teodolinda', 'Ruggero il Muto', 'Nives', 'Ottone', 'Galatea', 'Brizio', 'Ermengarda', 'Lucio Spento', 'Verena'];
