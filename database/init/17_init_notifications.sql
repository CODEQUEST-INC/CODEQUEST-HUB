-- Migration 017: Notifications
-- CodeQuestHub — in-app notifications, owned by auth-service (lives alongside
-- users) but written cross-service (e.g. payment-service creates payment
-- reminders) via the shared-DB read/write View pattern used elsewhere.

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    link VARCHAR(500),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
