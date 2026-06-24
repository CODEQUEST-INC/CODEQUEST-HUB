# Database

## How this actually works

There is no Postgres service in `docker-compose.yml` — every environment
(local dev and whatever this deploys to) points at the same remote Neon
Postgres instance, configured via `DB_URL`/`DB_USERNAME`/`DB_PASSWORD` in
`.env`. There is no `docker-entrypoint-initdb.d` auto-run mechanism in play;
that pattern only applies to a local Postgres *container*, which this project
doesn't run.

**Files in `init/` are the canonical, numbered history of the schema — not an
auto-run mechanism.** Every file in this directory has been applied to Neon
by hand, once, in order. `spring.jpa.hibernate.ddl-auto=validate` in every
service means Hibernate checks the live schema matches its entities at
startup but never creates or alters anything — so if a migration hasn't been
applied to Neon yet, every service touching those tables will fail to start
with a schema validation error.

## Applying a new migration

1. Write the new file, numbered after the existing ones (e.g. `08_your_change.sql`).
2. Apply it directly to Neon — either with `psql` against the connection
   string in `.env`, or with any Postgres client / script (`pg8000`, a DB GUI,
   etc.) pointed at the same host/database/credentials.
3. Commit the file. There's no rollback tooling — if a migration is wrong,
   write a new numbered file to correct it rather than editing history.

There is currently no scripted/repeatable way to apply migrations (no
Flyway/Liquibase, no CI step) — every migration in this project so far has
been applied as a one-off manual step against the live Neon database.

## Folder contents

- `01_init_auth_and_groups.sql` — core schema: users, cohorts, groups, group_members
- `02_dev_seed.sql` — sample data for local dev / demo (group 129, two students, one supervisor)
- `03_init_proposals.sql` — proposals, proposal_versions
- `04_add_group_leader.sql` — adds `groups.group_leader_id`, used by task-service to gate task management to the group leader
- `05_init_tasks.sql` — tasks table + task_status enum
- `06_init_judging.sql` — judging_criteria, judges (per-cohort assignment), scorecards, scorecard_scores
- `07_init_showcase.sql` — showcase_entries (one public entry per group, gated on proposal approval)
- `08_add_criterion_active_flag.sql` — adds `judging_criteria.is_active`, so a criterion can be retired for future cohorts without deleting one already referenced by historical scores

Continue adding new numbered files here rather than editing the existing
ones, so the history of schema changes stays readable.
