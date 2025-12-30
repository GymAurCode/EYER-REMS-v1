/**
 * PDF Generator Utility
 * Generates PDF reports for various entities
 */

import PDFDocument from 'pdfkit';
import { Response } from 'express';
import logger from './logger';
import fs from 'fs';
import path from 'path';

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
    downPaymentPaid?: number; // Down payment actually paid
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
 * Generate Payment Plan PDF - Clean professional report (matches property report style)
 */
export function generatePaymentPlanPDF(data: PaymentPlanPDFData, res: Response): void {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/7293d0cd-bbb9-40ce-87ee-9763b81d9a43',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdf-generator.ts:50',message:'PDF generator entry',data:{hasDeal:!!data.deal,hasSummary:!!data.summary,installmentsCount:data.installments?.length||0,headersSent:res.headersSent},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payment-plan-${data.deal.dealCode || 'report'}-${new Date().toISOString().split('T')[0]}.pdf"`
    );
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/7293d0cd-bbb9-40ce-87ee-9763b81d9a43',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdf-generator.ts:58',message:'After setting headers',data:{headersSent:res.headersSent},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    // Pipe PDF to response
    doc.pipe(res);

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const pageMargin = 50;
  
  // Footer function to add on all pages
  const addFooter = () => {
    const footerY = pageHeight - 30;
    doc.fontSize(8).font('Helvetica');
    doc.fillColor('#666666');
    doc.text(
      'This is a computer-generated document. No signature required. | Real Estate Management System',
      pageWidth / 2,
      footerY,
      { align: 'center' }
    );
  };

  // Add footer when page is added (for subsequent pages)
  doc.on('pageAdded', () => {
    addFooter();
  });

  // Helper function to format currency
  const formatCurrency = (amount: number): string => {
    try {
      const numAmount = Number(amount);
      if (isNaN(numAmount) || !isFinite(numAmount)) {
        return 'Rs 0';
      }
      return `Rs ${numAmount.toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`;
    } catch (error) {
      return 'Rs 0';
    }
  };

  // Helper function to format date
  const formatDate = (date: string | Date): string => {
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (!(d instanceof Date) || isNaN(d.getTime())) {
        return 'N/A';
      }
      return d.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      return 'N/A';
    }
  };

  // ============ HEADER SECTION ============
  doc.fontSize(20).font('Helvetica-Bold').text('Payment Plan Report', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica').text(`Generated on ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
  doc.moveDown(1);

  // ============ DEAL INFORMATION ============
  doc.fontSize(14).font('Helvetica-Bold').text('Deal Information', { underline: true });
  doc.moveDown(0.4);
  doc.fontSize(10).font('Helvetica');
  doc.text(`Deal Code: ${data.deal.dealCode || 'N/A'}`);
  doc.text(`Title: ${data.deal.title}`);
  doc.text(`Deal Amount: ${formatCurrency(data.deal.dealAmount)}`);
  
  if (data.deal.property) {
    doc.text(`Property: ${data.deal.property.name || 'N/A'}`);
    if (data.deal.property.propertyCode) doc.text(`Property Code: ${data.deal.property.propertyCode}`);
  }
  
  if (data.deal.dealer) {
    doc.text(`Dealer: ${data.deal.dealer.name || 'N/A'}`);
  }
  
  if (data.deal.client) {
    doc.text(`Client: ${data.deal.client.name || 'N/A'}`);
    if (data.deal.client.phone) doc.text(`Phone: ${data.deal.client.phone}`);
    if (data.deal.client.email) doc.text(`Email: ${data.deal.client.email}`);
  }
  
  doc.moveDown(0.6);

  // ============ PAYMENT SUMMARY ============
  doc.fontSize(14).font('Helvetica-Bold').text('Payment Summary', { underline: true });
  doc.moveDown(0.4);
  doc.fontSize(10).font('Helvetica');
  const downPayment = data.summary.downPayment || 0;
  doc.text(`Total Amount: ${formatCurrency(data.summary.totalAmount)}`);
  if (downPayment > 0) {
    doc.text(`Down Payment: ${formatCurrency(downPayment)}`);
  }
  doc.text(`Paid Amount: ${formatCurrency(data.summary.paidAmount)}`);
  doc.text(`Remaining Amount: ${formatCurrency(data.summary.remainingAmount)}`);
  doc.text(`Status: ${data.summary.status || 'Pending'}`);
  doc.moveDown(0.6);

  // ============ INSTALLMENT SCHEDULE ============
  if (data.installments && data.installments.length > 0) {
    doc.fontSize(14).font('Helvetica-Bold').text('Installment Schedule', { underline: true });
    doc.moveDown(0.3);
    
    // Table header
    const tableStartY = doc.y;
    const col1 = 50;
    const col2 = col1 + 50;
    const col3 = col2 + 100;
    const col4 = col3 + 100;
    const col5 = col4 + 100;
    const col6 = col5 + 100;
    
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('No.', col1, tableStartY);
    doc.text('Due Date', col2, tableStartY);
    doc.text('Amount', col3, tableStartY, { width: 90, align: 'right' });
    doc.text('Paid', col4, tableStartY, { width: 90, align: 'right' });
    doc.text('Balance', col5, tableStartY, { width: 90, align: 'right' });
    doc.text('Status', col6, tableStartY);
    
    doc.moveTo(col1, tableStartY + 12).lineTo(550, tableStartY + 12).stroke();
    doc.fontSize(9).font('Helvetica');
    
    let currentY = tableStartY + 20;
    const rowHeight = 16;
    
    // Down Payment row
    if (downPayment > 0) {
      if (currentY > 720) {
        doc.addPage();
        currentY = 50;
      }
      
      const dpStatus = data.summary.downPaymentPaid && data.summary.downPaymentPaid >= downPayment ? 'Paid' : 'Pending';
      const dpPaid = data.summary.downPaymentPaid || 0;
      const dpRemaining = Math.max(0, downPayment - dpPaid);
      
      doc.fillColor('#000000');
      doc.text('DP', col1, currentY);
      doc.text('Down Payment', col2, currentY);
      doc.text(formatCurrency(downPayment), col3, currentY, { width: 90, align: 'right' });
      doc.text(formatCurrency(dpPaid), col4, currentY, { width: 90, align: 'right' });
      doc.text(formatCurrency(dpRemaining), col5, currentY, { width: 90, align: 'right' });
      doc.text(dpStatus, col6, currentY);
      
      currentY += rowHeight;
    }
    
    // Installments
    data.installments.forEach((inst) => {
      if (currentY > 720) {
        doc.addPage();
        currentY = 50;
      }
      
      const remaining = (inst.amount || 0) - (inst.paidAmount || 0);
      const status = (inst.status || 'pending').charAt(0).toUpperCase() + (inst.status || 'pending').slice(1).toLowerCase();
      
      doc.fillColor('#000000');
      doc.text((inst.installmentNumber || 0).toString(), col1, currentY);
      doc.text(formatDate(inst.dueDate || new Date()), col2, currentY);
      doc.text(formatCurrency(inst.amount || 0), col3, currentY, { width: 90, align: 'right' });
      doc.text(formatCurrency(inst.paidAmount || 0), col4, currentY, { width: 90, align: 'right' });
      doc.text(formatCurrency(remaining), col5, currentY, { width: 90, align: 'right' });
      doc.text(status, col6, currentY);
      
      currentY += rowHeight;
    });
    
    // Total row
    if (currentY < pageHeight - 80) {
      currentY += 5;
      doc.moveTo(col1, currentY).lineTo(550, currentY).stroke();
      currentY += 10;
      
      doc.fontSize(10).font('Helvetica-Bold');
      const totalInstallments = data.installments.reduce((sum, i) => sum + (i.amount || 0), 0) + downPayment;
      doc.text('TOTAL', col2, currentY);
      doc.text(formatCurrency(totalInstallments), col3, currentY, { width: 90, align: 'right' });
      doc.text(formatCurrency(data.summary.paidAmount), col4, currentY, { width: 90, align: 'right' });
      doc.text(formatCurrency(data.summary.remainingAmount), col5, currentY, { width: 90, align: 'right' });
    }
    
    doc.moveDown(0.6);
  }

  // Add footer to first page
  addFooter();

  // Finalize PDF
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/7293d0cd-bbb9-40ce-87ee-9763b81d9a43',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdf-generator.ts:241',message:'Before doc.end()',data:{headersSent:res.headersSent},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  doc.end();
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/7293d0cd-bbb9-40ce-87ee-9763b81d9a43',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdf-generator.ts:243',message:'After doc.end()',data:{headersSent:res.headersSent},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/7293d0cd-bbb9-40ce-87ee-9763b81d9a43',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdf-generator.ts:245',message:'PDF generator error',data:{errorMessage:error?.message,errorStack:error?.stack?.substring(0,500),errorName:error?.name,headersSent:res.headersSent},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate PDF',
      });
    } else {
      res.end();
    }
    throw error;
  }
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

export interface PropertiesReportData {
  properties: Array<{
    id: string;
    name?: string | null;
    propertyCode?: string | null;
    type?: string | null;
    address?: string | null;
    salePrice?: number | null;
    subsidiaryOption?: {
      id: string;
      name: string;
      propertySubsidiary?: {
        id: string;
        name: string;
        logoPath?: string | null;
      } | null;
    } | null;
  }>;
  generatedAt?: Date;
}

/**
 * Generate Properties PDF Report with Subsidiary Logo Watermarks
 * Each property's subsidiary logo is added as a watermark (opacity 0.05-0.1, center)
 */
export function generatePropertiesReportPDF(data: PropertiesReportData, res: Response): void {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="properties-report-${new Date().toISOString().split('T')[0]}.pdf"`
  );

  doc.pipe(res);

  const formatCurrency = (amount?: number | null): string => {
    if (amount === undefined || amount === null || Number.isNaN(amount)) return 'Rs 0';
    return `Rs ${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper function to add watermark logo (synchronous)
  const addWatermarkLogo = (logoPath: string | null | undefined, pageWidth: number, pageHeight: number) => {
    if (!logoPath) return;

    try {
      // Resolve logo file path
      let fullPath: string;
      if (logoPath.startsWith('/') || logoPath.startsWith('\\')) {
        // Absolute path
        fullPath = logoPath;
      } else if (logoPath.startsWith('uploads/') || logoPath.startsWith('public/')) {
        // Relative to project root
        fullPath = path.join(process.cwd(), logoPath);
      } else {
        // Try common upload locations
        fullPath = path.join(process.cwd(), 'public', 'uploads', 'logos', logoPath);
        // Also try without logos subdirectory
        if (!fs.existsSync(fullPath)) {
          fullPath = path.join(process.cwd(), 'public', 'uploads', logoPath);
        }
      }

      // Check if file exists
      if (!fs.existsSync(fullPath)) {
        logger.warn(`Logo file not found: ${fullPath}`);
        return;
      }

      // Read image file
      const imageBuffer = fs.readFileSync(fullPath);
      
      // Calculate center position
      const logoWidth = 200;
      const logoHeight = 200;
      const centerX = (pageWidth - logoWidth) / 2;
      const centerY = (pageHeight - logoHeight) / 2;

      // Save graphics state
      doc.save();

      // Set opacity (0.05 to 0.1 for watermark effect)
      doc.opacity(0.08);

      // Draw logo at center
      doc.image(imageBuffer, centerX, centerY, { 
        fit: [logoWidth, logoHeight]
      });

      // Restore graphics state
      doc.restore();
    } catch (error: any) {
      logger.warn(`Failed to add watermark logo: ${error.message}`);
      // Continue without watermark if logo fails to load
    }
  };

  // Header
  doc.fontSize(20).font('Helvetica-Bold').text('Properties Report', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica').text(`Generated on ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
  doc.moveDown(1);

  // Process each property
  for (let i = 0; i < data.properties.length; i++) {
    const property = data.properties[i];
    
    // Add new page for each property (except first)
    if (i > 0) {
      doc.addPage();
    }

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // Add watermark logo if available
    const logoPath = property.subsidiaryOption?.propertySubsidiary?.logoPath;
    if (logoPath) {
      addWatermarkLogo(logoPath, pageWidth, pageHeight);
    }

    // Property Information
    doc.fontSize(14).font('Helvetica-Bold').text('Property Information', { underline: true });
    doc.moveDown(0.4);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Name: ${property.name || 'N/A'}`);
    doc.text(`Property Code: ${property.propertyCode || 'N/A'}`);
    doc.text(`Type: ${property.type || 'N/A'}`);
    doc.text(`Address: ${property.address || 'N/A'}`);
    
    if (property.salePrice) {
      doc.text(`Sale Price: ${formatCurrency(property.salePrice)}`);
    }

    if (property.subsidiaryOption) {
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica-Bold').text('Subsidiary Information:');
      doc.fontSize(10).font('Helvetica');
      doc.text(`Subsidiary: ${property.subsidiaryOption.name}`);
      if (property.subsidiaryOption.propertySubsidiary) {
        doc.text(`Location: ${property.subsidiaryOption.propertySubsidiary.name}`);
      }
    }

    doc.moveDown(0.6);
  }

  // Footer
  const pageHeight = doc.page.height;
  const pageWidth = doc.page.width;
  doc.fontSize(8).font('Helvetica');
  doc.text(
    `Generated by REMS - Properties Report | Total Properties: ${data.properties.length}`,
    pageWidth / 2,
    pageHeight - 40,
    { align: 'center' }
  );

  doc.end();
}

