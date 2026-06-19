FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* ./
COPY services/shared ./services/shared
COPY services/group-service ./services/group-service

RUN npm install --workspace=@codequesthub/shared --workspace=group-service

RUN npm run build --workspace=@codequesthub/shared
RUN npm run build --workspace=group-service

WORKDIR /app/services/group-service
EXPOSE 4002
CMD ["node", "dist/src/server.js"]
