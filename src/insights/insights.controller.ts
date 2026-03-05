import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { InsightsService } from './insights.service';

@ApiTags('Insights')
@Controller('insights')
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get('search')
  @ApiOperation({ summary: 'Semantic vector search across feedback' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max results' })
  @ApiResponse({ status: 200, description: 'Search results with similarity scores' })
  async search(@Query('q') q: string, @Query('limit') limit = 10) {
    return this.insightsService.semanticSearch(q, +limit);
  }

  @Get('themes')
  @ApiOperation({ summary: 'Extract recurring themes from feedback in a date range' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO)' })
  @ApiResponse({ status: 200, description: 'Array of identified themes' })
  async themes(@Query('from') from: string, @Query('to') to: string) {
    return this.insightsService.extractThemes(from, to);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Generate a summary of feedback about a topic' })
  @ApiQuery({ name: 'topic', required: true, description: 'Topic to summarize' })
  @ApiResponse({ status: 200, description: 'Summary text' })
  async summary(@Query('topic') topic: string) {
    return { summary: await this.insightsService.generateSummary(topic) };
  }

  @Get('sentiment')
  @ApiOperation({ summary: 'Sentiment breakdown aggregation' })
  @ApiQuery({ name: 'source', required: false, description: 'Filter by feedback source' })
  @ApiResponse({ status: 200, description: 'Sentiment counts' })
  async sentiment(@Query('source') source?: string) {
    return this.insightsService.sentimentBreakdown(source);
  }
}
