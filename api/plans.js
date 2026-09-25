/**
 * Offres + quota IA (messages / mois civil, par contact).
 *
 *   Gratuit : 3 / mois
 *   Céleste : 10 / mois
 *   Divin   : 200 / mois
 *   Divin+  : 500 / mois (upsell +44 € / mois, tag Systeme.io — garde les droits Divin)
 *
 * Texte + Mode IA live partagent le même pool iaUsed.
 *
 * Message IA (Claude Sonnet 5, sept. 2026) :
 *   $2 / MTok in, $10 / MTok out — https://platform.claude.com/docs/en/about-claude/pricing
 *   8 000 tokens in + 500 tokens out = $0.021
 *   × 0.86 €/$ = 0,018 €  |  ×2 sécurité = 0,036 € / message
 *   Budget max (50 % × 137 €) = 68,50 € → ~1 900 messages possibles
 *   Quota Divin = 200 / mois ; Divin+ = 500 / mois
 *
 * OpenAI TTS (bulles + manuscrits) : réservé au Divin (canOpenAiTts).
 */
const IA_COST_EUR = 0.036;
const IA_BUDGET_SHARE = 0.5;
/** OpenAI TTS-1 ≈ $15 / 1M chars → 180k chars/mois ≈ $2,70 / user Divin. */
const TTS_CHARS_MONTH = 180000;
const TTS_MAX_CHARS = 4000;
/** Upsell Divin+ : plafond IA mensuel (texte + live). */
const DIVIN_PLUS_IA_QUOTA = 500;
const DIVIN_PLUS_PRICE = 44;
/** Tag Systeme.io exact (après fold accents) : "App Plan Divin PLUS - en cours" */
const DIVIN_PLUS_TAG_CANON = 'app plan divin plus - en cours';
const profile = require('./profile');

const PLANS = {
  gratuit: {
    id: 'gratuit',
    label: 'Gratuit',
    price: 0,
    natal: false,
    couple: false,
    ultime: 'never',
    dailyLimit: 5,
    monthlyLimitYear: 1,
    ia: true,
    iaQuota: 3
  },
  celeste: {
    id: 'celeste',
    label: 'Céleste',
    price: 59,
    natal: true,
    couple: false,
    ultime: 'after6',
    dailyLimit: null,
    monthlyLimitYear: null,
    ia: true,
    iaQuota: 10
  },
  divin: {
    id: 'divin',
    label: 'Divin',
    price: 137,
    natal: true,
    couple: true,
    ultime: 'now',
    dailyLimit: null,
    monthlyLimitYear: null,
    ia: true,
    iaQuota: 200
  }
};

const ULTIME_MONTHS = 6;
/** Mois Divin payés requis pour débloquer le téléchargement de tous les manuscrits. */
const DOWNLOAD_UNLOCK_MONTHS = 2;

function planOf(id) {
  return PLANS[id] || PLANS.gratuit;
}

function foldAccents(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function tagItemName(item) {
  if (item == null || item === '') return '';
  if (typeof item === 'string' || typeof item === 'number') return String(item).trim();
  if (typeof item !== 'object') return '';
  var n = item.name || item.label || item.title || item.value || item.text || item.tagName || item.tag_name;
  if (n && typeof n !== 'object') return String(n).trim();
  if (typeof item.tag === 'string' || typeof item.tag === 'number') return String(item.tag).trim();
  return '';
}

function pushTagName(out, seen, name) {
  var n = String(name || '').trim();
  if (!n) return;
  var key = foldAccents(n);
  if (!key || seen[key]) return;
  seen[key] = true;
  out.push(n);
}

function addTagValue(out, seen, raw, depth) {
  if (raw == null || raw === '' || depth > 6) return;
  if (Array.isArray(raw)) {
    raw.forEach(function (item) { addTagValue(out, seen, item, depth + 1); });
    return;
  }
  if (typeof raw === 'string') {
    var s = raw.trim();
    if (!s) return;
    if (s.charAt(0) === '[' || s.charAt(0) === '{') {
      try {
        addTagValue(out, seen, JSON.parse(s), depth + 1);
        return;
      } catch (e) { /* texte brut */ }
    }
    if (s.indexOf(',') >= 0) {
      s.split(',').forEach(function (part) { pushTagName(out, seen, part); });
      return;
    }
    pushTagName(out, seen, s);
    return;
  }
  if (typeof raw === 'object') {
    if (raw.tags != null) addTagValue(out, seen, raw.tags, depth + 1);
    if (raw.tag_names != null) addTagValue(out, seen, raw.tag_names, depth + 1);
    var n = tagItemName(raw);
    if (n) pushTagName(out, seen, n);
  }
}

function fieldsHaveTagsKey(fields) {
  if (!fields) return false;
  if (fields.tags != null || fields.tag != null) return true;
  if (!Array.isArray(fields)) return false;
  for (var i = 0; i < fields.length; i++) {
    var f = fields[i];
    if (!f || typeof f !== 'object') continue;
    var key = foldAccents(f.slug || f.field || f.name || f.key || '');
    if (key === 'tags' || key === 'tag') return true;
  }
  return false;
}

function collectFromFields(out, seen, fields) {
  if (!fields) return;
  if (fields.tags != null) addTagValue(out, seen, fields.tags, 0);
  if (fields.tag != null) addTagValue(out, seen, fields.tag, 0);
  if (!Array.isArray(fields)) return;
  fields.forEach(function (f) {
    if (!f || typeof f !== 'object') return;
    var key = foldAccents(f.slug || f.field || f.name || f.key || '');
    if (key === 'tags' || key === 'tag') {
      addTagValue(out, seen, f.value != null ? f.value : (f.values || f.tags || f.tag), 0);
    }
  });
}

function hasTagContainer(body) {
  if (!body || typeof body !== 'object') return false;
  if (body.tags != null || body.tag != null || body.tagName != null || body.tag_name != null) return true;
  if (body.removedTag != null || body.removed_tag != null || body.addedTag != null) return true;
  var c = body.contact || body.data || body.payload || body.customer;
  if (c && typeof c === 'object') {
    if (c.tags != null || c.tag != null || c.tag_names != null) return true;
    if (c.fields && fieldsHaveTagsKey(c.fields)) return true;
    if (c.contact && typeof c.contact === 'object') {
      if (c.contact.tags != null || c.contact.tag != null || c.contact.tag_names != null) return true;
      if (c.contact.fields && fieldsHaveTagsKey(c.contact.fields)) return true;
    }
  }
  if (body.fields && fieldsHaveTagsKey(body.fields)) return true;
  if (body.data && body.data.contact && (body.data.contact.tags != null || body.data.contact.tag != null)) return true;
  return false;
}

function collectTags(body) {
  var out = [];
  var seen = {};
  if (!body || typeof body !== 'object') return out;
  addTagValue(out, seen, body.tags, 0);
  addTagValue(out, seen, body.tag, 0);
  addTagValue(out, seen, body.tagName || body.tag_name, 0);
  addTagValue(out, seen, body.tag_names, 0);
  addTagValue(out, seen, body.addedTag || body.added_tag, 0);
  addTagValue(out, seen, body.removedTag || body.removed_tag, 0);
  var roots = [
    body.contact,
    body.contact && body.contact.contact,
    body.customer,
    body.data,
    body.payload,
    body.data && body.data.contact,
    body.data && body.data.customer,
    body.payload && body.payload.customer
  ];
  roots.forEach(function (root) {
    if (!root || typeof root !== 'object') return;
    addTagValue(out, seen, root.tags, 0);
    addTagValue(out, seen, root.tag, 0);
    addTagValue(out, seen, root.tag_names, 0);
    collectFromFields(out, seen, root.fields);
  });
  if (body.orderItem && Array.isArray(body.orderItem.resources)) {
    body.orderItem.resources.forEach(function (res) {
      if (res && res.tag) addTagValue(out, seen, res.tag, 0);
    });
  }
  collectFromFields(out, seen, body.fields);
  if (body.contact && body.contact.fields) collectFromFields(out, seen, body.contact.fields);
  return out;
}

function eventLooksLikeTagRemoval(body) {
  var named = String(
    (body && (body.event || body.type || body.name || body.trigger || body.action)) || ''
  ).toUpperCase();
  return /TAG_REMOVED|CONTACT_TAG_REMOVED|TAG.?REMOVE|UNTAG/.test(named);
}

function collectRemovedTagNames(body) {
  var out = [];
  var seen = {};
  if (!body || typeof body !== 'object') return out;
  addTagValue(out, seen, body.removedTag || body.removed_tag, 0);
  addTagValue(out, seen, body.removedTags || body.removed_tags, 0);
  if (eventLooksLikeTagRemoval(body)) {
    addTagValue(out, seen, body.tag, 0);
    addTagValue(out, seen, body.tagName || body.tag_name, 0);
    if (body.contact) addTagValue(out, seen, body.contact.tag, 0);
  }
  return out;
}

function isDivinPlusName(f) {
  if (!f) return false;
  if (f === DIVIN_PLUS_TAG_CANON) return true;
  if (f.indexOf('app plan divin plus') >= 0) return true;
  if (f.indexOf('app plan divin+') >= 0) return true;
  if (f.indexOf('plan divin plus') >= 0 && f.indexOf('en cours') >= 0) return true;
  if (f.indexOf('plan divin+') >= 0 && f.indexOf('en cours') >= 0) return true;
  return false;
}

function isPlanTag(name, plan) {
  var f = foldAccents(name);
  if (!f) return false;
  if (plan === 'divinPlus') return isDivinPlusName(f);
  if (plan === 'divin') {
    /* Ne pas confondre le tag Divin+ avec le plan Divin de base. */
    if (isDivinPlusName(f)) return false;
    if (f === 'app plan divin - en cours') return true;
    if (f.indexOf('app plan divin') >= 0) return true;
    return f.indexOf('plan divin') >= 0 && f.indexOf('en cours') >= 0;
  }
  if (plan === 'celeste') {
    if (f === 'app plan celeste - en cours') return true;
    if (f.indexOf('app plan celeste') >= 0) return true;
    return f.indexOf('plan celeste') >= 0 && f.indexOf('en cours') >= 0;
  }
  return false;
}

function looksLikeDivinPlusProduct(body) {
  if (!body || typeof body !== 'object') return false;
  var blob = foldAccents(JSON.stringify(body));
  return /divin\s*\+|divin\s*plus|divine\s*plus|app-divine-plus/.test(blob);
}

function inspectTags(body) {
  var raw = collectTags(body);
  var removed = collectRemovedTagNames(body);
  var removedKeys = {};
  removed.forEach(function (n) { removedKeys[foldAccents(n)] = true; });
  var tags = raw.filter(function (n) { return !removedKeys[foldAccents(n)]; });
  var hasDivinPlus = tags.some(function (n) { return isPlanTag(n, 'divinPlus'); });
  var hasDivin = tags.some(function (n) { return isPlanTag(n, 'divin'); });
  var hasCeleste = tags.some(function (n) { return isPlanTag(n, 'celeste'); });
  var removedDivinPlus = removed.some(function (n) { return isPlanTag(n, 'divinPlus'); });
  var plan = '';
  if (hasDivin) plan = 'divin';
  else if (hasCeleste) plan = 'celeste';
  return {
    tags: tags,
    rawTags: raw,
    removedTags: removed,
    hasDivin: hasDivin,
    hasCeleste: hasCeleste,
    hasDivinPlus: hasDivinPlus,
    removedDivinPlus: removedDivinPlus,
    plan: plan,
    active: !!(hasDivin || hasCeleste),
    sawTagField: hasTagContainer(body) || raw.length > 0 || removed.length > 0
  };
}

function detectPlanFallback(body) {
  if (!body || typeof body !== 'object') return '';
  /* Unwrap legacy workflow wrapper { type, data: { customer, pricePlan… } } */
  var root = body.data && (body.data.customer || body.data.pricePlan || body.data.order)
    ? body.data
    : body;
  var blob = JSON.stringify(root || {}).toLowerCase();
  if (/divin/.test(blob)) return 'divin';
  if (/c[eé]leste/.test(blob)) return 'celeste';
  var amount = Number(
    root.amount || root.price ||
    (root.order && (root.order.amount || root.order.totalPrice)) ||
    (root.pricePlan && (root.pricePlan.price || root.pricePlan.amount)) || 0
  );
  if (amount >= 130 && amount <= 150) return 'divin';
  if (amount >= 50 && amount <= 70) return 'celeste';
  if (amount >= 13000 && amount <= 15000) return 'divin';
  if (amount >= 5900 && amount <= 7000) return 'celeste';
  var planName = foldAccents(
    (root.pricePlan && (root.pricePlan.name || root.pricePlan.innerName)) || ''
  );
  if (/divin/.test(planName)) return 'divin';
  if (/celeste/.test(planName)) return 'celeste';
  return '';
}

function detectPlan(body) {
  var fromTags = inspectTags(body);
  if (fromTags.plan) return fromTags.plan;
  return detectPlanFallback(body);
}

function demoPlanFromEmail(email) {
  const e = String(email || '').toLowerCase();
  if (e.indexOf('divin') >= 0) return 'divin';
  if (e.indexOf('gratuit') >= 0 || e.indexOf('free') >= 0) return 'gratuit';
  return 'celeste';
}

function monthStamp() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function yearStamp() {
  return new Date().getFullYear();
}

function rollUsage(c) {
  const m = monthStamp();
  const y = yearStamp();
  if (c.usageMonth !== m) {
    c.usageMonth = m;
    c.dailyUsed = 0;
    c.iaUsed = 0;
    c.ttsCharsUsed = 0;
  }
  if (c.usageYear !== y) {
    c.usageYear = y;
    c.monthlyUsed = 0;
  }
  /* Quota couple : 1 / mois civil (coupleUsedMonth). */
  if (c.coupleUsedMonth && c.coupleUsedMonth !== m) {
    c.coupleUsed = 0;
  }
}

function isPaidPlanId(id) {
  return id === 'celeste' || id === 'divin';
}

function rememberPaidPlan(c, planId) {
  if (isPaidPlanId(planId)) c.lastPaidPlan = planId;
}

/**
 * Annulation / pause : on garde le libellé Céleste/Divin (ou lastPaidPlan),
 * active=false, droits = Gratuit. Jamais de downgrade plan → gratuit.
 */
function revokePlan(c) {
  if (isPaidPlanId(c.plan)) c.lastPaidPlan = c.plan;
  else if (isPaidPlanId(c.lastPaidPlan)) c.plan = c.lastPaidPlan;
  else if ((c.monthsPaid || 0) > 0) {
    c.plan = 'celeste';
    c.lastPaidPlan = 'celeste';
  }
  c.active = false;
  c.divinPlus = false;
  c.canceledAt = new Date().toISOString();
  applyPlan(c);
}

/** Active / retire l’upsell Divin+ sans toucher au plan de base. */
function applyDivinPlus(c, on) {
  if (!c) return;
  c.divinPlus = !!on;
}

function applyPlan(c, planId) {
  if (planId && PLANS[planId]) c.plan = planId;
  if (isPaidPlanId(c.plan)) c.lastPaidPlan = c.plan;
  /* Compte qui a déjà payé : ne jamais afficher « Gratuit » comme plan d’abo. */
  if ((!c.plan || c.plan === 'gratuit') && ((c.monthsPaid || 0) > 0 || isPaidPlanId(c.lastPaidPlan))) {
    c.plan = isPaidPlanId(c.lastPaidPlan) ? c.lastPaidPlan : 'celeste';
  }
  if (!c.plan) c.plan = (c.monthsPaid > 0) ? 'celeste' : 'gratuit';
  const p = planOf(c.plan);
  if (p.ultime === 'now' && c.active) c.ultimeUnlocked = true;
  else if (p.ultime === 'never') c.ultimeUnlocked = false;
  else c.ultimeUnlocked = (c.monthsPaid || 0) >= ULTIME_MONTHS;
}

function wasEverPaid(c) {
  if (!c) return false;
  return isPaidPlanId(c.plan) || isPaidPlanId(c.lastPaidPlan) || (c.monthsPaid || 0) > 0;
}

function entitlements(c) {
  if (!c) {
    return Object.assign({
      exists: false,
      active: false,
      plan: 'gratuit',
      planLabel: PLANS.gratuit.label,
      price: 0,
      monthsPaid: 0,
      divinMonthsPaid: 0,
      lastPaidPlan: null,
      ultimeUnlocked: false,
      need: ULTIME_MONTHS,
      monthsLeft: ULTIME_MONTHS,
      downloadNeed: DOWNLOAD_UNLOCK_MONTHS,
      downloadMonthsLeft: DOWNLOAD_UNLOCK_MONTHS,
      canDownloadAll: false,
      showDownload: false,
      canNatal: false,
      canCouple: false,
      canUltime: false,
      canIa: false,
      canOpenAiTts: false,
      dailyLimit: 5,
      dailyUsed: 0,
      dailyLeft: 5,
      monthlyLimitYear: 1,
      monthlyUsed: 0,
      monthlyLeft: 1,
      coupleLimit: 1,
      coupleUsed: 0,
      coupleLeft: 0,
      coupleUsedMonth: null,
      iaQuota: 0,
      iaUsed: 0,
      iaLeft: 0,
      divinPlus: false,
      iaCostEur: IA_COST_EUR,
      ttsCharsQuota: 0,
      ttsCharsUsed: 0,
      ttsCharsLeft: 0
    }, profile.profileFields(null));
  }
  applyPlan(c);
  rollUsage(c);
  const p = planOf(c.plan);
  const free = PLANS.gratuit;
  const pureFree = p.id === 'gratuit' && !wasEverPaid(c);
  /* Gratuit pur = toujours « actif » (pas de notion de pause). Sinon c.active. */
  const active = pureFree ? true : !!c.active;
  /* Abo payé en pause/annulé : libellé Céleste/Divin, droits Gratuit, mois Ultime conservés. */
  const pausedPaid = !active && wasEverPaid(c);
  const dailyLimit = pausedPaid ? free.dailyLimit : p.dailyLimit;
  const monthlyLimitYear = pausedPaid ? free.monthlyLimitYear : p.monthlyLimitYear;
  /* Divin+ : upsell IA (500) tant que Divin est actif ; sinon tombe au quota du plan. */
  const divinPlus = !pausedPaid && !!c.divinPlus && p.id === 'divin' && active;
  /* IA : tous les plans avec quota > 0 ; en pause → quotas Gratuit. */
  var iaQuota = pausedPaid ? free.iaQuota : (p.iaQuota || 0);
  if (divinPlus) iaQuota = DIVIN_PLUS_IA_QUOTA;
  const canNatal = pausedPaid ? false : !!(p.natal && active);
  const canCouple = pausedPaid ? false : !!(p.couple && active);
  const canUltime = pausedPaid ? false : !!(c.ultimeUnlocked && active);
  const canIa = iaQuota > 0 && (pureFree || active || pausedPaid);
  /* Voix OpenAI (bulles + manuscrits) + sélecteur de voix : Divin actif uniquement. */
  const canOpenAiTts = !pausedPaid && p.id === 'divin' && active;
  var divinMonths = c.divinMonthsPaid || 0;
  /* Soft count : Divin actif déjà payé au moins 1 fois → au minimum mois 1 (décompte visible). */
  if (divinMonths === 0 && p.id === 'divin' && active && (c.monthsPaid || 0) >= 1) {
    divinMonths = 1;
  }
  const showDownload = p.id === 'divin' || c.lastPaidPlan === 'divin';
  const canDownloadAll = !pausedPaid && p.id === 'divin' && active && divinMonths >= DOWNLOAD_UNLOCK_MONTHS;
  const downloadMonthsLeft = Math.max(0, DOWNLOAD_UNLOCK_MONTHS - divinMonths);
  const dailyLeft = dailyLimit == null ? null : Math.max(0, dailyLimit - (c.dailyUsed || 0));
  const monthlyLeft = monthlyLimitYear == null ? null : Math.max(0, monthlyLimitYear - (c.monthlyUsed || 0));
  const m = monthStamp();
  const coupleLimit = canCouple ? 1 : 0;
  const coupleUsedThisMonth = (c.coupleUsedMonth === m) ? (c.coupleUsed || 0) : 0;
  const coupleLeft = canCouple ? Math.max(0, coupleLimit - coupleUsedThisMonth) : 0;
  const iaLeft = canIa ? Math.max(0, iaQuota - (c.iaUsed || 0)) : 0;
  const ttsCharsQuota = canOpenAiTts ? TTS_CHARS_MONTH : 0;
  const ttsCharsUsed = canOpenAiTts ? (c.ttsCharsUsed || 0) : 0;
  const ttsCharsLeft = canOpenAiTts ? Math.max(0, ttsCharsQuota - ttsCharsUsed) : 0;
  return Object.assign({
    exists: true,
    email: c.email,
    prenom: c.prenom,
    nom: c.nom,
    active: active,
    plan: p.id,
    planLabel: p.label,
    price: p.price,
    monthsPaid: c.monthsPaid || 0,
    divinMonthsPaid: divinMonths,
    lastPaidPlan: isPaidPlanId(c.lastPaidPlan) ? c.lastPaidPlan : (isPaidPlanId(p.id) ? p.id : null),
    ultimeUnlocked: !!c.ultimeUnlocked,
    need: ULTIME_MONTHS,
    monthsLeft: Math.max(0, ULTIME_MONTHS - (c.monthsPaid || 0)),
    downloadNeed: DOWNLOAD_UNLOCK_MONTHS,
    downloadMonthsLeft: downloadMonthsLeft,
    canDownloadAll: canDownloadAll,
    showDownload: showDownload,
    canNatal: canNatal,
    canCouple: canCouple,
    canUltime: canUltime,
    canIa: canIa,
    canOpenAiTts: canOpenAiTts,
    dailyLimit: dailyLimit,
    dailyUsed: c.dailyUsed || 0,
    dailyLeft: dailyLeft,
    monthlyLimitYear: monthlyLimitYear,
    monthlyUsed: c.monthlyUsed || 0,
    monthlyLeft: monthlyLeft,
    coupleLimit: coupleLimit,
    coupleUsed: coupleUsedThisMonth,
    coupleLeft: coupleLeft,
    coupleUsedMonth: c.coupleUsedMonth || null,
    iaQuota: iaQuota,
    iaUsed: c.iaUsed || 0,
    iaLeft: iaLeft,
    divinPlus: divinPlus,
    iaCostEur: IA_COST_EUR,
    ttsCharsQuota: ttsCharsQuota,
    ttsCharsUsed: ttsCharsUsed,
    ttsCharsLeft: ttsCharsLeft
  }, profile.profileFields(c));
}

function canGenerate(c, kind) {
  const e = entitlements(c);
  const paused = e.active === false && wasEverPaid(c);
  if (kind === 'natal' && !e.canNatal) {
    return {
      ok: false,
      error: paused
        ? 'Abonnement en pause : le manuscrit natal se rouvre dès que tu reprends. En attendant, utilise les quotas Gratuit (jour / mois).'
        : 'Le manuscrit de 28 pages est dans le plan Céleste.'
    };
  }
  if (kind === 'couple') {
    if (!e.canCouple) {
      return {
        ok: false,
        error: paused
          ? 'Abonnement en pause : le manuscrit de couple se rouvre dès que tu reprends le Divin.'
          : 'Le manuscrit de couple est réservé au plan Divin.'
      };
    }
    if (e.coupleLeft === 0) {
      return {
        ok: false,
        error: 'Ton manuscrit de couple de ce mois est déjà écrit. Relis-le, ou reviens le mois prochain.'
      };
    }
  }
  if (kind === 'ultime' && !e.canUltime) {
    return {
      ok: false,
      error: paused
        ? 'Abonnement en pause : le Manuscrit Ultime se rouvre dès que tu reprends. Tes mois payés sont conservés.'
        : 'Le Manuscrit Ultime s’ouvre après 6 mois Céleste, ou tout de suite en Divin.'
    };
  }
  if (kind === 'jour' && e.dailyLeft === 0) return { ok: false, error: 'Tes 5 manuscrits du jour de ce mois sont utilisés. Reviens le mois prochain, ou passe Céleste.' };
  if (kind === 'mois' && e.monthlyLeft === 0) return { ok: false, error: 'Ton manuscrit mensuel de l’année est déjà écrit. Reviens l’an prochain, ou passe Céleste.' };
  return { ok: true };
}

function consumeGenerate(c, kind) {
  rollUsage(c);
  const e = entitlements(c);
  if (kind === 'jour' && e.dailyLimit != null) c.dailyUsed = (c.dailyUsed || 0) + 1;
  if (kind === 'mois' && e.monthlyLimitYear != null) c.monthlyUsed = (c.monthlyUsed || 0) + 1;
  if (kind === 'couple') {
    c.coupleUsed = 1;
    c.coupleUsedMonth = monthStamp();
  }
}

function iaQuotaExceededError(e) {
  const planId = (e && e.plan) || 'gratuit';
  if (planId === 'divin') {
    if (e && e.divinPlus) {
      return {
        error: 'Tu as utilisé tes 500 messages IA Divin+ de ce mois. Reviens le 1er pour un nouveau ciel.',
        code: 'IA_QUOTA',
        upgrade: null
      };
    }
    return {
      error: 'Tu as utilisé tes 200 messages IA de ce mois. Passe Divin+ pour 500 messages / mois (+44 €), ou reviens le 1er.',
      code: 'IA_QUOTA',
      upgrade: 'divinPlus'
    };
  }
  if (planId === 'celeste') {
    return {
      error: 'Tu as utilisé tes 10 messages IA de ce mois. Passe Divin pour 200 messages / mois, ou reviens le 1er.',
      code: 'IA_QUOTA',
      upgrade: 'divin'
    };
  }
  return {
    error: 'Tu as utilisé tes 3 messages IA gratuits de ce mois. Passe Céleste (10) ou Divin (200) pour continuer, ou reviens le 1er.',
    code: 'IA_QUOTA',
    upgrade: 'celeste'
  };
}

function consumeIa(c) {
  rollUsage(c);
  const e = entitlements(c);
  if (!e.canIa) {
    return {
      ok: false,
      error: 'L’IA Céleste n’est pas disponible sur ce compte pour le moment.',
      code: 'IA_LOCKED'
    };
  }
  if (e.iaLeft <= 0) {
    const q = iaQuotaExceededError(e);
    return { ok: false, error: q.error, code: q.code, upgrade: q.upgrade || null };
  }
  c.iaUsed = (c.iaUsed || 0) + 1;
  return { ok: true };
}

function consumeTts(c, charCount) {
  rollUsage(c);
  const e = entitlements(c);
  if (!e.canOpenAiTts) return { ok: false, error: 'La voix Céleste (OpenAI) est réservée au plan Divin.' };
  const n = Math.max(0, Math.floor(Number(charCount) || 0));
  if (n <= 0) return { ok: false, error: 'Texte vide.' };
  if (e.ttsCharsLeft < n) {
    return {
      ok: false,
      error: 'Quota voix du mois atteint. Reviens le 1er, ou écoute avec la voix du navigateur.'
    };
  }
  c.ttsCharsUsed = (c.ttsCharsUsed || 0) + n;
  return { ok: true, used: c.ttsCharsUsed, left: Math.max(0, TTS_CHARS_MONTH - c.ttsCharsUsed) };
}

module.exports = {
  PLANS,
  ULTIME_MONTHS,
  DOWNLOAD_UNLOCK_MONTHS,
  IA_COST_EUR,
  IA_BUDGET_SHARE,
  TTS_CHARS_MONTH,
  TTS_MAX_CHARS,
  DIVIN_PLUS_IA_QUOTA,
  DIVIN_PLUS_PRICE,
  DIVIN_PLUS_TAG_CANON,
  planOf,
  detectPlan,
  detectPlanFallback,
  collectTags,
  inspectTags,
  isPlanTag,
  looksLikeDivinPlusProduct,
  demoPlanFromEmail,
  applyPlan,
  applyDivinPlus,
  revokePlan,
  rememberPaidPlan,
  isPaidPlanId,
  wasEverPaid,
  entitlements,
  canGenerate,
  consumeGenerate,
  consumeIa,
  consumeTts,
  iaQuotaExceededError,
  rollUsage
};
