"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { apiService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Plus as PlusIcon } from "lucide-react"

interface AddTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

type AttachmentMeta = {
  name?: string
  url?: string
  mimeType?: string
  size?: number
}

const paymentMethods = [
  { label: "Cash", value: "cash" },
  { label: "Bank", value: "bank" },
  { label: "Online", value: "online" },
]

const generateCode = (prefix: string) => {
  const now = new Date()
  const part = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
  const random = Math.floor(100 + Math.random() * 900)
  return `${prefix}-${part}-${random}`
}

export function AddTransactionDialog({ open, onOpenChange, onSuccess }: AddTransactionDialogProps) {
  const { toast } = useToast()
  const [transactionCode, setTransactionCode] = useState(generateCode("TX"))
  const [loading, setLoading] = useState({
    accounts: false,
    categories: false,
    tenants: false,
    dealers: false,
    properties: false,
    invoices: false,
    attachments: false,
  })
  const [accounts, setAccounts] = useState<any[]>([]) // Only used for category creation dialog
  const [categories, setCategories] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [dealers, setDealers] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [formData, setFormData] = useState({
    transactionType: "income",
    transactionCategoryId: "",
    paymentMethod: "cash",
    amount: "",
    taxAmount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    tenantId: "",
    dealerId: "",
    propertyId: "",
    invoiceId: "", // Optional invoice selection
    attachments: [] as AttachmentMeta[],
  })
  const [submitting, setSubmitting] = useState(false)
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    description: "",
    defaultDebitAccountId: "",
    defaultCreditAccountId: "",
  })
  const [creatingCategory, setCreatingCategory] = useState(false)

  useEffect(() => {
    if (open) {
      setTransactionCode(generateCode("TX"))
      fetchInitialData()
    } else {
      resetForm()
    }
  }, [open])

  const fetchInitialData = async () => {
    await Promise.all([fetchAccounts(), fetchCategories(), fetchTenants(), fetchDealers(), fetchProperties(), fetchInvoices()])
  }

  // Fetch accounts only for category creation dialog (for default debit/credit accounts)
  const fetchAccounts = async () => {
    try {
      setLoading((prev) => ({ ...prev, accounts: true }))
      const response: any = await apiService.accounts.getAll()
      const responseData = response.data as any
      const accountsData = Array.isArray(responseData) ? responseData : Array.isArray(responseData?.data) ? responseData.data : []
      setAccounts(accountsData)
    } catch {
      setAccounts([])
    } finally {
      setLoading((prev) => ({ ...prev, accounts: false }))
    }
  }

  const fetchCategories = async () => {
    try {
      setLoading((prev) => ({ ...prev, categories: true }))
      const response: any = await apiService.transactionCategories.getAll()
      setCategories(Array.isArray(response?.data) ? response.data : [])
    } catch {
      setCategories([])
    } finally {
      setLoading((prev) => ({ ...prev, categories: false }))
    }
  }

  const handleCreateCategory = async () => {
    if (!categoryFormData.name.trim()) {
      toast({ title: "Category name is required", variant: "destructive" })
      return
    }

    setCreatingCategory(true)
    try {
      const newCategory = await apiService.transactionCategories.create({
        name: categoryFormData.name.trim(),
        type: formData.transactionType,
        description: categoryFormData.description.trim() || null,
        defaultDebitAccountId: categoryFormData.defaultDebitAccountId || null,
        defaultCreditAccountId: categoryFormData.defaultCreditAccountId || null,
      })

      const categoryResponse: any = newCategory?.data || newCategory
      
      // Refresh categories list
      await fetchCategories()
      
      // Select the newly created category
      if (categoryResponse && categoryResponse.id) {
        setFormData((prev) => ({ ...prev, transactionCategoryId: categoryResponse.id }))
      }

      // Reset category form and close dialog
      setCategoryFormData({
        name: "",
        description: "",
        defaultDebitAccountId: "",
        defaultCreditAccountId: "",
      })
      setShowCategoryDialog(false)
      
      toast({ title: "Category created successfully" })
    } catch (error: any) {
      const message = error?.response?.data?.error || "Failed to create category"
      toast({ title: message, variant: "destructive" })
    } finally {
      setCreatingCategory(false)
    }
  }

  const fetchTenants = async () => {
    try {
      setLoading((prev) => ({ ...prev, tenants: true }))
      const response: any = await apiService.tenants.getAll()
      const responseData = response.data as any
      const tenantsData = Array.isArray(responseData?.data) ? responseData.data : Array.isArray(responseData) ? responseData : []
      setTenants(
        Array.isArray(tenantsData) ? tenantsData.sort((a, b) => (a.name || "").localeCompare(b.name || "")) : []
      )
    } catch {
      setTenants([])
    } finally {
      setLoading((prev) => ({ ...prev, tenants: false }))
    }
  }

  const fetchDealers = async () => {
    try {
      setLoading((prev) => ({ ...prev, dealers: true }))
      const response: any = await apiService.dealers.getAll()
      const responseData = response.data as any
      const dealersData = Array.isArray(responseData?.data) ? responseData.data : Array.isArray(responseData) ? responseData : []
      setDealers(
        Array.isArray(dealersData) ? dealersData.sort((a, b) => (a.name || "").localeCompare(b.name || "")) : []
      )
    } catch {
      setDealers([])
    } finally {
      setLoading((prev) => ({ ...prev, dealers: false }))
    }
  }

  const fetchProperties = async () => {
    try {
      setLoading((prev) => ({ ...prev, properties: true }))
      const response: any = await apiService.properties.getAll()
      const responseData = response.data as any
      const propertiesData = Array.isArray(responseData?.data) ? responseData.data : Array.isArray(responseData) ? responseData : []
      setProperties(
        Array.isArray(propertiesData) ? propertiesData.sort((a, b) => (a.name || "").localeCompare(b.name || "")) : []
      )
    } catch {
      setProperties([])
    } finally {
      setLoading((prev) => ({ ...prev, properties: false }))
    }
  }

  const fetchInvoices = async () => {
    try {
      setLoading((prev) => ({ ...prev, invoices: true }))
      const response: any = await apiService.invoices.getAll()
      const responseData = response.data as any
      const invoicesData = Array.isArray(responseData?.data) ? responseData.data : Array.isArray(responseData) ? responseData : []
      // Filter only outstanding invoices (unpaid, partial, overdue)
      const outstandingInvoices = Array.isArray(invoicesData)
        ? invoicesData.filter(
            (inv: any) =>
              inv.status &&
              ["unpaid", "partial", "overdue"].includes(inv.status.toLowerCase())
          )
        : []
      setInvoices(outstandingInvoices)
    } catch {
      setInvoices([])
    } finally {
      setLoading((prev) => ({ ...prev, invoices: false }))
    }
  }

  const resetForm = () => {
    setFormData({
      transactionType: "income",
      transactionCategoryId: "",
      paymentMethod: "cash",
      amount: "",
      taxAmount: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
      tenantId: "",
      dealerId: "",
      propertyId: "",
      invoiceId: "",
      attachments: [],
    })
    setSubmitting(false)
  }

  // Auto-fill form when invoice is selected
  useEffect(() => {
    if (formData.invoiceId) {
      const selectedInvoice = invoices.find((inv) => inv.id === formData.invoiceId)
      if (selectedInvoice) {
        // Auto-fill amount (remaining amount or total amount)
        const invoiceAmount = selectedInvoice.remainingAmount || selectedInvoice.totalAmount || selectedInvoice.amount || 0
        if (!formData.amount || formData.amount === "0") {
          setFormData((prev) => ({ ...prev, amount: invoiceAmount.toString() }))
        }

        // Auto-fill tenant
        if (selectedInvoice.tenantId && !formData.tenantId) {
          setFormData((prev) => ({ ...prev, tenantId: selectedInvoice.tenantId }))
        }

        // Auto-fill property
        if (selectedInvoice.propertyId && !formData.propertyId) {
          setFormData((prev) => ({ ...prev, propertyId: selectedInvoice.propertyId }))
        }

        // Auto-fill description
        if (!formData.description) {
          const invoiceDesc = `Payment for Invoice ${selectedInvoice.invoiceNumber || selectedInvoice.id}`
          setFormData((prev) => ({ ...prev, description: invoiceDesc }))
        }
      }
    }
  }, [formData.invoiceId, invoices])

  // Account selection removed - transactions now only store essential data
  // Accounting entries are handled automatically by the backend based on transaction type and category

  const handleAttachmentUpload = async (files: FileList | null) => {
    if (!files || !files.length) return
    setLoading((prev) => ({ ...prev, attachments: true }))
    try {
      const uploads: AttachmentMeta[] = []
      for (const file of Array.from(files)) {
        // Validate file type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
        if (!allowedTypes.includes(file.type.toLowerCase())) {
          toast({ 
            title: "Invalid file type", 
            description: "Only PDF, JPG, and PNG files are allowed",
            variant: "destructive" 
          })
          continue
        }

        const base64 = await toBase64(file)
        // Use finance attachment endpoint
        const response: any = await apiService.finance.uploadAttachment({ 
          file: base64, 
          filename: file.name 
        })
        const responseData = response.data as any
        const uploaded = responseData?.data || responseData
        uploads.push({
          name: file.name,
          url: uploaded?.url || uploaded?.filename,
          mimeType: file.type,
          size: file.size,
        })
      }
      setFormData((prev) => ({ ...prev, attachments: [...prev.attachments, ...uploads] }))
      toast({ title: "Attachments uploaded successfully" })
    } catch (error: any) {
      toast({ 
        title: "Failed to upload attachment", 
        description: error.message || "Upload failed",
        variant: "destructive" 
      })
    } finally {
      setLoading((prev) => ({ ...prev, attachments: false }))
    }
  }

  const removeAttachment = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, idx) => idx !== index),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation: Required fields
    if (!formData.transactionCategoryId) {
      toast({ title: "Please select a category", variant: "destructive" })
      return
    }
    
    // Validation: Amount
    const amount = Number(formData.amount || 0)
    if (!amount || amount <= 0) {
      toast({ title: "Amount must be greater than zero", variant: "destructive" })
      return
    }
    
    // Validation: Date (cannot be future for completed transactions)
    const transactionDate = new Date(formData.date)
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    if (transactionDate > today) {
      toast({ title: "Transaction date cannot be in the future", variant: "destructive" })
      return
    }
    
    // Validation: Description/Narration
    if (!formData.description || formData.description.trim().length === 0) {
      toast({ title: "Please provide a description", variant: "destructive" })
      return
    }
    
    setSubmitting(true)
    try {
      // Transaction creation - only essential data
      // Account selection and accounting entries are handled automatically by the backend
      // Status: For income transactions linked to invoices, set as "pending" until payment is recorded
      // For other transactions, status defaults to "completed" in the backend
      const transactionStatus = formData.invoiceId && formData.transactionType === "income" 
        ? "pending" 
        : undefined // Let backend set default to "completed"
      
      await apiService.transactions.create({
        transactionCode,
        transactionType: formData.transactionType,
        transactionCategoryId: formData.transactionCategoryId || null,
        paymentMethod: formData.paymentMethod,
        amount: Number(formData.amount || 0),
        taxAmount: Number(formData.taxAmount || 0),
        date: new Date(formData.date).toISOString(),
        description: formData.description || null,
        tenantId: formData.tenantId || null,
        dealerId: formData.dealerId || null,
        propertyId: formData.propertyId || null,
        invoiceId: formData.invoiceId || null, // Optional invoice link
        attachments: formData.attachments,
        ...(transactionStatus && { status: transactionStatus }),
      })
      toast({ title: "Transaction recorded" })
      onSuccess?.()
      onOpenChange(false)
      resetForm()
      setTransactionCode(generateCode("TX"))
    } catch (error: any) {
      const message = error?.response?.data?.error || "Failed to add transaction"
      toast({ title: message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-[90vw] md:w-[800px] max-w-[95vw] sm:max-w-[90vw] md:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Transaction</DialogTitle>
          <DialogDescription>Capture a balanced income or expense transaction with full audit detail.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Transaction Code</Label>
              <Input value={transactionCode} disabled />
            </div>
            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <Select
                value={formData.transactionType}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, transactionType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, paymentMethod: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Category</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowCategoryDialog(true)
                  }}
                >
                  <PlusIcon className="h-3 w-3 mr-1" />
                  Add Category
                </Button>
              </div>
              <Select
                value={formData.transactionCategoryId}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, transactionCategoryId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loading.categories ? "Loading..." : "Select category"} />
                </SelectTrigger>
                <SelectContent>
                  {categories.length === 0 ? (
                    <SelectItem value="none" disabled>
                      {loading.categories ? "Loading..." : "No categories"}
                    </SelectItem>
                  ) : (
                    categories
                      .filter((cat) => cat.type?.toLowerCase() === formData.transactionType)
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Invoice Selection - Only for Income transactions */}
          {formData.transactionType === "income" && (
            <div className="space-y-2">
              <Label>Select Invoice (Optional)</Label>
              <Select
                value={formData.invoiceId || "none"}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, invoiceId: value === "none" ? "" : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={loading.invoices ? "Loading..." : "Select invoice to mark as paid"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No invoice</SelectItem>
                  {invoices.map((invoice) => {
                    const invoiceNumber = invoice.invoiceNumber || invoice.id
                    const remaining = invoice.remainingAmount || invoice.totalAmount || invoice.amount || 0
                    const tenantName = typeof invoice.tenant === "string" 
                      ? invoice.tenant 
                      : invoice.tenant?.name || invoice.tenantName || "Unknown"
                    return (
                      <SelectItem key={invoice.id} value={invoice.id}>
                        {invoiceNumber} - {tenantName} - Rs {remaining.toLocaleString()} ({invoice.status})
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Linking a transaction to an invoice records the accounting entry. The invoice remains outstanding until payment is recorded.
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tax Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.taxAmount}
                onChange={(e) => setFormData((prev) => ({ ...prev, taxAmount: e.target.value }))}
              />
            </div>
          </div>

          {/* Account selection removed - transactions only store essential data */}
          {/* Accounting entries (debit/credit accounts) are handled automatically by the backend */}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Property (optional)</Label>
              <Select
                value={formData.propertyId || "none"}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, propertyId: value === "none" ? "" : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={loading.properties ? "Loading..." : "Select property"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name || property.title || property.propertyCode || property.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Assign to Tenant</Label>
              <Select
                value={formData.tenantId || "none"}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, tenantId: value === "none" ? "" : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={loading.tenants ? "Loading..." : "Select tenant"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name || tenant.fullName || tenant.email || tenant.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assign to Dealer</Label>
              <Select
                value={formData.dealerId || "none"}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, dealerId: value === "none" ? "" : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={loading.dealers ? "Loading..." : "Select dealer"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {dealers.map((dealer) => (
                    <SelectItem key={dealer.id} value={dealer.id}>
                      {dealer.name || dealer.company || dealer.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description / Memo</Label>
            <Textarea
              rows={3}
              placeholder="Provide transaction narration..."
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Attachments</Label>
            <Input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => handleAttachmentUpload(e.target.files)} />
            {loading.attachments && <p className="text-sm text-muted-foreground">Uploading attachments...</p>}
            {formData.attachments.length > 0 && (
              <ul className="space-y-1 text-sm">
                {formData.attachments.map((file, index) => (
                  <li key={`${file.url}-${index}`} className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                    <span className="truncate pr-2">{file.name || file.url}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeAttachment(index)}>
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Add Transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Add Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="w-[95vw] sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>
              Add a new {formData.transactionType} category for transactions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Category Name *</Label>
              <Input
                id="category-name"
                placeholder="e.g., Office Supplies, Rent Income"
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData((prev) => ({ ...prev, name: e.target.value }))}
                disabled={creatingCategory}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">Description (Optional)</Label>
              <Textarea
                id="category-description"
                placeholder="Brief description of this category"
                rows={3}
                value={categoryFormData.description}
                onChange={(e) => setCategoryFormData((prev) => ({ ...prev, description: e.target.value }))}
                disabled={creatingCategory}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <AccountSelect
                label="Default Debit Account (Optional)"
                value={categoryFormData.defaultDebitAccountId}
                onChange={(value) => setCategoryFormData((prev) => ({ ...prev, defaultDebitAccountId: value }))}
                accounts={accounts}
                placeholder="Select account"
              />
              <AccountSelect
                label="Default Credit Account (Optional)"
                value={categoryFormData.defaultCreditAccountId}
                onChange={(value) => setCategoryFormData((prev) => ({ ...prev, defaultCreditAccountId: value }))}
                accounts={accounts}
                placeholder="Select account"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCategoryDialog(false)
                setCategoryFormData({
                  name: "",
                  description: "",
                  defaultDebitAccountId: "",
                  defaultCreditAccountId: "",
                })
              }}
              disabled={creatingCategory}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleCreateCategory} disabled={creatingCategory || !categoryFormData.name.trim()}>
              {creatingCategory ? "Creating..." : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}

interface AccountSelectProps {
  label: string
  value: string
  accounts: any[]
  onChange: (value: string) => void
  placeholder?: string
}

function AccountSelect({ label, value, accounts, onChange, placeholder }: AccountSelectProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder || "Select account"} />
        </SelectTrigger>
        <SelectContent>
          {accounts.length === 0 ? (
            <SelectItem value="none" disabled>
              No accounts available
            </SelectItem>
          ) : (
            accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.code ? `${account.code} — ` : ""}
                {account.name}{" "}
                <span className={cn("text-xs text-muted-foreground", account.type && "ml-1")}>
                  {account.type ? `(${account.type})` : ""}
                </span>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  )
}

const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
