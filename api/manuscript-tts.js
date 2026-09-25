/**
 * Full-manuscript OpenAI TTS (Divin) with durable disk cache.
 *
 * Quota choice: does NOT consume plans.TTS_CHARS_MONTH (short IA bubble TTS).
 * First generation for a given content hash + voice hits OpenAI once; later listens
 * stream the cached mp3 (cost ~0). Soft limit on first-gen: none — Divin core.
 *
 * Cache path (volume when STORE_PATH/DATA_DIR set):
 *   {generated}/tts/{safeEmail}/{kind}-{periodKey}-{voice}-{hash12}.mp3
 *   + sidecar .meta.json
 *
 * Invalidation: content hash of speakable text, or voice change ⇒ new cache key.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const natalGen = require('./natal-generate');
const periodGen = require('./period-generate');
const coupleGen = require('./couple-generate');
const ultimeGen = require('./ultime-generate');
const profile = require('./profile');

const KINDS = ['natal', 'mois', 'jour', 'couple', 'ultime'];
const OPENAI_CHUNK = 3800;
const DEFAULT_VOICE = profile.DEFAULT_TTS_VOICE || 'nova';
const MODEL = 'tts-1';

/** In-memory jobs: key → { status, done, total, error, audioPath, hash, startedAt } */
const jobs = Object.create(null);

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

function ttsRoot() {
  return path.join(resolveOutDir(), 'tts');
}

function safeEmailFile(email) {
  return String(email || 'anon').toLowerCase().replace(/[^a-z0-9._-]+/g, '_').slice(0, 80);
}

function safeKeyPart(s) {
  return String(s || 'x').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 64);
}

function fileExists(p) {
  try {
    return !!(p && fs.existsSync(p) && fs.statSync(p).isFile());
  } catch (e) {
    return false;
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function sha12(text) {
  return crypto.createHash('sha256').update(String(text || ''), 'utf8').digest('hex').slice(0, 12);
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/?(h[1-6]|p|div|section|article|li|tr|br|hr)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, function (_, n) {
      try { return String.fromCharCode(parseInt(n, 10)); } catch (e) { return ' '; }
    })
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function plainFromJsonManuscrit(obj) {
  if (!obj || typeof obj !== 'object') return '';
  var ms = obj.manuscrit || obj;
  var parts = [];
  if (ms.titre) parts.push(String(ms.titre));
  if (ms.intro) parts.push(String(ms.intro));
  (ms.sections || []).forEach(function (s) {
    if (!s) return;
    if (s.titre) parts.push(String(s.titre));
    if (s.sous_titre) parts.push(String(s.sous_titre));
    if (s.contenu) parts.push(String(s.contenu));
  });
  (ms.affirmations || []).forEach(function (a) {
    if (a) parts.push(String(a));
  });
  (ms.rituels || []).forEach(function (r) {
    if (!r) return;
    if (r.titre) parts.push(String(r.titre));
    if (r.description) parts.push(String(r.description));
  });
  if (ms.conclusion) parts.push(String(ms.conclusion));
  if (ms.synthese && typeof ms.synthese === 'object') {
    Object.keys(ms.synthese).forEach(function (k) {
      if (ms.synthese[k]) parts.push(String(ms.synthese[k]));
    });
  }
  if (ms.gene_keys && typeof ms.gene_keys === 'object') {
    var gk = ms.gene_keys;
    if (gk.introduction) parts.push(String(gk.introduction));
    ['activation', 'venus', 'pearl'].forEach(function (key) {
      var seq = gk[key];
      if (!seq) return;
      if (seq.introduction) parts.push(String(seq.introduction));
      (seq.spheres || []).forEach(function (sp) {
        if (sp && sp.texte) parts.push(String(sp.texte));
      });
    });
  }
  return parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

function readSpeakableFromPath(filePath) {
  if (!fileExists(filePath)) return '';
  var raw = fs.readFileSync(filePath, 'utf8');
  if (/\.txt$/i.test(filePath)) return String(raw || '').trim();
  if (/\.json$/i.test(filePath)) {
    try {
      return plainFromJsonManuscrit(JSON.parse(raw));
    } catch (e) {
      return '';
    }
  }
  if (/\.html?$/i.test(filePath)) return stripHtml(raw);
  return String(raw || '').trim();
}

function resolveSource(contact, kind) {
  if (!contact || KINDS.indexOf(kind) < 0) return null;

  if (kind === 'natal') {
    var natalTxt = natalGen.resolveNatalFile(contact, 'txt');
    var natalHtml = natalGen.resolveNatalFile(contact, 'html') || natalGen.resolveNatalFile(contact);
    var natalJson = natalGen.resolveNatalFile(contact, 'json');
    var natalPath = (natalTxt && natalTxt.path) || (natalHtml && natalHtml.path) || (natalJson && natalJson.path);
    if (!natalPath) return null;
    var natalText = readSpeakableFromPath(natalPath);
    if (!natalText && natalJson) natalText = readSpeakableFromPath(natalJson.path);
    if (!natalText) return null;
    return {
      kind: 'natal',
      periodKey: 'once',
      text: natalText,
      generatedAt: contact.natalGeneratedAt || null,
      sourcePath: natalPath
    };
  }

  if (kind === 'ultime') {
    var uTxt = ultimeGen.resolveUltimeFile(contact, 'txt');
    var uHtml = ultimeGen.resolveUltimeFile(contact, 'html') || ultimeGen.resolveUltimeFile(contact);
    var uJson = ultimeGen.resolveUltimeFile(contact, 'json');
    var uPath = (uTxt && uTxt.path) || (uHtml && uHtml.path) || (uJson && uJson.path);
    if (!uPath) return null;
    var uText = readSpeakableFromPath(uPath);
    if (!uText && uJson) uText = readSpeakableFromPath(uJson.path);
    if (!uText) return null;
    return {
      kind: 'ultime',
      periodKey: 'once',
      text: uText,
      generatedAt: contact.ultimeGeneratedAt || null,
      sourcePath: uPath
    };
  }

  if (kind === 'mois' || kind === 'jour') {
    var pf = periodGen.resolvePeriodFile(contact, kind);
    if (!pf) return null;
    var pKey = pf.key || (kind === 'jour' ? contact.jourKey : contact.moisKey) || 'period';
    var txtGuess = pf.path.replace(/\.html?$/i, '.txt');
    var jsonGuess = pf.path.replace(/\.html?$/i, '.json');
    var pText = '';
    if (fileExists(txtGuess)) pText = readSpeakableFromPath(txtGuess);
    if (!pText) pText = readSpeakableFromPath(pf.path);
    if (!pText && fileExists(jsonGuess)) pText = readSpeakableFromPath(jsonGuess);
    if (!pText) return null;
    return {
      kind: kind,
      periodKey: String(pKey),
      text: pText,
      generatedAt: kind === 'jour' ? contact.jourGeneratedAt : contact.moisGeneratedAt,
      sourcePath: pf.path
    };
  }

  if (kind === 'couple') {
    var cf = coupleGen.resolveCoupleFile(contact);
    if (!cf) return null;
    var cKey = cf.key || contact.coupleKey || 'couple';
    var cTxt = cf.path.replace(/\.html?$/i, '.txt');
    var cJson = cf.path.replace(/\.html?$/i, '.json');
    var cText = '';
    if (fileExists(cTxt)) cText = readSpeakableFromPath(cTxt);
    if (!cText) cText = readSpeakableFromPath(cf.path);
    if (!cText && fileExists(cJson)) cText = readSpeakableFromPath(cJson);
    if (!cText) return null;
    return {
      kind: 'couple',
      periodKey: String(cKey),
      text: cText,
      generatedAt: contact.coupleGeneratedAt || null,
      sourcePath: cf.path
    };
  }

  return null;
}

function cachePaths(email, kind, periodKey, hash, voice) {
  var dir = path.join(ttsRoot(), safeEmailFile(email));
  var voicePart = safeKeyPart(profile.normalizeTtsVoice(voice));
  var base = safeKeyPart(kind) + '-' + safeKeyPart(periodKey) + '-' + voicePart + '-' + safeKeyPart(hash);
  return {
    dir: dir,
    mp3: path.join(dir, base + '.mp3'),
    meta: path.join(dir, base + '.meta.json')
  };
}

function jobKey(email, kind, voice) {
  return String(email || '').toLowerCase().trim() + '|' + kind + '|' + profile.normalizeTtsVoice(voice);
}

function readMeta(metaPath) {
  try {
    return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function writeMeta(metaPath, meta) {
  ensureDir(path.dirname(metaPath));
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
}

/**
 * Split text into ≤OPENAI_CHUNK pieces on paragraph / sentence boundaries.
 */
function chunkText(text, maxLen) {
  maxLen = maxLen || OPENAI_CHUNK;
  var raw = String(text || '').replace(/\r\n/g, '\n').trim();
  if (!raw) return [];
  if (raw.length <= maxLen) return [raw];

  var paras = raw.split(/\n\n+/);
  var chunks = [];
  var buf = '';

  function flush() {
    if (buf.trim()) chunks.push(buf.trim());
    buf = '';
  }

  function pushPiece(piece) {
    piece = String(piece || '').trim();
    if (!piece) return;
    if (piece.length > maxLen) {
      flush();
      var rest = piece;
      while (rest.length > maxLen) {
        var cut = rest.lastIndexOf(' ', maxLen);
        if (cut < maxLen * 0.5) cut = maxLen;
        chunks.push(rest.slice(0, cut).trim());
        rest = rest.slice(cut).trim();
      }
      if (rest) buf = rest;
      return;
    }
    if (!buf) {
      buf = piece;
      return;
    }
    if ((buf.length + 2 + piece.length) <= maxLen) {
      buf = buf + '\n\n' + piece;
    } else {
      flush();
      buf = piece;
    }
  }

  paras.forEach(pushPiece);
  flush();
  return chunks.filter(Boolean);
}

function openaiKey() {
  return String(
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_KEY ||
    process.env.OPEN_AI_API_KEY ||
    ''
  ).trim();
}

async function synthesizeChunk(text, key, httpNatal, voice) {
  var voiceId = profile.normalizeTtsVoice(voice);
  var resp = await httpNatal.fetchWithTimeout(
    'https://api.openai.com/v1/audio/speech',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        voice: voiceId,
        input: text,
        response_format: 'mp3'
      })
    },
    90000
  );
  if (!resp.ok) {
    var errTxt = '';
    try { errTxt = await resp.text(); } catch (_) {}
    var err = new Error('OpenAI TTS HTTP ' + resp.status + (errTxt ? (' ' + errTxt.slice(0, 180)) : ''));
    err.status = resp.status;
    throw err;
  }
  return Buffer.from(await resp.arrayBuffer());
}

async function runJob(email, kind, source, hash, paths, log, voice) {
  var voiceId = profile.normalizeTtsVoice(voice);
  var jk = jobKey(email, kind, voiceId);
  var chunks = chunkText(source.text, OPENAI_CHUNK);
  var key = openaiKey();
  if (!key) {
    jobs[jk] = { status: 'error', done: 0, total: 0, error: 'Voix Céleste indisponible (clé OpenAI manquante côté serveur).', hash: hash, voice: voiceId };
    return;
  }
  if (!chunks.length) {
    jobs[jk] = { status: 'error', done: 0, total: 0, error: 'Manuscrit vide — rien à lire à voix haute.', hash: hash, voice: voiceId };
    return;
  }

  jobs[jk] = {
    status: 'generating',
    done: 0,
    total: chunks.length,
    error: null,
    hash: hash,
    voice: voiceId,
    audioPath: paths.mp3,
    startedAt: Date.now()
  };

  try {
    var httpNatal = require('./natal/http');
    var parts = [];
    for (var i = 0; i < chunks.length; i++) {
      if (jobs[jk] && jobs[jk].cancel) {
        jobs[jk] = { status: 'error', done: i, total: chunks.length, error: 'Annulé.', hash: hash, voice: voiceId };
        return;
      }
      var buf = await synthesizeChunk(chunks[i], key, httpNatal, voiceId);
      parts.push(buf);
      jobs[jk].done = i + 1;
      if (log) log('MS-TTS chunk ' + (i + 1) + '/' + chunks.length + ' ' + email + ' ' + kind + ' voice=' + voiceId);
    }
    ensureDir(paths.dir);
    var audio = Buffer.concat(parts);
    fs.writeFileSync(paths.mp3, audio);
    writeMeta(paths.meta, {
      email: email,
      kind: kind,
      periodKey: source.periodKey,
      hash: hash,
      chars: source.text.length,
      chunks: chunks.length,
      bytes: audio.length,
      model: MODEL,
      voice: voiceId,
      createdAt: new Date().toISOString(),
      sourcePath: source.sourcePath || null,
      generatedAt: source.generatedAt || null,
      note: 'Full-manuscript TTS — not counted against IA chat TTS_CHARS_MONTH quota.'
    });
    jobs[jk] = {
      status: 'ready',
      done: chunks.length,
      total: chunks.length,
      error: null,
      hash: hash,
      voice: voiceId,
      audioPath: paths.mp3,
      finishedAt: Date.now()
    };
    if (log) log('MS-TTS ready ' + email + ' ' + kind + ' voice=' + voiceId + ' chunks=' + chunks.length + ' bytes=' + audio.length);
  } catch (e) {
    var msg = (e && e.message) || String(e);
    if (log) log('MS-TTS fail ' + email + ' ' + kind + ' voice=' + voiceId + ' ' + msg);
    jobs[jk] = {
      status: 'error',
      done: (jobs[jk] && jobs[jk].done) || 0,
      total: chunks.length,
      error: 'La voix Céleste ne répond pas pour le moment. Réessaie dans un instant.',
      hash: hash,
      voice: voiceId
    };
  }
}

/**
 * Check cache / start generation / return progress.
 * @returns {{ ok, cached, ready, status, progress, audioReady, hash, chars, chunks?, error?, note }}
 */
function ensureManuscriptTts(contact, kind, opts) {
  opts = opts || {};
  var log = opts.log || function () {};
  kind = String(kind || '').toLowerCase();
  if (KINDS.indexOf(kind) < 0) {
    return { ok: false, error: 'kind invalide (natal, mois, jour, couple, ultime).' };
  }
  if (!contact || !contact.email) {
    return { ok: false, error: 'Contact requis.' };
  }

  var source = resolveSource(contact, kind);
  if (!source || !source.text) {
    return { ok: false, error: 'Manuscrit introuvable ou vide.' };
  }

  var voice = profile.ttsVoiceOf(contact);
  var hash = sha12(source.text);
  var paths = cachePaths(contact.email, kind, source.periodKey, hash, voice);
  var note =
    'Full-manuscript TTS is not counted against the short IA chat TTS quota (180k chars/mo). ' +
    'Audio is cached on disk after the first successful generation; later listens cost ~0. ' +
    'Regenerating the manuscript or changing the account TTS voice changes the cache key.';

  if (fileExists(paths.mp3)) {
    var meta = readMeta(paths.meta) || {};
    return {
      ok: true,
      cached: true,
      ready: true,
      status: 'ready',
      progress: { done: meta.chunks || 1, total: meta.chunks || 1 },
      audioReady: true,
      hash: hash,
      voice: voice,
      chars: source.text.length,
      chunks: meta.chunks || null,
      periodKey: source.periodKey,
      note: note
    };
  }

  var jk = jobKey(contact.email, kind, voice);
  var job = jobs[jk];
  if (job && job.status === 'generating' && job.hash === hash) {
    return {
      ok: true,
      cached: false,
      ready: false,
      status: 'generating',
      progress: { done: job.done || 0, total: job.total || 0 },
      audioReady: false,
      hash: hash,
      voice: voice,
      chars: source.text.length,
      periodKey: source.periodKey,
      note: note
    };
  }
  if (job && job.status === 'ready' && job.hash === hash && fileExists(job.audioPath || paths.mp3)) {
    return {
      ok: true,
      cached: true,
      ready: true,
      status: 'ready',
      progress: { done: job.total || 1, total: job.total || 1 },
      audioReady: true,
      hash: hash,
      voice: voice,
      chars: source.text.length,
      periodKey: source.periodKey,
      note: note
    };
  }
  if (job && job.status === 'error' && job.hash === hash && opts.retry !== true) {
    /* Allow client to retry by posting again with retry:true, or after clearing. */
  }

  /* Start new job (async). */
  jobs[jk] = {
    status: 'generating',
    done: 0,
    total: chunkText(source.text, OPENAI_CHUNK).length,
    error: null,
    hash: hash,
    voice: voice,
    audioPath: paths.mp3,
    startedAt: Date.now()
  };
  setImmediate(function () {
    runJob(contact.email, kind, source, hash, paths, log, voice).catch(function (e) {
      log('MS-TTS unhandled ' + ((e && e.message) || e));
    });
  });

  return {
    ok: true,
    cached: false,
    ready: false,
    status: 'generating',
    progress: { done: 0, total: jobs[jk].total || 0 },
    audioReady: false,
    hash: hash,
    voice: voice,
    chars: source.text.length,
    periodKey: source.periodKey,
    note: note
  };
}

function getCachedAudio(contact, kind) {
  kind = String(kind || '').toLowerCase();
  if (KINDS.indexOf(kind) < 0 || !contact) return null;
  var source = resolveSource(contact, kind);
  if (!source || !source.text) return null;
  var voice = profile.ttsVoiceOf(contact);
  var hash = sha12(source.text);
  var paths = cachePaths(contact.email, kind, source.periodKey, hash, voice);
  if (!fileExists(paths.mp3)) {
    var jk = jobKey(contact.email, kind, voice);
    var job = jobs[jk];
    if (job && job.status === 'ready' && job.hash === hash && fileExists(job.audioPath)) {
      return { path: job.audioPath, hash: hash, voice: voice, type: 'audio/mpeg' };
    }
    return null;
  }
  return { path: paths.mp3, hash: hash, voice: voice, type: 'audio/mpeg' };
}

function getJobStatus(email, kind, voice) {
  return jobs[jobKey(email, kind, voice || DEFAULT_VOICE)] || null;
}

module.exports = {
  KINDS,
  OPENAI_CHUNK,
  ensureManuscriptTts,
  getCachedAudio,
  getJobStatus,
  resolveSource,
  chunkText,
  stripHtml,
  ttsRoot,
  NOTE:
    'Full-manuscript TTS bypasses TTS_CHARS_MONTH; cache-first on durable generated/tts/.'
};
