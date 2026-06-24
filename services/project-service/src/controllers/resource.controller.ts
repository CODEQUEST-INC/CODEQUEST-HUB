import { Request, Response } from 'express';
import { z } from 'zod';
import { query, queryOne, Resource } from '@codequesthub/shared';

const createResourceSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().min(5),
  resourceType: z.enum(['hall_of_fame', 'material']),
  linkUrl: z.string().url().optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  cohortId: z.string().uuid().optional().nullable(),
  isPremium: z.boolean().optional(),
  price: z.number().min(0).optional().nullable()
});

// ============================================================
// GET /api/resources   — fetch resources
// ============================================================
export async function getResources(req: Request, res: Response) {
  const { type } = req.query;
  
  let resources: Resource[];
  
  if (type) {
    resources = await query<Resource>(
      `SELECT id, title, description, resource_type AS "resourceType", link_url AS "linkUrl", 
              thumbnail_url AS "thumbnailUrl", cohort_id AS "cohortId", uploaded_by AS "uploadedBy", 
              is_premium AS "isPremium", price, created_at AS "createdAt"
       FROM resources
       WHERE resource_type = $1
       ORDER BY created_at DESC`,
      [type]
    );
  } else {
    resources = await query<Resource>(
      `SELECT id, title, description, resource_type AS "resourceType", link_url AS "linkUrl", 
              thumbnail_url AS "thumbnailUrl", cohort_id AS "cohortId", uploaded_by AS "uploadedBy", 
              is_premium AS "isPremium", price, created_at AS "createdAt"
       FROM resources
       ORDER BY created_at DESC`
    );
  }

  return res.json({ data: resources });
}

// ============================================================
// POST /api/resources  — create a new resource
// ============================================================
export async function createResource(req: Request, res: Response) {
  const parsed = createResourceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'validation_error', message: 'Invalid input', details: parsed.error.flatten() });

  const userId = req.user!.id;
  const { title, description, resourceType, linkUrl, thumbnailUrl, cohortId, isPremium, price } = parsed.data;

  // Ideally only admins or supervisors can upload resources, but we allow it for the MVP demo
  const newResource = await queryOne<Resource>(
    `INSERT INTO resources (title, description, resource_type, link_url, thumbnail_url, cohort_id, uploaded_by, is_premium, price)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, title, description, resource_type AS "resourceType", link_url AS "linkUrl", 
               thumbnail_url AS "thumbnailUrl", cohort_id AS "cohortId", uploaded_by AS "uploadedBy", 
               is_premium AS "isPremium", price, created_at AS "createdAt"`,
    [title, description, resourceType, linkUrl || null, thumbnailUrl || null, cohortId || null, userId, isPremium || false, price || null]
  );

  return res.status(201).json({ data: newResource });
}

// ============================================================
// DELETE /api/resources/:resourceId  — delete a resource
// ============================================================
export async function deleteResource(req: Request, res: Response) {
  const userId = req.user!.id;
  const { resourceId } = req.params;

  const resource = await queryOne<{ uploaded_by: string }>(`SELECT uploaded_by FROM resources WHERE id = $1`, [resourceId]);
  if (!resource) return res.status(404).json({ error: 'not_found', message: 'Resource not found' });
  
  if (resource.uploaded_by !== userId && req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden', message: 'You can only delete your own resources' });
  }

  await queryOne(`DELETE FROM resources WHERE id = $1`, [resourceId]);
  return res.json({ message: 'Resource deleted successfully' });
}
