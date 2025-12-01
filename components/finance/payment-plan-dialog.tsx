"use client"

import { useState, useEffect } from "react"
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
  installmentNumber: number
  amount: number
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

  useEffect(() => {
    if (open && numberOfInstallments > 0) {
      const defaultAmount = dealAmount / numberOfInstallments
      const newInstallments: InstallmentRow[] = []
      
      for (let i = 0; i < numberOfInstallments; i++) {
        const dueDate = new Date(startDate)
        dueDate.setMonth(dueDate.getMonth() + i)
        
        newInstallments.push({
          installmentNumber: i + 1,
          amount: Math.round(defaultAmount * 100) / 100,
          dueDate,
          paymentMode: "bank",
          notes: "",
        })
      }
      
      // Adjust last installment to account for rounding
      const total = newInstallments.reduce((sum, inst) => sum + inst.amount, 0)
      if (Math.abs(total - dealAmount) > 0.01) {
        newInstallments[newInstallments.length - 1].amount += dealAmount - total
        newInstallments[newInstallments.length - 1].amount = Math.round(newInstallments[newInstallments.length - 1].amount * 100) / 100
      }
      
      setInstallments(newInstallments)
    }
  }, [open, numberOfInstallments, startDate, dealAmount])

  const handleInstallmentChange = (index: number, field: keyof InstallmentRow, value: any) => {
    const updated = [...installments]
    updated[index] = { ...updated[index], [field]: value }
    setInstallments(updated)
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)

      // Validate
      const total = installments.reduce((sum, inst) => sum + inst.amount, 0)
      if (Math.abs(total - dealAmount) > 0.01) {
        toast({
          title: "Validation Error",
          description: `Total installment amount (${total.toLocaleString()}) must equal deal amount (${dealAmount.toLocaleString()})`,
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

      // Submit
      const response = await apiService.paymentPlans.create({
        dealId,
        clientId,
        numberOfInstallments,
        totalAmount: dealAmount,
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
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Payment Mode</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installments.map((installment, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{installment.installmentNumber}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={installment.amount}
                          onChange={(e) =>
                            handleInstallmentChange(index, "amount", parseFloat(e.target.value) || 0)
                          }
                          className="w-32"
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
                              onSelect={(date) => handleInstallmentChange(index, "dueDate", date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={installment.paymentMode}
                          onValueChange={(value) => handleInstallmentChange(index, "paymentMode", value)}
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
                          onChange={(e) => handleInstallmentChange(index, "notes", e.target.value)}
                          placeholder="Notes..."
                          className="w-48"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Total: Rs {installments.reduce((sum, inst) => sum + inst.amount, 0).toLocaleString("en-IN")} / Rs{" "}
              {dealAmount.toLocaleString("en-IN")}
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

