/**
 * DealerLedgerService - Business logic for Dealer Ledger
 * Tracks dealer commissions, payments, and outstanding balances
 */

import { Prisma } from '../prisma/client';
import prisma from '../prisma/client';
import { LedgerService } from './ledger-service';

export interface CreateDealerLedgerEntryPayload {
  dealerId: string;
  dealId?: string;
  clientId?: string;
  entryType: 'commission' | 'payment' | 'adjustment';
  amount: number;
  description?: string;
  referenceId?: string;
  referenceType?: string;
  date?: Date;
}

export class DealerLedgerService {
  /**
   * Get account IDs for dealer ledger operations
   */
  private static async getAccounts(): Promise<{
    dealerPayableAccountId: string;
    commissionExpenseAccountId: string;
    cashAccountId: string;
    bankAccountId: string;
  }> {
    const [dealerPayable, commissionExpense, cashAccount, bankAccount] = await Promise.all([
      prisma.account.findFirst({
        where: {
          OR: [{ code: '2000' }, { name: { contains: 'Dealer Payable', mode: 'insensitive' } }],
          isActive: true,
        },
      }),
      prisma.account.findFirst({
        where: {
          OR: [{ code: '5000' }, { name: { contains: 'Commission Expense', mode: 'insensitive' } }],
          isActive: true,
        },
      }),
      prisma.account.findFirst({
        where: {
          OR: [{ code: '1000' }, { name: { contains: 'Cash', mode: 'insensitive' } }],
          isActive: true,
        },
      }),
      prisma.account.findFirst({
        where: {
          OR: [{ code: '1010' }, { name: { contains: 'Bank', mode: 'insensitive' } }],
          isActive: true,
        },
      }),
    ]);

    if (!dealerPayable || !commissionExpense || !cashAccount || !bankAccount) {
      throw new Error('Required accounts not found in Chart of Accounts. Please seed accounts first.');
    }

    return {
      dealerPayableAccountId: dealerPayable.id,
      commissionExpenseAccountId: commissionExpense.id,
      cashAccountId: cashAccount.id,
      bankAccountId: bankAccount.id,
    };
  }

  /**
   * Get current balance for a dealer
   */
  static async getDealerBalance(dealerId: string): Promise<number> {
    const latestEntry = await prisma.dealerLedger.findFirst({
      where: { dealerId },
      orderBy: { date: 'desc' },
    });

    return latestEntry?.balance || 0;
  }

  /**
   * Create a dealer ledger entry
   */
  static async createDealerLedgerEntry(
    payload: CreateDealerLedgerEntryPayload,
    tx?: Prisma.TransactionClient
  ): Promise<any> {
    const prismaClient = tx || prisma;

    // Get current balance
    const currentBalance = await this.getDealerBalance(payload.dealerId);

    // Calculate new balance
    let newBalance = currentBalance;
    if (payload.entryType === 'commission') {
      newBalance += payload.amount; // Commission increases payable (credit)
    } else if (payload.entryType === 'payment') {
      newBalance -= payload.amount; // Payment decreases payable (debit)
    } else if (payload.entryType === 'adjustment') {
      newBalance += payload.amount; // Adjustment can be positive or negative
    }

    const accounts = await this.getAccounts();
    const entryDate = payload.date || new Date();

    // If already in a transaction, use the client directly, otherwise start a new transaction
    if (tx) {
      return await this.recordCommissionPayableInTransaction(payload, prismaClient, {
        commissionExpenseAccountId: accounts.commissionExpenseAccountId,
        dealerPayableAccountId: accounts.dealerPayableAccountId,
        cashAccountId: accounts.cashAccountId,
        bankAccountId: accounts.bankAccountId,
      });
    } else {
      return await prisma.$transaction(async (client: Prisma.TransactionClient) => {
        return await this.recordCommissionPayableInTransaction(payload, client, {
          commissionExpenseAccountId: accounts.commissionExpenseAccountId,
          dealerPayableAccountId: accounts.dealerPayableAccountId,
          cashAccountId: accounts.cashAccountId,
          bankAccountId: accounts.bankAccountId,
        });
      });
    }
  }

  /**
   * Internal method to record commission in transaction
   */
  private static async recordCommissionPayableInTransaction(
    payload: CreateDealerLedgerEntryPayload,
    client: Prisma.TransactionClient,
    accounts: { commissionExpenseAccountId: string; dealerPayableAccountId: string; cashAccountId: string; bankAccountId: string }
  ): Promise<any> {
    const entryDate = payload.date || new Date();
    let ledgerEntryId: string | null = null;
    
    // Calculate new balance
    const previousEntries = await client.dealerLedger.findMany({
      where: { dealerId: payload.dealerId },
      orderBy: { date: 'desc' },
      take: 1,
    });
    const previousBalance = previousEntries.length > 0 ? previousEntries[0].balance : 0;
    let newBalance = previousBalance;
    if (payload.entryType === 'commission') {
      newBalance = previousBalance + payload.amount;
    } else if (payload.entryType === 'payment') {
      newBalance = previousBalance - payload.amount;
    } else if (payload.entryType === 'adjustment') {
      newBalance = previousBalance + payload.amount;
    }

    // Create ledger entries based on entry type
    if (payload.entryType === 'commission') {
        // Commission entry: Debit Commission Expense, Credit Dealer Payable
        const expenseEntry = await LedgerService.createLedgerEntry(
          {
            dealId: payload.dealId || '',
            debitAccountId: accounts.commissionExpenseAccountId,
            amount: payload.amount,
            remarks: payload.description || `Commission for dealer`,
            date: entryDate,
          },
          client
        );

        const payableEntry = await LedgerService.createLedgerEntry(
          {
            dealId: payload.dealId || '',
            creditAccountId: accounts.dealerPayableAccountId,
            amount: payload.amount,
            remarks: payload.description || `Commission payable to dealer`,
            date: entryDate,
          },
          client
        );

        ledgerEntryId = payableEntry.id; // Use payable entry as reference
      } else if (payload.entryType === 'payment') {
        // Payment entry: Debit Dealer Payable, Credit Cash/Bank
        const paymentAccountId = payload.referenceType === 'cash' ? accounts.cashAccountId : accounts.bankAccountId;

        const payableEntry = await LedgerService.createLedgerEntry(
          {
            dealId: payload.dealId || '',
            debitAccountId: accounts.dealerPayableAccountId,
            amount: payload.amount,
            remarks: payload.description || `Payment to dealer`,
            date: entryDate,
          },
          client
        );

        const cashEntry = await LedgerService.createLedgerEntry(
          {
            dealId: payload.dealId || '',
            creditAccountId: paymentAccountId,
            amount: payload.amount,
            remarks: payload.description || `Payment to dealer`,
            date: entryDate,
          },
          client
        );

        ledgerEntryId = payableEntry.id;
    }

    // Create dealer ledger entry
    const dealerLedgerEntry = await client.dealerLedger.create({
        data: {
          dealerId: payload.dealerId,
          dealId: payload.dealId || null,
          clientId: payload.clientId || null,
          entryType: payload.entryType,
          amount: payload.amount,
          balance: Math.round(newBalance * 100) / 100,
          description: payload.description,
          referenceId: payload.referenceId,
          referenceType: payload.referenceType,
          ledgerEntryId,
          date: entryDate,
        },
      });

    // Update dealer's total commission earned
    if (payload.entryType === 'commission') {
      await client.dealer.update({
        where: { id: payload.dealerId },
        data: {
          totalCommissionEarned: {
            increment: payload.amount,
          },
        },
      });
    }

    return dealerLedgerEntry;
  }

  /**
   * Record commission for a dealer (when deal is closed)
   */
  static async recordCommission(
    dealerId: string,
    dealId: string,
    clientId: string,
    commissionAmount: number,
    description?: string,
    tx?: Prisma.TransactionClient
  ): Promise<any> {
    return await this.createDealerLedgerEntry(
      {
        dealerId,
        dealId,
        clientId,
        entryType: 'commission',
        amount: commissionAmount,
        description: description || `Commission from deal`,
        referenceId: dealId,
        referenceType: 'deal',
      },
      tx
    );
  }

  /**
   * Record payment to dealer
   */
  static async recordPayment(
    dealerId: string,
    amount: number,
    paymentMode: 'cash' | 'bank',
    description?: string,
    referenceId?: string,
    tx?: Prisma.TransactionClient
  ): Promise<any> {
    return await this.createDealerLedgerEntry(
      {
        dealerId,
        entryType: 'payment',
        amount,
        description: description || `Payment to dealer`,
        referenceId,
        referenceType: paymentMode,
      },
      tx
    );
  }

  /**
   * Get dealer ledger with summary
   */
  static async getDealerLedger(
    dealerId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      dealId?: string;
    }
  ): Promise<{
    entries: any[];
    summary: {
      totalCommission: number;
      totalPayments: number;
      outstandingBalance: number;
    };
  }> {
    const where: any = { dealerId };

    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = filters.startDate;
      if (filters.endDate) where.date.lte = filters.endDate;
    }

    if (filters?.dealId) {
      where.dealId = filters.dealId;
    }

    const entries = await prisma.dealerLedger.findMany({
      where,
      include: {
        deal: {
          include: {
            client: { select: { id: true, name: true, clientCode: true } },
          },
        },
        client: { select: { id: true, name: true, clientCode: true } },
      },
      orderBy: { date: 'asc' },
    });

    const totalCommission = entries
      .filter((e) => e.entryType === 'commission')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalPayments = entries
      .filter((e) => e.entryType === 'payment')
      .reduce((sum, e) => sum + e.amount, 0);

    const outstandingBalance = entries.length > 0 ? entries[entries.length - 1].balance : 0;

    return {
      entries,
      summary: {
        totalCommission: Math.round(totalCommission * 100) / 100,
        totalPayments: Math.round(totalPayments * 100) / 100,
        outstandingBalance: Math.round(outstandingBalance * 100) / 100,
      },
    };
  }
}

