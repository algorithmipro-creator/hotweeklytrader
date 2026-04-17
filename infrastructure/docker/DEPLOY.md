# Deploy Guide — Telegram Investment Service

## Prerequisites

- Server with Docker + Docker Compose installed
- Domain name pointing to server IP
- SSL certificates (Let's Encrypt recommended)
- Telegram Bot Token from @BotFather

## Quick Deploy

```bash
# 1. Clone repo
git clone <repo-url> telegram-investment-service
cd telegram-investment-service/infrastructure/docker

# 2. Copy and fill env
cp .env.prod.example .env.prod
nano .env.prod  # Fill in all values

# 3. Generate JWT secret
openssl rand -hex 32  # Copy to JWT_SECRET in .env.prod

# 3.1 Generate Telegram WebApp secret for API from the bot token
python3 - <<'PY'
import hmac, hashlib
bot_token = input('Paste TELEGRAM_BOT_TOKEN: ').strip().encode()
print(hmac.new(b"WebAppData", bot_token, hashlib.sha256).hexdigest())
PY
# Copy the output to TELEGRAM_WEBAPP_SECRET in .env.prod

# 4. Setup SSL (Let's Encrypt)
mkdir -p nginx/ssl
# Copy your cert.pem and privkey.pem to nginx/ssl/
# Or use certbot:
# certbot certonly --standalone -d your-domain.com
# cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
# cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem

# 5. Build and start
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# 6. Check status
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api

# 7. Run database seed (optional)
docker compose -f docker-compose.prod.yml exec api npx prisma db seed
```

## Trader Routing Rollout

Use this order for the current trader/reporting release:

```bash
# 1. Copy and fill env
cp .env.prod.example .env.prod
nano .env.prod

# 2. Build and start containers
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# 3. Apply database migrations
docker compose -f docker-compose.prod.yml --env-file .env.prod exec api npx prisma migrate deploy

# 4. Seed admin + sprint + pilot traders
docker compose -f docker-compose.prod.yml --env-file .env.prod exec api npx prisma db seed

# 5. Verify API health
curl https://hotweeklytrader.duckdns.org/api/v1/health

# 6. Verify admin login page
curl -I https://hotweeklytrader-admin.duckdns.org/login
```

### Required `.env.prod` values for this rollout

```env
JWT_SECRET=<64_CHAR_SECRET>
TELEGRAM_BOT_TOKEN=<BOT_TOKEN>
TELEGRAM_WEBAPP_SECRET=<HMAC_SHA256_HEX_FROM_BOT_TOKEN>
TELEGRAM_BOT_NAME=<BOT_USERNAME>
MINI_APP_URL=https://your-domain.com/
ADMIN_APP_URL=https://hotweeklytrader-admin.duckdns.org
ADMIN_TELEGRAM_IDS=<ADMIN_TELEGRAM_ID>
SEED_ADMIN_TELEGRAM_ID=<ADMIN_TELEGRAM_ID>

# Optional trader address overrides
SEED_FLUX_TRON_USDT_ADDRESS=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
SEED_FLUX_BSC_USDT_ADDRESS=0x55d398326f99059fF775485246999027B3197955
SEED_FLUX_TON_USDT_ADDRESS=UQBRa_O3tTbTJK214M3LBXiQelZS9F-IpNesIysbi0B8QB8a
SEED_VECTOR_TON_USDT_ADDRESS=EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs
SEED_VECTOR_BSC_USDT_ADDRESS=0x55d398326f99059fF775485246999027B3197955
```

### Expected seed result

- one `SUPER_ADMIN` user exists for `SEED_ADMIN_TELEGRAM_ID`
- one active `Sprint 1` period exists
- `Flux Trader` exists with active `TRON/BSC/TON` addresses
- `Vector Pulse` exists with active `TON/BSC` addresses

### Manual staging checks

1. Open `https://hotweeklytrader-admin.duckdns.org/login`
2. Log in as seeded admin via Telegram
3. Open `Traders` and verify seeded traders exist
4. Open `Periods -> Reporting`
5. For one trader:
   - preview report
   - save draft
   - submit
   - approve
   - publish
   - generate payout registry
6. Open miniapp and verify:
   - `EN/RU` switch works
   - `Traders -> Flux Trader -> New dep` prefill works
   - generic trader profile routes open

## Owner-Only Bot Switch

Bot identity must be changed only on the server by the owner. Do not add admin-panel or API endpoints that edit:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBAPP_SECRET`
- `TELEGRAM_BOT_NAME`
- `MINI_APP_URL`
- `ADMIN_APP_URL`

Use this owner-only flow on the server:

```bash
# 1. SSH to the server as the owner
ssh root@your-server

# 2. Open production env
cd /root/hotweeklytrader/infrastructure/docker
nano .env.prod

# 3. Replace bot identity values
# TELEGRAM_BOT_TOKEN=<NEW_BOT_TOKEN>
# TELEGRAM_BOT_NAME=<NEW_BOT_USERNAME>
# MINI_APP_URL=https://your-domain.com/

# 4. Recompute API Telegram validation secret
python3 - <<'PY'
import hmac, hashlib
bot_token = input('Paste NEW TELEGRAM_BOT_TOKEN: ').strip().encode()
print(hmac.new(b"WebAppData", bot_token, hashlib.sha256).hexdigest())
PY
# Save the output into TELEGRAM_WEBAPP_SECRET in .env.prod

# 5. Restart only the affected services
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build api bot miniapp

# 6. Verify health and auth flow
curl https://hotweeklytrader.duckdns.org/api/v1/health
curl -I https://hotweeklytrader.duckdns.org/
```

Rollback:

```bash
# Restore previous bot env values in .env.prod
# Rebuild the same services
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build api bot miniapp
```

## URLs After Deploy

| Service | URL |
|---|---|
| API | https://your-domain.com/api/v1/health |
| Mini App | https://your-domain.com/app/ |
| Admin Panel | https://your-domain.com/admin/ |

## Useful Commands

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f bot

# Restart a service
docker compose -f docker-compose.prod.yml restart api

# Run migrations manually
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy

# Open Prisma Studio
docker compose -f docker-compose.prod.yml exec api npx prisma studio --hostname 0.0.0.0

# Stop everything
docker compose -f docker-compose.prod.yml down

# Stop + remove volumes (DANGER: deletes all data)
docker compose -f docker-compose.prod.yml down -v
```

## SSL with Certbot

```bash
# Install certbot
apt update && apt install -y certbot

# Get certificate
certbot certonly --standalone -d your-domain.com

# Copy certs
mkdir -p infrastructure/docker/nginx/ssl
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem infrastructure/docker/nginx/ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem infrastructure/docker/nginx/ssl/key.pem

# Setup auto-renewal cron
echo "0 3 * * * certbot renew --quiet && docker compose -f /path/to/docker-compose.prod.yml restart nginx" | crontab -
```

## Nginx SSL Config (update default.conf)

Replace the `listen 80;` block with:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # ... rest of the config stays the same
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}
```

## MT5 Live Metrics Bridge

Phase 1 uses an external Python bridge rather than running MT5 integration inside the API container.

Required runtime:

- Windows or compatible MT5 host
- Python 3
- MetaTrader 5 terminal installed and authenticated

Setup outline:

1. Copy `bridges/mt5_live_metrics/config.example.json` to `config.json`
2. Fill in MT5 credentials, `trader_id`, `investment_period_id`, backend URL, and internal secret
3. Install dependencies with `pip install -r requirements.txt`
4. Run `python main.py`

Default polling interval is `15` minutes for phase 1.
