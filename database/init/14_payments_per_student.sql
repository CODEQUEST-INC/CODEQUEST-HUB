-- Migration 014: Per-student payments
-- CodeQuestHub — each student now pays their own flat fee individually instead
-- of one member paying a group-total on everyone's behalf.

ALTER TABLE payment_records ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);

CREATE INDEX idx_payment_records_group_user ON payment_records(group_id, user_id);
