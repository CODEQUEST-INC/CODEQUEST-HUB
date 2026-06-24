-- Migration 006: Judging — criteria, judge assignments, scorecards
-- CodeQuestHub MVP — Phase 3 (Judging Service)

CREATE TABLE judging_criteria (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cohort_id       UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    name            VARCHAR(150) NOT NULL,
    weight          NUMERIC(5,2) NOT NULL CHECK (weight > 0 AND weight <= 100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_judging_criteria_cohort ON judging_criteria(cohort_id);

CREATE TRIGGER trg_judging_criteria_updated_at
    BEFORE UPDATE ON judging_criteria
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- JUDGES  (per-cohort assignment — independent of user_role)
-- ============================================================
CREATE TABLE judges (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cohort_id       UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (cohort_id, user_id)
);

CREATE INDEX idx_judges_cohort ON judges(cohort_id);

-- ============================================================
-- SCORECARDS  (one per judge per group)
-- ============================================================
CREATE TABLE scorecards (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    judge_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (group_id, judge_id)
);

CREATE INDEX idx_scorecards_group ON scorecards(group_id);
CREATE INDEX idx_scorecards_judge ON scorecards(judge_id);

CREATE TRIGGER trg_scorecards_updated_at
    BEFORE UPDATE ON scorecards
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SCORECARD SCORES  (one row per criterion per scorecard)
-- ============================================================
CREATE TABLE scorecard_scores (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scorecard_id    UUID NOT NULL REFERENCES scorecards(id) ON DELETE CASCADE,
    criterion_id    UUID NOT NULL REFERENCES judging_criteria(id) ON DELETE RESTRICT,
    score           INT NOT NULL CHECK (score >= 1 AND score <= 10),
    UNIQUE (scorecard_id, criterion_id)
);

CREATE INDEX idx_scorecard_scores_scorecard ON scorecard_scores(scorecard_id);
