// ============================================================
// test-planner.js  —  Ticket 3.1: Planner Agent LLM Serving
// Target: QuickML Generative AI Chat endpoint (GLM direct)
// Run:    node test-planner.js
// ============================================================

require('dotenv').config();

const TOKEN = process.env.QUICKML_DEPLOYMENT_TOKEN;

if (!TOKEN) {
  console.error('\n❌  QUICKML_DEPLOYMENT_TOKEN is not set in .env');
  process.exit(1);
}

// ── POST Payload ─────────────────────────────────────────────
// NOTE: GLM 4.7 has a baked-in reasoning mode. To counteract it,
// we embed the output constraint in the USER turn (which the model
// weighs more heavily) and also use a response-extraction fallback.
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
        "Query: Find all cyber fraud cases linked to UPI transactions in Bengaluru from last month.\n\n" +
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
  max_tokens: 800,
  temperature: 0.1,
  stream: false
};

// ── Extract first valid JSON object from any text ─────────────
function extractJson(text) {
  // Walk the string and find the first complete {...} block
  let depth = 0, start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (text[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        const candidate = text.slice(start, i + 1);
        try { return JSON.parse(candidate); } catch { /* keep scanning */ }
        start = -1;
      }
    }
  }
  return null;
}

// ── Main ─────────────────────────────────────────────────────
async function runPlannerTest() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║     Ticket 3.1 — Planner Agent LLM Serving Test     ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
  console.log('🔗  URL   : https://api.catalyst.zoho.in/quickml/v1/project/53386000000013049/glm/chat');
  console.log('🤖  Model :', payload.model);
  console.log('\n⏳  Sending request…\n');

  let response;
  try {
    response = await fetch(
      'https://api.catalyst.zoho.in/quickml/v1/project/53386000000013049/glm/chat',
      {
        method: 'POST',
        headers: {
          "Content-Type":  "application/json",
          "CATALYST-ORG":  "60076561329",
          "Authorization": `Zoho-oauthtoken ${TOKEN}`
        },
        body: JSON.stringify(payload)
      }
    );
  } catch (err) {
    console.error('❌  Network error:', err.message);
    process.exit(1);
  }

  console.log('📡  HTTP Status :', response.status, response.statusText);
  console.log('─'.repeat(56));

  // ── Print ENTIRE raw response ─────────────────────────────
  const rawBody = await response.text();
  console.log('\n── RAW RESPONSE BODY ──────────────────────────────────\n');
  console.log(rawBody);
  console.log('\n── END RAW RESPONSE ───────────────────────────────────\n');

  if (!response.ok) {
    console.error(`❌  Request failed with HTTP ${response.status}.\n`);
    process.exit(1);
  }

  // ── Parse outer envelope ──────────────────────────────────
  let apiResponse;
  try { apiResponse = JSON.parse(rawBody); }
  catch { console.error('❌  Could not parse response envelope.'); process.exit(1); }

  const modelText =
    apiResponse?.choices?.[0]?.message?.content ??
    apiResponse?.output ??
    apiResponse?.result ??
    apiResponse?.response ??
    null;

  if (modelText === null) {
    console.warn('⚠️   Could not extract model text. Inspect RAW RESPONSE BODY above.\n');
    process.exit(0);
  }

  // ── Print EXACT raw model text — no parsing, no extraction ──
  console.log('── RAW MODEL TEXT (exact LLM string, field: response.response) ──\n');
  console.log(modelText);
  console.log('\n── END OF MODEL TEXT ──────────────────────────────────\n');

  console.log('Token usage:', JSON.stringify(apiResponse?.usage ?? {}));
  console.log('\n✔  Raw dump complete.\n');
}

runPlannerTest();
