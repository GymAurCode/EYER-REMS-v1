"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Search, Users, UserCheck, UserX, Clock, Loader2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { apiService } from "@/lib/api"

export default function TenantsDetailsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalTenants: 0,
    activeTenants: 0,
    newTenants: 0,
    expiringLeases: 0,
  })

  useEffect(() => {
    fetchTenants()
  }, [])

  const fetchTenants = async () => {
    try {
      setLoading(true)
      const response: any = await apiService.tenants.getAll()
      const tenantsData = response?.data?.data || response?.data || []
      setTenants(Array.isArray(tenantsData) ? tenantsData : [])

      // Calculate stats
      const total = tenantsData.length || 0
      const active = tenantsData.filter((t: any) => t.status === "active").length || 0
      
      // Count leases expiring in next 90 days
      const today = new Date()
      const ninetyDaysLater = new Date(today)
      ninetyDaysLater.setDate(today.getDate() + 90)
      
      const expiring = tenantsData.filter((t: any) => {
        if (!t.leases || t.leases.length === 0) return false
        const lease = t.leases[0]
        if (!lease.leaseEnd) return false
        const leaseEnd = new Date(lease.leaseEnd)
        return leaseEnd >= today && leaseEnd <= ninetyDaysLater
      }).length || 0

      setStats({
        totalTenants: total,
        activeTenants: active,
        newTenants: 0, // Can be calculated based on createdAt
        expiringLeases: expiring,
      })
    } catch (err: any) {
      console.error("Failed to fetch tenants:", err)
      setTenants([])
    } finally {
      setLoading(false)
    }
  }

  const filteredTenants = tenants.filter((tenant) => {
    const searchLower = searchQuery.toLowerCase()
    return (
      tenant.name?.toLowerCase().includes(searchLower) ||
      tenant.unit?.unitName?.toLowerCase().includes(searchLower) ||
      tenant.unit?.property?.name?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Active Tenants Details</h1>
            <p className="text-muted-foreground mt-1">Complete overview of tenant information and lease status</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Total Active Tenants</p>
            <p className="text-3xl font-bold text-foreground mt-2">{stats.totalTenants}</p>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <UserCheck className="h-5 w-5 text-success" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Active Tenants</p>
            <p className="text-3xl font-bold text-foreground mt-2">{stats.activeTenants}</p>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                <UserX className="h-5 w-5 text-destructive" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Inactive Tenants</p>
            <p className="text-3xl font-bold text-foreground mt-2">{stats.totalTenants - stats.activeTenants}</p>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Leases Expiring (90 days)</p>
            <p className="text-3xl font-bold text-foreground mt-2">{stats.expiringLeases}</p>
          </Card>
        </div>

        {/* Tenants List */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">All Tenants</h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tenants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant Name</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Lease Start</TableHead>
                <TableHead>Lease End</TableHead>
                <TableHead className="text-right">Monthly Rent</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredTenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No tenants found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTenants.map((tenant) => {
                  const lease = tenant.leases && tenant.leases.length > 0 ? tenant.leases[0] : null
                  return (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">{tenant.name || "N/A"}</TableCell>
                      <TableCell>{tenant.unit?.unitName || "N/A"}</TableCell>
                      <TableCell>{tenant.unit?.property?.name || "N/A"}</TableCell>
                      <TableCell>{lease?.leaseStart ? new Date(lease.leaseStart).toLocaleDateString() : "N/A"}</TableCell>
                      <TableCell>{lease?.leaseEnd ? new Date(lease.leaseEnd).toLocaleDateString() : "N/A"}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {lease?.rent ? `Rs ${parseFloat(lease.rent).toLocaleString()}` : "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tenant.status === "active" ? "default" : "destructive"}>
                          {tenant.status || "inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  )
}
