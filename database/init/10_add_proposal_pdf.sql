-- Migration 010: Required PDF attachment on proposal submission
-- CodeQuestHub — Phase 3 known-debt item
--
-- Nullable rather than NOT NULL — existing rows predate this feature and
-- have no PDF on file. "Required" is enforced in the service layer for new
-- submit/resubmit calls, not by a DB constraint, so old data doesn't need a
-- backfill to keep passing schema validation.
--
-- Versioned the same way title/objectives/etc already are, so history shows
-- which PDF was attached to each version.

ALTER TABLE proposals ADD COLUMN pdf_path VARCHAR(255);
ALTER TABLE proposal_versions ADD COLUMN pdf_path VARCHAR(255);
