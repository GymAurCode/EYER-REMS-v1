import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool, type PoolConfig } from 'pg';

/**
 * Prisma Client Configuration
 *
 * Connection Pooling:
 * For Railway deployment, configure connection pool in DATABASE_URL:
 * postgresql://user:pass@host:port/db?connection_limit=10&pool_timeout=20
 *
 * Recommended pool settings:
 * - connection_limit: 10-20 (adjust based on Railway plan)
 * - pool_timeout: 20 seconds
 *
 * IMPORTANT: pg's SCRAM auth requires password to be a string (never undefined).
 * We parse DATABASE_URL and ensure password is always a string ('' if missing).
 */
function getPoolConfig(): PoolConfig {
  const raw = process.env.DATABASE_URL || '';
  if (!raw || (!raw.startsWith('postgresql://') && !raw.startsWith('postgres://'))) {
    return { connectionString: raw || 'postgresql://localhost:5432/postgres' };
  }
  try {
    const u = new URL(raw);
    const password =
      u.password != null && u.password !== '' ? decodeURIComponent(u.password) : '';
    const config: PoolConfig = {
      host: u.hostname,
      port: parseInt(u.port || '5432', 10),
      user: decodeURIComponent(u.username || ''),
      password,
      database: decodeURIComponent((u.pathname || '/').slice(1).replace(/\/$/, '') || ''),
    };
    const limit = u.searchParams.get('connection_limit');
    if (limit) config.max = parseInt(limit, 10);
    const timeout = u.searchParams.get('pool_timeout');
    if (timeout) config.idleTimeoutMillis = parseInt(timeout, 10) * 1000;
    const sslmode = u.searchParams.get('sslmode');
    if (sslmode === 'require' || sslmode === 'no-verify')
      config.ssl = { rejectUnauthorized: sslmode !== 'no-verify' };
    return config;
  } catch {
    return { connectionString: raw };
  }
}

const pool = new Pool(getPoolConfig());
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'], // Only log errors and warnings, not queries
  // Connection pool is configured via DATABASE_URL query parameters
  // Example: ?connection_limit=10&pool_timeout=20
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  await pool.end();
});

export default prisma;
export { Prisma, PrismaClient };
