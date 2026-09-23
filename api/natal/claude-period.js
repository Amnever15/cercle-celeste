/**
 * Rédaction Manuscrit du mois (~10 pages) et du jour (1–4 pages).
 * Réutilise le thème HD/Astro en cache (pas de re-fetch si déjà stocké).
 */
const { claudeJsonApi, claudeKey } = require('./claude-natal');

function frMonthYear(d) {
  d = d || new Date();
  var months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return months[d.getMonth()] + ' ' + d.getFullYear();
}

function frLongDate(d) {
  d = d || new Date();
  var months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

function chartCtx(contact, hd, astro) {
  return [
    'Prénom : ' + (contact.prenom || 'toi'),
    'Naissance : ' + (contact.birthDate || '') + ' ' + (contact.birthTime || '') + ' — ' + (contact.birthPlace || ''),
    'Genre (ton) : ' + (contact.gender || ''),
    'HD — Type : ' + ((hd && hd.type) || '—') +
      ' | Profil : ' + ((hd && hd.profile) || '—') +
      ' | Autorité : ' + ((hd && hd.authority) || '—') +
      ' | Stratégie : ' + ((hd && hd.strategy) || '—'),
    'Astro — Soleil : ' + ((astro && astro.Sun) || '—') +
      ' | Lune : ' + ((astro && astro.Moon) || '—') +
      ' | Ascendant : ' + ((astro && astro.Ascendant) || '—') +
      ' | MC : ' + ((astro && astro.MC) || '—')
  ].join('\n');
}

function normalizePeriod(data, kind) {
  data = data || {};
  var sections = Array.isArray(data.sections) ? data.sections : [];
  sections = sections.map(function (s, i) {
    if (!s || typeof s !== 'object') return null;
    return {
      numero: String(s.numero || (i + 1)),
      titre: String(s.titre || ('Chapitre ' + (i + 1))),
      contenu: String(s.contenu || '').trim(),
      insight: String(s.insight || s.encadre || '').trim()
    };
  }).filter(function (s) { return s && s.contenu; });
  return {
    kind: kind,
    titre: String(data.titre || ''),
    intro: String(data.intro || '').trim(),
    sections: sections,
    conclusion: String(data.conclusion || '').trim(),
    rituel: data.rituel && typeof data.rituel === 'object'
      ? { titre: String(data.rituel.titre || 'Rituel'), description: String(data.rituel.description || '').trim() }
      : null
  };
}

/**
 * ~8–12 pages : intro + 5 chapitres + conclusion/rituel.
 */
async function generateMois(contact, hd, astro, onProgress) {
  if (!claudeKey()) throw new Error('CLAUDE_KEY manquant');
  var label = frMonthYear(new Date());
  var ctx = chartCtx(contact, hd, astro);
  if (onProgress) onProgress('Le ciel de ' + label + ' s’écrit…', 40);

  var data = await claudeJsonApi(
    'Tu es l’auteur des Manuscrits Célestes (français, ton intime, précis, jamais marketing).\n' +
    'Écris le MANUSCRIT DU MOIS pour ' + label + ' — environ 8 à 12 pages de lecture (~2200 à 3200 mots au total).\n' +
    'Ancre TOUT dans le thème natal HD + astral fourni. Parle du mois en cours (transits symboliques, rythme, fenêtres) sans inventer de dates astronomiques fausses précises : reste symbolique et incarné.\n' +
    'Interdits : mention d’IA, d’API, de modèle, de prompt.\n\n' +
    ctx + '\n\n' +
    'Réponds UNIQUEMENT en JSON strict :\n' +
    '{\n' +
    '  "titre": "Manuscrit Céleste de ' + label + '",\n' +
    '  "intro": "2-3 paragraphes d’ouverture",\n' +
    '  "sections": [\n' +
    '    {"numero":"I","titre":"...","contenu":"4-6 paragraphes","insight":"1 phrase"},\n' +
    '    {"numero":"II","titre":"...","contenu":"...","insight":"..."},\n' +
    '    {"numero":"III","titre":"...","contenu":"...","insight":"..."},\n' +
    '    {"numero":"IV","titre":"...","contenu":"...","insight":"..."},\n' +
    '    {"numero":"V","titre":"...","contenu":"...","insight":"..."}\n' +
    '  ],\n' +
    '  "conclusion": "1-2 paragraphes",\n' +
    '  "rituel": {"titre":"...","description":"1 paragraphe pratique"}\n' +
    '}\n' +
    'Thèmes suggérés : (I) climat du mois pour ce type HD, (II) corps & autorité, (III) liens / amour, (IV) travail & vocation, (V) fenêtres & vigilance.\n',
    7500,
    'Mois-' + label
  );

  var out = normalizePeriod(data, 'mois');
  if (out.sections.length < 4) {
    throw new Error('Manuscrit du mois incomplet (' + out.sections.length + ' chapitres)');
  }
  if (!out.titre) out.titre = 'Manuscrit Céleste de ' + label;
  if (onProgress) onProgress('Assemblage du manuscrit du mois…', 85);
  return out;
}

/**
 * ~1–4 pages pour aujourd’hui.
 */
async function generateJour(contact, hd, astro, onProgress) {
  if (!claudeKey()) throw new Error('CLAUDE_KEY manquant');
  var label = frLongDate(new Date());
  var ctx = chartCtx(contact, hd, astro);
  if (onProgress) onProgress('Le ciel du ' + label + ' s’écrit…', 40);

  var data = await claudeJsonApi(
    'Tu es l’auteur des Manuscrits Célestes (français, ton intime, précis).\n' +
    'Écris le MANUSCRIT DU JOUR pour le ' + label + ' — environ 1 à 4 pages (~400 à 1100 mots).\n' +
    'Concentre-toi sur AUJOURD’HUI pour CE thème HD + astral : énergie, autorité, une porte à ouvrir, une vigilance.\n' +
    'Interdits : mention d’IA, d’API, de modèle.\n\n' +
    ctx + '\n\n' +
    'JSON strict uniquement :\n' +
    '{\n' +
    '  "titre": "Manuscrit Céleste du ' + label + '",\n' +
    '  "intro": "1-2 paragraphes",\n' +
    '  "sections": [\n' +
    '    {"numero":"I","titre":"Le climat du jour","contenu":"2-4 paragraphes","insight":"1 phrase"},\n' +
    '    {"numero":"II","titre":"Ton autorité aujourd’hui","contenu":"2-3 paragraphes","insight":"1 phrase"},\n' +
    '    {"numero":"III","titre":"Une seule porte","contenu":"1-3 paragraphes","insight":"1 phrase"}\n' +
    '  ],\n' +
    '  "conclusion": "1 paragraphe de clôture",\n' +
    '  "rituel": {"titre":"Geste du soir","description":"2-4 phrases"}\n' +
    '}\n',
    3500,
    'Jour-' + label
  );

  var out = normalizePeriod(data, 'jour');
  if (out.sections.length < 2) {
    throw new Error('Manuscrit du jour incomplet');
  }
  if (!out.titre) out.titre = 'Manuscrit Céleste du ' + label;
  if (onProgress) onProgress('Assemblage du manuscrit du jour…', 85);
  return out;
}

module.exports = {
  generateMois,
  generateJour,
  frMonthYear,
  frLongDate,
  normalizePeriod
};
