import { Router } from 'express';
import { requireAuth, requireRole, asyncHandler } from '@codequesthub/shared';
import {
  getGroupTasks,
  createTask,
  updateTask,
  deleteTask,
  getTaskAnalytics
} from '../controllers/task.controller';

const router = Router();

// Only students in a group manage tasks for now
router.use(requireAuth, requireRole('student'));

router.get('/', asyncHandler(getGroupTasks));
router.post('/', asyncHandler(createTask));
router.get('/analytics', asyncHandler(getTaskAnalytics));

router.patch('/:taskId', asyncHandler(updateTask));
router.delete('/:taskId', asyncHandler(deleteTask));

export default router;
