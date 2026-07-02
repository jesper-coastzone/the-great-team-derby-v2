# The Great Team Derby — v2

> **Dette er v2** — en videreudviklet kopi af den kørende app. Den gamle version i `team-galoppen/`
> er urørt og kan stadig bruges til events, mens v2 testes.

## Nyt i v2

**Løbsmodulet (det store payoff-moment)**
- Levende løb på storskærmen: hestene galoperer (animation), glider frem for hvert slag og viser slag-boblen (+6) ved hesten. Slag-status vises som prikker pr. bane.
- **Kommentator-feed** nederst på skærmen: "🎲 Lynhurtig slår 6 → rykker 6 felter".
- **Løbs-events**: Dyrlægetjek (-2), Modvind (-1), Medvind (+2) og Publikum (+1) rammer tilfældigt (16% pr. slag, max 1 pr. hold pr. løb) med stort banner på skærmen. Slås til/fra i `gameConfig.raceEvents`.
- **Catch-up**: hold 7+ felter bagud får +1 på slaget ("Opløbsfight") — holder løbene tætte. Config: `gameConfig.catchup`.
- **Publikumsfavorit**: host udpeger ét hold, som får +2 engangsboost på næste slag. Config: `gameConfig.audienceFavorite`.
- **Fair dødt løb**: position har ikke længere loft på 30, og ved præcis samme distance deles placeringen (og præmien) i stedet for tilfældig tie-break.
- Konfetti og podie ved målstregen.

**Spilbalance**
- Staldinvestering er ikke længere en gratis pengemaskine: afkast sænket fra +200/+500 til +100/+300 SD, så valget mellem sikker værdi og løbs-power er ægte.

**Tablets**
- Cooldown-nedtælling tæller nu faktisk ned sekund for sekund (før frøs den).
- Løbsvisning med "Banen lige nu" — mini-bane med alle stalde, live positioner og favorit-markering.
- Toast-beskeder når holdet rammes af events, fan-boost eller opløbsfight.

**Host-konsollen**
- Online-status (grøn/rød prik) pr. stald + "x/y online"-tæller.
- Godkendelseskøen lyser gult op, når noget venter.
- Kreativ-scoring med niveauknapper (500/1000/1500) + valgfrit beløb.
- Løbspanel med favorit-vælger, slag-status pr. hold (2/4 slag · pos 13) og seneste hændelser.

Alle nye mekanikker kan justeres eller slås fra i `config/gameConfig.js` uden at røre koden.

## Nyt i v2.1 — spildynamik (fra ekspert-review, se `Ekspert-review_Spildynamik_v2.md`)

**Grafik**
- Løbsbanen: turf-striber med dybde, distancemarkører (5/10/15/20/25) og MÅL-portal.
- Vinderafsløring: pulserende guld-spotlight med hesten i vinderens staldfarve, pokal og konfetti.

**Balance (review pkt. 1-5)**
- Performance-øvelser udbetaler nu også kontanter pr. medalje: pass/bronze/sølv/guld = 200/400/600/1000 SD (`performanceRewards`) — balancerer dem mod penge-øvelserne.
- Finale-præmier hævet til 6000/4200/3000/1800/1000 SD, så finalen reelt kan flytte stillingen.
- Ved videresalg på auktion får forrige ejer kun 50% af buddet — resten går til banken (`auctionResaleSplit`). Dæmper rich-get-richer.
- Investeringer: max 1 køb pr. option (`maxPurchasesPerOption`); hest/jockey er nu værdineutrale men point-tunge (1000 → +1000 værdi +3 point).
- Kreativ-bonus max sænket 1500 → 800 (fairness: host-skøn må ikke overdøve spillets mekanikker).

**Finale-væddemål (comeback-mekanik)**
- Før finaleløbet kan hvert hold satse kontanter på egen sejr. Odds sættes omvendt af stillingen: føreren 1,5x, sidstepladsen 4x (`finalBetting`). Indsats trækkes straks; vinder holdet løbet, udbetales indsats × odds. Sammen med de større præmier gør det comeback muligt — og finalen nervepirrende for alle.

**Rollekort (teamdynamik)**
- Fire roller fordeles ved stald-setup: Staldchef, Bookmaker, Træner, Staldkarl (`roles` i config). Tabletten minder holdet om at rotere rollerne, når en ny runde starter.

**Debrief-slide**
- Nyt sidste slide efter vinderafsløringen med auto-genererede datapunkter pr. hold (højeste bud, byttehandler, investeret, tjent på opgaver, løbspræmier) og tre refleksionsspørgsmål — så eventet også leverer læring, ikke kun fest.

---

Et realtime **live event-system** til CoastZones teambuildingkoncept. Én host-maskine kører en
indbygget præsentation; storskærm og team-tablets følger automatisk med, når host skifter slide/fase.
Ingen separat PowerPoint — præsentationen *er* spillet.

Design følger CoastZones nye grafiske linje (Katja): cream/navy/burgundy/champagne/turf, 60/30/10,
Playfair Display + Inter, race-card-typografi og derby-motiver.

---

## Krav

- **Node.js 18 eller nyere** (tjek med `node -v`)
- Alle enheder (host, skærm, tablets) på **samme netværk**

## Installation

```bash
cd team-galoppen
npm install
```

## Host-login

`/host` er beskyttet af ét fælles kodeord. Sæt det med miljøvariablen `HOST_PASSWORD`
(standard er `derby` hvis intet er sat — **skift det** før I går live).

```bash
HOST_PASSWORD=vælgnoget npm start
```

Skærm (`/screen`) og tablet (`/team`) kræver ikke kodeord — kun spilkoden.

## Start

```bash
npm start        # eller: node server.js
```

Konsollen viser tre URL'er, fx:

```
Host   :  http://192.168.1.42:3000/host
Skærm  :  http://192.168.1.42:3000/screen
Tablet :  http://192.168.1.42:3000/team
```

`192.168.1.42` er maskinens IP på det lokale netværk (findes automatisk).
Vil du bruge en anden port: `PORT=4000 node server.js`.

---

## Sådan afvikler du et rigtigt event (flere enheder)

1. Kør serveren på **host-maskinen** (fx en bærbar).
2. Åbn `/host` i browseren på host-maskinen og **opret et spil** (event, program, antal hold/runder).
3. Sæt projektoren/TV'et på `http://<ip>:3000/screen?code=<SPILKODE>` (URL vises i host-toppen).
4. Hver **tablet** åbner `http://<ip>:3000/team` og indtaster spilkoden — eller **scanner QR-koden**
   der vises på storskærmen ved "Skab jeres stald" (og i host'ens debug-panel).
5. Før gæsterne gennem præsentationen med **Næste/Forrige** på `/host`. Tablets og skærm skifter automatisk.

> **Netværkstip:** Nogle gæste-WiFi blokerer enhed-til-enhed-trafik. Virker det ikke, så lav et
> separat netværk: brug en telefon-hotspot eller en lille rejse-router, som host + tablets + skærm
> alle kobler sig på. Så kan de altid se hinanden.

## Sådan tester du lokalt (ét apparat, flere vinduer)

Åbn i samme browser (gerne flere vinduer/faner):

- ét vindue på `http://localhost:3000/host`
- ét vindue på `http://localhost:3000/screen`
- 2–6 vinduer på `http://localhost:3000/team`

Genvej i host'ens **🔧 Test- og debugværktøjer**: "Opret fake-hold", "+1.000 SD til alle",
"Simulér løb", "Giv alle licens" — så kan du gennemspille flowet alene.

---

## Deploy til Render (tilgå fra en hvilken som helst computer)

Så kører serveren i skyen med en fast URL — I skal ikke være på samme netværk.

1. Læg denne mappe i et **Git-repo** (GitHub/GitLab).
2. Opret gratis konto på **render.com** → **New → Blueprint** → peg på repo'et.
   Render læser `render.yaml` og opsætter alt automatisk. (Alternativt: **New → Web Service**,
   Build: `npm install`, Start: `node server.js`.)
3. Under **Environment** sæt `HOST_PASSWORD` til jeres eget kodeord.
4. Deploy. I får en fast URL, fx `https://team-galoppen.onrender.com`.
   - Host: `…/host`  ·  Skærm: `…/screen`  ·  Tablet: `…/team`
5. (Valgfrit) Kobl jeres eget domæne på under **Settings → Custom Domains**, fx `derby.coastzone.dk`.

> **Vigtigt til et rigtigt event:** Render's *gratis* plan sætter serveren i dvale efter inaktivitet
> (første besøg tager ~30 sek. at vække). Vælg **Starter-planen** (lille månedlig pris) på eventdage,
> så den altid er vågen. WebSockets/realtime virker på begge planer.

## Installér som app på tablets (PWA)

Appen er en **PWA** — den kan lægges på tablettens hjemmeskærm som en rigtig app-ikon:

- **iPad/Safari:** åbn `…/team` → Del-knappen → **Føj til hjemmeskærm**.
- **Android/Chrome:** åbn `…/team` → menu (⋮) → **Installér app / Føj til startskærm**.

Herefter har alle tablets samme ikon; man åbner appen og taster dagens **spilkode** for at logge ind
i det oprettede spil. (QR-koden på storskærmen fører også direkte til tablet-appen.)

## Arkitektur

```
Host: "Næste slide"  ──socket──▶  Server opdaterer den centrale game-state
                                        │  broadcast til spil-rummet
                        ┌───────────────┴───────────────┐
                        ▼                                ▼
                 /screen renderer slide           /team skifter tablet-mode
```

- **Node + Express** serverer de tre sider og statiske filer.
- **Socket.io** håndterer realtime. Ét *room* pr. spilkode; hver rolle får sit eget rollebaserede
  snapshot (teams ser fx kun deres egne bud — host ser alt).
- **Autoritativ state på serveren.** Klienterne er "dumme" og renderer kun det, serveren sender.
  Al spillogik (økonomi, auktion, trades, race) ligger på serveren.
- **Autosave** til `data/savegame-<KODE>.json` ved ændringer, så et event kan genstartes uden datatab.
  Host kan også eksportere/importere hele spillet som JSON.

### Mappestruktur

```
server.js                  Express + Socket.io bootstrap (LAN-binding, QR-endpoint)
config/                    ALLE balancetal — juster her, ikke i UI
  gameConfig.js            valuta, startkapital, præmier, cooldowns, niveauer, investeringer
  slides.js                præsentationens slides + mapping til tablet-mode
  auctionExercises.js      de 7 auktionsøvelser
  tasks.js                 altid-tilgængelige opgaver + indhold til Tip13/Tidslinje/Dyst
src/server/                serverlogik pr. domæne
  gameState.js  economy.js  auction.js  trades.js  races.js
  tasks.js  performance.js  gameManager.js  realtime.js  socketHandlers.js  util.js
public/                    klienterne (vanilla JS, ingen build)
  shared/  host/  screen/  team/
data/                      autosave (oprettes automatisk)
```

---

## Hvor ligger balance-tallene?

Alt justeres i **`config/`**:

- **`config/gameConfig.js`** — startkapital (5.000 SD efter warm-up), basisværdier (hest/jockey/stald
  = 1.000), race-præmier, terningemodel (`diceMin = 2 + jockeyLevel`, `diceMax = 5 + horseLevel`),
  niveau-tærskler, cooldowns, investeringsprodukter, auktionshus-gebyr (50%), pengeopgave-belønninger.
- **`config/auctionExercises.js`** — de 7 øvelser: kategori (money/jockey/horse), aftagende belønning,
  resultat-tærskler (pass/bronze/silver/gold).
- **`config/tasks.js`** — spørgsmål/facit til Tip en 13'er, Tidslinje og Dyst (redigér og udvid frit).
- **`config/slides.js`** — præsentationens rækkefølge og hvilken tablet-tilstand hvert slide udløser.

---

## Kendte begrænsninger (v1)

- Host-login er ét fælles kodeord (ikke individuelle brugerkonti). Skærm/tablet bruger kun spilkode.
- Fysiske øvelser (Cornhole, Jonglér, Æblefarm osv.) godkendes af instruktør via host — ingen
  automatisk fysisk validering.
- **Mind Puzzle** er niveau-progression godkendt af host (ikke rigtige indbyggede gåder endnu).
- Tip en 13'er og Dyst har et startbibliotek af spørgsmål; udvid `config/tasks.js` efter behov.
- Tilstanden ligger i hukommelsen (+ autosave). Genstart af serveren midt i et event: importér den
  eksporterede JSON via host.
- Animationer er lette (heste glider på banen); ingen tunge effekter.

## Forslag til næste skridt

1. Rigtige indbyggede gåder til Mind Puzzle (progressive niveauer).
2. Flere spørgsmålssæt + kategorier til Tip13/Dyst, evt. kundetilpasset.
3. QR direkte til et hold-specifikt join (auto-tildel staldnummer).
4. Lyd/musik og rigere race-animation på storskærmen.
5. "Publikumsfavorit", vejr- og dyrlæge-overraskelser i løb (er forberedt i datamodellen).
6. Eksport af resultat-rapport (PDF) til kunden efter eventet.

---

*Dansk UI · engelske variabel-/funktionsnavne · CoastZone 2026.*
