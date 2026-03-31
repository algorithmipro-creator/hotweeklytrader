import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobType, JobStatus } from '@prisma/client';

@Injectable()
export class WorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerService.name);
  private running = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    this.start();
  }

  async onModuleDestroy() {
    this.stop();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.logger.log('Worker service started');

    this.intervalId = setInterval(() => {
      this.processQueue().catch((err) => {
        this.logger.error('Queue processing error:', err);
      });
    }, 5000);
  }

  stop() {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.logger.log('Worker service stopped');
  }

  async enqueue(jobType: JobType, entityType?: string, entityId?: string): Promise<void> {
    await this.prisma.systemJob.create({
      data: {
        job_type: jobType,
        entity_type: entityType,
        entity_id: entityId,
        status: JobStatus.QUEUED,
      },
    });

    this.logger.log(`Enqueued job ${jobType} for ${entityType}:${entityId}`);
  }

  private async processQueue(): Promise<void> {
    const jobs = await this.prisma.systemJob.findMany({
      where: {
        status: { in: [JobStatus.QUEUED, JobStatus.RETRYING] },
        attempts: { lt: 5 },
      },
      orderBy: { queued_at: 'asc' },
      take: 10,
    });

    for (const job of jobs) {
      await this.processJob(job.job_id);
    }
  }

  private async processJob(jobId: string): Promise<void> {
    const job = await this.prisma.systemJob.findUnique({
      where: { job_id: jobId },
    });

    if (!job) return;

    try {
      await this.prisma.systemJob.update({
        where: { job_id: jobId },
        data: { status: JobStatus.RUNNING, started_at: new Date(), attempts: { increment: 1 } },
      });

      await this.executeJob(job);

      await this.prisma.systemJob.update({
        where: { job_id: jobId },
        data: { status: JobStatus.COMPLETED, finished_at: new Date() },
      });
    } catch (error: any) {
      const attempts = job.attempts + 1;
      const status = attempts >= 5 ? JobStatus.FAILED : JobStatus.RETRYING;

      await this.prisma.systemJob.update({
        where: { job_id: jobId },
        data: {
          status,
          last_error: error.message,
          finished_at: status === JobStatus.FAILED ? new Date() : undefined,
        },
      });

      this.logger.error(`Job ${jobId} failed (attempt ${attempts}/5): ${error.message}`);
    }
  }

  private async executeJob(job: any): Promise<void> {
    switch (job.job_type) {
      case 'DEPOSIT_CONFIRMATION':
        await this.handleDepositConfirmation(job.entity_id);
        break;
      case 'PERIOD_COMPLETION':
        await this.handlePeriodCompletion(job.entity_id);
        break;
      case 'NOTIFICATION_DISPATCH':
        await this.handleNotificationDispatch(job.entity_id);
        break;
      default:
        this.logger.warn(`Unknown job type: ${job.job_type}`);
    }
  }

  private async handleDepositConfirmation(entityId: string): Promise<void> {
    this.logger.debug(`Processing deposit confirmation for ${entityId}`);
  }

  private async handlePeriodCompletion(entityId: string): Promise<void> {
    this.logger.debug(`Processing period completion for ${entityId}`);
  }

  private async handleNotificationDispatch(entityId: string): Promise<void> {
    this.logger.debug(`Dispatching notification ${entityId}`);
  }
}
