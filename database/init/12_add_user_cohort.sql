-- Migration 012: Tag students with a cohort at registration time, so
-- automated grouping can pull "everyone in cohort X" before any of them
-- have been placed in a group yet.
ALTER TABLE users ADD COLUMN cohort_id UUID REFERENCES cohorts(id);

CREATE INDEX idx_users_cohort ON users(cohort_id);
