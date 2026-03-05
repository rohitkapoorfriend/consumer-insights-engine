import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly redis: Redis;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
    });
  }

  @Get()
  @ApiOperation({ summary: 'Health check for DB and Redis' })
  @ApiResponse({ status: 200, description: 'Service health status' })
  async check() {
    const health: Record<string, string> = { status: 'ok' };

    try {
      await this.dataSource.query('SELECT 1');
      health.database = 'up';
    } catch {
      health.database = 'down';
      health.status = 'degraded';
    }

    try {
      await this.redis.ping();
      health.redis = 'up';
    } catch {
      health.redis = 'down';
      health.status = 'degraded';
    }

    return health;
  }
}
