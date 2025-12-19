import express, { Response } from 'express';
import { z, ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '../prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createActivity } from '../utils/activity';
import { getAllPropertyAlerts, getMaintenanceDueAlerts, getLeaseExpiryAlerts } from '../services/property-alerts';
import { getSubtreeIds } from '../services/location';
import logger from '../utils/logger';
import { successResponse, errorResponse } from '../utils/error-handler';
import { parsePaginationQuery, calculatePagination } from '../utils/pagination';
import { generatePropertyReportPDF } from '../utils/pdf-generator';
import { validateTID } from '../services/id-generation-service';
import { generatePropertyCode } from '../utils/code-generator';

// Helper function to check if a column exists in a table
const columnExists = async (tableName: string, columnName: string): Promise<boolean> => {
  try {
    const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND LOWER(table_name) = LOWER(${tableName})
          AND LOWER(column_name) = LOWER(${columnName})
      ) AS "exists";
    `;
    return Boolean(rows[0]?.exists);
  } catch (error) {
    logger.warn(`Error checking if column ${columnName} exists in ${tableName}:`, error);
    return false;
  }
};

const router = (express as any).Router();

// Validation schemas
const createPropertySchema = z.object({
  tid: z.string().min(1, 'TID is required').optional(),
  name: z.string().min(1, 'Property name is required'),
  type: z.string().min(1, 'Property type is required'),
  address: z.string().min(1, 'Address is required'),
  location: z.string().optional(),
  locationId: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : val),
    z.string().uuid().nullable().optional()
  ),
  subsidiaryOptionId: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : val),
    z.string().uuid().nullable().optional()
  ),
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
  dealerId: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    z.string().uuid().optional()
  ),
  salePrice: z.number().nonnegative().optional(),
  amenities: z.array(z.string()).optional(), // Array of amenity strings
});

const updatePropertySchema = createPropertySchema.partial();

/**
 * Get all properties with pagination and filtering
 * @route GET /api/properties
 * @access Private
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, type, location: locationQuery, locationId, search } = req.query;
    
    // Validate pagination parameters with better error handling
    let page: number;
    let limit: number;
    try {
      const pagination = parsePaginationQuery(req.query);
      page = pagination.page;
      limit = pagination.limit;
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Invalid pagination parameters:', { query: req.query, errors: error.errors });
        return errorResponse(
          res,
          'Invalid pagination parameters. Page and limit must be positive integers. Limit cannot exceed 100.',
          400,
          error.errors.map((e) => ({ path: e.path.join('.'), message: e.message }))
        );
      }
      throw error;
    }
    
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
        // Validate UUID format before calling getSubtreeIds
        try {
          z.string().uuid().parse(locationFilterId);
        } catch (error) {
          logger.warn('Invalid locationId format:', { locationId: locationFilterId });
          return errorResponse(
            res,
            `Invalid locationId format. Expected a valid UUID, but received: ${locationFilterId}`,
            400
          );
        }
        
        try {
          const subtreeIds = await getSubtreeIds(locationFilterId);
          if (subtreeIds.length === 0) {
            // Location doesn't exist or has no subtree
            logger.warn('Location not found or empty subtree:', { locationId: locationFilterId });
            where.locationId = { in: [] }; // Return empty results
          } else {
            where.locationId = { in: subtreeIds };
          }
        } catch (error: any) {
          logger.error('Error fetching subtree IDs:', { error, locationId: locationFilterId });
          // If it's a database error, return 400; otherwise return 500
          const statusCode = error?.code?.startsWith('P') ? 400 : 500;
          return errorResponse(
            res,
            `Failed to fetch location subtree: ${error?.message || 'Unknown error'}`,
            statusCode
          );
        }
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

    // Build include object - try with locationNode first, fallback if P2022 error
    const baseInclude = {
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
      _count: {
        select: {
          units: { where: { isDeleted: false } },
          blocks: { where: { isDeleted: false } },
        },
      },
    };

    let properties: any[];
    let total: number;
    
    // Check if tid column exists - if not, we'll use select to exclude it
    const tidColumnExists = await columnExists('Property', 'tid');
    // Check if propertySubsidiaryId column exists - if not, we'll exclude it from select
    const propertySubsidiaryIdExists = await columnExists('Property', 'propertySubsidiaryId');
    // Check if subsidiaryOptionId column exists - if not, we'll exclude it from select
    const subsidiaryOptionIdExists = await columnExists('Property', 'subsidiaryOptionId');
    
    // If any column is missing, use select from the start to avoid errors
    const needsSelect = !tidColumnExists || !propertySubsidiaryIdExists || !subsidiaryOptionIdExists;
    
    // Helper function to build select fields
    const buildSelectFields = () => {
      const selectFields: any = {
        id: true,
        name: true,
        type: true,
        address: true,
        location: true,
        status: true,
        imageUrl: true,
        description: true,
        yearBuilt: true,
        totalArea: true,
        totalUnits: true,
        dealerId: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true,
        propertyCode: true,
        city: true,
        documents: true,
        ownerName: true,
        ownerPhone: true,
        previousTenants: true,
        rentAmount: true,
        rentEscalationPercentage: true,
        securityDeposit: true,
        size: true,
        title: true,
        locationId: true,
        manualUniqueId: true,
        units: baseInclude.units,
        blocks: baseInclude.blocks,
        _count: baseInclude._count,
      };
      // Only include columns if they exist
      if (tidColumnExists) {
        selectFields.tid = true;
      }
      if (propertySubsidiaryIdExists) {
        selectFields.propertySubsidiaryId = true;
      }
      if (subsidiaryOptionIdExists) {
        selectFields.subsidiaryOptionId = true;
      }
      return selectFields;
    };
    
    try {
      if (needsSelect) {
        // Use select if any columns are missing (silently handled - no need to log on every request)
        [properties, total] = await Promise.all([
          prisma.property.findMany({
            where,
            select: buildSelectFields(),
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
          }),
          prisma.property.count({ where }),
        ]);
      } else {
        // Try with locationNode included (only if all columns exist)
        [properties, total] = await Promise.all([
          prisma.property.findMany({
            where,
            include: {
              ...baseInclude,
              locationNode: true,
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
          }),
          prisma.property.count({ where }),
        ]);
      }
    } catch (error: any) {
      // If P2022 error (column not found), handle gracefully
      if (error?.code === 'P2022' || error?.message?.includes('column') || error?.message?.includes('does not exist')) {
        const errorMessage = error?.message || '';
        const isLocationError = errorMessage.includes('Location') || errorMessage.includes('locationNode');
        
        if (isLocationError && !needsSelect) {
          // Try without locationNode (only if we haven't already used select)
          logger.warn('LocationNode relation not available, fetching without it:', error.message);
          try {
            [properties, total] = await Promise.all([
              prisma.property.findMany({
                where,
                include: baseInclude,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
              }),
              prisma.property.count({ where }),
            ]);
          } catch (retryError: any) {
            // If still failing, fall back to select
            logger.warn('Fallback to select after include failed:', retryError.message);
            [properties, total] = await Promise.all([
              prisma.property.findMany({
                where,
                select: buildSelectFields(),
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
              }),
              prisma.property.count({ where }),
            ]);
          }
        } else {
          // Use select as fallback for any column error
          logger.warn('Column error detected, using select to exclude missing columns:', error.message);
          [properties, total] = await Promise.all([
            prisma.property.findMany({
              where,
              select: buildSelectFields(),
              orderBy: { createdAt: 'desc' },
              skip,
              take: limit,
            }),
            prisma.property.count({ where }),
          ]);
        }
      } else {
        throw error;
      }
    }

    // Extract property IDs for batch queries
    const propertyIds = properties.map(p => p.id);

    // OPTIMIZED: Batch fetch all data instead of N+1 queries
    // Skip batch queries if no properties to avoid database errors with empty arrays
    const [
      unitCounts,
      revenueData,
      incomeTransactions,
      expenseTransactions,
      allInvoices,
      allPayments,
      completedSales,
      outstandingInvoices,
    ] = propertyIds.length > 0 ? await Promise.all([
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
    ]) : [[], [], [], [], [], [], [], []];

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
      const rawDocuments = property.documents && typeof property.documents === 'object' ? (property.documents as { amenities?: string[]; salePrice?: number }) : null;
      const salePrice = rawDocuments?.salePrice;

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
      if (rawDocuments && Array.isArray(rawDocuments.amenities)) {
        amenities = rawDocuments.amenities;
      }

      return {
        ...property,
        ...(salePrice !== undefined ? { salePrice } : {}),
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
    logger.error('Get properties error:', {
      error: error instanceof Error ? error.message : error,
      code: (error as any)?.code,
      meta: (error as any)?.meta,
      stack: error instanceof Error ? error.stack : undefined,
      query: req.query,
    });
    return errorResponse(res, error);
  }
});

// Get property structure (floors with units) - MUST be before /:id route
router.get('/:id/structure', authenticate, async (req: AuthRequest, res: Response) => {
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
router.post('/:id/floors', authenticate, async (req: AuthRequest, res: Response) => {
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
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
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
        deals: {
          where: { isDeleted: false },
          include: {
            payments: true,
            dealer: true,
            client: true,
            paymentPlan: {
              include: {
                installments: {
                  where: { isDeleted: false },
                  orderBy: { dueDate: 'asc' },
                },
              },
            },
          },
        },
        tenancies: {
          where: { isDeleted: false },
          include: {
            tenant: true,
            lease: true,
          },
        },
      },
    });

    if (!property) {
      return errorResponse(res, 'Property not found', 404);
    }

    const rawDocuments =
      property.documents && typeof property.documents === 'object'
        ? (property.documents as { amenities?: string[]; salePrice?: number })
        : null;
    const salePrice = rawDocuments?.salePrice;

    // Active deals with payment progress
    const activeDeals = (property.deals || []).filter(
      (deal: any) =>
        !deal.isDeleted &&
        (deal.status || '').toLowerCase() !== 'closed' &&
        (deal.status || '').toLowerCase() !== 'lost' &&
        (deal.status || '').toLowerCase() !== 'cancelled'
    );

    const dealSummaries = activeDeals.map((deal: any) => {
      const received = (deal.payments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      const pending = Math.max(0, (deal.dealAmount || 0) - received);
      return {
        id: deal.id,
        title: deal.title,
        amount: deal.dealAmount || 0,
        received,
        pending,
        status: deal.status,
        stage: deal.stage,
        dealerName: deal.dealer?.name,
        clientName: deal.client?.name,
        createdAt: deal.createdAt,
      };
    });

    const totalDealReceived = dealSummaries.reduce((sum: number, d: { received: number }) => sum + d.received, 0);
    const totalDealPending = dealSummaries.reduce((sum: number, d: { pending: number }) => sum + d.pending, 0);

    // Get deal IDs for this property
    const dealIds = property.deals?.map((d: any) => d.id) || [];

    // Finance summary (aggregated) and latest finance entries - query through Deal relationship
    const [incomeAgg, expenseAgg, financeEntries] = await Promise.all([
      prisma.financeLedger.aggregate({
        where: { 
          dealId: { in: dealIds },
          isDeleted: false, 
          transactionType: 'credit' 
        },
        _sum: { amount: true },
      }),
      prisma.financeLedger.aggregate({
        where: { 
          dealId: { in: dealIds },
          isDeleted: false, 
          transactionType: 'debit' 
        },
        _sum: { amount: true },
      }),
      prisma.financeLedger.findMany({
        where: { 
          dealId: { in: dealIds },
          isDeleted: false 
        },
        orderBy: { date: 'desc' },
        take: 10,
      }),
    ]);
    const ledgerIncome = incomeAgg._sum?.amount || 0;
    const ledgerExpenses = expenseAgg._sum?.amount || 0;
    const financeRecords = financeEntries.map((entry: any) => ({
      id: entry.id,
      amount: entry.amount,
      transactionType: entry.transactionType,
      purpose: entry.purpose,
      referenceType: entry.referenceType,
      description: entry.description,
      date: entry.date,
    }));
    // Get dealer ledger data if property has a dealer
    let dealerLedger: any[] = []
    if (property.dealerId) {
      // Get dealer ledger entries for this property's dealer
      try {
        const dealerLedgerEntries = await prisma.dealerLedger.findMany({
          where: {
            dealerId: property.dealerId,
          },
          orderBy: { date: 'desc' },
          take: 20, // Limit to recent 20 entries
        })

        dealerLedger = dealerLedgerEntries.map((entry) => ({
          id: entry.id,
          date: entry.date,
          description: entry.description || '',
          // Use debit/credit if available, otherwise use amount
          debit: (entry as any).debit || 0,
          credit: (entry as any).credit || 0,
          balance: entry.balance || (entry as any).amount || 0,
        }))
      } catch (err) {
        // Dealer ledger table might not exist or have different structure
        console.warn('Dealer ledger not available:', err)
        dealerLedger = []
      }
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

    // Calculate Total Due and Total Outstanding from payment plans
    let totalDue = 0;
    let totalOutstanding = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    for (const deal of property.deals || []) {
      if (deal.paymentPlan) {
        for (const installment of deal.paymentPlan.installments) {
          const installmentRemaining = installment.amount - (installment.paidAmount || 0);
          totalOutstanding += installmentRemaining;

          if (installment.dueDate <= today && installment.status !== 'Paid') {
            totalDue += installmentRemaining;
          }
        }
      } else {
        // Fallback for deals without a payment plan (should not happen if plans are mandatory)
        const dealTotalPaid = (deal.payments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        const dealRemaining = Math.max(0, (deal.dealAmount || 0) - dealTotalPaid);
        totalOutstanding += dealRemaining;
        // For simplicity, if no payment plan, consider all remaining as due if deal is active
        if (deal.status !== 'closed' && deal.status !== 'lost' && deal.status !== 'cancelled') {
          totalDue += dealRemaining;
        }
      }
    }

    // Fetch dealer information if dealerId exists
    let dealer = null;
    if (property.dealerId) {
      try {
        const dealerData = await prisma.dealer.findUnique({
          where: { id: property.dealerId },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
            commissionRate: true,
          },
        });
        dealer = dealerData;
      } catch (err) {
        console.warn('Failed to fetch dealer for property:', err);
      }
    }

    return successResponse(res, {
      ...property,
      dealer, // Include dealer information
      ...(salePrice !== undefined ? { salePrice } : {}),
      amenities, // Add amenities to response
      occupied: occupiedUnits,
      totalTenants,
      revenue: monthlyRevenueAmount,
      monthlyRevenue: monthlyRevenueAmount,
      yearlyRevenue: yearlyRevenueAmount,
      occupancyRate,
      financeSummary: {
        totalReceived: ledgerIncome + totalDealReceived,
        totalExpenses: ledgerExpenses,
        pendingAmount: totalDealPending,
        entryCount: financeRecords.length,
        totalDue,
        totalOutstanding,
      },
      financeRecords,
      activeDeals: dealSummaries,
      dealerLedger,
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
router.get('/:id/dashboard', authenticate, async (req: AuthRequest, res: Response) => {
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

/**
 * Upload property document
 * @route POST /api/property/upload-document
 * @access Private
 */
router.post('/upload-document', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { file, filename, propertyId } = req.body;

    if (!file || !propertyId) {
      return res.status(400).json({
        success: false,
        error: 'File data and propertyId are required',
      });
    }

    const dataUrlMatch = file.match(/^data:(.+);base64,(.+)$/);
    if (!dataUrlMatch) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file format. Expected base64 data URL.',
      });
    }

    const mimeType = dataUrlMatch[1];
    const base64Data = dataUrlMatch[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Validate file type (PDF, JPG, PNG only)
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(mimeType.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Only PDF, JPG, and PNG files are allowed',
      });
    }

    // Validate file using security utilities
    const { validateFileUpload } = await import('../utils/file-security');
    const validation = await validateFileUpload(
      buffer,
      mimeType,
      filename
    );

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error || 'File validation failed',
      });
    }

    // Save file securely
    const { saveFileSecurely } = await import('../utils/file-security');
    const { relativePath, filename: secureFilename } = await saveFileSecurely(
      buffer,
      filename || `property-document-${Date.now()}.${mimeType.split('/')[1]}`,
      'properties',
      req.user!.id
    );

    // Store attachment metadata in database
    const attachment = await prisma.attachment.create({
      data: {
        fileName: secureFilename,
        fileUrl: relativePath,
        fileType: mimeType,
        fileSize: buffer.length,
        entityType: 'property',
        entityId: propertyId,
        propertyId: propertyId,
        uploadedBy: req.user!.id,
        description: `Property document: ${filename || secureFilename}`,
      },
    });

    res.json({
      success: true,
      data: {
        id: attachment.id,
        url: relativePath,
        filename: secureFilename,
      },
    });
  } catch (error: any) {
    logger.error('Upload property document error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload document',
    });
  }
});

/**
 * Get property documents
 * @route GET /api/property/documents/:propertyId
 * @access Private
 */
router.get('/documents/:propertyId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { propertyId } = req.params;

    const documents = await prisma.attachment.findMany({
      where: {
        entityType: 'property',
        entityId: propertyId,
        propertyId: propertyId,
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: documents,
    });
  } catch (error: any) {
    logger.error('Get property documents error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get documents',
    });
  }
});

// Generate PDF report for a property
router.get('/:id/report', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const property = await prisma.property.findFirst({
      where: { id, isDeleted: false },
      include: {
        units: { where: { isDeleted: false } },
        deals: {
          where: { isDeleted: false, deletedAt: null },
          include: { payments: true, dealer: true, client: true },
        },
        sales: {
          where: { isDeleted: false },
          include: { buyers: true, dealer: true },
        },
      },
    });

    if (!property) {
      return errorResponse(res, 'Property not found', 404);
    }

    const rawDocuments =
      property.documents && typeof property.documents === 'object'
        ? (property.documents as { amenities?: string[]; salePrice?: number })
        : null;
    const salePrice = rawDocuments?.salePrice ?? undefined;

    const dealer = property.dealerId
      ? await prisma.dealer.findUnique({
          where: { id: property.dealerId },
          select: { name: true, email: true, phone: true },
        })
      : null;

    // Get deal IDs for this property
    const propertyDeals = await prisma.deal.findMany({
      where: { propertyId: id, isDeleted: false },
      select: { id: true },
    });
    const dealIds = propertyDeals.map((d) => d.id);

    // Finance data (aggregated + recent entries) - query through Deal relationship
    const [incomeAgg, expenseAgg, financeEntries] = await Promise.all([
      prisma.financeLedger.aggregate({
        where: { 
          dealId: { in: dealIds },
          isDeleted: false, 
          transactionType: 'credit' 
        },
        _sum: { amount: true },
      }),
      prisma.financeLedger.aggregate({
        where: { 
          dealId: { in: dealIds },
          isDeleted: false, 
          transactionType: 'debit' 
        },
        _sum: { amount: true },
      }),
      prisma.financeLedger.findMany({
        where: { 
          dealId: { in: dealIds },
          isDeleted: false 
        },
        orderBy: { date: 'desc' },
        take: 20,
      }),
    ]);
    const ledgerIncome = incomeAgg._sum?.amount || 0;
    const ledgerExpenses = expenseAgg._sum?.amount || 0;
    const financeRecords = financeEntries.map((entry) => ({
      id: entry.id,
      amount: entry.amount,
      transactionType: entry.transactionType,
      purpose: entry.purpose,
      referenceType: entry.referenceType,
      description: entry.description,
      date: entry.date,
    }));

    // Deals
    const activeDeals = (property.deals || []).filter(
      (deal: any) =>
        !deal.isDeleted &&
        (deal.status || '').toLowerCase() !== 'closed' &&
        (deal.status || '').toLowerCase() !== 'lost' &&
        (deal.status || '').toLowerCase() !== 'cancelled'
    );
    const dealSummaries = activeDeals.map((deal: any) => {
      const received = (deal.payments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      const pending = Math.max(0, (deal.dealAmount || 0) - received);
      return {
        id: deal.id,
        title: deal.title,
        amount: deal.dealAmount || 0,
        received,
        pending,
        status: deal.status,
        stage: deal.stage,
        dealerName: deal.dealer?.name,
        clientName: deal.client?.name,
        createdAt: deal.createdAt,
      };
    });
    const totalDealReceived = dealSummaries.reduce((sum, d) => sum + d.received, 0);
    const totalDealPending = dealSummaries.reduce((sum, d) => sum + d.pending, 0);

    // Fetch payment plans for all active deals
    const paymentPlans: any[] = [];
    for (const deal of activeDeals) {
      try {
        const paymentPlan = await prisma.paymentPlan.findUnique({
          where: { dealId: deal.id },
          include: {
            installments: {
              where: { isDeleted: false },
              orderBy: { installmentNumber: 'asc' },
            },
            client: {
              select: { name: true, clientCode: true },
            },
          },
        });

        if (paymentPlan) {
          paymentPlans.push({
            dealId: deal.id,
            dealTitle: deal.title,
            clientName: paymentPlan.client?.name || deal.client?.name || 'N/A',
            installments: paymentPlan.installments.map((inst: any) => ({
              installmentNumber: inst.installmentNumber,
              amount: inst.amount,
              dueDate: inst.dueDate,
              paidAmount: inst.paidAmount || 0,
              status: inst.status,
              paidDate: inst.paidDate,
              remainingBalance: Math.max(0, inst.amount - (inst.paidAmount || 0)),
            })),
          });
        }
      } catch (err) {
        console.warn(`Failed to fetch payment plan for deal ${deal.id}:`, err);
      }
    }

    // Sales / booking details
    const saleEntries = (property.sales || []).map((sale: any) => ({
      id: sale.id,
      saleValue: sale.saleValue || sale.salePrice || sale.amount || null,
      saleDate: sale.saleDate,
      buyerName:
        sale.buyers && sale.buyers.length > 0 ? sale.buyers.map((b: any) => b.name).join(', ') : undefined,
      dealerName: sale.dealer?.name,
      status: sale.status,
      profit: sale.profit,
    }));

    const totalUnits = property.units?.length || 0;
    const occupiedUnits = property.units?.filter((u: any) => u.status === 'Occupied').length || 0;

    generatePropertyReportPDF(
      {
        property: {
          name: property.name,
          propertyCode: property.propertyCode,
          manualUniqueId: property.manualUniqueId,
          type: property.type,
          status: property.status,
          address: property.address,
          location: property.location,
          dealerName: dealer?.name || null,
          salePrice: salePrice ?? null,
          totalUnits,
          occupied: occupiedUnits,
          totalArea: property.totalArea || null,
          yearBuilt: property.yearBuilt || null,
          ownerName: property.ownerName || null,
          ownerPhone: property.ownerPhone || null,
        },
        financeSummary: {
          totalReceived: ledgerIncome + totalDealReceived,
          totalExpenses: ledgerExpenses,
          pendingAmount: totalDealPending,
          entryCount: financeRecords.length,
        },
        financeRecords,
        deals: dealSummaries,
        sales: saleEntries,
        paymentPlans,
      },
      res
    );
  } catch (error) {
    logger.error('Generate property report error:', error);
    return errorResponse(res, error);
  }
});

/**
 * Get full property ledger (finance + payments) for a property
 * @route GET /api/properties/:id/ledger
 * @access Private
 */
router.get('/:id/ledger', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const property = await prisma.property.findFirst({
      where: { id, isDeleted: false },
      select: { id: true, name: true, dealerId: true },
    });

    if (!property) {
      return errorResponse(res, 'Property not found', 404);
    }

    // Get deal IDs for this property
    const propertyDeals = await prisma.deal.findMany({
      where: { propertyId: id, isDeleted: false },
      select: { id: true },
    });
    const dealIds = propertyDeals.map((d) => d.id);

    const [financeEntries, dealPayments] = await Promise.all([
      prisma.financeLedger.findMany({
        where: { 
          dealId: { in: dealIds },
          isDeleted: false 
        },
        orderBy: { date: 'desc' },
      }),
      prisma.payment.findMany({
        where: {
          deal: { propertyId: id, isDeleted: false, deletedAt: null },
          deletedAt: null,
        },
        orderBy: { date: 'desc' },
        include: {
          deal: { select: { id: true, title: true, dealAmount: true } },
          createdBy: { select: { id: true, username: true, email: true } },
        },
      }),
    ]);

    const normalizedFinance = financeEntries.map((entry) => ({
      id: entry.id,
      date: entry.date,
      transactionType: entry.transactionType,
      purpose: entry.purpose,
      amount: entry.amount,
      referenceType: entry.referenceType,
      description: entry.description,
      type: entry.transactionType === 'debit' ? 'expense' : 'income',
    }));

    const normalizedPayments = dealPayments.map((payment) => ({
      id: payment.id,
      date: payment.date,
      amount: payment.amount,
      paymentMode: payment.paymentMode,
      paymentType: payment.paymentType,
      dealId: payment.dealId,
      dealTitle: payment.deal?.title,
      recordedBy: payment.createdBy?.username || payment.createdBy?.email || 'System',
      type: 'payment',
    }));

    const totalIncome = normalizedFinance
      .filter((f) => f.type === 'income')
      .reduce((sum, f) => sum + (f.amount || 0), 0);
    const totalExpenses = normalizedFinance
      .filter((f) => f.type === 'expense')
      .reduce((sum, f) => sum + (f.amount || 0), 0);
    const totalPayments = normalizedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    return successResponse(res, {
      summary: {
        totalIncome,
        totalExpenses,
        totalPayments,
        net: totalIncome - totalExpenses,
      },
      financeEntries: normalizedFinance,
      payments: normalizedPayments,
      property: {
        id: property.id,
        name: property.name,
        dealerId: property.dealerId,
      },
    });
  } catch (error) {
    logger.error('Get property ledger error:', error);
    return errorResponse(res, error);
  }
});

/**
 * Create property
 * @route POST /api/properties
 * @access Private
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    logger.debug('Create property request body:', JSON.stringify(req.body, null, 2));
    const data = createPropertySchema.parse(req.body);

    // Validate TID if provided - must be unique across Property, Deal, and Client
    if (data.tid) {
      try {
        await validateTID(data.tid.trim());
      } catch (tidError: any) {
        logger.error('TID validation failed:', tidError);
        return errorResponse(
          res,
          tidError.message || 'TID validation failed. This TID may already exist in Property, Deal, or Client.',
          400
        );
      }
    }

    // Generate unique property code (only if column exists)
    const propertyCode = await generatePropertyCode();

  // Store extra attributes in documents field (keeps schema unchanged)
  let documentsData: { amenities?: string[]; salePrice?: number } | null = null;
  if (data.amenities && Array.isArray(data.amenities) && data.amenities.length > 0) {
    documentsData = { ...(documentsData || {}), amenities: data.amenities };
  }
  if (typeof data.salePrice === 'number') {
    documentsData = { ...(documentsData || {}), salePrice: data.salePrice };
  }

  // Check if columns exist before including them
  const tidColumnExists = await columnExists('Property', 'tid');
  const subsidiaryOptionIdExists = await columnExists('Property', 'subsidiaryOptionId');

  const property = await prisma.property.create({
    data: {
      name: data.name,
      type: data.type,
      address: data.address,
      location: data.location || undefined,
      status: data.status || 'Active',
      imageUrl: data.imageUrl || undefined,
      description: data.description || undefined,
      yearBuilt: data.yearBuilt || undefined,
      totalArea: data.totalArea || undefined,
      totalUnits: data.totalUnits || 0,
      dealerId: data.dealerId || undefined,
      locationId: data.locationId ?? null,
      ...(subsidiaryOptionIdExists && { subsidiaryOptionId: data.subsidiaryOptionId ?? null }),
      ...(tidColumnExists && { tid: data.tid?.trim() || null }),
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

    // Attach salePrice on response for client convenience
    const salePrice = typeof documentsData?.salePrice === 'number' ? documentsData.salePrice : undefined;
    return successResponse(res, salePrice !== undefined ? { ...property, salePrice } : property, 201);
  } catch (error: any) {
    logger.error('Create property error:', {
      error: error?.message || error,
      stack: error?.stack,
      body: req.body,
      code: error?.code,
    });
    
    // Handle Zod validation errors specifically
    if (error instanceof ZodError) {
      return errorResponse(
        res,
        'Validation error',
        400,
        error.errors.map((e) => ({ path: e.path.join('.'), message: e.message }))
      );
    }
    
    return errorResponse(res, error);
  }
});

/**
 * Update property
 * @route PUT /api/properties/:id
 * @access Private
 */
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
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

    // Handle amenities and sale price in update without schema change
    const updateData: Prisma.PropertyUpdateInput = { ...data };
    if (data.amenities || typeof data.salePrice === 'number') {
      let documentsData: { amenities?: string[]; salePrice?: number } = {};
      if (existingProperty.documents && typeof existingProperty.documents === 'object') {
        documentsData = { ...(existingProperty.documents as { amenities?: string[]; salePrice?: number }) };
      }

      if (data.amenities && Array.isArray(data.amenities)) {
        documentsData.amenities = data.amenities;
        delete (updateData as { amenities?: unknown }).amenities;
      }

      if (typeof data.salePrice === 'number') {
        documentsData.salePrice = data.salePrice;
        delete (updateData as { salePrice?: unknown }).salePrice;
      }

      updateData.documents = documentsData;
    }

    // Check if columns exist before including them in update
    const subsidiaryOptionIdExists = await columnExists('Property', 'subsidiaryOptionId');
    const tidColumnExists = await columnExists('Property', 'tid');

    // Handle locationId separately since it's a direct field
    const finalUpdateData: Prisma.PropertyUpdateInput = {
      ...updateData,
      imageUrl: data.imageUrl !== undefined ? (data.imageUrl || null) : undefined,
    };

    // Remove subsidiaryOptionId and tid from update if columns don't exist
    if (!subsidiaryOptionIdExists && 'subsidiaryOptionId' in finalUpdateData) {
      delete (finalUpdateData as any).subsidiaryOptionId;
    }
    if (!tidColumnExists && 'tid' in finalUpdateData) {
      delete (finalUpdateData as any).tid;
    }

    if ('locationId' in data) {
      (finalUpdateData as any).locationId = data.locationId ?? null;
    }

    // Try to update with locationNode, fallback if P2022 error
    let property: any;
    try {
      property = await prisma.property.update({
        where: { id },
        data: finalUpdateData,
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
    } catch (error: any) {
      // If P2022 error (column not found), retry without locationNode
      if (error?.code === 'P2022' || error?.message?.includes('column') || error?.message?.includes('does not exist') || error?.message?.includes('Location')) {
        logger.warn('LocationNode relation not available in update, fetching without it:', error.message);
        property = await prisma.property.update({
          where: { id },
          data: finalUpdateData,
          include: {
            units: {
              where: { isDeleted: false },
            },
            blocks: {
              where: { isDeleted: false },
            },
          },
        });
      } else {
        throw error;
      }
    }

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
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
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
router.get('/:id/alerts', authenticate, async (req: AuthRequest, res: Response) => {
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
router.get('/alerts/maintenance', authenticate, async (req: AuthRequest, res: Response) => {
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
router.get('/alerts/lease-expiry', authenticate, async (req: AuthRequest, res: Response) => {
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

