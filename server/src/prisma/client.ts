import { PrismaClient } from '@prisma/client';

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
 */
const prisma = new PrismaClient({
  log: ['error', 'warn'], // Only log errors and warnings, not queries
  // Connection pool is configured via DATABASE_URL query parameters
  // Example: ?connection_limit=10&pool_timeout=20
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
