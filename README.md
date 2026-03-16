# Consumer Insights Engine

NestJS microservice that ingests customer feedback from multiple sources 
(REST API, webhooks, bulk CSV), generates OpenAI embeddings, and runs 
AI-powered analysis — semantic search, theme extraction, sentiment scoring, 
and summarization.

Built on TimescaleDB with pgvector for vector similarity search, BullMQ + 
Redis for async job processing, and LangChain for chaining LLM prompts.

## Architecture
```
                        +------------------+
  Webhook / API  --->   |  NestJS Gateway  |  ---> BullMQ Queue
  CSV Upload     --->   |  Rate Limiter    |           |
                        +------------------+           v
                               |                Embedding Worker
                          PostgreSQL            (OpenAI + LangChain)
                         (pgvector)                    |
                               ^                       |
                               +-----------+-----------+
                                           |
                                     Redis (BullMQ)
```

**Modules:**
- `feedback` — CRUD + bulk ingestion, queues embedding jobs
- `csv` — multipart CSV upload, validates headers, fans out to bulk job pipeline
- `embedding` — BullMQ processor, calls OpenAI embeddings API, stores vectors
- `insights` — semantic search (pgvector cosine distance), theme extraction, 
   summaries, sentiment aggregation
- `webhook` — register external sources with HMAC secrets, verify + ingest payloads
- `jobs` — check status/progress of async processing jobs
- `health` — liveness probe for DB + Redis (singleton client, never rate-limited)

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

# install new dependencies
npm install @nestjs/throttler csv-parse
npm install -D @types/multer

# copy env file and fill in your keys
cp .env.example .env

# spin up TimescaleDB + Redis
docker-compose up -d

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
| POST | `/api/csv/import` | Bulk import from CSV file upload |
| GET | `/api/insights/search?q=...` | Semantic vector search |
| GET | `/api/insights/themes?from=...&to=...` | Extract recurring themes |
| GET | `/api/insights/summary?topic=...` | Summarize feedback on a topic |
| GET | `/api/insights/sentiment?source=...` | Sentiment breakdown |
| POST | `/api/webhooks/register` | Register a webhook source |
| POST | `/api/webhooks/receive/:source` | Receive webhook payload |
| GET | `/api/jobs/:jobId/status` | Check processing job status |
| GET | `/api/health` | Health check |

### CSV Import Format

Upload a `.csv` file to `POST /api/csv/import` (multipart/form-data, max 10MB, 
up to 5,000 rows).

| Column | Required | Description |
|--------|----------|-------------|
| `text` | ✅ | Feedback text content |
| `source` | ❌ | Source label (defaults to `csv`) |
| `metadata` | ❌ | JSON string of extra fields |
```csv
text,source,metadata
"Great product but slow shipping",survey,"{""rating"": 4}"
"Love the new UI",app,
"Support team was unhelpful",zendesk,"{""ticket"": ""T-1042""}"
```

## Design decisions

- **pgvector over Pinecone/Weaviate** — keeps everything in one DB, simpler 
  ops, good enough for < 1M vectors. IVFFlat index ready to enable in 
  `init-db.sql` once you hit ~1,000 rows.
- **BullMQ for async processing** — embedding generation is slow (~200ms per 
  call), so we queue it. Bulk endpoint fans out to a batch job with 
  configurable concurrency.
- **LangChain chains** — each insight type (sentiment, themes, summary) is a 
  separate chain class. Easy to swap models or tweak prompts without touching 
  service logic.
- **HMAC webhook verification** — timing-safe comparison prevents timing 
  attacks. Salt is env-driven; app refuses to start without it.
- **Rate limiting via @nestjs/throttler** — three tiers (burst / per-minute / 
  per-hour). Health endpoint is exempt so Kubernetes probes are never blocked.
- **Singleton Redis in HealthService** — earlier version created a new Redis 
  client on every health check request, leaking connections. Now a single 
  client is shared and closed on module destroy.

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | ❌ | `3000` | HTTP port |
| `DB_HOST` | ❌ | `localhost` | Postgres host |
| `DB_PORT` | ❌ | `5432` | Postgres port |
| `DB_USERNAME` | ❌ | `postgres` | Postgres user |
| `DB_PASSWORD` | ❌ | `postgres` | Postgres password |
| `DB_NAME` | ❌ | `consumer_insights` | Database name |
| `REDIS_HOST` | ❌ | `localhost` | Redis host |
| `REDIS_PORT` | ❌ | `6379` | Redis port |
| `OPENAI_API_KEY` | ✅ | — | OpenAI API key |
| `OPENAI_EMBEDDING_MODEL` | ❌ | `text-embedding-3-small` | Embedding model |
| `OPENAI_CHAT_MODEL` | ❌ | `gpt-4o-mini` | Chat model |
| `WEBHOOK_SECRET_SALT` | ✅ | — | HMAC salt (`openssl rand -hex 32`) |

## Project structure
```
src/
  common/
    config/          # app + database config factories
    filters/         # global exception filter
    guards/          # throttler config
    interceptors/    # request logging (globally applied)
  csv/               # CSV file upload + bulk import
  embedding/         # OpenAI embedding generation + BullMQ processor
  feedback/          # feedback CRUD, DTOs, entity
  health/            # health check (singleton Redis client)
  insights/
    chains/          # LangChain chains (sentiment, themes, summary)
  jobs/              # job status tracking
  webhook/           # webhook registration + HMAC verification
scripts/
  init-db.sql        # DB schema + pgvector setup
```

## License

MIT