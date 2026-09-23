/**
 * Génération async Manuscrit Céleste Couple.
 * Pipeline aligné sur GENERATIONS/manuscrit-celeste-generation-couple.html
 * (HD+Astro ×2 + Claude couple → HTML).
 */
const fs = require('fs');
const path = require('path');
const profile = require('./profile');
const chartCache = require('./natal/chart-cache');
const claudeCouple = require('./natal/claude-couple');
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

function couplePaths(email, key) {
  var base = 'couple-' + safeEmailFile(email) + '-' + key;
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

function setProgress(email, message, pct) {
  if (!_hooks.readStore || !_hooks.writeStore) return;
  try {
    var store = _hooks.readStore();
    var c = store.contacts[String(email || '').toLowerCase().trim()];
    if (!c) return;
    c.coupleStatus = 'generating';
    c.coupleProgress = String(message || '').slice(0, 200);
    c.coupleProgressPct = pct;
    c.coupleError = null;
    _hooks.writeStore(store);
  } catch (e) {
    _hooks.log('couple progress failed: ' + (e && e.message));
  }
}

function markError(email, errMsg) {
  if (!_hooks.readStore || !_hooks.writeStore) return;
  try {
    var store = _hooks.readStore();
    var c = store.contacts[String(email || '').toLowerCase().trim()];
    if (!c) return;
    c.coupleStatus = 'error';
    c.coupleReady = false;
    c.coupleError = String(errMsg || 'erreur').slice(0, 300);
    c.coupleProgress = null;
    _hooks.writeStore(store);
  } catch (e) {}
}

function resolveCoupleFile(contact) {
  if (!contact) return null;
  var keyNow = monthKey();
  var storedKey = contact.coupleKey;
  var htmlPath = contact.coupleHtmlPath;
  if (storedKey === keyNow && fileExists(htmlPath)) {
    return { path: htmlPath, type: 'text/html; charset=utf-8', key: keyNow };
  }
  if (contact.email) {
    var p = couplePaths(contact.email, keyNow).html;
    if (fileExists(p)) return { path: p, type: 'text/html; charset=utf-8', key: keyNow };
  }
  return null;
}

function hasCoupleFile(contact) {
  return !!resolveCoupleFile(contact);
}

function clearCouple(contact) {
  if (!contact) return;
  var paths = [];
  [contact.coupleHtmlPath, contact.coupleJsonPath].forEach(function (p) {
    if (p && paths.indexOf(p) < 0) paths.push(p);
  });
  if (contact.email) {
    var keys = [];
    if (contact.coupleKey) keys.push(contact.coupleKey);
    var now = monthKey();
    if (keys.indexOf(now) < 0) keys.push(now);
    keys.forEach(function (k) {
      var op = couplePaths(contact.email, k);
      [op.html, op.json, op.txt].forEach(function (p) {
        if (paths.indexOf(p) < 0) paths.push(p);
      });
    });
  }
  paths.forEach(function (p) {
    try {
      if (fileExists(p)) fs.unlinkSync(p);
    } catch (_) {}
  });
  contact.coupleReady = false;
  contact.coupleStatus = 'none';
  contact.coupleHtmlPath = null;
  contact.coupleJsonPath = null;
  contact.coupleKey = null;
  contact.coupleGeneratedAt = null;
  contact.coupleProgress = null;
  contact.coupleProgressPct = null;
  contact.coupleError = null;
  contact.couplePagesEst = null;
  /* Autorise 1 nouvelle génération ce mois (quota couple = 1 / mois civil). */
  contact.coupleUsed = 0;
  contact.coupleUsedMonth = null;
}

function reconcileCouple(contact) {
  if (!contact) return false;
  if (!contact.coupleReady) return false;
  if (hasCoupleFile(contact)) return false;
  contact.coupleReady = false;
  contact.coupleStatus = 'none';
  contact.coupleHtmlPath = null;
  contact.coupleKey = null;
  return true;
}

async function generateCoupleManuscript(contact) {
  if (!contact || !contact.email) throw new Error('email requis');
  if (!profile.isComplete(contact)) throw new Error('Profil de naissance incomplet');
  if (!profile.isPartnerComplete(contact)) throw new Error('Profil partenaire incomplet');
  ensureOutDir();
  var email = contact.email;
  var key = monthKey();
  var paths = couplePaths(email, key);
  var partner = profile.partnerAsContact(contact);

  var onProgress = function (msg, pct) {
    setProgress(email, msg, pct);
  };

  onProgress('Ouverture des deux ciels…', 6);

  var chartA = await chartCache.ensureChart(contact, {
    onProgress: function (m) { onProgress(m || 'Thème de ' + (contact.prenom || 'toi') + '…', 15); }
  });
  var chartB = await chartCache.ensurePartnerChart(contact, {
    onProgress: function (m) { onProgress(m || 'Thème de ' + (partner.prenom || 'partenaire') + '…', 28); }
  });

  if (_hooks.readStore && _hooks.writeStore) {
    try {
      var st = _hooks.readStore();
      var cc = st.contacts[String(email).toLowerCase().trim()];
      if (cc) {
        chartCache.storeChart(cc, chartA.hd, chartA.astro);
        chartCache.storePartnerChart(cc, chartB.hd, chartB.astro);
        if (contact.birthTimezone) cc.birthTimezone = contact.birthTimezone;
        if (contact.partnerBirthTimezone) cc.partnerBirthTimezone = contact.partnerBirthTimezone;
        if (contact.birthLat != null) cc.birthLat = contact.birthLat;
        if (contact.birthLon != null) cc.birthLon = contact.birthLon;
        if (contact.partnerBirthLat != null) cc.partnerBirthLat = contact.partnerBirthLat;
        if (contact.partnerBirthLon != null) cc.partnerBirthLon = contact.partnerBirthLon;
        _hooks.writeStore(st);
      }
    } catch (e) {}
  }

  onProgress('Le langage de l’univers s’écrit pour votre couple…', 35);
  var manuscrit = await claudeCouple.generateCouple(
    contact,
    partner,
    chartA,
    chartB,
    onProgress
  );

  onProgress('Reliure du manuscrit de couple…', 94);
  var html = htmlDoc.buildCoupleHtml(contact, partner, manuscrit, chartA.hd, chartA.astro, chartB.hd, chartB.astro);
  var pagesEst = htmlDoc.estimatePages(manuscrit);

  var txt = [
    manuscrit.titre || '',
    manuscrit.sous_titre || '',
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
    kind: 'couple',
    key: key,
    generatedAt: new Date().toISOString(),
    pagesEst: pagesEst,
    manuscrit: manuscrit,
    hdA: chartA.hd,
    hdB: chartB.hd,
    fromCacheA: chartA.fromCache,
    fromCacheB: chartB.fromCache
  }, null, 2), 'utf8');
  fs.writeFileSync(paths.txt, txt.join('\n'), 'utf8');

  return {
    ok: true,
    kind: 'couple',
    key: key,
    htmlPath: paths.html,
    jsonPath: paths.json,
    txtPath: paths.txt,
    pagesEst: pagesEst,
    manuscrit: manuscrit,
    hdA: chartA.hd,
    astroA: chartA.astro,
    hdB: chartB.hd,
    astroB: chartB.astro
  };
}

function applySuccess(c, result) {
  c.coupleReady = true;
  c.coupleStatus = 'ready';
  c.coupleKey = result.key;
  c.coupleHtmlPath = result.htmlPath;
  c.coupleJsonPath = result.jsonPath;
  c.coupleGeneratedAt = new Date().toISOString();
  c.coupleProgress = null;
  c.coupleProgressPct = 100;
  c.coupleError = null;
  c.couplePagesEst = result.pagesEst || null;
}

function startCoupleJob(email) {
  var jobKey = 'couple:' + String(email || '').toLowerCase().trim();
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
      var result = await generateCoupleManuscript(c);
      store = _hooks.readStore();
      c = store.contacts[key];
      if (!c) throw new Error('compte disparu');
      applySuccess(c, result);
      if (result.hdA) chartCache.storeChart(c, result.hdA, result.astroA);
      if (result.hdB) chartCache.storePartnerChart(c, result.hdB, result.astroB);
      if (_hooks.consume) _hooks.consume(c, 'couple');
      _hooks.writeStore(store);
      _hooks.log('COUPLE ready ' + key);
      return result;
    } catch (err) {
      markError(key, (err && err.message) || String(err));
      _hooks.log('COUPLE error ' + key + ' ' + ((err && err.message) || err));
      throw err;
    } finally {
      delete runningJobs[jobKey];
    }
  })();

  return runningJobs[jobKey];
}

function loadCouplePlain(contact, maxChars) {
  maxChars = maxChars || 14000;
  try {
    var keyNow = monthKey();
    var jsonPath = contact && contact.coupleJsonPath;
    var storedKey = contact && contact.coupleKey;
    if (storedKey === keyNow && fileExists(jsonPath)) {
      var data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      if (data && data.manuscrit) return htmlDoc.extractPlainText(data.manuscrit, maxChars);
    }
    var file = resolveCoupleFile(contact);
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
  startCoupleJob,
  runningJobs,
  monthKey,
  hasCoupleFile,
  resolveCoupleFile,
  clearCouple,
  reconcileCouple,
  loadCouplePlain,
  generateCoupleManuscript,
  get OUT_DIR() { return outDir(); }
};
