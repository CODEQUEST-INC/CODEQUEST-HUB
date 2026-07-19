-- Migration 009: Group profile picture
-- CodeQuestHub — Phase 3 known-debt item
--
-- Lets any group member upload/change a photo for their group, mirroring the
-- same upload-to-disk + stored-filename pattern showcase_entries.photo_path
-- already uses.

ALTER TABLE groups ADD COLUMN photo_path VARCHAR(255);
