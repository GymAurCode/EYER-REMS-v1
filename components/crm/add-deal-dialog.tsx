"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { useDropdownOptions } from "@/hooks/use-dropdowns"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { apiService } from "@/lib/api"
import { DealToasts, showErrorToast } from "@/lib/toast-utils"

interface DealFormData {
  id?: string
  title?: string
  clientId?: string | null
  propertyId?: string | null
  role?: string | null
  dealAmount?: number | string | null
  stage?: string | null
  status?: string | null
  dealDate?: string | null
  description?: string | null
  dueDate?: string | null
}

interface AddDealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  initialData?: DealFormData | null
  mode?: "create" | "edit"
}

type ClientOption = {
  id: string
  name: string
}

type PropertyOption = {
  id: string
  name: string
  propertyCode?: string
}

const FALLBACK_STAGE_OPTIONS = [
  { label: "Prospecting", value: "prospecting" },
  { label: "Qualified", value: "qualified" },
  { label: "Proposal", value: "proposal" },
  { label: "Negotiation", value: "negotiation" },
  { label: "Closing", value: "closing" },
  { label: "Closed Won", value: "closed-won" },
  { label: "Closed Lost", value: "closed-lost" },
]

const ROLE_OPTIONS = [
  { label: "Buyer", value: "buyer" },
  { label: "Seller", value: "seller" },
  { label: "Tenant", value: "tenant" },
  { label: "Landlord", value: "landlord" },
  { label: "Investor", value: "investor" },
  { label: "Partner", value: "partner" },
]

const FALLBACK_STATUS_OPTIONS = [
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Won", value: "won" },
  { label: "Lost", value: "lost" },
  { label: "Cancelled", value: "cancelled" },
]

const defaultFormState = {
  title: "",
  clientId: "",
  propertyId: "",
  role: "buyer",
  dealAmount: "",
  stage: "prospecting",
  status: "open",
  dealDate: new Date().toISOString().split("T")[0],
  description: "",
  dueDate: "",
  systemId: "",
  manualUniqueId: "",
}

export function AddDealDialog({
  open,
  onOpenChange,
  onSuccess,
  initialData = null,
  mode = "create",
}: AddDealDialogProps) {
  const [formData, setFormData] = useState(defaultFormState)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [loadingProperties, setLoadingProperties] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { toast } = useToast()
  const isEdit = mode === "edit" && initialData?.id
  const { options: stageOverrides } = useDropdownOptions("deal.stage")
  const { options: statusOverrides } = useDropdownOptions("deal.status")
  const stageOptions = stageOverrides.length ? stageOverrides : FALLBACK_STAGE_OPTIONS
  const statusOptions = statusOverrides.length ? statusOverrides : FALLBACK_STATUS_OPTIONS

  useEffect(() => {
    if (!open) return

    const loadClients = async () => {
      try {
        setLoadingClients(true)
        const response = await apiService.clients.getAll()
        const data = Array.isArray(response.data) ? response.data : []
        setClients(
          data.map((client: any) => ({
            id: client.id,
            name: client.name,
          })),
        )
      } catch (error) {
        console.error("Failed to load clients", error)
        toast({ title: "Failed to load clients", variant: "destructive" })
      } finally {
        setLoadingClients(false)
      }
    }

    const loadProperties = async () => {
      try {
        setLoadingProperties(true)
        const response = await apiService.properties.getAll()
        const responseData = response.data as any
        const payload = Array.isArray(responseData?.data) ? responseData.data : Array.isArray(responseData) ? responseData : []
        setProperties(
          payload.map((property: any) => ({
            id: property.id,
            name: property.name,
            propertyCode: property.propertyCode,
          })),
        )
      } catch (error) {
        console.error("Failed to load properties", error)
        toast({ title: "Failed to load properties", variant: "destructive" })
      } finally {
        setLoadingProperties(false)
      }
    }

    loadClients()
    loadProperties()
  }, [open, toast])

  useEffect(() => {
    if (!open) return
    const stageValid = stageOverrides.some((option) => option.value === formData.stage)
    if (!stageValid && stageOverrides.length) {
      setFormData((prev) => ({ ...prev, stage: stageOverrides[0].value }))
    }

    const statusValid = statusOverrides.some((option) => option.value === formData.status)
    if (!statusValid && statusOverrides.length) {
      setFormData((prev) => ({ ...prev, status: statusOverrides[0].value }))
    }
  }, [open, formData.stage, formData.status, stageOverrides, statusOverrides])

  useEffect(() => {
    if (open) {
      if (isEdit && initialData) {
        const existingClientId =
          initialData.clientId !== undefined && initialData.clientId !== null
            ? String(initialData.clientId)
            : ""

        setFormData({
          title: initialData.title || "",
          clientId: existingClientId,
          propertyId:
            initialData.propertyId !== undefined && initialData.propertyId !== null
              ? String(initialData.propertyId)
              : "",
          role: initialData.role || "buyer",
          dealAmount:
            initialData.dealAmount !== undefined && initialData.dealAmount !== null
              ? initialData.dealAmount.toString()
              : "",
          stage: initialData.stage || "prospecting",
          status: initialData.status || "open",
          dealDate: initialData.dealDate ? initialData.dealDate.split("T")[0] : new Date().toISOString().split("T")[0],
          description: initialData.description || "",
          dueDate: initialData.dueDate ? initialData.dueDate.split("T")[0] : "",
          systemId: "",
          manualUniqueId: "",
        })
      } else {
        setFormData(defaultFormState)
      }
    }
  }, [open, isEdit, initialData])

  const resetForm = () => {
    setFormData(defaultFormState)
    setErrors({})
    setSubmitting(false)
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title || formData.title.trim() === "") {
      newErrors.title = "Deal title is required"
    }

    if (!formData.clientId || formData.clientId.trim() === "") {
      newErrors.clientId = "Please select a client"
    }

    if (!formData.propertyId || formData.propertyId.trim() === "") {
      newErrors.propertyId = "Please select a property"
    }

    const dealAmount = Number.parseFloat(formData.dealAmount || "0")
    if (!formData.dealAmount || formData.dealAmount.trim() === "" || isNaN(dealAmount) || dealAmount <= 0) {
      newErrors.dealAmount = "Deal amount must be greater than 0"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form before submitting
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      setErrors({})

      const dealAmount = Number.parseFloat(formData.dealAmount || "0")
      const payload = {
        title: formData.title.trim(),
        clientId: formData.clientId,
        propertyId: formData.propertyId,
        role: formData.role || "buyer",
        dealAmount: dealAmount,
        stage: formData.stage,
        status: formData.status,
        dealDate: formData.dealDate ? new Date(formData.dealDate).toISOString() : undefined,
        expectedClosingDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        notes: formData.description || undefined,
      }

      if (isEdit) {
        const response: any = await apiService.deals.update(initialData!.id!, payload)
        DealToasts.updated(formData.title || "Deal")
      } else {
        const response: any = await apiService.deals.create(payload)
        DealToasts.created(formData.title || "Deal")
      }
      onOpenChange(false)
      resetForm()
      onSuccess?.()
    } catch (err: any) {
      console.error("Failed to save deal", err)

      // Extract validation errors from API response
      if (err.response?.data?.error) {
        const apiError = err.response.data.error
        if (Array.isArray(apiError)) {
          // Zod validation errors
          const validationErrors: Record<string, string> = {}
          apiError.forEach((error: any) => {
            const field = error.path?.[0] || "general"
            validationErrors[field] = error.message || "Invalid value"
          })
          setErrors(validationErrors)
          toast({
            title: "Validation Error",
            description: "Please check the form for errors",
            variant: "destructive",
          })
        } else if (typeof apiError === "string") {
          toast({
            title: "Error",
            description: apiError,
            variant: "destructive",
          })
        } else if (typeof apiError === "object") {
          // Handle error object - extract message
          const errorMsg = apiError?.message || apiError?.error || JSON.stringify(apiError)
          toast({
            title: "Error",
            description: String(errorMsg),
            variant: "destructive",
          })
        } else {
          DealToasts.error(`Failed to ${isEdit ? "update" : "create"} deal`)
        }
      } else {
        DealToasts.error(`Failed to ${isEdit ? "update" : "create"} deal`)
      }
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
      <DialogContent className="w-[900px] max-w-[90vw]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Deal" : "Add New Deal"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the deal details" : "Create a new deal in the pipeline"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              <Label htmlFor="title">Deal Title</Label>
              <Input
                id="title"
                placeholder="e.g., Commercial Property Sale"
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value })
                  if (errors.title) setErrors({ ...errors, title: "" })
                }}
                required
                className={errors.title ? "border-destructive" : ""}
              />
              {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="clientId">Client</Label>
              <Select
                value={formData.clientId}
                onValueChange={(value) => {
                  setFormData({ ...formData, clientId: value })
                  if (errors.clientId) setErrors({ ...errors, clientId: "" })
                }}
                disabled={loadingClients}
              >
                <SelectTrigger className={errors.clientId ? "border-destructive" : ""}>
                  <SelectValue placeholder={loadingClients ? "Loading clients..." : "Select client"} />
                </SelectTrigger>
                <SelectContent>
                  {clients.length === 0 && !loadingClients ? (
                    <SelectItem value="no-clients" disabled>
                      No clients available
                    </SelectItem>
                  ) : (
                    clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.clientId && <p className="text-sm text-destructive">{errors.clientId}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="propertyId">Property</Label>
              <Select
                value={formData.propertyId}
                onValueChange={(value) => {
                  setFormData({ ...formData, propertyId: value })
                  if (errors.propertyId) setErrors({ ...errors, propertyId: "" })
                }}
                disabled={loadingProperties}
              >
                <SelectTrigger className={errors.propertyId ? "border-destructive" : ""}>
                  <SelectValue placeholder={loadingProperties ? "Loading properties..." : "Select property"} />
                </SelectTrigger>
                <SelectContent>
                  {properties.length === 0 && !loadingProperties ? (
                    <SelectItem value="no-properties" disabled>
                      No properties available
                    </SelectItem>
                  ) : (
                    properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.name} {property.propertyCode ? `(${property.propertyCode})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.propertyId && <p className="text-sm text-destructive">{errors.propertyId}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Client Role</Label>
              <Select value={formData.role ?? "buyer"} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dealAmount">Deal Amount</Label>
              <Input
                id="dealAmount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="500000"
                value={formData.dealAmount}
                onChange={(e) => {
                  setFormData({ ...formData, dealAmount: e.target.value })
                  if (errors.dealAmount) setErrors({ ...errors, dealAmount: "" })
                }}
                required
                className={errors.dealAmount ? "border-destructive" : ""}
              />
              {errors.dealAmount && <p className="text-sm text-destructive">{errors.dealAmount}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dealDate">Deal Date</Label>
              <Input
                id="dealDate"
                type="date"
                value={formData.dealDate}
                onChange={(e) => setFormData({ ...formData, dealDate: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stage">Stage</Label>
              <Select value={formData.stage} onValueChange={(value) => setFormData({ ...formData, stage: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stageOptions.map((stage) => (
                    <SelectItem key={stage.value} value={stage.value}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status ?? "open"} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Deal details and notes"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Expected Closing Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || (loadingClients && clients.length === 0)}>
              {submitting ? "Saving..." : isEdit ? "Save Changes" : "Add Deal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
