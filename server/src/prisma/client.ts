import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error', 'warn'], // Only log errors and warnings, not queries
});

export default prisma;

