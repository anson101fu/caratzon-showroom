/* CARATZON.COM — lightweight country -> initial site language
   CN -> Simplified Chinese; RU -> Russian; everywhere else -> English.
   Uses browser-side country lookup; preserves manual language changes.
   Does not collect or store IP addresses. */
(function () {
  'use strict';
  const LANGUAGE_KEY = 'caratzon-lang';
  const MANUAL_KEY = 'caratzon-geo-manual-choice-v1';
  const CACHE_KEY = 'caratzon-geo-country-v1';
  const CACHE_MS = 60 * 60 * 1000;
  const TIMEOUT_MS = 4500;
  let applyingAutomatically = false;

  const validLang = value => ['ru', 'en', 'zh'].includes(value);
  const languageOf = country => country === 'CN' ? 'zh' : country === 'RU' ? 'ru' : 'en';

  function savedCountry() {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (c && typeof c.country === 'string' && Date.now() - c.at < CACHE_MS) return c.country;
    } catch (_) {}
    return null;
  }
  function storeCountry(code) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({country:code, at:Date.now()})); } catch (_) {}
  }
  function manualChoice() {
    try { return localStorage.getItem(MANUAL_KEY) === '1'; } catch (_) { return false; }
  }
  function languageInPage() {
    const l = (document.documentElement.lang || '').toLowerCase();
    return l.startsWith('zh') ? 'zh' : l.startsWith('ru') ? 'ru' : l.startsWith('en') ? 'en' : null;
  }
  function setDefaultBeforeSiteLoads(lang) {
    if (manualChoice()) return;
    try { localStorage.setItem(LANGUAGE_KEY, lang); } catch (_) {}
  }
  function attachManualSwitchListener() {
    const button = document.getElementById('langBtn');
    if (!button) return;
    button.addEventListener('click', function (event) {
      // Programmatic clicks below should not register as customer preferences.
      if (applyingAutomatically || !event.isTrusted) return;
      try { localStorage.setItem(MANUAL_KEY, '1'); } catch (_) {}
    }, true);
  }
  function applyLanguage(desired) {
    if (!validLang(desired) || manualChoice()) return;
    const button = document.getElementById('langBtn');
    if (!button || typeof button.onclick !== 'function') {
      // App scripts have not installed the existing language handler yet.
      setDefaultBeforeSiteLoads(desired);
      return;
    }
    applyingAutomatically = true;
    try {
      // Use existing app handler so labels, prices, cart and detail views stay in sync.
      for (let n=0; n<3 && languageInPage() !== desired; n++) button.click();
    } finally { applyingAutomatically = false; }
  }
  async function queryCountry(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, { mode:'cors', cache:'no-store', signal:controller.signal });
      if (!response.ok) throw new Error('Geo service HTTP '+response.status);
      const data = await response.json();
      if (data.success === false || data.error === true) throw new Error('Geo service error');
      const code = String(data.country_code || data.country || '').toUpperCase();
      if (!/^[A-Z]{2}$/.test(code)) throw new Error('Country unavailable');
      return code;
    } finally { clearTimeout(timer); }
  }
  async function detectCountry() {
    // First service and an independent fallback, both query directly from the visitor browser.
    for (const url of ['https://ipapi.co/json/', 'https://ipwho.is/']) {
      try { return await queryCountry(url); } catch (_) {}
    }
    return null;
  }

  if (!manualChoice()) setDefaultBeforeSiteLoads(languageOf(savedCountry()));

  function start() {
    attachManualSwitchListener();
    if (manualChoice()) return;
    const cached = savedCountry();
    if (cached) { applyLanguage(languageOf(cached)); return; }
    detectCountry().then(country => {
      if (manualChoice()) return;
      if (country) storeCountry(country);
      applyLanguage(languageOf(country)); // default EN when location lookup failed
    }).catch(() => applyLanguage('en'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
