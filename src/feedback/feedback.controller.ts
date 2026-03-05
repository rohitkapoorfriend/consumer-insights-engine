import { Controller, Post, Get, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { BulkFeedbackDto } from './dto/bulk-feedback.dto';

@ApiTags('Feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post('ingest')
  @ApiOperation({ summary: 'Ingest a single feedback entry' })
  @ApiResponse({ status: 201, description: 'Feedback created and queued for processing' })
  async ingest(@Body() dto: CreateFeedbackDto) {
    return this.feedbackService.create(dto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Ingest multiple feedback entries in bulk' })
  @ApiResponse({ status: 201, description: 'Bulk job created' })
  async bulk(@Body() dto: BulkFeedbackDto) {
    return this.feedbackService.createBulk(dto.entries);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single feedback entry by ID' })
  @ApiResponse({ status: 200, description: 'Feedback entry' })
  @ApiResponse({ status: 404, description: 'Feedback not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.feedbackService.findOne(id);
  }

  @Get()
  @ApiOperation({ summary: 'List feedback entries with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'source', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated feedback list' })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('source') source?: string,
  ) {
    return this.feedbackService.findAll(+page, +limit, source);
  }
}
