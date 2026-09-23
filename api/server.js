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

const ROOT = __dirname;
const STORE = path.join(ROOT, 'store.json');
const LOG = path.join(ROOT, 'webhook.log');
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

const PORT = parseInt(process.env.PORT || '8789', 10);
const SECRET = process.env.WEBHOOK_SECRET || '';
const DEV = String(process.env.DEV_MODE || 'false') === 'true';
const API_ROUTES = ['/health', '/access', '/login', '/admin', '/systeme-webhook', '/generate', '/ia'];

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
}

function readStore() {
  try { return JSON.parse(fs.readFileSync(STORE, 'utf8')); }
  catch (e) { return { contacts: {} }; }
}
function writeStore(data) {
  fs.writeFileSync(STORE, JSON.stringify(data, null, 2));
}
function logLine(msg) {
  const line = new Date().toISOString() + ' ' + msg + '\n';
  fs.appendFileSync(LOG, line);
  console.log(msg);
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
    dailyUsed: 0,
    monthlyUsed: 0,
    iaUsed: 0,
    usageMonth: '',
    usageYear: 0
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
  if (planId === 'divin' || planId === 'celeste') c.plan = planId;
  else if (!c.plan || c.plan === 'gratuit') c.plan = 'celeste';
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
  c.active = false;
  c.canceledAt = new Date().toISOString();
  refreshUltime(c);
}

function pick(obj, paths) {
  for (var i = 0; i < paths.length; i++) {
    var parts = paths[i].split('.');
    var v = obj;
    for (var j = 0; j < parts.length && v != null; j++) v = v[parts[j]];
    if (v != null && v !== '') return v;
  }
  return '';
}

function parseEvent(req, body) {
  var header = (req.headers['x-webhook-event'] || req.headers['x-systeme-event'] || '').toUpperCase();
  var named = String(pick(body, ['event', 'type', 'name', 'trigger']) || header || '').toUpperCase();
  if (/SALE_NEW|NEW_SALE|NOUVELLE VENTE|SUBSCRIPTION_STARTED|PAYMENT_SUCCEEDED|SALE\s*NEW/.test(named)) return 'SALE_NEW';
  if (/SALE_CANCELED|SALE_CANCELLED|CANCELED|CANCELLED|REFUND|REVOK|UNPAID|FAILED|PAYMENT_FAILED|ECHEC/.test(named)) return 'REVOKE';
  if (/SALE_NEW/.test(header)) return 'SALE_NEW';
  if (/SALE_CANCELED/.test(header)) return 'REVOKE';
  // Workflow Systeme.io "nouvelle vente" sans nom clair : présence d'un order / pricePlan
  if (body.order || body.pricePlan || body.sale) return 'SALE_NEW';
  return named || 'UNKNOWN';
}

function extract(body) {
  return {
    email: normEmail(pick(body, [
      'email', 'contact.email', 'contact.fields.email', 'customer.email',
      'data.email', 'payload.email', 'contactEmail'
    ])),
    prenom: String(pick(body, [
      'first_name', 'firstName', 'prenom', 'contact.first_name',
      'contact.fields.first_name', 'contact.firstname'
    ]) || ''),
    nom: String(pick(body, [
      'surname', 'lastName', 'nom', 'contact.surname', 'contact.fields.surname'
    ]) || ''),
    saleId: String(pick(body, [
      'id', 'saleId', 'order.id', 'orderItem.id', 'uuid', 'transactionId'
    ]) || ''),
    plan: plans.detectPlan(body)
  };
}

function publicContact(c) {
  return plans.entitlements(c);
}

function corsHeaders(req) {
  const origin = req.headers.origin;
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Secret, X-Webhook-Event',
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

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); }
      catch (e) {
        const params = new URLSearchParams(raw);
        const o = {};
        params.forEach((v, k) => { o[k] = v; });
        resolve(Object.keys(o).length ? o : { raw: raw });
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

function checkSecret(req, query, body) {
  const got = req.headers['x-webhook-secret']
    || req.headers['x-webhook-signature']
    || queryVal(query, 'secret')
    || body.secret
    || '';
  if (!SECRET) return false;
  return safeEqual(got, SECRET);
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
        hasSecret: !!(SECRET && !isWeakSecret(SECRET))
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
      const body = await readBody(req);
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
      return send(res, 200, { contacts: Object.values(store.contacts).map(publicContact) });
    }

    if (route === '/systeme-webhook' && req.method === 'POST') {
      const body = await readBody(req);
      if (!checkSecret(req, url.searchParams, body)) {
        logLine('WEBHOOK refusé : secret invalide');
        return send(res, 401, { error: 'secret invalide' });
      }
      logLine('WEBHOOK ' + JSON.stringify(body).slice(0, 2000));
      const event = parseEvent(req, body);
      const info = extract(body);
      if (!info.email) {
        logLine('WEBHOOK sans email, event=' + event);
        return send(res, 200, { ok: false, reason: 'no-email', event: event });
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
        action = 'IGNORED_' + event;
      }
      writeStore(store);
      logLine(action + ' ' + info.email + ' months=' + c.monthsPaid + ' active=' + c.active);
      return send(res, 200, { ok: true, action: action, contact: publicContact(c) });
    }

    if (route === '/generate' && req.method === 'POST') {
      const body = await readBody(req);
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
      plans.consumeGenerate(c, kind);
      writeStore(store);
      return send(res, 200, { ok: true, kind: kind, contact: publicContact(c) });
    }

    if (route === '/ia' && req.method === 'POST') {
      const body = await readBody(req);
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

function listen(port) {
  const p = port == null ? PORT : port;
  const server = http.createServer((req, res) => { handle(req, res); });
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

module.exports = { handle, listen, API_ROUTES, warnProduction };
