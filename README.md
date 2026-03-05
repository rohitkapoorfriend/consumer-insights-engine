# Consumer Insights Engine

NestJS microservice that ingests customer feedback from multiple sources (API, webhooks, bulk CSV), generates OpenAI embeddings, and runs AI-powered analysis -- semantic search, theme extraction, sentiment scoring, and summarization.

Built on top of TimescaleDB with pgvector for vector similarity search, BullMQ + Redis for async job processing, and LangChain for chaining LLM prompts.

## Architecture

```
                        +------------------+
  Webhook / API  --->   |  NestJS Gateway  |  ---> BullMQ Queue
                        +------------------+           |
                               |                       v
                          PostgreSQL            Embedding Worker
                         (pgvector)            (OpenAI + LangChain)
                               ^                       |
                               +-----------+-----------+
                                           |
                                     Redis (BullMQ)
```

**Modules:**
- `feedback` -- CRUD + bulk ingestion, queues embedding jobs
- `embedding` -- BullMQ processor, calls OpenAI embeddings API, stores vectors
- `insights` -- semantic search (pgvector cosine distance), theme extraction, summaries, sentiment aggregation
- `webhook` -- register external sources with HMAC secrets, verify + ingest payloads
- `jobs` -- check status/progress of async processing jobs
- `health` -- liveness probe for DB + Redis

## Getting started

### Prerequisites

- Node.js >= 18
- Docker & Docker Compose (for Postgres + Redis)
- OpenAI API key

### Setup

```bash
# clone and install deps
git clone <repo-url>
cd consumer-insights-engine
npm install

# copy env file and fill in your OpenAI key
cp .env.example .env

# spin up TimescaleDB + Redis
docker-compose up -d

# the init-db.sql script runs automatically on first boot and
# creates the feedback table with pgvector extension

# start dev server
npm run start:dev
```

API docs available at `http://localhost:3000/api/docs` (Swagger UI).

### Running tests

```bash
npm test              # unit tests
npm run test:cov      # with coverage report
```

## API overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/feedback/ingest` | Submit a single feedback entry |
| POST | `/api/feedback/bulk` | Bulk ingest (array of entries) |
| GET | `/api/feedback/:id` | Fetch feedback by ID |
| GET | `/api/feedback?page=1&limit=20` | Paginated list |
| GET | `/api/insights/search?q=...` | Semantic vector search |
| GET | `/api/insights/themes?from=...&to=...` | Extract recurring themes |
| GET | `/api/insights/summary?topic=...` | Summarize feedback on a topic |
| GET | `/api/insights/sentiment?source=...` | Sentiment breakdown |
| POST | `/api/webhooks/register` | Register a webhook source |
| POST | `/api/webhooks/receive/:source` | Receive webhook payload |
| GET | `/api/jobs/:jobId/status` | Check processing job status |
| GET | `/api/health` | Health check |

## Design decisions

- **pgvector over Pinecone/Weaviate**: keeps everything in one DB, simpler ops, good enough for < 1M vectors. Can always add an IVFFlat index later.
- **BullMQ for async processing**: embedding generation is slow (~200ms per call), so we queue it. Bulk endpoint fans out to a batch job with configurable concurrency.
- **LangChain chains**: each insight type (sentiment, themes, summary) is a separate chain class. Makes it easy to swap models or tweak prompts without touching service logic.
- **HMAC webhook verification**: uses timing-safe comparison to prevent timing attacks on signature validation.

## Project structure

```
src/
  common/
    config/          # app + database config factories
    filters/         # global exception filter
    interceptors/    # request logging
  embedding/         # OpenAI embedding generation + BullMQ processor
  feedback/          # feedback CRUD, DTOs, entity
  health/            # health check endpoint
  insights/
    chains/          # LangChain chains (sentiment, themes, summary)
  jobs/              # job status tracking
  webhook/           # webhook registration + HMAC verification
scripts/
  init-db.sql        # DB schema + pgvector setup
```

## License

MIT
