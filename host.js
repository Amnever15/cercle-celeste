/**
 * Un seul process : PWA (fichiers statiques) + API Systeme.io.
 * En production (Railway / Render) : écoute process.env.PORT.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const api = require('./api/server');

const ROOT = __dirname;
const PORT = parseInt(process.env.PORT || '8788', 10);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json'
};

function isApi(pathname) {
  const route = pathname.replace(/\/+$/, '') || '/';
  return api.API_ROUTES.indexOf(route) >= 0;
}

function blockedRel(rel) {
  const n = rel.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!n || n.split('/').indexOf('..') >= 0) return true;
  if (n.charAt(0) === '.') return true;
  if (/^(api|host\.js|serve\.js|package\.json|package-lock\.json)(\/|$)/i.test(n)) return true;
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
  api.warnProduction();
  console.log('Cercle Céleste (app + API) → port ' + PORT);
  console.log('Santé  → GET /health');
  console.log('Webhook → POST /systeme-webhook?secret=…');
});
