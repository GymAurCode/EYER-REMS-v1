import { Prisma } from '@prisma/client';
import prisma from '../prisma/client';
import { generateSystemId, validateManualUniqueId } from './id-generation-service';

export interface CreateReceiptPayload {
  dealId: string;
  clientId: string;
  amount: number;
  method: 'Cash' | 'Bank';
  date: Date | string;
  notes?: string;
  referenceNumber?: string; // Reference/Cheque number
  receivedBy?: string;
  existingPaymentId?: string; // If payment already exists, link to it instead of creating new one
  skipPaymentCreation?: boolean; // Skip creating Payment record if payment already exists
  manualUniqueId?: string; // User-provided manual unique ID
}

export interface ReceiptAllocationResult {
  receiptId: string;
  allocations: Array<{
    installmentId: string;
    installmentNumber: number;
    amountAllocated: number;
    status: string;
  }>;
  totalAllocated: number;
  remainingAmount: number;
}

export class ReceiptService {
  /**
   * Generate receipt number in format rcp-YY-####
   * Uses centralized ID generation service
   */
  static async generateReceiptNumber(): Promise<string> {
    return await generateSystemId('rcp');
  }

  /**
   * Create receipt and automatically allocate to installments using FIFO
   */
  static async createReceipt(payload: CreateReceiptPayload): Promise<ReceiptAllocationResult> {
    const receiptDate = payload.date instanceof Date ? payload.date : new Date(payload.date);
    
    // Validate manual unique ID if provided
    if (payload.manualUniqueId) {
      await validateManualUniqueId(payload.manualUniqueId, 'rcp');
    }
    
    // Generate receipt number: rcp-YY-####
    const receiptNo = await this.generateReceiptNumber();

    // Get account IDs for ledger posting (try multiple code formats)
    const cashAccount = await prisma.account.findFirst({
      where: {
        OR: [
          { code: '1000' },
          { code: '101' },
          { code: '1010' },
          { name: { contains: 'Cash', mode: 'insensitive' } },
        ],
        isActive: true,
      },
    });
    const bankAccount = await prisma.account.findFirst({
      where: {
        OR: [
          { code: '1010' },
          { code: '102' },
          { code: '1020' },
          { name: { contains: 'Bank', mode: 'insensitive' } },
        ],
        isActive: true,
      },
    });
    const installmentReceivableAccount = await prisma.account.findFirst({
      where: {
        OR: [
          { code: '1100' },
          { code: '201' },
          { code: '2000' },
          { name: { contains: 'Installment Receivable', mode: 'insensitive' } },
          { name: { contains: 'Accounts Receivable', mode: 'insensitive' } },
          { name: { contains: 'Receivable', mode: 'insensitive' } },
        ],
        isActive: true,
      },
    });

    if (!cashAccount || !bankAccount || !installmentReceivableAccount) {
      const missing = [];
      if (!cashAccount) missing.push('Cash');
      if (!bankAccount) missing.push('Bank');
      if (!installmentReceivableAccount) missing.push('Accounts Receivable');
      throw new Error(`Required accounts not found in Chart of Accounts: ${missing.join(', ')}. Please ensure these accounts exist and are active.`);
    }

    const debitAccountId = payload.method === 'Cash' ? cashAccount.id : bankAccount.id;

    return await prisma.$transaction(async (tx) => {
      // Create receipt
      const receipt = await tx.dealReceipt.create({
        data: {
          receiptNo,
          dealId: payload.dealId,
          clientId: payload.clientId,
          amount: payload.amount,
          method: payload.method,
          date: receiptDate,
          notes: payload.notes || null,
          referenceNumber: payload.referenceNumber?.trim() || null,
          receivedBy: payload.receivedBy || null,
          manualUniqueId: payload.manualUniqueId?.trim() || null,
        },
      });

      // FIFO Allocation Algorithm
      const allocations = await this.allocateReceiptFIFO(
        receipt.id,
        payload.dealId,
        payload.amount,
        tx
      );

      // Create Journal Entry for double-entry bookkeeping
      const entryNumber = `JE-${new Date().getFullYear()}-${Date.now()}`;
      const journalEntry = await tx.journalEntry.create({
        data: {
          entryNumber,
          voucherNo: receiptNo,
          date: receiptDate,
          description: `Receipt ${receiptNo} - ${payload.method} payment`,
          narration: `Payment received for Deal ${payload.dealId}`,
          status: 'posted',
          preparedByUserId: payload.receivedBy || null,
          lines: {
            create: [
              {
                accountId: debitAccountId,
                debit: payload.amount,
                credit: 0,
                description: `Receipt ${receiptNo} - ${payload.method}`,
              },
              {
                accountId: installmentReceivableAccount.id,
                debit: 0,
                credit: payload.amount,
                description: `Receipt ${receiptNo} - Installment Receivable`,
              },
            ],
          },
        },
      });

      // Link receipt to journal entry
      await tx.dealReceipt.update({
        where: { id: receipt.id },
        data: { journalEntryId: journalEntry.id },
      });

      // Create Voucher record for Finance tab visibility
      // This will show up in Finance > Vouchers as "Cash Receipt" or "Bank Receipt"
      const voucherType = payload.method === 'Cash' ? 'cash_receipt' : 'bank_receipt';
      const voucher = await tx.voucher.create({
        data: {
          voucherNumber: receiptNo,
          type: voucherType,
          paymentMethod: payload.method,
          accountId: debitAccountId, // Cash or Bank account
          amount: payload.amount,
          description: `Receipt ${receiptNo} - Payment received for Deal`,
          referenceNumber: receiptNo,
          date: receiptDate,
          preparedByUserId: payload.receivedBy || null,
          journalEntryId: journalEntry.id, // Link to journal entry
        },
      });

      // Get deal with property info for ledger updates
      const deal = await tx.deal.findUnique({
        where: { id: payload.dealId },
        include: {
          installments: {
            where: { isDeleted: false },
          },
          paymentPlan: true,
          property: {
            select: { id: true, name: true, propertyCode: true },
          },
        },
      });

      // Create Payment record for Client Ledger and Property Ledger visibility
      // Client and Property ledgers read from deal.payments, so we need to create a Payment record
      // This ensures receipts show up in Accounting > Client Ledger and Property Ledger
      // But skip if payment already exists (when called from PaymentService)
      if (deal && !payload.skipPaymentCreation) {
        // Check if payment already exists (from PaymentService)
        let existingPayment = null;
        if (payload.existingPaymentId) {
          existingPayment = await tx.payment.findUnique({
            where: { id: payload.existingPaymentId },
          });
        }

        // Only create payment if it doesn't exist
        if (!existingPayment) {
          // Generate system ID for payment: pay-YY-####
          const paymentCode = await generateSystemId('pay');
          const createdPayment = await tx.payment.create({
            data: {
              paymentId: paymentCode,
              dealId: payload.dealId,
              amount: payload.amount,
              paymentType: 'installment',
              paymentMode: payload.method.toLowerCase(), // 'cash' or 'bank'
              referenceNumber: receiptNo,
              date: receiptDate,
              remarks: `Receipt ${receiptNo} - ${payload.notes || 'Payment received'}`,
              createdByUserId: payload.receivedBy || null,
              manualUniqueId: null, // Payment created from receipt doesn't have manual ID
            },
          });

          // Create double-entry ledger entries for the payment
          // This ensures every payment has corresponding ledger entries
          const { PaymentService } = await import('./payment-service');
          const { debitAccountId, creditAccountId } = await PaymentService.getPaymentAccounts(payload.method.toLowerCase() as 'cash' | 'bank');
          
          // Get account names for legacy compatibility
          const debitAccount = await tx.account.findUnique({ where: { id: debitAccountId } });
          const creditAccount = await tx.account.findUnique({ where: { id: creditAccountId } });
          
          const remarks = `Receipt ${receiptNo} - ${payload.method} payment${payload.notes ? ` - ${payload.notes}` : ''}`;

          // Debit: Cash/Bank Account
          await tx.ledgerEntry.create({
            data: {
              dealId: payload.dealId,
              paymentId: createdPayment.id,
              debitAccountId,
              creditAccountId: null,
              accountDebit: debitAccount?.name || '', // Legacy field
              accountCredit: '', // Legacy field
              amount: payload.amount,
              remarks: `Payment received: ${remarks}`,
              date: receiptDate,
            },
          });

          // Credit: Accounts Receivable
          await tx.ledgerEntry.create({
            data: {
              dealId: payload.dealId,
              paymentId: createdPayment.id,
              debitAccountId: null,
              creditAccountId,
              accountDebit: '', // Legacy field
              accountCredit: creditAccount?.name || '', // Legacy field
              amount: payload.amount,
              remarks: `Payment received: ${remarks}`,
              date: receiptDate,
            },
          });
        }
      }

      if (deal) {
        // Calculate total paid: only count actual installment payments
        // Down payment is only included if there's evidence it's been paid
        const installmentPaidAmount = deal.installments.reduce(
          (sum, inst) => sum + (inst.paidAmount || 0),
          0
        );
        
        // Check if down payment has been paid by looking at unallocated payment amount
        // If receipt amount exceeds total allocated to installments, the excess could be for down payment
        const totalAllocated = allocations.reduce(
          (sum, alloc) => sum + alloc.amountAllocated,
          0
        );
        const unallocatedAmount = payload.amount - totalAllocated;
        const downPayment = deal.paymentPlan?.downPayment || 0;
        
        // Only include down payment if there's unallocated payment that could be for it
        // This ensures down payment is only counted when a real payment is recorded
        // Check if: payment amount exactly matches down payment (and no allocations), OR unallocated amount covers down payment
        const isDownPaymentPaid = downPayment > 0 && (
          (payload.amount === downPayment && totalAllocated === 0) || // Payment exactly for down payment
          unallocatedAmount >= downPayment // Unallocated amount covers down payment
        );
        const downPaymentPaid = isDownPaymentPaid ? downPayment : 0;
        const totalPaid = installmentPaidAmount + downPaymentPaid;
        
        await tx.deal.update({
          where: { id: payload.dealId },
          data: { totalPaid },
        });

        // Update payment plan status
        if (deal.paymentPlan) {
          const paymentPlan = await tx.paymentPlan.findUnique({
            where: { id: deal.paymentPlan.id },
            include: {
              installments: {
                where: { isDeleted: false },
              },
            },
          });

          if (paymentPlan) {
            const totalExpected = paymentPlan.installments.reduce(
              (sum, inst) => sum + inst.amount,
              0
            );
            const installmentPaidAmount = paymentPlan.installments.reduce(
              (sum, inst) => sum + (inst.paidAmount || 0),
              0
            );
            // Only include down payment if it's been paid (unallocated amount covers it or payment exactly matches)
            const isDownPaymentPaidForPlan = downPayment > 0 && (
              (payload.amount === downPayment && totalAllocated === 0) || // Payment exactly for down payment
              unallocatedAmount >= downPayment // Unallocated amount covers down payment
            );
            const downPaymentPaidForPlan = isDownPaymentPaidForPlan ? downPayment : 0;
            const totalPaidPlan = installmentPaidAmount + downPaymentPaidForPlan;
            const dealAmount = paymentPlan.totalAmount || totalExpected + (paymentPlan.downPayment || 0);
            const remaining = dealAmount - totalPaidPlan;

            let status = 'Pending';
            if (totalPaidPlan >= dealAmount) {
              status = 'Fully Paid';
            } else if (totalPaidPlan > 0) {
              status = 'Partially Paid';
            }

            await tx.paymentPlan.update({
              where: { id: paymentPlan.id },
              data: {
                totalPaid: totalPaidPlan,
                totalExpected,
                remaining,
                status,
              },
            });
          }
        }
      }

      const totalAllocated = allocations.reduce(
        (sum, alloc) => sum + alloc.amountAllocated,
        0
      );
      const remainingAmount = payload.amount - totalAllocated;

      return {
        receiptId: receipt.id,
        allocations,
        totalAllocated,
        remainingAmount,
      };
    });
  }

  /**
   * FIFO Allocation Algorithm
   * Applies receipt amount to earliest Pending/Partial installments
   */
  static async allocateReceiptFIFO(
    receiptId: string,
    dealId: string,
    receiptAmount: number,
    tx: Prisma.TransactionClient
  ): Promise<Array<{ installmentId: string; installmentNumber: number; amountAllocated: number; status: string }>> {
    const allocations: Array<{
      installmentId: string;
      installmentNumber: number;
      amountAllocated: number;
      status: string;
    }> = [];

    // Get all pending/partial installments ordered by due date (FIFO)
    const installments = await tx.dealInstallment.findMany({
      where: {
        dealId,
        isDeleted: false,
        status: {
          in: ['Pending', 'Partial'],
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    let remainingAmount = receiptAmount;

    for (const installment of installments) {
      if (remainingAmount <= 0) break;

      const installmentRemaining = installment.amount - (installment.paidAmount || 0);
      
      if (installmentRemaining <= 0) continue;

      let amountToAllocate = Math.min(remainingAmount, installmentRemaining);
      
      // Create allocation record
      await tx.dealReceiptAllocation.create({
        data: {
          receiptId,
          installmentId: installment.id,
          amountAllocated: amountToAllocate,
        },
      });

      // Update installment
      const newPaidAmount = (installment.paidAmount || 0) + amountToAllocate;
      const newRemaining = installment.amount - newPaidAmount;
      
      let newStatus = 'Pending';
      if (newPaidAmount >= installment.amount) {
        newStatus = 'Paid';
      } else if (newPaidAmount > 0) {
        newStatus = 'Partial';
      }

      await tx.dealInstallment.update({
        where: { id: installment.id },
        data: {
          paidAmount: newPaidAmount,
          remaining: newRemaining,
          status: newStatus,
          paidDate: newStatus === 'Paid' ? new Date() : installment.paidDate,
        },
      });

      allocations.push({
        installmentId: installment.id,
        installmentNumber: installment.installmentNumber,
        amountAllocated: amountToAllocate,
        status: newStatus,
      });

      remainingAmount -= amountToAllocate;
    }

    return allocations;
  }

  /**
   * Get receipts for a deal
   */
  static async getReceiptsByDealId(dealId: string) {
    return await prisma.dealReceipt.findMany({
      where: {
        dealId,
      },
      include: {
        allocations: {
          include: {
            installment: {
              select: {
                id: true,
                installmentNumber: true,
                amount: true,
                dueDate: true,
              },
            },
          },
        },
        receivedByUser: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  /**
   * Get receipt by ID
   */
  static async getReceiptById(receiptId: string) {
    return await prisma.dealReceipt.findUnique({
      where: { id: receiptId },
      include: {
        deal: {
          include: {
            client: true,
            property: true,
          },
        },
        client: true,
        allocations: {
          include: {
            installment: true,
          },
        },
        receivedByUser: {
          select: {
            id: true,
            username: true,
            email: true,
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
      },
    });
  }
}

