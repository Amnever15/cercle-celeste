/**
 * Human Design — API Render (même endpoint que GENERATIONS).
 * Auth via process.env.HD_API_TOKEN (jamais exposée au client APP).
 */
const { requestJson, sleep, fetchWithTimeout } = require('./http');

function cfg() {
  return {
    url: String(process.env.HD_API_URL || 'https://humandesign-api-jeqv.onrender.com').replace(/\/$/, ''),
    token: String(process.env.HD_API_TOKEN || '').trim(),
    path: String(process.env.HD_DATA_PATH || '/calculate'),
    authStyle: String(process.env.HD_AUTH_STYLE || 'bearer').toLowerCase(),
    timeoutMs: parseInt(process.env.HD_API_TIMEOUT_MS || '90000', 10) || 90000,
    retries: parseInt(process.env.HD_API_RETRIES || '4', 10) || 4
  };
}

function hdAuthHeaders() {
  const c = cfg();
  const h = { Accept: 'application/json' };
  if (!c.token) return h;
  if (c.authStyle === 'x-api-key') h['X-API-Key'] = c.token;
  else if (c.authStyle === 'bearer') h.Authorization = 'Bearer ' + c.token;
  return h;
}

function warmUpHDApi() {
  const c = cfg();
  fetchWithTimeout(c.url + '/health', { method: 'GET' }, 20000).catch(function () {});
}

function unwrapHDResponse(data) {
  if (!data) return data;
  if (data.Properties) return data;
  if (data.chart && (data.chart.Properties || data.chart.type || data.chart.Type || data.chart.general)) return data.chart;
  if (data.result && (data.result.Properties || data.result.type || data.result.Type || data.result.general)) return data.result;
  if (data.data && (data.data.Properties || data.data.type || data.data.Type || data.data.general)) return data.data;
  return data;
}

function parseHD(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      type: '', profile: '', authority: '', strategy: '', definition: '',
      cross: '', signature: '', notSelf: '', channels: [], gates: [], designDate: ''
    };
  }
  var P = Object.assign({}, raw, raw.general || {}, raw.Properties || raw.properties || {});

  function asStr(v) {
    if (v == null) return '';
    if (typeof v === 'string' || typeof v === 'number') return String(v);
    if (typeof v === 'object') {
      if (v.id != null) return String(v.id);
      if (v.name != null) return String(v.name);
      if (v.value != null) return String(v.value);
      if (v.label != null) return String(v.label);
    }
    return '';
  }
  function pick() {
    for (var i = 0; i < arguments.length; i++) {
      var path = String(arguments[i]).split('.');
      var v = P;
      for (var j = 0; j < path.length && v != null; j++) v = v[path[j]];
      var s = asStr(v);
      if (s) return s;
    }
    return '';
  }
  function pickList() {
    for (var i = 0; i < arguments.length; i++) {
      var path = String(arguments[i]).split('.');
      var v = P;
      for (var j = 0; j < path.length && v != null; j++) v = v[path[j]];
      if (Array.isArray(v)) {
        return v.map(function (it) {
          if (it == null) return '';
          if (typeof it === 'string' || typeof it === 'number') return String(it);
          return it.option || it.name || it.id || it.label || '';
        }).filter(Boolean);
      }
    }
    return [];
  }

  var rawChans = (raw.channels && (raw.channels.Channels || raw.channels.list)) || raw.channels || [];
  if (!Array.isArray(rawChans)) rawChans = [];
  var channels = rawChans.map(function (it) {
    if (it == null) return '';
    if (typeof it === 'string' || typeof it === 'number') return String(it);
    return String(it.option || it.name || it.id || it.label || it.channel || '');
  }).filter(Boolean);

  var gatesSet = {};
  function harvestPlanets(obj) {
    if (!obj || typeof obj !== 'object') return;
    var arr = obj.Planets || obj.planets || obj.list || obj;
    if (!Array.isArray(arr)) return;
    arr.forEach(function (p) {
      if (!p) return;
      var g = (typeof p === 'object') ? (p.Gate || p.gate || p.id) : p;
      if (g != null && g !== 0 && g !== '0') gatesSet[String(g)] = true;
    });
  }
  if (raw.gates && typeof raw.gates === 'object') {
    harvestPlanets(raw.gates.prs);
    harvestPlanets(raw.gates.des);
    if (!raw.gates.prs && !raw.gates.des) harvestPlanets(raw.gates);
  }
  var gates = Object.keys(gatesSet).sort(function (a, b) { return parseInt(a, 10) - parseInt(b, 10); });
  if (gates.length === 0) gates = pickList('Gates.list', 'gates', 'active_gates', 'activeGates');
  if (channels.length === 0) channels = pickList('Channels.list', 'channels', 'active_channels', 'activeChannels');

  return {
    type: pick('Type.id', 'Type.name', 'Type', 'type', 'energy_type', 'EnergyType', 'energyType', 'energytype'),
    strategy: pick('Strategy.id', 'Strategy.name', 'Strategy', 'strategy'),
    authority: pick('InnerAuthority.id', 'InnerAuthority.name', 'InnerAuthority', 'authority', 'inner_authority', 'innerAuthority', 'Authority', 'inner_auth'),
    definition: pick('Definition.id', 'Definition.name', 'Definition', 'definition'),
    profile: pick('Profile.id', 'Profile.name', 'Profile', 'profile'),
    cross: pick('IncarnationCross.id', 'IncarnationCross.name', 'IncarnationCross', 'incarnation_cross', 'incarnationCross', 'cross', 'incarnationcross'),
    signature: pick('Signature.id', 'Signature.name', 'Signature', 'signature'),
    notSelf: pick('NotSelfTheme.id', 'NotSelfTheme.name', 'NotSelfTheme', 'not_self', 'notSelf', 'not_self_theme', 'notselftheme'),
    channels: channels,
    gates: gates,
    designDate: pick('DesignDateUtc', 'design_date', 'designDate', 'design_date_utc', 'create_date')
  };
}

async function getHDData(dateStr, place, gender, lat, lon) {
  const c = cfg();
  if (!c.token) {
    throw new Error('HD_API_TOKEN manquant (variable d’environnement serveur).');
  }
  var path = c.path;
  if (path.charAt(0) !== '/') path = '/' + path;
  var m = String(dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) throw new Error('Date HD invalide : ' + dateStr + ' (attendu YYYY-MM-DD HH:MM)');

  var params = [
    'year=' + parseInt(m[1], 10),
    'month=' + parseInt(m[2], 10),
    'day=' + parseInt(m[3], 10),
    'hour=' + parseInt(m[4], 10),
    'minute=' + parseInt(m[5], 10),
    'second=' + (m[6] ? parseInt(m[6], 10) : 0),
    'place=' + encodeURIComponent(place || ''),
    'gender=' + encodeURIComponent(gender === 'femme' ? 'female' : 'male'),
    'islive=true'
  ];
  if (lat != null && lat !== '') params.push('latitude=' + lat);
  if (lon != null && lon !== '') params.push('longitude=' + lon);
  var sep = path.indexOf('?') >= 0 ? '&' : '?';
  var url = c.url + path + sep + params.join('&');

  var data = await requestJson(url, {
    label: 'Human Design API',
    retries: c.retries,
    timeout_ms: c.timeoutMs,
    retry_delay_ms: 2500,
    fetch_options: { method: 'GET', headers: hdAuthHeaders() }
  });
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch (_) {}
  }
  data = unwrapHDResponse(data);
  if (!data || typeof data !== 'object') {
    throw new Error('Réponse HD vide ou non-JSON.');
  }
  return data;
}

async function fetchHDWithRetry(dateStr, place, gender, lat, lon, onProgress) {
  warmUpHDApi();
  var raw = null;
  var attempt = 0;
  while (!raw) {
    attempt++;
    try {
      if (onProgress) onProgress(attempt === 1 ? 'Calcul Human Design…' : 'Human Design — tentative ' + attempt + '…');
      if (attempt > 1) {
        warmUpHDApi();
        await sleep(4000);
      }
      raw = await getHDData(dateStr, place, gender, lat, lon);
    } catch (e) {
      if (attempt >= 8) throw e;
    }
  }
  return parseHD(raw);
}

module.exports = { parseHD, unwrapHDResponse, getHDData, fetchHDWithRetry, warmUpHDApi, cfg };
