import { Request, Response } from 'express';
import { z } from 'zod';
import { pool, query, queryOne, Proposal, ProposalVersion, ProposalStatus } from '@codequesthub/shared';

// ============================================================
// Validation schemas
// ============================================================
const proposalContentSchema = z.object({
  title: z.string().min(5).max(255),
  problemStatement: z.string().min(20),
  objectives: z.string().min(10),
  techStack: z.string().min(3),
});

const reviewSchema = z.object({
  action: z.enum(['approved', 'rejected', 'changes_requested']),
  feedback: z.string().min(10).optional(),
}).refine(
  (data) => {
    // Feedback is REQUIRED when rejecting or requesting changes — FR-07
    if (data.action === 'rejected' || data.action === 'changes_requested') {
      return !!data.feedback && data.feedback.trim().length >= 10;
    }
    return true;
  },
  { message: 'Written feedback is required when rejecting or requesting changes', path: ['feedback'] }
);

// ============================================================
// Helper: verify the requesting student belongs to the group
// ============================================================
async function getStudentGroup(userId: string): Promise<{ id: string; supervisorId: string | null } | null> {
  return queryOne<{ id: string; supervisorId: string | null }>(
    `SELECT g.id, g.supervisor_id AS "supervisorId"
     FROM groups g
     JOIN group_members gm ON gm.group_id = g.id
     WHERE gm.user_id = $1`,
    [userId]
  );
}

// ============================================================
// POST /api/proposals   — student submits a new proposal (FR-07)
// ============================================================
export async function submitProposal(req: Request, res: Response) {
  const parsed = proposalContentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', message: 'Invalid input', details: parsed.error.flatten() });
  }

  const userId = req.user!.id;
  const group = await getStudentGroup(userId);
  if (!group) {
    return res.status(404).json({ error: 'not_found', message: 'You are not assigned to a group' });
  }

  // Only one proposal per group — check for existing
  const existing = await queryOne<{ id: string; status: string }>(
    'SELECT id, status FROM proposals WHERE group_id = $1',
    [group.id]
  );

  if (existing) {
    return res.status(409).json({
      error: 'proposal_exists',
      message: `Your group already has a proposal (status: ${existing.status}). Use PATCH /api/proposals/${existing.id}/resubmit to update it.`,
    });
  }

  const { title, problemStatement, objectives, techStack } = parsed.data;

  // Use a transaction: insert proposal + first version atomically
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const proposalRows = await client.query(
      `INSERT INTO proposals (group_id, title, problem_statement, objectives, tech_stack, status, submitted_by)
       VALUES ($1, $2, $3, $4, $5, 'submitted', $6)
       RETURNING id, group_id AS "groupId", title, problem_statement AS "problemStatement",
                 objectives, tech_stack AS "techStack", status, current_version AS "currentVersion",
                 submitted_by AS "submittedBy", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [group.id, title, problemStatement, objectives, techStack, userId]
    );

    const proposal: Proposal = proposalRows.rows[0];

    await client.query(
      `INSERT INTO proposal_versions (proposal_id, version_number, title, problem_statement, objectives, tech_stack, action, actor_id)
       VALUES ($1, 1, $2, $3, $4, $5, 'submitted', $6)`,
      [proposal.id, title, problemStatement, objectives, techStack, userId]
    );

    await client.query('COMMIT');

    return res.status(201).json({ data: proposal });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================
// PATCH /api/proposals/:proposalId/resubmit
// Student resubmits after changes were requested (FR-08)
// ============================================================
export async function resubmitProposal(req: Request, res: Response) {
  const parsed = proposalContentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', message: 'Invalid input', details: parsed.error.flatten() });
  }

  const userId = req.user!.id;
  const { proposalId } = req.params;

  const proposal = await queryOne<Proposal & { groupId: string }>(
    `SELECT id, group_id AS "groupId", status, current_version AS "currentVersion"
     FROM proposals WHERE id = $1`,
    [proposalId]
  );

  if (!proposal) {
    return res.status(404).json({ error: 'not_found', message: 'Proposal not found' });
  }

  // Confirm the student actually belongs to this proposal's group
  const memberCheck = await queryOne<{ id: string }>(
    'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
    [proposal.groupId, userId]
  );
  if (!memberCheck) {
    return res.status(403).json({ error: 'forbidden', message: 'You are not a member of this proposal\'s group' });
  }

  // Can only resubmit if changes were requested or previously rejected
  const resubmittableStatuses: ProposalStatus[] = ['changes_requested', 'rejected'];
  if (!resubmittableStatuses.includes(proposal.status as ProposalStatus)) {
    return res.status(400).json({
      error: 'invalid_status',
      message: `Cannot resubmit a proposal with status "${proposal.status}". Resubmission is only allowed after rejection or a request for changes.`,
    });
  }

  const { title, problemStatement, objectives, techStack } = parsed.data;
  const newVersion = (proposal.currentVersion as unknown as number) + 1;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updatedRows = await client.query(
      `UPDATE proposals
       SET title = $1, problem_statement = $2, objectives = $3, tech_stack = $4,
           status = 'submitted', current_version = $5, submitted_by = $6
       WHERE id = $7
       RETURNING id, group_id AS "groupId", title, problem_statement AS "problemStatement",
                 objectives, tech_stack AS "techStack", status, current_version AS "currentVersion",
                 submitted_by AS "submittedBy", reviewed_by AS "reviewedBy",
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [title, problemStatement, objectives, techStack, newVersion, userId, proposalId]
    );

    await client.query(
      `INSERT INTO proposal_versions (proposal_id, version_number, title, problem_statement, objectives, tech_stack, action, actor_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'submitted', $7)`,
      [proposalId, newVersion, title, problemStatement, objectives, techStack, userId]
    );

    await client.query('COMMIT');

    return res.json({ data: updatedRows.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================
// PATCH /api/proposals/:proposalId/review
// Supervisor approves, rejects, or requests changes (FR-07)
// ============================================================
export async function reviewProposal(req: Request, res: Response) {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', message: 'Invalid input', details: parsed.error.flatten() });
  }

  const supervisorId = req.user!.id;
  const { proposalId } = req.params;
  const { action, feedback } = parsed.data;

  const proposal = await queryOne<Proposal & { groupId: string; groupSupervisorId: string | null }>(
    `SELECT p.id, p.group_id AS "groupId", p.status, p.current_version AS "currentVersion",
            p.title, p.problem_statement AS "problemStatement", p.objectives, p.tech_stack AS "techStack",
            g.supervisor_id AS "groupSupervisorId"
     FROM proposals p
     JOIN groups g ON g.id = p.group_id
     WHERE p.id = $1`,
    [proposalId]
  );

  if (!proposal) {
    return res.status(404).json({ error: 'not_found', message: 'Proposal not found' });
  }

  // Confirm the reviewing supervisor is actually assigned to this group
  if (proposal.groupSupervisorId !== supervisorId) {
    return res.status(403).json({ error: 'forbidden', message: 'You are not the assigned supervisor for this group' });
  }

  // Can only review a submitted proposal
  if (proposal.status !== 'submitted' && proposal.status !== 'under_review') {
    return res.status(400).json({
      error: 'invalid_status',
      message: `Cannot review a proposal with status "${proposal.status}"`,
    });
  }

  const newVersion = (proposal.currentVersion as unknown as number) + 1;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updatedRows = await client.query(
      `UPDATE proposals
       SET status = $1, reviewed_by = $2, current_version = $3
       WHERE id = $4
       RETURNING id, group_id AS "groupId", title, problem_statement AS "problemStatement",
                 objectives, tech_stack AS "techStack", status, current_version AS "currentVersion",
                 submitted_by AS "submittedBy", reviewed_by AS "reviewedBy",
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [action, supervisorId, newVersion, proposalId]
    );

    await client.query(
      `INSERT INTO proposal_versions (proposal_id, version_number, title, problem_statement, objectives, tech_stack, action, actor_id, feedback)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        proposalId, newVersion,
        proposal.title, proposal.problemStatement, proposal.objectives, proposal.techStack,
        action, supervisorId, feedback ?? null,
      ]
    );

    await client.query('COMMIT');

    return res.json({ data: updatedRows.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================
// GET /api/proposals/my   — student views their group's proposal
// ============================================================
export async function getMyProposal(req: Request, res: Response) {
  const userId = req.user!.id;

  const proposal = await queryOne<Proposal>(
    `SELECT p.id, p.group_id AS "groupId", p.title, p.problem_statement AS "problemStatement",
            p.objectives, p.tech_stack AS "techStack", p.status,
            p.current_version AS "currentVersion", p.submitted_by AS "submittedBy",
            p.reviewed_by AS "reviewedBy", p.created_at AS "createdAt", p.updated_at AS "updatedAt"
     FROM proposals p
     JOIN groups g ON g.id = p.group_id
     JOIN group_members gm ON gm.group_id = g.id
     WHERE gm.user_id = $1`,
    [userId]
  );

  if (!proposal) {
    return res.status(404).json({ error: 'not_found', message: 'No proposal found for your group yet' });
  }

  return res.json({ data: proposal });
}

// ============================================================
// GET /api/proposals/:proposalId/history  — full version history (FR-09)
// ============================================================
export async function getProposalHistory(req: Request, res: Response) {
  const { proposalId } = req.params;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  const proposal = await queryOne<{ id: string; groupId: string }>(
    `SELECT id, group_id AS "groupId" FROM proposals WHERE id = $1`,
    [proposalId]
  );

  if (!proposal) {
    return res.status(404).json({ error: 'not_found', message: 'Proposal not found' });
  }

  // Students can only see history for their own group's proposal
  if (userRole === 'student') {
    const memberCheck = await queryOne<{ id: string }>(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [proposal.groupId, userId]
    );
    if (!memberCheck) {
      return res.status(403).json({ error: 'forbidden', message: 'You can only view history for your own group\'s proposal' });
    }
  }

  const versions = await query<ProposalVersion>(
    `SELECT pv.id, pv.proposal_id AS "proposalId", pv.version_number AS "versionNumber",
            pv.title, pv.problem_statement AS "problemStatement",
            pv.objectives, pv.tech_stack AS "techStack",
            pv.action, pv.actor_id AS "actorId", pv.feedback,
            u.full_name AS "actorName",
            pv.created_at AS "createdAt"
     FROM proposal_versions pv
     JOIN users u ON u.id = pv.actor_id
     WHERE pv.proposal_id = $1
     ORDER BY pv.version_number ASC`,
    [proposalId]
  );

  return res.json({ data: { proposalId, totalVersions: versions.length, history: versions } });
}

// ============================================================
// GET /api/proposals/supervisor  — supervisor views all proposals for their groups
// ============================================================
export async function getSupervisorProposals(req: Request, res: Response) {
  const supervisorId = req.user!.id;

  const proposals = await query<Proposal & { groupNumber: number; groupName: string }>(
    `SELECT p.id, p.group_id AS "groupId", p.title, p.problem_statement AS "problemStatement",
            p.objectives, p.tech_stack AS "techStack", p.status,
            p.current_version AS "currentVersion", p.submitted_by AS "submittedBy",
            p.reviewed_by AS "reviewedBy", p.created_at AS "createdAt", p.updated_at AS "updatedAt",
            g.group_number AS "groupNumber", g.name AS "groupName"
     FROM proposals p
     JOIN groups g ON g.id = p.group_id
     WHERE g.supervisor_id = $1
     ORDER BY p.updated_at DESC`,
    [supervisorId]
  );

  return res.json({ data: proposals });
}
