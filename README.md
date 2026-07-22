# CodeQuestHub

Backend + mobile app for **CodeQuest 2026** (KNUST), a hackathon-style capstone program: students form groups, submit project proposals, get judged, track tasks, and showcase finished projects.

## Architecture

A Spring Boot microservices backend behind a single gateway, plus an Expo/React Native frontend.

```
                        ┌──────────────────┐
   Expo app (web/iOS/Android) ──────────▶  │  gateway-service  │  :8080
                        └──────────────────┘
                                 │
        ┌────────────┬──────────┼──────────┬─────────────┬───────────────┐
        ▼            ▼          ▼          ▼             ▼               ▼
  auth-service  group-service  project-service  task-service  judging-service  showcase-service
     :8081         :8082          :8083           :8084          :8085           :8086
        └────────────┴──────────┴──────────┴─────────────┴───────────────┘
                                 │
                          shared Postgres (Neon)
```

- **gateway-service** — single entry point the frontend talks to; routes requests to the right backend service and handles CORS.
- **auth-service** — registration/login, JWT issuance, user lookup.
- **group-service** — cohorts, groups, group membership, group leader/supervisor assignment.
- **project-service** — project proposals (submit, review, resubmit, history).
- **task-service** — per-group task board.
- **judging-service** — judging criteria, judge assignment, scorecards, leaderboard.
- **showcase-service** — public project showcase gallery with photo upload.
- **common-security** — shared library (JWT utilities, security filter, exception handling) every service depends on.

All services share one Postgres database (Neon) — there's no per-service database. Auth is JWT-based: `auth-service` issues tokens, every other service validates them independently via the shared `common-security` module.

## Tech stack

- **Backend**: Java 17, Spring Boot 3.2.5, Spring Data JPA, Spring Security, Maven, Postgres (Neon)
- **Frontend**: Expo SDK 54, React Native 0.81, React 19, TypeScript, React Navigation v7
- **Infra**: Docker Compose (local backend orchestration), GitHub Actions CI

## Prerequisites

- Docker Desktop
- Node.js 20+ and npm
- A Postgres connection string (Neon or any Postgres 16+ instance) with the schema applied — see [Database](#database)

## Running it

### 1. Environment variables

Copy `.env.example` to `.env` and fill in your Postgres credentials and a JWT secret (32+ chars):

```bash
cp .env.example .env
```

### 2. Backend

```bash
docker compose up -d
```

This builds and starts all 7 services. Verify it's up:

```bash
curl http://localhost:8080/api/auth/health
```

To rebuild a single service after a code change:

```bash
docker compose build <service-name> && docker compose up -d <service-name>
```

### 3. Frontend

```bash
cd frontend
npm install
npx expo start --web --port 19006
```

Open `http://localhost:19006`. Port 19006 matters — it's the origin allow-listed in the gateway's CORS config (`GATEWAY_CORS_ALLOWED_ORIGINS`).

To run on a phone on the same Wi-Fi network, use `npx expo start` (no `--web`) or use `npx expo start -c` to clean cache and rebuild app on expo then scan the QR code with Expo Go — the app derives the API host from whatever address you loaded it from.

## Database

Schema lives in [`database/init/`](database/init/) as numbered, hand-applied SQL migrations (no migration tool, no rollback — apply them in order against your Postgres instance). `02_dev_seed.sql` seeds sample accounts and is optional/dev-only.

Seeded test accounts (password `password123` for all):

| Email | Role |
|---|---|
| `admin@knust.edu.gh` | admin |
| `ama.boateng@knust.edu.gh` | supervisor |
| `jeremy@knust.edu.gh` | student |
| `arhin@knust.edu.gh` | student |

## Tests

```bash
# one service
mvn -f common-security install -DskipTests
mvn -f <service-name> test

# frontend typecheck
cd frontend && npx tsc --noEmit
```

Each backend service has mocked-repository unit tests plus a Testcontainers-backed integration test (spins up a real disposable Postgres container, applies the real schema, exercises real HTTP endpoints). CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs both on every push/PR to `main_`.

## Project structure

```
auth-service/        group-service/       project-service/
task-service/         judging-service/     showcase-service/
gateway-service/      common-security/     (shared library)
database/init/        (SQL schema, numbered migrations)
frontend/              (Expo app)
```
