"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, FileText, Calendar, DollarSign, Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AddLeaseDialog } from "./add-lease-dialog"
import { apiService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export function LeasesView() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showLeaseDialog, setShowLeaseDialog] = useState(false)
  const [leases, setLeases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingLease, setEditingLease] = useState<any | null>(null)
  const [deletingLeaseId, setDeletingLeaseId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchLeases()
  }, [])

  const fetchLeases = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiService.leases.getAll()
      // Backend returns { success: true, data: [...] }
      const responseData = response.data as any
      const leasesData = Array.isArray(responseData?.data) ? responseData.data : Array.isArray(responseData) ? responseData : []
      const normalized = Array.isArray(leasesData) ? leasesData : []
      setLeases(normalized)
      return normalized
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || "Failed to fetch leases")
      setLeases([])
      return []
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLease = async (lease: any) => {
    if (!lease?.id) return
    const confirmed = window.confirm(
      "Are you sure you want to delete this lease? This action cannot be undone."
    )
    if (!confirmed) return

    try {
      setDeletingLeaseId(lease.id)
      await apiService.leases.delete(lease.id)
      toast({
        title: "Lease deleted",
        description: "The lease has been removed successfully.",
      })
      fetchLeases()
    } catch (err: any) {
      console.error("Failed to delete lease:", err)
      toast({
        title: "Error",
        description: err?.response?.data?.message || err?.response?.data?.error || "Failed to delete lease",
        variant: "destructive",
      })
    } finally {
      setDeletingLeaseId(null)
    }
  }

  const filteredLeases = (leases || []).filter((lease) => {
    const tenantName = lease.tenantName || lease.tenant?.name || lease.tenant || ""
    const propertyName = lease.propertyName || lease.unit?.property?.name || lease.property || ""
    const unitName = lease.unitName || lease.unit?.unitName || lease.unit || ""
    const searchLower = searchQuery.toLowerCase()
    return (
      tenantName.toLowerCase().includes(searchLower) ||
      propertyName.toLowerCase().includes(searchLower) ||
      unitName.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search leases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          onClick={() => {
            setEditingLease(null)
            setShowLeaseDialog(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Lease
        </Button>
      </div>

      {/* Leases Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Lease #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Property / Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Lease Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Monthly Rent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-destructive">{error}</td>
                </tr>
              ) : filteredLeases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">No leases found</td>
                </tr>
              ) : (
                filteredLeases.map((lease) => (
                <tr key={lease.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium text-foreground">{lease.id.slice(0, 8)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {lease.tenantName || lease.tenant?.name || lease.tenant || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {lease.propertyName || lease.unit?.property?.name || lease.property || "N/A"} - {lease.unitName || lease.unit?.unitName || lease.unit || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {lease.leaseStart ? new Date(lease.leaseStart).toLocaleDateString() : "-"} - {lease.leaseEnd ? new Date(lease.leaseEnd).toLocaleDateString() : "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-sm font-medium text-foreground">
                      <DollarSign className="h-3 w-3" />
                      {(() => {
                        if (typeof lease.rent === "number") {
                          return `Rs ${lease.rent.toLocaleString()}`
                        }
                        if (typeof lease.rent === "string" && lease.rent.trim()) {
                          const rentValue = Number(lease.rent)
                          if (!Number.isNaN(rentValue)) {
                            return `Rs ${rentValue.toLocaleString()}`
                          }
                        }
                        if (lease.monthlyRent) {
                          return `Rs ${Number(lease.monthlyRent).toLocaleString()}`
                        }
                        return "-"
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge
                      variant={
                        lease.status === "Active" || lease.status === "active" ? "default" : 
                        lease.status === "Expired" || lease.status === "expired" ? "outline" : 
                        lease.status === "Terminated" || lease.status === "terminated" ? "destructive" : 
                        "secondary"
                      }
                    >
                      {lease.status || "N/A"}
                    </Badge>
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
                            setEditingLease(lease)
                            setShowLeaseDialog(true)
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteLease(lease)}
                          disabled={deletingLeaseId === lease.id}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {deletingLeaseId === lease.id ? "Deleting..." : "Delete"}
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

      <AddLeaseDialog
        open={showLeaseDialog}
        onOpenChange={(open) => {
          setShowLeaseDialog(open)
          if (!open) {
            setEditingLease(null)
          }
        }}
        onSuccess={fetchLeases}
        lease={editingLease}
      />
    </div>
  )
}
