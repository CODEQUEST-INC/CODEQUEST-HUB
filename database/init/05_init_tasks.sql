-- Migration 005: Tasks
-- CodeQuestHub MVP — Phase 3 (Task Service)

CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');

CREATE TABLE tasks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    proposal_id     UUID REFERENCES proposals(id) ON DELETE SET NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    status          task_status NOT NULL DEFAULT 'todo',
    assignee_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by      UUID NOT NULL REFERENCES users(id),
    due_date        DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_group ON tasks(group_id);
CREATE INDEX idx_tasks_proposal ON tasks(proposal_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);

CREATE TRIGGER trg_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
