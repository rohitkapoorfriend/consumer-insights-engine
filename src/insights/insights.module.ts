import { Module } from '@nestjs/common';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';
import { ThemeChain } from './chains/theme.chain';
import { SummaryChain } from './chains/summary.chain';
import { EmbeddingModule } from '../embedding/embedding.module';

@Module({
  imports: [EmbeddingModule],
  controllers: [InsightsController],
  providers: [InsightsService, ThemeChain, SummaryChain],
})
export class InsightsModule {}
