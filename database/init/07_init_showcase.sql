-- Migration 007: Showcase — one public entry per group
-- CodeQuestHub MVP — Phase 4 (Showcase Service)

CREATE TABLE showcase_entries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id        UUID NOT NULL UNIQUE REFERENCES groups(id) ON DELETE CASCADE,
    cohort_id       UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT NOT NULL,
    github_url      VARCHAR(500) NOT NULL,
    photo_path      VARCHAR(255),
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_showcase_entries_cohort ON showcase_entries(cohort_id);

CREATE TRIGGER trg_showcase_entries_updated_at
    BEFORE UPDATE ON showcase_entries
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
