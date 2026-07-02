/*
 * tasks.js — opgavelogik.
 *  - Pengeopgaver (auto-rettet): Tip en 13'er, Tidslinje, Dyst
 *  - Auktionsøvelser: penge (host godkender succes) + performance (host indtaster resultat)
 *  - Kreative opgaver + puslespil: host godkender/scorer
 */
const cfg = require('../../config/gameConfig');
const { tip13Sets, tidslinjeSets, dystQuestions } = require('../../config/tasks');
const { uid, now, shuffle, pick } = require('./util');
const gs = require('./gameState');
const econ = require('./economy');
const perf = require('./performance');

// ---------- cooldowns ----------
function setCooldown(team, key, seconds) { team.cooldowns[key] = now() + seconds * 1000; }
function onCooldown(team, key) { return (team.cooldowns[key] || 0) > now(); }
function ensureStatus(team, id) { if (!team.taskStatus[id]) team.taskStatus[id] = { completed: false, count: 0 }; return team.taskStatus[id]; }
function ensureDuels(game) { if (!game.duels) game.duels = []; return game.duels; }

// =========================================================
//  TIP EN 13'ER  (auto-rettet, roterende sæt)
// =========================================================
function getTip13(game, team) {
  const st = ensureStatus(team, 'tip13');
  if (onCooldown(team, 'tip13')) return { ok: false, error: 'Tip en 13\'er er på cooldown.' };
  const set = tip13Sets[(st.count || 0) % tip13Sets.length];
  st.currentSetId = set.id;
  return {
    ok: true,
    setId: set.id,
    questions: set.questions.map((q, i) => ({ i, q: q.q, options: q.options })),
  };
}

function submitTip13(game, team, answers) {
  const st = ensureStatus(team, 'tip13');
  if (onCooldown(team, 'tip13')) return { ok: false, error: 'Tip en 13\'er er på cooldown.' };
  const set = tip13Sets.find((s) => s.id === st.currentSetId) || tip13Sets[0];
  let correct = 0;
  set.questions.forEach((q, i) => { if (Number(answers[i]) === q.correct) correct += 1; });
  const reward = correct * cfg.moneyTasks.tip13.rewardPerCorrect;
  if (reward > 0) econ.addTransaction(game, team, reward, 'task', `Tip en 13'er: ${correct}/${set.questions.length} rigtige`);
  st.count = (st.count || 0) + 1;
  setCooldown(team, 'tip13', cfg.moneyTasks.tip13.cooldownSeconds);
  gs.logEvent(game, `${team.stableName} løste Tip en 13'er (${correct} rigtige, +${reward} ${cfg.currencyAbbr}).`);
  return { ok: true, correct, total: set.questions.length, reward };
}

// =========================================================
//  TIDSLINJE  (auto-rettet)
// =========================================================
function getTidslinje(game, team) {
  const st = ensureStatus(team, 'tidslinje');
  if (onCooldown(team, 'tidslinje')) return { ok: false, error: 'Tidslinje er på cooldown.' };
  const set = tidslinjeSets[(st.count || 0) % tidslinjeSets.length];
  st.currentSetId = set.id;
  const items = set.items.map((it, i) => ({ id: i, label: it.label }));
  return { ok: true, setId: set.id, title: set.title, items: shuffle(items) };
}

function submitTidslinje(game, team, orderedIds) {
  const st = ensureStatus(team, 'tidslinje');
  if (onCooldown(team, 'tidslinje')) return { ok: false, error: 'Tidslinje er på cooldown.' };
  const set = tidslinjeSets.find((s) => s.id === st.currentSetId) || tidslinjeSets[0];
  const correctOrder = set.items
    .map((it, i) => ({ i, year: it.year }))
    .sort((a, b) => a.year - b.year)
    .map((x) => x.i);
  const success = JSON.stringify(orderedIds.map(Number)) === JSON.stringify(correctOrder);
  const reward = success ? cfg.moneyTasks.tidslinje.rewardOnSuccess : cfg.moneyTasks.tidslinje.rewardOnFail;
  if (reward) econ.addTransaction(game, team, reward, 'task', `Tidslinje: ${success ? 'korrekt' : 'forkert'}`);
  st.count = (st.count || 0) + 1;
  setCooldown(team, 'tidslinje', cfg.moneyTasks.tidslinje.cooldownSeconds);
  gs.logEvent(game, `${team.stableName} forsøgte Tidslinje (${success ? 'korrekt' : 'forkert'}).`);
  return { ok: true, success, reward, correctOrder: correctOrder.map((i) => set.items[i].label) };
}

// =========================================================
//  DYST  (hold mod hold, estimering, nærmeste vinder)
// =========================================================
function challengeDuel(game, fromTeam, toTeamId) {
  ensureDuels(game);
  if (onCooldown(fromTeam, 'dyst')) return { ok: false, error: 'Dyst er på cooldown.' };
  const toTeam = gs.getTeam(game, toTeamId);
  if (!toTeam) return { ok: false, error: 'Ukendt modstander.' };
  if (toTeam.id === fromTeam.id) return { ok: false, error: 'I kan ikke udfordre jer selv.' };
  const existing = game.duels.find((d) => ['pending', 'active'].includes(d.status) &&
    [d.fromTeamId, d.toTeamId].includes(fromTeam.id));
  if (existing) return { ok: false, error: 'I har allerede en aktiv dyst.' };
  const duel = {
    id: uid('duel'), fromTeamId: fromTeam.id, toTeamId,
    fromStable: fromTeam.stableName, toStable: toTeam.stableName,
    status: 'pending', createdAt: now(),
    questions: [], answers: {}, winnerTeamId: null,
  };
  game.duels.unshift(duel);
  gs.logEvent(game, `${fromTeam.stableName} udfordrede ${toTeam.stableName} til dyst.`);
  return { ok: true, duel };
}

function respondDuel(game, team, duelId, accept) {
  ensureDuels(game);
  const duel = game.duels.find((d) => d.id === duelId);
  if (!duel) return { ok: false, error: 'Dysten findes ikke.' };
  if (duel.toTeamId !== team.id) return { ok: false, error: 'Kun den udfordrede kan svare.' };
  if (duel.status !== 'pending') return { ok: false, error: 'Dysten er ikke længere aktiv.' };
  if (!accept) { duel.status = 'declined'; return { ok: true, duel }; }
  const n = cfg.moneyTasks.dyst.questionsPerDuel;
  duel.questions = shuffle(dystQuestions).slice(0, n).map((q) => ({ q: q.q, unit: q.unit, answer: q.answer }));
  duel.status = 'active';
  duel.answers = {};
  gs.logEvent(game, `Dyst mellem ${duel.fromStable} og ${duel.toStable} er i gang.`);
  return { ok: true, duel };
}

function submitDuel(game, team, duelId, answers) {
  const duel = (game.duels || []).find((d) => d.id === duelId);
  if (!duel) return { ok: false, error: 'Dysten findes ikke.' };
  if (![duel.fromTeamId, duel.toTeamId].includes(team.id)) return { ok: false, error: 'I er ikke med i dysten.' };
  if (duel.status !== 'active') return { ok: false, error: 'Dysten er ikke aktiv.' };
  duel.answers[team.id] = answers.map(Number);
  // begge svaret?
  if (duel.answers[duel.fromTeamId] && duel.answers[duel.toTeamId]) resolveDuel(game, duel);
  return { ok: true, duel: sanitizeDuel(duel, team.id) };
}

function resolveDuel(game, duel) {
  const a = duel.answers[duel.fromTeamId];
  const b = duel.answers[duel.toTeamId];
  let winsA = 0, winsB = 0;
  duel.questions.forEach((q, i) => {
    const da = Math.abs((a[i] ?? Infinity) - q.answer);
    const db = Math.abs((b[i] ?? Infinity) - q.answer);
    if (da < db) winsA += 1; else if (db < da) winsB += 1;
  });
  const from = gs.getTeam(game, duel.fromTeamId);
  const to = gs.getTeam(game, duel.toTeamId);
  const cfgd = cfg.moneyTasks.dyst;
  let winner = null;
  if (winsA > winsB) winner = from; else if (winsB > winsA) winner = to;
  duel.winsA = winsA; duel.winsB = winsB;
  if (winner) {
    const loser = winner === from ? to : from;
    duel.winnerTeamId = winner.id;
    if (cfgd.rewardWinner) econ.addTransaction(game, winner, cfgd.rewardWinner, 'task', 'Vandt dyst');
    if (cfgd.rewardLoser) econ.addTransaction(game, loser, cfgd.rewardLoser, 'task', 'Tabte dyst');
  }
  duel.status = 'resolved';
  setCooldown(from, 'dyst', cfgd.cooldownSeconds);
  setCooldown(to, 'dyst', cfgd.cooldownSeconds);
  gs.logEvent(game, `Dyst afgjort: ${winner ? winner.stableName + ' vandt' : 'uafgjort'} (${winsA}-${winsB}).`);
}

function sanitizeDuel(duel, forTeamId) {
  return {
    id: duel.id, status: duel.status,
    fromTeamId: duel.fromTeamId, toTeamId: duel.toTeamId,
    fromStable: duel.fromStable, toStable: duel.toStable,
    questions: duel.questions.map((q) => ({ q: q.q, unit: q.unit })), // skjul facit
    submitted: {
      [duel.fromTeamId]: !!(duel.answers && duel.answers[duel.fromTeamId]),
      [duel.toTeamId]: !!(duel.answers && duel.answers[duel.toTeamId]),
    },
    winnerTeamId: duel.winnerTeamId, winsA: duel.winsA, winsB: duel.winsB,
    // afsløret facit efter resolution
    reveal: duel.status === 'resolved' ? duel.questions.map((q) => q.answer) : null,
  };
}

function duelsForTeam(game, teamId) {
  return (game.duels || [])
    .filter((d) => [d.fromTeamId, d.toTeamId].includes(teamId) && ['pending', 'active', 'resolved'].includes(d.status))
    .slice(0, 5)
    .map((d) => sanitizeDuel(d, teamId));
}

// =========================================================
//  AUKTIONSØVELSER — officielle forsøg (host godkender)
// =========================================================
function requestExerciseAttempt(game, team, exerciseId, meta = {}) {
  if (team.ownedAuctionExerciseId !== exerciseId) return { ok: false, error: 'I ejer ikke den øvelse.' };
  const ex = gs.exerciseById(game, exerciseId);
  if (!ex) return { ok: false, error: 'Ukendt øvelse.' };
  if (onCooldown(team, exerciseId)) return { ok: false, error: 'Øvelsen er på cooldown.' };
  const st = ensureStatus(team, exerciseId);
  st.pending = true;
  st.pendingKind = ex.category === 'money' ? 'auction-money' : 'auction-performance';
  st.pendingMeta = { exerciseName: ex.name, category: ex.category, ...meta };
  gs.logEvent(game, `${team.stableName} bad om officielt forsøg: ${ex.name}.`);
  return { ok: true };
}

// =========================================================
//  ALTID-TILGÆNGELIGE (puslespil + kreative) — team beder om godkendelse
// =========================================================
function requestTaskApproval(game, team, taskId) {
  const st = ensureStatus(team, taskId);
  if (st.completed && taskId === 'puzzle') return { ok: false, error: 'Puslespillet er allerede godkendt.' };
  st.pending = true;
  st.pendingKind = 'always';
  gs.logEvent(game, `${team.stableName} bad om godkendelse: ${taskId}.`);
  return { ok: true };
}

// =========================================================
//  HOST-side: resolvér godkendelser
// =========================================================
function hostResolveApproval(game, teamId, taskId, approve, extra = {}) {
  const team = gs.getTeam(game, teamId);
  if (!team) return { ok: false, error: 'Ukendt hold.' };
  const st = ensureStatus(team, taskId);
  st.pending = false;
  const kind = st.pendingKind;
  st.pendingKind = null; st.pendingMeta = null;

  if (!approve) { gs.logEvent(game, `Host afviste ${taskId} for ${team.stableName}.`); return { ok: true, approved: false }; }

  const ex = gs.exerciseById(game, taskId);
  if (ex && ex.category === 'money') {
    const reward = gs.nextMoneyReward(ex);
    econ.addTransaction(game, team, reward, 'exercise', `${ex.name}: godkendt`);
    ex.successCount += 1;
    if (ex.progressive) team.mindPuzzleLevel = (team.mindPuzzleLevel || 0) + 1;
    ex.resultHistory.push({ teamId: team.id, reward, at: now() });
    setCooldown(team, ex.id, ex.cooldownSeconds || cfg.auctionExerciseCooldownSeconds);
    gs.logEvent(game, `${team.stableName}: ${ex.name} godkendt (+${reward} ${cfg.currencyAbbr}).`);
    return { ok: true, approved: true, reward };
  }

  if (ex && ex.category !== 'money') {
    // performance: extra.level (pass/bronze/silver/gold) ELLER extra.value → level
    let level = extra.level;
    if (!level && extra.value != null) level = perf.scoreToLevel(ex, Number(extra.value));
    if (!level) return { ok: false, error: 'Angiv resultatniveau (pass/bronze/silver/gold).' };
    const points = perf.resultLevelToPoints(level);
    const which = ex.category === 'jockey' ? 'jockey' : 'horse';
    perf.addPerformancePoints(game, team, which, points);
    // Kontant udbetaling pr. medalje — balancerer performance mod penge-øvelser
    const payout = (cfg.performanceRewards || {})[level] || 0;
    if (payout) econ.addTransaction(game, team, payout, 'exercise', `${ex.name}: ${level}`);
    ex.resultHistory.push({ teamId: team.id, level, points, at: now() });
    setCooldown(team, ex.id, ex.cooldownSeconds || 60);
    gs.logEvent(game, `${team.stableName}: ${ex.name} = ${level} (+${points} ${which}-point${payout ? `, +${payout} ${cfg.currencyAbbr}` : ''}).`);
    return { ok: true, approved: true, level, points, payout };
  }

  // altid-tilgængelige
  if (taskId === 'puzzle') {
    st.completed = true;
    if (cfg.puzzle.grantsDerbyLicense) team.derbyLicense = true;
    if (cfg.puzzle.rewardOnComplete) econ.addTransaction(game, team, cfg.puzzle.rewardOnComplete, 'task', 'Puslespil fuldført');
    gs.logEvent(game, `${team.stableName} fuldførte puslespillet${team.derbyLicense ? ' (Derby-licens)' : ''}.`);
    return { ok: true, approved: true };
  }
  // kreative — markér fuldført (bonus gives i showcase)
  st.completed = true;
  gs.logEvent(game, `${team.stableName}: ${taskId} markeret fuldført.`);
  return { ok: true, approved: true };
}

// Host giver kreativ bonus (showcase)
function setCreativeBonus(game, teamId, taskId, amount) {
  const team = gs.getTeam(game, teamId);
  if (!team) return { ok: false, error: 'Ukendt hold.' };
  amount = Math.round(amount) || 0;
  if (cfg.creative.bonusAsStableValue) team.stableValue += amount;
  else econ.addTransaction(game, team, amount, 'creative', 'Kreativ bonus');
  gs.logEvent(game, `${team.stableName} fik kreativ bonus (+${amount}) for ${taskId}.`);
  return { ok: true };
}

module.exports = {
  onCooldown, setCooldown,
  getTip13, submitTip13, getTidslinje, submitTidslinje,
  challengeDuel, respondDuel, submitDuel, duelsForTeam,
  requestExerciseAttempt, requestTaskApproval, hostResolveApproval, setCreativeBonus,
};
