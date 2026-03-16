import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { FeedbackModule } from '../feedback/feedback.module';

@Module({
  imports: [FeedbackModule],
  controllers: [WebhookController],
  providers: [WebhookService],
  // ConfigService is globally available via ConfigModule.forRoot({ isGlobal: true })
})
export class WebhookModule {}