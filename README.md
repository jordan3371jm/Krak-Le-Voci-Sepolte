# KRAK — Le Voci Sepolte

> *Il mondo non salva i tuoi progressi. Li ricorda.*

RPG narrativo-tattico **web-native** che fonde:

- il **Game Design Document** di *Hondovalle: Echi di Krak* (Fardelli, Risonanza/Dissonanza, Promesse, Dungeon Specchio, Mercato delle Anime…);
- il loop idle/gestionale di **Hondovalle** (Playgama): villaggio che produce anche offline, edifici, eventi, pesca, ere/prestigio, giornaliere, imprese;
- il loop RPG di **Krak Realm**: classi, equipaggiamento a rarità e affissi, discesa nei dungeon a piani con bisaccia da mettere al sicuro, auto-battaglia, forgiatura, boss mondiale, bestiario, talenti, ascensione.

## Giocare subito

Fai **doppio clic su `GIOCA.html`** (nella cartella principale): è tutto il gioco in un unico file e funziona anche senza server.

## Avvio per sviluppare

```bash
cd rpg
npm install
npm run dev        # http://localhost:3000
npm run build      # crea rpg/dist/index.html (file unico) e lo copia in GIOCA.html
```

Per pubblicare su Playgama/itch.io basta comprimere il contenuto di `rpg/dist`.

> Non aprire `rpg/index.html` con doppio clic: è il file sorgente per lo sviluppo e mostra una pagina nera.

## Cosa c'è nel gioco

| Strato | Sistemi |
| --- | --- |
| **Micro (combattimento)** | 4 classi · Focus · abilità con *natura* (protezione, sacrificio, crudeltà, tradimento, silenzio, fede, sangue) · coerenza col Fardello → **Risonanza** → **Eco** · incoerenza → **Dissonanza** → Patto Oscuro, Tradimento Tattico (turno extra), Rogo delle Provviste · Respiro della Corruzione · prima fila / retrovia · intenti nemici · nemici *bugiardi* (Parola d'Ordine), *invisibili* (si vedono con l'audio), *ascoltatori* (si infuriano coi rumori) · fasi dei boss · anti-stallo · auto-battaglia con auto-pozione |
| **Meso (dungeon)** | 3 biomi da 20 piani + Abisso infinito · porte da scegliere · trappole, santuari, tesori/mimic, eventi, mercanti ombra · **Eroi Fantasma asincroni** (eco dei tuoi Cicli passati e di altri portatori) · **Ombra del Fardello** · **Cacciatore di Promesse** · Dungeon Specchio (tema emotivo + 2 modificatori) · ciclo di vita Seme → Fioritura → Decadimento → Eco · bisaccia non al sicuro · **Soglia di Ritiro** (pegno della salute futura) · scelta del bottino dei boss · scelte morali post-boss |
| **Macro (valle)** | villaggio idle con 9 edifici e miglioramenti · produzione offline · 8 fazioni con stati (Ignorato…Marchiato) e rivalità · richieste delle fazioni · **Promesse Differite** · eventi di conseguenza al villaggio · Bussola del Fato (6 costellazioni, 30 stelle) · stato della Valle (Fioritura, Tensione, Corruzione, Cenere, Eclisse, Rinascita) · mappe personalizzate per Fardello · Aberrazione · Ascensione del Fardello (anche **Parallela**/ibrida) · Vie dei Talenti · compagni con fiducia e spedizioni in tempo reale · **Processo alle Proprie Scelte** |
| **Meta (mondo)** | Mercato delle Anime con storico · Frammenti di Fato *vincolati* (con ricarica anti-griefing) · Contratti di Fato · Mondo a Semi simulato · Boss Mondiale giornaliero · 8 finali · Cicli con Memorie, Carte del Destino, oggetto in eredità · Santuario delle Reliquie |
| **Web** | salvataggio automatico ogni 10 s con 3 backup e checksum · codice di esportazione/importazione · ritorno offline con **Diario Onirico** · audio procedurale (drone che si scorda con la corruzione, battito nelle scelte, catene per le promesse, silenzio con Dissonanza massima) · **Rito** (schermo intero: +25% Risonanza, sussurri, scelte nascoste) · UI che si corrompe (numeri che mentono, porte illeggibili) · PWA manifest · layout mobile |

## Struttura

```
rpg/src/
  game/
    types.ts            tipi dello stato
    data/               contenuti (classi, abilità, nemici, biomi, eventi, mondo)
    engine/             logica pura: state, hero, combat, delve, village, meta
    save.ts audio.ts useGame.ts rng.ts
  components/           schermate React (Villaggio, Discesa, Combattimento, Eroe, Bussola, …)
```
