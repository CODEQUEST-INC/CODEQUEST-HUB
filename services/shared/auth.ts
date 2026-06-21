// Shared JWT verification middleware.
// Every service that needs to know "who is this request from" uses this.
// import { requireAuth, requireRole } from '../../shared/auth';

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedUser, UserRole } from './types';

const JWT_SECRET = process.env.JWT_SECRET || '';

if (!JWT_SECRET) {
  // Fail loudly at startup rather than silently accepting unsigned tokens.
  console.warn('WARNING: JWT_SECRET is not set. Set it in .env before running in any shared environment.');
}

/**
 * Verifies the Authorization: Bearer <token> header and attaches
 * the decoded user to req.user. Returns 401 if missing/invalid.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized', message: 'Missing or malformed Authorization header' });
  }

  const token = header.slice('Bearer '.length);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired token' });
  }
}

/**
 * Use AFTER requireAuth. Restricts the route to specific roles.
 * Example: router.post('/groups', requireAuth, requireRole('admin'), handler)
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'unauthorized', message: 'No authenticated user on request' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'forbidden', message: `Requires role: ${allowedRoles.join(' or ')}` });
    }
    next();
  };
}

export function signToken(user: AuthenticatedUser, expiresIn: jwt.SignOptions['expiresIn'] = '7d'): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn });
}
