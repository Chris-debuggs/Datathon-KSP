'use strict';

const fs = require('fs');
const logFile = './validation_debug_output.txt';

function writeLog(msg, data = '') {
    const line = `${new Date().toISOString()} - ${msg} ${data ? JSON.stringify(data, null, 2) : ''}\n`;
    fs.appendFileSync(logFile, line);
    console.log(msg);
}

fs.writeFileSync(logFile, '--- DEBUG START ---\n');

process.on('uncaughtException', (err) => {
    writeLog('Uncaught Exception:', { message: err.message, stack: err.stack });
});
process.on('unhandledRejection', (reason, promise) => {
    writeLog('Unhandled Rejection at:', { reason: reason ? reason.toString() : 'unknown', stack: reason ? reason.stack : '' });
});

const path = require('path');
writeLog('Requiring runtime-store...');
const runtimeStore = require('c:\\Users\\Faiz\\AppData\\Roaming\\npm\\node_modules\\zcatalyst-cli\\lib\\runtime-store').default;
writeLog('Requiring fn-utils...');
const fnUtils = require('c:\\Users\\Faiz\\AppData\\Roaming\\npm\\node_modules\\zcatalyst-cli\\lib\\fn-utils');

// Mock runtime store context
const projectRoot = 'c:\\Users\\Faiz\\Downloads\\Faiz-projects\\KSP-Datathon\\Datathon-KSP';
runtimeStore.set('project.root', projectRoot);
runtimeStore.set('context.targets', ['functions']);

// Set process.env.CATALYST_PROJECT_ID from .catalystrc or directly
process.env.CATALYST_PROJECT_ID = '56021000000017001';

writeLog('Initializing Config...');
const cliConfig = require('c:\\Users\\Faiz\\AppData\\Roaming\\npm\\node_modules\\zcatalyst-cli\\lib\\internal/config').default;

writeLog('Initializing Authentication...');
const authHelper = require('c:\\Users\\Faiz\\AppData\\Roaming\\npm\\node_modules\\zcatalyst-cli\\lib\\command_needs\\auth').default;

writeLog('Initializing RC...');
const rcHelper = require('c:\\Users\\Faiz\\AppData\\Roaming\\npm\\node_modules\\zcatalyst-cli\\lib\\command_needs\\rc').default;

async function run() {
    try {
        const userConfig = await cliConfig.load(false);
        runtimeStore.set('config', userConfig);
        writeLog('Config loaded successfully.');

        // Authenticate
        authHelper([]);
        writeLog('Auth helper called successfully.');

        // Load rc
        await rcHelper({ optional: true });
        writeLog('RC helper called successfully.');

        writeLog('Running target validation...');
        const targets = await fnUtils.fnUtils.common.validate(false);
        writeLog('Raw targets found:', targets);

        const refined = await fnUtils.fnUtils.common.refineTargets(targets);
        writeLog('Refined targets results:');
        refined.forEach(t => {
            writeLog(`- Target: ${t.name}`, {
                valid: t.valid,
                type: t.type,
                stack: t.stack,
                failure_reason: t.failure_reason
            });
        });
    } catch (err) {
        writeLog('Error during run():', { message: err.message, stack: err.stack });
    }
}

run().then(() => writeLog('Run finished.'));
