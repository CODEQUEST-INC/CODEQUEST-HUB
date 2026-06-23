-- Migration 003: Proposals and versioned submission history
-- CodeQuestHub MVP — Phase 2 (Project Service)

CREATE TYPE proposal_status AS ENUM (
    'draft',
    'submitted',
    'under_review',
    'approved',
    'rejected',
    'changes_requested'
);

-- ============================================================
-- PROPOSALS  (one per group — the "current state")
-- ============================================================
CREATE TABLE proposals (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id        UUID NOT NULL UNIQUE REFERENCES groups(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    problem_statement TEXT NOT NULL,
    objectives      TEXT NOT NULL,
    tech_stack      TEXT NOT NULL,
    status          proposal_status NOT NULL DEFAULT 'draft',
    current_version INT NOT NULL DEFAULT 1,
    submitted_by    UUID NOT NULL REFERENCES users(id),
    reviewed_by     UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposals_group ON proposals(group_id);
CREATE INDEX idx_proposals_status ON proposals(status);

-- ============================================================
-- PROPOSAL VERSIONS  (immutable history — every submission/review)
-- ============================================================
CREATE TABLE proposal_versions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id     UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    version_number  INT NOT NULL,

    -- Snapshot of the proposal content at this version
    title           VARCHAR(255) NOT NULL,
    problem_statement TEXT NOT NULL,
    objectives      TEXT NOT NULL,
    tech_stack      TEXT NOT NULL,

    -- Who did what and when
    action          VARCHAR(50) NOT NULL,   -- 'submitted', 'approved', 'rejected', 'changes_requested'
    actor_id        UUID NOT NULL REFERENCES users(id),
    feedback        TEXT,                   -- supervisor's written feedback (required on reject/changes)

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (proposal_id, version_number)
);

CREATE INDEX idx_proposal_versions_proposal ON proposal_versions(proposal_id);

-- ============================================================
-- updated_at trigger for proposals
-- ============================================================
CREATE TRIGGER trg_proposals_updated_at
    BEFORE UPDATE ON proposals
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
