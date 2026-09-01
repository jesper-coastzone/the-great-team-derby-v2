/*
 * economy.js — kontanter, transaktioner, investeringer, warm-up.
 * Alle penge-bevægelser går gennem addTransaction, så vi har fuld sporbarhed.
 */
const cfg = require('../../config/gameConfig');
const L = (game, da, en) => ((game.settings && game.settings.lang) === 'en' ? en : da);
const { uid, now } = require('./util');
const gs = require('./gameState');

function addTransaction(game, team, amount, type, reason, relatedEntityId = null) {
  amount = Math.round(amount);
  team.cash = Math.round(team.cash + amount);
  const tx = { id: uid('tx'), teamId: team.id, amount, type, reason, timestamp: now(), relatedEntityId };
  game.transactions.unshift(tx);
  team.recentTransactions.unshift({ amount, reason, timestamp: now() });
  if (team.recentTransactions.length > 20) team.recentTransactions.pop();
  return tx;
}

function canAfford(team, amount) { return team.cash >= amount; }

function payWarmup(game) {
  if (game.warmupPaid) return { ok: false, error: 'Startkapital er allerede udbetalt.' };
  const amt = game.settings.warmupReward;
  for (const t of game.teams) addTransaction(game, t, amt, 'warmup', 'Startkapital efter warm-up');
  game.warmupPaid = true;
  gs.logEvent(game, `Startkapital udbetalt: ${amt} ${cfg.currencyAbbr} til alle stalde.`);
  return { ok: true };
}

// Direkte investering i hest/jockey/stald
function invest(game, team, assetType, productId) {
  const products = cfg.investmentOptions[assetType];
  if (!products) return { ok: false, error: L(game, 'Ukendt investeringstype.', 'Unknown investment type.') };
  const product = products.find((p) => p.id === productId);
  if (!product) return { ok: false, error: L(game, 'Ukendt produkt.', 'Unknown product.') };
  // Forandringskort (fx Foderkrise) kan gøre investeringer dyrere
  const priceFactor = (game.investMultipliers && game.investMultipliers[assetType]) || 1;
  const cost = Math.round(product.cost * priceFactor);
  if (!canAfford(team, cost)) return { ok: false, error: L(game, 'I har ikke nok i Staldkassen.', 'Not enough in the Stable Fund.') };

  // Loft: hvert produkt kan kun købes et begrænset antal gange (lukker degenereret slutspil)
  team.investmentsMade = team.investmentsMade || {};
  const maxBuys = cfg.maxPurchasesPerOption || Infinity;
  if ((team.investmentsMade[productId] || 0) >= maxBuys) return { ok: false, error: L(game, 'I har allerede købt denne investering.', 'You have already bought this investment.') };
  team.investmentsMade[productId] = (team.investmentsMade[productId] || 0) + 1;

  addTransaction(game, team, -cost, 'invest', `Investering: ${product.label}${priceFactor > 1 ? ' (foderkrise-pris)' : ''}`);
  if (assetType === 'horse') {
    team.horseValue += product.valueIncrease;
    if (product.performancePoints) addPerformancePoints(game, team, 'horse', product.performancePoints);
  } else if (assetType === 'jockey') {
    team.jockeyValue += product.valueIncrease;
    if (product.performancePoints) addPerformancePoints(game, team, 'jockey', product.performancePoints);
  } else if (assetType === 'stable') {
    team.stableValue += product.valueIncrease;
  }
  gs.logEvent(game, `${team.stableName} investerede i ${product.label} (${cost} ${cfg.currencyAbbr}).`);
  return { ok: true };
}

// Genbruges af investeringer og performance-øvelser (defineret i performance.js men
// importeres cirkulært-sikkert her via require inde i funktionen).
function addPerformancePoints(game, team, which, points) {
  const perf = require('./performance');
  return perf.addPerformancePoints(game, team, which, points);
}

module.exports = { addTransaction, canAfford, payWarmup, invest };
