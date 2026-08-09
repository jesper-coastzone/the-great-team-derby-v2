/*
 * gameManager.js — orkestrering: slide-skift, fase-hooks, join, timere.
 * Når host skifter slide, sætter vi fase + kontekst og forbereder auktion/løb automatisk,
 * så skærm og tablets følger med uden ekstra klik.
 */
const { PHASES } = require('../../config/slides');
const cfg = require('../../config/gameConfig');
const { now, clamp } = require('./util');
const gs = require('./gameState');
const auction = require('./auction');
const races = require('./races');
const trades = require('./trades');

function currentSlide(game) { return game.deck[game.activeSlideIndex]; }

function goToSlide(game, index) {
  index = clamp(index, 0, game.deck.length - 1);
  game.activeSlideIndex = index;
  game.screenMessageOverride = null;
  game.tabletModeOverride = null;
  game.preseasonFocus = null;
  const slide = currentSlide(game);
  game.currentPhase = slide.phase;
  if (slide.meta && slide.meta.round) game.currentRound = slide.meta.round;
  if (game.status === 'lobby' && slide.phase !== PHASES.INTRO) game.status = 'running';
  // Paddock-timeren lever kun på paddock-slidet
  if (slide.phase !== PHASES.PADDOCK) delete game.timers.paddock;
  enterPhase(game, slide);
  gs.logEvent(game, `Slide → ${slide.title}`);
  return { ok: true };
}

function enterPhase(game, slide) {
  switch (slide.phase) {
    case PHASES.AUCTION: {
      const round = slide.meta.round;
      // Start ny auktion hvis der ikke allerede er en aktiv/afgjort for runden
      if (!game.auction || game.auction.round !== round || game.auction.status === 'resolved') {
        if (!(game.auction && game.auction.round === round)) auction.startAuction(game, round);
      }
      break;
    }
    case PHASES.RACE:
    case PHASES.FINAL_RACE: {
      const type = slide.meta && slide.meta.raceType === 'final' ? 'final' : 'normal';
      const race = gs.currentRace(game);
      if (!race || race.status === 'finished' || race.type !== type) {
        races.startRace(game, type, game.currentRound);
      }
      break;
    }
    case PHASES.WARMUP: {
      const race = gs.currentRace(game);
      if (!race || race.status === 'finished') races.startRace(game, 'normal', 0);
      break;
    }
    case PHASES.PADDOCK: {
      // Paddocken åbner automatisk med timer — kun her kan der investeres og væddes.
      startPaddockTimer(game);
      races.computePaddockOdds(game); // lås odds-tavlen ("morning line")
      break;
    }
    default: break;
  }
}

function next(game) { return goToSlide(game, game.activeSlideIndex + 1); }
function prev(game) { return goToSlide(game, game.activeSlideIndex - 1); }

// ---------------- Join ----------------
function joinTeam(game, requestedTeamId) {
  if (requestedTeamId) {
    const t = gs.getTeam(game, requestedTeamId);
    if (t) { t.joined = true; t.connected = true; return { ok: true, team: t }; }
  }
  const free = game.teams.find((t) => !t.joined);
  if (!free) return { ok: false, error: 'Alle stalde er optaget.' };
  free.joined = true; free.connected = true;
  gs.logEvent(game, `${free.stableName} tilsluttede sig.`);
  return { ok: true, team: free };
}

function setStableInfo(game, team, info) {
  if (info.stableName != null) team.stableName = String(info.stableName).slice(0, 40) || team.stableName;
  if (info.horseName != null) team.horseName = String(info.horseName).slice(0, 40);
  if (info.jockeyName != null) team.jockeyName = String(info.jockeyName).slice(0, 40);
  if (info.ready != null) team.ready = !!info.ready;
  return { ok: true };
}

// ---------------- Timere ----------------
function startRoundTimer(game, seconds) {
  const s = seconds || game.settings.roundLengthSeconds;
  game.timers.round = { endsAt: now() + s * 1000, length: s };
  gs.logEvent(game, `Rundetimer startet (${Math.round(s / 60)} min).`);
  return { ok: true };
}
function stopRoundTimer(game) { delete game.timers.round; return { ok: true }; }

// Paddocken: kort investeringsvindue før løbet (v2.13)
function startPaddockTimer(game, seconds) {
  const s = seconds || cfg.paddockSeconds || 180;
  game.timers.paddock = { endsAt: now() + s * 1000, length: s };
  gs.logEvent(game, `Paddocken er åben (${Math.round(s / 60)} min) — investering mulig.`);
  return { ok: true };
}
function stopPaddockTimer(game) { delete game.timers.paddock; gs.logEvent(game, 'Paddocken er lukket.'); return { ok: true }; }

// Må der investeres lige nu? (bruges af team:invest)
function paddockOpen(game) {
  if (game.currentPhase !== PHASES.PADDOCK) return false;
  if (game.timers.paddock && now() > game.timers.paddock.endsAt) return false;
  return true;
}

// Periodisk tick: udløb af handler + auto-luk auktion når tiden er gået.
function tick(game) {
  let changed = false;
  if (trades.expireTrades(game)) changed = true;
  if (game.timers.auction && now() > game.timers.auction.endsAt && game.auction && game.auction.status === 'open') {
    auction.closeAuction(game);
    changed = true;
  }
  return changed;
}

module.exports = {
  goToSlide, next, prev, currentSlide, joinTeam, setStableInfo,
  startRoundTimer, stopRoundTimer, startPaddockTimer, stopPaddockTimer, paddockOpen, tick,
};
