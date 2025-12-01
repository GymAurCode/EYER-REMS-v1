"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Home, DollarSign, Loader2, MoreVertical, Pencil, Trash2, Building2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AddUnitDialog } from "./add-unit-dialog"
import { EditStatusDialog } from "./edit-status-dialog"
import { apiService } from "@/lib/api"
import { UnitToasts, handleApiError } from "@/lib/toast-utils"

export function UnitsView() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showUnitDialog, setShowUnitDialog] = useState(false)
  const [units, setUnits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingStatusUnit, setEditingStatusUnit] = useState<{ id: string | number; status: string; name: string } | null>(null)
  const [editingUnit, setEditingUnit] = useState<any | null>(null)
  const [deletingUnitId, setDeletingUnitId] = useState<string | number | null>(null)

  useEffect(() => {
    fetchUnits()
  }, [])

  const fetchUnits = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiService.units.getAll()
      // Backend returns { success: true, data: [...] }
      const responseData = response.data as any
      const unitsData = responseData?.data || responseData || []
      setUnits(Array.isArray(unitsData) ? unitsData : [])
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || "Failed to fetch units")
      setUnits([])
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUnit = async (unit: any) => {
    if (!unit?.id) return
    const confirmed = window.confirm(
      `Are you sure you want to delete ${unit.unitName || unit.unitNumber || "this unit"}? This action cannot be undone.`
    )
    if (!confirmed) return

    try {
      setDeletingUnitId(unit.id)
      await apiService.units.delete(unit.id)
      UnitToasts.deleted(unit.unitName || unit.unitNumber || "Unit")
      fetchUnits()
    } catch (err: any) {
      console.error("Failed to delete unit:", err)
      handleApiError(err, "Failed to delete unit")
    } finally {
      setDeletingUnitId(null)
    }
  }

  const filteredUnits = (units || []).filter((unit) => {
    const unitName = unit.unitName || unit.unitNumber || ""
    const propertyName = unit.property?.name || unit.property || ""
    const floorName = unit.floor?.name || ""
    const searchLower = searchQuery.toLowerCase()
    return (
      unitName.toLowerCase().includes(searchLower) ||
      propertyName.toLowerCase().includes(searchLower) ||
      floorName.toLowerCase().includes(searchLower)
    )
  })

  // Group units by property and floor
  const groupedUnits = filteredUnits.reduce((acc: any, unit: any) => {
    const propertyId = unit.propertyId || unit.property?.id || "no-property"
    const propertyName = unit.property?.name || "Unknown Property"
    const floorId = unit.floorId || unit.floor?.id || "no-floor"
    const floorName = unit.floor?.name || "No Floor"
    
    if (!acc[propertyId]) {
      acc[propertyId] = {
        propertyName,
        floors: {} as any,
        unitsWithoutFloor: [] as any[],
      }
    }
    
    if (floorId === "no-floor") {
      acc[propertyId].unitsWithoutFloor.push(unit)
    } else {
      if (!acc[propertyId].floors[floorId]) {
        acc[propertyId].floors[floorId] = {
          floorName,
          floorNumber: unit.floor?.floorNumber ?? 999,
          units: [] as any[],
        }
      }
      acc[propertyId].floors[floorId].units.push(unit)
    }
    
    return acc
  }, {} as any)

  // Check if any property has floors
  const hasFloors = Object.values(groupedUnits).some((group: any) => 
    Object.keys(group.floors).length > 0
  )

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search units..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          onClick={() => {
            setEditingUnit(null)
            setShowUnitDialog(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Unit
        </Button>
      </div>

      {/* Units Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Property
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Floor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Block
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Rent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-destructive">{error}</td>
                </tr>
              ) : filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">No units found</td>
                </tr>
              ) : (
                filteredUnits.map((unit) => (
                <tr key={unit.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10">
                        <Home className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium text-foreground">{unit.unitName || unit.unitNumber || "N/A"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {unit.property?.name || unit.property || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {unit.floor ? (
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        <span>
                          {unit.floor.name}
                          {unit.floor.floorNumber !== null && unit.floor.floorNumber !== undefined && (
                            <span className="text-xs text-muted-foreground ml-1">
                              (#{unit.floor.floorNumber})
                            </span>
                          )}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {unit.block?.name || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-sm font-medium text-foreground">
                      <DollarSign className="h-3 w-3" />
                      {unit.monthlyRent ? `Rs ${unit.monthlyRent.toLocaleString()}` : unit.rent || "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge
                      variant={
                        unit.status === "Occupied" || unit.status === "occupied" ? "default" : 
                        unit.status === "Vacant" || unit.status === "vacant" ? "secondary" : 
                        "outline"
                      }
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingStatusUnit({ 
                          id: unit.id, 
                          status: unit.status || "Vacant", 
                          name: unit.unitName || unit.unitNumber || "Unit" 
                        })
                      }}
                    >
                      {unit.status || "N/A"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {unit.tenantName || unit.tenant?.name || unit.tenant || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingUnit(unit)
                            setShowUnitDialog(true)
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteUnit(unit)}
                          disabled={deletingUnitId === unit.id}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {deletingUnitId === unit.id ? "Deleting..." : "Delete"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AddUnitDialog
        open={showUnitDialog}
        onOpenChange={(open) => {
          setShowUnitDialog(open)
          if (!open) {
            setEditingUnit(null)
          }
        }}
        onSuccess={fetchUnits}
        unit={editingUnit}
      />
      {editingStatusUnit && (
        <EditStatusDialog
          open={!!editingStatusUnit}
          onOpenChange={(open) => !open && setEditingStatusUnit(null)}
          onSuccess={() => {
            fetchUnits()
            setEditingStatusUnit(null)
          }}
          entityType="unit"
          entityId={editingStatusUnit.id}
          currentStatus={editingStatusUnit.status}
          entityName={editingStatusUnit.name}
        />
      )}
    </div>
  )
}
