/**
 * Génération natal — phase 1 (stub serveur).
 *
 * Le vrai Manuscrit Céleste 28 pages vit dans
 * GENERATIONS/manuscrit-celeste-generation.html (~280 Ko, canvas + jsPDF + HD + astro).
 * Port complet = chantier dédié. Ici : appel Claude côté serveur uniquement
 * (CLAUDE_KEY jamais exposée au client) + fichier texte/PDF minimal sauvegardé.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const profile = require('./profile');

const OUT_DIR = path.join(__dirname, 'generated');

function claudeKey() {
  return String(process.env.CLAUDE_KEY || process.env.ANTHROPIC_API_KEY || '').trim();
}

function ensureOutDir() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
}

function safeEmailFile(email) {
  return String(email || 'anon').toLowerCase().replace(/[^a-z0-9._-]+/g, '_').slice(0, 80);
}

function outPaths(email) {
  const base = 'natal-' + safeEmailFile(email);
  return {
    txt: path.join(OUT_DIR, base + '.txt'),
    pdf: path.join(OUT_DIR, base + '.pdf')
  };
}

function httpPostJson(hostname, urlPath, headers, bodyObj) {
  const body = JSON.stringify(bodyObj);
  return new Promise(function (resolve, reject) {
    const req = https.request({
      hostname: hostname,
      path: urlPath,
      method: 'POST',
      headers: Object.assign({
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }, headers)
    }, function (res) {
      const chunks = [];
      res.on('data', function (c) { chunks.push(c); });
      res.on('end', function () {
        const raw = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try { json = JSON.parse(raw); } catch (e) { json = null; }
        resolve({ status: res.statusCode || 0, raw: raw, json: json });
      });
    });
    req.on('error', reject);
    req.setTimeout(90000, function () {
      req.destroy(new Error('timeout Claude'));
    });
    req.write(body);
    req.end();
  });
}

async function callClaudeOpening(contact) {
  const key = claudeKey();
  if (!key) return { ok: false, reason: 'no-key', text: '' };

  const prenom = contact.prenom || 'toi';
  const tone = profile.toneLabel(contact.gender);
  const prompt =
    'Tu es l’auteur du Manuscrit Céleste. Rédige une OUVERTURE (phase 1 stub, pas les 28 pages) ' +
    'pour ' + prenom + '.\n' +
    'Naissance : ' + contact.birthDate + ' à ' + contact.birthTime + ' — ' + contact.birthPlace + '.\n' +
    'Genre / accords : ' + tone + '.\n' +
    'Contraintes : français, tutoiement, 5 à 8 paragraphes poétiques et concrets, ' +
    'évoque le lieu et la date, annonce que le livre natal complet (28 pages) suivra. ' +
    'Pas de markdown, pas de titre technique, texte seul.';

  try {
    const res = await httpPostJson('api.anthropic.com', '/v1/messages', {
      'x-api-key': key,
      'anthropic-version': '2023-06-01'
    }, {
      model: 'claude-sonnet-4-6',
      max_tokens: 1800,
      messages: [{ role: 'user', content: prompt }]
    });

    if (res.status < 200 || res.status >= 300) {
      return {
        ok: false,
        reason: 'claude-http-' + res.status,
        text: '',
        detail: (res.json && res.json.error && res.json.error.message) || res.raw.slice(0, 200)
      };
    }
    const blocks = (res.json && res.json.content) || [];
    let text = '';
    for (var i = 0; i < blocks.length; i++) {
      if (blocks[i] && blocks[i].type === 'text' && blocks[i].text) text += blocks[i].text;
    }
    text = String(text || '').trim();
    if (!text) return { ok: false, reason: 'empty', text: '' };
    return { ok: true, reason: 'claude', text: text };
  } catch (e) {
    return { ok: false, reason: 'network', text: '', detail: String(e && e.message || e) };
  }
}

function localPlaceholder(contact) {
  const prenom = contact.prenom || 'toi';
  const g = profile.normalizeGender(contact.gender);
  const nee = g === 'femme' ? 'née' : (g === 'homme' ? 'né' : 'venu(e) au monde');
  return [
    'Manuscrit Céleste — ouverture (phase 1)',
    '',
    prenom + ',',
    '',
    'Tu es ' + nee + ' le ' + contact.birthDate + ' à ' + contact.birthTime + ', à ' + contact.birthPlace + '.',
    '',
    'Ce texte est une première pierre posée côté serveur : le ciel de ta naissance est enregistré. ' +
    'Les 28 pages complètes (Human Design, thème astral, maisons, aspects, rituels) seront portées depuis ' +
    'le moteur manuscrit-celeste-generation — sans jamais exposer la clé Claude sur ton téléphone.',
    '',
    'Pour l’instant, ton profil est sauvegardé pour toujours sous cet email. ' +
    'Quand tu redemanderas le natal, jour ou mois, ces données seront réutilisées.',
    '',
    '(Placeholder local : CLAUDE_KEY absente ou appel Claude indisponible.)'
  ].join('\n');
}

/** Minimal PDF 1 page (Helvetica) — ASCII only for content stream safety. */
function buildMinimalPdf(title, bodyText) {
  function pdfEscape(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }
  const lines = String(bodyText || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(function (l) {
      return l.replace(/[^\x20-\x7E]/g, function (ch) {
        /* Keep French accents as '?' in this minimal PDF; full UTF-8 PDF = later port. */
        if (/[àâä]/.test(ch)) return 'a';
        if (/[éèêë]/.test(ch)) return 'e';
        if (/[îï]/.test(ch)) return 'i';
        if (/[ôö]/.test(ch)) return 'o';
        if (/[ùûü]/.test(ch)) return 'u';
        if (ch === 'ç') return 'c';
        if (ch === 'œ') return 'oe';
        if (ch === 'Æ' || ch === 'æ') return 'ae';
        if (ch === '—') return '-';
        if (ch === '’' || ch === '‘') return "'";
        if (ch === '«' || ch === '»') return '"';
        return '?';
      });
    });

  const contentLines = ['BT', '/F1 11 Tf', '50 760 Td', '14 TL'];
  contentLines.push('(' + pdfEscape(String(title || 'Manuscrit Celeste').slice(0, 80)) + ') Tj');
  contentLines.push('T*');
  contentLines.push('T*');
  var max = Math.min(lines.length, 48);
  for (var i = 0; i < max; i++) {
    var line = lines[i].slice(0, 90);
    contentLines.push('(' + pdfEscape(line || ' ') + ') Tj');
    contentLines.push('T*');
  }
  contentLines.push('ET');
  const stream = contentLines.join('\n');

  const objs = [];
  objs.push('1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n');
  objs.push('2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n');
  objs.push(
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ' +
    '/Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n'
  );
  objs.push('4 0 obj<< /Length ' + Buffer.byteLength(stream) + ' >>stream\n' + stream + '\nendstream\nendobj\n');
  objs.push('5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n');

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (var o = 0; o < objs.length; o++) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += objs[o];
  }
  const xref = Buffer.byteLength(pdf);
  pdf += 'xref\n0 ' + (objs.length + 1) + '\n';
  pdf += '0000000000 65535 f \n';
  for (var x = 1; x < offsets.length; x++) {
    pdf += String(offsets[x]).padStart(10, '0') + ' 00000 n \n';
  }
  pdf += 'trailer<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\n';
  pdf += 'startxref\n' + xref + '\n%%EOF\n';
  return Buffer.from(pdf, 'utf8');
}

/**
 * Génère (ou régénère) le natal stub pour un contact.
 * Met à jour natalReady / natalPdfPath / natalGeneratedAt / natalStatus.
 */
async function generateNatal(contact) {
  ensureOutDir();
  const paths = outPaths(contact.email);
  contact.natalStatus = 'generating';
  contact.natalReady = false;

  const claude = await callClaudeOpening(contact);
  const text = claude.ok ? claude.text : localPlaceholder(contact);
  const source = claude.ok ? 'claude' : ('stub:' + (claude.reason || 'local'));

  const header =
    '=== Manuscrit Céleste — ouverture (phase 1) ===\n' +
    'Prénom : ' + (contact.prenom || '') + '\n' +
    'Email : ' + (contact.email || '') + '\n' +
    'Naissance : ' + contact.birthDate + ' ' + contact.birthTime + ' — ' + contact.birthPlace + '\n' +
    'Genre : ' + contact.gender + '\n' +
    'Source : ' + source + '\n' +
    'Généré : ' + new Date().toISOString() + '\n' +
    '==============================================\n\n';

  const full = header + text + '\n';
  fs.writeFileSync(paths.txt, full, 'utf8');
  fs.writeFileSync(paths.pdf, buildMinimalPdf('Manuscrit Celeste — ' + (contact.prenom || ''), text));

  contact.natalPdfPath = paths.pdf;
  contact.natalTxtPath = paths.txt;
  contact.natalReady = true;
  contact.natalStatus = 'ready';
  contact.natalGeneratedAt = new Date().toISOString();
  contact.natalSource = source;

  return {
    ok: true,
    source: source,
    pdfPath: paths.pdf,
    txtPath: paths.txt,
    claudeOk: !!claude.ok,
    claudeReason: claude.reason || null,
    detail: claude.detail || null
  };
}

function resolveNatalFile(contact, prefer) {
  if (!contact) return null;
  if (prefer === 'txt' && contact.natalTxtPath && fs.existsSync(contact.natalTxtPath)) {
    return { path: contact.natalTxtPath, type: 'text/plain; charset=utf-8' };
  }
  if (contact.natalPdfPath && fs.existsSync(contact.natalPdfPath)) {
    return { path: contact.natalPdfPath, type: 'application/pdf' };
  }
  if (contact.natalTxtPath && fs.existsSync(contact.natalTxtPath)) {
    return { path: contact.natalTxtPath, type: 'text/plain; charset=utf-8' };
  }
  return null;
}

module.exports = {
  claudeKey,
  generateNatal,
  resolveNatalFile,
  OUT_DIR
};
