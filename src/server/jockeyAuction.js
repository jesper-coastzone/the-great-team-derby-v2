/* jockeyAuction.js — v3 etape 2: én jockey pr. stald, hver sæson.
 * Åben budrunde i Paddocken: højeste bud pr. jockey vises live.
 * Ved lukning tildeles efter højeste bud; stalde uden vundet bud får en af de
 * resterende til mindstepris. ALLE ender med præcis én. Hyren betales af
 * Staldkassen og gælder kun sæsonens løb — releaseJockeys() kaldes efter løbet.
 */
'use strict';

const cfg = require('../../config/gameConfig');
const econ = require('./economy');
const gs = () => require('./gameState'); // undgå cirkulær require

function T(game, da, en) { return (game.settings && game.settings.lang) === 'en' ? en : da; }

function pool(game) {
  // Ved >6 stalde dubleres profiler med varianter (II, III …)
  // Navnet lokaliseres her, så alt nedstrøms (bud, tildeling, feed) følger spillets sprog.
  const en = (game.settings && game.settings.lang) === 'en';
  const base = (cfg.jockeys || []).map((j) => ({ ...j, name: (en && j.nameEn) || j.name }));
  const teams = game.teams.length;
  const out = base.slice();
  let v = 2;
  while (out.length < teams) {
    const src = base[(out.length - base.length) % base.length];
    out.push({ ...src, id: src.id + '-' + v, name: src.name + ' ' + 'I'.repeat(v) });
    if ((out.length - base.length) % base.length === base.length - 1) v += 1;
  }
  return out;
}

function ensure(game) {
  if (!game.jockeyAuction) game.jockeyAuction = { status: 'idle', round: 0, bids: [], results: [] };
  return game.jockeyAuction;
}

function openAuction(game, round) {
  const ja = ensure(game);
  // Genåbning: refundér hyre og frigiv allerede tildelte jockeyer
  game.teams.forEach((t) => {
    if (t.jockey && t.jockey.hire) {
      econ.addTransaction(game, t, t.jockey.hire, 'jockey-refund',
        T(game, `Jockey-hyre refunderet: ${t.jockey.name}`, `Jockey hire refunded: ${t.jockey.name}`), t.jockey.id);
    }
    t.jockey = null;
  });
  ja.status = 'open';
  ja.round = round || game.currentRound || 1;
  ja.bids = [];
  ja.results = [];
  ja.pool = pool(game).map((j) => ({ ...j }));
  gs().logEvent(game, `Jockey-auktionen er åben (sæson ${ja.round}).`);
  return { ok: true };
}

function topBid(ja, jockeyId) {
  let best = null;
  for (const b of ja.bids) {
    if (b.jockeyId !== jockeyId) continue;
    if (!best || b.amount > best.amount || (b.amount === best.amount && b.at < best.at)) best = b;
  }
  return best;
}

function placeBid(game, team, jockeyId, amount) {
  const ja = ensure(game);
  if (ja.status !== 'open') return { ok: false, error: T(game, 'Jockey-auktionen er ikke åben.', 'The jockey auction is not open.') };
  const j = (ja.pool || []).find((x) => x.id === jockeyId);
  if (!j) return { ok: false, error: T(game, 'Ukendt jockey.', 'Unknown jockey.') };
  amount = Math.round(Number(amount) || 0);
  if (amount < j.minPrice) return { ok: false, error: T(game, `Buddet skal være mindst ${j.minPrice} DD (mindstepris).`, `Bid must be at least ${j.minPrice} DD (minimum price).`) };
  const top = topBid(ja, jockeyId);
  const inc = cfg.jockeyBidIncrement || 50;
  if (top && top.teamId !== team.id && amount < top.amount + inc) {
    return { ok: false, error: T(game, `I skal byde mindst ${top.amount + inc} DD for at overbyde.`, `You must bid at least ${top.amount + inc} DD to outbid.`) };
  }
  if (amount > team.cash) return { ok: false, error: T(game, 'I har ikke nok i Staldkassen.', 'Not enough in the Stable Fund.') };
  // Ét aktivt bud pr. jockey pr. stald — nyt bud erstatter det gamle
  ja.bids = ja.bids.filter((b) => !(b.teamId === team.id && b.jockeyId === jockeyId));
  ja.bids.push({ teamId: team.id, jockeyId, amount, at: Date.now() });
  return { ok: true };
}

function retractBid(game, team, jockeyId) {
  const ja = ensure(game);
  if (ja.status !== 'open') return { ok: false, error: T(game, 'Auktionen er ikke åben.', 'The auction is not open.') };
  ja.bids = ja.bids.filter((b) => !(b.teamId === team.id && b.jockeyId === jockeyId));
  return { ok: true };
}

function resolveAuction(game) {
  const ja = ensure(game);
  if (ja.status !== 'open') return { ok: false, error: 'Auktionen er ikke åben.' };
  const teams = game.teams.slice();
  const freeJockeys = new Map((ja.pool || pool(game)).map((j) => [j.id, j]));
  const unassigned = new Set(teams.map((t) => t.id));
  ja.results = [];

  // 1) Højeste bud vinder — sorteret på beløb (tidligste bud vinder ved lighed)
  const sorted = ja.bids.slice().sort((a, b) => (b.amount - a.amount) || (a.at - b.at));
  for (const b of sorted) {
    if (!unassigned.has(b.teamId) || !freeJockeys.has(b.jockeyId)) continue;
    assign(game, ja, b.teamId, freeJockeys.get(b.jockeyId), b.amount, false);
    unassigned.delete(b.teamId);
    freeJockeys.delete(b.jockeyId);
  }
  // 2) Rest til mindstepris — billigste ledige jockey først, laveste staldkasse vælger først
  const rest = teams.filter((t) => unassigned.has(t.id)).sort((a, b) => a.cash - b.cash);
  for (const t of rest) {
    const cheapest = [...freeJockeys.values()].sort((a, b) => a.minPrice - b.minPrice)[0];
    if (!cheapest) break;
    assign(game, ja, t.id, cheapest, cheapest.minPrice, true);
    freeJockeys.delete(cheapest.id);
  }
  ja.status = 'resolved';
  gs().logEvent(game, 'Jockey-auktionen er afgjort — alle stalde har en jockey.');
  return { ok: true, results: ja.results };
}

function assign(game, ja, teamId, jockey, price, atMinPrice) {
  const team = game.teams.find((t) => t.id === teamId);
  if (!team) return;
  const pay = Math.min(price, Math.max(0, team.cash)); // aldrig negativ Staldkasse
  econ.addTransaction(game, team, -pay, 'jockey-hire',
    T(game, `Jockey-hyre: ${jockey.name}`, `Jockey hire: ${jockey.name}`), jockey.id);
  team.jockey = {
    id: jockey.id, name: jockey.name, emoji: jockey.emoji,
    topMod: jockey.topMod, bottomMod: jockey.bottomMod, hire: pay, atMinPrice: !!atMinPrice,
  };
  team.jockeyName = jockey.name;
  ja.results.push({ teamId, stableName: team.stableName, jockeyId: jockey.id, jockeyName: jockey.name, amount: pay, atMinPrice: !!atMinPrice });
}

// Efter sæsonens løb: jockeyen tilbage i puljen
function releaseJockeys(game) {
  game.teams.forEach((t) => { t.jockey = null; });
  const ja = game.jockeyAuction;
  if (ja) { ja.status = 'idle'; ja.bids = []; }
}

// State til klienterne
function publicAuction(game, teamId) {
  const ja = game.jockeyAuction;
  if (!ja || ja.status === 'idle') return { status: 'idle', jockeys: [] };
  const lang = (game.settings && game.settings.lang) === 'en' ? 'en' : 'da';
  const jockeys = (ja.pool || []).map((j) => {
    const top = topBid(ja, j.id);
    const winner = (ja.results || []).find((r) => r.jockeyId === j.id);
    const myBid = teamId ? ja.bids.find((b) => b.teamId === teamId && b.jockeyId === j.id) : null;
    return {
      id: j.id, name: j.name, emoji: j.emoji, minPrice: j.minPrice,
      topMod: j.topMod, bottomMod: j.bottomMod,
      dice: { min: cfg.diceBaseMin + j.bottomMod, max: cfg.diceBaseMax + j.topMod },
      profile: (j.profile && j.profile[lang]) || '',
      topBid: top ? { teamId: top.teamId, amount: top.amount } : null,
      myBid: myBid ? myBid.amount : null,
      winner: winner ? { teamId: winner.teamId, stableName: winner.stableName, amount: winner.amount, atMinPrice: winner.atMinPrice } : null,
    };
  });
  return { status: ja.status, round: ja.round, jockeys, increment: cfg.jockeyBidIncrement || 50 };
}

module.exports = { openAuction, placeBid, retractBid, resolveAuction, releaseJockeys, publicAuction, pool };
