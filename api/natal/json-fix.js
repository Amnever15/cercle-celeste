/** Réparation JSON Claude (port GENERATIONS/manuscrit-celeste-generation.html). */

function extractJson(str) {
  if (!str) return str;
  var s = String(str); var i = 0; var n = s.length;
  while (i < n && /\s/.test(s.charAt(i))) i++;
  var open = s.charAt(i);
  if (open !== '{' && open !== '[') {
    var m = s.search(/[\[{]/);
    if (m < 0) return s;
    i = m;
    open = s.charAt(i);
  }
  var close = open === '{' ? '}' : ']';
  var depth = 0; var inStr = false; var esc = false; var start = i;
  for (; i < n; i++) {
    var c = s.charAt(i);
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return s.substring(start, i + 1);
    }
  }
  return s.substring(start);
}

function fixJsonInvalidEscapes(str) {
  var out = ''; var inStr = false; var esc = false;
  for (var i = 0; i < str.length; i++) {
    var c = str.charAt(i);
    if (!inStr) {
      out += c;
      if (c === '"') inStr = true;
      continue;
    }
    if (esc) {
      if (c === 'u') {
        var hex = ''; var j = i + 1;
        while (j < str.length && hex.length < 4 && /[0-9a-fA-F]/.test(str.charAt(j))) {
          hex += str.charAt(j); j++;
        }
        if (hex.length === 4) {
          out += '\\u' + hex;
          i = j - 1;
        } else {
          out += 'u' + hex;
        }
      } else if ('"\\/bfnrt'.indexOf(c) >= 0) {
        out += '\\' + c;
      } else if (c === "'") {
        out += "'";
      } else {
        out += c;
      }
      esc = false;
      continue;
    }
    if (c === '\\') { esc = true; continue; }
    if (c === '"') { out += c; inStr = false; continue; }
    out += c;
  }
  return out;
}

function fixJson(str) {
  str = String(str || '')
    .replace(/[\u201C\u201D\u05F4\u00AB\u00BB\u2033\u2036]/g, "'")
    .replace(/[\u2018\u2019\u02BC\u05F3]/g, "'")
    .replace(/&deg;/g, 'deg')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(parseInt(n, 10)); });
  var out = ''; var inStr = false; var esc = false;
  for (var i = 0; i < str.length; i++) {
    var c = str[i]; var code = str.charCodeAt(i);
    if (esc) { out += c; esc = false; continue; }
    if (c === '\\') { out += c; esc = true; continue; }
    if (c === '"') { out += c; inStr = !inStr; continue; }
    if (inStr) {
      if (c === '\n') out += '\\n';
      else if (c === '\r') out += '\\r';
      else if (c === '\t') out += '\\t';
      else if (code === 0x2028) out += '\\u2028';
      else if (code === 0x2029) out += '\\u2029';
      else if (code < 0x20) out += '\\u' + code.toString(16).padStart(4, '0');
      else out += c;
    } else {
      out += c;
    }
  }
  out = fixJsonInvalidEscapes(out);
  var out2 = ''; var inStr2 = false; var esc2 = false;
  for (var j = 0; j < out.length; j++) {
    var cj = out[j];
    if (esc2) { out2 += cj; esc2 = false; continue; }
    if (cj === '\\') { out2 += cj; esc2 = true; continue; }
    if (cj === '"') { out2 += cj; inStr2 = !inStr2; continue; }
    if (!inStr2 && cj === ',') {
      var k = j + 1;
      while (k < out.length && /\s/.test(out[k])) k++;
      if (out[k] === '}' || out[k] === ']') continue;
    }
    out2 += cj;
  }
  return out2;
}

function parseClaudeJsonRaw(raw, label) {
  var extracted = extractJson(raw);
  var strategies = [
    function (s) { return fixJson(s); },
    function (s) { return fixJson(fixJsonInvalidEscapes(s)); }
  ];
  var lastErr = null; var lastPos = 0;
  for (var si = 0; si < strategies.length; si++) {
    try {
      return JSON.parse(strategies[si](extracted));
    } catch (e) {
      lastErr = e;
      lastPos = parseInt((String(e.message).match(/\d+/) || [0])[0], 10) || 0;
    }
  }
  throw new Error(
    'JSON invalide [' + (label || '?') + '] pos ' + lastPos + ' / ' + String(raw || '').length + ' chars'
    + (lastErr ? (' — ' + lastErr.message) : '')
  );
}

module.exports = { extractJson, fixJson, fixJsonInvalidEscapes, parseClaudeJsonRaw };
