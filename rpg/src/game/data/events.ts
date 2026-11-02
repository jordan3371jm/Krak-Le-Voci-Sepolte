import type { BiomeId, FactionId, FardelloId, GameState, Loot, Nature, Resources } from '../types';

// Gli eventi non sono semplici dialoghi: sono nodi di stato (GDD §23).
export interface Effect {
  res?: Partial<Resources>;
  reliquie?: number;
  hp?: number;               // frazione degli HP massimi (negativo = danno)
  resonance?: number;
  dissonance?: number;
  corruption?: number;
  factions?: Partial<Record<FactionId, number>>;
  flags?: string[];
  promise?: string;
  xp?: number;
  item?: number;             // bonus rarità; presente = ottieni un oggetto
  fragment?: string;
  combat?: string[];
  influence?: number;
  trust?: number;
  trustOf?: string;
  aberration?: boolean;
  nature?: Nature;
  prosperity?: number;
  blight?: number;
  satchel?: Partial<Loot>;
  loseFragment?: boolean;
  companion?: string;
}

export interface EventChoice {
  text: string;
  effect: Effect;
  result: string;
  req?: { fullscreen?: boolean; flag?: string; noFlag?: string; fardello?: FardelloId; res?: Partial<Resources>; dissonance?: number; resonance?: number; aberration?: boolean; audio?: boolean; fragment?: boolean; reliquie?: number };
  reqText?: string;
}

export interface NarrEvent {
  id: string;
  title: string;
  icon: string;
  text: string;
  where: 'village' | BiomeId[] | 'any';
  cond?: (s: GameState) => boolean;
  once?: boolean;
  minFloor?: number;
  choices: EventChoice[];
}

const hasPromise = (s: GameState, id: string) => s.promises.some(p => p.defId === id && p.status === 'open');
const companionTrust = (s: GameState, id: string) => s.companions.find(c => c.id === id)?.trust ?? 100;

export const EVENTS: NarrEvent[] = [
  // ===================== DUNGEON =====================
  {
    id: 'lapidi', title: 'Le Lapidi dei Nomi', icon: '🪦', where: ['cimitero'],
    text: 'Cancelli di ferro arrugginito. Le tombe portano nomi che riconosci: sono i nomi di chi hai deluso. Uno è ancora fresco: "{name}".',
    choices: [
      { text: 'Pregare per le anime dei traditi', effect: { nature: 'faith', corruption: -6, xp: 15 }, result: 'Le tue parole echeggiano. Una luce tenue si accende sul cammino.' },
      { text: 'Calciare le lapidi per aprire un passaggio', effect: { nature: 'cruel', corruption: 10, satchel: { cenere: 40 } }, result: 'Il metallo stride. Sotto le lapidi, monete di cenere. Le ombre si agitano.' },
      { text: 'Osservare in silenzio i simboli incisi', effect: { nature: 'silent', flags: ['secret_path'], xp: 20 }, result: 'Noti un sentiero segreto tra le tombe. La valle ricorda chi osserva.' },
    ],
  },
  {
    id: 'corridoio', title: 'Il Corridoio Claustrofobico', icon: '🦴', where: ['cimitero', 'torre'],
    text: 'Le pareti si stringono. Il soffitto pulsa come un cuore malato. Trappole d\'ossa sbarrano il passo.',
    choices: [
      { text: 'Avanzare con cautela', effect: { hp: -0.1, nature: 'neutral', xp: 15 }, result: 'Una spina ti graffia. Eviti il peggio.' },
      { text: 'Spingere un compagno avanti come esca', effect: { nature: 'betray', trust: -15, flags: ['betrayed'], xp: 20 }, result: 'Il tuo compagno urla mentre le trappole lo colpiscono. Ti guarda. Non dimenticherà.' },
      { text: 'Tagliarti il palmo e offrire sangue alle pareti', effect: { hp: -0.15, nature: 'sacrifice', corruption: -8, xp: 25 }, result: 'Le pareti bevono e si ritirano. Il passaggio è tuo.' },
    ],
  },
  {
    id: 'padre', title: 'Il Ponte dei Sospiri', icon: '🌉', where: ['cimitero'], once: true, minFloor: 3,
    text: 'Un ponte su un abisso senza fondo. Figure spettrali sussurrano nomi. Una ha la voce di tuo padre: "{name}… sapevi?"',
    choices: [
      { text: 'Attraversare in silenzio', effect: { nature: 'silent', xp: 20 }, result: 'I fantasmi ti lasciano passare. Il silenzio è una forma di rispetto.' },
      { text: 'Parlare al fantasma di tuo padre', effect: { nature: 'faith', hp: -0.1, flags: ['father_echo'], promise: 'p_padre', xp: 30 }, result: 'Ti sussurra una verità dolorosa: il Cuore di Krak lo chiamava, come ora chiama te.' },
      { text: 'Distruggere i fantasmi', effect: { nature: 'cruel', corruption: 12, combat: ['spettro', 'spettro'] }, result: 'Le figure urlano e si scagliano contro di te!' },
    ],
  },
  {
    id: 'innocente', title: 'Il Disertore', icon: '🧒', where: 'any', minFloor: 2,
    text: 'Un ragazzino con la tonaca del Culto trema in un angolo. "Non volevo… mi hanno costretto." Ha le mani sporche di sangue non suo.',
    choices: [
      { text: 'Risparmiarlo e indicargli l\'uscita', effect: { nature: 'protect', factions: { contadini: 4, culto: -3 }, flags: ['spared_innocent'] }, result: 'Corre via. Un giorno, forse, qualcuno ti racconterà di lui.' },
      { text: 'Ucciderlo: il Culto non perdona e nemmeno tu', effect: { nature: 'cruel', corruption: 10, flags: ['killed_innocent'], satchel: { cenere: 30 } }, result: 'È stato rapido. La valle non lo dimenticherà.' },
      { text: 'Consegnarlo alla Capitale per la taglia', effect: { nature: 'blood', factions: { capitale: 6, eretici: -3 }, satchel: { cenere: 80 } }, result: 'Il Capitano Marcus pagherà bene. Il ragazzo non ti guarda più.' },
      { text: '[Sussurri] Ascoltare ciò che il sangue sulle sue mani racconta', req: { fullscreen: true }, reqText: 'Solo nel Rito (fullscreen)', effect: { nature: 'silent', flags: ['know_word'], resonance: 2 }, result: 'Il sangue mormora una parola: la Parola d\'Ordine del tuo Fardello. Ora la conosci.' },
    ],
  },
  {
    id: 'diario', title: 'Il Diario di un Portatore', icon: '📓', where: 'any',
    text: 'Accanto a un cadavere, un diario. L\'ultima pagina dice: "Se leggi questo, non fidarti della porta che respira."',
    choices: [
      { text: 'Leggerlo tutto', effect: { res: { intuizione: 1 }, nature: 'silent', xp: 15 }, result: 'Le sue scelte somigliano alle tue. Troppo.' },
      { text: 'Bruciarlo per scaldarti', effect: { corruption: -5, hp: 0.1 }, result: 'Il calore ti rinfranca. Le sue parole salgono in fumo.' },
      { text: 'Frugare il cadavere', effect: { nature: 'cruel', item: 0 }, result: 'Trovi qualcosa di utile. Lui non ne ha più bisogno.' },
    ],
  },
  {
    id: 'fonte_luce', title: 'La Sorgente Pallida', icon: '💧', where: 'any',
    text: 'Una sorgente di luce malata. L\'acqua cura, ma qualcosa nuota sul fondo.',
    choices: [
      { text: 'Bere a lungo', effect: { hp: 0.4, corruption: 8 }, result: 'Le ferite si chiudono. Qualcosa ti guarda da dentro.' },
      { text: 'Bagnare solo le ferite dei compagni', effect: { nature: 'protect', trust: 6, hp: 0.1 }, result: 'I compagni ti ringraziano con lo sguardo.' },
      { text: 'Purificare l\'acqua con una preghiera', effect: { nature: 'faith', corruption: -10, resonance: 1 }, result: 'La luce diventa limpida per un istante.' },
    ],
  },
  {
    id: 'fonte_sangue', title: 'La Fonte di Sangue', icon: '🩸', where: ['paludi'], once: true, minFloor: 4,
    text: 'Al centro della palude ribolle la Fonte di Vhalzareth. Chi beve diventa altro: più forte, meno umano. Vesper ti osserva dall\'altra riva.',
    choices: [
      { text: 'Bere dalla Fonte', effect: { aberration: true, flags: ['drank_fountain', 'aberration'], factions: { culto: 15, guaritori: -10, contadini: -8 }, corruption: 20, influence: 10 }, result: 'Il sangue ti riempie. Le ossa si allungano. Diventi un\'Aberrazione.' },
      { text: 'Raccoglierne un campione', effect: { fragment: 'sangue', nature: 'blood', factions: { culto: 4 } }, result: 'Il sangue nella fiala pulsa. Ottieni un Frammento di Sangue.' },
      { text: 'Purificarla con sale e preghiera', effect: { nature: 'faith', factions: { guaritori: 8, culto: -12 }, corruption: -15, combat: ['accolito', 'annegato'] }, result: 'Il Culto non lo permetterà. I fedeli attaccano!' },
    ],
  },
  {
    id: 'ilyas', title: 'La Gabbia di Ilyas', icon: '⛓️', where: ['paludi'], once: true, minFloor: 6,
    cond: s => s.fardello === 'sangue' || hasPromise(s, 'p_ilyas'),
    text: 'In una gabbia sospesa sull\'acqua nera: Ilyas, il profugo. È vivo. "{name}… sei tornato?"',
    choices: [
      { text: 'Liberarlo, costi quel che costi', effect: { nature: 'protect', flags: ['freed_ilyas'], factions: { culto: -15, contadini: 10 }, combat: ['accolito', 'sacerdotessa'] }, result: 'Spezzi la gabbia. La Sacerdotessa urla il tuo nome!' },
      { text: 'Lasciarlo lì', effect: { nature: 'silent', dissonance: 2, flags: ['left_ilyas'] }, result: 'Ti volti. Lui smette di chiamarti.' },
      { text: 'Rivenderlo al Culto per la seconda volta', effect: { nature: 'blood', factions: { culto: 10 }, satchel: { cenere: 200 }, flags: ['sold_ilyas_twice'], corruption: 10 }, result: 'Vesper sorride. "Fratello." Il debito di sangue si fa più profondo.' },
    ],
  },
  {
    id: 'pellegrini', title: 'I Pellegrini Affogati', icon: '🛶', where: ['paludi'],
    text: 'Una barca si rovescia. Tre pellegrini annaspano nel fango rosso.',
    choices: [
      { text: 'Tuffarti a salvarli', effect: { nature: 'protect', hp: -0.15, factions: { contadini: 5, guaritori: 3 }, xp: 30 }, result: 'Ne salvi due. Il terzo affonda guardandoti.' },
      { text: 'Prendere le loro borse mentre affondano', effect: { nature: 'cruel', satchel: { cenere: 90, provviste: 2 }, corruption: 8 }, result: 'Il fango si richiude su di loro. Le borse sono pesanti.' },
      { text: 'Pregare per loro e proseguire', effect: { nature: 'faith', resonance: 1 }, result: 'Non puoi salvarli tutti. Lo sai. Fa male lo stesso.' },
    ],
  },
  {
    id: 'specchio', title: 'Lo Specchio della Torre', icon: '🪞', where: ['torre'],
    text: 'Uno specchio alto come la torre. Il riflesso è te, ma con il volto di ciò che il tuo Fardello vuole che tu diventi.',
    choices: [
      { text: 'Accettare il riflesso', effect: { resonance: 3, influence: 8 }, result: 'Il riflesso sorride. Il Fardello si fa più pesante e più tuo.' },
      { text: 'Frantumarlo', effect: { dissonance: 3, nature: 'cruel', satchel: { ferro: 60 } }, result: 'Mille schegge. Ognuna ha il tuo volto.' },
      { text: '[Sussurri] Chiedere allo specchio la verità', req: { fullscreen: true }, reqText: 'Solo nel Rito (fullscreen)', effect: { res: { intuizione: 3 }, flags: ['mirror_truth'], xp: 60 }, result: 'Lo specchio risponde: "Il Cuore di Krak si nutre di ciò che fingi di non sapere."' },
    ],
  },
  {
    id: 'campana', title: 'La Campana Muta', icon: '🔔', where: ['torre'],
    text: 'Una campana enorme pende da una corda d\'ossa. Se suonasse, tutta la torre sentirebbe.',
    choices: [
      { text: 'Suonarla', effect: { combat: ['falena', 'falena'], resonance: 1 }, result: 'DONG. Qualcosa vola verso il rumore!' },
      { text: 'Tagliare la corda in silenzio', effect: { nature: 'silent', satchel: { pietra: 80, ferro: 40 } }, result: 'La campana precipita nell\'abisso. Nessuno sente nulla.' },
      { text: 'Lasciarla stare', effect: {}, result: 'Alcune cose devono restare mute.' },
    ],
  },
  {
    id: 'bilancia', title: 'La Bilancia del Giudice', icon: '⚖️', where: ['torre', 'abisso'],
    text: 'Una bilancia d\'oro: su un piatto un cuore secco, sull\'altro il vuoto. "Pesa ciò che sei disposto a perdere."',
    choices: [
      { text: 'Offrire la tua Risonanza', req: { resonance: 4 }, reqText: 'Richiede 4 Risonanza', effect: { resonance: -4, reliquie: 1, xp: 40 }, result: 'La bilancia si inclina. Una reliquia appare sul piatto.' },
      { text: 'Offrire il tuo sangue', effect: { hp: -0.25, nature: 'sacrifice', item: 1 }, result: 'Il piatto si arrossa. Ricevi un oggetto antico.' },
      { text: 'Offrire la tua Dissonanza', req: { dissonance: 5 }, reqText: 'Richiede 5 Dissonanza', effect: { dissonance: -5, corruption: -10 }, result: 'Il peso dell\'incoerenza scivola via, per ora.' },
    ],
  },
  {
    id: 'bambino_spettro', title: 'Il Bambino che Chiede il Nome', icon: '👧', where: 'any', minFloor: 4,
    text: 'Un bambino spettrale ti tira la manica. "Come ti chiami? Se me lo dici, ti ricorderò per sempre."',
    choices: [
      { text: 'Dirgli il tuo nome: "{name}"', effect: { nature: 'faith', resonance: 2, flags: ['name_given'] }, result: 'Ripete il tuo nome, piano. Ora la valle ha un ricordo in più di te.' },
      { text: 'Mentirgli', effect: { nature: 'betray', dissonance: 2 }, result: 'Ripete il nome falso. Il tuo, intanto, si fa un po\' più sbiadito.' },
      { text: 'Non rispondere', effect: { nature: 'silent' }, result: 'Il bambino svanisce, offeso. Il silenzio pesa.' },
    ],
  },
  {
    id: 'eco_abisso', title: 'Il Coro dei Portatori Caduti', icon: '🌀', where: ['abisso'],
    text: 'Centinaia di voci: sono gli altri portatori che non sono tornati. Ti offrono la loro forza, in cambio di un ricordo.',
    choices: [
      { text: 'Dare un ricordo felice', effect: { resonance: 4, xp: 80 }, result: 'Non ricordi più il sapore del pane di tua madre. Ma sei più forte.' },
      { text: 'Dare un ricordo doloroso', effect: { dissonance: -3, corruption: -10, xp: 40 }, result: 'Ti senti più leggero. Forse troppo.' },
      { text: 'Rifiutare', effect: { nature: 'silent' }, result: 'Le voci si allontanano, deluse.' },
    ],
  },

  // ===================== VILLAGGIO (conseguenze differite) =====================
  {
    id: 'famiglia_tomas', title: 'La Famiglia di Tomas', icon: '🏚️', where: 'village', once: true,
    cond: s => s.fardello === 'sacrificio' && s.totals.delves >= 1,
    text: 'Torni al villaggio. La madre di Tomas ti aspetta sulla porta, con Kael alle spalle. "Dov\'è mio figlio, {name}?"',
    choices: [
      { text: 'Dire la verità', effect: { nature: 'faith', flags: ['told_truth'], factions: { contadini: -6, capitale: 4 }, trustOf: 'kael', trust: 15 }, result: 'Lei piange. Kael ti posa una mano sulla spalla: "Grazie per non avermi mentito." Nasce il Fardello "Verità Amara".' },
      { text: 'Mentire: "È partito per la Capitale"', effect: { nature: 'betray', dissonance: 3, flags: ['lied_family'], promise: 'p_menzogna' }, result: 'Lei ti crede. Kael no. Ora dovrai mantenere la menzogna.' },
      { text: 'Offrire un Frammento come riparazione', req: { fragment: true }, reqText: 'Richiede un Frammento di Fato', effect: { loseFragment: true, factions: { contadini: 6 }, flags: ['told_truth'], resonance: 2 }, result: 'Lei stringe il frammento. Non è suo figlio, ma è qualcosa. Pace, per ora.' },
      { text: 'Minacciarli di tacere', effect: { nature: 'cruel', factions: { contadini: -15, ombre: 5 }, flags: ['feared'], corruption: 8 }, result: 'Abbassano lo sguardo. Ora sei Temuto. Una via oscura si apre.' },
    ],
  },
  {
    id: 'elara_bambino', title: 'Il Bambino di Elara', icon: '🌿', where: 'village', once: true,
    cond: s => hasPromise(s, 'p_bambino'),
    text: 'Elara ti chiama. Il bambino salvato quella notte è debole: servono provviste per l\'inverno.',
    choices: [
      { text: 'Donare 8 Provviste', req: { res: { provviste: 8 } }, reqText: 'Richiede 8 Provviste', effect: { res: { provviste: -8 }, nature: 'protect', flags: ['child_fed'], factions: { guaritori: 10 } }, result: 'Il bambino mangia. Elara ti sorride come quella notte.' },
      { text: 'Non posso, mi servono per scendere', effect: { factions: { guaritori: -4 } }, result: 'Elara annuisce. Capisce. Non perdona.' },
    ],
  },
  {
    id: 'testimonianza', title: 'Il Testimone', icon: '👁️', where: 'village', once: true,
    cond: s => s.fardello === 'silenzio' && s.totals.delves >= 1,
    text: 'Il Capitano Marcus e un Eretico incappucciato ti cercano entrambi. Tu hai visto chi ha dato fuoco alla valle quella notte.',
    choices: [
      { text: 'Testimoniare alla Capitale', effect: { flags: ['testified'], factions: { capitale: 10, eretici: -8 }, res: { cenere: 120 } }, result: 'Marcus prende nota. Qualcuno verrà impiccato. Forse il colpevole.' },
      { text: 'Testimoniare agli Eretici', effect: { flags: ['testified', 'helped_heretics'], factions: { eretici: 10, capitale: -8 } }, result: 'L\'Eretico annuisce. "La verità brucerà la Capitale."' },
      { text: 'Restare in silenzio', effect: { nature: 'silent', resonance: 3, influence: 6 }, result: 'Il silenzio è il tuo mantello. Si fa più pesante.' },
    ],
  },
  {
    id: 'vesper_ritorno', title: 'Vesper Bussa', icon: '🕯️', where: 'village', once: true,
    cond: s => s.fardello === 'sangue' && s.totals.delves >= 1,
    text: 'Vesper, l\'emissario del Culto, ti attende alla locanda. "Fratello. Il Culto ricorda i suoi debitori. Torna da noi."',
    choices: [
      { text: 'Tornare dal Culto', effect: { flags: ['returned_cult'], factions: { culto: 12, guaritori: -6 }, nature: 'blood', res: { cenere: 150 } }, result: 'Il Culto ti accoglie. Il calice ha il sapore del tuo debito.' },
      { text: 'Rifiutare', effect: { factions: { culto: -10 }, dissonance: 2 }, result: 'Vesper sorride comunque. "Il sangue torna sempre alla Fonte."' },
    ],
  },
  {
    id: 'editto', title: 'L\'Editto della Capitale', icon: '📜', where: 'village', once: true,
    cond: s => s.hero.level >= 4,
    text: 'Un araldo affigge un editto: nuove tasse sulle provviste, per finanziare la guerra al Culto.',
    choices: [
      { text: 'Bruciare l\'editto in piazza', effect: { flags: ['burned_edict', 'helped_heretics'], factions: { eretici: 10, contadini: 6, capitale: -12 } }, result: 'Le fiamme salgono. La piazza applaude. La Capitale prende nota.' },
      { text: 'Farlo rispettare', effect: { factions: { capitale: 10, contadini: -10 }, res: { cenere: 200 } }, result: 'Le tasse vengono riscosse. Una parte finisce nelle tue tasche.' },
      { text: 'Ignorarlo', effect: { nature: 'silent' }, result: 'L\'editto sbiadisce sotto la pioggia di cenere.' },
    ],
  },
  {
    id: 'guardiani_sigillo', title: 'Il Sigillo Incrinato', icon: '🗿', where: 'village', once: true,
    cond: s => s.totals.delves >= 3,
    text: 'Un Guardiano della Valle, coperto di muschio, ti mostra un sigillo antico incrinato. "Krak si sveglia. Servono pietre."',
    choices: [
      { text: 'Donare 200 Pietra', req: { res: { pietra: 200 } }, reqText: 'Richiede 200 Pietra', effect: { res: { pietra: -200 }, factions: { guardiani: 15 }, prosperity: 20, blight: -15, reliquie: 1 }, result: 'Il sigillo si ricompone. La valle respira meglio.' },
      { text: 'Chiedere cosa c\'è sotto', effect: { res: { intuizione: 2 }, flags: ['krak_lore'] }, result: '"Una voce. Sepolta. Ha la forma di tutte le scelte che non hai fatto."' },
    ],
  },
  {
    id: 'ombre_offerta', title: 'L\'Offerta delle Ombre', icon: '🎭', where: 'village',
    cond: s => s.reliquie >= 1 && s.totals.delves >= 2,
    text: 'Una figura senza volto al mercato: "Una reliquia per un frammento di destino. Nessuno saprà."',
    choices: [
      { text: 'Accettare (1 Reliquia)', req: { reliquie: 1 }, effect: { reliquie: -1, fragment: 'random', factions: { ombre: 8, gilde: -4 } }, result: 'La figura svanisce. Nella tua mano, un frammento caldo.' },
      { text: 'Rifiutare', effect: { factions: { gilde: 3 } }, result: '"Torneremo." Lo dicono tutti.' },
    ],
  },
  {
    id: 'altare_nome', title: 'L\'Altare del Nome', icon: '🕯️', where: 'village', once: true,
    cond: s => s.hero.level >= 3,
    text: 'Sull\'Altare della Veglia, un\'incisione: "Chi pronuncia il proprio nome qui, lo lega alla valle."',
    choices: [
      { text: 'Pronunciare "{name}"', effect: { flags: ['name_spoken'], resonance: 3, nature: 'faith' }, result: 'Il tuo nome vibra nella pietra. La valle lo ricorderà, nel bene e nel male.' },
      { text: 'Nascondere il tuo nome', effect: { nature: 'silent', flags: ['name_hidden'] }, result: 'Nessuno potrà maledire ciò che non conosce.' },
    ],
  },
  {
    id: 'kael_dubbio', title: 'Kael Ti Affronta', icon: '🧔', where: 'village',
    cond: s => companionTrust(s, 'kael') < 35 && !s.companions.find(c => c.id === 'kael')?.left,
    text: 'Kael ti blocca la strada. "Ti ho visto. Usi le persone come scudi. Dimmi perché dovrei restare."',
    choices: [
      { text: 'Chiedere perdono', effect: { trustOf: 'kael', trust: 25, nature: 'faith' }, result: '"Un\'ultima possibilità." Non sorride, ma resta.' },
      { text: '"Perché ti servo vivo."', effect: { trustOf: 'kael', trust: -30, nature: 'cruel' }, result: 'Kael stringe i pugni. Se la fiducia crolla, se ne andrà.' },
    ],
  },
  {
    id: 'sogno_tomas', title: 'Tomas nel Sogno', icon: '🌀', where: 'village', once: true,
    cond: s => s.fardello === 'sacrificio' && s.totals.delves >= 4,
    text: 'Stanotte hai sognato Tomas dall\'altra parte del portale. Ti ha detto: "Non è stato un sacrificio, se l\'hai scelto tu per me."',
    choices: [
      { text: 'Accettare la colpa', effect: { influence: 10, resonance: 3 }, result: 'Il Fardello si incrina. Più pesante, più tuo.' },
      { text: 'Rifiutare la colpa', effect: { dissonance: 3, corruption: -5 }, result: 'Ti svegli arrabbiato. Il Fardello stride.' },
    ],
  },
];

// ------------------------------------------------------------
// PROMESSE DIFFERITE (GDD §D)
// ------------------------------------------------------------
export interface PromiseDef { id: string; text: string; deadline: number; keptFlag?: string; brokenFlag?: string; keptCheck?: (s: GameState) => boolean; keepOnExpire?: boolean }
export const PROMISES: Record<string, PromiseDef> = {
  p_tomas: { id: 'p_tomas', text: 'Dirò la verità alla famiglia di Tomas.', deadline: 3, keptFlag: 'told_truth', brokenFlag: 'lied_family' },
  p_ilyas: { id: 'p_ilyas', text: 'Tornerò a riprendere Ilyas dal Culto.', deadline: 10, keptFlag: 'freed_ilyas', brokenFlag: 'sold_ilyas_twice' },
  p_testimone: { id: 'p_testimone', text: 'Racconterò ciò che ho visto.', deadline: 4, keptFlag: 'testified' },
  p_bambino: { id: 'p_bambino', text: 'Proteggerò il bambino di Elara.', deadline: 4, keptFlag: 'child_fed' },
  p_padre: { id: 'p_padre', text: 'Scoprirò la verità su mio padre.', deadline: 8, keptFlag: 'boss_coro' },
  p_innocente: { id: 'p_innocente', text: 'Non ucciderò un innocente.', deadline: 5, brokenFlag: 'killed_innocent', keepOnExpire: true },
  p_menzogna: { id: 'p_menzogna', text: 'Manterrò la menzogna sulla sorte di Tomas.', deadline: 6, brokenFlag: 'told_truth', keepOnExpire: true },
  p_nessuno: { id: 'p_nessuno', text: 'Non lascerò indietro nessuno.', deadline: 4, brokenFlag: 'betrayed', keepOnExpire: true },
};
