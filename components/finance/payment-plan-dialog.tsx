"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Plus, Trash2, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { apiService } from "@/lib/api"
import api from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface PaymentPlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dealId: string
  clientId: string
  dealAmount: number
  onSuccess?: () => void
}

interface InstallmentRow {
  id: number
  installmentNumber: number
  type: string
  amount: number
  period: string
  dueDate: Date | null
  paymentMode: string
  notes: string
}

export function PaymentPlanDialog({
  open,
  onOpenChange,
  dealId,
  clientId,
  dealAmount,
  onSuccess,
}: PaymentPlanDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [numberOfInstallments, setNumberOfInstallments] = useState(3)
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [installments, setInstallments] = useState<InstallmentRow[]>([])
  const [notes, setNotes] = useState("")
  const [downPaymentType, setDownPaymentType] = useState<"percentage" | "manual">("manual")
  const [downPaymentPercentage, setDownPaymentPercentage] = useState<string>("")
  const [downPaymentAmount, setDownPaymentAmount] = useState<string>("")
  const [downPaymentAction, setDownPaymentAction] = useState<"cut" | "pay">("cut")
  const [appliedDownPayment, setAppliedDownPayment] = useState<number>(0)
  const [isDownPaymentApplied, setIsDownPaymentApplied] = useState(false)

  // Calculate downpayment amount
  const calculatedDownPayment = useMemo(() => {
    if (downPaymentType === "percentage") {
      const percentage = parseFloat(downPaymentPercentage) || 0
      if (percentage > 0 && percentage <= 100) {
        return Math.round((dealAmount * percentage / 100) * 100) / 100
      }
      return 0
    } else {
      return parseFloat(downPaymentAmount) || 0
    }
  }, [downPaymentType, downPaymentPercentage, downPaymentAmount, dealAmount])

  // Handle Apply Down Payment
  const handleApplyDownPayment = () => {
    if (calculatedDownPayment > 0) {
      setAppliedDownPayment(calculatedDownPayment)
      setIsDownPaymentApplied(true)
      
      // Force recalculation of installments
      const newRemaining = downPaymentAction === "cut" 
        ? Math.max(0, dealAmount - calculatedDownPayment)
        : dealAmount
      
      const defaultAmount = newRemaining / numberOfInstallments
      const newInstallments: InstallmentRow[] = []
      
      for (let i = 0; i < numberOfInstallments; i++) {
        const dueDate = new Date(startDate)
        dueDate.setMonth(dueDate.getMonth() + i)
        
        newInstallments.push({
          id: Date.now() + i,
          installmentNumber: i + 1,
          type: "",
          amount: Math.round(defaultAmount * 100) / 100,
          period: "",
          dueDate,
          paymentMode: "bank",
          notes: "",
        })
      }
      
      // Adjust last installment to account for rounding
      const total = newInstallments.reduce((sum, inst) => sum + inst.amount, 0)
      if (Math.abs(total - newRemaining) > 0.01) {
        newInstallments[newInstallments.length - 1].amount += newRemaining - total
        newInstallments[newInstallments.length - 1].amount = Math.round(newInstallments[newInstallments.length - 1].amount * 100) / 100
      }
      
      setInstallments(newInstallments)
      
      toast({
        title: "Down Payment Applied",
        description: `Down payment of Rs ${calculatedDownPayment.toLocaleString("en-IN")} has been ${downPaymentAction === "cut" ? "deducted from installments" : "planned (pending payment)"}. Installments recalculated.`,
      })
    } else {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid down payment amount",
        variant: "destructive",
      })
    }
  }

  // Calculate remaining amount after downpayment
  // Only use applied down payment for calculations
  // If "cut" is selected, deduct from deal amount
  // If "pay" is selected, don't deduct (down payment is separate, already paid)
  const remainingAmount = useMemo(() => {
    if (isDownPaymentApplied && downPaymentAction === "cut" && appliedDownPayment > 0) {
      return Math.max(0, dealAmount - appliedDownPayment)
    }
    return dealAmount
  }, [dealAmount, appliedDownPayment, downPaymentAction, isDownPaymentApplied])

  // Reset down payment state when dialog opens
  useEffect(() => {
    if (open) {
      setIsDownPaymentApplied(false)
      setAppliedDownPayment(0)
      setDownPaymentPercentage("")
      setDownPaymentAmount("")
      setDownPaymentAction("cut")
    }
  }, [open])

  useEffect(() => {
    if (open && numberOfInstallments > 0) {
      // Use remaining amount (after downpayment deduction) for installments
      const defaultAmount = remainingAmount / numberOfInstallments
      const newInstallments: InstallmentRow[] = []
      
      for (let i = 0; i < numberOfInstallments; i++) {
        const dueDate = new Date(startDate)
        dueDate.setMonth(dueDate.getMonth() + i)
        
        newInstallments.push({
          id: Date.now() + i, // Unique ID for each installment
          installmentNumber: i + 1,
          type: "", // Monthly, Quarterly, Yearly
          amount: Math.round(defaultAmount * 100) / 100,
          period: "", // Period in months/quarters/years
          dueDate,
          paymentMode: "bank",
          notes: "",
        })
      }
      
      // Adjust last installment to account for rounding
      const total = newInstallments.reduce((sum, inst) => sum + inst.amount, 0)
      if (Math.abs(total - remainingAmount) > 0.01) {
        newInstallments[newInstallments.length - 1].amount += remainingAmount - total
        newInstallments[newInstallments.length - 1].amount = Math.round(newInstallments[newInstallments.length - 1].amount * 100) / 100
      }
      
      setInstallments(newInstallments)
    }
  }, [open, numberOfInstallments, startDate, remainingAmount])

  // Exact update handler as specified
  const updateInstallment = (id: number, field: keyof InstallmentRow, value: any) => {
    setInstallments(prev =>
      prev.map(inst =>
        inst.id === id
          ? { ...inst, [field]: value }
          : inst
      )
    )
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)

      // Validate downpayment (use applied amount if applied, otherwise use calculated)
      const downPaymentToValidate = isDownPaymentApplied ? appliedDownPayment : calculatedDownPayment
      if (downPaymentToValidate < 0 || downPaymentToValidate > dealAmount) {
        toast({
          title: "Validation Error",
          description: `Down payment amount (${downPaymentToValidate.toLocaleString()}) cannot exceed deal amount (${dealAmount.toLocaleString()})`,
          variant: "destructive",
        })
        return
      }

      // Validate installments
      const total = installments.reduce((sum, inst) => sum + inst.amount, 0)
      const expectedTotal = remainingAmount
      if (Math.abs(total - expectedTotal) > 0.01) {
        toast({
          title: "Validation Error",
          description: `Total installment amount (${total.toLocaleString()}) must equal ${downPaymentAction === "cut" ? "remaining amount after down payment" : "deal amount"} (${expectedTotal.toLocaleString()})`,
          variant: "destructive",
        })
        return
      }

      const hasInvalidDates = installments.some((inst) => !inst.dueDate)
      if (hasInvalidDates) {
        toast({
          title: "Validation Error",
          description: "All installments must have a due date",
          variant: "destructive",
        })
        return
      }

      // Submit - use the correct endpoint
      // Use applied down payment if applied, otherwise use calculated
      const finalDownPayment = isDownPaymentApplied ? appliedDownPayment : calculatedDownPayment
      const response = await api.post('/finance/payment-plans', {
        dealId,
        clientId,
        numberOfInstallments,
        totalAmount: dealAmount,
        downPayment: finalDownPayment,
        downPaymentAction: downPaymentAction,
        startDate: startDate.toISOString(),
        installmentAmounts: installments.map((i) => i.amount),
        dueDates: installments.map((i) => i.dueDate?.toISOString()),
        paymentModes: installments.map((i) => i.paymentMode),
        notes,
      })

      const data: any = response.data || response

      if (!data || !data.success) {
        throw new Error(data?.error || "Failed to create payment plan")
      }

      toast({
        title: "Success",
        description: "Payment plan created successfully",
      })

      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create payment plan",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Payment Plan</DialogTitle>
          <DialogDescription>
            Set up installment schedule for this deal. Total amount: Rs {dealAmount.toLocaleString("en-IN")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Down Payment Section */}
          <div className="space-y-4 border-b pb-4">
            <div>
              <Label className="text-base font-semibold">Down Payment</Label>
              <p className="text-sm text-muted-foreground">Enter down payment amount (will be deducted from total)</p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Down Payment Type</Label>
                  <Select value={downPaymentType} onValueChange={(value: "percentage" | "manual") => {
                    setDownPaymentType(value)
                    setIsDownPaymentApplied(false)
                    setAppliedDownPayment(0)
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="manual">Manual Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  {downPaymentType === "percentage" ? (
                    <>
                      <Label>Down Payment Percentage (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={downPaymentPercentage}
                        onChange={(e) => {
                          const value = e.target.value
                          const num = parseFloat(value)
                          if (value === "" || (!isNaN(num) && num >= 0 && num <= 100)) {
                            setDownPaymentPercentage(value)
                            setIsDownPaymentApplied(false)
                            setAppliedDownPayment(0)
                          }
                        }}
                        placeholder="0.00"
                      />
                      {downPaymentPercentage && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Amount: Rs {calculatedDownPayment.toLocaleString("en-IN")}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <Label>Down Payment Amount (Rs)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        max={dealAmount}
                        value={downPaymentAmount}
                        onChange={(e) => {
                          const value = e.target.value
                          const num = parseFloat(value)
                          if (value === "" || (!isNaN(num) && num >= 0 && num <= dealAmount)) {
                            setDownPaymentAmount(value)
                            setIsDownPaymentApplied(false)
                            setAppliedDownPayment(0)
                          }
                        }}
                        placeholder="0.00"
                      />
                    </>
                  )}
                </div>
                {calculatedDownPayment > 0 && (
                  <div>
                    <Label>Action</Label>
                    <Select value={downPaymentAction} onValueChange={(value: "cut" | "pay") => {
                      setDownPaymentAction(value)
                      setIsDownPaymentApplied(false)
                      setAppliedDownPayment(0)
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cut">Cut (Deduct)</SelectItem>
                        <SelectItem value="pay">Pay (Already Paid)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {downPaymentAction === "cut" 
                        ? "Amount will be deducted from deal amount"
                        : "Amount already paid, won't deduct from deal"}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  onClick={handleApplyDownPayment}
                  disabled={calculatedDownPayment <= 0 || (isDownPaymentApplied && appliedDownPayment === calculatedDownPayment)}
                  className="w-full"
                  variant={isDownPaymentApplied && appliedDownPayment === calculatedDownPayment ? "secondary" : "default"}
                >
                  {isDownPaymentApplied && appliedDownPayment === calculatedDownPayment ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Applied
                    </>
                  ) : (
                    "Apply Down Payment"
                  )}
                </Button>
                {isDownPaymentApplied && appliedDownPayment > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDownPaymentApplied(false)
                      setAppliedDownPayment(0)
                      toast({
                        title: "Down Payment Removed",
                        description: "Down payment has been removed. Installments recalculated.",
                      })
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
            {isDownPaymentApplied && appliedDownPayment > 0 && (
              <div className="bg-muted p-3 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Applied Down Payment:</span>
                  <span className="text-sm font-semibold">Rs {appliedDownPayment.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Action:</span>
                  <span className="text-sm font-semibold capitalize">
                    {downPaymentAction === "cut" ? "Cut (Deducted)" : "Pay (Already Paid)"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    {downPaymentAction === "cut" ? "Remaining Amount:" : "Total Deal Amount:"}
                  </span>
                  <span className="text-sm font-semibold">Rs {remainingAmount.toLocaleString("en-IN")}</span>
                </div>
                {downPaymentAction === "pay" && (
                  <div className="text-xs text-muted-foreground pt-1 border-t">
                    Note: Down payment is already paid separately. Installments will be calculated from full deal amount.
                  </div>
                )}
              </div>
            )}
            {calculatedDownPayment > 0 && !isDownPaymentApplied && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Entered amount: Rs {calculatedDownPayment.toLocaleString("en-IN")}. Click "Apply Down Payment" to deduct this amount.
                </p>
              </div>
            )}
          </div>

          {/* Basic Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="installments">Number of Installments</Label>
              <Input
                id="installments"
                type="number"
                min="1"
                value={numberOfInstallments}
                onChange={(e) => setNumberOfInstallments(Math.max(1, parseInt(e.target.value) || 1))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Installments will be calculated from remaining amount after down payment
              </p>
            </div>
            <div>
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={startDate} onSelect={(date) => date && setStartDate(date)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Installments Table */}
          <div>
            <Label className="mb-2 block">Installments</Label>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Payment Mode</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installments.map((installment) => (
                    <TableRow key={installment.id}>
                      <TableCell className="font-medium">{installment.installmentNumber}</TableCell>
                      <TableCell>
                        <Select
                          value={installment.type}
                          onValueChange={(value) => updateInstallment(installment.id, "type", value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Select Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Select Type</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={installment.amount}
                          onChange={(e) => updateInstallment(installment.id, "amount", Number(e.target.value) || 0)}
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={installment.period}
                          onChange={(e) => updateInstallment(installment.id, "period", e.target.value)}
                          placeholder="Period"
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !installment.dueDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {installment.dueDate ? format(installment.dueDate, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={installment.dueDate || undefined}
                              onSelect={(date) => updateInstallment(installment.id, "dueDate", date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={installment.paymentMode}
                          onValueChange={(value) => updateInstallment(installment.id, "paymentMode", value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="bank">Bank</SelectItem>
                            <SelectItem value="online">Online</SelectItem>
                            <SelectItem value="cheque">Cheque</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={installment.notes}
                          onChange={(e) => updateInstallment(installment.id, "notes", e.target.value)}
                          placeholder="Notes..."
                          className="w-48"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-2 space-y-1">
              <div className="text-sm text-muted-foreground">
                Installments Total: Rs {installments.reduce((sum, inst) => sum + inst.amount, 0).toLocaleString("en-IN")}
              </div>
              {isDownPaymentApplied && appliedDownPayment > 0 && (
                <div className="text-sm font-semibold">
                  {downPaymentAction === "cut" ? (
                    <>
                      Down Payment: Rs {appliedDownPayment.toLocaleString("en-IN")} + Installments: Rs{" "}
                      {installments.reduce((sum, inst) => sum + inst.amount, 0).toLocaleString("en-IN")} = Total: Rs{" "}
                      {dealAmount.toLocaleString("en-IN")}
                    </>
                  ) : (
                    <>
                      Down Payment (Paid): Rs {appliedDownPayment.toLocaleString("en-IN")} + Installments: Rs{" "}
                      {installments.reduce((sum, inst) => sum + inst.amount, 0).toLocaleString("en-IN")} = Total: Rs{" "}
                      {(appliedDownPayment + installments.reduce((sum, inst) => sum + inst.amount, 0)).toLocaleString("en-IN")}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this payment plan..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Payment Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

