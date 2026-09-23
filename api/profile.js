/**
 * Profil natal (naissance) — stocké côté serveur par email.
 * Jamais de clé API ici : uniquement les champs client + helpers.
 */

const GENDERS = ['femme', 'homme', 'autre'];

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

function profileFields(c) {
  if (!c) {
    return {
      birthDate: '',
      birthTime: '',
      birthPlace: '',
      gender: '',
      profileComplete: false,
      natalReady: false,
      natalStatus: 'none',
      natalGeneratedAt: null,
      natalPdfUrl: null
    };
  }
  const birthDate = trim(c.birthDate);
  const birthTime = trim(c.birthTime);
  const birthPlace = trim(c.birthPlace);
  const gender = normalizeGender(c.gender) || trim(c.gender);
  const complete = !!(birthDate && birthTime && birthPlace && gender);
  const ready = !!c.natalReady;
  let status = trim(c.natalStatus) || 'none';
  if (ready && status === 'none') status = 'ready';
  if (!ready && status === 'ready') status = 'none';
  return {
    birthDate: birthDate,
    birthTime: birthTime,
    birthPlace: birthPlace,
    gender: gender,
    profileComplete: complete,
    natalReady: ready,
    natalStatus: status,
    natalGeneratedAt: c.natalGeneratedAt || null,
    natalPdfUrl: ready ? ('/natal-file?email=' + encodeURIComponent(c.email || '')) : null
  };
}

function isComplete(c) {
  return profileFields(c).profileComplete;
}

function toneLabel(gender) {
  const g = normalizeGender(gender);
  if (g === 'femme') return 'féminin (elle, née, faite — accords féminins)';
  if (g === 'homme') return 'masculin (il, né, fait — accords masculins)';
  return 'neutre / inclusif (évite les accords genrés quand possible)';
}

/**
 * Valide et écrit les champs naissance sur le contact.
 * @returns {{ ok: boolean, error?: string }}
 */
function saveProfile(c, body) {
  if (!c) return { ok: false, error: 'compte inconnu' };
  const birthDate = trim(body && body.birthDate);
  const birthTime = trim(body && body.birthTime);
  const birthPlace = trim(body && body.birthPlace);
  const gender = normalizeGender(body && body.gender);

  if (!birthDate) return { ok: false, error: 'Date de naissance requise' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return { ok: false, error: 'Date au format AAAA-MM-JJ' };
  }
  if (!birthTime) return { ok: false, error: 'Heure de naissance requise' };
  if (!/^\d{1,2}:\d{2}$/.test(birthTime)) {
    return { ok: false, error: 'Heure au format HH:MM' };
  }
  if (!birthPlace || birthPlace.length < 2) {
    return { ok: false, error: 'Lieu de naissance requis' };
  }
  if (!gender || GENDERS.indexOf(gender) < 0) {
    return { ok: false, error: 'Genre requis (femme, homme ou autre)' };
  }

  c.birthDate = birthDate;
  c.birthTime = birthTime;
  c.birthPlace = birthPlace;
  c.gender = gender;
  c.profileUpdatedAt = new Date().toISOString();
  return { ok: true };
}

/** Natal / jour / mois ont besoin du profil ; Ultime plus tard aussi. */
function kindsNeedingProfile() {
  return ['natal', 'jour', 'mois'];
}

function requireForGenerate(c, kind) {
  if (kindsNeedingProfile().indexOf(kind) < 0) return { ok: true };
  if (isComplete(c)) return { ok: true };
  return {
    ok: false,
    error: 'Complète d’abord ton profil de naissance (date, heure, lieu, genre).',
    needProfile: true
  };
}

module.exports = {
  GENDERS,
  normalizeGender,
  profileFields,
  isComplete,
  toneLabel,
  saveProfile,
  kindsNeedingProfile,
  requireForGenerate
};
