/**
 * Financial Reporting Service
 * Generates Trial Balance, Balance Sheet, P&L, Property Profitability, Escrow Report, and Aging Reports
 */

import prisma from '../prisma/client';
import { AccountValidationService } from './account-validation-service';

export interface TrialBalanceEntry {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  normalBalance: string;
  debitTotal: number;
  creditTotal: number;
  balance: number;
}

export interface BalanceSheet {
  assets: {
    current: TrialBalanceEntry[];
    fixed: TrialBalanceEntry[];
    total: number;
  };
  liabilities: {
    current: TrialBalanceEntry[];
    total: number;
  };
  equity: {
    capital: TrialBalanceEntry[];
    retainedEarnings: TrialBalanceEntry[];
    currentYearProfit: TrialBalanceEntry[];
    total: number;
  };
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
}

export interface ProfitAndLoss {
  revenue: {
    propertyRevenue: TrialBalanceEntry[];
    serviceIncome: TrialBalanceEntry[];
    total: number;
  };
  expenses: {
    selling: TrialBalanceEntry[];
    property: TrialBalanceEntry[];
    administrative: TrialBalanceEntry[];
    tax: TrialBalanceEntry[];
    total: number;
  };
  netProfit: number;
  period: {
    startDate: Date;
    endDate: Date;
  };
}

export interface PropertyProfitability {
  propertyId: string;
  propertyName: string;
  propertyCode?: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  profitMargin: number;
  revenueBreakdown: Array<{
    accountCode: string;
    accountName: string;
    amount: number;
  }>;
  expenseBreakdown: Array<{
    accountCode: string;
    accountName: string;
    amount: number;
  }>;
}

export interface EscrowReport {
  trustAssets: {
    accountCode: string;
    accountName: string;
    balance: number;
  }[];
  clientLiabilities: {
    accountCode: string;
    accountName: string;
    balance: number;
  }[];
  totalTrustAssets: number;
  totalClientLiabilities: number;
  difference: number;
  isBalanced: boolean;
  violations: string[];
}

export interface AgingEntry {
  accountId: string;
  accountCode: string;
  accountName: string;
  current: number; // 0-30 days
  days31_60: number; // 31-60 days
  days61_90: number; // 61-90 days
  days91_plus: number; // 91+ days
  total: number;
  oldestDate?: Date;
}

export class FinancialReportingService {
  /**
   * Calculate account balance from ledger entries
   */
  private static async calculateAccountBalance(
    accountId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{ debitTotal: number; creditTotal: number; balance: number }> {
    const where: any = {
      OR: [
        { debitAccountId: accountId },
        { creditAccountId: accountId },
      ],
      deletedAt: null,
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const [debitEntries, creditEntries] = await Promise.all([
      prisma.ledgerEntry.aggregate({
        where: { ...where, debitAccountId: accountId },
        _sum: { amount: true },
      }),
      prisma.ledgerEntry.aggregate({
        where: { ...where, creditAccountId: accountId },
        _sum: { amount: true },
      }),
    ]);

    const debitTotal = debitEntries._sum.amount || 0;
    const creditTotal = creditEntries._sum.amount || 0;

    // Get account to determine normal balance
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    let balance = 0;
    if (account?.normalBalance === 'Debit') {
      balance = debitTotal - creditTotal;
    } else {
      balance = creditTotal - debitTotal;
    }

    return {
      debitTotal: Number(debitTotal.toFixed(2)),
      creditTotal: Number(creditTotal.toFixed(2)),
      balance: Number(balance.toFixed(2)),
    };
  }

  /**
   * Generate Trial Balance
   * Sum of all posting accounts
   */
  static async generateTrialBalance(
    startDate?: Date,
    endDate?: Date
  ): Promise<TrialBalanceEntry[]> {
    const accounts = await prisma.account.findMany({
      where: {
        isActive: true,
        isPostable: true, // Only posting accounts
        level: 5, // Level 5 accounts only
      },
      orderBy: [{ code: 'asc' }],
    });

    const entries: TrialBalanceEntry[] = [];

    for (const account of accounts) {
      let debitTotal = 0;
      let creditTotal = 0;
      let balance = 0;

      if (startDate) {
        const openingEnd = new Date(startDate);
        openingEnd.setMilliseconds(openingEnd.getMilliseconds() - 1);

        const opening = await this.calculateAccountBalance(account.id, undefined, openingEnd);
        const movement = await this.calculateAccountBalance(account.id, startDate, endDate);

        debitTotal = opening.debitTotal + movement.debitTotal;
        creditTotal = opening.creditTotal + movement.creditTotal;
      } else {
        const totals = await this.calculateAccountBalance(account.id, undefined, endDate);
        debitTotal = totals.debitTotal;
        creditTotal = totals.creditTotal;
      }

      if (account.normalBalance === 'Debit') {
        balance = debitTotal - creditTotal;
      } else {
        balance = creditTotal - debitTotal;
      }

      if (balance !== 0 || debitTotal > 0 || creditTotal > 0) {
        entries.push({
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          accountType: account.type,
          normalBalance: account.normalBalance,
          debitTotal: Number(debitTotal.toFixed(2)),
          creditTotal: Number(creditTotal.toFixed(2)),
          balance: Number(balance.toFixed(2)),
        });
      }
    }

    return entries;
  }

  /**
   * Generate Balance Sheet
   * Assets = Liabilities + Equity
   */
  static async generateBalanceSheet(
    asOfDate?: Date
  ): Promise<BalanceSheet> {
    const endDate = asOfDate || new Date();

    // Get all accounts
    const allAccounts = await prisma.account.findMany({
      where: { isActive: true },
      orderBy: [{ code: 'asc' }],
    });

    // Assets (1xxx) excluding trust/escrow accounts
    const assetAccounts = allAccounts.filter(a => a.code.startsWith('1') && !a.trustFlag);
    const currentAssetAccounts = assetAccounts.filter(a => 
      a.code.startsWith('11') || a.code.startsWith('11')
    );
    const fixedAssetAccounts = assetAccounts.filter(a => 
      a.code.startsWith('12')
    );

    // Liabilities (2xxx)
    const liabilityAccounts = allAccounts.filter(a => 
      a.code.startsWith('2') && a.isPostable
    );

    // Equity (3xxx)
    const equityAccounts = allAccounts.filter(a => 
      a.code.startsWith('3') && a.isPostable
    );

    const processAccounts = async (accounts: any[]) => {
      const entries: TrialBalanceEntry[] = [];
      for (const account of accounts) {
        const balances = await this.calculateAccountBalance(account.id, undefined, endDate);
        entries.push({
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          accountType: account.type,
          normalBalance: account.normalBalance,
          debitTotal: balances.debitTotal,
          creditTotal: balances.creditTotal,
          balance: balances.balance,
        });
      }
      return entries;
    };

    const [currentAssets, fixedAssets, liabilities, equity] = await Promise.all([
      processAccounts(currentAssetAccounts),
      processAccounts(fixedAssetAccounts),
      processAccounts(liabilityAccounts),
      processAccounts(equityAccounts),
    ]);

    const assetsTotal = 
      currentAssets.reduce((sum, a) => sum + a.balance, 0) +
      fixedAssets.reduce((sum, a) => sum + a.balance, 0);

    const liabilitiesTotal = liabilities.reduce((sum, l) => sum + Math.abs(l.balance), 0);
    const equityTotal = equity.reduce((sum, e) => sum + Math.abs(e.balance), 0);
    const totalLiabilitiesAndEquity = liabilitiesTotal + equityTotal;

    return {
      assets: {
        current: currentAssets,
        fixed: fixedAssets,
        total: assetsTotal,
      },
      liabilities: {
        current: liabilities,
        total: liabilitiesTotal,
      },
      equity: {
        capital: equity.filter(e => e.accountCode.startsWith('3100')),
        retainedEarnings: equity.filter(e => e.accountCode.startsWith('3200')),
        currentYearProfit: equity.filter(e => e.accountCode.startsWith('3300')),
        total: equityTotal,
      },
      totalLiabilitiesAndEquity,
      isBalanced: Math.abs(assetsTotal - totalLiabilitiesAndEquity) < 0.01,
    };
  }

  /**
   * Generate Profit & Loss Statement
   * Income – Expenses
   */
  static async generateProfitAndLoss(
    startDate: Date,
    endDate: Date
  ): Promise<ProfitAndLoss> {
    // Revenue accounts (4xxx)
    const revenueAccounts = await prisma.account.findMany({
      where: {
        isActive: true,
        isPostable: true,
        type: 'Revenue',
        code: { startsWith: '4' },
      },
      orderBy: [{ code: 'asc' }],
    });

    // Expense accounts (5xxx)
    const expenseAccounts = await prisma.account.findMany({
      where: {
        isActive: true,
        isPostable: true,
        type: 'Expense',
        code: { startsWith: '5' },
      },
      orderBy: [{ code: 'asc' }],
    });

    const processAccounts = async (accounts: any[]) => {
      const entries: TrialBalanceEntry[] = [];
      for (const account of accounts) {
        const balances = await this.calculateAccountBalance(account.id, startDate, endDate);
        entries.push({
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          accountType: account.type,
          normalBalance: account.normalBalance,
          debitTotal: balances.debitTotal,
          creditTotal: balances.creditTotal,
          balance: balances.balance,
        });
      }
      return entries;
    };

    const [revenueEntries, expenseEntries] = await Promise.all([
      processAccounts(revenueAccounts),
      processAccounts(expenseAccounts),
    ]);

    const propertyRevenue = revenueEntries.filter(e => e.accountCode.startsWith('4111'));
    const serviceIncome = revenueEntries.filter(e => e.accountCode.startsWith('4211'));

    const sellingExpenses = expenseEntries.filter(e => e.accountCode.startsWith('5111'));
    const propertyExpenses = expenseEntries.filter(e => e.accountCode.startsWith('5211'));
    const administrativeExpenses = expenseEntries.filter(e => e.accountCode.startsWith('5311'));
    const taxExpenses = expenseEntries.filter(e => e.accountCode.startsWith('5411'));

    const totalRevenue = revenueEntries.reduce((sum, r) => sum + Math.abs(r.balance), 0);
    const totalExpenses = expenseEntries.reduce((sum, e) => sum + Math.abs(e.balance), 0);
    const netProfit = totalRevenue - totalExpenses;

    return {
      revenue: {
        propertyRevenue,
        serviceIncome,
        total: totalRevenue,
      },
      expenses: {
        selling: sellingExpenses,
        property: propertyExpenses,
        administrative: administrativeExpenses,
        tax: taxExpenses,
        total: totalExpenses,
      },
      netProfit: Number(netProfit.toFixed(2)),
      period: { startDate, endDate },
    };
  }

  /**
   * Generate Property Profitability Report
   * Filtered by Property ID
   * Uses both LedgerEntry (via deals) and FinanceLedger (direct property mapping)
   */
  static async generatePropertyProfitability(
    propertyId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<PropertyProfitability[]> {
    // Build date filter
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    // Build property filter
    const propertyFilter: any = {};
    if (propertyId) {
      propertyFilter.propertyId = propertyId;
    }

    // Get ledger entries from deals (revenue/expenses via deals)
    const ledgerEntryWhere: any = {
      deletedAt: null,
      ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
    };

    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: ledgerEntryWhere,
      include: {
        debitAccount: true,
        creditAccount: true,
        deal: {
          include: {
            property: true,
          },
        },
      },
    });

    // Get finance ledger entries (direct property mapping for expenses/income)
    const financeLedgerWhere: any = {
      isDeleted: false,
      propertyId: propertyId ? propertyId : undefined,
      ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
    };

    const financeLedgerEntries = await prisma.financeLedger.findMany({
      where: financeLedgerWhere,
      include: {
        Property: true,
      },
    });

    // Get all properties for mapping
    const properties = await prisma.property.findMany({
      where: {
        isDeleted: false,
        ...propertyFilter,
      },
      select: {
        id: true,
        name: true,
        propertyCode: true,
      },
    });

    // Group by property
    const propertyMap = new Map<string, PropertyProfitability>();

    // Initialize all properties (even if no transactions)
    for (const property of properties) {
      if (!propertyMap.has(property.id)) {
        propertyMap.set(property.id, {
          propertyId: property.id,
          propertyName: property.name,
          propertyCode: property.propertyCode || undefined,
          revenue: 0,
          expenses: 0,
          netProfit: 0,
          profitMargin: 0,
          revenueBreakdown: [],
          expenseBreakdown: [],
        });
      }
    }

    // Process LedgerEntry transactions (via deals)
    for (const entry of ledgerEntries) {
      const propId = entry.deal?.propertyId;
      if (!propId) {
        // Skip entries without property association (log but don't fail)
        console.warn(`LedgerEntry ${entry.id} has no property association`);
        continue;
      }

      if (!propertyMap.has(propId)) {
        const property = await prisma.property.findUnique({
          where: { id: propId },
          select: { name: true, propertyCode: true },
        });
        propertyMap.set(propId, {
          propertyId: propId,
          propertyName: property?.name || 'Unknown Property',
          propertyCode: property?.propertyCode || undefined,
          revenue: 0,
          expenses: 0,
          netProfit: 0,
          profitMargin: 0,
          revenueBreakdown: [],
          expenseBreakdown: [],
        });
      }

      const profitability = propertyMap.get(propId)!;

      // Process debit account (expense)
      if (entry.debitAccount && entry.debitAccount.type === 'Expense') {
        profitability.expenses += entry.amount;
        const existing = profitability.expenseBreakdown.find(
          e => e.accountCode === entry.debitAccount!.code
        );
        if (existing) {
          existing.amount += entry.amount;
        } else {
          profitability.expenseBreakdown.push({
            accountCode: entry.debitAccount.code,
            accountName: entry.debitAccount.name,
            amount: entry.amount,
          });
        }
      }

      // Process credit account (revenue)
      if (entry.creditAccount && entry.creditAccount.type === 'Revenue') {
        profitability.revenue += entry.amount;
        const existing = profitability.revenueBreakdown.find(
          r => r.accountCode === entry.creditAccount!.code
        );
        if (existing) {
          existing.amount += entry.amount;
        } else {
          profitability.revenueBreakdown.push({
            accountCode: entry.creditAccount.code,
            accountName: entry.creditAccount.name,
            amount: entry.amount,
          });
        }
      }
    }

    // Process FinanceLedger entries (direct property expenses/income)
    for (const entry of financeLedgerEntries) {
      if (!entry.propertyId) continue;

      if (!propertyMap.has(entry.propertyId)) {
        propertyMap.set(entry.propertyId, {
          propertyId: entry.propertyId,
          propertyName: entry.Property?.name || 'Unknown Property',
          propertyCode: entry.Property?.propertyCode || undefined,
          revenue: 0,
          expenses: 0,
          netProfit: 0,
          profitMargin: 0,
          revenueBreakdown: [],
          expenseBreakdown: [],
        });
      }

      const profitability = propertyMap.get(entry.propertyId)!;

      // Categorize by category field
      if (entry.category === 'Income' || entry.category === 'Revenue') {
        profitability.revenue += entry.amount;
        profitability.revenueBreakdown.push({
          accountCode: entry.category,
          accountName: entry.description || entry.category,
          amount: entry.amount,
        });
      } else if (entry.category === 'Expense' || entry.category === 'Maintenance' || entry.category === 'Utility') {
        profitability.expenses += entry.amount;
        const existing = profitability.expenseBreakdown.find(
          e => e.accountCode === entry.category
        );
        if (existing) {
          existing.amount += entry.amount;
        } else {
          profitability.expenseBreakdown.push({
            accountCode: entry.category,
            accountName: entry.description || entry.category,
            amount: entry.amount,
          });
        }
      }
    }

    // Calculate net profit and margins (handle missing data gracefully)
    const results = Array.from(propertyMap.values()).map(p => ({
      ...p,
      netProfit: Number((p.revenue - p.expenses).toFixed(2)),
      profitMargin: p.revenue > 0 
        ? Number(((p.revenue - p.expenses) / p.revenue * 100).toFixed(2))
        : p.revenue === 0 && p.expenses > 0 ? -100 : 0,
      revenue: Number(p.revenue.toFixed(2)),
      expenses: Number(p.expenses.toFixed(2)),
    }));

    return results;
  }

  /**
   * Generate Escrow Report
   * Trust Assets = Client Liabilities
   */
  static async generateEscrowReport(): Promise<EscrowReport> {
    // Trust Asset accounts (112101, 112102)
    const trustAssetAccounts = await prisma.account.findMany({
      where: {
        isActive: true,
        OR: [
          { code: '112101' }, // Client Advances – Trust
          { code: '112102' }, // Security Deposits – Trust
        ],
      },
    });

    // Client Liability accounts (211101, 211102)
    const clientLiabilityAccounts = await prisma.account.findMany({
      where: {
        isActive: true,
        OR: [
          { code: '211101' }, // Client Advances Payable
          { code: '211102' }, // Security Deposits Payable
        ],
      },
    });

    const trustAssets = await Promise.all(
      trustAssetAccounts.map(async (account) => {
        const balances = await this.calculateAccountBalance(account.id);
        return {
          accountCode: account.code,
          accountName: account.name,
          balance: balances.balance,
        };
      })
    );

    const clientLiabilities = await Promise.all(
      clientLiabilityAccounts.map(async (account) => {
        const balances = await this.calculateAccountBalance(account.id);
        return {
          accountCode: account.code,
          accountName: account.name,
          balance: Math.abs(balances.balance), // Liabilities are credit balances
        };
      })
    );

    const totalTrustAssets = trustAssets.reduce((sum, a) => sum + a.balance, 0);
    const totalClientLiabilities = clientLiabilities.reduce((sum, l) => sum + l.balance, 0);
    const difference = totalTrustAssets - totalClientLiabilities;
    const isBalanced = Math.abs(difference) < 0.01;

    const violations: string[] = [];
    if (!isBalanced) {
      violations.push(
        `Escrow balance mismatch: Trust Assets (${totalTrustAssets.toFixed(2)}) ≠ Client Liabilities (${totalClientLiabilities.toFixed(2)})`
      );
    }

    if (totalTrustAssets < 0) {
      violations.push('Negative trust asset balance detected');
    }

    if (totalClientLiabilities < 0) {
      violations.push('Negative client liability balance detected');
    }

    return {
      trustAssets,
      clientLiabilities,
      totalTrustAssets: Number(totalTrustAssets.toFixed(2)),
      totalClientLiabilities: Number(totalClientLiabilities.toFixed(2)),
      difference: Number(difference.toFixed(2)),
      isBalanced,
      violations,
    };
  }

  /**
   * Generate Aging Report for Receivables/Payables
   * Date logic: Receivable/Payable date logic
   */
  static async generateAgingReport(
    type: 'Receivable' | 'Payable',
    asOfDate?: Date
  ): Promise<AgingEntry[]> {
    const cutoffDate = asOfDate || new Date();
    const days30 = new Date(cutoffDate);
    days30.setDate(days30.getDate() - 30);
    const days60 = new Date(cutoffDate);
    days60.setDate(days60.getDate() - 60);
    const days90 = new Date(cutoffDate);
    days90.setDate(days90.getDate() - 90);

    // Get receivable or payable accounts
    const accounts = await prisma.account.findMany({
      where: {
        isActive: true,
        isPostable: true,
        type: type === 'Receivable' ? 'Asset' : 'Liability',
        code: type === 'Receivable' ? { startsWith: '113' } : { startsWith: '212' },
      },
    });

    const agingEntries: AgingEntry[] = [];

    for (const account of accounts) {
      // Get all ledger entries for this account
      const entries = await prisma.ledgerEntry.findMany({
        where: {
          OR: [
            { debitAccountId: account.id },
            { creditAccountId: account.id },
          ],
          deletedAt: null,
          date: { lte: cutoffDate },
        },
        orderBy: { date: 'asc' },
      });

      let current = 0;
      let days31_60 = 0;
      let days61_90 = 0;
      let days91_plus = 0;
      let oldestDate: Date | undefined;

      for (const entry of entries) {
        const entryDate = entry.date;
        if (!oldestDate || entryDate < oldestDate) {
          oldestDate = entryDate;
        }

        const daysDiff = Math.floor(
          (cutoffDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        const amount = type === 'Receivable' 
          ? (entry.debitAccountId === account.id ? entry.amount : -entry.amount)
          : (entry.creditAccountId === account.id ? entry.amount : -entry.amount);

        if (daysDiff <= 30) {
          current += amount;
        } else if (daysDiff <= 60) {
          days31_60 += amount;
        } else if (daysDiff <= 90) {
          days61_90 += amount;
        } else {
          days91_plus += amount;
        }
      }

      const total = current + days31_60 + days61_90 + days91_plus;

      if (total !== 0) {
        agingEntries.push({
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          current: Number(Math.abs(current).toFixed(2)),
          days31_60: Number(Math.abs(days31_60).toFixed(2)),
          days61_90: Number(Math.abs(days61_90).toFixed(2)),
          days91_plus: Number(Math.abs(days91_plus).toFixed(2)),
          total: Number(Math.abs(total).toFixed(2)),
          oldestDate,
        });
      }
    }

    return agingEntries;
  }
}

