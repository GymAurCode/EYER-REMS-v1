import express, { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { syncInvoiceToFinanceLedger, updateTenantLedger, generateMonthlyInvoices, syncCommissionToFinanceLedger } from '../services/workflows';
import { getOverdueRentAlerts } from '../services/tenant-alerts';
import logger from '../utils/logger';
import { parsePaginationQuery, calculatePagination } from '../utils/pagination';
import { successResponse } from '../utils/error-handler';

const router = (express as any).Router();

// -------------------- Payment Plans & Installments --------------------

type AttachmentPayload = {
  url?: string | null;
  name?: string | null;
  mimeType?: string | null;
  size?: number | null;
  data?: string | null;
};

const dateSegment = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}${month}${day}`;
};

const randomSuffix = (): string => {
  return Math.floor(100 + Math.random() * 900).toString();
};

const generateDocumentCode = (prefix: string): string => {
  return `${prefix}-${dateSegment()}-${randomSuffix()}`;
};

// Generate invoice number in format: INV-YYYYMMDD-XXX
const generateInvoiceNumber = (): string => {
  const date = new Date();
  const dateStr = dateSegment(date);
  const random = Math.floor(100 + Math.random() * 900).toString(); // 3 digit random
  return `INV-${dateStr}-${random}`;
};

const normalizeDateInput = (value?: string | Date): Date => {
  if (!value) {
    return new Date();
  }
  return value instanceof Date ? value : new Date(value);
};

const normalizeAttachments = (attachments: any): AttachmentPayload[] => {
  if (!attachments) {
    return [];
  }
  const list = Array.isArray(attachments) ? attachments : [attachments];
  return list
    .map((item) => {
      if (typeof item !== 'object' || item === null) {
        return null;
      }
      return {
        url: item.url || item.href || null,
        name: item.name || item.filename || null,
        mimeType: item.mimeType || item.type || null,
        size: typeof item.size === 'number' ? item.size : null,
        data: item.data || null,
      } as AttachmentPayload;
    })
    .filter(Boolean) as AttachmentPayload[];
};

const DEAL_PAYMENT_TYPES = ['token', 'booking', 'installment', 'partial', 'full'] as const;
const DEAL_PAYMENT_MODES = ['cash', 'bank', 'online_transfer', 'card'] as const;

const createDealPaymentSchema = z.object({
  dealId: z.string().uuid(),
  amount: z.number().positive(),
  paymentType: z.enum(DEAL_PAYMENT_TYPES),
  paymentMode: z.enum(DEAL_PAYMENT_MODES),
  transactionId: z.string().optional(),
  referenceNumber: z.string().optional(),
  date: z.string().datetime().optional(),
  remarks: z.string().optional(),
  paymentId: z.string().optional(),
});

const sumLines = (lines: { debit?: number; credit?: number }[]): { debit: number; credit: number } => {
  return lines.reduce(
    (acc: { debit: number; credit: number }, line) => {
      const debit = Number(line.debit || 0);
      const credit = Number(line.credit || 0);
      return {
        debit: (acc.debit || 0) + debit,
        credit: (acc.credit || 0) + credit,
      };
    },
    { debit: 0, credit: 0 }
  );
};

// -------------------- Accounts (Chart of Accounts) --------------------
router.get('/accounts', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    // Fetch all accounts
    const accounts = await prisma.account.findMany({
      orderBy: { code: 'asc' },
      where: { isActive: true }
    });

    // Calculate balances for each account from ledger entries using aggregation for better performance
    const accountsWithBalances = await Promise.all(
      accounts.map(async (account) => {
        // Get total debits for this account using aggregation
        const debitAggregate = await prisma.ledgerEntry.aggregate({
          where: {
            debitAccountId: account.id,
            deletedAt: null, // Only active entries
          },
          _sum: {
            amount: true,
          },
        });

        // Get total credits for this account using aggregation
        const creditAggregate = await prisma.ledgerEntry.aggregate({
          where: {
            creditAccountId: account.id,
            deletedAt: null, // Only active entries
          },
          _sum: {
            amount: true,
          },
        });

        // Calculate totals
        const totalDebits = debitAggregate._sum.amount || 0;
        const totalCredits = creditAggregate._sum.amount || 0;

        // Calculate balance based on account type
        let balance = 0;
        const accountType = account.type?.toLowerCase() || '';

        if (accountType === 'asset' || accountType === 'expense') {
          // Assets and Expenses: Debits increase, Credits decrease
          // Balance = SUM(debits) - SUM(credits)
          balance = totalDebits - totalCredits;
        } else if (accountType === 'liability' || accountType === 'equity' || accountType === 'revenue') {
          // Liabilities, Equity, and Revenue: Credits increase, Debits decrease
          // Balance = SUM(credits) - SUM(debits)
          balance = totalCredits - totalDebits;
        } else {
          // Default: assume asset-like behavior
          balance = totalDebits - totalCredits;
        }

        // Return account with calculated balance
        return {
          ...account,
          balance: Math.round(balance * 100) / 100, // Round to 2 decimal places
        };
      })
    );

    res.json(accountsWithBalances);
  } catch (error) {
    logger.error('Get accounts error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch accounts';
    res.status(500).json({
      error: 'Failed to fetch accounts',
      message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

router.get('/accounts/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const item = await prisma.account.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: 'Account not found' });
    res.json(item);
  } catch (error) {
    logger.error('Get account error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch account';
    res.status(500).json({
      error: 'Failed to fetch account',
      message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

router.post('/accounts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { code, name, type, description } = req.body;
    if (!code || !name || !type) {
      return res.status(400).json({ error: 'code, name and type are required' });
    }
    const item = await prisma.account.create({
      data: { code, name, type, description: description || null },
    });
    res.status(201).json(item);
  } catch (error) {
    logger.error('Create account error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create account';
    res.status(400).json({
      error: 'Failed to create account',
      message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

router.put('/accounts/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const item = await prisma.account.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(item);
  } catch (error) {
    logger.error('Update account error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update account';
    res.status(400).json({
      error: 'Failed to update account',
      message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

router.delete('/accounts/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.account.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (error) {
    logger.error('Delete account error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete account';
    res.status(400).json({
      error: 'Failed to delete account',
      message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

// -------------------- Transaction Categories --------------------
router.get('/transaction-categories', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const items = await prisma.transactionCategory.findMany({
      orderBy: { name: 'asc' },
      include: {
        defaultDebitAccount: true,
        defaultCreditAccount: true,
      },
    });
    res.json(items);
  } catch (error) {
    logger.error('Get transaction categories error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch transaction categories';
    res.status(500).json({
      error: 'Failed to fetch transaction categories',
      message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

router.post('/transaction-categories', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, description, defaultDebitAccountId, defaultCreditAccountId } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: 'name and type are required' });
    }
    const item = await prisma.transactionCategory.create({
      data: {
        name,
        type,
        description: description || null,
        defaultDebitAccountId: defaultDebitAccountId || null,
        defaultCreditAccountId: defaultCreditAccountId || null,
      },
      include: {
        defaultDebitAccount: true,
        defaultCreditAccount: true,
      },
    });
    res.status(201).json(item);
  } catch (error) {
    logger.error('Create transaction category error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create transaction category';
    res.status(400).json({
      error: 'Failed to create transaction category',
      message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

router.put('/transaction-categories/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const item = await prisma.transactionCategory.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name,
        type: req.body.type,
        description: req.body.description || null,
        defaultDebitAccountId: req.body.defaultDebitAccountId || null,
        defaultCreditAccountId: req.body.defaultCreditAccountId || null,
        isActive: typeof req.body.isActive === 'boolean' ? req.body.isActive : undefined,
      },
      include: {
        defaultDebitAccount: true,
        defaultCreditAccount: true,
      },
    });
    res.json(item);
  } catch {
    res.status(400).json({ error: 'Failed to update transaction category' });
  }
});

router.delete('/transaction-categories/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.transactionCategory.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (error) {
    logger.error('Delete transaction category error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete transaction category';
    res.status(400).json({
      error: 'Failed to delete transaction category',
      message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

// Transactions
router.get('/transactions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit } = parsePaginationQuery(req.query);
    const skip = (page - 1) * limit;

    const where: any = {};
    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { date: 'desc' },
        include: {
          transactionCategory: true,
          debitAccount: true,
          creditAccount: true,
          tenant: true,
          dealer: true,
          property: true,
          journalEntry: {
            include: {
              lines: {
                select: {
                  accountId: true,
                  debit: true,
                  credit: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    const pagination = calculatePagination(page, limit, total);
    return successResponse(res, items, 200, pagination);
  } catch (error: any) {
    logger.error('Fetch transactions failed:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

router.get('/transactions/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const item = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: {
        transactionCategory: true,
        debitAccount: true,
        creditAccount: true,
        tenant: true,
        dealer: true,
        property: true,
        journalEntry: { include: { lines: true } },
      },
    });
    if (!item) return res.status(404).json({ error: 'Transaction not found' });
    res.json(item);
  } catch {
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

router.post('/transactions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      transactionType,
      amount,
      taxAmount,
      debitAccountId,
      creditAccountId,
      transactionCategoryId,
      paymentMethod,
      description,
      date,
      tenantId,
      assignToTenantId,
      dealerId,
      assignToDealerId,
      propertyId,
      assignToPropertyId,
      invoiceId,
      status,
      attachments,
    } = req.body;

    if (!transactionType || !amount || !date) {
      return res.status(400).json({ error: 'transactionType, amount and date are required' });
    }

    // Accounts are optional - if not provided, try to get from transaction category defaults
    let resolvedDebitAccountId = debitAccountId || null;
    let resolvedCreditAccountId = creditAccountId || null;

    // If accounts not provided, try to get from category defaults
    if (!resolvedDebitAccountId && !resolvedCreditAccountId && transactionCategoryId) {
      const category = await prisma.transactionCategory.findUnique({
        where: { id: transactionCategoryId },
        include: {
          defaultDebitAccount: true,
          defaultCreditAccount: true,
        },
      });

      if (category) {
        if (transactionType === 'income') {
          // Income: Debit = Cash/Bank (from payment method), Credit = Income Account (from category)
          resolvedCreditAccountId = category.defaultCreditAccountId || null;
        } else {
          // Expense: Debit = Expense Account (from category), Credit = Cash/Bank (from payment method)
          resolvedDebitAccountId = category.defaultDebitAccountId || null;
        }
      }
    }

    const baseAmount = Number(amount);
    const taxValue = Number(taxAmount || 0);
    if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
      return res.status(400).json({ error: 'amount must be greater than zero' });
    }
    if (!Number.isFinite(taxValue) || taxValue < 0) {
      return res.status(400).json({ error: 'taxAmount must be zero or greater' });
    }

    const totalAmount = Number((baseAmount + taxValue).toFixed(2));
    const txnDate = normalizeDateInput(date);
    const attachmentData = normalizeAttachments(attachments);
    const transactionCode = req.body.transactionCode || generateDocumentCode('TX');

    const created = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          transactionCode,
          transactionType,
          transactionCategoryId: transactionCategoryId || null,
          description: description || null,
          amount: baseAmount,
          taxAmount: taxValue,
          totalAmount,
          paymentMethod: paymentMethod || null,
          debitAccountId: resolvedDebitAccountId,
          creditAccountId: resolvedCreditAccountId,
          tenantId: assignToTenantId || tenantId || null,
          dealerId: assignToDealerId || dealerId || null,
          propertyId: assignToPropertyId || propertyId || null,
          attachments: attachmentData,
          status: status || 'completed',
          date: txnDate,
          createdByUserId: req.user?.id || null,
        },
      });

      // Create journal entry lines only for provided accounts
      const journalLines: any[] = [];

      if (resolvedDebitAccountId) {
        journalLines.push({
          accountId: resolvedDebitAccountId,
          debit: totalAmount,
          credit: 0,
          description: req.body.debitDescription || 'Debit',
        });
      }

      if (resolvedCreditAccountId) {
        journalLines.push({
          accountId: resolvedCreditAccountId,
          debit: 0,
          credit: totalAmount,
          description: req.body.creditDescription || 'Credit',
        });
      }

      // Only create journal entry if we have at least one line
      let journalEntry = null;
      if (journalLines.length > 0) {
        journalEntry = await tx.journalEntry.create({
          data: {
            entryNumber: generateDocumentCode('JV'),
            voucherNo: transactionCode,
            date: txnDate,
            description: description || `${transactionType} transaction`,
            narration: req.body.narration || null,
            status: 'posted',
            preparedByUserId: req.user?.id || null,
            lines: {
              create: journalLines,
            },
          },
        });
      }

      const updatedTransaction = await tx.transaction.update({
        where: { id: transaction.id },
        data: { journalEntryId: journalEntry?.id || null },
        include: {
          transactionCategory: true,
          debitAccount: true,
          creditAccount: true,
        },
      });

      // Note: When a transaction is created with invoiceId, we do NOT mark the invoice as paid.
      // The invoice remains unpaid/outstanding until a payment is recorded against it.
      // Transactions are for accounting purposes (accrual basis), while payments mark invoices as paid (cash basis).

      return updatedTransaction;
    });

    res.status(201).json(created);
  } catch (error: any) {
    const message = error?.message || 'Failed to create transaction';
    res.status(400).json({ error: message });
  }
});

router.put('/transactions/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const item = await prisma.transaction.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(item);
  } catch {
    res.status(400).json({ error: 'Failed to update transaction' });
  }
});

router.delete('/transactions/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.transaction.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(400).json({ error: 'Failed to delete transaction' });
  }
});

// Invoices
router.get('/invoices', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit } = parsePaginationQuery(req.query);
    const skip = (page - 1) * limit;

    const where: any = {};
    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: true,
          property: true,
          tenantAccount: true,
          incomeAccount: true,
          tenantPayments: true,
          createdBy: { select: { id: true, username: true, email: true } },
        },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    const pagination = calculatePagination(page, limit, total);
    return successResponse(res, items, 200, pagination);
  } catch (error) {
    logger.error('Get invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

router.get('/invoices/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const item = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        tenant: true,
        property: true,
        tenantAccount: true,
        incomeAccount: true,
        tenantPayments: true,
        createdBy: { select: { id: true, username: true, email: true } },
      },
    });
    if (!item) return res.status(404).json({ error: 'Invoice not found' });
    res.json(item);
  } catch (error) {
    logger.error('Get invoice error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

router.post('/invoices', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      tenantId,
      propertyId,
      amount,
      billingDate,
      dueDate,
      taxPercent,
      discountAmount,
      lateFeeRule,
      lateFeeAmount,
      lateFeePercent,
      termsAndConditions,
      attachments,
      tenantAccountId,
      incomeAccountId,
      description,
    } = req.body;

    if (!amount || !billingDate || !dueDate) {
      return res
        .status(400)
        .json({ error: 'amount, billingDate, and dueDate are required' });
    }

    const baseAmount = Number(amount);
    const taxPct = Number(taxPercent || 0);
    const discount = Number(discountAmount || 0);
    if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
      return res.status(400).json({ error: 'amount must be greater than zero' });
    }
    const taxAmount = Number(((baseAmount * taxPct) / 100).toFixed(2));
    const totalAmount = Number((baseAmount + taxAmount - discount).toFixed(2));
    if (totalAmount < 0) {
      return res.status(400).json({ error: 'discount exceeds total invoice amount' });
    }

    const attachmentsData = normalizeAttachments(attachments);
    const invoiceNumber = req.body.invoiceNumber || generateInvoiceNumber();
    const preparedDate = normalizeDateInput(billingDate);
    const dueDateValue = normalizeDateInput(dueDate);

    const created = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          tenantId: tenantId || null,
          propertyId: propertyId || null,
          billingDate: preparedDate,
          dueDate: dueDateValue,
          amount: baseAmount,
          taxPercent: taxPct,
          taxAmount,
          discountAmount: discount,
          totalAmount,
          remainingAmount: totalAmount,
          lateFeeRule: lateFeeRule || 'none',
          // Store late fee config in attachments JSON if needed, or extend schema
          status: 'unpaid',
          termsAndConditions: termsAndConditions || null,
          attachments: attachmentsData,
          tenantAccountId,
          incomeAccountId,
          createdByUserId: req.user?.id || null,
        },
      });

      // Only create journal entry if both account IDs are provided
      let journalEntryId = null;
      if (tenantAccountId && incomeAccountId) {
        const journalEntry = await tx.journalEntry.create({
          data: {
            entryNumber: generateDocumentCode('JV'),
            voucherNo: invoiceNumber,
            date: preparedDate,
            description: description || `Invoice ${invoiceNumber}`,
            narration: termsAndConditions || null,
            status: 'posted',
            preparedByUserId: req.user?.id || null,
            lines: {
              create: [
                {
                  accountId: tenantAccountId,
                  debit: totalAmount,
                  credit: 0,
                  description: 'Tenant receivable',
                },
                {
                  accountId: incomeAccountId,
                  debit: 0,
                  credit: totalAmount,
                  description: 'Income recognition',
                },
              ],
            },
          },
        });
        journalEntryId = journalEntry.id;
      }

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: { journalEntryId },
        include: {
          tenant: true,
          property: true,
          tenantAccount: true,
          incomeAccount: true,
        },
      });

      return updatedInvoice;
    });

    // Auto-sync to Finance Ledger
    await syncInvoiceToFinanceLedger(created.id);

    // Update tenant ledger if tenant exists
    if (created.tenantId) {
      await updateTenantLedger(created.tenantId, {
        entryType: 'debit',
        description: `Invoice ${created.invoiceNumber}`,
        amount: created.totalAmount,
        referenceId: created.id,
        referenceType: 'invoice',
      });
    }

    res.status(201).json(created);
  } catch (error: any) {
    const message = error?.message || 'Failed to create invoice';
    res.status(400).json({ error: message });
  }
});

router.put('/invoices/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const item = await prisma.invoice.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(item);
  } catch {
    res.status(400).json({ error: 'Failed to update invoice' });
  }
});

router.delete('/invoices/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.invoice.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(400).json({ error: 'Failed to delete invoice' });
  }
});

// Payments
router.get('/payments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit } = parsePaginationQuery(req.query);
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { date: 'desc' },
        include: {
          deal: {
            include: {
              client: { select: { id: true, name: true, clientCode: true } },
              property: { select: { id: true, name: true, propertyCode: true } },
            },
          },
          ledgerEntries: true,
          createdBy: { select: { id: true, username: true, email: true } },
        },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    const pagination = calculatePagination(page, limit, total);
    return successResponse(res, payments, 200, pagination);
  } catch (error) {
    logger.error('Get payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

router.get('/payments/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: {
        deal: {
          include: {
            client: { select: { id: true, name: true, clientCode: true } },
            property: { select: { id: true, name: true, propertyCode: true } },
          },
        },
        ledgerEntries: true,
        createdBy: { select: { id: true, username: true, email: true } },
      },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(payment);
  } catch (error) {
    logger.error('Get payment error:', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

router.post('/payments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const payload = createDealPaymentSchema.parse(req.body);

    const { PaymentService } = await import('../services/payment-service');

    const payment = await PaymentService.createPayment({
      dealId: payload.dealId,
      amount: payload.amount,
      paymentType: payload.paymentType,
      paymentMode: payload.paymentMode,
      transactionId: payload.transactionId,
      referenceNumber: payload.referenceNumber,
      date: payload.date ? new Date(payload.date) : undefined,
      remarks: payload.remarks,
      paymentId: payload.paymentId,
      createdBy: req.user?.id || '',
    });

    // Create audit log
    const { createAuditLog } = await import('../services/audit-log');
    await createAuditLog({
      entityType: 'payment',
      entityId: payment.id,
      action: 'create',
      userId: req.user?.id,
      userName: req.user?.username,
      newValues: payment,
      description: `Payment ${payment.paymentId} recorded for deal ${payment.deal.title}`,
      req,
    });

    res.status(201).json(payment);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }

    if (error?.message?.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    if (error?.message?.includes('Chart of Accounts')) {
      return res.status(500).json({
        error: error.message,
        hint: 'Please run the Chart of Accounts seed script first',
      });
    }

    logger.error('Create payment error:', error);
    res.status(400).json({ error: error?.message || 'Failed to create payment' });
  }
});

router.put('/payments/:id', authenticate, async (_req: AuthRequest, res: Response) => {
  res.status(405).json({ error: 'Payments cannot be edited. Please delete and recreate the payment.' });
});

router.delete('/payments/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || '';
    const { PaymentService } = await import('../services/payment-service');
    
    await PaymentService.deletePayment(req.params.id, userId);
    
    res.status(204).end();
  } catch (error: any) {
    logger.error('Delete payment error:', error);
    res.status(400).json({ error: error.message || 'Failed to delete payment' });
  }
});

// -------------------- Finance Attachments --------------------
// POST /finance/upload-attachment
router.post('/upload-attachment', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { file, filename, transactionId, entryId } = req.body;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'File data is required',
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
      filename || `finance-attachment-${Date.now()}.${mimeType.split('/')[1]}`,
      'finance',
      req.user!.id
    );

    // Store attachment metadata in database using existing Attachment model
    const entityId = transactionId || entryId || `finance-${Date.now()}`;
    const attachment = await prisma.attachment.create({
      data: {
        fileName: secureFilename,
        fileUrl: relativePath,
        fileType: mimeType,
        fileSize: buffer.length,
        entityType: 'finance',
        entityId: entityId,
        uploadedBy: req.user!.id,
        description: `Finance attachment for ${transactionId ? 'transaction' : 'entry'} ${entityId}`,
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
    logger.error('Upload finance attachment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload attachment',
    });
  }
});

// GET /finance/attachments/:id
router.get('/attachments/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: req.params.id },
    });

    if (!attachment || attachment.isDeleted) {
      return res.status(404).json({
        success: false,
        error: 'Attachment not found',
      });
    }

    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'public', attachment.fileUrl);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found on disk',
      });
    }

    const fileBuffer = fs.readFileSync(filePath);
    res.setHeader('Content-Type', attachment.fileType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.fileName}"`);
    res.send(fileBuffer);
  } catch (error: any) {
    logger.error('Get finance attachment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get attachment',
    });
  }
});

// GET /finance/attachments - Get all attachments for a transaction/entry
router.get('/attachments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { transactionId, entryId } = req.query;
    const entityId = (transactionId || entryId) as string;

    if (!entityId) {
      return res.status(400).json({
        success: false,
        error: 'transactionId or entryId is required',
      });
    }

    const attachments = await prisma.attachment.findMany({
      where: {
        entityType: 'finance',
        entityId: entityId,
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: attachments,
    });
  } catch (error: any) {
    logger.error('Get finance attachments error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get attachments',
    });
  }
});

// -------------------- Bank/Cash Vouchers --------------------
router.get('/vouchers', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const vouchers = await prisma.voucher.findMany({
      orderBy: { date: 'desc' },
      include: {
        account: true,
        expenseCategory: true,
        preparedBy: true,
        approvedBy: true,
        journalEntry: { include: { lines: true } },
      },
    });
    res.json(vouchers);
  } catch {
    res.status(500).json({ error: 'Failed to fetch vouchers' });
  }
});

router.post('/vouchers', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      voucherType,
      paymentMethod,
      accountId,
      amount,
      date,
      description,
      referenceNumber,
      expenseCategoryId,
      transactionCategoryId,
      attachments,
      preparedByUserId,
      approvedByUserId,
      counterAccountId,
      dealId,
    } = req.body;

    if (!voucherType || !paymentMethod || !accountId || !amount || !date) {
      return res.status(400).json({ error: 'voucherType, paymentMethod, accountId, amount and date are required' });
    }

    const voucherNumber = req.body.voucherNumber || generateDocumentCode('PV');
    const voucherDate = normalizeDateInput(date);
    const isReceipt = voucherType.includes('receipt');
    const isBankReceived = voucherType.toLowerCase().includes('bank') && isReceipt;
    const normalizedAttachments = normalizeAttachments(attachments);
    
    // Bank Received Voucher requires mandatory attachment
    if (isBankReceived && (!normalizedAttachments || normalizedAttachments.length === 0)) {
      return res.status(400).json({ 
        error: 'Bank Received Voucher requires a mandatory voucher upload. Please attach the voucher file.' 
      });
    }
    
    const categoryId = transactionCategoryId || expenseCategoryId || null;
    const category = categoryId
      ? await prisma.transactionCategory.findUnique({ where: { id: categoryId } })
      : null;

    let debitAccountId: string | null = null;
    let creditAccountId: string | null = null;

    if (isReceipt) {
      debitAccountId = accountId;
      creditAccountId = counterAccountId || category?.defaultCreditAccountId || null;
    } else {
      debitAccountId = category?.defaultDebitAccountId || counterAccountId || null;
      creditAccountId = accountId;
    }

    if (!debitAccountId || !creditAccountId) {
      return res.status(400).json({ error: 'Unable to resolve voucher accounts. Please provide a category or counter account.' });
    }

    const voucher = await prisma.$transaction(async (tx) => {
      // Validate deal exists if dealId is provided
      if (dealId) {
        const deal = await tx.deal.findUnique({
          where: { id: dealId },
          select: { id: true },
        });
        if (!deal) {
          return res.status(400).json({ error: 'Deal not found' });
        }
      }

      const createdVoucher = await tx.voucher.create({
        data: {
          voucherNumber,
          type: voucherType,
          paymentMethod,
          accountId,
          expenseCategoryId: categoryId,
          dealId: dealId || null,
          description: description || null,
          referenceNumber: referenceNumber || null,
          amount,
          attachments: normalizedAttachments,
          preparedByUserId: preparedByUserId || req.user?.id || null,
          approvedByUserId: approvedByUserId || null,
          date: voucherDate,
        },
      });

      const lines = isReceipt
        ? [
          { accountId: debitAccountId, debit: amount, credit: 0, description: description || 'Receipt' },
          { accountId: creditAccountId, debit: 0, credit: amount, description: 'Income' },
        ]
        : [
          { accountId: debitAccountId, debit: amount, credit: 0, description: description || 'Expense' },
          { accountId: creditAccountId, debit: 0, credit: amount, description: 'Cash/Bank' },
        ];

      const journalEntry = await tx.journalEntry.create({
        data: {
          entryNumber: generateDocumentCode('JV'),
          voucherNo: voucherNumber,
          date: voucherDate,
          description: description || `Voucher ${voucherNumber}`,
          narration: referenceNumber || null,
          status: 'posted',
          attachments: normalizedAttachments,
          preparedByUserId: preparedByUserId || req.user?.id || null,
          approvedByUserId: approvedByUserId || null,
          lines: {
            create: lines,
          },
        },
      });

      return tx.voucher.update({
        where: { id: createdVoucher.id },
        data: { journalEntryId: journalEntry.id },
        include: {
          account: true,
          expenseCategory: true,
          journalEntry: { include: { lines: true } },
        },
      });
    });

    res.status(201).json(voucher);
  } catch (error: any) {
    const message = error?.message || 'Failed to create voucher';
    res.status(400).json({ error: message });
  }
});

router.delete('/vouchers/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.voucher.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(400).json({ error: 'Failed to delete voucher' });
  }
});

// Commissions
router.get('/commissions', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const items = await prisma.commission.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(items);
  } catch {
    res.status(500).json({ error: 'Failed to fetch commissions' });
  }
});

router.get('/commissions/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const item = await prisma.commission.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: 'Commission not found' });
    res.json(item);
  } catch {
    res.status(500).json({ error: 'Failed to fetch commission' });
  }
});

router.post('/commissions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const item = await prisma.commission.create({ data: req.body });
    res.status(201).json(item);
  } catch {
    res.status(400).json({ error: 'Failed to create commission' });
  }
});

router.put('/commissions/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const item = await prisma.commission.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(item);
  } catch {
    res.status(400).json({ error: 'Failed to update commission' });
  }
});

router.delete('/commissions/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.commission.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(400).json({ error: 'Failed to delete commission' });
  }
});

// -------------------- Journal Vouchers --------------------
router.get('/journals', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const items = await prisma.journalEntry.findMany({
      orderBy: { date: 'desc' },
      include: { lines: true },
    });
    res.json(items);
  } catch {
    res.status(500).json({ error: 'Failed to fetch journal entries' });
  }
});

router.get('/journals/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const item = await prisma.journalEntry.findUnique({
      where: { id: req.params.id },
      include: { lines: true },
    });
    if (!item) return res.status(404).json({ error: 'Journal entry not found' });
    res.json(item);
  } catch {
    res.status(500).json({ error: 'Failed to fetch journal entry' });
  }
});

router.post('/journals', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { date, description, narration, lines, attachments, preparedByUserId, approvedByUserId, status } = req.body;
    if (!date || !Array.isArray(lines) || lines.length < 2) {
      return res.status(400).json({ error: 'date and at least two journal lines are required' });
    }

    const normalizedLines = lines.map((line: any) => ({
      accountId: line.accountId,
      debit: Number(line.debit || 0),
      credit: Number(line.credit || 0),
      description: line.description || null,
    }));

    if (normalizedLines.some((line) => !line.accountId)) {
      return res.status(400).json({ error: 'Each line must include an accountId' });
    }

    if (normalizedLines.some((line) => line.debit <= 0 && line.credit <= 0)) {
      return res.status(400).json({ error: 'Each line must include a debit or credit amount greater than zero' });
    }

    const totals = sumLines(normalizedLines);
    if (Number(totals.debit.toFixed(2)) !== Number(totals.credit.toFixed(2))) {
      return res.status(400).json({ error: 'Journal entry must balance (total debit equals total credit)' });
    }

    const entryNumber = generateDocumentCode('JV');
    const entry = await prisma.journalEntry.create({
      data: {
        entryNumber,
        voucherNo: req.body.voucherNo || entryNumber,
        date: normalizeDateInput(date),
        description: description || null,
        narration: narration || null,
        status: status || 'posted',
        attachments: normalizeAttachments(attachments),
        preparedByUserId: preparedByUserId || req.user?.id || null,
        approvedByUserId: approvedByUserId || null,
        lines: {
          create: normalizedLines,
        },
      },
      include: { lines: true },
    });
    res.status(201).json(entry);
  } catch (e: any) {
    const message = e?.message || 'Failed to create journal entry';
    res.status(400).json({ error: message });
  }
});

router.delete('/journals/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.journalLine.deleteMany({ where: { entryId: req.params.id } });
    await prisma.journalEntry.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(400).json({ error: 'Failed to delete journal entry' });
  }
});

// -------------------- Ledgers (Deal-centric Views) --------------------
router.get('/ledgers/clients', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { LedgerService } = await import('../services/ledger-service');
    const clientId = req.query.clientId as string | undefined;
    const propertyId = req.query.propertyId as string | undefined;
    const period = req.query.period as 'thisMonth' | 'all' | undefined;
    
    const filters: any = {};
    if (propertyId) filters.propertyId = propertyId;
    if (period) filters.period = period;
    
    // Handle date range
    if (req.query.startDate) {
      filters.startDate = new Date(req.query.startDate as string);
    }
    if (req.query.endDate) {
      filters.endDate = new Date(req.query.endDate as string);
    }
    
    // Handle "thisMonth" period
    if (period === 'thisMonth') {
      const now = new Date();
      filters.startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      filters.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const rows = await LedgerService.getClientLedger(clientId, filters);
    res.json(rows);
  } catch (error) {
    logger.error('Client ledger error:', error);
    res.status(500).json({ error: 'Failed to fetch client ledger' });
  }
});

// GET /ledger/client/:clientId - Specific client ledger route
router.get('/ledger/client/:clientId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { LedgerService } = await import('../services/ledger-service');
    const clientId = req.params.clientId;
    const propertyId = req.query.propertyId as string | undefined;
    const period = req.query.period as 'thisMonth' | 'all' | undefined;
    
    const filters: any = {};
    if (propertyId) filters.propertyId = propertyId;
    if (period) filters.period = period;
    
    // Handle date range
    if (req.query.startDate) {
      filters.startDate = new Date(req.query.startDate as string);
    }
    if (req.query.endDate) {
      filters.endDate = new Date(req.query.endDate as string);
    }
    
    // Handle "thisMonth" period
    if (period === 'thisMonth') {
      const now = new Date();
      filters.startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      filters.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const rows = await LedgerService.getClientLedger(clientId, filters);
    res.json({ success: true, data: rows });
  } catch (error: any) {
    logger.error('Client ledger error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch client ledger' });
  }
});

router.get('/ledgers/properties', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { LedgerService } = await import('../services/ledger-service');
    const propertyId = req.query.propertyId as string | undefined;

    const rows = await LedgerService.getPropertyLedger(propertyId);
    res.json(rows);
  } catch (error) {
    logger.error('Property ledger error:', error);
    res.status(500).json({ error: 'Failed to fetch property ledger' });
  }
});

router.get('/ledgers/company', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { LedgerService } = await import('../services/ledger-service');

    const filters: any = {};
    if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
    if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);
    if (req.query.accountId) filters.accountId = req.query.accountId as string;

    const result = await LedgerService.getCompanyLedger(filters);
    res.json(result);
  } catch (error) {
    logger.error('Company ledger error:', error);
    res.status(500).json({ error: 'Failed to fetch company ledger' });
  }
});

// Get overdue rent alerts
router.get('/alerts/overdue-rent', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId } = req.query;
    const alerts = await getOverdueRentAlerts(
      tenantId ? (tenantId as string) : undefined
    );
    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    logger.error('Get overdue rent alerts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch overdue rent alerts',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Generate monthly recurring invoices
router.post('/invoices/generate-monthly', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const invoices = await generateMonthlyInvoices();
    res.json({
      success: true,
      message: `Generated ${invoices.length} monthly invoice(s)`,
      data: invoices,
      count: invoices.length,
    });
  } catch (error) {
    logger.error('Generate monthly invoices error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate monthly invoices',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get rent due list
router.get('/rent-due', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { propertyId, tenantId, status } = req.query;
    const today = new Date();

    const where: any = {
      isDeleted: false,
      status: status ? (status as string) : { in: ['unpaid', 'partial', 'overdue'] },
    };

    if (propertyId) {
      where.propertyId = propertyId as string;
    }

    if (tenantId) {
      where.tenantId = tenantId as string;
    }

    // Get invoices due soon (within 7 days) or overdue
    const dueSoon = new Date();
    dueSoon.setDate(today.getDate() + 7);

    const invoices = await prisma.invoice.findMany({
      where: {
        ...where,
        OR: [
          { dueDate: { lte: today } }, // Overdue
          { dueDate: { lte: dueSoon, gte: today } }, // Due soon
        ],
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            tenantCode: true,
          },
        },
        property: {
          select: {
            id: true,
            name: true,
            propertyCode: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    // Calculate days until due or days overdue
    const rentDueList = invoices.map((invoice) => {
      const daysDiff = Math.floor(
        (invoice.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      const isOverdue = daysDiff < 0;
      const daysOverdue = isOverdue ? Math.abs(daysDiff) : 0;
      const daysUntilDue = !isOverdue ? daysDiff : 0;

      // Calculate late fee if overdue
      let lateFee = 0;
      if (isOverdue && invoice.lateFeeRule !== 'none') {
        if (invoice.lateFeeRule === 'fixed') {
          // Assuming fixed amount per day - adjust based on your schema
          lateFee = daysOverdue * 100; // Default 100 per day
        } else if (invoice.lateFeeRule === 'percentage') {
          lateFee = (invoice.totalAmount * 0.02 * daysOverdue) / 30; // 2% per 30 days
        }
      }

      return {
        ...invoice,
        daysUntilDue,
        daysOverdue,
        isOverdue,
        lateFee: Math.round(lateFee * 100) / 100,
        totalDue: Math.round((invoice.remainingAmount + lateFee) * 100) / 100,
      };
    });

    const summary = {
      total: rentDueList.length,
      overdue: rentDueList.filter((inv) => inv.isOverdue).length,
      dueSoon: rentDueList.filter((inv) => !inv.isOverdue && inv.daysUntilDue <= 7).length,
      totalAmount: rentDueList.reduce((sum, inv) => sum + inv.remainingAmount, 0),
      totalLateFees: rentDueList.reduce((sum, inv) => sum + inv.lateFee, 0),
    };

    res.json({
      success: true,
      data: rentDueList,
      summary,
    });
  } catch (error) {
    logger.error('Get rent due list error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rent due list',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Commission payment tracking routes
router.get('/commissions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { dealerId, status } = req.query;

    const where: any = {};
    if (dealerId) {
      where.dealerId = dealerId as string;
    }

    const commissions = await prisma.commission.findMany({
      where,
      include: {
        dealer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        sale: {
          include: {
            property: {
              select: {
                id: true,
                name: true,
                propertyCode: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map commissions with payment status (from finance ledger if exists)
    const commissionsWithStatus = await Promise.all(
      commissions.map(async (commission) => {
        // Check if commission has been paid (linked to finance ledger)
        const financeLedger = await prisma.financeLedger.findFirst({
          where: {
            referenceType: 'commission',
            referenceId: commission.id,
            category: 'expense',
          },
        });

        const paymentStatus = financeLedger ? 'paid' : 'pending';
        const paidDate = financeLedger?.date || null;

        return {
          ...commission,
          paymentStatus,
          paidDate,
          financeLedgerId: financeLedger?.id || null,
        };
      })
    );

    // Filter by status if provided
    const filtered = status
      ? commissionsWithStatus.filter((c) => c.paymentStatus === status)
      : commissionsWithStatus;

    res.json({
      success: true,
      data: filtered,
      summary: {
        total: filtered.length,
        pending: filtered.filter((c) => c.paymentStatus === 'pending').length,
        paid: filtered.filter((c) => c.paymentStatus === 'paid').length,
        totalAmount: filtered.reduce((sum, c) => sum + c.amount, 0),
        paidAmount: filtered
          .filter((c) => c.paymentStatus === 'paid')
          .reduce((sum, c) => sum + c.amount, 0),
        pendingAmount: filtered
          .filter((c) => c.paymentStatus === 'pending')
          .reduce((sum, c) => sum + c.amount, 0),
      },
    });
  } catch (error) {
    logger.error('Get commissions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch commissions',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Pay commission
router.post('/commissions/:id/pay', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentMethod, bankAccountId, notes, paymentDate } = req.body;

    const commission = await prisma.commission.findUnique({
      where: { id },
      include: {
        dealer: true,
        sale: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!commission) {
      return res.status(404).json({
        success: false,
        error: 'Commission not found',
      });
    }

    // Check if already paid
    const existingLedger = await prisma.financeLedger.findFirst({
      where: {
        referenceType: 'commission',
        referenceId: id,
        category: 'expense',
      },
    });

    if (existingLedger) {
      return res.status(400).json({
        success: false,
        error: 'Commission already paid',
      });
    }

    // Create finance ledger entry for commission payment using workflow
    const ledger = await syncCommissionToFinanceLedger(id);

    if (!ledger) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create finance ledger entry',
      });
    }

    res.json({
      success: true,
      message: 'Commission payment recorded successfully',
      data: {
        commission: {
          ...commission,
          paymentStatus: 'paid',
          paidDate: ledger.date,
          financeLedgerId: ledger.id,
        },
        payment: {
          id: ledger.id,
          amount: commission.amount,
          date: ledger.date,
          method: paymentMethod || 'bank',
          status: 'paid',
        },
      },
    });
  } catch (error) {
    logger.error('Pay commission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process commission payment',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Bank reconciliation
router.get('/bank-reconciliation', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { accountId, startDate, endDate } = req.query;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: 'accountId is required',
      });
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId as string },
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    const start = startDate ? new Date(startDate as string) : new Date();
    start.setDate(1); // First of month
    const end = endDate ? new Date(endDate as string) : new Date();

    // Get all transactions for this account
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { debitAccountId: accountId as string },
          { creditAccountId: accountId as string },
        ],
        date: {
          gte: start,
          lte: end,
        },
      },
      include: {
        property: true,
        tenant: true,
      },
      orderBy: { date: 'asc' },
    });

    // Get journal entries for this account
    const journalEntries = await prisma.journalEntry.findMany({
      where: {
        lines: {
          some: { accountId: accountId as string },
        },
        date: {
          gte: start,
          lte: end,
        },
      },
      include: {
        lines: {
          where: { accountId: accountId as string },
        },
      },
      orderBy: { date: 'asc' },
    });

    // Get payments for this account via ledger entries
    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: {
        OR: [
          { debitAccountId: accountId as string },
          { creditAccountId: accountId as string },
        ],
        date: {
          gte: start,
          lte: end,
        },
        paymentId: { not: null },
      },
      include: {
        payment: {
          include: {
            deal: {
              include: {
                client: { select: { id: true, name: true, clientCode: true } },
                property: { select: { id: true, name: true, propertyCode: true } },
              },
            },
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    const payments = ledgerEntries
      .filter(le => le.payment)
      .map(le => le.payment);

    // Calculate opening balance (before start date)
    const openingTransactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { debitAccountId: accountId as string },
          { creditAccountId: accountId as string },
        ],
        date: { lt: start },
      },
    });

    const openingJournalEntries = await prisma.journalEntry.findMany({
      where: {
        lines: {
          some: { accountId: accountId as string },
        },
        date: { lt: start },
      },
      include: {
        lines: {
          where: { accountId: accountId as string },
        },
      },
    });

    let openingBalance = 0;

    openingTransactions.forEach((txn) => {
      if (txn.debitAccountId === accountId) {
        openingBalance += txn.totalAmount;
      }
      if (txn.creditAccountId === accountId) {
        openingBalance -= txn.totalAmount;
      }
    });

    openingJournalEntries.forEach((entry) => {
      entry.lines.forEach((line) => {
        openingBalance += line.debit || 0;
        openingBalance -= line.credit || 0;
      });
    });

    // Calculate closing balance
    let closingBalance = openingBalance;

    transactions.forEach((txn) => {
      if (txn.debitAccountId === accountId) {
        closingBalance += txn.totalAmount;
      }
      if (txn.creditAccountId === accountId) {
        closingBalance -= txn.totalAmount;
      }
    });

    journalEntries.forEach((entry) => {
      entry.lines.forEach((line) => {
        closingBalance += line.debit || 0;
        closingBalance -= line.credit || 0;
      });
    });

    // Calculate totals
    const totalDebits = transactions
      .filter((t) => t.debitAccountId === accountId)
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const totalCredits = transactions
      .filter((t) => t.creditAccountId === accountId)
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const journalDebits = journalEntries.reduce((sum, entry) => {
      return sum + entry.lines.reduce((lineSum, line) => lineSum + (line.debit || 0), 0);
    }, 0);

    const journalCredits = journalEntries.reduce((sum, entry) => {
      return sum + entry.lines.reduce((lineSum, line) => lineSum + (line.credit || 0), 0);
    }, 0);

    res.json({
      success: true,
      data: {
        account: {
          id: account.id,
          code: account.code,
          name: account.name,
          type: account.type,
        },
        period: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
        openingBalance: Math.round(openingBalance * 100) / 100,
        closingBalance: Math.round(closingBalance * 100) / 100,
        transactions: {
          totalDebits: Math.round(totalDebits * 100) / 100,
          totalCredits: Math.round(totalCredits * 100) / 100,
          entries: transactions,
        },
        journalEntries: {
          totalDebits: Math.round(journalDebits * 100) / 100,
          totalCredits: Math.round(journalCredits * 100) / 100,
          entries: journalEntries,
        },
        payments: {
          count: payments.length,
          totalAmount: payments.filter(p => p !== null).reduce((sum, p) => sum + (p?.amount || 0), 0),
          entries: payments,
        },
        summary: {
          totalDebits: Math.round((totalDebits + journalDebits) * 100) / 100,
          totalCredits: Math.round((totalCredits + journalCredits) * 100) / 100,
          netChange: Math.round((closingBalance - openingBalance) * 100) / 100,
        },
      },
    });
  } catch (error) {
    logger.error('Bank reconciliation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate bank reconciliation',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// -------------------- Payment Plans & Installments --------------------
// IMPORTANT: More specific routes must come BEFORE less specific routes
// Create payment plan with multiple installment types (MUST BE BEFORE /payment-plans)
router.post('/payment-plans/create', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { dealId, clientId, installments } = req.body;

    if (!dealId || !clientId || !Array.isArray(installments) || installments.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'dealId, clientId, and installments array are required',
      });
    }

    // Validate deal exists
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: { client: true },
    });

    if (!deal) {
      return res.status(404).json({ success: false, error: 'Deal not found' });
    }

    if (deal.clientId !== clientId) {
      return res.status(400).json({ success: false, error: 'Client ID does not match deal client' });
    }

    // Check if payment plan already exists
    const existingPlan = await prisma.paymentPlan.findUnique({
      where: { dealId },
    });

    if (existingPlan) {
      return res.status(400).json({ success: false, error: 'Payment plan already exists for this deal' });
    }

    // Validate installments
    const totalAmount = installments.reduce((sum: number, inst: any) => sum + (inst.amount || 0), 0);
    const dealAmount = deal.dealAmount || 0;
    const downPayment = req.body.downPayment || 0;
    const expectedTotal = dealAmount - downPayment;

    // Installments total should equal deal amount minus down payment
    if (Math.abs(totalAmount - expectedTotal) > 0.01) {
      return res.status(400).json({
        success: false,
        error: `Installments total (${totalAmount}) must equal deal amount (${dealAmount}) minus down payment (${downPayment}) = ${expectedTotal}`,
      });
    }

    // Create payment plan with installments
    const paymentPlan = await prisma.$transaction(async (tx) => {
      const plan = await tx.paymentPlan.create({
        data: {
          dealId,
          clientId,
          numberOfInstallments: installments.length + (downPayment > 0 ? 1 : 0), // Include down payment as installment
          totalAmount: dealAmount,
          totalExpected: totalAmount + (downPayment || 0), // Include down payment in total
          startDate: installments[0]?.dueDate ? new Date(installments[0].dueDate) : new Date(),
          notes: req.body.notes || null,
          isActive: true,
          status: 'Pending', // Down payment is planned, not paid - always start as Pending
          downPayment: downPayment || 0, // Save down payment amount (pending, not paid)
          totalPaid: 0, // Down payment is not paid yet - only count actual payments
          remaining: dealAmount, // Full amount remaining until payments are recorded
        },
      });

      const createdInstallments: any[] = [];

      // Create down payment as first installment (installmentNumber: 0) if down payment exists
      if (downPayment > 0) {
        const downPaymentInstallment = await tx.dealInstallment.create({
          data: {
            paymentPlanId: plan.id,
            dealId,
            clientId,
            installmentNumber: 0, // Down payment is installment 0
            type: 'down_payment', // Special type for down payment
            amount: downPayment,
            dueDate: new Date(), // Due date is today or can be set to start date
            status: 'Pending', // Down payment is pending until paid
            paidAmount: 0,
            remaining: downPayment,
            paymentMode: null,
            notes: 'Down Payment',
          },
        });
        createdInstallments.push(downPaymentInstallment);
      }

      // Create regular installments (starting from installmentNumber: 1)
      const regularInstallments = await Promise.all(
        installments.map((inst: any, index: number) =>
          tx.dealInstallment.create({
            data: {
              paymentPlanId: plan.id,
              dealId,
              clientId,
              installmentNumber: index + 1, // Start from 1 (0 is down payment)
              type: inst.type || null,
              amount: inst.amount,
              dueDate: new Date(inst.dueDate),
              status: 'Pending',
              paidAmount: 0,
              remaining: inst.amount,
              paymentMode: inst.paymentMode || null,
              notes: inst.notes || null,
            },
          })
        )
      );

      createdInstallments.push(...regularInstallments);

      return {
        ...plan,
        installments: createdInstallments,
      };
    });

    res.json({ success: true, data: paymentPlan });
  } catch (error: any) {
    logger.error('Create payment plan error:', error);

    // Ensure we always return JSON, even on unexpected errors
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to create payment plan',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      });
    }
  }
});

// Create payment plan for a deal (legacy endpoint)
router.post('/payment-plans', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { PaymentPlanService } = await import('../services/payment-plan-service');

    const plan = await PaymentPlanService.createPaymentPlan({
      dealId: req.body.dealId,
      clientId: req.body.clientId,
      numberOfInstallments: req.body.numberOfInstallments,
      totalAmount: req.body.totalAmount,
      downPayment: req.body.downPayment || 0,
      startDate: new Date(req.body.startDate),
      installmentAmounts: req.body.installmentAmounts,
      dueDates: req.body.dueDates?.map((d: string) => new Date(d)),
      paymentModes: req.body.paymentModes,
      notes: req.body.notes,
    });

    res.json({ success: true, data: plan });
  } catch (error: any) {
    logger.error('Create payment plan error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create payment plan',
    });
  }
});

// Get all payment plans
router.get('/payment-plans', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, dealId, clientId } = req.query;
    const { page, limit } = parsePaginationQuery(req.query);
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };
    if (status) where.status = status;
    if (dealId) where.dealId = dealId;
    if (clientId) where.clientId = clientId;

    const [plans, total] = await Promise.all([
      prisma.paymentPlan.findMany({
        where,
        include: {
          deal: {
            select: {
              id: true,
              dealCode: true,
              title: true,
              dealAmount: true,
              status: true,
              stage: true,
            },
          },
          client: {
            select: {
              id: true,
              name: true,
              clientCode: true,
              email: true,
              phone: true,
            },
          },
          installments: {
            where: { isDeleted: false },
            orderBy: { installmentNumber: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.paymentPlan.count({ where }),
    ]);

    // Calculate summary for each plan
    // Use payment plan's totalPaid field which only includes down payment if it's been paid
    const plansWithSummary = plans.map((plan) => {
      const installments = plan.installments;
      const totalAmount = plan.totalAmount || installments.reduce((sum, i) => sum + i.amount, 0);
      // Use plan.totalPaid which correctly reflects actual payments (including down payment only if paid)
      const paidAmount = plan.totalPaid || 0;
      const paidCount = installments.filter((i) => i.status === 'paid').length;
      const overdueCount = installments.filter(
        (i) => i.status === 'overdue' || (i.status === 'unpaid' && new Date(i.dueDate) < new Date())
      ).length;

      return {
        ...plan,
        summary: {
          totalInstallments: installments.length,
          paidInstallments: paidCount,
          unpaidInstallments: installments.length - paidCount,
          overdueInstallments: overdueCount,
          totalAmount,
          paidAmount, // Uses plan.totalPaid which only includes down payment if actually paid
          remainingAmount: totalAmount - paidAmount,
          downPayment: plan.downPayment || 0,
        },
      };
    });

    const pagination = calculatePagination(page, limit, total);
    return successResponse(res, plansWithSummary, 200, pagination);
  } catch (error: any) {
    logger.error('Get payment plans error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get payment plans',
    });
  }
});

// Get payment plan for a deal
router.get('/payment-plans/deal/:dealId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { PaymentPlanService } = await import('../services/payment-plan-service');

    const plan = await PaymentPlanService.getPaymentPlanByDealId(req.params.dealId);

    if (!plan) {
      return res.status(404).json({ success: false, error: 'Payment plan not found' });
    }

    const summary = await PaymentPlanService.getInstallmentSummary(req.params.dealId);

    // Use payment plan's totalPaid which correctly reflects actual payments
    // Down payment is only included if it's been paid (recorded via Payment/Receipt module)
    const downPayment = plan.downPayment || 0;
    const totalPaidAmount = plan.totalPaid || 0; // This already includes down payment if paid
    const totalAmount = plan.totalAmount || summary.totalAmount || 0;

    const summaryWithDownPayment = {
      ...summary,
      paidAmount: totalPaidAmount, // Uses plan.totalPaid which only includes down payment if actually paid
      remainingAmount: Math.max(0, totalAmount - totalPaidAmount),
      downPayment: downPayment,
      totalAmount: totalAmount, // Use plan total amount (includes down payment + installments)
    };

    res.json({ success: true, data: { ...plan, summary: summaryWithDownPayment } });
  } catch (error: any) {
    logger.error('Get payment plan error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get payment plan',
    });
  }
});

// Get installment reports
router.get('/payment-plans/reports', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, status, dealId, clientId } = req.query;

    const where: any = { isDeleted: false };
    if (startDate || endDate) {
      where.dueDate = {};
      if (startDate) where.dueDate.gte = new Date(startDate as string);
      if (endDate) where.dueDate.lte = new Date(endDate as string);
    }
    if (status) where.status = status;
    if (dealId) where.dealId = dealId;
    if (clientId) where.clientId = clientId;

    const installments = await prisma.dealInstallment.findMany({
      where,
      include: {
        paymentPlan: {
          include: {
            deal: {
              select: {
                id: true,
                dealCode: true,
                title: true,
                dealAmount: true,
              },
            },
            client: {
              select: {
                id: true,
                name: true,
                clientCode: true,
              },
            },
          },
        },
        payments: {
          where: { deletedAt: null },
          select: {
            id: true,
            paymentId: true,
            amount: true,
            date: true,
            paymentMode: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    // Calculate summary with down payment information
    const uniquePlans = new Map();
    installments.forEach((inst) => {
      if (inst.paymentPlan) {
        const planId = inst.paymentPlan.id;
        if (!uniquePlans.has(planId)) {
          uniquePlans.set(planId, {
            planId,
            dealCode: inst.paymentPlan.deal?.dealCode || 'N/A',
            dealTitle: inst.paymentPlan.deal?.title || 'N/A',
            dealAmount: inst.paymentPlan.deal?.dealAmount || 0,
            downPayment: inst.paymentPlan.downPayment || 0,
          });
        }
      }
    });

    const summary = {
      total: installments.length,
      paid: installments.filter((i) => i.status === 'paid').length,
      unpaid: installments.filter((i) => i.status === 'unpaid').length,
      overdue: installments.filter(
        (i) => i.status === 'overdue' || (i.status === 'unpaid' && new Date(i.dueDate) < new Date())
      ).length,
      partial: installments.filter((i) => i.status === 'partial').length,
      totalAmount: installments.reduce((sum, i) => sum + i.amount, 0),
      paidAmount: installments.reduce((sum, i) => sum + i.paidAmount, 0),
      remainingAmount: installments.reduce((sum, i) => sum + (i.amount - i.paidAmount), 0),
      totalDownPayment: Array.from(uniquePlans.values()).reduce((sum, plan) => sum + (plan.downPayment || 0), 0),
      plans: Array.from(uniquePlans.values()), // Include plan details with down payment
    };

    // Add down payment info to each installment in the response
    const installmentsWithDownPayment = installments.map((inst) => ({
      ...inst,
      paymentPlan: inst.paymentPlan ? {
        ...inst.paymentPlan,
        downPayment: inst.paymentPlan.downPayment || 0,
      } : null,
    }));

    res.json({ success: true, data: { installments: installmentsWithDownPayment, summary } });
  } catch (error: any) {
    logger.error('Get installment reports error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get installment reports',
    });
  }
});

// Update installment
router.put('/installments/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { PaymentPlanService } = await import('../services/payment-plan-service');

    const installment = await PaymentPlanService.updateInstallment(req.params.id, {
      installmentId: req.params.id,
      amount: req.body.amount,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
      paymentMode: req.body.paymentMode,
      notes: req.body.notes,
    });

    res.json({ success: true, data: installment });
  } catch (error: any) {
    logger.error('Update installment error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update installment',
    });
  }
});

// Record payment against installment
router.post('/installments/:id/payment', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { PaymentPlanService } = await import('../services/payment-plan-service');

    const installment = await PaymentPlanService.recordInstallmentPayment(
      req.params.id,
      req.body.amount,
      req.body.paymentMode,
      new Date(req.body.paymentDate || new Date()),
      req.body.paymentId
    );

    res.json({ success: true, data: installment });
  } catch (error: any) {
    logger.error('Record installment payment error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to record payment',
    });
  }
});

// Export receipts (Payments)
router.get('/receipts/export', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, dealId, paymentMode, format = 'csv' } = req.query;

    const where: any = { deletedAt: null };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }
    if (dealId) where.dealId = dealId;
    if (paymentMode) where.paymentMode = paymentMode;

    const payments = await prisma.payment.findMany({
      where,
      include: {
        deal: {
          select: {
            id: true,
            dealCode: true,
            title: true,
            client: {
              select: {
                id: true,
                name: true,
                clientCode: true,
              },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    if (format === 'csv') {
      // CSV Export
      const headers = [
        'Receipt Number',
        'Date',
        'Client Name',
        'Deal Code',
        'Amount',
        'Payment Mode',
        'Payment Type',
        'Transaction ID',
        'Reference Number',
        'Remarks',
      ];

      const rows = payments.map((p) => [
        p.paymentId,
        p.date.toISOString().split('T')[0],
        p.deal?.client?.name || 'N/A',
        p.deal?.dealCode || 'N/A',
        p.amount.toString(),
        p.paymentMode,
        p.paymentType,
        p.transactionId || '',
        p.referenceNumber || '',
        p.remarks || '',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="receipts-export-${new Date().toISOString().split('T')[0]}.csv"`
      );
      res.send(csvContent);
    } else {
      // JSON Export
      res.json({
        success: true,
        data: payments.map((p) => ({
          receiptNumber: p.paymentId,
          date: p.date,
          clientName: p.deal?.client?.name || 'N/A',
          dealCode: p.deal?.dealCode || 'N/A',
          amount: p.amount,
          paymentMode: p.paymentMode,
          paymentType: p.paymentType,
          transactionId: p.transactionId,
          referenceNumber: p.referenceNumber,
          remarks: p.remarks,
        })),
      });
    }
  } catch (error: any) {
    logger.error('Export receipts error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export receipts',
    });
  }
});

// -------------------- Dealer Ledger --------------------
// Get dealer ledger
router.get('/dealer-ledger/:dealerId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { DealerLedgerService } = await import('../services/dealer-ledger-service');

    const filters: any = {};
    if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
    if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);
    if (req.query.dealId) filters.dealId = req.query.dealId as string;
    if (req.query.period) filters.period = req.query.period as 'thisMonth' | 'all';
    
    // Handle "thisMonth" period
    if (req.query.period === 'thisMonth') {
      const now = new Date();
      filters.startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      filters.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const ledger = await DealerLedgerService.getDealerLedger(req.params.dealerId, filters);

    res.json({ success: true, data: ledger });
  } catch (error: any) {
    logger.error('Get dealer ledger error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get dealer ledger',
    });
  }
});

// GET /ledger/dealer/:dealerId - Specific dealer ledger route
router.get('/ledger/dealer/:dealerId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { DealerLedgerService } = await import('../services/dealer-ledger-service');

    const filters: any = {};
    if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
    if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);
    if (req.query.dealId) filters.dealId = req.query.dealId as string;
    if (req.query.period) filters.period = req.query.period as 'thisMonth' | 'all';
    
    // Handle "thisMonth" period
    if (req.query.period === 'thisMonth') {
      const now = new Date();
      filters.startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      filters.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const ledger = await DealerLedgerService.getDealerLedger(req.params.dealerId, filters);

    res.json({ success: true, data: ledger });
  } catch (error: any) {
    logger.error('Get dealer ledger error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get dealer ledger',
    });
  }
});

// -------------------- Unified Ledger API --------------------
// GET /api/finance/ledger/{type}/{id} - Unified ledger endpoint
// This route must come AFTER specific routes like /ledger/client/:id and /ledger/dealer/:id
// to avoid route conflicts. It handles property, client, and dealer ledgers.
router.get('/ledger/:type/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { UnifiedLedgerService } = await import('../services/unified-ledger-service');
    const { type, id } = req.params;

    logger.info(`[Unified Ledger] Request received: type=${type}, id=${id}`);

    if (!['client', 'dealer', 'property'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ledger type. Must be client, dealer, or property',
      });
    }

    const filters: any = {};
    if (req.query.startDate) {
      filters.startDate = new Date(req.query.startDate as string);
    }
    if (req.query.endDate) {
      filters.endDate = new Date(req.query.endDate as string);
    }

    logger.info(`[Unified Ledger] Fetching ledger for ${type} with ID: ${id}`);
    const ledger = await UnifiedLedgerService.getLedger(type as 'client' | 'dealer' | 'property', id, filters);
    logger.info(`[Unified Ledger] Successfully fetched ledger for ${type} ${id}`);

    res.json({
      success: true,
      data: ledger,
    });
  } catch (error: any) {
    logger.error(`[Unified Ledger] Error for ${req.params.type} ${req.params.id}:`, error);
    const statusCode = error.message?.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to fetch ledger',
    });
  }
});

// Record payment to dealer
router.post('/dealer-ledger/:dealerId/payment', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { DealerLedgerService } = await import('../services/dealer-ledger-service');

    const entry = await DealerLedgerService.recordPayment(
      req.params.dealerId,
      req.body.amount,
      req.body.paymentMode,
      req.body.description,
      req.body.referenceId
    );

    res.json({ success: true, data: entry });
  } catch (error: any) {
    logger.error('Record dealer payment error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to record dealer payment',
    });
  }
});

// Get dealer balance
router.get('/dealer-ledger/:dealerId/balance', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { DealerLedgerService } = await import('../services/dealer-ledger-service');

    const balance = await DealerLedgerService.getDealerBalance(req.params.dealerId);

    res.json({ success: true, data: { balance } });
  } catch (error: any) {
    logger.error('Get dealer balance error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get dealer balance',
    });
  }
});

// -------------------- Enhanced Payment Plans (Multiple Types Support) --------------------
// NOTE: The /payment-plans/create route has been moved above to fix route matching order

// Update payment plan - DISABLED: Payment plans cannot be updated after creation
router.put('/payment-plans/update/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const paymentPlan = await prisma.paymentPlan.findUnique({
      where: { id },
      include: { installments: { where: { isDeleted: false } }, deal: true },
    });

    if (!paymentPlan) {
      return res.status(404).json({ success: false, error: 'Payment plan not found' });
    }

    // Prevent updates after creation
    return res.status(400).json({
      success: false,
      error: 'Payment plan cannot be updated after creation. Please create a new payment plan if changes are needed.'
    });
  } catch (error: any) {
    logger.error('Update payment plan error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update payment plan',
    });
  }
});

// -------------------- Receipt System --------------------
// Create receipt with FIFO allocation
router.post('/receipts/create', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { ReceiptService } = await import('../services/receipt-service');

    const { dealId, clientId, amount, method, date, notes } = req.body;

    if (!dealId || !clientId || !amount || !method) {
      return res.status(400).json({
        success: false,
        error: 'dealId, clientId, amount, and method are required',
      });
    }

    if (!['Cash', 'Bank'].includes(method)) {
      return res.status(400).json({
        success: false,
        error: 'method must be either "Cash" or "Bank"',
      });
    }

    const result = await ReceiptService.createReceipt({
      dealId,
      clientId,
      amount: parseFloat(amount),
      method,
      date: date ? new Date(date) : new Date(),
      notes: notes || null,
      receivedBy: req.user?.id,
    });

    res.json({
      success: true,
      data: result,
      message: `Receipt created and ${result.totalAllocated.toFixed(2)} allocated to installments`,
    });
  } catch (error: any) {
    logger.error('Create receipt error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create receipt',
    });
  }
});

// Get receipts for a deal
router.get('/receipts/:dealId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { ReceiptService } = await import('../services/receipt-service');
    const receipts = await ReceiptService.getReceiptsByDealId(req.params.dealId);
    res.json({ success: true, data: receipts });
  } catch (error: any) {
    logger.error('Get receipts error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get receipts',
    });
  }
});

// Get receipt PDF
router.get('/receipts/pdf/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { ReceiptService } = await import('../services/receipt-service');
    const { generateReceiptPDF } = await import('../utils/pdf-generator');

    const receipt = await ReceiptService.getReceiptById(req.params.id);

    if (!receipt) {
      return res.status(404).json({ success: false, error: 'Receipt not found' });
    }

    // Transform receipt data to match ReceiptPDFData interface
    const pdfData = {
      receipt: {
        receiptNo: receipt.receiptNo,
        amount: receipt.amount,
        method: receipt.method,
        date: receipt.date,
        notes: receipt.notes || undefined,
      },
      deal: {
        dealCode: receipt.deal.dealCode || undefined,
        title: receipt.deal.title,
        dealAmount: receipt.deal.dealAmount,
      },
      client: {
        name: receipt.client.name,
        email: receipt.client.email || undefined,
        phone: receipt.client.phone || undefined,
        address: receipt.client.address || undefined,
      },
      allocations: receipt.allocations.map((alloc) => ({
        installmentNumber: alloc.installment.installmentNumber,
        amountAllocated: alloc.amountAllocated,
        installmentAmount: alloc.installment.amount,
        dueDate: alloc.installment.dueDate,
      })),
      receivedBy: receipt.receivedByUser ? {
        username: receipt.receivedByUser.username || undefined,
        email: receipt.receivedByUser.email || undefined,
      } : undefined,
    };

    const pdfBuffer = await generateReceiptPDF(pdfData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${receipt.receiptNo}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    logger.error('Generate receipt PDF error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate receipt PDF',
    });
  }
});

export default router;


