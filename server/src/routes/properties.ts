import express from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '../prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createActivity } from '../utils/activity';
import { getAllPropertyAlerts, getMaintenanceDueAlerts, getLeaseExpiryAlerts } from '../services/property-alerts';
import { getSubtreeIds } from '../services/location';
import logger from '../utils/logger';
import { successResponse, errorResponse } from '../utils/error-handler';
import { parsePaginationQuery, calculatePagination } from '../utils/pagination';

const router: express.Router = express.Router();

// Validation schemas
const createPropertySchema = z.object({
  name: z.string().min(1, 'Property name is required'),
  type: z.string().min(1, 'Property type is required'),
  address: z.string().min(1, 'Address is required'),
  location: z.string().optional(),
  locationId: z.string().uuid().nullable().optional(),
  status: z.enum(['Active', 'Maintenance', 'Vacant', 'For Sale', 'For Rent', 'Sold']).optional(),
  imageUrl: z.string().optional().refine(
    (val) => {
      if (!val || val === '') return true;
      return val.startsWith('http') || val.startsWith('/');
    },
    { message: 'Image URL must be a valid URL or relative path starting with /' }
  ),
  description: z.string().optional(),
  yearBuilt: z.number().int().positive().optional(),
  totalArea: z.number().positive().optional(),
  totalUnits: z.number().int().nonnegative().default(0),
  dealerId: z.string().uuid().optional(),
  amenities: z.array(z.string()).optional(), // Array of amenity strings
});

const updatePropertySchema = createPropertySchema.partial();

/**
 * Get all properties with pagination and filtering
 * @route GET /api/properties
 * @access Private
 */
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { status, type, location: locationQuery, locationId, search } = req.query;
    const { page, limit } = parsePaginationQuery(req.query);
    const skip = (page - 1) * limit;

    const where: Prisma.PropertyWhereInput = {
      isDeleted: false,
    };

    if (status) {
      const statusStr = Array.isArray(status) ? status[0] : status;
      where.status = String(statusStr) as 'Active' | 'Maintenance' | 'Vacant' | 'For Sale' | 'For Rent' | 'Sold' | 'Occupied';
    }

    if (type) {
      const typeStr = Array.isArray(type) ? type[0] : type;
      where.type = String(typeStr);
    }

    if (locationQuery) {
      const locationStr = Array.isArray(locationQuery) ? locationQuery[0] : locationQuery;
      where.location = { contains: String(locationStr), mode: 'insensitive' };
    }

    if (locationId) {
      const locationFilterId = Array.isArray(locationId) ? locationId[0] : locationId;
      if (locationFilterId && typeof locationFilterId === 'string') {
        const subtreeIds = await getSubtreeIds(locationFilterId);
        where.locationId = { in: subtreeIds };
      }
    }

    if (search) {
      const searchStr = Array.isArray(search) ? search[0] : search;
      where.OR = [
        { name: { contains: String(searchStr), mode: 'insensitive' } },
        { address: { contains: String(searchStr), mode: 'insensitive' } },
        { location: { contains: String(searchStr), mode: 'insensitive' } },
        // propertyCode search will work after migration
        // { propertyCode: { contains: String(searchStr), mode: 'insensitive' } },
      ];
    }

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: {
          units: {
            where: { isDeleted: false },
            select: {
              id: true,
              unitName: true,
              status: true,
              monthlyRent: true,
            },
          },
          blocks: {
            where: { isDeleted: false },
          },
          locationNode: true,
          _count: {
            select: {
              units: { where: { isDeleted: false } },
              blocks: { where: { isDeleted: false } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.property.count({ where }),
    ]);

    // Extract property IDs for batch queries
    const propertyIds = properties.map(p => p.id);

    // OPTIMIZED: Batch fetch all data instead of N+1 queries
    const [
      unitCounts,
      revenueData,
      incomeTransactions,
      expenseTransactions,
      allInvoices,
      allPayments,
      completedSales,
      outstandingInvoices,
    ] = await Promise.all([
      // Count occupied units per property
      prisma.unit.groupBy({
        by: ['propertyId'],
        where: {
          propertyId: { in: propertyIds },
          status: 'Occupied',
          isDeleted: false,
        },
        _count: true,
      }),
      // Aggregate revenue per property
      prisma.unit.groupBy({
        by: ['propertyId'],
        where: {
          propertyId: { in: propertyIds },
          status: 'Occupied',
          isDeleted: false,
        },
        _sum: { monthlyRent: true },
      }),
      // Get all income transactions
      prisma.transaction.findMany({
        where: {
          propertyId: { in: propertyIds },
          transactionType: 'income',
          status: 'completed',
        },
        include: { transactionCategory: true },
      }),
      // Get all expense transactions
      prisma.transaction.findMany({
        where: {
          propertyId: { in: propertyIds },
          transactionType: 'expense',
          status: 'completed',
        },
      }),
      // Get all invoices
      prisma.invoice.findMany({
        where: { propertyId: { in: propertyIds } },
        select: { id: true, propertyId: true },
      }),
      // Get all payments
      prisma.tenantPayment.findMany({
        where: {
          status: 'completed',
        },
        select: { id: true, invoiceId: true, amount: true },
      }),
      // Get all completed sales
      prisma.sale.findMany({
        where: {
          propertyId: { in: propertyIds },
          status: { in: ['Completed', 'completed'] },
          isDeleted: false,
        },
        select: {
          id: true,
          propertyId: true,
          saleValue: true,
          actualPropertyValue: true,
        },
      }),
      // Get outstanding invoices
      prisma.invoice.findMany({
        where: {
          propertyId: { in: propertyIds },
          status: { in: ['unpaid', 'partial', 'overdue'] },
        },
        select: {
          id: true,
          propertyId: true,
          remainingAmount: true,
          totalAmount: true,
        },
      }),
    ]);

    // Create lookup maps for efficient access
    const unitCountMap = new Map(unitCounts.map(u => [u.propertyId, u._count]));
    const revenueMap = new Map(revenueData.map(r => [r.propertyId, r._sum.monthlyRent || 0]));
    const transactionMap = new Map<string, typeof incomeTransactions>();
    const expenseMap = new Map<string, typeof expenseTransactions>();
    const invoiceMap = new Map<string, typeof allInvoices>();
    const saleMap = new Map<string, typeof completedSales>();
    const outstandingInvoiceMap = new Map<string, typeof outstandingInvoices>();

    // Group transactions by property
    incomeTransactions.forEach(tx => {
      if (!transactionMap.has(tx.propertyId!)) {
        transactionMap.set(tx.propertyId!, []);
      }
      transactionMap.get(tx.propertyId!)!.push(tx);
    });

    expenseTransactions.forEach(tx => {
      if (!expenseMap.has(tx.propertyId!)) {
        expenseMap.set(tx.propertyId!, []);
      }
      expenseMap.get(tx.propertyId!)!.push(tx);
    });

    // Group invoices by property
    allInvoices.forEach(inv => {
      if (!invoiceMap.has(inv.propertyId!)) {
        invoiceMap.set(inv.propertyId!, []);
      }
      invoiceMap.get(inv.propertyId!)!.push(inv);
    });

    // Group sales by property
    completedSales.forEach(sale => {
      if (!saleMap.has(sale.propertyId)) {
        saleMap.set(sale.propertyId, []);
      }
      saleMap.get(sale.propertyId)!.push(sale);
    });

    // Group outstanding invoices by property
    outstandingInvoices.forEach(inv => {
      if (!outstandingInvoiceMap.has(inv.propertyId!)) {
        outstandingInvoiceMap.set(inv.propertyId!, []);
      }
      outstandingInvoiceMap.get(inv.propertyId!)!.push(inv);
    });

    // Create payment lookup by invoice ID
    const paymentMap = new Map<string, typeof allPayments>();
    allPayments.forEach(payment => {
      if (payment.invoiceId) {
        if (!paymentMap.has(payment.invoiceId)) {
          paymentMap.set(payment.invoiceId, []);
        }
        paymentMap.get(payment.invoiceId)!.push(payment);
      }
    });

    // Map results to properties (no additional queries)
    const propertiesWithStats = properties.map(property => {
      const occupiedUnits = unitCountMap.get(property.id) || 0;
      const monthlyRevenueAmount = revenueMap.get(property.id) || 0;
      const yearlyRevenueAmount = monthlyRevenueAmount * 12;

      const propertyIncomeTransactions = transactionMap.get(property.id) || [];
      const propertyExpenseTransactions = expenseMap.get(property.id) || [];
      const propertyInvoices = invoiceMap.get(property.id) || [];
      const invoiceIds = propertyInvoices.map(inv => inv.id);
      const rentPayments = invoiceIds.flatMap(id => paymentMap.get(id) || []);

      // Calculate rent revenue from transactions (excluding sale-related)
      const rentRevenueTransactions = propertyIncomeTransactions.filter((tx) => {
        const categoryName = tx.transactionCategory?.name?.toLowerCase() || '';
        const description = tx.description?.toLowerCase() || '';
        const isSale = categoryName.includes('sale') || 
                      description.includes('sale') ||
                      description.includes('property sale');
        return !isSale;
      });

      const rentRevenueFromTransactions = rentRevenueTransactions.reduce(
        (sum, tx) => sum + (tx.totalAmount || tx.amount || 0), 
        0
      );
      const rentRevenueFromPayments = rentPayments.reduce(
        (sum, payment) => sum + (payment.amount || 0), 
        0
      );
      const rentRevenue = rentRevenueFromTransactions + rentRevenueFromPayments;

      // Calculate sale revenue
      const propertySales = saleMap.get(property.id) || [];
      const saleRevenue = propertySales.reduce((sum, sale) => sum + (sale.saleValue || 0), 0);
      const totalPropertyCost = propertySales.reduce(
        (sum, sale) => sum + (sale.actualPropertyValue || 0), 
        0
      );
      const saleProfit = saleRevenue - totalPropertyCost;

      // Calculate expenses
      const totalExpenses = propertyExpenseTransactions.reduce(
        (sum, tx) => sum + (tx.totalAmount || tx.amount || 0), 
        0
      );
      const rentProfit = rentRevenue - totalExpenses;

      // Calculate outstanding invoices
      const propertyOutstandingInvoices = outstandingInvoiceMap.get(property.id) || [];
      const outstandingInvoicesAmount = propertyOutstandingInvoices.reduce(
        (sum, inv) => sum + (Number(inv.remainingAmount ?? inv.totalAmount ?? 0)), 
        0
      );

      // Extract amenities
      let amenities: string[] = [];
      if (property.documents && typeof property.documents === 'object') {
        const docs = property.documents as { amenities?: string[] };
        if (Array.isArray(docs.amenities)) {
          amenities = docs.amenities;
        }
      }

      return {
        ...property,
        amenities,
        occupied: occupiedUnits,
        units: property._count.units,
        revenue: monthlyRevenueAmount
          ? `Rs ${monthlyRevenueAmount.toLocaleString()}`
          : 'Rs 0',
        monthlyRevenue: monthlyRevenueAmount,
        yearlyRevenue: yearlyRevenueAmount,
        occupancyRate: property._count.units > 0
          ? Math.round((occupiedUnits / property._count.units) * 100 * 10) / 10
          : 0,
        rentRevenue,
        rentProfit,
        saleRevenue,
        saleProfit,
        totalExpenses,
        outstandingInvoices: propertyOutstandingInvoices.length,
        outstandingInvoicesAmount,
      };
    });

    const pagination = calculatePagination(page, limit, total);

    return successResponse(res, propertiesWithStats, 200, pagination);
  } catch (error) {
    logger.error('Get properties error:', error);
    return errorResponse(res, error);
  }
});

// Get property structure (floors with units) - MUST be before /:id route
router.get('/:id/structure', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const property = await prisma.property.findFirst({
      where: { id, isDeleted: false },
      select: {
        id: true,
        name: true,
        propertyCode: true,
      },
    });

    if (!property) {
      return errorResponse(res, 'Property not found', 404);
    }

    const floors = await prisma.floor.findMany({
      where: {
        propertyId: id,
        isDeleted: false,
      },
      include: {
        units: {
          where: { isDeleted: false },
          select: {
            id: true,
            unitName: true,
            status: true,
            monthlyRent: true,
            description: true, // Using description field for unitType temporarily
            floorId: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            unitName: 'asc',
          },
        },
        _count: {
          select: {
            units: { where: { isDeleted: false } },
          },
        },
      },
      orderBy: {
        floorNumber: 'asc',
      },
    });

    return successResponse(res, {
        property: {
          id: property.id,
          name: property.name,
          propertyCode: property.propertyCode,
        },
        floors: floors.map((floor) => ({
          id: floor.id,
          name: floor.name,
          floorNumber: floor.floorNumber,
          description: floor.description,
          units: floor.units,
          unitCount: floor._count.units,
        })),
        summary: {
          totalFloors: floors.length,
          totalUnits: floors.reduce((sum, floor) => sum + floor._count.units, 0),
          occupiedUnits: floors.reduce(
            (sum, floor) =>
              sum + floor.units.filter((u) => u.status === 'Occupied').length,
            0
          ),
          vacantUnits: floors.reduce(
            (sum, floor) =>
              sum + floor.units.filter((u) => u.status === 'Vacant').length,
            0
          ),
      },
    });
  } catch (error) {
    logger.error('Get property structure error:', error);
    return errorResponse(res, error);
  }
});

// Create floor for a property - MUST be before /:id route
router.post('/:id/floors', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, floorNumber, description } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return errorResponse(res, 'Floor name is required', 400);
    }

    const property = await prisma.property.findFirst({
      where: { id, isDeleted: false },
    });

    if (!property) {
      return errorResponse(res, 'Property not found', 404);
    }

    const floor = await prisma.floor.create({
      data: {
        name: name.trim(),
        floorNumber: floorNumber !== undefined ? parseInt(floorNumber) : null,
        propertyId: id,
        description: description || null,
      },
      include: {
        units: true,
        property: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return successResponse(res, floor, 201);
  } catch (error) {
    logger.error('Create floor error:', error);
    return errorResponse(res, error);
  }
});

// Get property by ID
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const property = await prisma.property.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      include: {
        units: {
          where: { isDeleted: false },
          include: {
            tenant: {
              where: { isDeleted: false },
            },
            block: {
              where: { isDeleted: false },
            },
            floor: {
              where: { isDeleted: false },
            },
          },
        },
        blocks: {
          where: { isDeleted: false },
        },
        floors: {
          where: { isDeleted: false },
          include: {
            units: {
              where: { isDeleted: false },
              select: {
                id: true,
                unitName: true,
                status: true,
              },
            },
          },
          orderBy: {
            floorNumber: 'asc',
          },
        },
        sales: {
          where: { isDeleted: false },
          include: {
            buyers: {
              where: { isDeleted: false },
            },
          },
        },
      },
    });

    if (!property) {
      return errorResponse(res, 'Property not found', 404);
    }

    // Calculate stats
    const occupiedUnits = await prisma.unit.count({
      where: {
        propertyId: property.id,
        status: 'Occupied',
        isDeleted: false,
      },
    });

    const totalTenants = await prisma.tenant.count({
      where: {
        unit: {
          propertyId: property.id,
          isDeleted: false,
        },
        isDeleted: false,
      },
    });

    const monthlyRevenue = await prisma.unit.aggregate({
      where: {
        propertyId: property.id,
        status: 'Occupied',
        isDeleted: false,
      },
      _sum: {
        monthlyRent: true,
      },
    });

    const monthlyRevenueAmount = monthlyRevenue._sum.monthlyRent || 0;
    const yearlyRevenueAmount = monthlyRevenueAmount * 12;
    const totalUnits = property.units?.length || 0;
    const occupancyRate = totalUnits > 0
      ? Math.round((occupiedUnits / totalUnits) * 100 * 10) / 10
      : 0;

    // Extract amenities from documents field if stored there
    let amenities: string[] = [];
    if (property.documents && typeof property.documents === 'object') {
      const docs = property.documents as { amenities?: string[] };
      if (Array.isArray(docs.amenities)) {
        amenities = docs.amenities;
      }
    }

    return successResponse(res, {
      ...property,
      amenities, // Add amenities to response
      occupied: occupiedUnits,
      totalTenants,
      revenue: monthlyRevenueAmount,
      monthlyRevenue: monthlyRevenueAmount,
      yearlyRevenue: yearlyRevenueAmount,
      occupancyRate,
    });
  } catch (error) {
    logger.error('Get property error:', error);
    return errorResponse(res, error);
  }
});

/**
 * Get property dashboard
 * @route GET /api/properties/:id/dashboard
 * @access Private
 */
router.get('/:id/dashboard', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { getPropertyDashboard } = await import('../services/analytics');
    const dashboard = await getPropertyDashboard(id);
    return successResponse(res, dashboard);
  } catch (error) {
    logger.error('Get property dashboard error:', error);
    return errorResponse(res, error);
  }
});

// Helper function to generate unique property code
async function generatePropertyCode(): Promise<string | undefined> {
  try {
    let code: string = '';
    let exists = true;
    
    while (exists) {
      // Generate code: PROP-YYYYMMDD-XXXX (4 random digits)
      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const random = Math.floor(1000 + Math.random() * 9000); // 4 digit random
      code = `PROP-${dateStr}-${random}`;
      
      // Check if code already exists (only if propertyCode column exists)
      try {
        const existing = await prisma.property.findUnique({
          where: { propertyCode: code },
        });
        exists = !!existing;
      } catch (err) {
        // If column doesn't exist yet, just return the generated code
        const error = err as { message?: string };
        if (error.message?.includes('propertyCode') || error.message?.includes('Unknown column')) {
          exists = false;
        } else {
          throw err;
        }
      }
    }
    
    return code;
  } catch (err) {
    // If propertyCode column doesn't exist, return undefined
    logger.warn('propertyCode column not available yet, skipping code generation');
    return undefined;
  }
}

/**
 * Create property
 * @route POST /api/properties
 * @access Private
 */
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    logger.debug('Create property request body:', JSON.stringify(req.body, null, 2));
    const data = createPropertySchema.parse(req.body);

    // Generate unique property code (only if column exists)
    const propertyCode = await generatePropertyCode();

    // Store amenities in documents field as JSON if provided
    let documentsData: { amenities: string[] } | null = null;
    if (data.amenities && Array.isArray(data.amenities) && data.amenities.length > 0) {
      documentsData = { amenities: data.amenities };
    }

    const property = await prisma.property.create({
      data: {
        name: data.name,
        type: data.type,
        address: data.address,
        location: data.location,
        status: data.status,
        imageUrl: data.imageUrl || undefined,
        description: data.description,
        yearBuilt: data.yearBuilt,
        totalArea: data.totalArea,
        totalUnits: data.totalUnits,
        dealerId: data.dealerId,
        locationId: data.locationId ?? null,
        ...(propertyCode && { propertyCode }),
        ...(documentsData && { documents: documentsData }),
      },
      include: {
        units: true,
        blocks: true,
      },
    });

    // Log activity
    await createActivity({
      type: 'property',
      action: 'created',
      entityId: property.id,
      entityName: property.name,
      message: `Property "${property.name}" was added`,
      userId: req.user?.id,
      metadata: {
        propertyId: property.id,
        propertyName: property.name,
        status: property.status,
        type: property.type,
      },
    });

    return successResponse(res, property, 201);
  } catch (error) {
    logger.error('Create property error:', error);
    return errorResponse(res, error);
  }
});

/**
 * Update property
 * @route PUT /api/properties/:id
 * @access Private
 */
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const data = updatePropertySchema.parse(req.body);

    // Check if property exists
    const existingProperty = await prisma.property.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existingProperty) {
      return errorResponse(res, 'Property not found', 404);
    }

    // Handle amenities in update
    const updateData: Prisma.PropertyUpdateInput = { ...data };
    if (data.amenities && Array.isArray(data.amenities)) {
      // Use existingProperty already fetched above
      let documentsData: { amenities?: string[] } = {};
      if (existingProperty.documents && typeof existingProperty.documents === 'object') {
        documentsData = existingProperty.documents as { amenities?: string[] };
      }
      documentsData.amenities = data.amenities;
      updateData.documents = documentsData;
      // Remove amenities from updateData as it's not a direct field
      delete (updateData as { amenities?: unknown }).amenities;
    }

    if ('locationId' in data) {
      updateData.location = data.locationId ?? null;
    }

    const property = await prisma.property.update({
      where: { id },
      data: {
        ...updateData,
        imageUrl: data.imageUrl !== undefined ? (data.imageUrl || null) : undefined,
      },
      include: {
        units: {
          where: { isDeleted: false },
        },
        blocks: {
          where: { isDeleted: false },
        },
        locationNode: true,
      },
    });

    // Extract amenities from documents field if stored there
    let amenities: string[] = [];
    if (property.documents && typeof property.documents === 'object') {
      const docs = property.documents as { amenities?: string[] };
      if (Array.isArray(docs.amenities)) {
        amenities = docs.amenities;
      }
    }

    return successResponse(res, {
      ...property,
      amenities, // Add amenities to response
    });
  } catch (error) {
    logger.error('Update property error:', error);
    return errorResponse(res, error);
  }
});

// Delete property (soft delete)
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const property = await prisma.property.findFirst({
      where: { id, isDeleted: false },
      include: {
        units: { where: { isDeleted: false } },
        blocks: { where: { isDeleted: false } },
        floors: { where: { isDeleted: false } },
        tenancies: { where: { status: 'active' } },
      },
    });

    if (!property) {
      return errorResponse(res, 'Property not found', 404);
    }

    // Use transaction to ensure all deletions happen together
    await prisma.$transaction(async (tx) => {
      // Soft delete all units related to this property
      await tx.unit.updateMany({
        where: {
          propertyId: id,
          isDeleted: false,
        },
        data: { 
          isDeleted: true,
          status: 'Vacant', // Also set status to Vacant
        },
      });

      // Soft delete all blocks related to this property
      await tx.block.updateMany({
        where: {
          propertyId: id,
          isDeleted: false,
        },
        data: { isDeleted: true },
      });

      // Soft delete all floors related to this property
      await tx.floor.updateMany({
        where: {
          propertyId: id,
          isDeleted: false,
        },
        data: { isDeleted: true },
      });

      // Soft delete property
      await tx.property.update({
        where: { id },
        data: { isDeleted: true },
      });

      // Update all units to Vacant status if they were occupied (already done above, but keeping for clarity)
      // This is redundant now but kept for backward compatibility

      // End all active tenancies
      await tx.tenancy.updateMany({
        where: {
          propertyId: id,
          status: 'active',
        },
        data: { status: 'ended' },
      });
    });

    // Log activity
    await createActivity({
      type: 'property',
      action: 'deleted',
      entityId: property.id,
      entityName: property.name,
      message: `Property "${property.name}" was deleted along with ${property.units.length} units, ${property.blocks.length} blocks, and ${property.floors.length} floors`,
      userId: req.user?.id,
      metadata: {
        propertyId: property.id,
        propertyName: property.name,
        unitsDeleted: property.units.length,
        blocksDeleted: property.blocks.length,
        floorsDeleted: property.floors.length,
        tenanciesEnded: property.tenancies.length,
      },
    });

    return successResponse(res, {
        unitsDeleted: property.units.length,
        blocksDeleted: property.blocks.length,
        floorsDeleted: property.floors.length,
        tenanciesEnded: property.tenancies.length,
    });
  } catch (error) {
    logger.error('Delete property error:', error);
    return errorResponse(res, error);
  }
});

// Get property alerts (maintenance due + lease expiry)
router.get('/:id/alerts', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const property = await prisma.property.findFirst({
      where: { id, isDeleted: false },
    });

    if (!property) {
      return errorResponse(res, 'Property not found', 404);
    }

    const alerts = await getAllPropertyAlerts(id);

    return successResponse(res, alerts);
  } catch (error) {
    logger.error('Get property alerts error:', error);
    return errorResponse(res, error);
  }
});

// Get all maintenance due alerts
router.get('/alerts/maintenance', authenticate, async (req: AuthRequest, res) => {
  try {
    const { propertyId } = req.query;

    const alerts = await getMaintenanceDueAlerts(
      propertyId ? (propertyId as string) : undefined
    );

    return successResponse(res, alerts);
  } catch (error) {
    logger.error('Get maintenance alerts error:', error);
    return errorResponse(res, error);
  }
});

// Get all lease expiry alerts
router.get('/alerts/lease-expiry', authenticate, async (req: AuthRequest, res) => {
  try {
    const { propertyId } = req.query;

    const alerts = await getLeaseExpiryAlerts(
      propertyId ? (propertyId as string) : undefined
    );

    return successResponse(res, alerts);
  } catch (error) {
    logger.error('Get lease expiry alerts error:', error);
    return errorResponse(res, error);
  }
});

export default router;

