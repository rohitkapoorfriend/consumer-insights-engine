import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { EmbeddingService } from './embedding.service';
import { EmbeddingProcessor } from './embedding.processor';
import { Feedback } from '../feedback/entities/feedback.entity';
import { SentimentChain } from '../insights/chains/sentiment.chain';

@Module({
  imports: [
    TypeOrmModule.forFeature([Feedback]),
    BullModule.registerQueue({ name: 'embedding' }),
  ],
  providers: [EmbeddingService, EmbeddingProcessor, SentimentChain],
  exports: [EmbeddingService],
})
export class EmbeddingModule {}
