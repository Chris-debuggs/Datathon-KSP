// Set DC-specific environment variables for the IN data center before loading SDK modules
process.env.X_ZOHO_CATALYST_CONSOLE_URL = 'https://api.catalyst.zoho.in';
process.env.X_ZOHO_CATALYST_ORG_ID = '60076543810';
process.env.X_ZOHO_CATALYST_ACCOUNTS_URL = 'https://accounts.zoho.in';

const fs = require('fs');
const path = require('path');

// Load environment variables immediately before loading other modules
const dotenv = require('dotenv');
const rootEnvPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath });
    console.log(`[Test] Loaded env from: ${rootEnvPath}`);
} else {
    dotenv.config();
    console.log('[Test] Loaded env from default path (.env)');
}

// Programmatically resolve modules from the function's node_modules directory
module.paths.push(path.resolve(__dirname, '../functions/project_astra_function/node_modules'));

const catalyst = require('zcatalyst-sdk-node');
const { processAudioPipeline } = require('../functions/project_astra_function/services/translationPipeline');


// Ensure the functions package.json dependencies are accessible.
// We might need to run this script from the functions folder or install dotenv at root.
// We will look for QUICKML connection name and other configurations
console.log('Environment QuickML connection name:', process.env.QUICKML_CONNECTION_NAME);

async function run() {
    try {
        // 1. Initialize Catalyst SDK
        // Since we are running outside the catalyst command/serve process, we extract the active session token
        // from the local Catalyst CLI configuration file dynamically.
        try {
            const Crypt = require('c:/Users/Faiz/AppData/Roaming/npm/node_modules/zcatalyst-cli/lib/authentication/crypt').default;
            const cliJson = require('c:/Users/Faiz/AppData/Roaming/zcatalyst-cli-nodejs/Config/zcatalyst-cli.json');
            const decrypted = new Crypt('ZC_TRAM').decrypt(cliJson.in.credential);

            process.env.CATALYST_CONFIG = JSON.stringify({
                project_id: '56021000000017001',
                project_key: '56021000000017001',
                environment: 'Development'
            });
            process.env.CATALYST_AUTH = JSON.stringify({
                access_token: decrypted.access_token
            });
            console.log('[Test] Dynamically injected CLI session token for authentication.');
        } catch (authErr) {
            console.warn('[Test] Warning: Failed to extract local CLI credentials. Falling back to default auth.', authErr.message);
        }

        const catalystApp = catalyst.initializeApp();
        console.log('[Test] Catalyst App initialized successfully.');

        // 2. Locate or create a dummy audio buffer
        const audioFileName = 'sample_kannada.wav';
        const audioFilePath = path.join(__dirname, audioFileName);
        let audioBuffer;

        if (fs.existsSync(audioFilePath)) {
            console.log(`[Test] Found sample audio at: ${audioFilePath}`);
            audioBuffer = fs.readFileSync(audioFilePath);
        } else {
            console.log(`[Test] Sample audio file not found at ${audioFilePath}. Creating a dummy audio buffer (sine wave representation)...`);
            // Create a dummy WAV-like or raw binary buffer to avoid failing on read
            // This is a minimal valid 1-second silent WAV file buffer (8000Hz, 16bit, mono PCM)
            audioBuffer = Buffer.from(
                'UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==',
                'base64'
            );
        }

        console.log(`[Test] Audio buffer size: ${audioBuffer.length} bytes.`);

        // 3. Invoke translation pipeline
        console.log('[Test] Starting translation pipeline...');
        const result = await processAudioPipeline(catalystApp, audioBuffer);

        console.log('[Test] Pipeline completed successfully!');
        console.log(`[Test] Translated English Text: "${result.englishText}"`);
        console.log(`[Test] Latency: ${result.latencyMs} ms`);
        console.log(`[Test] Output English audio buffer size: ${result.englishAudioBuffer.length} bytes`);

        // 4. Save the returned English audio buffer
        const outputFilePath = path.join(__dirname, 'output_english.wav');
        fs.writeFileSync(outputFilePath, result.englishAudioBuffer);
        console.log(`[Test] Output English audio written to: ${outputFilePath}`);

    } catch (error) {
        console.error('[Test] Error running translation pipeline test:', error);
    }
}

run();
