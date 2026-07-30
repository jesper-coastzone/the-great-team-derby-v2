/*
 * changeCardEngine.js — motor for Forandringskort ("Stævnenyt").
 * Spiller kort (auto-effekter + opslag), og ruller varigheds-effekter
 * tilbage når hosten afslutter kortet.
 */
const cards = require('../../config/changeCards');
const gs = require('./gameState');
const econ = require('./economy');

function playCard(game, cardId) {
  const card = cards.find((c) => c.id === cardId);
  if (!card) return { ok: false, error: 'Ukendt kort.' };
  if (game.changeCard) return { ok: false, error: 'Afslut det aktive kort først.' };

  const applied = { disabledTasks: [], taskMultipliers: [], investMultipliers: [] };
  for (const ef of card.effects || []) {
    if (ef.type === 'disableTask') {
      game.disabled = game.disabled || { exercises: [], moneyTasks: [] };
      if (!game.disabled.moneyTasks.includes(ef.taskId)) {
        game.disabled.moneyTasks.push(ef.taskId);
        applied.disabledTasks.push(ef.taskId); // kun dem VI lukkede rulles tilbage
      }
    } else if (ef.type === 'taskMultiplier') {
      game.taskMultipliers = game.taskMultipliers || {};
      game.taskMultipliers[ef.taskId] = ef.factor;
      applied.taskMultipliers.push(ef.taskId);
    } else if (ef.type === 'investMultiplier') {
      game.investMultipliers = game.investMultipliers || {};
      game.investMultipliers[ef.assetType] = ef.factor;
      applied.investMultipliers.push(ef.assetType);
    } else if (ef.type === 'tax') {
      for (const t of game.teams) {
        const excess = Math.round(t.cash) - ef.threshold;
        if (excess > 0) {
          const tax = Math.round(excess * ef.pct);
          if (tax > 0) econ.addTransaction(game, t, -tax, 'event', 'Skattekontrol: staldskat');
        }
      }
    } else if (ef.type === 'rotateExercises') {
      rotateExercises(game);
    } else if (ef.type === 'halveTimer') {
      const t = game.timers && game.timers.round;
      if (t && t.endsAt > Date.now()) t.endsAt = Date.now() + Math.round((t.endsAt - Date.now()) / 2);
    } else if (ef.type === 'stormNextRace') {
      game.stormNextRace = true;
    }
  }

  game.changeCard = {
    id: card.id, emoji: card.emoji, title: card.title, text: card.text,
    duration: card.duration, manual: !(card.effects && card.effects.length),
    applied, playedAt: Date.now(),
  };
  gs.logEvent(game, `🃏 Forandringskort: ${card.title}`);
  return { ok: true };
}

function endCard(game) {
  const cc = game.changeCard;
  if (!cc) return { ok: false, error: 'Intet aktivt kort.' };
  const a = cc.applied || {};
  (a.disabledTasks || []).forEach((id) => {
    if (game.disabled) game.disabled.moneyTasks = game.disabled.moneyTasks.filter((x) => x !== id);
  });
  (a.taskMultipliers || []).forEach((id) => { if (game.taskMultipliers) delete game.taskMultipliers[id]; });
  (a.investMultipliers || []).forEach((id) => { if (game.investMultipliers) delete game.investMultipliers[id]; });
  game.changeCard = null;
  gs.logEvent(game, `Forandringskortet "${cc.title}" er afsluttet.`);
  return { ok: true };
}

// Rotér ejede øvelser én stald videre (i staldnummer-rækkefølge, kun stalde der ejer noget)
function rotateExercises(game) {
  const owners = game.teams
    .filter((t) => t.ownedAuctionExerciseId)
    .sort((x, y) => x.teamNumber - y.teamNumber);
  if (owners.length < 2) return;
  const items = owners.map((t) => ({ exId: t.ownedAuctionExerciseId, price: t.ownedExercisePurchasePrice }));
  owners.forEach((t, i) => {
    const src = items[(i - 1 + items.length) % items.length];
    t.ownedAuctionExerciseId = src.exId;
    t.ownedExercisePurchasePrice = src.price;
    const ex = gs.exerciseById(game, src.exId);
    if (ex) ex.currentOwnerTeamId = t.id;
    gs.logEvent(game, `${t.stableName} overtog ${ex ? ex.name : 'en øvelse'} i staldrotationen.`);
  });
}

// Kort-katalog til host-panelet (uden effekt-detaljer)
function catalog() {
  return cards.map((c) => ({
    id: c.id, emoji: c.emoji, title: c.title, text: c.text,
    hostHint: c.hostHint, duration: c.duration, manual: !(c.effects && c.effects.length),
  }));
}

module.exports = { playCard, endCard, catalog };
