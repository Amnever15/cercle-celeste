/**
 * Rédaction Manuscrit Céleste Couple — port de
 * GENERATIONS/manuscrit-celeste-generation-couple.html → callClaudeCouple
 * (cœur : 10 chapitres + clôture + synthèse + bonus — sans coffret ZIP).
 */
const { claudeJsonApi, claudeKey } = require('./claude-natal');
const profile = require('../profile');
const language = require('../language');

const COUPLE_SECTION_SPECS = [
  { numero: 'I', titre: 'Vos Codes Cosmiques', sous_titre: 'Types, profils, stratégies et autorités à deux' },
  { numero: 'II', titre: 'Vos Deux Ciels de Naissance', sous_titre: 'Soleil, Lune et Ascendant croisés' },
  { numero: 'III', titre: 'Synastrie Planétaire', sous_titre: 'Mercure, Vénus, Mars, Jupiter, Saturne, Nœud Nord' },
  { numero: 'IV', titre: 'Architectures Énergétiques', sous_titre: 'Centres définis et indéfinis en interaction' },
  { numero: 'V', titre: 'Là Où Vous Vibrez Ensemble', sous_titre: 'Convergences profondes entre vos cartes' },
  { numero: 'VI', titre: 'Votre Mission à Deux', sous_titre: 'Croix d\'Incarnation et direction commune' },
  { numero: 'VII', titre: 'Vos Zones de Croissance', sous_titre: 'Not-Self, conditionnements et tensions créatrices' },
  { numero: 'VIII', titre: 'Communication & Attractions', sous_titre: 'Mercure × Mercure, Vénus × Mars' },
  { numero: 'IX', titre: 'Intimité & Sécurité Émotionnelle', sous_titre: 'Lune × Lune, Chiron en synastrie' },
  { numero: 'X', titre: 'Votre Contrat Cosmique', sous_titre: 'Vision, limites et engagements partagés' }
];

function coupleWordCount(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

function packPerson(label, contactLike, hd, astro) {
  hd = hd || {};
  astro = astro || {};
  return {
    label: label,
    prenom: contactLike.prenom || 'toi',
    genre: contactLike.gender || '',
    naissance: contactLike.birthDate || '',
    heure: contactLike.birthTime || '',
    lieu: contactLike.birthPlace || '',
    hd: {
      type: hd.type || null,
      profile: hd.profile || null,
      authority: hd.authority || null,
      strategy: hd.strategy || null,
      cross: hd.cross || null,
      definition: hd.definition || null,
      notSelf: hd.notSelf || null,
      signature: hd.signature || null,
      motivation: hd.motivation || null,
      channels: Array.isArray(hd.channels) ? hd.channels.slice(0, 12) : []
    },
    astro: {
      Sun: astro.Sun, Moon: astro.Moon, Mercury: astro.Mercury, Venus: astro.Venus, Mars: astro.Mars,
      Jupiter: astro.Jupiter, Saturn: astro.Saturn, Ascendant: astro.Ascendant, MC: astro.MC,
      NorthNode: astro.NorthNode, Chiron: astro.Chiron || null, Lilith: astro.Lilith || null
    }
  };
}

function sharedContext(pA, pB, langCode) {
  var a = pA.astro || {};
  var b = pB.astro || {};
  var langRule = language.promptInstruction(langCode || 'fr', { couple: true });
  return (
    'Tu es à la fois astrologue de synastrie de niveau international, analyste Human Design certifié et thérapeute de couple. ' +
    'Tu écris pour ' + pA.prenom + ' et ' + pB.prenom + ' un document premium, du calibre d\'un accompagnement payant haut de gamme.\n' +
    langRule + '\n\n' +
    '=== ' + pA.prenom + ' (Personne A) ===\n' +
    '- Genre: ' + pA.genre + ' | Naissance: ' + pA.naissance + ' à ' + pA.heure + ' | Lieu: ' + pA.lieu + '\n' +
    '- Human Design: Type=' + (pA.hd.type || '—') + ', Profil=' + (pA.hd.profile || '—') +
    ', Autorité=' + (pA.hd.authority || '—') + ', Stratégie=' + (pA.hd.strategy || '—') +
    ', Définition=' + (pA.hd.definition || '—') + ', Croix=' + (pA.hd.cross || '—') +
    ', Signature=' + (pA.hd.signature || '—') + ', Non-Soi=' + (pA.hd.notSelf || '—') + '\n' +
    '- Astrologie: Soleil=' + (a.Sun || '—') + ', Lune=' + (a.Moon || '—') + ', Ascendant=' + (a.Ascendant || '—') +
    ', Mercure=' + (a.Mercury || '—') + ', Vénus=' + (a.Venus || '—') + ', Mars=' + (a.Mars || '—') +
    ', Jupiter=' + (a.Jupiter || '—') + ', Saturne=' + (a.Saturn || '—') + ', MC=' + (a.MC || '—') +
    ', Nœud Nord=' + (a.NorthNode || '—') + ', Chiron=' + (a.Chiron || '—') + ', Lilith=' + (a.Lilith || '—') + '\n\n' +
    '=== ' + pB.prenom + ' (Personne B) ===\n' +
    '- Genre: ' + pB.genre + ' | Naissance: ' + pB.naissance + ' à ' + pB.heure + ' | Lieu: ' + pB.lieu + '\n' +
    '- Human Design: Type=' + (pB.hd.type || '—') + ', Profil=' + (pB.hd.profile || '—') +
    ', Autorité=' + (pB.hd.authority || '—') + ', Stratégie=' + (pB.hd.strategy || '—') +
    ', Définition=' + (pB.hd.definition || '—') + ', Croix=' + (pB.hd.cross || '—') +
    ', Signature=' + (pB.hd.signature || '—') + ', Non-Soi=' + (pB.hd.notSelf || '—') + '\n' +
    '- Astrologie: Soleil=' + (b.Sun || '—') + ', Lune=' + (b.Moon || '—') + ', Ascendant=' + (b.Ascendant || '—') +
    ', Mercure=' + (b.Mercury || '—') + ', Vénus=' + (b.Venus || '—') + ', Mars=' + (b.Mars || '—') +
    ', Jupiter=' + (b.Jupiter || '—') + ', Saturne=' + (b.Saturn || '—') + ', MC=' + (b.MC || '—') +
    ', Nœud Nord=' + (b.NorthNode || '—') + ', Chiron=' + (b.Chiron || '—') + ', Lilith=' + (b.Lilith || '—') + '\n\n' +
    'EXIGENCES DE QUALITÉ ÉDITORIALE (NON NÉGOCIABLES) :\n' +
    '1. SPÉCIFICITÉ : interdiction des banalités. Chaque idée majeure nomme un placement précis et une conséquence concrète.\n' +
    '2. SYNASTRIE RÉELLE : croise les DEUX cartes (A × B), ne décris pas deux personnes en parallèle.\n' +
    '3. INCARNATION : utilise les prénoms, micro-scènes, dialogues (« quand A dit X, B entend Y »).\n' +
    '4. PÉDAGOGIE : définis chaque terme HD/astro en une phrase au premier usage.\n' +
    '5. ACTIONNABLE : protocoles, scripts, garde-fous. Zéro remplissage.\n' +
    '6. TON : chaleureux, fin, adulte, jamais fataliste, jamais voyance prédictive.\n' +
    'Interdits : mention d\'IA, d\'API, de modèle, de prompt.\n'
  );
}

function technicalBrief(pA, pB, langCode) {
  return 'DONNEES_ASTRO_HD_COUPLE (obligatoire: ancrer tout le texte dedans)\n' +
    JSON.stringify({ personne_a: pA, personne_b: pB, langue: language.normalize(langCode) }, null, 0);
}

function normalizeRituel(raw, idx) {
  var r = raw || {};
  return {
    nom: String(r.nom || r.titre || r.name || ('Rituel ' + (idx + 1))).trim(),
    timing: String(r.timing || r.moment || r.frequence || r.duree || r.quand || '').trim(),
    description: String(r.description || r.descriptif || r.contenu || '').trim()
  };
}

function buildClotureFallback(pA, pB) {
  var pa = pA.prenom;
  var pb = pB.prenom;
  return {
    affirmations: [
      pa + ' et ' + pb + ', nous choisissons de nous écouter avant de réagir, et de transformer chaque désaccord en compréhension mutuelle.',
      'Notre lien est un espace où nos différences deviennent une force créatrice, jamais une menace.',
      'Nous honorons nos rythmes respectifs : quand l\'un a besoin de silence, l\'autre offre sa présence sans exiger.',
      'Chaque jour, nous posons un geste concret qui nourrit la confiance entre ' + pa + ' et ' + pb + '.',
      'Nous parlons nos besoins avec clarté, sans reproche, parce que notre amour mérite la vérité.',
      'Notre couple est un laboratoire d\'alignement : nous expérimentons, ajustons, et grandissons ensemble.',
      'Nous célébrons nos victoires communes et accueillons nos fragilités comme des portes, non des faiblesses.',
      'La désirabilité entre nous se renouvelle quand nous restons curieux l\'un de l\'autre, corps et âme.',
      'Nous protégeons notre bulle relationnelle : limites saines, rituels partagés, respect des espaces individuels.',
      pa + ' et ' + pb + ', nous sommes exactement la rencontre que nos cartes ont préparée — et nous l\'incarnons consciemment.'
    ],
    rituels: [
      {
        nom: 'Synchronisation matinale',
        timing: '10 min · chaque matin',
        description: 'Asseyez-vous face à face. Chacun partage en une phrase son état intérieur, puis une intention pour la journée. Terminez par un geste physique choisi ensemble. Ce rituel ancre la sécurité émotionnelle avant que le quotidien ne vous sépare.'
      },
      {
        nom: 'Réparation consciente du soir',
        timing: '15 min · 3 fois par semaine',
        description: 'Avant le coucher, sans téléphones. Une seule personne parle à la fois, l\'autre reformule. Identifiez une micro-friction et transformez-la en demande claire. Clôturez par une gratitude sincère nommant un détail précis chez l\'autre.'
      },
      {
        nom: 'Date d\'alignement hebdomadaire',
        timing: '45-60 min · chaque semaine',
        description: 'Réservez un créneau non négociable. Alternez qui choisit l\'activité. Commencez par 3 minutes de respiration synchronisée. Notez ensuite une décision pratique pour la semaine suivante.'
      },
      {
        nom: 'Reset énergétique du couple',
        timing: '20 min · dimanche soir',
        description: 'Éteignez les écrans. Chacun écrit 2 choses à lâcher et 2 choses à cultiver. Échangez, lisez à voix haute, puis déchirez symboliquement ce qui doit partir. Terminez par un engagement concret pour la semaine.'
      },
      {
        nom: 'Dialogue des langages d\'amour',
        timing: '25 min · 2 fois par mois',
        description: 'Listez chacun vos 2 langages dominants. Donnez un exemple où vous vous sentez nourri·e, puis un où vous manquez — sans accuser. Inventez ensemble un geste-pont qui parle aux deux langages.'
      },
      {
        nom: 'Vision à 90 jours',
        timing: '40 min · début de chaque trimestre',
        description: 'Sur une feuille partagée : relation, vie matérielle, sens/projet. Pour chaque axe, une action à 30, 60 et 90 jours. Vérifiez l\'alignement avec vos types HD. Affichez la feuille et faites un point rapide chaque dimanche.'
      }
    ],
    conclusion:
      pa + ' et ' + pb + ',\n\nCe manuscrit n\'est pas une prédiction figée : c\'est une carte vivante de votre alchimie à deux. Vos codes cosmiques, croisés ici, révèlent pourquoi vous vous êtes reconnus — et aussi pourquoi certains jours vous vous frictions. Ce n\'est pas un défaut du lien : c\'est le prix de deux mondes intérieurs riches qui apprennent à danser ensemble.\n\nVous portez chacun une stratégie énergétique unique. Quand vous la respectez mutuellement, la fatigue cède la place à la confiance. Gardez près de vous les rituels proposés : ce ne sont pas des corvées spirituelles, mais des raccourcis concrets vers la paix.\n\nLes affirmations de ce manuscrit sont des ancres. Relisez-les à voix haute, surtout les jours où le doute murmure. L\'Univers ne vous a pas réunis par hasard — vos cartes dessinent une complémentarité rare, à condition de la choisir chaque matin.\n\nUn couple aligné n\'est pas un couple sans conflit : c\'est un couple qui sait réparer plus vite qu\'il ne blesse. Vous avez des outils pour cela.\n\nAllez doucement, avancez concrètement, célébrez souvent. Votre histoire est encore en train de s\'écrire — et elle mérite d\'être écrite à deux mains.\n\nAvec lumière,\nL\'Univers à travers vos cartes.'
  };
}

function applySectionSpecs(sections, pA, pB) {
  var fb = buildCoreFallback(pA, pB).sections;
  var out = [];
  for (var i = 0; i < 10; i++) {
    var spec = COUPLE_SECTION_SPECS[i];
    var src = (sections && sections[i]) || {};
    var fbSrc = fb[i] || {};
    out.push({
      numero: spec.numero,
      titre: spec.titre,
      sous_titre: String(src.sous_titre || spec.sous_titre || fbSrc.sous_titre || '').trim(),
      contenu: String(src.contenu || fbSrc.contenu || '').trim(),
      insight: String(src.insight || fbSrc.insight || 'Clarté, rythme et coopération.').trim()
    });
  }
  return out;
}

function buildCoreFallback(pA, pB) {
  var pa = pA.prenom;
  var pb = pB.prenom;
  var sections = COUPLE_SECTION_SPECS.map(function (spec, i) {
    return {
      numero: spec.numero,
      titre: spec.titre,
      sous_titre: spec.sous_titre,
      contenu:
        pa + ' et ' + pb + ' portent des architectures distinctes qui, croisées, forment un système relationnel vivant. ' +
        'Dans ce chapitre (' + spec.titre + '), la synastrie invite à reconnaître le rythme de chacun, ' +
        'à nommer les frictions utiles et à transformer les divergences en protocoles concrets. ' +
        'Type HD de ' + pa + ' : ' + (pA.hd.type || '—') + ' ; de ' + pb + ' : ' + (pB.hd.type || '—') + '. ' +
        'Soleil de ' + pa + ' : ' + (pA.astro.Sun || '—') + ' ; de ' + pb + ' : ' + (pB.astro.Sun || '—') + '. ' +
        'Pratique : une conversation hebdomadaire de 20 minutes où chacun reformule ce qu\'il a entendu avant de répondre. ' +
        'Le but n\'est pas d\'effacer la différence, mais de la rendre lisible et actionnable dans le quotidien.',
      insight: 'Honorez vos rythmes avant d\'exiger l\'harmonie.'
    };
  });
  return {
    titre: 'Manuscrit Céleste — Couple',
    sous_titre: pa + ' & ' + pb,
    intro:
      pa + ' et ' + pb + ', ce manuscrit croise vos deux cartes pour éclairer la dynamique réelle de votre lien. ' +
      'Il ne prédit pas : il cartographie. Vous y trouverez les points de friction féconds, les attractions profondes, ' +
      'et des protocoles pour faire de vos différences une force partagée.',
    placements_confirmes: {
      soleil: (pA.astro.Sun || '—') + ' / ' + (pB.astro.Sun || '—'),
      lune: (pA.astro.Moon || '—') + ' / ' + (pB.astro.Moon || '—'),
      ascendant: (pA.astro.Ascendant || '—') + ' / ' + (pB.astro.Ascendant || '—'),
      type_hd: (pA.hd.type || '—') + ' / ' + (pB.hd.type || '—'),
      profil_hd: (pA.hd.profile || '—') + ' / ' + (pB.hd.profile || '—')
    },
    sections: sections
  };
}

function normalizeCloture(parsed, pA, pB) {
  var fb = buildClotureFallback(pA, pB);
  parsed = parsed || {};
  var affs = Array.isArray(parsed.affirmations)
    ? parsed.affirmations.map(function (a) { return String(a || '').trim(); }).filter(Boolean)
    : [];
  while (affs.length < 10) affs.push(fb.affirmations[affs.length] || fb.affirmations[0]);
  parsed.affirmations = affs.slice(0, 10);

  var rits = Array.isArray(parsed.rituels) ? parsed.rituels.map(normalizeRituel) : [];
  rits = rits.filter(function (r) { return r.description.length > 20 || r.nom.length > 3; });
  while (rits.length < 6) {
    var src = fb.rituels[rits.length] || fb.rituels[0];
    rits.push(normalizeRituel(src, rits.length));
  }
  parsed.rituels = rits.slice(0, 8).map(function (r, i) { return normalizeRituel(r, i); });

  var concl = String(parsed.conclusion || '').trim();
  if (coupleWordCount(concl) < 180) concl = fb.conclusion;
  parsed.conclusion = concl;
  return parsed;
}

function normalizeSynthese(raw, pA, pB) {
  var s = (raw && raw.synthese) || raw || {};
  return {
    essence: String(s.essence || '').trim() ||
      (pA.prenom + ' et ' + pB.prenom + ' : une alchimie de rythmes distincts qui devient force quand elle est nommée.'),
    forces_maitresses: Array.isArray(s.forces_maitresses) ? s.forces_maitresses.map(String).slice(0, 8) : [],
    forces: Array.isArray(s.forces_maitresses) ? s.forces_maitresses.map(String).slice(0, 6) : (Array.isArray(s.forces) ? s.forces.map(String).slice(0, 6) : []),
    zones_vigilance: Array.isArray(s.zones_vigilance) ? s.zones_vigilance.map(String).slice(0, 8) : [],
    chemin_croissance: String(s.chemin_croissance || '').trim(),
    strategie_relationnelle: String(s.strategie_relationnelle || s.strategie_hd || '').trim(),
    strategie_hd: String(s.strategie_relationnelle || s.strategie_hd || '').trim(),
    mantra: String(s.mantra_du_couple || s.mantra || '').trim(),
    mantra_du_couple: String(s.mantra_du_couple || s.mantra || '').trim()
  };
}

/**
 * Génère le manuscrit couple (structure alignée GENERATIONS).
 * @param {object} contact — soi
 * @param {object} partner — partnerAsContact
 * @param {object} chartA — { hd, astro }
 * @param {object} chartB — { hd, astro }
 * @param {function} onProgress
 */
async function generateCouple(contact, partner, chartA, chartB, onProgress) {
  if (!claudeKey()) throw new Error('CLAUDE_KEY manquant');
  var pA = packPerson('A', contact, chartA && chartA.hd, chartA && chartA.astro);
  var pB = packPerson('B', partner, chartB && chartB.hd, chartB && chartB.astro);
  var langCode = language.ofContact(contact);
  var ctx = sharedContext(pA, pB, langCode);
  var brief = technicalBrief(pA, pB, langCode);
  var progress = typeof onProgress === 'function' ? onProgress : function () {};

  function ask(label, schema, maxTok, pct) {
    progress(label, pct);
    return claudeJsonApi(ctx + '\n\n' + brief + '\n\n' + schema, maxTok, label);
  }

  var part1 = await ask(
    'Couple cœur 1/5',
    'RENVOIE STRICTEMENT UN JSON VALIDE (sans markdown):\n' +
    '{\n' +
    '  "titre":"Manuscrit Céleste - Couple",\n' +
    '  "sous_titre":"...",\n' +
    '  "intro":"280-420 mots, ton chaleureux, nomme ' + pA.prenom + ' et ' + pB.prenom + '",\n' +
    '  "placements_confirmes":{"soleil":"A/B","lune":"A/B","ascendant":"A/B","type_hd":"A/B","profil_hd":"A/B"},\n' +
    '  "sections":[\n' +
    '    {"numero":"I","titre":"Vos Codes Cosmiques","sous_titre":"...","contenu":"450-700 mots synastrie HD","insight":"<=18 mots"},\n' +
    '    {"numero":"II","titre":"Vos Deux Ciels de Naissance","sous_titre":"...","contenu":"450-700 mots","insight":"<=18 mots"},\n' +
    '    {"numero":"III","titre":"Synastrie Planétaire","sous_titre":"...","contenu":"450-700 mots","insight":"<=18 mots"}\n' +
    '  ]\n' +
    '}\nOBLIGATOIRE: titres EXACTS. Chaque contenu croise A×B avec placements réels.',
    7500,
    40
  );

  var part2 = await ask(
    'Couple cœur 2/5',
    'RENVOIE STRICTEMENT UN JSON VALIDE:\n' +
    '{"sections":[\n' +
    '  {"numero":"IV","titre":"Architectures Énergétiques","sous_titre":"...","contenu":"450-700 mots","insight":"<=18 mots"},\n' +
    '  {"numero":"V","titre":"Là Où Vous Vibrez Ensemble","sous_titre":"...","contenu":"450-700 mots","insight":"<=18 mots"},\n' +
    '  {"numero":"VI","titre":"Votre Mission à Deux","sous_titre":"...","contenu":"450-700 mots","insight":"<=18 mots"}\n' +
    ']}\nOBLIGATOIRE: titres EXACTS. Synastrie ' + pA.prenom + ' × ' + pB.prenom + '.',
    7500,
    52
  );

  var part3 = await ask(
    'Couple cœur 3/5',
    'RENVOIE STRICTEMENT UN JSON VALIDE:\n' +
    '{"sections":[\n' +
    '  {"numero":"VII","titre":"Vos Zones de Croissance","sous_titre":"...","contenu":"450-700 mots","insight":"<=18 mots"},\n' +
    '  {"numero":"VIII","titre":"Communication & Attractions","sous_titre":"...","contenu":"450-700 mots","insight":"<=18 mots"},\n' +
    '  {"numero":"IX","titre":"Intimité & Sécurité Émotionnelle","sous_titre":"...","contenu":"450-700 mots","insight":"<=18 mots"}\n' +
    ']}\nOBLIGATOIRE: titres EXACTS.',
    7500,
    64
  );

  var part4 = await ask(
    'Couple cœur 4/5',
    'RENVOIE STRICTEMENT UN JSON VALIDE:\n' +
    '{"sections":[\n' +
    '  {"numero":"X","titre":"Votre Contrat Cosmique","sous_titre":"...","contenu":"450-700 mots : vision, limites, engagements","insight":"<=18 mots"}\n' +
    ']}\nOBLIGATOIRE: titre EXACT. Pas d\'affirmations ni rituels ici.',
    5500,
    72
  );

  var cloture = await ask(
    'Couple clôture',
    'RENVOIE STRICTEMENT UN JSON VALIDE — CLÔTURE DU MANUSCRIT COUPLE ' + pA.prenom + ' & ' + pB.prenom + ':\n' +
    '{\n' +
    '  "affirmations": ["EXACTEMENT 10 strings — chacune 25-45 mots, personnalisées"],\n' +
    '  "rituels": [{"nom":"...","timing":"fréquence + durée","description":"130-220 mots"}],\n' +
    '  "conclusion":"280-400 mots — lettre de l\'Univers à ' + pA.prenom + ' et ' + pB.prenom + '"\n' +
    '}\n' +
    'affirmations: longueur exacte 10. rituels: 6 à 8 objets. conclusion: minimum 280 mots.',
    7000,
    80
  );

  var synth = await ask(
    'Couple synthèse',
    'RENVOIE STRICTEMENT UN JSON VALIDE:\n' +
    '{"synthese":{\n' +
    '  "essence":"45-80 mots",\n' +
    '  "forces_maitresses":["6 bullets, 20-40 mots"],\n' +
    '  "zones_vigilance":["6 bullets, 20-40 mots"],\n' +
    '  "chemin_croissance":"80-140 mots",\n' +
    '  "strategie_relationnelle":"80-140 mots",\n' +
    '  "mantra_du_couple":"12-24 mots"\n' +
    '}}',
    4000,
    88
  );

  var bonus = null;
  try {
    bonus = await ask(
      'Couple bonus',
      'RENVOIE STRICTEMENT UN JSON VALIDE:\n' +
      '{"bonus_valeur":{\n' +
      '  "scores_compatibilite":{"communication":0,"intimite":0,"finances":0,"vision_de_vie":0,"quotidien":0},\n' +
      '  "radar_resume":"80-140 mots",\n' +
      '  "plan_30_60_90":{"j30":["3-6 actions"],"j60":["3-6 actions"],"j90":["3-6 actions"]},\n' +
      '  "protocole_anti_conflit":["Étape 1 ...","Étape 2 ...","Étape 3 ...","Étape 4 ..."],\n' +
      '  "langages_amour_besoins":{\n' +
      '    "personne_a":{"langages":["..."],"besoins":["..."]},\n' +
      '    "personne_b":{"langages":["..."],"besoins":["..."]},\n' +
      '    "ponts_relationnels":["3-6 recommandations"]\n' +
      '  },\n' +
      '  "rituels_hebdo":[{"nom":"...","duree":"5-20 min","description":"40-90 mots"}],\n' +
      '  "contrat_relation":{"vision_commune":["3-6"],"limites":["3-6"],"engagements":["3-6"],"non_negociables":["3-6"]}\n' +
      '}}\nScores = entiers 0-100 ancrés dans leurs cartes.',
      6500,
      92
    );
  } catch (e) {
    bonus = null;
  }

  var fb = buildCoreFallback(pA, pB);
  var sections = []
    .concat((part1 && part1.sections) || [])
    .concat((part2 && part2.sections) || [])
    .concat((part3 && part3.sections) || [])
    .concat((part4 && part4.sections) || []);
  sections = applySectionSpecs(sections, pA, pB);

  var clot = normalizeCloture(cloture, pA, pB);
  var synthese = normalizeSynthese(synth, pA, pB);

  progress('Assemblage du manuscrit de couple…', 95);

  return {
    titre: String((part1 && part1.titre) || fb.titre),
    sous_titre: String((part1 && part1.sous_titre) || (pA.prenom + ' & ' + pB.prenom)),
    intro: String((part1 && part1.intro) || fb.intro).trim(),
    placements_confirmes: (part1 && part1.placements_confirmes) || fb.placements_confirmes,
    sections: sections,
    affirmations: clot.affirmations,
    rituels: clot.rituels,
    conclusion: clot.conclusion,
    synthese: synthese,
    bonus_valeur: (bonus && bonus.bonus_valeur) || null,
    personnes: {
      a: { prenom: pA.prenom, genre: pA.genre },
      b: { prenom: pB.prenom, genre: pB.genre }
    }
  };
}

module.exports = {
  generateCouple,
  COUPLE_SECTION_SPECS,
  claudeKey,
  toneLabel: profile.toneLabel
};
