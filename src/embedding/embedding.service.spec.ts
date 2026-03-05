import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { EmbeddingService } from './embedding.service';

// mock the openai module so we don't hit the real API
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      embeddings: {
        create: jest.fn().mockResolvedValue({
          data: [{ embedding: Array(1536).fill(0.001) }],
        }),
      },
    })),
  };
});

describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let dataSource: DataSource;

  const mockDataSource = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbeddingService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: string) => {
              const vals: Record<string, string> = {
                OPENAI_API_KEY: 'test-key',
                OPENAI_EMBEDDING_MODEL: 'text-embedding-3-small',
              };
              return vals[key] ?? fallback;
            }),
          },
        },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<EmbeddingService>(EmbeddingService);
    dataSource = module.get<DataSource>(DataSource);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateEmbedding', () => {
    it('should return a 1536-dim vector', async () => {
      const embedding = await service.generateEmbedding('test input');

      expect(embedding).toHaveLength(1536);
      expect(typeof embedding[0]).toBe('number');
    });
  });

  describe('storeEmbedding', () => {
    it('should run UPDATE query with pgvector cast', async () => {
      const embedding = Array(1536).fill(0.5);
      await service.storeEmbedding('feedback-123', embedding);

      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('::vector'),
        expect.arrayContaining(['feedback-123']),
      );
    });
  });
});
