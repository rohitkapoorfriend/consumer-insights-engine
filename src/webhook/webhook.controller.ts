import { Controller, Post, Body, Param, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';
import { RegisterWebhookDto } from './dto/register-webhook.dto';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new webhook source' })
  @ApiResponse({ status: 201, description: 'Webhook source registered' })
  async register(@Body() dto: RegisterWebhookDto) {
    return this.webhookService.register(dto);
  }

  @Post('receive/:source')
  @ApiOperation({ summary: 'Receive a webhook payload from a registered source' })
  @ApiHeader({ name: 'x-webhook-signature', description: 'HMAC signature of the payload' })
  @ApiResponse({ status: 201, description: 'Feedback created from webhook payload' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  async receive(
    @Param('source') source: string,
    @Body() body: Record<string, unknown>,
    @Headers('x-webhook-signature') signature: string,
  ) {
    return this.webhookService.receive(source, body, signature);
  }
}
