'use strict';

const catalyst = require('zcatalyst-sdk-node');
const { processAudioPipeline } = require('./services/translationPipeline');

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
	} else {
		res.writeHead(404, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({
			status: 'error',
			message: `Endpoint ${url} not found`
		}));
	}
};
