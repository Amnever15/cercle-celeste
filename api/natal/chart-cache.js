/**
 * Cache thème natal (HD + Astro) sur le contact.
 * Évite les appels HD/Astro à chaque manuscrit mois/jour / IA / couple.
 * Partenaire : partnerChartHd / partnerChartAstro.
 */
const profile = require('../profile');
const hdMod = require('./hd');
const astroMod = require('./astro');

function fingerprint(contact) {
  if (!contact) return '';
  return [
    String(contact.birthDate || '').trim(),
    String(contact.birthTime || '').trim(),
    String(contact.birthPlace || '').trim(),
    contact.birthLat != null ? String(contact.birthLat) : '',
    contact.birthLon != null ? String(contact.birthLon) : '',
    String(contact.gender || '').trim().toLowerCase()
  ].join('|');
}

function partnerFingerprint(contact) {
  if (!contact) return '';
  return [
    String(contact.partnerBirthDate || '').trim(),
    String(contact.partnerBirthTime || '').trim(),
    String(contact.partnerBirthPlace || '').trim(),
    contact.partnerBirthLat != null ? String(contact.partnerBirthLat) : '',
    contact.partnerBirthLon != null ? String(contact.partnerBirthLon) : '',
    String(contact.partnerGender || '').trim().toLowerCase(),
    String(contact.partnerPrenom || '').trim().toLowerCase()
  ].join('|');
}

function hasValidCache(contact) {
  if (!contact || !contact.chartHd || !contact.chartAstro) return false;
  var fp = fingerprint(contact);
  if (!fp || !contact.chartFingerprint) return false;
  return contact.chartFingerprint === fp;
}

function hasValidPartnerCache(contact) {
  if (!contact || !contact.partnerChartHd || !contact.partnerChartAstro) return false;
  var fp = partnerFingerprint(contact);
  if (!fp || !contact.partnerChartFingerprint) return false;
  return contact.partnerChartFingerprint === fp;
}

function storeChart(contact, hd, astro) {
  if (!contact) return;
  contact.chartHd = hd || null;
  contact.chartAstro = astro || null;
  contact.chartFingerprint = fingerprint(contact);
  contact.chartCachedAt = new Date().toISOString();
}

function storePartnerChart(contact, hd, astro) {
  if (!contact) return;
  contact.partnerChartHd = hd || null;
  contact.partnerChartAstro = astro || null;
  contact.partnerChartFingerprint = partnerFingerprint(contact);
  contact.partnerChartCachedAt = new Date().toISOString();
}

async function fetchChartForBirth(person, opts) {
  opts = opts || {};
  var lat = person.birthLat;
  var lon = person.birthLon;
  var timezone = person.birthTimezone || '';
  if (!timezone || lat == null || lon == null) {
    var tzRes = await astroMod.resolveTimezone(lat, lon, person.birthPlace);
    timezone = (tzRes && tzRes.timezone) || timezone || 'Europe/Paris';
    if (tzRes && tzRes.lat != null) lat = tzRes.lat;
    if (tzRes && tzRes.lon != null) lon = tzRes.lon;
  }
  if (!timezone) timezone = 'Europe/Paris';
  person.birthTimezone = timezone;
  if (lat != null) person.birthLat = lat;
  if (lon != null) person.birthLon = lon;

  var dateRaw = String(person.birthDate || '').trim() + ' ' + String(person.birthTime || '12:00').trim();
  hdMod.warmUpHDApi();
  astroMod.warmUpAstroApi();

  var hd = await hdMod.fetchHDWithRetry(
    dateRaw,
    person.birthPlace,
    person.gender,
    lat,
    lon,
    opts.onProgress
  );
  var astro = await astroMod.fetchAstroWithRetry(
    dateRaw, lat, lon, timezone, person.birthPlace,
    opts.onProgress
  );
  return { hd: hd, astro: astro, timezone: timezone, lat: lat, lon: lon };
}

/**
 * Retourne { hd, astro, fromCache }.
 * Fetch si cache absent ou fingerprint changé (édition profil).
 */
async function ensureChart(contact, opts) {
  opts = opts || {};
  if (!contact || !profile.isComplete(contact)) {
    throw new Error('Profil de naissance incomplet');
  }
  if (!opts.force && hasValidCache(contact)) {
    return { hd: contact.chartHd, astro: contact.chartAstro, fromCache: true };
  }

  var result = await fetchChartForBirth(contact, opts);
  contact.birthTimezone = result.timezone;
  if (result.lat != null) contact.birthLat = result.lat;
  if (result.lon != null) contact.birthLon = result.lon;
  storeChart(contact, result.hd, result.astro);
  return { hd: result.hd, astro: result.astro, fromCache: false };
}

/**
 * Chart partenaire — stocké sur contact.partnerChartHd / partnerChartAstro.
 */
async function ensurePartnerChart(contact, opts) {
  opts = opts || {};
  if (!contact || !profile.isPartnerComplete(contact)) {
    throw new Error('Profil partenaire incomplet');
  }
  if (!opts.force && hasValidPartnerCache(contact)) {
    return {
      hd: contact.partnerChartHd,
      astro: contact.partnerChartAstro,
      fromCache: true
    };
  }

  var person = profile.partnerAsContact(contact);
  var result = await fetchChartForBirth(person, opts);
  contact.partnerBirthTimezone = result.timezone;
  if (result.lat != null) contact.partnerBirthLat = result.lat;
  if (result.lon != null) contact.partnerBirthLon = result.lon;
  storePartnerChart(contact, result.hd, result.astro);
  return { hd: result.hd, astro: result.astro, fromCache: false };
}

module.exports = {
  fingerprint,
  partnerFingerprint,
  hasValidCache,
  hasValidPartnerCache,
  storeChart,
  storePartnerChart,
  ensureChart,
  ensurePartnerChart
};
