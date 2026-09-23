/**
 * Offres + quota IA.
 *
 * Message IA (Claude Sonnet 5, sept. 2026) :
 *   $2 / MTok in, $10 / MTok out — https://platform.claude.com/docs/en/about-claude/pricing
 *   8 000 tokens in + 500 tokens out = $0.021
 *   × 0.86 €/$ = 0,018 €  |  ×2 sécurité = 0,036 € / message
 *   Budget max (50 % × 137 €) = 68,50 € → ~1 900 messages possibles
 *   Quota produit = 500 / mois (assez large, et safe même en grosse promo)
 */
const IA_COST_EUR = 0.036;
const IA_BUDGET_SHARE = 0.5;

const PLANS = {
  gratuit: {
    id: 'gratuit',
    label: 'Gratuit',
    price: 0,
    natal: false,
    ultime: 'never',
    dailyLimit: 5,
    monthlyLimitYear: 1,
    ia: false,
    iaQuota: 0
  },
  celeste: {
    id: 'celeste',
    label: 'Céleste',
    price: 59,
    natal: true,
    ultime: 'after6',
    dailyLimit: null,
    monthlyLimitYear: null,
    ia: false,
    iaQuota: 0
  },
  divin: {
    id: 'divin',
    label: 'Divin',
    price: 137,
    natal: true,
    ultime: 'now',
    dailyLimit: null,
    monthlyLimitYear: null,
    ia: true,
    iaQuota: 500
  }
};

const ULTIME_MONTHS = 6;

function planOf(id) {
  return PLANS[id] || PLANS.gratuit;
}

function detectPlan(body) {
  const blob = JSON.stringify(body || {}).toLowerCase();
  if (/divin/.test(blob)) return 'divin';
  if (/c[eé]leste/.test(blob)) return 'celeste';
  const amount = Number(
    body.amount || body.price || (body.order && body.order.amount) ||
    (body.pricePlan && (body.pricePlan.price || body.pricePlan.amount)) || 0
  );
  if (amount >= 130 && amount <= 150) return 'divin';
  if (amount >= 50 && amount <= 70) return 'celeste';
  if (amount >= 13000 && amount <= 15000) return 'divin';
  if (amount >= 5900 && amount <= 7000) return 'celeste';
  return '';
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
  }
  if (c.usageYear !== y) {
    c.usageYear = y;
    c.monthlyUsed = 0;
  }
}

function applyPlan(c, planId) {
  if (planId && PLANS[planId]) c.plan = planId;
  if (!c.plan) c.plan = (c.monthsPaid > 0) ? 'celeste' : 'gratuit';
  const p = planOf(c.plan);
  if (p.ultime === 'now' && c.active) c.ultimeUnlocked = true;
  else if (p.ultime === 'never') c.ultimeUnlocked = false;
  else c.ultimeUnlocked = (c.monthsPaid || 0) >= ULTIME_MONTHS;
}

function entitlements(c) {
  if (!c) {
    return {
      exists: false,
      active: false,
      plan: 'gratuit',
      planLabel: PLANS.gratuit.label,
      price: 0,
      monthsPaid: 0,
      ultimeUnlocked: false,
      need: ULTIME_MONTHS,
      monthsLeft: ULTIME_MONTHS,
      canNatal: false,
      canUltime: false,
      canIa: false,
      dailyLimit: 5,
      dailyUsed: 0,
      dailyLeft: 5,
      monthlyLimitYear: 1,
      monthlyUsed: 0,
      monthlyLeft: 1,
      iaQuota: 0,
      iaUsed: 0,
      iaLeft: 0,
      iaCostEur: IA_COST_EUR
    };
  }
  applyPlan(c);
  rollUsage(c);
  const p = planOf(c.plan);
  const active = p.id === 'gratuit' ? true : !!c.active;
  const dailyLeft = p.dailyLimit == null ? null : Math.max(0, p.dailyLimit - (c.dailyUsed || 0));
  const monthlyLeft = p.monthlyLimitYear == null ? null : Math.max(0, p.monthlyLimitYear - (c.monthlyUsed || 0));
  const iaLeft = p.ia ? Math.max(0, p.iaQuota - (c.iaUsed || 0)) : 0;
  return {
    exists: true,
    email: c.email,
    prenom: c.prenom,
    nom: c.nom,
    active: active,
    plan: p.id,
    planLabel: p.label,
    price: p.price,
    monthsPaid: c.monthsPaid || 0,
    ultimeUnlocked: !!c.ultimeUnlocked,
    need: ULTIME_MONTHS,
    monthsLeft: Math.max(0, ULTIME_MONTHS - (c.monthsPaid || 0)),
    canNatal: !!(p.natal && active),
    canUltime: !!(c.ultimeUnlocked && active),
    canIa: !!(p.ia && active),
    dailyLimit: p.dailyLimit,
    dailyUsed: c.dailyUsed || 0,
    dailyLeft: dailyLeft,
    monthlyLimitYear: p.monthlyLimitYear,
    monthlyUsed: c.monthlyUsed || 0,
    monthlyLeft: monthlyLeft,
    iaQuota: p.iaQuota,
    iaUsed: c.iaUsed || 0,
    iaLeft: iaLeft,
    iaCostEur: IA_COST_EUR
  };
}

function canGenerate(c, kind) {
  const e = entitlements(c);
  if (!e.active && e.plan !== 'gratuit') return { ok: false, error: 'Abonnement inactif.' };
  if (kind === 'natal' && !e.canNatal) return { ok: false, error: 'Le manuscrit de 28 pages est dans le plan Céleste.' };
  if (kind === 'ultime' && !e.canUltime) return { ok: false, error: 'L’Ultime s’ouvre après 6 mois Céleste, ou tout de suite en Divin.' };
  if (kind === 'jour' && e.dailyLeft === 0) return { ok: false, error: 'Tes 5 manuscrits du jour de ce mois sont utilisés. Reviens le mois prochain, ou passe Céleste.' };
  if (kind === 'mois' && e.monthlyLeft === 0) return { ok: false, error: 'Ton manuscrit mensuel de l’année est déjà écrit. Reviens l’an prochain, ou passe Céleste.' };
  return { ok: true };
}

function consumeGenerate(c, kind) {
  rollUsage(c);
  if (kind === 'jour' && planOf(c.plan).dailyLimit != null) c.dailyUsed = (c.dailyUsed || 0) + 1;
  if (kind === 'mois' && planOf(c.plan).monthlyLimitYear != null) c.monthlyUsed = (c.monthlyUsed || 0) + 1;
}

function consumeIa(c) {
  const e = entitlements(c);
  if (!e.canIa) return { ok: false, error: 'L’IA Céleste est réservée au plan Divin.' };
  if (e.iaLeft <= 0) return { ok: false, error: 'Quota du mois atteint (500 questions). Il se réinitialise le 1er.' };
  c.iaUsed = (c.iaUsed || 0) + 1;
  return { ok: true };
}

module.exports = {
  PLANS,
  ULTIME_MONTHS,
  IA_COST_EUR,
  IA_BUDGET_SHARE,
  planOf,
  detectPlan,
  demoPlanFromEmail,
  applyPlan,
  entitlements,
  canGenerate,
  consumeGenerate,
  consumeIa,
  rollUsage
};
