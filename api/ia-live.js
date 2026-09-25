/**
 * Mode IA live — OpenAI Realtime (WebRTC + ephemeral client secret).
 * Le manuscrit Claude reste la source de vérité ; chaque tour consomme 1 iaUsed.
 */
const crypto = require('crypto');
const iaReply = require('./natal/ia-reply');
const language = require('./language');
const profile = require('./profile');
const { fetchWithTimeout } = require('./natal/http');

const REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime';
const SESSION_MAX_MS = 15 * 60 * 1000;
const EXCERPT_CHUNK = 6000;
const INSTRUCTIONS_EXCERPT_MAX = 11000;

/** Voix Realtime GA (pas fable / onyx / nova). */
const REALTIME_VOICES = [
  'alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse', 'marin', 'cedar'
];

/** TTS compte → Realtime le plus proche. */
const TTS_TO_REALTIME = {
  alloy: 'alloy',
  ash: 'ash',
  coral: 'coral',
  echo: 'echo',
  sage: 'sage',
  shimmer: 'shimmer',
  fable: 'verse',
  onyx: 'cedar',
  nova: 'marin'
};

const liveSessions = new Map();

function openaiKey() {
  return String(
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_KEY ||
    process.env.OPEN_AI_API_KEY ||
    ''
  ).trim();
}

function mapRealtimeVoice(ttsVoice) {
  const account = profile.normalizeTtsVoice(ttsVoice);
  const mapped = TTS_TO_REALTIME[account] || 'marin';
  const voice = REALTIME_VOICES.indexOf(mapped) >= 0 ? mapped : 'marin';
  const matched = REALTIME_VOICES.indexOf(account) >= 0 && account === voice;
  return {
    accountVoice: account,
    voice: voice,
    matched: matched,
    note: matched
      ? null
      : ('Voix compte « ' + account + ' » → Realtime « ' + voice + ' » (voix Realtime disponibles).')
  };
}

function pruneSessions() {
  const now = Date.now();
  liveSessions.forEach(function (s, id) {
    if (!s || now - (s.startedAt || 0) > SESSION_MAX_MS + 60000) liveSessions.delete(id);
  });
}

function newSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

function safetyIdFor(email) {
  return crypto.createHash('sha256').update(String(email || '')).digest('hex').slice(0, 64);
}

function contextLabel(ctx) {
  if (ctx === 'mois') return 'du mois';
  if (ctx === 'jour') return 'du jour';
  if (ctx === 'couple') return 'de couple';
  if (ctx === 'ultime') return 'Manuscrit Ultime';
  return 'de ta vie';
}

function buildInstructions(contact, context, selectedPassage) {
  const ctx = String(context || 'natal');
  const prenom = (contact && contact.prenom) || 'toi';
  const partnerName = (contact && contact.partnerPrenom) || '';
  const langCode = language.ofContact(contact);
  const langRule = language.promptInstruction(langCode, { couple: ctx === 'couple' });
  const label = contextLabel(ctx);
  const raw = iaReply.loadManuscriptContext(contact, ctx);
  const selected = String(selectedPassage || '').trim().slice(0, 4000);
  const manuscript = iaReply.smartContext(raw, selected, INSTRUCTIONS_EXCERPT_MAX);

  const rules =
    'Tu es Céleste, présence douce et claire. Tu guides ' + prenom +
    (ctx === 'couple' && partnerName ? (' et ' + partnerName) : '') +
    ' à travers CE manuscrit Céleste ' + label + '. ' +
    langRule + ' ' +
    'RÈGLES CRITIQUES — source de vérité : ' +
    '1) L’extrait de manuscrit fourni (et uniquement ce texte / les extraits obtenus via l’outil) est la SEULE source de vérité pour l’analyse astro / Human Design / Gene Keys. ' +
    '2) Explique, clarifie, soutiens émotionnellement — NE ré-analyse PAS le thème et NE contredis PAS le manuscrit. ' +
    '3) Si tu n’es pas sûre ou si ce n’est pas dans l’extrait, dis-le clairement, ou appelle l’outil get_manuscript_excerpt pour obtenir un autre passage — n’invente JAMAIS de placements, types, autorités ou détails de carte. ' +
    '4) Ne mentionne jamais Claude, OpenAI, Realtime, ni « intelligence artificielle ». ' +
    '5) Réponses orales : courtes (quelques phrases), chaleureuses, concrètes, ancrées dans le manuscrit.';

  const parts = [rules];
  if (manuscript) {
    parts.push('Extrait du manuscrit ' + label + ' (source de vérité) :\n"""\n' + manuscript + '\n"""');
  } else {
    parts.push(
      'Le manuscrit n’est pas encore disponible en entier. Dis-le avec douceur et invite à relire les pages déjà ouvertes, ' +
      'sans inventer de placements fictifs. Tu peux tenter get_manuscript_excerpt.'
    );
  }
  if (selected) {
    parts.push('Passage sélectionné par la lectrice :\n« ' + selected + ' »');
  }
  parts.push(
    'Outil get_manuscript_excerpt : si l’utilisateur parle d’un chapitre ou détail hors extrait, appelle-le avec query (mots-clés) et/ou offset (caractères).'
  );
  return parts.join('\n\n');
}

function getManuscriptExcerpt(contact, context, opts) {
  opts = opts || {};
  const raw = iaReply.loadManuscriptContext(contact, context) || '';
  if (!raw) {
    return { ok: false, text: '', total: 0, error: 'Manuscrit indisponible.' };
  }
  const query = String(opts.query || '').trim();
  let offset = Math.max(0, Math.floor(Number(opts.offset) || 0));
  const max = Math.min(EXCERPT_CHUNK, Math.max(800, Math.floor(Number(opts.maxChars) || EXCERPT_CHUNK)));

  if (query && query.length >= 3) {
    const needle = query.slice(0, 48);
    let i = raw.indexOf(needle);
    if (i < 0) {
      const soft = query.replace(/\s+/g, ' ').slice(0, 36);
      i = raw.replace(/\s+/g, ' ').indexOf(soft);
    }
    if (i >= 0) offset = Math.max(0, i - 400);
  }

  let chunk = raw.slice(offset, offset + max);
  if (offset > 0) chunk = '…' + chunk;
  if (offset + max < raw.length) chunk = chunk + '…';
  return {
    ok: true,
    text: chunk,
    offset: offset,
    total: raw.length,
    nextOffset: Math.min(raw.length, offset + max)
  };
}

function toolDefinitions() {
  return [
    {
      type: 'function',
      name: 'get_manuscript_excerpt',
      description:
        'Fetch another chunk of the open manuscript HTML/text when the current excerpt is insufficient. Do not invent chart details.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Optional keywords or phrase to locate in the manuscript.'
          },
          offset: {
            type: 'number',
            description: 'Character offset to continue reading from (0 = start).'
          },
          maxChars: {
            type: 'number',
            description: 'Max characters to return (default ~6000).'
          }
        },
        additionalProperties: false
      }
    }
  ];
}

function sessionConfig(contact, context, selectedPassage, voiceInfo) {
  const langCode = language.ofContact(contact);
  return {
    type: 'realtime',
    model: REALTIME_MODEL,
    instructions: buildInstructions(contact, context, selectedPassage),
    output_modalities: ['audio'],
    tools: toolDefinitions(),
    tool_choice: 'auto',
    audio: {
      input: {
        transcription: {
          model: 'whisper-1',
          language: langCode === 'zh' ? 'zh' : langCode
        },
        turn_detection: {
          type: 'semantic_vad',
          create_response: true,
          interrupt_response: true,
          eagerness: 'medium'
        }
      },
      output: {
        voice: voiceInfo.voice
      }
    }
  };
}

async function mintClientSecret(contact, context, selectedPassage) {
  const key = openaiKey();
  if (!key) {
    const err = new Error('no-openai-key');
    err.friendly = 'Mode IA live indisponible (clé OpenAI manquante côté serveur).';
    throw err;
  }
  const voiceInfo = mapRealtimeVoice(contact && contact.ttsVoice);
  const session = sessionConfig(contact, context, selectedPassage, voiceInfo);
  const safety = safetyIdFor(contact && contact.email);
  const resp = await fetchWithTimeout(
    'https://api.openai.com/v1/realtime/client_secrets',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json',
        'OpenAI-Safety-Identifier': safety
      },
      body: JSON.stringify({
        expires_after: { anchor: 'created_at', seconds: 600 },
        session: session
      })
    },
    30000
  );
  if (!resp.ok) {
    let txt = '';
    try { txt = await resp.text(); } catch (_) {}
    const err = new Error('client_secrets HTTP ' + resp.status + (txt ? (' ' + txt.slice(0, 240)) : ''));
    err.friendly = 'Impossible d’ouvrir la session vocale. Réessaie dans un instant.';
    err.status = resp.status;
    throw err;
  }
  const data = await resp.json();
  const value = data && (data.value || (data.client_secret && data.client_secret.value));
  if (!value) {
    const err = new Error('no-client-secret');
    err.friendly = 'Impossible d’ouvrir la session vocale. Réessaie dans un instant.';
    throw err;
  }
  return {
    clientSecret: value,
    expiresAt: data.expires_at || (data.client_secret && data.client_secret.expires_at) || null,
    voiceInfo: voiceInfo,
    model: REALTIME_MODEL
  };
}

function registerSession(email, context, meta) {
  pruneSessions();
  const id = newSessionId();
  liveSessions.set(id, {
    email: String(email || '').toLowerCase(),
    context: String(context || 'natal'),
    startedAt: Date.now(),
    turns: 0,
    voice: meta && meta.voice
  });
  return id;
}

function getLiveSession(sessionId, email) {
  pruneSessions();
  const s = liveSessions.get(String(sessionId || ''));
  if (!s) return null;
  if (String(email || '').toLowerCase() !== s.email) return null;
  if (Date.now() - s.startedAt > SESSION_MAX_MS) {
    liveSessions.delete(String(sessionId));
    return { expired: true };
  }
  return s;
}

function bumpTurn(sessionId) {
  const s = liveSessions.get(String(sessionId || ''));
  if (!s) return 0;
  s.turns = (s.turns || 0) + 1;
  return s.turns;
}

function endSession(sessionId) {
  liveSessions.delete(String(sessionId || ''));
}

module.exports = {
  SESSION_MAX_MS,
  REALTIME_MODEL,
  REALTIME_VOICES,
  openaiKey,
  mapRealtimeVoice,
  buildInstructions,
  getManuscriptExcerpt,
  mintClientSecret,
  registerSession,
  getLiveSession,
  bumpTurn,
  endSession
};
