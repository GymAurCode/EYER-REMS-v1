import express, { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../services/audit-log';
import { errorResponse, successResponse } from '../utils/error-handler';
import { getLocationTree } from '../services/location';
import { LocationTreeNode } from '../services/location';

const router = (express as any).Router();

// Helper function to build full path for a location
const buildLocationPath = (nodes: LocationTreeNode[], targetId: string): string[] => {
  for (const node of nodes) {
    if (node.id === targetId) {
      return [node.name];
    }
    const childPath = buildLocationPath(node.children, targetId);
    if (childPath.length > 0) {
      return [node.name, ...childPath];
    }
  }
  return [];
};

// GET all subsidiaries with their locations
router.get('/', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const tree = await getLocationTree();
    const subsidiaries = await prisma.propertySubsidiary.findMany({
      include: {
        location: true,
        options: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Add full path to each subsidiary
    const subsidiariesWithPaths = subsidiaries.map((sub) => {
      const path = buildLocationPath(tree, sub.locationId);
      return {
        ...sub,
        locationPath: path.join(' > '),
      };
    });

    return successResponse(res, subsidiariesWithPaths);
  } catch (error) {
    return errorResponse(res, error);
  }
});

// GET subsidiaries by location ID
router.get('/location/:locationId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { locationId } = req.params;
    const subsidiaries = await prisma.propertySubsidiary.findMany({
      where: { locationId },
      include: {
        location: true,
        options: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(res, subsidiaries);
  } catch (error) {
    return errorResponse(res, error);
  }
});

// GET single subsidiary by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const subsidiary = await prisma.propertySubsidiary.findUnique({
      where: { id },
      include: {
        location: true,
        options: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!subsidiary) {
      return errorResponse(res, 'Subsidiary not found', 404);
    }

    return successResponse(res, subsidiary);
  } catch (error) {
    return errorResponse(res, error);
  }
});

const createSubsidiarySchema = z.object({
  locationId: z.string().uuid('Location ID must be a valid UUID'),
  options: z.array(z.string().min(1, 'Option name cannot be empty')).min(1, 'At least one option is required'),
});

// POST create subsidiary
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const payload = createSubsidiarySchema.parse(req.body);

    // Check if location exists
    const location = await prisma.location.findUnique({
      where: { id: payload.locationId },
    });

    if (!location) {
      return errorResponse(res, 'Location not found', 404);
    }

    // Check if subsidiary already exists for this location
    const existing = await prisma.propertySubsidiary.findFirst({
      where: { locationId: payload.locationId },
    });

    if (existing) {
      return errorResponse(res, 'Subsidiary already exists for this location. Please update the existing one instead.', 400);
    }

    // Create subsidiary with options in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const subsidiary = await tx.propertySubsidiary.create({
        data: {
          locationId: payload.locationId,
          name: location.name, // Store location name for quick reference
        },
      });

      // Create all options
      const options = await Promise.all(
        payload.options.map((optionName, index) =>
          tx.subsidiaryOption.create({
            data: {
              propertySubsidiaryId: subsidiary.id,
              name: optionName.trim(),
              sortOrder: index,
            },
          })
        )
      );

      return { subsidiary, options };
    });

    await createAuditLog({
      entityType: 'property_subsidiary',
      entityId: result.subsidiary.id,
      action: 'create',
      description: `Subsidiary created for location ${location.name} with ${payload.options.length} options`,
      newValues: result,
      userId: req.user?.id,
      userName: req.user?.username,
      req,
    });

    return successResponse(res, result, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(res, error.errors[0].message, 400);
    }
    return errorResponse(res, error);
  }
});

const updateSubsidiarySchema = z.object({
  options: z.array(z.string().min(1, 'Option name cannot be empty')).min(1, 'At least one option is required'),
});

// PUT update subsidiary (only options can be updated)
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const payload = updateSubsidiarySchema.parse(req.body);

    const existing = await prisma.propertySubsidiary.findUnique({
      where: { id },
      include: { options: true },
    });

    if (!existing) {
      return errorResponse(res, 'Subsidiary not found', 404);
    }

    // Update in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing options
      await tx.subsidiaryOption.deleteMany({
        where: { propertySubsidiaryId: id },
      });

      // Create new options
      const options = await Promise.all(
        payload.options.map((optionName, index) =>
          tx.subsidiaryOption.create({
            data: {
              propertySubsidiaryId: id,
              name: optionName.trim(),
              sortOrder: index,
            },
          })
        )
      );

      return { subsidiary: existing, options };
    });

    await createAuditLog({
      entityType: 'property_subsidiary',
      entityId: id,
      action: 'update',
      description: `Subsidiary updated with ${payload.options.length} options`,
      oldValues: existing,
      newValues: result,
      userId: req.user?.id,
      userName: req.user?.username,
      req,
    });

    return successResponse(res, result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(res, error.errors[0].message, 400);
    }
    return errorResponse(res, error);
  }
});

// DELETE subsidiary
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.propertySubsidiary.findUnique({
      where: { id },
      include: { location: true, options: true },
    });

    if (!existing) {
      return errorResponse(res, 'Subsidiary not found', 404);
    }

    // Check if any properties use this subsidiary
    const propertiesCount = await prisma.property.count({
      where: { propertySubsidiaryId: id },
    });

    if (propertiesCount > 0) {
      return errorResponse(
        res,
        `Cannot delete subsidiary. ${propertiesCount} propert${propertiesCount === 1 ? 'y' : 'ies'} use this subsidiary.`,
        400
      );
    }

    await prisma.propertySubsidiary.delete({
      where: { id },
    });

    await createAuditLog({
      entityType: 'property_subsidiary',
      entityId: id,
      action: 'delete',
      description: `Subsidiary deleted for location ${existing.location.name}`,
      oldValues: existing,
      userId: req.user?.id,
      userName: req.user?.username,
      req,
    });

    return successResponse(res, { message: 'Subsidiary deleted successfully' });
  } catch (error) {
    return errorResponse(res, error);
  }
});

// GET all locations with full paths for dropdown
router.get('/locations/with-paths', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const tree = await getLocationTree();

    const buildPathsRecursive = (nodes: LocationTreeNode[]): Array<{ id: string; path: string }> => {
      const result: Array<{ id: string; path: string }> = [];
      for (const node of nodes) {
        const path = buildLocationPath(tree, node.id);
        result.push({ id: node.id, path: path.join(' > ') });
        if (node.children.length > 0) {
          result.push(...buildPathsRecursive(node.children));
        }
      }
      return result;
    };

    const locationsWithPaths = buildPathsRecursive(tree);
    return successResponse(res, locationsWithPaths);
  } catch (error) {
    return errorResponse(res, error);
  }
});

// GET subsidiary options for a location
router.get('/location/:locationId/options', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { locationId } = req.params;
    const subsidiary = await prisma.propertySubsidiary.findFirst({
      where: { locationId },
      include: {
        options: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!subsidiary) {
      return successResponse(res, []);
    }

    return successResponse(res, subsidiary.options);
  } catch (error) {
    return errorResponse(res, error);
  }
});

export default router;

