FROM node:20-alpine AS builder

WORKDIR /app

COPY apps/admin/package*.json ./
RUN npm install

COPY apps/admin/ ./
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3002

ENV PORT=3002
CMD ["node", "server.js"]
