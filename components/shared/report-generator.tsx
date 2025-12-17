"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { FileText, Download } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

interface ReportField {
  id: string
  label: string
  checked: boolean
}

interface ReportGeneratorProps {
  moduleName: string
  availableFields: string[]
  data?: any[] // Data to generate report from
  getData?: () => Promise<any[]> // Function to fetch data if not provided
}

export function ReportGenerator({ moduleName, availableFields, data, getData }: ReportGeneratorProps) {
  const [open, setOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState("pdf")
  const [fields, setFields] = useState<ReportField[]>(
    availableFields.map((field) => ({
      id: field.toLowerCase().replace(/\s+/g, "-"),
      label: field,
      checked: true,
    })),
  )
  const [generating, setGenerating] = useState(false)
  const { toast } = useToast()

  // Reset fields when dialog opens
  useEffect(() => {
    if (open) {
      setFields(
        availableFields.map((field) => ({
          id: field.toLowerCase().replace(/\s+/g, "-"),
          label: field,
          checked: true,
        })),
      )
    }
  }, [open, availableFields])

  const toggleField = (id: string) => {
    setFields((prev) => prev.map((field) => (field.id === id ? { ...field, checked: !field.checked } : field)))
  }

  const handleSelectAll = () => {
    const allChecked = fields.every((f) => f.checked)
    setFields((prev) => prev.map((field) => ({ ...field, checked: !allChecked })))
  }

  const handleGenerate = async () => {
    const selectedFields = fields.filter((f) => f.checked)
    
    if (selectedFields.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one field to include in the report",
        variant: "destructive",
      })
      return
    }

    try {
      setGenerating(true)
      
      // Get data if not provided
      let reportData = data
      if (!reportData && getData) {
        reportData = await getData()
      }
      
      if (!reportData || reportData.length === 0) {
        toast({
          title: "Error",
          description: "No data available to generate report",
          variant: "destructive",
        })
        return
      }

      // Generate report based on selected format and fields
      const fieldLabels = selectedFields.map((f) => f.label)
      
      if (exportFormat === "csv") {
        generateCSV(reportData, fieldLabels, moduleName)
      } else if (exportFormat === "excel") {
        generateExcel(reportData, fieldLabels, moduleName)
      } else if (exportFormat === "pdf") {
        generatePDF(reportData, fieldLabels, moduleName)
      }
      
      toast({
        title: "Success",
        description: `${exportFormat.toUpperCase()} report generated successfully`,
        variant: "default",
      })
      
      setOpen(false)
    } catch (err: any) {
      console.error("Failed to generate report:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to generate report",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  // Helper function to get field value from object
  const getFieldValue = (item: any, fieldLabel: string): string => {
    const formatCurrencyValue = (value: any) => {
      const numeric =
        typeof value === "number" ? value : typeof value === "string" ? Number.parseFloat(value) : NaN
      if (!Number.isFinite(numeric)) return "Rs 0"
      return `Rs ${numeric.toLocaleString("en-IN")}`
    }

    const formatPercentage = (value: any) => {
      const numeric =
        typeof value === "number" ? value : typeof value === "string" ? Number.parseFloat(value) : NaN
      if (!Number.isFinite(numeric)) return "-"
      return `${numeric}%`
    }

    const formatDateValue = (value: any) => {
      if (!value) return "-"
      const date = new Date(value)
      return Number.isNaN(date.valueOf()) ? "-" : date.toLocaleDateString()
    }

    const formatDateTimeValue = (value: any) => {
      if (!value) return "-"
      const date = new Date(value)
      return Number.isNaN(date.valueOf()) ? "-" : date.toLocaleString()
    }

    // Property fields
    if (fieldLabel === "Property Name") {
      return item.name || "-"
    }
    
    if (fieldLabel === "Address") {
      return item.address || "-"
    }
    
    if (fieldLabel === "Units") {
      const totalUnits = item.units || item._count?.units || 0
      return totalUnits.toString()
    }
    
    if (fieldLabel === "Occupancy Rate") {
      const totalUnits = item.units || item._count?.units || 0
      const occupied = item.occupied || 0
      if (totalUnits > 0) {
        return `${Math.round((occupied / totalUnits) * 100)}%`
      }
      return "0%"
    }
    
    if (fieldLabel === "Revenue") {
      if (typeof item.revenue === 'string') {
        return item.revenue
      }
      if (typeof item.revenue === 'number' && item.revenue > 0) {
        return `Rs ${item.revenue.toLocaleString("en-IN")}`
      }
      if (typeof item.revenue === 'string' && item.revenue.includes('Rs')) {
        return item.revenue
      }
      return "Rs 0"
    }

    // CRM - Leads
    if (fieldLabel === "Lead ID") {
      return item.id || "-"
    }

    if (fieldLabel === "Source") {
      return item.source || "-"
    }

    if (fieldLabel === "Assigned To") {
      return item.assignedTo || "-"
    }

    if (fieldLabel === "Created Date") {
      return formatDateValue(item.createdAt)
    }

    if (fieldLabel === "Last Contact") {
      return formatDateValue(item.lastContact || item.updatedAt)
    }

    // CRM - Clients
    if (fieldLabel === "Client ID") {
      return item.id || "-"
    }

    if (fieldLabel === "Company") {
      return item.company || "-"
    }

    if (fieldLabel === "Type") {
      return item.type || (item.company ? "Corporate" : "Individual")
    }

    if (fieldLabel === "Added On") {
      return formatDateValue(item.createdAt)
    }

    // CRM - Deals
    if (fieldLabel === "Deal ID") {
      return item.id || "-"
    }

    if (fieldLabel === "Title") {
      return item.title || "-"
    }

    if (fieldLabel === "Value") {
      return formatCurrencyValue(item.value)
    }

    if (fieldLabel === "Stage") {
      return item.stage || "-"
    }

    if (fieldLabel === "Client") {
      return item.client?.name || item.clientName || "-"
    }

    if (fieldLabel === "Dealer") {
      return item.dealer?.name || item.dealerName || "-"
    }

    if (fieldLabel === "Created On") {
      return formatDateValue(item.createdAt)
    }

    if (fieldLabel === "Updated On") {
      return formatDateValue(item.updatedAt)
    }

    // CRM - Dealers
    if (fieldLabel === "Dealer ID") {
      return item.id || "-"
    }

    if (fieldLabel === "Commission Rate") {
      return item.commissionRate != null ? formatPercentage(item.commissionRate) : "-"
    }

    if (fieldLabel === "Total Deals") {
      return item.totalDeals != null ? item.totalDeals.toString() : "-"
    }

    if (fieldLabel === "Total Deal Value") {
      return item.totalDealValue != null ? formatCurrencyValue(item.totalDealValue) : "Rs 0"
    }

    if (fieldLabel === "Joined On") {
      return formatDateValue(item.createdAt)
    }

    // CRM - Communications
    if (fieldLabel === "Communication ID") {
      return item.id || "-"
    }

    if (fieldLabel === "Contact") {
      return item.contactName || item.contact || item.client?.name || item.lead?.name || "-"
    }

    if (fieldLabel === "Client") {
      return item.client?.name || "-"
    }

    if (fieldLabel === "Lead") {
      return item.lead?.name || "-"
    }

    if (fieldLabel === "Agent") {
      return item.agent || "-"
    }

    if (fieldLabel === "Date") {
      return formatDateTimeValue(item.createdAt)
    }

    if (fieldLabel === "Notes") {
      return item.content || "-"
    }
    
    // Finance/Transaction fields
    if (fieldLabel === "Transaction ID") {
      return item.id || item.transactionId || "-"
    }
    
    if (fieldLabel === "Date") {
      if (item.date) {
        return new Date(item.date).toLocaleDateString()
      }
      return "-"
    }
    
    if (fieldLabel === "Type") {
      return item.type || "-"
    }
    
    if (fieldLabel === "Category") {
      return item.category || "-"
    }
    
    if (fieldLabel === "Amount") {
      if (item.amount !== undefined && item.amount !== null) {
        const amount = typeof item.amount === 'string' ? parseFloat(item.amount) : item.amount
        return `Rs ${amount.toLocaleString("en-IN")}`
      }
      return "Rs 0"
    }
    
    if (fieldLabel === "Description") {
      return item.description || item.note || "-"
    }
    
    if (fieldLabel === "Payment Method") {
      return item.paymentMethod || item.method || "-"
    }
    
    // HR/Employee fields
    if (fieldLabel === "Employee ID") {
      return item.employeeId || item.id || "-"
    }
    
    if (fieldLabel === "Name") {
      return item.name || item.employeeName || "-"
    }
    
    if (fieldLabel === "Department") {
      return item.department || "-"
    }
    
    if (fieldLabel === "Position") {
      return item.position || item.role || "-"
    }
    
    if (fieldLabel === "Salary") {
      if (item.salary !== undefined && item.salary !== null) {
        const salary = typeof item.salary === 'string' ? parseFloat(item.salary) : item.salary
        return `Rs ${salary.toLocaleString("en-IN")}`
      }
      return "Rs 0"
    }
    
    if (fieldLabel === "Join Date") {
      if (item.joinDate || item.joinedDate || item.createdAt) {
        const date = item.joinDate || item.joinedDate || item.createdAt
        return new Date(date).toLocaleDateString()
      }
      return "-"
    }
    
    if (fieldLabel === "Attendance") {
      return item.attendance || item.attendanceRate ? `${item.attendanceRate || item.attendance}%` : "-"
    }
    
    if (fieldLabel === "Leave Balance") {
      return item.leaveBalance?.toString() || item.leaveBalance || "-"
    }
    
    // Payroll fields
    if (fieldLabel === "Employee") {
      return item.employee || item.employeeName || "-"
    }
    
    if (fieldLabel === "Month") {
      if (item.month) {
        const date = new Date(item.month)
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      }
      return "-"
    }
    
    if (fieldLabel === "Base Salary") {
      if (item.baseSalary !== undefined && item.baseSalary !== null) {
        const salary = typeof item.baseSalary === 'string' ? parseFloat(item.baseSalary) : item.baseSalary
        return `Rs ${salary.toLocaleString("en-IN")}`
      }
      return "Rs 0"
    }
    
    if (fieldLabel === "Bonus") {
      if (item.bonus !== undefined && item.bonus !== null) {
        const bonus = typeof item.bonus === 'string' ? parseFloat(item.bonus) : item.bonus
        return `Rs ${bonus.toLocaleString("en-IN")}`
      }
      return "Rs 0"
    }
    
    if (fieldLabel === "Deductions") {
      if (item.deductions !== undefined && item.deductions !== null) {
        const deductions = typeof item.deductions === 'string' ? parseFloat(item.deductions) : item.deductions
        return `Rs ${deductions.toLocaleString("en-IN")}`
      }
      return "Rs 0"
    }
    
    if (fieldLabel === "Net Pay") {
      if (item.netPay !== undefined && item.netPay !== null) {
        const netPay = typeof item.netPay === 'string' ? parseFloat(item.netPay) : item.netPay
        return `Rs ${netPay.toLocaleString("en-IN")}`
      }
      return "Rs 0"
    }
    
    if (fieldLabel === "Status") {
      return item.status || "-"
    }
    
    // Fallback: try to get value by field name
    const fieldKey = fieldLabel.toLowerCase().replace(/\s+/g, "")
    const camelCaseKey = fieldLabel.replace(/\s+(.)/g, (_, c) => c.toUpperCase()).replace(/\s/g, '')
    const pascalCaseKey = fieldLabel.replace(/\s+(.)/g, (_, c) => c.toUpperCase()).replace(/^./, c => c.toUpperCase()).replace(/\s/g, '')
    
    return item[fieldKey]?.toString() || 
           item[camelCaseKey]?.toString() || 
           item[pascalCaseKey]?.toString() || 
           item[fieldLabel]?.toString() || 
           "-"
  }

  // Generate CSV report
  const generateCSV = (data: any[], fieldLabels: string[], moduleName: string) => {
    // Create CSV header
    const headers = fieldLabels.join(",")
    
    // Create CSV rows
    const rows = data.map((item) => {
      return fieldLabels.map((field) => {
        const value = getFieldValue(item, field)
        // Escape commas and quotes in CSV
        if (value.includes(",") || value.includes('"') || value.includes("\n")) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(",")
    })
    
    // Combine header and rows
    const csvContent = [headers, ...rows].join("\n")
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `${moduleName}_Report_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Helper to check if a field should be right-aligned (numeric/currency)
  const isNumericField = (fieldLabel: string): boolean => {
    const numericFields = [
      'Amount', 'Value', 'Salary', 'Base Salary', 'Bonus', 'Deductions', 'Net Pay',
      'Revenue', 'Expenses', 'Total', 'Balance', 'Price', 'Cost', 'Rate', 'Paid',
      'Outstanding', 'Dues', 'Commission', 'Commission Rate', 'Units', 'Total Deals',
      'Total Deal Value', 'Occupancy Rate', 'Attendance', 'Leave Balance', 'Count',
      'Quantity', 'Tax', 'Discount', 'Subtotal', 'Grand Total', 'Debit', 'Credit',
      'Running Balance', 'Remaining', 'Paid Amount', 'Due Amount'
    ]
    return numericFields.some(nf => fieldLabel.toLowerCase().includes(nf.toLowerCase()))
  }

  // Helper to check if a field is a date field
  const isDateField = (fieldLabel: string): boolean => {
    const dateFields = ['Date', 'Created', 'Updated', 'Join', 'Added', 'Last Contact', 'Due Date', 'Start', 'End']
    return dateFields.some(df => fieldLabel.toLowerCase().includes(df.toLowerCase()))
  }

  // Generate Excel report (using HTML table that Excel can open)
  const generateExcel = (data: any[], fieldLabels: string[], moduleName: string) => {
    // Create HTML table with proper formatting
    let html = `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            table { border-collapse: collapse; width: 100%; }
            th { background-color: #2563eb; color: white; padding: 12px; font-weight: bold; }
            th.numeric { text-align: right; }
            th.date { text-align: center; }
            td { border: 1px solid #ddd; padding: 8px; }
            td.numeric { text-align: right; font-family: 'Courier New', monospace; }
            td.date { text-align: center; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            .totals-row { font-weight: bold; background-color: #e5e7eb !important; }
            .totals-row td { border-top: 2px solid #2563eb; }
          </style>
        </head>
        <body>
          <h2>${moduleName} Report</h2>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                ${fieldLabels.map((field) => {
                  const alignClass = isNumericField(field) ? 'numeric' : isDateField(field) ? 'date' : ''
                  return `<th class="${alignClass}">${field}</th>`
                }).join("")}
              </tr>
            </thead>
            <tbody>
              ${data.map((item) => `
                <tr>
                  ${fieldLabels.map((field) => {
                    const alignClass = isNumericField(field) ? 'numeric' : isDateField(field) ? 'date' : ''
                    return `<td class="${alignClass}">${getFieldValue(item, field)}</td>`
                  }).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
        </body>
      </html>
    `
    
    // Create blob and download
    const blob = new Blob([html], { type: "application/vnd.ms-excel" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `${moduleName}_Report_${new Date().toISOString().split('T')[0]}.xls`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Generate PDF report (using HTML that can be printed as PDF)
  const generatePDF = (data: any[], fieldLabels: string[], moduleName: string) => {
    // Create HTML for PDF with proper formatting
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${moduleName} Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
            h1 { color: #2563eb; text-align: center; margin-bottom: 10px; }
            .report-info { text-align: center; color: #666; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #2563eb; color: white; padding: 10px 8px; font-weight: bold; font-size: 11px; }
            th.numeric { text-align: right; }
            th.date { text-align: center; }
            td { border: 1px solid #ddd; padding: 8px; font-size: 11px; }
            td.numeric { text-align: right; font-family: 'Courier New', Courier, monospace; }
            td.date { text-align: center; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .totals-row { font-weight: bold; background-color: #e5e7eb !important; }
            .totals-row td { border-top: 2px solid #2563eb; }
            .currency { white-space: nowrap; }
            @media print {
              body { padding: 10px; }
              .no-print { display: none; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              thead { display: table-header-group; }
            }
          </style>
        </head>
        <body>
          <h1>${moduleName} Report</h1>
          <div class="report-info">
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>Total Records: ${data.length}</p>
          </div>
          <table>
            <thead>
              <tr>
                ${fieldLabels.map((field) => {
                  const alignClass = isNumericField(field) ? 'numeric' : isDateField(field) ? 'date' : ''
                  return `<th class="${alignClass}">${field}</th>`
                }).join("")}
              </tr>
            </thead>
            <tbody>
              ${data.map((item) => `
                <tr>
                  ${fieldLabels.map((field) => {
                    const alignClass = isNumericField(field) ? 'numeric currency' : isDateField(field) ? 'date' : ''
                    return `<td class="${alignClass}">${getFieldValue(item, field)}</td>`
                  }).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
        </body>
      </html>
    `
    
    // Open in new window and print
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      
      // Wait a bit then trigger print dialog
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Generate Report
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[800px] max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate {moduleName} Report</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Format */}
          <div>
            <Label className="text-base font-semibold">Export Format</Label>
            <div className="mt-3 grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setExportFormat("pdf")}
                className={`flex flex-col items-center justify-center rounded-md border-2 p-4 transition-all cursor-pointer ${
                  exportFormat === "pdf"
                    ? "border-primary bg-primary/5"
                    : "border-muted bg-popover hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <FileText className="mb-2 h-6 w-6" />
                <span className="text-sm font-medium">PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setExportFormat("excel")}
                className={`flex flex-col items-center justify-center rounded-md border-2 p-4 transition-all cursor-pointer ${
                  exportFormat === "excel"
                    ? "border-primary bg-primary/5"
                    : "border-muted bg-popover hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <FileText className="mb-2 h-6 w-6" />
                <span className="text-sm font-medium">Excel</span>
              </button>
              <button
                type="button"
                onClick={() => setExportFormat("csv")}
                className={`flex flex-col items-center justify-center rounded-md border-2 p-4 transition-all cursor-pointer ${
                  exportFormat === "csv"
                    ? "border-primary bg-primary/5"
                    : "border-muted bg-popover hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <FileText className="mb-2 h-6 w-6" />
                <span className="text-sm font-medium">CSV</span>
              </button>
            </div>
          </div>

          {/* Field Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">Select Fields to Include</Label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-sm text-primary hover:underline cursor-pointer"
              >
                Select All
              </button>
            </div>
            <Card className="p-4 max-h-64 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                {fields.map((field) => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={field.id} 
                      checked={field.checked} 
                      onCheckedChange={() => toggleField(field.id)} 
                    />
                    <Label 
                      htmlFor={field.id} 
                      className="text-sm font-normal cursor-pointer flex-1"
                      onClick={() => toggleField(field.id)}
                    >
                      {field.label}
                    </Label>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={generating}>
              <Download className="h-4 w-4 mr-2" />
              {generating ? "Generating..." : "Generate Report"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
