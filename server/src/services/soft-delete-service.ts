/**
 * Soft Delete Service
 * Handles soft deletion of records and moves them to recycle bin
 * Records are kept for 30 days before permanent deletion
 */

import prisma from '../prisma/client';
import logger from '../utils/logger';

const RETENTION_DAYS = 30;

interface SoftDeleteOptions {
  entityType: string;
  entityId: string;
  entityName: string;
  deletedBy?: string;
  deletedByName?: string;
}

/**
 * Soft delete a record - marks it as deleted and adds to recycle bin
 */
export async function softDeleteRecord(options: SoftDeleteOptions): Promise<void> {
  const { entityType, entityId, entityName, deletedBy, deletedByName } = options;
  
  const now = new Date();
  const expiresAt = new Date(now.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    // Get the full record data before soft deleting
    let entityData: any = null;
    
    switch (entityType) {
      case 'lead':
        entityData = await tx.lead.findUnique({ where: { id: entityId } });
        if (entityData) {
          await tx.lead.update({
            where: { id: entityId },
            data: { isDeleted: true },
          });
        }
        break;
      case 'client':
        entityData = await tx.client.findUnique({ where: { id: entityId } });
        if (entityData) {
          await tx.client.update({
            where: { id: entityId },
            data: { isDeleted: true },
          });
        }
        break;
      case 'dealer':
        entityData = await tx.dealer.findUnique({ where: { id: entityId } });
        if (entityData) {
          await tx.dealer.update({
            where: { id: entityId },
            data: { isDeleted: true },
          });
        }
        break;
      case 'deal':
        entityData = await tx.deal.findUnique({ where: { id: entityId } });
        if (entityData) {
          await tx.deal.update({
            where: { id: entityId },
            data: { 
              isDeleted: true,
              deletedAt: now,
              deletedBy: deletedBy,
            },
          });
        }
        break;
      case 'employee':
        entityData = await tx.employee.findUnique({ where: { id: entityId } });
        if (entityData) {
          await tx.employee.update({
            where: { id: entityId },
            data: { isDeleted: true },
          });
        }
        break;
      case 'property':
        entityData = await tx.property.findUnique({ where: { id: entityId } });
        if (entityData) {
          await tx.property.update({
            where: { id: entityId },
            data: { isDeleted: true },
          });
        }
        break;
      case 'unit':
        entityData = await tx.unit.findUnique({ where: { id: entityId } });
        if (entityData) {
          await tx.unit.update({
            where: { id: entityId },
            data: { isDeleted: true },
          });
        }
        break;
      case 'tenant':
        entityData = await tx.tenant.findUnique({ where: { id: entityId } });
        if (entityData) {
          await tx.tenant.update({
            where: { id: entityId },
            data: { isDeleted: true },
          });
        }
        break;
      case 'lease':
        entityData = await tx.lease.findUnique({ where: { id: entityId } });
        if (entityData) {
          await tx.lease.update({
            where: { id: entityId },
            data: { isDeleted: true },
          });
        }
        break;
      case 'communication':
        entityData = await tx.communication.findUnique({ where: { id: entityId } });
        if (entityData) {
          await tx.communication.update({
            where: { id: entityId },
            data: { isDeleted: true },
          });
        }
        break;
      default:
        throw new Error(`Unsupported entity type for soft delete: ${entityType}`);
    }

    if (!entityData) {
      throw new Error(`${entityType} with id ${entityId} not found`);
    }

    // Add to recycle bin
    await tx.deletedRecord.create({
      data: {
        entityType,
        entityId,
        entityName,
        entityData,
        deletedBy,
        deletedByName,
        deletedAt: now,
        expiresAt,
      },
    });

    logger.info(`Soft deleted ${entityType}: ${entityId} (${entityName}) by user ${deletedBy}`);
  });
}

/**
 * Permanently delete expired records from recycle bin
 * Should be called by a scheduled job
 */
export async function cleanupExpiredRecords(): Promise<number> {
  const now = new Date();
  
  // Find expired records
  const expiredRecords = await prisma.deletedRecord.findMany({
    where: {
      expiresAt: { lt: now },
    },
  });

  if (expiredRecords.length === 0) {
    logger.info('No expired records to clean up');
    return 0;
  }

  // Permanently delete the original records and recycle bin entries
  let deletedCount = 0;
  
  for (const record of expiredRecords) {
    try {
      await prisma.$transaction(async (tx) => {
        // Permanently delete the original record
        switch (record.entityType) {
          case 'lead':
            await tx.lead.delete({ where: { id: record.entityId } }).catch(() => {});
            break;
          case 'client':
            await tx.client.delete({ where: { id: record.entityId } }).catch(() => {});
            break;
          case 'dealer':
            await tx.dealer.delete({ where: { id: record.entityId } }).catch(() => {});
            break;
          case 'deal':
            await tx.deal.delete({ where: { id: record.entityId } }).catch(() => {});
            break;
          case 'employee':
            await tx.employee.delete({ where: { id: record.entityId } }).catch(() => {});
            break;
          case 'property':
            await tx.property.delete({ where: { id: record.entityId } }).catch(() => {});
            break;
          case 'unit':
            await tx.unit.delete({ where: { id: record.entityId } }).catch(() => {});
            break;
          case 'tenant':
            await tx.tenant.delete({ where: { id: record.entityId } }).catch(() => {});
            break;
          case 'lease':
            await tx.lease.delete({ where: { id: record.entityId } }).catch(() => {});
            break;
          case 'communication':
            await tx.communication.delete({ where: { id: record.entityId } }).catch(() => {});
            break;
        }

        // Delete from recycle bin
        await tx.deletedRecord.delete({ where: { id: record.id } });
        deletedCount++;
      });
    } catch (error) {
      logger.error(`Failed to permanently delete ${record.entityType} ${record.entityId}:`, error);
    }
  }

  logger.info(`Cleaned up ${deletedCount} expired records from recycle bin`);
  return deletedCount;
}

export const SoftDeleteService = {
  softDeleteRecord,
  cleanupExpiredRecords,
};

