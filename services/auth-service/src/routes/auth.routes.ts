import { Router } from 'express';
import { register, login, me, updateProfile } from '../controllers/auth.controller';
import { requireAuth, asyncHandler } from '@codequesthub/shared';

const router = Router();

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.get('/me', requireAuth, asyncHandler(me));
router.patch('/profile', requireAuth, asyncHandler(updateProfile));

export default router;
