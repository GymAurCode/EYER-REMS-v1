"use client"

import type React from "react"

import { useEffect, useState } from "react"
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
import { apiService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface ClientFormData {
  id?: string
  name?: string
  email?: string
  phone?: string
  company?: string
  status?: string
  cnic?: string
  address?: string
}

interface AddClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  initialData?: ClientFormData | null
  mode?: "create" | "edit"
}

const CLIENT_STATUSES = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "VIP", value: "vip" },
]

const defaultFormState = {
  name: "",
  email: "",
  phone: "",
  company: "",
  status: "active",
  cnic: "",
  address: "",
}

export function AddClientDialog({
  open,
  onOpenChange,
  onSuccess,
  initialData = null,
  mode = "create",
}: AddClientDialogProps) {
  const [formData, setFormData] = useState(defaultFormState)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  const isEdit = mode === "edit" && initialData?.id

  useEffect(() => {
    if (open) {
      if (isEdit && initialData) {
        setFormData({
          name: initialData.name || "",
          email: initialData.email || "",
          phone: initialData.phone || "",
          company: initialData.company || "",
          status: initialData.status || "active",
          cnic: initialData.cnic || "",
          address: initialData.address || "",
        })
      } else {
        setFormData(defaultFormState)
      }
    }
  }, [open, isEdit, initialData])

  const resetForm = () => {
    setFormData(defaultFormState)
    setSubmitting(false)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      setSubmitting(true)

      const payload = {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        company: formData.company || null,
        status: formData.status || "active",
        cnic: formData.cnic || null,
        address: formData.address || null,
      }

      if (isEdit) {
        await apiService.clients.update(initialData!.id as any, payload)
        toast({ title: "Client updated successfully" })
      } else {
        await apiService.clients.create(payload)
        toast({ title: "Client added successfully" })
      }

      resetForm()
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("Failed to save client", error)
      toast({ title: `Failed to ${isEdit ? "update" : "add"} client`, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm()
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[700px] max-w-[90vw]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Client" : "Add New Client"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update client information" : "Capture client information to start tracking their deals."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="client-name">Client Name</Label>
              <Input
                id="client-name"
                placeholder="Jane Smith"
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client-email">Email</Label>
              <Input
                id="client-email"
                type="email"
                placeholder="jane.smith@email.com"
                value={formData.email}
                onChange={(event) => setFormData({ ...formData, email: event.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client-phone">Phone</Label>
              <Input
                id="client-phone"
                type="tel"
                placeholder="+1 234 567 8900"
                value={formData.phone}
                onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client-company">Company</Label>
              <Input
                id="client-company"
                placeholder="Company name (optional)"
                value={formData.company}
                onChange={(event) => setFormData({ ...formData, company: event.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client-status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger id="client-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client-cnic">CNIC</Label>
              <Input
                id="client-cnic"
                placeholder="12345-1234567-1"
                value={formData.cnic}
                onChange={(event) => setFormData({ ...formData, cnic: event.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client-address">Address</Label>
              <Input
                id="client-address"
                placeholder="Enter client address"
                value={formData.address}
                onChange={(event) => setFormData({ ...formData, address: event.target.value })}
              />
            </div>
            <div className="rounded-md border border-dashed border-muted px-4 py-3 text-sm text-muted-foreground">
              Properties are now linked through Deals. Create or update a deal whenever you want to attach this client to a property.
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : isEdit ? "Save Changes" : "Add Client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

