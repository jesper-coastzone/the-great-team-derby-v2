/*
 * socketHandlers.js — al realtime-wiring for host, screen og team.
 * Mønster: klient sender event → server validerer/muterer → pushState broadcaster ny state.
 */
const cfg = require('../../config/gameConfig');
const gs = require('./gameState');
const gm = require('./gameManager');
const auction = require('./auction');
const jockeyAuction = require('./jockeyAuction');
const trades = require('./trades');
const races = require('./races');
const tasks = require('./tasks');
const econ = require('./economy');
const changeCardEngine = require('./changeCardEngine');
const rt = require('./realtime');

function ack(cb, res) { if (typeof cb === 'function') cb(res || { ok: true }); }

const HOST_PASSWORD = process.env.HOST_PASSWORD || 'derby';

// Auto-warm-up: kørende scriptede løb — interval-handle pr. spilkode
const autoWarmupTimers = new Map();

// ---- Bots: computerstyrede stalde — tjener penge under runder og slår i åbne løb ----
const BOT_FLAVORS = ['Cornhole: godkendt', "Tip en 13'er: 9 rigtige", 'Hesteskohus: godkendt', 'Tidslinjen: løst', 'Stigegolf: godkendt'];
function botTick(game) {
  const bc = cfg.bots || {};
  let changed = false;
  const nowMs = Date.now();
  const race = gs.currentRace(game);
  for (const bot of game.teams) {
    if (!bot.isBot) continue;
    // (a) Indtjening: kun under en runde med aktiv rundetimer — aftagende pr. runde
    if (game.currentPhase === 'round' && game.timers && game.timers.round && nowMs >= (bot.botNextEarnAt || 0)) {
      const table = bc.earnPerMinuteByRound || [0];
      const perMin = table[Math.min(Math.max(game.currentRound || 1, 1) - 1, table.length - 1)] || 0;
      const interval = bc.earnIntervalSeconds || 40;
      const jitter = 1 + ((Math.random() * 2 - 1) * (bc.earnJitter || 0));
      // v2.13: host kan skrue op/ned for botterne live (game.botFactor, default 1)
      const factor = game.botFactor != null ? game.botFactor : 1;
      const amount = Math.round((perMin * (interval / 60) * jitter * factor) / 10) * 10;
      if (amount > 0) {
        const flavor = BOT_FLAVORS[Math.floor(Math.random() * BOT_FLAVORS.length)];
        econ.addTransaction(game, bot, amount, 'task', flavor);
        changed = true;
      }
      bot.botNextEarnAt = nowMs + interval * 1000;
    }
    // (b) Løb: slå terning med lille sandsynlighed pr. sekund — ALDRIG i auto-warm-up
    if (race && race.rollingOpen && race.status !== 'finished' && !race.isAutoWarmup && race.rolls[bot.id]) {
      const used = race.rolls[bot.id].length;
      const allowed = race.allowed[bot.id] || race.rollsPerTeam;
      if (used < allowed && Math.random() < (bc.raceRollChancePerTick || 0)) {
        const r = races.rollForTeam(game, bot);
        if (r && r.ok) changed = true;
      }
    }
  }
  return changed;
}

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
      else if (p.role === 'station') socket.join(`${game.code}:station`);
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
    // Forandringskort: spil et kort / afslut det aktive
    socket.on('host:playChangeCard', (p, cb) => hostMut((g) => changeCardEngine.playCard(g, p && p.cardId), cb));
    socket.on('host:endChangeCard', (_, cb) => hostMut((g) => changeCardEngine.endCard(g), cb));

    // Skjul/vis øvelser og pengeopgaver (glemt grej eller for få hold)
    socket.on('host:toggleExercise', (p, cb) => hostMut((g) => {
      g.disabled = g.disabled || { exercises: [], moneyTasks: [] };
      const ex = gs.exerciseById(g, p && p.exerciseId);
      if (!ex) return { ok: false, error: 'Ukendt øvelse.' };
      if (p.hidden) {
        if (ex.currentOwnerTeamId) return { ok: false, error: 'Øvelsen ejes af en stald — den kan ikke skjules nu.' };
        if (g.auction && (g.auction.status === 'open' || g.auction.status === 'closed')) return { ok: false, error: 'Vent til auktionen er afgjort.' };
        if (!g.disabled.exercises.includes(ex.id)) g.disabled.exercises.push(ex.id);
        gs.logEvent(g, `Øvelsen "${ex.name}" er skjult af værten.`);
      } else {
        g.disabled.exercises = g.disabled.exercises.filter((x) => x !== ex.id);
        gs.logEvent(g, `Øvelsen "${ex.name}" er med igen.`);
      }
      return { ok: true };
    }, cb));
    socket.on('host:toggleMoneyTask', (p, cb) => hostMut((g) => {
      g.disabled = g.disabled || { exercises: [], moneyTasks: [] };
      const valid = { tip13: 'Tip en 13\'er', tidslinje: 'Tidslinjen', mindpuzzle: 'Mind Puzzle', dyst: 'Dysten' };
      if (!p || !valid[p.taskId]) return { ok: false, error: 'Ukendt opgave.' };
      if (p.hidden) { if (!g.disabled.moneyTasks.includes(p.taskId)) g.disabled.moneyTasks.push(p.taskId); }
      else g.disabled.moneyTasks = g.disabled.moneyTasks.filter((x) => x !== p.taskId);
      gs.logEvent(g, `Pengeopgaven "${valid[p.taskId]}" er ${p.hidden ? 'skjult af værten' : 'med igen'}.`);
      return { ok: true };
    }, cb));

    // Lyd-toggles til storskærmen (rundemusik / løbsmusik / TTS-speaker)
    // Pre-season-gennemgang (v2.14): fremhæv ét punkt ad gangen på tablets + storskærm
    socket.on('host:setPreseasonFocus', (p, cb) => hostMut((g) => {
      const valid = ['tip13', 'tidslinje', 'mindpuzzle', 'dyst', 'stationer', 'faste'];
      const step = p && p.step;
      if (step != null && !valid.includes(step)) return { ok: false, error: 'Ukendt punkt.' };
      g.preseasonFocus = step || null;
      return { ok: true };
    }, cb));

    // Bot-styring (v2.13): skru op/ned for botternes indtjening live
    socket.on('host:setBotLevel', (p, cb) => hostMut((g) => {
      const f = Number(p && p.factor);
      if (!(f >= 0 && f <= 2)) return { ok: false, error: 'Ugyldigt bot-niveau.' };
      g.botFactor = f;
      gs.logEvent(g, `Bot-niveau sat til ${Math.round(f * 100)}%.`);
      return { ok: true };
    }, cb));

    socket.on('host:setSound', (p, cb) => hostMut((g) => {
      g.sound = g.sound || { roundMusic: false, raceMusic: false, tts: false };
      for (const k of ['roundMusic', 'raceMusic', 'tts']) if (p && typeof p[k] === 'boolean') g.sound[k] = p[k];
      return { ok: true };
    }, cb));

    // ---------- HOST: økonomi/warmup ----------
    socket.on('host:payWarmup', (_, cb) => hostMut((g) => econ.payWarmup(g), cb));

    // Automatisk warm-up: scriptet løb hvor alle hold ender på samme felt (dødt løb, ingen præmier)
    socket.on('host:autoWarmup', (p, cb) => {
      if (!isHost()) return ack(cb, { ok: false, error: 'Kun host.' });
      const g = gameOf();
      if (!g) return ack(cb, { ok: false, error: 'Ingen aktiv spil.' });
      let race = gs.currentRace(g);
      if (!race || race.status === 'finished') { races.startRace(g, 'normal'); race = gs.currentRace(g); }
      race.rollingOpen = true;
      race.status = 'running';
      race.isAutoWarmup = true;
      const plan = races.buildWarmupPlan(g);
      // Ryd evt. gammelt kørende auto-løb for dette spil
      if (autoWarmupTimers.has(g.code)) { clearInterval(autoWarmupTimers.get(g.code)); autoWarmupTimers.delete(g.code); }
      const teamIds = g.teams.map((t) => t.id);
      const rollsEach = 4; // planen har altid 4 slag pr. hold
      const totalSteps = teamIds.length * rollsEach;
      let step = 0; // round-robin: ét slag for ét hold pr. tick
      const handle = setInterval(() => {
        const game = gs.getGame(g.code);
        // Spillet er nulstillet/væk eller et nyt løb er startet → stop afviklingen
        if (!game || gs.currentRace(game) !== race) {
          clearInterval(handle); autoWarmupTimers.delete(g.code); return;
        }
        if (step >= totalSteps) {
          races.finishWarmupTie(game);
          rt.pushState(game);
          clearInterval(handle); autoWarmupTimers.delete(g.code); return;
        }
        const teamId = teamIds[step % teamIds.length];
        const rollIndex = Math.floor(step / teamIds.length);
        const team = gs.getTeam(game, teamId);
        if (team && plan[teamId]) races.applyScriptedRoll(game, team, plan[teamId][rollIndex]);
        step += 1;
        rt.pushState(game);
      }, 1300);
      autoWarmupTimers.set(g.code, handle);
      gs.logEvent(g, 'Automatisk warm-up løb sat i gang.');
      rt.pushState(g);
      ack(cb, { ok: true });
    });

    // ---------- HOST: auktion ----------
    // v3 etape 2: jockey-auktionen (Paddocken)
    socket.on('host:openJockeyAuction', (_, cb) => hostMut((g) => jockeyAuction.openAuction(g, g.currentRound || 1), cb));
    socket.on('host:resolveJockeyAuction', (_, cb) => hostMut((g) => jockeyAuction.resolveAuction(g), cb));

    socket.on('host:startAuction', (_, cb) => hostMut((g) => auction.startAuction(g, g.currentRound || 1), cb));
    socket.on('host:closeAuction', (_, cb) => hostMut((g) => auction.closeAuction(g), cb));
    socket.on('host:resolveAuction', (_, cb) => hostMut((g) => auction.resolveAuction(g), cb));

    // ---------- HOST: runde ----------
    socket.on('host:startRoundTimer', (p, cb) => hostMut((g) => gm.startRoundTimer(g, p && p.seconds), cb));
    socket.on('host:stopRoundTimer', (_, cb) => hostMut((g) => gm.stopRoundTimer(g), cb));
    // Paddocken (v2.13): genstart/luk investeringsvinduet manuelt
    socket.on('host:startPaddockTimer', (p, cb) => hostMut((g) => gm.startPaddockTimer(g, p && p.seconds), cb));
    socket.on('host:stopPaddockTimer', (_, cb) => hostMut((g) => gm.stopPaddockTimer(g), cb));
    // v2.17: forlæng/afkort den kørende paddock-timer
    socket.on('host:adjustPaddockTimer', (p, cb) => hostMut((g) => {
      if (!(g.timers && g.timers.paddock)) return { ok: false, error: 'Ingen aktiv paddock-timer.' };
      const delta = Number(p && p.deltaSeconds) || 0;
      g.timers.paddock.endsAt = Math.max(g.timers.paddock.endsAt + delta * 1000, Date.now() + 10 * 1000);
      gs.logEvent(g, `Paddock-timer justeret ${delta >= 0 ? '+' : '−'}${Math.round(Math.abs(delta) / 60 * 10) / 10} min.`);
      return { ok: true };
    }, cb));
    // Justér den kørende rundetimer løbende (fx +1/−1/+5 min) — aldrig kortere end nu+10s
    socket.on('host:adjustRoundTimer', (p, cb) => hostMut((g) => {
      if (!(g.timers && g.timers.round)) return { ok: false, error: 'Ingen aktiv rundetimer.' };
      const delta = Number(p && p.deltaSeconds) || 0;
      g.timers.round.endsAt = Math.max(g.timers.round.endsAt + delta * 1000, Date.now() + 10 * 1000);
      const mins = Math.round((Math.abs(delta) / 60) * 10) / 10;
      gs.logEvent(g, `Rundetimer justeret ${delta >= 0 ? '+' : '−'}${mins} min.`);
      return { ok: true };
    }, cb));

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
    socket.on('team:jockeyBid', (p, cb) => mut((g) => { const t = teamOf(); return t ? jockeyAuction.placeBid(g, t, p.jockeyId, p.amount) : { ok: false }; }, cb));
    socket.on('team:retractJockeyBid', (p, cb) => mut((g) => { const t = teamOf(); return t ? jockeyAuction.retractBid(g, t, p.jockeyId) : { ok: false }; }, cb));
    socket.on('team:bid', (p, cb) => mut((g) => { const t = teamOf(); return t ? auction.placeBid(g, t, p.exerciseId, p.amount) : { ok: false }; }, cb));
    socket.on('team:retractBid', (p, cb) => mut((g) => { const t = teamOf(); return t ? auction.retractBid(g, t, p.exerciseId) : { ok: false }; }, cb));
    socket.on('team:exchange', (p, cb) => mut((g) => { const t = teamOf(); return t ? auction.auctionHouseExchange(g, t, p.targetExerciseId) : { ok: false }; }, cb));

    // ---------- TEAM: investeringer ----------
    socket.on('team:invest', (p, cb) => mut((g) => {
      const t = teamOf(); if (!t) return { ok: false };
      // v2.13: investering kan KUN ske i Paddocken (vinduet før løbet)
      if (!gm.paddockOpen(g)) return { ok: false, error: 'Paddocken er lukket — I kan investere i vinduet lige før løbet.' };
      return econ.invest(g, t, p.assetType, p.productId);
    }, cb));

    // ---------- TEAM: trades ----------
    socket.on('team:trade', (p, cb) => mut((g) => { const t = teamOf(); return t ? trades.createTrade(g, t, p.toTeamId, p.offeredExerciseId, p.requestedExerciseId, p.extraPayment) : { ok: false }; }, cb));
    socket.on('team:tradeRespond', (p, cb) => mut((g) => { const t = teamOf(); return t ? trades.respondTrade(g, t, p.tradeId, p.accept) : { ok: false }; }, cb));
    socket.on('team:tradeCancel', (p, cb) => mut((g) => { const t = teamOf(); return t ? trades.cancelTrade(g, t, p.tradeId) : { ok: false }; }, cb));

    // ---------- TEAM: øvelser & godkendelser ----------
    socket.on('team:exerciseAttempt', (p, cb) => mut((g) => { const t = teamOf(); return t ? tasks.requestExerciseAttempt(g, t, p.exerciseId, p.meta) : { ok: false }; }, cb));
    socket.on('team:requestApproval', (p, cb) => mut((g) => { const t = teamOf(); return t ? tasks.requestTaskApproval(g, t, p.taskId) : { ok: false }; }, cb));

    // ---------- TEAM: løb ----------
    socket.on('team:roll', (_, cb) => mut((g) => { const t = teamOf(); return t ? races.rollForTeam(g, t) : { ok: false }; }, cb));
    // v2.16: Odds-tavlen — væddemål i Paddocken på en hvilken som helst hest
    socket.on('team:bet', (p, cb) => mut((g) => { const t = teamOf(); return t ? races.placeBet(g, t, p && p.targetTeamId, p && p.amount) : { ok: false }; }, cb));

    // v2.16: Løbsdags-boosts — købes i Paddocken, gælder kun næste løb
    socket.on('team:buyBoost', (p, cb) => mut((g) => {
      const t = teamOf(); if (!t) return { ok: false };
      if (!gm.paddockOpen(g)) return { ok: false, error: 'Boosts kan kun købes i Paddocken.' };
      const boost = (cfg.paddockBoosts || []).find((b) => b.id === (p && p.boostId));
      if (!boost) return { ok: false, error: 'Ukendt boost.' };
      t.raceBoosts = t.raceBoosts || {};
      if (t.raceBoosts[boost.id]) return { ok: false, error: 'I har allerede købt denne boost til løbet.' };
      if (!econ.canAfford(t, boost.cost)) return { ok: false, error: 'I har ikke nok i kassen.' };
      econ.addTransaction(g, t, -boost.cost, 'boost', `Løbsdags-boost: ${boost.label} (kun næste løb)`);
      t.raceBoosts[boost.id] = true;
      gs.logEvent(g, `${t.stableName} købte ${boost.label} til næste løb.`);
      return { ok: true };
    }, cb));

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

    // Pengeopgaver kan være slået fra af værten (glemt grej / for få hold)
    const taskOff = (g, id) => !!(g && g.disabled && g.disabled.moneyTasks && g.disabled.moneyTasks.includes(id));
    const OFF = { ok: false, error: 'Opgaven er ikke med i dag.' };

    // ---------- TEAM: quiz-motorer (ack med data, ingen broadcast af facit) ----------
    socket.on('team:tip13Get', (_, cb) => { const g = gameOf(); const t = teamOf(); if (taskOff(g, 'tip13')) return ack(cb, OFF); ack(cb, g && t ? tasks.getTip13(g, t) : { ok: false }); });
    socket.on('team:tip13Submit', (p, cb) => { const g = gameOf(); const t = teamOf(); if (taskOff(g, 'tip13')) return ack(cb, OFF); const r = g && t ? tasks.submitTip13(g, t, p.answers || []) : { ok: false }; if (g) rt.pushState(g); ack(cb, r); });
    // ---------- TEAM: Tidslinjen v2 (på holdets egen tablet — numre fra puljen på 40) ----------
    socket.on('team:tidslinjeGet', (_, cb) => { const g = gameOf(); const t = teamOf(); if (taskOff(g, 'tidslinje')) return ack(cb, OFF); ack(cb, g && t ? tasks.getTidslinje(g, t) : { ok: false }); });
    socket.on('team:tidslinjeSubmit', (p, cb) => { const g = gameOf(); const t = teamOf(); if (taskOff(g, 'tidslinje')) return ack(cb, OFF); const r = g && t ? tasks.submitTidslinje(g, t, (p && (p.orderedNumbers || p.orderedIds)) || []) : { ok: false }; if (g) rt.pushState(g); ack(cb, r); });
    // (Station-events beholdes for bagudkompatibilitet — bruger samme motor)
    socket.on('station:tidslinjeGet', (p, cb) => {
      const g = gameOf(); if (!g) return ack(cb, { ok: false, error: 'Intet spil.' });
      const t = gs.getTeam(g, p && p.teamId);
      ack(cb, t ? tasks.getTidslinje(g, t) : { ok: false, error: 'Ukendt hold.' });
    });
    socket.on('station:tidslinjeSubmit', (p, cb) => {
      const g = gameOf(); if (!g) return ack(cb, { ok: false, error: 'Intet spil.' });
      const t = gs.getTeam(g, p && p.teamId);
      const r = t ? tasks.submitTidslinje(g, t, (p && (p.orderedNumbers || p.orderedIds)) || []) : { ok: false, error: 'Ukendt hold.' };
      rt.pushState(g);
      ack(cb, r);
    });

    // ---------- TEAM: Mind Puzzle (Horse Academy) — auto-godkendelse på tablet ----------
    socket.on('team:mindpuzzleGet', (_, cb) => { const g = gameOf(); const t = teamOf(); if (taskOff(g, 'mindpuzzle')) return ack(cb, OFF); ack(cb, g && t ? tasks.getMindPuzzle(g, t) : { ok: false }); });
    socket.on('team:mindpuzzleSubmit', (p, cb) => { const g = gameOf(); const t = teamOf(); if (taskOff(g, 'mindpuzzle')) return ack(cb, OFF); const r = g && t ? tasks.submitMindPuzzle(g, t, (p && p.answers) || []) : { ok: false }; if (g) rt.pushState(g); ack(cb, r); });

    // ---------- TEAM: dyst ----------
    socket.on('team:duelChallenge', (p, cb) => mut((g) => { if (taskOff(g, 'dyst')) return OFF; const t = teamOf(); return t ? tasks.challengeDuel(g, t, p.toTeamId) : { ok: false }; }, cb));
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

  // Periodisk tick: udløb af handler + auto-luk auktion + bot-adfærd.
  setInterval(() => {
    for (const game of gs.store.values()) {
      const changed = gm.tick(game);
      const botChanged = botTick(game);
      if (changed || botChanged) rt.pushState(game);
    }
  }, 1000);
}

module.exports = { register };
