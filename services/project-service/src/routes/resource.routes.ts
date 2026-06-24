import { Router } from 'express';
import { requireAuth, asyncHandler } from '@codequesthub/shared';
import { getResources, createResource, deleteResource } from '../controllers/resource.controller';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(getResources));
router.post('/', asyncHandler(createResource));
router.delete('/:resourceId', asyncHandler(deleteResource));

export default router;
