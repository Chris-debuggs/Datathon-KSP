const http = require('http');

function sendPostRequest(endpoint, payload, contentType = 'text/plain') {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: `/server/project_astra_function/api/${endpoint}`,
            method: 'POST',
            headers: {
                'Content-Type': contentType,
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const startTime = Date.now();
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    body: data,
                    latency: Date.now() - startTime
                });
            });
        });

        req.on('error', error => {
            reject(error);
        });

        req.write(payload);
        req.end();
    });
}

async function runPhase1() {
    console.log('\n--- PHASE 1: Golden Path Test ---');
    const dummyAudio = Buffer.from('UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==', 'base64');
    try {
        const res = await sendPostRequest('test-voice', dummyAudio);
        console.log(`Status: ${res.statusCode}`);
        console.log(`Latency: ${res.latency}ms`);
        console.log(`Response: ${res.body}`);
    } catch (e) {
        console.error('Error:', e.message);
    }
}

async function runPhase2() {
    console.log('\n--- PHASE 2: Garbage In Test ---');
    try {
        const res = await sendPostRequest('test-voice', JSON.stringify({text: "this is not audio"}), 'application/json');
        console.log(`Status: ${res.statusCode}`);
        console.log(`Latency: ${res.latency}ms`);
        console.log(`Response: ${res.body}`);
    } catch (e) {
        console.error('Error:', e.message);
    }
}

async function runPhase3() {
    console.log('\n--- PHASE 3: Latency & Load Test ---');
    const dummyAudio = Buffer.from('UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==', 'base64');
    for (let i = 1; i <= 5; i++) {
        try {
            const res = await sendPostRequest('test-voice', dummyAudio);
            console.log(`Request ${i} - Status: ${res.statusCode}, Latency: ${res.latency}ms, Response: ${res.body}`);
        } catch (e) {
            console.error(`Request ${i} Error:`, e.message);
        }
    }
}

async function main() {
    await runPhase1();
    await runPhase2();
    await runPhase3();
}

main();
