# Project ASTRA

**Agentic AI Investigation Platform for Karnataka State Police**

Project ASTRA is an AI-powered investigation platform developed for the **KSP Datathon**. Built entirely on **Zoho Catalyst**, it enables investigators to search FIRs using natural language, analyze relationships between entities, and generate explainable AI-assisted investigation summaries.

The platform combines Retrieval-Augmented Generation (RAG), knowledge graph traversal, multilingual speech processing, and serverless computing to reduce investigation time while remaining within the operational constraints of the Catalyst platform.

---

## Features

- Natural language FIR search
- AI-powered investigation assistant
- Relationship graph visualization
- Retrieval-Augmented Generation (RAG)
- Explainable AI summaries with source references
- Kannada speech-to-text and translation pipeline
- Investigation analytics dashboard
- Client-side PDF report generation
- Fully serverless architecture

---

## Architecture

```
                         Client
                            │
                            ▼
                 Catalyst Slate Frontend
                            │
                Async REST + Job Polling
                            │
                            ▼
              Catalyst Advanced I/O APIs
             ┌──────────────┼──────────────┐
             │              │              │
             ▼              ▼              ▼
      Catalyst Data     QuickML APIs   Job Functions
          Store         (LLM / STT)    (Graph Builder)
             │              │              │
             └──────────────┼──────────────┘
                            ▼
                 Stratus Object Storage
```

---

## Technology Stack

### Frontend

- Zoho Catalyst Slate
- React
- D3.js
- jsPDF

### Backend

- Node.js 24
- Catalyst Advanced I/O
- Catalyst Job Functions
- ZCQL
- Catalyst Data Store
- Stratus Object Storage

### AI

- QuickML
- GLM 4.7
- Retrieval-Augmented Generation (RAG)
- Speech-to-Text
- Translation
- Catalyst Circuits

### Data

- Catalyst Data Store
- ZCQL
- Adjacency List (Edges Table)
- Python Faker (Synthetic Data)
- Stratus Object Storage

---

## Repository Structure

```
.
├── frontend/
├── backend/
├── ai/
├── scripts/
│   ├── faker/
│   └── schema/
├── docs/
├── assets/
├── catalyst.json
├── catalyst-config.json
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 24+
- Zoho Catalyst CLI
- Zoho Catalyst Project
- QuickML Account

### Clone the Repository

```bash
git clone https://github.com/<organization>/astra.git
cd astra
```

### Install Dependencies

```bash
npm install
```

### Configure Environment

Create a local environment file.

```bash
cp .env.example .env
```

Populate the required Catalyst and QuickML credentials.

### Run Locally

```bash
catalyst serve
```

---

## Deployment

Deploy using the Catalyst CLI.

```bash
catalyst deploy
```

Before deploying, ensure that:

- Catalyst Environment Variables are configured.
- QuickML OAuth connection is available.
- Production CORS whitelist is configured.
- Required Data Store tables exist.

---

## Design Principles

Project ASTRA is designed around the constraints of the Catalyst serverless platform.

### Asynchronous Processing

Long-running operations are executed using Catalyst Job Functions. REST endpoints return `HTTP 202 Accepted`, and the client polls for completion.

### Graph Traversal

Relationship graphs are generated from an Adjacency List (`Edges` table) to avoid expensive multi-table joins.

### Stateless APIs

All API handlers are stateless to support automatic scaling and serverless execution.

### Resilience

External AI requests implement retry logic with exponential backoff to handle rate limiting.

---

## Security

Project configuration files are committed:

```
catalyst.json
catalyst-config.json
```

Sensitive credentials must **never** be committed.

Ignored files include:

```
.env
.env.local
.env.production
```

Secrets are managed using Catalyst Environment Variables.

---

## API Overview

| Endpoint | Description |
|----------|-------------|
| `POST /api/fir/search` | Natural language FIR search |
| `POST /api/chat` | Investigation assistant |
| `POST /api/graph` | Generate relationship graph |
| `GET /api/status/:jobId` | Poll asynchronous jobs |
| `GET /api/analytics` | Investigation analytics |

---

## Documentation

Additional documentation is available under the `docs/` directory.

- Architecture
- Deployment Guide
- API Documentation
- Development Guide
- Roadmap

---

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Commit your changes.
4. Open a Pull Request.
5. Wait for review before merging.

Branch naming convention:

```
feature/ASTRA-101-fir-search
bugfix/ASTRA-205-auth
docs/update-readme
```

Commit message convention:

```
feat:
fix:
docs:
refactor:
test:
build:
chore:
```

---

## License

This repository contains the MVP implementation developed for the Karnataka State Police Datathon.

---

## Acknowledgements

- Zoho Catalyst
- QuickML
- Karnataka State Police Datathon Organizers

---

**Project ASTRA** demonstrates how Agentic AI, serverless computing, and knowledge graph techniques can be combined to build a scalable investigation platform for modern law enforcement.
