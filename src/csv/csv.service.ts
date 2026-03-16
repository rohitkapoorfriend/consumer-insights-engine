import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { FeedbackService } from '../feedback/feedback.service';
import { CreateFeedbackDto } from '../feedback/dto/create-feedback.dto';

interface CsvRow {
  text?: string;
  source?: string;
  metadata?: string;
  [key: string]: string | undefined;
}

const REQUIRED_HEADERS = ['text'];
const MAX_ROWS = 5_000;

@Injectable()
export class CsvService {
  private readonly logger = new Logger(CsvService.name);

  constructor(private readonly feedbackService: FeedbackService) {}

  async import(buffer: Buffer): Promise<{ jobId: string; count: number; skipped: number }> {
    let rows: CsvRow[];

    try {
      rows = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true, // handle Excel-exported CSVs
      }) as CsvRow[];
    } catch (err) {
      throw new BadRequestException(`CSV parse error: ${(err as Error).message}`);
    }

    if (!rows.length) {
      throw new BadRequestException('CSV file is empty');
    }

    this.validateHeaders(Object.keys(rows[0]));

    if (rows.length > MAX_ROWS) {
      throw new BadRequestException(
        `CSV exceeds maximum row limit of ${MAX_ROWS}. Got ${rows.length} rows.`,
      );
    }

    const { valid, skipped } = this.parseRows(rows);

    if (!valid.length) {
      throw new BadRequestException('No valid rows found in CSV (all rows missing "text" column)');
    }

    this.logger.log(`CSV import: ${valid.length} valid rows, ${skipped} skipped`);

    const result = await this.feedbackService.createBulk(valid);
    return { ...result, skipped };
  }

  private validateHeaders(headers: string[]): void {
    const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
    if (missing.length) {
      throw new BadRequestException(
        `CSV missing required columns: ${missing.join(', ')}. Got: ${headers.join(', ')}`,
      );
    }
  }

  private parseRows(rows: CsvRow[]): { valid: CreateFeedbackDto[]; skipped: number } {
    const valid: CreateFeedbackDto[] = [];
    let skipped = 0;

    for (const row of rows) {
      const text = row.text?.trim();
      if (!text) {
        skipped++;
        continue;
      }

      let metadata: Record<string, unknown> = {};
      if (row.metadata) {
        try {
          metadata = JSON.parse(row.metadata) as Record<string, unknown>;
        } catch {
          // silently ignore malformed metadata - still ingest the text
        }
      }

      valid.push({
        text,
        source: row.source?.trim() || 'csv',
        metadata,
      });
    }

    return { valid, skipped };
  }
}