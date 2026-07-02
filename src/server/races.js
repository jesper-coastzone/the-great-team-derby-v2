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
  game.races.push(race);
  game.currentRaceId = race.id;
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
    pushFeed(race, { kind: 'favorite', teamId: team.id, stableName: team.stableName, text: `📣 ${team.stableName} er publikumsfavorit!` });
    gs.logEvent(game, `${team.stableName} er publikumsfavorit.`);
  }
  return { ok: true };
}

function pushFeed(race, entry) {
  race.feed.push({ ...entry, t: now() });
  if (race.feed.length > 60) race.feed.shift();
}

// Finale-væddemål: sats på egen sejr FØR rolling åbner. Indsats trækkes straks.
function placeBet(game, team, amount) {
  const race = gs.currentRace(game);
  if (!race) return { ok: false, error: 'Intet aktivt løb.' };
  if (race.type !== 'final') return { ok: false, error: 'Der kan kun væddes på finaleløbet.' };
  if (!(cfg.finalBetting && cfg.finalBetting.enabled)) return { ok: false, error: 'Væddemål er slået fra.' };
  if (race.rollingOpen || race.status === 'finished') return { ok: false, error: 'Væddemål er lukket — løbet er i gang.' };
  if (race.bets[team.id]) return { ok: false, error: 'I har allerede satset.' };
  amount = Math.round(amount);
  if (!(amount > 0)) return { ok: false, error: 'Indsatsen skal være større end 0.' };
  if (amount > team.cash) return { ok: false, error: 'I kan ikke satse mere end I har på kontoen.' };
  const odds = race.odds[team.id] || cfg.finalBetting.minOdds;
  econ.addTransaction(game, team, -amount, 'bet', `Væddemål: ${amount} ${cfg.currencyAbbr} på sejr (odds ${odds})`, race.id);
  race.bets[team.id] = { amount, odds, resolved: false, payout: 0 };
  pushFeed(race, { kind: 'bet', teamId: team.id, stableName: team.stableName, text: `💰 ${team.stableName} satser ${amount} ${cfg.currencyAbbr} på sejr til odds ${odds}!` });
  gs.logEvent(game, `${team.stableName} satsede ${amount} ${cfg.currencyAbbr} på sejr (odds ${odds}).`);
  return { ok: true, amount, odds };
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

function rollForTeam(game, team) {
  const race = gs.currentRace(game);
  if (!race) return { ok: false, error: 'Intet aktivt løb.' };
  if (!race.rollingOpen) return { ok: false, error: 'Rolling er ikke åben endnu.' };
  const used = race.rolls[team.id].length;
  if (used >= race.allowed[team.id]) return { ok: false, error: 'I har brugt alle jeres slag.' };

  const min = cfg.diceBaseMin + team.jockeyLevel;
  const max = Math.max(cfg.diceBaseMax + team.horseLevel, min);
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

  // Tilfældigt event (dyrlæge, vind, publikum) — max N pr. hold pr. løb
  let event = null;
  const re = cfg.raceEvents || {};
  if (re.enabled && race.eventCount[team.id] < (re.maxPerTeamPerRace || 1) && Math.random() < (re.chancePerRoll || 0)) {
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
  const bits = [];
  if (fanBoost) bits.push(`📣 fan-boost +${fanBoost}`);
  if (catchup) bits.push(`🔥 ${cu.label || 'Opløbsfight'} +${catchup}`);
  if (event) bits.push(`${event.emoji || ''} ${event.label} ${event.effect > 0 ? '+' : ''}${event.effect}`);
  pushFeed(race, {
    kind: event ? 'event' : 'roll',
    teamId: team.id, stableName: team.stableName,
    base, catchup, fanBoost,
    event: event ? { id: event.id, label: event.label, emoji: event.emoji, effect: event.effect } : null,
    roll: total, position: race.positions[team.id],
    text: `🎲 ${team.stableName} slår ${base}${bits.length ? ' · ' + bits.join(' · ') : ''} → rykker ${total} felter`,
  });

  return { ok: true, roll: total, base, catchup, fanBoost, event: event ? { label: event.label, emoji: event.emoji, effect: event.effect } : null, position: race.positions[team.id], done: team.race.done };
}

function allRolled(game) {
  const race = gs.currentRace(game);
  if (!race) return false;
  return game.teams.every((t) => race.rolls[t.id].length >= race.allowed[t.id]);
}

function prizeFor(place, type) {
  const table = type === 'final' ? cfg.finalRacePrizes : cfg.normalRacePrizes;
  return table[place] != null ? table[place] : table.default;
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
    const prize = prizeFor(place, race.type);
    results.push({ ...r, place, prize, deadHeat: false });
  });
  // markér dødt løb
  results.forEach((r) => { r.deadHeat = results.some((o) => o !== r && o.place === r.place); });

  for (const r of results) {
    const team = gs.getTeam(game, r.teamId);
    econ.addTransaction(game, team, r.prize, 'race', `${race.type === 'final' ? 'Finaleløb' : 'Løb'}: ${r.place}. plads${r.deadHeat ? ' (dødt løb)' : ''}`, race.id);
  }

  race.results = results;
  race.prizesApplied = true;
  race.rollingOpen = false;
  race.status = 'finished';
  pushFeed(race, { kind: 'finish', text: `🏁 Løbet er slut! ${results[0].stableName} vinder${results[0].deadHeat ? ' (dødt løb!)' : ''}.` });

  // Afgør væddemål: vandt holdet løbet (plads 1), udbetales indsats × odds
  for (const [teamId, bet] of Object.entries(race.bets || {})) {
    if (bet.resolved) continue;
    bet.resolved = true;
    const res = results.find((r) => r.teamId === teamId);
    const team = gs.getTeam(game, teamId);
    if (res && team && res.place === 1) {
      bet.payout = Math.round(bet.amount * bet.odds);
      econ.addTransaction(game, team, bet.payout, 'bet', `Væddemål vundet! (odds ${bet.odds})`, race.id);
      pushFeed(race, { kind: 'bet', teamId, stableName: team.stableName, text: `💰 ${team.stableName} vandt væddemålet: +${bet.payout} ${cfg.currencyAbbr}!` });
    } else if (team) {
      pushFeed(race, { kind: 'bet', teamId, stableName: team.stableName, text: `💸 ${team.stableName} tabte væddemålet (${bet.amount} ${cfg.currencyAbbr}).` });
    }
  }
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
  allRolled, finishRace, prizeFor,
  buildWarmupPlan, applyScriptedRoll, finishWarmupTie,
};
