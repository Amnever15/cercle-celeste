/**
 * Réponses IA Céleste ancrées dans le manuscrit lu (Divin).
 * Appel Claude réel — jamais de stub générique « autorité intérieure ».
 */
const natalGen = require('../natal-generate');
const htmlDoc = require('./html-doc');
const { requestJson } = require('./http');
const claudeNatal = require('./claude-natal');

/** Contenu mois / jour aligné sur l’app (pas encore généré serveur). */
var MOIS_BODY = [
  'Ce mois-ci, le ciel te demande de ne plus avancer dans le brouillard : attends le signal, puis réponds avec tout ton être.',
  'Saturne touche ta Maison X : ta vocation veut un cadre, pas une fuite en avant. Un seul engagement public suffit.',
  'Fenêtre de puissance : du 8 au 14 — pose une demande claire (projet, lieu, relation) sans forcer le rythme.',
  'La frustration est ton panneau stop. Si tu pousses sans invitation, tu t’épuises.'
].join('\n\n');

var JOUR_BODY = [
  'Aujourd’hui, n’ouvre qu’une porte. Une conversation, un message, un pas visible — pas dix.',
  'Ton autorité émotionnelle te dit d’attendre la vague : si c’est agité à 10 h, ce n’est pas encore un oui.',
  'Ce soir, une phrase à écrire : « Qu’est-ce qui s’est ouvert sans que je force ? »'
].join('\n\n');

function loadNatalPlain(contact, maxChars) {
  maxChars = maxChars || 14000;
  try {
    var file = natalGen.resolveNatalFile(contact, 'json');
    if (file && file.path) {
      var raw = require('fs').readFileSync(file.path, 'utf8');
      var data = JSON.parse(raw);
      if (data && data.manuscrit) {
        return htmlDoc.extractPlainText(data.manuscrit, maxChars);
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
      if (text.length > maxChars) text = text.slice(0, maxChars) + '…';
      return text;
    }
  } catch (e) {}
  return '';
}

function loadManuscriptContext(contact, context) {
  context = String(context || 'natal');
  if (context === 'natal') return loadNatalPlain(contact, 14000);
  if (context === 'mois') {
    var natalM = loadNatalPlain(contact, 8000);
    return (
      'Manuscrit du mois (texte lu dans l’app) :\n' + MOIS_BODY +
      (natalM ? '\n\nRepères du manuscrit de ta vie (extrait) :\n' + natalM : '')
    ).trim();
  }
  if (context === 'jour') {
    var natalJ = loadNatalPlain(contact, 8000);
    return (
      'Manuscrit du jour (texte lu dans l’app) :\n' + JOUR_BODY +
      (natalJ ? '\n\nRepères du manuscrit de ta vie (extrait) :\n' + natalJ : '')
    ).trim();
  }
  return loadNatalPlain(contact, 14000);
}

/** Fenêtre autour du passage sélectionné, sinon tête + queue du manuscrit. */
function smartContext(full, selected, maxChars) {
  maxChars = maxChars || 12000;
  full = String(full || '');
  selected = String(selected || '').trim();
  if (!full) return '';
  if (selected && selected.length >= 12) {
    var needle = selected.slice(0, Math.min(48, selected.length));
    var i = full.indexOf(needle);
    if (i < 0) {
      var soft = selected.replace(/\s+/g, ' ').slice(0, 36);
      i = full.replace(/\s+/g, ' ').indexOf(soft);
    }
    if (i >= 0) {
      var start = Math.max(0, i - 2200);
      var end = Math.min(full.length, i + selected.length + 4500);
      var chunk = full.slice(start, end);
      if (start > 0) chunk = '…' + chunk;
      if (end < full.length) chunk = chunk + '…';
      return chunk;
    }
  }
  if (full.length <= maxChars) return full;
  var head = Math.floor(maxChars * 0.72);
  var tail = Math.floor(maxChars * 0.22);
  return full.slice(0, head) + '\n…\n' + full.slice(-tail);
}

function historyToClaudeMessages(history) {
  var out = [];
  var list = Array.isArray(history) ? history.slice(-14) : [];
  for (var i = 0; i < list.length; i++) {
    var m = list[i];
    if (!m || !m.text) continue;
    var role = m.role === 'me' || m.role === 'user' ? 'user' : 'assistant';
    out.push({ role: role, content: String(m.text).slice(0, 4000) });
  }
  return out;
}

async function callClaude(system, messages) {
  var key = claudeNatal.claudeKey();
  if (!key) {
    var err = new Error('no-key');
    err.friendly = 'Le ciel ne répond pas pour le moment. Réessaie dans un instant.';
    throw err;
  }
  var model = claudeNatal.claudeModel();
  var data = await requestJson('https://api.anthropic.com/v1/messages', {
    label: 'IA Céleste',
    retries: 2,
    timeout_ms: 90000,
    retry_delay_ms: 1200,
    fetch_options: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 1200,
        system: system,
        messages: messages
      })
    }
  });
  var text = (data.content || []).map(function (b) {
    return b && b.type === 'text' ? b.text : '';
  }).join('\n').trim();
  if (!text) {
    var empty = new Error('empty');
    empty.friendly = 'Le ciel se tait un instant. Repose ta question dans un moment.';
    throw empty;
  }
  return text;
}

/**
 * @param {object} contact
 * @param {string} question
 * @param {string} context natal|mois|jour
 * @param {{ history?: array, selectedPassage?: string }} opts
 */
async function answerFromManuscript(contact, question, context, opts) {
  opts = opts || {};
  var ctx = String(context || 'natal');
  var selected = String(opts.selectedPassage || '').trim();
  if (selected.length > 4000) selected = selected.slice(0, 4000) + '…';
  var rawMs = loadManuscriptContext(contact, ctx);
  var manuscript = smartContext(rawMs, selected, 12000);
  var label = ctx === 'mois' ? 'du mois' : (ctx === 'jour' ? 'du jour' : 'de ta vie');
  var prenom = (contact && contact.prenom) || 'toi';

  var system =
    'Tu es l’IA Céleste, présence douce, claire et précise. Tu accompagnes ' + prenom +
    ' pendant qu’elle ou il lit son Manuscrit Céleste ' + label + '. ' +
    'Réponds en français, tutoiement, 2 à 5 courts paragraphes. ' +
    'Ancre CHAQUE réponse dans le contenu concret du manuscrit fourni : cite ou paraphrases des éléments réels ' +
    '(type / autorité / stratégie HD, planètes, maisons, canaux, chapitres, insights) quand ils apparaissent. ' +
    'Interdits : phrases toutes faites génériques du type « écoute ton autorité intérieure » / « si la vague n’est pas claire » ' +
    'sans les relier à CE manuscrit ; ne mentionne jamais Claude, OpenAI, ni « intelligence artificielle ». ' +
    'Ton : céleste, chaleureux, concret — comme une lecture qui continue le manuscrit, pas un template.';

  var userParts = [];
  if (manuscript) {
    userParts.push('Extrait du manuscrit ' + label + ' :\n"""\n' + manuscript + '\n"""');
  } else {
    userParts.push(
      'Le manuscrit n’est pas encore disponible en entier. Dis-le avec douceur et invite à relire les pages déjà ouvertes, ' +
      'sans inventer de placements fictifs.'
    );
  }
  if (selected) {
    userParts.push(
      'Passage sélectionné par la lectrice (à développer et approfondir à la lumière du manuscrit) :\n« ' +
      selected + ' »\n' +
      'Continue l’analyse de CE passage : élargis, précise, relie aux autres fils du manuscrit. Ne te contente pas de le reformuler.'
    );
  }
  userParts.push('Question : ' + String(question || '').trim());

  var messages = historyToClaudeMessages(opts.history);
  messages.push({ role: 'user', content: userParts.join('\n\n') });

  try {
    return await callClaude(system, messages);
  } catch (e) {
    if (e && e.friendly) throw e;
    var soft = new Error('claude-fail');
    soft.friendly = 'Le ciel ne répond pas pour le moment. Réessaie dans un instant.';
    throw soft;
  }
}

module.exports = {
  answerFromManuscript,
  loadManuscriptContext,
  smartContext
};
