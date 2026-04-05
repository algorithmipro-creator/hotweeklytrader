# Period Lifecycle And Settlement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe period lifecycle, period analytics, settlement snapshots, and payout registry generation so deposits are managed, reported, and prepared for payout per investment period.

**Architecture:** Extend the existing `InvestmentPeriod -> Deposit` relationship into a stricter state machine and add two new persistence layers: approved settlement snapshots and per-deposit payout registry items. Keep deposit detection and payout broadcasting separate so period closing remains review-first and safe. Build admin support around existing NestJS controllers/services and Next.js admin pages rather than introducing a new subsystem.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Next.js App Router, React, Jest, npm workspaces

---

## File Structure

### Backend data model

- Modify: `apps/api/prisma/schema.prisma`
  - Replace period status enum values with the new lifecycle.
  - Add settlement snapshot model.
  - Add payout registry model for period-level payout preparation.
- Create: `apps/api/prisma/migrations/<timestamp>_period_lifecycle_and_settlement/migration.sql`
  - Persist the enum and table changes safely.

### Backend period domain

- Modify: `apps/api/src/periods/dto/period.dto.ts`
  - Expand admin DTOs for new lifecycle and summary payloads.
- Modify: `apps/api/src/periods/periods.service.ts`
  - Enforce allowed transitions and funding-only deposit eligibility.
- Modify: `apps/api/src/periods/admin-periods.controller.ts`
  - Expose summary, settlement preview, approval, and payout-registry endpoints.
- Create: `apps/api/src/periods/period-transition.guard.ts`
  - Centralize transition rules for `FUNDING -> TRADING_ACTIVE -> REPORTING -> PAYOUT_IN_PROGRESS -> CLOSED`.
- Create: `apps/api/src/periods/period-analytics.service.ts`
  - Compute period deposit count, total, average, and filtered deposit lists.
- Create: `apps/api/src/periods/period-settlement.service.ts`
  - Preview and approve settlement snapshots.
- Create: `apps/api/src/periods/period-payout-registry.service.ts`
  - Generate payout items from approved settlements.

### Existing deposit flow

- Modify: `apps/api/src/deposits/deposits.service.ts`
  - Allow deposit creation only for `FUNDING` periods.
  - Keep deposit period assignment intact and expose period metadata where helpful.
- Modify: `apps/api/src/deposits/dto/deposit.dto.ts`
  - Add period summary fields used by admin screens.
- Modify: `apps/api/src/deposits/admin-deposits.controller.ts`
  - Add filtering by `investment_period_id`.

### Admin UI

- Modify: `apps/admin/src/lib/api.ts`
  - Add period summary, settlement preview, settlement approval, and payout registry API calls.
- Modify: `apps/admin/src/app/periods/page.tsx`
  - Show new statuses, summary columns, and lifecycle actions.
- Create: `apps/admin/src/app/periods/[id]/page.tsx`
  - Dedicated period detail page with overview, reporting calculator, and payout registry.
- Modify: `apps/admin/src/app/deposits/page.tsx`
  - Add period filter and show period association.

### Tests

- Modify: `apps/api/src/periods/periods.service.spec.ts`
- Modify: `apps/api/src/deposits/deposits.service.spec.ts`
- Create: `apps/api/src/periods/period-transition.guard.spec.ts`
- Create: `apps/api/src/periods/period-analytics.service.spec.ts`
- Create: `apps/api/src/periods/period-settlement.service.spec.ts`
- Create: `apps/api/src/periods/period-payout-registry.service.spec.ts`

### Documentation

- Modify: `docs/superpowers/specs/2026-04-03-period-lifecycle-and-settlement-design.md`
  - Link the implementation outcome if naming changes are needed during execution.

## Task 1: Replace Period Statuses With The Business Lifecycle

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/src/periods/dto/period.dto.ts`
- Modify: `apps/api/src/periods/periods.service.ts`
- Modify: `apps/api/src/periods/admin-periods.controller.ts`
- Test: `apps/api/src/periods/periods.service.spec.ts`
- Test: `apps/api/src/periods/period-transition.guard.spec.ts`

- [ ] **Step 1: Write the failing transition tests**

```ts
it('allows deposit creation only for FUNDING periods', async () => {
  prisma.investmentPeriod.findUnique.mockResolvedValue({ status: 'TRADING_ACTIVE' });

  await expect(service.create('user-1', dto)).rejects.toThrow(
    'Investment period is not accepting deposits',
  );
});

it('allows only forward period transitions', () => {
  expect(canTransition('FUNDING', 'TRADING_ACTIVE')).toBe(true);
  expect(canTransition('TRADING_ACTIVE', 'FUNDING')).toBe(false);
});
```

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `cmd /c npm test --workspace=apps/api -- --runInBand src/periods/periods.service.spec.ts src/deposits/deposits.service.spec.ts src/periods/period-transition.guard.spec.ts`

Expected: FAIL because the new enum values and guard do not exist yet.

- [ ] **Step 3: Update the enum and add the transition guard**

```prisma
enum InvestmentPeriodStatus {
  FUNDING
  TRADING_ACTIVE
  REPORTING
  PAYOUT_IN_PROGRESS
  CLOSED
}
```

```ts
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  FUNDING: ['TRADING_ACTIVE'],
  TRADING_ACTIVE: ['REPORTING'],
  REPORTING: ['PAYOUT_IN_PROGRESS'],
  PAYOUT_IN_PROGRESS: ['CLOSED'],
  CLOSED: [],
};
```

- [ ] **Step 4: Enforce the new period rules in services and DTOs**

```ts
if (period.status !== InvestmentPeriodStatus.FUNDING) {
  throw new BadRequestException('Investment period is not accepting deposits');
}
```

```ts
if (!canTransition(existing.status, status)) {
  throw new BadRequestException(`Cannot transition period from ${existing.status} to ${status}`);
}
```

- [ ] **Step 5: Re-run the targeted tests**

Run: `cmd /c npm test --workspace=apps/api -- --runInBand src/periods/periods.service.spec.ts src/deposits/deposits.service.spec.ts src/periods/period-transition.guard.spec.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/src/periods/dto/period.dto.ts apps/api/src/periods/periods.service.ts apps/api/src/periods/admin-periods.controller.ts apps/api/src/periods/period-transition.guard.ts apps/api/src/periods/periods.service.spec.ts apps/api/src/periods/period-transition.guard.spec.ts apps/api/src/deposits/deposits.service.ts apps/api/src/deposits/deposits.service.spec.ts
git commit -m "feat: add lifecycle statuses for investment periods"
```

## Task 2: Add Period Analytics And Deposit Filtering

**Files:**
- Create: `apps/api/src/periods/period-analytics.service.ts`
- Create: `apps/api/src/periods/period-analytics.service.spec.ts`
- Modify: `apps/api/src/periods/admin-periods.controller.ts`
- Modify: `apps/api/src/deposits/admin-deposits.controller.ts`
- Modify: `apps/api/src/deposits/dto/deposit.dto.ts`
- Modify: `apps/admin/src/lib/api.ts`
- Modify: `apps/admin/src/app/deposits/page.tsx`
- Modify: `apps/admin/src/app/periods/page.tsx`

- [ ] **Step 1: Write failing analytics tests**

```ts
it('returns deposit count, total, and average for a period', async () => {
  prisma.deposit.aggregate.mockResolvedValue({
    _count: { deposit_id: 2 },
    _sum: { confirmed_amount: new Prisma.Decimal('300') },
  });

  await expect(service.getSummary('period-1')).resolves.toEqual({
    depositCount: 2,
    totalDepositedUsdt: 300,
    averageDepositUsdt: 150,
  });
});
```

- [ ] **Step 2: Run the analytics tests and confirm failure**

Run: `cmd /c npm test --workspace=apps/api -- --runInBand src/periods/period-analytics.service.spec.ts`

Expected: FAIL because the analytics service does not exist yet.

- [ ] **Step 3: Implement the analytics service and admin API**

```ts
const aggregate = await this.prisma.deposit.aggregate({
  where: { investment_period_id: periodId, status: { not: 'CANCELLED' } },
  _count: { deposit_id: true },
  _sum: { confirmed_amount: true },
});
```

```ts
return {
  depositCount,
  totalDepositedUsdt,
  averageDepositUsdt: depositCount === 0 ? 0 : totalDepositedUsdt / depositCount,
};
```

- [ ] **Step 4: Add admin deposit filtering by period**

```ts
@Get()
findAll(@Query('investment_period_id') periodId?: string) {
  return this.adminDepositsService.findAll({ investment_period_id: periodId });
}
```

```ts
getAdminDeposits({ investment_period_id: selectedPeriodId, limit: 100 })
```

- [ ] **Step 5: Re-run tests and build the admin screen**

Run: `cmd /c npm test --workspace=apps/api -- --runInBand src/periods/period-analytics.service.spec.ts`

Run: `cmd /c npm run build --workspace=apps/admin`

Expected: PASS and successful admin build

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/periods/period-analytics.service.ts apps/api/src/periods/period-analytics.service.spec.ts apps/api/src/periods/admin-periods.controller.ts apps/api/src/deposits/admin-deposits.controller.ts apps/api/src/deposits/dto/deposit.dto.ts apps/admin/src/lib/api.ts apps/admin/src/app/deposits/page.tsx apps/admin/src/app/periods/page.tsx
git commit -m "feat: add period analytics and deposit period filters"
```

## Task 3: Persist Settlement Snapshots And Preview Calculations

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/periods/period-settlement.service.ts`
- Create: `apps/api/src/periods/period-settlement.service.spec.ts`
- Modify: `apps/api/src/periods/admin-periods.controller.ts`
- Modify: `apps/api/src/periods/dto/period.dto.ts`
- Modify: `apps/admin/src/lib/api.ts`
- Create: `apps/admin/src/app/periods/[id]/page.tsx`

- [ ] **Step 1: Write the failing settlement calculation test**

```ts
it('calculates net distributable amount with trader fee and network fees', async () => {
  const preview = await service.previewSettlement('period-1', {
    endingBalanceUsdt: 1200,
    traderFeePercent: 40,
    networkFees: { TRON: 5, TON: 3, BSC: 2 },
  });

  expect(preview.grossPnlUsdt).toBe(200);
  expect(preview.traderFeeUsdt).toBe(80);
  expect(preview.netDistributableUsdt).toBe(1110);
});
```

- [ ] **Step 2: Run the targeted settlement test and verify failure**

Run: `cmd /c npm test --workspace=apps/api -- --runInBand src/periods/period-settlement.service.spec.ts`

Expected: FAIL because the service and persistence model do not exist.

- [ ] **Step 3: Add the settlement snapshot model and preview service**

```prisma
model PeriodSettlementSnapshot {
  settlement_snapshot_id  String   @id @default(uuid())
  investment_period_id    String   @unique
  ending_balance_usdt     Decimal
  total_deposits_usdt     Decimal
  gross_pnl_usdt          Decimal
  trader_fee_percent      Decimal
  trader_fee_usdt         Decimal
  network_fees_json       Json
  net_distributable_usdt  Decimal
  calculated_at           DateTime @default(now())
  approved_at             DateTime?
  approved_by             String?
}
```

```ts
const traderFeeUsdt = grossPnlUsdt > 0 ? grossPnlUsdt * (traderFeePercent / 100) : 0;
const netDistributableUsdt = endingBalanceUsdt - traderFeeUsdt - totalNetworkFeesUsdt;
```

- [ ] **Step 4: Expose preview and approval endpoints**

```ts
@Post(':id/settlement/preview')
preview(@Param('id') id: string, @Body() dto: SettlementPreviewDto) {
  return this.periodSettlementService.previewSettlement(id, dto);
}

@Post(':id/settlement/approve')
approve(@Param('id') id: string, @Body() dto: SettlementApproveDto, @CurrentUser() user: any) {
  return this.periodSettlementService.approveSettlement(id, dto, user.user_id);
}
```

- [ ] **Step 5: Build the admin reporting calculator page**

```ts
const preview = await previewPeriodSettlement(periodId, {
  endingBalanceUsdt,
  traderFeePercent,
  networkFees,
});
setPreview(preview);
```

- [ ] **Step 6: Re-run the settlement tests and admin build**

Run: `cmd /c npm test --workspace=apps/api -- --runInBand src/periods/period-settlement.service.spec.ts`

Run: `cmd /c npm run build --workspace=apps/admin`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/src/periods/period-settlement.service.ts apps/api/src/periods/period-settlement.service.spec.ts apps/api/src/periods/admin-periods.controller.ts apps/api/src/periods/dto/period.dto.ts apps/admin/src/lib/api.ts apps/admin/src/app/periods/[id]/page.tsx
git commit -m "feat: add period settlement preview and approval"
```

## Task 4: Generate The Payout Registry From Approved Settlement

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/periods/period-payout-registry.service.ts`
- Create: `apps/api/src/periods/period-payout-registry.service.spec.ts`
- Modify: `apps/api/src/periods/admin-periods.controller.ts`
- Modify: `apps/admin/src/lib/api.ts`
- Modify: `apps/admin/src/app/periods/[id]/page.tsx`

- [ ] **Step 1: Write the failing payout-registry test**

```ts
it('allocates payout items proportionally and by network fee bucket', async () => {
  const registry = await service.generateRegistry('period-1');

  expect(registry.items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        deposit_id: 'deposit-1',
        network: 'TRON',
        payout_net_usdt: expect.any(Number),
      }),
    ]),
  );
});
```

- [ ] **Step 2: Run the payout-registry test and verify failure**

Run: `cmd /c npm test --workspace=apps/api -- --runInBand src/periods/period-payout-registry.service.spec.ts`

Expected: FAIL because the payout registry service and model do not exist.

- [ ] **Step 3: Add the payout registry persistence model and generator**

```prisma
model PeriodPayoutRegistryItem {
  payout_registry_item_id String   @id @default(uuid())
  payout_registry_id      String
  deposit_id              String
  network                 String
  asset_symbol            String
  source_address          String
  deposit_amount_usdt     Decimal
  share_ratio             Decimal
  payout_gross_usdt       Decimal
  payout_fee_usdt         Decimal
  payout_net_usdt         Decimal
  status                  PayoutStatus @default(PREPARED)
  tx_hash                 String?
  sent_at                 DateTime?
  completed_at            DateTime?
  failure_reason          String?
}
```

```ts
const networkFeeShare = networkFeePool * (depositAmountUsdt / networkDepositTotalUsdt);
const payoutNetUsdt = payoutGrossUsdt - networkFeeShare;
```

- [ ] **Step 4: Expose payout registry endpoints**

```ts
@Post(':id/payout-registry/generate')
generate(@Param('id') id: string) {
  return this.periodPayoutRegistryService.generateRegistry(id);
}

@Get(':id/payout-registry')
findRegistry(@Param('id') id: string) {
  return this.periodPayoutRegistryService.findByPeriod(id);
}
```

- [ ] **Step 5: Render payout registry in the admin period details page**

```ts
const registry = await getPeriodPayoutRegistry(periodId);
setRegistryItems(registry.items);
```

- [ ] **Step 6: Re-run payout tests and admin build**

Run: `cmd /c npm test --workspace=apps/api -- --runInBand src/periods/period-payout-registry.service.spec.ts`

Run: `cmd /c npm run build --workspace=apps/admin`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/src/periods/period-payout-registry.service.ts apps/api/src/periods/period-payout-registry.service.spec.ts apps/api/src/periods/admin-periods.controller.ts apps/admin/src/lib/api.ts apps/admin/src/app/periods/[id]/page.tsx
git commit -m "feat: generate period payout registry"
```

## Task 5: Wire Lifecycle Actions And Closing Rules In Admin

**Files:**
- Modify: `apps/api/src/periods/periods.service.ts`
- Modify: `apps/api/src/periods/admin-periods.controller.ts`
- Modify: `apps/admin/src/app/periods/page.tsx`
- Modify: `apps/admin/src/app/periods/[id]/page.tsx`
- Modify: `apps/admin/src/lib/api.ts`
- Test: `apps/api/src/periods/periods.service.spec.ts`

- [ ] **Step 1: Write the failing lifecycle-action tests**

```ts
it('blocks closing a period when payout items are unresolved', async () => {
  prisma.periodPayoutItem.count.mockResolvedValue(1);

  await expect(service.updateStatus('period-1', 'CLOSED')).rejects.toThrow(
    'Cannot close period with unresolved payout items',
  );
});
```

- [ ] **Step 2: Run the lifecycle tests and confirm failure**

Run: `cmd /c npm test --workspace=apps/api -- --runInBand src/periods/periods.service.spec.ts`

Expected: FAIL because the closing guard does not exist yet.

- [ ] **Step 3: Add lifecycle guards around settlement approval and closing**

```ts
if (status === 'PAYOUT_IN_PROGRESS' && !approvedSettlement) {
  throw new BadRequestException('Settlement must be approved before payouts start');
}

if (status === 'CLOSED' && unresolvedPayoutCount > 0) {
  throw new BadRequestException('Cannot close period with unresolved payout items');
}
```

- [ ] **Step 4: Add explicit admin actions in the UI**

```tsx
<button onClick={() => transitionPeriod(periodId, 'TRADING_ACTIVE')}>Start Trading</button>
<button onClick={() => transitionPeriod(periodId, 'REPORTING')}>Open Reporting</button>
<button onClick={() => transitionPeriod(periodId, 'PAYOUT_IN_PROGRESS')}>Open Payouts</button>
<button onClick={() => transitionPeriod(periodId, 'CLOSED')}>Close Period</button>
```

- [ ] **Step 5: Re-run tests and admin build**

Run: `cmd /c npm test --workspace=apps/api -- --runInBand src/periods/periods.service.spec.ts`

Run: `cmd /c npm run build --workspace=apps/admin`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/periods/periods.service.ts apps/api/src/periods/admin-periods.controller.ts apps/api/src/periods/periods.service.spec.ts apps/admin/src/app/periods/page.tsx apps/admin/src/app/periods/[id]/page.tsx apps/admin/src/lib/api.ts
git commit -m "feat: add lifecycle actions for period settlement flow"
```

## Task 6: Final Verification And Documentation Pass

**Files:**
- Modify: `docs/superpowers/specs/2026-04-03-period-lifecycle-and-settlement-design.md`
- Modify: `docs/superpowers/plans/2026-04-03-period-lifecycle-and-settlement.md`

- [ ] **Step 1: Run the backend period and deposit test suite**

Run: `cmd /c npm test --workspace=apps/api -- --runInBand src/periods/periods.service.spec.ts src/periods/period-transition.guard.spec.ts src/periods/period-analytics.service.spec.ts src/periods/period-settlement.service.spec.ts src/periods/period-payout-registry.service.spec.ts src/deposits/deposits.service.spec.ts`

Expected: PASS

- [ ] **Step 2: Build API and admin**

Run: `cmd /c npm run build --workspace=apps/api`

Run: `cmd /c npm run build --workspace=apps/admin`

Expected: PASS

- [ ] **Step 3: Apply Prisma migration locally**

Run: `cmd /c npx prisma migrate dev --schema apps/api/prisma/schema.prisma --name period_lifecycle_and_settlement`

Expected: migration created successfully and Prisma client updated
Prerequisite: `DATABASE_URL` must be set in the local environment before running this command

- [ ] **Step 4: Smoke-test the admin flow manually**

Manual checklist:
- create a `FUNDING` period
- create deposits in that period
- confirm admin overview shows count, total, average
- transition to `TRADING_ACTIVE`
- verify new deposits are rejected
- transition to `REPORTING`
- preview and approve settlement
- generate payout registry
- transition to `PAYOUT_IN_PROGRESS`
- verify `CLOSED` is blocked while unresolved payout items exist

- [ ] **Step 5: Update docs if implementation naming changed**

```md
- Final enum names:
  - FUNDING
  - TRADING_ACTIVE
  - REPORTING
  - PAYOUT_IN_PROGRESS
  - CLOSED
```

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/specs/2026-04-03-period-lifecycle-and-settlement-design.md docs/superpowers/plans/2026-04-03-period-lifecycle-and-settlement.md apps/api/prisma/migrations
git commit -m "docs: finalize period lifecycle implementation notes"
```

## Self-Review

### Spec Coverage

- Period lifecycle statuses: covered by Task 1 and Task 5.
- Deposit-to-period rules and filtering: covered by Task 1 and Task 2.
- Admin period metrics: covered by Task 2.
- Reporting calculator and trader fee rules: covered by Task 3.
- Network-specific fee handling: covered by Task 3 and Task 4.
- Payout registry generation: covered by Task 4.
- Safe closing rules and manual-first payout flow: covered by Task 5.

### Placeholder Scan

- No `TBD`, `TODO`, or “similar to previous task” shortcuts remain.
- Each task includes exact files, target tests, and verification commands.

### Type Consistency

- Period lifecycle names are consistently `FUNDING`, `TRADING_ACTIVE`, `REPORTING`, `PAYOUT_IN_PROGRESS`, `CLOSED`.
- Settlement storage is consistently named `PeriodSettlementSnapshot`.
- Payout registry storage is consistently named `PeriodPayoutRegistryItem`.
