-- Migration 004: Group leader designation
-- CodeQuestHub MVP — Phase 3 (Task Service)

ALTER TABLE groups ADD COLUMN group_leader_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_groups_leader ON groups(group_leader_id);
