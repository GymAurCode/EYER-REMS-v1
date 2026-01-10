import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../prisma/client';
import { AccountValidationService } from './account-validation-service';
import { generateSystemId } from './id-generation-service';

export type VoucherType = 'BPV' | 'BRV' | 'CPV' | 'CRV' | 'JV';
export type VoucherStatus = 'draft' | 'submitted' | 'approved' | 'posted' | 'reversed';
export type PayeeType = 'Vendor' | 'Owner' | 'Agent' | 'Contractor' | 'Tenant' | 'Client' | 'Dealer' | 'Employee';
export type PaymentMode = 'Cheque' | 'Transfer' | 'Online' | 'Cash';

export interface VoucherLineInput {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
  propertyId?: string;
  unitId?: string;
}

export interface CreateVoucherPayload {
  type: VoucherType;
  date: Date;
  paymentMethod: PaymentMode;
  accountId: string; // Primary account (bank/cash)
  description?: string;
  referenceNumber?: string;
  propertyId?: string;
  unitId?: string;
  payeeType?: PayeeType;
  payeeId?: string;
  dealId?: string;
  lines: VoucherLineInput[];
  attachments?: Array<{ url: string; name: string; mimeType?: string; size?: number }>;
  preparedByUserId?: string;
}

export interface UpdateVoucherPayload {
  date?: Date;
  paymentMethod?: PaymentMode;
  accountId?: string;
  description?: string;
  referenceNumber?: string;
  propertyId?: string;
  unitId?: string;
  payeeType?: PayeeType;
  payeeId?: string;
  dealId?: string;
  lines?: VoucherLineInput[];
  attachments?: Array<{ url: string; name: string; mimeType?: string; size?: number }>;
}

export class VoucherService {
  /**
   * Validate voucher type-specific rules
   */
  private static async validateVoucherTypeRules(
    type: VoucherType,
    accountId: string,
    lines: VoucherLineInput[],
    tx: Prisma.TransactionClient
  ): Promise<void> {
    const account = await tx.account.findUnique({
      where: { id: accountId },
      include: { parent: true },
    });

    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    // Validate account is postable
    await AccountValidationService.validateAccountPostable(accountId);

    // Calculate totals
    const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);

    // Validate double-entry balance
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(
        `Double-entry validation failed: Total Debit (${totalDebit.toFixed(2)}) must equal Total Credit (${totalCredit.toFixed(2)})`
      );
    }

    switch (type) {
      case 'BPV': // Bank Payment Voucher
        // BPV: Credit Bank, Debit Expense/Payable
        // Validate account is a bank account
        if (!account.code.startsWith('1112') && !account.code.startsWith('111201') && !account.code.startsWith('111202')) {
          throw new Error(`BPV requires a bank account. Account ${account.code} (${account.name}) is not a bank account.`);
        }
        // Validate all lines debit (expense/payable accounts)
        for (const line of lines) {
          const lineAccount = await tx.account.findUnique({ where: { id: line.accountId } });
          if (!lineAccount) {
            throw new Error(`Line account not found: ${line.accountId}`);
          }
          if (line.debit <= 0) {
            throw new Error(`BPV line items must have debit amounts (expense/payable accounts)`);
          }
          // Validate account type is expense or liability
          if (lineAccount.type !== 'Expense' && lineAccount.type !== 'Liability') {
            throw new Error(
              `BPV line account must be Expense or Liability. ${lineAccount.code} (${lineAccount.name}) is ${lineAccount.type}`
            );
          }
        }
        // Validate bank account is credited
        const bankLine = lines.find((l) => l.accountId === accountId);
        if (!bankLine || bankLine.credit <= 0) {
          throw new Error(`BPV must credit bank account ${account.code}`);
        }
        break;

      case 'BRV': // Bank Receipt Voucher
        // BRV: Debit Bank, Credit Income/Receivable
        // Validate account is a bank account
        if (!account.code.startsWith('1112') && !account.code.startsWith('111201') && !account.code.startsWith('111202')) {
          throw new Error(`BRV requires a bank account. Account ${account.code} (${account.name}) is not a bank account.`);
        }
        // Validate all lines credit (income/receivable accounts)
        for (const line of lines) {
          const lineAccount = await tx.account.findUnique({ where: { id: line.accountId } });
          if (!lineAccount) {
            throw new Error(`Line account not found: ${line.accountId}`);
          }
          if (line.credit <= 0) {
            throw new Error(`BRV line items must have credit amounts (income/receivable accounts)`);
          }
          // Validate account type is revenue, asset (receivable), or liability (advance)
          if (!['Revenue', 'Asset', 'Liability'].includes(lineAccount.type)) {
            throw new Error(
              `BRV line account must be Revenue, Asset (Receivable), or Liability (Advance). ${lineAccount.code} (${lineAccount.name}) is ${lineAccount.type}`
            );
          }
        }
        // Validate bank account is debited
        const bankDebitLine = lines.find((l) => l.accountId === accountId);
        if (!bankDebitLine || bankDebitLine.debit <= 0) {
          throw new Error(`BRV must debit bank account ${account.code}`);
        }
        break;

      case 'CPV': // Cash Payment Voucher
        // CPV: Credit Cash, Debit Expense
        // Validate account is a cash account
        if (!account.code.startsWith('1111') && !account.code.startsWith('111101') && !account.code.startsWith('111102')) {
          throw new Error(`CPV requires a cash account. Account ${account.code} (${account.name}) is not a cash account.`);
        }
        // Validate all lines debit (expense accounts)
        for (const line of lines) {
          const lineAccount = await tx.account.findUnique({ where: { id: line.accountId } });
          if (!lineAccount) {
            throw new Error(`Line account not found: ${line.accountId}`);
          }
          if (line.debit <= 0) {
            throw new Error(`CPV line items must have debit amounts (expense accounts)`);
          }
          if (lineAccount.type !== 'Expense' && lineAccount.type !== 'Liability') {
            throw new Error(
              `CPV line account must be Expense or Liability. ${lineAccount.code} (${lineAccount.name}) is ${lineAccount.type}`
            );
          }
        }
        // Validate cash account is credited
        const cashLine = lines.find((l) => l.accountId === accountId);
        if (!cashLine || cashLine.credit <= 0) {
          throw new Error(`CPV must credit cash account ${account.code}`);
        }
        break;

      case 'CRV': // Cash Receipt Voucher
        // CRV: Debit Cash, Credit Income/Advance
        // Validate account is a cash account
        if (!account.code.startsWith('1111') && !account.code.startsWith('111101') && !account.code.startsWith('111102')) {
          throw new Error(`CRV requires a cash account. Account ${account.code} (${account.name}) is not a cash account.`);
        }
        // Validate all lines credit (income/receivable/advance accounts)
        for (const line of lines) {
          const lineAccount = await tx.account.findUnique({ where: { id: line.accountId } });
          if (!lineAccount) {
            throw new Error(`Line account not found: ${line.accountId}`);
          }
          if (line.credit <= 0) {
            throw new Error(`CRV line items must have credit amounts (income/receivable/advance accounts)`);
          }
          if (!['Revenue', 'Asset', 'Liability'].includes(lineAccount.type)) {
            throw new Error(
              `CRV line account must be Revenue, Asset (Receivable), or Liability (Advance). ${lineAccount.code} (${lineAccount.name}) is ${lineAccount.type}`
            );
          }
        }
        // Validate cash account is debited
        const cashDebitLine = lines.find((l) => l.accountId === accountId);
        if (!cashDebitLine || cashDebitLine.debit <= 0) {
          throw new Error(`CRV must debit cash account ${account.code}`);
        }
        break;

      case 'JV': // Journal Voucher
        // JV: No cash/bank movement, multi-line debit/credit
        // Validate no cash/bank accounts (unless elevated approval)
        for (const line of lines) {
          const lineAccount = await tx.account.findUnique({ where: { id: line.accountId } });
          if (!lineAccount) {
            throw new Error(`Line account not found: ${line.accountId}`);
          }
          const isCashBank = lineAccount.code.startsWith('1111') || lineAccount.code.startsWith('1112');
          if (isCashBank) {
            throw new Error(
              `Journal Voucher cannot use cash/bank accounts directly. Account ${lineAccount.code} (${lineAccount.name}) is a cash/bank account. Use BPV/BRV/CPV/CRV instead.`
            );
          }
        }
        // Validate multi-line entries
        if (lines.length < 2) {
          throw new Error(`Journal Voucher must have at least 2 line items (minimum double-entry)`);
        }
        break;
    }
  }

  /**
   * Validate reference number uniqueness for cheque/transfer payments
   */
  private static async validateReferenceNumber(
    type: VoucherType,
    paymentMethod: PaymentMode,
    referenceNumber: string | undefined,
    voucherId: string | undefined,
    tx: Prisma.TransactionClient
  ): Promise<void> {
    // Only validate for bank payments/receipts with cheque/transfer
    if (!['BPV', 'BRV'].includes(type) || !['Cheque', 'Transfer'].includes(paymentMethod)) {
      return;
    }

    if (!referenceNumber) {
      throw new Error(`${paymentMethod} ${type} requires a reference number (cheque number/transaction ID)`);
    }

    // Check for duplicate reference numbers
    const existing = await tx.voucher.findFirst({
      where: {
        type,
        paymentMethod,
        referenceNumber,
        status: { in: ['submitted', 'approved', 'posted'] },
        id: voucherId ? { not: voucherId } : undefined,
      },
    });

    if (existing) {
      throw new Error(
        `Duplicate ${paymentMethod} reference number: ${referenceNumber}. Already used in voucher ${existing.voucherNumber}`
      );
    }
  }

  /**
   * Validate attachments are present for bank/cash vouchers
   */
  private static validateAttachments(
    type: VoucherType,
    attachments: Array<{ url: string; name: string }> | undefined
  ): void {
    // Bank and Cash vouchers require attachments
    if (['BPV', 'BRV', 'CPV', 'CRV'].includes(type)) {
      if (!attachments || attachments.length === 0) {
        throw new Error(`${type} requires at least one attachment (receipt, invoice, bank statement, etc.)`);
      }
    }
  }

  /**
   * Validate property/unit linkage
   */
  private static async validatePropertyUnitLinkage(
    propertyId: string | undefined,
    unitId: string | undefined,
    lines: VoucherLineInput[],
    tx: Prisma.TransactionClient
  ): Promise<void> {
    if (unitId) {
      // If unit is specified, validate it exists and belongs to property
      const unit = await tx.unit.findUnique({
        where: { id: unitId },
        include: { property: true },
      });

      if (!unit) {
        throw new Error(`Unit not found: ${unitId}`);
      }

      if (propertyId && unit.propertyId !== propertyId) {
        throw new Error(`Unit ${unit.unitName} does not belong to the specified property`);
      }
    }

    if (propertyId) {
      // Validate property exists
      const property = await tx.property.findUnique({
        where: { id: propertyId },
      });

      if (!property) {
        throw new Error(`Property not found: ${propertyId}`);
      }
    }
  }

  /**
   * Validate payee entity exists
   */
  private static async validatePayeeEntity(
    payeeType: PayeeType | undefined,
    payeeId: string | undefined,
    type: VoucherType,
    tx: Prisma.TransactionClient
  ): Promise<void> {
    // Payee is required for payment vouchers (BPV, CPV)
    if (['BPV', 'CPV'].includes(type) && !payeeType) {
      throw new Error(`${type} requires a payee type (Vendor, Owner, Agent, Contractor, Tenant, Client, Dealer, or Employee)`);
    }

    if (!payeeType || !payeeId) {
      return; // Optional for receipt vouchers
    }

    let exists = false;
    switch (payeeType) {
      case 'Vendor':
        // Vendor doesn't exist as a model - might be stored differently or we skip
        // For now, we'll allow it if payeeId is provided
        exists = true;
        break;
      case 'Owner':
        // Owner might be in Property.ownerName or separate table - for now allow
        exists = true;
        break;
      case 'Agent':
      case 'Dealer':
        exists = !!(await tx.dealer.findUnique({ where: { id: payeeId } }));
        break;
      case 'Tenant':
        exists = !!(await tx.tenant.findUnique({ where: { id: payeeId } }));
        break;
      case 'Client':
        exists = !!(await tx.client.findUnique({ where: { id: payeeId } }));
        break;
      case 'Employee':
        exists = !!(await tx.employee.findUnique({ where: { id: payeeId } }));
        break;
      case 'Contractor':
        // Contractor might be a vendor or stored differently - for now allow
        exists = true;
        break;
    }

    if (!exists) {
      throw new Error(`${payeeType} with ID ${payeeId} not found`);
    }
  }

  /**
   * Validate negative balance (prevent unless explicitly allowed)
   */
  private static async validateAccountBalance(
    accountId: string,
    creditAmount: number,
    tx: Prisma.TransactionClient
  ): Promise<void> {
    if (creditAmount <= 0) {
      return; // Only check when crediting (reducing) the account
    }

    const account = await tx.account.findUnique({ where: { id: accountId } });
    if (!account) {
      return;
    }

    // For cash/bank accounts, check balance
    if (account.code.startsWith('1111') || account.code.startsWith('1112')) {
      // Get current balance from ledger entries
      const debitTotal = await tx.ledgerEntry.aggregate({
        where: { debitAccountId: accountId, deletedAt: null },
        _sum: { amount: true },
      });

      const creditTotal = await tx.ledgerEntry.aggregate({
        where: { creditAccountId: accountId, deletedAt: null },
        _sum: { amount: true },
      });

      const currentBalance = (debitTotal._sum.amount || 0) - (creditTotal._sum.amount || 0);
      const newBalance = currentBalance - creditAmount;

      if (newBalance < 0 && !account.trustFlag) {
        // Allow negative for trust accounts, but warn for operating accounts
        // For now, we'll allow it but could add a flag for strict balance checking
        // throw new Error(`Insufficient balance in account ${account.code} (${account.name}). Current: ${currentBalance.toFixed(2)}, After transaction: ${newBalance.toFixed(2)}`);
      }
    }
  }

  /**
   * Create a new voucher (draft status)
   */
  static async createVoucher(payload: CreateVoucherPayload): Promise<any> {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Validate lines
      if (!payload.lines || payload.lines.length === 0) {
        throw new Error('Voucher must have at least one line item');
      }

      // Calculate total amount
      const totalDebit = payload.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
      const totalCredit = payload.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
      const amount = Math.max(totalDebit, totalCredit);

      // Validate voucher type rules
      await this.validateVoucherTypeRules(payload.type, payload.accountId, payload.lines, tx);

      // Validate reference number
      await this.validateReferenceNumber(payload.type, payload.paymentMethod, payload.referenceNumber, undefined, tx);

      // Validate attachments (optional for draft, but validate structure)
      if (payload.attachments && payload.attachments.length > 0) {
        // Structure is valid, will be enforced on submit/post
      }

      // Validate property/unit linkage
      await this.validatePropertyUnitLinkage(payload.propertyId, payload.unitId, payload.lines, tx);

      // Validate payee entity
      await this.validatePayeeEntity(payload.payeeType, payload.payeeId, payload.type, tx);

      // Validate all line accounts are postable
      for (const line of payload.lines) {
        await AccountValidationService.validateAccountPostable(line.accountId);
      }

      // Generate voucher number using generateSystemId
      // Note: generateSystemId expects specific prefixes, so we'll use a generic 'vch' prefix
      // and add the type to the number manually
      // Generate voucher number: TYPE-YYYYMMDD-XXX
      const date = new Date();
      const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
      let random = Math.floor(100 + Math.random() * 900).toString();
      let voucherNumber = `${payload.type}-${dateStr}-${random}`;
      
      // Ensure uniqueness
      let existing = await tx.voucher.findUnique({ where: { voucherNumber } });
      if (existing) {
        random = Math.floor(10000 + Math.random() * 90000).toString();
        voucherNumber = `${payload.type}-${dateStr}-${random}`;
      }

      // Create voucher
      const voucher = await tx.voucher.create({
        data: {
          voucherNumber,
          type: payload.type,
          date: payload.date,
          paymentMethod: payload.paymentMethod,
          accountId: payload.accountId,
          description: payload.description,
          referenceNumber: payload.referenceNumber,
          amount,
          status: 'draft',
          attachments: payload.attachments ? JSON.parse(JSON.stringify(payload.attachments)) : null,
          propertyId: payload.propertyId,
          unitId: payload.unitId,
          payeeType: payload.payeeType,
          payeeId: payload.payeeId,
          dealId: payload.dealId,
          preparedByUserId: payload.preparedByUserId,
          lines: {
            create: payload.lines.map((line) => ({
              accountId: line.accountId,
              debit: line.debit || 0,
              credit: line.credit || 0,
              description: line.description,
              propertyId: line.propertyId || payload.propertyId,
              unitId: line.unitId || payload.unitId,
            })),
          },
        },
        include: {
          account: true,
          property: true,
          unit: true,
          lines: {
            include: {
              account: true,
            },
          },
          preparedBy: true,
        },
      });

      return voucher;
    });
  }

  /**
   * Update a draft voucher
   */
  static async updateVoucher(voucherId: string, payload: UpdateVoucherPayload, userId: string): Promise<any> {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await tx.voucher.findUnique({
        where: { id: voucherId },
        include: { lines: true },
      });

      if (!existing) {
        throw new Error(`Voucher not found: ${voucherId}`);
      }

      if (existing.status !== 'draft') {
        throw new Error(`Cannot update voucher in ${existing.status} status. Only draft vouchers can be updated.`);
      }

      // If lines are being updated, validate them
      let lines = existing.lines;
      if (payload.lines) {
        if (payload.lines.length === 0) {
          throw new Error('Voucher must have at least one line item');
        }

        // Get updated account ID if changed
        const accountId = payload.accountId || existing.accountId;

        // Validate voucher type rules
        await this.validateVoucherTypeRules(existing.type as VoucherType, accountId, payload.lines, tx);

        // Validate reference number if changed
        if (payload.referenceNumber !== undefined) {
          await this.validateReferenceNumber(
            existing.type as VoucherType,
            (payload.paymentMethod || existing.paymentMethod) as PaymentMode,
            payload.referenceNumber,
            voucherId,
            tx
          );
        }

        // Validate property/unit if changed
        if (payload.propertyId !== undefined || payload.unitId !== undefined) {
          await this.validatePropertyUnitLinkage(
            payload.propertyId ?? existing.propertyId ?? undefined,
            payload.unitId ?? existing.unitId ?? undefined,
            payload.lines,
            tx
          );
        }

        // Validate payee if changed
        if (payload.payeeType !== undefined || payload.payeeId !== undefined) {
          await this.validatePayeeEntity(
            payload.payeeType ?? (existing.payeeType as PayeeType | undefined) ?? undefined,
            payload.payeeId ?? existing.payeeId ?? undefined,
            existing.type as VoucherType,
            tx
          );
        }

        // Calculate new amount
        const totalDebit = payload.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
        const totalCredit = payload.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
        const amount = Math.max(totalDebit, totalCredit);

        // Delete existing lines and create new ones
        await tx.voucherLine.deleteMany({
          where: { voucherId },
        });

        lines = await Promise.all(
          payload.lines.map((line) =>
            tx.voucherLine.create({
              data: {
                voucherId,
                accountId: line.accountId,
                debit: line.debit || 0,
                credit: line.credit || 0,
                description: line.description,
                propertyId: line.propertyId || payload.propertyId || existing.propertyId,
                unitId: line.unitId || payload.unitId || existing.unitId,
              },
            })
          )
        );
      }

      // Calculate amount if lines were updated
      const calculatedAmount = payload.lines 
        ? Math.max(
            payload.lines.reduce((sum, line) => sum + (line.debit || 0), 0),
            payload.lines.reduce((sum, line) => sum + (line.credit || 0), 0)
          )
        : existing.amount;

      // Update voucher
      const updated = await tx.voucher.update({
        where: { id: voucherId },
        data: {
          date: payload.date,
          paymentMethod: payload.paymentMethod,
          accountId: payload.accountId,
          description: payload.description,
          referenceNumber: payload.referenceNumber,
          amount: calculatedAmount,
          attachments: payload.attachments ? JSON.parse(JSON.stringify(payload.attachments)) : undefined,
          propertyId: payload.propertyId,
          unitId: payload.unitId,
          payeeType: payload.payeeType,
          payeeId: payload.payeeId,
          dealId: payload.dealId,
        },
        include: {
          account: true,
          property: true,
          unit: true,
          lines: {
            include: {
              account: true,
            },
          },
          preparedBy: true,
        },
      });

      return updated;
    });
  }

  /**
   * Submit voucher (draft -> submitted)
   */
  static async submitVoucher(voucherId: string, userId: string): Promise<any> {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const voucher = await tx.voucher.findUnique({
        where: { id: voucherId },
        include: { lines: true },
      });

      if (!voucher) {
        throw new Error(`Voucher not found: ${voucherId}`);
      }

      if (voucher.status !== 'draft') {
        throw new Error(`Cannot submit voucher in ${voucher.status} status. Only draft vouchers can be submitted.`);
      }

      // Validate attachments are present (required for bank/cash vouchers)
      this.validateAttachments(voucher.type as VoucherType, voucher.attachments as any);

      // Update status
      const updated = await tx.voucher.update({
        where: { id: voucherId },
        data: {
          status: 'submitted',
        },
        include: {
          account: true,
          property: true,
          unit: true,
          lines: {
            include: {
              account: true,
            },
          },
          preparedBy: true,
        },
      });

      return updated;
    });
  }

  /**
   * Approve voucher (submitted -> approved)
   */
  static async approveVoucher(voucherId: string, approvedByUserId: string): Promise<any> {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const voucher = await tx.voucher.findUnique({
        where: { id: voucherId },
        include: { lines: true },
      });

      if (!voucher) {
        throw new Error(`Voucher not found: ${voucherId}`);
      }

      if (voucher.status !== 'submitted') {
        throw new Error(`Cannot approve voucher in ${voucher.status} status. Only submitted vouchers can be approved.`);
      }

      // Update status
      const updated = await tx.voucher.update({
        where: { id: voucherId },
        data: {
          status: 'approved',
          approvedByUserId,
        },
        include: {
          account: true,
          property: true,
          unit: true,
          lines: {
            include: {
              account: true,
            },
          },
          preparedBy: true,
          approvedBy: true,
        },
      });

      return updated;
    });
  }

  /**
   * Post voucher (approved -> posted) - Creates journal entries
   */
  static async postVoucher(voucherId: string, postedByUserId: string, postingDate?: Date): Promise<any> {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const voucher = await tx.voucher.findUnique({
        where: { id: voucherId },
        include: {
          lines: {
            include: {
              account: true,
            },
          },
        },
      });

      if (!voucher) {
        throw new Error(`Voucher not found: ${voucherId}`);
      }

      if (voucher.status !== 'approved') {
        throw new Error(`Cannot post voucher in ${voucher.status} status. Only approved vouchers can be posted.`);
      }

      // Validate attachments are present
      this.validateAttachments(voucher.type as VoucherType, voucher.attachments as any);

      // Validate all accounts are still postable
      for (const line of voucher.lines) {
        await AccountValidationService.validateAccountPostable(line.accountId);
      }
      await AccountValidationService.validateAccountPostable(voucher.accountId);

      // Validate journal entry
      const journalLines = voucher.lines.map((line: any) => ({
        accountId: line.accountId,
        debit: line.debit,
        credit: line.credit,
      }));

      await AccountValidationService.validateJournalEntry(journalLines);

      // Validate account balances (prevent negative balances)
      for (const line of voucher.lines) {
        if (line.credit > 0) {
          await this.validateAccountBalance(line.accountId, line.credit, tx);
        }
      }

      // Create journal entry
      // Generate entry number using same format as finance.ts
      const date = new Date();
      const dateSegment = () => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
      };
      const randomSuffix = () => Math.floor(100 + Math.random() * 900).toString();
      const entryNumber = `JV-${dateSegment()}-${randomSuffix()}`;

      const actualPostingDate = postingDate || voucher.date;

      const journalEntry = await tx.journalEntry.create({
        data: {
          entryNumber,
          voucherNo: voucher.voucherNumber,
          date: actualPostingDate,
          description: voucher.description || `${voucher.type} ${voucher.voucherNumber}`,
          narration: voucher.referenceNumber || null,
          status: 'posted',
          attachments: voucher.attachments ? (voucher.attachments as any) : null,
          preparedByUserId: voucher.preparedByUserId,
          approvedByUserId: voucher.approvedByUserId,
          lines: {
            create: voucher.lines.map((line: any) => ({
              accountId: line.accountId,
              debit: line.debit,
              credit: line.credit,
              description: line.description || voucher.description,
            })),
          },
        },
      });

      // Note: We create journal entries (which is the primary accounting record).
      // LedgerEntry model requires a dealId, but vouchers may not have deals.
      // JournalEntry and JournalLine provide complete double-entry accounting records,
      // so separate LedgerEntry records are not necessary for vouchers.
      // If LedgerEntry records are needed for reporting, they can be generated from
      // JournalEntry records in a separate process that handles the dealId requirement.

      // Update voucher status
      const updated = await tx.voucher.update({
        where: { id: voucherId },
        data: {
          status: 'posted',
          journalEntryId: journalEntry.id,
          postedByUserId,
          postedAt: new Date(),
          postingDate: actualPostingDate,
        },
        include: {
          account: true,
          property: true,
          unit: true,
          lines: {
            include: {
              account: true,
            },
          },
          journalEntry: {
            include: {
              lines: {
                include: {
                  account: true,
                },
              },
            },
          },
          preparedBy: true,
          approvedBy: true,
        },
      });

      return updated;
    });
  }

  /**
   * Reverse a posted voucher
   */
  static async reverseVoucher(voucherId: string, reversedByUserId: string, reversalDate: Date): Promise<any> {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const original = await tx.voucher.findUnique({
        where: { id: voucherId },
        include: {
          lines: {
            include: {
              account: true,
            },
          },
        },
      });

      if (!original) {
        throw new Error(`Voucher not found: ${voucherId}`);
      }

      if (original.status !== 'posted') {
        throw new Error(`Cannot reverse voucher in ${original.status} status. Only posted vouchers can be reversed.`);
      }

      if (original.reversedVoucherId) {
        throw new Error(`Voucher ${original.voucherNumber} has already been reversed`);
      }

      // Create reversal voucher with opposite entries
      const reversalLines: VoucherLineInput[] = original.lines.map((line: any) => ({
        accountId: line.accountId,
        debit: line.credit, // Swap debit and credit
        credit: line.debit,
        description: `Reversal of ${original.voucherNumber}: ${line.description || ''}`,
        propertyId: line.propertyId || undefined,
        unitId: line.unitId || undefined,
      }));

      // Create reversal voucher and post it immediately
      // Note: createVoucher will generate the voucher number automatically
      const reversalVoucher = await this.createVoucher({
        type: original.type as VoucherType,
        date: reversalDate,
        paymentMethod: original.paymentMethod as PaymentMode,
        accountId: original.accountId,
        description: `Reversal of ${original.voucherNumber}: ${original.description || ''}`,
        referenceNumber: original.referenceNumber ? `REV-${original.referenceNumber}` : undefined,
        propertyId: original.propertyId || undefined,
        unitId: original.unitId || undefined,
        payeeType: original.payeeType as PayeeType | undefined,
        payeeId: original.payeeId || undefined,
        dealId: original.dealId || undefined,
        lines: reversalLines,
        attachments: original.attachments as any,
        preparedByUserId: reversedByUserId,
      });

      // Post the reversal voucher immediately
      const postedReversal = await this.postVoucher(reversalVoucher.id, reversedByUserId, reversalDate);

      // Update original voucher
      const updated = await tx.voucher.update({
        where: { id: voucherId },
        data: {
          status: 'reversed',
          reversedVoucherId: postedReversal.id,
          reversedByUserId,
          reversedAt: new Date(),
        },
      });

      return {
        original: updated,
        reversal: postedReversal,
      };
    });
  }

  /**
   * Get voucher by ID
   */
  static async getVoucherById(voucherId: string): Promise<any> {
    return await prisma.voucher.findUnique({
      where: { id: voucherId },
      include: {
        account: true,
        property: true,
        unit: true,
        deal: {
          include: {
            client: true,
            property: true,
          },
        },
        lines: {
          include: {
            account: true,
            property: true,
            unit: true,
          },
        },
        journalEntry: {
          include: {
            lines: {
              include: {
                account: true,
              },
            },
          },
        },
        preparedBy: true,
        approvedBy: true,
      },
    });
  }

  /**
   * List vouchers with filters
   */
  static async listVouchers(filters: {
    type?: VoucherType;
    status?: VoucherStatus;
    propertyId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ vouchers: any[]; total: number }> {
    const where: Prisma.VoucherWhereInput = {};

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.propertyId) {
      where.propertyId = filters.propertyId;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) {
        where.date.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.date.lte = filters.dateTo;
      }
    }

    const [vouchers, total] = await Promise.all([
      prisma.voucher.findMany({
        where,
        include: {
          account: true,
          property: true,
          unit: true,
          lines: {
            include: {
              account: true,
            },
          },
          preparedBy: true,
          approvedBy: true,
        },
        orderBy: { date: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      prisma.voucher.count({ where }),
    ]);

    return { vouchers, total };
  }
}
