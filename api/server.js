/**
 * API Cercle Céleste — webhooks Systeme.io + droits d'accès
 * Aucune dépendance npm. Node 18+.
 *
 * Règle Ultime Céleste : 6 mois PAYÉS, cumulés. Une pause ne remet pas à zéro.
 * Divin : Ultime + IA tout de suite. IA plafonnée à 500 questions / mois.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const plans = require('./plans');
const profile = require('./profile');
const natalGen = require('./natal-generate');

const ROOT = __dirname;
const ULTIME_MONTHS = plans.ULTIME_MONTHS;

function hosted() {
  return !!(
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RENDER ||
    process.env.FLY_APP_NAME ||
    process.env.NODE_ENV === 'production'
  );
}

function loadEnv() {
  if (hosted()) return;
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]]) return;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
}
loadEnv();

/** Persist across Railway redeploys: Volume mount /data + STORE_PATH=/data/store.json */
function resolveStorePath() {
  if (process.env.STORE_PATH) return path.resolve(process.env.STORE_PATH);
  if (process.env.DATA_DIR) return path.join(path.resolve(process.env.DATA_DIR), 'store.json');
  return path.join(ROOT, 'store.json');
}
function resolveLogPath() {
  if (process.env.LOG_PATH) return path.resolve(process.env.LOG_PATH);
  if (process.env.DATA_DIR) return path.join(path.resolve(process.env.DATA_DIR), 'webhook.log');
  if (process.env.STORE_PATH) {
    return path.join(path.dirname(path.resolve(process.env.STORE_PATH)), 'webhook.log');
  }
  return path.join(ROOT, 'webhook.log');
}

const STORE = resolveStorePath();
const LOG = resolveLogPath();
const PORT = parseInt(process.env.PORT || '8789', 10);
const SECRET = process.env.WEBHOOK_SECRET || '';
const DEV = String(process.env.DEV_MODE || 'false') === 'true';
const API_ROUTES = ['/health', '/access', '/login', '/admin', '/admin/grant', '/systeme-webhook', '/webhook-debug', '/generate', '/ia', '/profile', '/natal-file'];
const LAST_WEBHOOKS_MAX = 20;

function ensureParentDir(filePath) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  } catch (e) { /* ignore */ }
}

function storeWritable() {
  try {
    ensureParentDir(STORE);
    fs.accessSync(path.dirname(STORE), fs.constants.W_OK);
    return true;
  } catch (e) {
    return false;
  }
}

function isWeakSecret(s) {
  const t = String(s || '');
  if (t.length < 20) return true;
  return /^(dev-secret|cercle-dev-secret|change-moi|secret|password|webhook)/i.test(t);
}

function warnProduction() {
  if (DEV) {
    console.warn('ATTENTION : DEV_MODE=true — un email inconnu reçoit un faux plan Céleste. En ligne, mets DEV_MODE=false.');
  }
  if (!SECRET || isWeakSecret(SECRET)) {
    console.warn('ATTENTION : WEBHOOK_SECRET trop faible ou vide. Utilise au moins 20 caractères aléatoires (pas « dev-secret »).');
  }
  if (hosted() && STORE.indexOf(ROOT) === 0 && !process.env.STORE_PATH && !process.env.DATA_DIR) {
    console.warn('ATTENTION : store sur disque éphémère (' + STORE + '). Sur Railway : Volume monté sur /data + STORE_PATH=/data/store.json — sinon redeploy = abonnés perdus.');
  }
  console.log('Store     → ' + STORE + (storeWritable() ? ' (writable)' : ' (NON writable)'));
}

function readStore() {
  try {
    const data = JSON.parse(fs.readFileSync(STORE, 'utf8'));
    if (!data.contacts || typeof data.contacts !== 'object') data.contacts = {};
    if (!Array.isArray(data.lastWebhooks)) data.lastWebhooks = [];
    return data;
  } catch (e) {
    return { contacts: {}, lastWebhooks: [] };
  }
}
function writeStore(data) {
  if (!data.lastWebhooks) data.lastWebhooks = [];
  ensureParentDir(STORE);
  fs.writeFileSync(STORE, JSON.stringify(data, null, 2));
}
function logLine(msg) {
  const line = new Date().toISOString() + ' ' + msg + '\n';
  try {
    ensureParentDir(LOG);
    fs.appendFileSync(LOG, line);
  } catch (e) { /* ignore */ }
  console.log(msg);
}

function readLogTail(maxLines) {
  try {
    const raw = fs.readFileSync(LOG, 'utf8');
    const lines = raw.split(/\r?\n/).filter(Boolean);
    return lines.slice(-Math.max(1, maxLines || 40));
  } catch (e) {
    return [];
  }
}

/** Keep last N webhook attempts (auth ok or not) for /webhook-debug. */
function pushLastWebhook(entry) {
  const store = readStore();
  if (!Array.isArray(store.lastWebhooks)) store.lastWebhooks = [];
  store.lastWebhooks.unshift(entry);
  if (store.lastWebhooks.length > LAST_WEBHOOKS_MAX) {
    store.lastWebhooks = store.lastWebhooks.slice(0, LAST_WEBHOOKS_MAX);
  }
  writeStore(store);
  return store;
}

function normEmail(e) {
  return String(e || '').trim().toLowerCase();
}

function emptyContact(email) {
  return {
    email: email,
    prenom: '',
    nom: '',
    active: false,
    monthsPaid: 0,
    saleIds: [],
    createdAt: new Date().toISOString(),
    lastPaymentAt: null,
    canceledAt: null,
    ultimeUnlocked: false,
    plan: 'gratuit',
    lastPaidPlan: null,
    dailyUsed: 0,
    monthlyUsed: 0,
    iaUsed: 0,
    usageMonth: '',
    usageYear: 0,
    birthDate: '',
    birthTime: '',
    birthPlace: '',
    gender: '',
    natalReady: false,
    natalStatus: 'none',
    natalPdfPath: null,
    natalTxtPath: null,
    natalGeneratedAt: null
  };
}

function getContact(store, email) {
  const key = normEmail(email);
  if (!key) return null;
  if (!store.contacts[key]) store.contacts[key] = emptyContact(key);
  return store.contacts[key];
}

function refreshUltime(c) {
  plans.applyPlan(c);
}

function grantPayment(c, saleId, prenom, nom, planId) {
  if (prenom) c.prenom = prenom;
  if (nom) c.nom = nom;
  c.active = true;
  c.canceledAt = null;
  c.lastPaymentAt = new Date().toISOString();
  // Tags ou prix : on pose le plan. Sans indice, on ne casse pas un plan déjà payé.
  if (planId === 'divin' || planId === 'celeste') c.plan = planId;
  else if (!c.plan || c.plan === 'gratuit') c.plan = 'celeste';
  plans.rememberPaidPlan(c, c.plan);
  const id = saleId ? String(saleId) : '';
  if (id && c.saleIds.indexOf(id) >= 0) {
    refreshUltime(c);
    return { doubled: true };
  }
  if (id) c.saleIds.push(id);
  c.monthsPaid = (c.monthsPaid || 0) + 1;
  refreshUltime(c);
  return { doubled: false };
}

function revoke(c) {
  /* Garde Céleste/Divin + monthsPaid ; active=false → droits Gratuit + bannière pause. */
  plans.revokePlan(c);
}

function applyTagAccess(c, info, event) {
  if (info.prenom) c.prenom = info.prenom;
  if (info.nom) c.nom = info.nom;
  if (info.hasDivin) {
    c.plan = 'divin';
    plans.rememberPaidPlan(c, 'divin');
    c.active = true;
    c.canceledAt = null;
    refreshUltime(c);
    return 'TAG_DIVIN_ACTIVE';
  }
  if (info.hasCeleste) {
    c.plan = 'celeste';
    plans.rememberPaidPlan(c, 'celeste');
    c.active = true;
    c.canceledAt = null;
    refreshUltime(c);
    return 'TAG_CELESTE_ACTIVE';
  }
  var contactLike = event === 'TAG' || event === 'CONTACT' || event === 'UNKNOWN';
  if (!contactLike) return 'IGNORED_' + event;
  if (event === 'UNKNOWN' && !info.sawTagField) return 'IGNORED_' + event;
  revoke(c);
  return 'TAG_ABSENT_REVOKED';
}

function pick(obj, paths) {
  for (var i = 0; i < paths.length; i++) {
    var parts = paths[i].split('.');
    var v = obj;
    for (var j = 0; j < parts.length && v != null; j++) v = v[parts[j]];
    if (v == null || v === '') continue;
    if (typeof v === 'object') continue;
    return v;
  }
  return '';
}

function looksLikeEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());
}

function fieldKey(f) {
  if (!f || typeof f !== 'object') return '';
  return String(f.slug || f.field || f.name || f.key || f.fieldName || f.label || '')
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function valueFromFields(fields, names) {
  if (!fields) return '';
  var wanted = {};
  names.forEach(function (n) { wanted[String(n).toLowerCase()] = true; });
  if (Array.isArray(fields)) {
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      if (!f || typeof f !== 'object') continue;
      if (!wanted[fieldKey(f)]) continue;
      var val = f.value != null ? f.value : (f.val != null ? f.val : f.text);
      if (val != null && val !== '' && typeof val !== 'object') return val;
    }
    return '';
  }
  if (typeof fields === 'object') {
    for (var j = 0; j < names.length; j++) {
      var v = fields[names[j]];
      if (v != null && v !== '' && typeof v !== 'object') return v;
    }
  }
  return '';
}

function emailFromFields(fields) {
  if (!fields) return '';
  if (typeof fields === 'string' && looksLikeEmail(fields)) return fields;
  if (Array.isArray(fields)) {
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      if (typeof f === 'string' && looksLikeEmail(f)) return f;
      if (!f || typeof f !== 'object') continue;
      var key = fieldKey(f);
      var val = f.value != null ? f.value : (f.email || f.val);
      if ((key === 'email' || key === 'e_mail' || key === 'mail' || key === 'email_address') && looksLikeEmail(val)) return val;
      if (looksLikeEmail(f.email)) return f.email;
    }
    return '';
  }
  if (typeof fields === 'object') {
    if (looksLikeEmail(fields.email)) return fields.email;
    if (looksLikeEmail(fields.Email)) return fields.Email;
    if (looksLikeEmail(fields.emailAddress)) return fields.emailAddress;
    if (looksLikeEmail(fields.email_address)) return fields.email_address;
  }
  return '';
}

function deepFindEmail(obj, depth) {
  if (obj == null || depth > 8) return '';
  if (typeof obj === 'string') return looksLikeEmail(obj) ? obj : '';
  if (typeof obj !== 'object') return '';
  if (Array.isArray(obj)) {
    for (var i = 0; i < obj.length; i++) {
      var a = deepFindEmail(obj[i], depth + 1);
      if (a) return a;
    }
    return '';
  }
  var keys = Object.keys(obj);
  for (var k = 0; k < keys.length; k++) {
    var key = keys[k];
    var val = obj[key];
    if (/email/i.test(key) && looksLikeEmail(val)) return val;
  }
  for (var j = 0; j < keys.length; j++) {
    var nested = deepFindEmail(obj[keys[j]], depth + 1);
    if (nested) return nested;
  }
  return '';
}

function extractEmail(body) {
  if (!body || typeof body !== 'object') return '';
  var direct = pick(body, [
    'email', 'Email', 'emailAddress', 'email_address', 'contactEmail', 'contact_email',
    'mail', 'userEmail', 'customerEmail', 'customer_email', 'buyerEmail',
    'contact.email', 'contact.Email', 'contact.emailAddress', 'contact.email_address',
    'contact.contact.email', 'contact.contact.Email', 'contact.contact.emailAddress',
    'customer.email', 'customer.Email', 'customer.emailAddress', 'customer.email_address',
    'buyer.email', 'user.email', 'subscriber.email', 'client.email',
    'data.email', 'data.contact.email', 'data.customer.email',
    'data.contact.contact.email', 'data.customer.Email', 'data.customer.emailAddress',
    'payload.email', 'payload.contact.email', 'payload.customer.email',
    'payload.contact.contact.email',
    'order.email', 'order.customer.email', 'order.customerEmail',
    'orderItem.email'
  ]);
  if (looksLikeEmail(direct)) return normEmail(direct);
  var nested = [
    body.fields,
    body.contact && body.contact.fields,
    body.contact && body.contact.contact && body.contact.contact.fields,
    body.customer && body.customer.fields,
    body.data && body.data.fields,
    body.data && body.data.contact && body.data.contact.fields,
    body.data && body.data.customer && body.data.customer.fields,
    body.payload && body.payload.fields,
    body.payload && body.payload.contact && body.payload.contact.fields,
    body.payload && body.payload.customer && body.payload.customer.fields
  ];
  for (var i = 0; i < nested.length; i++) {
    var found = emailFromFields(nested[i]);
    if (looksLikeEmail(found)) return normEmail(found);
  }
  var deep = deepFindEmail(body, 0);
  return looksLikeEmail(deep) ? normEmail(deep) : '';
}

function parseEvent(req, body, url) {
  var hook = '';
  try {
    var u = url || new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
    hook = String(u.searchParams.get('hook') || '').toLowerCase().replace(/_/g, '-');
  } catch (e) { hook = ''; }
  if (!hook) hook = String((body && body.hook) || '').toLowerCase().replace(/_/g, '-');
  if (hook === 'sale-canceled' || hook === 'sale-cancelled' || hook === 'canceled' || hook === 'cancelled' || hook === 'refund') return 'REVOKE';
  if (hook === 'sale-new' || hook === 'new-sale') return 'SALE_NEW';
  if (hook === 'tag-added' || hook === 'tags-added' || hook === 'tag-add') return 'TAG';
  if (hook === 'tag-removed' || hook === 'tags-removed' || hook === 'tag-remove') return 'TAG';
  if (hook === 'tags' || hook === 'tag' || hook === 'contact') return 'TAG';

  var header = (req.headers['x-webhook-event'] || req.headers['x-systeme-event'] || '').toUpperCase();
  var named = String(pick(body, ['event', 'type', 'name', 'trigger', 'action']) || header || '').toUpperCase();
  if (/TAG_REMOVED|CONTACT_TAG_REMOVED|TAG_ADDED|CONTACT_TAG_ADDED|TAG.?ADD|TAG.?REMOVE/.test(named)) return 'TAG';
  if (/SALE_NEW|NEW_SALE|NOUVELLE VENTE|SUBSCRIPTION_STARTED|PAYMENT_SUCCEEDED|SALE\s*NEW|CUSTOMER\.SALE\.COMPLETED|SALE\.COMPLETED/.test(named)) return 'SALE_NEW';
  if (/SALE_CANCELED|SALE_CANCELLED|CANCELED|CANCELLED|REFUND|REVOK|UNPAID|FAILED|PAYMENT_FAILED|ECHEC/.test(named)) return 'REVOKE';
  if (/SALE_NEW/.test(header)) return 'SALE_NEW';
  if (/SALE_CANCELED/.test(header)) return 'REVOKE';
  if (/CONTACT_TAG/.test(header)) return 'TAG';
  if (/CONTACT_OPT_IN|CONTACT_CREATED|CONTACT/.test(named)) return 'CONTACT';
  if (/TAG/.test(named)) return 'TAG';
  // Native SALE_NEW / workflow "nouvelle vente" : order / pricePlan / customer+orderItem
  if (body.order || body.pricePlan || body.sale || body.orderItem) return 'SALE_NEW';
  if (body.customer && (body.funnelStep || body.coupon)) return 'SALE_NEW';
  if (body.tag && (body.contact || (body.contact && body.contact.contact))) return 'TAG';
  return named || 'UNKNOWN';
}

function extract(body) {
  var tagInfo = plans.inspectTags(body);
  var prenom = pick(body, [
    'first_name', 'firstName', 'prenom', 'contact.first_name',
    'contact.firstname', 'contact.contact.first_name',
    'customer.first_name', 'customer.firstName',
    'customer.fields.first_name', 'contact.fields.first_name',
    'data.customer.fields.first_name', 'data.contact.fields.first_name'
  ]);
  var nom = pick(body, [
    'surname', 'lastName', 'last_name', 'nom',
    'contact.surname', 'contact.last_name', 'contact.contact.surname',
    'customer.surname', 'customer.lastName',
    'customer.fields.surname', 'contact.fields.surname',
    'data.customer.fields.surname', 'data.contact.fields.surname'
  ]);
  if (!prenom) {
    prenom = valueFromFields(body.fields, ['first_name', 'firstname', 'prenom'])
      || valueFromFields(body.contact && body.contact.fields, ['first_name', 'firstname', 'prenom'])
      || valueFromFields(body.contact && body.contact.contact && body.contact.contact.fields, ['first_name', 'firstname', 'prenom'])
      || valueFromFields(body.customer && body.customer.fields, ['first_name', 'firstname', 'prenom'])
      || valueFromFields(body.data && body.data.customer && body.data.customer.fields, ['first_name', 'firstname', 'prenom']);
  }
  if (!nom) {
    nom = valueFromFields(body.fields, ['surname', 'last_name', 'lastname', 'nom'])
      || valueFromFields(body.contact && body.contact.fields, ['surname', 'last_name', 'lastname', 'nom'])
      || valueFromFields(body.contact && body.contact.contact && body.contact.contact.fields, ['surname', 'last_name', 'lastname', 'nom'])
      || valueFromFields(body.customer && body.customer.fields, ['surname', 'last_name', 'lastname', 'nom'])
      || valueFromFields(body.data && body.data.customer && body.data.customer.fields, ['surname', 'last_name', 'lastname', 'nom']);
  }
  return {
    email: extractEmail(body),
    prenom: String(prenom || ''),
    nom: String(nom || ''),
    saleId: String(pick(body, [
      'id', 'saleId', 'order.id', 'orderItem.id', 'uuid', 'transactionId',
      'data.order.id', 'data.orderItem.id', 'pricePlan.id'
    ]) || ''),
    plan: tagInfo.plan || plans.detectPlanFallback(body),
    tags: tagInfo.tags,
    hasDivin: tagInfo.hasDivin,
    hasCeleste: tagInfo.hasCeleste,
    sawTagField: tagInfo.sawTagField
  };
}

function publicContact(c) {
  return plans.entitlements(c);
}

function corsHeaders(req) {
  const origin = req.headers.origin;
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Webhook-Secret, X-Webhook-Event, X-Webhook-Signature, X-Systemeio-Signature',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    Vary: 'Origin'
  };
}

function send(res, code, obj, req) {
  const json = JSON.stringify(obj);
  res.writeHead(code, Object.assign({
    'Content-Type': 'application/json; charset=utf-8'
  }, corsHeaders(req || { headers: {} })));
  res.end(json);
}

/** @returns {Promise<{ raw: string, body: object }>} */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({ raw: '', body: {} });
      try { return resolve({ raw: raw, body: JSON.parse(raw) }); }
      catch (e) {
        const params = new URLSearchParams(raw);
        const o = {};
        params.forEach((v, k) => { o[k] = v; });
        resolve({ raw: raw, body: Object.keys(o).length ? o : { raw: raw } });
      }
    });
    req.on('error', reject);
  });
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function queryVal(query, key) {
  if (!query) return '';
  if (typeof query.get === 'function') return query.get(key) || '';
  return query[key] || '';
}

function bearerToken(req) {
  const h = String(req.headers.authorization || '');
  const m = h.match(/^\s*Bearer\s+(.+)\s*$/i);
  return m ? m[1].trim() : '';
}

/**
 * Systeme.io docs (developer.systeme.io/docs/webhooks):
 * - Secret field = HMAC *key*, NOT a password sent as plaintext
 * - Signature = hex HMAC-SHA256 of the (normalized) JSON body in X-Webhook-Signature
 * Normalization: compact JSON, \/ for slashes, \uXXXX for non-ASCII
 *
 * CRITICAL: Never compare X-Webhook-Signature to WEBHOOK_SECRET as strings.
 * Systeme.io often sends BOTH ?secret=… and X-Webhook-Signature (HMAC).
 * A matching ?secret= must win even when the HMAC header is present / wrong.
 */
const WEBHOOK_AUTH_VERSION = 'v2-hmac-aware';

function normalizeSystemeJson(obj) {
  return JSON.stringify(obj)
    .replace(/\//g, '\\/')
    .replace(/[\u007f-\uffff]/g, function (ch) {
      return '\\u' + ('0000' + ch.charCodeAt(0).toString(16)).slice(-4);
    });
}

function hmacSha256Hex(secret, payload) {
  return crypto.createHmac('sha256', String(secret)).update(String(payload), 'utf8').digest('hex');
}

function signatureHeader(req) {
  return String(
    req.headers['x-webhook-signature']
    || req.headers['x-systemeio-signature']
    || req.headers['x-systeme-signature']
    || ''
  ).trim();
}

/** True only for dedicated plaintext secret headers — never signature headers. */
function plaintextSecretFromHeaders(req) {
  return String(
    req.headers['x-webhook-secret']
    || req.headers['x-secret']
    || ''
  ).trim();
}

function verifySystemeHmac(req, rawBody, parsedBody, secret) {
  const key = secret == null ? SECRET : secret;
  const sig = signatureHeader(req);
  if (!key || !sig) return false;
  const got = sig.toLowerCase().replace(/^sha256=/, '');
  // Hex HMAC is ~64 chars; a short plaintext secret in this header is never valid HMAC.
  if (got.length < 32) return false;
  const candidates = [];
  if (rawBody) candidates.push(String(rawBody));
  if (parsedBody && typeof parsedBody === 'object') {
    try {
      const norm = normalizeSystemeJson(parsedBody);
      if (norm && candidates.indexOf(norm) < 0) candidates.push(norm);
      const compact = JSON.stringify(parsedBody);
      if (compact && candidates.indexOf(compact) < 0) candidates.push(compact);
    } catch (e) { /* ignore */ }
  }
  for (var i = 0; i < candidates.length; i++) {
    if (safeEqual(got, hmacSha256Hex(key, candidates[i]))) return true;
  }
  return false;
}

/**
 * Auth result (no secret values logged):
 *   ok + via: plaintext | hmac
 *   !ok + via: no-server-secret | missing | plaintext-mismatch | hmac-mismatch
 * Diagnostics: hasQuery, hasPlainHeader, hasBearer, hasSig, queryMatch, plainMatch
 *
 * Order:
 *   1) Matching plaintext (?secret= / headers / bearer) ALWAYS wins — even if
 *      X-Webhook-Signature is present and would fail as a password comparison.
 *   2) Valid Systeme.io HMAC (secret = key only).
 *   Signature headers are never treated as plaintext passwords.
 */
function checkSecret(req, query, body, rawBody) {
  const hasQuery = !!queryVal(query, 'secret');
  const hasPlainHeader = !!plaintextSecretFromHeaders(req);
  const hasBearer = !!bearerToken(req);
  const hasSig = !!signatureHeader(req);
  const diag = {
    hasQuery: hasQuery,
    hasPlainHeader: hasPlainHeader,
    hasBearer: hasBearer,
    hasSig: hasSig,
    queryMatch: false,
    plainMatch: false,
    secretLen: SECRET ? String(SECRET).length : 0
  };

  if (!SECRET) {
    return Object.assign({ ok: false, via: 'no-server-secret' }, diag);
  }

  // 1) Plaintext secret FIRST — must win even if X-Webhook-Signature is present.
  //    Signature headers are intentionally excluded from this list.
  const plaintextCandidates = [
    { src: 'query', val: queryVal(query, 'secret') },
    { src: 'body', val: body && body.secret },
    { src: 'header', val: plaintextSecretFromHeaders(req) },
    { src: 'bearer', val: bearerToken(req) }
  ];
  var plaintextProvided = false;
  for (var i = 0; i < plaintextCandidates.length; i++) {
    const val = plaintextCandidates[i].val;
    if (!val) continue;
    plaintextProvided = true;
    if (safeEqual(String(val), SECRET)) {
      if (plaintextCandidates[i].src === 'query') diag.queryMatch = true;
      else diag.plainMatch = true;
      return Object.assign({ ok: true, via: 'plaintext' }, diag);
    }
  }

  // 2) Systeme.io HMAC — Secret field is the HMAC key only (never compared as password).
  if (hasSig && verifySystemeHmac(req, rawBody || '', body || {}, SECRET)) {
    return Object.assign({ ok: true, via: 'hmac' }, diag);
  }

  if (plaintextProvided) {
    // ?secret= / header was sent but ≠ WEBHOOK_SECRET (and HMAC did not save it).
    return Object.assign({ ok: false, via: 'plaintext-mismatch' }, diag);
  }
  if (hasSig) {
    return Object.assign({ ok: false, via: 'hmac-mismatch' }, diag);
  }
  return Object.assign({ ok: false, via: 'missing' }, diag);
}

async function handle(req, res) {
  try {
    const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
    const route = url.pathname.replace(/\/+$/, '') || '/';

    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders(req));
      return res.end();
    }

    if (route === '/health' && req.method === 'GET') {
      return send(res, 200, {
        ok: true,
        service: 'cercle-celeste',
        ultimeMonths: ULTIME_MONTHS,
        dev: DEV,
        hasSecret: !!(SECRET && !isWeakSecret(SECRET)),
        hasClaudeKey: !!natalGen.claudeKey(),
        webhookAuth: WEBHOOK_AUTH_VERSION,
        storePath: STORE,
        storeWritable: storeWritable()
      }, req);
    }

    if (route === '/access' && req.method === 'GET') {
      const email = normEmail(url.searchParams.get('email'));
      const store = readStore();
      const c = email && store.contacts[email];
      if (!c && DEV && email) {
        const demo = emptyContact(email);
        demo.prenom = url.searchParams.get('prenom') || 'Sophie';
        demo.plan = plans.demoPlanFromEmail(email);
        demo.active = true;
        demo.monthsPaid = demo.plan === 'gratuit' ? 0 : 2;
        refreshUltime(demo);
        return send(res, 200, Object.assign({ demo: true }, publicContact(demo)));
      }
      return send(res, 200, publicContact(c));
    }

    if (route === '/login' && req.method === 'POST') {
      const body = (await readBody(req)).body;
      const email = normEmail(body.email);
      const prenom = String(body.prenom || '').trim();
      if (!email) return send(res, 400, { error: 'email requis' });
      const store = readStore();
      let c = store.contacts[email];
      if (!c && DEV) {
        c = emptyContact(email);
        c.prenom = prenom || 'Sophie';
        c.plan = plans.demoPlanFromEmail(email);
        c.active = true;
        c.monthsPaid = c.plan === 'gratuit' ? 0 : (c.plan === 'divin' ? 1 : 2);
        refreshUltime(c);
        store.contacts[email] = c;
        writeStore(store);
        return send(res, 200, Object.assign({ demo: true }, publicContact(c)));
      }
      if (!c) {
        c = emptyContact(email);
        c.prenom = prenom;
        c.plan = 'gratuit';
        c.active = true;
        refreshUltime(c);
        store.contacts[email] = c;
        writeStore(store);
        return send(res, 200, Object.assign({ created: 'gratuit' }, publicContact(c)));
      }
      if (prenom && !c.prenom) { c.prenom = prenom; writeStore(store); }
      return send(res, 200, publicContact(c));
    }

    if (route === '/admin' && req.method === 'GET') {
      if (!SECRET || url.searchParams.get('secret') !== SECRET) return send(res, 401, { error: 'secret' });
      const store = readStore();
      return send(res, 200, {
        contacts: Object.values(store.contacts).map(publicContact),
        lastWebhooks: store.lastWebhooks || [],
        storePath: STORE,
        storeWritable: storeWritable()
      });
    }

    /* POST /admin/grant?secret=… — upsert Céleste/Divin (restauration manuelle après wipe). */
    if (route === '/admin/grant' && req.method === 'POST') {
      if (!SECRET || url.searchParams.get('secret') !== SECRET) {
        return send(res, 401, { error: 'secret' }, req);
      }
      const body = (await readBody(req)).body;
      const email = normEmail(body.email);
      if (!email) return send(res, 400, { error: 'email requis' }, req);
      const planId = String(body.plan || 'celeste').toLowerCase();
      if (planId !== 'celeste' && planId !== 'divin') {
        return send(res, 400, { error: 'plan doit être celeste ou divin' }, req);
      }
      const store = readStore();
      const c = getContact(store, email);
      if (body.prenom) c.prenom = String(body.prenom).trim();
      if (body.nom) c.nom = String(body.nom).trim();
      const months = parseInt(body.monthsPaid, 10);
      const saleId = body.saleId ? String(body.saleId) : ('admin-grant-' + Date.now());
      grantPayment(c, saleId, c.prenom || body.prenom, c.nom || body.nom, planId);
      if (Number.isFinite(months) && months >= 0) {
        c.monthsPaid = months;
        refreshUltime(c);
      }
      writeStore(store);
      logLine('ADMIN_GRANT ' + email + ' plan=' + c.plan + ' months=' + c.monthsPaid + ' active=' + c.active);
      return send(res, 200, { ok: true, action: 'ADMIN_GRANT', contact: publicContact(c) }, req);
    }

    if (route === '/webhook-debug' && req.method === 'GET') {
      if (!SECRET || url.searchParams.get('secret') !== SECRET) return send(res, 401, { error: 'secret' }, req);
      const store = readStore();
      const n = Math.min(50, Math.max(1, parseInt(url.searchParams.get('n') || '20', 10) || 20));
      return send(res, 200, {
        ok: true,
        lastWebhooks: (store.lastWebhooks || []).slice(0, n),
        logTail: readLogTail(n),
        hint: 'Si lastWebhooks est vide après un paiement, Systeme.io n’atteint pas ce serveur (URL / redeploy / abonnement événement).'
      }, req);
    }

    if (route === '/systeme-webhook' && req.method === 'GET') {
      return send(res, 200, {
        ok: true,
        hint: 'POST JSON ici. Auth: ?secret=… OU header X-Webhook-Secret / X-Secret OU Authorization: Bearer OU signature HMAC Systeme.io (X-Webhook-Signature). Event: header X-Webhook-Event (SALE_NEW, SALE_CANCELED, CONTACT_TAG_*) ou ?hook=sale-new|sale-canceled|tag-added|tag-removed. Debug: GET /webhook-debug?secret=…'
      }, req);
    }

    if (route === '/systeme-webhook' && req.method === 'POST') {
      const parsed = await readBody(req);
      const body = parsed.body;
      const raw = parsed.raw;
      const auth = checkSecret(req, url.searchParams, body, raw);
      const eventHdr = String(req.headers['x-webhook-event'] || '');
      const baseDiag = {
        at: new Date().toISOString(),
        authVia: auth.via,
        authOk: !!auth.ok,
        eventHeader: eventHdr,
        hasSig: !!auth.hasSig,
        hasQuerySecret: !!auth.hasQuery,
        queryMatch: !!auth.queryMatch,
        plainMatch: !!auth.plainMatch,
        secretLen: auth.secretLen || 0,
        bytes: raw ? raw.length : 0,
        rawPreview: String(raw || '').slice(0, 1200)
      };

      if (!auth.ok) {
        pushLastWebhook(Object.assign({}, baseDiag, { status: 401, reason: 'secret-invalide' }));
        logLine('WEBHOOK → 401 via=' + auth.via +
          ' hasSig=' + !!auth.hasSig +
          ' hasQuery=' + !!auth.hasQuery +
          ' queryMatch=' + !!auth.queryMatch +
          ' secretLen=' + (auth.secretLen || 0) +
          ' eventHdr=' + eventHdr +
          ' bytes=' + (raw ? raw.length : 0) +
          (auth.via === 'plaintext-mismatch'
            ? ' HINT=Railway_WEBHOOK_SECRET_doit_egaler_secret_URL_Systemeio'
            : ''));
        return send(res, 401, {
          error: 'secret invalide',
          via: auth.via,
          hasSig: !!auth.hasSig,
          hasQuery: !!auth.hasQuery,
          hint: auth.via === 'plaintext-mismatch'
            ? 'WEBHOOK_SECRET (Railway) ≠ ?secret= (URL Systeme.io). Ils doivent être identiques.'
            : (auth.via === 'hmac-mismatch'
              ? 'X-Webhook-Signature HMAC invalide et aucun ?secret= correct.'
              : 'Fournir ?secret=… ou un HMAC valide (Secret Systeme.io = clé HMAC, pas un mot de passe).')
        }, req);
      }

      logLine('WEBHOOK raw=' + String(raw || '').slice(0, 2000));
      const event = parseEvent(req, body, url);
      const info = extract(body);
      logLine('WEBHOOK auth=' + auth.via + ' TAGS seen=' + JSON.stringify(info.tags || []) +
        ' divin=' + !!info.hasDivin + ' celeste=' + !!info.hasCeleste +
        ' event=' + event + ' email=' + (info.email || ''));

      if (!info.email) {
        pushLastWebhook(Object.assign({}, baseDiag, {
          status: 200,
          event: event,
          email: '',
          reason: 'no-email',
          tags: info.tags || []
        }));
        logLine('WEBHOOK → 200 no-email event=' + event);
        return send(res, 200, {
          ok: false,
          reason: 'no-email',
          event: event,
          tags: info.tags,
          hint: 'Payload sans email (attendu: customer.email, contact.email ou contact.contact.email)'
        }, req);
      }

      const store = readStore();
      const c = getContact(store, info.email);
      let action = event;
      if (event === 'SALE_NEW') {
        const r = grantPayment(c, info.saleId, info.prenom, info.nom, info.plan);
        action = r.doubled ? 'SALE_NEW_ALREADY_COUNTED' : 'SALE_NEW_MONTH_ADDED';
      } else if (event === 'REVOKE') {
        revoke(c);
        action = 'REVOKED';
      } else {
        action = applyTagAccess(c, info, event);
      }
      if (!Array.isArray(store.lastWebhooks)) store.lastWebhooks = [];
      store.lastWebhooks.unshift({
        at: baseDiag.at,
        status: 200,
        authVia: auth.via,
        authOk: true,
        event: event,
        eventHeader: eventHdr,
        email: info.email,
        action: action,
        plan: c.plan,
        active: c.active,
        tags: info.tags || [],
        hasSig: baseDiag.hasSig,
        hasQuerySecret: baseDiag.hasQuerySecret,
        rawPreview: baseDiag.rawPreview
      });
      if (store.lastWebhooks.length > LAST_WEBHOOKS_MAX) {
        store.lastWebhooks = store.lastWebhooks.slice(0, LAST_WEBHOOKS_MAX);
      }
      writeStore(store);
      logLine('WEBHOOK → 200 ' + action + ' ' + info.email + ' months=' + c.monthsPaid +
        ' active=' + c.active + ' plan=' + c.plan + ' tags=' + JSON.stringify(info.tags || []));
      return send(res, 200, { ok: true, action: action, tags: info.tags, contact: publicContact(c) }, req);
    }

    if (route === '/profile' && req.method === 'GET') {
      const email = normEmail(url.searchParams.get('email'));
      if (!email) return send(res, 400, { error: 'email requis' }, req);
      const store = readStore();
      const c = store.contacts[email];
      if (!c) return send(res, 404, { error: 'compte inconnu', profileComplete: false }, req);
      return send(res, 200, Object.assign({ ok: true }, publicContact(c)), req);
    }

    if (route === '/profile' && req.method === 'POST') {
      const body = (await readBody(req)).body;
      const email = normEmail(body.email);
      if (!email) return send(res, 400, { error: 'email requis' }, req);
      const store = readStore();
      let c = store.contacts[email];
      if (!c) {
        if (!DEV) return send(res, 404, { error: 'compte inconnu' }, req);
        c = emptyContact(email);
        c.prenom = String(body.prenom || '').trim() || 'Sophie';
        c.plan = plans.demoPlanFromEmail(email);
        c.active = true;
        c.monthsPaid = c.plan === 'gratuit' ? 0 : (c.plan === 'divin' ? 1 : 2);
        refreshUltime(c);
        store.contacts[email] = c;
      }
      const saved = profile.saveProfile(c, body);
      if (!saved.ok) return send(res, 400, { error: saved.error, contact: publicContact(c) }, req);
      writeStore(store);
      logLine('PROFILE saved ' + email);
      return send(res, 200, { ok: true, contact: publicContact(c) }, req);
    }

    if (route === '/natal-file' && req.method === 'GET') {
      const email = normEmail(url.searchParams.get('email'));
      if (!email) return send(res, 400, { error: 'email requis' }, req);
      const store = readStore();
      const c = store.contacts[email];
      if (!c) return send(res, 404, { error: 'compte inconnu' }, req);
      const ent = plans.entitlements(c);
      if (!ent.canNatal && !c.natalReady) {
        return send(res, 403, { error: 'Manuscrit natal réservé au plan Céleste / Divin.' }, req);
      }
      const file = natalGen.resolveNatalFile(c, url.searchParams.get('format'));
      if (!file) return send(res, 404, { error: 'aucun fichier natal' }, req);
      try {
        const buf = fs.readFileSync(file.path);
        const name = path.basename(file.path);
        res.writeHead(200, Object.assign({
          'Content-Type': file.type,
          'Content-Length': buf.length,
          'Content-Disposition': 'inline; filename="' + name + '"'
        }, corsHeaders(req)));
        return res.end(buf);
      } catch (e) {
        return send(res, 500, { error: 'lecture fichier' }, req);
      }
    }

    if (route === '/generate' && req.method === 'POST') {
      const body = (await readBody(req)).body;
      const email = normEmail(body.email);
      const kind = String(body.kind || '');
      if (!email || ['natal', 'mois', 'jour', 'ultime'].indexOf(kind) < 0) {
        return send(res, 400, { error: 'email et kind requis' });
      }
      const store = readStore();
      const c = store.contacts[email];
      if (!c) return send(res, 404, { error: 'compte inconnu' });
      const check = plans.canGenerate(c, kind);
      if (!check.ok) return send(res, 403, { error: check.error, contact: publicContact(c) });

      const needProf = profile.requireForGenerate(c, kind);
      if (!needProf.ok) {
        return send(res, 403, {
          error: needProf.error,
          needProfile: true,
          contact: publicContact(c)
        });
      }

      /* Natal déjà prêt : ne pas recompter / regénérer sauf regenerate=true */
      if (kind === 'natal' && c.natalReady && !body.regenerate) {
        return send(res, 200, {
          ok: true,
          kind: kind,
          already: true,
          pdfUrl: '/natal-file?email=' + encodeURIComponent(email),
          contact: publicContact(c)
        });
      }

      if (kind === 'natal') {
        c.natalStatus = 'generating';
        writeStore(store);
        let gen;
        try {
          gen = await natalGen.generateNatal(c);
        } catch (err) {
          c.natalStatus = 'error';
          writeStore(store);
          logLine('NATAL generate error ' + email + ' ' + (err && err.message || err));
          return send(res, 500, {
            error: 'Génération natal impossible pour le moment.',
            contact: publicContact(c)
          });
        }
        plans.consumeGenerate(c, kind);
        writeStore(store);
        logLine('NATAL generated ' + email + ' source=' + (gen && gen.source));
        return send(res, 200, {
          ok: true,
          kind: kind,
          source: gen.source,
          claudeOk: !!gen.claudeOk,
          pdfUrl: '/natal-file?email=' + encodeURIComponent(email),
          contact: publicContact(c)
        });
      }

      plans.consumeGenerate(c, kind);
      writeStore(store);
      return send(res, 200, { ok: true, kind: kind, contact: publicContact(c) });
    }

    if (route === '/ia' && req.method === 'POST') {
      const body = (await readBody(req)).body;
      const email = normEmail(body.email);
      const question = String(body.question || '').trim();
      if (!email || !question) return send(res, 400, { error: 'email et question requis' });
      const store = readStore();
      const c = store.contacts[email];
      if (!c) return send(res, 404, { error: 'compte inconnu' });
      const check = plans.consumeIa(c);
      if (!check.ok) return send(res, 403, { error: check.error, contact: publicContact(c) });
      writeStore(store);
      const answer = 'Réponse démo — le vrai Claude arrivera ici. Pour « ' + question.slice(0, 80) + ' » : regarde d’abord ton autorité intérieure aujourd’hui. Si la vague n’est pas claire, ce n’est pas encore un oui. (1 jeton de quota utilisé.)';
      return send(res, 200, { ok: true, answer: answer, contact: publicContact(c) });
    }

    send(res, 404, { error: 'not found' }, req);
  } catch (err) {
    logLine('ERROR ' + (err && err.stack || err));
    send(res, 500, { error: 'server' }, req);
  }
}

function createServer() {
  return http.createServer((req, res) => { handle(req, res); });
}

function listen(port) {
  const p = port == null ? PORT : port;
  const server = createServer();
  server.listen(p, '0.0.0.0', () => {
    if (!hosted() && !fs.existsSync(path.join(ROOT, '.env')) && fs.existsSync(path.join(ROOT, '.env.example'))) {
      fs.copyFileSync(path.join(ROOT, '.env.example'), path.join(ROOT, '.env'));
    }
    warnProduction();
    console.log('API Cercle → http://0.0.0.0:' + p);
    console.log('Webhook   → POST /systeme-webhook');
    console.log('DEV_MODE  → ' + DEV);
  });
  return server;
}

if (require.main === module) listen();

module.exports = {
  handle,
  listen,
  createServer,
  API_ROUTES,
  warnProduction,
  parseEvent,
  extract,
  grantPayment,
  extractEmail,
  checkSecret,
  verifySystemeHmac,
  hmacSha256Hex,
  WEBHOOK_AUTH_VERSION
};
