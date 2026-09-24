/**
 * Profil natal (naissance) — stocké côté serveur par email.
 * Jamais de clé API ici : uniquement les champs client + helpers.
 *
 * Règle anti-prêt de compte :
 * - 1re complétion du profil = gratuite (ne compte pas)
 * - ensuite max MAX_PROFILE_EDITS modifications (corrections)
 *
 * Partenaire (manuscrit couple) : mêmes règles, champs partner*.
 */

const language = require('./language');

const GENDERS = ['femme', 'homme', 'autre'];
/** Corrections après la 1re complétion (la création ne compte pas). */
const MAX_PROFILE_EDITS = 3;
const MAX_PARTNER_EDITS = 3;

function trim(s) {
  return String(s == null ? '' : s).trim();
}

function normalizeGender(g) {
  const f = trim(g).toLowerCase();
  if (f === 'femme' || f === 'f' || f === 'female' || f === 'woman') return 'femme';
  if (f === 'homme' || f === 'h' || f === 'male' || f === 'man' || f === 'm') return 'homme';
  if (f === 'autre' || f === 'other' || f === 'nb' || f === 'non-binaire' || f === 'nonbinaire') return 'autre';
  return '';
}

function parseCoord(v) {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function editCountOf(c) {
  const n = c && c.profileEditCount != null ? Number(c.profileEditCount) : 0;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function partnerEditCountOf(c) {
  const n = c && c.partnerEditCount != null ? Number(c.partnerEditCount) : 0;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function normalizeBirthTime(birthTime) {
  let t = trim(birthTime);
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(t)) t = t.slice(0, 5);
  const timeMatch = t.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!timeMatch) return '';
  const hh = String(Math.min(23, parseInt(timeMatch[1], 10))).padStart(2, '0');
  const mm = String(Math.min(59, parseInt(timeMatch[2], 10))).padStart(2, '0');
  return hh + ':' + mm;
}

function partnerFields(c) {
  if (!c) {
    return {
      partnerPrenom: '',
      partnerNom: '',
      partnerBirthDate: '',
      partnerBirthTime: '',
      partnerBirthPlace: '',
      partnerBirthLat: null,
      partnerBirthLon: null,
      partnerBirthTimezone: '',
      partnerGender: '',
      partnerProfileComplete: false,
      partnerEditCount: 0,
      partnerEditsRemaining: MAX_PARTNER_EDITS,
      partnerCanEdit: true
    };
  }
  const partnerPrenom = trim(c.partnerPrenom);
  const partnerNom = trim(c.partnerNom);
  const partnerBirthDate = trim(c.partnerBirthDate);
  let partnerBirthTime = trim(c.partnerBirthTime);
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(partnerBirthTime)) partnerBirthTime = partnerBirthTime.slice(0, 5);
  const partnerBirthPlace = trim(c.partnerBirthPlace);
  const partnerBirthLat = parseCoord(c.partnerBirthLat);
  const partnerBirthLon = parseCoord(c.partnerBirthLon);
  const partnerBirthTimezone = trim(c.partnerBirthTimezone);
  const partnerGender = normalizeGender(c.partnerGender);
  const complete = !!(
    partnerPrenom &&
    partnerBirthDate &&
    partnerBirthTime &&
    partnerBirthPlace &&
    partnerGender &&
    GENDERS.indexOf(partnerGender) >= 0
  );
  const edits = partnerEditCountOf(c);
  const remaining = Math.max(0, MAX_PARTNER_EDITS - edits);
  const canEdit = !complete || remaining > 0;
  return {
    partnerPrenom: partnerPrenom,
    partnerNom: partnerNom,
    partnerBirthDate: partnerBirthDate,
    partnerBirthTime: partnerBirthTime,
    partnerBirthPlace: partnerBirthPlace,
    partnerBirthLat: partnerBirthLat,
    partnerBirthLon: partnerBirthLon,
    partnerBirthTimezone: partnerBirthTimezone,
    partnerGender: partnerGender,
    partnerProfileComplete: complete,
    partnerEditCount: edits,
    partnerEditsRemaining: remaining,
    partnerCanEdit: canEdit
  };
}

function profileFields(c) {
  if (!c) {
    return Object.assign({
      language: language.DEFAULT,
      locale: language.DEFAULT,
      languageLocked: false,
      birthDate: '',
      birthTime: '',
      birthPlace: '',
      birthLat: null,
      birthLon: null,
      birthTimezone: '',
      gender: '',
      profileComplete: false,
      profileEditCount: 0,
      profileEditsRemaining: MAX_PROFILE_EDITS,
      profileCanEdit: true,
      natalReady: false,
      natalFileExists: false,
      natalStatus: 'none',
      natalGeneratedAt: null,
      natalPdfUrl: null,
      natalProgress: null,
      natalProgressPct: null,
      natalError: null,
      natalPagesEst: null
    }, partnerFields(null));
  }
  const lang = language.ofContact(c);
  const birthDate = trim(c.birthDate);
  let birthTime = trim(c.birthTime);
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(birthTime)) birthTime = birthTime.slice(0, 5);
  const birthPlace = trim(c.birthPlace);
  const birthLat = parseCoord(c.birthLat);
  const birthLon = parseCoord(c.birthLon);
  const birthTimezone = trim(c.birthTimezone);
  const gender = normalizeGender(c.gender);
  const complete = !!(birthDate && birthTime && birthPlace && gender && GENDERS.indexOf(gender) >= 0);
  const edits = editCountOf(c);
  const remaining = Math.max(0, MAX_PROFILE_EDITS - edits);
  /* Première complétion toujours possible ; ensuite tant qu’il reste des corrections. */
  const canEdit = !complete || remaining > 0;
  const ready = !!c.natalReady;
  let status = trim(c.natalStatus) || 'none';
  if (ready && status === 'none') status = 'ready';
  if (!ready && status === 'ready') status = 'none';
  return Object.assign({
    language: lang,
    locale: lang,
    languageLocked: !!c.languageLocked,
    birthDate: birthDate,
    birthTime: birthTime,
    birthPlace: birthPlace,
    birthLat: birthLat,
    birthLon: birthLon,
    birthTimezone: birthTimezone,
    gender: gender,
    profileComplete: complete,
    profileEditCount: edits,
    profileEditsRemaining: remaining,
    profileCanEdit: canEdit,
    natalReady: ready,
    /* Remplacé dans publicContact par hasNatalFile() — défaut false ici. */
    natalFileExists: false,
    natalStatus: status,
    natalGeneratedAt: c.natalGeneratedAt || null,
    natalPdfUrl: ready ? ('/natal-file?email=' + encodeURIComponent(c.email || '')) : null,
    natalProgress: c.natalProgress || null,
    natalProgressPct: c.natalProgressPct != null ? c.natalProgressPct : null,
    natalError: c.natalError || null,
    natalPagesEst: c.natalPagesEst || null
  }, partnerFields(c));
}

/** Persiste language/locale (ISO) — indépendant des edits naissance. Verrouillé après premier réglage. */
function saveLanguage(c, body) {
  if (!c) return { ok: false, error: 'compte inconnu' };
  if (c.languageLocked) {
    return { ok: true, language: language.ofContact(c), locked: true };
  }
  const raw = body && (body.language != null ? body.language : body.locale);
  if (raw == null || String(raw).trim() === '') {
    return { ok: false, error: 'language requis' };
  }
  const code = language.normalize(raw);
  c.language = code;
  c.locale = code;
  c.languageUpdatedAt = new Date().toISOString();
  return { ok: true, language: code };
}

function isComplete(c) {
  return profileFields(c).profileComplete;
}

function isPartnerComplete(c) {
  return partnerFields(c).partnerProfileComplete;
}

/** Pseudo-contact pour fetch HD/Astro du partenaire. */
function partnerAsContact(c) {
  if (!c) return null;
  const p = partnerFields(c);
  return {
    prenom: p.partnerPrenom,
    nom: p.partnerNom,
    birthDate: p.partnerBirthDate,
    birthTime: p.partnerBirthTime,
    birthPlace: p.partnerBirthPlace,
    birthLat: p.partnerBirthLat,
    birthLon: p.partnerBirthLon,
    birthTimezone: p.partnerBirthTimezone,
    gender: p.partnerGender
  };
}

function toneLabel(gender) {
  const g = normalizeGender(gender);
  if (g === 'femme') return 'féminin (elle, née, faite — accords féminins)';
  if (g === 'homme') return 'masculin (il, né, fait — accords masculins)';
  return 'neutre / inclusif (évite les accords genrés quand possible)';
}

/**
 * Valide et écrit les champs naissance sur le contact.
 * 1re complétion gratuite ; ensuite max MAX_PROFILE_EDITS updates (serveur).
 * @returns {{ ok: boolean, error?: string, code?: string, isEdit?: boolean }}
 */
function saveProfile(c, body) {
  if (!c) return { ok: false, error: 'compte inconnu' };

  const wasComplete = isComplete(c);
  const edits = editCountOf(c);

  if (wasComplete && edits >= MAX_PROFILE_EDITS) {
    return {
      ok: false,
      code: 'PROFILE_EDIT_LIMIT',
      error:
        'Tu as utilisé tes 3 modifications de profil. Pour toute correction supplémentaire, contacte le support.',
      isEdit: true
    };
  }

  const birthDate = trim(body && body.birthDate);
  let birthTime = trim(body && body.birthTime);
  const birthPlace = trim(body && body.birthPlace);
  const gender = normalizeGender(body && body.gender);

  if (!birthDate) return { ok: false, error: 'Date de naissance requise' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return { ok: false, error: 'Date au format AAAA-MM-JJ' };
  }
  if (!birthTime) return { ok: false, error: 'Heure de naissance requise' };
  birthTime = normalizeBirthTime(birthTime);
  if (!birthTime) {
    return { ok: false, error: 'Heure au format HH:MM' };
  }
  if (!birthPlace || birthPlace.length < 2) {
    return { ok: false, error: 'Lieu de naissance requis' };
  }
  if (!gender || GENDERS.indexOf(gender) < 0) {
    return { ok: false, error: 'Genre requis (femme, homme ou autre)' };
  }

  const birthLat = parseCoord(body && body.birthLat);
  const birthLon = parseCoord(body && body.birthLon);
  let birthTimezone = trim(body && body.birthTimezone);
  if (birthTimezone.length > 80) birthTimezone = birthTimezone.slice(0, 80);

  c.birthDate = birthDate;
  c.birthTime = birthTime;
  c.birthPlace = birthPlace;
  c.birthLat = birthLat;
  c.birthLon = birthLon;
  c.birthTimezone = birthTimezone;
  c.gender = gender;
  c.profileUpdatedAt = new Date().toISOString();

  if (wasComplete) {
    c.profileEditCount = edits + 1;
  } else if (c.profileEditCount == null || !Number.isFinite(Number(c.profileEditCount))) {
    c.profileEditCount = 0;
  }

  return { ok: true, isEdit: wasComplete };
}

/**
 * Enregistre le profil de naissance du partenaire (manuscrit couple).
 */
function savePartnerProfile(c, body) {
  if (!c) return { ok: false, error: 'compte inconnu' };

  const wasComplete = isPartnerComplete(c);
  const edits = partnerEditCountOf(c);

  if (wasComplete && edits >= MAX_PARTNER_EDITS) {
    return {
      ok: false,
      code: 'PARTNER_EDIT_LIMIT',
      error:
        'Tu as utilisé tes 3 modifications du profil partenaire. Pour toute correction supplémentaire, contacte le support.',
      isEdit: true
    };
  }

  const partnerPrenom = trim(body && (body.partnerPrenom || body.prenom));
  const partnerNom = trim(body && (body.partnerNom || body.nom));
  const partnerBirthDate = trim(body && (body.partnerBirthDate || body.birthDate));
  let partnerBirthTime = trim(body && (body.partnerBirthTime || body.birthTime));
  const partnerBirthPlace = trim(body && (body.partnerBirthPlace || body.birthPlace));
  const partnerGender = normalizeGender(body && (body.partnerGender || body.gender));

  if (!partnerPrenom || partnerPrenom.length < 1) {
    return { ok: false, error: 'Prénom du partenaire requis' };
  }
  if (!partnerBirthDate) return { ok: false, error: 'Date de naissance du partenaire requise' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(partnerBirthDate)) {
    return { ok: false, error: 'Date partenaire au format AAAA-MM-JJ' };
  }
  if (!partnerBirthTime) return { ok: false, error: 'Heure de naissance du partenaire requise' };
  partnerBirthTime = normalizeBirthTime(partnerBirthTime);
  if (!partnerBirthTime) {
    return { ok: false, error: 'Heure partenaire au format HH:MM' };
  }
  if (!partnerBirthPlace || partnerBirthPlace.length < 2) {
    return { ok: false, error: 'Lieu de naissance du partenaire requis' };
  }
  if (!partnerGender || GENDERS.indexOf(partnerGender) < 0) {
    return { ok: false, error: 'Genre du partenaire requis (femme, homme ou autre)' };
  }

  const partnerBirthLat = parseCoord(body && (body.partnerBirthLat != null ? body.partnerBirthLat : body.birthLat));
  const partnerBirthLon = parseCoord(body && (body.partnerBirthLon != null ? body.partnerBirthLon : body.birthLon));
  let partnerBirthTimezone = trim(body && (body.partnerBirthTimezone || body.birthTimezone));
  if (partnerBirthTimezone.length > 80) partnerBirthTimezone = partnerBirthTimezone.slice(0, 80);

  c.partnerPrenom = partnerPrenom.slice(0, 80);
  c.partnerNom = partnerNom.slice(0, 80);
  c.partnerBirthDate = partnerBirthDate;
  c.partnerBirthTime = partnerBirthTime;
  c.partnerBirthPlace = partnerBirthPlace.slice(0, 160);
  c.partnerBirthLat = partnerBirthLat;
  c.partnerBirthLon = partnerBirthLon;
  c.partnerBirthTimezone = partnerBirthTimezone;
  c.partnerGender = partnerGender;
  c.partnerUpdatedAt = new Date().toISOString();

  if (wasComplete) {
    c.partnerEditCount = edits + 1;
  } else if (c.partnerEditCount == null || !Number.isFinite(Number(c.partnerEditCount))) {
    c.partnerEditCount = 0;
  }

  return { ok: true, isEdit: wasComplete };
}

/** Natal / jour / mois / couple / ultime ont besoin du profil. */
function kindsNeedingProfile() {
  return ['natal', 'jour', 'mois', 'couple', 'ultime'];
}

function requireForGenerate(c, kind) {
  if (kindsNeedingProfile().indexOf(kind) < 0) return { ok: true };
  if (!isComplete(c)) {
    return {
      ok: false,
      error: 'Complète d’abord ton profil de naissance (date, heure, lieu, genre).',
      needProfile: true
    };
  }
  if (kind === 'couple' && !isPartnerComplete(c)) {
    return {
      ok: false,
      error: 'Renseigne d’abord le ciel de naissance de ton ou ta partenaire.',
      needPartner: true
    };
  }
  return { ok: true };
}

module.exports = {
  GENDERS,
  MAX_PROFILE_EDITS,
  MAX_PARTNER_EDITS,
  normalizeGender,
  profileFields,
  partnerFields,
  isComplete,
  isPartnerComplete,
  partnerAsContact,
  toneLabel,
  saveProfile,
  savePartnerProfile,
  saveLanguage,
  kindsNeedingProfile,
  requireForGenerate
};
