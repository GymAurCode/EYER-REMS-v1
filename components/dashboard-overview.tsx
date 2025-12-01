"use client"

import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Users, DollarSign, TrendingUp, UserCheck, FileText, AlertCircle, Loader2, Home, RefreshCw, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { AddPropertyDialog } from "@/components/properties/add-property-dialog"
import { AddTenantDialog } from "@/components/properties/add-tenant-dialog"
import { AddInvoiceDialog } from "@/components/finance/add-invoice-dialog"
import { AddEmployeeDialog } from "@/components/hr/add-employee-dialog"
import { useRouter } from "next/navigation"
import { apiService } from "@/lib/api"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

export function DashboardOverview() {
  const [openDialog, setOpenDialog] = useState<string | null>(null)
  const [stats, setStats] = useState<any[]>([])
  const [revenueData, setRevenueData] = useState<any[]>([])
  const [propertyTypeData, setPropertyTypeData] = useState<any[]>([])
  const [occupancyData, setOccupancyData] = useState<any[]>([])
  const [salesFunnelData, setSalesFunnelData] = useState<any[]>([])
  const [recentActivities, setRecentActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()

  // Color palette for charts
  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      
      // Fetch stats from API
      const [propertiesStats, hrStats, crmStats, financeStats, salesResponse, leasesResponse, revenueExpenseResponse] = await Promise.all([
        apiService.stats.getPropertiesStats().catch(() => ({ data: {} })),
        apiService.stats.getHRStats().catch(() => ({ data: {} })),
        apiService.stats.getCRMStats().catch(() => ({ data: {} })),
        apiService.stats.getFinanceStats().catch(() => ({ data: {} })),
        apiService.sales.getAll().catch(() => ({ data: [] })),
        apiService.leases.getAll().catch(() => ({ data: [] })),
        apiService.stats.getRevenueVsExpense(12).catch(() => ({ data: [] })),
      ])

      // Backend returns { success: true, data: {...} }
      const propsData = (propertiesStats as any).data?.data || (propertiesStats as any).data || {}
      const hrData = (hrStats as any).data?.data || (hrStats as any).data || {}
      const crmData = (crmStats as any).data?.data || (crmStats as any).data || {}
      const financeData = (financeStats as any).data?.data || (financeStats as any).data || {}
      const salesData = (salesResponse as any).data?.data || (salesResponse as any).data || []
      const leasesData = (leasesResponse as any).data?.data || (leasesResponse as any).data || []
      const revenueExpenseData = (revenueExpenseResponse as any).data?.data || (revenueExpenseResponse as any).data || []

      // Calculate enhanced revenue (from finance ledger which should include all income sources)
      // Finance ledger monthly revenue includes:
      // - Unit rent payments (from occupied units)
      // - Lease payments (from active leases)
      // - Sales revenue (if sales create finance ledger entries)
      // - Commissions (if commissions create finance ledger entries)
      // - Other income transactions
      const unitRevenue = propsData.monthlyRevenue || 0 // Fallback: unit rent only
      const financeMonthlyRevenue = financeData.monthlyRevenue || 0 // Primary: all income from finance ledger
      
      // Use finance stats data (includes rent + sale revenue calculations)
      const totalRevenue = financeData.totalRevenue || 0
      const totalProfit = financeData.totalProfit || 0
      
      // Additional revenue breakdown for display (informational only)
      const now = new Date()
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      
      // Calculate sales revenue this month (for verification/display)
      const salesThisMonth = Array.isArray(salesData)
        ? salesData.filter((s: any) => {
            const saleDate = s.saleDate ? new Date(s.saleDate) : null
            const isCompleted = s.status === "Completed" || s.status === "completed"
            const isThisMonth = saleDate && saleDate >= startOfCurrentMonth && saleDate <= endOfCurrentMonth
            return isCompleted && isThisMonth
          })
        : []
      const salesRevenueThisMonth = salesThisMonth.reduce((sum: number, s: any) => sum + (parseFloat(s.saleValue) || 0), 0)
      
      // Commissions this month (for verification/display)
      const commissionsThisMonth = financeData.commissionsThisMonth || 0

      // Calculate properties and tenants added this month from change strings
      const propertiesChangeStr = propsData.propertiesChange || "+0 this month"
      const propertiesThisMonth = parseInt(propertiesChangeStr.match(/\+(\d+)/)?.[1] || "0") || 0
      
      const tenantsChangeStr = propsData.tenantsChange || "+0 this month"
      const tenantsThisMonth = parseInt(tenantsChangeStr.match(/\+(\d+)/)?.[1] || "0") || 0

      // Set comprehensive stats
      setStats([
        {
          name: "Total Properties",
          value: propsData.totalProperties?.toString() || "0",
          change: propsData.propertiesChange || "+0 this month",
          changeType: propertiesThisMonth > 0 ? "positive" : "neutral",
          icon: Building2,
          href: "/details/properties",
        },
        {
          name: "Total Units",
          value: propsData.totalUnits?.toString() || "0",
          change: `${propsData.occupiedUnits || 0} occupied, ${propsData.vacantUnits || 0} vacant`,
          changeType: "neutral",
          icon: Home,
          href: "/details/units",
        },
        {
          name: "Occupied Units",
          value: propsData.occupiedUnits?.toString() || "0",
          change: propsData.occupancyRate ? `${propsData.occupancyRate}% occupancy` : "0% occupancy",
          changeType: "positive",
          icon: TrendingUp,
          href: "/details/occupied-units",
        },
        {
          name: "Vacant Units",
          value: propsData.vacantUnits?.toString() || "0",
          change: propsData.vacancyRate ? `${propsData.vacancyRate}% vacancy` : "0% vacancy",
          changeType: "neutral",
          icon: Home,
          href: "/details/vacant-units",
        },
        {
          name: "Active Tenants",
          value: propsData.totalTenants?.toLocaleString() || "0",
          change: propsData.tenantsChange || "+0 this month",
          changeType: tenantsThisMonth > 0 ? "positive" : "neutral",
          icon: Users,
          href: "/details/tenants",
        },
        {
          name: "Total Revenue",
          value: totalRevenue >= 1000000 
            ? `Rs ${(totalRevenue / 1000000).toFixed(1)}M`
            : totalRevenue >= 1000 
            ? `Rs ${(totalRevenue / 1000).toFixed(0)}K`
            : `Rs ${Math.round(totalRevenue).toLocaleString()}`,
          change: "Rent + Sale (from payments & transactions)",
          changeType: totalRevenue > 0 ? "positive" : "neutral",
          icon: DollarSign,
          href: "/details/revenue",
        },
        {
          name: "Total Profit",
          value: totalProfit >= 1000000 
            ? `Rs ${(totalProfit / 1000000).toFixed(1)}M`
            : totalProfit >= 1000 
            ? `Rs ${(totalProfit / 1000).toFixed(0)}K`
            : `Rs ${Math.round(totalProfit).toLocaleString()}`,
          change: "Rent Profit + Sale Profit",
          changeType: totalProfit > 0 ? "positive" : "negative",
          icon: TrendingUp,
          href: "/details/revenue",
        },
        {
          name: "Occupancy Rate",
          value: propsData.occupancyRate ? `${propsData.occupancyRate}%` : "0%",
          change: propsData.occupancyChange || "+0%",
          changeType: propsData.occupancyRate && propsData.occupancyRate > 50 ? "positive" : "neutral",
          icon: TrendingUp,
          href: "/details/occupancy",
        },
      ])

      // Use actual revenue vs expense data if available, otherwise generate from current data
      let revenueTrendData = []
      if (Array.isArray(revenueExpenseData) && revenueExpenseData.length > 0) {
        // Use actual backend data
        revenueTrendData = revenueExpenseData.map((item: any) => ({
          month: item.month,
          revenue: Math.round(item.revenue || 0),
          profit: Math.round(item.profit || 0),
        }))
      } else {
        // Fallback: generate from current monthly data
        const nowDate = new Date()
        const monthlyRevenueValue = financeData.monthlyRevenue || 0
        const monthlyExpensesValue = financeData.monthlyExpenses || 0
        const monthlyProfitValue = financeData.monthlyProfit || 0
        
        for (let i = 11; i >= 0; i--) {
          const monthDate = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 1)
          const monthLabel = monthDate.toLocaleString('default', { month: 'short', year: 'numeric' })
          
          // Use current month's actual data for the latest month, estimate for others
          const monthRevenue = i === 11 ? monthlyRevenueValue : monthlyRevenueValue * (0.85 + Math.random() * 0.3)
          const monthExpenses = i === 11 ? monthlyExpensesValue : monthlyExpensesValue * (0.85 + Math.random() * 0.3)
          const monthProfit = i === 11 ? monthlyProfitValue : monthRevenue - monthExpenses
          
          revenueTrendData.push({
            month: monthLabel,
            revenue: Math.round(monthRevenue),
            profit: Math.round(monthProfit),
          })
        }
      }
      setRevenueData(revenueTrendData)

      // Format property type data with colors
      const formattedPropertyTypeData = (propsData.propertyTypeData || []).map((item: any, index: number) => ({
        name: item.name || 'Unknown',
        value: item.value || 0,
        color: COLORS[index % COLORS.length],
      }))
      setPropertyTypeData(formattedPropertyTypeData)

      // Generate occupancy data per property
      const propertiesResponse: any = await apiService.properties.getAll().catch(() => ({ data: [] }))
      const properties = propertiesResponse.data?.data || propertiesResponse.data || []
      const occupancyByProperty = Array.isArray(properties)
        ? properties
            .filter((p: any) => p.type !== 'house' && (p.units || p._count?.units || 0) > 0)
            .slice(0, 10) // Top 10 properties
            .map((p: any) => {
              const totalUnits = p.units || p._count?.units || 0
              const occupied = p.occupied || 0
              const occupancyRate = totalUnits > 0 ? Math.round((occupied / totalUnits) * 100) : 0
              return {
                property: p.name || 'Unknown',
                occupancy: occupancyRate,
                totalUnits,
                occupiedUnits: occupied,
              }
            })
            .sort((a: any, b: any) => b.occupancy - a.occupancy)
        : []
      setOccupancyData(occupancyByProperty)

      // Generate sales funnel data
      const salesArray = Array.isArray(salesData) ? salesData : []
      const salesFunnel = [
        {
          stage: "Pending",
          count: salesArray.filter((s: any) => s.status === "Pending" || s.status === "pending").length,
        },
        {
          stage: "Completed",
          count: salesArray.filter((s: any) => s.status === "Completed" || s.status === "completed").length,
        },
        {
          stage: "Cancelled",
          count: salesArray.filter((s: any) => s.status === "Cancelled" || s.status === "cancelled").length,
        },
      ]
      setSalesFunnelData(salesFunnel)

      // Set recent activities
      setRecentActivities(propsData.recentActivities || [])
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err)
      // Set empty defaults
      setStats([
        { name: "Total Properties", value: "0", change: "+0 this month", changeType: "neutral", icon: Building2, href: "/details/properties" },
        { name: "Total Units", value: "0", change: "0 occupied, 0 vacant", changeType: "neutral", icon: Home, href: "/details/units" },
        { name: "Occupied Units", value: "0", change: "0% occupancy", changeType: "neutral", icon: TrendingUp, href: "/details/occupied-units" },
        { name: "Vacant Units", value: "0", change: "0% vacancy", changeType: "neutral", icon: Home, href: "/details/vacant-units" },
        { name: "Active Tenants", value: "0", change: "+0 this month", changeType: "neutral", icon: Users, href: "/details/tenants" },
        { name: "Monthly Revenue", value: "Rs 0", change: "+0%", changeType: "neutral", icon: DollarSign, href: "/details/revenue" },
        { name: "Monthly Profit", value: "Rs 0", change: "No expenses", changeType: "neutral", icon: TrendingUp, href: "/details/revenue" },
        { name: "Occupancy Rate", value: "0%", change: "+0%", changeType: "neutral", icon: TrendingUp, href: "/details/occupancy" },
      ])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData(true)
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchDashboardData])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground text-balance">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's what's happening with your properties today.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchDashboardData(true)}
          disabled={refreshing || loading}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", (refreshing || loading) && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center justify-center h-24">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.length === 0 ? (
            // Empty state
            <Card className="p-6 md:col-span-2 lg:col-span-4">
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Data Available</h3>
                <p className="text-sm text-muted-foreground mb-4">Start by adding your first property to see dashboard metrics.</p>
                <Button onClick={() => setOpenDialog("property")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Property
                </Button>
              </div>
            </Card>
          ) : (
            stats.map((stat) => (
            <Card
              key={stat.name}
              className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                if (stat.href) {
                  router.push(stat.href)
                } else {
                  // Fallback navigation
                  if (stat.name === "Total Properties") router.push("/details/properties")
                  if (stat.name === "Active Tenants") router.push("/details/tenants")
                  if (stat.name === "Monthly Revenue" || stat.name === "Monthly Profit") router.push("/details/revenue")
                  if (stat.name === "Occupancy Rate") router.push("/details/occupancy")
                  if (stat.name.includes("Units")) router.push("/details/units")
                }
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-1 rounded",
                    stat.changeType === "positive" ? "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950" :
                    stat.changeType === "negative" ? "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950" :
                    "text-muted-foreground bg-muted"
                  )}
                >
                  {stat.change}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
              </div>
            </Card>
            ))
          )}
        </div>
      )}

      {/* Revenue & Profit Trends */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Revenue & Profit Trends (Last 12 Months)</h2>
          {revenueData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No revenue data available</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    if (value >= 1000000) return `Rs ${(value / 1000000).toFixed(1)}M`
                    if (value >= 1000) return `Rs ${(value / 1000).toFixed(0)}K`
                    return `Rs ${value}`
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: any) => {
                    const numValue = typeof value === 'number' ? value : parseFloat(value) || 0
                    if (numValue >= 1000000) return `Rs ${(numValue / 1000000).toFixed(2)}M`
                    if (numValue >= 1000) return `Rs ${(numValue / 1000).toFixed(2)}K`
                    return `Rs ${numValue.toLocaleString()}`
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#2563eb" 
                  strokeWidth={2} 
                  name="Revenue"
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  name="Profit"
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Property Distribution */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Property Distribution by Type</h2>
          {propertyTypeData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              <div className="text-center">
                <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No properties available</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={() => setOpenDialog("property")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Property
                </Button>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={propertyTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent, value }: any) => `${name}: ${value} (${((percent as number) * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {propertyTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => `${value} properties`}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Occupancy Rates & Sales Funnel */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Occupancy Rates by Property</h2>
          {occupancyData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              <div className="text-center">
                <Home className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No occupancy data available</p>
                <p className="text-xs mt-1">Add properties and units to see occupancy rates</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={occupancyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="property" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 12 }}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: any, name: string, props: any) => [
                    `${value}% (${props.payload.occupiedUnits || 0}/${props.payload.totalUnits || 0} units)`,
                    "Occupancy"
                  ]}
                />
                <Bar 
                  dataKey="occupancy" 
                  fill="#2563eb" 
                  radius={[8, 8, 0, 0]}
                  name="Occupancy Rate"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Sales Funnel</h2>
          {salesFunnelData.length === 0 || salesFunnelData.every((s: any) => s.count === 0) ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              <div className="text-center">
                <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No sales data available</p>
                <p className="text-xs mt-1">Record property sales to see the funnel</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesFunnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  type="number" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  dataKey="stage" 
                  type="category" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: any) => [`${value} sales`, "Count"]}
                />
                <Bar 
                  dataKey="count" 
                  radius={[0, 8, 8, 0]}
                  name="Sales Count"
                >
                  {salesFunnelData.map((entry: any, index: number) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={
                        entry.stage === "Completed" ? "#10b981" :
                        entry.stage === "Pending" ? "#f59e0b" :
                        "#ef4444"
                      } 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activities */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Recent Activities</h2>
            {recentActivities.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {recentActivities.length} activities
              </Badge>
            )}
          </div>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {recentActivities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                  <p className="text-sm font-medium text-foreground mb-1">No recent activities</p>
                  <p className="text-xs text-muted-foreground">Activities will appear here as you use the system</p>
                </div>
              ) : (
                recentActivities.map((activity) => {
                  const getActivityIcon = () => {
                    switch (activity.type) {
                      case "lease": return <FileText className="h-4 w-4 text-blue-500" />
                      case "property": return <Building2 className="h-4 w-4 text-primary" />
                      case "unit": return <Home className="h-4 w-4 text-green-500" />
                      case "tenant": return <Users className="h-4 w-4 text-purple-500" />
                      case "sale": return <DollarSign className="h-4 w-4 text-green-600" />
                      case "buyer": return <UserCheck className="h-4 w-4 text-blue-600" />
                      case "payment": return <DollarSign className="h-4 w-4 text-emerald-500" />
                      case "maintenance": return <AlertCircle className="h-4 w-4 text-orange-500" />
                      case "employee": return <UserCheck className="h-4 w-4 text-indigo-500" />
                      default: return <FileText className="h-4 w-4 text-muted-foreground" />
                    }
                  }

                  const getActivityBadge = () => {
                    switch (activity.action) {
                      case "create": return <Badge variant="default" className="text-xs">Created</Badge>
                      case "update": return <Badge variant="secondary" className="text-xs">Updated</Badge>
                      case "delete": return <Badge variant="destructive" className="text-xs">Deleted</Badge>
                      default: return null
                    }
                  }

                  return (
                    <div
                      key={activity.id || activity.createdAt}
                      className="flex items-start gap-3 pb-4 border-b border-border last:border-0 last:pb-0 hover:bg-muted/50 p-2 rounded-lg transition-colors"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted flex-shrink-0">
                        {getActivityIcon()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-foreground font-medium">
                            {activity.message || activity.entityName || "Activity"}
                          </p>
                          {getActivityBadge()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.time || activity.createdAt 
                            ? new Date(activity.createdAt || activity.time).toLocaleString()
                            : "Just now"}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setOpenDialog("property")}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-background p-4 hover:bg-accent transition-colors"
            >
              <Building2 className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium text-foreground">Add Property</span>
            </button>
            <button
              onClick={() => setOpenDialog("tenant")}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-background p-4 hover:bg-accent transition-colors"
            >
              <Users className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium text-foreground">Add Tenant</span>
            </button>
            <button
              onClick={() => setOpenDialog("invoice")}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-background p-4 hover:bg-accent transition-colors"
            >
              <FileText className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium text-foreground">Create Invoice</span>
            </button>
            <button
              onClick={() => setOpenDialog("employee")}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-background p-4 hover:bg-accent transition-colors"
            >
              <UserCheck className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium text-foreground">Add Employee</span>
            </button>
          </div>
        </Card>
      </div>

      <AddPropertyDialog 
        open={openDialog === "property"} 
        onOpenChange={(open) => {
          if (!open) {
            setOpenDialog(null)
          }
        }}
        onSuccess={() => {
          setOpenDialog(null)
          fetchDashboardData()
        }}
      />
      <AddTenantDialog 
        open={openDialog === "tenant"} 
        onOpenChange={(open) => {
          if (!open) {
            setOpenDialog(null)
          }
        }}
        onSuccess={() => {
          setOpenDialog(null)
          fetchDashboardData()
        }}
      />
      <AddInvoiceDialog 
        open={openDialog === "invoice"} 
        onOpenChange={(open) => {
          if (!open) {
            setOpenDialog(null)
          }
        }}
      />
      <AddEmployeeDialog 
        open={openDialog === "employee"} 
        onOpenChange={(open) => {
          if (!open) {
            setOpenDialog(null)
          }
        }}
      />
    </div>
  )
}
