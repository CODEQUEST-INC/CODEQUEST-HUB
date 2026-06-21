import { Request, Response } from 'express';
import { z } from 'zod';
import { pool, query, queryOne } from '@codequesthub/shared';

// ============================================================
// Validation schemas
// ============================================================
const createCriteriaSchema = z.object({
  cohortId: z.string().uuid(),
  name: z.string().min(2).max(100),
  weight: z.number().gt(0).max(1),
  maxScore: z.number().positive(),
});

const submitScorecardSchema = z.object({
  groupId: z.string().uuid(),
  criteriaId: z.string().uuid(),
  score: z.number().min(0),
});

// ============================================================
// POST /api/judging/criteria  — admin configures criteria before event day
// ============================================================
export async function createCriteria(req: Request, res: Response) {
  const parsed = createCriteriaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', message: 'Invalid input', details: parsed.error.flatten() });
  }

  const { cohortId, name, weight, maxScore } = parsed.data;

  const criteria = await queryOne(
    `INSERT INTO judging_criteria (cohort_id, name, weight, max_score)
     VALUES ($1, $2, $3, $4)
     RETURNING id, cohort_id AS "cohortId", name, weight, max_score AS "maxScore", created_at AS "createdAt"`,
    [cohortId, name, weight, maxScore]
  );

  return res.status(201).json({ data: criteria });
}

// ============================================================
// POST /api/judging/scorecards  — judge submits a score per group + criterion
// Upserts on (group_id, judge_id, criteria_id) so a resubmission updates.
// ============================================================
export async function submitScorecard(req: Request, res: Response) {
  const parsed = submitScorecardSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', message: 'Invalid input', details: parsed.error.flatten() });
  }

  const judgeId = req.user!.id;
  const { groupId, criteriaId, score } = parsed.data;

  // Look up the criterion to validate the score ceiling.
  const criteria = await queryOne<{ id: string; maxScore: string }>(
    `SELECT id, max_score AS "maxScore" FROM judging_criteria WHERE id = $1`,
    [criteriaId]
  );

  if (!criteria) {
    return res.status(404).json({ error: 'not_found', message: 'Judging criteria not found' });
  }

  const maxScore = Number(criteria.maxScore);
  if (score > maxScore) {
    return res.status(400).json({
      error: 'validation_error',
      message: `Score must not exceed the criterion's maximum of ${maxScore}`,
    });
  }

  // UPSERT: a judge resubmitting for the same group + criterion updates the score.
  const scorecard = await queryOne(
    `INSERT INTO scorecards (group_id, judge_id, criteria_id, score)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (group_id, judge_id, criteria_id)
     DO UPDATE SET score = EXCLUDED.score
     RETURNING id, group_id AS "groupId", judge_id AS "judgeId", criteria_id AS "criteriaId",
               score, created_at AS "createdAt", updated_at AS "updatedAt"`,
    [groupId, judgeId, criteriaId, score]
  );

  return res.status(201).json({ data: scorecard });
}

// ============================================================
// GET /api/judging/leaderboard  — weighted-sum ranking across groups
// Per group: average each criterion's score across judges, then sum
// (avg_score * criterion.weight) over all criteria. Ordered desc.
// ============================================================
export async function getLeaderboard(_req: Request, res: Response) {
  const leaderboard = await query<{
    groupId: string;
    groupName: string | null;
    groupNumber: number;
    totalScore: number;
  }>(
    `SELECT g.id AS "groupId",
            g.name AS "groupName",
            g.group_number AS "groupNumber",
            COALESCE(SUM(agg.avg_score * jc.weight), 0)::float AS "totalScore"
     FROM groups g
     LEFT JOIN (
       SELECT group_id, criteria_id, AVG(score) AS avg_score
       FROM scorecards
       GROUP BY group_id, criteria_id
     ) agg ON agg.group_id = g.id
     LEFT JOIN judging_criteria jc ON jc.id = agg.criteria_id
     GROUP BY g.id, g.name, g.group_number
     ORDER BY "totalScore" DESC`
  );

  return res.json({ data: leaderboard });
}
