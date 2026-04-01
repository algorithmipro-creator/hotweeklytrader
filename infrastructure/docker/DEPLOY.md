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
