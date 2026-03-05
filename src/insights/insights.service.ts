import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EmbeddingService } from '../embedding/embedding.service';
import { ThemeChain, Theme } from './chains/theme.chain';
import { SummaryChain } from './chains/summary.chain';
import { Feedback } from '../feedback/entities/feedback.entity';

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly embeddingService: EmbeddingService,
    private readonly themeChain: ThemeChain,
    private readonly summaryChain: SummaryChain,
  ) {}

  // cosine distance via pgvector's <=> operator
  async semanticSearch(query: string, limit: number): Promise<Array<Feedback & { similarity: number }>> {
    const embedding = await this.embeddingService.generateEmbedding(query);
    const vectorStr = `[${embedding.join(',')}]`;

    const results = await this.dataSource.query(
      `SELECT f.*, 1 - (f.embedding <=> $1::vector) AS similarity
       FROM feedback f
       WHERE f.embedding IS NOT NULL
       ORDER BY f.embedding <=> $1::vector
       LIMIT $2`,
      [vectorStr, limit],
    );

    return results;
  }

  async extractThemes(from: string, to: string): Promise<Theme[]> {
    const feedbacks = await this.dataSource.query(
      // TODO: bump this limit or paginate if we start getting way more feedback per range
      `SELECT text FROM feedback WHERE created_at >= $1 AND created_at <= $2 ORDER BY created_at DESC LIMIT 100`,
      [from, to],
    );

    if (feedbacks.length === 0) {
      return [];
    }

    const texts = feedbacks.map((f: { text: string }) => f.text);
    return this.themeChain.extract(texts);
  }

  async generateSummary(topic: string): Promise<string> {
    // uses semantic search to find relevant feedback, then summarizes with LLM
    const results = await this.semanticSearch(topic, 20);
    if (results.length === 0) {
      return 'No relevant feedback found for this topic.';
    }

    const texts = results.map((r) => r.text);
    return this.summaryChain.summarize(topic, texts);
  }

  async sentimentBreakdown(source?: string): Promise<Array<{ sentiment: string; count: number }>> {
    let query = `SELECT sentiment, COUNT(*)::int AS count FROM feedback WHERE sentiment IS NOT NULL`;
    const params: string[] = [];

    if (source) {
      params.push(source);
      query += ` AND source = $1`;
    }

    query += ` GROUP BY sentiment ORDER BY count DESC`;

    return this.dataSource.query(query, params);
  }
}
