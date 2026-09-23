/**
 * Bundle téléchargeable des manuscrits HTML disponibles (Divin, après N mois).
 */
const fs = require('fs');
const path = require('path');
const natalGen = require('./natal-generate');
const periodGen = require('./period-generate');
const coupleGen = require('./couple-generate');
const { buildZip } = require('./zip-store');

function readIfExists(filePath) {
  try {
    if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return fs.readFileSync(filePath);
    }
  } catch (e) {}
  return null;
}

function collectManuscriptFiles(contact) {
  var files = [];
  if (!contact) return files;

  var natal = natalGen.resolveNatalFile(contact, 'html') || natalGen.resolveNatalFile(contact);
  if (natal && natal.path && /\.html?/i.test(natal.path)) {
    var natalBuf = readIfExists(natal.path);
    if (natalBuf) files.push({ name: 'manuscrit-natal.html', data: natalBuf });
  }

  var mois = periodGen.resolvePeriodFile(contact, 'mois');
  if (mois && mois.path) {
    var moisBuf = readIfExists(mois.path);
    if (moisBuf) files.push({ name: 'manuscrit-mois.html', data: moisBuf });
  }

  var jour = periodGen.resolvePeriodFile(contact, 'jour');
  if (jour && jour.path) {
    var jourBuf = readIfExists(jour.path);
    if (jourBuf) files.push({ name: 'manuscrit-jour.html', data: jourBuf });
  }

  var couple = coupleGen.resolveCoupleFile
    ? coupleGen.resolveCoupleFile(contact)
    : null;
  if (!couple && contact.coupleHtmlPath) {
    couple = { path: contact.coupleHtmlPath };
  }
  if (couple && couple.path) {
    var coupleBuf = readIfExists(couple.path);
    if (coupleBuf) files.push({ name: 'manuscrit-couple.html', data: coupleBuf });
  }

  if (contact.ultimeHtmlPath || contact.ultimePdfPath) {
    var uPath = contact.ultimeHtmlPath || contact.ultimePdfPath;
    var uBuf = readIfExists(uPath);
    if (uBuf) {
      var ext = path.extname(uPath) || '.html';
      files.push({ name: 'manuscrit-ultime' + ext, data: uBuf });
    }
  }

  return files;
}

function buildDownloadZip(contact) {
  var files = collectManuscriptFiles(contact);
  if (!files.length) {
    return { ok: false, error: 'Aucun manuscrit prêt à télécharger pour le moment.' };
  }
  var zip = buildZip(files);
  var stamp = new Date().toISOString().slice(0, 10);
  return {
    ok: true,
    buffer: zip,
    filename: 'manuscrits-celestes-' + stamp + '.zip',
    count: files.length
  };
}

module.exports = {
  collectManuscriptFiles,
  buildDownloadZip
};
