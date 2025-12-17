/**
 * Cleanup Recycle Bin Script
 * 
 * This script permanently deletes records that have been in the recycle bin
 * for more than 30 days.
 * 
 * Run this as a scheduled task (cron job) daily:
 * - Windows Task Scheduler: npx ts-node scripts/cleanup-recycle-bin.ts
 * - Linux cron: 0 2 * * * cd /path/to/server && npx ts-node scripts/cleanup-recycle-bin.ts
 * - Railway/Heroku: Use their scheduled job features
 */

import { cleanupExpiredRecords } from '../src/services/soft-delete-service';
import logger from '../src/utils/logger';

async function main() {
  logger.info('Starting recycle bin cleanup...');
  
  try {
    const deletedCount = await cleanupExpiredRecords();
    logger.info(`Cleanup completed. ${deletedCount} expired records permanently deleted.`);
    process.exit(0);
  } catch (error) {
    logger.error('Cleanup failed:', error);
    process.exit(1);
  }
}

main();

