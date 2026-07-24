require('dotenv').config();

async function testRAG() {
    const ragUrl = process.env.QUICKML_RAG_ENDPOINT;

    console.log(`Sending request to: ${ragUrl}`);
    
    try {
        const response = await fetch(ragUrl, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "CATALYST-ORG": process.env.CATALYST_ORG_ID,
                "Authorization": `Zoho-oauthtoken ${process.env.QUICKML_OAUTH_TOKEN}`
            },
            body: JSON.stringify({
                "query": "According to Section 173, what is the procedure when information relating to a cognizable offence is given by electronic communication?",
                "documents": [ process.env.QUICKML_DOC_ID ]
            })
        });

        const text = await response.text();
        console.log("----- RAW RESPONSE -----");
        console.log(text);
        
        if (!response.ok) {
            console.error(`Request failed with status ${response.status}`);
        }
    } catch (err) {
        console.error("Fetch error:", err);
    }
}

testRAG();
