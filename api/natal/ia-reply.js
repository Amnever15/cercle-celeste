/**
 * Réponses IA Céleste ancrées dans le manuscrit lu (Divin).
 * Appel Claude réel — jamais de stub générique « autorité intérieure ».
 */
const natalGen = require('../natal-generate');
const periodGen = require('../period-generate');
const coupleGen = require('../couple-generate');
const ultimeGen = require('../ultime-generate');
const chartCache = require('./chart-cache');
const htmlDoc = require('./html-doc');
const { requestJson } = require('./http');
const claudeNatal = require('./claude-natal');

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

function chartHints(contact) {
  if (!contact || !chartCache.hasValidCache(contact)) return '';
  var hd = contact.chartHd || {};
  var astro = contact.chartAstro || {};
  return [
    'Thème natal (cache) —',
    'HD Type: ' + (hd.type || '—') +
      ' | Profil: ' + (hd.profile || '—') +
      ' | Autorité: ' + (hd.authority || '—') +
      ' | Stratégie: ' + (hd.strategy || '—'),
    'Astro Soleil: ' + (astro.Sun || '—') +
      ' | Lune: ' + (astro.Moon || '—') +
      ' | Asc: ' + (astro.Ascendant || '—')
  ].join('\n');
}

function loadManuscriptContext(contact, context) {
  context = String(context || 'natal');
  var hints = chartHints(contact);
  if (context === 'natal') {
    var natal = loadNatalPlain(contact, 14000);
    return (hints ? hints + '\n\n' : '') + natal;
  }
  if (context === 'mois') {
    var mois = periodGen.loadPeriodPlain(contact, 'mois', 12000);
    var natalM = loadNatalPlain(contact, 6000);
    return (
      (hints ? hints + '\n\n' : '') +
      (mois
        ? 'Manuscrit du mois :\n' + mois
        : 'Manuscrit du mois : pas encore généré pour ce mois.') +
      (natalM ? '\n\nRepères du manuscrit de ta vie (extrait) :\n' + natalM : '')
    ).trim();
  }
  if (context === 'jour') {
    var jour = periodGen.loadPeriodPlain(contact, 'jour', 8000);
    var natalJ = loadNatalPlain(contact, 6000);
    return (
      (hints ? hints + '\n\n' : '') +
      (jour
        ? 'Manuscrit du jour :\n' + jour
        : 'Manuscrit du jour : pas encore généré pour aujourd’hui.') +
      (natalJ ? '\n\nRepères du manuscrit de ta vie (extrait) :\n' + natalJ : '')
    ).trim();
  }
  if (context === 'couple') {
    var couple = coupleGen.loadCouplePlain(contact, 14000);
    var partnerHints = '';
    if (contact && chartCache.hasValidPartnerCache(contact)) {
      var phd = contact.partnerChartHd || {};
      var pastro = contact.partnerChartAstro || {};
      partnerHints = [
        'Partenaire (' + (contact.partnerPrenom || '—') + ') —',
        'HD Type: ' + (phd.type || '—') +
          ' | Profil: ' + (phd.profile || '—') +
          ' | Autorité: ' + (phd.authority || '—'),
        'Astro Soleil: ' + (pastro.Sun || '—') +
          ' | Lune: ' + (pastro.Moon || '—') +
          ' | Asc: ' + (pastro.Ascendant || '—')
      ].join('\n');
    }
    return (
      (hints ? hints + '\n\n' : '') +
      (partnerHints ? partnerHints + '\n\n' : '') +
      (couple
        ? 'Manuscrit de couple :\n' + couple
        : 'Manuscrit de couple : pas encore généré pour ce mois.')
    ).trim();
  }
  if (context === 'ultime') {
    var ultime = ultimeGen.loadUltimePlain(contact, 14000);
    return (
      (hints ? hints + '\n\n' : '') +
      (ultime
        ? 'Manuscrit Ultime :\n' + ultime
        : 'Manuscrit Ultime : pas encore généré.')
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
  var label = ctx === 'mois'
    ? 'du mois'
    : (ctx === 'jour' ? 'du jour' : (ctx === 'couple' ? 'de couple' : 'de ta vie'));
  var prenom = (contact && contact.prenom) || 'toi';
  var partnerName = (contact && contact.partnerPrenom) || '';

  var system =
    'Tu es l’IA Céleste, présence douce, claire et précise. Tu accompagnes ' + prenom +
    (ctx === 'couple' && partnerName ? (' et ' + partnerName) : '') +
    ' pendant qu’elle ou il lit son Manuscrit Céleste ' + label + '. ' +
    'Réponds en français, ' + (ctx === 'couple' ? 'vouvoiement du couple ou tutoiement selon la question, ' : 'tutoiement, ') +
    '2 à 5 courts paragraphes. ' +
    'Ancre CHAQUE réponse dans le contenu concret du manuscrit fourni : cite ou paraphrases des éléments réels ' +
    '(type / autorité / stratégie HD, planètes, synastrie, chapitres, insights) quand ils apparaissent. ' +
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
