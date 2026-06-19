import { Router } from 'express';
import { requireAuth, requireRole, asyncHandler } from '@codequesthub/shared';
import { createGroup, assignMembers, getMyGroup, getGroupById } from '../controllers/group.controller';

const router = Router();

// Order matters: '/me' must be registered before '/:groupId' or Express
// will try to treat "me" as a groupId param.
router.get('/me', requireAuth, asyncHandler(getMyGroup));

router.post('/', requireAuth, requireRole('admin'), asyncHandler(createGroup));
router.post('/:groupId/members', requireAuth, requireRole('admin'), asyncHandler(assignMembers));
router.get('/:groupId', requireAuth, requireRole('admin', 'supervisor'), asyncHandler(getGroupById));

export default router;
