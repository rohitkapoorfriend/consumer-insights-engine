import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmbeddingService } from './embedding.service';
import { SentimentChain } from '../insights/chains/sentiment.chain';
import { Feedback } from '../feedback/entities/feedback.entity';

@Processor('embedding')
export class EmbeddingProcessor extends WorkerHost {
  private readonly logger = new Logger(EmbeddingProcessor.name);

  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly sentimentChain: SentimentChain,
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'process-single') {
      await this.processSingle(job.data.feedbackId);
    } else if (job.name === 'process-bulk') {
      await this.processBulk(job.data.feedbackIds, job);
    }
  }

  private async processSingle(feedbackId: string): Promise<void> {
    try {
      const feedback = await this.feedbackRepository.findOneBy({ id: feedbackId });
      if (!feedback) {
        this.logger.warn(`Feedback ${feedbackId} not found, skipping`);
        return;
      }

      const embedding = await this.embeddingService.generateEmbedding(feedback.text);
      await this.embeddingService.storeEmbedding(feedbackId, embedding);

      const sentimentResult = await this.sentimentChain.analyze(feedback.text);
      await this.feedbackRepository.update(feedbackId, {
        sentiment: sentimentResult.sentiment,
        sentimentScore: sentimentResult.score,
        processed: true,
      });

      this.logger.log(`Processed feedback ${feedbackId}`);
    } catch (error) {
      this.logger.error(`Failed to process feedback ${feedbackId}`, (error as Error).stack);
      throw error;
    }
  }

  private async processBulk(feedbackIds: string[], job: Job): Promise<void> {
    const concurrencyLimit = 3;
    for (let i = 0; i < feedbackIds.length; i += concurrencyLimit) {
      const batch = feedbackIds.slice(i, i + concurrencyLimit);
      await Promise.all(batch.map((id) => this.processSingle(id)));
      await job.updateProgress(Math.round(((i + batch.length) / feedbackIds.length) * 100));
    }
  }
}
