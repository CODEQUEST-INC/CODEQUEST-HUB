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

As Phase 2/3 add Project, Task, Judging, and Showcase services, add new
numbered files here (`03_init_proposals.sql`, `04_init_tasks.sql`, etc.)
rather than editing the existing ones, so the history of schema changes stays
readable.
