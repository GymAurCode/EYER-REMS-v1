"use client"

interface Invoice {
  invoiceNumber: string
  tenant: string | { name?: string; id?: string } | null
  property: string | { name?: string; address?: string; id?: string } | null
  amount: number
  dueDate: string
  issueDate: string
  status: string
}

export function generateInvoicePDF(invoice: Invoice) {
  // Create a simple HTML template for the invoice
  const invoiceHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        .header { text-align: center; margin-bottom: 40px; }
        .company-name { font-size: 24px; font-weight: bold; color: #2563eb; }
        .invoice-title { font-size: 20px; margin-top: 10px; }
        .info-section { margin: 30px 0; }
        .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
        .label { font-weight: bold; }
        .amount-section { margin-top: 40px; padding: 20px; background: #f3f4f6; border-radius: 8px; }
        .total { font-size: 24px; font-weight: bold; text-align: right; }
        .footer { margin-top: 60px; text-align: center; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">RealEstate ERP</div>
        <div class="invoice-title">INVOICE</div>
      </div>
      
      <div class="info-section">
        <div class="info-row">
          <span class="label">Invoice Number:</span>
          <span>${invoice.invoiceNumber}</span>
        </div>
        <div class="info-row">
          <span class="label">Issue Date:</span>
          <span>${new Date(invoice.issueDate).toLocaleDateString()}</span>
        </div>
        <div class="info-row">
          <span class="label">Due Date:</span>
          <span>${new Date(invoice.dueDate).toLocaleDateString()}</span>
        </div>
      </div>

      <div class="info-section">
        <div class="info-row">
          <span class="label">Bill To:</span>
          <span>${typeof invoice.tenant === 'object' && invoice.tenant ? invoice.tenant.name : invoice.tenant || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="label">Property:</span>
          <span>${typeof invoice.property === 'object' && invoice.property ? (invoice.property.name || invoice.property.address) : invoice.property || 'N/A'}</span>
        </div>
      </div>

      <div class="amount-section">
        <div class="info-row">
          <span class="label">Description:</span>
          <span>Monthly Rent</span>
        </div>
        <div class="total">
          Total: Rs ${invoice.amount.toLocaleString("en-IN")}
        </div>
      </div>

      <div class="footer">
        <p>Thank you for your business!</p>
        <p>RealEstate ERP | contact@realestate.com | (555) 123-4567</p>
      </div>
    </body>
    </html>
  `

  // Create a new window and print
  const printWindow = window.open("", "_blank")
  if (printWindow) {
    printWindow.document.write(invoiceHTML)
    printWindow.document.close()
    printWindow.focus()

    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print()
    }
  }
}
