import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
  redis: 'up' | 'down';
  uptime: number;
  timestamp: string;
}

@Injectable()
export class HealthService implements OnModuleDestroy {
  private readonly logger = new Logger(HealthService.name);
  private readonly redis: Redis;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      // don't retry forever in health checks - fail fast
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
    });

    this.redis.on('error', (err) => {
      this.logger.warn(`Redis health-check client error: ${err.message}`);
    });
  }

  async check(): Promise<HealthStatus> {
    const result: HealthStatus = {
      status: 'ok',
      database: 'up',
      redis: 'up',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };

    await Promise.allSettled([
      this.dataSource.query('SELECT 1').catch(() => {
        result.database = 'down';
        result.status = 'degraded';
      }),
      this.redis.ping().catch(() => {
        result.redis = 'down';
        result.status = 'degraded';
      }),
    ]);

    return result;
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}