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

EXPOSE 3002

ENV PORT=3002
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
