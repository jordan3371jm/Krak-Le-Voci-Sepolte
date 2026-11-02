import type { FardelloId, ResKey, Resources, Slot, ValleyState } from '../types';

export const RES_INFO: Record<ResKey | 'reliquie', { name: string; icon: string; color: string }> = {
  cenere: { name: 'Cenere', icon: '⚱️', color: 'text-amber-300' },
  provviste: { name: 'Provviste', icon: '🍞', color: 'text-lime-300' },
  legno: { name: 'Legno', icon: '🪵', color: 'text-orange-300' },
  pietra: { name: 'Pietra', icon: '🪨', color: 'text-slate-300' },
  ferro: { name: 'Ferro', icon: '⛓️', color: 'text-sky-300' },
  intuizione: { name: 'Intuizione', icon: '🔮', color: 'text-violet-300' },
  reliquie: { name: 'Reliquie', icon: '🏺', color: 'text-yellow-200' },
};

// ------------------------------------------------------------
// VILLAGGIO — idle (ispirato a Hondovalle)
// ------------------------------------------------------------
export interface BuildingDef { id: string; name: string; icon: string; desc: string; cost: Partial<Resources>; prod: Partial<Resources>; max?: number; unlock?: { building: string; count: number } }
export const BUILDINGS: BuildingDef[] = [
  { id: 'segheria', name: 'Segheria', icon: '🪓', desc: 'Produce legno.', cost: { cenere: 12 }, prod: { legno: 0.3 } },
  { id: 'capanna', name: 'Capanna dei Raccoglitori', icon: '🛖', desc: 'Produce provviste per le spedizioni.', cost: { legno: 20 }, prod: { provviste: 0.014 } },
  { id: 'bottega', name: 'Bottega delle Gilde', icon: '🏪', desc: 'Produce cenere.', cost: { legno: 25, pietra: 5 }, prod: { cenere: 0.35 }, unlock: { building: 'segheria', count: 1 } },
  { id: 'cava', name: 'Cava di Pietra', icon: '⛏️', desc: 'Produce pietra.', cost: { legno: 35 }, prod: { pietra: 0.18 }, unlock: { building: 'segheria', count: 2 } },
  { id: 'fucina', name: 'Fucina', icon: '🔥', desc: 'Produce ferro.', cost: { pietra: 45, legno: 25 }, prod: { ferro: 0.09 }, unlock: { building: 'cava', count: 2 } },
  { id: 'altare', name: 'Altare della Veglia', icon: '🕯️', desc: 'Genera Intuizione e ne alza il limite.', cost: { pietra: 70, cenere: 60 }, prod: { intuizione: 0.004 }, max: 15, unlock: { building: 'cava', count: 3 } },
  { id: 'infermeria', name: 'Infermeria di Elara', icon: '🏥', desc: 'Rigenera il gruppo più in fretta. Permette di preparare pozioni.', cost: { legno: 60, pietra: 50 }, prod: {}, max: 10, unlock: { building: 'capanna', count: 2 } },
  { id: 'locanda', name: 'Locanda dei Viandanti', icon: '🍺', desc: 'Ogni livello: +1 compagno in spedizione contemporanea.', cost: { legno: 90, cenere: 90 }, prod: {}, max: 4, unlock: { building: 'bottega', count: 3 } },
  { id: 'torre', name: 'Torre di Guardia', icon: '🗼', desc: 'Respinge le incursioni da sola e potenzia i tuoi colpi.', cost: { pietra: 90, ferro: 25 }, prod: {}, max: 20, unlock: { building: 'fucina', count: 1 } },
];
export const UPGRADE_THRESHOLDS = [10, 25, 50, 100];

// Spedizioni dei compagni in tempo reale (proseguono offline)
export interface ExpeditionDef { id: string; name: string; icon: string; minutes: number; minLevel: number; rewards: Partial<Resources> & { reliquie?: number; itemChance?: number; fragmentChance?: number }; desc: string }
export const EXPEDITIONS: ExpeditionDef[] = [
  { id: 'boschi', name: 'Boschi Bruciati', icon: '🌲', minutes: 5, minLevel: 1, rewards: { legno: 60, provviste: 3 }, desc: 'Legna e radici tra la cenere.' },
  { id: 'rovine', name: 'Rovine di Hondovalle Alta', icon: '🏚️', minutes: 20, minLevel: 1, rewards: { pietra: 90, cenere: 60, itemChance: 0.3 }, desc: 'Ciò che resta del villaggio di sopra.' },
  { id: 'miniere', name: 'Miniere del Nord', icon: '⛰️', minutes: 60, minLevel: 3, rewards: { ferro: 80, pietra: 120, itemChance: 0.5 }, desc: 'Ferro e voci nelle gallerie.' },
  { id: 'carovana', name: 'Carovana per la Capitale', icon: '🐫', minutes: 120, minLevel: 4, rewards: { cenere: 400, provviste: 12, reliquie: 1, fragmentChance: 0.25 }, desc: 'Commercio, rischi e notizie.' },
  { id: 'santuari', name: 'Santuari Dimenticati', icon: '⛩️', minutes: 360, minLevel: 6, rewards: { intuizione: 4, reliquie: 2, itemChance: 1, fragmentChance: 0.6 }, desc: 'Pellegrinaggio lungo, ricompense rare.' },
  { id: 'oltre', name: 'Oltre il Portale', icon: '🌀', minutes: 720, minLevel: 10, rewards: { cenere: 1500, ferro: 300, reliquie: 4, itemChance: 1, fragmentChance: 1 }, desc: 'Dove è rimasto Tomas. Pochi tornano uguali.' },
];

// Santuario delle Reliquie — permanenti tra i Cicli
export interface SanctuaryDef { id: string; name: string; icon: string; desc: string; per: number; max: number }
export const SANCTUARY: SanctuaryDef[] = [
  { id: 'raccolto', name: 'Raccolto Eterno', icon: '🌾', desc: 'Provviste e legno', per: 10, max: 20 },
  { id: 'saggi', name: 'Concilio dei Saggi', icon: '📚', desc: 'Tutta la produzione', per: 5, max: 30 },
  { id: 'scalpellini', name: 'Scalpellini Sacri', icon: '🪨', desc: 'Pietra e ferro', per: 10, max: 20 },
  { id: 'forziere', name: 'Forziere della Valle', icon: '⚱️', desc: 'Cenere', per: 10, max: 20 },
  { id: 'sentieri', name: 'Sentieri Segreti', icon: '🧭', desc: 'Durata spedizioni (−%)', per: 4, max: 10 },
  { id: 'memoria', name: 'Memoria della Valle', icon: '🌙', desc: 'Ore offline conteggiate (+1h)', per: 1, max: 16 },
  { id: 'pozzo', name: 'Pozzo di Lucidità', icon: '🔮', desc: 'Intuizione', per: 15, max: 10 },
  { id: 'sentinelle', name: 'Sentinelle', icon: '🗡️', desc: 'Danni alle incursioni', per: 25, max: 10 },
  { id: 'bottino', name: 'Bottino degli Echi', icon: '💰', desc: 'Bottino nei dungeon', per: 6, max: 20 },
  { id: 'sangue_antico', name: 'Sangue Antico', icon: '🩸', desc: 'Statistiche dell\'eroe', per: 3, max: 20 },
];

// Carte del Destino — una per Ciclo, cambia le regole (Hondovalle "Choose your fate")
export interface FateCardDef { id: string; name: string; icon: string; good: string; bad: string; mods: Record<string, number> }
export const FATE_CARDS: FateCardDef[] = [
  { id: 'vena', name: 'Vena Profonda', icon: '⛏️', good: 'Pietra e ferro +60%', bad: 'Provviste −20%', mods: { pietra: 0.6, ferro: 0.6, provviste: -0.2 } },
  { id: 'febbre', name: 'Febbre della Cenere', icon: '⚱️', good: 'Cenere +50%', bad: 'Legno −20%', mods: { cenere: 0.5, legno: -0.2 } },
  { id: 'bosco', name: 'Bosco Generoso', icon: '🌲', good: 'Legno +60%, provviste +20%', bad: 'Pietra −20%', mods: { legno: 0.6, provviste: 0.2, pietra: -0.2 } },
  { id: 'mani', name: 'Mani di Ferro', icon: '✊', good: 'Raccolta manuale ×3', bad: 'Produzione −10%', mods: { click: 2, all: -0.1 } },
  { id: 'luna', name: 'Luna d\'Argento', icon: '🌙', good: 'Intuizione +80%', bad: 'Provviste −10%', mods: { intuizione: 0.8, provviste: -0.1 } },
  { id: 'mostri', name: 'Terra di Mostri', icon: '👹', good: 'Bottino dei dungeon +50%', bad: 'Incursioni il doppio più frequenti', mods: { loot: 0.5, threats: 1 } },
  { id: 'avventura', name: 'Spirito Avventuroso', icon: '🧭', good: 'Spedizioni −30% tempo, XP compagni +50%', bad: 'Produzione −10%', mods: { exped: 0.3, all: -0.1 } },
  { id: 'gilda', name: 'Gilda dei Costruttori', icon: '🏗️', good: 'Edifici −20% costo', bad: 'Cenere −20%', mods: { build: 0.2, cenere: -0.2 } },
  { id: 'eco', name: 'Scommessa dell\'Eco', icon: '🎲', good: '+30% Memorie alla fine del Ciclo', bad: 'Produzione −15%', mods: { memorie: 0.3, all: -0.15 } },
  { id: 'martirio', name: 'Martirio', icon: '🕯️', good: 'Risonanza +40%', bad: 'Salute massima −10%', mods: { resonance: 0.4, hp: -0.1 } },
];

// Stagno delle Voci — pesca di memorie (Hondovalle "Pond Fishing")
export interface FishDef { id: string; name: string; icon: string; rarity: 0 | 1 | 2 | 3; night?: boolean; day?: boolean; lore: string }
export const FISH: FishDef[] = [
  { id: 'trota', name: 'Trota della Ninna Nanna', icon: '🐟', rarity: 0, lore: 'Canticchia una melodia che tua madre conosceva.' },
  { id: 'carpa', name: 'Carpa del Mulino', icon: '🐠', rarity: 0, lore: 'Ricorda il rumore delle macine.' },
  { id: 'perca', name: 'Perca Striata', icon: '🐡', rarity: 0, lore: 'Una memoria di estate, prima della cenere.' },
  { id: 'stivale', name: 'Vecchio Stivale', icon: '🥾', rarity: 0, lore: 'Almeno è della tua misura.' },
  { id: 'anguilla', name: 'Anguilla del Rimorso', icon: '🐍', rarity: 1, night: true, lore: 'Scivola via ogni volta che provi a ricordare.' },
  { id: 'salmone', name: 'Salmone d\'Argento', icon: '🐟', rarity: 1, lore: 'Risale il fiume dei ricordi.' },
  { id: 'pescesole', name: 'Pesce Sole', icon: '🌞', rarity: 1, day: true, lore: 'Una giornata in cui hai riso.' },
  { id: 'pesceluna', name: 'Pesce Luna', icon: '🌙', rarity: 2, night: true, lore: 'Una promessa fatta sottovoce.' },
  { id: 'koi', name: 'Koi Spirito', icon: '🎏', rarity: 2, lore: 'Ha gli occhi di Tomas.' },
  { id: 'cristallo', name: 'Pesce di Cristallo', icon: '💎', rarity: 3, lore: 'Dentro, vedi la valle come era.' },
  { id: 'drago', name: 'Drago dello Stagno', icon: '🐉', rarity: 3, night: true, lore: 'La memoria più antica di Krak.' },
];

// ------------------------------------------------------------
// FRAMMENTI DI FATO (vincolati — GDD §J)
// ------------------------------------------------------------
export interface FragmentDef { id: string; name: string; icon: string; desc: string; constraint?: FardelloId[]; value: number; dark?: boolean }
export const FRAGMENTS: Record<string, FragmentDef> = {
  eclissi: { id: 'eclissi', name: 'Frammento di Eclissi', icon: '🌒', desc: 'La valle entra in Eclisse per 1 ora: Risonanza +50%, nemici d\'ombra.', constraint: ['sacrificio', 'sangue'], value: 60, dark: true },
  sussurro: { id: 'sussurro', name: 'Frammento del Sussurro', icon: '🌬️', desc: 'Prossima spedizione: tutti gli intenti e i bugiardi rivelati.', constraint: ['silenzio'], value: 35 },
  sangue: { id: 'sangue', name: 'Frammento di Sangue', icon: '🩸', desc: 'Prossima spedizione: azioni di Dissonanza +50% danni.', constraint: ['sangue'], value: 40, dark: true },
  memoria: { id: 'memoria', name: 'Frammento di Memoria', icon: '🫧', desc: 'Prossima spedizione: un Eroe Fantasma combatte con te.', value: 30 },
  patto: { id: 'patto', name: 'Frammento del Patto', icon: '📜', desc: 'Si usa nei Contratti di Fato.', value: 25 },
  fioritura: { id: 'fioritura', name: 'Frammento di Fioritura', icon: '🌸', desc: 'Prosperità della valle +30.', constraint: ['sacrificio', 'silenzio'], value: 45 },
  cenere: { id: 'cenere', name: 'Frammento di Cenere', icon: '🌋', desc: 'Corruzione della valle +30: nemici più forti, bottino più ricco.', constraint: ['sangue'], value: 30, dark: true },
  voce: { id: 'voce', name: 'Voce dei Sopravvissuti', icon: '🎶', desc: 'Prossima spedizione: risorgi una volta.', value: 70 },
  spezzato: { id: 'spezzato', name: 'Frammento del Patto Spezzato', icon: '💔', desc: '+3 Punti Talento. Lasciato dall\'Ombra del Fardello.', value: 90 },
  corrotto: { id: 'corrotto', name: 'Frammento Corrotto', icon: '🦠', desc: 'Effetto oscuro casuale. Nato da un contratto fallito o da un sogno.', value: 10, dark: true },
  purezza: { id: 'purezza', name: 'Frammento di Purezza', icon: '🤍', desc: 'Corruzione personale −40, Dissonanza −5.', value: 50 },
};

// ------------------------------------------------------------
// STATO DELLA VALLE (organismo — GDD §I)
// ------------------------------------------------------------
export const VALLEY_EFFECTS: Record<ValleyState, { icon: string; desc: string; prod: number; enemy: number; loot: number; resonance: number; color: string }> = {
  Fioritura: { icon: '🌸', desc: 'La valle respira. Produzione +25%, prezzi −10%.', prod: 0.25, enemy: 0, loot: 0, resonance: 0, color: 'text-pink-300' },
  Quiete: { icon: '🌫️', desc: 'Un silenzio incerto.', prod: 0, enemy: 0, loot: 0, resonance: 0, color: 'text-slate-300' },
  Tensione: { icon: '⚡', desc: 'Le fazioni si guardano in cagnesco. Reputazione ×1.5, più incursioni.', prod: 0, enemy: 0.05, loot: 0.05, resonance: 0, color: 'text-yellow-300' },
  Corruzione: { icon: '🦠', desc: 'Nemici +15%, bottino +20%.', prod: -0.1, enemy: 0.15, loot: 0.2, resonance: 0, color: 'text-fuchsia-400' },
  Cenere: { icon: '🌋', desc: 'La valle brucia. Produzione −25%, nemici +30%, bottino +40%.', prod: -0.25, enemy: 0.3, loot: 0.4, resonance: 0.1, color: 'text-orange-400' },
  Eclisse: { icon: '🌒', desc: 'Notte innaturale. Risonanza +50%, nemici d\'ombra.', prod: -0.1, enemy: 0.1, loot: 0.15, resonance: 0.5, color: 'text-indigo-300' },
  Rinascita: { icon: '🌅', desc: 'Dopo la fine, un inizio. Produzione +50%, XP +25%.', prod: 0.5, enemy: -0.1, loot: 0.1, resonance: 0.1, color: 'text-amber-200' },
};

// ------------------------------------------------------------
// COSTELLAZIONI — Bussola del Fato (GDD §9)
// ------------------------------------------------------------
export interface StarDef { id: string; cons: string; name: string; flag?: string; text: string; reward: { res?: Partial<Resources>; reliquie?: number; flag?: string; fragment?: string } }
export const CONSTELLATIONS: Record<string, { name: string; icon: string; bonus: string; mods: Record<string, number>; x: number; y: number }> = {
  culto: { name: 'Via del Culto', icon: '🕯️', bonus: '+10% rubavita in spedizione', mods: { lifesteal: 10 }, x: 18, y: 25 },
  rivolta: { name: 'Via della Rivolta', icon: '📜', bonus: '+15% danni critici', mods: { critDmg: 15 }, x: 50, y: 14 },
  salvati: { name: 'Via dei Salvati', icon: '🕊️', bonus: '+20% cure', mods: { heal: 0.2 }, x: 82, y: 25 },
  ceneri: { name: 'Via delle Ceneri', icon: '🌋', bonus: '+20% bottino', mods: { loot: 0.2 }, x: 18, y: 72 },
  silenzio: { name: 'Via del Silenzio', icon: '🤫', bonus: '+8% schivata', mods: { dodge: 8 }, x: 50, y: 84 },
  sangue_nero: { name: 'Via del Sangue Nero', icon: '🖤', bonus: '+15% attacco', mods: { atkPct: 0.15 }, x: 82, y: 72 },
};
export const STARS: StarDef[] = [
  { id: 'cu_a', cons: 'culto', name: 'Il Primo Voto', flag: 'f_sangue', text: 'Hai dato un innocente al Culto. La stella brilla rossa.', reward: { res: { cenere: 100 } } },
  { id: 'cu_b', cons: 'culto', name: 'Fratello di Fonte', flag: 'drank_fountain', text: 'Hai bevuto alla Fonte.', reward: { reliquie: 1 } },
  { id: 'cu_c', cons: 'culto', name: 'L\'Altare Nascosto', text: 'Lettura: un altare del Culto nella palude custodisce ferro antico.', reward: { res: { ferro: 120 } } },
  { id: 'cu_d', cons: 'culto', name: 'La Madre', flag: 'boss_madre_vhalzareth', text: 'Hai affrontato la Madre di Vhalzareth.', reward: { reliquie: 2 } },
  { id: 'cu_e', cons: 'culto', name: 'Parola del Culto', text: 'Lettura: il Culto ha una parola segreta. Ora la conosci.', reward: { flag: 'know_word' } },
  { id: 'ri_a', cons: 'rivolta', name: 'Il Dubbio', flag: 'helped_heretics', text: 'Hai aiutato gli Eretici.', reward: { res: { cenere: 120 } } },
  { id: 'ri_b', cons: 'rivolta', name: 'La Torcia', flag: 'burned_edict', text: 'Hai bruciato un editto della Capitale.', reward: { reliquie: 1 } },
  { id: 'ri_c', cons: 'rivolta', name: 'Il Sabotatore', text: 'Lettura: un PNG nascosto vende segreti alla Bottega.', reward: { res: { intuizione: 3 } } },
  { id: 'ri_d', cons: 'rivolta', name: 'Il Mercato Nero', text: 'Lettura: le Ombre del Mercato ti offrono un frammento.', reward: { fragment: 'patto' } },
  { id: 'ri_e', cons: 'rivolta', name: 'Il Processo', flag: 'trial_done', text: 'Sei stato processato dalle tue Echi.', reward: { reliquie: 2 } },
  { id: 'sa_a', cons: 'salvati', name: 'Il Bambino', flag: 'f_any', text: 'Un bambino vive grazie (o nonostante) te.', reward: { res: { provviste: 5 } } },
  { id: 'sa_b', cons: 'salvati', name: 'La Promessa Mantenuta', flag: 'promise_kept', text: 'Hai mantenuto una promessa.', reward: { reliquie: 1 } },
  { id: 'sa_c', cons: 'salvati', name: 'Il Profugo Liberato', flag: 'freed_ilyas', text: 'Hai liberato Ilyas.', reward: { reliquie: 2 } },
  { id: 'sa_d', cons: 'salvati', name: 'La Fonte di Elara', text: 'Lettura: Elara conosce un infuso che cura i pegni.', reward: { flag: 'elara_cure' } },
  { id: 'sa_e', cons: 'salvati', name: 'Le Voci Liberate', flag: 'freed_voices', text: 'Hai liberato il Coro.', reward: { fragment: 'voce' } },
  { id: 'ce_a', cons: 'ceneri', name: 'Il Primo Piano', flag: 'delve_1', text: 'Sei sceso nel Cimitero.', reward: { res: { cenere: 50 } } },
  { id: 'ce_b', cons: 'ceneri', name: 'Il Coro', flag: 'boss_coro', text: 'Hai sconfitto il Coro dei Salvati Non Uccisi.', reward: { reliquie: 1 } },
  { id: 'ce_c', cons: 'ceneri', name: 'La Vena di Cenere', text: 'Lettura: sotto la Cava scorre una vena di cenere pura.', reward: { res: { cenere: 300 } } },
  { id: 'ce_d', cons: 'ceneri', name: 'La Minaccia', text: 'Lettura: un\'incursione si prepara. Le torri sono pronte.', reward: { res: { pietra: 150 } } },
  { id: 'ce_e', cons: 'ceneri', name: 'Il Cuore', flag: 'boss_cuore_krak', text: 'Hai udito il Cuore di Krak.', reward: { reliquie: 3 } },
  { id: 'si_a', cons: 'silenzio', name: 'Il Testimone', flag: 'f_silenzio', text: 'Hai scelto di guardare.', reward: { res: { intuizione: 2 } } },
  { id: 'si_b', cons: 'silenzio', name: 'Il Padre', flag: 'father_echo', text: 'Hai parlato al fantasma di tuo padre.', reward: { reliquie: 1 } },
  { id: 'si_c', cons: 'silenzio', name: 'La Memoria del Mondo', text: 'Lettura: la valle ricorda un sentiero segreto nel Cimitero.', reward: { flag: 'secret_path' } },
  { id: 'si_d', cons: 'silenzio', name: 'Il Campanaro', flag: 'boss_campanaro', text: 'Il Campanaro tace per sempre.', reward: { reliquie: 2 } },
  { id: 'si_e', cons: 'silenzio', name: 'Il Nome', flag: 'name_spoken', text: 'Hai pronunciato il tuo nome all\'Altare.', reward: { res: { intuizione: 3 } } },
  { id: 'sn_a', cons: 'sangue_nero', name: 'Il Tradimento', flag: 'betrayed', text: 'Hai usato un compagno come scudo.', reward: { res: { ferro: 60 } } },
  { id: 'sn_b', cons: 'sangue_nero', name: 'Il Patto Oscuro', flag: 'dark_pact', text: 'Hai stretto un Patto Oscuro.', reward: { res: { cenere: 150 } } },
  { id: 'sn_c', cons: 'sangue_nero', name: 'L\'Ombra', flag: 'shadow_met', text: 'Hai affrontato l\'Ombra del tuo Fardello.', reward: { reliquie: 2 } },
  { id: 'sn_d', cons: 'sangue_nero', name: 'L\'Aberrazione', flag: 'aberration', text: 'Il tuo corpo è cambiato.', reward: { reliquie: 1 } },
  { id: 'sn_e', cons: 'sangue_nero', name: 'La Promessa Infranta', flag: 'promise_broken', text: 'Hai infranto una promessa.', reward: { res: { cenere: 100 } } },
];

// ------------------------------------------------------------
// GIORNALIERE, IMPRESE
// ------------------------------------------------------------
export const DAILY_POOL: { id: string; text: (n: number) => string; stat: string; base: number }[] = [
  { id: 'd_floors', text: n => `Scendi ${n} piani nei dungeon`, stat: 'floors', base: 6 },
  { id: 'd_kills', text: n => `Sconfiggi ${n} nemici`, stat: 'kills', base: 10 },
  { id: 'd_clicks', text: n => `Raccogli a mano ${n} volte`, stat: 'clicks', base: 60 },
  { id: 'd_build', text: n => `Costruisci ${n} edifici`, stat: 'built', base: 8 },
  { id: 'd_fish', text: n => `Pesca ${n} memorie nello Stagno`, stat: 'fished', base: 3 },
  { id: 'd_forge', text: n => `Forgia ${n} oggetti`, stat: 'forged', base: 2 },
  { id: 'd_cart', text: n => `Accogli ${n} mercanti o cervi`, stat: 'carts', base: 2 },
  { id: 'd_req', text: n => `Completa ${n} richieste delle fazioni`, stat: 'requests', base: 2 },
  { id: 'd_exp', text: n => `Completa ${n} spedizioni dei compagni`, stat: 'expeditions', base: 2 },
  { id: 'd_cenere', text: n => `Guadagna ${n} Cenere`, stat: 'cenereEarned', base: 1500 },
];

export interface AchievementDef { id: string; name: string; desc: string; stat?: string; need?: number; flag?: string }
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'a_first', name: 'Il Primo Fardello', desc: 'Scegli un Fardello.', flag: 'f_any' },
  { id: 'a_floor10', name: 'Dieci Piani Sotto', desc: 'Scendi 10 piani in totale.', stat: 'floors', need: 10 },
  { id: 'a_floor100', name: 'Il Fondo Non Esiste', desc: 'Scendi 100 piani in totale.', stat: 'floors', need: 100 },
  { id: 'a_kill50', name: 'Cinquanta Echi', desc: 'Sconfiggi 50 nemici.', stat: 'kills', need: 50 },
  { id: 'a_kill500', name: 'Mietitore', desc: 'Sconfiggi 500 nemici.', stat: 'kills', need: 500 },
  { id: 'a_boss1', name: 'Coro Zittito', desc: 'Sconfiggi il Coro dei Salvati Non Uccisi.', flag: 'boss_coro' },
  { id: 'a_boss2', name: 'Figlio della Fonte', desc: 'Sconfiggi la Madre di Vhalzareth.', flag: 'boss_madre_vhalzareth' },
  { id: 'a_boss3', name: 'Il Cuore Si Ferma', desc: 'Sconfiggi il Cuore di Krak.', flag: 'boss_cuore_krak' },
  { id: 'a_build25', name: 'Hondovalle Rinasce', desc: 'Costruisci 25 edifici.', stat: 'built', need: 25 },
  { id: 'a_build150', name: 'Capitale della Valle', desc: 'Costruisci 150 edifici.', stat: 'built', need: 150 },
  { id: 'a_click500', name: 'Mani Callose', desc: 'Raccogli a mano 500 volte.', stat: 'clicks', need: 500 },
  { id: 'a_cenere10k', name: 'Re della Cenere', desc: 'Guadagna 10.000 Cenere.', stat: 'cenereEarned', need: 10000 },
  { id: 'a_cenere1m', name: 'Mercante del Destino', desc: 'Guadagna 1.000.000 Cenere.', stat: 'cenereEarned', need: 1000000 },
  { id: 'a_promise', name: 'Di Parola', desc: 'Mantieni una promessa.', flag: 'promise_kept' },
  { id: 'a_broken', name: 'Spergiuro', desc: 'Infrangi una promessa.', flag: 'promise_broken' },
  { id: 'a_shadow', name: 'Faccia a Faccia', desc: 'Sconfiggi l\'Ombra del tuo Fardello.', flag: 'shadow_defeated' },
  { id: 'a_ascend', name: 'Oltre il Limite', desc: 'Compi l\'Ascensione del Fardello.', flag: 'ascended' },
  { id: 'a_fish5', name: 'Pescatore di Memorie', desc: 'Pesca 5 specie diverse.', stat: 'species', need: 5 },
  { id: 'a_fishall', name: 'La Valle Ricordata', desc: 'Pesca tutte le specie.', stat: 'species', need: 11 },
  { id: 'a_forge10', name: 'Fabbro dei Fardelli', desc: 'Forgia 10 oggetti.', stat: 'forged', need: 10 },
  { id: 'a_legend', name: 'Leggendario', desc: 'Trova un oggetto leggendario o superiore.', flag: 'legendary' },
  { id: 'a_market', name: 'Anima in Vendita', desc: 'Completa 10 scambi al Mercato delle Anime.', stat: 'trades', need: 10 },
  { id: 'a_cycle', name: 'Il Ciclo Ricomincia', desc: 'Concludi un Ciclo.', stat: 'cycles', need: 1 },
  { id: 'a_trial', name: 'Imputato', desc: 'Affronta il Processo alle Proprie Scelte.', flag: 'trial_done' },
  { id: 'a_abyss10', name: 'L\'Abisso Guarda', desc: 'Raggiungi il piano 10 dell\'Abisso.', stat: 'abyssBest', need: 10 },
  { id: 'a_worldboss', name: 'Contro il Colosso', desc: 'Infliggi 10.000 danni al Colosso di Cenere.', stat: 'worldBossDmg', need: 10000 },
  { id: 'a_stars', name: 'Lettore di Stelle', desc: 'Accendi 15 stelle.', stat: 'starsLit', need: 15 },
  { id: 'a_threat', name: 'Sentinella', desc: 'Respingi 10 incursioni.', stat: 'threats', need: 10 },
];

// ------------------------------------------------------------
// OGGETTI
// ------------------------------------------------------------
export const RARITY_NAMES = ['Comune', 'Raro', 'Epico', 'Leggendario', 'Mitico', 'Ancestrale'];
export const RARITY_COLORS = ['text-stone-300', 'text-sky-300', 'text-fuchsia-300', 'text-amber-300', 'text-red-400', 'text-teal-200'];
export const RARITY_BORDERS = ['border-stone-600', 'border-sky-500', 'border-fuchsia-500', 'border-amber-400', 'border-red-500', 'border-teal-300'];
export const RARITY_MULT = [1, 1.3, 1.7, 2.2, 3, 4];
export const SLOT_INFO: Record<Slot, { name: string; icon: string; bases: string[] }> = {
  arma: { name: 'Arma', icon: '⚔️', bases: ['Spada', 'Ascia', 'Falcetto', 'Mazza', 'Lancia', 'Bastone'] },
  scudo: { name: 'Mano secondaria', icon: '🛡️', bases: ['Scudo', 'Pugnale da parata', 'Lanterna', 'Reliquiario'] },
  elmo: { name: 'Elmo', icon: '⛑️', bases: ['Elmo', 'Cappuccio', 'Corona di spine', 'Maschera'] },
  corazza: { name: 'Corazza', icon: '🥋', bases: ['Corazza', 'Tonaca', 'Cotta', 'Sudario'] },
  stivali: { name: 'Stivali', icon: '🥾', bases: ['Stivali', 'Calzari', 'Schinieri'] },
  amuleto: { name: 'Amuleto', icon: '📿', bases: ['Amuleto', 'Rosario', 'Ciondolo', 'Medaglione'] },
  anello: { name: 'Anello', icon: '💍', bases: ['Anello', 'Sigillo', 'Fede'] },
};
export const SLOTS: Slot[] = ['arma', 'scudo', 'elmo', 'corazza', 'stivali', 'amuleto', 'anello'];
export const AFFIXES: { name: string; stat: string }[] = [
  { name: 'Vampirico', stat: 'lifesteal' }, { name: 'Focalizzato', stat: 'crit' }, { name: 'Saldo', stat: 'def' },
  { name: 'Titanico', stat: 'maxHp' }, { name: 'Spietato', stat: 'critDmg' }, { name: 'Sepolto', stat: 'atk' },
  { name: 'Sfuggente', stat: 'dodge' }, { name: 'Spinato', stat: 'thorns' }, { name: 'Lesto', stat: 'speed' },
];
export const ORIGINS = [
  'Strappato a un portatore caduto nel Cimitero.', 'Forgiato con la cenere di Hondovalle Alta.', 'Trovato nella bocca di un annegato.',
  'Barattato da un\'Ombra del Mercato per un ricordo.', 'Benedetto da Elara, maledetto dal Culto.', 'Appartenuto a un Guardiano della Valle.',
  'Inciso con un nome che nessuno ricorda.', 'Caldo come se qualcuno l\'avesse appena lasciato.', 'Sussurra quando lo impugni.',
  'Pagato con una promessa infranta.', 'Emerso dallo Stagno delle Voci.', 'Lasciato da un Eco di un altro portatore.',
];

// ------------------------------------------------------------
// FINALI (GDD §26)
// ------------------------------------------------------------
export const ENDINGS: Record<string, { name: string; icon: string; text: string; legacy: 'ally' | 'enemy' | 'merchant' | 'corpse' }> = {
  brucia: { name: 'La Valle Brucia Con Te', icon: '🔥', text: 'Hai portato il fuoco fino al Cuore di Krak, e il Cuore ti ha riconosciuto come suo. La valle brucia. Tu bruci con lei, e per la prima volta il dolore ha un senso.', legacy: 'enemy' },
  martire: { name: 'Il Martire Che Non Viene Ricordato', icon: '🕯️', text: 'Hai dato tutto. La valle vive. Nessuno canta il tuo nome, perché nessuno sa cosa hai fatto. Solo Kael, la notte, a volte lo sussurra.', legacy: 'ally' },
  dio: { name: 'Il Dio Silenzioso', icon: '🌑', text: 'Hai visto tutto e non hai detto nulla. Ora la valle ti prega senza sapere il tuo nome. Rispondi con il silenzio, come sempre.', legacy: 'corpse' },
  aberrazione: { name: "L'Aberrazione Redenta", icon: '🦷', text: 'Il tuo corpo è un mostro. Le tue promesse no. I bambini hanno paura di te, ma vivono.', legacy: 'ally' },
  mercante: { name: 'Il Mercante del Destino', icon: '🎭', text: 'Hai comprato e venduto destini finché il tuo non è diventato la moneta più preziosa della valle.', legacy: 'merchant' },
  comunita: { name: 'La Comunità dei Frammenti', icon: '🌸', text: 'Hai sparso i Frammenti di Fato come semi. La valle condivisa fiorisce, un portatore alla volta.', legacy: 'ally' },
  spezzato: { name: 'Il Ciclo Spezzato', icon: '♾️', text: 'Hai processato te stesso e hai scelto di non ripeterti. Il Cuore di Krak smette di battere al ritmo dei fardelli.', legacy: 'merchant' },
  cancellato: { name: 'Il Nome Cancellato', icon: '✖️', text: 'Alla fine, nessuno ricorda come ti chiamavi. Nemmeno tu.', legacy: 'enemy' },
};

export const BOT_NAMES = ['Aldra', 'Corvino', 'Settimia', 'Bruno di Fossa', 'Iselda', 'Ombretta', 'Fra\' Malachia', 'Teodolinda', 'Ruggero il Muto', 'Nives', 'Ottone', 'Galatea', 'Brizio', 'Ermengarda', 'Lucio Spento', 'Verena'];
