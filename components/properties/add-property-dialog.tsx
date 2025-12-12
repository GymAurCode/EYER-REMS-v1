"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Plus, Trash2, FileText } from "lucide-react"
import { apiService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useDropdownOptions } from "@/hooks/use-dropdowns"
import { LocationSelector } from "@/components/locations/location-selector"
import { downloadJSON, formatCurrency } from "@/lib/utils"

type PropertyForm = {
  name: string
  type: string
  status: string
  category: string
  size: string
  address: string
  location: string
  locationId: string | null
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
  name: "",
  type: "",
  status: "Active",
  category: "",
  size: "",
  address: "",
  location: "",
  locationId: null,
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

type DropdownKey = "property.type" | "property.category" | "property.status" | "property.size"

const DROPDOWN_LABELS: Record<DropdownKey, string> = {
  "property.type": "Type",
  "property.category": "Category",
  "property.status": "Status",
  "property.size": "Size",
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
          {allOptions.map((opt) => (
            <div key={opt.id} className="flex items-center justify-between px-2">
              <SelectItem value={opt.value}>{opt.label}</SelectItem>
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
          ))}
        </SelectContent>
      </Select>

      {/* Show info message */}
      {localOptions.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {localOptions.length} custom option(s) added locally
        </p>
      )}
      {(!options || options.length === 0) && (
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
  const [selectedTab, setSelectedTab] = useState("details")
  const [selectedAccountTab, setSelectedAccountTab] = useState("asset")
  const [propertyData, setPropertyData] = useState<any>(null)
  const [ledger, setLedger] = useState<any>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [accountLedgers, setAccountLedgers] = useState<Record<string, any[]>>({})
  const [selectedAccountId, setSelectedAccountId] = useState<Record<string, string>>({
    asset: "",
    expense: "",
    income: "",
    scrap: "",
  })
  const isEdit = Boolean(propertyId)

  useEffect(() => {
    if (!open) {
      setSelectedAccountTab("asset")
      setAccountLedgers({})
      setSelectedAccountId({
        asset: "",
        expense: "",
        income: "",
        scrap: "",
      })
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
          setForm({
            name: payload.name || "",
            type: payload.type || "",
            status: payload.status || "Active",
            category: payload.category || "",
            size: payload.size || "",
            address: payload.address || "",
            location: payload.location || "",
            locationId: payload.locationId || null,
            salePrice: payload.salePrice?.toString() || documents.salePrice?.toString() || "",
            totalArea: payload.totalArea?.toString() || "",
            totalUnits: payload.totalUnits?.toString() || "",
            yearBuilt: payload.yearBuilt?.toString() || "",
            dealerId: payload.dealerId || "",
            amenities: Array.isArray(payload.amenities) ? payload.amenities : documents.amenities || [],
            description: payload.description || "",
            imageUrl: payload.imageUrl || "",
          })

          // Fetch full ledger for the property
          const ledgerRes = await apiService.properties.getLedger(String(propertyId))
          const ledgerPayload = (ledgerRes.data as any)?.data ?? ledgerRes.data
          setLedger(ledgerPayload)

          // Initialize empty account ledgers - will be fetched on demand
          setAccountLedgers({})
        } else {
          setForm(DEFAULT_FORM)
          setPropertyData(null)
          setLedger(null)
          setAccountLedgers({})
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

  const handleSave = async () => {
    const errors: string[] = []
    if (!form.name.trim()) errors.push("Name")
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

    const payload: any = {
      name: formWithoutCategorySize.name.trim(),
      type: formWithoutCategorySize.type,
      status: formWithoutCategorySize.status || "Active",
      address: formWithoutCategorySize.address,
      location: formWithoutCategorySize.location,
      locationId: formWithoutCategorySize.locationId,
      description: formWithoutCategorySize.description || undefined,
      totalArea: formWithoutCategorySize.totalArea ? Number(formWithoutCategorySize.totalArea) : undefined,
      totalUnits: formWithoutCategorySize.totalUnits ? Number(formWithoutCategorySize.totalUnits) : undefined,
      yearBuilt: formWithoutCategorySize.yearBuilt ? Number(formWithoutCategorySize.yearBuilt) : undefined,
      salePrice: formWithoutCategorySize.salePrice ? Number(formWithoutCategorySize.salePrice) : undefined,
      dealerId: formWithoutCategorySize.dealerId || undefined,
      amenities: formWithoutCategorySize.amenities,
      imageUrl: formWithoutCategorySize.imageUrl || undefined,
    }

    try {
      setSaving(true)
      if (isEdit) {
        await apiService.properties.update(String(propertyId), payload)
        toast({ title: "Property updated" })
      } else {
        await apiService.properties.create(payload)
        toast({ title: "Property created" })
      }
      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error?.response?.data?.message || error?.message || "Unknown error",
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
      link.download = `${(form.name || "property").replace(/\s+/g, "-").toLowerCase()}-report.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      toast({ title: "Report failed", description: error?.message || "Unable to generate PDF", variant: "destructive" })
    }
  }

  const amenitySelected = useMemo(() => new Set(form.amenities), [form.amenities])

  // Filter accounts by type
  const assetAccounts = useMemo(() => accounts.filter((a) => a.type?.toLowerCase() === "asset"), [accounts])
  const expenseAccounts = useMemo(() => accounts.filter((a) => a.type?.toLowerCase() === "expense"), [accounts])
  const incomeAccounts = useMemo(() => accounts.filter((a) => a.type?.toLowerCase() === "revenue" || a.type?.toLowerCase() === "income"), [accounts])
  const scrapAccounts = useMemo(() => accounts.filter((a) => a.name?.toLowerCase().includes("scrap") || a.code?.includes("scrap")), [accounts])

  // Fetch account ledgers when tab is selected (with rate limiting)
  useEffect(() => {
    if (!open || !propertyId || !selectedAccountTab || accounts.length === 0) return

    let cancelled = false

    const fetchAccountLedgers = async () => {
      const filteredAccounts = selectedAccountTab === "asset"
        ? accounts.filter((a) => a.type?.toLowerCase() === "asset")
        : selectedAccountTab === "expense"
          ? accounts.filter((a) => a.type?.toLowerCase() === "expense")
          : selectedAccountTab === "income"
            ? accounts.filter((a) => a.type?.toLowerCase() === "revenue" || a.type?.toLowerCase() === "income")
            : accounts.filter((a) => a.name?.toLowerCase().includes("scrap") || a.code?.includes("scrap"))

      if (filteredAccounts.length === 0) return

      const accountLedgersMap: Record<string, any[]> = { ...accountLedgers }
      const accountsToFetch = filteredAccounts.filter((account: any) => !accountLedgersMap[account.id])

      if (accountsToFetch.length === 0) return

      // Process accounts in batches of 3 with delays to avoid rate limiting
      const BATCH_SIZE = 3
      const DELAY_MS = 500

      for (let i = 0; i < accountsToFetch.length; i += BATCH_SIZE) {
        if (cancelled) return

        const batch = accountsToFetch.slice(i, i + BATCH_SIZE)

        await Promise.all(
          batch.map(async (account: any) => {
            if (cancelled) return
            try {
              const accountLedgerRes = await apiService.finance.getAccountLedger(account.id, {
                propertyId: String(propertyId),
              })
              if (!cancelled) {
                const accountLedgerData = (accountLedgerRes.data as any)?.entries ?? accountLedgerRes.data ?? []
                accountLedgersMap[account.id] = Array.isArray(accountLedgerData) ? accountLedgerData : []
              }
            } catch (error: any) {
              // Handle 429 rate limit errors gracefully
              if (error.response?.status === 429) {
                console.warn(`Rate limited for account ${account.id}, skipping...`)
              }
              if (!cancelled) {
                accountLedgersMap[account.id] = []
              }
            }
          })
        )

        // Add delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < accountsToFetch.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_MS))
        }
      }

      if (!cancelled) {
        setAccountLedgers(accountLedgersMap)
      }
    }

    // Add a small delay before starting to debounce rapid tab switches
    const timeoutId = setTimeout(() => {
      fetchAccountLedgers()
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [open, propertyId, selectedAccountTab, accounts.length])

  // Get ledger entries for selected account
  const getSelectedAccountLedgers = (accountType: string) => {
    const selectedId = selectedAccountId[accountType as keyof typeof selectedAccountId]
    if (!selectedId) return []

    const entries = accountLedgers[selectedId] || []
    const account = accounts.find((a) => a.id === selectedId)

    return entries.map((entry: any) => ({
      ...entry,
      accountCode: account?.code || "",
      accountName: account?.name || "",
    })).sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())
  }

  // Get selected account details
  const getSelectedAccount = (accountType: string) => {
    const selectedId = selectedAccountId[accountType as keyof typeof selectedAccountId]
    if (!selectedId) return null
    return accounts.find((a) => a.id === selectedId)
  }

  // Fetch ledger when account is selected
  useEffect(() => {
    if (!open || !propertyId) return

    Object.entries(selectedAccountId).forEach(([type, accountId]) => {
      if (accountId && !accountLedgers[accountId]) {
        // Fetch ledger for selected account
        apiService.finance.getAccountLedger(accountId, {
          propertyId: String(propertyId),
        }).then((res) => {
          const data = (res.data as any)?.entries ?? res.data ?? []
          setAccountLedgers((prev) => ({
            ...prev,
            [accountId]: Array.isArray(data) ? data : [],
          }))
        }).catch(() => {
          setAccountLedgers((prev) => ({
            ...prev,
            [accountId]: [],
          }))
        })
      }
    })
  }, [selectedAccountId, open, propertyId])


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[85vw]! w-[85vw]! max-h-[80vh]! h-[80vh]! p-0 m-0 translate-x-[-50%]! translate-y-[-50%]!">
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

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex flex-col h-[calc(80vh-100px)]">
          <TabsList className="px-6 pt-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="finance">Accounts</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="details" className="h-full">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ScrollArea className="h-full px-6 pb-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-7 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Name *</Label>
                          <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                        </div>
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
                    </div>

                    <div className="lg:col-span-5 space-y-4">
                      <div className="space-y-2">
                        <Label>Location</Label>
                        <LocationSelector
                          value={form.locationId}
                          onChange={(node) =>
                            setForm((p) => ({
                              ...p,
                              locationId: node?.id ?? null,
                              location: node?.name ?? "",
                            }))
                          }
                        />
                        {form.location && (
                          <p className="text-xs text-muted-foreground">Selected: {form.location}</p>
                        )}
                      </div>

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

                      <div className="space-y-2">
                        <Label>Image URL</Label>
                        <Input
                          value={form.imageUrl}
                          onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
                          placeholder="/uploads/property.jpg or https://..."
                        />
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="finance" className="h-full">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <Tabs value={selectedAccountTab} onValueChange={setSelectedAccountTab} className="flex flex-col flex-1">
                    <TabsList className="px-6 pt-4 flex-wrap">
                      <TabsTrigger value="asset">Asset Account</TabsTrigger>
                      <TabsTrigger value="expense">Expense Account</TabsTrigger>
                      <TabsTrigger value="income">Income Account</TabsTrigger>
                      <TabsTrigger value="scrap">Scrap Account</TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-hidden">
                      <TabsContent value="asset" className="h-full">
                        <ScrollArea className="h-full px-6 pb-6">
                          <div className="space-y-4">
                            <Card className="p-4">
                              <div className="space-y-2">
                                <Label className="text-base font-semibold">Select Asset Account</Label>
                                <Select
                                  value={selectedAccountId.asset}
                                  onValueChange={(value) => setSelectedAccountId((prev) => ({ ...prev, asset: value }))}
                                >
                                  <SelectTrigger className="h-12 text-base">
                                    <SelectValue placeholder="Select an asset account to view ledger" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[300px]">
                                    {assetAccounts.length > 0 ? (
                                      assetAccounts.map((account) => (
                                        <SelectItem key={account.id} value={account.id} className="py-3">
                                          <div className="flex flex-col">
                                            <span className="font-medium">{account.code} - {account.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                              Balance: {formatCurrency(Number(account.balance) || 0)}
                                            </span>
                                          </div>
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <SelectItem value="none" disabled>No asset accounts found</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            </Card>

                            {selectedAccountId.asset && getSelectedAccount("asset") && (
                              <>
                                <div className="grid gap-4 md:grid-cols-3">
                                  <Card className="p-4">
                                    <p className="text-sm text-muted-foreground">Account Code</p>
                                    <p className="text-2xl font-semibold">{getSelectedAccount("asset")?.code}</p>
                                  </Card>
                                  <Card className="p-4">
                                    <p className="text-sm text-muted-foreground">Account Balance</p>
                                    <p className="text-2xl font-semibold">
                                      {formatCurrency(Number(getSelectedAccount("asset")?.balance) || 0)}
                                    </p>
                                  </Card>
                                  <Card className="p-4">
                                    <p className="text-sm text-muted-foreground">Total Entries</p>
                                    <p className="text-2xl font-semibold">{getSelectedAccountLedgers("asset").length}</p>
                                  </Card>
                                </div>

                                <Card className="p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold">
                                      Ledger Entries - {getSelectedAccount("asset")?.name}
                                    </p>
                                    <Badge variant="secondary">{getSelectedAccountLedgers("asset").length} entries</Badge>
                                  </div>
                                  <div className="space-y-2">
                                    {getSelectedAccountLedgers("asset").length > 0 ? (
                                      getSelectedAccountLedgers("asset").map((entry: any, idx: number) => (
                                        <div key={entry.id || idx} className="flex items-center justify-between border rounded p-2">
                                          <div>
                                            <p className="text-sm font-medium">{entry.description || entry.accountName || "Entry"}</p>
                                            <p className="text-xs text-muted-foreground">
                                              {entry.accountCode} - {entry.accountName} •{" "}
                                              {entry.date ? new Date(entry.date).toLocaleDateString() : "N/A"}
                                            </p>
                                          </div>
                                          <p className="text-sm font-semibold">{formatCurrency(entry.amount || entry.debit || entry.credit || 0)}</p>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-sm text-muted-foreground">No ledger entries for this account.</p>
                                    )}
                                  </div>
                                </Card>
                              </>
                            )}

                            {!selectedAccountId.asset && (
                              <Card className="p-4">
                                <p className="text-sm text-muted-foreground text-center py-8">
                                  Please select an asset account to view its ledger entries
                                </p>
                              </Card>
                            )}
                          </div>
                        </ScrollArea>
                      </TabsContent>

                      <TabsContent value="expense" className="h-full">
                        <ScrollArea className="h-full px-6 pb-6">
                          <div className="space-y-4">
                            <Card className="p-4">
                              <div className="space-y-2">
                                <Label className="text-base font-semibold">Select Expense Account</Label>
                                <Select
                                  value={selectedAccountId.expense}
                                  onValueChange={(value) => setSelectedAccountId((prev) => ({ ...prev, expense: value }))}
                                >
                                  <SelectTrigger className="h-12 text-base">
                                    <SelectValue placeholder="Select an expense account to view ledger" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[300px]">
                                    {expenseAccounts.length > 0 ? (
                                      expenseAccounts.map((account) => (
                                        <SelectItem key={account.id} value={account.id} className="py-3">
                                          <div className="flex flex-col">
                                            <span className="font-medium">{account.code} - {account.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                              Balance: {formatCurrency(Number(account.balance) || 0)}
                                            </span>
                                          </div>
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <SelectItem value="none" disabled>No expense accounts found</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            </Card>

                            {selectedAccountId.expense && getSelectedAccount("expense") && (
                              <>
                                <div className="grid gap-4 md:grid-cols-3">
                                  <Card className="p-4">
                                    <p className="text-sm text-muted-foreground">Account Code</p>
                                    <p className="text-2xl font-semibold">{getSelectedAccount("expense")?.code}</p>
                                  </Card>
                                  <Card className="p-4">
                                    <p className="text-sm text-muted-foreground">Account Balance</p>
                                    <p className="text-2xl font-semibold">
                                      {formatCurrency(Number(getSelectedAccount("expense")?.balance) || 0)}
                                    </p>
                                  </Card>
                                  <Card className="p-4">
                                    <p className="text-sm text-muted-foreground">Total Entries</p>
                                    <p className="text-2xl font-semibold">{getSelectedAccountLedgers("expense").length}</p>
                                  </Card>
                                </div>

                                <Card className="p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold">
                                      Ledger Entries - {getSelectedAccount("expense")?.name}
                                    </p>
                                    <Badge variant="secondary">{getSelectedAccountLedgers("expense").length} entries</Badge>
                                  </div>
                                  <div className="space-y-2">
                                    {getSelectedAccountLedgers("expense").length > 0 ? (
                                      getSelectedAccountLedgers("expense").map((entry: any, idx: number) => (
                                        <div key={entry.id || idx} className="flex items-center justify-between border rounded p-2">
                                          <div>
                                            <p className="text-sm font-medium">{entry.description || entry.accountName || "Entry"}</p>
                                            <p className="text-xs text-muted-foreground">
                                              {entry.accountCode} - {entry.accountName} •{" "}
                                              {entry.date ? new Date(entry.date).toLocaleDateString() : "N/A"}
                                            </p>
                                          </div>
                                          <p className="text-sm font-semibold">{formatCurrency(entry.amount || entry.debit || entry.credit || 0)}</p>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-sm text-muted-foreground">No ledger entries for this account.</p>
                                    )}
                                  </div>
                                </Card>
                              </>
                            )}

                            {!selectedAccountId.expense && (
                              <Card className="p-4">
                                <p className="text-sm text-muted-foreground text-center py-8">
                                  Please select an expense account to view its ledger entries
                                </p>
                              </Card>
                            )}
                          </div>
                        </ScrollArea>
                      </TabsContent>

                      <TabsContent value="income" className="h-full">
                        <ScrollArea className="h-full px-6 pb-6">
                          <div className="space-y-4">
                            <Card className="p-4">
                              <div className="space-y-2">
                                <Label className="text-base font-semibold">Select Income Account</Label>
                                <Select
                                  value={selectedAccountId.income}
                                  onValueChange={(value) => setSelectedAccountId((prev) => ({ ...prev, income: value }))}
                                >
                                  <SelectTrigger className="h-12 text-base">
                                    <SelectValue placeholder="Select an income account to view ledger" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[300px]">
                                    {incomeAccounts.length > 0 ? (
                                      incomeAccounts.map((account) => (
                                        <SelectItem key={account.id} value={account.id} className="py-3">
                                          <div className="flex flex-col">
                                            <span className="font-medium">{account.code} - {account.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                              Balance: {formatCurrency(Number(account.balance) || 0)}
                                            </span>
                                          </div>
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <SelectItem value="none" disabled>No income accounts found</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            </Card>

                            {selectedAccountId.income && getSelectedAccount("income") && (
                              <>
                                <div className="grid gap-4 md:grid-cols-3">
                                  <Card className="p-4">
                                    <p className="text-sm text-muted-foreground">Account Code</p>
                                    <p className="text-2xl font-semibold">{getSelectedAccount("income")?.code}</p>
                                  </Card>
                                  <Card className="p-4">
                                    <p className="text-sm text-muted-foreground">Account Balance</p>
                                    <p className="text-2xl font-semibold">
                                      {formatCurrency(Number(getSelectedAccount("income")?.balance) || 0)}
                                    </p>
                                  </Card>
                                  <Card className="p-4">
                                    <p className="text-sm text-muted-foreground">Total Entries</p>
                                    <p className="text-2xl font-semibold">{getSelectedAccountLedgers("income").length}</p>
                                  </Card>
                                </div>

                                <Card className="p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold">
                                      Ledger Entries - {getSelectedAccount("income")?.name}
                                    </p>
                                    <Badge variant="secondary">{getSelectedAccountLedgers("income").length} entries</Badge>
                                  </div>
                                  <div className="space-y-2">
                                    {getSelectedAccountLedgers("income").length > 0 ? (
                                      getSelectedAccountLedgers("income").map((entry: any, idx: number) => (
                                        <div key={entry.id || idx} className="flex items-center justify-between border rounded p-2">
                                          <div>
                                            <p className="text-sm font-medium">{entry.description || entry.accountName || "Entry"}</p>
                                            <p className="text-xs text-muted-foreground">
                                              {entry.accountCode} - {entry.accountName} •{" "}
                                              {entry.date ? new Date(entry.date).toLocaleDateString() : "N/A"}
                                            </p>
                                          </div>
                                          <p className="text-sm font-semibold">{formatCurrency(entry.amount || entry.debit || entry.credit || 0)}</p>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-sm text-muted-foreground">No ledger entries for this account.</p>
                                    )}
                                  </div>
                                </Card>
                              </>
                            )}

                            {!selectedAccountId.income && (
                              <Card className="p-4">
                                <p className="text-sm text-muted-foreground text-center py-8">
                                  Please select an income account to view its ledger entries
                                </p>
                              </Card>
                            )}
                          </div>
                        </ScrollArea>
                      </TabsContent>

                      <TabsContent value="scrap" className="h-full">
                        <ScrollArea className="h-full px-6 pb-6">
                          <div className="space-y-4">
                            <Card className="p-4">
                              <div className="space-y-2">
                                <Label className="text-base font-semibold">Select Scrap Account</Label>
                                <Select
                                  value={selectedAccountId.scrap}
                                  onValueChange={(value) => setSelectedAccountId((prev) => ({ ...prev, scrap: value }))}
                                >
                                  <SelectTrigger className="h-12 text-base">
                                    <SelectValue placeholder="Select a scrap account to view ledger" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[300px]">
                                    {scrapAccounts.length > 0 ? (
                                      scrapAccounts.map((account) => (
                                        <SelectItem key={account.id} value={account.id} className="py-3">
                                          <div className="flex flex-col">
                                            <span className="font-medium">{account.code} - {account.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                              Balance: {formatCurrency(Number(account.balance) || 0)}
                                            </span>
                                          </div>
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <SelectItem value="none" disabled>No scrap accounts found</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            </Card>

                            {selectedAccountId.scrap && getSelectedAccount("scrap") && (
                              <>
                                <div className="grid gap-4 md:grid-cols-3">
                                  <Card className="p-4">
                                    <p className="text-sm text-muted-foreground">Account Code</p>
                                    <p className="text-2xl font-semibold">{getSelectedAccount("scrap")?.code}</p>
                                  </Card>
                                  <Card className="p-4">
                                    <p className="text-sm text-muted-foreground">Account Balance</p>
                                    <p className="text-2xl font-semibold">
                                      {formatCurrency(Number(getSelectedAccount("scrap")?.balance) || 0)}
                                    </p>
                                  </Card>
                                  <Card className="p-4">
                                    <p className="text-sm text-muted-foreground">Total Entries</p>
                                    <p className="text-2xl font-semibold">{getSelectedAccountLedgers("scrap").length}</p>
                                  </Card>
                                </div>

                                <Card className="p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold">
                                      Ledger Entries - {getSelectedAccount("scrap")?.name}
                                    </p>
                                    <Badge variant="secondary">{getSelectedAccountLedgers("scrap").length} entries</Badge>
                                  </div>
                                  <div className="space-y-2">
                                    {getSelectedAccountLedgers("scrap").length > 0 ? (
                                      getSelectedAccountLedgers("scrap").map((entry: any, idx: number) => (
                                        <div key={entry.id || idx} className="flex items-center justify-between border rounded p-2">
                                          <div>
                                            <p className="text-sm font-medium">{entry.description || entry.accountName || "Entry"}</p>
                                            <p className="text-xs text-muted-foreground">
                                              {entry.accountCode} - {entry.accountName} •{" "}
                                              {entry.date ? new Date(entry.date).toLocaleDateString() : "N/A"}
                                            </p>
                                          </div>
                                          <p className="text-sm font-semibold">{formatCurrency(entry.amount || entry.debit || entry.credit || 0)}</p>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-sm text-muted-foreground">No ledger entries for this account.</p>
                                    )}
                                  </div>
                                </Card>
                              </>
                            )}

                            {!selectedAccountId.scrap && (
                              <Card className="p-4">
                                <p className="text-sm text-muted-foreground text-center py-8">
                                  Please select a scrap account to view its ledger entries
                                </p>
                              </Card>
                            )}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <div className="px-6 py-4 border-t bg-muted/50 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isEdit ? "Save Changes" : "Create Property"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

