// One place that talks to Gemini. It retries when Google is busy (status 503, 429, 500...).
// Settings (all optional, in the .env file):
//   GEMINI_API_KEY        the key
//   GEMINI_MODEL          the model name (default gemini-flash-lite-latest)
//   GEMINI_TIMEOUT_MS     how long to wait for ONE try (default 30000)
//   GEMINI_RETRIES        how many extra tries after a failure (default 2)
//   GEMINI_RETRY_DELAY_MS the first waiting time between tries (default 1000, then 2000)

const BASE_URL = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com';
const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
const TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 30000;
const RETRIES = process.env.GEMINI_RETRIES === undefined ? 2 : Number(process.env.GEMINI_RETRIES);
const RETRY_DELAY_MS = Number(process.env.GEMINI_RETRY_DELAY_MS) || 1000;

// Only these statuses are temporary problems. 400, 403 and 404 (wrong key or model) are not retried.
const RETRY_STATUSES = [429, 500, 502, 503, 504];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function hasKey() {
  return Boolean(process.env.GEMINI_API_KEY);
}

// Sends the prompt and returns the text of the answer (it throws an Error if it fails)
async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  let lastError;

  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(BASE_URL + '/v1beta/models/' + MODEL + ':generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
        }),
        signal: controller.signal,
      });

      if (response.ok) {
        const data = await response.json();
        const parts = data.candidates && data.candidates[0] && data.candidates[0].content
          ? data.candidates[0].content.parts
          : null;
        const output = parts ? parts.map((p) => p.text || '').join('') : '';
        if (!output) throw new Error('Gemini returned no text');
        return output;
      }

      const error = new Error('Gemini returned status ' + response.status);
      error.status = response.status;
      if (!RETRY_STATUSES.includes(response.status)) throw error; // not temporary: stop now
      lastError = error;
    } catch (err) {
      // A permanent error (wrong key or model) is not retried. A timeout or a busy server is.
      if (err.status && !RETRY_STATUSES.includes(err.status)) throw err;
      if (err.message === 'Gemini returned no text') throw err;
      lastError = err.name === 'AbortError' ? new Error('Gemini did not answer in time') : err;
    } finally {
      clearTimeout(timer);
    }

    if (attempt < RETRIES) {
      const wait = RETRY_DELAY_MS * (attempt + 1);
      console.log('Gemini is busy (' + lastError.message + '). Trying again in ' + wait / 1000 + ' s...');
      await sleep(wait);
    }
  }

  throw lastError;
}

module.exports = { callGemini, hasKey };