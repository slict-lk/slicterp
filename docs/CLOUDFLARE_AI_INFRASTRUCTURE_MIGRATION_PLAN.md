# Cloudflare AI Infrastructure Migration Plan

## Objective

Replace the ERP's direct Ollama and Groq dependencies with a tenant-safe,
observable Cloudflare AI platform that provides:

- Cloudflare Workers AI for model inference
- Cloudflare AI Gateway for logging, rate limits, retries, and fallback
- Cloudflare AI Search or Vectorize for retrieval
- Hybrid keyword and semantic search
- Reranking and grounded context injection
- ERP terminology support
- Verifiable citations in every retrieval-grounded response
- An optional FastAPI service for ingestion, evaluation, and Python workloads

The migration must preserve the existing AI Assistant, Organizational
Intelligence AI, model registry, approvals, audit trail, and tenant boundaries.

## Current Repository Assessment

The ERP currently has several partially overlapping AI paths:

- `src/lib/ai/chat-agent.ts` routes requests through Gemini, then Groq, then
  Ollama.
- `src/lib/ai/erp-tasks.ts` calls Groq directly for invoices, forecasts,
  reports, and SQL generation.
- `src/app/api/ai/groq/**` exposes Groq-specific routes.
- `src/app/api/ai/ollama/**`, `src/lib/ai/local-engine.ts`, and
  `src/lib/ai/ollama-client.ts` expose Ollama-specific behavior.
- `src/lib/intelligence/ai/intelligence-ai-service.ts` correctly builds
  grounded ERP context, but sends generation through the same provider-specific
  chat agent.
- `LanguageModel.provider` does not currently include `CLOUDFLARE`.
- Model API keys can currently be stored in the database. Cloudflare platform
  credentials should instead be deployment secrets, not tenant-visible model
  records.
- There is no vector ingestion pipeline, hybrid retrieval service, citation
  contract, Wrangler project, or FastAPI service in the repository.

This means the migration is not simply replacing one URL. The provider,
retrieval, grounding, and citation concerns must first be separated.

## Recommended Target Architecture

```text
ERP Web UI
   |
   v
Next.js authenticated AI APIs
   |- verify user, tenant, permissions, readiness, and policy
   |- execute approved ERP tools against PostgreSQL
   |
   v
Shared AI Orchestrator
   |- provider router
   |- retrieval decision
   |- context budget and injection
   |- citation validation
   |- audit and usage recording
   |
   +--> Cloudflare AI Gateway
   |       |
   |       +--> Workers AI generation model
   |
   +--> Cloudflare AI Search / Vectorize
           |- hybrid retrieval
           |- tenant metadata filtering
           |- query rewriting
           |- reranking
           |- source chunks and metadata

FastAPI Connector
   |- batch ingestion and document normalization
   |- ERP glossary management
   |- evaluation datasets and quality scoring
   |- optional Python-only ML processing
```

## Recommended Model Stack

The ERP should use a small model stack rather than forcing one model to perform
generation, embeddings, and reranking.

### Default Production Stack

| Responsibility | Recommended model | Reason |
| --- | --- | --- |
| General ERP chat, summaries, tool selection, and grounded answers | `@cf/zai-org/glm-4.7-flash` | Strong cost-to-capability balance, 131K context, multilingual support, reasoning, and function calling |
| Embeddings | `@cf/baai/bge-m3` | Low-cost multilingual embedding model suitable for ERP terminology and retrieval |
| Reranking | `@cf/baai/bge-reranker-base` | Cloudflare AI Search-supported reranker that improves evidence ordering at very low cost |
| Exact ERP codes, GRNs, T-codes, SKUs | AI Search keyword/BM25 retrieval | Exact identifiers should not depend only on embeddings |
| Difficult/high-risk requests | Escalation model selected after evaluation | Expensive reasoning models should be used only when the default model fails policy or confidence checks |

Current Workers AI pricing at the time of this plan:

- `GLM-4.7-Flash`: $0.060 per million input tokens and $0.400 per million
  output tokens.
- `BGE-M3`: $0.012 per million input tokens.
- `BGE-Reranker-Base`: $0.003 per million input tokens.

For a typical request using approximately 2,000 input tokens and 500 output
tokens, GLM generation costs roughly `$0.00032` before retrieval and platform
costs. Actual costs must be measured through AI Gateway because prompt length,
query rewriting, retrieval, and output length vary.

### Why Not Use One Large Model For Everything?

- `Llama-3.3-70B-FP8-Fast` is capable but substantially more expensive and has
  only a 24K context window in AI Search.
- Small models are cheaper, but may be less reliable for tool selection,
  structured output, and executive explanations.
- Expensive reasoning models should be reserved for explicitly approved
  high-complexity requests instead of every chat interaction.

### Required Evaluation Before Final Approval

The recommendation is the starting configuration, not an assumption of model
quality. Compare at least:

- `@cf/zai-org/glm-4.7-flash`
- `@cf/qwen/qwen3-30b-a3b-fp8`
- `@cf/google/gemma-4-26b-a4b-it` for direct Workers AI generation where
  supported

Run the ERP evaluation set against all candidates and select the default only
after measuring:

- factual accuracy
- citation faithfulness
- function/tool selection accuracy
- structured JSON validity
- English, Sinhala, and Tamil quality where required
- latency
- cost per successful answer

Recommended approval rule: choose `GLM-4.7-Flash` unless another candidate
improves successful-answer quality enough to justify its additional cost or
limitations.

### Important Boundary

Live transactional answers such as current stock, invoice totals, employee
records, and project status must continue to use authorized ERP functions and
PostgreSQL queries. They must not be answered from stale vectors.

Vector search should initially cover:

- ERP manuals and operating procedures
- tenant-uploaded policies and documents
- product and module documentation
- approved knowledge articles
- ERP glossary and terminology
- historical explanations that are explicitly safe to index

## Requirement Mapping

### Cloudflare Workers AI Setup And LLM Configuration

Create one Cloudflare provider adapter behind a shared provider interface.
Workers AI supports OpenAI-compatible chat and embedding endpoints, allowing
the existing OpenAI-style client patterns to be reused.

Do not hardcode the final model before evaluation. Benchmark candidate Workers
AI models for:

- ERP terminology accuracy
- function/tool selection
- JSON/structured output reliability
- Sinhala/Tamil/English requirements
- latency and cost
- citation-following behavior

### Migrate From Ollama To Cloudflare

Cloudflare becomes the default hosted provider. Ollama remains behind a feature
flag during migration and is removed only after the production acceptance gate
passes.

Replace Ollama-specific health indicators with provider-neutral health,
latency, failure-rate, and model-availability indicators.

### Replace Groq Endpoints With Cloudflare

Do not rewrite each Groq route with Cloudflare-specific code. First migrate
`erp-tasks.ts` and chat generation to the shared provider interface.

Keep existing Groq route paths temporarily as compatibility adapters that call
the provider-neutral service. Deprecate and remove those paths after the
frontend and integrations stop using them.

### Vector Storage

Use one of these strategies:

1. **AI Search managed retrieval**: quickest route to managed indexing, hybrid
   search, metadata filters, query rewriting, and reranking.
2. **Vectorize with custom retrieval orchestration**: greater control, but the
   team must build keyword search, score fusion, reranking, ingestion, and
   citation assembly.

Recommended first implementation: AI Search pilot, with a production-readiness
review because AI Search is currently a beta product.

Every indexed item must contain tenant-safe metadata:

```json
{
  "tenantId": "tenant-id",
  "module": "inventory",
  "sourceType": "procedure",
  "sourceId": "document-id",
  "title": "Goods Received Note Procedure",
  "version": "3",
  "accessScope": "inventory:view",
  "updatedAt": "2026-06-13T00:00:00.000Z"
}
```

Every retrieval request must filter by `tenantId` and authorized scope.

### Hybrid Search

Use hybrid search because ERP queries frequently combine meaning with exact
identifiers:

- "How do I reverse a GRN?"
- "Find SKU AX-1104"
- "What does T-code MIGO do?"

Semantic search understands intent. Keyword/BM25 search protects exact
abbreviations, codes, SKUs, document numbers, and error messages. Results
should be fused and reranked before context injection.

### ERP Terms

Create a governed ERP glossary, not only a larger system prompt.

Each term should include:

- canonical term
- acronym and aliases
- module
- definition
- related terms
- tenant-specific overrides
- source reference
- version and approval status

Example:

```json
{
  "canonicalTerm": "Goods Received Note",
  "aliases": ["GRN", "goods receipt"],
  "module": "inventory",
  "definition": "A record confirming receipt of goods from a supplier.",
  "relatedTerms": ["purchase order", "stock receipt"],
  "sourceId": "inventory-manual-v3"
}
```

The retrieval layer should expand recognized aliases while retaining the
original exact term for keyword matching.

### Reranking And Context Injection

Retrieval pipeline:

1. Validate tenant, user, module permission, and requested scope.
2. Normalize and classify the question.
3. Expand approved ERP glossary terms.
4. Run hybrid retrieval with strict tenant metadata filtering.
5. Rerank the candidate chunks.
6. Reject weak results below the configured threshold.
7. Inject only the top evidence within a token budget.
8. Generate an answer that references evidence IDs.
9. Validate citations before returning the response.

Never inject unrestricted raw ERP records or cross-tenant content.

### Source Citations

All grounded responses should use a standard contract:

```ts
interface GroundedAIResponse {
  answer: string;
  citations: Array<{
    citationId: string;
    sourceId: string;
    title: string;
    sourceType: string;
    excerpt: string;
    score: number;
    url?: string;
  }>;
  retrieval: {
    mode: 'hybrid' | 'keyword' | 'vector' | 'none';
    reranked: boolean;
    resultCount: number;
  };
  model: string;
  traceId: string;
  warnings: string[];
}
```

Cloudflare retrieval returns source chunk keys, text, metadata, and scoring
details. The ERP must build and validate the final citation list. An answer
must not claim a citation that was not present in the retrieved evidence.

### FastAPI Connecting Layer

FastAPI is useful when the team needs Python libraries or ML workflows. It
should initially handle:

- document parsing and normalization
- batch ingestion and re-indexing
- glossary ingestion
- evaluation jobs
- offline model-quality tests
- Python-specific ML processing

It should not automatically sit in the synchronous chat request path. Adding
Next.js -> FastAPI -> Cloudflare to every request creates another deployment,
authentication boundary, latency source, and failure point.

If the team lead requires FastAPI in the live path, define its responsibility
explicitly and protect it with service authentication, tenant claims,
timeouts, retries, idempotency, and audit logging.

## Proposed Repository Structure

```text
src/lib/ai/providers/
  types.ts
  provider-router.ts
  cloudflare-provider.ts
  google-provider.ts
  ollama-provider.ts            # temporary fallback

src/lib/ai/retrieval/
  types.ts
  retrieval-service.ts
  cloudflare-ai-search.ts
  context-builder.ts
  citation-validator.ts
  erp-glossary.ts

src/lib/ai/orchestration/
  grounded-completion.ts
  tool-execution.ts
  safety-policy.ts

workers/erp-ai-gateway/
  wrangler.jsonc
  src/index.ts

services/ai-connector/
  app/main.py
  app/ingestion/
  app/evaluation/
  tests/
```

## Database And Configuration Changes

- Add `CLOUDFLARE` to `ModelProvider` through an additive Prisma migration.
- Add models for indexed sources, ingestion jobs, glossary terms, retrieval
  traces, and response citations.
- Store Cloudflare account ID, API token, gateway ID, and Worker secrets only
  in deployment secrets.
- Store provider model IDs and safe tuning options in `LanguageModel`.
- Do not store shared Cloudflare API tokens in `LanguageModel.apiKey`.
- Add tenant-configurable retrieval thresholds while enforcing platform-level
  minimum safety limits.

Suggested environment variables:

```text
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_AI_GATEWAY_ID=
CLOUDFLARE_WORKERS_AI_MODEL=
CLOUDFLARE_EMBEDDING_MODEL=
CLOUDFLARE_AI_SEARCH_INSTANCE=
AI_PROVIDER_DEFAULT=CLOUDFLARE
AI_OLLAMA_FALLBACK_ENABLED=false
AI_GROQ_COMPATIBILITY_ENABLED=false
FASTAPI_CONNECTOR_URL=
FASTAPI_CONNECTOR_TOKEN=
```

## Delivery Phases

### Phase 0 - Decisions, Security, And Baseline

- Confirm Cloudflare account, environments, ownership, billing, and secrets.
- Decide AI Search pilot versus custom Vectorize retrieval.
- Decide whether FastAPI is ingestion-only or part of live requests.
- Build a golden ERP evaluation dataset before changing providers.
- Record current Groq/Ollama answer quality, latency, and failure rate.

Gate: architecture decision record approved and baseline tests available.

### Phase 1 - Provider Abstraction And Workers AI

- Introduce the provider interface and Cloudflare provider.
- Route normal chat and Organizational Intelligence generation through it.
- Add Cloudflare to model registry and provider-neutral health UI.
- Run Cloudflare in shadow mode beside the current provider.
- Keep current provider rollback flags.

Gate: Cloudflare passes tool-calling, structured-output, tenant, latency, and
quality tests without changing existing UI contracts.

### Phase 2 - Knowledge Ingestion And Vector Storage

- Build source registry and ingestion jobs.
- Index approved documents with strict tenant metadata.
- Build glossary ingestion for GRN, T-codes, SKUs, and module terminology.
- Add deletion, versioning, re-indexing, and stale-source handling.
- Implement the FastAPI ingestion/evaluation service if approved.

Gate: ingestion is repeatable, tenant-isolated, auditable, and reversible.

### Phase 3 - Hybrid Retrieval, Reranking, And Citations

- Implement hybrid retrieval and query expansion.
- Enable reranking and evidence thresholds.
- Build context injection with token budgets.
- Add citation response contract and citation UI.
- Log retrieval traces without leaking sensitive content.

Gate: all grounded answers have validated citations and zero cross-tenant
results in automated isolation tests.

### Phase 4 - Endpoint Migration And Cutover

- Convert Groq task routes into provider-neutral compatibility routes.
- Update model settings, status pages, environment docs, and onboarding.
- Disable Groq and Ollama by environment after parity review.
- Remove legacy code only after a monitored rollback period.

Gate: production metrics remain healthy through the agreed observation period.

### Phase 5 - Quality, Cost, And Operations

- Add AI Gateway rate limits, caching, retries, and fallback.
- Add dashboards for model usage, latency, cost, retrieval quality, and errors.
- Add scheduled evaluation against the golden ERP question set.
- Add incident response and provider rollback runbooks.

Gate: operational owners can detect, explain, and roll back AI failures.

## Required Test Suites

- Provider contract tests for Cloudflare, fallback, streaming, JSON, and tools
- Cross-tenant retrieval isolation tests
- Permission-filtered retrieval tests
- ERP glossary tests for GRN, T-codes, SKUs, and aliases
- Exact identifier tests that prove keyword search is retained
- Citation validity and unsupported-claim tests
- Prompt injection tests against indexed documents
- Stale/deleted source tests
- Retrieval threshold and no-answer tests
- FastAPI service authentication and tenant-claim tests
- Load, timeout, retry, rate-limit, and provider-failure tests
- Cost and token-budget regression tests

## First Sprint

The safest first sprint is intentionally small:

1. Create the provider interface and Cloudflare provider adapter.
2. Add Cloudflare environment configuration and secret documentation.
3. Route one non-critical AI endpoint through Cloudflare behind a feature flag.
4. Build 30-50 ERP evaluation questions including GRN, T-code, SKU, and
   multi-tenant safety cases.
5. Compare Cloudflare output against the current provider.
6. Approve the retrieval and FastAPI architecture before building vector
   ingestion.

Do not begin by deleting Ollama/Groq routes or bulk-indexing ERP data.
