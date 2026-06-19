import { Request, Response } from 'express';
import { z } from 'zod';
import { query, queryOne, Group, GroupMember } from '@codequesthub/shared';

// ============================================================
// Validation schemas
// ============================================================
const createGroupSchema = z.object({
  cohortId: z.string().uuid(),
  groupNumber: z.number().int().positive(),
  name: z.string().max(150).optional(),
  supervisorId: z.string().uuid().optional(),
});

const assignMembersSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, 'Provide at least one user ID'),
});

// ============================================================
// POST /api/groups   (admin only — enforced by requireRole in routes)
// ============================================================
export async function createGroup(req: Request, res: Response) {
  const parsed = createGroupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', message: 'Invalid input', details: parsed.error.flatten() });
  }

  const { cohortId, groupNumber, name, supervisorId } = parsed.data;

  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM groups WHERE cohort_id = $1 AND group_number = $2',
    [cohortId, groupNumber]
  );
  if (existing) {
    return res.status(409).json({ error: 'group_exists', message: `Group ${groupNumber} already exists for this cohort` });
  }

  const rows = await query<Group>(
    `INSERT INTO groups (cohort_id, group_number, name, supervisor_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, cohort_id AS "cohortId", group_number AS "groupNumber", name, supervisor_id AS "supervisorId", created_at AS "createdAt"`,
    [cohortId, groupNumber, name ?? null, supervisorId ?? null]
  );

  return res.status(201).json({ data: rows[0] });
}

// ============================================================
// POST /api/groups/:groupId/members   (admin only)
// ============================================================
export async function assignMembers(req: Request, res: Response) {
  const { groupId } = req.params;
  const parsed = assignMembersSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', message: 'Invalid input', details: parsed.error.flatten() });
  }

  const group = await queryOne<{ id: string }>('SELECT id FROM groups WHERE id = $1', [groupId]);
  if (!group) {
    return res.status(404).json({ error: 'not_found', message: 'Group not found' });
  }

  const { userIds } = parsed.data;

  // Insert one by one and skip duplicates rather than failing the whole batch
  // on a single already-a-member conflict (ON CONFLICT DO NOTHING keeps this simple).
  const inserted: GroupMember[] = [];
  for (const userId of userIds) {
    const rows = await query<GroupMember>(
      `INSERT INTO group_members (group_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (group_id, user_id) DO NOTHING
       RETURNING id, group_id AS "groupId", user_id AS "userId", joined_at AS "joinedAt"`,
      [groupId, userId]
    );
    if (rows[0]) inserted.push(rows[0]);
  }

  return res.status(201).json({ data: { added: inserted.length, members: inserted } });
}

// ============================================================
// GET /api/groups/me   (student — returns their own group + members)
// ============================================================
export async function getMyGroup(req: Request, res: Response) {
  const userId = req.user!.id;

  const group = await queryOne<Group & { supervisorName?: string }>(
    `SELECT g.id, g.cohort_id AS "cohortId", g.group_number AS "groupNumber", g.name,
            g.supervisor_id AS "supervisorId", g.created_at AS "createdAt",
            u.full_name AS "supervisorName"
     FROM groups g
     JOIN group_members gm ON gm.group_id = g.id
     LEFT JOIN users u ON u.id = g.supervisor_id
     WHERE gm.user_id = $1`,
    [userId]
  );

  if (!group) {
    return res.status(404).json({ error: 'not_found', message: 'You are not currently assigned to a group' });
  }

  const members = await query<{ id: string; fullName: string; email: string }>(
    `SELECT u.id, u.full_name AS "fullName", u.email
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = $1
     ORDER BY u.full_name`,
    [group.id]
  );

  return res.json({ data: { ...group, members } });
}

// ============================================================
// GET /api/groups/:groupId   (supervisor/admin — view any group)
// ============================================================
export async function getGroupById(req: Request, res: Response) {
  const { groupId } = req.params;

  const group = await queryOne<Group>(
    `SELECT id, cohort_id AS "cohortId", group_number AS "groupNumber", name,
            supervisor_id AS "supervisorId", created_at AS "createdAt"
     FROM groups WHERE id = $1`,
    [groupId]
  );

  if (!group) {
    return res.status(404).json({ error: 'not_found', message: 'Group not found' });
  }

  const members = await query<{ id: string; fullName: string; email: string }>(
    `SELECT u.id, u.full_name AS "fullName", u.email
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = $1
     ORDER BY u.full_name`,
    [groupId]
  );

  return res.json({ data: { ...group, members } });
}
