import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createHmac } from 'crypto';
import { WebhookService } from './webhook.service';
import { FeedbackService } from '../feedback/feedback.service';

describe('WebhookService', () => {
  let service: WebhookService;

  const mockDataSource = {
    query: jest.fn(),
  };

  const mockFeedbackService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: FeedbackService, useValue: mockFeedbackService },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should hash the secret and insert into db', async () => {
      mockDataSource.query.mockResolvedValueOnce([]);

      const result = await service.register({ name: 'zendesk', secret: 'mysecret' });

      expect(result).toEqual({ name: 'zendesk' });
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO webhook_sources'),
        expect.arrayContaining(['zendesk']),
      );
    });
  });

  describe('verify', () => {
    it('should throw NotFoundException if source not registered', async () => {
      mockDataSource.query.mockResolvedValueOnce([]);

      await expect(service.verify('unknown', '{}', 'sig')).rejects.toThrow(NotFoundException);
    });

    it('should return true for valid HMAC signature', async () => {
      const secretHash = createHmac('sha256', 'webhook-salt').update('test-secret').digest('hex');
      mockDataSource.query.mockResolvedValueOnce([{ secret_hash: secretHash }]);

      const payload = '{"text":"hello"}';
      const expectedSig = createHmac('sha256', secretHash).update(payload).digest('hex');

      const valid = await service.verify('src1', payload, expectedSig);
      expect(valid).toBe(true);
    });

    it('should return false for bad signature', async () => {
      const secretHash = createHmac('sha256', 'webhook-salt').update('test-secret').digest('hex');
      mockDataSource.query.mockResolvedValueOnce([{ secret_hash: secretHash }]);

      const valid = await service.verify('src1', '{"text":"hello"}', 'invalidsig');
      expect(valid).toBe(false);
    });
  });

  describe('receive', () => {
    it('should reject payload with invalid signature', async () => {
      // mock verify to return false
      jest.spyOn(service, 'verify').mockResolvedValueOnce(false);

      await expect(
        service.receive('src1', { text: 'feedback' }, 'badsig'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should create feedback for valid webhook payload', async () => {
      jest.spyOn(service, 'verify').mockResolvedValueOnce(true);
      const created = { id: '1', text: 'webhook feedback', source: 'src1' };
      mockFeedbackService.create.mockResolvedValueOnce(created);

      const result = await service.receive('src1', { text: 'webhook feedback' }, 'validsig');

      expect(result).toEqual(created);
      expect(mockFeedbackService.create).toHaveBeenCalledWith({
        text: 'webhook feedback',
        source: 'src1',
        metadata: {},
      });
    });
  });
});
