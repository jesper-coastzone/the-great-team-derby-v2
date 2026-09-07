/*
 * gameConfig.js — ÉN kilde til sandhed for al spilbalance.
 * Alle tal her kan justeres uden at røre spillogik eller UI.
 * Beløb er i Staldollars (SD).
 */

const gameConfig = {
  // ---- Valuta ----
  currencyName: 'Derby Dollars',
  currencyAbbr: 'DD',

  // ---- Sæsonnavne (bruges i stedet for "Runde 1/2/...") ----
  // Ved 2 runder bruges [0] og [2] (forår + efterår); ved 3+ tages de i rækkefølge.
  seasonNames: ['Forårssæsonen', 'Sommersæsonen', 'Efterårssæsonen', 'Vintersæsonen'],

  // ---- Startværdier ----
  startCash: 0,                 // før warm-up (teams starter uden kontanter)
  warmupReward: 5000,           // udbetales til ALLE efter warm-up race
  baseHorseValue: 1000,
  baseJockeyValue: 1000,
  baseStableValue: 1000,

  // ---- Formater (v3): 2 timer standard · 3 timer tilkøb ----
  formats: {
    '2t': { label: '2 timer (standard)', seasons: 3, changeCards: false },
    '3t': { label: '3 timer (tilkøb)', seasons: 4, changeCards: true },
  },

  // ---- Løbspoint (v3): VINDERKRITERIET — flest point vinder (Grand Prix-model) ----
  // Placering 1-6; pladser derudover får sidste værdi. Delt plads = samme point.
  racePoints: {
    normal: [10, 7, 5, 3, 2, 1],
    final: [20, 14, 10, 6, 4, 2],
  },

  // ---- Spilstruktur (default; kan overrides ved oprettelse) ----
  defaults: {
    numTeams: 6,
    format: '2t',
    lang: 'da',
    totalRounds: 3,
    roundLengthSeconds: 20 * 60,
    includeWarmup: false,
    auctionLengthSeconds: 3 * 60,
  },

  maxTeams: 12,

  // ---- Race ----
  raceTrackLength: 25,          // matcher den fysiske bane (25 felter)
  normalRaceRolls: 5,           // v2.17: 5 slag passer 25-felts banen (vinder-snit ~21, målgang med niveauer/boosts)
  finalRaceRolls: 5,
  diceBaseMin: 2,               // diceMin = diceBaseMin + jockeyLevel (+ løbsdags-boosts)
  diceBaseMax: 5,               // diceMax = diceBaseMax + horseLevel (+ løbsdags-boosts)
  normalRacePrizes: { 1: 2400, 2: 1800, 3: 1400, 4: 1000, default: 600 }, // fallback
  // v2.16: præmierne vokser pr. sæson og ANNONCERES i Paddocken før løbet
  // v3.2: alle løbspræmier FORDOBLET — løbet skal kunne mærkes i Staldkassen
  normalRacePrizesByRound: {
    1: { 1: 3000, 2: 2000, 3: 1400, 4: 1000, default: 600 },
    2: { 1: 5000, 2: 3400, 3: 2200, 4: 1400, default: 800 },
    3: { 1: 8000, 2: 5400, 3: 3600, 4: 2000, default: 1000 },
  },
  // v3.2: UDGÅET (sat til 1) — staldværdi er ikke længere vinderkriterie, så hesteværdi-fordobling er meningsløs
  winnerHorseValueMultiplier: 1,

  // ---- Løbsdags-boosts (v2.16): købes i Paddocken, gælder KUN næste løb ----
  // Varige hest/jockey-point kommer KUN fra øvelserne — penge køber dagsform.
  // v3.2: basis 4.000 DD, og prisen stiger boostPriceStep pr. køb stalden laver i samme Paddock (nulstilles hver sæson).
  boostPriceStep: 1000,
  paddockBoosts: [
    { id: 'boost-carrots', emoji: '🥕', label: 'Friske gulerødder', labelEn: 'Fresh carrots', cost: 4000, diceMax: 1, desc: 'Hesten løber hurtigere: +1 på terningens TOP — kun i næste løb.', descEn: 'The horse runs faster: +1 on the TOP of the dice — next race only.' },
    { id: 'boost-peptalk', emoji: '🗣️', label: 'Pep-talk til jockeyen', labelEn: 'Pep talk for the jockey', cost: 4000, diceMin: 1, desc: 'Jockeyen rider sikkert: +1 på terningens BUND — kun i næste løb.', descEn: 'The jockey rides safely: +1 on the BOTTOM of the dice — next race only.' },
    { id: 'boost-superfeed', emoji: '⭐', label: 'Stjernefoder', labelEn: 'Star feed', cost: 4000, diceMin: 1, diceMax: 1, desc: 'Dagsformen i top: +1 på BÅDE top og bund — kun i næste løb.', descEn: 'Race-day form at its peak: +1 on BOTH top and bottom — next race only.' },
  ],

  // ---- Jockey-auktionen (v3 etape 2): én jockey pr. stald, hver sæson ----
  // Basis-terning er 2-5; jockeyen ændrer TOP (max) og BUND (min).
  // Hyren betales af Staldkassen og gælder KUN sæsonens løb — derefter tilbage i puljen.
  jockeys: [
    { id: 'turbo-thea',    name: 'Turbo-Thea',    nameEn: 'Turbo Taylor',   topMod: 3, bottomMod: 0,  minPrice: 800, emoji: '🔥',
      profile: { da: 'Vovehalsen — fremadlænet, briller i panden', en: 'The daredevil — leaning forward, goggles up' } },
    { id: 'vilde-viggo',   name: 'Vilde Viggo',   nameEn: 'Wild William',   topMod: 4, bottomMod: -1, minPrice: 800, emoji: '🎰',
      profile: { da: 'Gambleren — fest eller fiasko', en: 'The gambler — jackpot or bust' } },
    { id: 'lyn-louise',    name: 'Lyn-Louise',    nameEn: 'Lightning Lara', topMod: 2, bottomMod: 0,  minPrice: 600, emoji: '⚡',
      profile: { da: 'Sprinteren — kompakt og eksplosiv', en: 'The sprinter — compact and explosive' } },
    { id: 'stjerne-stella', name: 'Stjerne-Stella', nameEn: 'Star Scarlett', topMod: 1, bottomMod: 1, minPrice: 500, emoji: '🌟',
      profile: { da: 'Allrounderen — solbriller og selvtillid', en: 'The all-rounder — sunglasses and swagger' } },
    { id: 'sikre-sigurd',  name: 'Sikre Sigurd',  nameEn: 'Steady Simon',   topMod: 0, bottomMod: 2,  minPrice: 400, emoji: '🛡️',
      profile: { da: 'Veteranen — aldrig under 4, aldrig panik', en: 'The veteran — never below 4, never panics' } },
    { id: 'rolige-rasmus', name: 'Rolige Rasmus', nameEn: 'Calm Calvin',    topMod: 0, bottomMod: 1,  minPrice: 200, emoji: '🌱',
      profile: { da: 'Lærlingen — ung, billig, pålidelig', en: 'The apprentice — young, cheap, reliable' } },
  ],
  jockeyBidIncrement: 50,       // mindste overbud
  // v3.2: stalde uden vundet bud tildeles en ledig jockey til denne FASTE pris —
  // højere end alle mindstepriser, så det aldrig betaler sig at lade være med at byde.
  jockeyFallbackPrice: 1000,

  // ---- Odds-tavlen (v2.16): væddemål i Paddocken på hvilken hest der vinder løbet ----
  raceBetting: {
    enabled: true,
    minStake: 100,
    maxStake: 3000, // v3.2: hævet 1.000 → 3.000
    minOdds: 1.5,   // favoritten
    maxOdds: 5,     // outsideren
  },
  // Finalen skal kunne flytte stillingen — spænd 5.000 SD (ekspert-review pkt. 3)
  finalRacePrizes: { 1: 12000, 2: 8400, 3: 6000, 4: 3600, default: 2000 }, // v3.2: fordoblet

  // ---- Finale-væddemål: sats på egen sejr med omvendte odds (comeback-mekanik) ----
  finalBetting: {
    enabled: false,             // v2.16: erstattet af odds-tavlen (raceBetting) i Paddocken
    minOdds: 1.5,               // odds for holdet der fører
    maxOdds: 4,                 // odds for holdet der ligger sidst
  },

  // ---- Løbs-events (tilfældige overraskelser pr. slag) ----
  raceEvents: {
    enabled: true,
    chancePerRoll: 0.16,        // sandsynlighed for event på hvert slag
    maxPerTeamPerRace: 1,       // højst ét event pr. hold pr. løb
    types: [
      { id: 'vet',      label: 'Dyrlægetjek',   labelEn: 'Vet check',   emoji: '🩺', effect: -2, weight: 2 },
      { id: 'headwind', label: 'Modvind',       labelEn: 'Headwind',    emoji: '💨', effect: -1, weight: 3 },
      { id: 'tailwind', label: 'Medvind',       labelEn: 'Tailwind',    emoji: '🌬️', effect: 2,  weight: 3 },
      { id: 'crowd',    label: 'Publikum løfter taget', labelEn: 'The crowd lifts the roof', emoji: '📣', effect: 1, weight: 3 },
    ],
  },

  // ---- Catch-up: hold langt bagud får et lille nøk ----
  catchup: {
    enabled: true,
    behindBy: 7,                // felter bagud ift. føreren før bonus
    bonus: 1,                   // lægges til slaget
    label: 'Opløbsfight',
  },

  // ---- Publikumsfavorit: host udpeger ét hold, som får ét fan-boost ----
  audienceFavorite: {
    enabled: true,
    bonus: 2,                   // engangsbonus på holdets NÆSTE slag
    label: 'Publikumsfavorit',
  },

  // ---- Performance-point → niveauer ----
  // Antal point krævet for at nå niveau 1,2,3,4
  horseLevelThresholds: [3, 7, 12, 18],
  jockeyLevelThresholds: [3, 7, 12, 18],
  // Værdi lagt til hest/jockey pr. opnået niveau
  horseValuePerLevel: 400,
  jockeyValuePerLevel: 400,
  maxHorseLevel: 4,
  maxJockeyLevel: 4,

  // Point pr. resultatniveau i performance-øvelser
  performancePoints: { pass: 1, bronze: 2, silver: 3, gold: 5 },
  // Kontant udbetaling pr. medalje — balancerer performance-øvelser mod penge-øvelser
  // (ekspert-review pkt. 1: uden dette tjener penge-øvelser ~4x mere)
  performanceRewards: { pass: 200, bronze: 400, silver: 600, gold: 1000 },

  // ---- Investeringer (direkte køb) ----
  // valueIncrease = hvor meget aktivets værdi stiger. performancePoints = point til niveau.
  // Hvert produkt kan købes max så mange gange pr. hold (lukker degenereret slutspil)
  maxPurchasesPerOption: 1,
  investmentOptions: {
    // Hest/jockey: værdineutrale (1000→1000) men point-tunge — ægte valg mellem
    // likviditet + terninger nu vs. stald-afkast til sidst (ekspert-review pkt. 5)
    // v2.16: Varige hest/jockey-point kan IKKE længere købes for penge — de tjenes
    // udelukkende på øvelserne. Penge køber løbsdags-boosts (paddockBoosts) og stald-værdi.
    horse: [],
    jockey: [],
    // v3.2: stald-investeringer UDGÅET — man vinder på løbspoint, ikke staldværdi,
    // så "varig værdi" havde intet formål. Penge bruges på jockeyer, dagsform og væddemål.
    stable: [],
  },

  // ---- Paddocken (v2.13): kort investeringsvindue før hvert løb ----
  paddockSeconds: 180,

  // ---- Auktion ----
  auctionHouseExchangeFee: 100,  // FAST byttegebyr i auktionshuset (autoritativ)
  auctionHouseExchangeRate: 0.5, // (kompatibilitet) andel af købspris — bruges kun hvis fast gebyr mangler
  // Ved videresalg på auktion får forrige ejer kun denne andel af buddet — resten går til
  // banken. Dæmper rich-get-richer (ekspert-review pkt. 2). 1 = alt til forrige ejer.
  auctionResaleSplit: 0.5,

  // ---- Bots: computerstyrede stalde (stærke tidligt, falder af til sidst) ----
  bots: {
    maxBots: 3,
    names: ['Stald Kometen 🤖', 'Stald Tordenhov 🤖', 'Stald Guldfaksen 🤖'],
    horseNames: ['Komet', 'Tordenhov', 'Guldfaks'],
    jockeyNames: ['Robo-Rita', 'Auto-Anders', 'Mekaniske Mads'],
    earnIntervalSeconds: 40,           // hvor ofte en bot tjener under en runde
    // v2.13: fladt og lavere niveau — samme tempo alle runder, så rigtige hold kan vinde.
    // Host kan skrue op/ned live med bot-styringen (game.botFactor).
    earnPerMinuteByRound: [250],       // DD/min i alle runder (index = min(runde-1, længde-1))
    earnJitter: 0.15,                  // ±15% tilfældighed pr. udbetaling (mere forudsigelige)
    raceRollChancePerTick: 0.22,       // sandsynlighed pr. sekund for at botten slår i åbent løb
  },

  // ---- Cooldowns (sekunder) ----
  defaultCooldownSeconds: 300,   // 5 min for pengeopgaver
  auctionExerciseCooldownSeconds: 180, // 3 min for penge-auktionsøvelser

  // ---- Pengeopgaver (altid tilgængelige) ----
  moneyTasks: {
    tip13: {
      rewardPerCorrect: 100,     // 13/13 = 1300 SD
      cooldownSeconds: 300,
    },
    // Tidslinje: fælles pengeopgave for ALLE hold — løses ved Tidslinje-stationen
    // (egen tablet + fysiske kort). Cooldown og sæt-rotation er pr. hold.
    tidslinje: {
      rewardOnSuccess: 300,
      rewardOnFail: 0,
      cooldownSeconds: 300,
      cardsPerDraw: 5,           // antal tilfældige numre pr. træk (fra puljen på 40)
    },
    mindpuzzle: {
      rewardPerLevel: 300,       // fast belønning — banerne bliver sværere af sig selv
      cooldownSeconds: 300,
    },
    dyst: {
      rewardWinner: 500,
      rewardLoser: 0,            // kan sættes negativt for at tabe penge
      questionsPerDuel: 3,
      cooldownSeconds: 300,
    },
  },

  // ---- Mind Puzzle (Horse Academy) — auto-godkendelse på tablet ----
  mindpuzzleAuto: {
    questionsPerCheck: 2,        // antal kontrolspørgsmål pr. godkendelse
    penaltyCooldownSeconds: 60,  // pause ved forkert svar (nye spørgsmål bagefter)
  },

  // ---- Puslespil / Derby-licens ----
  puzzle: {
    grantsDerbyLicense: false,   // v3.1: puslespillet giver DD, ikke licens
    rewardOnComplete: 0,         // udbetaling sker via procent-godkendelse (se rewardPer25)
    rewardPer25: 600,            // 600 DD pr. 25 % samlet
    rewardFullBonus: 600,        // +600 DD bonus ved 100 %
    // v3.1: "licensen" = pynt hest + staldskilt godkendt. Mangler den, koster det slag i finalen.
    noLicenseFinalRollPenalty: 1,
  },
  // v3.1: kreativ kåring før finalen — top 3 får løbspoint-bonus
  creativePodiumPoints: [5, 3, 2],

  // ---- Kreative opgaver (host scorer manuelt) ----
  creative: {
    // Max sænket 1500→800 så host-skøn ikke kan overdøve spillets egne mekanikker
    // (ekspert-review pkt. 9: procedural fairness).
    horseStyling: { label: 'Pynt jeres hest', maxBonus: 800 },
    stableSign: { label: 'Design jeres staldskilt', maxBonus: 800 },
    // Bonus gives som staldværdi (påvirker totalværdi men ikke kontanter).
    bonusAsStableValue: true,
  },

  // ---- Rollekort (teamdynamik: alle skal have en funktion, rotation mellem runder) ----
  roles: [
    { id: 'staldchef', label: 'Staldchef', labelEn: 'Stable Chief', desc: 'Fører ordet ved jockey-auktionen og har sidste ord i køb og bud.', descEn: 'Speaks for the stable at the jockey auction and has the final say on purchases and bids.' },
    { id: 'bookmaker', label: 'Bookmaker', labelEn: 'Bookmaker', desc: 'Styrer tabletten: sponsoropgaver, investeringer og væddemål.', descEn: 'Runs the tablet: Sponsor Tasks, investments and bets.' },
    { id: 'traener', label: 'Træner', labelEn: 'Trainer', desc: 'Leder stationerne og fordeler holdet på dem.', descEn: 'Leads the stations and assigns the team across them.' },
    { id: 'staldkarl', label: 'Staldkarl', labelEn: 'Stable Hand', desc: 'Driver puslespillet og de kreative opgaver fremad.', descEn: 'Drives the puzzle and the creative tasks forward.' },
  ],
};

module.exports = gameConfig;
