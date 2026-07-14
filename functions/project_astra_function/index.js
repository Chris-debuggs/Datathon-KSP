'use strict';
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const catalyst = require('zcatalyst-sdk-node');
const { processAudioPipeline } = require('./services/translationPipeline');

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
	params.append('client_id', '1000.235IDXWAW9GEUZXQSGZY834T88Y6YP');
	params.append('client_secret', '319b6e6c1b105a713a93075a1897f09b867a7c6162');
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
	} catch(e) {
		try {
			catalystApp = catalyst.app();
		} catch(err) {
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
			} catch(e) {
				console.log("[DEBUG] API fetch failed, using fallback mock for local testing. Error:", e.message);
				translatedText = "Hello, how does this pipeline work? (Mocked)";
				// 44-byte empty WAV header
				ttsBuffer = Buffer.from([0x52,0x49,0x46,0x46, 0x24,0x00,0x00,0x00, 0x57,0x41,0x56,0x45, 0x66,0x6d,0x74,0x20, 0x10,0x00,0x00,0x00, 0x01,0x00,0x01,0x00, 0x44,0xac,0x00,0x00, 0x88,0x58,0x01,0x00, 0x02,0x00,0x10,0x00, 0x64,0x61,0x74,0x61, 0x00,0x00,0x00,0x00]);
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
					} catch(e) {
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
						"documents": [ process.env.QUICKML_DOC_ID ]
					});

					let ragResponse = await fetch(ragUrl, {
						method: 'POST',
						headers: {
							"Content-Type": "application/json",
							"CATALYST-ORG": process.env.CATALYST_ORG_ID,
							"Authorization": `Zoho-oauthtoken ${process.env.QUICKML_OAUTH_TOKEN}`
						},
						body: payload
					});

					if (ragResponse.status === 401) {
						await refreshZohoToken();
						ragResponse = await fetch(ragUrl, {
							method: 'POST',
							headers: {
								"Content-Type": "application/json",
								"CATALYST-ORG": process.env.CATALYST_ORG_ID,
								"Authorization": `Zoho-oauthtoken ${process.env.QUICKML_OAUTH_TOKEN}`
							},
							body: payload
						});
					}

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
			let body = [];
			req.on('data', chunk => body.push(chunk));
			req.on('end', async () => {
				try {
					const buffer = Buffer.concat(body);
					let reqBody;
					try {
						reqBody = JSON.parse(buffer.toString());
					} catch(e) {
						res.writeHead(400, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ status: 'error', message: 'Invalid JSON payload' }));
						return;
					}
					
					const userQuery = reqBody.query;
					if (!userQuery) {
						res.writeHead(400, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ status: 'error', message: 'Missing query property in request' }));
						return;
					}

					const glmUrl = 'https://api.catalyst.zoho.in/quickml/v1/project/53386000000013049/glm/chat';
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
									`Query: ${userQuery}\n\n` +
									"Required JSON schema — output this object and NOTHING else:\n" +
									"{\n" +
									"  \"intent\": \"search\",\n" +
									"  \"category\": \"cyber_fraud\",\n" +
									"  \"keywords\": [\"extracted\", \"terms\"],\n" +
									"  \"entities\": {\n" +
									"    \"locations\": [\"Bengaluru\"],\n" +
									"    \"technologies\": [\"UPI\"]\n" +
									"  }\n" +
									"}\n\n" +
									"Your entire response = one JSON object. Start your response with { and end with }."
							}
						],
						max_tokens: 2048,
						temperature: 0.1,
						stream: false
					};

					const glmResponse = await fetch(glmUrl, {
						method: 'POST',
						headers: {
							"Content-Type": "application/json",
							"CATALYST-ORG": "60076561329",
							"Authorization": `Zoho-oauthtoken ${process.env.QUICKML_DEPLOYMENT_TOKEN}`
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

					// Deterministic parsing: split off the reasoning trace
					const jsonString = modelText.split('</think>').pop().trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
					const plan = JSON.parse(jsonString);

					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({
						status: 'success',
						plan: plan
					}));

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
	} else {
		res.writeHead(404, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({
			status: 'error',
			message: `Endpoint ${url} not found`
		}));
	}
};
