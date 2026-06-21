FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* ./
COPY services/shared ./services/shared
COPY services/judging-service ./services/judging-service

RUN npm install --workspace=@codequesthub/shared --workspace=judging-service

RUN npm run build --workspace=@codequesthub/shared
RUN npm run build --workspace=judging-service

WORKDIR /app/services/judging-service
EXPOSE 4004
CMD ["node", "dist/src/server.js"]