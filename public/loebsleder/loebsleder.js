/* loebsleder.js — v3.1: løbslederens tablet.
 * Joiner med spilkoden (role: station), viser de 6 frie stationer,
 * og godkender/dumper officielle forsøg pr. stald — payout sker automatisk.
 */
(function () {
  const { el, clear, toast } = TG;
  const root = document.getElementById('root');
  let OV = null;              // seneste station:overview
  let ui = { station: null }; // valgt station
  let joined = false;

  const savedCode = TG.load('tg_rd_code');

  function join(code) {
    TG.emit('join', { role: 'station', code: code.toUpperCase() }).then((r) => {
      if (!r.ok) { toast(r.error || 'Kunne ikke tilslutte', 'err'); TG.del('tg_rd_code'); joinView(); return; }
      TG.save('tg_rd_code', r.code);
      joined = true;
      refresh();
    });
  }

  function refresh() {
    if (!joined) return;
    TG.emit('station:overview').then((r) => {
      if (!r.ok) { toast(r.error || 'Fejl', 'err'); return; }
      OV = r; render();
    });
  }
  setInterval(refresh, 5000);
  TG.socket.on('connect', () => { const c = TG.load('tg_rd_code'); if (c) join(c); });
  if (TG.socket.connected && savedCode) join(savedCode);

  function joinView() {
    clear(root);
    const wrap = el('div.big-center');
    const card = el('div.card', { style: 'min-width:300px' });
    card.appendChild(el('div.eyebrow', { text: 'Løbsleder · Race Director' }));
    card.appendChild(el('h1', { text: 'The Great Team Derby', style: 'font-size:26px;margin:6px 0 14px' }));
    const inp = el('input', { type: 'text', placeholder: 'SPILKODE', style: 'font-size:20px;text-transform:uppercase;text-align:center' });
    const btn = el('button.btn.gold.block.lg', { text: 'Tilslut', style: 'margin-top:10px' });
    btn.addEventListener('click', () => inp.value.trim() && join(inp.value.trim()));
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') btn.click(); });
    card.appendChild(el('label.field', {}, [inp]));
    card.appendChild(btn);
    wrap.appendChild(card);
    root.appendChild(wrap);
  }

  function fmtCd(sec) {
    const m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  function render() {
    if (!OV) return;
    clear(root);
    const head = el('div.rd-head');
    head.appendChild(el('div', {}, [el('div.eyebrow', { text: 'Løbsleder · stationer' }), el('h1', { text: ui.station ? stName(ui.station) : 'Vælg station' })]));
    const leave = el('button.btn.sm.ghost', { text: ui.station ? '← Stationer' : 'Forlad' });
    leave.addEventListener('click', () => {
      if (ui.station) { ui.station = null; render(); return; }
      if (confirm('Forlad spillet på denne tablet?')) { TG.del('tg_rd_code'); joined = false; location.reload(); }
    });
    head.appendChild(leave);
    root.appendChild(head);

    if (!OV.tasksUnlocked) root.appendChild(el('div.card', { style: 'background:var(--cream-2);border:2px solid var(--gold);margin-bottom:12px', html: '<b>⏳ Stationerne er ikke åbne endnu</b><br><span style="font-size:13px">De åbner, når hosten starter træningsfasen.</span>' }));

    if (!ui.station) {
      OV.stations.forEach((s) => {
        const b = el('button.st-btn', {}, [el('b', { text: s.name }), el('span', { text: s.short || '' })]);
        b.addEventListener('click', () => { ui.station = s.id; render(); });
        root.appendChild(b);
      });
      return;
    }

    // team-liste for valgt station
    root.appendChild(el('p', { style: 'font-size:13px;color:#5b6b7d;margin:0 0 10px', text: 'Husk involveringsreglen: HELE stalden skal være samlet. Bestået udbetaler automatisk — dumpet starter kun cooldown.' }));
    OV.teams.forEach((t) => {
      const m = (OV.matrix[t.id] || {})[ui.station] || {};
      const row = el('div.team-row');
      row.appendChild(el('div.team-dot', { style: 'background:' + ((t.color && t.color.hex) || '#032F4A'), text: String(t.teamNumber) }));
      const info = el('div.team-info');
      info.appendChild(el('b', { text: t.stableName }));
      info.appendChild(el('span', { html: m.cooldownLeft ? '<span class="cd">Cooldown ' + fmtCd(m.cooldownLeft) + '</span>' : 'Klar · næste belønning <b>' + (m.nextReward || 0) + ' DD</b> · ' + (m.successes || 0) + ' succeser' }));
      row.appendChild(info);
      const act = el('div.actions');
      const pass = el('button.btn.sm.turf', { text: 'Bestået ✓', disabled: m.cooldownLeft ? 'true' : null });
      pass.addEventListener('click', () => {
        if (!confirm(t.stableName + ' — BESTÅET på ' + stName(ui.station) + '? (+' + (m.nextReward || 0) + ' DD)')) return;
        TG.emit('station:resolve', { teamId: t.id, exerciseId: ui.station, passed: true }).then((r) => { if (!r.ok) toast(r.error, 'err'); else toast('+' + r.payout + ' DD til ' + t.stableName, 'ok'); refresh(); });
      });
      const fail = el('button.btn.sm.ghost', { text: 'Dumpet', disabled: m.cooldownLeft ? 'true' : null });
      fail.addEventListener('click', () => {
        if (!confirm(t.stableName + ' — dumpet? (Cooldown starter, ingen penge)')) return;
        TG.emit('station:resolve', { teamId: t.id, exerciseId: ui.station, passed: false }).then((r) => { if (!r.ok) toast(r.error, 'err'); else toast('Cooldown startet for ' + t.stableName, 'ok'); refresh(); });
      });
      act.appendChild(pass); act.appendChild(fail);
      row.appendChild(act);
      root.appendChild(row);
    });
  }

  function stName(id) { const s = (OV && OV.stations || []).find((x) => x.id === id); return s ? s.name : id; }

  if (!savedCode) joinView();
})();
