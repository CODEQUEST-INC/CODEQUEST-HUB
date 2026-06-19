import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query, queryOne, signToken, User } from '@codequesthub/shared';

const SALT_ROUNDS = 10;

// ============================================================
// Validation schemas
// ============================================================
const registerSchema = z.object({
  fullName: z.string().min(2).max(150),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['student', 'supervisor', 'admin', 'mentor']).default('student'),
  studentId: z.string().optional(),
  indexNumber: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ============================================================
// POST /api/auth/register
// ============================================================
export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', message: 'Invalid input', details: parsed.error.flatten() });
  }

  const { fullName, email, password, role, studentId, indexNumber } = parsed.data;

  const existing = await queryOne<{ id: string }>('SELECT id FROM users WHERE email = $1', [email]);
  if (existing) {
    return res.status(409).json({ error: 'email_taken', message: 'An account with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const rows = await query<User>(
    `INSERT INTO users (full_name, email, password_hash, role, student_id, index_number)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, full_name AS "fullName", email, role, student_id AS "studentId", index_number AS "indexNumber", created_at AS "createdAt", updated_at AS "updatedAt"`,
    [fullName, email, passwordHash, role, studentId ?? null, indexNumber ?? null]
  );

  const user = rows[0];
  const token = signToken({ id: user.id, email: user.email, role: user.role });

  return res.status(201).json({ data: { user, token } });
}

// ============================================================
// POST /api/auth/login
// ============================================================
export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', message: 'Invalid input', details: parsed.error.flatten() });
  }

  const { email, password } = parsed.data;

  const row = await queryOne<{ id: string; password_hash: string; role: string; full_name: string; email: string }>(
    'SELECT id, password_hash, role, full_name, email FROM users WHERE email = $1',
    [email]
  );

  // Deliberately vague error — never reveal whether the email exists.
  const invalidCredentials = () =>
    res.status(401).json({ error: 'invalid_credentials', message: 'Email or password is incorrect' });

  if (!row) return invalidCredentials();

  const matches = await bcrypt.compare(password, row.password_hash);
  if (!matches) return invalidCredentials();

  const token = signToken({ id: row.id, email: row.email, role: row.role as any });

  return res.json({
    data: {
      user: { id: row.id, fullName: row.full_name, email: row.email, role: row.role },
      token,
    },
  });
}

// ============================================================
// GET /api/auth/me   (requires requireAuth middleware upstream)
// ============================================================
export async function me(req: Request, res: Response) {
  const user = await queryOne<User>(
    `SELECT id, full_name AS "fullName", email, role, student_id AS "studentId", index_number AS "indexNumber", created_at AS "createdAt", updated_at AS "updatedAt"
     FROM users WHERE id = $1`,
    [req.user!.id]
  );

  if (!user) {
    return res.status(404).json({ error: 'not_found', message: 'User not found' });
  }

  return res.json({ data: user });
}
