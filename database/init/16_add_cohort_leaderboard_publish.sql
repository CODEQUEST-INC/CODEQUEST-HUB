-- Migration 016: Leaderboard publish state
-- CodeQuestHub — results are computed live from submitted scorecards at all
-- times, but non-admin viewers (students, supervisors) should only see them
-- once an admin explicitly publishes. NULL = not published yet.

ALTER TABLE cohorts ADD COLUMN leaderboard_published_at TIMESTAMPTZ;
