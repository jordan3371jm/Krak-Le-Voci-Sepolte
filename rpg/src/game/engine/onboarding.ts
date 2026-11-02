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
  { id: 'villaggio', kind: 'tab', name: 'Villaggio', icon: 'villaggio', cond: s => !!s.fardello,
    codex: 'Hondovalle Bassa è la tua base. Raccogli a mano, costruisci edifici e lascia che producano risorse da soli: il villaggio lavora anche quando il gioco è chiuso.' },
  { id: 'f_edifici', kind: 'feature', name: 'Edifici', icon: 'segheria', cond: s => s.res.legno >= 5 || totalBuildings(s) > 0 || s.res.cenere >= 12,
    codex: 'Ogni edificio produce una risorsa al secondo. Ogni copia costa il 15% in più della precedente. A 10, 25, 50 e 100 copie compaiono miglioramenti che raddoppiano la produzione.' },
  { id: 'f_volti', kind: 'feature', name: 'Volti di Hondovalle', icon: 'compagni', cond: s => totalBuildings(s) >= 1,
    codex: 'Elara, Marcus e Vesper ricordano le tue scelte. Le loro parole cambiano con la reputazione della loro fazione, con il tuo nome e con ciò che sei diventato.' },
  { id: 'f_produzione', kind: 'feature', name: 'Produzione', icon: 'bottega', cond: s => totalBuildings(s) >= 2,
    codex: 'Qui vedi quanto produce il villaggio al minuto. Imprese, Memorie, carte e stato della Valle moltiplicano la produzione.' },
  { id: 'discesa', kind: 'tab', name: 'Discesa', icon: 'discesa', cond: s => (s.village.buildings.capanna || 0) >= 1 || (s.totals.delves || 0) > 0,
    codex: 'I dungeon sono specchi del tuo Fardello. Scendere costa 1 Provvista per piano. Ciò che trovi finisce nella Bisaccia: è tuo solo se torni in superficie. Se cadi, ne perdi tre quarti. Ogni 5 piani c\'è un boss.' },
  { id: 'eroe', kind: 'tab', name: 'Eroe', icon: 'eroe', cond: s => (s.totals.kills || 0) >= 1 || s.inventory.length > 0,
    codex: 'Equipaggiamento in 7 slot, con rarità da Comune ad Ancestrale. Puoi potenziare, smontare, vendere e forgiare. Ogni livello dà un Punto Talento per le Vie (Culto, Capitale, Contadini, Rivolta).' },
  { id: 'diario', kind: 'tab', name: 'Diario', icon: 'diario', cond: s => (s.totals.delves || 0) >= 1,
    codex: 'Forziere e missioni giornaliere, i sogni del Salvataggio Vivente, le imprese (+2% produzione ciascuna), il bestiario e la cronaca di tutto ciò che la valle ricorda.' },
  { id: 'f_stagno', kind: 'feature', name: 'Stagno delle Voci', icon: 'pesca', cond: s => (s.totals.delves || 0) >= 1,
    codex: 'Tocca l\'acqua, aspetta che l\'esca affondi e tocca di nuovo al momento giusto. Ogni specie ripescata è una memoria della valle: +1% produzione per sempre.' },
  { id: 'bussola', kind: 'tab', name: 'Bussola del Fato', icon: 'bussola', cond: s => (s.totals.delves || 0) >= 2 || s.stars.length >= 4,
    codex: 'La mappa è una costellazione. Le scelte accendono stelle; con l\'Intuizione puoi leggerne altre. Qui trovi Promesse, Frammenti di Fato, Contratti e lo stato della valle condivisa.' },
  { id: 'f_richieste', kind: 'feature', name: 'Richieste delle Fazioni', icon: 'fazioni', cond: s => totalBuildings(s) >= 4,
    codex: 'Le fazioni chiedono risorse. Consegnarle aumenta la loro reputazione, ma la fazione rivale ne perde un po\'.' },
  { id: 'fazioni', kind: 'tab', name: 'Fazioni', icon: 'fazioni', cond: s => totalBuildings(s) >= 5 || (s.totals.requests || 0) > 0,
    codex: 'Otto fazioni, nessun karma unico. Ogni fazione ha una rivale. Gli stati (Ignorato, Tollerato, Fidato, Adorato, Temuto, Bandito, Marchiato) cambiano prezzi, dialoghi, eventi e finali.' },
  { id: 'f_cantastorie', kind: 'feature', name: 'Cantastorie', icon: 'cantastorie', cond: s => totalBuildings(s) >= 6,
    codex: 'Ogni 10 minuti il cantastorie racconta la tua storia: produzione ×2 per 90 secondi.' },
  { id: 'spedizioni', kind: 'tab', name: 'Compagni', icon: 'compagni', cond: s => s.hero.level >= 3 || (s.village.buildings.locanda || 0) > 0,
    codex: 'Kael e Lyra ti seguono nei dungeon. La loro fiducia sale quando proteggi e crolla quando li usi come scudi: sotto 25 esitano, a 0 se ne vanno. Puoi mandarli in spedizioni che durano ore reali, anche a gioco chiuso.' },
  { id: 'f_dark', kind: 'feature', name: 'Azioni di Dissonanza', icon: 'dissonanza', cond: s => s.dissonance >= 4 || s.hero.level >= 5,
    codex: 'La Dissonanza non è solo una penalità: puoi spenderla per azioni potenti ma destabilizzanti (Patto Oscuro, Tradimento Tattico, Rogo delle Provviste). Il mondo se ne accorge.' },
  { id: 'mercato', kind: 'tab', name: 'Mercato delle Anime', icon: 'mercato', cond: s => s.hero.level >= 4 || (s.totals.delves || 0) >= 3,
    codex: 'Si commercia destino: oggetti con una storia, Frammenti di Fato e risorse. I prezzi dipendono dalle Ombre del Mercato. Ogni scambio resta nello Storico delle Anime.' },
  { id: 'f_auto', kind: 'feature', name: 'Auto-battaglia', icon: 'auto', cond: s => (s.totals.kills || 0) >= 12,
    codex: 'Puoi lasciare che il tuo eroe combatta da solo: usa le abilità coerenti col Fardello, l\'Eco quando è pronta e una pozione sotto la soglia scelta in Opzioni. Non usa mai azioni di Dissonanza.' },
  { id: 'f_worldboss', kind: 'feature', name: 'Boss Mondiale', icon: 'boss', cond: s => s.hero.level >= 6,
    codex: 'Ogni giorno tutti i portatori colpiscono il Colosso di Cenere. Hai 3 tentativi da 10 round: più danni infliggi, migliori le ricompense.' },
  { id: 'eredita', kind: 'tab', name: 'Eredità', icon: 'eredita', cond: s => s.hero.level >= 8 || s.cycle.n > 1 || s.reliquie >= 3,
    codex: 'Le reliquie comprano potenziamenti permanenti nel Santuario. Quando chiudi un Ciclo ottieni un finale, Memorie permanenti, e il tuo portatore diventa un\'eco che i successivi incontreranno.' },
];

export const CODEX_CORE: { id: string; name: string; icon: string; text: string; cond: (s: GameState) => boolean }[] = [
  { id: 'c_fardello', name: 'Il Fardello', icon: 'fardello', cond: s => !!s.fardello, text: 'La tua prima scelta è diventata una cicatrice meccanica. Ogni Fardello ha un peso (leggero = agisci prima, pesante = colpisci più forte), un vantaggio, un costo, un\'Eco e un\'Ombra.' },
  { id: 'c_risonanza', name: 'Risonanza e Dissonanza', icon: 'risonanza', cond: s => !!s.fardello, text: 'Ogni azione ha una natura (protezione, sacrificio, crudeltà, tradimento, silenzio, fede, sangue). In battaglia il bordo VERDE indica un\'azione coerente col tuo Fardello: carica la Risonanza; a barra piena sblocchi l\'Eco. Il bordo ROSSO indica un\'azione contraria: accumula Dissonanza. Nessuna scelta è sbagliata: è solo tua.' },
  { id: 'c_corruzione', name: 'Corruzione', icon: 'corruzione', cond: s => !!s.fardello, text: 'Le azioni spietate aumentano la Corruzione, quelle protettive la riducono. Corruzione alta: nemici più forti, bottino più ricco e, oltre il 60%, un\'interfaccia che comincia a mentire (si purifica all\'Altare).' },
  { id: 'c_promesse', name: 'Promesse', icon: 'promessa', cond: s => s.promises.length > 0, text: 'Alcune scelte creano una Promessa con una scadenza in spedizioni. Mantenuta: Risonanza e un Frammento. Infranta: Dissonanza e un Cacciatore di Promesse che ti cercherà nei dungeon.' },
  { id: 'c_bisaccia', name: 'Bisaccia e Soglia di Ritiro', icon: 'bisaccia', cond: s => (s.totals.delves || 0) > 0 || !!s.delve, text: 'Dopo ogni piano scegli: scendere (più ricco, più rischioso) o tornare su a mettere al sicuro la bisaccia. Senza provviste puoi pegnorare salute massima futura: se torni ne recuperi metà, se cadi resta finché Elara non la scioglie.' },
  { id: 'c_combat', name: 'Combattimento', icon: 'combat', cond: s => (s.totals.kills || 0) > 0 || !!s.combat, text: 'Scegli un\'abilità e poi il bersaglio. L\'attacco base dà Focus (◆), le abilità forti lo consumano. Gli attacchi in mischia colpiscono solo la prima fila. Sopra ogni nemico vedi la sua prossima mossa (⚠). Le pozioni non consumano il turno.' },
  { id: 'c_valle', name: 'La Valle che Respira', icon: 'valle', cond: s => (s.totals.delves || 0) >= 2, text: 'La valle ha uno stato (Fioritura, Quiete, Tensione, Corruzione, Cenere, Eclisse, Rinascita) che cambia produzione, nemici e bottino. Lo spostano edifici, promesse, corruzione e frammenti.' },
  { id: 'c_rito', name: 'Il Rito (schermo intero)', icon: 'rito', cond: () => true, text: 'Attivando lo schermo intero entri nel Rito: +25% Risonanza, sussurri nella musica e scelte nascoste negli eventi. Con l\'audio acceso vedi le mosse dei nemici invisibili.' },
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
  { id: 'night', title: 'Affronta la Notte del Portale', hint: 'Leggi le tre voci e scegli quella a cui rispondere. Non esiste una scelta giusta: ognuna crea un Fardello diverso.', done: s => !!s.fardello },
  { id: 'gather', title: 'Raccogli 10 legno', hint: 'Tocca «Taglia» nel riquadro Raccolta.', tab: 'villaggio', done: s => s.res.legno >= 10 || totalBuildings(s) >= 2, reward: { cenere: 10 } },
  { id: 'segheria', title: 'Costruisci una Segheria', hint: 'Nel riquadro Edifici. Produrrà legno da sola, anche a gioco chiuso.', tab: 'villaggio', done: s => (s.village.buildings.segheria || 0) >= 1, reward: { legno: 10 } },
  { id: 'capanna', title: 'Costruisci una Capanna dei Raccoglitori', hint: 'Le Provviste servono per scendere nei dungeon: 1 per piano.', tab: 'villaggio', done: s => (s.village.buildings.capanna || 0) >= 1, reward: { provviste: 3 } },
  { id: 'descend', title: 'Scendi nel Cimitero dei Traditi', hint: 'Apri la scheda «Discesa» e premi «Scendi».', tab: 'discesa', done: s => !!s.delve || (s.totals.delves || 0) > 0 },
  { id: 'fight', title: 'Vinci il tuo primo scontro', hint: 'Scegli una porta con le spade. In battaglia: abilità → bersaglio. Bordo verde = coerente col tuo Fardello.', tab: 'discesa', done: s => (s.totals.kills || 0) >= 1, reward: { potions: 1 } },
  { id: 'bank', title: 'Torna in superficie con la bisaccia', hint: 'Dopo un piano superato puoi scendere ancora o «Tornare in superficie». Ciò che hai in bisaccia è al sicuro solo quando risali.', tab: 'discesa', done: s => (s.totals.delves || 0) >= 1, reward: { cenere: 40 } },
  { id: 'equip', title: 'Equipaggia un oggetto', hint: 'Apri «Eroe», tocca un oggetto e premi «Equipaggia» (o «Auto-equipaggia»).', tab: 'eroe', done: s => Object.keys(s.hero.equipped).length > 0, reward: { ferro: 15 } },
  { id: 'village5', title: 'Fai crescere Hondovalle fino a 5 edifici', hint: 'Bottega e Cava si sbloccano costruendo Segherie. Più edifici = più eventi e richieste.', tab: 'villaggio', done: s => totalBuildings(s) >= 5, reward: { cenere: 60 } },
  { id: 'floor5', title: 'Sconfiggi il primo boss (piano 5)', hint: 'Ogni 5 piani c\'è un boss. Potenzia l\'equipaggiamento e porta pozioni.', tab: 'discesa', done: s => s.biomes.cimitero.best >= 5, reward: { cenere: 120, potions: 1 } },
  { id: 'bussola', title: 'Apri la Bussola del Fato', hint: 'Lì trovi le tue Promesse e le stelle accese dalle tue scelte.', tab: 'bussola', done: s => s.flags.includes('seen_bussola'), reward: { intuizione: 2 } },
  { id: 'talent', title: 'Spendi un Punto Talento', hint: 'In «Eroe» → Talenti. Ogni Via avvicina una fazione e ne allontana un\'altra.', tab: 'eroe', done: s => s.hero.talents.length > 0, reward: { cenere: 80 } },
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
    toast(s, `✔ ${st.title}${next ? ` · Prossimo: ${next.title}` : ' · La guida è completa: ora la valle è tua.'}`, 'good');
  }
}

export function onboard(s: GameState, silent = false) {
  checkUnlocks(s, silent);
  checkTutorial(s);
}
