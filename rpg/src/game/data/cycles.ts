import type { Dialogue, QuestDef, Talker, DChoice } from './dialogues';
import type { NarrEvent } from './events';
import type { CompanionDef } from './core';
import { t } from '../../i18n';

// ============================================================
// CONTENUTI DEI CICLI
// Ogni nuovo Ciclo porta qualcuno di nuovo nella valle: personaggi,
// missioni, eventi e compagni che nel Ciclo precedente non c'erano.
// Il canone: Krak riapre il portale a ogni Ciclo. Solo pochi ricordano.
//   Ciclo 2+ · Teodora la Becchina e la tomba del portatore di prima
//   Ciclo 3+ · Madre Ossa, il Patto delle Radici, Tarn il disertore del Culto
//   Ciclo 4+ · Ilyas ricorda i Cicli: la cospirazione dell'Occhio Cucito
//   Ciclo 5+ · La Voce nel Pozzo, che parla a chi è tornato troppe volte
// ============================================================

const BYE = (text = t('Devo andare.')): DChoice => ({ text, goto: 'end' });

export const CYCLE_TALKERS: Talker[] = [
  { id: 'teodora', name: t('Teodora'), icon: '⚱️', title: t('Becchina dei Silenziosi'), faction: 'guardiani', tone: 'iron', appear: { cycle: 2 },
    bio: t('Scava tombe da quarant’anni. Dice di aver già sepolto te, una volta. Non scherza.') },
  { id: 'teodora_t', name: t('Teodora'), icon: '⚱️', title: t('Compagna · al fuoco del campo'), tone: 'iron', appear: { companion: 'teodora', cycle: 2 },
    bio: t('Porta una pala sulla schiena e i nomi dei morti a memoria.') },
  { id: 'madre_ossa', name: t('Madre Ossa'), icon: '🦴', title: t('Strega delle Paludi'), faction: 'eretici', tone: 'moss', appear: { cycle: 3 },
    bio: t('Vive in una capanna di radici al margine delle Paludi. Parla con gli alberi, e gli alberi rispondono.') },
  { id: 'ilyas_t', name: t('Ilyas'), icon: '🧕', title: t('Il profugo che ricorda'), tone: 'violet', appear: { cycle: 4 },
    bio: t('In ogni Ciclo qualcuno lo vende, lo salva o lo dimentica. Lui, invece, ricorda tutto.') },
  { id: 'pozzo', name: t('La Voce nel Pozzo'), icon: '🕳️', title: t('Qualcosa sotto Hondovalle'), tone: 'blood', appear: { cycle: 5 },
    bio: t('Il pozzo sopra cui si apre il portale. Da qualche Ciclo, di notte, chiama i portatori per nome.') },
];

export const CYCLE_QUESTS: Record<string, QuestDef> = {
  tomba: { id: 'tomba', title: t('La Tomba del Portatore'), giver: 'teodora', stages: {
    1: t('Teodora dice che il portatore del Ciclo precedente non riposa. La sua eco vaga nel Cimitero dei Traditi, oltre il quarto piano.'),
    2: t('Hai incontrato l’eco di chi portava il Fardello prima di te. Torna da Teodora.'),
    99: t('Il portatore di prima ha trovato il suo posto.') } },
  radici: { id: 'radici', title: t('Il Patto delle Radici'), giver: 'madre_ossa', stages: {
    1: t('Madre Ossa vuole 80 legno per la sua capanna e che tu scenda al quinto piano delle Paludi, dove il cuore della palude batte ancora.'),
    2: t('Hai visto il cuore della palude. Torna da Madre Ossa.'),
    99: t('Il Patto delle Radici è stato deciso.') } },
  occhio: { id: 'occhio', title: t('L’Occhio Cucito'), giver: 'ilyas_t', stages: {
    1: t('Ilyas dice che le Ombre del Mercato appiccano il fuoco a Hondovalle in ogni Ciclo. Chiedi a Varo dell’occhio cucito.'),
    2: t('Varo ha parlato di una stanza in cima alla Torre del Silenzio, dove l’occhio cucito tiene il registro dei Cicli. Raggiungi il quinto piano della Torre.'),
    3: t('Hai trovato il Registro dei Cicli. Torna da Ilyas.'),
    99: t('Sai chi brucia la valle a ogni Ciclo, e perché.') } },
};

export const CYCLE_COMPANIONS: CompanionDef[] = [
  { id: 'teodora', name: t('Teodora'), icon: '⚱️', role: t('Becchina'), row: 'back', base: { maxHp: 64, atk: 9, def: 5, speed: 5 }, skills: ['c_spettro', 'c_toccasana'], faction: 'guardiani',
    bio: t('Seppellisce i morti e, quando serve, li sveglia. Si unisce a te dopo la Tomba del Portatore.'), minCycle: 2, joinsByStory: 'tomba' },
  { id: 'tarn', name: t('Tarn'), icon: '⛓️', role: t('Disertore del Culto'), row: 'front', base: { maxHp: 88, atk: 12, def: 6, speed: 6 }, skills: ['c_maglio', 'c_lama_rapida'], faction: 'eretici',
    bio: t('Portava le catene per il Culto. Ora le porta per ricordarsi di non tornarci. Lo trovi nelle Paludi.'), minCycle: 3, joinsByStory: 'tarn' },
  { id: 'ilyas', name: t('Ilyas'), icon: '🧕', role: t('Profugo veggente'), row: 'back', base: { maxHp: 58, atk: 12, def: 3, speed: 10 }, skills: ['c_freccia', 'c_toccasana'],
    bio: t('Ha visto la valle bruciare troppe volte per avere ancora paura. Si unisce a te dopo l’Occhio Cucito.'), minCycle: 4, joinsByStory: 'occhio' },
];

export const CYCLE_DIALOGUES: Record<string, Dialogue> = {
  // ===================== TEODORA (Ciclo 2+) =====================
  teodora: {
    idle: 'idle',
    entries: [
      { node: 'done', req: { quest: { tomba: 2 } } },
      { node: 'q1', req: { quest: { tomba: 1 } } },
      { node: 'intro', req: { quest: { tomba: 0 } } },
      { node: 'idle' },
    ],
    nodes: {
      intro: { text: t('Una donna anziana pulisce una pala come fosse una spada. Ti guarda a lungo. «Ti conosco. No, non te. Quello che c’era prima di te. {legacy}. L’ho sepolto io, a modo mio.» Si appoggia al manico. «Solo che non è rimasto sepolto.»'), choices: [
        { text: t('Come fai a ricordarlo? Nessuno ricorda il Ciclo precedente.'), goto: 'why' },
        { text: t('Cosa vuol dire che non è rimasto sepolto?'), goto: 'quest' },
        { text: t('Ascoltare il suono della pala. Osservarla.'), check: { skill: 'intuito', dc: 12 }, goto: 'read', fail: 'quest' },
        BYE(),
      ] },
      why: { text: t('«I Becchini Silenziosi non dimenticano. È il nostro voto. Quando Krak riavvolge la valle, noi teniamo i nomi.» Tocca una lapide senza nome. «Questa è la sua. Ci ho inciso il nome tre volte. Ogni mattina è di nuovo liscia.»'), choices: [{ text: t('Cosa vuole da me?'), goto: 'quest' }] },
      read: { text: t('Le sue mani hanno calli da pala e cicatrici da catena. Non è solo una becchina: è stata una Guardiana della Valle. E ha paura, ma non di te. Di quello che c’è sotto il Cimitero.'), choices: [{ text: t('Eri una Guardiana. Cosa c’è sotto il Cimitero?'), goto: 'quest', flags: ['teodora_read'], effect: { factions: { guardiani: 3 } } }] },
      quest: { text: t('«La sua eco vaga oltre il quarto piano del Cimitero dei Traditi. Chi muore portando il Fardello non va da nessuna parte: resta lì, e aspetta il prossimo.» Ti posa la pala in mano per un istante, poi la riprende. «Aspetta te. Vai a dirgli che può smettere.»'), choices: [
        { text: t('Andrò. Glielo devo.'), goto: 'end', quest: { id: 'tomba', stage: 1 }, effect: { nature: 'faith' }, approval: { kael: 3, lyra: 4 } },
        { text: t('Perché dovrei aiutare un morto?'), goto: 'quest2' },
      ] },
      quest2: { text: t('«Perché un giorno il morto sarai tu.» Lo dice senza cattiveria, come si dice che pioverà. «E vorrai che qualcuno venga a dirtelo.»'), choices: [
        { text: t('…Va bene. Andrò.'), goto: 'end', quest: { id: 'tomba', stage: 1 } },
        BYE(t('Non è affar mio.')),
      ] },
      q1: { text: t('«È ancora laggiù. Lo sento quando scavo: la terra del Cimitero è più fredda dove passa lui.»'), choices: [BYE(t('Ci sto andando.'))] },
      done: { text: t('Teodora ascolta il tuo racconto senza interrompere. Quando finisci, va alla lapide liscia e ci passa sopra il palmo. Il nome {legacy} riaffiora, inciso, come se ci fosse sempre stato. «Bene,» dice soltanto. Poi si carica la pala in spalla. «I morti li ho sistemati. Adesso tocca ai vivi. Vengo con te.»'), choices: [
        { text: t('Benvenuta, Teodora.'), goto: 'end', quest: { id: 'tomba', stage: 99, outcome: t('Teodora si unisce al tuo gruppo.') }, effect: { companion: 'teodora', reliquie: 1, factions: { guardiani: 8 } }, approval: { lyra: 4 } },
        { text: t('Il gruppo è pieno di gente che morirà. Sei sicura?'), goto: 'done2' },
      ] },
      done2: { text: t('Ride, un suono secco come terra che cade. «Ragazzo, io conosco già il posto dove li metterò.»'), choices: [
        { text: t('Allora vieni.'), goto: 'end', quest: { id: 'tomba', stage: 99, outcome: t('Teodora si unisce al tuo gruppo.') }, effect: { companion: 'teodora', reliquie: 1, factions: { guardiani: 8 } } },
      ] },
      idle: { text: t('Teodora scava. Non alza lo sguardo. «Ancora vivo? Bene. Torna quando non lo sarai più.»'), choices: [BYE()] },
    },
  },
  teodora_t: {
    idle: 'idle',
    entries: [{ node: 'story', req: { noFlag: 'teo_story' } }, { node: 'idle' }],
    nodes: {
      story: { text: t('Al fuoco, Teodora si toglie gli stivali e conta i nomi sulle dita. Quando arriva al decimo si ferma. «Questo era mio figlio. Guardiano anche lui. Il Ciclo in cui è morto, il portatore ha scelto il Culto.»'), choices: [
        { text: t('Mi dispiace.'), goto: 'story2', approval: { teodora: 5 } },
        { text: t('Quale portatore? Io?'), goto: 'story3' },
      ] },
      story2: { text: t('«Non dispiacerti. Ricordalo. È diverso.»'), onEnter: { flags: ['teo_story'] }, choices: [BYE(t('Lo ricorderò.'))] },
      story3: { text: t('Ti guarda a lungo. «No. Uno prima di te. Ma avevi i suoi stessi occhi, quando sei arrivato.»'), onEnter: { flags: ['teo_story'] }, choices: [BYE(t('…'))] },
      idle: { text: t('Teodora affila la pala. «Domani si scende. Domani qualcuno lo seppellisco.»'), choices: [BYE()] },
    },
  },

  // ===================== MADRE OSSA (Ciclo 3+) =====================
  madre_ossa: {
    idle: 'idle',
    entries: [
      { node: 'done', req: { quest: { radici: 2 } } },
      { node: 'q1', req: { quest: { radici: 1 } } },
      { node: 'intro', req: { quest: { radici: 0 } } },
      { node: 'idle' },
    ],
    nodes: {
      intro: { text: t('La capanna è fatta di radici vive che respirano. Dentro, una donna con le dita lunghe come rami intreccia capelli umani in una corona. «Terzo Ciclo, eh? Si vede. Al primo ridete, al secondo piangete, al terzo cominciate ad ascoltare.»'), choices: [
        { text: t('Tu sai dei Cicli?'), goto: 'cycles' },
        { text: t('Di chi sono quei capelli?'), goto: 'hair' },
        { text: t('Le radici si muovono. Sapere cosa sono.'), check: { skill: 'sapere', dc: 13 }, goto: 'roots', fail: 'cycles' },
      ] },
      cycles: { text: t('«Gli alberi sanno. Le radici non si riavvolgono: crescono sotto Krak, attraverso i Cicli, e ogni volta si stringono un po’ di più intorno al suo Cuore.» Sorride, i denti verdi. «Un giorno lo strangoleranno. Se qualcuno le aiuta.»'), choices: [{ text: t('Come posso aiutarle?'), goto: 'offer' }] },
      hair: { text: t('«Dei portatori come te. Uno per Ciclo. Me li lasciano come pagamento.» Ne accarezza una ciocca. «Questa era di {legacy}. Aveva bei capelli, e pessime idee.»'), choices: [{ text: t('Cosa vuoi da me, allora?'), goto: 'offer' }] },
      roots: { text: t('Non sono radici di albero. Sono vene. Vene di Krak, pietrificate e coperte di muschio, che la strega ha piegato come si piega un cane. Stai guardando un pezzo del Cuore, addomesticato.'), choices: [{ text: t('Hai addomesticato un pezzo di Krak?'), goto: 'offer', flags: ['ossa_veins'], effect: { factions: { eretici: 3 } } }] },
      offer: { text: t('«Portami ottanta legno: la capanna deve crescere. E scendi al quinto piano delle Paludi. Lì c’è il cuore della palude, un pezzo di Krak che batte ancora. Decidi tu cosa farne. Io voglio solo sapere cosa sceglierai.»'), choices: [
        { text: t('Affare fatto.'), goto: 'end', quest: { id: 'radici', stage: 1 } },
        { text: t('E io cosa ci guadagno?'), goto: 'gain' },
        BYE(),
      ] },
      gain: { text: t('«Una corona.» Ti mostra quella di capelli. «Non questa. Una migliore. Fatta di quello che troverai laggiù.»'), choices: [{ text: t('Va bene.'), goto: 'end', quest: { id: 'radici', stage: 1 } }, BYE()] },
      q1: { text: t('«Ottanta legno, e il cuore della palude. Le radici aspettano. Hanno pazienza: io meno.»'), choices: [
        { text: t('Ecco il legno.'), req: { res: { legno: 80 } }, showLocked: true, goto: 'q1b', effect: { res: { legno: -80 } }, flags: ['ossa_wood'] },
        BYE(),
      ] },
      q1b: { text: t('Le radici si allungano, prendono il legno e lo inghiottono. La capanna cresce di una stanza sotto i tuoi occhi. «Brav’ ospite. Ora il cuore.»'), choices: [BYE()] },
      done: { text: t('Madre Ossa ascolta, le dita ferme sulla corona. «Hai visto il cuore e sei tornato. Non tutti tornano.» Si alza. «Ora decidi. Le mie radici possono stringere quel cuore fino a farlo tacere, ma servirà tempo e servirà qualcuno che le nutra. Oppure puoi prendere il suo battito per te.»'), choices: [
        { text: t('Nutri le radici. Che strangolino Krak, un Ciclo alla volta.'), goto: 'end', req: { flag: 'ossa_wood' }, showLocked: true, quest: { id: 'radici', stage: 99, outcome: t('Le radici di Madre Ossa stringono il Cuore di Krak.') }, effect: { blight: -15, prosperity: 10, factions: { eretici: 10 }, resonance: 3, nature: 'faith', reliquie: 1 } },
        { text: t('Dammi il battito. Lo porterò io.'), goto: 'end', quest: { id: 'radici', stage: 99, outcome: t('Hai preso il battito della palude.') }, effect: { influence: 10, corruption: 10, item: 3, nature: 'blood' }, approval: { lyra: -6 } },
        { text: t('Nessuno dei due. Il cuore resta dov’è.'), goto: 'end', quest: { id: 'radici', stage: 99, outcome: t('Il cuore della palude batte ancora, intatto.') }, effect: { nature: 'silent', xp: 60 } },
      ] },
      idle: { text: t('Madre Ossa intreccia. «Le radici ti salutano. Io no.»'), choices: [BYE()] },
    },
  },

  // ===================== ILYAS (Ciclo 4+) =====================
  ilyas_t: {
    idle: 'idle',
    entries: [
      { node: 'done', req: { quest: { occhio: 3 } } },
      { node: 'q', req: { quest: { occhio: 1 } } },
      { node: 'q', req: { quest: { occhio: 2 } } },
      { node: 'intro', req: { quest: { occhio: 0 } } },
      { node: 'idle' },
    ],
    nodes: {
      intro: { text: t('Un ragazzo magro, con gli occhi troppo vecchi per la sua faccia, ti aspetta davanti alla locanda. «Ilyas,» dice, prima che tu possa chiederlo. «Il profugo. Quello che vendi, salvi o dimentichi. In questo Ciclo cosa farai, {name}? No, non rispondere. Me lo dirai comunque.»'), choices: [
        { text: t('Tu ricordi i Cicli?'), goto: 'remember' },
        { text: t('Non ti venderò.'), goto: 'promise', approval: { lyra: 4 } },
        { text: t('Cosa vuoi?'), goto: 'want' },
      ] },
      remember: { text: t('«Tutti. Quattro volte ho visto la valle bruciare. Quattro volte la stessa figura con l’occhio cucito sul mantello, che si allontana tra le fiamme prima che il portale si apra.»'), choices: [{ text: t('Le Ombre del Mercato.'), goto: 'want' }] },
      promise: { text: t('Ride, senza allegria. «Lo hanno detto anche gli altri. {legacy} l’ha detto con la mano sul cuore.» Poi si fa serio. «Non voglio promesse. Voglio una verità.»'), choices: [{ text: t('Quale verità?'), goto: 'want' }] },
      want: { text: t('«Chi appicca il fuoco, ogni volta. E perché il fuoco viene prima del portale, e non dopo. Chiedi a Varo dell’occhio cucito: è il loro sigillo, e lui mente meglio di tutti, il che vuol dire che sa più di tutti.»'), choices: [
        { text: t('Lo scoprirò.'), goto: 'end', quest: { id: 'occhio', stage: 1 } },
        BYE(t('Non ho tempo per i fantasmi dei Cicli.')),
      ] },
      q: { text: t('«Il fuoco viene prima del portale,» ripete Ilyas, come una preghiera. «Ricordalo. È l’unica cosa che conta.»'), choices: [BYE()] },
      done: { text: t('Gli mostri le pagine del Registro dei Cicli. Ilyas le legge in silenzio, una per una, finché trova il proprio nome. Accanto, in ogni Ciclo, la stessa parola: “venduto”, “salvato”, “dimenticato”. Chiude il libro. «Le Ombre non bruciano la valle per Krak. La bruciano perché ogni Ciclo il prezzo dei ricordi sale.» Ti guarda. «Questa volta, voglio scegliere io cosa scrivono accanto al mio nome.»'), choices: [
        { text: t('Allora scrivilo camminando con me.'), goto: 'end', quest: { id: 'occhio', stage: 99, outcome: t('Ilyas si unisce al tuo gruppo.') }, effect: { companion: 'ilyas', reliquie: 2, factions: { ombre: -15, contadini: 6 } }, approval: { lyra: 6, kael: 3 } },
        { text: t('Venderò il Registro alle Ombre. Pagheranno qualsiasi cifra.'), goto: 'end', quest: { id: 'occhio', stage: 99, outcome: t('Hai venduto il Registro dei Cicli alle Ombre.') }, effect: { res: { cenere: 1200 }, factions: { ombre: 20, contadini: -10 }, nature: 'betray', corruption: 8 }, approval: { lyra: -10, kael: -6 } },
      ] },
      idle: { text: t('Ilyas guarda il pozzo. «Ogni Ciclo è un po’ più profondo. Te ne sei accorto?»'), choices: [BYE()] },
    },
  },

  // ===================== LA VOCE NEL POZZO (Ciclo 5+) =====================
  pozzo: {
    idle: 'idle',
    entries: [{ node: 'intro', req: { noFlag: 'pozzo_gift' } }, { node: 'idle' }],
    nodes: {
      intro: { text: t('Di notte ti affacci al pozzo. Dall’acqua nera sale la tua voce, ma più vecchia. «{name}. Ciclo {cycle}. Sei tornato di nuovo.» Una pausa lunga. «Ogni volta che ricominci, io divento un po’ più sveglio. Lo sai, vero?»'), choices: [
        { text: t('Chi sei?'), goto: 'who' },
        { text: t('Allora smetterò di tornare.'), goto: 'stop' },
        { text: t('Cosa vuoi in cambio di un dono?'), goto: 'gift' },
      ] },
      who: { text: t('«Sono quello che resta quando la valle si riavvolge. Le scelte che nessuno ricorda finiscono qui, in fondo. Io sono fatto di tutte le tue scelte, {name}. Di tutti i tuoi Cicli.»'), choices: [{ text: t('Allora dammi qualcosa di mio.'), goto: 'gift' }, BYE()] },
      stop: { text: t('La voce ride, e l’acqua trema. «No. Non smetterai. Nessuno smette. È questo che mi nutre.»'), choices: [{ text: t('Allora dammi qualcosa per il viaggio.'), goto: 'gift' }, BYE()] },
      gift: { text: t('«Posso restituirti un pezzo di ciò che hai perso nei Cicli precedenti. Scegli quale.»'), choices: [
        { text: t('La forza: restituiscimi le reliquie che ho speso.'), goto: 'end', flags: ['pozzo_gift'], effect: { reliquie: 3, corruption: 5 } },
        { text: t('La memoria: fammi ricordare la mappa.'), goto: 'end', flags: ['pozzo_gift'], effect: { res: { intuizione: 8 }, xp: 120 } },
        { text: t('La pace: prendi un po’ del mio Fardello.'), goto: 'end', flags: ['pozzo_gift'], effect: { influence: -15, dissonance: -3, resonance: 3 } },
        { text: t('Niente. Non prendo nulla da te.'), goto: 'refuse' },
      ] },
      refuse: { text: t('Silenzio. Poi, piano: «Interessante. Nessuno aveva mai rifiutato.» L’acqua torna immobile. Senti di aver fatto qualcosa che Krak non si aspettava.'), onEnter: { flags: ['pozzo_gift', 'pozzo_refused'], effect: { resonance: 4 } }, choices: [BYE(t('…'))] },
      idle: { text: t('Il pozzo tace. Ma senti che ti sta ascoltando.'), choices: [BYE()] },
    },
  },
};

// Righe nuove per i personaggi di sempre, che si accorgono dei Cicli
export const CYCLE_ENTRIES: Record<string, { entry: { node: string; req?: import('./dialogues').DReq }; nodes: Dialogue['nodes'] }> = {
  orsola: {
    entry: { node: 'cyc', req: { cycle: 2, noFlag: 'orsola_cyc' } },
    nodes: {
      cyc: { text: t('Orsola si blocca con il boccale a mezz’aria. «Strano. Ho sognato una persona come te, morta sul mio pavimento. Si chiamava {legacy}.» Scuote la testa. «I sogni, a Hondovalle, a volte sono ricordi che arrivano in ritardo.»'), onEnter: { flags: ['orsola_cyc'] }, choices: [
        { text: t('Raccontami il sogno.'), goto: 'cyc2' },
        { text: t('Era un sogno. Niente di più.'), goto: 'end' },
      ] },
      cyc2: { text: t('«Pioveva cenere. Ti… gli ho chiuso gli occhi. Prima di morire ha detto: “dite al prossimo di non fidarsi del pozzo”.» Si asciuga le mani, troppo a lungo. «Ecco. L’ho detto. Ora non chiedermi altro.»'), onEnter: { flags: ['warned_pozzo'] }, choices: [BYE(t('Grazie, Orsola.'))] },
    },
  },
  nym: {
    entry: { node: 'cyc', req: { cycle: 3, noFlag: 'nym_cyc' } },
    nodes: {
      cyc: { text: t('Nym ti prende la mano e la gira, come per leggerla. «Sei la terza volta che vieni. Le altre due avevi un altro nome.» Ti guarda dal basso. «Non preoccuparti. Anche io ne ho avuti tanti.»'), onEnter: { flags: ['nym_cyc'] }, choices: [
        { text: t('Quanti Cicli hai visto, Nym?'), goto: 'cyc2' },
        BYE(t('…')),
      ] },
      cyc2: { text: t('Conta sulle dita. Finisce le dita. Ricomincia. «Più di quelli che sai contare tu. Ma meno di quelli che conta Krak.»'), choices: [BYE()] },
    },
  },
  varo: {
    entry: { node: 'occhio', req: { quest: { occhio: 1 } } },
    nodes: {
      occhio: { text: t('Varo smette di sorridere quando nomini l’occhio cucito. «Il ragazzo vi ha mandato da me. Naturalmente.» Si guarda intorno. «Non qui. In cima alla Torre del Silenzio, al quinto piano, c’è la stanza dove le Ombre tengono il Registro dei Cicli. Cosa ci troverete, non è affar mio.»'), choices: [
        { text: t('Perché me lo dici?'), goto: 'why' },
        { text: t('Grazie, Varo.'), goto: 'end', quest: { id: 'occhio', stage: 2 } },
      ] },
      why: { text: t('«Perché anche il mio nome è in quel registro. E non mi piace la parola che c’è accanto.» Rimette il cappello. «Andate, prima che cambi idea.»'), choices: [{ text: t('Vado.'), goto: 'end', quest: { id: 'occhio', stage: 2 } }] },
    },
  },
};

export const CYCLE_EVENTS: NarrEvent[] = [
  {
    id: 'eco_portatore_prec', title: t('L’Eco di chi c’era prima'), icon: '👤', where: ['cimitero'], once: true, minFloor: 4, priority: true,
    cond: s => (s.quests.tomba?.stage ?? 0) === 1,
    text: t('Tra le lapidi, una figura con il tuo stesso Fardello sulle spalle. Il volto è sfocato, come una moneta consumata. «Sei tu il prossimo?» dice l’eco di {legacy}. «Allora sai già come finisce.»'),
    choices: [
      { text: t('Ascoltare la sua ultima volontà.'), effect: { quest: { id: 'tomba', stage: 2 }, resonance: 3, reliquie: 1, nature: 'faith', xp: 60 }, result: t('L’eco ti sussurra dove ha nascosto la sua ultima reliquia. Poi sorride, sollevato, e comincia a svanire. «Fai meglio di me.»') },
      { text: t('Prendere la sua arma. A lui non serve più.'), effect: { quest: { id: 'tomba', stage: 2 }, item: 3, nature: 'cruel', corruption: 4 }, result: t('La lama è fredda e pesante di ricordi. L’eco ti guarda prenderla, senza rabbia. «Anche io l’avevo presa a qualcuno.»') },
      { text: t('Dirgli che può smettere di aspettare.'), effect: { quest: { id: 'tomba', stage: 2 }, corruption: -10, dissonance: -2, nature: 'protect', xp: 60 }, result: t('L’eco chiude gli occhi. Per la prima volta da un Ciclo intero, si siede. Poi non c’è più.') },
    ],
  },
  {
    id: 'cuore_palude', title: t('Il Cuore della Palude'), icon: '🫀', where: ['paludi'], once: true, minFloor: 5, priority: true,
    cond: s => (s.quests.radici?.stage ?? 0) === 1,
    text: t('Sotto l’acqua rossa, un cuore grande come una botte batte lentamente. Le radici di Madre Ossa lo circondano, ma non lo toccano. Aspettano te.'),
    choices: [
      { text: t('Toccarlo per sentire cosa sogna.'), effect: { quest: { id: 'radici', stage: 2 }, res: { intuizione: 3 }, corruption: 3 }, result: t('Il cuore sogna una valle senza portatori. È il sogno più triste che tu abbia mai sentito.') },
      { text: t('Segnarlo per le radici, senza toccarlo.'), effect: { quest: { id: 'radici', stage: 2 }, resonance: 2 }, result: t('Leghi un filo d’erba intorno a una radice. Le radici fremono. Hanno capito.') },
    ],
  },
  {
    id: 'tarn_catene', title: t('Il Prigioniero in Catene'), icon: '⛓️', where: ['paludi'], once: true, minFloor: 3,
    cond: s => s.cycle.n >= 3 && !s.companions.find(c => c.id === 'tarn')?.recruited,
    text: t('Un uomo enorme, incatenato a un palo nel fango, con il simbolo del Culto bruciato sul petto e poi cancellato a coltellate. «Mi chiamo Tarn. Ho disertato. Lasciatemi qui e il Culto tornerà a prendermi stanotte.»'),
    choices: [
      { text: t('Spezzare le catene. Vieni con me.'), effect: { companion: 'tarn', factions: { culto: -8, eretici: 6 }, nature: 'protect' }, result: t('Le catene cadono. Tarn si alza, più alto di quanto pensassi. «Ti devo una vita. Le pago sempre, le vite.» Tarn si unisce a te.') },
      { text: t('Consegnarlo a Vesper.'), effect: { factions: { culto: 12 }, satchel: { cenere: 150 }, nature: 'betray', corruption: 5 }, result: t('Tarn non urla quando lo portano via. Ti guarda soltanto, come si guarda qualcuno che si è già visto morire.') },
      { text: t('Lasciarlo dov’è.'), effect: { nature: 'silent' }, result: t('Ti allontani. Alle tue spalle, Tarn ricomincia a tirare le catene, con calma, come ha fatto per giorni.') },
    ],
  },
  {
    id: 'registro_cicli', title: t('Il Registro dei Cicli'), icon: '📕', where: ['torre'], once: true, minFloor: 5, priority: true,
    cond: s => (s.quests.occhio?.stage ?? 0) === 2,
    text: t('Una stanza circolare, senza finestre. Su un leggio, un libro enorme con un occhio cucito sulla copertina. Ogni pagina è un Ciclo. Ogni riga è una scelta. Trovi la pagina di {legacy}. Poi trovi la tua, già cominciata.'),
    choices: [
      { text: t('Strappare le pagine e portarle a Ilyas.'), effect: { quest: { id: 'occhio', stage: 3 }, factions: { ombre: -10 }, nature: 'protect', xp: 80 }, result: t('Le pagine si strappano con un suono di ossa. Da qualche parte nella Torre, qualcuno grida.') },
      { text: t('Leggere la tua pagina fino in fondo.'), effect: { quest: { id: 'occhio', stage: 3 }, res: { intuizione: 5 }, influence: 8 }, result: t('L’ultima riga della tua pagina è ancora vuota. Accanto, a matita, qualcuno ha scritto: “vedremo”.') },
    ],
  },
  {
    id: 'ciclo_nuovo', title: t('Hondovalle non è più la stessa'), icon: '🌒', where: 'village', once: true,
    cond: s => s.cycle.n >= 2 && (s.totals.delves || 0) >= 1,
    text: t('Il villaggio è di nuovo in piedi, come se niente fosse successo. Ma qualcosa è diverso: la locanda ha una finestra in più, le lapidi del Cimitero sono girate verso il pozzo, e qualcuno ha inciso sul muro della piazza un nome. {legacy}.'),
    choices: [
      { text: t('Lasciare il nome dov’è.'), effect: { resonance: 2, nature: 'faith' }, result: t('Il nome resta. Ogni tanto, passando, qualcuno ci posa un fiore.') },
      { text: t('Cancellarlo. Questo Ciclo è mio.'), effect: { influence: 6, nature: 'cruel' }, result: t('Gratti via le lettere con il coltello. La notte, sogni qualcuno che ti chiede perché.') },
    ],
  },
];
