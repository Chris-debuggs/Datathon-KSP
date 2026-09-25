'use strict';

// ── Web API Polyfills — required by pdf-parse on Node.js < 20 in Catalyst Cloud ──
if (typeof global.DOMMatrix === 'undefined') {
	global.DOMMatrix = class DOMMatrix {};
}
if (typeof global.Path2D === 'undefined') {
	global.Path2D = class Path2D {};
}
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const multer = require('multer');
const pdfParse = require('pdf-parse');
const upload = multer({ storage: multer.memoryStorage() });

const catalyst = require('zcatalyst-sdk-node');
const { processAudioPipeline } = require('./services/translationPipeline');

// ── In-memory cache for demo: instant responses on repeated queries ──
const demoCache = new Map();

// Catalyst's API gateway drops requests at ~30s. The summary LLM call must finish
// within this many ms of the request arriving, else we return a grounded fallback.
const SUMMARY_DEADLINE_MS = 24000;

// ══════════════════════════════════════════════════════════════════════
// AUDIT FIX 4.1 & 4.2: Robust JSON extraction from LLM output
// Handles: <think> blocks, markdown fences, preamble text, bare JSON
// ══════════════════════════════════════════════════════════════════════
function extractJSON(rawText) {
	if (!rawText) return null;
	// 1. Strip <think>…</think> reasoning traces
	let cleaned = rawText.split('</think>').pop().trim();
	// 2. Extract JSON from markdown fences (```json ... ``` or ``` ... ```)
	const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/i);
	if (fenceMatch) cleaned = fenceMatch[1].trim();
	// 3. Find the first { and last } to isolate JSON object
	const firstBrace = cleaned.indexOf('{');
	const lastBrace = cleaned.lastIndexOf('}');
	if (firstBrace !== -1 && lastBrace > firstBrace) {
		cleaned = cleaned.substring(firstBrace, lastBrace + 1);
	}
	return JSON.parse(cleaned);
}

const KANNADA_RE = /[\u0C80-\u0CFF]/;

// Pull the English sentence out of the translation LLM's reply.
// Prefers the {"english": "..."} JSON we ask for; falls back to the last
// Kannada-free line, then to the whole reply with Kannada stripped.
function extractTranslation(modelText) {
	try {
		const parsed = extractJSON(modelText);
		if (parsed && typeof parsed.english === 'string' && parsed.english.trim()) {
			return parsed.english.trim();
		}
	} catch (e) { /* not JSON — fall through */ }

	const afterThink = modelText.split('</think>').pop().trim();
	const LABEL_RE = /^(translation|english|output|result)\s*:\s*$/i;
	const lines = afterThink.split('\n').map(l => l.trim()).filter(Boolean);
	for (let i = lines.length - 1; i >= 0; i--) {
		const line = lines[i];
		if (!KANNADA_RE.test(line) && !LABEL_RE.test(line) && line.length > 10) {
			return line
				.replace(/\*\*(.+?)\*\*/g, '$1')
				.replace(/\*(.+?)\*/g, '$1')
				.replace(/^["']|["']$/g, '')
				.trim();
		}
	}
	return afterThink.replace(/[\u0C80-\u0CFF]/g, '').replace(/\s{2,}/g, ' ').trim();
}


function rewriteLegalQuery(userQuery) {
	if (!userQuery) return "";
	let optimized = userQuery;

	optimized = optimized.replace(/electronic FIR/gi, "information relating to a cognizable offence given by electronic communication");
	optimized = optimized.replace(/First Information Report/gi, "information relating to the commission of a cognizable offence under Section 173");
	optimized = optimized.replace(/\bFIR\b/gi, "information relating to the commission of a cognizable offence under Section 173");
	optimized = optimized.replace(/\barrest\b/gi, "arrest of persons under Section 35");

	return optimized;
}

async function requestNewZohoToken() {
	const url = "https://accounts.zoho.in/oauth/v2/token";
	const params = new URLSearchParams();
	params.append('grant_type', 'refresh_token');
	params.append('client_id', process.env.ZOHO_CLIENT_ID);
	params.append('client_secret', process.env.ZOHO_CLIENT_SECRET);
	params.append('refresh_token', process.env.QUICKML_REFRESH_TOKEN);

	const response = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: params.toString(),
		// A hung refresh would otherwise pin refreshInFlight and stall every later 401 on this instance
		signal: AbortSignal.timeout(10000)
	});

	if (!response.ok) {
		throw new Error(`Failed to refresh token: ${await response.text()}`);
	}

	const data = await response.json();
	if (data.access_token) {
		process.env.QUICKML_OAUTH_TOKEN = data.access_token;
		return data.access_token;
	} else {
		throw new Error('Refresh response missing access_token');
	}
}

// Zoho allows only ~10 token refreshes per 10 minutes per refresh token. Planner + RAG
// hit 401 at the same moment on a cold start, so concurrent callers share one refresh.
let refreshInFlight = null;
function refreshZohoToken() {
	refreshInFlight ??= requestNewZohoToken().finally(() => { refreshInFlight = null; });
	return refreshInFlight;
}

function rejectOnAbort(signal) {
	return new Promise((_, reject) => {
		if (signal.aborted) return reject(signal.reason);
		signal.addEventListener('abort', () => reject(signal.reason), { once: true });
	});
}

async function fetchWithAuth(url, options = {}) {
	let response = await fetch(url, options);
	if (response.status === 401) {
		console.log("[AUTH] Token expired, refreshing...");
		// A deadline-bound caller (the summary node) stops waiting when its own signal fires;
		// the shared refresh keeps going for everyone else.
		const newToken = await (options.signal
			? Promise.race([refreshZohoToken(), rejectOnAbort(options.signal)])
			: refreshZohoToken());
		
		if (options.headers) {
			options.headers['Authorization'] = `Zoho-oauthtoken ${newToken}`;
		}
		
		response = await fetch(url, options);
	}
	return response;
}

/**
 * Catalyst Serverless Advanced I/O Function Handler
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
module.exports = async (req, res) => {
	let catalystApp;
	try {
		catalystApp = catalyst.initialize(req);
	} catch (e) {
		try {
			catalystApp = catalyst.app();
		} catch (err) {
			catalystApp = catalyst.initializeApp();
		}
	}
	const { method, url } = req;

	// Set default response headers, including basic CORS support
	res.setHeader('Content-Type', 'application/json');
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

	// Handle CORS pre-flight requests
	if (method === 'OPTIONS') {
		res.writeHead(200);
		res.end();
		return;
	}

	// Basic Routing structure
	if (url === '/' && method === 'GET') {
		res.end(JSON.stringify({
			status: 'success',
			message: 'Project ASTRA API Function is live',
			timestamp: new Date().toISOString()
		}));
	} else if (url === '/server/project_astra_function/api/test-voice' && method === 'POST') {
		try {
			let body = [];
			req.on('data', chunk => body.push(chunk));
			req.on('end', async () => {
				try {
					const buffer = Buffer.concat(body);
					// Quick validation of garbage in
					if (buffer.length === 0 || req.headers['content-type'] === 'application/json') {
						res.writeHead(400, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ status: 'error', message: 'Invalid audio payload' }));
						return;
					}

					const result = await processAudioPipeline(catalystApp, buffer);
					res.end(JSON.stringify({
						status: 'success',
						englishText: result.englishText,
						latencyMs: result.latencyMs
					}));
				} catch (err) {
					console.error(err);
					res.writeHead(500, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ status: 'error', message: err.message }));
				}
			});
		} catch (err) {
			console.error(err);
			res.writeHead(500, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ status: 'error', message: err.message }));
		}
	// ══════════════════════════════════════════════════════════════════════
	// AUDIT FIX 4.4: /api/proof route — LOCAL DEV ONLY
	// Contains hardcoded Windows paths that crash on Catalyst Linux.
	// Gated behind NODE_ENV check so it's dead code in production.
	// ══════════════════════════════════════════════════════════════════════
	} else if (url === '/server/project_astra_function/api/proof' && method === 'GET') {
		if (process.env.NODE_ENV === 'production') {
			res.writeHead(404, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ status: 'error', message: 'Proof route disabled in production' }));
			return;
		}
		res.end(JSON.stringify({ status: 'info', message: 'Proof route — local dev only. Skipped on Catalyst.' }));
	} else if (url.includes('/api/ask-legal') && method === 'POST') {
		try {
			let body = [];
			req.on('data', chunk => body.push(chunk));
			req.on('end', async () => {
				try {
					const buffer = Buffer.concat(body);
					let reqBody;
					try {
						reqBody = JSON.parse(buffer.toString());
					} catch (e) {
						res.writeHead(400, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ status: 'error', message: 'Invalid JSON payload' }));
						return;
					}

					const userQuestion = reqBody.question;
					if (!userQuestion) {
						res.writeHead(400, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ status: 'error', message: 'Missing question property in request' }));
						return;
					}

					const optimizedQuery = rewriteLegalQuery(userQuestion);

					const ragUrl = process.env.QUICKML_RAG_ENDPOINT;
					const payload = JSON.stringify({
						"query": optimizedQuery,
						"documents": [process.env.QUICKML_DOC_ID]
					});

					const ragResponse = await fetchWithAuth(ragUrl, {
						method: 'POST',
						headers: {
							"Content-Type": "application/json",
							"CATALYST-ORG": process.env.CATALYST_ORG_ID,
							"Authorization": `Zoho-oauthtoken ${process.env.QUICKML_OAUTH_TOKEN}`
						},
						body: payload
					});

					const ragText = await ragResponse.text();
					if (!ragResponse.ok) {
						throw new Error(`RAG API Failed: ${ragText}`);
					}

					const ragData = JSON.parse(ragText);
					const aiAnswer = ragData.response || "I cannot answer this based on the current legal documentation provided.";

					res.end(JSON.stringify({
						status: 'success',
						answer: aiAnswer
					}));
				} catch (err) {
					console.error("[DEBUG] Route crashed:", err.message);
					res.writeHead(500, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ error: "Our legal AI is currently overwhelmed, please try again in a moment." }));
				}
			});
		} catch (err) {
			console.error("[DEBUG] Route setup crashed:", err.message);
			res.writeHead(500, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ error: "Our legal AI is currently overwhelmed, please try again in a moment." }));
		}
	} else if (url.includes('/api/plan') && method === 'POST') {
		const requestStart = Date.now();
		try {
			const handlePlanLogic = async (err) => {
				if (err) {
					res.writeHead(400, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ status: 'error', message: 'Upload error: ' + err.message }));
					return;
				}
				try {
					let reqBody = req.body || {};
					if (!req.headers['content-type'] || !req.headers['content-type'].includes('multipart/form-data')) {
						const buffer = await new Promise((resolve, reject) => {
							let body = [];
							req.on('data', chunk => body.push(chunk));
							req.on('end', () => resolve(Buffer.concat(body)));
							req.on('error', reject);
						});
						try {
							reqBody = JSON.parse(buffer.toString());
						} catch (e) {
							res.writeHead(400, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ status: 'error', message: 'Invalid JSON payload' }));
							return;
						}
					}

					let finalQuery = reqBody.query || "";
					if (req.file) {
						const parser = new pdfParse.PDFParse({ data: req.file.buffer });
						const pdfData = await parser.getText();
						await parser.destroy();
						finalQuery += "\n\nAttached Document Content:\n" + pdfData.text;
					}

					const userQuery = finalQuery;
					if (!userQuery) {
						res.writeHead(400, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ status: 'error', message: 'Missing query property in request' }));
						return;
					}

					let historyContext = "";
					if (Array.isArray(reqBody.history) && reqBody.history.length > 0) {
						historyContext = "── Conversation History ──\n" + 
							reqBody.history.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join("\n") + "\n\n";
					}

					// ══════════════════════════════════════════════════════
					// CACHE CHECK — instant return on repeated demo queries
					// ══════════════════════════════════════════════════════
					if (demoCache.has(userQuery)) {
						console.log("[CACHE HIT] Returning cached result for:", userQuery.substring(0, 60));
						res.writeHead(200, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify(demoCache.get(userQuery)));
						return;
					}

					console.log("[CACHE MISS] Running full orchestration circuit...");
					const circuitStart = Date.now();

					// ══════════════════════════════════════════════════════
					// CONCURRENT PHASE: NODE 1 (Planner) + NODE 3 (RAG)
					// Fire both at the same time via Promise.all
					// ══════════════════════════════════════════════════════

					// ── NODE 1 Promise: Planner LLM ──
					const plannerPromise = (async () => {
						console.log("[PLANNER NODE] Sending to crm-di-glm47b_30b_it...");
						const glmUrl = `https://api.catalyst.zoho.in/quickml/v1/project/${process.env.QUICKML_PROJECT_ID}/glm/chat`;
						const payload = {
							model: "crm-di-glm47b_30b_it",
							messages: [
								{
									role: "system",
									content:
										"You are a law enforcement Planner Agent. " +
										"Your ONLY function is to output a single raw JSON object. " +
										"Do NOT think out loud. Do NOT number steps. Do NOT use bullets. " +
										"Output ONLY the JSON object and nothing else."
								},
								{
									role: "user",
									content:
										"Convert this query to a raw JSON object ONLY (no explanation, no markdown, no steps):\n\n" +
										historyContext +
										`Query: ${userQuery}\n\n` +
										"Required JSON schema — output this object and NOTHING else:\n" +
										"{\n" +
										"  \"intent\": \"search\",\n" +
										"  \"category\": \"<one of: cyber_fraud, financial_fraud, narcotics, theft, assault, robbery, unknown>\",\n" +
										"  \"keywords\": [\"extracted\", \"terms\"],\n" +
										"  \"entities\": {\n" +
										"    \"fir_no\": null,\n" +
										"    \"name\": null,\n" +
										"    \"phone\": null,\n" +
										"    \"upi_id\": null,\n" +
										"    \"vehicle\": null,\n" +
										"    \"bank_account\": null,\n" +
										"    \"aadhaar\": null,\n" +
										"    \"address\": null,\n" +
										"    \"crime_type\": \"<same value as category>\",\n" +
										"    \"police_station\": null,\n" +
										"    \"district\": null\n" +
										"  }\n" +
										"}\n\n" +
										"Your entire response = one JSON object. Start your response with { and end with }."
								}
							],
							max_tokens: 2048,
							temperature: 0.1,
							stream: false,
							chat_template_kwargs: { enable_thinking: false }
						};

						const glmResponse = await fetchWithAuth(glmUrl, {
							method: 'POST',
							headers: {
								"Content-Type": "application/json",
								"CATALYST-ORG": process.env.CATALYST_ORG_ID,
								"Authorization": `Zoho-oauthtoken ${process.env.QUICKML_OAUTH_TOKEN}`
							},
							body: JSON.stringify(payload)
						});

						const rawText = await glmResponse.text();
						if (!glmResponse.ok) {
							throw new Error(`GLM API Failed: ${rawText}`);
						}

						const apiData = JSON.parse(rawText);
						const modelText =
							apiData?.choices?.[0]?.message?.content ??
							apiData?.output ??
							apiData?.result ??
							apiData?.response ??
							null;

						if (!modelText) {
							throw new Error("Could not extract model text from envelope.");
						}

						const plan = extractJSON(modelText);
						console.log("[PLANNER NODE] Plan parsed successfully.");
						return plan;
					})();

					// ── NODE 3 Promise: RAG (KSP Manual Lookup) ──
					const ragPromise = (async () => {
						console.log("[RAG NODE] Querying RAG endpoint...");
						const ragUrl = process.env.QUICKML_RAG_ENDPOINT;
						const ragPayload = {
							query: userQuery,
							documents: [process.env.QUICKML_DOC_ID]
						};

						const ragResponse = await fetchWithAuth(ragUrl, {
							method: 'POST',
							headers: {
								"Content-Type": "application/json",
								"CATALYST-ORG": process.env.CATALYST_ORG_ID,
								"Authorization": `Zoho-oauthtoken ${process.env.QUICKML_OAUTH_TOKEN}`
							},
							body: JSON.stringify(ragPayload)
						});

						const ragText = await ragResponse.text();
						if (!ragResponse.ok) {
							throw new Error(`RAG API returned ${ragResponse.status}: ${ragText}`);
						}

						const ragData = JSON.parse(ragText);
						const answer = ragData.response || ragData.answer || ragData.result || null;
						console.log("[RAG NODE] Retrieved guidelines successfully.");
						return answer || "No relevant guidelines found for this query.";
					})().catch(ragErr => {
						console.error("[RAG NODE] RAG query failed:", ragErr.message);
						return "No relevant guidelines found for this query (RAG unavailable).";
					});

					// ── Resolve both concurrently ──
					const [plan, ragAnswer] = await Promise.all([plannerPromise, ragPromise]);
					console.log(`[CONCURRENT PHASE] Planner + RAG resolved in ${Date.now() - circuitStart}ms`);

					// ══════════════════════════════════════════════════════
					// SEQUENTIAL PHASE: NODE 2 (DB Search) then NODE 4 (Summary)
					// DB depends on plan.category, Summary depends on all three
					// ══════════════════════════════════════════════════════

					// ── NODE 2: DATABASE SEARCH — Query CaseMaster via ZCQL ──
					let dbResults = [];
					let categoryFiltered = false;
					try {
						const conditions = [];

						// AUDIT FIX 2.1 & 4.2: categoryMap values match actual Datastore data
						// from data_generation.py. Using exact = match instead of LIKE wildcard.
						const categoryMap = {
							'cyber_fraud': 'Cyber Fraud',
							'financial_fraud': 'Financial Fraud',
							'narcotics': 'Narcotics',
							'theft': 'Theft',
							'assault': 'Assault',
							'robbery': 'Robbery'
						};

						const category = plan.category || 'unknown';
						if (category !== 'unknown' && categoryMap[category]) {
							const sanitized = categoryMap[category].replace(/[^a-zA-Z ]/g, '');
							conditions.push(`Crime_Type = '${sanitized}'`);
							categoryFiltered = true;
						}

						// No category → nothing to search on. An unfiltered LIMIT 10 returned
						// arbitrary rows that the summary then couldn't honestly cite.
						if (conditions.length > 0) {
							const zcqlQuery = `SELECT ROWID, CrimeNo, CaseMasterID, UnitID, Crime_Type, Status FROM CaseMaster WHERE ${conditions.join(' AND ')} LIMIT 25`;
							console.log("[SEARCH NODE] ZCQL:", zcqlQuery);

							const zcql = catalystApp.zcql();
							const queryResult = await zcql.executeZCQLQuery(zcqlQuery);

							dbResults = queryResult.map(row => row.CaseMaster || row);

							console.log(`[SEARCH NODE] Returned ${dbResults.length} record(s)`);
						} else {
							console.log(`[SEARCH NODE] Skipped: category "${category}" has no Datastore mapping`);
						}

					} catch (dbErr) {
						console.error("[SEARCH NODE] DB query failed:", dbErr.message);
						dbResults = [];
					}

					// ── NODE 4: SUMMARY — Synthesize final answer via GLM (XAI-compliant) ──
					// XAI lineage is built in code from the rows the DB actually returned, so every
					// cited case is real. The LLM only writes a short briefing: asking it to also emit
					// per-case JSON took ~30s and tripped the ~30s Catalyst gateway timeout (HTTP 408).
					const citedRows = dbResults.slice(0, 5);
					const sourceNodes = citedRows.map(row => ({
						CrimeNo: row.CrimeNo,
						CaseMasterID: row.CaseMasterID,
						fir_id: row.CrimeNo || row.CaseMasterID,
						reason: `${row.Crime_Type} case matching query category "${plan.category}" (status: ${row.Status})`,
						confidence_score: 1.0
					}));
					const statusCounts = {};
					citedRows.length && dbResults.forEach(r => { statusCounts[r.Status] = (statusCounts[r.Status] || 0) + 1; });
					const statusLine = Object.entries(statusCounts).map(([s, n]) => `${s}: ${n}`).join(', ');
					const dbContext = citedRows.length
						? `${dbResults.length} matching record(s) (status breakdown: ${statusLine}). Top cases:\n` +
							citedRows.map(r => `- CrimeNo ${r.CrimeNo}: ${r.Crime_Type}, ${r.Status}`).join('\n')
						: categoryFiltered
							? `No case records matched the query category "${plan.category}".`
							: `The query did not map to a known crime category, so no case records were searched.`;

					// Used when the model is too slow or fails — still a useful, grounded answer
					const buildFallbackSummary = () =>
						`## Situation Overview\n${citedRows.length ? `${dbResults.length} matching record(s) found (${statusLine}).` : dbContext}\n\n` +
						(citedRows.length ? `## Relevant Cases\n${citedRows.map(r => `- CrimeNo ${r.CrimeNo} — ${r.Status}`).join('\n')}\n\n` : '') +
						`## Applicable Guidelines\n${ragAnswer}\n\n` +
						`## Recommended Next Steps\nReview the cited cases, and add a name, phone number, UPI ID or vehicle number to narrow the search.`;

					let finalSummary;
					let summaryFromModel = false;
					const remainingMs = SUMMARY_DEADLINE_MS - (Date.now() - requestStart);
					try {
						if (remainingMs < 3000) throw new Error(`only ${remainingMs}ms left before gateway timeout`);
						console.log(`[SUMMARY NODE] Generating final synthesis (budget ${remainingMs}ms)...`);

						const summaryUrl = `https://api.catalyst.zoho.in/quickml/v1/project/${process.env.QUICKML_PROJECT_ID}/glm/chat`;
						const summaryPayload = {
							model: "crm-di-glm47b_30b_it",
							messages: [
								{
									role: "system",
									content:
										"You are a senior law enforcement intelligence assistant for the Karnataka State Police. " +
										"Write a concise, actionable intelligence briefing in Markdown with exactly these sections: " +
										"## Situation Overview, ## Relevant Cases, ## Applicable Guidelines, ## Recommended Next Steps. " +
										"Keep the whole briefing under 150 words. " +
										"Cite cases only by the CrimeNo values given in the Database Results — never invent case numbers. " +
										"If the guidelines say no information is available, say so in one line. " +
										"Output only the briefing."
								},
								{
									role: "user",
									content:
										historyContext +
										`Original Query: ${userQuery}\n\n` +
										`── Database Results ──\n${dbContext}\n\n` +
										`── Police Manual / RAG Guidelines ──\n${ragAnswer}`
								}
							],
							max_tokens: 450,
							temperature: 0.3,
							stream: false,
							chat_template_kwargs: { enable_thinking: false }
						};

						const summaryResponse = await fetchWithAuth(summaryUrl, {
							method: 'POST',
							headers: {
								"Content-Type": "application/json",
								"CATALYST-ORG": process.env.CATALYST_ORG_ID,
								"Authorization": `Zoho-oauthtoken ${process.env.QUICKML_OAUTH_TOKEN}`
							},
							body: JSON.stringify(summaryPayload),
							signal: AbortSignal.timeout(remainingMs)
						});

						const summaryRawText = await summaryResponse.text();
						if (!summaryResponse.ok) {
							throw new Error(`Summary GLM API returned ${summaryResponse.status}: ${summaryRawText}`);
						}

						const summaryData = JSON.parse(summaryRawText);
						const summaryModelText =
							summaryData?.choices?.[0]?.message?.content ??
							summaryData?.output ??
							summaryData?.result ??
							summaryData?.response ??
							null;

						const briefing = String(summaryModelText || '')
							.split('</think>').pop()
							.replace(/^\s*```(?:markdown)?\s*|\s*```\s*$/g, '')
							.trim();
						if (!briefing) throw new Error('Summary model returned an empty response');

						finalSummary = briefing;
						summaryFromModel = true;
						console.log(`[SUMMARY NODE] Synthesis complete in ${Date.now() - circuitStart}ms since circuit start.`);

					} catch (sumErr) {
						console.error("[SUMMARY NODE] Falling back to grounded summary:", sumErr.message);
						finalSummary = buildFallbackSummary();
					}

					// ── Build final payload, cache it, and return ──
					const finalPayload = {
						status: 'success',
						plan: plan,
						dbData: dbResults,
						resultCount: dbResults.length,
						ragContext: ragAnswer,
						summary: finalSummary,
						source_nodes: sourceNodes
					};

					// Only cache full model answers, so a slow moment doesn't pin the fallback
					if (summaryFromModel) demoCache.set(userQuery, finalPayload);
					console.log(`[CIRCUIT COMPLETE] Total wall time: ${Date.now() - circuitStart}ms | Cache size: ${demoCache.size}`);

					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify(finalPayload));

				} catch (err) {
					console.error("[DEBUG] /api/plan error:", err.message);
					res.writeHead(500, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({
						status: 'error',
						message: err.message,
						plan: {
							intent: "unknown",
							category: "unknown",
							keywords: [],
							entities: { locations: [], technologies: [] }
						}
					}));
				}
			};
			if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
				upload.single('document')(req, res, handlePlanLogic);
			} else {
				handlePlanLogic(null);
			}
		} catch (err) {
			console.error("[DEBUG] /api/plan setup crashed:", err.message);
			res.writeHead(500, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({
				status: 'error',
				message: err.message,
				plan: {
					intent: "unknown",
					category: "unknown",
					keywords: [],
					entities: { locations: [], technologies: [] }
				}
			}));
		}
	} else if (url.includes('/api/voice') && method === 'POST') {
		// ── Ticket 2.2: Multi-lingual Voice Pipeline (Scaffold) ──
		upload.single('audio')(req, res, async (uploadErr) => {
			if (uploadErr) {
				res.writeHead(400, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ status: 'error', message: 'Upload error: ' + uploadErr.message }));
				return;
			}
			try {
				if (!req.file) {
					res.writeHead(400, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({
						status: 'error',
						message: 'No audio file received. Please POST a multipart/form-data request with field name "audio".'
					}));
					return;
				}

				console.log(`[VOICE NODE] Audio received: ${req.file.originalname} | ${req.file.size} bytes | ${req.file.mimetype}`);

				const projectId = process.env.QUICKML_PROJECT_ID;
				const orgId = process.env.QUICKML_ORGANIZATION_ID;
				const authHeader = `Zoho-oauthtoken ${process.env.QUICKML_OAUTH_TOKEN}`;
				const predictUrl = `https://api.catalyst.zoho.in/quickml/v1/project/${projectId}/endpoints/predict`;

				// ── CALL 1: Speech-to-Text (Kannada audio → Kannada text) ──
				console.log('[VOICE NODE] Step 1: Sending audio to QuickML STT...');
				const sttForm = new FormData();
				sttForm.append('file', new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname);
				sttForm.append('language', 'kn');

				const sttUrl = 'https://api.catalyst.zoho.in/quickml/api/v1/models/zia/audio/transcribe';
				const sttResponse = await fetchWithAuth(sttUrl, {
					method: 'POST',
					headers: {
						'Authorization': authHeader,
						'CATALYST-ORG': process.env.CATALYST_ORG_ID
					},
					body: sttForm
				});

				const sttRawText = await sttResponse.text();
				if (!sttResponse.ok) {
					throw new Error(`STT API failed (${sttResponse.status}): ${sttRawText}`);
				}
				const sttData = JSON.parse(sttRawText);
				const sttResult = sttData?.data?.transcription
					|| sttData?.transcription
					|| sttData?.text
					|| sttData?.result
					|| null;

				if (!sttResult) {
					throw new Error(`STT returned no transcription. Raw response: ${sttRawText}`);
				}
				console.log(`[VOICE NODE] STT result: "${sttResult.substring(0, 80)}..."`);

				// ── CALL 2: Translation via LLM (Kannada text → English text) ──
				// Skipped when the officer spoke English: STT already returned English,
				// and sending it through would translate it INTO Kannada.
				let englishTranslation = sttResult;
				if (KANNADA_RE.test(sttResult)) {
					console.log('[VOICE NODE] Step 2: Translating Kannada → English via GLM...');
					const translateGlmUrl = `https://api.catalyst.zoho.in/quickml/v1/project/${process.env.QUICKML_PROJECT_ID}/glm/chat`;
					const translatePayload = {
						model: "crm-di-glm47b_30b_it",
						messages: [
							{
								role: "system",
								content:
									"You translate Kannada police complaints into English. " +
									"The input comes from speech recognition, so words may be misheard, misspelled or merged together — " +
									"infer the most likely intended meaning from context (theft, fraud, bank, money, assault, etc.). " +
									"Keep numbers, amounts and names accurate. " +
									"Respond with ONLY a JSON object: {\"english\": \"<translation>\"}. No explanations."
							},
							// ── few-shot examples ──
							{ role: "user", content: "ನನ್ನ ಮನೆ ಬೆಂಗಳೂರಿನಲ್ಲಿದೆ" },
							{ role: "assistant", content: "{\"english\": \"My house is in Bengaluru.\"}" },
							{ role: "user", content: "ನನ್ನ ಮೊಬೈಲ್ ಫೋನ್ ಬಸ್ಸಿನಲ್ಲಿ ಕಳುವಾಗಿದೆ" },
							{ role: "assistant", content: "{\"english\": \"My mobile phone was stolen on the bus.\"}" },
							// ── real request ──
							{ role: "user", content: sttResult }
						],
						max_tokens: 512,
						temperature: 0.0,
						stream: false,
						chat_template_kwargs: { enable_thinking: false }
					};

					const translateGlmResponse = await fetchWithAuth(translateGlmUrl, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'CATALYST-ORG': process.env.CATALYST_ORG_ID,
							'Authorization': authHeader
						},
						body: JSON.stringify(translatePayload)
					});

					const translateRawText = await translateGlmResponse.text();
					if (!translateGlmResponse.ok) {
						throw new Error(`Translation GLM API failed (${translateGlmResponse.status}): ${translateRawText}`);
					}

					const translateGlmData = JSON.parse(translateRawText);
					const translateModelText =
						translateGlmData?.choices?.[0]?.message?.content ??
						translateGlmData?.output ??
						translateGlmData?.result ??
						translateGlmData?.response ??
						null;

					if (!translateModelText) {
						throw new Error(`Translation GLM returned no content. Raw: ${translateRawText}`);
					}

					englishTranslation = extractTranslation(translateModelText);
				}

				console.log(`[VOICE NODE] Translation: "${englishTranslation.substring(0, 80)}..."`);

				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({
					status: 'success',
					transcription: sttResult,
					translation: englishTranslation
				}));
			} catch (err) {
				console.error('[VOICE NODE] Error:', err.message);
				res.writeHead(500, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ status: 'error', message: err.message }));
			}
		});
	} else {

		res.writeHead(404, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({
			status: 'error',
			message: `Endpoint ${url} not found`
		}));
	}
};
module.exports.extractTranslation = extractTranslation;
module.exports.fetchWithAuth = fetchWithAuth;
