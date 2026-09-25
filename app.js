(function () {
  var API = '';

  /* Coller ici les URLs Systeme.io (checkout + portail client). */
  var PLAN_LINKS = {
    celesteCheckout: 'https://go.formations-spiritualite-energetique.com/app-manuscrits-celestes-checkout',
    divinCheckout: 'https://go.formations-spiritualite-energetique.com/app-divines-checkout',
    divinPlusCheckout: 'https://go.formations-spiritualite-energetique.com/app-divine-plus-checkout',
    manageAbo: 'https://go.formations-spiritualite-energetique.com/dashboard/fr/profile/manage-subscriptions'
  };

  var NATAL = {
    pages: 33,
    kicker: 'Natal',
    intro: 'Les ~33 pages de ton thème — toujours accessibles tant que ton abonnement est actif.',
    body: [
      'Ici s’ouvrira le manuscrit de ~33 pages, écrit à partir de ta date, ton heure et ton lieu de naissance.',
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
    pages: '~180',
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
  var LANG_KEY = 'cercle.lang';
  var IA_MAX = 1000;
  var IA_LS_PREFIX = 'cercle.ia.';

  var APP_LANGS = [
    { code: 'fr', label: 'Français' },
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'he', label: 'עברית' },
    { code: 'pt', label: 'Português' },
    { code: 'de', label: 'Deutsch' },
    { code: 'it', label: 'Italiano' },
    { code: 'ar', label: 'العربية' },
    { code: 'zh', label: '中文' },
    { code: 'ja', label: '日本語' },
    { code: 'ru', label: 'Русский' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'nl', label: 'Nederlands' },
    { code: 'pl', label: 'Polski' },
    { code: 'tr', label: 'Türkçe' },
    { code: 'ko', label: '한국어' }
  ];
  var APP_LANG_CODES = {};
  APP_LANGS.forEach(function (L) { APP_LANG_CODES[L.code] = true; });

  /* Compact i18n — login, account, nav, language warnings. Fallback: en → fr */
  var I18N = {
    fr: {
      'lang.label': 'Langue',
      'lang.warn_login': "Cette langue traduit l’écran de connexion. À la première connexion, elle devient aussi la langue permanente du compte (manuscrits et Céleste) — vous ne pourrez plus la changer ensuite. Aux connexions suivantes, seul cet écran est concerné.",
      'lang.lock_notice': "Choisissez avec soin : vous ne pourrez plus changer la langue plus tard. Les manuscrits et Céleste utiliseront cette langue.",
      'lang.warn_account': "La langue du compte est définitive et ne peut plus être modifiée.",
      'login.lede': 'Gratuit, Céleste (59 €) ou Divin (137 €).<br>L’IA Céleste t’accompagne dans le Divin.',
      'login.email': 'Email',
      'login.password': 'Mot de passe',
      'login.password_ph': '8 caractères minimum',
      'login.submit': 'Se connecter',
      'login.hint': 'Première connexion : choisis un mot de passe (8 caractères min). Même email que ton paiement.',
      'login.connecting': 'Connexion…',
      'nav.vie': 'Vie',
      'nav.mois': 'Mois',
      'nav.jour': 'Jour',
      'nav.couple': 'Couple',
      'account.title': 'Ton compte',
      'account.close': 'Fermer',
      'account.logout': 'Se déconnecter',
      'account.language': 'Langue des manuscrits',
      'account.language_value': "Langue du compte : {lang}",
      'account.appearance': 'Apparence',
      'account.appearance_hint': 'Choisis le ciel qui t’accompagne : sombre ou clair.',
      'account.id': 'Identifiant',
      'account.plan': 'Ton plan',
      'theme.aria': 'Apparence',
      'theme.toggle': 'Changer le thème',
      'theme.dark': 'SOMBRE',
      'theme.light': 'CLAIR',
      'err.email': 'Ton email ✦',
      'err.password': 'Mot de passe : 8 caractères minimum ✦',
      'err.login': 'Email ou mot de passe incorrect.',
      'err.unreachable': 'Les Manuscrits Célestes ne sont pas joignables pour le moment. Réessaie dans un instant.'
    },
    en: {
      'lang.label': 'Language',
      'lang.warn_login': "This language translates the login screen. On your first connection, it also becomes your permanent account language (manuscripts and Céleste) — you will not be able to change it later. On later logins, only this screen is affected.",
      'lang.lock_notice': "Choose carefully: you will not be able to change the language later. Manuscripts and Céleste will use this language.",
      'lang.warn_account': "Your account language is permanent and can no longer be changed.",
      'login.lede': 'Free, Céleste (€59) or Divin (€137).<br>Céleste AI accompanies you on Divin.',
      'login.email': 'Email',
      'login.password': 'Password',
      'login.password_ph': '8 characters minimum',
      'login.submit': 'Sign in',
      'login.hint': 'First sign-in: choose a password (8 characters min). Same email as your payment.',
      'login.connecting': 'Signing in…',
      'nav.vie': 'Life',
      'nav.mois': 'Month',
      'nav.jour': 'Day',
      'nav.couple': 'Couple',
      'account.title': 'Your account',
      'account.close': 'Close',
      'account.logout': 'Sign out',
      'account.language': 'Manuscript language',
      'account.language_value': "Account language: {lang}",
      'account.appearance': 'Appearance',
      'account.appearance_hint': 'Choose the sky that accompanies you: dark or bright.',
      'account.id': 'Identity',
      'account.plan': 'Your plan',
      'theme.aria': 'Appearance',
      'theme.toggle': 'Change theme',
      'theme.dark': 'DARK',
      'theme.light': 'BRIGHT',
      'err.email': 'Your email ✦',
      'err.password': 'Password: 8 characters minimum ✦',
      'err.login': 'Incorrect email or password.',
      'err.unreachable': 'Les Manuscrits Célestes are unreachable right now. Try again in a moment.'
    },
    es: {
      'lang.label': 'Idioma',
      'lang.warn_login': "Este idioma traduce la pantalla de inicio de sesión. En la primera conexión, también se convierte en el idioma permanente de la cuenta (manuscritos y Céleste): no podrás cambiarlo después. En inicios posteriores, solo afecta a esta pantalla.",
      'lang.lock_notice': "Elige con cuidado: no podrás cambiar el idioma más adelante. Los manuscritos y Céleste usarán este idioma.",
      'lang.warn_account': "El idioma de la cuenta es definitivo y ya no se puede cambiar.",
      'login.lede': 'Gratis, Céleste (59 €) o Divin (137 €).<br>La IA Céleste te acompaña en Divin.',
      'login.email': 'Email',
      'login.password': 'Contraseña',
      'login.password_ph': '8 caracteres mínimo',
      'login.submit': 'Iniciar sesión',
      'login.hint': 'Primera conexión: elige una contraseña (8 car. mín.). El mismo email que tu pago.',
      'login.connecting': 'Conectando…',
      'nav.vie': 'Vida',
      'nav.mois': 'Mes',
      'nav.jour': 'Día',
      'nav.couple': 'Pareja',
      'account.title': 'Tu cuenta',
      'account.close': 'Cerrar',
      'account.logout': 'Cerrar sesión',
      'account.language': 'Idioma de los manuscritos',
      'account.language_value': "Idioma de la cuenta: {lang}",
      'account.appearance': 'Apariencia',
      'account.appearance_hint': 'Elige el cielo que te acompaña: oscuro o claro.',
      'account.id': 'Identidad',
      'account.plan': 'Tu plan',
      'theme.aria': 'Apariencia',
      'theme.toggle': 'Cambiar tema',
      'theme.dark': 'OSCURO',
      'theme.light': 'CLARO',
      'err.email': 'Tu email ✦',
      'err.password': 'Contraseña: 8 caracteres mínimo ✦',
      'err.login': 'Email o contraseña incorrectos.',
      'err.unreachable': 'Los Manuscrits Célestes no están disponibles. Inténtalo en un momento.'
    },
    he: {
      'lang.label': 'שפה',
      'lang.warn_login': "שפה זו מתרגמת את מסך ההתחברות. בחיבור הראשון היא גם הופכת לשפת החשבון הקבועה (כתבי יד ו-Céleste) — לא תוכלו לשנות אותה אחר כך. בחיבורים הבאים מושפע רק מסך זה.",
      'lang.lock_notice': "בחרו בזהירות: לא תוכלו לשנות את השפה מאוחר יותר. כתבי היד ו-Céleste ישתמשו בשפה זו.",
      'lang.warn_account': "שפת החשבון קבועה ולא ניתן לשנותה עוד.",
      'login.lede': 'חינם, Céleste‏ (59 €) או Divin‏ (137 €).<br>ה-AI השמימי מלווה אותך ב-Divin.',
      'login.email': 'אימייל',
      'login.password': 'סיסמה',
      'login.password_ph': 'לפחות 8 תווים',
      'login.submit': 'התחברות',
      'login.hint': 'התחברות ראשונה: בחרו סיסמה (לפחות 8 תווים). אותו אימייל כמו בתשלום.',
      'login.connecting': 'מתחבר…',
      'nav.vie': 'חיים',
      'nav.mois': 'חודש',
      'nav.jour': 'יום',
      'nav.couple': 'זוגיות',
      'account.title': 'החשבון שלך',
      'account.close': 'סגור',
      'account.logout': 'התנתקות',
      'account.language': 'שפת כתבי היד',
      'account.language_value': "שפת החשבון: {lang}",
      'account.appearance': 'מראה',
      'account.appearance_hint': 'בחרו את השמיים המלווים אתכם: כהה או בהיר.',
      'account.id': 'זהות',
      'account.plan': 'התוכנית שלך',
      'theme.aria': 'מראה',
      'theme.toggle': 'החלפת ערכת נושא',
      'theme.dark': 'כהה',
      'theme.light': 'בהיר',
      'err.email': 'האימייל שלך ✦',
      'err.password': 'סיסמה: לפחות 8 תווים ✦',
      'err.login': 'אימייל או סיסמה שגויים.',
      'err.unreachable': 'Les Manuscrits Célestes אינם זמינים כרגע. נסו שוב בעוד רגע.'
    },
    pt: {
      'lang.label': 'Idioma',
      'lang.warn_login': "Este idioma traduz o ecrã de início de sessão. Na primeira ligação, torna-se também o idioma permanente da conta (manuscritos e Céleste) — não poderá alterá-lo depois. Nas ligações seguintes, só este ecrã é afetado.",
      'lang.lock_notice': "Escolha com cuidado: não poderá alterar o idioma mais tarde. Os manuscritos e Céleste usarão este idioma.",
      'lang.warn_account': "O idioma da conta é definitivo e já não pode ser alterado.",
      'login.lede': 'Grátis, Céleste (59 €) ou Divin (137 €).<br>A IA Céleste acompanha-te no Divin.',
      'login.email': 'Email',
      'login.password': 'Palavra-passe',
      'login.password_ph': '8 caracteres no mínimo',
      'login.submit': 'Entrar',
      'login.hint': 'Primeira ligação: escolhe uma palavra-passe (mín. 8). O mesmo email do pagamento.',
      'login.connecting': 'A entrar…',
      'nav.vie': 'Vida',
      'nav.mois': 'Mês',
      'nav.jour': 'Dia',
      'nav.couple': 'Casal',
      'account.title': 'A tua conta',
      'account.close': 'Fechar',
      'account.logout': 'Terminar sessão',
      'account.language': 'Idioma dos manuscritos',
      'account.language_value': "Idioma da conta: {lang}",
      'account.appearance': 'Aparência',
      'account.appearance_hint': 'Escolhe o céu que te acompanha: escuro ou claro.',
      'account.id': 'Identidade',
      'account.plan': 'O teu plano',
      'theme.aria': 'Aparência',
      'theme.toggle': 'Mudar tema',
      'theme.dark': 'ESCURO',
      'theme.light': 'CLARO',
      'err.email': 'O teu email ✦',
      'err.password': 'Palavra-passe: 8 caracteres no mínimo ✦',
      'err.login': 'Email ou palavra-passe incorretos.',
      'err.unreachable': 'Les Manuscrits Célestes estão indisponíveis. Tenta novamente em instantes.'
    },
    de: {
      'lang.label': 'Sprache',
      'lang.warn_login': "Diese Sprache übersetzt den Anmeldebildschirm. Bei der ersten Anmeldung wird sie auch zur dauerhaften Kontosprache (Manuskripte und Céleste) — später nicht mehr änderbar. Bei späteren Anmeldungen betrifft sie nur diesen Bildschirm.",
      'lang.lock_notice': "Wähle sorgfältig: Du kannst die Sprache später nicht mehr ändern. Manuskripte und Céleste nutzen diese Sprache.",
      'lang.warn_account': "Die Kontosprache ist endgültig und kann nicht mehr geändert werden.",
      'login.lede': 'Kostenlos, Céleste (59 €) oder Divin (137 €).<br>Die Céleste-KI begleitet dich im Divin.',
      'login.email': 'E-Mail',
      'login.password': 'Passwort',
      'login.password_ph': 'Mindestens 8 Zeichen',
      'login.submit': 'Anmelden',
      'login.hint': 'Erste Anmeldung: wähle ein Passwort (min. 8 Zeichen). Dieselbe E-Mail wie bei der Zahlung.',
      'login.connecting': 'Anmeldung…',
      'nav.vie': 'Leben',
      'nav.mois': 'Monat',
      'nav.jour': 'Tag',
      'nav.couple': 'Paar',
      'account.title': 'Dein Konto',
      'account.close': 'Schließen',
      'account.logout': 'Abmelden',
      'account.language': 'Manuskriptsprache',
      'account.language_value': "Kontosprache: {lang}",
      'account.appearance': 'Erscheinungsbild',
      'account.appearance_hint': 'Wähle den Himmel, der dich begleitet: dunkel oder hell.',
      'account.id': 'Identität',
      'account.plan': 'Dein Plan',
      'theme.aria': 'Erscheinungsbild',
      'theme.toggle': 'Design wechseln',
      'theme.dark': 'DUNKEL',
      'theme.light': 'HELL',
      'err.email': 'Deine E-Mail ✦',
      'err.password': 'Passwort: mindestens 8 Zeichen ✦',
      'err.login': 'E-Mail oder Passwort falsch.',
      'err.unreachable': 'Les Manuscrits Célestes sind gerade nicht erreichbar. Bitte später erneut versuchen.'
    },
    it: {
      'lang.label': 'Lingua',
      'lang.warn_login': "Questa lingua traduce la schermata di accesso. Alla prima connessione diventa anche la lingua permanente dell’account (manoscritti e Céleste) — non potrai cambiarla in seguito. Ai login successivi riguarda solo questa schermata.",
      'lang.lock_notice': "Scegli con cura: non potrai cambiare la lingua in seguito. Manoscritti e Céleste useranno questa lingua.",
      'lang.warn_account': "La lingua dell’account è definitiva e non può più essere modificata.",
      'login.lede': 'Gratis, Céleste (59 €) o Divin (137 €).<br>L’IA Céleste ti accompagna nel Divin.',
      'login.email': 'Email',
      'login.password': 'Password',
      'login.password_ph': '8 caratteri minimo',
      'login.submit': 'Accedi',
      'login.hint': 'Primo accesso: scegli una password (min. 8 caratteri). La stessa email del pagamento.',
      'login.connecting': 'Accesso…',
      'nav.vie': 'Vita',
      'nav.mois': 'Mese',
      'nav.jour': 'Giorno',
      'nav.couple': 'Coppia',
      'account.title': 'Il tuo account',
      'account.close': 'Chiudi',
      'account.logout': 'Esci',
      'account.language': 'Lingua dei manoscritti',
      'account.language_value': "Lingua dell’account: {lang}",
      'account.appearance': 'Aspetto',
      'account.appearance_hint': 'Scegli il cielo che ti accompagna: scuro o chiaro.',
      'account.id': 'Identità',
      'account.plan': 'Il tuo piano',
      'theme.aria': 'Aspetto',
      'theme.toggle': 'Cambia tema',
      'theme.dark': 'SCURO',
      'theme.light': 'CHIARO',
      'err.email': 'La tua email ✦',
      'err.password': 'Password: 8 caratteri minimo ✦',
      'err.login': 'Email o password non corretti.',
      'err.unreachable': 'Les Manuscrits Célestes non sono raggiungibili. Riprova tra un momento.'
    },
    ar: {
      'lang.label': 'اللغة',
      'lang.warn_login': "تترجم هذه اللغة شاشة تسجيل الدخول. عند أول اتصال تصبح أيضاً لغة الحساب الدائمة (المخطوطات وCéleste) — ولن تتمكن من تغييرها لاحقاً. في عمليات الدخول التالية تتأثر هذه الشاشة فقط.",
      'lang.lock_notice': "اختر بعناية: لن تتمكن من تغيير اللغة لاحقاً. ستستخدم المخطوطات وCéleste هذه اللغة.",
      'lang.warn_account': "لغة الحساب نهائية ولا يمكن تغييرها بعد الآن.",
      'login.lede': 'مجاني، Céleste‏ (59 €) أو Divin‏ (137 €).<br>الذكاء السماوي يرافقك في Divin.',
      'login.email': 'البريد',
      'login.password': 'كلمة المرور',
      'login.password_ph': '8 أحرف على الأقل',
      'login.submit': 'تسجيل الدخول',
      'login.hint': 'أول اتصال: اختر كلمة مرور (8 أحرف على الأقل). نفس البريد المستخدم في الدفع.',
      'login.connecting': 'جاري الدخول…',
      'nav.vie': 'حياة',
      'nav.mois': 'شهر',
      'nav.jour': 'يوم',
      'nav.couple': 'زوجان',
      'account.title': 'حسابك',
      'account.close': 'إغلاق',
      'account.logout': 'تسجيل الخروج',
      'account.language': 'لغة المخطوطات',
      'account.language_value': "لغة الحساب: {lang}",
      'account.appearance': 'المظهر',
      'account.appearance_hint': 'اختر السماء التي ترافقك: داكنة أو مشرقة.',
      'account.id': 'الهوية',
      'account.plan': 'خطتك',
      'theme.aria': 'المظهر',
      'theme.toggle': 'تغيير السمة',
      'theme.dark': 'داكن',
      'theme.light': 'مشرق',
      'err.email': 'بريدك ✦',
      'err.password': 'كلمة المرور: 8 أحرف على الأقل ✦',
      'err.login': 'بريد أو كلمة مرور غير صحيحة.',
      'err.unreachable': 'Les Manuscrits Célestes غير متاحة حالياً. أعد المحاولة بعد لحظة.'
    },
    zh: {
      'lang.label': '语言',
      'lang.warn_login': "此语言仅用于登录界面。首次连接时，它也会成为账户永久语言（手稿与 Céleste）——之后无法更改。之后登录时，仅影响本屏幕。",
      'lang.lock_notice': "请谨慎选择：之后将无法更改语言。手稿与 Céleste 将使用此语言。",
      'lang.warn_account': "账户语言已固定，无法再更改。",
      'login.lede': '免费、Céleste（59 €）或 Divin（137 €）。<br>Céleste AI 在 Divin 计划中陪伴你。',
      'login.email': '邮箱',
      'login.password': '密码',
      'login.password_ph': '至少 8 个字符',
      'login.submit': '登录',
      'login.hint': '首次登录：设置密码（至少 8 个字符）。使用与付款相同的邮箱。',
      'login.connecting': '登录中…',
      'nav.vie': '生命',
      'nav.mois': '月',
      'nav.jour': '日',
      'nav.couple': '伴侣',
      'account.title': '我的账户',
      'account.close': '关闭',
      'account.logout': '退出登录',
      'account.language': '手稿语言',
      'account.language_value': "账户语言：{lang}",
      'account.appearance': '外观',
      'account.appearance_hint': '选择伴随你的天空：深色或明亮。',
      'account.id': '身份',
      'account.plan': '你的方案',
      'theme.aria': '外观',
      'theme.toggle': '切换主题',
      'theme.dark': '深色',
      'theme.light': '明亮',
      'err.email': '请输入邮箱 ✦',
      'err.password': '密码至少 8 个字符 ✦',
      'err.login': '邮箱或密码不正确。',
      'err.unreachable': 'Les Manuscrits Célestes 暂时无法连接。请稍后再试。'
    },
    ja: {
      'lang.label': '言語',
      'lang.warn_login': "この言語はログイン画面を翻訳します。初回接続時はアカウントの永久言語（原稿とCéleste）にもなり、後から変更できません。以降のログインではこの画面のみに影響します。",
      'lang.lock_notice': "慎重に選んでください。後から言語は変更できません。原稿とCélesteはこの言語を使います。",
      'lang.warn_account': "アカウント言語は確定済みで、変更できません。",
      'login.lede': '無料、Céleste（59 €）、または Divin（137 €）。<br>DivinではCéleste AIが寄り添います。',
      'login.email': 'メール',
      'login.password': 'パスワード',
      'login.password_ph': '8文字以上',
      'login.submit': 'ログイン',
      'login.hint': '初回：パスワードを設定（8文字以上）。お支払いと同じメール。',
      'login.connecting': '接続中…',
      'nav.vie': '人生',
      'nav.mois': '月',
      'nav.jour': '日',
      'nav.couple': 'カップル',
      'account.title': 'アカウント',
      'account.close': '閉じる',
      'account.logout': 'ログアウト',
      'account.language': '原稿の言語',
      'account.language_value': "アカウント言語：{lang}",
      'account.appearance': '外観',
      'account.appearance_hint': '寄り添う空を選んでください：ダークまたはブライト。',
      'account.id': '身分',
      'account.plan': 'プラン',
      'theme.aria': '外観',
      'theme.toggle': 'テーマ切替',
      'theme.dark': 'ダーク',
      'theme.light': 'ブライト',
      'err.email': 'メールを入力 ✦',
      'err.password': 'パスワードは8文字以上 ✦',
      'err.login': 'メールまたはパスワードが違います。',
      'err.unreachable': 'Les Manuscrits Célestesに接続できません。しばらくして再試行してください。'
    },
    ru: {
      'lang.label': 'Язык',
      'lang.warn_login': "Этот язык переводит экран входа. При первом входе он также становится постоянным языком аккаунта (манускрипты и Céleste) — позже изменить его нельзя. При следующих входах затрагивается только этот экран.",
      'lang.lock_notice': "Выберите внимательно: язык нельзя будет изменить позже. Манускрипты и Céleste будут на этом языке.",
      'lang.warn_account': "Язык аккаунта зафиксирован и больше не меняется.",
      'login.lede': 'Бесплатно, Céleste (59 €) или Divin (137 €).<br>ИИ Céleste сопровождает вас в Divin.',
      'login.email': 'Email',
      'login.password': 'Пароль',
      'login.password_ph': 'минимум 8 символов',
      'login.submit': 'Войти',
      'login.hint': 'Первый вход: выберите пароль (мин. 8). Тот же email, что при оплате.',
      'login.connecting': 'Вход…',
      'nav.vie': 'Жизнь',
      'nav.mois': 'Месяц',
      'nav.jour': 'День',
      'nav.couple': 'Пара',
      'account.title': 'Ваш аккаунт',
      'account.close': 'Закрыть',
      'account.logout': 'Выйти',
      'account.language': 'Язык манускриптов',
      'account.language_value': "Язык аккаунта: {lang}",
      'account.appearance': 'Оформление',
      'account.appearance_hint': 'Выберите небо: тёмное или светлое.',
      'account.id': 'Профиль',
      'account.plan': 'Ваш план',
      'theme.aria': 'Оформление',
      'theme.toggle': 'Сменить тему',
      'theme.dark': 'ТЁМНАЯ',
      'theme.light': 'СВЕТЛАЯ',
      'err.email': 'Ваш email ✦',
      'err.password': 'Пароль: минимум 8 символов ✦',
      'err.login': 'Неверный email или пароль.',
      'err.unreachable': 'Les Manuscrits Célestes сейчас недоступны. Попробуйте позже.'
    },
    hi: {
      'lang.label': 'भाषा',
      'lang.warn_login': "यह भाषा लॉगिन स्क्रीन का अनुवाद करती है। पहली कनेक्शन पर यह खाते की स्थायी भाषा (पांडुलिपियाँ और Céleste) भी बन जाती है — बाद में बदली नहीं जा सकती। बाद के लॉगिन पर केवल यह स्क्रीन प्रभावित होती है।",
      'lang.lock_notice': "सावधानी से चुनें: बाद में भाषा नहीं बदल सकेंगे। पांडुलिपियाँ और Céleste इसी भाषा का उपयोग करेंगे।",
      'lang.warn_account': "खाते की भाषा स्थायी है और अब नहीं बदली जा सकती।",
      'login.lede': 'मुफ़्त, Céleste (59 €) या Divin (137 €)।<br>Divin में Céleste AI आपके साथ है।',
      'login.email': 'ईमेल',
      'login.password': 'पासवर्ड',
      'login.password_ph': 'कम से कम 8 अक्षर',
      'login.submit': 'साइन इन',
      'login.hint': 'पहली बार: पासवर्ड चुनें (न्यून. 8)। भुगतान वाला ही ईमेल।',
      'login.connecting': 'कनेक्ट हो रहा है…',
      'nav.vie': 'जीवन',
      'nav.mois': 'माह',
      'nav.jour': 'दिन',
      'nav.couple': 'जोड़ा',
      'account.title': 'आपका खाता',
      'account.close': 'बंद करें',
      'account.logout': 'साइन आउट',
      'account.language': 'पांडुलिपि भाषा',
      'account.language_value': "खाते की भाषा: {lang}",
      'account.appearance': 'रूप',
      'account.appearance_hint': 'अपना आकाश चुनें: गहरा या उजला।',
      'account.id': 'पहचान',
      'account.plan': 'आपकी योजना',
      'theme.aria': 'रूप',
      'theme.toggle': 'थीम बदलें',
      'theme.dark': 'गहरा',
      'theme.light': 'उजला',
      'err.email': 'आपका ईमेल ✦',
      'err.password': 'पासवर्ड: कम से कम 8 अक्षर ✦',
      'err.login': 'गलत ईमेल या पासवर्ड।',
      'err.unreachable': 'Les Manuscrits Célestes अभी उपलब्ध नहीं। थोड़ी देर बाद कोशिश करें।'
    },
    nl: {
      'lang.label': 'Taal',
      'lang.warn_login': "Deze taal vertaalt het inlogscherm. Bij de eerste verbinding wordt ze ook de permanente accounttaal (manuscripten en Céleste) — later niet meer te wijzigen. Bij latere logins geldt ze alleen voor dit scherm.",
      'lang.lock_notice': "Kies zorgvuldig: je kunt de taal later niet meer wijzigen. Manuscripten en Céleste gebruiken deze taal.",
      'lang.warn_account': "De accounttaal is definitief en kan niet meer worden gewijzigd.",
      'login.lede': 'Gratis, Céleste (59 €) of Divin (137 €).<br>De Céleste-AI begeleidt je in Divin.',
      'login.email': 'E-mail',
      'login.password': 'Wachtwoord',
      'login.password_ph': 'minimaal 8 tekens',
      'login.submit': 'Inloggen',
      'login.hint': 'Eerste login: kies een wachtwoord (min. 8). Dezelfde e-mail als bij betaling.',
      'login.connecting': 'Bezig…',
      'nav.vie': 'Leven',
      'nav.mois': 'Maand',
      'nav.jour': 'Dag',
      'nav.couple': 'Koppel',
      'account.title': 'Jouw account',
      'account.close': 'Sluiten',
      'account.logout': 'Uitloggen',
      'account.language': 'Manuscripttaal',
      'account.language_value': "Accounttaal: {lang}",
      'account.appearance': 'Weergave',
      'account.appearance_hint': 'Kies de hemel die je begeleidt: donker of licht.',
      'account.id': 'Identiteit',
      'account.plan': 'Jouw plan',
      'theme.aria': 'Weergave',
      'theme.toggle': 'Thema wisselen',
      'theme.dark': 'DONKER',
      'theme.light': 'LICHT',
      'err.email': 'Jouw e-mail ✦',
      'err.password': 'Wachtwoord: minimaal 8 tekens ✦',
      'err.login': 'Onjuiste e-mail of wachtwoord.',
      'err.unreachable': 'Les Manuscrits Célestes zijn even niet bereikbaar. Probeer het zo opnieuw.'
    },
    pl: {
      'lang.label': 'Język',
      'lang.warn_login': "Ten język tłumaczy ekran logowania. Przy pierwszym połączeniu staje się też trwałym językiem konta (manuskrypty i Céleste) — później nie da się go zmienić. Przy kolejnych logowaniach dotyczy tylko tego ekranu.",
      'lang.lock_notice': "Wybierz ostrożnie: później nie zmienisz języka. Manuskrypty i Céleste będą w tym języku.",
      'lang.warn_account': "Język konta jest ostateczny i nie można go już zmienić.",
      'login.lede': 'Darmowe, Céleste (59 €) lub Divin (137 €).<br>IA Céleste towarzyszy Ci w Divin.',
      'login.email': 'Email',
      'login.password': 'Hasło',
      'login.password_ph': 'minimum 8 znaków',
      'login.submit': 'Zaloguj się',
      'login.hint': 'Pierwsze logowanie: wybierz hasło (min. 8). Ten sam email co przy płatności.',
      'login.connecting': 'Logowanie…',
      'nav.vie': 'Życie',
      'nav.mois': 'Miesiąc',
      'nav.jour': 'Dzień',
      'nav.couple': 'Para',
      'account.title': 'Twoje konto',
      'account.close': 'Zamknij',
      'account.logout': 'Wyloguj',
      'account.language': 'Język manuskryptów',
      'account.language_value': "Język konta: {lang}",
      'account.appearance': 'Wygląd',
      'account.appearance_hint': 'Wybierz niebo: ciemne lub jasne.',
      'account.id': 'Tożsamość',
      'account.plan': 'Twój plan',
      'theme.aria': 'Wygląd',
      'theme.toggle': 'Zmień motyw',
      'theme.dark': 'CIEMNY',
      'theme.light': 'JASNY',
      'err.email': 'Twój email ✦',
      'err.password': 'Hasło: minimum 8 znaków ✦',
      'err.login': 'Nieprawidłowy email lub hasło.',
      'err.unreachable': 'Les Manuscrits Célestes są niedostępne. Spróbuj za chwilę.'
    },
    tr: {
      'lang.label': 'Dil',
      'lang.warn_login': "Bu dil giriş ekranını çevirir. İlk bağlantıda aynı zamanda kalıcı hesap dili (el yazmaları ve Céleste) olur — sonra değiştirilemez. Sonraki girişlerde yalnızca bu ekranı etkiler.",
      'lang.lock_notice': "Dikkatle seçin: dili daha sonra değiştiremeyeceksiniz. El yazmaları ve Céleste bu dili kullanacak.",
      'lang.warn_account': "Hesap dili kalıcıdır ve artık değiştirilemez.",
      'login.lede': 'Ücretsiz, Céleste (59 €) veya Divin (137 €).<br>Céleste yapay zekâsı Divin’de size eşlik eder.',
      'login.email': 'E-posta',
      'login.password': 'Şifre',
      'login.password_ph': 'en az 8 karakter',
      'login.submit': 'Giriş yap',
      'login.hint': 'İlk giriş: bir şifre seçin (min. 8). Ödemedeki aynı e-posta.',
      'login.connecting': 'Bağlanıyor…',
      'nav.vie': 'Yaşam',
      'nav.mois': 'Ay',
      'nav.jour': 'Gün',
      'nav.couple': 'Çift',
      'account.title': 'Hesabın',
      'account.close': 'Kapat',
      'account.logout': 'Çıkış yap',
      'account.language': 'El yazması dili',
      'account.language_value': "Hesap dili: {lang}",
      'account.appearance': 'Görünüm',
      'account.appearance_hint': 'Seni eşlik eden gökyüzünü seç: koyu veya açık.',
      'account.id': 'Kimlik',
      'account.plan': 'Planın',
      'theme.aria': 'Görünüm',
      'theme.toggle': 'Temayı değiştir',
      'theme.dark': 'KOYU',
      'theme.light': 'AÇIK',
      'err.email': 'E-postan ✦',
      'err.password': 'Şifre: en az 8 karakter ✦',
      'err.login': 'E-posta veya şifre hatalı.',
      'err.unreachable': 'Les Manuscrits Célestes şu an erişilemiyor. Biraz sonra tekrar dene.'
    },
    ko: {
      'lang.label': '언어',
      'lang.warn_login': "이 언어는 로그인 화면을 번역합니다. 첫 연결 시 계정의 영구 언어(원고와 Céleste)가 되며 이후 변경할 수 없습니다. 이후 로그인에서는 이 화면에만 적용됩니다.",
      'lang.lock_notice': "신중히 선택하세요. 나중에 언어를 바꿀 수 없습니다. 원고와 Céleste는 이 언어를 사용합니다.",
      'lang.warn_account': "계정 언어는 확정되었으며 더 이상 변경할 수 없습니다.",
      'login.lede': '무료, Céleste(59 €) 또는 Divin(137 €).<br>Divin에서는 Céleste AI가 함께합니다.',
      'login.email': '이메일',
      'login.password': '비밀번호',
      'login.password_ph': '최소 8자',
      'login.submit': '로그인',
      'login.hint': '첫 로그인: 비밀번호를 정하세요(최소 8자). 결제와 같은 이메일.',
      'login.connecting': '연결 중…',
      'nav.vie': '인생',
      'nav.mois': '월',
      'nav.jour': '일',
      'nav.couple': '커플',
      'account.title': '내 계정',
      'account.close': '닫기',
      'account.logout': '로그아웃',
      'account.language': '원고 언어',
      'account.language_value': "계정 언어: {lang}",
      'account.appearance': '외관',
      'account.appearance_hint': '함께할 하늘을 고르세요: 어두운 또는 밝은.',
      'account.id': '신원',
      'account.plan': '내 플랜',
      'theme.aria': '외관',
      'theme.toggle': '테마 변경',
      'theme.dark': '어두운',
      'theme.light': '밝은',
      'err.email': '이메일을 입력하세요 ✦',
      'err.password': '비밀번호: 최소 8자 ✦',
      'err.login': '이메일 또는 비밀번호가 올바르지 않습니다.',
      'err.unreachable': 'Les Manuscrits Célestes에 연결할 수 없습니다. 잠시 후 다시 시도하세요.'
    }
  };


  /* i18n-extra-injected */
  (function expandI18n() {
    var EXTRA = JSON.parse((function(b64){if(typeof atob==='function'){var bin=atob(b64);if(typeof TextDecoder!=='undefined'){var bytes=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i)&255;return new TextDecoder('utf-8').decode(bytes);}return decodeURIComponent(escape(bin));}return Buffer.from(b64,'base64').toString('utf8');})('ewogICJmciI6IHsKICAgICJicmFuZC5uYW1lIjogIkxlcyBNYW51c2NyaXRzIEPDqWxlc3RlcyIsCiAgICAiYnJhbmQubmFtZV9odG1sIjogIkxlcyBNYW51c2NyaXRzPGJyPjxzcGFuPkPDqWxlc3Rlczwvc3Bhbj4iLAogICAgImJyYW5kLmFjY291bnRfYXJpYSI6ICJDb21wdGUiLAogICAgImxvZ2luLmVtYWlsX3BoIjogInRvaUBlbWFpbC5jb20iLAogICAgImluc3RhbGwudGl0bGVfaHRtbCI6ICJTdXIgdG9uPGJyPjxzcGFuPsOpY3JhbiBk4oCZYWNjdWVpbDwvc3Bhbj4iLAogICAgImluc3RhbGwubGVkZSI6ICJDb21tZSB1bmUgYXBwLCBzYW5zIGzigJlBcHAgU3RvcmUuIiwKICAgICJpbnN0YWxsLnN0ZXBzX2lvcyI6ICJTdXIgaVBob25lIDogYXBwdWllIHN1ciA8Yj5QYXJ0YWdlcjwvYj4gcHVpcyA8Yj5TdXIgbOKAmcOpY3JhbiBk4oCZYWNjdWVpbDwvYj4uIiwKICAgICJpbnN0YWxsLnN0ZXBzX2FuZHJvaWQiOiAiU3VyIEFuZHJvaWQgOiBib3V0b24gY2ktZGVzc291cywgb3UgbWVudSBDaHJvbWUg4oaSIDxiPkFqb3V0ZXIgw6AgbOKAmcOpY3JhbiBk4oCZYWNjdWVpbDwvYj4uIiwKICAgICJpbnN0YWxsLmFkZCI6ICJBam91dGVyIMOgIGzigJlhY2N1ZWlsIiwKICAgICJpbnN0YWxsLnNraXAiOiAiQ29udGludWVyIHNhbnMgaW5zdGFsbGVyIiwKICAgICJvbmJvYXJkLnRpdGxlX2h0bWwiOiAiVG9uIGNpZWw8YnI+PHNwYW4+ZGUgbmFpc3NhbmNlPC9zcGFuPiIsCiAgICAib25ib2FyZC5sZWRlX25ldyI6ICJFbnJlZ2lzdHLDqSBzb3VzIHtlbWFpbH0g4oCUIHBvdXIgbGUgbmF0YWwsIGxlIGpvdXIgZXQgbGUgbW9pcy4gVHUgcG91cnJhcyBjb3JyaWdlciBqdXNxdeKAmcOgIDMgZm9pcyBlbiBjYXMgZOKAmWVycmV1ci4iLAogICAgIm9uYm9hcmQubGVkZV9yZWFkb25seSI6ICJUdSBhcyB1dGlsaXPDqSB0ZXMgMyBtb2RpZmljYXRpb25zLiBQb3VyIHRvdXRlIGNvcnJlY3Rpb24gc3VwcGzDqW1lbnRhaXJlLCBjb250YWN0ZSBsZSBzdXBwb3J0LiIsCiAgICAib25ib2FyZC5sZWRlX2VkaXQiOiAiQ29ycmlnZSB1bmUgZXJyZXVyIHNpIGJlc29pbi4gSWwgdGUgcmVzdGUge259IG1vZGlmaWNhdGlvbntzfS4iLAogICAgIm9uYm9hcmQubmF0YWxfbm90ZSI6ICJUb24gbWFudXNjcml0IG5hdGFsIGVzdCBkw6lqw6AgZ8OpbsOpcsOpIDogY2hhbmdlciBjZXMgaW5mb3MgbmUgbGUgcsOpZ8OpbsOocmUgcGFzIGF1dG9tYXRpcXVlbWVudC4iLAogICAgIm9uYm9hcmQuZWRpdHNfbm9uZSI6ICJQbHVzIGF1Y3VuZSBtb2RpZmljYXRpb24gcG9zc2libGUuIiwKICAgICJvbmJvYXJkLmVkaXRzX2xlZnQiOiAiSWwgdGUgcmVzdGUge259IG1vZGlmaWNhdGlvbntzfS4iLAogICAgIm9uYm9hcmQuc2F2ZV9lZGl0IjogIkVucmVnaXN0cmVyIGxlcyBtb2RpZmljYXRpb25zIiwKICAgICJvbmJvYXJkLnNhdmVfbmV3IjogIkVucmVnaXN0cmVyIG1vbiBwcm9maWwiLAogICAgIm9uYm9hcmQubm9fbW9yZSI6ICJQbHVzIGRlIG1vZGlmaWNhdGlvbnMgcG9zc2libGVzIiwKICAgICJvbmJvYXJkLmJhY2siOiAiUmV0b3VyIiwKICAgICJvbmJvYXJkLmxhdGVyIjogIlBsdXMgdGFyZCIsCiAgICAib25ib2FyZC5iaXJ0aF9kYXRlIjogIkRhdGUgZGUgbmFpc3NhbmNlIiwKICAgICJvbmJvYXJkLmJpcnRoX3RpbWUiOiAiSGV1cmUgZGUgbmFpc3NhbmNlIiwKICAgICJvbmJvYXJkLmJpcnRoX3BsYWNlIjogIkxpZXUgZGUgbmFpc3NhbmNlIiwKICAgICJvbmJvYXJkLnBsYWNlX3BoIjogIlRhcGUgdW5lIHZpbGxl4oCmIChleDogTHlvbikiLAogICAgIm9uYm9hcmQuZ2VuZGVyIjogIkdlbnJlIiwKICAgICJnZW5kZXIuZmVtbWUiOiAiRmVtbWUiLAogICAgImdlbmRlci5ob21tZSI6ICJIb21tZSIsCiAgICAiZ2VuZGVyLmF1dHJlIjogIkF1dHJlIiwKICAgICJ3ZWxjb21lLmJhY2siOiAiQm9uIHJldG91ciwge25hbWV9LiIsCiAgICAid2VsY29tZS55b3UiOiAidG9pIiwKICAgICJwbGFuLmZyZWUiOiAiR3JhdHVpdCIsCiAgICAicGxhbi5wYXVzZV9zdWZmaXgiOiAiIMK3IHBhdXNlIiwKICAgICJwbGFuLmxhYmVsIjogIlBsYW4ge25hbWV9IiwKICAgICJwbGFuLmNlbGVzdGUiOiAiUGxhbiBDw6lsZXN0ZSIsCiAgICAicGxhbi5kaXZpbiI6ICJQbGFuIERpdmluIiwKICAgICJwbGFuLmRpdmluX3ByaWNlIjogIlBsYW4gRGl2aW4gwrcgMTM3IOKCrCIsCiAgICAicGxhbi5vbl9kZW1hbmQiOiAiw4AgbGEgZGVtYW5kZSIsCiAgICAicGxhbi5jZWxlc3RlX29yX2RpdmluIjogIkPDqWxlc3RlIG91IERpdmluIiwKICAgICJwbGFuLmxvY2tlZCI6ICJWZXJyb3VpbGzDqSIsCiAgICAicGxhbi51bmxvY2tlZCI6ICJEw6libG9xdcOpIiwKICAgICJwbGFuLnBhdXNlZCI6ICJFbiBwYXVzZSIsCiAgICAibmF0YWwua2lja2VyIjogIk5hdGFsIiwKICAgICJuYXRhbC5pbnRybyI6ICJMZXMgMjggcGFnZXMgZGUgdG9uIHRow6htZSDigJQgdG91am91cnMgYWNjZXNzaWJsZXMgdGFudCBxdWUgdG9uIGFib25uZW1lbnQgZXN0IGFjdGlmLiIsCiAgICAibmF0YWwudGl0bGUiOiAiTGUgTWFudXNjcml0IEPDqWxlc3RlIiwKICAgICJuYXRhbC5vZl9saWZlIjogImRlIHRhIHZpZSIsCiAgICAibmF0YWwudGl0bGVfcGxhaW4iOiAiTGUgTWFudXNjcml0IEPDqWxlc3RlIGRlIHRhIHZpZSIsCiAgICAibmF0YWwuYXNrIjogIk9CVEVOSVIgTEUgTUFOVVNDUklUIERFIE1BIFZJRSIsCiAgICAibmF0YWwucmVhZCI6ICJWT0lSIExFIE1BTlVTQ1JJVCBDw4lMRVNURSBERSBNQSBWSUUiLAogICAgIm5hdGFsLnBhZ2VzX3ByaWNlIjogIjI4IHBhZ2VzIMK3IDU5IOKCrCAvIG1vaXMiLAogICAgIm5hdGFsLmxvY2tfcGF1c2VkIjogIkFib25uZW1lbnQgZW4gcGF1c2UgOiBsZSBuYXRhbCBzZSByb3V2cmUgZMOocyBxdWUgdHUgcmVwcmVuZHMuIiwKICAgICJuYXRhbC5sb2NrX25lZWQiOiAiVG9uIG1hbnVzY3JpdCBkZSB2aWUgc+KAmW91dnJlIGF2ZWMgbOKAmWFib25uZW1lbnQgQ8OpbGVzdGUuIiwKICAgICJuYXRhbC5uZWVkX3Byb2ZpbGUiOiAiUmVuc2VpZ25lIHRvbiBjaWVsIGRlIG5haXNzYW5jZSBwb3VyIHF1ZSB0b24gbWFudXNjcml0IHB1aXNzZSBz4oCZw6ljcmlyZS4iLAogICAgIm5hdGFsLmZpbGxfcHJvZmlsZSI6ICJSZW5zZWlnbmVyIG1vbiBjaWVsIGRlIG5haXNzYW5jZSIsCiAgICAibmF0YWwuZXJyX2dlbmVyaWMiOiAiTGEgZ8OpbsOpcmF0aW9uIG7igJlhIHBhcyBwdSBhYm91dGlyLiBSw6llc3NhaWUgZGFucyB1biBtb21lbnQuIiwKICAgICJuYXRhbC5lcnJfc29mdCI6ICJMYSBnw6luw6lyYXRpb24gbuKAmWEgcGFzIHB1IGFib3V0aXIgcG91ciBsZSBtb21lbnQuIFLDqWVzc2FpZSBkYW5zIHVuIGluc3RhbnQg4oCUIHRvbiBib3V0b24gwqsgT0JURU5JUiBMRSBNQU5VU0NSSVQgREUgTUEgVklFIMK7IHJlc3RlIGRpc3BvbmlibGUuIiwKICAgICJuYXRhbC5yZWFkeSI6ICJQcm9maWwgZW5yZWdpc3Ryw6kgwrcgdG9uIG1hbnVzY3JpdCBlc3QgcHLDqnQuIiwKICAgICJuYXRhbC53YWl0aW5nIjogIlByb2ZpbCBlbnJlZ2lzdHLDqSDCtyBlbiBhdHRlbnRlIGRlIHRhIGRlbWFuZGUuIiwKICAgICJuYXRhbC5yZWFkZXJfaW50cm8iOiAiVm9pY2kgdG9uIE1hbnVzY3JpdCBDw6lsZXN0ZSBkZSB0YSB2aWUuIExlY3R1cmUgZGFucyBs4oCZYXBwIHVuaXF1ZW1lbnQsIHRhbnQgcXVlIHRvbiBhYm9ubmVtZW50IGVzdCBhY3RpZi4iLAogICAgIm5hdGFsLnVuYXZhaWxhYmxlIjogIk1hbnVzY3JpdCBpbmRpc3BvbmlibGUgcG91ciBsZSBtb21lbnQuIFJldmllbnMgw6AgbOKAmWFjY3VlaWwgZXQgYXBwdWllIHN1ciBPQlRFTklSIExFIE1BTlVTQ1JJVCBERSBNQSBWSUUuIiwKICAgICJuYXRhbC5mcmFtZV90aXRsZSI6ICJNYW51c2NyaXQgbmF0YWwiLAogICAgInVsdGltZS50aXRsZSI6ICJMZSBNYW51c2NyaXQgQ8OpbGVzdGUgVWx0aW1lIiwKICAgICJ1bHRpbWUudGl0bGVfcGxhaW4iOiAiTGUgTWFudXNjcml0IEPDqWxlc3RlIFVsdGltZSBkZSB0YSB2aWUiLAogICAgInVsdGltZS5hc2siOiAiRGVtYW5kZXIgbGUgTWFudXNjcml0IFVsdGltZSIsCiAgICAidWx0aW1lLnJlYWQiOiAiVk9JUiBMRSBNQU5VU0NSSVQgVUxUSU1FIiwKICAgICJ1bHRpbWUuZGl2aW5fbm93IjogIkluY2x1cyB0b3V0IGRlIHN1aXRlIGRhbnMgbGUgRGl2aW4uIiwKICAgICJ1bHRpbWUuc2l4X21vbnRocyI6ICJTaXggbW9pcyBwYXnDqXMsIG3Dqm1lIGF2ZWMgZGVzIHBhdXNlcy4iLAogICAgInVsdGltZS5vbmNlIjogIiDDiWNyaXQgdW5lIHNldWxlIGZvaXMsIMOgIHRhIGRlbWFuZGUuIiwKICAgICJ1bHRpbWUubG9ja19pbnRybyI6ICJBcHLDqHMgNiBtb2lzIEPDqWxlc3RlLCBvdSBpbW3DqWRpYXRlbWVudCBlbiBEaXZpbi4iLAogICAgInVsdGltZS5wYXVzZV9yZW9wZW4iOiAiTGUgTWFudXNjcml0IFVsdGltZSBzZSByb3V2cmUgZMOocyBxdWUgdHUgcmVwcmVuZHMgbOKAmWFib25uZW1lbnQuIiwKICAgICJ1bHRpbWUubW9udGhzX2tlcHQiOiAiIFRlcyA8Yj57bn0gbW9pczwvYj4gcmVzdGVudCBjb21wdMOpcy4iLAogICAgInVsdGltZS5sb2NrX3Byb2dyZXNzIjogIlR1IGFzIDxiPntoYXZlfSBtb2lzPC9iPiBkw6lqw6AgcsOpZ2zDqXMuIEVuY29yZSA8Yj57bGVmdH08L2I+IOKAlCB1bmUgcGF1c2UgbmUgY2Fzc2UgcGFzIGxhIHPDqXJpZS4iLAogICAgInVsdGltZS5wYWdlc19sb2NrZWQiOiAie259IHBhZ2VzIMK3IDYgbW9pcyBwYXnDqXMsIGN1bXVsw6lzIiwKICAgICJ1bHRpbWUucGFnZXNfdW5sb2NrZWQiOiAie259IHBhZ2VzIMK3IGTDqWrDoCBkw6libG9xdcOpIiwKICAgICJ1bHRpbWUucGFnZXNfcGxhaW4iOiAie259IHBhZ2VzIiwKICAgICJ1bHRpbWUubmVlZF9wcm9maWxlIjogIlJlbnNlaWduZSB0b24gY2llbCBkZSBuYWlzc2FuY2UgcG91ciBxdWUgbGUgTWFudXNjcml0IFVsdGltZSBwdWlzc2Ugc+KAmcOpY3JpcmUuIiwKICAgICJ1bHRpbWUuZXJyX2dlbmVyaWMiOiAiTGEgZ8OpbsOpcmF0aW9uIGR1IE1hbnVzY3JpdCBVbHRpbWUgbuKAmWEgcGFzIHB1IGFib3V0aXIuIFLDqWVzc2FpZS4iLAogICAgInVsdGltZS5lcnJfc29mdCI6ICJMYSBnw6luw6lyYXRpb24gbuKAmWEgcGFzIHB1IGFib3V0aXIgcG91ciBsZSBtb21lbnQuIFLDqWVzc2FpZSDigJQgdG9uIGJvdXRvbiDCqyBEZW1hbmRlciBsZSBNYW51c2NyaXQgVWx0aW1lIMK7IHJlc3RlIGRpc3BvbmlibGUuIiwKICAgICJ1bHRpbWUucmVhZHkiOiAiVG9uIE1hbnVzY3JpdCBVbHRpbWUgZXN0IHByw6p0LiIsCiAgICAidWx0aW1lLndhaXRpbmciOiAiRMOpYmxvcXXDqSDCtyBlbiBhdHRlbnRlIGRlIHRhIGRlbWFuZGUuIiwKICAgICJ1bHRpbWUua2lja2VyIjogIsOJZGl0aW9uIE1hbnVzY3JpdCBVbHRpbWUiLAogICAgInVsdGltZS5yZWFkZXJfZGl2aW4iOiAiVm9pY2kgdG9uIE1hbnVzY3JpdCBDw6lsZXN0ZSBVbHRpbWUsIGluY2x1cyBkYW5zIGxlIERpdmluLiBMZWN0dXJlIGRhbnMgbOKAmWFwcCB0YW50IHF1ZSB0b24gYWJvbm5lbWVudCBlc3QgYWN0aWYuIiwKICAgICJ1bHRpbWUucmVhZGVyX3BhaWQiOiAiVm9pY2kgdG9uIE1hbnVzY3JpdCBDw6lsZXN0ZSBVbHRpbWUsIGTDqWJsb3F1w6kgYXByw6hzIDYgbW9pcyBwYXnDqXMuIExlY3R1cmUgZGFucyBs4oCZYXBwIHRhbnQgcXVlIHRvbiBhYm9ubmVtZW50IGVzdCBhY3RpZi4iLAogICAgInVsdGltZS51bmF2YWlsYWJsZSI6ICJNYW51c2NyaXQgVWx0aW1lIGluZGlzcG9uaWJsZS4gUmV2aWVucyDDoCBs4oCZYWNjdWVpbCBldCBhcHB1aWUgc3VyIMKrIERlbWFuZGVyIGxlIE1hbnVzY3JpdCBVbHRpbWUgwrsuIiwKICAgICJ1bHRpbWUuZnJhbWVfdGl0bGUiOiAiTWFudXNjcml0IFVsdGltZSIsCiAgICAibW9pcy5sYWJlbCI6ICJDZSBtb2lzIiwKICAgICJtb2lzLmludHJvIjogIkRpc3BvbmlibGUgdG91dCBsZSBtb2lzLiBUb24gTWFudXNjcml0IEPDqWxlc3RlIHJlbGF0aWYgYXUgbW9pcyBlbiBjb3Vycy4gQ29tbWVudCB0ZXMgw6l0b2lsZXMgcGFybGVudCBjZSBtb2lzIiwKICAgICJtb2lzLnRpdGxlX2h0bWwiOiAiTWFudXNjcml0IEPDqWxlc3RlIDxzcGFuIGNsYXNzPVwiZGUtY2UtbW9pc1wiPkRFIENFIE1PSVMgREUge21vbnRofTwvc3Bhbj4iLAogICAgIm1vaXMudGl0bGVfcGxhaW4iOiAiTWFudXNjcml0IEPDqWxlc3RlIERFIENFIE1PSVMgREUge21vbnRofSIsCiAgICAibW9pcy5hc2siOiAiRGVtYW5kZXIgbGUgbWFudXNjcml0IGR1IG1vaXMiLAogICAgIm1vaXMucmVhZCI6ICJSZWxpcmUgbGUgbWFudXNjcml0IGR1IG1vaXMiLAogICAgIm1vaXMucXVvdGEiOiAiIMK3IHt1c2VkfSAvIDEgY2V0dGUgYW5uw6llIChHcmF0dWl0KSIsCiAgICAibW9pcy5yZWFkZXJfaW50cm8iOiAiVm9pY2kgdG9uIE1hbnVzY3JpdCBDw6lsZXN0ZSBkdSBtb2lzLiBMZWN0dXJlIGRhbnMgbOKAmWFwcCB1bmlxdWVtZW50LCB0YW50IHF1ZSB0b24gYWJvbm5lbWVudCBlc3QgYWN0aWYuIiwKICAgICJtb2lzLmZyYW1lX3RpdGxlIjogIk1hbnVzY3JpdCBkdSBtb2lzIiwKICAgICJqb3VyLmxhYmVsIjogIkF1am91cmTigJlodWkiLAogICAgImpvdXIuaW50cm8iOiAiVG9uIE1hbnVzY3JpdCBDw6lsZXN0ZSByZWxhdGlmIMOgIGNldHRlIGpvdXJuw6llIGVuIGNvdXJzLiBDb21tZW50IHRlcyDDqXRvaWxlcyBwYXJsZW50IEFVSk9VUkTigJlIVUkiLAogICAgImpvdXIudGl0bGUiOiAiTWFudXNjcml0IEPDqWxlc3RlIGR1IHtkYXRlfSIsCiAgICAiam91ci5hc2siOiAiT0JURU5JUiBMRSBNQU5VU0NSSVQgRFUgSk9VUiIsCiAgICAiam91ci5yZWFkIjogIlJlbGlyZSBsZSBtYW51c2NyaXQgZHUgam91ciIsCiAgICAiam91ci5xdW90YSI6ICIgwrcge3VzZWR9IC8gNSBjZSBtb2lzIChHcmF0dWl0KSIsCiAgICAiam91ci5yZWFkZXJfaW50cm8iOiAiVm9pY2kgdG9uIE1hbnVzY3JpdCBDw6lsZXN0ZSBkdSBqb3VyLiBMZWN0dXJlIGRhbnMgbOKAmWFwcCB1bmlxdWVtZW50LCB0YW50IHF1ZSB0b24gYWJvbm5lbWVudCBlc3QgYWN0aWYuIiwKICAgICJqb3VyLmZyYW1lX3RpdGxlIjogIk1hbnVzY3JpdCBkdSBqb3VyIiwKICAgICJwZXJpb2QudW5hdmFpbGFibGUiOiAiTWFudXNjcml0IGluZGlzcG9uaWJsZSBwb3VyIGxlIG1vbWVudC4gUmV2aWVucyDDoCBs4oCZb25nbGV0IGV0IGRlbWFuZGUtbGUgw6Agbm91dmVhdS4iLAogICAgInBlcmlvZC5lcnJfaW50ZXJydXB0IjogIkfDqW7DqXJhdGlvbiBpbnRlcnJvbXB1ZS4gUsOpZXNzYWllLiIsCiAgICAiY291cGxlLmtpY2tlciI6ICJTeW5hc3RyaWUiLAogICAgImNvdXBsZS5sZWRlX2xvY2siOiAiU3luYXN0cmllIMOgIGRldXgiLAogICAgImNvdXBsZS50aXRsZV9odG1sIjogIk1hbnVzY3JpdCBDw6lsZXN0ZSA8c3BhbiBjbGFzcz1cImRlLXRhLXZpZVwiPkNvdXBsZTwvc3Bhbj4iLAogICAgImNvdXBsZS50aXRsZV9wbGFpbiI6ICJNYW51c2NyaXQgQ8OpbGVzdGUgQ291cGxlIiwKICAgICJjb3VwbGUudGl0bGVfc2hvcnQiOiAiTWFudXNjcml0IGRlIGNvdXBsZSIsCiAgICAiY291cGxlLmludHJvIjogIlN5bmFzdHJpZSBIdW1hbiBEZXNpZ24gw5cgQXN0cm9sb2dpZSBwb3VyIHZvdXMgZGV1eCDigJQgdW4gbWFudXNjcml0IGRlIGNvdXBsZSBwYXIgbW9pcyBjaXZpbCwgcsOpc2VydsOpIGF1IHBsYW4gRGl2aW4uIiwKICAgICJjb3VwbGUuYXNrIjogIkRlbWFuZGVyIGxlIG1hbnVzY3JpdCBkZSBjb3VwbGUiLAogICAgImNvdXBsZS5yZWFkIjogIlJlbGlyZSBsZSBtYW51c2NyaXQgZGUgY291cGxlIiwKICAgICJjb3VwbGUucXVvdGEiOiAie259IC8gMSBjZSBtb2lzIiwKICAgICJjb3VwbGUubG9ja19wYXVzZWQiOiAiQWJvbm5lbWVudCBlbiBwYXVzZSA6IGxlIG1hbnVzY3JpdCBkZSBjb3VwbGUgc2Ugcm91dnJlIGTDqHMgcXVlIHR1IHJlcHJlbmRzIGxlIERpdmluLiIsCiAgICAiY291cGxlLmxvY2tfbmVlZCI6ICJSw6lzZXJ2w6kgYXUgcGxhbiBEaXZpbiDigJQgZGV1eCBjaWVscyBjcm9pc8OpcywgdW5lIGZvaXMgcGFyIG1vaXMgY2l2aWwuIiwKICAgICJjb3VwbGUuZGlzY292ZXIiOiAiRMOpY291dnJpciBsZSBEaXZpbiIsCiAgICAiY291cGxlLndpdGgiOiAiQXZlYyB7bmFtZX0iLAogICAgImNvdXBsZS5lZGl0IjogIk1vZGlmaWVyIiwKICAgICJjb3VwbGUuZXJyX2dlbmVyaWMiOiAiTGEgZ8OpbsOpcmF0aW9uIG7igJlhIHBhcyBwdSBhYm91dGlyLiIsCiAgICAiY291cGxlLnJlYWRlcl9pbnRybyI6ICJWb2ljaSB2b3RyZSBNYW51c2NyaXQgQ8OpbGVzdGUgZGUgY291cGxlLiBMZWN0dXJlIGRhbnMgbOKAmWFwcCB1bmlxdWVtZW50LCB0YW50IHF1ZSB0b24gYWJvbm5lbWVudCBEaXZpbiBlc3QgYWN0aWYuIiwKICAgICJjb3VwbGUudW5hdmFpbGFibGUiOiAiTWFudXNjcml0IGRlIGNvdXBsZSBpbmRpc3BvbmlibGUuIFJldmllbnMgw6AgbOKAmW9uZ2xldCBDb3VwbGUuIiwKICAgICJjb3VwbGUuZnJhbWVfdGl0bGUiOiAiTWFudXNjcml0IGNvdXBsZSIsCiAgICAiY291cGxlLm5vdF9yZWFkeSI6ICJUb24gbWFudXNjcml0IGRlIGNvdXBsZSBu4oCZZXN0IHBhcyBlbmNvcmUgZGlzcG9uaWJsZS4iLAogICAgImNvdXBsZS5taXNzaW5nX2xpbmsiOiAiTGllbiBtYW51c2NyaXQgbWFucXVhbnQuIFJlY29ubmVjdGUtdG9pIHB1aXMgcsOpZXNzYWllLiIsCiAgICAiY291cGxlLmZpbGVfbWlzc2luZyI6ICJGaWNoaWVyIGNvdXBsZSBpbnRyb3V2YWJsZS4gUmVsYW5jZSDCqyBEZW1hbmRlciBsZSBtYW51c2NyaXQgZGUgY291cGxlIMK7LiIsCiAgICAicGFydG5lci5sYWJlbCI6ICJQYXJ0ZW5haXJlIiwKICAgICJwYXJ0bmVyLnRpdGxlIjogIkNpZWwgZGUgbmFpc3NhbmNlIGR1IHBhcnRlbmFpcmUiLAogICAgInBhcnRuZXIuaGludCI6ICJQcsOpbm9tLCBkYXRlLCBoZXVyZSwgbGlldSBldCBnZW5yZSDigJQgY29tbWUgcG91ciB0b24gcHJvZmlsLiAiLAogICAgInBhcnRuZXIubm9fZWRpdHMiOiAiUGx1cyBhdWN1bmUgbW9kaWZpY2F0aW9uLiIsCiAgICAicGFydG5lci5lZGl0c19sZWZ0IjogIklsIHRlIHJlc3RlIHtufSBjb3JyZWN0aW9ue3N9LiIsCiAgICAicGFydG5lci5lZGl0c19pbnRybyI6ICJUdSBwb3VycmFzIGNvcnJpZ2VyIGp1c3F14oCZw6AgMyBmb2lzLiIsCiAgICAicGFydG5lci5wcmVub20iOiAiUHLDqW5vbSIsCiAgICAicGFydG5lci5wbGFjZV9waCI6ICJUYXBlIHVuZSB2aWxsZeKApiIsCiAgICAicGFydG5lci5zYXZlIjogIkVucmVnaXN0cmVyIGxlIHBhcnRlbmFpcmUiLAogICAgInBhcnRuZXIuYmFjayI6ICJSZXRvdXIiLAogICAgInBhdXNlLmxhYmVsIjogIkFib25uZW1lbnQgZW4gcGF1c2UiLAogICAgInBhdXNlLnRpdGxlIjogIkVzcGFjZSBlbiBwYXVzZSIsCiAgICAicGF1c2UuYm9keSI6ICJUb24gYWJvIHtwbGFufSBlc3QgZW4gcGF1c2UuIFR1IGdhcmRlcyBs4oCZYWNjw6hzIEdyYXR1aXQgOiAxIG1hbnVzY3JpdCBkdSBtb2lzICsgNSBtYW51c2NyaXRzIGR1IGpvdXIuIE5hdGFsLCBNYW51c2NyaXQgVWx0aW1lIGV0IElBIEPDqWxlc3RlIHNlIHJvdXZyZW50IGTDqHMgcXVlIHR1IHJlcHJlbmRzLiIsCiAgICAicGF1c2UudWx0aW1lX25vdGUiOiAiTW9pcyBNYW51c2NyaXQgVWx0aW1lIGNvbnNlcnbDqXMgOiB7bn0gLyA2LiIsCiAgICAicGF1c2UucmVzdW1lIjogIlJlcHJlbmRyZSBtb24gYWJvbm5lbWVudCIsCiAgICAicGF1c2UucmVmcmVzaCI6ICJK4oCZYWkgcmVwcmlzLCBhY3R1YWxpc2VyIiwKICAgICJmcmVlLmJhbm5lcl9mdWxsIjogIkFjY8OocyBncmF0dWl0IDoge219IHttd30gZHUgbW9pcyArIHtkfSB7ZHd9IGR1IGpvdXIgb2ZmZXJ0cy4iLAogICAgImZyZWUuYmFubmVyX2xlZnQiOiAiSWwgdGUgcmVzdGUge219IHttd30gZHUgbW9pcyBldCB7ZH0ge2R3fSBkdSBqb3VyLiIsCiAgICAiZnJlZS5tc19vbmUiOiAibWFudXNjcml0IiwKICAgICJmcmVlLm1zX21hbnkiOiAibWFudXNjcml0cyIsCiAgICAiaWEudGl0bGUiOiAiSUEgQ8OpbGVzdGUiLAogICAgImlhLnRpdGxlX21zIjogIklBIEPDqWxlc3RlIMK3IGNlIG1hbnVzY3JpdCIsCiAgICAiaWEuYXZhaWxhYmxlIjogIkRpc3BvbmlibGUiLAogICAgImlhLmluY2x1ZGVkIjogIkluY2x1c2UgZGFucyBsZSBEaXZpbiIsCiAgICAiaWEuY2FyZF9vayI6ICJFbGxlIHTigJlhY2NvbXBhZ25lIHNvdXMgY2hhcXVlIG1hbnVzY3JpdCwgcGVuZGFudCBxdWUgdHUgbGlzIOKAlCB1bmUgcHLDqXNlbmNlIGNoYWxldXJldXNlIHBvdXIgw6ljbGFpcmVyIGNlIHF1ZSB0dSByZXNzZW5zLiIsCiAgICAiaWEuY2FyZF9sb2NrIjogIlBlbmRhbnQgcXVlIHR1IGxpcywgZWxsZSB04oCZw6ljb3V0ZSA6IGF1am91cmTigJlodWkgbOKAmWFtb3VyID8gbGUgdHJhdmFpbCA/IGxlIGJvbiBtb21lbnQgPyIsCiAgICAiaWEubG9ja19yZWFkZXIiOiAiUG9zZSB0ZXMgcXVlc3Rpb25zIHN1ciBjZSBtYW51c2NyaXQgYXZlYyBsZSBwbGFuIERpdmluLiIsCiAgICAiaWEucGFzc19kaXZpbiI6ICJQYXNzZXIgRGl2aW4gwrcgMTM3IOKCrCIsCiAgICAiaWEuZ3VpZGUiOiAiRWxsZSBlc3QgbMOgIHBvdXIgdOKAmcOpY2xhaXJlciwgc2FucyBqdWdlci4iLAogICAgImlhLmVtcHR5IjogIlVuZSBxdWVzdGlvbiBzdXIgY2UgcXVlIHR1IGxpc+KApiBFeC4gOiBxdWUgbWUgZGl0IGNldHRlIHBhZ2Ugc3VyIGzigJlhbW91ciA/IiwKICAgICJpYS5xdWVzdGlvbiI6ICJUYSBxdWVzdGlvbiIsCiAgICAiaWEucGxhY2Vob2xkZXIiOiAiUXVlIG1lIHLDqXbDqGxlIGNlIHBhc3NhZ2UgPyIsCiAgICAiaWEubWljIjogIkRpY3RlciB0YSBxdWVzdGlvbiIsCiAgICAiaWEuc2VuZCI6ICJFbnZveWVyIiwKICAgICJpYS5idXN5IjogIkPDqWxlc3RlIHLDqXBvbmQiLAogICAgImlhLnJlc3QiOiAiTGUgY2llbCBzZSByZXBvc2UiLAogICAgImlhLnlvdSI6ICJUb2kiLAogICAgImlhLnJlcGx5X25hbWUiOiAiQ8OpbGVzdGUgcsOpcG9uZCIsCiAgICAiaWEubGlzdGVuIjogIsOJY291dGVyIiwKICAgICJpYS5zdG9wIjogIkFycsOqdGVyIiwKICAgICJpYS5saXN0ZW5fYXJpYSI6ICLDiWNvdXRlciBjZSBtZXNzYWdlIiwKICAgICJpYS5lcnJfZ2VuZXJpYyI6ICJMZSBjaWVsIG5lIHLDqXBvbmQgcGFzIHBvdXIgbGUgbW9tZW50LiBSw6llc3NhaWUgZGFucyB1biBpbnN0YW50LiIsCiAgICAiaWEuZXJyXzQwNCI6ICJDb21wdGUgaW50cm91dmFibGUuIFJlY29ubmVjdGUtdG9pLiIsCiAgICAiaWEuYXNrX2RldmVsb3AiOiAiUGV1eC10dSBtaWV1eCBt4oCZZXhwbGlxdWVyIGV0IGTDqXZlbG9wcGVyIGNlIHBhc3NhZ2UgZGUgbW9uIG1hbnVzY3JpdCA/XG5cbsKrIHtwYXNzYWdlfSDCuyIsCiAgICAiaWEubWljX2Jsb2NrZWQiOiAiTWljcm8gYmxvcXXDqS4gQXV0b3Jpc2UgbGUgbWljcm8gZGFucyB0b24gbmF2aWdhdGV1ciBwb3VyIGRpY3RlciB0YSBxdWVzdGlvbi4iLAogICAgImlhLm1pY19ub25lIjogIkF1Y3VuIG1pY3JvIGTDqXRlY3TDqS4gQnJhbmNoZSB1biBtaWNybyBvdSBhdXRvcmlzZSBs4oCZYWNjw6hzIGF1ZGlvLiIsCiAgICAiaWEubWljX2ZhaWwiOiAiSW1wb3NzaWJsZSBkZSBkw6ltYXJyZXIgbGEgZGljdMOpZS4gUsOpZXNzYWllIGRhbnMgdW4gaW5zdGFudC4iLAogICAgImlhLm1pY191bnN1cHBvcnRlZCI6ICJEaWN0w6llIG5vbiBzdXBwb3J0w6llIHN1ciBjZSBuYXZpZ2F0ZXVyIiwKICAgICJpYS5zcGVlY2hfdW5zdXBwb3J0ZWQiOiAiTGEgZGljdMOpZSB2b2NhbGUgbuKAmWVzdCBwYXMgZGlzcG9uaWJsZSBzdXIgY2UgbmF2aWdhdGV1ci4gU3VyIGlQaG9uZSBvdSBpUGFkLCBTYWZhcmkgw6Agam91ciBwZXV0IGxhIHByb3Bvc2VyIDsgc2lub24gdGFwZSB0YSBxdWVzdGlvbi4gQ2hyb21lIG91IEVkZ2Ugc3VyIG9yZGluYXRldXIgZm9uY3Rpb25uZW50IGxlIG1pZXV4LiIsCiAgICAic2VsLmFzayI6ICJEZW1hbmRlciDDoCBs4oCZSUEgQ8OpbGVzdGUgZGUgZMOpdmVsb3BwZXIgY2UgcGFzc2FnZSIsCiAgICAicmVhZGVyLmJhY2siOiAi4oaQIFJldG91ciIsCiAgICAicmVhZGVyLmZzX2VudGVyIjogIk1hbnVzY3JpdCBlbiBwbGVpbiDDqWNyYW4iLAogICAgInJlYWRlci5mc19leGl0IjogIlF1aXR0ZXIgbGUgcGxlaW4gw6ljcmFuIiwKICAgICJyZWFkZXIubXNfdGl0bGUiOiAiTWFudXNjcml0IiwKICAgICJ3YWl0Lm5hdGFsLnRpdGxlIjogIkxlIE1hbnVzY3JpdCBDw6lsZXN0ZSBkZSB0YSB2aWUgc+KAmcOpY3JpdCIsCiAgICAid2FpdC5uYXRhbC5oaW50IjogIkFsaWduZW1lbnQgZGVzIHBsYW7DqHRlcyDCtyBjYWxjdWxzIGR1IGNvZGUgZGUgdmllIMK3IGFzc2VtYmxhZ2UgZHUgbGFuZ2FnZSBkZSBs4oCZdW5pdmVycy4gTmUgZmVybWUgcGFzIGNldHRlIHBhZ2UuIiwKICAgICJ3YWl0Lm5hdGFsLmZhbGxiYWNrIjogIkxlIGNpZWwgY29tcG9zZSB0b24gbWFudXNjcml0IOKAlCBxdWVscXVlcyBtaW51dGVzIGRlIHNpbGVuY2UuIiwKICAgICJ3YWl0Lm1vaXMudGl0bGUiOiAiTGUgTWFudXNjcml0IEPDqWxlc3RlIGR1IG1vaXMgc+KAmcOpY3JpdCIsCiAgICAid2FpdC5tb2lzLmhpbnQiOiAiVG9uIHRow6htZSBuYXRhbCDCtyBsZSBjbGltYXQgZHUgbW9pcyDCtyByZWxpdXJlIGRlcyBjaGFwaXRyZXMuIE5lIGZlcm1lIHBhcyBjZXR0ZSBwYWdlLiIsCiAgICAid2FpdC5tb2lzLmZhbGxiYWNrIjogIkxlIGNpZWwgY29tcG9zZSB0b24gTWFudXNjcml0IGR1IG1vaXPigKYgUXVlbHF1ZXMgbWludXRlcy4iLAogICAgIndhaXQuam91ci50aXRsZSI6ICJMZSBNYW51c2NyaXQgQ8OpbGVzdGUgZHUgam91ciBz4oCZw6ljcml0IiwKICAgICJ3YWl0LmpvdXIuaGludCI6ICJUb24gdGjDqG1lIMK3IGzigJnDqW5lcmdpZSBk4oCZYXVqb3VyZOKAmWh1aSDCtyB1bmUgc2V1bGUgcG9ydGUgw6Agb3V2cmlyLiBOZSBmZXJtZSBwYXMgY2V0dGUgcGFnZS4iLAogICAgIndhaXQuam91ci5mYWxsYmFjayI6ICJMZSBjaWVsIGNvbXBvc2UgdG9uIE1hbnVzY3JpdCBkdSBqb3Vy4oCmIiwKICAgICJ3YWl0LmNvdXBsZS50aXRsZSI6ICJMZSBNYW51c2NyaXQgQ8OpbGVzdGUgZGUgY291cGxlIHPigJnDqWNyaXQiLAogICAgIndhaXQuY291cGxlLmhpbnQiOiAiRGV1eCB0aMOobWVzIMK3IHN5bmFzdHJpZSDCtyBhc3NlbWJsYWdlLiBOZSBmZXJtZSBwYXMgY2V0dGUgcGFnZS4iLAogICAgIndhaXQuY291cGxlLmZhbGxiYWNrIjogIkxlIGNpZWwgY29tcG9zZSB2b3RyZSBtYW51c2NyaXQgZGUgY291cGxl4oCmIiwKICAgICJ3YWl0LnVsdGltZS50aXRsZSI6ICJMZSBNYW51c2NyaXQgVWx0aW1lIHPigJnDqWNyaXQiLAogICAgIndhaXQudWx0aW1lLmhpbnQiOiAiw4lkaXRpb24gbG9uZ3VlIMK3IHBhdGllbmNlIGPDqWxlc3RlLiBOZSBmZXJtZSBwYXMgY2V0dGUgcGFnZS4iLAogICAgIndhaXQudWx0aW1lLmZhbGxiYWNrIjogIkxlIGNpZWwgY29tcG9zZSB0b24gTWFudXNjcml0IFVsdGltZeKApiIsCiAgICAicHJvZy5pYSI6ICJUcmFkdWN0aW9uIGR1IGxhbmdhZ2UgZGUgbOKAmXVuaXZlcnMg4oCUIGFzc2VtYmxhZ2UgZGVzIGNoYXBpdHJlcyBkZSB0YSB2aWXigKYiLAogICAgInByb2cuaGQiOiAiTGVjdHVyZSBkZSB0b24gY29kZSBkZSB2aWXigKYiLAogICAgInByb2cudHoiOiAiQW5jcmFnZSBkYW5zIGxlIHRlbXBzIGV0IGzigJllc3BhY2XigKYiLAogICAgInByb2cuYXN0cm8iOiAiQWxpZ25lbWVudCBkZXMgcGxhbsOodGVz4oCmIiwKICAgICJwcm9nLmh0bWwiOiAiQXNzZW1ibGFnZSBldCByZWxpdXJlIGR1IG1hbnVzY3JpdOKApiIsCiAgICAicHJvZy5zeW50aCI6ICJTY2VhdSBmaW5hbCDigJQgbGUgbWFudXNjcml0IHByZW5kIHNhIGZvcm1l4oCmIiwKICAgICJhY2NvdW50LnBhdXNlX3N0YXRlIjogIkVuIHBhdXNlIOKAlCBhY2PDqHMgR3JhdHVpdCAoNSBtYW51c2NyaXRzIGR1IGpvdXIgLyBtb2lzLCAxIGR1IG1vaXMgLyBhbikiLAogICAgImFjY291bnQuYWN0aXZlIjogIkFjdGlmIiwKICAgICJhY2NvdW50LmluYWN0aXZlIjogIkluYWN0aWYiLAogICAgImFjY291bnQubm9fc3ViIjogIlNhbnMgYWJvbm5lbWVudCIsCiAgICAiYWNjb3VudC5wcmljZV9tbyI6ICJ7bn0g4oKsIC8gbW9pcyIsCiAgICAiYWNjb3VudC5pYV9vayI6ICJEaXNwb25pYmxlIiwKICAgICJhY2NvdW50LmlhX3BhdXNlIjogIkVuIHBhdXNlIOKAlCBzZSByb3V2cmUgYXZlYyBsZSBEaXZpbiIsCiAgICAiYWNjb3VudC5pYV9sb2NrIjogIlLDqXNlcnbDqWUgYXUgcGxhbiBEaXZpbiIsCiAgICAiYWNjb3VudC51bHRpbWVfcHJvZyI6ICJQcm9ncmVzc2lvbiBNYW51c2NyaXQgVWx0aW1lIiwKICAgICJhY2NvdW50LnVsdGltZV9saW5lIjogIntufSAvIDYgbW9pcyBwYXnDqXMiLAogICAgImFjY291bnQudWx0aW1lX2tlcHQiOiAiIChjb25zZXJ2w6lzKSIsCiAgICAiYWNjb3VudC5iaXJ0aF9za3kiOiAiQ2llbCBkZSBuYWlzc2FuY2UiLAogICAgImFjY291bnQubXNfcmVhZHkiOiAiIMK3IG1hbnVzY3JpdCBwcsOqdCIsCiAgICAiYWNjb3VudC5lZGl0c19sZWZ0IjogIklsIHRlIHJlc3RlIHtufSBtb2RpZmljYXRpb257c30uIiwKICAgICJhY2NvdW50LmVkaXRzX2RvbmUiOiAiVHUgYXMgdXRpbGlzw6kgdGVzIDMgbW9kaWZpY2F0aW9ucy4gUG91ciB0b3V0ZSBjb3JyZWN0aW9uLCBjb250YWN0ZSBsZSBzdXBwb3J0LiIsCiAgICAiYWNjb3VudC5lZGl0IjogIk1vZGlmaWVyIiwKICAgICJhY2NvdW50LnZpZXciOiAiQ29uc3VsdGVyIiwKICAgICJhY2NvdW50LmJpcnRoX2VtcHR5IjogIlBhcyBlbmNvcmUgcmVuc2VpZ27DqS4iLAogICAgImFjY291bnQuZmlsbF9iaXJ0aCI6ICJSZW5zZWlnbmVyIG1vbiBjaWVsIGRlIG5haXNzYW5jZSIsCiAgICAiYWNjb3VudC5tYW5hZ2UiOiAiR8OpcmVyIG1vbiBhYm9ubmVtZW50IiwKICAgICJhY2NvdW50Lm1hbmFnZV9oaW50IjogIlBvdXIgY2hhbmdlciBkZSBwbGFuLCBhcnLDqnRlIGTigJlhYm9yZCB0b24gYWJvbm5lbWVudCBhY3R1ZWwsIHB1aXMgc291c2NyaXMgw6Agbm91dmVhdSDDoCBjZWx1aSBkZSB0b24gY2hvaXguIiwKICAgICJhY2NvdW50LnN1cHBvcnQiOiAiUG91ciB0b3V0ZSBhc3Npc3RhbmNlIDogY29udGFjdEBmb3JtYXRpb25zLXNwaXJpdHVhbGl0ZS1lbmVyZ2V0aXF1ZS5jb20iLAogICAgImFjY291bnQucmVzdW1lX21hbmFnZSI6ICJSZXByZW5kcmUgLyBnw6lyZXIgbW9uIGFib25uZW1lbnQiLAogICAgImFjY291bnQuYmFja19jZWxlc3RlIjogIlJlcGFzc2VyIEPDqWxlc3RlIMK3IDU5IOKCrCIsCiAgICAiYWNjb3VudC50b19kaXZpbiI6ICJQYXNzZXIgRGl2aW4gwrcgMTM3IOKCrCIsCiAgICAiYWNjb3VudC50b19jZWxlc3RlIjogIlBhc3NlciBDw6lsZXN0ZSDCtyA1OSDigqwiLAogICAgImFjY291bnQuZG93bmdyYWRlX2NlbGVzdGUiOiAiUmV2ZW5pciDDoCBDw6lsZXN0ZSDCtyA1OSDigqwiLAogICAgImFjY291bnQubWFuYWdlX3N0b3AiOiAiR8OpcmVyIC8gYXJyw6p0ZXIgbOKAmWFib25uZW1lbnQiLAogICAgImFjY291bnQuZGxfbGFiZWwiOiAiVMOpbMOpY2hhcmdlbWVudCDCtyBEaXZpbiIsCiAgICAiYWNjb3VudC5kbF9oaW50IjogIlTDqWzDqWNoYXJnZSB0b3VzIHRlcyBtYW51c2NyaXRzIHByw6p0cyAobmF0YWwsIG1vaXMsIGpvdXIsIGNvdXBsZeKApikgZW4gdW4gZmljaGllciBaSVAuIiwKICAgICJhY2NvdW50LmRsX2J0biI6ICJUw6lsw6ljaGFyZ2VyIHRvdXMgbWVzIG1hbnVzY3JpdHMiLAogICAgImFjY291bnQuZGxfdW5sb2NrIjogIkTDqWJsb2NhZ2UgZGFucyB7bn0gbW9pcyIsCiAgICAiYWNjb3VudC5kbF9wcm9ncmVzcyI6ICJPcHRpb24gcsOpc2VydsOpZSBhdSBEaXZpbiwgYXByw6hzIHtuZWVkfSBtb2lzIGTigJlhYm9ubmVtZW50LiBQcm9ncmVzc2lvbiA6IDxiPntoYXZlfSAvIHtuZWVkfTwvYj4uIiwKICAgICJlcnIudW5yZWFjaGFibGUiOiAiTGVzIE1hbnVzY3JpdHMgQ8OpbGVzdGVzIG5lIHNvbnQgcGFzIGpvaWduYWJsZXMgcG91ciBsZSBtb21lbnQuIFLDqWVzc2FpZSBkYW5zIHVuIGluc3RhbnQuIgogIH0sCiAgImVuIjogewogICAgImJyYW5kLm5hbWUiOiAiVGhlIENlbGVzdGlhbCBNYW51c2NyaXB0cyIsCiAgICAiYnJhbmQubmFtZV9odG1sIjogIlRoZSBDZWxlc3RpYWw8YnI+PHNwYW4+TWFudXNjcmlwdHM8L3NwYW4+IiwKICAgICJicmFuZC5hY2NvdW50X2FyaWEiOiAiQWNjb3VudCIsCiAgICAibG9naW4uZW1haWxfcGgiOiAieW91QGVtYWlsLmNvbSIsCiAgICAibG9naW4ubGVkZSI6ICJGcmVlLCBDw6lsZXN0ZSAo4oKsNTkpIG9yIERpdmluICjigqwxMzcpLjxicj5Dw6lsZXN0ZSBBSSBhY2NvbXBhbmllcyB5b3Ugb24gRGl2aW4uIiwKICAgICJlcnIudW5yZWFjaGFibGUiOiAiVGhlIENlbGVzdGlhbCBNYW51c2NyaXB0cyBhcmUgdW5yZWFjaGFibGUgcmlnaHQgbm93LiBUcnkgYWdhaW4gaW4gYSBtb21lbnQuIiwKICAgICJpbnN0YWxsLnRpdGxlX2h0bWwiOiAiT24geW91cjxicj48c3Bhbj5ob21lIHNjcmVlbjwvc3Bhbj4iLAogICAgImluc3RhbGwubGVkZSI6ICJMaWtlIGFuIGFwcCwgd2l0aG91dCB0aGUgQXBwIFN0b3JlLiIsCiAgICAiaW5zdGFsbC5zdGVwc19pb3MiOiAiT24gaVBob25lOiB0YXAgPGI+U2hhcmU8L2I+IHRoZW4gPGI+QWRkIHRvIEhvbWUgU2NyZWVuPC9iPi4iLAogICAgImluc3RhbGwuc3RlcHNfYW5kcm9pZCI6ICJPbiBBbmRyb2lkOiB1c2UgdGhlIGJ1dHRvbiBiZWxvdywgb3IgQ2hyb21lIG1lbnUg4oaSIDxiPkFkZCB0byBIb21lIHNjcmVlbjwvYj4uIiwKICAgICJpbnN0YWxsLmFkZCI6ICJBZGQgdG8gaG9tZSBzY3JlZW4iLAogICAgImluc3RhbGwuc2tpcCI6ICJDb250aW51ZSB3aXRob3V0IGluc3RhbGxpbmciLAogICAgIm9uYm9hcmQudGl0bGVfaHRtbCI6ICJZb3VyIGJpcnRoPGJyPjxzcGFuPnNreTwvc3Bhbj4iLAogICAgIm9uYm9hcmQubGVkZV9uZXciOiAiU2F2ZWQgdW5kZXIge2VtYWlsfSDigJQgZm9yIG5hdGFsLCBkYXkgYW5kIG1vbnRoLiBZb3UgY2FuIGNvcnJlY3QgdXAgdG8gMyB0aW1lcyBpZiBuZWVkZWQuIiwKICAgICJvbmJvYXJkLmxlZGVfcmVhZG9ubHkiOiAiWW91IGhhdmUgdXNlZCB5b3VyIDMgZWRpdHMuIEZvciBhbnkgZnVydGhlciBjb3JyZWN0aW9uLCBjb250YWN0IHN1cHBvcnQuIiwKICAgICJvbmJvYXJkLmxlZGVfZWRpdCI6ICJGaXggYSBtaXN0YWtlIGlmIG5lZWRlZC4gWW91IGhhdmUge259IGVkaXR7c30gbGVmdC4iLAogICAgIm9uYm9hcmQubmF0YWxfbm90ZSI6ICJZb3VyIG5hdGFsIG1hbnVzY3JpcHQgaXMgYWxyZWFkeSBnZW5lcmF0ZWQ6IGNoYW5naW5nIHRoaXMgaW5mbyBkb2VzIG5vdCByZWdlbmVyYXRlIGl0IGF1dG9tYXRpY2FsbHkuIiwKICAgICJvbmJvYXJkLmVkaXRzX25vbmUiOiAiTm8gbW9yZSBlZGl0cyBwb3NzaWJsZS4iLAogICAgIm9uYm9hcmQuZWRpdHNfbGVmdCI6ICJZb3UgaGF2ZSB7bn0gZWRpdHtzfSBsZWZ0LiIsCiAgICAib25ib2FyZC5zYXZlX2VkaXQiOiAiU2F2ZSBjaGFuZ2VzIiwKICAgICJvbmJvYXJkLnNhdmVfbmV3IjogIlNhdmUgbXkgcHJvZmlsZSIsCiAgICAib25ib2FyZC5ub19tb3JlIjogIk5vIG1vcmUgZWRpdHMgcG9zc2libGUiLAogICAgIm9uYm9hcmQuYmFjayI6ICJCYWNrIiwKICAgICJvbmJvYXJkLmxhdGVyIjogIkxhdGVyIiwKICAgICJvbmJvYXJkLmJpcnRoX2RhdGUiOiAiRGF0ZSBvZiBiaXJ0aCIsCiAgICAib25ib2FyZC5iaXJ0aF90aW1lIjogIlRpbWUgb2YgYmlydGgiLAogICAgIm9uYm9hcmQuYmlydGhfcGxhY2UiOiAiUGxhY2Ugb2YgYmlydGgiLAogICAgIm9uYm9hcmQucGxhY2VfcGgiOiAiVHlwZSBhIGNpdHnigKYgKGUuZy4gTHlvbikiLAogICAgIm9uYm9hcmQuZ2VuZGVyIjogIkdlbmRlciIsCiAgICAiZ2VuZGVyLmZlbW1lIjogIldvbWFuIiwKICAgICJnZW5kZXIuaG9tbWUiOiAiTWFuIiwKICAgICJnZW5kZXIuYXV0cmUiOiAiT3RoZXIiLAogICAgIndlbGNvbWUuYmFjayI6ICJXZWxjb21lIGJhY2ssIHtuYW1lfS4iLAogICAgIndlbGNvbWUueW91IjogInlvdSIsCiAgICAicGxhbi5mcmVlIjogIkZyZWUiLAogICAgInBsYW4ucGF1c2Vfc3VmZml4IjogIiDCtyBwYXVzZWQiLAogICAgInBsYW4ubGFiZWwiOiAie25hbWV9IHBsYW4iLAogICAgInBsYW4uY2VsZXN0ZSI6ICJDw6lsZXN0ZSBwbGFuIiwKICAgICJwbGFuLmRpdmluIjogIkRpdmluIHBsYW4iLAogICAgInBsYW4uZGl2aW5fcHJpY2UiOiAiRGl2aW4gcGxhbiDCtyDigqwxMzciLAogICAgInBsYW4ub25fZGVtYW5kIjogIk9uIGRlbWFuZCIsCiAgICAicGxhbi5jZWxlc3RlX29yX2RpdmluIjogIkPDqWxlc3RlIG9yIERpdmluIiwKICAgICJwbGFuLmxvY2tlZCI6ICJMb2NrZWQiLAogICAgInBsYW4udW5sb2NrZWQiOiAiVW5sb2NrZWQiLAogICAgInBsYW4ucGF1c2VkIjogIlBhdXNlZCIsCiAgICAibmF0YWwua2lja2VyIjogIk5hdGFsIiwKICAgICJuYXRhbC5pbnRybyI6ICJUaGUgMjggcGFnZXMgb2YgeW91ciBjaGFydCDigJQgYWx3YXlzIGF2YWlsYWJsZSB3aGlsZSB5b3VyIHN1YnNjcmlwdGlvbiBpcyBhY3RpdmUuIiwKICAgICJuYXRhbC50aXRsZSI6ICJUaGUgQ2VsZXN0aWFsIE1hbnVzY3JpcHQiLAogICAgIm5hdGFsLm9mX2xpZmUiOiAib2YgeW91ciBsaWZlIiwKICAgICJuYXRhbC50aXRsZV9wbGFpbiI6ICJUaGUgQ2VsZXN0aWFsIE1hbnVzY3JpcHQgb2YgeW91ciBsaWZlIiwKICAgICJuYXRhbC5hc2siOiAiR0VUIE1ZIExJRkUgTUFOVVNDUklQVCIsCiAgICAibmF0YWwucmVhZCI6ICJWSUVXIE1ZIENFTEVTVElBTCBMSUZFIE1BTlVTQ1JJUFQiLAogICAgIm5hdGFsLnBhZ2VzX3ByaWNlIjogIjI4IHBhZ2VzIMK3IOKCrDU5IC8gbW9udGgiLAogICAgIm5hdGFsLmxvY2tfcGF1c2VkIjogIlN1YnNjcmlwdGlvbiBwYXVzZWQ6IG5hdGFsIHJlb3BlbnMgd2hlbiB5b3UgcmVzdW1lLiIsCiAgICAibmF0YWwubG9ja19uZWVkIjogIllvdXIgbGlmZSBtYW51c2NyaXB0IG9wZW5zIHdpdGggdGhlIEPDqWxlc3RlIHN1YnNjcmlwdGlvbi4iLAogICAgIm5hdGFsLm5lZWRfcHJvZmlsZSI6ICJFbnRlciB5b3VyIGJpcnRoIHNreSBzbyB5b3VyIG1hbnVzY3JpcHQgY2FuIGJlIHdyaXR0ZW4uIiwKICAgICJuYXRhbC5maWxsX3Byb2ZpbGUiOiAiRW50ZXIgbXkgYmlydGggc2t5IiwKICAgICJuYXRhbC5lcnJfZ2VuZXJpYyI6ICJHZW5lcmF0aW9uIGNvdWxkIG5vdCBjb21wbGV0ZS4gVHJ5IGFnYWluIGluIGEgbW9tZW50LiIsCiAgICAibmF0YWwuZXJyX3NvZnQiOiAiR2VuZXJhdGlvbiBjb3VsZCBub3QgY29tcGxldGUgcmlnaHQgbm93LiBUcnkgYWdhaW4g4oCUIHlvdXIg4oCcR0VUIE1ZIExJRkUgTUFOVVNDUklQVOKAnSBidXR0b24gcmVtYWlucyBhdmFpbGFibGUuIiwKICAgICJuYXRhbC5yZWFkeSI6ICJQcm9maWxlIHNhdmVkIMK3IHlvdXIgbWFudXNjcmlwdCBpcyByZWFkeS4iLAogICAgIm5hdGFsLndhaXRpbmciOiAiUHJvZmlsZSBzYXZlZCDCtyB3YWl0aW5nIGZvciB5b3VyIHJlcXVlc3QuIiwKICAgICJuYXRhbC5yZWFkZXJfaW50cm8iOiAiSGVyZSBpcyB5b3VyIENlbGVzdGlhbCBNYW51c2NyaXB0IG9mIHlvdXIgbGlmZS4gSW4tYXBwIHJlYWRpbmcgb25seSwgd2hpbGUgeW91ciBzdWJzY3JpcHRpb24gaXMgYWN0aXZlLiIsCiAgICAibmF0YWwudW5hdmFpbGFibGUiOiAiTWFudXNjcmlwdCB1bmF2YWlsYWJsZSBmb3Igbm93LiBHbyBiYWNrIGhvbWUgYW5kIHRhcCBHRVQgTVkgTElGRSBNQU5VU0NSSVBULiIsCiAgICAibmF0YWwuZnJhbWVfdGl0bGUiOiAiTmF0YWwgbWFudXNjcmlwdCIsCiAgICAidWx0aW1lLnRpdGxlIjogIlRoZSBVbHRpbWF0ZSBDZWxlc3RpYWwgTWFudXNjcmlwdCIsCiAgICAidWx0aW1lLnRpdGxlX3BsYWluIjogIlRoZSBVbHRpbWF0ZSBDZWxlc3RpYWwgTWFudXNjcmlwdCBvZiB5b3VyIGxpZmUiLAogICAgInVsdGltZS5hc2siOiAiUmVxdWVzdCB0aGUgVWx0aW1hdGUiLAogICAgInVsdGltZS5yZWFkIjogIlZJRVcgVEhFIFVMVElNQVRFIE1BTlVTQ1JJUFQiLAogICAgInVsdGltZS5kaXZpbl9ub3ciOiAiSW5jbHVkZWQgcmlnaHQgYXdheSB3aXRoIERpdmluLiIsCiAgICAidWx0aW1lLnNpeF9tb250aHMiOiAiU2l4IG1vbnRocyBwYWlkLCBldmVuIHdpdGggcGF1c2VzLiIsCiAgICAidWx0aW1lLm9uY2UiOiAiIFdyaXR0ZW4gb25jZSwgYXQgeW91ciByZXF1ZXN0LiIsCiAgICAidWx0aW1lLmxvY2tfaW50cm8iOiAiQWZ0ZXIgNiBDw6lsZXN0ZSBtb250aHMsIG9yIGltbWVkaWF0ZWx5IHdpdGggRGl2aW4uIiwKICAgICJ1bHRpbWUucGF1c2VfcmVvcGVuIjogIlRoZSBVbHRpbWF0ZSByZW9wZW5zIHdoZW4geW91IHJlc3VtZSB5b3VyIHN1YnNjcmlwdGlvbi4iLAogICAgInVsdGltZS5tb250aHNfa2VwdCI6ICIgWW91ciA8Yj57bn0gbW9udGhzPC9iPiByZW1haW4gY291bnRlZC4iLAogICAgInVsdGltZS5sb2NrX3Byb2dyZXNzIjogIllvdSBoYXZlIDxiPntoYXZlfSBtb250aHM8L2I+IGFscmVhZHkgcGFpZC4gPGI+e2xlZnR9PC9iPiBsZWZ0IOKAlCBhIHBhdXNlIGRvZXMgbm90IGJyZWFrIHRoZSBzdHJlYWsuIiwKICAgICJ1bHRpbWUucGFnZXNfbG9ja2VkIjogIntufSBwYWdlcyDCtyA2IHBhaWQgbW9udGhzLCBjdW11bGF0aXZlIiwKICAgICJ1bHRpbWUucGFnZXNfdW5sb2NrZWQiOiAie259IHBhZ2VzIMK3IGFscmVhZHkgdW5sb2NrZWQiLAogICAgInVsdGltZS5wYWdlc19wbGFpbiI6ICJ7bn0gcGFnZXMiLAogICAgInVsdGltZS5uZWVkX3Byb2ZpbGUiOiAiRW50ZXIgeW91ciBiaXJ0aCBza3kgc28gdGhlIFVsdGltYXRlIGNhbiBiZSB3cml0dGVuLiIsCiAgICAidWx0aW1lLmVycl9nZW5lcmljIjogIlVsdGltYXRlIGdlbmVyYXRpb24gY291bGQgbm90IGNvbXBsZXRlLiBUcnkgYWdhaW4uIiwKICAgICJ1bHRpbWUuZXJyX3NvZnQiOiAiR2VuZXJhdGlvbiBjb3VsZCBub3QgY29tcGxldGUgcmlnaHQgbm93LiBUcnkgYWdhaW4g4oCUIHlvdXIg4oCcUmVxdWVzdCB0aGUgVWx0aW1hdGXigJ0gYnV0dG9uIHJlbWFpbnMgYXZhaWxhYmxlLiIsCiAgICAidWx0aW1lLnJlYWR5IjogIllvdXIgVWx0aW1hdGUgTWFudXNjcmlwdCBpcyByZWFkeS4iLAogICAgInVsdGltZS53YWl0aW5nIjogIlVubG9ja2VkIMK3IHdhaXRpbmcgZm9yIHlvdXIgcmVxdWVzdC4iLAogICAgInVsdGltZS5raWNrZXIiOiAiVWx0aW1hdGUgZWRpdGlvbiIsCiAgICAidWx0aW1lLnJlYWRlcl9kaXZpbiI6ICJIZXJlIGlzIHlvdXIgVWx0aW1hdGUgQ2VsZXN0aWFsIE1hbnVzY3JpcHQsIGluY2x1ZGVkIHdpdGggRGl2aW4uIEluLWFwcCByZWFkaW5nIHdoaWxlIHlvdXIgc3Vic2NyaXB0aW9uIGlzIGFjdGl2ZS4iLAogICAgInVsdGltZS5yZWFkZXJfcGFpZCI6ICJIZXJlIGlzIHlvdXIgVWx0aW1hdGUgQ2VsZXN0aWFsIE1hbnVzY3JpcHQsIHVubG9ja2VkIGFmdGVyIDYgcGFpZCBtb250aHMuIEluLWFwcCByZWFkaW5nIHdoaWxlIHlvdXIgc3Vic2NyaXB0aW9uIGlzIGFjdGl2ZS4iLAogICAgInVsdGltZS51bmF2YWlsYWJsZSI6ICJVbHRpbWF0ZSBtYW51c2NyaXB0IHVuYXZhaWxhYmxlLiBHbyBiYWNrIGhvbWUgYW5kIHRhcCDigJxSZXF1ZXN0IHRoZSBVbHRpbWF0ZeKAnS4iLAogICAgInVsdGltZS5mcmFtZV90aXRsZSI6ICJVbHRpbWF0ZSBtYW51c2NyaXB0IiwKICAgICJtb2lzLmxhYmVsIjogIlRoaXMgbW9udGgiLAogICAgIm1vaXMuaW50cm8iOiAiQXZhaWxhYmxlIGFsbCBtb250aC4gWW91ciBDZWxlc3RpYWwgTWFudXNjcmlwdCBmb3IgdGhlIGN1cnJlbnQgbW9udGguIEhvdyB5b3VyIHN0YXJzIHNwZWFrIHRoaXMgbW9udGgiLAogICAgIm1vaXMudGl0bGVfaHRtbCI6ICJDZWxlc3RpYWwgTWFudXNjcmlwdCA8c3BhbiBjbGFzcz1cImRlLWNlLW1vaXNcIj5GT1IgVEhJUyBNT05USCBPRiB7bW9udGh9PC9zcGFuPiIsCiAgICAibW9pcy50aXRsZV9wbGFpbiI6ICJDZWxlc3RpYWwgTWFudXNjcmlwdCBGT1IgVEhJUyBNT05USCBPRiB7bW9udGh9IiwKICAgICJtb2lzLmFzayI6ICJSZXF1ZXN0IHRoaXMgbW9udGjigJlzIG1hbnVzY3JpcHQiLAogICAgIm1vaXMucmVhZCI6ICJSZXJlYWQgdGhpcyBtb250aOKAmXMgbWFudXNjcmlwdCIsCiAgICAibW9pcy5xdW90YSI6ICIgwrcge3VzZWR9IC8gMSB0aGlzIHllYXIgKEZyZWUpIiwKICAgICJtb2lzLnJlYWRlcl9pbnRybyI6ICJIZXJlIGlzIHlvdXIgQ2VsZXN0aWFsIE1hbnVzY3JpcHQgb2YgdGhlIG1vbnRoLiBJbi1hcHAgcmVhZGluZyBvbmx5LCB3aGlsZSB5b3VyIHN1YnNjcmlwdGlvbiBpcyBhY3RpdmUuIiwKICAgICJtb2lzLmZyYW1lX3RpdGxlIjogIk1vbnRoIG1hbnVzY3JpcHQiLAogICAgImpvdXIubGFiZWwiOiAiVG9kYXkiLAogICAgImpvdXIuaW50cm8iOiAiWW91ciBDZWxlc3RpYWwgTWFudXNjcmlwdCBmb3IgdGhpcyBkYXkuIEhvdyB5b3VyIHN0YXJzIHNwZWFrIFRPREFZIiwKICAgICJqb3VyLnRpdGxlIjogIkNlbGVzdGlhbCBNYW51c2NyaXB0IG9mIHtkYXRlfSIsCiAgICAiam91ci5hc2siOiAiR0VUIFRPREFZ4oCZUyBNQU5VU0NSSVBUIiwKICAgICJqb3VyLnJlYWQiOiAiUmVyZWFkIHRvZGF54oCZcyBtYW51c2NyaXB0IiwKICAgICJqb3VyLnF1b3RhIjogIiDCtyB7dXNlZH0gLyA1IHRoaXMgbW9udGggKEZyZWUpIiwKICAgICJqb3VyLnJlYWRlcl9pbnRybyI6ICJIZXJlIGlzIHlvdXIgQ2VsZXN0aWFsIE1hbnVzY3JpcHQgb2YgdGhlIGRheS4gSW4tYXBwIHJlYWRpbmcgb25seSwgd2hpbGUgeW91ciBzdWJzY3JpcHRpb24gaXMgYWN0aXZlLiIsCiAgICAiam91ci5mcmFtZV90aXRsZSI6ICJEYXkgbWFudXNjcmlwdCIsCiAgICAicGVyaW9kLnVuYXZhaWxhYmxlIjogIk1hbnVzY3JpcHQgdW5hdmFpbGFibGUgZm9yIG5vdy4gR28gYmFjayB0byB0aGUgdGFiIGFuZCByZXF1ZXN0IGl0IGFnYWluLiIsCiAgICAicGVyaW9kLmVycl9pbnRlcnJ1cHQiOiAiR2VuZXJhdGlvbiBpbnRlcnJ1cHRlZC4gVHJ5IGFnYWluLiIsCiAgICAiY291cGxlLmtpY2tlciI6ICJTeW5hc3RyeSIsCiAgICAiY291cGxlLmxlZGVfbG9jayI6ICJTeW5hc3RyeSBmb3IgdHdvIiwKICAgICJjb3VwbGUudGl0bGVfaHRtbCI6ICJDZWxlc3RpYWwgTWFudXNjcmlwdCA8c3BhbiBjbGFzcz1cImRlLXRhLXZpZVwiPkNvdXBsZTwvc3Bhbj4iLAogICAgImNvdXBsZS50aXRsZV9wbGFpbiI6ICJDZWxlc3RpYWwgQ291cGxlIE1hbnVzY3JpcHQiLAogICAgImNvdXBsZS50aXRsZV9zaG9ydCI6ICJDb3VwbGUgbWFudXNjcmlwdCIsCiAgICAiY291cGxlLmludHJvIjogIkh1bWFuIERlc2lnbiDDlyBBc3Ryb2xvZ3kgc3luYXN0cnkgZm9yIHlvdSBib3RoIOKAlCBvbmUgY291cGxlIG1hbnVzY3JpcHQgcGVyIGNhbGVuZGFyIG1vbnRoLCBEaXZpbiBwbGFuIG9ubHkuIiwKICAgICJjb3VwbGUuYXNrIjogIlJlcXVlc3QgdGhlIGNvdXBsZSBtYW51c2NyaXB0IiwKICAgICJjb3VwbGUucmVhZCI6ICJSZXJlYWQgdGhlIGNvdXBsZSBtYW51c2NyaXB0IiwKICAgICJjb3VwbGUucXVvdGEiOiAie259IC8gMSB0aGlzIG1vbnRoIiwKICAgICJjb3VwbGUubG9ja19wYXVzZWQiOiAiU3Vic2NyaXB0aW9uIHBhdXNlZDogdGhlIGNvdXBsZSBtYW51c2NyaXB0IHJlb3BlbnMgd2hlbiB5b3UgcmVzdW1lIERpdmluLiIsCiAgICAiY291cGxlLmxvY2tfbmVlZCI6ICJSZXNlcnZlZCBmb3IgRGl2aW4g4oCUIHR3byBza2llcyBjcm9zc2VkLCBvbmNlIHBlciBjYWxlbmRhciBtb250aC4iLAogICAgImNvdXBsZS5kaXNjb3ZlciI6ICJEaXNjb3ZlciBEaXZpbiIsCiAgICAiY291cGxlLndpdGgiOiAiV2l0aCB7bmFtZX0iLAogICAgImNvdXBsZS5lZGl0IjogIkVkaXQiLAogICAgImNvdXBsZS5lcnJfZ2VuZXJpYyI6ICJHZW5lcmF0aW9uIGNvdWxkIG5vdCBjb21wbGV0ZS4iLAogICAgImNvdXBsZS5yZWFkZXJfaW50cm8iOiAiSGVyZSBpcyB5b3VyIENlbGVzdGlhbCBDb3VwbGUgTWFudXNjcmlwdC4gSW4tYXBwIHJlYWRpbmcgb25seSwgd2hpbGUgeW91ciBEaXZpbiBzdWJzY3JpcHRpb24gaXMgYWN0aXZlLiIsCiAgICAiY291cGxlLnVuYXZhaWxhYmxlIjogIkNvdXBsZSBtYW51c2NyaXB0IHVuYXZhaWxhYmxlLiBHbyBiYWNrIHRvIHRoZSBDb3VwbGUgdGFiLiIsCiAgICAiY291cGxlLmZyYW1lX3RpdGxlIjogIkNvdXBsZSBtYW51c2NyaXB0IiwKICAgICJjb3VwbGUubm90X3JlYWR5IjogIllvdXIgY291cGxlIG1hbnVzY3JpcHQgaXMgbm90IHJlYWR5IHlldC4iLAogICAgImNvdXBsZS5taXNzaW5nX2xpbmsiOiAiTWFudXNjcmlwdCBsaW5rIG1pc3NpbmcuIFNpZ24gaW4gYWdhaW4gdGhlbiByZXRyeS4iLAogICAgImNvdXBsZS5maWxlX21pc3NpbmciOiAiQ291cGxlIGZpbGUgbm90IGZvdW5kLiBUYXAg4oCcUmVxdWVzdCB0aGUgY291cGxlIG1hbnVzY3JpcHTigJ0gYWdhaW4uIiwKICAgICJwYXJ0bmVyLmxhYmVsIjogIlBhcnRuZXIiLAogICAgInBhcnRuZXIudGl0bGUiOiAiUGFydG5lcuKAmXMgYmlydGggc2t5IiwKICAgICJwYXJ0bmVyLmhpbnQiOiAiRmlyc3QgbmFtZSwgZGF0ZSwgdGltZSwgcGxhY2UgYW5kIGdlbmRlciDigJQgbGlrZSB5b3VyIHByb2ZpbGUuICIsCiAgICAicGFydG5lci5ub19lZGl0cyI6ICJObyBtb3JlIGVkaXRzLiIsCiAgICAicGFydG5lci5lZGl0c19sZWZ0IjogIllvdSBoYXZlIHtufSBjb3JyZWN0aW9ue3N9IGxlZnQuIiwKICAgICJwYXJ0bmVyLmVkaXRzX2ludHJvIjogIllvdSBjYW4gY29ycmVjdCB1cCB0byAzIHRpbWVzLiIsCiAgICAicGFydG5lci5wcmVub20iOiAiRmlyc3QgbmFtZSIsCiAgICAicGFydG5lci5wbGFjZV9waCI6ICJUeXBlIGEgY2l0eeKApiIsCiAgICAicGFydG5lci5zYXZlIjogIlNhdmUgcGFydG5lciIsCiAgICAicGFydG5lci5iYWNrIjogIkJhY2siLAogICAgInBhdXNlLmxhYmVsIjogIlN1YnNjcmlwdGlvbiBwYXVzZWQiLAogICAgInBhdXNlLnRpdGxlIjogIlNwYWNlIHBhdXNlZCIsCiAgICAicGF1c2UuYm9keSI6ICJZb3VyIHtwbGFufSBzdWJzY3JpcHRpb24gaXMgcGF1c2VkLiBZb3Uga2VlcCBGcmVlIGFjY2VzczogMSBtb250aCBtYW51c2NyaXB0ICsgNSBkYXkgbWFudXNjcmlwdHMuIE5hdGFsLCBVbHRpbWF0ZSBhbmQgQ8OpbGVzdGUgQUkgcmVvcGVuIHdoZW4geW91IHJlc3VtZS4iLAogICAgInBhdXNlLnVsdGltZV9ub3RlIjogIlVsdGltYXRlIG1vbnRocyBrZXB0OiB7bn0gLyA2LiIsCiAgICAicGF1c2UucmVzdW1lIjogIlJlc3VtZSBteSBzdWJzY3JpcHRpb24iLAogICAgInBhdXNlLnJlZnJlc2giOiAiSSByZXN1bWVkIOKAlCByZWZyZXNoIiwKICAgICJmcmVlLmJhbm5lcl9mdWxsIjogIkZyZWUgYWNjZXNzOiB7bX0gbW9udGgge213fSArIHtkfSBkYXkge2R3fSBpbmNsdWRlZC4iLAogICAgImZyZWUuYmFubmVyX2xlZnQiOiAiWW91IGhhdmUge219IG1vbnRoIHttd30gYW5kIHtkfSBkYXkge2R3fSBsZWZ0LiIsCiAgICAiZnJlZS5tc19vbmUiOiAibWFudXNjcmlwdCIsCiAgICAiZnJlZS5tc19tYW55IjogIm1hbnVzY3JpcHRzIiwKICAgICJpYS50aXRsZSI6ICJDw6lsZXN0ZSBBSSIsCiAgICAiaWEudGl0bGVfbXMiOiAiQ8OpbGVzdGUgQUkgwrcgdGhpcyBtYW51c2NyaXB0IiwKICAgICJpYS5hdmFpbGFibGUiOiAiQXZhaWxhYmxlIiwKICAgICJpYS5pbmNsdWRlZCI6ICJJbmNsdWRlZCB3aXRoIERpdmluIiwKICAgICJpYS5jYXJkX29rIjogIlNoZSBhY2NvbXBhbmllcyB5b3UgdW5kZXIgZWFjaCBtYW51c2NyaXB0IGFzIHlvdSByZWFkIOKAlCBhIHdhcm0gcHJlc2VuY2UgdG8gY2xhcmlmeSB3aGF0IHlvdSBmZWVsLiIsCiAgICAiaWEuY2FyZF9sb2NrIjogIkFzIHlvdSByZWFkLCBzaGUgbGlzdGVuczogbG92ZSB0b2RheT8gd29yaz8gdGhlIHJpZ2h0IG1vbWVudD8iLAogICAgImlhLmxvY2tfcmVhZGVyIjogIkFzayBxdWVzdGlvbnMgYWJvdXQgdGhpcyBtYW51c2NyaXB0IHdpdGggdGhlIERpdmluIHBsYW4uIiwKICAgICJpYS5wYXNzX2RpdmluIjogIkdvIERpdmluIMK3IOKCrDEzNyIsCiAgICAiaWEuZ3VpZGUiOiAiU2hlIGlzIGhlcmUgdG8gaWxsdW1pbmF0ZSwgd2l0aG91dCBqdWRnbWVudC4iLAogICAgImlhLmVtcHR5IjogIkEgcXVlc3Rpb24gYWJvdXQgd2hhdCB5b3UgYXJlIHJlYWRpbmfigKYgZS5nLiB3aGF0IGRvZXMgdGhpcyBwYWdlIHNheSBhYm91dCBsb3ZlPyIsCiAgICAiaWEucXVlc3Rpb24iOiAiWW91ciBxdWVzdGlvbiIsCiAgICAiaWEucGxhY2Vob2xkZXIiOiAiV2hhdCBkb2VzIHRoaXMgcGFzc2FnZSByZXZlYWw/IiwKICAgICJpYS5taWMiOiAiRGljdGF0ZSB5b3VyIHF1ZXN0aW9uIiwKICAgICJpYS5zZW5kIjogIlNlbmQiLAogICAgImlhLmJ1c3kiOiAiQ8OpbGVzdGUgcmVzcG9uZHMiLAogICAgImlhLnJlc3QiOiAiVGhlIHNreSBpcyByZXN0aW5nIiwKICAgICJpYS55b3UiOiAiWW91IiwKICAgICJpYS5yZXBseV9uYW1lIjogIkPDqWxlc3RlIHJlcGxpZXMiLAogICAgImlhLmxpc3RlbiI6ICJMaXN0ZW4iLAogICAgImlhLnN0b3AiOiAiU3RvcCIsCiAgICAiaWEubGlzdGVuX2FyaWEiOiAiTGlzdGVuIHRvIHRoaXMgbWVzc2FnZSIsCiAgICAiaWEuZXJyX2dlbmVyaWMiOiAiVGhlIHNreSBpcyBub3QgYW5zd2VyaW5nIHJpZ2h0IG5vdy4gVHJ5IGFnYWluIGluIGEgbW9tZW50LiIsCiAgICAiaWEuZXJyXzQwNCI6ICJBY2NvdW50IG5vdCBmb3VuZC4gU2lnbiBpbiBhZ2Fpbi4iLAogICAgImlhLmFza19kZXZlbG9wIjogIkNhbiB5b3UgZXhwbGFpbiBhbmQgZXhwYW5kIHRoaXMgcGFzc2FnZSBmcm9tIG15IG1hbnVzY3JpcHQ/XG5cbuKAnHtwYXNzYWdlfeKAnSIsCiAgICAiaWEubWljX2Jsb2NrZWQiOiAiTWljcm9waG9uZSBibG9ja2VkLiBBbGxvdyB0aGUgbWljIGluIHlvdXIgYnJvd3NlciB0byBkaWN0YXRlIHlvdXIgcXVlc3Rpb24uIiwKICAgICJpYS5taWNfbm9uZSI6ICJObyBtaWNyb3Bob25lIGRldGVjdGVkLiBQbHVnIG9uZSBpbiBvciBhbGxvdyBhdWRpbyBhY2Nlc3MuIiwKICAgICJpYS5taWNfZmFpbCI6ICJDb3VsZCBub3Qgc3RhcnQgZGljdGF0aW9uLiBUcnkgYWdhaW4gaW4gYSBtb21lbnQuIiwKICAgICJpYS5taWNfdW5zdXBwb3J0ZWQiOiAiRGljdGF0aW9uIG5vdCBzdXBwb3J0ZWQgaW4gdGhpcyBicm93c2VyIiwKICAgICJpYS5zcGVlY2hfdW5zdXBwb3J0ZWQiOiAiVm9pY2UgZGljdGF0aW9uIGlzIG5vdCBhdmFpbGFibGUgaW4gdGhpcyBicm93c2VyLiBPbiBpUGhvbmUgb3IgaVBhZCwgYW4gdXAtdG8tZGF0ZSBTYWZhcmkgbWF5IG9mZmVyIGl0OyBvdGhlcndpc2UgdHlwZSB5b3VyIHF1ZXN0aW9uLiBDaHJvbWUgb3IgRWRnZSBvbiBkZXNrdG9wIHdvcmsgYmVzdC4iLAogICAgInNlbC5hc2siOiAiQXNrIEPDqWxlc3RlIEFJIHRvIGV4cGFuZCB0aGlzIHBhc3NhZ2UiLAogICAgInJlYWRlci5iYWNrIjogIuKGkCBCYWNrIiwKICAgICJyZWFkZXIuZnNfZW50ZXIiOiAiTWFudXNjcmlwdCBmdWxsc2NyZWVuIiwKICAgICJyZWFkZXIuZnNfZXhpdCI6ICJFeGl0IGZ1bGxzY3JlZW4iLAogICAgInJlYWRlci5tc190aXRsZSI6ICJNYW51c2NyaXB0IiwKICAgICJ3YWl0Lm5hdGFsLnRpdGxlIjogIllvdXIgQ2VsZXN0aWFsIGxpZmUgbWFudXNjcmlwdCBpcyBiZWluZyB3cml0dGVuIiwKICAgICJ3YWl0Lm5hdGFsLmhpbnQiOiAiUGxhbmV0IGFsaWdubWVudCDCtyBsaWZlLWNvZGUgY2FsY3VsYXRpb25zIMK3IHdlYXZpbmcgdGhlIGxhbmd1YWdlIG9mIHRoZSB1bml2ZXJzZS4gRG8gbm90IGNsb3NlIHRoaXMgcGFnZS4iLAogICAgIndhaXQubmF0YWwuZmFsbGJhY2siOiAiVGhlIHNreSBpcyBjb21wb3NpbmcgeW91ciBtYW51c2NyaXB0IOKAlCBhIGZldyBtaW51dGVzIG9mIHNpbGVuY2UuIiwKICAgICJ3YWl0Lm1vaXMudGl0bGUiOiAiWW91ciBDZWxlc3RpYWwgbW9udGggbWFudXNjcmlwdCBpcyBiZWluZyB3cml0dGVuIiwKICAgICJ3YWl0Lm1vaXMuaGludCI6ICJZb3VyIG5hdGFsIGNoYXJ0IMK3IHRoaXMgbW9udGjigJlzIGNsaW1hdGUgwrcgYmluZGluZyB0aGUgY2hhcHRlcnMuIERvIG5vdCBjbG9zZSB0aGlzIHBhZ2UuIiwKICAgICJ3YWl0Lm1vaXMuZmFsbGJhY2siOiAiVGhlIHNreSBpcyBjb21wb3NpbmcgeW91ciBtb250aCBtYW51c2NyaXB04oCmIEEgZmV3IG1pbnV0ZXMuIiwKICAgICJ3YWl0LmpvdXIudGl0bGUiOiAiWW91ciBDZWxlc3RpYWwgZGF5IG1hbnVzY3JpcHQgaXMgYmVpbmcgd3JpdHRlbiIsCiAgICAid2FpdC5qb3VyLmhpbnQiOiAiWW91ciBjaGFydCDCtyB0b2RheeKAmXMgZW5lcmd5IMK3IG9uZSBkb29yIHRvIG9wZW4uIERvIG5vdCBjbG9zZSB0aGlzIHBhZ2UuIiwKICAgICJ3YWl0LmpvdXIuZmFsbGJhY2siOiAiVGhlIHNreSBpcyBjb21wb3NpbmcgeW91ciBkYXkgbWFudXNjcmlwdOKApiIsCiAgICAid2FpdC5jb3VwbGUudGl0bGUiOiAiWW91ciBDZWxlc3RpYWwgY291cGxlIG1hbnVzY3JpcHQgaXMgYmVpbmcgd3JpdHRlbiIsCiAgICAid2FpdC5jb3VwbGUuaGludCI6ICJUd28gY2hhcnRzIMK3IHN5bmFzdHJ5IMK3IGFzc2VtYmx5LiBEbyBub3QgY2xvc2UgdGhpcyBwYWdlLiIsCiAgICAid2FpdC5jb3VwbGUuZmFsbGJhY2siOiAiVGhlIHNreSBpcyBjb21wb3NpbmcgeW91ciBjb3VwbGUgbWFudXNjcmlwdOKApiIsCiAgICAid2FpdC51bHRpbWUudGl0bGUiOiAiVGhlIFVsdGltYXRlIE1hbnVzY3JpcHQgaXMgYmVpbmcgd3JpdHRlbiIsCiAgICAid2FpdC51bHRpbWUuaGludCI6ICJMb25nIGVkaXRpb24gwrcgY2VsZXN0aWFsIHBhdGllbmNlLiBEbyBub3QgY2xvc2UgdGhpcyBwYWdlLiIsCiAgICAid2FpdC51bHRpbWUuZmFsbGJhY2siOiAiVGhlIHNreSBpcyBjb21wb3NpbmcgeW91ciBVbHRpbWF0ZSBNYW51c2NyaXB04oCmIiwKICAgICJwcm9nLmlhIjogIlRyYW5zbGF0aW5nIHRoZSBsYW5ndWFnZSBvZiB0aGUgdW5pdmVyc2Ug4oCUIGFzc2VtYmxpbmcgdGhlIGNoYXB0ZXJzIG9mIHlvdXIgbGlmZeKApiIsCiAgICAicHJvZy5oZCI6ICJSZWFkaW5nIHlvdXIgbGlmZSBjb2Rl4oCmIiwKICAgICJwcm9nLnR6IjogIkFuY2hvcmluZyBpbiB0aW1lIGFuZCBzcGFjZeKApiIsCiAgICAicHJvZy5hc3RybyI6ICJBbGlnbmluZyB0aGUgcGxhbmV0c+KApiIsCiAgICAicHJvZy5odG1sIjogIkFzc2VtYmxpbmcgYW5kIGJpbmRpbmcgdGhlIG1hbnVzY3JpcHTigKYiLAogICAgInByb2cuc3ludGgiOiAiRmluYWwgc2VhbCDigJQgdGhlIG1hbnVzY3JpcHQgdGFrZXMgc2hhcGXigKYiLAogICAgImFjY291bnQucGF1c2Vfc3RhdGUiOiAiUGF1c2VkIOKAlCBGcmVlIGFjY2VzcyAoNSBkYXkgbWFudXNjcmlwdHMgLyBtb250aCwgMSBtb250aCBtYW51c2NyaXB0IC8geWVhcikiLAogICAgImFjY291bnQuYWN0aXZlIjogIkFjdGl2ZSIsCiAgICAiYWNjb3VudC5pbmFjdGl2ZSI6ICJJbmFjdGl2ZSIsCiAgICAiYWNjb3VudC5ub19zdWIiOiAiTm8gc3Vic2NyaXB0aW9uIiwKICAgICJhY2NvdW50LnByaWNlX21vIjogIuKCrHtufSAvIG1vbnRoIiwKICAgICJhY2NvdW50LmlhX29rIjogIkF2YWlsYWJsZSIsCiAgICAiYWNjb3VudC5pYV9wYXVzZSI6ICJQYXVzZWQg4oCUIHJlb3BlbnMgd2l0aCBEaXZpbiIsCiAgICAiYWNjb3VudC5pYV9sb2NrIjogIlJlc2VydmVkIGZvciBEaXZpbiIsCiAgICAiYWNjb3VudC51bHRpbWVfcHJvZyI6ICJVbHRpbWF0ZSBwcm9ncmVzcyIsCiAgICAiYWNjb3VudC51bHRpbWVfbGluZSI6ICJ7bn0gLyA2IG1vbnRocyBwYWlkIiwKICAgICJhY2NvdW50LnVsdGltZV9rZXB0IjogIiAoa2VwdCkiLAogICAgImFjY291bnQuYmlydGhfc2t5IjogIkJpcnRoIHNreSIsCiAgICAiYWNjb3VudC5tc19yZWFkeSI6ICIgwrcgbWFudXNjcmlwdCByZWFkeSIsCiAgICAiYWNjb3VudC5lZGl0c19sZWZ0IjogIllvdSBoYXZlIHtufSBlZGl0e3N9IGxlZnQuIiwKICAgICJhY2NvdW50LmVkaXRzX2RvbmUiOiAiWW91IGhhdmUgdXNlZCB5b3VyIDMgZWRpdHMuIEZvciBhbnkgY29ycmVjdGlvbiwgY29udGFjdCBzdXBwb3J0LiIsCiAgICAiYWNjb3VudC5lZGl0IjogIkVkaXQiLAogICAgImFjY291bnQudmlldyI6ICJWaWV3IiwKICAgICJhY2NvdW50LmJpcnRoX2VtcHR5IjogIk5vdCBmaWxsZWQgaW4geWV0LiIsCiAgICAiYWNjb3VudC5maWxsX2JpcnRoIjogIkVudGVyIG15IGJpcnRoIHNreSIsCiAgICAiYWNjb3VudC5tYW5hZ2UiOiAiTWFuYWdlIG15IHN1YnNjcmlwdGlvbiIsCiAgICAiYWNjb3VudC5tYW5hZ2VfaGludCI6ICJUbyBjaGFuZ2UgcGxhbnMsIGZpcnN0IHN0b3AgeW91ciBjdXJyZW50IHN1YnNjcmlwdGlvbiwgdGhlbiBzdWJzY3JpYmUgYWdhaW4gdG8gdGhlIG9uZSB5b3Ugd2FudC4iLAogICAgImFjY291bnQuc3VwcG9ydCI6ICJGb3IgaGVscDogY29udGFjdEBmb3JtYXRpb25zLXNwaXJpdHVhbGl0ZS1lbmVyZ2V0aXF1ZS5jb20iLAogICAgImFjY291bnQucmVzdW1lX21hbmFnZSI6ICJSZXN1bWUgLyBtYW5hZ2UgbXkgc3Vic2NyaXB0aW9uIiwKICAgICJhY2NvdW50LmJhY2tfY2VsZXN0ZSI6ICJCYWNrIHRvIEPDqWxlc3RlIMK3IOKCrDU5IiwKICAgICJhY2NvdW50LnRvX2RpdmluIjogIkdvIERpdmluIMK3IOKCrDEzNyIsCiAgICAiYWNjb3VudC50b19jZWxlc3RlIjogIkdvIEPDqWxlc3RlIMK3IOKCrDU5IiwKICAgICJhY2NvdW50LmRvd25ncmFkZV9jZWxlc3RlIjogIlJldHVybiB0byBDw6lsZXN0ZSDCtyDigqw1OSIsCiAgICAiYWNjb3VudC5tYW5hZ2Vfc3RvcCI6ICJNYW5hZ2UgLyBzdG9wIHN1YnNjcmlwdGlvbiIsCiAgICAiYWNjb3VudC5kbF9sYWJlbCI6ICJEb3dubG9hZCDCtyBEaXZpbiIsCiAgICAiYWNjb3VudC5kbF9oaW50IjogIkRvd25sb2FkIGFsbCB5b3VyIHJlYWR5IG1hbnVzY3JpcHRzIChuYXRhbCwgbW9udGgsIGRheSwgY291cGxl4oCmKSBhcyBvbmUgWklQLiIsCiAgICAiYWNjb3VudC5kbF9idG4iOiAiRG93bmxvYWQgYWxsIG15IG1hbnVzY3JpcHRzIiwKICAgICJhY2NvdW50LmRsX3VubG9jayI6ICJVbmxvY2tzIGluIHtufSBtb250aHMiLAogICAgImFjY291bnQuZGxfcHJvZ3Jlc3MiOiAiRGl2aW4tb25seSBvcHRpb24sIGFmdGVyIHtuZWVkfSBtb250aHMgc3Vic2NyaWJlZC4gUHJvZ3Jlc3M6IDxiPntoYXZlfSAvIHtuZWVkfTwvYj4uIgogIH0sCiAgImVzIjogewogICAgImJyYW5kLm5hbWUiOiAiTG9zIE1hbnVzY3JpdG9zIENlbGVzdGVzIiwKICAgICJicmFuZC5uYW1lX2h0bWwiOiAiTG9zIE1hbnVzY3JpdG9zPGJyPjxzcGFuPkNlbGVzdGVzPC9zcGFuPiIsCiAgICAiYnJhbmQuYWNjb3VudF9hcmlhIjogIkN1ZW50YSIsCiAgICAibG9naW4uZW1haWxfcGgiOiAidHVAZW1haWwuY29tIiwKICAgICJlcnIudW5yZWFjaGFibGUiOiAiTG9zIE1hbnVzY3JpdG9zIENlbGVzdGVzIG5vIGVzdMOhbiBkaXNwb25pYmxlcy4gSW50w6ludGFsbyBlbiB1biBtb21lbnRvLiIsCiAgICAiaW5zdGFsbC50aXRsZV9odG1sIjogIkVuIHR1PGJyPjxzcGFuPnBhbnRhbGxhIGRlIGluaWNpbzwvc3Bhbj4iLAogICAgImluc3RhbGwubGVkZSI6ICJDb21vIHVuYSBhcHAsIHNpbiBsYSBBcHAgU3RvcmUuIiwKICAgICJpbnN0YWxsLnN0ZXBzX2lvcyI6ICJFbiBpUGhvbmU6IHB1bHNhIDxiPkNvbXBhcnRpcjwvYj4geSBsdWVnbyA8Yj5FbiBwYW50YWxsYSBkZSBpbmljaW88L2I+LiIsCiAgICAiaW5zdGFsbC5zdGVwc19hbmRyb2lkIjogIkVuIEFuZHJvaWQ6IGVsIGJvdMOzbiBkZSBhYmFqbywgbyBtZW7DuiBDaHJvbWUg4oaSIDxiPkHDsWFkaXIgYSBwYW50YWxsYSBkZSBpbmljaW88L2I+LiIsCiAgICAiaW5zdGFsbC5hZGQiOiAiQcOxYWRpciBhIGxhIHBhbnRhbGxhIiwKICAgICJpbnN0YWxsLnNraXAiOiAiQ29udGludWFyIHNpbiBpbnN0YWxhciIsCiAgICAib25ib2FyZC50aXRsZV9odG1sIjogIlR1IGNpZWxvPGJyPjxzcGFuPmRlIG5hY2ltaWVudG88L3NwYW4+IiwKICAgICJvbmJvYXJkLmxlZGVfbmV3IjogIlJlZ2lzdHJhZG8gY29tbyB7ZW1haWx9IOKAlCBwYXJhIG5hdGFsLCBkw61hIHkgbWVzLiBQb2Ryw6FzIGNvcnJlZ2lyIGhhc3RhIDMgdmVjZXMgc2kgaGF5IGVycm9yLiIsCiAgICAib25ib2FyZC5sZWRlX3JlYWRvbmx5IjogIkhhcyB1c2FkbyB0dXMgMyBtb2RpZmljYWNpb25lcy4gUGFyYSBvdHJhIGNvcnJlY2Npw7NuLCBjb250YWN0YSBjb24gc29wb3J0ZS4iLAogICAgIm9uYm9hcmQubGVkZV9lZGl0IjogIkNvcnJpZ2UgdW4gZXJyb3Igc2kgaGFjZSBmYWx0YS4gVGUgcXVlZGFuIHtufSBtb2RpZmljYWNpw7Nue2VzfS4iLAogICAgIm9uYm9hcmQubmF0YWxfbm90ZSI6ICJUdSBtYW51c2NyaXRvIG5hdGFsIHlhIGVzdMOhIGdlbmVyYWRvOiBjYW1iaWFyIGVzdG9zIGRhdG9zIG5vIGxvIHJlZ2VuZXJhIGF1dG9tw6F0aWNhbWVudGUuIiwKICAgICJvbmJvYXJkLmVkaXRzX25vbmUiOiAiWWEgbm8gaGF5IG1vZGlmaWNhY2lvbmVzIHBvc2libGVzLiIsCiAgICAib25ib2FyZC5lZGl0c19sZWZ0IjogIlRlIHF1ZWRhbiB7bn0gbW9kaWZpY2FjacOzbntlc30uIiwKICAgICJvbmJvYXJkLnNhdmVfZWRpdCI6ICJHdWFyZGFyIGNhbWJpb3MiLAogICAgIm9uYm9hcmQuc2F2ZV9uZXciOiAiR3VhcmRhciBtaSBwZXJmaWwiLAogICAgIm9uYm9hcmQubm9fbW9yZSI6ICJObyBoYXkgbcOhcyBtb2RpZmljYWNpb25lcyIsCiAgICAib25ib2FyZC5iYWNrIjogIlZvbHZlciIsCiAgICAib25ib2FyZC5sYXRlciI6ICJNw6FzIHRhcmRlIiwKICAgICJvbmJvYXJkLmJpcnRoX2RhdGUiOiAiRmVjaGEgZGUgbmFjaW1pZW50byIsCiAgICAib25ib2FyZC5iaXJ0aF90aW1lIjogIkhvcmEgZGUgbmFjaW1pZW50byIsCiAgICAib25ib2FyZC5iaXJ0aF9wbGFjZSI6ICJMdWdhciBkZSBuYWNpbWllbnRvIiwKICAgICJvbmJvYXJkLnBsYWNlX3BoIjogIkVzY3JpYmUgdW5hIGNpdWRhZOKApiAoZWouOiBMeW9uKSIsCiAgICAib25ib2FyZC5nZW5kZXIiOiAiR8OpbmVybyIsCiAgICAiZ2VuZGVyLmZlbW1lIjogIk11amVyIiwKICAgICJnZW5kZXIuaG9tbWUiOiAiSG9tYnJlIiwKICAgICJnZW5kZXIuYXV0cmUiOiAiT3RybyIsCiAgICAid2VsY29tZS5iYWNrIjogIkJpZW52ZW5pZG8vYSBkZSBudWV2bywge25hbWV9LiIsCiAgICAid2VsY29tZS55b3UiOiAidMO6IiwKICAgICJwbGFuLmZyZWUiOiAiR3JhdGlzIiwKICAgICJwbGFuLnBhdXNlX3N1ZmZpeCI6ICIgwrcgcGF1c2EiLAogICAgInBsYW4ubGFiZWwiOiAiUGxhbiB7bmFtZX0iLAogICAgInBsYW4uY2VsZXN0ZSI6ICJQbGFuIEPDqWxlc3RlIiwKICAgICJwbGFuLmRpdmluIjogIlBsYW4gRGl2aW4iLAogICAgInBsYW4uZGl2aW5fcHJpY2UiOiAiUGxhbiBEaXZpbiDCtyAxMzcg4oKsIiwKICAgICJwbGFuLm9uX2RlbWFuZCI6ICJCYWpvIGRlbWFuZGEiLAogICAgInBsYW4uY2VsZXN0ZV9vcl9kaXZpbiI6ICJDw6lsZXN0ZSBvIERpdmluIiwKICAgICJwbGFuLmxvY2tlZCI6ICJCbG9xdWVhZG8iLAogICAgInBsYW4udW5sb2NrZWQiOiAiRGVzYmxvcXVlYWRvIiwKICAgICJwbGFuLnBhdXNlZCI6ICJFbiBwYXVzYSIsCiAgICAibmF0YWwua2lja2VyIjogIk5hdGFsIiwKICAgICJuYXRhbC5pbnRybyI6ICJMYXMgMjggcMOhZ2luYXMgZGUgdHUgY2FydGEg4oCUIHNpZW1wcmUgYWNjZXNpYmxlcyBtaWVudHJhcyB0dSBzdXNjcmlwY2nDs24gZXN0w6kgYWN0aXZhLiIsCiAgICAibmF0YWwudGl0bGUiOiAiRWwgTWFudXNjcml0byBDZWxlc3RlIiwKICAgICJuYXRhbC5vZl9saWZlIjogImRlIHR1IHZpZGEiLAogICAgIm5hdGFsLnRpdGxlX3BsYWluIjogIkVsIE1hbnVzY3JpdG8gQ2VsZXN0ZSBkZSB0dSB2aWRhIiwKICAgICJuYXRhbC5hc2siOiAiT0JURU5FUiBFTCBNQU5VU0NSSVRPIERFIE1JIFZJREEiLAogICAgIm5hdGFsLnJlYWQiOiAiVkVSIEVMIE1BTlVTQ1JJVE8gQ0VMRVNURSBERSBNSSBWSURBIiwKICAgICJuYXRhbC5wYWdlc19wcmljZSI6ICIyOCBww6FnaW5hcyDCtyA1OSDigqwgLyBtZXMiLAogICAgIm5hdGFsLmxvY2tfcGF1c2VkIjogIlN1c2NyaXBjacOzbiBlbiBwYXVzYTogZWwgbmF0YWwgc2UgcmVhYnJlIGN1YW5kbyByZWFudWRlcy4iLAogICAgIm5hdGFsLmxvY2tfbmVlZCI6ICJUdSBtYW51c2NyaXRvIGRlIHZpZGEgc2UgYWJyZSBjb24gbGEgc3VzY3JpcGNpw7NuIEPDqWxlc3RlLiIsCiAgICAibmF0YWwubmVlZF9wcm9maWxlIjogIkluZGljYSB0dSBjaWVsbyBkZSBuYWNpbWllbnRvIHBhcmEgcXVlIHNlIGVzY3JpYmEgdHUgbWFudXNjcml0by4iLAogICAgIm5hdGFsLmZpbGxfcHJvZmlsZSI6ICJJbmRpY2FyIG1pIGNpZWxvIGRlIG5hY2ltaWVudG8iLAogICAgIm5hdGFsLmVycl9nZW5lcmljIjogIkxhIGdlbmVyYWNpw7NuIG5vIGhhIHBvZGlkbyBjb21wbGV0YXJzZS4gSW50w6ludGFsbyBlbiB1biBtb21lbnRvLiIsCiAgICAibmF0YWwuZXJyX3NvZnQiOiAiTGEgZ2VuZXJhY2nDs24gbm8gaGEgcG9kaWRvIGNvbXBsZXRhcnNlLiBJbnTDqW50YWxvIOKAlCB0dSBib3TDs24gwqsgT0JURU5FUiBFTCBNQU5VU0NSSVRPIERFIE1JIFZJREEgwrsgc2lndWUgZGlzcG9uaWJsZS4iLAogICAgIm5hdGFsLnJlYWR5IjogIlBlcmZpbCBndWFyZGFkbyDCtyB0dSBtYW51c2NyaXRvIGVzdMOhIGxpc3RvLiIsCiAgICAibmF0YWwud2FpdGluZyI6ICJQZXJmaWwgZ3VhcmRhZG8gwrcgYSBsYSBlc3BlcmEgZGUgdHUgcGV0aWNpw7NuLiIsCiAgICAibmF0YWwucmVhZGVyX2ludHJvIjogIkFxdcOtIGVzdMOhIHR1IE1hbnVzY3JpdG8gQ2VsZXN0ZSBkZSB0dSB2aWRhLiBTb2xvIGxlY3R1cmEgZW4gbGEgYXBwLCBtaWVudHJhcyB0dSBzdXNjcmlwY2nDs24gZXN0w6kgYWN0aXZhLiIsCiAgICAibmF0YWwudW5hdmFpbGFibGUiOiAiTWFudXNjcml0byBubyBkaXNwb25pYmxlLiBWdWVsdmUgYWwgaW5pY2lvIHkgcHVsc2EgT0JURU5FUiBFTCBNQU5VU0NSSVRPIERFIE1JIFZJREEuIiwKICAgICJuYXRhbC5mcmFtZV90aXRsZSI6ICJNYW51c2NyaXRvIG5hdGFsIiwKICAgICJ1bHRpbWUudGl0bGUiOiAiRWwgTWFudXNjcml0byBDZWxlc3RlIMOabHRpbW8iLAogICAgInVsdGltZS50aXRsZV9wbGFpbiI6ICJFbCBNYW51c2NyaXRvIENlbGVzdGUgw5psdGltbyBkZSB0dSB2aWRhIiwKICAgICJ1bHRpbWUuYXNrIjogIlBlZGlyIGVsIMOabHRpbW8iLAogICAgInVsdGltZS5yZWFkIjogIlZFUiBFTCBNQU5VU0NSSVRPIMOaTFRJTU8iLAogICAgInVsdGltZS5kaXZpbl9ub3ciOiAiSW5jbHVpZG8gZGUgaW5tZWRpYXRvIGVuIERpdmluLiIsCiAgICAidWx0aW1lLnNpeF9tb250aHMiOiAiU2VpcyBtZXNlcyBwYWdhZG9zLCBpbmNsdXNvIGNvbiBwYXVzYXMuIiwKICAgICJ1bHRpbWUub25jZSI6ICIgRXNjcml0byB1bmEgc29sYSB2ZXosIGEgdHUgcGV0aWNpw7NuLiIsCiAgICAidWx0aW1lLmxvY2tfaW50cm8iOiAiVHJhcyA2IG1lc2VzIEPDqWxlc3RlLCBvIGRlIGlubWVkaWF0byBlbiBEaXZpbi4iLAogICAgInVsdGltZS5wYXVzZV9yZW9wZW4iOiAiRWwgw5psdGltbyBzZSByZWFicmUgY3VhbmRvIHJlYW51ZGVzIGxhIHN1c2NyaXBjacOzbi4iLAogICAgInVsdGltZS5tb250aHNfa2VwdCI6ICIgVHVzIDxiPntufSBtZXNlczwvYj4gc2lndWVuIGNvbnRhbmRvLiIsCiAgICAidWx0aW1lLmxvY2tfcHJvZ3Jlc3MiOiAiVGllbmVzIDxiPntoYXZlfSBtZXNlczwvYj4geWEgcGFnYWRvcy4gUXVlZGFuIDxiPntsZWZ0fTwvYj4g4oCUIHVuYSBwYXVzYSBubyByb21wZSBsYSBzZXJpZS4iLAogICAgInVsdGltZS5wYWdlc19sb2NrZWQiOiAie259IHDDoWdpbmFzIMK3IDYgbWVzZXMgcGFnYWRvcywgYWN1bXVsYWRvcyIsCiAgICAidWx0aW1lLnBhZ2VzX3VubG9ja2VkIjogIntufSBww6FnaW5hcyDCtyB5YSBkZXNibG9xdWVhZG8iLAogICAgInVsdGltZS5wYWdlc19wbGFpbiI6ICJ7bn0gcMOhZ2luYXMiLAogICAgInVsdGltZS5uZWVkX3Byb2ZpbGUiOiAiSW5kaWNhIHR1IGNpZWxvIGRlIG5hY2ltaWVudG8gcGFyYSBxdWUgc2UgZXNjcmliYSBlbCDDmmx0aW1vLiIsCiAgICAidWx0aW1lLmVycl9nZW5lcmljIjogIkxhIGdlbmVyYWNpw7NuIGRlbCDDmmx0aW1vIG5vIGhhIHBvZGlkbyBjb21wbGV0YXJzZS4gSW50w6ludGFsby4iLAogICAgInVsdGltZS5lcnJfc29mdCI6ICJMYSBnZW5lcmFjacOzbiBubyBoYSBwb2RpZG8gY29tcGxldGFyc2UuIEludMOpbnRhbG8g4oCUIHR1IGJvdMOzbiDCqyBQZWRpciBlbCDDmmx0aW1vIMK7IHNpZ3VlIGRpc3BvbmlibGUuIiwKICAgICJ1bHRpbWUucmVhZHkiOiAiVHUgTWFudXNjcml0byDDmmx0aW1vIGVzdMOhIGxpc3RvLiIsCiAgICAidWx0aW1lLndhaXRpbmciOiAiRGVzYmxvcXVlYWRvIMK3IGEgbGEgZXNwZXJhIGRlIHR1IHBldGljacOzbi4iLAogICAgInVsdGltZS5raWNrZXIiOiAiRWRpY2nDs24gw5psdGltYSIsCiAgICAidWx0aW1lLnJlYWRlcl9kaXZpbiI6ICJBcXXDrSBlc3TDoSB0dSBNYW51c2NyaXRvIENlbGVzdGUgw5psdGltbywgaW5jbHVpZG8gZW4gRGl2aW4uIExlY3R1cmEgZW4gbGEgYXBwIG1pZW50cmFzIHR1IHN1c2NyaXBjacOzbiBlc3TDqSBhY3RpdmEuIiwKICAgICJ1bHRpbWUucmVhZGVyX3BhaWQiOiAiQXF1w60gZXN0w6EgdHUgTWFudXNjcml0byBDZWxlc3RlIMOabHRpbW8sIGRlc2Jsb3F1ZWFkbyB0cmFzIDYgbWVzZXMgcGFnYWRvcy4gTGVjdHVyYSBlbiBsYSBhcHAgbWllbnRyYXMgdHUgc3VzY3JpcGNpw7NuIGVzdMOpIGFjdGl2YS4iLAogICAgInVsdGltZS51bmF2YWlsYWJsZSI6ICJNYW51c2NyaXRvIMOabHRpbW8gbm8gZGlzcG9uaWJsZS4gVnVlbHZlIGFsIGluaWNpbyB5IHB1bHNhIMKrIFBlZGlyIGVsIMOabHRpbW8gwrsuIiwKICAgICJ1bHRpbWUuZnJhbWVfdGl0bGUiOiAiTWFudXNjcml0byDDmmx0aW1vIiwKICAgICJtb2lzLmxhYmVsIjogIkVzdGUgbWVzIiwKICAgICJtb2lzLmludHJvIjogIkRpc3BvbmlibGUgdG9kbyBlbCBtZXMuIFR1IE1hbnVzY3JpdG8gQ2VsZXN0ZSBkZWwgbWVzIGVuIGN1cnNvLiBDw7NtbyBoYWJsYW4gdHVzIGVzdHJlbGxhcyBlc3RlIG1lcyIsCiAgICAibW9pcy50aXRsZV9odG1sIjogIk1hbnVzY3JpdG8gQ2VsZXN0ZSA8c3BhbiBjbGFzcz1cImRlLWNlLW1vaXNcIj5ERSBFU1RFIE1FUyBERSB7bW9udGh9PC9zcGFuPiIsCiAgICAibW9pcy50aXRsZV9wbGFpbiI6ICJNYW51c2NyaXRvIENlbGVzdGUgREUgRVNURSBNRVMgREUge21vbnRofSIsCiAgICAibW9pcy5hc2siOiAiUGVkaXIgZWwgbWFudXNjcml0byBkZWwgbWVzIiwKICAgICJtb2lzLnJlYWQiOiAiUmVsZWVyIGVsIG1hbnVzY3JpdG8gZGVsIG1lcyIsCiAgICAibW9pcy5xdW90YSI6ICIgwrcge3VzZWR9IC8gMSBlc3RlIGHDsW8gKEdyYXRpcykiLAogICAgIm1vaXMucmVhZGVyX2ludHJvIjogIkFxdcOtIGVzdMOhIHR1IE1hbnVzY3JpdG8gQ2VsZXN0ZSBkZWwgbWVzLiBTb2xvIGxlY3R1cmEgZW4gbGEgYXBwLCBtaWVudHJhcyB0dSBzdXNjcmlwY2nDs24gZXN0w6kgYWN0aXZhLiIsCiAgICAibW9pcy5mcmFtZV90aXRsZSI6ICJNYW51c2NyaXRvIGRlbCBtZXMiLAogICAgImpvdXIubGFiZWwiOiAiSG95IiwKICAgICJqb3VyLmludHJvIjogIlR1IE1hbnVzY3JpdG8gQ2VsZXN0ZSBkZSBlc3RlIGTDrWEuIEPDs21vIGhhYmxhbiB0dXMgZXN0cmVsbGFzIEhPWSIsCiAgICAiam91ci50aXRsZSI6ICJNYW51c2NyaXRvIENlbGVzdGUgZGVsIHtkYXRlfSIsCiAgICAiam91ci5hc2siOiAiT0JURU5FUiBFTCBNQU5VU0NSSVRPIERFTCBEw41BIiwKICAgICJqb3VyLnJlYWQiOiAiUmVsZWVyIGVsIG1hbnVzY3JpdG8gZGVsIGTDrWEiLAogICAgImpvdXIucXVvdGEiOiAiIMK3IHt1c2VkfSAvIDUgZXN0ZSBtZXMgKEdyYXRpcykiLAogICAgImpvdXIucmVhZGVyX2ludHJvIjogIkFxdcOtIGVzdMOhIHR1IE1hbnVzY3JpdG8gQ2VsZXN0ZSBkZWwgZMOtYS4gU29sbyBsZWN0dXJhIGVuIGxhIGFwcCwgbWllbnRyYXMgdHUgc3VzY3JpcGNpw7NuIGVzdMOpIGFjdGl2YS4iLAogICAgImpvdXIuZnJhbWVfdGl0bGUiOiAiTWFudXNjcml0byBkZWwgZMOtYSIsCiAgICAicGVyaW9kLnVuYXZhaWxhYmxlIjogIk1hbnVzY3JpdG8gbm8gZGlzcG9uaWJsZS4gVnVlbHZlIGEgbGEgcGVzdGHDsWEgeSBww61kZWxvIGRlIG51ZXZvLiIsCiAgICAicGVyaW9kLmVycl9pbnRlcnJ1cHQiOiAiR2VuZXJhY2nDs24gaW50ZXJydW1waWRhLiBJbnTDqW50YWxvLiIsCiAgICAiY291cGxlLmtpY2tlciI6ICJTaW5hc3Ryw61hIiwKICAgICJjb3VwbGUubGVkZV9sb2NrIjogIlNpbmFzdHLDrWEgZGUgZG9zIiwKICAgICJjb3VwbGUudGl0bGVfaHRtbCI6ICJNYW51c2NyaXRvIENlbGVzdGUgPHNwYW4gY2xhc3M9XCJkZS10YS12aWVcIj5QYXJlamE8L3NwYW4+IiwKICAgICJjb3VwbGUudGl0bGVfcGxhaW4iOiAiTWFudXNjcml0byBDZWxlc3RlIFBhcmVqYSIsCiAgICAiY291cGxlLnRpdGxlX3Nob3J0IjogIk1hbnVzY3JpdG8gZGUgcGFyZWphIiwKICAgICJjb3VwbGUuaW50cm8iOiAiU2luYXN0csOtYSBIdW1hbiBEZXNpZ24gw5cgQXN0cm9sb2fDrWEgcGFyYSBsb3MgZG9zIOKAlCB1biBtYW51c2NyaXRvIGRlIHBhcmVqYSBwb3IgbWVzIGNpdmlsLCBzb2xvIHBsYW4gRGl2aW4uIiwKICAgICJjb3VwbGUuYXNrIjogIlBlZGlyIGVsIG1hbnVzY3JpdG8gZGUgcGFyZWphIiwKICAgICJjb3VwbGUucmVhZCI6ICJSZWxlZXIgZWwgbWFudXNjcml0byBkZSBwYXJlamEiLAogICAgImNvdXBsZS5xdW90YSI6ICJ7bn0gLyAxIGVzdGUgbWVzIiwKICAgICJjb3VwbGUubG9ja19wYXVzZWQiOiAiU3VzY3JpcGNpw7NuIGVuIHBhdXNhOiBlbCBtYW51c2NyaXRvIGRlIHBhcmVqYSBzZSByZWFicmUgY3VhbmRvIHJlYW51ZGVzIERpdmluLiIsCiAgICAiY291cGxlLmxvY2tfbmVlZCI6ICJSZXNlcnZhZG8gYWwgcGxhbiBEaXZpbiDigJQgZG9zIGNpZWxvcyBjcnV6YWRvcywgdW5hIHZleiBwb3IgbWVzIGNpdmlsLiIsCiAgICAiY291cGxlLmRpc2NvdmVyIjogIkRlc2N1YnJpciBEaXZpbiIsCiAgICAiY291cGxlLndpdGgiOiAiQ29uIHtuYW1lfSIsCiAgICAiY291cGxlLmVkaXQiOiAiRWRpdGFyIiwKICAgICJjb3VwbGUuZXJyX2dlbmVyaWMiOiAiTGEgZ2VuZXJhY2nDs24gbm8gaGEgcG9kaWRvIGNvbXBsZXRhcnNlLiIsCiAgICAiY291cGxlLnJlYWRlcl9pbnRybyI6ICJBcXXDrSBlc3TDoSB2dWVzdHJvIE1hbnVzY3JpdG8gQ2VsZXN0ZSBkZSBwYXJlamEuIFNvbG8gbGVjdHVyYSBlbiBsYSBhcHAsIG1pZW50cmFzIHR1IHN1c2NyaXBjacOzbiBEaXZpbiBlc3TDqSBhY3RpdmEuIiwKICAgICJjb3VwbGUudW5hdmFpbGFibGUiOiAiTWFudXNjcml0byBkZSBwYXJlamEgbm8gZGlzcG9uaWJsZS4gVnVlbHZlIGEgbGEgcGVzdGHDsWEgUGFyZWphLiIsCiAgICAiY291cGxlLmZyYW1lX3RpdGxlIjogIk1hbnVzY3JpdG8gcGFyZWphIiwKICAgICJjb3VwbGUubm90X3JlYWR5IjogIlR1IG1hbnVzY3JpdG8gZGUgcGFyZWphIGHDum4gbm8gZXN0w6EgZGlzcG9uaWJsZS4iLAogICAgImNvdXBsZS5taXNzaW5nX2xpbmsiOiAiRmFsdGEgZWwgZW5sYWNlIGRlbCBtYW51c2NyaXRvLiBWdWVsdmUgYSBpbmljaWFyIHNlc2nDs24gZSBpbnTDqW50YWxvLiIsCiAgICAiY291cGxlLmZpbGVfbWlzc2luZyI6ICJBcmNoaXZvIGRlIHBhcmVqYSBubyBlbmNvbnRyYWRvLiBQdWxzYSBvdHJhIHZleiDCqyBQZWRpciBlbCBtYW51c2NyaXRvIGRlIHBhcmVqYSDCuy4iLAogICAgInBhcnRuZXIubGFiZWwiOiAiUGFyZWphIiwKICAgICJwYXJ0bmVyLnRpdGxlIjogIkNpZWxvIGRlIG5hY2ltaWVudG8gZGUgbGEgcGFyZWphIiwKICAgICJwYXJ0bmVyLmhpbnQiOiAiTm9tYnJlLCBmZWNoYSwgaG9yYSwgbHVnYXIgeSBnw6luZXJvIOKAlCBjb21vIGVuIHR1IHBlcmZpbC4gIiwKICAgICJwYXJ0bmVyLm5vX2VkaXRzIjogIllhIG5vIGhheSBtb2RpZmljYWNpb25lcy4iLAogICAgInBhcnRuZXIuZWRpdHNfbGVmdCI6ICJUZSBxdWVkYW4ge259IGNvcnJlY2Npw7Nue2VzfS4iLAogICAgInBhcnRuZXIuZWRpdHNfaW50cm8iOiAiUG9kcsOhcyBjb3JyZWdpciBoYXN0YSAzIHZlY2VzLiIsCiAgICAicGFydG5lci5wcmVub20iOiAiTm9tYnJlIiwKICAgICJwYXJ0bmVyLnBsYWNlX3BoIjogIkVzY3JpYmUgdW5hIGNpdWRhZOKApiIsCiAgICAicGFydG5lci5zYXZlIjogIkd1YXJkYXIgcGFyZWphIiwKICAgICJwYXJ0bmVyLmJhY2siOiAiVm9sdmVyIiwKICAgICJwYXVzZS5sYWJlbCI6ICJTdXNjcmlwY2nDs24gZW4gcGF1c2EiLAogICAgInBhdXNlLnRpdGxlIjogIkVzcGFjaW8gZW4gcGF1c2EiLAogICAgInBhdXNlLmJvZHkiOiAiVHUgYWJvIHtwbGFufSBlc3TDoSBlbiBwYXVzYS4gQ29uc2VydmFzIGVsIGFjY2VzbyBHcmF0aXM6IDEgbWFudXNjcml0byBkZWwgbWVzICsgNSBkZWwgZMOtYS4gTmF0YWwsIMOabHRpbW8gZSBJQSBDw6lsZXN0ZSBzZSByZWFicmVuIGN1YW5kbyByZWFudWRlcy4iLAogICAgInBhdXNlLnVsdGltZV9ub3RlIjogIk1lc2VzIMOabHRpbW8gY29uc2VydmFkb3M6IHtufSAvIDYuIiwKICAgICJwYXVzZS5yZXN1bWUiOiAiUmVhbnVkYXIgbWkgc3VzY3JpcGNpw7NuIiwKICAgICJwYXVzZS5yZWZyZXNoIjogIllhIHJlYW51ZMOpLCBhY3R1YWxpemFyIiwKICAgICJmcmVlLmJhbm5lcl9mdWxsIjogIkFjY2VzbyBncmF0aXM6IHttfSB7bXd9IGRlbCBtZXMgKyB7ZH0ge2R3fSBkZWwgZMOtYSBvZnJlY2lkb3MuIiwKICAgICJmcmVlLmJhbm5lcl9sZWZ0IjogIlRlIHF1ZWRhbiB7bX0ge213fSBkZWwgbWVzIHkge2R9IHtkd30gZGVsIGTDrWEuIiwKICAgICJmcmVlLm1zX29uZSI6ICJtYW51c2NyaXRvIiwKICAgICJmcmVlLm1zX21hbnkiOiAibWFudXNjcml0b3MiLAogICAgImlhLnRpdGxlIjogIklBIEPDqWxlc3RlIiwKICAgICJpYS50aXRsZV9tcyI6ICJJQSBDw6lsZXN0ZSDCtyBlc3RlIG1hbnVzY3JpdG8iLAogICAgImlhLmF2YWlsYWJsZSI6ICJEaXNwb25pYmxlIiwKICAgICJpYS5pbmNsdWRlZCI6ICJJbmNsdWlkYSBlbiBEaXZpbiIsCiAgICAiaWEuY2FyZF9vayI6ICJUZSBhY29tcGHDsWEgYmFqbyBjYWRhIG1hbnVzY3JpdG8gbWllbnRyYXMgbGVlcyDigJQgdW5hIHByZXNlbmNpYSBjw6FsaWRhIHBhcmEgYWNsYXJhciBsbyBxdWUgc2llbnRlcy4iLAogICAgImlhLmNhcmRfbG9jayI6ICJNaWVudHJhcyBsZWVzLCB0ZSBlc2N1Y2hhOiDCv2hveSBlbCBhbW9yPyDCv2VsIHRyYWJham8/IMK/ZWwgYnVlbiBtb21lbnRvPyIsCiAgICAiaWEubG9ja19yZWFkZXIiOiAiSGF6IHByZWd1bnRhcyBzb2JyZSBlc3RlIG1hbnVzY3JpdG8gY29uIGVsIHBsYW4gRGl2aW4uIiwKICAgICJpYS5wYXNzX2RpdmluIjogIlBhc2FyIGEgRGl2aW4gwrcgMTM3IOKCrCIsCiAgICAiaWEuZ3VpZGUiOiAiRXN0w6EgYXF1w60gcGFyYSBpbHVtaW5hcnRlLCBzaW4ganV6Z2FyLiIsCiAgICAiaWEuZW1wdHkiOiAiVW5hIHByZWd1bnRhIHNvYnJlIGxvIHF1ZSBsZWVz4oCmIEVqLjogwr9xdcOpIG1lIGRpY2UgZXN0YSBww6FnaW5hIHNvYnJlIGVsIGFtb3I/IiwKICAgICJpYS5xdWVzdGlvbiI6ICJUdSBwcmVndW50YSIsCiAgICAiaWEucGxhY2Vob2xkZXIiOiAiwr9RdcOpIG1lIHJldmVsYSBlc3RlIHBhc2FqZT8iLAogICAgImlhLm1pYyI6ICJEaWN0YXIgdHUgcHJlZ3VudGEiLAogICAgImlhLnNlbmQiOiAiRW52aWFyIiwKICAgICJpYS5idXN5IjogIkPDqWxlc3RlIHJlc3BvbmRlIiwKICAgICJpYS5yZXN0IjogIkVsIGNpZWxvIGRlc2NhbnNhIiwKICAgICJpYS55b3UiOiAiVMO6IiwKICAgICJpYS5yZXBseV9uYW1lIjogIkPDqWxlc3RlIHJlc3BvbmRlIiwKICAgICJpYS5saXN0ZW4iOiAiRXNjdWNoYXIiLAogICAgImlhLnN0b3AiOiAiUGFyYXIiLAogICAgImlhLmxpc3Rlbl9hcmlhIjogIkVzY3VjaGFyIGVzdGUgbWVuc2FqZSIsCiAgICAiaWEuZXJyX2dlbmVyaWMiOiAiRWwgY2llbG8gbm8gcmVzcG9uZGUgcG9yIGFob3JhLiBJbnTDqW50YWxvIGVuIHVuIG1vbWVudG8uIiwKICAgICJpYS5lcnJfNDA0IjogIkN1ZW50YSBubyBlbmNvbnRyYWRhLiBWdWVsdmUgYSBpbmljaWFyIHNlc2nDs24uIiwKICAgICJpYS5hc2tfZGV2ZWxvcCI6ICLCv1B1ZWRlcyBleHBsaWNhcm1lIHkgZGVzYXJyb2xsYXIgZXN0ZSBwYXNhamUgZGUgbWkgbWFudXNjcml0bz9cblxuwqsge3Bhc3NhZ2V9IMK7IiwKICAgICJpYS5taWNfYmxvY2tlZCI6ICJNaWNyw7Nmb25vIGJsb3F1ZWFkby4gQXV0b3JpemEgZWwgbWljcsOzZm9ubyBlbiBlbCBuYXZlZ2Fkb3IgcGFyYSBkaWN0YXIuIiwKICAgICJpYS5taWNfbm9uZSI6ICJObyBzZSBkZXRlY3RhIG1pY3LDs2Zvbm8uIENvbmVjdGEgdW5vIG8gYXV0b3JpemEgZWwgYXVkaW8uIiwKICAgICJpYS5taWNfZmFpbCI6ICJObyBzZSBwdWRvIGluaWNpYXIgZWwgZGljdGFkby4gSW50w6ludGFsbyBlbiB1biBtb21lbnRvLiIsCiAgICAiaWEubWljX3Vuc3VwcG9ydGVkIjogIkRpY3RhZG8gbm8gY29tcGF0aWJsZSBlbiBlc3RlIG5hdmVnYWRvciIsCiAgICAiaWEuc3BlZWNoX3Vuc3VwcG9ydGVkIjogIkVsIGRpY3RhZG8gcG9yIHZveiBubyBlc3TDoSBkaXNwb25pYmxlIGVuIGVzdGUgbmF2ZWdhZG9yLiBFbiBpUGhvbmUgbyBpUGFkLCBTYWZhcmkgYWN0dWFsaXphZG8gcHVlZGUgb2ZyZWNlcmxvOyBzaSBubywgZXNjcmliZSB0dSBwcmVndW50YS4gQ2hyb21lIG8gRWRnZSBlbiBvcmRlbmFkb3IgZnVuY2lvbmFuIG1lam9yLiIsCiAgICAic2VsLmFzayI6ICJQZWRpciBhIGxhIElBIEPDqWxlc3RlIHF1ZSBkZXNhcnJvbGxlIGVzdGUgcGFzYWplIiwKICAgICJyZWFkZXIuYmFjayI6ICLihpAgVm9sdmVyIiwKICAgICJyZWFkZXIuZnNfZW50ZXIiOiAiTWFudXNjcml0byBhIHBhbnRhbGxhIGNvbXBsZXRhIiwKICAgICJyZWFkZXIuZnNfZXhpdCI6ICJTYWxpciBkZSBwYW50YWxsYSBjb21wbGV0YSIsCiAgICAicmVhZGVyLm1zX3RpdGxlIjogIk1hbnVzY3JpdG8iLAogICAgIndhaXQubmF0YWwudGl0bGUiOiAiU2UgZXNjcmliZSBlbCBNYW51c2NyaXRvIENlbGVzdGUgZGUgdHUgdmlkYSIsCiAgICAid2FpdC5uYXRhbC5oaW50IjogIkFsaW5lYWNpw7NuIGRlIHBsYW5ldGFzIMK3IGPDoWxjdWxvcyBkZWwgY8OzZGlnbyBkZSB2aWRhIMK3IGVuc2FtYmxhamUgZGVsIGxlbmd1YWplIGRlbCB1bml2ZXJzby4gTm8gY2llcnJlcyBlc3RhIHDDoWdpbmEuIiwKICAgICJ3YWl0Lm5hdGFsLmZhbGxiYWNrIjogIkVsIGNpZWxvIGNvbXBvbmUgdHUgbWFudXNjcml0byDigJQgdW5vcyBtaW51dG9zIGRlIHNpbGVuY2lvLiIsCiAgICAid2FpdC5tb2lzLnRpdGxlIjogIlNlIGVzY3JpYmUgZWwgTWFudXNjcml0byBDZWxlc3RlIGRlbCBtZXMiLAogICAgIndhaXQubW9pcy5oaW50IjogIlR1IHRlbWEgbmF0YWwgwrcgZWwgY2xpbWEgZGVsIG1lcyDCtyBlbmN1YWRlcm5hY2nDs24gZGUgY2Fww610dWxvcy4gTm8gY2llcnJlcyBlc3RhIHDDoWdpbmEuIiwKICAgICJ3YWl0Lm1vaXMuZmFsbGJhY2siOiAiRWwgY2llbG8gY29tcG9uZSB0dSBNYW51c2NyaXRvIGRlbCBtZXPigKYgVW5vcyBtaW51dG9zLiIsCiAgICAid2FpdC5qb3VyLnRpdGxlIjogIlNlIGVzY3JpYmUgZWwgTWFudXNjcml0byBDZWxlc3RlIGRlbCBkw61hIiwKICAgICJ3YWl0LmpvdXIuaGludCI6ICJUdSB0ZW1hIMK3IGxhIGVuZXJnw61hIGRlIGhveSDCtyB1bmEgc29sYSBwdWVydGEgcXVlIGFicmlyLiBObyBjaWVycmVzIGVzdGEgcMOhZ2luYS4iLAogICAgIndhaXQuam91ci5mYWxsYmFjayI6ICJFbCBjaWVsbyBjb21wb25lIHR1IE1hbnVzY3JpdG8gZGVsIGTDrWHigKYiLAogICAgIndhaXQuY291cGxlLnRpdGxlIjogIlNlIGVzY3JpYmUgZWwgTWFudXNjcml0byBDZWxlc3RlIGRlIHBhcmVqYSIsCiAgICAid2FpdC5jb3VwbGUuaGludCI6ICJEb3MgdGVtYXMgwrcgc2luYXN0csOtYSDCtyBlbnNhbWJsYWplLiBObyBjaWVycmVzIGVzdGEgcMOhZ2luYS4iLAogICAgIndhaXQuY291cGxlLmZhbGxiYWNrIjogIkVsIGNpZWxvIGNvbXBvbmUgdnVlc3RybyBtYW51c2NyaXRvIGRlIHBhcmVqYeKApiIsCiAgICAid2FpdC51bHRpbWUudGl0bGUiOiAiU2UgZXNjcmliZSBlbCBNYW51c2NyaXRvIMOabHRpbW8iLAogICAgIndhaXQudWx0aW1lLmhpbnQiOiAiRWRpY2nDs24gbGFyZ2EgwrcgcGFjaWVuY2lhIGNlbGVzdGUuIE5vIGNpZXJyZXMgZXN0YSBww6FnaW5hLiIsCiAgICAid2FpdC51bHRpbWUuZmFsbGJhY2siOiAiRWwgY2llbG8gY29tcG9uZSB0dSBNYW51c2NyaXRvIMOabHRpbW/igKYiLAogICAgInByb2cuaWEiOiAiVHJhZHVjY2nDs24gZGVsIGxlbmd1YWplIGRlbCB1bml2ZXJzbyDigJQgZW5zYW1ibGFqZSBkZSBsb3MgY2Fww610dWxvcyBkZSB0dSB2aWRh4oCmIiwKICAgICJwcm9nLmhkIjogIkxlY3R1cmEgZGUgdHUgY8OzZGlnbyBkZSB2aWRh4oCmIiwKICAgICJwcm9nLnR6IjogIkFuY2xhamUgZW4gZWwgdGllbXBvIHkgZWwgZXNwYWNpb+KApiIsCiAgICAicHJvZy5hc3RybyI6ICJBbGluZWFjacOzbiBkZSBsb3MgcGxhbmV0YXPigKYiLAogICAgInByb2cuaHRtbCI6ICJFbnNhbWJsYWplIHkgZW5jdWFkZXJuYWNpw7NuIGRlbCBtYW51c2NyaXRv4oCmIiwKICAgICJwcm9nLnN5bnRoIjogIlNlbGxvIGZpbmFsIOKAlCBlbCBtYW51c2NyaXRvIHRvbWEgZm9ybWHigKYiLAogICAgImFjY291bnQucGF1c2Vfc3RhdGUiOiAiRW4gcGF1c2Eg4oCUIGFjY2VzbyBHcmF0aXMgKDUgbWFudXNjcml0b3MgZGVsIGTDrWEgLyBtZXMsIDEgZGVsIG1lcyAvIGHDsW8pIiwKICAgICJhY2NvdW50LmFjdGl2ZSI6ICJBY3Rpdm8iLAogICAgImFjY291bnQuaW5hY3RpdmUiOiAiSW5hY3Rpdm8iLAogICAgImFjY291bnQubm9fc3ViIjogIlNpbiBzdXNjcmlwY2nDs24iLAogICAgImFjY291bnQucHJpY2VfbW8iOiAie259IOKCrCAvIG1lcyIsCiAgICAiYWNjb3VudC5pYV9vayI6ICJEaXNwb25pYmxlIiwKICAgICJhY2NvdW50LmlhX3BhdXNlIjogIkVuIHBhdXNhIOKAlCBzZSByZWFicmUgY29uIERpdmluIiwKICAgICJhY2NvdW50LmlhX2xvY2siOiAiUmVzZXJ2YWRhIGFsIHBsYW4gRGl2aW4iLAogICAgImFjY291bnQudWx0aW1lX3Byb2ciOiAiUHJvZ3Jlc28gw5psdGltbyIsCiAgICAiYWNjb3VudC51bHRpbWVfbGluZSI6ICJ7bn0gLyA2IG1lc2VzIHBhZ2Fkb3MiLAogICAgImFjY291bnQudWx0aW1lX2tlcHQiOiAiIChjb25zZXJ2YWRvcykiLAogICAgImFjY291bnQuYmlydGhfc2t5IjogIkNpZWxvIGRlIG5hY2ltaWVudG8iLAogICAgImFjY291bnQubXNfcmVhZHkiOiAiIMK3IG1hbnVzY3JpdG8gbGlzdG8iLAogICAgImFjY291bnQuZWRpdHNfbGVmdCI6ICJUZSBxdWVkYW4ge259IG1vZGlmaWNhY2nDs257ZXN9LiIsCiAgICAiYWNjb3VudC5lZGl0c19kb25lIjogIkhhcyB1c2FkbyB0dXMgMyBtb2RpZmljYWNpb25lcy4gUGFyYSBjdWFscXVpZXIgY29ycmVjY2nDs24sIGNvbnRhY3RhIGNvbiBzb3BvcnRlLiIsCiAgICAiYWNjb3VudC5lZGl0IjogIkVkaXRhciIsCiAgICAiYWNjb3VudC52aWV3IjogIkNvbnN1bHRhciIsCiAgICAiYWNjb3VudC5iaXJ0aF9lbXB0eSI6ICJBw7puIG5vIGluZGljYWRvLiIsCiAgICAiYWNjb3VudC5maWxsX2JpcnRoIjogIkluZGljYXIgbWkgY2llbG8gZGUgbmFjaW1pZW50byIsCiAgICAiYWNjb3VudC5tYW5hZ2UiOiAiR2VzdGlvbmFyIG1pIHN1c2NyaXBjacOzbiIsCiAgICAiYWNjb3VudC5tYW5hZ2VfaGludCI6ICJQYXJhIGNhbWJpYXIgZGUgcGxhbiwgcHJpbWVybyBkZXTDqW4gdHUgc3VzY3JpcGNpw7NuIGFjdHVhbCB5IGx1ZWdvIHN1c2Nyw61iZXRlIGRlIG51ZXZvIGFsIHF1ZSBlbGlqYXMuIiwKICAgICJhY2NvdW50LnN1cHBvcnQiOiAiUGFyYSBheXVkYTogY29udGFjdEBmb3JtYXRpb25zLXNwaXJpdHVhbGl0ZS1lbmVyZ2V0aXF1ZS5jb20iLAogICAgImFjY291bnQucmVzdW1lX21hbmFnZSI6ICJSZWFudWRhciAvIGdlc3Rpb25hciBtaSBzdXNjcmlwY2nDs24iLAogICAgImFjY291bnQuYmFja19jZWxlc3RlIjogIlZvbHZlciBhIEPDqWxlc3RlIMK3IDU5IOKCrCIsCiAgICAiYWNjb3VudC50b19kaXZpbiI6ICJQYXNhciBhIERpdmluIMK3IDEzNyDigqwiLAogICAgImFjY291bnQudG9fY2VsZXN0ZSI6ICJQYXNhciBhIEPDqWxlc3RlIMK3IDU5IOKCrCIsCiAgICAiYWNjb3VudC5kb3duZ3JhZGVfY2VsZXN0ZSI6ICJWb2x2ZXIgYSBDw6lsZXN0ZSDCtyA1OSDigqwiLAogICAgImFjY291bnQubWFuYWdlX3N0b3AiOiAiR2VzdGlvbmFyIC8gZGV0ZW5lciBsYSBzdXNjcmlwY2nDs24iLAogICAgImFjY291bnQuZGxfbGFiZWwiOiAiRGVzY2FyZ2EgwrcgRGl2aW4iLAogICAgImFjY291bnQuZGxfaGludCI6ICJEZXNjYXJnYSB0b2RvcyB0dXMgbWFudXNjcml0b3MgbGlzdG9zIChuYXRhbCwgbWVzLCBkw61hLCBwYXJlamHigKYpIGVuIHVuIFpJUC4iLAogICAgImFjY291bnQuZGxfYnRuIjogIkRlc2NhcmdhciB0b2RvcyBtaXMgbWFudXNjcml0b3MiLAogICAgImFjY291bnQuZGxfdW5sb2NrIjogIkRlc2Jsb3F1ZW8gZW4ge259IG1lc2VzIiwKICAgICJhY2NvdW50LmRsX3Byb2dyZXNzIjogIk9wY2nDs24gcmVzZXJ2YWRhIGEgRGl2aW4sIHRyYXMge25lZWR9IG1lc2VzIGRlIHN1c2NyaXBjacOzbi4gUHJvZ3Jlc286IDxiPntoYXZlfSAvIHtuZWVkfTwvYj4uIgogIH0KfQo='));
    Object.keys(EXTRA).forEach(function (code) {
      if (!I18N[code]) I18N[code] = {};
      Object.keys(EXTRA[code]).forEach(function (k) {
        I18N[code][k] = EXTRA[code][k];
      });
    });
    Object.keys(I18N).forEach(function (code) {
      if (code === 'en' || !I18N.en) return;
      Object.keys(I18N.en).forEach(function (k) {
        if (I18N[code][k] == null) I18N[code][k] = I18N.en[k];
      });
    });
    /* Manuscrit de vie v2 (~33 p. + teaser Gene Keys Activation) */
    if (I18N.fr) {
      I18N.fr['natal.intro'] = 'Les ~33 pages de ton thème — toujours accessibles tant que ton abonnement est actif.';
      I18N.fr['natal.pages_price'] = '~33 pages · 59 € / mois';
    }
    if (I18N.en) {
      I18N.en['natal.intro'] = 'The ~33 pages of your chart — always available while your subscription is active.';
      I18N.en['natal.pages_price'] = '~33 pages · €59 / month';
    }
    if (I18N.es) {
      I18N.es['natal.intro'] = 'Las ~33 páginas de tu carta — siempre accesibles mientras tu suscripción esté activa.';
      I18N.es['natal.pages_price'] = '~33 páginas · 59 € / mes';
    }
  })();

  (function addI18nMore() {
    var MORE = {
      fr: {
        'reader.close': 'Fermer le manuscrit',
        'pages.unit': 'pages',
        'natal.pages_badge_aria': 'Environ 33 pages',
        'ultime.pages_badge_aria': 'Environ 180 pages',
        'ia.quota_left': '{left} / {quota} messages ce mois',
        'ia.quota_exhausted': 'Quota IA du mois atteint. Passe à un plan supérieur, ou reviens le 1er.',
        'ia.quota_plans': 'Gratuit 3 · Céleste 10 · Divin 200 · Divin+ 500 / mois',
        'ia.pass_celeste': 'Passer Céleste · 59 €',
        'ia.pass_divin': 'Passer Divin · 137 €',
        'ia.pass_divin_plus': 'Passer Divin+ · +44 €',
        'ia.upsell_title': 'Quota IA atteint',
        'ia.upsell_divin_body': 'Tu as utilisé tes 200 messages Divin de ce mois. Passe Divin+ : jusqu’à 500 messages / mois pour 44 € supplémentaires / mois.',
        'ia.upsell_divin_plus_body': 'Tu as utilisé tes 500 messages Divin+ de ce mois. Reviens le 1er pour un nouveau ciel.',
        'ia.upsell_celeste_body': 'Tu as utilisé tes 10 messages Céleste. Passe Divin pour 200 messages / mois.',
        'ia.upsell_free_body': 'Tu as utilisé tes 3 messages gratuits. Céleste (10) ou Divin (200) pour continuer.',
        'ia.upsell_cta_plus': 'Découvrir Divin+ · +44 € / mois',
        'ia.upsell_cta_divin': 'Passer Divin · 137 €',
        'ia.upsell_cta_celeste': 'Passer Céleste · 59 €',
        'ia.upsell_later': 'Plus tard',
        'ia.included': 'Sur tous les plans',
        'ia.lock_reader': 'Pose tes questions sur ce manuscrit — IA incluse selon ton plan.',
        'ia.card_ok': 'Elle t’accompagne sous chaque manuscrit, pendant que tu lis.',
        'ia.available': 'Disponible sur ton plan',
        'account.ia_quota': '{left} / {quota} ce mois',
        'account.ia_ok': 'Disponible',
        'account.ia_lock': 'Incluse dès le Gratuit (3 / mois)',
        'account.ia_pause': 'Quota Gratuit (3 / mois) pendant la pause',
        'login.lede': 'Gratuit, Céleste (59 €) ou Divin (137 €).<br>L’IA Céleste : 3 / 10 / 200 messages par mois (Divin+ : 500).',
        'ia.mic_stop': 'Arrêter la dictée',
        'ia.speak_loading': 'Préparation…',
        'ia.tts_err': 'La voix Céleste ne répond pas pour le moment. Réessaie dans un instant.',
        'ia.tts_quota': 'Quota voix du mois atteint. Écouter avec la voix du navigateur ?',
        'ia.tts_need_auth': 'Reconnecte-toi pour écouter la voix Céleste.',
        'ia.live': 'Mode IA live',
        'ia.live_aria': 'Ouvrir le Mode IA live avec Céleste',
        'ia.live_connecting': 'Connexion à Céleste…',
        'ia.live_listening': 'Je t’écoute…',
        'ia.live_speaking': 'Céleste parle…',
        'ia.live_muted': 'Micro coupé',
        'ia.live_mute': 'Couper le micro',
        'ia.live_unmute': 'Réactiver le micro',
        'ia.live_end': 'Terminer',
        'ia.live_hint': 'Parle librement — Céleste s’appuie sur ce manuscrit. Chaque échange compte pour 1 message IA.',
        'ia.live_quota': '{left} / {quota} messages IA restants',
        'ia.live_voice_note': 'Voix Realtime : {voice}',
        'ia.live_err': 'Impossible d’ouvrir le Mode IA live. Réessaie dans un instant.',
        'ia.live_mic': 'Autorise le micro pour parler avec Céleste.',
        'ia.live_expired': 'Session live terminée (15 min). Tu peux en rouvrir une.',
        'ia.live_quota_block': 'Quota IA du mois atteint. Passe à un plan supérieur, ou reviens le 1er.',
        'ms.tts_listen': 'Écouter',
        'ms.tts_pause': 'Pause',
        'ms.tts_resume': 'Reprendre',
        'ms.tts_stop': 'Arrêter',
        'ms.tts_preparing': 'Préparation audio…',
        'ms.tts_progress': 'Préparation audio… {done}/{total}',
        'ms.tts_lock': 'Écoute du manuscrit · plan Divin',
        'ms.tts_lock_aria': 'Réservé au plan Divin',
        'ms.tts_err': 'Impossible de préparer l’audio du manuscrit. Réessaie dans un instant.',
        'ms.tts_need_file': 'Le manuscrit n’est pas encore disponible à l’écoute.',
        'ms.tts_aria': 'Écouter le manuscrit entier',
        'account.voice': 'Voix de Céleste',
        'account.voice_hint': 'Choisis la voix OpenAI pour l’écoute IA et les manuscrits.',
        'account.voice_choose': 'Choisir la voix',
        'account.voice_test': 'Tester',
        'account.voice_testing': 'Écoute…',
        'account.voice_saved': 'Voix enregistrée.',
        'account.voice_lock': 'Voix Céleste · plan Divin',
        'voice.alloy': 'Alloy — neutre',
        'voice.ash': 'Ash — calme',
        'voice.coral': 'Coral — chaleureux',
        'voice.echo': 'Echo — clair',
        'voice.fable': 'Fable — narratif',
        'voice.onyx': 'Onyx — grave',
        'voice.nova': 'Nova — défaut',
        'voice.sage': 'Sage — posé',
        'voice.shimmer': 'Shimmer — doux',
        'desktop.nudge_title': 'Ouvre Céleste sur ton téléphone',
        'desktop.nudge_body': 'Sur ordinateur, on revient peu. Sur mobile, Céleste devient un rituel quotidien. Envoie-toi le lien, ou scanne le QR.',
        'desktop.nudge_homescreen': 'Sur ton téléphone : une fois l’app ouverte, ajoute-la à l’écran d’accueil pour un accès comme une vraie app.',
        'desktop.nudge_qr_hint': 'Scanne avec l’appareil photo de ton téléphone',
        'desktop.nudge_whatsapp': 'Envoyer via WhatsApp',
        'desktop.nudge_email': 'M’envoyer par email',
        'desktop.nudge_copy': 'Copier le lien',
        'desktop.nudge_copied': 'Lien copié ✦',
        'desktop.nudge_install_pc': 'Installer aussi sur cet ordinateur',
        'desktop.nudge_dismiss': 'Plus tard',
        'desktop.wa_text': 'Voici mon lien Céleste — à ouvrir sur mon téléphone pour y revenir chaque jour : {url}',
        'desktop.mail_subject': 'Mon lien Céleste (à ouvrir sur téléphone)',
        'desktop.mail_body': 'Ouvre Céleste sur ton téléphone pour y revenir facilement chaque jour :\n\n{url}\n\nAstuce : une fois ouvert, ajoute l’app à l’écran d’accueil.'
      },
      en: {
        'reader.close': 'Close manuscript',
        'pages.unit': 'pages',
        'natal.pages_badge_aria': 'About 33 pages',
        'ultime.pages_badge_aria': 'About 180 pages',
        'ia.quota_left': '{left} / {quota} messages this month',
        'ia.quota_exhausted': 'Monthly AI quota reached. Upgrade your plan, or come back on the 1st.',
        'ia.quota_plans': 'Free 3 · Céleste 10 · Divin 200 · Divin+ 500 / month',
        'ia.pass_celeste': 'Go Céleste · €59',
        'ia.pass_divin': 'Go Divin · €137',
        'ia.pass_divin_plus': 'Go Divin+ · +€44',
        'ia.upsell_title': 'AI quota reached',
        'ia.upsell_divin_body': 'You’ve used your 200 Divin AI messages this month. Upgrade to Divin+: up to 500 messages / month for an extra €44 / month.',
        'ia.upsell_divin_plus_body': 'You’ve used your 500 Divin+ AI messages this month. Come back on the 1st for a fresh sky.',
        'ia.upsell_celeste_body': 'You’ve used your 10 Céleste messages. Go Divin for 200 messages / month.',
        'ia.upsell_free_body': 'You’ve used your 3 free messages. Céleste (10) or Divin (200) to continue.',
        'ia.upsell_cta_plus': 'Discover Divin+ · +€44 / month',
        'ia.upsell_cta_divin': 'Go Divin · €137',
        'ia.upsell_cta_celeste': 'Go Céleste · €59',
        'ia.upsell_later': 'Later',
        'ia.included': 'On every plan',
        'ia.lock_reader': 'Ask questions about this manuscript — AI included on your plan.',
        'ia.card_ok': 'She accompanies you under each manuscript as you read.',
        'ia.available': 'Available on your plan',
        'account.ia_quota': '{left} / {quota} this month',
        'account.ia_ok': 'Available',
        'account.ia_lock': 'Included from Free (3 / month)',
        'account.ia_pause': 'Free quota (3 / month) while paused',
        'login.lede': 'Free, Céleste (€59) or Divin (€137).<br>Céleste AI: 3 / 10 / 200 messages per month (Divin+: 500).',
        'ia.mic_stop': 'Stop dictation',
        'ia.speak_loading': 'Preparing…',
        'ia.tts_err': 'Céleste’s voice is unavailable right now. Try again in a moment.',
        'ia.tts_quota': 'Monthly voice quota reached. Listen with the browser voice?',
        'ia.tts_need_auth': 'Sign in again to hear Céleste’s voice.',
        'ia.live': 'Live AI mode',
        'ia.live_aria': 'Open Live AI mode with Céleste',
        'ia.live_connecting': 'Connecting to Céleste…',
        'ia.live_listening': 'Listening…',
        'ia.live_speaking': 'Céleste is speaking…',
        'ia.live_muted': 'Muted',
        'ia.live_mute': 'Mute mic',
        'ia.live_unmute': 'Unmute mic',
        'ia.live_end': 'End call',
        'ia.live_hint': 'Speak freely — Céleste stays anchored to this manuscript. Each exchange uses 1 AI message.',
        'ia.live_quota': '{left} / {quota} AI messages left',
        'ia.live_voice_note': 'Realtime voice: {voice}',
        'ia.live_err': 'Could not open Live AI mode. Try again in a moment.',
        'ia.live_mic': 'Allow the microphone to talk with Céleste.',
        'ia.live_expired': 'Live session ended (15 min). You can open a new one.',
        'ia.live_quota_block': 'Monthly AI quota reached. Upgrade your plan, or come back on the 1st.',
        'ms.tts_listen': 'Listen',
        'ms.tts_pause': 'Pause',
        'ms.tts_resume': 'Resume',
        'ms.tts_stop': 'Stop',
        'ms.tts_preparing': 'Preparing audio…',
        'ms.tts_progress': 'Preparing audio… {done}/{total}',
        'ms.tts_lock': 'Listen to manuscript · Divin plan',
        'ms.tts_lock_aria': 'Reserved for Divin plan',
        'ms.tts_err': 'Could not prepare the manuscript audio. Try again in a moment.',
        'ms.tts_need_file': 'This manuscript is not ready to listen yet.',
        'ms.tts_aria': 'Listen to the full manuscript',
        'account.voice': 'Céleste’s voice',
        'account.voice_hint': 'Choose the OpenAI voice for AI listen and manuscripts.',
        'account.voice_choose': 'Choose a voice',
        'account.voice_test': 'Preview',
        'account.voice_testing': 'Playing…',
        'account.voice_saved': 'Voice saved.',
        'account.voice_lock': 'Céleste voice · Divin plan',
        'voice.alloy': 'Alloy — neutral',
        'voice.ash': 'Ash — calm',
        'voice.coral': 'Coral — warm',
        'voice.echo': 'Echo — clear',
        'voice.fable': 'Fable — narrative',
        'voice.onyx': 'Onyx — deep',
        'voice.nova': 'Nova — default',
        'voice.sage': 'Sage — steady',
        'voice.shimmer': 'Shimmer — soft',
        'desktop.nudge_title': 'Open Céleste on your phone',
        'desktop.nudge_body': 'On a computer, people rarely come back. On mobile, Céleste becomes a daily ritual. Send yourself the link, or scan the QR.',
        'desktop.nudge_homescreen': 'On your phone: once the app is open, Add to Home Screen for app-like access.',
        'desktop.nudge_qr_hint': 'Scan with your phone camera',
        'desktop.nudge_whatsapp': 'Send via WhatsApp',
        'desktop.nudge_email': 'Email me the link',
        'desktop.nudge_copy': 'Copy link',
        'desktop.nudge_copied': 'Link copied ✦',
        'desktop.nudge_install_pc': 'Also install on this computer',
        'desktop.nudge_dismiss': 'Later',
        'desktop.wa_text': 'Here’s my Céleste link — open it on my phone so I can come back every day: {url}',
        'desktop.mail_subject': 'My Céleste link (open on phone)',
        'desktop.mail_body': 'Open Céleste on your phone for an easy daily return:\n\n{url}\n\nTip: once open, Add to Home Screen.'
      },
      es: {
        'reader.close': 'Cerrar el manuscrito',
        'pages.unit': 'páginas',
        'natal.pages_badge_aria': 'Unas 33 páginas',
        'ultime.pages_badge_aria': 'Unas 180 páginas',
        'ia.quota_left': '{left} / {quota} mensajes este mes',
        'ia.quota_exhausted': 'Cupo de IA del mes agotado. Mejora tu plan, o vuelve el día 1.',
        'ia.quota_plans': 'Gratis 3 · Céleste 10 · Divin 200 · Divin+ 500 / mes',
        'ia.pass_celeste': 'Pasar a Céleste · 59 €',
        'ia.pass_divin': 'Pasar a Divin · 137 €',
        'ia.pass_divin_plus': 'Pasar a Divin+ · +44 €',
        'ia.upsell_title': 'Cupo de IA agotado',
        'ia.upsell_divin_body': 'Has usado tus 200 mensajes Divin de este mes. Pasa a Divin+: hasta 500 mensajes / mes por 44 € adicionales / mes.',
        'ia.upsell_divin_plus_body': 'Has usado tus 500 mensajes Divin+ de este mes. Vuelve el día 1 para un cielo nuevo.',
        'ia.upsell_celeste_body': 'Has usado tus 10 mensajes Céleste. Pasa a Divin para 200 mensajes / mes.',
        'ia.upsell_free_body': 'Has usado tus 3 mensajes gratis. Céleste (10) o Divin (200) para continuar.',
        'ia.upsell_cta_plus': 'Descubrir Divin+ · +44 € / mes',
        'ia.upsell_cta_divin': 'Pasar a Divin · 137 €',
        'ia.upsell_cta_celeste': 'Pasar a Céleste · 59 €',
        'ia.upsell_later': 'Más tarde',
        'ia.included': 'En todos los planes',
        'ia.lock_reader': 'Haz preguntas sobre este manuscrito — IA incluida según tu plan.',
        'ia.card_ok': 'Te acompaña bajo cada manuscrito mientras lees.',
        'ia.available': 'Disponible en tu plan',
        'account.ia_quota': '{left} / {quota} este mes',
        'account.ia_ok': 'Disponible',
        'account.ia_lock': 'Incluida desde Gratis (3 / mes)',
        'account.ia_pause': 'Cupo Gratis (3 / mes) en pausa',
        'login.lede': 'Gratis, Céleste (59 €) o Divin (137 €).<br>IA Céleste: 3 / 10 / 200 mensajes al mes (Divin+: 500).',
        'ia.mic_stop': 'Detener el dictado',
        'ia.speak_loading': 'Preparando…',
        'ia.tts_err': 'La voz de Céleste no responde por ahora. Inténtalo en un momento.',
        'ia.tts_quota': 'Cupo de voz del mes agotado. ¿Escuchar con la voz del navegador?',
        'ia.tts_need_auth': 'Vuelve a iniciar sesión para oír la voz de Céleste.',
        'ia.live': 'Modo IA live',
        'ia.live_aria': 'Abrir Modo IA live con Céleste',
        'ia.live_connecting': 'Conectando con Céleste…',
        'ia.live_listening': 'Te escucho…',
        'ia.live_speaking': 'Céleste habla…',
        'ia.live_muted': 'Micrófono silenciado',
        'ia.live_mute': 'Silenciar micro',
        'ia.live_unmute': 'Reactivar micro',
        'ia.live_end': 'Terminar',
        'ia.live_hint': 'Habla con libertad — Céleste se basa en este manuscrito. Cada intercambio cuenta como 1 mensaje IA.',
        'ia.live_quota': '{left} / {quota} mensajes IA restantes',
        'ia.live_voice_note': 'Voz Realtime: {voice}',
        'ia.live_err': 'No se pudo abrir el Modo IA live. Inténtalo en un momento.',
        'ia.live_mic': 'Autoriza el micrófono para hablar con Céleste.',
        'ia.live_expired': 'Sesión live terminada (15 min). Puedes abrir otra.',
        'ia.live_quota_block': 'Cupo de IA del mes agotado. Mejora tu plan, o vuelve el día 1.',
        'onboard.lede_edit': 'Corrige un error si hace falta. Te quedan {n} modificación{s}.',
        'onboard.edits_left': 'Te quedan {n} modificación{s}.',
        'partner.edits_left': 'Te quedan {n} corrección{s}.',
        'account.edits_left': 'Te quedan {n} modificación{s}.',
        'ms.tts_listen': 'Escuchar',
        'ms.tts_pause': 'Pausa',
        'ms.tts_resume': 'Reanudar',
        'ms.tts_stop': 'Parar',
        'ms.tts_preparing': 'Preparando audio…',
        'ms.tts_progress': 'Preparando audio… {done}/{total}',
        'ms.tts_lock': 'Escuchar el manuscrito · plan Divin',
        'ms.tts_lock_aria': 'Reservado al plan Divin',
        'ms.tts_err': 'No se pudo preparar el audio del manuscrito. Inténtalo en un momento.',
        'ms.tts_need_file': 'Este manuscrito aún no está listo para escuchar.',
        'ms.tts_aria': 'Escuchar el manuscrito completo',
        'account.voice': 'Voz de Céleste',
        'account.voice_hint': 'Elige la voz OpenAI para la escucha IA y los manuscritos.',
        'account.voice_choose': 'Elegir la voz',
        'account.voice_test': 'Probar',
        'account.voice_testing': 'Escuchando…',
        'account.voice_saved': 'Voz guardada.',
        'account.voice_lock': 'Voz Céleste · plan Divin',
        'voice.alloy': 'Alloy — neutra',
        'voice.ash': 'Ash — calmada',
        'voice.coral': 'Coral — cálida',
        'voice.echo': 'Echo — clara',
        'voice.fable': 'Fable — narrativa',
        'voice.onyx': 'Onyx — grave',
        'voice.nova': 'Nova — predeterminada',
        'voice.sage': 'Sage — serena',
        'voice.shimmer': 'Shimmer — suave',
        'desktop.nudge_title': 'Abre Céleste en tu teléfono',
        'desktop.nudge_body': 'En el ordenador casi no se vuelve. En el móvil, Céleste se vuelve un ritual diario. Envíate el enlace o escanea el QR.',
        'desktop.nudge_homescreen': 'En el teléfono: cuando abras la app, añádela a la pantalla de inicio para usarla como una app.',
        'desktop.nudge_qr_hint': 'Escanea con la cámara del teléfono',
        'desktop.nudge_whatsapp': 'Enviar por WhatsApp',
        'desktop.nudge_email': 'Enviarme por email',
        'desktop.nudge_copy': 'Copiar enlace',
        'desktop.nudge_copied': 'Enlace copiado ✦',
        'desktop.nudge_install_pc': 'Instalar también en este ordenador',
        'desktop.nudge_dismiss': 'Más tarde',
        'desktop.wa_text': 'Aquí tienes mi enlace Céleste — ábrelo en mi teléfono para volver cada día: {url}',
        'desktop.mail_subject': 'Mi enlace Céleste (abrir en el teléfono)',
        'desktop.mail_body': 'Abre Céleste en tu teléfono para volver fácilmente cada día:\n\n{url}\n\nConsejo: una vez abierta, añádela a la pantalla de inicio.'
      }
    };
    Object.keys(MORE).forEach(function (code) {
      if (!I18N[code]) I18N[code] = {};
      Object.keys(MORE[code]).forEach(function (k) { I18N[code][k] = MORE[code][k]; });
    });
    Object.keys(I18N).forEach(function (code) {
      if (code === 'en' || !I18N.en) return;
      Object.keys(I18N.en).forEach(function (k) {
        if (I18N[code][k] == null) I18N[code][k] = I18N.en[k];
      });
    });
  })();

  function tf(key, vars) {
    var s = t(key);
    if (!vars) return s;
    return String(s).replace(/\{(\w+)\}/g, function (_, k) {
      return vars[k] != null ? String(vars[k]) : '';
    });
  }

  function pluralS(n) {
    var c = normalizeLang(state.lang || 'fr');
    if (c === 'es') return Number(n) > 1 ? 'es' : '';
    return Number(n) > 1 ? 's' : '';
  }

  function langLocale() {
    var c = normalizeLang(state.lang || 'fr');
    var map = {
      fr: 'fr-FR', en: 'en-US', es: 'es-ES', he: 'he-IL', pt: 'pt-PT', de: 'de-DE',
      it: 'it-IT', ar: 'ar-SA', zh: 'zh-CN', ja: 'ja-JP', ru: 'ru-RU', hi: 'hi-IN',
      nl: 'nl-NL', pl: 'pl-PL', tr: 'tr-TR', ko: 'ko-KR'
    };
    return map[c] || 'en-US';
  }

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
    lang: 'fr',
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

  function normalizeLang(code) {
    var raw = String(code == null ? '' : code).trim().toLowerCase().replace(/_/g, '-');
    if (!raw) return 'fr';
    var primary = raw.split('-')[0];
    if (primary === 'zh') return 'zh';
    return APP_LANG_CODES[primary] ? primary : 'fr';
  }

  function getStoredLang() {
    try {
      return normalizeLang(localStorage.getItem(LANG_KEY) || 'fr');
    } catch (e) {
      return 'fr';
    }
  }

  function t(key) {
    var code = normalizeLang(state.lang || 'fr');
    var pack = I18N[code] || I18N.en || I18N.fr;
    if (pack && pack[key] != null) return pack[key];
    if (I18N.en && I18N.en[key] != null) return I18N.en[key];
    if (I18N.fr && I18N.fr[key] != null) return I18N.fr[key];
    return key;
  }

  function isRtlLang(code) {
    var c = normalizeLang(code);
    return c === 'he' || c === 'ar';
  }

  function applyLang(code, persist) {
    var lang = normalizeLang(code);
    state.lang = lang;
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', isRtlLang(lang) ? 'rtl' : 'ltr');
    if (persist !== false) {
      try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    }
  }

  function setLang(code, opts) {
    opts = opts || {};
    applyLang(code, true);
    /* Only mutate account language when explicitly allowed (first setup). */
    if (opts.bindAccount && state.user) {
      state.user.language = state.lang;
      state.user.locale = state.lang;
      saveUser();
    }
    if (opts.render !== false) render();
    if (opts.saveRemote && state.user && state.user.token && !state.user.languageLocked) {
      fetch(API + '/profile', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({
          email: state.user.email,
          language: state.lang,
          locale: state.lang
        })
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, data: j }; }); })
        .then(function (res) {
          if (res.ok && res.data && res.data.contact) applyAccess(res.data.contact);
        })
        .catch(function () {});
    }
  }

  function accountLangLocked() {
    return !!(state.user && state.user.languageLocked);
  }

  function langNativeLabel(code) {
    var c = normalizeLang(code);
    for (var i = 0; i < APP_LANGS.length; i++) {
      if (APP_LANGS[i].code === c) return APP_LANGS[i].label;
    }
    return c;
  }

  function languageSelectHtml(id, selected) {
    var cur = normalizeLang(selected || state.lang || 'fr');
    var opts = APP_LANGS.map(function (L) {
      return '<option value="' + L.code + '"' + (L.code === cur ? ' selected' : '') + '>' +
        L.label + '</option>';
    }).join('');
    return '<select class="input lang-select" id="' + id + '" aria-label="' + t('lang.label') + '">' +
      opts + '</select>';
  }

  function languageBlockHtml(id, warnKey) {
    return '<div class="field lang-field">' +
      '<label class="label" for="' + id + '">' + t('lang.label') + '</label>' +
      languageSelectHtml(id, state.lang) +
      '<p class="lang-warn" role="note">' + t(warnKey) + '</p>' +
      '</div>';
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
    var frame = document.querySelector('.pdf-view .natal-frame');
    if (frame) {
      try {
        var src = frame.getAttribute('src');
        if (src) {
          var next = withThemeQuery(src);
          if (next && next !== src) frame.setAttribute('src', next);
        }
      } catch (e) {}
      applyIframeManuscriptTheme(frame);
    }
  }

  function themeToggleHtml(compact) {
    var isLight = state.theme === 'light';
    if (compact) {
      return '<button type="button" class="theme-chip" aria-label="' + t('theme.toggle') + '">' +
        (isLight ? t('theme.light') : t('theme.dark')) + '</button>';
    }
    return '<div class="theme-toggle" role="group" aria-label="' + t('theme.aria') + '">' +
      '<button type="button" data-theme-set="dark" class="' + (!isLight ? 'active' : '') + '">' + t('theme.dark') + '</button>' +
      '<button type="button" data-theme-set="light" class="' + (isLight ? 'active' : '') + '">' + t('theme.light') + '</button>' +
      '</div>';
  }

  function load() {
    state.theme = getStoredTheme();
    applyTheme(state.theme, false);
    applyLang(getStoredLang(), false);
    try { state.user = JSON.parse(localStorage.getItem('cercle.user') || 'null'); } catch (e) { state.user = null; }
    /* Ancienne session sans mot de passe / token → reconnexion obligatoire. */
    if (state.user && (!state.user.email || !state.user.token)) {
      state.user = null;
      try { localStorage.removeItem('cercle.user'); } catch (e2) {}
    }
    if (state.user) {
      if (state.user.language || state.user.locale) {
        applyLang(state.user.language || state.user.locale, true);
      }
      if (isDesktopClient() || localStorage.getItem('cercle.installedHint')) {
        state.screen = 'app';
      } else {
        state.screen = 'install';
      }
    }
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
    stopIaSpeak();
    stopMsTtsAudio();
    try { endIaLive({ reason: 'auth' }); } catch (e0) { /* ignore */ }
    closeDesktopPhoneNudge();
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
    if (d.language || d.locale) {
      applyLang(d.language || d.locale, true);
    }
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
    /* Desktop: skip mobile “add to home screen” — phone nudge modal instead. */
    if (isDesktopClient() || localStorage.getItem('cercle.installedHint')) {
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
    if (isDesktopClient() || localStorage.getItem('cercle.installedHint')) state.screen = 'app';
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
    return !!state.user.canIa;
  }
  /** OpenAI TTS (bulles + manuscrits + voix compte) : Divin actif uniquement. */
  function canOpenAiTts() {
    if (!state.user) return false;
    if (isPausedPaid()) return false;
    if (state.user.canOpenAiTts != null) return !!state.user.canOpenAiTts;
    return plan() === 'divin' && isActive();
  }

  /* OpenAI TTS voices for tts-1 (Divin account picker). Default: nova. */
  var TTS_VOICES = ['alloy', 'ash', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer'];
  var DEFAULT_TTS_VOICE = 'nova';
  var TTS_PREVIEW_SAMPLE =
    'Bonjour, je suis Céleste. Voici un aperçu de ma voix pour t’accompagner dans tes manuscrits.';

  function normalizeTtsVoice(v) {
    var id = String(v || '').trim().toLowerCase();
    return TTS_VOICES.indexOf(id) >= 0 ? id : DEFAULT_TTS_VOICE;
  }

  function accountTtsVoice() {
    return normalizeTtsVoice(state.user && state.user.ttsVoice);
  }

  function voiceLabelParts(voiceId) {
    var full = t('voice.' + voiceId);
    var parts = String(full).split(/\s+[—–-]\s+/);
    return {
      name: parts[0] || voiceId,
      trait: parts[1] || ''
    };
  }

  function voicePickerHtml(id, selected) {
    var cur = normalizeTtsVoice(selected);
    var cards = TTS_VOICES.map(function (v) {
      var parts = voiceLabelParts(v);
      var active = v === cur;
      return '<button type="button" class="voice-card' + (active ? ' active' : '') + '"' +
        ' role="radio" aria-checked="' + (active ? 'true' : 'false') + '"' +
        ' data-voice="' + v + '"' +
        ' id="' + id + '-' + v + '">' +
        '<span class="voice-name">' + escapeHtml(parts.name) + '</span>' +
        (parts.trait ? '<span class="voice-trait">' + escapeHtml(parts.trait) + '</span>' : '') +
      '</button>';
    }).join('');
    return '<div class="voice-picker" id="' + id + '" role="radiogroup" aria-labelledby="' + id + '-lbl">' +
      cards +
    '</div>';
  }

  function selectedAccountTtsVoiceFromDom() {
    var active = document.querySelector('#acct-tts-voice .voice-card.active');
    return normalizeTtsVoice(active ? active.getAttribute('data-voice') : accountTtsVoice());
  }

  function setActiveVoiceCard(voiceId) {
    var id = normalizeTtsVoice(voiceId);
    var root = document.getElementById('acct-tts-voice');
    if (!root) return;
    var cards = root.querySelectorAll('.voice-card');
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var on = card.getAttribute('data-voice') === id;
      card.classList.toggle('active', on);
      card.setAttribute('aria-checked', on ? 'true' : 'false');
    }
  }

  function accountVoiceBlockHtml() {
    if (!canOpenAiTts()) return '';
    return '<div class="acct-block" id="acct-voice-block">' +
      '<div class="label">' + t('account.voice') + '</div>' +
      '<p class="muted acct-hint">' + t('account.voice_hint') + '</p>' +
      '<div class="voice-choose">' +
        '<div class="voice-choose-label" id="acct-tts-voice-lbl">' + t('account.voice_choose') + '</div>' +
        voicePickerHtml('acct-tts-voice', accountTtsVoice()) +
      '</div>' +
      '<button class="btn ghost" type="button" id="acct-tts-preview">' + t('account.voice_test') + '</button>' +
      '<p class="muted acct-hint" id="acct-tts-voice-status" hidden></p>' +
    '</div>';
  }

  function saveAccountTtsVoice(voiceId, opts) {
    opts = opts || {};
    if (!state.user || !state.user.token || !canOpenAiTts()) return Promise.resolve(null);
    var id = normalizeTtsVoice(voiceId);
    state.user.ttsVoice = id;
    saveUser();
    return fetch(API + '/profile', {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({
        email: state.user.email,
        ttsVoice: id
      })
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, data: j }; }); })
      .then(function (res) {
        if (res.status === 401) {
          forceReLogin((res.data && res.data.error) || 'Session expirée.');
          return null;
        }
        if (res.ok && res.data && res.data.contact) applyAccess(res.data.contact);
        else if (!res.ok) throw new Error((res.data && res.data.error) || t('ia.tts_err'));
        if (opts.onOk) opts.onOk(id);
        return id;
      });
  }

  function previewAccountTtsVoice() {
    if (!canOpenAiTts() || !state.user || !state.user.token) {
      try { window.alert(t('ia.tts_need_auth')); } catch (e) { /* ignore */ }
      return;
    }
    var btn = document.getElementById('acct-tts-preview');
    var voiceId = selectedAccountTtsVoiceFromDom();
    if (btn) {
      btn.disabled = true;
      btn.textContent = t('account.voice_testing');
    }
    saveAccountTtsVoice(voiceId)
      .then(function () {
        stopIaSpeak();
        var reqId = _iaSpeakReq;
        return fetch(API + '/tts', {
          method: 'POST',
          headers: authHeaders(true),
          body: JSON.stringify({
            email: state.user && state.user.email,
            text: TTS_PREVIEW_SAMPLE,
            token: state.user && state.user.token
          })
        }).then(function (res) {
          return { res: res, reqId: reqId };
        });
      })
      .then(function (pack) {
        if (!pack || !pack.res) return null;
        var res = pack.res;
        if (!res.ok) {
          return res.json().catch(function () { return {}; }).then(function (j) {
            throw new Error((j && j.error) || t('ia.tts_err'));
          });
        }
        return res.blob().then(function (blob) {
          return { blob: blob, reqId: pack.reqId };
        });
      })
      .then(function (pack) {
        if (!pack || !pack.blob || !pack.blob.size) return;
        playIaAudioBlob(pack.blob, null, pack.reqId);
      })
      .catch(function (err) {
        try { window.alert((err && err.message) || t('ia.tts_err')); } catch (e1) { /* ignore */ }
      })
      .finally(function () {
        if (btn) {
          btn.disabled = false;
          btn.textContent = t('account.voice_test');
        }
      });
  }

  function iaLeft() {
    if (!state.user) return 0;
    if (state.user.iaLeft == null) return 0;
    return Math.max(0, Math.floor(Number(state.user.iaLeft)));
  }
  function iaQuota() {
    if (!state.user || state.user.iaQuota == null) return 0;
    return Math.max(0, Math.floor(Number(state.user.iaQuota)));
  }
  function iaQuotaLineHtml(opts) {
    opts = opts || {};
    if (!canIa()) return '';
    var left = iaLeft();
    var quota = iaQuota();
    if (!quota) return '';
    var cls = 'ia-quota-line';
    if (left <= 0) cls += ' is-out';
    else if (left <= Math.max(1, Math.ceil(quota * 0.2))) cls += ' is-low';
    if (opts.always || left <= Math.max(2, Math.ceil(quota * 0.25)) || left <= 0) {
      return '<p class="' + cls + '">' + tf('ia.quota_left', { left: left, quota: quota }) + '</p>';
    }
    return '';
  }
  function hasDivinPlus() {
    return !!(state.user && state.user.divinPlus);
  }
  function iaUpgradeCtaHtml() {
    var p = plan();
    if (p === 'divin') {
      if (hasDivinPlus()) return '';
      return '<button class="btn ia-upgrade-cta" type="button" data-plan-link="divinPlus">' + t('ia.pass_divin_plus') + '</button>';
    }
    if (p === 'celeste') {
      return '<button class="btn ghost ia-upgrade-cta" type="button" data-plan-link="divin">' + t('ia.pass_divin') + '</button>';
    }
    return '<div class="stack ia-upgrade-cta">' +
      '<button class="btn" type="button" data-plan-link="celeste">' + t('ia.pass_celeste') + '</button>' +
      '<button class="btn ghost" type="button" data-plan-link="divin">' + t('ia.pass_divin') + '</button>' +
      '</div>';
  }

  function closeIaQuotaModal() {
    var el = document.getElementById('ia-quota-modal');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function showIaQuotaModal() {
    closeIaQuotaModal();
    var p = plan();
    var plus = hasDivinPlus();
    var bodyKey = 'ia.upsell_free_body';
    if (p === 'divin' && plus) bodyKey = 'ia.upsell_divin_plus_body';
    else if (p === 'divin') bodyKey = 'ia.upsell_divin_body';
    else if (p === 'celeste') bodyKey = 'ia.upsell_celeste_body';

    var ctas = '';
    if (p === 'divin' && !plus) {
      ctas = '<button type="button" class="btn" data-plan-link="divinPlus">' + t('ia.upsell_cta_plus') + '</button>';
    } else if (p === 'celeste') {
      ctas = '<button type="button" class="btn" data-plan-link="divin">' + t('ia.upsell_cta_divin') + '</button>' +
        '<button type="button" class="btn ghost" data-plan-link="divinPlus">' + t('ia.upsell_cta_plus') + '</button>';
    } else if (p === 'divin' && plus) {
      ctas = '';
    } else {
      ctas = '<button type="button" class="btn" data-plan-link="celeste">' + t('ia.upsell_cta_celeste') + '</button>' +
        '<button type="button" class="btn ghost" data-plan-link="divin">' + t('ia.upsell_cta_divin') + '</button>';
    }

    var el = document.createElement('div');
    el.id = 'ia-quota-modal';
    el.className = 'ia-quota-modal';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'ia-quota-modal-title');
    el.innerHTML =
      '<div class="ia-quota-sheet card stack">' +
        '<h2 id="ia-quota-modal-title">' + t('ia.upsell_title') + '</h2>' +
        '<p>' + t(bodyKey) + '</p>' +
        (ctas ? '<div class="stack ia-quota-ctas">' + ctas + '</div>' : '') +
        '<button type="button" class="btn ghost" id="ia-quota-dismiss">' + t('ia.upsell_later') + '</button>' +
      '</div>';
    document.body.appendChild(el);
    el.addEventListener('click', function (ev) {
      if (ev.target === el) closeIaQuotaModal();
    });
    var dismiss = document.getElementById('ia-quota-dismiss');
    if (dismiss) dismiss.onclick = function () { closeIaQuotaModal(); };
    el.querySelectorAll('[data-plan-link]').forEach(function (b) {
      b.onclick = function () {
        var kind = b.getAttribute('data-plan-link');
        if (kind === 'celeste') openPlanLink(PLAN_LINKS.celesteCheckout);
        else if (kind === 'divin') openPlanLink(PLAN_LINKS.divinCheckout);
        else if (kind === 'divinPlus') openPlanLink(PLAN_LINKS.divinPlusCheckout);
        closeIaQuotaModal();
      };
    });
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ——— Desktop → phone retention nudge ——— */
  var PROD_APP_URL = 'https://cercle-celeste-production.up.railway.app/';
  var DESKTOP_NUDGE_LS = 'cercle.desktopPhoneNudge.until';
  var DESKTOP_NUDGE_SS = 'cercle.desktopPhoneNudge.sessionDismiss';
  var DESKTOP_NUDGE_DAYS = 7;
  var _desktopNudgeOpen = false;
  var _desktopNudgeTimer = null;

  function isDesktopClient() {
    try {
      var ua = String(navigator.userAgent || '');
      if (/android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) return false;
      /* iPadOS 13+ may report as Macintosh with touch */
      if (/ipad/i.test(ua)) return false;
      if (navigator.platform === 'MacIntel' && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1) {
        return false;
      }
      if (typeof window.matchMedia === 'function') {
        if (window.matchMedia('(pointer: coarse)').matches && window.matchMedia('(max-width: 1024px)').matches) {
          return false;
        }
      }
      return true;
    } catch (e) {
      return true;
    }
  }

  function canonicalAppUrl() {
    try {
      var origin = String(location.origin || '').replace(/\/$/, '');
      if (/cercle-celeste/i.test(origin) || /railway\.app/i.test(origin)) {
        return origin + '/';
      }
    } catch (e0) { /* ignore */ }
    return PROD_APP_URL;
  }

  function isDesktopPhoneNudgeDismissed() {
    try {
      if (sessionStorage.getItem(DESKTOP_NUDGE_SS) === '1') return true;
      var until = Number(localStorage.getItem(DESKTOP_NUDGE_LS) || 0);
      if (until && Date.now() < until) return true;
    } catch (e) { /* ignore */ }
    return false;
  }

  function dismissDesktopPhoneNudge(persistDays) {
    try {
      sessionStorage.setItem(DESKTOP_NUDGE_SS, '1');
      if (persistDays) {
        localStorage.setItem(
          DESKTOP_NUDGE_LS,
          String(Date.now() + DESKTOP_NUDGE_DAYS * 24 * 60 * 60 * 1000)
        );
      }
    } catch (e) { /* ignore */ }
    closeDesktopPhoneNudge();
  }

  function closeDesktopPhoneNudge() {
    _desktopNudgeOpen = false;
    var el = document.getElementById('desktop-phone-nudge');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function qrCodeImageUrl(data) {
    return 'https://api.qrserver.com/v1/create-qr-code/?size=168x168&ecc=M&margin=8&data=' +
      encodeURIComponent(data);
  }

  function showDesktopPhoneNudge() {
    if (_desktopNudgeOpen || !isDesktopClient() || isDesktopPhoneNudgeDismissed()) return;
    if (!state.user || state.screen !== 'app') return;
    closeDesktopPhoneNudge();
    _desktopNudgeOpen = true;
    var url = canonicalAppUrl();
    var waText = tf('desktop.wa_text', { url: url });
    var mailBody = tf('desktop.mail_body', { url: url });
    var mailSubject = t('desktop.mail_subject');
    var userEmail = (state.user && state.user.email) ? String(state.user.email) : '';
    var mailto = 'mailto:' + encodeURIComponent(userEmail) +
      '?subject=' + encodeURIComponent(mailSubject) +
      '&body=' + encodeURIComponent(mailBody);
    var waHref = 'https://wa.me/?text=' + encodeURIComponent(waText);
    var installPc = state.deferredPrompt
      ? ('<button type="button" class="btn ghost" id="desktop-nudge-install-pc">' +
        t('desktop.nudge_install_pc') + '</button>')
      : '';

    var el = document.createElement('div');
    el.id = 'desktop-phone-nudge';
    el.className = 'desktop-phone-nudge';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'desktop-phone-nudge-title');
    el.innerHTML =
      '<div class="desktop-phone-nudge-sheet card stack">' +
        '<h2 id="desktop-phone-nudge-title">' + t('desktop.nudge_title') + '</h2>' +
        '<p>' + t('desktop.nudge_body') + '</p>' +
        '<div class="desktop-nudge-qr">' +
          '<img src="' + escapeHtml(qrCodeImageUrl(url)) + '" width="168" height="168" alt="QR" loading="lazy">' +
          '<p class="muted desktop-nudge-qr-hint">' + t('desktop.nudge_qr_hint') + '</p>' +
        '</div>' +
        '<div class="stack desktop-nudge-ctas">' +
          '<a class="btn" id="desktop-nudge-wa" href="' + escapeHtml(waHref) + '" target="_blank" rel="noopener noreferrer">' +
            t('desktop.nudge_whatsapp') + '</a>' +
          '<a class="btn ghost" id="desktop-nudge-mail" href="' + escapeHtml(mailto) + '">' +
            t('desktop.nudge_email') + '</a>' +
          '<button type="button" class="btn ghost" id="desktop-nudge-copy">' + t('desktop.nudge_copy') + '</button>' +
          installPc +
        '</div>' +
        '<p class="muted desktop-nudge-homescreen">' + t('desktop.nudge_homescreen') + '</p>' +
        '<button type="button" class="link" id="desktop-nudge-dismiss">' + t('desktop.nudge_dismiss') + '</button>' +
      '</div>';
    document.body.appendChild(el);
    el.addEventListener('click', function (ev) {
      if (ev.target === el) dismissDesktopPhoneNudge(true);
    });
    var dismiss = document.getElementById('desktop-nudge-dismiss');
    if (dismiss) dismiss.onclick = function () { dismissDesktopPhoneNudge(true); };
    var copyBtn = document.getElementById('desktop-nudge-copy');
    if (copyBtn) {
      copyBtn.onclick = function () {
        function done() {
          copyBtn.textContent = t('desktop.nudge_copied');
          setTimeout(function () { copyBtn.textContent = t('desktop.nudge_copy'); }, 1800);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(done).catch(function () {
            window.prompt(t('desktop.nudge_copy'), url);
          });
        } else {
          window.prompt(t('desktop.nudge_copy'), url);
          done();
        }
      };
    }
    var installBtn = document.getElementById('desktop-nudge-install-pc');
    if (installBtn && state.deferredPrompt) {
      installBtn.onclick = function () {
        var dp = state.deferredPrompt;
        if (!dp) return;
        dp.prompt();
        dp.userChoice.then(function () {
          state.deferredPrompt = null;
          try { localStorage.setItem('cercle.installedHint', '1'); } catch (e1) {}
          installBtn.remove();
        }).catch(function () {});
      };
    }
  }

  function maybeShowDesktopPhoneNudge() {
    if (_desktopNudgeTimer) {
      clearTimeout(_desktopNudgeTimer);
      _desktopNudgeTimer = null;
    }
    if (!isDesktopClient() || !state.user || state.screen !== 'app') return;
    if (isDesktopPhoneNudgeDismissed() || _desktopNudgeOpen) return;
    _desktopNudgeTimer = setTimeout(function () {
      _desktopNudgeTimer = null;
      showDesktopPhoneNudge();
    }, 500);
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
      return t('prog.ia');
    }
    if (/human design/i.test(s)) return t('prog.hd');
    if (/timezone|coordonn/i.test(s)) return t('prog.tz');
    if (/positions astrales|astro\b/i.test(s)) return t('prog.astro');
    if (/mise en page|html/i.test(s)) return t('prog.html');
    if (/synth[eè]se/i.test(s)) return t('prog.synth');
    return s;
  }

  /** Animation d’attente livre 3D + cosmos — tous les manuscrits. */
  function manuscriptWaitHtml(kind, opts) {
    opts = opts || {};
    var meta = {
      natal: {
        title: t('wait.natal.title'),
        hint: t('wait.natal.hint'),
        fallback: t('wait.natal.fallback')
      },
      mois: {
        title: t('wait.mois.title'),
        hint: t('wait.mois.hint'),
        fallback: t('wait.mois.fallback')
      },
      jour: {
        title: t('wait.jour.title'),
        hint: t('wait.jour.hint'),
        fallback: t('wait.jour.fallback')
      },
      couple: {
        title: t('wait.couple.title'),
        hint: t('wait.couple.hint'),
        fallback: t('wait.couple.fallback')
      },
      ultime: {
        title: t('wait.ultime.title'),
        hint: t('wait.ultime.hint'),
        fallback: t('wait.ultime.fallback')
      }
    }
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
      return t('ia.err_generic');
    }
    if ((status === 403 || status === 503) && msg) return msg;
    if (status === 404) return t('ia.err_404');
    return msg;
  }

  var _iaUtterance = null;
  var _iaSpeakingBtn = null;
  var _iaAudio = null;
  var _iaAudioUrl = null;
  var _iaSpeakReq = 0;

  function iaSpeakSupported() {
    return typeof window !== 'undefined' &&
      !!window.speechSynthesis &&
      typeof SpeechSynthesisUtterance !== 'undefined';
  }

  function iaSpeakAvailable() {
    return iaSpeakSupported() || (typeof Audio !== 'undefined' && canOpenAiTts());
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

  function pickBrowserVoice(lang) {
    if (!iaSpeakSupported()) return null;
    var want = String(lang || 'fr-FR').toLowerCase();
    var short = want.slice(0, 2);
    var voices = [];
    try { voices = window.speechSynthesis.getVoices() || []; } catch (e) { voices = []; }
    if (!voices.length) return null;
    var best = null;
    for (var i = 0; i < voices.length; i++) {
      var v = voices[i];
      var vl = String(v.lang || '').toLowerCase();
      if (vl === want) return v;
      if (!best && vl.indexOf(short) === 0) best = v;
    }
    return best;
  }

  function setSpeakBtnState(btn, mode) {
    if (!btn) return;
    var label = btn.querySelector('.ia-speak-label');
    btn.classList.remove('is-speaking', 'is-loading');
    if (mode === 'loading') {
      btn.classList.add('is-loading');
      btn.setAttribute('aria-pressed', 'true');
      if (label) label.textContent = t('ia.speak_loading');
      return;
    }
    if (mode === 'speaking') {
      btn.classList.add('is-speaking');
      btn.setAttribute('aria-pressed', 'true');
      if (label) label.textContent = t('ia.stop');
      return;
    }
    btn.setAttribute('aria-pressed', 'false');
    if (label) label.textContent = t('ia.listen');
  }

  function stopIaSpeak() {
    _iaSpeakReq += 1;
    if (iaSpeakSupported()) {
      try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    }
    _iaUtterance = null;
    if (_iaAudio) {
      try { _iaAudio.pause(); } catch (e) { /* ignore */ }
      try { _iaAudio.src = ''; } catch (e2) { /* ignore */ }
      _iaAudio = null;
    }
    if (_iaAudioUrl) {
      try { URL.revokeObjectURL(_iaAudioUrl); } catch (e3) { /* ignore */ }
      _iaAudioUrl = null;
    }
    if (_iaSpeakingBtn) {
      setSpeakBtnState(_iaSpeakingBtn, 'idle');
      _iaSpeakingBtn = null;
    }
  }

  function speakIaBrowser(plain, btn) {
    if (!iaSpeakSupported()) {
      stopIaSpeak();
      return;
    }
    var u = new SpeechSynthesisUtterance(plain);
    var lang = (state.lang === 'en') ? 'en-US' : (state.lang === 'es' ? 'es-ES' : 'fr-FR');
    u.lang = lang;
    u.rate = 0.95;
    u.pitch = 1;
    var voice = pickBrowserVoice(lang);
    if (voice) u.voice = voice;
    _iaUtterance = u;
    _iaSpeakingBtn = btn || null;
    setSpeakBtnState(btn, 'speaking');
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

  function playIaAudioBlob(blob, btn, reqId) {
    if (reqId !== _iaSpeakReq) return;
    if (_iaAudioUrl) {
      try { URL.revokeObjectURL(_iaAudioUrl); } catch (e) { /* ignore */ }
    }
    _iaAudioUrl = URL.createObjectURL(blob);
    var audio = new Audio(_iaAudioUrl);
    _iaAudio = audio;
    _iaSpeakingBtn = btn || null;
    setSpeakBtnState(btn, 'speaking');
    audio.onended = function () {
      if (_iaAudio === audio) stopIaSpeak();
    };
    audio.onerror = function () {
      if (_iaAudio === audio) {
        stopIaSpeak();
      }
    };
    var p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function () {
        if (_iaAudio === audio) stopIaSpeak();
      });
    }
  }

  function speakIaOpenAi(plain, btn) {
    var reqId = _iaSpeakReq;
    _iaSpeakingBtn = btn || null;
    setSpeakBtnState(btn, 'loading');
    fetch(API + '/tts', {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({
        email: state.user && state.user.email,
        text: plain,
        token: state.user && state.user.token
      })
    }).then(function (res) {
      if (reqId !== _iaSpeakReq) return null;
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (j) {
          var msg = (j && j.error) || t('ia.tts_err');
          var quota = res.status === 403 && /quota|navigateur|browser|cupo/i.test(String(msg));
          throw Object.assign(new Error(msg), { status: res.status, quota: quota, soft: true });
        });
      }
      return res.blob();
    }).then(function (blob) {
      if (reqId !== _iaSpeakReq) return;
      if (!blob || !blob.size) throw new Error(t('ia.tts_err'));
      playIaAudioBlob(blob, btn, reqId);
    }).catch(function (err) {
      if (reqId !== _iaSpeakReq) return;
      /* Divin : pas de bascule silencieuse vers speechSynthesis (sauf quota confirmé). */
      if (err && err.quota && iaSpeakSupported()) {
        var ok = false;
        try { ok = window.confirm(err.message || t('ia.tts_quota')); } catch (e0) { ok = false; }
        if (ok) {
          speakIaBrowser(plain, btn);
          return;
        }
      } else {
        try { window.alert((err && err.message) || t('ia.tts_err')); } catch (e1) { /* ignore */ }
      }
      stopIaSpeak();
    });
  }

  function speakIaText(text, btn) {
    if (!iaSpeakAvailable()) return;
    if (btn && btn === _iaSpeakingBtn) {
      stopIaSpeak();
      return;
    }
    stopIaSpeak();
    stopMsTtsAudio();
    var plain = stripIaSpeakText(text);
    if (!plain) return;
    /* Divin : OpenAI /tts. Autres plans IA : speechSynthesis navigateur. */
    if (canOpenAiTts()) {
      if (!state.user || !state.user.token) {
        try { window.alert(t('ia.tts_need_auth')); } catch (e) { /* ignore */ }
        return;
      }
      speakIaOpenAi(plain.slice(0, 4000), btn);
      return;
    }
    speakIaBrowser(plain, btn);
  }

  /* ——— Full-manuscript Écouter (Divin, cached server audio) ——— */
  var _msTts = {
    kind: null,
    req: 0,
    pollTimer: null,
    audio: null,
    audioUrl: null,
    mode: 'idle', /* idle | loading | playing | paused */
    progress: null
  };

  function clearMsTtsPoll() {
    if (_msTts.pollTimer) {
      try { clearTimeout(_msTts.pollTimer); } catch (e) { /* ignore */ }
      _msTts.pollTimer = null;
    }
  }

  function stopMsTtsAudio() {
    clearMsTtsPoll();
    _msTts.req += 1;
    if (_msTts.audio) {
      try { _msTts.audio.pause(); } catch (e) { /* ignore */ }
      try { _msTts.audio.src = ''; } catch (e2) { /* ignore */ }
      _msTts.audio = null;
    }
    if (_msTts.audioUrl) {
      try { URL.revokeObjectURL(_msTts.audioUrl); } catch (e3) { /* ignore */ }
      _msTts.audioUrl = null;
    }
    _msTts.mode = 'idle';
    _msTts.progress = null;
    _msTts.kind = null;
    syncMsTtsButtons();
  }

  function msTtsHasFrame(kind) {
    if (kind === 'natal') return !!(natalCanRead() && (natalPdfUrl() || state.natalPreview));
    if (kind === 'ultime') return !!(ultimeCanRead() && (ultimePdfUrl() || state.ultimePreview));
    if (kind === 'mois' || kind === 'jour') return !!(periodCanRead(kind) && (periodPdfUrl(kind) || (state.periodPreviewKind === kind && state.periodPreview)));
    if (kind === 'couple') return !!(coupleCanRead() && (couplePdfUrl() || state.couplePreview));
    return false;
  }

  function syncMsTtsButtons() {
    var btn = document.getElementById('ms-tts');
    var stop = document.getElementById('ms-tts-stop');
    if (!btn) return;
    var label = btn.querySelector('.ms-tts-label');
    btn.classList.remove('is-loading', 'is-playing', 'is-paused');
    btn.removeAttribute('disabled');
    if (_msTts.mode === 'loading') {
      btn.classList.add('is-loading');
      btn.setAttribute('aria-pressed', 'true');
      btn.disabled = true;
      var p = _msTts.progress;
      if (label) {
        label.textContent = (p && p.total)
          ? tf('ms.tts_progress', { done: p.done || 0, total: p.total })
          : t('ms.tts_preparing');
      }
      if (stop) stop.hidden = false;
      return;
    }
    if (_msTts.mode === 'playing') {
      btn.classList.add('is-playing');
      btn.setAttribute('aria-pressed', 'true');
      if (label) label.textContent = t('ms.tts_pause');
      if (stop) stop.hidden = false;
      return;
    }
    if (_msTts.mode === 'paused') {
      btn.classList.add('is-paused');
      btn.setAttribute('aria-pressed', 'true');
      if (label) label.textContent = t('ms.tts_resume');
      if (stop) stop.hidden = false;
      return;
    }
    btn.setAttribute('aria-pressed', 'false');
    if (label) label.textContent = t('ms.tts_listen');
    if (stop) stop.hidden = true;
  }

  function playMsTtsBlob(blob, reqId, kind) {
    if (reqId !== _msTts.req) return;
    if (_msTts.audioUrl) {
      try { URL.revokeObjectURL(_msTts.audioUrl); } catch (e) { /* ignore */ }
    }
    _msTts.audioUrl = URL.createObjectURL(blob);
    var audio = new Audio(_msTts.audioUrl);
    _msTts.audio = audio;
    _msTts.kind = kind;
    _msTts.mode = 'playing';
    _msTts.progress = null;
    syncMsTtsButtons();
    audio.onended = function () {
      if (_msTts.audio === audio) stopMsTtsAudio();
    };
    audio.onerror = function () {
      if (_msTts.audio === audio) stopMsTtsAudio();
    };
    var p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function () { if (_msTts.audio === audio) stopMsTtsAudio(); });
    }
  }

  function fetchMsTtsAudio(kind, reqId) {
    var url = withAuthQuery(
      API + '/manuscript-tts-audio?kind=' + encodeURIComponent(kind) +
      '&email=' + encodeURIComponent(state.user.email)
    );
    return fetch(url, { method: 'GET', headers: authHeaders(false) }).then(function (res) {
      if (reqId !== _msTts.req) return null;
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (j) {
          throw new Error((j && j.error) || t('ms.tts_err'));
        });
      }
      return res.blob();
    }).then(function (blob) {
      if (reqId !== _msTts.req) return;
      if (!blob || !blob.size) throw new Error(t('ms.tts_err'));
      playMsTtsBlob(blob, reqId, kind);
    });
  }

  function pollMsTts(kind, reqId) {
    if (reqId !== _msTts.req) return;
    fetch(API + '/manuscript-tts', {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({
        email: state.user && state.user.email,
        token: state.user && state.user.token,
        kind: kind
      })
    }).then(function (res) {
      if (reqId !== _msTts.req) return null;
      return res.json().then(function (j) {
        if (!res.ok) throw new Error((j && j.error) || t('ms.tts_err'));
        return j;
      });
    }).then(function (j) {
      if (reqId !== _msTts.req || !j) return;
      if (j.progress) {
        _msTts.progress = j.progress;
        syncMsTtsButtons();
      }
      if (j.ready) {
        return fetchMsTtsAudio(kind, reqId);
      }
      _msTts.pollTimer = setTimeout(function () { pollMsTts(kind, reqId); }, 1800);
    }).catch(function (err) {
      if (reqId !== _msTts.req) return;
      try { window.alert((err && err.message) || t('ms.tts_err')); } catch (e) { /* ignore */ }
      stopMsTtsAudio();
    });
  }

  function startMsTts(kind) {
    if (!canOpenAiTts()) return;
    if (!state.user || !state.user.token) {
      try { window.alert(t('ia.tts_need_auth')); } catch (e) { /* ignore */ }
      return;
    }
    if (!msTtsHasFrame(kind)) {
      try { window.alert(t('ms.tts_need_file')); } catch (e2) { /* ignore */ }
      return;
    }
    stopIaSpeak();
    stopMsTtsAudio();
    var reqId = _msTts.req;
    _msTts.kind = kind;
    _msTts.mode = 'loading';
    _msTts.progress = null;
    syncMsTtsButtons();
    pollMsTts(kind, reqId);
  }

  function toggleMsTts(kind) {
    if (!canOpenAiTts()) {
      try { window.alert(t('ms.tts_lock')); } catch (e) { /* ignore */ }
      return;
    }
    if (_msTts.mode === 'loading' && _msTts.kind === kind) return;
    if (_msTts.mode === 'playing' && _msTts.kind === kind && _msTts.audio) {
      try { _msTts.audio.pause(); } catch (e1) { /* ignore */ }
      _msTts.mode = 'paused';
      syncMsTtsButtons();
      return;
    }
    if (_msTts.mode === 'paused' && _msTts.kind === kind && _msTts.audio) {
      var p = _msTts.audio.play();
      _msTts.mode = 'playing';
      syncMsTtsButtons();
      if (p && typeof p.catch === 'function') {
        p.catch(function () { stopMsTtsAudio(); });
      }
      return;
    }
    startMsTts(kind);
  }

  function manuscriptTtsControlsHtml(kind) {
    if (!kind) return '';
    if (!canOpenAiTts()) {
      return '<button type="button" class="ms-tts-btn ms-tts-lock" id="ms-tts-lock" ' +
        'aria-label="' + t('ms.tts_lock_aria') + '" title="' + t('ms.tts_lock') + '" data-plan-link="divin">' +
        '<span class="ms-tts-label">' + t('ms.tts_lock') + '</span></button>';
    }
    if (!msTtsHasFrame(kind)) return '';
    return '<div class="ms-tts-group">' +
      '<button type="button" class="ms-tts-btn" id="ms-tts" data-ms-kind="' + kind + '" ' +
        'aria-label="' + t('ms.tts_aria') + '" aria-pressed="false" title="' + t('ms.tts_aria') + '">' +
        '<span class="ms-tts-label">' + t('ms.tts_listen') + '</span></button>' +
      '<button type="button" class="ms-tts-stop" id="ms-tts-stop" hidden aria-label="' + t('ms.tts_stop') + '" title="' + t('ms.tts_stop') + '">×</button>' +
      '</div>';
  }

  function bindMsTtsControls() {
    var btn = document.getElementById('ms-tts');
    if (btn) {
      btn.onclick = function () {
        var kind = btn.getAttribute('data-ms-kind') || state.pdf;
        toggleMsTts(kind);
      };
      if (_msTts.kind && _msTts.kind === (btn.getAttribute('data-ms-kind') || state.pdf) && _msTts.mode !== 'idle') {
        syncMsTtsButtons();
      }
    }
    var stop = document.getElementById('ms-tts-stop');
    if (stop) {
      stop.onclick = function () { stopMsTtsAudio(); };
    }
    var lock = document.getElementById('ms-tts-lock');
    if (lock && !lock.getAttribute('data-bound')) {
      lock.setAttribute('data-bound', '1');
    }
  }

  function bindIaSpeakButtons(root) {
    root = root || document;
    var buttons = root.querySelectorAll('[data-ia-speak]');
    if (!buttons.length) return;
    if (!iaSpeakAvailable()) {
      for (var i = 0; i < buttons.length; i++) buttons[i].hidden = true;
      return;
    }
    for (var j = 0; j < buttons.length; j++) {
      (function (btn) {
        if (btn._iaSpeakBound) return;
        btn._iaSpeakBound = true;
        btn.hidden = false;
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
    btn.setAttribute('aria-label', _iaListening ? t('ia.mic_stop') : t('ia.mic'));
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
      alert(t('ia.speech_unsupported'));
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
    rec.lang = langLocale();
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
        alert(t('ia.mic_blocked'));
      } else if (err === 'audio-capture') {
        alert(t('ia.mic_none'));
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
      alert(t('ia.mic_fail'));
    }
  }

  function toggleIaMic() {
    if (_iaListening) {
      stopIaListen({ manual: true });
      return;
    }
    if (!iaSpeechSupported()) {
      alert(t('ia.speech_unsupported'));
      return;
    }
    startIaListen();
  }

  function bindIaMicButton() {
    var btn = document.getElementById('ia-mic');
    if (!btn) return;
    if (!iaSpeechSupported()) {
      btn.title = t('ia.mic_unsupported');
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
        '<div class="ia-bubble-head"><span class="ia-bubble-name">' + t('ia.you') + '</span></div>' +
        '<div class="ia-bubble-body">' + text + '</div></div>';
    }
    return '<div class="ia-bubble bot ia-bubble-bot">' +
      '<div class="ia-bubble-head">' +
        '<img class="ia-bubble-avatar" src="/assets/ia-celeste.png" alt="" width="40" height="40" loading="lazy">' +
        '<span class="ia-bubble-name">' + t('ia.reply_name') + '</span>' +
      '</div>' +
      '<div class="ia-bubble-body">' + text + '</div>' +
      '<button type="button" class="ia-speak" data-ia-speak aria-label="' + t('ia.listen_aria') + '" aria-pressed="false">' +
        '<svg class="ia-speak-ic" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">' +
          '<path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>' +
        '</svg>' +
        '<span class="ia-speak-label">' + t('ia.listen') + '</span>' +
      '</button></div>';
  }

  /** Met à jour le chat IA sans re-render de toute la page (conserve le scroll lecteur). */

  function refreshIaChatDom() {
    var logEl = document.getElementById('ia-log');
    if (!logEl) return false;
    stopIaSpeak();
    var msgs = state.iaMessages || [];
    var empty = '<p class="muted ia-empty">' + t('ia.empty') + '</p>';
    logEl.innerHTML = msgs.length ? msgs.map(iaBubbleHtml).join('') : empty;
    logEl.scrollTop = logEl.scrollHeight;
    bindIaSpeakButtons(logEl);
    var left = iaLeft();
    var disabled = state.iaBusy || left <= 0;
    var sendBtn = document.getElementById('send-ia');
    if (sendBtn) {
      sendBtn.disabled = disabled;
      sendBtn.textContent = state.iaBusy
        ? t('ia.busy')
        : (left <= 0 ? t('ia.rest') : t('ia.send'));
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
    if (state.pdf === 'natal' || state.pdf === 'mois' || state.pdf === 'jour' || state.pdf === 'couple' || state.pdf === 'ultime') {
      state.iaContext = state.pdf;
    }
    scrollReaderIaIntoView();
    if (!canIa()) return;
    var q = tf('ia.ask_develop', { passage: passage.slice(0, 1500) });
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
    btn.setAttribute('aria-label', on ? t('reader.fs_exit') : t('reader.fs_enter'));
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.title = on ? t('reader.fs_exit') : t('reader.fs_enter');
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
    return Number(n) === 1 ? t('free.ms_one') : t('free.ms_many');
  }

  function freeQuotaBanner() {
    if (!hasFreeQuotas()) return '';
    var dLim = freeDailyLimit();
    var mLim = freeMonthlyLimit();
    var dLeft = freeDailyRemaining();
    var mLeft = freeMonthlyRemaining();
    var full = dLeft >= dLim && mLeft >= mLim;
    var text = full
      ? tf('free.banner_full', { m: mLim, mw: manusWord(mLim), d: dLim, dw: manusWord(dLim) })
      : tf('free.banner_left', { m: mLeft, mw: manusWord(mLeft), d: dLeft, dw: manusWord(dLeft) });
    var upgrade = (plan() === 'gratuit' && !isPausedPaid())
      ? '<button class="btn ghost free-quota-upgrade" type="button" data-plan-link="celeste">' + t('ia.pass_celeste') + '</button>'
      : '';
    return '<div class="free-quota-banner" role="status">' +
      '<span class="free-quota-star" aria-hidden="true">✦</span>' +
      '<div class="free-quota-body"><p>' + text + '</p>' + upgrade + '</div></div>';
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
    try {
      return new Intl.DateTimeFormat(langLocale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
    } catch (e) {
      return d.toDateString();
    }
  }

  function monthLabel() {
    var d = new Date();
    try {
      return new Intl.DateTimeFormat(langLocale(), { month: 'long', year: 'numeric' }).format(d);
    } catch (e) {
      return String(d.getMonth() + 1) + ' ' + d.getFullYear();
    }
  }

  function emphasizeLife(prefixHtml) {
    return prefixHtml + ' <span class="de-ta-vie">' + t('natal.of_life') + '</span>';
  }

  function natalTitleHtml() {
    return emphasizeLife(t('natal.title'));
  }

  function natalTitlePlain() {
    return t('natal.title_plain');
  }

  function ultimeTitleHtml() {
    return emphasizeLife(t('ultime.title'));
  }

  function ultimeTitlePlain() {
    return t('ultime.title_plain');
  }

  function monthNameUpper() {
    var d = new Date();
    try {
      return new Intl.DateTimeFormat(langLocale(), { month: 'long' }).format(d).toLocaleUpperCase(langLocale());
    } catch (e) {
      return String(d.getMonth() + 1);
    }
  }

  function moisTitleHtml() {
    return tf('mois.title_html', { month: monthNameUpper() });
  }

  function moisTitlePlain() {
    return tf('mois.title_plain', { month: monthNameUpper() });
  }

  function jourTitlePlain() {
    var d = new Date();
    var dateStr;
    try {
      dateStr = new Intl.DateTimeFormat(langLocale(), { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
    } catch (e) {
      dateStr = d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
    }
    return tf('jour.title', { date: dateStr });
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
      state.coupleGenError = t('couple.not_ready');
      render();
      return;
    }
    var u = withAuthQuery(couplePdfUrl());
    if (!u) {
      state.coupleGenError = t('couple.missing_link');
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
          state.tab = 'couple';
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
        state.coupleGenError = t('couple.file_missing');
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
          state.tab = kind;
          state.pdf = kind;
          state.iaContext = kind;
          state.iaLoaded = false;
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
          state.tab = 'natal';
          state.pdf = 'natal';
          state.iaContext = 'natal';
          state.iaLoaded = false;
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
      state.ultimeGenError = 'Ton Manuscrit Ultime n’est pas encore disponible. Appuie sur « Demander le Manuscrit Ultime ».';
      render();
      return;
    }
    var u = withAuthQuery(url || ultimePdfUrl());
    if (!u) {
      state.ultimeGenError = 'Lien Manuscrit Ultime manquant. Reconnecte-toi puis réessaie.';
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
          state.tab = 'natal';
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
        state.ultimeGenError = 'Le fichier du Manuscrit Ultime est introuvable. Relance « Demander le Manuscrit Ultime ».';
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
            state.ultimeGenError = u.ultimeError || 'La génération du Manuscrit Ultime n’a pas pu aboutir. Réessaie.';
            render();
            return;
          }
          if (tries >= maxTries) {
            state.busy = null;
            state.ultimeGenError = 'Le Manuscrit Ultime prend plus longtemps que prévu. Reviens dans quelques minutes — il s’ouvrira dès qu’il est prêt.';
            render();
            return;
          }
          render();
          setTimeout(tick, 5000);
        })
        .catch(function () {
          if (tries >= maxTries) {
            state.busy = null;
            state.ultimeGenError = 'Connexion interrompue pendant la génération du Manuscrit Ultime. Réessaie.';
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
    var onboardLangEl = document.getElementById('onboard-lang');
    if (onboardLangEl && onboardLangEl.value && !accountLangLocked()) {
      applyLang(onboardLangEl.value, true);
      if (state.user) {
        state.user.language = state.lang;
        state.user.locale = state.lang;
      }
    }
    var btnLabel = wasEdit ? 'Enregistrer les modifications' : 'Enregistrer mon profil';
    var btn = document.getElementById('save-profile');
    if (btn) { btn.disabled = true; btn.textContent = 'Enregistrement…'; }

    function postProfile(geo) {
      fetch(API + '/profile', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify((function () {
          var payload = {
            email: email,
            token: state.user && state.user.token,
            birthDate: birthDate,
            birthTime: birthTime,
            birthPlace: birthPlace,
            birthLat: geo.lat,
            birthLon: geo.lon,
            birthTimezone: geo.timezone || '',
            gender: gender
          };
          var langEl = document.getElementById('onboard-lang');
          if (langEl && langEl.value && !accountLangLocked()) {
            payload.language = normalizeLang(langEl.value);
            payload.locale = payload.language;
          }
          return payload;
        })())
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
      showIaQuotaModal();
      scrollReaderIaIntoView();
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

  /* ——— Mode IA live (OpenAI Realtime WebRTC) ——— */
  var _live = {
    open: false,
    connecting: false,
    sessionId: null,
    pc: null,
    dc: null,
    stream: null,
    audioEl: null,
    muted: false,
    speaking: false,
    maxMs: 15 * 60 * 1000,
    timer: null,
    endedAt: null,
    voiceNote: null,
    pendingUser: '',
    pendingBot: '',
    turnBusy: false
  };

  function liveStatusText() {
    if (_live.connecting) return t('ia.live_connecting');
    if (_live.muted) return t('ia.live_muted');
    if (_live.speaking) return t('ia.live_speaking');
    return t('ia.live_listening');
  }

  function refreshLiveUi() {
    var overlay = document.getElementById('ia-live-overlay');
    if (!overlay) return;
    var status = overlay.querySelector('[data-live-status]');
    if (status) status.textContent = liveStatusText();
    var quota = overlay.querySelector('[data-live-quota]');
    if (quota) {
      quota.textContent = tf('ia.live_quota', { left: iaLeft(), quota: iaQuota() || '—' });
      quota.classList.toggle('is-out', iaLeft() <= 0);
    }
    var portrait = overlay.querySelector('.ia-live-portrait');
    if (portrait) {
      portrait.classList.toggle('is-speaking', !!_live.speaking && !_live.connecting);
      portrait.classList.toggle('is-connecting', !!_live.connecting);
    }
    var muteBtn = overlay.querySelector('#ia-live-mute');
    if (muteBtn) {
      muteBtn.setAttribute('aria-pressed', _live.muted ? 'true' : 'false');
      muteBtn.textContent = _live.muted ? t('ia.live_unmute') : t('ia.live_mute');
    }
  }

  function closeLiveOverlayDom() {
    var overlay = document.getElementById('ia-live-overlay');
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }

  function ensureLiveOverlay() {
    var existing = document.getElementById('ia-live-overlay');
    if (existing) return existing;
    var el = document.createElement('div');
    el.id = 'ia-live-overlay';
    el.className = 'ia-live-overlay';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', t('ia.live'));
    el.innerHTML =
      '<div class="ia-live-sheet">' +
        '<div class="ia-live-portrait" aria-hidden="true">' +
          '<img src="/assets/ia-celeste.png" alt="" width="220" height="220">' +
          '<span class="ia-live-glow"></span>' +
        '</div>' +
        '<h2 class="ia-live-title">' + t('ia.live') + '</h2>' +
        '<p class="ia-live-status" data-live-status>' + t('ia.live_connecting') + '</p>' +
        '<p class="ia-live-quota" data-live-quota>' + tf('ia.live_quota', { left: iaLeft(), quota: iaQuota() || '—' }) + '</p>' +
        '<p class="muted ia-live-hint">' + t('ia.live_hint') + '</p>' +
        '<p class="muted ia-live-voice" data-live-voice hidden></p>' +
        '<div class="ia-live-actions">' +
          '<button type="button" class="btn ghost" id="ia-live-mute">' + t('ia.live_mute') + '</button>' +
          '<button type="button" class="btn" id="ia-live-end">' + t('ia.live_end') + '</button>' +
        '</div>' +
        '<audio id="ia-live-audio" autoplay playsinline></audio>' +
      '</div>';
    document.body.appendChild(el);
    el.querySelector('#ia-live-mute').onclick = function () { toggleLiveMute(); };
    el.querySelector('#ia-live-end').onclick = function () { endIaLive({ reason: 'user' }); };
    return el;
  }

  function liveSendEvent(obj) {
    if (!_live.dc || _live.dc.readyState !== 'open') return;
    try { _live.dc.send(JSON.stringify(obj)); } catch (e) { /* ignore */ }
  }

  function reportLiveTurn() {
    if (!_live.sessionId || _live.turnBusy) return Promise.resolve();
    if (iaLeft() <= 0) {
      endIaLive({ reason: 'quota', message: t('ia.live_quota_block') });
      return Promise.resolve();
    }
    _live.turnBusy = true;
    var payload = {
      email: state.user && state.user.email,
      token: state.user && state.user.token,
      sessionId: _live.sessionId,
      context: normalizeIaCtx(state.iaContext),
      userText: _live.pendingUser || '',
      assistantText: _live.pendingBot || ''
    };
    _live.pendingUser = '';
    _live.pendingBot = '';
    return fetch(API + '/ia-live/turn', {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, status: r.status, data: j }; });
    }).then(function (res) {
      _live.turnBusy = false;
      if (res.status === 401) {
        endIaLive({ reason: 'auth' });
        forceReLogin((res.data && res.data.error) || 'Session expirée.');
        return;
      }
      if (res.data && res.data.contact) applyAccess(res.data.contact);
      refreshLiveUi();
      if (!res.ok) {
        var msg = (res.data && res.data.error) || t('ia.live_quota_block');
        endIaLive({ reason: 'quota', message: msg });
      }
    }).catch(function () {
      _live.turnBusy = false;
    });
  }

  function handleLiveToolCall(item) {
    if (!item || item.name !== 'get_manuscript_excerpt') return;
    var args = {};
    try { args = JSON.parse(item.arguments || '{}'); } catch (e) { args = {}; }
    fetch(API + '/ia-live/excerpt', {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({
        email: state.user && state.user.email,
        token: state.user && state.user.token,
        sessionId: _live.sessionId,
        context: normalizeIaCtx(state.iaContext),
        query: args.query || '',
        offset: args.offset,
        maxChars: args.maxChars
      })
    }).then(function (r) { return r.json(); })
      .then(function (j) {
        var out = JSON.stringify({
          ok: !!(j && j.ok),
          text: (j && j.text) || '',
          offset: j && j.offset,
          total: j && j.total,
          nextOffset: j && j.nextOffset,
          error: (j && j.error) || null
        });
        liveSendEvent({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: item.call_id,
            output: out
          }
        });
        liveSendEvent({ type: 'response.create' });
      })
      .catch(function () {
        liveSendEvent({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: item.call_id,
            output: JSON.stringify({ ok: false, error: 'excerpt_unavailable' })
          }
        });
        liveSendEvent({ type: 'response.create' });
      });
  }

  function onLiveServerEvent(raw) {
    var ev;
    try { ev = JSON.parse(raw); } catch (e) { return; }
    if (!ev || !ev.type) return;
    if (ev.type === 'input_audio_buffer.speech_started') {
      _live.speaking = false;
      refreshLiveUi();
      return;
    }
    if (ev.type === 'output_audio_buffer.started' || ev.type === 'response.output_audio.delta' ||
        ev.type === 'response.audio.delta') {
      _live.speaking = true;
      refreshLiveUi();
      return;
    }
    if (ev.type === 'output_audio_buffer.stopped' || ev.type === 'response.output_audio.done' ||
        ev.type === 'response.audio.done') {
      _live.speaking = false;
      refreshLiveUi();
      return;
    }
    if (ev.type === 'conversation.item.input_audio_transcription.completed') {
      _live.pendingUser = String(ev.transcript || '').trim();
      return;
    }
    if (ev.type === 'response.output_audio_transcript.done' ||
        ev.type === 'response.audio_transcript.done') {
      _live.pendingBot = String(ev.transcript || '').trim();
      return;
    }
    if (ev.type === 'response.done') {
      _live.speaking = false;
      refreshLiveUi();
      var resp = ev.response || {};
      var outputs = resp.output || [];
      var hasFn = false;
      var hasMessage = false;
      for (var i = 0; i < outputs.length; i++) {
        var item = outputs[i];
        if (!item) continue;
        if (item.type === 'function_call') {
          hasFn = true;
          handleLiveToolCall(item);
        }
        if (item.type === 'message' || item.type === 'audio') hasMessage = true;
      }
      if (!hasFn && resp.status === 'completed' && (hasMessage || _live.pendingBot || _live.pendingUser)) {
        reportLiveTurn();
      }
    }
  }

  function cleanupLivePeer() {
    if (_live.timer) {
      clearTimeout(_live.timer);
      _live.timer = null;
    }
    try {
      if (_live.dc) { _live.dc.onmessage = null; _live.dc.close(); }
    } catch (e0) { /* ignore */ }
    _live.dc = null;
    try {
      if (_live.pc) _live.pc.close();
    } catch (e1) { /* ignore */ }
    _live.pc = null;
    if (_live.stream) {
      try {
        _live.stream.getTracks().forEach(function (tr) { tr.stop(); });
      } catch (e2) { /* ignore */ }
    }
    _live.stream = null;
    if (_live.audioEl) {
      try {
        _live.audioEl.srcObject = null;
        _live.audioEl.pause();
      } catch (e3) { /* ignore */ }
    }
    _live.audioEl = null;
  }

  function endIaLive(opts) {
    opts = opts || {};
    var sid = _live.sessionId;
    var wasOpen = _live.open || _live.connecting;
    _live.open = false;
    _live.connecting = false;
    _live.speaking = false;
    _live.sessionId = null;
    cleanupLivePeer();
    closeLiveOverlayDom();
    if (sid && state.user && state.user.token) {
      fetch(API + '/ia-live/end', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({
          email: state.user.email,
          token: state.user.token,
          sessionId: sid
        })
      }).catch(function () {});
    }
    if (wasOpen && opts.reason === 'quota') {
      showIaQuotaModal();
    } else if (wasOpen && opts.message) {
      try { window.alert(opts.message); } catch (e) { /* ignore */ }
    } else if (wasOpen && opts.reason === 'expired') {
      try { window.alert(t('ia.live_expired')); } catch (e2) { /* ignore */ }
    }
    if (!refreshIaChatDom()) {
      /* quota line may have changed */
    }
  }

  function toggleLiveMute() {
    _live.muted = !_live.muted;
    if (_live.stream) {
      _live.stream.getAudioTracks().forEach(function (tr) { tr.enabled = !_live.muted; });
    }
    refreshLiveUi();
  }

  function startIaLive() {
    if (!canIa()) {
      scrollReaderIaIntoView();
      return;
    }
    if (iaLeft() <= 0) {
      showIaQuotaModal();
      return;
    }
    if (_live.open || _live.connecting) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      try { window.alert(t('ia.live_mic')); } catch (e1) { /* ignore */ }
      return;
    }
    stopIaSpeak();
    stopIaListen({ manual: true });
    stopMsTtsAudio();
    _live.connecting = true;
    _live.open = true;
    _live.muted = false;
    _live.speaking = false;
    _live.pendingUser = '';
    _live.pendingBot = '';
    ensureLiveOverlay();
    refreshLiveUi();

    var selectedPassage = '';
    try {
      var sel = window.getSelection && window.getSelection();
      if (sel && String(sel).trim().length >= 12) selectedPassage = String(sel).trim().slice(0, 4000);
    } catch (e2) { /* ignore */ }

    var micPromise = navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    var tokenPromise = fetch(API + '/ia-live/session', {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({
        email: state.user && state.user.email,
        token: state.user && state.user.token,
        context: normalizeIaCtx(state.iaContext),
        selectedPassage: selectedPassage
      })
    }).then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, status: r.status, data: j }; });
    });

    Promise.all([micPromise, tokenPromise]).then(function (pack) {
      if (!_live.open) {
        try { pack[0].getTracks().forEach(function (tr) { tr.stop(); }); } catch (e3) { /* ignore */ }
        return;
      }
      var stream = pack[0];
      var res = pack[1];
      if (res.status === 401) {
        stream.getTracks().forEach(function (tr) { tr.stop(); });
        endIaLive({ reason: 'auth' });
        forceReLogin((res.data && res.data.error) || 'Session expirée.');
        return;
      }
      if (!res.ok || !res.data || !res.data.clientSecret) {
        stream.getTracks().forEach(function (tr) { tr.stop(); });
        var errMsg = (res.data && res.data.error) || t('ia.live_err');
        endIaLive({ reason: 'error', message: errMsg });
        return;
      }
      if (res.data.contact) applyAccess(res.data.contact);
      _live.sessionId = res.data.sessionId;
      _live.maxMs = res.data.maxMs || _live.maxMs;
      _live.stream = stream;
      _live.voiceNote = res.data.voiceNote || null;

      var overlay = ensureLiveOverlay();
      var voiceEl = overlay.querySelector('[data-live-voice]');
      if (voiceEl) {
        if (res.data.voice) {
          voiceEl.hidden = false;
          voiceEl.textContent = tf('ia.live_voice_note', { voice: res.data.voice }) +
            (res.data.voiceNote ? (' — ' + res.data.voiceNote) : '');
        } else {
          voiceEl.hidden = true;
        }
      }
      refreshLiveUi();

      var pc = new RTCPeerConnection();
      _live.pc = pc;
      stream.getTracks().forEach(function (tr) { pc.addTrack(tr, stream); });

      var audioEl = overlay.querySelector('#ia-live-audio');
      _live.audioEl = audioEl;
      pc.ontrack = function (e) {
        if (audioEl && e.streams && e.streams[0]) {
          audioEl.srcObject = e.streams[0];
          try { audioEl.play(); } catch (e4) { /* ignore */ }
        }
      };

      var dc = pc.createDataChannel('oai-events');
      _live.dc = dc;
      dc.onmessage = function (ev) { onLiveServerEvent(ev.data); };
      dc.onopen = function () {
        _live.connecting = false;
        refreshLiveUi();
      };

      return pc.createOffer().then(function (offer) {
        return pc.setLocalDescription(offer).then(function () {
          return new Promise(function (resolve) {
            if (pc.iceGatheringState === 'complete') return resolve();
            var done = false;
            var finish = function () {
              if (done) return;
              done = true;
              pc.removeEventListener('icegatheringstatechange', onIce);
              clearTimeout(to);
              resolve();
            };
            var onIce = function () {
              if (pc.iceGatheringState === 'complete') finish();
            };
            var to = setTimeout(finish, 2500);
            pc.addEventListener('icegatheringstatechange', onIce);
          });
        });
      }).then(function () {
        return fetch('https://api.openai.com/v1/realtime/calls', {
          method: 'POST',
          body: pc.localDescription.sdp,
          headers: {
            Authorization: 'Bearer ' + res.data.clientSecret,
            'Content-Type': 'application/sdp'
          }
        });
      }).then(function (sdpRes) {
        if (!sdpRes.ok) throw new Error('webrtc ' + sdpRes.status);
        return sdpRes.text();
      }).then(function (answer) {
        return pc.setRemoteDescription({ type: 'answer', sdp: answer });
      }).then(function () {
        _live.connecting = false;
        refreshLiveUi();
        _live.timer = setTimeout(function () {
          endIaLive({ reason: 'expired' });
        }, _live.maxMs);
      });
    }).catch(function (err) {
      var name = err && err.name;
      var msg = name === 'NotAllowedError' || name === 'PermissionDeniedError'
        ? t('ia.live_mic')
        : t('ia.live_err');
      endIaLive({ reason: 'error', message: msg });
    });
  }

  function apiLogin(email, password) {
    return fetch(API + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        password: password,
        language: state.lang,
        locale: state.lang
      })
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
        '<div class="brand"><span class="star">✦</span><h1>' + t('brand.name_html') + '</h1>' +
        '<p class="lede">' + t('login.lede') + '</p></div>' +
        '<div class="card stack">' +
          languageBlockHtml('login-lang', 'lang.warn_login') +
          '<div class="field">' +
            '<span class="label">' + t('account.appearance') + '</span>' +
            '<p class="muted acct-hint" style="margin:0 0 .35rem">' + t('account.appearance_hint') + '</p>' +
            themeToggleHtml(false) +
          '</div>' +
          '<div class="field"><label class="label" for="email">' + t('login.email') + '</label>' +
          '<input class="input" id="email" type="email" placeholder="' + t('login.email_ph') + '" autocomplete="username"></div>' +
          '<div class="field"><label class="label" for="password">' + t('login.password') + '</label>' +
          '<input class="input" id="password" type="password" placeholder="' + t('login.password_ph') + '" autocomplete="current-password"></div>' +
          '<button class="btn" id="go-in">' + t('login.submit') + '</button>' +
          '<p class="lede" style="font-size:.85rem;text-align:center">' + t('login.hint') + '</p>' +
        '</div></div></div>';
  }


  function installView() {
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    var steps = ios ? '<p class="install-steps">' + t('install.steps_ios') + '</p>'
      : '<p class="install-steps">' + t('install.steps_android') + '</p>';
    return '<div class="screen"><div class="scroll noshift stack" style="justify-content:center;max-width:420px;margin:0 auto;width:100%">' +
      '<div class="brand"><span class="star">✦</span><h1>' + t('install.title_html') + '</h1>' +
      '<p class="lede">' + t('install.lede') + '</p></div>' +
      '<div class="card stack">' + steps +
      '<button class="btn" id="install-btn">' + t('install.add') + '</button>' +
      '<button class="link" id="skip-install">' + t('install.skip') + '</button>' +
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
      lede = tf('onboard.lede_new', { email: u.email || t('login.email') });
    } else if (readOnly) {
      lede = t('onboard.lede_readonly');
    } else {
      lede = tf('onboard.lede_edit', { n: remaining, s: pluralS(remaining) });
    }
    var natalNote = '';
    if (editing && (u.natalReady || u.natalFileExists || u.natalStatus === 'ready')) {
      natalNote = '<p class="muted">' + t('onboard.natal_note') + '</p>';
    }
    var remainingLine = editing
      ? ('<p class="muted" id="profile-edits-left">' +
        (readOnly
          ? t('onboard.edits_none')
          : tf('onboard.edits_left', { n: remaining, s: pluralS(remaining) })) +
        '</p>')
      : '';
    var saveBtn = readOnly
      ? '<button class="btn" id="save-profile" disabled>' + t('onboard.no_more') + '</button>'
      : ('<button class="btn" id="save-profile">' +
        (editing ? t('onboard.save_edit') : t('onboard.save_new')) + '</button>');
    var backOrSkip = editing
      ? '<button class="link" id="cancel-edit-profile">' + t('onboard.back') + '</button>'
      : (canNatal() ? '' : '<button class="link" id="skip-onboarding">' + t('onboard.later') + '</button>');
    return '<div class="screen">' +
      '<div class="scroll noshift stack" style="justify-content:center;max-width:420px;margin:0 auto;width:100%">' +
        '<div class="brand"><span class="star">✦</span><h1>' + t('onboard.title_html') + '</h1>' +
        '<p class="lede">' + lede + '</p></div>' +
        '<div class="card stack">' +
          remainingLine +
          natalNote +
          (!editing
            ? languageBlockHtml('onboard-lang', 'lang.lock_notice')
            : ('<div class="field"><span class="label">' + t('account.language') + '</span>' +
              '<p class="acct-value">' + tf('account.language_value', { lang: langNativeLabel(u.language || u.locale || state.lang) }) + '</p>' +
              '<p class="muted">' + t('lang.warn_account') + '</p></div>')) +
          '<div class="field"><label class="label" for="birth-date">' + t('onboard.birth_date') + '</label>' +
          '<input class="input" id="birth-date" type="date" value="' + (u.birthDate || '') + '" required' + ro + '></div>' +
          '<div class="field"><label class="label" for="birth-time">' + t('onboard.birth_time') + '</label>' +
          '<input class="input" id="birth-time" type="time" value="' + (u.birthTime || '') + '" required' + ro + '></div>' +
          '<div class="field"><label class="label" for="birth-place">' + t('onboard.birth_place') + '</label>' +
          '<div class="autocomplete-wrap">' +
          '<input class="input" id="birth-place" type="text" placeholder="' + t('onboard.place_ph') + '" value="' + (u.birthPlace || '').replace(/"/g, '&quot;') + '" autocomplete="off"' + ro + '>' +
          '<div class="autocomplete-dropdown" id="birth-place-dropdown"></div>' +
          '</div></div>' +
          '<div class="field"><span class="label">' + t('onboard.gender') + '</span>' +
          '<div class="gender-row">' + genderOpt('femme', t('gender.femme')) + genderOpt('homme', t('gender.homme')) + genderOpt('autre', t('gender.autre')) + '</div></div>' +
          saveBtn +
          backOrSkip +
        '</div></div></div>';
  }


  function topbar() {
    var u = state.user || {};
    return '<div class="topbar"><span class="kicker">' + t('brand.name') + '</span>' +
      '<div class="topbar-actions">' +
        themeToggleHtml(true) +
        '<button class="avatar" id="open-account" aria-label="' + t('brand.account_aria') + '">' + initial(u.prenom) + '</button>' +
      '</div></div>';
  }

  function nav() {
    var tabs = [
      ['natal', '✦', t('nav.vie')],
      ['mois', '☽', t('nav.mois')],
      ['jour', '☀', t('nav.jour')],
      ['couple', '♡', t('nav.couple')]
    ];
    return '<nav class="nav">' + tabs.map(function (tab) {
      return '<button data-tab="' + tab[0] + '" class="' + (state.tab === tab[0] ? 'active' : '') + '"><span class="ic">' + tab[1] + '</span>' + tab[2] + '</button>';
    }).join('') + '</nav>';
  }


  function pauseBanner() {
    if (!isPausedPaid()) return '';
    var u = state.user || {};
    var ultimePauseNote = plan() === 'divin'
      ? ''
      : '<p class="muted">' + tf('pause.ultime_note', { n: monthsPaid() }) + '</p>';
    return '<div class="card pause-banner stack">' +
      '<div class="label">' + t('pause.label') + '</div>' +
      '<h2>' + t('pause.title') + '</h2>' +
      '<p>' + tf('pause.body', { plan: (u.planLabel) || '' }) + '</p>' +
      ultimePauseNote +
      '<button class="btn" type="button" data-plan-link="manage">' + t('pause.resume') + '</button>' +
      '<button class="btn ghost" type="button" id="retry-access">' + t('pause.refresh') + '</button>' +
      '</div>';
  }


  function natalStatusLine() {
    var u = state.user || {};
    if (!profileComplete()) {
      return '<p class="muted">' + t('natal.need_profile') + '</p>' +
        '<button class="btn" type="button" id="edit-profile-natal">' + t('natal.fill_profile') + '</button>';
    }
    if (state.natalGenError || u.natalStatus === 'error') {
      var errRaw = state.natalGenError || u.natalError || t('natal.err_generic');
      var errSafe = String(errRaw).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (/HD_API_TOKEN|CLAUDE_KEY|ANTHROPIC|manquant/i.test(errRaw)) {
        errSafe = t('natal.err_soft');
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
      return '<p class="muted">' + t('natal.ready') + '</p>';
    }
    return '<p class="muted">' + t('natal.waiting') + '</p>';
  }


  function ultimeStatusLine() {
    var u = state.user || {};
    if (!profileComplete()) {
      return '<p class="muted">' + t('ultime.need_profile') + '</p>' +
        '<button class="btn" type="button" id="edit-profile-natal">' + t('natal.fill_profile') + '</button>';
    }
    if (state.ultimeGenError || u.ultimeStatus === 'error') {
      var errRaw = state.ultimeGenError || u.ultimeError || t('ultime.err_generic');
      var errSafe = String(errRaw).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (/HD_API_TOKEN|CLAUDE_KEY|ANTHROPIC|manquant/i.test(errRaw)) {
        errSafe = t('ultime.err_soft');
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
      return '<p class="muted">' + t('ultime.ready') + '</p>';
    }
    return '<p class="muted">' + t('ultime.waiting') + '</p>';
  }


  function pagesBadgeHtml(kind) {
    if (kind === 'ultime') {
      return '<div class="pages-badge pages-badge--ultime" aria-label="' + t('ultime.pages_badge_aria') + '">' +
        '<span class="pages-badge-num">~180</span>' +
        '<span class="pages-badge-unit">' + t('pages.unit') + '</span></div>';
    }
    return '<div class="pages-badge pages-badge--natal" aria-label="' + t('natal.pages_badge_aria') + '">' +
      '<span class="pages-badge-num">~33</span>' +
      '<span class="pages-badge-unit">' + t('pages.unit') + '</span></div>';
  }

  function natalTab() {
    var prenom = (state.user && state.user.prenom) || t('welcome.you');
    var months = monthsPaid();
    var left = Math.max(0, ULTIME.need - months);
    var unlocked = canUltime();
    var readyProfile = profileComplete();
    var natalAsk = t('natal.ask');
    var natalRead = t('natal.read');
    var planLbl = ((state.user && state.user.planLabel) || t('plan.free')) + (isPausedPaid() ? t('plan.pause_suffix') : '');
    var natalInline = state.pdf === 'natal' ? pdfView('natal') : '';
    var ultimeInline = state.pdf === 'ultime' ? pdfView('ultime') : '';
    var natalCard = canNatal()
      ? '<div class="card stack"><div class="label">' + t('natal.kicker') + '</div><h2>' + natalTitleHtml() + '</h2>' +
        pagesBadgeHtml('natal') +
        '<p>' + t('natal.intro') + '</p>' +
        natalStatusLine() +
        (readyProfile ? askBtn('natal', natalAsk, natalRead) : '') +
        natalInline +
        '</div>'
      : '<div class="card lock stack"><div class="label">' + t('plan.celeste') + '</div><h2>' + natalTitleHtml() + '</h2>' +
        pagesBadgeHtml('natal') +
        '<p class="muted">' + t('natal.pages_price') + '</p><p>' + (isPausedPaid() ? t('natal.lock_paused') : t('natal.lock_need')) + '</p>' +
        (isPausedPaid() ? '' :
          '<button class="btn" type="button" data-plan-link="celeste">' + t('ia.pass_celeste') + '</button>' +
          '<button class="btn ghost" type="button" data-plan-link="divin">' + t('ia.pass_divin') + '</button>') +
        '</div>';
    var ultimeAsk = t('ultime.ask');
    var ultimeRead = t('ultime.read');
    var ultime;
    if (unlocked) {
      ultime = '<div class="card stack"><div class="label">' + t('plan.unlocked') + '</div><h2>' + ultimeTitleHtml() + '</h2>' +
        pagesBadgeHtml('ultime') +
        '<p class="muted">' + tf('ultime.pages_plain', { n: ULTIME.pages }) + '</p><p>' + (plan() === 'divin' ? t('ultime.divin_now') : t('ultime.six_months')) + t('ultime.once') + '</p>' +
        ultimeStatusLine() +
        (readyProfile ? askBtn('ultime', ultimeAsk, ultimeRead) : '') +
        ultimeInline +
        '</div>';
    } else if (plan() === 'gratuit' && months === 0) {
      ultime = '<div class="card lock stack"><div class="label">' + t('plan.celeste_or_divin') + '</div><h2>' + ultimeTitleHtml() + '</h2>' +
        pagesBadgeHtml('ultime') +
        '<p class="muted">' + tf('ultime.pages_plain', { n: ULTIME.pages }) + '</p><p>' + t('ultime.lock_intro') + '</p>' +
        '<button class="btn" type="button" data-plan-link="celeste">' + t('ia.pass_celeste') + '</button>' +
        '<button class="btn ghost" type="button" data-plan-link="divin">' + t('ia.pass_divin') + '</button></div>';
    } else if (ultimeOn() && isPausedPaid()) {
      ultime = '<div class="card lock stack"><div class="label">' + t('plan.paused') + '</div><h2>' + ultimeTitleHtml() + '</h2>' +
        pagesBadgeHtml('ultime') +
        '<p class="muted">' + tf('ultime.pages_unlocked', { n: ULTIME.pages }) + '</p><p>' + t('ultime.pause_reopen') +
        (plan() === 'divin' ? '' : tf('ultime.months_kept', { n: months })) +
        '</p></div>';
    } else {
      ultime = '<div class="card lock stack"><div class="label">' + t('plan.locked') + '</div><h2>' + ultimeTitleHtml() + '</h2>' +
        pagesBadgeHtml('ultime') +
        '<p class="muted">' + tf('ultime.pages_locked', { n: ULTIME.pages }) + '</p><p>' + tf('ultime.lock_progress', { have: months, left: left }) + '</p></div>';
    }
    return '<div class="hero-month"><div class="label">' + tf('plan.label', { name: planLbl }) + '</div>' +
      '<div class="month">' + natalTitleHtml() + '</div>' +
      '<p class="lede">' + tf('welcome.back', { name: prenom }) + '</p></div>' +
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
      var left = iaLeft();
      var quota = iaQuota();
      var planLbl = plan() === 'divin' ? t('plan.divin') : plan() === 'celeste' ? t('plan.celeste') : t('plan.free');
      return '<div class="card stack ia-card">' +
        iaPortraitHtml() +
        '<div class="label">' + planLbl + '</div><h2>' + t('ia.title') + '</h2><p class="muted">' + t('ia.available') + '</p>' +
        (quota ? '<p class="ia-quota-line' + (left <= 0 ? ' is-out' : '') + '">' + tf('ia.quota_left', { left: left, quota: quota }) + '</p>' : '') +
        '<p>' + t('ia.card_ok') + '</p>' +
        (left <= 0 ? iaUpgradeCtaHtml() : '') +
        '</div>';
    }
    return '<div class="card lock stack ia-card">' +
      iaPortraitHtml() +
      '<div class="label">' + t('ia.included') + '</div><h2>' + t('ia.title') + '</h2><p class="muted">' + t('ia.quota_plans') + '</p>' +
      '<p>' + t('ia.card_lock') + '</p>' +
      iaUpgradeCtaHtml() + '</div>';
  }


  function readerIaPanel(ctx) {
    ctx = normalizeIaCtx(ctx);
    if (!canIa()) {
      return '<div class="reader-ia lock stack">' +
        '<div class="reader-ia-head">' +
          iaPortraitHtml('ia-portrait--sm') +
          '<div><div class="label">' + t('ia.title') + '</div>' +
          '<p>' + t('ia.lock_reader') + '</p></div>' +
        '</div>' +
        iaUpgradeCtaHtml() +
        '</div>';
    }
    ensureIaHistory(ctx);
    var left = iaLeft();
    var log = (state.iaMessages || []).map(iaBubbleHtml).join('');
    var empty = '<p class="muted ia-empty">' + t('ia.empty') + '</p>';
    var disabled = state.iaBusy || left <= 0;
    return '<div class="reader-ia stack" data-ia-context="' + ctx + '">' +
      '<div class="reader-ia-head">' +
        iaPortraitHtml('ia-portrait--sm') +
        '<div><div class="label">' + t('ia.title_ms') + '</div>' +
        '<p class="muted ia-guide-line">' + t('ia.guide') + '</p>' +
        iaQuotaLineHtml({ always: true }) +
        '</div>' +
      '</div>' +
      '<div class="ia-live-launch">' +
        '<button type="button" class="btn ghost ia-live-btn" id="ia-live-open"' +
          (left <= 0 ? ' disabled' : '') +
          ' aria-label="' + t('ia.live_aria') + '">' + t('ia.live') + '</button>' +
      '</div>' +
      '<div class="ia-log" id="ia-log">' + (log || empty) + '</div>' +
      (left <= 0
        ? ('<p class="muted">' + t('ia.quota_exhausted') + '</p>' + iaUpgradeCtaHtml())
        : '') +
      '<div class="ia-compose">' +
        '<div class="field"><label class="label" for="ia-q">' + t('ia.question') + '</label>' +
        '<div class="ia-q-row">' +
          '<input class="input" id="ia-q" placeholder="' + t('ia.placeholder') + '" ' + (disabled ? 'disabled' : '') + ' autocomplete="off">' +
          '<button type="button" class="ia-mic" id="ia-mic" aria-label="' + t('ia.mic') + '" aria-pressed="false"' +
            (disabled ? ' disabled' : '') +
            ' title="' + t('ia.mic') + '">' +
            '<svg class="ia-mic-ic" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">' +
              '<path fill="currentColor" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/>' +
            '</svg>' +
          '</button>' +
        '</div></div>' +
        '<button class="btn" id="send-ia"' + (disabled ? ' disabled' : '') + '>' +
          (state.iaBusy ? t('ia.busy') : (left <= 0 ? t('ia.rest') : t('ia.send'))) +
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
      var errSafe = String(err || t('period.err_interrupt')).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return '<div class="natal-wait natal-wait-error" role="alert"><p>' + errSafe + '</p></div>';
    }
    return '';
  }


  function moisTab() {
    var ready = periodCanRead('mois');
    var left = monthlyLeft();
    var blocked = left === 0 && !ready;
    var title = moisTitleHtml();
    var quota = left != null ? tf('mois.quota', { used: ready ? 1 : left }) : '';
    return '<div class="hero-month"><div class="label">' + t('plan.on_demand') + '</div>' +
      '<div class="month">' + title + '</div><p class="lede">' + monthLabel() + '</p></div>' +
      '<div class="stack"><div class="card stack"><div class="label">' + t('mois.label') + '</div>' +
      '<h2>' + title + '</h2><p class="muted">' + MONTHLY.pages + quota + '</p><p>' + t('mois.intro') + '</p>' +
      periodStatusLine('mois') +
      (blocked ? '' : askBtn('mois', t('mois.ask'), t('mois.read'))) +
      (state.pdf === 'mois' ? pdfView('mois') : '') +
      '</div>' + iaCard() + '</div>';
  }


  function jourTab() {
    var ready = periodCanRead('jour');
    var left = dailyLeft();
    var blocked = left === 0 && !ready;
    var title = jourTitlePlain();
    var quota = left != null ? tf('jour.quota', { used: (state.user.dailyUsed || 0) }) : '';
    return '<div class="hero-month"><div class="label">' + t('plan.on_demand') + '</div>' +
      '<div class="month">' + title + '</div><p class="lede">' + todayLabel() + '</p></div>' +
      '<div class="stack"><div class="card stack"><div class="label">' + t('jour.label') + '</div>' +
      '<h2>' + title + '</h2><p class="muted">' + TODAY.pages + quota + '</p><p>' + t('jour.intro') + '</p>' +
      periodStatusLine('jour') +
      (blocked ? '' : askBtn('jour', t('jour.ask'), t('jour.read'))) +
      (state.pdf === 'jour' ? pdfView('jour') : '') +
      '</div>' + iaCard() + '</div>';
  }


  function coupleStatusLine() {
    var u = state.user || {};
    if (state.coupleGenError || u.coupleStatus === 'error') {
      var errRaw = state.coupleGenError || u.coupleError || t('couple.err_generic');
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
    var editsHint = partnerComplete()
      ? (readOnly ? t('partner.no_edits') : tf('partner.edits_left', { n: remaining, s: pluralS(remaining) }))
      : t('partner.edits_intro');
    return '<div class="card stack" id="partner-form-card">' +
      '<div class="label">' + t('partner.label') + '</div>' +
      '<h2>' + t('partner.title') + '</h2>' +
      '<p class="muted">' + t('partner.hint') + editsHint + '</p>' +
      '<div class="field"><label class="label" for="partner-prenom">' + t('partner.prenom') + '</label>' +
      '<input class="input" id="partner-prenom" type="text" value="' + escapeHtml(u.partnerPrenom || '') + '" required' + ro + '></div>' +
      '<div class="field"><label class="label" for="partner-birth-date">' + t('onboard.birth_date') + '</label>' +
      '<input class="input" id="partner-birth-date" type="date" value="' + escapeHtml(u.partnerBirthDate || '') + '" required' + ro + '></div>' +
      '<div class="field"><label class="label" for="partner-birth-time">' + t('onboard.birth_time') + '</label>' +
      '<input class="input" id="partner-birth-time" type="time" value="' + escapeHtml(u.partnerBirthTime || '') + '" required' + ro + '></div>' +
      '<div class="field"><label class="label" for="partner-birth-place">' + t('onboard.birth_place') + '</label>' +
      '<div class="autocomplete-wrap">' +
      '<input class="input" id="partner-birth-place" type="text" placeholder="' + t('partner.place_ph') + '" value="' + escapeHtml(u.partnerBirthPlace || '') + '" autocomplete="off"' + ro + '>' +
      '<div class="autocomplete-dropdown" id="partner-birth-place-dropdown"></div>' +
      '</div></div>' +
      '<input type="hidden" id="partner-birth-lat" value="' + (u.partnerBirthLat != null ? u.partnerBirthLat : '') + '">' +
      '<input type="hidden" id="partner-birth-lon" value="' + (u.partnerBirthLon != null ? u.partnerBirthLon : '') + '">' +
      '<div class="field"><span class="label">' + t('onboard.gender') + '</span>' +
      '<div class="gender-row">' + gOpt('femme', t('gender.femme')) + gOpt('homme', t('gender.homme')) + gOpt('autre', t('gender.autre')) + '</div></div>' +
      (readOnly
        ? ''
        : '<button class="btn" type="button" id="save-partner">' + t('partner.save') + '</button>') +
      (partnerComplete() && state.editingPartner
        ? '<button class="link" type="button" id="cancel-partner-edit">' + t('partner.back') + '</button>'
        : '') +
      '</div>';
  }


  function coupleTab() {
    var u = state.user || {};
    var ready = coupleCanRead();
    var left = coupleLeft();
    var used = ready ? 1 : (u.coupleUsed || 0);
    var quotaLine = canCouple()
      ? tf('couple.quota', { n: (ready || used > 0 ? 1 : 0) })
      : '';
    var partnerName = (u.partnerPrenom || '').trim();
    var needPartner = !partnerComplete() || state.editingPartner;
    var lock = !canCouple() && !ready;

    if (lock) {
      return '<div class="hero-month"><div class="label">' + t('plan.divin') + '</div>' +
        '<div class="month">' + t('couple.title_html') + '</div>' +
        '<p class="lede">' + t('couple.lede_lock') + '</p></div>' +
        '<div class="stack"><div class="card lock stack"><div class="label">' + t('plan.divin_price') + '</div>' +
        '<h2>' + t('couple.title_short') + '</h2><p class="muted">' + COUPLE.pages + ' · ' + tf('couple.quota', { n: 1 }) + '</p>' +
        '<p>' + (isPausedPaid() ? t('couple.lock_paused') : t('couple.lock_need')) + '</p>' +
        '<button class="btn ghost" type="button" data-plan-link="divin">' + t('couple.discover') + '</button></div></div>';
    }

    var partnerSummary = partnerComplete() && !state.editingPartner
      ? ('<p class="muted">' + tf('couple.with', { name: escapeHtml(partnerName) }) +
        (u.partnerBirthDate ? ' · ' + escapeHtml(u.partnerBirthDate) : '') +
        ' · <button class="link" type="button" id="edit-partner" style="display:inline;padding:0;border:0;background:none;color:inherit;text-decoration:underline;cursor:pointer">' + t('couple.edit') + '</button></p>')
      : '';

    return '<div class="hero-month"><div class="label">' + t('plan.divin') + '</div>' +
      '<div class="month">' + t('couple.title_html') + '</div>' +
      '<p class="lede">' + monthLabel() + '</p></div>' +
      '<div class="stack">' +
      (needPartner ? partnerFormHtml() : '') +
      '<div class="card stack"><div class="label">' + t('plan.on_demand') + '</div>' +
      '<h2>' + t('couple.title_short') + '</h2>' +
      '<p class="muted">' + COUPLE.pages + (quotaLine ? ' · ' + quotaLine : '') + '</p>' +
      '<p>' + t('couple.intro') + '</p>' +
      partnerSummary +
      coupleStatusLine() +
      ((!needPartner && (left > 0 || ready))
        ? askBtn('couple', t('couple.ask'), t('couple.read'))
        : '') +
      (state.pdf === 'couple' ? pdfView('couple') : '') +
      '</div>' + iaCard() + '</div>';
  }


  function accountSheet() {
    var u = state.user || {};
    var p = plan();
    var actions = '';
    if (isPausedPaid()) {
      actions =
        '<button class="btn" type="button" data-plan-link="manage">' + t('account.resume_manage') + '</button>' +
        '<button class="btn ghost" type="button" data-plan-link="celeste">' + t('account.back_celeste') + '</button>' +
        '<button class="btn ghost" type="button" data-plan-link="divin">' + t('account.to_divin') + '</button>';
    } else if (p === 'divin') {
      actions =
        '<button class="btn" type="button" data-plan-link="downgrade-celeste">' + t('account.downgrade_celeste') + '</button>' +
        '<button class="btn ghost" type="button" data-plan-link="manage">' + t('account.manage_stop') + '</button>';
    } else if (p === 'celeste') {
      actions =
        '<button class="btn" type="button" data-plan-link="divin">' + t('account.to_divin') + '</button>' +
        '<button class="btn ghost" type="button" data-plan-link="manage">' + t('account.manage_stop') + '</button>';
    } else {
      actions =
        '<button class="btn" type="button" data-plan-link="celeste">' + t('account.to_celeste') + '</button>' +
        '<button class="btn ghost" type="button" data-plan-link="divin">' + t('account.to_divin') + '</button>';
    }

    var planName = (u.planLabel) || (p === 'gratuit' ? t('plan.free') : p);
    var planPrice = u.price ? tf('account.price_mo', { n: u.price }) : (p === 'gratuit' ? t('account.no_sub') : '');
    var planState;
    if (isPausedPaid()) {
      planState = t('account.pause_state');
    } else if (isActive()) {
      planState = t('account.active');
    } else {
      planState = t('account.inactive');
    }

    var iaLine;
    if (canIa()) {
      iaLine = tf('account.ia_quota', { left: iaLeft(), quota: iaQuota() || '—' });
    } else if (isPausedPaid()) {
      iaLine = t('account.ia_pause');
    } else {
      iaLine = t('account.ia_lock');
    }

    var showUltime = (p === 'celeste' || monthsPaid() > 0) && p !== 'divin';
    var ultimeLine = tf('account.ultime_line', { n: monthsPaid() }) + (isPausedPaid() ? t('account.ultime_kept') : '');

    var downloadBlock = '';
    if (u.showDownload || p === 'divin') {
      var dNeed = u.downloadNeed || 2;
      var dHave = u.divinMonthsPaid || 0;
      if (dHave === 0 && p === 'divin' && isActive()) dHave = Math.max(1, monthsPaid() > 0 ? 1 : 0);
      var dLeft = u.downloadMonthsLeft != null ? u.downloadMonthsLeft : Math.max(0, dNeed - dHave);
      if (u.canDownloadAll) {
        downloadBlock =
          '<div class="acct-block">' +
            '<div class="label">' + t('account.dl_label') + '</div>' +
            '<p class="muted acct-hint">' + t('account.dl_hint') + '</p>' +
            '<button class="btn" type="button" id="download-all-ms">' + t('account.dl_btn') + '</button>' +
          '</div>';
      } else {
        downloadBlock =
          '<div class="acct-block">' +
            '<div class="label">' + t('account.dl_label') + '</div>' +
            '<p class="acct-value">' + tf('account.dl_unlock', { n: dLeft }) + '</p>' +
            '<p class="muted acct-hint">' + tf('account.dl_progress', { need: dNeed, have: dHave }) + '</p>' +
          '</div>';
      }
    }

    var birthTimeDisp = '';
    if (u.birthTime) {
      var tm = String(u.birthTime).trim().match(/^(\d{1,2}):(\d{2})/);
      birthTimeDisp = tm ? (tm[1].padStart(2, '0') + ' h ' + tm[2]) : String(u.birthTime).trim();
    }
    var birthDateLine = (u.birthDate || '') + (birthTimeDisp ? ' · ' + birthTimeDisp : '');
    var genderDisp = u.gender === 'femme' ? t('gender.femme') : u.gender === 'homme' ? t('gender.homme') : u.gender === 'autre' ? t('gender.autre') : '';
    var remaining = profileEditsRemaining();
    var canEdit = profileCanEdit();
    var profileBlock;
    if (profileComplete()) {
      profileBlock = '<div class="acct-block"><div class="label">' + t('account.birth_sky') + '</div>' +
        '<p class="acct-value">' + birthDateLine + '</p>' +
        '<p class="muted">' + (u.birthPlace || '') +
        (genderDisp ? ' · ' + genderDisp : '') +
        (natalCanRead() ? t('account.ms_ready') : '') + '</p>' +
        (canEdit
          ? '<p class="muted">' + tf('account.edits_left', { n: remaining, s: pluralS(remaining) }) + '</p>'
          : '<p class="muted">' + t('account.edits_done') + '</p>') +
        '<button class="btn ghost" type="button" id="edit-profile">' +
        (canEdit ? t('account.edit') : t('account.view')) + '</button></div>';
    } else {
      profileBlock = '<div class="acct-block"><div class="label">' + t('account.birth_sky') + '</div>' +
        '<p class="muted">' + t('account.birth_empty') + '</p>' +
        '<button class="btn ghost" type="button" id="edit-profile">' + t('account.fill_birth') + '</button></div>';
    }

    return '<div class="sheet" id="account-sheet"><div class="panel account-panel stack">' +
      '<h3>' + t('account.title') + '</h3>' +
      '<div class="acct-block">' +
        '<div class="label">' + t('account.id') + '</div>' +
        '<p class="acct-value">' + (u.prenom || '—') + '</p>' +
        '<p class="acct-email">' + (u.email || '') + '</p>' +
      '</div>' +
      '<div class="acct-block">' +
        '<div class="label">' + t('account.plan') + '</div>' +
        '<p class="acct-value">' + planName + '</p>' +
        '<p class="muted">' + [planPrice, planState].filter(Boolean).join(' · ') + '</p>' +
      '</div>' +
      '<div class="acct-rows">' +
        (showUltime
          ? '<div class="acct-row"><span class="label">' + t('account.ultime_prog') + '</span><span class="acct-row-val">' + ultimeLine + '</span></div>'
          : '') +
        '<div class="acct-row"><span class="label">' + t('ia.title') + '</span><span class="acct-row-val">' + iaLine + '</span></div>' +
      '</div>' +
      downloadBlock +
      profileBlock +
      accountVoiceBlockHtml() +
      '<div class="acct-block">' +
        '<div class="label">' + t('account.language') + '</div>' +
        '<p class="acct-value">' + tf('account.language_value', { lang: langNativeLabel((state.user && (state.user.language || state.user.locale)) || state.lang) }) + '</p>' +
        '<p class="muted acct-hint">' + t('lang.warn_account') + '</p>' +
      '</div>' +
      '<div class="acct-block">' +
        '<div class="label">' + t('account.appearance') + '</div>' +
        '<p class="muted acct-hint">' + t('account.appearance_hint') + '</p>' +
        themeToggleHtml(false) +
      '</div>' +
      '<div class="acct-block">' +
        '<div class="label">' + t('account.manage') + '</div>' +
        '<p class="muted acct-hint">' + t('account.manage_hint') + '</p>' +
        '<p class="muted acct-hint">' + t('account.support') + '</p>' +
        '<div class="stack">' + actions + '</div>' +
      '</div>' +
      '<button class="btn ghost" id="close-account">' + t('account.close') + '</button>' +
      '<button class="link" id="logout">' + t('account.logout') + '</button>' +
      '</div></div>';
  }


  function pdfView(id) {
    function manuscriptFrameHtml(src, title) {
      return '<div class="natal-frame-wrap" id="natal-frame-wrap">' +
        '<div class="ms-sel-bar" id="ms-sel-bar" hidden aria-hidden="true">' +
          '<button type="button" class="ms-sel-btn" id="ms-sel-ask">' + t('sel.ask') + '</button>' +
        '</div>' +
        '<iframe class="natal-frame" title="' + escapeHtml(title || t('reader.ms_title')) + '" src="' + escapeHtml(src) + '"></iframe>' +
        '<button type="button" class="ms-fs-btn" id="pdf-fs" aria-pressed="false" aria-label="' + t('reader.fs_enter') + '" title="' + t('reader.fs_enter') + '">⛶</button>' +
        '</div>';
    }
    var titleHtml = natalTitleHtml();
    var titlePlain = natalTitlePlain();
    var kicker = t('natal.kicker');
    var paras = [];
    var extra = '';
    if (id === 'mois') {
      titleHtml = moisTitleHtml();
      titlePlain = moisTitlePlain();
      kicker = monthLabel();
      paras = [t('mois.reader_intro')];
    }
    if (id === 'jour') {
      titleHtml = jourTitlePlain();
      titlePlain = jourTitlePlain();
      kicker = todayLabel();
      paras = [t('jour.reader_intro')];
    }
    if (id === 'ultime') {
      titleHtml = ultimeTitleHtml();
      titlePlain = ultimeTitlePlain();
      kicker = t('ultime.kicker');
      paras = [
        plan() === 'divin' ? t('ultime.reader_divin') : t('ultime.reader_paid')
      ];
      var uUrl = withThemeQuery(
        (typeof state.ultimePreview === 'string' && state.ultimePreview) ? state.ultimePreview : ultimePdfUrl()
      );
      if (uUrl && ultimeCanRead()) {
        extra = manuscriptFrameHtml(uUrl, t('ultime.frame_title'));
      } else {
        extra = '<p class="muted">' + t('ultime.unavailable') + '</p>';
      }
    }
    if (id === 'natal') {
      var url = withThemeQuery(
        (typeof state.natalPreview === 'string' && state.natalPreview) ? state.natalPreview : natalPdfUrl()
      );
      paras = [t('natal.reader_intro')];
      if (url && natalCanRead()) {
        extra = manuscriptFrameHtml(url, t('natal.frame_title'));
      } else {
        extra = '<p class="muted">' + t('natal.unavailable') + '</p>';
      }
    }
    if (id === 'mois' || id === 'jour') {
      var pUrl = withThemeQuery(
        (state.periodPreviewKind === id && typeof state.periodPreview === 'string' && state.periodPreview)
          ? state.periodPreview
          : periodPdfUrl(id)
      );
      paras = [id === 'jour' ? t('jour.reader_intro') : t('mois.reader_intro')];
      if (pUrl && periodCanRead(id)) {
        extra = manuscriptFrameHtml(pUrl, id === 'jour' ? t('jour.frame_title') : t('mois.frame_title'));
      } else {
        extra = '<p class="muted">' + t('period.unavailable') + '</p>';
      }
    }
    if (id === 'couple') {
      titleHtml = t('couple.title_html');
      titlePlain = t('couple.title_plain');
      kicker = t('couple.kicker');
      var cUrl = withThemeQuery(
        (typeof state.couplePreview === 'string' && state.couplePreview) ? state.couplePreview : couplePdfUrl()
      );
      paras = [t('couple.reader_intro')];
      if (cUrl && coupleCanRead()) {
        extra = manuscriptFrameHtml(cUrl, t('couple.frame_title'));
      } else {
        extra = '<p class="muted">' + t('couple.unavailable') + '</p>';
      }
    }
    var iaCtx = (id === 'natal' || id === 'mois' || id === 'jour' || id === 'couple' || id === 'ultime') ? id : null;
    var ttsBar = manuscriptTtsControlsHtml(iaCtx);
    if (ttsBar) {
      ttsBar = '<div class="ms-tts-footer" role="region" aria-label="' + t('ms.tts_aria') + '">' + ttsBar + '</div>';
    }
    var body = extra + ttsBar;
    var ia = iaCtx ? readerIaPanel(iaCtx) : '';
    return '<div class="pdf-view ms-inline" id="ms-inline" data-ms-kind="' + id + '">' +
      '<div class="ms-inline-bar">' +
      '<button type="button" class="pdf-back" id="close-pdf">' + t('reader.close') + '</button>' +
      '<span class="kicker">' + titlePlain + '</span>' +
      '</div>' +
      '<div class="pdf-body ms-inline-body manuscript-protect">' + body + ia + '</div></div>';
  }

  /** Same view key → keep scroll (polls re-render every 3–5s without jumping to top). */
  var _renderViewKey = '';
  function renderViewKey() {
    return [
      state.screen || '',
      state.tab || '',
      state.pdf ? String(state.pdf) : '',
      state.account ? '1' : '0',
      needsOnboarding() ? '1' : '0'
    ].join('|');
  }

  function restoreScrollAfterRender(root, savedMain, savedPdf) {
    function apply() {
      if (savedMain != null) {
        var sc = root.querySelector('.scroll');
        if (sc) sc.scrollTop = savedMain;
      }
      if (savedPdf != null) {
        var pb = root.querySelector('.ms-inline-body') || root.querySelector('.pdf-body');
        if (pb) pb.scrollTop = savedPdf;
      }
    }
    apply();
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(function () { apply(); });
    }
  }

  function render() {
    if (!state.pdf) setPdfFsFallback(false);
    var root = document.getElementById('app');
    var nextKey = renderViewKey();
    var sameView = nextKey === _renderViewKey;
    var scrollEl = sameView ? root.querySelector('.scroll') : null;
      var pdfBodyEl = sameView ? (root.querySelector('.ms-inline-body') || root.querySelector('.pdf-body')) : null;
    var savedMainScroll = scrollEl ? scrollEl.scrollTop : null;
    var savedPdfScroll = pdfBodyEl ? pdfBodyEl.scrollTop : null;
    var html = '';
    if (state.screen === 'install' && isDesktopClient()) state.screen = 'app';
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
      }
    }
    root.innerHTML = html;
    bind();
    _renderViewKey = nextKey;
    if (sameView && (savedMainScroll != null || savedPdfScroll != null)) {
      restoreScrollAfterRender(root, savedMainScroll, savedPdfScroll);
    } else if (state.pdf) {
      var msEl = document.getElementById('ms-inline');
      if (msEl && msEl.scrollIntoView) {
        setTimeout(function () {
          try { msEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { /* ignore */ }
        }, 60);
      }
    }
    var logEl = document.getElementById('ia-log');
    if (logEl) logEl.scrollTop = logEl.scrollHeight;
    maybeShowDesktopPhoneNudge();
  }

  function bind() {
    var q = new URLSearchParams(location.search);
    var em = document.getElementById('email');
    if (em && q.get('email') && !em.value) em.value = q.get('email');

    var go = document.getElementById('go-in');
    if (go) go.onclick = function () {
      var email = (document.getElementById('email').value || '').trim();
      var password = (document.getElementById('password').value || '');
      var langEl = document.getElementById('login-lang');
      if (langEl && langEl.value) applyLang(langEl.value, true);
      if (!email) { alert(t('err.email')); return; }
      if (!password || password.length < 8) {
        alert(t('err.password'));
        return;
      }
      go.disabled = true;
      go.textContent = t('login.connecting');
      apiLogin(email, password).then(function (res) {
        if (!res.ok) {
          alert((res.data && res.data.error) || t('err.login'));
          go.disabled = false;
          go.textContent = t('login.submit');
          return;
        }
        applyAccess(Object.assign({ email: email }, res.data));
        afterLogin();
        render();
      }).catch(function () {
        alert(t('err.unreachable'));
        go.disabled = false;
        go.textContent = t('login.submit');
      });
    };

    var loginLang = document.getElementById('login-lang');
    if (loginLang) {
      loginLang.onchange = function () {
        /* Login-form UI locale only — account language is applied after login from server. */
        setLang(loginLang.value, { render: true, saveRemote: false, bindAccount: false });
      };
    }
    var onboardLang = document.getElementById('onboard-lang');
    if (onboardLang) {
      onboardLang.onchange = function () {
        setLang(onboardLang.value, { render: true, saveRemote: false, bindAccount: true });
      };
    }

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
      stopMsTtsAudio();
      stopIaListen({ manual: true });
      try { endIaLive({ reason: 'close' }); } catch (e0) { /* ignore */ }
      clearPdfFullscreen();
      state.pdf = null;
      hideMsSelBar();
      render();
    };
    bindPdfFullscreen();
    bindManuscriptSelection();
    bindMsTtsControls();
    bindIaSpeakButtons(document.getElementById('ia-log') || document);
    bindIaMicButton();
    var si = document.getElementById('send-ia');
    if (si) si.onclick = function () { sendIa(); };
    var iq = document.getElementById('ia-q');
    if (iq) iq.onkeydown = function (e) { if (e.key === 'Enter') sendIa(); };
    var liveOpen = document.getElementById('ia-live-open');
    if (liveOpen) liveOpen.onclick = function () { startIaLive(); };

    var oa = document.getElementById('open-account');
    if (oa) oa.onclick = function () { state.account = true; render(); };
    var ca = document.getElementById('close-account');
    if (ca) ca.onclick = function () { state.account = false; render(); };
    var voicePicker = document.getElementById('acct-tts-voice');
    if (voicePicker) {
      voicePicker.onclick = function (e) {
        var card = e.target && e.target.closest ? e.target.closest('.voice-card') : null;
        if (!card || !voicePicker.contains(card)) return;
        var voiceId = normalizeTtsVoice(card.getAttribute('data-voice'));
        setActiveVoiceCard(voiceId);
        var statusEl = document.getElementById('acct-tts-voice-status');
        saveAccountTtsVoice(voiceId, {
          onOk: function () {
            if (statusEl) {
              statusEl.hidden = false;
              statusEl.textContent = t('account.voice_saved');
            }
          }
        }).catch(function (err) {
          try { window.alert((err && err.message) || t('ia.tts_err')); } catch (e2) { /* ignore */ }
        });
      };
    }
    var voicePrev = document.getElementById('acct-tts-preview');
    if (voicePrev) voicePrev.onclick = function () { previewAccountTtsVoice(); };
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
    document.querySelectorAll('.theme-chip').forEach(function (themeChip) {
      themeChip.onclick = function () {
        setTheme(state.theme === 'light' ? 'dark' : 'light');
      };
    });
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
        else if (kind === 'divinPlus') openPlanLink(PLAN_LINKS.divinPlusCheckout);
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
      try { endIaLive({ reason: 'logout' }); } catch (e0) { /* ignore */ }
      closeDesktopPhoneNudge();
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
    navigator.serviceWorker.register('/sw.js?v=75').catch(function () {});
  }
})();
