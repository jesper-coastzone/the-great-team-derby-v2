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

  // ---- Spilstruktur (default; kan overrides ved oprettelse) ----
  defaults: {
    numTeams: 6,
    totalRounds: 2,
    roundLengthSeconds: 20 * 60,
    includeWarmup: true,
    auctionLengthSeconds: 3 * 60,
  },

  maxTeams: 12,

  // ---- Race ----
  raceTrackLength: 30,
  normalRaceRolls: 4,
  finalRaceRolls: 5,
  diceBaseMin: 2,               // diceMin = diceBaseMin + jockeyLevel
  diceBaseMax: 5,               // diceMax = diceBaseMax + horseLevel
  normalRacePrizes: { 1: 1200, 2: 900, 3: 700, 4: 500, default: 300 },
  // Finalen skal kunne flytte stillingen — spænd 5.000 SD (ekspert-review pkt. 3)
  finalRacePrizes: { 1: 6000, 2: 4200, 3: 3000, 4: 1800, default: 1000 },

  // ---- Finale-væddemål: sats på egen sejr med omvendte odds (comeback-mekanik) ----
  finalBetting: {
    enabled: true,
    minOdds: 1.5,               // odds for holdet der fører
    maxOdds: 4,                 // odds for holdet der ligger sidst
  },

  // ---- Løbs-events (tilfældige overraskelser pr. slag) ----
  raceEvents: {
    enabled: true,
    chancePerRoll: 0.16,        // sandsynlighed for event på hvert slag
    maxPerTeamPerRace: 1,       // højst ét event pr. hold pr. løb
    types: [
      { id: 'vet',      label: 'Dyrlægetjek',   emoji: '🩺', effect: -2, weight: 2 },
      { id: 'headwind', label: 'Modvind',       emoji: '💨', effect: -1, weight: 3 },
      { id: 'tailwind', label: 'Medvind',       emoji: '🌬️', effect: 2,  weight: 3 },
      { id: 'crowd',    label: 'Publikum løfter taget', emoji: '📣', effect: 1, weight: 3 },
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
    horse: [
      { id: 'horse-1', label: 'Bedre foder', cost: 1000, valueIncrease: 1000, performancePoints: 3 },
      { id: 'horse-2', label: 'Elitetræning', cost: 2000, valueIncrease: 2000, performancePoints: 5 },
    ],
    jockey: [
      { id: 'jockey-1', label: 'Ridekursus', cost: 1000, valueIncrease: 1000, performancePoints: 3 },
      { id: 'jockey-2', label: 'Mentaltræning', cost: 2000, valueIncrease: 2000, performancePoints: 5 },
    ],
    stable: [
      // Stald = sikker værdi med lille afkast; max 1 køb pr. option holder det i skak.
      { id: 'stable-1', label: 'Ny boks', cost: 1000, valueIncrease: 1100, performancePoints: 0 },
      { id: 'stable-2', label: 'Staldudvidelse', cost: 2000, valueIncrease: 2300, performancePoints: 0 },
    ],
  },

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
    earnPerMinuteByRound: [460, 150],  // runde 1: stærk · runde 2+: falder af (index = min(runde-1, længde-1))
    earnJitter: 0.25,                  // ±25% tilfældighed pr. udbetaling
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
    grantsDerbyLicense: true,
    rewardOnComplete: 500,       // bonus ved fuldført puslespil (kan sættes til 0)
    // Handicap hvis man kører finalen UDEN licens (færre rolls). 0 = intet handicap.
    noLicenseFinalRollPenalty: 1,
  },

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
    { id: 'staldchef', label: 'Staldchef', desc: 'Fører ordet ved auktionen og har sidste ord i køb og bud.' },
    { id: 'bookmaker', label: 'Bookmaker', desc: 'Styrer tabletten: pengeopgaver, investeringer og væddemål.' },
    { id: 'traener', label: 'Træner', desc: 'Leder de fysiske øvelser og fordeler holdet på dem.' },
    { id: 'staldkarl', label: 'Staldkarl', desc: 'Driver puslespillet og de kreative opgaver fremad.' },
  ],
};

module.exports = gameConfig;
