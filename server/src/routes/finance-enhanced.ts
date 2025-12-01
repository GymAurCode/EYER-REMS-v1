/**
 * Enhanced Finance API Routes
 * Includes Finance Ledger with auto-sync
 */

import express from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { requireAuth, AuthenticatedRequest, requirePermission } from '../middleware/rbac';
import { createAuditLog } from '../services/audit-log';
import {
  syncInvoiceToFinanceLedger,
  syncPaymentToFinanceLedger,
  syncDealToFinanceLedger,
  syncPayrollToFinanceLedger,
} from '../services/workflows';

const router = express.Router();

// Validation schemas
const createFinanceLedgerSchema = z.object({
  referenceType: z.enum(['invoice', 'salary', 'expense', 'deal', 'payment', 'maintenance', 'property_expense']),
  referenceId: z.string().uuid().optional(),
  category: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  date: z.string().datetime().optional(),
  notes: z.string().optional(),
  description: z.string().optional(),
  propertyId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  payrollId: z.string().uuid().optional(),
  invoiceId: z.string().uuid().optional(),
  paymentId: z.string().uuid().optional(),
});

// Get finance ledger entries
router.get(
  '/ledger',
  requireAuth,
  requirePermission('finance.view'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const {
        category,
        referenceType,
        propertyId,
        tenantId,
        startDate,
        endDate,
        page = '1',
        limit = '50',
      } = req.query;

      const where: any = { isDeleted: false };

      if (category) where.category = category;
      if (referenceType) where.referenceType = referenceType;
      if (propertyId) where.propertyId = propertyId;
      if (tenantId) where.tenantId = tenantId;
      if (startDate && endDate) {
        where.date = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        };
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const [entries, total] = await Promise.all([
        prisma.financeLedger.findMany({
          where,
          include: {
            property: { select: { id: true, name: true, propertyCode: true } },
            tenant: { select: { id: true, name: true, tenantCode: true } },
            deal: { select: { id: true, title: true, dealCode: true } },
          },
          orderBy: { date: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.financeLedger.count({ where }),
      ]);

      res.json({
        entries,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get finance summary
router.get(
  '/summary',
  requireAuth,
  requirePermission('finance.view'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { startDate, endDate, propertyId } = req.query;

      const where: any = { isDeleted: false };

      if (propertyId) where.propertyId = propertyId;
      if (startDate && endDate) {
        where.date = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        };
      }

      const [income, expenses] = await Promise.all([
        prisma.financeLedger.aggregate({
          where: { ...where, category: 'income' },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.financeLedger.aggregate({
          where: { ...where, category: 'expense' },
          _sum: { amount: true },
          _count: true,
        }),
      ]);

      const totalIncome = income._sum.amount || 0;
      const totalExpenses = expenses._sum.amount || 0;

      res.json({
        income: {
          total: totalIncome,
          count: income._count,
        },
        expenses: {
          total: totalExpenses,
          count: expenses._count,
        },
        netProfit: totalIncome - totalExpenses,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Create finance ledger entry (manual)
router.post(
  '/ledger',
  requireAuth,
  requirePermission('finance.create'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const data = createFinanceLedgerSchema.parse(req.body);

      const ledger = await prisma.financeLedger.create({
        data: {
          ...data,
          date: data.date ? new Date(data.date) : new Date(),
          createdBy: req.user?.id,
        },
      });

      // Audit log
      await createAuditLog({
        entityType: 'finance_ledger',
        entityId: ledger.id,
        action: 'create',
        userId: req.user?.id,
        userName: req.user?.username,
        userRole: req.user?.role?.name,
        newValues: ledger,
        description: `Finance ledger entry created: ${ledger.category} - ${ledger.amount}`,
        req,
      });

      res.status(201).json(ledger);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  }
);

// Sync invoice to finance ledger (auto-sync)
router.post(
  '/sync/invoice/:invoiceId',
  requireAuth,
  requirePermission('finance.sync'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const ledger = await syncInvoiceToFinanceLedger(req.params.invoiceId);

      if (!ledger) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      res.json(ledger);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Sync payment to finance ledger (auto-sync)
router.post(
  '/sync/payment/:paymentId',
  requireAuth,
  requirePermission('finance.sync'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const ledger = await syncPaymentToFinanceLedger(req.params.paymentId);

      if (!ledger) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      res.json(ledger);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Sync deal to finance ledger (auto-sync)
router.post(
  '/sync/deal/:dealId',
  requireAuth,
  requirePermission('finance.sync'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const ledger = await syncDealToFinanceLedger(req.params.dealId);

      if (!ledger) {
        return res.status(404).json({ error: 'Deal not found or not closed' });
      }

      res.json(ledger);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Sync payroll to finance ledger (auto-sync)
router.post(
  '/sync/payroll/:payrollId',
  requireAuth,
  requirePermission('finance.sync'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const ledger = await syncPayrollToFinanceLedger(req.params.payrollId);

      if (!ledger) {
        return res.status(404).json({ error: 'Payroll not found or not paid' });
      }

      res.json(ledger);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get finance ledger by reference
router.get(
  '/ledger/reference/:referenceType/:referenceId',
  requireAuth,
  requirePermission('finance.view'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { referenceType, referenceId } = req.params;

      const ledger = await prisma.financeLedger.findFirst({
        where: {
          referenceType,
          referenceId,
          isDeleted: false,
        },
        include: {
          property: true,
          tenant: true,
          deal: true,
        },
      });

      if (!ledger) {
        return res.status(404).json({ error: 'Ledger entry not found' });
      }

      res.json(ledger);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;

