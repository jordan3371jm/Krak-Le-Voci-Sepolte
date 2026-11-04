import type { BiomeId, FactionId, FardelloId, GameState, Loot, Nature, Resources } from '../types';
import { t } from '../../i18n';

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
  quest?: { id: string; stage: number };
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
  priority?: boolean;
  choices: EventChoice[];
}

const hasPromise = (s: GameState, id: string) => s.promises.some(p => p.defId === id && p.status === 'open');
const companionTrust = (s: GameState, id: string) => s.companions.find(c => c.id === id)?.trust ?? 100;

export const EVENTS: NarrEvent[] = [
  // ===================== MISSIONI SECONDARIE =====================
  {
    id: 'wren', title: t('La Cripta senza Nome'), icon: '🎀', where: ['cimitero'], once: true, minFloor: 3, priority: true,
    cond: s => (s.quests.wren?.stage ?? 0) === 1,
    text: t('Un nastro rosso legato a una lapide. Oltre, una cripta illuminata da candele: figure incappucciate spolverano nomi incisi. Una di loro si volta. È una ragazza, con gli occhi di Orsola. «Non sono persa,» dice Wren. «Qui qualcuno ricorda i morti. Lassù nessuno si ricorda nemmeno dei vivi.» Dietro di lei, una Signora fatta di polvere ti osserva.'),
    choices: [
      { text: t('Tua madre tiene una candela accesa da tre notti. Torna a casa con me.'), effect: { quest: { id: 'wren', stage: 2 }, flags: ['wren_home'], nature: 'protect', xp: 40 }, result: t('Wren esita a lungo. Poi slega il nastro dalla lapide. «Solo per dirle addio come si deve.» Ti segue verso la superficie.') },
      { text: t('Hai scelto. Rispetto la tua scelta. Porterò il nastro a tua madre.'), effect: { quest: { id: 'wren', stage: 2 }, flags: ['wren_stay'], nature: 'faith', resonance: 2, xp: 40 }, result: t('Wren ti mette in mano il nastro. «Dille che sto bene. Dille che qui fa caldo.» La Signora di polvere china il capo verso di te.') },
      { text: t('Lasciarla alla Signora delle Lapidi in cambio di un passaggio sicuro.'), effect: { quest: { id: 'wren', stage: 2 }, flags: ['wren_sold'], nature: 'betray', satchel: { cenere: 120 }, reliquie: 1, corruption: 6 }, result: t('La Signora sorride con una bocca piena di terra. Wren non capisce subito. Quando capisce, è già troppo tardi.') },
    ],
  },
  {
    id: 'funerale', title: t('Il Funerale senza Corpo'), icon: '⚱️', where: 'village', once: true,
    cond: s => s.hero.level >= 3,
    text: t('I contadini seppelliscono una bara vuota: un uomo scomparso nelle Paludi. La vedova ti chiede di dire due parole, perché “i portatori parlano con i morti”. Vesper, poco lontano, ascolta.'),
    choices: [
      { text: t('Dire la verità: nessuno sa dove sia.'), effect: { nature: 'protect', factions: { contadini: 3 }, xp: 20 }, result: t('Le tue parole sono semplici e vere. La vedova annuisce, grata. Qualcuno piange, finalmente.') },
      { text: t('Raccontare una morte eroica che non è mai avvenuta.'), effect: { nature: 'silent', factions: { contadini: 5 }, dissonance: 1 }, result: t('Il villaggio avrà un eroe. La vedova avrà una storia. Tu avrai una bugia in più da portare.') },
      { text: t('Lasciare la parola a Vesper.'), effect: { nature: 'blood', factions: { culto: 5, contadini: -3 } }, result: t('Vesper parla della Fonte che accoglie tutti. Due famiglie, quella notte, accendono una candela rossa.') },
    ],
  },
  {
    id: 'torneo', title: t('La Sfida alla Taverna'), icon: '🍺', where: 'village', once: true,
    cond: s => s.flags.includes('met_orsola') && s.hero.level >= 5,
    text: t('Alla locanda di Orsola un mercenario della Capitale sfida chiunque a braccio di ferro. Ha già vinto tre volte e insulta i contadini. Orsola ti guarda come per dire: “Fa’ qualcosa.”'),
    choices: [
      { text: t('Accettare la sfida.'), effect: { nature: 'protect', factions: { contadini: 4, capitale: -2 }, hp: -0.05, res: { cenere: 80 } }, result: t('È un duello lungo e brutale. Vinci di un soffio. La taverna esplode in un urlo. Il mercenario ti offre da bere, sportivamente.') },
      { text: t('Scommettere contro i contadini.'), effect: { nature: 'betray', res: { cenere: 150 }, factions: { contadini: -4 } }, result: t('Vinci un bel gruzzolo. Orsola ti serve la birra più tiepida della valle.') },
      { text: t('Sussurrare al mercenario che sua madre lo cerca alla porta.'), effect: { nature: 'silent', factions: { contadini: 3 }, xp: 25 }, result: t('Corre fuori. Non c’è nessuno. Quando torna, la taverna intera ride di lui. Se ne va senza finire la birra.') },
    ],
  },
  // ===================== DUNGEON =====================
  {
    id: 'lapidi', title: t('Le Lapidi dei Nomi'), icon: '🪦', where: ['cimitero'],
    text: t('Cancelli di ferro arrugginito. Le tombe portano nomi che riconosci: sono i nomi di chi hai deluso. Uno è ancora fresco: "{name}".'),
    choices: [
      { text: t('Pregare per le anime dei traditi'), effect: { nature: 'faith', corruption: -6, xp: 15 }, result: t('Le tue parole echeggiano. Una luce tenue si accende sul cammino.') },
      { text: t('Calciare le lapidi per aprire un passaggio'), effect: { nature: 'cruel', corruption: 10, satchel: { cenere: 40 } }, result: t('Il metallo stride. Sotto le lapidi, monete di cenere. Le ombre si agitano.') },
      { text: t('Osservare in silenzio i simboli incisi'), effect: { nature: 'silent', flags: ['secret_path'], xp: 20 }, result: t('Noti un sentiero segreto tra le tombe. La valle ricorda chi osserva.') },
    ],
  },
  {
    id: 'corridoio', title: t('Il Corridoio Claustrofobico'), icon: '🦴', where: ['cimitero', 'torre'],
    text: t('Le pareti si stringono. Il soffitto pulsa come un cuore malato. Trappole d\'ossa sbarrano il passo.'),
    choices: [
      { text: t('Avanzare con cautela'), effect: { hp: -0.1, nature: 'neutral', xp: 15 }, result: t('Una spina ti graffia. Eviti il peggio.') },
      { text: t('Spingere un compagno avanti come esca'), effect: { nature: 'betray', trust: -15, flags: ['betrayed'], xp: 20 }, result: t('Il tuo compagno urla mentre le trappole lo colpiscono. Ti guarda. Non dimenticherà.') },
      { text: t('Tagliarti il palmo e offrire sangue alle pareti'), effect: { hp: -0.15, nature: 'sacrifice', corruption: -8, xp: 25 }, result: t('Le pareti bevono e si ritirano. Il passaggio è tuo.') },
    ],
  },
  {
    id: 'padre', title: t('Il Ponte dei Sospiri'), icon: '🌉', where: ['cimitero'], once: true, minFloor: 3,
    text: t('Un ponte su un abisso senza fondo. Figure spettrali sussurrano nomi. Una ha la voce di tuo padre: "{name}… sapevi?"'),
    choices: [
      { text: t('Attraversare in silenzio'), effect: { nature: 'silent', xp: 20 }, result: t('I fantasmi ti lasciano passare. Il silenzio è una forma di rispetto.') },
      { text: t('Parlare al fantasma di tuo padre'), effect: { nature: 'faith', hp: -0.1, flags: ['father_echo'], promise: 'p_padre', xp: 30 }, result: t('Ti sussurra una verità dolorosa: il Cuore di Krak lo chiamava, come ora chiama te.') },
      { text: t('Distruggere i fantasmi'), effect: { nature: 'cruel', corruption: 12, combat: ['spettro', 'spettro'] }, result: t('Le figure urlano e si scagliano contro di te!') },
    ],
  },
  {
    id: 'innocente', title: t('Il Disertore'), icon: '🧒', where: 'any', minFloor: 2,
    text: t('Un ragazzino con la tonaca del Culto trema in un angolo. "Non volevo… mi hanno costretto." Ha le mani sporche di sangue non suo.'),
    choices: [
      { text: t('Risparmiarlo e indicargli l\'uscita'), effect: { nature: 'protect', factions: { contadini: 4, culto: -3 }, flags: ['spared_innocent'] }, result: t('Corre via. Un giorno, forse, qualcuno ti racconterà di lui.') },
      { text: t('Ucciderlo: il Culto non perdona e nemmeno tu'), effect: { nature: 'cruel', corruption: 10, flags: ['killed_innocent'], satchel: { cenere: 30 } }, result: t('È stato rapido. La valle non lo dimenticherà.') },
      { text: t('Consegnarlo alla Capitale per la taglia'), effect: { nature: 'blood', factions: { capitale: 6, eretici: -3 }, satchel: { cenere: 80 } }, result: t('Il Capitano Marcus pagherà bene. Il ragazzo non ti guarda più.') },
      { text: t('[Sussurri] Ascoltare ciò che il sangue sulle sue mani racconta'), req: { fullscreen: true }, reqText: t('Solo nel Rito (fullscreen)'), effect: { nature: 'silent', flags: ['know_word'], resonance: 2 }, result: t('Il sangue mormora una parola: la Parola d\'Ordine del tuo Fardello. Ora la conosci.') },
    ],
  },
  {
    id: 'diario', title: t('Il Diario di un Portatore'), icon: '📓', where: 'any',
    text: t('Accanto a un cadavere, un diario. L\'ultima pagina dice: "Se leggi questo, non fidarti della porta che respira."'),
    choices: [
      { text: t('Leggerlo tutto'), effect: { res: { intuizione: 1 }, nature: 'silent', xp: 15 }, result: t('Le sue scelte somigliano alle tue. Troppo.') },
      { text: t('Bruciarlo per scaldarti'), effect: { corruption: -5, hp: 0.1 }, result: t('Il calore ti rinfranca. Le sue parole salgono in fumo.') },
      { text: t('Frugare il cadavere'), effect: { nature: 'cruel', item: 0 }, result: t('Trovi qualcosa di utile. Lui non ne ha più bisogno.') },
    ],
  },
  {
    id: 'fonte_luce', title: t('La Sorgente Pallida'), icon: '💧', where: 'any',
    text: t('Una sorgente di luce malata. L\'acqua cura, ma qualcosa nuota sul fondo.'),
    choices: [
      { text: t('Bere a lungo'), effect: { hp: 0.4, corruption: 8 }, result: t('Le ferite si chiudono. Qualcosa ti guarda da dentro.') },
      { text: t('Bagnare solo le ferite dei compagni'), effect: { nature: 'protect', trust: 6, hp: 0.1 }, result: t('I compagni ti ringraziano con lo sguardo.') },
      { text: t('Purificare l\'acqua con una preghiera'), effect: { nature: 'faith', corruption: -10, resonance: 1 }, result: t('La luce diventa limpida per un istante.') },
    ],
  },
  {
    id: 'fonte_sangue', title: t('La Fonte di Sangue'), icon: '🩸', where: ['paludi'], once: true, minFloor: 4,
    text: t('Al centro della palude ribolle la Fonte di Vhalzareth. Chi beve diventa altro: più forte, meno umano. Vesper ti osserva dall\'altra riva.'),
    choices: [
      { text: t('Bere dalla Fonte'), effect: { aberration: true, flags: ['drank_fountain', 'aberration'], factions: { culto: 15, guaritori: -10, contadini: -8 }, corruption: 20, influence: 10 }, result: t('Il sangue ti riempie. Le ossa si allungano. Diventi un\'Aberrazione.') },
      { text: t('Raccoglierne un campione'), effect: { fragment: 'sangue', nature: 'blood', factions: { culto: 4 } }, result: t('Il sangue nella fiala pulsa. Ottieni un Frammento di Sangue.') },
      { text: t('Purificarla con sale e preghiera'), effect: { nature: 'faith', factions: { guaritori: 8, culto: -12 }, corruption: -15, combat: ['accolito', 'annegato'] }, result: t('Il Culto non lo permetterà. I fedeli attaccano!') },
    ],
  },
  {
    id: 'ilyas', title: t('La Gabbia di Ilyas'), icon: '⛓️', where: ['paludi'], once: true, minFloor: 6,
    cond: s => s.fardello === 'sangue' || hasPromise(s, 'p_ilyas'),
    text: t('In una gabbia sospesa sull\'acqua nera: Ilyas, il profugo. È vivo. "{name}… sei tornato?"'),
    choices: [
      { text: t('Liberarlo, costi quel che costi'), effect: { nature: 'protect', flags: ['freed_ilyas'], factions: { culto: -15, contadini: 10 }, combat: ['accolito', 'sacerdotessa'] }, result: t('Spezzi la gabbia. La Sacerdotessa urla il tuo nome!') },
      { text: t('Lasciarlo lì'), effect: { nature: 'silent', dissonance: 2, flags: ['left_ilyas'] }, result: t('Ti volti. Lui smette di chiamarti.') },
      { text: t('Rivenderlo al Culto per la seconda volta'), effect: { nature: 'blood', factions: { culto: 10 }, satchel: { cenere: 200 }, flags: ['sold_ilyas_twice'], corruption: 10 }, result: t('Vesper sorride. "Fratello." Il debito di sangue si fa più profondo.') },
    ],
  },
  {
    id: 'pellegrini', title: t('I Pellegrini Affogati'), icon: '🛶', where: ['paludi'],
    text: t('Una barca si rovescia. Tre pellegrini annaspano nel fango rosso.'),
    choices: [
      { text: t('Tuffarti a salvarli'), effect: { nature: 'protect', hp: -0.15, factions: { contadini: 5, guaritori: 3 }, xp: 30 }, result: t('Ne salvi due. Il terzo affonda guardandoti.') },
      { text: t('Prendere le loro borse mentre affondano'), effect: { nature: 'cruel', satchel: { cenere: 90, provviste: 2 }, corruption: 8 }, result: t('Il fango si richiude su di loro. Le borse sono pesanti.') },
      { text: t('Pregare per loro e proseguire'), effect: { nature: 'faith', resonance: 1 }, result: t('Non puoi salvarli tutti. Lo sai. Fa male lo stesso.') },
    ],
  },
  {
    id: 'specchio', title: t('Lo Specchio della Torre'), icon: '🪞', where: ['torre'],
    text: t('Uno specchio alto come la torre. Il riflesso è te, ma con il volto di ciò che il tuo Fardello vuole che tu diventi.'),
    choices: [
      { text: t('Accettare il riflesso'), effect: { resonance: 3, influence: 8 }, result: t('Il riflesso sorride. Il Fardello si fa più pesante e più tuo.') },
      { text: t('Frantumarlo'), effect: { dissonance: 3, nature: 'cruel', satchel: { ferro: 60 } }, result: t('Mille schegge. Ognuna ha il tuo volto.') },
      { text: t('[Sussurri] Chiedere allo specchio la verità'), req: { fullscreen: true }, reqText: t('Solo nel Rito (fullscreen)'), effect: { res: { intuizione: 3 }, flags: ['mirror_truth'], xp: 60 }, result: t('Lo specchio risponde: "Il Cuore di Krak si nutre di ciò che fingi di non sapere."') },
    ],
  },
  {
    id: 'campana', title: t('La Campana Muta'), icon: '🔔', where: ['torre'],
    text: t('Una campana enorme pende da una corda d\'ossa. Se suonasse, tutta la torre sentirebbe.'),
    choices: [
      { text: t('Suonarla'), effect: { combat: ['falena', 'falena'], resonance: 1 }, result: t('DONG. Qualcosa vola verso il rumore!') },
      { text: t('Tagliare la corda in silenzio'), effect: { nature: 'silent', satchel: { pietra: 80, ferro: 40 } }, result: t('La campana precipita nell\'abisso. Nessuno sente nulla.') },
      { text: t('Lasciarla stare'), effect: {}, result: t('Alcune cose devono restare mute.') },
    ],
  },
  {
    id: 'bilancia', title: t('La Bilancia del Giudice'), icon: '⚖️', where: ['torre', 'abisso'],
    text: t('Una bilancia d\'oro: su un piatto un cuore secco, sull\'altro il vuoto. "Pesa ciò che sei disposto a perdere."'),
    choices: [
      { text: t('Offrire la tua Risonanza'), req: { resonance: 4 }, reqText: t('Richiede 4 Risonanza'), effect: { resonance: -4, reliquie: 1, xp: 40 }, result: t('La bilancia si inclina. Una reliquia appare sul piatto.') },
      { text: t('Offrire il tuo sangue'), effect: { hp: -0.25, nature: 'sacrifice', item: 1 }, result: t('Il piatto si arrossa. Ricevi un oggetto antico.') },
      { text: t('Offrire la tua Dissonanza'), req: { dissonance: 5 }, reqText: t('Richiede 5 Dissonanza'), effect: { dissonance: -5, corruption: -10 }, result: t('Il peso dell\'incoerenza scivola via, per ora.') },
    ],
  },
  {
    id: 'bambino_spettro', title: t('Il Bambino che Chiede il Nome'), icon: '👧', where: 'any', minFloor: 4,
    text: t('Un bambino spettrale ti tira la manica. "Come ti chiami? Se me lo dici, ti ricorderò per sempre."'),
    choices: [
      { text: t('Dirgli il tuo nome: "{name}"'), effect: { nature: 'faith', resonance: 2, flags: ['name_given'] }, result: t('Ripete il tuo nome, piano. Ora la valle ha un ricordo in più di te.') },
      { text: t('Mentirgli'), effect: { nature: 'betray', dissonance: 2 }, result: t('Ripete il nome falso. Il tuo, intanto, si fa un po\' più sbiadito.') },
      { text: t('Non rispondere'), effect: { nature: 'silent' }, result: t('Il bambino svanisce, offeso. Il silenzio pesa.') },
    ],
  },
  {
    id: 'eco_abisso', title: t('Il Coro dei Portatori Caduti'), icon: '🌀', where: ['abisso'],
    text: t('Centinaia di voci: sono gli altri portatori che non sono tornati. Ti offrono la loro forza, in cambio di un ricordo.'),
    choices: [
      { text: t('Dare un ricordo felice'), effect: { resonance: 4, xp: 80 }, result: t('Non ricordi più il sapore del pane di tua madre. Ma sei più forte.') },
      { text: t('Dare un ricordo doloroso'), effect: { dissonance: -3, corruption: -10, xp: 40 }, result: t('Ti senti più leggero. Forse troppo.') },
      { text: t('Rifiutare'), effect: { nature: 'silent' }, result: t('Le voci si allontanano, deluse.') },
    ],
  },

  // ===================== VILLAGGIO (conseguenze differite) =====================
  {
    id: 'famiglia_tomas', title: t('La Famiglia di Tomas'), icon: '🏚️', where: 'village', once: true,
    cond: s => s.fardello === 'sacrificio' && s.totals.delves >= 1,
    text: t('Torni al villaggio. La madre di Tomas ti aspetta sulla porta, con Kael alle spalle. "Dov\'è mio figlio, {name}?"'),
    choices: [
      { text: t('Dire la verità'), effect: { nature: 'faith', flags: ['told_truth'], factions: { contadini: -6, capitale: 4 }, trustOf: 'kael', trust: 15 }, result: t('Lei piange. Kael ti posa una mano sulla spalla: "Grazie per non avermi mentito." Nasce il Fardello "Verità Amara".') },
      { text: t('Mentire: "È partito per la Capitale"'), effect: { nature: 'betray', dissonance: 3, flags: ['lied_family'], promise: 'p_menzogna' }, result: t('Lei ti crede. Kael no. Ora dovrai mantenere la menzogna.') },
      { text: t('Offrire un Frammento come riparazione'), req: { fragment: true }, reqText: t('Richiede un Frammento di Fato'), effect: { loseFragment: true, factions: { contadini: 6 }, flags: ['told_truth'], resonance: 2 }, result: t('Lei stringe il frammento. Non è suo figlio, ma è qualcosa. Pace, per ora.') },
      { text: t('Minacciarli di tacere'), effect: { nature: 'cruel', factions: { contadini: -15, ombre: 5 }, flags: ['feared'], corruption: 8 }, result: t('Abbassano lo sguardo. Ora sei Temuto. Una via oscura si apre.') },
    ],
  },
  {
    id: 'elara_bambino', title: t('Il Bambino di Elara'), icon: '🌿', where: 'village', once: true,
    cond: s => hasPromise(s, 'p_bambino'),
    text: t('Elara ti chiama. Il bambino salvato quella notte è debole: servono provviste per l\'inverno.'),
    choices: [
      { text: t('Donare 8 Provviste'), req: { res: { provviste: 8 } }, reqText: t('Richiede 8 Provviste'), effect: { res: { provviste: -8 }, nature: 'protect', flags: ['child_fed'], factions: { guaritori: 10 } }, result: t('Il bambino mangia. Elara ti sorride come quella notte.') },
      { text: t('Non posso, mi servono per scendere'), effect: { factions: { guaritori: -4 } }, result: t('Elara annuisce. Capisce. Non perdona.') },
    ],
  },
  {
    id: 'testimonianza', title: t('Il Testimone'), icon: '👁️', where: 'village', once: true,
    cond: s => s.fardello === 'silenzio' && s.totals.delves >= 1,
    text: t('Il Capitano Marcus e un Eretico incappucciato ti cercano entrambi. Tu hai visto chi ha dato fuoco alla valle quella notte.'),
    choices: [
      { text: t('Testimoniare alla Capitale'), effect: { flags: ['testified'], factions: { capitale: 10, eretici: -8 }, res: { cenere: 120 } }, result: t('Marcus prende nota. Qualcuno verrà impiccato. Forse il colpevole.') },
      { text: t('Testimoniare agli Eretici'), effect: { flags: ['testified', 'helped_heretics'], factions: { eretici: 10, capitale: -8 } }, result: t('L\'Eretico annuisce. "La verità brucerà la Capitale."') },
      { text: t('Restare in silenzio'), effect: { nature: 'silent', resonance: 3, influence: 6 }, result: t('Il silenzio è il tuo mantello. Si fa più pesante.') },
    ],
  },
  {
    id: 'vesper_ritorno', title: t('Vesper Bussa'), icon: '🕯️', where: 'village', once: true,
    cond: s => s.fardello === 'sangue' && s.totals.delves >= 1,
    text: t('Vesper, l\'emissario del Culto, ti attende alla locanda. "Fratello. Il Culto ricorda i suoi debitori. Torna da noi."'),
    choices: [
      { text: t('Tornare dal Culto'), effect: { flags: ['returned_cult'], factions: { culto: 12, guaritori: -6 }, nature: 'blood', res: { cenere: 150 } }, result: t('Il Culto ti accoglie. Il calice ha il sapore del tuo debito.') },
      { text: t('Rifiutare'), effect: { factions: { culto: -10 }, dissonance: 2 }, result: t('Vesper sorride comunque. "Il sangue torna sempre alla Fonte."') },
    ],
  },
  {
    id: 'editto', title: t('L\'Editto della Capitale'), icon: '📜', where: 'village', once: true,
    cond: s => s.hero.level >= 4,
    text: t('Un araldo affigge un editto: nuove tasse sulle provviste, per finanziare la guerra al Culto.'),
    choices: [
      { text: t('Bruciare l\'editto in piazza'), effect: { flags: ['burned_edict', 'helped_heretics'], factions: { eretici: 10, contadini: 6, capitale: -12 } }, result: t('Le fiamme salgono. La piazza applaude. La Capitale prende nota.') },
      { text: t('Farlo rispettare'), effect: { factions: { capitale: 10, contadini: -10 }, res: { cenere: 200 } }, result: t('Le tasse vengono riscosse. Una parte finisce nelle tue tasche.') },
      { text: t('Ignorarlo'), effect: { nature: 'silent' }, result: t('L\'editto sbiadisce sotto la pioggia di cenere.') },
    ],
  },
  {
    id: 'guardiani_sigillo', title: t('Il Sigillo Incrinato'), icon: '🗿', where: 'village', once: true,
    cond: s => s.totals.delves >= 3,
    text: t('Un Guardiano della Valle, coperto di muschio, ti mostra un sigillo antico incrinato. "Krak si sveglia. Servono pietre."'),
    choices: [
      { text: t('Donare 200 Pietra'), req: { res: { pietra: 200 } }, reqText: t('Richiede 200 Pietra'), effect: { res: { pietra: -200 }, factions: { guardiani: 15 }, prosperity: 20, blight: -15, reliquie: 1 }, result: t('Il sigillo si ricompone. La valle respira meglio.') },
      { text: t('Chiedere cosa c\'è sotto'), effect: { res: { intuizione: 2 }, flags: ['krak_lore'] }, result: t('"Una voce. Sepolta. Ha la forma di tutte le scelte che non hai fatto."') },
    ],
  },
  {
    id: 'ombre_offerta', title: t('L\'Offerta delle Ombre'), icon: '🎭', where: 'village',
    cond: s => s.reliquie >= 1 && s.totals.delves >= 2,
    text: t('Una figura senza volto al mercato: "Una reliquia per un frammento di destino. Nessuno saprà."'),
    choices: [
      { text: t('Accettare (1 Reliquia)'), req: { reliquie: 1 }, effect: { reliquie: -1, fragment: 'random', factions: { ombre: 8, gilde: -4 } }, result: t('La figura svanisce. Nella tua mano, un frammento caldo.') },
      { text: t('Rifiutare'), effect: { factions: { gilde: 3 } }, result: t('"Torneremo." Lo dicono tutti.') },
    ],
  },
  {
    id: 'altare_nome', title: t('L\'Altare del Nome'), icon: '🕯️', where: 'village', once: true,
    cond: s => s.hero.level >= 3,
    text: t('Sull\'Altare della Veglia, un\'incisione: "Chi pronuncia il proprio nome qui, lo lega alla valle."'),
    choices: [
      { text: t('Pronunciare "{name}"'), effect: { flags: ['name_spoken'], resonance: 3, nature: 'faith' }, result: t('Il tuo nome vibra nella pietra. La valle lo ricorderà, nel bene e nel male.') },
      { text: t('Nascondere il tuo nome'), effect: { nature: 'silent', flags: ['name_hidden'] }, result: t('Nessuno potrà maledire ciò che non conosce.') },
    ],
  },
  {
    id: 'kael_dubbio', title: t('Kael Ti Affronta'), icon: '🧔', where: 'village',
    cond: s => companionTrust(s, 'kael') < 35 && !s.companions.find(c => c.id === 'kael')?.left,
    text: t('Kael ti blocca la strada. "Ti ho visto. Usi le persone come scudi. Dimmi perché dovrei restare."'),
    choices: [
      { text: t('Chiedere perdono'), effect: { trustOf: 'kael', trust: 25, nature: 'faith' }, result: t('"Un\'ultima possibilità." Non sorride, ma resta.') },
      { text: t('"Perché ti servo vivo."'), effect: { trustOf: 'kael', trust: -30, nature: 'cruel' }, result: t('Kael stringe i pugni. Se la fiducia crolla, se ne andrà.') },
    ],
  },
  {
    id: 'sogno_tomas', title: t('Tomas nel Sogno'), icon: '🌀', where: 'village', once: true,
    cond: s => s.fardello === 'sacrificio' && s.totals.delves >= 4,
    text: t('Stanotte hai sognato Tomas dall\'altra parte del portale. Ti ha detto: "Non è stato un sacrificio, se l\'hai scelto tu per me."'),
    choices: [
      { text: t('Accettare la colpa'), effect: { influence: 10, resonance: 3 }, result: t('Il Fardello si incrina. Più pesante, più tuo.') },
      { text: t('Rifiutare la colpa'), effect: { dissonance: 3, corruption: -5 }, result: t('Ti svegli arrabbiato. Il Fardello stride.') },
    ],
  },
];

// ------------------------------------------------------------
// PROMESSE DIFFERITE (GDD §D)
// ------------------------------------------------------------
export interface PromiseDef { id: string; text: string; deadline: number; keptFlag?: string; brokenFlag?: string; keptCheck?: (s: GameState) => boolean; keepOnExpire?: boolean }
export const PROMISES: Record<string, PromiseDef> = {
  p_tomas: { id: 'p_tomas', text: t('Dirò la verità alla famiglia di Tomas.'), deadline: 3, keptFlag: 'told_truth', brokenFlag: 'lied_family' },
  p_ilyas: { id: 'p_ilyas', text: t('Tornerò a riprendere Ilyas dal Culto.'), deadline: 10, keptFlag: 'freed_ilyas', brokenFlag: 'sold_ilyas_twice' },
  p_testimone: { id: 'p_testimone', text: t('Racconterò ciò che ho visto.'), deadline: 4, keptFlag: 'testified' },
  p_bambino: { id: 'p_bambino', text: t('Proteggerò il bambino di Elara.'), deadline: 4, keptFlag: 'child_fed' },
  p_padre: { id: 'p_padre', text: t('Scoprirò la verità su mio padre.'), deadline: 8, keptFlag: 'boss_coro' },
  p_innocente: { id: 'p_innocente', text: t('Non ucciderò un innocente.'), deadline: 5, brokenFlag: 'killed_innocent', keepOnExpire: true },
  p_menzogna: { id: 'p_menzogna', text: t('Manterrò la menzogna sulla sorte di Tomas.'), deadline: 6, brokenFlag: 'told_truth', keepOnExpire: true },
  p_nessuno: { id: 'p_nessuno', text: t('Non lascerò indietro nessuno.'), deadline: 4, brokenFlag: 'betrayed', keepOnExpire: true },
};
