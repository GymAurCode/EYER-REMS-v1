"use client"

import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Search, Building2, Home, MapPin, Loader2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useRouter } from "next/navigation"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { apiService } from "@/lib/api"
import { EditStatusDialog } from "@/components/properties/edit-status-dialog"
import { LocationTreePanel } from "@/components/locations/location-tree-panel"
import { formatLevelLabel } from "@/lib/location"
import type { LocationTreeNode } from "@/lib/location"

const useDebouncedValue = (value: string, delay = 400) => {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timeout)
  }, [value, delay])
  return debounced
}

export default function PropertiesDetailsPage() {
  const router = useRouter()
  const [editingStatusProperty, setEditingStatusProperty] = useState<{ id: number | string; status: string; name: string } | null>(null)
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalUnits: 0,
    locations: 0,
    avgOccupancy: 0,
    propertiesChange: "+0 this month",
    occupancyChange: "+0% from last month",
  })
  const [propertyTypeData, setPropertyTypeData] = useState<any[]>([])
  const [propertyStatusData, setPropertyStatusData] = useState<any[]>([])
  const [propertiesList, setPropertiesList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 420)
  const [selectedLocation, setSelectedLocation] = useState<LocationTreeNode | null>(null)
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [statsResponse, propertiesResponse] = await Promise.all([
        apiService.stats.getPropertiesStats().catch(() => ({ data: {} })),
        apiService.properties
          .getAll({
            search: debouncedSearchTerm || undefined,
            locationId: selectedLocationId || undefined,
          })
          .catch(() => ({ data: [] })),
      ])

      const statsResponseData: any = statsResponse?.data || {}
      const propertiesResponseData: any = propertiesResponse?.data || {}
      const statsData = statsResponseData?.data || statsResponseData || {}
      const properties = propertiesResponseData?.data || propertiesResponseData || []
      setPropertyTypeData(statsData.propertyTypeData || [])
      setPropertyStatusData(statsData.propertyStatusData || [])

      const uniqueLocations = new Set(
        properties
          .map((p: any) => p.locationNode?.name || p.location)
          .filter(Boolean),
      )
      const avgOccupancy = statsData.occupancyRate || 0

      setStats({
        totalProperties: statsData.totalProperties || 0,
        totalUnits: statsData.totalUnits || 0,
        locations: uniqueLocations.size,
        avgOccupancy,
        propertiesChange: statsData.propertiesChange || "+0 this month",
        occupancyChange: statsData.occupancyChange || "+0% from last month",
      })

      setPropertiesList(properties)
    } catch (err) {
      console.error("Failed to fetch properties data:", err)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearchTerm, selectedLocationId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Total Properties Details</h1>
            <p className="text-muted-foreground mt-1">Complete overview of all properties and their performance</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Total Properties</p>
            {loading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mt-2" />
            ) : (
              <>
                <p className="text-3xl font-bold text-foreground mt-2">{stats.totalProperties.toLocaleString()}</p>
                <p className="text-sm text-success mt-1">{stats.propertiesChange}</p>
              </>
            )}
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <Home className="h-5 w-5 text-success" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Total Units</p>
            {loading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mt-2" />
            ) : (
              <>
                <p className="text-3xl font-bold text-foreground mt-2">{stats.totalUnits.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-1">Across all properties</p>
              </>
            )}
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                <MapPin className="h-5 w-5 text-orange-500" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Locations</p>
            {loading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mt-2" />
            ) : (
              <>
                <p className="text-3xl font-bold text-foreground mt-2">{stats.locations}</p>
                <p className="text-sm text-muted-foreground mt-1">Cities covered</p>
              </>
            )}
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Building2 className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Avg Occupancy</p>
            {loading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mt-2" />
            ) : (
              <>
                <p className="text-3xl font-bold text-foreground mt-2">{stats.avgOccupancy.toFixed(1)}%</p>
                <p className="text-sm text-success mt-1">{stats.occupancyChange}</p>
              </>
            )}
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Properties by Type</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={propertyTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: any) => {
                    const { name, percent } = props;
                    return `${name} ${((percent || 0) * 100).toFixed(0)}%`;
                  }}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {propertyTypeData.map((entry, index) => {
                    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff']
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  })}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Properties by Status</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={propertyStatusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(320px,360px)_1fr]">
          <LocationTreePanel
            selectedId={selectedLocationId}
            onSelect={(node) => {
              if (selectedLocationId === node.id) {
                setSelectedLocation(null)
                setSelectedLocationId(null)
              } else {
                setSelectedLocation(node)
                setSelectedLocationId(node.id)
              }
            }}
            onNodeAdded={() => fetchData()}
            className="h-full"
          />

          <div className="space-y-4">
            <Card className="p-6">
              <div className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">All Properties</h3>
                  {selectedLocation && (
                    <p className="text-xs text-muted-foreground">
                      Filtering subtree for {selectedLocation.name} ({formatLevelLabel(selectedLocation.type)})
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-52">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search properties..."
                      className="pl-9"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                    />
                  </div>
                  {selectedLocation && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedLocation(null)
                        setSelectedLocationId(null)
                      }}
                    >
                      Clear location filter
                    </Button>
                  )}
                </div>
              </div>

              <Table className="mt-4">
                <TableHeader>
                  <TableRow>
                    <TableHead>Property Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="text-right">Total Units</TableHead>
                    <TableHead className="text-right">Occupied</TableHead>
                    <TableHead className="text-right">Occupancy Rate</TableHead>
                    <TableHead className="text-right">Rent Revenue</TableHead>
                    <TableHead className="text-right">Rent Profit</TableHead>
                    <TableHead className="text-right">Sale Revenue</TableHead>
                    <TableHead className="text-right">Sale Profit</TableHead>
                    <TableHead className="text-right">Outstanding Invoices</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : propertiesList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                        No properties found
                      </TableCell>
                    </TableRow>
                  ) : (
                    propertiesList.map((property) => (
                      <TableRow key={property.id}>
                        <TableCell className="font-medium">{property.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{property.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              property.status === "Sold" ? "destructive" :
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
                            {property.status || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {property.locationNode?.name || property.location || "N/A"}
                        </TableCell>
                        <TableCell>{property.address}</TableCell>
                        <TableCell className="text-right">{property.units || property._count?.units || 0}</TableCell>
                        <TableCell className="text-right">{property.occupied || 0}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {property.units || property._count?.units ?
                            ((property.occupied || 0) / (property.units || property._count?.units) * 100).toFixed(1) :
                            "0"}%
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          Rs {((property.rentRevenue || 0)).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${(property.rentProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          Rs {((property.rentProfit || 0)).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          Rs {((property.saleRevenue || 0)).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${(property.saleProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          Rs {((property.saleProfit || 0)).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-semibold">Rs {((property.outstandingInvoicesAmount || 0)).toLocaleString("en-IN")}</span>
                            <span className="text-xs text-muted-foreground">
                              {property.outstandingInvoices || 0} {property.outstandingInvoices === 1 ? 'invoice' : 'invoices'}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        </div>
      </div>
      {editingStatusProperty && (
        <EditStatusDialog
          open={!!editingStatusProperty}
          onOpenChange={(open) => !open && setEditingStatusProperty(null)}
          onSuccess={() => {
            fetchData()
            setEditingStatusProperty(null)
          }}
          entityType="property"
          entityId={editingStatusProperty.id}
          currentStatus={editingStatusProperty.status}
          entityName={editingStatusProperty.name}
        />
      )}
    </div>
  )
}
