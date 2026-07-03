/* team.js — tablet-app. Følger automatisk den aktuelle fase; viser altid hvad holdet skal nu. */
(function () {
  const { el, clear, sd, money, toast, check } = TG;
  const root = document.getElementById('root');
  let S = null;              // seneste server-state
  const ui = { sub: 'tasks', bids: {}, tradeTo: null, tradeExtra: 0, tip13: null, dyst: {}, mindpuzzle: null };

  // ---------- connection ----------
  const urlCode = new URLSearchParams(location.search).get('code');
  const savedCode = urlCode || TG.load('tg_code');
  const savedTeam = TG.load('tg_teamId');
  if (savedCode) doJoin(savedCode, savedTeam);

  function doJoin(code, teamId) {
    TG.join('team', { code: code.toUpperCase(), teamId }).then((res) => {
      if (!res.ok) { toast(res.error || 'Kunne ikke tilslutte.', 'err'); TG.del('tg_code'); TG.del('tg_teamId'); S = null; render(); return; }
      TG.save('tg_code', res.code); if (res.teamId) TG.save('tg_teamId', res.teamId);
    });
  }
  TG.onState((st) => { S = st; render(); });
  render(); // vis join-skaerm straks ved load

  // ---------- render ----------
  function render() {
    // Skriv færdig i fred: re-render ikke setup-formularen, mens et felt har fokus
    if (S && S.me && S.slide && S.slide.tabletMode === 'stable-setup' && ui.renderedMode === 'stable-setup') {
      const ae = document.activeElement;
      if (ae && ae.tagName === 'INPUT' && root.contains(ae)) return;
    }
    clear(root);
    if (!S || !S.me) { root.appendChild(joinView()); ui.renderedMode = null; return; }
    root.appendChild(topbar());
    const app = el('div.app');
    app.appendChild(bodyForMode());
    root.appendChild(app);
    if (S.slide.tabletMode === 'round-dashboard') root.appendChild(navbar());
    ui.renderedMode = S.slide.tabletMode;
    incomingTradeToast();
  }

  function joinView() {
    const wrap = el('div.big-center');
    const card = el('div.card', { style: 'max-width:420px;width:100%' });
    card.appendChild(el('div.eyebrow', { text: 'Stald-tablet' }));
    card.appendChild(el('h1', { text: 'The Great Team Derby', style: 'font-size:34px;margin:8px 0 16px' }));
    const inp = el('input', { type: 'text', placeholder: 'Spilkode (fx ABCDE)', maxlength: '6', style: 'text-transform:uppercase;text-align:center;font-size:26px;letter-spacing:4px' });
    const btn = el('button.btn.xl', { text: 'Tilslut' });
    btn.addEventListener('click', () => { if (inp.value.trim().length >= 4) doJoin(inp.value.trim()); else toast('Indtast en gyldig kode.', 'err'); });
    card.appendChild(el('label.field', {}, [inp]));
    card.appendChild(btn);
    wrap.appendChild(card);
    return wrap;
  }

  function topbar() {
    const me = S.me;
    const bar = el('div.topbar');
    const b = el('div.badge', { style: `background:${me.color.hex}` , text: String(me.teamNumber) });
    bar.appendChild(b);
    bar.appendChild(el('div', {}, [el('div.name', { text: me.stableName }), el('div', { style: 'font-size:11px;opacity:.75', text: S.slide.title })]));
    const m = el('div.metrics');
    m.appendChild(metric('Kontant', sd(me.cash)));
    m.appendChild(metric('Staldværdi', sd(me.totalValue)));
    bar.appendChild(m);
    return bar;
  }
  function metric(k, v) { return el('div.center', {}, [el('div.k', { text: k }), el('div.v', { text: v })]); }

  function bodyForMode() {
    switch (S.slide.tabletMode) {
      case 'welcome': return centerMsg('Velkommen til<br>The Great Team Derby', 'Vent på værten…');
      case 'stable-setup': return setupView();
      case 'ready-wait': return readyWaitView();
      case 'pre-season': return preseasonView();
      case 'warmup-race': return warmupView();
      case 'auction': return auctionView();
      case 'round-dashboard': return dashboardView();
      case 'bank': return bankView();
      case 'race': case 'final-race': return raceView();
      case 'final-result': return finalResultView();
      default: return centerMsg('Vent på værten…', '');
    }
  }

  function centerMsg(title, sub) {
    const w = el('div.big-center');
    const c = el('div', {}, [el('h1', { html: title })]);
    if (sub) c.appendChild(el('p.muted', { html: sub, style: 'margin-top:12px;font-size:18px' }));
    w.appendChild(c);
    return w;
  }

  // ---------- SETUP ----------
  function setupView() {
    const me = S.me;
    const c = el('div.card');
    c.appendChild(el('div.eyebrow', { text: 'Skab jeres stald' }));
    c.appendChild(el('h1', { text: 'Navngiv jer', style: 'margin:6px 0 18px' }));
    const f = {};
    // Kladde overlever re-renders (state-pushes fra andre hold nulstiller ellers felterne)
    const d = ui.setupDraft || (ui.setupDraft = {});
    const mk = (lbl, key, val) => {
      const i = el('input', { type: 'text', value: d[key] != null ? d[key] : (val || ''), oninput: () => { d[key] = i.value; } });
      f[key] = i;
      return el('label.field', {}, [el('span.lbl', { text: lbl }), i]);
    };
    c.appendChild(mk('Staldnavn', 'stableName', me.stableName));
    c.appendChild(mk('Hestens navn', 'horseName', me.horseName));
    c.appendChild(mk('Jockeyens navn', 'jockeyName', me.jockeyName));
    const save = el('button.btn.block', { text: 'Gem' });
    save.addEventListener('click', () => TG.emit('team:setStable', { stableName: f.stableName.value, horseName: f.horseName.value, jockeyName: f.jockeyName.value }).then((r) => { if (r.ok) { ui.setupDraft = {}; toast('Gemt', 'ok'); } }));
    const ready = el('button.btn.gold.block', { text: me.ready ? '✓ Vi er klar (tryk for at fortryde)' : 'Vi er klar!' , style: 'margin-top:10px' });
    ready.addEventListener('click', () => TG.emit('team:setStable', { stableName: f.stableName.value, horseName: f.horseName.value, jockeyName: f.jockeyName.value, ready: !me.ready }).then((r) => { if (r.ok) ui.setupDraft = {}; }));
    c.appendChild(save); c.appendChild(ready);
    return c;
  }

  // ---------- READY-CHECK ----------
  function readyWaitView() {
    const me = S.me;
    const w = el('div.big-center');
    if (me.ready) {
      const c = el('div', { style: 'text-align:center' });
      c.appendChild(el('h1', { html: 'I er klar! ✓' }));
      c.appendChild(el('p.muted', { style: 'margin-top:12px;font-size:18px', text: 'Vent på de andre stalde…' }));
      const un = el('button.btn.sm.ghost', { text: 'Fortryd klar', style: 'margin-top:18px' });
      un.addEventListener('click', () => TG.emit('team:ready', { ready: false }));
      c.appendChild(un);
      w.appendChild(c);
      return w;
    }
    const card = el('div.card', { style: 'max-width:460px;width:100%;text-align:center' });
    card.appendChild(el('h1', { text: 'Er I klar?', style: 'font-size:30px' }));
    card.appendChild(el('p.muted', { style: 'margin:10px 0 16px', html: `<b>${me.stableName}</b><br>Hest: <b>${me.horseName || '—'}</b> · Jockey: <b>${me.jockeyName || '—'}</b>` }));
    const b = el('button.btn.gold.block.lg', { text: 'Vi er klar!' });
    b.addEventListener('click', () => TG.emit('team:ready', { ready: true }).then(check));
    card.appendChild(b);
    w.appendChild(card);
    return w;
  }

  // ---------- PRE-SEASON ----------
  // Samme 7 faner som under runderne (og som vises på storskærmen) — men interaktivt:
  // tryk rundt, læs om funktionerne. Ingen belønninger endnu.
  const PS_TABS = [['tasks', 'Opgaver'], ['exercise', 'Min øvelse'], ['money', 'Penge'], ['trade', 'Byt'], ['house', 'Auktionshus'], ['invest', 'Invester'], ['bank', 'Bank']];
  function preseasonView() {
    const c = el('div.col');
    c.appendChild(head('Pre-season', 'Sådan ser jeres tablet ud under runderne. Tryk rundt i fanerne og læg jeres plan — ingen belønninger endnu.'));
    const nav = el('div.ps-tabs');
    const active = ui.psTab || 'tasks';
    PS_TABS.forEach(([k, l]) => {
      const b = el('button' + (active === k ? '.active' : ''), { text: l });
      b.addEventListener('click', () => { ui.psTab = k; ui.psDetail = null; render(); });
      nav.appendChild(b);
    });
    c.appendChild(nav);
    c.appendChild(psTabContent(active));
    return c;
  }

  function psCard(title, desc, extra) {
    const card = el('div.card');
    card.appendChild(el('h3', { text: title }));
    card.appendChild(el('p.muted', { text: desc, style: 'margin:6px 0' }));
    if (extra) card.appendChild(extra);
    return card;
  }

  function psTabContent(tab) {
    const c = el('div.col');
    if (tab === 'tasks') {
      c.appendChild(psCard('📋 Opgaver', 'Her ligger de opgaver, der altid er åbne — de kræver godkendelse af hosten, når I er færdige.'));
      c.appendChild(psCard('Puslespil', 'Et langt team-puslespil. Fuldfør det før finalen og få jeres Derby-licens — uden den mister I et slag i finaleløbet.'));
      c.appendChild(psCard('Pynt jeres hest', 'Dekorér jeres hobbyhest. Bedømmes i den kreative showcase og giver bonus til staldværdien.'));
      c.appendChild(psCard('Design jeres staldskilt', 'Staldens våbenskjold. Bedømmes også i showcasen.'));
    } else if (tab === 'exercise') {
      if (ui.psDetail) {
        const ex = (S.auction.exercises || []).find((e) => e.id === ui.psDetail);
        if (ex) {
          c.appendChild(backBtn(() => { ui.psDetail = null; render(); }));
          const card = el('div.card', { class: 'cat-top-' + ex.category });
          card.appendChild(el('span', { class: 'cat ' + ex.category, text: catName(ex.category) }));
          card.appendChild(el('h2', { text: ex.name, style: 'margin:4px 0' }));
          card.appendChild(el('div.finish-stripe', { style: 'margin:8px 0' }));
          card.appendChild(el('p', { text: ex.description }));
          if (ex.gives) card.appendChild(el('p.muted', { style: 'margin-top:8px', text: 'Giver: ' + ex.gives }));
          if (ex.thresholds) card.appendChild(thresholdInfo(ex));
          c.appendChild(card);
          return c;
        }
      }
      c.appendChild(psCard('🎯 Min øvelse', 'På auktionen byder I på én af de 8 specialøvelser herunder. Den I vinder, bliver JERES — og ligger så i denne fane, hvor I kalder instruktøren til officielle forsøg. Tryk på en øvelse for detaljer.'));
      const grid = el('div.grid', { style: 'grid-template-columns:1fr 1fr' });
      (S.auction.exercises || []).forEach((ex) => {
        const t = el('div', { class: 'ex-tile cat-top-' + ex.category });
        t.appendChild(el('span', { class: 'cat ' + ex.category, text: catName(ex.category) }));
        t.appendChild(el('h3', { text: ex.name, style: 'margin:4px 0 2px' }));
        t.appendChild(el('p.muted', { text: ex.short, style: 'font-size:13px' }));
        t.addEventListener('click', () => { ui.psDetail = ex.id; render(); });
        grid.appendChild(t);
      });
      c.appendChild(grid);
    } else if (tab === 'money') {
      c.appendChild(psCard('💰 Pengeopgaver', 'Hurtige kontanter med cooldown — fordel jer, så I altid har noget i gang.'));
      c.appendChild(psCard('Tip en 13\'er', '13 spørgsmål på tabletten — 100 SD pr. rigtigt svar.'));
      c.appendChild(psCard('🕰️ Tidslinjen', 'Læg de fysiske kort i kronologisk rækkefølge ved Tidslinje-stationens tablet — 300 SD pr. korrekt tidslinje.'));
      c.appendChild(psCard('⚔️ Dysten', 'Udfordr en anden stald til en estimerings-duel (bedst af 3). Vinderen får 500 SD.'));
    } else if (tab === 'trade') {
      c.appendChild(psCard('🔁 Byttehandel', 'Byt jeres auktionsøvelse med en anden stald — evt. med Staldollars oveni. Begge stalde skal acceptere handlen. Brug det, når jeres øvelse er ved at være tømt for værdi, eller når en anden øvelse passer bedre til holdet.'));
    } else if (tab === 'house') {
      c.appendChild(psCard('🏛️ Auktionshus', 'Fortrudt jeres køb? Her kan I bytte jeres øvelse til en LEDIG øvelse mod et fast gebyr på 100 SD. Hurtigt og billigt — men kun til øvelser, ingen andre ejer.'));
    } else if (tab === 'invest') {
      c.appendChild(psCard('📈 Investering', 'Brug kontanter på at gøre stalden stærkere. Max ét køb pr. mulighed — vælg klogt.'));
      c.appendChild(psCard('Hest', 'Køb fart: hesten løfter terningens TOP — bedre chance for høje slag i løbene.'));
      c.appendChild(psCard('Jockey', 'Køb stabilitet: jockeyen løfter terningens BUND — færre dårlige slag.'));
      c.appendChild(psCard('Stald', 'Sikker værdi: staldværdien stiger lidt mere end prisen, men hjælper ikke i løbet.'));
    } else if (tab === 'bank') {
      c.appendChild(psCard('🏦 Bank & stilling', 'Her følger I jeres samlede staldværdi (kontanter + hest + jockey + stald) og stillingen mod de andre stalde.'));
      c.appendChild(psCard('Sådan vinder I', 'Den mest værdifulde stald vinder til sidst — IKKE nødvendigvis løbsvinderen. Løbene giver præmiepenge, men det er totalværdien, der tæller.'));
    }
    return c;
  }

  // ---------- WARM-UP ----------
  function warmupView() {
    if (S.warmupPaid) return centerMsg('Startkapital modtaget!', 'I har fået <b>5.000 SD</b> i staldkassen.');
    return centerMsg('Warm-up løb', 'Læn jer tilbage og nyd showet — bagefter får alle stalde startkapital.');
  }

  // ---------- AUCTION ----------
  function auctionView() {
    const a = S.auction;
    const c = el('div.col');
    const status = a.status === 'open' ? 'Auktionen er åben' : a.status === 'closed' ? 'Auktionen er lukket — afventer afgørelse' : a.status === 'resolved' ? 'Auktionen er afgjort' : 'Auktion';
    c.appendChild(head('Auktion', status));
    if (a.status === 'resolved') {
      const res = el('div.card'); res.appendChild(el('h3', { text: 'Resultater' }));
      (a.results || []).forEach((r) => res.appendChild(el('div.row.between', { style: 'padding:6px 0;border-bottom:1px dashed var(--line)' }, [el('span', { text: `${r.stableName} → ${r.exerciseName}` }), el('span.num', { text: sd(r.amount) })])));
      c.appendChild(res);
    }
    const grid = el('div.grid', { style: 'grid-template-columns:1fr 1fr' });
    a.exercises.forEach((ex) => grid.appendChild(auctionTile(ex, a)));
    c.appendChild(grid);
    return c;
  }

  function auctionTile(ex, a) {
    const me = S.me;
    const myBid = (a.bids || []).find((b) => b.exerciseId === ex.id && b.teamId === me.id);
    const top = (a.topBids || []).find((b) => b.exerciseId === ex.id);
    const iLead = top && top.teamId === me.id;
    const outbid = myBid && top && !iLead && top.amount > myBid.amount;
    const t = el('div.ex-tile.cat-top-' + ex.category + (ex.currentOwnerTeamId === me.id ? '.owned' : '') + (outbid ? '.outbid' : ''));
    t.appendChild(el('div.row.between', {}, [el('span.cat.' + ex.category, { text: catName(ex.category) }), ex.currentOwnerTeamId ? el('span.chip', { text: ownerName(ex.currentOwnerTeamId) }) : el('span.chip.gold', { text: 'Ledig' })]));
    t.appendChild(el('h3', { text: ex.name, style: 'margin:6px 0 2px' }));
    t.appendChild(el('p.muted', { text: ex.short, style: 'font-size:13px;min-height:34px' }));
    // Live budstatus — synligt for alle så man kan byde igen ved overbud.
    if (a.status === 'open' || a.status === 'closed') {
      if (top) {
        t.appendChild(el('div.row.between', { style: 'margin-top:6px;padding:6px 8px;border-radius:8px;background:var(--cream)' }, [
          el('span.muted', { style: 'font-size:12px;text-transform:uppercase;letter-spacing:.5px', text: 'Højeste bud' }),
          el('span.num', { style: 'font-weight:800', text: sd(top.amount) }),
        ]));
        t.appendChild(el('div.muted', { style: 'font-size:12px;margin-top:2px', text: iLead ? 'I fører 🏆' : 'Fører: ' + ownerName(top.teamId) }));
      } else {
        t.appendChild(el('div.muted', { style: 'font-size:12px;margin-top:6px;font-style:italic', text: 'Ingen bud endnu' }));
      }
      if (outbid) t.appendChild(el('div.chip.warn', { style: 'margin-top:6px', text: 'I er overbudt — byd igen!' }));
    }
    if (ex.lastPurchasePrice) t.appendChild(el('div.muted', { style: 'font-size:12px;margin-top:4px', text: 'Sidst solgt: ' + sd(ex.lastPurchasePrice) }));
    if (a.status === 'open') {
      const amt = el('input', { type: 'number', min: '1', placeholder: 'Bud i SD', value: ui.bids[ex.id] || '', style: 'margin-top:8px' });
      amt.addEventListener('input', () => { ui.bids[ex.id] = amt.value; });
      const bid = el('button.btn.sm.gold.block', { text: myBid ? `Ændr bud (${money(myBid.amount)})` : 'Byd', style: 'margin-top:6px' });
      bid.addEventListener('click', () => TG.emit('team:bid', { exerciseId: ex.id, amount: Number(amt.value) }).then((r) => { check(r); if (r.ok) toast('Bud afgivet', 'ok'); }));
      t.appendChild(amt); t.appendChild(bid);
      if (myBid) { const rm = el('button.btn.sm.ghost.block', { text: 'Fjern bud', style: 'margin-top:4px' }); rm.addEventListener('click', () => TG.emit('team:retractBid', { exerciseId: ex.id })); t.appendChild(rm); }
    } else if (myBid) t.appendChild(el('div.chip.gold', { style: 'margin-top:8px', text: 'Dit bud: ' + sd(myBid.amount) }));
    return t;
  }

  // ---------- DASHBOARD ----------
  function navbar() {
    const nav = el('div.navbar');
    const tabs = [['tasks', '📋 Opgaver'], ['exercise', '🎯 Min øvelse'], ['money', '💰 Penge'], ['trade', '🔁 Byt'], ['house', '🏛️ Auktionshus'], ['invest', '📈 Invester'], ['bank', '🏦 Bank']];
    tabs.forEach(([k, l]) => { const b = el('button' + (ui.sub === k ? '.active' : ''), { text: l }); b.addEventListener('click', () => { ui.sub = k; render(); }); nav.appendChild(b); });
    return nav;
  }

  function dashboardView() {
    switch (ui.sub) {
      case 'exercise': return exerciseView();
      case 'money': return moneyView();
      case 'trade': return tradeView();
      case 'house': return houseView();
      case 'invest': return investView();
      case 'bank': return bankView();
      default: return tasksView();
    }
  }

  function tasksView() {
    const me = S.me;
    const c = el('div.col');
    c.appendChild(myStableCard());
    c.appendChild(head('Opgaver', 'Altid tilgængelige — prioritér frit.'));
    c.appendChild(rolesCard());
    const defs = [['puzzle', 'Puslespil', 'Fuldfør for Derby-licens.'], ['horseStyling', 'Pynt jeres hest', 'Bedømmes i showcase.'], ['stableSign', 'Design jeres staldskilt', 'Bedømmes i showcase.']];
    defs.forEach(([id, name, desc]) => {
      const st = me.taskStatus[id] || {};
      const card = el('div.card');
      card.appendChild(el('div.row.between', {}, [el('h3', { text: name }), st.completed ? el('span.chip.turf', { text: '✓ Godkendt' }) : st.pending ? el('span.chip.gold', { text: 'Afventer host' }) : null]));
      card.appendChild(el('p.muted', { text: desc, style: 'margin:6px 0' }));
      if (!st.completed) { const b = el('button.btn.sm', { text: st.pending ? 'Bad om godkendelse ✓' : 'Kald host til godkendelse', disabled: st.pending ? 'true' : null }); b.addEventListener('click', () => TG.emit('team:requestApproval', { taskId: id }).then(check)); card.appendChild(b); }
      c.appendChild(card);
    });
    return c;
  }

  // Visuelt overblik over stalden — hest, jockey, stald og terning
  function myStableCard() {
    const me = S.me;
    const stars = (lvl) => '★'.repeat(lvl) + '☆'.repeat(Math.max(0, 4 - lvl));
    const card = el('div.card', { style: `border-top:6px solid ${me.color.hex};background:linear-gradient(150deg,#fff 55%,#faf6ea)` });
    const top = el('div.row', { style: 'gap:14px;align-items:center' });
    top.appendChild(TG.tintedAsset('hest-silhuet', me.color.hex, { style: 'width:74px;height:74px;flex:none' }));
    const info = el('div', { style: 'flex:1;min-width:0' });
    info.appendChild(el('div', { style: 'font-family:var(--font-display);font-weight:800;font-size:22px;color:var(--navy);line-height:1.1', text: me.stableName }));
    info.appendChild(el('div.muted', { style: 'font-size:13px;margin-top:2px', text: `${me.horseName || 'Hesten'} & ${me.jockeyName || 'jockeyen'}` }));
    info.appendChild(el('div', { style: 'margin-top:6px' }, [el('span.chip.gold', { text: `🎲 Terning ${me.dice.min}–${me.dice.max}` })]));
    top.appendChild(info);
    card.appendChild(top);
    card.appendChild(el('div.finish-stripe', { style: 'margin:12px 0' }));
    const grid = el('div.grid', { style: 'grid-template-columns:1fr 1fr 1fr;gap:8px' });
    const cell = (label, star, value) => el('div', { style: 'text-align:center;background:#fff;border:1px solid var(--line);border-radius:12px;padding:8px 4px' }, [
      el('div', { style: 'font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--text-faint);font-weight:700', text: label }),
      star != null ? el('div', { style: 'color:var(--gold);font-size:14px;letter-spacing:2px', text: star }) : el('div', { style: 'height:4px' }),
      el('div', { style: 'font-family:var(--font-num);font-weight:800;font-size:16px;color:var(--navy)', text: money(value) }),
    ]);
    grid.appendChild(cell('Hest', stars(me.horseLevel), me.horseValue));
    grid.appendChild(cell('Jockey', stars(me.jockeyLevel), me.jockeyValue));
    grid.appendChild(cell('Stald', null, me.stableValue));
    card.appendChild(grid);
    const foot = el('div.row.between', { style: 'margin-top:10px;align-items:baseline' });
    foot.appendChild(el('span.muted', { style: 'font-size:12px', text: me.derbyLicense ? '🎫 Derby-licens i hus' : 'Ingen Derby-licens endnu — byg puslespillet!' }));
    foot.appendChild(el('span', { style: 'font-family:var(--font-num);font-weight:800;font-size:18px;color:var(--burgundy)', text: 'Total ' + sd(me.totalValue) }));
    card.appendChild(foot);
    return card;
  }

  function rolesCard() {
    const me = S.me;
    const roleDefs = (S.config && S.config.roles) || [];
    if (!roleDefs.length) return el('span');
    const hasRoles = Object.keys(me.roles || {}).length > 0;
    const rotationDue = hasRoles && (S.currentRound || 0) >= 2 && (me.rolesRound || 0) < S.currentRound;
    const card = el('div.card');
    if (rotationDue) card.style.border = '2px solid var(--gold)';
    const editBtn = el('button.btn.sm.ghost', { text: ui.editRoles ? 'Luk' : (hasRoles ? 'Rotér' : 'Fordel roller') });
    editBtn.addEventListener('click', () => { ui.editRoles = !ui.editRoles; render(); });
    card.appendChild(el('div.row.between', {}, [el('h3', { text: 'Rollekort' }), editBtn]));
    if (rotationDue) card.appendChild(el('div.chip.gold', { style: 'margin:6px 0', text: `Runde ${S.currentRound} — tid til at rotere rollerne!` }));
    if (ui.editRoles) {
      const inputs = {};
      roleDefs.forEach((r) => {
        const i = el('input', { type: 'text', value: (me.roles || {})[r.id] || '', placeholder: r.desc });
        inputs[r.id] = i;
        card.appendChild(el('label.field', { style: 'margin-top:6px' }, [el('span.lbl', { text: r.label }), i]));
      });
      const save = el('button.btn.gold.block', { text: 'Gem roller', style: 'margin-top:8px' });
      save.addEventListener('click', () => {
        const roles = {}; Object.entries(inputs).forEach(([k, i]) => { if (i.value.trim()) roles[k] = i.value; });
        TG.emit('team:setRoles', { roles }).then((r) => { check(r); if (r.ok) { ui.editRoles = false; toast('Roller gemt', 'ok'); } });
      });
      card.appendChild(save);
    } else if (hasRoles) {
      roleDefs.forEach((r) => {
        const name = (me.roles || {})[r.id];
        if (name) card.appendChild(el('div.row.between', { style: 'font-size:14px;padding:4px 0;border-bottom:1px dashed var(--line)' }, [el('span.muted', { text: r.label }), el('b', { text: name })]));
      });
    } else {
      card.appendChild(el('p.muted', { style: 'margin-top:6px', text: 'Fordel rollerne, så alle har en funktion — og rotér dem hver runde.' }));
    }
    return card;
  }

  function exerciseView() {
    const me = S.me;
    const c = el('div.col');
    c.appendChild(head('Min øvelse', 'Jeres ejede auktionsøvelse.'));
    if (!me.ownedAuctionExerciseId) { c.appendChild(el('div.card', {}, [el('p.muted', { text: 'I ejer ingen auktionsøvelse lige nu. Byd på næste auktion eller byt jer til en.' })])); return c; }
    const ex = S.auction.exercises.find((e) => e.id === me.ownedAuctionExerciseId);
    if (ex.id === 'mindpuzzle') { c.appendChild(mindpuzzleCard(ex)); return c; }
    const cd = cooldownLeft(ex.id);
    const card = el('div.card');
    card.appendChild(el('span.cat.' + ex.category, { text: catName(ex.category) }));
    card.appendChild(el('h2', { text: ex.name, style: 'margin:4px 0' }));
    card.appendChild(el('p.muted', { text: ex.description }));
    card.appendChild(el('div.finish-stripe', { style: 'margin:12px 0' }));
    if (ex.category === 'money') {
      card.appendChild(el('div.row.between', {}, [el('span.muted', { text: 'Næste belønning' }), el('span.num', { style: 'font-size:24px;color:var(--gold)', text: sd(ex.nextReward) })]));
      if (ex.progressive) card.appendChild(el('div.chip', { style: 'margin-top:8px', text: 'Niveau ' + (me.mindPuzzleLevel + 1) }));
    } else {
      card.appendChild(el('p', { text: ex.gives }));
      card.appendChild(thresholdInfo(ex));
      card.appendChild(el('div.row', { style: 'margin-top:6px' }, [el('span.chip.turf', { text: (ex.category === 'jockey' ? 'Jockey' : 'Hest') + '-niveau ' + (ex.category === 'jockey' ? me.jockeyLevel : me.horseLevel) })]));
    }
    const btn = el('button.btn.gold.block.lg', { text: cd ? `Cooldown ${cd}` : 'Kald instruktør — officielt forsøg', style: 'margin-top:14px', disabled: cd ? 'true' : null });
    btn.setAttribute('data-cooldown', ex.id);
    btn.addEventListener('click', () => TG.emit('team:exerciseAttempt', { exerciseId: ex.id }).then((r) => { check(r); if (r.ok) toast('Instruktør tilkaldt — vent på godkendelse.', 'ok'); }));
    card.appendChild(btn);
    if ((me.taskStatus[ex.id] || {}).pending) card.appendChild(el('div.chip.gold', { style: 'margin-top:8px', text: 'Afventer instruktørens vurdering' }));
    c.appendChild(card);
    return c;
  }
  // ---------- MIND PUZZLE (Horse Academy) — auto-godkendelse ----------
  const MP_SWATCH = {
    orange: '#F5821F', gul: '#FFD500', lyseblaa: '#29ABE2', moerkeblaa: '#1B3F94',
    lysegroen: '#8CC63F', moerkegroen: '#1D6B45', lilla: '#93278F', pink: '#F06EAA',
    brun: '#754C29', roedhvid: 'repeating-linear-gradient(45deg,#D7182A 0 8px,#fff 8px 16px)',
  };
  function mpSwatch(colorId) {
    if (!MP_SWATCH[colorId]) return null;
    return el('span', { style: `display:inline-block;width:22px;height:22px;border-radius:6px;border:1.5px solid rgba(0,0,0,.25);vertical-align:middle;background:${MP_SWATCH[colorId]}` });
  }
  function mpLoad() {
    TG.emit('team:mindpuzzleGet').then((r) => {
      if (!r.ok) return check(r);
      ui.mindpuzzle = { data: r, checking: false, answers: {}, result: null };
      render();
    });
  }
  function mindpuzzleCard(ex) {
    const me = S.me;
    const wrap = el('div.col');
    const mp = ui.mindpuzzle;
    const cd = cooldownLeft('mindpuzzle');
    const card = el('div.card');
    card.appendChild(el('span.cat.money', { text: 'Penge' }));
    card.appendChild(el('h2', { text: 'Mind Puzzle — Horse Academy', style: 'margin:4px 0' }));

    // Ingen data hentet endnu → hent (viser aktuelt niveau)
    if (!mp || !mp.data) {
      card.appendChild(el('p.muted', { text: 'Byg banen på spillepladen, så hesten kommer fra start til mål og hopper over forhindringerne i rækkefølgen på opgavekortet. Godkendelsen klarer tabletten — ingen instruktør nødvendig.' }));
      const b = el('button.btn.gold.block.lg', { text: 'Vis vores niveau', style: 'margin-top:12px' });
      b.addEventListener('click', mpLoad);
      card.appendChild(b);
      wrap.appendChild(card);
      return wrap;
    }
    const d = mp.data;

    // Alle niveauer klaret
    if (d.done) {
      card.appendChild(el('div.center', { style: 'padding:18px' }, [
        el('div', { style: 'font-size:42px', text: '🏆' }),
        el('h3', { text: 'ALLE 20 NIVEAUER GENNEMFØRT!' }),
        el('p.muted', { text: 'Vildt godt gået. Overvej at bytte øvelsen væk — den giver ikke mere nu.' }),
      ]));
      wrap.appendChild(card);
      return wrap;
    }

    card.appendChild(el('div.row.between', { style: 'margin:4px 0' }, [
      el('span.chip.turf', { text: `Niveau ${d.level} af ${d.totalLevels} · ${d.tier}` }),
      el('span.num', { style: 'color:var(--gold)', text: '+' + sd(d.nextReward) }),
    ]));

    // Resultat efter tjek
    if (mp.result) {
      const r = mp.result;
      if (r.approved) {
        card.appendChild(el('div.center', { style: 'padding:16px' }, [
          el('div', { style: 'font-size:38px', text: '✅' }),
          el('h3', { text: `Niveau ${r.level} godkendt!` }),
          el('p', { html: `+ <b>${sd(r.reward)}</b> er sat ind på kontoen.` }),
          r.done ? el('p', { style: 'margin-top:6px', text: '🏆 I har gennemført ALLE niveauer!' }) : el('p.muted', { style: 'margin-top:6px', text: 'Næste niveau låses op, når cooldown er udløbet.' }),
        ]));
        const b = el('button.btn.block', { text: 'Videre' });
        b.addEventListener('click', () => { ui.mindpuzzle = null; render(); });
        card.appendChild(b);
      } else {
        card.appendChild(el('div.center', { style: 'padding:16px' }, [
          el('div', { style: 'font-size:38px', text: '❌' }),
          el('h3', { text: 'Det matcher ikke banen' }),
          el('p.muted', { text: `Tjek jeres løsning og prøv igen om ${r.penaltySeconds || 60} sekunder. I får nye kontrolspørgsmål.` }),
        ]));
        const b = el('button.btn.block', { text: 'Tilbage til opgaven' });
        b.addEventListener('click', () => { ui.mindpuzzle = null; mpLoad(); });
        card.appendChild(b);
      }
      wrap.appendChild(card);
      return wrap;
    }

    // Kontrolspørgsmål (godkendelsesflow)
    if (mp.checking) {
      card.appendChild(el('p.muted', { style: 'margin:6px 0', text: 'Svar ud fra jeres byggede bane — lad den stå urørt, mens I svarer!' }));
      d.questions.forEach((q, qi) => {
        const box = el('div', { style: 'margin:10px 0' });
        box.appendChild(el('div', { style: 'font-weight:600;margin-bottom:6px', text: (qi + 1) + '. ' + q.text }));
        const row = el('div.row.wrap', { style: 'gap:8px' });
        q.options.forEach((opt) => {
          const sw = q.type === 'color' ? mpSwatch(opt.id) : null;
          const b = el('button.btn.sm.ghost', { style: 'flex:1;min-width:130px;display:flex;align-items:center;justify-content:center;gap:8px' });
          if (sw) b.appendChild(sw);
          b.appendChild(el('span', { text: opt.label }));
          if (mp.answers[qi] === opt.id) b.classList.add('gold');
          b.addEventListener('click', () => { mp.answers[qi] = opt.id; render(); });
          row.appendChild(b);
        });
        box.appendChild(row);
        card.appendChild(box);
      });
      const ready = d.questions.every((_, qi) => mp.answers[qi] != null);
      const submit = el('button.btn.gold.block.lg', { text: 'Godkend vores løsning', style: 'margin-top:8px', disabled: ready ? null : 'true' });
      submit.addEventListener('click', () => {
        const answers = d.questions.map((_, qi) => mp.answers[qi]);
        TG.emit('team:mindpuzzleSubmit', { answers }).then((r) => { if (!r.ok) return check(r); mp.result = r; render(); });
      });
      card.appendChild(submit);
      const back = el('button.btn.sm.ghost.block', { text: '← Tilbage (banen er ikke klar)', style: 'margin-top:6px' });
      back.addEventListener('click', () => { mp.checking = false; mp.answers = {}; render(); });
      card.appendChild(back);
      wrap.appendChild(card);
      return wrap;
    }

    // Opgavevisning: challenge-billede + start godkendelse
    card.appendChild(el('p.muted', { style: 'margin:4px 0', text: 'Byg banen så hesten rider fra start-bogstavet, hopper over forhindringerne i rækkefølgen herunder og ender ved den røde bom.' }));
    const img = el('img', { src: d.image, alt: `Challenge ${d.book}`, style: 'width:100%;border-radius:12px;border:1px solid var(--line);margin:8px 0' });
    card.appendChild(img);
    card.appendChild(el('p.muted', { style: 'font-size:12px', text: `Hæftets challenge ${d.book} · Når banen er bygget, stiller tabletten ${d.questions.length} kontrolspørgsmål om jeres løsning.` }));
    const go = el('button.btn.gold.block.lg', { text: cd ? `Cooldown ${cd}` : 'Vi er færdige — godkend banen', style: 'margin-top:10px', disabled: cd ? 'true' : null });
    go.setAttribute('data-cooldown', 'mindpuzzle');
    go.addEventListener('click', () => {
      // Hent friske spørgsmål lige inden tjek (nyt tilfældigt udtræk)
      TG.emit('team:mindpuzzleGet').then((r) => {
        if (!r.ok) return check(r);
        if (r.cooldownLeft) { toast('Cooldown — vent lidt endnu.', 'err'); return; }
        ui.mindpuzzle = { data: r, checking: true, answers: {}, result: null };
        render();
      });
    });
    card.appendChild(go);
    wrap.appendChild(card);
    return wrap;
  }

  function thresholdInfo(ex) {
    if (!ex.thresholds) return el('span');
    const order = ['pass', 'bronze', 'silver', 'gold'];
    const row = el('div.row.wrap', { style: 'gap:6px;margin-top:8px' });
    order.forEach((l) => { if (ex.thresholds[l] != null) row.appendChild(el('span.chip', { text: `${l}: ${ex.thresholds[l]}${ex.lowerIsBetter ? 's' : ''}` })); });
    return row;
  }

  // ---------- MONEY TASKS ----------
  function moneyView() {
    const c = el('div.col');
    c.appendChild(head('Pengeopgaver', 'Løs for kontanter. Cooldown efter hvert forsøg.'));
    if (ui.tip13) { c.appendChild(tip13Card()); return c; }
    // launchers
    c.appendChild(taskLauncher('Tip en 13\'er', '13 spørgsmål — 100 SD pr. rigtige.', 'tip13', () => TG.emit('team:tip13Get').then((r) => { if (!r.ok) return check(r); ui.tip13 = { data: r, answers: {}, result: null }; render(); })));
    c.appendChild(tidslinjeStationCard());
    c.appendChild(dystCard());
    return c;
  }
  function taskLauncher(name, desc, key, onStart) {
    const cd = cooldownLeft(key);
    const card = el('div.card');
    card.appendChild(el('div.row.between', {}, [el('h3', { text: name }), cd ? el('span.chip.red', { text: 'Cooldown ' + cd, 'data-cooldown': key }) : null]));
    card.appendChild(el('p.muted', { text: desc, style: 'margin:6px 0' }));
    const b = el('button.btn.block', { text: 'Start', disabled: cd ? 'true' : null }); b.addEventListener('click', onStart); card.appendChild(b);
    return card;
  }
  function tip13Card() {
    const { data, result } = ui.tip13;
    const card = el('div.card');
    card.appendChild(el('div.row.between', {}, [el('h3', { text: 'Tip en 13\'er' }), backBtn(() => { ui.tip13 = null; render(); })]));
    if (result) {
      card.appendChild(el('div.center', { style: 'padding:20px' }, [el('div.stat.big', {}, [el('div.k', { text: 'Resultat' }), el('div.v', { text: result.correct + '/' + result.total })]), el('p', { style: 'margin-top:8px', html: '+ <b>' + sd(result.reward) + '</b>' })]));
      const done = el('button.btn.block', { text: 'Færdig' }); done.addEventListener('click', () => { ui.tip13 = null; render(); }); card.appendChild(done);
      return card;
    }
    data.questions.forEach((q) => {
      const box = el('div', { style: 'margin-bottom:10px' });
      box.appendChild(el('div', { style: 'font-weight:600', text: (q.i + 1) + '. ' + q.q }));
      const row = el('div.row', { style: 'margin-top:4px' });
      q.options.forEach((opt, oi) => { const b = el('button.btn.sm.ghost', { text: opt, style: 'flex:1' }); if (ui.tip13.answers[q.i] === oi) b.classList.add('gold'); b.addEventListener('click', () => { ui.tip13.answers[q.i] = oi; render(); }); row.appendChild(b); });
      box.appendChild(row); card.appendChild(box);
    });
    const submit = el('button.btn.gold.block.lg', { text: 'Aflever' });
    submit.addEventListener('click', () => { const answers = data.questions.map((q) => ui.tip13.answers[q.i]); TG.emit('team:tip13Submit', { answers }).then((r) => { if (!r.ok) return check(r); ui.tip13.result = r; render(); }); });
    card.appendChild(submit);
    return card;
  }
  // Tidslinjen løses ved Tidslinje-stationen (egen tablet) — her vises kun status.
  function tidslinjeStationCard() {
    const cd = cooldownLeft('tidslinje');
    const card = el('div.card');
    card.appendChild(el('div.row.between', {}, [el('h3', { text: '🕰️ Tidslinjen' }), cd ? el('span.chip.red', { text: 'Cooldown ' + cd, 'data-cooldown': 'tidslinje' }) : el('span.chip.turf', { text: 'Klar' })]));
    card.appendChild(el('p.muted', { style: 'margin:6px 0', text: 'Læg de fysiske kort i kronologisk rækkefølge — 300 SD pr. korrekt tidslinje. Løses ved Tidslinje-stationens tablet: gå derover og vælg jeres stald på skærmen.' }));
    return card;
  }
  function dystCard() {
    const me = S.me;
    const cd = cooldownLeft('dyst');
    const card = el('div.card');
    card.appendChild(el('h3', { text: 'Dyst' }));
    card.appendChild(el('p.muted', { text: 'Udfordr en anden stald til estimerings-duel (bedst af 3).', style: 'margin:6px 0' }));
    // aktive dueller
    (S.duels || []).forEach((d) => card.appendChild(duelRow(d)));
    if (!(S.duels || []).some((d) => ['pending', 'active'].includes(d.status))) {
      const sel = el('select');
      sel.appendChild(el('option', { value: '', text: 'Vælg modstander…' }));
      S.teams.filter((t) => t.id !== me.id && t.joined).forEach((t) => sel.appendChild(el('option', { value: t.id, text: t.stableName })));
      const b = el('button.btn.block', { text: 'Udfordr', disabled: cd ? 'true' : null, style: 'margin-top:8px' });
      if (cd) b.setAttribute('data-cooldown', 'dyst');
      b.addEventListener('click', () => { if (!sel.value) return toast('Vælg en modstander.', 'err'); TG.emit('team:duelChallenge', { toTeamId: sel.value }).then(check); });
      card.appendChild(sel); card.appendChild(cd ? el('div.chip.red', { style: 'margin-top:6px', text: 'Cooldown ' + cd, 'data-cooldown': 'dyst' }) : b);
    }
    return card;
  }
  function duelRow(d) {
    const me = S.me;
    const box = el('div.card', { style: 'background:var(--cream);margin-top:8px' });
    box.appendChild(el('div.row.between', {}, [el('b', { text: d.fromStable + ' vs ' + d.toStable }), el('span.chip', { text: d.status })]));
    if (d.status === 'pending' && d.toTeamId === me.id) {
      const row = el('div.row', { style: 'margin-top:8px' });
      const acc = el('button.btn.sm.turf', { text: 'Tag imod' }); acc.addEventListener('click', () => TG.emit('team:duelRespond', { duelId: d.id, accept: true }).then(check));
      const dec = el('button.btn.sm.ghost', { text: 'Afvis' }); dec.addEventListener('click', () => TG.emit('team:duelRespond', { duelId: d.id, accept: false }));
      row.appendChild(acc); row.appendChild(dec); box.appendChild(row);
    } else if (d.status === 'pending') box.appendChild(el('p.muted', { style: 'margin-top:6px', text: 'Afventer modstanderens svar…' }));
    else if (d.status === 'active') {
      const mine = d.submitted[me.id];
      if (mine) box.appendChild(el('p.muted', { style: 'margin-top:6px', text: 'Afventer den anden stald…' }));
      else {
        ui.dyst[d.id] = ui.dyst[d.id] || {};
        d.questions.forEach((q, i) => { const inp = el('input', { type: 'number', placeholder: q.unit, value: ui.dyst[d.id][i] || '', style: 'margin-top:6px' }); inp.addEventListener('input', () => { ui.dyst[d.id][i] = inp.value; }); box.appendChild(el('div', { style: 'font-weight:600;margin-top:8px', text: (i + 1) + '. ' + q.q })); box.appendChild(inp); });
        const sb = el('button.btn.gold.block', { text: 'Aflever svar', style: 'margin-top:10px' });
        sb.addEventListener('click', () => TG.emit('team:duelSubmit', { duelId: d.id, answers: d.questions.map((q, i) => Number(ui.dyst[d.id][i] || 0)) }).then(check));
        box.appendChild(sb);
      }
    } else if (d.status === 'resolved') {
      const win = d.winnerTeamId === me.id ? 'I vandt! 🏆' : d.winnerTeamId ? 'I tabte.' : 'Uafgjort.';
      box.appendChild(el('p', { style: 'margin-top:6px', html: `<b>${win}</b> (${d.winsA}-${d.winsB})` }));
    }
    return box;
  }

  // ---------- TRADE ----------
  function tradeView() {
    const me = S.me;
    const c = el('div.col');
    c.appendChild(head('Byttehandel', 'Byt jeres øvelse med en anden stald.'));
    // indgående/udgående
    (S.trades || []).filter((t) => t.status === 'pending').forEach((t) => c.appendChild(tradeRow(t)));
    if (!me.ownedAuctionExerciseId) { c.appendChild(el('div.card', {}, [el('p.muted', { text: 'I skal eje en øvelse for at kunne tilbyde en byttehandel.' })])); return c; }
    const others = S.teams.filter((t) => t.id !== me.id && t.ownedAuctionExerciseId);
    const card = el('div.card');
    card.appendChild(el('h3', { text: 'Nyt tilbud' }));
    const sel = el('select', { style: 'margin-top:8px' });
    sel.appendChild(el('option', { value: '', text: 'Vælg stald at bytte med…' }));
    others.forEach((t) => { const ex = S.auction.exercises.find((e) => e.id === t.ownedAuctionExerciseId); sel.appendChild(el('option', { value: t.id, text: `${t.stableName} — har ${ex ? ex.name : '?'}` })); });
    const extra = el('input', { type: 'number', min: '0', placeholder: 'Ekstra betaling fra jer (SD)', style: 'margin-top:8px' });
    const myEx = S.auction.exercises.find((e) => e.id === me.ownedAuctionExerciseId);
    card.appendChild(el('p.muted', { style: 'margin-top:8px', text: 'I giver: ' + (myEx ? myEx.name : '?') }));
    card.appendChild(sel); card.appendChild(extra);
    const b = el('button.btn.gold.block', { text: 'Send tilbud', style: 'margin-top:8px' });
    b.addEventListener('click', () => { const to = S.teams.find((t) => t.id === sel.value); if (!to) return toast('Vælg en stald.', 'err'); TG.emit('team:trade', { toTeamId: to.id, offeredExerciseId: me.ownedAuctionExerciseId, requestedExerciseId: to.ownedAuctionExerciseId, extraPayment: Number(extra.value || 0) }).then((r) => { check(r); if (r.ok) toast('Tilbud sendt', 'ok'); }); });
    card.appendChild(b); c.appendChild(card);
    return c;
  }
  function tradeRow(t) {
    const me = S.me;
    const incoming = t.toTeamId === me.id;
    const card = el('div.card', { style: 'border:2px solid var(--gold)' });
    card.appendChild(el('h3', { text: incoming ? 'Tilbud fra ' + t.fromStable : 'Jeres tilbud til ' + t.toStable }));
    card.appendChild(el('p', { style: 'margin:6px 0', html: incoming ? `I får: <b>${t.offeredName}</b>${t.extraPayment ? ' + ' + sd(t.extraPayment) : ''}<br>I giver: <b>${t.requestedName}</b>` : `I giver: <b>${t.offeredName}</b>${t.extraPayment ? ' + ' + sd(t.extraPayment) : ''}<br>I får: <b>${t.requestedName}</b>` }));
    const row = el('div.row');
    if (incoming) {
      const acc = el('button.btn.turf', { text: 'Accepter' }); acc.addEventListener('click', () => TG.emit('team:tradeRespond', { tradeId: t.id, accept: true }).then((r) => { check(r); if (r.ok) toast('Handel gennemført', 'ok'); }));
      const rej = el('button.btn.ghost', { text: 'Afvis' }); rej.addEventListener('click', () => TG.emit('team:tradeRespond', { tradeId: t.id, accept: false }));
      row.appendChild(acc); row.appendChild(rej);
    } else { const cancel = el('button.btn.ghost', { text: 'Annullér' }); cancel.addEventListener('click', () => TG.emit('team:tradeCancel', { tradeId: t.id })); row.appendChild(cancel); }
    card.appendChild(row);
    return card;
  }

  // ---------- AUCTION HOUSE ----------
  function houseView() {
    const me = S.me;
    const c = el('div.col');
    c.appendChild(head('Auktionshus', 'Byt jeres øvelse til en ledig — mod et lille fast gebyr.'));
    if (!me.ownedAuctionExerciseId) { c.appendChild(el('div.card', {}, [el('p.muted', { text: 'I ejer ingen øvelse at bytte.' })])); return c; }
    const fee = S.config.auctionHouseExchangeFee != null ? S.config.auctionHouseExchangeFee : Math.round(me.ownedExercisePurchasePrice * (S.config.auctionHouseExchangeRate || 0.5));
    c.appendChild(el('div.card', {}, [el('p', { html: `Byttegebyr: <b>${sd(fee)}</b> — fast pris uanset øvelse.` })]));
    const free = S.auction.exercises.filter((e) => !e.currentOwnerTeamId);
    if (!free.length) c.appendChild(el('div.card', {}, [el('p.muted', { text: 'Ingen ledige øvelser i auktionshuset lige nu.' })]));
    free.forEach((ex) => {
      const card = el('div.card');
      card.appendChild(el('div.row.between', {}, [el('div', {}, [el('span.cat.' + ex.category, { text: catName(ex.category) }), el('h3', { text: ex.name })]), el('span.chip.gold', { text: 'Ledig' })]));
      card.appendChild(el('p.muted', { text: ex.short, style: 'margin:6px 0' }));
      const b = el('button.btn.block', { text: `Byt hertil (${money(fee)} SD)` });
      b.addEventListener('click', () => TG.emit('team:exchange', { targetExerciseId: ex.id }).then((r) => { check(r); if (r.ok) toast('Byttet!', 'ok'); }));
      card.appendChild(b); c.appendChild(card);
    });
    return c;
  }

  // ---------- INVEST ----------
  function investView() {
    const c = el('div.col');
    c.appendChild(head('Investér', 'Hesten løfter toppen, jockeyen bunden. Stald = sikker værdi.'));
    const groups = [['horse', 'Hest', 'cat-top-horse', 'hest-opgradering'], ['jockey', 'Jockey', 'cat-top-jockey', 'jockey'], ['stable', 'Stald', 'cat-top-money', 'hestesko']];
    groups.forEach(([type, label, catClass, icon]) => {
      const card = el('div.card.' + catClass);
      const hd = el('div.row', { style: 'align-items:center;gap:10px' });
      hd.appendChild(TG.assetImg(icon, { style: 'width:30px;height:30px' }));
      hd.appendChild(el('h3', { text: label }));
      card.appendChild(hd);
      ((S.config.investmentOptions || {})[type] || []).forEach((p) => {
        const bought = (S.me.investmentsMade || {})[p.id] >= (S.config.maxPurchasesPerOption || 1);
        const row = el('div.row.between', { style: 'padding:8px 0;border-bottom:1px dashed var(--line)' });
        row.appendChild(el('div', {}, [el('b', { text: p.label }), el('div.muted', { style: 'font-size:13px', text: `+${money(p.valueIncrease)} værdi${p.performancePoints ? ' · +' + p.performancePoints + ' point' : ''}` })]));
        const b = el('button.btn.sm', { text: bought ? '✓ Købt' : money(p.cost) + ' SD', disabled: bought ? 'true' : null });
        if (!bought) b.addEventListener('click', () => TG.emit('team:invest', { assetType: type, productId: p.id }).then((r) => { check(r); if (r.ok) toast('Investeret', 'ok'); }));
        row.appendChild(b); card.appendChild(row);
      });
      c.appendChild(card);
    });
    return c;
  }

  // ---------- BANK ----------
  function bankView() {
    const me = S.me;
    const c = el('div.col');
    c.appendChild(head('Bank & staldværdi', 'Jeres samlede værdi.'));
    const g = el('div.card'); const grid = el('div.grid', { style: 'grid-template-columns:1fr 1fr' });
    [['Kontanter', me.cash], ['Hest', me.horseValue], ['Jockey', me.jockeyValue], ['Stald', me.stableValue]].forEach(([k, v]) => grid.appendChild(el('div.stat', {}, [el('div.k', { text: k }), el('div.v', { text: sd(v) })])));
    g.appendChild(grid);
    g.appendChild(el('div.finish-stripe', { style: 'margin:14px 0' }));
    g.appendChild(el('div.stat.big', {}, [el('div.k', { text: 'Total staldværdi' }), el('div.v', { text: sd(me.totalValue) })]));
    c.appendChild(g);
    // leaderboard
    const lb = el('div.card'); lb.appendChild(el('h3', { text: 'Stilling' }));
    (S.ranking || []).forEach((r) => lb.appendChild(el('div.row.between', { style: 'padding:6px 0;border-bottom:1px dashed var(--line)' }, [el('span', { html: `<b>${r.place}.</b> ${r.stableName}${r.teamId === me.id ? ' (jer)' : ''}` }), el('span.num', { text: sd(r.totalValue) })])));
    c.appendChild(lb);
    return c;
  }

  // ---------- RACE ----------
  function raceView() {
    const me = S.me; const race = S.race;
    const c = el('div.col');
    c.appendChild(head(S.slide.title, race ? (race.rollingOpen ? 'Løbet er i gang — slå jeres terning!' : 'Vent på at værten åbner for rolling…') : 'Klargør…'));
    if (!race) return c;
    if (race.favoriteTeamId === me.id && !race.favoriteUsed) c.appendChild(el('div.chip.gold', { style: 'align-self:center;font-size:15px;padding:8px 14px', text: '📣 I er publikumsfavorit — fan-boost på næste slag!' }));
    if (race.type === 'final' && (S.config.finalBetting || {}).enabled) c.appendChild(betCard());
    const used = (me.race.rolls || []).length; const allowed = me.race.allowed || race.rollsPerTeam;
    const card = el('div.card.center');
    card.appendChild(el('div.stat.big', {}, [el('div.k', { text: 'Position' }), el('div.v', { text: me.race.position + ' / ' + race.trackLength })]));
    const dice = el('div.dice', { style: 'margin:10px 0;display:flex;align-items:center;justify-content:center;gap:10px' }); if (me.race.lastRoll) { dice.appendChild(TG.assetImg('terning', { style: 'width:52px;height:52px' })); dice.appendChild(el('span', { text: String(me.race.lastRoll) })); } else { dice.textContent = '—'; } card.appendChild(dice);
    card.appendChild(el('p.muted', { text: `Slag brugt: ${used}/${allowed} · terning ${me.dice.min}–${me.dice.max}` }));
    const canRoll = race.rollingOpen && used < allowed;
    const b = el('button.btn.gold.xl', { text: canRoll ? 'SLÅ TERNING' : (used >= allowed ? 'Alle slag brugt' : 'Vent…'), disabled: canRoll ? null : 'true', style: 'margin-top:14px' });
    b.addEventListener('click', () => TG.emit('team:roll').then((r) => {
      check(r); if (!r.ok) return;
      if (r.event) toast(`${r.event.emoji || ''} ${r.event.label}! ${r.event.effect > 0 ? '+' : ''}${r.event.effect} felter`, r.event.effect > 0 ? 'ok' : 'err');
      if (r.fanBoost) toast(`📣 Fan-boost! +${r.fanBoost} felter`, 'ok');
      if (r.catchup) toast(`🔥 Opløbsfight! +${r.catchup} felt`, 'ok');
    }));
    card.appendChild(b);
    c.appendChild(card);
    c.appendChild(miniTrack());
    if (race.results && race.results.length) { const res = el('div.card'); res.appendChild(el('h3', { text: 'Resultat' })); race.results.forEach((r) => res.appendChild(el('div.row.between', { style: 'padding:5px 0' }, [el('span', { text: `${r.place}. ${r.stableName}${r.deadHeat ? ' (dødt løb)' : ''}` }), el('span.num', { text: '+' + money(r.prize) })]))); c.appendChild(res); }
    return c;
  }

  function betCard() {
    const me = S.me; const race = S.race;
    const myBet = (race.bets || {})[me.id];
    const odds = (race.odds || {})[me.id] || '?';
    const card = el('div.card');
    card.appendChild(el('h3', { text: '💰 Bookmakeren: sats på jeres hest' }));
    if (myBet) {
      const potential = Math.round(myBet.amount * myBet.odds);
      if (race.status === 'finished') {
        card.appendChild(el('p', { style: 'margin-top:6px', html: myBet.payout ? `I vandt væddemålet: <b>+${money(myBet.payout)} SD</b> 🎉` : `Væddemålet tabt (−${money(myBet.amount)} SD).` }));
      } else {
        card.appendChild(el('div.chip.gold', { style: 'margin-top:6px', text: `Satset: ${money(myBet.amount)} SD til odds ${myBet.odds}` }));
        card.appendChild(el('p.muted', { style: 'margin-top:6px', text: `Vind løbet og få ${money(potential)} SD tilbage!` }));
      }
      return card;
    }
    if (race.rollingOpen || race.status === 'finished') {
      card.appendChild(el('p.muted', { style: 'margin-top:6px', text: 'Væddemålene er lukket — løbet er i gang.' }));
      return card;
    }
    card.appendChild(el('p.muted', { style: 'margin:6px 0', text: `Jeres odds: ${odds} (sat efter stillingen — jo længere bagud, jo højere odds). Vinder I løbet, får I indsatsen × ${odds}. Taber I, er den tabt.` }));
    const inp = el('input', { type: 'number', min: '1', placeholder: `Indsats i SD (max ${me.cash})` });
    const b = el('button.btn.gold.block', { text: `Sats til odds ${odds}`, style: 'margin-top:8px' });
    b.addEventListener('click', () => TG.emit('team:bet', { amount: Number(inp.value) }).then((r) => { check(r); if (r.ok) toast('Væddemål registreret!', 'ok'); }));
    card.appendChild(inp); card.appendChild(b);
    return card;
  }

  function miniTrack() {
    const race = S.race; const me = S.me;
    const card = el('div.card');
    card.appendChild(el('h3', { text: 'Banen lige nu' }));
    const sorted = [...S.teams].filter((t) => t.joined).sort((a, b) => (race.positions[b.id] || 0) - (race.positions[a.id] || 0));
    sorted.forEach((t) => {
      const pos = race.positions[t.id] || 0;
      const pct = Math.min(100, (pos / race.trackLength) * 100);
      const row = el('div', { style: 'margin:8px 0' });
      row.appendChild(el('div.row.between', { style: 'font-size:13px;margin-bottom:3px' }, [
        el('span', { html: `<b style="color:${t.color.hex}">●</b> ${t.stableName}${t.id === me.id ? ' (jer)' : ''}${race.favoriteTeamId === t.id ? ' 📣' : ''}` }),
        el('span.num', { text: String(pos) }),
      ]));
      const bar = el('div', { style: 'height:8px;background:var(--cream);border-radius:99px;overflow:hidden' });
      bar.appendChild(el('div', { style: `height:100%;width:${pct}%;background:${t.color.hex};border-radius:99px;transition:width .6s ease` }));
      row.appendChild(bar);
      card.appendChild(row);
    });
    return card;
  }

  // ---------- FINAL ----------
  function finalResultView() {
    const c = el('div.col');
    const winner = (S.ranking || [])[0];
    c.appendChild(centerMsg(winner ? '🏆 ' + winner.stableName : 'Tak for i dag!', winner ? 'Vinder med ' + sd(winner.totalValue) : ''));
    const lb = el('div.card'); lb.appendChild(el('h3', { text: 'Endelig stilling' }));
    (S.ranking || []).forEach((r) => lb.appendChild(el('div.row.between', { style: 'padding:6px 0;border-bottom:1px dashed var(--line)' }, [el('span', { html: `<b>${r.place}.</b> ${r.stableName}` }), el('span.num', { text: sd(r.totalValue) })])));
    c.appendChild(lb);
    return c;
  }

  // ---------- helpers ----------
  function head(title, sub) { const h = el('div', { style: 'margin:4px 0 10px' }); h.appendChild(el('h1', { text: title, style: 'font-size:30px' })); h.appendChild(el('div.head-accent')); if (sub) h.appendChild(el('p.muted', { text: sub })); return h; }
  function backBtn(fn) { const b = el('button.btn.sm.ghost', { text: '← Tilbage' }); b.addEventListener('click', fn); return b; }
  function catName(c) { return c === 'money' ? 'Penge' : c === 'jockey' ? 'Jockey' : 'Hest'; }
  function ownerName(id) { const t = S.teams.find((x) => x.id === id); return t ? t.stableName : '—'; }
  function cooldownLeft(key) { const exp = (S.me.cooldowns || {})[key]; if (!exp) return null; const s = Math.round((exp - Date.now()) / 1000); return s > 0 ? mmss(s) : null; }
  function mmss(s) { return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
  let lastIncoming = 0;
  function incomingTradeToast() {
    const me = S.me; const pending = (S.trades || []).filter((t) => t.status === 'pending' && t.toTeamId === me.id);
    if (pending.length && pending[0].createdAt > lastIncoming) { lastIncoming = pending[0].createdAt; toast('Nyt byttetilbud fra ' + pending[0].fromStable + '!', 'ok'); }
  }

  // opdater cooldown-labels hvert sekund; fuld re-render når en cooldown udløber
  setInterval(() => {
    if (!S || !S.me) return;
    let expired = false;
    document.querySelectorAll('[data-cooldown]').forEach((n) => {
      const k = n.getAttribute('data-cooldown');
      const left = cooldownLeft(k);
      if (left) n.textContent = 'Cooldown ' + left;
      else expired = true;
    });
    if (expired) render();
  }, 1000);
})();
