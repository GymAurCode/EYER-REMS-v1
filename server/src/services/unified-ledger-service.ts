/**
 * UnifiedLedgerService - Unified ledger service for Client, Dealer, and Property ledgers
 * Implements proper double-entry accounting with running balance calculation
 */

import { PrismaClient } from '@prisma/client';
import prisma from '../prisma/client';
import { LedgerService } from './ledger-service';
import { DealerLedgerService } from './dealer-ledger-service';

export interface LedgerEntry {
  id: string;
  date: Date;
  referenceNo: string | null;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface LedgerResponse {
  entityName: string;
  entityId: string;
  entries: LedgerEntry[];
  summary: {
    totalDebit: number;
    totalCredit: number;
    closingBalance: number;
  };
}

export class UnifiedLedgerService {
  /**
   * Get unified ledger for any entity type
   */
  static async getLedger(
    type: 'client' | 'dealer' | 'property',
    id: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<LedgerResponse> {
    switch (type) {
      case 'client':
        return await this.getClientLedger(id, filters);
      case 'dealer':
        return await this.getDealerLedger(id, filters);
      case 'property':
        return await this.getPropertyLedger(id, filters);
      default:
        throw new Error(`Invalid ledger type: ${type}`);
    }
  }

  /**
   * Get Client Ledger with proper double-entry format
   * Rules:
   * - Sale/Deal → Debit (amount owed)
   * - Payment Received → Credit (payment reduces debt)
   */
  private static async getClientLedger(
    clientId: string,
    filters?: { startDate?: Date; endDate?: Date }
  ): Promise<LedgerResponse> {
    // Get client info
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true, clientCode: true },
    });

    if (!client) {
      throw new Error('Client not found');
    }

    // Get all deals for this client
    const deals = await prisma.deal.findMany({
      where: {
        clientId,
        isDeleted: false,
        deletedAt: null,
        ...(filters?.startDate || filters?.endDate
          ? {
              OR: [
                {
                  dealDate: {
                    ...(filters.startDate ? { gte: filters.startDate } : {}),
                    ...(filters.endDate ? { lte: filters.endDate } : {}),
                  },
                },
                {
                  payments: {
                    some: {
                      date: {
                        ...(filters.startDate ? { gte: filters.startDate } : {}),
                        ...(filters.endDate ? { lte: filters.endDate } : {}),
                      },
                      deletedAt: null,
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        property: { select: { id: true, name: true, propertyCode: true } },
        payments: {
          where: {
            deletedAt: null,
            ...(filters?.startDate || filters?.endDate
              ? {
                  date: {
                    ...(filters.startDate ? { gte: filters.startDate } : {}),
                    ...(filters.endDate ? { lte: filters.endDate } : {}),
                  },
                }
              : {}),
          },
          orderBy: { date: 'asc' },
        },
      },
      orderBy: { dealDate: 'asc' },
    });

    const entries: LedgerEntry[] = [];
    let runningBalance = 0;

    // Process each deal
    for (const deal of deals) {
      const dealDate = deal.dealDate || deal.createdAt;
      const dealAmount = deal.dealAmount || 0;

      // Check if deal date is in range
      const includeDeal =
        !filters?.startDate || dealDate >= filters.startDate
          ? !filters?.endDate || dealDate <= filters.endDate
          : false;

      if (includeDeal && dealAmount > 0) {
        // Deal entry: Debit (amount owed)
        runningBalance += dealAmount;
        entries.push({
          id: `DEAL-${deal.id}`,
          date: dealDate,
          referenceNo: deal.dealCode || deal.id,
          description: `Sale: ${deal.title}${deal.property ? ` - ${deal.property.name}` : ''}`,
          debit: Number(dealAmount.toFixed(2)),
          credit: 0,
          runningBalance: Number(runningBalance.toFixed(2)),
        });
      }

      // Process payments
      for (const payment of deal.payments) {
        // Payment entry: Credit (reduces debt)
        runningBalance -= payment.amount;
        entries.push({
          id: payment.id,
          date: payment.date,
          referenceNo: payment.paymentId || payment.id,
          description: `Payment received${payment.remarks ? `: ${payment.remarks}` : ''} - ${payment.paymentMode || 'N/A'}`,
          debit: 0,
          credit: Number(payment.amount.toFixed(2)),
          runningBalance: Number(runningBalance.toFixed(2)),
        });
      }
    }

    // Sort by date ascending
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate totals
    const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);
    const closingBalance = runningBalance;

    return {
      entityName: client.name || client.clientCode || 'Unknown Client',
      entityId: client.id,
      entries,
      summary: {
        totalDebit: Number(totalDebit.toFixed(2)),
        totalCredit: Number(totalCredit.toFixed(2)),
        closingBalance: Number(closingBalance.toFixed(2)),
      },
    };
  }

  /**
   * Get Dealer Ledger with proper double-entry format
   * Rules:
   * - Commission → Credit (amount owed to dealer)
   * - Payment → Debit (payment reduces payable)
   * - Adjustment → Credit/Debit based on amount sign
   */
  private static async getDealerLedger(
    dealerId: string,
    filters?: { startDate?: Date; endDate?: Date }
  ): Promise<LedgerResponse> {
    // Get dealer info
    const dealer = await prisma.dealer.findUnique({
      where: { id: dealerId },
      select: { id: true, name: true },
    });

    if (!dealer) {
      throw new Error('Dealer not found');
    }

    // Get dealer ledger entries
    const where: any = { dealerId };
    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = filters.startDate;
      if (filters.endDate) where.date.lte = filters.endDate;
    }

    const dealerLedgerEntries = await prisma.dealerLedger.findMany({
      where,
      include: {
        deal: {
          include: {
            client: { select: { id: true, name: true } },
            property: { select: { id: true, name: true } },
          },
        },
        client: { select: { id: true, name: true } },
      },
      orderBy: { date: 'asc' },
    });

    const entries: LedgerEntry[] = [];
    let runningBalance = 0;

    for (const entry of dealerLedgerEntries) {
      if (entry.entryType === 'commission') {
        // Commission: Credit (increases payable)
        runningBalance += entry.amount;
        entries.push({
          id: entry.id,
          date: entry.date,
          referenceNo: entry.referenceId || entry.deal?.dealCode || entry.id,
          description: `Commission${entry.deal ? `: ${entry.deal.title}` : ''}${entry.description ? ` - ${entry.description}` : ''}`,
          debit: 0,
          credit: Number(entry.amount.toFixed(2)),
          runningBalance: Number(runningBalance.toFixed(2)),
        });
      } else if (entry.entryType === 'payment') {
        // Payment: Debit (reduces payable)
        runningBalance -= entry.amount;
        entries.push({
          id: entry.id,
          date: entry.date,
          referenceNo: entry.referenceId || entry.id,
          description: `Payment to dealer${entry.description ? `: ${entry.description}` : ''} - ${entry.referenceType || 'N/A'}`,
          debit: Number(entry.amount.toFixed(2)),
          credit: 0,
          runningBalance: Number(runningBalance.toFixed(2)),
        });
      } else if (entry.entryType === 'adjustment') {
        // Adjustment: Can be positive (credit) or negative (debit)
        if (entry.amount > 0) {
          runningBalance += entry.amount;
          entries.push({
            id: entry.id,
            date: entry.date,
            referenceNo: entry.referenceId || entry.id,
            description: `Adjustment${entry.description ? `: ${entry.description}` : ''}`,
            debit: 0,
            credit: Number(entry.amount.toFixed(2)),
            runningBalance: Number(runningBalance.toFixed(2)),
          });
        } else {
          runningBalance += entry.amount; // Already negative
          entries.push({
            id: entry.id,
            date: entry.date,
            referenceNo: entry.referenceId || entry.id,
            description: `Adjustment${entry.description ? `: ${entry.description}` : ''}`,
            debit: Number(Math.abs(entry.amount).toFixed(2)),
            credit: 0,
            runningBalance: Number(runningBalance.toFixed(2)),
          });
        }
      }
    }

    // Calculate totals
    const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);
    const closingBalance = runningBalance;

    return {
      entityName: dealer.name || 'Unknown Dealer',
      entityId: dealer.id,
      entries,
      summary: {
        totalDebit: Number(totalDebit.toFixed(2)),
        totalCredit: Number(totalCredit.toFixed(2)),
        closingBalance: Number(closingBalance.toFixed(2)),
      },
    };
  }

  /**
   * Get Property Ledger with proper double-entry format
   * Includes:
   * - Property sale entries (from deals)
   * - Linked client payments
   * - Dealer commission entries
   * - Property expenses
   * - Adjustments/refunds
   * 
   * Rules:
   * - Sale → Debit (property sold, receivable increases)
   * - Payment Received → Credit (payment received)
   * - Expense → Credit (expense reduces property value)
   * - Commission → Credit (commission expense)
   */
  private static async getPropertyLedger(
    propertyId: string,
    filters?: { startDate?: Date; endDate?: Date }
  ): Promise<LedgerResponse> {
    // Get property info
    const property = await prisma.property.findFirst({
      where: { id: propertyId, isDeleted: false },
      select: { id: true, name: true, propertyCode: true },
    });

    if (!property) {
      throw new Error('Property not found');
    }

    // Get all deals for this property
    const deals = await prisma.deal.findMany({
      where: {
        propertyId,
        isDeleted: false,
        deletedAt: null,
        ...(filters?.startDate || filters?.endDate
          ? {
              OR: [
                {
                  dealDate: {
                    ...(filters.startDate ? { gte: filters.startDate } : {}),
                    ...(filters.endDate ? { lte: filters.endDate } : {}),
                  },
                },
                {
                  payments: {
                    some: {
                      date: {
                        ...(filters.startDate ? { gte: filters.startDate } : {}),
                        ...(filters.endDate ? { lte: filters.endDate } : {}),
                      },
                      deletedAt: null,
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        client: { select: { id: true, name: true } },
        payments: {
          where: {
            deletedAt: null,
            ...(filters?.startDate || filters?.endDate
              ? {
                  date: {
                    ...(filters.startDate ? { gte: filters.startDate } : {}),
                    ...(filters.endDate ? { lte: filters.endDate } : {}),
                  },
                }
              : {}),
          },
          orderBy: { date: 'asc' },
        },
      },
      orderBy: { dealDate: 'asc' },
    });

    // Get property expenses
    const propertyExpenses = await prisma.propertyExpense.findMany({
      where: {
        propertyId,
        isDeleted: false,
        ...(filters?.startDate || filters?.endDate
          ? {
              date: {
                ...(filters.startDate ? { gte: filters.startDate } : {}),
                ...(filters.endDate ? { lte: filters.endDate } : {}),
              },
            }
          : {}),
      },
      orderBy: { date: 'asc' },
    });

    // Get dealer commissions related to this property's deals
    const dealIds = deals.map((d) => d.id);
    const dealerCommissions = await prisma.dealerLedger.findMany({
      where: {
        dealId: { in: dealIds },
        entryType: 'commission',
        ...(filters?.startDate || filters?.endDate
          ? {
              date: {
                ...(filters.startDate ? { gte: filters.startDate } : {}),
                ...(filters.endDate ? { lte: filters.endDate } : {}),
              },
            }
          : {}),
      },
      include: {
        dealer: { select: { id: true, name: true } },
        deal: { select: { id: true, title: true, dealCode: true } },
      },
      orderBy: { date: 'asc' },
    });

    // Get finance ledger entries
    const financeEntries = await prisma.financeLedger.findMany({
      where: {
        propertyId,
        isDeleted: false,
        ...(filters?.startDate || filters?.endDate
          ? {
              date: {
                ...(filters.startDate ? { gte: filters.startDate } : {}),
                ...(filters.endDate ? { lte: filters.endDate } : {}),
              },
            }
          : {}),
      },
      orderBy: { date: 'asc' },
    });

    const entries: LedgerEntry[] = [];
    let runningBalance = 0;

    // Process deals (sales)
    for (const deal of deals) {
      const dealDate = deal.dealDate || deal.createdAt;
      const dealAmount = deal.dealAmount || 0;

      const includeDeal =
        !filters?.startDate || dealDate >= filters.startDate
          ? !filters?.endDate || dealDate <= filters.endDate
          : false;

      if (includeDeal && dealAmount > 0) {
        // Sale entry: Debit (property sold, receivable increases)
        runningBalance += dealAmount;
        entries.push({
          id: `DEAL-${deal.id}`,
          date: dealDate,
          referenceNo: deal.dealCode || deal.id,
          description: `Property Sale: ${deal.title}${deal.client ? ` - Client: ${deal.client.name}` : ''}`,
          debit: Number(dealAmount.toFixed(2)),
          credit: 0,
          runningBalance: Number(runningBalance.toFixed(2)),
        });
      }

      // Process payments
      for (const payment of deal.payments) {
        // Payment entry: Credit (payment received)
        runningBalance -= payment.amount;
        entries.push({
          id: `PAYMENT-${payment.id}`,
          date: payment.date,
          referenceNo: payment.paymentId || payment.id,
          description: `Payment received${payment.remarks ? `: ${payment.remarks}` : ''} - ${payment.paymentMode || 'N/A'}`,
          debit: 0,
          credit: Number(payment.amount.toFixed(2)),
          runningBalance: Number(runningBalance.toFixed(2)),
        });
      }
    }

    // Process dealer commissions
    for (const commission of dealerCommissions) {
      // Commission entry: Credit (expense)
      runningBalance -= commission.amount;
      entries.push({
        id: `COMMISSION-${commission.id}`,
        date: commission.date,
        referenceNo: commission.referenceId || commission.deal?.dealCode || commission.id,
        description: `Dealer Commission${commission.dealer ? `: ${commission.dealer.name}` : ''}${commission.deal ? ` - ${commission.deal.title}` : ''}${commission.description ? ` - ${commission.description}` : ''}`,
        debit: 0,
        credit: Number(commission.amount.toFixed(2)),
        runningBalance: Number(runningBalance.toFixed(2)),
      });
    }

    // Process property expenses
    for (const expense of propertyExpenses) {
      // Expense entry: Credit (expense reduces property value)
      runningBalance -= expense.amount;
      entries.push({
        id: `EXPENSE-${expense.id}`,
        date: expense.date,
        referenceNo: expense.id,
        description: `Property Expense: ${expense.description || expense.category || 'N/A'}`,
        debit: 0,
        credit: Number(expense.amount.toFixed(2)),
        runningBalance: Number(runningBalance.toFixed(2)),
      });
    }

    // Process finance ledger entries
    for (const financeEntry of financeEntries) {
      if (financeEntry.category === 'expense') {
        // Expense: Credit
        runningBalance -= financeEntry.amount;
        entries.push({
          id: `FINANCE-${financeEntry.id}`,
          date: financeEntry.date,
          referenceNo: financeEntry.referenceId || financeEntry.id,
          description: `Finance Entry: ${financeEntry.description || financeEntry.category || 'N/A'}`,
          debit: 0,
          credit: Number(financeEntry.amount.toFixed(2)),
          runningBalance: Number(runningBalance.toFixed(2)),
        });
      } else if (financeEntry.category === 'income') {
        // Income: Debit
        runningBalance += financeEntry.amount;
        entries.push({
          id: `FINANCE-${financeEntry.id}`,
          date: financeEntry.date,
          referenceNo: financeEntry.referenceId || financeEntry.id,
          description: `Finance Entry: ${financeEntry.description || financeEntry.category || 'N/A'}`,
          debit: Number(financeEntry.amount.toFixed(2)),
          credit: 0,
          runningBalance: Number(runningBalance.toFixed(2)),
        });
      }
    }

    // Sort by date ascending
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Recalculate running balance after sorting
    let recalculatedBalance = 0;
    for (const entry of entries) {
      recalculatedBalance += entry.debit - entry.credit;
      entry.runningBalance = Number(recalculatedBalance.toFixed(2));
    }

    // Calculate totals
    const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);
    const closingBalance = recalculatedBalance;

    return {
      entityName: property.name || property.propertyCode || 'Unknown Property',
      entityId: property.id,
      entries,
      summary: {
        totalDebit: Number(totalDebit.toFixed(2)),
        totalCredit: Number(totalCredit.toFixed(2)),
        closingBalance: Number(closingBalance.toFixed(2)),
      },
    };
  }
}

