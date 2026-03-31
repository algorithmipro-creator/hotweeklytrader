import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';

export interface AuditLogInput {
  actorType: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  reason?: string | null;
  beforeState?: any;
  afterState?: any;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async logEvent(input: AuditLogInput) {
    return this.prisma.auditEvent.create({
      data: {
        actor_type: input.actorType,
        actor_id: input.actorId,
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId,
        reason: input.reason,
        before_snapshot_hash: input.beforeState ? this.hashState(input.beforeState) : null,
        after_snapshot_hash: input.afterState ? this.hashState(input.afterState) : null,
      },
    });
  }

  async findEvents(filters: {
    actorType?: string;
    actorId?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters.actorType) where.actor_type = filters.actorType;
    if (filters.actorId) where.actor_id = filters.actorId;
    if (filters.entityType) where.entity_type = filters.entityType;
    if (filters.entityId) where.entity_id = filters.entityId;
    if (filters.action) where.action = filters.action;
    if (filters.fromDate || filters.toDate) {
      where.event_time = {};
      if (filters.fromDate) where.event_time.gte = filters.fromDate;
      if (filters.toDate) where.event_time.lte = filters.toDate;
    }

    const [events, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where,
        orderBy: { event_time: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      this.prisma.auditEvent.count({ where }),
    ]);

    return {
      events,
      total,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    };
  }

  private hashState(state: any): string {
    return createHash('sha256')
      .update(JSON.stringify(state))
      .digest('hex');
  }
}
