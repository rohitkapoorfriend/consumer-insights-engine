import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface JobStatus {
  id: string;
  state: string;
  progress: unknown;
  result: unknown;
  error: string | undefined;
}

@Injectable()
export class JobsService {
  constructor(
    @InjectQueue('embedding')
    private readonly embeddingQueue: Queue,
  ) {}

  async getStatus(jobId: string): Promise<JobStatus> {
    const job = await this.embeddingQueue.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    const state = await job.getState();
    return {
      id: job.id!,
      state,
      progress: job.progress,
      result: job.returnvalue,
      error: job.failedReason,
    };
  }
}
