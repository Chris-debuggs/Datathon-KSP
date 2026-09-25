// Self-check: a deadline-bound caller must not wait on a hung Zoho token refresh.
// Run: node scripts/test_fetch_auth.js
const assert = require('assert');
const { fetchWithAuth } = require('../functions/project_astra_function/index.js');

let tokenCalls = 0;
global.fetch = async (url) => {
	if (url.includes('accounts.zoho.in')) { tokenCalls++; return new Promise(() => {}); } // refresh hangs
	return { status: 401 };                                                                // API says token expired
};

// AbortSignal.timeout timers are unref'd; keep the process alive like the real HTTP server does
const keepAlive = setTimeout(() => { console.error('FAIL: caller hung waiting on the token refresh'); process.exit(1); }, 5000);

(async () => {
	const t = Date.now();
	const [a, b] = await Promise.allSettled([
		fetchWithAuth('https://api/x', { headers: {}, signal: AbortSignal.timeout(200) }),
		fetchWithAuth('https://api/y', { headers: {}, signal: AbortSignal.timeout(300) }),
	]);
	const elapsed = Date.now() - t;
	assert.strictEqual(a.status, 'rejected');
	assert.strictEqual(b.status, 'rejected');
	assert.ok(elapsed < 1000, `caller waited ${elapsed}ms on a hung refresh`);
	assert.strictEqual(tokenCalls, 1, 'concurrent 401s should share one refresh');
	clearTimeout(keepAlive);
	console.log(`fetch auth checks passed (${elapsed}ms, ${tokenCalls} refresh)`);
})();
