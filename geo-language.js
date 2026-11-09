/* CARATZON.COM — IP country -> first-visit language, v2.1
 * CN -> Simplified Chinese, RU -> Russian, other -> English.
 * Update only this file (leave index.html/app.js/v9.js/products.json alone).
 * Diagnostic: append ?geo_debug=1 to site URL to see country/lookup status.
 */
(function () {
  'use strict';
  const LANG_KEY = 'caratzon-lang';
  const OLD_MANUAL = 'caratzon-geo-manual-choice-v1';
  const OLD_CACHE = 'caratzon-geo-country-v1';
  const MANUAL = 'caratzon-geo-manual-choice-v2';
  const CACHE = 'caratzon-geo-country-v2';
  const MIGRATION = 'caratzon-geo-migrated-v2';
  const COUNTRY_TTL = 4 * 60 * 60 * 1000;
  const DEBUG = /(?:^|[?&])geo_debug=1(?:&|$)/.test(location.search);
  let applying = false;
  let source = 'waiting';
  let countrySeen = '—';

  function read(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function write(k, value) { try { localStorage.setItem(k, value); } catch (_) {} }
  function remove(k) { try { localStorage.removeItem(k); } catch (_) {} }
  function manuallySelected() { return read(MANUAL) === '1'; }
  function langOf(cc) { return cc === 'CN' ? 'zh' : cc === 'RU' ? 'ru' : 'en'; }
  function pageLanguage() {
    const v = String(document.documentElement.lang || '').toLowerCase();
    return v.startsWith('zh') ? 'zh' : v.startsWith('ru') ? 'ru' : v.startsWith('en') ? 'en' : '';
  }
  function validCountry(c) { return /^[A-Z]{2}$/.test(c || ''); }
  function cached() {
    try {
      const d = JSON.parse(read(CACHE) || 'null');
      return d && validCountry(d.country) && Date.now() - d.at < COUNTRY_TTL ? d.country : null;
    } catch (_) { return null; }
  }
  function debugUpdate() {
    if (!DEBUG) return;
    let div = document.getElementById('caratzonGeoStatus');
    if (!div) {
      div = document.createElement('div');
      div.id = 'caratzonGeoStatus';
      div.style.cssText = 'position:fixed;bottom:12px;left:12px;z-index:2147483647;max-width:320px;background:#fff;color:#222;border:1px solid #aaa;padding:10px 13px;font:13px/1.5 system-ui,Arial,sans-serif;box-shadow:0 3px 14px #0002;border-radius:6px;white-space:pre-line';
      (document.body || document.documentElement).appendChild(div);
    }
    div.textContent = 'CARATZON language check\nCountry: '+countrySeen+'\nSource: '+source+'\nLanguage: '+(pageLanguage() || read(LANG_KEY) || '?')+'\nManual preference: '+(manuallySelected()?'yes':'no');
  }
  // One-time migration: old implementation sometimes locked English due to
  // clicking the language button during tests or failing a blocked IP API.
  if (!read(MIGRATION)) {
    remove(OLD_MANUAL);
    remove(OLD_CACHE);
    remove(CACHE);
    remove(LANG_KEY);
    write(MIGRATION, '1');
  }
  // Start with English until the country has actually been resolved.
  // The actual app reads this localStorage key during initialization.
  if (!manuallySelected()) write(LANG_KEY, langOf(cached()));

  function selectLanguage(lang) {
    if (manuallySelected()) return;
    write(LANG_KEY, lang);
    const button = document.getElementById('langBtn');
    if (!button || typeof button.onclick !== 'function') { debugUpdate(); return; }
    applying = true;
    try {
      // Reuse app language handler: this updates text, categories, price currency,
      // cart, and quick views together. Do not just change the HTML lang attribute.
      for (let i=0; i<3 && pageLanguage() !== lang; i++) button.click();
    } finally { applying = false; debugUpdate(); }
  }
  async function lookup(url, getCountry) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3600);
    try {
      const response = await fetch(url, { mode:'cors', cache:'no-store', signal:ctrl.signal });
      if (!response.ok) throw new Error('HTTP '+response.status);
      const data = await response.json();
      if (data.success === false || data.error === true || data.error) throw new Error('API error');
      const cc = String(getCountry(data) || '').trim().toUpperCase();
      if (!validCountry(cc)) throw new Error('No country code');
      return cc;
    } finally { clearTimeout(timer); }
  }
  async function detectCountry() {
    // Each lookup queries the visitor's PUBLIC IP on the provider side; no IP sent
    // by the site to its own server. Country.is and ipwho return 2-letter codes.
    const services = [
      ['country.is', 'https://api.country.is/', d => d.country],
      ['ipwho.is', 'https://ipwho.is/', d => d.country_code],
      ['ipapi.co', 'https://ipapi.co/json/', d => d.country_code]
    ];
    for (const [name,url,parse] of services) {
      try {
        const cc = await lookup(url, parse);
        source = name; countrySeen = cc;
        write(CACHE, JSON.stringify({country:cc, at:Date.now()}));
        return cc;
      } catch (err) {
        if (DEBUG) console.warn('[CARATZON GEO]', name, err.message);
      }
    }
    source = 'lookup failed; English fallback';
    countrySeen = 'unknown';
    return null;
  }
  function setup() {
    const button = document.getElementById('langBtn');
    if (button) button.addEventListener('click', function(e) {
      if (applying || !e.isTrusted) return;
      write(MANUAL, '1');
      source = 'manually selected';
      debugUpdate();
    }, true);
    if (manuallySelected()) { source='saved manual choice'; debugUpdate(); return; }
    const country = cached();
    if (country) {
      countrySeen = country; source = '4-hour cache';
      selectLanguage(langOf(country));
      return;
    }
    debugUpdate();
    detectCountry().then(cc => {
      if (manuallySelected()) { debugUpdate(); return; }
      selectLanguage(langOf(cc));
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, {once:true});
  else setup();
})();
