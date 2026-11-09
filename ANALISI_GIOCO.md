# KRAK — Analisi del gioco: cosa funziona, cosa migliorare

Fonti di questa analisi:
1. **Dati reali di Playgama** (sandbox, 8–9 novembre): 113 sessioni, 80 giocatori.
2. **Simulazioni col vero motore del gioco**: un giocatore automatico che gioca come una persona (costruisce, scende nei dungeon, combatte in auto-battaglia, riscuote missioni, chiude i Cicli) fino al **5° Ciclo**, con 3 profili diversi (classe, Fardello, ore al giorno). Ogni combattimento e ogni piano consumano tempo reale come per un giocatore vero.
3. **Partite nel browser** (bot di 150 secondi: 23 piani, boss, eventi, trappole, enigmi; nessun errore).
4. **Ricerca** su come sono fatti i giochi idle/incrementali e su cosa tiene i giocatori sui portali web.

---

## 1. I dati reali: dove si perdono i giocatori

| Momento | Sessioni | Quanti restano |
|---|---|---|
| Il gioco si avvia | 113 | 100% |
| Il gioco è pronto | 107 | 95% |
| Arrivano a 30 secondi di gioco | 56 | **50%** |
| Arrivano a 60 secondi di gioco | 32 | **28%** |
| Fanno almeno una discesa nel dungeon | 7 | **6%** |

**Metà dei giocatori se ne va prima di 30 secondi, tre su quattro prima del minuto.** Solo 1 su 15 arriva al primo dungeon. È il problema numero uno, molto più importante del bilanciamento.

Perché succede (il percorso di un nuovo giocatore):
1. schermata «Ascolta la valle» → 2. cinematica → 3. nome → 4. scelta della classe → 5. «Scendi a Hondovalle» → 6. la Notte del Portale (3 voci, dialoghi, sigillo) → 7. finestra del Fardello → 8. villaggio con la finestra «Nuova sezione».

Sono **circa 8 schermate e 1–3 minuti di lettura prima di fare qualcosa**. Le ricerche concordano: sui portali web i primi 30 secondi decidono tutto, e conviene portare il giocatore nell'azione subito ([CrazyGames: un buon gioco tiene il 10–15% dei giocatori il giorno dopo](https://docs.crazygames.com/resources/basic-launch-metrics/); [Google Play: i primi 10 minuti decidono il ritorno](https://medium.com/googleplaydev/why-the-first-ten-minutes-is-crucial-if-you-want-to-keep-players-coming-back-to-your-mobile-game-4a89031b6308)).

Nota: questi numeri vengono dalla sandbox, dove ci sono anche le tue prove e i controlli di Playgama. Sono pochi, ma la tendenza è chiarissima.

**Pubblicità:** il gioco chiedeva uno spot «pausa» ogni 30 secondi appena si entrava nel villaggio, quindi un nuovo giocatore poteva vederne uno subito dopo il prologo. Su Playgama risultano 359 richieste fallite e 48 spot mostrati. **Già corretto nella 1.0.10**: niente pubblicità nei primi 5 minuti, niente prima di aver finito la prima discesa, e mai subito dopo la prima.

---

## 2. Le simulazioni fino al 5° Ciclo

| Profilo | Ore di gioco attivo per arrivare a fine 5° Ciclo | Giorni reali | Morti in combattimento |
|---|---|---|---|
| Custode della Fiamma · Sacrificio · 2 ore al giorno | **4,2 ore** | 2 | 7 su 160 scontri (4%) |
| Veggente Muta · Silenzio · 1 ora al giorno | **4,2 ore** | 4 | 18 su 174 (10%) |
| Penitente di Cenere · Sangue · 3 ore al giorno | **4,6 ore** | 2 | 18 su 192 (9%) |

Tutto il gioco funziona fino al 5° Ciclo: nessun blocco, nessun combattimento infinito, finali diversi a seconda del Fardello (Martire, Dio Silenzioso, La Valle Brucia, Comunità).

### Problemi di bilanciamento trovati

**A. I Cicli si chiudono troppo presto e saltano il finale vero.**
Un Ciclo si chiude in **circa 1 ora** di gioco, quasi sempre con la scorciatoia «150.000 cenere al livello 12». Il Cuore di Krak (il boss finale) non viene quasi mai affrontato. Così:
- la **Torre del Silenzio** (livello 16) e l'**Abisso** (livello 24) non vengono quasi mai visitati: **metà dei dungeon resta invisibile**;
- tutti e 5 i Cicli durano uguale, senza una sfida che cresce;
- 5 Cicli si finiscono in un pomeriggio.

**B. La cenere esplode.** In un Ciclo il villaggio supera i **250 edifici**, e in una simulazione la cenere di un solo Ciclo arriva a **5 milioni**: i raddoppi (a 5, 15, 30, 60 e 100 copie) si moltiplicano tra loro. Per questo la scorciatoia delle 150.000 cenere si raggiunge senza fatica.

**C. L'eroe si ferma attorno al livello 12–16.** I Cicli si chiudono prima che l'eroe cresca, quindi le abilità migliori, i talenti alti e gli oggetti leggendari si vedono poco.

**D. I primi minuti sono troppo generosi.** Il forziere giornaliero dà **140 cenere a livello 1**, quasi 5 volte la cenere iniziale (30), e le missioni aggiungono altro. Con 15 edifici in 2 minuti, il villaggio smette subito di essere una scelta.

**E. Le classi non sono alla pari.** Il Custode muore il 4% delle volte, Veggente e Penitente il 9–10%.

---

## 3. Cosa propongo di cambiare (in ordine di importanza)

### 1. Un inizio molto più veloce (il più importante)
- **Saltare la cinematica e il nome**: nome casuale modificabile dopo nelle Opzioni; la cinematica diventa facoltativa.
- **Classe consigliata già evidenziata**, con un solo tocco per partire.
- **Portale più corto**: le tre voci restano, ma basta un tocco per scegliere; i dialoghi diventano facoltativi.
- **Primo combattimento entro 60 secondi**: dopo il Fardello si scende subito nel primo piano del Cimitero (2 nemici facili), poi si torna al villaggio con il primo bottino e da lì si costruisce.

Obiettivo: **gioco vero entro 20–30 secondi, primo combattimento entro 1 minuto**.

### 2. Cicli più lunghi e più sensati
- La scorciatoia si fa più dura a ogni Ciclo: **150.000 cenere al Ciclo 1, poi ×3 a ogni Ciclo**, livello minimo +3 per Ciclo, e serve **aver conquistato le Paludi**.
- Battere il **Cuore di Krak** dà un finale migliore e **il doppio delle Memorie** rispetto alla scorciatoia, così ha senso puntare al boss.
- Il Ciclo 1 resta veloce (circa 1–2 ore: la ricerca dice che il primo «reset» deve arrivare presto); dal Ciclo 2 in poi ogni Ciclo chiede un passo in più (Torre, poi Abisso).

### 3. Economia del villaggio più calma
- Raddoppi di produzione meno forti dopo il terzo (×2, ×2, ×2, poi ×1,5).
- Forziere giornaliero proporzionato all'economia: circa **3 minuti di produzione** invece di una cifra fissa alta.
- Gli edifici restano numerosi, ma i numeri non esplodono.

### 4. Classi alla pari
- Veggente e Penitente un po' più robusti (+8% salute), oppure Custode un po' meno.

### 5. Telemetria per misurare i miglioramenti
Aggiungere eventi a Playgama per vedere dove si fermano i giocatori: fine intro, Fardello scelto, primo edificio, primo combattimento, prima discesa, primo boss, Ciclo chiuso. Così dopo ogni cambiamento vediamo con i numeri se funziona.

---

## 4. È divertente?

**Punti forti**
- **Atmosfera unica**: grafica dipinta coerente, narrativa con scelte morali (Fardello, Promesse, Tribunale), effetti inquietanti. Su un portale pieno di giochi colorati, KRAK si distingue.
- **Più sistemi che si intrecciano**: villaggio, dungeon, eroe, compagni e Bussola. La voglia di «un'altra discesa» c'è.
- **I Cicli con finali diversi** sono un ottimo motivo per rigiocare, se diventano più lunghi e più profondi.
- **Tecnicamente solido**: nessun errore in tutte le partite di prova, salvataggi e lingue funzionano.

**Punti deboli**
- **L'inizio è lento e tutto da leggere**: oggi è il motivo per cui la maggior parte se ne va.
- **Troppe cose arrivano in fretta**: dopo un'ora si ha il villaggio pieno, tante schede e numeri enormi; poi il Ciclo si chiude e si ricomincia uguale.
- **Il finale vero (Cuore di Krak) e metà dei dungeon si vedono poco.**

In sintesi: **il gioco piace a chi resta, ma oggi quasi nessuno resta abbastanza da scoprirlo.** Prima va sistemato l'inizio, poi la durata dei Cicli.

---

### Fonti della ricerca
- [CrazyGames — Basic launch metrics](https://docs.crazygames.com/resources/basic-launch-metrics/)
- [Google Play — Why the first ten minutes are crucial](https://medium.com/googleplaydev/why-the-first-ten-minutes-is-crucial-if-you-want-to-keep-players-coming-back-to-your-mobile-game-4a89031b6308)
- [I built 7 idle games in 30 days — what I learned about incremental design](https://dev.to/aguier/i-built-7-idle-games-in-30-days-what-i-learned-about-incremental-design-5d3f)
- [How to design an idle or incremental game](https://bugnet.io/blog/how-to-design-an-idle-or-incremental-game)
- [Gold, Goblins, and Good Game Design](https://funovus.com/blogs/Gold-and-Goblins)
- [GameAnalytics — How to make an idle game](https://www.gameanalytics.com/blog/how-to-make-an-idle-game-adjust)
- [Juego Studio — Retention for HTML5 game platforms](https://www.juegostudio.com/blog/html5-game-platform)
