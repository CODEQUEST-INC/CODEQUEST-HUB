import { Request, Response } from 'express';
import { z } from 'zod';
import { pool, query, queryOne, Post } from '@codequesthub/shared';

const createPostSchema = z.object({
  title: z.string().min(3).max(255),
  content: z.string().min(5),
  category: z.enum(['discussion', 'tutorial', 'help', 'announcement']),
  linkUrl: z.string().url().optional().nullable(),
});

// ============================================================
// GET /api/community   — fetch all community posts
// ============================================================
export async function getCommunityPosts(req: Request, res: Response) {
  const { category } = req.query;
  
  let posts: Post[];
  
  if (category) {
    posts = await query<Post>(
      `SELECT cp.id, cp.author_id AS "authorId", u.full_name AS "authorName", 
              cp.title, cp.content, cp.category, cp.link_url AS "linkUrl", cp.created_at AS "createdAt"
       FROM community_posts cp
       JOIN users u ON cp.author_id = u.id
       WHERE cp.category = $1
       ORDER BY cp.created_at DESC`,
      [category]
    );
  } else {
    posts = await query<Post>(
      `SELECT cp.id, cp.author_id AS "authorId", u.full_name AS "authorName", 
              cp.title, cp.content, cp.category, cp.link_url AS "linkUrl", cp.created_at AS "createdAt"
       FROM community_posts cp
       JOIN users u ON cp.author_id = u.id
       ORDER BY cp.created_at DESC`
    );
  }

  return res.json({ data: posts });
}

// ============================================================
// POST /api/community  — create a new post
// ============================================================
export async function createPost(req: Request, res: Response) {
  const parsed = createPostSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'validation_error', message: 'Invalid input', details: parsed.error.flatten() });

  const userId = req.user!.id;
  const { title, content, category, linkUrl } = parsed.data;

  // Retrieve user info for the response
  const user = await queryOne<{ full_name: string }>(`SELECT full_name FROM users WHERE id = $1`, [userId]);

  const newPost = await queryOne<Post>(
    `INSERT INTO community_posts (author_id, title, content, category, link_url)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, author_id AS "authorId", title, content, category, link_url AS "linkUrl", created_at AS "createdAt"`,
    [userId, title, content, category, linkUrl || null]
  );

  return res.status(201).json({ 
    data: {
      ...newPost,
      authorName: user?.full_name || 'Unknown'
    } 
  });
}

// ============================================================
// DELETE /api/community/:postId  — delete a post
// ============================================================
export async function deletePost(req: Request, res: Response) {
  const userId = req.user!.id;
  const { postId } = req.params;

  const post = await queryOne<{ author_id: string }>(`SELECT author_id FROM community_posts WHERE id = $1`, [postId]);
  if (!post) return res.status(404).json({ error: 'not_found', message: 'Post not found' });
  
  if (post.author_id !== userId && req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden', message: 'You can only delete your own posts' });
  }

  await queryOne(`DELETE FROM community_posts WHERE id = $1`, [postId]);
  return res.json({ message: 'Post deleted successfully' });
}
