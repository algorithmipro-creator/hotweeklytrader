# Period Reporting, Trader Routing, And Payout Registry Design

**Goal**

Extend the platform so users create deposits inside a shared platform `sprint` period but route each new deposit to a selected trader, while admins retain a strict, auditable reporting and payout workflow for period results and trader-linked payout registries.

## Current Context

- Period lifecycle already exists with business statuses:
  - `FUNDING`
  - `TRADING_ACTIVE`
  - `REPORTING`
  - `PAYOUT_IN_PROGRESS`
  - `CLOSED`
- Deposits are already attached to `investment_period_id`.
- The deposit flow already starts with period selection.
- A settlement snapshot and payout registry foundation already exist in the backend.
- Miniapp already has a home screen, FAQ, support, notifications, addresses, deposits, and new deposit flow.
- Miniapp already has a first live `deplexapp` visual rollout on home, traders, generic trader profiles, and new deposit.
- The current product does not yet model traders as first-class entities in deposit routing.

## Implementation Baseline

At server-preparation time:

- the new dark `deplexapp` UI language is already partially implemented in the miniapp
- `Traders` already exists as a real route
- generic trader profile routing already exists through `/traders/[slug]`
- `Flux Trader` already supports a pilot `Dep new sprint` prefill path into `New dep`
- non-pilot trader profiles may be visible before their deposit CTA is activated
- additional trader-specific CTAs may still remain intentionally disabled as `Coming soon`
- the current UI should be treated as a partially live baseline until generic server-backed trader routing is connected

Server work should therefore connect and harden the existing UI, not replace it.

## Product Direction

The platform keeps one shared weekly period type called `sprint`.

- A `sprint` lasts one week.
- For now, the admin opens and closes `sprint` periods manually.
- In a later phase, period creation may become automatic.

Traders are introduced as a routing and reporting dimension inside the shared platform period.

- Users still enter a shared platform period.
- Users then choose a trader.
- The system routes the deposit to that trader's network-specific `main address`.
- Reporting and payout logic must remain inside a shared platform period, but reporting records and payout registries are created separately for each trader participating in that period.

## Objectives

1. Keep the existing shared period lifecycle intact.
2. Introduce traders as first-class entities with nickname, description, and per-network `main address` records.
3. Make every new deposit follow the flow `period -> trader -> network -> asset -> source wallet`.
4. Freeze trader selection at deposit creation time.
5. Allow users to discover traders from the home screen and from a dedicated traders list.
6. Add a trader profile page with description, historical period results, and a fast route into new deposit creation.
7. Preserve existing period lifecycle logic, while changing reporting and payout generation to operate per `period + trader`.
8. Add inline creation of a user's wallet address during deposit creation and save it into `My addresses`.
9. Add English and Russian UI support with a visible language switcher.
10. Refresh the miniapp home screen labels and navigation without breaking existing support, FAQ, notification, or deposit flows.

## Non-Goals

- Giving each trader a separate investment period lifecycle in this phase.
- Allowing trader reassignment for an existing deposit.
- Automatic on-chain payout execution in this phase.
- Supporting multiple reporting snapshots per period.
- Recomputing or replacing an approved reporting snapshot.
- Spreadsheet editing round-trips back into the application.

## Core Domain Model

### Shared Platform Periods

Periods remain common to the whole platform.

- There is currently one period type: `sprint`
- A user still selects a period first when creating a deposit.
- A period may contain deposits for many different traders.
- Admin reporting remains period-first, not trader-first.

### Traders

Add a first-class `Trader` entity.

Each trader should have:

- `trader_id`
- `nickname`
- `slug`
- `display_name`
- `description`
- `status`
- `profile_title`

For the first trader landing experience tied to the already created `main address` set, the page title should be:

- `semper in motu ai`

### Trader Main Addresses

Each trader owns one or more `main address` records.

Each address should include:

- `trader_main_address_id`
- `trader_id`
- `network`
- `asset_symbol`
- `address`
- `is_active`

Rules:

- A trader may have different `main address` values for different networks.
- In `New deposit`, the user chooses the trader and the network.
- The system then auto-selects the trader `main address` for that network.
- The user does not manually choose the final target address in normal flow.

### Deposits

Each new deposit must support these linked dimensions:

- `investment_period_id`
- `trader_id`
- `trader_main_address_id`
- `source_address`
- `return_address`

### Legacy Deposits

Existing deposits that were created before trader support remain valid.

Rules:

- Legacy deposits may have no `trader_id`.
- Legacy deposits must not be silently rewritten.
- History, reports, and payouts for those deposits must remain available.
- Any trader-specific analytics or reporting views may either:
  - exclude legacy deposits by default
  - or show them as `legacy / unassigned`

## Deposit Creation Rules

### Required Flow

The creation order for new deposits is:

1. `period`
2. `trader`
3. `network`
4. `asset`
5. `source wallet`

### Trader Selection Lock

Trader selection is immutable after deposit creation.

Rules:

- A user cannot edit the trader on an existing deposit.
- If the user selected the wrong trader, the deposit must be cancelled and a new one created.
- Reporting and payout logic rely on this immutability.

### Entry Points

There are two valid entry points into `New deposit`.

#### General Entry

From the general miniapp flow:

- user selects period first
- user then selects trader
- user then selects network and asset

#### Trader Page Entry

From a trader profile page:

- user taps `Dep new sprint`
- app opens the same deposit creation flow
- selected trader is prefilled
- user continues with period selection if needed, then network and asset
- trader selection stays locked to the chosen trader unless the user cancels the entire creation flow

### Source Wallet Handling

In `New deposit`, the field `Your wallet address` must support both selection and inline creation.

Rules:

- If the user already has saved addresses, they can pick one.
- If the user does not have a saved address, or wants to use a new one, they can paste it directly in the deposit form.
- Saving a new wallet here must also create a record in `My addresses`.
- The same address must be stored into the deposit as `source_address`.

## Home Screen And Navigation

### Home Title

Change the main title:

- from `Investment service`
- to `Choose an AI trader and start sprint`

### Main Buttons

Change button labels on the home screen:

- `My deposit` -> `My dep`
- `New deposit` -> `New dep`

Add a new button above `My dep`:

- `Traders`

This button must also include a smaller subtitle:

- `choose your lexer`

### Bottom Utility Navigation

Move these actions to the bottom area as icon-style controls:

- `FAQ`
- `Support`
- `Notifications`

The intended visual language is:

- `?` for FAQ
- `headset / support person` for Support
- `bell` for Notifications

This is a navigation relocation, not a feature removal. Existing FAQ, support, and notifications flows remain available.

## Visual Design System

The app should adopt one consistent user-facing visual system across the miniapp.

### Design Direction

The target style is:

- soft sci-fi trading interface
- premium dark fintech surface
- rounded mobile-first composition
- controlled neon accents, not aggressive cyberpunk
- clean layout density with generous spacing

The visual direction combines:

- the soft rounded mobile framing and button geometry from the provided UI reference
- the teal, cyan, graphite, and AI-robot character from the robot reference

### Brand Use

The application brand is:

- `deplexapp`

The robot head is the brand mascot and may be used as:

- home hero artwork
- marketing/brand visual
- trader/assistant themed illustration

The full robot body is not required in the app UI.

`semper in motu ai` must not appear on the generic home screen.

It is reserved for the relevant trader/algorithm page only.

### Core Palette

Use this palette as the base direction:

- deep background: near-black graphite / blue-black
- panel background: dark graphite with slight transparency
- primary accent: teal / cyan
- secondary accent: light aqua
- limited highlight accent: soft violet in small doses only
- text: bright cool white
- muted text: desaturated aqua-gray

The interface must avoid:

- bright flat purple as the dominant UI color
- pure white card backgrounds for the primary miniapp surfaces
- overly busy cyberpunk effects

### Shape Language

Core shapes:

- rounded phone-native cards
- capsule and pill buttons
- soft rounded dock navigation
- smooth corners on panels, inputs, and action chips

Buttons should feel:

- premium
- tactile
- softly illuminated
- compact but not cramped

### Buttons

Button hierarchy should be visually explicit:

- `Traders` is the main discovery action and should be the most prominent home control
- `New dep` is the primary action button
- `My dep` is secondary and calmer
- FAQ, Support, and Notifications use icon-first controls in the bottom navigation

Button styling rules:

- primary buttons use teal/cyan glow or gradient accents
- secondary buttons use darker filled or outlined variants
- all buttons keep rounded corners consistent with the rest of the app
- button text should remain highly readable on dark surfaces

### Layout And Surfaces

The app should use:

- dark layered backgrounds
- subtle radial glow fields
- thin luminous borders on key cards
- restrained glass or blur effects only where they add clarity

The top area may include:

- a language switch chip
- a compact brand chip
- a hero illustration block

### Home Screen Composition

The home screen should be structured as:

- top utility row
- hero block with robot-head brand visual
- main headline `Choose an AI trader and start sprint`
- primary action stack:
  - `Traders`
  - `New dep`
  - `My dep`
- compact sprint status or snapshot card
- bottom dock navigation

### Traders And Trader Pages

The traders list and trader page must inherit the same visual system.

Traders list:

- compact rounded cards
- strong nickname visibility
- available network badges
- consistent action affordances

Trader page:

- may use a stronger branded hero treatment than the home screen
- may display `semper in motu ai` where relevant for that trader
- should keep the same button system and card language as the home screen

### Inputs And Reporting Screens

The same design system must extend to:

- new deposit forms
- address forms
- report calculator panels
- payout registry tables/cards

Reporting and deposit screens should not visually feel like a different product.

### Reference Mockup

The current visual direction is demonstrated by the HTML previews:

- `docs/mockups/traders-sprint-home-preview.html`
- `docs/mockups/traders-sprint-home-preview-variant-b.html`

The preferred baseline for implementation is:

- `Variant B`

`Variant B` should guide:

- home screen composition
- button density and styling
- robot-head framing
- status-card layout
- dock navigation treatment

## Traders Discovery And Profile UX

### Traders List

The `Traders` button opens a traders directory.

The list should expose:

- trader nickname
- short description
- available networks
- quick entry into profile

### Trader Profile

Each trader gets a dedicated page.

The page should show:

- hero title `semper in motu ai` for the current initial trader profile experience
- trader nickname
- trader description
- previous period reporting summary for this trader
- historical performance context for trader-linked deposits
- button `Dep new sprint`

Current rollout rule:

- the existing `Flux Trader` page may act as the first live pilot trader profile
- generic trader CTAs remain disabled until backend trader routing is fully wired
- backend implementation must stay generic and must not hardcode Flux-only logic

### Trader Reporting Visibility

Trader pages must show historical reporting by trader inside shared platform periods.

This means:

- the platform period is still the outer accounting object
- but each trader has a separate report inside the period
- the trader page shows only that trader's own reports for past periods
- the trader page must not imply that traders own separate platform periods

## Reporting Model

Each trader participating in a period gets exactly one structured reporting record for that period.

This reporting record remains:

- a structured business record stored in the application
- shown on a dedicated reporting screen
- keyed by `investment_period_id + trader_id`
- responsible for save, review, export, approval, and payout gating for that trader's deposits in that period

### Reporting Record States

- `DRAFT`
- `PENDING_APPROVAL`
- `APPROVED`
- `PAID_OUT`

### Meaning

`DRAFT`
- inputs may still be edited
- preview can be recalculated
- no payout registry exists yet

`PENDING_APPROVAL`
- current reporting values are saved for accountant review
- export links are available
- admin may either approve the saved snapshot or return it to editing

`APPROVED`
- the reporting snapshot is frozen permanently
- values can no longer be edited
- payout registry generation becomes available

`PAID_OUT`
- all payouts for this period are completed
- the reporting record becomes archival

## Reporting Scope And Trader Dimension

The reporting workflow stays inside a shared platform period, but the actual reporting unit becomes `period + trader`.

The system must support:

- one period containing deposits from many traders
- one reporting record per trader inside that period
- one payout registry per trader inside that period
- export rows containing only deposits for the selected trader report
- payout registry rows containing only deposits for the selected trader report

This means:

- one period may have many trader reports
- each trader report belongs to exactly one period
- each trader report contains only deposits linked to that trader in that period

### Required Trader Reports

The required trader reports for a period are determined by participation in that period.

Rules:

- the system collects all traders who have at least one deposit linked to that period
- each such trader must have one trader report for that period
- a trader with no deposits in the period does not require a report for that period
- the period cannot move into payout progression until all required trader reports are completed through the required workflow

## Reporting Screen

When a period is in `REPORTING`, admin should see a dedicated reporting entrypoint that first selects the trader report inside the period, not a hidden calculator buried in the period page.

### Screen Sections

1. **Period Summary**
- period name
- period type `sprint`
- period dates
- selected trader
- trader deposit count
- trader total deposited USDT
- trader average deposit USDT

2. **Reporting Calculator**
- ending balance in USDT for the selected trader
- trader fee percent, default `40`
- network fees:
  - `TRON`
  - `TON`
  - `BSC`

3. **Preview Results**
- total deposits for the selected trader
- gross PnL
- trader fee
- total network fees
- net distributable amount
- per-network payout summaries
- per-deposit payout preview for the selected trader only

4. **Export And Review**
- `Download CSV`
- optional later: `Download XLSX`
- saved timestamp
- saved by
- reporting status

5. **Workflow Actions**
- `Preview`
- `Save For Review`
- `Edit`
- `Approve`
- `Generate Payout Registry`

## Reporting Workflow

### Step 1. Preview

Admin enters reporting inputs:

- `endingBalanceUsdt`
- `traderFeePercent`
- `networkFees` per network

For the current phase, these values are entered manually by the admin for the selected `period + trader` pair inside the admin reporting workflow.

System calculates preview values but does not freeze them yet.

### Step 2. Save For Review

Admin presses `Save For Review`.

System:

- saves the current reporting values as the selected trader's report inside the period
- sets reporting status to `PENDING_APPROVAL`
- exposes export actions for accounting review

This saved version is the version accounting reviews.

### Step 3. Export

The system provides downloadable export files for the saved reporting record:

- `CSV` is required in this phase
- `XLSX` may be added later as an optional enhancement

The export should contain:

- period metadata
- trader metadata
- totals
- trader fee
- network fee buckets
- payout rows
- payout address
- payout address source

### Step 4. Edit Or Approve

After `Save For Review`, admin has two choices:

- `Approve`
- `Edit`

`Edit`
- changes reporting status back to `DRAFT`
- reopens calculator inputs
- allows fixing values
- requires a new `Save For Review` before approval is allowed again

`Approve`
- allowed only from `PENDING_APPROVAL`
- freezes the saved reporting snapshot permanently
- changes reporting status to `APPROVED`
- blocks further editing forever

### Step 5. Generate Payout Registry

After the selected trader report is approved:

- admin presses `Generate Payout Registry`
- system generates the payout registry once
- repeated generation is blocked

### Step 6. Open Payouts

After registry generation:

- the selected trader report may move into payout operations
- the period may transition from `REPORTING` to `PAYOUT_IN_PROGRESS` only when all required trader reports for that period are approved and their payout registries are generated

## Settlement Math

Inputs:

- `totalDepositsUsdt` for the selected trader inside the period
- `endingBalanceUsdt` entered manually by admin for the selected trader report
- `traderFeePercent`
- `networkFees.TRON`
- `networkFees.TON`
- `networkFees.BSC`

Derived values:

- `grossPnlUsdt = endingBalanceUsdt - totalDepositsUsdt`
- `traderFeeUsdt = grossPnlUsdt > 0 ? grossPnlUsdt * traderFeePercent / 100 : 0`
- `totalNetworkFeesUsdt = TRON + TON + BSC`
- `netDistributableUsdt = endingBalanceUsdt - traderFeeUsdt - totalNetworkFeesUsdt`

Per-deposit values:

- `depositShare = depositAmountUsdt / totalDepositsUsdt` for deposits of the selected trader only
- `payoutGrossUsdt = netDistributableUsdt * depositShare`

Per-network fee allocation:

- each deposit shares only in the fee bucket of its own network
- network fees are allocated proportionally across deposits of the same network

Per-deposit final amount:

- `payoutFeeUsdt = proportional share of network fee bucket`
- `payoutNetUsdt = payoutGrossUsdt - payoutFeeUsdt`

### Trader Fee Rule

- default trader fee percent is `40`
- admin may change it before approval
- if `grossPnlUsdt <= 0`, `traderFeeUsdt = 0`

## Deposit Return Address

Each deposit must support a `return_address`.

### Deposit Rules

- deposit detail gets an action `Add Return Address`
- admin or user can store a return address for payout purposes
- payout registry selects payout address with this priority:
  1. `return_address`
  2. `source_address`

### Payout Address Source

Each payout row stores and displays where its payout address came from:

- `RETURN_ADDRESS`
- `SOURCE_ADDRESS`
- `MANUAL_OVERRIDE`

This must be visible as a dedicated column in the payout registry.

## Payout Registry

The payout registry is created once from the approved trader reporting record.

### Registry Constraints

- exactly one payout registry per `period + trader`
- exactly one generation action per `period + trader`
- registry amounts never change after generation
- only operational fields may change later:
  - payout address override
  - payout row status
  - payout notes / tx hash

### Registry Row Fields

- `investment_period_id`
- `trader_report_id`
- `deposit_id`
- `trader_id`
- `trader_nickname`
- `network`
- `asset_symbol`
- `deposit_amount_usdt`
- `share_ratio`
- `payout_gross_usdt`
- `payout_fee_usdt`
- `payout_net_usdt`
- `default_payout_address`
- `selected_payout_address`
- `address_source`
- `status`
- `tx_hash`
- `paid_at`
- `failure_reason`
- `notes`

## Payout Row Statuses

- `PENDING`
- `PAID_MANUAL`
- `PAID_BATCH`
- `FAILED`
- `SKIPPED`

### Meaning

`PENDING`
- default status after registry generation

`PAID_MANUAL`
- row was marked paid individually by admin

`PAID_BATCH`
- row was marked paid by the bulk action

`FAILED`
- payout attempt failed or requires operator attention

`SKIPPED`
- payout row is intentionally excluded from current execution

## Payout Actions

Admin needs both granular and bulk controls.

### Per-Row Actions

- mark one row as paid manually
- set or edit payout address
- mark failed
- mark skipped
- optionally attach tx hash or note

### Bulk Action

`Mark Remaining as Paid`

Behavior:

- marks only rows still not completed
- does not modify rows already marked manually
- sets remaining eligible rows to `PAID_BATCH`

## Period Closing Rules

The period may move from `PAYOUT_IN_PROGRESS` to `CLOSED` only if all payout rows across all trader registries in that period are in terminal statuses:

- `PAID_MANUAL`
- `PAID_BATCH`
- `SKIPPED`

Rows in:

- `PENDING`
- `FAILED`

must block closing.

When the period closes:

- reporting record status becomes `PAID_OUT`
- period becomes archival

## Export Format

Phase 1 export requirement:

- `CSV`

Optional later enhancement:

- `XLSX`

CSV columns should include at minimum:

- period id
- period title
- trader report id
- trader nickname
- deposit id
- network
- asset
- deposit amount usdt
- payout gross usdt
- payout fee usdt
- payout net usdt
- selected payout address
- address source
- payout status
- tx hash
- notes

## Language Support

The miniapp must support:

- `en`
- `ru`

Rules:

- default language remains `en`
- user can switch language from the top-right control
- the switcher may be represented by the current language flag
- user-facing miniapp labels should change immediately after selection
- user preference should be persisted on the user profile when possible
- the language switcher is a functional requirement, not a decorative UI element
- both `en` and `ru` must be complete working variants for the shipped UI
- switching language must update titles, buttons, labels, navigation items, status text, and form text across all miniapp screens
- all translation sources must be stored and served in valid UTF-8 form
- shipped UI must not contain mojibake, placeholder glyphs, broken Cyrillic, or transliterated fallback instead of real Russian text
- the selected font stack must render both Latin and Cyrillic correctly on all supported screens

The first phase must cover at minimum:

- home screen
- traders list
- trader profile
- new deposit flow
- FAQ
- support
- notifications
- deposit detail labels tied to the new trader/address flow

Release blocker rules:

- if `ru` text renders as broken symbols, question marks, mojibake, or unsupported glyphs, the feature is not release-ready
- if language switching does not update all visible UI on the supported screens, the feature is not release-ready

## Security And Abuse Protection

The current product uses Telegram-only registration and login.

### Authentication Model

- onboarding and login rely on validated `Telegram init data`
- the backend must verify Telegram signature data on every auth entrypoint
- classic email/password registration is out of scope for this phase
- CAPTCHA is not required in this phase because onboarding is Telegram-only

### Anti-Bot And Anti-Abuse Rules

Bot and abuse protection must be implemented on the server through validation, throttling, and audit signals.

At minimum the system must provide:

- rate limiting for Telegram auth entrypoints
- rate limiting for deposit creation
- rate limiting for support-case creation
- rate limiting for notifications polling if polling is used
- rate limiting for trader list and trader profile endpoints if needed operationally
- rate limiting for reporting preview and CSV export endpoints
- cooldown behavior for repeated bursts from the same actor
- duplicate-request protection for repeated deposit creation attempts
- audit visibility for suspicious activity patterns

### DoS Resilience Rules

The system must also reduce accidental or malicious resource exhaustion.

At minimum:

- paginated list endpoints for traders and admin tables
- request payload size limits
- server-side caps on reporting preview and export frequency
- safe timeouts for heavy reporting/export operations
- no unbounded export or preview loops from the UI
- period closing and payout generation checks must always run on the server

## API And UI Expectations

### Server Rollout Priority

Server rollout should proceed in this order:

1. add trader data model and admin management
2. expose trader list/profile APIs
3. expose trader-aware deposit creation APIs
4. keep non-pilot trader deposit CTAs disabled in the miniapp until API wiring is verified
5. enable generic trader routing in `New deposit`
6. only after that expand trader-specific `Dep new sprint` beyond the verified pilot flow

This keeps the current UI safe while backend behavior catches up.

### Backend

Add or extend endpoints so the system can:

- load traders list
- load trader profile and trader reporting summary
- load trader main addresses by network
- create deposits linked to both period and trader
- create a new user wallet address from the deposit flow
- load trader reports for a period
- load one reporting record for `period + trader`
- preview reporting math
- save reporting for review
- export trader reporting registry in CSV
- return reporting to draft editing
- approve reporting
- generate payout registry for one trader report
- mark one payout row paid
- bulk mark remaining rows paid
- close period when payout rows are complete
- enforce Telegram auth validation on auth entrypoints
- enforce rate limiting and abuse protection on sensitive operations

The miniapp may continue to use `slug` in URLs and page navigation, but the server must always resolve slug to canonical internal IDs before deposit creation, reporting ownership, or payout generation.

### Miniapp UI

Home screen requirements:

- title `Choose an AI trader and start sprint`
- button `Traders` above `My dep`
- smaller subtitle `choose your lexer` under `Traders`
- rename `My deposit` to `My dep`
- rename `New deposit` to `New dep`
- move FAQ, Support, Notifications to bottom icon navigation
- add language switcher at top right
- use the shared dark soft-sci-fi visual system

Traders UX requirements:

- list page
- profile page
- profile CTA `Dep new sprint`
- placeholder trader pages are acceptable during rollout for non-pilot traders
- non-pilot trader CTAs must stay disabled until trader-aware deposit creation is fully wired

New deposit requirements:

- preserve period-first step
- support trader selection
- support trader prefill when opened from trader page
- auto-bind trader main address from selected network
- allow inline wallet save into `My addresses`

### Admin UI

Add a clear reporting entrypoint from the period:

- `Open Reporting`
- `Open Trader Report`

On the reporting screen:

- admin first selects or opens a trader report within the period
- calculator is always visible for the selected trader report in `REPORTING`
- save-for-review state is explicit
- export links are obvious
- approve is disabled until a saved review version exists
- edit is disabled after approval
- trader identity is visible in the report header and payout rows
- the screen must make it clear that the report is scoped to one trader inside one period

## Safety And Audit Requirements

- approved trader reporting snapshot is immutable
- payout registry is generated once per `period + trader`
- address source is always visible
- trader binding on deposit creation is immutable
- every approval and payout marking action should be audit-logged
- closing a period must validate payout row completeness on the server, not only in UI
- legacy deposits must remain queryable and must not be mutated by background migration logic
- suspicious auth, deposit, support, and export bursts should be audit-visible

## Recommended Implementation Direction

1. Introduce traders and trader main addresses before altering the miniapp deposit flow.
2. Preserve the existing period-first deposit flow and extend it to `period -> trader -> network -> asset -> source wallet`.
3. Keep trader selection immutable after deposit creation.
4. Ship the home screen and traders discovery UX together so the new deposit path is understandable.
5. Add inline wallet creation in `New deposit` and sync it into `My addresses`.
6. Split reporting and payout generation by `period + trader`, while keeping periods shared at the platform level.
7. Ship `CSV` export first, then optionally add `XLSX`.
8. Add bilingual miniapp labels in the same phase as the navigation refresh.
9. Protect Telegram auth and other sensitive endpoints with rate limits and abuse controls before launch.

## Success Criteria

The feature is complete when:

- a user lands on a home screen titled `Choose an AI trader and start sprint`
- the user can open `Traders` and inspect a trader profile
- the user can create a new deposit using `period -> trader -> network -> asset -> source wallet`
- the deposit stores a fixed trader reference and trader `main address`
- inline wallet entry creates a saved address in `My addresses`
- existing legacy deposits still work
- an admin can open a period in `REPORTING`
- select one trader participating in that period
- preview results for that trader's deposits only
- save that trader report for review
- download that trader payout registry as CSV
- approve it once finalized
- generate one immutable payout registry per trader report
- mark payout rows individually or bulk-close remaining rows
- close the period only after all trader payout registries are completed
- the miniapp uses one consistent dark rounded `deplexapp` visual language across home, traders, deposit, and reporting-related user flows

Activation of live `Dep new sprint` from trader profile belongs to the later trader-first release phase, not the MVP success gate.
