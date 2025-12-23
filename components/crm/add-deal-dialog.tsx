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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { apiService } from "@/lib/api"
import { DealToasts } from "@/lib/toast-utils"
import { Loader2, Paperclip, Upload, File, Trash2 } from "lucide-react"

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
  attachments?: { name: string; url: string; type: string; size: number }[]
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

  tid?: string
  propertyCode?: string
  status?: string
  salePrice?: number
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
  attachments: [] as { name: string; url: string; type: string; size: number }[],
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
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { toast } = useToast()
  const isEdit = mode === "edit" && initialData?.id
  const { options: stageOverrides } = useDropdownOptions("deal.stage")
  const { options: statusOverrides } = useDropdownOptions("deal.status")
  const stageOptions = stageOverrides.length ? stageOverrides : FALLBACK_STAGE_OPTIONS
  const statusOptions = statusOverrides.length ? statusOverrides : FALLBACK_STATUS_OPTIONS
  const selectedProperty = properties.find((p) => p.id === formData.propertyId)

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()

    const loadClients = async () => {
      try {
        setLoadingClients(true)
        const response = await apiService.clients.getAll(undefined, { signal: controller.signal })
        const responseData = response.data as any
        // Handle nested data structure: response.data.data or response.data
        const data = Array.isArray(responseData?.data) ? responseData.data : Array.isArray(responseData) ? responseData : []

        if (!controller.signal.aborted) {
          setClients(
            data
              .map((client: any) => ({
                id: String(client.id || ''),
                name: String(client.name || client.id || ''),
              }))
              .filter((client: { id: string, name: string }) => client.id && client.name) // Filter out invalid clients
          )
        }
      } catch (error) {

        if (controller.signal.aborted) return
        console.error("Failed to load clients", error)
        toast({ title: "Failed to load clients", variant: "destructive" })
      } finally {
        if (!controller.signal.aborted) {
          setLoadingClients(false)
        }
      }
    }

    const loadProperties = async () => {
      try {
        setLoadingProperties(true)
        const response = await apiService.properties.getAll(undefined, { signal: controller.signal })
        const responseData = response.data as any
        const payload = Array.isArray(responseData?.data) ? responseData.data : Array.isArray(responseData) ? responseData : []

        if (!controller.signal.aborted) {
          setProperties(
            payload
              .map((property: any) => ({
                id: String(property.id || ''),
                tid: property.tid ? String(property.tid) : undefined,
                name: String(property.name || property.id || ''),
                propertyCode: property.propertyCode ? String(property.propertyCode) : undefined,
                status: property.status ? String(property.status) : undefined,
                salePrice: property.salePrice ? Number(property.salePrice) : undefined,
              }))
              .filter((property: { id: string, name: string }) => property.id && property.name) // Filter out invalid properties
          )
        }
      } catch (error) {

        if (controller.signal.aborted) return
        console.error("Failed to load properties", error)
        toast({ title: "Failed to load properties", variant: "destructive" })
      } finally {
        if (!controller.signal.aborted) {
          setLoadingProperties(false)
        }
      }
    }

    loadClients()
    loadProperties()

    return () => controller.abort()
  }, [open])

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
          attachments: Array.isArray((initialData as any).attachments?.files) ? (initialData as any).attachments.files : [],
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
    setUploading(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      const newAttachments: { name: string; url: string; type: string; size: number }[] = []
      const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

      for (const file of Array.from(files)) {
        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds the maximum size of 10MB`,
            variant: "destructive"
          })
          continue
        }

        // Convert file to base64 for storage (for small files)
        // For production, you'd upload to cloud storage and store URL
        const reader = new FileReader()
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        newAttachments.push({
          name: file.name,
          url: base64,
          type: file.type,
          size: file.size,
        })
      }

      if (newAttachments.length > 0) {
        setFormData(prev => ({
          ...prev,
          attachments: [...prev.attachments, ...newAttachments]
        }))

        toast({ title: `${newAttachments.length} file(s) added` })
      } else {
        toast({
          title: "No files added",
          description: "All selected files were too large",
          variant: "destructive"
        })
      }
    } catch (err) {
      console.error("Failed to upload file:", err)
      toast({ title: "Failed to upload file", variant: "destructive" })
    } finally {
      setUploading(false)
      e.target.value = "" // Reset input
    }
  }

  const removeAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}



    // Title is optional now, will be auto-generated if missing
    // if (!formData.title || formData.title.trim() === "") {
    //   newErrors.title = "Deal title is required"
    // }

    if (!formData.clientId || formData.clientId.trim() === "") {
      newErrors.clientId = "Please select a client"
    }

    if (!formData.propertyId || formData.propertyId.trim() === "") {
      newErrors.propertyId = "Please select a property"
    }

    const dealAmount = Number.parseFloat(formData.dealAmount || "0")
    if (isNaN(dealAmount) || dealAmount <= 0) {
      newErrors.dealAmount = "Deal amount must be a valid number greater than 0"
    }

    // Validate against property sale price if available
    if (selectedProperty?.salePrice !== undefined && selectedProperty?.salePrice !== null) {
      const salePriceValue = Number(selectedProperty.salePrice)
      if (!Number.isNaN(salePriceValue) && Math.abs(dealAmount - salePriceValue) > 0.01) {
        newErrors.dealAmount = "Deal amount must match the property's sales price"
      }
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

      const autoTitle = formData.title?.trim() || (selectedProperty?.tid ? `Deal for ${selectedProperty.tid}` : (selectedProperty?.name ? `Deal for ${selectedProperty.name}` : "New Deal"))

      const dealAmount = Number.parseFloat(formData.dealAmount?.toString() || "0")
      const payload = {
        title: autoTitle,
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

      // Add attachments if any
      if (formData.attachments && formData.attachments.length > 0) {
        ; (payload as any).attachments = {
          files: formData.attachments
        }
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
          const errorMsg = (apiError as any)?.message || (apiError as any)?.error || JSON.stringify(apiError)
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
                placeholder="e.g., Commercial Property Sale (Optional)"
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value })
                  if (errors.title) setErrors({ ...errors, title: "" })
                }}
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
              <Label htmlFor="propertyId">Property *</Label>
              <Command className="border rounded-md">
                <CommandInput placeholder="Search by TID or Name..." />
                <CommandList>
                  <CommandEmpty>No properties found.</CommandEmpty>
                  <CommandGroup>
                    {properties.map((property) => (
                      <CommandItem
                        key={property.id}
                        value={`${property.tid || ''} ${property.name}`}
                        onSelect={() => {
                          const value = property.id;
                          if (value === "no-properties") return

                          const salePrice = property?.salePrice
                          setFormData({
                            ...formData,
                            propertyId: value,
                            dealAmount: salePrice !== undefined && salePrice !== null ? salePrice.toString() : formData.dealAmount,
                          })
                          if (errors.propertyId) setErrors({ ...errors, propertyId: "" })
                        }}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{property.tid || "No TID"} - {property.name}</span>
                          <span className="text-xs text-muted-foreground">{property.status || "Unknown Status"}</span>
                        </div>
                        {formData.propertyId === property.id && (
                          <span className="ml-auto text-primary">✓</span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
              {errors.propertyId && <p className="text-sm text-destructive">{errors.propertyId}</p>}
              {selectedProperty && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedProperty.tid || "No TID"} - {selectedProperty.name}
                </p>
              )}
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
                readOnly={!!selectedProperty?.salePrice}
                className={`${errors.dealAmount ? "border-destructive" : ""} ${selectedProperty?.salePrice ? "bg-muted" : ""}`}
              />
              {errors.dealAmount && <p className="text-sm text-destructive">{errors.dealAmount}</p>}
              {selectedProperty?.salePrice !== undefined && selectedProperty?.salePrice !== null && (
                <p className="text-xs text-muted-foreground">
                  Sales Price: Rs {Number(selectedProperty.salePrice).toLocaleString("en-IN")} (locked)
                </p>
              )}
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

            {/* Attachments Section */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments
              </Label>
              <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="deal-attachments"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.xls,.xlsx"
                />
                <label
                  htmlFor="deal-attachments"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {uploading ? "Uploading..." : "Click to upload files (PDF, DOC, Images, Excel)"}
                  </span>
                </label>
              </div>

              {formData.attachments.length > 0 && (
                <div className="space-y-2">
                  {formData.attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <File className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
        </form >
      </DialogContent >
    </Dialog >
  )
}
