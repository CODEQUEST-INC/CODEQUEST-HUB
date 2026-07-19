-- Migration 011: Multiple showcase screenshots per group
-- CodeQuestHub — Phase 3 known-debt item
--
-- Replaces showcase_entries.photo_path (one photo) with a proper one-to-many
-- gallery table. Existing single photos are carried forward as the first
-- gallery photo so nothing already uploaded (e.g. Group 129's real entry)
-- disappears.

CREATE TABLE showcase_photos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_id        UUID NOT NULL REFERENCES showcase_entries(id) ON DELETE CASCADE,
    photo_path      VARCHAR(255) NOT NULL,
    position        INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_showcase_photos_entry_id ON showcase_photos(entry_id);

INSERT INTO showcase_photos (entry_id, photo_path, position, created_at)
SELECT id, photo_path, 0, updated_at FROM showcase_entries WHERE photo_path IS NOT NULL;

ALTER TABLE showcase_entries DROP COLUMN photo_path;
