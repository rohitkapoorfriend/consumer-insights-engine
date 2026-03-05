import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateFeedbackDto } from './create-feedback.dto';

export class BulkFeedbackDto {
  @ApiProperty({ description: 'Array of feedback entries', type: [CreateFeedbackDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateFeedbackDto)
  entries!: CreateFeedbackDto[];
}
