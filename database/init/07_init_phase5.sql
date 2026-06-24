-- Migration 007: Phase 5 - Profiles, Monetization, Split Payments
-- CodeQuestHub MVP

-- 1. Add new roles
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'alumni';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'senior';

-- 2. Add Profile columns to Users
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(1024);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS mentorship_status BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subaccount_id VARCHAR(255); -- Paystack subaccount for split payments

-- 3. Monetization columns for Resources and Posts
ALTER TABLE resources ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2);

ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_promoted BOOLEAN NOT NULL DEFAULT false;

-- 4. Transactions Log
CREATE TABLE IF NOT EXISTS transactions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id        UUID NOT NULL REFERENCES users(id),
    seller_id       UUID REFERENCES users(id), -- Null if platform payment (e.g. Promoted Post)
    resource_id     UUID REFERENCES resources(id),
    post_id         UUID REFERENCES community_posts(id),
    amount          DECIMAL(10, 2) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'GHS',
    status          VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, success, failed
    reference       VARCHAR(255) UNIQUE NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
