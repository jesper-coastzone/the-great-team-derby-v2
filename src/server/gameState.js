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
  const s = {
    eventName: settings.eventName || 'The Great Team Derby',
    programItems: settings.programItems && settings.programItems.length
      ? settings.programItems
      : ['Velkomst', 'Introduktion', 'Pre-season', 'Auktion', 'Runde', 'Løb', 'The Great Team Derby', 'Afrunding'],
    numTeams: Math.min(settings.numTeams || cfg.defaults.numTeams, cfg.maxTeams),
    totalRounds: settings.totalRounds || cfg.defaults.totalRounds,
    roundLengthSeconds: settings.roundLengthSeconds || cfg.defaults.roundLengthSeconds,
    auctionLengthSeconds: settings.auctionLengthSeconds || cfg.defaults.auctionLengthSeconds,
    includeWarmup: settings.includeWarmup !== false,
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
  const min = cfg.diceBaseMin + t.jockeyLevel;
  const max = cfg.diceBaseMax + t.horseLevel;
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
    ready: t.ready,
    joined: t.joined,
    connected: t.connected,
    isBot: !!t.isBot,
    cash: Math.round(t.cash),
    horseValue: Math.round(t.horseValue),
    jockeyValue: Math.round(t.jockeyValue),
    stableValue: Math.round(t.stableValue),
    totalValue: totalStableValue(t),
    horseLevel: t.horseLevel,
    jockeyLevel: t.jockeyLevel,
    dice: diceRange(t),
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

function nextMoneyReward(e) {
  if (!e.reward) return null;
  const r = e.reward;
  return Math.max(r.min, r.start - r.decreasePerSuccess * e.successCount);
}

function auctionView(game, role, teamId) {
  const exercises = game.auctionExercisePool.map((e) => ({
    id: e.id, name: e.name, category: e.category, short: e.short,
    description: e.description, gives: e.gives, thresholds: e.thresholds || null,
    lowerIsBetter: !!e.lowerIsBetter, progressive: !!e.progressive,
    currentOwnerTeamId: e.currentOwnerTeamId, lastPurchasePrice: e.lastPurchasePrice,
    isInAuctionHouse: e.isInAuctionHouse, successCount: e.successCount,
    nextReward: e.reward ? nextMoneyReward(e) : null,
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
      // Niveau-tærskler til progressbarer på tabletten
      horseLevelThresholds: cfg.horseLevelThresholds,
      jockeyLevelThresholds: cfg.jockeyLevelThresholds,
      maxHorseLevel: cfg.maxHorseLevel,
      maxJockeyLevel: cfg.maxJockeyLevel,
    },
    phase: game.currentPhase,
    currentRound: game.currentRound,
    totalRounds: game.settings.totalRounds,
    slide: activeSlide(game),
    screenMessageOverride: game.screenMessageOverride,
    teams: game.teams.map(publicTeam),
    auction: auctionView(game, role, teamId),
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
    role,
  };

  // Server-autoritativ stilling efter total staldværdi
  state.ranking = [...game.teams]
    .map((t) => ({
      teamId: t.id, stableName: t.stableName, color: t.color, totalValue: totalStableValue(t),
      cash: Math.round(t.cash), horseValue: Math.round(t.horseValue),
      jockeyValue: Math.round(t.jockeyValue), stableValue: Math.round(t.stableValue),
    }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .map((r, i) => ({ ...r, place: i + 1 }));

  if (role === 'host') {
    state.log = game.log.slice(0, 60);
    state.settings = game.settings;
    state.pendingApprovals = collectPendingApprovals(game);
    state.trades = game.trades;
    state.deck = game.deck.map((s) => ({ index: s.index, title: s.title, phase: s.phase }));
  }

  // Debrief-data (kun beregnet når debrief-slidet er aktivt)
  if ((role === 'screen' || role === 'host') && state.slide.kind === 'debrief') {
    state.debrief = debriefStats(game);
  }

  if (role === 'team' && me) {
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
