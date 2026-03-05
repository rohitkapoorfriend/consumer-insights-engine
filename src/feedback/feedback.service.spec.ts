import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { NotFoundException } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { Feedback } from './entities/feedback.entity';

describe('FeedbackService', () => {
  let service: FeedbackService;

  const mockFeedback: Partial<Feedback> = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    text: 'Great product but shipping was slow',
    source: 'survey',
    metadata: {},
    processed: false,
    createdAt: new Date('2025-12-01'),
    updatedAt: new Date('2025-12-01'),
  };

  const mockRepo = {
    create: jest.fn().mockImplementation((dto) => ({ ...mockFeedback, ...dto })),
    save: jest.fn().mockImplementation((entity) =>
      Promise.resolve({ ...mockFeedback, ...entity }),
    ),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn().mockResolvedValue({ id: 'job-123' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        { provide: getRepositoryToken(Feedback), useValue: mockRepo },
        { provide: getQueueToken('embedding'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should save feedback and enqueue embedding job', async () => {
      const dto = { text: 'The UI is confusing', source: 'app' };
      const result = await service.create(dto);

      expect(mockRepo.create).toHaveBeenCalledWith(dto);
      expect(mockRepo.save).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalledWith('process-single', {
        feedbackId: result.id,
      });
    });
  });

  describe('createBulk', () => {
    it('should insert multiple entries and queue a bulk job', async () => {
      const dtos = [
        { text: 'Love it' },
        { text: 'Needs improvement' },
      ];
      mockRepo.save.mockResolvedValueOnce(
        dtos.map((d, i) => ({ ...mockFeedback, ...d, id: `id-${i}` })),
      );

      const result = await service.createBulk(dtos);

      expect(result.count).toBe(2);
      expect(mockQueue.add).toHaveBeenCalledWith('process-bulk', {
        feedbackIds: ['id-0', 'id-1'],
      });
    });
  });

  describe('findOne', () => {
    it('should return feedback if it exists', async () => {
      mockRepo.findOne.mockResolvedValueOnce(mockFeedback);

      const result = await service.findOne(mockFeedback.id!);
      expect(result).toEqual(mockFeedback);
    });

    it('should throw NotFoundException for missing feedback', async () => {
      mockRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      mockRepo.findAndCount.mockResolvedValueOnce([[mockFeedback], 1]);

      const result = await service.findAll(1, 20);
      expect(result).toEqual({ data: [mockFeedback], total: 1 });
    });

    it('should filter by source when provided', async () => {
      mockRepo.findAndCount.mockResolvedValueOnce([[], 0]);

      await service.findAll(1, 10, 'survey');
      expect(mockRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { source: 'survey' },
        }),
      );
    });
  });
});
