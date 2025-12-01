/**
 * Auto-Sync Workflow Services
 * Handles all automatic synchronization between modules
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Auto-generate monthly invoices for active tenancies
 */
export async function generateMonthlyInvoices() {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Find all active tenancies with nextInvoiceDate <= today
  const tenancies = await prisma.tenancy.findMany({
    where: {
      status: 'active',
      OR: [
        { nextInvoiceDate: { lte: today } },
        { nextInvoiceDate: null },
      ],
    },
    include: {
      property: true,
      tenant: true,
      lease: true,
    },
  });

  const generatedInvoices = [];

  for (const tenancy of tenancies) {
    try {
      // Calculate due date (typically 7 days from invoice date)
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 7);

      // Generate invoice number
      const invoiceNumber = `INV-${currentYear}${String(currentMonth + 1).padStart(2, '0')}-${Date.now()}`;

      // Create invoice
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          tenantId: tenancy.tenantId,
          propertyId: tenancy.propertyId,
          billingDate: today,
          dueDate,
          amount: tenancy.monthlyRent,
          totalAmount: tenancy.monthlyRent,
          remainingAmount: tenancy.monthlyRent,
          status: 'unpaid',
        },
      });

      // Update next invoice date (next month same day)
      const nextInvoiceDate = new Date(today);
      nextInvoiceDate.setMonth(nextInvoiceDate.getMonth() + 1);

      await prisma.tenancy.update({
        where: { id: tenancy.id },
        data: { nextInvoiceDate },
      });

      // Auto-sync to Finance Ledger
      await syncInvoiceToFinanceLedger(invoice.id);

      // Update tenant ledger
      await updateTenantLedger(tenancy.tenantId, {
        entryType: 'debit',
        description: `Monthly rent invoice ${invoiceNumber}`,
        amount: tenancy.monthlyRent,
        referenceId: invoice.id,
        referenceType: 'invoice',
      });

      generatedInvoices.push(invoice);
    } catch (error) {
      console.error(`Error generating invoice for tenancy ${tenancy.id}:`, error);
    }
  }

  return generatedInvoices;
}

/**
 * Sync invoice to Finance Ledger (Income)
 */
export async function syncInvoiceToFinanceLedger(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { tenant: true, property: true },
  });

  if (!invoice) return null;

  const ledger = await prisma.financeLedger.create({
    data: {
      referenceType: 'invoice',
      referenceId: invoiceId,
      category: 'income',
      amount: invoice.totalAmount,
      date: invoice.billingDate,
      description: `Rent invoice ${invoice.invoiceNumber}`,
      notes: `Auto-generated from invoice ${invoice.invoiceNumber}`,
      propertyId: invoice.propertyId || undefined,
      tenantId: invoice.tenantId || undefined,
      invoiceId: invoiceId,
    },
  });

  // Auto-sync: Update dashboard KPIs if property exists
  if (invoice.propertyId) {
    await updateDashboardKPIs(invoice.propertyId);
  }

  return ledger;
}

/**
 * Sync payment to Finance Ledger (Income - Received)
 */
export async function syncPaymentToFinanceLedger(paymentId: string) {
  const payment = await prisma.tenantPayment.findUnique({
    where: { id: paymentId },
    include: { 
      tenant: true, 
      invoice: { include: { property: true } },
      // Include all invoices if allocations exist
    },
    // Ensure we get allocatedAmount and overpaymentAmount
  });

  if (!payment) return null;

  // Use allocatedAmount for revenue (cash-basis accounting)
  // Only the amount applied to invoices counts as revenue, not the advance portion
  const revenueAmount = payment.allocatedAmount || payment.amount || 0;
  
  const ledger = await prisma.financeLedger.create({
    data: {
      referenceType: 'payment',
      referenceId: paymentId,
      category: 'income',
      amount: revenueAmount, // Use allocated amount for revenue
      date: payment.date,
      description: `Payment received ${payment.paymentId}${payment.allocatedAmount ? ` (Applied: ${payment.allocatedAmount})` : ''}`,
      notes: `Payment method: ${payment.method}${payment.overpaymentAmount ? ` | Advance: ${payment.overpaymentAmount}` : ''}`,
      propertyId: payment.invoice?.propertyId || undefined,
      tenantId: payment.tenantId || undefined,
      paymentId: paymentId,
    },
  });

  // Note: Invoice status and remainingAmount are already updated in the payment creation transaction
  // We don't need to update them again here to avoid double updates

  // Update tenant ledger with allocated amount (credit entry)
  if (payment.tenantId && revenueAmount > 0) {
    await updateTenantLedger(payment.tenantId, {
      entryType: 'credit',
      description: `Payment received ${payment.paymentId}${(payment.allocations as any)?.length ? ` (${(payment.allocations as any).length} invoice(s))` : ''}`,
      amount: revenueAmount,
      referenceId: paymentId,
      referenceType: 'payment',
    });
  }

  // Auto-sync: Update dashboard KPIs if property exists
  if (payment.invoice?.propertyId) {
    await updateDashboardKPIs(payment.invoice.propertyId);
  }

  return ledger;
}

/**
 * Sync property expense to Finance Ledger (Expense)
 */
export async function syncPropertyExpenseToFinanceLedger(expenseId: string) {
  const expense = await prisma.propertyExpense.findUnique({
    where: { id: expenseId },
    include: { property: true },
  });

  if (!expense) return null;

  const ledger = await prisma.financeLedger.create({
    data: {
      referenceType: 'property_expense',
      referenceId: expenseId,
      category: 'expense',
      amount: expense.amount,
      date: expense.date,
      description: `Property expense: ${expense.category}`,
      notes: expense.description || undefined,
      propertyId: expense.propertyId,
    },
  });

  // Link expense to ledger
  await prisma.propertyExpense.update({
    where: { id: expenseId },
    data: { financeLedgerId: ledger.id },
  });

  // Auto-sync: Update dashboard KPIs
  await updateDashboardKPIs(expense.propertyId);

  return ledger;
}

/**
 * Sync maintenance request to Finance Ledger (Expense)
 */
export async function syncMaintenanceToFinanceLedger(maintenanceId: string) {
  const maintenance = await prisma.maintenanceRequest.findUnique({
    where: { id: maintenanceId },
    include: { property: true, tenant: true },
  });

  if (!maintenance || !maintenance.actualCost || maintenance.actualCost <= 0) {
    return null;
  }

  const ledger = await prisma.financeLedger.create({
    data: {
      referenceType: 'maintenance',
      referenceId: maintenanceId,
      category: 'expense',
      amount: maintenance.actualCost,
      date: maintenance.completedAt || new Date(),
      description: `Maintenance: ${maintenance.issueTitle}`,
      notes: maintenance.issueDescription,
      propertyId: maintenance.propertyId,
      tenantId: maintenance.tenantId || undefined,
    },
  });

  // Link maintenance to ledger
  await prisma.maintenanceRequest.update({
    where: { id: maintenanceId },
    data: { financeLedgerId: ledger.id },
  });

  return ledger;
}

/**
 * Sync commission payment to Finance Ledger (Expense)
 */
export async function syncCommissionToFinanceLedger(commissionId: string) {
  const commission = await prisma.commission.findUnique({
    where: { id: commissionId },
    include: {
      dealer: true,
      sale: {
        include: {
          property: true,
        },
      },
    },
  });

  if (!commission) return null;

  // Check if already synced
  const existingLedger = await prisma.financeLedger.findFirst({
    where: {
      referenceType: 'commission',
      referenceId: commissionId,
      category: 'expense',
    },
  });

  if (existingLedger) {
    return existingLedger;
  }

  const ledger = await prisma.financeLedger.create({
    data: {
      referenceType: 'commission',
      referenceId: commissionId,
      category: 'expense',
      amount: commission.amount,
      date: new Date(),
      description: `Commission payment: ${commission.dealer?.name || 'Dealer'}`,
      notes: `Commission rate: ${commission.rate}%`,
      dealId: commission.saleId || undefined,
    },
  });

  return ledger;
}

/**
 * Sync deal payment to Finance Ledger (Income)
 */
export async function syncDealToFinanceLedger(dealId: string) {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { client: true, property: true, dealer: true },
  });

  if (!deal || deal.stage !== 'closed-won') {
    return null;
  }

  const ledger = await prisma.financeLedger.create({
    data: {
      referenceType: 'deal',
      referenceId: dealId,
      category: 'income',
      amount: deal.dealAmount,
      date: deal.actualClosingDate || new Date(),
      description: `Deal closed: ${deal.title}`,
      notes: `Deal code: ${deal.dealCode || 'N/A'}`,
      propertyId: deal.propertyId || undefined,
      dealId: dealId,
    },
  });

  // Auto-sync: Calculate and create commission if dealer exists
  if (deal.dealerId && deal.commissionRate > 0 && deal.commissionAmount > 0) {
    // Check if commission already exists
    const existingCommission = await prisma.commission.findFirst({
      where: {
        dealerId: deal.dealerId,
        saleId: null, // Deal-based commission (not sale-based)
      },
    });

    if (!existingCommission) {
      await prisma.commission.create({
        data: {
          dealerId: deal.dealerId,
          rate: deal.commissionRate,
          amount: deal.commissionAmount,
        },
      });

      // Auto-sync commission to finance ledger
      const commission = await prisma.commission.findFirst({
        where: {
          dealerId: deal.dealerId,
          saleId: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (commission) {
        await syncCommissionToFinanceLedger(commission.id);
      }
    }
  }

  // Auto-sync: Update dashboard KPIs if property exists
  if (deal.propertyId) {
    await updateDashboardKPIs(deal.propertyId);
  }

  return ledger;
}

/**
 * Sync payroll salary to Finance Ledger (Expense)
 */
export async function syncPayrollToFinanceLedger(payrollId: string) {
  const payroll = await prisma.payroll.findUnique({
    where: { id: payrollId },
    include: { employee: true },
  });

  if (!payroll || payroll.paymentStatus !== 'paid') {
    return null;
  }

  const ledger = await prisma.financeLedger.create({
    data: {
      referenceType: 'salary',
      referenceId: payrollId,
      category: 'expense',
      amount: payroll.netPay,
      date: payroll.paymentDate || new Date(),
      description: `Salary payment: ${payroll.employee.name} - ${payroll.month}`,
      notes: `Employee ID: ${payroll.employee.employeeId}`,
      payrollId: payrollId,
    },
  });

  // Link payroll to ledger
  await prisma.payroll.update({
    where: { id: payrollId },
    data: {
      financeLinked: true,
      financeLedgerId: ledger.id,
    },
  });

  // Auto-sync: Dashboard will reflect expense in finance summary
  // No property-specific update needed for payroll

  return ledger;
}

/**
 * Update tenant ledger entry
 */
export async function updateTenantLedger(
  tenantId: string,
  entry: {
    entryType: 'debit' | 'credit';
    description: string;
    amount: number;
    referenceId?: string;
    referenceType?: string;
  }
) {
  // Get current balance
  const lastEntry = await prisma.tenantLedger.findFirst({
    where: { tenantId, isDeleted: false },
    orderBy: { createdAt: 'desc' },
  });

  const currentBalance = lastEntry?.balance || 0;
  const newBalance =
    entry.entryType === 'debit'
      ? currentBalance + entry.amount
      : currentBalance - entry.amount;

  // Update tenant outstanding balance
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      outstandingBalance: newBalance,
    },
  });

  // Create ledger entry
  const ledgerEntry = await prisma.tenantLedger.create({
    data: {
      ledgerNumber: `TL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      entryType: entry.entryType,
      description: entry.description,
      amount: entry.amount,
      balance: newBalance,
      referenceId: entry.referenceId,
      referenceType: entry.referenceType,
    },
  });

  return ledgerEntry;
}

/**
 * Auto-sync: Update dashboard KPIs when unit status changes
 */
export async function updateDashboardKPIs(propertyId: string) {
  try {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        units: {
          where: { isDeleted: false },
          include: {
            tenant: {
              where: { isDeleted: false },
            },
          },
        },
        floors: {
          where: { isDeleted: false },
          include: {
            units: {
              where: { isDeleted: false },
            },
          },
        },
      },
    });

    if (!property) return null;

    // Calculate occupancy metrics
    const totalUnits = property.units.length;
    const occupiedUnits = property.units.filter((u) => u.status === 'Occupied').length;
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

    // Calculate revenue from occupied units
    const monthlyRevenue = property.units
      .filter((u) => u.status === 'Occupied' && u.monthlyRent)
      .reduce((sum, u) => sum + (u.monthlyRent || 0), 0);

    // Calculate floor-based metrics
    const floorMetrics = property.floors.map((floor) => {
      const floorUnits = floor.units;
      const floorOccupied = floorUnits.filter((u) => u.status === 'Occupied').length;
      const floorRevenue = floorUnits
        .filter((u) => u.status === 'Occupied' && u.monthlyRent)
        .reduce((sum, u) => sum + (u.monthlyRent || 0), 0);

      return {
        floorId: floor.id,
        floorName: floor.name,
        floorNumber: floor.floorNumber,
        totalUnits: floorUnits.length,
        occupiedUnits: floorOccupied,
        revenue: floorRevenue,
      };
    });

    // Update revenue summary for current month
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    await prisma.revenueSummary.upsert({
      where: {
        propertyId_month: {
          propertyId,
          month: currentMonth,
        },
      },
      create: {
        propertyId,
        month: currentMonth,
        totalRevenue: monthlyRevenue,
        rentRevenue: monthlyRevenue,
        otherRevenue: 0,
      },
      update: {
        totalRevenue: monthlyRevenue,
        rentRevenue: monthlyRevenue,
      },
    });

    return {
      propertyId,
      totalUnits,
      occupiedUnits,
      occupancyRate: Math.round(occupancyRate * 100) / 100,
      monthlyRevenue,
      floorMetrics,
    };
  } catch (error) {
    console.error('Error updating dashboard KPIs:', error);
    return null;
  }
}

/**
 * Auto-create tenancy when tenant is assigned to property
 */
export async function createTenancyFromLease(leaseId: string) {
  const lease = await prisma.lease.findUnique({
    where: { id: leaseId },
    include: { tenant: { include: { unit: { include: { property: true } } } } },
  });

  if (!lease) return null;

  const property = lease.tenant.unit.property;

  // Calculate next invoice date (first of next month or lease start date)
  const nextInvoiceDate = new Date(lease.leaseStart);
  nextInvoiceDate.setMonth(nextInvoiceDate.getMonth() + 1);
  nextInvoiceDate.setDate(1);

  const tenancy = await prisma.tenancy.create({
    data: {
      propertyId: property.id,
      tenantId: lease.tenantId,
      leaseId: lease.id,
      leaseStart: lease.leaseStart,
      leaseEnd: lease.leaseEnd,
      monthlyRent: lease.rent,
      nextInvoiceDate,
      status: 'active',
    },
  });

  // Update property status
  await prisma.property.update({
    where: { id: property.id },
    data: { status: 'Occupied' },
  });

  // Update unit status
  await prisma.unit.update({
    where: { id: lease.unitId },
    data: { status: 'Occupied' },
  });

  // Auto-sync: Update dashboard KPIs
  await updateDashboardKPIs(property.id);

  return tenancy;
}

/**
 * Update property status when maintenance is filed
 */
export async function updatePropertyStatusOnMaintenance(maintenanceId: string) {
  const maintenance = await prisma.maintenanceRequest.findUnique({
    where: { id: maintenanceId },
    include: { property: true },
  });

  if (!maintenance) return;

  // Update property status if high priority
  if (maintenance.priority === 'high' || maintenance.priority === 'urgent') {
    await prisma.property.update({
      where: { id: maintenance.propertyId },
      data: { status: 'Under-Maintenance' },
    });
  }

  // Update maintenance status in property maintenance history
  const property = await prisma.property.findUnique({
    where: { id: maintenance.propertyId },
  });

  if (property) {
    // Note: maintenanceHistory field may not exist in schema
    // This is a placeholder for future implementation
    const maintenanceHistory: any[] = [];
    maintenanceHistory.push({
      id: maintenance.id,
      title: maintenance.issueTitle,
      date: maintenance.createdAt,
      status: maintenance.status,
    });

    // Note: Prisma doesn't support updating JSON fields directly in nested updates
    // This would need to be handled in the route handler
  }
}

