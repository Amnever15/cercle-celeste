const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const PORT = 8788;
const API_PORT = 8789;
const API_ROUTES = ['/health', '/access', '/login', '/admin', '/admin/grant', '/admin/natal-reset', '/systeme-webhook', '/webhook-debug', '/generate', '/ia', '/profile', '/profile-partner', '/natal-file', '/mois-file', '/jour-file', '/couple-file', '/ultime-file', '/download-all'];
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json'
};

function proxyApi(req, res) {
  const headers = Object.assign({}, req.headers);
  headers.host = '127.0.0.1:' + API_PORT;
  const p = http.request({
    hostname: '127.0.0.1',
    port: API_PORT,
    path: req.url,
    method: req.method,
    headers: headers
  }, (up) => {
    res.writeHead(up.statusCode, up.headers);
    up.pipe(res);
  });
  p.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'API hors ligne (démarre APP/api/server.js)' }));
  });
  req.pipe(p);
}

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (API_ROUTES.indexOf(rel) >= 0) {
    proxyApi(req, res);
    return;
  }
  if (rel === '/') rel = '/index.html';
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }).end(buf);
  });
}).listen(PORT, () => console.log('Cercle Céleste → http://localhost:' + PORT));
