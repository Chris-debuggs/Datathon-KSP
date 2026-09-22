// Self-check for the /api/voice translation parser. Run: node scripts/test_voice_extract.js
const assert = require('assert');
const { extractTranslation } = require('../functions/project_astra_function/index.js');

assert.strictEqual(extractTranslation('{"english": "My phone was stolen."}'), 'My phone was stolen.');
assert.strictEqual(extractTranslation('```json\n{"english": "Money was stolen from my bank account."}\n```'), 'Money was stolen from my bank account.');
assert.strictEqual(extractTranslation('ನನ್ನ = my\nಕಳುವಾಗಿದೆ = stolen\nMy phone was stolen on the bus.'), 'My phone was stolen on the bus.');
// Fallback must strip ALL Kannada characters, not just the first one
assert.strictEqual(extractTranslation('ನನ್ನ ಫೋನ್ 50000'), '50000');
console.log('voice extract checks passed');
