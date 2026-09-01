/*
 * slides.js — den indbyggede præsentation (v3).
 * buildDeck(settings) genererer slide-listen ud fra FORMAT (2t/3t) og SPROG (da/en).
 *
 * v3-flow: Intro → Setup → Planlægning → [sæson: Træning → Paddock → Løb → Stilling] × N
 * → Vindercirklen. Sidste sæsons løb ER finalen (The Great Team Derby).
 * Øvelses-auktion, warm-up og pre-season-prøverunde er UDGÅET.
 */

const PHASES = {
  INTRO: 'intro',
  SETUP: 'setup',
  PRESEASON: 'preseason',
  PRESEASON_ROUND: 'preseason-round', // (v2-arv; bruges ikke i v3-deck)
  WARMUP: 'warmup',                   // (v2-arv)
  AUCTION_INTRO: 'auction-intro',     // (v2-arv)
  AUCTION: 'auction',                 // (v2-arv; jockey-auktionen kører i Paddocken)
  ROUND: 'round',
  PADDOCK_INTRO: 'paddock-intro',
  PADDOCK: 'paddock',
  RACE_INTRO: 'race-intro',
  RACE: 'race',
  LEADERBOARD: 'leaderboard',
  FINAL_READY: 'final-ready',
  FINAL_RACE: 'final-race',
  REVEAL: 'reveal',
};

// Sæsonnavne — finalen ligger ALTID i efteråret.
const SEASONS = {
  da: { 3: ['Forårssæsonen', 'Sommersæsonen', 'Efterårssæsonen'], 4: ['Vintersæsonen', 'Forårssæsonen', 'Sommersæsonen', 'Efterårssæsonen'] },
  en: { 3: ['Spring Season', 'Summer Season', 'Autumn Season'], 4: ['Winter Season', 'Spring Season', 'Summer Season', 'Autumn Season'] },
};
function seasonName(r, total, lang) {
  const L = SEASONS[lang] || SEASONS.da;
  const list = L[total] || L[3];
  return list[r - 1] || (lang === 'en' ? `Season ${r}` : `Sæson ${r}`);
}

// Slide-tekster pr. sprog (skærmtitler er deltager-vendte; hostHint er altid dansk).
const TXT = {
  da: {
    welcome: 'Velkommen', screenWelcome: 'CoastZone',
    program: 'Program', screenProgram: 'Dagens program',
    derby: 'The Great Team Derby',
    howToWin: 'Sådan vinder I', screenHowToWin: 'Sådan vinder I',
    gameFlow: 'Spillets gang', screenGameFlow: 'Spillets gang',
    setup: 'Skab jeres stald', readyCheck: 'Klar-tjek', screenReady: 'Er alle stalde klar?',
    planning: 'Planlægning', screenPlanning: 'Planlægning — læg jeres taktik',
    training: 'Træning', paddock: 'Paddocken', race: 'Løb',
    standings: 'Stillingen efter', screenStandings: 'Stillingen — løbspoint',
    finale: 'The Great Team Derby',
    reveal: 'Vindercirklen', screenReveal: 'Vinderen er…',
    debrief: 'Debrief', screenDebrief: 'Hvad skete der egentlig?',
  },
  en: {
    welcome: 'Welcome', screenWelcome: 'CoastZone',
    program: 'Programme', screenProgram: "Today's programme",
    derby: 'The Great Team Derby',
    howToWin: 'How to win', screenHowToWin: 'How to win',
    gameFlow: 'How the game works', screenGameFlow: 'How the game works',
    setup: 'Create your stable', readyCheck: 'Ready check', screenReady: 'Are all stables ready?',
    planning: 'Planning', screenPlanning: 'Planning — set your tactics',
    training: 'Training', paddock: 'The Paddock', race: 'Race',
    standings: 'Standings after', screenStandings: 'Standings — Race Points',
    finale: 'The Great Team Derby',
    reveal: "The Winner's Circle", screenReveal: 'And the winner is…',
    debrief: 'Debrief', screenDebrief: 'What actually happened?',
  },
};

function buildDeck(settings) {
  const seasons = settings.totalRounds || 3;
  const lang = settings.lang === 'en' ? 'en' : 'da';
  const T = TXT[lang];
  const slides = [];
  const push = (s) => slides.push(s);

  // ---- Intro ----
  push({ kind: 'intro-coastzone', phase: PHASES.INTRO, title: T.welcome,
    screenTitle: T.screenWelcome, tabletMode: 'welcome',
    hostHint: 'Byd velkommen og introducér CoastZone kort.' });
  push({ kind: 'program', phase: PHASES.INTRO, title: T.program,
    screenTitle: T.screenProgram, tabletMode: 'welcome',
    hostHint: 'Gennemgå dagens program.' });
  push({ kind: 'derby-intro', phase: PHASES.INTRO, title: T.derby,
    screenTitle: T.derby, tabletMode: 'welcome',
    hostHint: 'Introducér universet: I er væddeløbsstalde. Tjen Derby Dollars, gør hesten klar — og vind løbspoint.' });
  push({ kind: 'how-to-win', phase: PHASES.INTRO, title: T.howToWin,
    screenTitle: T.screenHowToWin, tabletMode: 'welcome',
    hostHint: 'NYT VINDERKRITERIE: Flest LØBSPOINT vinder (Grand Prix-model). Placering i løbene giver point — finalen giver dobbelt. Derby Dollars er midlet, point er målet.' });
  push({ kind: 'game-flow', phase: PHASES.INTRO, title: T.gameFlow,
    screenTitle: T.screenGameFlow, tabletMode: 'welcome',
    hostHint: `Forklar sæson-loopet: Træning → Investering (Paddocken) → Løb. ${seasons} sæsoner i dag — sidste løb ER The Great Team Derby.` });

  // ---- Setup ----
  push({ kind: 'stable-setup', phase: PHASES.SETUP, title: T.setup,
    screenTitle: T.setup, tabletMode: 'stable-setup',
    hostHint: 'Tablets åbner setup-formularen. Hold dukker op på skærmen.' });
  push({ kind: 'ready-check', phase: PHASES.SETUP, title: T.readyCheck,
    screenTitle: T.screenReady, tabletMode: 'ready-wait',
    hostHint: 'Se alle hold. Ret navne hvis nødvendigt. Vent til alle er klar.' });

  // ---- Planlægning (m. host-styret fremhævning; ingen prøverunde) ----
  push({ kind: 'preseason-tasks', phase: PHASES.PRESEASON, title: T.planning,
    screenTitle: T.screenPlanning, tabletMode: 'pre-season',
    hostHint: 'Planlægningsfasen: gennemgå pengeopgaver og stationer med fremhæv-knapperne — holdene følger med på print, der spejler tabletten, og lægger taktik.' });

  // ---- Sæsoner ----
  for (let r = 1; r <= seasons; r++) {
    const season = seasonName(r, seasons, lang);
    const isFinal = r === seasons;

    push({ kind: 'round', phase: PHASES.ROUND, title: `${T.training} · ${season}`,
      screenTitle: `${T.training} · ${season}`, tabletMode: 'round-dashboard', meta: { round: r },
      hostHint: 'Start rundetimer. Godkend opgaver undervejs. HUSK: hele stalden samlet ved officielle stationsforsøg. Investering åbner først i Paddocken.' });

    if (r === 1) {
      push({ kind: 'paddock-intro', phase: PHASES.PADDOCK_INTRO, title: lang === 'en' ? 'The Paddock explained' : 'Paddocken forklaret',
        screenTitle: lang === 'en' ? 'The Paddock — how it works' : 'Paddocken — sådan virker den', tabletMode: 'welcome',
        hostHint: 'Forklar Paddocken: 1) Præmietavlen viser sæsonens løbspoint + DD-præmier. 2) Dagsform-boosts gælder KUN næste løb. 3) Odds-tavlen: ét væddemål pr. stald. Alt nulstilles efter løbet — hvert løb er sit eget løb.' });
    }

    push({ kind: 'paddock', phase: PHASES.PADDOCK, title: `${T.paddock} · ${season}`,
      screenTitle: `${T.paddock} · ${season}`, tabletMode: 'paddock', meta: { round: r, final: isFinal },
      hostHint: 'Paddock-timeren starter automatisk (3 min — kan forlænges herunder). Dagsform, stald-investering og væddemål. Investeringer gælder kun denne sæsons løb.' });

    if (r === 1) {
      push({ kind: 'race-intro', phase: PHASES.RACE_INTRO, title: lang === 'en' ? 'The race explained' : 'Løbet forklaret',
        screenTitle: lang === 'en' ? 'The race — how it works' : 'Løbet — sådan virker det', tabletMode: 'welcome',
        hostHint: 'Forklar løbet: 5 spurter pr. stald. Placeringen giver LØBSPOINT efter præmietavlen — dem vinder man på. Events og opløbsfight undervejs.' });
    }

    if (isFinal) {
      push({ kind: 'final-race', phase: PHASES.FINAL_RACE, title: T.finale,
        screenTitle: T.finale, tabletMode: 'final-race', meta: { round: r, raceType: 'final' },
        hostHint: 'FINALEN — point-tavlen giver dobbelt (20/14/10/6/4/2). Kør løbet, udbetal præmier. Herefter Vindercirklen.' });
    } else {
      push({ kind: 'race', phase: PHASES.RACE, title: `${T.race} · ${season}`,
        screenTitle: `${T.race} · ${season}`, tabletMode: 'race', meta: { round: r, raceType: 'normal' },
        hostHint: 'Åbn rolling → hold slår → afslut løb. Placeringspoint (10/7/5/3/2/1) og DD-præmier udbetales automatisk.' });
      push({ kind: 'leaderboard', phase: PHASES.LEADERBOARD, title: `${T.standings} ${season.toLowerCase()}`,
        screenTitle: T.screenStandings, tabletMode: 'bank', meta: { round: r },
        hostHint: 'Vis stillingen i LØBSPOINT (staldværdi er sekundær info).' });
    }
  }

  // ---- Vindercirklen ----
  push({ kind: 'final-reveal', phase: PHASES.REVEAL, title: T.reveal,
    screenTitle: T.screenReveal, tabletMode: 'final-result',
    hostHint: 'Afslør slutstillingen i løbspoint. Diplomer: Vinderne (ét pr. medlem) + Team Spirit ELLER De Kreative (evt. begge). 3t: også De Forandringsparate.' });
  push({ kind: 'debrief', phase: PHASES.REVEAL, title: T.debrief,
    screenTitle: T.screenDebrief, tabletMode: 'final-result',
    hostHint: 'Refleksion: Hvordan fordelte I roller? Hvornår ændrede I taktik? Hvad gjorde jer hurtigere som hold?' });

  return slides.map((s, i) => ({ index: i, id: `s${i}`, ...s }));
}

module.exports = { PHASES, buildDeck, seasonName };
