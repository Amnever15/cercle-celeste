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
    pages: '~10 pages',
    intro: 'Disponible tout le mois. Ton Manuscrit Céleste relatif au mois en cours. Comment tes étoiles parlent ce mois',
    body: [
      'Ce mois-ci, le ciel te demande de ne plus avancer dans le brouillard : attends le signal, puis réponds avec tout ton être.',
      'Saturne touche ta Maison X : ta vocation veut un cadre, pas une fuite en avant. Un seul engagement public suffit.',
      'Fenêtre de puissance : du 8 au 14 — pose une demande claire (projet, lieu, relation) sans forcer le rythme.',
      'La frustration est ton panneau stop. Si tu pousses sans invitation, tu t’épuises.'
    ]
  };

  var TODAY = {
    pages: '2–7 pages',
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

  var COUPLE = {
    pages: '~20–30 pages',
    intro: 'Synastrie Human Design × Astrologie pour vous deux — un manuscrit de couple par mois civil, réservé au plan Divin.',
    body: [
      'Deux ciels croisés : vos types, autorités, Soleil / Lune / Ascendant et la dynamique réelle du lien.',
      'Écrit à la demande, une fois par mois. Relis-le autant que tu veux jusqu’au mois suivant.'
    ]
  };

  /* Sélection ville (Photon) — lat/lon/tz pour génération natal plus tard */
  var _birthGeo = {
    lat: null,
    lon: null,
    timezone: '',
    label: ''
  };
  var _partnerGeo = {
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
    ultimePreview: null,
    ultimeGenError: null,
    periodPreview: null,
    periodPreviewKind: null,
    periodGenError: null,
    couplePreview: null,
    coupleGenError: null,
    editingPartner: false,
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

  /** Ajoute / remplace ?theme=light|dark sur l’URL du manuscrit (iframe). */
  function withThemeQuery(url) {
    if (!url) return url;
    var t = state.theme === 'light' ? 'light' : 'dark';
    try {
      var abs = new URL(url, location.origin);
      abs.searchParams.set('theme', t);
      return abs.pathname + abs.search + abs.hash;
    } catch (e) {
      var cleaned = String(url).replace(/([?&])theme=(light|dark)(&|$)/i, function (_, a, _v, c) {
        return c === '&' ? a : '';
      }).replace(/[?&]$/, '');
      var sep = cleaned.indexOf('?') >= 0 ? '&' : '?';
      return cleaned + sep + 'theme=' + t;
    }
  }

  function currentAppTheme() {
    return state.theme === 'light' ? 'light' : 'dark';
  }

  /**
   * CSS injecté dans l’iframe pour les manuscrits déjà générés (sans data-theme).
   * Les nouveaux HTML (html-doc) ont déjà ces règles ; injection = no-op visuel.
   */
  var MS_THEME_INJECT_CSS =
    'html[data-theme="light"]{' +
      '--deep:#F4EFE4;--deep-2:#EBE3D4;--gold:#A8842E;--gold-light:#8F6F22;' +
      '--cream:#1C1724;--cream-soft:#2A2433;--violet:#D9CFBE;--muted:#6A6174;' +
      '--card-bg:rgba(255,252,246,.85);--hd-bg:rgba(255,250,240,.9);' +
      '--insight-bg:rgba(248,240,220,.75);--rituel-bg:rgba(255,252,246,.72);' +
      '--frame-border:rgba(168,132,46,.28);--gold-soft:rgba(168,132,46,.65);' +
      '--ink-soft:rgba(28,23,36,.55);--ink-mid:rgba(28,23,36,.82)' +
    '}' +
    'html[data-theme="light"],html[data-theme="light"] body{' +
      'background:#F4EFE4;' +
      'background:radial-gradient(1200px 550px at 10% -10%,rgba(201,168,76,.12),transparent 60%),' +
        'radial-gradient(1000px 700px at 100% 10%,rgba(180,150,90,.08),transparent 60%),#F4EFE4;' +
      'color:#1C1724' +
    '}' +
    'html[data-theme="light"] .sheet,' +
    'html[data-theme="light"] .neb-1,' +
    'html[data-theme="light"] .neb-2,' +
    'html[data-theme="light"] .neb-3,' +
    'html[data-theme="light"] .cover{' +
      'background:linear-gradient(165deg,rgba(255,252,246,.98),rgba(244,239,228,.99))' +
    '}' +
    'html[data-theme="light"] .pl-card,' +
    'html[data-theme="light"] .hd-block,' +
    'html[data-theme="light"] .insight,' +
    'html[data-theme="light"] .mantra,' +
    'html[data-theme="light"] .rituel{' +
      'background:rgba(255,252,246,.88);border-color:rgba(168,132,46,.3)' +
    '}' +
    'html[data-theme="light"] .page-frame{border-color:rgba(168,132,46,.28)}' +
    'html[data-theme="light"] .page-hdr,' +
    'html[data-theme="light"] .page-ftr,' +
    'html[data-theme="light"] .orn,' +
    'html[data-theme="light"] .hdr-name,' +
    'html[data-theme="light"] .cover-for,' +
    'html[data-theme="light"] .ch-sub,' +
    'html[data-theme="light"] .sec-sub{color:rgba(28,23,36,.7)}' +
    'html[data-theme="light"] .cover-titles h1,' +
    'html[data-theme="light"] .sec-title,' +
    'html[data-theme="light"] .ch-title,' +
    'html[data-theme="light"] .pl-val,' +
    'html[data-theme="light"] .hd-v,' +
    'html[data-theme="light"] .intro-body p,' +
    'html[data-theme="light"] .body p,' +
    'html[data-theme="light"] .aff-t,' +
    'html[data-theme="light"] .forces{color:#1C1724}' +
    'html[data-theme="light"] .cover-titles h1 .gold,' +
    'html[data-theme="light"] .pl-sub,' +
    'html[data-theme="light"] .insight,' +
    'html[data-theme="light"] .mantra,' +
    'html[data-theme="light"] .essence,' +
    'html[data-theme="light"] .rituel h3{color:#8F6F22}';

  function applyIframeManuscriptTheme(frame) {
    if (!frame) return;
    var t = currentAppTheme();
    try {
      var win = frame.contentWindow;
      if (win) {
        try { win.postMessage({ type: 'ms-celeste-theme', theme: t }, '*'); } catch (e0) {}
      }
      var doc = frame.contentDocument;
      if (!doc || !doc.documentElement) return;
      doc.documentElement.setAttribute('data-theme', t);
      var style = doc.getElementById('ms-app-theme');
      if (!style) {
        style = doc.createElement('style');
        style.id = 'ms-app-theme';
        style.textContent = MS_THEME_INJECT_CSS;
        (doc.head || doc.documentElement).appendChild(style);
      }
    } catch (e) {}
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
    if (!ultimeCanRead()) clearUltimeLocalBook();
    if (!periodCanRead('mois')) clearPeriodLocalBook('mois');
    if (!periodCanRead('jour')) clearPeriodLocalBook('jour');
    if (!coupleCanRead()) clearCoupleLocalBook();
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
  function isNeedPartnerError(data) {
    if (!data) return false;
    if (data.needPartner) return true;
    var err = String(data.error || '');
    return /partenaire/i.test(err);
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
  function canCouple() {
    if (!state.user) return false;
    if (isPausedPaid()) return false;
    return !!state.user.canCouple;
  }
  function coupleLeft() {
    if (!state.user || !canCouple()) return 0;
    if (state.user.coupleLeft != null && Number.isFinite(Number(state.user.coupleLeft))) {
      return Math.max(0, Math.floor(Number(state.user.coupleLeft)));
    }
    return (state.user.coupleUsedMonth === monthKey() && (state.user.coupleUsed || 0) > 0) ? 0 : 1;
  }
  function partnerComplete() {
    var u = state.user || {};
    if (u.partnerProfileComplete === true) return true;
    var g = String(u.partnerGender || '').trim().toLowerCase();
    return !!(
      String(u.partnerPrenom || '').trim() &&
      String(u.partnerBirthDate || '').trim() &&
      String(u.partnerBirthTime || '').trim() &&
      String(u.partnerBirthPlace || '').trim() &&
      (g === 'femme' || g === 'homme' || g === 'autre')
    );
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
    if (c === 'mois' || c === 'jour' || c === 'natal' || c === 'couple' || c === 'ultime') return c;
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

  /** Animation d’attente livre 3D + cosmos — tous les manuscrits. */
  function manuscriptWaitHtml(kind, opts) {
    opts = opts || {};
    var meta = {
      natal: {
        title: 'Le Manuscrit Céleste de ta vie s’écrit',
        hint: 'Alignement des planètes · calculs du code de vie · assemblage du langage de l’univers. Ne ferme pas cette page.',
        fallback: 'Le ciel compose ton manuscrit — quelques minutes de silence.'
      },
      mois: {
        title: 'Le Manuscrit Céleste du mois s’écrit',
        hint: 'Ton thème natal · le climat du mois · reliure des chapitres. Ne ferme pas cette page.',
        fallback: 'Le ciel compose ton Manuscrit du mois… Quelques minutes.'
      },
      jour: {
        title: 'Le Manuscrit Céleste du jour s’écrit',
        hint: 'Ton thème · l’énergie d’aujourd’hui · une seule porte à ouvrir. Ne ferme pas cette page.',
        fallback: 'Le ciel compose ton Manuscrit du jour…'
      },
      couple: {
        title: 'Le Manuscrit Céleste de couple s’écrit',
        hint: 'Deux thèmes · synastrie · assemblage. Ne ferme pas cette page.',
        fallback: 'Le ciel compose votre manuscrit de couple…'
      },
      ultime: {
        title: 'Le Manuscrit Ultime s’écrit',
        hint: 'Édition longue · patience céleste. Ne ferme pas cette page.',
        fallback: 'Le ciel compose ton Manuscrit Ultime…'
      }
    };
    var m = meta[kind] || meta.natal;
    var pct = opts.pct != null ? Math.max(0, Math.min(100, Number(opts.pct) || 0)) : 12;
    if (pct < 4) pct = 8;
    var progRaw = poeticNatalProgress(opts.progress || m.fallback);
    var progSafe = escapeHtml(progRaw);
    var uid = 'nr' + String(kind || 'x') + String(Date.now() % 1e9);
    var gLine = uid + 'Line';
    var gRing = uid + 'Ring';
    var gSoft = uid + 'Soft';
    return '<div class="natal-cosmos" role="status" aria-live="polite">' +
      '<div class="natal-cosmos-sky" aria-hidden="true">' +
        '<div class="natal-nebula natal-nebula-a"></div>' +
        '<div class="natal-nebula natal-nebula-b"></div>' +
        '<div class="natal-nebula natal-nebula-c"></div>' +
        '<div class="natal-stars natal-stars-far"></div>' +
        '<div class="natal-stars natal-stars-mid"></div>' +
        '<div class="natal-stars natal-stars-near"></div>' +
        '<div class="natal-dust"></div>' +
      '</div>' +
      '<div class="natal-sacred" aria-hidden="true">' +
        '<div class="natal-sacred-spin">' +
          '<div class="natal-sacred-vibrance">' +
            '<svg class="natal-rosace" xmlns="http://www.w3.org/2000/svg" viewBox="-68 -58 136 116" focusable="false">' +
              '<defs>' +
                '<linearGradient id="' + gLine + '" x1="0%" y1="0%" x2="100%" y2="100%">' +
                  '<stop offset="0%" stop-color="rgba(255,252,245,.75)"/>' +
                  '<stop offset="35%" stop-color="rgba(240,208,138,.85)"/>' +
                  '<stop offset="65%" stop-color="rgba(200,180,255,.75)"/>' +
                  '<stop offset="100%" stop-color="rgba(255,252,245,.7)"/>' +
                '</linearGradient>' +
                '<linearGradient id="' + gRing + '" x1="0%" y1="50%" x2="100%" y2="50%">' +
                  '<stop offset="0%" stop-color="rgba(201,168,76,.2)"/>' +
                  '<stop offset="50%" stop-color="rgba(232,201,106,.4)"/>' +
                  '<stop offset="100%" stop-color="rgba(201,168,76,.2)"/>' +
                '</linearGradient>' +
                '<filter id="' + gSoft + '" x="-40%" y="-40%" width="180%" height="180%">' +
                  '<feGaussianBlur in="SourceGraphic" stdDeviation="0.52" result="b"/>' +
                  '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>' +
                '</filter>' +
              '</defs>' +
              '<g fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#' + gSoft + ')">' +
                '<circle cx="0" cy="0" r="58" stroke="url(#' + gRing + ')" stroke-width="0.32" opacity=".5"/>' +
                '<circle cx="0" cy="0" r="52" stroke="rgba(255,252,245,.12)" stroke-width="0.2" stroke-dasharray="1.4 3.5" opacity=".55"/>' +
                '<g stroke="rgba(255,255,255,.18)" stroke-width="0.16" opacity=".45">' +
                  '<line x1="0" y1="0" x2="52" y2="0"/><line x1="0" y1="0" x2="26" y2="45.03"/>' +
                  '<line x1="0" y1="0" x2="-26" y2="45.03"/><line x1="0" y1="0" x2="-52" y2="0"/>' +
                  '<line x1="0" y1="0" x2="-26" y2="-45.03"/><line x1="0" y1="0" x2="26" y2="-45.03"/>' +
                '</g>' +
                '<g stroke="rgba(230,220,255,.26)" stroke-width="0.42">' +
                  '<circle cx="0" cy="0" r="50"/>' +
                  '<path stroke="rgba(255,248,230,.22)" stroke-width="0.38" d="M0,-48 L41.6,-24 L41.6,24 L0,48 L-41.6,24 L-41.6,-24Z"/>' +
                  '<path stroke="rgba(255,255,255,.3)" stroke-width="0.36" d="M14,0 L44,0 M7,12.12 L22,38.1 M-7,12.12 L-22,38.1 M-14,0 L-44,0 M-7,-12.12 L-22,-38.1 M7,-12.12 L22,-38.1"/>' +
                '</g>' +
                '<g stroke="url(#' + gLine + ')" stroke-width="0.4" opacity=".95">' +
                  '<circle cx="0" cy="0" r="19"/><circle cx="19" cy="0" r="19"/>' +
                  '<circle cx="9.5" cy="16.45" r="19"/><circle cx="-9.5" cy="16.45" r="19"/>' +
                  '<circle cx="-19" cy="0" r="19"/><circle cx="-9.5" cy="-16.45" r="19"/>' +
                  '<circle cx="9.5" cy="-16.45" r="19"/>' +
                '</g>' +
                '<g stroke="url(#' + gLine + ')" stroke-width="0.3" opacity=".68">' +
                  '<circle cx="28.5" cy="16.45" r="11"/><circle cx="0" cy="32.9" r="11"/>' +
                  '<circle cx="-28.5" cy="16.45" r="11"/><circle cx="-28.5" cy="-16.45" r="11"/>' +
                  '<circle cx="0" cy="-32.9" r="11"/><circle cx="28.5" cy="-16.45" r="11"/>' +
                '</g>' +
              '</g>' +
            '</svg>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="natal-book-stage" aria-hidden="true">' +
        '<div class="natal-book-aura"></div>' +
        '<div class="natal-book-pivot">' +
          '<div class="natal-book">' +
            '<div class="nb-cover nb-back"></div>' +
            '<div class="nb-pages">' +
              '<span class="nb-page p1"></span>' +
              '<span class="nb-page p2"></span>' +
              '<span class="nb-page p3"></span>' +
              '<span class="nb-page p4"></span>' +
            '</div>' +
            '<div class="nb-cover nb-front">' +
              '<span class="nb-emblem"></span>' +
              '<span class="nb-title-line"></span>' +
            '</div>' +
            '<div class="nb-spine"></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="natal-cosmos-copy">' +
        '<p class="natal-cosmos-title">' + escapeHtml(m.title) + '</p>' +
        '<p class="natal-cosmos-step">' + progSafe + '</p>' +
        '<div class="natal-cosmos-bar"><span style="width:' + pct + '%"></span></div>' +
        '<p class="muted natal-cosmos-hint">' + escapeHtml(m.hint) + '</p>' +
      '</div>' +
      '</div>';
  }

  function isKindGenerating(kind) {
    var u = state.user || {};
    if (state.busy === kind) return true;
    if (kind === 'natal') return u.natalStatus === 'generating';
    if (kind === 'mois') return u.moisStatus === 'generating';
    if (kind === 'jour') return u.jourStatus === 'generating';
    if (kind === 'couple') return u.coupleStatus === 'generating';
    if (kind === 'ultime') return u.ultimeStatus === 'generating';
    return false;
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
    if ((status === 403 || status === 503) && msg) return msg;
    if (status === 404) return 'Compte introuvable. Reconnecte-toi.';
    return msg;
  }

  var _iaUtterance = null;
  var _iaSpeakingBtn = null;

  function iaSpeakSupported() {
    return typeof window !== 'undefined' &&
      !!window.speechSynthesis &&
      typeof SpeechSynthesisUtterance !== 'undefined';
  }

  /** Texte parlé : retire le markdown léger éventuel. */
  function stripIaSpeakText(text) {
    return String(text || '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/#{1,6}\s+/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function stopIaSpeak() {
    if (iaSpeakSupported()) {
      try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    }
    _iaUtterance = null;
    if (_iaSpeakingBtn) {
      _iaSpeakingBtn.classList.remove('is-speaking');
      _iaSpeakingBtn.setAttribute('aria-pressed', 'false');
      var label = _iaSpeakingBtn.querySelector('.ia-speak-label');
      if (label) label.textContent = 'Écouter';
      _iaSpeakingBtn = null;
    }
  }

  function speakIaText(text, btn) {
    if (!iaSpeakSupported()) return;
    if (btn && btn === _iaSpeakingBtn) {
      stopIaSpeak();
      return;
    }
    stopIaSpeak();
    var plain = stripIaSpeakText(text);
    if (!plain) return;
    var u = new SpeechSynthesisUtterance(plain);
    u.lang = 'fr-FR';
    u.rate = 1;
    _iaUtterance = u;
    _iaSpeakingBtn = btn || null;
    if (btn) {
      btn.classList.add('is-speaking');
      btn.setAttribute('aria-pressed', 'true');
      var label = btn.querySelector('.ia-speak-label');
      if (label) label.textContent = 'Arrêter';
    }
    u.onend = function () {
      if (_iaUtterance === u) stopIaSpeak();
    };
    u.onerror = function () {
      if (_iaUtterance === u) stopIaSpeak();
    };
    try {
      window.speechSynthesis.speak(u);
    } catch (e) {
      stopIaSpeak();
    }
  }

  function bindIaSpeakButtons(root) {
    root = root || document;
    var buttons = root.querySelectorAll('[data-ia-speak]');
    if (!buttons.length) return;
    if (!iaSpeakSupported()) {
      for (var i = 0; i < buttons.length; i++) buttons[i].hidden = true;
      return;
    }
    for (var j = 0; j < buttons.length; j++) {
      (function (btn) {
        if (btn._iaSpeakBound) return;
        btn._iaSpeakBound = true;
        btn.onclick = function (e) {
          e.preventDefault();
          e.stopPropagation();
          var bubble = btn.closest ? btn.closest('.ia-bubble') : null;
          var body = bubble && (bubble.querySelector('.ia-bubble-body') || bubble.querySelector('.ia-bubble-text'));
          var text = body ? body.textContent : '';
          speakIaText(text, btn);
        };
      })(buttons[j]);
    }
  }

  /* Dictée gratuite : SpeechRecognition / webkitSpeechRecognition (fr-FR). */
  var _iaRecognition = null;
  var _iaListening = false;
  var _iaListenFinal = '';
  var _iaListenStopManual = false;

  function iaSpeechRecognitionCtor() {
    if (typeof window === 'undefined') return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function iaSpeechSupported() {
    return !!iaSpeechRecognitionCtor();
  }

  function setIaMicUi(listening) {
    _iaListening = !!listening;
    var btn = document.getElementById('ia-mic');
    if (!btn) return;
    btn.classList.toggle('is-listening', _iaListening);
    btn.setAttribute('aria-pressed', _iaListening ? 'true' : 'false');
    btn.setAttribute('aria-label', _iaListening ? 'Arrêter la dictée' : 'Dicter ta question');
  }

  function stopIaListen(opts) {
    opts = opts || {};
    _iaListenStopManual = !!opts.manual;
    if (_iaRecognition) {
      try { _iaRecognition.stop(); } catch (e) {
        try { _iaRecognition.abort(); } catch (e2) { /* ignore */ }
      }
    }
    _iaRecognition = null;
    setIaMicUi(false);
  }

  function startIaListen() {
    var Ctor = iaSpeechRecognitionCtor();
    if (!Ctor) {
      alert(
        'La dictée vocale n’est pas disponible sur ce navigateur. ' +
        'Sur iPhone ou iPad, Safari à jour peut la proposer ; sinon tape ta question. ' +
        'Chrome ou Edge sur ordinateur fonctionnent le mieux.'
      );
      return;
    }
    var input = document.getElementById('ia-q');
    if (!input || input.disabled) return;
    if (state.iaBusy || iaLeft() <= 0) return;

    stopIaSpeak();
    _iaListenFinal = String(input.value || '').trim();
    _iaListenStopManual = false;

    var rec = new Ctor();
    _iaRecognition = rec;
    rec.lang = 'fr-FR';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onstart = function () { setIaMicUi(true); };
    rec.onresult = function (event) {
      var interim = '';
      var finalChunk = '';
      for (var i = event.resultIndex; i < event.results.length; i++) {
        var r = event.results[i];
        var t = (r[0] && r[0].transcript) || '';
        if (r.isFinal) finalChunk += t;
        else interim += t;
      }
      if (finalChunk) {
        _iaListenFinal = (_iaListenFinal ? _iaListenFinal + ' ' : '') + finalChunk;
        _iaListenFinal = _iaListenFinal.replace(/\s+/g, ' ').trim();
      }
      var shown = (_iaListenFinal + (interim ? ' ' + interim : '')).replace(/\s+/g, ' ').trim();
      if (input) input.value = shown;
    };
    rec.onerror = function (event) {
      var err = event && event.error;
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        alert('Micro bloqué. Autorise le micro dans ton navigateur pour dicter ta question.');
      } else if (err === 'audio-capture') {
        alert('Aucun micro détecté. Branche un micro ou autorise l’accès audio.');
      }
      /* aborted / no-speech : silencieux */
    };
    rec.onend = function () {
      var wasManual = _iaListenStopManual;
      var text = (_iaListenFinal || (input && input.value) || '').trim();
      if (input && text) input.value = text;
      _iaRecognition = null;
      _iaListenStopManual = false;
      setIaMicUi(false);
      if (wasManual) return;
      if (text && !state.iaBusy && iaLeft() > 0) {
        sendIa();
        return;
      }
      if (input && text) {
        var sendBtn = document.getElementById('send-ia');
        if (sendBtn && !sendBtn.disabled) sendBtn.focus();
        else input.focus();
      }
    };

    try {
      rec.start();
      setIaMicUi(true);
    } catch (e) {
      _iaRecognition = null;
      setIaMicUi(false);
      alert('Impossible de démarrer la dictée. Réessaie dans un instant.');
    }
  }

  function toggleIaMic() {
    if (_iaListening) {
      stopIaListen({ manual: true });
      return;
    }
    if (!iaSpeechSupported()) {
      alert(
        'La dictée vocale n’est pas disponible sur ce navigateur. ' +
        'Sur iPhone ou iPad, Safari à jour peut la proposer ; sinon tape ta question. ' +
        'Chrome ou Edge sur ordinateur fonctionnent le mieux.'
      );
      return;
    }
    startIaListen();
  }

  function bindIaMicButton() {
    var btn = document.getElementById('ia-mic');
    if (!btn) return;
    if (!iaSpeechSupported()) {
      btn.title = 'Dictée non supportée sur ce navigateur';
    }
    btn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggleIaMic();
    };
    if (_iaListening) setIaMicUi(true);
  }

  function iaBubbleHtml(m) {
    var text = escapeHtml(m.text);
    if (m.role === 'me') {
      return '<div class="ia-bubble me ia-bubble-me">' +
        '<div class="ia-bubble-head"><span class="ia-bubble-name">Toi</span></div>' +
        '<div class="ia-bubble-body">' + text + '</div></div>';
    }
    return '<div class="ia-bubble bot ia-bubble-bot">' +
      '<div class="ia-bubble-head">' +
        '<img class="ia-bubble-avatar" src="/assets/ia-celeste.png" alt="" width="40" height="40" loading="lazy">' +
        '<span class="ia-bubble-name">Céleste répond</span>' +
      '</div>' +
      '<div class="ia-bubble-body">' + text + '</div>' +
      '<button type="button" class="ia-speak" data-ia-speak aria-label="Écouter ce message" aria-pressed="false">' +
        '<svg class="ia-speak-ic" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">' +
          '<path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>' +
        '</svg>' +
        '<span class="ia-speak-label">Écouter</span>' +
      '</button></div>';
  }

  /** Met à jour le chat IA sans re-render de toute la page (conserve le scroll lecteur). */
  function refreshIaChatDom() {
    var logEl = document.getElementById('ia-log');
    if (!logEl) return false;
    stopIaSpeak();
    var msgs = state.iaMessages || [];
    var empty = '<p class="muted ia-empty">Une question sur ce que tu lis… Ex. : que me dit cette page sur l’amour ?</p>';
    logEl.innerHTML = msgs.length ? msgs.map(iaBubbleHtml).join('') : empty;
    logEl.scrollTop = logEl.scrollHeight;
    bindIaSpeakButtons(logEl);
    var left = iaLeft();
    var disabled = state.iaBusy || left <= 0;
    var sendBtn = document.getElementById('send-ia');
    if (sendBtn) {
      sendBtn.disabled = disabled;
      sendBtn.textContent = state.iaBusy
        ? 'Le ciel répond…'
        : (left <= 0 ? 'Le ciel se repose' : 'Envoyer');
    }
    var input = document.getElementById('ia-q');
    if (input) input.disabled = disabled;
    var mic = document.getElementById('ia-mic');
    if (mic) {
      mic.disabled = disabled;
      if (disabled && _iaListening) stopIaListen({ manual: true });
    }
    return true;
  }

  function scrollReaderIaIntoView() {
    var panel = document.querySelector('.reader-ia');
    if (panel && panel.scrollIntoView) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  var MS_SEL_MIN = 12;

  function askIaDevelopPassage(passage) {
    passage = String(passage || '').trim().replace(/\s+/g, ' ');
    if (passage.length < MS_SEL_MIN) return;
    hideMsSelBar();
    if (state.pdf === 'natal' || state.pdf === 'mois' || state.pdf === 'jour' || state.pdf === 'couple') {
      state.iaContext = state.pdf;
    }
    scrollReaderIaIntoView();
    if (!canIa()) return;
    var q = 'Peux-tu mieux m’expliquer et développer ce passage de mon manuscrit ?\n\n« ' +
      passage.slice(0, 1500) + ' »';
    sendIa({ question: q, selectedPassage: passage });
  }

  function hideMsSelBar() {
    var bar = document.getElementById('ms-sel-bar');
    if (bar) {
      bar.hidden = true;
      bar.setAttribute('aria-hidden', 'true');
    }
    state._msSelText = '';
    state._msSelFromIframe = false;
  }

  function showMsSelBar(text) {
    text = String(text || '').trim().replace(/\s+/g, ' ');
    var bar = document.getElementById('ms-sel-bar');
    if (!bar) return;
    if (text.length < MS_SEL_MIN) {
      hideMsSelBar();
      return;
    }
    state._msSelText = text;
    bar.hidden = false;
    bar.setAttribute('aria-hidden', 'false');
  }

  function blockManuscriptCopy(root) {
    if (!root || root._msCopyBound) return;
    root._msCopyBound = true;
    function stop(e) { e.preventDefault(); }
    root.addEventListener('copy', stop);
    root.addEventListener('cut', stop);
    root.addEventListener('dragstart', stop);
  }

  /** Bridge sélection dans l’iframe (fichiers anciens ou nouveaux). */
  function installIframeSelectionBridge(frame) {
    try {
      var doc = frame.contentDocument;
      var win = frame.contentWindow;
      if (!doc || !doc.documentElement || !win) return false;
      applyIframeManuscriptTheme(frame);
      if (doc.documentElement.getAttribute('data-ms-sel-bridge') === '1') return true;
      doc.documentElement.setAttribute('data-ms-sel-bridge', '1');

      var style = doc.createElement('style');
      style.id = 'ms-sel-enable';
      style.textContent =
        'html, body, body * { -webkit-user-select: text !important; user-select: text !important; }';
      (doc.head || doc.documentElement).appendChild(style);

      function stop(e) { e.preventDefault(); }
      doc.addEventListener('copy', stop);
      doc.addEventListener('cut', stop);
      doc.addEventListener('dragstart', stop);

      var last = '';
      function report() {
        var sel = doc.getSelection && doc.getSelection();
        var t = sel && !sel.isCollapsed
          ? String(sel.toString() || '').replace(/\s+/g, ' ').trim()
          : '';
        if (t.length < MS_SEL_MIN) t = '';
        if (t === last) return;
        last = t;
        try {
          win.parent.postMessage({ type: 'ms-celeste-sel', text: t }, '*');
        } catch (err) {}
        /* Fallback direct si same-origin (plus fiable que postMessage seul). */
        state._msSelFromIframe = t.length >= MS_SEL_MIN;
        if (state._msSelFromIframe) showMsSelBar(t);
        else if (!fromParentManuscriptSelection()) hideMsSelBar();
      }

      doc.addEventListener('selectionchange', report);
      doc.addEventListener('mouseup', report);
      doc.addEventListener('keyup', report);
      doc.addEventListener('touchend', function () { setTimeout(report, 80); });
      return true;
    } catch (e) {
      return false;
    }
  }

  function injectNatalFrameGuards(frame) {
    if (!frame) return;
    if (frame._msSelLoadBound) return;
    frame._msSelLoadBound = true;
    function attach() {
      installIframeSelectionBridge(frame);
    }
    frame.addEventListener('load', attach);
    try {
      if (frame.contentDocument && frame.contentDocument.readyState === 'complete') attach();
    } catch (e) {}
    /* Retry si le doc n’est pas encore prêt (token / réseau). */
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      if (installIframeSelectionBridge(frame) || tries >= 20) clearInterval(timer);
    }, 400);
  }

  function fromParentManuscriptSelection() {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed) return '';
    var t = String(sel.toString() || '').replace(/\s+/g, ' ').trim();
    if (t.length < MS_SEL_MIN) return '';
    var pdfBody = document.querySelector('.pdf-body');
    if (!pdfBody) return '';
    var anchor = sel.anchorNode;
    if (!anchor) return '';
    var el = anchor.nodeType === 1 ? anchor : anchor.parentElement;
    if (!el || !pdfBody.contains(el)) return '';
    if (el.closest && el.closest('.reader-ia, .ms-sel-bar, .pdf-view > header, .natal-frame')) return '';
    return t;
  }

  function bindManuscriptSelection() {
    var body = document.querySelector('.pdf-body');
    if (body) blockManuscriptCopy(body);

    var frame = document.querySelector('.natal-frame');
    if (frame) injectNatalFrameGuards(frame);

    var ask = document.getElementById('ms-sel-ask');
    if (ask) {
      ask.onclick = function (e) {
        if (e) e.preventDefault();
        askIaDevelopPassage(state._msSelText || '');
      };
    }

    if (document._msSelBound) return;
    document._msSelBound = true;

    document.addEventListener('selectionchange', function () {
      if (!state.pdf) return;
      var t = fromParentManuscriptSelection();
      if (t) {
        state._msSelFromIframe = false;
        showMsSelBar(t);
      } else if (!state._msSelFromIframe) {
        hideMsSelBar();
      }
    });

    window.addEventListener('message', function (ev) {
      var d = ev && ev.data;
      if (!d || d.type !== 'ms-celeste-sel') return;
      var fr = document.querySelector('.natal-frame');
      if (fr && ev.source && fr.contentWindow && ev.source !== fr.contentWindow) return;
      var text = String(d.text || '').replace(/\s+/g, ' ').trim();
      if (text.length >= MS_SEL_MIN) {
        state._msSelFromIframe = true;
        showMsSelBar(text);
      } else if (state._msSelFromIframe) {
        hideMsSelBar();
      }
    });
  }

  function pdfViewEl() {
    return document.querySelector('.pdf-view');
  }

  function msFrameWrap() {
    return document.getElementById('natal-frame-wrap') || document.querySelector('.natal-frame-wrap');
  }

  function isNativeMsFullscreen() {
    var wrap = msFrameWrap();
    var fs = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
    if (!wrap || !fs) return false;
    return fs === wrap || (wrap.contains && wrap.contains(fs));
  }

  function isPdfFullscreen() {
    var wrap = msFrameWrap();
    if (wrap && wrap.classList.contains('is-ms-fs')) return true;
    return isNativeMsFullscreen();
  }

  function setPdfFsFallback(on) {
    var wrap = msFrameWrap();
    if (wrap) {
      if (on) wrap.classList.add('is-ms-fs');
      else wrap.classList.remove('is-ms-fs');
    }
    document.documentElement.classList.toggle('pdf-fs-active', !!on);
    if (document.body) document.body.classList.toggle('pdf-fs-active', !!on);
  }

  function clearPdfFullscreen() {
    if (isNativeMsFullscreen()) {
      var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
      if (exit) {
        try { exit.call(document); } catch (e) {}
      }
    }
    setPdfFsFallback(false);
  }

  function updateFsButton() {
    var btn = document.getElementById('pdf-fs');
    if (!btn) return;
    var on = isPdfFullscreen();
    btn.textContent = on ? '✕' : '⛶';
    btn.setAttribute('aria-label', on ? 'Quitter le plein écran' : 'Manuscrit en plein écran');
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.title = on ? 'Quitter le plein écran' : 'Manuscrit en plein écran';
  }

  function enterPdfFullscreen() {
    var wrap = msFrameWrap();
    if (!wrap) return;
    var req = wrap.requestFullscreen || wrap.webkitRequestFullscreen || wrap.msRequestFullscreen;
    if (!req) {
      setPdfFsFallback(true);
      updateFsButton();
      return;
    }
    var settled = false;
    function applyFallback() {
      if (settled) return;
      settled = true;
      if (!isNativeMsFullscreen()) setPdfFsFallback(true);
      updateFsButton();
    }
    try {
      var p = req.call(wrap);
      if (p && typeof p.then === 'function') {
        p.then(function () {
          settled = true;
          setPdfFsFallback(false);
          updateFsButton();
        }).catch(applyFallback);
        setTimeout(function () {
          if (!settled && !isNativeMsFullscreen()) applyFallback();
        }, 450);
        return;
      }
    } catch (e) {
      applyFallback();
      return;
    }
    setTimeout(function () {
      if (!isNativeMsFullscreen()) applyFallback();
      else {
        settled = true;
        updateFsButton();
      }
    }, 300);
  }

  function togglePdfFullscreen() {
    if (isPdfFullscreen()) {
      clearPdfFullscreen();
      updateFsButton();
      return;
    }
    enterPdfFullscreen();
  }

  function bindPdfFullscreen() {
    var btn = document.getElementById('pdf-fs');
    if (btn) btn.onclick = function (e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      togglePdfFullscreen();
    };
    updateFsButton();
    if (!document._pdfFsBound) {
      document._pdfFsBound = true;
      document.addEventListener('fullscreenchange', updateFsButton);
      document.addEventListener('webkitfullscreenchange', updateFsButton);
      document.addEventListener('MSFullscreenChange', updateFsButton);
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        var wrap = msFrameWrap();
        if (wrap && wrap.classList.contains('is-ms-fs')) {
          setPdfFsFallback(false);
          updateFsButton();
        }
      });
    }
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
        if (state.pdf) refreshIaChatDom();
      })
      .catch(function () {
        if (local.length) setIaMessages(local, false);
        state.iaLoaded = true;
        if (state.pdf) refreshIaChatDom();
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
    if (kind === 'jour') return periodCanRead('jour');
    if (kind === 'mois') return periodCanRead('mois');
    if (kind === 'couple') return coupleCanRead();
    if (kind === 'natal') return natalCanRead();
    if (kind === 'ultime') return ultimeCanRead();
    var b = loadBooks();
    return !!b[kind];
  }
  function markBook(kind) {
    var b = loadBooks();
    if (kind === 'jour') b.jour = dayKey();
    else if (kind === 'mois') b.mois = monthKey();
    else if (kind === 'couple') b.couple = monthKey();
    else b[kind] = dayKey();
    saveBooks(b);
  }
  function coupleCanRead() {
    var u = state.user || {};
    return !!(u.coupleReady && u.coupleFileExists && u.coupleKey === monthKey());
  }
  function couplePdfUrl() {
    var u = state.user || {};
    var base = u.couplePdfUrl || (u.email ? '/couple-file?email=' + encodeURIComponent(u.email) : '');
    return base ? withAuthQuery(base) : '';
  }
  function clearCoupleLocalBook() {
    try {
      var b = loadBooks();
      if (b.couple) { delete b.couple; saveBooks(b); }
    } catch (e) {}
  }
  function openCoupleReader() {
    if (!coupleCanRead()) {
      clearCoupleLocalBook();
      state.pdf = null;
      state.coupleGenError = 'Ton manuscrit de couple n’est pas encore disponible.';
      render();
      return;
    }
    var u = withAuthQuery(couplePdfUrl());
    if (!u) {
      state.coupleGenError = 'Lien manuscrit manquant. Reconnecte-toi puis réessaie.';
      render();
      return;
    }
    fetch(u, { headers: authHeaders(false) })
      .then(function (r) {
        if (r.ok) {
          var ct = (r.headers.get('content-type') || '').toLowerCase();
          if (ct.indexOf('json') >= 0) {
            return r.json().then(function (j) {
              throw new Error((j && j.error) || 'aucun fichier couple');
            });
          }
          state.couplePreview = u;
          state.pdf = 'couple';
          state.iaContext = 'couple';
          state.iaLoaded = false;
          state.coupleGenError = null;
          markBook('couple');
          render();
          return null;
        }
        return r.json().then(function (j) {
          throw new Error((j && j.error) || ('HTTP ' + r.status));
        }).catch(function (e) {
          if (e && e.message && e.message.indexOf('HTTP') < 0) throw e;
          throw new Error((e && e.message) || 'aucun fichier couple');
        });
      })
      .catch(function () {
        clearCoupleLocalBook();
        if (state.user) {
          state.user.coupleReady = false;
          state.user.coupleFileExists = false;
          state.user.coupleStatus = 'none';
          state.user.couplePdfUrl = null;
          saveUser();
        }
        state.pdf = null;
        state.coupleGenError = 'Fichier couple introuvable. Relance « Demander le manuscrit de couple ».';
        render();
      });
  }
  function pollCoupleUntilReady() {
    state.busy = 'couple';
    render();
    var email = state.user && state.user.email;
    if (!email) {
      state.busy = null;
      render();
      return;
    }
    var tries = 0;
    var maxTries = 120;
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
          var u = state.user || {};
          if (coupleCanRead()) {
            state.busy = null;
            state.coupleGenError = null;
            openCoupleReader();
            return;
          }
          if (u.coupleStatus === 'error') {
            state.busy = null;
            state.coupleGenError = u.coupleError || 'La génération n’a pas pu aboutir. Réessaie.';
            render();
            return;
          }
          if (tries >= maxTries) {
            state.busy = null;
            state.coupleGenError = 'La génération prend plus longtemps que prévu. Reviens dans quelques minutes.';
            render();
            return;
          }
          render();
          setTimeout(tick, 4000);
        })
        .catch(function () {
          if (tries >= maxTries) {
            state.busy = null;
            state.coupleGenError = 'Connexion interrompue. Réessaie.';
            render();
            return;
          }
          setTimeout(tick, 4000);
        });
    }
    setTimeout(tick, 3000);
  }
  function savePartnerFromForm() {
    var email = state.user && state.user.email;
    if (!email) return Promise.reject(new Error('non connecté'));
    var prenom = (document.getElementById('partner-prenom') && document.getElementById('partner-prenom').value || '').trim();
    var birthDate = (document.getElementById('partner-birth-date') && document.getElementById('partner-birth-date').value || '').trim();
    var birthTime = (document.getElementById('partner-birth-time') && document.getElementById('partner-birth-time').value || '').trim();
    var birthPlace = (document.getElementById('partner-birth-place') && document.getElementById('partner-birth-place').value || '').trim();
    var genderEl = document.querySelector('input[name="partner-gender"]:checked');
    var gender = genderEl ? genderEl.value : '';
    var latEl = document.getElementById('partner-birth-lat');
    var lonEl = document.getElementById('partner-birth-lon');
    var body = {
      email: email,
      token: state.user.token,
      partnerPrenom: prenom,
      partnerBirthDate: birthDate,
      partnerBirthTime: birthTime,
      partnerBirthPlace: birthPlace,
      partnerGender: gender
    };
    if (latEl && latEl.value) body.partnerBirthLat = parseFloat(latEl.value);
    if (lonEl && lonEl.value) body.partnerBirthLon = parseFloat(lonEl.value);
    if (_partnerGeo.timezone) body.partnerBirthTimezone = _partnerGeo.timezone;
    else if (_partnerGeo.lat != null && !body.partnerBirthLat) {
      body.partnerBirthLat = _partnerGeo.lat;
      body.partnerBirthLon = _partnerGeo.lon;
      if (_partnerGeo.timezone) body.partnerBirthTimezone = _partnerGeo.timezone;
    }
    return fetch(API + '/profile-partner', {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify(body)
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, data: j }; }); })
      .then(function (res) {
        if (res.status === 401) {
          forceReLogin((res.data && res.data.error) || 'Session expirée.');
          throw new Error('auth');
        }
        if (res.data && res.data.contact) applyAccess(res.data.contact);
        if (!res.ok) throw new Error((res.data && res.data.error) || 'Enregistrement partenaire impossible');
        state.editingPartner = false;
        return res;
      });
  }
  function periodCanRead(kind) {
    var u = state.user || {};
    if (kind === 'jour') {
      return !!(u.jourReady && u.jourFileExists && u.jourKey === dayKey());
    }
    if (kind === 'mois') {
      return !!(u.moisReady && u.moisFileExists && u.moisKey === monthKey());
    }
    return false;
  }
  function periodPdfUrl(kind) {
    var u = state.user || {};
    var base = '';
    if (kind === 'jour') {
      base = u.jourPdfUrl || (u.email ? '/jour-file?email=' + encodeURIComponent(u.email) : '');
    } else {
      base = u.moisPdfUrl || (u.email ? '/mois-file?email=' + encodeURIComponent(u.email) : '');
    }
    return base ? withAuthQuery(base) : '';
  }
  function clearPeriodLocalBook(kind) {
    try {
      var b = loadBooks();
      if (kind === 'jour' && b.jour) { delete b.jour; saveBooks(b); }
      if (kind === 'mois' && b.mois) { delete b.mois; saveBooks(b); }
    } catch (e) {}
  }
  function openPeriodReader(kind) {
    kind = kind === 'jour' ? 'jour' : 'mois';
    if (!periodCanRead(kind)) {
      clearPeriodLocalBook(kind);
      state.pdf = null;
      state.periodGenError = kind === 'jour'
        ? 'Ton manuscrit du jour n’est pas encore disponible.'
        : 'Ton manuscrit du mois n’est pas encore disponible.';
      render();
      return;
    }
    var u = withAuthQuery(periodPdfUrl(kind));
    if (!u) {
      state.periodGenError = 'Lien manuscrit manquant. Reconnecte-toi puis réessaie.';
      render();
      return;
    }
    fetch(u, { headers: authHeaders(false) })
      .then(function (r) {
        if (r.ok) {
          var ct = (r.headers.get('content-type') || '').toLowerCase();
          if (ct.indexOf('json') >= 0) {
            return r.json().then(function (j) {
              throw new Error((j && j.error) || ('aucun fichier ' + kind));
            });
          }
          state.periodPreview = u;
          state.periodPreviewKind = kind;
          state.pdf = kind;
          state.periodGenError = null;
          markBook(kind);
          render();
          return null;
        }
        return r.json().then(function (j) {
          throw new Error((j && j.error) || ('HTTP ' + r.status));
        }).catch(function (e) {
          if (e && e.message && e.message.indexOf('HTTP') < 0) throw e;
          throw new Error((e && e.message) || ('aucun fichier ' + kind));
        });
      })
      .catch(function () {
        clearPeriodLocalBook(kind);
        if (state.user) {
          if (kind === 'jour') {
            state.user.jourReady = false;
            state.user.jourFileExists = false;
            state.user.jourStatus = 'none';
            state.user.jourPdfUrl = null;
          } else {
            state.user.moisReady = false;
            state.user.moisFileExists = false;
            state.user.moisStatus = 'none';
            state.user.moisPdfUrl = null;
          }
          saveUser();
        }
        state.pdf = null;
        state.periodGenError = kind === 'jour'
          ? 'Fichier du jour introuvable. Relance « OBTENIR LE MANUSCRIT DU JOUR ».'
          : 'Fichier du mois introuvable. Relance « Demander le manuscrit du mois ».';
        render();
      });
  }
  function askManuscript(kind) {
    if (kind === 'natal' && !canNatal()) return;
    if (kind === 'ultime' && !canUltime() && !ultimeCanRead()) return;
    if (kind === 'couple' && !canCouple() && !coupleCanRead()) return;
    if (kind === 'couple' && coupleLeft() === 0 && !coupleCanRead()) return;
    if (kind === 'jour' && dailyLeft() === 0 && !periodCanRead('jour')) return;
    if (kind === 'mois' && monthlyLeft() === 0 && !periodCanRead('mois')) return;
    if ((kind === 'natal' || kind === 'jour' || kind === 'mois' || kind === 'couple' || kind === 'ultime') && !profileComplete()) {
      showBirthForm(kind);
      return;
    }
    if (kind === 'couple' && !partnerComplete()) {
      state.editingPartner = true;
      state.tab = 'couple';
      state.coupleGenError = null;
      render();
      return;
    }
    if (kind === 'natal' && natalCanRead()) {
      openNatalReader();
      return;
    }
    if (kind === 'ultime' && ultimeCanRead()) {
      openUltimeReader();
      return;
    }
    if ((kind === 'mois' || kind === 'jour') && periodCanRead(kind)) {
      openPeriodReader(kind);
      return;
    }
    if (kind === 'couple' && coupleCanRead()) {
      openCoupleReader();
      return;
    }
    var email = state.user && state.user.email;
    if (!email) return;
    if (kind === 'natal') state.natalGenError = null;
    if (kind === 'ultime') state.ultimeGenError = null;
    if (kind === 'mois' || kind === 'jour') state.periodGenError = null;
    if (kind === 'couple') state.coupleGenError = null;
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
          if (isNeedPartnerError(res.data)) {
            state.editingPartner = true;
            state.tab = 'couple';
            state.coupleGenError = (res.data && res.data.error) || null;
            render();
            return;
          }
          if (kind === 'natal') {
            state.natalGenError = (res.data && res.data.error) || 'Impossible d’écrire ton manuscrit pour le moment.';
            render();
            return;
          }
          if (kind === 'ultime') {
            state.ultimeGenError = (res.data && res.data.error) || 'Impossible d’écrire le Manuscrit Ultime pour le moment.';
            render();
            return;
          }
          if (kind === 'mois' || kind === 'jour') {
            state.periodGenError = (res.data && res.data.error) || 'Impossible d’écrire ce manuscrit.';
            render();
            return;
          }
          if (kind === 'couple') {
            state.coupleGenError = (res.data && res.data.error) || 'Impossible d’écrire le manuscrit de couple.';
            render();
            return;
          }
          alert((res.data && res.data.error) || 'Impossible d’écrire ce manuscrit.');
          render();
          return;
        }
        if (kind === 'natal') {
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
        if (kind === 'ultime') {
          if (res.data && (res.data.status === 'generating' || res.status === 202)) {
            pollUltimeUntilReady();
            return;
          }
          state.busy = null;
          state.ultimeGenError = null;
          if (ultimeCanRead()) {
            openUltimeReader();
          } else {
            state.ultimeGenError = 'Le Manuscrit Ultime n’est pas encore prêt. Réessaie — la génération peut prendre plusieurs minutes.';
            render();
          }
          return;
        }
        if (kind === 'mois' || kind === 'jour') {
          if (res.data && (res.data.status === 'generating' || res.status === 202)) {
            pollPeriodUntilReady(kind);
            return;
          }
          state.busy = null;
          state.periodGenError = null;
          if (periodCanRead(kind)) {
            openPeriodReader(kind);
          } else {
            state.periodGenError = 'Le manuscrit n’est pas encore prêt. Réessaie dans un moment.';
            render();
          }
          return;
        }
        if (kind === 'couple') {
          if (res.data && (res.data.status === 'generating' || res.status === 202)) {
            pollCoupleUntilReady();
            return;
          }
          state.busy = null;
          state.coupleGenError = null;
          if (coupleCanRead()) {
            openCoupleReader();
          } else {
            state.coupleGenError = 'Le manuscrit de couple n’est pas encore prêt. Réessaie dans un moment.';
            render();
          }
          return;
        }
        state.busy = null;
        render();
      })
      .catch(function () {
        state.busy = null;
        if (kind === 'natal') {
          state.natalGenError = 'Le serveur d’accès n’est pas joignable. Réessaie dans un moment.';
          render();
          return;
        }
        if (kind === 'ultime') {
          state.ultimeGenError = 'Le serveur d’accès n’est pas joignable. Réessaie dans un moment.';
          render();
          return;
        }
        if (kind === 'mois' || kind === 'jour') {
          state.periodGenError = 'Le serveur d’accès n’est pas joignable.';
          render();
          return;
        }
        if (kind === 'couple') {
          state.coupleGenError = 'Le serveur d’accès n’est pas joignable.';
          render();
          return;
        }
        alert('Le serveur d’accès n’est pas joignable.');
        render();
      });
  }

  function pollPeriodUntilReady(kind) {
    kind = kind === 'jour' ? 'jour' : 'mois';
    state.busy = kind;
    render();
    var email = state.user && state.user.email;
    if (!email) {
      state.busy = null;
      render();
      return;
    }
    var tries = 0;
    var maxTries = kind === 'jour' ? 60 : 90;
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
          var u = state.user || {};
          if (periodCanRead(kind)) {
            state.busy = null;
            state.periodGenError = null;
            openPeriodReader(kind);
            return;
          }
          var st = kind === 'jour' ? u.jourStatus : u.moisStatus;
          var err = kind === 'jour' ? u.jourError : u.moisError;
          if (st === 'error') {
            state.busy = null;
            state.periodGenError = err || 'La génération n’a pas pu aboutir. Réessaie.';
            render();
            return;
          }
          if (tries >= maxTries) {
            state.busy = null;
            state.periodGenError = 'La génération prend plus longtemps que prévu. Reviens dans quelques minutes.';
            render();
            return;
          }
          render();
          setTimeout(tick, 4000);
        })
        .catch(function () {
          if (tries >= maxTries) {
            state.busy = null;
            state.periodGenError = 'Connexion interrompue. Réessaie.';
            render();
            return;
          }
          setTimeout(tick, 4000);
        });
    }
    setTimeout(tick, 3000);
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

  function ultimePdfUrl() {
    var base = '';
    if (state.user && state.user.ultimePdfUrl) base = state.user.ultimePdfUrl;
    else if (state.user && state.user.email) base = '/ultime-file?email=' + encodeURIComponent(state.user.email);
    return base ? withAuthQuery(base) : '';
  }

  function ultimeCanRead() {
    var u = state.user || {};
    return !!(u.ultimeReady && u.ultimeFileExists);
  }

  function clearUltimeLocalBook() {
    try {
      var b = loadBooks();
      if (b.ultime) {
        delete b.ultime;
        saveBooks(b);
      }
    } catch (e) {}
  }

  function openUltimeReader(url) {
    if (!ultimeCanRead()) {
      clearUltimeLocalBook();
      state.pdf = null;
      state.ultimeGenError = 'Ton Manuscrit Ultime n’est pas encore disponible. Appuie sur « Demander l’Ultime ».';
      render();
      return;
    }
    var u = withAuthQuery(url || ultimePdfUrl());
    if (!u) {
      state.ultimeGenError = 'Lien manuscrit Ultime manquant. Reconnecte-toi puis réessaie.';
      render();
      return;
    }
    fetch(u, { headers: authHeaders(false) })
      .then(function (r) {
        if (r.ok) {
          var ct = (r.headers.get('content-type') || '').toLowerCase();
          if (ct.indexOf('json') >= 0) {
            return r.json().then(function (j) {
              throw new Error((j && j.error) || 'aucun fichier ultime');
            });
          }
          state.ultimePreview = u;
          state.pdf = 'ultime';
          state.iaContext = 'ultime';
          state.iaLoaded = false;
          state.ultimeGenError = null;
          render();
          return null;
        }
        return r.json().then(function (j) {
          throw new Error((j && j.error) || ('HTTP ' + r.status));
        }).catch(function (e) {
          if (e && e.message && e.message.indexOf('HTTP') < 0 && e.message !== 'aucun fichier ultime') throw e;
          throw new Error((e && e.message) || 'aucun fichier ultime');
        });
      })
      .catch(function () {
        clearUltimeLocalBook();
        if (state.user) {
          state.user.ultimeReady = false;
          state.user.ultimeFileExists = false;
          state.user.ultimeStatus = 'none';
          state.user.ultimePdfUrl = null;
          saveUser();
        }
        state.pdf = null;
        state.ultimeGenError = 'Le fichier de l’Ultime est introuvable. Relance « Demander l’Ultime ».';
        render();
      });
  }

  function pollUltimeUntilReady() {
    state.busy = 'ultime';
    render();
    var email = state.user && state.user.email;
    if (!email) {
      state.busy = null;
      render();
      return;
    }
    var tries = 0;
    var maxTries = 150; /* Ultime : plus long que le natal */
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
          var u = state.user || {};
          if (ultimeCanRead()) {
            state.busy = null;
            state.ultimeGenError = null;
            openUltimeReader();
            return;
          }
          if (u.ultimeStatus === 'error') {
            state.busy = null;
            state.ultimeGenError = u.ultimeError || 'La génération de l’Ultime n’a pas pu aboutir. Réessaie.';
            render();
            return;
          }
          if (tries >= maxTries) {
            state.busy = null;
            state.ultimeGenError = 'L’Ultime prend plus longtemps que prévu. Reviens dans quelques minutes — il s’ouvrira dès qu’il est prêt.';
            render();
            return;
          }
          render();
          setTimeout(tick, 5000);
        })
        .catch(function () {
          if (tries >= maxTries) {
            state.busy = null;
            state.ultimeGenError = 'Connexion interrompue pendant la génération de l’Ultime. Réessaie.';
            render();
            return;
          }
          setTimeout(tick, 5000);
        });
    }
    setTimeout(tick, 4000);
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

  function initPartnerPlaceAutocomplete() {
    var input = document.getElementById('partner-birth-place');
    var dropdown = document.getElementById('partner-birth-place-dropdown');
    if (!input || !dropdown || input.disabled) return;
    var latEl = document.getElementById('partner-birth-lat');
    var lonEl = document.getElementById('partner-birth-lon');
    var u = state.user || {};
    if (u.partnerBirthLat != null && u.partnerBirthLon != null && u.partnerBirthPlace) {
      _partnerGeo.lat = typeof u.partnerBirthLat === 'number' ? u.partnerBirthLat : parseFloat(u.partnerBirthLat);
      _partnerGeo.lon = typeof u.partnerBirthLon === 'number' ? u.partnerBirthLon : parseFloat(u.partnerBirthLon);
      _partnerGeo.timezone = u.partnerBirthTimezone || '';
      _partnerGeo.label = u.partnerBirthPlace;
    }
    var debTimer = null;
    var focusIdx = -1;
    var items = [];
    function openDrop() { dropdown.classList.add('open'); }
    function closeDrop() { dropdown.classList.remove('open'); focusIdx = -1; }
    function selectItem(r) {
      _partnerGeo.lat = r.lat;
      _partnerGeo.lon = r.lon;
      _partnerGeo.label = r.value;
      _partnerGeo.timezone = '';
      input.value = r.value;
      if (latEl) latEl.value = r.lat;
      if (lonEl) lonEl.value = r.lon;
      closeDrop();
      fetch('https://timeapi.io/api/timezone/coordinate?latitude=' + r.lat + '&longitude=' + r.lon)
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (d) {
          _partnerGeo.timezone = (d && d.timeZone) || '';
        })
        .catch(function () { _partnerGeo.timezone = ''; });
    }
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
    function search(query) {
      dropdown.innerHTML = '<div class="autocomplete-loading">Recherche…</div>';
      openDrop();
      fetch('https://photon.komoot.io/api/?q=' + encodeURIComponent(query) + '&limit=8&lang=fr')
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
      _partnerGeo.lat = null;
      _partnerGeo.lon = null;
      _partnerGeo.timezone = '';
      _partnerGeo.label = '';
      if (latEl) latEl.value = '';
      if (lonEl) lonEl.value = '';
      var q = input.value.trim();
      clearTimeout(debTimer);
      if (q.length < 2) { closeDrop(); return; }
      debTimer = setTimeout(function () { search(q); }, 320);
    });
    input.addEventListener('blur', function () { setTimeout(closeDrop, 200); });
  }

  function sendIa(opts) {
    opts = opts || {};
    stopIaListen({ manual: true });
    var input = document.getElementById('ia-q');
    var q = String(opts.question != null ? opts.question : (input ? input.value : '') || '').trim();
    if (!q) return;
    if (!canIa()) {
      scrollReaderIaIntoView();
      return;
    }
    if (state.iaBusy) return;
    if (iaLeft() <= 0) {
      alert('Le ciel se repose pour ce mois. Reviens le 1er.');
      return;
    }
    var email = state.user.email;
    var selectedPassage = String(opts.selectedPassage || '').trim();
    var draft = trimIaMessages(state.iaMessages.concat([{ role: 'me', text: q }]));
    setIaMessages(draft, true);
    state.iaBusy = true;
    if (input && opts.question == null) input.value = '';
    else if (input && opts.clearInput !== false) input.value = '';
    if (!refreshIaChatDom()) render();
    var payload = {
      email: email,
      question: q,
      context: normalizeIaCtx(state.iaContext),
      token: state.user && state.user.token
    };
    if (selectedPassage) payload.selectedPassage = selectedPassage.slice(0, 4000);
    fetch(API + '/ia', {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify(payload)
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
        if (!refreshIaChatDom()) render();
      })
      .catch(function () {
        var withBot = trimIaMessages(state.iaMessages.concat([{
          role: 'bot',
          text: 'Le ciel ne répond pas pour le moment. Réessaie dans un instant.'
        }]));
        setIaMessages(withBot, true);
        state.iaBusy = false;
        if (!refreshIaChatDom()) render();
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
      ['natal', '✦', 'Vie'],
      ['mois', '☽', 'Mois'],
      ['jour', '☀', 'Jour'],
      ['couple', '♡', 'Couple']
    ];
    return '<nav class="nav">' + tabs.map(function (t) {
      return '<button data-tab="' + t[0] + '" class="' + (state.tab === t[0] ? 'active' : '') + '"><span class="ic">' + t[1] + '</span>' + t[2] + '</button>';
    }).join('') + '</nav>';
  }

  function pauseBanner() {
    if (!isPausedPaid()) return '';
    var u = state.user || {};
    /* Compteur 6 mois : pertinent pour Céleste, pas pour Divin (Ultime déjà inclus). */
    var ultimePauseNote = plan() === 'divin'
      ? ''
      : '<p class="muted">Mois Ultime conservés : ' + monthsPaid() + ' / 6.</p>';
    return '<div class="card pause-banner stack">' +
      '<div class="label">Abonnement en pause</div>' +
      '<h2>Espace en pause</h2>' +
      '<p>Ton abo ' + ((u.planLabel) || '') + ' est en pause. Tu gardes l’accès Gratuit : 1 manuscrit du mois + 5 manuscrits du jour. Natal, Ultime et IA Céleste se rouvrent dès que tu reprends.</p>' +
      ultimePauseNote +
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
      return manuscriptWaitHtml('natal', {
        pct: u.natalProgressPct,
        progress: u.natalProgress
      });
    }
    if (natalCanRead()) {
      return '<p class="muted">Profil enregistré · ton manuscrit est prêt.</p>';
    }
    return '<p class="muted">Profil enregistré · en attente de ta demande.</p>';
  }

  function ultimeStatusLine() {
    var u = state.user || {};
    if (!profileComplete()) {
      return '<p class="muted">Renseigne ton ciel de naissance pour que l’Ultime puisse s’écrire.</p>' +
        '<button class="btn" type="button" id="edit-profile-natal">Renseigner mon ciel de naissance</button>';
    }
    if (state.ultimeGenError || u.ultimeStatus === 'error') {
      var errRaw = state.ultimeGenError || u.ultimeError || 'La génération de l’Ultime n’a pas pu aboutir. Réessaie.';
      var errSafe = String(errRaw).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (/HD_API_TOKEN|CLAUDE_KEY|ANTHROPIC|manquant/i.test(errRaw)) {
        errSafe = 'La génération n’a pas pu aboutir pour le moment. Réessaie — ton bouton « Demander l’Ultime » reste disponible.';
      }
      return '<div class="natal-wait natal-wait-error" role="alert"><p>' + errSafe + '</p></div>';
    }
    if (u.ultimeStatus === 'generating' || state.busy === 'ultime') {
      return manuscriptWaitHtml('ultime', {
        pct: u.ultimeProgressPct,
        progress: u.ultimeProgress
      });
    }
    if (ultimeCanRead()) {
      return '<p class="muted">Ton Manuscrit Ultime est prêt.</p>';
    }
    return '<p class="muted">Débloqué · en attente de ta demande.</p>';
  }

  function natalTab() {
    var prenom = (state.user && state.user.prenom) || 'toi';
    var months = monthsPaid();
    var left = Math.max(0, ULTIME.need - months);
    var unlocked = canUltime();
    var readyProfile = profileComplete();
    var natalAsk = 'OBTENIR LE MANUSCRIT DE MA VIE';
    var natalRead = 'VOIR LE MANUSCRIT CÉLESTE DE MA VIE';
    var natalCard = canNatal()
      ? '<div class="card stack"><div class="label">' + NATAL.kicker + '</div><h2>' + natalTitleHtml() + '</h2><p>' + NATAL.intro + '</p>' +
        natalStatusLine() +
        (readyProfile ? askBtn('natal', natalAsk, natalRead) : '') +
        '</div>'
      : '<div class="card lock stack"><div class="label">Plan Céleste</div><h2>' + natalTitleHtml() + '</h2><p class="muted">28 pages · 59 € / mois</p><p>' + (isPausedPaid() ? 'Abonnement en pause : le natal se rouvre dès que tu reprends.' : 'Ton manuscrit de vie s’ouvre avec l’abonnement Céleste.') + '</p></div>';
    var ultimeAsk = 'Demander l’Ultime';
    var ultimeRead = 'VOIR LE MANUSCRIT ULTIME';
    var ultime;
    if (unlocked) {
      ultime = '<div class="card stack"><div class="label">Débloqué</div><h2>' + ultimeTitleHtml() + '</h2><p class="muted">' + ULTIME.pages + ' pages</p><p>' + (plan() === 'divin' ? 'Inclus tout de suite dans le Divin.' : 'Six mois payés, même avec des pauses.') + ' Écrit une seule fois, à ta demande.</p>' +
        ultimeStatusLine() +
        (readyProfile ? askBtn('ultime', ultimeAsk, ultimeRead) : '') +
        '</div>';
    } else if (plan() === 'gratuit' && months === 0) {
      ultime = '<div class="card lock stack"><div class="label">Céleste ou Divin</div><h2>' + ultimeTitleHtml() + '</h2><p class="muted">140 pages</p><p>Après 6 mois Céleste, ou immédiatement en Divin.</p></div>';
    } else if (ultimeOn() && isPausedPaid()) {
      ultime = '<div class="card lock stack"><div class="label">En pause</div><h2>' + ultimeTitleHtml() + '</h2><p class="muted">' + ULTIME.pages + ' pages · déjà débloqué</p><p>L’Ultime se rouvre dès que tu reprends l’abonnement.' +
        (plan() === 'divin' ? '' : ' Tes <b>' + months + ' mois</b> restent comptés.') +
        '</p></div>';
    } else {
      ultime = '<div class="card lock stack"><div class="label">Verrouillé</div><h2>' + ultimeTitleHtml() + '</h2><p class="muted">' + ULTIME.pages + ' pages · 6 mois payés, cumulés</p><p>Tu as <b>' + months + ' mois</b> déjà réglés. Encore <b>' + left + '</b> — une pause ne casse pas la série.</p></div>';
    }
    return '<div class="hero-month"><div class="label">Plan ' + ((state.user && state.user.planLabel) || 'Gratuit') + (isPausedPaid() ? ' · pause' : '') + '</div>' +
      '<div class="month">' + natalTitleHtml() + '</div>' +
      '<p class="lede">Bon retour, ' + prenom + '.</p></div>' +
      '<div class="stack">' + pauseBanner() + natalCard + ultime + iaCard() + '</div>';
  }

  function askBtn(kind, askLabel, readLabel) {
    /* Pendant la génération : l’animation livre 3D suffit (pas de bouton grisé). */
    if (isKindGenerating(kind)) return '';
    /* Natal / Ultime : jamais data-pdf / cache local books — uniquement fichier confirmé serveur. */
    if (kind === 'natal') {
      if (natalCanRead()) {
        return '<button class="btn" data-ask="natal">' + readLabel + '</button>';
      }
      return '<button class="btn" data-ask="natal">' + askLabel + '</button>';
    }
    if (kind === 'ultime') {
      if (ultimeCanRead()) {
        return '<button class="btn" data-ask="ultime">' + readLabel + '</button>';
      }
      return '<button class="btn" data-ask="ultime">' + askLabel + '</button>';
    }
    if (kind === 'mois' || kind === 'jour') {
      if (periodCanRead(kind)) {
        return '<button class="btn" data-ask="' + kind + '">' + readLabel + '</button>';
      }
      return '<button class="btn" data-ask="' + kind + '">' + askLabel + '</button>';
    }
    if (kind === 'couple') {
      if (coupleCanRead()) {
        return '<button class="btn" data-ask="couple">' + readLabel + '</button>';
      }
      return '<button class="btn" data-ask="couple">' + askLabel + '</button>';
    }
    return '<button class="btn" data-ask="' + kind + '">' + askLabel + '</button>';
  }

  function iaPortraitHtml(sizeClass) {
    return '<div class="ia-portrait' + (sizeClass ? ' ' + sizeClass : '') + '" aria-hidden="true">' +
      '<img src="/assets/ia-celeste.png" alt="" width="160" height="160" loading="lazy">' +
      '</div>';
  }

  function iaCard() {
    if (canIa()) {
      return '<div class="card stack ia-card">' +
        iaPortraitHtml() +
        '<div class="label">Plan Divin</div><h2>IA Céleste</h2><p class="muted">Disponible</p>' +
        '<p>Elle t’accompagne sous chaque manuscrit, pendant que tu lis — une présence chaleureuse pour éclairer ce que tu ressens.</p></div>';
    }
    return '<div class="card lock stack ia-card">' +
      iaPortraitHtml() +
      '<div class="label">Plan Divin · 137 €</div><h2>IA Céleste</h2><p class="muted">Incluse dans le Divin</p>' +
      '<p>Pendant que tu lis, elle t’écoute : aujourd’hui l’amour ? le travail ? le bon moment ?</p>' +
      '<button class="btn ghost" type="button" data-plan-link="divin">Découvrir le Divin</button></div>';
  }

  function readerIaPanel(ctx) {
    ctx = normalizeIaCtx(ctx);
    if (!canIa()) {
      return '<div class="reader-ia lock stack">' +
        '<div class="reader-ia-head">' +
          iaPortraitHtml('ia-portrait--sm') +
          '<div><div class="label">IA Céleste</div>' +
          '<p>Pose tes questions sur ce manuscrit avec le plan Divin.</p></div>' +
        '</div>' +
        '<button class="btn ghost" type="button" data-plan-link="divin">Passer Divin · 137 €</button>' +
        '</div>';
    }
    ensureIaHistory(ctx);
    var left = iaLeft();
    var log = (state.iaMessages || []).map(iaBubbleHtml).join('');
    var empty = '<p class="muted ia-empty">Une question sur ce que tu lis… Ex. : que me dit cette page sur l’amour ?</p>';
    var disabled = state.iaBusy || left <= 0;
    return '<div class="reader-ia stack" data-ia-context="' + ctx + '">' +
      '<div class="reader-ia-head">' +
        iaPortraitHtml('ia-portrait--sm') +
        '<div><div class="label">IA Céleste · ce manuscrit</div>' +
        '<p class="muted ia-guide-line">Elle est là pour t’éclairer, sans juger.</p></div>' +
      '</div>' +
      '<div class="ia-log" id="ia-log">' + (log || empty) + '</div>' +
      '<div class="ia-compose">' +
        '<div class="field"><label class="label" for="ia-q">Ta question</label>' +
        '<div class="ia-q-row">' +
          '<input class="input" id="ia-q" placeholder="Que me révèle ce passage ?" ' + (disabled ? 'disabled' : '') + ' autocomplete="off">' +
          '<button type="button" class="ia-mic" id="ia-mic" aria-label="Dicter ta question" aria-pressed="false"' +
            (disabled ? ' disabled' : '') +
            ' title="Dicter ta question">' +
            '<svg class="ia-mic-ic" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">' +
              '<path fill="currentColor" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/>' +
            '</svg>' +
          '</button>' +
        '</div></div>' +
        '<button class="btn" id="send-ia"' + (disabled ? ' disabled' : '') + '>' +
          (state.iaBusy ? 'Le ciel répond…' : (left <= 0 ? 'Le ciel se repose' : 'Envoyer')) +
        '</button>' +
      '</div></div>';
  }

  function periodStatusLine(kind) {
    var u = state.user || {};
    if (state.periodGenError && (state.busy === kind || !periodCanRead(kind))) {
      var eSafe = String(state.periodGenError).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return '<div class="natal-wait natal-wait-error" role="alert"><p>' + eSafe + '</p></div>';
    }
    var st = kind === 'jour' ? u.jourStatus : u.moisStatus;
    if (st === 'generating' || state.busy === kind) {
      return manuscriptWaitHtml(kind, {
        pct: kind === 'jour' ? u.jourProgressPct : u.moisProgressPct,
        progress: kind === 'jour' ? u.jourProgress : u.moisProgress
      });
    }
    if (st === 'error') {
      var err = kind === 'jour' ? u.jourError : u.moisError;
      var errSafe = String(err || 'Génération interrompue. Réessaie.').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return '<div class="natal-wait natal-wait-error" role="alert"><p>' + errSafe + '</p></div>';
    }
    return '';
  }

  function moisTab() {
    var ready = periodCanRead('mois');
    var left = monthlyLeft();
    var blocked = left === 0 && !ready;
    var title = moisTitleHtml();
    return '<div class="hero-month"><div class="label">À la demande</div>' +
      '<div class="month">' + title + '</div><p class="lede">' + monthLabel() + '</p></div>' +
      '<div class="stack"><div class="card stack"><div class="label">Ce mois</div>' +
      '<h2>' + title + '</h2><p class="muted">' + MONTHLY.pages + (left != null ? ' · ' + (ready ? 1 : left) + ' / 1 cette année (Gratuit)' : '') + '</p><p>' + MONTHLY.intro + '</p>' +
      periodStatusLine('mois') +
      (blocked ? '' : askBtn('mois', 'Demander le manuscrit du mois', 'Relire le manuscrit du mois')) + '</div>' + iaCard() + '</div>';
  }

  function jourTab() {
    var ready = periodCanRead('jour');
    var left = dailyLeft();
    var blocked = left === 0 && !ready;
    var title = jourTitlePlain();
    return '<div class="hero-month"><div class="label">À la demande</div>' +
      '<div class="month">' + title + '</div><p class="lede">' + todayLabel() + '</p></div>' +
      '<div class="stack"><div class="card stack"><div class="label">Aujourd’hui</div>' +
      '<h2>' + title + '</h2><p class="muted">' + TODAY.pages + (left != null ? ' · ' + (state.user.dailyUsed || 0) + ' / 5 ce mois (Gratuit)' : '') + '</p><p>' + TODAY.intro + '</p>' +
      periodStatusLine('jour') +
      (blocked ? '' : askBtn('jour', 'OBTENIR LE MANUSCRIT DU JOUR', 'Relire le manuscrit du jour')) + '</div>' + iaCard() + '</div>';
  }

  function coupleStatusLine() {
    var u = state.user || {};
    if (state.coupleGenError || u.coupleStatus === 'error') {
      var errRaw = state.coupleGenError || u.coupleError || 'La génération n’a pas pu aboutir.';
      var errSafe = escapeHtml(errRaw);
      return '<div class="natal-wait natal-wait-error" role="alert"><p>' + errSafe + '</p></div>';
    }
    if (u.coupleStatus === 'generating' || state.busy === 'couple') {
      return manuscriptWaitHtml('couple', {
        pct: u.coupleProgressPct,
        progress: u.coupleProgress
      });
    }
    return '';
  }

  function partnerFormHtml() {
    var u = state.user || {};
    var g = u.partnerGender || '';
    var canEdit = u.partnerCanEdit !== false;
    var remaining = u.partnerEditsRemaining != null ? u.partnerEditsRemaining : 3;
    var readOnly = partnerComplete() && !canEdit;
    var ro = readOnly ? ' disabled' : '';
    function gOpt(val, label) {
      return '<label class="gender-opt"><input type="radio" name="partner-gender" value="' + val + '"' +
        (g === val ? ' checked' : '') + (readOnly ? ' disabled' : '') + '> ' + label + '</label>';
    }
    return '<div class="card stack" id="partner-form-card">' +
      '<div class="label">Partenaire</div>' +
      '<h2>Ciel de naissance du partenaire</h2>' +
      '<p class="muted">Prénom, date, heure, lieu et genre — comme pour ton profil. ' +
      (partnerComplete()
        ? (readOnly ? 'Plus aucune modification.' : ('Il te reste ' + remaining + ' correction' + (remaining > 1 ? 's' : '') + '.'))
        : 'Tu pourras corriger jusqu’à 3 fois.') +
      '</p>' +
      '<div class="field"><label class="label" for="partner-prenom">Prénom</label>' +
      '<input class="input" id="partner-prenom" type="text" value="' + escapeHtml(u.partnerPrenom || '') + '" required' + ro + '></div>' +
      '<div class="field"><label class="label" for="partner-birth-date">Date de naissance</label>' +
      '<input class="input" id="partner-birth-date" type="date" value="' + escapeHtml(u.partnerBirthDate || '') + '" required' + ro + '></div>' +
      '<div class="field"><label class="label" for="partner-birth-time">Heure de naissance</label>' +
      '<input class="input" id="partner-birth-time" type="time" value="' + escapeHtml(u.partnerBirthTime || '') + '" required' + ro + '></div>' +
      '<div class="field"><label class="label" for="partner-birth-place">Lieu de naissance</label>' +
      '<div class="autocomplete-wrap">' +
      '<input class="input" id="partner-birth-place" type="text" placeholder="Tape une ville…" value="' + escapeHtml(u.partnerBirthPlace || '') + '" autocomplete="off"' + ro + '>' +
      '<div class="autocomplete-dropdown" id="partner-birth-place-dropdown"></div>' +
      '</div></div>' +
      '<input type="hidden" id="partner-birth-lat" value="' + (u.partnerBirthLat != null ? u.partnerBirthLat : '') + '">' +
      '<input type="hidden" id="partner-birth-lon" value="' + (u.partnerBirthLon != null ? u.partnerBirthLon : '') + '">' +
      '<div class="field"><span class="label">Genre</span>' +
      '<div class="gender-row">' + gOpt('femme', 'Femme') + gOpt('homme', 'Homme') + gOpt('autre', 'Autre') + '</div></div>' +
      (readOnly
        ? ''
        : '<button class="btn" type="button" id="save-partner">Enregistrer le partenaire</button>') +
      (partnerComplete() && state.editingPartner
        ? '<button class="link" type="button" id="cancel-partner-edit">Retour</button>'
        : '') +
      '</div>';
  }

  function coupleTab() {
    var u = state.user || {};
    var ready = coupleCanRead();
    var left = coupleLeft();
    var used = ready ? 1 : (u.coupleUsed || 0);
    var quotaLine = canCouple()
      ? ((ready || used > 0 ? 1 : 0) + ' / 1 ce mois')
      : '';
    var partnerName = (u.partnerPrenom || '').trim();
    var needPartner = !partnerComplete() || state.editingPartner;
    var lock = !canCouple() && !ready;

    if (lock) {
      return '<div class="hero-month"><div class="label">Plan Divin</div>' +
        '<div class="month">Manuscrit Céleste <span class="de-ta-vie">Couple</span></div>' +
        '<p class="lede">Synastrie à deux</p></div>' +
        '<div class="stack"><div class="card lock stack"><div class="label">Plan Divin · 137 €</div>' +
        '<h2>Manuscrit de couple</h2><p class="muted">' + COUPLE.pages + ' · 1 / mois</p>' +
        '<p>' + (isPausedPaid()
          ? 'Abonnement en pause : le manuscrit de couple se rouvre dès que tu reprends le Divin.'
          : 'Réservé au plan Divin — deux ciels croisés, une fois par mois civil.') + '</p>' +
        '<button class="btn ghost" type="button" data-plan-link="divin">Découvrir le Divin</button></div></div>';
    }

    var partnerSummary = partnerComplete() && !state.editingPartner
      ? ('<p class="muted">Avec ' + escapeHtml(partnerName) +
        (u.partnerBirthDate ? ' · ' + escapeHtml(u.partnerBirthDate) : '') +
        ' · <button class="link" type="button" id="edit-partner" style="display:inline;padding:0;border:0;background:none;color:inherit;text-decoration:underline;cursor:pointer">Modifier</button></p>')
      : '';

    return '<div class="hero-month"><div class="label">Plan Divin</div>' +
      '<div class="month">Manuscrit Céleste <span class="de-ta-vie">Couple</span></div>' +
      '<p class="lede">' + monthLabel() + '</p></div>' +
      '<div class="stack">' +
      (needPartner ? partnerFormHtml() : '') +
      '<div class="card stack"><div class="label">À la demande</div>' +
      '<h2>Manuscrit de couple</h2>' +
      '<p class="muted">' + COUPLE.pages + (quotaLine ? ' · ' + quotaLine : '') + '</p>' +
      '<p>' + COUPLE.intro + '</p>' +
      partnerSummary +
      coupleStatusLine() +
      ((!needPartner && (left > 0 || ready))
        ? askBtn('couple', 'Demander le manuscrit de couple', 'Relire le manuscrit de couple')
        : '') +
      '</div>' + iaCard() + '</div>';
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

    /* Progression Ultime : Céleste / mois cumulés — pas pour Divin (déjà inclus). */
    var showUltime = (p === 'celeste' || monthsPaid() > 0) && p !== 'divin';
    var ultimeLine = monthsPaid() + ' / 6 mois payés' + (isPausedPaid() ? ' (conservés)' : '');

    var downloadBlock = '';
    if (u.showDownload || p === 'divin') {
      var dNeed = u.downloadNeed || 2;
      var dHave = u.divinMonthsPaid || 0;
      if (dHave === 0 && p === 'divin' && isActive()) dHave = Math.max(1, monthsPaid() > 0 ? 1 : 0);
      var dLeft = u.downloadMonthsLeft != null ? u.downloadMonthsLeft : Math.max(0, dNeed - dHave);
      if (u.canDownloadAll) {
        downloadBlock =
          '<div class="acct-block">' +
            '<div class="label">Téléchargement · Divin</div>' +
            '<p class="muted acct-hint">Télécharge tous tes manuscrits prêts (natal, mois, jour, couple…) en un fichier ZIP.</p>' +
            '<button class="btn" type="button" id="download-all-ms">Télécharger tous mes manuscrits</button>' +
          '</div>';
      } else {
        downloadBlock =
          '<div class="acct-block">' +
            '<div class="label">Téléchargement · Divin</div>' +
            '<p class="acct-value">Déblocage dans ' + dLeft + ' mois</p>' +
            '<p class="muted acct-hint">Option réservée au Divin, après ' + dNeed +
            ' mois d’abonnement. Progression : <b>' + dHave + ' / ' + dNeed + '</b>.</p>' +
          '</div>';
      }
    }

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
      downloadBlock +
      profileBlock +
      '<div class="acct-block">' +
        '<div class="label">Apparence</div>' +
        '<p class="muted acct-hint">Choisis le ciel qui t’accompagne : sombre ou clair.</p>' +
        themeToggleHtml(false) +
      '</div>' +
      '<div class="acct-block">' +
        '<div class="label">Gérer mon abonnement</div>' +
        '<p class="muted acct-hint">Pour changer de plan, arrête d’abord ton abonnement actuel, puis souscris à nouveau à celui de ton choix.</p>' +
        '<p class="muted acct-hint">Pour toute assistance : contact@formations-spiritualite-energetique.com</p>' +
        '<div class="stack">' + actions + '</div>' +
      '</div>' +
      '<button class="btn ghost" id="close-account">Fermer</button>' +
      '<button class="link" id="logout">Se déconnecter</button>' +
      '</div></div>';
  }

  function pdfView(id) {
    function manuscriptFrameHtml(src, title) {
      return '<div class="natal-frame-wrap" id="natal-frame-wrap">' +
        '<iframe class="natal-frame" title="' + escapeHtml(title || 'Manuscrit') + '" src="' + escapeHtml(src) + '"></iframe>' +
        '<button type="button" class="ms-fs-btn" id="pdf-fs" aria-pressed="false" aria-label="Manuscrit en plein écran" title="Manuscrit en plein écran">⛶</button>' +
        '</div>';
    }
    var titleHtml = natalTitleHtml();
    var titlePlain = natalTitlePlain();
    var kicker = NATAL.kicker;
    var paras = NATAL.body;
    var extra = '';
    if (id === 'mois') {
      titleHtml = moisTitleHtml();
      titlePlain = moisTitlePlain();
      kicker = monthLabel();
      paras = [
        'Voici ton Manuscrit Céleste de ce mois, ancré dans ton thème natal (Human Design + astral).'
      ];
    }
    if (id === 'jour') {
      titleHtml = jourTitlePlain();
      titlePlain = jourTitlePlain();
      kicker = todayLabel();
      paras = [
        'Voici ton Manuscrit Céleste du jour, ancré dans ton thème natal (Human Design + astral).'
      ];
    }
    if (id === 'ultime') {
      titleHtml = ultimeTitleHtml();
      titlePlain = ultimeTitlePlain();
      kicker = 'Édition Ultime';
      paras = [
        plan() === 'divin'
          ? 'Voici ton Manuscrit Céleste Ultime, inclus dans le Divin. Lecture dans l’app tant que ton abonnement est actif.'
          : 'Voici ton Manuscrit Céleste Ultime, débloqué après 6 mois payés. Lecture dans l’app tant que ton abonnement est actif.'
      ];
      var uUrl = withThemeQuery(
        (typeof state.ultimePreview === 'string' && state.ultimePreview) ? state.ultimePreview : ultimePdfUrl()
      );
      if (uUrl && ultimeCanRead()) {
        extra = manuscriptFrameHtml(uUrl, 'Manuscrit Ultime');
      } else {
        extra = '<p class="muted">Manuscrit Ultime indisponible. Reviens à l’accueil et appuie sur « Demander l’Ultime ».</p>';
      }
    }
    if (id === 'natal') {
      var url = withThemeQuery(
        (typeof state.natalPreview === 'string' && state.natalPreview) ? state.natalPreview : natalPdfUrl()
      );
      paras = [
        'Voici ton Manuscrit Céleste de ta vie. Lecture dans l’app uniquement, tant que ton abonnement est actif.'
      ];
      if (url && natalCanRead()) {
        extra = manuscriptFrameHtml(url, 'Manuscrit natal');
      } else {
        extra = '<p class="muted">Manuscrit indisponible pour le moment. Reviens à l’accueil et appuie sur OBTENIR LE MANUSCRIT DE MA VIE.</p>';
      }
    }
    if (id === 'mois' || id === 'jour') {
      var pUrl = withThemeQuery(
        (state.periodPreviewKind === id && typeof state.periodPreview === 'string' && state.periodPreview)
          ? state.periodPreview
          : periodPdfUrl(id)
      );
      paras = [
        id === 'jour'
          ? 'Voici ton Manuscrit Céleste du jour. Lecture dans l’app uniquement, tant que ton abonnement est actif.'
          : 'Voici ton Manuscrit Céleste du mois. Lecture dans l’app uniquement, tant que ton abonnement est actif.'
      ];
      if (pUrl && periodCanRead(id)) {
        extra = manuscriptFrameHtml(pUrl, 'Manuscrit ' + id);
      } else {
        extra = '<p class="muted">Manuscrit indisponible pour le moment. Reviens à l’onglet et demande-le à nouveau.</p>';
      }
    }
    if (id === 'couple') {
      titleHtml = 'Manuscrit Céleste <span class="de-ta-vie">Couple</span>';
      titlePlain = 'Manuscrit Céleste Couple';
      kicker = 'Synastrie';
      var cUrl = withThemeQuery(
        (typeof state.couplePreview === 'string' && state.couplePreview) ? state.couplePreview : couplePdfUrl()
      );
      paras = [
        'Voici votre Manuscrit Céleste de couple. Lecture dans l’app uniquement, tant que ton abonnement Divin est actif.'
      ];
      if (cUrl && coupleCanRead()) {
        extra = manuscriptFrameHtml(cUrl, 'Manuscrit couple');
      } else {
        extra = '<p class="muted">Manuscrit de couple indisponible. Reviens à l’onglet Couple.</p>';
      }
    }
    var body = '<p class="kicker">' + kicker + '</p><h2>' + titleHtml + '</h2>' +
      paras.map(function (p) { return '<p>' + p + '</p>'; }).join('') + extra;
    var iaCtx = (id === 'natal' || id === 'mois' || id === 'jour' || id === 'couple' || id === 'ultime') ? id : null;
    var ia = iaCtx ? readerIaPanel(iaCtx) : '';
    return '<div class="pdf-view"><header>' +
      '<button type="button" class="pdf-back" id="close-pdf">← Retour</button>' +
      '<span class="kicker">' + titlePlain + '</span></header>' +
      '<div class="pdf-body manuscript-protect">' + body + ia + '</div>' +
      '<div class="ms-sel-bar" id="ms-sel-bar" hidden>' +
        '<button type="button" class="ms-sel-btn" id="ms-sel-ask">' +
          'Demander à l’IA Céleste de développer ce passage' +
        '</button>' +
      '</div></div>';
  }

  function render() {
    if (!state.pdf) setPdfFsFallback(false);
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
          : state.tab === 'couple' ? coupleTab()
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
        if (id === 'ultime' && !canUltime() && !ultimeCanRead()) return;
        if (id === 'natal' && !canNatal() && !bookReady('natal')) return;
        if (id === 'couple') {
          openCoupleReader();
          return;
        }
        if (id === 'ultime') {
          openUltimeReader();
          return;
        }
        if (id === 'natal') {
          openNatalReader();
          return;
        }
        state.pdf = id;
        if (id === 'mois' || id === 'jour') {
          state.iaContext = id;
          state.iaLoaded = false;
        }
        render();
      };
    });
    var savePartnerBtn = document.getElementById('save-partner');
    if (savePartnerBtn) {
      savePartnerBtn.onclick = function () {
        var prenom = ((document.getElementById('partner-prenom') || {}).value || '').trim();
        var birthDate = ((document.getElementById('partner-birth-date') || {}).value || '').trim();
        var birthTime = ((document.getElementById('partner-birth-time') || {}).value || '').trim();
        var birthPlace = ((document.getElementById('partner-birth-place') || {}).value || '').trim();
        var genderEl = document.querySelector('input[name="partner-gender"]:checked');
        if (!prenom) { alert('Prénom du partenaire ✦'); return; }
        if (!birthDate) { alert('Date de naissance du partenaire ✦'); return; }
        if (!birthTime) { alert('Heure de naissance du partenaire ✦'); return; }
        if (!birthPlace) { alert('Lieu de naissance du partenaire ✦'); return; }
        if (!genderEl) { alert('Genre du partenaire ✦'); return; }
        savePartnerBtn.disabled = true;
        savePartnerBtn.textContent = 'Enregistrement…';
        savePartnerFromForm()
          .then(function () {
            state.editingPartner = false;
            render();
          })
          .catch(function (e) {
            if (e && e.message === 'auth') return;
            alert((e && e.message) || 'Enregistrement impossible.');
            savePartnerBtn.disabled = false;
            savePartnerBtn.textContent = 'Enregistrer le partenaire';
          });
      };
    }
    var editPartnerBtn = document.getElementById('edit-partner');
    if (editPartnerBtn) {
      editPartnerBtn.onclick = function () {
        state.editingPartner = true;
        render();
      };
    }
    var cancelPartner = document.getElementById('cancel-partner-edit');
    if (cancelPartner) {
      cancelPartner.onclick = function () {
        state.editingPartner = false;
        render();
      };
    }
    initPartnerPlaceAutocomplete();
    var cp = document.getElementById('close-pdf');
    if (cp) cp.onclick = function () {
      stopIaSpeak();
      stopIaListen({ manual: true });
      clearPdfFullscreen();
      state.pdf = null;
      hideMsSelBar();
      render();
    };
    bindPdfFullscreen();
    bindManuscriptSelection();
    bindIaSpeakButtons(document.getElementById('ia-log') || document);
    bindIaMicButton();
    var si = document.getElementById('send-ia');
    if (si) si.onclick = function () { sendIa(); };
    var iq = document.getElementById('ia-q');
    if (iq) iq.onkeydown = function (e) { if (e.key === 'Enter') sendIa(); };

    var oa = document.getElementById('open-account');
    if (oa) oa.onclick = function () { state.account = true; render(); };
    var ca = document.getElementById('close-account');
    if (ca) ca.onclick = function () { state.account = false; render(); };
    var dlAll = document.getElementById('download-all-ms');
    if (dlAll) {
      dlAll.onclick = function () {
        if (!(state.user && state.user.canDownloadAll)) {
          alert('Le téléchargement se débloque après 2 mois en Divin.');
          return;
        }
        var url = withAuthQuery('/download-all?email=' + encodeURIComponent(state.user.email || ''));
        dlAll.disabled = true;
        dlAll.textContent = 'Préparation…';
        fetch(url, { headers: authHeaders(false) })
          .then(function (r) {
            if (!r.ok) {
              return r.json().then(function (j) {
                throw new Error((j && j.error) || 'Téléchargement impossible');
              }).catch(function (e) {
                if (e && e.message && e.message.indexOf('Téléchargement') >= 0) throw e;
                throw new Error('Téléchargement impossible');
              });
            }
            var cd = r.headers.get('content-disposition') || '';
            var m = cd.match(/filename="([^"]+)"/i);
            var fname = (m && m[1]) || 'manuscrits-celestes.zip';
            return r.blob().then(function (blob) { return { blob: blob, fname: fname }; });
          })
          .then(function (pack) {
            var a = document.createElement('a');
            a.href = URL.createObjectURL(pack.blob);
            a.download = pack.fname;
            document.body.appendChild(a);
            a.click();
            setTimeout(function () {
              URL.revokeObjectURL(a.href);
              a.remove();
            }, 2000);
          })
          .catch(function (err) {
            alert((err && err.message) || 'Téléchargement impossible.');
          })
          .finally(function () {
            dlAll.disabled = false;
            dlAll.textContent = 'Télécharger tous mes manuscrits';
          });
      };
    }
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
      stopIaSpeak();
      localStorage.removeItem('cercle.user');
      state.user = null; state.screen = 'login'; state.account = false; state.tab = 'natal';
      state.iaBusy = false; state.iaLoaded = false; state.iaMessages = [];
      state.pdf = null; state.pendingAsk = null; state.natalPreview = null;
      state.periodPreview = null; state.periodPreviewKind = null;
      state.couplePreview = null; state.coupleGenError = null; state.editingPartner = false;
      state.natalGenError = null; state.ultimeGenError = null; state.periodGenError = null;
      state.couplePreview = null; state.coupleGenError = null; state.editingPartner = false;
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
    navigator.serviceWorker.register('/sw.js?v=37').catch(function () {});
  }
})();
