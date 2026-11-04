/* loebsleder.js — v3.1: løbslederens tablet.
 * Joiner med spilkoden (role: station), viser de 6 frie stationer,
 * og godkender/dumper officielle forsøg pr. stald — payout sker automatisk.
 */
(function () {
  const { el, clear, toast } = TG;
  const root = document.getElementById('root');
  let OV = null;              // seneste station:overview
  let ui = { station: null }; // valgt station
  // v3.8: stopur (lokalt pr. tablet) + live runde-nedtælling
  const sw = { running: false, startedAt: 0, elapsed: 0 };
  function swElapsed() { return sw.elapsed + (sw.running ? Date.now() - sw.startedAt : 0); }
  function fmtSw(ms) { const t = Math.floor(ms / 1000); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
  setInterval(() => {
    const se = document.getElementById('swTime');
    if (se) { se.textContent = fmtSw(swElapsed()); se.style.color = sw.running && swElapsed() >= 90000 ? '#6F191E' : ''; }
    const rc = document.getElementById('roundCd');
    if (rc && OV && OV.roundTimer && OV.roundTimer.endsAt) {
      const left = Math.max(0, Math.ceil((OV.roundTimer.endsAt - Date.now()) / 1000));
      rc.textContent = '⏱ ' + fmtCd(left);
      rc.style.background = left <= 60 ? 'var(--burgundy, #6F191E)' : '';
    }
  }, 250);
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
    // v3.8: samlet runde-nedtælling — altid synlig, også udenfor ved stationerne
    if (OV.roundTimer && OV.roundTimer.endsAt) {
      const left = Math.max(0, Math.ceil((OV.roundTimer.endsAt - Date.now()) / 1000));
      head.appendChild(el('span#roundCd', { style: 'background:var(--navy,#032F4A);color:#fff;font-weight:800;font-size:22px;border-radius:999px;padding:8px 18px;font-variant-numeric:tabular-nums', text: '⏱ ' + fmtCd(left) }));
    }
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
      // v3.2: puslespillet godkendes også her (procent → DD)
      const waiting = OV.teams.filter((t) => ((OV.puzzle || {})[t.id] || {}).pending).length;
      const pb = el('button.st-btn', { style: 'border-color:var(--gold);background:var(--cream-2)' }, [
        el('b', { text: '🧩 Puslespil — godkend procent' }),
        el('span', { text: waiting ? '🔔 ' + waiting + ' stald(e) har bedt om godkendelse' : '600 DD pr. 25 % samlet + 600 bonus ved 100 %' }),
      ]);
      pb.addEventListener('click', () => { ui.station = '__puzzle'; render(); });
      root.appendChild(pb);
      return;
    }

    if (ui.station === '__puzzle') { renderPuzzle(); return; }

    // v3.8: stopur til officielle forsøg (90 sek. på Jockey Guiding/Stabl Høballer, 20 sek. på Æblefarm)
    const swCard = el('div.card', { style: 'display:flex;align-items:center;gap:14px;margin-bottom:12px;padding:12px 16px' });
    swCard.appendChild(el('span#swTime', { style: 'font-size:42px;font-weight:800;font-variant-numeric:tabular-nums;min-width:110px', text: fmtSw(swElapsed()) }));
    const swStart = el('button.btn.sm.turf', { text: sw.running ? 'Stop ⏸' : (swElapsed() ? 'Fortsæt ▶' : 'Start stopur ▶' ) });
    swStart.addEventListener('click', () => { if (sw.running) { sw.elapsed = swElapsed(); sw.running = false; } else { sw.startedAt = Date.now(); sw.running = true; } render(); });
    const swReset = el('button.btn.sm.ghost', { text: 'Nulstil' });
    swReset.addEventListener('click', () => { sw.running = false; sw.elapsed = 0; render(); });
    swCard.appendChild(swStart); swCard.appendChild(swReset);
    swCard.appendChild(el('span', { style: 'font-size:12px;color:#5b6b7d', text: 'Bliver rød ved 90 sek.' }));
    root.appendChild(swCard);
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

  // v3.2: puslespil-godkendelse — vurdér procent samlet, beløbet udbetales automatisk
  function renderPuzzle() {
    root.appendChild(el('p', { style: 'font-size:13px;color:#5b6b7d;margin:0 0 10px', text: 'Vurdér hvor stor en del af puslespillet stalden har samlet. 600 DD pr. 25 % + 600 i bonus ved 100 %. Kan kun godkendes én gang pr. stald.' }));
    OV.teams.forEach((t) => {
      const p = (OV.puzzle || {})[t.id] || {};
      const row = el('div.team-row');
      row.appendChild(el('div.team-dot', { style: 'background:' + ((t.color && t.color.hex) || '#032F4A'), text: String(t.teamNumber) }));
      const info = el('div.team-info');
      info.appendChild(el('b', { text: t.stableName }));
      info.appendChild(el('span', { html: p.completed ? '<span style="color:#2A4B3B;font-weight:700">✔ Godkendt og udbetalt</span>' : p.pending ? '<span class="cd">🔔 Har bedt om godkendelse</span>' : 'Ikke godkendt endnu' }));
      row.appendChild(info);
      if (!p.completed) {
        const act = el('div.actions');
        const sel = el('select', { style: 'font:inherit;padding:10px;border-radius:10px;border:1px solid var(--line)' });
        [25, 50, 75, 100].forEach((pc) => {
          const pay = 600 * (pc / 25) + (pc === 100 ? 600 : 0);
          const o = document.createElement('option');
          o.value = String(pc); o.textContent = pc + ' % → ' + pay + ' DD';
          if (pc === 100) o.selected = true;
          sel.appendChild(o);
        });
        const ok = el('button.btn.sm.turf', { text: 'Godkend' });
        ok.addEventListener('click', () => {
          const pc = Number(sel.value);
          const pay = 600 * (pc / 25) + (pc === 100 ? 600 : 0);
          if (!confirm(t.stableName + ' — puslespil ' + pc + ' % samlet? (+' + pay + ' DD)')) return;
          TG.emit('station:puzzle', { teamId: t.id, percent: pc, approve: true }).then((r) => { if (!r.ok) toast(r.error, 'err'); else toast('+' + r.payout + ' DD til ' + t.stableName, 'ok'); refresh(); });
        });
        act.appendChild(sel); act.appendChild(ok);
        row.appendChild(act);
      }
      root.appendChild(row);
    });
  }

  function stName(id) { if (id === '__puzzle') return '🧩 Puslespil'; const s = (OV && OV.stations || []).find((x) => x.id === id); return s ? s.name : id; }

  if (!savedCode) joinView();
})();
