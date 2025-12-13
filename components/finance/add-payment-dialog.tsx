"use client"

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
import { PaymentToasts, showErrorToast } from "@/lib/toast-utils"

interface AddPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

type DealOption = {
  id: string
  title: string
  clientName: string
  propertyName: string
  dealAmount: number
  status: string
  stage: string
}

const paymentModes = [
  { label: "Cash", value: "cash" },
  { label: "Bank", value: "bank" },
  { label: "Online Transfer", value: "online_transfer" },
  { label: "Card", value: "card" },
]

const paymentTypes = [
  { label: "Token", value: "token" },
  { label: "Booking", value: "booking" },
  { label: "Installment", value: "installment" },
  { label: "Partial", value: "partial" },
  { label: "Full", value: "full" },
]

const defaultFormState = {
  dealId: "",
  paymentType: "token",
  paymentMode: "cash",
  amount: "",
  date: new Date().toISOString().split("T")[0],
  transactionId: "",
  referenceNumber: "",
  remarks: "",
  systemId: "",
  manualUniqueId: "",
}

export function AddPaymentDialog({ open, onOpenChange, onSuccess }: AddPaymentDialogProps) {
  const [formData, setFormData] = useState(defaultFormState)
  const [deals, setDeals] = useState<DealOption[]>([])
  const [loadingDeals, setLoadingDeals] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const selectedDeal = useMemo(
    () => deals.find((deal) => deal.id === formData.dealId),
    [deals, formData.dealId],
  )

  useEffect(() => {
    if (open) {
      setFormData(prev => ({ ...prev, systemId: "Will be generated on save" }))
      fetchDeals()
    } else {
      resetForm()
    }
  }, [open])

  const fetchDeals = async () => {
    try {
      setLoadingDeals(true)
      const response = await apiService.deals.getAll()
      const data = Array.isArray(response.data) ? response.data : []
      setDeals(
        data.map((deal: any) => ({
          id: deal.id,
          title: deal.title,
          clientName: deal.client?.name || "Unassigned Client",
          propertyName: deal.property?.name || "Unassigned Property",
          dealAmount:
            typeof deal.dealAmount === "number"
              ? deal.dealAmount
              : Number.parseFloat(deal.dealAmount ?? "0") || 0,
          status: deal.status || "open",
          stage: deal.stage || "prospecting",
        })),
      )
    } catch (error) {
      console.error("Failed to load deals", error)
      showErrorToast("Failed to fetch deals", "Please refresh and try again.")
      setDeals([])
    } finally {
      setLoadingDeals(false)
    }
  }

  const resetForm = () => {
    setFormData(defaultFormState)
    setSubmitting(false)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!formData.dealId) {
      showErrorToast("Validation Error", "Please select a deal.")
      return
    }

    const amount = Number(formData.amount || 0)
    if (!amount || amount <= 0) {
      showErrorToast("Validation Error", "Payment amount must be greater than zero.")
      return
    }

    setSubmitting(true)
    try {
      const payload: any = {
        dealId: formData.dealId,
        amount,
        paymentType: formData.paymentType,
        paymentMode: formData.paymentMode,
        date: new Date(formData.date).toISOString(),
      }

      // Only include optional fields if they have values
      if (formData.transactionId && formData.transactionId.trim()) {
        payload.transactionId = formData.transactionId.trim()
      }
      if (formData.referenceNumber && formData.referenceNumber.trim()) {
        payload.referenceNumber = formData.referenceNumber.trim()
      }
      if (formData.remarks && formData.remarks.trim()) {
        payload.remarks = formData.remarks.trim()
      }
      if (formData.manualUniqueId?.trim()) {
        payload.manualUniqueId = formData.manualUniqueId.trim()
      }

      await apiService.payments.create(payload)

      PaymentToasts.received("Payment", amount)
      onSuccess?.()
      onOpenChange(false)
      resetForm()
    } catch (error: any) {
      console.error("Failed to record payment", error)
      
      // Extract validation errors from API response
      if (error?.response?.data?.error) {
        const apiError = error.response.data.error
        let errorMessage = "Failed to record payment"
        
        if (Array.isArray(apiError)) {
          // Zod validation errors
          errorMessage = apiError
            .map((err: any) => {
              if (typeof err === 'string') return err
              if (err?.message) return err.message
              if (err?.path) return `${err.path.join('.')}: ${err.message || 'Invalid value'}`
              return JSON.stringify(err)
            })
            .join(', ')
        } else if (typeof apiError === 'string') {
          errorMessage = apiError
        } else if (typeof apiError === 'object') {
          errorMessage = apiError.message || apiError.error || JSON.stringify(apiError)
        }
        
        PaymentToasts.error(errorMessage)
      } else {
        PaymentToasts.error(error?.response?.data?.message || "Failed to record payment")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-[90vw] md:w-[720px] max-w-[95vw] sm:max-w-[90vw] md:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Record Deal Payment</DialogTitle>
          <DialogDescription>
            Capture token, booking, installment, or final payments against an approved deal. Ledger entries will
            be created automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>System ID (Auto-generated)</Label>
              <Input value={formData.systemId || "Will be generated on save"} disabled className="bg-muted text-muted-foreground" />
              <p className="text-xs text-muted-foreground">This ID is automatically generated by the system</p>
            </div>
            <div className="space-y-2">
              <Label>Manual Unique ID (Optional)</Label>
              <Input
                value={formData.manualUniqueId}
                onChange={(event) => setFormData((prev) => ({ ...prev, manualUniqueId: event.target.value }))}
                placeholder="Enter custom unique ID (optional)"
              />
              <p className="text-xs text-muted-foreground">Optional: Enter a custom unique identifier</p>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(event) => setFormData((prev) => ({ ...prev, date: event.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Deal</Label>
            <Select
              value={formData.dealId}
              onValueChange={(value) => {
                const selectedDeal = deals.find((deal) => deal.id === value)
                setFormData((prev) => ({
                  ...prev,
                  dealId: value,
                  // Auto-update amount to deal amount when deal is selected
                  amount: selectedDeal ? selectedDeal.dealAmount.toString() : prev.amount,
                }))
              }}
              disabled={loadingDeals}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingDeals ? "Loading deals..." : "Select deal"} />
              </SelectTrigger>
              <SelectContent>
                {deals.length === 0 && !loadingDeals ? (
                  <SelectItem value="no-deals" disabled>
                    No deals available
                  </SelectItem>
                ) : (
                  deals.map((deal) => (
                    <SelectItem key={deal.id} value={deal.id}>
                      {deal.title} — {deal.clientName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedDeal && (
            <div className="rounded-md border border-border px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{selectedDeal.propertyName}</p>
                  <p className="text-muted-foreground">{selectedDeal.clientName}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Deal Amount</p>
                  <p className="text-base font-semibold">
                    {selectedDeal.dealAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Stage: {selectedDeal.stage.replace("-", " ")} — Status: {selectedDeal.status.replace("_", " ")}
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Payment Type</Label>
              <Select
                value={formData.paymentType}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, paymentType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <Select
                value={formData.paymentMode}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, paymentMode: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentModes.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(event) => setFormData((prev) => ({ ...prev, amount: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Transaction ID</Label>
              <Input
                placeholder="Optional reference from POS/bank"
                value={formData.transactionId}
                onChange={(event) => setFormData((prev) => ({ ...prev, transactionId: event.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Reference Number</Label>
              <Input
                placeholder="Cheque or receipt number"
                value={formData.referenceNumber}
                onChange={(event) => setFormData((prev) => ({ ...prev, referenceNumber: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Internal remarks for finance team"
                value={formData.remarks}
                onChange={(event) => setFormData((prev) => ({ ...prev, remarks: event.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || loadingDeals || deals.length === 0}>
              {submitting ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

