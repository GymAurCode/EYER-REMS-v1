import { Prisma } from '@prisma/client';
import prisma from '../prisma/client';

export interface CreateReceiptPayload {
  dealId: string;
  clientId: string;
  amount: number;
  method: 'Cash' | 'Bank';
  date: Date | string;
  notes?: string;
  receivedBy?: string;
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
   * Generate receipt number in format RCP-YYYY-NNNNN
   */
  static generateReceiptNumber(): string {
    const year = new Date().getFullYear();
    const prefix = `RCP-${year}-`;
    
    // Get the last receipt number for this year
    return prisma.dealReceipt.findFirst({
      where: {
        receiptNo: {
          startsWith: prefix,
        },
      },
      orderBy: {
        receiptNo: 'desc',
      },
    }).then((lastReceipt) => {
      if (!lastReceipt) {
        return `${prefix}00001`;
      }
      
      const lastNumber = parseInt(lastReceipt.receiptNo.replace(prefix, ''), 10);
      const nextNumber = lastNumber + 1;
      return `${prefix}${String(nextNumber).padStart(5, '0')}`;
    });
  }

  /**
   * Create receipt and automatically allocate to installments using FIFO
   */
  static async createReceipt(payload: CreateReceiptPayload): Promise<ReceiptAllocationResult> {
    const receiptDate = payload.date instanceof Date ? payload.date : new Date(payload.date);
    
    // Generate receipt number
    const receiptNo = await this.generateReceiptNumber();

    // Get account IDs for ledger posting
    const cashAccount = await prisma.account.findFirst({
      where: {
        OR: [
          { code: '101' },
          { name: { contains: 'Cash', mode: 'insensitive' } },
        ],
        isActive: true,
      },
    });
    const bankAccount = await prisma.account.findFirst({
      where: {
        OR: [
          { code: '102' },
          { name: { contains: 'Bank', mode: 'insensitive' } },
        ],
        isActive: true,
      },
    });
    const installmentReceivableAccount = await prisma.account.findFirst({
      where: {
        OR: [
          { code: '201' },
          { name: { contains: 'Installment Receivable', mode: 'insensitive' } },
          { name: { contains: 'Accounts Receivable', mode: 'insensitive' } },
        ],
        isActive: true,
      },
    });

    if (!cashAccount || !bankAccount || !installmentReceivableAccount) {
      throw new Error('Required accounts (Cash, Bank, Installment Receivable) not found in Chart of Accounts. Please ensure accounts with codes 101 (Cash), 102 (Bank), and 201 (Installment Receivable) exist.');
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
          receivedBy: payload.receivedBy || null,
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

      // Update deal totalPaid
      const deal = await tx.deal.findUnique({
        where: { id: payload.dealId },
        include: {
          installments: {
            where: { isDeleted: false },
          },
        },
      });

      if (deal) {
        const totalPaid = deal.installments.reduce(
          (sum, inst) => sum + (inst.paidAmount || 0),
          0
        );
        
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
            const totalPaidPlan = paymentPlan.installments.reduce(
              (sum, inst) => sum + (inst.paidAmount || 0),
              0
            );
            const remaining = totalExpected - totalPaidPlan;

            let status = 'Pending';
            if (totalPaidPlan >= totalExpected) {
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

