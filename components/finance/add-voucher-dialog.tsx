"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, X, FileText, Image as ImageIcon, Loader2, Plus, Trash2, AlertCircle } from "lucide-react"
import { apiService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { SearchableSelect } from "@/components/common/searchable-select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

interface AddVoucherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  voucherType?: "bank-payment" | "bank-receipt" | "cash-payment" | "cash-receipt"
  onSuccess?: () => void
}

interface VoucherLine {
  id: string
  accountId: string
  debit: number
  credit: number
  description: string
  propertyId?: string
  unitId?: string
}

export function AddVoucherDialog({ open, onOpenChange, voucherType = "bank-payment", onSuccess }: AddVoucherDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    paymentMethod: voucherType.includes("bank") ? "Cheque" : "Cash",
    accountId: "", // Primary account (bank/cash)
    description: "",
    referenceNumber: "",
    propertyId: "",
    unitId: "",
    payeeType: "",
    payeeId: "",
    dealId: "",
  })

  const [lines, setLines] = useState<VoucherLine[]>([
    { id: "1", accountId: "", debit: 0, credit: 0, description: "" },
  ])

  const [attachments, setAttachments] = useState<Array<{ id?: string; url: string; name: string; mimeType?: string }>>([])
  const [uploadingAttachments, setUploadingAttachments] = useState(false)

  // Determine voucher type code
  const voucherTypeCode = useMemo(() => {
    switch (voucherType) {
      case "bank-payment": return "BPV"
      case "bank-receipt": return "BRV"
      case "cash-payment": return "CPV"
      case "cash-receipt": return "CRV"
      default: return "BPV"
    }
  }, [voucherType])

  const isPayment = voucherType.includes("payment")
  const isReceipt = voucherType.includes("receipt")
  const isBank = voucherType.includes("bank")
  const isCash = voucherType.includes("cash")

  // Load accounts on mount
  useEffect(() => {
    if (open) {
      fetchAccounts()
    }
  }, [open])

  // Auto-setup initial lines based on voucher type
  useEffect(() => {
    if (open && lines.length === 1 && !lines[0].accountId) {
      setupInitialLines()
    }
  }, [open, voucherType])

  const fetchAccounts = async () => {
    try {
      setLoadingAccounts(true)
      const response = await apiService.accounts.getAll({ postable: "true" })
      const responseData = response.data as any
      const accountsData = Array.isArray(responseData?.data) ? responseData.data : Array.isArray(responseData) ? responseData : []
      setAccounts(accountsData.filter((acc: any) => acc.isPostable && acc.level === 5))
    } catch (error) {
      console.error("Failed to load accounts:", error)
      toast({
        title: "Failed to load accounts",
        description: "Please refresh and try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingAccounts(false)
    }
  }

  const setupInitialLines = async () => {
    // This will be called after accounts are loaded
    // Setup will happen when user selects primary account
  }

  // Get filtered accounts based on voucher type
  const getFilteredAccounts = (forLine: boolean = false) => {
    if (forLine) {
      // For line items, filter by voucher type rules
      if (isPayment) {
        // BPV/CPV: Expense or Liability accounts
        return accounts.filter((acc: any) => acc.type === "Expense" || acc.type === "Liability")
      } else {
        // BRV/CRV: Revenue, Asset (Receivable), or Liability (Advance)
        return accounts.filter((acc: any) => 
          acc.type === "Revenue" || 
          acc.type === "Asset" || 
          acc.type === "Liability"
        )
      }
    } else {
      // For primary account, filter by bank/cash
      if (isBank) {
        return accounts.filter((acc: any) => 
          acc.code?.startsWith("1112") || 
          acc.code?.startsWith("111201") || 
          acc.code?.startsWith("111202") ||
          acc.name?.toLowerCase().includes("bank")
        )
      } else {
        return accounts.filter((acc: any) => 
          acc.code?.startsWith("1111") || 
          acc.code?.startsWith("111101") || 
          acc.code?.startsWith("111102") ||
          acc.name?.toLowerCase().includes("cash")
        )
      }
    }
  }

  // Calculate totals
  const totals = useMemo(() => {
    const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0)
    const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0)
    return { debit: totalDebit, credit: totalCredit, balance: Math.abs(totalDebit - totalCredit) }
  }, [lines])

  // Validate balance
  const isBalanced = totals.balance < 0.01

  const addLine = () => {
    setLines([...lines, { id: Date.now().toString(), accountId: "", debit: 0, credit: 0, description: "" }])
  }

  const removeLine = (id: string) => {
    if (lines.length <= 1) {
      toast({
        title: "Cannot remove",
        description: "Voucher must have at least one line item",
        variant: "destructive",
      })
      return
    }
    setLines(lines.filter((line) => line.id !== id))
  }

  const updateLine = (id: string, field: keyof VoucherLine, value: any) => {
    setLines(lines.map((line) => (line.id === id ? { ...line, [field]: value } : line)))
  }

  // Auto-generate lines when primary account is selected
  const handlePrimaryAccountChange = (accountId: string) => {
    setFormData({ ...formData, accountId })
    
    // Auto-setup lines based on voucher type
    if (lines.length === 1 && !lines[0].accountId) {
      const newLines: VoucherLine[] = []
      
      if (isPayment) {
        // BPV/CPV: Credit primary account, Debit expense (user will add lines)
        newLines.push({
          id: "1",
          accountId: accountId,
          debit: 0,
          credit: 0,
          description: `${isBank ? "Bank" : "Cash"} Payment`,
        })
        // Add one expense line
        newLines.push({
          id: "2",
          accountId: "",
          debit: 0,
          credit: 0,
          description: "Expense",
        })
      } else {
        // BRV/CRV: Debit primary account, Credit income (user will add lines)
        newLines.push({
          id: "1",
          accountId: accountId,
          debit: 0,
          credit: 0,
          description: `${isBank ? "Bank" : "Cash"} Receipt`,
        })
        // Add one income line
        newLines.push({
          id: "2",
          accountId: "",
          debit: 0,
          credit: 0,
          description: "Income",
        })
      }
      
      setLines(newLines)
    }
  }

  const toBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !files.length) return

    setUploadingAttachments(true)
    try {
      const uploads: Array<{ id?: string; url: string; name: string; mimeType?: string }> = []
      
      for (const file of Array.from(files)) {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        if (!allowedTypes.includes(file.type.toLowerCase())) {
          toast({
            title: "Invalid file type",
            description: `File "${file.name}" is not supported. Only PDF, JPG, PNG, GIF, and WEBP files are allowed`,
            variant: "destructive",
          })
          continue
        }

        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: `File "${file.name}" exceeds 10MB limit`,
            variant: "destructive",
          })
          continue
        }

        const base64 = await toBase64(file)
        uploads.push({
          url: base64,
          name: file.name,
          mimeType: file.type,
        })
      }

      if (uploads.length > 0) {
        setAttachments((prev) => [...prev, ...uploads])
        toast({ title: `${uploads.length} file(s) uploaded successfully` })
      }
    } catch (error: any) {
      toast({
        title: "Failed to upload attachment",
        description: error?.response?.data?.error || error?.message || "Upload failed",
        variant: "destructive",
      })
    } finally {
      setUploadingAttachments(false)
      if (e.target) {
        e.target.value = ""
      }
    }
  }

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.accountId) {
      toast({
        title: "Primary account required",
        description: "Please select the primary bank/cash account",
        variant: "destructive",
      })
      return
    }

    if (lines.length === 0 || lines.some((line) => !line.accountId)) {
      toast({
        title: "All lines must have accounts",
        description: "Please select accounts for all line items",
        variant: "destructive",
      })
      return
    }

    if (!isBalanced) {
      toast({
        title: "Entries must balance",
        description: `Total Debit (${totals.debit.toFixed(2)}) must equal Total Credit (${totals.credit.toFixed(2)})`,
        variant: "destructive",
      })
      return
    }

    // Validate attachment requirement for bank/cash vouchers
    if (attachments.length === 0) {
      toast({
        title: "Attachments required",
        description: `${voucherTypeCode} requires at least one attachment (receipt, invoice, bank statement, etc.)`,
        variant: "destructive",
      })
      return
    }

    // Validate reference number for cheque/transfer
    if (isBank && ["Cheque", "Transfer"].includes(formData.paymentMethod) && !formData.referenceNumber) {
      toast({
        title: "Reference number required",
        description: `${formData.paymentMethod} ${voucherTypeCode} requires a reference number (cheque number/transaction ID)`,
        variant: "destructive",
      })
      return
    }

    // Validate payee for payment vouchers
    if (isPayment && !formData.payeeType) {
      toast({
        title: "Payee required",
        description: `${voucherTypeCode} requires a payee type (Vendor, Owner, Agent, Contractor, Tenant, Client, Dealer, or Employee)`,
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      // Prepare lines - separate primary account line from others
      const nonPrimaryLines = lines.filter((line) => line.accountId !== formData.accountId)
      const primaryLine = lines.find((line) => line.accountId === formData.accountId)
      
      // Calculate totals from non-primary lines
      const otherLinesDebit = nonPrimaryLines.reduce((sum, line) => sum + (line.debit || 0), 0)
      const otherLinesCredit = nonPrimaryLines.reduce((sum, line) => sum + (line.credit || 0), 0)
      
      // Prepare non-primary lines
      const preparedNonPrimaryLines = nonPrimaryLines.map((line) => ({
        accountId: line.accountId,
        debit: line.debit || 0,
        credit: line.credit || 0,
        description: line.description || formData.description,
        propertyId: line.propertyId || formData.propertyId || undefined,
        unitId: line.unitId || formData.unitId || undefined,
      }))
      
      // Prepare primary account line - auto-calculate based on voucher type
      let preparedPrimaryLine
      if (primaryLine) {
        // Primary account line exists, adjust it based on voucher type
        if (isPayment) {
          // Payment: Credit bank/cash, amount = total debit from expense lines
          preparedPrimaryLine = {
            accountId: formData.accountId,
            debit: 0,
            credit: otherLinesDebit,
            description: primaryLine.description || `${isBank ? "Bank" : "Cash"} Payment`,
          }
        } else {
          // Receipt: Debit bank/cash, amount = total credit from income lines
          preparedPrimaryLine = {
            accountId: formData.accountId,
            debit: otherLinesCredit,
            credit: 0,
            description: primaryLine.description || `${isBank ? "Bank" : "Cash"} Receipt`,
          }
        }
      } else {
        // Primary account line missing, add it
        if (isPayment) {
          preparedPrimaryLine = {
            accountId: formData.accountId,
            debit: 0,
            credit: otherLinesDebit,
            description: `${isBank ? "Bank" : "Cash"} Payment`,
          }
        } else {
          preparedPrimaryLine = {
            accountId: formData.accountId,
            debit: otherLinesCredit,
            credit: 0,
            description: `${isBank ? "Bank" : "Cash"} Receipt`,
          }
        }
      }
      
      // Combine all lines
      const preparedLines = [...preparedNonPrimaryLines, preparedPrimaryLine]

      // Verify final balance
      const finalDebit = preparedLines.reduce((sum, l) => sum + (l.debit || 0), 0)
      const finalCredit = preparedLines.reduce((sum, l) => sum + (l.credit || 0), 0)
      
      if (Math.abs(finalDebit - finalCredit) > 0.01) {
        toast({
          title: "Balance error",
          description: `Unable to balance entries. Debit: ${finalDebit.toFixed(2)}, Credit: ${finalCredit.toFixed(2)}`,
          variant: "destructive",
        })
        return
      }

      const voucherPayload = {
        type: voucherTypeCode,
        date: formData.date,
        paymentMethod: formData.paymentMethod,
        accountId: formData.accountId,
        description: formData.description,
        referenceNumber: formData.referenceNumber || undefined,
        propertyId: formData.propertyId || undefined,
        unitId: formData.unitId || undefined,
        payeeType: formData.payeeType || undefined,
        payeeId: formData.payeeId || undefined,
        dealId: formData.dealId || undefined,
        lines: preparedLines,
        attachments: attachments.map((a) => ({
          url: a.url,
          name: a.name,
          mimeType: a.mimeType,
        })),
      }

      await apiService.vouchers.create(voucherPayload)
      
      toast({ title: "Voucher created successfully", description: `Draft ${voucherTypeCode} created. You can submit it for approval.` })
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split("T")[0],
        paymentMethod: voucherType.includes("bank") ? "Cheque" : "Cash",
        accountId: "",
        description: "",
        referenceNumber: "",
        propertyId: "",
        unitId: "",
        payeeType: "",
        payeeId: "",
        dealId: "",
      })
      setLines([{ id: "1", accountId: "", debit: 0, credit: 0, description: "" }])
      setAttachments([])
      
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      toast({
        title: "Failed to create voucher",
        description: error?.response?.data?.error || error?.message || "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getTitle = () => {
    switch (voucherType) {
      case "bank-payment":
        return "New Bank Payment Voucher (BPV)"
      case "bank-receipt":
        return "New Bank Receipt Voucher (BRV)"
      case "cash-payment":
        return "New Cash Payment Voucher (CPV)"
      case "cash-receipt":
        return "New Cash Receipt Voucher (CRV)"
      default:
        return "New Voucher"
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset form
      setFormData({
        date: new Date().toISOString().split("T")[0],
        paymentMethod: voucherType.includes("bank") ? "Cheque" : "Cash",
        accountId: "",
        description: "",
        referenceNumber: "",
        propertyId: "",
        unitId: "",
        payeeType: "",
        payeeId: "",
        dealId: "",
      })
      setLines([{ id: "1", accountId: "", debit: 0, credit: 0, description: "" }])
      setAttachments([])
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] sm:w-[90vw] lg:w-[1200px] max-w-[95vw] sm:max-w-[90vw] lg:max-w-[1200px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>
            Create a new {voucherTypeCode} voucher. All entries must balance (Total Debit = Total Credit).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="paymentMethod">Payment Method *</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isBank ? (
                      <>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                        <SelectItem value="Transfer">Transfer</SelectItem>
                        <SelectItem value="Online">Online</SelectItem>
                      </>
                    ) : (
                      <SelectItem value="Cash">Cash</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="primaryAccount">{isBank ? "Bank" : "Cash"} Account *</Label>
                <SearchableSelect
                  source="accounts"
                  value={formData.accountId}
                  onChange={(value) => handlePrimaryAccountChange(value || "")}
                  placeholder={`Select ${isBank ? "bank" : "cash"} account...`}
                  required
                  filters={{ postable: "true" }}
                  transform={(item: any) => {
                    // Filter to only show relevant accounts
                    const isBankAccount = item.code?.startsWith("1112") || item.name?.toLowerCase().includes("bank")
                    const isCashAccount = item.code?.startsWith("1111") || item.name?.toLowerCase().includes("cash")
                    
                    const isRelevant = (isBank && isBankAccount) || (isCash && isCashAccount)
                    
                    return {
                      id: item.id,
                      label: `${item.code} - ${item.name}`,
                      value: item.id,
                      subtitle: item.type,
                      metadata: item,
                      disabled: !isRelevant, // Disable irrelevant accounts instead of returning null
                    }
                  }}
                />
              </div>

              {(isBank && ["Cheque", "Transfer"].includes(formData.paymentMethod)) && (
                <div className="grid gap-2">
                  <Label htmlFor="referenceNumber">Reference Number *</Label>
                  <Input
                    id="referenceNumber"
                    placeholder={formData.paymentMethod === "Cheque" ? "Cheque number" : "Transaction ID"}
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                    required
                  />
                </div>
              )}

              {isPayment && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="payeeType">Payee Type *</Label>
                    <Select
                      value={formData.payeeType}
                      onValueChange={(value) => setFormData({ ...formData, payeeType: value, payeeId: "" })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payee type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Vendor">Vendor</SelectItem>
                        <SelectItem value="Owner">Owner</SelectItem>
                        <SelectItem value="Agent">Agent</SelectItem>
                        <SelectItem value="Contractor">Contractor</SelectItem>
                        <SelectItem value="Tenant">Tenant</SelectItem>
                        <SelectItem value="Client">Client</SelectItem>
                        <SelectItem value="Dealer">Dealer</SelectItem>
                        <SelectItem value="Employee">Employee</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.payeeType && (
                    <div className="grid gap-2">
                      <Label htmlFor="payeeId">Payee *</Label>
                      <SearchableSelect
                        source={
                          formData.payeeType === "Agent" || formData.payeeType === "Dealer" ? "dealers" :
                          formData.payeeType === "Tenant" ? "tenants" :
                          formData.payeeType === "Client" ? "clients" :
                          formData.payeeType === "Employee" ? "employees" :
                          "clients"
                        }
                        value={formData.payeeId}
                        onChange={(value) => setFormData({ ...formData, payeeId: value || "" })}
                        placeholder={`Select ${formData.payeeType.toLowerCase()}...`}
                        required
                      />
                    </div>
                  )}
                </>
              )}

              <div className="grid gap-2">
                <Label htmlFor="propertyId">Property (Optional)</Label>
                <SearchableSelect
                  source="properties"
                  value={formData.propertyId}
                  onChange={(value) => setFormData({ ...formData, propertyId: value || "", unitId: "" })}
                  placeholder="Select property..."
                  allowEmpty
                />
              </div>

              {formData.propertyId && (
                <div className="grid gap-2">
                  <Label htmlFor="unitId">Unit (Optional)</Label>
                  <SearchableSelect
                    source="units"
                    value={formData.unitId}
                    onChange={(value) => setFormData({ ...formData, unitId: value || "" })}
                    placeholder="Select unit..."
                    allowEmpty
                    filters={{ propertyId: formData.propertyId }}
                  />
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Voucher description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            {/* Voucher Lines */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Voucher Lines *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Line
                </Button>
              </div>

              <div className="space-y-3">
                {lines.map((line, index) => {
                  const isPrimaryAccount = line.accountId === formData.accountId
                  return (
                    <div key={line.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Line {index + 1}</span>
                        {lines.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLine(line.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-2 grid gap-2">
                          <Label>Account *</Label>
                          <SearchableSelect
                            source="accounts"
                            value={line.accountId}
                            onChange={(value) => updateLine(line.id, "accountId", value || "")}
                            placeholder="Select account..."
                            required
                            filters={{ postable: "true" }}
                            transform={(item: any) => {
                              // Filter accounts based on voucher type and line position
                              let isRelevant = true
                              
                              if (isPrimaryAccount) {
                                // Primary account already selected - disable it
                                isRelevant = false
                              } else if (isPayment) {
                                // Payment: Only expense/liability
                                isRelevant = item.type === "Expense" || item.type === "Liability"
                              } else {
                                // Receipt: Only revenue/asset/liability
                                isRelevant = ["Revenue", "Asset", "Liability"].includes(item.type)
                              }
                              
                              return {
                                id: item.id,
                                label: `${item.code} - ${item.name}`,
                                value: item.id,
                                subtitle: item.type,
                                metadata: item,
                                disabled: !isRelevant, // Disable irrelevant accounts instead of returning null
                              }
                            }}
                          />
                          {isPrimaryAccount && (
                            <p className="text-xs text-muted-foreground">
                              {isPayment ? "Will be credited" : "Will be debited"} automatically
                            </p>
                          )}
                        </div>

                        <div className="grid gap-2">
                          <Label>Debit</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.debit || ""}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0
                              updateLine(line.id, "debit", val)
                              if (val > 0) updateLine(line.id, "credit", 0)
                            }}
                            disabled={isPrimaryAccount}
                            placeholder="0.00"
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label>Credit</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.credit || ""}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0
                              updateLine(line.id, "credit", val)
                              if (val > 0) updateLine(line.id, "debit", 0)
                            }}
                            disabled={isPrimaryAccount}
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label>Line Description</Label>
                        <Input
                          placeholder="Line item description"
                          value={line.description}
                          onChange={(e) => updateLine(line.id, "description", e.target.value)}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Balance Summary */}
              <div className="border-t pt-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Debit:</span>
                    <span className="ml-2 font-semibold">Rs {totals.debit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Credit:</span>
                    <span className="ml-2 font-semibold">Rs {totals.credit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Difference:</span>
                    <span className={cn("ml-2 font-semibold", isBalanced ? "text-green-600" : "text-red-600")}>
                      Rs {totals.balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {!isBalanced && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Entries must balance. Total Debit ({totals.debit.toFixed(2)}) must equal Total Credit ({totals.credit.toFixed(2)}).
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>

            {/* Attachments */}
            <div className="grid gap-2">
              <Label>Attachments *</Label>
              <div className="space-y-2">
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <FileText className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                  <Label htmlFor="voucher-attachment-upload" className="cursor-pointer">
                    <span className="text-sm text-muted-foreground">Click to upload documents</span>
                    <Input
                      id="voucher-attachment-upload"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                      multiple
                      onChange={handleAttachmentUpload}
                      disabled={uploadingAttachments}
                      className="hidden"
                    />
                  </Label>
                  <p className="text-xs text-muted-foreground mt-2">PDF, JPG, PNG, GIF, WEBP up to 10MB each</p>
                  <p className="text-xs text-muted-foreground mt-1">Required for {voucherTypeCode}</p>
                </div>
                {uploadingAttachments && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading attachments...
                  </div>
                )}
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((attachment, idx) => {
                      const isImage = attachment.mimeType?.startsWith('image/') || attachment.url.startsWith('data:image')
                      return (
                        <div key={idx} className="flex items-center justify-between p-2 border rounded-lg">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {isImage ? (
                              <ImageIcon className="h-4 w-4 text-primary shrink-0" />
                            ) : (
                              <FileText className="h-4 w-4 text-primary shrink-0" />
                            )}
                            <span className="text-sm truncate">{attachment.name}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAttachment(idx)}
                            className="shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !isBalanced}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Voucher (Draft)"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
