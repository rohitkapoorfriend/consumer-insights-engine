import { Injectable, Logger, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { createHmac, timingSafeEqual } from 'crypto';
import { FeedbackService } from '../feedback/feedback.service';
import { RegisterWebhookDto } from './dto/register-webhook.dto';
import { Feedback } from '../feedback/entities/feedback.entity';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly webhookSalt: string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly feedbackService: FeedbackService,
    private readonly configService: ConfigService,
  ) {
    const salt = this.configService.get<string>('WEBHOOK_SECRET_SALT');
    if (!salt) {
      throw new Error(
        'WEBHOOK_SECRET_SALT env var is required. Set a strong random value (e.g. openssl rand -hex 32).',
      );
    }
    this.webhookSalt = salt;
  }

  async register(dto: RegisterWebhookDto): Promise<{ name: string }> {
    const hashedSecret = createHmac('sha256', this.webhookSalt).update(dto.secret).digest('hex');
    await this.dataSource.query(
      `INSERT INTO webhook_sources (name, secret_hash) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET secret_hash = $2`,
      [dto.name, hashedSecret],
    );
    this.logger.log(`Webhook source "${dto.name}" registered`);
    return { name: dto.name };
  }

  // timing-safe comparison to prevent timing attacks on sig validation
  async verify(source: string, payload: string, signature: string): Promise<boolean> {
    const result = await this.dataSource.query(
      `SELECT secret_hash FROM webhook_sources WHERE name = $1`,
      [source],
    );

    if (!result.length) {
      throw new NotFoundException(`Webhook source "${source}" not found`);
    }

    const secretHash = result[0].secret_hash as string;
    const expectedSignature = createHmac('sha256', secretHash).update(payload).digest('hex');

    try {
      return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    } catch {
      return false;
    }
  }

  async receive(source: string, body: Record<string, unknown>, signature: string): Promise<Feedback> {
    const payload = JSON.stringify(body);
    const isValid = await this.verify(source, payload, signature);

    if (!isValid) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const text = (body.text as string) || (body.message as string) || JSON.stringify(body);
    const metadata = (body.metadata as Record<string, unknown>) || {};

    return this.feedbackService.create({ text, source, metadata });
  }
}