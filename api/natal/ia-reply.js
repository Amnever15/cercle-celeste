/**
 * Réponses IA Céleste ancrées dans le manuscrit lu (Divin).
 * Pas de jargon technique côté client.
 */
const https = require('https');
const natalGen = require('../natal-generate');
const htmlDoc = require('./html-doc');

function claudeKey() {
  return process.env.CLAUDE_KEY || process.env.ANTHROPIC_API_KEY || '';
}

function loadManuscriptContext(contact, context) {
  context = String(context || 'natal');
  if (context === 'natal') {
    try {
      var file = natalGen.resolveNatalFile(contact, 'json');
      if (file && file.path) {
        var raw = require('fs').readFileSync(file.path, 'utf8');
        var data = JSON.parse(raw);
        if (data && data.manuscrit) {
          return htmlDoc.extractPlainText(data.manuscrit, 10000);
        }
      }
      var htmlFile = natalGen.resolveNatalFile(contact, 'html') || natalGen.resolveNatalFile(contact);
      if (htmlFile && htmlFile.path) {
        var html = require('fs').readFileSync(htmlFile.path, 'utf8');
        var text = html
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (text.length > 10000) text = text.slice(0, 10000) + '…';
        return text;
      }
    } catch (e) {}
    return '';
  }
  /* mois / jour : contenu encore stub côté app — contexte natal + note temporelle */
  var natalCtx = loadManuscriptContext(contact, 'natal');
  var note = context === 'mois'
    ? 'Contexte : manuscrit du mois en cours. Réponds aussi à la lumière du ciel natal.'
    : 'Contexte : manuscrit du jour. Réponds pour aujourd’hui, à la lumière du ciel natal.';
  return (note + '\n\n' + natalCtx).trim();
}

function fallbackAnswer(question, context) {
  var q = String(question || '').slice(0, 100);
  return 'À la lumière de ton manuscrit, pour « ' + q +
    ' » : écoute d’abord ton autorité intérieure. Si la vague n’est pas claire, ce n’est pas encore un oui. Relis le passage qui parle de ton timing — la réponse est déjà écrite pour toi.';
}

function callClaude(system, userMsg) {
  return new Promise(function (resolve, reject) {
    var key = claudeKey();
    if (!key) return reject(new Error('no-key'));
    var body = JSON.stringify({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 900,
      system: system,
      messages: [{ role: 'user', content: userMsg }]
    });
    var req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      }
    }, function (res) {
      var chunks = [];
      res.on('data', function (d) { chunks.push(d); });
      res.on('end', function () {
        var raw = Buffer.concat(chunks).toString('utf8');
        try {
          var j = JSON.parse(raw);
          var text = (j.content || []).map(function (b) {
            return b && b.type === 'text' ? b.text : '';
          }).join('\n').trim();
          if (!text) return reject(new Error('empty'));
          resolve(text);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, function () { req.destroy(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

async function answerFromManuscript(contact, question, context) {
  var ctx = String(context || 'natal');
  var manuscript = loadManuscriptContext(contact, ctx);
  var label = ctx === 'mois' ? 'du mois' : (ctx === 'jour' ? 'du jour' : 'de ta vie');
  var system =
    'Tu es l’IA Céleste, presence douce et claire. Tu accompagnes ' +
    (contact.prenom || 'la lectrice') +
    ' pendant qu’elle lit son Manuscrit Céleste ' + label + '. ' +
    'Réponds en français, tutoiement, 2 à 4 courts paragraphes. ' +
    'Ancre ta réponse dans le manuscrit fourni. Ne mentionne jamais Claude, OpenAI, ni « intelligence artificielle ». ' +
    'Parle du ciel, des planètes, du code de vie, du langage de l’univers.';

  var userMsg =
    (manuscript
      ? 'Extrait du manuscrit :\n"""\n' + manuscript + '\n"""\n\n'
      : 'Le manuscrit n’est pas encore disponible en entier. Réponds avec douceur et invite à relire les pages déjà ouvertes.\n\n') +
    'Question : ' + question;

  try {
    return await callClaude(system, userMsg);
  } catch (e) {
    return fallbackAnswer(question, ctx);
  }
}

module.exports = {
  answerFromManuscript,
  loadManuscriptContext,
  fallbackAnswer
};
