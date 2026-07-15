"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCriteria = createCriteria;
exports.getCriteria = getCriteria;
exports.submitScorecard = submitScorecard;
exports.getLeaderboard = getLeaderboard;
const zod_1 = require("zod");
const shared_1 = require("@codequesthub/shared");
// ============================================================
// Validation schemas
// ============================================================
const createCriteriaSchema = zod_1.z.object({
    cohortId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(2).max(100),
    weight: zod_1.z.number().gt(0).max(1),
    maxScore: zod_1.z.number().positive(),
});
const submitScorecardSchema = zod_1.z.object({
    groupId: zod_1.z.string().uuid(),
    criteriaId: zod_1.z.string().uuid(),
    score: zod_1.z.number().min(0),
});
// ============================================================
// POST /api/judging/criteria  — admin configures criteria before event day
// ============================================================
async function createCriteria(req, res) {
    const parsed = createCriteriaSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'validation_error', message: 'Invalid input', details: parsed.error.flatten() });
    }
    const { cohortId, name, weight, maxScore } = parsed.data;
    const criteria = await (0, shared_1.queryOne)(`INSERT INTO judging_criteria (cohort_id, name, weight, max_score)
     VALUES ($1, $2, $3, $4)
     RETURNING id, cohort_id AS "cohortId", name, weight, max_score AS "maxScore", created_at AS "createdAt"`, [cohortId, name, weight, maxScore]);
    return res.status(201).json({ data: criteria });
}
// ============================================================
// GET /api/judging/criteria  — list all criteria, optionally by cohort
// ============================================================
async function getCriteria(req, res) {
    const { cohortId } = req.query;
    // cohortId is an optional filter — validate it only when provided.
    if (cohortId !== undefined && !zod_1.z.string().uuid().safeParse(cohortId).success) {
        return res.status(400).json({ error: 'validation_error', message: 'cohortId must be a valid UUID' });
    }
    const baseSelect = `SELECT id, cohort_id AS "cohortId", name, weight, max_score AS "maxScore", created_at AS "createdAt"
     FROM judging_criteria`;
    const criteria = cohortId
        ? await (0, shared_1.query)(`${baseSelect} WHERE cohort_id = $1 ORDER BY created_at ASC`, [cohortId])
        : await (0, shared_1.query)(`${baseSelect} ORDER BY created_at ASC`);
    return res.json({ data: criteria });
}
// ============================================================
// POST /api/judging/scorecards  — judge submits a score per group + criterion
// Upserts on (group_id, judge_id, criteria_id) so a resubmission updates.
// ============================================================
async function submitScorecard(req, res) {
    const parsed = submitScorecardSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'validation_error', message: 'Invalid input', details: parsed.error.flatten() });
    }
    const judgeId = req.user.id;
    const { groupId, criteriaId, score } = parsed.data;
    // Look up the criterion to validate the score ceiling.
    const criteria = await (0, shared_1.queryOne)(`SELECT id, max_score AS "maxScore" FROM judging_criteria WHERE id = $1`, [criteriaId]);
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
    const scorecard = await (0, shared_1.queryOne)(`INSERT INTO scorecards (group_id, judge_id, criteria_id, score)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (group_id, judge_id, criteria_id)
     DO UPDATE SET score = EXCLUDED.score
     RETURNING id, group_id AS "groupId", judge_id AS "judgeId", criteria_id AS "criteriaId",
               score, created_at AS "createdAt", updated_at AS "updatedAt"`, [groupId, judgeId, criteriaId, score]);
    return res.status(201).json({ data: scorecard });
}
// ============================================================
// GET /api/judging/leaderboard  — weighted-sum ranking across groups
// Per group: average each criterion's score across judges, then sum
// (avg_score * criterion.weight) over all criteria. Ordered desc.
// ============================================================
async function getLeaderboard(_req, res) {
    const leaderboard = await (0, shared_1.query)(`SELECT g.id AS "groupId",
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
     ORDER BY "totalScore" DESC`);
    return res.json({ data: leaderboard });
}
