/**
 * Génération async Manuscrit du mois / du jour.
 * Utilise le cache HD+Astro (chart-cache) — pas de re-fetch si profil déjà scanné.
 */
const fs = require('fs');
const path = require('path');
const profile = require('./profile');
const chartCache = require('./natal/chart-cache');
const claudePeriod = require('./natal/claude-period');
const htmlDoc = require('./natal/html-doc');

const runningJobs = Object.create(null);

function resolveOutDir() {
  if (process.env.NATAL_OUT_DIR) return path.resolve(process.env.NATAL_OUT_DIR);
  if (process.env.STORE_PATH) {
    return path.join(path.dirname(path.resolve(process.env.STORE_PATH)), 'generated');
  }
  if (process.env.DATA_DIR) {
    return path.join(path.resolve(process.env.DATA_DIR), 'generated');
  }
  return path.join(__dirname, 'generated');
}

function outDir() { return resolveOutDir(); }

function ensureOutDir() {
  var dir = outDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function safeEmailFile(email) {
  return String(email || 'anon').toLowerCase().replace(/[^a-z0-9._-]+/g, '_').slice(0, 80);
}

function monthKey(d) {
  d = d || new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function dayKey(d) {
  d = d || new Date();
  return monthKey(d) + '-' + String(d.getDate()).padStart(2, '0');
}

function periodPaths(kind, email, key) {
  var base = (kind === 'jour' ? 'jour-' : 'mois-') + safeEmailFile(email) + '-' + key;
  var dir = outDir();
  return {
    html: path.join(dir, base + '.html'),
    json: path.join(dir, base + '.json'),
    txt: path.join(dir, base + '.txt'),
    key: key
  };
}

function fileExists(p) {
  try { return !!(p && fs.existsSync(p) && fs.statSync(p).isFile()); }
  catch (e) { return false; }
}

var _hooks = {
  readStore: null,
  writeStore: null,
  consume: null,
  log: function () {}
};

function injectStoreHooks(hooks) {
  _hooks = Object.assign(_hooks, hooks || {});
}

function setProgress(email, kind, message, pct) {
  if (!_hooks.readStore || !_hooks.writeStore) return;
  try {
    var store = _hooks.readStore();
    var c = store.contacts[String(email || '').toLowerCase().trim()];
    if (!c) return;
    if (kind === 'jour') {
      c.jourStatus = 'generating';
      c.jourProgress = String(message || '').slice(0, 200);
      c.jourProgressPct = pct;
      c.jourError = null;
    } else {
      c.moisStatus = 'generating';
      c.moisProgress = String(message || '').slice(0, 200);
      c.moisProgressPct = pct;
      c.moisError = null;
    }
    _hooks.writeStore(store);
  } catch (e) {
    _hooks.log('period progress failed: ' + (e && e.message));
  }
}

function markError(email, kind, errMsg) {
  if (!_hooks.readStore || !_hooks.writeStore) return;
  try {
    var store = _hooks.readStore();
    var c = store.contacts[String(email || '').toLowerCase().trim()];
    if (!c) return;
    if (kind === 'jour') {
      c.jourStatus = 'error';
      c.jourReady = false;
      c.jourError = String(errMsg || 'erreur').slice(0, 300);
      c.jourProgress = null;
    } else {
      c.moisStatus = 'error';
      c.moisReady = false;
      c.moisError = String(errMsg || 'erreur').slice(0, 300);
      c.moisProgress = null;
    }
    _hooks.writeStore(store);
  } catch (e) {}
}

function hasPeriodFile(contact, kind) {
  return !!resolvePeriodFile(contact, kind);
}

function resolvePeriodFile(contact, kind) {
  if (!contact) return null;
  kind = kind === 'jour' ? 'jour' : 'mois';
  var keyNow = kind === 'jour' ? dayKey() : monthKey();
  var storedKey = kind === 'jour' ? contact.jourKey : contact.moisKey;
  var htmlPath = kind === 'jour' ? contact.jourHtmlPath : contact.moisHtmlPath;
  if (storedKey === keyNow && fileExists(htmlPath)) {
    return { path: htmlPath, type: 'text/html; charset=utf-8', key: keyNow };
  }
  /* Fallback path convention */
  if (contact.email) {
    var p = periodPaths(kind, contact.email, keyNow).html;
    if (fileExists(p)) return { path: p, type: 'text/html; charset=utf-8', key: keyNow };
  }
  return null;
}

/** Si prêt mais fichier/période obsolète → reset flags. */
function reconcilePeriod(contact, kind) {
  if (!contact) return false;
  kind = kind === 'jour' ? 'jour' : 'mois';
  var ready = kind === 'jour' ? contact.jourReady : contact.moisReady;
  if (!ready) return false;
  if (hasPeriodFile(contact, kind)) return false;
  if (kind === 'jour') {
    contact.jourReady = false;
    contact.jourStatus = 'none';
    contact.jourHtmlPath = null;
    contact.jourKey = null;
  } else {
    contact.moisReady = false;
    contact.moisStatus = 'none';
    contact.moisHtmlPath = null;
    contact.moisKey = null;
  }
  return true;
}

async function generatePeriod(contact, kind) {
  kind = kind === 'jour' ? 'jour' : 'mois';
  if (!contact || !contact.email) throw new Error('email requis');
  if (!profile.isComplete(contact)) throw new Error('Profil de naissance incomplet');
  ensureOutDir();
  var email = contact.email;
  var key = kind === 'jour' ? dayKey() : monthKey();
  var paths = periodPaths(kind, email, key);

  var onProgress = function (msg, pct) {
    setProgress(email, kind, msg, pct);
  };

  onProgress(kind === 'jour'
    ? 'Ouverture du ciel du jour…'
    : 'Ouverture du ciel du mois…', 8);

  var chart = await chartCache.ensureChart(contact, {
    onProgress: function (m) { onProgress(m, 20); }
  });
  /* Persiste le cache thème (évite perte si setProgress re-lit le store). */
  if (_hooks.readStore && _hooks.writeStore) {
    try {
      var st = _hooks.readStore();
      var cc = st.contacts[String(email).toLowerCase().trim()];
      if (cc) {
        chartCache.storeChart(cc, chart.hd, chart.astro);
        if (contact.birthTimezone) cc.birthTimezone = contact.birthTimezone;
        if (contact.birthLat != null) cc.birthLat = contact.birthLat;
        if (contact.birthLon != null) cc.birthLon = contact.birthLon;
        _hooks.writeStore(st);
      }
    } catch (e) {}
  }

  onProgress('Le langage de l’univers s’écrit…', 35);
  var manuscrit = kind === 'jour'
    ? await claudePeriod.generateJour(contact, chart.hd, chart.astro, onProgress)
    : await claudePeriod.generateMois(contact, chart.hd, chart.astro, onProgress);

  onProgress('Reliure du manuscrit…', 90);
  var html = htmlDoc.buildPeriodHtml(kind, contact, manuscrit, chart.hd, chart.astro);
  var pagesEst = htmlDoc.estimatePages(manuscrit);

  var txt = [
    manuscrit.titre || '',
    '',
    manuscrit.intro || '',
    ''
  ];
  (manuscrit.sections || []).forEach(function (s) {
    txt.push('--- ' + (s.numero || '') + '. ' + (s.titre || '') + ' ---');
    txt.push(s.contenu || '');
    txt.push('');
  });
  if (manuscrit.conclusion) txt.push(manuscrit.conclusion);

  fs.writeFileSync(paths.html, html, 'utf8');
  fs.writeFileSync(paths.json, JSON.stringify({
    kind: kind,
    key: key,
    generatedAt: new Date().toISOString(),
    pagesEst: pagesEst,
    manuscrit: manuscrit,
    hd: chart.hd,
    fromCache: chart.fromCache
  }, null, 2), 'utf8');
  fs.writeFileSync(paths.txt, txt.join('\n'), 'utf8');

  return {
    ok: true,
    kind: kind,
    key: key,
    htmlPath: paths.html,
    jsonPath: paths.json,
    txtPath: paths.txt,
    pagesEst: pagesEst,
    manuscrit: manuscrit,
    hd: chart.hd,
    astro: chart.astro
  };
}

function applySuccess(c, kind, result) {
  if (kind === 'jour') {
    c.jourReady = true;
    c.jourStatus = 'ready';
    c.jourKey = result.key;
    c.jourHtmlPath = result.htmlPath;
    c.jourJsonPath = result.jsonPath;
    c.jourGeneratedAt = new Date().toISOString();
    c.jourProgress = null;
    c.jourProgressPct = 100;
    c.jourError = null;
  } else {
    c.moisReady = true;
    c.moisStatus = 'ready';
    c.moisKey = result.key;
    c.moisHtmlPath = result.htmlPath;
    c.moisJsonPath = result.jsonPath;
    c.moisGeneratedAt = new Date().toISOString();
    c.moisProgress = null;
    c.moisProgressPct = 100;
    c.moisError = null;
  }
}

function startPeriodJob(email, kind) {
  kind = kind === 'jour' ? 'jour' : 'mois';
  var jobKey = kind + ':' + String(email || '').toLowerCase().trim();
  if (runningJobs[jobKey]) return runningJobs[jobKey];
  if (!_hooks.readStore || !_hooks.writeStore) {
    throw new Error('store hooks manquants');
  }

  runningJobs[jobKey] = (async function () {
    var store = _hooks.readStore();
    var key = String(email || '').toLowerCase().trim();
    var c = store.contacts[key];
    if (!c) throw new Error('compte inconnu');
    try {
      var result = await generatePeriod(c, kind);
      store = _hooks.readStore();
      c = store.contacts[key];
      if (!c) throw new Error('compte disparu');
      applySuccess(c, kind, result);
      if (result.hd) chartCache.storeChart(c, result.hd, result.astro);
      if (_hooks.consume) _hooks.consume(c, kind);
      _hooks.writeStore(store);
      _hooks.log('PERIOD ready ' + kind + ' ' + key);
      return result;
    } catch (err) {
      markError(key, kind, (err && err.message) || String(err));
      _hooks.log('PERIOD error ' + kind + ' ' + key + ' ' + ((err && err.message) || err));
      throw err;
    } finally {
      delete runningJobs[jobKey];
    }
  })();

  return runningJobs[jobKey];
}

function loadPeriodPlain(contact, kind, maxChars) {
  maxChars = maxChars || 12000;
  try {
    var keyNow = kind === 'jour' ? dayKey() : monthKey();
    var jsonPath = kind === 'jour' ? contact.jourJsonPath : contact.moisJsonPath;
    var storedKey = kind === 'jour' ? contact.jourKey : contact.moisKey;
    if (storedKey === keyNow && fileExists(jsonPath)) {
      var data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      if (data && data.manuscrit) return htmlDoc.extractPlainText(data.manuscrit, maxChars);
    }
    var file = resolvePeriodFile(contact, kind);
    if (file && file.path) {
      var html = fs.readFileSync(file.path, 'utf8');
      var text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (text.length > maxChars) text = text.slice(0, maxChars) + '…';
      return text;
    }
  } catch (e) {}
  return '';
}

module.exports = {
  injectStoreHooks,
  startPeriodJob,
  runningJobs,
  monthKey,
  dayKey,
  hasPeriodFile,
  resolvePeriodFile,
  reconcilePeriod,
  loadPeriodPlain,
  generatePeriod,
  get OUT_DIR() { return outDir(); }
};
