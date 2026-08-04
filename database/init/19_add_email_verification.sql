-- Migration 019: Email verification on registration
-- Unlike password reset, verification is checked against the logged-in user
-- (JWT-authenticated), not looked up by token — no index needed here.
ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN verification_token VARCHAR(64);
ALTER TABLE users ADD COLUMN verification_token_expires_at TIMESTAMPTZ;
