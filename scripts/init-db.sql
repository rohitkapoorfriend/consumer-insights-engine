-- enable pgvector extension for similarity search
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text TEXT NOT NULL,
    source VARCHAR(255) DEFAULT 'manual',
    metadata JSONB DEFAULT '{}',
    embedding vector(1536),
    sentiment VARCHAR(50),
    sentiment_score FLOAT,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_source ON feedback(source);
CREATE INDEX IF NOT EXISTS idx_feedback_sentiment ON feedback(sentiment);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_processed ON feedback(processed) WHERE processed = false;

-- ivfflat index for fast approximate nearest neighbor search
-- run this AFTER you have enough rows (~1000+), otherwise it hurts perf
-- CREATE INDEX idx_feedback_embedding ON feedback USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE IF NOT EXISTS webhook_sources (
    name VARCHAR(255) PRIMARY KEY,
    secret_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
