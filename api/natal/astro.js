/**
 * Astrologie — appelle TON serveur Astro (Render / custom).
 * Même contrat que GENERATIONS : POST {ASTRO_API_URL}/api/v5/context/birth-chart
 * Pas d’auth Bearer côté Astro dans le code actuel (serveur ouvert).
 */
const { requestJson, sleep, fetchWithTimeout } = require('./http');

const SIGN_ABBR_FR = {
  Ari: 'Bélier', Tau: 'Taureau', Gem: 'Gémeaux', Can: 'Cancer',
  Leo: 'Lion', Vir: 'Vierge', Lib: 'Balance', Sco: 'Scorpion',
  Sag: 'Sagittaire', Cap: 'Capricorne', Aqu: 'Verseau', Pis: 'Poissons'
};
const HOUSE_FR = {
  First_House: 'Maison I', Second_House: 'Maison II', Third_House: 'Maison III',
  Fourth_House: 'Maison IV', Fifth_House: 'Maison V', Sixth_House: 'Maison VI',
  Seventh_House: 'Maison VII', Eighth_House: 'Maison VIII', Ninth_House: 'Maison IX',
  Tenth_House: 'Maison X', Eleventh_House: 'Maison XI', Twelfth_House: 'Maison XII'
};

function cfg() {
  return {
    url: String(process.env.ASTRO_API_URL || 'https://astrologer-api-dtag.onrender.com').replace(/\/$/, ''),
    timeoutMs: parseInt(process.env.ASTRO_API_TIMEOUT_MS || '90000', 10) || 90000,
    retries: parseInt(process.env.ASTRO_API_RETRIES || '4', 10) || 4
  };
}

function warmUpAstroApi() {
  const c = cfg();
  fetchWithTimeout(c.url + '/', { method: 'GET' }, 20000).catch(function () {});
}

function parseAstroAPI(data) {
  var s = data.chart_data.subject;
  var ed = data.chart_data.element_distribution || {};
  var qd = data.chart_data.quality_distribution || {};
  var lp = s.lunar_phase || {};
  function sf(a) { return SIGN_ABBR_FR[a] || a || '—'; }
  function hf(h) { return HOUSE_FR[h] || (h || '').replace(/_House$/, '').replace(/_/g, ' ') || '—'; }
  function deg(p) {
    if (!p || p.position == null) return '';
    var d = Math.floor(p.position);
    var m = Math.round((p.position - d) * 60);
    return ' ' + d + '\u00B0' + String(m).padStart(2, '0');
  }
  function pl(p) {
    if (!p) return '—';
    return sf(p.sign) + deg(p) + ' (' + hf(p.house) + (p.retrograde ? ' Rx' : '') + ')';
  }
  var aspects = (data.chart_data.aspects || [])
    .filter(function (a) { return a.orbit <= 3; })
    .map(function (a) { return a.p1_name + ' ' + a.aspect + ' ' + a.p2_name; })
    .join(', ');
  return {
    Sun: pl(s.sun), Moon: pl(s.moon), Mercury: pl(s.mercury), Venus: pl(s.venus),
    Mars: pl(s.mars), Jupiter: pl(s.jupiter), Saturn: pl(s.saturn),
    Uranus: pl(s.uranus), Neptune: pl(s.neptune), Pluto: pl(s.pluto),
    Ascendant: pl(s.ascendant),
    MC: pl(s.medium_coeli),
    NorthNode: s.true_north_lunar_node
      ? sf(s.true_north_lunar_node.sign) + deg(s.true_north_lunar_node) + ' (' + hf(s.true_north_lunar_node.house) + ')'
      : '—',
    Chiron: s.chiron ? sf(s.chiron.sign) + deg(s.chiron) + ' (' + hf(s.chiron.house) + ')' : '—',
    Lilith: s.mean_lilith ? sf(s.mean_lilith.sign) + deg(s.mean_lilith) + ' (' + hf(s.mean_lilith.house) + ')' : '—',
    PhaseLunaire: lp.moon_phase_name || '—',
    Elements: 'Feu ' + (ed.fire_percentage || 0) + '%, Terre ' + (ed.earth_percentage || 0) + '%, Air ' + (ed.air_percentage || 0) + '%, Eau ' + (ed.water_percentage || 0) + '%',
    Qualites: 'Cardinal ' + (qd.cardinal_percentage || 0) + '%, Fixe ' + (qd.fixed_percentage || 0) + '%, Mutable ' + (qd.mutable_percentage || 0) + '%',
    AspectsClés: aspects || '—',
    _lons: {
      Sun: (s.sun && s.sun.abs_pos) || 0,
      Moon: (s.moon && s.moon.abs_pos) || 0,
      Mercury: (s.mercury && s.mercury.abs_pos) || 0,
      Venus: (s.venus && s.venus.abs_pos) || 0,
      Mars: (s.mars && s.mars.abs_pos) || 0,
      Jupiter: (s.jupiter && s.jupiter.abs_pos) || 0,
      Saturn: (s.saturn && s.saturn.abs_pos) || 0,
      Uranus: (s.uranus && s.uranus.abs_pos) || 0,
      Neptune: (s.neptune && s.neptune.abs_pos) || 0,
      Pluto: (s.pluto && s.pluto.abs_pos) || 0,
      NorthNode: (s.true_north_lunar_node && s.true_north_lunar_node.abs_pos) || 0,
      Chiron: (s.chiron && s.chiron.abs_pos) || 0,
      Lilith: (s.mean_lilith && s.mean_lilith.abs_pos) || 0,
      MC: (s.medium_coeli && s.medium_coeli.abs_pos) || 0,
      Ascendant: (s.ascendant && s.ascendant.abs_pos) || 0
    }
  };
}

function normalizeLon180(v) {
  var x = ((v + 540) % 360) - 180;
  return x === -180 ? 180 : x;
}
function angularDistanceDeg(a, b) {
  return Math.abs(normalizeLon180(a - b));
}
function gmstDegFromDate(date) {
  var JD = date.getTime() / 86400000 + 2440587.5;
  var T = (JD - 2451545.0) / 36525.0;
  var g = 280.46061837 + 360.98564736629 * (JD - 2451545.0) + 0.000387933 * T * T - (T * T * T) / 38710000;
  return ((g % 360) + 360) % 360;
}
function formatLonLabel(lon) {
  var abs = Math.abs(lon); var d = Math.floor(abs); var m = Math.round((abs - d) * 60);
  if (m >= 60) { d += 1; m = 0; }
  return d + '\u00B0' + String(m).padStart(2, '0') + (lon >= 0 ? 'E' : 'W');
}

function tzOffsetStr(timezone, dateStr) {
  try {
    var year = parseInt((dateStr || '').split('-')[0], 10) || 9999;
    var histStd = {
      'Europe/Paris': 1976, 'Europe/Brussels': 1977, 'Europe/Luxembourg': 1977,
      'Europe/Amsterdam': 1977, 'Europe/Monaco': 1976, 'Europe/Andorra': 1985
    };
    if (histStd[timezone] && year < histStd[timezone]) return '+01:00';
    var d = new Date(String(dateStr).replace(' ', 'T'));
    var fmt = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'shortOffset' });
    var parts = fmt.formatToParts(d);
    var tz = parts.find(function (p) { return p.type === 'timeZoneName'; });
    if (!tz) return '+00:00';
    var m = tz.value.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
    if (!m) return '+00:00';
    var h = parseInt(m[1], 10); var mn = m[2] ? parseInt(m[2], 10) : 0;
    return (h >= 0 ? '+' : '-') + String(Math.abs(h)).padStart(2, '0') + ':' + String(mn).padStart(2, '0');
  } catch (e) {
    return '+00:00';
  }
}

function buildAstrocartographyData(astro, dateStr, timezone, birthLat, birthLon) {
  try {
    if (!astro || !astro._lons) return null;
    var offset = tzOffsetStr(timezone, dateStr);
    var date = new Date(String(dateStr).replace(' ', 'T') + ':00' + offset);
    if (isNaN(date.getTime())) return null;
    var gmst = gmstDegFromDate(date);
    var eps = 23.43929111 * Math.PI / 180;
    var keys = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'NorthNode'];
    var lines = [];
    keys.forEach(function (k) {
      var ecl = astro._lons[k];
      if (ecl == null) return;
      var lr = (((ecl % 360) + 360) % 360) * Math.PI / 180;
      var ra = Math.atan2(Math.sin(lr) * Math.cos(eps), Math.cos(lr)) * 180 / Math.PI;
      if (ra < 0) ra += 360;
      var lonMC = normalizeLon180(ra - gmst);
      var lonIC = normalizeLon180(lonMC + 180);
      lines.push({
        planet: k, line: 'MC', longitude: lonMC, longitude_label: formatLonLabel(lonMC),
        distance_to_birth_longitude_deg: isNaN(parseFloat(birthLon))
          ? null
          : parseFloat(angularDistanceDeg(lonMC, parseFloat(birthLon)).toFixed(2))
      });
      lines.push({
        planet: k, line: 'IC', longitude: lonIC, longitude_label: formatLonLabel(lonIC),
        distance_to_birth_longitude_deg: isNaN(parseFloat(birthLon))
          ? null
          : parseFloat(angularDistanceDeg(lonIC, parseFloat(birthLon)).toFixed(2))
      });
    });
    var completeRatio = lines.length / (keys.length * 2);
    var mode = completeRatio > 0.85 ? 'premium' : (completeRatio > 0.45 ? 'standard' : 'lite');
    var sorted = lines.slice().sort(function (a, b) {
      var da = a.distance_to_birth_longitude_deg == null ? 999 : a.distance_to_birth_longitude_deg;
      var db = b.distance_to_birth_longitude_deg == null ? 999 : b.distance_to_birth_longitude_deg;
      return da - db;
    });
    var highlights = sorted.slice(0, 6).map(function (l) {
      return l.planet + ' ' + l.line + ' @ ' + l.longitude_label;
    }).join(' · ');
    return {
      lines: lines,
      highlights: highlights || '—',
      quality: {
        ratio: parseFloat(completeRatio.toFixed(2)),
        level: mode === 'premium' ? 'high' : (mode === 'standard' ? 'medium' : 'low'),
        mode: mode
      }
    };
  } catch (e) {
    return null;
  }
}

async function getAstroAPI(dateStr, lat, lon, timezone, cityName) {
  const c = cfg();
  var parts = String(dateStr).split(' ');
  var dp = parts[0].split('-');
  var tp = parts[1] ? parts[1].split(':') : ['12', '00'];
  var body = {
    active_points: [
      'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
      'Uranus', 'Neptune', 'Pluto', 'True_North_Lunar_Node',
      'Chiron', 'Mean_Lilith', 'Ascendant', 'Medium_Coeli'
    ],
    active_aspects: [
      { name: 'conjunction', orb: 10 }, { name: 'opposition', orb: 10 },
      { name: 'trine', orb: 8 }, { name: 'sextile', orb: 6 }, { name: 'square', orb: 5 }
    ],
    distribution_method: 'weighted',
    subject: {
      year: parseInt(dp[0], 10), month: parseInt(dp[1], 10), day: parseInt(dp[2], 10),
      hour: parseInt(tp[0], 10), minute: parseInt(tp[1], 10), second: 0,
      longitude: parseFloat(lon) || 2.35,
      latitude: parseFloat(lat) || 48.85,
      altitude: 35,
      city: String(cityName || 'Paris').split(',')[0].trim(),
      nation: 'FR',
      timezone: timezone || 'Europe/Paris',
      is_dst: false,
      name: 'Client',
      zodiac_type: 'Tropical',
      houses_system_identifier: 'P'
    }
  };
  return requestJson(c.url + '/api/v5/context/birth-chart', {
    label: 'Astro API',
    retries: c.retries,
    timeout_ms: c.timeoutMs,
    retry_delay_ms: 2500,
    fetch_options: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  });
}

async function fetchAstroWithRetry(dateStr, lat, lon, timezone, cityName, onProgress) {
  warmUpAstroApi();
  var astro = null;
  var attempt = 0;
  while (!astro) {
    attempt++;
    try {
      if (onProgress) onProgress(attempt === 1 ? 'Positions astrales…' : 'Astro — tentative ' + attempt + '…');
      if (attempt > 1) {
        warmUpAstroApi();
        await sleep(4000);
      }
      var raw = await getAstroAPI(dateStr, lat, lon, timezone, cityName);
      astro = parseAstroAPI(raw);
    } catch (e) {
      if (attempt >= 8) throw e;
    }
  }
  astro.AstroCarto = buildAstrocartographyData(astro, dateStr, timezone, lat, lon);
  return astro;
}

async function resolveTimezone(lat, lon, place) {
  if (lat != null && lon != null && lat !== '') {
    try {
      var tzData = await requestJson(
        'https://timeapi.io/api/timezone/coordinate?latitude=' + lat + '&longitude=' + lon,
        { label: 'Timezone', retries: 2, timeout_ms: 8000 }
      );
      if (tzData && tzData.timeZone) {
        return { timezone: tzData.timeZone, lat: lat, lon: lon };
      }
    } catch (_) {}
  }
  if (place) {
    try {
      var pData = await requestJson(
        'https://photon.komoot.io/api/?q=' + encodeURIComponent(place) + '&limit=1&lang=fr',
        { label: 'Recherche ville', retries: 1, timeout_ms: 9000 }
      );
      if (pData.features && pData.features.length > 0) {
        var coords = pData.features[0].geometry.coordinates;
        var la = coords[1]; var lo = coords[0];
        var tzD = await requestJson(
          'https://timeapi.io/api/timezone/coordinate?latitude=' + la + '&longitude=' + lo,
          { label: 'Timezone', retries: 2, timeout_ms: 8000 }
        );
        return {
          timezone: (tzD && tzD.timeZone) || 'Europe/Paris',
          lat: la,
          lon: lo
        };
      }
    } catch (_) {}
  }
  return { timezone: 'Europe/Paris', lat: lat, lon: lon };
}

module.exports = {
  parseAstroAPI,
  getAstroAPI,
  fetchAstroWithRetry,
  buildAstrocartographyData,
  resolveTimezone,
  warmUpAstroApi,
  cfg
};
