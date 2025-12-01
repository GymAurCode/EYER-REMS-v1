/**
 * LedgerService - Business logic for Ledger Entry management
 * Handles double-entry bookkeeping and account lookups
 */

import { PrismaClient, Prisma } from '@prisma/client';
import prisma from '../prisma/client';

export interface CreateLedgerEntryPayload {
  dealId: string;
  paymentId?: string;
  debitAccountId?: string;
  creditAccountId?: string;
  amount: number;
  remarks?: string;
  date: Date;
}

export class LedgerService {
  /**
   * Create a ledger entry (single side of double-entry)
   * For double-entry, call this twice: once for debit, once for credit
   */
  static async createLedgerEntry(
    payload: CreateLedgerEntryPayload,
    tx?: Prisma.TransactionClient
  ): Promise<any> {
    const prismaClient = tx || prisma;

    // Validate at least one account is provided
    if (!payload.debitAccountId && !payload.creditAccountId) {
      throw new Error('Either debitAccountId or creditAccountId must be provided');
    }

    if (payload.debitAccountId && payload.creditAccountId) {
      throw new Error('Cannot specify both debitAccountId and creditAccountId in single entry');
    }

    // Validate account exists
    const accountId = payload.debitAccountId || payload.creditAccountId!;
    const account = await prismaClient.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    if (!account.isActive) {
      throw new Error(`Account is inactive: ${account.name}`);
    }

    // Get legacy account names for backwards compatibility
    const accountName = account.name;

    // Create ledger entry
    return await prismaClient.ledgerEntry.create({
      data: {
        dealId: payload.dealId,
        paymentId: payload.paymentId || null,
        debitAccountId: payload.debitAccountId || null,
        creditAccountId: payload.creditAccountId || null,
        accountDebit: payload.debitAccountId ? accountName : '', // Legacy field
        accountCredit: payload.creditAccountId ? accountName : '', // Legacy field
        amount: payload.amount,
        remarks: payload.remarks || null,
        date: payload.date,
      },
    });
  }

  /**
   * Get account by alias (for migration compatibility)
   */
  static async getAccountByAlias(alias: string): Promise<string | null> {
    const accountAlias = await prisma.accountAlias.findUnique({
      where: { alias },
      include: { account: true },
    });

    if (accountAlias && accountAlias.account.isActive) {
      return accountAlias.accountId;
    }

    // Fallback: try to find by name
    const account = await prisma.account.findFirst({
      where: {
        name: { contains: alias, mode: 'insensitive' },
        isActive: true,
      },
    });

    return account?.id || null;
  }

  /**
   * Get client ledger (payments with running balance)
   */
  static async getClientLedger(clientId?: string): Promise<any[]> {
    const where: any = {
      deletedAt: null,
    };

    if (clientId) {
      where.clientId = clientId;
    }

    const deals = await prisma.deal.findMany({
      where: {
        ...where,
        isDeleted: false,
        deletedAt: null,
      },
      include: {
        client: { select: { id: true, name: true, clientCode: true } },
        property: { select: { id: true, name: true, propertyCode: true } },
        payments: {
          where: { deletedAt: null },
          orderBy: { date: 'asc' },
        },
      },
    });

    const rows: any[] = [];

    deals.forEach((deal) => {
      let cumulative = 0;

      if (deal.payments.length === 0) {
        rows.push({
          id: `DEAL-${deal.id}`,
          clientId: deal.client?.id || null,
          clientName: deal.client?.name || 'Unassigned Client',
          propertyName: deal.property?.name || 'Unassigned Property',
          dealTitle: deal.title,
          dealId: deal.id,
          paymentId: null,
          paymentType: null,
          paymentMode: null,
          amount: 0,
          date: deal.dealDate,
          outstanding: Number(deal.dealAmount.toFixed(2)),
          runningBalance: 0,
        });
      } else {
        deal.payments.forEach((payment) => {
          cumulative += payment.amount;
          rows.push({
            id: payment.id,
            clientId: deal.client?.id || null,
            clientName: deal.client?.name || 'Unassigned Client',
            propertyName: deal.property?.name || 'Unassigned Property',
            dealTitle: deal.title,
            dealId: deal.id,
            paymentId: payment.paymentId,
            paymentType: payment.paymentType,
            paymentMode: payment.paymentMode,
            amount: payment.amount,
            date: payment.date,
            outstanding: Number(Math.max(0, deal.dealAmount - cumulative).toFixed(2)),
            runningBalance: cumulative,
          });
        });
      }
    });

    return rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Get property ledger (aggregated by property)
   */
  static async getPropertyLedger(propertyId?: string): Promise<any[]> {
    const where: any = {
      deletedAt: null,
    };

    if (propertyId) {
      where.propertyId = propertyId;
    }

    const deals = await prisma.deal.findMany({
      where: {
        ...where,
        isDeleted: false,
        deletedAt: null,
      },
      include: {
        property: { select: { id: true, name: true, propertyCode: true } },
        payments: {
          where: { deletedAt: null },
          orderBy: { date: 'desc' },
        },
      },
    });

    const propertyMap = new Map<string, any>();

    deals.forEach((deal) => {
      const key = deal.property?.id || 'unassigned';
      
      if (!propertyMap.has(key)) {
        propertyMap.set(key, {
          propertyId: deal.property?.id || null,
          propertyName: deal.property?.name || 'Unassigned Property',
          propertyCode: deal.property?.propertyCode,
          totalDealAmount: 0,
          totalReceived: 0,
          outstanding: 0,
          payments: [],
        });
      }

      const bucket = propertyMap.get(key)!;
      bucket.totalDealAmount += deal.dealAmount;
      const received = deal.payments.reduce((sum, payment) => sum + payment.amount, 0);
      bucket.totalReceived += received;
      bucket.outstanding += Math.max(0, deal.dealAmount - received);

      deal.payments.forEach((payment) => {
        bucket.payments.push({
          id: payment.id,
          dealTitle: deal.title,
          dealId: deal.id,
          paymentId: payment.paymentId,
          amount: payment.amount,
          paymentMode: payment.paymentMode,
          paymentType: payment.paymentType,
          date: payment.date,
        });
      });
    });

    return Array.from(propertyMap.values());
  }

  /**
   * Get company ledger (all ledger entries with account details)
   */
  static async getCompanyLedger(filters?: {
    startDate?: Date;
    endDate?: Date;
    accountId?: string;
  }): Promise<{ entries: any[]; summary: any }> {
    const where: any = {
      deletedAt: null,
    };

    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = filters.startDate;
      if (filters.endDate) where.date.lte = filters.endDate;
    }

    if (filters?.accountId) {
      where.OR = [
        { debitAccountId: filters.accountId },
        { creditAccountId: filters.accountId },
      ];
    }

    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where,
      include: {
        deal: {
          include: {
            client: { select: { id: true, name: true } },
            property: { select: { id: true, name: true } },
          },
        },
        payment: {
          select: {
            paymentId: true,
            paymentMode: true,
            paymentType: true,
          },
        },
        debitAccount: true,
        creditAccount: true,
      },
      orderBy: { date: 'desc' },
      take: 500, // Limit for performance
    });

    // Calculate summary balances
    const summary = await this.calculateAccountBalances();

    return {
      entries: ledgerEntries.map((entry) => ({
        id: entry.id,
        date: entry.date,
        accountDebit: entry.debitAccount?.name || entry.accountDebit,
        accountCredit: entry.creditAccount?.name || entry.accountCredit,
        debitAccountId: entry.debitAccountId,
        creditAccountId: entry.creditAccountId,
        amount: entry.amount,
        remarks: entry.remarks,
        dealTitle: entry.deal?.title,
        clientName: entry.deal?.client?.name,
        propertyName: entry.deal?.property?.name,
        paymentId: entry.payment?.paymentId,
        paymentMode: entry.payment?.paymentMode,
        paymentType: entry.payment?.paymentType,
      })),
      summary,
    };
  }

  /**
   * Calculate account balances from ledger entries
   */
  static async calculateAccountBalances(): Promise<any> {
    // Get all active accounts
    const accounts = await prisma.account.findMany({
      where: { isActive: true },
    });

    const balances: Record<string, number> = {};

    // Initialize balances
    accounts.forEach((account) => {
      balances[account.id] = 0;
    });

    // Calculate from ledger entries
    const entries = await prisma.ledgerEntry.findMany({
      where: { deletedAt: null },
      include: {
        debitAccount: true,
        creditAccount: true,
      },
    });

    entries.forEach((entry) => {
      if (entry.debitAccountId) {
        balances[entry.debitAccountId] = (balances[entry.debitAccountId] || 0) + entry.amount;
      }
      if (entry.creditAccountId) {
        balances[entry.creditAccountId] = (balances[entry.creditAccountId] || 0) - entry.amount;
      }
    });

    // Get summary accounts
    const cashAccount = accounts.find((a) => a.code === '1000' || a.name.includes('Cash'));
    const bankAccount = accounts.find((a) => a.code === '1010' || a.name.includes('Bank'));
    const arAccount = accounts.find((a) => a.code === '1100' || a.name.includes('Accounts Receivable'));
    const dealerPayable = accounts.find((a) => a.code === '2000' || a.name.includes('Dealer Payable'));

    return {
      cashBalance: cashAccount ? (balances[cashAccount.id] || 0) : 0,
      bankBalance: bankAccount ? (balances[bankAccount.id] || 0) : 0,
      receivables: arAccount ? Math.abs(balances[arAccount.id] || 0) : 0,
      payables: dealerPayable ? Math.abs(balances[dealerPayable.id] || 0) : 0,
    };
  }
}

