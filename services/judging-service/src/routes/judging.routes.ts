import { Router } from 'express';
import { requireAuth, requireRole, asyncHandler } from '@codequesthub/shared';
import { createCriteria, submitScorecard, getLeaderboard } from '../controllers/judging.controller';

const router = Router();

router.post('/criteria', requireAuth, requireRole('admin'), asyncHandler(createCriteria));
router.post('/scorecards', requireAuth, requireRole('mentor'), asyncHandler(submitScorecard));
router.get('/leaderboard', requireAuth, asyncHandler(getLeaderboard));

export default router;