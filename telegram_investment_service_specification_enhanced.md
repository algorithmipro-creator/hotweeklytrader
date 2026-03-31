# Telegram Investment Service — Enhanced Project Specification

## 1. Document Status

- **Document type:** Product + System Specification
- **Version:** 2.0
- **Status:** Working draft for architecture, design, and implementation planning
- **Base document:** Original specification prepared from `telegram_investment_app_system_prompt_en.md`
- **Primary objective of this version:** Expand the base specification into a more complete implementation-ready system specification for MVP and post-MVP planning

---

## 2. Project Name and Core Concept

**Project name:** Telegram Investment Service for Managed Trading via Blockchain

**Core concept:**  
A Telegram bot and/or Telegram Mini App that allows users to transfer supported digital assets into managed trading cycles through supported blockchain networks, record the amount and fixed trading period, monitor operational lifecycle statuses, receive a final profit/loss report, and obtain payout to the original sending address or another verified payout route approved by platform rules.

The system is **not** an AI assistant. It is an operational financial interface focused on:
- deposit intake;
- transparent accounting;
- lifecycle tracking;
- reporting;
- payout execution;
- auditability;
- operator-controlled administrative workflows.

---

## 3. Product Goal

### 3.1 Business Goal
Create a controlled operational environment inside Telegram for accepting user funds into managed trading cycles, administering those cycles, and returning principal plus trading result with clear status history and auditable records.

### 3.2 User Value
The user should be able to:
- understand where and how funds are sent;
- see which network and transaction are associated with their deposit;
- know the recorded amount and trading period;
- track status changes throughout the deposit lifecycle;
- receive a transparent final report;
- understand payout status and destination;
- contact support when exceptions occur.

### 3.3 Product Priorities
1. Transparency of transfer flow.
2. Clear and simple user journey.
3. Accurate recording of amount, dates, and statuses.
4. Reliable admin operations and payout control.
5. Full operational auditability.
6. Security of critical actions.
7. Separation of duties for sensitive operations.
8. Operational resilience for blockchain monitoring and payout execution.

---

## 4. Product Delivery Recommendation

### 4.1 Recommended Product Form
The preferred implementation is:

- **Telegram Bot** for:
  - onboarding;
  - notifications;
  - support entry;
  - deep links into the Mini App.

- **Telegram Mini App** for:
  - deposit creation;
  - deposit tracking;
  - transaction history;
  - report viewing;
  - FAQ and support.

- **Admin Panel** for:
  - operators;
  - administrators;
  - payout management;
  - audit visibility;
  - exception handling.

### 4.2 Why Mini App is Preferred over Bot-only
A Mini App is preferred because the product requires:
- structured deposit setup;
- rich status views;
- transaction timelines;
- report pages;
- filters and history;
- multiple operational states;
- clearer transparency mechanisms than a chat-only UI can comfortably provide.

Bot-only may be acceptable for an early pilot but is not the preferred long-term product format.

---

## 5. Roles in the System

### 5.1 User
A Telegram user who:
- enters the bot or Mini App;
- selects network and deposit parameters;
- receives transfer instructions;
- sends funds;
- monitors deposit status;
- receives a report and payout.

### 5.2 Operator
A back-office role that:
- reviews incoming deposits;
- checks matching and exceptions;
- resolves manual review cases where permitted;
- prepares reports and payout batches;
- communicates via support workflows where applicable.

### 5.3 Administrator
A higher-privilege role that:
- manages supported networks and settings;
- manages investment periods;
- approves critical actions;
- oversees payout approvals;
- monitors system health and user activity;
- reviews audit logs.

### 5.4 Super Admin
A restricted governance role that:
- manages admin permissions;
- configures security policies;
- has full audit visibility;
- can freeze system operations during risk events;
- manages emergency controls.

### 5.5 Compliance / Risk Reviewer (Optional but Recommended)
A restricted role that:
- reviews exception cases with legal or compliance impact;
- reviews frozen deposits or payout overrides;
- verifies escalation outcomes where policy requires.

### 5.6 Backend System
The server-side system that:
- generates deposit instructions;
- monitors blockchain activity;
- links users, addresses, and transactions;
- stores immutable records after confirmation;
- generates reports;
- prepares payout queues;
- dispatches notifications;
- records operational events.

---

## 6. Operating Assumptions

The initial design assumes:

1. Supported networks are explicitly defined and configurable.
2. Supported tokens are restricted by network and policy.
3. The system does not accept “any token to any address” behavior.
4. Each deposit request should use a uniquely identifiable route whenever possible.
5. Deposit-to-user binding should be deterministic whenever architecture permits.
6. Administrative correction is allowed only through logged and privileged override.
7. The system must retain historical records even if user-facing statuses change.
8. Payouts require dual control for production operations.
9. Jurisdiction-specific legal requirements may materially affect final launch scope.
10. Exchange-originated transfers may limit sender-address attribution reliability.

---

## 7. Target Scope

### 7.1 MVP Scope
The first version must include:

1. Telegram bot or Mini App entry.
2. User authentication via Telegram identity.
3. Supported network selection.
4. Deposit instruction generation.
5. Blockchain transaction monitoring for supported networks.
6. Deposit detection and confirmation logic.
7. Deposit status tracking in the user interface.
8. Recording of amount, dates, period, and transaction metadata.
9. Basic admin panel for:
   - users,
   - deposits,
   - manual review,
   - period management,
   - payout management.
10. Manual or semi-automated report creation per deposit.
11. User-facing final report screen.
12. Payout recording and payout status updates.
13. Telegram notifications for key events.
14. Audit log for critical admin actions.
15. FAQ and support entry point.

### 7.2 V2 Scope
The second version may include:

1. Richer Mini App dashboard UX.
2. Automated report generation from trading engine data.
3. Advanced analytics for admins.
4. Bulk payout automation with stronger batch tooling.
5. CSV/Excel exports and reconciliation dashboards.
6. Multi-language support.
7. Wallet verification workflows.
8. Advanced role permissions and policy engine.
9. User-level downloadable signed statements.
10. Enhanced exception automation and anomaly detection.
11. Period/product segmentation by user category.
12. Advanced notification preferences.

### 7.3 Explicit Non-Scope for MVP
The MVP should not assume:
- full DeFi automation;
- decentralized on-chain custody contracts by default;
- fully automatic payout without approval controls;
- unrestricted asset support;
- unrestricted jurisdiction support;
- unattended exception resolution.

---

## 8. User Flow

### 8.1 Entry
1. User opens the Telegram bot or Telegram Mini App.
2. User sees the home screen with:
   - supported networks;
   - current active investment periods or available products;
   - a short explanation of the process;
   - access to FAQ and support.

### 8.2 Deposit Setup
1. User chooses a network, such as BSC, TRON, TON, ETH, or SOL.
2. User selects an available investment period or product.
3. System displays:
   - accepted asset/token for the selected network;
   - deposit address or deposit route;
   - minimum and maximum deposit rules where applicable;
   - timing rules;
   - confirmation rules;
   - important notices about transfer risks and constraints.

### 8.3 Transfer
1. User sends funds from a supported wallet.
2. System monitors blockchain events for the selected deposit route.
3. Once the transaction is detected:
   - the transaction hash is recorded;
   - network, token, amount, confirmations, and timestamp are recorded;
   - deposit status changes to `detected`.

### 8.4 Confirmation and Fixation
1. After required blockchain confirmations, the system or operator confirms the deposit.
2. The system fixes:
   - final accepted amount;
   - start date;
   - end date;
   - period ID;
   - linked user ID;
   - linked source wallet address if reliably determined;
   - deposit status `active`.

### 8.5 Active Period Tracking
1. User opens the deposit details page.
2. User sees:
   - deposit amount;
   - network;
   - token;
   - start date;
   - end date;
   - current status;
   - transaction hash;
   - notification history;
   - report availability status;
   - payout preparation status if applicable.

### 8.6 Completion and Reporting
1. At the end of the trading period, the platform records result data.
2. The user receives a report containing:
   - initial amount;
   - gross result;
   - fees if applicable;
   - net profit or loss;
   - payout amount;
   - report generation date;
   - report status.

### 8.7 Payout
1. Admin prepares a payout batch or individual payout.
2. The system validates payout destination rules.
3. Required approvals are performed.
4. Payout is sent.
5. User receives:
   - payout status;
   - payout transaction hash;
   - amount sent;
   - completion timestamp.

### 8.8 Exception Flow
If transfer data is incomplete, mismatched, or unsupported:
- deposit is marked `on_hold` or `manual_review`;
- user receives a notification explaining that review is required;
- operator reviews and resolves the case according to policy;
- all material decisions are logged.

---

## 9. Functional Requirements

### 9.1 User-Facing Features
- Telegram authentication and session handling.
- Home dashboard with active deposits and current statuses.
- Deposit creation flow.
- Network and product/period selection.
- Deposit instructions screen with wallet address and QR code where applicable.
- Deposit details page with operational history.
- Report page for completed periods.
- Transaction history page.
- Notification center.
- FAQ and support entry point.
- Profile and agreement acknowledgment history.

### 9.2 Admin Panel Features
- User directory.
- Deposit list and detail management.
- Trading period management.
- Report upload or generation management.
- Payout queue and batch handling.
- Exception case handling.
- Audit log viewer.
- Role and access controls.
- System settings where permitted.

### 9.3 Deposit Accounting System
- Detection of incoming blockchain transfers.
- Mapping of transaction to deposit instruction.
- Confirmation count tracking.
- Status transitions and immutable fixation after confirmation.
- Multi-network accounting support.
- Manual review queue.
- Duplicate detection safeguards.
- Reconciliation integrity checks.

### 9.4 Reporting System
- Trading period result input or import.
- Profit/loss calculation per deposit.
- Fee calculation support.
- User-facing report generation.
- Internal export support.
- Approval and publication workflow.

### 9.5 Payout System
- Payout batch creation.
- Destination address validation.
- Two-step approval flow.
- Outbound transaction recording.
- Broadcast result recording.
- Final status confirmation.
- Failure handling and retry rules.
- Prevention of duplicate payout execution.

### 9.6 Notification System
- Event-based messaging in Telegram.
- Critical status alerts.
- Manual review notices.
- Report-ready notices.
- Payout lifecycle notifications.
- Optional internal admin alerts.

### 9.7 Support System
- User support ticket initiation.
- Deposit-linked support cases.
- Case status tracking.
- Operator notes and escalation fields.
- Resolution timestamps and outcomes.

---

## 10. Screen Structure

### 10.1 Home Screen
Content:
- product summary;
- supported networks;
- CTA to create a deposit;
- user’s active deposits;
- latest completed reports;
- FAQ and support buttons.

### 10.2 Create Deposit / Period Screen
Content:
- network selector;
- asset selector;
- available periods;
- risk notice;
- transfer instructions;
- deposit route details;
- timing and confirmation rules.

### 10.3 Deposit Details Screen
Content:
- deposit ID;
- status badge;
- amount;
- network and token;
- source address if available;
- deposit address;
- tx hash;
- confirmation count;
- start and end dates;
- timeline of events;
- report status;
- payout status.

### 10.4 Trading Status Screen
Content:
- active period status;
- countdown to period end;
- current operational stage;
- important notices.

### 10.5 Transaction History Screen
Content:
- list of deposits;
- list of payouts;
- statuses;
- dates;
- filters by network, status, and date.

### 10.6 Report Screen
Content:
- initial deposit;
- gross result;
- fees;
- net result;
- payout amount;
- generated date;
- downloadable or reference report identifier.

### 10.7 Profile Screen
Content:
- Telegram account reference;
- deposit history;
- agreement acceptance status;
- notification preferences;
- support access.

### 10.8 FAQ Screen
Content:
- deposit rules;
- supported networks;
- processing times;
- payout logic;
- manual review scenarios;
- risk disclosures.

### 10.9 Support Screen
Content:
- contact route;
- case status;
- support ticket reference or chat entry point.

### 10.10 Admin Panel Screens
- Dashboard
- Users
- Deposits
- Periods
- Reports
- Payouts
- Exceptions
- Audit Log
- Access Control
- Settings
- Monitoring / Health (recommended)

---

## 11. Blockchain Logic

### 11.1 Network Determination
The network is determined by the user’s explicit selection at deposit setup. Each deposit instruction is tied to a predefined network and accepted token set.

### 11.2 Deposit Address Strategy
Possible strategies:
- dedicated address per user or per deposit;
- pooled address with memo/tag/reference where supported;
- smart-wallet allocation by period.

**Recommended MVP approach:** one uniquely identifiable deposit route per deposit request to minimize reconciliation ambiguity.

### 11.3 Incoming Transfer Recording
For every detected incoming transaction, the system records:
- blockchain network;
- token/asset;
- tx hash;
- block number or slot/ledger reference;
- sender address if available on-chain;
- receiver address;
- gross amount;
- net amount if receipt differs;
- confirmation count;
- first seen timestamp;
- confirmation timestamp;
- watcher source and raw payload reference.

### 11.4 User-to-Transaction Binding
Binding may happen through:
- unique deposit address per deposit;
- unique memo/reference;
- one active deposit route per user and period.

The system must avoid relying solely on manual interpretation where deterministic linking is possible.

### 11.5 Confirmation Rules
Each network must have a configurable confirmation threshold.

Suggested generalized status progression:
- `created`
- `awaiting_transfer`
- `detected`
- `confirming`
- `confirmed`
- `active`
- `completed`
- `report_ready`
- `payout_pending`
- `payout_approved`
- `payout_sent`
- `payout_confirmed`
- `on_hold`
- `manual_review`
- `rejected`
- `cancelled`

### 11.6 State Transition Rules
1. `created` -> `awaiting_transfer`
2. `awaiting_transfer` -> `detected`
3. `detected` -> `confirming`
4. `confirming` -> `confirmed`
5. `confirmed` -> `active`
6. `active` -> `completed`
7. `completed` -> `report_ready`
8. `report_ready` -> `payout_pending`
9. `payout_pending` -> `payout_approved`
10. `payout_approved` -> `payout_sent`
11. `payout_sent` -> `payout_confirmed`

Alternative transitions may move a record to:
- `manual_review`
- `on_hold`
- `rejected`
- `cancelled`

State changes must be logged with timestamp, actor, and reason where not fully automatic.

### 11.7 Multiple Deposits
The system must support:
- multiple deposits by one user;
- multiple deposits across different networks;
- multiple deposits in different periods;
- separate reporting and payout tracking per deposit.

### 11.8 Error Handling
The system must identify and process:
- unsupported token transfers;
- transfer to expired deposit route;
- amount below minimum;
- duplicate internal matching attempts;
- low-confirmation or dropped transactions;
- mismatched network;
- payout broadcast failure;
- transfer to valid address with invalid asset;
- route reuse beyond allowed policy.

### 11.9 Payout Execution
Payouts are created per deposit or via approved batch.  
The system records:
- payout batch ID;
- payout destination;
- payout amount;
- tx hash;
- execution operator;
- approval operator;
- timestamps;
- final blockchain status.

### 11.10 Chain-Specific Policy Layer
The system should support configurable per-network rules for:
- confirmation thresholds;
- address format validation;
- token standard support;
- memo/tag requirements where applicable;
- timeout windows;
- watcher polling intervals;
- acceptable finality assumptions.

---

## 12. Data Model

### 12.1 User
Fields:
- user_id
- telegram_id
- username
- display_name
- language
- status
- legal_ack_version
- risk_ack_version
- created_at
- updated_at
- last_login_at

### 12.2 Wallet
Fields:
- wallet_id
- user_id
- network
- source_address
- payout_address
- source_address_confidence
- payout_address_type
- verification_status
- first_seen_at
- last_used_at
- created_at
- updated_at

### 12.3 Deposit
Fields:
- deposit_id
- user_id
- investment_period_id
- network
- asset_symbol
- deposit_route
- source_address
- tx_hash
- requested_amount
- confirmed_amount
- confirmation_count
- min_required_confirmations
- status
- status_reason
- route_expires_at
- created_at
- detected_at
- confirmed_at
- activated_at
- completed_at
- cancelled_at

### 12.4 InvestmentPeriod
Fields:
- investment_period_id
- title
- period_type
- start_date
- end_date
- lock_date
- status
- accepted_networks
- accepted_assets
- minimum_amount_rules
- maximum_amount_rules
- rules_snapshot
- created_by
- created_at
- updated_at

### 12.5 ProfitLossReport
Fields:
- report_id
- deposit_id
- gross_result
- fee_amount
- net_result
- payout_amount
- calculation_method
- report_file_url or report_reference
- generated_at
- approved_at
- published_at
- generated_by
- approved_by
- status

### 12.6 Payout
Fields:
- payout_id
- deposit_id
- payout_batch_id
- destination_address
- destination_rule
- amount
- network
- asset_symbol
- tx_hash
- blockchain_status
- approval_required
- prepared_by
- approved_by
- sent_by
- status
- failure_reason
- created_at
- approved_at
- sent_at
- confirmed_at

### 12.7 AdminAction
Fields:
- action_id
- admin_id
- action_type
- entity_type
- entity_id
- reason
- before_state_hash
- after_state_hash
- created_at

### 12.8 TransactionLog
Fields:
- transaction_log_id
- direction
- network
- asset_symbol
- tx_hash
- from_address
- to_address
- amount
- fee_amount
- confirmations
- status
- raw_payload_reference
- source_system
- created_at
- updated_at

### 12.9 Notification
Fields:
- notification_id
- user_id
- type
- channel
- title
- body
- delivery_status
- sent_at
- read_at
- related_entity_type
- related_entity_id

### 12.10 SupportCase
Fields:
- case_id
- user_id
- related_deposit_id
- category
- priority
- status
- assigned_to
- opened_reason
- resolution_summary
- created_at
- updated_at
- resolved_at

### 12.11 AuditEvent
Fields:
- audit_event_id
- actor_type
- actor_id
- action
- entity_type
- entity_id
- event_time
- reason
- before_snapshot_hash
- after_snapshot_hash
- metadata_reference

### 12.12 SystemJob
Fields:
- job_id
- job_type
- entity_type
- entity_id
- status
- attempts
- last_error
- queued_at
- started_at
- finished_at

---

## 13. Admin Panel

### 13.1 Dashboard
Must show:
- active deposits count;
- deposits awaiting review;
- deposits completing today;
- pending reports;
- payout queue;
- payout failures;
- recent admin actions;
- watcher health summary;
- unresolved support cases.

### 13.2 Users Section
Must provide:
- user list;
- search by Telegram ID, username, deposit ID, wallet address;
- account status;
- linked deposits;
- support history;
- agreement status.

### 13.3 Deposits Section
Must provide:
- deposit table;
- filters by status, network, period, date, asset;
- deposit detail view;
- transaction metadata;
- confirmation timeline;
- manual review tools;
- audit trail link;
- related support case reference.

### 13.4 Period Management
Must provide:
- create/edit/archive investment periods;
- set dates and allowed assets;
- set status transitions;
- freeze period operations if needed;
- preview impact on open deposits.

### 13.5 Reports Section
Must provide:
- report generation/import;
- review before publication;
- approval workflow;
- user-level report preview;
- change history where policy allows.

### 13.6 Payouts Section
Must provide:
- payout queue;
- payout batch creation;
- per-record validation status;
- dual approval process;
- sent and failed payout views;
- export of payout records;
- duplicate prevention indicators.

### 13.7 Exceptions Section
Must provide:
- unsupported transfer cases;
- duplicate cases;
- unmatched transactions;
- manual review status;
- operator notes;
- escalation flags.

### 13.8 Audit Log
Must provide:
- immutable record of critical admin actions;
- filters by admin, action type, date, entity;
- traceability for every state-changing operation.

### 13.9 Access Control
Must provide:
- role assignment;
- permission matrix;
- session policy;
- admin activity history;
- emergency revoke capability.

### 13.10 Monitoring / Health
Recommended views:
- blockchain watcher status;
- queue backlog;
- notification failures;
- payout broadcast failures;
- database replication or backup health;
- incident banner if system is degraded.

---

## 14. Transparency Mechanisms for the User

The product must include:

1. **Transaction hash display** for each incoming deposit and outgoing payout.
2. **Status timeline** with timestamps for every major state change.
3. **Recorded amount and fixed dates** displayed in a structured form.
4. **Visible period identifier** for each investment cycle.
5. **Confirmation visibility** showing when a transfer is detected versus fully confirmed.
6. **Final report view** showing principal, result, fees, and payout amount separately.
7. **Notification log** so the user can verify what the platform communicated and when.
8. **Support escalation path** visible directly from deposit details.
9. **Report export or downloadable reference** for completed periods.
10. **Clear exception status** if the deposit is under manual review.
11. **Payout route disclosure** explaining where payout will be sent according to recorded rules.
12. **No ambiguous processing states** without explanation.
13. **Display of key policy warnings** before transfer.
14. **Disclosure when source address could not be confidently attributed.**

---

## 15. Notifications

### 15.1 Deposit Lifecycle
- deposit route created;
- incoming transfer detected;
- transfer confirmed;
- deposit fixed and activated;
- deposit moved to manual review;
- deposit rejected or cancelled.

### 15.2 Period Lifecycle
- trading period started;
- trading period nearing completion;
- trading period completed.

### 15.3 Report Lifecycle
- report ready for viewing;
- report updated or reissued if allowed by policy.

### 15.4 Payout Lifecycle
- payout prepared;
- payout approved;
- payout sent;
- payout confirmed on-chain;
- payout failed and requires review.

### 15.5 Exception and Security
- unsupported token received;
- deposit mismatch detected;
- payout blocked pending approval;
- account or operation frozen for review;
- system issue affecting processing timeline, if user impact is material.

### 15.6 Internal Notifications
Recommended internal alerts:
- watcher offline;
- queue processing delayed;
- payout broadcast failed;
- reconciliation discrepancy detected;
- unusually high exception rate;
- admin override performed.

---

## 16. Security, Trust, and Governance

### 16.1 Access Control
- Role-based access control is mandatory.
- Sensitive actions must be restricted by role.
- Session expiration and re-authentication should be enforced.
- Privileged sessions should support stronger authentication controls where possible.

### 16.2 Critical Action Confirmation
The following actions require explicit confirmation:
- deposit override;
- report approval;
- payout batch approval;
- payout broadcast;
- destination address override;
- period freeze/unfreeze.

### 16.3 Separation of Duties
The following actions should not be performed by the same person in production unless explicitly overridden and logged:
- preparing and approving a payout;
- generating and approving a report;
- opening and resolving a privileged compliance escalation.

### 16.4 Immutability Rules
After deposit confirmation, the following records should not be editable without privileged and logged override:
- confirmed amount;
- network;
- asset;
- transaction hash;
- start date;
- end date;
- linked period.

### 16.5 Auditability
Every critical action must produce:
- actor ID;
- timestamp;
- target entity;
- reason;
- before/after state fingerprint.

### 16.6 Payout Safety
- two-step approval for payout execution;
- address validation before broadcast;
- batch preview before sending;
- failure-safe retry rules;
- segregation between preparer and approver roles;
- idempotency protection for outbound payouts.

### 16.7 Operational Resilience
- retryable blockchain watchers;
- alerting for sync failures;
- database backup policy;
- incident logging and recovery playbook;
- degraded-mode operational instructions.

### 16.8 Secrets and Key Management
Must include:
- secure storage for RPC credentials and operational secrets;
- restricted access to signing infrastructure;
- key rotation policy;
- environment-specific secret segregation;
- no hard-coded secrets in source control.

### 16.9 Infrastructure Security
Must include:
- environment separation for dev/stage/prod;
- least-privilege network access;
- encrypted transport;
- secure admin endpoint exposure;
- audit logging for privileged system access.

---

## 17. Compliance and Legal Considerations

This project may trigger jurisdiction-specific obligations. A dedicated legal/compliance review is required before production launch.

### 17.1 Areas Requiring Review
- custody or quasi-custody classification;
- investment product or managed account classification;
- KYC/AML obligations;
- sanctions screening;
- suspicious activity escalation;
- tax reporting obligations;
- consumer disclosure requirements;
- data privacy obligations.

### 17.2 Product-Level Compliance Flags
The product should be designed so that it can support:
- agreement acceptance logging;
- versioned risk disclosure acceptance;
- jurisdiction-based restrictions if required;
- user verification status;
- payout blocking under policy triggers.

### 17.3 Compliance Recommendation
Do not treat legal/compliance design as a post-launch task. Launch readiness depends on it.

---

## 18. Non-Functional Requirements

### 18.1 Availability
- User-facing services should remain available during normal operating hours with planned maintenance controls.
- Watcher and queue services should be restart-safe and recoverable.

### 18.2 Performance
- Core deposit screens should load quickly under normal expected traffic.
- Status updates should propagate within an acceptable operational SLA.
- Admin search and list views should support practical filtering and pagination.

### 18.3 Scalability
- The system should support growth across users, deposits, periods, and networks without redesign of the core domain model.
- Background jobs and watchers should scale independently from the web layer.

### 18.4 Reliability
- All critical workflows should be idempotent where possible.
- Reprocessing must not create duplicate financial outcomes.
- Failed jobs should be retryable with bounded retry policy.

### 18.5 Observability
The system must provide:
- structured logs;
- metrics;
- alerting;
- traceable job execution;
- watcher health visibility;
- payout execution visibility.

### 18.6 Data Integrity
- Financial state changes must be transactionally safe.
- Critical writes should not leave partial states without clear recovery logic.
- Reconciliation checks should detect divergence.

### 18.7 Localization
The MVP may be single-language, but the design should not block future multi-language support.

### 18.8 Accessibility and Usability
- Status labels must be understandable to non-technical users.
- Important warnings must be visible before transfer.
- The UI should avoid ambiguous states and unclear calls to action.

### 18.9 Retention and Archival
- Audit records should have a defined retention policy.
- Financial records should be archived according to legal and operational requirements.

---

## 19. Recommended Architecture

### 19.1 High-Level Components
1. Telegram Bot Layer
2. Telegram Mini App Frontend
3. Admin Panel Frontend
4. Backend API
5. Background Job Workers
6. Blockchain Watcher Services
7. Reconciliation Engine
8. Report Service
9. Payout Service
10. Notification Service
11. PostgreSQL Database
12. Redis / Queue Infrastructure
13. Monitoring and Logging Stack

### 19.2 Recommended Architecture Style
A modular monolith is recommended for MVP, with clear domain modules:
- Auth / User
- Periods
- Deposits
- Transactions
- Reports
- Payouts
- Notifications
- Support
- Admin / RBAC
- Audit
- Blockchain integration

This allows faster delivery while preserving future service extraction paths.

### 19.3 Domain Boundaries
Suggested modules:
- **Identity Module**
- **Deposit Module**
- **Period Module**
- **Blockchain Event Module**
- **Reconciliation Module**
- **Report Module**
- **Payout Module**
- **Notification Module**
- **Support Module**
- **Admin Security Module**
- **Audit Module**

### 19.4 Data Flow Summary
1. User creates deposit request.
2. System creates deposit route and expected transfer metadata.
3. Blockchain watcher detects incoming transfer.
4. Reconciliation logic links transaction to deposit request.
5. Confirmation logic advances state.
6. Deposit becomes active.
7. End-of-period process produces report.
8. Payout service prepares and validates payout.
9. Approval flow authorizes payout.
10. Broadcast result is recorded.
11. User sees final payout confirmation.

---

## 20. API and Integration Requirements

### 20.1 Internal API Areas
The backend should expose internal API groups for:
- user/profile;
- deposits;
- periods;
- reports;
- payouts;
- notifications;
- support;
- admin operations;
- health and monitoring.

### 20.2 External Integration Areas
The system may integrate with:
- Telegram Bot API;
- Telegram Mini App auth/session flow;
- RPC providers;
- blockchain indexers/webhooks;
- internal trading result import source;
- optional email/SMS provider later.

### 20.3 API Design Requirements
- Versioned APIs are recommended.
- Admin and user APIs should be clearly separated.
- Sensitive endpoints should enforce RBAC and audit logging.
- Financially sensitive actions should use idempotency controls where applicable.

### 20.4 Suggested Endpoint Groups
- `/auth`
- `/me`
- `/periods`
- `/deposits`
- `/deposits/{id}`
- `/reports`
- `/payouts`
- `/notifications`
- `/support`
- `/admin/users`
- `/admin/deposits`
- `/admin/periods`
- `/admin/reports`
- `/admin/payouts`
- `/admin/exceptions`
- `/admin/audit`
- `/admin/settings`
- `/health`

---

## 21. Deposit and Payout Policy Recommendations

### 21.1 Deposit Policy
Recommended MVP policy:
- one deposit request = one uniquely identifiable deposit route;
- limited validity window for deposit instruction;
- defined minimum and maximum deposit amounts;
- unsupported or wrong-network transfers go to manual review;
- multiple transfers into one request allowed only if policy explicitly supports aggregation.

### 21.2 Source Address Policy
- Source address should be recorded when available.
- Confidence level should be stored if attribution is uncertain.
- Exchange-originated transfers should be treated carefully.

### 21.3 Payout Destination Policy
Recommended policy options:
1. payout to original verified sending address when confidence is sufficient;
2. payout to pre-verified payout address if policy allows;
3. manual review for ambiguous or overridden destinations.

### 21.4 Payout Blocking Conditions
A payout may be blocked if:
- report not approved;
- destination validation fails;
- compliance review is required;
- insufficient treasury balance exists;
- duplicate or conflicting payout records are detected.

---

## 22. Exception Handling Framework

### 22.1 Exception Categories
- unmatched transfer;
- unsupported token;
- wrong network;
- route expired;
- amount below minimum;
- duplicate request conflict;
- payout validation failure;
- payout broadcast failure;
- watcher inconsistency;
- report discrepancy.

### 22.2 Exception Workflow
1. Detect issue.
2. Create exception record.
3. Assign severity and owner.
4. Notify user if user impact exists.
5. Resolve or escalate.
6. Record resolution reason and audit trace.

### 22.3 User Communication Rule
The user should never see a vague “processing” state when an actual exception exists. The status must explain that review is ongoing.

---

## 23. Testing Strategy

### 23.1 Functional Testing
Must cover:
- deposit creation;
- route generation;
- transaction detection;
- confirmation progression;
- report publication;
- payout approval;
- payout recording;
- notifications;
- support case linkage.

### 23.2 Blockchain Edge Case Testing
Must cover:
- delayed confirmations;
- reorg-related state inconsistencies;
- unsupported token arrival;
- wrong-network transfers;
- duplicate event delivery;
- watcher restart recovery.

### 23.3 Security Testing
Must cover:
- RBAC enforcement;
- privilege escalation attempts;
- admin session timeout;
- critical action approval checks;
- audit log generation;
- payout override restrictions.

### 23.4 Financial Integrity Testing
Must cover:
- duplicate payout prevention;
- idempotent job reprocessing;
- reconciliation correctness;
- report amount consistency;
- state-machine enforcement.

### 23.5 UAT
User acceptance testing should validate:
- clarity of statuses;
- clarity of deposit instructions;
- report comprehension;
- support discoverability;
- payout transparency.

---

## 24. Launch Readiness Requirements

Before launch, the following must be complete:

1. Supported network and asset list approved.
2. Deposit route model approved.
3. Payout destination policy approved.
4. Manual review policy documented.
5. Report generation workflow approved.
6. Dual-control payout flow tested.
7. Audit log verified.
8. Monitoring and alerting enabled.
9. Backup and incident playbook documented.
10. Legal/compliance review completed for target jurisdiction(s).
11. Operator handbook prepared.
12. User-facing disclosures finalized.
13. Support workflow staffed and documented.

---

## 25. Acceptance Criteria for MVP

The MVP is considered functionally complete when:

1. A user can authenticate through Telegram and access the product.
2. A user can create a deposit request for a supported network and asset.
3. The system generates a uniquely identifiable deposit route.
4. A blockchain transfer to that route is detected and recorded.
5. Confirmation progression is visible to both user and admin.
6. A confirmed deposit becomes active with fixed dates and amount.
7. At period completion, a report can be generated and published.
8. A payout can be prepared, approved, and recorded with blockchain reference.
9. The user can view deposit history, report details, and payout status.
10. Critical admin actions are auditable.
11. Manual review cases are visible and manageable.
12. Core notifications are sent for major lifecycle events.

---

## 26. Recommended Tech Stack

### 26.1 Telegram Layer
- Telegram Bot API for messaging and notifications
- Telegram Mini App for richer user interface

### 26.2 Frontend
- React / Next.js for Mini App interface
- TypeScript
- Tailwind CSS or equivalent component system

### 26.3 Backend
- Node.js with NestJS or Python with FastAPI
- REST API and internal job workers
- Queue system for asynchronous blockchain and notification tasks

### 26.4 Database
- PostgreSQL as primary relational database
- Redis for caching, locks, and job coordination

### 26.5 Blockchain Monitoring
- RPC providers per supported network
- Dedicated watcher services per chain
- Webhook/indexer integrations where reliable
- Internal normalization layer for multi-chain transaction events

### 26.6 Admin Panel
- React-based internal dashboard
- RBAC middleware
- Audit trail viewer

### 26.7 Notifications
- Telegram bot messaging
- Optional email or secondary channel later

### 26.8 Logging and Audit
- Structured application logs
- Immutable audit event storage
- Error tracking and alerting system
- Metrics dashboard for watcher and payout health

### 26.9 Infrastructure
- Docker-based services
- CI/CD pipeline
- Secret management
- Secure environment separation for dev/stage/prod

### 26.10 Practical Stack Recommendation
For implementation speed and maintainability, the recommended stack is:
- **Mini App / Admin:** Next.js + TypeScript
- **Backend:** NestJS
- **DB:** PostgreSQL
- **Queue / cache:** Redis
- **ORM:** Prisma
- **Infra:** Docker / Docker Compose for MVP, then managed cloud deployment
- **Workers:** dedicated background job workers
- **Observability:** structured logging + metrics + alerts

---

## 27. Development Roadmap

### Phase 1 — Product Discovery and Analysis
- define business rules;
- define supported assets and periods;
- define reconciliation and payout policy;
- define exception cases;
- define legal/compliance scope.

### Phase 2 — UX/UI Design
- map user flows;
- design Mini App and bot interactions;
- design admin panel screens;
- test language clarity for statuses and risk notices.

### Phase 3 — Backend Foundation
- implement core data model;
- implement authentication and user model;
- implement period and deposit services;
- implement audit logging;
- establish RBAC.

### Phase 4 — Blockchain Integration
- implement network watchers;
- implement transfer detection and confirmation logic;
- implement reconciliation engine;
- implement manual review workflow.

### Phase 5 — User Interface and Admin Panel
- implement home, deposit, history, report, and support views;
- implement admin deposits, periods, payouts, and audit views.

### Phase 6 — Reporting and Payouts
- implement report generation flow;
- implement payout queue;
- implement payout approval and execution tracking.

### Phase 7 — Testing
- functional testing;
- blockchain edge case testing;
- payout process testing;
- role and permission testing;
- auditability testing.

### Phase 8 — Launch
- pilot period with limited volume;
- monitoring and incident readiness;
- operator handbook rollout;
- post-launch review and V2 backlog creation.

---

## 28. Open Questions

Before development starts, the following questions must be clarified:

1. Which exact tokens/assets are supported on each network?
2. Will each deposit use a unique address, shared address with memo, or another routing model?
3. Are users allowed to send multiple transfers into one deposit request?
4. Is payout always returned to the original sending address, or can another verified payout address be specified?
5. How will exchange-originated transfers be handled if sender address attribution is unreliable?
6. What are the minimum and maximum deposit amounts?
7. Are trading periods fixed, rolling, or product-based?
8. Can a user have several active deposits in the same period?
9. Is report generation manual, imported, or integrated directly with a trading engine?
10. How are fees defined, calculated, approved, and displayed?
11. Which admin actions require dual approval?
12. What is the target operating model for payouts: manual, semi-automatic, or fully automated?
13. What are the SLA expectations for deposit confirmation, report publication, and payout processing?
14. What legal/compliance obligations apply in the target jurisdictions?
15. Is KYC/AML required before deposit, before payout, or not in MVP?
16. What evidence must be shown to the user if a deposit enters manual review?
17. What is the incident procedure if a chain watcher fails or reports inconsistent data?
18. What reporting format is required for internal accounting and audits?
19. Should the project launch first as a Telegram bot only, Mini App only, or both?
20. Which language set is required in MVP: English only, Russian only, or multilingual?

---

## 29. Recommended Default Decisions for Planning

Until final business decisions are approved, the following defaults are recommended for architecture planning:

1. Launch as **Telegram Bot + Mini App** together.
2. Use **one uniquely identifiable deposit route per deposit request** for MVP.
3. Support only a **strict allowlist of tokens per network**.
4. Treat unsupported token or wrong-network transfers as **manual review**.
5. Require **dual approval** for payout execution.
6. Use **manual or semi-automated report generation** in MVP.
7. Record source address with a confidence indicator rather than assuming certainty.
8. Allow payout only to the original verified route or approved verified payout address.
9. Use a **modular monolith** architecture for MVP.
10. Keep the product designed for later multi-language support even if MVP launches in one language.

---

## 30. Repository Structure Recommendation

Suggested monorepo structure:

```text
/apps
  /miniapp
  /admin
  /api
  /worker
/packages
  /ui
  /config
  /shared-types
  /blockchain-core
/docs
  /product
  /architecture
  /api
  /security
  /operations
  /compliance
/infrastructure
  /docker
  /deploy
```

---

## 31. Suggested Backlog Epics

1. Telegram Authentication & Session
2. User Profile & Acknowledgments
3. Deposit Route Generation
4. Blockchain Watchers
5. Deposit Reconciliation
6. Deposit State Machine
7. Period Management
8. Reporting Workflow
9. Payout Workflow
10. Notification System
11. Support Case Management
12. Admin RBAC
13. Audit and Monitoring
14. Compliance Enablement
15. UX / Mini App Delivery
16. Admin Panel Delivery

---

## 32. Source Basis

This specification expands the earlier project specification prepared from the uploaded project prompt and requirements structure provided in the file `telegram_investment_app_system_prompt_en.md`.
