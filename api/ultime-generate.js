/**
 * Génération Manuscrit Ultime (async) — pipeline séparé du natal.
 * Port GENERATIONS Ultime : ~23 sections × 1200 mots + Gene Keys (Activation / Vénus / Pearl) — ~180 pages.
 * Écrit ultime-* fichiers / flags — ne touche jamais au natal.
 */
const fs = require('fs');
const path = require('path');
const profile = require('./profile');
const claudeNatal = require('./natal/claude-natal');
const claudeUltime = require('./natal/claude-ultime');
const htmlDoc = require('./natal/html-doc');
const chartCache = require('./natal/chart-cache');

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

function outPaths(email) {
  var base = 'ultime-' + safeEmailFile(email);
  var dir = outDir();
  return {
    html: path.join(dir, base + '.html'),
    json: path.join(dir, base + '.json'),
    txt: path.join(dir, base + '.txt')
  };
}

function fileExists(p) {
  try { return !!(p && fs.existsSync(p) && fs.statSync(p).isFile()); }
  catch (e) { return false; }
}

function hasUltimeFile(contact) {
  return !!resolveUltimeFile(contact);
}

function clearUltime(contact) {
  if (!contact) return;
  var paths = [];
  [contact.ultimeHtmlPath, contact.ultimeJsonPath, contact.ultimeTxtPath, contact.ultimePdfPath].forEach(function (p) {
    if (p && paths.indexOf(p) < 0) paths.push(p);
  });
  if (contact.email) {
    var op = outPaths(contact.email);
    [op.html, op.json, op.txt].forEach(function (p) {
      if (paths.indexOf(p) < 0) paths.push(p);
    });
  }
  paths.forEach(function (p) {
    try { if (fileExists(p)) fs.unlinkSync(p); } catch (_) {}
  });
  contact.ultimeReady = false;
  contact.ultimeStatus = 'none';
  contact.ultimeHtmlPath = null;
  contact.ultimeJsonPath = null;
  contact.ultimeTxtPath = null;
  contact.ultimePdfPath = null;
  contact.ultimeGeneratedAt = null;
  contact.ultimeSource = null;
  contact.ultimePagesEst = null;
  contact.ultimeProgress = null;
  contact.ultimeProgressPct = null;
  contact.ultimeError = null;
}

function reconcileUltimeReady(contact) {
  if (!contact) return false;
  var claimed = !!(contact.ultimeReady || contact.ultimeStatus === 'ready');
  if (!claimed) return false;
  if (hasUltimeFile(contact)) return false;
  clearUltime(contact);
  return true;
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

function claudeKey() {
  return claudeNatal.claudeKey();
}

function setProgress(email, message, pct) {
  if (!_hooks.readStore || !_hooks.writeStore) return;
  try {
    var store = _hooks.readStore();
    var c = store.contacts[String(email || '').toLowerCase().trim()];
    if (!c) return;
    c.ultimeStatus = 'generating';
    c.ultimeProgress = String(message || '').slice(0, 200);
    if (pct != null) c.ultimeProgressPct = pct;
    c.ultimeError = null;
    _hooks.writeStore(store);
  } catch (e) {
    _hooks.log('ultime progress write failed: ' + (e && e.message));
  }
}

function markError(email, errMsg) {
  if (!_hooks.readStore || !_hooks.writeStore) return;
  try {
    var store = _hooks.readStore();
    var c = store.contacts[String(email || '').toLowerCase().trim()];
    if (!c) return;
    c.ultimeStatus = 'error';
    c.ultimeReady = false;
    c.ultimeError = String(errMsg || 'Génération impossible').slice(0, 400);
    c.ultimeProgress = null;
    _hooks.writeStore(store);
  } catch (e) {
    _hooks.log('ultime error write failed: ' + (e && e.message));
  }
}

function markReady(email, paths, meta) {
  if (!_hooks.readStore || !_hooks.writeStore) return null;
  var store = _hooks.readStore();
  var key = String(email || '').toLowerCase().trim();
  var c = store.contacts[key];
  if (!c) return null;
  c.ultimeHtmlPath = paths.html;
  c.ultimeJsonPath = paths.json;
  c.ultimeTxtPath = paths.txt;
  c.ultimePdfPath = paths.html;
  c.ultimeReady = true;
  c.ultimeStatus = 'ready';
  c.ultimeGeneratedAt = new Date().toISOString();
  c.ultimeSource = (meta && meta.source) || 'claude-ultime';
  c.ultimePagesEst = (meta && meta.pagesEst) || null;
  c.ultimeProgress = null;
  c.ultimeProgressPct = 100;
  c.ultimeError = null;
  if (_hooks.consume) _hooks.consume(c, 'ultime');
  _hooks.writeStore(store);
  return c;
}

async function generateUltime(contact, opts) {
  opts = opts || {};
  ensureOutDir();
  if (!contact || !contact.email) throw new Error('contact email requis');
  if (!profile.isComplete(contact)) {
    throw new Error('Profil de naissance incomplet');
  }
  if (!claudeKey()) {
    throw new Error('CLAUDE_KEY / ANTHROPIC_API_KEY manquant côté serveur');
  }

  var email = contact.email;
  var onProgress = function (msg, pct) {
    setProgress(email, msg, pct);
    if (opts.onProgress) opts.onProgress(msg, pct);
  };

  contact.ultimeStatus = 'generating';
  contact.ultimeReady = false;
  contact.ultimeError = null;
  onProgress('Ouverture du ciel pour ton Manuscrit Ultime…', 5);

  var chart = await chartCache.ensureChart(contact, {
    onProgress: function (m) { onProgress(m || 'Lecture de ton code de vie…', 22); }
  });
  var hd = chart.hd;
  var astro = chart.astro;
  if (chart.fromCache) {
    onProgress('Carte céleste déjà connue — rédaction Ultime…', 35);
  } else {
    onProgress('Alignement des planètes terminé…', 40);
  }

  onProgress('Le Manuscrit Ultime s’écrit… patience céleste.', 45);
  var manuscrit = await claudeUltime.generateUltimeManuscrit(contact, hd, astro, onProgress);

  var sectionCount = (manuscrit.sections || []).length;
  if (sectionCount < 18) {
    throw new Error('Manuscrit Ultime incomplet (' + sectionCount + ' chapitres, attendu ≥18) — régénère.');
  }

  onProgress('Assemblage et reliure de l’Ultime…', 92);
  var html = htmlDoc.buildNatalHtml(contact, manuscrit, hd, astro, {
    coverMain: 'Ton Manuscrit',
    coverGold: 'Ultime',
    coverEyebrow: 'ÉDITION ULTIME · ~180 PAGES',
    footerLabel: 'Manuscrit Céleste Ultime',
    documentTitle: 'Manuscrit Céleste Ultime'
  });
  var pagesEst = htmlDoc.estimatePages(manuscrit);
  if (manuscrit.gene_keys && pagesEst < 175) pagesEst = 175;
  var paths = outPaths(email);

  var txtParts = [
    'Manuscrit Céleste Ultime — ' + (contact.prenom || ''),
    contact.birthDate + ' ' + contact.birthTime + ' — ' + contact.birthPlace,
    'Pages estimées : ~' + pagesEst,
    '',
    manuscrit.intro || '',
    ''
  ];
  (manuscrit.sections || []).forEach(function (s) {
    txtParts.push('--- ' + (s.numero || '') + '. ' + (s.titre || '') + ' ---');
    txtParts.push(s.contenu || '');
    txtParts.push('');
  });
  if (manuscrit.gene_keys) {
    txtParts.push('--- GENE KEYS ---');
    if (manuscrit.gene_keys.introduction) txtParts.push(manuscrit.gene_keys.introduction);
    ['activation', 'venus', 'pearl'].forEach(function (key) {
      var seq = manuscrit.gene_keys[key];
      if (!seq) return;
      txtParts.push('');
      txtParts.push('### ' + (seq.titre || key));
      if (seq.introduction) txtParts.push(seq.introduction);
      (seq.spheres || []).forEach(function (sp) {
        if (!sp) return;
        txtParts.push((sp.nom || '') + ' — GK ' + (sp.gene_key || '') + ' (' + (sp.nom_cle || '') + ')');
        txtParts.push(sp.texte || '');
      });
    });
    txtParts.push('');
  }
  if (manuscrit.conclusion) {
    txtParts.push('--- Message ---');
    txtParts.push(manuscrit.conclusion);
  }

  fs.writeFileSync(paths.html, html, 'utf8');
  fs.writeFileSync(paths.json, JSON.stringify({
    generatedAt: new Date().toISOString(),
    kind: 'ultime',
    pagesEst: pagesEst,
    hd: hd,
    astro: {
      Sun: astro.Sun, Moon: astro.Moon, Ascendant: astro.Ascendant, MC: astro.MC,
      AspectsClés: astro.AspectsClés, Elements: astro.Elements, PhaseLunaire: astro.PhaseLunaire
    },
    manuscrit: manuscrit
  }, null, 2), 'utf8');
  fs.writeFileSync(paths.txt, txtParts.join('\n'), 'utf8');

  contact.ultimeHtmlPath = paths.html;
  contact.ultimeJsonPath = paths.json;
  contact.ultimeTxtPath = paths.txt;
  contact.ultimePdfPath = paths.html;
  contact.ultimeReady = true;
  contact.ultimeStatus = 'ready';
  contact.ultimeGeneratedAt = new Date().toISOString();
  contact.ultimeSource = 'claude-ultime';
  contact.ultimePagesEst = pagesEst;
  contact.ultimeProgress = null;
  contact.ultimeError = null;

  onProgress('Ton Manuscrit Ultime est prêt ✦', 100);

  return {
    ok: true,
    source: 'claude-ultime',
    htmlPath: paths.html,
    txtPath: paths.txt,
    jsonPath: paths.json,
    pagesEst: pagesEst,
    sections: sectionCount
  };
}

function startUltimeJob(email) {
  var key = String(email || '').toLowerCase().trim();
  if (!key) return { started: false };
  if (runningJobs[key]) return { started: false, alreadyRunning: true };

  if (!_hooks.readStore || !_hooks.writeStore) {
    throw new Error('ultime-generate : injectStoreHooks requis avant startUltimeJob');
  }

  runningJobs[key] = true;
  setProgress(key, 'Le Manuscrit Ultime s’écrit… plusieurs minutes.', 3);

  setImmediate(function () {
    (async function () {
      try {
        var store = _hooks.readStore();
        var c = store.contacts[key];
        if (!c) throw new Error('compte inconnu');
        var gen = await generateUltime(c, {});
        markReady(key, {
          html: c.ultimeHtmlPath,
          json: c.ultimeJsonPath,
          txt: c.ultimeTxtPath
        }, { source: gen.source, pagesEst: gen.pagesEst });
        _hooks.log('ULTIME ready ' + key + ' ~' + (gen.pagesEst || '?') + 'p');
      } catch (err) {
        markError(key, (err && err.message) || 'Génération Ultime impossible');
        _hooks.log('ULTIME error ' + key + ': ' + ((err && err.message) || err));
      } finally {
        delete runningJobs[key];
      }
    })();
  });

  return { started: true };
}

function resolveUltimeFile(contact, prefer) {
  if (!contact) return null;
  if (prefer === 'json' && fileExists(contact.ultimeJsonPath)) {
    return { path: contact.ultimeJsonPath, type: 'application/json; charset=utf-8' };
  }
  if (prefer === 'txt' && fileExists(contact.ultimeTxtPath)) {
    return { path: contact.ultimeTxtPath, type: 'text/plain; charset=utf-8' };
  }
  var htmlPath = contact.ultimeHtmlPath || contact.ultimePdfPath;
  if (fileExists(htmlPath) && /\.html?$/i.test(htmlPath)) {
    return { path: htmlPath, type: 'text/html; charset=utf-8' };
  }
  if (fileExists(contact.ultimePdfPath) && /\.pdf$/i.test(contact.ultimePdfPath)) {
    return { path: contact.ultimePdfPath, type: 'application/pdf' };
  }
  if (fileExists(contact.ultimeTxtPath)) {
    return { path: contact.ultimeTxtPath, type: 'text/plain; charset=utf-8' };
  }
  if (contact.email) {
    var op = outPaths(contact.email);
    if (prefer === 'json' && fileExists(op.json)) {
      return { path: op.json, type: 'application/json; charset=utf-8' };
    }
    if (prefer === 'txt' && fileExists(op.txt)) {
      return { path: op.txt, type: 'text/plain; charset=utf-8' };
    }
    if (fileExists(op.html)) {
      return { path: op.html, type: 'text/html; charset=utf-8' };
    }
    if (fileExists(op.txt)) {
      return { path: op.txt, type: 'text/plain; charset=utf-8' };
    }
  }
  return null;
}

function loadUltimePlain(contact, maxChars) {
  maxChars = maxChars || 14000;
  try {
    var jsonFile = resolveUltimeFile(contact, 'json');
    if (jsonFile && jsonFile.path) {
      var data = JSON.parse(fs.readFileSync(jsonFile.path, 'utf8'));
      if (data && data.manuscrit) return htmlDoc.extractPlainText(data.manuscrit, maxChars);
    }
    var file = resolveUltimeFile(contact);
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
  claudeKey,
  generateUltime,
  startUltimeJob,
  injectStoreHooks,
  resolveUltimeFile,
  hasUltimeFile,
  clearUltime,
  reconcileUltimeReady,
  loadUltimePlain,
  get OUT_DIR() { return outDir(); },
  resolveOutDir,
  runningJobs
};
