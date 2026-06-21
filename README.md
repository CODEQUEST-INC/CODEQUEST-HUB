# CodeQuestHub

The official all-in-one mobile platform for CodeQuest — KNUST Dept. of Computer Science, Group 129.

This repo is scoped to a 4-week MVP build (see `docs/` for the full checklist and roadmap). Phase 1 covers Auth Service and Group Service, which is what's implemented so far.

## Quick start (Docker — recommended)

Requires Docker and Docker Compose installed.

```bash
cp .env.example .env
# edit .env if you want a non-default JWT_SECRET

docker compose up --build
```

This starts Postgres (seeded with sample data — see `database/README.md`), `auth-service` on port 4001, and `group-service` on port 4002.

Health checks:
```bash
curl http://localhost:4001/health
curl http://localhost:4002/health
```

Try logging in with seeded data (password is `password123` for all seed users):
```bash
curl -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jeremy@knust.edu.gh","password":"password123"}'
```

## Running a single service locally without Docker (faster iteration while coding)

```bash
docker compose up postgres -d     # just the database
npm install                        # from repo root — installs all workspaces
npm run build:shared               # shared package must be built first
npm run dev:auth                   # or dev:group
```

Each service needs its own `.env` if run this way — see `services/<service-name>/package.json` for the expected `PORT`, and use the `DATABASE_URL` from the root `.env.example`.

## Repository structure

```
codequesthub/
├── gateway/              # Spring Boot API Gateway (Phase 1, not yet built)
├── services/
│   ├── shared/            # shared types, DB pool, JWT middleware — used by every service
│   ├── auth-service/      # registration, login, JWT issuance, roles
│   ├── group-service/     # cohorts, groups, workspace, student allocation
│   ├── project-service/   # Phase 2 — proposals
│   ├── task-service/      # Phase 3 — Kanban board
│   ├── judging-service/   # Phase 3 — scorecards, leaderboard
│   └── showcase-service/  # Phase 4 — group showcase pages
├── mobile/                # Expo + TypeScript app
├── database/              # SQL init scripts (see database/README.md)
└── docs/                  # architecture notes, API contracts, demo script
```

## Tech stack

Express + TypeScript for each microservice, PostgreSQL for storage, JWT for auth, Expo (React Native + TypeScript) for the mobile app, npm workspaces to tie the monorepo together, Docker Compose for local orchestration.

## Team

Arhin Prince Owusu · Amadu Abdul-Haqq Bonsabo · Abubakar Ali · Jeremy Sefa Brobbey · Agbongua Stephen Tetteh
