"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiService } from "@/lib/api"
import { PropertyToasts, showInfoToast } from "@/lib/toast-utils"
import { PropertyStructureSetupDialog } from "./property-structure-setup-dialog"
import { LocationSelector } from "@/components/locations/location-selector"
import { useDropdownOptions } from "@/hooks/use-dropdowns"
import { useAmenities } from "@/hooks/use-amenities"

interface AddPropertyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  propertyId?: number | string | null
}

const FALLBACK_AMENITIES = ["Parking", "Security", "Elevator", "Water Supply", "Gas", "Electric Backup", "Gym", "Swimming Pool"]

const FALLBACK_STATUS_OPTIONS = [
  { label: "Vacant", value: "Vacant" },
  { label: "Occupied", value: "Occupied" },
  { label: "Active", value: "Active" },
  { label: "Maintenance", value: "Maintenance" },
  { label: "For Sale", value: "For Sale" },
  { label: "For Rent", value: "For Rent" },
  { label: "Sold", value: "Sold" },
]

type AmenityOption = string

type PropertyFormData = {
  propertyName: string
  propertyCode: string
  type: string
  status: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  country: string
  zipCode: string
  description: string
  amenities: AmenityOption[]
  imageUrl: string
  imageFile: File | null
  yearBuilt?: number
  totalArea?: number
  areaUnit: string
  customArea: string
  dealerId: string
  locationId?: string | null
}

function generatePropertyCode() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `PROP-${yyyy}${mm}${dd}-${rand}`
}

function createEmptyFormData(): PropertyFormData {
  return {
    propertyName: "",
    propertyCode: generatePropertyCode(),
    type: "",
    status: "Vacant",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    country: "",
    zipCode: "",
    description: "",
    amenities: [],
    imageUrl: "",
    imageFile: null,
    yearBuilt: undefined,
    totalArea: undefined,
    areaUnit: "none",
    customArea: "",
    dealerId: "",
    locationId: null,
  }
}

function validateForm(data: PropertyFormData) {
  const errors: Record<string, string> = {}

  if (!data.propertyName.trim()) {
    errors.propertyName = "Property name is required"
  }

  if (!data.propertyCode.trim()) {
    errors.propertyCode = "Property code is required"
  }

  if (!data.type) {
    errors.type = "Property type is required"
  }

  if (!data.status) {
    errors.status = "Status is required"
  }

  if (!data.addressLine1.trim()) {
    errors.addressLine1 = "Address line 1 is required"
  }

  if (!data.city.trim()) {
    errors.city = "City is required"
  }

  if (!data.state.trim()) {
    errors.state = "State is required"
  }

  if (!data.country.trim()) {
    errors.country = "Country is required"
  }

  if (!data.zipCode.trim()) {
    errors.zipCode = "ZIP / Postal code is required"
  }

  return errors
}

interface Dealer {
  id: string
  name: string
  specialization?: string
  company?: string
}

export function AddPropertyDialog({ open, onOpenChange, onSuccess, propertyId }: AddPropertyDialogProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<PropertyFormData>(() => createEmptyFormData())
  const [dealers, setDealers] = useState<Dealer[]>([])
  const [loadingProperty, setLoadingProperty] = useState(false)
  const [loadingDealers, setLoadingDealers] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set())
  const [showStructureDialog, setShowStructureDialog] = useState(false)
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null)
  const [createdPropertyName, setCreatedPropertyName] = useState<string>("")
  const { options: propertyStatusOptions } = useDropdownOptions("property.status")
  const { amenities: amenitiesFromServer, isLoading: amenitiesLoading } = useAmenities()
  const amenityChoices: string[] = amenitiesFromServer && amenitiesFromServer.length
    ? Array.from(new Set(amenitiesFromServer.map((item: any) => item.name as string)))
    : FALLBACK_AMENITIES
  const statusOptions = propertyStatusOptions.length ? propertyStatusOptions : FALLBACK_STATUS_OPTIONS

  useEffect(() => {
    if (open) {
      fetchDealers()
      if (propertyId) {
        fetchProperty()
      } else {
        setFormData(createEmptyFormData())
        setErrors({})
        setTouchedFields(new Set())
      }
    } else {
      // Reset form when dialog closes
      setFormData(createEmptyFormData())
      setErrors({})
      setTouchedFields(new Set())
    }
  }, [open, propertyId])

  useEffect(() => {
    if (!propertyStatusOptions.length) return
    const isValid = propertyStatusOptions.some((option) => option.value === formData.status)
    if (!isValid) {
      setFormData((prev) => ({
        ...prev,
        status: propertyStatusOptions[0]?.value || FALLBACK_STATUS_OPTIONS[0].value,
      }))
    }
  }, [formData.status, propertyStatusOptions])

  // Only validate touched fields or on submit
  const validateField = (fieldName: string, value: any) => {
    if (!touchedFields.has(fieldName)) return
    
    const tempFormData = { ...formData, [fieldName]: value }
    const fieldErrors = validateForm(tempFormData)
    setErrors((prev) => ({
      ...prev,
      [fieldName]: fieldErrors[fieldName] || "",
    }))
  }

  const handleFieldBlur = (fieldName: string) => {
    setTouchedFields((prev) => new Set(prev).add(fieldName))
    validateField(fieldName, formData[fieldName as keyof PropertyFormData])
  }

  const isFormValid = Object.keys(validateForm(formData)).length === 0

  const fetchProperty = async () => {
    if (!propertyId) return
    try {
      setLoadingProperty(true)
      const propertyIdStr = typeof propertyId === 'number' ? propertyId.toString() : propertyId
      const response: any = await apiService.properties.getById(propertyIdStr)
      const responseData = response.data as any
      const propertyData = responseData?.data || responseData

      if (propertyData) {
        // Determine area unit from totalArea with tolerance for floating point
        let areaUnit = "none"
        let customArea = ""
        if (propertyData.totalArea) {
          const area = Number(propertyData.totalArea)
          // Use tolerance for floating point comparison
          const tolerance = 0.01
          if (Math.abs(area - 272.25) < tolerance) areaUnit = "1marla"
          else if (Math.abs(area - 816.75) < tolerance) areaUnit = "3marla"
          else if (Math.abs(area - 1361.25) < tolerance) areaUnit = "5marla"
          else if (Math.abs(area - 1905.75) < tolerance) areaUnit = "7marla"
          else if (Math.abs(area - 2722.5) < tolerance) areaUnit = "10marla"
          else if (Math.abs(area - 5445) < tolerance) areaUnit = "1kanal"
          else {
            areaUnit = "custom"
            customArea = area.toString()
          }
        }

        // Parse address from full address string if needed
        const address = propertyData.address || ""
        const addressParts = address.split(",").map((p: string) => p.trim())
        const addressLine1 = addressParts[0] || ""
        const addressLine2 = addressParts[1] || ""
        
        // Extract city, state, country from location or address
        const location = propertyData.location || ""
        const locationParts = location.split(",").map((p: string) => p.trim())
        const city = propertyData.city || locationParts[0] || ""
        const state = propertyData.state || locationParts[1] || ""
        const country = propertyData.country || locationParts[2] || ""
        const zipCode = propertyData.zipCode || propertyData.postalCode || ""

        // Extract amenities from documents field if it exists
        const allowedAmenities = new Set<string>(amenityChoices as string[])
        let amenities: AmenityOption[] = []
        if (propertyData.amenities && Array.isArray(propertyData.amenities)) {
          amenities = propertyData.amenities.filter((a: string) => allowedAmenities.has(a))
        } else if (propertyData.documents && typeof propertyData.documents === 'object') {
          const docs = propertyData.documents as any
          if (Array.isArray(docs.amenities)) {
            amenities = docs.amenities.filter((a: string) => allowedAmenities.has(a))
          }
        }

        setFormData({
          propertyName: propertyData.name || "",
          propertyCode: propertyData.propertyCode || propertyData.code || generatePropertyCode(),
          type: propertyData.type || "",
          status: propertyData.status || "Vacant",
          addressLine1,
          addressLine2,
          city,
          state,
          country,
          zipCode,
          description: propertyData.description || "",
          amenities,
          imageUrl: propertyData.imageUrl || "",
          imageFile: null,
          yearBuilt: propertyData.yearBuilt,
          totalArea: propertyData.totalArea,
          areaUnit,
          customArea,
          dealerId: propertyData.dealerId || "",
          locationId: propertyData.locationNode?.id || propertyData.locationId || null,
        })
        setTouchedFields(new Set())
        setErrors({})
      }
    } catch (err: any) {
      console.error("Failed to fetch property:", err)
      PropertyToasts.error("Failed to load property data")
    } finally {
      setLoadingProperty(false)
    }
  }

  const fetchDealers = async () => {
    try {
      setLoadingDealers(true)
      const response = await apiService.dealers.getAll()
      // Backend returns array directly or wrapped in data
      const responseData = response.data as any
      const dealersData = responseData?.data || responseData || []
      const validDealers = Array.isArray(dealersData) 
        ? dealersData.filter((d: any) => d && d.id && d.name)
        : []
      setDealers(validDealers as Dealer[])
    } catch (err: any) {
      // Dealers endpoint might not exist yet, that's okay - it's optional
      // Silently fail - dealers are optional
      if (err.response?.status !== 404) {
        console.error("Failed to fetch dealers:", err)
      }
      setDealers([])
    } finally {
      setLoadingDealers(false)
    }
  }

  const handleImageUpload = async (file: File): Promise<string | null> => {
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showInfoToast("Invalid File Type", "Please select an image file.")
        return null
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        showInfoToast("File Too Large", "Image size must be less than 5MB.")
        return null
      }

      setUploadingImage(true)
      
      // Convert file to base64
      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string
          if (!result) {
            reject(new Error("Failed to read file"))
            return
          }
          resolve(result)
        }
        reader.onerror = () => reject(new Error("Failed to read file"))
        reader.readAsDataURL(file)
      })

      // Upload to server
      const response: any = await apiService.upload.image({ image: base64, filename: file.name })
      const responseData = response?.data || {}
      const imageUrl = responseData?.url || responseData?.data?.url
      
      if (!imageUrl) {
        throw new Error("No image URL returned from server")
      }
      
      return imageUrl
    } catch (err: any) {
      console.error("Failed to upload image:", err)
      const errorMessage = err.response?.data?.error || err.message || "Failed to upload image"
      showInfoToast("Image Upload Warning", `${errorMessage}. Property will be saved without image.`)
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  const toggleAmenity = (amenity: AmenityOption) => {
    setFormData((prev) => {
      const exists = prev.amenities.includes(amenity)
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter((a) => a !== amenity)
          : [...prev.amenities, amenity],
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Mark all fields as touched on submit
    const allFields = [
      'propertyName', 'propertyCode', 'type', 'status',
      'addressLine1', 'city', 'state', 'country', 'zipCode'
    ]
    setTouchedFields(new Set(allFields))

    const currentErrors = validateForm(formData)
    setErrors(currentErrors)
    if (Object.keys(currentErrors).length > 0) {
      return
    }

    try {
      setSubmitting(true)

      // Ensure propertyCode is generated if still empty
      let propertyCode = formData.propertyCode.trim()
      if (!propertyCode) {
        propertyCode = generatePropertyCode()
        setFormData((prev) => ({ ...prev, propertyCode }))
      }

      // Handle custom area - ensure totalArea is set from customArea if custom unit is selected
      let finalTotalArea = formData.totalArea
      if (formData.areaUnit === "custom" && formData.customArea) {
        const customValue = parseFloat(formData.customArea)
        if (!isNaN(customValue) && customValue > 0) {
          finalTotalArea = customValue
        }
      } else if (formData.areaUnit === "none") {
        finalTotalArea = undefined
      }

      // Upload image if file is selected
      let imageUrl = formData.imageUrl
      if (formData.imageFile) {
        const uploadedUrl = await handleImageUpload(formData.imageFile)
        if (uploadedUrl) {
          imageUrl = uploadedUrl
        }
      }

      const fullAddress = [
        formData.addressLine1.trim(),
        formData.addressLine2.trim(),
        formData.city.trim(),
        formData.state.trim(),
        formData.zipCode.trim(),
        formData.country.trim(),
      ]
        .filter(Boolean)
        .join(", ")

      const location = [
        formData.city.trim(),
        formData.state.trim(),
        formData.country.trim(),
      ]
        .filter(Boolean)
        .join(", ")

      const payload: any = {
        name: formData.propertyName.trim(),
        code: propertyCode,
        propertyCode,
        type: formData.type,
        address: fullAddress,
        status: formData.status,
      }

      if (location) {
        payload.location = location
      }

      // Only add optional fields if they have values
      if (imageUrl && imageUrl.trim()) {
        payload.imageUrl = imageUrl.trim()
      }
      if (formData.yearBuilt) {
        payload.yearBuilt = parseInt(formData.yearBuilt.toString())
      }
      if (finalTotalArea !== undefined && finalTotalArea !== null) {
        payload.totalArea = parseFloat(finalTotalArea.toString())
      }
      if (formData.description && formData.description.trim()) {
        payload.description = formData.description.trim()
      }
      if (formData.amenities.length > 0) {
        payload.amenities = formData.amenities
      }
      if (formData.dealerId && formData.dealerId !== "none" && formData.dealerId.trim()) {
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (uuidRegex.test(formData.dealerId.trim())) {
          payload.dealerId = formData.dealerId.trim()
        }
      }
      if (formData.locationId !== undefined) {
        payload.locationId = formData.locationId
      }

      console.log("Sending payload:", payload)

      let createdProperty: any = null

      if (propertyId) {
        const propertyIdStr = typeof propertyId === 'number' ? propertyId.toString() : propertyId
        await apiService.properties.update(propertyIdStr, payload)
        PropertyToasts.updated(formData.propertyName.trim())
      } else {
        const response: any = await apiService.properties.create(payload)
        const responseData = response.data as any
        createdProperty = responseData?.data || responseData
        PropertyToasts.created(formData.propertyName.trim())

        // Show structure setup dialog after creating property
        if (createdProperty?.id) {
          const propertyIdStr = String(createdProperty.id)
          setCreatedPropertyId(propertyIdStr)
          setCreatedPropertyName(formData.propertyName.trim())
          onSuccess?.()
          onOpenChange(false)
          setFormData(createEmptyFormData())
          setErrors({})
          setTouchedFields(new Set())
          // Show structure setup dialog
          setShowStructureDialog(true)
          return
        }
      }

      onSuccess?.()
      onOpenChange(false)
      setFormData(createEmptyFormData())
      setErrors({})
      setTouchedFields(new Set())
    } catch (err: any) {
      console.error("Failed to create property:", err)
      console.error("Error response:", err.response?.data)
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (err.response?.data?.details
          ? err.response.data.details.map((d: any) => `${d.path?.join(".")}: ${d.message}`).join(", ")
          : null) ||
        "Failed to create property"
      PropertyToasts.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }


  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[900px] max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{propertyId ? "Edit Property" : "Add New Property"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="propertyName">Property Name</Label>
                <Input
                id="propertyName"
                value={formData.propertyName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    propertyName: e.target.value,
                  }))
                }
                onBlur={() => handleFieldBlur("propertyName")}
                placeholder="Enter property name"
                className={errors.propertyName ? "border-destructive" : ""}
              />
              {errors.propertyName && <p className="text-xs text-destructive">{errors.propertyName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="propertyCode">Property Code</Label>
                <Input
                id="propertyCode"
                value={formData.propertyCode}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    propertyCode: e.target.value,
                  }))
                }
                onBlur={() => handleFieldBlur("propertyCode")}
                placeholder="Auto-generated if left empty"
                className={errors.propertyCode ? "border-destructive" : ""}
              />
              {errors.propertyCode && <p className="text-xs text-destructive">{errors.propertyCode}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => {
                  setFormData((prev) => ({
                    ...prev,
                    type: value,
                  }))
                  setTouchedFields((prev) => new Set(prev).add("type"))
                  validateField("type", value)
                }}
              >
                <SelectTrigger className={errors.type ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Residential">Residential</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                  <SelectItem value="Mixed Use">Mixed Use</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && <p className="text-xs text-destructive">{errors.type}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => {
                  setFormData((prev) => ({
                    ...prev,
                    status: value,
                  }))
                  setTouchedFields((prev) => new Set(prev).add("status"))
                  validateField("status", value)
                }}
              >
                <SelectTrigger className={errors.status ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.status && <p className="text-xs text-destructive">{errors.status}</p>}
            </div>
          </div>

          {/* Address */}
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Address</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="addressLine1">Address Line 1</Label>
                <Input
                  id="addressLine1"
                  value={formData.addressLine1}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      addressLine1: e.target.value,
                    }))
                  }
                  onBlur={() => handleFieldBlur("addressLine1")}
                  placeholder="Street, building, etc."
                  className={errors.addressLine1 ? "border-destructive" : ""}
                />
                {errors.addressLine1 && <p className="text-xs text-destructive">{errors.addressLine1}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="addressLine2">Address Line 2</Label>
                <Input
                  id="addressLine2"
                  value={formData.addressLine2}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      addressLine2: e.target.value,
                    }))
                  }
                  placeholder="Apartment, suite, etc. (optional)"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      city: e.target.value,
                    }))
                  }
                  onBlur={() => handleFieldBlur("city")}
                  className={errors.city ? "border-destructive" : ""}
                />
                {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      state: e.target.value,
                    }))
                  }
                  onBlur={() => handleFieldBlur("state")}
                  className={errors.state ? "border-destructive" : ""}
                />
                {errors.state && <p className="text-xs text-destructive">{errors.state}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      country: e.target.value,
                    }))
                  }
                  onBlur={() => handleFieldBlur("country")}
                  className={errors.country ? "border-destructive" : ""}
                />
                {errors.country && <p className="text-xs text-destructive">{errors.country}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="zipCode">ZIP / Postal Code</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      zipCode: e.target.value,
                    }))
                  }
                  onBlur={() => handleFieldBlur("zipCode")}
                  className={errors.zipCode ? "border-destructive" : ""}
                />
                {errors.zipCode && <p className="text-xs text-destructive">{errors.zipCode}</p>}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Registered Location</Label>
            <LocationSelector
              value={formData.locationId ?? null}
              onChange={(node) =>
                setFormData((prev) => ({ ...prev, locationId: node?.id ?? null }))
              }
              helperText="Pick the location node that best describes this property"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="yearBuilt">Year Built</Label>
              <Input
                id="yearBuilt"
                type="number"
                value={formData.yearBuilt || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    yearBuilt: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  }))
                }
                placeholder="2024"
              />
            </div>
          </div>

          {/* Area */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="areaUnit">Total Area</Label>
              <Select
                value={formData.areaUnit}
                onValueChange={(value) => {
                  // Convert Marla/Kanal to sq ft
                  let areaInSqFt: number | undefined = undefined
                  if (value === "1marla") areaInSqFt = 272.25
                  else if (value === "3marla") areaInSqFt = 816.75
                  else if (value === "5marla") areaInSqFt = 1361.25
                  else if (value === "7marla") areaInSqFt = 1905.75
                  else if (value === "10marla") areaInSqFt = 2722.5
                  else if (value === "1kanal") areaInSqFt = 5445
                  else if (value === "none") {
                    areaInSqFt = undefined
                  }
                  // For "custom", keep existing totalArea if customArea has value, otherwise undefined

                  setFormData((prev) => ({
                    ...prev,
                    areaUnit: value,
                    totalArea: value === "custom" 
                      ? (prev.customArea ? parseFloat(prev.customArea) || undefined : undefined)
                      : areaInSqFt,
                    customArea: value === "custom" ? prev.customArea || "" : "",
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="1marla">1 Marla</SelectItem>
                  <SelectItem value="3marla">3 Marla</SelectItem>
                  <SelectItem value="5marla">5 Marla</SelectItem>
                  <SelectItem value="7marla">7 Marla</SelectItem>
                  <SelectItem value="10marla">10 Marla</SelectItem>
                  <SelectItem value="1kanal">1 Kanal</SelectItem>
                  <SelectItem value="custom">Custom (sq ft)</SelectItem>
                </SelectContent>
              </Select>
              {formData.areaUnit === "custom" && (
                <Input
                  id="customArea"
                  type="number"
                  step="0.01"
                  value={formData.customArea}
                  onChange={(e) => {
                    const customValue = e.target.value ? parseFloat(e.target.value) : undefined
                    setFormData((prev) => ({
                      ...prev,
                      customArea: e.target.value,
                      totalArea: customValue,
                    }))
                  }}
                  placeholder="Enter area in sq ft"
                />
              )}
            </div>
          </div>

          {/* Media & Dealer */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="imageFile">Property Image</Label>
              <Input
                id="imageFile"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setFormData((prev) => ({ ...prev, imageFile: file, imageUrl: "" }))
                  }
                }}
              />
              {formData.imageFile && (
                <div className="flex items-center gap-2 rounded-lg border p-2">
                  <p className="flex-1 text-sm text-muted-foreground">Selected: {formData.imageFile.name}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, imageFile: null }))
                      const fileInput = document.getElementById("imageFile") as HTMLInputElement
                      if (fileInput) fileInput.value = ""
                    }}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  >
                    <span className="text-lg">×</span>
                  </Button>
                </div>
              )}
              {!formData.imageFile && formData.imageUrl && (
                <div className="flex items-center gap-2 rounded-lg border p-2">
                  <p className="flex-1 text-sm text-muted-foreground">
                    Current image URL: {formData.imageUrl}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, imageUrl: "" }))
                    }}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  >
                    <span className="text-lg">×</span>
                  </Button>
                </div>
              )}
              {uploadingImage && <p className="text-sm text-primary">Uploading image...</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dealerId">Assigned Dealer/Agent</Label>
              <Select
                value={formData.dealerId || "none"}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    dealerId: value === "none" ? "" : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select dealer (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {loadingDealers ? (
                    <SelectItem value="loading" disabled>
                      Loading dealers...
                    </SelectItem>
                  ) : dealers.length === 0 ? (
                    <SelectItem value="no-dealers" disabled>
                      No dealers available
                    </SelectItem>
                  ) : (
                    dealers.map((dealer) => (
                      <SelectItem key={dealer.id} value={dealer.id}>
                        {dealer.name}{dealer.specialization ? ` - ${dealer.specialization}` : dealer.company ? ` - ${dealer.company}` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Enter property description"
              rows={3}
            />
          </div>

          <div className="space-y-2 pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Property Amenities</p>
              <Button
                variant="link"
                size="sm"
                className="text-xs"
                type="button"
                onClick={() => window.open("/admin/advanced-options", "_blank")}
              >
                Manage amenities
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {amenityChoices.map((amenity: string) => {
                const isSelected = formData.amenities.includes(amenity)
                return (
                  <Button
                    key={amenity}
                    size="sm"
                    variant={isSelected ? "default" : "outline"}
                    className="capitalize"
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleAmenity(amenity)}
                  >
                    {amenity}
                  </Button>
                )
              })}
              {amenitiesLoading && (
                <span className="text-xs text-muted-foreground">Loading amenities…</span>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setFormData(createEmptyFormData())
                setErrors({})
                setTouchedFields(new Set())
                onOpenChange(false)
              }} 
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !isFormValid}>
              {submitting
                ? propertyId
                  ? "Updating..."
                  : "Adding..."
                : propertyId
                  ? "Update Property"
                  : "Add Property"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    {createdPropertyId && (
      <PropertyStructureSetupDialog
        open={showStructureDialog}
        onOpenChange={(open) => {
          setShowStructureDialog(open)
          if (!open) {
            setCreatedPropertyId(null)
            setCreatedPropertyName("")
          }
        }}
        propertyId={createdPropertyId}
        propertyName={createdPropertyName}
        onComplete={() => {
          router.push(`/properties/${createdPropertyId}/structure`)
        }}
      />
    )}
    </>
  )
}
