# Telegram Investment Service — Plan 4: Reports + Payouts

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement report generation workflow (profit/loss calculation, approval, publication) and payout system (queue, dual approval, batch execution, status tracking).

**Architecture:** Two new NestJS modules (reports, payouts) within the existing API. Reports are linked 1:1 to deposits. Payouts support batch grouping with dual-approval workflow. All financial state changes are audited.

**Tech Stack:** NestJS, Prisma, PostgreSQL

---

### Task 1: Reports Module — CRUD + Approval Workflow

**Files:**
- Create: `apps/api/src/reports/reports.module.ts`
- Create: `apps/api/src/reports/reports.service.ts`
- Create: `apps/api/src/reports/reports.controller.ts`
- Create: `apps/api/src/reports/admin-reports.controller.ts`
- Create: `apps/api/src/reports/dto/report.dto.ts`
- Create: `apps/api/src/reports/reports.service.spec.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create report DTOs**

`apps/api/src/reports/dto/report.dto.ts`:

```typescript
import { IsString, IsOptional, IsNumber, IsPositive } from 'class-validator';

export enum ReportStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  REVISED = 'REVISED',
}

export class CreateReportDto {
  @IsString()
  deposit_id: string;

  @IsNumber()
  gross_result: number;

  @IsNumber()
  @IsOptional()
  fee_amount?: number;

  @IsString()
  @IsOptional()
  calculation_method?: string;

  @IsString()
  @IsOptional()
  report_file_url?: string;
}

export class UpdateReportDto {
  @IsNumber()
  @IsOptional()
  gross_result?: number;

  @IsNumber()
  @IsOptional()
  fee_amount?: number;

  @IsString()
  @IsOptional()
  calculation_method?: string;

  @IsString()
  @IsOptional()
  report_file_url?: string;
}

export class ReportDto {
  report_id: string;
  deposit_id: string;
  gross_result: number;
  fee_amount: number;
  net_result: number;
  payout_amount: number;
  calculation_method: string | null;
  report_file_url: string | null;
  report_reference: string | null;
  generated_at: string;
  approved_at: string | null;
  published_at: string | null;
  generated_by: string | null;
  approved_by: string | null;
  status: string;
}
```

- [ ] **Step 2: Write reports service test**

`apps/api/src/reports/reports.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('ReportsService', () => {
  let service: ReportsService;

  const mockPrisma = {
    profitLossReport: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    deposit: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = (module as any).get(ReportsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByDeposit', () => {
    it('should throw if deposit not found', async () => {
      mockPrisma.deposit.findUnique.mockResolvedValue(null);
      await expect(service.findByDeposit('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd apps/api
npm test -- --testPathPattern=reports.service.spec.ts
```

Expected: FAIL

- [ ] **Step 4: Implement reports service**

`apps/api/src/reports/reports.service.ts`:

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto, UpdateReportDto, ReportDto } from './dto/report.dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async findByDeposit(depositId: string): Promise<ReportDto | null> {
    const deposit = await this.prisma.deposit.findUnique({
      where: { deposit_id: depositId },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    const report = await this.prisma.profitLossReport.findUnique({
      where: { deposit_id: depositId },
    });

    if (!report) return null;
    return this.serialize(report);
  }

  async create(dto: CreateReportDto, generatedBy: string): Promise<ReportDto> {
    const deposit = await this.prisma.deposit.findUnique({
      where: { deposit_id: dto.deposit_id },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    if (deposit.status !== 'COMPLETED') {
      throw new BadRequestException('Can only create reports for completed deposits');
    }

    const existing = await this.prisma.profitLossReport.findUnique({
      where: { deposit_id: dto.deposit_id },
    });

    if (existing) {
      throw new BadRequestException('Report already exists for this deposit');
    }

    const feeAmount = dto.fee_amount || 0;
    const netResult = dto.gross_result - feeAmount;
    const payoutAmount = parseFloat(deposit.confirmed_amount?.toString() || '0') + netResult;

    const report = await this.prisma.profitLossReport.create({
      data: {
        deposit_id: dto.deposit_id,
        gross_result: dto.gross_result.toString(),
        fee_amount: feeAmount.toString(),
        net_result: netResult.toString(),
        payout_amount: payoutAmount.toString(),
        calculation_method: dto.calculation_method || null,
        report_file_url: dto.report_file_url || null,
        generated_by: generatedBy,
        status: 'DRAFT',
      },
    });

    return this.serialize(report);
  }

  async update(reportId: string, dto: UpdateReportDto): Promise<ReportDto> {
    const report = await this.prisma.profitLossReport.findUnique({
      where: { report_id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.status === 'PUBLISHED') {
      throw new BadRequestException('Cannot update a published report');
    }

    const grossResult = dto.gross_result ?? parseFloat(report.gross_result.toString());
    const feeAmount = dto.fee_amount ?? parseFloat(report.fee_amount.toString());
    const netResult = grossResult - feeAmount;

    const deposit = await this.prisma.deposit.findUnique({
      where: { deposit_id: report.deposit_id },
    });

    const payoutAmount = parseFloat(deposit?.confirmed_amount?.toString() || '0') + netResult;

    const updated = await this.prisma.profitLossReport.update({
      where: { report_id: reportId },
      data: {
        gross_result: grossResult.toString(),
        fee_amount: feeAmount.toString(),
        net_result: netResult.toString(),
        payout_amount: payoutAmount.toString(),
        calculation_method: dto.calculation_method ?? report.calculation_method,
        report_file_url: dto.report_file_url ?? report.report_file_url,
        status: 'REVISED',
      },
    });

    return this.serialize(updated);
  }

  async submitForApproval(reportId: string): Promise<ReportDto> {
    const report = await this.prisma.profitLossReport.findUnique({
      where: { report_id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.status !== 'DRAFT' && report.status !== 'REVISED') {
      throw new BadRequestException('Report must be in DRAFT or REVISED status');
    }

    const updated = await this.prisma.profitLossReport.update({
      where: { report_id: reportId },
      data: { status: 'PENDING_APPROVAL' },
    });

    return this.serialize(updated);
  }

  async approve(reportId: string, approvedBy: string): Promise<ReportDto> {
    const report = await this.prisma.profitLossReport.findUnique({
      where: { report_id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Report must be pending approval');
    }

    if (report.generated_by === approvedBy) {
      throw new BadRequestException('Cannot approve your own report (separation of duties)');
    }

    const updated = await this.prisma.profitLossReport.update({
      where: { report_id: reportId },
      data: {
        status: 'APPROVED',
        approved_by: approvedBy,
        approved_at: new Date(),
      },
    });

    return this.serialize(updated);
  }

  async publish(reportId: string): Promise<ReportDto> {
    const report = await this.prisma.profitLossReport.findUnique({
      where: { report_id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.status !== 'APPROVED') {
      throw new BadRequestException('Report must be approved before publishing');
    }

    const updated = await this.prisma.profitLossReport.update({
      where: { report_id: reportId },
      data: {
        status: 'PUBLISHED',
        published_at: new Date(),
      },
    });

    // Update deposit status
    await this.prisma.deposit.update({
      where: { deposit_id: report.deposit_id },
      data: { status: 'REPORT_READY' },
    });

    return this.serialize(updated);
  }

  private serialize(report: any): ReportDto {
    return {
      report_id: report.report_id,
      deposit_id: report.deposit_id,
      gross_result: parseFloat(report.gross_result.toString()),
      fee_amount: parseFloat(report.fee_amount.toString()),
      net_result: parseFloat(report.net_result.toString()),
      payout_amount: parseFloat(report.payout_amount.toString()),
      calculation_method: report.calculation_method,
      report_file_url: report.report_file_url,
      report_reference: report.report_reference,
      generated_at: report.generated_at.toISOString(),
      approved_at: report.approved_at?.toISOString() || null,
      published_at: report.published_at?.toISOString() || null,
      generated_by: report.generated_by,
      approved_by: report.approved_by,
      status: report.status,
    };
  }
}
```

- [ ] **Step 5: Create user-facing reports controller**

`apps/api/src/reports/reports.controller.ts`:

```typescript
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReportDto } from './dto/report.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('deposit/:depositId')
  async findByDeposit(
    @Param('depositId') depositId: string,
    @CurrentUser() user: any,
  ): Promise<ReportDto | null> {
    // Verify user owns the deposit
    const deposit = await (this.reportsService as any).prisma.deposit.findUnique({
      where: { deposit_id: depositId },
    });

    if (!deposit || deposit.user_id !== user.user_id) {
      return null;
    }

    return this.reportsService.findByDeposit(depositId);
  }
}
```

- [ ] **Step 6: Create admin reports controller**

`apps/api/src/reports/admin-reports.controller.ts`:

```typescript
import {
  Controller, Get, Post, Put, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateReportDto, UpdateReportDto, ReportDto } from './dto/report.dto';

@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const where: any = {};
    if (status) where.status = status;

    const reports = await (this.reportsService as any).prisma.profitLossReport.findMany({
      where,
      orderBy: { generated_at: 'desc' },
      take: limit ? parseInt(limit, 10) : 50,
      skip: offset ? parseInt(offset, 10) : 0,
    });

    return reports.map((r: any) => ({
      ...r,
      gross_result: parseFloat(r.gross_result.toString()),
      fee_amount: parseFloat(r.fee_amount.toString()),
      net_result: parseFloat(r.net_result.toString()),
      payout_amount: parseFloat(r.payout_amount.toString()),
      generated_at: r.generated_at.toISOString(),
      approved_at: r.approved_at?.toISOString() || null,
      published_at: r.published_at?.toISOString() || null,
    }));
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ReportDto> {
    const report = await (this.reportsService as any).prisma.profitLossReport.findUnique({
      where: { report_id: id },
    });

    if (!report) {
      throw new Error('Report not found');
    }

    return (this.reportsService as any).serialize(report);
  }

  @Post()
  async create(
    @Body() dto: CreateReportDto,
    @CurrentUser() user: any,
  ): Promise<ReportDto> {
    return this.reportsService.create(dto, user.user_id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateReportDto,
  ): Promise<ReportDto> {
    return this.reportsService.update(id, dto);
  }

  @Put(':id/submit')
  async submitForApproval(@Param('id') id: string): Promise<ReportDto> {
    return this.reportsService.submitForApproval(id);
  }

  @Put(':id/approve')
  async approve(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ReportDto> {
    return this.reportsService.approve(id, user.user_id);
  }

  @Put(':id/publish')
  async publish(@Param('id') id: string): Promise<ReportDto> {
    return this.reportsService.publish(id);
  }
}
```

- [ ] **Step 7: Create reports module**

`apps/api/src/reports/reports.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { AdminReportsController } from './admin-reports.controller';

@Module({
  providers: [ReportsService],
  controllers: [ReportsController, AdminReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
```

- [ ] **Step 8: Register in AppModule**

```typescript
import { ReportsModule } from './reports/reports.module';
// Add to imports
```

- [ ] **Step 9: Run tests**

```bash
cd apps/api
npm test
```

Expected: All pass.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/reports/ apps/api/src/app.module.ts
git commit -m "feat: reports module with approval workflow"
```

---

### Task 2: Payouts Module — Queue + Dual Approval

**Files:**
- Create: `apps/api/src/payouts/payouts.module.ts`
- Create: `apps/api/src/payouts/payouts.service.ts`
- Create: `apps/api/src/payouts/payouts.controller.ts`
- Create: `apps/api/src/payouts/admin-payouts.controller.ts`
- Create: `apps/api/src/payouts/dto/payout.dto.ts`
- Create: `apps/api/src/payouts/payouts.service.spec.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create payout DTOs**

`apps/api/src/payouts/dto/payout.dto.ts`:

```typescript
import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

export enum PayoutStatus {
  PREPARED = 'PREPARED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  SENT = 'SENT',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum PayoutDestinationRule {
  ORIGINAL_SENDER = 'ORIGINAL_SENDER',
  VERIFIED_ADDRESS = 'VERIFIED_ADDRESS',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
}

export class CreatePayoutDto {
  @IsString()
  deposit_id: string;

  @IsString()
  @IsOptional()
  destination_address?: string;

  @IsString()
  @IsOptional()
  destination_rule?: string;
}

export class CreateBatchDto {
  @IsString({ each: true })
  deposit_ids: string[];
}

export class PayoutDto {
  payout_id: string;
  deposit_id: string;
  payout_batch_id: string | null;
  destination_address: string;
  destination_rule: string;
  amount: number;
  network: string;
  asset_symbol: string;
  tx_hash: string | null;
  blockchain_status: string | null;
  status: string;
  failure_reason: string | null;
  prepared_by: string | null;
  approved_by: string | null;
  sent_by: string | null;
  created_at: string;
  approved_at: string | null;
  sent_at: string | null;
  confirmed_at: string | null;
}
```

- [ ] **Step 2: Write payouts service test**

`apps/api/src/payouts/payouts.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { PayoutsService } from './payouts.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('PayoutsService', () => {
  let service: PayoutsService;

  const mockPrisma = {
    payout: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    deposit: {
      findUnique: jest.fn(),
    },
    profitLossReport: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PayoutsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = (module as any).get(PayoutsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('prepareForDeposit', () => {
    it('should throw if deposit not found', async () => {
      mockPrisma.deposit.findUnique.mockResolvedValue(null);
      await expect(service.prepareForDeposit('nonexistent', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw if report not approved', async () => {
      mockPrisma.deposit.findUnique.mockResolvedValue({ deposit_id: 'd1', status: 'REPORT_READY' });
      mockPrisma.profitLossReport.findUnique.mockResolvedValue(null);
      await expect(service.prepareForDeposit('d1', 'user-1')).rejects.toThrow(BadRequestException);
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Expected: FAIL

- [ ] **Step 4: Implement payouts service**

`apps/api/src/payouts/payouts.service.ts`:

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePayoutDto, PayoutDto } from './dto/payout.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class PayoutsService {
  constructor(private prisma: PrismaService) {}

  async findByDeposit(depositId: string): Promise<PayoutDto[]> {
    const payouts = await this.prisma.payout.findMany({
      where: { deposit_id: depositId },
      orderBy: { created_at: 'desc' },
    });

    return payouts.map(this.serialize);
  }

  async prepareForDeposit(depositId: string, preparedBy: string): Promise<PayoutDto> {
    const deposit = await this.prisma.deposit.findUnique({
      where: { deposit_id: depositId },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    if (deposit.status !== 'REPORT_READY') {
      throw new BadRequestException('Deposit must have a published report before payout');
    }

    const report = await this.prisma.profitLossReport.findUnique({
      where: { deposit_id: depositId },
    });

    if (!report || (report.status !== 'APPROVED' && report.status !== 'PUBLISHED')) {
      throw new BadRequestException('Report must be approved before payout');
    }

    const existing = await this.prisma.payout.findFirst({
      where: {
        deposit_id: depositId,
        status: { notIn: ['CANCELLED', 'FAILED'] },
      },
    });

    if (existing) {
      throw new BadRequestException('Payout already exists for this deposit');
    }

    const destinationAddress = deposit.source_address || '';
    if (!destinationAddress) {
      throw new BadRequestException('No destination address available for payout');
    }

    const payout = await this.prisma.payout.create({
      data: {
        deposit_id: depositId,
        destination_address: destinationAddress,
        destination_rule: 'ORIGINAL_SENDER',
        amount: report.payout_amount,
        network: deposit.network,
        asset_symbol: deposit.asset_symbol,
        prepared_by: preparedBy,
        status: 'PENDING_APPROVAL',
      },
    });

    // Update deposit status
    await this.prisma.deposit.update({
      where: { deposit_id: depositId },
      data: { status: 'PAYOUT_PENDING' },
    });

    return this.serialize(payout);
  }

  async prepareBatch(depositIds: string[], preparedBy: string): Promise<PayoutDto[]> {
    const batchId = `batch_${randomUUID().replace(/-/g, '')}`;
    const payouts: PayoutDto[] = [];

    for (const depositId of depositIds) {
      try {
        const payout = await this.prepareForDeposit(depositId, preparedBy);
        // Assign batch ID
        await this.prisma.payout.update({
          where: { payout_id: payout.payout_id },
          data: { payout_batch_id: batchId },
        });
        payouts.push({ ...payout, payout_batch_id: batchId });
      } catch (error: any) {
        // Log but continue with other deposits
        console.error(`Failed to prepare payout for ${depositId}: ${error.message}`);
      }
    }

    return payouts;
  }

  async approve(payoutId: string, approvedBy: string): Promise<PayoutDto> {
    const payout = await this.prisma.payout.findUnique({
      where: { payout_id: payoutId },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Payout must be pending approval');
    }

    if (payout.prepared_by === approvedBy) {
      throw new BadRequestException('Cannot approve your own payout (separation of duties)');
    }

    const updated = await this.prisma.payout.update({
      where: { payout_id: payoutId },
      data: {
        status: 'APPROVED',
        approved_by: approvedBy,
        approved_at: new Date(),
      },
    });

    // Update deposit status
    await this.prisma.deposit.update({
      where: { deposit_id: payout.deposit_id },
      data: { status: 'PAYOUT_APPROVED' },
    });

    return this.serialize(updated);
  }

  async recordSent(payoutId: string, txHash: string, sentBy: string): Promise<PayoutDto> {
    const payout = await this.prisma.payout.findUnique({
      where: { payout_id: payoutId },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.status !== 'APPROVED') {
      throw new BadRequestException('Payout must be approved before sending');
    }

    const updated = await this.prisma.payout.update({
      where: { payout_id: payoutId },
      data: {
        status: 'SENT',
        tx_hash: txHash,
        sent_by: sentBy,
        sent_at: new Date(),
      },
    });

    await this.prisma.deposit.update({
      where: { deposit_id: payout.deposit_id },
      data: { status: 'PAYOUT_SENT' },
    });

    return this.serialize(updated);
  }

  async recordConfirmed(payoutId: string): Promise<PayoutDto> {
    const payout = await this.prisma.payout.findUnique({
      where: { payout_id: payoutId },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.status !== 'SENT') {
      throw new BadRequestException('Payout must be in SENT status');
    }

    const updated = await this.prisma.payout.update({
      where: { payout_id: payoutId },
      data: {
        status: 'CONFIRMED',
        blockchain_status: 'confirmed',
        confirmed_at: new Date(),
      },
    });

    await this.prisma.deposit.update({
      where: { deposit_id: payout.deposit_id },
      data: { status: 'PAYOUT_CONFIRMED' },
    });

    return this.serialize(updated);
  }

  async recordFailure(payoutId: string, reason: string): Promise<PayoutDto> {
    const updated = await this.prisma.payout.update({
      where: { payout_id: payoutId },
      data: {
        status: 'FAILED',
        failure_reason: reason,
      },
    });

    return this.serialize(updated);
  }

  private serialize(payout: any): PayoutDto {
    return {
      payout_id: payout.payout_id,
      deposit_id: payout.deposit_id,
      payout_batch_id: payout.payout_batch_id,
      destination_address: payout.destination_address,
      destination_rule: payout.destination_rule,
      amount: parseFloat(payout.amount.toString()),
      network: payout.network,
      asset_symbol: payout.asset_symbol,
      tx_hash: payout.tx_hash,
      blockchain_status: payout.blockchain_status,
      status: payout.status,
      failure_reason: payout.failure_reason,
      prepared_by: payout.prepared_by,
      approved_by: payout.approved_by,
      sent_by: payout.sent_by,
      created_at: payout.created_at.toISOString(),
      approved_at: payout.approved_at?.toISOString() || null,
      sent_at: payout.sent_at?.toISOString() || null,
      confirmed_at: payout.confirmed_at?.toISOString() || null,
    };
  }
}
```

- [ ] **Step 5: Create user-facing payouts controller**

`apps/api/src/payouts/payouts.controller.ts`:

```typescript
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PayoutDto } from './dto/payout.dto';

@Controller('payouts')
@UseGuards(JwtAuthGuard)
export class PayoutsController {
  constructor(private payoutsService: PayoutsService) {}

  @Get('deposit/:depositId')
  async findByDeposit(
    @Param('depositId') depositId: string,
    @CurrentUser() user: any,
  ): Promise<PayoutDto[]> {
    const deposit = await (this.payoutsService as any).prisma.deposit.findUnique({
      where: { deposit_id: depositId },
    });

    if (!deposit || deposit.user_id !== user.user_id) {
      return [];
    }

    return this.payoutsService.findByDeposit(depositId);
  }
}
```

- [ ] **Step 6: Create admin payouts controller**

`apps/api/src/payouts/admin-payouts.controller.ts`:

```typescript
import {
  Controller, Get, Post, Put, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreatePayoutDto, CreateBatchDto, PayoutDto } from './dto/payout.dto';

@Controller('admin/payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminPayoutsController {
  constructor(private payoutsService: PayoutsService) {}

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('batch_id') batchId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const where: any = {};
    if (status) where.status = status;
    if (batchId) where.payout_batch_id = batchId;

    const payouts = await (this.payoutsService as any).prisma.payout.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit ? parseInt(limit, 10) : 50,
      skip: offset ? parseInt(offset, 10) : 0,
    });

    return payouts.map((p: any) => ({
      ...p,
      amount: parseFloat(p.amount.toString()),
      created_at: p.created_at.toISOString(),
      approved_at: p.approved_at?.toISOString() || null,
      sent_at: p.sent_at?.toISOString() || null,
      confirmed_at: p.confirmed_at?.toISOString() || null,
    }));
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<PayoutDto> {
    const payout = await (this.payoutsService as any).prisma.payout.findUnique({
      where: { payout_id: id },
    });

    if (!payout) throw new Error('Payout not found');
    return (this.payoutsService as any).serialize(payout);
  }

  @Post()
  async create(
    @Body() dto: CreatePayoutDto,
    @CurrentUser() user: any,
  ): Promise<PayoutDto> {
    return this.payoutsService.prepareForDeposit(dto.deposit_id, user.user_id);
  }

  @Post('batch')
  async createBatch(
    @Body() dto: CreateBatchDto,
    @CurrentUser() user: any,
  ): Promise<PayoutDto[]> {
    return this.payoutsService.prepareBatch(dto.deposit_ids, user.user_id);
  }

  @Put(':id/approve')
  async approve(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<PayoutDto> {
    return this.payoutsService.approve(id, user.user_id);
  }

  @Put(':id/sent')
  async recordSent(
    @Param('id') id: string,
    @Body('tx_hash') txHash: string,
    @CurrentUser() user: any,
  ): Promise<PayoutDto> {
    return this.payoutsService.recordSent(id, txHash, user.user_id);
  }

  @Put(':id/confirmed')
  async recordConfirmed(@Param('id') id: string): Promise<PayoutDto> {
    return this.payoutsService.recordConfirmed(id);
  }

  @Put(':id/failed')
  async recordFailure(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<PayoutDto> {
    return this.payoutsService.recordFailure(id, reason);
  }
}
```

- [ ] **Step 7: Create payouts module**

`apps/api/src/payouts/payouts.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { PayoutsController } from './payouts.controller';
import { AdminPayoutsController } from './admin-payouts.controller';

@Module({
  providers: [PayoutsService],
  controllers: [PayoutsController, AdminPayoutsController],
  exports: [PayoutsService],
})
export class PayoutsModule {}
```

- [ ] **Step 8: Register in AppModule**

```typescript
import { PayoutsModule } from './payouts/payouts.module';
import { ReportsModule } from './reports/reports.module';
// Add both to imports
```

- [ ] **Step 9: Run tests**

```bash
cd apps/api
npm test
```

Expected: All pass.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/payouts/ apps/api/src/reports/ apps/api/src/app.module.ts
git commit -m "feat: payouts module with dual approval and batch support"
```

---

### Task 3: Mini App — Report + Payout Display Pages

**Files:**
- Create: `apps/miniapp/src/app/reports/[depositId]/page.tsx`
- Create: `apps/miniapp/src/app/payouts/[depositId]/page.tsx`
- Modify: `apps/miniapp/src/lib/api.ts` (add report/payout endpoints)
- Modify: `apps/miniapp/src/app/deposits/[id]/page.tsx` (add report/payout links)

- [ ] **Step 1: Update API client**

Add to `apps/miniapp/src/lib/api.ts`:

```typescript
export async function getReportByDeposit(depositId: string) {
  const response = await api.get(`/reports/deposit/${depositId}`);
  return response.data;
}

export async function getPayoutsByDeposit(depositId: string) {
  const response = await api.get(`/payouts/deposit/${depositId}`);
  return response.data;
}
```

- [ ] **Step 2: Create report page**

`apps/miniapp/src/app/reports/[depositId]/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getReportByDeposit } from '../../../lib/api';

export default function ReportPage() {
  const params = useParams();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.depositId) {
      getReportByDeposit(params.depositId as string)
        .then(setReport)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [params.depositId]);

  if (loading) return <div className="p-4 text-text-secondary">Loading...</div>;
  if (!report) return <div className="p-4 text-text-secondary">No report available yet.</div>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Trading Report</h1>

      <div className="bg-bg-secondary rounded-lg p-4 mb-4">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-text-secondary">Initial Deposit</span>
            <span className="font-medium">{report.payout_amount - report.net_result}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Gross Result</span>
            <span className={`font-medium ${report.gross_result >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {report.gross_result >= 0 ? '+' : ''}{report.gross_result}
            </span>
          </div>
          {report.fee_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-text-secondary">Fees</span>
              <span className="text-red-400">-{report.fee_amount}</span>
            </div>
          )}
          <div className="border-t border-gray-700 pt-3 flex justify-between">
            <span className="font-medium">Net Result</span>
            <span className={`font-bold ${report.net_result >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {report.net_result >= 0 ? '+' : ''}{report.net_result}
            </span>
          </div>
          <div className="flex justify-between text-lg">
            <span className="font-bold">Payout Amount</span>
            <span className="font-bold text-primary">{report.payout_amount}</span>
          </div>
        </div>
      </div>

      <div className="text-text-secondary text-xs space-y-1">
        <div>Status: {report.status}</div>
        <div>Generated: {new Date(report.generated_at).toLocaleString()}</div>
        {report.approved_at && <div>Approved: {new Date(report.approved_at).toLocaleString()}</div>}
        {report.published_at && <div>Published: {new Date(report.published_at).toLocaleString()}</div>}
      </div>

      <Link href="/deposits" className="block text-center text-primary mt-6">
        &larr; Back to Deposits
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Create payouts page**

`apps/miniapp/src/app/payouts/[depositId]/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getPayoutsByDeposit } from '../../../lib/api';
import { StatusBadge } from '../../../components/status-badge';

export default function PayoutsPage() {
  const params = useParams();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.depositId) {
      getPayoutsByDeposit(params.depositId as string)
        .then(setPayouts)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [params.depositId]);

  if (loading) return <div className="p-4 text-text-secondary">Loading...</div>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Payouts</h1>

      {payouts.length === 0 ? (
        <div className="text-center py-8 text-text-secondary">
          <p>No payouts yet.</p>
          <p className="text-sm mt-2">Payouts will appear here once the trading period is complete.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payouts.map((payout) => (
            <div key={payout.payout_id} className="bg-bg-secondary rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{payout.amount} {payout.asset_symbol}</span>
                <StatusBadge status={payout.status} />
              </div>

              <div className="text-text-secondary text-sm space-y-1">
                <div>Network: {payout.network}</div>
                <div>To: {payout.destination_address.slice(0, 10)}...{payout.destination_address.slice(-8)}</div>
                {payout.tx_hash && (
                  <div className="text-link truncate">TX: {payout.tx_hash}</div>
                )}
                {payout.sent_at && (
                  <div>Sent: {new Date(payout.sent_at).toLocaleString()}</div>
                )}
                {payout.failure_reason && (
                  <div className="text-red-400">Reason: {payout.failure_reason}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Link href="/deposits" className="block text-center text-primary mt-6">
        &larr; Back to Deposits
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: Update deposit detail page with report/payout links**

Modify `apps/miniapp/src/app/deposits/[id]/page.tsx` to add links after the timeline section:

```tsx
{/* Add after the timeline section, before the status_reason block */}
{(deposit.status === 'REPORT_READY' || deposit.status === 'PAYOUT_PENDING' ||
  deposit.status === 'PAYOUT_APPROVED' || deposit.status === 'PAYOUT_SENT' ||
  deposit.status === 'PAYOUT_CONFIRMED') && (
  <div className="bg-bg-secondary rounded-lg p-4 mb-4">
    <h2 className="font-medium mb-3">Actions</h2>
    <div className="space-y-2">
      <Link href={`/reports/${deposit.deposit_id}`} className="block text-primary text-sm">
        View Report &rarr;
      </Link>
      <Link href={`/payouts/${deposit.deposit_id}`} className="block text-primary text-sm">
        View Payouts &rarr;
      </Link>
    </div>
  </div>
)}
```

- [ ] **Step 5: Commit**

```bash
git add apps/miniapp/src/app/reports/ apps/miniapp/src/app/payouts/ apps/miniapp/src/lib/api.ts apps/miniapp/src/app/deposits/
git commit -m "feat: report and payout display pages in Mini App"
```

---

### Task 4: Integration Tests + Final Verification

**Files:**
- Modify: `apps/api/test/app.e2e-spec.ts` (add report/payout e2e tests)

- [ ] **Step 1: Add e2e tests for reports and payouts**

Add to `apps/api/test/app.e2e-spec.ts`:

```typescript
describe('/api/v1/reports', () => {
  it('GET returns 401 without auth', () => {
    return request(app.getHttpServer())
      .get('/api/v1/reports/deposit/test-id')
      .expect(401);
  });
});

describe('/api/v1/payouts', () => {
  it('GET returns 401 without auth', () => {
    return request(app.getHttpServer())
      .get('/api/v1/payouts/deposit/test-id')
      .expect(401);
  });
});

describe('/api/v1/admin/reports', () => {
  it('GET returns 401 without auth', () => {
    return request(app.getHttpServer())
      .get('/api/v1/admin/reports')
      .expect(401);
  });
});

describe('/api/v1/admin/payouts', () => {
  it('GET returns 401 without auth', () => {
    return request(app.getHttpServer())
      .get('/api/v1/admin/payouts')
      .expect(401);
  });
});
```

- [ ] **Step 2: Run all tests**

```bash
cd apps/api
npm test
npm run test:e2e
```

- [ ] **Step 3: Final commit**

```bash
git add apps/api/test/
git commit -m "test: e2e tests for reports and payouts auth guards"
```

---

## Plan 4 Summary — What's Built

| Component | Description | Status |
|---|---|---|
| Reports Module | CRUD + approval workflow (draft → pending → approved → published) | ✅ |
| Reports Controller (user) | View own deposit reports | ✅ |
| Reports Controller (admin) | Full CRUD + submit/approve/publish | ✅ |
| Payouts Module | Queue + dual approval + batch + status tracking | ✅ |
| Payouts Controller (user) | View own deposit payouts | ✅ |
| Payouts Controller (admin) | Prepare, batch, approve, sent, confirmed, failed | ✅ |
| Separation of Duties | Cannot approve own reports/payouts | ✅ |
| Mini App Report Page | Display P/L breakdown | ✅ |
| Mini App Payouts Page | Display payout history with TX hash | ✅ |
| Deposit Detail Links | Report + payout quick access | ✅ |

## API Endpoints Added

```
GET    /api/v1/reports/deposit/:depositId
GET    /api/v1/admin/reports
GET    /api/v1/admin/reports/:id
POST   /api/v1/admin/reports
PUT    /api/v1/admin/reports/:id
PUT    /api/v1/admin/reports/:id/submit
PUT    /api/v1/admin/reports/:id/approve
PUT    /api/v1/admin/reports/:id/publish
GET    /api/v1/payouts/deposit/:depositId
GET    /api/v1/admin/payouts
GET    /api/v1/admin/payouts/:id
POST   /api/v1/admin/payouts
POST   /api/v1/admin/payouts/batch
PUT    /api/v1/admin/payouts/:id/approve
PUT    /api/v1/admin/payouts/:id/sent
PUT    /api/v1/admin/payouts/:id/confirmed
PUT    /api/v1/admin/payouts/:id/failed
```
