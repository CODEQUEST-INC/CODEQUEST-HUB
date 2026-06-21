FROM node:20-alpine AS base
WORKDIR /app

# Copy workspace root files + shared package + this service first for better layer caching
COPY package.json package-lock.json* ./
COPY services/shared ./services/shared
COPY services/auth-service ./services/auth-service

RUN npm install --workspace=@codequesthub/shared --workspace=auth-service

RUN npm run build --workspace=@codequesthub/shared
RUN npm run build --workspace=auth-service

WORKDIR /app/services/auth-service
EXPOSE 4001
CMD ["node", "dist/src/server.js"]
