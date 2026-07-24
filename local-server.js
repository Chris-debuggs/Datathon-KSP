const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '.env') });

try {
    const Crypt = require('c:/Users/Faiz/AppData/Roaming/npm/node_modules/zcatalyst-cli/lib/authentication/crypt').default;
    const cliJson = require('c:/Users/Faiz/AppData/Roaming/zcatalyst-cli-nodejs/Config/zcatalyst-cli.json');
    const decrypted = new Crypt('ZC_TRAM').decrypt(cliJson.in.credential);

    const projectId = process.env.QUICKML_PROJECT_ID || '56021000000017001';
    process.env.CATALYST_CONFIG = JSON.stringify({
        project_id: projectId,
        project_key: projectId,
        environment: 'Development'
    });
    process.env.CATALYST_AUTH = JSON.stringify({
        access_token: decrypted.access_token
    });
    console.log('[Local Server] Dynamically injected CLI session token for authentication.');
} catch (authErr) {
    console.warn('[Local Server] Warning: Failed to extract local CLI credentials.', authErr.message);
}

const http = require('http');
const handler = require('./functions/project_astra_function/index.js');

const server = http.createServer((req, res) => {
    handler(req, res);
});

server.listen(3000, () => {
    console.log('Test wrapper server running on port 3000');
});
