/*
 * socketHandlers.js — al realtime-wiring for host, screen og team.
 * Mønster: klient sender event → server validerer/muterer → pushState broadcaster ny state.
 */
const gs = require('./gameState');
const gm = require('./gameManager');
const auction = require('./auction');
const trades = require('./trades');
const races = require('./races');
const tasks = require('./tasks');
const econ = require('./economy');
const rt = require('./realtime');

function ack(cb, res) { if (typeof cb === 'function') cb(res || { ok: true }); }

const HOST_PASSWORD = process.env.HOST_PASSWORD || 'derby';

function register(io) {
  rt.setIo(io);

  io.on('connection', (socket) => {
    const gameOf = () => gs.getGame(socket.data.code);
    const teamOf = () => { const g = gameOf(); return g && socket.data.teamId ? gs.getTeam(g, socket.data.teamId) : null; };
    const isHost = () => socket.data.role === 'host' && socket.data.hostAuthed === true;

    // Host-login (delt kodeord). Skal ske før oprettelse/styring.
    socket.on('host:login', (p, cb) => {
      if (p && p.password === HOST_PASSWORD) { socket.data.hostAuthed = true; ack(cb, { ok: true }); }
      else ack(cb, { ok: false, error: 'Forkert kodeord.' });
    });

    // Liste over alle aktive spil på serveren — så man kan køre flere events
    // samme dag og skifte imellem dem fra host-konsollen.
    socket.on('host:listGames', (_, cb) => {
      if (!socket.data.hostAuthed) return ack(cb, { ok: false, error: 'Log ind som host først.' });
      const games = [...gs.store.values()].map((g) => ({
        code: g.code,
        eventName: g.settings.eventName,
        createdAt: g.createdAt,
        teamsJoined: g.teams.filter((t) => t.joined).length,
        numTeams: g.teams.length,
        phase: g.currentPhase,
        round: g.currentRound,
      })).sort((a, b) => b.createdAt - a.createdAt);
      ack(cb, { ok: true, games });
    });

    // Kør en mutation og broadcast bagefter.
    const mut = (fn, cb) => {
      const game = gameOf();
      if (!game) return ack(cb, { ok: false, error: 'Ingen aktiv spil.' });
      const res = fn(game) || { ok: true };
      rt.pushState(game);
      ack(cb, res);
    };
    const hostMut = (fn, cb) => { if (!isHost()) return ack(cb, { ok: false, error: 'Kun host.' }); mut(fn, cb); };

    // ---------- JOIN ----------
    socket.on('host:createGame', (settings, cb) => {
      if (!socket.data.hostAuthed) return ack(cb, { ok: false, error: 'Log ind som host først.' });
      const game = gs.createGame(settings || {});
      socket.data.role = 'host'; socket.data.code = game.code;
      socket.join(`${game.code}:host`);
      ack(cb, { ok: true, code: game.code });
      socket.emit('state', gs.buildStateFor(game, 'host'));
    });

    socket.on('join', (p, cb) => {
      const game = gs.getGame(p.code);
      if (!game) return ack(cb, { ok: false, error: 'Ukendt spilkode.' });
      if (p.role === 'host' && !socket.data.hostAuthed) return ack(cb, { ok: false, error: 'Log ind som host først.' });
      socket.data.role = p.role;
      socket.data.code = game.code;
      if (p.role === 'host') socket.join(`${game.code}:host`);
      else if (p.role === 'screen') socket.join(`${game.code}:screen`);
      else if (p.role === 'team') {
        const r = gm.joinTeam(game, p.teamId);
        if (!r.ok) return ack(cb, r);
        socket.data.teamId = r.team.id;
        socket.join(`${game.code}:team:${r.team.id}`);
      }
      ack(cb, { ok: true, code: game.code, teamId: socket.data.teamId });
      socket.emit('state', gs.buildStateFor(game, p.role, socket.data.teamId));
      rt.pushState(game);
    });

    // ---------- HOST: præsentation ----------
    socket.on('host:next', (_, cb) => hostMut((g) => gm.next(g), cb));
    socket.on('host:prev', (_, cb) => hostMut((g) => gm.prev(g), cb));
    socket.on('host:goto', (p, cb) => hostMut((g) => gm.goToSlide(g, p.index), cb));
    socket.on('host:setScreenMessage', (p, cb) => hostMut((g) => { g.screenMessageOverride = p.message || null; return { ok: true }; }, cb));
    socket.on('host:overrideTablet', (p, cb) => hostMut((g) => { g.tabletModeOverride = p.mode || null; return { ok: true }; }, cb));

    // ---------- HOST: økonomi/warmup ----------
    socket.on('host:payWarmup', (_, cb) => hostMut((g) => econ.payWarmup(g), cb));

    // ---------- HOST: auktion ----------
    socket.on('host:startAuction', (_, cb) => hostMut((g) => auction.startAuction(g, g.currentRound || 1), cb));
    socket.on('host:closeAuction', (_, cb) => hostMut((g) => auction.closeAuction(g), cb));
    socket.on('host:resolveAuction', (_, cb) => hostMut((g) => auction.resolveAuction(g), cb));

    // ---------- HOST: runde ----------
    socket.on('host:startRoundTimer', (p, cb) => hostMut((g) => gm.startRoundTimer(g, p && p.seconds), cb));
    socket.on('host:stopRoundTimer', (_, cb) => hostMut((g) => gm.stopRoundTimer(g), cb));

    // ---------- HOST: løb ----------
    socket.on('host:startRace', (p, cb) => hostMut((g) => races.startRace(g, (p && p.type) || 'normal', g.currentRound), cb));
    socket.on('host:openRolling', (_, cb) => hostMut((g) => races.setRolling(g, true), cb));
    socket.on('host:closeRolling', (_, cb) => hostMut((g) => races.setRolling(g, false), cb));
    socket.on('host:rollFor', (p, cb) => hostMut((g) => { const t = gs.getTeam(g, p.teamId); return t ? races.rollForTeam(g, t) : { ok: false }; }, cb));
    socket.on('host:finishRace', (_, cb) => hostMut((g) => races.finishRace(g), cb));
    socket.on('host:setFavorite', (p, cb) => hostMut((g) => races.setFavorite(g, p && p.teamId), cb));

    // ---------- HOST: godkendelser & scoring ----------
    socket.on('host:approve', (p, cb) => hostMut((g) => tasks.hostResolveApproval(g, p.teamId, p.taskId, p.approve, p.extra || {}), cb));
    socket.on('host:creativeBonus', (p, cb) => hostMut((g) => tasks.setCreativeBonus(g, p.teamId, p.taskId, p.amount), cb));
    socket.on('host:grantLicense', (p, cb) => hostMut((g) => { const t = gs.getTeam(g, p.teamId); if (t) t.derbyLicense = p.value !== false; return { ok: true }; }, cb));

    // ---------- HOST: manuel redigering ----------
    socket.on('host:editTeam', (p, cb) => hostMut((g) => {
      const t = gs.getTeam(g, p.teamId); if (!t) return { ok: false, error: 'Ukendt hold.' };
      const f = p.fields || {};
      ['stableName', 'horseName', 'jockeyName'].forEach((k) => { if (f[k] != null) t[k] = String(f[k]).slice(0, 40); });
      ['cash', 'horseValue', 'jockeyValue', 'stableValue', 'horseLevel', 'jockeyLevel'].forEach((k) => { if (f[k] != null) t[k] = Number(f[k]); });
      if (f.ready != null) t.ready = !!f.ready;
      gs.logEvent(g, `Host redigerede ${t.stableName}.`);
      return { ok: true };
    }, cb));

    socket.on('host:cancelTrade', (p, cb) => hostMut((g) => trades.hostCancelTrade(g, p.tradeId), cb));

    // ---------- HOST: debug/test ----------
    socket.on('host:addMoneyAll', (p, cb) => hostMut((g) => { g.teams.forEach((t) => econ.addTransaction(g, t, Number(p.amount) || 1000, 'debug', 'Debug: penge til alle')); return { ok: true }; }, cb));
    socket.on('host:grantAllLicenses', (_, cb) => hostMut((g) => { g.teams.forEach((t) => { t.derbyLicense = true; }); return { ok: true }; }, cb));
    socket.on('host:fakeTeams', (_, cb) => hostMut((g) => {
      const names = ['Lynhurtig', 'Galoppen', 'Hovslag', 'Vindstød', 'Guldmanke', 'Stormryttter', 'Kløvermark', 'Solstald', 'Nordlys', 'Tordensky', 'Æblegård', 'Fripot'];
      g.teams.forEach((t, i) => { t.joined = true; t.connected = true; t.stableName = names[i] || t.stableName; t.horseName = 'Hest ' + (i + 1); t.jockeyName = 'Jockey ' + (i + 1); t.ready = true; });
      return { ok: true };
    }, cb));
    socket.on('host:simulateRace', (_, cb) => hostMut((g) => {
      const race = gs.currentRace(g); if (!race) return { ok: false, error: 'Intet løb.' };
      races.setRolling(g, true);
      let guard = 200;
      while (!races.allRolled(g) && guard-- > 0) g.teams.forEach((t) => { if (race.rolls[t.id].length < race.allowed[t.id]) races.rollForTeam(g, t); });
      races.finishRace(g);
      return { ok: true };
    }, cb));
    socket.on('host:reset', (_, cb) => {
      const g = gameOf(); if (!g || !isHost()) return ack(cb, { ok: false });
      const fresh = gs.resetGame(g);
      rt.pushState(fresh); ack(cb, { ok: true });
    });
    socket.on('host:export', (_, cb) => { const g = gameOf(); ack(cb, g ? { ok: true, json: gs.exportGame(g) } : { ok: false }); });
    socket.on('host:import', (p, cb) => {
      try { const g = gs.importGame(p.json); socket.data.code = g.code; rt.pushState(g); ack(cb, { ok: true, code: g.code }); }
      catch (e) { ack(cb, { ok: false, error: 'Kunne ikke importere.' }); }
    });

    // ---------- TEAM: setup ----------
    socket.on('team:setStable', (p, cb) => mut((g) => { const t = teamOf(); return t ? gm.setStableInfo(g, t, p) : { ok: false }; }, cb));
    socket.on('team:ready', (p, cb) => mut((g) => { const t = teamOf(); if (t) t.ready = !!p.ready; return { ok: true }; }, cb));

    // ---------- TEAM: auktion ----------
    socket.on('team:bid', (p, cb) => mut((g) => { const t = teamOf(); return t ? auction.placeBid(g, t, p.exerciseId, p.amount) : { ok: false }; }, cb));
    socket.on('team:retractBid', (p, cb) => mut((g) => { const t = teamOf(); return t ? auction.retractBid(g, t, p.exerciseId) : { ok: false }; }, cb));
    socket.on('team:exchange', (p, cb) => mut((g) => { const t = teamOf(); return t ? auction.auctionHouseExchange(g, t, p.targetExerciseId) : { ok: false }; }, cb));

    // ---------- TEAM: investeringer ----------
    socket.on('team:invest', (p, cb) => mut((g) => { const t = teamOf(); return t ? econ.invest(g, t, p.assetType, p.productId) : { ok: false }; }, cb));

    // ---------- TEAM: trades ----------
    socket.on('team:trade', (p, cb) => mut((g) => { const t = teamOf(); return t ? trades.createTrade(g, t, p.toTeamId, p.offeredExerciseId, p.requestedExerciseId, p.extraPayment) : { ok: false }; }, cb));
    socket.on('team:tradeRespond', (p, cb) => mut((g) => { const t = teamOf(); return t ? trades.respondTrade(g, t, p.tradeId, p.accept) : { ok: false }; }, cb));
    socket.on('team:tradeCancel', (p, cb) => mut((g) => { const t = teamOf(); return t ? trades.cancelTrade(g, t, p.tradeId) : { ok: false }; }, cb));

    // ---------- TEAM: øvelser & godkendelser ----------
    socket.on('team:exerciseAttempt', (p, cb) => mut((g) => { const t = teamOf(); return t ? tasks.requestExerciseAttempt(g, t, p.exerciseId, p.meta) : { ok: false }; }, cb));
    socket.on('team:requestApproval', (p, cb) => mut((g) => { const t = teamOf(); return t ? tasks.requestTaskApproval(g, t, p.taskId) : { ok: false }; }, cb));

    // ---------- TEAM: løb ----------
    socket.on('team:roll', (_, cb) => mut((g) => { const t = teamOf(); return t ? races.rollForTeam(g, t) : { ok: false }; }, cb));
    socket.on('team:bet', (p, cb) => mut((g) => { const t = teamOf(); return t ? races.placeBet(g, t, p && p.amount) : { ok: false }; }, cb));

    // ---------- TEAM: rollekort ----------
    socket.on('team:setRoles', (p, cb) => mut((g) => {
      const t = teamOf(); if (!t) return { ok: false };
      const roles = p && p.roles ? p.roles : {};
      t.roles = {};
      for (const [k, v] of Object.entries(roles)) {
        if (typeof k === 'string' && typeof v === 'string' && v.trim()) t.roles[k.slice(0, 20)] = v.trim().slice(0, 30);
      }
      t.rolesRound = g.currentRound || 0;
      return { ok: true };
    }, cb));

    // ---------- TEAM: quiz-motorer (ack med data, ingen broadcast af facit) ----------
    socket.on('team:tip13Get', (_, cb) => { const g = gameOf(); const t = teamOf(); ack(cb, g && t ? tasks.getTip13(g, t) : { ok: false }); });
    socket.on('team:tip13Submit', (p, cb) => { const g = gameOf(); const t = teamOf(); const r = g && t ? tasks.submitTip13(g, t, p.answers || []) : { ok: false }; if (g) rt.pushState(g); ack(cb, r); });
    socket.on('team:tidslinjeGet', (_, cb) => { const g = gameOf(); const t = teamOf(); ack(cb, g && t ? tasks.getTidslinje(g, t) : { ok: false }); });
    socket.on('team:tidslinjeSubmit', (p, cb) => { const g = gameOf(); const t = teamOf(); const r = g && t ? tasks.submitTidslinje(g, t, p.orderedIds || []) : { ok: false }; if (g) rt.pushState(g); ack(cb, r); });

    // ---------- TEAM: dyst ----------
    socket.on('team:duelChallenge', (p, cb) => mut((g) => { const t = teamOf(); return t ? tasks.challengeDuel(g, t, p.toTeamId) : { ok: false }; }, cb));
    socket.on('team:duelRespond', (p, cb) => mut((g) => { const t = teamOf(); return t ? tasks.respondDuel(g, t, p.duelId, p.accept) : { ok: false }; }, cb));
    socket.on('team:duelSubmit', (p, cb) => mut((g) => { const t = teamOf(); return t ? tasks.submitDuel(g, t, p.duelId, p.answers || []) : { ok: false }; }, cb));

    // ---------- disconnect ----------
    socket.on('disconnect', () => {
      const g = gameOf();
      if (g && socket.data.role === 'team' && socket.data.teamId) {
        const t = gs.getTeam(g, socket.data.teamId);
        if (t) t.connected = false;
        rt.pushState(g);
      }
    });
  });

  // Periodisk tick: udløb af handler + auto-luk auktion.
  setInterval(() => {
    for (const game of gs.store.values()) {
      if (gm.tick(game)) rt.pushState(game);
    }
  }, 1000);
}

module.exports = { register };
