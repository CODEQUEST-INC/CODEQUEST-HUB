-- Migration 006: Community and Resources
-- CodeQuestHub MVP — Phase 4

CREATE TYPE post_category AS ENUM (
    'discussion',
    'tutorial',
    'help',
    'announcement'
);

CREATE TYPE resource_type AS ENUM (
    'hall_of_fame',
    'material'
);

-- ============================================================
-- COMMUNITY POSTS
-- ============================================================
CREATE TABLE community_posts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    content         TEXT NOT NULL,
    category        post_category NOT NULL DEFAULT 'discussion',
    link_url        VARCHAR(1024),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_community_posts_category ON community_posts(category);
CREATE INDEX idx_community_posts_created_at ON community_posts(created_at DESC);

-- ============================================================
-- RESOURCES & HALL OF FAME
-- ============================================================
CREATE TABLE resources (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(255) NOT NULL,
    description     TEXT NOT NULL,
    resource_type   resource_type NOT NULL,
    link_url        VARCHAR(1024),
    thumbnail_url   VARCHAR(1024),
    cohort_id       UUID REFERENCES cohorts(id) ON DELETE SET NULL,
    uploaded_by     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_resources_type ON resources(resource_type);
CREATE INDEX idx_resources_created_at ON resources(created_at DESC);

-- ============================================================
-- Triggers for updated_at
-- ============================================================
CREATE TRIGGER trg_community_posts_updated_at
    BEFORE UPDATE ON community_posts
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_resources_updated_at
    BEFORE UPDATE ON resources
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
