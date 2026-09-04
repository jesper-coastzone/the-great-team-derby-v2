/* team.js — tablet-app. Følger automatisk den aktuelle fase; viser altid hvad holdet skal nu. */
(function () {
  const { el, clear, sd, money, toast, check } = TG;
  const root = document.getElementById('root');
  let S = null;              // seneste server-state
  const TX = (da, en) => (S && S.lang === 'en' ? en : da);
  const ui = { sub: 'tasks', bids: {}, tradeTo: null, tradeExtra: 0, tip13: null, dyst: {}, mindpuzzle: null };

  // ---------- connection ----------
  const urlCode = new URLSearchParams(location.search).get('code');
  const savedCode = urlCode || TG.load('tg_code');
  const savedTeam = TG.load('tg_teamId');
  if (savedCode) doJoin(savedCode, savedTeam);

  function doJoin(code, teamId) {
    TG.join('team', { code: code.toUpperCase(), teamId }).then((res) => {
      if (!res.ok) { toast(res.error || 'Kunne ikke tilslutte / Could not join.', 'err'); TG.del('tg_code'); TG.del('tg_teamId'); S = null; render(); return; }
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
    if (S.activeChangeCard) root.appendChild(changeCardBar());
    const app = el('div.app');
    app.appendChild(bodyForMode());
    root.appendChild(app);
    if (S.slide.tabletMode === 'round-dashboard') root.appendChild(navbar());
    ui.renderedMode = S.slide.tabletMode;
    celebrateChanges(S.me);
    incomingTradeToast();
  }

  function joinView() {
    const wrap = el('div.big-center');
    const card = el('div.card', { style: 'max-width:420px;width:100%' });
    card.appendChild(el('div.eyebrow', { text: 'Stald-tablet' }));
    card.appendChild(el('img', { src: TG.assetURL('logo'), alt: 'The Great Team Derby', style: 'width:82%;max-width:330px;margin:10px auto 16px;display:block' }));
    const inp = el('input', { type: 'text', placeholder: 'Spilkode · Game code', maxlength: '6', style: 'text-transform:uppercase;text-align:center;font-size:26px;letter-spacing:4px' });
    const btn = el('button.btn.xl', { text: 'Tilslut · Join' });
    btn.addEventListener('click', () => { if (inp.value.trim().length >= 4) doJoin(inp.value.trim()); else toast('Indtast en gyldig kode / Enter a valid code.', 'err'); });
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
    m.appendChild(metric(TX('Staldkassen', 'Stable Fund'), sd(me.cash)));
    m.appendChild(metric(TX('Løbspoint', 'Race Points'), String(me.racePoints || 0)));
    bar.appendChild(m);
    return bar;
  }
  function metric(k, v) { return el('div.center', {}, [el('div.k', { text: k }), el('div.v', { text: v })]); }

  function bodyForMode() {
    switch (S.slide.tabletMode) {
      case 'welcome': return introView();
      case 'stable-setup': return setupView();
      case 'ready-wait': return readyWaitView();
      case 'pre-season': return preseasonView();
      case 'preseason-dashboard': return preseasonRoundView();
      case 'warmup-race': return warmupView();
      case 'auction': return auctionView();
      case 'round-dashboard': return dashboardView();
      case 'paddock': return paddockView();
      case 'bank': return bankView();
      case 'race': case 'final-race': return raceView();
      case 'final-result': return finalResultView();
      default: return centerMsg(TX('Vent på Løbslederen…', 'Waiting for the Race Director…'), '');
    }
  }

  function centerMsg(title, sub) {
    const w = el('div.big-center');
    const c = el('div', {}, [el('h1', { html: title })]);
    if (sub) c.appendChild(el('p.muted', { html: sub, style: 'margin-top:12px;font-size:18px' }));
    w.appendChild(c);
    return w;
  }

  // ---------- INTRO: tabletten spejler storskærmens slides (backup hvis ingen projektor) ----------
  function introView() {
    const mirror = {
      'program': introProgram,
      'derby-intro': introDerby,
      'how-to-win': introHowToWin,
      'game-flow': introGameFlow,
    }[S.slide.kind];
    if (S.slide.kind === 'paddock-intro') return centerMsg(TX('🏇 Paddocken', '🏇 The Paddock'), TX('Kig på storskærmen — løbslederen forklarer jockey-auktionen, præmietavlen, dagsform og odds-tavlen. Om lidt åbner Paddocken på jeres tablet!', 'Watch the big screen — the Race Director explains the jockey auction, the prize board, race-day form and the odds board. The Paddock opens on your tablet in a moment!'));
    if (S.slide.kind === 'race-intro') return centerMsg(TX('🏁 Løbet', '🏁 The Race'), TX('Kig på storskærmen — løbslederen forklarer løbet. Gør jer klar til at slå jeres spurter!', 'Watch the big screen — the Race Director explains the race. Get ready to roll your sprints!'));
    if (!mirror) return centerMsg(TX('Velkommen til<br>The Great Team Derby', 'Welcome to<br>The Great Team Derby'), TX('Vent på værten…', 'Waiting for the host…'));
    const c = el('div.col');
    c.appendChild(el('div.eyebrow', { text: TX('Følg med — her eller på storskærmen', 'Follow along — here or on the big screen') }));
    c.appendChild(mirror());
    return c;
  }
  function introProgram() {
    const card = el('div.card');
    card.appendChild(el('h1', { text: TX('Dagens program', "Today's programme"), style: 'font-size:30px;margin-bottom:10px' }));
    (S.programItems || []).forEach((p, i) => card.appendChild(el('div.row', { style: 'font-size:17px;padding:9px 0;border-bottom:1px solid var(--line);gap:12px' }, [
      el('span', { style: 'color:var(--gold);font-weight:800;width:26px;flex:none;font-family:var(--font-num)', text: String(i + 1) }),
      el('span', { text: p }),
    ])));
    return card;
  }
  function introDerby() {
    const card = el('div.card', { style: 'text-align:center' });
    card.appendChild(TG.assetImg('hest-og-jockey', { style: 'width:62%;max-width:340px;margin:0 auto;display:block' }));
    card.appendChild(el('img', { src: TG.assetURL('logo'), alt: 'The Great Team Derby', style: 'width:76%;max-width:360px;margin:8px auto;display:block' }));
    card.appendChild(el('p.muted', { style: 'font-size:16px', text: TX('Samarbejde, strategi og forandringsparathed. Træn, invester og vind løbspoint — også når planen vælter.', 'Teamwork, strategy and adaptability. Train, invest and win Race Points — even when the plan falls apart.') }));
    return card;
  }
  function introHowToWin() {
    const card = el('div.card');
    card.appendChild(el('h1', { text: TX('Sådan vinder I', 'How to win'), style: 'font-size:30px;margin-bottom:10px' }));
    [TX('Tjen Derby Dollars på opgaver og stationer', 'Earn Derby Dollars on tasks and stations'), TX('Brug dem klogt i Paddocken før hvert løb', 'Spend them wisely in the Paddock before every race'), TX('Placeringen i løbet giver LØBSPOINT', 'Your finishing position earns RACE POINTS'), TX('Finalen — The Great Team Derby — giver dobbelt', 'The final — The Great Team Derby — pays double')].forEach((s, i) =>
      card.appendChild(el('div.row', { style: 'font-size:17px;padding:8px 0;gap:12px' }, [
        el('span', { style: 'color:var(--gold);font-weight:800;width:26px;flex:none;font-family:var(--font-num)', text: String(i + 1) }),
        el('span', { text: s }),
      ])));
    card.appendChild(el('div', { style: 'margin-top:12px;background:var(--navy);color:var(--on-navy);border-radius:12px;padding:12px 14px;font-weight:700;font-size:15px', html: TX('Stalden med flest <b style="color:var(--gold-soft)">løbspoint</b> vinder. Derby Dollars er midlet — point er målet.', 'The stable with the most <b style="color:var(--gold-soft)">Race Points</b> wins. Derby Dollars are the means — points are the goal.') }));
    return card;
  }
  function introGameFlow() {
    const wrap = el('div.col');
    const head = el('div.card');
    head.appendChild(el('h1', { text: TX('Spillets gang', 'How the game flows'), style: 'font-size:30px' }));
    head.appendChild(el('p.muted', { text: TX('🔁 Loopet gentages hver sæson.', '🔁 The loop repeats every season.') }));
    wrap.appendChild(head);
    const steps = [
      [TX('Træning', 'Training'), TX('Løs opgaver og stationer · tjen Derby Dollars', 'Solve tasks and stations · earn Derby Dollars'), 'puslespil-opgaver', '#2A4B3B'],
      [TX('Paddocken', 'The Paddock'), TX('Jockey-auktion · dagsform · odds-tavlen', 'Jockey auction · race-day form · the odds board'), 'hammer-auktion', '#B8A993'],
      [TX('Løbet', 'The Race'), TX('5 spurter — placeringen giver løbspoint', '5 sprints — placement earns Race Points'), 'maalflag', '#6F191E'],
    ];
    steps.forEach(([t, d, icon, color], i) => {
      const card = el('div.card', { style: `border-left:8px solid ${color};display:flex;align-items:center;gap:14px` });
      card.appendChild(TG.assetImg(icon, { style: 'width:46px;height:46px;flex:none' }));
      card.appendChild(el('div', {}, [
        el('div', { style: 'font-family:var(--font-display);font-weight:800;font-size:19px;color:var(--navy)', text: (i + 1) + '. ' + t }),
        el('div.muted', { style: 'font-size:14px', text: d }),
      ]));
      wrap.appendChild(card);
    });
    const fin = el('div.card', { style: 'background:var(--navy);display:flex;align-items:center;gap:14px' });
    fin.appendChild(TG.assetImg('pokal', { style: 'width:44px;height:44px;flex:none' }));
    fin.appendChild(el('div', {}, [
      el('div', { style: 'font-family:var(--font-display);font-weight:800;font-size:18px;color:#fff', text: TX('Til sidst: The Great Team Derby', 'At the end: The Great Team Derby') }),
      el('div', { style: 'font-size:13px;color:rgba(233,220,200,.85)', text: TX('Finalen vejer dobbelt i løbspoint — der er altid plads til comeback.', 'The final counts double in Race Points — there is always room for a comeback.') }),
    ]));
    wrap.appendChild(fin);
    return wrap;
  }

  // ---------- SETUP ----------
  function setupView() {
    const me = S.me;
    const c = el('div.card');
    c.appendChild(el('div.eyebrow', { text: TX('Skab jeres stald', 'Create your stable') }));
    c.appendChild(el('h1', { text: TX('Navngiv jer', 'Name your team'), style: 'margin:6px 0 18px' }));
    const f = {};
    // Kladde overlever re-renders (state-pushes fra andre hold nulstiller ellers felterne)
    const d = ui.setupDraft || (ui.setupDraft = {});
    const mk = (lbl, key, val) => {
      const i = el('input', { type: 'text', value: d[key] != null ? d[key] : (val || ''), oninput: () => { d[key] = i.value; } });
      f[key] = i;
      return el('label.field', {}, [el('span.lbl', { text: lbl }), i]);
    };
    c.appendChild(mk(TX('Staldnavn', 'Stable name'), 'stableName', me.stableName));
    c.appendChild(mk(TX('Hestens navn', 'Horse name'), 'horseName', me.horseName));
    c.appendChild(mk(TX('Staldansvarlig (jeres kontaktperson)', 'Stable Manager (your contact person)'), 'managerName', me.managerName));
    const save = el('button.btn.block', { text: TX('Gem', 'Save') });
    save.addEventListener('click', () => TG.emit('team:setStable', { stableName: f.stableName.value, horseName: f.horseName.value, managerName: f.managerName.value }).then((r) => { if (r.ok) { ui.setupDraft = {}; toast(TX('Gemt', 'Saved'), 'ok'); } }));
    const ready = el('button.btn.gold.block', { text: me.ready ? TX('✓ Vi er klar (tryk for at fortryde)', '✓ We are ready (tap to undo)') : TX('Vi er klar!', 'We are ready!') , style: 'margin-top:10px' });
    ready.addEventListener('click', () => TG.emit('team:setStable', { stableName: f.stableName.value, horseName: f.horseName.value, managerName: f.managerName.value, ready: !me.ready }).then((r) => { if (r.ok) ui.setupDraft = {}; }));
    c.appendChild(save); c.appendChild(ready);
    return c;
  }

  // ---------- READY-CHECK ----------
  function readyWaitView() {
    const me = S.me;
    const w = el('div.big-center');
    if (me.ready) {
      const c = el('div', { style: 'text-align:center' });
      c.appendChild(el('h1', { html: TX('I er klar! ✓', 'You are ready! ✓') }));
      c.appendChild(el('p.muted', { style: 'margin-top:12px;font-size:18px', text: TX('Vent på de andre stalde…', 'Waiting for the other stables…') }));
      const un = el('button.btn.sm.ghost', { text: TX('Fortryd klar', 'Undo ready'), style: 'margin-top:18px' });
      un.addEventListener('click', () => TG.emit('team:ready', { ready: false }));
      c.appendChild(un);
      w.appendChild(c);
      return w;
    }
    const card = el('div.card', { style: 'max-width:460px;width:100%;text-align:center' });
    card.appendChild(el('h1', { text: TX('Er I klar?', 'Are you ready?'), style: 'font-size:30px' }));
    card.appendChild(el('p.muted', { style: 'margin:10px 0 16px', html: `<b>${me.stableName}</b><br>${TX('Hest', 'Horse')}: <b>${me.horseName || '—'}</b> · Jockey: <b>${me.jockeyName || '—'}</b>` }));
    const b = el('button.btn.gold.block.lg', { text: TX('Vi er klar!', 'We are ready!') });
    b.addEventListener('click', () => TG.emit('team:ready', { ready: true }).then(check));
    card.appendChild(b);
    w.appendChild(card);
    return w;
  }

  // ---------- PRE-SEASON ----------
  // Samme 7 faner som under runderne (og som vises på storskærmen) — men interaktivt:
  // tryk rundt, læs om funktionerne. Ingen belønninger endnu.
  const PS_TABS = [['tasks', '📋 Opgaver'], ['exercise', '🎯 Min øvelse'], ['money', '💰 Penge'], ['trade', '🔁 Byt'], ['house', '🏛️ Auktionshus'], ['invest', '📈 Invester'], ['bank', '🏦 Bank']];
  // Pre-season-gennemgang (v2.14): tabletten viser PRÆCIS prøverunde-skærmen,
  // og hosten fremhæver punkterne ét ad gangen (S.preseasonFocus).
  function preseasonView() {
    const c = el('div.col');
    const f = S.preseasonFocus;
    c.appendChild(head(TX('Planlægning', 'Planning'), f ? TX('Følg med — Løbslederen gennemgår opgaverne én ad gangen.', 'Follow along — the Race Director walks through the tasks one at a time.') : TX('Læg jeres taktik — det her møder I i Træningen om lidt.', 'Plan your tactics — this is what awaits you in the Training in a moment.')));
    c.appendChild(moneyContent());
    const stationer = el('div', { 'data-psfocus': 'stationer' });
    stationer.appendChild(el('div.eyebrow', { text: TX('🎯 Stationerne (frie for alle stalde)', '🎯 The Stations (free for all stables)'), style: 'margin-top:14px' }));
    stationer.appendChild(psCard(TX('Seks frie stationer', 'Six free stations'), TX('Cornhole, Hesteskohus, Jockey Guiding, Jonglér, Stabl Høballer og Æblefarm. Øv frit — men ved det OFFICIELLE forsøg skal hele stalden være samlet ved stationen. Succes giver Derby Dollars.', 'Cornhole, Horseshoe House, Jockey Guiding, Juggle, Stack the Hay Bales and Apple Farm. Practise freely — but for the OFFICIAL attempt the whole stable must be gathered at the station. Success earns Derby Dollars.')));
    c.appendChild(stationer);
    const faste = el('div', { 'data-psfocus': 'faste' });
    faste.appendChild(el('div.eyebrow', { text: TX('De faste opgaver (åbner når sæsonen starter)', 'The standing tasks (open when the season starts)'), style: 'margin-top:14px' }));
    faste.appendChild(psCard(TX('Puslespil', 'The Puzzle'), TX('Et langt team-puslespil. Fuldfør det før finalen og få jeres Derby-licens — uden den mister I et slag i finaleløbet.', 'A long team puzzle. Finish it before the final to earn your Derby Licence — without it you lose one roll in the final race.')));
    faste.appendChild(psCard(TX('Pynt jeres hest', 'Style your horse'), TX('Dekorér jeres hobbyhest. Bedømmes i den kreative showcase og giver bonus til staldværdien.', 'Decorate your hobby horse. Judged in the creative showcase and adds a bonus to your stable value.')));
    faste.appendChild(psCard(TX('Design jeres staldskilt', 'Design your stable sign'), TX('Staldens våbenskjold. Bedømmes også i showcasen.', "Your stable's coat of arms. Also judged in the showcase.")));
    c.appendChild(faste);
    applyPreseasonFocus(c);
    return c;
  }

  // Fremhæv hostens aktuelle punkt: dæmp resten, giv guldring + badge, scroll til det.
  function applyPreseasonFocus(root) {
    const f = S.preseasonFocus;
    if (!f) return;
    const sel = f === 'faste' ? '[data-psfocus="faste"]' : '[data-mtask="' + f + '"]';
    root.querySelectorAll('[data-mtask], [data-psfocus]').forEach((n) => {
      if (!n.matches(sel)) { n.style.opacity = '.25'; n.style.pointerEvents = 'none'; n.style.filter = 'grayscale(.5)'; }
    });
    const hit = root.querySelector(sel);
    if (!hit) return;
    hit.style.borderRadius = '14px';
    hit.style.boxShadow = '0 0 0 4px var(--gold), 0 12px 32px rgba(201,162,39,.35)';
    hit.prepend(el('div.chip.gold', { style: 'margin-bottom:8px;font-weight:800', text: TX('👉 Vi kigger på denne nu', '👉 We are looking at this one now') }));
    setTimeout(() => { try { hit.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {} }, 120);
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
      c.appendChild(psCard(TX('Puslespil', 'The Puzzle'), TX('Et langt team-puslespil. Fuldfør det før finalen og få jeres Derby-licens — uden den mister I et slag i finaleløbet.', 'A long team puzzle. Finish it before the final to earn your Derby Licence — without it you lose one roll in the final race.')));
      c.appendChild(psCard(TX('Pynt jeres hest', 'Style your horse'), TX('Dekorér jeres hobbyhest. Bedømmes i den kreative showcase og giver bonus til staldværdien.', 'Decorate your hobby horse. Judged in the creative showcase and adds a bonus to your stable value.')));
      c.appendChild(psCard(TX('Design jeres staldskilt', 'Design your stable sign'), TX('Staldens våbenskjold. Bedømmes også i showcasen.', "Your stable's coat of arms. Also judged in the showcase.")));
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
      c.appendChild(psCard('💰 Pengeopgaver', 'Hurtige Derby Dollars med cooldown — fordel jer, så I altid har noget i gang.'));
      c.appendChild(psCard('Tip en 13\'er', '13 spørgsmål på tabletten — 100 DD pr. rigtigt svar.'));
      c.appendChild(psCard('🕰️ Tidslinjen', 'Tabletten trækker 5 numre — find de ophængte kort i lokalet, og læg numrene i kronologisk rækkefølge. 300 DD pr. korrekt tidslinje.'));
      c.appendChild(psCard('🧩 Mind Puzzle', 'Byg banen på spillepladen efter opgavekortet — tabletten godkender selv. 300 DD pr. niveau, og banerne bliver sværere og sværere.'));
      c.appendChild(psCard('⚔️ Dysten', 'Udfordr en anden stald til en estimerings-duel (bedst af 3). Vinderen får 500 DD.'));
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
      c.appendChild(psCard('🏦 Staldkontoret', 'Her følger I Staldkassen (jeres Derby Dollars) og stillingen i løbspoint mod de andre stalde.'));
      c.appendChild(psCard('Sådan vinder I', 'Flest LØBSPOINT vinder. Placeringen i hvert løb giver point — finalen giver dobbelt. Derby Dollars tæller ikke i slutstillingen, så brug dem!'));
    }
    return c;
  }

  // ---------- PRE-SEASON PRØVERUNDE (spilbar: kun pengeopgaver + læsestof) ----------
  function preseasonRoundView() {
    const c = el('div.col');
    c.appendChild(head('Pre-season · prøverunden', 'Nu er det alvor på skrømt: Tjen jeres første Derby Dollars på pengeopgaverne — de tæller med i regnskabet!'));
    c.appendChild(moneyContent());
    if (!ui.tip13 && !ui.tidslinje && !ui.mindpuzzle) {
      c.appendChild(el('div.eyebrow', { text: 'Mens I venter på cooldown — læs om de faste opgaver', style: 'margin-top:14px' }));
      c.appendChild(psCard('Puslespil', 'Et langt team-puslespil, der åbner når sæsonen starter. Fuldfør det før finalen og få jeres Derby-licens — uden den mister I et slag i finaleløbet.'));
      c.appendChild(psCard(TX('Pynt jeres hest', 'Style your horse'), TX('Dekorér jeres hobbyhest. Bedømmes i den kreative showcase og giver bonus til staldværdien.', 'Decorate your hobby horse. Judged in the creative showcase and adds a bonus to your stable value.')));
      c.appendChild(psCard(TX('Design jeres staldskilt', 'Design your stable sign'), TX('Staldens våbenskjold. Bedømmes også i showcasen.', "Your stable's coat of arms. Also judged in the showcase.")));
    }
    return c;
  }

  // ---------- WARM-UP ----------
  function warmupView() {
    if (S.warmupPaid) return centerMsg('Startkapital modtaget!', 'I har fået <b>5.000 DD</b> i staldkassen.');
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
      if (outbid) t.appendChild(el('div.chip.warn', { style: 'margin-top:6px', text: TX('I er overbudt — byd igen!', 'You have been outbid — bid again!') }));
    }
    if (ex.lastPurchasePrice) t.appendChild(el('div.muted', { style: 'font-size:12px;margin-top:4px', text: 'Sidst solgt: ' + sd(ex.lastPurchasePrice) }));
    if (a.status === 'open') {
      const amt = el('input', { type: 'number', min: '1', placeholder: 'Bud i DD', value: ui.bids[ex.id] || '', style: 'margin-top:8px' });
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
    // v3: slank tablet — fire faner (byt/auktionshus/min-øvelse udgik)
    const nav = el('div.navbar');
    const tabs = [
      ['tasks', '📋', 'Opgaver'], ['stations', '🎯', 'Stationer'],
      ['paddock', '🏇', 'Paddocken'], ['bank', '🏦', 'Staldkontoret'],
    ];
    tabs.forEach(([k, ico, l]) => {
      const b = el('button' + (ui.sub === k ? '.active' : ''), {}, [
        el('span.nico', { text: ico }),
        el('span', { text: l }),
      ]);
      b.addEventListener('click', () => { ui.sub = k; render(); });
      nav.appendChild(b);
    });
    return nav;
  }

  // ---------- Forandringskort: banner + fejring ved nyt kort ----------
  function changeCardBar() {
    const cc = S.activeChangeCard;
    const key = cc.id + ':' + cc.playedAt;
    if (ui.ccKey !== key) {
      ui.ccKey = key;
      toast(cc.emoji + ' FORANDRINGSKORT: ' + cc.title, 'err');
      emojiBurst([cc.emoji, '🃏', '⚡']);
    }
    const bar = el('div', { style: 'background:var(--burgundy);color:#fff;padding:9px 14px;font-weight:700;font-size:14px;display:flex;gap:9px;align-items:center;position:sticky;top:0;z-index:9' });
    bar.appendChild(el('span', { style: 'font-size:19px', text: cc.emoji }));
    bar.appendChild(el('span', { text: cc.title + ' — ' + cc.text }));
    return bar;
  }

  // ---------- Gamification: penge-delta, konfetti og niveau-fejring ----------
  function celebrateChanges(me) {
    // Kontant-delta som flydende tal ved "Kontant"-metrikken
    const prev = ui.prevCash;
    ui.prevCash = me.cash;
    if (prev != null && me.cash !== prev) {
      const delta = me.cash - prev;
      const host = document.querySelector('.topbar .metrics .center');
      if (host) {
        const f = el('div.cash-float' + (delta > 0 ? '.plus' : '.minus'), { text: (delta > 0 ? '+' : '−') + money(Math.abs(delta)) + ' DD' });
        host.appendChild(f);
        f.animate([
          { opacity: 0, transform: 'translateY(0)' },
          { opacity: 1, transform: 'translateY(6px)', offset: 0.2 },
          { opacity: 1, transform: 'translateY(10px)', offset: 0.75 },
          { opacity: 0, transform: 'translateY(18px)' },
        ], { duration: 1600, easing: 'ease-out' }).onfinish = () => f.remove();
      }
      if (delta >= 300) emojiBurst(['🎉', '💰', '✨']);
    }
    // Niveau-fejring for hest og jockey
    if (ui.prevHorseLevel != null && me.horseLevel > ui.prevHorseLevel) {
      toast(`${me.horseName || 'Hesten'} nåede niveau ${me.horseLevel}! 🐎`, 'ok');
      emojiBurst(['🐎', '⭐', '✨']);
    }
    if (ui.prevJockeyLevel != null && me.jockeyLevel > ui.prevJockeyLevel) {
      toast(`${me.jockeyName || 'Jockeyen'} nåede niveau ${me.jockeyLevel}! 🏇`, 'ok');
      emojiBurst(['🏇', '⭐', '✨']);
    }
    ui.prevHorseLevel = me.horseLevel;
    ui.prevJockeyLevel = me.jockeyLevel;
  }
  function emojiBurst(emojis) {
    if (document.querySelector('.burst-wrap')) return; // én ad gangen
    const wrap = el('div.burst-wrap');
    for (let i = 0; i < 10; i++) {
      const s = el('span', { text: emojis[i % emojis.length] });
      const x = 15 + Math.random() * 70;
      s.style.left = x + '%';
      s.style.bottom = '-30px';
      wrap.appendChild(s);
      s.animate([
        { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
        { transform: `translateY(-${45 + Math.random() * 35}vh) rotate(${(Math.random() - 0.5) * 260}deg)`, opacity: 0 },
      ], { duration: 1100 + Math.random() * 600, easing: 'cubic-bezier(.15,.6,.4,1)', delay: Math.random() * 180 });
    }
    document.body.appendChild(wrap);
    setTimeout(() => wrap.remove(), 2100);
  }

  // Niveau-progressbar: point optjent mod næste niveau
  function levelBar(points, level, thresholds, maxLevel) {
    const t = thresholds || [3, 7, 12, 18];
    const max = maxLevel || 4;
    if (level >= max) {
      return el('div', {}, [
        el('div.lvlbar.maxed', {}, [el('i', { style: 'width:100%' })]),
        el('div.lvlhint', { text: 'Maks. niveau! 🏆' }),
      ]);
    }
    const prevT = level > 0 ? t[level - 1] : 0;
    const nextT = t[level];
    const pct = Math.max(4, Math.min(100, Math.round(((points - prevT) / (nextT - prevT)) * 100)));
    return el('div', {}, [
      el('div.lvlbar', {}, [el('i', { style: `width:${pct}%` })]),
      el('div.lvlhint', { text: `${points}/${nextT} point til niv. ${level + 1}` }),
    ]);
  }

  function dashboardView() {
    switch (ui.sub) {
      case 'stations': return stationsView();
      case 'paddock': return paddockView();
      case 'bank': return bankView();
      default: return tasksView();
    }
  }

  // ---------- STATIONER (v3: frie stationer — ingen ejerskab) ----------
  function stationsView() {
    const me = S.me;
    const c = el('div.col');
    c.appendChild(head(TX('Stationer', 'Stations'), TX('Frie for alle stalde — øv frit, og kald en Løbsleder til det officielle forsøg.', 'Free for all stables — practise freely, and call a Race Director for the official attempt.')));
    c.appendChild(el('div', { style: 'background:var(--navy);color:var(--on-navy);border-radius:12px;padding:10px 14px;font-weight:700;font-size:14px', html: TX('⚑ Involverings-reglen: HELE stalden skal være samlet ved stationen under det officielle forsøg — ellers intet resultat.', '⚑ The involvement rule: the WHOLE stable must be gathered at the station during the official attempt — otherwise no result.') }));
    if (ui.stationDetail) {
      const ex = (S.auction.exercises || []).find((e) => e.id === ui.stationDetail);
      if (ex) {
        c.appendChild(backBtn(() => { ui.stationDetail = null; render(); }));
        c.appendChild(stationCard(ex, true));
        return c;
      }
      ui.stationDetail = null;
    }
    const grid = el('div.grid', { style: 'grid-template-columns:1fr 1fr' });
    (S.auction.exercises || []).forEach((ex) => {
      const cd = cooldownLeft(ex.id);
      const st = me.taskStatus[ex.id] || {};
      const t = el('div', { class: 'ex-tile cat-top-money' });
      t.appendChild(el('div.row.between', {}, [
        el('h3', { text: ex.name, style: 'margin:0' }),
        st.pending ? el('span.chip.gold', { text: TX('Afventer', 'Pending') }) : cd ? el('span.chip', { text: '⏱ ' + cd }) : el('span.chip.turf', { text: TX('Klar', 'Ready') }),
      ]));
      t.appendChild(el('p.muted', { text: ex.short, style: 'font-size:13px;min-height:32px' }));
      t.appendChild(el('div.row.between', { style: 'margin-top:4px' }, [
        el('span.muted', { style: 'font-size:12px', text: TX('Næste belønning', 'Next reward') }),
        el('span.num', { style: 'font-weight:800;color:var(--turf)', text: sd(ex.nextReward) }),
      ]));
      t.addEventListener('click', () => { ui.stationDetail = ex.id; render(); });
      grid.appendChild(t);
    });
    c.appendChild(grid);
    return c;
  }

  function stationCard(ex, withAction) {
    const me = S.me;
    const cd = cooldownLeft(ex.id);
    const st = me.taskStatus[ex.id] || {};
    const card = el('div.card', { class: 'cat-top-money' });
    card.appendChild(el('h2', { text: ex.name, style: 'margin:4px 0' }));
    card.appendChild(el('div.finish-stripe', { style: 'margin:8px 0' }));
    card.appendChild(el('p', { text: ex.description }));
    card.appendChild(el('div.row.between', { style: 'margin-top:10px' }, [
      el('span.muted', { text: TX('Næste belønning', 'Next reward') }),
      el('span.num', { style: 'font-size:24px;color:var(--turf)', text: sd(ex.nextReward) }),
    ]));
    card.appendChild(el('p.muted', { style: 'font-size:12px;margin-top:4px', text: TX('Belønningen falder for hver succes, jeres stald har på stationen — spred jer!', 'The reward decreases with every success your stable has at this station — spread out!') }));
    if (withAction) {
      const btn = el('button.btn.gold.block.lg', { text: cd ? `Cooldown ${cd}` : TX('Kald Løbsleder — officielt forsøg', 'Call a Race Director — official attempt'), style: 'margin-top:14px', disabled: cd ? 'true' : null });
      btn.setAttribute('data-cooldown', ex.id);
      btn.addEventListener('click', () => TG.emit('team:exerciseAttempt', { exerciseId: ex.id }).then((r) => { check(r); if (r.ok) toast(TX('Løbsleder tilkaldt — saml HELE stalden ved stationen!', 'Race Director called — gather the WHOLE stable at the station!'), 'ok'); }));
      card.appendChild(btn);
      if (st.pending) card.appendChild(el('div.chip.gold', { style: 'margin-top:8px', text: TX('Afventer Løbslederens vurdering', "Awaiting the Race Director's verdict") }));
    }
    return card;
  }

  function tasksView() {
    const me = S.me;
    const c = el('div.col');
    c.appendChild(myStableCard());
    c.appendChild(head(TX('Opgaver', 'Tasks'), TX('Sponsoropgaver og faste opgaver — altid tilgængelige, prioritér frit.', 'Sponsor Tasks and standing tasks — always available, prioritise freely.')));
    c.appendChild(rolesCard());
    // v3: Sponsoropgaverne (pengeopgaver) bor i Opgaver-fanen — Penge-fanen udgik
    c.appendChild(el('div.eyebrow', { text: TX('💰 Sponsoropgaver — staldens pengemaskine', "💰 Sponsor Tasks — your stable's money machine") }));
    c.appendChild(moneyContent());
    c.appendChild(el('div.eyebrow', { text: TX('📌 Faste opgaver', '📌 Standing tasks'), style: 'margin-top:14px' }));
    const defs = [['puzzle', TX('Puslespil', 'The Puzzle'), TX('Fuldfør for Derby-licens.', 'Finish it for your Derby Licence.')], ['horseStyling', TX('Pynt jeres hest', 'Style your horse'), TX('Bedømmes i showcase.', 'Judged in the showcase.')], ['stableSign', TX('Design jeres staldskilt', 'Design your stable sign'), TX('Bedømmes i showcase.', 'Judged in the showcase.')]];
    defs.forEach(([id, name, desc]) => {
      const st = me.taskStatus[id] || {};
      const card = el('div.card');
      card.appendChild(el('div.row.between', {}, [el('h3', { text: name }), st.completed ? el('span.chip.turf', { text: TX('✓ Godkendt', '✓ Approved') }) : st.pending ? el('span.chip.gold', { text: TX('Afventer Løbslederen', 'Awaiting Race Director') }) : null]));
      card.appendChild(el('p.muted', { text: desc, style: 'margin:6px 0' }));
      if (!st.completed) { const b = el('button.btn.sm', { text: st.pending ? TX('Bad om godkendelse ✓', 'Approval requested ✓') : TX('Kald Løbslederen til godkendelse', 'Call the Race Director'), disabled: st.pending ? 'true' : null }); b.addEventListener('click', () => TG.emit('team:requestApproval', { taskId: id }).then(check)); card.appendChild(b); }
      c.appendChild(card);
    });
    return c;
  }

  // Visuelt overblik over stalden — hest, jockey, stald og terning
  function myStableCard() {
    const me = S.me;
    const stars = (lvl) => '★'.repeat(lvl) + '☆'.repeat(Math.max(0, 4 - lvl));
    const card = el('div.card', { style: `border-top:6px solid ${me.color.hex};background:linear-gradient(150deg,#fff 55%,#E9DCC8)` });
    const top = el('div.row', { style: 'gap:14px;align-items:center' });
    top.appendChild(TG.tintedAsset('hest-silhuet', me.color.hex, { style: 'width:74px;height:74px;flex:none' }));
    const info = el('div', { style: 'flex:1;min-width:0' });
    info.appendChild(el('div', { style: 'font-family:var(--font-display);font-weight:800;font-size:22px;color:var(--navy);line-height:1.1', text: me.stableName }));
    info.appendChild(el('div.muted', { style: 'font-size:13px;margin-top:2px', text: `${me.horseName || TX('Hesten', 'The horse')} & ${me.jockeyName || TX('jockeyen', 'the jockey')}` }));
    info.appendChild(el('div', { style: 'margin-top:6px' }, [el('span.chip.gold', { text: `🎲 ${TX('Terning', 'Dice')} ${me.dice.min}–${me.dice.max}` })]));
    top.appendChild(info);
    card.appendChild(top);
    card.appendChild(el('div.finish-stripe', { style: 'margin:12px 0' }));
    const grid = el('div.grid', { style: 'grid-template-columns:1fr 1fr 1fr;gap:8px' });
    const cell = (label, star, value, bar) => el('div', { style: 'text-align:center;background:#fff;border:1px solid var(--line);border-radius:12px;padding:8px 6px' }, [
      el('div', { style: 'font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--text-faint);font-weight:700', text: label }),
      star != null ? el('div', { style: 'color:var(--gold);font-size:14px;letter-spacing:2px', text: star }) : el('div', { style: 'height:4px' }),
      el('div', { style: 'font-family:var(--font-num);font-weight:800;font-size:16px;color:var(--navy)', text: money(value) }),
      bar || null,
    ]);
    // v3: jockey-cellen viser den HYREDE jockey (jockey-auktionen) — niveauer udgik
    const jockeyCell = el('div', { style: 'text-align:center;background:#fff;border:1px solid var(--line);border-radius:12px;padding:8px 6px' }, [
      el('div', { style: 'font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--text-faint);font-weight:700', text: 'Jockey' }),
      el('div', { style: 'font-size:16px', text: me.jockey ? (me.jockey.emoji || '🏇') : '—' }),
      el('div', { style: 'font-family:var(--font-display);font-weight:800;font-size:13px;color:var(--navy)', text: me.jockey ? me.jockey.name : TX('Ingen hyret', 'None hired') }),
      el('div.muted', { style: 'font-size:10px', text: me.jockey ? TX('Kun denne sæson', 'This season only') : TX('Hyres i Paddocken', 'Hire in the Paddock') }),
    ]);
    grid.appendChild(cell(TX('Hest', 'Horse'), null, me.horseValue));
    grid.appendChild(jockeyCell);
    grid.appendChild(cell(TX('Stald', 'Stable'), null, me.stableValue));
    card.appendChild(grid);
    const foot = el('div.row.between', { style: 'margin-top:10px;align-items:baseline' });
    foot.appendChild(el('span.muted', { style: 'font-size:12px', text: me.derbyLicense ? TX('🎫 Derby-licens i hus', '🎫 Derby Licence secured') : TX('Ingen Derby-licens endnu — byg puslespillet!', 'No Derby Licence yet — build the puzzle!') }));
    foot.appendChild(el('span', { style: 'font-family:var(--font-num);font-weight:800;font-size:18px;color:var(--burgundy)', text: TX('Total ', 'Total ') + sd(me.totalValue) }));
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
    const editBtn = el('button.btn.sm.ghost', { text: ui.editRoles ? TX('Luk', 'Close') : (hasRoles ? TX('Rotér', 'Rotate') : TX('Fordel roller', 'Assign roles')) });
    editBtn.addEventListener('click', () => { ui.editRoles = !ui.editRoles; render(); });
    card.appendChild(el('div.row.between', {}, [el('h3', { text: TX('Rollekort', 'Role cards') }), editBtn]));
    if (rotationDue) card.appendChild(el('div.chip.gold', { style: 'margin:6px 0', text: `${TX('Sæson', 'Season')} ${S.currentRound} — ${TX('tid til at rotere rollerne!', 'time to rotate the roles!')}` }));
    if (ui.editRoles) {
      const inputs = {};
      roleDefs.forEach((r) => {
        const i = el('input', { type: 'text', value: (me.roles || {})[r.id] || '', placeholder: (S.lang === 'en' && r.descEn) || r.desc });
        inputs[r.id] = i;
        card.appendChild(el('label.field', { style: 'margin-top:6px' }, [el('span.lbl', { text: (S.lang === 'en' && r.labelEn) || r.label }), i]));
      });
      const save = el('button.btn.gold.block', { text: TX('Gem roller', 'Save roles'), style: 'margin-top:8px' });
      save.addEventListener('click', () => {
        const roles = {}; Object.entries(inputs).forEach(([k, i]) => { if (i.value.trim()) roles[k] = i.value; });
        TG.emit('team:setRoles', { roles }).then((r) => { check(r); if (r.ok) { ui.editRoles = false; toast(TX('Roller gemt', 'Roles saved'), 'ok'); } });
      });
      card.appendChild(save);
    } else if (hasRoles) {
      roleDefs.forEach((r) => {
        const name = (me.roles || {})[r.id];
        if (name) card.appendChild(el('div.row.between', { style: 'font-size:14px;padding:4px 0;border-bottom:1px dashed var(--line)' }, [el('span.muted', { text: (S.lang === 'en' && r.labelEn) || r.label }), el('b', { text: name })]));
      });
    } else {
      card.appendChild(el('p.muted', { style: 'margin-top:6px', text: TX('Fordel rollerne, så alle har en funktion — og rotér dem hver sæson.', 'Assign the roles so everyone has a job — and rotate them every season.') }));
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
      card.appendChild(el('div.row.between', {}, [el('span.muted', { text: TX('Næste belønning', 'Next reward') }), el('span.num', { style: 'font-size:24px;color:var(--gold)', text: sd(ex.nextReward) })]));
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
    card.appendChild(el('span.cat.money', { text: TX('Penge', 'Money') }));
    card.appendChild(el('h2', { text: 'Mind Puzzle — Horse Academy', style: 'margin:4px 0' }));

    // Ingen data hentet endnu → hent (viser aktuelt niveau) + eksempel fra opgavebogen
    if (!mp || !mp.data) {
      card.appendChild(el('p.muted', { text: TX('Byg banen på spillepladen, så hesten kommer fra start til mål og hopper over forhindringerne i rækkefølgen på opgavekortet. Godkendelsen klarer tabletten — ingen løbsleder nødvendig.', 'Build the course on the game board so the horse gets from start to finish, jumping the obstacles in the order shown on the task card. The tablet handles approval — no Race Director needed.') }));
      card.appendChild(el('img', { src: '/assets/mindpuzzle/eksempel.jpg', alt: 'Eksempel fra opgavebogen', style: 'width:100%;max-height:360px;object-fit:contain;background:#e8f4f8;border-radius:12px;border:1px solid var(--line);margin:10px 0 4px' }));
      card.appendChild(el('p.muted', { style: 'font-size:12px', text: TX('Sådan læses et opgavekort: CHALLENGE (venstre) viser forhindringernes rækkefølge — her Y→B→D→E→G→J→B og mål ved den røde bom. SOLUTION (højre) viser banen færdigbygget.', 'How to read a task card: CHALLENGE (left) shows the obstacle order — here Y→B→D→E→G→J→B with the finish at the red bar. SOLUTION (right) shows the finished course.') }));
      const b = el('button.btn.gold.block.lg', { text: TX('Vis vores niveau', 'Show our level'), style: 'margin-top:12px' });
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
        el('h3', { text: TX('ALLE 20 NIVEAUER GENNEMFØRT!', 'ALL 20 LEVELS COMPLETE!') }),
        el('p.muted', { text: TX('Vildt godt gået — flere niveauer er der ikke.', 'Seriously well done — there are no more levels.') }),
      ]));
      wrap.appendChild(card);
      return wrap;
    }

    card.appendChild(el('div.row.between', { style: 'margin:4px 0' }, [
      el('span.chip.turf', { text: `${TX('Niveau', 'Level')} ${d.level} ${TX('af', 'of')} ${d.totalLevels} · ${d.tier}` }),
      el('span.num', { style: 'color:var(--gold)', text: '+' + sd(d.nextReward) }),
    ]));

    // Resultat efter tjek
    if (mp.result) {
      const r = mp.result;
      if (r.approved) {
        card.appendChild(el('div.center', { style: 'padding:16px' }, [
          el('div', { style: 'font-size:38px', text: '✅' }),
          el('h3', { text: `${TX('Niveau', 'Level')} ${r.level} ${TX('godkendt!', 'approved!')}` }),
          el('p', { html: `+ <b>${sd(r.reward)}</b> ${TX('er sat ind på kontoen.', 'has been added to your account.')}` }),
          r.done ? el('p', { style: 'margin-top:6px', text: TX('🏆 I har gennemført ALLE niveauer!', '🏆 You have completed ALL the levels!') }) : el('p.muted', { style: 'margin-top:6px', text: TX('Næste niveau låses op, når cooldown er udløbet.', 'The next level unlocks when the cooldown expires.') }),
        ]));
        const b = el('button.btn.block', { text: TX('Videre', 'Continue') });
        b.addEventListener('click', () => { ui.mindpuzzle = null; render(); });
        card.appendChild(b);
      } else {
        card.appendChild(el('div.center', { style: 'padding:16px' }, [
          el('div', { style: 'font-size:38px', text: '❌' }),
          el('h3', { text: TX('Det matcher ikke banen', "That doesn't match the course") }),
          el('p.muted', { text: `${TX('Tjek jeres løsning og prøv igen om', 'Check your solution and try again in')} ${r.penaltySeconds || 60} ${TX('sekunder. I får nye kontrolspørgsmål.', 'seconds. You will get new control questions.')}` }),
        ]));
        const b = el('button.btn.block', { text: TX('Tilbage til opgaven', 'Back to the task') });
        b.addEventListener('click', () => { ui.mindpuzzle = null; mpLoad(); });
        card.appendChild(b);
      }
      wrap.appendChild(card);
      return wrap;
    }

    // Kontrolspørgsmål (godkendelsesflow)
    if (mp.checking) {
      card.appendChild(el('p.muted', { style: 'margin:6px 0', text: TX('Svar ud fra jeres byggede bane — lad den stå urørt, mens I svarer!', 'Answer based on the course you built — leave it untouched while you answer!') }));
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
      const submit = el('button.btn.gold.block.lg', { text: TX('Godkend vores løsning', 'Approve our solution'), style: 'margin-top:8px', disabled: ready ? null : 'true' });
      submit.addEventListener('click', () => {
        const answers = d.questions.map((_, qi) => mp.answers[qi]);
        TG.emit('team:mindpuzzleSubmit', { answers }).then((r) => { if (!r.ok) return check(r); mp.result = r; render(); });
      });
      card.appendChild(submit);
      const back = el('button.btn.sm.ghost.block', { text: TX('← Tilbage (banen er ikke klar)', "← Back (the course isn't ready)"), style: 'margin-top:6px' });
      back.addEventListener('click', () => { mp.checking = false; mp.answers = {}; render(); });
      card.appendChild(back);
      wrap.appendChild(card);
      return wrap;
    }

    // Opgavevisning: challenge-billede + start godkendelse
    card.appendChild(el('p.muted', { style: 'margin:4px 0', text: TX('Byg banen så hesten rider fra start-bogstavet, hopper over forhindringerne i rækkefølgen herunder og ender ved den røde bom.', 'Build the course so the horse rides from the start letter, jumps the obstacles in the order below and finishes at the red bar.') }));
    const img = el('img', { src: d.image, alt: `Challenge ${d.book}`, style: 'width:100%;max-height:420px;object-fit:contain;background:#e8f4f8;border-radius:12px;border:1px solid var(--line);margin:8px 0' });
    card.appendChild(img);
    card.appendChild(el('p.muted', { style: 'font-size:12px', text: TX(`Hæftets challenge ${d.book} · Når banen er bygget, stiller tabletten ${d.questions.length} kontrolspørgsmål om jeres løsning.`, `Booklet challenge ${d.book} · Once the course is built, the tablet asks ${d.questions.length} control questions about your solution.`) }));
    const go = el('button.btn.gold.block.lg', { text: cd ? `Cooldown ${cd}` : TX('Vi er færdige — godkend banen', 'We are done — approve the course'), style: 'margin-top:10px', disabled: cd ? 'true' : null });
    go.setAttribute('data-cooldown', 'mindpuzzle');
    go.addEventListener('click', () => {
      // Hent friske spørgsmål lige inden tjek (nyt tilfældigt udtræk)
      TG.emit('team:mindpuzzleGet').then((r) => {
        if (!r.ok) return check(r);
        if (r.cooldownLeft) { toast(TX('Cooldown — vent lidt endnu.', 'Cooldown — wait a little longer.'), 'err'); return; }
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
    c.appendChild(head('Pengeopgaver', 'Løs for Derby Dollars. Cooldown efter hvert forsøg.'));
    c.appendChild(moneyContent());
    return c;
  }
  // Genbruges af både runde-dashboardet og pre-season-prøverunden
  function moneyContent() {
    const c = el('div.col');
    const off = (S.disabled && S.disabled.moneyTasks) || [];
    if (ui.tip13) { c.appendChild(tip13Card()); return c; }
    if (ui.tidslinje) { c.appendChild(tidslinjeCard()); return c; }
    if (!off.includes('tip13')) c.appendChild(taskLauncher(TX("Tip en 13'er", 'Lucky 13'), TX('13 spørgsmål — 100 DD pr. rigtige.', '13 questions — 100 DD per correct answer.'), 'tip13', () => TG.emit('team:tip13Get').then((r) => { if (!r.ok) return check(r); ui.tip13 = { data: r, answers: {}, result: null }; render(); })));
    if (!off.includes('tidslinje')) c.appendChild(taskLauncher(TX('🕰️ Tidslinjen', '🕰️ The Timeline'), TX('I trækker 5 numre — find kortene i lokalet og læg dem i kronologisk rækkefølge. 300 DD.', 'You draw 5 numbers — find the cards in the room and put them in chronological order. 300 DD.'), 'tidslinje', () => TG.emit('team:tidslinjeGet').then((r) => { if (!r.ok) return check(r); if (r.cooldownLeft) return toast(TX('Tidslinjen er på cooldown.', 'The Timeline is on cooldown.'), 'err'); ui.tidslinje = { cards: r.cards, order: r.cards.slice(), reward: r.nextReward, result: null }; render(); })));
    if (!off.includes('mindpuzzle')) { const mp = mindpuzzleCard(); mp.setAttribute('data-mtask', 'mindpuzzle'); c.appendChild(mp); }
    if (!off.includes('dyst')) { const dy = dystCard(); dy.setAttribute('data-mtask', 'dyst'); c.appendChild(dy); }
    if (!c.children.length) c.appendChild(el('div.card', {}, [el('p.muted', { text: TX('Ingen pengeopgaver er åbne lige nu — spørg Løbslederen.', 'No sponsor tasks are open right now — ask the Race Director.') })]));
    return c;
  }
  function taskLauncher(name, desc, key, onStart) {
    const cd = cooldownLeft(key);
    const card = el('div.card');
    card.setAttribute('data-mtask', key);
    card.appendChild(el('div.row.between', {}, [el('h3', { text: name }), cd ? el('span.chip.red', { text: 'Cooldown ' + cd, 'data-cooldown': key }) : null]));
    card.appendChild(el('p.muted', { text: desc, style: 'margin:6px 0' }));
    const b = el('button.btn.block', { text: 'Start', disabled: cd ? 'true' : null }); b.addEventListener('click', onStart); card.appendChild(b);
    return card;
  }
  function tip13Card() {
    const { data, result } = ui.tip13;
    const card = el('div.card');
    card.appendChild(el('div.row.between', {}, [el('h3', { text: TX("Tip en 13'er", 'Lucky 13') }), backBtn(() => { ui.tip13 = null; render(); })]));
    if (result) {
      card.appendChild(el('div.center', { style: 'padding:20px' }, [el('div.stat.big', {}, [el('div.k', { text: TX('Resultat', 'Result') }), el('div.v', { text: result.correct + '/' + result.total })]), el('p', { style: 'margin-top:8px', html: '+ <b>' + sd(result.reward) + '</b>' })]));
      const done = el('button.btn.block', { text: TX('Færdig', 'Done') }); done.addEventListener('click', () => { ui.tip13 = null; render(); }); card.appendChild(done);
      return card;
    }
    data.questions.forEach((q) => {
      const box = el('div', { style: 'margin-bottom:10px' });
      box.appendChild(el('div', { style: 'font-weight:600', text: (q.i + 1) + '. ' + q.q }));
      const row = el('div.row', { style: 'margin-top:4px' });
      q.options.forEach((opt, oi) => { const b = el('button.btn.sm.ghost', { text: opt, style: 'flex:1' }); if (ui.tip13.answers[q.i] === oi) b.classList.add('gold'); b.addEventListener('click', () => { ui.tip13.answers[q.i] = oi; render(); }); row.appendChild(b); });
      box.appendChild(row); card.appendChild(box);
    });
    const submit = el('button.btn.gold.block.lg', { text: TX('Aflever', 'Submit') });
    submit.addEventListener('click', () => { const answers = data.questions.map((q) => ui.tip13.answers[q.i]); TG.emit('team:tip13Submit', { answers }).then((r) => { if (!r.ok) return check(r); ui.tip13.result = r; render(); }); });
    card.appendChild(submit);
    return card;
  }
  // Tidslinjen v2: 5 tilfældige numre — find de ophængte kort, læg numrene i rækkefølge.
  function tidslinjeCard() {
    const T = ui.tidslinje;
    const card = el('div.card.cat-top-money');
    card.appendChild(el('div.row.between', {}, [el('h3', { text: TX('🕰️ Tidslinjen', '🕰️ The Timeline') }), backBtn(() => { ui.tidslinje = null; render(); })]));
    if (T.result) {
      if (T.result.success) {
        card.appendChild(el('div.center', { style: 'padding:14px' }, [
          el('div', { style: 'font-size:38px', text: '✅' }),
          el('h2', { text: TX('Korrekt rækkefølge!', 'Correct order!') }),
          el('p', { style: 'margin-top:6px', html: '+ <b>' + sd(T.result.reward) + '</b>' }),
        ]));
        (T.result.correctLabels || []).forEach((l, i) => card.appendChild(el('div.muted', { style: 'font-size:13px;padding:2px 0', text: `${i + 1}. ${TX('Kort', 'Card')} ${T.result.correctCards[i]} — ${l}` })));
      } else {
        card.appendChild(el('div.center', { style: 'padding:14px' }, [
          el('div', { style: 'font-size:38px', text: '❌' }),
          el('h2', { text: TX('Ikke helt rigtigt', 'Not quite right') }),
          el('p.muted', { style: 'margin-top:6px', text: TX('I får et nyt træk, når cooldown er udløbet.', 'You get a new draw when the cooldown expires.') }),
        ]));
      }
      const done = el('button.btn.block', { text: TX('Færdig', 'Done') }); done.addEventListener('click', () => { ui.tidslinje = null; render(); }); card.appendChild(done);
      return card;
    }
    card.appendChild(el('p.muted', { style: 'margin:6px 0', text: TX('Jeres 5 kort hænger i lokalet — find numrene, og læg dem her i KRONOLOGISK rækkefølge (ældst øverst).', 'Your 5 cards are hanging in the room — find the numbers and place them here in CHRONOLOGICAL order (oldest at the top).') }));
    const list = el('div.list-move');
    T.order.forEach((n, idx) => {
      const item = el('div.item');
      item.appendChild(el('span.badge', { style: 'width:44px;height:44px;background:var(--navy);font-size:18px', text: String(n) }));
      item.appendChild(el('span', { style: 'flex:1;font-weight:700', text: TX('Kort ', 'Card ') + n }));
      const up = el('button.btn.sm.ghost', { text: '▲', disabled: idx === 0 ? 'true' : null }); up.addEventListener('click', () => { const a = T.order; [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; render(); });
      const dn = el('button.btn.sm.ghost', { text: '▼', disabled: idx === T.order.length - 1 ? 'true' : null }); dn.addEventListener('click', () => { const a = T.order; [a[idx + 1], a[idx]] = [a[idx], a[idx + 1]]; render(); });
      item.appendChild(up); item.appendChild(dn); list.appendChild(item);
    });
    card.appendChild(list);
    const submit = el('button.btn.gold.block.lg', { text: TX('Aflever rækkefølge', 'Submit order') + ' (+' + money(T.reward) + ' DD)', style: 'margin-top:10px' });
    submit.addEventListener('click', () => TG.emit('team:tidslinjeSubmit', { orderedNumbers: T.order }).then((r) => { if (!r.ok) return check(r); T.result = r; render(); }));
    card.appendChild(submit);
    return card;
  }
  function dystCard() {
    const me = S.me;
    const cd = cooldownLeft('dyst');
    const card = el('div.card');
    card.appendChild(el('h3', { text: TX('Dysten', 'The Duel') }));
    card.appendChild(el('p.muted', { text: TX('Udfordr en anden stald til estimerings-duel (bedst af 3).', 'Challenge another stable to an estimation duel (best of 3).'), style: 'margin:6px 0' }));
    // aktive dueller
    (S.duels || []).forEach((d) => card.appendChild(duelRow(d)));
    if (!(S.duels || []).some((d) => ['pending', 'active'].includes(d.status))) {
      const sel = el('select');
      sel.appendChild(el('option', { value: '', text: TX('Vælg modstander…', 'Choose an opponent…') }));
      S.teams.filter((t) => t.id !== me.id && t.joined).forEach((t) => sel.appendChild(el('option', { value: t.id, text: t.stableName })));
      const b = el('button.btn.block', { text: TX('Udfordr', 'Challenge'), disabled: cd ? 'true' : null, style: 'margin-top:8px' });
      if (cd) b.setAttribute('data-cooldown', 'dyst');
      b.addEventListener('click', () => { if (!sel.value) return toast(TX('Vælg en modstander.', 'Choose an opponent.'), 'err'); TG.emit('team:duelChallenge', { toTeamId: sel.value }).then(check); });
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
      const acc = el('button.btn.sm.turf', { text: TX('Tag imod', 'Accept') }); acc.addEventListener('click', () => TG.emit('team:duelRespond', { duelId: d.id, accept: true }).then(check));
      const dec = el('button.btn.sm.ghost', { text: TX('Afvis', 'Decline') }); dec.addEventListener('click', () => TG.emit('team:duelRespond', { duelId: d.id, accept: false }));
      row.appendChild(acc); row.appendChild(dec); box.appendChild(row);
    } else if (d.status === 'pending') box.appendChild(el('p.muted', { style: 'margin-top:6px', text: TX('Afventer modstanderens svar…', "Waiting for the opponent's answer…") }));
    else if (d.status === 'active') {
      const mine = d.submitted[me.id];
      if (mine) box.appendChild(el('p.muted', { style: 'margin-top:6px', text: TX('Afventer den anden stald…', 'Waiting for the other stable…') }));
      else {
        ui.dyst[d.id] = ui.dyst[d.id] || {};
        d.questions.forEach((q, i) => { const inp = el('input', { type: 'number', placeholder: q.unit, value: ui.dyst[d.id][i] || '', style: 'margin-top:6px' }); inp.addEventListener('input', () => { ui.dyst[d.id][i] = inp.value; }); box.appendChild(el('div', { style: 'font-weight:600;margin-top:8px', text: (i + 1) + '. ' + q.q })); box.appendChild(inp); });
        const sb = el('button.btn.gold.block', { text: TX('Aflever svar', 'Submit answers'), style: 'margin-top:10px' });
        sb.addEventListener('click', () => TG.emit('team:duelSubmit', { duelId: d.id, answers: d.questions.map((q, i) => Number(ui.dyst[d.id][i] || 0)) }).then(check));
        box.appendChild(sb);
      }
    } else if (d.status === 'resolved') {
      const win = d.winnerTeamId === me.id ? TX('I vandt! 🏆', 'You won! 🏆') : d.winnerTeamId ? TX('I tabte.', 'You lost.') : TX('Uafgjort.', 'Draw.');
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
    const extra = el('input', { type: 'number', min: '0', placeholder: 'Ekstra betaling fra jer (DD)', style: 'margin-top:8px' });
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
      const rej = el('button.btn.ghost', { text: TX('Afvis', 'Decline') }); rej.addEventListener('click', () => TG.emit('team:tradeRespond', { tradeId: t.id, accept: false }));
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
      const b = el('button.btn.block', { text: `Byt hertil (${money(fee)} DD)` });
      b.addEventListener('click', () => TG.emit('team:exchange', { targetExerciseId: ex.id }).then((r) => { check(r); if (r.ok) toast('Byttet!', 'ok'); }));
      card.appendChild(b); c.appendChild(card);
    });
    return c;
  }

  // ---------- INVEST / LØBSDAGSØKONOMI (v2.16) ----------
  // Varige point tjenes KUN på øvelser. Penge køber løbsdags-boosts (ét løb) og stald-værdi.
  function investContent(locked) {
    const wrap = el('div.col');
    wrap.appendChild(boostShop(locked));
    // Stald: sikker varig værdi
    const card = el('div.card.cat-top-money');
    const hd = el('div.row', { style: 'align-items:center;gap:10px' });
    hd.appendChild(TG.assetImg('hestesko', { style: 'width:30px;height:30px' }));
    hd.appendChild(el('h3', { text: TX('Stalden (varig værdi)', 'The stable (lasting value)') }));
    card.appendChild(hd);
    ((S.config.investmentOptions || {}).stable || []).forEach((p) => {
      const bought = (S.me.investmentsMade || {})[p.id] >= (S.config.maxPurchasesPerOption || 1);
      const row = el('div.row.between', { style: 'padding:8px 0;border-bottom:1px dashed var(--line)' });
      row.appendChild(el('div', {}, [el('b', { text: (S.lang === 'en' && p.labelEn) || p.label }), el('div.muted', { style: 'font-size:13px', text: `+${money(p.valueIncrease)} ${TX('værdi', 'value')}` })]));
      const b = el('button.btn.sm', { text: bought ? TX('✓ Købt', '✓ Bought') : money(p.cost) + ' DD', disabled: (bought || locked) ? 'true' : null });
      if (!bought && !locked) b.addEventListener('click', () => TG.emit('team:invest', { assetType: 'stable', productId: p.id }).then((r) => { check(r); if (r.ok) toast(TX('Investeret', 'Invested'), 'ok'); }));
      row.appendChild(b); card.appendChild(row);
    });
    wrap.appendChild(card);
    return wrap;
  }

  // Løbsdags-boosts: gælder KUN næste løb — forbruges når løbet er kørt
  function boostShop(locked) {
    const card = el('div.card.cat-top-horse');
    card.appendChild(el('h3', { text: TX('🏇 Dagsform — kun næste løb', '🏇 Race-day form — next race only') }));
    card.appendChild(el('p.muted', { style: 'font-size:13px;margin:4px 0 6px', text: TX('Boosts forbruges i næste løb og forsvinder bagefter.', 'Boosts are used up in the next race and disappear afterwards.') }));
    (S.config.paddockBoosts || []).forEach((b) => {
      const owned = (S.me.raceBoosts || []).includes(b.id);
      const row = el('div.row.between', { style: 'padding:8px 0;border-bottom:1px dashed var(--line)' });
      row.appendChild(el('div', {}, [el('b', { text: `${b.emoji} ${(S.lang === 'en' && b.labelEn) || b.label}` }), el('div.muted', { style: 'font-size:13px', text: (S.lang === 'en' && b.descEn) || b.desc })]));
      const btn = el('button.btn.sm' + (owned ? '' : '.gold'), { text: owned ? TX('✓ Klar til løbet', '✓ Ready for the race') : money(b.cost) + ' DD', disabled: (owned || locked) ? 'true' : null });
      if (!owned && !locked) btn.addEventListener('click', () => TG.emit('team:buyBoost', { boostId: b.id }).then((r) => { check(r); if (r.ok) { toast(b.emoji + ' ' + ((S.lang === 'en' && b.labelEn) || b.label) + TX(' købt!', ' bought!'), 'ok'); } }));
      row.appendChild(btn); card.appendChild(row);
    });
    return card;
  }

  // Præmietavlen: hvad løber vi om i næste løb?
  function prizeBoard() {
    const pv = S.nextRacePrizes;
    if (!pv) return el('div');
    const card = el('div.card', { style: 'border-color:var(--navy)' });
    card.appendChild(el('h3', { text: pv.isFinal ? TX('🏆 Finalens præmier', "🏆 The final's prizes") : TX('🏆 Dagens præmier', "🏆 Today's prizes") }));
    const grid = el('div.grid', { style: 'grid-template-columns:1fr 1fr;gap:4px;margin-top:6px' });
    Object.entries(pv.prizes).filter(([k]) => k !== 'default').forEach(([place, amt]) => {
      grid.appendChild(el('div.row.between', { style: 'padding:4px 8px' }, [el('span', { text: place + TX('. plads', '. place') }), el('b.num', { text: money(amt) + ' DD' })]));
    });
    card.appendChild(grid);
    if (pv.prizes.default) card.appendChild(el('div.muted', { style: 'font-size:12px;margin-top:2px', text: TX('Øvrige pladser: ', 'Other places: ') + money(pv.prizes.default) + ' DD' }));
    if (pv.winnerMultiplier > 1) card.appendChild(el('div.chip.gold', { style: 'margin-top:8px', text: `${TX('🐎 Vinderhestens værdi ganges med', "🐎 The winning horse's value is multiplied by")} ${pv.winnerMultiplier}!` }));
    return card;
  }

  // Odds-tavlen: spil på hvilken hest der vinder løbet
  function oddsBoard() {
    const rb = S.config.raceBetting || {};
    if (!rb.enabled || !S.paddockOdds) return el('div');
    const card = el('div.card.cat-top-jockey');
    card.appendChild(el('h3', { text: TX('🎫 Odds-tavlen — hvem vinder løbet?', '🎫 The odds board — who wins the race?') }));
    if (S.myBet) {
      const target = S.teams.find((t) => t.id === S.myBet.targetTeamId) || {};
      card.appendChild(el('div.chip.gold', { style: 'margin-top:6px;font-size:14px', text: `💰 ${TX('I har spillet', 'You have staked')} ${money(S.myBet.amount)} DD ${TX('på', 'on')} ${target.horseName || target.stableName} (odds ${S.myBet.odds})` }));
      card.appendChild(el('p.muted', { style: 'font-size:12px;margin-top:4px', text: TX('Vinder hesten, får I indsats × odds. Ét væddemål pr. løb.', 'If the horse wins, you get stake × odds. One bet per race.') }));
      return card;
    }
    card.appendChild(el('p.muted', { style: 'font-size:13px;margin:4px 0 6px', text: `${TX('Sæt', 'Stake')} ${money(rb.minStake || 100)}–${money(rb.maxStake || 1000)} DD ${TX('på en hest — også jeres egen. Vinder den, får I indsats × odds.', 'on a horse — including your own. If it wins, you get stake × odds.')}` }));
    S.teams.forEach((t) => {
      const odds = S.paddockOdds[t.id]; if (odds == null) return;
      const row = el('div.row.between', { style: 'padding:7px 0;border-bottom:1px dashed var(--line);align-items:center' });
      row.appendChild(el('div', {}, [el('b', { text: (t.horseName || t.stableName) + (t.id === S.me.id ? TX(' (jer)', ' (yours)') : '') }), el('div.muted', { style: 'font-size:12px', text: t.stableName })]));
      const right = el('div.row', { style: 'gap:6px;align-items:center' });
      right.appendChild(el('span.num', { style: 'font-weight:800', text: odds + 'x' }));
      const btn = el('button.btn.sm.gold', { text: TX('Spil', 'Bet') });
      btn.addEventListener('click', () => {
        const amt = Number(prompt(`${TX('Hvor mange DD vil I sætte på', 'How many DD will you stake on')} ${t.horseName || t.stableName} (odds ${odds})?`, '500'));
        if (!amt) return;
        TG.emit('team:bet', { targetTeamId: t.id, amount: amt }).then((r) => { check(r); if (r.ok) toast(TX('Væddemål registreret! 🎫', 'Bet placed! 🎫'), 'ok'); });
      });
      right.appendChild(btn);
      row.appendChild(right);
      card.appendChild(row);
    });
    return card;
  }

  function investView() {
    const c = el('div.col');
    c.appendChild(head('Investér', 'Dagsform og væddemål købes i Paddocken før løbet — varige point tjener I på øvelserne.'));
    const locked = S.phase !== 'paddock';
    if (locked) {
      const lockCard = el('div.card', { style: 'border-color:var(--gold);background:#fdf8e7' });
      lockCard.appendChild(el('b', { text: '🔒 Paddocken er lukket' }));
      lockCard.appendChild(el('p.muted', { style: 'margin-top:4px', text: 'Investering sker i Paddocken — det korte vindue lige før løbet. Tjen Derby Dollars nu, og læg jeres plan: Hvad vil I købe, når Paddocken åbner?' }));
      c.appendChild(lockCard);
    }
    c.appendChild(investContent(locked));
    return c;
  }

  // ---------- PADDOCK (v2.13): investeringsvinduet før løbet ----------
  function paddockView() {
    const c = el('div.col');
    const t = (S.timers || {}).paddock;
    const open = t && t.endsAt > Date.now();
    c.appendChild(head(TX('Paddocken', 'The Paddock'), open ? TX('Paddocken er åben — sidste chance for at ruste stalden før løbet!', 'The Paddock is open — last chance to gear up before the race!') : TX('Paddocken er lukket.', 'The Paddock is closed.')));
    if (open) {
      const timer = el('div.card.center', { style: 'border-color:var(--gold);box-shadow:0 0 0 3px #E5D9C0' });
      timer.appendChild(el('div', { style: 'font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--text-dim);font-weight:800', text: TX('Paddocken lukker om', 'The Paddock closes in') }));
      const v = el('div', { text: TG.countdown(t.endsAt), style: 'font-family:var(--font-num);font-weight:800;font-size:52px;line-height:1.1' });
      v.setAttribute('data-countdown', String(t.endsAt));
      timer.appendChild(v);
      timer.appendChild(el('div.muted', { style: 'font-size:13px', text: `${TX('I har', 'You have')} ${money(S.me.cash)} DD ${TX('i kassen', 'in the fund')}` }));
      c.appendChild(timer);
      c.appendChild(jockeyAuctionCard());
      c.appendChild(prizeBoard());
      c.appendChild(oddsBoard());
      c.appendChild(investContent(false));
    } else {
      const lockCard = el('div.card.center');
      lockCard.appendChild(el('div', { style: 'font-size:44px', text: '🔒' }));
      lockCard.appendChild(el('b', { text: TX('Investeringsvinduet er lukket', 'The investment window is closed') }));
      lockCard.appendChild(el('p.muted', { text: TX('Gør jer klar — hestene føres til start!', 'Get ready — the horses are being led to the start!') }));
      if (S.me.jockey) lockCard.appendChild(el('div.chip.gold', { style: 'margin-top:8px', text: `${S.me.jockey.emoji || '🏇'} ${TX('Jeres jockey', 'Your jockey')}: ${S.me.jockey.name} · 🎲 ${S.me.dice.min}–${S.me.dice.max}` }));
      c.appendChild(lockCard);
    }
    return c;
  }

  // ---------- JOCKEY-AUKTIONEN (v3 etape 2) ----------
  function jockeyAuctionCard() {
    const ja = S.jockeyAuction || { status: 'idle', jockeys: [] };
    const me = S.me;
    const card = el('div.card', { style: 'border-color:var(--burgundy)' });
    card.appendChild(el('div.row.between', {}, [
      el('h3', { text: TX('🏇 Jockey-auktionen', '🏇 The Jockey Auction') }),
      el('span.chip' + (ja.status === 'open' ? '.gold' : ''), { text: ja.status === 'open' ? TX('Åben budrunde', 'Open bidding') : ja.status === 'resolved' ? TX('Afgjort', 'Settled') : TX('Lukket', 'Closed') }),
    ]));
    if (me.jockey) {
      card.appendChild(el('div', { style: 'margin:8px 0;background:var(--navy);color:var(--on-navy);border-radius:12px;padding:10px 14px;font-weight:700', html: `${me.jockey.emoji || '🏇'} ${TX('Jeres jockey', 'Your jockey')}: <b>${me.jockey.name}</b> · ${TX('terning', 'dice')} ${me.dice.min}–${me.dice.max} · ${TX('hyre', 'hire')} ${sd(me.jockey.hire)}` }));
    } else if (ja.status === 'open') {
      card.appendChild(el('p.muted', { style: 'margin:6px 0', text: TX('Én jockey til hver stald — hyren gælder kun denne sæsons løb. Byd på jeres favorit; står I uden vundet bud, får I en af de resterende til mindstepris.', "One jockey per stable — the hire covers this season's race only. Bid on your favourite; if you win no bid, you get one of the rest at minimum price.") }));
    }
    (ja.jockeys || []).forEach((j) => {
      const winner = j.winner;
      const mine = winner && winner.teamId === me.id;
      const row = el('div', { style: `border:1.5px solid ${mine ? 'var(--gold)' : 'var(--line)'};border-radius:12px;padding:9px 11px;margin-top:8px;${winner && !mine ? 'opacity:.6' : ''}` });
      row.appendChild(el('div.row.between', {}, [
        el('span', { html: `<b>${j.emoji || '🏇'} ${j.name}</b> <span class="chip" style="margin-left:6px">🎲 ${j.dice.min}–${j.dice.max}</span>` }),
        el('span.num', { style: 'font-weight:800', text: winner ? sd(winner.amount) : (j.topBid ? sd(j.topBid.amount) : 'Min. ' + sd(j.minPrice)) }),
      ]));
      row.appendChild(el('div.muted', { style: 'font-size:12px;margin-top:2px', text: j.profile }));
      if (winner) {
        row.appendChild(el('div.chip' + (mine ? '.gold' : ''), { style: 'margin-top:6px', text: (mine ? TX('✓ Jeres jockey', '✓ Your jockey') : winner.stableName) + (winner.atMinPrice ? TX(' (mindstepris)', ' (minimum price)') : '') }));
      } else if (ja.status === 'open') {
        const iLead = j.topBid && j.topBid.teamId === me.id;
        if (j.topBid) row.appendChild(el('div.muted', { style: 'font-size:12px;margin-top:3px', text: iLead ? TX('I fører budrunden 🏆', 'You lead the bidding 🏆') : TX('Fører: ', 'Leading: ') + ownerName(j.topBid.teamId) }));
        if (j.myBid && !iLead) row.appendChild(el('div.chip.warn', { style: 'margin-top:4px', text: TX('I er overbudt — byd igen!', 'You have been outbid — bid again!') }));
        const bidRow = el('div.row', { style: 'gap:6px;margin-top:6px' });
        const amt = el('input', { type: 'number', min: String(j.minPrice), placeholder: TX('Bud i DD', 'Bid in DD'), value: (ui.jockeyBids || {})[j.id] || '', style: 'flex:1' });
        amt.addEventListener('input', () => { (ui.jockeyBids = ui.jockeyBids || {})[j.id] = amt.value; });
        const b = el('button.btn.sm.gold', { text: j.myBid ? `${TX('Hæv bud', 'Raise bid')} (${money(j.myBid)})` : TX('Byd', 'Bid') });
        b.addEventListener('click', () => TG.emit('team:jockeyBid', { jockeyId: j.id, amount: Number(amt.value) }).then((r) => { check(r); if (r.ok) { toast(TX('Bud afgivet', 'Bid placed'), 'ok'); delete (ui.jockeyBids || {})[j.id]; } }));
        bidRow.appendChild(amt); bidRow.appendChild(b);
        if (j.myBid) { const rm = el('button.btn.sm.ghost', { text: TX('Fjern', 'Remove') }); rm.addEventListener('click', () => TG.emit('team:retractJockeyBid', { jockeyId: j.id })); bidRow.appendChild(rm); }
        row.appendChild(bidRow);
      }
      card.appendChild(row);
    });
    return card;
  }

  // ---------- BANK ----------
  function bankView() {
    const me = S.me;
    const c = el('div.col');
    c.appendChild(head(TX('Staldkontoret', 'The Stable Office'), TX('Staldkassen, stillingen i løbspoint — og jeres værdier.', 'Your Stable Fund, the Race Points standings — and your values.')));
    const g = el('div.card'); const grid = el('div.grid', { style: 'grid-template-columns:1fr 1fr' });
    [[TX('Kontanter', 'Cash'), me.cash], [TX('Hest', 'Horse'), me.horseValue], ['Jockey', me.jockeyValue], [TX('Stald', 'Stable'), me.stableValue]].forEach(([k, v]) => grid.appendChild(el('div.stat', {}, [el('div.k', { text: k }), el('div.v', { text: sd(v) })])));
    g.appendChild(grid);
    g.appendChild(el('div.finish-stripe', { style: 'margin:14px 0' }));
    g.appendChild(el('div.stat.big', {}, [el('div.k', { text: TX('Løbspoint', 'Race Points') }), el('div.v', { text: String(me.racePoints || 0) + ' p' })]));
    g.appendChild(el('div.stat', {}, [el('div.k', { text: TX('Total staldværdi', 'Total stable value') }), el('div.v', { text: sd(me.totalValue) })]));
    c.appendChild(g);
    // leaderboard
    const lb = el('div.card'); lb.appendChild(el('h3', { text: TX('Stilling', 'Standings') }));
    (S.ranking || []).forEach((r) => lb.appendChild(el('div.row.between', { style: 'padding:6px 0;border-bottom:1px dashed var(--line)' }, [el('span', { html: `<b>${r.place}.</b> ${r.stableName}${r.teamId === me.id ? TX(' (jer)', ' (you)') : ''}` }), el('span.num', { html: `<b>${r.racePoints || 0} p</b> <span style="color:var(--text-faint);font-size:12px">· ${sd(r.totalValue)}</span>` })])));
    c.appendChild(lb);
    return c;
  }

  // ---------- RACE ----------
  function raceView() {
    const me = S.me; const race = S.race;
    const c = el('div.col');
    c.appendChild(head(S.slide.title, race ? (race.rollingOpen ? TX('Løbet er i gang — slå jeres terning!', 'The race is on — roll your dice!') : TX('Vent på at værten åbner for rolling…', 'Wait for the Race Director to open the rolling…')) : TX('Klargør…', 'Preparing…')));
    if (!race) return c;
    if (race.favoriteTeamId === me.id && !race.favoriteUsed) c.appendChild(el('div.chip.gold', { style: 'align-self:center;font-size:15px;padding:8px 14px', text: TX('📣 I er publikumsfavorit — fan-boost på næste slag!', '📣 You are the crowd favourite — fan boost on your next roll!') }));
    // v2.16: vis aktive løbsdags-boosts og væddemål
    if ((me.raceBoosts || []).length) {
      const names = (S.config.paddockBoosts || []).filter((b) => me.raceBoosts.includes(b.id)).map((b) => b.emoji + ' ' + ((S.lang === 'en' && b.labelEn) || b.label));
      c.appendChild(el('div.chip', { style: 'align-self:center;margin-top:4px', text: TX('Dagsform: ', 'Race-day form: ') + names.join(' · ') }));
    }
    if (S.myBet) {
      const target = S.teams.find((t) => t.id === S.myBet.targetTeamId) || {};
      c.appendChild(el('div.chip.gold', { style: 'align-self:center;margin-top:4px', text: `🎫 ${money(S.myBet.amount)} DD ${TX('på', 'on')} ${target.horseName || target.stableName} (${S.myBet.odds}x)` }));
    }
    if (race.type === 'final' && (S.config.finalBetting || {}).enabled) c.appendChild(betCard());
    const used = (me.race.rolls || []).length; const allowed = me.race.allowed || race.rollsPerTeam;
    const card = el('div.card.center');
    card.appendChild(el('div.stat.big', {}, [el('div.k', { text: 'Position' }), el('div.v', { text: me.race.position + ' / ' + race.trackLength })]));
    const dice = el('div.dice', { style: 'margin:10px 0;display:flex;align-items:center;justify-content:center;gap:10px' }); if (me.race.lastRoll) { dice.appendChild(TG.assetImg('terning', { style: 'width:52px;height:52px' })); dice.appendChild(el('span', { text: String(me.race.lastRoll) })); } else { dice.textContent = '—'; } card.appendChild(dice);
    card.appendChild(el('p.muted', { text: `${TX('Slag brugt', 'Rolls used')}: ${used}/${allowed} · ${TX('terning', 'dice')} ${me.dice.min}–${me.dice.max}` }));
    const canRoll = race.rollingOpen && used < allowed;
    const b = el('button.btn.gold.xl', { text: canRoll ? TX('SLÅ TERNING', 'ROLL THE DICE') : (used >= allowed ? TX('Alle slag brugt', 'All rolls used') : TX('Vent…', 'Wait…')), disabled: canRoll ? null : 'true', style: 'margin-top:14px' });
    b.addEventListener('click', () => TG.emit('team:roll').then((r) => {
      check(r); if (!r.ok) return;
      if (r.event) toast(`${r.event.emoji || ''} ${r.event.label}! ${r.event.effect > 0 ? '+' : ''}${r.event.effect} ${TX('felter', 'spaces')}`, r.event.effect > 0 ? 'ok' : 'err');
      if (r.fanBoost) toast(`📣 Fan-boost! +${r.fanBoost} ${TX('felter', 'spaces')}`, 'ok');
      if (r.catchup) toast(`🔥 ${TX('Opløbsfight!', 'Home-stretch fight!')} +${r.catchup} ${TX('felt', 'space')}`, 'ok');
    }));
    card.appendChild(b);
    c.appendChild(card);
    c.appendChild(miniTrack());
    if (race.results && race.results.length) { const res = el('div.card'); res.appendChild(el('h3', { text: TX('Resultat', 'Result') })); race.results.forEach((r) => res.appendChild(el('div.row.between', { style: 'padding:5px 0' }, [el('span', { text: `${r.place}. ${r.stableName}${r.deadHeat ? TX(' (dødt løb)', ' (dead heat)') : ''}` }), el('span.num', { text: '+' + money(r.prize) })]))); c.appendChild(res); }
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
        card.appendChild(el('p', { style: 'margin-top:6px', html: myBet.payout ? `I vandt væddemålet: <b>+${money(myBet.payout)} DD</b> 🎉` : `Væddemålet tabt (−${money(myBet.amount)} DD).` }));
      } else {
        card.appendChild(el('div.chip.gold', { style: 'margin-top:6px', text: `Satset: ${money(myBet.amount)} DD til odds ${myBet.odds}` }));
        card.appendChild(el('p.muted', { style: 'margin-top:6px', text: `Vind løbet og få ${money(potential)} DD tilbage!` }));
      }
      return card;
    }
    if (race.rollingOpen || race.status === 'finished') {
      card.appendChild(el('p.muted', { style: 'margin-top:6px', text: 'Væddemålene er lukket — løbet er i gang.' }));
      return card;
    }
    card.appendChild(el('p.muted', { style: 'margin:6px 0', text: `Jeres odds: ${odds} (sat efter stillingen — jo længere bagud, jo højere odds). Vinder I løbet, får I indsatsen × ${odds}. Taber I, er den tabt.` }));
    const inp = el('input', { type: 'number', min: '1', placeholder: `Indsats i DD (max ${me.cash})` });
    const b = el('button.btn.gold.block', { text: `Sats til odds ${odds}`, style: 'margin-top:8px' });
    b.addEventListener('click', () => TG.emit('team:bet', { amount: Number(inp.value) }).then((r) => { check(r); if (r.ok) toast('Væddemål registreret!', 'ok'); }));
    card.appendChild(inp); card.appendChild(b);
    return card;
  }

  function miniTrack() {
    const race = S.race; const me = S.me;
    const card = el('div.card');
    card.appendChild(el('h3', { text: TX('Banen lige nu', 'The track right now') }));
    const sorted = [...S.teams].filter((t) => t.joined).sort((a, b) => (race.positions[b.id] || 0) - (race.positions[a.id] || 0));
    sorted.forEach((t) => {
      const pos = race.positions[t.id] || 0;
      const pct = Math.min(100, (pos / race.trackLength) * 100);
      const row = el('div', { style: 'margin:8px 0' });
      row.appendChild(el('div.row.between', { style: 'font-size:13px;margin-bottom:3px' }, [
        el('span', { html: `<b style="color:${t.color.hex}">●</b> ${t.stableName}${t.id === me.id ? TX(' (jer)', ' (you)') : ''}${race.favoriteTeamId === t.id ? ' 📣' : ''}` }),
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
    c.appendChild(centerMsg(winner ? '🏆 ' + winner.stableName : TX('Tak for i dag!', 'Thanks for today!'), winner ? TX('Vinder med ', 'Wins with ') + (winner.racePoints || 0) + TX(' løbspoint', ' Race Points') : ''));
    const lb = el('div.card'); lb.appendChild(el('h3', { text: TX('Endelig stilling', 'Final standings') }));
    (S.ranking || []).forEach((r) => lb.appendChild(el('div.row.between', { style: 'padding:6px 0;border-bottom:1px dashed var(--line)' }, [el('span', { html: `<b>${r.place}.</b> ${r.stableName}` }), el('span.num', { html: `<b>${r.racePoints || 0} p</b> <span style="color:var(--text-faint);font-size:12px">· ${sd(r.totalValue)}</span>` })])));
    c.appendChild(lb);
    return c;
  }

  // ---------- helpers ----------
  function head(title, sub) { const h = el('div', { style: 'margin:4px 0 10px' }); h.appendChild(el('h1', { text: title, style: 'font-size:30px' })); h.appendChild(el('div.head-accent')); if (sub) h.appendChild(el('p.muted', { text: sub })); return h; }
  function backBtn(fn) { const b = el('button.btn.sm.ghost', { text: TX('← Tilbage', '← Back') }); b.addEventListener('click', fn); return b; }
  function catName(c) { return c === 'money' ? TX('Penge', 'Money') : c === 'jockey' ? 'Jockey' : TX('Hest', 'Horse'); }
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
    // Paddock-nedtælling (og andre countdowns): live-opdatering + re-render ved udløb
    document.querySelectorAll('[data-countdown]').forEach((n) => {
      const e = Number(n.getAttribute('data-countdown'));
      n.textContent = TG.countdown(e);
      if (Date.now() > e && !n.__done) { n.__done = true; expired = true; }
    });
    if (expired) render();
  }, 1000);
})();
