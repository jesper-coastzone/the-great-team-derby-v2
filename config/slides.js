/*
 * slides.js — den indbyggede præsentation.
 * buildDeck(settings) genererer den fulde, ordnede slide-liste ud fra antal runder mm.
 *
 * Hvert slide styrer BÅDE storskærmen (screenView) OG tablet-tilstanden (tabletMode).
 * Når host skifter slide, følger skærm og tablets automatisk.
 */

const PHASES = {
  INTRO: 'intro',
  SETUP: 'setup',
  PRESEASON: 'preseason',
  PRESEASON_ROUND: 'preseason-round',
  WARMUP: 'warmup',
  AUCTION_INTRO: 'auction-intro',
  AUCTION: 'auction',
  ROUND: 'round',
  PADDOCK: 'paddock',
  RACE: 'race',
  LEADERBOARD: 'leaderboard',
  FINAL_READY: 'final-ready',
  FINAL_RACE: 'final-race',
  REVEAL: 'reveal',
};

// Sæsonnavne i stedet for "Runde 1/2/..." — skalerer med antal runder.
const SEASONS = ['Forårssæsonen', 'Sommersæsonen', 'Efterårssæsonen', 'Vintersæsonen'];
function seasonName(r, total) {
  if (total <= 1) return SEASONS[2];                      // én runde: Efterårssæsonen
  if (total === 2) return [SEASONS[0], SEASONS[2]][r - 1] || `Sæson ${r}`; // forår + efterår
  return SEASONS[r - 1] || `Sæson ${r}`;
}

function buildDeck(settings) {
  const rounds = settings.totalRounds || 2;
  const includeWarmup = settings.includeWarmup !== false;
  const slides = [];

  const push = (s) => slides.push(s);

  // ---- Intro ----
  push({ kind: 'intro-coastzone', phase: PHASES.INTRO, title: 'Velkommen',
    screenTitle: 'CoastZone', tabletMode: 'welcome',
    hostHint: 'Byd velkommen og introducér CoastZone kort.' });
  push({ kind: 'program', phase: PHASES.INTRO, title: 'Program',
    screenTitle: 'Dagens program', tabletMode: 'welcome',
    hostHint: 'Gennemgå dagens program.' });
  push({ kind: 'derby-intro', phase: PHASES.INTRO, title: 'The Great Team Derby',
    screenTitle: 'The Great Team Derby', tabletMode: 'welcome',
    hostHint: 'Introducér universet: samarbejde, strategi, investeringer, performance — og evnen til at skifte kurs, når spillet gør det.' });
  push({ kind: 'how-to-win', phase: PHASES.INTRO, title: 'Sådan vinder I',
    screenTitle: 'Sådan vinder I', tabletMode: 'welcome',
    hostHint: 'Forklar: den mest værdifulde stald vinder — ikke nødvendigvis løbsvinderen.' });
  push({ kind: 'game-flow', phase: PHASES.INTRO, title: 'Spillets gang',
    screenTitle: 'Spillets gang', tabletMode: 'welcome',
    hostHint: 'Forklar loopet: auktion → i stalden (opgaver) → Paddocken (investér) → løb → stilling.' });

  // ---- Setup ----
  push({ kind: 'stable-setup', phase: PHASES.SETUP, title: 'Skab jeres stald',
    screenTitle: 'Skab jeres stald', tabletMode: 'stable-setup',
    hostHint: 'Tablets åbner setup-formularen. Hold dukker op på skærmen.' });
  push({ kind: 'ready-check', phase: PHASES.SETUP, title: 'Klar-tjek',
    screenTitle: 'Er alle stalde klar?', tabletMode: 'ready-wait',
    hostHint: 'Se alle hold. Ret navne hvis nødvendigt. Vent til alle er klar.' });

  // ---- Pre-season: pengeopgaverne forklares → spilbar prøverunde ----
  push({ kind: 'preseason-tasks', phase: PHASES.PRESEASON, title: 'Pengeopgaverne',
    screenTitle: 'Sådan tjener I Derby Dollars', tabletMode: 'pre-season',
    hostHint: 'Forklar de fire pengeopgaver kort: Tip en 13\'er, Tidslinjen, Dysten og Mind Puzzle. Tablets kan trykke rundt imens.' });
  push({ kind: 'preseason-round', phase: PHASES.PRESEASON_ROUND, title: 'Pre-season — prøverunden',
    screenTitle: 'Pre-season er i gang!', tabletMode: 'preseason-dashboard',
    hostHint: 'Start rundetimeren (fx 10 min). Holdene tjener ÆGTE Derby Dollars på pengeopgaverne og kan læse om de faste opgaver.' });

  // ---- Warm-up ----
  if (includeWarmup) {
    push({ kind: 'warmup-race', phase: PHASES.WARMUP, title: 'Warm-up løb',
      screenTitle: 'Warm-up løb', tabletMode: 'warmup-race',
      hostHint: 'Tryk "Afspil warm-up løb" — det ender uafgjort. Til sidst: udbetal startkapital til alle.' });
  }

  // ---- Auktionen forklares (efter warm-up, inden første auktion) ----
  push({ kind: 'auction-intro', phase: PHASES.AUCTION_INTRO, title: 'Auktionen forklaret',
    screenTitle: 'Auktionen — sådan virker den', tabletMode: 'bank',
    hostHint: 'Forklar auktionen: 6 specialøvelser, byd fra tabletten, max én øvelse pr. stald. Byt/auktionshus undervejs.' });

  // ---- Sæsoner (runder) ----
  for (let r = 1; r <= rounds; r++) {
    const season = seasonName(r, rounds);
    push({ kind: 'auction', phase: PHASES.AUCTION, title: `Auktion · ${season}`,
      screenTitle: `Auktion · ${season}`, tabletMode: 'auction', meta: { round: r, auctionNumber: r },
      hostHint: 'Start auktion → luk → afgør vindere.' });
    push({ kind: 'round', phase: PHASES.ROUND, title: season,
      screenTitle: season, tabletMode: 'round-dashboard', meta: { round: r },
      hostHint: 'Start rundetimer. Godkend opgaver undervejs. Investering er LUKKET — den åbner først i Paddocken.' });
    push({ kind: 'paddock', phase: PHASES.PADDOCK, title: `Paddocken · ${season}`,
      screenTitle: `Paddocken · ${season}`, tabletMode: 'paddock', meta: { round: r },
      hostHint: 'Paddock-timeren starter automatisk (3 min). KUN her kan staldene investere Derby Dollars i hest, jockey og stald. Gå videre til løbet, når tiden er gået.' });
    push({ kind: 'race', phase: PHASES.RACE, title: `Løb · ${season}`,
      screenTitle: `Løb · ${season}`, tabletMode: 'race', meta: { round: r, raceType: 'normal' },
      hostHint: 'Åbn rolling → hold slår → afslut løb → udbetal præmier.' });
    push({ kind: 'leaderboard', phase: PHASES.LEADERBOARD, title: `Stilling efter ${season.toLowerCase()}`,
      screenTitle: 'Stilling', tabletMode: 'bank', meta: { round: r },
      hostHint: 'Vis stillingen efter total staldværdi.' });
  }

  // ---- Finale ----
  push({ kind: 'derby-readiness', phase: PHASES.FINAL_READY, title: 'Klar til finalen',
    screenTitle: 'The Great Team Derby — klargøring', tabletMode: 'bank',
    hostHint: 'Kør kreativ showcase-scoring og tjek Derby-licenser.' });
  push({ kind: 'final-race', phase: PHASES.FINAL_RACE, title: 'The Great Team Derby',
    screenTitle: 'The Great Team Derby', tabletMode: 'final-race', meta: { raceType: 'final' },
    hostHint: 'Kør finaleløbet. Udbetal de store præmier.' });
  push({ kind: 'final-reveal', phase: PHASES.REVEAL, title: 'Vinderafsløring',
    screenTitle: 'Vinderen er…', tabletMode: 'final-result',
    hostHint: 'Afslør total staldværdi og vinderstalden.' });
  push({ kind: 'debrief', phase: PHASES.REVEAL, title: 'Debrief',
    screenTitle: 'Hvad skete der egentlig?', tabletMode: 'final-result',
    hostHint: 'Kør refleksionen: Hvem traf beslutningerne ved auktionen? Hvornår ændrede I strategi? Hvordan reagerede I, da planen blev væltet? Hvad ville I gøre om?' });

  // Tildel id + index
  return slides.map((s, i) => ({ index: i, id: `s${i}`, ...s }));
}

module.exports = { PHASES, buildDeck };
