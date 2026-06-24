-- Migration 008: Allow retiring a judging criterion without deleting it
-- CodeQuestHub MVP — Phase 3 (Judging Service)
--
-- judging_criteria can't be deleted once scorecard_scores reference them
-- (ON DELETE RESTRICT), which protects historical leaderboard data but left
-- no way to stop using a criterion for future cohorts. is_active lets a
-- criterion be retired (excluded from new scorecards) while its historical
-- scores keep counting toward whatever leaderboard totals already used them.

ALTER TABLE judging_criteria ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
