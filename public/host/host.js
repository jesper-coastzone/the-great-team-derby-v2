/* host.js — game master-konsol: præsentationsstyring, godkendelser, teams, races, debug. */
(function () {
  const { el, clear, sd, money, toast, check } = TG;
  const root = document.getElementById('root');
  let S = null; const ORIGIN = location.origin;
  // Multi-spil: hvilken spilkode konsollen viser lige nu, og om vi er i opret-flowet.
  const ui = { creating: false, expectCode: TG.load('tg_host_code') || null };

  // (Re)bootstrap ved hver forbindelse: log ind med gemt kodeord, gen-join spillet.
  function bootstrap() {
    const pw = TG.load('tg_host_pw');
    if (!pw) { if (!S) loginForm(); return; }
    TG.emit('host:login', { password: pw }).then((r) => {
      if (!r.ok) { TG.del('tg_host_pw'); loginForm(); return; }
      const code = TG.load('tg_host_code');
      if (code) TG.emit('join', { role: 'host', code }).then((j) => { if (!j.ok && !S) { TG.del('tg_host_code'); createForm(); } });
      else if (!S) createForm();
    });
  }
  TG.socket.on('connect', bootstrap);
  if (TG.socket.connected) bootstrap();

  TG.onState((st) => {
    if (ui.creating) return; // opret-formularen er åben — ignorér state-pushes
    if (ui.expectCode && st.code !== ui.expectCode) return; // state fra et andet spil
    S = st; render();
  });

  function loginForm() {
    clear(root);
    const wrap = el('div', { style: 'max-width:420px;margin:12vh auto;padding:20px' });
    const card = el('div.card');
    card.appendChild(el('div', { style: 'width:48px;height:48px;margin-bottom:10px', html: TG.motif.compass('#B8A993') }));
    card.appendChild(el('div.eyebrow', { text: 'Host · login' }));
    card.appendChild(el('h1', { text: 'The Great Team Derby', style: 'font-size:30px;margin:6px 0 16px' }));
    const inp = el('input', { type: 'password', placeholder: 'Kodeord', style: 'font-size:18px' });
    const btn = el('button.btn.gold.block.lg', { text: 'Log ind', style: 'margin-top:10px' });
    const go = () => TG.emit('host:login', { password: inp.value }).then((r) => { if (!r.ok) return check(r); TG.save('tg_host_pw', inp.value); const code = TG.load('tg_host_code'); if (code) TG.emit('join', { role: 'host', code }).then((j) => { if (!j.ok) { TG.del('tg_host_code'); createForm(); } }); else createForm(); });
    btn.addEventListener('click', go);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    card.appendChild(el('label.field', {}, [inp])); card.appendChild(btn);
    wrap.appendChild(card); root.appendChild(wrap);
  }

  // ---------- CREATE ----------
  function createForm() {
    clear(root);
    const wrap = el('div', { style: 'max-width:640px;margin:6vh auto;padding:20px' });
    const card = el('div.card');
    card.appendChild(el('div.eyebrow', { text: 'Host · nyt spil' }));
    card.appendChild(el('h1', { text: 'Opret The Great Team Derby', style: 'margin:6px 0 18px' }));
    const f = {};
    const txt = (lbl, key, val, type) => { const i = el('input', { type: type || 'text', value: val }); f[key] = i; return el('label.field', {}, [el('span.lbl', { text: lbl }), i]); };
    card.appendChild(txt('Event / kundenavn', 'eventName', 'The Great Team Derby'));
    const prog = el('textarea', { rows: '5' }); prog.value = 'Velkomst\nIntroduktion\nPre-season\nAuktion\nRunde\nLøb\nThe Great Team Derby\nAfrunding'; f.program = prog;
    card.appendChild(el('label.field', {}, [el('span.lbl', { text: 'Program (én linje pr. punkt)' }), prog]));
    const row = el('div.grid', { style: 'grid-template-columns:1fr 1fr' });
    row.appendChild(txt('Antal hold', 'numTeams', '6', 'number'));
    // v3: format bestemmer antal sæsoner (2t = 3 sæsoner · 3t = 4 sæsoner + forandringskort)
    const fmtSel = el('select'); [['2t', '2 timer (3 sæsoner)'], ['3t', '3 timer (4 sæsoner + forandringskort)']].forEach(([v, l]) => { const o = el('option', { text: l }); o.value = v; fmtSel.appendChild(o); }); f.format = fmtSel;
    row.appendChild(el('label.field', {}, [el('span.lbl', { text: 'Format' }), fmtSel]));
    const langSel = el('select'); [['da', 'Dansk'], ['en', 'English']].forEach(([v, l]) => { const o = el('option', { text: l }); o.value = v; langSel.appendChild(o); }); f.lang = langSel;
    row.appendChild(el('label.field', {}, [el('span.lbl', { text: 'Sprog (deltagere)' }), langSel]));
    row.appendChild(txt('Rundelængde (min)', 'roundMin', '20', 'number'));
    row.appendChild(txt('Antal bots (0-3)', 'numBots', '0', 'number'));
    card.appendChild(row);
    const btn = el('button.btn.gold.block.lg', { text: 'Opret spil' });
    btn.addEventListener('click', () => {
      const settings = {
        eventName: f.eventName.value, programItems: prog.value.split('\n').map((s) => s.trim()).filter(Boolean),
        numTeams: Number(f.numTeams.value),
        format: f.format.value, lang: f.lang.value,
        roundLengthSeconds: Number(f.roundMin.value) * 60,
        numBots: Number(f.numBots.value) || 0,
      };
      TG.emit('host:createGame', settings).then((r) => {
        if (r.ok) { TG.save('tg_host_code', r.code); ui.expectCode = r.code; ui.creating = false; toast('Spil oprettet: ' + r.code, 'ok'); }
        else check(r);
      });
    });
    card.appendChild(btn);
    // Kom man hertil fra et aktivt spil, kan man fortryde og gå tilbage.
    if (ui.creating && S) {
      const back = el('button.btn.ghost.block', { text: '← Tilbage til ' + (ui.expectCode || 'aktivt spil'), style: 'margin-top:8px' });
      back.addEventListener('click', () => { ui.creating = false; render(); });
      card.appendChild(back);
    }
    wrap.appendChild(card);
    root.appendChild(wrap);
  }

  // ---------- CONSOLE ----------
  function render() {
    if (!S) return;
    clear(root);
    root.appendChild(hostbar());
    const wrap = el('div.wrap');
    wrap.appendChild(leftCol());
    wrap.appendChild(rightCol());
    root.appendChild(wrap);
  }

  function hostbar() {
    const b = el('div.hostbar');
    b.appendChild(el('div', { style: 'width:34px;height:34px', html: TG.motif.compass('#B8A993') }));
    b.appendChild(el('div', {}, [el('div', { style: 'font-size:11px;letter-spacing:2px;opacity:.7', text: 'SPILKODE' }), el('div.code', { text: S.code })]));
    const urls = el('div.urls', { html: `Skærm: ${ORIGIN}/screen?code=${S.code}<br>Tablet: ${ORIGIN}/team` });
    b.appendChild(urls);
    return b;
  }

  function leftCol() {
    const col = el('div.col');
    // Præsentationsstyring
    const pres = el('div.card.sec');
    const sb = el('div.slidebar');
    const prev = el('button.btn.ghost', { text: '‹ Forrige' }); prev.addEventListener('click', () => TG.emit('host:prev'));
    const next = el('button.btn.lg', { text: 'Næste ›' }); next.addEventListener('click', () => TG.emit('host:next'));
    sb.appendChild(prev);
    sb.appendChild(el('div.now', {}, [el('div.mini', { text: `Slide ${S.slide.index + 1}/${S.slide.total} · ${S.phase}` }), el('div.t', { text: S.slide.title })]));
    sb.appendChild(next);
    pres.appendChild(sb);
    if (S.slide.hostHint) pres.appendChild(el('p.mini', { style: 'margin-top:6px', text: '💡 ' + S.slide.hostHint }));
    // deck jump
    const deck = el('div.deck-list', { style: 'margin-top:10px' });
    (S.deck || []).forEach((d) => { const item = el('div.d' + (d.index === S.slide.index ? '.active' : ''), {}, [el('span.mini', { text: (d.index + 1) + '.' }), el('span', { text: d.title })]); item.addEventListener('click', () => TG.emit('host:goto', { index: d.index })); deck.appendChild(item); });
    pres.appendChild(deck);
    col.appendChild(pres);

    // Fase-specifikke handlinger
    col.appendChild(phaseActions());
    return col;
  }

  function phaseActions() {
    const c = el('div.card.sec');
    c.appendChild(el('h3', { text: 'Handlinger for denne fase' }));
    const box = el('div.col');
    const kind = S.slide.kind; const phase = S.phase;
    const btn = (label, ev, payload, cls) => { const b = el('button.btn' + (cls || ''), { text: label }); b.addEventListener('click', () => TG.emit(ev, payload).then(check)); return b; };

    if (phase === 'warmup') {
      // Automatisk warm-up: scriptet løb der ender uafgjort — ingen præmier
      box.appendChild(btn('▶ Afspil warm-up løb (automatisk)', 'host:autoWarmup', {}, '.gold'));
      box.appendChild(btn(S.warmupPaid ? '✓ Startkapital udbetalt' : 'Udbetal startkapital til alle', 'host:payWarmup', {}, '.gold'));
      box.appendChild(raceControls());
    } else if (phase === 'auction') {
      const a = S.auction;
      const row = el('div.row.wrap');
      row.appendChild(btn('Start/genåbn auktion', 'host:startAuction', {}, '.turf'));
      row.appendChild(btn('Luk for bud', 'host:closeAuction', {}));
      row.appendChild(btn('Afgør auktion', 'host:resolveAuction', {}, '.gold'));
      box.appendChild(row);
      box.appendChild(el('div.mini', { text: 'Status: ' + (a ? a.status : 'ingen') }));
      box.appendChild(bidTable());
    } else if (phase === 'round' || phase === 'preseason-round') {
      const row = el('div.row.wrap');
      if (phase === 'preseason-round') row.appendChild(btn('Start prøverunde (10 min)', 'host:startRoundTimer', { seconds: 600 }, '.gold'));
      row.appendChild(btn('Start rundetimer', 'host:startRoundTimer', {}, '.turf'));
      row.appendChild(btn('Stop timer', 'host:stopRoundTimer', {}));
      box.appendChild(row);
      if (S.timers && S.timers.round) {
        // Timer-visning + løbende justering af rundetiden
        const timerRow = el('div.row.wrap', { style: 'align-items:center;gap:8px' });
        timerRow.appendChild(el('div.big-num', { style: 'font-size:32px;color:var(--navy)', text: TG.countdown(S.timers.round.endsAt), 'data-endsat': S.timers.round.endsAt }));
        [[-60, '−1 min'], [60, '+1 min'], [300, '+5 min']].forEach(([d, l]) => {
          const x = el('button.btn.sm.ghost', { text: l });
          x.addEventListener('click', () => TG.emit('host:adjustRoundTimer', { deltaSeconds: d }).then(check));
          timerRow.appendChild(x);
        });
        box.appendChild(timerRow);
      }
    } else if (phase === 'paddock') {
      // Paddocken: investeringsvinduet — timeren starter automatisk ved slide-skift
      const row = el('div.row.wrap');
      row.appendChild(btn('Genstart Paddock (3 min)', 'host:startPaddockTimer', {}, '.gold'));
      row.appendChild(btn('+1 min', 'host:adjustPaddockTimer', { deltaSeconds: 60 }, '.turf'));
      row.appendChild(btn('+2 min', 'host:adjustPaddockTimer', { deltaSeconds: 120 }, '.turf'));
      row.appendChild(btn('−1 min', 'host:adjustPaddockTimer', { deltaSeconds: -60 }, '.ghost'));
      row.appendChild(btn('Luk Paddocken nu', 'host:stopPaddockTimer', {}, '.burgundy'));
      box.appendChild(row);
      // v3 etape 2: jockey-auktionen
      const ja = S.jockeyAuction || { status: 'idle' };
      const jaRow = el('div.row.wrap', { style: 'margin-top:8px' });
      if (ja.status === 'open') {
        jaRow.appendChild(btn('🔨 Afgør jockey-auktionen (alle får én)', 'host:resolveJockeyAuction', {}, '.gold'));
        const bidCount = (ja.jockeys || []).filter((j) => j.topBid).length;
        jaRow.appendChild(el('span.mini', { text: `Bud på ${bidCount} af ${(ja.jockeys || []).length} jockeyer — stalde uden vundet bud får rest til mindstepris.` }));
      } else if (ja.status === 'resolved') {
        jaRow.appendChild(el('span.mini', { text: '🏇 Jockey-auktionen er afgjort: ' + (ja.jockeys || []).filter((j) => j.winner).map((j) => `${j.name} → ${j.winner.stableName}`).join(' · ') }));
        jaRow.appendChild(btn('Genåbn auktionen', 'host:openJockeyAuction', {}, '.ghost'));
      }
      box.appendChild(jaRow);
      if (S.timers && S.timers.paddock) {
        box.appendChild(el('div.big-num', { style: 'font-size:32px;color:var(--navy)', text: TG.countdown(S.timers.paddock.endsAt), 'data-endsat': S.timers.paddock.endsAt }));
        box.appendChild(el('div.mini', { text: 'Kun mens timeren kører, kan staldene investere og vædde. Gå videre til løbet, når vinduet er lukket.' }));
      } else {
        box.appendChild(el('div.mini', { text: 'Paddocken er lukket — staldene kan ikke investere.' }));
      }
      // Odds-tavlens væddemål (v2.16)
      const bets = S.raceBets || [];
      if (bets.length) {
        const nameOf = (id) => (S.teams.find((t) => t.id === id) || {});
        box.appendChild(el('div.mini', { style: 'margin-top:6px', text: '🎫 ' + bets.map((b) => {
          const from = nameOf(b.bettorId).stableName || '?';
          const to = nameOf(b.targetTeamId);
          return `${from} → ${to.horseName || to.stableName} (${b.amount} DD · ${b.odds}x)`;
        }).join(' · ') }));
      }
    } else if (phase === 'race' || phase === 'final-race') {
      box.appendChild(raceControls());
    } else if (phase === 'final-ready') {
      box.appendChild(creativePanel());
      box.appendChild(btn('Giv alle Derby-licens', 'host:grantAllLicenses', {}, '.ghost'));
    } else if (phase === 'preseason' && kind === 'preseason-tasks') {
      // Punkt-for-punkt gennemgang (v2.14): fremhæv det du taler om — tablets/skærm følger med
      box.appendChild(el('p.mini', { text: 'Gennemgå ét punkt ad gangen — tablets og storskærm fremhæver det valgte. Tryk igen for at fjerne fremhævningen.' }));
      const off = (S.disabled && S.disabled.moneyTasks) || [];
      const steps = [['tip13', "1 · Tip en 13'er"], ['tidslinje', '2 · Tidslinjen'], ['mindpuzzle', '3 · Mind Puzzle'], ['dyst', '4 · Dysten'], ['stationer', '5 · Stationerne'], ['faste', '6 · De faste opgaver']]
        .filter(([k]) => k === 'faste' || k === 'stationer' || !off.includes(k));
      const row = el('div.row.wrap', { style: 'gap:6px' });
      steps.forEach(([k, l]) => {
        const active = S.preseasonFocus === k;
        const b = el('button.btn.sm' + (active ? '.gold' : '.ghost'), { text: l });
        b.addEventListener('click', () => TG.emit('host:setPreseasonFocus', { step: active ? null : k }).then(check));
        row.appendChild(b);
      });
      box.appendChild(row);
    } else if (phase === 'setup') {
      box.appendChild(el('p.mini', { text: 'Tablets viser setup-formularen. Ret evt. navne i hold-panelet →' }));
    } else {
      box.appendChild(el('p.mini', { text: 'Ingen særlige handlinger — brug Næste for at føre gæsterne gennem præsentationen.' }));
    }
    c.appendChild(box);
    return c;
  }

  function raceControls() {
    const race = S.race;
    const wrap = el('div.col');
    const type = S.slide.kind === 'final-race' ? 'final' : 'normal';
    const row = el('div.row.wrap');
    const b = (l, ev, p, cls) => { const x = el('button.btn' + (cls || ''), { text: l }); x.addEventListener('click', () => TG.emit(ev, p).then(check)); return x; };
    row.appendChild(b('Start løb', 'host:startRace', { type }, '.turf'));
    row.appendChild(b('Åbn rolling', 'host:openRolling', {}, '.gold'));
    row.appendChild(b('Luk rolling', 'host:closeRolling', {}));
    row.appendChild(b('Afslut løb & udbetal', 'host:finishRace', {}, '.burgundy'));
    wrap.appendChild(row);
    if (race) {
      wrap.appendChild(el('div.mini', { text: `Status: ${race.status} · rolling ${race.rollingOpen ? 'ÅBEN' : 'lukket'} · ${race.rollsPerTeam} slag` }));

      // Publikumsfavorit: engangsboost — brug det til drama eller til at hjælpe et hold bagud.
      const favRow = el('div.row.wrap', { style: 'margin-top:6px;align-items:center' });
      const favSel = el('select', { style: 'flex:1;min-width:140px' });
      favSel.appendChild(el('option', { value: '', text: 'Publikumsfavorit…' }));
      S.teams.filter((t) => t.joined).forEach((t) => { const o = el('option', { value: t.id, text: t.stableName }); if (race.favoriteTeamId === t.id) o.selected = true; favSel.appendChild(o); });
      const favBtn = el('button.btn.sm.gold', { text: '📣 Udpeg' });
      favBtn.addEventListener('click', () => TG.emit('host:setFavorite', { teamId: favSel.value || null }).then(check));
      favRow.appendChild(favSel); favRow.appendChild(favBtn);
      if (race.favoriteTeamId) favRow.appendChild(el('span.mini', { text: race.favoriteUsed ? '(boost brugt)' : '(boost klar)' }));
      wrap.appendChild(favRow);

      // Slag-status pr. hold + manuelt slag
      const man = el('div.row.wrap', { style: 'margin-top:6px' });
      S.teams.forEach((t) => {
        const prog = (race.progress || {})[t.id] || { used: 0, allowed: race.rollsPerTeam };
        const pos = race.positions[t.id] != null ? race.positions[t.id] : 0;
        const x = el('button.btn.sm.ghost', { text: `🎲 ${t.stableName} · ${prog.used}/${prog.allowed} slag · pos ${pos}` });
        x.addEventListener('click', () => TG.emit('host:rollFor', { teamId: t.id }).then(check));
        man.appendChild(x);
      });
      wrap.appendChild(el('details', { open: 'true' }, [el('summary', { text: 'Slag-status / slå manuelt' }), man]));

      // Seneste hændelser
      if (race.feed && race.feed.length) {
        const feed = el('div', { style: 'margin-top:6px' });
        race.feed.slice(-4).reverse().forEach((f) => feed.appendChild(el('div.mini', { text: f.text })));
        wrap.appendChild(feed);
      }
    }
    return wrap;
  }

  function bidTable() {
    const a = S.auction; if (!a || !a.bids || !a.bids.length) return el('div.mini', { text: 'Ingen bud endnu.' });
    const box = el('div', { style: 'margin-top:8px' });
    const byEx = {};
    a.bids.forEach((bid) => { (byEx[bid.exerciseId] = byEx[bid.exerciseId] || []).push(bid); });
    a.exercises.forEach((ex) => {
      const bids = (byEx[ex.id] || []).sort((x, y) => y.amount - x.amount);
      if (!bids.length) return;
      const row = el('div', { style: 'padding:4px 0;border-bottom:1px dashed var(--line)' });
      row.appendChild(el('b', { text: ex.name }));
      bids.forEach((bd) => row.appendChild(el('div.mini', { text: `  ${teamName(bd.teamId)}: ${sd(bd.amount)}` })));
      box.appendChild(row);
    });
    return box;
  }

  function creativePanel() {
    const c = el('div.col');
    c.appendChild(el('div.mini', { text: 'Kreativ showcase — giv bonus (staldværdi) pr. hold. Brug knapperne som niveauer: OK 300 · Flot 500 · Vildt 800.' }));
    const give = (t, amount) => TG.emit('host:creativeBonus', { teamId: t.id, taskId: 'creative', amount }).then((r) => { check(r); if (r.ok) toast(`${t.stableName}: +${money(amount)} SD bonus`, 'ok'); });
    S.teams.filter((t) => t.joined).forEach((t) => {
      const row = el('div.row', { style: 'gap:6px;align-items:center;flex-wrap:wrap' });
      row.appendChild(el('span', { style: 'flex:1;min-width:110px;font-size:13px', text: t.stableName }));
      [300, 500, 800].forEach((a) => { const b = el('button.btn.sm.ghost', { text: String(a) }); b.addEventListener('click', () => give(t, a)); row.appendChild(b); });
      const inp = el('input', { type: 'number', placeholder: 'SD', style: 'width:80px' });
      const b = el('button.btn.sm.gold', { text: 'Giv' }); b.addEventListener('click', () => give(t, Number(inp.value || 0)));
      row.appendChild(inp); row.appendChild(b); c.appendChild(row);
    });
    return c;
  }

  // ---------- RIGHT ----------
  function rightCol() {
    const col = el('div.col');
    col.appendChild(approvalsPanel());
    col.appendChild(teamsPanel());
    col.appendChild(tradesPanel());
    col.appendChild(changeCardsPanel());
    col.appendChild(exercisesPanel());
    col.appendChild(botPanel());
    col.appendChild(soundPanel());
    col.appendChild(gamesPanel());
    col.appendChild(toolsPanel());
    col.appendChild(logPanel());
    return col;
  }

  // ---------- MULTI-SPIL: opret nyt, se liste, skift ----------
  function gamesPanel() {
    const c = el('div.card.sec');
    const head = el('div.row.between');
    head.appendChild(el('h3', { text: 'Spil (' + (S ? S.code : '—') + ')' }));
    const newBtn = el('button.btn.sm.gold', { text: '➕ Nyt spil' });
    newBtn.addEventListener('click', () => { ui.creating = true; createForm(); });
    head.appendChild(newBtn);
    c.appendChild(head);
    c.appendChild(el('p.mini', { text: 'Kør flere events samme dag — hvert spil har sin egen kode. Skærm og tablets følger den kode, de er forbundet til.' }));
    const box = el('div');
    const load = el('button.btn.sm.ghost', { text: 'Vis alle spil på serveren' });
    load.addEventListener('click', () => TG.emit('host:listGames').then((r) => {
      if (!r.ok) return check(r);
      clear(box);
      if (!r.games.length) box.appendChild(el('p.mini', { text: 'Ingen aktive spil.' }));
      r.games.forEach((g) => {
        const row = el('div.row.between', { style: 'padding:5px 0;border-bottom:1px dashed var(--line);align-items:center;gap:6px' });
        row.appendChild(el('span.mini', { style: 'flex:1', html: `<b>${g.code}</b> · ${g.eventName}<br>${g.teamsJoined}/${g.numTeams} hold · fase: ${g.phase}${g.round ? ' · runde ' + g.round : ''}` }));
        if (S && g.code === S.code) row.appendChild(el('span.chip.turf', { text: 'Aktivt' }));
        else { const b = el('button.btn.sm', { text: 'Skift til' }); b.addEventListener('click', () => switchGame(g.code)); row.appendChild(b); }
        box.appendChild(row);
      });
    }));
    c.appendChild(load);
    c.appendChild(box);
    return c;
  }

  function switchGame(code) {
    TG.emit('join', { role: 'host', code }).then((r) => {
      if (!r.ok) return check(r);
      TG.save('tg_host_code', code);
      ui.expectCode = code;
      toast('Skiftet til spil ' + code, 'ok');
    });
  }

  function approvalsPanel() {
    const n = (S.pendingApprovals || []).length;
    const c = el('div.card.sec');
    if (n) c.style.cssText = 'border:2px solid var(--gold);box-shadow:0 0 0 3px rgba(201,162,39,.2)';
    c.appendChild(el('h3', { text: 'Godkendelser (' + n + ')' + (n ? ' ⚠️' : '') }));
    if (!n) { c.appendChild(el('p.mini', { text: 'Ingen ventende godkendelser.' })); return c; }
    S.pendingApprovals.forEach((p) => {
      const box = el('div.approve');
      box.appendChild(el('div', {}, [el('b', { text: p.stableName }), el('span', { text: ' — ' + (p.meta.exerciseName || taskLabel(p.taskId)) })]));
      if (p.kind === 'auction-performance') {
        const sel = el('select', { style: 'margin:6px 0' });
        ['pass', 'bronze', 'silver', 'gold'].forEach((l) => sel.appendChild(el('option', { value: l, text: l })));
        const ap = el('button.btn.sm.turf', { text: 'Godkend resultat' }); ap.addEventListener('click', () => TG.emit('host:approve', { teamId: p.teamId, taskId: p.taskId, approve: true, extra: { level: sel.value } }).then(check));
        const rj = el('button.btn.sm.ghost', { text: 'Afvis' }); rj.addEventListener('click', () => TG.emit('host:approve', { teamId: p.teamId, taskId: p.taskId, approve: false }));
        box.appendChild(el('div.row', {}, [sel, ap, rj]));
      } else {
        const ap = el('button.btn.sm.turf', { text: 'Godkend' }); ap.addEventListener('click', () => TG.emit('host:approve', { teamId: p.teamId, taskId: p.taskId, approve: true }).then(check));
        const rj = el('button.btn.sm.ghost', { text: 'Afvis' }); rj.addEventListener('click', () => TG.emit('host:approve', { teamId: p.teamId, taskId: p.taskId, approve: false }));
        box.appendChild(el('div.row', { style: 'margin-top:6px' }, [ap, rj]));
      }
      c.appendChild(box);
    });
    return c;
  }

  function teamsPanel() {
    const c = el('div.card.sec');
    const online = S.teams.filter((t) => t.joined && t.connected).length;
    const joined = S.teams.filter((t) => t.joined).length;
    c.appendChild(el('div.row.between', {}, [el('h3', { text: `Stalde (${joined})` }), el('span.mini', { text: `${online}/${joined} online` })]));
    S.teams.forEach((t) => {
      const line = el('div.teamline');
      const dot = el('span', { title: t.connected ? 'Online' : 'Offline', style: `width:10px;height:10px;border-radius:50%;flex:none;background:${t.joined ? (t.connected ? '#2E7D4F' : '#6F191E') : 'var(--line)'}` });
      line.appendChild(dot);
      line.appendChild(el('div.badge', { style: `background:${t.color.hex};width:28px;height:28px;font-size:14px`, text: String(t.teamNumber) }));
      const info = el('div', {}, [el('b', { text: t.stableName + (t.managerName ? ` · 👤 ${t.managerName}` : '') }), el('div.mini', { text: `${money(t.cash)} kontant · total ${money(t.totalValue)} · H${t.horseLevel}/J${t.jockeyLevel}${t.derbyLicense ? ' · 🎫' : ''}` })]);
      line.appendChild(info);
      line.appendChild(t.ready ? el('span.chip.turf', { text: 'Klar' }) : el('span.chip', { text: t.joined ? '—' : 'Ledig' }));
      const edit = el('button.btn.sm.ghost', { text: '✎' }); edit.addEventListener('click', () => editTeam(t)); line.appendChild(edit);
      c.appendChild(line);
    });
    return c;
  }

  function editTeam(t) {
    const name = prompt('Staldnavn', t.stableName); if (name == null) return;
    const cash = prompt('Kontanter (SD)', t.cash); if (cash == null) return;
    TG.emit('host:editTeam', { teamId: t.id, fields: { stableName: name, cash: Number(cash) } }).then(check);
  }

  function tradesPanel() {
    const c = el('div.card.sec');
    const active = (S.trades || []).filter((t) => t.status === 'pending');
    c.appendChild(el('h3', { text: 'Byttehandler (' + active.length + ' aktive)' }));
    if (!active.length) c.appendChild(el('p.mini', { text: 'Ingen aktive handler.' }));
    active.forEach((t) => {
      const row = el('div.row.between', { style: 'padding:5px 0;border-bottom:1px dashed var(--line)' });
      row.appendChild(el('span.mini', { text: `${t.fromStable} → ${t.toStable}: ${t.offeredName}↔${t.requestedName}${t.extraPayment ? ' +' + money(t.extraPayment) : ''}` }));
      const b = el('button.btn.sm.ghost', { text: 'Annullér' }); b.addEventListener('click', () => TG.emit('host:cancelTrade', { tradeId: t.id })); row.appendChild(b);
      c.appendChild(row);
    });
    return c;
  }

  // Forandringskort: uventede hændelser der træner forandringsparathed
  function changeCardsPanel() {
    const c = el('div.card.sec');
    const active = S.activeChangeCard;
    c.appendChild(el('h3', { text: '🃏 Forandringskort' + (active ? ' — AKTIVT' : '') }));
    c.appendChild(el('p.mini', { text: 'Spil et kort, når holdene skal rystes ud af planen — kortet afsløres dramatisk på storskærmen. AUTO-kort ændrer selv spillet; MANUEL-kort håndhæves af instruktørerne.' }));

    if (active) {
      const box = el('div', { style: 'background:var(--navy);color:var(--on-navy);border-radius:12px;padding:10px 12px;margin:8px 0' });
      box.appendChild(el('div', { style: 'font-weight:800;font-size:15px', text: `${active.emoji} ${active.title}` }));
      box.appendChild(el('div', { style: 'font-size:12px;opacity:.85;margin:4px 0 8px', text: active.text }));
      const end = el('button.btn.sm.gold', { text: 'Afslut kort (rul effekter tilbage)' });
      end.addEventListener('click', () => TG.emit('host:endChangeCard').then(check));
      box.appendChild(end);
      c.appendChild(box);
    }

    const det = el('details');
    det.appendChild(el('summary', { text: active ? 'Kortbunken (afslut det aktive kort først)' : 'Kortbunken — vælg og spil' }));
    const list = el('div.col', { style: 'margin-top:8px' });
    (S.changeCards || []).forEach((card) => {
      const row = el('div', { style: 'padding:7px 0;border-bottom:1px dashed var(--line)' });
      const top = el('div.row.between', { style: 'align-items:center' });
      top.appendChild(el('b', { text: `${card.emoji} ${card.title}` }));
      const right = el('div.row', { style: 'gap:6px;align-items:center' });
      right.appendChild(el('span.chip' + (card.manual ? '.gold' : '.turf'), { style: 'font-size:10px', text: card.manual ? 'MANUEL' : 'AUTO' }));
      const play = el('button.btn.sm', { text: 'Spil', disabled: active ? 'true' : null });
      play.addEventListener('click', () => TG.emit('host:playChangeCard', { cardId: card.id }).then(check));
      right.appendChild(play);
      top.appendChild(right);
      row.appendChild(top);
      row.appendChild(el('div.mini', { style: 'margin-top:2px', text: card.hostHint }));
      list.appendChild(row);
    });
    det.appendChild(list);
    c.appendChild(det);
    return c;
  }

  // Øvelses-oversigt: skjul øvelser/opgaver hvis grejet mangler, eller der er for få hold
  function exercisesPanel() {
    const c = el('div.card.sec');
    const offTasks = (S.disabled && S.disabled.moneyTasks) || [];
    const exercises = (S.auction && S.auction.exercises) || [];
    const hiddenCount = exercises.filter((e) => e.hidden).length + offTasks.length;
    c.appendChild(el('h3', { text: '🧰 Øvelser & opgaver' + (hiddenCount ? ` (${hiddenCount} skjult)` : '') }));
    c.appendChild(el('p.mini', { text: 'Skjul en øvelse, hvis grejet mangler, eller der er for få hold. Skjulte øvelser forsvinder fra auktion, auktionshus og tablets.' }));

    const catLabel = { money: 'Penge', jockey: 'Jockey', horse: 'Hest' };
    c.appendChild(el('p.mini', { style: 'margin-top:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase', text: 'Auktionsøvelser' }));
    exercises.forEach((ex) => {
      const row = el('div.row.between', { style: 'padding:5px 0;border-bottom:1px dashed var(--line);align-items:center' + (ex.hidden ? ';opacity:.55' : '') });
      const info = el('div', {}, [
        el('b', { text: ex.name + (ex.hidden ? ' · skjult' : '') }),
        el('div.mini', { text: catLabel[ex.category] || ex.category }),
      ]);
      row.appendChild(info);
      const right = el('div.row', { style: 'gap:6px;align-items:center' });
      if (ex.currentOwnerTeamId) right.appendChild(el('span.mini', { text: 'Ejer: ' + teamName(ex.currentOwnerTeamId) }));
      const b = el('button.btn.sm' + (ex.hidden ? '' : '.ghost'), { text: ex.hidden ? 'Vis igen' : 'Skjul', disabled: (!ex.hidden && ex.currentOwnerTeamId) ? 'true' : null, title: ex.currentOwnerTeamId ? 'Ejede øvelser kan ikke skjules' : '' });
      b.addEventListener('click', () => TG.emit('host:toggleExercise', { exerciseId: ex.id, hidden: !ex.hidden }).then(check));
      right.appendChild(b);
      row.appendChild(right);
      c.appendChild(row);
    });

    c.appendChild(el('p.mini', { style: 'margin-top:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase', text: 'Pengeopgaver på tabletten' }));
    [['tip13', 'Tip en 13\'er', 'Ren digital quiz'], ['tidslinje', 'Tidslinjen', 'Kræver de ophængte kort'], ['mindpuzzle', 'Mind Puzzle', 'Kræver spilleplader'], ['dyst', 'Dysten', 'Kræver mindst 2 aktive stalde']].forEach(([id, name, hint]) => {
      const hidden = offTasks.includes(id);
      const row = el('div.row.between', { style: 'padding:5px 0;border-bottom:1px dashed var(--line);align-items:center' + (hidden ? ';opacity:.55' : '') });
      row.appendChild(el('div', {}, [el('b', { text: name + (hidden ? ' · skjult' : '') }), el('div.mini', { text: hint })]));
      const b = el('button.btn.sm' + (hidden ? '' : '.ghost'), { text: hidden ? 'Vis igen' : 'Skjul' });
      b.addEventListener('click', () => TG.emit('host:toggleMoneyTask', { taskId: id, hidden: !hidden }).then(check));
      row.appendChild(b);
      c.appendChild(row);
    });
    return c;
  }

  // Lyd på storskærmen: musik-toggles + dansk TTS-speaker
  // Bot-styring (v2.13): skru op/ned for botternes tempo — live, midt i spillet.
  function botPanel() {
    const bots = (S.teams || []).filter((t) => t.isBot);
    if (!bots.length) return el('div');
    const c = el('div.card.sec');
    c.appendChild(el('h3', { text: '🤖 Bot-niveau' }));
    const cur = S.botFactor != null ? S.botFactor : 1;
    const row = el('div.row.wrap', { style: 'gap:6px' });
    [[0, 'Sluk'], [0.5, 'Svag'], [0.75, 'Rolig'], [1, 'Normal'], [1.25, 'Stærk']].forEach(([f, label]) => {
      const active = Math.abs(cur - f) < 0.01;
      const b = el('button.btn.sm' + (active ? '.gold' : '.ghost'), { text: label + ' (' + Math.round(f * 100) + '%)' });
      b.addEventListener('click', () => TG.emit('host:setBotLevel', { factor: f }).then(check));
      row.appendChild(b);
    });
    c.appendChild(row);
    c.appendChild(el('p.mini', { style: 'margin-top:6px', text: `Gælder ${bots.length} bot-stald${bots.length > 1 ? 'e' : ''}s indtjening i runderne — virker med det samme. Brug det til at sikre, at de rigtige spillere er med i toppen.` }));
    return c;
  }

  function soundPanel() {
    const c = el('div.card.sec');
    c.appendChild(el('h3', { text: '🔊 Lyd på storskærmen' }));
    const snd = S.sound || {};
    const defs = [
      ['roundMusic', 'Rundemusik', 'Stemningsmusik i runderne (kræver runde.mp3)'],
      ['raceMusic', 'Løbsmusik', 'Champagnegalop under løbene (kræver loeb.mp3)'],
      ['tts', 'Speaker', 'Dansk oplæsning af løbets highlights'],
    ];
    defs.forEach(([key, label, hint]) => {
      const on = !!snd[key];
      const row = el('div.row.between', { style: 'padding:6px 0;border-bottom:1px dashed var(--line);align-items:center' });
      row.appendChild(el('div', {}, [el('b', { text: label }), el('div.mini', { text: hint })]));
      const b = el('button.btn.sm' + (on ? '' : '.ghost'), { text: on ? 'Til' : 'Fra' });
      b.addEventListener('click', () => TG.emit('host:setSound', { [key]: !on }).then(check));
      row.appendChild(b);
      c.appendChild(row);
    });
    c.appendChild(el('p.mini', { style: 'margin-top:6px', text: 'Musikfiler lægges i public/assets/audio/ som runde.mp3 og loeb.mp3. Første gang skal der trykkes på lyd-knappen på selve storskærmen.' }));
    return c;
  }

  function toolsPanel() {
    const c = el('div.card.sec');
    c.appendChild(el('details', {}, [el('summary', { text: '🔧 Test- og debugværktøjer' })]));
    const det = c.querySelector('details');
    const body = el('div.col', { style: 'margin-top:8px' });
    const b = (l, fn, cls) => { const x = el('button.btn.sm' + (cls || '.ghost'), { text: l }); x.addEventListener('click', fn); return x; };
    const row1 = el('div.row.wrap');
    row1.appendChild(b('Opret fake-hold', () => TG.emit('host:fakeTeams').then(check)));
    row1.appendChild(b('+1.000 SD til alle', () => TG.emit('host:addMoneyAll', { amount: 1000 }).then(check)));
    row1.appendChild(b('Giv alle licens', () => TG.emit('host:grantAllLicenses').then(check)));
    row1.appendChild(b('Simulér løb', () => TG.emit('host:simulateRace').then(check)));
    body.appendChild(row1);
    const row2 = el('div.row.wrap');
    row2.appendChild(b('Eksportér JSON', () => TG.emit('host:export').then((r) => { if (r.ok) { const blob = new Blob([r.json], { type: 'application/json' }); const a = el('a', { href: URL.createObjectURL(blob), download: 'team-galoppen-' + S.code + '.json' }); a.click(); } })));
    row2.appendChild(b('Nulstil spil', () => { if (confirm('Nulstil hele spillet?')) TG.emit('host:reset').then(check); }, '.red'));
    body.appendChild(row2);
    const qr = el('div.center', { style: 'margin-top:10px' }); qr.appendChild(el('img', { src: '/qr.png?data=' + encodeURIComponent(ORIGIN + '/team'), style: 'width:130px' })); qr.appendChild(el('div.mini', { text: 'Tablet-join QR' }));
    body.appendChild(qr);
    det.appendChild(body);
    return c;
  }

  function logPanel() {
    const c = el('div.card.sec');
    c.appendChild(el('h3', { text: 'Log' }));
    const log = el('div.log');
    (S.log || []).forEach((l) => log.appendChild(el('div', { text: l.message })));
    c.appendChild(log);
    return c;
  }

  function teamName(id) { const t = S.teams.find((x) => x.id === id); return t ? t.stableName : '—'; }
  function taskLabel(id) { return ({ puzzle: 'Puslespil', horseStyling: 'Pynt hest', stableSign: 'Staldskilt' })[id] || id; }

  setInterval(() => { document.querySelectorAll('[data-endsat]').forEach((n) => { n.textContent = TG.countdown(Number(n.getAttribute('data-endsat'))); }); }, 500);
})();
