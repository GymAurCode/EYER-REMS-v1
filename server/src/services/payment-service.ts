/**
 * PaymentService - Business logic for Payment processing
 * Implements atomic transactions, double-entry bookkeeping, and refunds
 */

import { PrismaClient, Prisma } from '@prisma/client';
import prisma from '../prisma/client';
import { DealService } from './deal-service';
import { PaymentPlanService } from './payment-plan-service';

export interface CreatePaymentPayload {
  dealId: string;
  amount: number;
  paymentType: 'token' | 'booking' | 'installment' | 'partial' | 'full' | 'refund';
  paymentMode: 'cash' | 'bank' | 'online_transfer' | 'card';
  transactionId?: string;
  referenceNumber?: string;
  date?: Date;
  remarks?: string;
  paymentId?: string;
  createdBy: string;
  installmentId?: string; // Link to specific installment if provided
}

export interface RefundPaymentPayload {
  originalPaymentId: string;
  amount: number;
  reason?: string;
  createdBy: string;
}

export class PaymentService {
  /**
   * Generate payment code
   */
  static generatePaymentCode(): string {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const random = Math.floor(100 + Math.random() * 900);
    return `PAY-${dateStr}-${random}`;
  }

  /**
   * Get account IDs for payment mode (for double-entry)
   */
  static async getPaymentAccounts(paymentMode: string): Promise<{ debitAccountId: string; creditAccountId: string }> {
    // Lookup accounts by alias or code
    const cashAccount = await prisma.account.findFirst({
      where: {
        OR: [
          { code: '1000' },
          { name: { contains: 'Cash', mode: 'insensitive' } },
        ],
        isActive: true,
      },
    });

    const bankAccount = await prisma.account.findFirst({
      where: {
        OR: [
          { code: '1010' },
          { name: { contains: 'Bank', mode: 'insensitive' } },
        ],
        isActive: true,
      },
    });

    const arAccount = await prisma.account.findFirst({
      where: {
        OR: [
          { code: '1100' },
          { name: { contains: 'Accounts Receivable', mode: 'insensitive' } },
        ],
        isActive: true,
      },
    });

    if (!cashAccount || !bankAccount || !arAccount) {
      throw new Error('Required accounts not found in Chart of Accounts. Please seed accounts first.');
    }

    const debitAccountId = paymentMode === 'cash' ? cashAccount.id : bankAccount.id;
    const creditAccountId = arAccount.id;

    return { debitAccountId, creditAccountId };
  }

  /**
   * Create payment with atomic transaction and double-entry bookkeeping
   */
  static async createPayment(payload: CreatePaymentPayload): Promise<any> {
    // Validate deal exists
    const deal = await prisma.deal.findUnique({
      where: { id: payload.dealId },
      include: {
        payments: {
          where: { deletedAt: null },
        },
      },
    });

    if (!deal) {
      throw new Error('Deal not found');
    }

    if (deal.isDeleted || deal.deletedAt) {
      throw new Error('Cannot create payment for deleted deal');
    }

    // Validate amount
    if (payload.amount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    // Get account IDs for double-entry
    const { debitAccountId, creditAccountId } = await this.getPaymentAccounts(payload.paymentMode);

    const paymentDate = payload.date || new Date();
    const paymentCode = payload.paymentId || this.generatePaymentCode();

    // Atomic transaction
    return await prisma.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.payment.create({
        data: {
          paymentId: paymentCode,
          dealId: payload.dealId,
          amount: payload.amount,
          paymentType: payload.paymentType,
          paymentMode: payload.paymentMode,
          transactionId: payload.transactionId || null,
          referenceNumber: payload.referenceNumber || null,
          date: paymentDate,
          remarks: payload.remarks || null,
          createdByUserId: payload.createdBy,
        },
      });

      // Create double-entry ledger entries
      const remarks = `${payload.paymentType} payment via ${payload.paymentMode}${payload.remarks ? ` - ${payload.remarks}` : ''}`;
      
      // Get account names for legacy compatibility
      const debitAccount = await tx.account.findUnique({ where: { id: debitAccountId } });
      const creditAccount = await tx.account.findUnique({ where: { id: creditAccountId } });

      // Debit: Cash/Bank Account
      await tx.ledgerEntry.create({
        data: {
          dealId: payload.dealId,
          paymentId: payment.id,
          debitAccountId,
          creditAccountId: null,
          accountDebit: debitAccount?.name || '', // Legacy field
          accountCredit: '', // Legacy field
          amount: payload.amount,
          remarks: `Payment received: ${remarks}`,
          date: paymentDate,
        },
      });

      // Credit: Accounts Receivable
      await tx.ledgerEntry.create({
        data: {
          dealId: payload.dealId,
          paymentId: payment.id,
          debitAccountId: null,
          creditAccountId,
          accountDebit: '', // Legacy field
          accountCredit: creditAccount?.name || '', // Legacy field
          amount: payload.amount,
          remarks: `Payment received: ${remarks}`,
          date: paymentDate,
        },
      });

      // Recompute deal status
      await DealService.recomputeDealStatus(payload.dealId, tx);

      // Sync payment plan if it exists (check if installmentId is in payload)
      // Note: installmentId should be passed in the payload for installment payments
      const installmentId = payload.installmentId;
      if (installmentId) {
        const { PaymentPlanService } = await import('./payment-plan-service');
        await PaymentPlanService.syncPaymentPlanAfterPayment(
          payload.dealId,
          payload.amount,
          installmentId,
          tx
        );
      } else {
        // Sync anyway to update totals
        const { PaymentPlanService } = await import('./payment-plan-service');
        await PaymentPlanService.syncPaymentPlanAfterPayment(payload.dealId, payload.amount, undefined, tx);
      }

      // Return payment with ledger entries
      return await tx.payment.findUnique({
        where: { id: payment.id },
        include: {
          deal: {
            include: {
              client: { select: { id: true, name: true, clientCode: true } },
              property: { select: { id: true, name: true, propertyCode: true } },
            },
          },
          ledgerEntries: true,
        },
      });
    });
  }

  /**
   * Create refund payment (reverses original payment)
   */
  static async refundPayment(payload: RefundPaymentPayload): Promise<any> {
    const originalPayment = await prisma.payment.findUnique({
      where: { id: payload.originalPaymentId },
      include: {
        deal: true,
      },
    });

    if (!originalPayment) {
      throw new Error('Original payment not found');
    }

    if (originalPayment.deletedAt) {
      throw new Error('Cannot refund deleted payment');
    }

    if (payload.amount > originalPayment.amount) {
      throw new Error('Refund amount cannot exceed original payment amount');
    }

    // Get account IDs (same as original payment)
    const { debitAccountId, creditAccountId } = await this.getPaymentAccounts(originalPayment.paymentMode);

    const refundDate = new Date();
    const refundCode = this.generatePaymentCode();

    return await prisma.$transaction(async (tx) => {
      // Create refund payment record
      const refund = await tx.payment.create({
        data: {
          paymentId: refundCode,
          dealId: originalPayment.dealId,
          amount: payload.amount,
          paymentType: 'refund',
          paymentMode: originalPayment.paymentMode,
          date: refundDate,
          remarks: `Refund of ${originalPayment.paymentId}: ${payload.reason || 'No reason provided'}`,
          refundOfPaymentId: originalPayment.id,
          createdByUserId: payload.createdBy,
        },
      });

      // Create reversed ledger entries (opposite of original)
      const remarks = `Refund of ${originalPayment.paymentId}: ${payload.reason || 'No reason provided'}`;
      
      // Get account names for legacy compatibility
      const debitAccount = await tx.account.findUnique({ where: { id: debitAccountId } });
      const creditAccount = await tx.account.findUnique({ where: { id: creditAccountId } });

      // Credit: Cash/Bank Account (opposite of original debit)
      await tx.ledgerEntry.create({
        data: {
          dealId: originalPayment.dealId,
          paymentId: refund.id,
          debitAccountId: null,
          creditAccountId: debitAccountId, // Reversed
          accountDebit: '', // Legacy field
          accountCredit: debitAccount?.name || '', // Legacy field
          amount: payload.amount,
          remarks: `Refund: ${remarks}`,
          date: refundDate,
        },
      });

      // Debit: Accounts Receivable (opposite of original credit)
      await tx.ledgerEntry.create({
        data: {
          dealId: originalPayment.dealId,
          paymentId: refund.id,
          debitAccountId: creditAccountId, // Reversed
          creditAccountId: null,
          accountDebit: creditAccount?.name || '', // Legacy field
          accountCredit: '', // Legacy field
          amount: payload.amount,
          remarks: `Refund: ${remarks}`,
          date: refundDate,
        },
      });

      // Recompute deal status
      await DealService.recomputeDealStatus(originalPayment.dealId, tx);

      // Sync payment plan (refund reduces paid amount)
      const { PaymentPlanService } = await import('./payment-plan-service');
      await PaymentPlanService.syncPaymentPlanAfterPayment(
        originalPayment.dealId,
        -payload.amount, // Negative amount for refund
        undefined,
        tx
      );

      return await tx.payment.findUnique({
        where: { id: refund.id },
        include: {
          deal: true,
          refundOf: true,
          ledgerEntries: true,
        },
      });
    });
  }

  /**
   * Soft delete payment (creates reversal entries)
   */
  static async deletePayment(paymentId: string, userId: string): Promise<void> {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        deal: true,
        ledgerEntries: true,
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.deletedAt) {
      throw new Error('Payment already deleted');
    }

    await prisma.$transaction(async (tx) => {
      // Soft delete payment
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          deletedAt: new Date(),
          deletedBy: userId,
        },
      });

      // Soft delete associated ledger entries
      await tx.ledgerEntry.updateMany({
        where: { paymentId },
        data: {
          deletedAt: new Date(),
          deletedBy: userId,
        },
      });

      // Recompute deal status
      await DealService.recomputeDealStatus(payment.dealId, tx);

      // Sync payment plan (deletion reduces paid amount)
      const { PaymentPlanService: PaymentPlanServiceDelete } = await import('./payment-plan-service');
      await PaymentPlanServiceDelete.syncPaymentPlanAfterPayment(
        payment.dealId,
        -payment.amount, // Negative amount for deletion
        payment.installmentId || undefined,
        tx
      );
    });
  }
}

