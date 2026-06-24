import { Request, Response } from 'express';
import { z } from 'zod';
import { pool, query, queryOne, Task, TaskStatus, TaskAnalytics, MemberContribution } from '@codequesthub/shared';

// ============================================================
// Validation schemas
// ============================================================
const createTaskSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().min(5),
  assigneeId: z.string().uuid().optional().nullable(),
});

const updateTaskSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().min(5).optional(),
  status: z.enum(['todo', 'in_progress', 'in_review', 'done']).optional(),
  assigneeId: z.string().uuid().optional().nullable(),
});

// Helper: Get user's group
async function getUserGroup(userId: string): Promise<{ id: string } | null> {
  return queryOne<{ id: string }>(
    `SELECT group_id AS "id" FROM group_members WHERE user_id = $1`,
    [userId]
  );
}

// ============================================================
// GET /api/tasks   — fetch all tasks for the user's group
// ============================================================
export async function getGroupTasks(req: Request, res: Response) {
  const userId = req.user!.id;
  const group = await getUserGroup(userId);
  
  if (!group) {
    return res.status(404).json({ error: 'not_found', message: 'You are not assigned to a group' });
  }

  const tasks = await query<Task>(
    `SELECT id, group_id AS "groupId", title, description, status, assignee_id AS "assigneeId", created_by AS "createdBy", created_at AS "createdAt", updated_at AS "updatedAt"
     FROM tasks WHERE group_id = $1 ORDER BY created_at DESC`,
    [group.id]
  );

  return res.json({ data: tasks });
}

// ============================================================
// POST /api/tasks  — create a new task
// ============================================================
export async function createTask(req: Request, res: Response) {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'validation_error', message: 'Invalid input', details: parsed.error.flatten() });

  const userId = req.user!.id;
  const group = await getUserGroup(userId);
  
  if (!group) {
    return res.status(404).json({ error: 'not_found', message: 'You are not assigned to a group' });
  }

  const { title, description, assigneeId } = parsed.data;

  // If assigneeId is provided, verify they are in the group
  if (assigneeId) {
    const checkAssignee = await queryOne(`SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2`, [group.id, assigneeId]);
    if (!checkAssignee) {
      return res.status(400).json({ error: 'bad_request', message: 'Assignee is not a member of your group' });
    }
  }

  const newTask = await queryOne<Task>(
    `INSERT INTO tasks (group_id, title, description, status, assignee_id, created_by)
     VALUES ($1, $2, $3, 'todo', $4, $5)
     RETURNING id, group_id AS "groupId", title, description, status, assignee_id AS "assigneeId", created_by AS "createdBy", created_at AS "createdAt", updated_at AS "updatedAt"`,
    [group.id, title, description, assigneeId || null, userId]
  );

  return res.status(201).json({ data: newTask });
}

// ============================================================
// PATCH /api/tasks/:taskId  — update task
// ============================================================
export async function updateTask(req: Request, res: Response) {
  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'validation_error', message: 'Invalid input', details: parsed.error.flatten() });

  const userId = req.user!.id;
  const { taskId } = req.params;
  const group = await getUserGroup(userId);
  if (!group) return res.status(404).json({ error: 'not_found', message: 'You are not assigned to a group' });

  const task = await queryOne<{ id: string; groupId: string }>(`SELECT id, group_id AS "groupId" FROM tasks WHERE id = $1`, [taskId]);
  if (!task) return res.status(404).json({ error: 'not_found', message: 'Task not found' });
  if (task.groupId !== group.id) return res.status(403).json({ error: 'forbidden', message: 'You cannot edit tasks outside your group' });

  const updates: string[] = [];
  const values: any[] = [];
  let paramIdx = 1;

  if (parsed.data.title !== undefined) {
    updates.push(`title = $${paramIdx++}`);
    values.push(parsed.data.title);
  }
  if (parsed.data.description !== undefined) {
    updates.push(`description = $${paramIdx++}`);
    values.push(parsed.data.description);
  }
  if (parsed.data.status !== undefined) {
    updates.push(`status = $${paramIdx++}`);
    values.push(parsed.data.status);
  }
  if (parsed.data.assigneeId !== undefined) {
    updates.push(`assignee_id = $${paramIdx++}`);
    values.push(parsed.data.assigneeId);
  }

  if (updates.length === 0) return res.json({ data: null, message: 'No updates provided' });

  values.push(taskId);
  
  const updatedTask = await queryOne<Task>(
    `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramIdx}
     RETURNING id, group_id AS "groupId", title, description, status, assignee_id AS "assigneeId", created_by AS "createdBy", created_at AS "createdAt", updated_at AS "updatedAt"`,
    values
  );

  return res.json({ data: updatedTask });
}

// ============================================================
// DELETE /api/tasks/:taskId  — delete task
// ============================================================
export async function deleteTask(req: Request, res: Response) {
  const userId = req.user!.id;
  const { taskId } = req.params;
  const group = await getUserGroup(userId);
  if (!group) return res.status(404).json({ error: 'not_found', message: 'You are not assigned to a group' });

  const task = await queryOne<{ id: string; groupId: string }>(`SELECT id, group_id AS "groupId" FROM tasks WHERE id = $1`, [taskId]);
  if (!task) return res.status(404).json({ error: 'not_found', message: 'Task not found' });
  if (task.groupId !== group.id) return res.status(403).json({ error: 'forbidden', message: 'You cannot delete tasks outside your group' });

  await queryOne(`DELETE FROM tasks WHERE id = $1`, [taskId]);
  return res.json({ message: 'Task deleted successfully' });
}

// ============================================================
// GET /api/tasks/analytics  — progress & leaderboard
// ============================================================
export async function getTaskAnalytics(req: Request, res: Response) {
  const userId = req.user!.id;
  const group = await getUserGroup(userId);
  if (!group) return res.status(404).json({ error: 'not_found', message: 'You are not assigned to a group' });

  const tasks = await query<{ status: string; assigneeId: string | null }>(
    `SELECT status, assignee_id AS "assigneeId" FROM tasks WHERE group_id = $1`,
    [group.id]
  );

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const progressPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  // Calculate member contributions
  const contributionMap: Record<string, number> = {};
  tasks.forEach(task => {
    if (task.status === 'done' && task.assigneeId) {
      contributionMap[task.assigneeId] = (contributionMap[task.assigneeId] || 0) + 1;
    }
  });

  const memberContributions: MemberContribution[] = [];
  
  if (Object.keys(contributionMap).length > 0) {
    const members = await query<{ id: string; fullName: string }>(
      `SELECT id, full_name AS "fullName" FROM users WHERE id = ANY($1)`,
      [Object.keys(contributionMap)]
    );

    members.forEach(member => {
      memberContributions.push({
        userId: member.id,
        fullName: member.fullName,
        tasksCompleted: contributionMap[member.id] || 0
      });
    });
  }

  // Sort leaderboard descending
  memberContributions.sort((a, b) => b.tasksCompleted - a.tasksCompleted);

  const analytics: TaskAnalytics = {
    totalTasks,
    completedTasks,
    progressPercentage,
    memberContributions
  };

  return res.json({ data: analytics });
}
