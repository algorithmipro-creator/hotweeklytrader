FROM node:20-alpine

WORKDIR /app

COPY apps/bot/package*.json ./
RUN npm install --production

COPY apps/bot/ ./

RUN npx tsc

EXPOSE 3003

CMD ["node", "dist/main.js"]
