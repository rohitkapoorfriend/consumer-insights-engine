import { Test, TestingModule } from '@nestjs/testing';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';

describe('FeedbackController', () => {
  let controller: FeedbackController;
  let service: FeedbackService;

  const mockService = {
    create: jest.fn(),
    createBulk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedbackController],
      providers: [{ provide: FeedbackService, useValue: mockService }],
    }).compile();

    controller = module.get<FeedbackController>(FeedbackController);
    service = module.get<FeedbackService>(FeedbackService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /ingest', () => {
    it('should call service.create with the dto', async () => {
      const dto = { text: 'some feedback' };
      mockService.create.mockResolvedValueOnce({ id: '1', ...dto });

      const result = await controller.ingest(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result.id).toBe('1');
    });
  });

  describe('POST /bulk', () => {
    it('should call service.createBulk', async () => {
      const dto = { entries: [{ text: 'a' }, { text: 'b' }] };
      mockService.createBulk.mockResolvedValueOnce({ jobId: 'j1', count: 2 });

      const result = await controller.bulk(dto);

      expect(service.createBulk).toHaveBeenCalledWith(dto.entries);
      expect(result.count).toBe(2);
    });
  });

  describe('GET /:id', () => {
    it('should return a single feedback entry', async () => {
      const fb = { id: 'abc', text: 'test' };
      mockService.findOne.mockResolvedValueOnce(fb);

      expect(await controller.findOne('abc')).toEqual(fb);
    });
  });

  describe('GET /', () => {
    it('should return paginated list with defaults', async () => {
      mockService.findAll.mockResolvedValueOnce({ data: [], total: 0 });

      const result = await controller.findAll(1, 20, undefined);

      expect(service.findAll).toHaveBeenCalledWith(1, 20, undefined);
      expect(result.total).toBe(0);
    });
  });
});
