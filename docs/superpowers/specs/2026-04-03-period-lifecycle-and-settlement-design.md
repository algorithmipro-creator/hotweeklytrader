# Period Lifecycle And Settlement Design

**Goal**

Define a safe, auditable lifecycle for investment periods so deposits are explicitly attached to a period, admins can see period-level deposit metrics, and closed periods can produce a reviewed payout registry for manual or semi-automatic returns.

**Current Context**

- Deposits already reference `investment_period_id` in the backend schema.
- Miniapp deposit creation already requires selecting a period.
- Admin can create and manage periods, but period lifecycle rules, period analytics, and settlement workflows are not yet modeled as one coherent system.
- Payout automation is not the immediate goal. The near-term goal is to calculate and prepare payout instructions safely.

## Objectives

1. Treat each investment period as a state machine with explicit business statuses.
2. Make deposits clearly attributable to a single period for filtering and reporting.
3. Show per-period metrics in admin:
   - number of deposits
   - total deposited amount in USDT
   - average deposit in USDT
4. Add a reporting calculator for period settlement:
   - ending balance in USDT
   - trader fee percent, default `40`
   - network fees per network
5. Generate a payout registry from the selected period's deposits.
6. Keep the design safe for manual review and future automation.

## Non-Goals

- Full autonomous payout execution in this phase.
- Rebuilding deposits into a full ledger architecture in this phase.
- Supporting multiple periods per deposit.
- Allowing deposits into non-funding periods.

## Period Lifecycle

The business lifecycle for a period will be:

1. `FUNDING`
2. `TRADING_ACTIVE`
3. `REPORTING`
4. `PAYOUT_IN_PROGRESS`
5. `CLOSED`

### Status Meaning

`FUNDING`
- Admin has opened the period for deposits.
- Users can create deposits in this period.
- Deposit watchers continue to process inbound transfers normally.

`TRADING_ACTIVE`
- Deposit intake is closed.
- No new deposits can be created for the period.
- Users can view trader reports but cannot join the period anymore.

`REPORTING`
- Trading has ended.
- Admin enters final settlement inputs.
- System calculates period result and proposed per-deposit payouts.
- No payouts are sent automatically in this state.

`PAYOUT_IN_PROGRESS`
- Settlement has been approved.
- A payout registry exists and is used for manual or semi-automatic execution.
- Individual payout items may be completed at different times.

`CLOSED`
- Period is fully completed and archived.
- No new changes to settlement data or payout items except through explicit admin override tooling if ever introduced later.

## Allowed State Transitions

- `FUNDING -> TRADING_ACTIVE`
- `TRADING_ACTIVE -> REPORTING`
- `REPORTING -> PAYOUT_IN_PROGRESS`
- `PAYOUT_IN_PROGRESS -> CLOSED`

Backwards transitions are not part of the normal workflow and should be blocked by default.

## Deposit Rules

- Every deposit belongs to exactly one period through `investment_period_id`.
- Deposits can only be created for periods in `FUNDING`.
- Deposits remain queryable by period in both user and admin views.
- Period-level analytics are computed only from deposits assigned to that period.

## Period Analytics In Admin

For each period, admin should be able to see:

- `depositCount`
- `totalDepositedUsdt`
- `averageDepositUsdt`

Formula:

- `averageDepositUsdt = totalDepositedUsdt / depositCount`
- If `depositCount = 0`, average is `0`

These values should be available:

- in a period details view
- in period lists where summary columns are useful

## Reporting Calculator

In `REPORTING`, admin fills a settlement calculator with:

- `endingBalanceUsdt`
- `traderFeePercent`
- `networkFees`
  - `TRON`
  - `TON`
  - `BSC`

### Settlement Formulas

Input values:

- `totalDepositsUsdt`
- `endingBalanceUsdt`
- `traderFeePercent`
- `totalNetworkFeesUsdt = sum(networkFees)`

Calculated values:

- `grossPnlUsdt = endingBalanceUsdt - totalDepositsUsdt`
- `traderFeeUsdt = grossPnlUsdt > 0 ? grossPnlUsdt * traderFeePercent / 100 : 0`
- `netDistributableUsdt = endingBalanceUsdt - traderFeeUsdt - totalNetworkFeesUsdt`

Per-deposit values:

- `depositShare = depositAmountUsdt / totalDepositsUsdt`
- `payoutGrossUsdt = netDistributableUsdt * depositShare`

Network-fee allocation:

- Fees are entered per network.
- Each deposit receives a proportional fee share only from its own network fee bucket.
- Example: a `TRON` deposit shares only in the `TRON` fee pool.

Per-deposit final amount:

- `payoutFeeUsdt = proportional share of the deposit network fee pool`
- `payoutNetUsdt = payoutGrossUsdt - payoutFeeUsdt`

### Trader Fee Rule

- Default trader fee percent is `40`
- Admin may change it before approval
- If `grossPnlUsdt <= 0`, `traderFeeUsdt = 0`

## Settlement Snapshot

Settlement should be saved as an explicit snapshot instead of being recalculated invisibly from live data after approval.

Recommended persisted settlement record:

- `investment_period_id`
- `ending_balance_usdt`
- `total_deposits_usdt`
- `gross_pnl_usdt`
- `trader_fee_percent`
- `trader_fee_usdt`
- `network_fees_json`
- `net_distributable_usdt`
- `calculated_at`
- `approved_at`
- `approved_by`

This snapshot protects the workflow from accidental changes after review and gives a stable audit trail.

## Payout Registry

After settlement approval, the system generates payout items for the selected period.

Recommended payout item fields:

- `investment_period_id`
- `deposit_id`
- `network`
- `asset_symbol`
- `source_address`
- `deposit_amount_usdt`
- `share_ratio`
- `payout_gross_usdt`
- `payout_fee_usdt`
- `payout_net_usdt`
- `status`
- `tx_hash`
- `sent_at`
- `completed_at`
- `failure_reason`

Suggested payout item statuses:

- `PENDING`
- `READY`
- `SENT`
- `FAILED`
- `MANUAL`
- `COMPLETED`

## Admin Experience

Period management should grow into three admin views or sections:

### 1. Overview

- period metadata
- current status
- deposit count
- total deposited USDT
- average deposit USDT
- deposit list filtered to the selected period

### 2. Reporting Calculator

- form inputs for ending balance, trader fee percent, and network fees
- preview of calculated settlement
- explicit approval action to freeze the snapshot

### 3. Payout Registry

- generated payout items grouped and filterable by network and status
- export-friendly rows for manual or external execution
- progress indicators for payout completion

## Safety Rules

- Deposits are accepted only in `FUNDING`.
- Settlement is a two-step process:
  - calculate preview
  - approve settlement
- Payout generation should happen only after settlement approval.
- Closing a period should require all payout items to be resolved or explicitly overridden.
- Every transition and settlement approval should be audit logged.
- Settlement approval should freeze the numbers that operators reviewed.

## Future-Proofing

This design intentionally stops short of a full ledger architecture, but it leaves room to evolve into one later:

- payout items are separate from deposits
- settlement snapshots are immutable once approved
- payout execution can later integrate per-network send services

## Recommended Implementation Shape

1. Formalize period statuses and transition guards.
2. Add admin period analytics and period-filtered deposit views.
3. Add settlement snapshot storage and calculator preview.
4. Add payout registry generation from approved settlement.
5. Add admin workflow actions for:
   - start trading
   - open reporting
   - approve settlement
   - open payouts
   - close period

## Success Criteria

- Admin can create a funding period and deposits can join it.
- Deposits are filterable by period in admin.
- Admin sees correct deposit count, total, and average for a selected period.
- Admin can calculate and approve a settlement snapshot for a period.
- System generates a payout registry with per-deposit payout amounts.
- Period cannot be closed prematurely.
