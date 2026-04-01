FROM node:20-alpine

WORKDIR /app

COPY apps/bot/package*.json ./
RUN npm install

COPY apps/bot/ ./

RUN npm install typescript --save-dev && ./node_modules/.bin/tsc

EXPOSE 3003

CMD ["node", "dist/main.js"]
