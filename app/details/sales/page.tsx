"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Search, TrendingUp, Loader2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { apiService } from "@/lib/api"

export default function SalesPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalSales: 0,
    completedSales: 0,
    pendingSales: 0,
    totalRevenue: 0,
  })

  useEffect(() => {
    fetchSales()
  }, [])

  const fetchSales = async () => {
    try {
      setLoading(true)
      const response: any = await apiService.sales.getAll()
      const salesData = response?.data?.data || response?.data || []
      setSales(Array.isArray(salesData) ? salesData : [])

      // Calculate stats
      const total = salesData.length || 0
      const completed = salesData.filter((s: any) => s.status === "Completed" || s.status === "completed").length || 0
      const pending = salesData.filter((s: any) => s.status === "Pending" || s.status === "pending").length || 0
      const revenue = salesData.reduce((sum: number, s: any) => sum + (parseFloat(s.saleValue) || 0), 0)

      setStats({
        totalSales: total,
        completedSales: completed,
        pendingSales: pending,
        totalRevenue: revenue,
      })
    } catch (err: any) {
      console.error("Failed to fetch sales:", err)
      setSales([])
    } finally {
      setLoading(false)
    }
  }

  const filteredSales = sales.filter((sale) => {
    const searchLower = searchQuery.toLowerCase()
    return (
      sale.property?.name?.toLowerCase().includes(searchLower) ||
      sale.buyers?.some((b: any) => b.name?.toLowerCase().includes(searchLower)) ||
      sale.saleValue?.toString().includes(searchLower)
    )
  })

  // Prepare chart data (group by month)
  const chartData = sales.reduce((acc: any, sale: any) => {
    if (!sale.saleDate) return acc
    const date = new Date(sale.saleDate)
    const month = date.toLocaleDateString("en-US", { month: "short" })
    const existing = acc.find((item: any) => item.month === month)
    if (existing) {
      existing.sales += parseFloat(sale.saleValue) || 0
    } else {
      acc.push({ month, sales: parseFloat(sale.saleValue) || 0 })
    }
    return acc
  }, [])

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Total Sales</h1>
            <p className="text-muted-foreground mt-1">Complete overview of all property sales</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Total Sales</p>
            <p className="text-3xl font-bold text-foreground mt-2">{stats.totalSales}</p>
            <div className="flex items-center gap-1 mt-2 text-success">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">Active sales</span>
            </div>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Completed Sales</p>
            <p className="text-3xl font-bold text-foreground mt-2">{stats.completedSales}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {stats.totalSales > 0 ? ((stats.completedSales / stats.totalSales) * 100).toFixed(1) : 0}% of total
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Pending Sales</p>
            <p className="text-3xl font-bold text-foreground mt-2">{stats.pendingSales}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {stats.totalSales > 0 ? ((stats.pendingSales / stats.totalSales) * 100).toFixed(1) : 0}% of total
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-3xl font-bold text-foreground mt-2">Rs {(stats.totalRevenue / 1000000).toFixed(1)}M</p>
            <p className="text-sm text-muted-foreground mt-2">From sales</p>
          </Card>
        </div>

        {chartData.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Sales Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="sales" fill="#2563eb" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">All Sales</h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search sales..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No sales found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.property?.name || "N/A"}</TableCell>
                    <TableCell>
                      {sale.buyers && sale.buyers.length > 0
                        ? sale.buyers.map((b: any) => b.name).join(", ")
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {sale.saleDate ? new Date(sale.saleDate).toLocaleDateString() : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={sale.status === "Completed" || sale.status === "completed" ? "default" : "secondary"}>
                        {sale.status || "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      Rs {parseFloat(sale.saleValue || 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  )
}
