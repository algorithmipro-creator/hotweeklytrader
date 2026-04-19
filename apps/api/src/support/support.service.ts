import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupportCaseDto, UpdateSupportCaseDto, SupportCaseDto } from './dto/support.dto';

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  async findByUser(userId: string): Promise<SupportCaseDto[]> {
    const cases = await this.prisma.supportCase.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    return cases.map(this.serialize);
  }

  async findOne(caseId: string, userId: string): Promise<SupportCaseDto> {
    const supportCase = await this.prisma.supportCase.findUnique({
      where: { case_id: caseId },
    });

    if (!supportCase || supportCase.user_id !== userId) {
      throw new NotFoundException('Support case not found');
    }

    return this.serialize(supportCase);
  }

  async create(userId: string, dto: CreateSupportCaseDto): Promise<SupportCaseDto> {
    const supportCase = await this.prisma.supportCase.create({
      data: {
        user_id: userId,
        category: dto.category,
        opened_reason: dto.opened_reason,
        related_deposit_id: dto.related_deposit_id || null,
        priority: (dto.priority || 'MEDIUM') as any,
        status: 'OPEN',
      },
    });

    return this.serialize(supportCase);
  }

  async findAll(filters: {
    status?: string;
    assigned_to?: string;
    priority?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ cases: SupportCaseDto[]; total: number }> {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.assigned_to) where.assigned_to = filters.assigned_to;
    if (filters.priority) where.priority = filters.priority;

    const [cases, total] = await Promise.all([
      this.prisma.supportCase.findMany({
        where,
        include: {
          user: {
            select: {
              telegram_id: true,
              username: true,
              display_name: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      this.prisma.supportCase.count({ where }),
    ]);

    return {
      cases: cases.map(this.serialize),
      total,
    };
  }

  async update(caseId: string, dto: UpdateSupportCaseDto): Promise<SupportCaseDto> {
    const updateData: any = { ...dto };
    if (dto.status === 'RESOLVED' || dto.status === 'CLOSED') {
      updateData.resolved_at = new Date();
    }

    const supportCase = await this.prisma.supportCase.update({
      where: { case_id: caseId },
      data: updateData,
    });

    return this.serialize(supportCase);
  }

  private serialize(supportCase: any): SupportCaseDto {
    return {
      case_id: supportCase.case_id,
      user_id: supportCase.user_id,
      user_telegram_id: supportCase.user?.telegram_id?.toString() || null,
      user_username: supportCase.user?.username || null,
      user_display_name: supportCase.user?.display_name || null,
      related_deposit_id: supportCase.related_deposit_id,
      category: supportCase.category,
      priority: supportCase.priority,
      status: supportCase.status,
      assigned_to: supportCase.assigned_to,
      opened_reason: supportCase.opened_reason,
      resolution_summary: supportCase.resolution_summary,
      created_at: supportCase.created_at.toISOString(),
      updated_at: supportCase.updated_at.toISOString(),
      resolved_at: supportCase.resolved_at?.toISOString() || null,
    };
  }
}
