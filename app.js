(function () {
  var API = '';

  /* Coller ici les URLs Systeme.io (checkout + portail client). */
  var PLAN_LINKS = {
    celesteCheckout: 'https://go.formations-spiritualite-energetique.com/app-manuscrits-celestes-checkout',
    divinCheckout: 'https://go.formations-spiritualite-energetique.com/app-divines-checkout',
    manageAbo: 'https://go.formations-spiritualite-energetique.com/dashboard/fr/profile/manage-subscriptions'
  };

  var NATAL = {
    pages: 28,
    kicker: 'Natal',
    intro: 'Les 28 pages de ton thème — toujours accessibles tant que ton abonnement est actif.',
    body: [
      'Ici s’ouvrira le manuscrit de 28 pages, écrit à partir de ta date, ton heure et ton lieu de naissance.',
      'Il ne change pas : c’est qui tu es. Tu le relis autant de fois que tu veux, tant que ton espace reste ouvert.',
      'Si tu quittes l’abonnement, ce coffre se ferme. Tes données restent ; le livre se rouvre dès que tu reviens.'
    ]
  };

  var MONTHLY = {
    pages: '8–12 pages',
    intro: 'Disponible tout le mois. Ton Manuscrit Céleste relatif au mois en cours. Comment tes étoiles parlent ce mois',
    body: [
      'Ce mois-ci, le ciel te demande de ne plus avancer dans le brouillard : attends le signal, puis réponds avec tout ton être.',
      'Saturne touche ta Maison X : ta vocation veut un cadre, pas une fuite en avant. Un seul engagement public suffit.',
      'Fenêtre de puissance : du 8 au 14 — pose une demande claire (projet, lieu, relation) sans forcer le rythme.',
      'La frustration est ton panneau stop. Si tu pousses sans invitation, tu t’épuises.'
    ]
  };

  var TODAY = {
    pages: '2–4 pages',
    intro: 'Ton Manuscrit Céleste relatif à cette journée en cours. Comment tes étoiles parlent AUJOURD\'HUI',
    body: [
      'Aujourd’hui, n’ouvre qu’une porte. Une conversation, un message, un pas visible — pas dix.',
      'Ton autorité émotionnelle te dit d’attendre la vague : si c’est agité à 10 h, ce n’est pas encore un oui.',
      'Ce soir, une phrase à écrire : « Qu’est-ce qui s’est ouvert sans que je force ? »'
    ]
  };

  var ULTIME = {
    pages: 140,
    need: 6
  };

  /* Sélection ville (Photon) — lat/lon/tz pour génération natal plus tard */
  var _birthGeo = {
    lat: null,
    lon: null,
    timezone: '',
    label: ''
  };

  var THEME_KEY = 'cercle.theme';
  var IA_MAX = 1000;
  var IA_LS_PREFIX = 'cercle.ia.';

  var state = {
    screen: 'login',
    tab: 'natal',
    user: null,
    deferredPrompt: null,
    pdf: null,
    account: false,
    iaBusy: false,
    iaLoaded: false,
    iaContext: 'natal',
    iaMessages: [],
    pendingAsk: null,
    natalPreview: null,
    natalGenError: null,
    theme: 'dark',
    editingBirth: false
  };

  function getStoredTheme() {
    try {
      var t = localStorage.getItem(THEME_KEY);
      return (t === 'light' || t === 'dark') ? t : 'dark';
    } catch (e) {
      return 'dark';
    }
  }

  function applyTheme(theme, persist) {
    var t = (theme === 'light') ? 'light' : 'dark';
    state.theme = t;
    document.documentElement.setAttribute('data-theme', t);
    var meta = document.getElementById('theme-color-meta');
    if (meta) meta.setAttribute('content', t === 'light' ? '#F4EFE4' : '#05020F');
    if (persist !== false) {
      try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
    }
  }

  function setTheme(theme) {
    applyTheme(theme, true);
    render();
  }

  function themeToggleHtml(compact) {
    var isLight = state.theme === 'light';
    if (compact) {
      return '<button type="button" class="theme-chip" id="theme-chip" aria-label="Changer le thème">' +
        (isLight ? 'BRIGHT' : 'SOMBRE') + '</button>';
    }
    return '<div class="theme-toggle" role="group" aria-label="Apparence">' +
      '<button type="button" data-theme-set="dark" class="' + (!isLight ? 'active' : '') + '">SOMBRE</button>' +
      '<button type="button" data-theme-set="light" class="' + (isLight ? 'active' : '') + '">BRIGHT</button>' +
      '</div>';
  }

  function load() {
    state.theme = getStoredTheme();
    applyTheme(state.theme, false);
    try { state.user = JSON.parse(localStorage.getItem('cercle.user') || 'null'); } catch (e) { state.user = null; }
    /* Ancienne session sans mot de passe / token → reconnexion obligatoire. */
    if (state.user && (!state.user.email || !state.user.token)) {
      state.user = null;
      try { localStorage.removeItem('cercle.user'); } catch (e2) {}
    }
    if (state.user) state.screen = localStorage.getItem('cercle.installedHint') ? 'app' : 'install';
  }
  function saveUser() {
    localStorage.setItem('cercle.user', JSON.stringify(state.user));
  }
  function authHeaders(json) {
    var h = {};
    if (json !== false) h['Content-Type'] = 'application/json';
    if (state.user && state.user.token) h.Authorization = 'Bearer ' + state.user.token;
    return h;
  }
  function withAuthQuery(url) {
    if (!state.user || !state.user.token) return url;
    var sep = url.indexOf('?') >= 0 ? '&' : '?';
    return url + sep + 'token=' + encodeURIComponent(state.user.token);
  }
  function forceReLogin(msg) {
    state.user = null;
    state.screen = 'login';
    state.account = false;
    state.pdf = null;
    try { localStorage.removeItem('cercle.user'); } catch (e) {}
    if (msg) alert(msg);
    render();
  }
  function applyAccess(d) {
    if (!d) return;
    var prevToken = state.user && state.user.token;
    state.user = Object.assign({}, state.user || {}, d);
    if (d.token) state.user.token = d.token;
    else if (prevToken) state.user.token = prevToken;
    syncProfileFlag();
    /* Ne pas garder un « Relire » local si le serveur n’a pas le fichier. */
    if (!natalCanRead()) clearNatalLocalBook();
    saveUser();
  }
  /** Recalcule profileComplete à partir des champs (évite un flag localStorage obsolète). */
  function syncProfileFlag() {
    if (!state.user) return;
    var u = state.user;
    var g = String(u.gender || '').trim().toLowerCase();
    var okGender = g === 'femme' || g === 'homme' || g === 'autre';
    u.profileComplete = !!(
      String(u.birthDate || '').trim() &&
      String(u.birthTime || '').trim() &&
      String(u.birthPlace || '').trim() &&
      okGender
    );
  }
  function afterLogin() {
    /* Même si abo en pause : accès app (quotas Gratuit), pas d’écran bloquant. */
    syncProfileFlag();
    state.iaLoaded = false;
    if (canIa()) {
      setIaMessages(loadIaLocal(), false);
      fetchIaHistory();
    } else {
      state.iaMessages = [];
    }
    if (needsOnboarding()) {
      state.screen = 'onboarding';
      return;
    }
    if (localStorage.getItem('cercle.installedHint')) {
      state.screen = 'app';
    } else {
      state.screen = 'install';
    }
  }
  function profileComplete() {
    if (!state.user) return false;
    syncProfileFlag();
    return !!state.user.profileComplete;
  }
  /** Corrections restantes après la 1re complétion (côté serveur : max 3). */
  function profileEditsRemaining() {
    var u = state.user || {};
    if (u.profileEditsRemaining != null && Number.isFinite(Number(u.profileEditsRemaining))) {
      return Math.max(0, Math.floor(Number(u.profileEditsRemaining)));
    }
    var used = Number(u.profileEditCount);
    if (!Number.isFinite(used) || used < 0) used = 0;
    return Math.max(0, 3 - Math.floor(used));
  }
  function profileCanEdit() {
    if (!profileComplete()) return true;
    if (state.user && state.user.profileCanEdit === false) return false;
    return profileEditsRemaining() > 0;
  }
  function needsOnboarding() {
    /* Céleste/Divin actifs : profil avant l’app. Gratuit : plus tard (jour/mois/natal). */
    return !!(canNatal() && !profileComplete());
  }
  /** Affiche le formulaire « Ton ciel de naissance » (jamais un simple alert). */
  function showBirthForm(pendingKind) {
    if (pendingKind) state.pendingAsk = pendingKind;
    state.busy = null;
    state.account = false;
    state.pdf = null;
    state.editingBirth = !!profileComplete();
    state.screen = 'onboarding';
    render();
  }
  function isNeedProfileError(data) {
    if (!data) return false;
    if (data.needProfile) return true;
    var err = String(data.error || '');
    return /profil de naissance/i.test(err) || /ciel de naissance/i.test(err);
  }
  function goAppOrInstall() {
    if (localStorage.getItem('cercle.installedHint')) state.screen = 'app';
    else state.screen = 'install';
  }
  function monthsPaid() {
    return (state.user && state.user.monthsPaid) || 0;
  }
  function ultimeOn() {
    return !!(state.user && state.user.ultimeUnlocked);
  }
  function isActive() {
    return !!(state.user && state.user.active !== false);
  }
  function isPausedPaid() {
    if (!state.user || isActive()) return false;
    var p = plan();
    var last = state.user.lastPaidPlan;
    return p === 'celeste' || p === 'divin' || monthsPaid() > 0 || last === 'celeste' || last === 'divin';
  }
  function plan() { return (state.user && state.user.plan) || 'gratuit'; }
  function planLinkReady(url) {
    return !!(url && String(url).indexOf('TON-') === -1);
  }
  function openPlanLink(url) {
    if (!planLinkReady(url)) {
      alert('Colle l’URL Systeme.io de cette page dans l’app (PLAN_LINKS).');
      return;
    }
    window.open(url, '_blank', 'noopener');
  }
  /* Droits manuscrits : si abo inactif, forcer Gratuit côté client (cache / vieux /access). */
  function canNatal() {
    if (!state.user) return false;
    if (isPausedPaid()) return false;
    return !!state.user.canNatal;
  }
  function canUltime() {
    if (!state.user) return false;
    if (isPausedPaid()) return false;
    return !!(state.user.canUltime || (state.user.ultimeUnlocked && isActive()));
  }
  function canIa() {
    if (!state.user) return false;
    if (isPausedPaid()) return false;
    return !!state.user.canIa;
  }
  function iaLeft() {
    if (!state.user || isPausedPaid()) return 0;
    return state.user.iaLeft == null ? 0 : state.user.iaLeft;
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function trimIaMessages(list) {
    var arr = Array.isArray(list) ? list.slice() : [];
    if (arr.length > IA_MAX) arr = arr.slice(arr.length - IA_MAX);
    return arr;
  }

  function iaStorageKey(ctx) {
    var email = state.user && state.user.email;
    if (!email) return '';
    var c = normalizeIaCtx(ctx || state.iaContext);
    return IA_LS_PREFIX + String(email).trim().toLowerCase() + '.' + c;
  }
  function normalizeIaCtx(ctx) {
    var c = String(ctx || 'natal').toLowerCase();
    if (c === 'mois' || c === 'jour' || c === 'natal') return c;
    return 'natal';
  }
  function poeticNatalProgress(raw) {
    var s = String(raw || '');
    if (/r[eé]daction\s*ia|requ[eê]tes?\s*ia|claude|anthropic|openai|intelligence artificielle/i.test(s)) {
      return 'Traduction du langage de l\'univers — assemblage des chapitres de ta vie…';
    }
    if (/human design/i.test(s)) return 'Lecture de ton code de vie…';
    if (/timezone|coordonn/i.test(s)) return 'Ancrage dans le temps et l\'espace…';
    if (/positions astrales|astro\b/i.test(s)) return 'Alignement des planètes…';
    if (/mise en page|html/i.test(s)) return 'Assemblage et reliure du manuscrit…';
    if (/synth[eè]se/i.test(s)) return 'Sceau final — le manuscrit prend sa forme…';
    return s;
  }

  function saveIaLocal(ctx) {
    var key = iaStorageKey(ctx);
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(trimIaMessages(state.iaMessages)));
    } catch (e) {}
  }

  function loadIaLocal(ctx) {
    var key = iaStorageKey(ctx);
    if (!key) return [];
    try {
      var raw = JSON.parse(localStorage.getItem(key) || '[]');
      return trimIaMessages(Array.isArray(raw) ? raw : []);
    } catch (e) {
      return [];
    }
  }

  function setIaMessages(list, persist) {
    state.iaMessages = trimIaMessages(list);
    if (persist !== false) saveIaLocal(state.iaContext);
  }

  function friendlyIaError(err, status) {
    var msg = String(err || '').trim();
    if (!msg || /^server$/i.test(msg) || /\b50[0-9]\b/.test(msg) || /internal/i.test(msg)) {
      return 'Le ciel ne répond pas pour le moment. Réessaie dans un instant.';
    }
    if (status === 403 && msg) return msg;
    if (status === 404) return 'Compte introuvable. Reconnecte-toi.';
    return msg;
  }

  function fetchIaHistory(ctx) {
    ctx = normalizeIaCtx(ctx || state.iaContext);
    state.iaContext = ctx;
    if (!state.user || !state.user.email || !canIa()) {
      state.iaLoaded = true;
      return Promise.resolve();
    }
    var local = loadIaLocal(ctx);
    if (local.length) setIaMessages(local, false);
    return fetch(API + '/ia?email=' + encodeURIComponent(state.user.email) + '&context=' + encodeURIComponent(ctx), {
      headers: authHeaders(false)
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, data: j }; }); })
      .then(function (res) {
        if (res.status === 401) { forceReLogin((res.data && res.data.error) || 'Session expirée.'); return; }
        if (res.data && res.data.contact) applyAccess(res.data.contact);
        if (res.ok && res.data && Array.isArray(res.data.messages)) {
          setIaMessages(res.data.messages, true);
        } else if (local.length) {
          setIaMessages(local, false);
        }
        state.iaLoaded = true;
      })
      .catch(function () {
        if (local.length) setIaMessages(local, false);
        state.iaLoaded = true;
      });
  }

  function ensureIaHistory(ctx) {
    ctx = normalizeIaCtx(ctx || state.iaContext);
    if (state.iaContext !== ctx) {
      state.iaContext = ctx;
      state.iaLoaded = false;
      state.iaMessages = loadIaLocal(ctx);
    }
    if (state.iaLoaded && state.iaContext === ctx) return;
    state.iaLoaded = false;
    fetchIaHistory(ctx);
  }

  function dailyLeft() {
    if (!state.user) return null;
    if (isPausedPaid()) {
      if (state.user.dailyLimit != null && state.user.dailyLeft != null) return state.user.dailyLeft;
      return Math.max(0, 5 - (state.user.dailyUsed || 0));
    }
    if (state.user.dailyLeft == null) return null;
    return state.user.dailyLeft;
  }
  function monthlyLeft() {
    if (!state.user) return null;
    if (isPausedPaid()) {
      if (state.user.monthlyLimitYear != null && state.user.monthlyLeft != null) return state.user.monthlyLeft;
      return Math.max(0, 1 - (state.user.monthlyUsed || 0));
    }
    if (state.user.monthlyLeft == null) return null;
    return state.user.monthlyLeft;
  }
  /** Quotas Gratuit (plan gratuit ou abo en pause → droits Gratuit). Natal exclus. */
  function hasFreeQuotas() {
    if (!state.user) return false;
    if (isPausedPaid()) return true;
    if (plan() === 'gratuit') return true;
    return state.user.dailyLimit != null || state.user.monthlyLimitYear != null;
  }
  function freeDailyLimit() {
    if (!state.user) return 5;
    return state.user.dailyLimit != null ? state.user.dailyLimit : 5;
  }
  function freeMonthlyLimit() {
    if (!state.user) return 1;
    return state.user.monthlyLimitYear != null ? state.user.monthlyLimitYear : 1;
  }
  function freeDailyRemaining() {
    var left = dailyLeft();
    if (left != null) return left;
    return Math.max(0, freeDailyLimit() - ((state.user && state.user.dailyUsed) || 0));
  }
  function freeMonthlyRemaining() {
    var left = monthlyLeft();
    if (left != null) return left;
    return Math.max(0, freeMonthlyLimit() - ((state.user && state.user.monthlyUsed) || 0));
  }
  function manusWord(n) {
    return n === 1 ? 'manuscrit' : 'manuscrits';
  }
  function freeQuotaBanner() {
    if (!hasFreeQuotas()) return '';
    var dLim = freeDailyLimit();
    var mLim = freeMonthlyLimit();
    var dLeft = freeDailyRemaining();
    var mLeft = freeMonthlyRemaining();
    var full = dLeft >= dLim && mLeft >= mLim;
    var text = full
      ? 'Accès gratuit : ' + mLim + ' ' + manusWord(mLim) + ' du mois + ' + dLim + ' ' + manusWord(dLim) + ' du jour offerts.'
      : 'Il te reste ' + mLeft + ' ' + manusWord(mLeft) + ' du mois et ' + dLeft + ' ' + manusWord(dLeft) + ' du jour.';
    return '<div class="free-quota-banner" role="status">' +
      '<span class="free-quota-star" aria-hidden="true">✦</span>' +
      '<p>' + text + '</p></div>';
  }

  var FR_DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var FR_MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function dayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function monthKey() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1);
  }
  function todayLabel() {
    var d = new Date();
    var day = FR_DAYS[d.getDay()];
    return day.charAt(0).toUpperCase() + day.slice(1) + ' ' + d.getDate() + ' ' + FR_MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }
  function monthLabel() {
    var d = new Date();
    var m = FR_MONTHS[d.getMonth()];
    return m.charAt(0).toUpperCase() + m.slice(1) + ' ' + d.getFullYear();
  }
  function emphasizeLife(prefixHtml) {
    return prefixHtml + ' <span class="de-ta-vie">de ta vie</span>';
  }
  function natalTitleHtml() {
    return emphasizeLife('Le Manuscrit Céleste');
  }
  function natalTitlePlain() {
    return 'Le Manuscrit Céleste de ta vie';
  }
  function ultimeTitleHtml() {
    return emphasizeLife('Le Manuscrit Céleste Ultime');
  }
  function ultimeTitlePlain() {
    return 'Le Manuscrit Céleste Ultime de ta vie';
  }
  function monthNameUpper() {
    return FR_MONTHS[new Date().getMonth()].toLocaleUpperCase('fr-FR');
  }
  function moisTitleHtml() {
    return 'Manuscrit Céleste <span class="de-ce-mois">DE CE MOIS DE ' + monthNameUpper() + '</span>';
  }
  function moisTitlePlain() {
    return 'Manuscrit Céleste DE CE MOIS DE ' + monthNameUpper();
  }
  function jourTitlePlain() {
    var d = new Date();
    return 'Manuscrit Céleste du ' + d.getDate() + ' ' + FR_MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }
  function booksKey() {
    var email = (state.user && state.user.email) || 'anon';
    return 'cercle.books.' + email.toLowerCase();
  }
  function loadBooks() {
    try { return JSON.parse(localStorage.getItem(booksKey()) || '{}'); } catch (e) { return {}; }
  }
  function saveBooks(b) {
    localStorage.setItem(booksKey(), JSON.stringify(b));
  }
  function bookReady(kind) {
    var b = loadBooks();
    if (kind === 'jour') return b.jour === dayKey();
    if (kind === 'mois') return b.mois === monthKey();
    return !!b[kind];
  }
  function markBook(kind) {
    var b = loadBooks();
    if (kind === 'jour') b.jour = dayKey();
    else if (kind === 'mois') b.mois = monthKey();
    else b[kind] = dayKey();
    saveBooks(b);
  }
  function askManuscript(kind) {
    if (kind === 'natal' && !canNatal()) return;
    if (kind === 'ultime' && !canUltime()) return;
    if (kind === 'jour' && dailyLeft() === 0) return;
    if (kind === 'mois' && monthlyLeft() === 0) return;
    if ((kind === 'natal' || kind === 'jour' || kind === 'mois') && !profileComplete()) {
      showBirthForm(kind);
      return;
    }
    if (kind === 'natal' && natalCanRead()) {
      openNatalReader();
      return;
    }
    if (bookReady(kind) && kind !== 'natal') {
      state.pdf = kind;
      render();
      return;
    }
    var email = state.user && state.user.email;
    if (!email) return;
    if (kind === 'natal') state.natalGenError = null;
    state.busy = kind;
    render();
    fetch(API + '/generate', {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ email: email, kind: kind, token: state.user.token })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, data: j }; }); })
      .then(function (res) {
        if (res.status === 401) {
          state.busy = null;
          forceReLogin((res.data && res.data.error) || 'Session expirée.');
          return;
        }
        if (res.data && res.data.contact) applyAccess(res.data.contact);
        if (!res.ok) {
          state.busy = null;
          if (isNeedProfileError(res.data)) {
            showBirthForm(kind);
            return;
          }
          if (kind === 'natal') {
            state.natalGenError = (res.data && res.data.error) || 'Impossible d’écrire ton manuscrit pour le moment.';
            render();
            return;
          }
          alert((res.data && res.data.error) || 'Impossible d’écrire ce manuscrit.');
          render();
          return;
        }
        if (kind === 'natal') {
          /* 202 async job OU déjà prêt */
          if (res.data && (res.data.status === 'generating' || res.status === 202)) {
            pollNatalUntilReady();
            return;
          }
          state.busy = null;
          state.natalGenError = null;
          if (natalCanRead()) {
            openNatalReader();
          } else {
            state.natalGenError = 'Le manuscrit n’est pas encore prêt. Réessaie — la génération peut prendre plusieurs minutes.';
            render();
          }
          return;
        }
        render();
        setTimeout(function () {
          markBook(kind);
          state.busy = null;
          state.pdf = kind;
          render();
        }, 900);
      })
      .catch(function () {
        state.busy = null;
        if (kind === 'natal') {
          state.natalGenError = 'Le serveur d’accès n’est pas joignable. Réessaie dans un moment.';
          render();
          return;
        }
        alert('Le serveur d’accès n’est pas joignable.');
        render();
      });
  }

  function pollNatalUntilReady() {
    state.busy = 'natal';
    render();
    var email = state.user && state.user.email;
    if (!email) {
      state.busy = null;
      render();
      return;
    }
    var tries = 0;
    var maxTries = 120; /* ~10 min à 5 s */
    function tick() {
      tries++;
      fetch(API + '/access?email=' + encodeURIComponent(email), {
        headers: authHeaders(false)
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, data: j }; }); })
        .then(function (res) {
          if (res.status === 401) {
            state.busy = null;
            forceReLogin((res.data && res.data.error) || 'Session expirée.');
            return;
          }
          if (res.data) applyAccess(res.data);
          var d = res.data || {};
          var u = state.user || {};
          if (natalCanRead()) {
            state.busy = null;
            state.natalGenError = null;
            openNatalReader();
            return;
          }
          if (u.natalStatus === 'error') {
            state.busy = null;
            state.natalGenError = u.natalError || 'La génération n’a pas pu aboutir. Réessaie dans un moment.';
            render();
            return;
          }
          if (tries >= maxTries) {
            state.busy = null;
            state.natalGenError = 'La génération prend plus longtemps que prévu. Reviens dans quelques minutes — ton manuscrit s’ouvrira dès qu’il est prêt.';
            render();
            return;
          }
          render();
          setTimeout(tick, 5000);
        })
        .catch(function () {
          if (tries >= maxTries) {
            state.busy = null;
            state.natalGenError = 'Connexion interrompue pendant la génération. Réessaie.';
            render();
            return;
          }
          setTimeout(tick, 5000);
        });
    }
    setTimeout(tick, 4000);
  }

  function natalPdfUrl() {
    var base = '';
    if (state.user && state.user.natalPdfUrl) base = state.user.natalPdfUrl;
    else if (state.user && state.user.email) base = '/natal-file?email=' + encodeURIComponent(state.user.email);
    return base ? withAuthQuery(base) : '';
  }

  /** « Lire les 28p » uniquement si le serveur confirme prêt + fichier sur volume. */
  function natalCanRead() {
    var u = state.user || {};
    return !!(u.natalReady && u.natalFileExists);
  }

  function clearNatalLocalBook() {
    try {
      var b = loadBooks();
      if (b.natal) {
        delete b.natal;
        saveBooks(b);
      }
    } catch (e) {}
  }

  function openNatalReader(url) {
    if (!natalCanRead()) {
      clearNatalLocalBook();
      state.pdf = null;
      state.natalGenError = 'Ton manuscrit n’est pas encore disponible. Appuie sur « OBTENIR LE MANUSCRIT DE MA VIE ».';
      render();
      return;
    }
    var u = withAuthQuery(url || natalPdfUrl());
    if (!u) {
      state.natalGenError = 'Lien manuscrit manquant. Reconnecte-toi puis réessaie.';
      render();
      return;
    }
    /* Vérifie le fichier avant l’iframe (évite d’afficher le JSON d’erreur brut). */
    fetch(u, { headers: authHeaders(false) })
      .then(function (r) {
        if (r.ok) {
          var ct = (r.headers.get('content-type') || '').toLowerCase();
          if (ct.indexOf('json') >= 0) {
            return r.json().then(function (j) {
              throw new Error((j && j.error) || 'aucun fichier natal');
            });
          }
          state.natalPreview = u;
          state.pdf = 'natal';
          state.natalGenError = null;
          render();
          return null;
        }
        return r.json().then(function (j) {
          throw new Error((j && j.error) || ('HTTP ' + r.status));
        }).catch(function (e) {
          if (e && e.message && e.message.indexOf('HTTP') < 0 && e.message !== 'aucun fichier natal') throw e;
          throw new Error((e && e.message) || 'aucun fichier natal');
        });
      })
      .catch(function (err) {
        clearNatalLocalBook();
        if (state.user) {
          state.user.natalReady = false;
          state.user.natalFileExists = false;
          state.user.natalStatus = 'none';
          state.user.natalPdfUrl = null;
          saveUser();
        }
        state.pdf = null;
        state.natalGenError = 'Le fichier du manuscrit est introuvable. Relance « OBTENIR LE MANUSCRIT DE MA VIE » (plusieurs minutes).';
        render();
      });
  }

  function saveProfile() {
    var email = state.user && state.user.email;
    if (!email) return;
    if (profileComplete() && !profileCanEdit()) {
      alert('Tu as utilisé tes 3 modifications de profil. Pour toute correction supplémentaire, contacte le support.');
      return;
    }
    var birthDate = (document.getElementById('birth-date') || {}).value || '';
    var birthTime = (document.getElementById('birth-time') || {}).value || '';
    /* Certains navigateurs envoient HH:MM:SS — on normalise en HH:MM. */
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(birthTime)) birthTime = birthTime.slice(0, 5);
    var birthPlace = ((document.getElementById('birth-place') || {}).value || '').trim();
    var genderEl = document.querySelector('input[name="gender"]:checked');
    var gender = genderEl ? genderEl.value : '';
    if (!birthDate) { alert('Ta date de naissance ✦'); return; }
    if (!birthTime) { alert('Ton heure de naissance ✦'); return; }
    if (!birthPlace) { alert('Ton lieu de naissance ✦'); return; }
    if (!gender) { alert('Choisis un genre (pour le ton d’écriture) ✦'); return; }

    var lat = _birthGeo.lat;
    var lon = _birthGeo.lon;
    var timezone = _birthGeo.timezone || '';
    /* Si le libellé a changé sans re-sélection, on ne garde pas d’anciennes coords. */
    if (_birthGeo.label && birthPlace !== _birthGeo.label) {
      lat = null;
      lon = null;
      timezone = '';
    }

    var wasEdit = !!profileComplete();
    var btnLabel = wasEdit ? 'Enregistrer les modifications' : 'Enregistrer mon profil';
    var btn = document.getElementById('save-profile');
    if (btn) { btn.disabled = true; btn.textContent = 'Enregistrement…'; }

    function postProfile(geo) {
      fetch(API + '/profile', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({
          email: email,
          token: state.user && state.user.token,
          birthDate: birthDate,
          birthTime: birthTime,
          birthPlace: birthPlace,
          birthLat: geo.lat,
          birthLon: geo.lon,
          birthTimezone: geo.timezone || '',
          gender: gender
        })
      }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, data: j }; }); })
        .then(function (res) {
          if (res.status === 401) {
            forceReLogin((res.data && res.data.error) || 'Session expirée.');
            return;
          }
          if (!res.ok) {
            if (res.data && res.data.contact) applyAccess(res.data.contact);
            alert((res.data && res.data.error) || 'Impossible d’enregistrer le profil.');
            if (btn) {
              btn.disabled = !profileCanEdit();
              btn.textContent = btnLabel;
            }
            if (res.data && res.data.code === 'PROFILE_EDIT_LIMIT') render();
            return;
          }
          if (res.data && res.data.contact) applyAccess(res.data.contact);
          else {
            state.user = Object.assign({}, state.user || {}, {
              birthDate: birthDate,
              birthTime: birthTime,
              birthPlace: birthPlace,
              birthLat: geo.lat,
              birthLon: geo.lon,
              birthTimezone: geo.timezone || '',
              gender: gender
            });
            syncProfileFlag();
            saveUser();
          }
          var pending = state.pendingAsk;
          state.pendingAsk = null;
          state.editingBirth = false;
          localStorage.setItem('cercle.installedHint', '1');
          state.screen = 'app';
          if (wasEdit) state.account = true;
          render();
          if (pending) askManuscript(pending);
        })
        .catch(function () {
          alert('Le serveur n’est pas joignable.');
          if (btn) { btn.disabled = false; btn.textContent = btnLabel; }
        });
    }

    /* Si coords connues mais timezone manquant → TimeAPI (comme GENERATIONS) */
    if (lat != null && lon != null && !timezone) {
      fetch('https://timeapi.io/api/timezone/coordinate?latitude=' + lat + '&longitude=' + lon)
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          postProfile({ lat: lat, lon: lon, timezone: (d && d.timeZone) || '' });
        })
        .catch(function () {
          postProfile({ lat: lat, lon: lon, timezone: '' });
        });
      return;
    }
    postProfile({ lat: lat, lon: lon, timezone: timezone });
  }

  /**
   * Autocomplete ville — même source que GENERATIONS :
   * Photon (OpenStreetMap) + TimeAPI pour le fuseau.
   * APIs publiques, pas de clé à exposer.
   */
  function initBirthPlaceAutocomplete() {
    var input = document.getElementById('birth-place');
    var dropdown = document.getElementById('birth-place-dropdown');
    if (!input || !dropdown || input.disabled) return;

    var u = state.user || {};
    if (u.birthLat != null && u.birthLon != null && u.birthPlace) {
      _birthGeo.lat = typeof u.birthLat === 'number' ? u.birthLat : parseFloat(u.birthLat);
      _birthGeo.lon = typeof u.birthLon === 'number' ? u.birthLon : parseFloat(u.birthLon);
      _birthGeo.timezone = u.birthTimezone || '';
      _birthGeo.label = u.birthPlace;
      if (!Number.isFinite(_birthGeo.lat)) _birthGeo.lat = null;
      if (!Number.isFinite(_birthGeo.lon)) _birthGeo.lon = null;
    }

    var debTimer = null;
    var focusIdx = -1;
    var items = [];

    function openDrop() { dropdown.classList.add('open'); }
    function closeDrop() { dropdown.classList.remove('open'); focusIdx = -1; }

    function renderResults(results) {
      dropdown.innerHTML = '';
      focusIdx = -1;
      items = results;
      if (!results.length) {
        dropdown.innerHTML = '<div class="autocomplete-empty">Aucun résultat</div>';
        openDrop();
        return;
      }
      results.forEach(function (r) {
        var el = document.createElement('div');
        el.className = 'autocomplete-item';
        el.innerHTML =
          '<span class="city-name">' + r.value + '</span>' +
          '<span class="city-country">' + (r.country || '') + (r.region ? ' · ' + r.region : '') + '</span>';
        el.addEventListener('mousedown', function (e) {
          e.preventDefault();
          selectItem(r);
        });
        dropdown.appendChild(el);
      });
      openDrop();
    }

    function selectItem(r) {
      _birthGeo.lat = r.lat;
      _birthGeo.lon = r.lon;
      _birthGeo.label = r.value;
      _birthGeo.timezone = '';
      input.value = r.value;
      closeDrop();
      fetch('https://timeapi.io/api/timezone/coordinate?latitude=' + r.lat + '&longitude=' + r.lon)
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (d) {
          _birthGeo.timezone = (d && d.timeZone) || '';
        })
        .catch(function () { _birthGeo.timezone = ''; });
    }

    function highlightItem(idx) {
      var els = dropdown.querySelectorAll('.autocomplete-item');
      els.forEach(function (el, i) { el.classList.toggle('focused', i === idx); });
    }

    function search(query) {
      dropdown.innerHTML = '<div class="autocomplete-loading">Recherche…</div>';
      openDrop();
      var url = 'https://photon.komoot.io/api/?q=' + encodeURIComponent(query) + '&limit=8&lang=fr';
      fetch(url)
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (data) {
          var results = (data.features || [])
            .filter(function (f) {
              var t = (f.properties.type || '').toLowerCase();
              return ['city', 'town', 'village', 'hamlet', 'locality', 'borough', 'suburb', 'municipality', 'county', 'district'].indexOf(t) !== -1;
            })
            .map(function (f) {
              var p = f.properties;
              var coords = f.geometry.coordinates;
              var label = p.name || p.city || '';
              var parts = [label];
              if (p.city && p.name !== p.city) parts.push(p.city);
              if (p.state) parts.push(p.state);
              if (p.country) parts.push(p.country);
              return {
                value: parts.filter(function (x, i, a) { return x && a.indexOf(x) === i; }).join(', '),
                country: p.country || '',
                region: p.state || '',
                lat: coords[1],
                lon: coords[0]
              };
            });
          renderResults(results);
        })
        .catch(function () { closeDrop(); });
    }

    input.addEventListener('input', function () {
      _birthGeo.lat = null;
      _birthGeo.lon = null;
      _birthGeo.timezone = '';
      _birthGeo.label = '';
      var q = input.value.trim();
      clearTimeout(debTimer);
      if (q.length < 2) { closeDrop(); return; }
      debTimer = setTimeout(function () { search(q); }, 320);
    });
    input.addEventListener('keydown', function (e) {
      var els = dropdown.querySelectorAll('.autocomplete-item');
      if (!dropdown.classList.contains('open')) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        focusIdx = Math.min(focusIdx + 1, els.length - 1);
        highlightItem(focusIdx);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        focusIdx = Math.max(focusIdx - 1, 0);
        highlightItem(focusIdx);
      } else if (e.key === 'Enter' && focusIdx >= 0) {
        e.preventDefault();
        if (items[focusIdx]) selectItem(items[focusIdx]);
      } else if (e.key === 'Escape') {
        closeDrop();
      }
    });
    input.addEventListener('blur', function () { setTimeout(closeDrop, 200); });
    input.addEventListener('focus', function () {
      if (input.value.trim().length >= 2 && dropdown.children.length) openDrop();
    });
  }

  function sendIa() {
    var input = document.getElementById('ia-q');
    var q = input ? (input.value || '').trim() : '';
    if (!q) return;
    if (!canIa()) return;
    if (state.iaBusy) return;
    if (iaLeft() <= 0) {
      alert('Le ciel se repose pour ce mois. Reviens le 1er.');
      return;
    }
    var email = state.user.email;
    var draft = trimIaMessages(state.iaMessages.concat([{ role: 'me', text: q }]));
    setIaMessages(draft, true);
    state.iaBusy = true;
    if (input) input.value = '';
    render();
    fetch(API + '/ia', {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({
        email: email,
        question: q,
        context: normalizeIaCtx(state.iaContext),
        token: state.user && state.user.token
      })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, data: j }; }); })
      .then(function (res) {
        if (res.status === 401) {
          state.iaBusy = false;
          forceReLogin((res.data && res.data.error) || 'Session expirée.');
          return;
        }
        if (res.data && res.data.contact) applyAccess(res.data.contact);
        if (res.ok && res.data && Array.isArray(res.data.messages)) {
          setIaMessages(res.data.messages, true);
        } else {
          var errText = friendlyIaError((res.data && res.data.error) || '', res.status);
          var withBot = trimIaMessages(state.iaMessages.concat([{ role: 'bot', text: errText }]));
          setIaMessages(withBot, true);
        }
        state.iaBusy = false;
        state.iaLoaded = true;
        render();
      })
      .catch(function () {
        var withBot = trimIaMessages(state.iaMessages.concat([{
          role: 'bot',
          text: 'Le ciel ne répond pas pour le moment. Réessaie dans un instant.'
        }]));
        setIaMessages(withBot, true);
        state.iaBusy = false;
        render();
      });
  }

  function apiLogin(email, password) {
    return fetch(API + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, data: j }; }); });
  }

  function refreshAccess() {
    if (!state.user || !state.user.email || !state.user.token) return Promise.resolve();
    return fetch(API + '/access?email=' + encodeURIComponent(state.user.email), {
      headers: authHeaders(false)
    })
      .then(function (r) {
        return r.json().then(function (j) { return { ok: r.ok, status: r.status, data: j }; });
      })
      .then(function (res) {
        if (res.status === 401) {
          forceReLogin((res.data && res.data.error) || 'Session expirée.');
          return;
        }
        if (!res.ok || !res.data) return;
        applyAccess(res.data);
      })
      .catch(function () {});
  }

  function initial(name) {
    var p = (name || '?').trim();
    return p ? p.charAt(0).toUpperCase() : '✦';
  }

  function loginView() {
    return '<div class="screen">' +
      '<div class="scroll noshift stack" style="justify-content:center;max-width:420px;margin:0 auto;width:100%">' +
        '<div class="brand"><span class="star">✦</span><h1>Les Manuscrits<br><span>Célestes</span></h1>' +
        '<p class="lede">Gratuit, Céleste (59 €) ou Divin (137 €).<br>L’IA Céleste t’accompagne dans le Divin.</p></div>' +
        '<div class="card stack">' +
          '<div class="field"><label class="label" for="email">Email</label>' +
          '<input class="input" id="email" type="email" placeholder="toi@email.com" autocomplete="username"></div>' +
          '<div class="field"><label class="label" for="password">Mot de passe</label>' +
          '<input class="input" id="password" type="password" placeholder="8 caractères minimum" autocomplete="current-password"></div>' +
          '<button class="btn" id="go-in">Se connecter</button>' +
          '<p class="lede" style="font-size:.85rem;text-align:center">Première connexion : choisis un mot de passe (8 caractères min). Même email que ton paiement.</p>' +
        '</div></div></div>';
  }

  function installView() {
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    var steps = ios
      ? '<p class="install-steps">Sur iPhone : appuie sur <b>Partager</b> puis <b>Sur l’écran d’accueil</b>.</p>'
      : '<p class="install-steps">Sur Android : bouton ci-dessous, ou menu Chrome → <b>Ajouter à l’écran d’accueil</b>.</p>';
    return '<div class="screen"><div class="scroll noshift stack" style="justify-content:center;max-width:420px;margin:0 auto;width:100%">' +
      '<div class="brand"><span class="star">✦</span><h1>Sur ton<br><span>écran d’accueil</span></h1>' +
      '<p class="lede">Comme une app, sans l’App Store.</p></div>' +
      '<div class="card stack">' + steps +
      '<button class="btn" id="install-btn">Ajouter à l’accueil</button>' +
      '<button class="link" id="skip-install">Continuer sans installer</button>' +
      '</div></div></div>';
  }

  function onboardingView() {
    var u = state.user || {};
    var g = u.gender || '';
    var editing = !!profileComplete();
    var canEdit = profileCanEdit();
    var remaining = profileEditsRemaining();
    var readOnly = editing && !canEdit;
    var ro = readOnly ? ' disabled' : '';
    function genderOpt(val, label) {
      return '<label class="gender-opt"><input type="radio" name="gender" value="' + val + '"' +
        (g === val ? ' checked' : '') + (readOnly ? ' disabled' : '') + '> ' + label + '</label>';
    }
    var lede;
    if (!editing) {
      lede = 'Enregistré sous ' + (u.email || 'ton email') + ' — pour le natal, le jour et le mois. Tu pourras corriger jusqu’à 3 fois en cas d’erreur.';
    } else if (readOnly) {
      lede = 'Tu as utilisé tes 3 modifications. Pour toute correction supplémentaire, contacte le support.';
    } else {
      lede = 'Corrige une erreur si besoin. Il te reste ' + remaining + ' modification' + (remaining > 1 ? 's' : '') + '.';
    }
    var natalNote = '';
    if (editing && (u.natalReady || u.natalFileExists || u.natalStatus === 'ready')) {
      natalNote = '<p class="muted">Ton manuscrit natal est déjà généré : changer ces infos ne le régénère pas automatiquement.</p>';
    }
    var remainingLine = editing
      ? ('<p class="muted" id="profile-edits-left">' +
        (readOnly
          ? 'Plus aucune modification possible.'
          : ('Il te reste ' + remaining + ' modification' + (remaining > 1 ? 's' : '') + '.')) +
        '</p>')
      : '';
    var saveBtn = readOnly
      ? '<button class="btn" id="save-profile" disabled>Plus de modifications possibles</button>'
      : ('<button class="btn" id="save-profile">' +
        (editing ? 'Enregistrer les modifications' : 'Enregistrer mon profil') + '</button>');
    var backOrSkip = editing
      ? '<button class="link" id="cancel-edit-profile">Retour</button>'
      : (canNatal() ? '' : '<button class="link" id="skip-onboarding">Plus tard</button>');
    return '<div class="screen">' +
      '<div class="scroll noshift stack" style="justify-content:center;max-width:420px;margin:0 auto;width:100%">' +
        '<div class="brand"><span class="star">✦</span><h1>Ton ciel<br><span>de naissance</span></h1>' +
        '<p class="lede">' + lede + '</p></div>' +
        '<div class="card stack">' +
          remainingLine +
          natalNote +
          '<div class="field"><label class="label" for="birth-date">Date de naissance</label>' +
          '<input class="input" id="birth-date" type="date" value="' + (u.birthDate || '') + '" required' + ro + '></div>' +
          '<div class="field"><label class="label" for="birth-time">Heure de naissance</label>' +
          '<input class="input" id="birth-time" type="time" value="' + (u.birthTime || '') + '" required' + ro + '></div>' +
          '<div class="field"><label class="label" for="birth-place">Lieu de naissance</label>' +
          '<div class="autocomplete-wrap">' +
          '<input class="input" id="birth-place" type="text" placeholder="Tape une ville… (ex: Lyon)" value="' + (u.birthPlace || '').replace(/"/g, '&quot;') + '" autocomplete="off"' + ro + '>' +
          '<div class="autocomplete-dropdown" id="birth-place-dropdown"></div>' +
          '</div></div>' +
          '<div class="field"><span class="label">Genre</span>' +
          '<div class="gender-row">' + genderOpt('femme', 'Femme') + genderOpt('homme', 'Homme') + genderOpt('autre', 'Autre') + '</div></div>' +
          saveBtn +
          backOrSkip +
        '</div></div></div>';
  }

  function topbar() {
    var u = state.user || {};
    return '<div class="topbar"><span class="kicker">Les Manuscrits Célestes</span>' +
      '<div class="topbar-actions">' +
        themeToggleHtml(true) +
        '<button class="avatar" id="open-account" aria-label="Compte">' + initial(u.prenom) + '</button>' +
      '</div></div>';
  }

  function nav() {
    var tabs = [
      ['natal', '✦', 'De ta vie'],
      ['mois', '☽', 'Du mois'],
      ['jour', '☀', 'Du jour']
    ];
    return '<nav class="nav">' + tabs.map(function (t) {
      return '<button data-tab="' + t[0] + '" class="' + (state.tab === t[0] ? 'active' : '') + '"><span class="ic">' + t[1] + '</span>' + t[2] + '</button>';
    }).join('') + '</nav>';
  }

  function pauseBanner() {
    if (!isPausedPaid()) return '';
    var u = state.user || {};
    return '<div class="card pause-banner stack">' +
      '<div class="label">Abonnement en pause</div>' +
      '<h2>Espace en pause</h2>' +
      '<p>Ton abo ' + ((u.planLabel) || '') + ' est en pause. Tu gardes l’accès Gratuit : 1 manuscrit du mois + 5 manuscrits du jour. Natal, Ultime et IA Céleste se rouvrent dès que tu reprends.</p>' +
      '<p class="muted">Mois Ultime conservés : ' + monthsPaid() + ' / 6.</p>' +
      '<button class="btn" type="button" data-plan-link="manage">Reprendre mon abonnement</button>' +
      '<button class="btn ghost" type="button" id="retry-access">J’ai repris, actualiser</button>' +
      '</div>';
  }

  function natalStatusLine() {
    var u = state.user || {};
    if (!profileComplete()) {
      return '<p class="muted">Renseigne ton ciel de naissance pour que ton manuscrit puisse s’écrire.</p>' +
        '<button class="btn" type="button" id="edit-profile-natal">Renseigner mon ciel de naissance</button>';
    }
    if (state.natalGenError || u.natalStatus === 'error') {
      var errRaw = state.natalGenError || u.natalError || 'La génération n’a pas pu aboutir. Réessaie dans un moment.';
      var errSafe = String(errRaw).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      /* Message technique serveur → formulation douce pour le client */
      if (/HD_API_TOKEN|CLAUDE_KEY|ANTHROPIC|manquant/i.test(errRaw)) {
        errSafe = 'La génération n’a pas pu aboutir pour le moment. Réessaie dans un instant — ton bouton « OBTENIR LE MANUSCRIT DE MA VIE » reste disponible.';
      }
      return '<div class="natal-wait natal-wait-error" role="alert">' +
        '<p>' + errSafe + '</p>' +
        '</div>';
    }
    if (u.natalStatus === 'generating' || state.busy === 'natal') {
      var pct = u.natalProgressPct != null ? Math.max(0, Math.min(100, Number(u.natalProgressPct) || 0)) : 12;
      var progRaw = poeticNatalProgress(u.natalProgress
        ? String(u.natalProgress)
        : 'Le ciel compose ton manuscrit — quelques minutes de silence.');
      var progSafe = progRaw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return '<div class="natal-cosmos" role="status" aria-live="polite">' +
        '<div class="natal-galaxy"></div>' +
        '<div class="natal-stars" aria-hidden="true"></div>' +
        '<div class="natal-book-stage">' +
          '<div class="natal-book">' +
            '<div class="book-spine"></div>' +
            '<div class="book-cover book-left"></div>' +
            '<div class="book-pages">' +
              '<div class="book-page p1"></div>' +
              '<div class="book-page p2"></div>' +
              '<div class="book-page p3"></div>' +
            '</div>' +
            '<div class="book-cover book-right"></div>' +
          '</div>' +
        '</div>' +
        '<div class="natal-cosmos-copy">' +
          '<p class="natal-cosmos-title">Le Manuscrit Céleste de ta vie s’écrit</p>' +
          '<p class="natal-cosmos-step">' + progSafe + '</p>' +
          '<div class="natal-cosmos-bar"><span style="width:' + pct + '%"></span></div>' +
          '<p class="muted natal-cosmos-hint">Alignement des planètes · calculs du code de vie · assemblage du langage de l’univers. Ne ferme pas cette page.</p>' +
        '</div>' +
        '</div>';
    }
    if (natalCanRead()) {
      return '<p class="muted">Profil enregistré · ton manuscrit est prêt.</p>';
    }
    return '<p class="muted">Profil enregistré · en attente de ta demande.</p>';
  }

  function natalTab() {
    var prenom = (state.user && state.user.prenom) || 'toi';
    var months = monthsPaid();
    var left = Math.max(0, ULTIME.need - months);
    var unlocked = canUltime();
    var readyProfile = profileComplete();
    var canRead = natalCanRead();
    var natalCta = 'OBTENIR LE MANUSCRIT DE MA VIE';
    var natalCard = canNatal()
      ? '<div class="card stack"><div class="label">' + NATAL.kicker + '</div><h2>' + natalTitleHtml() + '</h2><p class="muted">' + NATAL.pages + ' pages · écrit une fois, à ta demande</p><p>' + NATAL.intro + '</p>' +
        natalStatusLine() +
        (readyProfile ? askBtn('natal', natalCta, natalCta) : '') +
        '</div>'
      : '<div class="card lock stack"><div class="label">Plan Céleste</div><h2>' + natalTitleHtml() + '</h2><p class="muted">28 pages · 59 € / mois</p><p>' + (isPausedPaid() ? 'Abonnement en pause : le natal se rouvre dès que tu reprends.' : 'Ton manuscrit de vie s’ouvre avec l’abonnement Céleste.') + '</p></div>';
    var ultime;
    if (unlocked) {
      ultime = '<div class="card stack"><div class="label">Débloqué</div><h2>' + ultimeTitleHtml() + '</h2><p class="muted">' + ULTIME.pages + ' pages</p><p>' + (plan() === 'divin' ? 'Inclus tout de suite dans le Divin.' : 'Six mois payés, même avec des pauses.') + ' Écrit une seule fois, à ta demande.</p>' + askBtn('ultime', 'Demander l’Ultime', 'Relire l’Ultime') + '</div>';
    } else if (plan() === 'gratuit' && months === 0) {
      ultime = '<div class="card lock stack"><div class="label">Céleste ou Divin</div><h2>' + ultimeTitleHtml() + '</h2><p class="muted">140 pages</p><p>Après 6 mois Céleste, ou immédiatement en Divin.</p></div>';
    } else if (ultimeOn() && isPausedPaid()) {
      ultime = '<div class="card lock stack"><div class="label">En pause</div><h2>' + ultimeTitleHtml() + '</h2><p class="muted">' + ULTIME.pages + ' pages · déjà débloqué</p><p>L’Ultime se rouvre dès que tu reprends l’abonnement. Tes <b>' + months + ' mois</b> restent comptés.</p></div>';
    } else {
      ultime = '<div class="card lock stack"><div class="label">Verrouillé</div><h2>' + ultimeTitleHtml() + '</h2><p class="muted">' + ULTIME.pages + ' pages · 6 mois payés, cumulés</p><p>Tu as <b>' + months + ' mois</b> déjà réglés. Encore <b>' + left + '</b> — une pause ne casse pas la série.</p></div>';
    }
    return '<div class="hero-month"><div class="label">Plan ' + ((state.user && state.user.planLabel) || 'Gratuit') + (isPausedPaid() ? ' · pause' : '') + '</div>' +
      '<div class="month">' + natalTitleHtml() + '</div>' +
      '<p class="lede">Bon retour, ' + prenom + '.</p></div>' +
      '<div class="stack">' + pauseBanner() + natalCard + ultime + iaCard() + '</div>';
  }

  function askBtn(kind, askLabel, readLabel) {
    if (state.busy === kind) {
      return '<button class="btn" disabled>' +
        (kind === 'natal' ? 'Écriture en cours… quelques minutes' : 'Le ciel s’écrit…') +
        '</button>';
    }
    /* Natal : jamais data-pdf / cache local books — uniquement fichier confirmé serveur. */
    if (kind === 'natal') {
      if (natalCanRead()) {
        return '<button class="btn" data-ask="natal">' + readLabel + '</button>';
      }
      return '<button class="btn" data-ask="natal">' + askLabel + '</button>';
    }
    if (bookReady(kind)) return '<button class="btn" data-pdf="' + kind + '">' + readLabel + '</button>';
    return '<button class="btn" data-ask="' + kind + '">' + askLabel + '</button>';
  }

  function iaCard() {
    if (canIa()) {
      return '<div class="card stack"><div class="label">Plan Divin</div><h2>IA Céleste</h2><p class="muted">Disponible</p><p>Elle t’accompagne sous chaque manuscrit, pendant que tu lis.</p></div>';
    }
    return '<div class="card lock stack"><div class="label">Plan Divin · 137 €</div><h2>IA Céleste</h2><p class="muted">Incluse dans le Divin</p><p>Pendant que tu lis, elle t’écoute : aujourd’hui l’amour ? le travail ? le bon moment ?</p><button class="btn ghost" type="button" data-plan-link="divin">Découvrir le Divin</button></div>';
  }

  function readerIaPanel(ctx) {
    ctx = normalizeIaCtx(ctx);
    if (!canIa()) {
      return '<div class="reader-ia lock stack">' +
        '<div class="label">IA Céleste</div>' +
        '<p>Pose tes questions sur ce manuscrit avec le plan Divin.</p>' +
        '<button class="btn ghost" type="button" data-plan-link="divin">Passer Divin · 137 €</button>' +
        '</div>';
    }
    ensureIaHistory(ctx);
    var left = iaLeft();
    var quotaLine = left != null
      ? ('<p class="muted ia-quota">' + left + ' question' + (left === 1 ? '' : 's') + ' ce mois</p>')
      : '';
    var log = (state.iaMessages || []).map(function (m) {
      return '<div class="ia-bubble ' + (m.role === 'me' ? 'me' : 'bot') + '">' + escapeHtml(m.text) + '</div>';
    }).join('');
    var empty = '<p class="muted ia-empty">Une question sur ce que tu lis… Ex. : que me dit cette page sur l’amour ?</p>';
    var disabled = state.iaBusy || (left != null && left <= 0);
    return '<div class="reader-ia stack" data-ia-context="' + ctx + '">' +
      '<div class="label">IA Céleste · ce manuscrit</div>' +
      quotaLine +
      '<div class="ia-log" id="ia-log">' + (log || empty) + '</div>' +
      '<div class="ia-compose">' +
        '<div class="field"><label class="label" for="ia-q">Ta question</label>' +
        '<input class="input" id="ia-q" placeholder="Que me révèle ce passage ?" ' + (disabled ? 'disabled' : '') + ' autocomplete="off"></div>' +
        '<button class="btn" id="send-ia"' + (disabled ? ' disabled' : '') + '>' +
          (state.iaBusy ? 'Le ciel répond…' : (left != null && left <= 0 ? 'Quota atteint' : 'Envoyer')) +
        '</button>' +
      '</div></div>';
  }

  function moisTab() {
    var ready = bookReady('mois');
    var left = monthlyLeft();
    var blocked = left === 0 && !ready;
    var title = moisTitleHtml();
    return '<div class="hero-month"><div class="label">À la demande</div>' +
      '<div class="month">' + title + '</div><p class="lede">' + monthLabel() + '</p></div>' +
      '<div class="stack"><div class="card stack"><div class="label">Ce mois</div>' +
      '<h2>' + title + '</h2><p class="muted">' + MONTHLY.pages + (left != null ? ' · ' + (ready ? 1 : left) + ' / 1 cette année (Gratuit)' : '') + '</p><p>' + MONTHLY.intro + '</p>' +
      (blocked ? '' : askBtn('mois', 'Demander le manuscrit du mois', 'Relire le manuscrit du mois')) + '</div>' + iaCard() + '</div>';
  }

  function jourTab() {
    var ready = bookReady('jour');
    var left = dailyLeft();
    var blocked = left === 0 && !ready;
    var title = jourTitlePlain();
    return '<div class="hero-month"><div class="label">À la demande</div>' +
      '<div class="month">' + title + '</div><p class="lede">' + todayLabel() + '</p></div>' +
      '<div class="stack"><div class="card stack"><div class="label">Aujourd’hui</div>' +
      '<h2>' + title + '</h2><p class="muted">' + TODAY.pages + (left != null ? ' · ' + (state.user.dailyUsed || 0) + ' / 5 ce mois (Gratuit)' : '') + '</p><p>' + TODAY.intro + '</p>' +
      (blocked ? '' : askBtn('jour', 'OBTENIR LE MANUSCRIT DU JOUR', 'Relire le manuscrit du jour')) + '</div>' + iaCard() + '</div>';
  }

  function accountSheet() {
    var u = state.user || {};
    var p = plan();
    var actions = '';
    if (isPausedPaid()) {
      actions =
        '<button class="btn" type="button" data-plan-link="manage">Reprendre / gérer mon abonnement</button>' +
        '<button class="btn ghost" type="button" data-plan-link="celeste">Repasser Céleste · 59 €</button>' +
        '<button class="btn ghost" type="button" data-plan-link="divin">Passer Divin · 137 €</button>';
    } else if (p === 'divin') {
      actions =
        '<button class="btn" type="button" data-plan-link="downgrade-celeste">Revenir à Céleste · 59 €</button>' +
        '<button class="btn ghost" type="button" data-plan-link="manage">Gérer / arrêter l’abonnement</button>';
    } else if (p === 'celeste') {
      actions =
        '<button class="btn" type="button" data-plan-link="divin">Passer Divin · 137 €</button>' +
        '<button class="btn ghost" type="button" data-plan-link="manage">Gérer / arrêter l’abonnement</button>';
    } else {
      actions =
        '<button class="btn" type="button" data-plan-link="celeste">Passer Céleste · 59 €</button>' +
        '<button class="btn ghost" type="button" data-plan-link="divin">Passer Divin · 137 €</button>';
    }

    var planName = (u.planLabel) || (p === 'gratuit' ? 'Gratuit' : p);
    var planPrice = u.price ? (u.price + ' € / mois') : (p === 'gratuit' ? 'Sans abonnement' : '');
    var planState;
    if (isPausedPaid()) {
      planState = 'En pause — accès Gratuit (5 manuscrits du jour / mois, 1 du mois / an)';
    } else if (isActive()) {
      planState = 'Actif';
    } else {
      planState = 'Inactif';
    }

    var iaLine;
    if (canIa()) {
      iaLine = 'Disponible';
    } else if (isPausedPaid()) {
      iaLine = 'En pause — se rouvre avec le Divin';
    } else {
      iaLine = 'Réservée au plan Divin';
    }

    var showUltime = (p === 'celeste' || p === 'divin' || monthsPaid() > 0);
    var ultimeLine = monthsPaid() + ' / 6 mois payés' + (isPausedPaid() ? ' (conservés)' : '');

    var birthTimeDisp = '';
    if (u.birthTime) {
      var tm = String(u.birthTime).trim().match(/^(\d{1,2}):(\d{2})/);
      birthTimeDisp = tm ? (tm[1].padStart(2, '0') + ' h ' + tm[2]) : String(u.birthTime).trim();
    }
    var birthDateLine = (u.birthDate || '') + (birthTimeDisp ? ' · ' + birthTimeDisp : '');
    var genderDisp = u.gender === 'femme' ? 'Femme' : u.gender === 'homme' ? 'Homme' : u.gender === 'autre' ? 'Autre' : '';
    var remaining = profileEditsRemaining();
    var canEdit = profileCanEdit();
    var profileBlock;
    if (profileComplete()) {
      profileBlock = '<div class="acct-block"><div class="label">Ciel de naissance</div>' +
        '<p class="acct-value">' + birthDateLine + '</p>' +
        '<p class="muted">' + (u.birthPlace || '') +
        (genderDisp ? ' · ' + genderDisp : '') +
        (natalCanRead() ? ' · manuscrit prêt' : '') + '</p>' +
        (canEdit
          ? '<p class="muted">Il te reste ' + remaining + ' modification' + (remaining > 1 ? 's' : '') + '.</p>'
          : '<p class="muted">Tu as utilisé tes 3 modifications. Pour toute correction, contacte le support.</p>') +
        '<button class="btn ghost" type="button" id="edit-profile">' +
        (canEdit ? 'Modifier' : 'Consulter') + '</button></div>';
    } else {
      profileBlock = '<div class="acct-block"><div class="label">Ciel de naissance</div>' +
        '<p class="muted">Pas encore renseigné.</p>' +
        '<button class="btn ghost" type="button" id="edit-profile">Renseigner mon ciel de naissance</button></div>';
    }

    return '<div class="sheet" id="account-sheet"><div class="panel account-panel stack">' +
      '<h3>Ton compte</h3>' +
      '<div class="acct-block">' +
        '<div class="label">Identifiant</div>' +
        '<p class="acct-value">' + (u.prenom || '—') + '</p>' +
        '<p class="acct-email">' + (u.email || '') + '</p>' +
      '</div>' +
      '<div class="acct-block">' +
        '<div class="label">Ton plan</div>' +
        '<p class="acct-value">' + planName + '</p>' +
        '<p class="muted">' + [planPrice, planState].filter(Boolean).join(' · ') + '</p>' +
      '</div>' +
      '<div class="acct-rows">' +
        (showUltime
          ? '<div class="acct-row"><span class="label">Progression Ultime</span><span class="acct-row-val">' + ultimeLine + '</span></div>'
          : '') +
        '<div class="acct-row"><span class="label">IA Céleste</span><span class="acct-row-val">' + iaLine + '</span></div>' +
      '</div>' +
      profileBlock +
      '<div class="acct-block">' +
        '<div class="label">Apparence</div>' +
        '<p class="muted acct-hint">Choisis le ciel qui t’accompagne : sombre ou clair.</p>' +
        themeToggleHtml(false) +
      '</div>' +
      '<div class="acct-block">' +
        '<div class="label">Gérer mon abonnement</div>' +
        '<p class="muted acct-hint">Pour changer de plan, arrête d’abord ton abonnement actuel, puis souscris à nouveau à celui de ton choix.</p>' +
        '<div class="stack">' + actions + '</div>' +
      '</div>' +
      '<button class="btn ghost" id="close-account">Fermer</button>' +
      '<button class="link" id="logout">Se déconnecter</button>' +
      '</div></div>';
  }

  function pdfView(id) {
    var titleHtml = natalTitleHtml();
    var titlePlain = natalTitlePlain();
    var kicker = NATAL.kicker;
    var paras = NATAL.body;
    if (id === 'mois') {
      titleHtml = moisTitleHtml();
      titlePlain = moisTitlePlain();
      kicker = monthLabel();
      paras = MONTHLY.body;
    }
    if (id === 'jour') {
      titleHtml = jourTitlePlain();
      titlePlain = jourTitlePlain();
      kicker = todayLabel();
      paras = TODAY.body;
    }
    if (id === 'ultime') {
      titleHtml = ultimeTitleHtml();
      titlePlain = ultimeTitlePlain();
      kicker = 'Édition extra-longue';
      paras = ['Tes 140 pages s’ouvriront ici, une fois les 6 mois d’abonnement atteints.'];
    }
    var extra = '';
    if (id === 'natal') {
      var url = (typeof state.natalPreview === 'string' && state.natalPreview) ? state.natalPreview : natalPdfUrl();
      paras = [
        'Voici ton Manuscrit Céleste de ta vie. Lecture dans l’app uniquement, tant que ton abonnement est actif.'
      ];
      if (url && natalCanRead()) {
        extra = '<iframe class="natal-frame" title="Manuscrit natal" src="' + url + '"></iframe>';
      } else {
        extra = '<p class="muted">Manuscrit indisponible pour le moment. Reviens à l’accueil et appuie sur OBTENIR LE MANUSCRIT DE MA VIE.</p>';
      }
    }
    var body = '<p class="kicker">' + kicker + '</p><h2>' + titleHtml + '</h2>' +
      paras.map(function (p) { return '<p>' + p + '</p>'; }).join('') + extra;
    var iaCtx = (id === 'natal' || id === 'mois' || id === 'jour') ? id : null;
    var ia = iaCtx ? readerIaPanel(iaCtx) : '';
    return '<div class="pdf-view"><header><button type="button" class="pdf-back" id="close-pdf">← Retour</button><span class="kicker">' + titlePlain + '</span></header>' +
      '<div class="pdf-body">' + body + ia + '</div></div>';
  }

  function render() {
    var root = document.getElementById('app');
    var html = '';
    if (state.screen === 'login') html = loginView();
    else if (state.screen === 'onboarding') html = onboardingView();
    else if (state.screen === 'install') html = installView();
    else {
      if (state.screen === 'paused') state.screen = 'app';
      if (needsOnboarding()) {
        html = onboardingView();
      } else {
        if (state.tab === 'ia') state.tab = 'natal';
        var tab = state.tab === 'mois' ? moisTab()
          : state.tab === 'jour' ? jourTab()
          : natalTab();
        html = '<div class="screen">' + topbar() + freeQuotaBanner() + '<div class="scroll">' + tab + '</div>' + nav() + '</div>';
        if (state.account) html += accountSheet();
        if (state.pdf) html += pdfView(state.pdf);
      }
    }
    root.innerHTML = html;
    bind();
    var logEl = document.getElementById('ia-log');
    if (logEl) logEl.scrollTop = logEl.scrollHeight;
  }

  function bind() {
    var q = new URLSearchParams(location.search);
    var em = document.getElementById('email');
    if (em && q.get('email') && !em.value) em.value = q.get('email');

    var go = document.getElementById('go-in');
    if (go) go.onclick = function () {
      var email = (document.getElementById('email').value || '').trim();
      var password = (document.getElementById('password').value || '');
      if (!email) { alert('Ton email ✦'); return; }
      if (!password || password.length < 8) {
        alert('Mot de passe : 8 caractères minimum ✦');
        return;
      }
      go.disabled = true;
      go.textContent = 'Connexion…';
      apiLogin(email, password).then(function (res) {
        if (!res.ok) {
          alert((res.data && res.data.error) || 'Email ou mot de passe incorrect.');
          go.disabled = false;
          go.textContent = 'Se connecter';
          return;
        }
        applyAccess(Object.assign({ email: email }, res.data));
        afterLogin();
        render();
      }).catch(function () {
        alert('Les Manuscrits Célestes ne sont pas joignables pour le moment. Réessaie dans un instant.');
        go.disabled = false;
        go.textContent = 'Se connecter';
      });
    };

    var retry = document.getElementById('retry-access');
    if (retry) retry.onclick = function () {
      retry.disabled = true;
      refreshAccess().then(function () {
        afterLogin();
        render();
      });
    };

    var inst = document.getElementById('install-btn');
    if (inst) inst.onclick = function () {
      if (state.deferredPrompt) {
        state.deferredPrompt.prompt();
        state.deferredPrompt.userChoice.then(function () {
          state.deferredPrompt = null;
          localStorage.setItem('cercle.installedHint', '1');
          if (needsOnboarding()) state.screen = 'onboarding';
          else state.screen = 'app';
          render();
        });
      } else {
        alert('Menu du navigateur → Ajouter à l’écran d’accueil (Android) ou Partager → Sur l’écran d’accueil (iPhone).');
      }
    };
    var skip = document.getElementById('skip-install');
    if (skip) skip.onclick = function () {
      localStorage.setItem('cercle.installedHint', '1');
      if (needsOnboarding()) state.screen = 'onboarding';
      else state.screen = 'app';
      render();
    };

    var saveP = document.getElementById('save-profile');
    if (saveP && !saveP.disabled) saveP.onclick = saveProfile;
    if (profileCanEdit()) initBirthPlaceAutocomplete();
    var skipOn = document.getElementById('skip-onboarding');
    if (skipOn) skipOn.onclick = function () {
      state.pendingAsk = null;
      goAppOrInstall();
      render();
    };
    var cancelEdit = document.getElementById('cancel-edit-profile');
    if (cancelEdit) cancelEdit.onclick = function () {
      state.pendingAsk = null;
      state.editingBirth = false;
      state.screen = 'app';
      state.account = true;
      render();
    };

    document.querySelectorAll('[data-tab]').forEach(function (b) {
      b.onclick = function () {
        var next = b.getAttribute('data-tab');
        if (next === 'ia') next = 'natal';
        state.tab = next;
        state.pdf = null;
        render();
      };
    });
    document.querySelectorAll('[data-ask]').forEach(function (b) {
      b.onclick = function () { askManuscript(b.getAttribute('data-ask')); };
    });
    document.querySelectorAll('[data-pdf]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-pdf');
        if (id === 'ultime' && !canUltime()) return;
        if (id === 'natal' && !canNatal() && !bookReady('natal')) return;
        state.pdf = id;
        if (id === 'natal' || id === 'mois' || id === 'jour') {
          state.iaContext = id;
          state.iaLoaded = false;
        }
        render();
      };
    });
    var cp = document.getElementById('close-pdf');
    if (cp) cp.onclick = function () { state.pdf = null; render(); };
    var si = document.getElementById('send-ia');
    if (si) si.onclick = sendIa;
    var iq = document.getElementById('ia-q');
    if (iq) iq.onkeydown = function (e) { if (e.key === 'Enter') sendIa(); };

    var oa = document.getElementById('open-account');
    if (oa) oa.onclick = function () { state.account = true; render(); };
    var ca = document.getElementById('close-account');
    if (ca) ca.onclick = function () { state.account = false; render(); };
    var themeChip = document.getElementById('theme-chip');
    if (themeChip) themeChip.onclick = function () {
      setTheme(state.theme === 'light' ? 'dark' : 'light');
    };
    document.querySelectorAll('[data-theme-set]').forEach(function (b) {
      b.onclick = function () { setTheme(b.getAttribute('data-theme-set')); };
    });
    var ep = document.getElementById('edit-profile');
    if (ep) ep.onclick = function () {
      state.account = false;
      showBirthForm(null);
    };
    var epn = document.getElementById('edit-profile-natal');
    if (epn) epn.onclick = function () { showBirthForm('natal'); };
    document.querySelectorAll('[data-plan-link]').forEach(function (b) {
      b.onclick = function () {
        var kind = b.getAttribute('data-plan-link');
        if (kind === 'celeste') openPlanLink(PLAN_LINKS.celesteCheckout);
        else if (kind === 'divin') openPlanLink(PLAN_LINKS.divinCheckout);
        else if (kind === 'manage') openPlanLink(PLAN_LINKS.manageAbo);
        else if (kind === 'downgrade-celeste') {
          alert('Pour revenir à Céleste : arrête d’abord Divin via « Gérer / arrêter », puis souscris à Céleste. Ainsi tu n’es prélevé qu’une seule fois.');
          openPlanLink(PLAN_LINKS.celesteCheckout);
        }
      };
    });
    var lo = document.getElementById('logout');
    if (lo) lo.onclick = function () {
      localStorage.removeItem('cercle.user');
      state.user = null; state.screen = 'login'; state.account = false; state.tab = 'natal';
      state.iaBusy = false; state.iaLoaded = false; state.iaMessages = [];
      state.pdf = null; state.pendingAsk = null; state.natalPreview = null;
      render();
    };
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    state.deferredPrompt = e;
  });

  function paintSky() {
    var host = document.getElementById('sky-stars');
    if (!host || host.childNodes.length) return;
    var html = '';
    var i;
    for (i = 0; i < 96; i++) {
      var x = (Math.random() * 100).toFixed(2);
      var y = (Math.random() * 100).toFixed(2);
      var roll = Math.random();
      var size = roll < 0.1 ? 'lg' : (roll < 0.42 ? 'md' : 'sm');
      var gold = Math.random() < 0.16 ? ' gold' : '';
      var delay = (Math.random() * 7).toFixed(2);
      var dur = (2.2 + Math.random() * 4.2).toFixed(2);
      html += '<i class="sky-star ' + size + gold + '" style="left:' + x + '%;top:' + y + '%;animation-delay:-' + delay + 's;animation-duration:' + dur + 's"></i>';
    }
    host.innerHTML = html;
  }

  paintSky();
  load();
  syncProfileFlag();
  render();
  refreshAccess().then(function () {
    if (state.user) afterLogin();
    render();
  });
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js?v=35').catch(function () {});
  }
})();
