import { Router } from 'express';
import { requireAuth, requireRole, asyncHandler } from '@codequesthub/shared';
import { createCriteria, getCriteria, submitScorecard, getLeaderboard } from '../controllers/judging.controller';

const router = Router();

router.post('/criteria', requireAuth, requireRole('admin'), asyncHandler(createCriteria));
router.get('/criteria', requireAuth, asyncHandler(getCriteria));
router.post('/scorecards', requireAuth, requireRole('supervisor'), asyncHandler(submitScorecard));
router.get('/leaderboard', requireAuth, asyncHandler(getLeaderboard));

export default router;