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
  WARMUP: 'warmup',
  AUCTION: 'auction',
  ROUND: 'round',
  RACE: 'race',
  LEADERBOARD: 'leaderboard',
  FINAL_READY: 'final-ready',
  FINAL_RACE: 'final-race',
  REVEAL: 'reveal',
};

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
    hostHint: 'Introducér universet: samarbejde, strategi, investeringer, performance.' });
  push({ kind: 'how-to-win', phase: PHASES.INTRO, title: 'Sådan vinder I',
    screenTitle: 'Sådan vinder I', tabletMode: 'welcome',
    hostHint: 'Forklar: den mest værdifulde stald vinder — ikke nødvendigvis løbsvinderen.' });
  push({ kind: 'game-flow', phase: PHASES.INTRO, title: 'Spillets gang',
    screenTitle: 'Spillets gang', tabletMode: 'welcome',
    hostHint: 'Forklar loopet: auktion → runde → løb → leaderboard.' });

  // ---- Setup ----
  push({ kind: 'stable-setup', phase: PHASES.SETUP, title: 'Skab jeres stald',
    screenTitle: 'Skab jeres stald', tabletMode: 'stable-setup',
    hostHint: 'Tablets åbner setup-formularen. Hold dukker op på skærmen.' });
  push({ kind: 'ready-check', phase: PHASES.SETUP, title: 'Klar-tjek',
    screenTitle: 'Er alle stalde klar?', tabletMode: 'ready-wait',
    hostHint: 'Se alle hold. Ret navne hvis nødvendigt. Vent til alle er klar.' });

  // ---- Pre-season ----
  push({ kind: 'pre-season', phase: PHASES.PRESEASON, title: 'Pre-season',
    screenTitle: 'Pre-season', tabletMode: 'pre-season',
    hostHint: 'Hold læser regler og planlægger. Ingen belønninger endnu.' });

  // ---- Warm-up ----
  if (includeWarmup) {
    push({ kind: 'warmup-race', phase: PHASES.WARMUP, title: 'Warm-up løb',
      screenTitle: 'Warm-up løb', tabletMode: 'warmup-race',
      hostHint: 'Kør det teatralske warm-up. Til sidst: udbetal startkapital til alle.' });
  }

  // ---- Runder ----
  for (let r = 1; r <= rounds; r++) {
    push({ kind: 'auction', phase: PHASES.AUCTION, title: `Auktion ${r}`,
      screenTitle: `Auktion ${r}`, tabletMode: 'auction', meta: { round: r, auctionNumber: r },
      hostHint: 'Start auktion → luk → afgør vindere.' });
    push({ kind: 'round', phase: PHASES.ROUND, title: `Runde ${r}`,
      screenTitle: `Runde ${r}`, tabletMode: 'round-dashboard', meta: { round: r },
      hostHint: 'Start rundetimer. Godkend opgaver undervejs.' });
    push({ kind: 'race', phase: PHASES.RACE, title: `Løb ${r}`,
      screenTitle: `Løb ${r}`, tabletMode: 'race', meta: { round: r, raceType: 'normal' },
      hostHint: 'Åbn rolling → hold slår → afslut løb → udbetal præmier.' });
    push({ kind: 'leaderboard', phase: PHASES.LEADERBOARD, title: `Stilling efter runde ${r}`,
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
    hostHint: 'Kør refleksionen: Hvem traf beslutningerne ved auktionen? Hvornår ændrede I strategi? Hvad ville I gøre om?' });

  // Tildel id + index
  return slides.map((s, i) => ({ index: i, id: `s${i}`, ...s }));
}

module.exports = { PHASES, buildDeck };
