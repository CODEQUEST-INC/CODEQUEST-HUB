FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* ./
COPY services/shared ./services/shared
COPY services/project-service ./services/project-service

RUN npm install --workspace=@codequesthub/shared --workspace=project-service

RUN npm run build --workspace=@codequesthub/shared
RUN npm run build --workspace=project-service

WORKDIR /app/services/project-service
EXPOSE 4003
CMD ["node", "dist/src/server.js"]
