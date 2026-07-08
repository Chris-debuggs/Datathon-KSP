'use strict';

const { performance } = require('perf_hooks');

// ---------------------------------------------------------------------------
// QuickML Endpoint Keys (obtained dynamically from process.env)
// ---------------------------------------------------------------------------
const STT_ENDPOINT_KEY = process.env.QUICKML_STT_ENDPOINT_KEY;
const TRANSLATE_ENDPOINT_KEY = process.env.QUICKML_TRANSLATE_ENDPOINT_KEY;
const TTS_ENDPOINT_KEY = process.env.QUICKML_TTS_ENDPOINT_KEY;

/**
 * Processes a Kannada audio buffer through a 5-stage multilingual pipeline.
 * Currently, the pipeline topology is: Kannada -> English -> English:
 *   1. Speech-to-Text (Kannada audio -> Kannada text)
 *   2. Start latency timer
 *   3. Translation (Kannada text -> English text)
 *   4. End latency timer & log
 *   5. Text-to-Speech (English text -> English audio)
 *
 * @param {import('zcatalyst-sdk-node').CatalystApp} catalystApp - Initialized Catalyst app instance.
 * @param {Buffer} audioBuffer - Raw audio bytes of the Kannada speech input.
 * @returns {Promise<{ englishAudioBuffer: Buffer, englishText: string, latencyMs: number }>}
 */
async function processAudioPipeline(catalystApp, audioBuffer) {
  const connectionName = process.env.QUICKML_CONNECTION_NAME;
  if (!connectionName) {
    throw new Error('QUICKML_CONNECTION_NAME environment variable is not defined.');
  }

  // ── Authenticate the QuickML OAuth connection ──────────────────────────
  await catalystApp
    .connections()
    .getConnectionCredentials(connectionName);

  const quickMl = catalystApp.quickML();

  // ── Step 1 — Speech-to-Text (Kannada) ─────────────────────────────────
  const sttResponse = await quickMl.predict(STT_ENDPOINT_KEY, {
    audio: audioBuffer.toString('base64'),
    source_language: 'kn',
  });

  const kannadaText =
    Array.isArray(sttResponse.result) && sttResponse.result.length > 0
      ? sttResponse.result[0]
      : sttResponse.result;

  console.log('[Pipeline] STT complete — Kannada text length:', String(kannadaText).length);

  // ── Step 2 — Start latency timer ──────────────────────────────────────
  const translateStart = performance.now();

  // ── Step 3 — Translation (Kannada → English) ──────────────────────────
  const translateResponse = await quickMl.predict(TRANSLATE_ENDPOINT_KEY, {
    text: String(kannadaText),
    source_language: 'kn',
    target_language: 'en',
  });

  // ── Step 4 — End latency timer & log ──────────────────────────────────
  const translateEnd = performance.now();
  const latencyMs = Math.round((translateEnd - translateStart) * 100) / 100;

  console.log(`[Pipeline] Translation latency: ${latencyMs}ms`);

  const englishText =
    Array.isArray(translateResponse.result) &&
      translateResponse.result.length > 0
      ? translateResponse.result[0]
      : translateResponse.result;

  console.log('[Pipeline] Translation complete — English text length:', String(englishText).length);

  // ── Step 5 — Text-to-Speech (English) ─────────────────────────────────
  const ttsResponse = await quickMl.predict(TTS_ENDPOINT_KEY, {
    text: String(englishText),
    target_language: 'en',
  });

  const englishAudioBase64 =
    Array.isArray(ttsResponse.result) && ttsResponse.result.length > 0
      ? ttsResponse.result[0]
      : ttsResponse.result;

  const englishAudioBuffer = Buffer.from(String(englishAudioBase64), 'base64');

  console.log(
    `[Pipeline] TTS complete — audio buffer size: ${englishAudioBuffer.length} bytes`
  );

  // ── Return aggregated results ─────────────────────────────────────────
  return {
    englishAudioBuffer,
    englishText: String(englishText),
    latencyMs,
  };
}

module.exports = { processAudioPipeline };
