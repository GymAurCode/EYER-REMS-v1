/**
 * PDF Generator Utility
 * Generates PDF reports for various entities
 */

import PDFDocument from 'pdfkit';
import { Response } from 'express';

export interface PaymentPlanPDFData {
  deal: {
    dealCode?: string;
    title: string;
    dealAmount: number;
    client?: {
      name?: string;
      email?: string;
      phone?: string;
    };
    dealer?: {
      name?: string;
    };
    property?: {
      name?: string;
      propertyCode?: string;
    };
  };
  summary: {
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    progress: number;
    status: string;
  };
  installments: Array<{
    installmentNumber: number;
    amount: number;
    dueDate: string | Date;
    paidAmount?: number;
    status?: string;
    paymentMode?: string;
    notes?: string;
  }>;
  generatedAt?: Date;
}

/**
 * Generate Payment Plan PDF
 */
export function generatePaymentPlanPDF(data: PaymentPlanPDFData, res: Response): void {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  
  // Set response headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="payment-plan-${data.deal.dealCode || 'report'}-${new Date().toISOString().split('T')[0]}.pdf"`
  );

  // Pipe PDF to response
  doc.pipe(res);

  // Helper function to format currency
  const formatCurrency = (amount: number): string => {
    return `Rs ${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Helper function to format date
  const formatDate = (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Header
  doc.fontSize(20).font('Helvetica-Bold').text('Payment Plan Report', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica').text(`Generated on: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
  doc.moveDown(1);

  // Deal Information Section
  doc.fontSize(14).font('Helvetica-Bold').text('Deal Information', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica');
  
  doc.text(`Deal Code: ${data.deal.dealCode || 'N/A'}`);
  doc.text(`Title: ${data.deal.title}`);
  doc.text(`Total Amount: ${formatCurrency(data.deal.dealAmount)}`);
  
  if (data.deal.client) {
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').text('Client Details:');
    doc.font('Helvetica');
    doc.text(`  Name: ${data.deal.client.name || 'N/A'}`);
    if (data.deal.client.email) doc.text(`  Email: ${data.deal.client.email}`);
    if (data.deal.client.phone) doc.text(`  Phone: ${data.deal.client.phone}`);
  }
  
  if (data.deal.dealer) {
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').text('Dealer:');
    doc.font('Helvetica');
    doc.text(`  ${data.deal.dealer.name || 'N/A'}`);
  }
  
  if (data.deal.property) {
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').text('Property:');
    doc.font('Helvetica');
    doc.text(`  ${data.deal.property.name || 'N/A'} (${data.deal.property.propertyCode || 'N/A'})`);
  }

  doc.moveDown(1);

  // Payment Summary Section
  doc.fontSize(14).font('Helvetica-Bold').text('Payment Summary', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica');
  
  const summaryY = doc.y;
  doc.text(`Total Amount: ${formatCurrency(data.summary.totalAmount)}`, { continued: false });
  doc.text(`Paid Amount: ${formatCurrency(data.summary.paidAmount)}`, { continued: false });
  doc.text(`Remaining Amount: ${formatCurrency(data.summary.remainingAmount)}`, { continued: false });
  doc.text(`Progress: ${data.summary.progress.toFixed(2)}%`, { continued: false });
  doc.text(`Status: ${data.summary.status}`, { continued: false });

  doc.moveDown(1);

  // Installments Table
  if (data.installments && data.installments.length > 0) {
    doc.fontSize(14).font('Helvetica-Bold').text('Installment Schedule', { underline: true });
    doc.moveDown(0.5);

    // Table headers
    const tableTop = doc.y;
    const itemHeight = 20;
    const tableLeft = 50;
    const col1 = tableLeft; // #
    const col2 = col1 + 40; // Amount
    const col3 = col2 + 100; // Due Date
    const col4 = col3 + 100; // Paid
    const col5 = col4 + 80; // Remaining
    const col6 = col5 + 80; // Status

    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('#', col1, tableTop);
    doc.text('Amount', col2, tableTop);
    doc.text('Due Date', col3, tableTop);
    doc.text('Paid', col4, tableTop);
    doc.text('Remaining', col5, tableTop);
    doc.text('Status', col6, tableTop);

    // Draw header line
    doc.moveTo(tableLeft, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    // Table rows
    doc.fontSize(9).font('Helvetica');
    let currentY = tableTop + 25;

    data.installments.forEach((inst) => {
      if (currentY > 700) {
        // New page if needed
        doc.addPage();
        currentY = 50;
      }

      const remaining = (inst.amount || 0) - (inst.paidAmount || 0);
      const status = inst.status || 'unpaid';

      doc.text(inst.installmentNumber.toString(), col1, currentY);
      doc.text(formatCurrency(inst.amount || 0), col2, currentY);
      doc.text(formatDate(inst.dueDate), col3, currentY);
      doc.text(formatCurrency(inst.paidAmount || 0), col4, currentY);
      doc.text(formatCurrency(remaining), col5, currentY);
      doc.text(status.toUpperCase(), col6, currentY);

      // Draw row line
      doc.moveTo(tableLeft, currentY + 12).lineTo(550, currentY + 12).stroke();

      currentY += itemHeight;
    });

    doc.y = currentY + 10;
  }

  // Footer
  const pageHeight = doc.page.height;
  const pageWidth = doc.page.width;
  doc.fontSize(8).font('Helvetica');
  doc.text(
    'This is a computer-generated document.',
    pageWidth / 2,
    pageHeight - 50,
    { align: 'center' }
  );

  // Finalize PDF
  doc.end();
}

export interface ReceiptPDFData {
  receipt: {
    receiptNo: string;
    amount: number;
    method: string;
    date: Date | string;
    notes?: string;
  };
  deal: {
    dealCode?: string;
    title: string;
    dealAmount: number;
  };
  client: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  allocations: Array<{
    installmentNumber: number;
    amountAllocated: number;
    installmentAmount: number;
    dueDate: Date | string;
  }>;
  receivedBy?: {
    username?: string;
    email?: string;
  };
  companyName?: string;
  companyLogo?: string;
}

/**
 * Generate Receipt PDF
 * Returns PDF buffer instead of piping to response
 */
export async function generateReceiptPDF(data: ReceiptPDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve(pdfBuffer);
    });
    doc.on('error', reject);

    // Helper functions
    const formatCurrency = (amount: number): string => {
      return `Rs ${amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    };

    const formatDate = (date: string | Date): string => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    // Header with Company Name
    const companyName = data.companyName || 'Real Estate Management System';
    doc.fontSize(24).font('Helvetica-Bold').text(companyName, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(12).font('Helvetica').text('PAYMENT RECEIPT', { align: 'center' });
    doc.moveDown(1);

    // Receipt Details
    doc.fontSize(14).font('Helvetica-Bold').text('Receipt Details', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Receipt Number: ${data.receipt.receiptNo}`);
    doc.text(`Date: ${formatDate(data.receipt.date)}`);
    doc.text(`Payment Method: ${data.receipt.method}`);
    doc.text(`Amount Received: ${formatCurrency(data.receipt.amount)}`);
    if (data.receipt.notes) {
      doc.moveDown(0.3);
      doc.text(`Notes: ${data.receipt.notes}`);
    }
    doc.moveDown(1);

    // Client Information
    doc.fontSize(14).font('Helvetica-Bold').text('Client Information', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Name: ${data.client.name}`);
    if (data.client.email) doc.text(`Email: ${data.client.email}`);
    if (data.client.phone) doc.text(`Phone: ${data.client.phone}`);
    if (data.client.address) doc.text(`Address: ${data.client.address}`);
    doc.moveDown(1);

    // Deal Information
    doc.fontSize(14).font('Helvetica-Bold').text('Deal Information', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Deal Code: ${data.deal.dealCode || 'N/A'}`);
    doc.text(`Title: ${data.deal.title}`);
    doc.text(`Total Deal Amount: ${formatCurrency(data.deal.dealAmount)}`);
    doc.moveDown(1);

    // Allocation Breakdown
    if (data.allocations && data.allocations.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('Payment Allocation', { underline: true });
      doc.moveDown(0.5);

      const tableTop = doc.y;
      const itemHeight = 20;
      const tableLeft = 50;
      const col1 = tableLeft; // Installment #
      const col2 = col1 + 80; // Due Date
      const col3 = col2 + 120; // Installment Amount
      const col4 = col3 + 120; // Allocated

      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Installment #', col1, tableTop);
      doc.text('Due Date', col2, tableTop);
      doc.text('Installment Amount', col3, tableTop);
      doc.text('Amount Allocated', col4, tableTop);

      doc.moveTo(tableLeft, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      doc.fontSize(9).font('Helvetica');
      let currentY = tableTop + 25;

      data.allocations.forEach((alloc) => {
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }

        doc.text(alloc.installmentNumber.toString(), col1, currentY);
        doc.text(formatDate(alloc.dueDate), col2, currentY);
        doc.text(formatCurrency(alloc.installmentAmount), col3, currentY);
        doc.text(formatCurrency(alloc.amountAllocated), col4, currentY);

        doc.moveTo(tableLeft, currentY + 12).lineTo(550, currentY + 12).stroke();
        currentY += itemHeight;
      });

      doc.y = currentY + 10;
    }

    // Total
    doc.moveDown(1);
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text(`Total Amount Received: ${formatCurrency(data.receipt.amount)}`, { align: 'right' });

    // Footer with signatures
    doc.moveDown(2);
    const pageHeight = doc.page.height;
    const pageWidth = doc.page.width;

    // Received By section
    doc.fontSize(10).font('Helvetica');
    doc.text('Received By:', 100, pageHeight - 150);
    doc.moveTo(100, pageHeight - 130).lineTo(250, pageHeight - 130).stroke();
    if (data.receivedBy) {
      doc.fontSize(9).text(data.receivedBy.username || data.receivedBy.email || '', 100, pageHeight - 115);
    }

    // Authorized Signature
    doc.text('Authorized Signature:', 350, pageHeight - 150);
    doc.moveTo(350, pageHeight - 130).lineTo(500, pageHeight - 130).stroke();

    // Footer note
    doc.fontSize(8).font('Helvetica');
    doc.text(
      'This is a computer-generated receipt. No signature required.',
      pageWidth / 2,
      pageHeight - 50,
      { align: 'center' }
    );

    doc.end();
  });
}

