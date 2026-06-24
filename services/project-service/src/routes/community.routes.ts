import { Router } from 'express';
import { requireAuth, asyncHandler } from '@codequesthub/shared';
import { getCommunityPosts, createPost, deletePost } from '../controllers/community.controller';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(getCommunityPosts));
router.post('/', asyncHandler(createPost));
router.delete('/:postId', asyncHandler(deletePost));

export default router;
