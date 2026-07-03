/*
 * station.js — Tidslinje-stationen (dedikeret tablet i zonen).
 *
 * Fælles pengeopgave: ALLE hold kan spille. Holdet vælger deres stald på
 * skærmen, lægger de FYSISKE kort i kronologisk rækkefølge og taster
 * kortnumrene ind — begivenhederne vises aldrig på skærmen, og årstal
 * (facit) forlader aldrig serveren. Cooldown og sæt-rotation er pr. hold.
 */
(function () {
  const { el, clear, sd, toast, check } = TG;
  const root = document.getElementById('root');
  let S = null;                                     // seneste server-state
  const ui = { confirmTeam: null, play: null, result: null }; // play: { teamId, teamName, data, seq: [] }

  // ---------- connection ----------
  const urlCode = new URLSearchParams(location.search).get('code');
  const savedCode = urlCode || TG.load('tg_station_code');
  if (savedCode) doJoin(savedCode);

  function doJoin(code) {
    TG.join('station', { code: code.toUpperCase() }).then((res) => {
      if (!res.ok) { toast(res.error || 'Kunne ikke tilslutte.', 'err'); TG.del('tg_station_code'); S = null; render(); return; }
      TG.save('tg_station_code', res.code || code.toUpperCase());
    });
  }
  TG.onState((st) => { S = st; render(); });

  // Sekund-ticker til cooldown-nedtælling
  setInterval(() => { if (S && !ui.play) render(); }, 1000);
  render();

  // ---------- render ----------
  function render() {
    clear(root);
    if (!S) { root.appendChild(joinView()); return; }
    const app = el('div.app');
    app.appendChild(el('div.station-head', {}, [
      el('div.eyebrow', { text: 'The Great Team Derby' }),
      el('h1', { text: '🕰️ Tidslinje-stationen' }),
    ]));
    if (ui.result) app.appendChild(resultView());
    else if (ui.play) app.appendChild(playView());
    else if (ui.confirmTeam) app.appendChild(confirmView());
    else app.appendChild(pickerView());
    root.appendChild(app);
  }

  function joinView() {
    const wrap = el('div.big-center');
    const card = el('div.card', { style: 'max-width:420px;width:100%' });
    card.appendChild(el('div.eyebrow', { text: 'Tidslinje-stationen' }));
    card.appendChild(el('h1', { text: 'The Great Team Derby', style: 'font-size:32px;margin:8px 0 16px' }));
    const inp = el('input', { type: 'text', placeholder: 'Spilkode (fx ABCDE)', maxlength: '6', style: 'text-transform:uppercase;text-align:center;font-size:26px;letter-spacing:4px' });
    const btn = el('button.btn.xl', { text: 'Tilslut station' });
    btn.addEventListener('click', () => { if (inp.value.trim().length >= 4) doJoin(inp.value.trim()); else toast('Indtast en gyldig kode.', 'err'); });
    card.appendChild(el('label.field', {}, [inp]));
    card.appendChild(btn);
    wrap.appendChild(card);
    return wrap;
  }

  // ---------- stald-vælger: alle tilmeldte hold ----------
  function pickerView() {
    const c = el('div.col');
    const teams = (S.teams || []).filter((t) => t.joined);
    if (!teams.length) {
      c.appendChild(el('div.card.center', { style: 'padding:30px' }, [
        el('div', { style: 'font-size:44px', text: '🏇' }),
        el('h2', { text: 'Ingen stalde er klar endnu' }),
        el('p.muted', { style: 'margin-top:8px', text: 'Stationen åbner, når holdene er oprettet.' }),
      ]));
      return c;
    }
    c.appendChild(el('p.muted', { style: 'text-align:center;margin-bottom:6px', text: 'Hvem er I? Tryk på jeres stald for at starte.' }));
    const grid = el('div', { style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px' });
    teams.forEach((t) => {
      const cd = cooldownSecs(t);
      const b = el('button.owner-badge', { style: 'width:100%;cursor:pointer;justify-content:flex-start;text-align:left' + (cd ? ';opacity:.65' : '') });
      b.appendChild(el('span.owner-dot', { style: `background:${t.color.hex}`, text: String(t.teamNumber) }));
      b.appendChild(el('div', { style: 'flex:1' }, [
        el('b', { style: 'font-size:18px;display:block', text: t.stableName }),
        cd ? el('span.chip.red', { style: 'margin-top:4px', text: '⏳ ' + mmss(cd) }) : el('span.muted', { style: 'font-size:12px', text: 'Klar til forsøg' }),
      ]));
      b.addEventListener('click', () => {
        if (cd) { toast(`${t.stableName} er på cooldown — ${mmss(cd)} endnu.`, 'err'); return; }
        ui.confirmTeam = t.id; render();
      });
      grid.appendChild(b);
    });
    c.appendChild(grid);
    c.appendChild(el('p.muted', { style: 'text-align:center;font-size:13px;margin-top:14px', text: 'Sådan virker det: find kortsættet, læg de fysiske kort i kronologisk rækkefølge (ældste først) og tast kortnumrene ind her. Korrekt rækkefølge giver kontanter til staldkassen.' }));
    return c;
  }

  // ---------- bekræft hold (undgå fejltryk — forsøg og cooldown bogføres på holdet) ----------
  function confirmView() {
    const t = (S.teams || []).find((x) => x.id === ui.confirmTeam);
    if (!t) { ui.confirmTeam = null; return pickerView(); }
    const c = el('div.col');
    const card = el('div.card.center', { style: 'padding:24px' });
    card.appendChild(el('span.owner-dot', { style: `background:${t.color.hex};width:56px;height:56px;font-size:24px;margin:0 auto`, text: String(t.teamNumber) }));
    card.appendChild(el('h2', { style: 'margin:10px 0 4px', text: `Er I ${t.stableName}?` }));
    card.appendChild(el('p.muted', { text: 'Forsøget, belønningen og cooldown registreres på denne stald.' }));
    const go = el('button.btn.gold.xl.block', { text: 'Ja — start Tidslinjen!', style: 'margin-top:14px' });
    go.addEventListener('click', () => {
      TG.emit('station:tidslinjeGet', { teamId: t.id }).then((r) => {
        if (!r.ok) return check(r);
        if (r.cooldownLeft) { toast('Cooldown — vent ' + mmss(r.cooldownLeft), 'err'); ui.confirmTeam = null; render(); return; }
        ui.play = { teamId: t.id, teamName: t.stableName, data: r, seq: [] };
        ui.confirmTeam = null;
        render();
      });
    });
    card.appendChild(go);
    const back = el('button.btn.sm.ghost.block', { text: '← Tilbage', style: 'margin-top:8px' });
    back.addEventListener('click', () => { ui.confirmTeam = null; render(); });
    card.appendChild(back);
    c.appendChild(card);
    return c;
  }

  // ---------- play: tast kortnumre i kronologisk rækkefølge ----------
  function playView() {
    const { data, seq, teamName } = ui.play;
    const c = el('div.col');
    const card = el('div.card');
    card.appendChild(el('div.row.between', {}, [
      el('h2', { text: `Sæt ${data.setId}: ${data.title}` }),
      el('span.chip.gold', { text: '+' + sd(data.nextReward) }),
    ]));
    card.appendChild(el('p.muted', { style: 'font-size:13px', text: `Spiller: ${teamName}` }));
    card.appendChild(el('p', { style: 'margin:8px 0', html: `Find de 5 fysiske kort mærket <b>${data.setId}1–${data.setId}5</b>. Læg dem i kronologisk rækkefølge — <b>ældste begivenhed først</b> — og tast kortnumrene ind i den rækkefølge.` }));

    // Slots (den valgte rækkefølge)
    const slots = el('div.row', { style: 'gap:10px;justify-content:center;margin:14px 0' });
    for (let i = 0; i < data.cards.length; i++) {
      slots.appendChild(el('div.slot' + (seq[i] != null ? '.filled' : ''), { text: seq[i] != null ? data.setId + seq[i] : String(i + 1) + '.' }));
    }
    card.appendChild(el('div.row.between', { style: 'font-size:12px;color:var(--text-dim);padding:0 4px' }, [el('span', { text: '← Ældst' }), el('span', { text: 'Nyest →' })]));
    card.appendChild(slots);

    // Kort-tastatur
    const pad = el('div.row', { style: 'gap:12px;justify-content:center;margin:10px 0' });
    data.cards.forEach((cardInfo) => {
      const used = seq.includes(cardInfo.card);
      const b = el('button.cardnum' + (used ? '.used' : ''), { text: data.setId + cardInfo.card });
      b.addEventListener('click', () => { if (seq.length < data.cards.length && !used) { seq.push(cardInfo.card); render(); } });
      pad.appendChild(b);
    });
    card.appendChild(pad);

    const row = el('div.row', { style: 'gap:10px;margin-top:8px' });
    const undo = el('button.btn.ghost', { text: '⌫ Fortryd', style: 'flex:1', disabled: seq.length ? null : 'true' });
    undo.addEventListener('click', () => { seq.pop(); render(); });
    const submit = el('button.btn.gold.lg', { text: 'Aflever rækkefølgen', style: 'flex:2', disabled: seq.length === data.cards.length ? null : 'true' });
    submit.addEventListener('click', () => {
      // Kortnumre → item-ids
      const byCard = Object.fromEntries(data.cards.map((x) => [x.card, x.id]));
      const orderedIds = seq.map((n) => byCard[n]);
      TG.emit('station:tidslinjeSubmit', { teamId: ui.play.teamId, orderedIds }).then((r) => {
        if (!r.ok) return check(r);
        ui.result = { ...r, setId: data.setId, teamName };
        ui.play = null;
        render();
        setTimeout(() => { if (ui.result) { ui.result = null; render(); } }, 15000);
      });
    });
    row.appendChild(undo); row.appendChild(submit);
    card.appendChild(row);

    const cancel = el('button.btn.sm.ghost.block', { text: '← Afbryd (intet forsøg brugt)', style: 'margin-top:8px' });
    cancel.addEventListener('click', () => { ui.play = null; render(); });
    card.appendChild(cancel);

    c.appendChild(card);
    return c;
  }

  // ---------- resultat ----------
  function resultView() {
    const r = ui.result;
    const c = el('div.col');
    const card = el('div.card.center', { style: 'padding:24px' });
    if (r.success) {
      card.appendChild(el('div', { style: 'font-size:52px', text: '🏆' }));
      card.appendChild(el('h2', { text: 'Korrekt rækkefølge!' }));
      card.appendChild(el('p', { style: 'margin:8px 0', html: `+ <b>${sd(r.reward)}</b> til ${r.teamName}` }));
      if (r.correctLabels) {
        const list = el('div', { style: 'text-align:left;margin:10px auto;max-width:420px' });
        r.correctLabels.forEach((label, i) => list.appendChild(el('div', { style: 'padding:4px 0;border-bottom:1px dashed var(--line);font-size:14px', text: `${i + 1}. (${r.setId}${r.correctCards[i]}) ${label}` })));
        card.appendChild(list);
      }
    } else {
      card.appendChild(el('div', { style: 'font-size:52px', text: '⏳' }));
      card.appendChild(el('h2', { text: 'Ikke den rigtige rækkefølge' }));
      card.appendChild(el('p.muted', { style: 'margin:8px 0', text: 'Forsøget er brugt — I kan prøve igen med et nyt sæt, når cooldown er udløbet. Snak om, hvad I var usikre på!' }));
    }
    const done = el('button.btn.block', { text: 'Færdig — næste hold', style: 'margin-top:10px' });
    done.addEventListener('click', () => { ui.result = null; render(); });
    card.appendChild(done);
    c.appendChild(card);
    return c;
  }

  // ---------- util ----------
  function cooldownSecs(team) {
    const exp = team.tidslinjeCooldownUntil || 0;
    if (!exp) return 0;
    return Math.max(0, Math.round((exp - Date.now()) / 1000));
  }
  function mmss(s) { return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
})();
