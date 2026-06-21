-- Migration 001: Core auth and group tables
-- CodeQuestHub MVP — Phase 1 (Auth Service + Group Service)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ROLES
-- ============================================================
CREATE TYPE user_role AS ENUM ('student', 'supervisor', 'admin', 'mentor');

-- ============================================================
-- USERS  (Auth Service owns this table)
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name       VARCHAR(150) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            user_role NOT NULL DEFAULT 'student',
    student_id      VARCHAR(50),
    index_number    VARCHAR(50),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================
-- COHORTS  (a single CodeQuest edition / academic year)
-- ============================================================
CREATE TABLE cohorts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL,        -- e.g. "CodeQuest 2026"
    year            INT NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- GROUPS  (Group Service owns this table)
-- ============================================================
CREATE TABLE groups (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cohort_id       UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    group_number    INT NOT NULL,
    name            VARCHAR(150),
    supervisor_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (cohort_id, group_number)
);

CREATE INDEX idx_groups_cohort ON groups(cohort_id);
CREATE INDEX idx_groups_supervisor ON groups(supervisor_id);

-- ============================================================
-- GROUP MEMBERS  (join table: students <-> groups)
-- ============================================================
CREATE TABLE group_members (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (group_id, user_id)
);

CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);

-- ============================================================
-- updated_at trigger helper (reused by future migrations)
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
