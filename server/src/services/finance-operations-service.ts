/**
 * Finance Operations Extension Service
 * Refund, Transfer, Merge - additive only, no modification of existing records.
 * All operations create NEW vouchers and maintain full audit trail.
 */

import prisma from '../prisma/client';
import { FinancialOperationType, FinancialOperationStatus } from '../generated/prisma/client';
import { VoucherService } from './voucher-service';
import logger from '../utils/logger';

export type OperationRequestPayload = {
  operationType: FinancialOperationType;
  reason: string;
  dealId?: string;
  amount?: number;
  partialAmount?: number;
  sourcePaymentId?: string;
  sourceClientId?: string;
  targetClientId?: string;
  sourceDealId?: string;
  targetDealId?: string;
  sourcePropertyId?: string;
  targetPropertyId?: string;
};

export async function createOperationRequest(
  payload: OperationRequestPayload,
  requestedByUserId: string
) {
  const { operationType, reason, dealId, amount, partialAmount } = payload;
  if (!reason || reason.trim().length === 0) {
    throw new Error('Reason is mandatory for all finance operations');
  }

  const refs: { refType: string; refId: string; role: string }[] = [];
  if (payload.sourcePaymentId) refs.push({ refType: 'payment', refId: payload.sourcePaymentId, role: 'SOURCE' });
  if (payload.sourceClientId) refs.push({ refType: 'client', refId: payload.sourceClientId, role: 'SOURCE' });
  if (payload.targetClientId) refs.push({ refType: 'client', refId: payload.targetClientId, role: 'TARGET' });
  if (payload.sourceDealId) refs.push({ refType: 'deal', refId: payload.sourceDealId, role: 'SOURCE' });
  if (payload.targetDealId) refs.push({ refType: 'deal', refId: payload.targetDealId, role: 'TARGET' });
  if (payload.sourcePropertyId) refs.push({ refType: 'property', refId: payload.sourcePropertyId, role: 'SOURCE' });
  if (payload.targetPropertyId) refs.push({ refType: 'property', refId: payload.targetPropertyId, role: 'TARGET' });

  const op = await prisma.financialOperation.create({
    data: {
      operationType,
      status: FinancialOperationStatus.REQUESTED,
      reason: reason.trim(),
      amount: amount ?? null,
      partialAmount: partialAmount ?? null,
      requestedByUserId,
      dealId: dealId ?? null,
      references: {
        create: refs.map((r) => ({
          refType: r.refType,
          refId: r.refId,
          role: r.role,
        })),
      },
    },
    include: {
      references: true,
      requestedBy: { select: { id: true, username: true } },
      deal: { select: { id: true, dealCode: true, title: true } },
    },
  });
  logger.info(`Finance operation created: ${op.id} type=${operationType} status=REQUESTED`);
  return op;
}

export async function approveOperation(operationId: string, approvedByUserId: string) {
  const op = await prisma.financialOperation.findUnique({
    where: { id: operationId },
    include: { references: true },
  });
  if (!op) throw new Error('Operation not found');
  if (op.status !== FinancialOperationStatus.REQUESTED) {
    throw new Error(`Operation must be REQUESTED to approve. Current: ${op.status}`);
  }

  return prisma.financialOperation.update({
    where: { id: operationId },
    data: {
      status: FinancialOperationStatus.APPROVED,
      approvedByUserId,
      approvedAt: new Date(),
    },
    include: {
      references: true,
      requestedBy: { select: { id: true, username: true } },
      approvedBy: { select: { id: true, username: true } },
      deal: { select: { id: true, dealCode: true, title: true } },
    },
  });
}

export async function rejectOperation(operationId: string) {
  const op = await prisma.financialOperation.findUnique({ where: { id: operationId } });
  if (!op) throw new Error('Operation not found');
  if (op.status !== FinancialOperationStatus.REQUESTED) {
    throw new Error(`Operation must be REQUESTED to reject. Current: ${op.status}`);
  }

  return prisma.financialOperation.update({
    where: { id: operationId },
    data: { status: FinancialOperationStatus.REJECTED },
    include: { references: true, requestedBy: { select: { id: true, username: true } } },
  });
}

/**
 * Execute (post) an approved operation - creates NEW voucher only.
 * No modification of existing payments, vouchers, or records.
 */
export async function executeOperation(operationId: string, postedByUserId: string) {
  const op = await prisma.financialOperation.findUnique({
    where: { id: operationId },
    include: { references: true, deal: true },
  });
  if (!op) throw new Error('Operation not found');
  if (op.status !== FinancialOperationStatus.APPROVED) {
    throw new Error(`Operation must be APPROVED to execute. Current: ${op.status}`);
  }

  let voucherId: string | null = null;

  if (op.operationType === FinancialOperationType.REFUND) {
    voucherId = await executeRefund(op, postedByUserId);
  } else if (op.operationType === FinancialOperationType.TRANSFER) {
    voucherId = await executeTransfer(op, postedByUserId);
  } else if (op.operationType === FinancialOperationType.MERGE) {
    voucherId = await executeMerge(op, postedByUserId);
  } else {
    throw new Error(`Unsupported operation type: ${op.operationType}`);
  }

  return prisma.financialOperation.update({
    where: { id: operationId },
    data: {
      status: FinancialOperationStatus.POSTED,
      postedByUserId,
      postedAt: new Date(),
      voucherId,
    },
    include: {
      references: true,
      voucher: true,
      requestedBy: { select: { id: true, username: true } },
      approvedBy: { select: { id: true, username: true } },
      postedBy: { select: { id: true, username: true } },
      deal: { select: { id: true, dealCode: true, title: true } },
    },
  });
}

async function executeRefund(op: any, userId: string): Promise<string> {
  const paymentRef = op.references?.find(
    (r: any) => r.refType === 'payment' && r.role === 'SOURCE'
  );
  if (!paymentRef) throw new Error('Refund operation requires source payment reference');

  const payment = await prisma.payment.findUnique({
    where: { id: paymentRef.refId },
    include: { deal: { include: { client: true } } },
  });
  if (!payment) throw new Error('Source payment not found');
  if (payment.deletedAt) throw new Error('Cannot refund a deleted payment');

  const refundAmount = op.partialAmount ?? op.amount ?? payment.amount;
  if (refundAmount <= 0 || refundAmount > payment.amount) {
    throw new Error(`Invalid refund amount: ${refundAmount}. Original payment: ${payment.amount}`);
  }

  const isBank =
    payment.paymentMode === 'bank' ||
    payment.paymentMode === 'online_transfer' ||
    payment.paymentMode === 'card' ||
    payment.paymentMode === 'Cheque' ||
    payment.paymentMode === 'Transfer' ||
    payment.paymentMode === 'Online';
  const voucherType = isBank ? 'BPV' : 'CPV';
  const paymentMethod = isBank ? 'Transfer' : 'Cash';

  const bankOrCashAccounts = await prisma.account.findMany({
    where: {
      isActive: true,
      OR: [
        { code: { startsWith: '1112' } },
        { code: { startsWith: '1111' } },
      ],
    },
    orderBy: { code: 'asc' },
    take: 5,
  });
  const bankAccount = bankOrCashAccounts.find((a) => a.code.startsWith('1112'));
  const cashAccount = bankOrCashAccounts.find((a) => a.code.startsWith('1111'));
  const accountId = isBank
    ? (bankAccount?.id ?? bankOrCashAccounts[0]?.id)
    : (cashAccount?.id ?? bankOrCashAccounts[0]?.id);
  if (!accountId) throw new Error('No bank/cash account found in Chart of Accounts');

  const advanceAccounts = await prisma.account.findMany({
    where: {
      isActive: true,
      OR: [{ code: { contains: 'advance' } }, { name: { contains: 'Advance', mode: 'insensitive' } }],
    },
    take: 5,
  });
  const advanceAccountId = advanceAccounts[0]?.id;
  if (!advanceAccountId) throw new Error('No advance/receivable account found. Configure Chart of Accounts.');

  const desc = `Refund - ${op.reason} - Ref Payment ${payment.paymentId}`;
  const lines = [
    { accountId: advanceAccountId, debit: refundAmount, credit: 0, description: desc },
    { accountId, debit: 0, credit: refundAmount, description: desc },
  ];

  const voucher = await VoucherService.createVoucher({
    type: voucherType as any,
    date: new Date(),
    paymentMethod: paymentMethod as any,
    accountId,
    description: desc,
    referenceNumber: `REF-${payment.paymentId}`,
    dealId: op.dealId ?? payment.dealId,
    payeeType: 'Client',
    payeeId: payment.deal?.clientId ?? undefined,
    lines,
    preparedByUserId: userId,
    attachments: [{ url: 'data:text/plain;base64,UmVmdW5kIHZvdWNoZXIgLSBzeXN0ZW0gZ2VuZXJhdGVk', name: 'Refund-System.txt' }],
  });

  await VoucherService.submitVoucher(voucher.id, userId);
  await VoucherService.approveVoucher(voucher.id, userId);
  await VoucherService.postVoucher(voucher.id, userId);

  return voucher.id;
}

async function executeTransfer(op: any, userId: string): Promise<string> {
  const srcClient = op.references?.find((r: any) => r.refType === 'client' && r.role === 'SOURCE');
  const tgtClient = op.references?.find((r: any) => r.refType === 'client' && r.role === 'TARGET');
  if (!srcClient || !tgtClient) {
    throw new Error('Transfer operation requires source and target client references');
  }

  const amount = op.amount ?? op.partialAmount;
  if (!amount || amount <= 0) throw new Error('Transfer requires positive amount');

  const srcBinding = await prisma.entityAccountBinding.findFirst({
    where: { entityType: 'Client', entityId: srcClient.refId },
    include: { account: true },
  });
  const tgtBinding = await prisma.entityAccountBinding.findFirst({
    where: { entityType: 'Client', entityId: tgtClient.refId },
    include: { account: true },
  });

  const srcAccountId = srcBinding?.accountId;
  const tgtAccountId = tgtBinding?.accountId;

  if (!srcAccountId || !tgtAccountId) {
    throw new Error(
      'Both clients must have advance accounts bound. Use Finance → Entity Accounts to bind Client advance accounts.'
    );
  }

  const desc = `Transfer - ${op.reason} - Client to Client`;
  const lines = [
    { accountId: tgtAccountId, debit: amount, credit: 0, description: desc },
    { accountId: srcAccountId, debit: 0, credit: amount, description: desc },
  ];

  const voucher = await VoucherService.createVoucher({
    type: 'JV',
    date: new Date(),
    paymentMethod: 'Transfer',
    accountId: srcAccountId,
    description: desc,
    lines,
    preparedByUserId: userId,
  });

  await VoucherService.submitVoucher(voucher.id, userId);
  await VoucherService.approveVoucher(voucher.id, userId);
  await VoucherService.postVoucher(voucher.id, userId);

  return voucher.id;
}

async function executeMerge(op: any, userId: string): Promise<string> {
  const srcRef =
    op.references?.find((r: any) => r.refType === 'deal' && r.role === 'SOURCE') ??
    op.references?.find((r: any) => r.refType === 'property' && r.role === 'SOURCE');
  const tgtRef =
    op.references?.find((r: any) => r.refType === 'deal' && r.role === 'TARGET') ??
    op.references?.find((r: any) => r.refType === 'property' && r.role === 'TARGET');

  if (!srcRef || !tgtRef) {
    throw new Error('Merge operation requires source and target deal or property references');
  }

  const amount = op.amount ?? op.partialAmount;
  if (!amount || amount <= 0) throw new Error('Merge requires positive amount');

  const srcBinding = await prisma.entityAccountBinding.findFirst({
    where: { entityType: srcRef.refType, entityId: srcRef.refId },
    include: { account: true },
  });
  const tgtBinding = await prisma.entityAccountBinding.findFirst({
    where: { entityType: tgtRef.refType, entityId: tgtRef.refId },
    include: { account: true },
  });

  const srcAccountId = srcBinding?.accountId;
  const tgtAccountId = tgtBinding?.accountId;

  if (!srcAccountId || !tgtAccountId) {
    throw new Error(
      'Source and target must have accounts bound. Use Finance → Entity Accounts to bind advance accounts.'
    );
  }

  const desc = `Merge/Reallocation - ${op.reason}`;
  const lines = [
    { accountId: tgtAccountId, debit: amount, credit: 0, description: desc },
    { accountId: srcAccountId, debit: 0, credit: amount, description: desc },
  ];

  const voucher = await VoucherService.createVoucher({
    type: 'JV',
    date: new Date(),
    paymentMethod: 'Transfer',
    accountId: srcAccountId,
    description: desc,
    lines,
    preparedByUserId: userId,
  });

  await VoucherService.submitVoucher(voucher.id, userId);
  await VoucherService.approveVoucher(voucher.id, userId);
  await VoucherService.postVoucher(voucher.id, userId);

  return voucher.id;
}

export async function listOperations(filters?: {
  status?: FinancialOperationStatus;
  operationType?: FinancialOperationType;
  dealId?: string;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};
  if (filters?.status) where.status = filters.status;
  if (filters?.operationType) where.operationType = filters.operationType;
  if (filters?.dealId) where.dealId = filters.dealId;

  const [rows, total] = await Promise.all([
    prisma.financialOperation.findMany({
      where,
      include: {
        references: true,
        requestedBy: { select: { id: true, username: true } },
        approvedBy: { select: { id: true, username: true } },
        postedBy: { select: { id: true, username: true } },
        voucher: { select: { id: true, voucherNumber: true, type: true, amount: true, status: true } },
        deal: { select: { id: true, dealCode: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit ?? 50,
      skip: filters?.offset ?? 0,
    }),
    prisma.financialOperation.count({ where }),
  ]);

  return { rows, total };
}

export async function getOperationById(id: string) {
  return prisma.financialOperation.findUnique({
    where: { id },
    include: {
      references: true,
      lines: true,
      requestedBy: { select: { id: true, username: true } },
      approvedBy: { select: { id: true, username: true } },
      postedBy: { select: { id: true, username: true } },
      voucher: true,
      deal: { select: { id: true, dealCode: true, title: true, clientId: true } },
    },
  });
}

export async function getOperationsByDealId(dealId: string) {
  return prisma.financialOperation.findMany({
    where: {
      OR: [{ dealId }, { references: { some: { refType: 'deal', refId: dealId } } }],
    },
    include: {
      references: true,
      requestedBy: { select: { id: true, username: true } },
      approvedBy: { select: { id: true, username: true } },
      postedBy: { select: { id: true, username: true } },
      voucher: { select: { id: true, voucherNumber: true, type: true, amount: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}
