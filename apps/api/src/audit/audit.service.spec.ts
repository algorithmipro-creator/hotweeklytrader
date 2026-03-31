import { Test } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuditService', () => {
  let service: AuditService;

  const mockPrisma = {
    auditEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = (module as any).get(AuditService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logEvent', () => {
    it('should create an audit event', async () => {
      mockPrisma.auditEvent.create.mockResolvedValue({ audit_event_id: '1' });

      await service.logEvent({
        actorType: 'user',
        actorId: 'user-1',
        action: 'PERIOD_CREATED',
        entityType: 'InvestmentPeriod',
        entityId: 'period-1',
      });

      expect(mockPrisma.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actor_type: 'user',
          actor_id: 'user-1',
          action: 'PERIOD_CREATED',
          entity_type: 'InvestmentPeriod',
          entity_id: 'period-1',
        }),
      });
    });
  });
});
