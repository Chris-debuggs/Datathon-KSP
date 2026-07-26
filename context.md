# Project ASTRA — Context Document

> **Agentic AI Investigation Platform for Karnataka State Police**
> Built for the **KSP Datathon 2026** · Hosted entirely on **Zoho Catalyst**

---

## 1. What We Are Building

Project ASTRA is an **AI-powered Investigation Copilot** that enables Karnataka State Police officers to interact with crime data using natural language. Instead of manually searching multiple databases and correlating evidence across systems, an officer can simply ask:

> *"Show all cyber fraud cases linked to this UPI ID."*

ASTRA will automatically:
- Retrieve matching FIRs from the Data Store
- Discover relationships between suspects, vehicles, phones, bank accounts, and FIRs
- Retrieve relevant evidence from Object Storage
- Use RAG to surface similar historical cases and SOPs
- Generate an investigation summary with recommended next actions
- Display everything via an interactive relationship graph and analytics dashboard

The platform is **not** a simple Q&A chatbot — it is an **Agentic AI** system with autonomous decision-making, stateful multi-turn conversations, and complex task decomposition across multiple specialized agents.

---

## 2. Why We Are Building It

### Current Pain Points (KSP)
| Problem | Impact |
|---------|--------|
| Slow FIR retrieval across fragmented systems | Increased investigation time |
| Manual cross-case relationship analysis | Missed connections between related crimes |
| No conversational search capabilities | Officers must know exact query syntax |
| Time-consuming report generation | Delays in filing and review |
| Poor visibility into cross-jurisdiction patterns | Repeat offenders go unnoticed |

### Primary Goal
**Drastically reduce investigation latency** — the time from FIR logging to apprehending an offender.

### Key Insight from the Datathon Panel
> *The winning solution is not an academic exercise; it will be taken all the way to production deployment to actively empower investigators and senior law enforcement officers.*

---

## 3. Who Is It For

| Role | Primary Use |
|------|-------------|
| **Investigating Officer** | Search FIRs, retrieve evidence, ask investigative questions, generate summaries |
| **Police Inspector** | Monitor station cases, review investigations, track officer workload |
| **Superintendent of Police (SP)** | District-level analytics, crime trends, resource allocation |
| **Senior Officers (DIG / IGP / DGP)** | Statewide dashboards, crime intelligence, strategic insights |

The system must implement **strict role-based access control** matching the KSP hierarchy:
- Ranks: DGP → IGP → DIG → SP
- Administrative Levels: Chief Office → SP Office → Subdivisions → Local Police Stations

---

## 4. MVP Scope

### Included
- Conversational AI Assistant (multi-turn, context-aware)
- Natural Language Crime Search (FIR number, person, phone, Aadhaar, vehicle, bank account, UPI, address, crime type, station, district)
- FIR Summarization (timeline, victims, accused, evidence, witnesses, status, next actions)
- Relationship Graph (interactive graph connecting persons, FIRs, vehicles, phones, accounts, UPIs, addresses, organizations)
- Cyber Fraud Intelligence
- Crime Analytics Dashboard (by district, over time, hotspots, officer workload, repeat offenders, MO patterns, socio-economic correlation)
- Voice Interaction (English & Kannada — Speech-to-Text + Text-to-Speech)
- Evidence Metadata Search (by case, image/audio/video metadata, officer, date)
- AI Investigation Report Generation (client-side PDF via jsPDF)
- Explainable AI — all LLM responses must include `source_nodes` with `fir_id`/`evidence_id` foreign keys rendered as clickable references

### Out of Scope (MVP)
- Live CCTNS integration
- Citizen-facing portal
- Court management
- Biometric authentication
- Production police databases (using synthetic data only)

---

## 5. AI Multi-Agent Architecture

ASTRA uses a multi-agent system where each agent has a specialized role:

```
User Query
    │
    ▼
Conversation Agent ──→ Understands intent, maintains context, handles follow-ups
    │
    ▼
Planner Agent ──→ Decomposes complex requests into subtasks
    │
    ├──→ Crime Search Agent ──→ Queries structured investigation data (ZCQL)
    ├──→ Knowledge Agent ──→ RAG retrieval (FIRs, SOPs, BNSS, historical data)
    ├──→ Relationship Agent ──→ Builds knowledge graph via adjacency list traversal
    ├──→ Analytics Agent ──→ Crime trends, heatmaps, repeat offenders, MO insights
    └──→ Report Agent ──→ Produces structured investigation reports
```

---

## 6. Technology Stack & Architecture

### Platform: Zoho Catalyst (Mandatory)
The **entire** application must be deployed natively on Zoho Catalyst. No external cloud vendors allowed.

### Frontend
- **Catalyst Slate** (SPA hosting) or GitHub-connected CI/CD
- **React** for UI
- **D3.js** for relationship graph visualization
- **jsPDF** for client-side PDF report generation

### Backend
- **Node.js 24** runtime
- **Catalyst Advanced I/O Functions** — serverless APIs (30-second hard timeout)
- **Catalyst Job Functions** — long-running tasks (15-minute timeout window)
- **Catalyst Circuits** — multi-step AI workflow orchestration
- **ZCQL** — structured crime data queries
- **Catalyst Data Store** — relational tables
- **Stratus Object Storage** — unstructured evidence (images, videos, PDFs, audio)

### AI Services
- **QuickML GLM 4.7 Flash** — structured reasoning and data transformations
- **QuickML Qwen 3.6 (Vision)** — multimodal image processing
- **QuickML RAG** — document grounding with indexed PDFs (assigned unique document IDs)
- **QuickML Speech-to-Text** — Kannada/English voice transcription
- **QuickML Text Translation** — Indic language support (Kannada, Hindi, Telugu, Tamil)
- **QuickML Text-to-Audio** — voice response synthesis

### Architecture Diagram
```
                     Client (React on Catalyst Slate)
                              │
                    Async REST + Job Polling
                              │
                              ▼
                Catalyst Advanced I/O APIs
               ┌──────────────┼──────────────┐
               │              │              │
               ▼              ▼              ▼
        Catalyst Data     QuickML APIs   Job Functions
            Store         (LLM / STT)   (Graph Builder)
               │              │              │
               └──────────────┼──────────────┘
                              ▼
                   Stratus Object Storage
```

---

## 7. Critical Platform Constraints

### 30-Second Execution Wall
Advanced I/O Functions have a **hard, unalterable 30-second timeout**. Any LLM pipeline or deep traversal that exceeds this will be killed by the gateway.

### Job Function Workaround (Async Polling Pattern)
For heavy compute (graph traversal, batch summarization, report generation):
1. Client sends request → API returns **HTTP 202 Accepted** with a `job_id`
2. Job Function runs in background (up to **15 minutes**)
3. Results are written to **Stratus Object Storage**
4. Client polls `GET /api/v1/jobs/{job_id}/status` with **exponential backoff**

### Independent Dependency Trees
Each Serverless Function has its own isolated `package.json`. Shared packages must be installed inside each function's `functions/<function_name>/` directory before deployment.

### CORS Configuration
Slate frontend and Serverless Functions run on **independent subdomains**. You must whitelist the frontend URL in `Cloudscale → Authentication → Whitelisting` and enable CORS, or all client fetch calls will fail.

### Data Store Permissions
By default, tables strip application users of write privileges. During seeding/testing, manually grant Insert/Update access in `Cloudscale → Data Store → Scopes and Permissions`. Restrict to Select-only in production.

### Rate Limiting
When API thresholds are hit, a **10-minute lockout** is enforced. Implement robust **exponential backoff** in all QuickML API calls.

### QuickML OAuth
API requests must be signed using programmatic OAuth connections established under `Cloudscale → Connections` with scope `quickml.deployment.read`.

---

## 8. Database Schema

### Core Tables (Catalyst Data Store)

| Table | Purpose |
|-------|---------|
| `Users` | Officer accounts with role/rank |
| `PoliceStations` | Station metadata |
| `FIRs` | First Information Reports |
| `Persons` / `Accused` | Demographics + `employment_status`, `income_bracket`, `urban_density_index` for analytics |
| `Victims` | Victim records |
| `Vehicles` | Vehicle registrations |
| `Phones` | Phone numbers |
| `BankAccounts` | Bank account details |
| `UPIs` | UPI IDs |
| `Evidence` | Evidence metadata (image, audio, video, PDF) |
| `Organizations` | Linked organizations |
| `Conversations` | Chat session history |
| `Edges` | **Adjacency list** — `source_node_id` → `target_node_id` for graph traversal (avoids expensive ZCQL joins) |

### Synthetic Data
- No real production data will be provided (confidentiality constraints)
- Teams must generate **1–2 Lakh (100,000–200,000)** synthetic FIR records
- Data must span **15–16 years** of historical timelines across **1,100 police stations**
- Use **Python Faker** for synthetic data generation

---

## 9. API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/fir/search` | Natural language FIR search |
| `POST /api/chat` | Investigation assistant (multi-turn) |
| `POST /api/graph` | Generate relationship graph |
| `GET /api/status/:jobId` | Poll async job status |
| `GET /api/analytics` | Investigation analytics |

---

## 10. Multilingual Voice Pipeline (5-Stage Chain)

For Kannada voice interaction, stitch together this execution chain within QuickML:

```
1. Speech-to-Text ──→ Ingest Kannada speech audio
2. Translation ──→ Translate Kannada text to English
3. GLM 4.7 / RAG ──→ Execute semantic query against Data Store or indexed PDFs
4. Translation ──→ Translate English response back to Kannada
5. Text-to-Audio ──→ Synthesize Kannada voice response
```

---

## 11. Demo Workflow

**Scenario**: Officer receives a complaint about a suspicious UPI transaction.

1. Officer logs in → JWT authentication + RBAC
2. Officer asks: *"Find all cyber fraud cases linked to UPI ID XXXX."*
3. ASTRA:
   - Searches Data Store for matching FIRs
   - Retrieves related evidence from Stratus
   - Uses RAG to retrieve similar historical cases
   - Builds relationship graph (suspects ↔ bank accounts ↔ phones ↔ FIRs)
   - Generates investigation summary
   - Displays related cases, hotspots, and recommended next actions
4. Officer can ask follow-up questions (multi-turn context retention)
5. Officer downloads PDF investigation report (client-side via jsPDF)

---

## 12. Key Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Asynchronous Processing** | Job Functions + HTTP 202 + polling for long-running ops |
| **Graph Traversal** | Adjacency list (`Edges` table) instead of nested SQL joins |
| **Stateless APIs** | All handlers are stateless for serverless auto-scaling |
| **Resilience** | Retry logic with exponential backoff on all external AI calls |
| **Explainability** | Every LLM response includes source references (`fir_id`, `evidence_id`) |
| **Security** | JWT auth, RBAC, encrypted storage, audit logging, least privilege |

---

## 13. Repository Structure

```
.
├── frontend/          # React app (Catalyst Slate)
├── backend/           # Node.js Advanced I/O + Job Functions
├── ai/                # AI agent logic, prompt templates, RAG config
├── scripts/
│   ├── faker/         # Synthetic data generation (Python)
│   └── schema/        # Database schema definitions
├── docs/              # PRD, transcripts, architecture docs
├── assets/            # Static assets
├── catalyst.json      # Catalyst project config
├── catalyst-config.json  # Environment variables, model params
└── README.md
```

---

## 14. Evaluation Criteria (from Panel)

- **Production readiness** — not throwaway code; must handle 10–100 concurrent sessions
- **Scalability** — horizontal scaling and capacity planning
- **Agentic AI** — not a simple keyword/semantic chatbot; must have autonomous task decomposition
- **Multi-jurisdictional linking** — automatically discover cross-case connections
- **Context retention** — deep multi-turn follow-up without restating context
- **Bilingual support** — English + Kannada (text + voice) from day one
- **Session export** — downloadable PDF conversation logs
- **Explainable AI** — deterministic, clickable source references in every response

---

## 15. Future Enhancements (Post-MVP)

- Live CCTNS / ICJS integration
- Predictive crime analytics
- Image similarity search
- Facial recognition
- Automatic FIR drafting
- Mobile application
- Real-time investigation alerts

---

*This document synthesizes the PRD, Problem Statement Explainer transcript, and Zoho Catalyst Workshop transcript into a single reference for building Project ASTRA.*
