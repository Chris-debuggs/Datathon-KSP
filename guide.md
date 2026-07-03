# Project ASTRA Development Guide

This document outlines the strict execution plan, task segregation, and architectural mandates required to deliver the Project ASTRA MVP within the 15-day sprint constraint. Adherence to these protocols is mandatory to prevent deployment failures on the Zoho Catalyst infrastructure.

## Workload Segregation

The development effort is divided strictly by architectural domains to minimize merge conflicts and context switching.

### Dev 1: Frontend and Client Architecture

Responsible for UI/UX, state management, asynchronous data handling, and local processing logic.

- Initialize Catalyst Slate, frontend scaffolding (React/Vue), and implement JWT Auth UI with role-based routing.
- Construct the primary chat interface, maintaining conversation state locally and handling audio file capture for voice inputs.
- Integrate UI with backend REST APIs for FIR retrieval and dashboard analytics (rendering interactive elements like D3.js relationship graphs).
- Implement the asynchronous polling mechanism. The client must handle HTTP 202 responses, executing exponential backoff against status endpoints to retrieve complex graph payloads without locking the main thread.
- Build rate-limit fallbacks. Intercept HTTP 429 and timeout errors to render a "System Busy" state rather than unhandled client crashes.
- Execute local PDF generation using jspdf to bypass server-side rendering overhead and memory limits.

### Dev 2: Backend, Data Store, and Orchestration

Responsible for API gateways, data modeling, synthetic data generation, and long-running compute tasks.

- Design the Catalyst Data Store schema, including the critical Adjacency List (Edges table) required for graph traversals.
- Write a Python Faker script on Day 1 to generate 150K synthetic, relationally sound records. Execute batch inserts to bypass ZCQL mutation limits.
- Build Advanced I/O serverless functions for sub-2-second CRUD operations and analytics aggregations (heatmaps, MO clusters).
- Implement Catalyst Job Functions to handle heavy graph traversal computations. These jobs operate under a 15-minute timeout window and must write the final JSON payload to Stratus Object Storage.
- Expose HTTP 202 polling endpoints for job tracking.
- Configure strict CORS whitelisting for the Slate frontend and manage dependency isolation across serverless function directories.

### Dev 3: Agentic AI and QuickML Integration

Responsible for LLM orchestration, RAG pipelines, prompt engineering, and multimodal translations.

- Establish OAuth connections with quickml.deployment.read scope and map QuickML API keys via environment variables.
- Build the text-to-ZCQL parsing capabilities and the Planner Agent logic to decompose natural language queries into executable search parameters.
- Implement the multilingual pipeline. Chain Speech-to-Text, Kannada-to-English translation, semantic generation, and reverse translation via QuickML APIs.
- Setup the RAG document index by uploading required SOP and BNSS PDFs to QuickML and mapping their Document IDs.
- Enforce Explainable AI (XAI) lineage through rigid prompt engineering, ensuring the LLM returns deterministic source_nodes arrays containing valid foreign keys.
- Wire Catalyst Circuits to orchestrate the multi-step agent flow (Planner -> Search -> RAG). Handle QuickML rate-limit exceptions defensively within the circuit logic.

## Repository and Workflow Mechanics

Enterprise frameworks will cause delivery failure in a compressed timeline. Implement a streamlined flow.

The repository utilizes two primary branches: **main** (Production/Demo, strictly runnable code) and **develop** (Integration). Developers branch off **develop** using the format `feature/[initials]-[feature-name]`. Direct commits to **main** are prohibited. Branch protection rules must enforce Pull Requests with at least one approving review prior to merging.

Maintain strict hygiene with `.gitignore`. Zoho Catalyst serverless functions operate in isolated directories. Failure to ignore nested `/node_modules/` will commit thousands of binary files, halting CI/CD.

Pull Requests must remain small and localized to single features. Use semantic commit messages (`feat:`, `fix:`, `chore:`) to maintain an auditable log. Work tracking is visualized via a Kanban board containing **Backlog**, **Ready for Dev**, **In Progress**, **Review**, and **Done** columns. Limit Work In Progress (WIP) to one ticket per developer to eliminate context switching.

## Architecture Constraints and Mitigations

The proposed system design faces specific infrastructure limits that require preemptive engineering workarounds.

### Graph Database vs. Relational Bottlenecks

Catalyst Data Store is relational. Executing ZCQL joins across 100K records for multi-degree hops breaches the 30-second serverless execution limit. You must model data using an Adjacency List and compute sub-graphs asynchronously via Job Functions.

### API Gateway Buffering

Serverless API gateways often buffer HTTP responses, neutralizing true Server-Sent Events (SSE) streaming. The frontend architecture must gracefully fallback to aggressive short-polling if the Advanced I/O function buffers tokens.

### Rate-Limit Lockouts

API rate limits trigger a hard 10-minute lockout. Use message-driven queues via Catalyst Circuits and Jobs with enforced concurrency limits. The client UI must handle backoff automatically.

## Security and Configuration Mandates

Failure to configure access control properly will result in exposed data and API exploitation.

### Data Store Scopes

Immediately restrict application user scopes to **"Select"** only. Write operations must be restricted to the admin service account. This prevents unauthorized prompt injection or data mutation.

### OAuth Scoping

QuickML connections must utilize the principle of least privilege, scoped strictly to `quickml.deployment.read`.

### Secrets Management

`PROJECT_ID` and API keys must reside in `catalyst-config.json` and CI/CD environment variables. Never hardcode credentials in frontend source files.

## Execution and Delivery Strategy

Prioritize functional architecture over theoretical purity. If dynamic graph generation via ZCQL proves unoptimized by the midpoint of the sprint, fallback to pre-computing common graph relationships during the data generation phase and store them as static JSON blobs in Stratus.

The final deliverable relies on a specific demonstration path. Over-optimize the AI prompts and database indexes specifically for this exact golden path (e.g., tracing a specific UPI fraud network) to guarantee a deterministic and successful technical presentation.
