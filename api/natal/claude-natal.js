/**
 * Rédaction Manuscrit Céleste 28 pages — port des prompts GENERATIONS
 * (manuscrit-celeste-generation.html → callClaude ; langue via contact.language).
 * Clé : process.env.CLAUDE_KEY || ANTHROPIC_API_KEY — jamais exposée au client.
 */
const { requestJson, sleep } = require('./http');
const { parseClaudeJsonRaw } = require('./json-fix');
const language = require('../language');

function claudeKey() {
  return String(process.env.CLAUDE_KEY || process.env.ANTHROPIC_API_KEY || '').trim();
}

function claudeModel() {
  return String(process.env.CLAUDE_MODEL || 'claude-sonnet-5').trim();
}

async function claudeJsonApi(prompt, maxTok, label, opts) {
  opts = opts || {};
  var key = claudeKey();
  if (!key) throw new Error('CLAUDE_KEY / ANTHROPIC_API_KEY manquant côté serveur.');
  var attempt = 0;
  var maxAttempts = opts.max_attempts != null ? opts.max_attempts : 6;
  /* Ultime Gene Keys : jusqu’à 16k (contemplations 380–420 mots/sphère) — aligné GENERATIONS */
  var tokLimit = Math.min(16000, Math.max(500, maxTok || 5500));
  var timeoutMs = opts.timeout_ms != null ? opts.timeout_ms : 180000;
  var model = opts.model || claudeModel();
  var jsonRetryHint =
    'JSON strict valide uniquement. Clés entre guillemets ASCII doubles. ' +
    'Échapper UNIQUEMENT les guillemets doubles dans le texte (\\"). ' +
    'Paragraphes = \\n\\n. Aucune virgule finale. Aucun texte hors JSON. Réponse complète non tronquée.';

  while (attempt < maxAttempts) {
    attempt++;
    var userPrompt = prompt;
    if (attempt > 1) userPrompt += '\n\nIMPORTANT (tentative ' + attempt + ') : ' + jsonRetryHint;
    try {
      var data = await requestJson('https://api.anthropic.com/v1/messages', {
        label: 'Claude API' + (label ? ' [' + label + ']' : ''),
        retries: 2,
        timeout_ms: timeoutMs,
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
            max_tokens: tokLimit,
            output_config: { effort: opts.effort || 'low' },
            messages: [{ role: 'user', content: userPrompt + (attempt === 1 ? '\n\nAnswer directly with JSON only. No deliberation.' : '') }]
          })
        }
      });
      // Sonnet 5 : thinking adaptatif — content[0] peut être thinking sans .text
      var blocks = (data && data.content) || [];
      var textParts = [];
      for (var bi = 0; bi < blocks.length; bi++) {
        var blk = blocks[bi];
        if (blk && blk.type === 'text' && blk.text) textParts.push(blk.text);
        else if (blk && !blk.type && blk.text) textParts.push(blk.text);
      }
      var raw = textParts.join('\n').trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      if (!raw) {
        var types = blocks.map(function (b) { return b && b.type; }).join(',') || '(empty)';
        throw new Error('Reponse vide [' + (label || '?') + '] stop=' + data.stop_reason + ' blocks=[' + types + ']');
      }
      if (data.stop_reason === 'max_tokens') {
        throw new Error('Reponse tronquee [' + (label || '?') + '] — ' + raw.length + ' chars / ' + tokLimit + ' tokens');
      }
      return parseClaudeJsonRaw(raw, label);
    } catch (e) {
      if (attempt >= maxAttempts) throw e;
      await sleep(Math.min(8000, 1500 * attempt));
    }
  }
  throw new Error('Claude JSON [' + (label || '?') + '] — échec après ' + maxAttempts + ' tentatives');
}

function resolveInsight(sec) {
  if (!sec) return '';
  var v = sec.insight;
  if (v == null || !String(v).trim()) {
    v = sec.encadre || sec.revelation || sec.key_insight || sec.citation || '';
  }
  return String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
}

function pickManuscriptString(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v);
  return '';
}

function conclusionHasContent(str) {
  str = String(str || '').replace(/\s+/g, ' ').trim();
  return str.length > 40;
}

function resolveConclusionText(m) {
  if (!m) return '';
  var direct = pickManuscriptString(m.conclusion);
  if (direct && conclusionHasContent(direct)) return direct;
  var c = m.conclusion;
  if (c && typeof c === 'object') {
    var nested = ['lettre', 'lettre_finale', 'texte', 'text', 'message', 'contenu', 'body'];
    for (var ni = 0; ni < nested.length; ni++) {
      var ns = pickManuscriptString(c[nested[ni]]);
      if (ns && conclusionHasContent(ns)) return ns;
    }
  }
  return '';
}

function enrichPlacementsFromAstro(manuscrit, astro) {
  var pl = Object.assign({}, manuscrit.placements_confirmes || {});
  if (astro) {
    if (!pl.soleil) pl.soleil = astro.Sun || pl.soleil;
    if (!pl.lune) pl.lune = astro.Moon || pl.lune;
    if (!pl.ascendant) pl.ascendant = astro.Ascendant || pl.ascendant;
    if (!pl.mc) pl.mc = astro.MC || pl.mc;
    if (!pl.mercure) pl.mercure = astro.Mercury || pl.mercure;
    if (!pl.venus) pl.venus = astro.Venus || pl.venus;
    if (!pl.mars) pl.mars = astro.Mars || pl.mars;
    if (!pl.jupiter) pl.jupiter = astro.Jupiter || pl.jupiter;
    if (!pl.saturne) pl.saturne = astro.Saturn || pl.saturne;
    if (!pl.noeud_nord) pl.noeud_nord = astro.NorthNode || pl.noeud_nord;
  }
  manuscrit.placements_confirmes = pl;
  return manuscrit;
}

function normalizeManuscrit(m) {
  if (!m) return m;
  if (m.sections) {
    m.sections.forEach(function (sec) {
      if (sec) sec.insight = resolveInsight(sec);
    });
  }
  m.conclusion = resolveConclusionText(m);
  return m;
}

function buildClient(contact) {
  var g = String(contact.gender || '').toLowerCase();
  if (g !== 'femme' && g !== 'homme') g = 'autre';
  return {
    prenom: contact.prenom || 'toi',
    nom: contact.nom || '',
    genre: g === 'femme' ? 'femme' : (g === 'homme' ? 'homme' : 'homme'),
    naissance: contact.birthDate || '',
    heure: contact.birthTime || '',
    lieu: contact.birthPlace || '',
    dateRaw: (contact.birthDate || '') + ' ' + (contact.birthTime || '12:00')
  };
}

/**
 * 8 appels Claude (7 parallèle + synthèse) — structure 11 chapitres + intro/rituels.
 */
async function generateManuscrit(contact, hd, astro, onProgress) {
  var client = buildClient(contact);
  var astroStr = astro
    ? Object.entries(astro)
      .filter(function (e) {
        return e[1] && e[0] !== '_lons' && e[0] !== '_meta' && e[0] !== 'AstroCarto' && typeof e[1] !== 'object';
      })
      .map(function (e) { return e[0] + ': ' + e[1]; })
      .join(', ')
    : 'Non disponible';
  var hdStr = [
    'Type: ' + hd.type,
    'Profil: ' + hd.profile,
    'Autorité: ' + hd.authority,
    'Stratégie: ' + hd.strategy,
    'Définition: ' + hd.definition,
    'Croix d\'Incarnation: ' + hd.cross,
    'Signature: ' + hd.signature,
    'Not-Self: ' + hd.notSelf,
    'Canaux: ' + (hd.channels || []).join(', '),
    'Portes: ' + (hd.gates || []).join(', ')
  ].join('\n');

  var isFemme = client.genre === 'femme';
  var il = isFemme ? 'elle' : 'il';
  var ne = isFemme ? 'née' : 'né';
  var fait = isFemme ? 'faite' : 'fait';
  var venu = isFemme ? 'venue' : 'venu';
  var langCode = language.ofContact(contact);
  var langRule = language.promptInstruction(langCode);

  var ctx =
    'Tu es un expert en Astrologie et Human Design. Tu rédiges une partie du Manuscrit Céleste de ' +
    client.prenom + (client.nom ? ' ' + client.nom : '') + '.\n' +
    'DONNÉES RÉELLES (NE PAS RECALCULER, NE PAS MODIFIER) :\n' +
    '=== HUMAN DESIGN ===\n' + hdStr + '\n' +
    '=== ASTROLOGIE ===\n' + astroStr + '\n' +
    '=== DONNÉES CIVILES ===\n' +
    'Prénom: ' + client.prenom + ' | Genre: ' + (isFemme ? 'Féminin' : 'Masculin') +
    ' | Date: ' + client.naissance + (client.heure ? ' à ' + client.heure : '') +
    ' | Lieu: ' + client.lieu + '\n' +
    'RÈGLES ABSOLUES : Utilise EXACTEMENT les données fournies. N\'utilise JAMAIS les Portes/Canaux HD pour déduire un signe astrologique. ' +
    'GENRE : ' + client.prenom + ' est ' + (isFemme
      ? 'une femme — "elle","née","faite","venue", accords féminin partout'
      : 'un homme — "il","né","fait","venu", accords masculin partout') +
    '. JSON BRUT STRICT (aucun markdown, aucun backtick).\n' +
    langRule;

  function api(prompt, maxTok, label) {
    return claudeJsonApi(prompt, maxTok || 5500, label);
  }

  var doneCount = 0;
  var totalParts = 8;
  var labels = ['Prologue', 'Chapitres I–II', 'III–IV', 'V–VII', 'VIII–IX', 'X–XI', 'Rituels', 'Sceau final'];
  function onPartDone(idx) {
    doneCount++;
    if (onProgress) {
      onProgress(
        'Traduction du langage de l’univers : ' + doneCount + '/' + totalParts + ' — ' + labels[idx],
        Math.min(90, 45 + Math.floor((doneCount / totalParts) * 40))
      );
    }
  }

  var ch = (hd.channels || []).join(', ') || '—';

  if (onProgress) onProgress('Les sphères s’ouvrent — assemblage des chapitres de ta vie…', 48);

  var pA = api(ctx + `
Génère uniquement :
{
  "placements_confirmes": {
    "soleil": "${(astro && astro.Sun) || '—'}",
    "lune": "${(astro && astro.Moon) || '—'}",
    "ascendant": "${(astro && astro.Ascendant) || '—'}",
    "mc": "${(astro && astro.MC) || '—'}",
    "mercure": "${(astro && astro.Mercury) || '—'}",
    "venus": "${(astro && astro.Venus) || '—'}",
    "mars": "${(astro && astro.Mars) || '—'}",
    "jupiter": "${(astro && astro.Jupiter) || '—'}",
    "saturne": "${(astro && astro.Saturn) || '—'}",
    "uranus": "${(astro && astro.Uranus) || '—'}",
    "neptune": "${(astro && astro.Neptune) || '—'}",
    "pluton": "${(astro && astro.Pluto) || '—'}",
    "noeud_nord": "${(astro && astro.NorthNode) || '—'}"
  },
  "intro": "300 mots min. Ouverture poétique adressée à ${client.prenom}. Évoque '${client.lieu}', la date '${client.naissance}', la saison. Mentionne le Type HD '${hd.type}' et le Soleil en ${(astro && astro.Sun) || '—'}. Style lyrique, 3 paragraphes séparés par \\n\\n."
}`, 2200, 'Intro').then(function (r) { onPartDone(0); return r; });

  var pB = api(ctx + `
Génère uniquement ces 2 sections :
{"sections": [
  {
    "numero": "I",
    "titre": "Ton Code Cosmique",
    "sous_titre": "sous-titre poétique sur la mécanique énergétique unique de ${client.prenom}",
    "contenu": "380 mots min. Présente le Type HD '${hd.type}' de ${client.prenom} : ce que ça signifie concrètement au quotidien, comment ${il} est conçu pour interagir avec le monde. Puis le Profil '${hd.profile}' : son rôle de vie, sa façon d'apprendre et d'influencer les autres. Enfin la Stratégie '${hd.strategy}' et l'Autorité '${hd.authority}' : comment ${il} est ${fait} pour prendre ses décisions et reconnaître les bonnes opportunités. Des exemples de vie concrets pour chaque élément. Style 'tu', chaleureux, 4 paragraphes séparés par \\n\\n.",
    "insight": "Phrase puissante ≤12 mots sur le Type et le Profil de ${client.prenom}."
  },
  {
    "numero": "II",
    "titre": "Ton Ciel de Naissance",
    "sous_titre": "sous-titre poétique liant Soleil ${(astro && astro.Sun) || '—'}, Lune ${(astro && astro.Moon) || '—'} et Ascendant ${(astro && astro.Ascendant) || '—'}",
    "contenu": "420 mots min. Trois lumières de naissance de ${client.prenom}. 1) Le Soleil en ${(astro && astro.Sun) || '—'} — INTERDIT d'utiliser un autre signe solaire — son identité profonde, ses forces, ce qui l'anime. 2) La Lune en ${(astro && astro.Moon) || '—'} — INTERDIT d'utiliser un autre signe lunaire — ses besoins émotionnels, comment ${il} se ressource, son monde intérieur. 3) L'Ascendant en ${(astro && astro.Ascendant) || '—'} — INTERDIT d'utiliser un autre signe pour l'Ascendant — comment les autres le/la perçoivent, l'énergie qu'${il} projette. Termine par un paragraphe qui tisse les 3 en un portrait cohérent de ${client.prenom}. Style 'tu', poétique, 4-5 paragraphes séparés par \\n\\n.",
    "insight": "Phrase ≤12 mots mentionnant les 3 signes ${(astro && astro.Sun) || '—'}, ${(astro && astro.Moon) || '—'}, ${(astro && astro.Ascendant) || '—'}."
  }
]}`, 5000, 'Chapitres I-II').then(function (r) { onPartDone(1); return r; });

  var pC = api(ctx + `
Génère uniquement ces 2 sections :
{"sections": [
  {
    "numero": "III",
    "titre": "Tes Planètes en Action",
    "sous_titre": "sous-titre poétique sur les influences planétaires qui façonnent le quotidien de ${client.prenom}",
    "contenu": "400 mots min. Analyse planète par planète, toujours en utilisant UNIQUEMENT les signes fournis. Mercure en ${(astro && astro.Mercury) || '—'} : comment ${client.prenom} pense, communique, apprend. Vénus en ${(astro && astro.Venus) || '—'} : son rapport à l'amour, la beauté, l'argent. Mars en ${(astro && astro.Mars) || '—'} : son énergie, son désir, sa façon d'agir et de se battre. Jupiter en ${(astro && astro.Jupiter) || '—'} : sa zone de chance et d'expansion naturelle. Saturne en ${(astro && astro.Saturn) || '—'} : ses leçons karmiques, là où la discipline crée la maîtrise. Noeud Nord en ${(astro && astro.NorthNode) || '—'} : la direction vers laquelle la vie l'appelle. Style 'tu', concret et inspirant, 5-6 paragraphes courts séparés par \\n\\n.",
    "insight": "Phrase ≤12 mots sur la planète la plus significative pour ${client.prenom}."
  },
  {
    "numero": "IV",
    "titre": "Tes Centres d'Energie",
    "sous_titre": "sous-titre poétique sur ce qui nourrit et ce qui épuise ${client.prenom}",
    "contenu": "380 mots min. L'architecture énergétique unique de ${client.prenom} en Human Design. Commence par expliquer la différence fondamentale entre centres définis et indéfinis — pourquoi certaines choses lui donnent de l'énergie tandis que d'autres l'épuisent. Analyse ses canaux actifs : ${ch} — ce que chaque canal actif apporte concrètement comme don ou force dans sa vie. Nomme également les zones indéfinies comme des espaces de sagesse et de flexibilité, pas des manques. Pratique et révélateur. Style 'tu', 4 paragraphes séparés par \\n\\n.",
    "insight": "Phrase ≤12 mots sur l'architecture énergétique de ${client.prenom}."
  }
]}`, 5000, 'Chapitres III-IV').then(function (r) { onPartDone(2); return r; });

  var pD = api(ctx + `
Génère uniquement ces 3 sections :
{"sections": [
  {
    "numero": "V",
    "titre": "La Synergie de Ton Ame",
    "sous_titre": "sous-titre poétique sur la convergence entre Human Design et Astrologie",
    "contenu": "380 mots min. C'est le chapitre révélation — là où Human Design et Astrologie se confirment mutuellement. Identifie 3 points de convergence précis et frappants entre le thème astral de ${client.prenom} et son profil HD. Par exemple : comment son Soleil en ${(astro && astro.Sun) || '—'} résonne avec son Type '${hd.type}', comment son Ascendant en ${(astro && astro.Ascendant) || '—'} confirme son Autorité '${hd.authority}', comment ses planètes renforcent ses canaux actifs. Ces convergences révèlent un pattern de vie récurrent. Style 'tu', inspirant et étonnant, 3-4 paragraphes séparés par \\n\\n.",
    "insight": "Phrase ≤12 mots sur la convergence unique de ${client.prenom}."
  },
  {
    "numero": "VI",
    "titre": "Ta Mission de Vie",
    "sous_titre": "sous-titre poétique sur la raison d'être profonde de ${client.prenom}",
    "contenu": "380 mots min. La raison d'être profonde de ${client.prenom}. Commence par la Croix d'Incarnation '${hd.cross}' : ce qu'elle signifie, quel thème de vie elle porte, quelle contribution unique elle appelle. Enrichis avec le Noeud Nord en ${(astro && astro.NorthNode) || '—'} : la direction vers laquelle la vie pousse ${client.prenom}, ce qu'${il} est ${venu} expérimenter et développer dans cette vie. Termine sur une note d'encouragement : ses dons naturels (depuis Type, Profil, canaux) comme outils parfaits pour accomplir cette mission. Emouvant et ancré. Style 'tu', 4 paragraphes séparés par \\n\\n.",
    "insight": "Phrase ≤12 mots sur la mission de vie de ${client.prenom}."
  },
  {
    "numero": "VII",
    "titre": "Tes Défis & Ta Croissance",
    "sous_titre": "sous-titre poétique sur la transformation des zones d'ombre",
    "contenu": "350 mots min. Les zones de croissance de ${client.prenom}, traitées avec douceur et bienveillance. Le Not-Self '${hd.notSelf}' : comment il se manifeste concrètement et quel signal c'est. Les patterns de conditionnement liés aux centres indéfinis. Les tensions créatrices dans le thème astral (Saturne en ${(astro && astro.Saturn) || '—'}, défis de Mars en ${(astro && astro.Mars) || '—'}). Chaque défi est présenté comme une porte vers une version plus alignée. Jamais culpabilisant, toujours empuissant. Style 'tu', bienveillant, 4 paragraphes séparés par \\n\\n.",
    "insight": "Phrase ≤12 mots sur la transformation et la croissance de ${client.prenom}."
  }
]}`, 6500, 'Chapitres V-VI-VII').then(function (r) { onPartDone(3); return r; });

  var pE = api(ctx + `
Génère uniquement :
{
  "affirmations": [
    "Affirmation 1 — cosmique, personnalisée pour ${client.prenom} (${hd.type}, Profil ${hd.profile}, Soleil ${(astro && astro.Sun) || '—'}, Lune ${(astro && astro.Moon) || '—'}). En 'Je suis...', 'Je...', ou 'Mon énergie...'. Unique, ancre une vérité spécifique à son profil.",
    "Affirmation 2", "Affirmation 3", "Affirmation 4", "Affirmation 5",
    "Affirmation 6", "Affirmation 7", "Affirmation 8", "Affirmation 9", "Affirmation 10"
  ],
  "rituels": [
    {
      "nom": "Nom poétique rituel 1",
      "timing": "Moment précis de la journée ou semaine",
      "description": "150 mots min. Instructions détaillées et sensorielles, adaptées au Type HD '${hd.type}', à l'Autorité '${hd.authority}' et au Soleil en ${(astro && astro.Sun) || '—'}. Ce rituel aide ${client.prenom} à se réaligner avec son énergie naturelle."
    },
    {
      "nom": "Nom poétique rituel 2",
      "timing": "Moment précis",
      "description": "150 mots min. Rituel adapté à la Lune en ${(astro && astro.Moon) || '—'} et au Profil ${hd.profile}. Instructions concrètes et poétiques."
    },
    {
      "nom": "Nom poétique rituel 3",
      "timing": "Moment précis",
      "description": "150 mots min. Rituel de mission de vie, ancré dans la Croix '${hd.cross}' et le Noeud Nord en ${(astro && astro.NorthNode) || '—'}."
    }
  ],
  "conclusion": "CHAÎNE DE TEXTE (pas un objet JSON). 300 mots min. Ton Message de l'Univers — lettre intime et émouvante adressée à ${client.prenom}. L'Univers lui parle directement. Mentionne '${client.lieu}', la date '${client.naissance}', son Type '${hd.type}', son Soleil en ${(astro && astro.Sun) || '—'}, sa Croix '${hd.cross}'. Lui rappelle qu'${il} est exactement ${ne} au bon moment, au bon endroit, avec les bons outils. Cloture qui donne envie d'agir. Emouvant, personnel, unique."
}`, 5500, 'Affirmations & Rituels').then(function (r) { onPartDone(6); return r; });

  var pF = api(ctx + `
Génère uniquement ces 2 sections :
{"sections": [
  {
    "numero": "VIII",
    "titre": "Tes Maisons Célestes",
    "sous_titre": "sous-titre poétique sur les domaines de vie où l'énergie de ${client.prenom} s'exprime le plus fort",
    "contenu": "420 mots min. Explore les placements planétaires de ${client.prenom} dans les maisons astrologiques — c'est là que l'énergie des planètes se manifeste concrètement dans sa vie quotidienne. Analyse les 5-6 placements les plus significatifs : ${(astro && astro.Sun) || '—'}, ${(astro && astro.Moon) || '—'}, ${(astro && astro.Mars) || '—'}, ${(astro && astro.Venus) || '—'}, ${(astro && astro.Jupiter) || '—'}, ${(astro && astro.Saturn) || '—'}. Pour chaque placement, explique dans quel domaine de vie (carrière, relations, ressources, spiritualité...) cette énergie planétaire s'exprime, et ce que ça révèle concrètement sur la façon dont ${client.prenom} vit ces thèmes. Puis identifie la maison la plus chargée comme le 'théâtre principal' de sa vie en ce moment. Style 'tu', révélateur et concret, 5-6 paragraphes séparés par \\n\\n.",
    "insight": "Phrase ≤12 mots sur le domaine de vie où l'énergie de ${client.prenom} brille le plus."
  },
  {
    "numero": "IX",
    "titre": "La Danse de tes Planètes",
    "sous_titre": "sous-titre poétique sur les tensions et harmonies qui gouvernent la vie de ${client.prenom}",
    "contenu": "400 mots min. Les aspects planétaires révèlent les dynamiques psychologiques profondes de ${client.prenom}. Aspects clés identifiés : ${(astro && astro.AspectsClés) || 'Non disponible'}. Interprète les 4-5 aspects les plus significatifs : une conjonction = fusion totale de deux énergies, une opposition = tension créatrice entre deux pôles, un trigone = talent naturel fluide, un carré = friction qui force la croissance, un sextile = opportunité à saisir. Pour chaque aspect, nomme-le, explique comment il se manifeste dans la vie quotidienne de ${client.prenom} et quel don ou défi il apporte. Termine par un paragraphe sur comment ces dynamiques forment un tout cohérent — la 'symphonie' unique de son thème natal. Style 'tu', psychologique et révélateur, 5 paragraphes séparés par \\n\\n.",
    "insight": "Phrase ≤12 mots sur la dynamique planétaire la plus puissante de ${client.prenom}."
  }
]}`, 5500, 'Chapitres VIII-IX').then(function (r) { onPartDone(4); return r; });

  var pG = api(ctx + `
Génère uniquement ces 2 sections :
{"sections": [
  {
    "numero": "X",
    "titre": "Chiron : Ta Blessure, Ton Don",
    "sous_titre": "sous-titre poétique sur la blessure sacrée qui devient la plus grande force de ${client.prenom}",
    "contenu": "420 mots min. Chiron est l'astéroïde du Guérisseur Blessé — il indique notre blessure la plus profonde ET le chemin de guérison qui devient notre plus grand don. Chiron de ${client.prenom} est en ${(astro && astro.Chiron) || '—'}. Décris d'abord la blessure : quel type de douleur ancestrale ou de vie Chiron dans ce signe et cette maison indique, comment elle s'est peut-être manifestée dans l'enfance ou les relations. Avec douceur et bienveillance absolue. Puis le retournement : comment cette blessure, une fois regardée en face et travaillée, devient précisément le chemin de guérison que ${client.prenom} peut offrir aux autres. C'est sa 'médecine' unique. Termine sur une note d'espoir : la souffrance a un sens, elle forge un guérisseur. Style 'tu', profond et émouvant, 4 paragraphes séparés par \\n\\n.",
    "insight": "Phrase ≤12 mots sur la force qui naît de la blessure de ${client.prenom}."
  },
  {
    "numero": "XI",
    "titre": "Lilith & Ton Feu Primitif",
    "sous_titre": "sous-titre poétique sur la part sauvage et le pouvoir brut de ${client.prenom}",
    "contenu": "400 mots min. La Lune Noire Lilith représente la part sauvage, refoulée, non domestiquée — le pouvoir brut que la société nous a appris à cacher. Lilith de ${client.prenom} est en ${(astro && astro.Lilith) || '—'}. Décris ce pouvoir primitif : quelle énergie rebelle et authentique Lilith dans ce placement révèle, ce qui a peut-être été censuré ou jugé dans sa vie. Puis comment réintégrer cette énergie comme une force plutôt qu'une honte. Ensuite, ajoute le portrait élémentaire : ${client.prenom} est ${(astro && astro.Elements) || '—'} — explique ce que cette dominante élémentaire signifie pour son tempérament naturel, ses forces et ses besoins. Mentionne aussi sa phase lunaire de naissance '${(astro && astro.PhaseLunaire) || '—'}' et ce qu'elle révèle sur sa façon innée d'avancer dans la vie. Style 'tu', libérateur et ancré, 4 paragraphes séparés par \\n\\n.",
    "insight": "Phrase ≤12 mots sur le feu primitif unique de ${client.prenom}."
  }
]}`, 5500, 'Chapitres X-XI').then(function (r) { onPartDone(5); return r; });

  var results = await Promise.all([pA, pB, pC, pD, pE, pF, pG]);
  var rA = results[0]; var rB = results[1]; var rC = results[2]; var rD = results[3];
  var rE = results[4]; var rF = results[5]; var rG = results[6];

  var acHighlightsStr = (astro && astro.AstroCarto && astro.AstroCarto.highlights) || '—';
  var acModeStr = (astro && astro.AstroCarto && astro.AstroCarto.quality && astro.AstroCarto.quality.mode) || 'lite';
  var rH = null;
  try {
    if (onProgress) onProgress('Sceau final — le manuscrit prend sa forme…', 88);
    rH = await api(ctx + `
DONNÉES COMPLÉMENTAIRES POUR LA SYNTHÈSE :
- Type HD : ${hd.type || '—'} | Stratégie : ${hd.strategy || '—'} | Autorité : ${hd.authority || '—'} | Profil : ${hd.profile || '—'} | Signature : ${hd.signature || '—'} | Non-Soi : ${hd.notSelf || '—'}
- Soleil : ${(astro && astro.Sun) || '—'} | Lune : ${(astro && astro.Moon) || '—'} | Ascendant : ${(astro && astro.Ascendant) || '—'} | MC : ${(astro && astro.MC) || '—'}
- Nœud Nord : ${(astro && astro.NorthNode) || '—'} | Chiron : ${(astro && astro.Chiron) || '—'} | Lilith : ${(astro && astro.Lilith) || '—'}
- Éléments dominants : ${(astro && astro.Elements) || '—'} | Phase lunaire : ${(astro && astro.PhaseLunaire) || '—'}
- Astrocartographie (mode ${acModeStr}) — lignes MC/IC clés : ${acHighlightsStr}

MISSION : Rédige la SYNTHÈSE EXÉCUTIVE — la page finale premium que ${client.prenom} gardera en mémoire. Style "tu", vocabulaire précis, zéro remplissage.

Retourne UNIQUEMENT ce JSON :
{
  "synthese": {
    "essence": "30 à 45 mots. UNE phrase magistrale qui dit QUI EST ${client.prenom}. Commence par '${client.prenom}, tu es...' ou équivalent.",
    "forces": [
      "Force signature #1 : 18 à 28 mots.",
      "Force signature #2 : 18 à 28 mots.",
      "Force signature #3 : 18 à 28 mots."
    ],
    "chemin_croissance": "40 à 55 mots. L'axe #1 de transformation.",
    "direction_geo": "30 à 45 mots. À partir des lignes MC/IC (${acHighlightsStr}).",
    "strategie_hd": "30 à 40 mots. Stratégie '${hd.strategy || '—'}' + Autorité '${hd.authority || '—'}' en UN geste quotidien.",
    "fenetre_puissance": "25 à 40 mots. Fenêtre symbolique liée à '${(astro && astro.PhaseLunaire) || '—'}'.",
    "mantra": "UNE phrase de 8 à 14 mots à la première personne."
  }
}`, 4000, 'Synthèse Exécutive');
    onPartDone(7);
  } catch (synErr) {
    /* synthèse optionnelle */
  }

  var assembled = {
    placements_confirmes: rA.placements_confirmes,
    intro: rA.intro,
    sections: [].concat(rB.sections || [], rC.sections || [], rD.sections || [], rF.sections || [], rG.sections || []),
    affirmations: rE.affirmations,
    rituels: rE.rituels,
    conclusion: rE.conclusion,
    synthese: rH && rH.synthese ? rH.synthese : null
  };
  return normalizeManuscrit(enrichPlacementsFromAstro(assembled, astro));
}

/** Structure attendue (dry-run sans Claude). */
function expectedStructureSkeleton() {
  return {
    placements_confirmes: ['soleil', 'lune', 'ascendant', 'mc', 'mercure', 'venus', 'mars', 'jupiter', 'saturne', 'uranus', 'neptune', 'pluton', 'noeud_nord'],
    sections: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'],
    extras: ['intro', 'affirmations(10)', 'rituels(3)', 'conclusion', 'synthese']
  };
}

module.exports = {
  claudeKey,
  claudeModel,
  claudeJsonApi,
  generateManuscrit,
  normalizeManuscrit,
  enrichPlacementsFromAstro,
  expectedStructureSkeleton,
  buildClient
};
