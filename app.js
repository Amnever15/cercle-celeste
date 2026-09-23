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
    intro: 'Disponible tout le mois — écrit seulement quand tu le demandes. Sans ton clic, il n’existe pas.',
    body: [
      'Ce mois-ci, le ciel te demande de ne plus avancer dans le brouillard : attends le signal, puis réponds avec tout ton être.',
      'Saturne touche ta Maison X : ta vocation veut un cadre, pas une fuite en avant. Un seul engagement public suffit.',
      'Fenêtre de puissance : du 8 au 14 — pose une demande claire (projet, lieu, relation) sans forcer le rythme.',
      'La frustration est ton panneau stop. Si tu pousses sans invitation, tu t’épuises.'
    ]
  };

  var TODAY = {
    pages: '2–4 pages',
    intro: 'Un texte court et personnel, écrit pour toi aujourd’hui — seulement si tu le demandes. Pas d’envoi automatique le matin pour tout le monde.',
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

  var state = {
    screen: 'login',
    tab: 'natal',
    user: null,
    deferredPrompt: null,
    pdf: null,
    account: false,
    ia: false,
    iaMessages: [],
    iaBusy: false,
    pendingAsk: null,
    natalPreview: null
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
    syncProfileFlag();
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
    if (kind === 'natal' && state.user && state.user.natalReady) {
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
          if (isNeedProfileError(res.data)) {
            showBirthForm(kind);
            return;
          }
          alert((res.data && res.data.error) || 'Impossible d’écrire ce manuscrit.');
          render();
          return;
        }
        if (kind === 'natal') {
          state.busy = null;
          markBook(kind);
          openNatalReader(res.data && res.data.pdfUrl);
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

  function natalPdfUrl() {
    if (state.user && state.user.natalPdfUrl) return state.user.natalPdfUrl;
    if (state.user && state.user.email) return '/natal-file?email=' + encodeURIComponent(state.user.email);
    return '';
  }

  function openNatalReader(url) {
    var u = url || natalPdfUrl();
    state.natalPreview = u || true;
    state.pdf = 'natal';
    render();
  }

  function saveProfile() {
    var email = state.user && state.user.email;
    if (!email) return;
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

    var btn = document.getElementById('save-profile');
    if (btn) { btn.disabled = true; btn.textContent = 'Enregistrement…'; }

    function postProfile(geo) {
      fetch(API + '/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          birthDate: birthDate,
          birthTime: birthTime,
          birthPlace: birthPlace,
          birthLat: geo.lat,
          birthLon: geo.lon,
          birthTimezone: geo.timezone || '',
          gender: gender
        })
      }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, data: j }; }); })
        .then(function (res) {
          if (!res.ok) {
            alert((res.data && res.data.error) || 'Impossible d’enregistrer le profil.');
            if (btn) { btn.disabled = false; btn.textContent = 'Enregistrer mon profil'; }
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
          localStorage.setItem('cercle.installedHint', '1');
          state.screen = 'app';
          render();
          if (pending) askManuscript(pending);
        })
        .catch(function () {
          alert('Le serveur n’est pas joignable.');
          if (btn) { btn.disabled = false; btn.textContent = 'Enregistrer mon profil'; }
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
    if (!input || !dropdown) return;

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
    if (iaLeft() <= 0) { alert('Tu as déjà posé tes 500 questions ce mois. Elles reviennent le 1er.'); return; }
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
        if (!d || (!d.exists && !d.demo)) return;
        state.user = Object.assign({}, state.user, d);
        syncProfileFlag();
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
        '<div class="brand"><span class="star">✦</span><h1>Les Manuscrits<br><span>Célestes</span></h1>' +
        '<p class="lede">Gratuit, Céleste (59 €) ou Divin (137 €).<br>L’IA Céleste t’accompagne dans le Divin — jusqu’à 500 questions / mois.</p></div>' +
        '<div class="card stack">' +
          '<div class="field"><label class="label" for="prenom">Prénom</label>' +
          '<input class="input" id="prenom" placeholder="Sophie" autocomplete="given-name"></div>' +
          '<div class="field"><label class="label" for="email">Email</label>' +
          '<input class="input" id="email" type="email" placeholder="toi@email.com" autocomplete="email"></div>' +
          '<button class="btn" id="go-in">Entrer</button>' +
          '<p class="lede" style="font-size:.85rem;text-align:center">Première visite ? Utilise l’email de ton abonnement.</p>' +
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
    function genderOpt(val, label) {
      return '<label class="gender-opt"><input type="radio" name="gender" value="' + val + '"' +
        (g === val ? ' checked' : '') + '> ' + label + '</label>';
    }
    return '<div class="screen">' +
      '<div class="scroll noshift stack" style="justify-content:center;max-width:420px;margin:0 auto;width:100%">' +
        '<div class="brand"><span class="star">✦</span><h1>Ton ciel<br><span>de naissance</span></h1>' +
        '<p class="lede">Une seule fois. Enregistré pour toujours sous ' + (u.email || 'ton email') + ' — pour le natal, le jour et le mois.</p></div>' +
        '<div class="card stack">' +
          '<div class="field"><label class="label" for="birth-date">Date de naissance</label>' +
          '<input class="input" id="birth-date" type="date" value="' + (u.birthDate || '') + '" required></div>' +
          '<div class="field"><label class="label" for="birth-time">Heure de naissance</label>' +
          '<input class="input" id="birth-time" type="time" value="' + (u.birthTime || '') + '" required></div>' +
          '<div class="field"><label class="label" for="birth-place">Lieu de naissance</label>' +
          '<div class="autocomplete-wrap">' +
          '<input class="input" id="birth-place" type="text" placeholder="Tape une ville… (ex: Lyon)" value="' + (u.birthPlace || '').replace(/"/g, '&quot;') + '" autocomplete="off">' +
          '<div class="autocomplete-dropdown" id="birth-place-dropdown"></div>' +
          '</div></div>' +
          '<div class="field"><span class="label">Genre</span>' +
          '<div class="gender-row">' + genderOpt('femme', 'Femme') + genderOpt('homme', 'Homme') + genderOpt('autre', 'Autre') + '</div></div>' +
          '<button class="btn" id="save-profile">Enregistrer mon profil</button>' +
          (canNatal() ? '' : '<button class="link" id="skip-onboarding">Plus tard</button>') +
        '</div></div></div>';
  }

  function topbar() {
    var u = state.user || {};
    return '<div class="topbar"><span class="kicker">Les Manuscrits Célestes</span>' +
      '<button class="avatar" id="open-account" aria-label="Compte">' + initial(u.prenom) + '</button></div>';
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
      '<p>Ton abo ' + ((u.planLabel) || '') + ' est en pause. Tu gardes l’accès Gratuit : 5 manuscrits du jour par mois, et 1 manuscrit du mois par an. Natal, Ultime et IA Céleste se rouvrent dès que tu reprends.</p>' +
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
    if (u.natalStatus === 'generating' || state.busy === 'natal') {
      return '<p class="muted">Le ciel s’écrit… ton manuscrit arrive.</p>';
    }
    if (u.natalReady) {
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
    var natalAskLabel = (state.user && state.user.natalReady) ? 'Lire les 28 pages' : 'Demander les 28 pages';
    var natalCard = canNatal()
      ? '<div class="card stack"><div class="label">' + NATAL.kicker + '</div><h2>' + natalTitleHtml() + '</h2><p class="muted">' + NATAL.pages + ' pages · écrit une fois, à ta demande</p><p>' + NATAL.intro + '</p>' +
        natalStatusLine() +
        (readyProfile ? askBtn('natal', natalAskLabel, 'Lire les 28 pages') : '') +
        (state.user && state.user.natalReady && natalPdfUrl()
          ? '<a class="btn ghost" href="' + natalPdfUrl() + '" target="_blank" rel="noopener">Télécharger le PDF</a>'
          : '') +
        '</div>'
      : '<div class="card lock stack"><div class="label">Plan Céleste</div><h2>' + natalTitleHtml() + '</h2><p class="muted">28 pages · 59 € / mois</p><p>' + (isPausedPaid() ? 'Abonnement en pause : le natal se rouvre dès que tu reprends.' : 'Ton manuscrit de vie s’ouvre avec l’abonnement Céleste.') + '</p></div>';
    var ultime;
    if (unlocked) {
      ultime = '<div class="card stack"><div class="label">Débloqué</div><h2>' + ultimeTitleHtml() + '</h2><p class="muted">' + ULTIME.pages + ' pages</p><p>' + (plan() === 'divin' ? 'Inclus tout de suite dans le Divin.' : 'Six mois payés, même avec des pauses.') + ' Écrit une seule fois, à ta demande.</p>' + askBtn('ultime', 'Demander l’Ultime', 'Relire l’Ultime') + '</div>';
    } else if (plan() === 'gratuit' && months === 0) {
      ultime = '<div class="card lock stack"><div class="label">Céleste ou Divin</div><h2>' + ultimeTitleHtml() + '</h2><p class="muted">140 pages</p><p>Après 6 mois Céleste, ou immédiatement en Divin.</p></div>';
    } else if (ultimeOn() && isPausedPaid()) {
      ultime = '<div class="card lock stack"><div class="label">En pause</div><h2>' + ultimeTitleHtml() + '</h2><p class="muted">' + ULTIME.pages + ' pages · déjà débloqué</p><p>L’Ultime se rouvre dès que tu reprends l’abonnement. Tes <b>' + months + ' mois</b> restent comptés.</p><p class="lock-banner">✦ Les mois payés ne s’effacent pas.</p></div>';
    } else {
      ultime = '<div class="card lock stack"><div class="label">Verrouillé</div><h2>' + ultimeTitleHtml() + '</h2><p class="muted">' + ULTIME.pages + ' pages · 6 mois payés, cumulés</p><p>Tu as <b>' + months + ' mois</b> déjà réglés. Encore <b>' + left + '</b> — une pause ne casse pas la série.</p><p class="lock-banner">✦ Les mois payés ne s’effacent pas.</p></div>';
    }
    return '<div class="hero-month"><div class="label">Plan ' + ((state.user && state.user.planLabel) || 'Gratuit') + (isPausedPaid() ? ' · pause' : '') + '</div>' +
      '<div class="month">' + natalTitleHtml() + '</div>' +
      '<p class="lede">Bon retour, ' + prenom + '.</p></div>' +
      '<div class="stack">' + pauseBanner() + natalCard + ultime + iaCard() + '</div>';
  }

  function askBtn(kind, askLabel, readLabel) {
    if (state.busy === kind) return '<button class="btn" disabled>Le ciel s’écrit…</button>';
    if (kind === 'natal' && state.user && state.user.natalReady) {
      return '<button class="btn" data-ask="natal">' + readLabel + '</button>';
    }
    if (bookReady(kind)) return '<button class="btn" data-pdf="' + kind + '">' + readLabel + '</button>';
    return '<button class="btn" data-ask="' + kind + '">' + askLabel + '</button>';
  }

  function iaCard() {
    if (canIa()) {
      return '<div class="card stack"><div class="label">Plan Divin</div><h2>IA Céleste</h2><p class="muted">' + iaLeft() + ' / ' + ((state.user && state.user.iaQuota) || 500) + ' questions ce mois</p><p>Ta compagne intime pendant la lecture — amour, travail, timing… Une réponse courte, jamais un nouveau livre.</p><button class="btn" id="open-ia">Poser une question</button></div>';
    }
    return '<div class="card lock stack"><div class="label">Plan Divin · 137 €</div><h2>IA Céleste</h2><p class="muted">Jusqu’à 500 questions / mois</p><p>Pendant que tu lis, elle t’écoute : aujourd’hui l’amour ? le travail ? le bon moment ? Une présence douce, réservée au Divin.</p></div>';
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
      '<p class="muted">' + (ready ? 'Déjà écrit. Relire ne relance pas l’écriture.' : (blocked ? 'Ton manuscrit mensuel de l’année est déjà utilisé.' : 'Un clic = un manuscrit. Sans clic, rien ne s’écrit.')) + '</p>' +
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
      '<p class="muted">' + (ready ? 'Écrit pour aujourd’hui. Relire est libre.' : (blocked ? 'Tes 5 manuscrits du jour de ce mois sont utilisés.' : 'Les jours sans demande restent silencieux.')) + '</p>' +
      (blocked ? '' : askBtn('jour', 'Demander le manuscrit du jour', 'Relire le manuscrit du jour')) + '</div>' + iaCard() + '</div>';
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
      iaLine = iaLeft() + ' / ' + (u.iaQuota || 500) + ' questions ce mois';
    } else if (isPausedPaid()) {
      iaLine = 'En pause — se rouvre avec le Divin';
    } else {
      iaLine = 'Réservée au plan Divin';
    }

    var showUltime = (p === 'celeste' || p === 'divin' || monthsPaid() > 0);
    var ultimeLine = monthsPaid() + ' / 6 mois payés' + (isPausedPaid() ? ' (conservés)' : '');

    var profileBlock = profileComplete()
      ? ('<div class="acct-block"><div class="label">Ciel de naissance</div>' +
        '<p class="acct-value">' + (u.birthDate || '') + '</p>' +
        '<p class="muted">' + (u.birthPlace || '') + (u.natalReady ? ' · manuscrit prêt' : '') + '</p></div>')
      : ('<div class="acct-block"><div class="label">Ciel de naissance</div>' +
        '<p class="muted">Pas encore renseigné.</p>' +
        '<button class="btn ghost" type="button" id="edit-profile">Renseigner mon ciel de naissance</button></div>');

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
        '<div class="label">Gérer mon abonnement</div>' +
        '<p class="muted acct-hint">Pour monter de plan, choisis l’offre supérieure et finalise le paiement sur la page sécurisée. Pour descendre, arrête d’abord ton abonnement actuel, puis souscris à l’autre — ainsi tu n’es prélevé qu’une seule fois.</p>' +
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
      var url = natalPdfUrl();
      paras = [
        'Voici l’ouverture de ton manuscrit. Les 28 pages complètes s’écrivent à partir de ton ciel de naissance.',
        'Ton profil est enregistré pour toujours. Tu peux rouvrir ou télécharger le PDF ci-dessous.'
      ];
      if (url) {
        extra = '<p><a class="btn" href="' + url + '" target="_blank" rel="noopener">Ouvrir / télécharger le PDF</a></p>' +
          '<iframe class="natal-frame" title="Manuscrit natal" src="' + url + '"></iframe>';
      }
    }
    var body = '<p class="kicker">' + kicker + '</p><h2>' + titleHtml + '</h2>' +
      paras.map(function (p) { return '<p>' + p + '</p>'; }).join('') + extra;
    var ia = canIa()
      ? '<div class="ia-dock"><button class="btn ghost" id="open-ia">Question à l’IA Céleste · ' + iaLeft() + ' restantes</button></div>'
      : '<div class="ia-dock"><p class="muted">L’IA Céleste t’accompagne ici, dans le plan Divin (jusqu’à 500 questions / mois).</p></div>';
    return '<div class="pdf-view"><header><button id="close-pdf" aria-label="Retour">←</button><span class="kicker">' + titlePlain + '</span></header>' +
      '<div class="pdf-body">' + body + ia + '</div></div>';
  }

  function iaSheet() {
    var log = (state.iaMessages || []).map(function (m) {
      return '<div class="ia-bubble ' + m.role + '">' + m.text + '</div>';
    }).join('');
    return '<div class="sheet" id="ia-sheet"><div class="panel stack">' +
      '<h3>IA Céleste</h3>' +
      '<p class="lede">' + iaLeft() + ' / ' + ((state.user && state.user.iaQuota) || 500) + ' questions ce mois · amour, travail, timing…</p>' +
      '<div class="ia-log">' + (log || '<p class="muted">Une question, une réponse douce. Ex. : aujourd’hui, l’amour ?</p>') + '</div>' +
      '<div class="field"><label class="label" for="ia-q">Ta question</label>' +
      '<input class="input" id="ia-q" placeholder="Est-ce un bon jour pour l’amour ?" ' + (state.iaBusy || iaLeft() <= 0 ? 'disabled' : '') + '></div>' +
      '<button class="btn" id="send-ia"' + (state.iaBusy || iaLeft() <= 0 ? ' disabled' : '') + '>' + (state.iaBusy ? 'Le ciel répond…' : 'Envoyer') + '</button>' +
      '<button class="btn ghost" id="close-ia">Fermer</button></div></div>';
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
        var tab = state.tab === 'mois' ? moisTab() : state.tab === 'jour' ? jourTab() : natalTab();
        html = '<div class="screen">' + topbar() + '<div class="scroll">' + tab + '</div>' + nav() + '</div>';
        if (state.account) html += accountSheet();
        if (state.pdf) html += pdfView(state.pdf);
        if (state.ia) html += iaSheet();
      }
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
          alert((res.data && res.data.error) || 'Aucun abonnement trouvé pour cet email. Souscris d’abord, puis reviens ici.');
          go.disabled = false;
          go.textContent = 'Entrer';
          return;
        }
        applyAccess(Object.assign({ prenom: prenom, email: email }, res.data));
        afterLogin();
        render();
      }).catch(function () {
        alert('Les Manuscrits Célestes ne sont pas joignables pour le moment. Réessaie dans un instant.');
        go.disabled = false;
        go.textContent = 'Entrer';
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
    if (saveP) saveP.onclick = saveProfile;
    initBirthPlaceAutocomplete();
    var skipOn = document.getElementById('skip-onboarding');
    if (skipOn) skipOn.onclick = function () {
      state.pendingAsk = null;
      goAppOrInstall();
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
        if (id === 'ultime' && !canUltime()) return;
        if (id === 'natal' && !canNatal() && !bookReady('natal')) return;
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
      state.ia = false; state.iaMessages = []; state.pdf = null; state.pendingAsk = null; state.natalPreview = null;
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
    navigator.serviceWorker.register('/sw.js?v=13').catch(function () {});
  }
})();
