"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Users,
  DollarSign,
  Home,
  Filter,
  MoreVertical,
  Edit,
  FileText,
  Trash2,
  Eye,
  ShoppingCart,
  KeyRound,
  Loader2,
  Download,
} from "lucide-react"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { AddPropertyDialog } from "./add-property-dialog"
import { PropertyDeleteDialog } from "./property-delete-dialog"
import { EditStatusDialog } from "./edit-status-dialog"
import { PropertyStructureSetupDialog } from "./property-structure-setup-dialog"
import { UnitsView } from "./units-view"
import { TenantsView } from "./tenants-view"
import { LeasesView } from "./leases-view"
import { SalesView } from "./sales-view"
import { BuyersView } from "./buyers-view"
import { SellersView } from "./sellers-view"
import { ListToolbar } from "@/components/shared/list-toolbar"
import { UnifiedFilterDrawer } from "@/components/shared/unified-filter-drawer"
import { DownloadReportDialog } from "@/components/ui/download-report-dialog"
import { saveFilters, loadFilters } from "@/lib/filter-store"
import { toSimpleFilters, toExportFilters } from "@/lib/filter-transform"
import { countActiveFilters } from "@/lib/filter-config-registry"
import { apiService } from "@/lib/api"
import { PropertyToasts, handleApiError } from "@/lib/toast-utils"
import { formatCurrency } from "@/lib/utils"
import { getPropertyImageSrc } from "@/lib/property-image-utils"

export function PropertiesView() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilterDrawer, setShowFilterDrawer] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>(loadFilters("properties", undefined) || {})
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingPropertyId, setEditingPropertyId] = useState<number | string | null>(null)
  const [editingStatusProperty, setEditingStatusProperty] = useState<any | null>(null)
  const [deletingProperty, setDeletingProperty] = useState<any | null>(null)
  const [properties, setProperties] = useState<any[]>([])
  const [propertyStats, setPropertyStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTabState] = useState("properties")
  const [hasInitializedTab, setHasInitializedTab] = useState(false)
  const tabStorageKey = "properties-active-tab"
  const [showStructureDialog, setShowStructureDialog] = useState(false)
  const [structurePropertyId, setStructurePropertyId] = useState<string | null>(null)
  const [structurePropertyName, setStructurePropertyName] = useState<string>("")
  const [reportLoading, setReportLoading] = useState(false)
  const [showDownloadDialog, setShowDownloadDialog] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const updateActiveTab = useCallback(
    (value: string, { shouldPersistQuery = true }: { shouldPersistQuery?: boolean } = {}) => {
      if (value !== activeTab) {
        setActiveTabState(value)
      }

      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(tabStorageKey, value)
        } catch {
          // Ignore storage errors (private mode, etc.)
        }
      }

      if (shouldPersistQuery) {
        const params = new URLSearchParams(searchParams.toString())
        params.set("tab", value)
        const query = params.toString()
        router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false })
      }
    },
    [activeTab, pathname, router, searchParams, tabStorageKey],
  )

  useEffect(() => {
    const tabFromQuery = searchParams.get("tab")
    if (tabFromQuery && tabFromQuery !== activeTab) {
      updateActiveTab(tabFromQuery, { shouldPersistQuery: false })
      if (!hasInitializedTab) {
        setHasInitializedTab(true)
      }
      return
    }

    if (!hasInitializedTab) {
      let storedTab: string | null = null
      if (typeof window !== "undefined") {
        try {
          storedTab = sessionStorage.getItem(tabStorageKey)
        } catch {
          storedTab = null
        }
      }

      if (storedTab && storedTab !== activeTab) {
        updateActiveTab(storedTab)
      } else if (!tabFromQuery) {
        updateActiveTab(activeTab)
      }

      setHasInitializedTab(true)
    }
  }, [activeTab, hasInitializedTab, searchParams, updateActiveTab])

  const handleTabChange = useCallback(
    (value: string) => {
      updateActiveTab(value)
    },
    [updateActiveTab],
  )

  useEffect(() => {
    const urlSearch = searchParams.get("search")
    if (urlSearch && urlSearch !== searchQuery) {
      setSearchQuery(urlSearch)
    }
    fetchStats()
  }, [searchParams])

  useEffect(() => {
    fetchProperties()
  }, [currentPage, itemsPerPage, searchQuery])

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const filters = toSimpleFilters(activeFilters)
      const statusVal = filters.status
      const typeVal = filters.type
      const response = await apiService.properties.getAll({
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery,
        status: statusVal ? (Array.isArray(statusVal) ? (statusVal[0] as string) : (statusVal as string)) : undefined,
        type: typeVal ? (Array.isArray(typeVal) ? (typeVal[0] as string) : (typeVal as string)) : undefined,
      })

      const responseData = response.data
      if (responseData?.success || Array.isArray(responseData?.data) || Array.isArray(responseData)) {
        const data = responseData?.data || responseData
        setProperties(Array.isArray(data) ? data : [])
        const pagination = responseData?.pagination || {}
        setTotalPages(pagination.pages || 1)
        setTotalItems(pagination.total || 0)
      } else {
        setProperties([])
        setTotalPages(1)
        setTotalItems(0)
      }
    } catch (err: any) {
      console.error("Failed to fetch properties:", err)
      setError(err.message || "Failed to load properties")
      setProperties([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, itemsPerPage, searchQuery, activeFilters])

  const fetchStats = async () => {
    try {
      setStatsLoading(true)
      const response: any = await apiService.stats.getPropertiesStats()
      // Backend returns { success: true, data: {...} }
      const responseData = response.data as any
      const data = responseData?.data || responseData || {}

      // Always set stats boxes, even if data is empty
      setPropertyStats([
        {
          name: "Total Properties",
          value: data.totalProperties?.toString() || "0",
          change: data.propertiesChange || "+0 this month",
          icon: Building2,
          href: "/details/properties",
        },
        {
          name: "Active Properties",
          value: data.activeProperties?.toString() || "0",
          change: "Currently active",
          icon: Building2,
          href: "/details/properties",
        },
        {
          name: "Properties for Sale",
          value: data.propertiesForSale?.toString() || "0",
          change: data.saleValue ? `Rs ${(data.saleValue / 1000000).toFixed(1)}M total value` : "Rs 0 total value",
          icon: ShoppingCart,
          href: "/details/properties-for-sale",
        },
        {
          name: "Total Units",
          value: data.totalUnits?.toString() || "0",
          change: "Across all properties",
          icon: Home,
          href: "/details/units",
        },
        {
          name: "Occupied Units",
          value: data.occupiedUnits?.toString() || "0",
          change: data.occupancyRate ? `${data.occupancyRate}% occupancy` : "0% occupancy",
          icon: KeyRound,
          href: "/details/occupied-units",
        },
        {
          name: "Vacant Units",
          value: data.vacantUnits?.toString() || "0",
          change: data.vacancyRate ? `${data.vacancyRate}% vacancy` : "0% vacancy",
          icon: Home,
          href: "/details/vacant-units",
        },
        {
          name: "Monthly Revenue",
          value: data.monthlyRevenue ? `Rs ${(data.monthlyRevenue / 1000).toFixed(0)}K` : "Rs 0",
          change: "From occupied units",
          icon: DollarSign,
          href: "/details/revenue",
        },
        {
          name: "Total Tenants",
          value: data.totalTenants?.toLocaleString() || "0",
          change: data.tenantsChange || "+0 this month",
          icon: Users,
          href: "/details/tenants",
        },
      ])
    } catch (err: any) {
      // Don't log timeout errors
      if (err?.code !== 'ECONNABORTED' && !err?.message?.includes('timeout')) {
        console.error("Failed to fetch property stats:", err)
      }
      // Even on error, show boxes with default values
      setPropertyStats([
        {
          name: "Total Properties",
          value: "0",
          change: "+0 this month",
          icon: Building2,
          href: "/details/properties",
        },
        {
          name: "Active Properties",
          value: "0",
          change: "Currently active",
          icon: Building2,
          href: "/details/properties",
        },
        {
          name: "Properties for Sale",
          value: "0",
          change: "Rs 0 total value",
          icon: ShoppingCart,
          href: "/details/properties-for-sale",
        },
        {
          name: "Total Units",
          value: "0",
          change: "Across all properties",
          icon: Home,
          href: "/details/units",
        },
        {
          name: "Occupied Units",
          value: "0",
          change: "0% occupancy",
          icon: KeyRound,
          href: "/details/occupied-units",
        },
        {
          name: "Vacant Units",
          value: "0",
          change: "0% vacancy",
          icon: Home,
          href: "/details/vacant-units",
        },
        {
          name: "Monthly Revenue",
          value: "Rs 0",
          change: "From occupied units",
          icon: DollarSign,
          href: "/details/revenue",
        },
        {
          name: "Total Tenants",
          value: "0",
          change: "+0 this month",
          icon: Users,
          href: "/details/tenants",
        },
      ])
    } finally {
      setStatsLoading(false)
    }
  }

  const handleGeneratePropertyReport = async (property: any) => {
    try {
      setReportLoading(true)

      // Fetch full property details with deals and payment plan
      const response: any = await apiService.properties.getById(String(property.id))
      const propertyData = response?.data?.data || response?.data || property

      // Prepare data for unified report
      const unitsValue = typeof propertyData.units === "number" ? propertyData.units : propertyData._count?.units ?? (Array.isArray(propertyData.units) ? propertyData.units.length : 0)
      const totalAreaValue = typeof propertyData.totalArea === "number" ? propertyData.totalArea : typeof propertyData.totalArea === "string" ? parseFloat(propertyData.totalArea.replace(/[^0-9.]/g, "")) || 0 : 0

      // Get payment plan from first deal that has one
      const reportPaymentPlan = propertyData?.deals ? (() => {
        for (const deal of propertyData.deals) {
          if (deal.paymentPlan) {
            const plan = deal.paymentPlan
            const installments = plan.installments || []
            const totalInstallments = installments.length
            const installmentAmount = totalInstallments > 0 ? installments[0].amount || 0 : 0

            // Calculate duration (months)
            let duration = "N/A"
            if (installments.length > 0) {
              const firstDate = new Date(installments[0].dueDate || Date.now())
              const lastDate = new Date(installments[installments.length - 1].dueDate || Date.now())
              const months = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
              duration = `${months} Months`
            }

            return {
              totalAmount: plan.totalAmount || 0,
              downPayment: plan.downPayment || 0,
              installments: totalInstallments,
              installmentAmount: installmentAmount,
              duration: duration,
              schedule: installments.map((inst: any, idx: number) => {
                let dateStr = "N/A"
                if (inst.dueDate) {
                  const date = new Date(inst.dueDate)
                  const day = String(date.getDate()).padStart(2, "0")
                  const month = date.toLocaleDateString("en-US", { month: "short" })
                  const year = date.getFullYear()
                  dateStr = `${day} ${month} ${year}`
                }
                return {
                  no: inst.installmentNumber || idx + 1,
                  date: dateStr,
                  amount: formatCurrency(inst.amount || 0),
                  status: inst.status === "paid" ? "Paid" : inst.status === "overdue" ? "Overdue" : "Pending",
                }
              }),
            }
          }
        }
        return null
      })() : null

      // Prepare deals data
      const reportDeals = propertyData?.deals ? propertyData.deals.map((deal: any) => {
        const totalReceived = deal.payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0
        const dealAmount = deal.dealAmount || deal.amount || 0
        return {
          title: deal.title || "N/A",
          client: deal.contactName || deal.client?.name || "N/A",
          amount: dealAmount,
          received: totalReceived,
          pending: Math.max(0, dealAmount - totalReceived),
          stage: deal.stage || "N/A",
        }
      }) : []

      const reportData = {
        title: "Property Report",
        systemId: propertyData.propertyCode ? `PROP-${propertyData.propertyCode}` : `PROP-${propertyData.id}`,
        generatedOn: new Date().toLocaleString("en-US", {
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }),
        sections: [
          {
            title: "Basic Information",
            data: {
              "Property Name": propertyData.tid || "N/A",
              "Type": propertyData.type || "N/A",
              "Status": propertyData.status || "N/A",
              "Year Built": propertyData.yearBuilt || "N/A",
              "Area": (() => {
                if (!totalAreaValue) return "N/A"
                if (totalAreaValue >= 5445) {
                  const kanal = Math.floor(totalAreaValue / 5445)
                  const remainingMarla = Math.round((totalAreaValue % 5445) / 272.25)
                  return remainingMarla > 0 ? `${kanal} Kanal ${remainingMarla} Marla (${totalAreaValue.toLocaleString()} sq ft)` : `${kanal} Kanal (${totalAreaValue.toLocaleString()} sq ft)`
                }
                const marla = Math.round(totalAreaValue / 272.25)
                return `${marla} Marla (${totalAreaValue.toLocaleString()} sq ft)`
              })(),
              "Units": `${propertyData.occupied || 0} / ${unitsValue}`,
              "Sale Price": propertyData.salePrice ? `Rs ${Number(propertyData.salePrice).toLocaleString("en-IN")}` : "Rs 0",
              "Address": propertyData.address || "N/A"
            }
          },
          {
            title: "Finance Summary",
            data: {
              "Total Received": `Rs ${Number(propertyData.financeSummary?.totalReceived || 0).toLocaleString("en-IN")}`,
              "Total Expenses": `Rs ${Number(propertyData.financeSummary?.totalExpenses || 0).toLocaleString("en-IN")}`,
              "Pending Amount": `Rs ${Number(propertyData.financeSummary?.pendingAmount || 0).toLocaleString("en-IN")}`,
              "Active Deals": propertyData.financeSummary?.entryCount || propertyData.financeRecords?.length || 0
            }
          },
          ...(reportPaymentPlan ? [{
            title: "Payment Plan Summary",
            data: {
              "Total Amount": formatCurrency(reportPaymentPlan.totalAmount || 0),
              "Down Payment": formatCurrency(reportPaymentPlan.downPayment || 0),
              "Installments": reportPaymentPlan.installments || 0,
              "Installment Amount": formatCurrency(reportPaymentPlan.installmentAmount || 0),
              "Duration": reportPaymentPlan.duration || "N/A"
            }
          },
          {
            title: "Payment Schedule",
            tableData: reportPaymentPlan.schedule.map((s: any) => ({
              no: s.no,
              date: s.date,
              amount: s.amount,
              status: s.status
            })),
            tableColumns: [
              { key: 'no', label: '#', type: 'number' as 'number' },
              { key: 'date', label: 'Due Date', type: 'date' as 'date' },
              { key: 'amount', label: 'Amount', type: 'currency' as 'currency' },
              { key: 'status', label: 'Status' }
            ]
          }] : []),
          ...(reportDeals.length > 0 ? [{
            title: "Active Deals",
            tableData: reportDeals.map((deal: any) => ({
              title: deal.title,
              client: deal.client,
              amount: deal.amount,
              received: deal.received,
              pending: deal.pending,
              stage: deal.stage
            })),
            tableColumns: [
              { key: 'title', label: 'Deal Title' },
              { key: 'client', label: 'Client' },
              { key: 'amount', label: 'Amount', type: 'currency' as 'currency' },
              { key: 'received', label: 'Received', type: 'currency' as 'currency' },
              { key: 'pending', label: 'Pending', type: 'currency' as 'currency' },
              { key: 'stage', label: 'Stage' }
            ]
          }] : [])
        ]
      }

      // Open in new tab
      const { openReportInNewTab } = await import("@/components/reports/report-utils")
      openReportInNewTab(reportData)
    } catch (error: any) {
      console.error("Failed to fetch property details for report", error)
      handleApiError(error, "Failed to load property details")
    } finally {
      setReportLoading(false)
    }
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground text-balance">Property Management</h1>
          <p className="text-muted-foreground mt-1">Manage all your properties, units, and tenants</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Property
          </Button>
        </div>
      </div>

      {/* Stats Boxes - Always show, even if empty */}
      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center justify-center h-24">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {propertyStats.length > 0 ? (
            propertyStats.map((stat) => (
              <Card
                key={stat.name}
                className="p-6 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                onClick={() => router.push(stat.href)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <stat.icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{stat.change}</p>
                </div>
              </Card>
            ))
          ) : (
            // Default boxes if stats array is empty
            [
              { name: "Total Properties", value: "0", change: "+0 this month", icon: Building2, href: "/details/properties" },
              { name: "Active Properties", value: "0", change: "Currently active", icon: Building2, href: "/details/properties" },
              { name: "Properties for Sale", value: "0", change: "Rs 0 total value", icon: ShoppingCart, href: "/details/properties-for-sale" },
              { name: "Total Units", value: "0", change: "Across all properties", icon: Home, href: "/details/units" },
              { name: "Occupied Units", value: "0", change: "0% occupancy", icon: KeyRound, href: "/details/occupied-units" },
              { name: "Vacant Units", value: "0", change: "0% vacancy", icon: Home, href: "/details/vacant-units" },
              { name: "Monthly Revenue", value: "Rs 0", change: "From occupied units", icon: DollarSign, href: "/details/revenue" },
              { name: "Total Tenants", value: "0", change: "+0 this month", icon: Users, href: "/details/tenants" },
            ].map((stat) => (
              <Card
                key={stat.name}
                className="p-6 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                onClick={() => router.push(stat.href)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <stat.icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{stat.change}</p>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="units">Units</TabsTrigger>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="leases">Leases</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="buyers">Buyers</TabsTrigger>
          <TabsTrigger value="sellers">Seller</TabsTrigger>
        </TabsList>

        {/* Properties Tab */}
        <TabsContent value="properties" className="space-y-4">
          <ListToolbar
            searchPlaceholder="Search by TID, title, location…"
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            onFilterClick={() => setShowFilterDrawer(true)}
            activeFilterCount={countActiveFilters(activeFilters)}
            onDownloadClick={() => setShowDownloadDialog(true)}
          />

          {/* Properties Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">{error}</div>
          ) : properties.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No properties found</div>
          ) : (
            <>
            <Card className="p-0">
              <div className="p-4 border-b">
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{properties.length}</span> of <span className="font-semibold text-foreground">{totalItems}</span> properties
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>TID</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Occupied</TableHead>
                    <TableHead>Sale Price</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties.map((property) => {
                      const totalUnits = property.units || property._count?.units || 0
                      const occupiedUnits = property.occupied || 0
                      const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0
                      
                      return (
                        <TableRow
                          key={property.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/property/${property.id}`)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              {property.imageUrl ? (
                                <div className="h-10 w-10 rounded overflow-hidden flex-shrink-0">
                                  <img
                                    src={getPropertyImageSrc(property.id, property.imageUrl)}
                                    alt={property.tid || "Property"}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      const imgElement = e.target as HTMLImageElement;
                                      imgElement.style.display = 'none';
                                      const parent = imgElement.parentElement;
                                      if (parent && !parent.querySelector('.error-placeholder')) {
                                        const placeholder = document.createElement('div');
                                        placeholder.className = 'h-full w-full flex items-center justify-center bg-muted error-placeholder';
                                        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                                        svg.setAttribute('class', 'h-6 w-6 text-muted-foreground');
                                        svg.setAttribute('fill', 'none');
                                        svg.setAttribute('viewBox', '0 0 24 24');
                                        svg.setAttribute('stroke', 'currentColor');
                                        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                                        path.setAttribute('stroke-linecap', 'round');
                                        path.setAttribute('stroke-linejoin', 'round');
                                        path.setAttribute('stroke-width', '2');
                                        path.setAttribute('d', 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z');
                                        svg.appendChild(path);
                                        placeholder.appendChild(svg);
                                        parent.appendChild(placeholder);
                                      }
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <Building2 className="h-5 w-5 text-primary" />
                                </div>
                              )}
                              <div>
                                <div className="font-semibold">{property.name || "N/A"}</div>
                                <div className="text-xs text-muted-foreground">{property.propertyCode || "No Code"}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs">{property.tid || "—"}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{property.location || "—"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                property.status === "Active" ? "default" :
                                  property.status === "Maintenance" ? "destructive" :
                                    property.status === "For Sale" ? "secondary" :
                                      "outline"
                              }
                              className="cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingStatusProperty({ id: property.id, status: property.status || "Active", name: property.tid })
                              }}
                            >
                              {property.status || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground max-w-[200px]">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{property.address || property.location || "—"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Home className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold">{occupiedUnits}/{totalUnits}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold">{occupancyRate}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {property.salePrice !== undefined && property.salePrice !== null ? (
                              <span className="font-semibold">
                                Rs {Number(property.salePrice).toLocaleString("en-IN")}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold">{property.revenue || "Rs 0"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => router.push(`/property/${property.id}`)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/ledger/property/${property.id}`)}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Open Ledger
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleGeneratePropertyReport(property)}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  Generate Report
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setEditingPropertyId(property.id)
                                  setShowAddDialog(true)
                                }}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setStructurePropertyId(String(property.id))
                                  setStructurePropertyName(property.tid || "")
                                  setShowStructureDialog(true)
                                }}>
                                  <Building2 className="h-4 w-4 mr-2" />
                                  Create Structure
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => {
                                    setDeletingProperty({
                                      id: property.id,
                                      name: property.tid,
                                      propertyCode: property.propertyCode,
                                    })
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
            </Card>
            {totalPages > 1 && (
                <div className="mt-4 flex flex-col items-center gap-2">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      <PaginationItem>
                        <span className="flex h-9 min-w-[2rem] items-center justify-center text-sm font-medium">
                          Page {currentPage} of {totalPages}
                        </span>
                      </PaginationItem>

                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                  <p className="text-xs text-muted-foreground">
                    Total {totalItems} properties
                  </p>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Units Tab */}
        <TabsContent value="units">
          <UnitsView />
        </TabsContent>

        {/* Tenants Tab */}
        <TabsContent value="tenants">
          <TenantsView />
        </TabsContent>

        {/* Leases Tab */}
        <TabsContent value="leases">
          <LeasesView />
        </TabsContent>

        {/* Sales Tab */}
        <TabsContent value="sales">
          <SalesView />
        </TabsContent>

        {/* Buyers Tab */}
        <TabsContent value="buyers">
          <BuyersView />
        </TabsContent>

        {/* Seller Tab */}
        <TabsContent value="sellers">
          <SellersView />
        </TabsContent>
      </Tabs>

      {deletingProperty && (
        <PropertyDeleteDialog
          open={!!deletingProperty}
          propertyId={deletingProperty.id}
          propertyName={deletingProperty.tid}
          propertyCode={deletingProperty.propertyCode}
          onOpenChange={(open) => {
            if (!open) setDeletingProperty(null)
          }}
          onDeleted={() => {
            fetchProperties()
            fetchStats()
            setDeletingProperty(null)
          }}
        />
      )}
      <AddPropertyDialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open)
          if (!open) {
            setEditingPropertyId(null)
          }
        }}
        propertyId={editingPropertyId}
        onSuccess={() => {
          fetchProperties()
          fetchStats()
          setEditingPropertyId(null)
        }}
      />
      {editingStatusProperty && (
        <EditStatusDialog
          open={!!editingStatusProperty}
          onOpenChange={(open) => !open && setEditingStatusProperty(null)}
          onSuccess={() => {
            fetchProperties()
            fetchStats()
            setEditingStatusProperty(null)
          }}
          entityType="property"
          entityId={editingStatusProperty.id}
          currentStatus={editingStatusProperty.status}
          entityName={editingStatusProperty.name}
        />
      )}

      {/* Structure Setup Dialog */}
      {structurePropertyId && (
        <PropertyStructureSetupDialog
          open={showStructureDialog}
          onOpenChange={(open) => {
            setShowStructureDialog(open)
            if (!open) {
              setStructurePropertyId(null)
              setStructurePropertyName("")
            }
          }}
          propertyId={structurePropertyId}
          propertyName={structurePropertyName}
          onComplete={() => {
            // Refresh properties list
            fetchProperties()
          }}
        />
      )}

      {/* Structure Setup Dialog */}
      {structurePropertyId && (
        <PropertyStructureSetupDialog
          open={showStructureDialog}
          onOpenChange={(open) => {
            setShowStructureDialog(open)
            if (!open) {
              setStructurePropertyId(null)
              setStructurePropertyName("")
            }
          }}
          propertyId={structurePropertyId}
          propertyName={structurePropertyName}
          onComplete={() => {
            // Refresh properties list
            fetchProperties()
          }}
        />
      )}

      <DownloadReportDialog
        open={showDownloadDialog}
        onOpenChange={setShowDownloadDialog}
        entity="property"
        module="properties"
        entityDisplayName="Properties"
        filters={toExportFilters(activeFilters, "properties")}
        search={searchQuery || undefined}
        pagination={
          activeTab === "properties"
            ? { page: currentPage, pageSize: itemsPerPage }
            : undefined
        }
      />

      {activeTab === "properties" && (
        <UnifiedFilterDrawer
          open={showFilterDrawer}
          onOpenChange={setShowFilterDrawer}
          entity="properties"
          initialFilters={activeFilters}
          onApply={(filters) => {
            setActiveFilters(filters)
            saveFilters("properties", undefined, filters)
          }}
        />
      )}
    </div>
  )
}
