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
    changeCardFx(); // Forandringskort: afsløring + banner (kører uafhængigt af slide)
    // Løbs-slides opdateres in-place, så hestene glider i stedet for at hoppe.
    if (['warmup-race', 'race', 'final-race'].includes(S.slide.kind) && S.race && !S.screenMessageOverride) {
      const existing = document.getElementById('raceStage');
      if (existing && existing.getAttribute('data-race-id') === S.race.id) { updateRace(); return; }
    }
    clear(root);
    const stage = el('div.stage');
    stage.appendChild(el('div.corner-motif', { html: TG.motif.horse('#C9A227') }));
    stage.appendChild(brandbar());
    if (S.activeChangeCard) stage.appendChild(changeBanner());
    const content = el('div.content');
    content.appendChild(slideContent());
    stage.appendChild(content);
    root.appendChild(stage);
    if (document.getElementById('raceStage')) updateRace();
  }

  // ---- Forandringskort på storskærmen ----
  function changeBanner() {
    return el('div', {
      style: 'display:flex;align-items:center;gap:1vw;background:var(--burgundy);color:#fff;border-radius:12px;padding:.5vw 1.2vw;margin:.6vh 0;font-weight:700;font-size:1.25vw;box-shadow:var(--shadow)',
    }, [
      el('span', { style: 'font-size:1.7vw', text: S.activeChangeCard.emoji }),
      el('span', { text: 'FORANDRINGSKORT: ' + S.activeChangeCard.title + ' — ' + S.activeChangeCard.text }),
    ]);
  }
  function changeCardFx() {
    const cc = S.activeChangeCard;
    const key = cc ? cc.id + ':' + cc.playedAt : null;
    if (!cc || window.__ccKey === key) { if (!cc) window.__ccKey = null; return; }
    window.__ccKey = key;
    // Fuldskærms-afsløring i ~9 sekunder
    const ov = el('div', { style: 'position:fixed;inset:0;z-index:70;display:grid;place-items:center;background:rgba(15,36,64,.88)' });
    const card = el('div', { style: 'background:var(--cream);border:6px solid var(--gold);border-radius:24px;padding:3vw 4vw;max-width:60vw;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,.5)' });
    card.appendChild(el('div', { style: 'font-size:1.1vw;letter-spacing:4px;text-transform:uppercase;color:var(--burgundy);font-weight:800', text: '🃏 Forandringskort' }));
    card.appendChild(el('div', { style: 'font-size:5vw;margin:.8vh 0', text: cc.emoji }));
    card.appendChild(el('div', { style: 'font-family:var(--font-display);font-weight:800;font-size:3vw;color:var(--navy);line-height:1.05', text: cc.title }));
    card.appendChild(el('div', { style: 'font-size:1.5vw;color:var(--text-dim);margin-top:1.2vh;line-height:1.5', text: cc.text }));
    ov.appendChild(card);
    document.body.appendChild(ov);
    card.animate([{ transform: 'scale(.6) rotate(-4deg)', opacity: 0 }, { transform: 'scale(1.04) rotate(1deg)', opacity: 1, offset: .6 }, { transform: 'scale(1) rotate(0)', opacity: 1 }], { duration: 700, easing: 'cubic-bezier(.2,.9,.3,1.2)' });
    try { if (SND.unlocked && S.sound && S.sound.tts) speak('Forandringskort! ' + cc.title + '. ' + cc.text); } catch (e) { /* lyd ikke aktiveret */ }
    setTimeout(() => { ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500 }).onfinish = () => ov.remove(); }, 9000);
  }

  function brandbar() {
    const b = el('div.brandbar');
    b.appendChild(el('img', { src: TG.assetURL('logo'), alt: 'The Great Team Derby', style: 'height:3.4vw;width:auto' }));
    // Vis kun tekst ved siden af logoet, hvis eventet har eget kundenavn
    if (S.eventName && S.eventName !== 'The Great Team Derby') b.appendChild(el('div.eyebrow', { text: S.eventName + ' · CoastZone' }));
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
      case 'pre-season': case 'preseason-tasks': return preseason();
      case 'preseason-round': return preseasonRound();
      case 'auction-intro': return auctionIntro();
      case 'warmup-race': return raceTrack('Warm-up løb');
      case 'auction': return auction();
      case 'round': return round();
      case 'paddock': return paddock();
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
    c.appendChild(el('img', { src: TG.assetURL('logo'), alt: 'The Great Team Derby', style: 'width:34vw;max-width:100%;margin:1vh 0' }));
    c.appendChild(el('p.lead', { text: 'Samarbejde, strategi, investeringer og forandringsparathed. Byg jeres stald — og gør den mest værdifuld, også når planen vælter.' }));
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
    const steps = ['Løs opgaver og tjen Derby Dollars', 'Vind løb og få præmiepenge', 'Investér i hest, jockey og stald', 'Byt, justér planen og træf skarpe beslutninger'];
    const list = el('div', { style: 'margin-top:1vh' });
    steps.forEach((s, i) => list.appendChild(el('div.row', { style: 'font-size:2vw;padding:.6vh 0' }, [el('span.num', { style: 'color:var(--gold);width:2.5vw', text: String(i + 1) }), el('span', { text: s })])));
    c.appendChild(list);
    c.appendChild(el('p.lead', { style: 'margin-top:2vh', html: 'Den mest værdifulde stald vinder — <b>ikke</b> nødvendigvis vinderen af finaleløbet.' }));
    return c;
  }
  function gameFlow() {
    const c = el('div');
    c.appendChild(el('h1', { text: 'Spillets gang', style: 'font-size:4.6vw;margin-bottom:2.2vh' }));
    const steps = [
      { t: 'Auktion', d: 'Byd på jeres øvelse', icon: 'hammer-auktion', color: '#6E1F2E' },
      { t: 'Runde', d: 'Løs opgaver · tjen Derby Dollars', icon: 'puslespil-opgaver', color: '#C9A227' },
      { t: 'Investér', d: 'Hest · jockey · stald', icon: 'diagram-investering', color: '#2D4A3D' },
      { t: 'Løb', d: 'Slå terninger · vind præmier', icon: 'maalflag', color: '#B83232' },
    ];
    const loop = el('div', { style: 'display:flex;align-items:stretch;gap:.8vw' });
    steps.forEach((s, i) => {
      const card = el('div', { style: `flex:1;background:#fff;border-radius:18px;border-top:.55vh solid ${s.color};box-shadow:var(--shadow);padding:1.5vw 1.2vw;text-align:center` });
      card.appendChild(el('div', { style: 'width:5.6vw;height:5.6vw;margin:0 auto .8vh', html: TG.assetTag(s.icon) }));
      card.appendChild(el('div', { style: 'font-family:var(--font-display);font-weight:800;font-size:1.9vw;color:var(--navy)', text: (i + 1) + '. ' + s.t }));
      card.appendChild(el('div', { style: 'font-size:1.15vw;color:var(--text-dim);margin-top:.3vh', text: s.d }));
      loop.appendChild(card);
      if (i < steps.length - 1) loop.appendChild(el('div', { style: 'align-self:center;color:var(--gold);font-size:2.6vw;font-weight:800', text: '→' }));
    });
    c.appendChild(loop);
    const bottom = el('div', { style: 'display:flex;align-items:center;gap:1.4vw;margin-top:2.4vh' });
    bottom.appendChild(el('div', { style: 'background:#fff;border:1px solid var(--line);border-radius:999px;padding:.7vw 1.4vw;font-size:1.35vw;font-weight:700;box-shadow:var(--shadow);white-space:nowrap', text: '🔁 Gentages hver runde' }));
    const fin = el('div', { style: 'flex:1;background:var(--navy);color:#fff;border-radius:18px;padding:1.1vw 1.5vw;display:flex;align-items:center;gap:1.2vw;box-shadow:var(--shadow-lg)' });
    fin.appendChild(el('div', { style: 'width:4vw;height:4vw;flex:none', html: TG.assetTag('pokal') }));
    fin.appendChild(el('div', {}, [
      el('div', { style: 'font-family:var(--font-display);font-weight:800;font-size:1.8vw', text: 'Til sidst: The Great Team Derby' }),
      el('div', { style: 'font-size:1.15vw;opacity:.85', text: 'Væddemål, store præmier og plads til comeback — den mest værdifulde stald vinder' }),
    ]));
    bottom.appendChild(fin);
    c.appendChild(bottom);
    return c;
  }
  // v2.14: pre-season-gennemgang — kun det der findes i prøverunden,
  // synkroniseret med hostens fremhævning (S.preseasonFocus).
  function preseason() {
    if (window.__psTourTimer) { clearInterval(window.__psTourTimer); window.__psTourTimer = null; }
    const off = (S.disabled && S.disabled.moneyTasks) || [];
    const items = [
      { k: 'tip13', emoji: '🎯', name: "Tip en 13'er", desc: '13 hurtige spørgsmål på tabletten', reward: '100 DD pr. rigtigt svar' },
      { k: 'tidslinje', emoji: '🕰️', name: 'Tidslinjen', desc: 'Træk 5 numre — find kortene i lokalet og læg dem i kronologisk rækkefølge', reward: '300 DD pr. tidslinje' },
      { k: 'mindpuzzle', emoji: '🧩', name: 'Mind Puzzle', desc: 'Byg banen på spillepladen efter opgavekortet — sværere for hvert niveau', reward: '300 DD pr. niveau' },
      { k: 'dyst', emoji: '⚔️', name: 'Dysten', desc: 'Udfordr en anden stald til estimerings-duel — bedst af 3', reward: '500 DD til vinderen' },
      { k: 'faste', emoji: '📌', name: 'De faste opgaver', desc: 'Puslespil (Derby-licens), pynt hesten og design staldskiltet', reward: 'Åbner når sæsonen starter' },
    ].filter((it) => it.k === 'faste' || !off.includes(it.k));
    const f = S.preseasonFocus;
    const wrap = el('div');
    wrap.appendChild(el('div.eyebrow', { text: 'Pre-season · det her møder I i prøverunden' }));
    wrap.appendChild(el('h2', { text: 'Sådan tjener I Derby Dollars', style: 'margin-bottom:1.6vh' }));
    const grid = el('div', { style: 'display:grid;grid-template-columns:repeat(' + Math.min(items.length, 5) + ',1fr);gap:1vw;align-items:stretch' });
    items.forEach((it) => {
      const focused = f === it.k; const dimmed = f && !focused;
      const card = el('div', { style: 'background:#fff;border:1px solid var(--line);border-radius:16px;padding:1.4vw 1.1vw;display:flex;flex-direction:column;gap:.7vh;transition:all .35s;'
        + (focused ? 'transform:scale(1.06);box-shadow:0 0 0 .35vw var(--gold), 0 18px 44px rgba(201,162,39,.35);' : '')
        + (dimmed ? 'opacity:.28;filter:grayscale(.5);' : '') });
      if (focused) card.appendChild(el('div', { style: 'font-size:.9vw;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--gold)', text: '👉 Lige nu' }));
      card.appendChild(el('div', { style: 'font-size:3vw;line-height:1', text: it.emoji }));
      card.appendChild(el('div', { style: 'font-family:var(--font-display);font-weight:800;font-size:1.5vw;color:var(--navy)', text: it.name }));
      card.appendChild(el('div', { style: 'font-size:1.02vw;color:var(--text-dim);flex:1', text: it.desc }));
      card.appendChild(el('div', { style: 'font-family:var(--font-num);font-weight:800;font-size:1.1vw;color:var(--turf)', text: it.reward }));
      grid.appendChild(card);
    });
    wrap.appendChild(grid);
    wrap.appendChild(el('p.lead', { style: 'margin-top:2.2vh', text: f ? 'Kig på jeres tablet — punktet er fremhævet dér også.' : 'Tag tabletten frem — I har præcis den samme liste foran jer.' }));
    return wrap;
  }

  function __psOldTour() {
    const PS_CSS = '.ps-wrap{display:flex;gap:2.4vw;align-items:stretch}.ps-tablet{flex:1.1;background:#1c1c1e;border-radius:26px;padding:1vw;box-shadow:0 22px 50px rgba(0,0,0,.35)}.ps-screen{background:var(--cream);border-radius:16px;height:100%;display:flex;flex-direction:column;overflow:hidden}.ps-top{background:var(--navy);color:#fff;padding:.7vw 1vw;display:flex;align-items:center;gap:.7vw}.ps-top .b{width:2vw;height:2vw;border-radius:50%;background:var(--burgundy);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1vw}.ps-top .nm{font-family:var(--font-display);font-weight:800;font-size:1.2vw}.ps-top .m{margin-left:auto;text-align:right;font-size:.75vw;opacity:.85}.ps-top .m b{display:block;font-size:1.05vw;font-family:var(--font-num)}.ps-body{flex:1;padding:1vw;display:flex;flex-direction:column;gap:.7vw}.ps-body .bt{font-family:var(--font-display);font-weight:800;font-size:1.7vw;color:var(--navy)}.ps-skel{background:#fff;border:1px solid var(--line);border-radius:12px;padding:.8vw;display:flex;flex-direction:column;gap:.45vw}.ps-skel i{display:block;height:.7vw;border-radius:99px;background:#e7e0cc}.ps-skel i.w60{width:60%}.ps-skel i.w85{width:85%}.ps-skel .btn{height:1.7vw;border-radius:8px;background:var(--gold);opacity:.85}.ps-nav{display:flex;background:#fff;border-top:1px solid var(--line)}.ps-nav div{flex:1;text-align:center;padding:.65vw .2vw;font-size:.78vw;font-weight:700;color:var(--text-dim);border-top:3px solid transparent;transition:all .3s;cursor:pointer;white-space:nowrap}.ps-nav div.on{color:var(--navy);border-top-color:var(--gold);background:var(--cream)}.ps-panel{flex:1;background:var(--navy);color:var(--on-navy);border-radius:20px;padding:2vw;display:flex;flex-direction:column;justify-content:center;box-shadow:var(--shadow-lg)}.ps-panel .pe{font-size:1vw;letter-spacing:3px;text-transform:uppercase;color:var(--gold-soft);font-weight:700;margin-bottom:1vh}.ps-panel .pt{font-family:var(--font-display);font-size:2.7vw;line-height:1.05;margin-bottom:1.4vh}.ps-panel .pd{font-size:1.45vw;line-height:1.55;opacity:.93}.ps-dots{display:flex;gap:.6vw;margin-top:2.4vh}.ps-dots i{width:.9vw;height:.9vw;border-radius:50%;background:rgba(255,255,255,.28);transition:background .3s}.ps-dots i.on{background:var(--gold)}';
    const tabs = [
      { label: 'Opgaver', title: 'Opgaver', eyebrow: 'Fane 1 af 7', desc: 'Puslespillet, der giver jeres Derby-licens, og de kreative opgaver ligger her. Kald hosten, når I vil have noget godkendt.' },
      { label: 'Min øvelse', title: 'Min øvelse', eyebrow: 'Fane 2 af 7', desc: 'Den auktionsøvelse I ejer. Kald instruktøren til et officielt forsøg — succes giver kontanter eller point til hest og jockey.' },
      { label: 'Penge', title: 'Pengeopgaver', eyebrow: 'Fane 3 af 7', desc: 'Tip en 13\'er, Tidslinjen (find de nummererede kort i lokalet), Dysten og Mind Puzzle giver hurtige Derby Dollars. Der er cooldown — så fordel jer, og hav altid noget i gang.' },
      { label: 'Byt', title: 'Byttehandel', eyebrow: 'Fane 4 af 7', desc: 'Byt jeres øvelse med en anden stald — evt. med penge oveni. Begge stalde skal acceptere handlen.' },
      { label: 'Auktionshus', title: 'Auktionshus', eyebrow: 'Fane 5 af 7', desc: 'Fortrudt jeres køb? Byt til en ledig øvelse mod et fast gebyr på 100 SD.' },
      { label: 'Invester', title: 'Investering', eyebrow: 'Fane 6 af 7', desc: 'Hesten løfter terningens TOP, jockeyen løfter BUNDEN, stalden er sikker værdi. Max ét køb pr. mulighed — vælg klogt.' },
      { label: 'Bank', title: 'Bank & stilling', eyebrow: 'Fane 7 af 7', desc: 'Jeres samlede staldværdi og stillingen. Husk: den mest værdifulde stald vinder — ikke nødvendigvis løbsvinderen.' },
    ];
    const wrap = el('div');
    wrap.appendChild(el('style', { html: PS_CSS }));
    wrap.appendChild(el('div.eyebrow', { text: 'Pre-season · sådan ser jeres tablet ud' }));
    wrap.appendChild(el('h2', { text: 'Én skærm — syv faner', style: 'margin-bottom:2vh' }));
    const row = el('div.ps-wrap');
    // Tablet-mockup
    const tablet = el('div.ps-tablet');
    const screen = el('div.ps-screen');
    const top = el('div.ps-top');
    top.appendChild(el('div.b', { text: '3' }));
    top.appendChild(el('div.nm', { text: 'Jeres stald' }));
    top.appendChild(el('div.m', {}, [el('span', { text: 'KONTANT' }), el('b', { text: '4.500 SD' })]));
    top.appendChild(el('div.m', {}, [el('span', { text: 'STALDVÆRDI' }), el('b', { text: '8.200 SD' })]));
    screen.appendChild(top);
    const body = el('div.ps-body');
    body.appendChild(el('div.bt#psBodyTitle'));
    const skel1 = el('div.ps-skel', {}, [el('i.w60'), el('i.w85'), el('i.w60'), el('div.btn')]);
    const skel2 = el('div.ps-skel', {}, [el('i.w85'), el('i.w60')]);
    body.appendChild(skel1); body.appendChild(skel2);
    screen.appendChild(body);
    const nav = el('div.ps-nav#psNav');
    tabs.forEach((t, i) => { const b = el('div', { text: t.label, 'data-ps': String(i) }); b.addEventListener('click', () => setPsStep(i)); nav.appendChild(b); });
    screen.appendChild(nav);
    tablet.appendChild(screen);
    // Forklarings-panel
    const panel = el('div.ps-panel');
    panel.appendChild(el('div.pe#psEye'));
    panel.appendChild(el('div.pt#psTitle'));
    panel.appendChild(el('div.pd#psDesc'));
    const dots = el('div.ps-dots#psDots');
    tabs.forEach(() => dots.appendChild(el('i')));
    panel.appendChild(dots);
    row.appendChild(tablet); row.appendChild(panel);
    wrap.appendChild(row);
    window.__psStations = tabs; window.__psStep = 0;
    setTimeout(() => setPsStep(0), 0);
    window.__psTourTimer = setInterval(() => {
      if (!document.getElementById('psNav')) { clearInterval(window.__psTourTimer); window.__psTourTimer = null; return; }
      setPsStep((window.__psStep + 1) % tabs.length);
    }, 8500);
    return wrap;
  }

  function setPsStep(i) {
    const tabs = window.__psStations; if (!tabs) return;
    window.__psStep = i;
    document.querySelectorAll('#psNav div').forEach((n) => n.classList.toggle('on', Number(n.getAttribute('data-ps')) === i));
    const s = tabs[i];
    const eye = document.getElementById('psEye'); const ti = document.getElementById('psTitle'); const de = document.getElementById('psDesc'); const bt = document.getElementById('psBodyTitle');
    if (eye) eye.textContent = s.eyebrow; if (ti) ti.textContent = s.title; if (de) de.textContent = s.desc; if (bt) bt.textContent = s.title;
    document.querySelectorAll('#psDots i').forEach((d, di) => d.classList.toggle('on', di === i));
  }

  function hammerSvg() { return '<svg viewBox="0 0 64 64" width="100%" height="100%"><rect x="8" y="44" width="48" height="7" rx="2" fill="#6E1F2E"/><rect x="30" y="12" width="9" height="26" rx="3" transform="rotate(40 34 25)" fill="#6E1F2E"/><rect x="18" y="18" width="22" height="10" rx="3" transform="rotate(40 29 23)" fill="#B83232"/></svg>'; }
  function puzzleSvg() { return '<svg viewBox="0 0 64 64" width="100%" height="100%"><rect x="12" y="12" width="18" height="18" rx="3" fill="#C9A227"/><rect x="34" y="12" width="18" height="18" rx="3" fill="#1F3E63"/><rect x="12" y="34" width="18" height="18" rx="3" fill="#1F3E63"/><rect x="34" y="34" width="18" height="18" rx="3" fill="#C9A227"/></svg>'; }
  function chartSvg() { return '<svg viewBox="0 0 64 64" width="100%" height="100%"><rect x="12" y="34" width="9" height="18" rx="2" fill="#2D4A3D"/><rect x="27" y="24" width="9" height="28" rx="2" fill="#2D4A3D"/><rect x="42" y="14" width="9" height="38" rx="2" fill="#2D4A3D"/></svg>'; }
  function flagSvg() { return '<svg viewBox="0 0 64 64" width="100%" height="100%"><rect x="14" y="10" width="4" height="44" fill="#1F3E63"/><path d="M18 12 h30 v20 h-30 z" fill="#1F3E63"/><path d="M18 12 h10 v10 h-10 z M38 12 h10 v10 h-10 z M28 22 h10 v10 h-10 z" fill="#FAF6EA"/></svg>'; }

  // ---- pre-season prøverunde: timer + kontant-kapløb ----
  function preseasonRound() {
    const c = el('div');
    const t = S.timers && S.timers.round ? TG.countdown(S.timers.round.endsAt) : null;
    c.appendChild(el('div.row.between', {}, [el('h1', { text: 'Pre-season er i gang!', style: 'font-size:4.6vw' }), t ? el('div.big-num', { text: t, 'data-endsat': S.timers.round.endsAt }) : null]));
    c.appendChild(el('p.lead', { text: 'Prøverunden: Løs pengeopgaverne på tabletten — Tip en 13\'er, Tidslinjen, Dysten og Mind Puzzle. Alt hvad I tjener, tæller med!' }));
    const box = el('div', { style: 'margin-top:2vh' });
    box.appendChild(el('div.eyebrow', { text: 'Hvem tjener mest?' }));
    const ranked = [...S.teams].filter((x) => x.joined).sort((a, b) => b.cash - a.cash);
    ranked.slice(0, 8).forEach((r, i) => box.appendChild(el('div.row.between', { style: 'font-size:1.9vw;padding:.6vh 0;border-bottom:1px solid var(--line)' }, [
      el('span', { html: `<b style="color:var(--gold)">${i + 1}.</b> ${r.stableName}` }),
      el('span.num', { text: sd(r.cash) }),
    ])));
    c.appendChild(box);
    return c;
  }

  // ---- auktionen forklaret (efter warm-up) ----
  function auctionIntro() {
    const c = el('div');
    c.appendChild(el('h1', { text: 'Auktionen — sådan virker den', style: 'font-size:4.2vw;margin-bottom:1.8vh' }));
    const steps = [
      { t: 'Byd fra tabletten', d: 'Alle stalde byder samtidig på de 6 specialøvelser', icon: 'hammer-auktion', color: '#6E1F2E' },
      { t: 'Højeste bud vinder', d: 'Max én øvelse pr. stald — vælg med omhu', icon: 'pokal', color: '#C9A227' },
      { t: 'Øvelsen arbejder for jer', d: 'Giver Derby Dollars eller hest/jockey-point hele sæsonen', icon: 'penge', color: '#2D4A3D' },
      { t: 'Fortrudt? Byt!', d: 'Byt med en anden stald — eller i auktionshuset for 100 DD', icon: 'hestesko', color: '#B83232' },
    ];
    const row = el('div', { style: 'display:flex;gap:.8vw;align-items:stretch' });
    steps.forEach((s, i) => {
      const card = el('div', { style: `flex:1;background:#fff;border-radius:18px;border-top:.55vh solid ${s.color};box-shadow:var(--shadow);padding:1.4vw 1.1vw;text-align:center` });
      card.appendChild(el('div', { style: 'width:4.6vw;height:4.6vw;margin:0 auto .8vh', html: TG.assetTag(s.icon) }));
      card.appendChild(el('div', { style: 'font-family:var(--font-display);font-weight:800;font-size:1.7vw;color:var(--navy)', text: (i + 1) + '. ' + s.t }));
      card.appendChild(el('div', { style: 'font-size:1.1vw;color:var(--text-dim);margin-top:.3vh', text: s.d }));
      row.appendChild(card);
    });
    c.appendChild(row);
    // De 6 øvelser
    const exRow = el('div', { style: 'display:flex;gap:.7vw;margin-top:2vh;flex-wrap:wrap' });
    (S.auction.exercises || []).forEach((ex) => {
      exRow.appendChild(el('div', { style: 'background:#fff;border:1px solid var(--line);border-radius:999px;padding:.5vw 1.2vw;font-weight:700;font-size:1.2vw;box-shadow:var(--shadow)', text: ex.name }));
    });
    c.appendChild(exRow);
    return c;
  }

  // ---- setup / ready ----
  function stableSetup() {
    const c = el('div');
    c.appendChild(el('h2', { text: 'Skab jeres stald' }));
    const grid = el('div.teamgrid', { style: 'grid-template-columns:repeat(3,1fr);margin-top:1.4vh' });
    S.teams.forEach((t) => grid.appendChild(teamCard(t)));
    c.appendChild(grid);
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
    c.appendChild(el('div.row.between', {}, [el('h2', { text: a.status === 'resolved' ? 'Auktionen er afgjort' : a.status === 'closed' ? 'Auktionen er lukket' : a.status === 'open' ? 'Auktionen er åben' : 'Auktionen åbner snart' }), cd ? el('div.big-num', { style: 'font-size:4vw', text: cd, 'data-endsat': a.endsAt }) : null]));
    if (a.status === 'resolved') {
      const list = el('div', { style: 'margin-top:1vh' });
      (a.results || []).forEach((r) => list.appendChild(el('div.reveal-row', {}, [el('span.num', { text: '' }), el('span', { text: r.stableName + ' → ' + r.exerciseName }), el('span.num', { text: sd(r.amount) })])));
      c.appendChild(list); return c;
    }
    // Regler — synlige for alle under hele auktionen
    const rules = el('div', { style: 'display:flex;gap:.8vw;margin:.8vh 0 1.2vh;flex-wrap:wrap' });
    ['📱 Byd fra tabletten — nyt bud erstatter jeres gamle', '🏆 Højeste bud vinder · max én øvelse pr. stald', '💸 Køber I en ejet øvelse, får sælgeren 50% af buddet', '🔁 Fortryd med "Fjern bud" indtil auktionen lukker'].forEach((t) => rules.appendChild(el('div', { style: 'background:#fff;border:1px solid var(--line);border-radius:999px;padding:.45vw 1vw;font-size:1.02vw;font-weight:600;box-shadow:var(--shadow)', text: t })));
    c.appendChild(rules);
    const topByEx = {}; (a.topBids || []).forEach((b) => { topByEx[b.exerciseId] = b; });
    const grid = el('div.teamgrid', { style: 'grid-template-columns:repeat(4,1fr);margin-top:.4vh' });
    a.exercises.forEach((ex) => {
      const card = el('div.card', { style: 'display:flex;flex-direction:column;gap:.4vw' });
      card.appendChild(el('div', { class: 'cat ' + ex.category, style: 'font-size:1.1vw;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--gold)', text: ex.name }));
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
    c.appendChild(el('div.row.between', {}, [el('h1', { text: S.slide.screenTitle, style: 'font-size:4.2vw' }), t ? el('div.big-num', { text: t, 'data-endsat': S.timers.round.endsAt }) : null]));
    c.appendChild(el('p.lead', { style: 'margin:.2vh 0 .8vh', text: 'Løs opgaver og fyld staldkassen — investeringen venter i Paddocken før løbet.' }));
    c.appendChild(stableOverview());
    return c;
  }

  // Paddocken (v2.13): investeringsvinduet før løbet — stor nedtælling + stald-overblik.
  function paddock() {
    const c = el('div');
    const t = S.timers && S.timers.paddock;
    const open = t && t.endsAt > Date.now();
    c.appendChild(el('div.row.between', {}, [
      el('h1', { text: S.slide.screenTitle, style: 'font-size:4.2vw' }),
      open ? el('div.big-num', { text: TG.countdown(t.endsAt), 'data-endsat': t.endsAt, style: 'color:var(--gold)' }) : el('div.big-num', { text: 'LUKKET' }),
    ]));
    c.appendChild(el('p.lead', { style: 'margin:.2vh 0 .8vh', text: open
      ? 'Paddocken er åben! Brug jeres Derby Dollars på hest, jockey og stald — vinduet lukker, når tiden er gået.'
      : 'Paddocken er lukket — hestene føres til start!' }));
    c.appendChild(stableOverview());
    return c;
  }

  // Stald-overblik i runderne: udvikling pr. stald i stedet for ren ranking.
  // Bedste hest = publikumsfavorit (får fan-boost i løbet). FLIP-animation ved overhaling.
  const ovPrev = { tops: {}, places: {} };
  function bestHorseTeamId() {
    const sorted = [...S.teams].sort((a, b) => (b.horseValue - a.horseValue) || (b.horseLevel - a.horseLevel));
    if (!sorted.length) return null;
    // Kun en favorit når én hest reelt er bedst (ikke ved dødt løb, fx i pre-season).
    if (sorted.length > 1 && sorted[0].horseValue === sorted[1].horseValue && sorted[0].horseLevel === sorted[1].horseLevel) return null;
    return sorted[0].id;
  }
  function stableOverview() {
    const ranked = S.ranking || [];
    const favId = bestHorseTeamId();
    const cols = ranked.length <= 4 ? ranked.length || 1 : Math.ceil(ranked.length / 2);
    const grid = el('div', { style: `display:grid;grid-template-columns:repeat(${Math.min(4, Math.max(2, cols))},1fr);gap:.9vw;margin-top:.6vh` });
    ranked.forEach((r) => {
      const team = S.teams.find((x) => x.id === r.teamId) || {};
      grid.appendChild(ovCard(r, team, r.teamId === favId));
    });
    requestAnimationFrame(() => animateOvertakes(grid));
    return grid;
  }
  function ovRow(icon, label, value) {
    return el('div.row.between', { style: 'font-size:1.05vw;padding:.28vh 0;border-bottom:1px dashed var(--line)' }, [
      el('span', { style: 'color:var(--text-dim)', text: `${icon} ${label}` }),
      el('span.num', { style: 'font-weight:700', text: value }),
    ]);
  }
  function ovCard(r, team, isFav) {
    const card = el('div.card', {
      'data-ov-team': r.teamId,
      style: `position:relative;display:flex;flex-direction:column;gap:.2vw;padding:.9vw 1vw;border-top:.4vw solid ${r.color ? r.color.hex : 'var(--navy)'}` + (isFav ? ';box-shadow:0 0 0 3px var(--gold), var(--shadow)' : ''),
    });
    // Header: placering + staldnavn (+ favorit-badge)
    const head = el('div.row', { style: 'align-items:center;gap:.5vw' }, [
      el('span', { style: `display:flex;align-items:center;justify-content:center;width:1.9vw;height:1.9vw;border-radius:50%;background:${r.color ? r.color.hex : 'var(--navy)'};color:#fff;font-weight:800;font-size:1vw`, text: String(r.place) }),
      el('span', { style: 'font-weight:800;font-size:1.25vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis', text: r.stableName }),
    ]);
    card.appendChild(head);
    if (isFav) card.appendChild(el('div', { style: 'font-size:.85vw;font-weight:800;color:var(--burgundy);letter-spacing:.5px', text: '📣 PUBLIKUMSFAVORIT — bedste hest, fan-boost i løbet' }));
    // Udvikling: hest / jockey / stald / kontant
    const dice = team.dice ? ` · 🎲 ${team.dice.min}–${team.dice.max}` : '';
    card.appendChild(ovRow('🐎', (team.horseName || 'Hest') + ` · niv. ${team.horseLevel != null ? team.horseLevel : '-'}`, sd(r.horseValue)));
    card.appendChild(ovRow('🏇', (team.jockeyName || 'Jockey') + ` · niv. ${team.jockeyLevel != null ? team.jockeyLevel : '-'}`, sd(r.jockeyValue)));
    card.appendChild(ovRow('🏠', 'Stald', sd(r.stableValue)));
    card.appendChild(ovRow('💰', 'Kontant', sd(r.cash)));
    const foot = el('div.row.between', { style: 'margin-top:auto;padding-top:.35vh;align-items:baseline' }, [
      el('span', { style: 'font-size:.8vw;letter-spacing:1px;text-transform:uppercase;color:var(--text-faint)', text: 'Staldværdi' + dice }),
      el('span.num', { style: 'font-size:1.7vw;font-weight:800;color:var(--burgundy)', text: sd(r.totalValue) }),
    ]);
    card.appendChild(foot);
    return card;
  }
  function animateOvertakes(grid) {
    const newTops = {}; const newPlaces = {};
    (S.ranking || []).forEach((r) => { newPlaces[r.teamId] = r.place; });
    grid.querySelectorAll('[data-ov-team]').forEach((card) => {
      const id = card.getAttribute('data-ov-team');
      const rect = card.getBoundingClientRect();
      newTops[id] = { top: rect.top, left: rect.left };
      const prev = ovPrev.tops[id];
      if (prev) {
        const dx = prev.left - rect.left; const dy = prev.top - rect.top;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
          card.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'translate(0,0)' }], { duration: 700, easing: 'cubic-bezier(.2,.9,.3,1.1)' });
          const prevPlace = ovPrev.places[id];
          if (prevPlace != null && newPlaces[id] < prevPlace) {
            const flash = el('div', { style: 'position:absolute;top:-1.1vw;right:.6vw;background:var(--gold);color:#fff;font-weight:800;font-size:.95vw;padding:.2vw .7vw;border-radius:999px;box-shadow:var(--shadow);z-index:3', text: '🏇 Overhaling!' });
            card.appendChild(flash);
            flash.animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1.08)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 450 });
            setTimeout(() => { flash.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400 }).onfinish = () => flash.remove(); }, 2600);
          }
        }
      }
    });
    ovPrev.tops = newTops; ovPrev.places = newPlaces;
  }

  // ---- race track (v2: levende løb med feed, events og konfetti) ----
  function raceTrack(title) {
    const race = S.race;
    const c = el('div', { style: 'display:flex;flex-direction:column;height:100%' });
    if (!race) { c.appendChild(el('h2', { text: title })); c.appendChild(el('p.lead', { text: 'Klargør løb…' })); return c; }
    c.id = 'raceStage';
    c.setAttribute('data-race-id', race.id);
    c.appendChild(el('div.row.between', {}, [el('h2', { text: title }), el('span.chip#raceChip', { text: '' })]));
    const marks = [5, 10, 15, 20]; // 25 = målstregen
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
    // I mål: hesten krydser målstregen (stregen står ved 97% af banen)
    if (pos >= trackLength) return 97;
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
        race.results.slice(0, 3).forEach((r) => row.appendChild(el('div.chip.gold', { style: 'font-size:1.4vw;padding:.6vw 1.2vw', text: `${r.place}. ${r.stableName}${r.deadHeat ? ' (dødt løb)' : ''} · +${money(r.prize)} DD` })));
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
    ['Hvem traf beslutningerne ved auktionen — og hvordan?', 'Hvornår ændrede I strategi — og hvad udløste det?', 'Da noget uventet væltede jeres plan — holdt I fast, eller lagde I om? Og hvad afgjorde det?', 'Hvad ville I gøre anderledes, hvis runde 1 kom igen?'].forEach((q, i) => {
      qs.appendChild(el('div.row', { style: 'font-size:1.7vw;padding:.6vh 0;gap:1vw' }, [el('span', { style: 'color:var(--gold);font-weight:800', text: String(i + 1) + '.' }), el('span', { text: q })]));
    });
    c.appendChild(qs);
    return c;
  }

  function teamName(id) { const t = S.teams.find((x) => x.id === id); return t ? t.stableName : '—'; }
  function teamColor(id) { const t = S.teams.find((x) => x.id === id); return t && t.color ? t.color.hex : 'var(--navy)'; }

  // ---- Lyd: musik + dansk TTS-speaker (styres af host via S.sound) ----
  const SND = { unlocked: false, players: {} };
  function sndPlayer(key, src) {
    if (!SND.players[key]) {
      const a = new Audio(src);
      a.loop = true; a.volume = 0.45;
      a.addEventListener('error', () => { a.broken = true; });
      SND.players[key] = a;
    }
    return SND.players[key];
  }
  function sndToggle(a, want) {
    if (!a || a.broken) return;
    if (want && a.paused) a.play().catch(() => { a.broken = true; });
    else if (!want && !a.paused) a.pause();
  }
  function syncSound() {
    if (!S) return;
    const snd = S.sound || {};
    const anyOn = snd.roundMusic || snd.raceMusic || snd.tts;
    let btn = document.getElementById('sndUnlock');
    if (anyOn && !SND.unlocked) {
      if (!btn) {
        btn = el('button#sndUnlock', { text: '🔊 Aktivér lyd', style: 'position:fixed;bottom:18px;right:18px;z-index:80;background:var(--navy);color:var(--on-navy);border:2px solid var(--gold);border-radius:999px;padding:12px 22px;font-size:16px;font-weight:700;cursor:pointer;box-shadow:var(--shadow-lg)' });
        btn.addEventListener('click', () => {
          SND.unlocked = true;
          // Lås både musik og TTS op med brugerens klik (browser-krav)
          Object.entries({ round: '/assets/audio/runde.mp3', race: '/assets/audio/loeb.mp3' }).forEach(([k, src]) => {
            const a = sndPlayer(k, src);
            a.play().then(() => a.pause()).catch(() => {});
          });
          if ('speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(''); u.lang = 'da-DK'; speechSynthesis.speak(u); }
          btn.remove();
          syncSound();
        });
        document.body.appendChild(btn);
      }
    } else if (btn) btn.remove();
    if (!SND.unlocked) return;
    const kind = S.slide.kind;
    const inRace = ['warmup-race', 'race', 'final-race'].includes(kind) && S.race && S.race.status !== 'finished';
    const inRound = ['round', 'preseason-round'].includes(S.phase);
    sndToggle(sndPlayer('round', '/assets/audio/runde.mp3'), !!snd.roundMusic && inRound && !inRace);
    sndToggle(sndPlayer('race', '/assets/audio/loeb.mp3'), !!snd.raceMusic && inRace);
  }
  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    const clean = String(text).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim();
    if (!clean) return;
    if (speechSynthesis.pending && speechSynthesis.speaking) return; // undgå kø-ophobning ved hurtige slag
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'da-DK'; u.rate = 1.06; u.pitch = 1.02;
    const voice = speechSynthesis.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith('da'));
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  }
  function ttsRaceFeed() {
    if (!SND.unlocked || !S || !S.sound || !S.sound.tts || !S.race) return;
    const feed = S.race.feed || [];
    if (window.__ttsRace !== S.race.id) { window.__ttsRace = S.race.id; window.__ttsCount = feed.length ? feed.length - 1 : 0; }
    while (window.__ttsCount < feed.length) { speak(feed[window.__ttsCount].text); window.__ttsCount++; }
  }
  // Hooks: kør lyd-sync ved hver state-opdatering
  TG.onState(() => { syncSound(); ttsRaceFeed(); });

  // opdater countdowns hvert sekund
  setInterval(() => { document.querySelectorAll('[data-endsat]').forEach((n) => { n.textContent = TG.countdown(Number(n.getAttribute('data-endsat'))); }); }, 500);
})();
