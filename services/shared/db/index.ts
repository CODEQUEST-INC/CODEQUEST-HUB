// Shared PostgreSQL connection pool.
// Each service imports this the same way: import { pool } from '../../shared/db';
// Keeping ONE pool implementation avoids every service reinventing connection handling.

import { Pool, PoolConfig } from 'pg';

const config: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 10,                       // max connections per service instance
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

export const pool = new Pool(config);

pool.on('error', (err: Error) => {
  // A backend-idle client error shouldn't crash the whole service.
  console.error('Unexpected error on idle Postgres client', err);
});

/**
 * Simple query helper. Prefer this over pool.query directly so we have
 * one place to add logging/metrics later without touching every service.
 */
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows;
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
