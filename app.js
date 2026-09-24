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
      'err.email': '이메일을 입력하세요 ✦',
      'err.password': '비밀번호: 최소 8자 ✦',
      'err.login': '이메일 또는 비밀번호가 올바르지 않습니다.',
      'err.unreachable': 'Les Manuscrits Célestes에 연결할 수 없습니다. 잠시 후 다시 시도하세요.'
    }
  };


  /* i18n-extra-injected */
  (function expandI18n() {
    var EXTRA = JSON.parse((function(b64){if(typeof atob==='function'){var bin=atob(b64);if(typeof TextDecoder!=='undefined'){var bytes=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i)&255;return new TextDecoder('utf-8').decode(bytes);}return decodeURIComponent(escape(bin));}return Buffer.from(b64,'base64').toString('utf8');})('eyJmciI6eyJicmFuZC5uYW1lIjoiTGVzIE1hbnVzY3JpdHMgQ8OpbGVzdGVzIiwiYnJhbmQubmFtZV9odG1sIjoiTGVzIE1hbnVzY3JpdHM8YnI+PHNwYW4+Q8OpbGVzdGVzPC9zcGFuPiIsImJyYW5kLmFjY291bnRfYXJpYSI6IkNvbXB0ZSIsImxvZ2luLmVtYWlsX3BoIjoidG9pQGVtYWlsLmNvbSIsImluc3RhbGwudGl0bGVfaHRtbCI6IlN1ciB0b248YnI+PHNwYW4+w6ljcmFuIGTigJlhY2N1ZWlsPC9zcGFuPiIsImluc3RhbGwubGVkZSI6IkNvbW1lIHVuZSBhcHAsIHNhbnMgbOKAmUFwcCBTdG9yZS4iLCJpbnN0YWxsLnN0ZXBzX2lvcyI6IlN1ciBpUGhvbmUgOiBhcHB1aWUgc3VyIDxiPlBhcnRhZ2VyPC9iPiBwdWlzIDxiPlN1ciBs4oCZw6ljcmFuIGTigJlhY2N1ZWlsPC9iPi4iLCJpbnN0YWxsLnN0ZXBzX2FuZHJvaWQiOiJTdXIgQW5kcm9pZCA6IGJvdXRvbiBjaS1kZXNzb3VzLCBvdSBtZW51IENocm9tZSDihpIgPGI+QWpvdXRlciDDoCBs4oCZw6ljcmFuIGTigJlhY2N1ZWlsPC9iPi4iLCJpbnN0YWxsLmFkZCI6IkFqb3V0ZXIgw6AgbOKAmWFjY3VlaWwiLCJpbnN0YWxsLnNraXAiOiJDb250aW51ZXIgc2FucyBpbnN0YWxsZXIiLCJvbmJvYXJkLnRpdGxlX2h0bWwiOiJUb24gY2llbDxicj48c3Bhbj5kZSBuYWlzc2FuY2U8L3NwYW4+Iiwib25ib2FyZC5sZWRlX25ldyI6IkVucmVnaXN0csOpIHNvdXMge2VtYWlsfSDigJQgcG91ciBsZSBuYXRhbCwgbGUgam91ciBldCBsZSBtb2lzLiBUdSBwb3VycmFzIGNvcnJpZ2VyIGp1c3F14oCZw6AgMyBmb2lzIGVuIGNhcyBk4oCZZXJyZXVyLiIsIm9uYm9hcmQubGVkZV9yZWFkb25seSI6IlR1IGFzIHV0aWxpc8OpIHRlcyAzIG1vZGlmaWNhdGlvbnMuIFBvdXIgdG91dGUgY29ycmVjdGlvbiBzdXBwbMOpbWVudGFpcmUsIGNvbnRhY3RlIGxlIHN1cHBvcnQuIiwib25ib2FyZC5sZWRlX2VkaXQiOiJDb3JyaWdlIHVuZSBlcnJldXIgc2kgYmVzb2luLiBJbCB0ZSByZXN0ZSB7bn0gbW9kaWZpY2F0aW9ue3N9LiIsIm9uYm9hcmQubmF0YWxfbm90ZSI6IlRvbiBtYW51c2NyaXQgbmF0YWwgZXN0IGTDqWrDoCBnw6luw6lyw6kgOiBjaGFuZ2VyIGNlcyBpbmZvcyBuZSBsZSByw6lnw6luw6hyZSBwYXMgYXV0b21hdGlxdWVtZW50LiIsIm9uYm9hcmQuZWRpdHNfbm9uZSI6IlBsdXMgYXVjdW5lIG1vZGlmaWNhdGlvbiBwb3NzaWJsZS4iLCJvbmJvYXJkLmVkaXRzX2xlZnQiOiJJbCB0ZSByZXN0ZSB7bn0gbW9kaWZpY2F0aW9ue3N9LiIsIm9uYm9hcmQuc2F2ZV9lZGl0IjoiRW5yZWdpc3RyZXIgbGVzIG1vZGlmaWNhdGlvbnMiLCJvbmJvYXJkLnNhdmVfbmV3IjoiRW5yZWdpc3RyZXIgbW9uIHByb2ZpbCIsIm9uYm9hcmQubm9fbW9yZSI6IlBsdXMgZGUgbW9kaWZpY2F0aW9ucyBwb3NzaWJsZXMiLCJvbmJvYXJkLmJhY2siOiJSZXRvdXIiLCJvbmJvYXJkLmxhdGVyIjoiUGx1cyB0YXJkIiwib25ib2FyZC5iaXJ0aF9kYXRlIjoiRGF0ZSBkZSBuYWlzc2FuY2UiLCJvbmJvYXJkLmJpcnRoX3RpbWUiOiJIZXVyZSBkZSBuYWlzc2FuY2UiLCJvbmJvYXJkLmJpcnRoX3BsYWNlIjoiTGlldSBkZSBuYWlzc2FuY2UiLCJvbmJvYXJkLnBsYWNlX3BoIjoiVGFwZSB1bmUgdmlsbGXigKYgKGV4OiBMeW9uKSIsIm9uYm9hcmQuZ2VuZGVyIjoiR2VucmUiLCJnZW5kZXIuZmVtbWUiOiJGZW1tZSIsImdlbmRlci5ob21tZSI6IkhvbW1lIiwiZ2VuZGVyLmF1dHJlIjoiQXV0cmUiLCJ3ZWxjb21lLmJhY2siOiJCb24gcmV0b3VyLCB7bmFtZX0uIiwid2VsY29tZS55b3UiOiJ0b2kiLCJwbGFuLmZyZWUiOiJHcmF0dWl0IiwicGxhbi5wYXVzZV9zdWZmaXgiOiIgwrcgcGF1c2UiLCJwbGFuLmxhYmVsIjoiUGxhbiB7bmFtZX0iLCJwbGFuLmNlbGVzdGUiOiJQbGFuIEPDqWxlc3RlIiwicGxhbi5kaXZpbiI6IlBsYW4gRGl2aW4iLCJwbGFuLmRpdmluX3ByaWNlIjoiUGxhbiBEaXZpbiDCtyAxMzcg4oKsIiwicGxhbi5vbl9kZW1hbmQiOiLDgCBsYSBkZW1hbmRlIiwicGxhbi5jZWxlc3RlX29yX2RpdmluIjoiQ8OpbGVzdGUgb3UgRGl2aW4iLCJwbGFuLmxvY2tlZCI6IlZlcnJvdWlsbMOpIiwicGxhbi51bmxvY2tlZCI6IkTDqWJsb3F1w6kiLCJwbGFuLnBhdXNlZCI6IkVuIHBhdXNlIiwibmF0YWwua2lja2VyIjoiTmF0YWwiLCJuYXRhbC5pbnRybyI6IkxlcyAyOCBwYWdlcyBkZSB0b24gdGjDqG1lIOKAlCB0b3Vqb3VycyBhY2Nlc3NpYmxlcyB0YW50IHF1ZSB0b24gYWJvbm5lbWVudCBlc3QgYWN0aWYuIiwibmF0YWwudGl0bGUiOiJMZSBNYW51c2NyaXQgQ8OpbGVzdGUiLCJuYXRhbC5vZl9saWZlIjoiZGUgdGEgdmllIiwibmF0YWwudGl0bGVfcGxhaW4iOiJMZSBNYW51c2NyaXQgQ8OpbGVzdGUgZGUgdGEgdmllIiwibmF0YWwuYXNrIjoiT0JURU5JUiBMRSBNQU5VU0NSSVQgREUgTUEgVklFIiwibmF0YWwucmVhZCI6IlZPSVIgTEUgTUFOVVNDUklUIEPDiUxFU1RFIERFIE1BIFZJRSIsIm5hdGFsLnBhZ2VzX3ByaWNlIjoiMjggcGFnZXMgwrcgNTkg4oKsIC8gbW9pcyIsIm5hdGFsLmxvY2tfcGF1c2VkIjoiQWJvbm5lbWVudCBlbiBwYXVzZSA6IGxlIG5hdGFsIHNlIHJvdXZyZSBkw6hzIHF1ZSB0dSByZXByZW5kcy4iLCJuYXRhbC5sb2NrX25lZWQiOiJUb24gbWFudXNjcml0IGRlIHZpZSBz4oCZb3V2cmUgYXZlYyBs4oCZYWJvbm5lbWVudCBDw6lsZXN0ZS4iLCJuYXRhbC5uZWVkX3Byb2ZpbGUiOiJSZW5zZWlnbmUgdG9uIGNpZWwgZGUgbmFpc3NhbmNlIHBvdXIgcXVlIHRvbiBtYW51c2NyaXQgcHVpc3NlIHPigJnDqWNyaXJlLiIsIm5hdGFsLmZpbGxfcHJvZmlsZSI6IlJlbnNlaWduZXIgbW9uIGNpZWwgZGUgbmFpc3NhbmNlIiwibmF0YWwuZXJyX2dlbmVyaWMiOiJMYSBnw6luw6lyYXRpb24gbuKAmWEgcGFzIHB1IGFib3V0aXIuIFLDqWVzc2FpZSBkYW5zIHVuIG1vbWVudC4iLCJuYXRhbC5lcnJfc29mdCI6IkxhIGfDqW7DqXJhdGlvbiBu4oCZYSBwYXMgcHUgYWJvdXRpciBwb3VyIGxlIG1vbWVudC4gUsOpZXNzYWllIGRhbnMgdW4gaW5zdGFudCDigJQgdG9uIGJvdXRvbiDCqyBPQlRFTklSIExFIE1BTlVTQ1JJVCBERSBNQSBWSUUgwrsgcmVzdGUgZGlzcG9uaWJsZS4iLCJuYXRhbC5yZWFkeSI6IlByb2ZpbCBlbnJlZ2lzdHLDqSDCtyB0b24gbWFudXNjcml0IGVzdCBwcsOqdC4iLCJuYXRhbC53YWl0aW5nIjoiUHJvZmlsIGVucmVnaXN0csOpIMK3IGVuIGF0dGVudGUgZGUgdGEgZGVtYW5kZS4iLCJuYXRhbC5yZWFkZXJfaW50cm8iOiJWb2ljaSB0b24gTWFudXNjcml0IEPDqWxlc3RlIGRlIHRhIHZpZS4gTGVjdHVyZSBkYW5zIGzigJlhcHAgdW5pcXVlbWVudCwgdGFudCBxdWUgdG9uIGFib25uZW1lbnQgZXN0IGFjdGlmLiIsIm5hdGFsLnVuYXZhaWxhYmxlIjoiTWFudXNjcml0IGluZGlzcG9uaWJsZSBwb3VyIGxlIG1vbWVudC4gUmV2aWVucyDDoCBs4oCZYWNjdWVpbCBldCBhcHB1aWUgc3VyIE9CVEVOSVIgTEUgTUFOVVNDUklUIERFIE1BIFZJRS4iLCJuYXRhbC5mcmFtZV90aXRsZSI6Ik1hbnVzY3JpdCBuYXRhbCIsInVsdGltZS50aXRsZSI6IkxlIE1hbnVzY3JpdCBDw6lsZXN0ZSBVbHRpbWUiLCJ1bHRpbWUudGl0bGVfcGxhaW4iOiJMZSBNYW51c2NyaXQgQ8OpbGVzdGUgVWx0aW1lIGRlIHRhIHZpZSIsInVsdGltZS5hc2siOiJEZW1hbmRlciBs4oCZVWx0aW1lIiwidWx0aW1lLnJlYWQiOiJWT0lSIExFIE1BTlVTQ1JJVCBVTFRJTUUiLCJ1bHRpbWUuZGl2aW5fbm93IjoiSW5jbHVzIHRvdXQgZGUgc3VpdGUgZGFucyBsZSBEaXZpbi4iLCJ1bHRpbWUuc2l4X21vbnRocyI6IlNpeCBtb2lzIHBhecOpcywgbcOqbWUgYXZlYyBkZXMgcGF1c2VzLiIsInVsdGltZS5vbmNlIjoiIMOJY3JpdCB1bmUgc2V1bGUgZm9pcywgw6AgdGEgZGVtYW5kZS4iLCJ1bHRpbWUubG9ja19pbnRybyI6IkFwcsOocyA2IG1vaXMgQ8OpbGVzdGUsIG91IGltbcOpZGlhdGVtZW50IGVuIERpdmluLiIsInVsdGltZS5wYXVzZV9yZW9wZW4iOiJM4oCZVWx0aW1lIHNlIHJvdXZyZSBkw6hzIHF1ZSB0dSByZXByZW5kcyBs4oCZYWJvbm5lbWVudC4iLCJ1bHRpbWUubW9udGhzX2tlcHQiOiIgVGVzIDxiPntufSBtb2lzPC9iPiByZXN0ZW50IGNvbXB0w6lzLiIsInVsdGltZS5sb2NrX3Byb2dyZXNzIjoiVHUgYXMgPGI+e2hhdmV9IG1vaXM8L2I+IGTDqWrDoCByw6lnbMOpcy4gRW5jb3JlIDxiPntsZWZ0fTwvYj4g4oCUIHVuZSBwYXVzZSBuZSBjYXNzZSBwYXMgbGEgc8OpcmllLiIsInVsdGltZS5wYWdlc19sb2NrZWQiOiJ7bn0gcGFnZXMgwrcgNiBtb2lzIHBhecOpcywgY3VtdWzDqXMiLCJ1bHRpbWUucGFnZXNfdW5sb2NrZWQiOiJ7bn0gcGFnZXMgwrcgZMOpasOgIGTDqWJsb3F1w6kiLCJ1bHRpbWUucGFnZXNfcGxhaW4iOiJ7bn0gcGFnZXMiLCJ1bHRpbWUubmVlZF9wcm9maWxlIjoiUmVuc2VpZ25lIHRvbiBjaWVsIGRlIG5haXNzYW5jZSBwb3VyIHF1ZSBs4oCZVWx0aW1lIHB1aXNzZSBz4oCZw6ljcmlyZS4iLCJ1bHRpbWUuZXJyX2dlbmVyaWMiOiJMYSBnw6luw6lyYXRpb24gZGUgbOKAmVVsdGltZSBu4oCZYSBwYXMgcHUgYWJvdXRpci4gUsOpZXNzYWllLiIsInVsdGltZS5lcnJfc29mdCI6IkxhIGfDqW7DqXJhdGlvbiBu4oCZYSBwYXMgcHUgYWJvdXRpciBwb3VyIGxlIG1vbWVudC4gUsOpZXNzYWllIOKAlCB0b24gYm91dG9uIMKrIERlbWFuZGVyIGzigJlVbHRpbWUgwrsgcmVzdGUgZGlzcG9uaWJsZS4iLCJ1bHRpbWUucmVhZHkiOiJUb24gTWFudXNjcml0IFVsdGltZSBlc3QgcHLDqnQuIiwidWx0aW1lLndhaXRpbmciOiJEw6libG9xdcOpIMK3IGVuIGF0dGVudGUgZGUgdGEgZGVtYW5kZS4iLCJ1bHRpbWUua2lja2VyIjoiw4lkaXRpb24gVWx0aW1lIiwidWx0aW1lLnJlYWRlcl9kaXZpbiI6IlZvaWNpIHRvbiBNYW51c2NyaXQgQ8OpbGVzdGUgVWx0aW1lLCBpbmNsdXMgZGFucyBsZSBEaXZpbi4gTGVjdHVyZSBkYW5zIGzigJlhcHAgdGFudCBxdWUgdG9uIGFib25uZW1lbnQgZXN0IGFjdGlmLiIsInVsdGltZS5yZWFkZXJfcGFpZCI6IlZvaWNpIHRvbiBNYW51c2NyaXQgQ8OpbGVzdGUgVWx0aW1lLCBkw6libG9xdcOpIGFwcsOocyA2IG1vaXMgcGF5w6lzLiBMZWN0dXJlIGRhbnMgbOKAmWFwcCB0YW50IHF1ZSB0b24gYWJvbm5lbWVudCBlc3QgYWN0aWYuIiwidWx0aW1lLnVuYXZhaWxhYmxlIjoiTWFudXNjcml0IFVsdGltZSBpbmRpc3BvbmlibGUuIFJldmllbnMgw6AgbOKAmWFjY3VlaWwgZXQgYXBwdWllIHN1ciDCqyBEZW1hbmRlciBs4oCZVWx0aW1lIMK7LiIsInVsdGltZS5mcmFtZV90aXRsZSI6Ik1hbnVzY3JpdCBVbHRpbWUiLCJtb2lzLmxhYmVsIjoiQ2UgbW9pcyIsIm1vaXMuaW50cm8iOiJEaXNwb25pYmxlIHRvdXQgbGUgbW9pcy4gVG9uIE1hbnVzY3JpdCBDw6lsZXN0ZSByZWxhdGlmIGF1IG1vaXMgZW4gY291cnMuIENvbW1lbnQgdGVzIMOpdG9pbGVzIHBhcmxlbnQgY2UgbW9pcyIsIm1vaXMudGl0bGVfaHRtbCI6Ik1hbnVzY3JpdCBDw6lsZXN0ZSA8c3BhbiBjbGFzcz1cImRlLWNlLW1vaXNcIj5ERSBDRSBNT0lTIERFIHttb250aH08L3NwYW4+IiwibW9pcy50aXRsZV9wbGFpbiI6Ik1hbnVzY3JpdCBDw6lsZXN0ZSBERSBDRSBNT0lTIERFIHttb250aH0iLCJtb2lzLmFzayI6IkRlbWFuZGVyIGxlIG1hbnVzY3JpdCBkdSBtb2lzIiwibW9pcy5yZWFkIjoiUmVsaXJlIGxlIG1hbnVzY3JpdCBkdSBtb2lzIiwibW9pcy5xdW90YSI6IiDCtyB7dXNlZH0gLyAxIGNldHRlIGFubsOpZSAoR3JhdHVpdCkiLCJtb2lzLnJlYWRlcl9pbnRybyI6IlZvaWNpIHRvbiBNYW51c2NyaXQgQ8OpbGVzdGUgZHUgbW9pcy4gTGVjdHVyZSBkYW5zIGzigJlhcHAgdW5pcXVlbWVudCwgdGFudCBxdWUgdG9uIGFib25uZW1lbnQgZXN0IGFjdGlmLiIsIm1vaXMuZnJhbWVfdGl0bGUiOiJNYW51c2NyaXQgZHUgbW9pcyIsImpvdXIubGFiZWwiOiJBdWpvdXJk4oCZaHVpIiwiam91ci5pbnRybyI6IlRvbiBNYW51c2NyaXQgQ8OpbGVzdGUgcmVsYXRpZiDDoCBjZXR0ZSBqb3VybsOpZSBlbiBjb3Vycy4gQ29tbWVudCB0ZXMgw6l0b2lsZXMgcGFybGVudCBBVUpPVVJE4oCZSFVJIiwiam91ci50aXRsZSI6Ik1hbnVzY3JpdCBDw6lsZXN0ZSBkdSB7ZGF0ZX0iLCJqb3VyLmFzayI6Ik9CVEVOSVIgTEUgTUFOVVNDUklUIERVIEpPVVIiLCJqb3VyLnJlYWQiOiJSZWxpcmUgbGUgbWFudXNjcml0IGR1IGpvdXIiLCJqb3VyLnF1b3RhIjoiIMK3IHt1c2VkfSAvIDUgY2UgbW9pcyAoR3JhdHVpdCkiLCJqb3VyLnJlYWRlcl9pbnRybyI6IlZvaWNpIHRvbiBNYW51c2NyaXQgQ8OpbGVzdGUgZHUgam91ci4gTGVjdHVyZSBkYW5zIGzigJlhcHAgdW5pcXVlbWVudCwgdGFudCBxdWUgdG9uIGFib25uZW1lbnQgZXN0IGFjdGlmLiIsImpvdXIuZnJhbWVfdGl0bGUiOiJNYW51c2NyaXQgZHUgam91ciIsInBlcmlvZC51bmF2YWlsYWJsZSI6Ik1hbnVzY3JpdCBpbmRpc3BvbmlibGUgcG91ciBsZSBtb21lbnQuIFJldmllbnMgw6AgbOKAmW9uZ2xldCBldCBkZW1hbmRlLWxlIMOgIG5vdXZlYXUuIiwicGVyaW9kLmVycl9pbnRlcnJ1cHQiOiJHw6luw6lyYXRpb24gaW50ZXJyb21wdWUuIFLDqWVzc2FpZS4iLCJjb3VwbGUua2lja2VyIjoiU3luYXN0cmllIiwiY291cGxlLmxlZGVfbG9jayI6IlN5bmFzdHJpZSDDoCBkZXV4IiwiY291cGxlLnRpdGxlX2h0bWwiOiJNYW51c2NyaXQgQ8OpbGVzdGUgPHNwYW4gY2xhc3M9XCJkZS10YS12aWVcIj5Db3VwbGU8L3NwYW4+IiwiY291cGxlLnRpdGxlX3BsYWluIjoiTWFudXNjcml0IEPDqWxlc3RlIENvdXBsZSIsImNvdXBsZS50aXRsZV9zaG9ydCI6Ik1hbnVzY3JpdCBkZSBjb3VwbGUiLCJjb3VwbGUuaW50cm8iOiJTeW5hc3RyaWUgSHVtYW4gRGVzaWduIMOXIEFzdHJvbG9naWUgcG91ciB2b3VzIGRldXgg4oCUIHVuIG1hbnVzY3JpdCBkZSBjb3VwbGUgcGFyIG1vaXMgY2l2aWwsIHLDqXNlcnbDqSBhdSBwbGFuIERpdmluLiIsImNvdXBsZS5hc2siOiJEZW1hbmRlciBsZSBtYW51c2NyaXQgZGUgY291cGxlIiwiY291cGxlLnJlYWQiOiJSZWxpcmUgbGUgbWFudXNjcml0IGRlIGNvdXBsZSIsImNvdXBsZS5xdW90YSI6IntufSAvIDEgY2UgbW9pcyIsImNvdXBsZS5sb2NrX3BhdXNlZCI6IkFib25uZW1lbnQgZW4gcGF1c2UgOiBsZSBtYW51c2NyaXQgZGUgY291cGxlIHNlIHJvdXZyZSBkw6hzIHF1ZSB0dSByZXByZW5kcyBsZSBEaXZpbi4iLCJjb3VwbGUubG9ja19uZWVkIjoiUsOpc2VydsOpIGF1IHBsYW4gRGl2aW4g4oCUIGRldXggY2llbHMgY3JvaXPDqXMsIHVuZSBmb2lzIHBhciBtb2lzIGNpdmlsLiIsImNvdXBsZS5kaXNjb3ZlciI6IkTDqWNvdXZyaXIgbGUgRGl2aW4iLCJjb3VwbGUud2l0aCI6IkF2ZWMge25hbWV9IiwiY291cGxlLmVkaXQiOiJNb2RpZmllciIsImNvdXBsZS5lcnJfZ2VuZXJpYyI6IkxhIGfDqW7DqXJhdGlvbiBu4oCZYSBwYXMgcHUgYWJvdXRpci4iLCJjb3VwbGUucmVhZGVyX2ludHJvIjoiVm9pY2kgdm90cmUgTWFudXNjcml0IEPDqWxlc3RlIGRlIGNvdXBsZS4gTGVjdHVyZSBkYW5zIGzigJlhcHAgdW5pcXVlbWVudCwgdGFudCBxdWUgdG9uIGFib25uZW1lbnQgRGl2aW4gZXN0IGFjdGlmLiIsImNvdXBsZS51bmF2YWlsYWJsZSI6Ik1hbnVzY3JpdCBkZSBjb3VwbGUgaW5kaXNwb25pYmxlLiBSZXZpZW5zIMOgIGzigJlvbmdsZXQgQ291cGxlLiIsImNvdXBsZS5mcmFtZV90aXRsZSI6Ik1hbnVzY3JpdCBjb3VwbGUiLCJjb3VwbGUubm90X3JlYWR5IjoiVG9uIG1hbnVzY3JpdCBkZSBjb3VwbGUgbuKAmWVzdCBwYXMgZW5jb3JlIGRpc3BvbmlibGUuIiwiY291cGxlLm1pc3NpbmdfbGluayI6IkxpZW4gbWFudXNjcml0IG1hbnF1YW50LiBSZWNvbm5lY3RlLXRvaSBwdWlzIHLDqWVzc2FpZS4iLCJjb3VwbGUuZmlsZV9taXNzaW5nIjoiRmljaGllciBjb3VwbGUgaW50cm91dmFibGUuIFJlbGFuY2UgwqsgRGVtYW5kZXIgbGUgbWFudXNjcml0IGRlIGNvdXBsZSDCuy4iLCJwYXJ0bmVyLmxhYmVsIjoiUGFydGVuYWlyZSIsInBhcnRuZXIudGl0bGUiOiJDaWVsIGRlIG5haXNzYW5jZSBkdSBwYXJ0ZW5haXJlIiwicGFydG5lci5oaW50IjoiUHLDqW5vbSwgZGF0ZSwgaGV1cmUsIGxpZXUgZXQgZ2VucmUg4oCUIGNvbW1lIHBvdXIgdG9uIHByb2ZpbC4gIiwicGFydG5lci5ub19lZGl0cyI6IlBsdXMgYXVjdW5lIG1vZGlmaWNhdGlvbi4iLCJwYXJ0bmVyLmVkaXRzX2xlZnQiOiJJbCB0ZSByZXN0ZSB7bn0gY29ycmVjdGlvbntzfS4iLCJwYXJ0bmVyLmVkaXRzX2ludHJvIjoiVHUgcG91cnJhcyBjb3JyaWdlciBqdXNxdeKAmcOgIDMgZm9pcy4iLCJwYXJ0bmVyLnByZW5vbSI6IlByw6lub20iLCJwYXJ0bmVyLnBsYWNlX3BoIjoiVGFwZSB1bmUgdmlsbGXigKYiLCJwYXJ0bmVyLnNhdmUiOiJFbnJlZ2lzdHJlciBsZSBwYXJ0ZW5haXJlIiwicGFydG5lci5iYWNrIjoiUmV0b3VyIiwicGF1c2UubGFiZWwiOiJBYm9ubmVtZW50IGVuIHBhdXNlIiwicGF1c2UudGl0bGUiOiJFc3BhY2UgZW4gcGF1c2UiLCJwYXVzZS5ib2R5IjoiVG9uIGFibyB7cGxhbn0gZXN0IGVuIHBhdXNlLiBUdSBnYXJkZXMgbOKAmWFjY8OocyBHcmF0dWl0IDogMSBtYW51c2NyaXQgZHUgbW9pcyArIDUgbWFudXNjcml0cyBkdSBqb3VyLiBOYXRhbCwgVWx0aW1lIGV0IElBIEPDqWxlc3RlIHNlIHJvdXZyZW50IGTDqHMgcXVlIHR1IHJlcHJlbmRzLiIsInBhdXNlLnVsdGltZV9ub3RlIjoiTW9pcyBVbHRpbWUgY29uc2VydsOpcyA6IHtufSAvIDYuIiwicGF1c2UucmVzdW1lIjoiUmVwcmVuZHJlIG1vbiBhYm9ubmVtZW50IiwicGF1c2UucmVmcmVzaCI6IkrigJlhaSByZXByaXMsIGFjdHVhbGlzZXIiLCJmcmVlLmJhbm5lcl9mdWxsIjoiQWNjw6hzIGdyYXR1aXQgOiB7bX0ge213fSBkdSBtb2lzICsge2R9IHtkd30gZHUgam91ciBvZmZlcnRzLiIsImZyZWUuYmFubmVyX2xlZnQiOiJJbCB0ZSByZXN0ZSB7bX0ge213fSBkdSBtb2lzIGV0IHtkfSB7ZHd9IGR1IGpvdXIuIiwiZnJlZS5tc19vbmUiOiJtYW51c2NyaXQiLCJmcmVlLm1zX21hbnkiOiJtYW51c2NyaXRzIiwiaWEudGl0bGUiOiJJQSBDw6lsZXN0ZSIsImlhLnRpdGxlX21zIjoiSUEgQ8OpbGVzdGUgwrcgY2UgbWFudXNjcml0IiwiaWEuYXZhaWxhYmxlIjoiRGlzcG9uaWJsZSIsImlhLmluY2x1ZGVkIjoiSW5jbHVzZSBkYW5zIGxlIERpdmluIiwiaWEuY2FyZF9vayI6IkVsbGUgdOKAmWFjY29tcGFnbmUgc291cyBjaGFxdWUgbWFudXNjcml0LCBwZW5kYW50IHF1ZSB0dSBsaXMg4oCUIHVuZSBwcsOpc2VuY2UgY2hhbGV1cmV1c2UgcG91ciDDqWNsYWlyZXIgY2UgcXVlIHR1IHJlc3NlbnMuIiwiaWEuY2FyZF9sb2NrIjoiUGVuZGFudCBxdWUgdHUgbGlzLCBlbGxlIHTigJnDqWNvdXRlIDogYXVqb3VyZOKAmWh1aSBs4oCZYW1vdXIgPyBsZSB0cmF2YWlsID8gbGUgYm9uIG1vbWVudCA/IiwiaWEubG9ja19yZWFkZXIiOiJQb3NlIHRlcyBxdWVzdGlvbnMgc3VyIGNlIG1hbnVzY3JpdCBhdmVjIGxlIHBsYW4gRGl2aW4uIiwiaWEucGFzc19kaXZpbiI6IlBhc3NlciBEaXZpbiDCtyAxMzcg4oKsIiwiaWEuZ3VpZGUiOiJFbGxlIGVzdCBsw6AgcG91ciB04oCZw6ljbGFpcmVyLCBzYW5zIGp1Z2VyLiIsImlhLmVtcHR5IjoiVW5lIHF1ZXN0aW9uIHN1ciBjZSBxdWUgdHUgbGlz4oCmIEV4LiA6IHF1ZSBtZSBkaXQgY2V0dGUgcGFnZSBzdXIgbOKAmWFtb3VyID8iLCJpYS5xdWVzdGlvbiI6IlRhIHF1ZXN0aW9uIiwiaWEucGxhY2Vob2xkZXIiOiJRdWUgbWUgcsOpdsOobGUgY2UgcGFzc2FnZSA/IiwiaWEubWljIjoiRGljdGVyIHRhIHF1ZXN0aW9uIiwiaWEuc2VuZCI6IkVudm95ZXIiLCJpYS5idXN5IjoiQ8OpbGVzdGUgcsOpcG9uZCIsImlhLnJlc3QiOiJMZSBjaWVsIHNlIHJlcG9zZSIsImlhLnlvdSI6IlRvaSIsImlhLnJlcGx5X25hbWUiOiJDw6lsZXN0ZSByw6lwb25kIiwiaWEubGlzdGVuIjoiw4ljb3V0ZXIiLCJpYS5zdG9wIjoiQXJyw6p0ZXIiLCJpYS5saXN0ZW5fYXJpYSI6IsOJY291dGVyIGNlIG1lc3NhZ2UiLCJpYS5lcnJfZ2VuZXJpYyI6IkxlIGNpZWwgbmUgcsOpcG9uZCBwYXMgcG91ciBsZSBtb21lbnQuIFLDqWVzc2FpZSBkYW5zIHVuIGluc3RhbnQuIiwiaWEuZXJyXzQwNCI6IkNvbXB0ZSBpbnRyb3V2YWJsZS4gUmVjb25uZWN0ZS10b2kuIiwiaWEuYXNrX2RldmVsb3AiOiJQZXV4LXR1IG1pZXV4IG3igJlleHBsaXF1ZXIgZXQgZMOpdmVsb3BwZXIgY2UgcGFzc2FnZSBkZSBtb24gbWFudXNjcml0ID9cblxuwqsge3Bhc3NhZ2V9IMK7IiwiaWEubWljX2Jsb2NrZWQiOiJNaWNybyBibG9xdcOpLiBBdXRvcmlzZSBsZSBtaWNybyBkYW5zIHRvbiBuYXZpZ2F0ZXVyIHBvdXIgZGljdGVyIHRhIHF1ZXN0aW9uLiIsImlhLm1pY19ub25lIjoiQXVjdW4gbWljcm8gZMOpdGVjdMOpLiBCcmFuY2hlIHVuIG1pY3JvIG91IGF1dG9yaXNlIGzigJlhY2PDqHMgYXVkaW8uIiwiaWEubWljX2ZhaWwiOiJJbXBvc3NpYmxlIGRlIGTDqW1hcnJlciBsYSBkaWN0w6llLiBSw6llc3NhaWUgZGFucyB1biBpbnN0YW50LiIsImlhLm1pY191bnN1cHBvcnRlZCI6IkRpY3TDqWUgbm9uIHN1cHBvcnTDqWUgc3VyIGNlIG5hdmlnYXRldXIiLCJpYS5zcGVlY2hfdW5zdXBwb3J0ZWQiOiJMYSBkaWN0w6llIHZvY2FsZSBu4oCZZXN0IHBhcyBkaXNwb25pYmxlIHN1ciBjZSBuYXZpZ2F0ZXVyLiBTdXIgaVBob25lIG91IGlQYWQsIFNhZmFyaSDDoCBqb3VyIHBldXQgbGEgcHJvcG9zZXIgOyBzaW5vbiB0YXBlIHRhIHF1ZXN0aW9uLiBDaHJvbWUgb3UgRWRnZSBzdXIgb3JkaW5hdGV1ciBmb25jdGlvbm5lbnQgbGUgbWlldXguIiwic2VsLmFzayI6IkRlbWFuZGVyIMOgIGzigJlJQSBDw6lsZXN0ZSBkZSBkw6l2ZWxvcHBlciBjZSBwYXNzYWdlIiwicmVhZGVyLmJhY2siOiLihpAgUmV0b3VyIiwicmVhZGVyLmZzX2VudGVyIjoiTWFudXNjcml0IGVuIHBsZWluIMOpY3JhbiIsInJlYWRlci5mc19leGl0IjoiUXVpdHRlciBsZSBwbGVpbiDDqWNyYW4iLCJyZWFkZXIubXNfdGl0bGUiOiJNYW51c2NyaXQiLCJ3YWl0Lm5hdGFsLnRpdGxlIjoiTGUgTWFudXNjcml0IEPDqWxlc3RlIGRlIHRhIHZpZSBz4oCZw6ljcml0Iiwid2FpdC5uYXRhbC5oaW50IjoiQWxpZ25lbWVudCBkZXMgcGxhbsOodGVzIMK3IGNhbGN1bHMgZHUgY29kZSBkZSB2aWUgwrcgYXNzZW1ibGFnZSBkdSBsYW5nYWdlIGRlIGzigJl1bml2ZXJzLiBOZSBmZXJtZSBwYXMgY2V0dGUgcGFnZS4iLCJ3YWl0Lm5hdGFsLmZhbGxiYWNrIjoiTGUgY2llbCBjb21wb3NlIHRvbiBtYW51c2NyaXQg4oCUIHF1ZWxxdWVzIG1pbnV0ZXMgZGUgc2lsZW5jZS4iLCJ3YWl0Lm1vaXMudGl0bGUiOiJMZSBNYW51c2NyaXQgQ8OpbGVzdGUgZHUgbW9pcyBz4oCZw6ljcml0Iiwid2FpdC5tb2lzLmhpbnQiOiJUb24gdGjDqG1lIG5hdGFsIMK3IGxlIGNsaW1hdCBkdSBtb2lzIMK3IHJlbGl1cmUgZGVzIGNoYXBpdHJlcy4gTmUgZmVybWUgcGFzIGNldHRlIHBhZ2UuIiwid2FpdC5tb2lzLmZhbGxiYWNrIjoiTGUgY2llbCBjb21wb3NlIHRvbiBNYW51c2NyaXQgZHUgbW9pc+KApiBRdWVscXVlcyBtaW51dGVzLiIsIndhaXQuam91ci50aXRsZSI6IkxlIE1hbnVzY3JpdCBDw6lsZXN0ZSBkdSBqb3VyIHPigJnDqWNyaXQiLCJ3YWl0LmpvdXIuaGludCI6IlRvbiB0aMOobWUgwrcgbOKAmcOpbmVyZ2llIGTigJlhdWpvdXJk4oCZaHVpIMK3IHVuZSBzZXVsZSBwb3J0ZSDDoCBvdXZyaXIuIE5lIGZlcm1lIHBhcyBjZXR0ZSBwYWdlLiIsIndhaXQuam91ci5mYWxsYmFjayI6IkxlIGNpZWwgY29tcG9zZSB0b24gTWFudXNjcml0IGR1IGpvdXLigKYiLCJ3YWl0LmNvdXBsZS50aXRsZSI6IkxlIE1hbnVzY3JpdCBDw6lsZXN0ZSBkZSBjb3VwbGUgc+KAmcOpY3JpdCIsIndhaXQuY291cGxlLmhpbnQiOiJEZXV4IHRow6htZXMgwrcgc3luYXN0cmllIMK3IGFzc2VtYmxhZ2UuIE5lIGZlcm1lIHBhcyBjZXR0ZSBwYWdlLiIsIndhaXQuY291cGxlLmZhbGxiYWNrIjoiTGUgY2llbCBjb21wb3NlIHZvdHJlIG1hbnVzY3JpdCBkZSBjb3VwbGXigKYiLCJ3YWl0LnVsdGltZS50aXRsZSI6IkxlIE1hbnVzY3JpdCBVbHRpbWUgc+KAmcOpY3JpdCIsIndhaXQudWx0aW1lLmhpbnQiOiLDiWRpdGlvbiBsb25ndWUgwrcgcGF0aWVuY2UgY8OpbGVzdGUuIE5lIGZlcm1lIHBhcyBjZXR0ZSBwYWdlLiIsIndhaXQudWx0aW1lLmZhbGxiYWNrIjoiTGUgY2llbCBjb21wb3NlIHRvbiBNYW51c2NyaXQgVWx0aW1l4oCmIiwicHJvZy5pYSI6IlRyYWR1Y3Rpb24gZHUgbGFuZ2FnZSBkZSBs4oCZdW5pdmVycyDigJQgYXNzZW1ibGFnZSBkZXMgY2hhcGl0cmVzIGRlIHRhIHZpZeKApiIsInByb2cuaGQiOiJMZWN0dXJlIGRlIHRvbiBjb2RlIGRlIHZpZeKApiIsInByb2cudHoiOiJBbmNyYWdlIGRhbnMgbGUgdGVtcHMgZXQgbOKAmWVzcGFjZeKApiIsInByb2cuYXN0cm8iOiJBbGlnbmVtZW50IGRlcyBwbGFuw6h0ZXPigKYiLCJwcm9nLmh0bWwiOiJBc3NlbWJsYWdlIGV0IHJlbGl1cmUgZHUgbWFudXNjcml04oCmIiwicHJvZy5zeW50aCI6IlNjZWF1IGZpbmFsIOKAlCBsZSBtYW51c2NyaXQgcHJlbmQgc2EgZm9ybWXigKYiLCJhY2NvdW50LnBhdXNlX3N0YXRlIjoiRW4gcGF1c2Ug4oCUIGFjY8OocyBHcmF0dWl0ICg1IG1hbnVzY3JpdHMgZHUgam91ciAvIG1vaXMsIDEgZHUgbW9pcyAvIGFuKSIsImFjY291bnQuYWN0aXZlIjoiQWN0aWYiLCJhY2NvdW50LmluYWN0aXZlIjoiSW5hY3RpZiIsImFjY291bnQubm9fc3ViIjoiU2FucyBhYm9ubmVtZW50IiwiYWNjb3VudC5wcmljZV9tbyI6IntufSDigqwgLyBtb2lzIiwiYWNjb3VudC5pYV9vayI6IkRpc3BvbmlibGUiLCJhY2NvdW50LmlhX3BhdXNlIjoiRW4gcGF1c2Ug4oCUIHNlIHJvdXZyZSBhdmVjIGxlIERpdmluIiwiYWNjb3VudC5pYV9sb2NrIjoiUsOpc2VydsOpZSBhdSBwbGFuIERpdmluIiwiYWNjb3VudC51bHRpbWVfcHJvZyI6IlByb2dyZXNzaW9uIFVsdGltZSIsImFjY291bnQudWx0aW1lX2xpbmUiOiJ7bn0gLyA2IG1vaXMgcGF5w6lzIiwiYWNjb3VudC51bHRpbWVfa2VwdCI6IiAoY29uc2VydsOpcykiLCJhY2NvdW50LmJpcnRoX3NreSI6IkNpZWwgZGUgbmFpc3NhbmNlIiwiYWNjb3VudC5tc19yZWFkeSI6IiDCtyBtYW51c2NyaXQgcHLDqnQiLCJhY2NvdW50LmVkaXRzX2xlZnQiOiJJbCB0ZSByZXN0ZSB7bn0gbW9kaWZpY2F0aW9ue3N9LiIsImFjY291bnQuZWRpdHNfZG9uZSI6IlR1IGFzIHV0aWxpc8OpIHRlcyAzIG1vZGlmaWNhdGlvbnMuIFBvdXIgdG91dGUgY29ycmVjdGlvbiwgY29udGFjdGUgbGUgc3VwcG9ydC4iLCJhY2NvdW50LmVkaXQiOiJNb2RpZmllciIsImFjY291bnQudmlldyI6IkNvbnN1bHRlciIsImFjY291bnQuYmlydGhfZW1wdHkiOiJQYXMgZW5jb3JlIHJlbnNlaWduw6kuIiwiYWNjb3VudC5maWxsX2JpcnRoIjoiUmVuc2VpZ25lciBtb24gY2llbCBkZSBuYWlzc2FuY2UiLCJhY2NvdW50Lm1hbmFnZSI6IkfDqXJlciBtb24gYWJvbm5lbWVudCIsImFjY291bnQubWFuYWdlX2hpbnQiOiJQb3VyIGNoYW5nZXIgZGUgcGxhbiwgYXJyw6p0ZSBk4oCZYWJvcmQgdG9uIGFib25uZW1lbnQgYWN0dWVsLCBwdWlzIHNvdXNjcmlzIMOgIG5vdXZlYXUgw6AgY2VsdWkgZGUgdG9uIGNob2l4LiIsImFjY291bnQuc3VwcG9ydCI6IlBvdXIgdG91dGUgYXNzaXN0YW5jZSA6IGNvbnRhY3RAZm9ybWF0aW9ucy1zcGlyaXR1YWxpdGUtZW5lcmdldGlxdWUuY29tIiwiYWNjb3VudC5yZXN1bWVfbWFuYWdlIjoiUmVwcmVuZHJlIC8gZ8OpcmVyIG1vbiBhYm9ubmVtZW50IiwiYWNjb3VudC5iYWNrX2NlbGVzdGUiOiJSZXBhc3NlciBDw6lsZXN0ZSDCtyA1OSDigqwiLCJhY2NvdW50LnRvX2RpdmluIjoiUGFzc2VyIERpdmluIMK3IDEzNyDigqwiLCJhY2NvdW50LnRvX2NlbGVzdGUiOiJQYXNzZXIgQ8OpbGVzdGUgwrcgNTkg4oKsIiwiYWNjb3VudC5kb3duZ3JhZGVfY2VsZXN0ZSI6IlJldmVuaXIgw6AgQ8OpbGVzdGUgwrcgNTkg4oKsIiwiYWNjb3VudC5tYW5hZ2Vfc3RvcCI6IkfDqXJlciAvIGFycsOqdGVyIGzigJlhYm9ubmVtZW50IiwiYWNjb3VudC5kbF9sYWJlbCI6IlTDqWzDqWNoYXJnZW1lbnQgwrcgRGl2aW4iLCJhY2NvdW50LmRsX2hpbnQiOiJUw6lsw6ljaGFyZ2UgdG91cyB0ZXMgbWFudXNjcml0cyBwcsOqdHMgKG5hdGFsLCBtb2lzLCBqb3VyLCBjb3VwbGXigKYpIGVuIHVuIGZpY2hpZXIgWklQLiIsImFjY291bnQuZGxfYnRuIjoiVMOpbMOpY2hhcmdlciB0b3VzIG1lcyBtYW51c2NyaXRzIiwiYWNjb3VudC5kbF91bmxvY2siOiJEw6libG9jYWdlIGRhbnMge259IG1vaXMiLCJhY2NvdW50LmRsX3Byb2dyZXNzIjoiT3B0aW9uIHLDqXNlcnbDqWUgYXUgRGl2aW4sIGFwcsOocyB7bmVlZH0gbW9pcyBk4oCZYWJvbm5lbWVudC4gUHJvZ3Jlc3Npb24gOiA8Yj57aGF2ZX0gLyB7bmVlZH08L2I+LiIsImVyci51bnJlYWNoYWJsZSI6IkxlcyBNYW51c2NyaXRzIEPDqWxlc3RlcyBuZSBzb250IHBhcyBqb2lnbmFibGVzIHBvdXIgbGUgbW9tZW50LiBSw6llc3NhaWUgZGFucyB1biBpbnN0YW50LiJ9LCJlbiI6eyJicmFuZC5uYW1lIjoiVGhlIENlbGVzdGlhbCBNYW51c2NyaXB0cyIsImJyYW5kLm5hbWVfaHRtbCI6IlRoZSBDZWxlc3RpYWw8YnI+PHNwYW4+TWFudXNjcmlwdHM8L3NwYW4+IiwiYnJhbmQuYWNjb3VudF9hcmlhIjoiQWNjb3VudCIsImxvZ2luLmVtYWlsX3BoIjoieW91QGVtYWlsLmNvbSIsImxvZ2luLmxlZGUiOiJGcmVlLCBDw6lsZXN0ZSAo4oKsNTkpIG9yIERpdmluICjigqwxMzcpLjxicj5Dw6lsZXN0ZSBBSSBhY2NvbXBhbmllcyB5b3Ugb24gRGl2aW4uIiwiZXJyLnVucmVhY2hhYmxlIjoiVGhlIENlbGVzdGlhbCBNYW51c2NyaXB0cyBhcmUgdW5yZWFjaGFibGUgcmlnaHQgbm93LiBUcnkgYWdhaW4gaW4gYSBtb21lbnQuIiwiaW5zdGFsbC50aXRsZV9odG1sIjoiT24geW91cjxicj48c3Bhbj5ob21lIHNjcmVlbjwvc3Bhbj4iLCJpbnN0YWxsLmxlZGUiOiJMaWtlIGFuIGFwcCwgd2l0aG91dCB0aGUgQXBwIFN0b3JlLiIsImluc3RhbGwuc3RlcHNfaW9zIjoiT24gaVBob25lOiB0YXAgPGI+U2hhcmU8L2I+IHRoZW4gPGI+QWRkIHRvIEhvbWUgU2NyZWVuPC9iPi4iLCJpbnN0YWxsLnN0ZXBzX2FuZHJvaWQiOiJPbiBBbmRyb2lkOiB1c2UgdGhlIGJ1dHRvbiBiZWxvdywgb3IgQ2hyb21lIG1lbnUg4oaSIDxiPkFkZCB0byBIb21lIHNjcmVlbjwvYj4uIiwiaW5zdGFsbC5hZGQiOiJBZGQgdG8gaG9tZSBzY3JlZW4iLCJpbnN0YWxsLnNraXAiOiJDb250aW51ZSB3aXRob3V0IGluc3RhbGxpbmciLCJvbmJvYXJkLnRpdGxlX2h0bWwiOiJZb3VyIGJpcnRoPGJyPjxzcGFuPnNreTwvc3Bhbj4iLCJvbmJvYXJkLmxlZGVfbmV3IjoiU2F2ZWQgdW5kZXIge2VtYWlsfSDigJQgZm9yIG5hdGFsLCBkYXkgYW5kIG1vbnRoLiBZb3UgY2FuIGNvcnJlY3QgdXAgdG8gMyB0aW1lcyBpZiBuZWVkZWQuIiwib25ib2FyZC5sZWRlX3JlYWRvbmx5IjoiWW91IGhhdmUgdXNlZCB5b3VyIDMgZWRpdHMuIEZvciBhbnkgZnVydGhlciBjb3JyZWN0aW9uLCBjb250YWN0IHN1cHBvcnQuIiwib25ib2FyZC5sZWRlX2VkaXQiOiJGaXggYSBtaXN0YWtlIGlmIG5lZWRlZC4gWW91IGhhdmUge259IGVkaXR7c30gbGVmdC4iLCJvbmJvYXJkLm5hdGFsX25vdGUiOiJZb3VyIG5hdGFsIG1hbnVzY3JpcHQgaXMgYWxyZWFkeSBnZW5lcmF0ZWQ6IGNoYW5naW5nIHRoaXMgaW5mbyBkb2VzIG5vdCByZWdlbmVyYXRlIGl0IGF1dG9tYXRpY2FsbHkuIiwib25ib2FyZC5lZGl0c19ub25lIjoiTm8gbW9yZSBlZGl0cyBwb3NzaWJsZS4iLCJvbmJvYXJkLmVkaXRzX2xlZnQiOiJZb3UgaGF2ZSB7bn0gZWRpdHtzfSBsZWZ0LiIsIm9uYm9hcmQuc2F2ZV9lZGl0IjoiU2F2ZSBjaGFuZ2VzIiwib25ib2FyZC5zYXZlX25ldyI6IlNhdmUgbXkgcHJvZmlsZSIsIm9uYm9hcmQubm9fbW9yZSI6Ik5vIG1vcmUgZWRpdHMgcG9zc2libGUiLCJvbmJvYXJkLmJhY2siOiJCYWNrIiwib25ib2FyZC5sYXRlciI6IkxhdGVyIiwib25ib2FyZC5iaXJ0aF9kYXRlIjoiRGF0ZSBvZiBiaXJ0aCIsIm9uYm9hcmQuYmlydGhfdGltZSI6IlRpbWUgb2YgYmlydGgiLCJvbmJvYXJkLmJpcnRoX3BsYWNlIjoiUGxhY2Ugb2YgYmlydGgiLCJvbmJvYXJkLnBsYWNlX3BoIjoiVHlwZSBhIGNpdHnigKYgKGUuZy4gTHlvbikiLCJvbmJvYXJkLmdlbmRlciI6IkdlbmRlciIsImdlbmRlci5mZW1tZSI6IldvbWFuIiwiZ2VuZGVyLmhvbW1lIjoiTWFuIiwiZ2VuZGVyLmF1dHJlIjoiT3RoZXIiLCJ3ZWxjb21lLmJhY2siOiJXZWxjb21lIGJhY2ssIHtuYW1lfS4iLCJ3ZWxjb21lLnlvdSI6InlvdSIsInBsYW4uZnJlZSI6IkZyZWUiLCJwbGFuLnBhdXNlX3N1ZmZpeCI6IiDCtyBwYXVzZWQiLCJwbGFuLmxhYmVsIjoie25hbWV9IHBsYW4iLCJwbGFuLmNlbGVzdGUiOiJDw6lsZXN0ZSBwbGFuIiwicGxhbi5kaXZpbiI6IkRpdmluIHBsYW4iLCJwbGFuLmRpdmluX3ByaWNlIjoiRGl2aW4gcGxhbiDCtyDigqwxMzciLCJwbGFuLm9uX2RlbWFuZCI6Ik9uIGRlbWFuZCIsInBsYW4uY2VsZXN0ZV9vcl9kaXZpbiI6IkPDqWxlc3RlIG9yIERpdmluIiwicGxhbi5sb2NrZWQiOiJMb2NrZWQiLCJwbGFuLnVubG9ja2VkIjoiVW5sb2NrZWQiLCJwbGFuLnBhdXNlZCI6IlBhdXNlZCIsIm5hdGFsLmtpY2tlciI6Ik5hdGFsIiwibmF0YWwuaW50cm8iOiJUaGUgMjggcGFnZXMgb2YgeW91ciBjaGFydCDigJQgYWx3YXlzIGF2YWlsYWJsZSB3aGlsZSB5b3VyIHN1YnNjcmlwdGlvbiBpcyBhY3RpdmUuIiwibmF0YWwudGl0bGUiOiJUaGUgQ2VsZXN0aWFsIE1hbnVzY3JpcHQiLCJuYXRhbC5vZl9saWZlIjoib2YgeW91ciBsaWZlIiwibmF0YWwudGl0bGVfcGxhaW4iOiJUaGUgQ2VsZXN0aWFsIE1hbnVzY3JpcHQgb2YgeW91ciBsaWZlIiwibmF0YWwuYXNrIjoiR0VUIE1ZIExJRkUgTUFOVVNDUklQVCIsIm5hdGFsLnJlYWQiOiJWSUVXIE1ZIENFTEVTVElBTCBMSUZFIE1BTlVTQ1JJUFQiLCJuYXRhbC5wYWdlc19wcmljZSI6IjI4IHBhZ2VzIMK3IOKCrDU5IC8gbW9udGgiLCJuYXRhbC5sb2NrX3BhdXNlZCI6IlN1YnNjcmlwdGlvbiBwYXVzZWQ6IG5hdGFsIHJlb3BlbnMgd2hlbiB5b3UgcmVzdW1lLiIsIm5hdGFsLmxvY2tfbmVlZCI6IllvdXIgbGlmZSBtYW51c2NyaXB0IG9wZW5zIHdpdGggdGhlIEPDqWxlc3RlIHN1YnNjcmlwdGlvbi4iLCJuYXRhbC5uZWVkX3Byb2ZpbGUiOiJFbnRlciB5b3VyIGJpcnRoIHNreSBzbyB5b3VyIG1hbnVzY3JpcHQgY2FuIGJlIHdyaXR0ZW4uIiwibmF0YWwuZmlsbF9wcm9maWxlIjoiRW50ZXIgbXkgYmlydGggc2t5IiwibmF0YWwuZXJyX2dlbmVyaWMiOiJHZW5lcmF0aW9uIGNvdWxkIG5vdCBjb21wbGV0ZS4gVHJ5IGFnYWluIGluIGEgbW9tZW50LiIsIm5hdGFsLmVycl9zb2Z0IjoiR2VuZXJhdGlvbiBjb3VsZCBub3QgY29tcGxldGUgcmlnaHQgbm93LiBUcnkgYWdhaW4g4oCUIHlvdXIg4oCcR0VUIE1ZIExJRkUgTUFOVVNDUklQVOKAnSBidXR0b24gcmVtYWlucyBhdmFpbGFibGUuIiwibmF0YWwucmVhZHkiOiJQcm9maWxlIHNhdmVkIMK3IHlvdXIgbWFudXNjcmlwdCBpcyByZWFkeS4iLCJuYXRhbC53YWl0aW5nIjoiUHJvZmlsZSBzYXZlZCDCtyB3YWl0aW5nIGZvciB5b3VyIHJlcXVlc3QuIiwibmF0YWwucmVhZGVyX2ludHJvIjoiSGVyZSBpcyB5b3VyIENlbGVzdGlhbCBNYW51c2NyaXB0IG9mIHlvdXIgbGlmZS4gSW4tYXBwIHJlYWRpbmcgb25seSwgd2hpbGUgeW91ciBzdWJzY3JpcHRpb24gaXMgYWN0aXZlLiIsIm5hdGFsLnVuYXZhaWxhYmxlIjoiTWFudXNjcmlwdCB1bmF2YWlsYWJsZSBmb3Igbm93LiBHbyBiYWNrIGhvbWUgYW5kIHRhcCBHRVQgTVkgTElGRSBNQU5VU0NSSVBULiIsIm5hdGFsLmZyYW1lX3RpdGxlIjoiTmF0YWwgbWFudXNjcmlwdCIsInVsdGltZS50aXRsZSI6IlRoZSBVbHRpbWF0ZSBDZWxlc3RpYWwgTWFudXNjcmlwdCIsInVsdGltZS50aXRsZV9wbGFpbiI6IlRoZSBVbHRpbWF0ZSBDZWxlc3RpYWwgTWFudXNjcmlwdCBvZiB5b3VyIGxpZmUiLCJ1bHRpbWUuYXNrIjoiUmVxdWVzdCB0aGUgVWx0aW1hdGUiLCJ1bHRpbWUucmVhZCI6IlZJRVcgVEhFIFVMVElNQVRFIE1BTlVTQ1JJUFQiLCJ1bHRpbWUuZGl2aW5fbm93IjoiSW5jbHVkZWQgcmlnaHQgYXdheSB3aXRoIERpdmluLiIsInVsdGltZS5zaXhfbW9udGhzIjoiU2l4IG1vbnRocyBwYWlkLCBldmVuIHdpdGggcGF1c2VzLiIsInVsdGltZS5vbmNlIjoiIFdyaXR0ZW4gb25jZSwgYXQgeW91ciByZXF1ZXN0LiIsInVsdGltZS5sb2NrX2ludHJvIjoiQWZ0ZXIgNiBDw6lsZXN0ZSBtb250aHMsIG9yIGltbWVkaWF0ZWx5IHdpdGggRGl2aW4uIiwidWx0aW1lLnBhdXNlX3Jlb3BlbiI6IlRoZSBVbHRpbWF0ZSByZW9wZW5zIHdoZW4geW91IHJlc3VtZSB5b3VyIHN1YnNjcmlwdGlvbi4iLCJ1bHRpbWUubW9udGhzX2tlcHQiOiIgWW91ciA8Yj57bn0gbW9udGhzPC9iPiByZW1haW4gY291bnRlZC4iLCJ1bHRpbWUubG9ja19wcm9ncmVzcyI6IllvdSBoYXZlIDxiPntoYXZlfSBtb250aHM8L2I+IGFscmVhZHkgcGFpZC4gPGI+e2xlZnR9PC9iPiBsZWZ0IOKAlCBhIHBhdXNlIGRvZXMgbm90IGJyZWFrIHRoZSBzdHJlYWsuIiwidWx0aW1lLnBhZ2VzX2xvY2tlZCI6IntufSBwYWdlcyDCtyA2IHBhaWQgbW9udGhzLCBjdW11bGF0aXZlIiwidWx0aW1lLnBhZ2VzX3VubG9ja2VkIjoie259IHBhZ2VzIMK3IGFscmVhZHkgdW5sb2NrZWQiLCJ1bHRpbWUucGFnZXNfcGxhaW4iOiJ7bn0gcGFnZXMiLCJ1bHRpbWUubmVlZF9wcm9maWxlIjoiRW50ZXIgeW91ciBiaXJ0aCBza3kgc28gdGhlIFVsdGltYXRlIGNhbiBiZSB3cml0dGVuLiIsInVsdGltZS5lcnJfZ2VuZXJpYyI6IlVsdGltYXRlIGdlbmVyYXRpb24gY291bGQgbm90IGNvbXBsZXRlLiBUcnkgYWdhaW4uIiwidWx0aW1lLmVycl9zb2Z0IjoiR2VuZXJhdGlvbiBjb3VsZCBub3QgY29tcGxldGUgcmlnaHQgbm93LiBUcnkgYWdhaW4g4oCUIHlvdXIg4oCcUmVxdWVzdCB0aGUgVWx0aW1hdGXigJ0gYnV0dG9uIHJlbWFpbnMgYXZhaWxhYmxlLiIsInVsdGltZS5yZWFkeSI6IllvdXIgVWx0aW1hdGUgTWFudXNjcmlwdCBpcyByZWFkeS4iLCJ1bHRpbWUud2FpdGluZyI6IlVubG9ja2VkIMK3IHdhaXRpbmcgZm9yIHlvdXIgcmVxdWVzdC4iLCJ1bHRpbWUua2lja2VyIjoiVWx0aW1hdGUgZWRpdGlvbiIsInVsdGltZS5yZWFkZXJfZGl2aW4iOiJIZXJlIGlzIHlvdXIgVWx0aW1hdGUgQ2VsZXN0aWFsIE1hbnVzY3JpcHQsIGluY2x1ZGVkIHdpdGggRGl2aW4uIEluLWFwcCByZWFkaW5nIHdoaWxlIHlvdXIgc3Vic2NyaXB0aW9uIGlzIGFjdGl2ZS4iLCJ1bHRpbWUucmVhZGVyX3BhaWQiOiJIZXJlIGlzIHlvdXIgVWx0aW1hdGUgQ2VsZXN0aWFsIE1hbnVzY3JpcHQsIHVubG9ja2VkIGFmdGVyIDYgcGFpZCBtb250aHMuIEluLWFwcCByZWFkaW5nIHdoaWxlIHlvdXIgc3Vic2NyaXB0aW9uIGlzIGFjdGl2ZS4iLCJ1bHRpbWUudW5hdmFpbGFibGUiOiJVbHRpbWF0ZSBtYW51c2NyaXB0IHVuYXZhaWxhYmxlLiBHbyBiYWNrIGhvbWUgYW5kIHRhcCDigJxSZXF1ZXN0IHRoZSBVbHRpbWF0ZeKAnS4iLCJ1bHRpbWUuZnJhbWVfdGl0bGUiOiJVbHRpbWF0ZSBtYW51c2NyaXB0IiwibW9pcy5sYWJlbCI6IlRoaXMgbW9udGgiLCJtb2lzLmludHJvIjoiQXZhaWxhYmxlIGFsbCBtb250aC4gWW91ciBDZWxlc3RpYWwgTWFudXNjcmlwdCBmb3IgdGhlIGN1cnJlbnQgbW9udGguIEhvdyB5b3VyIHN0YXJzIHNwZWFrIHRoaXMgbW9udGgiLCJtb2lzLnRpdGxlX2h0bWwiOiJDZWxlc3RpYWwgTWFudXNjcmlwdCA8c3BhbiBjbGFzcz1cImRlLWNlLW1vaXNcIj5GT1IgVEhJUyBNT05USCBPRiB7bW9udGh9PC9zcGFuPiIsIm1vaXMudGl0bGVfcGxhaW4iOiJDZWxlc3RpYWwgTWFudXNjcmlwdCBGT1IgVEhJUyBNT05USCBPRiB7bW9udGh9IiwibW9pcy5hc2siOiJSZXF1ZXN0IHRoaXMgbW9udGjigJlzIG1hbnVzY3JpcHQiLCJtb2lzLnJlYWQiOiJSZXJlYWQgdGhpcyBtb250aOKAmXMgbWFudXNjcmlwdCIsIm1vaXMucXVvdGEiOiIgwrcge3VzZWR9IC8gMSB0aGlzIHllYXIgKEZyZWUpIiwibW9pcy5yZWFkZXJfaW50cm8iOiJIZXJlIGlzIHlvdXIgQ2VsZXN0aWFsIE1hbnVzY3JpcHQgb2YgdGhlIG1vbnRoLiBJbi1hcHAgcmVhZGluZyBvbmx5LCB3aGlsZSB5b3VyIHN1YnNjcmlwdGlvbiBpcyBhY3RpdmUuIiwibW9pcy5mcmFtZV90aXRsZSI6Ik1vbnRoIG1hbnVzY3JpcHQiLCJqb3VyLmxhYmVsIjoiVG9kYXkiLCJqb3VyLmludHJvIjoiWW91ciBDZWxlc3RpYWwgTWFudXNjcmlwdCBmb3IgdGhpcyBkYXkuIEhvdyB5b3VyIHN0YXJzIHNwZWFrIFRPREFZIiwiam91ci50aXRsZSI6IkNlbGVzdGlhbCBNYW51c2NyaXB0IG9mIHtkYXRlfSIsImpvdXIuYXNrIjoiR0VUIFRPREFZ4oCZUyBNQU5VU0NSSVBUIiwiam91ci5yZWFkIjoiUmVyZWFkIHRvZGF54oCZcyBtYW51c2NyaXB0Iiwiam91ci5xdW90YSI6IiDCtyB7dXNlZH0gLyA1IHRoaXMgbW9udGggKEZyZWUpIiwiam91ci5yZWFkZXJfaW50cm8iOiJIZXJlIGlzIHlvdXIgQ2VsZXN0aWFsIE1hbnVzY3JpcHQgb2YgdGhlIGRheS4gSW4tYXBwIHJlYWRpbmcgb25seSwgd2hpbGUgeW91ciBzdWJzY3JpcHRpb24gaXMgYWN0aXZlLiIsImpvdXIuZnJhbWVfdGl0bGUiOiJEYXkgbWFudXNjcmlwdCIsInBlcmlvZC51bmF2YWlsYWJsZSI6Ik1hbnVzY3JpcHQgdW5hdmFpbGFibGUgZm9yIG5vdy4gR28gYmFjayB0byB0aGUgdGFiIGFuZCByZXF1ZXN0IGl0IGFnYWluLiIsInBlcmlvZC5lcnJfaW50ZXJydXB0IjoiR2VuZXJhdGlvbiBpbnRlcnJ1cHRlZC4gVHJ5IGFnYWluLiIsImNvdXBsZS5raWNrZXIiOiJTeW5hc3RyeSIsImNvdXBsZS5sZWRlX2xvY2siOiJTeW5hc3RyeSBmb3IgdHdvIiwiY291cGxlLnRpdGxlX2h0bWwiOiJDZWxlc3RpYWwgTWFudXNjcmlwdCA8c3BhbiBjbGFzcz1cImRlLXRhLXZpZVwiPkNvdXBsZTwvc3Bhbj4iLCJjb3VwbGUudGl0bGVfcGxhaW4iOiJDZWxlc3RpYWwgQ291cGxlIE1hbnVzY3JpcHQiLCJjb3VwbGUudGl0bGVfc2hvcnQiOiJDb3VwbGUgbWFudXNjcmlwdCIsImNvdXBsZS5pbnRybyI6Ikh1bWFuIERlc2lnbiDDlyBBc3Ryb2xvZ3kgc3luYXN0cnkgZm9yIHlvdSBib3RoIOKAlCBvbmUgY291cGxlIG1hbnVzY3JpcHQgcGVyIGNhbGVuZGFyIG1vbnRoLCBEaXZpbiBwbGFuIG9ubHkuIiwiY291cGxlLmFzayI6IlJlcXVlc3QgdGhlIGNvdXBsZSBtYW51c2NyaXB0IiwiY291cGxlLnJlYWQiOiJSZXJlYWQgdGhlIGNvdXBsZSBtYW51c2NyaXB0IiwiY291cGxlLnF1b3RhIjoie259IC8gMSB0aGlzIG1vbnRoIiwiY291cGxlLmxvY2tfcGF1c2VkIjoiU3Vic2NyaXB0aW9uIHBhdXNlZDogdGhlIGNvdXBsZSBtYW51c2NyaXB0IHJlb3BlbnMgd2hlbiB5b3UgcmVzdW1lIERpdmluLiIsImNvdXBsZS5sb2NrX25lZWQiOiJSZXNlcnZlZCBmb3IgRGl2aW4g4oCUIHR3byBza2llcyBjcm9zc2VkLCBvbmNlIHBlciBjYWxlbmRhciBtb250aC4iLCJjb3VwbGUuZGlzY292ZXIiOiJEaXNjb3ZlciBEaXZpbiIsImNvdXBsZS53aXRoIjoiV2l0aCB7bmFtZX0iLCJjb3VwbGUuZWRpdCI6IkVkaXQiLCJjb3VwbGUuZXJyX2dlbmVyaWMiOiJHZW5lcmF0aW9uIGNvdWxkIG5vdCBjb21wbGV0ZS4iLCJjb3VwbGUucmVhZGVyX2ludHJvIjoiSGVyZSBpcyB5b3VyIENlbGVzdGlhbCBDb3VwbGUgTWFudXNjcmlwdC4gSW4tYXBwIHJlYWRpbmcgb25seSwgd2hpbGUgeW91ciBEaXZpbiBzdWJzY3JpcHRpb24gaXMgYWN0aXZlLiIsImNvdXBsZS51bmF2YWlsYWJsZSI6IkNvdXBsZSBtYW51c2NyaXB0IHVuYXZhaWxhYmxlLiBHbyBiYWNrIHRvIHRoZSBDb3VwbGUgdGFiLiIsImNvdXBsZS5mcmFtZV90aXRsZSI6IkNvdXBsZSBtYW51c2NyaXB0IiwiY291cGxlLm5vdF9yZWFkeSI6IllvdXIgY291cGxlIG1hbnVzY3JpcHQgaXMgbm90IHJlYWR5IHlldC4iLCJjb3VwbGUubWlzc2luZ19saW5rIjoiTWFudXNjcmlwdCBsaW5rIG1pc3NpbmcuIFNpZ24gaW4gYWdhaW4gdGhlbiByZXRyeS4iLCJjb3VwbGUuZmlsZV9taXNzaW5nIjoiQ291cGxlIGZpbGUgbm90IGZvdW5kLiBUYXAg4oCcUmVxdWVzdCB0aGUgY291cGxlIG1hbnVzY3JpcHTigJ0gYWdhaW4uIiwicGFydG5lci5sYWJlbCI6IlBhcnRuZXIiLCJwYXJ0bmVyLnRpdGxlIjoiUGFydG5lcuKAmXMgYmlydGggc2t5IiwicGFydG5lci5oaW50IjoiRmlyc3QgbmFtZSwgZGF0ZSwgdGltZSwgcGxhY2UgYW5kIGdlbmRlciDigJQgbGlrZSB5b3VyIHByb2ZpbGUuICIsInBhcnRuZXIubm9fZWRpdHMiOiJObyBtb3JlIGVkaXRzLiIsInBhcnRuZXIuZWRpdHNfbGVmdCI6IllvdSBoYXZlIHtufSBjb3JyZWN0aW9ue3N9IGxlZnQuIiwicGFydG5lci5lZGl0c19pbnRybyI6IllvdSBjYW4gY29ycmVjdCB1cCB0byAzIHRpbWVzLiIsInBhcnRuZXIucHJlbm9tIjoiRmlyc3QgbmFtZSIsInBhcnRuZXIucGxhY2VfcGgiOiJUeXBlIGEgY2l0eeKApiIsInBhcnRuZXIuc2F2ZSI6IlNhdmUgcGFydG5lciIsInBhcnRuZXIuYmFjayI6IkJhY2siLCJwYXVzZS5sYWJlbCI6IlN1YnNjcmlwdGlvbiBwYXVzZWQiLCJwYXVzZS50aXRsZSI6IlNwYWNlIHBhdXNlZCIsInBhdXNlLmJvZHkiOiJZb3VyIHtwbGFufSBzdWJzY3JpcHRpb24gaXMgcGF1c2VkLiBZb3Uga2VlcCBGcmVlIGFjY2VzczogMSBtb250aCBtYW51c2NyaXB0ICsgNSBkYXkgbWFudXNjcmlwdHMuIE5hdGFsLCBVbHRpbWF0ZSBhbmQgQ8OpbGVzdGUgQUkgcmVvcGVuIHdoZW4geW91IHJlc3VtZS4iLCJwYXVzZS51bHRpbWVfbm90ZSI6IlVsdGltYXRlIG1vbnRocyBrZXB0OiB7bn0gLyA2LiIsInBhdXNlLnJlc3VtZSI6IlJlc3VtZSBteSBzdWJzY3JpcHRpb24iLCJwYXVzZS5yZWZyZXNoIjoiSSByZXN1bWVkIOKAlCByZWZyZXNoIiwiZnJlZS5iYW5uZXJfZnVsbCI6IkZyZWUgYWNjZXNzOiB7bX0gbW9udGgge213fSArIHtkfSBkYXkge2R3fSBpbmNsdWRlZC4iLCJmcmVlLmJhbm5lcl9sZWZ0IjoiWW91IGhhdmUge219IG1vbnRoIHttd30gYW5kIHtkfSBkYXkge2R3fSBsZWZ0LiIsImZyZWUubXNfb25lIjoibWFudXNjcmlwdCIsImZyZWUubXNfbWFueSI6Im1hbnVzY3JpcHRzIiwiaWEudGl0bGUiOiJDw6lsZXN0ZSBBSSIsImlhLnRpdGxlX21zIjoiQ8OpbGVzdGUgQUkgwrcgdGhpcyBtYW51c2NyaXB0IiwiaWEuYXZhaWxhYmxlIjoiQXZhaWxhYmxlIiwiaWEuaW5jbHVkZWQiOiJJbmNsdWRlZCB3aXRoIERpdmluIiwiaWEuY2FyZF9vayI6IlNoZSBhY2NvbXBhbmllcyB5b3UgdW5kZXIgZWFjaCBtYW51c2NyaXB0IGFzIHlvdSByZWFkIOKAlCBhIHdhcm0gcHJlc2VuY2UgdG8gY2xhcmlmeSB3aGF0IHlvdSBmZWVsLiIsImlhLmNhcmRfbG9jayI6IkFzIHlvdSByZWFkLCBzaGUgbGlzdGVuczogbG92ZSB0b2RheT8gd29yaz8gdGhlIHJpZ2h0IG1vbWVudD8iLCJpYS5sb2NrX3JlYWRlciI6IkFzayBxdWVzdGlvbnMgYWJvdXQgdGhpcyBtYW51c2NyaXB0IHdpdGggdGhlIERpdmluIHBsYW4uIiwiaWEucGFzc19kaXZpbiI6IkdvIERpdmluIMK3IOKCrDEzNyIsImlhLmd1aWRlIjoiU2hlIGlzIGhlcmUgdG8gaWxsdW1pbmF0ZSwgd2l0aG91dCBqdWRnbWVudC4iLCJpYS5lbXB0eSI6IkEgcXVlc3Rpb24gYWJvdXQgd2hhdCB5b3UgYXJlIHJlYWRpbmfigKYgZS5nLiB3aGF0IGRvZXMgdGhpcyBwYWdlIHNheSBhYm91dCBsb3ZlPyIsImlhLnF1ZXN0aW9uIjoiWW91ciBxdWVzdGlvbiIsImlhLnBsYWNlaG9sZGVyIjoiV2hhdCBkb2VzIHRoaXMgcGFzc2FnZSByZXZlYWw/IiwiaWEubWljIjoiRGljdGF0ZSB5b3VyIHF1ZXN0aW9uIiwiaWEuc2VuZCI6IlNlbmQiLCJpYS5idXN5IjoiQ8OpbGVzdGUgcmVzcG9uZHMiLCJpYS5yZXN0IjoiVGhlIHNreSBpcyByZXN0aW5nIiwiaWEueW91IjoiWW91IiwiaWEucmVwbHlfbmFtZSI6IkPDqWxlc3RlIHJlcGxpZXMiLCJpYS5saXN0ZW4iOiJMaXN0ZW4iLCJpYS5zdG9wIjoiU3RvcCIsImlhLmxpc3Rlbl9hcmlhIjoiTGlzdGVuIHRvIHRoaXMgbWVzc2FnZSIsImlhLmVycl9nZW5lcmljIjoiVGhlIHNreSBpcyBub3QgYW5zd2VyaW5nIHJpZ2h0IG5vdy4gVHJ5IGFnYWluIGluIGEgbW9tZW50LiIsImlhLmVycl80MDQiOiJBY2NvdW50IG5vdCBmb3VuZC4gU2lnbiBpbiBhZ2Fpbi4iLCJpYS5hc2tfZGV2ZWxvcCI6IkNhbiB5b3UgZXhwbGFpbiBhbmQgZXhwYW5kIHRoaXMgcGFzc2FnZSBmcm9tIG15IG1hbnVzY3JpcHQ/XG5cbuKAnHtwYXNzYWdlfeKAnSIsImlhLm1pY19ibG9ja2VkIjoiTWljcm9waG9uZSBibG9ja2VkLiBBbGxvdyB0aGUgbWljIGluIHlvdXIgYnJvd3NlciB0byBkaWN0YXRlIHlvdXIgcXVlc3Rpb24uIiwiaWEubWljX25vbmUiOiJObyBtaWNyb3Bob25lIGRldGVjdGVkLiBQbHVnIG9uZSBpbiBvciBhbGxvdyBhdWRpbyBhY2Nlc3MuIiwiaWEubWljX2ZhaWwiOiJDb3VsZCBub3Qgc3RhcnQgZGljdGF0aW9uLiBUcnkgYWdhaW4gaW4gYSBtb21lbnQuIiwiaWEubWljX3Vuc3VwcG9ydGVkIjoiRGljdGF0aW9uIG5vdCBzdXBwb3J0ZWQgaW4gdGhpcyBicm93c2VyIiwiaWEuc3BlZWNoX3Vuc3VwcG9ydGVkIjoiVm9pY2UgZGljdGF0aW9uIGlzIG5vdCBhdmFpbGFibGUgaW4gdGhpcyBicm93c2VyLiBPbiBpUGhvbmUgb3IgaVBhZCwgYW4gdXAtdG8tZGF0ZSBTYWZhcmkgbWF5IG9mZmVyIGl0OyBvdGhlcndpc2UgdHlwZSB5b3VyIHF1ZXN0aW9uLiBDaHJvbWUgb3IgRWRnZSBvbiBkZXNrdG9wIHdvcmsgYmVzdC4iLCJzZWwuYXNrIjoiQXNrIEPDqWxlc3RlIEFJIHRvIGV4cGFuZCB0aGlzIHBhc3NhZ2UiLCJyZWFkZXIuYmFjayI6IuKGkCBCYWNrIiwicmVhZGVyLmZzX2VudGVyIjoiTWFudXNjcmlwdCBmdWxsc2NyZWVuIiwicmVhZGVyLmZzX2V4aXQiOiJFeGl0IGZ1bGxzY3JlZW4iLCJyZWFkZXIubXNfdGl0bGUiOiJNYW51c2NyaXB0Iiwid2FpdC5uYXRhbC50aXRsZSI6IllvdXIgQ2VsZXN0aWFsIGxpZmUgbWFudXNjcmlwdCBpcyBiZWluZyB3cml0dGVuIiwid2FpdC5uYXRhbC5oaW50IjoiUGxhbmV0IGFsaWdubWVudCDCtyBsaWZlLWNvZGUgY2FsY3VsYXRpb25zIMK3IHdlYXZpbmcgdGhlIGxhbmd1YWdlIG9mIHRoZSB1bml2ZXJzZS4gRG8gbm90IGNsb3NlIHRoaXMgcGFnZS4iLCJ3YWl0Lm5hdGFsLmZhbGxiYWNrIjoiVGhlIHNreSBpcyBjb21wb3NpbmcgeW91ciBtYW51c2NyaXB0IOKAlCBhIGZldyBtaW51dGVzIG9mIHNpbGVuY2UuIiwid2FpdC5tb2lzLnRpdGxlIjoiWW91ciBDZWxlc3RpYWwgbW9udGggbWFudXNjcmlwdCBpcyBiZWluZyB3cml0dGVuIiwid2FpdC5tb2lzLmhpbnQiOiJZb3VyIG5hdGFsIGNoYXJ0IMK3IHRoaXMgbW9udGjigJlzIGNsaW1hdGUgwrcgYmluZGluZyB0aGUgY2hhcHRlcnMuIERvIG5vdCBjbG9zZSB0aGlzIHBhZ2UuIiwid2FpdC5tb2lzLmZhbGxiYWNrIjoiVGhlIHNreSBpcyBjb21wb3NpbmcgeW91ciBtb250aCBtYW51c2NyaXB04oCmIEEgZmV3IG1pbnV0ZXMuIiwid2FpdC5qb3VyLnRpdGxlIjoiWW91ciBDZWxlc3RpYWwgZGF5IG1hbnVzY3JpcHQgaXMgYmVpbmcgd3JpdHRlbiIsIndhaXQuam91ci5oaW50IjoiWW91ciBjaGFydCDCtyB0b2RheeKAmXMgZW5lcmd5IMK3IG9uZSBkb29yIHRvIG9wZW4uIERvIG5vdCBjbG9zZSB0aGlzIHBhZ2UuIiwid2FpdC5qb3VyLmZhbGxiYWNrIjoiVGhlIHNreSBpcyBjb21wb3NpbmcgeW91ciBkYXkgbWFudXNjcmlwdOKApiIsIndhaXQuY291cGxlLnRpdGxlIjoiWW91ciBDZWxlc3RpYWwgY291cGxlIG1hbnVzY3JpcHQgaXMgYmVpbmcgd3JpdHRlbiIsIndhaXQuY291cGxlLmhpbnQiOiJUd28gY2hhcnRzIMK3IHN5bmFzdHJ5IMK3IGFzc2VtYmx5LiBEbyBub3QgY2xvc2UgdGhpcyBwYWdlLiIsIndhaXQuY291cGxlLmZhbGxiYWNrIjoiVGhlIHNreSBpcyBjb21wb3NpbmcgeW91ciBjb3VwbGUgbWFudXNjcmlwdOKApiIsIndhaXQudWx0aW1lLnRpdGxlIjoiVGhlIFVsdGltYXRlIE1hbnVzY3JpcHQgaXMgYmVpbmcgd3JpdHRlbiIsIndhaXQudWx0aW1lLmhpbnQiOiJMb25nIGVkaXRpb24gwrcgY2VsZXN0aWFsIHBhdGllbmNlLiBEbyBub3QgY2xvc2UgdGhpcyBwYWdlLiIsIndhaXQudWx0aW1lLmZhbGxiYWNrIjoiVGhlIHNreSBpcyBjb21wb3NpbmcgeW91ciBVbHRpbWF0ZSBNYW51c2NyaXB04oCmIiwicHJvZy5pYSI6IlRyYW5zbGF0aW5nIHRoZSBsYW5ndWFnZSBvZiB0aGUgdW5pdmVyc2Ug4oCUIGFzc2VtYmxpbmcgdGhlIGNoYXB0ZXJzIG9mIHlvdXIgbGlmZeKApiIsInByb2cuaGQiOiJSZWFkaW5nIHlvdXIgbGlmZSBjb2Rl4oCmIiwicHJvZy50eiI6IkFuY2hvcmluZyBpbiB0aW1lIGFuZCBzcGFjZeKApiIsInByb2cuYXN0cm8iOiJBbGlnbmluZyB0aGUgcGxhbmV0c+KApiIsInByb2cuaHRtbCI6IkFzc2VtYmxpbmcgYW5kIGJpbmRpbmcgdGhlIG1hbnVzY3JpcHTigKYiLCJwcm9nLnN5bnRoIjoiRmluYWwgc2VhbCDigJQgdGhlIG1hbnVzY3JpcHQgdGFrZXMgc2hhcGXigKYiLCJhY2NvdW50LnBhdXNlX3N0YXRlIjoiUGF1c2VkIOKAlCBGcmVlIGFjY2VzcyAoNSBkYXkgbWFudXNjcmlwdHMgLyBtb250aCwgMSBtb250aCBtYW51c2NyaXB0IC8geWVhcikiLCJhY2NvdW50LmFjdGl2ZSI6IkFjdGl2ZSIsImFjY291bnQuaW5hY3RpdmUiOiJJbmFjdGl2ZSIsImFjY291bnQubm9fc3ViIjoiTm8gc3Vic2NyaXB0aW9uIiwiYWNjb3VudC5wcmljZV9tbyI6IuKCrHtufSAvIG1vbnRoIiwiYWNjb3VudC5pYV9vayI6IkF2YWlsYWJsZSIsImFjY291bnQuaWFfcGF1c2UiOiJQYXVzZWQg4oCUIHJlb3BlbnMgd2l0aCBEaXZpbiIsImFjY291bnQuaWFfbG9jayI6IlJlc2VydmVkIGZvciBEaXZpbiIsImFjY291bnQudWx0aW1lX3Byb2ciOiJVbHRpbWF0ZSBwcm9ncmVzcyIsImFjY291bnQudWx0aW1lX2xpbmUiOiJ7bn0gLyA2IG1vbnRocyBwYWlkIiwiYWNjb3VudC51bHRpbWVfa2VwdCI6IiAoa2VwdCkiLCJhY2NvdW50LmJpcnRoX3NreSI6IkJpcnRoIHNreSIsImFjY291bnQubXNfcmVhZHkiOiIgwrcgbWFudXNjcmlwdCByZWFkeSIsImFjY291bnQuZWRpdHNfbGVmdCI6IllvdSBoYXZlIHtufSBlZGl0e3N9IGxlZnQuIiwiYWNjb3VudC5lZGl0c19kb25lIjoiWW91IGhhdmUgdXNlZCB5b3VyIDMgZWRpdHMuIEZvciBhbnkgY29ycmVjdGlvbiwgY29udGFjdCBzdXBwb3J0LiIsImFjY291bnQuZWRpdCI6IkVkaXQiLCJhY2NvdW50LnZpZXciOiJWaWV3IiwiYWNjb3VudC5iaXJ0aF9lbXB0eSI6Ik5vdCBmaWxsZWQgaW4geWV0LiIsImFjY291bnQuZmlsbF9iaXJ0aCI6IkVudGVyIG15IGJpcnRoIHNreSIsImFjY291bnQubWFuYWdlIjoiTWFuYWdlIG15IHN1YnNjcmlwdGlvbiIsImFjY291bnQubWFuYWdlX2hpbnQiOiJUbyBjaGFuZ2UgcGxhbnMsIGZpcnN0IHN0b3AgeW91ciBjdXJyZW50IHN1YnNjcmlwdGlvbiwgdGhlbiBzdWJzY3JpYmUgYWdhaW4gdG8gdGhlIG9uZSB5b3Ugd2FudC4iLCJhY2NvdW50LnN1cHBvcnQiOiJGb3IgaGVscDogY29udGFjdEBmb3JtYXRpb25zLXNwaXJpdHVhbGl0ZS1lbmVyZ2V0aXF1ZS5jb20iLCJhY2NvdW50LnJlc3VtZV9tYW5hZ2UiOiJSZXN1bWUgLyBtYW5hZ2UgbXkgc3Vic2NyaXB0aW9uIiwiYWNjb3VudC5iYWNrX2NlbGVzdGUiOiJCYWNrIHRvIEPDqWxlc3RlIMK3IOKCrDU5IiwiYWNjb3VudC50b19kaXZpbiI6IkdvIERpdmluIMK3IOKCrDEzNyIsImFjY291bnQudG9fY2VsZXN0ZSI6IkdvIEPDqWxlc3RlIMK3IOKCrDU5IiwiYWNjb3VudC5kb3duZ3JhZGVfY2VsZXN0ZSI6IlJldHVybiB0byBDw6lsZXN0ZSDCtyDigqw1OSIsImFjY291bnQubWFuYWdlX3N0b3AiOiJNYW5hZ2UgLyBzdG9wIHN1YnNjcmlwdGlvbiIsImFjY291bnQuZGxfbGFiZWwiOiJEb3dubG9hZCDCtyBEaXZpbiIsImFjY291bnQuZGxfaGludCI6IkRvd25sb2FkIGFsbCB5b3VyIHJlYWR5IG1hbnVzY3JpcHRzIChuYXRhbCwgbW9udGgsIGRheSwgY291cGxl4oCmKSBhcyBvbmUgWklQLiIsImFjY291bnQuZGxfYnRuIjoiRG93bmxvYWQgYWxsIG15IG1hbnVzY3JpcHRzIiwiYWNjb3VudC5kbF91bmxvY2siOiJVbmxvY2tzIGluIHtufSBtb250aHMiLCJhY2NvdW50LmRsX3Byb2dyZXNzIjoiRGl2aW4tb25seSBvcHRpb24sIGFmdGVyIHtuZWVkfSBtb250aHMgc3Vic2NyaWJlZC4gUHJvZ3Jlc3M6IDxiPntoYXZlfSAvIHtuZWVkfTwvYj4uIn0sImVzIjp7ImJyYW5kLm5hbWUiOiJMb3MgTWFudXNjcml0b3MgQ2VsZXN0ZXMiLCJicmFuZC5uYW1lX2h0bWwiOiJMb3MgTWFudXNjcml0b3M8YnI+PHNwYW4+Q2VsZXN0ZXM8L3NwYW4+IiwiYnJhbmQuYWNjb3VudF9hcmlhIjoiQ3VlbnRhIiwibG9naW4uZW1haWxfcGgiOiJ0dUBlbWFpbC5jb20iLCJlcnIudW5yZWFjaGFibGUiOiJMb3MgTWFudXNjcml0b3MgQ2VsZXN0ZXMgbm8gZXN0w6FuIGRpc3BvbmlibGVzLiBJbnTDqW50YWxvIGVuIHVuIG1vbWVudG8uIiwiaW5zdGFsbC50aXRsZV9odG1sIjoiRW4gdHU8YnI+PHNwYW4+cGFudGFsbGEgZGUgaW5pY2lvPC9zcGFuPiIsImluc3RhbGwubGVkZSI6IkNvbW8gdW5hIGFwcCwgc2luIGxhIEFwcCBTdG9yZS4iLCJpbnN0YWxsLnN0ZXBzX2lvcyI6IkVuIGlQaG9uZTogcHVsc2EgPGI+Q29tcGFydGlyPC9iPiB5IGx1ZWdvIDxiPkVuIHBhbnRhbGxhIGRlIGluaWNpbzwvYj4uIiwiaW5zdGFsbC5zdGVwc19hbmRyb2lkIjoiRW4gQW5kcm9pZDogZWwgYm90w7NuIGRlIGFiYWpvLCBvIG1lbsO6IENocm9tZSDihpIgPGI+QcOxYWRpciBhIHBhbnRhbGxhIGRlIGluaWNpbzwvYj4uIiwiaW5zdGFsbC5hZGQiOiJBw7FhZGlyIGEgbGEgcGFudGFsbGEiLCJpbnN0YWxsLnNraXAiOiJDb250aW51YXIgc2luIGluc3RhbGFyIiwib25ib2FyZC50aXRsZV9odG1sIjoiVHUgY2llbG88YnI+PHNwYW4+ZGUgbmFjaW1pZW50bzwvc3Bhbj4iLCJvbmJvYXJkLmxlZGVfbmV3IjoiUmVnaXN0cmFkbyBjb21vIHtlbWFpbH0g4oCUIHBhcmEgbmF0YWwsIGTDrWEgeSBtZXMuIFBvZHLDoXMgY29ycmVnaXIgaGFzdGEgMyB2ZWNlcyBzaSBoYXkgZXJyb3IuIiwib25ib2FyZC5sZWRlX3JlYWRvbmx5IjoiSGFzIHVzYWRvIHR1cyAzIG1vZGlmaWNhY2lvbmVzLiBQYXJhIG90cmEgY29ycmVjY2nDs24sIGNvbnRhY3RhIGNvbiBzb3BvcnRlLiIsIm9uYm9hcmQubGVkZV9lZGl0IjoiQ29ycmlnZSB1biBlcnJvciBzaSBoYWNlIGZhbHRhLiBUZSBxdWVkYW4ge259IG1vZGlmaWNhY2nDs257ZXN9LiIsIm9uYm9hcmQubmF0YWxfbm90ZSI6IlR1IG1hbnVzY3JpdG8gbmF0YWwgeWEgZXN0w6EgZ2VuZXJhZG86IGNhbWJpYXIgZXN0b3MgZGF0b3Mgbm8gbG8gcmVnZW5lcmEgYXV0b23DoXRpY2FtZW50ZS4iLCJvbmJvYXJkLmVkaXRzX25vbmUiOiJZYSBubyBoYXkgbW9kaWZpY2FjaW9uZXMgcG9zaWJsZXMuIiwib25ib2FyZC5lZGl0c19sZWZ0IjoiVGUgcXVlZGFuIHtufSBtb2RpZmljYWNpw7Nue2VzfS4iLCJvbmJvYXJkLnNhdmVfZWRpdCI6Ikd1YXJkYXIgY2FtYmlvcyIsIm9uYm9hcmQuc2F2ZV9uZXciOiJHdWFyZGFyIG1pIHBlcmZpbCIsIm9uYm9hcmQubm9fbW9yZSI6Ik5vIGhheSBtw6FzIG1vZGlmaWNhY2lvbmVzIiwib25ib2FyZC5iYWNrIjoiVm9sdmVyIiwib25ib2FyZC5sYXRlciI6Ik3DoXMgdGFyZGUiLCJvbmJvYXJkLmJpcnRoX2RhdGUiOiJGZWNoYSBkZSBuYWNpbWllbnRvIiwib25ib2FyZC5iaXJ0aF90aW1lIjoiSG9yYSBkZSBuYWNpbWllbnRvIiwib25ib2FyZC5iaXJ0aF9wbGFjZSI6Ikx1Z2FyIGRlIG5hY2ltaWVudG8iLCJvbmJvYXJkLnBsYWNlX3BoIjoiRXNjcmliZSB1bmEgY2l1ZGFk4oCmIChlai46IEx5b24pIiwib25ib2FyZC5nZW5kZXIiOiJHw6luZXJvIiwiZ2VuZGVyLmZlbW1lIjoiTXVqZXIiLCJnZW5kZXIuaG9tbWUiOiJIb21icmUiLCJnZW5kZXIuYXV0cmUiOiJPdHJvIiwid2VsY29tZS5iYWNrIjoiQmllbnZlbmlkby9hIGRlIG51ZXZvLCB7bmFtZX0uIiwid2VsY29tZS55b3UiOiJ0w7oiLCJwbGFuLmZyZWUiOiJHcmF0aXMiLCJwbGFuLnBhdXNlX3N1ZmZpeCI6IiDCtyBwYXVzYSIsInBsYW4ubGFiZWwiOiJQbGFuIHtuYW1lfSIsInBsYW4uY2VsZXN0ZSI6IlBsYW4gQ8OpbGVzdGUiLCJwbGFuLmRpdmluIjoiUGxhbiBEaXZpbiIsInBsYW4uZGl2aW5fcHJpY2UiOiJQbGFuIERpdmluIMK3IDEzNyDigqwiLCJwbGFuLm9uX2RlbWFuZCI6IkJham8gZGVtYW5kYSIsInBsYW4uY2VsZXN0ZV9vcl9kaXZpbiI6IkPDqWxlc3RlIG8gRGl2aW4iLCJwbGFuLmxvY2tlZCI6IkJsb3F1ZWFkbyIsInBsYW4udW5sb2NrZWQiOiJEZXNibG9xdWVhZG8iLCJwbGFuLnBhdXNlZCI6IkVuIHBhdXNhIiwibmF0YWwua2lja2VyIjoiTmF0YWwiLCJuYXRhbC5pbnRybyI6IkxhcyAyOCBww6FnaW5hcyBkZSB0dSBjYXJ0YSDigJQgc2llbXByZSBhY2Nlc2libGVzIG1pZW50cmFzIHR1IHN1c2NyaXBjacOzbiBlc3TDqSBhY3RpdmEuIiwibmF0YWwudGl0bGUiOiJFbCBNYW51c2NyaXRvIENlbGVzdGUiLCJuYXRhbC5vZl9saWZlIjoiZGUgdHUgdmlkYSIsIm5hdGFsLnRpdGxlX3BsYWluIjoiRWwgTWFudXNjcml0byBDZWxlc3RlIGRlIHR1IHZpZGEiLCJuYXRhbC5hc2siOiJPQlRFTkVSIEVMIE1BTlVTQ1JJVE8gREUgTUkgVklEQSIsIm5hdGFsLnJlYWQiOiJWRVIgRUwgTUFOVVNDUklUTyBDRUxFU1RFIERFIE1JIFZJREEiLCJuYXRhbC5wYWdlc19wcmljZSI6IjI4IHDDoWdpbmFzIMK3IDU5IOKCrCAvIG1lcyIsIm5hdGFsLmxvY2tfcGF1c2VkIjoiU3VzY3JpcGNpw7NuIGVuIHBhdXNhOiBlbCBuYXRhbCBzZSByZWFicmUgY3VhbmRvIHJlYW51ZGVzLiIsIm5hdGFsLmxvY2tfbmVlZCI6IlR1IG1hbnVzY3JpdG8gZGUgdmlkYSBzZSBhYnJlIGNvbiBsYSBzdXNjcmlwY2nDs24gQ8OpbGVzdGUuIiwibmF0YWwubmVlZF9wcm9maWxlIjoiSW5kaWNhIHR1IGNpZWxvIGRlIG5hY2ltaWVudG8gcGFyYSBxdWUgc2UgZXNjcmliYSB0dSBtYW51c2NyaXRvLiIsIm5hdGFsLmZpbGxfcHJvZmlsZSI6IkluZGljYXIgbWkgY2llbG8gZGUgbmFjaW1pZW50byIsIm5hdGFsLmVycl9nZW5lcmljIjoiTGEgZ2VuZXJhY2nDs24gbm8gaGEgcG9kaWRvIGNvbXBsZXRhcnNlLiBJbnTDqW50YWxvIGVuIHVuIG1vbWVudG8uIiwibmF0YWwuZXJyX3NvZnQiOiJMYSBnZW5lcmFjacOzbiBubyBoYSBwb2RpZG8gY29tcGxldGFyc2UuIEludMOpbnRhbG8g4oCUIHR1IGJvdMOzbiDCqyBPQlRFTkVSIEVMIE1BTlVTQ1JJVE8gREUgTUkgVklEQSDCuyBzaWd1ZSBkaXNwb25pYmxlLiIsIm5hdGFsLnJlYWR5IjoiUGVyZmlsIGd1YXJkYWRvIMK3IHR1IG1hbnVzY3JpdG8gZXN0w6EgbGlzdG8uIiwibmF0YWwud2FpdGluZyI6IlBlcmZpbCBndWFyZGFkbyDCtyBhIGxhIGVzcGVyYSBkZSB0dSBwZXRpY2nDs24uIiwibmF0YWwucmVhZGVyX2ludHJvIjoiQXF1w60gZXN0w6EgdHUgTWFudXNjcml0byBDZWxlc3RlIGRlIHR1IHZpZGEuIFNvbG8gbGVjdHVyYSBlbiBsYSBhcHAsIG1pZW50cmFzIHR1IHN1c2NyaXBjacOzbiBlc3TDqSBhY3RpdmEuIiwibmF0YWwudW5hdmFpbGFibGUiOiJNYW51c2NyaXRvIG5vIGRpc3BvbmlibGUuIFZ1ZWx2ZSBhbCBpbmljaW8geSBwdWxzYSBPQlRFTkVSIEVMIE1BTlVTQ1JJVE8gREUgTUkgVklEQS4iLCJuYXRhbC5mcmFtZV90aXRsZSI6Ik1hbnVzY3JpdG8gbmF0YWwiLCJ1bHRpbWUudGl0bGUiOiJFbCBNYW51c2NyaXRvIENlbGVzdGUgw5psdGltbyIsInVsdGltZS50aXRsZV9wbGFpbiI6IkVsIE1hbnVzY3JpdG8gQ2VsZXN0ZSDDmmx0aW1vIGRlIHR1IHZpZGEiLCJ1bHRpbWUuYXNrIjoiUGVkaXIgZWwgw5psdGltbyIsInVsdGltZS5yZWFkIjoiVkVSIEVMIE1BTlVTQ1JJVE8gw5pMVElNTyIsInVsdGltZS5kaXZpbl9ub3ciOiJJbmNsdWlkbyBkZSBpbm1lZGlhdG8gZW4gRGl2aW4uIiwidWx0aW1lLnNpeF9tb250aHMiOiJTZWlzIG1lc2VzIHBhZ2Fkb3MsIGluY2x1c28gY29uIHBhdXNhcy4iLCJ1bHRpbWUub25jZSI6IiBFc2NyaXRvIHVuYSBzb2xhIHZleiwgYSB0dSBwZXRpY2nDs24uIiwidWx0aW1lLmxvY2tfaW50cm8iOiJUcmFzIDYgbWVzZXMgQ8OpbGVzdGUsIG8gZGUgaW5tZWRpYXRvIGVuIERpdmluLiIsInVsdGltZS5wYXVzZV9yZW9wZW4iOiJFbCDDmmx0aW1vIHNlIHJlYWJyZSBjdWFuZG8gcmVhbnVkZXMgbGEgc3VzY3JpcGNpw7NuLiIsInVsdGltZS5tb250aHNfa2VwdCI6IiBUdXMgPGI+e259IG1lc2VzPC9iPiBzaWd1ZW4gY29udGFuZG8uIiwidWx0aW1lLmxvY2tfcHJvZ3Jlc3MiOiJUaWVuZXMgPGI+e2hhdmV9IG1lc2VzPC9iPiB5YSBwYWdhZG9zLiBRdWVkYW4gPGI+e2xlZnR9PC9iPiDigJQgdW5hIHBhdXNhIG5vIHJvbXBlIGxhIHNlcmllLiIsInVsdGltZS5wYWdlc19sb2NrZWQiOiJ7bn0gcMOhZ2luYXMgwrcgNiBtZXNlcyBwYWdhZG9zLCBhY3VtdWxhZG9zIiwidWx0aW1lLnBhZ2VzX3VubG9ja2VkIjoie259IHDDoWdpbmFzIMK3IHlhIGRlc2Jsb3F1ZWFkbyIsInVsdGltZS5wYWdlc19wbGFpbiI6IntufSBww6FnaW5hcyIsInVsdGltZS5uZWVkX3Byb2ZpbGUiOiJJbmRpY2EgdHUgY2llbG8gZGUgbmFjaW1pZW50byBwYXJhIHF1ZSBzZSBlc2NyaWJhIGVsIMOabHRpbW8uIiwidWx0aW1lLmVycl9nZW5lcmljIjoiTGEgZ2VuZXJhY2nDs24gZGVsIMOabHRpbW8gbm8gaGEgcG9kaWRvIGNvbXBsZXRhcnNlLiBJbnTDqW50YWxvLiIsInVsdGltZS5lcnJfc29mdCI6IkxhIGdlbmVyYWNpw7NuIG5vIGhhIHBvZGlkbyBjb21wbGV0YXJzZS4gSW50w6ludGFsbyDigJQgdHUgYm90w7NuIMKrIFBlZGlyIGVsIMOabHRpbW8gwrsgc2lndWUgZGlzcG9uaWJsZS4iLCJ1bHRpbWUucmVhZHkiOiJUdSBNYW51c2NyaXRvIMOabHRpbW8gZXN0w6EgbGlzdG8uIiwidWx0aW1lLndhaXRpbmciOiJEZXNibG9xdWVhZG8gwrcgYSBsYSBlc3BlcmEgZGUgdHUgcGV0aWNpw7NuLiIsInVsdGltZS5raWNrZXIiOiJFZGljacOzbiDDmmx0aW1hIiwidWx0aW1lLnJlYWRlcl9kaXZpbiI6IkFxdcOtIGVzdMOhIHR1IE1hbnVzY3JpdG8gQ2VsZXN0ZSDDmmx0aW1vLCBpbmNsdWlkbyBlbiBEaXZpbi4gTGVjdHVyYSBlbiBsYSBhcHAgbWllbnRyYXMgdHUgc3VzY3JpcGNpw7NuIGVzdMOpIGFjdGl2YS4iLCJ1bHRpbWUucmVhZGVyX3BhaWQiOiJBcXXDrSBlc3TDoSB0dSBNYW51c2NyaXRvIENlbGVzdGUgw5psdGltbywgZGVzYmxvcXVlYWRvIHRyYXMgNiBtZXNlcyBwYWdhZG9zLiBMZWN0dXJhIGVuIGxhIGFwcCBtaWVudHJhcyB0dSBzdXNjcmlwY2nDs24gZXN0w6kgYWN0aXZhLiIsInVsdGltZS51bmF2YWlsYWJsZSI6Ik1hbnVzY3JpdG8gw5psdGltbyBubyBkaXNwb25pYmxlLiBWdWVsdmUgYWwgaW5pY2lvIHkgcHVsc2EgwqsgUGVkaXIgZWwgw5psdGltbyDCuy4iLCJ1bHRpbWUuZnJhbWVfdGl0bGUiOiJNYW51c2NyaXRvIMOabHRpbW8iLCJtb2lzLmxhYmVsIjoiRXN0ZSBtZXMiLCJtb2lzLmludHJvIjoiRGlzcG9uaWJsZSB0b2RvIGVsIG1lcy4gVHUgTWFudXNjcml0byBDZWxlc3RlIGRlbCBtZXMgZW4gY3Vyc28uIEPDs21vIGhhYmxhbiB0dXMgZXN0cmVsbGFzIGVzdGUgbWVzIiwibW9pcy50aXRsZV9odG1sIjoiTWFudXNjcml0byBDZWxlc3RlIDxzcGFuIGNsYXNzPVwiZGUtY2UtbW9pc1wiPkRFIEVTVEUgTUVTIERFIHttb250aH08L3NwYW4+IiwibW9pcy50aXRsZV9wbGFpbiI6Ik1hbnVzY3JpdG8gQ2VsZXN0ZSBERSBFU1RFIE1FUyBERSB7bW9udGh9IiwibW9pcy5hc2siOiJQZWRpciBlbCBtYW51c2NyaXRvIGRlbCBtZXMiLCJtb2lzLnJlYWQiOiJSZWxlZXIgZWwgbWFudXNjcml0byBkZWwgbWVzIiwibW9pcy5xdW90YSI6IiDCtyB7dXNlZH0gLyAxIGVzdGUgYcOxbyAoR3JhdGlzKSIsIm1vaXMucmVhZGVyX2ludHJvIjoiQXF1w60gZXN0w6EgdHUgTWFudXNjcml0byBDZWxlc3RlIGRlbCBtZXMuIFNvbG8gbGVjdHVyYSBlbiBsYSBhcHAsIG1pZW50cmFzIHR1IHN1c2NyaXBjacOzbiBlc3TDqSBhY3RpdmEuIiwibW9pcy5mcmFtZV90aXRsZSI6Ik1hbnVzY3JpdG8gZGVsIG1lcyIsImpvdXIubGFiZWwiOiJIb3kiLCJqb3VyLmludHJvIjoiVHUgTWFudXNjcml0byBDZWxlc3RlIGRlIGVzdGUgZMOtYS4gQ8OzbW8gaGFibGFuIHR1cyBlc3RyZWxsYXMgSE9ZIiwiam91ci50aXRsZSI6Ik1hbnVzY3JpdG8gQ2VsZXN0ZSBkZWwge2RhdGV9Iiwiam91ci5hc2siOiJPQlRFTkVSIEVMIE1BTlVTQ1JJVE8gREVMIETDjUEiLCJqb3VyLnJlYWQiOiJSZWxlZXIgZWwgbWFudXNjcml0byBkZWwgZMOtYSIsImpvdXIucXVvdGEiOiIgwrcge3VzZWR9IC8gNSBlc3RlIG1lcyAoR3JhdGlzKSIsImpvdXIucmVhZGVyX2ludHJvIjoiQXF1w60gZXN0w6EgdHUgTWFudXNjcml0byBDZWxlc3RlIGRlbCBkw61hLiBTb2xvIGxlY3R1cmEgZW4gbGEgYXBwLCBtaWVudHJhcyB0dSBzdXNjcmlwY2nDs24gZXN0w6kgYWN0aXZhLiIsImpvdXIuZnJhbWVfdGl0bGUiOiJNYW51c2NyaXRvIGRlbCBkw61hIiwicGVyaW9kLnVuYXZhaWxhYmxlIjoiTWFudXNjcml0byBubyBkaXNwb25pYmxlLiBWdWVsdmUgYSBsYSBwZXN0YcOxYSB5IHDDrWRlbG8gZGUgbnVldm8uIiwicGVyaW9kLmVycl9pbnRlcnJ1cHQiOiJHZW5lcmFjacOzbiBpbnRlcnJ1bXBpZGEuIEludMOpbnRhbG8uIiwiY291cGxlLmtpY2tlciI6IlNpbmFzdHLDrWEiLCJjb3VwbGUubGVkZV9sb2NrIjoiU2luYXN0csOtYSBkZSBkb3MiLCJjb3VwbGUudGl0bGVfaHRtbCI6Ik1hbnVzY3JpdG8gQ2VsZXN0ZSA8c3BhbiBjbGFzcz1cImRlLXRhLXZpZVwiPlBhcmVqYTwvc3Bhbj4iLCJjb3VwbGUudGl0bGVfcGxhaW4iOiJNYW51c2NyaXRvIENlbGVzdGUgUGFyZWphIiwiY291cGxlLnRpdGxlX3Nob3J0IjoiTWFudXNjcml0byBkZSBwYXJlamEiLCJjb3VwbGUuaW50cm8iOiJTaW5hc3Ryw61hIEh1bWFuIERlc2lnbiDDlyBBc3Ryb2xvZ8OtYSBwYXJhIGxvcyBkb3Mg4oCUIHVuIG1hbnVzY3JpdG8gZGUgcGFyZWphIHBvciBtZXMgY2l2aWwsIHNvbG8gcGxhbiBEaXZpbi4iLCJjb3VwbGUuYXNrIjoiUGVkaXIgZWwgbWFudXNjcml0byBkZSBwYXJlamEiLCJjb3VwbGUucmVhZCI6IlJlbGVlciBlbCBtYW51c2NyaXRvIGRlIHBhcmVqYSIsImNvdXBsZS5xdW90YSI6IntufSAvIDEgZXN0ZSBtZXMiLCJjb3VwbGUubG9ja19wYXVzZWQiOiJTdXNjcmlwY2nDs24gZW4gcGF1c2E6IGVsIG1hbnVzY3JpdG8gZGUgcGFyZWphIHNlIHJlYWJyZSBjdWFuZG8gcmVhbnVkZXMgRGl2aW4uIiwiY291cGxlLmxvY2tfbmVlZCI6IlJlc2VydmFkbyBhbCBwbGFuIERpdmluIOKAlCBkb3MgY2llbG9zIGNydXphZG9zLCB1bmEgdmV6IHBvciBtZXMgY2l2aWwuIiwiY291cGxlLmRpc2NvdmVyIjoiRGVzY3VicmlyIERpdmluIiwiY291cGxlLndpdGgiOiJDb24ge25hbWV9IiwiY291cGxlLmVkaXQiOiJFZGl0YXIiLCJjb3VwbGUuZXJyX2dlbmVyaWMiOiJMYSBnZW5lcmFjacOzbiBubyBoYSBwb2RpZG8gY29tcGxldGFyc2UuIiwiY291cGxlLnJlYWRlcl9pbnRybyI6IkFxdcOtIGVzdMOhIHZ1ZXN0cm8gTWFudXNjcml0byBDZWxlc3RlIGRlIHBhcmVqYS4gU29sbyBsZWN0dXJhIGVuIGxhIGFwcCwgbWllbnRyYXMgdHUgc3VzY3JpcGNpw7NuIERpdmluIGVzdMOpIGFjdGl2YS4iLCJjb3VwbGUudW5hdmFpbGFibGUiOiJNYW51c2NyaXRvIGRlIHBhcmVqYSBubyBkaXNwb25pYmxlLiBWdWVsdmUgYSBsYSBwZXN0YcOxYSBQYXJlamEuIiwiY291cGxlLmZyYW1lX3RpdGxlIjoiTWFudXNjcml0byBwYXJlamEiLCJjb3VwbGUubm90X3JlYWR5IjoiVHUgbWFudXNjcml0byBkZSBwYXJlamEgYcO6biBubyBlc3TDoSBkaXNwb25pYmxlLiIsImNvdXBsZS5taXNzaW5nX2xpbmsiOiJGYWx0YSBlbCBlbmxhY2UgZGVsIG1hbnVzY3JpdG8uIFZ1ZWx2ZSBhIGluaWNpYXIgc2VzacOzbiBlIGludMOpbnRhbG8uIiwiY291cGxlLmZpbGVfbWlzc2luZyI6IkFyY2hpdm8gZGUgcGFyZWphIG5vIGVuY29udHJhZG8uIFB1bHNhIG90cmEgdmV6IMKrIFBlZGlyIGVsIG1hbnVzY3JpdG8gZGUgcGFyZWphIMK7LiIsInBhcnRuZXIubGFiZWwiOiJQYXJlamEiLCJwYXJ0bmVyLnRpdGxlIjoiQ2llbG8gZGUgbmFjaW1pZW50byBkZSBsYSBwYXJlamEiLCJwYXJ0bmVyLmhpbnQiOiJOb21icmUsIGZlY2hhLCBob3JhLCBsdWdhciB5IGfDqW5lcm8g4oCUIGNvbW8gZW4gdHUgcGVyZmlsLiAiLCJwYXJ0bmVyLm5vX2VkaXRzIjoiWWEgbm8gaGF5IG1vZGlmaWNhY2lvbmVzLiIsInBhcnRuZXIuZWRpdHNfbGVmdCI6IlRlIHF1ZWRhbiB7bn0gY29ycmVjY2nDs257ZXN9LiIsInBhcnRuZXIuZWRpdHNfaW50cm8iOiJQb2Ryw6FzIGNvcnJlZ2lyIGhhc3RhIDMgdmVjZXMuIiwicGFydG5lci5wcmVub20iOiJOb21icmUiLCJwYXJ0bmVyLnBsYWNlX3BoIjoiRXNjcmliZSB1bmEgY2l1ZGFk4oCmIiwicGFydG5lci5zYXZlIjoiR3VhcmRhciBwYXJlamEiLCJwYXJ0bmVyLmJhY2siOiJWb2x2ZXIiLCJwYXVzZS5sYWJlbCI6IlN1c2NyaXBjacOzbiBlbiBwYXVzYSIsInBhdXNlLnRpdGxlIjoiRXNwYWNpbyBlbiBwYXVzYSIsInBhdXNlLmJvZHkiOiJUdSBhYm8ge3BsYW59IGVzdMOhIGVuIHBhdXNhLiBDb25zZXJ2YXMgZWwgYWNjZXNvIEdyYXRpczogMSBtYW51c2NyaXRvIGRlbCBtZXMgKyA1IGRlbCBkw61hLiBOYXRhbCwgw5psdGltbyBlIElBIEPDqWxlc3RlIHNlIHJlYWJyZW4gY3VhbmRvIHJlYW51ZGVzLiIsInBhdXNlLnVsdGltZV9ub3RlIjoiTWVzZXMgw5psdGltbyBjb25zZXJ2YWRvczoge259IC8gNi4iLCJwYXVzZS5yZXN1bWUiOiJSZWFudWRhciBtaSBzdXNjcmlwY2nDs24iLCJwYXVzZS5yZWZyZXNoIjoiWWEgcmVhbnVkw6ksIGFjdHVhbGl6YXIiLCJmcmVlLmJhbm5lcl9mdWxsIjoiQWNjZXNvIGdyYXRpczoge219IHttd30gZGVsIG1lcyArIHtkfSB7ZHd9IGRlbCBkw61hIG9mcmVjaWRvcy4iLCJmcmVlLmJhbm5lcl9sZWZ0IjoiVGUgcXVlZGFuIHttfSB7bXd9IGRlbCBtZXMgeSB7ZH0ge2R3fSBkZWwgZMOtYS4iLCJmcmVlLm1zX29uZSI6Im1hbnVzY3JpdG8iLCJmcmVlLm1zX21hbnkiOiJtYW51c2NyaXRvcyIsImlhLnRpdGxlIjoiSUEgQ8OpbGVzdGUiLCJpYS50aXRsZV9tcyI6IklBIEPDqWxlc3RlIMK3IGVzdGUgbWFudXNjcml0byIsImlhLmF2YWlsYWJsZSI6IkRpc3BvbmlibGUiLCJpYS5pbmNsdWRlZCI6IkluY2x1aWRhIGVuIERpdmluIiwiaWEuY2FyZF9vayI6IlRlIGFjb21wYcOxYSBiYWpvIGNhZGEgbWFudXNjcml0byBtaWVudHJhcyBsZWVzIOKAlCB1bmEgcHJlc2VuY2lhIGPDoWxpZGEgcGFyYSBhY2xhcmFyIGxvIHF1ZSBzaWVudGVzLiIsImlhLmNhcmRfbG9jayI6Ik1pZW50cmFzIGxlZXMsIHRlIGVzY3VjaGE6IMK/aG95IGVsIGFtb3I/IMK/ZWwgdHJhYmFqbz8gwr9lbCBidWVuIG1vbWVudG8/IiwiaWEubG9ja19yZWFkZXIiOiJIYXogcHJlZ3VudGFzIHNvYnJlIGVzdGUgbWFudXNjcml0byBjb24gZWwgcGxhbiBEaXZpbi4iLCJpYS5wYXNzX2RpdmluIjoiUGFzYXIgYSBEaXZpbiDCtyAxMzcg4oKsIiwiaWEuZ3VpZGUiOiJFc3TDoSBhcXXDrSBwYXJhIGlsdW1pbmFydGUsIHNpbiBqdXpnYXIuIiwiaWEuZW1wdHkiOiJVbmEgcHJlZ3VudGEgc29icmUgbG8gcXVlIGxlZXPigKYgRWouOiDCv3F1w6kgbWUgZGljZSBlc3RhIHDDoWdpbmEgc29icmUgZWwgYW1vcj8iLCJpYS5xdWVzdGlvbiI6IlR1IHByZWd1bnRhIiwiaWEucGxhY2Vob2xkZXIiOiLCv1F1w6kgbWUgcmV2ZWxhIGVzdGUgcGFzYWplPyIsImlhLm1pYyI6IkRpY3RhciB0dSBwcmVndW50YSIsImlhLnNlbmQiOiJFbnZpYXIiLCJpYS5idXN5IjoiQ8OpbGVzdGUgcmVzcG9uZGUiLCJpYS5yZXN0IjoiRWwgY2llbG8gZGVzY2Fuc2EiLCJpYS55b3UiOiJUw7oiLCJpYS5yZXBseV9uYW1lIjoiQ8OpbGVzdGUgcmVzcG9uZGUiLCJpYS5saXN0ZW4iOiJFc2N1Y2hhciIsImlhLnN0b3AiOiJQYXJhciIsImlhLmxpc3Rlbl9hcmlhIjoiRXNjdWNoYXIgZXN0ZSBtZW5zYWplIiwiaWEuZXJyX2dlbmVyaWMiOiJFbCBjaWVsbyBubyByZXNwb25kZSBwb3IgYWhvcmEuIEludMOpbnRhbG8gZW4gdW4gbW9tZW50by4iLCJpYS5lcnJfNDA0IjoiQ3VlbnRhIG5vIGVuY29udHJhZGEuIFZ1ZWx2ZSBhIGluaWNpYXIgc2VzacOzbi4iLCJpYS5hc2tfZGV2ZWxvcCI6IsK/UHVlZGVzIGV4cGxpY2FybWUgeSBkZXNhcnJvbGxhciBlc3RlIHBhc2FqZSBkZSBtaSBtYW51c2NyaXRvP1xuXG7CqyB7cGFzc2FnZX0gwrsiLCJpYS5taWNfYmxvY2tlZCI6Ik1pY3LDs2Zvbm8gYmxvcXVlYWRvLiBBdXRvcml6YSBlbCBtaWNyw7Nmb25vIGVuIGVsIG5hdmVnYWRvciBwYXJhIGRpY3Rhci4iLCJpYS5taWNfbm9uZSI6Ik5vIHNlIGRldGVjdGEgbWljcsOzZm9uby4gQ29uZWN0YSB1bm8gbyBhdXRvcml6YSBlbCBhdWRpby4iLCJpYS5taWNfZmFpbCI6Ik5vIHNlIHB1ZG8gaW5pY2lhciBlbCBkaWN0YWRvLiBJbnTDqW50YWxvIGVuIHVuIG1vbWVudG8uIiwiaWEubWljX3Vuc3VwcG9ydGVkIjoiRGljdGFkbyBubyBjb21wYXRpYmxlIGVuIGVzdGUgbmF2ZWdhZG9yIiwiaWEuc3BlZWNoX3Vuc3VwcG9ydGVkIjoiRWwgZGljdGFkbyBwb3Igdm96IG5vIGVzdMOhIGRpc3BvbmlibGUgZW4gZXN0ZSBuYXZlZ2Fkb3IuIEVuIGlQaG9uZSBvIGlQYWQsIFNhZmFyaSBhY3R1YWxpemFkbyBwdWVkZSBvZnJlY2VybG87IHNpIG5vLCBlc2NyaWJlIHR1IHByZWd1bnRhLiBDaHJvbWUgbyBFZGdlIGVuIG9yZGVuYWRvciBmdW5jaW9uYW4gbWVqb3IuIiwic2VsLmFzayI6IlBlZGlyIGEgbGEgSUEgQ8OpbGVzdGUgcXVlIGRlc2Fycm9sbGUgZXN0ZSBwYXNhamUiLCJyZWFkZXIuYmFjayI6IuKGkCBWb2x2ZXIiLCJyZWFkZXIuZnNfZW50ZXIiOiJNYW51c2NyaXRvIGEgcGFudGFsbGEgY29tcGxldGEiLCJyZWFkZXIuZnNfZXhpdCI6IlNhbGlyIGRlIHBhbnRhbGxhIGNvbXBsZXRhIiwicmVhZGVyLm1zX3RpdGxlIjoiTWFudXNjcml0byIsIndhaXQubmF0YWwudGl0bGUiOiJTZSBlc2NyaWJlIGVsIE1hbnVzY3JpdG8gQ2VsZXN0ZSBkZSB0dSB2aWRhIiwid2FpdC5uYXRhbC5oaW50IjoiQWxpbmVhY2nDs24gZGUgcGxhbmV0YXMgwrcgY8OhbGN1bG9zIGRlbCBjw7NkaWdvIGRlIHZpZGEgwrcgZW5zYW1ibGFqZSBkZWwgbGVuZ3VhamUgZGVsIHVuaXZlcnNvLiBObyBjaWVycmVzIGVzdGEgcMOhZ2luYS4iLCJ3YWl0Lm5hdGFsLmZhbGxiYWNrIjoiRWwgY2llbG8gY29tcG9uZSB0dSBtYW51c2NyaXRvIOKAlCB1bm9zIG1pbnV0b3MgZGUgc2lsZW5jaW8uIiwid2FpdC5tb2lzLnRpdGxlIjoiU2UgZXNjcmliZSBlbCBNYW51c2NyaXRvIENlbGVzdGUgZGVsIG1lcyIsIndhaXQubW9pcy5oaW50IjoiVHUgdGVtYSBuYXRhbCDCtyBlbCBjbGltYSBkZWwgbWVzIMK3IGVuY3VhZGVybmFjacOzbiBkZSBjYXDDrXR1bG9zLiBObyBjaWVycmVzIGVzdGEgcMOhZ2luYS4iLCJ3YWl0Lm1vaXMuZmFsbGJhY2siOiJFbCBjaWVsbyBjb21wb25lIHR1IE1hbnVzY3JpdG8gZGVsIG1lc+KApiBVbm9zIG1pbnV0b3MuIiwid2FpdC5qb3VyLnRpdGxlIjoiU2UgZXNjcmliZSBlbCBNYW51c2NyaXRvIENlbGVzdGUgZGVsIGTDrWEiLCJ3YWl0LmpvdXIuaGludCI6IlR1IHRlbWEgwrcgbGEgZW5lcmfDrWEgZGUgaG95IMK3IHVuYSBzb2xhIHB1ZXJ0YSBxdWUgYWJyaXIuIE5vIGNpZXJyZXMgZXN0YSBww6FnaW5hLiIsIndhaXQuam91ci5mYWxsYmFjayI6IkVsIGNpZWxvIGNvbXBvbmUgdHUgTWFudXNjcml0byBkZWwgZMOtYeKApiIsIndhaXQuY291cGxlLnRpdGxlIjoiU2UgZXNjcmliZSBlbCBNYW51c2NyaXRvIENlbGVzdGUgZGUgcGFyZWphIiwid2FpdC5jb3VwbGUuaGludCI6IkRvcyB0ZW1hcyDCtyBzaW5hc3Ryw61hIMK3IGVuc2FtYmxhamUuIE5vIGNpZXJyZXMgZXN0YSBww6FnaW5hLiIsIndhaXQuY291cGxlLmZhbGxiYWNrIjoiRWwgY2llbG8gY29tcG9uZSB2dWVzdHJvIG1hbnVzY3JpdG8gZGUgcGFyZWph4oCmIiwid2FpdC51bHRpbWUudGl0bGUiOiJTZSBlc2NyaWJlIGVsIE1hbnVzY3JpdG8gw5psdGltbyIsIndhaXQudWx0aW1lLmhpbnQiOiJFZGljacOzbiBsYXJnYSDCtyBwYWNpZW5jaWEgY2VsZXN0ZS4gTm8gY2llcnJlcyBlc3RhIHDDoWdpbmEuIiwid2FpdC51bHRpbWUuZmFsbGJhY2siOiJFbCBjaWVsbyBjb21wb25lIHR1IE1hbnVzY3JpdG8gw5psdGltb+KApiIsInByb2cuaWEiOiJUcmFkdWNjacOzbiBkZWwgbGVuZ3VhamUgZGVsIHVuaXZlcnNvIOKAlCBlbnNhbWJsYWplIGRlIGxvcyBjYXDDrXR1bG9zIGRlIHR1IHZpZGHigKYiLCJwcm9nLmhkIjoiTGVjdHVyYSBkZSB0dSBjw7NkaWdvIGRlIHZpZGHigKYiLCJwcm9nLnR6IjoiQW5jbGFqZSBlbiBlbCB0aWVtcG8geSBlbCBlc3BhY2lv4oCmIiwicHJvZy5hc3RybyI6IkFsaW5lYWNpw7NuIGRlIGxvcyBwbGFuZXRhc+KApiIsInByb2cuaHRtbCI6IkVuc2FtYmxhamUgeSBlbmN1YWRlcm5hY2nDs24gZGVsIG1hbnVzY3JpdG/igKYiLCJwcm9nLnN5bnRoIjoiU2VsbG8gZmluYWwg4oCUIGVsIG1hbnVzY3JpdG8gdG9tYSBmb3JtYeKApiIsImFjY291bnQucGF1c2Vfc3RhdGUiOiJFbiBwYXVzYSDigJQgYWNjZXNvIEdyYXRpcyAoNSBtYW51c2NyaXRvcyBkZWwgZMOtYSAvIG1lcywgMSBkZWwgbWVzIC8gYcOxbykiLCJhY2NvdW50LmFjdGl2ZSI6IkFjdGl2byIsImFjY291bnQuaW5hY3RpdmUiOiJJbmFjdGl2byIsImFjY291bnQubm9fc3ViIjoiU2luIHN1c2NyaXBjacOzbiIsImFjY291bnQucHJpY2VfbW8iOiJ7bn0g4oKsIC8gbWVzIiwiYWNjb3VudC5pYV9vayI6IkRpc3BvbmlibGUiLCJhY2NvdW50LmlhX3BhdXNlIjoiRW4gcGF1c2Eg4oCUIHNlIHJlYWJyZSBjb24gRGl2aW4iLCJhY2NvdW50LmlhX2xvY2siOiJSZXNlcnZhZGEgYWwgcGxhbiBEaXZpbiIsImFjY291bnQudWx0aW1lX3Byb2ciOiJQcm9ncmVzbyDDmmx0aW1vIiwiYWNjb3VudC51bHRpbWVfbGluZSI6IntufSAvIDYgbWVzZXMgcGFnYWRvcyIsImFjY291bnQudWx0aW1lX2tlcHQiOiIgKGNvbnNlcnZhZG9zKSIsImFjY291bnQuYmlydGhfc2t5IjoiQ2llbG8gZGUgbmFjaW1pZW50byIsImFjY291bnQubXNfcmVhZHkiOiIgwrcgbWFudXNjcml0byBsaXN0byIsImFjY291bnQuZWRpdHNfbGVmdCI6IlRlIHF1ZWRhbiB7bn0gbW9kaWZpY2FjacOzbntlc30uIiwiYWNjb3VudC5lZGl0c19kb25lIjoiSGFzIHVzYWRvIHR1cyAzIG1vZGlmaWNhY2lvbmVzLiBQYXJhIGN1YWxxdWllciBjb3JyZWNjacOzbiwgY29udGFjdGEgY29uIHNvcG9ydGUuIiwiYWNjb3VudC5lZGl0IjoiRWRpdGFyIiwiYWNjb3VudC52aWV3IjoiQ29uc3VsdGFyIiwiYWNjb3VudC5iaXJ0aF9lbXB0eSI6IkHDum4gbm8gaW5kaWNhZG8uIiwiYWNjb3VudC5maWxsX2JpcnRoIjoiSW5kaWNhciBtaSBjaWVsbyBkZSBuYWNpbWllbnRvIiwiYWNjb3VudC5tYW5hZ2UiOiJHZXN0aW9uYXIgbWkgc3VzY3JpcGNpw7NuIiwiYWNjb3VudC5tYW5hZ2VfaGludCI6IlBhcmEgY2FtYmlhciBkZSBwbGFuLCBwcmltZXJvIGRldMOpbiB0dSBzdXNjcmlwY2nDs24gYWN0dWFsIHkgbHVlZ28gc3VzY3LDrWJldGUgZGUgbnVldm8gYWwgcXVlIGVsaWphcy4iLCJhY2NvdW50LnN1cHBvcnQiOiJQYXJhIGF5dWRhOiBjb250YWN0QGZvcm1hdGlvbnMtc3Bpcml0dWFsaXRlLWVuZXJnZXRpcXVlLmNvbSIsImFjY291bnQucmVzdW1lX21hbmFnZSI6IlJlYW51ZGFyIC8gZ2VzdGlvbmFyIG1pIHN1c2NyaXBjacOzbiIsImFjY291bnQuYmFja19jZWxlc3RlIjoiVm9sdmVyIGEgQ8OpbGVzdGUgwrcgNTkg4oKsIiwiYWNjb3VudC50b19kaXZpbiI6IlBhc2FyIGEgRGl2aW4gwrcgMTM3IOKCrCIsImFjY291bnQudG9fY2VsZXN0ZSI6IlBhc2FyIGEgQ8OpbGVzdGUgwrcgNTkg4oKsIiwiYWNjb3VudC5kb3duZ3JhZGVfY2VsZXN0ZSI6IlZvbHZlciBhIEPDqWxlc3RlIMK3IDU5IOKCrCIsImFjY291bnQubWFuYWdlX3N0b3AiOiJHZXN0aW9uYXIgLyBkZXRlbmVyIGxhIHN1c2NyaXBjacOzbiIsImFjY291bnQuZGxfbGFiZWwiOiJEZXNjYXJnYSDCtyBEaXZpbiIsImFjY291bnQuZGxfaGludCI6IkRlc2NhcmdhIHRvZG9zIHR1cyBtYW51c2NyaXRvcyBsaXN0b3MgKG5hdGFsLCBtZXMsIGTDrWEsIHBhcmVqYeKApikgZW4gdW4gWklQLiIsImFjY291bnQuZGxfYnRuIjoiRGVzY2FyZ2FyIHRvZG9zIG1pcyBtYW51c2NyaXRvcyIsImFjY291bnQuZGxfdW5sb2NrIjoiRGVzYmxvcXVlbyBlbiB7bn0gbWVzZXMiLCJhY2NvdW50LmRsX3Byb2dyZXNzIjoiT3BjacOzbiByZXNlcnZhZGEgYSBEaXZpbiwgdHJhcyB7bmVlZH0gbWVzZXMgZGUgc3VzY3JpcGNpw7NuLiBQcm9ncmVzbzogPGI+e2hhdmV9IC8ge25lZWR9PC9iPi4ifX0='));
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
  })();

  (function addI18nMore() {
    var MORE = {
      fr: {
        'ia.mic_stop': 'Arrêter la dictée',
        'ia.speak_loading': 'Préparation…',
        'ia.tts_err': 'La voix Céleste ne répond pas pour le moment. Réessaie dans un instant.',
        'ia.tts_quota': 'Quota voix du mois atteint. Écouter avec la voix du navigateur ?',
        'ia.tts_need_auth': 'Reconnecte-toi pour écouter la voix Céleste.'
      },
      en: {
        'ia.mic_stop': 'Stop dictation',
        'ia.speak_loading': 'Preparing…',
        'ia.tts_err': 'Céleste’s voice is unavailable right now. Try again in a moment.',
        'ia.tts_quota': 'Monthly voice quota reached. Listen with the browser voice?',
        'ia.tts_need_auth': 'Sign in again to hear Céleste’s voice.'
      },
      es: {
        'ia.mic_stop': 'Detener el dictado',
        'ia.speak_loading': 'Preparando…',
        'ia.tts_err': 'La voz de Céleste no responde por ahora. Inténtalo en un momento.',
        'ia.tts_quota': 'Cupo de voz del mes agotado. ¿Escuchar con la voz del navegador?',
        'ia.tts_need_auth': 'Vuelve a iniciar sesión para oír la voz de Céleste.',
        'onboard.lede_edit': 'Corrige un error si hace falta. Te quedan {n} modificación{s}.',
        'onboard.edits_left': 'Te quedan {n} modificación{s}.',
        'partner.edits_left': 'Te quedan {n} corrección{s}.',
        'account.edits_left': 'Te quedan {n} modificación{s}.'
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
        (isLight ? 'BRIGHT' : 'SOMBRE') + '</button>';
    }
    return '<div class="theme-toggle" role="group" aria-label="' + t('theme.aria') + '">' +
      '<button type="button" data-theme-set="dark" class="' + (!isLight ? 'active' : '') + '">SOMBRE</button>' +
      '<button type="button" data-theme-set="light" class="' + (isLight ? 'active' : '') + '">BRIGHT</button>' +
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
      state.screen = localStorage.getItem('cercle.installedHint') ? 'app' : 'install';
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
    return iaSpeakSupported() || (typeof Audio !== 'undefined' && canIa());
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
    var plain = stripIaSpeakText(text);
    if (!plain) return;
    /* Plan Divin (canIa) : TOUJOURS OpenAI /tts (natal, mois, jour, couple, ultime, sélection). */
    if (canIa()) {
      if (!state.user || !state.user.token) {
        try { window.alert(t('ia.tts_need_auth')); } catch (e) { /* ignore */ }
        return;
      }
      speakIaOpenAi(plain.slice(0, 4000), btn);
      return;
    }
    speakIaBrowser(plain, btn);
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
    if (state.pdf === 'natal' || state.pdf === 'mois' || state.pdf === 'jour' || state.pdf === 'couple') {
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


  function natalTab() {
    var prenom = (state.user && state.user.prenom) || t('welcome.you');
    var months = monthsPaid();
    var left = Math.max(0, ULTIME.need - months);
    var unlocked = canUltime();
    var readyProfile = profileComplete();
    var natalAsk = t('natal.ask');
    var natalRead = t('natal.read');
    var planLbl = ((state.user && state.user.planLabel) || t('plan.free')) + (isPausedPaid() ? t('plan.pause_suffix') : '');
    var natalCard = canNatal()
      ? '<div class="card stack"><div class="label">' + t('natal.kicker') + '</div><h2>' + natalTitleHtml() + '</h2><p>' + t('natal.intro') + '</p>' +
        natalStatusLine() +
        (readyProfile ? askBtn('natal', natalAsk, natalRead) : '') +
        '</div>'
      : '<div class="card lock stack"><div class="label">' + t('plan.celeste') + '</div><h2>' + natalTitleHtml() + '</h2><p class="muted">' + t('natal.pages_price') + '</p><p>' + (isPausedPaid() ? t('natal.lock_paused') : t('natal.lock_need')) + '</p></div>';
    var ultimeAsk = t('ultime.ask');
    var ultimeRead = t('ultime.read');
    var ultime;
    if (unlocked) {
      ultime = '<div class="card stack"><div class="label">' + t('plan.unlocked') + '</div><h2>' + ultimeTitleHtml() + '</h2><p class="muted">' + tf('ultime.pages_plain', { n: ULTIME.pages }) + '</p><p>' + (plan() === 'divin' ? t('ultime.divin_now') : t('ultime.six_months')) + t('ultime.once') + '</p>' +
        ultimeStatusLine() +
        (readyProfile ? askBtn('ultime', ultimeAsk, ultimeRead) : '') +
        '</div>';
    } else if (plan() === 'gratuit' && months === 0) {
      ultime = '<div class="card lock stack"><div class="label">' + t('plan.celeste_or_divin') + '</div><h2>' + ultimeTitleHtml() + '</h2><p class="muted">140 pages</p><p>' + t('ultime.lock_intro') + '</p></div>';
    } else if (ultimeOn() && isPausedPaid()) {
      ultime = '<div class="card lock stack"><div class="label">' + t('plan.paused') + '</div><h2>' + ultimeTitleHtml() + '</h2><p class="muted">' + tf('ultime.pages_unlocked', { n: ULTIME.pages }) + '</p><p>' + t('ultime.pause_reopen') +
        (plan() === 'divin' ? '' : tf('ultime.months_kept', { n: months })) +
        '</p></div>';
    } else {
      ultime = '<div class="card lock stack"><div class="label">' + t('plan.locked') + '</div><h2>' + ultimeTitleHtml() + '</h2><p class="muted">' + tf('ultime.pages_locked', { n: ULTIME.pages }) + '</p><p>' + tf('ultime.lock_progress', { have: months, left: left }) + '</p></div>';
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
      return '<div class="card stack ia-card">' +
        iaPortraitHtml() +
        '<div class="label">' + t('plan.divin') + '</div><h2>' + t('ia.title') + '</h2><p class="muted">' + t('ia.available') + '</p>' +
        '<p>' + t('ia.card_ok') + '</p></div>';
    }
    return '<div class="card lock stack ia-card">' +
      iaPortraitHtml() +
      '<div class="label">' + t('plan.divin_price') + '</div><h2>' + t('ia.title') + '</h2><p class="muted">' + t('ia.included') + '</p>' +
      '<p>' + t('ia.card_lock') + '</p>' +
      '<button class="btn ghost" type="button" data-plan-link="divin">' + t('couple.discover') + '</button></div>';
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
        '<button class="btn ghost" type="button" data-plan-link="divin">' + t('ia.pass_divin') + '</button>' +
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
        '<p class="muted ia-guide-line">' + t('ia.guide') + '</p></div>' +
      '</div>' +
      '<div class="ia-log" id="ia-log">' + (log || empty) + '</div>' +
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
      (blocked ? '' : askBtn('mois', t('mois.ask'), t('mois.read'))) + '</div>' + iaCard() + '</div>';
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
      (blocked ? '' : askBtn('jour', t('jour.ask'), t('jour.read'))) + '</div>' + iaCard() + '</div>';
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
      iaLine = t('account.ia_ok');
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
    var body = '<p class="kicker">' + kicker + '</p><h2>' + titleHtml + '</h2>' +
      paras.map(function (p) { return '<p>' + p + '</p>'; }).join('') + extra;
    var iaCtx = (id === 'natal' || id === 'mois' || id === 'jour' || id === 'couple' || id === 'ultime') ? id : null;
    var ia = iaCtx ? readerIaPanel(iaCtx) : '';
    return '<div class="pdf-view"><header>' +
      '<button type="button" class="pdf-back" id="close-pdf">' + t('reader.back') + '</button>' +
      '<span class="kicker">' + titlePlain + '</span>' +
      themeToggleHtml(true) +
      '</header>' +
      '<div class="pdf-body manuscript-protect">' + body + ia + '</div></div>';
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
        var pb = root.querySelector('.pdf-body');
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
    var pdfBodyEl = sameView ? root.querySelector('.pdf-body') : null;
    var savedMainScroll = scrollEl ? scrollEl.scrollTop : null;
    var savedPdfScroll = pdfBodyEl ? pdfBodyEl.scrollTop : null;
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
    _renderViewKey = nextKey;
    if (sameView && (savedMainScroll != null || savedPdfScroll != null)) {
      restoreScrollAfterRender(root, savedMainScroll, savedPdfScroll);
    }
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
