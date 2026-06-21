-- Migration 004: Judging criteria and scorecards
-- CodeQuestHub MVP — Phase 3 (Judging Service)

-- ============================================================
-- JUDGING CRITERIA  (configured by admin before event day)
-- ============================================================
CREATE TABLE judging_criteria (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cohort_id       UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    weight          NUMERIC(4,3) NOT NULL CHECK (weight > 0 AND weight <= 1),
    max_score       NUMERIC(5,2) NOT NULL DEFAULT 10,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_judging_criteria_cohort ON judging_criteria(cohort_id);

-- ============================================================
-- SCORECARDS  (one row per judge x group x criterion)
-- ============================================================
CREATE TABLE scorecards (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    judge_id        UUID NOT NULL REFERENCES users(id),
    criteria_id     UUID NOT NULL REFERENCES judging_criteria(id) ON DELETE CASCADE,
    score           NUMERIC(5,2) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (group_id, judge_id, criteria_id)
);

CREATE INDEX idx_scorecards_group ON scorecards(group_id);
CREATE INDEX idx_scorecards_judge ON scorecards(judge_id);

-- ============================================================
-- updated_at trigger for scorecards
-- ============================================================
CREATE TRIGGER trg_scorecards_updated_at
    BEFORE UPDATE ON scorecards
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();