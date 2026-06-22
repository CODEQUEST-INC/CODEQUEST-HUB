import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth, requireRole, asyncHandler } from '@codequesthub/shared';
import {
  submitProposal,
  resubmitProposal,
  reviewProposal,
  getMyProposal,
  getProposalHistory,
  getSupervisorProposals,
  forwardToAdmin,
  adminReviewProposal,
  getAdminForwardedProposals
} from '../controllers/proposal.controller';

const uploadDir = path.join(__dirname, '../../uploads/proposals');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});
const upload = multer({ storage });

const router = Router();

// Static routes first — must come before /:proposalId to avoid param conflicts
router.get('/my', requireAuth, requireRole('student'), asyncHandler(getMyProposal));
router.get('/supervisor', requireAuth, requireRole('supervisor'), asyncHandler(getSupervisorProposals));
router.get('/admin/forwarded', requireAuth, requireRole('admin'), asyncHandler(getAdminForwardedProposals));
router.post('/', requireAuth, requireRole('student'), upload.single('file'), asyncHandler(submitProposal));

// Parameterized routes
router.patch('/:proposalId/resubmit', requireAuth, requireRole('student'), upload.single('file'), asyncHandler(resubmitProposal));
router.patch('/:proposalId/review', requireAuth, requireRole('supervisor'), asyncHandler(reviewProposal));
router.patch('/:proposalId/forward', requireAuth, requireRole('supervisor'), asyncHandler(forwardToAdmin));
router.patch('/:proposalId/admin-review', requireAuth, requireRole('admin'), asyncHandler(adminReviewProposal));
router.get('/:proposalId/history', requireAuth, asyncHandler(getProposalHistory));

export default router;
