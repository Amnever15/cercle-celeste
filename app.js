(function () {
  var API = '';

  /* Coller ici les URLs Systeme.io (checkout + portail client). */
  var PLAN_LINKS = {
    celesteCheckout: 'https://go.formations-spiritualite-energetique.com/app-manuscrits-celestes-checkout',
    divinCheckout: 'https://go.formations-spiritualite-energetique.com/app-divines-checkout',
    manageAbo: 'https://go.formations-spiritualite-energetique.com/dashboard/fr/profile/manage-subscriptions'
  };

  var NATAL = {
    title: 'Manuscrit Céleste',
    pages: 28,
    kicker: 'Ton livre natal',
    intro: 'Les 28 pages de ton thème — toujours accessibles tant que l’abonnement est actif.',
    body: [
      'Ici se logera le PDF de 28 pages généré à partir de ta date, ton heure et ton lieu de naissance.',
      'Il ne change pas : c’est qui tu es. Tu le relis autant de fois que tu veux, tant que tu restes dans le Cercle.',
      'Si tu quittes l’abonnement, ce coffre se ferme. Tes données restent, le livre se rouvre dès que tu reviens.'
    ]
  };

  var MONTHLY = {
    id: '2026-09',
    title: 'Manuscrit Céleste du mois',
    label: 'Septembre 2026',
    pages: '8–12 pages',
    intro: 'Disponible tout le mois — mais écrit seulement quand tu cliques. Si tu ne le demandes pas, il n’existe pas.',
    body: [
      'Ce mois-ci, le ciel te demande de ne plus avancer dans le brouillard : attends le signal, puis réponds avec tout ton être.',
      'Saturne touche ta Maison X : ta vocation veut un cadre, pas une fuite en avant. Un seul engagement public suffit.',
      'Fenêtre de puissance : du 8 au 14 — pose une demande claire (projet, lieu, relation) sans forcer le rythme.',
      'La frustration est ton panneau stop. Si tu pousses sans invitation, tu t’épuises.'
    ]
  };

  var TODAY = {
    title: 'Manuscrit Céleste du jour',
    label: 'Mardi 22 septembre 2026',
    pages: '2–4 pages',
    intro: 'Un manuscrit court (2–4 pages), écrit uniquement si tu le demandes aujourd’hui. Pas de génération le matin pour tout le monde.',
    body: [
      'Aujourd’hui, n’ouvre qu’une porte. Une conversation, un message, un pas visible — pas dix.',
      'Ton autorité émotionnelle te dit d’attendre la vague : si c’est agité à 10 h, ce n’est pas encore un oui.',
      'Ce soir, une phrase à écrire : « Qu’est-ce qui s’est ouvert sans que je force ? »'
    ]
  };

  var ULTIME = {
    title: 'Manuscrit Céleste Ultime',
    pages: 140,
    need: 6
  };

  var state = {
    screen: 'login',
    tab: 'natal',
    user: null,
    deferredPrompt: null,
    pdf: null,
    account: false,
    ia: false,
    iaMessages: [],
    iaBusy: false
  };

  function load() {
    try { state.user = JSON.parse(localStorage.getItem('cercle.user') || 'null'); } catch (e) { state.user = null; }
    if (state.user) state.screen = localStorage.getItem('cercle.installedHint') ? 'app' : 'install';
  }
  function saveUser() {
    localStorage.setItem('cercle.user', JSON.stringify(state.user));
  }
  function applyAccess(d) {
    if (!d) return;
    state.user = Object.assign({}, state.user || {}, d);
    saveUser();
  }
  function afterLogin() {
    if (!isActive()) {
      state.screen = 'paused';
    } else if (localStorage.getItem('cercle.installedHint')) {
      state.screen = 'app';
    } else {
      state.screen = 'install';
    }
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
  function canNatal() { return !!(state.user && state.user.canNatal); }
  function canIa() { return !!(state.user && state.user.canIa); }
  function iaLeft() {
    if (!state.user) return 0;
    return state.user.iaLeft == null ? 0 : state.user.iaLeft;
  }
  function dailyLeft() {
    if (!state.user || state.user.dailyLeft == null) return null;
    return state.user.dailyLeft;
  }
  function monthlyLeft() {
    if (!state.user || state.user.monthlyLeft == null) return null;
    return state.user.monthlyLeft;
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
    if (kind === 'ultime' && !ultimeOn()) return;
    if (kind === 'jour' && dailyLeft() === 0) return;
    if (kind === 'mois' && monthlyLeft() === 0) return;
    if (bookReady(kind)) {
      state.pdf = kind;
      render();
      return;
    }
    var email = state.user && state.user.email;
    if (!email) return;
    state.busy = kind;
    render();
    fetch(API + '/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, kind: kind })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, data: j }; }); })
      .then(function (res) {
        if (res.data && res.data.contact) applyAccess(res.data.contact);
        if (!res.ok) {
          state.busy = null;
          alert((res.data && res.data.error) || 'Impossible d’écrire ce manuscrit.');
          render();
          return;
        }
        setTimeout(function () {
          markBook(kind);
          state.busy = null;
          state.pdf = kind;
          render();
        }, 900);
      })
      .catch(function () {
        state.busy = null;
        alert('Le serveur d’accès n’est pas joignable.');
        render();
      });
  }

  function sendIa() {
    var input = document.getElementById('ia-q');
    var q = input ? (input.value || '').trim() : '';
    if (!q) return;
    if (!canIa()) return;
    if (iaLeft() <= 0) { alert('Quota du mois atteint (500). Il revient le 1er.'); return; }
    var email = state.user.email;
    state.iaMessages.push({ role: 'me', text: q });
    state.iaBusy = true;
    render();
    fetch(API + '/ia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, question: q })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, data: j }; }); })
      .then(function (res) {
        if (res.data && res.data.contact) applyAccess(res.data.contact);
        state.iaMessages.push({ role: 'bot', text: (res.data && (res.data.answer || res.data.error)) || 'Silence du ciel.' });
        state.iaBusy = false;
        render();
      })
      .catch(function () {
        state.iaMessages.push({ role: 'bot', text: 'Le serveur ne répond pas.' });
        state.iaBusy = false;
        render();
      });
  }

  function apiLogin(prenom, email) {
    return fetch(API + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prenom: prenom, email: email })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, data: j }; }); });
  }

  function refreshAccess() {
    if (!state.user || !state.user.email) return Promise.resolve();
    return fetch(API + '/access?email=' + encodeURIComponent(state.user.email))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.exists && !d.demo) return;
        state.user = Object.assign({}, state.user, d);
        saveUser();
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
        '<div class="brand"><span class="star">✦</span><h1>Le Cercle<br><span>Céleste</span></h1>' +
        '<p class="lede">Gratuit, Céleste (59 €) ou Divin (137 €).<br>L’IA Céleste vit dans le Divin — 500 questions / mois.</p></div>' +
        '<div class="card stack">' +
          '<div class="field"><label class="label" for="prenom">Prénom</label>' +
          '<input class="input" id="prenom" placeholder="Sophie" autocomplete="given-name"></div>' +
          '<div class="field"><label class="label" for="email">Email</label>' +
          '<input class="input" id="email" type="email" placeholder="toi@email.com" autocomplete="email"></div>' +
          '<button class="btn" id="go-in">Entrer dans le Cercle</button>' +
          '<p class="lede" style="font-size:.85rem;text-align:center">Démo : nina.gratuit@… · sophie.demo@… (Céleste) · clara.divin@…</p>' +
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

  function topbar() {
    var u = state.user || {};
    return '<div class="topbar"><span class="kicker">Cercle Céleste</span>' +
      '<button class="avatar" id="open-account" aria-label="Compte">' + initial(u.prenom) + '</button></div>';
  }

  function nav() {
    var tabs = [
      ['natal', '✦', 'Manuscrit'],
      ['mois', '☽', 'Du mois'],
      ['jour', '☀', 'Du jour']
    ];
    return '<nav class="nav">' + tabs.map(function (t) {
      return '<button data-tab="' + t[0] + '" class="' + (state.tab === t[0] ? 'active' : '') + '"><span class="ic">' + t[1] + '</span>' + t[2] + '</button>';
    }).join('') + '</nav>';
  }

  function natalTab() {
    var prenom = (state.user && state.user.prenom) || 'toi';
    var months = monthsPaid();
    var left = Math.max(0, ULTIME.need - months);
    var unlocked = ultimeOn();
    var natalCard = canNatal()
      ? '<div class="card stack"><div class="label">' + NATAL.kicker + '</div><h2>' + NATAL.title + '</h2><p class="muted">' + NATAL.pages + ' pages · écrit une fois, à ta demande</p><p>' + NATAL.intro + '</p>' + askBtn('natal', 'Demander les 28 pages', 'Relire les 28 pages') + '</div>'
      : '<div class="card lock stack"><div class="label">Plan Céleste</div><h2>' + NATAL.title + '</h2><p class="muted">28 pages · 59 € / mois</p><p>Le livre natal s’ouvre avec l’abonnement Céleste.</p></div>';
    var ultime;
    if (unlocked) {
      ultime = '<div class="card stack"><div class="label">Débloqué</div><h2>' + ULTIME.title + '</h2><p class="muted">' + ULTIME.pages + ' pages</p><p>' + (plan() === 'divin' ? 'Inclus tout de suite dans le Divin.' : 'Six mois payés, même avec des pauses.') + ' Écrit une seule fois, à ta demande.</p>' + askBtn('ultime', 'Demander l’Ultime', 'Relire l’Ultime') + '</div>';
    } else if (plan() === 'gratuit') {
      ultime = '<div class="card lock stack"><div class="label">Céleste ou Divin</div><h2>' + ULTIME.title + '</h2><p class="muted">140 pages</p><p>Après 6 mois Céleste, ou immédiatement en Divin.</p></div>';
    } else {
      ultime = '<div class="card lock stack"><div class="label">Verrouillé</div><h2>' + ULTIME.title + '</h2><p class="muted">' + ULTIME.pages + ' pages · 6 mois payés, cumulés</p><p>Tu as <b>' + months + ' mois</b> déjà réglés. Encore <b>' + left + '</b> — une pause ne casse pas la série.</p><p class="lock-banner">✦ Les mois payés ne s’effacent pas.</p></div>';
    }
    return '<div class="hero-month"><div class="label">Plan ' + ((state.user && state.user.planLabel) || 'Gratuit') + '</div>' +
      '<div class="month">Manuscrit Céleste</div>' +
      '<p class="lede">Bon retour, ' + prenom + '.</p></div>' +
      '<div class="stack">' + natalCard + ultime + iaCard() + '</div>';
  }

  function askBtn(kind, askLabel, readLabel) {
    if (state.busy === kind) return '<button class="btn" disabled>Le ciel s’écrit…</button>';
    if (bookReady(kind)) return '<button class="btn" data-pdf="' + kind + '">' + readLabel + '</button>';
    return '<button class="btn" data-ask="' + kind + '">' + askLabel + '</button>';
  }

  function iaCard() {
    if (canIa()) {
      return '<div class="card stack"><div class="label">Plan Divin</div><h2>IA Céleste</h2><p class="muted">' + iaLeft() + ' / ' + ((state.user && state.user.iaQuota) || 500) + ' questions ce mois</p><p>Experte Human Design et astrologie. Pose ta question à tout moment — une réponse courte, jamais un nouveau livre.</p><button class="btn" id="open-ia">Poser une question</button></div>';
    }
    return '<div class="card lock stack"><div class="label">Plan Divin · 137 €</div><h2>IA Céleste</h2><p class="muted">500 questions / mois</p><p>Quand tu lis un manuscrit et que tu te demandes « aujourd’hui, l’amour ? » — elle répond. Réservée au Divin.</p></div>';
  }

  function moisTab() {
    var ready = bookReady('mois');
    var left = monthlyLeft();
    var blocked = left === 0 && !ready;
    return '<div class="hero-month"><div class="label">À la demande</div>' +
      '<div class="month">Du mois</div><p class="lede">' + monthLabel() + '</p></div>' +
      '<div class="stack"><div class="card stack"><div class="label">Manuscrit Céleste du mois</div>' +
      '<h2>' + MONTHLY.title + '</h2><p class="muted">' + MONTHLY.pages + (left != null ? ' · ' + (ready ? 1 : left) + ' / 1 cette année (Gratuit)' : '') + '</p><p>' + MONTHLY.intro + '</p>' +
      '<p class="muted">' + (ready ? 'Déjà écrit. Relire ne relance pas l’écriture.' : (blocked ? 'Ton manuscrit mensuel de l’année est déjà utilisé.' : 'Un clic = un manuscrit. Pas de clic = pas d’écriture.')) + '</p>' +
      (blocked ? '' : askBtn('mois', 'Demander le manuscrit du mois', 'Relire le manuscrit du mois')) + '</div>' + iaCard() + '</div>';
  }

  function jourTab() {
    var ready = bookReady('jour');
    var left = dailyLeft();
    var blocked = left === 0 && !ready;
    return '<div class="hero-month"><div class="label">À la demande</div>' +
      '<div class="month">Du jour</div><p class="lede">' + todayLabel() + '</p></div>' +
      '<div class="stack"><div class="card stack"><div class="label">Manuscrit Céleste du jour</div>' +
      '<h2>' + TODAY.title + '</h2><p class="muted">' + TODAY.pages + (left != null ? ' · ' + (state.user.dailyUsed || 0) + ' / 5 ce mois (Gratuit)' : '') + '</p><p>' + TODAY.intro + '</p>' +
      '<p class="muted">' + (ready ? 'Écrit pour aujourd’hui. Relire ne coûte rien.' : (blocked ? 'Tes 5 manuscrits du jour de ce mois sont utilisés.' : 'Les jours sans clic restent vides.')) + '</p>' +
      (blocked ? '' : askBtn('jour', 'Demander le manuscrit du jour', 'Relire le manuscrit du jour')) + '</div>' + iaCard() + '</div>';
  }

  function pausedView() {
    var u = state.user || {};
    return '<div class="screen"><div class="scroll noshift stack" style="justify-content:center;max-width:420px;margin:0 auto;width:100%">' +
      '<div class="brand"><span class="star">✦</span><h1>Cercle<br><span>en pause</span></h1>' +
      '<p class="lede">L’abonnement n’est plus actif. Tes mois déjà payés (' + monthsPaid() + '/6) sont conservés pour l’Ultime.</p></div>' +
      '<div class="card stack"><p>Reprends sur Systeme.io avec le même email (' + (u.email || '') + ') : les manuscrits se rouvrent, le compteur continue.</p>' +
      '<button class="btn" id="retry-access">J’ai repris, actualiser</button>' +
      '<button class="link" id="logout">Se déconnecter</button></div></div></div>';
  }

  function accountSheet() {
    var u = state.user || {};
    var p = plan();
    var actions = '';
    if (p === 'divin') {
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
    return '<div class="sheet" id="account-sheet"><div class="panel stack">' +
      '<h3>Ton compte</h3>' +
      '<p>' + (u.prenom || '') + '<br><span class="lede">' + (u.email || '') + '</span></p>' +
      '<p class="lede">Plan ' + ((u.planLabel) || 'Gratuit') + (u.price ? ' · ' + u.price + ' € / mois' : '') + (isActive() ? ' · actif' : ' · inactif') + '.</p>' +
      '<p class="lede">' + (canIa() ? ('IA Céleste : ' + iaLeft() + ' / ' + (u.iaQuota || 500) + ' ce mois.') : 'IA Céleste : plan Divin.') + (plan() === 'celeste' ? ' Ultime : ' + monthsPaid() + ' / 6 mois payés.' : '') + '</p>' +
      '<p class="muted">Monter de plan = nouvelle page de paiement Systeme.io. Rétrograder = arrêter l’offre actuelle puis reprendre l’autre (évite un double prélèvement).</p>' +
      actions +
      '<button class="btn ghost" id="close-account">Fermer</button>' +
      '<button class="link" id="logout">Se déconnecter</button>' +
      '</div></div>';
  }

  function pdfView(id) {
    var title = NATAL.title, kicker = NATAL.kicker, paras = NATAL.body;
    if (id === 'mois') { title = MONTHLY.title; kicker = monthLabel(); paras = MONTHLY.body; }
    if (id === 'jour') { title = TODAY.title; kicker = todayLabel(); paras = TODAY.body; }
    if (id === 'ultime') { title = ULTIME.title; kicker = 'Édition extra-longue'; paras = ['Tes 140 pages s’ouvriront ici, une fois les 6 mois d’abonnement atteints.']; }
    var body = '<p class="kicker">' + kicker + '</p><h2>' + title + '</h2>' +
      paras.map(function (p) { return '<p>' + p + '</p>'; }).join('');
    var ia = canIa()
      ? '<div class="ia-dock"><button class="btn ghost" id="open-ia">Question à l’IA Céleste · ' + iaLeft() + ' restantes</button></div>'
      : '<div class="ia-dock"><p class="muted">L’IA Céleste répond ici, dans le plan Divin (500 questions / mois).</p></div>';
    return '<div class="pdf-view"><header><button id="close-pdf" aria-label="Retour">←</button><span class="kicker">' + title + '</span></header>' +
      '<div class="pdf-body">' + body + ia + '</div></div>';
  }

  function iaSheet() {
    var log = (state.iaMessages || []).map(function (m) {
      return '<div class="ia-bubble ' + m.role + '">' + m.text + '</div>';
    }).join('');
    return '<div class="sheet" id="ia-sheet"><div class="panel stack">' +
      '<h3>IA Céleste</h3>' +
      '<p class="lede">' + iaLeft() + ' / ' + ((state.user && state.user.iaQuota) || 500) + ' ce mois · Human Design + astrologie</p>' +
      '<div class="ia-log">' + (log || '<p class="muted">Une question, une réponse courte. Ex. : aujourd’hui, l’amour ?</p>') + '</div>' +
      '<div class="field"><label class="label" for="ia-q">Ta question</label>' +
      '<input class="input" id="ia-q" placeholder="Est-ce un bon jour pour l’amour ?" ' + (state.iaBusy || iaLeft() <= 0 ? 'disabled' : '') + '></div>' +
      '<button class="btn" id="send-ia"' + (state.iaBusy || iaLeft() <= 0 ? ' disabled' : '') + '>' + (state.iaBusy ? 'Le ciel répond…' : 'Envoyer') + '</button>' +
      '<button class="btn ghost" id="close-ia">Fermer</button></div></div>';
  }

  function render() {
    var root = document.getElementById('app');
    var html = '';
    if (state.screen === 'login') html = loginView();
    else if (state.screen === 'install') html = installView();
    else if (state.screen === 'paused' || (state.user && !isActive() && state.screen === 'app')) {
      html = pausedView();
    } else {
      var tab = state.tab === 'mois' ? moisTab() : state.tab === 'jour' ? jourTab() : natalTab();
      html = '<div class="screen">' + topbar() + '<div class="scroll">' + tab + '</div>' + nav() + '</div>';
      if (state.account) html += accountSheet();
      if (state.pdf) html += pdfView(state.pdf);
      if (state.ia) html += iaSheet();
    }
    root.innerHTML = html;
    bind();
  }

  function bind() {
    var q = new URLSearchParams(location.search);
    var em = document.getElementById('email');
    var pn = document.getElementById('prenom');
    if (em && q.get('email') && !em.value) em.value = q.get('email');
    if (pn && q.get('prenom') && !pn.value) pn.value = q.get('prenom');

    var go = document.getElementById('go-in');
    if (go) go.onclick = function () {
      var prenom = (document.getElementById('prenom').value || '').trim();
      var email = (document.getElementById('email').value || '').trim();
      if (!prenom) { alert('Ton prénom ✦'); return; }
      if (!email) { alert('Un email ✦'); return; }
      go.disabled = true;
      go.textContent = 'Connexion…';
      apiLogin(prenom, email).then(function (res) {
        if (!res.ok) {
          alert((res.data && res.data.error) || 'Aucun abonnement pour cet email. Paie d’abord sur Systeme.io.');
          go.disabled = false;
          go.textContent = 'Entrer dans le Cercle';
          return;
        }
        applyAccess(Object.assign({ prenom: prenom, email: email }, res.data));
        afterLogin();
        render();
      }).catch(function () {
        alert('Le Cercle n’est pas joignable pour le moment. Réessaie dans un instant.');
        go.disabled = false;
        go.textContent = 'Entrer dans le Cercle';
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
          state.screen = 'app';
          render();
        });
      } else {
        alert('Menu du navigateur → Ajouter à l’écran d’accueil (Android) ou Partager → Sur l’écran d’accueil (iPhone).');
      }
    };
    var skip = document.getElementById('skip-install');
    if (skip) skip.onclick = function () {
      localStorage.setItem('cercle.installedHint', '1');
      state.screen = 'app';
      render();
    };

    document.querySelectorAll('[data-tab]').forEach(function (b) {
      b.onclick = function () { state.tab = b.getAttribute('data-tab'); state.pdf = null; render(); };
    });
    document.querySelectorAll('[data-ask]').forEach(function (b) {
      b.onclick = function () { askManuscript(b.getAttribute('data-ask')); };
    });
    document.querySelectorAll('[data-pdf]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-pdf');
        if (id === 'ultime' && !ultimeOn()) return;
        state.pdf = id;
        render();
      };
    });
    var cp = document.getElementById('close-pdf');
    if (cp) cp.onclick = function () { state.pdf = null; render(); };
    var oi = document.getElementById('open-ia');
    if (oi) oi.onclick = function () { state.ia = true; render(); };
    var ci = document.getElementById('close-ia');
    if (ci) ci.onclick = function () { state.ia = false; render(); };
    var si = document.getElementById('send-ia');
    if (si) si.onclick = sendIa;
    var iq = document.getElementById('ia-q');
    if (iq) iq.onkeydown = function (e) { if (e.key === 'Enter') sendIa(); };

    var oa = document.getElementById('open-account');
    if (oa) oa.onclick = function () { state.account = true; render(); };
    var ca = document.getElementById('close-account');
    if (ca) ca.onclick = function () { state.account = false; render(); };
    document.querySelectorAll('[data-plan-link]').forEach(function (b) {
      b.onclick = function () {
        var kind = b.getAttribute('data-plan-link');
        if (kind === 'celeste') openPlanLink(PLAN_LINKS.celesteCheckout);
        else if (kind === 'divin') openPlanLink(PLAN_LINKS.divinCheckout);
        else if (kind === 'manage') openPlanLink(PLAN_LINKS.manageAbo);
        else if (kind === 'downgrade-celeste') {
          alert('Pour revenir à Céleste : arrête d’abord Divin via « Gérer / arrêter », puis paie Céleste. Sinon Systeme.io peut te prélever deux fois.');
          openPlanLink(PLAN_LINKS.celesteCheckout);
        }
      };
    });
    var lo = document.getElementById('logout');
    if (lo) lo.onclick = function () {
      localStorage.removeItem('cercle.user');
      state.user = null; state.screen = 'login'; state.account = false; state.tab = 'natal';
      state.ia = false; state.iaMessages = []; state.pdf = null;
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
  render();
  refreshAccess().then(function () {
    if (state.user) afterLogin();
    render();
  });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(function () {});
})();
