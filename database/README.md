# Database

## How this works right now (MVP / Phase 1)

Files in `init/` run automatically, in alphabetical order, the FIRST time the
Postgres container is created (i.e. when the `pgdata` Docker volume is empty).
This is why files are numbered `01_`, `02_`, etc.

**This is NOT a real migration system.** It only runs once. If you change a
`.sql` file after the volume already exists, nothing happens automatically —
Postgres will not re-run it.

## Adding a new table or column after Phase 1

You have two options:

1. **Wipe and recreate (fine during early development, NOT after real data exists):**
   ```
   docker compose down -v   # -v deletes the postgres volume
   docker compose up --build
   ```
   This re-runs every file in `init/` from scratch, including the seed data.

2. **Apply directly without wiping (once you have data worth keeping):**
   ```
   docker exec -i <postgres_container_name> psql -U codequest -d codequesthub < database/init/03_your_new_migration.sql
   ```
   Add the new file to `init/` too, numbered after the existing ones, so a
   fresh teammate who wipes their volume still gets the full schema.

## Folder contents

- `01_init_auth_and_groups.sql` — core schema: users, cohorts, groups, group_members
- `02_dev_seed.sql` — sample data for local dev / demo (group 129, two students, one supervisor)
- `03_init_proposals.sql` — proposals, proposal_versions
- `04_add_group_leader.sql` — adds `groups.group_leader_id`, used by task-service to gate task management to the group leader
- `05_init_tasks.sql` — tasks table + task_status enum
- `06_init_judging.sql` — judging_criteria, judges (per-cohort assignment), scorecards, scorecard_scores

As Showcase service is added, continue adding new numbered
files here rather than editing the existing ones, so the history of schema
changes stays readable.
