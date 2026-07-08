/*
 * tasks.js — opgavelogik.
 *  - Pengeopgaver (auto-rettet): Tip en 13'er, Tidslinje, Dyst
 *  - Auktionsøvelser: penge (host godkender succes) + performance (host indtaster resultat)
 *  - Kreative opgaver + puslespil: host godkender/scorer
 */
const cfg = require('../../config/gameConfig');
const { tip13Sets, tidslinjeSets, timelineEvents, dystQuestions } = require('../../config/tasks');
const mindpuzzle = require('../../config/mindpuzzleLevels');
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
//  TIDSLINJEN v2  (auto-rettet — på holdets EGEN tablet)
// =========================================================
// Fælles pengeopgave: tabletten trækker 5 TILFÆLDIGE numre fra puljen med 40
// nummererede begivenheder. Begivenhedsteksterne hænger KUN på de fysiske ark
// i lokalet — holdet skal ud og finde numrene, tilbage og lægge dem i
// kronologisk rækkefølge. Årstal (facit) forlader aldrig serveren.
function getTidslinje(game, team) {
  const st = ensureStatus(team, 'tidslinje');
  const cdLeft = onCooldown(team, 'tidslinje') ? Math.ceil((team.cooldowns.tidslinje - now()) / 1000) : 0;
  const perDraw = cfg.moneyTasks.tidslinje.cardsPerDraw || 5;
  // Behold igangværende træk, indtil det er afleveret — ellers kan man fiske efter lette træk
  if (!st.currentDraw || !st.currentDraw.length) {
    st.currentDraw = shuffle(timelineEvents.map((e) => e.n)).slice(0, perDraw);
  }
  return {
    ok: true,
    cards: st.currentDraw.slice().sort((a, b) => a - b),
    nextReward: cfg.moneyTasks.tidslinje.rewardOnSuccess, cooldownLeft: cdLeft,
  };
}

function submitTidslinje(game, team, orderedNumbers) {
  if (onCooldown(team, 'tidslinje')) return { ok: false, error: 'Tidslinjen er på cooldown.' };
  const st = ensureStatus(team, 'tidslinje');
  const draw = st.currentDraw || [];
  if (!draw.length) return { ok: false, error: 'Hent opgaven igen.' };
  const submitted = (orderedNumbers || []).map(Number);
  if (submitted.length !== draw.length || submitted.some((n) => !draw.includes(n))) {
    return { ok: false, error: 'Angiv rækkefølgen af alle jeres kort.' };
  }
  const byN = new Map(timelineEvents.map((e) => [e.n, e]));
  const correctOrder = draw.slice().sort((a, b) => byN.get(a).year - byN.get(b).year);
  const success = JSON.stringify(submitted) === JSON.stringify(correctOrder);
  st.count = (st.count || 0) + 1;
  st.currentDraw = null; // nyt tilfældigt træk næste gang — uanset udfald
  setCooldown(team, 'tidslinje', cfg.moneyTasks.tidslinje.cooldownSeconds);
  const reward = success ? cfg.moneyTasks.tidslinje.rewardOnSuccess : cfg.moneyTasks.tidslinje.rewardOnFail;
  if (reward) econ.addTransaction(game, team, reward, 'task', `Tidslinjen ${success ? 'korrekt' : 'forkert'}`);
  gs.logEvent(game, `${team.stableName} forsøgte Tidslinjen (${success ? `korrekt, +${reward} ${cfg.currencyAbbr}` : 'forkert'}).`);
  const res = { ok: true, success, reward: success ? reward : 0 };
  if (success) {
    res.correctCards = correctOrder;
    res.correctLabels = correctOrder.map((n) => byN.get(n).label);
  }
  return res;
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
//  MIND PUZZLE (Horse Academy) — auto-godkendelse på tablet
//  Kontrolspørgsmål genereres ud fra løsningen og kan kun
//  besvares, hvis holdet fysisk har bygget banen korrekt.
// =========================================================
const MP_PENALTY_SECONDS = (cfg.mindpuzzleAuto && cfg.mindpuzzleAuto.penaltyCooldownSeconds) || 60;
const MP_QUESTIONS_PER_CHECK = (cfg.mindpuzzleAuto && cfg.mindpuzzleAuto.questionsPerCheck) || 2;

function mpCurrentLevel(team) {
  const idx = team.mindPuzzleLevel || 0;
  return mindpuzzle.LEVELS[idx] || null;
}

function mpBuildQuestion(levelDef, q) {
  if (q.gate) {
    return {
      type: 'gate',
      text: 'Ved hvilket bogstav på banens kant står den røde bom?',
      options: mindpuzzle.GATE_LETTERS.map((l) => ({ id: l, label: l })),
    };
  }
  // Farvemuligheder: farver der faktisk indgår i løsningen (kan ikke udelukkes
  // ud fra opgavekortet) — suppleret op til 4 hvis niveauet har få farver.
  const wrong = shuffle(levelDef.colors.filter((c) => c !== q.correct)).slice(0, 3);
  while (wrong.length < 3) {
    const extra = shuffle(Object.keys(mindpuzzle.COLOR_LABELS).filter((c) => c !== q.correct && !wrong.includes(c)))[0];
    wrong.push(extra);
  }
  const options = shuffle([q.correct, ...wrong]);
  return {
    type: 'color',
    text: `Hvilken forhindring står tættest på bogstavet ${q.letter} på jeres bane?`,
    options: options.map((c) => ({ id: c, label: mindpuzzle.COLOR_LABELS[c] })),
  };
}

// Hent nuværende niveau + friske kontrolspørgsmål (uden facit!)
// v2: FÆLLES pengeopgave — alle hold har adgang hele tiden (ingen ejerskabskrav).
function getMindPuzzle(game, team) {
  const levelDef = mpCurrentLevel(team);
  if (!levelDef) return { ok: true, done: true, totalLevels: mindpuzzle.LEVELS.length };
  const cdLeft = onCooldown(team, 'mindpuzzle') ? Math.ceil((team.cooldowns.mindpuzzle - now()) / 1000) : 0;

  // Træk tilfældige spørgsmål og gem de valgte indexer på holdet (server-side facit)
  const qIdx = shuffle(levelDef.questions.map((_, i) => i)).slice(0, MP_QUESTIONS_PER_CHECK);
  const st = ensureStatus(team, 'mindpuzzle');
  st.mpQuestionIdx = qIdx;

  return {
    ok: true,
    level: levelDef.level,
    totalLevels: mindpuzzle.LEVELS.length,
    tier: levelDef.tier,
    book: levelDef.book,
    image: `/assets/mindpuzzle/challenge-${String(levelDef.book).padStart(2, '0')}.jpg`,
    nextReward: (cfg.moneyTasks.mindpuzzle && cfg.moneyTasks.mindpuzzle.rewardPerLevel) || 300,
    cooldownLeft: cdLeft,
    questions: qIdx.map((i) => mpBuildQuestion(levelDef, levelDef.questions[i])),
  };
}

// Tjek svar. Rigtigt → belønning + næste niveau. Forkert → straf-cooldown.
function submitMindPuzzle(game, team, answers) {
  if (onCooldown(team, 'mindpuzzle')) return { ok: false, error: 'Mind Puzzle er på cooldown.' };
  const levelDef = mpCurrentLevel(team);
  if (!levelDef) return { ok: false, error: 'Alle niveauer er gennemført!' };
  const st = ensureStatus(team, 'mindpuzzle');
  const qIdx = st.mpQuestionIdx || [];
  if (!qIdx.length || !Array.isArray(answers) || answers.length !== qIdx.length) {
    return { ok: false, error: 'Hent spørgsmålene igen.' };
  }

  const allCorrect = qIdx.every((qi, i) => {
    const q = levelDef.questions[qi];
    return String(answers[i]) === String(q.correct);
  });
  st.mpQuestionIdx = null;

  if (!allCorrect) {
    setCooldown(team, 'mindpuzzle', MP_PENALTY_SECONDS);
    gs.logEvent(game, `${team.stableName}: Mind Puzzle niveau ${levelDef.level} — kontrol fejlede (${MP_PENALTY_SECONDS}s pause).`);
    return { ok: true, approved: false, penaltySeconds: MP_PENALTY_SECONDS };
  }

  const mpCfg = cfg.moneyTasks.mindpuzzle || {};
  const reward = mpCfg.rewardPerLevel || 300; // fast belønning — banerne bliver sværere af sig selv
  econ.addTransaction(game, team, reward, 'task', `Mind Puzzle niveau ${levelDef.level} godkendt`);
  team.mindPuzzleLevel = (team.mindPuzzleLevel || 0) + 1;
  setCooldown(team, 'mindpuzzle', mpCfg.cooldownSeconds || 300);
  const done = team.mindPuzzleLevel >= mindpuzzle.LEVELS.length;
  gs.logEvent(game, `${team.stableName} løste Mind Puzzle niveau ${levelDef.level} (${levelDef.tier}) — auto-godkendt (+${reward} ${cfg.currencyAbbr})${done ? '. ALLE 20 NIVEAUER FULDFØRT!' : ''}`);
  return { ok: true, approved: true, reward, level: levelDef.level, done };
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
  getMindPuzzle, submitMindPuzzle,
};
