import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Feedback } from './entities/feedback.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
    @InjectQueue('embedding')
    private readonly embeddingQueue: Queue,
  ) {}

  /** Create a single feedback entry and queue it for embedding. */
  async create(dto: CreateFeedbackDto): Promise<Feedback> {
    const feedback = this.feedbackRepository.create(dto);
    const saved = await this.feedbackRepository.save(feedback);
    await this.embeddingQueue.add('process-single', { feedbackId: saved.id });
    this.logger.log(`Feedback ${saved.id} created and queued`);
    return saved;
  }

  /** Create multiple feedback entries in bulk and queue a batch job. */
  async createBulk(dtos: CreateFeedbackDto[]): Promise<{ jobId: string; count: number }> {
    const feedbacks = this.feedbackRepository.create(dtos);
    const saved = await this.feedbackRepository.save(feedbacks);
    const ids = saved.map((f) => f.id);
    const job = await this.embeddingQueue.add('process-bulk', { feedbackIds: ids });
    this.logger.log(`Bulk job ${job.id} created for ${ids.length} entries`);
    return { jobId: job.id!, count: ids.length };
  }

  /** Retrieve paginated feedback with optional source filter. */
  async findAll(page: number, limit: number, source?: string): Promise<{ data: Feedback[]; total: number }> {
    const where = source ? { source } : {};
    const [data, total] = await this.feedbackRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  /** Find a single feedback entry by ID. */
  async findOne(id: string): Promise<Feedback> {
    const feedback = await this.feedbackRepository.findOne({ where: { id } });
    if (!feedback) {
      throw new NotFoundException(`Feedback ${id} not found`);
    }
    return feedback;
  }
}
