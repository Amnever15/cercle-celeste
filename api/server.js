/**
 * API Cercle Céleste — webhooks Systeme.io + droits d'accès
 * Aucune dépendance npm. Node 18+.
 *
 * Règle Ultime Céleste : 6 mois PAYÉS, cumulés. Une pause ne remet pas à zéro.
 * Divin : Ultime + couple + TTS OpenAI tout de suite. IA : tous plans (quotas / mois).
 * IA plafonnée : Gratuit 2 · Céleste 10 · Divin 500 messages / mois civil.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const plans = require('./plans');
const profile = require('./profile');
const language = require('./language');
const natalGen = require('./natal-generate');
const periodGen = require('./period-generate');
const coupleGen = require('./couple-generate');
const ultimeGen = require('./ultime-generate');
const chartCache = require('./natal/chart-cache');
const downloadBundle = require('./download-bundle');
const manuscriptTts = require('./manuscript-tts');

const ROOT = __dirname;
const ULTIME_MONTHS = plans.ULTIME_MONTHS;

natalGen.injectStoreHooks({
  readStore: function () { return readStore(); },
  writeStore: function (data) { writeStore(data); },
  consumeNatal: function (c) { plans.consumeGenerate(c, 'natal'); },
  log: function (msg) { logLine(msg); }
});

periodGen.injectStoreHooks({
  readStore: function () { return readStore(); },
  writeStore: function (data) { writeStore(data); },
  consume: function (c, kind) { plans.consumeGenerate(c, kind); },
  log: function (msg) { logLine(msg); }
});

coupleGen.injectStoreHooks({
  readStore: function () { return readStore(); },
  writeStore: function (data) { writeStore(data); },
  consume: function (c, kind) { plans.consumeGenerate(c, kind); },
  log: function (msg) { logLine(msg); }
});

ultimeGen.injectStoreHooks({
  readStore: function () { return readStore(); },
  writeStore: function (data) { writeStore(data); },
  consume: function (c, kind) { plans.consumeGenerate(c, kind); },
  log: function (msg) { logLine(msg); }
});

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
const API_ROUTES = ['/health', '/access', '/login', '/admin', '/admin/grant', '/admin/natal-reset', '/admin/couple-reset', '/admin/natal-start', '/systeme-webhook', '/webhook-debug', '/generate', '/ia', '/tts', '/manuscript-tts', '/manuscript-tts-audio', '/profile', '/profile-partner', '/natal-file', '/mois-file', '/jour-file', '/couple-file', '/ultime-file', '/download-all'];
const LAST_WEBHOOKS_MAX = 20;
const IA_MESSAGES_MAX = 1000;

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
  console.log('Natal out → ' + natalGen.OUT_DIR);
  try {
    const hd = require('./natal/hd').healthHint();
    console.log(
      'HD auth   → style=' + hd.hdAuthStyle +
      ' token=' + (hd.hasHdToken ? 'yes' : 'no') +
      ' source=' + hd.hdTokenSource +
      ' url=' + hd.hdApiUrl
    );
  } catch (e) {
    console.warn('HD auth   → module natal/hd indisponible: ' + (e && e.message));
  }
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
    language: language.DEFAULT,
    locale: language.DEFAULT,
    languageLocked: false,
    passwordHash: null,
    sessionToken: null,
    active: false,
    monthsPaid: 0,
    divinMonthsPaid: 0,
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
    ttsCharsUsed: 0,
    ttsVoice: profile.DEFAULT_TTS_VOICE,
    usageMonth: '',
    usageYear: 0,
    birthDate: '',
    birthTime: '',
    birthPlace: '',
    birthLat: null,
    birthLon: null,
    birthTimezone: '',
    gender: '',
    profileEditCount: 0,
    natalReady: false,
    natalStatus: 'none',
    natalPdfPath: null,
    natalTxtPath: null,
    natalGeneratedAt: null,
    ultimeReady: false,
    ultimeStatus: 'none',
    ultimeHtmlPath: null,
    ultimePdfPath: null,
    ultimeTxtPath: null,
    ultimeGeneratedAt: null,
    iaMessages: [],
    iaChats: { natal: [], mois: [], jour: [], couple: [] },
    chartHd: null,
    chartAstro: null,
    chartFingerprint: null,
    chartCachedAt: null,
    partnerPrenom: '',
    partnerNom: '',
    partnerBirthDate: '',
    partnerBirthTime: '',
    partnerBirthPlace: '',
    partnerBirthLat: null,
    partnerBirthLon: null,
    partnerBirthTimezone: '',
    partnerGender: '',
    partnerEditCount: 0,
    partnerChartHd: null,
    partnerChartAstro: null,
    partnerChartFingerprint: null,
    partnerChartCachedAt: null,
    coupleUsed: 0,
    coupleUsedMonth: null,
    coupleReady: false,
    coupleStatus: 'none',
    coupleKey: null,
    coupleHtmlPath: null,
    coupleJsonPath: null,
    coupleProgress: null,
    coupleProgressPct: null,
    coupleError: null,
    moisReady: false,
    moisStatus: 'none',
    moisKey: null,
    moisHtmlPath: null,
    moisJsonPath: null,
    moisProgress: null,
    moisError: null,
    jourReady: false,
    jourStatus: 'none',
    jourKey: null,
    jourHtmlPath: null,
    jourJsonPath: null,
    jourProgress: null,
    jourError: null
  };
}

function ensureIaChats(c) {
  if (!c.iaChats || typeof c.iaChats !== 'object') c.iaChats = { natal: [], mois: [], jour: [], couple: [] };
  ['natal', 'mois', 'jour', 'couple'].forEach(function (k) {
    if (!Array.isArray(c.iaChats[k])) c.iaChats[k] = [];
  });
  /* Migration ancienne liste unique → fil natal */
  if (Array.isArray(c.iaMessages) && c.iaMessages.length && !c.iaChats.natal.length) {
    c.iaChats.natal = normalizeIaMessages(c.iaMessages);
  }
  return c.iaChats;
}

function normalizeIaContext(ctx) {
  var c = String(ctx || 'natal').toLowerCase().trim();
  if (c === 'mois' || c === 'jour' || c === 'natal' || c === 'couple' || c === 'ultime') return c;
  return 'natal';
}

function normalizeIaMessages(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    if (!m || typeof m !== 'object') continue;
    const role = m.role === 'me' || m.role === 'user' ? 'me' : (m.role === 'bot' || m.role === 'assistant' ? 'bot' : '');
    const text = String(m.text || m.content || '').trim();
    if (!role || !text) continue;
    const entry = { role: role, text: text };
    if (m.at) entry.at = String(m.at);
    out.push(entry);
  }
  if (out.length > IA_MESSAGES_MAX) return out.slice(out.length - IA_MESSAGES_MAX);
  return out;
}

function appendIaExchange(c, question, answer, context) {
  if (!c) return [];
  const ctx = normalizeIaContext(context);
  const chats = ensureIaChats(c);
  const msgs = normalizeIaMessages(chats[ctx]);
  const at = new Date().toISOString();
  msgs.push({ role: 'me', text: String(question || '').trim(), at: at });
  msgs.push({ role: 'bot', text: String(answer || '').trim(), at: at });
  chats[ctx] = msgs.length > IA_MESSAGES_MAX ? msgs.slice(msgs.length - IA_MESSAGES_MAX) : msgs;
  c.iaChats = chats;
  if (ctx === 'natal') c.iaMessages = chats.natal;
  return chats[ctx];
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
  if (c.plan === 'divin') {
    c.divinMonthsPaid = (c.divinMonthsPaid || 0) + 1;
  }
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
  const out = plans.entitlements(c);
  const fileOk = !!(c && natalGen.hasNatalFile(c));
  out.natalFileExists = fileOk;
  out.hasPassword = !!(c && c.passwordHash);
  out.hasChartCache = !!(c && chartCache.hasValidCache(c));
  /* UI ne doit jamais afficher « Lire » si le HTML n’est pas sur le volume. */
  if (out.natalReady && !fileOk) {
    out.natalReady = false;
    if (out.natalStatus === 'ready') out.natalStatus = 'none';
    out.natalPdfUrl = null;
  } else if (out.natalReady && fileOk) {
    out.natalPdfUrl = '/natal-file?email=' + encodeURIComponent(c.email || '');
  }

  periodGen.reconcilePeriod(c, 'mois');
  periodGen.reconcilePeriod(c, 'jour');
  const moisOk = !!(c && periodGen.hasPeriodFile(c, 'mois'));
  const jourOk = !!(c && periodGen.hasPeriodFile(c, 'jour'));
  out.moisFileExists = moisOk;
  out.jourFileExists = jourOk;
  out.moisReady = !!(c && c.moisReady && moisOk);
  out.jourReady = !!(c && c.jourReady && jourOk);
  out.moisStatus = (c && c.moisStatus) || 'none';
  out.jourStatus = (c && c.jourStatus) || 'none';
  out.moisProgress = (c && c.moisProgress) || null;
  out.jourProgress = (c && c.jourProgress) || null;
  out.moisProgressPct = (c && c.moisProgressPct != null) ? c.moisProgressPct : null;
  out.jourProgressPct = (c && c.jourProgressPct != null) ? c.jourProgressPct : null;
  out.moisError = (c && c.moisError) || null;
  out.jourError = (c && c.jourError) || null;
  out.moisKey = (c && c.moisKey) || null;
  out.jourKey = (c && c.jourKey) || null;
  out.moisPdfUrl = out.moisReady ? ('/mois-file?email=' + encodeURIComponent(c.email || '')) : null;
  out.jourPdfUrl = out.jourReady ? ('/jour-file?email=' + encodeURIComponent(c.email || '')) : null;

  coupleGen.reconcileCouple(c);
  const coupleOk = !!(c && coupleGen.hasCoupleFile(c));
  out.coupleFileExists = coupleOk;
  out.coupleReady = !!(c && c.coupleReady && coupleOk);
  out.coupleStatus = (c && c.coupleStatus) || 'none';
  out.coupleProgress = (c && c.coupleProgress) || null;
  out.coupleProgressPct = (c && c.coupleProgressPct != null) ? c.coupleProgressPct : null;
  out.coupleError = (c && c.coupleError) || null;
  out.coupleKey = (c && c.coupleKey) || null;
  out.couplePdfUrl = out.coupleReady ? ('/couple-file?email=' + encodeURIComponent(c.email || '')) : null;
  out.hasPartnerChartCache = !!(c && chartCache.hasValidPartnerCache(c));

  ultimeGen.reconcileUltimeReady(c);
  const ultimeOk = !!(c && ultimeGen.hasUltimeFile(c));
  out.ultimeFileExists = ultimeOk;
  out.ultimeReady = !!(c && c.ultimeReady && ultimeOk);
  out.ultimeStatus = (c && c.ultimeStatus) || 'none';
  out.ultimeProgress = (c && c.ultimeProgress) || null;
  out.ultimeProgressPct = (c && c.ultimeProgressPct != null) ? c.ultimeProgressPct : null;
  out.ultimeError = (c && c.ultimeError) || null;
  out.ultimePdfUrl = out.ultimeReady ? ('/ultime-file?email=' + encodeURIComponent(c.email || '')) : null;
  out.ultimePagesEst = (c && c.ultimePagesEst) || null;
  return out;
}

/** Si natalReady sans fichier sur disque → flags à zéro (évite « Lire » cassé). */
function ensureNatalFileOrReset(c, store) {
  if (!c || !natalGen.reconcileNatalReady(c)) return false;
  if (store) writeStore(store);
  logLine('NATAL reconcile missing-file → reset flags ' + (c.email || ''));
  return true;
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

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return salt + ':' + hash;
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string' || stored.indexOf(':') < 0) return false;
  const i = stored.indexOf(':');
  const salt = stored.slice(0, i);
  const hash = stored.slice(i + 1);
  const test = crypto.scryptSync(String(password), salt, 64).toString('hex');
  if (hash.length !== test.length) return false;
  return safeEqual(hash, test);
}

function newSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

/** Session : Authorization Bearer, ?token= ou body.token + email. */
function requireSession(req, url, body) {
  const email = normEmail(
    (body && body.email) ||
    (url && url.searchParams && url.searchParams.get('email')) ||
    ''
  );
  const token = (
    bearerToken(req) ||
    (url && url.searchParams && url.searchParams.get('token')) ||
    (body && body.token) ||
    ''
  ).trim();
  if (!email || !token) {
    return { ok: false, code: 401, error: 'Connexion requise. Reconnecte-toi.' };
  }
  const store = readStore();
  const c = store.contacts[email];
  if (!c || !c.sessionToken || !safeEqual(String(c.sessionToken), String(token))) {
    return { ok: false, code: 401, error: 'Session expirée. Reconnecte-toi.' };
  }
  return { ok: true, store: store, c: c, email: email, token: token };
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
      const hd = require('./natal/hd').healthHint();
      return send(res, 200, {
        ok: true,
        service: 'cercle-celeste',
        ultimeMonths: ULTIME_MONTHS,
        dev: DEV,
        hasSecret: !!(SECRET && !isWeakSecret(SECRET)),
        hasClaudeKey: !!natalGen.claudeKey(),
        webhookAuth: WEBHOOK_AUTH_VERSION,
        storePath: STORE,
        storeWritable: storeWritable(),
        natalOutDir: natalGen.OUT_DIR,
        natalBuild: 'hd-default-v3',
        hasHdToken: hd.hasHdToken,
        hdAuthStyle: hd.hdAuthStyle,
        hdTokenSource: hd.hdTokenSource,
        hdApiUrl: hd.hdApiUrl
      }, req);
    }

    if (route === '/access' && req.method === 'GET') {
      const auth = requireSession(req, url, null);
      if (!auth.ok) return send(res, auth.code, { error: auth.error }, req);
      const store = auth.store;
      const c = auth.c;
      ensureNatalFileOrReset(c, store);
      return send(res, 200, publicContact(c), req);
    }

    if (route === '/login' && req.method === 'POST') {
      const body = (await readBody(req)).body;
      const email = normEmail(body.email);
      const password = String(body.password || '');
      const prenom = String(body.prenom || '').trim();
      const langCode = language.normalize(body.language || body.locale || language.DEFAULT);
      if (!email) return send(res, 400, { error: 'Email requis.' }, req);
      if (!password || password.length < 8) {
        return send(res, 400, { error: 'Mot de passe : 8 caractères minimum.' }, req);
      }
      const store = readStore();
      let c = store.contacts[email];
      let passwordCreated = false;

      if (!c && DEV) {
        c = emptyContact(email);
        c.prenom = prenom || 'Sophie';
        c.language = langCode;
        c.locale = langCode;
        c.plan = plans.demoPlanFromEmail(email);
        c.active = true;
        c.monthsPaid = c.plan === 'gratuit' ? 0 : (c.plan === 'divin' ? 1 : 2);
        c.divinMonthsPaid = c.plan === 'divin' ? 1 : 0;
        refreshUltime(c);
        c.languageLocked = profile.isComplete(c) || !plans.entitlements(c).canNatal;
        c.passwordHash = hashPassword(password);
        c.sessionToken = newSessionToken();
        passwordCreated = true;
        store.contacts[email] = c;
        writeStore(store);
        return send(res, 200, Object.assign({
          demo: true,
          passwordCreated: true,
          token: c.sessionToken
        }, publicContact(c)), req);
      }

      if (!c) {
        c = emptyContact(email);
        c.prenom = prenom;
        c.language = langCode;
        c.locale = langCode;
        c.plan = 'gratuit';
        c.active = true;
        refreshUltime(c);
        /* Gratuit: no birth onboarding — lock language from first connection. */
        c.languageLocked = true;
        c.passwordHash = hashPassword(password);
        c.sessionToken = newSessionToken();
        passwordCreated = true;
        store.contacts[email] = c;
        writeStore(store);
        return send(res, 200, Object.assign({
          created: 'gratuit',
          passwordCreated: true,
          token: c.sessionToken
        }, publicContact(c)), req);
      }

      if (!c.passwordHash) {
        /* Première connexion : l’email (souvent déjà créé par webhook) choisit son mot de passe. */
        c.passwordHash = hashPassword(password);
        passwordCreated = true;
      } else if (!verifyPassword(password, c.passwordHash)) {
        return send(res, 401, { error: 'Email ou mot de passe incorrect.' }, req);
      }

      if (prenom && !c.prenom) c.prenom = prenom;
      /* First connection only: set account language. Reconnection keeps stored language. */
      if (passwordCreated && !c.languageLocked) {
        c.language = langCode;
        c.locale = langCode;
        refreshUltime(c);
        const ent = plans.entitlements(c);
        /* Lock now unless Céleste/Divin onboarding can still confirm language. */
        if (profile.isComplete(c) || !ent.canNatal) c.languageLocked = true;
      }
      c.sessionToken = newSessionToken();
      ensureNatalFileOrReset(c, store);
      writeStore(store);
      return send(res, 200, Object.assign({
        passwordCreated: passwordCreated,
        token: c.sessionToken
      }, publicContact(c)), req);
    }

    if (route === '/admin' && req.method === 'GET') {
      if (!SECRET || url.searchParams.get('secret') !== SECRET) return send(res, 401, { error: 'secret' });
      const store = readStore();
      return send(res, 200, {
        contacts: Object.values(store.contacts).map(publicContact),
        lastWebhooks: store.lastWebhooks || [],
        storePath: STORE,
        storeWritable: storeWritable(),
        natalOutDir: natalGen.OUT_DIR
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
      const divinMonths = parseInt(body.divinMonthsPaid, 10);
      if (Number.isFinite(divinMonths) && divinMonths >= 0) {
        c.divinMonthsPaid = divinMonths;
      } else if (planId === 'divin' && (!c.divinMonthsPaid || c.divinMonthsPaid < 1)) {
        /* Premier grant Divin : au moins 1 mois compté. */
        c.divinMonthsPaid = Math.max(1, c.divinMonthsPaid || 0);
      }
      writeStore(store);
      logLine('ADMIN_GRANT ' + email + ' plan=' + c.plan + ' months=' + c.monthsPaid +
        ' divinMonths=' + (c.divinMonthsPaid || 0) + ' active=' + c.active);
      return send(res, 200, { ok: true, action: 'ADMIN_GRANT', contact: publicContact(c) }, req);
    }

    /* POST /admin/natal-reset?secret=… — efface fichier + flags natal (retest « Demander les 28 pages »). */
    if (route === '/admin/natal-reset' && req.method === 'POST') {
      if (!SECRET || url.searchParams.get('secret') !== SECRET) {
        return send(res, 401, { error: 'secret' }, req);
      }
      const body = (await readBody(req)).body;
      const email = normEmail(body.email);
      if (!email) return send(res, 400, { error: 'email requis' }, req);
      const store = readStore();
      const c = store.contacts[email];
      if (!c) return send(res, 404, { error: 'compte inconnu' }, req);
      if (natalGen.runningJobs[email]) {
        return send(res, 409, { error: 'génération en cours — réessaie dans un moment' }, req);
      }
      natalGen.clearNatal(c);
      writeStore(store);
      logLine('ADMIN_NATAL_RESET ' + email);
      return send(res, 200, {
        ok: true,
        action: 'ADMIN_NATAL_RESET',
        contact: publicContact(c)
      }, req);
    }

    /* POST /admin/couple-reset?secret=… — efface couple + quota mois (retest « Demander le manuscrit de couple »). */
    if (route === '/admin/couple-reset' && req.method === 'POST') {
      if (!SECRET || url.searchParams.get('secret') !== SECRET) {
        return send(res, 401, { error: 'secret' }, req);
      }
      const body = (await readBody(req)).body;
      const email = normEmail(body.email);
      if (!email) return send(res, 400, { error: 'email requis' }, req);
      const store = readStore();
      const c = store.contacts[email];
      if (!c) return send(res, 404, { error: 'compte inconnu' }, req);
      const coupleJobKey = 'couple:' + email;
      if (coupleGen.runningJobs[coupleJobKey]) {
        return send(res, 409, { error: 'génération en cours — réessaie dans un moment' }, req);
      }
      coupleGen.clearCouple(c);
      writeStore(store);
      logLine('ADMIN_COUPLE_RESET ' + email);
      return send(res, 200, {
        ok: true,
        action: 'ADMIN_COUPLE_RESET',
        contact: publicContact(c)
      }, req);
    }

    /* POST /admin/natal-start?secret=… — démarre génération 28 pages (owner retest). */
    if (route === '/admin/natal-start' && req.method === 'POST') {
      if (!SECRET || url.searchParams.get('secret') !== SECRET) {
        return send(res, 401, { error: 'secret' }, req);
      }
      const body = (await readBody(req)).body;
      const email = normEmail(body.email);
      if (!email) return send(res, 400, { error: 'email requis' }, req);
      const store = readStore();
      const c = store.contacts[email];
      if (!c) return send(res, 404, { error: 'compte inconnu' }, req);
      const needProf = profile.requireForGenerate(c, 'natal');
      if (!needProf.ok) {
        return send(res, 403, { error: needProf.error, needProfile: true, contact: publicContact(c) }, req);
      }
      if (natalGen.runningJobs[email]) {
        return send(res, 202, {
          ok: true,
          status: 'generating',
          message: c.natalProgress || 'déjà en cours',
          contact: publicContact(c)
        }, req);
      }
      ensureNatalFileOrReset(c, store);
      if (c.natalReady && natalGen.hasNatalFile(c) && !body.force) {
        return send(res, 200, { ok: true, already: true, contact: publicContact(c) }, req);
      }
      if (body.force) natalGen.clearNatal(c);
      c.natalStatus = 'generating';
      c.natalReady = false;
      c.natalError = null;
      c.natalProgress = 'Le ciel compose ton Manuscrit Céleste… Quelques minutes de silence.';
      c.natalProgressPct = 2;
      writeStore(store);
      try {
        natalGen.startNatalJob(email);
      } catch (err) {
        c.natalStatus = 'error';
        c.natalError = (err && err.message) || 'Démarrage impossible';
        writeStore(store);
        return send(res, 500, { error: c.natalError, contact: publicContact(c) }, req);
      }
      logLine('ADMIN_NATAL_START ' + email);
      return send(res, 202, {
        ok: true,
        action: 'ADMIN_NATAL_START',
        status: 'generating',
        contact: publicContact(c)
      }, req);
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
      const auth = requireSession(req, url, null);
      if (!auth.ok) return send(res, auth.code, { error: auth.error }, req);
      return send(res, 200, Object.assign({ ok: true }, publicContact(auth.c)), req);
    }

    if (route === '/profile' && req.method === 'POST') {
      const body = (await readBody(req)).body;
      const auth = requireSession(req, url, body);
      if (!auth.ok) return send(res, auth.code, { error: auth.error }, req);
      const store = auth.store;
      const c = auth.c;
      const wantsLang = body && (body.language != null || body.locale != null);
      const wantsVoice = body && body.ttsVoice != null;
      const hasBirthPayload = !!(
        body &&
        (body.birthDate || body.birthTime || body.birthPlace || body.gender ||
          body.birthLat != null || body.birthLon != null || body.birthTimezone)
      );
      if (wantsLang) {
        const langSaved = profile.saveLanguage(c, body);
        if (!langSaved.ok) {
          return send(res, 400, { error: langSaved.error, contact: publicContact(c) }, req);
        }
      }
      if (wantsVoice) {
        const entitlements = plans.entitlements(c);
        if (!entitlements.canOpenAiTts) {
          return send(res, 403, {
            error: 'Le choix de voix Céleste est réservé au plan Divin.',
            contact: publicContact(c)
          }, req);
        }
        const voiceSaved = profile.saveTtsVoice(c, body);
        if (!voiceSaved.ok) {
          return send(res, 400, { error: voiceSaved.error, contact: publicContact(c) }, req);
        }
      }
      if (!hasBirthPayload) {
        if (!wantsLang && !wantsVoice) {
          return send(res, 400, { error: 'Rien à enregistrer.', contact: publicContact(c) }, req);
        }
        writeStore(store);
        if (wantsVoice) logLine('TTS voice saved ' + auth.email + ' → ' + c.ttsVoice);
        if (wantsLang) logLine('LANGUAGE saved ' + auth.email + ' → ' + c.language);
        return send(res, 200, { ok: true, contact: publicContact(c) }, req);
      }
      const saved = profile.saveProfile(c, body);
      if (!saved.ok) {
        const code = saved.code === 'PROFILE_EDIT_LIMIT' ? 403 : 400;
        return send(res, code, {
          error: saved.error,
          code: saved.code || null,
          contact: publicContact(c)
        }, req);
      }
      /* Lock account language after first birth profile is complete. */
      if (profile.isComplete(c)) c.languageLocked = true;
      writeStore(store);
      logLine(
        'PROFILE saved ' + auth.email +
        (saved.isEdit ? ' (edit #' + (c.profileEditCount || 0) + ')' : ' (first)') +
        (wantsLang ? ' lang=' + c.language : '')
      );
      /* Warm HD+Astro en arrière-plan (cache pour mois/jour/IA). */
      if (profile.isComplete(c) && !chartCache.hasValidCache(c)) {
        const warmEmail = auth.email;
        setImmediate(function () {
          (async function () {
            try {
              const st = readStore();
              const cc = st.contacts[String(warmEmail || '').toLowerCase().trim()];
              if (!cc || !profile.isComplete(cc) || chartCache.hasValidCache(cc)) return;
              await chartCache.ensureChart(cc);
              writeStore(st);
              logLine('CHART cached ' + warmEmail);
            } catch (err) {
              logLine('CHART cache fail ' + warmEmail + ' ' + ((err && err.message) || err));
            }
          })();
        });
      }
      return send(res, 200, { ok: true, contact: publicContact(c) }, req);
    }

    if (route === '/profile-partner' && req.method === 'POST') {
      const body = (await readBody(req)).body;
      const auth = requireSession(req, url, body);
      if (!auth.ok) return send(res, auth.code, { error: auth.error }, req);
      const store = auth.store;
      const c = auth.c;
      const saved = profile.savePartnerProfile(c, body);
      if (!saved.ok) {
        const code = saved.code === 'PARTNER_EDIT_LIMIT' ? 403 : 400;
        return send(res, code, {
          error: saved.error,
          code: saved.code || null,
          contact: publicContact(c)
        }, req);
      }
      writeStore(store);
      logLine(
        'PARTNER saved ' + auth.email +
        (saved.isEdit ? ' (edit #' + (c.partnerEditCount || 0) + ')' : ' (first)')
      );
      if (profile.isPartnerComplete(c) && !chartCache.hasValidPartnerCache(c)) {
        const warmEmail = auth.email;
        setImmediate(function () {
          (async function () {
            try {
              const st = readStore();
              const cc = st.contacts[String(warmEmail || '').toLowerCase().trim()];
              if (!cc || !profile.isPartnerComplete(cc) || chartCache.hasValidPartnerCache(cc)) return;
              await chartCache.ensurePartnerChart(cc);
              writeStore(st);
              logLine('PARTNER CHART cached ' + warmEmail);
            } catch (err) {
              logLine('PARTNER CHART fail ' + warmEmail + ' ' + ((err && err.message) || err));
            }
          })();
        });
      }
      return send(res, 200, { ok: true, contact: publicContact(c) }, req);
    }

    if ((route === '/mois-file' || route === '/jour-file') && req.method === 'GET') {
      const auth = requireSession(req, url, null);
      if (!auth.ok) return send(res, auth.code, { error: auth.error }, req);
      const kind = route === '/jour-file' ? 'jour' : 'mois';
      const c = auth.c;
      const file = periodGen.resolvePeriodFile(c, kind);
      if (!file) {
        periodGen.reconcilePeriod(c, kind);
        writeStore(auth.store);
        return send(res, 404, { error: 'aucun fichier ' + kind }, req);
      }
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

    if (route === '/couple-file' && req.method === 'GET') {
      const auth = requireSession(req, url, null);
      if (!auth.ok) return send(res, auth.code, { error: auth.error }, req);
      const c = auth.c;
      const ent = plans.entitlements(c);
      if (!ent.canCouple && !c.coupleReady) {
        return send(res, 403, { error: 'Manuscrit de couple réservé au plan Divin.' }, req);
      }
      const file = coupleGen.resolveCoupleFile(c);
      if (!file) {
        coupleGen.reconcileCouple(c);
        writeStore(auth.store);
        return send(res, 404, { error: 'aucun fichier couple' }, req);
      }
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

    if (route === '/ultime-file' && req.method === 'GET') {
      const auth = requireSession(req, url, null);
      if (!auth.ok) return send(res, auth.code, { error: auth.error }, req);
      const c = auth.c;
      const ent = plans.entitlements(c);
      if (!ent.canUltime && !c.ultimeReady) {
        return send(res, 403, { error: 'Manuscrit Ultime réservé au Divin, ou après 6 mois Céleste.' }, req);
      }
      const file = ultimeGen.resolveUltimeFile(c, url.searchParams.get('format'));
      if (!file) {
        if (ultimeGen.reconcileUltimeReady(c)) writeStore(auth.store);
        return send(res, 404, { error: 'aucun fichier ultime' }, req);
      }
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

    if (route === '/download-all' && req.method === 'GET') {
      const auth = requireSession(req, url, null);
      if (!auth.ok) return send(res, auth.code, { error: auth.error }, req);
      const c = auth.c;
      const ent = plans.entitlements(c);
      if (!ent.showDownload) {
        return send(res, 403, { error: 'Le téléchargement des manuscrits est réservé au plan Divin.' }, req);
      }
      if (!ent.canDownloadAll) {
        const left = ent.downloadMonthsLeft || plans.DOWNLOAD_UNLOCK_MONTHS;
        return send(res, 403, {
          error: left <= 1
            ? 'Encore 1 mois en Divin pour débloquer le téléchargement.'
            : ('Encore ' + left + ' mois en Divin pour débloquer le téléchargement.'),
          contact: publicContact(c)
        }, req);
      }
      const pack = downloadBundle.buildDownloadZip(c);
      if (!pack.ok) {
        return send(res, 404, { error: pack.error || 'aucun manuscrit' }, req);
      }
      res.writeHead(200, Object.assign({
        'Content-Type': 'application/zip',
        'Content-Length': pack.buffer.length,
        'Content-Disposition': 'attachment; filename="' + pack.filename + '"'
      }, corsHeaders(req)));
      return res.end(pack.buffer);
    }

    if (route === '/natal-file' && req.method === 'GET') {
      const auth = requireSession(req, url, null);
      if (!auth.ok) return send(res, auth.code, { error: auth.error }, req);
      const store = auth.store;
      const c = auth.c;
      const ent = plans.entitlements(c);
      if (!ent.canNatal && !c.natalReady) {
        return send(res, 403, { error: 'Manuscrit natal réservé au plan Céleste / Divin.' }, req);
      }
      const file = natalGen.resolveNatalFile(c, url.searchParams.get('format'));
      if (!file) {
        if (c.natalReady || c.natalStatus === 'ready') {
          ensureNatalFileOrReset(c, store);
        }
        return send(res, 404, { error: 'aucun fichier natal' }, req);
      }
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
      const auth = requireSession(req, url, body);
      if (!auth.ok) return send(res, auth.code, { error: auth.error }, req);
      const email = auth.email;
      const kind = String(body.kind || '');
      if (['natal', 'mois', 'jour', 'ultime', 'couple'].indexOf(kind) < 0) {
        return send(res, 400, { error: 'kind requis' }, req);
      }
      const store = auth.store;
      const c = auth.c;

      /* Mois / jour déjà prêts pour la période courante → relecture sans quota. */
      if ((kind === 'mois' || kind === 'jour') && !body.regenerate) {
        periodGen.reconcilePeriod(c, kind);
        if (periodGen.hasPeriodFile(c, kind)) {
          const fileRoute = kind === 'jour' ? '/jour-file' : '/mois-file';
          return send(res, 200, {
            ok: true,
            kind: kind,
            already: true,
            pdfUrl: fileRoute + '?email=' + encodeURIComponent(email),
            contact: publicContact(c)
          }, req);
        }
      }

      /* Couple déjà prêt ce mois → relecture sans consommer le quota. */
      if (kind === 'couple' && !body.regenerate) {
        coupleGen.reconcileCouple(c);
        if (coupleGen.hasCoupleFile(c)) {
          return send(res, 200, {
            ok: true,
            kind: 'couple',
            already: true,
            pdfUrl: '/couple-file?email=' + encodeURIComponent(email),
            contact: publicContact(c)
          }, req);
        }
      }

      const check = plans.canGenerate(c, kind);
      if (!check.ok) return send(res, 403, { error: check.error, contact: publicContact(c) }, req);

      const needProf = profile.requireForGenerate(c, kind);
      if (!needProf.ok) {
        return send(res, 403, {
          error: needProf.error,
          needProfile: !!needProf.needProfile,
          needPartner: !!needProf.needPartner,
          contact: publicContact(c)
        }, req);
      }

      if (kind === 'natal') {
        ensureNatalFileOrReset(c, store);
      }

      if (kind === 'natal' && c.natalReady && natalGen.hasNatalFile(c) && !body.regenerate) {
        return send(res, 200, {
          ok: true,
          kind: kind,
          already: true,
          pdfUrl: '/natal-file?email=' + encodeURIComponent(email),
          contact: publicContact(c)
        }, req);
      }

      if (kind === 'natal') {
        if (c.natalStatus === 'generating' && natalGen.runningJobs[email]) {
          return send(res, 202, {
            ok: true,
            kind: kind,
            status: 'generating',
            message: c.natalProgress || 'Génération en cours…',
            contact: publicContact(c)
          }, req);
        }
        c.natalStatus = 'generating';
        c.natalReady = false;
        c.natalError = null;
        c.natalProgress = 'Le ciel compose ton Manuscrit Céleste… Quelques minutes de silence.';
        c.natalProgressPct = 2;
        writeStore(store);
        try {
          natalGen.startNatalJob(email);
        } catch (err) {
          c.natalStatus = 'error';
          c.natalError = (err && err.message) || 'Démarrage impossible';
          writeStore(store);
          return send(res, 500, {
            error: c.natalError,
            contact: publicContact(c)
          }, req);
        }
        logLine('NATAL job started ' + email);
        return send(res, 202, {
          ok: true,
          kind: kind,
          status: 'generating',
          async: true,
          message: c.natalProgress,
          pdfUrl: '/natal-file?email=' + encodeURIComponent(email),
          contact: publicContact(c)
        }, req);
      }

      if (kind === 'mois' || kind === 'jour') {
        periodGen.reconcilePeriod(c, kind);
        const periodReady = kind === 'jour' ? c.jourReady : c.moisReady;
        const periodStatus = kind === 'jour' ? c.jourStatus : c.moisStatus;
        const fileRoute = kind === 'jour' ? '/jour-file' : '/mois-file';
        if (periodReady && periodGen.hasPeriodFile(c, kind) && !body.regenerate) {
          return send(res, 200, {
            ok: true,
            kind: kind,
            already: true,
            pdfUrl: fileRoute + '?email=' + encodeURIComponent(email),
            contact: publicContact(c)
          }, req);
        }
        const jobKey = kind + ':' + String(email).toLowerCase().trim();
        if (periodStatus === 'generating' && periodGen.runningJobs[jobKey]) {
          return send(res, 202, {
            ok: true,
            kind: kind,
            status: 'generating',
            message: (kind === 'jour' ? c.jourProgress : c.moisProgress) || 'Génération en cours…',
            contact: publicContact(c)
          }, req);
        }
        if (kind === 'jour') {
          c.jourStatus = 'generating';
          c.jourReady = false;
          c.jourError = null;
          c.jourProgress = 'Le ciel compose ton Manuscrit du jour…';
          c.jourProgressPct = 2;
        } else {
          c.moisStatus = 'generating';
          c.moisReady = false;
          c.moisError = null;
          c.moisProgress = 'Le ciel compose ton Manuscrit du mois… Quelques minutes.';
          c.moisProgressPct = 2;
        }
        writeStore(store);
        try {
          periodGen.startPeriodJob(email, kind);
        } catch (err) {
          if (kind === 'jour') {
            c.jourStatus = 'error';
            c.jourError = (err && err.message) || 'Démarrage impossible';
          } else {
            c.moisStatus = 'error';
            c.moisError = (err && err.message) || 'Démarrage impossible';
          }
          writeStore(store);
          return send(res, 500, {
            error: (err && err.message) || 'Démarrage impossible',
            contact: publicContact(c)
          }, req);
        }
        logLine('PERIOD job started ' + kind + ' ' + email);
        return send(res, 202, {
          ok: true,
          kind: kind,
          status: 'generating',
          async: true,
          message: kind === 'jour' ? c.jourProgress : c.moisProgress,
          pdfUrl: fileRoute + '?email=' + encodeURIComponent(email),
          contact: publicContact(c)
        }, req);
      }

      if (kind === 'couple') {
        coupleGen.reconcileCouple(c);
        if (c.coupleReady && coupleGen.hasCoupleFile(c) && !body.regenerate) {
          return send(res, 200, {
            ok: true,
            kind: 'couple',
            already: true,
            pdfUrl: '/couple-file?email=' + encodeURIComponent(email),
            contact: publicContact(c)
          }, req);
        }
        const coupleJobKey = 'couple:' + String(email).toLowerCase().trim();
        if (c.coupleStatus === 'generating' && coupleGen.runningJobs[coupleJobKey]) {
          return send(res, 202, {
            ok: true,
            kind: 'couple',
            status: 'generating',
            message: c.coupleProgress || 'Génération en cours…',
            contact: publicContact(c)
          }, req);
        }
        c.coupleStatus = 'generating';
        c.coupleReady = false;
        c.coupleError = null;
        c.coupleProgress = 'Le ciel compose votre Manuscrit Céleste Couple… Quelques minutes.';
        c.coupleProgressPct = 2;
        writeStore(store);
        try {
          coupleGen.startCoupleJob(email);
        } catch (err) {
          c.coupleStatus = 'error';
          c.coupleError = (err && err.message) || 'Démarrage impossible';
          writeStore(store);
          return send(res, 500, {
            error: c.coupleError,
            contact: publicContact(c)
          }, req);
        }
        logLine('COUPLE job started ' + email);
        return send(res, 202, {
          ok: true,
          kind: 'couple',
          status: 'generating',
          async: true,
          message: c.coupleProgress,
          pdfUrl: '/couple-file?email=' + encodeURIComponent(email),
          contact: publicContact(c)
        }, req);
      }

      if (kind === 'ultime') {
        ultimeGen.reconcileUltimeReady(c);
        if (c.ultimeReady && ultimeGen.hasUltimeFile(c) && !body.regenerate) {
          return send(res, 200, {
            ok: true,
            kind: 'ultime',
            already: true,
            pdfUrl: '/ultime-file?email=' + encodeURIComponent(email),
            contact: publicContact(c)
          }, req);
        }
        if (c.ultimeStatus === 'generating' && ultimeGen.runningJobs[email]) {
          return send(res, 202, {
            ok: true,
            kind: 'ultime',
            status: 'generating',
            message: c.ultimeProgress || 'Génération en cours…',
            contact: publicContact(c)
          }, req);
        }
        c.ultimeStatus = 'generating';
        c.ultimeReady = false;
        c.ultimeError = null;
        c.ultimeProgress = 'Le ciel compose ton Manuscrit Ultime… Plusieurs minutes de silence.';
        c.ultimeProgressPct = 2;
        writeStore(store);
        try {
          ultimeGen.startUltimeJob(email);
        } catch (err) {
          c.ultimeStatus = 'error';
          c.ultimeError = (err && err.message) || 'Démarrage impossible';
          writeStore(store);
          return send(res, 500, {
            error: c.ultimeError,
            contact: publicContact(c)
          }, req);
        }
        logLine('ULTIME job started ' + email);
        return send(res, 202, {
          ok: true,
          kind: 'ultime',
          status: 'generating',
          async: true,
          message: c.ultimeProgress,
          pdfUrl: '/ultime-file?email=' + encodeURIComponent(email),
          contact: publicContact(c)
        }, req);
      }

      return send(res, 400, { error: 'kind non géré', contact: publicContact(c) }, req);
    }

    if (route === '/ia' && req.method === 'GET') {
      const auth = requireSession(req, url, null);
      if (!auth.ok) return send(res, auth.code, { error: auth.error }, req);
      const c = auth.c;
      const e = plans.entitlements(c);
      const ctx = normalizeIaContext(url.searchParams.get('context'));
      if (!e.canIa) {
        return send(res, 403, {
          error: 'L’IA Céleste n’est pas disponible sur ce compte pour le moment.',
          code: 'IA_LOCKED',
          context: ctx,
          messages: [],
          contact: publicContact(c)
        }, req);
      }
      const chats = ensureIaChats(c);
      chats[ctx] = normalizeIaMessages(chats[ctx]);
      writeStore(auth.store);
      return send(res, 200, {
        ok: true,
        context: ctx,
        messages: chats[ctx],
        contact: publicContact(c)
      }, req);
    }

    if (route === '/ia' && req.method === 'POST') {
      const body = (await readBody(req)).body;
      const auth = requireSession(req, url, body);
      if (!auth.ok) return send(res, auth.code, { error: auth.error }, req);
      const question = String(body.question || '').trim();
      const ctx = normalizeIaContext(body.context);
      const selectedPassage = String(body.selectedPassage || body.developPassage || '').trim().slice(0, 4000);
      if (!question) return send(res, 400, { error: 'question requise' }, req);
      if (question.length > 2000) return send(res, 400, { error: 'Question trop longue.' }, req);
      const store = auth.store;
      const c = auth.c;
      const chatsPre = ensureIaChats(c);
      const history = normalizeIaMessages(chatsPre[ctx]);
      const entitlements = plans.entitlements(c);
      if (!entitlements.canIa) {
        return send(res, 403, {
          error: 'L’IA Céleste n’est pas disponible sur ce compte pour le moment.',
          code: 'IA_LOCKED',
          context: ctx,
          messages: history,
          contact: publicContact(c)
        }, req);
      }
      if (entitlements.iaLeft <= 0) {
        const exceeded = plans.iaQuotaExceededError(entitlements);
        return send(res, 403, {
          error: exceeded.error,
          code: exceeded.code,
          upgrade: exceeded.upgrade || null,
          context: ctx,
          messages: history,
          contact: publicContact(c)
        }, req);
      }
      let answer;
      try {
        const iaReply = require('./natal/ia-reply');
        answer = await iaReply.answerFromManuscript(c, question, ctx, {
          history: history,
          selectedPassage: selectedPassage
        });
      } catch (e) {
        const soft = (e && e.friendly) || 'Le ciel ne répond pas pour le moment. Réessaie dans un instant.';
        return send(res, 503, {
          error: soft,
          context: ctx,
          messages: history,
          contact: publicContact(c)
        }, req);
      }
      const check = plans.consumeIa(c);
      if (!check.ok) {
        return send(res, 403, {
          error: check.error,
          code: check.code || null,
          upgrade: check.upgrade || null,
          context: ctx,
          messages: history,
          contact: publicContact(c)
        }, req);
      }
      const messages = appendIaExchange(c, question, answer, ctx);
      writeStore(store);
      return send(res, 200, {
        ok: true,
        context: ctx,
        answer: answer,
        messages: messages,
        contact: publicContact(c)
      }, req);
    }

    if (route === '/tts' && req.method === 'POST') {
      const body = (await readBody(req)).body;
      const auth = requireSession(req, url, body);
      if (!auth.ok) return send(res, auth.code, { error: auth.error }, req);
      const text = String(body.text || '').trim();
      if (!text) return send(res, 400, { error: 'Texte requis.' }, req);
      if (text.length > plans.TTS_MAX_CHARS) {
        return send(res, 400, {
          error: 'Texte trop long pour la voix (max ' + plans.TTS_MAX_CHARS + ' caractères).'
        }, req);
      }
      const store = auth.store;
      const c = auth.c;
      const entitlements = plans.entitlements(c);
      if (!entitlements.canOpenAiTts) {
        return send(res, 403, {
          error: 'La voix Céleste (OpenAI) est réservée au plan Divin.',
          contact: publicContact(c)
        }, req);
      }
      if (entitlements.ttsCharsLeft < text.length) {
        return send(res, 403, {
          error: 'Quota voix du mois atteint. Reviens le 1er, ou écoute avec la voix du navigateur.',
          ttsCharsLeft: entitlements.ttsCharsLeft,
          contact: publicContact(c)
        }, req);
      }
      const openaiKey = String(
        process.env.OPENAI_API_KEY ||
        process.env.OPENAI_KEY ||
        process.env.OPEN_AI_API_KEY ||
        ''
      ).trim();
      if (!openaiKey) {
        return send(res, 503, {
          error: 'Voix Céleste indisponible (clé OpenAI manquante côté serveur).',
          contact: publicContact(c)
        }, req);
      }
      let audioBuf;
      try {
        const httpNatal = require('./natal/http');
        const resp = await httpNatal.fetchWithTimeout(
          'https://api.openai.com/v1/audio/speech',
          {
            method: 'POST',
            headers: {
              Authorization: 'Bearer ' + openaiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'tts-1',
              voice: profile.ttsVoiceOf(c),
              input: text,
              response_format: 'mp3'
            })
          },
          60000
        );
        if (!resp.ok) {
          let errTxt = '';
          try { errTxt = await resp.text(); } catch (_) {}
          logLine('TTS OpenAI HTTP ' + resp.status + (errTxt ? (' ' + errTxt.slice(0, 200)) : ''));
          return send(res, 503, {
            error: 'La voix Céleste ne répond pas pour le moment. Réessaie dans un instant.',
            contact: publicContact(c)
          }, req);
        }
        audioBuf = Buffer.from(await resp.arrayBuffer());
      } catch (e) {
        logLine('TTS fail ' + ((e && e.message) || e));
        return send(res, 503, {
          error: 'La voix Céleste ne répond pas pour le moment. Réessaie dans un instant.',
          contact: publicContact(c)
        }, req);
      }
      const consumed = plans.consumeTts(c, text.length);
      if (!consumed.ok) {
        return send(res, 403, {
          error: consumed.error,
          contact: publicContact(c)
        }, req);
      }
      writeStore(store);
      res.writeHead(200, Object.assign({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuf.length,
        'Cache-Control': 'no-store'
      }, corsHeaders(req)));
      return res.end(audioBuf);
    }

    /**
     * Full-manuscript TTS (Divin only). Cache-first on durable volume.
     * Does NOT consume TTS_CHARS_MONTH (short IA bubble quota).
     * POST { kind } → { ready, cached, progress, audioUrl } ; poll until ready.
     */
    if (route === '/manuscript-tts' && req.method === 'POST') {
      const body = (await readBody(req)).body;
      const auth = requireSession(req, url, body);
      if (!auth.ok) return send(res, auth.code, { error: auth.error }, req);
      const c = auth.c;
      const entitlements = plans.entitlements(c);
      if (!entitlements.canOpenAiTts) {
        return send(res, 403, {
          error: 'L’écoute du manuscrit est réservée au plan Divin.',
          contact: publicContact(c)
        }, req);
      }
      const kind = String(body.kind || '').toLowerCase().trim();
      if (manuscriptTts.KINDS.indexOf(kind) < 0) {
        return send(res, 400, { error: 'kind requis (natal, mois, jour, couple, ultime).' }, req);
      }
      const result = manuscriptTts.ensureManuscriptTts(c, kind, {
        log: logLine,
        retry: !!body.retry
      });
      if (!result.ok) {
        return send(res, 404, { error: result.error || 'Manuscrit introuvable.' }, req);
      }
      const emailQ = encodeURIComponent(auth.email);
      return send(res, 200, {
        ok: true,
        kind: kind,
        cached: !!result.cached,
        ready: !!result.ready,
        status: result.status,
        progress: result.progress || { done: 0, total: 0 },
        hash: result.hash || null,
        chars: result.chars || 0,
        periodKey: result.periodKey || null,
        audioUrl: result.ready
          ? ('/manuscript-tts-audio?kind=' + encodeURIComponent(kind) + '&email=' + emailQ)
          : null,
        note: result.note || manuscriptTts.NOTE,
        contact: publicContact(c)
      }, req);
    }

    if (route === '/manuscript-tts-audio' && req.method === 'GET') {
      const auth = requireSession(req, url, null);
      if (!auth.ok) return send(res, auth.code, { error: auth.error }, req);
      const c = auth.c;
      const entitlements = plans.entitlements(c);
      if (!entitlements.canOpenAiTts) {
        return send(res, 403, { error: 'L’écoute du manuscrit est réservée au plan Divin.' }, req);
      }
      const kind = String(url.searchParams.get('kind') || '').toLowerCase().trim();
      if (manuscriptTts.KINDS.indexOf(kind) < 0) {
        return send(res, 400, { error: 'kind requis.' }, req);
      }
      const file = manuscriptTts.getCachedAudio(c, kind);
      if (!file) {
        return send(res, 404, { error: 'Audio pas encore prêt. Relance Écouter.' }, req);
      }
      try {
        const buf = fs.readFileSync(file.path);
        res.writeHead(200, Object.assign({
          'Content-Type': 'audio/mpeg',
          'Content-Length': buf.length,
          'Cache-Control': 'private, max-age=86400',
          'Content-Disposition': 'inline; filename="' + kind + '-voix.mp3"'
        }, corsHeaders(req)));
        return res.end(buf);
      } catch (e) {
        return send(res, 500, { error: 'lecture audio' }, req);
      }
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
