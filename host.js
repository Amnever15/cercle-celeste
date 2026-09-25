/**
 * Un seul process : PWA (fichiers statiques) + API Systeme.io.
 * En production (Railway / Render) : écoute process.env.PORT.
 *
 * L’API vit dans api/server.js (export handle). Si le dossier api/
 * n’est pas sur GitHub, on affiche une erreur claire au boot.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = parseInt(process.env.PORT || '8788', 10);
const DEFAULT_API_ROUTES = ['/health', '/access', '/login', '/admin', '/admin/grant', '/admin/natal-reset', '/admin/couple-reset', '/admin/natal-start', '/systeme-webhook', '/webhook-debug', '/generate', '/ia', '/tts', '/manuscript-tts', '/manuscript-tts-audio', '/profile', '/profile-partner', '/natal-file', '/mois-file', '/jour-file', '/couple-file', '/ultime-file', '/download-all'];
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function listDir(dir) {
  try {
    return fs.readdirSync(dir).join(', ');
  } catch (e) {
    return '(absent ou illisible : ' + (e && e.code ? e.code : e) + ')';
  }
}

function existsFile(file) {
  try {
    return fs.existsSync(file) && fs.statSync(file).isFile();
  } catch (e) {
    return false;
  }
}

function logBootLayout() {
  const apiDir = path.join(ROOT, 'api');
  console.log('Boot Cercle Céleste');
  console.log('Dossier app : ' + ROOT);
  console.log('Contenu de ' + ROOT + ' : ' + listDir(ROOT));
  console.log('Contenu de ' + apiDir + ' : ' + listDir(apiDir));
  console.log('api/server.js : ' + (existsFile(path.join(apiDir, 'server.js')) ? 'OK' : 'MANQUANT'));
  console.log('api/plans.js  : ' + (existsFile(path.join(apiDir, 'plans.js')) ? 'OK' : 'MANQUANT'));
  console.log('api/profile.js: ' + (existsFile(path.join(apiDir, 'profile.js')) ? 'OK' : 'MANQUANT'));
  console.log('api/natal-generate.js : ' + (existsFile(path.join(apiDir, 'natal-generate.js')) ? 'OK' : 'MANQUANT'));
  console.log('api/natal/ : ' + (existsFile(path.join(apiDir, 'natal', 'claude-natal.js')) ? 'OK' : 'MANQUANT'));
}

function printMissingApi() {
  console.error('');
  console.error('════════════════════════════════════════════════════════');
  console.error('ERREUR : module API introuvable (require ./api/server).');
  console.error('Railway a lancé host.js, mais le dossier api/ n’est pas');
  console.error('dans le dépôt GitHub (upload incomplet).');
  console.error('');
  console.error('Fichiers OBLIGATOIRES, au même niveau que host.js :');
  console.error('  api/server.js');
  console.error('  api/plans.js');
  console.error('  api/profile.js');
  console.error('  api/natal-generate.js');
  console.error('  api/natal/ (http.js, hd.js, astro.js, claude-natal.js, html-doc.js, json-fix.js)');
  console.error('');
  console.error('Sur ton PC, ouvre ce dossier puis envoie CES fichiers');
  console.error('dans un dossier api/ du dépôt GitHub :');
  console.error('  C:\\Users\\s-386\\Desktop\\CURSOR\\MANUSCRIT\\APP\\api\\server.js');
  console.error('  C:\\Users\\s-386\\Desktop\\CURSOR\\MANUSCRIT\\APP\\api\\plans.js');
  console.error('  C:\\Users\\s-386\\Desktop\\CURSOR\\MANUSCRIT\\APP\\api\\profile.js');
  console.error('  C:\\Users\\s-386\\Desktop\\CURSOR\\MANUSCRIT\\APP\\api\\natal-generate.js');
  console.error('  C:\\Users\\s-386\\Desktop\\CURSOR\\MANUSCRIT\\APP\\api\\natal\\');
  console.error('');
  console.error('Variables Railway : CLAUDE_KEY ; optionnel HD_API_URL, ASTRO_API_URL, HD_API_TOKEN');
  console.error('Ne pas envoyer : .env, store.json, webhook.log, api/generated/');
  console.error('════════════════════════════════════════════════════════');
}

function tryLoad(rel) {
  try {
    const mod = require(rel);
    if (!mod || typeof mod.handle !== 'function') {
      console.error('ERREUR : ' + rel + ' n’exporte pas handle().');
      return null;
    }
    return mod;
  } catch (e) {
    console.error('require(' + rel + ') a échoué : ' + (e && e.message));
    return null;
  }
}

function loadApi() {
  logBootLayout();

  const nestedServer = path.join(ROOT, 'api', 'server.js');
  const nestedPlans = path.join(ROOT, 'api', 'plans.js');
  const rootServer = path.join(ROOT, 'server.js');
  const rootPlans = path.join(ROOT, 'plans.js');

  if (existsFile(nestedServer) && existsFile(nestedPlans)) {
    if (!existsFile(path.join(ROOT, 'api', 'profile.js'))) {
      console.warn('api/profile.js manquant — profil natal indisponible jusqu’à upload.');
    }
    if (!existsFile(path.join(ROOT, 'api', 'natal-generate.js'))) {
      console.warn('api/natal-generate.js manquant — génération natal indisponible jusqu’à upload.');
    }
    const nested = tryLoad('./api/server');
    if (nested) return nested;
  }

  if (existsFile(rootServer) && existsFile(rootPlans)) {
    console.warn('Dossier api/ incomplet : utilisation de server.js + plans.js à la racine.');
    const root = tryLoad('./server');
    if (root) return root;
  }

  printMissingApi();
  process.exit(1);
}

const api = loadApi();
const API_ROUTES = (api.API_ROUTES && api.API_ROUTES.length) ? api.API_ROUTES : DEFAULT_API_ROUTES;

function isApi(pathname) {
  const route = pathname.replace(/\/+$/, '') || '/';
  return API_ROUTES.indexOf(route) >= 0;
}

function blockedRel(rel) {
  const n = rel.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!n || n.split('/').indexOf('..') >= 0) return true;
  if (n.charAt(0) === '.') return true;
  if (/^(api|host\.js|serve\.js|server\.js|plans\.js|package\.json|package-lock\.json)(\/|$)/i.test(n)) return true;
  if (path.basename(n).charAt(0) === '.') return true;
  return false;
}

function safeFile(rel) {
  const n = rel.replace(/\\/g, '/').replace(/^\/+/, '');
  const file = path.resolve(ROOT, n);
  const root = path.resolve(ROOT);
  if (file !== root && file.indexOf(root + path.sep) !== 0) return null;
  return file;
}

http.createServer((req, res) => {
  let pathname = '/';
  try {
    pathname = new URL(req.url, 'http://' + (req.headers.host || 'localhost')).pathname;
  } catch (e) {
    res.writeHead(400).end('bad url');
    return;
  }

  if (isApi(pathname)) {
    api.handle(req, res);
    return;
  }

  let rel = decodeURIComponent(pathname);
  if (rel === '/') rel = '/index.html';
  if (blockedRel(rel)) {
    res.writeHead(404).end('not found');
    return;
  }
  const file = safeFile(rel);
  if (!file) {
    res.writeHead(403).end();
    return;
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404).end('not found');
      return;
    }
    fs.readFile(file, (err2, buf) => {
      if (err2) {
        res.writeHead(404).end('not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }).end(buf);
    });
  });
}).listen(PORT, '0.0.0.0', () => {
  if (typeof api.warnProduction === 'function') api.warnProduction();
  console.log('Cercle Céleste (app + API) → port ' + PORT);
  console.log('Santé  → GET /health');
  console.log('Webhook → POST /systeme-webhook?secret=…');
  console.log('Debug   → GET  /webhook-debug?secret=…');
});
