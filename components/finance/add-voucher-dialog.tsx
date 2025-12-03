"use client"

import type React from "react"
import { useState } from "react"
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
import { apiService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface AddVoucherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  voucherType?: "bank-payment" | "bank-receipt" | "cash-payment" | "cash-receipt"
  onSuccess?: () => void
}

export function AddVoucherDialog({ open, onOpenChange, voucherType = "bank-payment", onSuccess }: AddVoucherDialogProps) {
  const [formData, setFormData] = useState({
    date: "",
    payee: "",
    amount: "",
    description: "",
    reference: "",
  })
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const isReceipt = voucherType.includes("receipt")
      const transactionPayload = {
        transactionType: isReceipt ? "income" : "expense",
        type: isReceipt ? "income" : "expense",
        description: formData.description || (isReceipt ? "Receipt voucher" : "Payment voucher"),
        amount: parseFloat(formData.amount || "0"),
        date: new Date(formData.date).toISOString(),
        paymentMethod: voucherType.startsWith("bank") ? "bank" : "cash",
        referenceNumber: formData.reference || null,
        status: "completed",
      }
      await apiService.transactions.create(transactionPayload)
      toast({ title: "Voucher created" })
      onOpenChange(false)
      onSuccess?.()
    } catch {
      toast({ title: "Failed to create voucher", variant: "destructive" })
    }
  }

  const getTitle = () => {
    switch (voucherType) {
      case "bank-payment":
        return "New Bank Payment Voucher"
      case "bank-receipt":
        return "New Bank Receipt Voucher"
      case "cash-payment":
        return "New Cash Payment Voucher"
      case "cash-receipt":
        return "New Cash Receipt Voucher"
      default:
        return "New Voucher"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[900px] max-w-[90vw]">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>Enter the voucher details</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payee">{voucherType.includes("receipt") ? "From" : "Payee"}</Label>
              <Input
                id="payee"
                placeholder={voucherType.includes("receipt") ? "Payer name" : "Payee name"}
                value={formData.payee}
                onChange={(e) => setFormData({ ...formData, payee: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Voucher description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reference">Reference/Cheque No.</Label>
              <Input
                id="reference"
                placeholder="Optional reference number"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Voucher</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
