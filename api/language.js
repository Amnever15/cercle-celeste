/**
 * Langues app + manuscrits (ISO 639-1).
 * Utilisé par login/profil, prompts Claude et HTML (RTL hébreu/arabe).
 */

const LANGS = [
  { code: 'fr', label: 'Français', nameEn: 'French', native: 'Français' },
  { code: 'en', label: 'English', nameEn: 'English', native: 'English' },
  { code: 'es', label: 'Español', nameEn: 'Spanish', native: 'Español' },
  { code: 'he', label: 'עברית', nameEn: 'Hebrew', native: 'עברית', rtl: true },
  { code: 'pt', label: 'Português', nameEn: 'Portuguese', native: 'Português' },
  { code: 'de', label: 'Deutsch', nameEn: 'German', native: 'Deutsch' },
  { code: 'it', label: 'Italiano', nameEn: 'Italian', native: 'Italiano' },
  { code: 'ar', label: 'العربية', nameEn: 'Arabic', native: 'العربية', rtl: true },
  { code: 'zh', label: '中文', nameEn: 'Chinese', native: '中文' },
  { code: 'ja', label: '日本語', nameEn: 'Japanese', native: '日本語' },
  { code: 'ru', label: 'Русский', nameEn: 'Russian', native: 'Русский' },
  { code: 'hi', label: 'हिन्दी', nameEn: 'Hindi', native: 'हिन्दी' },
  { code: 'nl', label: 'Nederlands', nameEn: 'Dutch', native: 'Nederlands' },
  { code: 'pl', label: 'Polski', nameEn: 'Polish', native: 'Polski' },
  { code: 'tr', label: 'Türkçe', nameEn: 'Turkish', native: 'Türkçe' },
  { code: 'ko', label: '한국어', nameEn: 'Korean', native: '한국어' }
];

const BY_CODE = {};
LANGS.forEach(function (L) { BY_CODE[L.code] = L; });

const DEFAULT = 'fr';

function normalize(code) {
  var raw = String(code == null ? '' : code).trim().toLowerCase().replace(/_/g, '-');
  if (!raw) return DEFAULT;
  var primary = raw.split('-')[0];
  /* zh-CN / zh-TW → zh */
  if (primary === 'zh') return 'zh';
  if (BY_CODE[primary]) return primary;
  return DEFAULT;
}

function meta(code) {
  return BY_CODE[normalize(code)] || BY_CODE[DEFAULT];
}

function isRtl(code) {
  return !!(meta(code).rtl);
}

function labelOf(code) {
  var m = meta(code);
  return m.native || m.label || m.nameEn;
}

/**
 * Instruction langue pour prompts Claude.
 * @param {string} code
 * @param {{ couple?: boolean }} opts
 */
function promptInstruction(code, opts) {
  opts = opts || {};
  var m = meta(code);
  var name = m.nameEn;
  var native = m.native;
  var address = opts.couple
    ? 'Address the couple with the natural plural “you” of that language (vous/ustedes/etc.).'
    : 'Use the natural informal second person of that language when appropriate (tu / you / tú / etc.).';
  return (
    'CRITICAL LANGUAGE RULE: Write the ENTIRE output in ' + name +
    ' (' + native + ', ISO ' + m.code + '). ' +
    'Do not mix languages. Section titles, insights, rituals, affirmations and JSON string values must all be in ' +
    name + '. ' + address +
    ' Keep a warm, intimate, poetic tone — never marketing, never mention AI/API/models/prompts.'
  );
}

function ofContact(c) {
  if (!c) return DEFAULT;
  return normalize(c.language || c.locale);
}

module.exports = {
  LANGS,
  DEFAULT,
  normalize,
  meta,
  isRtl,
  labelOf,
  promptInstruction,
  ofContact
};
