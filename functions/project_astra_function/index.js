'use strict';

const catalyst = require('zcatalyst-sdk-node');

/**
 * Catalyst Serverless Advanced I/O Function Handler
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
module.exports = (req, res) => {
	// Initialize Catalyst App context from incoming request
	const catalystApp = catalyst.initialize(req);
	const { method, url } = req;

	// Set default response headers, including basic CORS support
	res.writeHead(200, {
		'Content-Type': 'application/json',
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
	});

	// Handle CORS pre-flight requests
	if (method === 'OPTIONS') {
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
	} else {
		res.writeHead(404, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({
			status: 'error',
			message: `Enpoint ${url} not found`
		}));
	}
};
