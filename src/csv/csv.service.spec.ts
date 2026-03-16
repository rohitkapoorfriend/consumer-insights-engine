import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CsvService } from './csv.service';
import { FeedbackService } from '../feedback/feedback.service';

describe('CsvService', () => {
  let service: CsvService;

  const mockFeedbackService = {
    createBulk: jest.fn().mockResolvedValue({ jobId: 'job-1', count: 0 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CsvService,
        { provide: FeedbackService, useValue: mockFeedbackService },
      ],
    }).compile();

    service = module.get<CsvService>(CsvService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const toBuffer = (str: string) => Buffer.from(str, 'utf-8');

  describe('import', () => {
    it('should parse valid CSV and call createBulk', async () => {
      mockFeedbackService.createBulk.mockResolvedValueOnce({ jobId: 'j1', count: 2 });

      const csv = `text,source\n"Great product",survey\n"Needs improvement",app`;
      const result = await service.import(toBuffer(csv));

      expect(result.count).toBe(2);
      expect(result.skipped).toBe(0);
      expect(mockFeedbackService.createBulk).toHaveBeenCalledWith([
        { text: 'Great product', source: 'survey', metadata: {} },
        { text: 'Needs improvement', source: 'app', metadata: {} },
      ]);
    });

    it('should default source to "csv" when column is missing', async () => {
      mockFeedbackService.createBulk.mockResolvedValueOnce({ jobId: 'j2', count: 1 });

      const csv = `text\n"Just the text"`;
      await service.import(toBuffer(csv));

      expect(mockFeedbackService.createBulk).toHaveBeenCalledWith([
        expect.objectContaining({ source: 'csv' }),
      ]);
    });

    it('should skip rows with empty text and count them', async () => {
      mockFeedbackService.createBulk.mockResolvedValueOnce({ jobId: 'j3', count: 1 });

      const csv = `text,source\n"Good",app\n"",app\n,app`;
      const result = await service.import(toBuffer(csv));

      expect(result.skipped).toBe(2);
      expect(mockFeedbackService.createBulk).toHaveBeenCalledWith([
        expect.objectContaining({ text: 'Good' }),
      ]);
    });

    it('should parse valid JSON metadata column', async () => {
      mockFeedbackService.createBulk.mockResolvedValueOnce({ jobId: 'j4', count: 1 });

      const csv = `text,metadata\n"Feedback","{""rating"":5}"`;
      await service.import(toBuffer(csv));

      expect(mockFeedbackService.createBulk).toHaveBeenCalledWith([
        expect.objectContaining({ metadata: { rating: 5 } }),
      ]);
    });

    it('should silently ignore malformed JSON metadata', async () => {
      mockFeedbackService.createBulk.mockResolvedValueOnce({ jobId: 'j5', count: 1 });

      const csv = `text,metadata\n"Feedback","{not-json}"`;
      await service.import(toBuffer(csv));

      expect(mockFeedbackService.createBulk).toHaveBeenCalledWith([
        expect.objectContaining({ metadata: {} }),
      ]);
    });

    it('should throw BadRequestException when CSV is empty', async () => {
      await expect(service.import(toBuffer('text,source\n'))).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when required "text" column is missing', async () => {
      const csv = `message,source\n"oops","app"`;
      await expect(service.import(toBuffer(csv))).rejects.toThrow(
        /missing required columns: text/i,
      );
    });

    it('should throw BadRequestException for invalid CSV', async () => {
      await expect(service.import(toBuffer('not\x00valid\x00csv\x00binary'))).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when all rows have empty text', async () => {
      const csv = `text,source\n"","app"\n"","survey"`;
      await expect(service.import(toBuffer(csv))).rejects.toThrow(/no valid rows/i);
    });
  });
});