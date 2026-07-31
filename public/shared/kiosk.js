/*
 * kiosk.js — hærder siden til brug på låste event-tablets (kiosk-tilstand).
 *
 * 1. History-trap: tilbage-knap/gesture smider aldrig brugeren ud af spillet.
 * 2. Wake lock: skærmen slukker ikke midt i et arrangement.
 * 3. Ingen pull-to-refresh, pinch-zoom-rester, long-press-menu eller tekstmarkering.
 *
 * Indlæses på /team og /screen. Gør bevidst IKKE noget ved inputfelter.
 */
(() => {
  'use strict';

  /* ---- 1. History-trap: fang tilbage-navigation ---------------------- */
  try {
    history.pushState(null, '', location.href);
    window.addEventListener('popstate', () => {
      history.pushState(null, '', location.href);
    });
  } catch (e) { /* ældre browser — ignorér */ }

  /* ---- 2. Wake lock: hold skærmen tændt ------------------------------ */
  let wakeLock = null;
  const acquireWakeLock = async () => {
    if (!('wakeLock' in navigator)) return;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch (e) { /* fx lavt batteri — prøver igen ved næste interaktion */ }
  };
  acquireWakeLock();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !wakeLock) acquireWakeLock();
  });
  // Browsere kræver nogle gange en user gesture først:
  window.addEventListener('pointerdown', () => { if (!wakeLock) acquireWakeLock(); }, { passive: true });

  /* ---- 3. Slå browser-adfærd fra der ikke hører hjemme i en app ------ */
  const style = document.createElement('style');
  style.textContent = [
    'html, body { overscroll-behavior: none; }',            // ingen pull-to-refresh / glow
    'body { -webkit-touch-callout: none; touch-action: pan-x pan-y; }',
    'body :not(input):not(textarea):not([contenteditable])',
    '  { -webkit-user-select: none; user-select: none; }',
  ].join('\n');
  document.head.appendChild(style);

  // Long-press-kontekstmenu (gem billede / markér tekst) — ikke i inputfelter.
  document.addEventListener('contextmenu', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    e.preventDefault();
  });

  // Dobbelttryk-zoom på iOS-agtige browsere.
  let lastTouch = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouch < 320 && e.target && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') {
      e.preventDefault();
    }
    lastTouch = now;
  }, { passive: false });
})();
