# Referral Preview And Profile Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add pre-publish referral verification to Trader Reporting and move user-facing referral/team/address surfaces into one `Мой профиль` area in the miniapp.

**Architecture:** Keep referral rewards authoritative in backend ledger form, but introduce a projected referral preview path for admin before `Publish`. On the user side, stop scattering personal navigation across the home screen and consolidate `Мои адреса`, `Моя команда`, and referral balances under one `Мой профиль` section with nested routes.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Next.js App Router, React, Jest, npm workspaces

---

## File Structure

### Backend referral preview

- Modify: `apps/api/src/referrals/referral-rewards.service.ts`
  - Add pure preview calculation that mirrors materialization rules without writing to `referralReward`.
- Modify: `apps/api/src/referrals/referral-rewards.service.spec.ts`
  - Cover preview/materialized parity and edge cases.
- Modify: `apps/api/src/periods/dto/period.dto.ts`
  - Add DTO fields for projected referral rows and summary mode.
- Modify: `apps/api/src/periods/periods.service.ts`
  - Include projected referral totals in trader report builder before publish.
- Modify: `apps/api/src/periods/periods.service.spec.ts`
  - Lock builder behavior for draft/approved/published reports.

### Admin reporting UI

- Modify: `apps/admin/src/app/periods/[id]/reporting/page.tsx`
  - Show projected-vs-materialized referral state clearly.
- Modify: `apps/admin/src/lib/api.ts`
  - Accept enriched builder payload fields if any client typing is needed.

### Miniapp profile IA

- Modify: `apps/miniapp/src/app/page.tsx`
  - Replace separate home actions with a single `Мой профиль` entry.
- Create: `apps/miniapp/src/app/profile/page.tsx`
  - Profile overview hub.
- Create: `apps/miniapp/src/app/profile/addresses/page.tsx`
  - Move current addresses UX under profile.
- Create: `apps/miniapp/src/app/profile/team/page.tsx`
  - Move/refactor team workspace under profile.
- Create: `apps/miniapp/src/app/profile/referrals/page.tsx`
  - Show referral balances and referral reward history.
- Modify: `apps/miniapp/src/app/addresses/page.tsx`
  - Either remove, redirect, or keep as compatibility shim.
- Modify: `apps/miniapp/src/lib/api.ts`
  - Add or align profile/team/referral API calls.
- Modify: `apps/miniapp/src/providers/language-provider.tsx`
  - Add strings for profile hub and nested sections.

### Backend miniapp profile APIs

- Modify: `apps/api/src/users/users.controller.ts`
  - Add `/me/referral` and `/me/team` endpoints or route them through a dedicated user-facing referrals controller.
- Modify: `apps/api/src/users/users.service.ts`
  - Return profile summary fields needed by miniapp.
- Create or Modify: `apps/api/src/referrals/dto/*.ts`
  - Define user-facing referral DTOs as needed.
- Create or Modify: `apps/api/src/referrals/*`
  - Add services/controllers for team summary and referral balance history if that logic does not belong in `UsersService`.

### Tests

- Modify: `apps/api/src/referrals/referral-rewards.service.spec.ts`
- Modify: `apps/api/src/periods/periods.service.spec.ts`
- Create or Modify: `apps/api/src/users/users.controller.spec.ts`
- Create or Modify: `apps/api/src/users/users.service.spec.ts`
- Create or Modify: miniapp component/page tests where the repo already uses them

---

## Task 1: Add Projected Referral Preview For Admin Before Publish

**Files:**
- Modify: `apps/api/src/referrals/referral-rewards.service.ts`
- Modify: `apps/api/src/referrals/referral-rewards.service.spec.ts`

- [ ] **Step 1: Write the failing preview test**

```ts
it('calculates projected referral rewards without writing ledger rows', async () => {
  mockPrisma.profitLossReport.findMany.mockResolvedValue([
    {
      report_id: 'plr-1',
      net_result: '120',
      deposit: {
        deposit_id: 'dep-1',
        user_id: 'source-user',
        network: 'BSC',
        confirmed_amount: '1000',
        requested_amount: null,
        created_at: new Date('2026-04-01T10:00:00.000Z'),
        user: {
          user_id: 'source-user',
          referred_by_user_id: 'direct-user',
          referred_by: {
            user_id: 'direct-user',
            referred_by_user_id: 'upstream-user',
          },
        },
      },
    },
  ]);

  mockPrisma.deposit.findFirst
    .mockResolvedValueOnce({ deposit_id: 'dep-direct' })
    .mockResolvedValueOnce({ deposit_id: 'dep-upstream' });

  const preview = await service.previewRewardsForPublishedTraderReport('report-1', 'period-1');

  expect(preview).toEqual([
    expect.objectContaining({
      source_deposit_id: 'dep-1',
      beneficiary_user_id: 'direct-user',
      reward_type: 'FIRST_DEPOSIT',
      reward_amount: 6,
    }),
    expect.objectContaining({
      source_deposit_id: 'dep-1',
      beneficiary_user_id: 'upstream-user',
      reward_type: 'PERIOD_PROFIT',
      reward_amount: 6,
    }),
  ]);
  expect(mockPrisma.referralReward.upsert).not.toHaveBeenCalled();
  expect(mockPrisma.user.update).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm.cmd run test --workspace=apps/api -- referral-rewards.service.spec.ts --runInBand`

Expected: FAIL because `previewRewardsForPublishedTraderReport` does not exist yet.

- [ ] **Step 3: Implement the preview path**

```ts
async previewRewardsForPublishedTraderReport(traderReportId: string, investmentPeriodId: string) {
  const reports = await this.loadPublishedDepositReports(traderReportId);
  const activeParticipationCache = new Map<string, boolean>();
  const projected: ProjectedReferralReward[] = [];

  for (const report of reports) {
    await this.collectProjectedRewardsForDepositReport(
      report,
      investmentPeriodId,
      activeParticipationCache,
      projected,
    );
  }

  return projected;
}
```

- [ ] **Step 4: Reuse the same reward rules in preview and materialize paths**

```ts
private buildProjectedReward(input: {
  beneficiaryUserId: string;
  sourceUserId: string;
  sourceDepositId: string;
  sourceReportId: string;
  investmentPeriodId: string;
  referralLevel: 1 | 2;
  rewardType: ReferralRewardType;
  baseAmount: number;
  rewardPercent: number;
  traderReportId: string;
  network: string;
}) {
  const rewardAmount = this.round2((input.baseAmount * input.rewardPercent) / 100);
  if (rewardAmount <= 0) {
    return null;
  }

  return {
    beneficiary_user_id: input.beneficiaryUserId,
    source_user_id: input.sourceUserId,
    source_deposit_id: input.sourceDepositId,
    source_report_id: input.sourceReportId,
    investment_period_id: input.investmentPeriodId,
    referral_level: input.referralLevel,
    reward_type: input.rewardType,
    base_amount: this.round2(input.baseAmount),
    reward_percent: input.rewardPercent,
    reward_amount: rewardAmount,
    metadata_json: {
      source_trader_report_id: input.traderReportId,
      balance_bucket: this.resolveReferralBalanceField(input.network),
    },
  };
}
```

- [ ] **Step 5: Re-run the referral reward tests**

Run: `npm.cmd run test --workspace=apps/api -- referral-rewards.service.spec.ts --runInBand`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/referrals/referral-rewards.service.ts apps/api/src/referrals/referral-rewards.service.spec.ts
git commit -m "feat: add projected referral reward preview"
```

## Task 2: Surface Projected Referral Totals In Trader Report Builder

**Files:**
- Modify: `apps/api/src/periods/dto/period.dto.ts`
- Modify: `apps/api/src/periods/periods.service.ts`
- Modify: `apps/api/src/periods/periods.service.spec.ts`

- [ ] **Step 1: Write the failing builder test**

```ts
it('returns projected referral totals before publish and materialized totals after publish', async () => {
  mockPrisma.periodTraderReport.findUnique.mockResolvedValue({
    trader_report_id: 'report-1',
    investment_period_id: 'period-1',
    trader_id: 'trader-1',
    status: 'APPROVED',
    ending_balance_usdt: '1200',
    trader_fee_percent: '40',
    network_fees_json: { TRON: 10, TON: 5, BSC: 0 },
    trader: { trader_id: 'trader-1', nickname: 'alpha', slug: 'alpha', display_name: 'Alpha' },
  });

  mockReferralRewardsService.previewRewardsForPublishedTraderReport.mockResolvedValue([
    {
      source_deposit_id: 'dep-1',
      reward_type: 'FIRST_DEPOSIT',
      reward_amount: 3.6,
    },
    {
      source_deposit_id: 'dep-1',
      reward_type: 'PERIOD_PROFIT',
      reward_amount: 4.41,
    },
  ]);

  const builder = await (service as any).getTraderReportBuilder('period-1', 'trader-1');

  expect(builder.referral_mode).toBe('PROJECTED');
  expect(builder.rows[0]).toMatchObject({
    referral_first_deposit_usdt: 3.6,
    referral_period_profit_usdt: 4.41,
    referral_reward_total_usdt: 8.01,
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm.cmd run test --workspace=apps/api -- periods.service.spec.ts --runInBand`

Expected: FAIL because the builder does not distinguish projected and materialized referral totals yet.

- [ ] **Step 3: Add DTO fields for referral mode**

```ts
export class PeriodTraderReportPreviewDto {
  // existing fields
  referral_mode: 'PROJECTED' | 'MATERIALIZED';
}
```

- [ ] **Step 4: Prefer projected rewards before publish**

```ts
const referralTotals = existingReport?.status === ReportStatus.PUBLISHED
  ? await this.getReferralRewardTotals(periodId, deposits.map((deposit) => deposit.deposit_id))
  : this.aggregateReferralPreviewTotals(
      await this.referralRewardsService.previewRewardsForPublishedTraderReport(
        existingReport?.trader_report_id ?? '',
        periodId,
      ),
      deposits.map((deposit) => deposit.deposit_id),
    );

const referralMode = existingReport?.status === ReportStatus.PUBLISHED
  ? 'MATERIALIZED'
  : 'PROJECTED';
```

- [ ] **Step 5: Add a pure aggregation helper for preview rows**

```ts
private aggregateReferralPreviewTotals(
  projectedRewards: Array<{ source_deposit_id: string; reward_type: string; reward_amount: number }>,
  depositIds: string[],
) {
  const totals = new Map<string, { firstDeposit: number; periodProfit: number; total: number }>();
  const allowedDepositIds = new Set(depositIds);

  for (const reward of projectedRewards) {
    if (!allowedDepositIds.has(reward.source_deposit_id)) {
      continue;
    }

    const entry = totals.get(reward.source_deposit_id) ?? { firstDeposit: 0, periodProfit: 0, total: 0 };
    if (reward.reward_type === 'FIRST_DEPOSIT') {
      entry.firstDeposit = this.round2(entry.firstDeposit + reward.reward_amount);
    } else if (reward.reward_type === 'PERIOD_PROFIT') {
      entry.periodProfit = this.round2(entry.periodProfit + reward.reward_amount);
    }
    entry.total = this.round2(entry.firstDeposit + entry.periodProfit);
    totals.set(reward.source_deposit_id, entry);
  }

  return totals;
}
```

- [ ] **Step 6: Re-run the periods tests**

Run: `npm.cmd run test --workspace=apps/api -- periods.service.spec.ts --runInBand`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/periods/dto/period.dto.ts apps/api/src/periods/periods.service.ts apps/api/src/periods/periods.service.spec.ts
git commit -m "feat: add projected referral totals to trader report builder"
```

## Task 3: Show Referral Verification State In Admin Reporting Screen

**Files:**
- Modify: `apps/admin/src/app/periods/[id]/reporting/page.tsx`
- Modify: `apps/admin/src/lib/api.ts`

- [ ] **Step 1: Add a small UI contract test if the repo has one for this screen; otherwise add type-safe render assertions inline**

```tsx
expect(screen.getByText('Referral verification')).toBeInTheDocument();
expect(screen.getByText('Projected before publish')).toBeInTheDocument();
```

- [ ] **Step 2: Run the relevant test or build to verify failure**

Run: `npm.cmd run build --workspace=apps/admin`

Expected: Either build fails on missing fields, or the UI still does not show the new section.

- [ ] **Step 3: Render the referral verification panel**

```tsx
<div className="rounded-lg bg-bg-secondary p-4">
  <h3 className="font-semibold">Referral verification</h3>
  <p className="mt-1 text-sm text-text-secondary">
    {currentView.referral_mode === 'PROJECTED'
      ? 'Projected before publish. Review these values before making the report visible to users.'
      : 'Materialized from backend ledger after publish.'}
  </p>
</div>
```

- [ ] **Step 4: Label each deposit row with the source of referral values**

```tsx
<div className="text-xs text-text-secondary">
  {currentView.referral_mode === 'PROJECTED' ? 'Projected' : 'Materialized'}
</div>
```

- [ ] **Step 5: Re-run the admin build**

Run: `npm.cmd run build --workspace=apps/admin`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/app/periods/[id]/reporting/page.tsx apps/admin/src/lib/api.ts
git commit -m "feat: show referral verification state in admin reporting"
```

## Task 4: Add User-Facing Referral And Team APIs Under Profile

**Files:**
- Modify: `apps/api/src/users/users.controller.ts`
- Modify: `apps/api/src/users/users.service.ts`
- Create or Modify: `apps/api/src/users/dto/user.dto.ts`
- Create or Modify: `apps/api/src/referrals/*.ts`

- [ ] **Step 1: Write the failing user service test**

```ts
it('returns referral profile with held balances and payout preference', async () => {
  mockPrisma.user.findUnique.mockResolvedValue({
    user_id: 'user-1',
    referral_payout_preference: 'WITHDRAW',
    held_referral_balance_bsc: '15.50',
    held_referral_balance_ton: '3.20',
    referral_code: 'ALICE01',
  });

  await expect(service.getReferralProfile('user-1')).resolves.toEqual({
    referral_code: 'ALICE01',
    referral_payout_preference: 'WITHDRAW',
    held_referral_balances: {
      BSC: 15.5,
      TON: 3.2,
    },
  });
});
```

- [ ] **Step 2: Run the user tests to verify failure**

Run: `npm.cmd run test --workspace=apps/api -- users.service.spec.ts --runInBand`

Expected: FAIL because `getReferralProfile` does not exist yet.

- [ ] **Step 3: Add `/me/referral` and `/me/team` endpoints**

```ts
@Get('referral')
async getReferralProfile(@CurrentUser() user: any) {
  return this.usersService.getReferralProfile(user.user_id);
}

@Get('team')
async getReferralTeam(@CurrentUser() user: any) {
  return this.usersService.getReferralTeam(user.user_id);
}
```

- [ ] **Step 4: Return ledger-backed referral data**

```ts
async getReferralProfile(userId: string) {
  const user = await this.prisma.user.findUnique({
    where: { user_id: userId },
    select: {
      referral_code: true,
      referral_payout_preference: true,
      held_referral_balance_bsc: true,
      held_referral_balance_ton: true,
    },
  });

  return {
    referral_code: user?.referral_code ?? null,
    referral_payout_preference: user?.referral_payout_preference ?? 'WITHDRAW',
    held_referral_balances: {
      BSC: this.toNumber(user?.held_referral_balance_bsc),
      TON: this.toNumber(user?.held_referral_balance_ton),
    },
  };
}
```

- [ ] **Step 5: Re-run user tests**

Run: `npm.cmd run test --workspace=apps/api -- users.service.spec.ts --runInBand`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/users/users.controller.ts apps/api/src/users/users.service.ts apps/api/src/users/dto/user.dto.ts apps/api/src/referrals
git commit -m "feat: add miniapp referral and team profile endpoints"
```

## Task 5: Consolidate Miniapp Navigation Under My Profile

**Files:**
- Modify: `apps/miniapp/src/app/page.tsx`
- Create: `apps/miniapp/src/app/profile/page.tsx`
- Create: `apps/miniapp/src/app/profile/addresses/page.tsx`
- Create: `apps/miniapp/src/app/profile/team/page.tsx`
- Create: `apps/miniapp/src/app/profile/referrals/page.tsx`
- Modify: `apps/miniapp/src/app/addresses/page.tsx`
- Modify: `apps/miniapp/src/lib/api.ts`
- Modify: `apps/miniapp/src/providers/language-provider.tsx`

- [ ] **Step 1: Write or update a navigation test**

```js
assert.ok(source.includes("href=\"/profile\""));
assert.equal(source.includes("href=\"/addresses\""), false);
assert.equal(source.includes("href=\"/team\""), false);
```

- [ ] **Step 2: Run the miniapp test/build to verify failure**

Run: `npm.cmd run build --workspace=apps/miniapp`

Expected: FAIL or missing route coverage until the new profile pages exist.

- [ ] **Step 3: Add the profile hub**

```tsx
export default function ProfilePage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Мой профиль</h1>
      <div className="mt-4 grid gap-3">
        <Link href="/profile/referrals">Реферальные балансы</Link>
        <Link href="/profile/addresses">Мои адреса</Link>
        <Link href="/profile/team">Моя команда</Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Move `Мои адреса` under profile**

```tsx
// apps/miniapp/src/app/addresses/page.tsx
import { redirect } from 'next/navigation';

export default function AddressesRedirectPage() {
  redirect('/profile/addresses');
}
```

- [ ] **Step 5: Add the referrals page**

```tsx
const referralProfile = await getReferralProfile();
return (
  <div className="space-y-4">
    <div>BSC: {referralProfile.held_referral_balances.BSC}</div>
    <div>TON: {referralProfile.held_referral_balances.TON}</div>
    <div>{referralProfile.referral_payout_preference}</div>
  </div>
);
```

- [ ] **Step 6: Add the team page**

```tsx
const team = await getReferralTeam();
return (
  <div>
    <h1>Моя команда</h1>
    <div>{team.summary.total_members}</div>
  </div>
);
```

- [ ] **Step 7: Re-run the miniapp build**

Run: `npm.cmd run build --workspace=apps/miniapp`

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add apps/miniapp/src/app/page.tsx apps/miniapp/src/app/profile apps/miniapp/src/app/addresses/page.tsx apps/miniapp/src/lib/api.ts apps/miniapp/src/providers/language-provider.tsx
git commit -m "feat: consolidate profile, team, and addresses in miniapp"
```

## Task 6: Keep Deposit Report Focused And Add Referral Visibility In The Right Place

**Files:**
- Modify: `apps/miniapp/src/app/reports/[depositId]/page.tsx`
- Modify: `apps/miniapp/src/app/deposits/[id]/page.tsx`
- Modify: `apps/miniapp/src/providers/language-provider.tsx`

- [ ] **Step 1: Add a failing UI test or page assertion**

```js
assert.equal(reportPageSource.includes('Referral reward'), false);
assert.ok(depositPageSource.includes('/profile/referrals'));
```

- [ ] **Step 2: Run the miniapp build to confirm current UX mismatch**

Run: `npm.cmd run build --workspace=apps/miniapp`

Expected: Either missing referral navigation or no user-facing bridge from deposit area.

- [ ] **Step 3: Keep the report page deposit-focused**

```tsx
<p className="text-text-secondary text-xs">
  This report shows the trading result for this cycle. Referral rewards are shown separately in your profile.
</p>
```

- [ ] **Step 4: Add a route from deposit/report context into profile referrals where appropriate**

```tsx
<Link href="/profile/referrals" className="rounded-2xl border border-cyan-300/10 bg-slate-950/70 px-4 py-3 text-center text-sm font-medium text-slate-200">
  Реферальные балансы
</Link>
```

- [ ] **Step 5: Re-run the miniapp build**

Run: `npm.cmd run build --workspace=apps/miniapp`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/miniapp/src/app/reports/[depositId]/page.tsx apps/miniapp/src/app/deposits/[id]/page.tsx apps/miniapp/src/providers/language-provider.tsx
git commit -m "feat: separate deposit reports from referral balances"
```

## Task 7: Final Verification

**Files:**
- Modify: `docs/superpowers/plans/2026-04-18-referral-preview-and-profile-navigation.md`

- [ ] **Step 1: Run targeted backend referral and periods tests**

Run: `npm.cmd run test --workspace=apps/api -- referral-rewards.service.spec.ts --runInBand`

Run: `npm.cmd run test --workspace=apps/api -- periods.service.spec.ts --runInBand`

Expected: PASS

- [ ] **Step 2: Run miniapp and admin builds**

Run: `npm.cmd run build --workspace=apps/admin`

Run: `npm.cmd run build --workspace=apps/miniapp`

Expected: PASS

- [ ] **Step 3: Manual smoke checklist**

Manual checklist:
- open trader reporting for one approved but unpublished report
- verify referral section is marked `Projected before publish`
- publish the report
- refresh and verify referral section becomes `Materialized from backend ledger`
- open one deposit with `REPORT_READY`
- open its report and verify deposit metrics are visible
- open `Мой профиль -> Реферальные балансы`
- verify held balances and referral history are visible there
- open `Мой профиль -> Мои адреса`
- verify old addresses flow still works
- open `Мой профиль -> Моя команда`
- verify team summary renders

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-04-18-referral-preview-and-profile-navigation.md
git commit -m "docs: finalize referral preview and profile navigation plan"
```

## Self-Review

### Spec Coverage

- Pre-publish referral verification: covered by Tasks 1-3.
- Exact referral totals per deposit/cycle in trader reporting: covered by Task 2.
- User-facing visibility after publish: covered by Tasks 4-6.
- Navigation consolidation under `Мой профиль`: covered by Task 5.
- Keep deposit report and referral balances conceptually separate: covered by Task 6.

### Placeholder Scan

- No `TODO`, `TBD`, or “similar to previous task” shortcuts remain.
- Each task includes exact files, concrete code, explicit commands, and expected outcomes.

### Type Consistency

- `PROJECTED` vs `MATERIALIZED` is used consistently as the referral verification state.
- `Мой профиль` remains the single top-level personal navigation surface.
- `Мои адреса`, `Моя команда`, and `Реферальные балансы` are consistently nested under `/profile/*`.
