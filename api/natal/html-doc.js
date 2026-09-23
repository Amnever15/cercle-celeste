/**
 * Document HTML multi-sections du Manuscrit Céleste (lisible dans l’iframe /natal-file).
 * Remplace le stub PDF 1 page — contenu complet, imprimable (~28 pages).
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

function buildNatalHtml(contact, manuscrit, hd, astro) {
  var prenom = esc(contact.prenom || 'toi');
  var lieu = esc(contact.birthPlace || '');
  var date = esc(contact.birthDate || '');
  var heure = esc(contact.birthTime || '');
  var pl = (manuscrit && manuscrit.placements_confirmes) || {};
  var sections = (manuscrit && manuscrit.sections) || [];
  var affirmations = (manuscrit && manuscrit.affirmations) || [];
  var rituels = (manuscrit && manuscrit.rituels) || [];
  var syn = (manuscrit && manuscrit.synthese) || null;

  var placementsHtml = Object.keys(pl).map(function (k) {
    return '<li><span class="k">' + esc(k) + '</span> ' + esc(pl[k]) + '</li>';
  }).join('');

  var sectionsHtml = sections.map(function (sec) {
    if (!sec) return '';
    return (
      '<section class="chapter page-break">' +
      '<div class="roman">' + esc(sec.numero || '') + '</div>' +
      '<h2>' + esc(sec.titre || '') + '</h2>' +
      (sec.sous_titre ? '<p class="sub">' + esc(sec.sous_titre) + '</p>' : '') +
      '<div class="body">' + paras(sec.contenu) + '</div>' +
      (sec.insight ? '<blockquote class="insight">✦ ' + esc(sec.insight) + '</blockquote>' : '') +
      '</section>'
    );
  }).join('\n');

  var affHtml = affirmations.map(function (a, i) {
    return '<li><span class="n">' + (i + 1) + '</span> ' + esc(a) + '</li>';
  }).join('');

  var ritHtml = rituels.map(function (r) {
    return (
      '<article class="rituel">' +
      '<h3>' + esc(r.nom || 'Rituel') + '</h3>' +
      (r.timing ? '<p class="timing">' + esc(r.timing) + '</p>' : '') +
      '<div class="body">' + paras(r.description) + '</div>' +
      '</article>'
    );
  }).join('\n');

  var synHtml = '';
  if (syn) {
    synHtml =
      '<section class="chapter page-break synthese">' +
      '<div class="roman">✦</div><h2>Synthèse exécutive</h2>' +
      (syn.essence ? '<p class="essence">' + esc(syn.essence) + '</p>' : '') +
      (Array.isArray(syn.forces) ? '<ul class="forces">' + syn.forces.map(function (f) {
        return '<li>' + esc(f) + '</li>';
      }).join('') + '</ul>' : '') +
      (syn.chemin_croissance ? '<p><strong>Croissance</strong> — ' + esc(syn.chemin_croissance) + '</p>' : '') +
      (syn.direction_geo ? '<p><strong>Direction</strong> — ' + esc(syn.direction_geo) + '</p>' : '') +
      (syn.strategie_hd ? '<p><strong>Geste du jour</strong> — ' + esc(syn.strategie_hd) + '</p>' : '') +
      (syn.fenetre_puissance ? '<p><strong>Fenêtre</strong> — ' + esc(syn.fenetre_puissance) + '</p>' : '') +
      (syn.mantra ? '<blockquote class="mantra">' + esc(syn.mantra) + '</blockquote>' : '') +
      '</section>';
  }

  var hdLine = [
    hd && hd.type, hd && hd.profile && ('Profil ' + hd.profile),
    hd && hd.authority, hd && hd.strategy
  ].filter(Boolean).map(esc).join(' · ');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Manuscrit Céleste — ${prenom}</title>
<style>
  :root { --deep:#05020F; --cream:#F5EDD8; --gold:#C9A84C; --gold-light:#E8CF88; --muted:#9080A8; --violet:#2D1870; }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--deep); color: var(--cream);
    font-family: Georgia, 'Times New Roman', serif; line-height: 1.65;
  }
  .wrap { max-width: 720px; margin: 0 auto; padding: 32px 22px 80px; }
  .cover {
    min-height: 85vh; display: flex; flex-direction: column; justify-content: center;
    text-align: center; page-break-after: always;
  }
  .star { color: var(--gold); font-size: 1.6rem; margin-bottom: 12px; }
  .cover h1 {
    font-family: 'Palatino Linotype', Palatino, Georgia, serif;
    font-weight: 400; letter-spacing: .08em; font-size: 2rem; margin: 0 0 8px;
  }
  .cover .for { font-style: italic; color: var(--gold-light); font-size: 1.25rem; margin: 18px 0; }
  .cover .meta { color: var(--muted); font-size: .95rem; }
  .cover .hd { margin-top: 28px; color: var(--gold-light); font-size: .9rem; letter-spacing: .04em; }
  .placements { list-style: none; padding: 0; margin: 24px 0; columns: 2; gap: 12px; font-size: .88rem; }
  .placements .k { color: var(--gold); text-transform: capitalize; margin-right: 6px; }
  .chapter { margin: 48px 0; }
  .roman { color: var(--gold); letter-spacing: .2em; font-size: .75rem; margin-bottom: 6px; }
  h2 { font-weight: 400; font-size: 1.55rem; margin: 0 0 8px; color: var(--gold-light); }
  .sub { font-style: italic; color: var(--muted); margin: 0 0 18px; }
  .body p { margin: 0 0 1em; }
  .insight, .mantra {
    border-left: 2px solid var(--gold); margin: 22px 0; padding: 10px 16px;
    color: var(--gold-light); font-style: italic; background: rgba(45,24,112,.28);
  }
  .affirmations { list-style: none; padding: 0; }
  .affirmations li { margin: 0 0 12px; padding-left: 0; }
  .affirmations .n { color: var(--gold); margin-right: 8px; }
  .rituel { margin: 28px 0; padding: 16px; border: 1px solid rgba(201,168,76,.25); border-radius: 12px; }
  .rituel h3 { margin: 0 0 6px; color: var(--gold-light); font-weight: 400; }
  .timing { color: var(--muted); font-style: italic; font-size: .92rem; }
  .essence { font-size: 1.15rem; font-style: italic; color: var(--gold-light); }
  .forces { padding-left: 1.2em; }
  .page-break { page-break-before: always; }
  @media print {
    body { background: #fff; color: #1a1028; }
    .insight, .mantra { background: #f7f0dc; }
    .cover { min-height: auto; }
  }
</style>
</head>
<body>
<main class="wrap">
  <header class="cover">
    <div class="star">✦</div>
    <h1>Manuscrit Céleste</h1>
    <p class="for">de ${prenom}</p>
    <p class="meta">${date}${heure ? ' · ' + heure : ''}${lieu ? '<br>' + lieu : ''}</p>
    <p class="hd">${hdLine}</p>
  </header>

  <section class="chapter">
    <div class="roman">PLACEMENTS</div>
    <h2>Ton ciel confirmé</h2>
    <ul class="placements">${placementsHtml}</ul>
  </section>

  <section class="chapter page-break">
    <div class="roman">OUVERTURE</div>
    <h2>Introduction</h2>
    <div class="body">${paras(manuscrit && manuscrit.intro)}</div>
  </section>

  ${sectionsHtml}

  <section class="chapter page-break">
    <div class="roman">AFFIRMATIONS</div>
    <h2>Tes 10 affirmations</h2>
    <ol class="affirmations">${affHtml}</ol>
  </section>

  <section class="chapter page-break">
    <div class="roman">RITUELS</div>
    <h2>Tes rituels</h2>
    ${ritHtml}
  </section>

  <section class="chapter page-break">
    <div class="roman">MESSAGE</div>
    <h2>Message de l’Univers</h2>
    <div class="body">${paras(manuscrit && manuscrit.conclusion)}</div>
  </section>

  ${synHtml}

  <footer style="margin-top:64px;text-align:center;color:var(--muted);font-size:.85rem;">
    ✦ Manuscrit Céleste · généré pour ${prenom} · ne pas partager les clés API
  </footer>
</main>
</body>
</html>`;
}

/** Compte approximatif de « pages » (mots / 280). */
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

module.exports = { buildNatalHtml, estimatePages, esc };
