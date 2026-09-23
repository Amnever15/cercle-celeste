/**
 * Génération natal complète (28 pages) — port serveur de
 * GENERATIONS/manuscrit-celeste-generation.html
 *
 * - HD API + Astro API + Claude (8 parties) côté serveur uniquement
 * - Document HTML multi-sections servi via /natal-file
 * - Job asynchrone (Railway ne coupe pas la requête HTTP longue)
 *
 * ENV requis : CLAUDE_KEY (ou ANTHROPIC_API_KEY)
 * Optionnel : HD_API_URL, ASTRO_API_URL (tes serveurs HD / Astro),
 *             HD_API_TOKEN (Bearer de TON serveur HD — omis si serveur ouvert),
 *             HD_AUTH_STYLE (bearer | x-api-key | none), CLAUDE_MODEL, …
 */
const fs = require('fs');
const path = require('path');
const profile = require('./profile');
const hdMod = require('./natal/hd');
const astroMod = require('./natal/astro');
const claudeNatal = require('./natal/claude-natal');
const htmlDoc = require('./natal/html-doc');

/**
 * Fichiers HTML/JSON/TXT : sur le volume (à côté de store.json) si STORE_PATH / DATA_DIR,
 * sinon api/generated/ (éphémère sur Railway → perdus au redeploy).
 */
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

/** Jobs en cours (évite double génération pour le même email). */
const runningJobs = Object.create(null);

function claudeKey() {
  return claudeNatal.claudeKey();
}

function outDir() {
  return resolveOutDir();
}

function ensureOutDir() {
  var dir = outDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function safeEmailFile(email) {
  return String(email || 'anon').toLowerCase().replace(/[^a-z0-9._-]+/g, '_').slice(0, 80);
}

function outPaths(email) {
  const base = 'natal-' + safeEmailFile(email);
  const dir = outDir();
  return {
    html: path.join(dir, base + '.html'),
    json: path.join(dir, base + '.json'),
    txt: path.join(dir, base + '.txt')
  };
}

function fileExists(p) {
  try {
    return !!(p && fs.existsSync(p) && fs.statSync(p).isFile());
  } catch (e) {
    return false;
  }
}

/** Fichier natal réellement lisible sur disque (pas seulement natalReady en store). */
function hasNatalFile(contact) {
  return !!resolveNatalFile(contact);
}

/**
 * Remet les flags génération à zéro et tente de supprimer les fichiers.
 * Utilisé après perte de volume / admin reset.
 */
function clearNatal(contact) {
  if (!contact) return;
  var paths = [];
  [contact.natalHtmlPath, contact.natalJsonPath, contact.natalTxtPath, contact.natalPdfPath].forEach(function (p) {
    if (p && paths.indexOf(p) < 0) paths.push(p);
  });
  if (contact.email) {
    var op = outPaths(contact.email);
    [op.html, op.json, op.txt].forEach(function (p) {
      if (paths.indexOf(p) < 0) paths.push(p);
    });
    try {
      var oldPdf = path.join(outDir(), 'natal-' + safeEmailFile(contact.email) + '.pdf');
      if (paths.indexOf(oldPdf) < 0) paths.push(oldPdf);
    } catch (_) {}
  }
  paths.forEach(function (p) {
    try {
      if (fileExists(p)) fs.unlinkSync(p);
    } catch (_) {}
  });
  contact.natalReady = false;
  contact.natalStatus = 'none';
  contact.natalHtmlPath = null;
  contact.natalJsonPath = null;
  contact.natalTxtPath = null;
  contact.natalPdfPath = null;
  contact.natalGeneratedAt = null;
  contact.natalSource = null;
  contact.natalPagesEst = null;
  contact.natalProgress = null;
  contact.natalProgressPct = null;
  contact.natalError = null;
}

/**
 * Si store dit « prêt » mais le fichier a disparu (redeploy sans volume) → flags à zéro.
 * @returns {boolean} true si le contact a été modifié
 */
function reconcileNatalReady(contact) {
  if (!contact) return false;
  var claimed = !!(contact.natalReady || contact.natalStatus === 'ready');
  if (!claimed) return false;
  if (hasNatalFile(contact)) return false;
  clearNatal(contact);
  return true;
}

function loadStoreMutators() {
  /* Lazy require pour éviter cycle : server expose helpers via inject. */
  return _storeHooks;
}

var _storeHooks = {
  readStore: null,
  writeStore: null,
  getContact: null,
  consumeNatal: null,
  log: function () {}
};

function injectStoreHooks(hooks) {
  _storeHooks = Object.assign(_storeHooks, hooks || {});
}

function setProgress(email, message, pct) {
  const hooks = loadStoreMutators();
  if (!hooks.readStore || !hooks.writeStore) return;
  try {
    const store = hooks.readStore();
    const key = String(email || '').toLowerCase().trim();
    const c = store.contacts[key];
    if (!c) return;
    c.natalStatus = 'generating';
    c.natalProgress = String(message || '').slice(0, 200);
    if (pct != null) c.natalProgressPct = pct;
    c.natalError = null;
    hooks.writeStore(store);
  } catch (e) {
    hooks.log('natal progress write failed: ' + (e && e.message));
  }
}

function markError(email, errMsg) {
  const hooks = loadStoreMutators();
  if (!hooks.readStore || !hooks.writeStore) return;
  try {
    const store = hooks.readStore();
    const key = String(email || '').toLowerCase().trim();
    const c = store.contacts[key];
    if (!c) return;
    c.natalStatus = 'error';
    c.natalReady = false;
    c.natalError = String(errMsg || 'Génération impossible').slice(0, 400);
    c.natalProgress = null;
    hooks.writeStore(store);
  } catch (e) {
    hooks.log('natal error write failed: ' + (e && e.message));
  }
}

function markReady(email, paths, meta, snapshot) {
  const hooks = loadStoreMutators();
  if (!hooks.readStore || !hooks.writeStore) return null;
  const store = hooks.readStore();
  const key = String(email || '').toLowerCase().trim();
  const c = store.contacts[key];
  if (!c) return null;
  c.natalHtmlPath = paths.html;
  c.natalJsonPath = paths.json;
  c.natalTxtPath = paths.txt;
  c.natalPdfPath = paths.html; /* compat ancien champ : ouvre le HTML */
  c.natalReady = true;
  c.natalStatus = 'ready';
  c.natalGeneratedAt = new Date().toISOString();
  c.natalSource = (meta && meta.source) || 'claude-full';
  c.natalPagesEst = (meta && meta.pagesEst) || null;
  c.natalProgress = null;
  c.natalProgressPct = 100;
  c.natalError = null;
  if (snapshot) {
    if (snapshot.birthTimezone) c.birthTimezone = snapshot.birthTimezone;
    if (snapshot.birthLat != null) c.birthLat = snapshot.birthLat;
    if (snapshot.birthLon != null) c.birthLon = snapshot.birthLon;
  }
  if (hooks.consumeNatal) hooks.consumeNatal(c);
  hooks.writeStore(store);
  return c;
}

/**
 * Pipeline complet (peut durer plusieurs minutes).
 */
async function generateNatal(contact, opts) {
  opts = opts || {};
  ensureOutDir();
  if (!contact || !contact.email) throw new Error('contact email requis');
  if (!profile.isComplete(contact)) {
    throw new Error('Profil de naissance incomplet');
  }
  if (!claudeKey()) {
    throw new Error('CLAUDE_KEY / ANTHROPIC_API_KEY manquant côté serveur');
  }

  const email = contact.email;
  const onProgress = function (msg, pct) {
    setProgress(email, msg, pct);
    if (opts.onProgress) opts.onProgress(msg, pct);
  };

  contact.natalStatus = 'generating';
  contact.natalReady = false;
  contact.natalError = null;
  onProgress('Préparation du ciel de naissance…', 5);

  var lat = contact.birthLat;
  var lon = contact.birthLon;
  var timezone = contact.birthTimezone || '';

  if (!timezone || lat == null || lon == null) {
    onProgress('Timezone & coordonnées…', 8);
    var tzRes = await astroMod.resolveTimezone(lat, lon, contact.birthPlace);
    timezone = (tzRes && tzRes.timezone) || timezone || 'Europe/Paris';
    if (tzRes && tzRes.lat != null) lat = tzRes.lat;
    if (tzRes && tzRes.lon != null) lon = tzRes.lon;
  }
  if (!timezone) timezone = 'Europe/Paris';
  contact.birthTimezone = timezone;
  if (lat != null) contact.birthLat = lat;
  if (lon != null) contact.birthLon = lon;

  var dateRaw = String(contact.birthDate || '').trim() + ' ' + String(contact.birthTime || '12:00').trim();

  hdMod.warmUpHDApi();
  astroMod.warmUpAstroApi();

  onProgress('Calcul Human Design…', 15);
  var hd = await hdMod.fetchHDWithRetry(
    dateRaw,
    contact.birthPlace,
    contact.gender,
    lat,
    lon,
    function (m) { onProgress(m, 22); }
  );

  onProgress('Positions astrales…', 32);
  var astro = await astroMod.fetchAstroWithRetry(
    dateRaw, lat, lon, timezone, contact.birthPlace,
    function (m) { onProgress(m, 38); }
  );

  onProgress('Rédaction du Manuscrit Céleste (plusieurs minutes)…', 45);
  var manuscrit = await claudeNatal.generateManuscrit(contact, hd, astro, onProgress);

  var sectionCount = (manuscrit.sections || []).length;
  if (sectionCount < 8) {
    throw new Error('Manuscrit incomplet (' + sectionCount + ' chapitres) — régénère.');
  }

  onProgress('Mise en page HTML…', 92);
  var html = htmlDoc.buildNatalHtml(contact, manuscrit, hd, astro);
  var pagesEst = htmlDoc.estimatePages(manuscrit);
  var paths = outPaths(email);

  var txtParts = [
    'Manuscrit Céleste — ' + (contact.prenom || ''),
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
  if (manuscrit.conclusion) {
    txtParts.push('--- Message ---');
    txtParts.push(manuscrit.conclusion);
  }

  fs.writeFileSync(paths.html, html, 'utf8');
  fs.writeFileSync(paths.json, JSON.stringify({
    generatedAt: new Date().toISOString(),
    pagesEst: pagesEst,
    hd: hd,
    astro: {
      Sun: astro.Sun, Moon: astro.Moon, Ascendant: astro.Ascendant, MC: astro.MC,
      AspectsClés: astro.AspectsClés, Elements: astro.Elements, PhaseLunaire: astro.PhaseLunaire
    },
    manuscrit: manuscrit
  }, null, 2), 'utf8');
  fs.writeFileSync(paths.txt, txtParts.join('\n'), 'utf8');

  /* Supprimer d’anciens stubs PDF 1 page s’ils existent */
  try {
    var oldPdf = path.join(outDir(), 'natal-' + safeEmailFile(email) + '.pdf');
    if (fs.existsSync(oldPdf)) fs.unlinkSync(oldPdf);
  } catch (_) {}

  contact.natalHtmlPath = paths.html;
  contact.natalJsonPath = paths.json;
  contact.natalTxtPath = paths.txt;
  contact.natalPdfPath = paths.html;
  contact.natalReady = true;
  contact.natalStatus = 'ready';
  contact.natalGeneratedAt = new Date().toISOString();
  contact.natalSource = 'claude-full';
  contact.natalPagesEst = pagesEst;
  contact.natalProgress = null;
  contact.natalError = null;

  onProgress('Prêt ✦', 100);

  return {
    ok: true,
    source: 'claude-full',
    htmlPath: paths.html,
    txtPath: paths.txt,
    jsonPath: paths.json,
    pagesEst: pagesEst,
    sections: sectionCount,
    claudeOk: true
  };
}

/**
 * Démarre un job en arrière-plan (réponse HTTP immédiate).
 * @returns {{ started: boolean, alreadyRunning?: boolean }}
 */
function startNatalJob(email) {
  const key = String(email || '').toLowerCase().trim();
  if (!key) return { started: false };
  if (runningJobs[key]) return { started: false, alreadyRunning: true };

  const hooks = loadStoreMutators();
  if (!hooks.readStore || !hooks.writeStore) {
    throw new Error('natal-generate : injectStoreHooks requis avant startNatalJob');
  }

  runningJobs[key] = true;
  setProgress(key, 'Le Manuscrit Céleste de ta vie s’écrit… plusieurs minutes.', 3);

  setImmediate(function () {
    (async function () {
      try {
        const store = hooks.readStore();
        const c = store.contacts[key];
        if (!c) throw new Error('compte inconnu');
        const gen = await generateNatal(c, {});
        markReady(key, {
          html: c.natalHtmlPath,
          json: c.natalJsonPath,
          txt: c.natalTxtPath
        }, { source: gen.source, pagesEst: gen.pagesEst }, {
          birthTimezone: c.birthTimezone,
          birthLat: c.birthLat,
          birthLon: c.birthLon
        });
        hooks.log('NATAL ready ' + key + ' pages~' + gen.pagesEst + ' sections=' + gen.sections);
      } catch (err) {
        const msg = (err && err.message) || String(err);
        markError(key, msg);
        hooks.log('NATAL error ' + key + ' ' + msg);
      } finally {
        delete runningJobs[key];
      }
    })();
  });

  return { started: true };
}

function resolveNatalFile(contact, prefer) {
  if (!contact) return null;
  if (prefer === 'json' && fileExists(contact.natalJsonPath)) {
    return { path: contact.natalJsonPath, type: 'application/json; charset=utf-8' };
  }
  if (prefer === 'txt' && fileExists(contact.natalTxtPath)) {
    return { path: contact.natalTxtPath, type: 'text/plain; charset=utf-8' };
  }
  var htmlPath = contact.natalHtmlPath || contact.natalPdfPath;
  if (fileExists(htmlPath) && /\.html?$/i.test(htmlPath)) {
    return { path: htmlPath, type: 'text/html; charset=utf-8' };
  }
  if (fileExists(contact.natalPdfPath) && /\.pdf$/i.test(contact.natalPdfPath)) {
    return { path: contact.natalPdfPath, type: 'application/pdf' };
  }
  if (fileExists(contact.natalTxtPath)) {
    return { path: contact.natalTxtPath, type: 'text/plain; charset=utf-8' };
  }
  /* Chemins stockés obsolètes (ancien container) : chercher par email dans OUT_DIR actuel. */
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

function dryRunStructureCheck() {
  var sk = claudeNatal.expectedStructureSkeleton();
  var fakeContact = {
    prenom: 'Test',
    birthDate: '1990-05-12',
    birthTime: '14:30',
    birthPlace: 'Lyon, France',
    gender: 'femme'
  };
  var fakeHd = {
    type: 'Generator', profile: '3/5', authority: 'Sacrale', strategy: 'Répondre',
    definition: 'Simple', cross: 'Croix de test', signature: 'Satisfaction',
    notSelf: 'Frustration', channels: ['34-20'], gates: ['34', '20']
  };
  var fakeAstro = {
    Sun: 'Taureau 21°', Moon: 'Cancer 10°', Ascendant: 'Vierge 5°', MC: 'Gémeaux',
    Mercury: 'Taureau', Venus: 'Gémeaux', Mars: 'Lion', Jupiter: 'Cancer',
    Saturn: 'Capricorne', Uranus: 'Capricorne', Neptune: 'Capricorne', Pluto: 'Scorpion',
    NorthNode: 'Aquarius', Chiron: 'Cancer', Lilith: 'Scorpion',
    AspectsClés: 'Sun conjunction Venus', Elements: 'Feu 20%, Terre 40%, Air 20%, Eau 20%',
    PhaseLunaire: 'First Quarter',
    AstroCarto: { highlights: 'Sun MC @ 4°E', quality: { mode: 'lite' } }
  };
  var fakeMs = {
    placements_confirmes: {
      soleil: fakeAstro.Sun, lune: fakeAstro.Moon, ascendant: fakeAstro.Ascendant, mc: fakeAstro.MC
    },
    intro: 'Intro de test.\n\nDeuxième paragraphe.',
    sections: sk.sections.map(function (n) {
      return {
        numero: n,
        titre: 'Chapitre ' + n,
        sous_titre: 'Sous-titre',
        contenu: Array(40).fill('Paragraphe de démonstration pour le chapitre ' + n + '.').join(' '),
        insight: 'Insight ' + n
      };
    }),
    affirmations: Array(10).fill('Je suis alignée.'),
    rituels: [
      { nom: 'Rituel 1', timing: 'Matin', description: 'Description longue du rituel un. '.repeat(20) },
      { nom: 'Rituel 2', timing: 'Soir', description: 'Description longue du rituel deux. '.repeat(20) },
      { nom: 'Rituel 3', timing: 'Lune', description: 'Description longue du rituel trois. '.repeat(20) }
    ],
    conclusion: 'Conclusion longue de test. '.repeat(40),
    synthese: {
      essence: 'Test, tu es une présence terrestre et lucide.',
      forces: ['Force 1', 'Force 2', 'Force 3'],
      chemin_croissance: 'Grandir en douceur.',
      direction_geo: 'Vers l’Est.',
      strategie_hd: 'Attendre le oui sacral.',
      fenetre_puissance: 'Printemps.',
      mantra: 'Je choisis mon rythme.'
    }
  };
  var html = htmlDoc.buildNatalHtml(fakeContact, fakeMs, fakeHd, fakeAstro);
  var pages = htmlDoc.estimatePages(fakeMs);
  var ok =
    html.indexOf('Manuscrit Céleste') >= 0 &&
    html.indexOf('Chapitre I') >= 0 &&
    html.indexOf('Chapitre XI') >= 0 &&
    html.indexOf('Synthèse exécutive') >= 0 &&
    html.indexOf('Manuscrit Celeste Test') < 0 &&
    pages >= 10;
  return {
    ok: ok,
    pagesEst: pages,
    sections: fakeMs.sections.length,
    htmlBytes: Buffer.byteLength(html, 'utf8'),
    structure: sk,
    hasClaudeKey: !!claudeKey(),
    hasHdToken: !!(hdMod.cfg().token && hdMod.cfg().authStyle !== 'none'),
    hdTokenSource: hdMod.cfg().tokenSource
  };
}

module.exports = {
  claudeKey,
  generateNatal,
  startNatalJob,
  injectStoreHooks,
  resolveNatalFile,
  hasNatalFile,
  clearNatal,
  reconcileNatalReady,
  dryRunStructureCheck,
  get OUT_DIR() { return outDir(); },
  resolveOutDir,
  runningJobs
};
