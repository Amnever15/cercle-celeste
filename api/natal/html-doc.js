/**
 * Document HTML du Manuscrit Céleste — présentation calquée sur
 * GENERATIONS/manuscrit-celeste-generation.html (buildPDF : couverture,
 * placements, HD, chapitres, affirmations, rituels, message, synthèse).
 */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function paras(text) {
  return String(text || '')
    .split(/\n\n+/)
    .map(function (p) { return p.trim(); })
    .filter(Boolean)
    .map(function (p) { return '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>'; })
    .join('\n');
}

var PLANET_LABELS = {
  soleil: 'Soleil', sun: 'Soleil',
  lune: 'Lune', moon: 'Lune',
  ascendant: 'Ascendant', asc: 'Ascendant',
  mc: 'MC',
  mercure: 'Mercure', mercury: 'Mercure',
  venus: 'Vénus',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturne: 'Saturne', saturn: 'Saturne',
  noeud_nord: 'Nœud Nord', northnode: 'Nœud Nord', north_node: 'Nœud Nord'
};

function planetLabel(key) {
  var k = String(key || '').toLowerCase().replace(/\s+/g, '_');
  return PLANET_LABELS[k] || String(key || '').replace(/_/g, ' ');
}

function buildNatalHtml(contact, manuscrit, hd, astro, opts) {
  opts = opts || {};
  var coverMain = opts.coverMain || 'Ton Manuscrit';
  var coverGold = opts.coverGold != null ? opts.coverGold : 'Céleste';
  var coverFor = opts.coverFor || null;
  var footerLabel = opts.footerLabel || 'Ton Manuscrit Céleste';
  var skipAffirmations = !!opts.skipAffirmations;
  var skipRituelsBlock = !!opts.skipRituelsBlock;
  var skipSynthese = !!opts.skipSynthese;
  var prenom = esc(contact.prenom || 'toi');
  var lieu = esc(contact.birthPlace || '');
  var date = esc(contact.birthDate || '');
  var heure = esc(contact.birthTime || '');
  var pl = (manuscrit && manuscrit.placements_confirmes) || {};
  var sections = (manuscrit && manuscrit.sections) || [];
  var affirmations = (manuscrit && manuscrit.affirmations) || [];
  var rituels = (manuscrit && manuscrit.rituels) || [];
  var syn = (manuscrit && manuscrit.synthese) || null;

  var dateStr = [date + (heure ? ' · ' + heure : ''), lieu].filter(Boolean).join(' · ');

  var order = ['soleil', 'lune', 'ascendant', 'mc', 'mercure', 'venus', 'mars', 'jupiter', 'saturne', 'noeud_nord'];
  var plItems = order.map(function (k) {
    var fromAstro = null;
    if (astro) {
      var map = {
        soleil: astro.Sun, lune: astro.Moon, ascendant: astro.Ascendant, mc: astro.MC,
        mercure: astro.Mercury, venus: astro.Venus, mars: astro.Mars,
        jupiter: astro.Jupiter, saturne: astro.Saturn, noeud_nord: astro.NorthNode
      };
      fromAstro = map[k];
    }
    var val = fromAstro || pl[k] || pl[k.replace(/é/g, 'e')] || '—';
    return { label: planetLabel(k), value: String(val) };
  });

  /* Ajoute placements extra éventuels */
  Object.keys(pl).forEach(function (k) {
    var kk = k.toLowerCase();
    if (order.indexOf(kk) >= 0) return;
    plItems.push({ label: planetLabel(k), value: String(pl[k]) });
  });

  var placementsHtml = plItems.map(function (it) {
    var raw = String(it.value || '—');
    var pi = raw.indexOf('(');
    var l1 = pi > 0 ? raw.slice(0, pi).trim() : raw;
    var l2 = pi > 0 ? raw.slice(pi).trim() : '';
    return (
      '<div class="pl-card">' +
      '<div class="pl-label">' + esc(it.label) + '</div>' +
      '<div class="pl-val">' + esc(l1) + '</div>' +
      (l2 ? '<div class="pl-sub">' + esc(l2) + '</div>' : '') +
      '</div>'
    );
  }).join('');

  var hdItems = [
    ['Type', hd && hd.type],
    ['Profil', hd && hd.profile],
    ['Autorité', hd && hd.authority],
    ['Stratégie', hd && hd.strategy]
  ];
  var hdCards = hdItems.map(function (it) {
    return (
      '<div class="hd-cell">' +
      '<div class="hd-k">' + esc(it[0]) + '</div>' +
      '<div class="hd-v">' + esc(it[1] || '—') + '</div>' +
      '</div>'
    );
  }).join('');

  var channelsHtml = '';
  if (hd && Array.isArray(hd.channels) && hd.channels.length) {
    channelsHtml = '<p class="channels">Canaux : ' + esc(hd.channels.join('  ·  ')) + '</p>';
  }
  var crossHtml = hd && hd.cross
    ? '<p class="cross">Croix d’Incarnation : ' + esc(hd.cross) + '</p>'
    : '';

  var coverSig = [
    pl.soleil && ('Soleil : ' + pl.soleil),
    pl.lune && ('Lune : ' + pl.lune),
    pl.ascendant && ('Asc : ' + pl.ascendant),
    hd && hd.type && (hd.type + (hd.profile ? ' · ' + hd.profile : ''))
  ].filter(Boolean).join('  ·  ');

  var sectionsHtml = sections.map(function (sec, si) {
    if (!sec) return '';
    var neb = (si % 3) + 1;
    return (
      '<section class="sheet chapter neb-' + neb + '">' +
      '<div class="page-frame"></div>' +
      '<header class="page-hdr"><span>✦</span><span class="hdr-name">' + prenom + '</span><span>✦</span></header>' +
      '<div class="chapter-inner">' +
      '<h2 class="ch-title">' + esc(sec.titre || '') + '</h2>' +
      (sec.sous_titre ? '<p class="ch-sub">' + esc(sec.sous_titre) + '</p>' : '') +
      '<p class="ch-num">— CHAPITRE ' + esc(sec.numero || '') + ' —</p>' +
      '<div class="orn">✦ ········· ✦ ········· ✦</div>' +
      '<div class="body">' + paras(sec.contenu) + '</div>' +
      (sec.insight
        ? '<div class="insight-wrap"><span class="insight-dot">✦</span><blockquote class="insight">' + esc(sec.insight) + '</blockquote></div>'
        : '') +
      '</div>' +
      '<footer class="page-ftr">' + footerLabel + '</footer>' +
      '</section>'
    );
  }).join('\n');

  var affHtml = affirmations.map(function (a, i) {
    return (
      '<li class="aff-item">' +
      '<span class="aff-n">' + (i + 1) + '</span>' +
      '<span class="aff-t">' + esc(a) + '</span>' +
      '</li>'
    );
  }).join('');

  var ritHtml = rituels.map(function (r, i) {
    return (
      '<article class="rituel">' +
      '<div class="rit-num">Rituel ' + (i + 1) + '</div>' +
      '<h3>' + esc(r.nom || ('Rituel ' + (i + 1))) + '</h3>' +
      (r.timing ? '<p class="timing">' + esc(r.timing) + '</p>' : '') +
      '<div class="body">' + paras(r.description) + '</div>' +
      '</article>'
    );
  }).join('\n');

  var synHtml = '';
  if (syn) {
    synHtml =
      '<section class="sheet synthese neb-2">' +
      '<div class="page-frame"></div>' +
      '<header class="page-hdr"><span>✦</span><span class="hdr-name">' + prenom + '</span><span>✦</span></header>' +
      '<div class="chapter-inner">' +
      '<p class="eyebrow">— SYNTHÈSE EXÉCUTIVE —</p>' +
      '<h2 class="ch-title">L’Essence de ton Manuscrit</h2>' +
      '<p class="ch-sub">Ce que le ciel et ton design ont écrit pour toi — condensé</p>' +
      '<div class="orn">✦ ········· ✦ ········· ✦</div>' +
      (syn.essence
        ? '<div class="syn-block"><div class="syn-k">TON ESSENCE</div><p class="essence">' + esc(syn.essence) + '</p></div>'
        : '') +
      (Array.isArray(syn.forces) && syn.forces.length
        ? '<div class="syn-block"><div class="syn-k">TES 3 FORCES SIGNATURES</div><ul class="forces">' +
          syn.forces.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') +
          '</ul></div>'
        : '') +
      (syn.chemin_croissance
        ? '<div class="syn-block"><div class="syn-k">TON CHEMIN DE CROISSANCE</div><p>' + esc(syn.chemin_croissance) + '</p></div>'
        : '') +
      (syn.direction_geo
        ? '<div class="syn-block"><div class="syn-k">TA DIRECTION</div><p>' + esc(syn.direction_geo) + '</p></div>'
        : '') +
      (syn.strategie_hd
        ? '<div class="syn-block"><div class="syn-k">TA STRATÉGIE AU QUOTIDIEN</div><p>' + esc(syn.strategie_hd) + '</p></div>'
        : '') +
      (syn.fenetre_puissance
        ? '<div class="syn-block"><div class="syn-k">TA FENÊTRE DE PUISSANCE</div><p>' + esc(syn.fenetre_puissance) + '</p></div>'
        : '') +
      (syn.mantra
        ? '<blockquote class="mantra">' + esc(syn.mantra) + '</blockquote>'
        : '') +
      '</div>' +
      '<footer class="page-ftr">' + footerLabel + '</footer>' +
      '</section>';
  }

  return `<!DOCTYPE html>
<html lang="fr" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Manuscrit Céleste — ${prenom}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Cinzel:wght@400;600&family=Inter:wght@300;400&display=swap" rel="stylesheet">
<style>
:root, html[data-theme="dark"] {
  --deep: #04010D;
  --deep-2: #0a0620;
  --gold: #C9A84C;
  --gold-light: #F3DD9E;
  --cream: #F7F0DC;
  --cream-soft: #f3ead6;
  --violet: #2D1870;
  --muted: #9C90B4;
  --sheet-bg:
    radial-gradient(ellipse at 18% 78%, rgba(61,26,122,.22), transparent 55%),
    radial-gradient(ellipse at 84% 28%, rgba(26,48,122,.18), transparent 50%),
    linear-gradient(165deg, rgba(12,7,35,.96), rgba(4,1,13,.99));
  --sheet-bg-2:
    radial-gradient(ellipse at 85% 80%, rgba(61,26,122,.2), transparent 55%),
    radial-gradient(ellipse at 15% 25%, rgba(26,48,122,.16), transparent 50%),
    linear-gradient(165deg, rgba(12,7,35,.96), rgba(4,1,13,.99));
  --sheet-bg-3:
    radial-gradient(ellipse at 50% 90%, rgba(38,18,100,.22), transparent 50%),
    radial-gradient(ellipse at 90% 20%, rgba(52,20,90,.16), transparent 48%),
    linear-gradient(165deg, rgba(12,7,35,.96), rgba(4,1,13,.99));
  --card-bg: rgba(45,24,96,.35);
  --hd-bg: rgba(35,18,85,.55);
  --insight-bg: rgba(45,24,112,.32);
  --rituel-bg: rgba(45,24,96,.22);
  --frame-border: rgba(201,168,76,.22);
  --gold-soft: rgba(201,168,76,.55);
  --ink-soft: rgba(247,240,220,.55);
  --ink-mid: rgba(247,240,220,.85);
  --body-glow:
    radial-gradient(1200px 550px at 10% -10%, rgba(103,78,184,.22), transparent 60%),
    radial-gradient(1000px 700px at 100% 10%, rgba(38,102,160,.16), transparent 60%),
    var(--deep);
}
html[data-theme="light"] {
  --deep: #F4EFE4;
  --deep-2: #EBE3D4;
  --gold: #A8842E;
  --gold-light: #8F6F22;
  --cream: #1C1724;
  --cream-soft: #2A2433;
  --violet: #D9CFBE;
  --muted: #6A6174;
  --sheet-bg:
    radial-gradient(ellipse at 18% 78%, rgba(201,168,76,.08), transparent 55%),
    radial-gradient(ellipse at 84% 28%, rgba(180,150,80,.06), transparent 50%),
    linear-gradient(165deg, rgba(255,252,246,.98), rgba(244,239,228,.99));
  --sheet-bg-2:
    radial-gradient(ellipse at 85% 80%, rgba(201,168,76,.07), transparent 55%),
    radial-gradient(ellipse at 15% 25%, rgba(160,130,60,.05), transparent 50%),
    linear-gradient(165deg, rgba(255,252,246,.98), rgba(244,239,228,.99));
  --sheet-bg-3:
    radial-gradient(ellipse at 50% 90%, rgba(201,168,76,.08), transparent 50%),
    radial-gradient(ellipse at 90% 20%, rgba(180,140,70,.06), transparent 48%),
    linear-gradient(165deg, rgba(255,252,246,.98), rgba(244,239,228,.99));
  --card-bg: rgba(255,252,246,.85);
  --hd-bg: rgba(255,250,240,.9);
  --insight-bg: rgba(248,240,220,.75);
  --rituel-bg: rgba(255,252,246,.72);
  --frame-border: rgba(168,132,46,.28);
  --gold-soft: rgba(168,132,46,.65);
  --ink-soft: rgba(28,23,36,.55);
  --ink-mid: rgba(28,23,36,.82);
  --body-glow:
    radial-gradient(1200px 550px at 10% -10%, rgba(201,168,76,.12), transparent 60%),
    radial-gradient(1000px 700px at 100% 10%, rgba(180,150,90,.08), transparent 60%),
    var(--deep);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  background: var(--deep);
  color: var(--cream);
  font-family: 'Cormorant Garamond', Georgia, serif;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}
body {
  background: var(--body-glow);
}
.sheet {
  position: relative;
  max-width: 720px;
  margin: 0 auto 28px;
  min-height: 92vh;
  padding: 52px 44px 56px;
  background: var(--sheet-bg);
  overflow: hidden;
  page-break-after: always;
  break-after: page;
}
.sheet::before {
  content: '';
  position: absolute; inset: 0; pointer-events: none; opacity: .55;
  background-image: radial-gradient(1.2px 1.2px at 12% 18%, rgba(243,221,158,.55), transparent),
    radial-gradient(1px 1px at 28% 42%, rgba(255,255,255,.35), transparent),
    radial-gradient(1.4px 1.4px at 62% 22%, rgba(243,221,158,.4), transparent),
    radial-gradient(1px 1px at 78% 58%, rgba(255,255,255,.28), transparent),
    radial-gradient(1.2px 1.2px at 88% 14%, rgba(201,168,76,.5), transparent),
    radial-gradient(1px 1px at 44% 72%, rgba(255,255,255,.25), transparent),
    radial-gradient(1.3px 1.3px at 8% 64%, rgba(243,221,158,.35), transparent),
    radial-gradient(1px 1px at 70% 84%, rgba(255,255,255,.22), transparent);
}
.page-frame {
  position: absolute; inset: 22px; pointer-events: none;
  border: .45pt solid var(--frame-border);
  box-shadow: inset 0 0 0 .3pt rgba(243,221,158,.1);
}
html[data-theme="light"] .page-frame {
  box-shadow: inset 0 0 0 .3pt rgba(168,132,46,.08);
}
.page-frame::before, .page-frame::after,
.sheet::after {
  content: '';
  position: absolute; width: 5px; height: 5px; border-radius: 50%;
  background: rgba(201,168,76,.45); z-index: 2;
}
.page-frame::before { top: -2px; left: -2px; }
.page-frame::after { top: -2px; right: -2px; }
.sheet > .page-frame + .page-hdr ~ .corner-bl,
.corner-sigil { display: none; }
.page-hdr, .page-ftr {
  position: relative; z-index: 1;
  display: flex; justify-content: center; align-items: center; gap: 14px;
  font-family: 'Inter', sans-serif;
  font-size: .62rem; letter-spacing: .18em; text-transform: uppercase;
  color: var(--gold-soft);
}
.page-hdr { margin-bottom: 28px; }
.page-ftr { margin-top: 36px; opacity: .7; }
.hdr-name { color: var(--ink-soft); letter-spacing: .14em; }
.orn {
  text-align: center; color: var(--gold-soft);
  font-size: .72rem; letter-spacing: .08em; margin: 10px 0 22px;
}
/* COUVERTURE */
.cover {
  display: flex; flex-direction: column; justify-content: flex-end;
  align-items: center; text-align: center;
  padding-bottom: 8vh; min-height: 92vh;
}
.cover-aura {
  position: absolute; left: 50%; top: 42%; transform: translate(-50%, -50%);
  width: min(70vw, 320px); height: min(70vw, 320px); border-radius: 50%;
  background: radial-gradient(circle, rgba(90,55,175,.2) 0%, transparent 68%);
  pointer-events: none;
}
.cover-ring {
  position: absolute; left: 50%; top: 42%; transform: translate(-50%, -50%);
  width: min(52vw, 220px); height: min(52vw, 220px); border-radius: 50%;
  border: .6pt solid rgba(201,168,76,.28); pointer-events: none;
}
.cover-ring span {
  position: absolute; width: 1px; height: 14px; background: rgba(201,168,76,.35);
  left: 50%; top: -14px; transform-origin: 50% calc(100% + 110px);
}
.cover-ring span:nth-child(1) { transform: translateX(-50%) rotate(0deg); }
.cover-ring span:nth-child(2) { transform: translateX(-50%) rotate(30deg); }
.cover-ring span:nth-child(3) { transform: translateX(-50%) rotate(60deg); }
.cover-ring span:nth-child(4) { transform: translateX(-50%) rotate(90deg); }
.cover-ring span:nth-child(5) { transform: translateX(-50%) rotate(120deg); }
.cover-ring span:nth-child(6) { transform: translateX(-50%) rotate(150deg); }
.cover-ring span:nth-child(7) { transform: translateX(-50%) rotate(180deg); }
.cover-ring span:nth-child(8) { transform: translateX(-50%) rotate(210deg); }
.cover-ring span:nth-child(9) { transform: translateX(-50%) rotate(240deg); }
.cover-ring span:nth-child(10) { transform: translateX(-50%) rotate(270deg); }
.cover-ring span:nth-child(11) { transform: translateX(-50%) rotate(300deg); }
.cover-ring span:nth-child(12) { transform: translateX(-50%) rotate(330deg); }
.cover-top {
  position: absolute; top: 14%; left: 0; right: 0; text-align: center; z-index: 1;
}
.cover-top .date {
  font-family: 'Inter', sans-serif; font-size: .72rem;
  color: rgba(201,168,76,.7); letter-spacing: .06em; margin-bottom: 10px;
}
.cover-top .sig {
  font-family: 'Inter', sans-serif; font-size: .66rem;
  color: rgba(201,168,76,.55); letter-spacing: .04em; max-width: 90%; margin: 0 auto;
}
.cover-titles { position: relative; z-index: 1; margin-top: auto; }
.cover-titles h1 {
  font-family: 'Cinzel', serif; font-weight: 400;
  font-size: clamp(2rem, 6vw, 2.75rem); letter-spacing: .06em;
  color: var(--cream); line-height: 1.15; margin: 0;
}
.cover-titles h1 .gold {
  display: block; font-size: clamp(2.4rem, 7vw, 3.3rem);
  color: var(--gold-light); margin-top: .15em;
}
.cover-for {
  font-style: italic; font-size: 1.15rem; color: var(--ink-mid);
  margin: 1.1rem 0 0;
}
/* PLACEMENTS */
.eyebrow {
  font-family: 'Inter', sans-serif; font-size: .68rem; letter-spacing: .16em;
  text-transform: uppercase; color: rgba(201,168,76,.65); text-align: center; margin-bottom: 8px;
}
.sec-title {
  font-family: 'Cinzel', serif; font-weight: 400; font-size: clamp(1.45rem, 4vw, 1.85rem);
  text-align: center; color: var(--cream); letter-spacing: .05em; margin: 0 0 8px;
}
.sec-sub {
  text-align: center; font-family: 'Inter', sans-serif; font-size: .68rem;
  letter-spacing: .14em; text-transform: uppercase; color: rgba(201,168,76,.55); margin-bottom: 8px;
}
.pl-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 18px 0 22px;
}
@media (min-width: 560px) {
  .pl-grid { grid-template-columns: repeat(4, 1fr); }
}
.pl-card {
  background: var(--card-bg);
  border: .35pt solid rgba(201,168,76,.28);
  border-radius: 8px; padding: 12px 8px 14px; text-align: center; min-height: 72px;
}
html[data-theme="light"] .pl-card {
  border-color: rgba(168,132,46,.28);
  box-shadow: 0 1px 8px rgba(28,23,36,.06);
}
.pl-label {
  font-family: 'Inter', sans-serif; font-size: .58rem; letter-spacing: .14em;
  text-transform: uppercase; color: rgba(201,168,76,.7); margin-bottom: 8px;
}
.pl-val { font-size: .95rem; color: var(--cream); line-height: 1.25; }
.pl-sub { font-size: .72rem; color: var(--gold-light); opacity: .8; margin-top: 4px; }
.hd-block {
  margin: 8px 0 18px; padding: 14px 12px 16px;
  background: var(--hd-bg);
  border: .5pt solid rgba(201,168,76,.3);
  border-radius: 10px;
  border-left: 3px solid var(--gold);
}
html[data-theme="light"] .hd-block {
  border-color: rgba(168,132,46,.3);
}
.hd-head {
  font-family: 'Inter', sans-serif; font-size: .62rem; letter-spacing: .16em;
  text-transform: uppercase; color: rgba(201,168,76,.7); margin: 0 0 12px 4px;
}
.hd-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
@media (min-width: 560px) { .hd-row { grid-template-columns: repeat(4, 1fr); } }
.hd-cell { text-align: center; padding: 4px; }
.hd-k {
  font-family: 'Inter', sans-serif; font-size: .58rem; letter-spacing: .1em;
  text-transform: uppercase; color: rgba(201,168,76,.55); margin-bottom: 6px;
}
.hd-v { font-size: .92rem; color: var(--cream); }
.channels, .cross {
  text-align: center; font-size: .82rem; color: var(--muted); margin: 8px 0;
}
.intro-body { margin-top: 8px; }
.intro-body p, .body p {
  margin: 0 0 1.05em; font-size: 1.05rem; line-height: 1.72;
  color: var(--cream-soft);
}
/* CHAPITRES */
.chapter-inner { position: relative; z-index: 1; }
.ch-title {
  font-family: 'Cinzel', serif; font-weight: 400;
  font-size: clamp(1.35rem, 3.8vw, 1.75rem); text-align: center;
  color: var(--cream); letter-spacing: .04em; line-height: 1.3; margin: 0 0 10px;
}
.ch-sub {
  text-align: center; font-style: italic; font-size: 1.02rem;
  color: var(--gold-soft); margin: 0 0 6px; line-height: 1.4;
}
.ch-num {
  font-family: 'Inter', sans-serif; font-size: .68rem; letter-spacing: .16em;
  text-transform: uppercase; color: rgba(201,168,76,.6); text-align: center; margin: 0 0 4px;
}
.insight-wrap { margin: 28px 0 8px; text-align: center; }
.insight-dot { display: block; color: var(--gold); font-size: .85rem; margin-bottom: 10px; opacity: .7; }
.insight, .mantra {
  margin: 0 auto; max-width: 92%;
  border: .45pt solid rgba(201,168,76,.35);
  background: var(--insight-bg);
  border-radius: 10px; padding: 14px 18px;
  color: var(--gold-light); font-style: italic; font-size: 1.02rem; line-height: 1.55;
  text-align: left;
}
html[data-theme="light"] .insight,
html[data-theme="light"] .mantra {
  border-color: rgba(168,132,46,.35);
}
.mantra { text-align: center; margin-top: 22px; }
/* AFFIRMATIONS / RITUELS */
.aff-list { list-style: none; margin: 18px 0 0; padding: 0; }
.aff-item {
  display: flex; gap: 14px; align-items: flex-start;
  padding: 12px 0; border-bottom: .35pt solid rgba(201,168,76,.15);
}
.aff-n {
  flex: 0 0 28px; height: 28px; border-radius: 50%;
  border: .45pt solid rgba(201,168,76,.45);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Cinzel', serif; font-size: .75rem; color: var(--gold-light);
}
.aff-t { flex: 1; font-size: 1.05rem; color: var(--cream-soft); line-height: 1.5; }
.rituel {
  margin: 18px 0; padding: 16px 18px;
  border: .45pt solid rgba(201,168,76,.28);
  border-radius: 12px; background: var(--rituel-bg);
}
html[data-theme="light"] .rituel {
  border-color: rgba(168,132,46,.28);
}
.rit-num {
  font-family: 'Inter', sans-serif; font-size: .58rem; letter-spacing: .14em;
  text-transform: uppercase; color: rgba(201,168,76,.6); margin-bottom: 6px;
}
.rituel h3 {
  font-family: 'Cinzel', serif; font-weight: 400; font-size: 1.15rem;
  color: var(--gold-light); margin: 0 0 6px;
}
.timing { font-style: italic; color: var(--muted); font-size: .92rem; margin-bottom: 10px; }
.syn-block { margin: 18px 0; }
.syn-k {
  font-family: 'Inter', sans-serif; font-size: .62rem; letter-spacing: .14em;
  text-transform: uppercase; color: rgba(201,168,76,.7); margin-bottom: 8px;
}
.essence { font-size: 1.15rem; font-style: italic; color: var(--gold-light); line-height: 1.55; }
.forces { padding-left: 1.2em; color: var(--cream-soft); }
.forces li { margin: 0 0 .55em; }
.neb-2 { background: var(--sheet-bg-2); }
.neb-3 { background: var(--sheet-bg-3); }
@media print {
  body { background: #fff; }
  .sheet {
    box-shadow: none; min-height: auto;
    background: #fff; color: #1a1028;
    page-break-after: always;
  }
  .intro-body p, .body p, .aff-t, .forces { color: #1a1028; }
  .pl-card, .hd-block, .rituel, .insight, .mantra { background: #f7f0dc; }
}
@media (max-width: 520px) {
  .sheet { padding: 40px 20px 48px; margin-bottom: 16px; }
  .page-frame { inset: 12px; }
}
</style>
</head>
<body>

<section class="sheet cover">
  <div class="page-frame"></div>
  <div class="cover-aura"></div>
  <div class="cover-ring">
    <span></span><span></span><span></span><span></span>
    <span></span><span></span><span></span><span></span>
    <span></span><span></span><span></span><span></span>
  </div>
  <div class="cover-top">
    <div class="orn">✦ ········· ✦ ········· ✦</div>
    ${dateStr ? '<p class="date">' + dateStr + '</p>' : ''}
    ${coverSig ? '<p class="sig">' + esc(coverSig) + '</p>' : ''}
    <div class="orn">✦ ········· ✦ ········· ✦</div>
  </div>
  <div class="cover-titles">
    <h1>${esc(coverMain)}<span class="gold">${esc(coverGold)}</span></h1>
    <div class="orn">✦ ········· ✦ ········· ✦</div>
    <p class="cover-for">${coverFor ? esc(coverFor) : ('Révélations pour ' + prenom)}</p>
  </div>
</section>

<section class="sheet neb-2">
  <div class="page-frame"></div>
  <header class="page-hdr"><span>✦</span><span class="hdr-name">${prenom}</span><span>✦</span></header>
  <p class="sec-title">Tes Placements Réels</p>
  <p class="sec-sub">— TA CARTE COSMIQUE —</p>
  <div class="orn">✦ ········· ✦ ········· ✦</div>
  <div class="pl-grid">${placementsHtml}</div>
  <div class="hd-block">
    <div class="hd-head">Human Design</div>
    <div class="hd-row">${hdCards}</div>
  </div>
  ${channelsHtml}
  ${crossHtml}
  <div class="orn">✦ ········· ✦ ········· ✦</div>
  <div class="intro-body body">${paras(manuscrit && manuscrit.intro)}</div>
  <footer class="page-ftr">${footerLabel}</footer>
</section>

${sectionsHtml}

${skipAffirmations || !affirmations.length ? '' : `<section class="sheet neb-1">
  <div class="page-frame"></div>
  <header class="page-hdr"><span>✦</span><span class="hdr-name">${prenom}</span><span>✦</span></header>
  <p class="sec-title">Tes Affirmations Cosmiques</p>
  <p class="sec-sub">10 vérités pour ancrer ton âme</p>
  <div class="orn">✦ ········· ✦ ········· ✦</div>
  <ul class="aff-list">${affHtml}</ul>
  <footer class="page-ftr">${footerLabel}</footer>
</section>`}

${skipRituelsBlock || !rituels.length ? '' : `<section class="sheet neb-3">
  <div class="page-frame"></div>
  <header class="page-hdr"><span>✦</span><span class="hdr-name">${prenom}</span><span>✦</span></header>
  <p class="sec-title">Tes Rituels Sacrés</p>
  <p class="sec-sub">Pratiques pour ton alignement</p>
  <div class="orn">✦ ········· ✦ ········· ✦</div>
  ${ritHtml}
  <footer class="page-ftr">${footerLabel}</footer>
</section>`}

<section class="sheet neb-2">
  <div class="page-frame"></div>
  <header class="page-hdr"><span>✦</span><span class="hdr-name">${prenom}</span><span>✦</span></header>
  <p class="sec-title">Ton Message de l’Univers</p>
  <p class="sec-sub">Tu es exactement qui tu dois être</p>
  <div class="orn">✦ ········· ✦ ········· ✦</div>
  <div class="body">${paras((manuscrit && manuscrit.conclusion) || 'L’Univers t’a écrit ce manuscrit pour te rappeler que tu es exactement là où tu dois être, avec les outils qu’il te faut.')}</div>
  <footer class="page-ftr">${footerLabel}</footer>
</section>

${skipSynthese ? '' : synHtml}

</body>
<script>
(function () {
  function applyDocTheme(t) {
    t = (t === 'light') ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
  }
  function themeFromQuery() {
    try {
      var q = new URLSearchParams(location.search || '');
      var t = q.get('theme');
      if (t === 'light' || t === 'dark') return t;
    } catch (e) {}
    return null;
  }
  var initial = themeFromQuery();
  applyDocTheme(initial || 'dark');
  window.addEventListener('message', function (ev) {
    var d = ev && ev.data;
    if (!d || d.type !== 'ms-celeste-theme') return;
    applyDocTheme(d.theme);
  });

  function stop(e) { e.preventDefault(); }
  document.addEventListener('copy', stop);
  document.addEventListener('cut', stop);
  document.addEventListener('dragstart', stop);
  var last = '';
  function emit(text) {
    text = String(text || '').replace(/\s+/g, ' ').trim();
    if (text === last) return;
    last = text;
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'ms-celeste-sel', text: text }, '*');
      }
    } catch (err) {}
  }
  document.addEventListener('selectionchange', function () {
    var sel = window.getSelection();
    var t = sel && !sel.isCollapsed ? String(sel.toString() || '') : '';
    emit(t.length >= 20 ? t : '');
  });
})();
</script>
</html>`;
}

function estimatePages(manuscrit) {
  var parts = [];
  if (!manuscrit) return 0;
  if (manuscrit.intro) parts.push(manuscrit.intro);
  (manuscrit.sections || []).forEach(function (s) {
    if (s && s.contenu) parts.push(s.contenu);
  });
  (manuscrit.affirmations || []).forEach(function (a) { parts.push(a); });
  (manuscrit.rituels || []).forEach(function (r) {
    if (r && r.description) parts.push(r.description);
  });
  if (manuscrit.conclusion) parts.push(manuscrit.conclusion);
  var words = parts.join(' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 280));
}

/** Extrait un texte compact pour contextualiser l’IA Céleste. */
function extractPlainText(manuscrit, maxChars) {
  maxChars = maxChars || 12000;
  if (!manuscrit) return '';
  var parts = [];
  if (manuscrit.intro) parts.push(manuscrit.intro);
  (manuscrit.sections || []).forEach(function (s) {
    if (!s) return;
    parts.push((s.numero || '') + ' ' + (s.titre || ''));
    if (s.contenu) parts.push(s.contenu);
    if (s.insight) parts.push(s.insight);
  });
  if (manuscrit.conclusion) parts.push(manuscrit.conclusion);
  if (manuscrit.rituel && manuscrit.rituel.description) parts.push(manuscrit.rituel.description);
  if (manuscrit.synthese && manuscrit.synthese.essence) parts.push(manuscrit.synthese.essence);
  var t = parts.join('\n\n').replace(/\s+/g, ' ').trim();
  if (t.length > maxChars) t = t.slice(0, maxChars) + '…';
  return t;
}

/**
 * HTML mois/jour — même habillage que le natal, titres adaptés.
 */
function buildPeriodHtml(kind, contact, period, hd, astro) {
  kind = kind === 'jour' ? 'jour' : 'mois';
  var titre = (period && period.titre) || (kind === 'jour' ? 'Manuscrit du jour' : 'Manuscrit du mois');
  var rituels = [];
  if (period && period.rituel && period.rituel.description) {
    rituels.push({
      nom: period.rituel.titre || 'Rituel',
      description: period.rituel.description
    });
  }
  var manuscrit = {
    intro: period && period.intro,
    sections: (period && period.sections) || [],
    affirmations: [],
    rituels: rituels,
    conclusion: period && period.conclusion,
    synthese: null,
    placements_confirmes: {}
  };
  return buildNatalHtml(contact, manuscrit, hd, astro, {
    coverMain: kind === 'jour' ? 'Manuscrit' : 'Manuscrit',
    coverGold: kind === 'jour' ? 'du jour' : 'du mois',
    coverFor: titre + ' — pour ' + (contact.prenom || 'toi'),
    footerLabel: kind === 'jour' ? 'Manuscrit Céleste du jour' : 'Manuscrit Céleste du mois',
    skipAffirmations: true,
    skipRituelsBlock: rituels.length === 0,
    skipSynthese: true
  });
}

/**
 * HTML manuscrit couple — même style que natal, couverture « Couple »
 * + bonus_valeur (radar / plan 30-60-90) si présent.
 */
function buildCoupleHtml(contact, partner, manuscrit, hdA, astroA, hdB, astroB) {
  partner = partner || {};
  manuscrit = manuscrit || {};
  var pa = (contact && contact.prenom) || 'toi';
  var pb = partner.prenom || 'partenaire';
  var names = pa + ' & ' + pb;

  var syn = manuscrit.synthese || null;
  if (syn) {
    syn = {
      essence: syn.essence,
      forces: syn.forces || syn.forces_maitresses || [],
      chemin_croissance: syn.chemin_croissance,
      strategie_hd: syn.strategie_relationnelle || syn.strategie_hd,
      mantra: syn.mantra || syn.mantra_du_couple
    };
  }

  var fakeContact = {
    prenom: names,
    birthDate: '',
    birthTime: '',
    birthPlace: ''
  };

  var pl = manuscrit.placements_confirmes || {};
  if (!pl.soleil && astroA && astroB) {
    pl = {
      soleil: (astroA.Sun || '—') + ' / ' + (astroB.Sun || '—'),
      lune: (astroA.Moon || '—') + ' / ' + (astroB.Moon || '—'),
      ascendant: (astroA.Ascendant || '—') + ' / ' + (astroB.Ascendant || '—'),
      type_hd: ((hdA && hdA.type) || '—') + ' / ' + ((hdB && hdB.type) || '—'),
      profil_hd: ((hdA && hdA.profile) || '—') + ' / ' + ((hdB && hdB.profile) || '—')
    };
  }

  var mergedHd = {
    type: ((hdA && hdA.type) || '—') + ' · ' + ((hdB && hdB.type) || '—'),
    profile: ((hdA && hdA.profile) || '—') + ' · ' + ((hdB && hdB.profile) || '—'),
    authority: ((hdA && hdA.authority) || '—') + ' · ' + ((hdB && hdB.authority) || '—'),
    strategy: ((hdA && hdA.strategy) || '—') + ' · ' + ((hdB && hdB.strategy) || '—'),
    channels: [],
    cross: ((hdA && hdA.cross) || '') + (hdB && hdB.cross ? ' · ' + hdB.cross : '')
  };

  var mergedAstro = {
    Sun: pl.soleil || ((astroA && astroA.Sun) || '—') + ' / ' + ((astroB && astroB.Sun) || '—'),
    Moon: pl.lune || ((astroA && astroA.Moon) || '—') + ' / ' + ((astroB && astroB.Moon) || '—'),
    Ascendant: pl.ascendant || ((astroA && astroA.Ascendant) || '—') + ' / ' + ((astroB && astroB.Ascendant) || '—'),
    Mercury: ((astroA && astroA.Mercury) || '—') + ' / ' + ((astroB && astroB.Mercury) || '—'),
    Venus: ((astroA && astroA.Venus) || '—') + ' / ' + ((astroB && astroB.Venus) || '—'),
    Mars: ((astroA && astroA.Mars) || '—') + ' / ' + ((astroB && astroB.Mars) || '—'),
    Jupiter: ((astroA && astroA.Jupiter) || '—') + ' / ' + ((astroB && astroB.Jupiter) || '—'),
    Saturn: ((astroA && astroA.Saturn) || '—') + ' / ' + ((astroB && astroB.Saturn) || '—'),
    MC: ((astroA && astroA.MC) || '—') + ' / ' + ((astroB && astroB.MC) || '—'),
    NorthNode: ((astroA && astroA.NorthNode) || '—') + ' / ' + ((astroB && astroB.NorthNode) || '—')
  };

  var ms = {
    intro: manuscrit.intro,
    sections: manuscrit.sections || [],
    affirmations: manuscrit.affirmations || [],
    rituels: manuscrit.rituels || [],
    conclusion: manuscrit.conclusion,
    synthese: syn,
    placements_confirmes: pl
  };

  var html = buildNatalHtml(fakeContact, ms, mergedHd, mergedAstro, {
    coverMain: 'Manuscrit Céleste',
    coverGold: 'Couple',
    coverFor: names,
    footerLabel: 'Manuscrit Céleste · Couple'
  });

  var bonus = manuscrit.bonus_valeur;
  if (!bonus || typeof bonus !== 'object') return html;

  var bonusBlocks = [];
  if (bonus.radar_resume) {
    bonusBlocks.push(
      '<div class="syn-block"><div class="syn-k">RADAR DE COMPATIBILITÉ</div><p>' +
      esc(bonus.radar_resume) + '</p></div>'
    );
  }
  if (bonus.scores_compatibilite && typeof bonus.scores_compatibilite === 'object') {
    var scores = bonus.scores_compatibilite;
    var scoreLines = Object.keys(scores).map(function (k) {
      return '<li><b>' + esc(k.replace(/_/g, ' ')) + '</b> — ' + esc(String(scores[k])) + ' / 100</li>';
    }).join('');
    if (scoreLines) {
      bonusBlocks.push(
        '<div class="syn-block"><div class="syn-k">SCORES</div><ul class="forces">' + scoreLines + '</ul></div>'
      );
    }
  }
  if (bonus.plan_30_60_90) {
    var p = bonus.plan_30_60_90;
    ['j30', 'j60', 'j90'].forEach(function (key) {
      var label = key === 'j30' ? '30 jours' : (key === 'j60' ? '60 jours' : '90 jours');
      var items = Array.isArray(p[key]) ? p[key] : [];
      if (!items.length) return;
      bonusBlocks.push(
        '<div class="syn-block"><div class="syn-k">PLAN ' + label.toUpperCase() + '</div><ul class="forces">' +
        items.map(function (it) { return '<li>' + esc(it) + '</li>'; }).join('') +
        '</ul></div>'
      );
    });
  }
  if (Array.isArray(bonus.protocole_anti_conflit) && bonus.protocole_anti_conflit.length) {
    bonusBlocks.push(
      '<div class="syn-block"><div class="syn-k">PROTOCOLE ANTI-CONFLIT</div><ul class="forces">' +
      bonus.protocole_anti_conflit.map(function (it) { return '<li>' + esc(it) + '</li>'; }).join('') +
      '</ul></div>'
    );
  }
  if (!bonusBlocks.length) return html;

  var bonusHtml =
    '<section class="sheet synthese neb-1">' +
    '<div class="page-frame"></div>' +
    '<header class="page-hdr"><span>✦</span><span class="hdr-name">' + esc(names) + '</span><span>✦</span></header>' +
    '<div class="chapter-inner">' +
    '<p class="eyebrow">— VALEUR AJOUTÉE —</p>' +
    '<h2 class="ch-title">Outils pour votre couple</h2>' +
    '<p class="ch-sub">Scores, plan d’action et protocole de réparation</p>' +
    '<div class="orn">✦ ········· ✦ ········· ✦</div>' +
    bonusBlocks.join('\n') +
    '</div>' +
    '<footer class="page-ftr">Manuscrit Céleste · Couple</footer>' +
    '</section>';

  return html.replace('</body>', bonusHtml + '\n</body>');
}

module.exports = { buildNatalHtml, buildPeriodHtml, buildCoupleHtml, estimatePages, extractPlainText, esc };
