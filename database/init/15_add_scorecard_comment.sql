-- Migration 015: Scorecard comment
-- CodeQuestHub — lets a judge leave an optional note alongside their scores,
-- shared with the team after results are published.

ALTER TABLE scorecards ADD COLUMN comment TEXT;
