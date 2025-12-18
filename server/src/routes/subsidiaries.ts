import express, { Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import logger from '../utils/logger';
import { authenticate, AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/error-handler';
import prisma from '../prisma/client';

const router = (express as any).Router();

// Request logging middleware for debugging
router.use((req: any, res: Response, next: any) => {
  logger.info('Subsidiaries route hit', {
    method: req.method,
    path: req.path,
    url: req.url,
    originalUrl: req.originalUrl,
  });
  next();
});

const createOptionSchema = z.object({
  name: z.string().min(1, 'Option name is required'),
  sortOrder: z.number().int().default(0),
});

const createSubsidiarySchema = z.object({
  locationId: z.string().uuid('Invalid location ID'),
  name: z.string().min(1, 'Subsidiary name is required'),
  options: z.array(createOptionSchema).optional(),
});

const updateSubsidiarySchema = z.object({
  name: z.string().min(1).optional(),
});

const updateOptionSchema = z.object({
  name: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
});

// Get all subsidiaries grouped by location
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    logger.info('GET /subsidiaries - Request received', {
      method: req.method,
      path: req.path,
      query: req.query,
      userId: req.user?.id,
    });

    const subsidiaries = await prisma.propertySubsidiary.findMany({
      include: {
        location: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        options: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    logger.info('GET /subsidiaries - Success', {
      count: subsidiaries.length,
      userId: req.user?.id,
    });

    return successResponse(res, subsidiaries);
  } catch (error: any) {
    logger.error('GET /subsidiaries - Error occurred', {
      error: error?.message || 'Unknown error',
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      userId: req.user?.id,
      path: req.path,
      method: req.method,
    });

    // Determine appropriate status code based on error type
    let statusCode = 500;
    if (error?.code === 'P2002' || error?.code === 'P2003') {
      statusCode = 400; // Bad request for constraint violations
    } else if (error instanceof z.ZodError) {
      statusCode = 400; // Bad request for validation errors
    }

    return errorResponse(res, error, statusCode);
  }
});

// Create a new subsidiary - MUST come before /:id routes to avoid route conflicts
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    logger.info('POST /subsidiaries - Request received', {
      method: req.method,
      path: req.path,
      body: req.body,
      userId: req.user?.id,
    });

    const payload = createSubsidiarySchema.parse(req.body);

    // Verify location exists
    const location = await prisma.location.findUnique({
      where: { id: payload.locationId },
    });

    if (!location) {
      return errorResponse(res, 'Location not found', 404);
    }

    // Check if subsidiary with same name already exists for this location
    const existing = await prisma.propertySubsidiary.findUnique({
      where: {
        locationId_name: {
          locationId: payload.locationId,
          name: payload.name,
        },
      },
    });

    if (existing) {
      return errorResponse(res, 'Subsidiary with this name already exists for this location', 409);
    }

    const subsidiary = await prisma.propertySubsidiary.create({
      data: {
        locationId: payload.locationId,
        name: payload.name,
        options: payload.options
          ? {
              create: payload.options.map((opt) => ({
                name: opt.name,
                sortOrder: opt.sortOrder || 0,
              })),
            }
          : undefined,
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        options: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    logger.info('POST /subsidiaries - Success', {
      subsidiaryId: subsidiary.id,
      userId: req.user?.id,
    });

    return successResponse(res, subsidiary, 201);
  } catch (error: any) {
    logger.error('POST /subsidiaries - Error occurred', {
      error: error?.message || 'Unknown error',
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      userId: req.user?.id,
      path: req.path,
      method: req.method,
      body: req.body,
    });

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return errorResponse(res, error, 400);
    }

    // Handle Prisma unique constraint violations
    if (error.code === 'P2002') {
      return errorResponse(res, 'Subsidiary with this name already exists for this location', 409);
    }

    // Handle Prisma validation errors
    if (error instanceof Prisma.PrismaClientValidationError) {
      return errorResponse(res, error, 400);
    }

    // Default error response
    return errorResponse(res, error);
  }
});

// Get subsidiaries for a specific location - MUST come before /:id routes
router.get('/location/:locationId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { locationId } = req.params;

    const subsidiaries = await prisma.propertySubsidiary.findMany({
      where: {
        locationId,
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        options: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return successResponse(res, subsidiaries);
  } catch (error) {
    logger.error('Get subsidiaries by location error:', error);
    return errorResponse(res, error);
  }
});

// Get all options for a location's subsidiaries (for dropdowns) - MUST come before /:id routes
router.get('/location/:locationId/options', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { locationId } = req.params;

    const subsidiaries = await prisma.propertySubsidiary.findMany({
      where: {
        locationId,
      },
      include: {
        options: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    // Flatten all options from all subsidiaries for this location
    const options = subsidiaries.flatMap((sub) =>
      sub.options.map((opt) => ({
        id: opt.id,
        name: opt.name,
        subsidiaryId: sub.id,
        subsidiaryName: sub.name,
        sortOrder: opt.sortOrder,
      }))
    );

    return successResponse(res, options);
  } catch (error) {
    logger.error('Get location options error:', error);
    return errorResponse(res, error);
  }
});

// Get a single subsidiary with its options - MUST come after specific routes
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const subsidiary = await prisma.propertySubsidiary.findUnique({
      where: { id },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        options: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    if (!subsidiary) {
      return errorResponse(res, 'Subsidiary not found', 404);
    }

    return successResponse(res, subsidiary);
  } catch (error) {
    logger.error('Get subsidiary error:', error);
    return errorResponse(res, error);
  }
});

// Update a subsidiary
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const payload = updateSubsidiarySchema.parse(req.body);

    const subsidiary = await prisma.propertySubsidiary.findUnique({
      where: { id },
    });

    if (!subsidiary) {
      return errorResponse(res, 'Subsidiary not found', 404);
    }

    // If name is being updated, check for duplicates
    if (payload.name && payload.name !== subsidiary.name) {
      const existing = await prisma.propertySubsidiary.findUnique({
        where: {
          locationId_name: {
            locationId: subsidiary.locationId,
            name: payload.name,
          },
        },
      });

      if (existing) {
        return errorResponse(res, 'Subsidiary with this name already exists for this location', 409);
      }
    }

    const updated = await prisma.propertySubsidiary.update({
      where: { id },
      data: payload,
      include: {
        location: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        options: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    return successResponse(res, updated);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return errorResponse(res, 'Subsidiary with this name already exists for this location', 409);
    }
    logger.error('Update subsidiary error:', error);
    return errorResponse(res, error);
  }
});

// Delete a subsidiary
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const subsidiary = await prisma.propertySubsidiary.findUnique({
      where: { id },
      include: {
        options: true,
      },
    });

    if (!subsidiary) {
      return errorResponse(res, 'Subsidiary not found', 404);
    }

    // Check if any properties or clients are using options from this subsidiary
    const propertiesCount = await prisma.property.count({
      where: {
        subsidiaryOptionId: {
          in: subsidiary.options.map((opt) => opt.id),
        },
      },
    });

    const clientsCount = await prisma.client.count({
      where: {
        subsidiaryOptionId: {
          in: subsidiary.options.map((opt) => opt.id),
        },
      },
    });

    if (propertiesCount > 0 || clientsCount > 0) {
      return errorResponse(
        res,
        `Cannot delete subsidiary. It is being used by ${propertiesCount} properties and ${clientsCount} clients.`,
        400
      );
    }

    await prisma.propertySubsidiary.delete({
      where: { id },
    });

    return successResponse(res, { message: 'Subsidiary deleted successfully' });
  } catch (error) {
    logger.error('Delete subsidiary error:', error);
    return errorResponse(res, error);
  }
});

// Add an option to a subsidiary
router.post('/:id/options', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const payload = createOptionSchema.parse(req.body);

    const subsidiary = await prisma.propertySubsidiary.findUnique({
      where: { id },
    });

    if (!subsidiary) {
      return errorResponse(res, 'Subsidiary not found', 404);
    }

    // Check if option with same name already exists
    const existing = await prisma.subsidiaryOption.findUnique({
      where: {
        propertySubsidiaryId_name: {
          propertySubsidiaryId: id,
          name: payload.name,
        },
      },
    });

    if (existing) {
      return errorResponse(res, 'Option with this name already exists in this subsidiary', 409);
    }

    const option = await prisma.subsidiaryOption.create({
      data: {
        propertySubsidiaryId: id,
        name: payload.name,
        sortOrder: payload.sortOrder,
      },
    });

    return successResponse(res, option, 201);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return errorResponse(res, 'Option with this name already exists in this subsidiary', 409);
    }
    logger.error('Create option error:', error);
    return errorResponse(res, error);
  }
});

// Update an option
router.put('/options/:optionId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { optionId } = req.params;
    const payload = updateOptionSchema.parse(req.body);

    const option = await prisma.subsidiaryOption.findUnique({
      where: { id: optionId },
    });

    if (!option) {
      return errorResponse(res, 'Option not found', 404);
    }

    // If name is being updated, check for duplicates
    if (payload.name && payload.name !== option.name) {
      const existing = await prisma.subsidiaryOption.findUnique({
        where: {
          propertySubsidiaryId_name: {
            propertySubsidiaryId: option.propertySubsidiaryId,
            name: payload.name,
          },
        },
      });

      if (existing) {
        return errorResponse(res, 'Option with this name already exists in this subsidiary', 409);
      }
    }

    const updated = await prisma.subsidiaryOption.update({
      where: { id: optionId },
      data: payload,
    });

    return successResponse(res, updated);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return errorResponse(res, 'Option with this name already exists in this subsidiary', 409);
    }
    logger.error('Update option error:', error);
    return errorResponse(res, error);
  }
});

// Delete an option
router.delete('/options/:optionId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { optionId } = req.params;

    const option = await prisma.subsidiaryOption.findUnique({
      where: { id: optionId },
    });

    if (!option) {
      return errorResponse(res, 'Option not found', 404);
    }

    // Check if any properties or clients are using this option
    const propertiesCount = await prisma.property.count({
      where: {
        subsidiaryOptionId: optionId,
      },
    });

    const clientsCount = await prisma.client.count({
      where: {
        subsidiaryOptionId: optionId,
      },
    });

    if (propertiesCount > 0 || clientsCount > 0) {
      return errorResponse(
        res,
        `Cannot delete option. It is being used by ${propertiesCount} properties and ${clientsCount} clients.`,
        400
      );
    }

    await prisma.subsidiaryOption.delete({
      where: { id: optionId },
    });

    return successResponse(res, { message: 'Option deleted successfully' });
  } catch (error) {
    logger.error('Delete option error:', error);
    return errorResponse(res, error);
  }
});

export default router;

