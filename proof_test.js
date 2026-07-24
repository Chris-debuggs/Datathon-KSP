const dotenv = require('dotenv');
const catalyst = require('zcatalyst-sdk-node');

// Load environment variables from your .env file
dotenv.config();

async function runProof() {
    console.log("🚀 Starting Pipeline Proof Test...");

    // Explicitly telling Catalyst we are running a standalone basic script
    const app = catalyst.initialize({ type: catalyst.type.Basic });

    // Use the exact Connection Name from your .env
    const connectionName = process.env.QUICKML_CONNECTION_NAME || 'quickml_connection';
    const conn = app.connection(connectionName);

    // 1. Hardcoded Mock Kannada Text (Simulating perfect Speech-to-Text output)
    const mockKannadaText = "ನಮಸ್ಕಾರ, ಈ ಪೈಪ್‌ಲೈನ್ ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ?";
    console.log(`\n[Step 1] Simulated STT Output (Kannada): "${mockKannadaText}"`);

    // 2. Test the Translation Block
    console.log("\n[Step 2] Sending text to Zoho Zia Translation...");
    try {
        const translateResponse = await conn.execute({
            url: `https://api.catalyst.zoho.in/quickml/api/v1/models/${process.env.QUICKML_TRANSLATE_ENDPOINT_KEY}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: mockKannadaText,
                source_language: 'kn',
                target_language: 'en'
            })
        });

        // Parse response safely based on standard QuickML response layout
        const resData = JSON.parse(translateResponse);
        const translatedText = resData.translated_text || resData.data?.translated_text || "Translation missing in response";
        console.log(`✅ Translation Success! English Output: "${translatedText}"`);

        // 3. Test the Text-to-Speech Generation Block
        console.log("\n[Step 3] Sending English text to Zoho Zia TTS...");
        const ttsResponse = await conn.execute({
            url: `https://api.catalyst.zoho.in/quickml/api/v1/models/${process.env.QUICKML_TTS_ENDPOINT_KEY}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: translatedText,
                voice: 'female',
                audio_format: 'wav'
            }),
            responseType: 'buffer' // Ensure we get back raw audio bytes
        });

        // 4. Save the actual audio file to your machine
        const fs = require('fs');
        const path = require('path');
        const outputPath = path.join(__dirname, 'real_output_proof.wav');

        fs.writeFileSync(outputPath, ttsResponse);
        console.log(`\n🎉 SUCCESS! Real audio file written to: ${outputPath}`);
        console.log("Open this file on your computer to hear Zia speak the translated text!");

    } catch (error) {
        console.error("\n❌ Pipeline Error during execution:", error.message);
        if (error.response) console.error("Details:", error.response);
    }
}

runProof();