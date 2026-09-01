/*
 * races.js — løbslogik (v2).
 *  - terning: min = 2 + jockeyLevel, max = 5 + horseLevel
 *  - normal: 4 slag pr. hold · finale: 5 slag
 *  - v2: løbs-events (dyrlæge/vind/publikum), catch-up-bonus, publikumsfavorit,
 *        live-feed til storskærmen, position uden loft og delt plads ved dødt løb.
 */
const cfg = require('../../config/gameConfig');
const { uid, randomInt, now, shuffle } = require('./util');
const gs = require('./gameState');
const L = (game, da, en) => ((game.settings && game.settings.lang) === 'en' ? en : da);
const econ = require('./economy');

function allowedRollsFor(game, team, type) {
  let rolls = type === 'final' ? cfg.finalRaceRolls : cfg.normalRaceRolls;
  if (type === 'final' && !team.derbyLicense) rolls -= cfg.puzzle.noLicenseFinalRollPenalty || 0;
  return Math.max(1, rolls);
}

function startRace(game, type, round) {
  const race = {
    id: uid('race'), type, round: round || game.currentRound,
    status: 'ready', rollingOpen: false,
    rollsPerTeam: type === 'final' ? cfg.finalRaceRolls : cfg.normalRaceRolls,
    positions: {}, rolls: {}, allowed: {}, results: null, prizesApplied: false,
    feed: [],                 // kronologisk hændelsesfeed (nyeste sidst)
    eventCount: {},           // antal tilfældige events pr. hold
    favoriteTeamId: null,     // publikumsfavorit (host udpeger)
    favoriteUsed: false,      // fan-boost er en engangsbonus
    bets: {},                 // teamId -> { amount, odds, resolved, payout }
    odds: {},                 // teamId -> odds (fastlåst ved løbsstart, omvendt af stillingen)
  };
  // Finale-væddemål: odds omvendt af stillingen — føreren får minOdds, sidstepladsen maxOdds
  if (type === 'final' && cfg.finalBetting && cfg.finalBetting.enabled) {
    const ranked = [...game.teams].sort((a, b) => gs.totalStableValue(b) - gs.totalStableValue(a));
    const n = Math.max(1, ranked.length - 1);
    const { minOdds, maxOdds } = cfg.finalBetting;
    ranked.forEach((t, i) => { race.odds[t.id] = Math.round((minOdds + (maxOdds - minOdds) * (i / n)) * 10) / 10; });
  }
  for (const t of game.teams) {
    race.positions[t.id] = 0;
    race.rolls[t.id] = [];
    race.allowed[t.id] = allowedRollsFor(game, t, type);
    race.eventCount[t.id] = 0;
    t.race = { position: 0, rolls: [], lastRoll: 0, rollSum: 0, done: false, hasRolled: false, allowed: race.allowed[t.id] };
  }
  // Uvejr fra forandringskort: gælder præcis ét løb
  if (game.stormNextRace) { race.storm = true; game.stormNextRace = false; pushFeed(race, { kind: 'event', text: L(game, '⛈️ Uvejr over banen — alt kan ske i dette løb!', '⛈️ Storm over the track — anything can happen in this race!') }); }
  game.races.push(race);
  game.currentRaceId = race.id;
  // Publikumsfavorit: bedste hest udpeges automatisk ved løbsstart (host kan stadig ændre det).
  const af = cfg.audienceFavorite || {};
  if (af.enabled && game.teams.length > 1) {
    const sorted = [...game.teams].sort((a, b) => (b.horseValue - a.horseValue) || (b.horseLevel - a.horseLevel));
    const best = sorted[0];
    // Kun når én hest reelt er bedst — i warm-up (alle ens) udpeges ingen favorit.
    if (best.horseValue > sorted[1].horseValue || best.horseLevel > sorted[1].horseLevel) {
      race.favoriteTeamId = best.id;
      pushFeed(race, { kind: 'favorite', teamId: best.id, stableName: best.stableName, text: L(game, `📣 ${best.stableName} har løbets bedste hest og er publikumsfavorit!`, `📣 ${best.stableName} has the best horse in the race and is the crowd favourite!`) });
      gs.logEvent(game, `${best.stableName} er publikumsfavorit (bedste hest).`);
    }
  }
  gs.logEvent(game, `${type === 'final' ? 'Finaleløb' : 'Løb'} startet (${race.rollsPerTeam} slag).`);
  return { ok: true, race };
}

function setRolling(game, open) {
  const race = gs.currentRace(game);
  if (!race) return { ok: false, error: 'Intet aktivt løb.' };
  race.rollingOpen = open;
  race.status = open ? 'running' : race.status;
  return { ok: true };
}

function setFavorite(game, teamId) {
  const race = gs.currentRace(game);
  if (!race) return { ok: false, error: 'Intet aktivt løb.' };
  if (race.status === 'finished') return { ok: false, error: 'Løbet er slut.' };
  const team = teamId ? gs.getTeam(game, teamId) : null;
  race.favoriteTeamId = team ? team.id : null;
  race.favoriteUsed = false;
  if (team) {
    pushFeed(race, { kind: 'favorite', teamId: team.id, stableName: team.stableName, text: L(game, `📣 ${team.stableName} er publikumsfavorit!`, `📣 ${team.stableName} is the crowd favourite!`) });
    gs.logEvent(game, `${team.stableName} er publikumsfavorit.`);
  }
  return { ok: true };
}

function pushFeed(race, entry) {
  race.feed.push({ ...entry, t: now() });
  if (race.feed.length > 60) race.feed.shift();
}

// ---------- Odds-tavlen (v2.16): væddemål i Paddocken på hvilken hest der vinder ----------
// Odds ("morning line") låses når Paddocken åbner — ud fra hestenes varige styrke.
function computePaddockOdds(game) {
  const rb = cfg.raceBetting || {};
  const minOdds = rb.minOdds || 1.5, maxOdds = rb.maxOdds || 5;
  const strengths = game.teams.map((t) => ({ id: t.id, str: t.horseLevel + t.jockeyLevel + (t.jockey ? (t.jockey.topMod + t.jockey.bottomMod) : 0) }));
  const strMin = Math.min(...strengths.map((s) => s.str));
  const strMax = Math.max(...strengths.map((s) => s.str));
  const odds = {};
  strengths.forEach((s) => {
    if (strMax === strMin) { odds[s.id] = Math.round(((minOdds + maxOdds) / 2) * 10) / 10; return; }
    const norm = (s.str - strMin) / (strMax - strMin); // 1 = stærkest
    odds[s.id] = Math.round((maxOdds - norm * (maxOdds - minOdds)) * 10) / 10;
  });
  game.paddockOdds = odds;
  game.raceBets = game.raceBets || {};
  return odds;
}

// Væddemål i Paddocken: én pr. stald pr. løb, på en HVILKEN SOM HELST hest.
function placeBet(game, team, targetTeamId, amount) {
  const rb = cfg.raceBetting || {};
  if (!rb.enabled) return { ok: false, error: L(game, 'Væddemål er slået fra.', 'Betting is disabled.') };
  const gm = require('./gameManager');
  if (!gm.paddockOpen(game)) return { ok: false, error: L(game, 'Odds-tavlen er kun åben i Paddocken.', 'The odds board is only open in the Paddock.') };
  if (!game.paddockOdds) computePaddockOdds(game);
  const target = gs.getTeam(game, targetTeamId);
  if (!target) return { ok: false, error: L(game, 'Ukendt hest.', 'Unknown horse.') };
  game.raceBets = game.raceBets || {};
  if (game.raceBets[team.id]) return { ok: false, error: L(game, 'I har allerede sat jeres væddemål til dette løb.', 'You have already placed your bet for this race.') };
  amount = Math.round(amount);
  const minStake = rb.minStake || 100, maxStake = rb.maxStake || 1000;
  if (!(amount >= minStake)) return { ok: false, error: L(game, `Mindste indsats er ${minStake} ${cfg.currencyAbbr}.`, `Minimum stake is ${minStake} ${cfg.currencyAbbr}.`) };
  if (amount > maxStake) return { ok: false, error: L(game, `Højeste indsats er ${maxStake} ${cfg.currencyAbbr}.`, `Maximum stake is ${maxStake} ${cfg.currencyAbbr}.`) };
  if (amount > team.cash) return { ok: false, error: L(game, 'I kan ikke satse mere end I har i kassen.', 'You cannot stake more than you have in the fund.') };
  const odds = game.paddockOdds[targetTeamId] || rb.minOdds || 1.5;
  econ.addTransaction(game, team, -amount, 'bet', `Væddemål: ${amount} ${cfg.currencyAbbr} på ${target.horseName || target.stableName} (odds ${odds})`);
  game.raceBets[team.id] = { targetTeamId, amount, odds, resolved: false, payout: 0 };
  gs.logEvent(game, `${team.stableName} spillede ${amount} ${cfg.currencyAbbr} på ${target.horseName || target.stableName} (odds ${odds}).`);
  return { ok: true, amount, odds };
}

// Præmie-forhåndsvisning til Paddockens præmietavle
function prizePreview(game) {
  const slide = game.deck[game.activeSlideIndex] || {};
  const isFinal = !!(slide.meta && slide.meta.final) || slide.phase === 'final-race';
  const round = game.currentRound || 1;
  const table = isFinal ? cfg.finalRacePrizes : prizeTableFor(round);
  const rp = cfg.racePoints || {};
  return { isFinal, round, prizes: table, points: (isFinal ? rp.final : rp.normal) || [], winnerMultiplier: cfg.winnerHorseValueMultiplier || 1 };
}

function pickRandomEvent() {
  const types = (cfg.raceEvents && cfg.raceEvents.types) || [];
  const total = types.reduce((a, e) => a + (e.weight || 1), 0);
  if (!total) return null;
  let r = Math.random() * total;
  for (const e of types) { r -= (e.weight || 1); if (r <= 0) return e; }
  return types[types.length - 1];
}

function leaderPosition(race) {
  return Math.max(0, ...Object.values(race.positions));
}

// Summér terning-modifikationer fra holdets løbsdags-boosts
function boostMods(team) {
  const owned = team.raceBoosts || {};
  let min = 0, max = 0;
  (cfg.paddockBoosts || []).forEach((b) => {
    if (owned[b.id]) { min += b.diceMin || 0; max += b.diceMax || 0; }
  });
  return { min, max };
}

function rollForTeam(game, team) {
  const race = gs.currentRace(game);
  if (!race) return { ok: false, error: L(game, 'Intet aktivt løb.', 'No active race.') };
  if (!race.rollingOpen) return { ok: false, error: L(game, 'Der er ikke åbnet for terningerne endnu.', 'Rolling is not open yet.') };
  const used = race.rolls[team.id].length;
  if (used >= race.allowed[team.id]) return { ok: false, error: L(game, 'I har brugt alle jeres slag.', 'You have used all your rolls.') };

  // Løbsdags-boosts (v2.16): købt i Paddocken, gælder kun dette løb
  const bm = boostMods(team);
  const jk = team.jockey || { topMod: 0, bottomMod: 0 }; // v3: hyret jockey
  const min = cfg.diceBaseMin + team.jockeyLevel + jk.bottomMod + bm.min;
  const max = Math.max(cfg.diceBaseMax + team.horseLevel + jk.topMod + bm.max, min);
  const base = randomInt(min, max);

  // Catch-up: langt bagud → lille nøk
  let catchup = 0;
  const cu = cfg.catchup || {};
  if (cu.enabled && leaderPosition(race) - race.positions[team.id] >= (cu.behindBy || 7)) catchup = cu.bonus || 1;

  // Publikumsfavorit: engangs fan-boost på næste slag
  let fanBoost = 0;
  const af = cfg.audienceFavorite || {};
  if (af.enabled && race.favoriteTeamId === team.id && !race.favoriteUsed) {
    fanBoost = af.bonus || 2;
    race.favoriteUsed = true;
  }

  // Tilfældigt event (dyrlæge, vind, publikum) — max N pr. hold pr. løb.
  // Uvejr (forandringskort): dobbelt chance og dobbelt loft i dette løb.
  let event = null;
  const re = cfg.raceEvents || {};
  const stormFactor = race.storm ? 2 : 1;
  if (re.enabled && race.eventCount[team.id] < (re.maxPerTeamPerRace || 1) * stormFactor && Math.random() < (re.chancePerRoll || 0) * stormFactor) {
    event = pickRandomEvent();
    if (event) race.eventCount[team.id] += 1;
  }

  const eventEffect = event ? event.effect : 0;
  const total = Math.max(0, base + catchup + fanBoost + eventEffect);
  race.rolls[team.id].push(total);
  race.positions[team.id] += total; // intet loft — dødt løb skal være sjældent og ægte

  const rr = race.rolls[team.id];
  team.race = {
    position: race.positions[team.id], rolls: rr.slice(),
    lastRoll: total, rollSum: rr.reduce((a, b) => a + b, 0),
    done: rr.length >= race.allowed[team.id], hasRolled: true, allowed: race.allowed[team.id],
  };

  // Feed til storskærm/kommentator
  const evLabel = event ? (L(game, '', 'en') === 'en' && event.labelEn ? event.labelEn : event.label) : null;
  const bits = [];
  if (fanBoost) bits.push(`📣 fan-boost +${fanBoost}`);
  if (catchup) bits.push(`🔥 ${L(game, cu.label || 'Opløbsfight', 'Home-stretch fight')} +${catchup}`);
  if (event) bits.push(`${event.emoji || ''} ${evLabel} ${event.effect > 0 ? '+' : ''}${event.effect}`);
  pushFeed(race, {
    kind: event ? 'event' : 'roll',
    teamId: team.id, stableName: team.stableName,
    base, catchup, fanBoost,
    event: event ? { id: event.id, label: evLabel, emoji: event.emoji, effect: event.effect } : null,
    roll: total, position: race.positions[team.id],
    text: L(game, `🎲 ${team.stableName} slår ${base}${bits.length ? ' · ' + bits.join(' · ') : ''} → rykker ${total} felter`, `🎲 ${team.stableName} rolls ${base}${bits.length ? ' · ' + bits.join(' · ') : ''} → moves ${total} spaces`),
  });

  return { ok: true, roll: total, base, catchup, fanBoost, event: event ? { label: evLabel, emoji: event.emoji, effect: event.effect } : null, position: race.positions[team.id], done: team.race.done };
}

function allRolled(game) {
  const race = gs.currentRace(game);
  if (!race) return false;
  return game.teams.every((t) => race.rolls[t.id].length >= race.allowed[t.id]);
}

// Præmietabel pr. sæson (v2.16) — falder tilbage til normalRacePrizes
function prizeTableFor(round) {
  const byRound = cfg.normalRacePrizesByRound || {};
  const keys = Object.keys(byRound).map(Number);
  if (!keys.length) return cfg.normalRacePrizes;
  const k = Math.min(Math.max(round || 1, Math.min(...keys)), Math.max(...keys));
  return byRound[k] || cfg.normalRacePrizes;
}

function prizeFor(place, type, round) {
  const table = type === 'final' ? cfg.finalRacePrizes : prizeTableFor(round);
  return table[place] != null ? table[place] : table.default;
}

// v3: LØBSPOINT pr. placering — vinderkriteriet. Pladser ud over tabellen får sidste værdi.
function pointsFor(place, type) {
  const rp = cfg.racePoints || {};
  const table = (type === 'final' ? rp.final : rp.normal) || [];
  if (!table.length) return 0;
  return table[Math.min(Math.max(place, 1), table.length) - 1];
}

function finishRace(game) {
  const race = gs.currentRace(game);
  if (!race) return { ok: false, error: 'Intet aktivt løb.' };
  if (race.prizesApplied) return { ok: false, error: 'Løbet er allerede afsluttet.' };

  const ranked = game.teams.map((t) => {
    const rr = race.rolls[t.id];
    return {
      teamId: t.id, stableName: t.stableName,
      position: race.positions[t.id],
      lastRoll: rr.length ? rr[rr.length - 1] : 0,
      rollSum: rr.reduce((a, b) => a + b, 0),
    };
  }).sort((a, b) => b.position - a.position);

  // Delt plads ved præcis samme distance — dødt løb deler placeringen (og præmien).
  const results = [];
  let prevPos = null, prevPlace = 0;
  ranked.forEach((r, idx) => {
    const place = r.position === prevPos ? prevPlace : idx + 1;
    prevPos = r.position; prevPlace = place;
    const prize = prizeFor(place, race.type, race.round);
    const points = pointsFor(place, race.type);
    results.push({ ...r, place, prize, points, deadHeat: false });
  });
  // markér dødt løb
  results.forEach((r) => { r.deadHeat = results.some((o) => o !== r && o.place === r.place); });

  const isRealRaceForPoints = !race.isAutoWarmup && (race.round || 0) > 0;
  for (const r of results) {
    const team = gs.getTeam(game, r.teamId);
    econ.addTransaction(game, team, r.prize, 'race', L(game, `${race.type === 'final' ? 'Finaleløb' : 'Løb'}: ${r.place}. plads${r.deadHeat ? ' (dødt løb)' : ''}`, `${race.type === 'final' ? 'Final race' : 'Race'}: place ${r.place}${r.deadHeat ? ' (dead heat)' : ''}`), race.id);
    // v3: tildel LØBSPOINT (vinderkriteriet)
    if (isRealRaceForPoints && team) {
      team.racePoints = Math.round((team.racePoints || 0) + (r.points || 0));
      team.pointsHistory = team.pointsHistory || [];
      team.pointsHistory.push({ round: race.round, place: r.place, points: r.points || 0, final: race.type === 'final' });
      if (r.points) pushFeed(race, { kind: 'points', teamId: r.teamId, stableName: r.stableName, text: L(game, `🏅 ${r.stableName}: ${r.place}. plads → +${r.points} løbspoint (i alt ${team.racePoints})`, `🏅 ${r.stableName}: place ${r.place} → +${r.points} Race Points (total ${team.racePoints})`) });
    }
  }

  race.results = results;
  race.prizesApplied = true;
  race.rollingOpen = false;
  race.status = 'finished';
  pushFeed(race, { kind: 'finish', text: L(game, `🏁 Løbet er slut! ${results[0].stableName} vinder${results[0].deadHeat ? ' (dødt løb!)' : ''}.`, `🏁 The race is over! ${results[0].stableName} wins${results[0].deadHeat ? ' (dead heat!)' : ''}.`) });

  const isRealRace = !race.isAutoWarmup && (race.round || 0) > 0;

  // v2.16: Vinderhestens værdi ganges op (annonceret på præmietavlen)
  const mult = cfg.winnerHorseValueMultiplier || 1;
  if (isRealRace && mult > 1) {
    results.filter((r) => r.place === 1).forEach((r) => {
      const team = gs.getTeam(game, r.teamId);
      if (!team) return;
      const before = Math.round(team.horseValue);
      team.horseValue = Math.round(before * mult);
      pushFeed(race, { kind: 'double', teamId: r.teamId, stableName: team.stableName, text: L(game, `🐎 ${team.horseName || team.stableName} fordobler sin værdi: ${before} → ${Math.round(team.horseValue)} ${cfg.currencyAbbr}!`, `🐎 ${team.horseName || team.stableName} doubles its value: ${before} → ${Math.round(team.horseValue)} ${cfg.currencyAbbr}!`) });
      gs.logEvent(game, `${team.stableName}s hest steg i værdi: ${before} → ${Math.round(team.horseValue)} ${cfg.currencyAbbr}.`);
    });
  }

  // v2.16: Afgør odds-tavlens væddemål — vandt den hest man spillede på?
  if (isRealRace) {
    for (const [bettorId, bet] of Object.entries(game.raceBets || {})) {
      if (bet.resolved) continue;
      bet.resolved = true;
      const bettor = gs.getTeam(game, bettorId);
      const target = gs.getTeam(game, bet.targetTeamId);
      const res = results.find((r) => r.teamId === bet.targetTeamId);
      if (!bettor || !target) continue;
      const horseName = target.horseName || target.stableName;
      if (res && res.place === 1) {
        bet.payout = Math.round(bet.amount * bet.odds);
        econ.addTransaction(game, bettor, bet.payout, 'bet', L(game, `Væddemål vundet: ${horseName} vandt! (odds ${bet.odds})`, `Bet won: ${horseName} won! (odds ${bet.odds})`), race.id);
        pushFeed(race, { kind: 'bet', teamId: bettorId, stableName: bettor.stableName, text: L(game, `💰 ${bettor.stableName} spillede rigtigt på ${horseName}: +${bet.payout} ${cfg.currencyAbbr}!`, `💰 ${bettor.stableName} backed the right horse — ${horseName}: +${bet.payout} ${cfg.currencyAbbr}!`) });
      } else {
        pushFeed(race, { kind: 'bet', teamId: bettorId, stableName: bettor.stableName, text: L(game, `💸 ${bettor.stableName} tabte væddemålet på ${horseName} (${bet.amount} ${cfg.currencyAbbr}).`, `💸 ${bettor.stableName} lost the bet on ${horseName} (${bet.amount} ${cfg.currencyAbbr}).`) });
      }
    }
  }
  game.raceBets = {};
  game.paddockOdds = null;
  // Løbsdags-boosts er brugt — ryd dem
  game.teams.forEach((t) => { t.raceBoosts = {}; });
  // v3 etape 2: jockeyen var kun hyret til sæsonens løb — tilbage i puljen
  if (isRealRace) require('./jockeyAuction').releaseJockeys(game);

  gs.logEvent(game, `Løb afsluttet. Vinder på banen: ${results[0].stableName}.`);
  return { ok: true, results };
}

// ---------- Automatisk warm-up: scriptet løb der ender i dødt løb ----------

// Plan: hvert hold får 4 slag der ALLE summer til 14, men i forskellig rækkefølge
// (permutationer af [2,3,4,5]) — løbet ser levende ud, men alle ender på samme felt.
function buildWarmupPlan(game) {
  const base = [2, 3, 4, 5]; // sum = 14
  const plan = {};
  const seen = new Set();
  for (const t of game.teams) {
    let order = shuffle(base);
    // Undgå identiske forløb så længe der er ubrugte permutationer (24 mulige);
    // ved >24 hold genbruges rækkefølger.
    let guard = 40;
    while (seen.has(order.join(',')) && seen.size < 24 && guard-- > 0) order = shuffle(base);
    seen.add(order.join(','));
    plan[t.id] = order;
  }
  return plan;
}

// Scriptet slag: som rollForTeam, men uden validering/tilfældighed/events/catch-up.
function applyScriptedRoll(game, team, value) {
  const race = gs.currentRace(game);
  if (!race) return { ok: false, error: 'Intet aktivt løb.' };
  race.rolls[team.id].push(value);
  race.positions[team.id] += value;
  const rr = race.rolls[team.id];
  team.race = {
    position: race.positions[team.id], rolls: rr.slice(),
    lastRoll: value, rollSum: rr.reduce((a, b) => a + b, 0),
    done: rr.length >= race.allowed[team.id], hasRolled: true, allowed: race.allowed[team.id],
  };
  pushFeed(race, {
    kind: 'roll', teamId: team.id, stableName: team.stableName,
    base: value, catchup: 0, fanBoost: 0, event: null,
    roll: value, position: race.positions[team.id],
    text: `🎲 ${team.stableName} slår ${value} → rykker ${value} felter`,
  });
  return { ok: true, roll: value, position: race.positions[team.id], done: team.race.done };
}

// Afslut auto-warm-up som dødt løb: alle hold på 1. plads, INGEN præmier.
function finishWarmupTie(game) {
  const race = gs.currentRace(game);
  if (!race) return { ok: false, error: 'Intet aktivt løb.' };
  race.rollingOpen = false;
  race.status = 'finished';
  race.prizesApplied = true; // ingen transaktioner — spærrer også dobbelt-finish
  race.results = game.teams.map((t) => {
    const rr = race.rolls[t.id] || [];
    return {
      teamId: t.id, stableName: t.stableName,
      position: race.positions[t.id],
      lastRoll: rr.length ? rr[rr.length - 1] : 0,
      rollSum: rr.reduce((a, b) => a + b, 0),
      place: 1, prize: 0, deadHeat: true,
    };
  });
  pushFeed(race, { kind: 'finish', text: '🏁 Dødt løb! Alle stalde slutter side om side — alle får startkapital.' });
  gs.logEvent(game, 'Warm-up løb afsluttet: dødt løb — alle stalde side om side.');
  return { ok: true, results: race.results };
}

module.exports = {
  startRace, setRolling, setFavorite, placeBet, rollForTeam, hostRollForTeam: rollForTeam,
  allRolled, finishRace, prizeFor, pointsFor, computePaddockOdds, prizePreview,
  buildWarmupPlan, applyScriptedRoll, finishWarmupTie,
};
