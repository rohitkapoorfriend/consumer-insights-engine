import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { databaseConfigFactory } from './common/config/database.config';
import appConfig from './common/config/app.config';
import { throttlerConfig } from './common/guards/throttle.config';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { FeedbackModule } from './feedback/feedback.module';
import { EmbeddingModule } from './embedding/embedding.module';
import { InsightsModule } from './insights/insights.module';
import { WebhookModule } from './webhook/webhook.module';
import { JobsModule } from './jobs/jobs.module';
import { HealthModule } from './health/health.module';
import { CsvModule } from './csv/csv.module';

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
    ThrottlerModule.forRoot(throttlerConfig),
    FeedbackModule,
    EmbeddingModule,
    InsightsModule,
    WebhookModule,
    JobsModule,
    HealthModule,
    CsvModule,
  ],
  providers: [
    // Apply rate limiting globally; use @SkipThrottle() on health endpoints
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Apply request logging globally (was imported but never wired before)
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}