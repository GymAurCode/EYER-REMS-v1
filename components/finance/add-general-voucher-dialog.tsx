"use client"

import type React from "react"
import { useEffect, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Loader2, AlertCircle } from "lucide-react"
import { apiService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { SearchableSelect } from "@/components/common/searchable-select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { HelpCircle } from "lucide-react"

interface AddGeneralVoucherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface JournalLine {
  id: string
  accountId: string
  debit: number
  credit: number
  description: string
  propertyId?: string
  unitId?: string
}

export function AddGeneralVoucherDialog({ open, onOpenChange, onSuccess }: AddGeneralVoucherDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    propertyId: "",
    unitId: "",
  })

  const [lines, setLines] = useState<JournalLine[]>([
    { id: "1", accountId: "", debit: 0, credit: 0, description: "" },
    { id: "2", accountId: "", debit: 0, credit: 0, description: "" },
  ])

  // Calculate totals
  const totals = useMemo(() => {
    const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0)
    const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0)
    return { debit: totalDebit, credit: totalCredit, balance: Math.abs(totalDebit - totalCredit) }
  }, [lines])

  // Validate balance
  const isBalanced = (totals?.balance || 0) < 0.01

  const addLine = () => {
    setLines([...lines, { id: Date.now().toString(), accountId: "", debit: 0, credit: 0, description: "" }])
  }

  const removeLine = (id: string) => {
    if (lines.length <= 2) {
      toast({
        title: "Cannot remove",
        description: "Journal voucher must have at least 2 line items (minimum double-entry)",
        variant: "destructive",
      })
      return
    }
    setLines(lines.filter((line) => line.id !== id))
  }

  const updateLine = (id: string, field: keyof JournalLine, value: any) => {
    setLines(lines.map((line) => {
      if (line.id !== id) return line

      // Enforce one-sided per line at state level
      if (field === "debit") {
        const debitVal = Number(value) || 0
        return {
          ...line,
          debit: debitVal,
          credit: debitVal > 0 ? 0 : line.credit,
        }
      }

      if (field === "credit") {
        const creditVal = Number(value) || 0
        return {
          ...line,
          credit: creditVal,
          debit: creditVal > 0 ? 0 : line.debit,
        }
      }

      return { ...line, [field]: value }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (lines.length < 2) {
      toast({
        title: "Insufficient lines",
        description: "Journal voucher must have at least 2 line items (minimum double-entry)",
        variant: "destructive",
      })
      return
    }

    if (lines.some((line) => !line.accountId)) {
      toast({
        title: "All lines must have accounts",
        description: "Please select accounts for all line items",
        variant: "destructive",
      })
      return
    }

    // Enforce one-sided, non-zero lines at UI level before hitting backend
    const hasInvalidLine = lines.some((line) => {
      const debit = Number(line.debit || 0)
      const credit = Number(line.credit || 0)
      return (debit > 0 && credit > 0) || (debit <= 0 && credit <= 0)
    })

    if (hasInvalidLine) {
      toast({
        title: "Invalid line entries",
        description: "Each line must have either Debit > 0 or Credit > 0 (but not both). Zero-value lines are not allowed.",
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

    // Validate no cash/bank accounts for JV
    const hasCashBank = lines.some((line) => {
      const account = accounts.find((a) => a.id === line.accountId)
      return account && (account.code?.startsWith("1111") || account.code?.startsWith("1112"))
    })

    if (hasCashBank) {
      toast({
        title: "Invalid account",
        description: "Journal Voucher cannot use cash/bank accounts. Use BPV/BRV/CPV/CRV instead.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      const voucherPayload = {
        type: "JV",
        date: formData.date,
        paymentMethod: "N/A", // JV doesn't have payment method
        accountId: lines[0].accountId, // Use first line as primary (not used for JV but required)
        description: formData.description,
        propertyId: formData.propertyId || undefined,
        unitId: formData.unitId || undefined,
        lines: lines.map((line) => ({
          accountId: line.accountId,
          debit: line.debit || 0,
          credit: line.credit || 0,
          description: line.description || formData.description,
          propertyId: line.propertyId || formData.propertyId || undefined,
          unitId: line.unitId || formData.unitId || undefined,
        })),
      }

      await apiService.vouchers.create(voucherPayload)
      
      toast({ title: "Journal voucher created successfully", description: "Draft JV created. You can submit it for approval." })
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split("T")[0],
        description: "",
        propertyId: "",
        unitId: "",
      })
      setLines([
        { id: "1", accountId: "", debit: 0, credit: 0, description: "" },
        { id: "2", accountId: "", debit: 0, credit: 0, description: "" },
      ])
      
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      toast({
        title: "Failed to create journal voucher",
        description: error?.response?.data?.error || error?.message || "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Get accounts excluding cash/bank for JV
  const [accounts, setAccounts] = useState<any[]>([])
  useEffect(() => {
    if (open) {
      fetchAccounts()
    }
  }, [open])

  const fetchAccounts = async () => {
    try {
      const response = await apiService.accounts.getAll({ postable: "true" })
      const responseData = response.data as any
      const accountsData = Array.isArray(responseData?.data) ? responseData.data : Array.isArray(responseData) ? responseData : []
      // Filter out cash/bank accounts for JV
      const filtered = accountsData.filter((acc: any) => 
        acc.isPostable && 
        acc.level === 5 &&
        !acc.code?.startsWith("1111") &&
        !acc.code?.startsWith("1112")
      )
      setAccounts(filtered)
    } catch (error) {
      console.error("Failed to load accounts:", error)
      setAccounts([])
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset form
      setFormData({
        date: new Date().toISOString().split("T")[0],
        description: "",
        propertyId: "",
        unitId: "",
      })
      setLines([
        { id: "1", accountId: "", debit: 0, credit: 0, description: "" },
        { id: "2", accountId: "", debit: 0, credit: 0, description: "" },
      ])
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] sm:w-[90vw] lg:w-[1200px] max-w-[95vw] sm:max-w-[90vw] lg:max-w-[1200px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>New Journal Voucher (JV)</DialogTitle>
          <DialogDescription>
            Create a new journal voucher for non-cash/bank adjustments (accruals, depreciation, corrections, etc.).
            Total Debit must equal Total Credit. Cannot use cash/bank accounts.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="e.g., Depreciation entry, Accrual adjustment"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="propertyId">Property (Optional)</Label>
              <SearchableSelect
                source="properties"
                value={formData.propertyId}
                onChange={(value) => setFormData({ ...formData, propertyId: value || "", unitId: "" })}
                placeholder="Select property..."
                allowEmpty
              />
              <p className="text-xs text-muted-foreground">
                Property selection is required if any line uses a property-linked account.
              </p>
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

          {/* Journal Lines */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Journal Lines * (Minimum 2 lines)</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-4 w-4 mr-2" />
                Add Line
              </Button>
            </div>

            <div className="space-y-3">
              {lines.map((line, index) => (
                <div key={line.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Line {index + 1}</span>
                    {lines.length > 2 && (
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
                      <div className="flex items-center gap-2">
                        <Label>Account *</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Journal Voucher cannot use cash/bank accounts. Use BPV/BRV/CPV/CRV instead.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <SearchableSelect
                        source="accounts"
                        value={line.accountId}
                        onChange={(value) => updateLine(line.id, "accountId", value || "")}
                        placeholder="Select expense, income, payable, or receivable account"
                        required
                        filters={{ postable: "true" }}
                        transform={(item: any) => {
                          // Exclude cash/bank accounts - mark as disabled
                          const isCashBank = item.code?.startsWith("1111") || item.code?.startsWith("1112")
                          
                          return {
                            id: item.id,
                            label: `${item.code} - ${item.name}`,
                            value: item.id,
                            subtitle: item.type,
                            metadata: item,
                            disabled: isCashBank, // Disable cash/bank accounts instead of returning null
                          }
                        }}
                      />
                      {line.accountId && (
                        <p className="text-xs text-muted-foreground">
                          This account represents where the amount is posted.
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <div className="flex items-center gap-2">
                        <Label>Debit</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Amount is entered using Debit or Credit. Only one side is allowed per line.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="w-full">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.debit || ""}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0
                                updateLine(line.id, "debit", val)
                              }}
                              disabled={(line.credit || 0) > 0}
                              placeholder="Enter amount"
                              className={(line.credit || 0) > 0 ? "cursor-not-allowed" : ""}
                            />
                          </div>
                        </TooltipTrigger>
                        {(line.credit || 0) > 0 ? (
                          <TooltipContent>
                            <p>This field is disabled because Credit amount is entered. Only one side is allowed per line.</p>
                          </TooltipContent>
                        ) : (
                          <TooltipContent>
                            <p>Enter the amount to debit this account. Credit will be set to zero.</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </div>

                    <div className="grid gap-2">
                      <div className="flex items-center gap-2">
                        <Label>Credit</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Amount is entered using Debit or Credit. Only one side is allowed per line.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="w-full">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.credit || ""}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0
                                updateLine(line.id, "credit", val)
                              }}
                              disabled={(line.debit || 0) > 0}
                              placeholder="Enter amount"
                              className={(line.debit || 0) > 0 ? "cursor-not-allowed" : ""}
                            />
                          </div>
                        </TooltipTrigger>
                        {(line.debit || 0) > 0 ? (
                          <TooltipContent>
                            <p>This field is disabled because Debit amount is entered. Only one side is allowed per line.</p>
                          </TooltipContent>
                        ) : (
                          <TooltipContent>
                            <p>Enter the amount to credit this account. Debit will be set to zero.</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
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
              ))}
            </div>

            {/* Balance Summary */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium">Balance Summary</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total Debit must equal Total Credit before submission.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Debit:</span>
                  <span className="ml-2 font-semibold">Rs {(totals?.debit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Credit:</span>
                  <span className="ml-2 font-semibold">Rs {(totals?.credit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Difference:</span>
                  <span className={cn("ml-2 font-semibold", isBalanced ? "text-green-600" : "text-red-600")}>
                    Rs {(totals?.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {!isBalanced && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Voucher is not balanced. Please review entered amounts. Total Debit ({(totals?.debit || 0).toFixed(2)}) must equal Total Credit ({(totals?.credit || 0).toFixed(2)}).
                  </AlertDescription>
                </Alert>
              )}
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
                "Create Journal Voucher (Draft)"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
