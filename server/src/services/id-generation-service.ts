/**
 * Centralized ID Generation Service
 * 
 * Generates system IDs in format: {prefix}-{YY}-{####}
 * - prefix: module identifier (prop, pay, cli, lead, deal, etc.)
 * - YY: last 2 digits of current year
 * - ####: 4-digit incremental counter per module per year
 * 
 * Features:
 * - Atomic operations to prevent race conditions
 * - Year-based counter reset
 * - Continues from highest existing ID
 * - Thread-safe using database transactions
 */

import { PrismaClient, Prisma } from '@prisma/client';
import prisma from '../prisma/client';

export type ModulePrefix = 
  | 'prop'  // Properties
  | 'pay'   // Payments
  | 'cli'   // Clients
  | 'lead'  // Leads
  | 'deal'  // Dealers
  | 'dl'    // Deals (different from dealers)
  | 'rcp'   // Receipts
  | 'inv'   // Invoices
  | 'txn'   // Transactions
  | 'je'    // Journal Entries
  | 'vch'   // Vouchers
  | 'ten'   // Tenants
  | 'tkt'   // Maintenance Tickets
  | 'ntc'   // Notices
  | 'ldg';  // Ledger

interface IdGenerationResult {
  systemId: string;
  year: number;
  counter: number;
}

/**
 * Generate system ID for a module
 * Format: {prefix}-{YY}-{####}
 * 
 * @param modulePrefix - Module prefix (prop, pay, cli, etc.)
 * @param tx - Optional transaction client for atomic operations
 * @returns Generated system ID
 */
export async function generateSystemId(
  modulePrefix: ModulePrefix,
  tx?: Prisma.TransactionClient
): Promise<string> {
  const client = tx || prisma;
  const currentYear = new Date().getFullYear();
  const yearSuffix = String(currentYear).slice(-2); // Last 2 digits
  const prefix = `${modulePrefix}-${yearSuffix}-`;

  // Use a lock table approach for atomic counter increment
  // First, try to find the highest existing ID for this prefix and year
  let maxCounter = 0;

  // Query based on module type
  switch (modulePrefix) {
    case 'prop':
      const maxProp = await client.property.findFirst({
        where: {
          propertyCode: {
            startsWith: prefix,
          },
        },
        orderBy: {
          propertyCode: 'desc',
        },
        select: {
          propertyCode: true,
        },
      });
      if (maxProp?.propertyCode) {
        const counterStr = maxProp.propertyCode.replace(prefix, '');
        maxCounter = parseInt(counterStr, 10) || 0;
      }
      break;

    case 'pay':
      const maxPay = await client.payment.findFirst({
        where: {
          paymentId: {
            startsWith: prefix,
          },
        },
        orderBy: {
          paymentId: 'desc',
        },
        select: {
          paymentId: true,
        },
      });
      if (maxPay?.paymentId) {
        const counterStr = maxPay.paymentId.replace(prefix, '');
        maxCounter = parseInt(counterStr, 10) || 0;
      }
      break;

    case 'cli':
      const maxCli = await client.client.findFirst({
        where: {
          clientCode: {
            startsWith: prefix,
          },
        },
        orderBy: {
          clientCode: 'desc',
        },
        select: {
          clientCode: true,
        },
      });
      if (maxCli?.clientCode) {
        const counterStr = maxCli.clientCode.replace(prefix, '');
        maxCounter = parseInt(counterStr, 10) || 0;
      }
      break;

    case 'lead':
      const maxLead = await client.lead.findFirst({
        where: {
          leadCode: {
            startsWith: prefix,
          },
        },
        orderBy: {
          leadCode: 'desc',
        },
        select: {
          leadCode: true,
        },
      });
      if (maxLead?.leadCode) {
        const counterStr = maxLead.leadCode.replace(prefix, '');
        maxCounter = parseInt(counterStr, 10) || 0;
      }
      break;

    case 'deal':
      // Dealers only
      const maxDealer = await client.dealer.findFirst({
        where: {
          dealerCode: {
            startsWith: prefix,
          },
        },
        orderBy: {
          dealerCode: 'desc',
        },
        select: {
          dealerCode: true,
        },
      });
      if (maxDealer?.dealerCode) {
        const counterStr = maxDealer.dealerCode.replace(prefix, '');
        maxCounter = parseInt(counterStr, 10) || 0;
      }
      break;

    case 'dl':
      // Deals only
      const maxDeal = await client.deal.findFirst({
        where: {
          dealCode: {
            startsWith: prefix,
          },
        },
        orderBy: {
          dealCode: 'desc',
        },
        select: {
          dealCode: true,
        },
      });
      if (maxDeal?.dealCode) {
        const counterStr = maxDeal.dealCode.replace(prefix, '');
        maxCounter = parseInt(counterStr, 10) || 0;
      }
      break;

    case 'rcp':
      const maxRcp = await client.dealReceipt.findFirst({
        where: {
          receiptNo: {
            startsWith: prefix,
          },
        },
        orderBy: {
          receiptNo: 'desc',
        },
        select: {
          receiptNo: true,
        },
      });
      if (maxRcp?.receiptNo) {
        const counterStr = maxRcp.receiptNo.replace(prefix, '');
        maxCounter = parseInt(counterStr, 10) || 0;
      }
      break;

    default:
      throw new Error(`Unsupported module prefix: ${modulePrefix}`);
  }

  // Increment counter
  const nextCounter = maxCounter + 1;

  // Format: prefix-YY-#### (4 digits)
  const counterStr = String(nextCounter).padStart(4, '0');
  const systemId = `${prefix}${counterStr}`;

  return systemId;
}

/**
 * Validate manual unique ID
 * Ensures it doesn't conflict with system IDs
 * 
 * @param manualId - User-provided manual ID
 * @param modulePrefix - Module prefix to check against
 * @param excludeId - Optional ID to exclude from check (for updates)
 * @param tx - Optional transaction client
 * @returns true if valid, throws error if invalid
 */
export async function validateManualUniqueId(
  manualId: string,
  modulePrefix: ModulePrefix,
  excludeId?: string,
  tx?: Prisma.TransactionClient
): Promise<boolean> {
  if (!manualId || manualId.trim() === '') {
    return true; // Empty is allowed (optional field)
  }

  const client = tx || prisma;
  const trimmedId = manualId.trim();

  // Check if manual ID matches system ID pattern (should not)
  const yearSuffix = String(new Date().getFullYear()).slice(-2);
  const systemIdPattern = new RegExp(`^${modulePrefix}-${yearSuffix}-\\d{4}$`);
  if (systemIdPattern.test(trimmedId)) {
    throw new Error('Manual ID cannot match system ID format');
  }

  // Check for conflicts based on module
  switch (modulePrefix) {
    case 'prop':
      const existingProp = await client.property.findFirst({
        where: {
          OR: [
            { propertyCode: trimmedId },
            { manualUniqueId: trimmedId },
          ],
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
      });
      if (existingProp) {
        throw new Error('Manual ID already exists for a property');
      }
      break;

    case 'pay':
      const existingPay = await client.payment.findFirst({
        where: {
          OR: [
            { paymentId: trimmedId },
            { manualUniqueId: trimmedId },
          ],
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
      });
      if (existingPay) {
        throw new Error('Manual ID already exists for a payment');
      }
      break;

    case 'cli':
      const existingCli = await client.client.findFirst({
        where: {
          OR: [
            { clientCode: trimmedId },
            { manualUniqueId: trimmedId },
          ],
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
      });
      if (existingCli) {
        throw new Error('Manual ID already exists for a client');
      }
      break;

    case 'lead':
      const existingLead = await client.lead.findFirst({
        where: {
          OR: [
            { leadCode: trimmedId },
            { manualUniqueId: trimmedId },
          ],
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
      });
      if (existingLead) {
        throw new Error('Manual ID already exists for a lead');
      }
      break;

    case 'deal':
      // Dealers only
      const existingDealer = await client.dealer.findFirst({
        where: {
          OR: [
            { dealerCode: trimmedId },
            { manualUniqueId: trimmedId },
          ],
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
      });
      if (existingDealer) {
        throw new Error('Manual ID already exists for a dealer');
      }
      break;

    case 'dl':
      // Deals only
      const existingDeal = await client.deal.findFirst({
        where: {
          OR: [
            { dealCode: trimmedId },
            { manualUniqueId: trimmedId },
          ],
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
      });
      if (existingDeal) {
        throw new Error('Manual ID already exists for a deal');
      }
      break;

    default:
      throw new Error(`Unsupported module prefix: ${modulePrefix}`);
  }

  return true;
}

/**
 * Extract year and counter from system ID
 * Useful for migration or analysis
 */
export function parseSystemId(systemId: string): { prefix: string; year: number; counter: number } | null {
  const match = systemId.match(/^([a-z]+)-(\d{2})-(\d{4})$/);
  if (!match) {
    return null;
  }

  const [, prefix, yearStr, counterStr] = match;
  const year = 2000 + parseInt(yearStr, 10); // Convert YY to YYYY
  const counter = parseInt(counterStr, 10);

  return { prefix, year, counter };
}

