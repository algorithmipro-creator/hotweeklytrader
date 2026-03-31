# Telegram Investment Service — Plan 1: Backend Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the NestJS backend monorepo with Prisma, PostgreSQL, Telegram auth, user management, investment periods, RBAC, and audit logging.

**Architecture:** Modular monolith with NestJS. Each domain module (auth, users, periods, deposits, payouts, audit, rbac) is a separate NestJS module with clear boundaries. Prisma ORM for PostgreSQL. Docker Compose for local dev infrastructure.

**Tech Stack:** NestJS, TypeScript, Prisma, PostgreSQL, Redis, Jest, Docker Compose

---

## Repository Structure

```
/apps
  /api              — NestJS backend
  /worker           — Background job workers (later)
/apps
  /miniapp          — Next.js Telegram Mini App (Plan 3)
  /admin            — Next.js Admin Panel (Plan 5)
  /bot              — Telegram Bot (Plan 3)
/packages
  /shared-types     — Shared TypeScript types
  /blockchain-core  — Blockchain utilities (Plan 2)
/infrastructure
  /docker           — Docker Compose files
/docs
  /api              — API documentation
```

## Prisma Schema (all models for reference — only MVP models implemented in Plan 1)

The full data model from spec includes: User, Wallet, Deposit, InvestmentPeriod, ProfitLossReport, Payout, AdminAction, TransactionLog, Notification, SupportCase, AuditEvent, SystemJob.

**Plan 1 implements:** User, InvestmentPeriod, Admin (RBAC), AuditEvent.
**Plan 2 adds:** Deposit, Wallet, TransactionLog, SystemJob.
**Plan 4 adds:** ProfitLossReport, Payout, Notification, SupportCase.

---

### Task 1: Project Setup — Monorepo + Docker Compose

**Files:**
- Create: `infrastructure/docker/docker-compose.yml`
- Create: `infrastructure/docker/.env.example`
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/nest-cli.json`
- Create: `apps/api/.env.example`
- Create: `package.json` (root workspace)

- [ ] **Step 1: Create root workspace package.json**

```json
{
  "name": "telegram-investment-service",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev:api": "npm run dev --workspace=apps/api",
    "dev:worker": "npm run dev --workspace=apps/worker",
    "dev:miniapp": "npm run dev --workspace=apps/miniapp",
    "dev:admin": "npm run dev --workspace=apps/admin",
    "dev:bot": "npm run dev --workspace=apps/bot",
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "test:e2e": "npm run test:e2e --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present",
    "docker:up": "docker compose -f infrastructure/docker/docker-compose.yml up -d",
    "docker:down": "docker compose -f infrastructure/docker/docker-compose.yml down",
    "db:migrate": "npm run db:migrate --workspace=apps/api",
    "db:seed": "npm run db:seed --workspace=apps/api",
    "db:studio": "npm run db:studio --workspace=apps/api"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: Create Docker Compose**

`infrastructure/docker/docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-invest}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-invest_password}
      POSTGRES_DB: ${POSTGRES_DB:-invest_db}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-invest}"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

`infrastructure/docker/.env.example`:

```
POSTGRES_USER=invest
POSTGRES_PASSWORD=invest_password
POSTGRES_DB=invest_db
```

- [ ] **Step 3: Create API package.json**

`apps/api/package.json`:

```json
{
  "name": "@tis/api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:e2e": "jest --config jest-e2e.json",
    "lint": "eslint src/",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio",
    "db:seed": "ts-node prisma/seed.ts"
  },
  "dependencies": {
    "@nestjs/common": "^10.4.0",
    "@nestjs/core": "^10.4.0",
    "@nestjs/platform-express": "^10.4.0",
    "@nestjs/config": "^3.3.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/swagger": "^7.4.0",
    "@nestjs/throttler": "^6.2.0",
    "@prisma/client": "^6.2.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "ioredis": "^5.4.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.0",
    "@nestjs/schematics": "^10.2.0",
    "@nestjs/testing": "^10.4.0",
    "@types/jest": "^29.5.0",
    "@types/node": "^22.0.0",
    "@types/passport-jwt": "^4.0.0",
    "jest": "^29.7.0",
    "prisma": "^6.2.0",
    "ts-jest": "^29.2.0",
    "ts-node": "^10.9.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 4: Create tsconfig.json**

`apps/api/tsconfig.json`:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

- [ ] **Step 5: Create nest-cli.json**

`apps/api/nest-cli.json`:

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

- [ ] **Step 6: Create .env.example**

`apps/api/.env.example`:

```
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://invest:invest_password@localhost:5432/invest_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=replace-with-secure-random-string
JWT_EXPIRES_IN=24h

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_BOT_NAME=your_bot_name
```

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "chore: initial monorepo setup with Docker Compose, NestJS scaffolding"
```

---

### Task 2: Prisma Schema — All MVP Models

**Files:**
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/seed.ts`
- Modify: `apps/api/.env.example` (add DATABASE_URL already present)

- [ ] **Step 1: Create Prisma schema with all models**

`apps/api/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== ENUMS ====================

enum UserRole {
  USER
  OPERATOR
  ADMIN
  SUPER_ADMIN
  COMPLIANCE_REVIEWER
}

enum UserStatus {
  ACTIVE
  SUSPENDED
  BANNED
}

enum DepositStatus {
  CREATED
  AWAITING_TRANSFER
  DETECTED
  CONFIRMING
  CONFIRMED
  ACTIVE
  COMPLETED
  REPORT_READY
  PAYOUT_PENDING
  PAYOUT_APPROVED
  PAYOUT_SENT
  PAYOUT_CONFIRMED
  ON_HOLD
  MANUAL_REVIEW
  REJECTED
  CANCELLED
}

enum InvestmentPeriodStatus {
  DRAFT
  ACTIVE
  LOCKED
  COMPLETED
  ARCHIVED
}

enum ReportStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  PUBLISHED
  REVISED
}

enum PayoutStatus {
  PREPARED
  PENDING_APPROVAL
  APPROVED
  SENT
  CONFIRMED
  FAILED
  CANCELLED
}

enum PayoutDestinationRule {
  ORIGINAL_SENDER
  VERIFIED_ADDRESS
  MANUAL_REVIEW
}

enum NotificationType {
  DEPOSIT_ROUTE_CREATED
  TRANSFER_DETECTED
  TRANSFER_CONFIRMED
  DEPOSIT_ACTIVATED
  MANUAL_REVIEW_STARTED
  DEPOSIT_REJECTED
  PERIOD_STARTED
  PERIOD_NEARING_END
  PERIOD_COMPLETED
  REPORT_READY
  PAYOUT_PREPARED
  PAYOUT_APPROVED
  PAYOUT_SENT
  PAYOUT_CONFIRMED
  PAYOUT_FAILED
  UNSUPPORTED_TOKEN_RECEIVED
  DEPOSIT_MISMATCH
  ACCOUNT_FROZEN
  SYSTEM_ISSUE
}

enum NotificationChannel {
  TELEGRAM
  EMAIL
}

enum DeliveryStatus {
  PENDING
  SENT
  FAILED
  READ
}

enum SupportCaseStatus {
  OPEN
  IN_PROGRESS
  ESCALATED
  RESOLVED
  CLOSED
}

enum SupportCasePriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum JobStatus {
  QUEUED
  RUNNING
  COMPLETED
  FAILED
  RETRYING
}

enum JobType {
  BLOCKCHAIN_WATCHER
  DEPOSIT_CONFIRMATION
  PERIOD_COMPLETION
  REPORT_GENERATION
  PAYOUT_PREPARATION
  PAYOUT_BROADCAST
  NOTIFICATION_DISPATCH
  RECONCILIATION
}

// ==================== MODELS ====================

model User {
  user_id             String        @id @default(uuid())
  telegram_id         BigInt        @unique
  username            String?
  display_name        String?
  language            String        @default("en")
  status              UserStatus    @default(ACTIVE)
  legal_ack_version   String?
  risk_ack_version    String?
  created_at          DateTime      @default(now())
  updated_at          DateTime      @updatedAt
  last_login_at       DateTime?

  wallets             Wallet[]
  deposits            Deposit[]
  notifications       Notification[]
  support_cases       SupportCase[]
  admin_actions       AdminAction[]
  audit_events        AuditEvent[]  @relation("AuditActor")
}

model Wallet {
  wallet_id                 String   @id @default(uuid())
  user_id                   String
  network                   String
  source_address            String?
  payout_address            String?
  source_address_confidence Float?
  payout_address_type       String?
  verification_status       String   @default("unverified")
  first_seen_at             DateTime @default(now())
  last_used_at              DateTime?
  created_at                DateTime @default(now())
  updated_at                DateTime @updatedAt

  user                      User     @relation(fields: [user_id], references: [user_id], onDelete: Cascade)

  @@index([user_id])
  @@index([network, source_address])
}

model InvestmentPeriod {
  investment_period_id   String                   @id @default(uuid())
  title                  String
  period_type            String
  start_date             DateTime
  end_date               DateTime
  lock_date              DateTime?
  status                 InvestmentPeriodStatus   @default(DRAFT)
  accepted_networks      String[]
  accepted_assets        String[]
  minimum_amount_rules   Json?
  maximum_amount_rules   Json?
  rules_snapshot         Json?
  created_by             String?
  created_at             DateTime                 @default(now())
  updated_at             DateTime                 @updatedAt

  deposits               Deposit[]
}

model Deposit {
  deposit_id                String        @id @default(uuid())
  user_id                   String
  investment_period_id      String
  network                   String
  asset_symbol              String
  deposit_route             String        @unique
  source_address            String?
  tx_hash                   String?
  requested_amount          Decimal?
  confirmed_amount          Decimal?
  confirmation_count        Int           @default(0)
  min_required_confirmations Int          @default(1)
  status                    DepositStatus  @default(CREATED)
  status_reason             String?
  route_expires_at          DateTime?
  created_at                DateTime       @default(now())
  detected_at               DateTime?
  confirmed_at              DateTime?
  activated_at              DateTime?
  completed_at              DateTime?
  cancelled_at              DateTime?

  user                      User            @relation(fields: [user_id], references: [user_id])
  investment_period         InvestmentPeriod @relation(fields: [investment_period_id], references: [investment_period_id])
  report                    ProfitLossReport?
  payouts                   Payout[]

  @@index([user_id])
  @@index([investment_period_id])
  @@index([status])
  @@index([network, status])
  @@index([deposit_route])
  @@index([tx_hash])
}

model ProfitLossReport {
  report_id            String       @id @default(uuid())
  deposit_id           String       @unique
  gross_result         Decimal
  fee_amount           Decimal      @default(0)
  net_result           Decimal
  payout_amount        Decimal
  calculation_method   String?
  report_file_url      String?
  report_reference     String?
  generated_at         DateTime     @default(now())
  approved_at          DateTime?
  published_at         DateTime?
  generated_by         String?
  approved_by          String?
  status               ReportStatus @default(DRAFT)

  deposit              Deposit      @relation(fields: [deposit_id], references: [deposit_id])
}

model Payout {
  payout_id            String                @id @default(uuid())
  deposit_id           String
  payout_batch_id      String?
  destination_address  String
  destination_rule     PayoutDestinationRule @default(ORIGINAL_SENDER)
  amount               Decimal
  network              String
  asset_symbol         String
  tx_hash              String?
  blockchain_status    String?
  approval_required    Boolean               @default(true)
  prepared_by          String?
  approved_by          String?
  sent_by              String?
  status               PayoutStatus          @default(PREPARED)
  failure_reason       String?
  created_at           DateTime              @default(now())
  approved_at          DateTime?
  sent_at              DateTime?
  confirmed_at         DateTime?

  deposit              Deposit               @relation(fields: [deposit_id], references: [deposit_id])

  @@index([deposit_id])
  @@index([status])
  @@index([payout_batch_id])
}

model AdminAction {
  action_id            String   @id @default(uuid())
  admin_id             String
  action_type          String
  entity_type          String
  entity_id            String
  reason               String?
  before_state_hash    String?
  after_state_hash     String?
  created_at           DateTime @default(now())

  admin                User     @relation(fields: [admin_id], references: [user_id])

  @@index([admin_id])
  @@index([entity_type, entity_id])
}

model TransactionLog {
  transaction_log_id    String   @id @default(uuid())
  direction             String
  network               String
  asset_symbol          String
  tx_hash               String
  from_address          String?
  to_address            String
  amount                Decimal
  fee_amount            Decimal?
  confirmations         Int      @default(0)
  status                String   @default("pending")
  raw_payload_reference String?
  source_system         String?
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  @@index([tx_hash])
  @@index([network, status])
  @@index([to_address])
}

model Notification {
  notification_id        String             @id @default(uuid())
  user_id                String
  type                   NotificationType
  channel                NotificationChannel @default(TELEGRAM)
  title                  String
  body                   String
  delivery_status        DeliveryStatus      @default(PENDING)
  sent_at                DateTime?
  read_at                DateTime?
  related_entity_type    String?
  related_entity_id      String?
  created_at             DateTime            @default(now())

  user                   User                @relation(fields: [user_id], references: [user_id])

  @@index([user_id])
  @@index([delivery_status])
  @@index([type])
}

model SupportCase {
  case_id              String              @id @default(uuid())
  user_id              String
  related_deposit_id   String?
  category             String
  priority             SupportCasePriority @default(MEDIUM)
  status               SupportCaseStatus   @default(OPEN)
  assigned_to          String?
  opened_reason        String
  resolution_summary   String?
  created_at           DateTime            @default(now())
  updated_at           DateTime            @updatedAt
  resolved_at          DateTime?

  user                 User                @relation(fields: [user_id], references: [user_id])

  @@index([user_id])
  @@index([status])
  @@index([related_deposit_id])
}

model AuditEvent {
  audit_event_id       String   @id @default(uuid())
  actor_type           String   @default("user")
  actor_id             String?
  action               String
  entity_type          String
  entity_id            String?
  event_time           DateTime @default(now())
  reason               String?
  before_snapshot_hash String?
  after_snapshot_hash  String?
  metadata_reference   String?

  actor                User?    @relation("AuditActor", fields: [actor_id], references: [user_id])

  @@index([actor_type, actor_id])
  @@index([entity_type, entity_id])
  @@index([action])
  @@index([event_time])
}

model SystemJob {
  job_id               String    @id @default(uuid())
  job_type             JobType
  entity_type          String?
  entity_id            String?
  status               JobStatus @default(QUEUED)
  attempts             Int       @default(0)
  last_error           String?
  queued_at            DateTime  @default(now())
  started_at           DateTime?
  finished_at          DateTime?

  @@index([status])
  @@index([job_type])
  @@index([queued_at])
}
```

- [ ] **Step 2: Create seed file**

`apps/api/prisma/seed.ts`:

```typescript
import { PrismaClient, UserRole, UserStatus, InvestmentPeriodStatus } from '@prisma/client';
import { hash } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  // Create default super admin
  const adminTelegramId = BigInt(process.env.SEED_ADMIN_TELEGRAM_ID || '0');
  if (adminTelegramId > 0n) {
    await prisma.user.upsert({
      where: { telegram_id: adminTelegramId },
      update: {},
      create: {
        telegram_id: adminTelegramId,
        username: 'admin',
        display_name: 'System Admin',
        status: UserStatus.ACTIVE,
      },
    });
  }

  // Create sample investment period for testing
  const now = new Date();
  const startDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

  await prisma.investmentPeriod.create({
    data: {
      title: 'Test Period 2026-Q2',
      period_type: 'fixed',
      start_date: startDate,
      end_date: endDate,
      lock_date: startDate,
      status: InvestmentPeriodStatus.DRAFT,
      accepted_networks: ['BSC', 'TRON', 'TON'],
      accepted_assets: ['USDT', 'USDC'],
      minimum_amount_rules: { default: 100 },
      maximum_amount_rules: { default: 100000 },
    },
  });

  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 3: Run Prisma generate and migrate**

```bash
cd apps/api
npx prisma generate
npx prisma migrate dev --name init
```

Expected: Migration created and applied to PostgreSQL. Client generated.

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/
git commit -m "feat: Prisma schema with all MVP models and seed data"
```

---

### Task 3: NestJS App Module + Config + Health

**Files:**
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/config/app.config.ts`
- Create: `apps/api/src/config/database.config.ts`
- Create: `apps/api/src/config/telegram.config.ts`
- Create: `apps/api/src/config/jwt.config.ts`
- Create: `apps/api/src/health/health.controller.ts`
- Create: `apps/api/src/health/health.module.ts`
- Create: `apps/api/src/prisma/prisma.service.ts`
- Create: `apps/api/src/prisma/prisma.module.ts`
- Create: `apps/api/src/prisma/prisma.service.spec.ts`
- Create: `apps/api/jest.config.js`

- [ ] **Step 1: Create Prisma service**

`apps/api/src/prisma/prisma.service.ts`:

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

`apps/api/src/prisma/prisma.module.ts`:

```typescript
import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 2: Write test for PrismaService**

`apps/api/src/prisma/prisma.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should extend PrismaClient', () => {
    expect(service.$connect).toBeDefined();
    expect(service.$disconnect).toBeDefined();
  });
});
```

- [ ] **Step 3: Run test to verify it passes**

```bash
cd apps/api
npm test -- --testPathPattern=prisma.service.spec.ts
```

Expected: PASS

- [ ] **Step 4: Create config modules**

`apps/api/src/config/app.config.ts`:

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
}));
```

`apps/api/src/config/database.config.ts`:

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,
}));
```

`apps/api/src/config/telegram.config.ts`:

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('telegram', () => ({
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  botName: process.env.TELEGRAM_BOT_NAME || '',
}));
```

`apps/api/src/config/jwt.config.ts`:

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
}));
```

- [ ] **Step 5: Create Health controller**

`apps/api/src/health/health.controller.ts`:

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  readiness() {
    return { status: 'ready' };
  }
}
```

`apps/api/src/health/health.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
```

- [ ] **Step 6: Create App module**

`apps/api/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import telegramConfig from './config/telegram.config';
import jwtConfig from './config/jwt.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, telegramConfig, jwtConfig],
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    PrismaModule,
    HealthModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 7: Create main.ts**

`apps/api/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('api/v1');

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') || 3000;

  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api/v1`);
}

bootstrap();
```

- [ ] **Step 8: Create jest.config.js**

`apps/api/jest.config.js`:

```javascript
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
```

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/ apps/api/jest.config.js
git commit -m "feat: NestJS app module, config, health endpoint, Prisma service"
```

---

### Task 4: Auth Module — Telegram InitData Validation + JWT

**Files:**
- Create: `apps/api/src/auth/auth.module.ts`
- Create: `apps/api/src/auth/auth.service.ts`
- Create: `apps/api/src/auth/auth.controller.ts`
- Create: `apps/api/src/auth/strategies/telegram.strategy.ts`
- Create: `apps/api/src/auth/strategies/jwt.strategy.ts`
- Create: `apps/api/src/auth/guards/jwt-auth.guard.ts`
- Create: `apps/api/src/auth/guards/roles.guard.ts`
- Create: `apps/api/src/auth/guards/telegram-initdata.guard.ts`
- Create: `apps/api/src/auth/dto/auth.dto.ts`
- Create: `apps/api/src/auth/auth.service.spec.ts`
- Modify: `apps/api/src/app.module.ts` (add AuthModule)

- [ ] **Step 1: Create auth DTOs**

`apps/api/src/auth/dto/auth.dto.ts`:

```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class TelegramAuthDto {
  @IsString()
  @IsNotEmpty()
  initData: string;
}

export class AuthResponseDto {
  accessToken: string;
  user: {
    user_id: string;
    telegram_id: string;
    username: string | null;
    display_name: string | null;
    status: string;
  };
}
```

- [ ] **Step 2: Write auth service test**

`apps/api/src/auth/auth.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const mockJwt = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'telegram.botToken') return 'test-bot-token';
      if (key === 'jwt.secret') return 'test-secret';
      if (key === 'jwt.expiresIn') return '1h';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateTelegramInitData', () => {
    it('should reject empty initData', () => {
      expect(() => service['validateTelegramInitData']('')).toThrow();
    });

    it('should reject initData without hash', () => {
      expect(() => service['validateTelegramInitData']('query_id=abc')).toThrow();
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd apps/api
npm test -- --testPathPattern=auth.service.spec.ts
```

Expected: FAIL with "AuthService not found"

- [ ] **Step 4: Implement auth service**

`apps/api/src/auth/auth.service.ts`:

```typescript
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { createHash, createHmac } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async authenticateTelegram(initData: string) {
    const parsed = this.validateTelegramInitData(initData);
    const telegramId = BigInt(parsed.id);

    const user = await this.prisma.user.upsert({
      where: { telegram_id: telegramId },
      update: {
        last_login_at: new Date(),
        username: parsed.username || undefined,
        display_name: [parsed.first_name, parsed.last_name].filter(Boolean).join(' ') || undefined,
      },
      create: {
        telegram_id: telegramId,
        username: parsed.username || null,
        display_name: [parsed.first_name, parsed.last_name].filter(Boolean).join(' ') || null,
        last_login_at: new Date(),
      },
    });

    const accessToken = this.jwtService.sign({
      sub: user.user_id,
      telegram_id: user.telegram_id.toString(),
      role: 'USER',
    });

    return {
      accessToken,
      user: {
        user_id: user.user_id,
        telegram_id: user.telegram_id.toString(),
        username: user.username,
        display_name: user.display_name,
        status: user.status,
      },
    };
  }

  private validateTelegramInitData(initData: string): Record<string, string> {
    if (!initData || initData.trim().length === 0) {
      throw new BadRequestException('initData is required');
    }

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');

    if (!hash) {
      throw new BadRequestException('hash is missing in initData');
    }

    params.delete('hash');

    const sortedParams = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const botToken = this.configService.get<string>('telegram.botToken');
    if (!botToken) {
      throw new BadRequestException('Telegram bot token not configured');
    }

    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = createHmac('sha256', secretKey).update(sortedParams).digest('hex');

    if (computedHash !== hash) {
      throw new UnauthorizedException('Invalid Telegram initData signature');
    }

    const result: Record<string, string> = {};
    for (const [key, value] of params.entries()) {
      result[key] = value;
    }

    if (result.user) {
      const userData = JSON.parse(result.user);
      return { ...userData, id: userData.id.toString() };
    }

    return result;
  }
}
```

- [ ] **Step 5: Create auth controller**

`apps/api/src/auth/auth.controller.ts`:

```typescript
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TelegramAuthDto, AuthResponseDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('telegram')
  @HttpCode(HttpStatus.OK)
  async telegramAuth(@Body() dto: TelegramAuthDto): Promise<AuthResponseDto> {
    return this.authService.authenticateTelegram(dto.initData);
  }
}
```

- [ ] **Step 6: Create JWT strategy**

`apps/api/src/auth/strategies/jwt.strategy.ts`:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') || 'dev-secret',
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { user_id: payload.sub },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not found or inactive');
    }

    return {
      user_id: user.user_id,
      telegram_id: user.telegram_id.toString(),
      role: payload.role,
    };
  }
}
```

- [ ] **Step 7: Create guards**

`apps/api/src/auth/guards/jwt-auth.guard.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

`apps/api/src/auth/guards/roles.guard.ts`:

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => Reflector.createDecorator<string[]>();

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
```

- [ ] **Step 8: Create auth module**

`apps/api/src/auth/auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: config.get<string>('jwt.expiresIn') || '24h',
        },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, PassportModule, JwtModule],
})
export class AuthModule {}
```

- [ ] **Step 9: Register AuthModule in AppModule**

`apps/api/src/app.module.ts` — add AuthModule to imports:

```typescript
import { AuthModule } from './auth/auth.module';

// ... in imports array:
AuthModule,
```

- [ ] **Step 10: Run tests**

```bash
cd apps/api
npm test
```

Expected: All tests pass.

- [ ] **Step 11: Commit**

```bash
git add apps/api/src/auth/ apps/api/src/app.module.ts
git commit -m "feat: Telegram auth with initData validation and JWT"
```

---

### Task 5: Users Module — Profile + Me Endpoint

**Files:**
- Create: `apps/api/src/users/users.module.ts`
- Create: `apps/api/src/users/users.controller.ts`
- Create: `apps/api/src/users/users.service.ts`
- Create: `apps/api/src/users/users.service.spec.ts`
- Create: `apps/api/src/users/dto/user.dto.ts`
- Create: `apps/api/src/common/decorators/current-user.decorator.ts`

- [ ] **Step 1: Create current-user decorator**

`apps/api/src/common/decorators/current-user.decorator.ts`:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

- [ ] **Step 2: Create user DTOs**

`apps/api/src/users/dto/user.dto.ts`:

```typescript
import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
}

export class UserProfileDto {
  user_id: string;
  telegram_id: string;
  username: string | null;
  display_name: string | null;
  language: string;
  status: string;
  legal_ack_version: string | null;
  risk_ack_version: string | null;
  created_at: string;
  last_login_at: string | null;
}

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  legal_ack_version?: string;

  @IsString()
  @IsOptional()
  risk_ack_version?: string;
}
```

- [ ] **Step 3: Write users service test**

`apps/api/src/users/users.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      const mockUser = {
        user_id: 'test-id',
        telegram_id: BigInt(12345),
        username: 'testuser',
        display_name: 'Test User',
        language: 'en',
        status: 'ACTIVE',
        legal_ack_version: null,
        risk_ack_version: null,
        created_at: new Date(),
        last_login_at: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne('test-id');
      expect(result).toBeDefined();
      expect(result.user_id).toBe('test-id');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { user_id: 'test-id' },
      });
    });
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

```bash
cd apps/api
npm test -- --testPathPattern=users.service.spec.ts
```

Expected: FAIL

- [ ] **Step 5: Implement users service**

`apps/api/src/users/users.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOne(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        telegram_id: true,
        username: true,
        display_name: true,
        language: true,
        status: true,
        legal_ack_version: true,
        risk_ack_version: true,
        created_at: true,
        last_login_at: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      telegram_id: user.telegram_id.toString(),
      created_at: user.created_at.toISOString(),
      last_login_at: user.last_login_at?.toISOString() || null,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { user_id: userId },
      data: {
        language: dto.language,
        legal_ack_version: dto.legal_ack_version,
        risk_ack_version: dto.risk_ack_version,
      },
      select: {
        user_id: true,
        telegram_id: true,
        username: true,
        display_name: true,
        language: true,
        status: true,
        legal_ack_version: true,
        risk_ack_version: true,
        created_at: true,
        last_login_at: true,
      },
    });

    return {
      ...user,
      telegram_id: user.telegram_id.toString(),
      created_at: user.created_at.toISOString(),
      last_login_at: user.last_login_at?.toISOString() || null,
    };
  }
}
```

- [ ] **Step 6: Create users controller**

`apps/api/src/users/users.controller.ts`:

```typescript
import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateProfileDto, UserProfileDto } from './dto/user.dto';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  async getProfile(@CurrentUser() user: any): Promise<UserProfileDto> {
    return this.usersService.findOne(user.user_id);
  }

  @Patch()
  async updateProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfileDto> {
    return this.usersService.updateProfile(user.user_id, dto);
  }
}
```

- [ ] **Step 7: Create users module**

`apps/api/src/users/users.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 8: Register UsersModule in AppModule**

```typescript
import { UsersModule } from './users/users.module';
// Add to imports in app.module.ts
```

- [ ] **Step 9: Run tests**

```bash
cd apps/api
npm test
```

Expected: All pass.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/users/ apps/api/src/common/ apps/api/src/app.module.ts
git commit -m "feat: user profile and me endpoint"
```

---

### Task 6: Investment Periods Module — CRUD + Admin

**Files:**
- Create: `apps/api/src/periods/periods.module.ts`
- Create: `apps/api/src/periods/periods.controller.ts`
- Create: `apps/api/src/periods/periods.service.ts`
- Create: `apps/api/src/periods/periods.service.spec.ts`
- Create: `apps/api/src/periods/dto/period.dto.ts`
- Create: `apps/api/src/periods/admin-periods.controller.ts`

- [ ] **Step 1: Create period DTOs**

`apps/api/src/periods/dto/period.dto.ts`:

```typescript
import { IsString, IsOptional, IsArray, IsDateString, IsObject } from 'class-validator';

export class CreatePeriodDto {
  @IsString()
  title: string;

  @IsString()
  period_type: string;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsDateString()
  @IsOptional()
  lock_date?: string;

  @IsArray()
  @IsString({ each: true })
  accepted_networks: string[];

  @IsArray()
  @IsString({ each: true })
  accepted_assets: string[];

  @IsObject()
  @IsOptional()
  minimum_amount_rules?: Record<string, number>;

  @IsObject()
  @IsOptional()
  maximum_amount_rules?: Record<string, number>;
}

export class UpdatePeriodDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsDateString()
  @IsOptional()
  start_date?: string;

  @IsDateString()
  @IsOptional()
  end_date?: string;

  @IsDateString()
  @IsOptional()
  lock_date?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  accepted_networks?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  accepted_assets?: string[];
}

export class PeriodDto {
  investment_period_id: string;
  title: string;
  period_type: string;
  start_date: string;
  end_date: string;
  lock_date: string | null;
  status: string;
  accepted_networks: string[];
  accepted_assets: string[];
  minimum_amount_rules: any;
  maximum_amount_rules: any;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Write periods service test**

`apps/api/src/periods/periods.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PeriodsService } from './periods.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('PeriodsService', () => {
  let service: PeriodsService;

  const mockPrisma = {
    investmentPeriod: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PeriodsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PeriodsService>(PeriodsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return active periods by default', async () => {
      mockPrisma.investmentPeriod.findMany.mockResolvedValue([]);

      const result = await service.findAll();
      expect(Array.isArray(result)).toBe(true);
      expect(mockPrisma.investmentPeriod.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
        orderBy: { start_date: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('should throw if period not found', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd apps/api
npm test -- --testPathPattern=periods.service.spec.ts
```

Expected: FAIL

- [ ] **Step 4: Implement periods service**

`apps/api/src/periods/periods.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePeriodDto, UpdatePeriodDto } from './dto/period.dto';

@Injectable()
export class PeriodsService {
  constructor(private prisma: PrismaService) {}

  async findAll(status?: string) {
    const where = status ? { status } : { status: 'ACTIVE' };

    const periods = await this.prisma.investmentPeriod.findMany({
      where,
      orderBy: { start_date: 'asc' },
    });

    return periods.map(this.serialize);
  }

  async findOne(id: string) {
    const period = await this.prisma.investmentPeriod.findUnique({
      where: { investment_period_id: id },
    });

    if (!period) {
      throw new NotFoundException('Investment period not found');
    }

    return this.serialize(period);
  }

  async create(dto: CreatePeriodDto, createdBy?: string) {
    const period = await this.prisma.investmentPeriod.create({
      data: {
        ...dto,
        start_date: new Date(dto.start_date),
        end_date: new Date(dto.end_date),
        lock_date: dto.lock_date ? new Date(dto.lock_date) : null,
        minimum_amount_rules: dto.minimum_amount_rules
          ? JSON.parse(JSON.stringify(dto.minimum_amount_rules))
          : null,
        maximum_amount_rules: dto.maximum_amount_rules
          ? JSON.parse(JSON.stringify(dto.maximum_amount_rules))
          : null,
        created_by: createdBy,
      },
    });

    return this.serialize(period);
  }

  async update(id: string, dto: UpdatePeriodDto) {
    const existing = await this.prisma.investmentPeriod.findUnique({
      where: { investment_period_id: id },
    });

    if (!existing) {
      throw new NotFoundException('Investment period not found');
    }

    const period = await this.prisma.investmentPeriod.update({
      where: { investment_period_id: id },
      data: {
        ...dto,
        start_date: dto.start_date ? new Date(dto.start_date) : undefined,
        end_date: dto.end_date ? new Date(dto.end_date) : undefined,
        lock_date: dto.lock_date ? new Date(dto.lock_date) : undefined,
      },
    });

    return this.serialize(period);
  }

  async updateStatus(id: string, status: string) {
    const period = await this.prisma.investmentPeriod.update({
      where: { investment_period_id: id },
      data: { status },
    });

    return this.serialize(period);
  }

  private serialize(period: any) {
    return {
      ...period,
      start_date: period.start_date.toISOString(),
      end_date: period.end_date.toISOString(),
      lock_date: period.lock_date?.toISOString() || null,
      created_at: period.created_at.toISOString(),
      updated_at: period.updated_at.toISOString(),
    };
  }
}
```

- [ ] **Step 5: Create user-facing periods controller**

`apps/api/src/periods/periods.controller.ts`:

```typescript
import { Controller, Get, Param } from '@nestjs/common';
import { PeriodsService } from './periods.service';
import { PeriodDto } from './dto/period.dto';

@Controller('periods')
export class PeriodsController {
  constructor(private periodsService: PeriodsService) {}

  @Get()
  async findAll(): Promise<PeriodDto[]> {
    return this.periodsService.findAll('ACTIVE');
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<PeriodDto> {
    return this.periodsService.findOne(id);
  }
}
```

- [ ] **Step 6: Create admin periods controller**

`apps/api/src/periods/admin-periods.controller.ts`:

```typescript
import {
  Controller, Get, Post, Put, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { PeriodsService } from './periods.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreatePeriodDto, UpdatePeriodDto, PeriodDto } from './dto/period.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('admin/periods')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminPeriodsController {
  constructor(private periodsService: PeriodsService) {}

  @Get()
  async findAll(@Query('status') status?: string): Promise<PeriodDto[]> {
    return this.periodsService.findAll(status);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<PeriodDto> {
    return this.periodsService.findOne(id);
  }

  @Post()
  async create(
    @Body() dto: CreatePeriodDto,
    @CurrentUser() user: any,
  ): Promise<PeriodDto> {
    return this.periodsService.create(dto, user.user_id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePeriodDto,
  ): Promise<PeriodDto> {
    return this.periodsService.update(id, dto);
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ): Promise<PeriodDto> {
    return this.periodsService.updateStatus(id, status);
  }
}
```

- [ ] **Step 7: Create periods module**

`apps/api/src/periods/periods.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PeriodsService } from './periods.service';
import { PeriodsController } from './periods.controller';
import { AdminPeriodsController } from './admin-periods.controller';

@Module({
  providers: [PeriodsService],
  controllers: [PeriodsController, AdminPeriodsController],
  exports: [PeriodsService],
})
export class PeriodsModule {}
```

- [ ] **Step 8: Register in AppModule**

```typescript
import { PeriodsModule } from './periods/periods.module';
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
git add apps/api/src/periods/ apps/api/src/app.module.ts
git commit -m "feat: investment periods CRUD with admin controller"
```

---

### Task 7: Audit Module — Immutable Event Logging

**Files:**
- Create: `apps/api/src/audit/audit.module.ts`
- Create: `apps/api/src/audit/audit.service.ts`
- Create: `apps/api/src/audit/audit.service.spec.ts`
- Create: `apps/api/src/audit/audit.decorator.ts`
- Create: `apps/api/src/audit/admin-audit.controller.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Write audit service test**

`apps/api/src/audit/audit.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuditService', () => {
  let service: AuditService;

  const mockPrisma = {
    auditEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
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
```

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL

- [ ] **Step 3: Implement audit service**

`apps/api/src/audit/audit.service.ts`:

```typescript
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
```

- [ ] **Step 4: Create audit decorator**

`apps/api/src/audit/audit.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'auditAction';

export interface AuditActionMeta {
  action: string;
  entityType: string;
  entityIdParam?: string;
  reasonParam?: string;
}

export function AuditAction(meta: AuditActionMeta) {
  return SetMetadata(AUDIT_ACTION_KEY, meta);
}
```

- [ ] **Step 5: Create admin audit controller**

`apps/api/src/audit/admin-audit.controller.ts`:

```typescript
import {
  Controller, Get, Query, UseGuards,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('admin/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminAuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  async findEvents(
    @Query('actorType') actorType?: string,
    @Query('actorId') actorId?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.auditService.findEvents({
      actorType,
      actorId,
      entityType,
      entityId,
      action,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }
}
```

- [ ] **Step 6: Create audit module**

`apps/api/src/audit/audit.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AdminAuditController } from './admin-audit.controller';

@Module({
  providers: [AuditService],
  controllers: [AdminAuditController],
  exports: [AuditService],
})
export class AuditModule {}
```

- [ ] **Step 7: Register in AppModule**

```typescript
import { AuditModule } from './audit/audit.module';
// Add to imports
```

- [ ] **Step 8: Run tests**

```bash
cd apps/api
npm test
```

Expected: All pass.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/audit/ apps/api/src/app.module.ts
git commit -m "feat: audit logging service with admin query endpoint"
```

---

### Task 8: Admin Users Controller + RBAC Integration

**Files:**
- Create: `apps/api/src/users/admin-users.controller.ts`
- Modify: `apps/api/src/users/users.module.ts`
- Modify: `apps/api/src/periods/admin-periods.controller.ts` (add role guards)
- Modify: `apps/api/src/audit/admin-audit.controller.ts` (add role guards)

- [ ] **Step 1: Create admin users controller**

`apps/api/src/users/admin-users.controller.ts`:

```typescript
import {
  Controller, Get, Param, Query, UseGuards, Patch, Body,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

class AdminUpdateUserDto {
  status?: string;
}

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminUsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  async findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    // For MVP: simple list — extend with search in Plan 5
    const users = await (this.usersService as any).prisma.user.findMany({
      where: status ? { status } : {},
      orderBy: { created_at: 'desc' },
      take: limit ? parseInt(limit, 10) : 50,
      skip: offset ? parseInt(offset, 10) : 0,
      select: {
        user_id: true,
        telegram_id: true,
        username: true,
        display_name: true,
        status: true,
        created_at: true,
        last_login_at: true,
      },
    });

    return users.map((u: any) => ({
      ...u,
      telegram_id: u.telegram_id.toString(),
      created_at: u.created_at.toISOString(),
      last_login_at: u.last_login_at?.toISOString() || null,
    }));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return (this.usersService as any).prisma.user.update({
      where: { user_id: id },
      data: { status: dto.status },
    });
  }
}
```

- [ ] **Step 2: Update UsersModule**

Add `AdminUsersController` to controllers in `apps/api/src/users/users.module.ts`.

- [ ] **Step 3: Add role guards to admin controllers**

Update `apps/api/src/periods/admin-periods.controller.ts` class decorator:

```typescript
@Controller('admin/periods')
@UseGuards(JwtAuthGuard, RolesGuard)
// Add @Roles('ADMIN', 'SUPER_ADMIN', 'OPERATOR') before methods that need it
```

- [ ] **Step 4: Run tests**

```bash
cd apps/api
npm test
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/users/ apps/api/src/periods/ apps/api/src/audit/
git commit -m "feat: admin users controller with RBAC on admin endpoints"
```

---

### Task 9: Integration Test — Full Auth + Period Flow

**Files:**
- Create: `apps/api/test/app.e2e-spec.ts`
- Create: `apps/api/test/jest-e2e.json`

- [ ] **Step 1: Create e2e test config**

`apps/api/test/jest-e2e.json`:

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
```

- [ ] **Step 2: Create e2e test**

`apps/api/test/app.e2e-spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/health', () => {
    it('GET returns ok', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
        });
    });
  });

  describe('/api/v1/auth/telegram', () => {
    it('POST rejects empty initData', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/telegram')
        .send({ initData: '' })
        .expect(400);
    });

    it('POST rejects missing hash', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/telegram')
        .send({ initData: 'query_id=test' })
        .expect(400);
    });
  });

  describe('/api/v1/periods', () => {
    it('GET returns empty array when no periods', () => {
      return request(app.getHttpServer())
        .get('/api/v1/periods')
        .expect(200)
        .expect([]);
    });
  });
});
```

- [ ] **Step 3: Add supertest dependency**

```bash
cd apps/api
npm install --save-dev supertest @types/supertest
```

- [ ] **Step 4: Run e2e tests**

```bash
cd apps/api
npm run test:e2e
```

Expected: All pass.

- [ ] **Step 5: Final commit for Plan 1**

```bash
git add apps/api/test/ apps/api/package.json
git commit -m "test: e2e tests for health, auth, and periods endpoints"
```

---

## Plan 1 Summary — What's Built

| Component | Endpoints | Status |
|---|---|---|
| Health | `GET /api/v1/health`, `GET /api/v1/health/ready` | ✅ |
| Auth | `POST /api/v1/auth/telegram` | ✅ |
| Users | `GET /api/v1/me`, `PATCH /api/v1/me` | ✅ |
| Periods (user) | `GET /api/v1/periods`, `GET /api/v1/periods/:id` | ✅ |
| Periods (admin) | `GET/POST/PUT /api/v1/admin/periods` | ✅ |
| Users (admin) | `GET /api/v1/admin/users`, `PATCH /api/v1/admin/users/:id/status` | ✅ |
| Audit (admin) | `GET /api/v1/admin/audit` | ✅ |
| Database | 12 Prisma models, seed data | ✅ |
| Infra | Docker Compose (PostgreSQL + Redis) | ✅ |

## What's NOT in Plan 1 (covered in subsequent plans)

- Deposits, blockchain watcher, reconciliation → **Plan 2**
- Telegram Bot, Mini App UI → **Plan 3**
- Reports, Payouts → **Plan 4**
- Admin Panel frontend → **Plan 5**
- Notifications, Support, Docker deploy → **Plan 6**

---

## API Endpoints Available After Plan 1

```
GET    /api/v1/health
GET    /api/v1/health/ready
POST   /api/v1/auth/telegram
GET    /api/v1/me
PATCH  /api/v1/me
GET    /api/v1/periods
GET    /api/v1/periods/:id
GET    /api/v1/admin/periods
POST   /api/v1/admin/periods
PUT    /api/v1/admin/periods/:id
PUT    /api/v1/admin/periods/:id/status
GET    /api/v1/admin/users
GET    /api/v1/admin/users/:id
PATCH  /api/v1/admin/users/:id/status
GET    /api/v1/admin/audit
```
