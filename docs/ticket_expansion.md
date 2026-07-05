# Project ASTRA: Detailed Issue Descriptions

**Instructions for the PM/Tech Lead:**
 Copy the content below the horizontal rules and paste it directly into the description body of the respective GitHub Issues. This provides your developers with the exact technical context they need to execute autonomously.
## EPIC 1: Infrastructure & Data Foundation
### Ticket 1.1: Initialize Catalyst Project & CLI
**Context:**
We must establish the foundational repository structure using the Zoho Catalyst CLI. To prevent deployment failures and CI/CD bloat, the frontend (Slate) and backend (Advanced I/O) must be strictly isolated.
**Implementation Steps:**
- Install Catalyst CLI globally: `npm install -g zcatalyst-cli`.
- Run `catalyst init` and select Client (Slate) and Functions (Advanced I/O - Node.js 24).
- Create a master `.gitignore` at the repository root.
- Add `/node_modules/`, `.env`, and `.catalystrc` to the `.gitignore`.

**Technical Guardrails:**
⚠️ DO NOT run npm install at the repository root. Catalyst requires dependencies to be installed inside specific function directories (e.g., backend/functions/api_handler).

**Acceptance Criteria:**
- [ ] Catalyst project initialized successfully.
- [ ] Directory structure isolates frontend and backend.
- [ ] `.gitignore` prevents node_modules from being committed.
### Ticket 1.2: Generate Synthetic Crime Dataset
**Context:**
We need 150,000+ relational records to prove the platform works at scale. Because ZCQL limits deep joins, we must also generate a flat ZCQL_Edges table to map relationships (e.g., Accused to CaseMaster) ahead of time.
**Implementation Steps:**
Write a Python script using the Faker library (locale: en_IN).Generate base entities first: Unit, Employee, Court.Generate CaseMaster records using foreign keys from the base entities. The CrimeNo must be an 18-digit string.Generate Accused and ArrestSurrender records. Crucial: Assign them valid CaseMasterIDs randomly selected from the generated CaseMaster pool.Generate the ZCQL_Edges table mapping SourceID to TargetID.Export all tables to CSV.
**Technical Guardrails:**
⚠️ Referential integrity is non-negotiable. An Accused record with a CaseMasterID that doesn't exist will break the graph traversal API silently.
**Acceptance Criteria:**
- [ ] Python script outputs CSVs for all core tables.- [ ] Edges table correctly maps entity relationships.- [ ] Zero orphaned foreign keys.
### Ticket 1.3: Configure Data Store Schema & Upload
**Context:**
Provisioning the Catalyst Data Store to match the KSP ER Diagram and ingesting our synthetic dataset.
**Implementation Steps:**
Log into the Zoho Catalyst Console -> Data Store.Create tables: CaseMaster, Accused, ArrestSurrender, ChargesheetDetails, and ZCQL_Edges.Map text fields to VarChar and IDs to BigInt. Coordinates map to Double.Bulk upload the synthetic CSVs generated in Ticket 1.2.Navigate to Data Store -> Scopes. Uncheck Insert, Update, and Delete for the Application User role.
**Technical Guardrails:**
⚠️ If you forget to restrict the Application User scope to SELECT only, the frontend client will have unauthorized write access to the database.
**Acceptance Criteria:**
- [ ] Tables created with strict data types.- [ ] Synthetic data uploaded successfully.- [ ] Scopes restricted to prevent client-side data mutation.
### Ticket 1.4: UI Scaffolding & Routing
**Context:**
Initializing the frontend application in Catalyst Slate. Dev 1 will hardcode the API JSON contracts immediately so UI development isn't blocked by the backend.
**Implementation Steps:**
Initialize React (Vite) or Vue inside the Catalyst Slate directory.Setup a router (e.g., react-router-dom) with paths: /login, /chat, /analytics.Create a state management store (Context/Redux) and paste the mock JSON payloads from api_contracts.md as initial state.Build the base layout shell (Sidebar, Header, Main Content area).
**Acceptance Criteria:**
- [ ] Application compiles and runs locally.- [ ] Base routing is functional.- [ ] Mock JSON payloads are successfully injected into the UI state.
### Ticket 1.5: Configure QuickML API Keys
**Context:**
Securing server-to-server communication between Catalyst Advanced I/O and Zoho QuickML.
**Implementation Steps:**
Navigate to Catalyst Cloudscale -> Connections.Create a new programmatic OAuth connection.Add the exact scope: quickml.deployment.read.Extract the PROJECT_ID, CLIENT_ID, and CLIENT_SECRET.Inject non-sensitive IDs into catalyst-config.json.Add secrets to a local .env file and distribute env.example to the team.
**Technical Guardrails:**
⚠️ Never commit the .env file to GitHub.
**Acceptance Criteria:**
- [ ] OAuth connection established.- [ ] Scopes strictly limited.- [ ] .env.example committed to the repository.
## EPIC 2: Core API & Orchestration
### Ticket 2.1: Build Base FIR Retrieval API
**Context:**
Building the high-speed, synchronous REST endpoint for traditional FIR lookups using Zoho Cloud Query Language (ZCQL).
**Implementation Steps:**
Initialize zcatalyst-sdk-node inside your Advanced I/O function.Extract query parameters (e.g., req.query.crime_no).Construct a ZCQL query: SELECT * FROM CaseMaster WHERE CrimeNo = '...' LIMIT 50.Serialize the ResultSet to match the exact 1_fir_search JSON contract.Return the response to the client.
**Technical Guardrails:**
⚠️ Catalyst API Gateway drops connections at ~30 seconds. Keep queries indexed and simple. No deep joins here.
**Acceptance Criteria:**
- [ ] API successfully queries Catalyst Data Store.- [ ] JSON response matches the established API contract exactly.- [ ] Execution latency < 2 seconds.
### Ticket 2.2: Implement Multi-lingual Pipeline
**Context:**
Building the QuickML pipeline to process Kannada audio, translate it to English for the LLM, and return translated Kannada text/audio.
**Implementation Steps:**
Invoke QuickML Speech-to-Text API on incoming audio streams.Invoke QuickML Translation API (Kannada -> English).(LLM Processing happens here).Invoke QuickML Translation API (English -> Kannada).Invoke QuickML Text-to-Speech to generate output audio.
**Technical Guardrails:**
⚠️ Chaining 5 ML models sequentially is highly susceptible to the 30s timeout. Measure latency carefully. We may need to stream partial results.
**Acceptance Criteria:**
- [ ] Pipeline successfully translates Kannada voice to English text.- [ ] Pipeline successfully translates English text back to Kannada audio.
### Ticket 2.3: Setup RAG Document Index
**Context:**
Grounding our LLM in actual law enforcement procedures to prevent hallucination.
**Implementation Steps:**
Compile PDF files of BNSS 2023 and KSP Standard Operating Procedures.Upload these documents via the QuickML Console RAG interface.Extract the generated document_id alphanumeric hashes.Add these IDs to the backend environment variables (RAG_DOCUMENT_IDS).
**Acceptance Criteria:**
- [ ] Documents successfully parsed and indexed by QuickML.- [ ] Document IDs securely stored in .env.
### Ticket 2.4: Implement Chat Interface UI
**Context:**
Building the conversational UI for the investigator. Must maintain context history to allow follow-up questions.
**Implementation Steps:**
Build a chat interface similar to ChatGPT.Implement a context_history array in state.Upon user submission, append the message to the history and fire POST /api/chat.Render the incoming response. Include visual tags for the source_nodes (Explainable AI citations).
**Acceptance Criteria:**
- [ ] UI handles message rendering smoothly.- [ ] Payload correctly formats the context_history array before sending.- [ ] Renders clickable/visible citations based on source_nodes JSON.
### Ticket 2.5: Build Async Graph Traversal
**Context:**
This is the most critical backend workaround. Complex network mapping will crash the 30s gateway limit. We must trigger a background job and reply instantly.
**Implementation Steps:**
Build POST /api/graph. It generates a job_id, triggers a Catalyst Job Function, and immediately returns HTTP 202 Accepted matching contract 3_async_graph_trigger.Build the Catalyst Job Function. It receives the seed_node_id.The Job Function queries the ZCQL_Edges table recursively to find multi-hop connections.Serialize the final nodes/edges arrays.Initialize the Catalyst Filestore SDK and write the JSON payload to Stratus Object Storage named ${job_id}.json.
**Technical Guardrails:**
⚠️ The Advanced I/O function MUST return the 202 status without waiting for the Job Function to finish.
**Acceptance Criteria:**
- [ ] API returns 202 immediately.- [ ] Job Function successfully builds graph from Edges table.- [ ] JSON payload successfully written to Stratus.
### Ticket 2.6: Frontend Exponential Backoff Polling
**Context:**
The frontend must autonomously track the Job Function initiated in Ticket 2.5 without overwhelming the server.
**Implementation Steps:**
When the UI receives HTTP 202 and a job_id, display a loading state ("Analyzing Criminal Network...").Implement a polling function that hits GET /api/status/:jobId.If response is status: running, wait N seconds and try again (Base 2s, multiply by 1.5 each attempt).If response is status: complete, fetch the Stratus JSON and trigger the D3.js render.
**Acceptance Criteria:**
- [ ] UI correctly handles the 202 accepted state.- [ ] Polling logic implements exponential backoff, capping at max 7 attempts.- [ ] Renders graph component upon completion.
## EPIC 3: Agent Logic & Analytics
### Ticket 3.1: Develop Planner Agent Logic
**Context:**
The LLM must act as an orchestrator. It parses the natural language to figure out what the user actually wants (Search vs. Graph vs. Analytics).
**Implementation Steps:**
Create a system prompt defining the KSP database schema.Provide few-shot examples instructing the LLM to output a strict JSON routing payload.e.g., "Find cases for Ramesh" -> {"intent": "FIR_SEARCH", "params": {"name": "Ramesh"}}.Set model temperature to 0.0 to ensure deterministic, machine-readable output.
**Acceptance Criteria:**
- [ ] LLM reliably outputs valid JSON routing schemas.- [ ] Correctly extracts entities (UPI IDs, Names, Locations) from raw text.
### Ticket 3.2: Wire Agent Orchestration Circuit
**Context:**
Linking the various serverless steps together using Catalyst Circuits.
**Implementation Steps:**
Define a Circuit JSON structure.Step 1: Execute Planner Agent.Switch State: If intent == FIR_SEARCH, route to Search Function. If intent == POLICY, route to RAG function.Ensure the state payload is correctly mapped between transitions.
**Acceptance Criteria:**
- [ ] Circuit successfully deployed to Catalyst.- [ ] Payload executes through the circuit path correctly without dropping state variables.
### Ticket 3.3: Build Analytics Aggregation APIs
**Context:**
Provide data points for the high-level SP/IGP dashboards.
**Implementation Steps:**
Create Advanced I/O function GET /api/analytics.Write ZCQL queries utilizing aggregations: SELECT CrimeMajorHeadID, COUNT(*) FROM CaseMaster GROUP BY CrimeMajorHeadID.Format output to match the 5_analytics_dashboard API contract.
**Acceptance Criteria:**
- [ ] API returns accurate aggregated counts.- [ ] JSON structure matches the frontend contract exactly.
### Ticket 3.4: Implement D3/Graph UI
**Context:**
Visualizing the complex criminal networks computed by the Job Function.
**Implementation Steps:**
Integrate D3.js (or an equivalent like React Flow / Vis.js).Create a canvas component that accepts the nodes and edges arrays from the API contract.Implement basic physics/force-simulation so nodes spread out logically.Add click-handlers to nodes to display metadata (e.g., clicking an Accused node shows their Age and PersonID).
**Acceptance Criteria:**
- [ ] Graph renders without crashing on payloads of 100+ nodes.- [ ] Nodes are visually distinguishable (e.g., Cases are blue squares, Accused are red circles).
### Ticket 3.5: Enforce XAI Source Lineage
**Context:**
To satisfy law enforcement standards, every AI claim must trace back to a specific database record.
**Implementation Steps:**
Update the final generation prompt.Instruct the model: "For every fact generated, you must append an object to the source_nodes array containing the CaseMasterID or AccusedMasterID."Parse the LLM output in the backend and strictly validate that the JSON contains the source_nodes array before sending it to the client.
**Acceptance Criteria:**
- [ ] LLM output strictly adheres to the XAI schema.- [ ] Fallback logic triggers if the LLM hallucinates a bad JSON structure.
## EPIC 4: Hardening & Export
### Ticket 4.1: Build Local PDF Export
**Context:**
Investigators need to export the session to a PDF. Doing this on the backend requires heavy headless browsers (Puppeteer) which exceed Catalyst limits. We must do it on the client.
**Implementation Steps:**
Install jspdf and html2canvas in the frontend.Add an "Export Report" button to the Chat/Dashboard UI.On click, capture the DOM of the conversation history or analytics dashboard.Convert to PDF and trigger local browser download.
**Acceptance Criteria:**
- [ ] PDF generates entirely on the client side.- [ ] File downloads successfully with legible text formatting.
### Ticket 4.2: Implement Rate Limit Fallbacks
**Context:**
If QuickML rate limits are exceeded, the API returns HTTP 429. The frontend must handle this gracefully.
**Implementation Steps:**
Add an Axios response interceptor (or fetch wrapper) in the frontend.If status === 429 or status === 504, prevent the app from crashing.Render a toast notification or inline UI message: "System Busy - Re-routing Intel. Please try again in 30 seconds."
**Acceptance Criteria:**
- [ ] 429 errors are caught explicitly.- [ ] UI remains stable and usable after a failure.
### Ticket 4.3: Configure CORS Whitelisting
**Context:**
Browser security will block the Slate frontend from talking to the Advanced I/O backend if CORS is not explicitly whitelisted in production.
**Implementation Steps:**
Deploy the Slate frontend and copy the production URL.Navigate to Cloudscale -> Authentication -> Whitelisting in the Catalyst console.Add the Slate URL to the permitted origins list.
**Acceptance Criteria:**
- [ ] Production frontend successfully executes OPTIONS preflight requests.- [ ] Zero CORS errors in the browser console.
### Ticket 4.4: E2E Golden Path Testing
**Context:**
The final sprint objective. We must guarantee the exact presentation script works flawlessly.
**Implementation Steps:**
Write down the exact query the presenter will type (e.g., "Find all cyber fraud linked to UPI-XXXX").Trace the data path: Ensure the Faker script generated valid data for that exact UPI. Ensure the Job Function traverses it correctly. Ensure the LLM summarizes it accurately.Run the presentation sequence 10 times in a row. Fix any intermittent bugs.
**Acceptance Criteria:**
- [ ] The presentation script executes without failure.- [ ] Latency meets the goals defined in the PRD.