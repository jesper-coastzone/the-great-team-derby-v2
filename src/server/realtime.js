/*
 * realtime.js — udsender rollebaserede snapshots til alle klienter i et spil-room.
 * Rooms: `${code}:host`, `${code}:screen`, `${code}:team:${teamId}`.
 */
const gs = require('./gameState');

let io = null;
function setIo(instance) { io = instance; }

function pushState(game) {
  if (!io || !game) return;
  io.to(`${game.code}:host`).emit('state', gs.buildStateFor(game, 'host'));
  io.to(`${game.code}:screen`).emit('state', gs.buildStateFor(game, 'screen'));
  io.to(`${game.code}:station`).emit('state', gs.buildStateFor(game, 'station'));
  for (const t of game.teams) {
    io.to(`${game.code}:team:${t.id}`).emit('state', gs.buildStateFor(game, 'team', t.id));
  }
  gs.saveGame(game);
}

// Send en engangs-notifikation (fx trade-popup, fejlbesked) til et hold.
function toTeam(game, teamId, event, payload) {
  if (!io) return;
  io.to(`${game.code}:team:${teamId}`).emit(event, payload);
}
function toHost(game, event, payload) {
  if (!io) return;
  io.to(`${game.code}:host`).emit(event, payload);
}

module.exports = { setIo, pushState, toTeam, toHost };
