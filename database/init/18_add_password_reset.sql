-- Migration 018: Password reset
-- CodeQuestHub — supports the forgot-password flow: a random token + expiry
-- stored on the user, cleared once used (or once a new one is issued).

ALTER TABLE users ADD COLUMN reset_token VARCHAR(64);
ALTER TABLE users ADD COLUMN reset_token_expires_at TIMESTAMPTZ;

CREATE INDEX idx_users_reset_token ON users(reset_token);
