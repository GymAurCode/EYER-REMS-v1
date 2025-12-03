"use client"

import type React from "react"

import { useEffect, useState } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface AddGeneralVoucherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddGeneralVoucherDialog({ open, onOpenChange }: AddGeneralVoucherDialogProps) {
  const [formData, setFormData] = useState({
    voucherNo: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    debitAccount: "",
    creditAccount: "",
    amount: "",
    narration: "",
  })
  const [accounts, setAccounts] = useState<any[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      fetchAccounts()
    }
  }, [open])

  const fetchAccounts = async () => {
    try {
      setLoadingAccounts(true)
      const response: any = await apiService.accounts.getAll()
      const responseData = response.data as any
      const accountsData = Array.isArray(responseData?.data) ? responseData.data : Array.isArray(responseData) ? responseData : []
      const sorted = Array.isArray(accountsData)
        ? accountsData.sort((a: any, b: any) => (a.code || "").localeCompare(b.code || ""))
        : []
      setAccounts(sorted)
    } catch {
      setAccounts([])
    } finally {
      setLoadingAccounts(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (!formData.debitAccount || !formData.creditAccount) {
        toast({ title: "Select both debit and credit accounts", variant: "destructive" })
        return
      }

      if (formData.debitAccount === formData.creditAccount) {
        toast({ title: "Debit and credit accounts must be different", variant: "destructive" })
        return
      }

      const parsedAmount = Number.parseFloat(formData.amount)
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        toast({ title: "Enter a valid amount greater than zero", variant: "destructive" })
        return
      }

      await apiService.journals.create({
        date: new Date(formData.date).toISOString(),
        description: formData.description || undefined,
        narration: formData.narration || undefined,
        lines: [
          {
            accountId: formData.debitAccount,
            debit: parsedAmount,
            credit: 0,
            description: formData.description || undefined,
          },
          {
            accountId: formData.creditAccount,
            debit: 0,
            credit: parsedAmount,
            description: formData.description || undefined,
          },
        ],
      })
      toast({ title: "Journal entry created" })
      onOpenChange(false)
      setFormData({
        voucherNo: "",
        date: new Date().toISOString().split("T")[0],
        description: "",
        debitAccount: "",
        creditAccount: "",
        amount: "",
        narration: "",
      })
    } catch (error: any) {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create journal entry"
      toast({ title: message, variant: "destructive" })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[900px] max-w-[90vw]">
        <DialogHeader>
          <DialogTitle>New Journal Entry</DialogTitle>
          <DialogDescription>Create a new general journal voucher entry</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="voucherNo">Voucher No.</Label>
              <Input
                id="voucherNo"
                placeholder="Auto-generated"
                disabled
                value={`JV${Date.now().toString().slice(-6)}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="e.g., Depreciation entry"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="debitAccount">Debit Account</Label>
              <Select
                value={formData.debitAccount}
                onValueChange={(value) => setFormData({ ...formData, debitAccount: value })}
              >
                <SelectTrigger id="debitAccount">
                  <SelectValue placeholder={loadingAccounts ? "Loading accounts..." : "Select account"} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.length === 0 ? (
                    <SelectItem value="none" disabled>No accounts available</SelectItem>
                  ) : (
                    accounts.map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>
                        {(a.name || "Account")} ({a.code})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditAccount">Credit Account</Label>
              <Select
                value={formData.creditAccount}
                onValueChange={(value) => setFormData({ ...formData, creditAccount: value })}
              >
                <SelectTrigger id="creditAccount">
                  <SelectValue placeholder={loadingAccounts ? "Loading accounts..." : "Select account"} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.length === 0 ? (
                    <SelectItem value="none" disabled>No accounts available</SelectItem>
                  ) : (
                    accounts.map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>
                        {(a.name || "Account")} ({a.code})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="narration">Narration</Label>
            <Textarea
              id="narration"
              placeholder="Additional notes..."
              value={formData.narration}
              onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Entry</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
