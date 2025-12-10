"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
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
  Trash2,
  Eye,
  ShoppingCart,
  KeyRound,
  Loader2,
  FileText,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { AddPropertyDialog } from "./add-property-dialog"
import { PropertyDetailsDialog } from "./property-details-dialog"
import { PropertyDeleteDialog } from "./property-delete-dialog"
import { EditStatusDialog } from "./edit-status-dialog"
import { PropertyStructureSetupDialog } from "./property-structure-setup-dialog"
import { UnitsView } from "./units-view"
import { TenantsView } from "./tenants-view"
import { LeasesView } from "./leases-view"
import { SalesView } from "./sales-view"
import { BuyersView } from "./buyers-view"
import { SellersView } from "./sellers-view"
import { ReportGenerator } from "@/components/shared/report-generator"
import { apiService } from "@/lib/api"
import { PropertyToasts, handleApiError } from "@/lib/toast-utils"

export function PropertiesView() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [selectedProperty, setSelectedProperty] = useState<number | null>(null)
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
    fetchProperties()
    fetchStats()

    // Check for search query from URL
    const urlSearch = searchParams.get("search")
    if (urlSearch) {
      setSearchQuery(urlSearch)
    }
  }, [searchParams])

  const fetchProperties = async () => {
    try {
      setLoading(true)
      setError(null)
      const response: any = await apiService.properties.getAll()
      // Backend returns { success: true, data: [...] }
      const responseData = response.data as any
      const propertiesData = Array.isArray(responseData?.data) ? responseData.data : Array.isArray(responseData) ? responseData : []
      setProperties(propertiesData)
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || "Failed to fetch properties")
      setProperties([])
    } finally {
      setLoading(false)
    }
  }

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
    } catch (err) {
      console.error("Failed to fetch property stats:", err)
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
      const response = await apiService.properties.getReport(String(property.id))
      const blob = new Blob([response.data as Blob], { type: "application/pdf" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${(property.name || "property").replace(/\s+/g, "-").toLowerCase()}-report.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      console.error("Failed to generate property report", error)
      handleApiError(error, "Failed to generate property report")
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
          <ReportGenerator
            moduleName="Properties"
            availableFields={["Property Name", "Type", "Address", "Units", "Occupancy Rate", "Revenue", "Status"]}
            data={properties}
            getData={async () => {
              const response: any = await apiService.properties.getAll()
              const responseData = response.data as any
              return Array.isArray(responseData?.data) ? responseData.data : Array.isArray(responseData) ? responseData : []
            }}
          />
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
          {/* Search and Filter */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search properties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                  {(filterStatus !== "all" || filterType !== "all") && (
                    <span className="ml-2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                      {(filterStatus !== "all" ? 1 : 0) + (filterType !== "all" ? 1 : 0)}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                        <SelectItem value="Vacant">Vacant</SelectItem>
                        <SelectItem value="For Sale">For Sale</SelectItem>
                        <SelectItem value="For Rent">For Rent</SelectItem>
                        <SelectItem value="Sold">Sold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="apartment">Apartment</SelectItem>
                        <SelectItem value="house">House</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="plot">Plot</SelectItem>
                        <SelectItem value="villa">Villa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setFilterStatus("all")
                        setFilterType("all")
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Properties Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">{error}</div>
          ) : properties.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No properties found</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {properties
                .filter((property) => {
                  // Search filter
                  const matchesSearch =
                    property.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    property.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    property.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    property.propertyCode?.toLowerCase().includes(searchQuery.toLowerCase())

                  // Status filter
                  const matchesStatus = filterStatus === "all" || property.status === filterStatus

                  // Type filter
                  const matchesType = filterType === "all" || property.type?.toLowerCase() === filterType.toLowerCase()

                  return matchesSearch && matchesStatus && matchesType
                })
                .map((property) => (
                  <Card key={property.id} className="p-0 overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Property Image */}
                    {property.imageUrl ? (
                      <div className="w-full h-48 overflow-hidden">
                        <img
                          src={
                            property.imageUrl.startsWith('http')
                              ? property.imageUrl
                              : property.imageUrl.startsWith('/')
                                ? `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/api\/?$/, '')}${property.imageUrl}`
                                : property.imageUrl
                          }
                          alt={property.name || "Property image"}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            // SECURITY: Use React state instead of innerHTML to prevent XSS
                            // Hide image on error and show icon instead
                            const imgElement = e.target as HTMLImageElement;
                            imgElement.style.display = 'none';
                            const parent = imgElement.parentElement;
                            if (parent && !parent.querySelector('.error-placeholder')) {
                              // SECURITY: Create safe placeholder using DOM methods (no innerHTML)
                              const placeholder = document.createElement('div');
                              placeholder.className = 'w-full h-full flex items-center justify-center bg-muted error-placeholder';

                              // Create SVG element safely
                              const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                              svg.setAttribute('class', 'h-12 w-12 text-muted-foreground');
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
                      <div className="w-full h-48 bg-muted flex items-center justify-center">
                        <Building2 className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}

                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground text-lg">{property.name}</h3>
                          {property.propertyCode && (
                            <p className="text-xs text-muted-foreground font-mono mt-1">
                              Code: {property.propertyCode}
                            </p>
                          )}
                          {property.salePrice !== undefined && property.salePrice !== null && (
                            <p className="text-sm text-foreground mt-1 font-semibold">
                              Sale Price: Rs {Number(property.salePrice).toLocaleString("en-IN")}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary">{property.type}</Badge>
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
                                setEditingStatusProperty({ id: property.id, status: property.status || "Active", name: property.name })
                              }}
                            >
                              {property.status}
                            </Badge>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedProperty(property.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
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
                              setStructurePropertyName(property.name || "")
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
                                  name: property.name,
                                  propertyCode: property.propertyCode,
                                })
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
                        <div>
                          <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <Home className="h-3 w-3" />
                            <span className="text-xs">Units</span>
                          </div>
                          <p className="text-sm font-semibold text-foreground">
                            {property.occupied || 0}/{property.units || property._count?.units || 0}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <Users className="h-3 w-3" />
                            <span className="text-xs">Occupied</span>
                          </div>
                          <p className="text-sm font-semibold text-foreground">
                            {property.units || property._count?.units ?
                              Math.round(((property.occupied || 0) / (property.units || property._count?.units)) * 100) :
                              0}%
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <DollarSign className="h-3 w-3" />
                            <span className="text-xs">Revenue</span>
                          </div>
                          <p className="text-sm font-semibold text-foreground">{property.revenue || "Rs 0"}</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
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

      {/* Dialogs */}
      {selectedProperty && (
        <PropertyDetailsDialog
          propertyId={selectedProperty}
          open={!!selectedProperty}
          onOpenChange={(open) => !open && setSelectedProperty(null)}
        />
      )}
      {deletingProperty && (
        <PropertyDeleteDialog
          open={!!deletingProperty}
          propertyId={deletingProperty.id}
          propertyName={deletingProperty.name}
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
    </div>
  )
}
