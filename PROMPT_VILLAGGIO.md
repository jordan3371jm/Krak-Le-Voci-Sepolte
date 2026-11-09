# KRAK — Le immagini di Hondovalle Bassa (e della Fucina)

Servono **5 immagini**:

| File | Cosa mostra | Quando compare nel gioco |
|---|---|---|
| `villaggio_1` | Il villaggio distrutto, solo cenere | Prima di costruire qualcosa |
| `villaggio_2` | La ricostruzione | Da 1 a 14 edifici |
| `villaggio_3` | Il villaggio vivo | Da 15 a 59 edifici |
| `villaggio_4` | La capitale della valle | Da 60 edifici in su |
| `fucina` | L'interno della fucina | Schermata Eroe → Fucina |

**Formato:** `villaggio_1…4` in **16:9**, il più grande possibile (ideale 3840×2160, minimo 2560×1440). `fucina` in **21:9** (ideale 3440×1440, minimo 2560×1080). Va bene jpg, png o webp.

Quando me le mandi, **guardo ogni immagine e metto ogni icona esattamente sopra il suo edificio**, quindi non serve che le posizioni siano perfette al millimetro: servono a far sì che gli edifici siano **ben separati** e **sempre nello stesso punto** in tutte e 4 le fasi.

---

## Come ottenere 4 immagini coerenti (importante)

1. Fai **prima `villaggio_4`** (il villaggio completo), con il prompt qui sotto.
2. Poi usa quella immagine come **riferimento** (in Krea: *Image to image* / *Reference*; in Canva: *Usa come riferimento*) con forza media, e genera `villaggio_3`, `villaggio_2`, `villaggio_1` con i loro prompt. Così montagne, strade e posizione delle case restano identiche: cambia solo lo stato del villaggio.
3. Tieni **la stessa inquadratura**: vista dall'alto a tre quarti, da una collina a sud, come un plastico visto in diagonale.

---

## La mappa: dove sta ogni cosa

Immagina l'immagine divisa in una griglia: **orizzontale da 0% (sinistra) a 100% (destra)**, **verticale da 0% (in alto) a 100% (in basso)**.

```
 0%                         50%                         100%
 ┌─────────────────────────────────────────────────────────┐ 0%
 │  [TITOLO: cielo scuro,        montagne          MINIERE  │
 │   niente dettagli qui]                          (78,22)  │
 │                                                          │
 │                      ALTARE      TORRE      ROVINE ALTE  │ 35%
 │                      (52,34)     (68,34)    (84,38)      │
 │ BOSCHI       LOCANDA                                     │
 │ BRUCIATI     (36,46)                                     │ 50%
 │ (8,50)                 BOTTEGA       FUCINA              │
 │        SEGHERIA        (50,56)       (64,54)             │
 │        (21,58)                                CAVA       │
 │                CAPANNA                        (85,66)    │ 65%
 │                (33,67)           INFERMERIA              │
 │                                  (67,73)                 │
 │                 PIAZZA COL FUOCO (50,82)                 │ 80%
 │ ░░░░░░░░ striscia scura in basso: niente dettagli ░░░░░░ │ 100%
 └─────────────────────────────────────────────────────────┘
```

| Edificio | Posizione | Com'è fatto (per riconoscerlo a colpo d'occhio) |
|---|---|---|
| **Miniere del Nord** | in alto a destra (78%, 22%) | ingresso di miniera scavato nel fianco della montagna, travi di legno, binari e carrelli, bagliore arancione dall'interno |
| **Rovine di Hondovalle Alta** | destra, su una cresta (84%, 38%) | case di pietra crollate su un'altura, raggiunte da una scalinata di pietra che sale dal villaggio |
| **Torre di Guardia** | centro-destra in alto (68%, 34%) | torre di pietra alta e stretta su uno sperone roccioso, braciere acceso in cima |
| **Altare della Veglia** | centro in alto (52%, 34%) | piccola cappella gotica con campanile appuntito, candele alle finestre, il punto più alto del villaggio |
| **Locanda dei Viandanti** | centro-sinistra (36%, 46%) | la casa più grande, due piani, insegna di legno appesa con una lanterna, tavoli fuori |
| **Bottega delle Gilde** | centro (50%, 56%) | edificio con tettoie di stoffa, botti, casse e bancarelle davanti |
| **Fucina** | centro-destra (64%, 54%) | edificio basso di pietra con un grande camino che sputa fumo e luce rossa, incudine all'aperto |
| **Segheria** | sinistra (21%, 58%) | sul fiume, con una ruota ad acqua di legno e cataste di tronchi |
| **Capanna dei Raccoglitori** | sinistra in basso (33%, 67%) | capanna di legno col tetto di paglia, rastrelliere con pelli e erbe a seccare, ceste |
| **Cava di Pietra** | destra in basso (85%, 66%) | parete di roccia tagliata a gradoni, blocchi squadrati, una gru di legno |
| **Infermeria di Elara** | centro-destra in basso (67%, 73%) | casetta di pietra bianca con un orto di erbe, teli bianchi stesi, una lanterna verdastra |
| **Boschi Bruciati** | bordo sinistro (8%, 50%) | alberi neri e morti, tronchi spezzati, qualche brace |
| **Piazza col fuoco** | centro in basso (50%, 82%) | piccola piazza di terra con un falò: qui il gioco mette l'eroe e i compagni |

**Zone da lasciare semplici** (il gioco ci scrive sopra):
- **in alto a sinistra** (da 0% a 40% in larghezza, da 0% a 20% in altezza): solo cielo scuro, per il titolo «Hondovalle Bassa»;
- **la striscia in basso** (ultimo 8%): terra scura, senza dettagli importanti.

Una strada di terra collega tutti gli edifici e parte dalla piazza. Un fiume scuro scende da sinistra in alto e passa vicino alla segheria.

---

## Inizio comune (da mettere davanti a ogni prompt del villaggio)

```
dark fantasy painting, wide panoramic view of a medieval mountain village in a valley, seen from a high hill to the south in three-quarter aerial perspective like a detailed diorama, grimdark, gothic, oppressive atmosphere, ash falling, low fog in the streets, dramatic chiaroscuro, warm candle-lit windows against cold blue-grey night, blood-red sunset sky on the left horizon, jagged mountains in the background, painterly digital art, ultra detailed, 16:9, cinematic composition,
```

**Descrizione della disposizione** (da mettere subito dopo, uguale per tutte e 4):

```
composition: dark empty sky in the top-left corner; a mine entrance with wooden beams and glowing orange light carved in the mountain at the top-right; on a rocky ridge on the right, ruined stone houses reached by a long stone staircase; a tall narrow stone watchtower with a burning brazier on a rocky spur right of center; a small gothic chapel with a pointed bell tower at the top-center, the highest building of the village; a large two-storey inn with a hanging lantern sign on the left of center; a guild workshop with cloth awnings, barrels and stalls in the exact center; a low stone smithy with a big chimney glowing red right of center; a sawmill with a wooden water wheel on a dark river on the left; a thatched gatherers' hut with drying racks and baskets lower-left; a stone quarry cut in terraces with a wooden crane lower-right; a small white stone infirmary with a herb garden and white cloths lower-right of center; a burnt dead forest on the far left edge; a small dirt square with a campfire at the bottom-center; a dirt road connecting all buildings to the square; each building clearly separated from the others, readable silhouettes, plain dark ground along the bottom edge,
```

**Prompt negativo** (per tutte):
```
text, letters, watermark, signature, logo, people close-up, characters in foreground, modern objects, bright daylight, cheerful colors, cartoon, anime, blurry, low quality, cropped buildings, buildings overlapping, cluttered composition
```

---

## `villaggio_4` — La capitale della valle (fai questa per prima)

Dopo l'inizio comune e la disposizione aggiungi:
```
the village at its peak: every building fully built, larger and fortified, stone walls and wooden palisades around the village, dark red banners on the chapel and the watchtower, many lit windows, lanterns along the road, smoke from many chimneys, carts on the road, the mine busy with torches, the upper ruins partially rebuilt, prosperous but still grim and menacing, a sense of fragile hope under a dying sky
```

## `villaggio_3` — Il villaggio vivo

```
the village is alive again: all buildings are standing and lit but modest, made of dark wood and stone, no walls yet, a few lanterns on the road, smoke from chimneys, the mine entrance dark with only a faint glow, the upper ruins still ruined and dark, mud, ash and puddles on the road, some houses still damaged
```

## `villaggio_2` — La ricostruzione

```
the village is being rebuilt from ruins: only the sawmill, the gatherers' hut, the guild workshop and the quarry are standing, rough and half-finished with wooden scaffolding; the other building sites are only burnt foundations, charred beams and piles of stones, each in its exact place; only a few windows lit; the chapel is a roofless broken shell; the watchtower is a stump of stone; the mine is sealed with boards; heavy ash and smoke in the air
```

## `villaggio_1` — Solo cenere

```
the village has just been destroyed: every building is a burnt ruin or blackened foundation in its exact place, smouldering beams, collapsed roofs, ash everywhere, no lit windows, the only light is a small dying campfire in the square at the bottom-center, a strange purple glow in the sky above the well, ravens on the ruins, utterly desolate and silent
```

---

## `fucina` — L'interno della Fucina (formato 21:9)

Nel gioco la parte **sinistra** dell'immagine resta visibile e la parte **destra** viene scurita, perché lì ci sono i comandi. Quindi metti le cose importanti a sinistra.

```
dark fantasy painting, interior of an old village smithy at night, wide 21:9 cinematic shot, on the left a huge stone forge with roaring orange-red fire and glowing coals, bellows and a chimney hood, sparks flying; in the left-center a heavy black iron anvil on a tree stump with a glowing red-hot blade on it and a hammer resting beside it; a quenching barrel with rising steam; walls of dark stone and wooden beams with hanging tongs, hammers, chains, horseshoes and unfinished swords and shields; the right side of the room fades into deep shadow with only faint shapes of racks and armor, almost empty; grimdark, oppressive, warm firelight against cold darkness, smoke and floating embers, painterly digital art, ultra detailed
```

Prompt negativo:
```
text, letters, watermark, logo, person, blacksmith, character, face, modern objects, bright daylight, cartoon, anime, blurry, low quality
```

---

Mandamele anche una alla volta: ogni fase che arriva compare subito nel gioco, al posto del panorama di adesso.
