/** Gene Keys — table 64 + profil hologénétique (port GENERATIONS Ultime). */
const GENE_KEYS_TABLE = {
    1:  { nom:'La Contemplation', ombre:'Entropie', don:'Fraîcheur', siddhi:'Beauté' },
    2:  { nom:'Le Retour', ombre:'Dislocation', don:'Orientation', siddhi:'Unité' },
    3:  { nom:'L\'Ordre', ombre:'Chaos', don:'Innovation', siddhi:'Innocence' },
    4:  { nom:'La Folie de la Jeunesse', ombre:'Intolérance', don:'Compréhension', siddhi:'Pardon' },
    5:  { nom:'L\'Attente', ombre:'Fixation', don:'Patience', siddhi:'Intemporalité' },
    6:  { nom:'Le Conflit', ombre:'Conflit', don:'Diplomatie', siddhi:'Paix' },
    7:  { nom:'L\'Armée', ombre:'Division', don:'Guidance', siddhi:'Vertu' },
    8:  { nom:'La Solidarité', ombre:'Médiocrité', don:'Style', siddhi:'Exquisité' },
    9:  { nom:'Le Pouvoir du Petit', ombre:'Inertie', don:'Détermination', siddhi:'Invincibilité' },
    10: { nom:'La Démarche', ombre:'Obsession de soi', don:'Naturel', siddhi:'Être' },
    11: { nom:'La Paix', ombre:'Obscurité', don:'Idéalisme', siddhi:'Lumière' },
    12: { nom:'La Stagnation', ombre:'Vanité', don:'Discrimination', siddhi:'Pureté' },
    13: { nom:'La Communauté', ombre:'Discorde', don:'Discernement', siddhi:'Empathie' },
    14: { nom:'La Grande Possession', ombre:'Compromis', don:'Compétence', siddhi:'Abondance' },
    15: { nom:'La Modestie', ombre:'Ennui', don:'Extrêmes', siddhi:'Floraison' },
    16: { nom:'L\'Enthousiasme', ombre:'Indifférence', don:'Versatilité', siddhi:'Maîtrise' },
    17: { nom:'La Suite', ombre:'Opinion', don:'Vision lointaine', siddhi:'Omniscience' },
    18: { nom:'Le Travail sur le Corrompu', ombre:'Jugement', don:'Intégrité', siddhi:'Perfection' },
    19: { nom:'L\'Approche', ombre:'Co-dépendance', don:'Sensibilité', siddhi:'Sacrifice' },
    20: { nom:'La Contemplation (Présence)', ombre:'Superficialité', don:'Assurance', siddhi:'Présence' },
    21: { nom:'La Morsure Décisive', ombre:'Contrôle', don:'Autorité', siddhi:'Vaillance' },
    22: { nom:'La Grâce', ombre:'Déshonneur', don:'Grâce', siddhi:'Grâce Divine' },
    23: { nom:'La Séparation', ombre:'Complexité', don:'Simplicité', siddhi:'Quintessence' },
    24: { nom:'Le Retour (Silence)', ombre:'Addiction', don:'Invention', siddhi:'Silence' },
    25: { nom:'L\'Innocence', ombre:'Constriction', don:'Acceptation', siddhi:'Amour Universel' },
    26: { nom:'Le Grand Pouvoir Domestiqué', ombre:'Orgueil', don:'Artifice', siddhi:'Invisibilité' },
    27: { nom:'La Nourriture', ombre:'Égoïsme', don:'Altruisme', siddhi:'Abnégation' },
    28: { nom:'La Prépondérance du Grand', ombre:'Absence de sens', don:'Totalité', siddhi:'Immortalité' },
    29: { nom:'L\'Abîme', ombre:'Demi-mesure', don:'Engagement', siddhi:'Dévotion' },
    30: { nom:'Le Feu Clingant', ombre:'Désir', don:'Légèreté', siddhi:'Ravissement' },
    31: { nom:'L\'Influence', ombre:'Arrogance', don:'Leadership', siddhi:'Humilité' },
    32: { nom:'La Durée', ombre:'Échec', don:'Préservation', siddhi:'Vénération' },
    33: { nom:'La Retraite', ombre:'Oubli', don:'Pleine conscience', siddhi:'Révélation' },
    34: { nom:'Le Pouvoir du Grand', ombre:'Force brute', don:'Force', siddhi:'Majesté' },
    35: { nom:'Le Progrès', ombre:'Faim', don:'Aventure', siddhi:'Illimité' },
    36: { nom:'L\'Obscurcissement de la Lumière', ombre:'Turbulence', don:'Humanité', siddhi:'Compassion' },
    37: { nom:'La Famille', ombre:'Faiblesse', don:'Égalité', siddhi:'Tendresse' },
    38: { nom:'L\'Opposition', ombre:'Lutte', don:'Persévérance', siddhi:'Honneur' },
    39: { nom:'L\'Obstacle', ombre:'Provocation', don:'Dynamisme', siddhi:'Libération' },
    40: { nom:'La Libération', ombre:'Épuisement', don:'Résolution', siddhi:'Volonté Divine' },
    41: { nom:'La Diminution', ombre:'Fantaisie', don:'Anticipation', siddhi:'Émanation' },
    42: { nom:'L\'Augmentation', ombre:'Attente', don:'Détachement', siddhi:'Célébration' },
    43: { nom:'La Percée', ombre:'Surdité', don:'Insight', siddhi:'Épiphanie' },
    44: { nom:'La Rencontre', ombre:'Interférence', don:'Travail d\'équipe', siddhi:'Synarchie' },
    45: { nom:'Le Rassemblement', ombre:'Dominance', don:'Synergie', siddhi:'Communion' },
    46: { nom:'La Poussée vers le Haut', ombre:'Sérieux', don:'Délice', siddhi:'Extase' },
    47: { nom:'L\'Oppression', ombre:'Oppression', don:'Transmutation', siddhi:'Transfiguration' },
    48: { nom:'Le Puits', ombre:'Inadéquation', don:'Ingéniosité', siddhi:'Sagesse' },
    49: { nom:'La Révolution', ombre:'Réaction', don:'Révolution', siddhi:'Renaissance' },
    50: { nom:'Le Chaudron', ombre:'Corruption', don:'Équilibre', siddhi:'Harmonie' },
    51: { nom:'L\'Éveil', ombre:'Agitation', don:'Initiative', siddhi:'Éveil' },
    52: { nom:'Le Maintien du Calme', ombre:'Stress', don:'Restraint', siddhi:'Immobilité' },
    53: { nom:'Le Développement', ombre:'Immaturité', don:'Expansion', siddhi:'Surabondance' },
    54: { nom:'La Jeune Épouse', ombre:'Avidité', don:'Aspiration', siddhi:'Ascension' },
    55: { nom:'L\'Abondance', ombre:'Victimisation', don:'Liberté', siddhi:'Liberté' },
    56: { nom:'Le Voyageur', ombre:'Distraction', don:'Enrichissement', siddhi:'Ivresse' },
    57: { nom:'Le Doux', ombre:'Inquiétude', don:'Intuition', siddhi:'Clarté' },
    58: { nom:'Le Joyeux', ombre:'Insatisfaction', don:'Vitalité', siddhi:'Béatitude' },
    59: { nom:'La Dispersion', ombre:'Malhonnêteté', don:'Intimité', siddhi:'Transparence' },
    60: { nom:'La Limitation', ombre:'Limitation', don:'Réalisme', siddhi:'Justice' },
    61: { nom:'La Vérité Intérieure', ombre:'Psychose', don:'Inspiration', siddhi:'Sainteté' },
    62: { nom:'La Prépondérance du Petit', ombre:'Intellect', don:'Précision', siddhi:'Impeccabilité' },
    63: { nom:'Après l\'Accomplissement', ombre:'Doute', don:'Enquête', siddhi:'Vérité' },
    64: { nom:'Avant l\'Accomplissement', ombre:'Confusion', don:'Imagination', siddhi:'Illumination' }
  };

function buildGeneKeysProfile(hd) {
    var prs = (hd && hd.activationsPrs) || {};
    var des = (hd && hd.activationsDes) || {};
    function getKey(gate) {
      var g = parseInt(gate, 10);
      var meta = GENE_KEYS_TABLE[g] || { nom:'Gene Key '+g, ombre:'—', don:'—', siddhi:'—' };
      return {
        gate: g,
        nom: meta.nom,
        ombre: meta.ombre,
        don: meta.don,
        siddhi: meta.siddhi
      };
    }
    function sphere(id, idFr, role, side, planet) {
      var map = side === 'des' ? des : prs;
      var act = map[planet];
      if (!act || !act.gate) {
        return {
          id: id, idFr: idFr, role: role, side: side, planet: planet,
          gate: 0, line: 0, label: '—', key: null, ok: false
        };
      }
      var key = getKey(act.gate);
      var line = act.line || 0;
      return {
        id: id, idFr: idFr, role: role, side: side, planet: planet,
        gate: act.gate, line: line,
        label: act.gate + (line ? '.' + line : ''),
        key: key, ok: true
      };
    }
    var activation = [
      sphere('lifes_work', 'Oeuvre de Vie', 'Life\'s Work — ce que tu es venu accomplir', 'prs', 'Sun'),
      sphere('evolution', 'Évolution', 'Evolution — ce que tu es venu guérir', 'prs', 'Earth'),
      sphere('radiance', 'Radiance', 'Radiance — ce qui rayonne de toi sans effort', 'des', 'Sun'),
      sphere('purpose', 'Purpose', 'Purpose — la raison d\'être de ton corps', 'des', 'Earth')
    ];
    var venus = [
      sphere('attraction', 'Attraction', 'Attraction — qui tu attires et pourquoi', 'des', 'Moon'),
      sphere('iq', 'QI (IQ)', 'IQ — blessure mentale (≈15–21 ans)', 'prs', 'Venus'),
      sphere('eq', 'QE (EQ)', 'EQ — blessure émotionnelle (≈8–14 ans)', 'prs', 'Mars'),
      sphere('sq', 'QS (SQ)', 'SQ — blessure spirituelle / confiance (0–7 ans)', 'des', 'Venus'),
      sphere('core', 'Blessure Noyau', 'Core Wound — le noeud qui relie tout', 'des', 'Mars')
    ];
    var pearl = [
      sphere('vocation', 'Vocation', 'Vocation — le style de ton oeuvre', 'des', 'Mars'),
      sphere('culture', 'Culture', 'Culture — le milieu où tu prospères', 'des', 'Jupiter'),
      sphere('pearl', 'Perle', 'Pearl — ton vrai trésor', 'prs', 'Jupiter'),
      sphere('brand', 'Brand', 'Brand — ta signature dans le monde', 'prs', 'Sun')
    ];
    function fmt(s) {
      if (!s || !s.ok) return s.idFr + ': (donnée manquante)';
      return s.idFr + ' = Gene Key ' + s.label + ' « ' + s.key.nom + ' » | Ombre: ' + s.key.ombre + ' → Don: ' + s.key.don + ' → Siddhi: ' + s.key.siddhi + ' (' + (s.side==='prs'?'Personnalité':'Design') + ' / ' + s.planet + ')';
    }
    var summaryLines = []
      .concat(activation.map(fmt))
      .concat(venus.map(fmt))
      .concat(pearl.map(fmt));
    console.log('[Gene Keys profile]', summaryLines);
    return {
      activation: activation,
      venus: venus,
      pearl: pearl,
      all: activation.concat(venus).concat(pearl),
      summaryText: summaryLines.join('\n')
    };
  }

module.exports = { GENE_KEYS_TABLE, buildGeneKeysProfile };
