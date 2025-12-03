"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, MapPin, Home, Users, DollarSign, Loader2 } from "lucide-react"
import { apiService } from "@/lib/api"
import { AddUnitDialog } from "./add-unit-dialog"
import { AddTenantDialog } from "./add-tenant-dialog"
import { AddLeaseDialog } from "./add-lease-dialog"
import { AddPaymentDialog } from "@/components/finance/add-payment-dialog"

interface PropertyDetailsDialogProps {
  propertyId: number | string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PropertyDetailsDialog({ propertyId, open, onOpenChange }: PropertyDetailsDialogProps) {
  const [property, setProperty] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddUnitDialog, setShowAddUnitDialog] = useState(false)
  const [showAddTenantDialog, setShowAddTenantDialog] = useState(false)
  const [showAddLeaseDialog, setShowAddLeaseDialog] = useState(false)
  const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false)

  useEffect(() => {
    if (open && propertyId) {
      fetchPropertyDetails()
    }
  }, [open, propertyId])

  const fetchPropertyDetails = async () => {
    try {
      setLoading(true)
      setError(null)
      const response: any = await apiService.properties.getById(String(propertyId))
      // Backend returns { success: true, data: {...} }
      const responseData = response.data as any
      const propertyData = responseData?.data || responseData
      
      // Calculate units count from nested units array if _count is not available
      if (propertyData && !propertyData._count && propertyData.units) {
        propertyData.units = Array.isArray(propertyData.units) ? propertyData.units.length : 0
      }
      
      // Ensure revenue is a number, not an object
      if (propertyData && typeof propertyData.revenue !== 'number' && typeof propertyData.revenue !== 'string') {
        propertyData.revenue = 0
      }
      
      setProperty(propertyData)
    } catch (err: any) {
      console.error("Failed to fetch property details:", err)
      setError(err.response?.data?.message || err.response?.data?.error || "Failed to fetch property details")
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  // Convert sq ft to Marla/Kanal for display
  const formatArea = (sqFt?: number) => {
    if (!sqFt) return "N/A"
    if (sqFt >= 5445) {
      const kanal = Math.floor(sqFt / 5445)
      const remainingMarla = Math.round((sqFt % 5445) / 272.25)
      if (remainingMarla > 0) {
        return `${kanal} Kanal ${remainingMarla} Marla (${sqFt.toLocaleString()} sq ft)`
      }
      return `${kanal} Kanal (${sqFt.toLocaleString()} sq ft)`
    }
    const marla = Math.round(sqFt / 272.25)
    return `${marla} Marla (${sqFt.toLocaleString()} sq ft)`
  }

  const handleRefresh = () => {
    fetchPropertyDetails()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[900px] max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            {loading ? "Loading..." : property?.name || "Property Details"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="py-12 text-center text-destructive">{error}</div>
        ) : property ? (
          <div className="space-y-6">
            {/* Hero image */}
            {property.imageUrl && (
              <div className="h-56 w-full overflow-hidden rounded-lg border border-border">
                <img
                  src={
                    property.imageUrl.startsWith("http")
                      ? property.imageUrl
                      : `${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api").replace(/\/api\/?$/, '')}${property.imageUrl}`
                  }
                  alt={property.name || "Property image"}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = "none"
                  }}
                />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{property.type || "N/A"}</Badge>
              <Badge
                variant={
                  property.status === "Active"
                    ? "default"
                    : property.status === "Maintenance"
                      ? "destructive"
                      : property.status === "For Sale"
                        ? "secondary"
                        : "outline"
                }
              >
                {property.status || "N/A"}
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* 1. Property Summary */}
              <Card className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold tracking-wide text-muted-foreground">Property Summary</p>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-[120px,1fr] gap-2">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium text-foreground">{property.name || "N/A"}</span>
                  </div>
                  <div className="grid grid-cols-[120px,1fr] gap-2">
                    <span className="text-muted-foreground">Code</span>
                    <span className="font-mono text-foreground">
                      {property.propertyCode || property.code || "N/A"}
                    </span>
                  </div>
                  <div className="grid grid-cols-[120px,1fr] gap-2">
                    <span className="text-muted-foreground">Type</span>
                    <span className="text-foreground">{property.type || "N/A"}</span>
                  </div>
                  <div className="grid grid-cols-[120px,1fr] gap-2">
                    <span className="text-muted-foreground">Status</span>
                    <span className="text-foreground">{property.status || "N/A"}</span>
                  </div>
                </div>
              </Card>

              {/* 2. Address */}
              <Card className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold tracking-wide text-muted-foreground">Address</p>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    {property.address || "Address not available"}
                  </p>
                  {property.location && (
                    <p className="text-xs text-muted-foreground">{property.location}</p>
                  )}
                </div>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {/* 3. Structure Details */}
              <Card className="space-y-4 p-4 md:col-span-1">
                <p className="text-sm font-semibold tracking-wide text-muted-foreground">Structure Details</p>
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-[120px,1fr] gap-2">
                    <span className="text-muted-foreground">Floors</span>
                    <span className="text-foreground">
                      {property.totalFloors ?? property._count?.floors ??
                        (Array.isArray(property.floors) ? property.floors.length : "N/A")}
                    </span>
                  </div>
                  {Array.isArray(property.floors) && property.floors.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-muted-foreground text-xs">Floor List:</span>
                      <div className="flex flex-wrap gap-1">
                        {property.floors.map((floor: any) => (
                          <Badge key={floor.id} variant="outline" className="text-xs">
                            {floor.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-[120px,1fr] gap-2">
                    <span className="text-muted-foreground">Unit Count</span>
                    <span className="text-foreground">
                      {typeof property.units === "number"
                        ? property.units
                        : property._count?.units ??
                          (Array.isArray(property.units) ? property.units.length : "N/A")}
                    </span>
                  </div>
                  <div className="grid grid-cols-[120px,1fr] gap-2">
                    <span className="text-muted-foreground">Year Built</span>
                    <span className="text-foreground">{property.yearBuilt || "N/A"}</span>
                  </div>
                  {property.totalArea && (
                    <div className="grid grid-cols-[120px,1fr] gap-2">
                      <span className="text-muted-foreground">Total Area</span>
                      <span className="text-foreground">{formatArea(property.totalArea)}</span>
                    </div>
                  )}
                </div>
              </Card>

              {/* 4. Current Occupancy Summary */}
              <Card className="space-y-4 p-4 md:col-span-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold tracking-wide text-muted-foreground">Current Occupancy</p>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                {(() => {
                  const totalUnits =
                    typeof property.units === "number"
                      ? property.units
                      : property._count?.units ??
                        (Array.isArray(property.units) ? property.units.length : 0)
                  const occupiedUnits = property.occupied ?? property.occupiedUnits ?? 0
                  const vacantUnits = property.vacantUnits ?? Math.max(totalUnits - occupiedUnits, 0)
                  const upcomingVacantUnits = property.upcomingVacantUnits ?? 0
                  const occupancyPercent = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

                  return (
                    <div className="grid gap-4 md:grid-cols-4 text-sm">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Total Units</p>
                        <p className="text-lg font-semibold text-foreground">{totalUnits || 0}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Occupied Units</p>
                        <p className="text-lg font-semibold text-foreground">{occupiedUnits}</p>
                        <p className="text-xs text-muted-foreground">{occupancyPercent}% occupancy</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Vacant Units</p>
                        <p className="text-lg font-semibold text-foreground">{vacantUnits}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Upcoming Vacancies</p>
                        <p className="text-lg font-semibold text-foreground">{upcomingVacantUnits}</p>
                      </div>
                    </div>
                  )
                })()}
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {/* 5. Amenities List */}
              <Card className="space-y-4 p-4 md:col-span-1">
                <p className="text-sm font-semibold tracking-wide text-muted-foreground">Amenities</p>
                {Array.isArray(property.amenities) && property.amenities.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {property.amenities.map((amenity: string) => (
                      <Badge key={amenity} variant="outline" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No amenities listed</p>
                )}
              </Card>

              {/* 6. Last 12 Month Income Summary */}
              <Card className="space-y-4 p-4 md:col-span-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold tracking-wide text-muted-foreground">
                    Last 12 Months Income
                  </p>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="grid gap-4 md:grid-cols-3 text-sm">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Total Income</p>
                    <p className="text-lg font-semibold text-foreground">
                      {(() => {
                        const v = property.incomeLast12Months ?? property.revenue
                        if (typeof v === "number" && v > 0) return `Rs ${v.toLocaleString("en-IN")}`
                        if (typeof v === "string") return v
                        return "Rs 0"
                      })()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Average / Month</p>
                    <p className="text-lg font-semibold text-foreground">
                      {(() => {
                        const v = property.incomeLast12Months ?? property.revenue
                        if (typeof v === "number" && v > 0) return `Rs ${Math.round(v / 12).toLocaleString("en-IN")}`
                        return "Rs 0"
                      })()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Reported Currency</p>
                    <p className="text-lg font-semibold text-foreground">PKR</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* 7. Quick Actions */}
            <Card className="space-y-3 p-4">
              <p className="text-sm font-semibold tracking-wide text-muted-foreground">Quick Actions</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <Button 
                  variant="outline" 
                  className="justify-start" 
                  type="button"
                  onClick={() => setShowAddUnitDialog(true)}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Add Unit
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start" 
                  type="button"
                  onClick={() => setShowAddTenantDialog(true)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Add Tenant
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start" 
                  type="button"
                  onClick={() => setShowAddLeaseDialog(true)}
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Create Lease
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start" 
                  type="button"
                  onClick={() => setShowAddPaymentDialog(true)}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              </div>
            </Card>

            {property.description && (
              <Card className="space-y-2 p-4">
                <p className="text-sm font-semibold tracking-wide text-muted-foreground">Description</p>
                <p className="text-sm text-muted-foreground">{property.description}</p>
              </Card>
            )}
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">Property not found</div>
        )}
      </DialogContent>

      {/* Quick Action Dialogs */}
      <AddUnitDialog
        open={showAddUnitDialog}
        onOpenChange={setShowAddUnitDialog}
        onSuccess={() => {
          handleRefresh()
          setShowAddUnitDialog(false)
        }}
        defaultPropertyId={propertyId?.toString()}
      />
      <AddTenantDialog
        open={showAddTenantDialog}
        onOpenChange={setShowAddTenantDialog}
        onSuccess={() => {
          handleRefresh()
          setShowAddTenantDialog(false)
        }}
        defaultPropertyId={propertyId?.toString()}
      />
      <AddLeaseDialog
        open={showAddLeaseDialog}
        onOpenChange={setShowAddLeaseDialog}
        onSuccess={() => {
          handleRefresh()
          setShowAddLeaseDialog(false)
        }}
        defaultPropertyId={propertyId?.toString()}
      />
      <AddPaymentDialog
        open={showAddPaymentDialog}
        onOpenChange={setShowAddPaymentDialog}
        onSuccess={() => {
          handleRefresh()
          setShowAddPaymentDialog(false)
        }}
      />
    </Dialog>
  )
}
