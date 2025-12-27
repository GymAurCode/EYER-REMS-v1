"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Plus, Trash2, Upload, X, FileText, Image as ImageIcon, RefreshCw } from "lucide-react"
import { apiService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useDropdownOptions } from "@/hooks/use-dropdowns"

type PropertyForm = {
  tid: string // Transaction ID - unique across Property, Deal, Client
  type: string
  status: string
  category: string
  size: string
  address: string
  location: string
  locationId: string | null
  subsidiaryOptionId: string | null
  salePrice: string
  totalArea: string
  totalUnits: string
  yearBuilt: string
  dealerId: string
  amenities: string[]
  description: string
  imageUrl: string
}

const DEFAULT_FORM: PropertyForm = {
  tid: "",
  type: "",
  status: "Active",
  category: "",
  size: "",
  address: "",
  location: "",
  locationId: null,
  subsidiaryOptionId: null,
  salePrice: "",
  totalArea: "",
  totalUnits: "",
  yearBuilt: "",
  dealerId: "",
  amenities: [],
  description: "",
  imageUrl: "",
}

type AddPropertyDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyId?: string | number | null
  onSuccess?: () => void
}

type DropdownKey = "property.type" | "property.category" | "property.status" | "property.size" | "property.location"

const DROPDOWN_LABELS: Record<DropdownKey, string> = {
  "property.type": "Type",
  "property.category": "Category",
  "property.status": "Status",
  "property.size": "Size",
  "property.location": "Location",
}

function ManagedDropdown({
  dropdownKey,
  value,
  onChange,
  required = false,
}: {
  dropdownKey: DropdownKey
  value: string
  onChange: (val: string) => void
  required?: boolean
}) {
  const { options, isLoading, isError, mutate } = useDropdownOptions(dropdownKey)
  const { toast } = useToast()
  const [newLabel, setNewLabel] = useState("")
  const [saving, setSaving] = useState(false)
  const [localOptions, setLocalOptions] = useState<any[]>([])

  // Default fallback options when API fails or returns empty
  const getDefaultOptions = () => {
    switch (dropdownKey) {
      case "property.type":
        return [
          { id: "residential", label: "Residential", value: "residential" },
          { id: "commercial", label: "Commercial", value: "commercial" },
          { id: "industrial", label: "Industrial", value: "industrial" },
          { id: "land", label: "Land", value: "land" },
        ]
      case "property.status":
        return [
          { id: "active", label: "Active", value: "Active" },
          { id: "inactive", label: "Inactive", value: "Inactive" },
          { id: "maintenance", label: "Maintenance", value: "Maintenance" },
        ]
      case "property.category":
        return [
          { id: "apartment", label: "Apartment", value: "apartment" },
          { id: "house", label: "House", value: "house" },
          { id: "villa", label: "Villa", value: "villa" },
          { id: "plot", label: "Plot", value: "plot" },
          { id: "shop", label: "Shop", value: "shop" },
          { id: "office", label: "Office", value: "office" },
        ]
      case "property.size":
        return [
          { id: "small", label: "Small", value: "small" },
          { id: "medium", label: "Medium", value: "medium" },
          { id: "large", label: "Large", value: "large" },
        ]
      case "property.location":
        return [] // No default options - locations must be added via Advanced Options
      default:
        return []
    }
  }

  // Combine API options with local options, avoid duplicates
  const allOptions = useMemo(() => {
    const defaultOpts = getDefaultOptions()
    const apiOpts = options || []
    const localOpts = localOptions || []

    // Combine and deduplicate by value
    const combined = [...defaultOpts, ...apiOpts, ...localOpts]
    const unique = combined.filter((option, index, self) =>
      index === self.findIndex(o => o.value === option.value)
    )

    return unique
  }, [options, localOptions, dropdownKey])

  // Force re-render when options change by updating a version counter
  // Force re-render when options change by updating a version counter
  // Removed to prevent infinite loop - React handles this automatically
  // const [optionsVersion, setOptionsVersion] = useState(0)

  // useEffect(() => {
  //   setOptionsVersion(prev => prev + 1)
  // }, [allOptions])

  const addOption = async () => {
    if (!newLabel.trim()) return

    const newValue = newLabel.trim()
    const newOption = {
      id: `local-${Date.now()}`,
      label: newValue,
      value: newValue,
    }

    setSaving(true)

    // Add locally first for immediate feedback
    setLocalOptions(prev => [...prev, newOption])
    setNewLabel("")

    // Only try API if we can attempt it
    if (canAttemptAPI) {
      try {
        await apiService.advanced.createOption(dropdownKey, {
          label: newValue,
          value: newValue,
        })

        // If API succeeds, refresh the options and remove the local one
        await mutate()
        setLocalOptions(prev => prev.filter(opt => opt.id !== newOption.id))
        toast({ title: "Option added", description: `${newValue} created` })

      } catch (error: any) {
        // If API fails, keep the local option and show message
        if (error?.response?.status === 404) {
          toast({
            title: "Option added locally",
            description: `${newValue} added (server endpoint not available)`
          })
        } else if (error?.response?.status === 401 || error?.response?.status === 403) {
          toast({
            title: "Option added locally",
            description: `${newValue} added (admin access required for server sync)`
          })
        } else {
          toast({
            title: "Option added locally",
            description: `${newValue} added (server sync failed: ${error?.message || 'Unknown error'})`
          })
        }
      }
    } else {
      // No admin access, just show local success message
      toast({
        title: "Option added locally",
        description: `${newValue} added (admin access required for server sync)`
      })
    }

    setSaving(false)
  }

  const removeOption = async (id: string) => {
    const optionToRemove = allOptions.find(opt => opt.id === id)
    if (!optionToRemove) return

    // Always remove from local options first
    setLocalOptions(prev => prev.filter(opt => opt.id !== id))

    // Only try API for non-local options and if we can attempt it
    if (!id.startsWith('local-') && canAttemptAPI) {
      try {
        await apiService.advanced.deleteOption(id)
        await mutate()
        toast({ title: "Option removed" })
      } catch (error: any) {
        if (error?.response?.status === 404) {
          toast({ title: "Option removed locally", description: "Server endpoint not available" })
        } else if (error?.response?.status === 401 || error?.response?.status === 403) {
          toast({ title: "Option removed locally", description: "Admin access required for server sync" })
        } else {
          toast({ title: "Option removed locally", description: "Server sync failed" })
        }
      }
    } else {
      // Local-only removal
      if (id.startsWith('local-')) {
        toast({ title: "Option removed locally" })
      } else {
        toast({ title: "Option removed locally", description: "Admin access required for server removal" })
      }
    }
  }

  // Always use local options for property dropdowns to avoid API errors
  const canAttemptAPI = false

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-muted-foreground">
          {DROPDOWN_LABELS[dropdownKey]} {required && <span className="text-destructive">*</span>}
        </Label>
        {canAttemptAPI && (
          <div className="flex items-center gap-2">
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Add option"
              className="h-8 w-32"
            />
            <Button type="button" size="sm" variant="outline" disabled={!newLabel.trim() || saving} onClick={addOption}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>

      <Select value={value} onValueChange={onChange} disabled={isLoading}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={`Select ${DROPDOWN_LABELS[dropdownKey]}`} />
        </SelectTrigger>
        <SelectContent>
          {allOptions.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              {dropdownKey === "property.location"
                ? "No locations available. Add locations in Advanced Options."
                : "No options available"}
            </div>
          ) : (
            allOptions.map((opt) => (
              <div key={opt.id} className="flex items-center justify-between px-2">
                <SelectItem value={opt.value}>
                  {dropdownKey === "property.location" && opt.label.includes(">") ? (
                    <span className="flex items-center gap-1">
                      {opt.label.split(">").map((part: string, idx: number, arr: string[]) => (
                        <span key={idx}>
                          <span className="font-medium">{part.trim()}</span>
                          {idx < arr.length - 1 && <span className="text-muted-foreground mx-1">›</span>}
                        </span>
                      ))}
                    </span>
                  ) : (
                    opt.label
                  )}
                </SelectItem>
                {canAttemptAPI && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      removeOption(opt.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          )}
        </SelectContent>
      </Select>

      {/* Show info message */}
      {localOptions.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {localOptions.length} custom option(s) added locally
        </p>
      )}
      {dropdownKey === "property.location" && (!options || options.length === 0) && localOptions.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No locations available. Add locations in Advanced Options (e.g., "Country &gt; State &gt; City").
        </p>
      )}
      {dropdownKey !== "property.location" && (!options || options.length === 0) && (
        <p className="text-xs text-muted-foreground">
          Using default options. Admin can customize in Advanced Settings.
        </p>
      )}
    </div>
  )
}

export function AddPropertyDialog({ open, onOpenChange, propertyId, onSuccess }: AddPropertyDialogProps) {
  const { toast } = useToast()
  const [form, setForm] = useState<PropertyForm>(DEFAULT_FORM)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dealers, setDealers] = useState<{ id: string; name: string }[]>([])
  const [amenities, setAmenities] = useState<{ id: string; name: string }[]>([])
  const [propertyData, setPropertyData] = useState<any>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<Record<string, string>>({
    asset: "",
    expense: "",
    income: "",
    scrap: "",
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [subsidiaryOptions, setSubsidiaryOptions] = useState<Array<{ id: string; name: string }>>([])
  const [loadingSubsidiaries, setLoadingSubsidiaries] = useState(false)
  const [leafLocations, setLeafLocations] = useState<Array<{ id: string; path: string }>>([])
  const [loadingLocations, setLoadingLocations] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [locationLoadTimeout, setLocationLoadTimeout] = useState(false)
  const [attachments, setAttachments] = useState<Array<{ id?: string; url: string; name: string; mimeType?: string }>>([])
  const [uploadingAttachments, setUploadingAttachments] = useState(false)
  const isEdit = Boolean(propertyId)

  // Load leaf locations when dialog opens
  useEffect(() => {
    if (open) {
      const loadLeafLocations = async () => {
        setLoadingLocations(true)
        setLocationError(null)
        setLocationLoadTimeout(false)

        try {
          const response = await apiService.locations.getLeaves()
          const data = (response.data as any)?.data || response.data || []
          setLeafLocations(Array.isArray(data) ? data : [])
        } catch (error: any) {
          console.error('Failed to load leaf locations:', error)
          setLocationError('Failed to load locations')
          setLeafLocations([])
        } finally {
          setLoadingLocations(false)
        }
      }

      loadLeafLocations()

      // Set a timeout to prevent infinite loading
      const timeout = setTimeout(() => {
        if (loadingLocations) {
          setLocationLoadTimeout(true)
        }
      }, 10000) // 10 second timeout

      return () => {
        clearTimeout(timeout)
        setLocationLoadTimeout(false)
      }
    } else {
      setLeafLocations([])
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setSelectedAccountId({
        asset: "",
        expense: "",
        income: "",
        scrap: "",
      })
      setImagePreview(null)
      setAttachments([])
      return
    }

    // Add a small delay to debounce rapid open/close actions
    const timeoutId = setTimeout(async () => {
      try {
        setLoading(true)
        const [dealerRes, amenityRes, accountsRes] = await Promise.all([
          apiService.dealers.getAll(),
          apiService.advanced.getAmenities(),
          apiService.accounts.getAll(),
        ])
        const dealerPayload = dealerRes.data as any
        const amenityPayload = amenityRes.data as any
        const accountsPayload = accountsRes.data as any

        setDealers(
          Array.isArray(dealerPayload?.data ?? dealerPayload)
            ? (dealerPayload.data ?? dealerPayload).map((d: any) => ({ id: d.id, name: d.name }))
            : [],
        )
        setAmenities(
          Array.isArray(amenityPayload?.data ?? amenityPayload)
            ? (amenityPayload.data ?? amenityPayload).map((a: any) => ({ id: a.id, name: a.name }))
            : [],
        )

        const accountsData = Array.isArray(accountsPayload?.data ?? accountsPayload)
          ? (accountsPayload.data ?? accountsPayload)
          : []
        setAccounts(accountsData)

        if (propertyId) {
          const response = await apiService.properties.getById(String(propertyId))
          const payload = (response.data as any)?.data ?? response.data
          setPropertyData(payload)

          const documents = typeof payload.documents === "object" ? payload.documents : {}
          const dealerId = payload.dealerId || payload.dealer?.id || ""
          const imageUrl = payload.imageUrl || ""

          setForm({
            tid: payload.tid || "",
            type: payload.type || "",
            status: payload.status || "Active",
            category: payload.category || "",
            size: payload.size || "",
            address: payload.address || "",
            location: payload.location || "",
            locationId: payload.locationId || null,
            subsidiaryOptionId: payload.subsidiaryOptionId || null,
            salePrice: payload.salePrice?.toString() || documents.salePrice?.toString() || "",
            imageUrl: imageUrl,
            totalArea: payload.totalArea?.toString() || "",
            totalUnits: payload.totalUnits?.toString() || "",
            yearBuilt: payload.yearBuilt?.toString() || "",
            dealerId: dealerId,
            amenities: Array.isArray(payload.amenities) ? payload.amenities : documents.amenities || [],
            description: payload.description || "",
          })
          setImagePreview(imageUrl || null)

          // Log for debugging
          console.log("Property loaded:", {
            dealerId,
            dealer: payload.dealer,
            imageUrl: imageUrl ? `${imageUrl.substring(0, 50)}...` : "none"
          })

          // Load existing attachments
          try {
            const attachmentsRes = await apiService.properties.getDocuments(String(propertyId))
            const attachmentsData = (attachmentsRes.data as any)?.data || attachmentsRes.data || []
            setAttachments(Array.isArray(attachmentsData) ? attachmentsData.map((a: any) => ({
              id: a.id,
              url: a.fileUrl,
              name: a.fileName,
              mimeType: a.fileType,
            })) : [])
          } catch (err) {
            // Ignore if attachments endpoint fails
            console.warn("Failed to load attachments", err)
          }

        } else {
          setForm(DEFAULT_FORM)
          setPropertyData(null)
          setImagePreview(null)
          setAttachments([])
        }
      } catch (error: any) {
        // Don't show toast for rate limit errors, just log
        if (error.response?.status !== 429) {
          toast({ title: "Failed to load data", description: error?.message || "Unknown error", variant: "destructive" })
        }
      } finally {
        setLoading(false)
      }
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [open, propertyId, toast])

  // Load subsidiary options when location changes
  useEffect(() => {
    const loadSubsidiaries = async () => {
      if (!form.locationId) {
        setSubsidiaryOptions([])
        setForm((p) => ({ ...p, subsidiaryOptionId: null }))
        return
      }

      setLoadingSubsidiaries(true)
      try {
        const response = await apiService.subsidiaries.getOptionsByLocation(form.locationId).catch((err) => {
          console.warn('Failed to load subsidiary options:', err)
          return { data: { data: [] } }
        })
        const data = (response.data as any)?.data || response.data || []
        // Transform options - ensure it's an array
        const options = Array.isArray(data)
          ? data.map((opt: any) => ({
            id: opt.id,
            name: opt.name,
          }))
          : []
        setSubsidiaryOptions(options)

        // If current subsidiaryOptionId is not in the options, clear it
        if (form.subsidiaryOptionId && !options.find((o: any) => o.id === form.subsidiaryOptionId)) {
          setForm((p) => ({ ...p, subsidiaryOptionId: null }))
        }
      } catch (error: any) {
        // Silently fail - subsidiaries might not exist for this location
        console.warn('Error loading subsidiary options:', error)
        setSubsidiaryOptions([])
      } finally {
        setLoadingSubsidiaries(false)
      }
    }

    loadSubsidiaries()
  }, [form.locationId])


  const handleSave = async () => {
    const errors: string[] = []
    // TID is optional, so don't require it
    if (!form.type.trim()) errors.push("Type")
    if (!form.address.trim()) errors.push("Address")
    if (errors.length) {
      toast({
        title: "Missing required fields",
        description: errors.join(", "),
        variant: "destructive",
      })
      return
    }

    // Remove category and size from payload as they're not supported by server
    const { category, size, ...formWithoutCategorySize } = form

    setSaving(true)

    try {
      const formData = new FormData()
      
      // Add all fields to FormData
      formData.append('type', formWithoutCategorySize.type)
      formData.append('status', formWithoutCategorySize.status || "Active")
      formData.append('address', formWithoutCategorySize.address)
      
      if (formWithoutCategorySize.location) formData.append('location', formWithoutCategorySize.location)
      if (formWithoutCategorySize.locationId) formData.append('locationId', formWithoutCategorySize.locationId)
      if (formWithoutCategorySize.subsidiaryOptionId) formData.append('subsidiaryOptionId', formWithoutCategorySize.subsidiaryOptionId)
      if (formWithoutCategorySize.description) formData.append('description', formWithoutCategorySize.description)
      
      // Handle numeric fields - send as strings, backend will coerce
      if (formWithoutCategorySize.totalArea) formData.append('totalArea', formWithoutCategorySize.totalArea)
      if (formWithoutCategorySize.totalUnits) formData.append('totalUnits', formWithoutCategorySize.totalUnits)
      if (formWithoutCategorySize.yearBuilt) formData.append('yearBuilt', formWithoutCategorySize.yearBuilt)
      if (formWithoutCategorySize.salePrice) formData.append('salePrice', formWithoutCategorySize.salePrice)
      
      if (formWithoutCategorySize.dealerId && formWithoutCategorySize.dealerId.trim()) {
        formData.append('dealerId', formWithoutCategorySize.dealerId.trim())
      }
      
      // Handle amenities
      if (formWithoutCategorySize.amenities && formWithoutCategorySize.amenities.length > 0) {
        formData.append('amenities', JSON.stringify(formWithoutCategorySize.amenities))
      }
      
      // Handle image - if it's a URL, send as imageUrl. If we had a file object, we would append it.
      // Current implementation uploads image separately and gives us a URL.
      if (formWithoutCategorySize.imageUrl) {
        formData.append('imageUrl', formWithoutCategorySize.imageUrl)
      }
      
      // Only include TID if it's not empty
      if (formWithoutCategorySize.tid && formWithoutCategorySize.tid.trim()) {
        formData.append('tid', formWithoutCategorySize.tid.trim())
      }
      
      // Generate name
      const generatedName = formWithoutCategorySize.tid || 
        (formWithoutCategorySize.type && formWithoutCategorySize.address 
          ? `${formWithoutCategorySize.type} at ${formWithoutCategorySize.address}` 
          : "Unnamed Property")
      formData.append('name', generatedName)

      // Log payload for debugging
      console.log("Property save payload (FormData entries):", Array.from(formData.entries()))

      let createdPropertyId: string | null = null

      if (isEdit) {
        await apiService.properties.update(String(propertyId), formData)
        toast({ title: "Property updated" })
        createdPropertyId = String(propertyId)
      } else {
        const createResponse: any = await apiService.properties.create(formData)
        const createdData = createResponse?.data?.data || createResponse?.data || createResponse
        createdPropertyId = createdData?.id || createdData?.propertyId || null
        toast({ title: "Property created" })
      }

      // Upload attachments that were added but not yet saved (for new properties)
      if (createdPropertyId && attachments.length > 0) {
        const unsavedAttachments = attachments.filter(a => !a.id) // Only upload attachments without IDs
        if (unsavedAttachments.length > 0) {
          try {
            for (const attachment of unsavedAttachments) {
              if (attachment.url.startsWith('data:')) {
                // It's a base64 file, upload it
                await apiService.properties.uploadDocument(createdPropertyId, {
                  file: attachment.url,
                  filename: attachment.name,
                })
              }
            }
            toast({ title: "Attachments uploaded successfully" })
          } catch (attachError: any) {
            console.warn("Failed to upload some attachments", attachError)
            toast({
              title: "Property saved",
              description: "Some attachments failed to upload. You can add them later.",
              variant: "default",
            })
          }
        }
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Property save error:", error)
      let errorMessage = "Unknown error"

      if (error?.response?.data) {
        const errorData = error.response.data
        // Handle validation errors
        if (errorData.error && Array.isArray(errorData.error)) {
          errorMessage = errorData.error.map((e: any) =>
            typeof e === 'string' ? e : `${e.path || ''}: ${e.message || ''}`
          ).join(', ')
        } else if (errorData.error && typeof errorData.error === 'string') {
          errorMessage = errorData.error
        } else if (errorData.message) {
          errorMessage = errorData.message
        } else if (errorData.details) {
          errorMessage = Array.isArray(errorData.details)
            ? errorData.details.map((e: any) => `${e.path || ''}: ${e.message || ''}`).join(', ')
            : String(errorData.details)
        }
      } else if (error?.message) {
        errorMessage = error.message
      }

      toast({
        title: "Save failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleGenerateReport = async () => {
    if (!propertyId) return
    try {
      const response = await apiService.properties.getReport(String(propertyId))
      const blob = new Blob([response.data as Blob], { type: "application/pdf" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${(form.tid || "property").replace(/\s+/g, "-").toLowerCase()}-report.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      toast({ title: "Report failed", description: error?.message || "Unable to generate PDF", variant: "destructive" })
    }
  }

  const amenitySelected = useMemo(() => new Set(form.amenities), [form.amenities])

  const toBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      })
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive",
      })
      return
    }

    try {
      setUploadingImage(true)
      const base64 = await toBase64(file)
      const response: any = await apiService.upload.image({
        image: base64,
        filename: file.name,
      })

      // Try multiple response paths to get the image URL
      const responseData = response?.data || response
      const imageUrl =
        responseData?.data?.url ||
        responseData?.data?.data?.url ||
        responseData?.url ||
        responseData?.imageUrl ||
        (typeof responseData === 'string' ? responseData : null) ||
        base64

      if (!imageUrl || imageUrl === base64) {
        console.warn("Image upload response structure unexpected:", response)
        toast({
          title: "Warning",
          description: "Image uploaded but URL format may be incorrect. Please verify after saving.",
          variant: "default",
        })
      }

      setForm((p) => ({ ...p, imageUrl: imageUrl || "" }))
      setImagePreview(imageUrl)
      toast({ title: "Image uploaded successfully" })
    } catch (error: any) {
      console.error("Image upload error:", error)
      toast({
        title: "Failed to upload image",
        description: error?.response?.data?.error || error?.response?.data?.message || error?.message || "Upload failed",
        variant: "destructive",
      })
    } finally {
      setUploadingImage(false)
    }
  }

  const handleRemoveImage = () => {
    setForm((p) => ({ ...p, imageUrl: "" }))
    setImagePreview(null)
  }

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !files.length) return

    setUploadingAttachments(true)
    try {
      const uploads: Array<{ id?: string; url: string; name: string; mimeType?: string }> = []

      for (const file of Array.from(files)) {
        // Validate file type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        if (!allowedTypes.includes(file.type.toLowerCase())) {
          toast({
            title: "Invalid file type",
            description: `File "${file.name}" is not supported. Only PDF, JPG, PNG, GIF, and WEBP files are allowed`,
            variant: "destructive",
          })
          continue
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: `File "${file.name}" exceeds 10MB limit`,
            variant: "destructive",
          })
          continue
        }

        const base64 = await toBase64(file)

        // If editing, upload to property
        if (propertyId) {
          const response: any = await apiService.properties.uploadDocument(String(propertyId), {
            file: base64,
            filename: file.name,
          })
          const responseData = response.data as any
          const uploaded = responseData?.data || responseData
          uploads.push({
            id: uploaded?.id,
            url: uploaded?.url || uploaded?.filename,
            name: file.name,
            mimeType: file.type,
          })
        } else {
          // For new properties, store locally until property is created
          uploads.push({
            url: base64, // Store base64 temporarily
            name: file.name,
            mimeType: file.type,
          })
        }
      }

      if (uploads.length > 0) {
        setAttachments((prev) => [...prev, ...uploads])
        toast({ title: `${uploads.length} file(s) uploaded successfully` })
      }
    } catch (error: any) {
      toast({
        title: "Failed to upload attachment",
        description: error?.response?.data?.error || error?.message || "Upload failed",
        variant: "destructive",
      })
    } finally {
      setUploadingAttachments(false)
      // Reset input
      if (e.target) {
        e.target.value = ""
      }
    }
  }

  const handleRemoveAttachment = async (index: number) => {
    const attachment = attachments[index]
    // If it has an ID, it's already saved - could delete from server, but for now just remove from list
    setAttachments((prev) => prev.filter((_, idx) => idx !== index))
  }

  // Filter accounts by type
  const assetAccounts = useMemo(() => accounts.filter((a) => a.type?.toLowerCase() === "asset"), [accounts])
  const expenseAccounts = useMemo(() => accounts.filter((a) => a.type?.toLowerCase() === "expense"), [accounts])
  const incomeAccounts = useMemo(() => accounts.filter((a) => a.type?.toLowerCase() === "revenue" || a.type?.toLowerCase() === "income"), [accounts])
  const scrapAccounts = useMemo(() => accounts.filter((a) => a.name?.toLowerCase().includes("scrap") || a.code?.includes("scrap")), [accounts])


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[93vw]! w-[93vw]! max-h-[90vh] p-0 flex flex-col sm:w-[93vw]! sm:max-w-[93vw]!">
        <DialogHeader className="px-6 py-4 border-b bg-muted/50">
          <DialogTitle className="flex items-center justify-between text-lg font-semibold">
            <span>{isEdit ? "View / Edit Property" : "Add Property"}</span>
            {propertyData?.propertyCode && (
              <Badge variant="secondary" className="ml-3">
                Code: {propertyData.propertyCode}
              </Badge>
            )}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {isEdit ? "View and edit property details" : "Fill in the details to add a new property"}
          </p>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="px-6 pb-4">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-7 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>TID (Transaction ID) *</Label>
                          <Input
                            value={form.tid}
                            onChange={(e) => setForm((p) => ({ ...p, tid: e.target.value.toUpperCase().trim() }))}
                            placeholder="Enter unique TID"
                            disabled={isEdit}
                            className={isEdit ? "bg-muted" : ""}
                          />
                          <p className="text-xs text-muted-foreground">
                            {isEdit ? "TID cannot be changed after creation" : "Unique identifier across Property, Deal, and Client"}
                          </p>
                        </div>

                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Address *</Label>
                          <Input
                            value={form.address}
                            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ManagedDropdown
                          dropdownKey="property.type"
                          value={form.type}
                          onChange={(val) => setForm((p) => ({ ...p, type: val }))}
                          required
                        />
                        <ManagedDropdown
                          dropdownKey="property.status"
                          value={form.status}
                          onChange={(val) => setForm((p) => ({ ...p, status: val }))}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ManagedDropdown
                          dropdownKey="property.category"
                          value={form.category}
                          onChange={(val) => setForm((p) => ({ ...p, category: val }))}
                        />
                        <ManagedDropdown
                          dropdownKey="property.size"
                          value={form.size}
                          onChange={(val) => setForm((p) => ({ ...p, size: val }))}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Sale Price</Label>
                          <Input
                            type="number"
                            value={form.salePrice}
                            onChange={(e) => setForm((p) => ({ ...p, salePrice: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Dealer</Label>
                          <Select
                            value={form.dealerId || "none"}
                            onValueChange={(val) =>
                              setForm((p) => ({
                                ...p,
                                dealerId: val === "none" ? "" : val,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select dealer (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {dealers.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Total Area (sq ft)</Label>
                          <Input
                            type="number"
                            value={form.totalArea}
                            onChange={(e) => setForm((p) => ({ ...p, totalArea: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Total Units</Label>
                          <Input
                            type="number"
                            value={form.totalUnits}
                            onChange={(e) => setForm((p) => ({ ...p, totalUnits: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Year Built</Label>
                          <Input
                            type="number"
                            value={form.yearBuilt}
                            onChange={(e) => setForm((p) => ({ ...p, yearBuilt: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          rows={3}
                          value={form.description}
                          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Property Image</Label>
                        <div className="space-y-2">
                          {imagePreview ? (
                            <div className="relative">
                              <img
                                src={imagePreview}
                                alt="Property preview"
                                className="w-full h-48 object-cover rounded-lg border"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute top-2 right-2"
                                onClick={handleRemoveImage}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="border-2 border-dashed rounded-lg p-6 text-center">
                              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                              <Label htmlFor="image-upload" className="cursor-pointer">
                                <span className="text-sm text-muted-foreground">Click to upload or drag and drop</span>
                                <Input
                                  id="image-upload"
                                  type="file"
                                  accept="image/*"
                                  onChange={handleImageUpload}
                                  disabled={uploadingImage}
                                  className="hidden"
                                />
                              </Label>
                              <p className="text-xs text-muted-foreground mt-2">PNG, JPG, GIF up to 10MB</p>
                            </div>
                          )}
                          {uploadingImage && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Uploading image...
                            </div>
                          )}
                        </div>
                      </div>

                    </div>

                    <div className="lg:col-span-5 space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Location</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              setLocationLoadTimeout(false)
                              setLoadingLocations(true)
                              try {
                                const response = await apiService.locations.getLeaves()
                                const data = (response.data as any)?.data || response.data || []
                                setLeafLocations(Array.isArray(data) ? data : [])
                                setLocationError(null)
                              } catch (err: any) {
                                setLocationError('Failed to load locations')
                              } finally {
                                setLoadingLocations(false)
                              }
                            }}
                            disabled={loadingLocations && !locationLoadTimeout}
                            className="h-7 text-xs"
                          >
                            {loadingLocations && !locationLoadTimeout ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <RefreshCw className="h-3 w-3 mr-1" />
                            )}
                            Refresh
                          </Button>
                        </div>
                        <Select
                          value={form.locationId || "none"}
                          onValueChange={(val) => {
                            const selectedLocation = leafLocations.find((loc) => loc.id === val)
                            setForm((p) => ({
                              ...p,
                              location: selectedLocation?.path || "",
                              locationId: val === "none" ? null : val,
                              subsidiaryOptionId: null, // Reset subsidiary when location changes
                            }))
                          }}
                          disabled={loadingLocations && !locationLoadTimeout && !locationError}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={
                              loadingLocations && !locationLoadTimeout && !locationError
                                ? "Loading locations..."
                                : locationError || locationLoadTimeout
                                  ? "Error loading locations - Click Refresh"
                                  : "Select location"
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {locationError || locationLoadTimeout ? (
                              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                                <p className="mb-2">Failed to load locations.</p>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={async (e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setLocationLoadTimeout(false)
                                    setLoadingLocations(true)
                                    try {
                                      const response = await apiService.locations.getLeaves()
                                      const data = (response.data as any)?.data || response.data || []
                                      setLeafLocations(Array.isArray(data) ? data : [])
                                      setLocationError(null)
                                    } catch (err: any) {
                                      setLocationError('Failed to load locations')
                                    } finally {
                                      setLoadingLocations(false)
                                    }
                                  }}
                                >
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Retry
                                </Button>
                              </div>
                            ) : leafLocations.length === 0 && !loadingLocations ? (
                              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                                No locations available. Add locations in Advanced Options &gt; Location & Subsidiary.
                              </div>
                            ) : loadingLocations && !locationLoadTimeout ? (
                              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                                Loading locations...
                              </div>
                            ) : (
                              leafLocations.map((loc) => (
                                <SelectItem key={loc.id} value={loc.id}>
                                  {loc.path}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        {(locationError || locationLoadTimeout) && (
                          <p className="text-xs text-destructive">
                            Error loading locations. Click Refresh to retry.
                          </p>
                        )}
                        {!locationError && !locationLoadTimeout && (
                          <p className="text-xs text-muted-foreground">
                            Select a leaf location (only locations without children can be selected). Add locations in Advanced Options &gt; Location & Subsidiary.
                          </p>
                        )}
                      </div>

                      {form.locationId && (
                        <div className="space-y-2">
                          <Label>Property Subsidiary</Label>
                          <div className="text-xs text-muted-foreground mb-2 p-2 bg-muted rounded">
                            Location: {leafLocations.find((loc) => loc.id === form.locationId)?.path || "N/A"}
                          </div>
                          <Select
                            value={form.subsidiaryOptionId || "none"}
                            onValueChange={(val) =>
                              setForm((p) => ({
                                ...p,
                                subsidiaryOptionId: val === "none" ? null : val,
                              }))
                            }
                            disabled={loadingSubsidiaries}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={loadingSubsidiaries ? "Loading..." : "Select subsidiary (optional)"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {subsidiaryOptions.map((opt) => (
                                <SelectItem key={opt.id} value={opt.id}>
                                  {opt.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {subsidiaryOptions.length === 0 && !loadingSubsidiaries && (
                            <p className="text-xs text-muted-foreground">
                              No subsidiaries available for this location. Add them in Advanced Options &gt; Location & Subsidiary.
                            </p>
                          )}
                        </div>
                      )}


                      <div className="space-y-2">
                        <Label>Amenities</Label>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded p-2">
                          {amenities.map((a) => {
                            const active = amenitySelected.has(a.name)
                            return (
                              <Button
                                key={a.id}
                                variant={active ? "default" : "outline"}
                                size="sm"
                                onClick={() =>
                                  setForm((p) => ({
                                    ...p,
                                    amenities: active
                                      ? p.amenities.filter((x) => x !== a.name)
                                      : [...p.amenities, a.name],
                                  }))
                                }
                                className="justify-start"
                              >
                                {a.name}
                              </Button>
                            )
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Selected: {form.amenities.length ? form.amenities.join(", ") : "None"}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Asset Account</Label>
                          <Select
                            value={selectedAccountId.asset || "none"}
                            onValueChange={(val) =>
                              setSelectedAccountId((prev) => ({
                                ...prev,
                                asset: val === "none" ? "" : val,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select asset account (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {assetAccounts.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.code} - {account.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Expense Account</Label>
                          <Select
                            value={selectedAccountId.expense || "none"}
                            onValueChange={(val) =>
                              setSelectedAccountId((prev) => ({
                                ...prev,
                                expense: val === "none" ? "" : val,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select expense account (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {expenseAccounts.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.code} - {account.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Income Account</Label>
                          <Select
                            value={selectedAccountId.income || "none"}
                            onValueChange={(val) =>
                              setSelectedAccountId((prev) => ({
                                ...prev,
                                income: val === "none" ? "" : val,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select income account (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {incomeAccounts.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.code} - {account.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Scrap Account</Label>
                          <Select
                            value={selectedAccountId.scrap || "none"}
                            onValueChange={(val) =>
                              setSelectedAccountId((prev) => ({
                                ...prev,
                                scrap: val === "none" ? "" : val,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select scrap account (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {scrapAccounts.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.code} - {account.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Attachments</Label>
                        <div className="space-y-2">
                          <div className="border-2 border-dashed rounded-lg p-4 text-center">
                            <FileText className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                            <Label htmlFor="attachment-upload" className="cursor-pointer">
                              <span className="text-sm text-muted-foreground">Click to upload documents</span>
                              <Input
                                id="attachment-upload"
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                                multiple
                                onChange={handleAttachmentUpload}
                                disabled={uploadingAttachments}
                                className="hidden"
                              />
                            </Label>
                            <p className="text-xs text-muted-foreground mt-2">PDF, JPG, PNG, GIF, WEBP up to 10MB each</p>
                          </div>
                          {uploadingAttachments && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Uploading attachments...
                            </div>
                          )}
                          {attachments.length > 0 && (
                            <div className="space-y-2">
                              {attachments.map((attachment, idx) => {
                                const isImage = attachment.mimeType?.startsWith('image/') || attachment.url.startsWith('data:image')
                                return (
                                  <div key={idx} className="flex items-center justify-between p-2 border rounded-lg">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      {isImage ? (
                                        <ImageIcon className="h-4 w-4 text-primary shrink-0" />
                                      ) : (
                                        <FileText className="h-4 w-4 text-primary shrink-0" />
                                      )}
                                      <span className="text-sm truncate">{attachment.name}</span>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveAttachment(idx)}
                                      className="shrink-0"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-2 border-t bg-muted/50 mt-0 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isEdit ? "Save Changes" : "Create Property"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

