"use client"

import type React from "react"
import { useState, useEffect } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { apiService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface AddAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddAccountDialog({ open, onOpenChange }: AddAccountDialogProps) {
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    type: "Asset",
    description: "",
    parentId: "",
    isPostable: true,
    cashFlowCategory: "",
  })
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      fetchAccounts()
      // Reset form when dialog opens
      setFormData({
        code: "",
        name: "",
        type: "Asset",
        description: "",
        parentId: "",
        isPostable: true,
        cashFlowCategory: "",
      })
    }
  }, [open])

  const fetchAccounts = async () => {
    try {
      const res = await apiService.accounts.getAll()
      const accData = res.data as any
      const accountsData = Array.isArray(accData?.data) ? accData.data : Array.isArray(accData) ? accData : []
      setAccounts(accountsData)
    } catch (error) {
      console.error("Failed to fetch accounts:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      const payload: any = {
        code: formData.code,
        name: formData.name,
        type: formData.type,
        description: formData.description || null,
        isPostable: formData.isPostable,
      }
      
      if (formData.parentId) {
        payload.parentId = formData.parentId
      }
      
      if (formData.cashFlowCategory) {
        payload.cashFlowCategory = formData.cashFlowCategory
      }
      
      await apiService.accounts.create(payload)
      toast({ title: "Account created successfully" })
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: "Failed to create account",
        description: error?.response?.data?.error || error?.message || "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-[90vw] md:w-[900px] max-w-[95vw] sm:max-w-[90vw] md:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>Add New Account</DialogTitle>
          <DialogDescription>Create a new account in the chart of accounts</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="code">Account Code *</Label>
                <Input
                  id="code"
                  placeholder="1000, 1001, etc."
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Unique code (e.g., 1000 for parent, 1001 for child)
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Account Name *</Label>
                <Input
                  id="name"
                  placeholder="Cash Account, Operating Bank, etc."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Account Type *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asset">Asset</SelectItem>
                    <SelectItem value="Liability">Liability</SelectItem>
                    <SelectItem value="Equity">Equity</SelectItem>
                    <SelectItem value="Revenue">Revenue</SelectItem>
                    <SelectItem value="Expense">Expense</SelectItem>
                    <SelectItem value="Receivable">Receivable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="parentId">Parent Account (Optional)</Label>
                <Select 
                  value={formData.parentId || "root"} 
                  onValueChange={(value) => setFormData({ ...formData, parentId: value === "root" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="root">None (Root Account)</SelectItem>
                    {accounts
                      .filter((acc) => acc.type === formData.type || !formData.type)
                      .map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select a parent account to create a child account
                </p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Account description and usage notes"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cashFlowCategory">Cash Flow Category</Label>
                <Select 
                  value={formData.cashFlowCategory || "none"} 
                  onValueChange={(value) => setFormData({ ...formData, cashFlowCategory: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="Operating">Operating Activities</SelectItem>
                    <SelectItem value="Investing">Investing Activities</SelectItem>
                    <SelectItem value="Financing">Financing Activities</SelectItem>
                    <SelectItem value="Escrow">Escrow (Client Funds)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <Checkbox
                  id="isPostable"
                  checked={formData.isPostable}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPostable: checked as boolean })}
                />
                <Label htmlFor="isPostable" className="text-sm font-normal cursor-pointer">
                  Postable Account
                </Label>
                <p className="text-xs text-muted-foreground ml-2">
                  (Uncheck for summary/parent accounts)
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Add Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
