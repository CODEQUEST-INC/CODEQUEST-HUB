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
    // Feedback is REQUIRED when rejecting or requesting changes
    if (data.action === 'rejected' || data.action === 'changes_requested') {
      return !!data.feedback && data.feedback.trim().length >= 10;
    }
    return true;
  },
  { message: 'Written feedback is required when rejecting or requesting changes', path: ['feedback'] }
);

const adminReviewSchema = z.object({
  action: z.enum(['approved', 'rejected']),
  feedback: z.string().optional()
});

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
// POST /api/proposals   — student submits a new proposal
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
  
  let documentUrl = null;
  let documentName = null;
  if (req.file) {
    documentUrl = `/uploads/proposals/${req.file.filename}`;
    documentName = req.file.originalname;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const proposalRows = await client.query(
      `INSERT INTO proposals (group_id, title, problem_statement, objectives, tech_stack, document_url, document_name, status, submitted_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'submitted', $8)
       RETURNING id, group_id AS "groupId", title, problem_statement AS "problemStatement",
                 objectives, tech_stack AS "techStack", document_url AS "documentUrl", document_name AS "documentName", status, current_version AS "currentVersion",
                 submitted_by AS "submittedBy", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [group.id, title, problemStatement, objectives, techStack, documentUrl, documentName, userId]
    );

    const proposal: Proposal = proposalRows.rows[0];

    await client.query(
      `INSERT INTO proposal_versions (proposal_id, version_number, title, problem_statement, objectives, tech_stack, document_url, document_name, action, actor_id)
       VALUES ($1, 1, $2, $3, $4, $5, $6, $7, 'submitted', $8)`,
      [proposal.id, title, problemStatement, objectives, techStack, documentUrl, documentName, userId]
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
// ============================================================
export async function resubmitProposal(req: Request, res: Response) {
  const parsed = proposalContentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', message: 'Invalid input', details: parsed.error.flatten() });
  }

  const userId = req.user!.id;
  const { proposalId } = req.params;

  const proposal = await queryOne<Proposal & { groupId: string }>(
    `SELECT id, group_id AS "groupId", status, current_version AS "currentVersion", document_url AS "documentUrl", document_name AS "documentName"
     FROM proposals WHERE id = $1`,
    [proposalId]
  );

  if (!proposal) {
    return res.status(404).json({ error: 'not_found', message: 'Proposal not found' });
  }

  const memberCheck = await queryOne<{ id: string }>(
    'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
    [proposal.groupId, userId]
  );
  if (!memberCheck) {
    return res.status(403).json({ error: 'forbidden', message: 'You are not a member of this proposal\'s group' });
  }

  const resubmittableStatuses: ProposalStatus[] = ['changes_requested', 'rejected'];
  if (!resubmittableStatuses.includes(proposal.status as ProposalStatus)) {
    return res.status(400).json({
      error: 'invalid_status',
      message: `Cannot resubmit a proposal with status "${proposal.status}".`,
    });
  }

  const { title, problemStatement, objectives, techStack } = parsed.data;
  const newVersion = (proposal.currentVersion as unknown as number) + 1;

  let documentUrl = proposal.documentUrl;
  let documentName = proposal.documentName;
  if (req.file) {
    documentUrl = `/uploads/proposals/${req.file.filename}`;
    documentName = req.file.originalname;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updatedRows = await client.query(
      `UPDATE proposals
       SET title = $1, problem_statement = $2, objectives = $3, tech_stack = $4,
           document_url = $5, document_name = $6, status = 'submitted', current_version = $7, submitted_by = $8
       WHERE id = $9
       RETURNING id, group_id AS "groupId", title, problem_statement AS "problemStatement",
                 objectives, tech_stack AS "techStack", document_url AS "documentUrl", document_name AS "documentName", status, current_version AS "currentVersion",
                 submitted_by AS "submittedBy", reviewed_by AS "reviewedBy",
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [title, problemStatement, objectives, techStack, documentUrl, documentName, newVersion, userId, proposalId]
    );

    await client.query(
      `INSERT INTO proposal_versions (proposal_id, version_number, title, problem_statement, objectives, tech_stack, document_url, document_name, action, actor_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'submitted', $9)`,
      [proposalId, newVersion, title, problemStatement, objectives, techStack, documentUrl, documentName, userId]
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
            p.title, p.problem_statement AS "problemStatement", p.objectives, p.tech_stack AS "techStack", p.document_url AS "documentUrl", p.document_name AS "documentName",
            g.supervisor_id AS "groupSupervisorId"
     FROM proposals p
     JOIN groups g ON g.id = p.group_id
     WHERE p.id = $1`,
    [proposalId]
  );

  if (!proposal) {
    return res.status(404).json({ error: 'not_found', message: 'Proposal not found' });
  }

  if (proposal.groupSupervisorId !== supervisorId) {
    return res.status(403).json({ error: 'forbidden', message: 'You are not the assigned supervisor for this group' });
  }

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
                 objectives, tech_stack AS "techStack", document_url AS "documentUrl", document_name AS "documentName", status, current_version AS "currentVersion",
                 submitted_by AS "submittedBy", reviewed_by AS "reviewedBy",
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [action, supervisorId, newVersion, proposalId]
    );

    await client.query(
      `INSERT INTO proposal_versions (proposal_id, version_number, title, problem_statement, objectives, tech_stack, document_url, document_name, action, actor_id, feedback)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        proposalId, newVersion,
        proposal.title, proposal.problemStatement, proposal.objectives, proposal.techStack,
        proposal.documentUrl, proposal.documentName,
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
// PATCH /api/proposals/:proposalId/forward
// ============================================================
export async function forwardToAdmin(req: Request, res: Response) {
  const supervisorId = req.user!.id;
  const { proposalId } = req.params;

  const proposal = await queryOne<Proposal & { groupSupervisorId: string | null }>(
    `SELECT p.id, p.status, p.current_version AS "currentVersion", p.title, p.problem_statement AS "problemStatement", p.objectives, p.tech_stack AS "techStack", p.document_url AS "documentUrl", p.document_name AS "documentName",
            g.supervisor_id AS "groupSupervisorId"
     FROM proposals p
     JOIN groups g ON g.id = p.group_id
     WHERE p.id = $1`,
    [proposalId]
  );

  if (!proposal) {
    return res.status(404).json({ error: 'not_found', message: 'Proposal not found' });
  }

  if (proposal.groupSupervisorId !== supervisorId) {
    return res.status(403).json({ error: 'forbidden', message: 'You are not the assigned supervisor for this group' });
  }

  if (proposal.status !== 'submitted' && proposal.status !== 'under_review') {
    return res.status(400).json({ error: 'invalid_status', message: `Cannot forward proposal with status "${proposal.status}"` });
  }

  const newVersion = (proposal.currentVersion as unknown as number) + 1;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updatedRows = await client.query(
      `UPDATE proposals SET status = 'forwarded_to_admin', current_version = $1 WHERE id = $2 RETURNING *`,
      [newVersion, proposalId]
    );

    await client.query(
      `INSERT INTO proposal_versions (proposal_id, version_number, title, problem_statement, objectives, tech_stack, document_url, document_name, action, actor_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'forwarded_to_admin', $9)`,
      [proposalId, newVersion, proposal.title, proposal.problemStatement, proposal.objectives, proposal.techStack, proposal.documentUrl, proposal.documentName, supervisorId]
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
// PATCH /api/proposals/:proposalId/admin-review
// ============================================================
export async function adminReviewProposal(req: Request, res: Response) {
  const parsed = adminReviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'validation_error', message: 'Invalid input', details: parsed.error.flatten() });

  const adminId = req.user!.id;
  const { proposalId } = req.params;
  const { action, feedback } = parsed.data;

  const proposal = await queryOne<Proposal>(
    `SELECT * FROM proposals WHERE id = $1`, [proposalId]
  );

  if (!proposal) return res.status(404).json({ error: 'not_found', message: 'Proposal not found' });
  if (proposal.status !== 'forwarded_to_admin') return res.status(400).json({ error: 'invalid_status', message: 'Proposal not forwarded' });

  const newVersion = (proposal.currentVersion as unknown as number) + 1;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const updatedRows = await client.query(
      `UPDATE proposals SET status = $1, current_version = $2 WHERE id = $3 RETURNING *`,
      [action, newVersion, proposalId]
    );
    await client.query(
      `INSERT INTO proposal_versions (proposal_id, version_number, title, problem_statement, objectives, tech_stack, document_url, document_name, action, actor_id, feedback)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [proposalId, newVersion, proposal.title, proposal.problemStatement, proposal.objectives, proposal.techStack, (proposal as any).document_url, (proposal as any).document_name, action, adminId, feedback ?? null]
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
            p.objectives, p.tech_stack AS "techStack", p.document_url AS "documentUrl", p.document_name AS "documentName", p.status,
            p.current_version AS "currentVersion", p.submitted_by AS "submittedBy",
            p.reviewed_by AS "reviewedBy", p.created_at AS "createdAt", p.updated_at AS "updatedAt"
     FROM proposals p
     JOIN groups g ON g.id = p.group_id
     JOIN group_members gm ON gm.group_id = g.id
     WHERE gm.user_id = $1`,
    [userId]
  );

  if (!proposal) return res.status(404).json({ error: 'not_found', message: 'No proposal found for your group yet' });
  return res.json({ data: proposal });
}

// ============================================================
// GET /api/proposals/admin/forwarded
// ============================================================
export async function getAdminForwardedProposals(req: Request, res: Response) {
  const proposals = await query<Proposal & { groupNumber: number; groupName: string }>(
    `SELECT p.id, p.group_id AS "groupId", p.title, p.problem_statement AS "problemStatement",
            p.objectives, p.tech_stack AS "techStack", p.document_url AS "documentUrl", p.document_name AS "documentName", p.status,
            p.current_version AS "currentVersion", p.submitted_by AS "submittedBy",
            p.created_at AS "createdAt", p.updated_at AS "updatedAt",
            g.group_number AS "groupNumber", g.name AS "groupName"
     FROM proposals p
     JOIN groups g ON g.id = p.group_id
     WHERE p.status = 'forwarded_to_admin'
     ORDER BY p.updated_at DESC`
  );
  return res.json({ data: proposals });
}

// ============================================================
// GET /api/proposals/:proposalId/history
// ============================================================
export async function getProposalHistory(req: Request, res: Response) {
  const { proposalId } = req.params;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  const proposal = await queryOne<{ id: string; groupId: string }>(
    `SELECT id, group_id AS "groupId" FROM proposals WHERE id = $1`, [proposalId]
  );

  if (!proposal) return res.status(404).json({ error: 'not_found', message: 'Proposal not found' });

  if (userRole === 'student') {
    const memberCheck = await queryOne<{ id: string }>('SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2', [proposal.groupId, userId]);
    if (!memberCheck) return res.status(403).json({ error: 'forbidden', message: 'You can only view history for your own group\'s proposal' });
  }

  const versions = await query<ProposalVersion>(
    `SELECT pv.id, pv.proposal_id AS "proposalId", pv.version_number AS "versionNumber",
            pv.title, pv.problem_statement AS "problemStatement",
            pv.objectives, pv.tech_stack AS "techStack", pv.document_url AS "documentUrl", pv.document_name AS "documentName",
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
// GET /api/proposals/supervisor
// ============================================================
export async function getSupervisorProposals(req: Request, res: Response) {
  const supervisorId = req.user!.id;
  const proposals = await query<Proposal & { groupNumber: number; groupName: string }>(
    `SELECT p.id, p.group_id AS "groupId", p.title, p.problem_statement AS "problemStatement",
            p.objectives, p.tech_stack AS "techStack", p.document_url AS "documentUrl", p.document_name AS "documentName", p.status,
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
