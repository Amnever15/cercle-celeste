/**
 * Manuscrit Ultime APP — port GENERATIONS/MANUSCRIT ULTIME GENERATION.html (25/09/2026).
 * Corps dédié (~23 sections × 1200 mots) + Gene Keys (Activation / Vénus / Pearl).
 * Ne réutilise PAS le manuscrit natal 28 pages.
 * Contemplations GK ~380–420 mots/sphère ; Vénus en 2 lots.
 */
const natal = require('./claude-natal');
const language = require('../language');
const { buildGeneKeysProfile } = require('./gene-keys');

function gkSpherePrompt(s) {
  if (!s || !s.ok) {
    return (s && s.idFr ? s.idFr : '?') + ' : donnée manquante — n\'invente aucun numéro.';
  }
  return (
    s.idFr + ' (Gene Key ' + s.label + ' — « ' + s.key.nom + ' ») | Ombre: ' + s.key.ombre +
    ' | Don: ' + s.key.don + ' | Siddhi: ' + s.key.siddhi +
    ' | Planète: ' + s.planet + ' (' + (s.side === 'prs' ? 'Personnalité' : 'Design') + ')'
  );
}

function fallbackSpheres(list) {
  return (list || []).map(function (s) {
    var k = s && s.key ? s.key : null;
    return {
      id: (s && s.id) || '',
      nom: (s && s.idFr) || '',
      gene_key: (s && s.ok) ? (s.label || '—') : '—',
      nom_cle: k ? k.nom : '—',
      ombre: k ? k.ombre : '—',
      don: k ? k.don : '—',
      siddhi: k ? k.siddhi : '—',
      texte: (s && s.ok && k)
        ? ('Gene Key ' + s.label + ' — « ' + k.nom + ' ». Ombre : ' + k.ombre + ' → Don : ' + k.don + ' → Siddhi : ' + k.siddhi + '.')
        : 'Sphère non calculable (activation HD manquante).'
    };
  });
}

function fallbackGeneKeys(contact, geneKeys) {
  var prenom = (contact && contact.prenom) || 'toi';
  return {
    titre: 'Tes Gene Keys — Profil Hologénétique',
    sous_titre: 'Le chemin d\'or : Ombre → Don → Siddhi',
    introduction:
      'Les Gene Keys de ' + prenom +
      ' — Human Design, Astrologie et Gene Keys réunis. Chaque porte suit Ombre → Don → Siddhi.',
    activation: {
      titre: 'Séquence d\'Activation — Qui tu es vraiment',
      introduction: '',
      spheres: fallbackSpheres(geneKeys.activation)
    },
    venus: {
      titre: 'Séquence Vénus — Comment tu aimes et guéris',
      introduction: '',
      spheres: fallbackSpheres(geneKeys.venus)
    },
    pearl: {
      titre: 'Séquence Pearl — Comment l\'abondance circule',
      introduction: '',
      spheres: fallbackSpheres(geneKeys.pearl),
      synthese_3_leviers: null
    },
    profil_calcule: {
      activation: geneKeys.activation || [],
      venus: geneKeys.venus || [],
      pearl: geneKeys.pearl || []
    }
  };
}

function mergeVenusBatches(a, b) {
  var venA = a || {};
  var venB = b || {};
  return {
    titre: venA.titre || venB.titre || 'Séquence Vénus — Comment tu aimes et guéris',
    introduction: venA.introduction || venB.introduction || '',
    spheres: [].concat(
      Array.isArray(venA.spheres) ? venA.spheres : [],
      Array.isArray(venB.spheres) ? venB.spheres : []
    ).filter(Boolean)
  };
}

async function generateGeneKeysBlock(contact, hd, astro, onProgress) {
  var geneKeys = buildGeneKeysProfile(hd);
  var prenom = contact.prenom || 'toi';
  var langRule = language.promptInstruction(language.ofContact(contact));
  var gkStr = geneKeys.summaryText || '';
  var qualityRule =
    'QUALITÉ ULTIME : chaque « texte » de sphère = contemplation riche (380–420 mots), même densité que les chapitres — Ombre→Don→Siddhi incarné, 1 question, 1 micro-geste.';
  var ctx =
    'Tu es un maître Gene Keys (Richard Rudd). Tu rédiges pour ' + prenom + '.\n' +
    'RÈGLES : Tutoiement, français incarné, JSON brut strict. N\'invente AUCUN numéro de Gene Key.\n' +
    'Nomme explicitement « Gene Keys ». Chaque sphère : Ombre → Don → Siddhi.\n' +
    qualityRule + '\n' +
    langRule + '\n\nPROFIL GENE KEYS CALCULÉ :\n' + gkStr;

  function api(prompt, maxTok, label) {
    return natal.claudeJsonApi(prompt, maxTok || 16000, label, { model: natal.claudeModel() });
  }

  var gkAct = geneKeys.activation || [];
  var gkVen = geneKeys.venus || [];
  var gkPea = geneKeys.pearl || [];

  if (onProgress) onProgress('Gene Keys — Séquence d\'Activation…', 72);

  var results;
  try {
    results = await Promise.all([
      api(ctx + `

PROFIL — ACTIVATION :
${gkAct.map(gkSpherePrompt).join('\n')}

Génère uniquement :
{
  "gene_keys": {
    "titre": "Tes Gene Keys — Profil Hologénétique",
    "sous_titre": "Le chemin d'or : Ombre → Don → Siddhi",
    "introduction": "160–200 mots. Présente Gene Keys à ${prenom} : 64 clés, Ombre/Don/Siddhi, 3 séquences. Lien HD.",
    "activation": {
      "titre": "Séquence d'Activation — Qui tu es vraiment",
      "introduction": "100–130 mots.",
      "spheres": [
        {"id":"lifes_work","nom":"Oeuvre de Vie","gene_key":"${(gkAct[0] && gkAct[0].label) || '—'}","nom_cle":"${(gkAct[0] && gkAct[0].key && gkAct[0].key.nom) || '—'}","ombre":"${(gkAct[0] && gkAct[0].key && gkAct[0].key.ombre) || '—'}","don":"${(gkAct[0] && gkAct[0].key && gkAct[0].key.don) || '—'}","siddhi":"${(gkAct[0] && gkAct[0].key && gkAct[0].key.siddhi) || '—'}","texte":"380–420 mots. Contemplation riche Ombre→Don→Siddhi + 1 question + 1 micro-geste."},
        {"id":"evolution","nom":"Évolution","gene_key":"${(gkAct[1] && gkAct[1].label) || '—'}","nom_cle":"${(gkAct[1] && gkAct[1].key && gkAct[1].key.nom) || '—'}","ombre":"${(gkAct[1] && gkAct[1].key && gkAct[1].key.ombre) || '—'}","don":"${(gkAct[1] && gkAct[1].key && gkAct[1].key.don) || '—'}","siddhi":"${(gkAct[1] && gkAct[1].key && gkAct[1].key.siddhi) || '—'}","texte":"380–420 mots. Même structure."},
        {"id":"radiance","nom":"Radiance","gene_key":"${(gkAct[2] && gkAct[2].label) || '—'}","nom_cle":"${(gkAct[2] && gkAct[2].key && gkAct[2].key.nom) || '—'}","ombre":"${(gkAct[2] && gkAct[2].key && gkAct[2].key.ombre) || '—'}","don":"${(gkAct[2] && gkAct[2].key && gkAct[2].key.don) || '—'}","siddhi":"${(gkAct[2] && gkAct[2].key && gkAct[2].key.siddhi) || '—'}","texte":"380–420 mots. Même structure."},
        {"id":"purpose","nom":"Purpose","gene_key":"${(gkAct[3] && gkAct[3].label) || '—'}","nom_cle":"${(gkAct[3] && gkAct[3].key && gkAct[3].key.nom) || '—'}","ombre":"${(gkAct[3] && gkAct[3].key && gkAct[3].key.ombre) || '—'}","don":"${(gkAct[3] && gkAct[3].key && gkAct[3].key.don) || '—'}","siddhi":"${(gkAct[3] && gkAct[3].key && gkAct[3].key.siddhi) || '—'}","texte":"380–420 mots. Même structure."}
      ]
    }
  }
}`, 16000, 'GK-Activation'),

      api(ctx + `

PROFIL — VÉNUS lot 1/2 (Attraction + IQ + EQ uniquement) :
${[gkVen[0], gkVen[1], gkVen[2]].map(gkSpherePrompt).join('\n')}

Génère uniquement :
{
  "gene_keys_venus": {
    "titre": "Séquence Vénus — Comment tu aimes et guéris",
    "introduction": "140–180 mots. Venus Sequence Gene Keys.",
    "spheres": [
      {"id":"attraction","nom":"Attraction","gene_key":"${(gkVen[0] && gkVen[0].label) || '—'}","nom_cle":"${(gkVen[0] && gkVen[0].key && gkVen[0].key.nom) || '—'}","ombre":"${(gkVen[0] && gkVen[0].key && gkVen[0].key.ombre) || '—'}","don":"${(gkVen[0] && gkVen[0].key && gkVen[0].key.don) || '—'}","siddhi":"${(gkVen[0] && gkVen[0].key && gkVen[0].key.siddhi) || '—'}","texte":"380–420 mots. Contemplation riche Ombre→Don→Siddhi + question + geste."},
      {"id":"iq","nom":"QI (IQ)","gene_key":"${(gkVen[1] && gkVen[1].label) || '—'}","nom_cle":"${(gkVen[1] && gkVen[1].key && gkVen[1].key.nom) || '—'}","ombre":"${(gkVen[1] && gkVen[1].key && gkVen[1].key.ombre) || '—'}","don":"${(gkVen[1] && gkVen[1].key && gkVen[1].key.don) || '—'}","siddhi":"${(gkVen[1] && gkVen[1].key && gkVen[1].key.siddhi) || '—'}","texte":"380–420 mots."},
      {"id":"eq","nom":"QE (EQ)","gene_key":"${(gkVen[2] && gkVen[2].label) || '—'}","nom_cle":"${(gkVen[2] && gkVen[2].key && gkVen[2].key.nom) || '—'}","ombre":"${(gkVen[2] && gkVen[2].key && gkVen[2].key.ombre) || '—'}","don":"${(gkVen[2] && gkVen[2].key && gkVen[2].key.don) || '—'}","siddhi":"${(gkVen[2] && gkVen[2].key && gkVen[2].key.siddhi) || '—'}","texte":"380–420 mots."}
    ]
  }
}`, 16000, 'GK-Venus-A'),

      api(ctx + `

PROFIL — VÉNUS lot 2/2 (SQ + Core uniquement, PAS d'introduction) :
${[gkVen[3], gkVen[4]].map(gkSpherePrompt).join('\n')}

Génère uniquement :
{
  "gene_keys_venus": {
    "titre": "Séquence Vénus — Comment tu aimes et guéris",
    "spheres": [
      {"id":"sq","nom":"QS (SQ)","gene_key":"${(gkVen[3] && gkVen[3].label) || '—'}","nom_cle":"${(gkVen[3] && gkVen[3].key && gkVen[3].key.nom) || '—'}","ombre":"${(gkVen[3] && gkVen[3].key && gkVen[3].key.ombre) || '—'}","don":"${(gkVen[3] && gkVen[3].key && gkVen[3].key.don) || '—'}","siddhi":"${(gkVen[3] && gkVen[3].key && gkVen[3].key.siddhi) || '—'}","texte":"380–420 mots."},
      {"id":"core","nom":"Blessure Noyau","gene_key":"${(gkVen[4] && gkVen[4].label) || '—'}","nom_cle":"${(gkVen[4] && gkVen[4].key && gkVen[4].key.nom) || '—'}","ombre":"${(gkVen[4] && gkVen[4].key && gkVen[4].key.ombre) || '—'}","don":"${(gkVen[4] && gkVen[4].key && gkVen[4].key.don) || '—'}","siddhi":"${(gkVen[4] && gkVen[4].key && gkVen[4].key.siddhi) || '—'}","texte":"380–420 mots."}
    ]
  }
}`, 12000, 'GK-Venus-B'),

      api(ctx + `

PROFIL — PEARL :
${gkPea.map(gkSpherePrompt).join('\n')}

Génère uniquement :
{
  "gene_keys_pearl": {
    "titre": "Séquence Pearl — Comment l'abondance circule",
    "introduction": "120–150 mots. Pearl Sequence Gene Keys.",
    "spheres": [
      {"id":"vocation","nom":"Vocation","gene_key":"${(gkPea[0] && gkPea[0].label) || '—'}","nom_cle":"${(gkPea[0] && gkPea[0].key && gkPea[0].key.nom) || '—'}","ombre":"${(gkPea[0] && gkPea[0].key && gkPea[0].key.ombre) || '—'}","don":"${(gkPea[0] && gkPea[0].key && gkPea[0].key.don) || '—'}","siddhi":"${(gkPea[0] && gkPea[0].key && gkPea[0].key.siddhi) || '—'}","texte":"380–420 mots."},
      {"id":"culture","nom":"Culture","gene_key":"${(gkPea[1] && gkPea[1].label) || '—'}","nom_cle":"${(gkPea[1] && gkPea[1].key && gkPea[1].key.nom) || '—'}","ombre":"${(gkPea[1] && gkPea[1].key && gkPea[1].key.ombre) || '—'}","don":"${(gkPea[1] && gkPea[1].key && gkPea[1].key.don) || '—'}","siddhi":"${(gkPea[1] && gkPea[1].key && gkPea[1].key.siddhi) || '—'}","texte":"380–420 mots."},
      {"id":"pearl","nom":"Perle","gene_key":"${(gkPea[2] && gkPea[2].label) || '—'}","nom_cle":"${(gkPea[2] && gkPea[2].key && gkPea[2].key.nom) || '—'}","ombre":"${(gkPea[2] && gkPea[2].key && gkPea[2].key.ombre) || '—'}","don":"${(gkPea[2] && gkPea[2].key && gkPea[2].key.don) || '—'}","siddhi":"${(gkPea[2] && gkPea[2].key && gkPea[2].key.siddhi) || '—'}","texte":"380–420 mots."},
      {"id":"brand","nom":"Brand","gene_key":"${(gkPea[3] && gkPea[3].label) || '—'}","nom_cle":"${(gkPea[3] && gkPea[3].key && gkPea[3].key.nom) || '—'}","ombre":"${(gkPea[3] && gkPea[3].key && gkPea[3].key.ombre) || '—'}","don":"${(gkPea[3] && gkPea[3].key && gkPea[3].key.don) || '—'}","siddhi":"${(gkPea[3] && gkPea[3].key && gkPea[3].key.siddhi) || '—'}","texte":"380–420 mots. Boucle avec l'Oeuvre de Vie."}
    ],
    "synthese_3_leviers": {
      "annee": "45 mots. Gene Key d'Oeuvre ${(gkAct[0] && gkAct[0].label) || '—'} cette année.",
      "amour": "45 mots. Clé Attraction/Core à désamorcer.",
      "abondance": "45 mots. Clé Pearl ${(gkPea[2] && gkPea[2].label) || '—'}."
    }
  }
}`, 16000, 'GK-Pearl')
    ]);
  } catch (e) {
    console.warn('[claude-ultime] Gene Keys Claude failed, fallback:', e && e.message);
    return fallbackGeneKeys(contact, geneKeys);
  }

  var fromQ = (results[0] && results[0].gene_keys) || {};
  var fromR = mergeVenusBatches(
    results[1] && results[1].gene_keys_venus,
    results[2] && results[2].gene_keys_venus
  );
  var fromS = (results[3] && results[3].gene_keys_pearl) || {};

  return {
    titre: fromQ.titre || 'Tes Gene Keys — Profil Hologénétique',
    sous_titre: fromQ.sous_titre || 'Le chemin d\'or : Ombre → Don → Siddhi',
    introduction: fromQ.introduction || '',
    activation: fromQ.activation || { titre: 'Séquence d\'Activation', spheres: fallbackSpheres(gkAct) },
    venus: fromR.spheres && fromR.spheres.length
      ? fromR
      : { titre: 'Séquence Vénus', spheres: fallbackSpheres(gkVen) },
    pearl: fromS.titre ? fromS : { titre: 'Séquence Pearl', spheres: fallbackSpheres(gkPea) },
    profil_calcule: {
      activation: geneKeys.activation,
      venus: geneKeys.venus,
      pearl: geneKeys.pearl
    }
  };
}

function a(astro, key) {
  return (astro && astro[key]) || '—';
}

function genderBits(contact) {
  var g = String((contact && (contact.gender || contact.genre)) || '').toLowerCase();
  var isFemme = g === 'femme' || g === 'f' || g === 'female';
  return {
    isFemme: isFemme,
    il: isFemme ? 'elle' : 'il',
    ne: isFemme ? 'née' : 'né',
    venu: isFemme ? 'venue' : 'venu'
  };
}

function buildUltimeCtx(contact, hd, astro, geneKeys) {
  var client = natal.buildClient(contact);
  var bits = genderBits(contact);
  var langRule = language.promptInstruction(language.ofContact(contact));
  var astroStr = astro
    ? Object.keys(astro).filter(function (k) {
        return astro[k] && k !== '_lons' && k !== '_meta' && k !== 'AstroCarto' && typeof astro[k] !== 'object';
      }).map(function (k) { return k + ': ' + astro[k]; }).join(', ')
    : 'Non disponible';
  var hdStr =
    'Type: ' + (hd.type || '') +
    '\nProfil: ' + (hd.profile || '') +
    '\nAutorité: ' + (hd.authority || '') +
    '\nStratégie: ' + (hd.strategy || '') +
    '\nDéfinition: ' + (hd.definition || '') +
    '\nCroix: ' + (hd.cross || '') +
    '\nSignature: ' + (hd.signature || '') +
    '\nNot-Self: ' + (hd.notSelf || '') +
    '\nCanaux: ' + ((hd.channels || []).join(', ')) +
    '\nPortes: ' + ((hd.gates || []).join(', '));
  var gkStr = (geneKeys && geneKeys.summaryText) || '(profil Gene Keys indisponible)';
  var ctx =
    'Tu es un expert en Astrologie, Human Design et Gene Keys (Richard Rudd). Tu rédiges une partie du Manuscrit Céleste Ultime de ' +
    client.prenom + (client.nom ? ' ' + client.nom : '') + '.\n' +
    'DONNÉES RÉELLES (ne pas recalculer) :\n=== HUMAN DESIGN ===\n' + hdStr +
    '\n=== GENE KEYS (profil hologénétique calculé) ===\n' + gkStr +
    '\n=== ASTROLOGIE ===\n' + astroStr +
    '\nPrénom: ' + client.prenom + ' | Genre: ' + (bits.isFemme ? 'Féminin' : 'Masculin') +
    ' | Date: ' + client.naissance + (client.heure ? ' à ' + client.heure : '') +
    ' | Lieu: ' + client.lieu + '\n' +
    "RÈGLES ABSOLUES : Utilise les pronoms selon le genre. N'invente aucun signe. 1200 mots minimum par section. " +
    'Style poétique et profond, tutoiement. JSON BRUT STRICT. INTERDIT : calculs, raisonnements, corrections dans le texte.\n' +
    langRule;
  return { ctx: ctx, client: client, bits: bits };
}

function uApi(prompt, maxTok, label) {
  return natal.claudeJsonApi(prompt, maxTok || 12000, label, { model: natal.claudeModel() });
}

/**
 * Corps Ultime GENERATIONS : sections I–XXIII + affirmations/rituels/conclusion + synthèse.
 */
async function generateUltimeBody(contact, hd, astro, geneKeys, onProgress) {
  var meta = buildUltimeCtx(contact, hd, astro, geneKeys);
  var ctx = meta.ctx;
  var prenom = meta.client.prenom;
  var il = meta.bits.il;
  var ne = meta.bits.ne;
  var venu = meta.bits.venu;
  var channels = (hd.channels || []).join(', ') || '—';
  var gates = (hd.gates || []).join(', ') || '—';
  var lieu = meta.client.lieu || '';
  var naissance = meta.client.naissance || '';

  if (onProgress) onProgress('Manuscrit Ultime — fondations cosmiques (I–VII)…', 40);
  var wave1 = await Promise.all([
    uApi(ctx + '\nGénère uniquement :\n{\n  "placements_confirmes": {\n    "soleil": "' + a(astro, 'Sun') + '","lune": "' + a(astro, 'Moon') + '",\n    "ascendant": "' + a(astro, 'Ascendant') + '","mc": "' + a(astro, 'MC') + '",\n    "mercure": "' + a(astro, 'Mercury') + '","venus": "' + a(astro, 'Venus') + '",\n    "mars": "' + a(astro, 'Mars') + '","jupiter": "' + a(astro, 'Jupiter') + '",\n    "saturne": "' + a(astro, 'Saturn') + '","uranus": "' + a(astro, 'Uranus') + '",\n    "neptune": "' + a(astro, 'Neptune') + '","pluton": "' + a(astro, 'Pluto') + '",\n    "noeud_nord": "' + a(astro, 'NorthNode') + '","chiron": "' + a(astro, 'Chiron') + '",\n    "lilith": "' + a(astro, 'Lilith') + '","noeud_sud": "' + a(astro, 'SouthNode') + '"\n  },\n  "intro": "400 mots min. Ouverture poétique à ' + prenom + '. Lieu ' + lieu + ', date ' + naissance + '. Type HD ' + (hd.type || '') + ', Soleil ' + a(astro, 'Sun') + '.",\n  "sections": [\n    {"numero":"I","titre":"Ton Code Cosmique","sous_titre":"La mécanique énergétique unique qui te définit","contenu":"1200 mots min. Type \'' + (hd.type || '') + '\', Profil \'' + (hd.profile || '') + '\', Stratégie \'' + (hd.strategy || '') + '\', Autorité \'' + (hd.authority || '') + '\'. 5-6 paragraphes.\\n\\n","insight":"Phrase ≤12 mots."},\n    {"numero":"II","titre":"Ta Stratégie & Ton Autorité Intérieure","sous_titre":"Le guide intérieur qui ne ment jamais","contenu":"1200 mots min. Stratégie \'' + (hd.strategy || '') + '\', Autorité \'' + (hd.authority || '') + '\'. 5-6 paragraphes.\\n\\n","insight":"Phrase ≤12 mots."}\n  ]\n}', 12000, 'U-subA'),
    uApi(ctx + '\nGénère uniquement :\n{"sections":[\n{"numero":"III","titre":"Ton Ciel de Naissance","sous_titre":"Les trois lumières","contenu":"1200 mots min. Soleil ' + a(astro, 'Sun') + ', Lune ' + a(astro, 'Moon') + ', Ascendant ' + a(astro, 'Ascendant') + '. 5-6 paragraphes.\\n\\n","insight":"Phrase ≤12 mots."},\n{"numero":"IV","titre":"Ta Destinée & Ton Milieu du Ciel","sous_titre":"La trajectoire","contenu":"1200 mots min. MC ' + a(astro, 'MC') + ', Noeud Nord ' + a(astro, 'NorthNode') + ', Noeud Sud ' + a(astro, 'SouthNode') + '. 5-6 paragraphes.\\n\\n","insight":"Phrase ≤12 mots."},\n{"numero":"V","titre":"Mercure, Vénus & Mars","sous_titre":"Intelligence, amour, feu","contenu":"1200 mots min. Mercure ' + a(astro, 'Mercury') + ', Vénus ' + a(astro, 'Venus') + ', Mars ' + a(astro, 'Mars') + '. 5-6 paragraphes.\\n\\n","insight":"Phrase ≤12 mots."}\n]}', 12000, 'U-subB'),
    uApi(ctx + '\nGénère uniquement :\n{"sections":[\n{"numero":"VI","titre":"Jupiter & Saturne","sous_titre":"Chance et discipline","contenu":"1200 mots min. Jupiter ' + a(astro, 'Jupiter') + ', Saturne ' + a(astro, 'Saturn') + '. 5-6 paragraphes.\\n\\n","insight":"Phrase ≤12 mots."},\n{"numero":"VII","titre":"Uranus, Neptune & Pluton","sous_titre":"Forces transpersonnelles","contenu":"1200 mots min. Uranus ' + a(astro, 'Uranus') + ', Neptune ' + a(astro, 'Neptune') + ', Pluton ' + a(astro, 'Pluto') + '. 5-6 paragraphes.\\n\\n","insight":"Phrase ≤12 mots."}\n]}', 12000, 'U-subC')
  ]);

  if (onProgress) onProgress('Manuscrit Ultime — architecture HD & maisons (VIII–XIV)…', 52);
  var wave2 = await Promise.all([
    uApi(ctx + '\nGénère uniquement :\n{"sections_p2":[\n{"numero":"VIII","titre":"Tes Centres d\'Énergie","sous_titre":"Ce qui te nourrit et ce qui te vide","contenu":"1200 mots min. Centres + canaux (' + channels + '). 5-6 paragraphes.\\n\\n","insight":"Phrase ≤12 mots."},\n{"numero":"IX","titre":"Tes Portes & Canaux Sacrés","sous_titre":"Les fils d\'or","contenu":"1200 mots min. Portes (' + gates + '), canaux (' + channels + '). 5-6 paragraphes.\\n\\n","insight":"Phrase ≤12 mots."},\n{"numero":"X","titre":"La Synergie HD × Astrologie","sous_titre":"Quand les deux systèmes s\'amplifient","contenu":"1200 mots min. Convergences Soleil/Type/Ascendant/Autorité. 5-6 paragraphes.\\n\\n","insight":"Phrase ≤12 mots."}\n]}', 12000, 'U-subD'),
    uApi(ctx + '\nGénère uniquement :\n{"sections_p2":[\n{"numero":"XI","titre":"Tes Maisons I à IV","sous_titre":"Fondations","contenu":"1200 mots min. Maisons 1–4. Ascendant ' + a(astro, 'Ascendant') + '. 5-6 paragraphes.\\n\\n","insight":"Phrase ≤12 mots."},\n{"numero":"XII","titre":"Tes Maisons V à VIII","sous_titre":"Créativité et transformation","contenu":"1200 mots min. Maisons 5–8. Vénus ' + a(astro, 'Venus') + ', Pluton ' + a(astro, 'Pluto') + '. 5-6 paragraphes.\\n\\n","insight":"Phrase ≤12 mots."}\n]}', 12000, 'U-subE'),
    uApi(ctx + '\nGénère uniquement :\n{"sections_p2":[\n{"numero":"XIII","titre":"Tes Maisons IX à XII","sous_titre":"Vocation et inconscient","contenu":"1200 mots min. Maisons 9–12. MC ' + a(astro, 'MC') + ', Jupiter ' + a(astro, 'Jupiter') + '. 5-6 paragraphes.\\n\\n","insight":"Phrase ≤12 mots."},\n{"numero":"XIV","titre":"Tes Aspects Planétaires Majeurs","sous_titre":"Dialogues planétaires","contenu":"1200 mots min. Aspects : ' + a(astro, 'AspectsClés') + '. 5-6 paragraphes.\\n\\n","insight":"Phrase ≤12 mots."}\n]}', 12000, 'U-subF')
  ]);

  if (onProgress) onProgress('Manuscrit Ultime — mission & vocation (XV–XXIII)…', 62);
  var wave3 = await Promise.all([
    uApi(ctx + '\nGénère uniquement :\n{"sections_p3":[\n{"numero":"XV","titre":"Chiron — Ta Blessure & Ta Guérison","sous_titre":"Le Guérisseur Blessé","contenu":"1200 mots min. Chiron ' + a(astro, 'Chiron') + '. 5-6 paragraphes.\\n\\n","insight":"Phrase ≤12 mots."},\n{"numero":"XVI","titre":"Lilith — Ton Pouvoir Sauvage","sous_titre":"Force authentique","contenu":"1200 mots min. Lilith ' + a(astro, 'Lilith') + '. 5-6 paragraphes.\\n\\n","insight":"Phrase ≤12 mots."},\n{"numero":"XVII","titre":"Ton Noeud Sud — Tes Dons Karmiques","sous_titre":"Trésors de l\'âme","contenu":"1200 mots min. Noeud Sud ' + a(astro, 'SouthNode') + '. 5-6 paragraphes.\\n\\n","insight":"Phrase ≤12 mots."}\n]}', 12000, 'U-subG'),
    uApi(ctx + '\nGénère uniquement :\n{"sections_p3":[\n{"numero":"XVIII","titre":"Ta Mission & Ta Croix d\'Incarnation","sous_titre":"Pourquoi tu es ' + ne + '","contenu":"1200 mots min. Croix \'' + (hd.cross || '') + '\'. TERMINE par un pont Gene Keys Activation (Oeuvre de Vie, Évolution, Radiance, Purpose). Nomme « Gene Keys ». 5-6 paragraphes.\\n\\n","insight":"Phrase ≤12 mots."},\n{"numero":"XIX","titre":"L\'Amour selon Ton Thème","sous_titre":"Aimer selon ta nature","contenu":"1200 mots min. Vénus ' + a(astro, 'Venus') + ', Mars ' + a(astro, 'Mars') + ', Lune ' + a(astro, 'Moon') + ', Type \'' + (hd.type || '') + '\'. 5-6 paragraphes.\\n\\n","insight":"Phrase ≤12 mots."},\n{"numero":"XX","titre":"Ta Vocation & Tes Dons Supérieurs","sous_titre":"Le service que tu es ' + venu + ' offrir","contenu":"1200 mots min. Synthèse dons, MC, Type, Profil. 5-6 paragraphes.\\n\\n","insight":"Phrase ≤12 mots."}\n]}', 12000, 'U-subH'),
    uApi(ctx + '\nGénère uniquement :\n{"sections_p6":[\n{"numero":"XXI","titre":"Ton Portrait Élémentaire","sous_titre":"Le langage des éléments","contenu":"1200 mots min. Éléments ' + a(astro, 'Elements') + ', qualités ' + a(astro, 'Qualites') + '. 5-6 paragraphes.\\n\\n","insight":"Phrase ≤12 mots."},\n{"numero":"XXII","titre":"Tes Aspects Planétaires en Profondeur","sous_titre":"Dialogues célestes","contenu":"1200 mots min. Aspects ' + a(astro, 'AspectsClés') + '. 5-6 paragraphes.\\n\\n","insight":"Phrase ≤12 mots."},\n{"numero":"XXIII","titre":"Ta Phase Lunaire de Naissance","sous_titre":"Le cycle qui code ta façon d\'avancer","contenu":"1200 mots min. Phase \'' + a(astro, 'PhaseLunaire') + '\', Lune ' + a(astro, 'Moon') + '. ' + il + ' est ' + ne + ' sous cette phase. 5-6 paragraphes.\\n\\n","insight":"Phrase ≤12 mots."}\n]}', 12000, 'U-subP')
  ]);

  if (onProgress) onProgress('Manuscrit Ultime — affirmations, rituels, synthèse…', 68);
  var wave4 = await Promise.all([
    uApi(ctx + '\nGénère uniquement :\n{\n  "affirmations": ["Affirmation 1 pour ' + prenom + ' (Type ' + (hd.type || '') + ', Soleil ' + a(astro, 'Sun') + ')","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20"],\n  "rituels": [\n    {"nom":"Rituel 1 — Type ' + (hd.type || '') + '","timing":"Quotidien","description":"300 mots. Autorité \'' + (hd.authority || '') + '\'."},\n    {"nom":"Rituel 2 — Lune ' + a(astro, 'Moon') + '","timing":"Cycle lunaire","description":"300 mots."},\n    {"nom":"Rituel 3 — Croix ' + (hd.cross || '') + '","timing":"Hebdomadaire","description":"300 mots."},\n    {"nom":"Rituel 4 — retour au Soi","timing":"Quand Not-Self s\'active","description":"300 mots. Not-Self \'' + (hd.notSelf || '') + '\'."},\n    {"nom":"Rituel 5 — abondance","timing":"Mensuel","description":"300 mots. Jupiter ' + a(astro, 'Jupiter') + '."}\n  ],\n  "conclusion": "500 mots min. Lettre intime à ' + prenom + '. Lieu, date, Type, Soleil, Croix. Émouvante."\n}', 12000, 'U-subI'),
    uApi(ctx + '\nMISSION : SYNTHÈSE EXÉCUTIVE Ultime (HD + ciel + Gene Keys). Style "tu".\nRetourne UNIQUEMENT :\n{\n  "synthese": {\n    "essence": "30–45 mots. Commence par \'' + prenom + ', tu es...\'",\n    "forces": ["Force 1 (18–28 mots)","Force 2","Force 3"],\n    "chemin_croissance": "40–55 mots",\n    "strategie_hd": "30–40 mots",\n    "gene_key_ancre": "25–40 mots. Nomme Gene Keys et le Don d\'Oeuvre de Vie.",\n    "mantra": "8–14 mots, 1re personne"\n  }\n}', 2400, 'U-synth')
  ]);

  var rA = wave1[0] || {};
  var rB = wave1[1] || {};
  var rC = wave1[2] || {};
  var rD = wave2[0] || {};
  var rE = wave2[1] || {};
  var rF = wave2[2] || {};
  var rG = wave3[0] || {};
  var rH = wave3[1] || {};
  var rP = wave3[2] || {};
  var rI = wave4[0] || {};
  var rSynth = wave4[1] || {};

  var sections = []
    .concat(rA.sections || [])
    .concat(rB.sections || [])
    .concat(rC.sections || [])
    .concat(rD.sections_p2 || [])
    .concat(rE.sections_p2 || [])
    .concat(rF.sections_p2 || [])
    .concat(rG.sections_p3 || [])
    .concat(rH.sections_p3 || [])
    .concat(rP.sections_p6 || []);

  return natal.normalizeManuscrit(natal.enrichPlacementsFromAstro({
    placements_confirmes: rA.placements_confirmes,
    intro: rA.intro,
    sections: sections,
    affirmations: rI.affirmations || [],
    rituels: rI.rituels || [],
    conclusion: rI.conclusion || '',
    synthese: rSynth.synthese || null
  }, astro));
}

/**
 * Ultime APP = corps GENERATIONS (I–XXIII) + Gene Keys hologénétique.
 */
async function generateUltimeManuscrit(contact, hd, astro, onProgress) {
  var geneKeys = buildGeneKeysProfile(hd);
  if (onProgress) onProgress('Rédaction du Manuscrit Ultime (édition complète)…', 38);
  var manuscrit = await generateUltimeBody(contact, hd, astro, geneKeys, onProgress);

  if (onProgress) onProgress('Gene Keys — profil hologénétique…', 72);
  var geneKeysBlock = await generateGeneKeysBlock(contact, hd, astro, onProgress);
  manuscrit.gene_keys = geneKeysBlock;

  if (manuscrit.intro && typeof manuscrit.intro === 'string') {
    if (!/Gene Keys/i.test(manuscrit.intro)) {
      manuscrit.intro +=
        '\n\nCe Manuscrit Ultime croise Human Design, Astrologie et Gene Keys — ' +
        'pour aller de la mécanique de ton énergie jusqu\'au chemin Ombre → Don → Siddhi.';
    }
  }

  return manuscrit;
}

module.exports = {
  generateUltimeManuscrit,
  generateGeneKeysBlock,
  fallbackGeneKeys,
  generateUltimeBody
};
