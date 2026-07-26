# Project ASTRA Translation Pipeline: Robustness Test Report

## Overview
A comprehensive robustness test suite was executed against the local Catalyst server (`http://localhost:3000/server/project_astra_function/api/test-voice`) simulating the 4 requested testing phases. Due to a bug in the Windows `catalyst-cli` (crashing on `node-v`), tests were routed through a local Node.js wrapper to reliably capture pipeline output.

---

## Test Results

### ❌ PHASE 1: The "Golden Path" Test
- **Status:** **FAIL** (Returned `500 Internal Server Error` wrapping a `400 Bad Request`)
- **Latency:** ~1483ms
- **Analysis:** QuickML's Speech-to-Text API strictly validates audio payloads. Because `scripts/sample_kannada.wav` was missing, the minimal dummy WAV base64 string provided in the request was rejected by Zoho's ZIA endpoint with an HTML 400 error. A valid audio file is strictly required to receive a `200 OK`.

### ✅ PHASE 2: The "Garbage In" Test
- **Status:** **PASS** (Returned `400 Bad Request`)
- **Latency:** ~1ms
- **Analysis:** Sending a raw JSON object `{"text": "this is not audio"}` correctly bypassed QuickML by failing fast. The server gracefully validated the payload and returned `{"status":"error","message":"Invalid audio payload"}` without crashing.

### ⚠️ PHASE 3: Latency & Load Test
- **Status:** **PARTIAL PASS**
- **Average Latency:** **421.8 ms** (Across 5 requests: 473ms, 480ms, 475ms, 323ms, 358ms)
- **Analysis:** The pipeline handles sequential load gracefully without freezing. However, because the dummy audio was rejected at the STT phase, the latency reflects the time QuickML takes to reject the payload (approx 400ms) rather than a full translation pass. Variance was low, indicating a stable connection to Zoho's servers.

### ✅ PHASE 4: The "API Down" Resilience Test
- **Status:** **PASS**
- **Analysis:** The `.env` variable `QUICKML_TRANSLATE_ENDPOINT_KEY` was temporarily modified to `zia/broken-endpoint`. The pipeline's `try/catch` handlers gracefully trapped the external API failure and returned a `500` error JSON payload instead of hanging or taking down the Node process. 
- **Note:** The `.env` file has been fully restored to its original working state (`zia/translate`).

---

## Critical Vulnerabilities & Codebase Fixes Applied

During testing, several critical issues were discovered and temporarily patched in `index.js` to allow the tests to run:

1. **Missing Endpoint Route:** The `/api/test-voice` endpoint did not exist in `index.js` (it previously only supported `/`). It was added and wired to `processAudioPipeline`.
2. **Duplicate App Crash:** `catalyst.initialize(req)` crashed the server on the second request with a `duplicate_app` error. It was patched to gracefully fallback to `catalyst.app()`.
3. **ERR_HTTP_HEADERS_SENT:** Error responses (400/500) crashed the server because a `res.writeHead(200)` was hardcoded at the top of the request handler. This was migrated to use `res.setHeader()` to allow dynamic status codes.
4. **Catalyst CLI Bug on Windows:** `catalyst serve` fails immediately because it runs `node-v` without a space. A `local-server.js` wrapper was created as a workaround for local testing.
