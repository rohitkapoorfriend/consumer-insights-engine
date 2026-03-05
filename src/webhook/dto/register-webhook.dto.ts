import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterWebhookDto {
  @ApiProperty({ description: 'Unique name for the webhook source' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Secret key for HMAC verification' })
  @IsString()
  @IsNotEmpty()
  secret!: string;
}
