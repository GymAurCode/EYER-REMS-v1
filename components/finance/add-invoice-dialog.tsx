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
import { InvoiceToasts, showErrorToast } from "@/lib/toast-utils"

interface AddInvoiceDialogProps {
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

const lateFeeOptions = [
  { label: "None", value: "none" },
  { label: "Fixed Amount", value: "fixed" },
  { label: "Percentage", value: "percentage" },
]

const generateInvoiceNumber = () => {
  const now = new Date()
  const part = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
  const random = Math.floor(100 + Math.random() * 900)
  return `INV-${part}-${random}`
}

export function AddInvoiceDialog({ open, onOpenChange, onSuccess }: AddInvoiceDialogProps) {
  const [invoiceNumber, setInvoiceNumber] = useState(generateInvoiceNumber())
  const [tenants, setTenants] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState({ tenants: false, properties: false, accounts: false, attachments: false })
  const [formData, setFormData] = useState({
    tenantId: "",
    propertyId: "",
    amount: "",
    taxPercent: "0",
    discountAmount: "0",
    billingDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    lateFeeRule: "none",
    termsAndConditions: "",
    description: "",
    tenantAccountId: "",
    incomeAccountId: "",
    attachments: [] as AttachmentMeta[],
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setInvoiceNumber(generateInvoiceNumber())
      fetchData()
    } else {
      resetForm()
    }
  }, [open])

  const fetchData = async () => {
    await Promise.all([fetchTenants(), fetchProperties(), fetchAccounts()])
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

  const receivableAccounts = useMemo(
    () => accounts.filter((account) => {
      const accountType = (account.type || "").toLowerCase()
      return accountType === "asset" || accountType === "receivable"
    }),
    [accounts]
  )
  const revenueAccounts = useMemo(
    () => accounts.filter((account) => (account.type || "").toLowerCase() === "revenue"),
    [accounts]
  )

  useEffect(() => {
    if (!formData.tenantAccountId && receivableAccounts.length) {
      setFormData((prev) => ({ ...prev, tenantAccountId: receivableAccounts[0].id }))
    }
    if (!formData.incomeAccountId && revenueAccounts.length) {
      setFormData((prev) => ({ ...prev, incomeAccountId: revenueAccounts[0].id }))
    }
  }, [receivableAccounts, revenueAccounts, formData.tenantAccountId, formData.incomeAccountId])

  const resetForm = () =>
    setFormData({
      tenantId: "",
      propertyId: "",
      amount: "",
      taxPercent: "0",
      discountAmount: "0",
      billingDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      lateFeeRule: "none",
      termsAndConditions: "",
      description: "",
      tenantAccountId: "",
      incomeAccountId: "",
      attachments: [],
    })

  const totals = useMemo(() => {
    const base = Number(formData.amount || 0)
    const taxPct = Number(formData.taxPercent || 0)
    const discount = Number(formData.discountAmount || 0)
    const taxValue = Number(((base * taxPct) / 100).toFixed(2))
    const total = Number((base + taxValue - discount).toFixed(2))
    return {
      base,
      taxValue,
      total: total < 0 ? 0 : total,
    }
  }, [formData.amount, formData.taxPercent, formData.discountAmount])

  const handleAttachmentUpload = async (files: FileList | null) => {
    if (!files || !files.length) return
    setLoading((prev) => ({ ...prev, attachments: true }))
    try {
      const uploads: AttachmentMeta[] = []
      for (const file of Array.from(files)) {
        const base64 = await toBase64(file)
        const response: any = await apiService.upload.file({ file: base64, filename: file.name })
        const responseData = response.data as any
        const uploaded = responseData?.data || responseData
        uploads.push({
          name: file.name,
          url: uploaded?.url,
          mimeType: file.type,
          size: file.size,
        })
      }
      setFormData((prev) => ({ ...prev, attachments: [...prev.attachments, ...uploads] }))
    } catch {
      showErrorToast("Upload Failed", "Failed to upload attachment")
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
    setSubmitting(true)
    try {
      await apiService.invoices.create({
        invoiceNumber,
        tenantId: formData.tenantId || null,
        propertyId: formData.propertyId || null,
        amount: Number(formData.amount || 0),
        billingDate: new Date(formData.billingDate).toISOString(),
        dueDate: new Date(formData.dueDate).toISOString(),
        taxPercent: Number(formData.taxPercent || 0),
        discountAmount: Number(formData.discountAmount || 0),
        lateFeeRule: formData.lateFeeRule,
        termsAndConditions: formData.termsAndConditions || null,
        tenantAccountId: formData.tenantAccountId,
        incomeAccountId: formData.incomeAccountId,
        attachments: formData.attachments,
        description: formData.description || `Invoice ${invoiceNumber}`,
      })
      InvoiceToasts.created(invoiceNumber)
      onSuccess?.()
      onOpenChange(false)
      resetForm()
      setInvoiceNumber(generateInvoiceNumber())
    } catch (error: any) {
      const message = error?.response?.data?.error || "Failed to create invoice"
      InvoiceToasts.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-[90vw] md:w-[800px] max-w-[95vw] sm:max-w-[90vw] md:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>Build a complete tenant invoice with taxes, discounts, and payment terms.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Invoice Number</Label>
              <Input value={invoiceNumber} disabled />
            </div>
            <div className="space-y-2">
              <Label>Tenant</Label>
              <Select
                value={formData.tenantId || "none"}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, tenantId: value === "none" ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loading.tenants ? "Loading..." : "Select tenant"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select tenant</SelectItem>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name || tenant.fullName || tenant.email || tenant.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Property</Label>
              <Select
                value={formData.propertyId || "none"}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, propertyId: value === "none" ? "" : value }))}
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
            <div className="space-y-2">
              <Label>Billing Date</Label>
              <Input
                type="date"
                value={formData.billingDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, billingDate: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Base Amount</Label>
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
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Tax (%)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.taxPercent}
                onChange={(e) => setFormData((prev) => ({ ...prev, taxPercent: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Discount Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.discountAmount}
                onChange={(e) => setFormData((prev) => ({ ...prev, discountAmount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Late Fee Rule</Label>
              <Select
                value={formData.lateFeeRule}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, lateFeeRule: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {lateFeeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <AccountSelect
              label="Tenant Receivable Account"
              placeholder={loading.accounts ? "Loading..." : "Select receivable or asset account"}
              accounts={receivableAccounts}
              value={formData.tenantAccountId}
              onChange={(value) => setFormData((prev) => ({ ...prev, tenantAccountId: value }))}
            />
            <AccountSelect
              label="Income Account"
              placeholder={loading.accounts ? "Loading..." : "Select revenue account"}
              accounts={revenueAccounts}
              value={formData.incomeAccountId}
              onChange={(value) => setFormData((prev) => ({ ...prev, incomeAccountId: value }))}
            />
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Sub-total</span>
              <span>Rs {totals.base.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span>Rs {totals.taxValue.toFixed(2)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-base font-semibold">
              <span>Invoice Total</span>
              <span>Rs {totals.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Invoice Description</Label>
              <Textarea
                rows={3}
                placeholder="Describe what this invoice covers..."
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Terms & Conditions</Label>
              <Textarea
                rows={4}
                placeholder="Payment terms, penalties, or special conditions..."
                value={formData.termsAndConditions}
                onChange={(e) => setFormData((prev) => ({ ...prev, termsAndConditions: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Attachments</Label>
            <Input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => handleAttachmentUpload(e.target.files)} />
            {loading.attachments && <p className="text-sm text-muted-foreground">Uploading attachments...</p>}
            {formData.attachments.length > 0 && (
              <ul className="space-y-2 text-sm">
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
              {submitting ? "Saving..." : "Create Invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface AccountSelectProps {
  label: string
  placeholder?: string
  accounts: any[]
  value: string
  onChange: (value: string) => void
}

function AccountSelect({ label, placeholder, accounts, value, onChange }: AccountSelectProps) {
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
                {account.name} {account.type ? `(${account.type})` : ""}
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
