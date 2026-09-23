/**
 * HTTP JSON helpers (Node 18+ fetch) — retries / timeouts pour APIs Render.
 */
function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const ctrl = new AbortController();
  const ms = timeoutMs || 12000;
  const timer = setTimeout(function () { ctrl.abort(); }, ms);
  try {
    const opts = Object.assign({}, options || {}, { signal: ctrl.signal });
    return await fetch(url, opts);
  } finally {
    clearTimeout(timer);
  }
}

async function requestJson(url, options) {
  const opts = options || {};
  const retries = opts.retries == null ? 2 : opts.retries;
  const timeoutMs = opts.timeout_ms || 12000;
  const retryDelayMs = opts.retry_delay_ms || 650;
  const shouldRetryStatus = function (st) {
    return st === 408 || st === 425 || st === 429 || st >= 500;
  };
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await fetchWithTimeout(url, opts.fetch_options || {}, timeoutMs);
      if (!resp.ok) {
        let txt = '';
        try { txt = await resp.text(); } catch (_) {}
        const err = new Error(
          (opts.label || 'Requête') + ' HTTP ' + resp.status + (txt ? (' — ' + txt.slice(0, 280)) : '')
        );
        err.status = resp.status;
        err.retryable = shouldRetryStatus(resp.status);
        throw err;
      }
      return await resp.json();
    } catch (e) {
      lastErr = e;
      const msg = String((e && e.message) || e);
      const retryable = !!(e && (
        e.name === 'AbortError' ||
        e.retryable ||
        /network|fetch|timeout|aborted|ECONNRESET|ETIMEDOUT/i.test(msg)
      ));
      if (attempt < retries && retryable) {
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }
      break;
    }
  }
  throw lastErr || new Error((opts.label || 'Requête') + ' impossible');
}

module.exports = { sleep, fetchWithTimeout, requestJson };
