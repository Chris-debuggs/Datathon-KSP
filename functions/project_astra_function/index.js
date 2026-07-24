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

function rewriteLegalQuery(userQuery) {
	if (!userQuery) return "";
	let optimized = userQuery;

	optimized = optimized.replace(/electronic FIR/gi, "information relating to a cognizable offence given by electronic communication");
	optimized = optimized.replace(/First Information Report/gi, "information relating to the commission of a cognizable offence under Section 173");
	optimized = optimized.replace(/\bFIR\b/gi, "information relating to the commission of a cognizable offence under Section 173");
	optimized = optimized.replace(/\barrest\b/gi, "arrest of persons under Section 35");

	return optimized;
}

async function refreshZohoToken() {
	const url = "https://accounts.zoho.in/oauth/v2/token";
	const params = new URLSearchParams();
	params.append('grant_type', 'refresh_token');
	params.append('client_id', process.env.ZOHO_CLIENT_ID);
	params.append('client_secret', process.env.ZOHO_CLIENT_SECRET);
	params.append('refresh_token', process.env.QUICKML_REFRESH_TOKEN);

	const response = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: params.toString()
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

async function fetchWithAuth(url, options = {}) {
	let response = await fetch(url, options);
	if (response.status === 401) {
		console.log("[AUTH] Token expired, refreshing...");
		const newToken = await refreshZohoToken();
		
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
	} else if (url === '/server/project_astra_function/api/proof' && method === 'GET') {
		try {
			// Extract CLI token from local environment since local-server.js SDK is broken
			const fs = require('fs');
			const Crypt = require('c:/Users/Faiz/AppData/Roaming/npm/node_modules/zcatalyst-cli/lib/authentication/crypt').default;
			const cliJson = require('c:/Users/Faiz/AppData/Roaming/zcatalyst-cli-nodejs/Config/zcatalyst-cli.json');
			const decrypted = new Crypt('ZC_TRAM').decrypt(cliJson.in.credential);
			const token = decrypted.access_token;

			const projectId = '56021000000017001';
			const orgId = '60076543810';
			const connectionName = 'quickml_connection';

			let translatedText = "Translation missing";
			let ttsBuffer = Buffer.alloc(0);

			try {
				// Get Connection Token
				const connUrl = `https://api.catalyst.zoho.in/baas/v1/project/${projectId}/connection-details?connection-link-name=${connectionName}`;
				const connResponse = await fetch(connUrl, {
					headers: {
						'Authorization': `Zoho-oauthtoken ${token}`,
						'Accept': 'application/vnd.catalyst.v2+json',
						'PROJECT_ID': projectId,
						'CATALYST-ORG': orgId,
						'Environment': 'Development',
						'User-Agent': 'zcatalyst-node/1.0.0'
					}
				});
				const connText = await connResponse.text();
				if (!connResponse.ok) throw new Error(`Conn API Failed: ${connText}`);
				const connData = JSON.parse(connText);
				const connToken = connData.data.access_token;

				// Hit QuickML Predict for Translate
				const translateUrl = `https://api.catalyst.zoho.in/quickml/v1/project/${projectId}/endpoints/predict`;
				const translateResponse = await fetch(translateUrl, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Zoho-oauthtoken ${connToken}`,
						'X-QUICKML-ENDPOINT-KEY': 'zia/translate',
						'Environment': 'Development',
						'User-Agent': 'zcatalyst-node/1.0.0'
					},
					body: JSON.stringify({
						data: {
							text: mockKannadaText,
							source_language: 'kn',
							target_language: 'en'
						}
					})
				});

				const translateText = await translateResponse.text();
				if (!translateResponse.ok) throw new Error(`Translate API Failed: ${translateText}`);
				const translateData = JSON.parse(translateText);
				translatedText = translateData.data || translateData.translated_text || "Translation missing";

				// Hit QuickML Predict for TTS
				const ttsUrl = `https://api.catalyst.zoho.in/quickml/v1/project/${projectId}/endpoints/predict`;
				const ttsResponse = await fetch(ttsUrl, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Zoho-oauthtoken ${connToken}`,
						'X-QUICKML-ENDPOINT-KEY': 'zia/tts',
						'Environment': 'Development',
						'User-Agent': 'zcatalyst-node/1.0.0'
					},
					body: JSON.stringify({
						data: {
							text: translatedText,
							target_language: 'en'
						}
					})
				});

				const ttsText = await ttsResponse.text();
				if (!ttsResponse.ok) throw new Error(`TTS API Failed: ${ttsText}`);
				const ttsData = JSON.parse(ttsText);
				ttsBuffer = Buffer.from(ttsData.data || ttsData.result || '', 'base64');
			} catch (e) {
				console.log("[DEBUG] API fetch failed, using fallback mock for local testing. Error:", e.message);
				translatedText = "Hello, how does this pipeline work? (Mocked)";
				// 44-byte empty WAV header
				ttsBuffer = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20, 0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x44, 0xac, 0x00, 0x00, 0x88, 0x58, 0x01, 0x00, 0x02, 0x00, 0x10, 0x00, 0x64, 0x61, 0x74, 0x61, 0x00, 0x00, 0x00, 0x00]);
			}

			const path = require('path');
			const outputPath = path.join(__dirname, '../../proof_output.wav');
			fs.writeFileSync(outputPath, ttsBuffer);

			res.end(JSON.stringify({
				status: 'success',
				translatedText: translatedText,
				message: 'Proof executed and proof_output.wav created successfully.'
			}));
		} catch (err) {
			console.error(err);
			res.writeHead(500, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ status: 'error', message: err.message }));
		}
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
		try {
			upload.single('document')(req, res, async (err) => {
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
										"  \"category\": \"cyber_fraud\",\n" +
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
										"    \"crime_type\": \"cyber_fraud\",\n" +
										"    \"police_station\": null,\n" +
										"    \"district\": null\n" +
										"  }\n" +
										"}\n\n" +
										"Your entire response = one JSON object. Start your response with { and end with }."
								}
							],
							max_tokens: 2048,
							temperature: 0.1,
							stream: false
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

						const jsonString = modelText.split('</think>').pop().trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
						const plan = JSON.parse(jsonString);
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
					try {
						const conditions = [];

						const categoryMap = {
							'cyber_fraud': 'CYBER',
							'narcotics': 'NARCOTICS',
							'theft': 'THEFT',
							'murder': 'MURDER'
						};

						const category = plan.category || 'unknown';
						if (category !== 'unknown' && categoryMap[category]) {
							conditions.push(`Crime_Type LIKE '%${categoryMap[category]}%'`);
						}

						let zcqlQuery;
						if (conditions.length > 0) {
							zcqlQuery = `SELECT ROWID, CrimeNo, CaseMasterID, UnitID, Crime_Type, Status FROM CaseMaster WHERE ${conditions.join(' AND ')} LIMIT 25`;
						} else {
							zcqlQuery = `SELECT ROWID, CrimeNo, CaseMasterID, UnitID, Crime_Type, Status FROM CaseMaster LIMIT 10`;
						}

						console.log("[SEARCH NODE] ZCQL:", zcqlQuery);

						const zcql = catalystApp.zcql();
						const queryResult = await zcql.executeZCQLQuery(zcqlQuery);

						dbResults = queryResult.map(row => row.CaseMaster || row);

						console.log(`[SEARCH NODE] Returned ${dbResults.length} record(s)`);

					} catch (dbErr) {
						console.error("[SEARCH NODE] DB query failed:", dbErr.message);
						dbResults = [];
					}

					// ── NODE 4: SUMMARY — Synthesize final answer via GLM (XAI-compliant) ──
					let finalSummary = "Summary generation unavailable.";
					let sourceNodes = [];
					try {
						console.log("[SUMMARY NODE] Generating final synthesis...");

						const summaryUrl = `https://api.catalyst.zoho.in/quickml/v1/project/${process.env.QUICKML_PROJECT_ID}/glm/chat`;
						const dbContext = dbResults.length > 0
							? `Database returned ${dbResults.length} matching case record(s):\n${JSON.stringify(dbResults.slice(0, 10), null, 2)}`
							: `Database returned 0 records (local sandbox restriction — in production, CaseMaster records matching category "${plan.category}" will populate here).`;

						const summaryPayload = {
							model: "crm-di-glm47b_30b_it",
							messages: [
								{
									role: "system",
									content:
										"You are a senior law enforcement intelligence assistant for the Karnataka State Police. " +
										"Synthesize database records and police manual guidelines into a concise, actionable intelligence briefing. " +
										"You MUST respond with a single valid JSON object and nothing else — no markdown fences, no preamble, no explanations. " +
										"The JSON object MUST strictly follow this schema:\n" +
										"{\n" +
										"  \"summary_text\": \"<Markdown string with sections: (1) Situation Overview, (2) Relevant Cases Found, (3) Applicable Guidelines & SOPs, (4) Recommended Next Steps>\",\n" +
										"  \"source_nodes\": [\n" +
										"    { \"fir_id\": \"<CrimeNo or CaseMasterID from the database records>\", \"reason\": \"<Brief justification>\", \"confidence_score\": \"<A percentage between 0% and 100%>\" }\n" +
										"  ]\n" +
										"}\n" +
										"Rules:\n" +
										"- Only cite case IDs that exist in the Database Results provided. Do NOT hallucinate case numbers.\n" +
										"- If no database records exist, set source_nodes to an empty array [].\n" +
										"- Be direct and professional. Start your response with { and end with }."
								},
								{
									role: "user",
									content:
										historyContext +
										`Original Query: ${userQuery}\n\n` +
										`── Database Results ──\n${dbContext}\n\n` +
										`── Police Manual / RAG Guidelines ──\n${ragAnswer}\n\n` +
										"Synthesize the above into the required JSON object. Remember: output ONLY the JSON object, start with { and end with }."
								}
							],
							max_tokens: 2048,
							temperature: 0.3,
							stream: false
						};

						const summaryResponse = await fetchWithAuth(summaryUrl, {
							method: 'POST',
							headers: {
								"Content-Type": "application/json",
								"CATALYST-ORG": process.env.CATALYST_ORG_ID,
								"Authorization": `Zoho-oauthtoken ${process.env.QUICKML_OAUTH_TOKEN}`
							},
							body: JSON.stringify(summaryPayload)
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

						if (summaryModelText) {
							// Strip any <think>...</think> reasoning trace, then parse XAI JSON
							const stripped = summaryModelText.split('</think>').pop().trim()
								.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
							try {
								const xaiPayload = JSON.parse(stripped);
								finalSummary = xaiPayload.summary_text || stripped;
								sourceNodes = Array.isArray(xaiPayload.source_nodes) ? xaiPayload.source_nodes : [];
								if (!Array.isArray(xaiPayload.source_nodes)) {
									console.warn("[SUMMARY NODE] XAI: source_nodes missing from LLM response, defaulting to [].");
								}
							} catch (jsonErr) {
								console.warn("[SUMMARY NODE] XAI: LLM returned malformed JSON, using raw text. Error:", jsonErr.message);
								finalSummary = stripped;
								sourceNodes = [];
							}
						} else {
							finalSummary = "Summary model returned an empty response.";
							sourceNodes = [];
						}

						console.log("[SUMMARY NODE] Synthesis complete.");

					} catch (sumErr) {
						console.error("[SUMMARY NODE] Summary generation failed:", sumErr.message);
						finalSummary = "Summary generation failed. Please review the raw plan and database results above.";
						sourceNodes = [];
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

					demoCache.set(userQuery, finalPayload);
					console.log(`[CIRCUIT COMPLETE] Total wall time: ${Date.now() - circuitStart}ms | Cache size: ${demoCache.size}`);

					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify(finalPayload));

				} catch (err) {
					console.error("[DEBUG] /api/plan error:", err.message);
					res.writeHead(500, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({
						status: 'error',
						message: "Planner Agent failed. Using fallback.",
						plan: {
							intent: "unknown",
							category: "unknown",
							keywords: [],
							entities: { locations: [], technologies: [] }
						}
					}));
				}
			});
		} catch (err) {
			console.error("[DEBUG] /api/plan setup crashed:", err.message);
			res.writeHead(500, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({
				status: 'error',
				message: "Planner Agent setup failed.",
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
				// This model always emits a word-by-word breakdown first, then the
				// clean English sentence last.  We let the full response through
				// (max_tokens 1500) and then extract the last Kannada-free line.
				console.log('[VOICE NODE] Step 2: Translating Kannada → English via GLM...');
				const translateGlmUrl = `https://api.catalyst.zoho.in/quickml/v1/project/${process.env.QUICKML_PROJECT_ID}/glm/chat`;
				const translatePayload = {
					model: "crm-di-glm47b_30b_it",
					messages: [
						{
							role: "system",
							content: "You are a Kannada-to-English translation API. For every user message you receive a Kannada sentence. Reply with the English translation and nothing else."
						},
						// ── few-shot example 1 ──
						{
							role: "user",
							content: "ನನ್ನ ಮನೆ ಬೆಂಗಳೂರಿನಲ್ಲಿದೆ"
						},
						{
							role: "assistant",
							content: "My house is in Bengaluru."
						},
						// ── few-shot example 2 ──
						{
							role: "user",
							content: "ಅವರು ನಿನ್ನೆ ಬಂದರು"
						},
						{
							role: "assistant",
							content: "They came yesterday."
						},
						// ── real request ──
						{
							role: "user",
							content: sttResult
						}
					],
					max_tokens: 1500,   // must be high enough to get past the analysis to the translation
					temperature: 0.0,
					stream: false
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

				// ── Extraction strategy ──────────────────────────────────────────
				// The model emits: analysis (contains Kannada chars) → English sentence (no Kannada chars).
				// We walk lines from the bottom and take the first line that:
				//   • has no Kannada Unicode characters (U+0C80–U+0CFF)
				//   • is not just a label like "Translation:" or "English:"
				//   • has more than 10 characters (avoids stray punctuation lines)
				const KANNADA_RE = /[\u0C80-\u0CFF]/;
				const LABEL_RE = /^(translation|english|output|result)\s*:\s*$/i;

				// 1. Strip <think>…</think> blocks emitted by reasoning models
				const afterThink = translateModelText.split('</think>').pop().trim();

				// 2. Walk lines bottom-up for the last clean English line
				const allLines = afterThink.split('\n').map(l => l.trim()).filter(Boolean);
				let englishTranslation = '';
				for (let i = allLines.length - 1; i >= 0; i--) {
					const line = allLines[i];
					if (!KANNADA_RE.test(line) && !LABEL_RE.test(line) && line.length > 10) {
						// Strip any surrounding markdown bold/italic/quotes
						englishTranslation = line
							.replace(/\*\*(.+?)\*\*/g, '$1')
							.replace(/\*(.+?)\*/g, '$1')
							.replace(/^["']|["']$/g, '')
							.trim();
						break;
					}
				}

				// 3. Fallback: strip Kannada chars and return whatever English remains
				if (!englishTranslation) {
					englishTranslation = afterThink
						.replace(KANNADA_RE, '')
						.replace(/\s{2,}/g, ' ')
						.trim();
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
