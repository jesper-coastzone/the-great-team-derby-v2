/*
 * gameState.js — central, autoritativ spiltilstand.
 *  - store: alle aktive spil i hukommelsen (+ autosave til disk)
 *  - createGame / makeTeam: fabrikker
 *  - derived getters: totalStableValue, diceRange
 *  - buildStateFor: rollebaseret snapshot der sendes til klienterne
 */
const fs = require('fs');
const path = require('path');
const cfg = require('../../config/gameConfig');
const auctionExercises = require('../../config/auctionExercises');
const { alwaysAvailableTasks } = require('../../config/tasks');
const { buildDeck } = require('../../config/slides');
const { uid, gameCode, now } = require('./util');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

// Staldfarver (silks) — premium, dæmpede toner i Katjas ånd. Op til 12 hold.
const STABLE_COLORS = [
  { name: 'Burgundy', hex: '#6E1F2E' },
  { name: 'Navy', hex: '#1F3E63' },
  { name: 'Turf', hex: '#2D4A3D' },
  { name: 'Champagne', hex: '#C9A227' },
  { name: 'Rubin', hex: '#B83232' },
  { name: 'Teal', hex: '#2F6E7A' },
  { name: 'Blomme', hex: '#5B2A4E' },
  { name: 'Rust', hex: '#A2542A' },
  { name: 'Skov', hex: '#3E6B3A' },
  { name: 'Skifer', hex: '#3B4A63' },
  { name: 'Okker', hex: '#7A5A1E' },
  { name: 'Rosa', hex: '#9C4A5A' },
];

const store = new Map(); // code -> game

// ---------------- Fabrikker ----------------
function makeTeam(game, number) {
  const color = STABLE_COLORS[(number - 1) % STABLE_COLORS.length];
  return {
    id: uid('team'),
    teamNumber: number,
    color,
    stableName: `Stald ${number}`,
    horseName: '',
    jockeyName: '',
    managerName: '',            // staldansvarlig (v2.17)
    ready: false,
    joined: false,
    connected: false,

    cash: cfg.startCash,
    horseValue: cfg.baseHorseValue,
    jockeyValue: cfg.baseJockeyValue,
    stableValue: cfg.baseStableValue,

    horseLevel: 0,
    jockeyLevel: 0,
    horsePerformancePoints: 0,
    jockeyPerformancePoints: 0,

    ownedAuctionExerciseId: null,
    ownedExercisePurchasePrice: 0,
    mindPuzzleLevel: 0,

    derbyLicense: false,
    creativeBonusGiven: false,

    investmentsMade: {},        // productId -> antal køb (loft i cfg.maxPurchasesPerOption)
    roles: {},                  // roleId -> navn (rollekort)
    rolesRound: 0,              // hvilken runde rollerne senest blev sat i (rotation)

    race: { position: 0, rolls: [], lastRoll: 0, rollSum: 0, done: false, hasRolled: false },

    jockey: null,               // v3: hyret jockey fra jockey-auktionen (kun sæsonens løb)
    racePoints: 0,              // v3: VINDERKRITERIET — placeringspoint fra løbene
    pointsHistory: [],          // [{round, place, points, final}]

    taskStatus: {},
    cooldowns: {},

    recentTransactions: [],
  };
}

function makeAuctionExercises() {
  return auctionExercises.map((ex) => ({
    ...ex,
    currentOwnerTeamId: null,
    lastPurchasePrice: 0,
    isInAuctionHouse: true,
    successCount: 0,
    resultHistory: [],
  }));
}

function createGame(settings = {}) {
  // v3: format (2t/3t) bestemmer antal sæsoner; lang styrer deltager-sprog
  const fmtKey = (settings.format === '3t') ? '3t' : '2t';
  const fmt = (cfg.formats || {})[fmtKey] || { seasons: 3 };
  const s = {
    format: fmtKey,
    lang: settings.lang === 'en' ? 'en' : 'da',
    eventName: settings.eventName || 'The Great Team Derby',
    programItems: settings.programItems && settings.programItems.length
      ? settings.programItems
      : ['Velkomst', 'Introduktion', 'Pre-season', 'Auktion', 'Runde', 'Løb', 'The Great Team Derby', 'Afrunding'],
    numTeams: Math.min(settings.numTeams || cfg.defaults.numTeams, cfg.maxTeams),
    totalRounds: settings.totalRounds || fmt.seasons || cfg.defaults.totalRounds,
    roundLengthSeconds: settings.roundLengthSeconds || cfg.defaults.roundLengthSeconds,
    auctionLengthSeconds: settings.auctionLengthSeconds || cfg.defaults.auctionLengthSeconds,
    includeWarmup: settings.includeWarmup === true, // v3: warm-up er UDGÅET (default fra)
    warmupReward: settings.warmupReward != null ? settings.warmupReward : cfg.warmupReward,
  };

  const deck = buildDeck(s);
  const game = {
    id: uid('game'),
    code: gameCode(),
    createdAt: now(),
    settings: s,
    status: 'lobby',
    deck,
    activeSlideIndex: 0,
    currentPhase: deck[0].phase,
    currentRound: 0,
    screenMessageOverride: null,
    tabletModeOverride: null,

    teams: [],
    auction: null,
    auctionHistory: [],
    trades: [],
    duels: [],
    races: [],
    currentRaceId: null,
    timers: {},
    transactions: [],
    log: [],
    warmupPaid: false,
    // Lyd på storskærmen — styres af host (musik kræver filer i /assets/audio/)
    sound: { roundMusic: false, raceMusic: false, tts: false },
    // Skjulte øvelser/opgaver (host: glemt grej eller for få hold)
    disabled: { exercises: [], moneyTasks: [] },
  };

  for (let i = 1; i <= s.numTeams; i++) game.teams.push(makeTeam(game, i));

  // Bots: computerstyrede stalde — stærke tidligt, falder af til sidst (cfg.bots)
  const botCfg = cfg.bots || {};
  const wantedBots = Math.max(0, Math.min(Number(settings.numBots) || 0, botCfg.maxBots || 0));
  const numBots = Math.min(wantedBots, Math.max(0, cfg.maxTeams - game.teams.length));
  for (let b = 0; b < numBots; b++) {
    const bot = makeTeam(game, game.teams.length + 1);
    bot.isBot = true;
    bot.joined = true;
    bot.connected = true;
    bot.ready = true;
    bot.stableName = (botCfg.names || [])[b] || `Stald Bot ${b + 1} 🤖`;
    bot.horseName = (botCfg.horseNames || [])[b] || `Bot-hest ${b + 1}`;
    bot.jockeyName = (botCfg.jockeyNames || [])[b] || `Bot-jockey ${b + 1}`;
    bot.botNextEarnAt = 0;
    game.teams.push(bot);
  }
  s.numBots = numBots;

  game.auctionExercisePool = makeAuctionExercises();

  store.set(game.code, game);
  saveGame(game);
  return game;
}

function getGame(code) { return code ? store.get(String(code).toUpperCase()) : null; }
function getTeam(game, teamId) { return game.teams.find((t) => t.id === teamId); }

function resetGame(game) {
  const fresh = createGame(game.settings);
  store.delete(fresh.code);
  fresh.code = game.code;
  store.set(game.code, fresh);
  return fresh;
}

function logEvent(game, message) {
  game.log.unshift({ t: now(), message });
  if (game.log.length > 200) game.log.pop();
}

// ---------------- Derived ----------------
function totalStableValue(t) {
  return Math.round(t.cash + t.horseValue + t.jockeyValue + t.stableValue);
}
function diceRange(t) {
  // Løbsdags-boosts (v2.16) tæller med, så tabletten viser den reelle terning
  let bMin = 0, bMax = 0;
  const owned = t.raceBoosts || {};
  (cfg.paddockBoosts || []).forEach((b) => { if (owned[b.id]) { bMin += b.diceMin || 0; bMax += b.diceMax || 0; } });
  // v3: hyret jockey (jockey-auktionen) ændrer top/bund — gælder kun sæsonens løb
  const jk = t.jockey || { topMod: 0, bottomMod: 0 };
  const min = cfg.diceBaseMin + t.jockeyLevel + jk.bottomMod + bMin;
  const max = cfg.diceBaseMax + t.horseLevel + jk.topMod + bMax;
  return { min, max: Math.max(max, min) };
}
function exerciseById(game, id) {
  return game.auctionExercisePool.find((e) => e.id === id);
}

// ---------------- Persistens ----------------
const lastSave = new Map();
function saveGame(game) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const last = lastSave.get(game.code) || 0;
    if (now() - last < 1200) return;
    lastSave.set(game.code, now());
    fs.writeFileSync(path.join(DATA_DIR, `savegame-${game.code}.json`), JSON.stringify(game));
  } catch (e) { /* stille — persistens er bonus */ }
}
function exportGame(game) { return JSON.stringify(game, null, 2); }
function importGame(json) {
  const game = JSON.parse(json);
  store.set(game.code, game);
  return game;
}
function loadGamesFromDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) return;
    for (const f of fs.readdirSync(DATA_DIR)) {
      if (f.startsWith('savegame-') && f.endsWith('.json')) {
        const g = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
        store.set(g.code, g);
      }
    }
  } catch (e) { /* ignore */ }
}

// ---------------- Snapshot (rollebaseret) ----------------
function publicTeam(t) {
  return {
    id: t.id,
    teamNumber: t.teamNumber,
    color: t.color,
    stableName: t.stableName,
    horseName: t.horseName,
    jockeyName: t.jockeyName,
    managerName: t.managerName || '',
    ready: t.ready,
    joined: t.joined,
    connected: t.connected,
    isBot: !!t.isBot,
    raceBoosts: Object.keys(t.raceBoosts || {}),
    racePoints: Math.round(t.racePoints || 0),
    cash: Math.round(t.cash),
    horseValue: Math.round(t.horseValue),
    jockeyValue: Math.round(t.jockeyValue),
    stableValue: Math.round(t.stableValue),
    totalValue: totalStableValue(t),
    horseLevel: t.horseLevel,
    jockeyLevel: t.jockeyLevel,
    dice: diceRange(t),
    // v3: hyret jockey (kun sæsonens løb)
    jockey: t.jockey ? { id: t.jockey.id, name: t.jockey.name, emoji: t.jockey.emoji, topMod: t.jockey.topMod, bottomMod: t.jockey.bottomMod, hire: t.jockey.hire } : null,
    ownedAuctionExerciseId: t.ownedAuctionExerciseId,
    derbyLicense: t.derbyLicense,
    race: t.race,
    // Tidslinje-stationen (egen tablet) skal kunne vise ejerens cooldown
    tidslinjeCooldownUntil: (t.cooldowns || {}).tidslinje || 0,
  };
}

function activeSlide(game) {
  const s = game.deck[game.activeSlideIndex] || game.deck[0];
  return {
    index: game.activeSlideIndex,
    total: game.deck.length,
    id: s.id,
    kind: s.kind,
    phase: s.phase,
    title: s.title,
    screenTitle: s.screenTitle,
    tabletMode: game.tabletModeOverride || s.tabletMode,
    hostHint: s.hostHint,
    meta: s.meta || {},
  };
}

function nextMoneyReward(e, team) {
  if (!e.reward) return null;
  const r = e.reward;
  // v3: frie stationer — belønningen falder pr. STALDENS egne succeser, ikke globalt
  const count = team ? ((team.stationSuccess || {})[e.id] || 0) : e.successCount;
  return Math.max(r.min, r.start - r.decreasePerSuccess * count);
}

function auctionView(game, role, teamId) {
  const hiddenIds = (game.disabled && game.disabled.exercises) || [];
  const viewTeam = role === 'team' && teamId ? getTeam(game, teamId) : null;
  const en = (game.settings && game.settings.lang) === 'en';
  const exercises = game.auctionExercisePool
    // Skjulte øvelser vises kun for host (så de kan slås til igen)
    .filter((e) => role === 'host' || !hiddenIds.includes(e.id))
    .map((e) => ({
      id: e.id, name: en && e.nameEn ? e.nameEn : e.name, category: e.category, short: en && e.shortEn ? e.shortEn : e.short,
      description: en && e.descriptionEn ? e.descriptionEn : e.description, gives: en && e.givesEn ? e.givesEn : e.gives, thresholds: e.thresholds || null,
      lowerIsBetter: !!e.lowerIsBetter, progressive: !!e.progressive,
      currentOwnerTeamId: e.currentOwnerTeamId, lastPurchasePrice: e.lastPurchasePrice,
      isInAuctionHouse: e.isInAuctionHouse, successCount: e.successCount,
      nextReward: e.reward ? nextMoneyReward(e, viewTeam) : null,
      hidden: hiddenIds.includes(e.id),
    }));
  if (!game.auction) return { status: 'none', exercises, bids: [], topBids: [] };
  let bids = game.auction.bids;
  // Højeste bud pr. øvelse — synligt for alle roller så man kan følge budkrigen live.
  const byEx = new Map();
  for (const b of game.auction.bids) {
    const cur = byEx.get(b.exerciseId);
    if (!cur || b.amount > cur.amount) byEx.set(b.exerciseId, b);
  }
  const topBids = [...byEx.values()].map((b) => ({ exerciseId: b.exerciseId, amount: b.amount, teamId: b.teamId }));
  if (role === 'team') bids = bids.filter((b) => b.teamId === teamId);
  else if (role === 'screen') bids = bids.map((b) => ({ exerciseId: b.exerciseId }));
  return {
    status: game.auction.status,
    round: game.auction.round,
    endsAt: game.timers.auction ? game.timers.auction.endsAt : null,
    results: game.auction.results || [],
    bids,
    topBids,
    exercises,
  };
}

function currentRace(game) {
  return game.races.find((r) => r.id === game.currentRaceId) || null;
}

function buildStateFor(game, role, teamId) {
  const me = teamId ? getTeam(game, teamId) : null;
  const race = currentRace(game);
  const state = {
    code: game.code,
    lang: game.settings.lang || 'da',
    format: game.settings.format || '2t',
    eventName: game.settings.eventName,
    programItems: game.settings.programItems,
    status: game.status,
    currency: cfg.currencyAbbr,
    currencyName: cfg.currencyName,
    config: {
      investmentOptions: cfg.investmentOptions,
      auctionHouseExchangeRate: cfg.auctionHouseExchangeRate,
      auctionHouseExchangeFee: cfg.auctionHouseExchangeFee != null ? cfg.auctionHouseExchangeFee : null,
      raceTrackLength: cfg.raceTrackLength,
      maxPurchasesPerOption: cfg.maxPurchasesPerOption || 0,
      roles: cfg.roles || [],
      finalBetting: cfg.finalBetting || { enabled: false },
      paddockBoosts: cfg.paddockBoosts || [],
      raceBetting: cfg.raceBetting || { enabled: false },
      // Niveau-tærskler til progressbarer på tabletten
      horseLevelThresholds: cfg.horseLevelThresholds,
      jockeyLevelThresholds: cfg.jockeyLevelThresholds,
      maxHorseLevel: cfg.maxHorseLevel,
      maxJockeyLevel: cfg.maxJockeyLevel,
      racePoints: cfg.racePoints || { normal: [], final: [] },
    },
    phase: game.currentPhase,
    currentRound: game.currentRound,
    totalRounds: game.settings.totalRounds,
    slide: activeSlide(game),
    screenMessageOverride: game.screenMessageOverride,
    teams: game.teams.map(publicTeam),
    auction: auctionView(game, role, teamId),
    // v3 etape 2: jockey-auktionen i Paddocken
    jockeyAuction: require('./jockeyAuction').publicAuction(game, role === 'team' ? teamId : null),
    timers: game.timers,
    race: race ? {
      id: race.id, type: race.type, status: race.status, rollingOpen: race.rollingOpen,
      rollsPerTeam: race.rollsPerTeam, trackLength: cfg.raceTrackLength,
      positions: race.positions, results: race.results || [],
      feed: (race.feed || []).slice(-14),
      favoriteTeamId: race.favoriteTeamId || null,
      favoriteUsed: !!race.favoriteUsed,
      progress: Object.fromEntries(game.teams.map((t) => [t.id, { used: (race.rolls[t.id] || []).length, allowed: race.allowed[t.id] || race.rollsPerTeam }])),
      odds: race.odds || {},
      bets: race.bets || {},
    } : null,
    warmupPaid: game.warmupPaid,
    sound: game.sound || { roundMusic: false, raceMusic: false, tts: false },
    disabled: game.disabled || { exercises: [], moneyTasks: [] },
    // Pre-season-gennemgang: hvilket punkt fremhæver hosten lige nu? (v2.14)
    preseasonFocus: game.preseasonFocus || null,
    // Løbsdagsøkonomi (v2.16): odds-tavle + præmietavle i Paddocken
    paddockOdds: game.paddockOdds || null,
    nextRacePrizes: (game.currentPhase === 'paddock' || game.currentPhase === 'race' || game.currentPhase === 'final-race')
      ? require('./races').prizePreview(game) : null,
    // Forandringskort: aktivt kort (alle roller) + multiplikatorer til visning
    activeChangeCard: game.changeCard
      ? { id: game.changeCard.id, emoji: game.changeCard.emoji, title: game.changeCard.title, text: game.changeCard.text, manual: game.changeCard.manual, playedAt: game.changeCard.playedAt }
      : null,
    taskMultipliers: game.taskMultipliers || {},
    role,
  };

  // Server-autoritativ stilling — v3: LØBSPOINT er vinderkriteriet (staldværdi = tiebreak/info)
  state.ranking = [...game.teams]
    .map((t) => ({
      teamId: t.id, stableName: t.stableName, color: t.color,
      racePoints: Math.round(t.racePoints || 0),
      totalValue: totalStableValue(t),
      cash: Math.round(t.cash), horseValue: Math.round(t.horseValue),
      jockeyValue: Math.round(t.jockeyValue), stableValue: Math.round(t.stableValue),
    }))
    .sort((a, b) => (b.racePoints - a.racePoints) || (b.totalValue - a.totalValue))
    .map((r, i) => ({ ...r, place: i + 1 }));

  if (role === 'host') {
    state.log = game.log.slice(0, 60);
    state.settings = game.settings;
    state.botFactor = game.botFactor != null ? game.botFactor : 1;
    state.pendingApprovals = collectPendingApprovals(game);
    state.trades = game.trades;
    state.deck = game.deck.map((s) => ({ index: s.index, title: s.title, phase: s.phase }));
    // Kort-katalog til Forandringskort-panelet
    state.changeCards = require('../../config/changeCards').map((c) => ({
      id: c.id, emoji: c.emoji, title: c.title, text: c.text,
      hostHint: c.hostHint, manual: !(c.effects && c.effects.length),
    }));
  }

  // Debrief-data (kun beregnet når debrief-slidet er aktivt)
  if ((role === 'screen' || role === 'host') && state.slide.kind === 'debrief') {
    state.debrief = debriefStats(game);
  }

  // Odds-tavlens væddemål: host/skærm ser alle; et hold ser kun sit eget
  const allBets = Object.entries(game.raceBets || {}).map(([bettorId, b]) => ({
    bettorId, targetTeamId: b.targetTeamId, amount: b.amount, odds: b.odds,
  }));
  if (role === 'host' || role === 'screen') state.raceBets = allBets;

  if (role === 'team' && me) {
    state.myBet = (game.raceBets || {})[me.id] || null;
    state.me = {
      ...publicTeam(me),
      mindPuzzleLevel: me.mindPuzzleLevel,
      horsePerformancePoints: me.horsePerformancePoints,
      jockeyPerformancePoints: me.jockeyPerformancePoints,
      ownedExercisePurchasePrice: me.ownedExercisePurchasePrice,
      taskStatus: me.taskStatus,
      cooldowns: me.cooldowns,
      recentTransactions: me.recentTransactions.slice(0, 8),
      investmentsMade: me.investmentsMade || {},
      roles: me.roles || {},
      rolesRound: me.rolesRound || 0,
    };
    state.trades = game.trades.filter((tr) => tr.fromTeamId === teamId || tr.toTeamId === teamId);
    state.duels = require('./tasks').duelsForTeam(game, teamId);
  }

  return state;
}

// Auto-genererede datapunkter pr. hold til debrief-slidet
function debriefStats(game) {
  return game.teams.filter((t) => t.joined).map((t) => {
    const tx = game.transactions.filter((x) => x.teamId === t.id);
    const sumAbs = (type, neg) => tx.filter((x) => x.type === type && (neg ? x.amount < 0 : x.amount > 0)).reduce((a, x) => a + Math.abs(x.amount), 0);
    return {
      teamId: t.id, stableName: t.stableName, color: t.color,
      biggestBid: Math.max(0, ...tx.filter((x) => x.type === 'auction' && x.amount < 0).map((x) => -x.amount)),
      trades: game.trades.filter((tr) => tr.status === 'accepted' && [tr.fromTeamId, tr.toTeamId].includes(t.id)).length,
      invested: sumAbs('invest', true),
      earnedTasks: sumAbs('task') + sumAbs('exercise'),
      racePrizes: sumAbs('race'),
      betOutcome: sumAbs('bet') - sumAbs('bet', true),
      cash: Math.round(t.cash),
      totalValue: totalStableValue(t),
    };
  });
}

function collectPendingApprovals(game) {
  const list = [];
  for (const t of game.teams) {
    for (const [taskId, st] of Object.entries(t.taskStatus)) {
      if (st.pending) list.push({ teamId: t.id, stableName: t.stableName, taskId, kind: st.pendingKind, meta: st.pendingMeta || {} });
    }
  }
  return list;
}

module.exports = {
  STABLE_COLORS, store, createGame, makeTeam, getGame, getTeam, resetGame,
  logEvent, totalStableValue, diceRange, exerciseById, currentRace,
  saveGame, exportGame, importGame, loadGamesFromDisk,
  buildStateFor, publicTeam, activeSlide, nextMoneyReward,
};
