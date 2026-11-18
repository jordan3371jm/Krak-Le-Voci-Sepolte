import type { BiomeId, ClassId, FactionId, FardelloId, Resources } from '../types';
import type { Effect } from './events';
import { t } from '../../i18n';
import { CYCLE_TALKERS, CYCLE_QUESTS, CYCLE_DIALOGUES, CYCLE_ENTRIES } from './cycles';

// ============================================================
// DIALOGHI RAMIFICATI, PERSONAGGI E MISSIONI SECONDARIE
// Ogni scelta può avere requisiti (Fardello, classe, fazione, missione),
// una prova d20 (Persuasione, Intimidire, Intuito, Inganno, Sapere)
// e l’approvazione dei compagni.
// ============================================================

export type SkillCheck = 'persuasione' | 'intimidire' | 'intuito' | 'inganno' | 'sapere';

export interface DReq {
  flag?: string; flags?: string[]; noFlag?: string; anyFlag?: string[];
  fardello?: FardelloId; classId?: ClassId; level?: number; aberration?: boolean;
  res?: Partial<Resources>; reliquie?: number;
  rep?: Partial<Record<FactionId, number>>;
  floor?: Partial<Record<BiomeId, number>>;
  companion?: string; trust?: Record<string, number>;
  quest?: Record<string, number>;
  cycle?: number; maxCycle?: number;   // da quale Ciclo (e fino a quale) compare
}

export interface DChoice {
  text: string;
  goto?: string;                 // nodo successivo; 'end' o assente chiude
  req?: DReq; showLocked?: boolean; lockText?: string;
  check?: { skill: SkillCheck; dc: number };
  fail?: string;                 // nodo in caso di prova fallita
  effect?: Effect; failEffect?: Effect;
  flags?: string[];
  quest?: { id: string; stage: number; outcome?: string };
  approval?: Record<string, number>;
}

export interface DNode { speaker?: string; text: string; choices: DChoice[]; onEnter?: Pick<DChoice, 'effect' | 'flags' | 'quest'> }
export interface Dialogue { idle: string; entries: { node: string; req?: DReq }[]; nodes: Record<string, DNode> }

export interface Talker { id: string; name: string; icon: string; title: string; faction?: FactionId; tone: 'ember' | 'blood' | 'moss' | 'iron' | 'violet'; appear?: DReq; bio: string }

export interface QuestDef { id: string; title: string; giver: string; stages: Record<number, string> }

const BYE = (text = t('Devo andare.')): DChoice => ({ text, goto: 'end' });

// ------------------------------------------------------------
// PERSONAGGI
// ------------------------------------------------------------
export const TALKERS: Talker[] = [
  { id: 'orsola', name: t('Orsola'), icon: '🍺', title: t('Locandiera del Pozzo Spento'), faction: 'contadini', tone: 'ember', bio: t('Serve birra annacquata e notizie fresche. Da tre notti lascia una candela accesa alla finestra.') },
  { id: 'garrik', name: t('Garrik'), icon: '🪖', title: t('Disertore della Capitale'), faction: 'capitale', tone: 'iron', appear: { flag: 'met_orsola' }, bio: t('Nascosto nel fienile, con un’uniforme bruciata e un debito che non è fatto di monete.') },
  { id: 'sibilla', name: t('Sibilla'), icon: '🗺️', title: t('Cartografa cieca'), faction: 'guardiani', tone: 'violet', appear: { floor: { cimitero: 2 } }, bio: t('Disegna mappe che cambiano quando qualcuno nella valle sceglie. Non vede la carta: la ascolta.') },
  { id: 'varo', name: t('Varo'), icon: '🎩', title: t('Mercante di ricordi'), faction: 'ombre', tone: 'blood', appear: { flag: 'met_garrik' }, bio: t('Compra ciò che hai dimenticato e te lo rivende a caro prezzo. Sorride sempre un dente di troppo.') },
  { id: 'nym', name: t('Nym'), icon: '🕯️', title: t('La bambina-eco'), tone: 'violet', appear: { floor: { cimitero: 4 } }, bio: t('Nessuno l’ha vista arrivare. Parla con la voce di chi è sepolto sotto la valle.') },
  { id: 'kael_t', name: t('Kael'), icon: '🧔', title: t('Compagno · al fuoco del campo'), tone: 'ember', appear: { companion: 'kael' }, bio: t('Fratello di Tomas. Ti segue, ma non ha ancora deciso se perdonarti.') },
  { id: 'lyra_t', name: t('Lyra'), icon: '👩‍⚕️', title: t('Compagna · al fuoco del campo'), tone: 'moss', appear: { companion: 'lyra' }, bio: t('Allieva di Elara. Cura chiunque, anche chi non lo merita.') },
];

// ------------------------------------------------------------
// MISSIONI
// ------------------------------------------------------------
export const QUESTS: Record<string, QuestDef> = {
  wren: { id: 'wren', title: t('La Candela alla Finestra'), giver: 'orsola', stages: {
    1: t('Wren, la figlia di Orsola, è scesa nel Cimitero dei Traditi tre notti fa. Cercala oltre il terzo piano.'),
    2: t('Hai trovato Wren viva tra le tombe: si è unita ai Becchini Silenziosi. Torna da Orsola e decidi cosa dirle.'),
    99: t('La storia di Wren è conclusa.') } },
  garrik: { id: 'garrik', title: t('Il Debito del Disertore'), giver: 'garrik', stages: {
    1: t('Garrik si nasconde nel fienile. La Capitale lo cerca. Decidi se aiutarlo, consegnarlo o usarlo.'),
    2: t('Garrik ti ha chiesto 40 provviste per fuggire oltre i passi. Oppure potresti parlarne con Marcus.'),
    99: t('Il destino di Garrik è deciso.') } },
  mappa: { id: 'mappa', title: t('La Mappa che Respira'), giver: 'sibilla', stages: {
    1: t('Sibilla dice che le Paludi nascondono un sentiero che appare solo a chi ha scelto. Scendi almeno al terzo piano delle Paludi.'),
    2: t('Torna da Sibilla: il sentiero delle Paludi ti ha mostrato qualcosa.'),
    99: t('La mappa di Sibilla ha un nuovo confine.') } },
  ricordi: { id: 'ricordi', title: t('Ricordi in Svendita'), giver: 'varo', stages: {
    1: t('Varo ha comprato i ricordi di un bambino del villaggio, Pip, che ora non riconosce più sua madre. Puoi ricomprarli, rubarli o lasciar perdere.'),
    99: t('I ricordi di Pip hanno trovato un padrone.') } },
  nym: { id: 'nym', title: t('La Canzone Sotterranea'), giver: 'nym', stages: {
    1: t('Nym canta una canzone che parla del Cuore di Krak. Dice che la strofa mancante è sotto la Torre del Silenzio.'),
    2: t('Hai sentito la strofa mancante nella Torre. Torna da Nym.'),
    99: t('Conosci la verità sulla canzone.') } },
  kael: { id: 'kael', title: t('Il Fratello oltre il Portale'), giver: 'kael_t', stages: {
    1: t('Kael vuole sapere se Tomas può essere ancora vivo. Nym potrebbe sapere qualcosa.'),
    99: t('Tu e Kael avete parlato di Tomas un’ultima volta.') } },
  lyra: { id: 'lyra', title: t('La Cura Impossibile'), giver: 'lyra_t', stages: {
    1: t('Una febbre di cenere colpisce i figli dei contadini. Lyra conosce due cure: una lenta e onesta, una rapida e di sangue.'),
    99: t('La febbre di cenere è passata, in un modo o nell’altro.') } },
};

// ------------------------------------------------------------
// DIALOGHI
// ------------------------------------------------------------
export const DIALOGUES: Record<string, Dialogue> = {
  // ===================== ORSOLA =====================
  orsola: {
    idle: 'idle',
    entries: [
      { node: 'intro', req: { noFlag: 'met_orsola' } },
      { node: 'q2', req: { quest: { wren: 2 } } },
      { node: 'q1', req: { quest: { wren: 1 } } },
      { node: 'offer', req: { quest: { wren: 0 } } },
      { node: 'idle' },
    ],
    nodes: {
      intro: { text: t('«Un portatore. Lo vedo da come cammini: come chi ha qualcosa sulle spalle che non si toglie la sera.» Asciuga un boccale che è già asciutto. «Siediti. Qui il fuoco è gratis. Il resto no.»'), choices: [
        { text: t('Perché tieni una candela accesa alla finestra?'), goto: 'offer' },
        { text: t('Osservarla meglio.'), check: { skill: 'intuito', dc: 10 }, goto: 'intro_ins', fail: 'intro_ins_f' },
        { text: t('Mi servono solo notizie.'), goto: 'gossip' },
      ] },
      intro_ins: { text: t('Le mani le tremano solo quando guarda la porta. Non ha dormito. Sotto il bancone c’è una piccola borsa da viaggio, pronta, che non ha il coraggio di usare.'), choices: [
        { text: t('Stai aspettando qualcuno. Chi?'), goto: 'offer', flags: ['orsola_read'] },
      ] },
      intro_ins_f: { text: t('Ti sembra solo stanca. Come tutti, nella valle.'), choices: [{ text: t('E la candela?'), goto: 'offer' }] },
      gossip: { text: t('«Notizie? Marcus requisisce anche i chiodi. Vesper compra bambini con le parole. E c’è un soldato nel fienile di Bertoldo che crede che nessuno lo sappia.» Abbassa la voce. «Tutti lo sanno.»'), choices: [
        { text: t('Un soldato?'), goto: 'gossip2', flags: ['knows_garrik'] },
        { text: t('E la candela alla finestra?'), goto: 'offer' },
        BYE(),
      ] },
      gossip2: { text: t('«Un disertore. Si chiama Garrik. Porta da mangiare solo ai bambini, e i bambini non parlano.» Fa spallucce. «Se la Capitale lo trova, impiccano lui e chi l’ha nascosto.»'), choices: [
        { text: t('E la candela?'), goto: 'offer' }, BYE(),
      ] },
      offer: { text: t('Il sorriso le cade dalla faccia. «Wren. Mia figlia. Diciassette anni e la testa piena di lapidi. È scesa nel Cimitero dei Traditi tre notti fa: diceva che lì sotto qualcuno chiamava il suo nome.» Ti guarda per la prima volta davvero. «Tu scendi laggiù. Riportamela.»'), choices: [
        { text: t('La troverò. Te lo prometto.'), goto: 'accept', quest: { id: 'wren', stage: 1 }, effect: { factions: { contadini: 3 }, nature: 'protect' }, approval: { kael: 4, lyra: 6 } },
        { text: t('Cosa ci guadagno?'), goto: 'haggle' },
        { text: t('Pagami prima. Il dolore non è una valuta.'), check: { skill: 'intimidire', dc: 12 }, goto: 'accept_pay', fail: 'haggle_fail', approval: { lyra: -5 } },
        { text: t('Non posso promettere niente.'), goto: 'end', approval: { kael: -2 } },
      ] },
      haggle: { text: t('«Tutto quello che ho è dietro questo bancone.» Spinge verso di te un sacchetto. «Cenere. E il mio silenzio, quando la Capitale fa domande.»'), choices: [
        { text: t('Accetto. Troverò Wren.'), goto: 'accept', quest: { id: 'wren', stage: 1 } },
        { text: t('Tienili. Mi basta sapere cosa chiamava il suo nome.'), check: { skill: 'persuasione', dc: 11 }, goto: 'lore_wren', fail: 'accept', quest: { id: 'wren', stage: 1 }, approval: { lyra: 4 } },
      ] },
      haggle_fail: { text: t('Ride, senza allegria. «Ho visto uomini più grossi di te piangere in quella sedia.» Ma ti spinge comunque il sacchetto. «Prendi. E portala a casa.»'), choices: [
        { text: t('D’accordo.'), goto: 'end', quest: { id: 'wren', stage: 1 }, effect: { res: { cenere: 40 }, factions: { contadini: -2 } } },
      ] },
      accept_pay: { text: t('Deglutisce. Svuota il cassetto senza contare. «Questi sono i risparmi di una vita. Riportala viva e ti perdono.»'), choices: [
        { text: t('Affare fatto.'), goto: 'end', quest: { id: 'wren', stage: 1 }, effect: { res: { cenere: 120 }, factions: { contadini: -4 }, nature: 'cruel', corruption: 3 } },
      ] },
      lore_wren: { text: t('«Diceva che era una voce di donna, sotto le lapidi. Che le prometteva di “tenere i nomi al caldo”.» Rabbrividisce. «Al terzo piano c’è una cripta senza nome. Lì ha lasciato il suo nastro rosso.»'), choices: [
        { text: t('Andrò fino in fondo.'), goto: 'end', effect: { xp: 30 }, flags: ['wren_hint'] },
      ] },
      accept: { text: t('«Grazie.» È solo una parola, ma la dice come chi non l’ha usata da anni. «Scendi oltre il terzo piano. Lei sarà dove i nomi sono più freschi.»'), choices: [BYE(t('Vado.'))] },
      q1: { text: t('«Niente?» chiede prima che tu apra bocca. La candela è più corta di ieri.'), choices: [
        { text: t('Non ancora. Scenderò più a fondo.'), goto: 'end' },
        { text: t('Raccontami di nuovo di Wren.'), goto: 'lore_wren', req: { noFlag: 'wren_hint' } },
      ] },
      q2: { text: t('Orsola si alza così in fretta che rovescia lo sgabello. «L’hai vista. Lo leggo nei tuoi occhi. È… è viva?»'), choices: [
        { text: t('È viva. Ha scelto di restare con i Becchini, ma ti manda questo nastro.'), goto: 'q2_truth', req: { flag: 'wren_stay' }, quest: { id: 'wren', stage: 99, outcome: t('Hai detto a Orsola la verità: Wren è rimasta tra le tombe.') }, effect: { factions: { contadini: 4, guardiani: 3 }, reliquie: 1, nature: 'protect' }, approval: { kael: 5, lyra: 5 } },
        { text: t('È qui fuori. L’ho riportata a casa.'), goto: 'q2_home', req: { flag: 'wren_home' }, quest: { id: 'wren', stage: 99, outcome: t('Hai riportato Wren da sua madre.') }, effect: { factions: { contadini: 8 }, prosperity: 10, res: { cenere: 150 }, item: 1 }, approval: { kael: 6, lyra: 8 } },
        { text: t('È morta. Non ha sofferto. (Mentire, per non spezzarle il cuore due volte)'), req: { flag: 'wren_stay' }, check: { skill: 'inganno', dc: 13 }, goto: 'q2_lie', fail: 'q2_lie_f', quest: { id: 'wren', stage: 99, outcome: t('Hai detto a Orsola che Wren era morta.') }, effect: { nature: 'silent' }, approval: { lyra: -6 } },
        { text: t('L’ho consegnata alla Signora delle Lapidi. Era il prezzo per passare.'), req: { flag: 'wren_sold' }, goto: 'q2_sold', quest: { id: 'wren', stage: 99, outcome: t('Hai venduto Wren alla Signora delle Lapidi.') }, effect: { factions: { contadini: -15 }, corruption: 10, reliquie: 2, nature: 'betray' }, approval: { kael: -10, lyra: -12 } },
      ] },
      q2_truth: { text: t('Prende il nastro rosso con due dita, come fosse vetro. Piange e ride insieme. «Ha sempre scelto da sola. Da chi credi che l’abbia preso?» Spegne la candela. «Almeno adesso so dove guardare, quando la cerco.»'), choices: [BYE(t('Sarà al sicuro, laggiù.'))] },
      q2_home: { text: t('La porta si apre. Wren entra, sporca di terra, con il nastro in mano. Nessuno dice niente per un tempo lunghissimo. Poi Orsola la stringe così forte che la ragazza ride. «La locanda è tua, portatore. Per sempre.»'), choices: [BYE(t('Accendi un’altra candela. Per festeggiare.'))] },
      q2_lie: { text: t('Ti crede. Si siede piano. «Almeno non ha sofferto.» Spegne la candela con le dita, senza sentire il calore. Non la riaccenderà più.'), choices: [BYE(t('…'))] },
      q2_lie_f: { text: t('«Bugiardo.» Lo dice senza rabbia. «Hai gli occhi di chi l’ha vista viva.» Si volta verso la finestra. «Se ha scelto di non tornare, dimmelo. Le bugie le racconto già da sola.»'), choices: [
        { text: t('Hai ragione. È viva, e ha scelto le tombe.'), goto: 'q2_truth', effect: { factions: { contadini: 2 } } },
      ] },
      q2_sold: { text: t('Orsola non urla. Prende un coltello da sotto il bancone, lo guarda, lo rimette a posto. «Esci. E non tornare mai più nella mia locanda.» Da quel giorno, la candela alla finestra è nera.'), choices: [BYE(t('…'))] },
      idle: { text: t('«Birra? Notizie? Una sedia vicino al fuoco?» Orsola ti fa posto senza chiederti nulla.'), choices: [
        { text: t('Novità nella valle?'), goto: 'gossip' },
        BYE(),
      ] },
    },
  },

  // ===================== GARRIK =====================
  garrik: {
    idle: 'idle',
    entries: [
      { node: 'intro', req: { noFlag: 'met_garrik' } },
      { node: 'q2', req: { quest: { garrik: 2 } } },
      { node: 'q1', req: { quest: { garrik: 1 } } },
      { node: 'idle' },
    ],
    nodes: {
      intro: { text: t('Una lama arrugginita ti sfiora la gola prima che i tuoi occhi si abituino al buio del fienile. «Un passo e ti apro come un sacco di grano.» La voce trema più della lama.'), choices: [
        { text: t('Abbassa l’arma. Se volessi vederti impiccato, avrei portato Marcus.'), check: { skill: 'persuasione', dc: 10 }, goto: 'calm', fail: 'fight_words' },
        { text: t('Prova. Ho visto cose peggiori di te sotto il Cimitero.'), check: { skill: 'intimidire', dc: 11 }, goto: 'cower', fail: 'fight_words', approval: { kael: 3 } },
        { text: t('Ti porto da mangiare. (Mostrare le provviste)'), req: { res: { provviste: 3 } }, goto: 'calm', effect: { res: { provviste: -3 }, nature: 'protect' }, approval: { lyra: 5 } },
        { text: t('Scusa. Ho sbagliato fienile.'), goto: 'end' },
      ] },
      fight_words: { text: t('La lama ti incide la pelle. Una goccia di sangue. Poi lui la abbassa da solo, esausto. «Non ce la faccio più a minacciare la gente. Cosa vuoi?»'), choices: [{ text: t('Parlare.'), goto: 'calm', effect: { hp: -0.05 } }] },
      cower: { text: t('Garrik indietreggia fino al muro e lascia cadere la spada. «D’accordo. D’accordo. Non sono un eroe. Non lo sono mai stato.»'), choices: [{ text: t('Allora raccontami cosa sei.'), goto: 'calm' }] },
      calm: { text: t('«Garrik. Terzo reggimento della Capitale. La notte del portale ci hanno ordinato di sbarrare le porte del villaggio alto. Con dentro la gente.» Si guarda le mani. «Io ho aperto una porta. Una sola. Poi sono scappato. Per loro sono un disertore. Per me… non so cosa sono.»'), choices: [
        { text: t('Hai salvato delle vite. Ti aiuterò a fuggire.'), goto: 'help', quest: { id: 'garrik', stage: 2 }, effect: { factions: { contadini: 2 } }, approval: { kael: 4, lyra: 6 } },
        { text: t('Chi ha dato quell’ordine?'), goto: 'order' },
        { text: t('Marcus pagherebbe bene per te.'), goto: 'threat', quest: { id: 'garrik', stage: 1 }, approval: { lyra: -4 } },
        { text: t('Io c’ero. Ti ho visto aprire quella porta.'), req: { fardello: 'silenzio' }, goto: 'witness', effect: { resonance: 2 } },
      ] },
      witness: { text: t('Garrik ti fissa a lungo. Poi crolla in ginocchio. «Allora non l’ho sognato. Allora qualcuno è uscito vivo.» Ti stringe la mano con tutte e due le sue. «Qualunque cosa ti serva. Qualunque.»'), choices: [
        { text: t('Mi serve che tu viva. Ti aiuto a fuggire.'), goto: 'help', quest: { id: 'garrik', stage: 2 }, effect: { flags: ['garrik_loyal'] } },
      ] },
      order: { text: t('«Un sigillo che non avevo mai visto. Non della Capitale. Un occhio chiuso, cucito con filo nero.» Abbassa la voce. «Le Ombre del Mercato. Qualcuno, a Hondovalle, voleva che il villaggio alto bruciasse.»'), choices: [
        { text: t('Lo scoprirò. Intanto, ti aiuto a fuggire.'), goto: 'help', quest: { id: 'garrik', stage: 2 }, flags: ['knows_sigil'], effect: { xp: 25 } },
        { text: t('Ci penserò.'), goto: 'end', quest: { id: 'garrik', stage: 1 }, flags: ['knows_sigil'] },
      ] },
      threat: { text: t('«Allora fallo.» Non scappa. «Ma ricordati che quella notte anche tu hai scelto chi lasciar bruciare.»'), choices: [
        { text: t('Ci penserò.'), goto: 'end' },
        { text: t('No. Ti aiuto.'), goto: 'help', quest: { id: 'garrik', stage: 2 } },
      ] },
      help: { text: t('«Oltre i passi del nord c’è un villaggio che non ha mai sentito parlare della Capitale. Mi servono quaranta razioni per arrivarci vivo.» Esita. «E qualcuno che distragga le pattuglie di Marcus.»'), choices: [
        { text: t('Ecco le provviste. Vai, stanotte.'), req: { res: { provviste: 40 } }, showLocked: true, goto: 'gone', quest: { id: 'garrik', stage: 99, outcome: t('Hai aiutato Garrik a fuggire oltre i passi.') }, effect: { res: { provviste: -40 }, factions: { contadini: 5, capitale: -6 }, item: 1, nature: 'protect' }, approval: { kael: 5, lyra: 6 } },
        { text: t('Torno quando le avrò.'), goto: 'end' },
      ] },
      q1: { text: t('Garrik affila la stessa lama da ore. «Hai deciso cosa fare di me?»'), choices: [
        { text: t('Ti aiuterò a fuggire.'), goto: 'help', quest: { id: 'garrik', stage: 2 } },
        { text: t('Sì. Vieni con me da Marcus.'), goto: 'sold', quest: { id: 'garrik', stage: 99, outcome: t('Hai consegnato Garrik alla Capitale.') }, effect: { factions: { capitale: 10, contadini: -6 }, res: { cenere: 300 }, nature: 'betray' }, approval: { kael: -6, lyra: -10 } },
        BYE(t('Non ancora.')),
      ] },
      q2: { text: t('«Le pattuglie si stringono. Ancora qualche notte e mi troveranno da soli.»'), choices: [
        { text: t('Ecco le provviste. Vai, stanotte.'), req: { res: { provviste: 40 } }, showLocked: true, goto: 'gone', quest: { id: 'garrik', stage: 99, outcome: t('Hai aiutato Garrik a fuggire oltre i passi.') }, effect: { res: { provviste: -40 }, factions: { contadini: 5, capitale: -6 }, item: 1, nature: 'protect' }, approval: { kael: 5, lyra: 6 } },
        { text: t('Parlerò io con Marcus: gli dirò che sei morto nelle Paludi.'), check: { skill: 'inganno', dc: 14 }, goto: 'lie_ok', fail: 'lie_fail', quest: { id: 'garrik', stage: 99, outcome: t('Hai convinto Marcus che Garrik era morto.') } },
        { text: t('Resta qui e combatti per Hondovalle. Il villaggio ha bisogno di una spada.'), req: { flag: 'garrik_loyal' }, goto: 'stays', quest: { id: 'garrik', stage: 99, outcome: t('Garrik è rimasto a difendere Hondovalle.') }, effect: { factions: { guardiani: 5 }, flags: ['garrik_guard'] }, approval: { kael: 6 } },
        BYE(t('Ci sto lavorando.')),
      ] },
      lie_ok: { text: t('Marcus ascolta il tuo racconto, annota “morto, Paludi” e chiude il registro. Quella notte Garrik parte senza voltarsi. Sulla porta del fienile trovi una spada ripulita e un biglietto: “Una porta per una porta.”'), choices: [{ text: t('…'), goto: 'end', effect: { item: 1.5, factions: { contadini: 4 } } }] },
      lie_fail: { text: t('Marcus ti guarda a lungo. «Strano. Le Paludi non restituiscono mai le piastrine.» Fa un cenno a due soldati. Quella notte il fienile brucia. Garrik non ne esce.'), choices: [{ text: t('…'), goto: 'end', effect: { factions: { capitale: -8, contadini: -3 }, dissonance: 2, corruption: 4 }, approval: { kael: -4 } }] },
      gone: { text: t('Garrik carica le razioni senza una parola. Sulla soglia si ferma. «Una porta per una porta, portatore.» Ti lascia la sua vecchia spada, ripulita per la prima volta da mesi.'), choices: [BYE(t('Buona strada.'))] },
      sold: { text: t('Garrik non oppone resistenza. Mentre i soldati lo trascinano via, ti guarda una sola volta. Marcus ti paga in monete nuove. Pesano più di quanto dovrebbero.'), choices: [BYE(t('…'))] },
      stays: { text: t('Garrik si toglie l’uniforme bruciata e la getta nel fuoco. «Allora che sia Hondovalle.» Da quella notte, le torri di guardia hanno un uomo in più che non dorme mai.'), choices: [BYE(t('Benvenuto a casa.'))] },
      idle: { text: t('Garrik ti fa un cenno dal fienile. Sembra quasi tranquillo.'), choices: [BYE()] },
    },
  },

  // ===================== SIBILLA =====================
  sibilla: {
    idle: 'idle',
    entries: [
      { node: 'intro', req: { noFlag: 'met_sibilla' } },
      { node: 'q2', req: { quest: { mappa: 1 }, floor: { paludi: 3 } } },
      { node: 'q1', req: { quest: { mappa: 1 } } },
      { node: 'offer', req: { quest: { mappa: 0 } } },
      { node: 'idle' },
    ],
    nodes: {
      intro: { text: t('Una donna con gli occhi fasciati traccia linee su una pergamena enorme. Si ferma prima che tu parli. «Hai il passo di chi è sceso nel Cimitero. Gira a sinistra al secondo piano, la prossima volta. A destra c’è qualcuno che ti conosce.»'), choices: [
        { text: t('Come fai a sapere dove sono stato?'), goto: 'how' },
        { text: t('Le tue mappe… cambiano da sole. Sono legate ai Sigilli di Krak.'), check: { skill: 'sapere', dc: 12 }, goto: 'lore', fail: 'how' },
        BYE(),
      ] },
      how: { text: t('«Ascolto. Ogni scelta nella valle fa un rumore, come un sasso in un pozzo. Le strade si spostano verso chi sceglie.» Tocca la carta. «Tu fai molto rumore, portatore.»'), choices: [{ text: t('Cosa disegni adesso?'), goto: 'offer' }] },
      lore: { text: t('Sorride per la prima volta. «Pochi lo capiscono. I Guardiani hanno costruito i Sigilli sopra le strade del Cuore. Disegnare le strade significa sapere dove i Sigilli cedono.» Ti porge una carta. «Questa ti servirà.»'), choices: [{ text: t('Grazie. Posso aiutarti?'), goto: 'offer', effect: { xp: 30, res: { intuizione: 5 } }, flags: ['sibilla_respect'] }] },
      offer: { text: t('«Nelle Paludi di Vhalzareth c’è un sentiero che non riesco a sentire. Come se qualcuno lo tenesse in silenzio.» Gira la testa verso di te. «Scendi almeno al terzo piano. Quando lo troverai, il sentiero ti parlerà. Torna a raccontarmelo.»'), choices: [
        { text: t('Lo farò.'), goto: 'end', quest: { id: 'mappa', stage: 1 }, effect: { factions: { guardiani: 2 } } },
        { text: t('Cosa c’è in cambio?'), goto: 'reward' },
        BYE(t('Non ora.')),
      ] },
      reward: { text: t('«Un posto sulla mia mappa. Chi ci finisce sopra, la valle non lo dimentica.» Una pausa. «E una reliquia dei Guardiani, se proprio vuoi qualcosa da toccare.»'), choices: [
        { text: t('Accetto.'), goto: 'end', quest: { id: 'mappa', stage: 1 } },
      ] },
      q1: { text: t('«Le Paludi tacciono ancora per me. Terzo piano, portatore. Almeno.»'), choices: [BYE(t('Ci sto andando.'))] },
      q2: { text: t('Sibilla si irrigidisce. «Lo sento su di te. Hai camminato sul sentiero muto.» Avvicina il viso al tuo, come per annusarti. «Cosa c’era alla fine?»'), choices: [
        { text: t('Un altare del Culto, costruito sopra un Sigillo spezzato.'), goto: 'q2_altar' },
        { text: t('Non c’era niente. Ed era quello il punto: qualcuno ha cancellato la strada.'), check: { skill: 'intuito', dc: 13 }, goto: 'q2_deep', fail: 'q2_altar' },
        { text: t('Non ho trovato nulla. (Tenere il segreto per te e venderlo alle Ombre)'), check: { skill: 'inganno', dc: 15 }, goto: 'q2_lie', fail: 'q2_caught' },
      ] },
      q2_altar: { text: t('«Il Culto beve dai Sigilli spezzati.» Traccia una linea rossa sulla carta. «Ora che è disegnato, i Guardiani sapranno dove colpire.»'), choices: [{ text: t('Allora la valle respira un po’ meglio.'), goto: 'end', quest: { id: 'mappa', stage: 99, outcome: t('Hai rivelato a Sibilla l’altare sul Sigillo spezzato.') }, effect: { reliquie: 1, factions: { guardiani: 6, culto: -4 }, prosperity: 6 } }] },
      q2_deep: { text: t('Sibilla resta immobile. «Cancellata. Non si cancella una strada: si cancella la memoria di chi la conosceva.» Toglie la benda: dietro non ci sono occhi, solo cicatrici a forma di sigillo. «Allora chi ha bruciato il villaggio alto voleva far dimenticare qualcosa. Non smettere di cercare.»'), choices: [{ text: t('Non smetterò.'), goto: 'end', quest: { id: 'mappa', stage: 99, outcome: t('Hai scoperto che qualcuno ha cancellato una strada di Krak.') }, flags: ['erased_road'], effect: { reliquie: 2, xp: 80, factions: { guardiani: 8 }, fragment: 'sussurro' } }] },
      q2_lie: { text: t('Sibilla annuisce lentamente. «Peccato.» Non insiste. Più tardi, Varo il mercante ti paga molto bene per un sentiero che nessun altro conosce.'), choices: [{ text: t('…'), goto: 'end', quest: { id: 'mappa', stage: 99, outcome: t('Hai venduto il segreto delle Paludi alle Ombre.') }, effect: { res: { cenere: 400 }, factions: { ombre: 8, guardiani: -6 }, nature: 'betray' } }] },
      q2_caught: { text: t('«Menti.» Lo dice con dolcezza. «Le bugie fanno un rumore stridulo, sulla carta.» Ti volta le spalle. «Torna quando vorrai dirmi la verità.»'), choices: [{ text: t('Va bene. C’era un altare del Culto.'), goto: 'q2_altar', effect: { factions: { guardiani: -2 } } }] },
      idle: { text: t('Sibilla disegna. Senza alzare la testa: «La tua strada è cambiata di nuovo. Fa’ attenzione.»'), choices: [BYE()] },
    },
  },

  // ===================== VARO =====================
  varo: {
    idle: 'idle',
    entries: [
      { node: 'intro', req: { noFlag: 'met_varo' } },
      { node: 'offer', req: { quest: { ricordi: 0 } } },
      { node: 'q1', req: { quest: { ricordi: 1 } } },
      { node: 'idle' },
    ],
    nodes: {
      intro: { text: t('Un uomo elegante, troppo elegante per Hondovalle, solleva il cappello. «Varo, al vostro servizio. Compro ciò che non vi serve più: il sapore di una mela, il nome di un amico, il giorno in cui avete avuto paura.» Agita una fiala piena di luce. «Prezzi onesti. Più o meno.»'), choices: [
        { text: t('Compri… ricordi?'), goto: 'offer' },
        { text: t('Le Ombre del Mercato. L’occhio cucito: è il vostro sigillo.'), req: { flag: 'knows_sigil' }, check: { skill: 'sapere', dc: 12 }, goto: 'sigil', fail: 'offer' },
        BYE(),
      ] },
      sigil: { text: t('Il sorriso di Varo non si muove, ma gli occhi sì. «Voi sapete troppe cose per uno che porta un solo Fardello.» Si avvicina. «Non tutte le Ombre la pensano allo stesso modo. Io, per esempio, non brucio villaggi. È pessimo per gli affari.»'), choices: [
        { text: t('Chi l’ha fatto, allora?'), goto: 'sigil2' },
      ] },
      sigil2: { text: t('«Qualcuno che voleva che la valle dimenticasse una strada. Chiedete alla cartografa cieca.» Ti mette in mano una moneta di osso. «E questo, consideratelo un acconto sulla vostra discrezione.»'), choices: [{ text: t('Accetto la moneta.'), goto: 'offer', effect: { res: { cenere: 100 }, factions: { ombre: 3 } }, flags: ['varo_ally'] }, { text: t('Tieni i tuoi soldi.'), goto: 'offer', effect: { factions: { ombre: -2, guardiani: 2 } } }] },
      offer: { text: t('«C’è un bambino, Pip. Mi ha venduto il ricordo di sua madre per una fetta di torta. Un affare per entrambi.» Mostra una fiala calda, dorata. «Ora la madre piange, e il bambino la chiama “signora”. Volete ricomprarlo? Seicento ceneri. Per voi.»'), choices: [
        { text: t('Lo ricompro.'), req: { res: { cenere: 600 } }, showLocked: true, goto: 'bought', quest: { id: 'ricordi', stage: 99, outcome: t('Hai ricomprato il ricordo di Pip.') }, effect: { res: { cenere: -600 }, factions: { contadini: 6, ombre: 2 }, prosperity: 5, nature: 'protect' }, approval: { lyra: 8, kael: 3 } },
        { text: t('È un bambino. Restituiscilo e la valle ti ricorderà come un uomo d’onore.'), check: { skill: 'persuasione', dc: 15 }, goto: 'gift', fail: 'refuse', quest: { id: 'ricordi', stage: 1 }, approval: { lyra: 4 } },
        { text: t('Ridammi la fiala o ti apro come una delle tue bottiglie.'), check: { skill: 'intimidire', dc: 14 }, goto: 'scared', fail: 'refuse', quest: { id: 'ricordi', stage: 1 }, approval: { kael: 3, lyra: -2 } },
        { text: t('Tagliare la cinghia della borsa mentre parla.'), req: { classId: 'lama' }, check: { skill: 'inganno', dc: 12 }, goto: 'stolen', fail: 'caught' },
        { text: t('Non è affar mio.'), goto: 'end', quest: { id: 'ricordi', stage: 1 }, approval: { lyra: -4 } },
      ] },
      refuse: { text: t('«Ah, i principi.» Varo ripone la fiala. «Tornate quando avrete principi e seicento ceneri. Le due cose raramente viaggiano insieme.»'), choices: [BYE()] },
      gift: { text: t('Varo ti guarda a lungo. Poi ride. «L’onore. Che moneta antiquata.» Ti lancia la fiala. «Ditegli che è da parte di uno sconosciuto. Odio i ringraziamenti.»'), choices: [{ text: t('Lo farò.'), goto: 'end', quest: { id: 'ricordi', stage: 99, outcome: t('Hai convinto Varo a restituire il ricordo di Pip.') }, effect: { factions: { contadini: 8, ombre: 4 }, xp: 60, prosperity: 5 } }] },
      scared: { text: t('Il sorriso di Varo finalmente si incrina. Ti porge la fiala con due dita. «Le Ombre non dimenticano chi le minaccia, portatore. È letteralmente il nostro mestiere.»'), choices: [{ text: t('Che si ricordino, allora.'), goto: 'end', quest: { id: 'ricordi', stage: 99, outcome: t('Hai strappato con le minacce il ricordo di Pip.') }, effect: { factions: { contadini: 6, ombre: -10 }, nature: 'cruel' } }] },
      stolen: { text: t('La fiala ti scivola in mano senza un rumore. Varo continua a parlare per un minuto buono prima di accorgersene. Quando lo fa, applaude piano. «Brava mano. Siete sprecato per gli eroismi.»'), choices: [{ text: t('…'), goto: 'end', quest: { id: 'ricordi', stage: 99, outcome: t('Hai rubato il ricordo di Pip a Varo.') }, effect: { factions: { contadini: 6, ombre: 3 }, xp: 50 } }] },
      caught: { text: t('Una mano guantata ti blocca il polso. «Che maleducazione.» Varo sospira. «Il prezzo è appena salito. Ottocento.»'), choices: [{ text: t('…'), goto: 'end', quest: { id: 'ricordi', stage: 1 }, effect: { factions: { ombre: -4 } } }] },
      q1: { text: t('«Il ricordo del piccolo Pip è ancora qui. Si sta raffreddando, sapete? I ricordi non comprati invecchiano male.»'), choices: [
        { text: t('Lo ricompro.'), req: { res: { cenere: 600 } }, showLocked: true, goto: 'bought', quest: { id: 'ricordi', stage: 99, outcome: t('Hai ricomprato il ricordo di Pip.') }, effect: { res: { cenere: -600 }, factions: { contadini: 6, ombre: 2 }, prosperity: 5 }, approval: { lyra: 8 } },
        { text: t('Ho un ricordo migliore da offrirti. (Vendere un tuo ricordo falso)'), check: { skill: 'inganno', dc: 13 }, goto: 'swap', fail: 'refuse' },
        { text: t('Ti vendo un mio ricordo vero, in cambio.'), goto: 'own', quest: { id: 'ricordi', stage: 99, outcome: t('Hai dato un tuo ricordo per salvare quello di Pip.') }, effect: { resonance: 4, influence: 3, hp: -0.1, nature: 'sacrifice' }, approval: { lyra: 10, kael: 6 } },
        BYE(),
      ] },
      swap: { text: t('Varo stappa la tua fiala e annusa. Gli occhi gli si inumidiscono. «Una madre che canta in una cucina che non è mai esistita. Magnifico. Falso, ma magnifico.» Ti dà quella di Pip ridendo. «Mi avete fregato. Lo apprezzo.»'), choices: [{ text: t('…'), goto: 'end', quest: { id: 'ricordi', stage: 99, outcome: t('Hai ingannato Varo con un ricordo falso.') }, effect: { factions: { contadini: 6, ombre: 2 }, xp: 50 } }] },
      own: { text: t('Varo appoggia una fiala vuota alla tua tempia. Senti qualcosa andarsene: un pomeriggio d’estate, una risata. Non sai più di chi. «Scambio onesto,» dice piano Varo, per una volta senza sorridere.'), choices: [BYE(t('…'))] },
      bought: { text: t('Quella sera Pip corre per la piazza gridando «Mamma!» come se fosse la prima volta. Per lui, lo è.'), choices: [BYE(t('Ne è valsa la pena.'))] },
      idle: { text: t('«Ricordi da vendere? No? Peccato. Avete un viso pieno di cose interessanti.»'), choices: [BYE()] },
    },
  },

  // ===================== NYM =====================
  nym: {
    idle: 'idle',
    entries: [
      { node: 'intro', req: { noFlag: 'met_nym' } },
      { node: 'q2', req: { quest: { nym: 1 }, floor: { torre: 3 } } },
      { node: 'kael', req: { quest: { kael: 1 }, noFlag: 'tomas_farewell' } },
      { node: 'q1', req: { quest: { nym: 1 } } },
      { node: 'idle' },
    ],
    nodes: {
      intro: { text: t('Una bambina scalza è seduta sul bordo del pozzo, i piedi sopra il vuoto. Canta senza aprire la bocca. Quando ti vede, smette. «Tu hai scelto la notte del portale,» dice con tre voci diverse. «Lui ti ha sentito.»'), choices: [
        { text: t('Chi? Chi mi ha sentito?'), goto: 'who' },
        { text: t('Guardarla bene. Ha un’ombra?'), check: { skill: 'intuito', dc: 12 }, goto: 'shadow', fail: 'who' },
        { text: t('Scendi dal pozzo. Ti farai male.'), goto: 'who', approval: { lyra: 3 } },
      ] },
      shadow: { text: t('Non ha un’ombra. La sua ombra è la valle stessa: quando lei si muove, le crepe nel terreno si muovono con lei. Un brivido ti attraversa la schiena.'), choices: [{ text: t('Chi sei?'), goto: 'who', effect: { xp: 20 } }] },
      who: { text: t('«Krak.» Lo dice come si dice “nonno”. «Non ha bocca, quindi usa la mia. È stanco. Tutti quelli che scendono gli portano un fardello e glielo lasciano sopra.» Inclina la testa. «Vuoi sentire la sua canzone? Manca una strofa.»'), choices: [
        { text: t('Cantala.'), goto: 'song' },
        { text: t('Krak non è un dio. È una memoria. Una memoria che si è dimenticata di essere viva.'), check: { skill: 'sapere', dc: 15 }, goto: 'truth_early', fail: 'song' },
        BYE(t('Non oggi.')),
      ] },
      song: { text: t('«Sotto il pozzo dorme chi non ha nome / gli diedero mille fardelli in dono / ognuno pesava come una scelta…» Si ferma di colpo. «Poi non me la ricordo. La strofa è nella Torre del Silenzio, dove la gente smette di parlare. Me la porti?»'), choices: [
        { text: t('Te la porterò.'), goto: 'end', quest: { id: 'nym', stage: 1 }, effect: { resonance: 1 } },
        { text: t('Cosa succede se completo la canzone?'), goto: 'what' },
      ] },
      what: { text: t('«Krak si ricorda il suo nome.» Sorride, e per un istante i denti sono di pietra. «E chi si ricorda il suo nome, può scegliere.»'), choices: [{ text: t('Te la porterò.'), goto: 'end', quest: { id: 'nym', stage: 1 } }] },
      truth_early: { text: t('Le tre voci tacciono. Ne resta una sola, da bambina. «Nessuno l’aveva mai capito così presto.» Ti prende la mano: è fredda come una lapide. «Allora porta la strofa. Insieme gliela ricorderemo.»'), choices: [{ text: t('Lo farò.'), goto: 'end', quest: { id: 'nym', stage: 1 }, flags: ['nym_trust'], effect: { xp: 60, res: { intuizione: 8 } } }] },
      q1: { text: t('Nym canticchia la canzone fino a dove si interrompe. Poi ricomincia. Poi ricomincia.'), choices: [BYE(t('Sto cercando la strofa.'))] },
      q2: { text: t('Nym salta giù dal pozzo prima che tu arrivi. «Ce l’hai addosso. La strofa. Cantala.»'), choices: [
        { text: t('«…e il primo fardello fu il suo stesso nome / che diede alla valle per tenerla in vita.»'), goto: 'q2_sung' },
        { text: t('Inventare una strofa diversa: una che lo tenga addormentato.'), check: { skill: 'inganno', dc: 16 }, goto: 'q2_false', fail: 'q2_sung' },
      ] },
      q2_sung: { text: t('La terra trema. Ogni crepa di Hondovalle si illumina per un istante. Nym piange con occhi di pietra. «Si chiamava Krak perché gli avevano tolto il resto del nome. Lo ha dato alla valle per tenerla viva. E noi lo abbiamo seppellito sotto i nostri fardelli.» Ti guarda. «Adesso sai. Alla fine, potrai scegliere se ridarglielo.»'), choices: [{ text: t('…'), goto: 'end', quest: { id: 'nym', stage: 99, outcome: t('Hai completato la Canzone Sotterranea. Krak ricorda di essere stato qualcuno.') }, flags: ['krak_name'], effect: { reliquie: 2, resonance: 4, xp: 120, factions: { guardiani: 6 } } }] },
      q2_false: { text: t('La tua strofa è dolce, convincente. La terra smette di tremare. Nym sbadiglia, si rannicchia sul bordo del pozzo e si addormenta. Quando torni il giorno dopo, non c’è più. La valle è più tranquilla. E più vuota.'), choices: [{ text: t('…'), goto: 'end', quest: { id: 'nym', stage: 99, outcome: t('Hai rimesso Krak a dormire con una canzone falsa.') }, flags: ['krak_sleep'], effect: { prosperity: 15, blight: -10, corruption: 5, dissonance: 3 } }] },
      kael: { text: t('Prima che tu parli, Nym si volta verso Kael. «Tuo fratello ha i piedi freddi,» dice. «Sta seduto dall’altra parte del portale e conta i giorni. Non è vivo. Ma non è nemmeno finito.»'), choices: [
        { text: t('C’è un modo per riportarlo indietro?'), goto: 'kael2' },
      ] },
      kael2: { text: t('«No.» Semplice, crudele, da bambina. «Ma c’è un modo per dirgli addio. Quando il Cuore si fermerà, il portale si aprirà un’ultima volta. Uno di voi potrà parlargli.»'), choices: [{ text: t('Lo dirò a Kael.'), goto: 'end', flags: ['tomas_farewell'] }] },
      idle: { text: t('Nym gioca con un sassolino che cade nel pozzo e risale da solo. «Lui sta ascoltando,» dice, senza guardarti.'), choices: [BYE()] },
    },
  },

  // ===================== KAEL (falò) =====================
  kael_t: {
    idle: 'idle',
    entries: [
      { node: 'farewell', req: { quest: { kael: 1 }, flag: 'tomas_farewell' } },
      { node: 'q1', req: { quest: { kael: 1 } } },
      { node: 'start', req: { quest: { kael: 0 }, level: 4 } },
      { node: 'idle' },
    ],
    nodes: {
      start: { text: t('Kael attizza il fuoco con la punta della spada. Non ti guarda. «Ogni notte sogno che Tomas bussa alla porta. Ogni notte apro, e non c’è nessuno.» Una scintilla gli finisce sulla mano. Non la scuote via. «Dimmi la verità. Pensi che sia ancora vivo, dall’altra parte?»'), choices: [
        { text: t('Io l’ho spinto. Non ti mentirò: non so cosa ci sia dall’altra parte.'), req: { fardello: 'sacrificio' }, goto: 'honest', quest: { id: 'kael', stage: 1 }, effect: { resonance: 3 }, approval: { kael: 8 } },
        { text: t('Non lo so. Ma lo scopriremo insieme.'), goto: 'together', quest: { id: 'kael', stage: 1 }, approval: { kael: 5 } },
        { text: t('Tomas ha scelto di essere vicino al sigillo. Era coraggioso. Onoralo vivendo.'), check: { skill: 'persuasione', dc: 13 }, goto: 'honor', fail: 'cold', quest: { id: 'kael', stage: 1 } },
        { text: t('È morto, Kael. Fattene una ragione.'), goto: 'cold', approval: { kael: -10 } },
      ] },
      honest: { text: t('Kael tace per molto tempo. «Lo sapevo. Che eri stato tu.» Stringe la spada. Poi la pianta nel terreno e ci si appoggia. «Grazie per non avermelo nascosto. È la prima cosa vera che qualcuno mi dice da quella notte.»'), choices: [{ text: t('Allora cerchiamo la verità. Insieme.'), goto: 'end' }] },
      together: { text: t('«Insieme.» Ripete la parola come se la assaggiasse. «Va bene. Ma se scopro che mi hai mentito, portatore, il prossimo fardello che porti sarà la mia spada.»'), choices: [BYE(t('È giusto.'))] },
      honor: { text: t('Kael abbassa la testa. «Coraggioso. Sì. Era sempre il primo a saltare nel fiume.» Sorride, appena. «Va bene. Vivrò. Ma voglio sapere cosa c’è oltre quel portale.»'), choices: [BYE(t('Lo sapremo.'))] },
      cold: { text: t('Kael si alza e se ne va dall’altra parte del fuoco. Per il resto della notte non dice una parola. Quando ti svegli, ha già fatto la guardia da solo.'), choices: [BYE(t('…'))] },
      q1: { text: t('«Hai saputo qualcosa di Tomas?» chiede Kael, ogni sera, fingendo che sia una domanda come le altre.'), choices: [
        { text: t('Non ancora. C’è una bambina al pozzo che sembra sapere cose che non dovrebbe.'), goto: 'end', req: { flag: 'met_nym' } },
        BYE(t('Non ancora.')),
      ] },
      farewell: { text: t('Gli racconti di Nym. Del portale che si aprirà un’ultima volta. Kael ascolta senza interrompere. Alla fine, guarda le fiamme. «Non vivo. Ma non finito.» Ride, piano, ed è la prima volta che lo senti ridere. «Era proprio da lui.»'), choices: [
        { text: t('Quando il portale si aprirà, sarai tu a parlargli.'), goto: 'fw_end', quest: { id: 'kael', stage: 99, outcome: t('Kael potrà dire addio a Tomas.') }, effect: { reliquie: 1 }, approval: { kael: 15 } },
        { text: t('Gli parlerò io. Devo chiedergli perdono.'), req: { fardello: 'sacrificio' }, goto: 'fw_end2', quest: { id: 'kael', stage: 99, outcome: t('Tu e Kael parlerete insieme a Tomas.') }, effect: { resonance: 4, influence: -5 }, approval: { kael: 12 } },
      ] },
      fw_end: { text: t('«Grazie.» Kael ti porge la mano. Non è perdono, non ancora. Ma è la cosa che gli somiglia di più.'), choices: [BYE(t('…'))] },
      fw_end2: { text: t('«Gli parleremo insieme,» dice Kael. «Lui avrà qualcosa da dire a tutti e due.» Per la prima volta, si siede accanto a te e non di fronte.'), choices: [BYE(t('…'))] },
      idle: { text: t('Kael pulisce la lama. «Domani scendiamo? Bene. Stavolta stai dietro di me.»'), choices: [BYE()] },
    },
  },

  // ===================== LYRA (falò) =====================
  lyra_t: {
    idle: 'idle',
    entries: [
      { node: 'start', req: { quest: { lyra: 0 }, level: 3 } },
      { node: 'q1', req: { quest: { lyra: 1 } } },
      { node: 'idle' },
    ],
    nodes: {
      start: { text: t('Lyra ha le mani nere fino ai polsi. «Febbre di cenere. Sei bambini, nella fattoria dei Bertoldo. Respirano come mantici rotti.» Si siede pesantemente. «Elara ha una cura. Lenta, sicura, costosa. E poi c’è l’altra.»'), choices: [
        { text: t('Quale altra?'), goto: 'other' },
        { text: t('Dimmi di cosa hai bisogno.'), goto: 'slow' },
      ] },
      other: { text: t('«Il sangue della Fonte. Una goccia per bambino e la febbre sparisce in un’ora.» Abbassa lo sguardo. «E per tutta la vita sentiranno la Fonte chiamarli. Il Culto li considererà suoi.»'), choices: [
        { text: t('Facciamo la cura lenta. Ti procuro ciò che serve.'), goto: 'slow' },
        { text: t('Una goccia di sangue non è una condanna. Io lo so bene.'), req: { fardello: 'sangue' }, goto: 'blood', quest: { id: 'lyra', stage: 99, outcome: t('I bambini sono stati guariti col sangue della Fonte.') }, effect: { factions: { culto: 8, guaritori: -6, contadini: 3 }, corruption: 4, nature: 'blood', resonance: 3 }, approval: { lyra: -8 } },
        { text: t('Usa il sangue. Sei bambini vivi valgono un richiamo.'), goto: 'blood', quest: { id: 'lyra', stage: 99, outcome: t('I bambini sono stati guariti col sangue della Fonte.') }, effect: { factions: { culto: 6, guaritori: -8, contadini: 2 }, corruption: 6 }, approval: { lyra: -12 } },
      ] },
      slow: { text: t('«Venti provviste per i brodi e cento ceneri per le erbe di Elara. Ogni giorno che aspettiamo, un bambino peggiora.»'), choices: [
        { text: t('Eccole.'), req: { res: { provviste: 20, cenere: 100 } }, showLocked: true, goto: 'saved', quest: { id: 'lyra', stage: 99, outcome: t('Hai pagato la cura lenta: tutti i bambini sono guariti.') }, effect: { res: { provviste: -20, cenere: -100 }, factions: { guaritori: 8, contadini: 8 }, prosperity: 8, nature: 'protect' }, approval: { lyra: 14, kael: 4 } },
        { text: t('Le troverò.'), goto: 'end', quest: { id: 'lyra', stage: 1 } },
      ] },
      q1: { text: t('«Due bambini respirano meglio. Quattro no.» Lyra non alza lo sguardo dal mortaio. «Hai le provviste?»'), choices: [
        { text: t('Eccole.'), req: { res: { provviste: 20, cenere: 100 } }, showLocked: true, goto: 'saved', quest: { id: 'lyra', stage: 99, outcome: t('Hai pagato la cura lenta: tutti i bambini sono guariti.') }, effect: { res: { provviste: -20, cenere: -100 }, factions: { guaritori: 8, contadini: 8 }, prosperity: 8, nature: 'protect' }, approval: { lyra: 14, kael: 4 } },
        { text: t('Usa il sangue della Fonte. Non c’è più tempo.'), goto: 'blood', quest: { id: 'lyra', stage: 99, outcome: t('I bambini sono stati guariti col sangue della Fonte.') }, effect: { factions: { culto: 6, guaritori: -8 }, corruption: 6 }, approval: { lyra: -12 } },
        BYE(t('Ci sto lavorando.')),
      ] },
      saved: { text: t('Tre giorni dopo, sei bambini rincorrono le galline nel cortile dei Bertoldo. Lyra li guarda con gli occhi lucidi. «Lo sai cosa mi ha insegnato Elara? Che a volte la cura giusta è solo quella che ti costa di più.» Ti appoggia la testa sulla spalla, solo per un attimo.'), choices: [BYE(t('…'))] },
      blood: { text: t('In un’ora la febbre se ne va. Sei bambini dormono tranquilli. Sulla nuca di ognuno, un piccolo segno rosso a forma di goccia. Lyra lava le fiale in silenzio, tre volte, anche se sono già pulite.'), choices: [BYE(t('…'))] },
      idle: { text: t('Lyra ti controlla le ferite senza chiedere permesso. «Respiri ancora. Bene. Continua così.»'), choices: [BYE()] },
    },
  },
};

// ------------------------------------------------------------
// Eventi di dungeon legati alle missioni (agganciati agli EVENTS)
// ------------------------------------------------------------

// ------------------------------------------------------------
// Contenuti dei Cicli successivi (personaggi, missioni, righe nuove)
// ------------------------------------------------------------
TALKERS.push(...CYCLE_TALKERS);
Object.assign(QUESTS, CYCLE_QUESTS);
Object.assign(DIALOGUES, CYCLE_DIALOGUES);
for (const [npc, add] of Object.entries(CYCLE_ENTRIES)) {
  const d = DIALOGUES[npc];
  if (!d) continue;
  d.entries.unshift(add.entry);
  Object.assign(d.nodes, add.nodes);
}
