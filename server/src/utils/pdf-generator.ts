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
    downPayment?: number; // Down payment amount
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
 * Generate Payment Plan PDF - Beautiful formatted report (Single Page Optimized)
 */
export function generatePaymentPlanPDF(data: PaymentPlanPDFData, res: Response): void {
  const doc = new PDFDocument({ margin: 30, size: 'A4' });
  
  // Set response headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="payment-plan-${data.deal.dealCode || 'report'}-${new Date().toISOString().split('T')[0]}.pdf"`
  );

  // Pipe PDF to response
  doc.pipe(res);

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const pageMargin = 30;
  const contentWidth = pageWidth - (pageMargin * 2);

  // Colors
  const primaryColor = '#1a365d';
  const accentColor = '#2563eb';
  const lightGray = '#f3f4f6';
  const darkGray = '#374151';
  const successColor = '#059669';
  const warningColor = '#d97706';

  // Helper function to format currency
  const formatCurrency = (amount: number): string => {
    return `Rs ${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  // Helper function to format date
  const formatDate = (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Draw colored rectangle
  const drawRect = (x: number, y: number, w: number, h: number, color: string, fill = true) => {
    doc.save();
    if (fill) {
      doc.rect(x, y, w, h).fill(color);
    } else {
      doc.rect(x, y, w, h).stroke(color);
    }
    doc.restore();
  };

  // ============ HEADER SECTION (Compact) ============
  drawRect(0, 0, pageWidth, 70, primaryColor);
  
  doc.fillColor('#ffffff');
  doc.fontSize(20).font('Helvetica-Bold').text('PAYMENT PLAN REPORT', pageMargin, 15, { align: 'center' });
  doc.fontSize(9).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}`, pageMargin, 45, { align: 'center' });

  doc.fillColor('#000000');
  let currentY = 80;

  // ============ DEAL & PROPERTY INFO (Combined Box) ============
  const infoBoxHeight = 75;
  drawRect(pageMargin, currentY, contentWidth, infoBoxHeight, lightGray);
  drawRect(pageMargin, currentY, 4, infoBoxHeight, accentColor);
  
  doc.fillColor(primaryColor);
  doc.fontSize(11).font('Helvetica-Bold').text('Deal & Property Information', pageMargin + 12, currentY + 8);
  
  doc.fillColor(darkGray);
  doc.fontSize(9).font('Helvetica');
  
  const leftCol = pageMargin + 12;
  const midCol = pageMargin + contentWidth / 3;
  const rightCol = pageMargin + (contentWidth * 2) / 3;
  
  // Row 1
  doc.text(`Deal Code: ${data.deal.dealCode || 'N/A'}`, leftCol, currentY + 25);
  doc.text(`Title: ${data.deal.title}`, midCol, currentY + 25);
  doc.font('Helvetica-Bold').text(`Amount: ${formatCurrency(data.deal.dealAmount)}`, rightCol, currentY + 25);
  
  // Row 2 - Property Details
  doc.font('Helvetica');
  if (data.deal.property) {
    doc.text(`Property: ${data.deal.property.name || 'N/A'}`, leftCol, currentY + 40);
    doc.text(`Property Code: ${data.deal.property.propertyCode || 'N/A'}`, midCol, currentY + 40);
  }
  if (data.deal.dealer) {
    doc.text(`Dealer: ${data.deal.dealer.name || 'N/A'}`, rightCol, currentY + 40);
  }

  // Row 3 - Client Details
  if (data.deal.client) {
    doc.text(`Client: ${data.deal.client.name || 'N/A'}`, leftCol, currentY + 55);
    if (data.deal.client.phone) doc.text(`Phone: ${data.deal.client.phone}`, midCol, currentY + 55);
    if (data.deal.client.email) doc.text(`Email: ${data.deal.client.email}`, rightCol, currentY + 55);
  }

  currentY += infoBoxHeight + 10;

  // ============ PAYMENT SUMMARY (Compact Cards) ============
  const cardWidth = (contentWidth - 20) / 4;
  const cardHeight = 45;
  const downPayment = data.summary.downPayment || 0;
  
  // Card 1: Total Amount
  drawRect(pageMargin, currentY, cardWidth, cardHeight, '#dbeafe');
  doc.fillColor('#1e40af');
  doc.fontSize(8).font('Helvetica').text('Total Amount', pageMargin + 6, currentY + 6);
  doc.fontSize(11).font('Helvetica-Bold').text(formatCurrency(data.summary.totalAmount), pageMargin + 6, currentY + 22);

  // Card 2: Down Payment
  drawRect(pageMargin + cardWidth + 5, currentY, cardWidth, cardHeight, '#fef3c7');
  doc.fillColor('#92400e');
  doc.fontSize(8).font('Helvetica').text('Down Payment', pageMargin + cardWidth + 11, currentY + 6);
  doc.fontSize(11).font('Helvetica-Bold').text(formatCurrency(downPayment), pageMargin + cardWidth + 11, currentY + 22);

  // Card 3: Paid Amount
  drawRect(pageMargin + (cardWidth + 5) * 2, currentY, cardWidth, cardHeight, '#d1fae5');
  doc.fillColor('#065f46');
  doc.fontSize(8).font('Helvetica').text('Paid Amount', pageMargin + (cardWidth + 5) * 2 + 6, currentY + 6);
  doc.fontSize(11).font('Helvetica-Bold').text(formatCurrency(data.summary.paidAmount), pageMargin + (cardWidth + 5) * 2 + 6, currentY + 22);

  // Card 4: Remaining
  drawRect(pageMargin + (cardWidth + 5) * 3, currentY, cardWidth, cardHeight, '#fee2e2');
  doc.fillColor('#991b1b');
  doc.fontSize(8).font('Helvetica').text('Remaining', pageMargin + (cardWidth + 5) * 3 + 6, currentY + 6);
  doc.fontSize(11).font('Helvetica-Bold').text(formatCurrency(data.summary.remainingAmount), pageMargin + (cardWidth + 5) * 3 + 6, currentY + 22);

  currentY += cardHeight + 8;

  // Progress Bar (Compact)
  const progressBarHeight = 14;
  const progress = Math.min(data.summary.progress, 100);
  
  drawRect(pageMargin, currentY, contentWidth, progressBarHeight, '#e5e7eb');
  drawRect(pageMargin, currentY, (contentWidth * progress) / 100, progressBarHeight, progress >= 100 ? successColor : accentColor);
  
  doc.fillColor(progress > 50 ? '#ffffff' : darkGray);
  doc.fontSize(8).font('Helvetica-Bold').text(`${progress.toFixed(1)}% Complete`, pageMargin + contentWidth / 2 - 25, currentY + 3);
  
  currentY += progressBarHeight + 15;

  // ============ INSTALLMENTS TABLE ============
  if (data.installments && data.installments.length > 0) {
    doc.fillColor(primaryColor);
    doc.fontSize(11).font('Helvetica-Bold').text('Installment Schedule', pageMargin, currentY);
    currentY += 18;

    // Table configuration (compact)
    const tableLeft = pageMargin;
    const colWidths = [30, 75, 75, 80, 80, 80, 60];
    const cols = [
      tableLeft,
      tableLeft + colWidths[0],
      tableLeft + colWidths[0] + colWidths[1],
      tableLeft + colWidths[0] + colWidths[1] + colWidths[2],
      tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
      tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4],
      tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5],
    ];
    const rowHeight = 18;

    // Table Header
    drawRect(tableLeft, currentY, contentWidth, rowHeight + 2, primaryColor);
    doc.fillColor('#ffffff');
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('#', cols[0] + 4, currentY + 5);
    doc.text('Type', cols[1] + 4, currentY + 5);
    doc.text('Due Date', cols[2] + 4, currentY + 5);
    doc.text('Amount', cols[3] + 4, currentY + 5);
    doc.text('Paid', cols[4] + 4, currentY + 5);
    doc.text('Balance', cols[5] + 4, currentY + 5);
    doc.text('Status', cols[6] + 4, currentY + 5);

    currentY += rowHeight + 2;

    // Down Payment row
    if (downPayment > 0) {
      const dpStatus = data.summary.paidAmount >= downPayment ? 'PAID' : 'PENDING';
      const dpPaid = Math.min(data.summary.paidAmount, downPayment);
      const dpRemaining = Math.max(0, downPayment - dpPaid);
      
      drawRect(tableLeft, currentY, contentWidth, rowHeight, '#fef3c7');
      doc.fillColor(darkGray);
      doc.fontSize(8).font('Helvetica-Bold');
      doc.text('DP', cols[0] + 4, currentY + 5);
      doc.text('Down Payment', cols[1] + 4, currentY + 5);
      doc.font('Helvetica');
      doc.text('-', cols[2] + 4, currentY + 5);
      doc.text(formatCurrency(downPayment), cols[3] + 4, currentY + 5);
      doc.text(formatCurrency(dpPaid), cols[4] + 4, currentY + 5);
      doc.text(formatCurrency(dpRemaining), cols[5] + 4, currentY + 5);
      doc.fillColor(dpStatus === 'PAID' ? successColor : warningColor);
      doc.fontSize(7).font('Helvetica-Bold').text(dpStatus, cols[6] + 4, currentY + 5);
      currentY += rowHeight;
    }

    // Table Rows - Installments
    doc.fontSize(8).font('Helvetica');
    
    // Calculate available space for rows
    const footerSpace = 50;
    const availableHeight = pageHeight - currentY - footerSpace;
    const maxRowsPerPage = Math.floor(availableHeight / rowHeight);
    
    data.installments.forEach((inst, index) => {
      // Check if we need a new page
      if (currentY > pageHeight - footerSpace - rowHeight) {
        doc.addPage();
        currentY = 30;
        
        // Redraw header on new page
        drawRect(tableLeft, currentY, contentWidth, rowHeight + 2, primaryColor);
        doc.fillColor('#ffffff');
        doc.fontSize(8).font('Helvetica-Bold');
        doc.text('#', cols[0] + 4, currentY + 5);
        doc.text('Type', cols[1] + 4, currentY + 5);
        doc.text('Due Date', cols[2] + 4, currentY + 5);
        doc.text('Amount', cols[3] + 4, currentY + 5);
        doc.text('Paid', cols[4] + 4, currentY + 5);
        doc.text('Balance', cols[5] + 4, currentY + 5);
        doc.text('Status', cols[6] + 4, currentY + 5);
        currentY += rowHeight + 2;
        doc.fontSize(8).font('Helvetica');
      }

      const remaining = (inst.amount || 0) - (inst.paidAmount || 0);
      const status = (inst.status || 'pending').toUpperCase();
      const bgColor = index % 2 === 0 ? '#ffffff' : lightGray;
      
      drawRect(tableLeft, currentY, contentWidth, rowHeight, bgColor);
      
      doc.fillColor(darkGray);
      doc.text(inst.installmentNumber.toString(), cols[0] + 5, currentY + 6);
      doc.text('Installment', cols[1] + 5, currentY + 6);
      doc.text(formatDate(inst.dueDate), cols[2] + 4, currentY + 5);
      doc.text(formatCurrency(inst.amount || 0), cols[3] + 4, currentY + 5);
      doc.text(formatCurrency(inst.paidAmount || 0), cols[4] + 4, currentY + 5);
      doc.text(formatCurrency(remaining), cols[5] + 4, currentY + 5);
      
      // Status with color
      let statusColor = darkGray;
      if (status === 'PAID' || status === 'COMPLETED') statusColor = successColor;
      else if (status === 'OVERDUE') statusColor = '#dc2626';
      else if (status === 'PARTIAL') statusColor = warningColor;
      
      doc.fillColor(statusColor);
      doc.fontSize(7).font('Helvetica-Bold').text(status, cols[6] + 4, currentY + 5);
      doc.fontSize(8).font('Helvetica');

      currentY += rowHeight;
    });

    // Table footer with totals
    if (currentY < pageHeight - 60) {
      currentY += 3;
      drawRect(tableLeft, currentY, contentWidth, rowHeight, '#e5e7eb');
      doc.fillColor(primaryColor);
      doc.fontSize(8).font('Helvetica-Bold');
      doc.text('TOTAL', cols[1] + 4, currentY + 5);
      
      const totalInstallments = data.installments.reduce((sum, i) => sum + (i.amount || 0), 0) + downPayment;
      
      doc.text(formatCurrency(totalInstallments), cols[3] + 4, currentY + 5);
      doc.text(formatCurrency(data.summary.paidAmount), cols[4] + 4, currentY + 5);
      doc.text(formatCurrency(data.summary.remainingAmount), cols[5] + 4, currentY + 5);
    }
  }

  // ============ FOOTER (on current page only) ============
  // Only add footer if there's content on the page
  const footerY = Math.max(currentY + 20, pageHeight - 40);
  
  if (footerY < pageHeight - 15) {
    doc.strokeColor('#d1d5db').lineWidth(0.5);
    doc.moveTo(pageMargin, footerY).lineTo(pageWidth - pageMargin, footerY).stroke();
    
    doc.fillColor('#9ca3af');
    doc.fontSize(7).font('Helvetica');
    doc.text('This is a computer-generated document. No signature required. | Real Estate Management System', pageMargin, footerY + 8, { align: 'center', width: contentWidth });
  }

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

export interface PropertyReportData {
  property: {
    name?: string;
    propertyCode?: string | null;
    manualUniqueId?: string | null;
    type?: string | null;
    status?: string | null;
    address?: string | null;
    location?: string | null;
    dealerName?: string | null;
    salePrice?: number | null;
    totalUnits?: number;
    occupied?: number;
    totalArea?: number | null;
    yearBuilt?: number | null;
    ownerName?: string | null;
    ownerPhone?: string | null;
  };
  financeSummary: {
    totalReceived: number;
    totalExpenses: number;
    pendingAmount: number;
    entryCount: number;
  };
  financeRecords: Array<{
    id: string;
    amount: number;
    category?: string | null;
    referenceType?: string | null;
    description?: string | null;
    date?: Date | string | null;
  }>;
  deals: Array<{
    id: string;
    title?: string | null;
    amount: number;
    received: number;
    pending: number;
    status?: string | null;
    stage?: string | null;
    dealerName?: string | null;
    clientName?: string | null;
    createdAt?: Date | string | null;
  }>;
  sales: Array<{
    id: string;
    saleValue?: number | null;
    saleDate?: Date | string | null;
    buyerName?: string | null;
    dealerName?: string | null;
    status?: string | null;
    profit?: number | null;
  }>;
  paymentPlans?: Array<{
    dealId: string;
    dealTitle?: string | null;
    clientName?: string | null;
    installments: Array<{
      installmentNumber: number;
      amount: number;
      dueDate: Date | string;
      paidAmount: number;
      status: string;
      paidDate?: Date | string | null;
      remainingBalance: number;
    }>;
  }>;
}

/**
 * Generate Property PDF Report
 * Keeps styling lightweight to match app's clean theme
 */
export function generatePropertyReportPDF(data: PropertyReportData, res: Response): void {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  const safeName = data.property.name?.replace(/\s+/g, '-').toLowerCase() || 'property';
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${safeName}-report-${new Date().toISOString().split('T')[0]}.pdf"`
  );

  doc.pipe(res);

  const formatCurrency = (amount?: number | null): string => {
    if (amount === undefined || amount === null || Number.isNaN(amount)) return 'Rs 0';
    return `Rs ${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (value?: string | Date | null): string => {
    if (!value) return 'N/A';
    const d = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Header
  doc.fontSize(20).font('Helvetica-Bold').text(data.property.name || 'Property Report', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica').text(`Generated on ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
  doc.moveDown(1);

  // Basic info
  doc.fontSize(14).font('Helvetica-Bold').text('Basic Information', { underline: true });
  doc.moveDown(0.4);
  doc.fontSize(10).font('Helvetica');
  doc.text(`System ID: ${data.property.propertyCode || 'N/A'}`);
  doc.text(`Manual ID: ${data.property.manualUniqueId || 'N/A'}`);
  doc.text(`Type: ${data.property.type || 'N/A'}`);
  doc.text(`Status: ${data.property.status || 'N/A'}`);
  doc.text(`Address: ${data.property.address || 'N/A'}`);
  if (data.property.location) doc.text(`Location: ${data.property.location}`);
  if (data.property.yearBuilt) doc.text(`Year Built: ${data.property.yearBuilt}`);
  if (data.property.totalArea) doc.text(`Total Area: ${data.property.totalArea.toLocaleString()} sq ft`);
  doc.moveDown(0.6);

  // Pricing & ownership
  doc.fontSize(14).font('Helvetica-Bold').text('Commercials & Ownership', { underline: true });
  doc.moveDown(0.4);
  doc.fontSize(10).font('Helvetica');
  doc.text(`Sales Price: ${formatCurrency(data.property.salePrice)}`);
  doc.text(`Dealer Assigned: ${data.property.dealerName || 'N/A'}`);
  doc.text(`Owner: ${data.property.ownerName || 'N/A'}`);
  doc.text(`Owner Contact: ${data.property.ownerPhone || 'N/A'}`);
  doc.text(
    `Units: ${data.property.occupied || 0} occupied of ${data.property.totalUnits ?? 0}`
  );
  doc.moveDown(0.6);

  // Finance summary
  doc.fontSize(14).font('Helvetica-Bold').text('Finance Summary', { underline: true });
  doc.moveDown(0.4);
  doc.fontSize(10).font('Helvetica');
  doc.text(`Total Received: ${formatCurrency(data.financeSummary.totalReceived)}`);
  doc.text(`Pending Amount: ${formatCurrency(data.financeSummary.pendingAmount)}`);
  doc.text(`Total Expenses: ${formatCurrency(data.financeSummary.totalExpenses)}`);
  doc.text(`Entries: ${data.financeSummary.entryCount}`);
  doc.moveDown(0.6);

  // Finance records table (compact)
  if (data.financeRecords && data.financeRecords.length > 0) {
    doc.fontSize(12).font('Helvetica-Bold').text('Finance Records (recent)', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica-Bold');
    const startY = doc.y;
    const col1 = 50;
    const col2 = col1 + 220;
    const col3 = col2 + 80;
    const col4 = col3 + 80;
    doc.text('Description', col1, startY);
    doc.text('Category', col2, startY);
    doc.text('Amount', col3, startY, { width: 80, align: 'right' });
    doc.text('Date', col4, startY, { width: 100 });
    doc.moveTo(col1, startY + 12).lineTo(550, startY + 12).stroke();
    doc.fontSize(9).font('Helvetica');
    let currentY = startY + 20;
    data.financeRecords.forEach((rec) => {
      if (currentY > 720) {
        doc.addPage();
        currentY = 50;
      }
      doc.text(rec.description || rec.referenceType || 'Entry', col1, currentY, { width: 200 });
      doc.text(rec.category || '-', col2, currentY);
      doc.text(formatCurrency(rec.amount), col3, currentY, { width: 80, align: 'right' });
      doc.text(formatDate(rec.date || undefined), col4, currentY, { width: 100 });
      currentY += 18;
    });
    doc.moveDown(1);
  }

  // Deals section
  doc.fontSize(12).font('Helvetica-Bold').text('Running Deals', { underline: true });
  doc.moveDown(0.3);
  if (!data.deals || data.deals.length === 0) {
    doc.fontSize(10).font('Helvetica').text('No active deals.');
  } else {
    doc.fontSize(9).font('Helvetica');
    data.deals.forEach((deal) => {
      doc.text(`${deal.title || 'Deal'} (${deal.status || 'open'})`);
      doc.text(`  Amount: ${formatCurrency(deal.amount)} | Received: ${formatCurrency(deal.received)} | Pending: ${formatCurrency(deal.pending)}`);
      doc.text(
        `  Client: ${deal.clientName || 'N/A'} | Dealer: ${deal.dealerName || 'N/A'} | Stage: ${deal.stage || 'N/A'} | Created: ${formatDate(deal.createdAt)}`
      );
      doc.moveDown(0.2);
    });
  }
  doc.moveDown(0.6);

  // Sales / booking details
  doc.fontSize(12).font('Helvetica-Bold').text('Purchase / Booking Details', { underline: true });
  doc.moveDown(0.3);
  if (!data.sales || data.sales.length === 0) {
    doc.fontSize(10).font('Helvetica').text('No sale/booking records found.');
  } else {
    doc.fontSize(9).font('Helvetica');
    data.sales.forEach((sale) => {
      doc.text(
        `Sale: ${formatCurrency(sale.saleValue)} | Buyer: ${sale.buyerName || 'N/A'} | Dealer: ${sale.dealerName || 'N/A'} | Status: ${sale.status || 'N/A'} | Date: ${formatDate(sale.saleDate)}`
      );
      if (sale.profit !== undefined && sale.profit !== null) {
        doc.text(`  Profit: ${formatCurrency(sale.profit)}`);
      }
      doc.moveDown(0.2);
    });
  }
  doc.moveDown(0.6);

  // Payment Plans section
  if (data.paymentPlans && data.paymentPlans.length > 0) {
    doc.fontSize(12).font('Helvetica-Bold').text('Payment Plans', { underline: true });
    doc.moveDown(0.3);
    
    data.paymentPlans.forEach((plan) => {
      if (doc.y > 700) {
        doc.addPage();
      }
      
      doc.fontSize(10).font('Helvetica-Bold').text(`${plan.dealTitle || 'Deal'} - ${plan.clientName || 'N/A'}`);
      doc.moveDown(0.2);
      
      // Table header
      const tableStartY = doc.y;
      const col1 = 50;
      const col2 = col1 + 50;
      const col3 = col2 + 100;
      const col4 = col3 + 100;
      const col5 = col4 + 100;
      const col6 = col5 + 100;
      
      doc.fontSize(8).font('Helvetica-Bold');
      doc.text('No.', col1, tableStartY);
      doc.text('Amount', col2, tableStartY);
      doc.text('Due Date', col3, tableStartY);
      doc.text('Paid', col4, tableStartY, { width: 80, align: 'right' });
      doc.text('Status', col5, tableStartY);
      doc.text('Balance', col6, tableStartY, { width: 80, align: 'right' });
      
      doc.moveTo(col1, tableStartY + 10).lineTo(550, tableStartY + 10).stroke();
      doc.fontSize(8).font('Helvetica');
      
      let currentY = tableStartY + 18;
      plan.installments.forEach((inst) => {
        if (currentY > 720) {
          doc.addPage();
          currentY = 50;
        }
        
        doc.text(inst.installmentNumber.toString(), col1, currentY);
        doc.text(formatCurrency(inst.amount), col2, currentY, { width: 90 });
        doc.text(formatDate(inst.dueDate), col3, currentY, { width: 90 });
        doc.text(formatCurrency(inst.paidAmount), col4, currentY, { width: 80, align: 'right' });
        doc.text(inst.status || 'Pending', col5, currentY, { width: 90 });
        doc.text(formatCurrency(inst.remainingBalance), col6, currentY, { width: 80, align: 'right' });
        
        currentY += 16;
      });
      
      doc.moveDown(0.4);
    });
  }

  // Footer
  const pageHeight = doc.page.height;
  const pageWidth = doc.page.width;
  doc.fontSize(8).font('Helvetica');
  doc.text(
    'Generated by REMS - Property Report',
    pageWidth / 2,
    pageHeight - 40,
    { align: 'center' }
  );

  doc.end();
}

