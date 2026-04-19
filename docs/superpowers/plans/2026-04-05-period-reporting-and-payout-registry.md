# Period Reporting, Trader Routing, And Payout Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add trader-aware deposit routing, trader profile UX, bilingual miniapp navigation, and separate reporting/payout workflows for each `period + trader` pair without breaking the existing shared `sprint` period model or legacy deposits.

**Architecture:** Keep one shared platform period lifecycle and introduce traders as a separate routing dimension on deposits. Extend the miniapp flow from `period -> network -> asset` into `period -> trader -> network -> asset -> source wallet`, preserve immutable trader binding after deposit creation, and split reporting/payout generation by `investment_period_id + trader_id` so each trader has an isolated report and payout registry inside the shared period.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Next.js App Router, React, Jest, npm workspaces

---

## Current Implementation Baseline

- The miniapp already has a first live `deplexapp` rollout on home, traders, generic trader profiles, and new deposit.
- `Traders` is already live and can safely consume API data.
- `Flux Trader` acts as the first pilot trader route for trader-linked deposit prefill.
- generic `/traders/[slug]` routing already exists, and non-pilot profiles can be opened before their deposit CTA is activated.
- Non-pilot trader CTAs may remain disabled until backend trader APIs and trader-aware deposit wiring are complete.
- This plan should prioritize backend/domain work first, then safe UI wiring, then broader activation of trader-specific CTAs.

## Server Readiness Checklist

### DB

- [ ] `Trader` and `TraderMainAddress` exist in Prisma schema and migration
- [ ] `Deposit` supports nullable legacy-safe trader links plus `return_address`
- [ ] one active trader main address per `trader + network + asset` is enforced at DB level
- [ ] reporting storage supports one record per `period + trader`
- [ ] payout registry storage supports one immutable registry per trader report

### API

- [ ] trader admin CRUD exists for profile, status, and main addresses
- [ ] miniapp can load trader list by API
- [ ] miniapp can load trader profile by `slug`
- [ ] server resolves `slug -> trader_id` safely before deposit creation
- [ ] server resolves active trader main address by `trader + network + asset`
- [ ] deposit creation stores immutable `trader_id` and `trader_main_address_id`
- [ ] inline wallet save from `New dep` is idempotent and writes into `My addresses`
- [ ] required trader reports are derived from traders with deposits in the selected period
- [ ] admin calculator accepts manual `endingBalanceUsdt` for selected `period + trader`
- [ ] payout registry is generated once per trader report
- [ ] period close validation checks all required trader reports and payout completion on the server
- [ ] Telegram auth validation, throttling, and abuse logging are enabled on sensitive routes
- [ ] heavy preview/export/report endpoints have pagination, caps, and timeout protection

### Admin/Miniapp

- [ ] admin can manage traders and trader main addresses without direct DB access
- [ ] admin reporting UI can open a trader report inside a selected period
- [ ] admin can preview, save, approve, export, and generate payout registry per trader report
- [ ] miniapp trader list can switch from static data to API data without redesign
- [ ] miniapp trader profile can switch from placeholder content to API data without breaking current routes
- [ ] non-pilot trader CTAs stay disabled until trader-aware deposit creation is verified end-to-end
- [ ] generic trader selection in `New dep` can be enabled before broader trader profile CTA activation
- [ ] language switch changes all supported screens, buttons, labels, and navigation items in real time
- [ ] `en` and `ru` UI strings are stored in valid UTF-8 and render without broken glyphs
- [ ] chosen font stack supports both Latin and Cyrillic across the miniapp

## Recommended Rollout Phases

### Phase 1: Backend Foundation

Goal:

- make the domain model and backend logic ready without changing user-facing behavior too early

Scope:

- Prisma schema and migration for `Trader`, `TraderMainAddress`, deposit trader links, and reporting ownership
- trader admin CRUD
- trader list/profile API
- trader main-address resolution
- trader-aware deposit creation contract
- idempotent wallet save from deposit flow
- Telegram auth hardening
- reporting and payout refactor to `period + trader`

Success criteria:

- backend can store and resolve traders safely
- backend can create immutable trader-bound deposits
- backend can build trader-specific reports and payout registries inside a shared period
- existing miniapp pilot UI can stay stable while generic trader routing is connected behind it

### Phase 2: Safe UI Wiring

Goal:

- connect existing miniapp and admin UI to the new backend while keeping only the verified pilot trader entrypoint active

Scope:

- switch traders directory from static data to API data
- switch trader profile loading to API-backed data
- connect `New dep` to trader-aware API flow
- add `slug -> trader_id` resolution in client flow
- keep non-pilot trader CTAs disabled
- connect admin reporting UI to trader report selection, preview, export, and payout generation
- normalize shared design tokens, app shell, and i18n support

Success criteria:

- miniapp can browse real traders
- miniapp can create trader-aware deposits from generic `New dep`
- admin can manage traders and run trader-scoped reporting
- pilot trader CTA works end-to-end and non-pilot trader CTAs remain safely disabled

### Phase 3: Feature Activation

Goal:

- enable the full trader-first user journey once DB, API, admin, and generic deposit flow are already proven

Scope:

- enable `Dep new sprint` on trader profile pages
- enable trader prefill from trader page into `New dep`
- replace or redirect placeholder `Flux Trader` route if generic `[slug]` route becomes canonical
- finalize `en/ru` polish
- remove any remaining static trader fallback data

Success criteria:

- user can browse trader list
- user can open a trader profile
- user can start a deposit from that trader profile with trader prefilled
- reporting and payout stay correct per `period + trader`
- no placeholder-only behavior remains for released trader flows

## MVP Scope

### Included In MVP

- trader data model and trader main addresses
- legacy-safe deposit linkage to trader and trader main address
- trader list API and trader profile API
- generic trader selection inside `New dep`
- immutable trader binding on deposit creation
- inline wallet save into `My addresses`
- admin trader management
- one report per `period + trader`
- one payout registry per trader report
- manual admin calculator input for `endingBalanceUsdt`
- server-side period close checks across all required trader reports
- Telegram-only auth hardening and basic DoS protections
- current `deplexapp` visual baseline preserved in miniapp
- fully working `en/ru` switcher across supported miniapp screens
- correct rendering of both Latin and Cyrillic text without broken font output

### Not Required For MVP

- enabling live `Dep new sprint` from trader profile on day one
- replacing every placeholder trader page with fully dynamic content on day one
- automatic sprint opening/closing
- automatic trader balance ingestion
- on-chain automatic payout execution
- advanced translation polish beyond core `en/ru` UI strings
- removal of all temporary static trader fallback content before backend verification is complete

### MVP Release Signal

The MVP can be considered release-ready when:

- a user can open `New dep`
- select a trader
- create a trader-bound deposit inside a shared sprint period
- see the saved wallet appear in `My addresses`
- admin can create and manage trader records and main addresses
- admin can produce and approve trader-scoped reports inside one period
- admin can generate payout registries per trader
- legacy deposits still remain safe and visible

Live `Dep new sprint` from trader profile is not required for MVP release readiness.

## i18n Verification Checklist

- [ ] language switch toggles between `en` and `ru` without page corruption
- [ ] home screen title, buttons, and dock labels change in both languages
- [ ] traders list title, trader actions, and supporting labels change in both languages
- [ ] trader profile title, CTA state labels, and supporting text change in both languages
- [ ] `New dep` labels, placeholders, validation text, and submit button change in both languages
- [ ] FAQ, Support, and Notifications screens change in both languages
- [ ] no screen shows mojibake, `????`, replacement glyphs, or broken Cyrillic
- [ ] selected font renders Latin and Cyrillic correctly on buttons, headings, body text, and form controls
- [ ] layout does not break when switching between `en` and `ru`
- [ ] user language preference persists after reload or reopening the miniapp

## Staging Rollout Checklist

### Database

- [ ] run `cmd /c npm run db:generate --workspace=apps/api`
- [ ] apply Prisma migration on staging database
- [ ] verify new domain storage exists:
  - `Trader`
  - `TraderMainAddress`
  - `PeriodTraderReport`
  - `PayoutRegistry`
  - `PayoutRegistryRow`
- [ ] verify extended columns exist:
  - `User.role`
  - `Deposit.trader_id`
  - `Deposit.trader_main_address_id`
  - `Deposit.return_address`

### Seed

- [ ] set `SEED_ADMIN_TELEGRAM_ID`
- [ ] optionally set:
  - `SEED_FLUX_TRON_USDT_ADDRESS`
  - `SEED_FLUX_BSC_USDT_ADDRESS`
  - `SEED_VECTOR_TON_USDT_ADDRESS`
  - `SEED_VECTOR_BSC_USDT_ADDRESS`
- [ ] run `cmd /c npm run db:seed --workspace=apps/api`
- [ ] verify staging seed result:
  - one `SUPER_ADMIN` exists
  - one active `Sprint 1` period exists
  - `Flux Trader` exists with active `TRON/BSC` main addresses
  - `Vector Pulse` exists with active `TON/BSC` main addresses

### API

- [ ] deploy `apps/api`
- [ ] verify `/auth/telegram`, `/me`, `/traders`, `/traders/:slug`
- [ ] verify admin routes require admin role and admin token
- [ ] verify throttling is active on auth, deposits, support, traders, and reporting endpoints

### Admin

- [ ] deploy `apps/admin`
- [ ] verify `/login` renders correctly
- [ ] verify protected admin routes do not reveal dashboard or trader data before auth is established
- [ ] verify admin login works with Telegram init data
- [ ] verify trader management:
  - create trader
  - update trader
  - add main address
- [ ] verify reporting flow:
  - open period reporting
  - preview trader report
  - save draft
  - submit
  - approve
  - publish
  - generate payout registry
  - update payout row

### Miniapp

- [ ] deploy `apps/miniapp`
- [ ] verify `EN/RU` switch on:
  - home
  - traders
  - trader profile
  - new deposit
  - FAQ
  - support
  - notifications
- [ ] verify `Traders -> Flux Trader -> New dep` prefill
- [ ] verify generic `/traders/[slug]` profiles open correctly
- [ ] verify only approved pilot CTA is live

### Release Gate

- [ ] backend tests green
- [ ] admin unit tests green
- [ ] api/admin/miniapp builds green
- [ ] Playwright miniapp smoke green
- [ ] Playwright admin smoke green
- [ ] no broken UTF-8 strings
- [ ] no admin content leakage before auth

## File Structure

### Backend data model

- Modify: `apps/api/prisma/schema.prisma`
  - Add `Trader` and `TraderMainAddress` models.
  - Add nullable `trader_id`, nullable `trader_main_address_id`, and `return_address` to `Deposit`.
  - Extend reporting and payout registry models with `period + trader` ownership and trader-identifying fields.
  - Reuse existing user `language` support for miniapp language persistence.
- Create: `apps/api/prisma/migrations/<timestamp>_trader_routing_reporting/migration.sql`
  - Persist trader entities, deposit links, payout row trader fields, and safe legacy defaults.

### Backend trader domain

- Create: `apps/api/src/traders/dto/trader.dto.ts`
  - DTOs for trader list, trader profile, trader main address, and admin trader CRUD.
- Create: `apps/api/src/traders/traders.service.ts`
  - Read trader list/profile, resolve active main address by network, and serve trader reporting summaries.
- Create: `apps/api/src/traders/traders.controller.ts`
  - User-facing trader endpoints.
- Create: `apps/api/src/traders/admin-traders.controller.ts`
  - Admin CRUD for trader profiles and main addresses.
- Create: `apps/api/src/traders/traders.module.ts`

### Backend deposits, wallets, and reporting domain

- Modify: `apps/api/src/deposits/dto/deposit.dto.ts`
  - Add trader fields, `return_address`, and UI-friendly linked trader summary.
- Modify: `apps/api/src/deposits/deposits.service.ts`
  - Enforce period-first creation, immutable trader binding, main-address resolution, and inline wallet save flow.
- Modify: `apps/api/src/deposits/deposits.controller.ts`
  - Add create/update actions for trader-aware deposit creation and return address updates.
- Modify: `apps/api/src/wallets/wallets.service.ts`
  - Support idempotent creation from deposit flow.
- Modify: `apps/api/src/periods/dto/period.dto.ts`
  - Add trader-report fields to reporting previews and payout rows.
- Modify: `apps/api/src/periods/period-settlement.service.ts`
  - Preserve reporting lifecycle, scope settlement to one trader inside one period, derive required trader reports from period deposits, and accept admin-entered calculator inputs per trader report.
- Modify: `apps/api/src/periods/period-payout-registry.service.ts`
  - Generate one immutable payout registry per trader report and carry payout address source into payout rows.
- Modify: `apps/api/src/periods/admin-periods.controller.ts`
  - Expose trader-report selection, export, and payout row actions.
- Create: `apps/api/src/periods/period-reporting-export.service.ts`
  - Build CSV export for one trader report inside a period.
- Modify: `apps/api/src/auth/auth.service.ts`
  - Harden Telegram auth entrypoints against bursts and replay-like abuse.
- Modify: `apps/api/src/auth/auth.controller.ts`
  - Apply auth throttling and validation guards.

### Miniapp UI

- Create: `apps/miniapp/src/components/ui/design-tokens.ts` or equivalent theme source
  - Centralize palette, glow, surface, spacing, and motion tokens for the new `deplexapp` visual system.
- Create: `apps/miniapp/src/components/ui/app-shell.tsx`
  - Shared top area, background treatment, and bottom dock shell for the miniapp.
- Create: `apps/miniapp/src/components/ui/action-card.tsx`
  - Reusable rounded action button/card for `Traders`, `New dep`, and `My dep`.
- Modify: `apps/miniapp/src/app/page.tsx`
  - Keep the current visual baseline and wire server-backed behavior where needed.
- Modify: `apps/miniapp/src/app/traders/page.tsx`
  - Replace static trader data with API data when ready.
- Modify or Create: `apps/miniapp/src/app/traders/[slug]/page.tsx`
  - Add generic trader profile route when backend-backed navigation is enabled.
- Modify: `apps/miniapp/src/app/traders/flux-trader/page.tsx`
  - Keep current placeholder route stable until generic trader pages replace or redirect it.
- Modify: `apps/miniapp/src/app/create-deposit/page.tsx`
  - Add trader step, trader prefill, network-based main-address binding, and inline wallet save without breaking the current shell.
- Modify: `apps/miniapp/src/app/addresses/page.tsx`
  - Reflect wallet created from deposit flow.
- Modify: `apps/miniapp/src/app/layout.tsx`
  - Shared language control, app shell wiring, and global background treatment.
- Modify: `apps/miniapp/src/lib/api.ts`
  - Add traders, wallet save, and trader-aware deposit APIs.
- Create: `apps/miniapp/src/lib/i18n.ts`
  - Minimal translation dictionaries for `en` and `ru`.

### Admin UI

- Modify: `apps/admin/src/lib/api.ts`
  - Add trader admin endpoints plus updated reporting APIs.
- Create: `apps/admin/src/app/traders/page.tsx`
  - Trader list and entrypoint for trader management.
- Create: `apps/admin/src/app/traders/[id]/page.tsx`
  - Trader profile and main-address management.
- Modify: `apps/admin/src/app/periods/[id]/page.tsx`
  - Link to dedicated reporting route.
- Create: `apps/admin/src/app/periods/[id]/reporting/page.tsx`
  - Trader-report-aware reporting and payout registry screen.
- Modify: `apps/admin/src/app/deposits/[id]/page.tsx`
  - Show immutable trader binding, return address, and payout-routing metadata.

### Tests

- Modify: `apps/api/src/auth/auth.service.spec.ts`
- Modify: `apps/api/src/deposits/deposits.service.spec.ts`
- Modify: `apps/api/src/wallets/wallets.service.spec.ts`
- Create: `apps/api/src/traders/traders.service.spec.ts`
- Modify: `apps/api/src/periods/period-settlement.service.spec.ts`
- Modify: `apps/api/src/periods/period-payout-registry.service.spec.ts`
- Create: `apps/api/src/periods/period-reporting-export.service.spec.ts`
- Modify: `apps/api/src/periods/periods.service.spec.ts`
- Modify: `apps/api/src/periods/admin-periods.controller.spec.ts`

### Documentation

- Modify: `docs/superpowers/specs/2026-04-05-period-reporting-and-payout-registry-design.md`
  - Keep implementation names aligned with the final code.

## Task 1: Add Trader Data Model And Safe Legacy Links

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_trader_routing_reporting/migration.sql`

- [ ] **Step 1: Write the failing schema expectations in tests or migration notes**

```ts
// Expected data model:
// - Trader
// - TraderMainAddress
// - Deposit.trader_id nullable for legacy deposits
// - Deposit.trader_main_address_id nullable for legacy deposits
// - Deposit.return_address nullable
// - Reporting records and payout registries are keyed by period + trader
```

- [ ] **Step 2: Add trader and deposit linkage models**

```prisma
model Trader {
  trader_id       String              @id @default(uuid())
  nickname        String              @unique
  slug            String              @unique
  display_name    String
  description     String?
  profile_title   String              @default("semper in motu ai")
  status          String              @default("ACTIVE")
  main_addresses  TraderMainAddress[]
  deposits        Deposit[]
}

model TraderMainAddress {
  trader_main_address_id String   @id @default(uuid())
  trader_id              String
  network                String
  asset_symbol           String
  address                String
  is_active              Boolean  @default(true)
  trader                 Trader   @relation(fields: [trader_id], references: [trader_id])

  // Replace with a migration-level partial unique index:
  // unique active address per trader + network + asset
}
```

```prisma
model Deposit {
  trader_id              String?
  trader_main_address_id String?
  return_address         String?
}
```

- [ ] **Step 3: Preserve legacy safety in migration**

```sql
ALTER TABLE "Deposit" ADD COLUMN "trader_id" TEXT NULL;
ALTER TABLE "Deposit" ADD COLUMN "trader_main_address_id" TEXT NULL;
ALTER TABLE "Deposit" ADD COLUMN "return_address" TEXT NULL;
-- Add a partial unique index so only one active main address exists per trader/network/asset.
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat: add trader routing data model"
```

## Task 2: Build Trader API For List, Profile, And Main Address Resolution

**Files:**
- Create: `apps/api/src/traders/dto/trader.dto.ts`
- Create: `apps/api/src/traders/traders.service.ts`
- Create: `apps/api/src/traders/traders.controller.ts`
- Create: `apps/api/src/traders/admin-traders.controller.ts`
- Create: `apps/api/src/traders/traders.module.ts`
- Create: `apps/api/src/traders/traders.service.spec.ts`

- [ ] **Step 1: Write failing trader service tests**

```ts
it('returns active traders for the miniapp directory', async () => {
  prisma.trader.findMany.mockResolvedValue([{ trader_id: 't1', nickname: 'alpha', slug: 'alpha' }]);

  await expect(service.findAllActive()).resolves.toEqual([
    expect.objectContaining({ nickname: 'alpha', slug: 'alpha' }),
  ]);
});

it('resolves an active main address by trader and network', async () => {
  prisma.traderMainAddress.findFirst.mockResolvedValue({
    trader_main_address_id: 'addr-1',
    network: 'TON',
    asset_symbol: 'USDT',
    address: 'UQ-trader-wallet',
  });

  await expect(service.resolveMainAddress('t1', 'TON', 'USDT')).resolves.toEqual(
    expect.objectContaining({ address: 'UQ-trader-wallet' }),
  );
});
```

- [ ] **Step 2: Run the trader tests**

Run: `cmd /c npm test --workspace=apps/api -- --runInBand src/traders/traders.service.spec.ts`
Expected: FAIL because the trader module does not exist yet.

- [ ] **Step 3: Implement trader service and controllers**

```ts
async resolveMainAddress(traderId: string, network: string, assetSymbol: string) {
  const record = await this.prisma.traderMainAddress.findFirst({
    where: { trader_id: traderId, network, asset_symbol: assetSymbol, is_active: true },
  });

  if (!record) {
    throw new BadRequestException('Selected trader does not have an active main address for this network and asset');
  }

  return record;
}
```

- [ ] **Step 4: Re-run the trader tests**

Run: `cmd /c npm test --workspace=apps/api -- --runInBand src/traders/traders.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/traders
git commit -m "feat: add trader directory and address resolution api"
```

## Task 3: Make Deposit Creation Trader-Aware And Immutable

**Files:**
- Modify: `apps/api/src/deposits/dto/deposit.dto.ts`
- Modify: `apps/api/src/deposits/deposits.service.ts`
- Modify: `apps/api/src/deposits/deposits.controller.ts`
- Modify: `apps/api/src/deposits/deposits.service.spec.ts`

- [ ] **Step 1: Write failing deposit creation tests**

```ts
it('creates a deposit linked to period, trader, and trader main address', async () => {
  prisma.investmentPeriod.findUnique.mockResolvedValue({ investment_period_id: 'period-1', status: 'FUNDING' });
  tradersService.resolveMainAddress = jest.fn().mockResolvedValue({
    trader_main_address_id: 'main-1',
    address: 'trader-wallet',
  });

  prisma.deposit.findFirst.mockResolvedValue(null);
  prisma.deposit.create.mockResolvedValue({
    deposit_id: 'deposit-1',
    investment_period_id: 'period-1',
    trader_id: 'trader-1',
    trader_main_address_id: 'main-1',
    source_address: 'user-wallet',
  });

  await service.create('user-1', {
    investment_period_id: 'period-1',
    trader_id: 'trader-1',
    network: 'TON',
    asset_symbol: 'USDT',
    source_address: 'user-wallet',
  });

  expect(prisma.deposit.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        trader_id: 'trader-1',
        trader_main_address_id: 'main-1',
      }),
    }),
  );
});
```

- [ ] **Step 2: Run deposit service tests**

Run: `cmd /c npm test --workspace=apps/api -- --runInBand src/deposits/deposits.service.spec.ts`
Expected: FAIL because trader-aware fields and trader binding resolution are not implemented yet.

- [ ] **Step 3: Update creation contract and serialization**

```ts
const mainAddress = await this.tradersService.resolveMainAddress(dto.trader_id, dto.network, dto.asset_symbol);
```

```ts
data: {
  user_id: userId,
  investment_period_id: dto.investment_period_id,
  trader_id: dto.trader_id,
  trader_main_address_id: mainAddress.trader_main_address_id,
  source_address: dto.source_address,
}
```

- [ ] **Step 4: Keep trader binding immutable after creation**

```ts
// No update endpoint may modify trader_id or trader_main_address_id on an existing deposit.
```

- [ ] **Step 5: Re-run deposit tests**

Run: `cmd /c npm test --workspace=apps/api -- --runInBand src/deposits/deposits.service.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/deposits/dto/deposit.dto.ts apps/api/src/deposits/deposits.service.ts apps/api/src/deposits/deposits.controller.ts apps/api/src/deposits/deposits.service.spec.ts
git commit -m "feat: bind deposits to selected trader"
```

## Task 4: Save Wallet Addresses Inline From New Deposit

**Files:**
- Modify: `apps/api/src/wallets/wallets.service.ts`
- Modify: `apps/api/src/wallets/wallets.service.spec.ts`
- Modify: `apps/api/src/deposits/deposits.service.ts`

- [ ] **Step 1: Write failing inline wallet-save tests**

```ts
it('creates a wallet record when deposit source address is new', async () => {
  prisma.wallet.findFirst.mockResolvedValue(null);
  prisma.wallet.create.mockResolvedValue({ wallet_id: 'w1', address: 'user-wallet', network: 'TON' });

  await walletsService.findOrCreate('user-1', 'TON', 'user-wallet');

  expect(prisma.wallet.create).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run wallet tests**

Run: `cmd /c npm test --workspace=apps/api -- --runInBand src/wallets/wallets.service.spec.ts`
Expected: FAIL because idempotent find-or-create flow does not exist yet.

- [ ] **Step 3: Implement idempotent wallet creation**

```ts
async findOrCreate(userId: string, network: string, address: string) {
  const normalized = address.trim();
  const existing = await this.prisma.wallet.findFirst({
    where: { user_id: userId, network, address: normalized },
  });

  if (existing) return existing;

  return this.prisma.wallet.create({
    data: { user_id: userId, network, address: normalized, label: normalized },
  });
}
```

- [ ] **Step 4: Invoke wallet save from deposit creation**

```ts
await this.walletsService.findOrCreate(userId, dto.network, dto.source_address);
```

- [ ] **Step 5: Re-run wallet tests**

Run: `cmd /c npm test --workspace=apps/api -- --runInBand src/wallets/wallets.service.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/wallets/wallets.service.ts apps/api/src/wallets/wallets.service.spec.ts apps/api/src/deposits/deposits.service.ts
git commit -m "feat: save source wallets from deposit flow"
```

## Task 5: Normalize The Deplexapp Visual System And Prepare UI For Server Wiring

**Files:**
- Create: `apps/miniapp/src/components/ui/design-tokens.ts` or equivalent theme source
- Create: `apps/miniapp/src/components/ui/app-shell.tsx`
- Create: `apps/miniapp/src/components/ui/action-card.tsx`
- Modify: `apps/miniapp/src/app/page.tsx`
- Modify: `apps/miniapp/src/app/layout.tsx`
- Create: `apps/miniapp/src/lib/i18n.ts`
- Modify: `apps/miniapp/src/lib/api.ts`

- [ ] **Step 1: Treat current miniapp styling as the accepted baseline**

```ts
// Much of the visual work already exists in the miniapp.
// This task should normalize shared tokens, shell, and i18n support.
// Preserve the current Variant B-inspired baseline while preparing for server-backed wiring.
```

- [ ] **Step 2: Add shared design tokens and shell components**

```ts
export const designTokens = {
  bg: '#061218',
  panel: '#0b1b24',
  accent: '#14cad3',
  accentSoft: '#6cf2db',
  text: '#e8ffff',
};
```

```tsx
// App shell should own:
// - background glow treatment
// - top utility row
// - bottom dock navigation
```

- [ ] **Step 3: Add translation dictionaries**

```ts
export const messages = {
  en: {
    homeTitle: 'Choose an AI trader and start sprint',
    traders: 'Traders',
    tradersSubtitle: 'choose your lexer',
    myDeposits: 'My dep',
    newDeposit: 'New dep',
  },
  ru: {
    homeTitle: 'Vyberite AI-treidera i nachnite sprint',
    traders: 'Treidery',
    tradersSubtitle: 'choose your lexer',
    myDeposits: 'Moi depy',
    newDeposit: 'Novyi dep',
  },
} as const;
```

- [ ] **Step 4: Implement top-right language switch and shared app shell**

```tsx
<button aria-label="Switch language">{currentLocaleFlag}</button>
```

```ts
// Switching language must update all visible UI on supported screens:
// - home
// - traders list
// - trader profile
// - new deposit
// - faq
// - support
// - notifications
//
// UTF-8-safe strings only.
// Selected font stack must support both Latin and Cyrillic.
// Broken glyphs, mojibake, transliterated fallback, or question-mark rendering are release blockers.
```

- [ ] **Step 5: Re-run miniapp build**

Run: `cmd /c npm run build --workspace=apps/miniapp`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/miniapp/src/components/ui apps/miniapp/src/app/page.tsx apps/miniapp/src/app/layout.tsx apps/miniapp/src/lib/i18n.ts apps/miniapp/src/lib/api.ts
git commit -m "feat: normalize deplexapp visual system for server integration"
```

## Task 6: Connect Traders Directory And Prepare Generic Trader Profile Routing

**Files:**
- Modify: `apps/miniapp/src/app/traders/page.tsx`
- Modify or Create: `apps/miniapp/src/app/traders/[slug]/page.tsx`
- Modify: `apps/miniapp/src/app/traders/flux-trader/page.tsx`
- Modify: `apps/miniapp/src/lib/api.ts`

- [ ] **Step 1: Write trader-page expectations and rollout guardrails**

```ts
// Traders list shows nickname and description.
// Traders pages inherit the deplexapp visual system.
// Trader profile shows hero content "semper in motu ai", trader details, history, and "Dep new sprint".
// Flux Trader may serve as the first verified pilot page while other trader pages remain gated.
// Do not enable live trader-linked deposit CTA for non-pilot traders in this task.
```

- [ ] **Step 2: Add trader API client methods**

```ts
export async function getTraders() {
  const response = await api.get('/traders');
  return response.data;
}

export async function getTrader(slug: string) {
  const response = await api.get(`/traders/${slug}`);
  return response.data;
}
```

- [ ] **Step 3: Implement traders list and profile**

```tsx
<Link href={`/traders/${trader.slug}`}>{trader.nickname}</Link>
```

```tsx
<h1>semper in motu ai</h1>
<Link href="/create-deposit?trader=flux-trader">Dep new sprint</Link>
```

- [ ] **Step 4: Re-run miniapp build**

Run: `cmd /c npm run build --workspace=apps/miniapp`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/miniapp/src/app/traders apps/miniapp/src/lib/api.ts
git commit -m "feat: add traders directory and profile pages"
```

## Task 7: Extend New Deposit Flow To Period -> Trader -> Network -> Asset -> Source Wallet

**Files:**
- Modify: `apps/miniapp/src/app/create-deposit/page.tsx`
- Modify: `apps/miniapp/src/lib/api.ts`
- Modify: `apps/miniapp/src/app/addresses/page.tsx`

- [ ] **Step 1: Write the failing flow expectations**

```ts
// New deposit flow rules:
// - period stays first
// - trader comes next
// - trader may be prefilled from /traders/[slug]
// - network and asset stay selectable
// - pasted wallet is saved to My addresses
// - screen uses the same deplexapp surfaces, inputs, and button language
// - generic trader selection may be enabled before trader profile CTA is enabled
```

- [ ] **Step 2: Add trader-prefill support**

```ts
const prefilledTraderSlug = searchParams.get('trader');
const selectedTrader = prefilledTraderSlug ? await getTrader(prefilledTraderSlug) : null;
```

- [ ] **Step 3: Submit trader-aware deposit payload**

```ts
await createDeposit({
  investment_period_id,
  trader_id,
  network,
  asset_symbol,
  source_address,
});
```

- [ ] **Step 4: Show saved wallet in addresses page**

```tsx
{wallets.map((wallet) => (
  <div key={wallet.wallet_id}>{wallet.address}</div>
))}
```

- [ ] **Step 5: Re-run miniapp build**

Run: `cmd /c npm run build --workspace=apps/miniapp`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/miniapp/src/app/create-deposit/page.tsx apps/miniapp/src/lib/api.ts apps/miniapp/src/app/addresses/page.tsx
git commit -m "feat: add trader step to new deposit flow"
```

## Task 8: Split Reporting And Payout Generation By Period Plus Trader

**Files:**
- Modify: `apps/api/src/periods/dto/period.dto.ts`
- Modify: `apps/api/src/periods/period-settlement.service.ts`
- Modify: `apps/api/src/periods/period-settlement.service.spec.ts`
- Create: `apps/api/src/periods/period-reporting-export.service.ts`
- Create: `apps/api/src/periods/period-reporting-export.service.spec.ts`
- Modify: `apps/api/src/periods/period-payout-registry.service.ts`
- Modify: `apps/api/src/periods/period-payout-registry.service.spec.ts`

- [ ] **Step 1: Write failing reporting and export tests**

```ts
it('derives required trader reports from traders who have deposits in the selected period', async () => {
  const reports = await service.listTraderReports('period-1');
  expect(reports.map((report) => report.trader_id)).toEqual(['trader-1', 'trader-2']);
});

it('includes trader nickname in preview rows for the selected trader report', async () => {
  const preview = await service.preview('period-1', 'trader-1', dto);
  expect(preview.rows[0]).toEqual(expect.objectContaining({ trader_nickname: 'alpha' }));
});

it('includes trader nickname in csv export for one trader report', async () => {
  const csv = await exportService.exportCsv('period-1', 'trader-1');
  expect(csv).toContain('trader_nickname');
});
```

- [ ] **Step 2: Run reporting tests**

Run: `cmd /c npm test --workspace=apps/api -- --runInBand src/periods/period-settlement.service.spec.ts src/periods/period-reporting-export.service.spec.ts src/periods/period-payout-registry.service.spec.ts`
Expected: FAIL because reporting is not yet scoped to one trader inside the period.

- [ ] **Step 3: Add trader fields to preview and payout row DTOs**

```ts
// Prefer a persisted PeriodTraderReport record with its own ID and a unique period + trader pair.
trader_id: deposit.trader_id ?? null,
trader_nickname: deposit.trader?.nickname ?? 'legacy',
```

```ts
// endingBalanceUsdt is entered manually by admin for the selected period + trader report.
```

- [ ] **Step 4: Add trader columns to export and payout generation**

```ts
const header = ['period_id', 'trader_report_id', 'trader_nickname', 'deposit_id', 'network', 'payout_net_usdt'];
```

```ts
data: {
  trader_report_id: traderReport.trader_report_id,
  trader_id: deposit.trader_id,
  trader_nickname: deposit.trader?.nickname ?? 'legacy',
}
```

- [ ] **Step 5: Re-run reporting tests**

Run: `cmd /c npm test --workspace=apps/api -- --runInBand src/periods/period-settlement.service.spec.ts src/periods/period-reporting-export.service.spec.ts src/periods/period-payout-registry.service.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/periods/dto/period.dto.ts apps/api/src/periods/period-settlement.service.ts apps/api/src/periods/period-settlement.service.spec.ts apps/api/src/periods/period-reporting-export.service.ts apps/api/src/periods/period-reporting-export.service.spec.ts apps/api/src/periods/period-payout-registry.service.ts apps/api/src/periods/period-payout-registry.service.spec.ts
git commit -m "feat: split reporting and payouts by trader within period"
```

## Task 9: Preserve Reporting Lifecycle And Return Address Priority

**Files:**
- Modify: `apps/api/src/deposits/deposits.service.ts`
- Modify: `apps/api/src/deposits/deposits.controller.ts`
- Modify: `apps/api/src/periods/admin-periods.controller.ts`
- Modify: `apps/api/src/periods/periods.service.ts`
- Modify: `apps/api/src/periods/periods.service.spec.ts`

- [ ] **Step 1: Write regression expectations**

```ts
// Existing guarantees must remain:
// - one reporting record per period + trader
// - approve only after save-for-review
// - payout registry generated once per period + trader
// - payout prefers return_address over source_address
// - period cannot close with pending or failed rows across all trader registries
// - required trader reports are derived from traders who have deposits in the period
```

- [ ] **Step 2: Re-run and adapt period lifecycle tests**

Run: `cmd /c npm test --workspace=apps/api -- --runInBand src/periods/periods.service.spec.ts src/periods/admin-periods.controller.spec.ts src/deposits/deposits.service.spec.ts`
Expected: PASS after updating fixtures for trader-aware deposits and trader-scoped reports.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/deposits/deposits.service.ts apps/api/src/deposits/deposits.controller.ts apps/api/src/periods/admin-periods.controller.ts apps/api/src/periods/periods.service.ts apps/api/src/periods/periods.service.spec.ts
git commit -m "feat: preserve reporting lifecycle with trader-aware deposits"
```

## Task 10: Add Admin Trader Management And Trader-Aware Reporting UI

**Files:**
- Modify: `apps/admin/src/lib/api.ts`
- Create: `apps/admin/src/app/traders/page.tsx`
- Create: `apps/admin/src/app/traders/[id]/page.tsx`
- Modify: `apps/admin/src/app/periods/[id]/page.tsx`
- Create: `apps/admin/src/app/periods/[id]/reporting/page.tsx`
- Modify: `apps/admin/src/app/deposits/[id]/page.tsx`

- [ ] **Step 1: Write UI expectations**

```ts
// Admin requirements:
// - manage traders and main addresses
// - see trader binding on deposit detail
// - open reporting from period detail
// - select trader report inside a period
// - preview and export trader-linked rows
```

- [ ] **Step 2: Add API client methods**

```ts
export async function getAdminTraders() {
  const response = await api.get('/admin/traders');
  return response.data;
}
```

- [ ] **Step 3: Implement trader admin pages and reporting route**

```tsx
<Link href={`/traders/${trader.trader_id}`}>{trader.nickname}</Link>
```

```tsx
<Button asChild>
  <Link href={`/periods/${period.investment_period_id}/reporting`}>Open Reporting</Link>
</Button>
```

- [ ] **Step 4: Re-run admin build**

Run: `cmd /c npm run build --workspace=apps/admin`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/lib/api.ts apps/admin/src/app/traders apps/admin/src/app/periods/[id]/page.tsx apps/admin/src/app/periods/[id]/reporting/page.tsx apps/admin/src/app/deposits/[id]/page.tsx
git commit -m "feat: add admin trader management and reporting ui"
```

## Task 11: Add Telegram Auth Hardening, Rate Limits, And DoS Guards

**Files:**
- Modify: `apps/api/src/auth/auth.service.ts`
- Modify: `apps/api/src/auth/auth.controller.ts`
- Modify: `apps/api/src/auth/auth.service.spec.ts`
- Modify: `apps/api/src/deposits/deposits.controller.ts`
- Modify: `apps/api/src/support/support.controller.ts`
- Modify: `apps/api/src/periods/admin-periods.controller.ts`
- Modify: `apps/api/src/traders/traders.controller.ts`

- [ ] **Step 1: Write failing abuse-protection expectations**

```ts
it('rejects repeated auth bursts after the configured threshold', async () => {
  await expect(service.loginWithTelegram(initData, abuseContext)).rejects.toThrow('Too many requests');
});
```

```ts
// Sensitive endpoints must be throttled:
// - auth/login
// - deposits create
// - support create
// - trader reporting preview/export
```

- [ ] **Step 2: Add Telegram auth throttling and replay-aware validation**

```ts
// Validate Telegram init data first, then apply per-IP / per-user throttling.
```

- [ ] **Step 3: Apply rate limits to sensitive controllers**

```ts
// Apply throttling to auth, deposits, support, traders, and reporting endpoints.
```

- [ ] **Step 4: Add server-side caps for heavy reporting actions**

```ts
// Reporting preview/export endpoints should reject excessive burst frequency.
```

- [ ] **Step 5: Re-run auth and targeted backend tests**

Run: `cmd /c npm test --workspace=apps/api -- --runInBand src/auth/auth.service.spec.ts src/deposits/deposits.service.spec.ts src/periods/admin-periods.controller.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/auth/auth.service.ts apps/api/src/auth/auth.controller.ts apps/api/src/auth/auth.service.spec.ts apps/api/src/deposits/deposits.controller.ts apps/api/src/support/support.controller.ts apps/api/src/periods/admin-periods.controller.ts apps/api/src/traders/traders.controller.ts
git commit -m "feat: add auth and endpoint abuse protection"
```

## Task 12: Final Verification And Documentation Sync

**Files:**
- Modify: `docs/superpowers/specs/2026-04-05-period-reporting-and-payout-registry-design.md`
- Verify: `apps/api`
- Verify: `apps/admin`
- Verify: `apps/miniapp`

- [ ] **Step 1: Run targeted backend tests**

Run: `cmd /c npm test --workspace=apps/api -- --runInBand src/traders/traders.service.spec.ts src/deposits/deposits.service.spec.ts src/wallets/wallets.service.spec.ts src/periods/period-settlement.service.spec.ts src/periods/period-reporting-export.service.spec.ts src/periods/period-payout-registry.service.spec.ts src/periods/periods.service.spec.ts src/periods/admin-periods.controller.spec.ts`
Expected: PASS

- [ ] **Step 2: Run backend build**

Run: `cmd /c npm run build --workspace=apps/api`
Expected: PASS

- [ ] **Step 3: Run admin build**

Run: `cmd /c npm run build --workspace=apps/admin`
Expected: PASS

- [ ] **Step 4: Run miniapp build**

Run: `cmd /c npm run build --workspace=apps/miniapp`
Expected: PASS

- [ ] **Step 5: Update spec wording if final names differ**

```md
- Keep `sprint`, `Traders`, `My dep`, `New dep`, `Dep new sprint`, and `choose your lexer` aligned with shipped UI.
- Keep reporting described as separate trader reports inside one shared period, not as separate trader-owned periods.
```

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/specs/2026-04-05-period-reporting-and-payout-registry-design.md
git commit -m "docs: sync trader routing and reporting plan"
```
