import { Router } from 'express';
import { requireAuth, requireRole, asyncHandler } from '@codequesthub/shared';
import {
  submitProposal,
  resubmitProposal,
  reviewProposal,
  getMyProposal,
  getProposalHistory,
  getSupervisorProposals,
} from '../controllers/proposal.controller';

const router = Router();

// Static routes first — must come before /:proposalId to avoid param conflicts
router.get('/my', requireAuth, requireRole('student'), asyncHandler(getMyProposal));
router.get('/supervisor', requireAuth, requireRole('supervisor'), asyncHandler(getSupervisorProposals));
router.post('/', requireAuth, requireRole('student'), asyncHandler(submitProposal));

// Parameterized routes
router.patch('/:proposalId/resubmit', requireAuth, requireRole('student'), asyncHandler(resubmitProposal));
router.patch('/:proposalId/review', requireAuth, requireRole('supervisor'), asyncHandler(reviewProposal));
router.get('/:proposalId/history', requireAuth, asyncHandler(getProposalHistory));

export default router;
