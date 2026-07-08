'use strict';

const https = require('https');
const fs = require('fs');

const logFile = './test_request_output.txt';
function log(msg, data = '') {
    const line = `${msg} ${data ? JSON.stringify(data, null, 2) : ''}\n`;
    fs.appendFileSync(logFile, line);
    console.log(msg);
}

fs.writeFileSync(logFile, '--- Direct Request Sandbox ---\n');

try {
    const Crypt = require('c:/Users/Faiz/AppData/Roaming/npm/node_modules/zcatalyst-cli/lib/authentication/crypt').default;
    const cliJson = require('c:/Users/Faiz/AppData/Roaming/zcatalyst-cli-nodejs/Config/zcatalyst-cli.json');
    const decrypted = new Crypt('ZC_TRAM').decrypt(cliJson.in.credential);

    const token = decrypted.access_token;
    const projectId = '56021000000017001';
    const connectionName = 'quickml_connection';

    const url = `https://api.catalyst.zoho.in/baas/v1/project/${projectId}/connection-details?connection-link-name=${connectionName}`;

    log('Requesting URL:', url);

    const options = {
        method: 'GET',
        headers: {
            'Authorization': `Zoho-oauthtoken ${token}`,
            'Accept': 'application/vnd.catalyst.v2+json',
            'PROJECT_ID': projectId,
            'CATALYST-ORG': '60076543810',
            'Environment': 'Development',
            'User-Agent': 'zcatalyst-node/1.0.0'
        }
    };

    const req = https.request(url, options, (res) => {
        log('Status Code:', res.statusCode);
        log('Response Headers:', res.headers);

        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            log('Response Body:', data);
        });
    });

    req.on('error', (err) => {
        log('Request Error:', { message: err.message, stack: err.stack });
    });

    req.end();

} catch (err) {
    log('Top level Error:', { message: err.message, stack: err.stack });
}
