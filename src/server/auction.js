/*
 * auction.js — auktionslogik.
 *  - hver runde genudbydes alle øvelser
 *  - et hold kan kun VINDE én øvelse: den hvor holdet bød højest blandt sine vindende bud
 *  - betaling for en ejet øvelse går til den TIDLIGERE ejer (øvelser bliver aktiver)
 *  - usolgte, uejede øvelser bliver i auktionshuset
 */
const cfg = require('../../config/gameConfig');
const { uid, now, shuffle } = require('./util');
const gs = require('./gameState');
const econ = require('./economy');

function startAuction(game, round) {
  game.auction = {
    id: uid('auc'), round, status: 'open', bids: [], results: [], startedAt: now(),
  };
  if (game.settings.auctionLengthSeconds) {
    game.timers.auction = { endsAt: now() + game.settings.auctionLengthSeconds * 1000 };
  }
  gs.logEvent(game, `Auktion ${round} åbnet.`);
  return { ok: true };
}

function placeBid(game, team, exerciseId, amount) {
  if (!game.auction || game.auction.status !== 'open') return { ok: false, error: 'Auktionen er ikke åben.' };
  const ex = gs.exerciseById(game, exerciseId);
  if (!ex) return { ok: false, error: 'Ukendt øvelse.' };
  amount = Math.round(amount);
  if (!(amount > 0)) return { ok: false, error: 'Buddet skal være større end 0.' };
  if (amount > team.cash) return { ok: false, error: 'I kan ikke byde mere end I har på kontoen.' };

  // ét bud pr. hold pr. øvelse — erstat eksisterende
  game.auction.bids = game.auction.bids.filter(
    (b) => !(b.teamId === team.id && b.exerciseId === exerciseId),
  );
  game.auction.bids.push({ id: uid('bid'), teamId: team.id, exerciseId, amount, timestamp: now() });
  return { ok: true };
}

function retractBid(game, team, exerciseId) {
  if (!game.auction) return { ok: false, error: 'Ingen auktion.' };
  game.auction.bids = game.auction.bids.filter(
    (b) => !(b.teamId === team.id && b.exerciseId === exerciseId),
  );
  return { ok: true };
}

function closeAuction(game) {
  if (!game.auction) return { ok: false, error: 'Ingen auktion.' };
  game.auction.status = 'closed';
  delete game.timers.auction;
  gs.logEvent(game, `Auktion ${game.auction.round} lukket for bud.`);
  return { ok: true };
}

// Iterativ, stabil tildeling. Returnerer array af {teamId, exerciseId, amount}.
function computeWinners(bids) {
  let remainingBids = bids.slice();
  const assignedTeams = new Set();
  const assignedExercises = new Set();
  const results = [];

  let safety = 100;
  while (safety-- > 0) {
    // top-byder pr. uafgjort øvelse (blandt uafgjorte hold)
    const topByExercise = new Map(); // exerciseId -> best bid
    for (const b of remainingBids) {
      if (assignedTeams.has(b.teamId) || assignedExercises.has(b.exerciseId)) continue;
      const cur = topByExercise.get(b.exerciseId);
      if (!cur || b.amount > cur.amount) topByExercise.set(b.exerciseId, b);
    }
    if (topByExercise.size === 0) break;

    // et hold kan være top på flere → behold holdets HØJESTE
    const bestPerTeam = new Map(); // teamId -> {exerciseId, amount}
    for (const b of topByExercise.values()) {
      const cur = bestPerTeam.get(b.teamId);
      if (!cur || b.amount > cur.amount) bestPerTeam.set(b.teamId, b);
    }

    // uafgjort på beløb mellem to hold på samme øvelse: vælg tilfældigt (deterministisk log)
    // Finaliser hver top-øvelses vinder = holdets bedste bud, hvis dét bud også er øvelsens top.
    let progressed = false;
    // Gruppér efter øvelse for at fange lige høje bud
    const exerciseGroups = new Map();
    for (const b of remainingBids) {
      if (assignedTeams.has(b.teamId) || assignedExercises.has(b.exerciseId)) continue;
      if (!exerciseGroups.has(b.exerciseId)) exerciseGroups.set(b.exerciseId, []);
      exerciseGroups.get(b.exerciseId).push(b);
    }

    for (const [teamId, best] of bestPerTeam.entries()) {
      // er 'best' stadig top på sin øvelse?
      const group = exerciseGroups.get(best.exerciseId) || [];
      const maxAmt = Math.max(...group.map((g) => g.amount));
      if (best.amount < maxAmt) continue; // et andet hold overtager denne øvelse i næste runde
      const topTies = group.filter((g) => g.amount === maxAmt);
      const winner = topTies.length > 1 ? shuffle(topTies)[0] : topTies[0];
      if (winner.teamId !== teamId) continue;
      if (assignedTeams.has(teamId) || assignedExercises.has(best.exerciseId)) continue;
      assignedTeams.add(teamId);
      assignedExercises.add(best.exerciseId);
      results.push({ teamId, exerciseId: best.exerciseId, amount: best.amount, tie: topTies.length > 1 });
      progressed = true;
    }
    if (!progressed) break;
  }
  return results;
}

function setOwnership(game, exercise, team, price) {
  exercise.currentOwnerTeamId = team ? team.id : null;
  exercise.isInAuctionHouse = !team;
  exercise.successCount = 0; // ny ejer starter forfra på aftagende belønning
  if (team) {
    team.ownedAuctionExerciseId = exercise.id;
    team.ownedExercisePurchasePrice = price;
    team.mindPuzzleLevel = 0;
  }
}

function resolveAuction(game) {
  if (!game.auction) return { ok: false, error: 'Ingen auktion.' };
  const winners = computeWinners(game.auction.bids);
  const results = [];

  for (const w of winners) {
    const ex = gs.exerciseById(game, w.exerciseId);
    const winner = gs.getTeam(game, w.teamId);
    if (!ex || !winner) continue;
    const prevOwnerId = ex.currentOwnerTeamId;

    // betaling — forrige ejer får kun en andel af buddet, resten går til banken
    // (dæmper rich-get-richer; styres af cfg.auctionResaleSplit)
    econ.addTransaction(game, winner, -w.amount, 'auction', `Købte ${ex.name} på auktion`, ex.id);
    if (prevOwnerId && prevOwnerId !== winner.id) {
      const prev = gs.getTeam(game, prevOwnerId);
      if (prev) {
        const split = cfg.auctionResaleSplit != null ? cfg.auctionResaleSplit : 1;
        const sellerShare = Math.round(w.amount * split);
        econ.addTransaction(game, prev, sellerShare, 'auction-sale', `Solgte ${ex.name} på auktion (${Math.round(split * 100)}% af buddet)`, ex.id);
        prev.ownedAuctionExerciseId = null;
        prev.ownedExercisePurchasePrice = 0;
      }
    }

    // hvis vinderen ejede en ANDEN øvelse → frigiv den til auktionshuset
    if (winner.ownedAuctionExerciseId && winner.ownedAuctionExerciseId !== ex.id) {
      const old = gs.exerciseById(game, winner.ownedAuctionExerciseId);
      if (old) { old.currentOwnerTeamId = null; old.isInAuctionHouse = true; }
    }

    setOwnership(game, ex, winner, w.amount);
    ex.resultHistory.push({ round: game.auction.round, ownerTeamId: winner.id, price: w.amount });
    results.push({ exerciseId: ex.id, exerciseName: ex.name, teamId: winner.id, stableName: winner.stableName, amount: w.amount, tie: w.tie });
  }

  game.auction.status = 'resolved';
  game.auction.results = results;
  game.auctionHistory.push({ round: game.auction.round, results });
  delete game.timers.auction;
  gs.logEvent(game, `Auktion ${game.auction.round} afgjort: ${results.length} øvelser solgt.`);
  return { ok: true, results };
}

// Auktionshus-bytte under en runde
function auctionHouseExchange(game, team, targetExerciseId) {
  if (!team.ownedAuctionExerciseId) return { ok: false, error: 'I ejer ingen øvelse at bytte med.' };
  const target = gs.exerciseById(game, targetExerciseId);
  if (!target) return { ok: false, error: 'Ukendt øvelse.' };
  if (target.currentOwnerTeamId) return { ok: false, error: 'Øvelsen er ejet af et andet hold — brug byttehandel i stedet.' };

  const fee = Math.round(team.ownedExercisePurchasePrice * cfg.auctionHouseExchangeRate);
  if (fee > team.cash) return { ok: false, error: `I mangler ${fee - team.cash} ${cfg.currencyAbbr} til gebyret.` };

  const old = gs.exerciseById(game, team.ownedAuctionExerciseId);
  if (old) { old.currentOwnerTeamId = null; old.isInAuctionHouse = true; old.successCount = 0; }

  econ.addTransaction(game, team, -fee, 'exchange', `Auktionshus-bytte til ${target.name}`, target.id);
  setOwnership(game, target, team, fee);
  gs.logEvent(game, `${team.stableName} byttede i auktionshuset til ${target.name} (gebyr ${fee} ${cfg.currencyAbbr}).`);
  return { ok: true };
}

module.exports = {
  startAuction, placeBid, retractBid, closeAuction, resolveAuction,
  computeWinners, auctionHouseExchange, setOwnership,
};
