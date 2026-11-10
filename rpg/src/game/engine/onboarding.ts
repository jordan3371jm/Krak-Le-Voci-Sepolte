import { t } from '../../i18n';
// ============================================================
// Onboarding: sblocchi progressivi, guida a obiettivi, codex dei sistemi.
// All'inizio esiste solo la Notte del Portale; schede e sistemi si aprono
// man mano che servono. La guida dice COSA si può fare, mai COSA scegliere.
// ============================================================
import type { GameState, Resources, TabId } from '../types';
import { addRes, stat, toast } from './state';
import { totalBuildings } from './village';

export interface UnlockDef {
  id: string;
  kind: 'tab' | 'feature';
  name: string;
  icon: string;
  cond: (s: GameState) => boolean;
  codex: string;
}

export const UNLOCKS: UnlockDef[] = [
  { id: 'villaggio', kind: 'tab', name: t('Villaggio'), icon: 'villaggio', cond: s => !!s.fardello,
    codex: t('Hondovalle Bassa è la tua base. Raccogli a mano, costruisci edifici e lascia che producano risorse da soli: il villaggio lavora anche quando il gioco è chiuso.') },
  { id: 'f_edifici', kind: 'feature', name: t('Edifici'), icon: 'segheria', cond: s => s.res.legno >= 5 || totalBuildings(s) > 0 || s.res.cenere >= 12,
    codex: t('Ogni edificio produce una risorsa al secondo. Ogni copia costa il 15% in più della precedente. A 5, 15, 30, 60 e 100 copie compaiono miglioramenti che raddoppiano la produzione.') },
  { id: 'f_produzione', kind: 'feature', name: t('Produzione'), icon: 'bottega', cond: s => totalBuildings(s) >= 2,
    codex: t('Qui vedi quanto produce il villaggio al minuto. Imprese, Memorie, carte e stato della Valle moltiplicano la produzione.') },
  { id: 'discesa', kind: 'tab', name: t('Discesa'), icon: 'discesa', cond: s => (s.village.buildings.segheria || 0) >= 1 || (s.village.buildings.capanna || 0) >= 1 || (s.totals.delves || 0) > 0 || !!s.delve,
    codex: t('I dungeon sono specchi del tuo Fardello. Scendere costa 1 Provvista per piano. Ciò che trovi finisce nella Bisaccia: è tuo solo se torni in superficie. Se cadi, ne perdi tre quarti. Ogni 5 piani c\'è un boss.') },
  { id: 'eroe', kind: 'tab', name: t('Eroe'), icon: 'eroe', cond: s => (s.totals.kills || 0) >= 1 || s.inventory.length > 0,
    codex: t('Equipaggiamento in 7 slot, con rarità da Comune ad Ancestrale. Puoi potenziare, smontare, vendere e forgiare. Ogni livello dà un Punto Talento per le Vie (Culto, Capitale, Contadini, Rivolta).') },
  { id: 'diario', kind: 'tab', name: t('Diario'), icon: 'diario', cond: s => (s.totals.delves || 0) >= 1,
    codex: t('Forziere e missioni giornaliere, i sogni del Salvataggio Vivente, le imprese (+2% produzione ciascuna), il bestiario e la cronaca di tutto ciò che la valle ricorda.') },
  { id: 'f_stagno', kind: 'feature', name: t('Stagno delle Voci'), icon: 'pesca', cond: s => (s.totals.delves || 0) >= 1,
    codex: t('Tocca l\'acqua, aspetta che l\'esca affondi e tocca di nuovo al momento giusto. Ogni specie ripescata è una memoria della valle: +1% produzione per sempre.') },
  { id: 'bussola', kind: 'tab', name: t('Bussola del Fato'), icon: 'bussola', cond: s => (s.totals.delves || 0) >= 2 || s.stars.length >= 4,
    codex: t('La mappa è una costellazione. Le scelte accendono stelle; con l\'Intuizione puoi leggerne altre. Qui trovi Promesse, Frammenti di Fato, Contratti e lo stato della valle condivisa.') },
  { id: 'f_richieste', kind: 'feature', name: t('Richieste delle Fazioni'), icon: 'fazioni', cond: s => totalBuildings(s) >= 4,
    codex: t('Le fazioni chiedono risorse. Consegnarle aumenta la loro reputazione, ma la fazione rivale ne perde un po\'.') },
  { id: 'fazioni', kind: 'tab', name: t('Fazioni'), icon: 'fazioni', cond: s => totalBuildings(s) >= 4 || (s.totals.requests || 0) > 0,
    codex: t('Otto fazioni, nessun karma unico. Ogni fazione ha una rivale. Gli stati (Ignorato, Tollerato, Fidato, Adorato, Temuto, Bandito, Marchiato) cambiano prezzi, dialoghi, eventi e finali.') },
  { id: 'f_cantastorie', kind: 'feature', name: t('Cantastorie'), icon: 'cantastorie', cond: s => totalBuildings(s) >= 6,
    codex: t('Ogni 10 minuti il cantastorie racconta la tua storia: produzione ×2 per 90 secondi.') },
  { id: 'spedizioni', kind: 'tab', name: t('Compagni'), icon: 'compagni', cond: s => s.hero.level >= 3 || (s.village.buildings.locanda || 0) > 0,
    codex: t('Kael e Lyra ti seguono nei dungeon. La loro fiducia sale quando proteggi e crolla quando li usi come scudi: sotto 25 esitano, a 0 se ne vanno. Puoi mandarli in spedizioni che durano ore reali, anche a gioco chiuso.') },
  { id: 'f_dark', kind: 'feature', name: t('Azioni di Dissonanza'), icon: 'dissonanza', cond: s => s.dissonance >= 4 || s.hero.level >= 5,
    codex: t('La Dissonanza non è solo una penalità: puoi spenderla per azioni potenti ma destabilizzanti (Patto Oscuro, Tradimento Tattico, Rogo delle Provviste). Il mondo se ne accorge.') },
  { id: 'mercato', kind: 'tab', name: t('Mercato delle Anime'), icon: 'mercato', cond: s => s.hero.level >= 4 || (s.totals.delves || 0) >= 3,
    codex: t('Si commercia destino: oggetti con una storia, Frammenti di Fato e risorse. I prezzi dipendono dalle Ombre del Mercato. Ogni scambio resta nello Storico delle Anime.') },
  { id: 'f_auto', kind: 'feature', name: t('Auto-battaglia'), icon: 'auto', cond: s => (s.totals.kills || 0) >= 12,
    codex: t('Puoi lasciare che il tuo eroe combatta da solo: usa le abilità coerenti col Fardello, l\'Eco quando è pronta e una pozione sotto la soglia scelta in Opzioni. Non usa mai azioni di Dissonanza.') },
  { id: 'f_worldboss', kind: 'feature', name: t('Boss Mondiale'), icon: 'boss', cond: s => s.hero.level >= 6,
    codex: t('Ogni giorno tutti i portatori colpiscono il Colosso di Cenere. Hai 3 tentativi da 10 round: più danni infliggi, migliori le ricompense.') },
  { id: 'veglia', kind: 'tab', name: t('La Veglia'), icon: 'compagni', cond: s => (s.totals.delves || 0) >= 1,
    codex: t('La Veglia è una notte fuori dal tempo: fino a 4 portatori, anche di altre valli, difendono insieme l\'ultimo fuoco dalle ondate dei Sepolti. Si può giocare online o da soli con le eco. Ogni 3 ondate si vota un patto di Krak.') },
  { id: 'eredita', kind: 'tab', name: t('Eredità'), icon: 'eredita', cond: s => s.hero.level >= 8 || s.cycle.n > 1 || s.reliquie >= 3,
    codex: t('Le reliquie comprano potenziamenti permanenti nel Santuario. Quando chiudi un Ciclo ottieni un finale, Memorie permanenti, e il tuo portatore diventa un\'eco che i successivi incontreranno.') },
];

export const CODEX_CORE: { id: string; name: string; icon: string; text: string; cond: (s: GameState) => boolean }[] = [
  { id: 'c_fardello', name: t('Il Fardello'), icon: 'fardello', cond: s => !!s.fardello, text: t('La tua prima scelta è diventata una cicatrice meccanica. Ogni Fardello ha un peso (leggero = agisci prima, pesante = colpisci più forte), un vantaggio, un costo, un\'Eco e un\'Ombra.') },
  { id: 'c_risonanza', name: t('Risonanza e Dissonanza'), icon: 'risonanza', cond: s => !!s.fardello, text: t('Ogni azione ha una natura (protezione, sacrificio, crudeltà, tradimento, silenzio, fede, sangue). In battaglia il bordo VERDE indica un\'azione coerente col tuo Fardello: carica la Risonanza; a barra piena sblocchi l\'Eco. Il bordo ROSSO indica un\'azione contraria: accumula Dissonanza. Nessuna scelta è sbagliata: è solo tua.') },
  { id: 'c_corruzione', name: t('Corruzione'), icon: 'corruzione', cond: s => !!s.fardello, text: t('Le azioni spietate aumentano la Corruzione, quelle protettive la riducono. Corruzione alta: nemici più forti, bottino più ricco e, oltre il 60%, un\'interfaccia che comincia a mentire (si purifica all\'Altare).') },
  { id: 'c_promesse', name: t('Promesse'), icon: 'promessa', cond: s => s.promises.length > 0, text: t('Alcune scelte creano una Promessa con una scadenza in spedizioni. Mantenuta: Risonanza e un Frammento. Infranta: Dissonanza e un Cacciatore di Promesse che ti cercherà nei dungeon.') },
  { id: 'c_bisaccia', name: t('Bisaccia e Soglia di Ritiro'), icon: 'bisaccia', cond: s => (s.totals.delves || 0) > 0 || !!s.delve, text: t('Dopo ogni piano scegli: scendere (più ricco, più rischioso) o tornare su a mettere al sicuro la bisaccia. Senza provviste puoi pegnorare salute massima futura: se torni ne recuperi metà, se cadi resta finché Elara non la scioglie.') },
  { id: 'c_combat', name: t('Combattimento'), icon: 'combat', cond: s => (s.totals.kills || 0) > 0 || !!s.combat, text: t('Scegli un\'abilità e poi il bersaglio. L\'attacco base dà Focus (◆), le abilità forti lo consumano. Gli attacchi in mischia colpiscono solo la prima fila. Sopra ogni nemico vedi la sua prossima mossa (⚠). Le pozioni non consumano il turno.') },
  { id: 'c_valle', name: t('La Valle che Respira'), icon: 'valle', cond: s => (s.totals.delves || 0) >= 2, text: t('La valle ha uno stato (Fioritura, Quiete, Tensione, Corruzione, Cenere, Eclisse, Rinascita) che cambia produzione, nemici e bottino. Lo spostano edifici, promesse, corruzione e frammenti.') },
  { id: 'c_rito', name: t('Il Rito (schermo intero)'), icon: 'rito', cond: () => true, text: t('Attivando lo schermo intero entri nel Rito: +25% Risonanza, sussurri nella musica e scelte nascoste negli eventi. Con l\'audio acceso vedi le mosse dei nemici invisibili.') },
];

export function isUnlocked(s: GameState, id: string) {
  return id === 'opzioni' || s.unlocked.includes(id);
}

export function checkUnlocks(s: GameState, silent = false) {
  for (const u of UNLOCKS) {
    if (s.unlocked.includes(u.id) || !u.cond(s)) continue;
    s.unlocked.push(u.id);
    if (silent) continue;
    if (u.kind === 'tab' && s.tab !== u.id) s.newTabs.push(u.id);
    s.codexQueue.push(u.id);
  }
}

// ------------------------------------------------------------
// Guida a obiettivi
// ------------------------------------------------------------
export interface TutorialStep { id: string; title: string; hint: string; tab?: TabId; done: (s: GameState) => boolean; reward?: Partial<Resources> & { potions?: number } }
export const TUTORIAL: TutorialStep[] = [
  { id: 'night', title: t('Affronta la Notte del Portale'), hint: t('Leggi le tre voci e scegli quella a cui rispondere. Non esiste una scelta giusta: ognuna crea un Fardello diverso.'), done: s => !!s.fardello },
  { id: 'segheria', title: t('Costruisci una Segheria'), hint: t('Nel riquadro Edifici (costa 12 cenere, ce l’hai già). Produrrà legno da sola, anche a gioco chiuso. Poi si apre la Discesa.'), tab: 'villaggio', done: s => (s.village.buildings.segheria || 0) >= 1, reward: { legno: 10 } },
  { id: 'descend', title: t('Scendi nel Cimitero dei Traditi'), hint: t('Hai già 10 provviste: apri la scheda «Discesa» e premi «Scendi». Il primo scontro ti aspetta dietro la prima porta.'), tab: 'discesa', done: s => !!s.delve || (s.totals.delves || 0) > 0 },
  { id: 'fight', title: t('Vinci il tuo primo scontro'), hint: t('Scegli una porta con le spade. In battaglia: abilità → bersaglio. Bordo verde = coerente col tuo Fardello.'), tab: 'discesa', done: s => (s.totals.kills || 0) >= 1, reward: { potions: 1 } },
  { id: 'bank', title: t('Torna in superficie con la bisaccia'), hint: t('Dopo un piano superato puoi scendere ancora o «Tornare in superficie». Ciò che hai in bisaccia è al sicuro solo quando risali.'), tab: 'discesa', done: s => (s.totals.delves || 0) >= 1, reward: { cenere: 40 } },
  { id: 'capanna', title: t('Costruisci una Capanna dei Raccoglitori'), hint: t('Le Provviste servono per scendere nei dungeon: 1 per piano.'), tab: 'villaggio', done: s => (s.village.buildings.capanna || 0) >= 1, reward: { provviste: 3 } },
  { id: 'equip', title: t('Equipaggia un oggetto'), hint: t('Apri «Eroe», tocca un oggetto e premi «Equipaggia» (o «Auto-equipaggia»).'), tab: 'eroe', done: s => Object.keys(s.hero.equipped).length > 0, reward: { ferro: 15 } },
  { id: 'village5', title: t('Fai crescere Hondovalle fino a 5 edifici'), hint: t('Bottega e Cava si sbloccano costruendo Segherie. Più edifici = più eventi e richieste.'), tab: 'villaggio', done: s => totalBuildings(s) >= 5, reward: { cenere: 60 } },
  { id: 'floor5', title: t('Sconfiggi il primo boss (piano 5)'), hint: t('Ogni 5 piani c\'è un boss. Potenzia l\'equipaggiamento e porta pozioni.'), tab: 'discesa', done: s => s.biomes.cimitero.best >= 5, reward: { cenere: 120, potions: 1 } },
  { id: 'bussola', title: t('Apri la Bussola del Fato'), hint: t('Lì trovi le tue Promesse e le stelle accese dalle tue scelte.'), tab: 'bussola', done: s => s.flags.includes('seen_bussola') || s.tab === 'bussola', reward: { intuizione: 2 } },
  { id: 'talent', title: t('Spendi un Punto Talento'), hint: t('In «Eroe» → Talenti. Ogni Via avvicina una fazione e ne allontana un\'altra.'), tab: 'eroe', done: s => s.hero.talents.length > 0, reward: { cenere: 80 } },
];

export function currentStep(s: GameState): TutorialStep | null {
  return TUTORIAL[s.tutorial] || null;
}

export function checkTutorial(s: GameState) {
  let guard = 0;
  while (guard++ < TUTORIAL.length) {
    const st = TUTORIAL[s.tutorial];
    if (!st || !st.done(s)) return;
    s.tutorial++;
    if (st.reward) {
      const { potions, ...res } = st.reward;
      addRes(s, res, false);
      if (potions) s.potions += potions;
    }
    stat(s, 'tutorialSteps');
    const next = TUTORIAL[s.tutorial];
    toast(s, next ? t('✔ {done} · Prossimo: {next}', { done: st.title, next: next.title }) : t('✔ {done} · La guida è completa: ora la valle è tua.', { done: st.title }), 'good');
  }
}

export function onboard(s: GameState, silent = false) {
  checkUnlocks(s, silent);
  checkTutorial(s);
}
