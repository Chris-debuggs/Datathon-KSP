require('dotenv').config();

async function run() {
    try {
        const glmUrl = 'https://api.catalyst.zoho.in/quickml/v1/project/53386000000013049/glm/chat';
        const userQuery = "Find all cyber fraud cases linked to UPI transactions in Bengaluru from last month.";
        const payload = {
            model: "crm-di-glm47b_30b_it",
            messages: [
                {
                    role: "system",
                    content: "You are a law enforcement Planner Agent. Your ONLY function is to output a single raw JSON object. Do NOT think out loud. Do NOT number steps. Do NOT use bullets. Output ONLY the JSON object and nothing else."
                },
                {
                    role: "user",
                    content: "Convert this query to a raw JSON object ONLY (no explanation, no markdown, no steps):\n\n" +
                        `Query: ${userQuery}\n\n` +
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

        const glmResponse = await fetch(glmUrl, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "CATALYST-ORG": "60076561329",
                "Authorization": `Zoho-oauthtoken ${process.env.QUICKML_DEPLOYMENT_TOKEN}`
            },
            body: JSON.stringify(payload)
        });

        const rawText = await glmResponse.text();
        if (!glmResponse.ok) {
            throw new Error(`GLM API Failed: ${rawText}`);
        }

        const apiData = JSON.parse(rawText);
        const modelText =
            apiData?.choices?.[0]?.message?.content ??
            apiData?.output ??
            apiData?.result ??
            apiData?.response ??
            null;

        if (!modelText) {
            throw new Error("Could not extract model text from envelope.");
        }

        const jsonString = modelText.split('</think>').pop().trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
        const plan = JSON.parse(jsonString);
        console.log("Success:", plan);

    } catch (err) {
        console.error("Stack Trace:\n", err.stack);
    }
}

run();
