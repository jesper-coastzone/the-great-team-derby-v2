/* screen.js — den indbyggede præsentation. Renderer den aktuelle slide styret af host. */
(function () {
  const { el, clear, sd, money } = TG;
  const root = document.getElementById('root');
  let S = null; const base = location.origin;

  // join
  const q = new URLSearchParams(location.search);
  const code = q.get('code') || TG.load('tg_screen_code');
  if (code) TG.join('screen', { code: code.toUpperCase() }).then((r) => { if (r.ok) TG.save('tg_screen_code', r.code); else askCode(); });
  else askCode();

  function askCode() {
    clear(root);
    const w = el('div.stage'); const c = el('div.content.center');
    c.appendChild(el('div.eyebrow', { text: 'Storskærm' }));
    c.appendChild(el('h1', { text: 'Indtast spilkode' }));
    const inp = el('input', { type: 'text', style: 'max-width:400px;text-align:center;font-size:2vw;letter-spacing:6px;text-transform:uppercase;margin:2vh auto' });
    const b = el('button.btn.lg', { text: 'Forbind' });
    b.addEventListener('click', () => TG.join('screen', { code: inp.value.trim().toUpperCase() }).then((r) => { if (r.ok) TG.save('tg_screen_code', r.code); else TG.toast(r.error, 'err'); }));
    c.appendChild(inp); c.appendChild(b); w.appendChild(c); root.appendChild(w);
  }

  TG.onState((st) => { S = st; render(); });

  function render() {
    if (!S) return;
    // Løbs-slides opdateres in-place, så hestene glider i stedet for at hoppe.
    if (['warmup-race', 'race', 'final-race'].includes(S.slide.kind) && S.race && !S.screenMessageOverride) {
      const existing = document.getElementById('raceStage');
      if (existing && existing.getAttribute('data-race-id') === S.race.id) { updateRace(); return; }
    }
    clear(root);
    const stage = el('div.stage');
    stage.appendChild(el('div.corner-motif', { html: TG.motif.horse('#C9A227') }));
    stage.appendChild(brandbar());
    const content = el('div.content');
    content.appendChild(slideContent());
    stage.appendChild(content);
    root.appendChild(stage);
    if (document.getElementById('raceStage')) updateRace();
  }

  function brandbar() {
    const b = el('div.brandbar');
    const star = el('div', { style: 'width:2.6vw;height:2.6vw', html: TG.motif.compass('#C9A227') });
    b.appendChild(star);
    b.appendChild(el('div.eyebrow', { text: S.eventName + ' · CoastZone' }));
    const showCode = ['intro-coastzone', 'program', 'derby-intro', 'stable-setup', 'ready-check'].includes(S.slide.kind);
    if (showCode) b.appendChild(el('div.code', {}, [el('div.lbl', { text: 'Spilkode' }), el('div.val', { text: S.code })]));
    return b;
  }

  function slideContent() {
    if (S.screenMessageOverride) return el('div.center', {}, [el('h1', { text: S.screenMessageOverride })]);
    switch (S.slide.kind) {
      case 'intro-coastzone': return intro();
      case 'program': return program();
      case 'derby-intro': return derbyIntro();
      case 'how-to-win': return howToWin();
      case 'game-flow': return gameFlow();
      case 'stable-setup': return stableSetup();
      case 'ready-check': return readyCheck();
      case 'pre-season': return preseason();
      case 'warmup-race': return raceTrack('Warm-up løb');
      case 'auction': return auction();
      case 'round': return round();
      case 'race': return raceTrack(S.slide.screenTitle);
      case 'leaderboard': return leaderboard('Stilling');
      case 'derby-readiness': return readiness();
      case 'final-race': return raceTrack('The Great Team Derby');
      case 'final-reveal': return reveal();
      case 'debrief': return debrief();
      default: return el('div', {}, [el('h1', { text: S.slide.screenTitle })]);
    }
  }

  // ---- intro slides ----
  function intro() {
    const c = el('div');
    c.appendChild(el('div.eyebrow', { text: 'Velkommen til' }));
    c.appendChild(el('h1', { text: 'CoastZone' }));
    c.appendChild(el('p.lead', { text: 'Vi skaber teamoplevelser der bliver husket. I dag går vi på banen til The Great Team Derby.' }));
    return c;
  }
  function derbyIntro() {
    const row = el('div', { style: 'display:flex;align-items:center;gap:3vw' });
    const c = el('div', { style: 'flex:1' });
    c.appendChild(el('div.eyebrow', { text: 'Dagens dyst' }));
    c.appendChild(el('h1', { text: 'The Great Team Derby' }));
    c.appendChild(el('p.lead', { text: 'Samarbejde, strategi, investeringer og performance. Byg jeres stald — og gør den mest værdifuld.' }));
    row.appendChild(c);
    row.appendChild(TG.assetImg('hest-og-jockey', { style: 'width:34vw;max-height:58vh' }));
    return row;
  }
  function program() {
    const c = el('div');
    c.appendChild(el('h1', { text: 'Dagens program', style: 'font-size:4.5vw' }));
    const list = el('div', { style: 'margin-top:2vh' });
    (S.programItems || []).forEach((p, i) => { const row = el('div.row', { style: 'font-size:2vw;padding:.8vh 0;border-bottom:1px solid var(--line)' }, [el('span.num', { style: 'color:var(--gold);width:2.5vw', text: String(i + 1) }), el('span', { text: p })]); list.appendChild(row); });
    c.appendChild(list);
    return c;
  }
  function howToWin() {
    const c = el('div');
    c.appendChild(el('h1', { text: 'Sådan vinder I', style: 'font-size:5vw' }));
    const steps = ['Løs opgaver og tjen Staldollars', 'Vind løb og få præmiepenge', 'Investér i hest, jockey og stald', 'Byt og træf skarpe beslutninger'];
    const list = el('div', { style: 'margin-top:1vh' });
    steps.forEach((s, i) => list.appendChild(el('div.row', { style: 'font-size:2vw;padding:.6vh 0' }, [el('span.num', { style: 'color:var(--gold);width:2.5vw', text: String(i + 1) }), el('span', { text: s })])));
    c.appendChild(list);
    c.appendChild(el('p.lead', { style: 'margin-top:2vh', html: 'Den mest værdifulde stald vinder — <b>ikke</b> nødvendigvis vinderen af finaleløbet.' }));
    return c;
  }
  function gameFlow() {
    const c = el('div');
    c.appendChild(el('h1', { text: 'Spillets gang', style: 'font-size:5vw' }));
    const steps = ['Pre-season', 'Warm-up', 'Auktion', 'Runde', 'Løb', 'Stilling', 'Finale', 'Afsløring'];
    const flow = el('div.flow');
    steps.forEach((s, i) => { flow.appendChild(el('div.step', { text: s })); if (i < steps.length - 1) flow.appendChild(el('div.arrow', { text: '→' })); });
    c.appendChild(flow);
    return c;
  }
  function preseason() {
    if (window.__psTourTimer) { clearInterval(window.__psTourTimer); window.__psTourTimer = null; }
    const PS_CSS = '.ps-wrap{display:flex;gap:2vw;align-items:stretch}.ps-board{flex:1.3;display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:1fr;gap:1vw;background:linear-gradient(160deg,#2b5d40,#1c4a30);border-radius:20px;padding:1.4vw;border:3px solid #163d29;box-shadow:var(--shadow-lg)}.ps-tile{cursor:pointer;background:var(--cream);border-radius:14px;padding:1.1vw 1.2vw;display:flex;flex-direction:column;gap:.3vw;justify-content:center;opacity:.5;transition:transform .45s cubic-bezier(.2,.9,.3,1),box-shadow .45s,opacity .45s}.ps-tile .n{font-size:.85vw;letter-spacing:2px;text-transform:uppercase;color:var(--burgundy);font-weight:700}.ps-tile .t{font-family:var(--font-display);font-weight:800;font-size:1.5vw;color:var(--navy);line-height:1.05}.ps-tile.active{opacity:1;transform:scale(1.05);box-shadow:0 0 0 4px var(--gold),0 14px 34px rgba(0,0,0,.32)}.ps-panel{flex:1;background:var(--navy);color:var(--on-navy);border-radius:20px;padding:2vw;display:flex;flex-direction:column;justify-content:center;box-shadow:var(--shadow-lg)}.ps-panel .pe{font-size:1vw;letter-spacing:3px;text-transform:uppercase;color:var(--gold-soft);font-weight:700;margin-bottom:1vh}.ps-panel .pt{font-family:var(--font-display);font-size:2.8vw;line-height:1.05;margin-bottom:1.4vh}.ps-panel .pd{font-size:1.5vw;line-height:1.5;opacity:.93}.ps-dots{display:flex;gap:.6vw;margin-top:2.4vh}.ps-dots i{width:.9vw;height:.9vw;border-radius:50%;background:rgba(255,255,255,.28);transition:background .3s}.ps-dots i.on{background:var(--gold)}';
    const stations = [
      { n: 'Din base', t: 'Stalden', color: '#1F3E63', icon: TG.assetTag('hest-silhuet'), eyebrow: 'Station 1 · Stalden', desc: 'Her bor jeres hest og jockey. Giv dem navne, og gør stalden klar til sæsonen.' },
      { n: 'Hver runde', t: 'Auktionshuset', color: '#6E1F2E', icon: TG.assetTag('hammer-auktion'), eyebrow: 'Station 2 · Auktion', desc: 'I byder på 7 special-øvelser. I kan kun eje én ad gangen — men den kan sælges videre med gevinst.' },
      { n: 'Tjen penge', t: 'Opgaverne', color: '#C9A227', icon: TG.assetTag('puslespil-opgaver'), eyebrow: 'Station 3 · Opgaver', desc: 'Tip en 13-er, Tidslinje og Dyst giver Staldollars. Byg puslespillet og få jeres Derby-licens.' },
      { n: 'Bliv stærkere', t: 'Investering', color: '#2D4A3D', icon: TG.assetTag('diagram-investering'), eyebrow: 'Station 4 · Investering', desc: 'Køb op i hest (fart), jockey (stabilitet) eller stald (sikker værdi). Hesten løfter terningens top, jockeyen dens bund.' },
      { n: 'Payoff', t: 'Væddeløbsbanen', color: '#B83232', icon: TG.assetTag('maalflag'), eyebrow: 'Station 5 · Løb', desc: 'Efter hver runde er der løb. I slår terninger — den bedste hest på banen vinder præmiepenge.' },
      { n: 'Sådan vinder I', t: 'Staldværdien', color: '#C9A227', icon: TG.assetTag('pokal'), eyebrow: 'Station 6 · Vinderen', desc: 'Den mest værdifulde stald vinder til sidst: kontanter + hest + jockey + stald. Ikke nødvendigvis løbsvinderen!' },
    ];
    const wrap = el('div');
    wrap.appendChild(el('style', { html: PS_CSS }));
    wrap.appendChild(el('div.eyebrow', { text: 'Pre-season · rundtur' }));
    wrap.appendChild(el('h2', { text: 'Sådan spiller I', style: 'margin-bottom:2vh' }));
    const row = el('div.ps-wrap');
    const board = el('div.ps-board#psBoard');
    stations.forEach((s, i) => {
      const tile = el('div.ps-tile', { 'data-ps': String(i) }, [
        el('div', { style: 'width:3vw;height:3vw', html: s.icon }),
        el('div.n', { text: s.n }),
        el('div.t', { text: s.t }),
      ]);
      tile.style.borderTop = '6px solid ' + s.color;
      tile.addEventListener('click', () => setPsStep(i));
      board.appendChild(tile);
    });
    const panel = el('div.ps-panel');
    panel.appendChild(el('div.pe#psEye'));
    panel.appendChild(el('div.pt#psTitle'));
    panel.appendChild(el('div.pd#psDesc'));
    const dots = el('div.ps-dots#psDots');
    stations.forEach(() => dots.appendChild(el('i')));
    panel.appendChild(dots);
    row.appendChild(board); row.appendChild(panel);
    wrap.appendChild(row);
    window.__psStations = stations; window.__psStep = 0;
    setTimeout(() => setPsStep(0), 0);
    window.__psTourTimer = setInterval(() => {
      if (!document.getElementById('psBoard')) { clearInterval(window.__psTourTimer); window.__psTourTimer = null; return; }
      setPsStep((window.__psStep + 1) % stations.length);
    }, 4200);
    return wrap;
  }

  function setPsStep(i) {
    const stations = window.__psStations; if (!stations) return;
    window.__psStep = i;
    document.querySelectorAll('.ps-tile').forEach((n) => n.classList.toggle('active', Number(n.getAttribute('data-ps')) === i));
    const s = stations[i];
    const eye = document.getElementById('psEye'); const ti = document.getElementById('psTitle'); const de = document.getElementById('psDesc');
    if (eye) eye.textContent = s.eyebrow; if (ti) ti.textContent = s.t; if (de) de.textContent = s.desc;
    document.querySelectorAll('#psDots i').forEach((d, di) => d.classList.toggle('on', di === i));
  }

  function hammerSvg() { return '<svg viewBox="0 0 64 64" width="100%" height="100%"><rect x="8" y="44" width="48" height="7" rx="2" fill="#6E1F2E"/><rect x="30" y="12" width="9" height="26" rx="3" transform="rotate(40 34 25)" fill="#6E1F2E"/><rect x="18" y="18" width="22" height="10" rx="3" transform="rotate(40 29 23)" fill="#B83232"/></svg>'; }
  function puzzleSvg() { return '<svg viewBox="0 0 64 64" width="100%" height="100%"><rect x="12" y="12" width="18" height="18" rx="3" fill="#C9A227"/><rect x="34" y="12" width="18" height="18" rx="3" fill="#1F3E63"/><rect x="12" y="34" width="18" height="18" rx="3" fill="#1F3E63"/><rect x="34" y="34" width="18" height="18" rx="3" fill="#C9A227"/></svg>'; }
  function chartSvg() { return '<svg viewBox="0 0 64 64" width="100%" height="100%"><rect x="12" y="34" width="9" height="18" rx="2" fill="#2D4A3D"/><rect x="27" y="24" width="9" height="28" rx="2" fill="#2D4A3D"/><rect x="42" y="14" width="9" height="38" rx="2" fill="#2D4A3D"/></svg>'; }
  function flagSvg() { return '<svg viewBox="0 0 64 64" width="100%" height="100%"><rect x="14" y="10" width="4" height="44" fill="#1F3E63"/><path d="M18 12 h30 v20 h-30 z" fill="#1F3E63"/><path d="M18 12 h10 v10 h-10 z M38 12 h10 v10 h-10 z M28 22 h10 v10 h-10 z" fill="#FAF6EA"/></svg>'; }

  // ---- setup / ready ----
  function stableSetup() {
    const c = el('div');
    c.appendChild(el('h2', { text: 'Skab jeres stald' }));
    const row = el('div.row', { style: 'gap:2vw;align-items:flex-start;margin-top:1vh' });
    const grid = el('div.teamgrid', { style: 'flex:1' });
    S.teams.forEach((t) => grid.appendChild(teamCard(t)));
    row.appendChild(grid);
    const qr = el('div.qr.center'); qr.appendChild(el('img', { src: '/qr.png?data=' + encodeURIComponent(base + '/team') })); qr.appendChild(el('div', { style: 'font-weight:700;margin-top:.5vw;font-size:1vw', text: 'Scan for at tilslutte' }));
    row.appendChild(qr);
    c.appendChild(row);
    return c;
  }
  function teamCard(t) {
    const card = el('div.teamcard');
    card.appendChild(el('div.badge', { style: `background:${t.color.hex}`, text: String(t.teamNumber) }));
    const info = el('div', { style: 'flex:1' });
    info.appendChild(el('div.tn', { text: t.joined ? t.stableName : 'Ledig plads' }));
    info.appendChild(el('div.sub', { text: t.joined ? (t.horseName || '—') + ' · ' + (t.jockeyName || '—') : 'Venter på tablet' }));
    card.appendChild(info);
    if (t.ready) card.appendChild(el('span.chip.turf', { text: '✓ Klar' }));
    return card;
  }
  function readyCheck() {
    const c = el('div');
    const ready = S.teams.filter((t) => t.ready).length; const joined = S.teams.filter((t) => t.joined).length;
    c.appendChild(el('h2', { text: `Er alle stalde klar? (${ready}/${joined})` }));
    const grid = el('div.teamgrid', { style: 'margin-top:1vh' });
    S.teams.filter((t) => t.joined).forEach((t) => grid.appendChild(teamCard(t)));
    c.appendChild(grid);
    return c;
  }

  // ---- auction ----
  function auction() {
    const a = S.auction; const c = el('div');
    const cd = a.endsAt ? TG.countdown(a.endsAt) : '';
    c.appendChild(el('div.row.between', {}, [el('h2', { text: a.status === 'resolved' ? 'Auktionen er afgjort' : a.status === 'closed' ? 'Auktionen er lukket' : 'Auktionen er åben' }), cd ? el('div.big-num', { style: 'font-size:4vw', text: cd, 'data-endsat': a.endsAt }) : null]));
    if (a.status === 'resolved') {
      const list = el('div', { style: 'margin-top:1vh' });
      (a.results || []).forEach((r) => list.appendChild(el('div.reveal-row', {}, [el('span.num', { text: '' }), el('span', { text: r.stableName + ' → ' + r.exerciseName }), el('span.num', { text: sd(r.amount) })])));
      c.appendChild(list); return c;
    }
    const topByEx = {}; (a.topBids || []).forEach((b) => { topByEx[b.exerciseId] = b; });
    const grid = el('div.teamgrid', { style: 'grid-template-columns:repeat(4,1fr);margin-top:1vh' });
    a.exercises.forEach((ex) => {
      const card = el('div.card', { style: 'display:flex;flex-direction:column;gap:.4vw' });
      card.appendChild(el('div.cat ' + ex.category, { style: 'font-size:1.1vw;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--gold)', text: ex.name }));
      card.appendChild(el('div', { style: 'font-size:.95vw;color:var(--text-dim);min-height:2.6vw', text: ex.short }));
      const top = topByEx[ex.id];
      const bidBox = el('div', { style: 'margin-top:auto;padding-top:.4vw;border-top:1px solid var(--line)' });
      if (top) {
        bidBox.appendChild(el('div', { style: 'font-size:.8vw;letter-spacing:1px;text-transform:uppercase;color:var(--text-faint)', text: 'Højeste bud' }));
        bidBox.appendChild(el('div.big-num', { style: 'font-size:2.4vw;color:var(--burgundy);line-height:1.1', text: sd(top.amount) }));
        bidBox.appendChild(el('div.row', { style: 'align-items:center;gap:.5vw;font-size:1.1vw;font-weight:700' }, [
          el('span', { style: `display:inline-block;width:1vw;height:1vw;border-radius:50%;background:${teamColor(top.teamId)}` }),
          el('span', { text: teamName(top.teamId) }),
        ]));
      } else {
        bidBox.appendChild(el('div', { style: 'font-size:1.1vw;color:var(--text-faint);font-style:italic', text: 'Ingen bud endnu' }));
      }
      card.appendChild(bidBox);
      if (ex.currentOwnerTeamId) card.appendChild(el('span.chip', { style: 'align-self:flex-start;font-size:.8vw', text: 'Ejer nu: ' + teamName(ex.currentOwnerTeamId) }));
      grid.appendChild(card);
    });
    c.appendChild(grid);
    return c;
  }

  // ---- round ----
  function round() {
    const c = el('div');
    const t = S.timers && S.timers.round ? TG.countdown(S.timers.round.endsAt) : null;
    c.appendChild(el('div.row.between', {}, [el('h1', { text: S.slide.screenTitle, style: 'font-size:5vw' }), t ? el('div.big-num', { text: t, 'data-endsat': S.timers.round.endsAt }) : null]));
    c.appendChild(el('p.lead', { text: 'Løs opgaver, byt øvelser, investér — og gør jer klar til løbet.' }));
    c.appendChild(miniLeaderboard());
    return c;
  }
  function miniLeaderboard() {
    const box = el('div', { style: 'margin-top:2vh' });
    (S.ranking || []).slice(0, 5).forEach((r) => box.appendChild(el('div.row.between', { style: 'font-size:1.6vw;padding:.5vh 0;border-bottom:1px solid var(--line)' }, [el('span', { html: `<b>${r.place}.</b> ${r.stableName}` }), el('span.num', { text: sd(r.totalValue) })])));
    return box;
  }

  // ---- race track (v2: levende løb med feed, events og konfetti) ----
  function raceTrack(title) {
    const race = S.race;
    const c = el('div', { style: 'display:flex;flex-direction:column;height:100%' });
    if (!race) { c.appendChild(el('h2', { text: title })); c.appendChild(el('p.lead', { text: 'Klargør løb…' })); return c; }
    c.id = 'raceStage';
    c.setAttribute('data-race-id', race.id);
    c.appendChild(el('div.row.between', {}, [el('h2', { text: title }), el('span.chip#raceChip', { text: '' })]));
    const marks = [5, 10, 15, 20, 25];
    const trackWrap = el('div.track-wrap');
    const dist = el('div.dist-row');
    marks.forEach((m) => dist.appendChild(el('span', { style: `left:${pctFor(m, race.trackLength)}%`, text: String(m) })));
    trackWrap.appendChild(dist);
    const track = el('div.track');
    S.teams.forEach((t) => {
      const lane = el('div.lane', { 'data-lane': t.id });
      marks.forEach((m) => lane.appendChild(el('div.marker', { style: `left:${pctFor(m, race.trackLength)}%` })));
      lane.appendChild(el('div.tag', { text: laneLabel(t) }));
      const dots = el('div.dots');
      const prog = (race.progress || {})[t.id] || { used: 0, allowed: race.rollsPerTeam };
      for (let i = 0; i < prog.allowed; i++) dots.appendChild(el('i'));
      lane.appendChild(dots);
      lane.appendChild(el('div.finish'));
      lane.appendChild(el('div.roll-bubble'));
      const horse = el('div.horse');
      const sil = TG.tintedAsset('hest-markoer-silhuet', t.color.hex, { style: 'width:100%;height:100%' });
      sil.classList.add('silhouette');
      horse.appendChild(sil);
      lane.appendChild(horse);
      track.appendChild(lane);
    });
    trackWrap.appendChild(track);
    const portal = el('div.goal-portal');
    portal.appendChild(el('div.beam'));
    portal.appendChild(el('div.sign', { text: 'MÅL' }));
    trackWrap.appendChild(portal);
    c.appendChild(trackWrap);
    c.appendChild(el('div.feedbar#raceFeed'));
    c.appendChild(el('div#racePodium', { style: 'min-height:5vh' }));
    c.appendChild(el('div.race-banner#raceBanner'));
    return c;
  }

  function laneLabel(t) {
    const fav = S.race && S.race.favoriteTeamId === t.id ? ' 📣' : '';
    return t.stableName + fav;
  }

  function pctFor(pos, trackLength) {
    return Math.min(93, (pos / trackLength) * 92) + 1;
  }

  function updateRace() {
    const race = S.race; if (!race) return;
    const chip = document.getElementById('raceChip');
    if (chip) {
      chip.className = 'chip' + (race.rollingOpen ? ' turf' : '');
      chip.id = 'raceChip';
      chip.textContent = race.rollingOpen ? 'Løbet er i gang!' : (race.status === 'finished' ? 'Afsluttet' : 'Afventer start');
    }
    S.teams.forEach((t) => {
      const lane = document.querySelector(`[data-lane="${t.id}"]`); if (!lane) return;
      const pos = race.positions[t.id] || 0;
      const pct = pctFor(pos, race.trackLength);
      const horse = lane.querySelector('.horse');
      const bubble = lane.querySelector('.roll-bubble');
      if (horse) horse.style.left = pct + '%';
      lane.classList.toggle('galloping', !!race.rollingOpen && race.status !== 'finished');
      const tag = lane.querySelector('.tag'); if (tag) tag.textContent = laneLabel(t);
      const prog = (race.progress || {})[t.id];
      if (prog) lane.querySelectorAll('.dots i').forEach((d, i) => d.classList.toggle('used', i < prog.used));
      const lastRoll = t.race && t.race.lastRoll;
      if (bubble) {
        bubble.style.left = pct + '%';
        if (lastRoll) { bubble.textContent = '+' + lastRoll; bubble.classList.add('show'); }
        else bubble.classList.remove('show');
      }
    });
    // feed (nyeste øverst)
    const feedEl = document.getElementById('raceFeed');
    const feed = race.feed || [];
    if (feedEl) {
      feedEl.innerHTML = '';
      feed.slice(-4).reverse().forEach((f) => feedEl.appendChild(el('div.fe', { text: f.text })));
      if (!feed.length) feedEl.appendChild(el('div.fe', { text: 'Hestene står klar i boksene…' }));
    }
    // banner ved nye events
    const key = race.id + ':' + feed.length;
    if (window.__raceFeedKey !== key) {
      window.__raceFeedKey = key;
      const last = feed[feed.length - 1];
      if (last && (last.kind === 'event' || last.kind === 'favorite' || last.kind === 'finish')) showBanner(bannerText(last));
    }
    // resultater + konfetti
    const podium = document.getElementById('racePodium');
    if (podium) {
      podium.innerHTML = '';
      if (race.results && race.results.length) {
        const row = el('div.row', { style: 'gap:1.4vw;margin-top:1vh;justify-content:center' });
        race.results.slice(0, 3).forEach((r) => row.appendChild(el('div.chip.gold', { style: 'font-size:1.4vw;padding:.6vw 1.2vw', text: `${r.place}. ${r.stableName}${r.deadHeat ? ' (dødt løb)' : ''} · +${money(r.prize)} SD` })));
        podium.appendChild(row);
        if (window.__confettiRace !== race.id) { window.__confettiRace = race.id; confetti(); }
      }
    }
  }

  function bannerText(f) {
    if (f.kind === 'finish') return f.text;
    if (f.kind === 'favorite') return '📣 Publikumsfavorit: ' + f.stableName + '!';
    if (f.event) return `${f.event.emoji || ''} ${f.event.label}! ${f.stableName} ${f.event.effect > 0 ? '+' : ''}${f.event.effect}`;
    return f.text;
  }

  let bannerTimer = null;
  function showBanner(text) {
    const b = document.getElementById('raceBanner'); if (!b) return;
    b.textContent = text;
    b.classList.add('show');
    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => b.classList.remove('show'), 2600);
  }

  function confetti() {
    const colors = ['#C9A227', '#6E1F2E', '#1F3E63', '#2D4A3D', '#B83232', '#FAF6EA'];
    for (let i = 0; i < 90; i++) {
      const p = el('div.confetti');
      const size = 6 + Math.random() * 9;
      p.style.cssText += `left:${Math.random() * 100}vw;width:${size}px;height:${size * 0.45}px;background:${colors[i % colors.length]};animation-duration:${2.4 + Math.random() * 2.4}s;animation-delay:${Math.random() * 1.4}s;border-radius:2px;`;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 7000);
    }
  }

  // ---- leaderboard ----
  function leaderboard(title) {
    const c = el('div');
    c.appendChild(el('h1', { text: title, style: 'font-size:5vw' }));
    const box = el('div', { style: 'margin-top:1vh' });
    (S.ranking || []).forEach((r) => {
      box.appendChild(el('div.lb-row', {}, [
        el('div.badge', { style: `background:${r.color.hex}`, text: String(r.place) }),
        el('span', { text: r.stableName }),
        el('span.num', { text: sd(r.totalValue) }),
      ]));
    });
    c.appendChild(box);
    return c;
  }

  // ---- readiness ----
  function readiness() {
    const c = el('div');
    c.appendChild(el('h2', { text: 'Klar til The Great Team Derby' }));
    const grid = el('div.teamgrid', { style: 'margin-top:1vh' });
    S.teams.filter((t) => t.joined).forEach((t) => {
      const card = el('div.teamcard');
      card.appendChild(el('div.badge', { style: `background:${t.color.hex}`, text: String(t.teamNumber) }));
      card.appendChild(el('div', { style: 'flex:1' }, [el('div.tn', { text: t.stableName }), el('div.sub', { text: 'Total ' + sd(t.totalValue) })]));
      card.appendChild(t.derbyLicense ? el('span.chip.turf', { text: '✓ Licens' }) : el('span.chip.red', { text: 'Ingen licens' }));
      grid.appendChild(card);
    });
    c.appendChild(grid);
    return c;
  }

  // ---- final reveal (v2: guld-spotlight + konfetti) ----
  function reveal() {
    const winner = (S.ranking || [])[0];
    const c = el('div.winner-hero');
    if (!winner) return el('h1', { text: 'Afsløring' });
    const spot = el('div.spotlight');
    const horse = TG.tintedAsset('hest-silhuet', winner.color ? winner.color.hex : '#6E1F2E', { style: 'width:100%;height:100%' });
    const hw = el('div.heroH'); hw.appendChild(horse); spot.appendChild(hw);
    const pk = el('div.pokal'); pk.appendChild(TG.assetImg('pokal', { style: 'width:100%;height:100%' })); spot.appendChild(pk);
    c.appendChild(spot);
    c.appendChild(el('div.eyebrow', { text: 'Vinderen af The Great Team Derby' }));
    c.appendChild(el('h1', { text: winner.stableName, style: 'font-size:6vw' }));
    c.appendChild(el('div.big-num', { text: sd(winner.totalValue), style: 'margin:1vh 0;font-size:6vw' }));
    const bd = el('div.row', { style: 'justify-content:center;gap:1.4vw;margin-top:1vh' });
    [['Kontant', winner.cash], ['Hest', winner.horseValue], ['Jockey', winner.jockeyValue], ['Stald', winner.stableValue]].forEach(([k, v]) => bd.appendChild(el('div.chip', { style: 'font-size:1.4vw;padding:.6vw 1.2vw', text: `${k}: ${money(v)}` })));
    c.appendChild(bd);
    if (window.__confettiReveal !== S.code) { window.__confettiReveal = S.code; setTimeout(confetti, 400); }
    return c;
  }

  // ---- debrief (refleksion med auto-data) ----
  function debrief() {
    const c = el('div');
    c.appendChild(el('div.eyebrow', { text: 'Debrief' }));
    c.appendChild(el('h2', { text: 'Hvad skete der egentlig?' }));
    const stats = S.debrief || [];
    const grid = el('div', { style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(18vw,1fr));gap:1vw;margin-top:1.5vh' });
    stats.forEach((s) => {
      const card = el('div.card', { style: 'padding:1vw' });
      card.appendChild(el('div.row', { style: 'align-items:center;gap:.6vw;margin-bottom:.6vh' }, [
        el('span', { style: `display:inline-block;width:1.2vw;height:1.2vw;border-radius:50%;background:${s.color.hex}` }),
        el('b', { style: 'font-size:1.3vw', text: s.stableName }),
      ]));
      [['Højeste bud', s.biggestBid], ['Byttehandler', s.trades], ['Investeret', s.invested], ['Tjent på opgaver', s.earnedTasks], ['Løbspræmier', s.racePrizes]].forEach(([k, v]) => {
        card.appendChild(el('div.row.between', { style: 'font-size:1vw;padding:.25vh 0;border-bottom:1px dashed var(--line)' }, [el('span', { style: 'color:var(--text-dim)', text: k }), el('span.num', { text: typeof v === 'number' && k !== 'Byttehandler' ? money(v) : String(v) })]));
      });
      grid.appendChild(card);
    });
    c.appendChild(grid);
    const qs = el('div', { style: 'margin-top:2.5vh' });
    qs.appendChild(el('div.eyebrow', { text: 'Tal om det ved bordene' }));
    ['Hvem traf beslutningerne ved auktionen — og hvordan?', 'Hvornår ændrede I strategi — og hvad udløste det?', 'Hvad ville I gøre anderledes, hvis runde 1 kom igen?'].forEach((q, i) => {
      qs.appendChild(el('div.row', { style: 'font-size:1.7vw;padding:.6vh 0;gap:1vw' }, [el('span', { style: 'color:var(--gold);font-weight:800', text: String(i + 1) + '.' }), el('span', { text: q })]));
    });
    c.appendChild(qs);
    return c;
  }

  function teamName(id) { const t = S.teams.find((x) => x.id === id); return t ? t.stableName : '—'; }
  function teamColor(id) { const t = S.teams.find((x) => x.id === id); return t && t.color ? t.color.hex : 'var(--navy)'; }

  // opdater countdowns hvert sekund
  setInterval(() => { document.querySelectorAll('[data-endsat]').forEach((n) => { n.textContent = TG.countdown(Number(n.getAttribute('data-endsat'))); }); }, 500);
})();
