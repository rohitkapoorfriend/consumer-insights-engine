import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { databaseConfigFactory } from './common/config/database.config';
import appConfig from './common/config/app.config';
import { FeedbackModule } from './feedback/feedback.module';
import { EmbeddingModule } from './embedding/embedding.module';
import { InsightsModule } from './insights/insights.module';
import { WebhookModule } from './webhook/webhook.module';
import { JobsModule } from './jobs/jobs.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: databaseConfigFactory,
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    FeedbackModule,
    EmbeddingModule,
    InsightsModule,
    WebhookModule,
    JobsModule,
    HealthModule,
  ],
})
export class AppModule {}
