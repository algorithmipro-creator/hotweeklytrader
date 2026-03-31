import { Test } from '@nestjs/testing';
import { ReconciliationService } from './reconciliation.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ReconciliationService', () => {
  let service: ReconciliationService;

  const mockPrisma = {
    deposit: {
      findMany: jest.fn(),
    },
    transactionLog: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReconciliationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = (module as any).get(ReconciliationService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findUnmatchedTransactions', () => {
    it('should return transactions without matching deposits', async () => {
      mockPrisma.deposit.findMany.mockResolvedValue([]);
      mockPrisma.transactionLog.findMany.mockResolvedValue([
        { transaction_log_id: '1', to_address: '0xabc', amount: '100', network: 'BSC' },
      ]);

      const result = await service.findUnmatchedTransactions();
      expect(result.unmatched.length).toBe(1);
    });
  });
});
