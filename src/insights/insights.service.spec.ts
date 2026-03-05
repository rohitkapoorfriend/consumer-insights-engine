import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { InsightsService } from './insights.service';
import { EmbeddingService } from '../embedding/embedding.service';
import { ThemeChain } from './chains/theme.chain';
import { SummaryChain } from './chains/summary.chain';

describe('InsightsService', () => {
  let service: InsightsService;

  const fakeEmbedding = Array(1536).fill(0.01);

  const mockDataSource = {
    query: jest.fn(),
  };

  const mockEmbeddingService = {
    generateEmbedding: jest.fn().mockResolvedValue(fakeEmbedding),
  };

  const mockThemeChain = {
    extract: jest.fn(),
  };

  const mockSummaryChain = {
    summarize: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InsightsService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: EmbeddingService, useValue: mockEmbeddingService },
        { provide: ThemeChain, useValue: mockThemeChain },
        { provide: SummaryChain, useValue: mockSummaryChain },
      ],
    }).compile();

    service = module.get<InsightsService>(InsightsService);
    jest.clearAllMocks();
  });

  describe('semanticSearch', () => {
    it('should generate embedding for query and run vector search', async () => {
      const mockResults = [
        { id: '1', text: 'great app', similarity: 0.92 },
        { id: '2', text: 'terrible support', similarity: 0.87 },
      ];
      mockDataSource.query.mockResolvedValueOnce(mockResults);

      const results = await service.semanticSearch('customer satisfaction', 5);

      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith('customer satisfaction');
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY f.embedding'),
        expect.any(Array),
      );
      expect(results).toHaveLength(2);
    });
  });

  describe('extractThemes', () => {
    it('should return empty array when no feedback in range', async () => {
      mockDataSource.query.mockResolvedValueOnce([]);

      const themes = await service.extractThemes('2025-01-01', '2025-01-31');
      expect(themes).toEqual([]);
      expect(mockThemeChain.extract).not.toHaveBeenCalled();
    });

    it('should pass feedback texts to theme chain', async () => {
      const rows = [{ text: 'slow loading' }, { text: 'love the design' }];
      mockDataSource.query.mockResolvedValueOnce(rows);
      mockThemeChain.extract.mockResolvedValueOnce([
        { name: 'Performance', description: 'Users report slow loading times' },
      ]);

      const themes = await service.extractThemes('2025-01-01', '2025-06-01');

      expect(mockThemeChain.extract).toHaveBeenCalledWith(['slow loading', 'love the design']);
      expect(themes).toHaveLength(1);
    });
  });

  describe('sentimentBreakdown', () => {
    it('should aggregate sentiment counts', async () => {
      mockDataSource.query.mockResolvedValueOnce([
        { sentiment: 'positive', count: 42 },
        { sentiment: 'negative', count: 15 },
      ]);

      const result = await service.sentimentBreakdown();
      expect(result).toHaveLength(2);
    });

    it('should filter by source when provided', async () => {
      mockDataSource.query.mockResolvedValueOnce([]);

      await service.sentimentBreakdown('survey');

      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('AND source = $1'),
        ['survey'],
      );
    });
  });

  describe('generateSummary', () => {
    it('should return fallback when no relevant feedback found', async () => {
      // semanticSearch returns empty
      mockDataSource.query.mockResolvedValueOnce([]);

      const summary = await service.generateSummary('pricing');
      expect(summary).toContain('No relevant feedback');
    });
  });
});
