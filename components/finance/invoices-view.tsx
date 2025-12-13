"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, FileText, Download, Send, Loader2 } from "lucide-react"
import { AddInvoiceDialog } from "./add-invoice-dialog"
import { generateInvoicePDF } from "./invoice-pdf-generator"
import { apiService } from "@/lib/api"

export function InvoicesView() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiService.invoices.getAll()
      let invoicesData: any[] = []
      if (Array.isArray((response as any)?.data?.data)) {
        invoicesData = (response as any).data.data as any[]
      } else if (Array.isArray((response as any)?.data)) {
        invoicesData = (response as any).data as any[]
      }
      setInvoices(invoicesData)
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch invoices")
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }

  const filteredInvoices = invoices.filter((invoice) =>
    invoice.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.tenant?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (typeof invoice.tenant === 'string' && invoice.tenant.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="space-y-4">
      {/* Search and Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      {/* Invoices Table */}
      <Card>
        <div className="overflow-x-auto">
          {/* Desktop Table */}
          <table className="w-full hidden md:table">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Invoice #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Property
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Issue Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-destructive">{error}</td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                      <p className="text-sm font-medium text-foreground mb-1">
                        {invoices.length === 0 ? "No invoices yet" : "No invoices match your search"}
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        {invoices.length === 0 
                          ? "Create invoices for tenants to track rent and other charges"
                          : "Try adjusting your search criteria"}
                      </p>
                      {invoices.length === 0 && (
                        <Button onClick={() => setShowAddDialog(true)} variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Your First Invoice
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium text-foreground">{invoice.invoiceNumber}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {typeof invoice.tenant === 'object' ? invoice.tenant?.name : invoice.tenant || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {typeof invoice.property === 'object' ? invoice.property?.name || invoice.property?.address : invoice.property || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground">
                      Rs {(invoice.totalAmount || invoice.amount || 0).toLocaleString("en-IN")}
                    </div>
                    {invoice.remainingAmount !== undefined && invoice.remainingAmount > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Remaining: Rs {invoice.remainingAmount.toLocaleString("en-IN")}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {new Date(invoice.issueDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge
                      variant={
                        invoice.status === "paid"
                          ? "default"
                          : invoice.status === "overdue"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {invoice.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => generateInvoicePDF(invoice)}
                        title="Download PDF"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Send Invoice">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
          {/* Mobile Card View */}
          <div className="md:hidden divide-y">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-destructive">{error}</div>
            ) : filteredInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <p className="text-sm font-medium text-foreground mb-1">
                  {invoices.length === 0 ? "No invoices yet" : "No invoices match your search"}
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  {invoices.length === 0 
                    ? "Create invoices for tenants to track rent and other charges"
                    : "Try adjusting your search criteria"}
                </p>
                {invoices.length === 0 && (
                  <Button onClick={() => setShowAddDialog(true)} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Invoice
                  </Button>
                )}
              </div>
            ) : (
              filteredInvoices.map((invoice) => (
                <div key={invoice.id} className="p-4 space-y-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 flex-shrink-0">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {typeof invoice.tenant === 'object' ? invoice.tenant?.name : invoice.tenant || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        invoice.status === "paid"
                          ? "default"
                          : invoice.status === "overdue"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {invoice.status}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Property:</span>
                      <span className="text-foreground truncate ml-2">
                        {typeof invoice.property === 'object' ? invoice.property?.name || invoice.property?.address : invoice.property || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-medium text-foreground">
                        Rs {(invoice.totalAmount || invoice.amount || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                    {invoice.remainingAmount !== undefined && invoice.remainingAmount > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Remaining:</span>
                        <span className="text-foreground">Rs {invoice.remainingAmount.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Issue: {new Date(invoice.issueDate).toLocaleDateString()}</span>
                      <span>Due: {new Date(invoice.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => generateInvoicePDF(invoice)}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1">
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      <AddInvoiceDialog open={showAddDialog} onOpenChange={setShowAddDialog} onSuccess={fetchInvoices} />
    </div>
  )
}
