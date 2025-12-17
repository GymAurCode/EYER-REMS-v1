/**
 * Recycle Bin Routes
 * System-wide recycle bin for soft-deleted records
 * Records are kept for 30 days before permanent deletion
 */

import express, { Response } from 'express';
import prisma from '../prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';
import { parsePaginationQuery, calculatePagination } from '../utils/pagination';
import { successResponse } from '../utils/error-handler';

const router = (express as any).Router();

// Get all deleted records with pagination and filtering
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit } = parsePaginationQuery(req.query);
    const skip = (page - 1) * limit;
    const { entityType, search } = req.query;

    const where: any = {};
    
    // Filter by entity type if provided
    if (entityType && entityType !== 'all') {
      where.entityType = entityType as string;
    }

    // Search by entity name
    if (search) {
      where.entityName = {
        contains: search as string,
        mode: 'insensitive',
      };
    }

    const [records, total] = await Promise.all([
      prisma.deletedRecord.findMany({
        where,
        orderBy: { deletedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.deletedRecord.count({ where }),
    ]);

    // Calculate remaining days for each record
    const now = new Date();
    const recordsWithDays = records.map((record) => {
      const expiresAt = new Date(record.expiresAt);
      const remainingMs = expiresAt.getTime() - now.getTime();
      const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
      
      return {
        ...record,
        remainingDays,
        entityData: undefined, // Don't send full data in list view
      };
    });

    const pagination = calculatePagination(page, limit, total);
    return successResponse(res, recordsWithDays, 200, pagination);
  } catch (error: any) {
    logger.error('Failed to fetch deleted records:', error);
    res.status(500).json({ error: 'Failed to fetch deleted records' });
  }
});

// Get available entity types for filtering
router.get('/entity-types', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const types = await prisma.deletedRecord.groupBy({
      by: ['entityType'],
      _count: { entityType: true },
    });

    const entityTypes = types.map((t) => ({
      type: t.entityType,
      count: t._count.entityType,
      label: getEntityTypeLabel(t.entityType),
    }));

    res.json({ success: true, data: entityTypes });
  } catch (error: any) {
    logger.error('Failed to fetch entity types:', error);
    res.status(500).json({ error: 'Failed to fetch entity types' });
  }
});

// Restore a deleted record
router.post('/:id/restore', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const deletedRecord = await prisma.deletedRecord.findUnique({
      where: { id },
    });

    if (!deletedRecord) {
      return res.status(404).json({ error: 'Deleted record not found' });
    }

    // Check if record has expired
    if (new Date(deletedRecord.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'Record has expired and cannot be restored' });
    }

    const entityData = deletedRecord.entityData as any;

    // Restore the record based on entity type
    let restoredRecord: any = null;
    
    await prisma.$transaction(async (tx) => {
      switch (deletedRecord.entityType) {
        case 'lead':
          restoredRecord = await tx.lead.update({
            where: { id: deletedRecord.entityId },
            data: { isDeleted: false },
          });
          break;
        case 'client':
          restoredRecord = await tx.client.update({
            where: { id: deletedRecord.entityId },
            data: { isDeleted: false },
          });
          break;
        case 'dealer':
          restoredRecord = await tx.dealer.update({
            where: { id: deletedRecord.entityId },
            data: { isDeleted: false },
          });
          break;
        case 'deal':
          restoredRecord = await tx.deal.update({
            where: { id: deletedRecord.entityId },
            data: { 
              isDeleted: false,
              deletedAt: null,
              deletedBy: null,
            },
          });
          break;
        case 'employee':
          restoredRecord = await tx.employee.update({
            where: { id: deletedRecord.entityId },
            data: { isDeleted: false },
          });
          break;
        case 'property':
          restoredRecord = await tx.property.update({
            where: { id: deletedRecord.entityId },
            data: { isDeleted: false },
          });
          break;
        case 'unit':
          restoredRecord = await tx.unit.update({
            where: { id: deletedRecord.entityId },
            data: { isDeleted: false },
          });
          break;
        case 'tenant':
          restoredRecord = await tx.tenant.update({
            where: { id: deletedRecord.entityId },
            data: { isDeleted: false },
          });
          break;
        case 'lease':
          restoredRecord = await tx.lease.update({
            where: { id: deletedRecord.entityId },
            data: { isDeleted: false },
          });
          break;
        case 'communication':
          restoredRecord = await tx.communication.update({
            where: { id: deletedRecord.entityId },
            data: { isDeleted: false },
          });
          break;
        default:
          throw new Error(`Unsupported entity type: ${deletedRecord.entityType}`);
      }

      // Remove from recycle bin after successful restore
      await tx.deletedRecord.delete({
        where: { id },
      });
    });

    logger.info(`Record restored: ${deletedRecord.entityType} - ${deletedRecord.entityId} by user ${req.user?.id}`);

    res.json({
      success: true,
      message: `${getEntityTypeLabel(deletedRecord.entityType)} "${deletedRecord.entityName}" has been restored`,
      data: restoredRecord,
    });
  } catch (error: any) {
    logger.error('Failed to restore record:', error);
    res.status(500).json({ 
      error: 'Failed to restore record',
      message: error.message,
    });
  }
});

// Get single deleted record details (for preview)
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const record = await prisma.deletedRecord.findUnique({
      where: { id },
    });

    if (!record) {
      return res.status(404).json({ error: 'Deleted record not found' });
    }

    const now = new Date();
    const expiresAt = new Date(record.expiresAt);
    const remainingMs = expiresAt.getTime() - now.getTime();
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

    res.json({
      success: true,
      data: {
        ...record,
        remainingDays,
      },
    });
  } catch (error: any) {
    logger.error('Failed to fetch deleted record:', error);
    res.status(500).json({ error: 'Failed to fetch deleted record' });
  }
});

// Helper function to get human-readable entity type labels
function getEntityTypeLabel(entityType: string): string {
  const labels: Record<string, string> = {
    lead: 'Lead',
    client: 'Client',
    dealer: 'Dealer',
    deal: 'Deal',
    employee: 'Employee',
    property: 'Property',
    unit: 'Unit',
    tenant: 'Tenant',
    lease: 'Lease',
    communication: 'Communication',
    sale: 'Sale',
    attendance: 'Attendance',
    payroll: 'Payroll',
    leaveRequest: 'Leave Request',
  };
  return labels[entityType] || entityType.charAt(0).toUpperCase() + entityType.slice(1);
}

export default router;

