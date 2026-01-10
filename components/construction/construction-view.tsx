"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Hammer, Plus, Loader2, Building2, FileText, Users, Wrench, Package, TrendingUp } from "lucide-react"
import { apiService } from "@/lib/api"
import { ProjectsView } from "./projects-view"
import { CostCodesView } from "./cost-codes-view"
import { DailyLogsView } from "./daily-logs-view"
import { LaborView } from "./labor-view"
import { EquipmentView } from "./equipment-view"
import { InventoryView } from "./inventory-view"
import { ReportsView } from "./reports-view"
import { AddProjectDialog } from "./add-project-dialog"
import { cn } from "@/lib/utils"

export function ConstructionView() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [activeTab, setActiveTabState] = useState("projects")
  const [hasInitializedTab, setHasInitializedTab] = useState(false)
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalCost: 0,
    pendingApprovals: 0,
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const tabStorageKey = "construction-active-tab"

  const updateActiveTab = useCallback(
    (value: string, { shouldPersistQuery = true }: { shouldPersistQuery?: boolean } = {}) => {
      if (value !== activeTab) {
        setActiveTabState(value)
      }

      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(tabStorageKey, value)
        } catch {
          // Ignore storage errors
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
    fetchStats()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStats = async () => {
    try {
      setStatsLoading(true)
      const response = await apiService.construction.projects.getAll({ limit: 1000 })
      const responseData = response.data as any
      const projects = responseData?.data || responseData || []
      const active = projects.filter((p: any) => p.status === "active")
      const totalCost = projects.reduce((sum: number, p: any) => sum + (p.actualCost || 0), 0)
      
      setStats({
        totalProjects: projects.length,
        activeProjects: active.length,
        totalCost,
        pendingApprovals: 0, // TODO: Calculate from labor/equipment/issue approvals
      })
    } catch (error) {
      console.error("Error fetching construction stats:", error)
    } finally {
      setStatsLoading(false)
    }
  }

  const formatCurrency = (amount: number | null | undefined) => {
    const numericValue = Number(amount || 0)
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numericValue)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Hammer className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Construction</h1>
            <p className="text-sm text-muted-foreground">Project-based construction operations</p>
          </div>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
              {statsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin mt-2" />
              ) : (
                <p className="text-2xl font-bold">{stats.totalProjects}</p>
              )}
            </div>
            <Building2 className="h-8 w-8 text-blue-500 opacity-50" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
              {statsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin mt-2" />
              ) : (
                <p className="text-2xl font-bold">{stats.activeProjects}</p>
              )}
            </div>
            <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
              {statsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin mt-2" />
              ) : (
                <p className="text-2xl font-bold">{formatCurrency(stats.totalCost)}</p>
              )}
            </div>
            <FileText className="h-8 w-8 text-orange-500 opacity-50" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Approvals</p>
              {statsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin mt-2" />
              ) : (
                <p className="text-2xl font-bold">{stats.pendingApprovals}</p>
              )}
            </div>
            <Users className="h-8 w-8 text-yellow-500 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex min-w-full sm:min-w-0">
            <TabsTrigger value="projects" className="text-xs sm:text-sm">Projects</TabsTrigger>
            <TabsTrigger value="cost-codes" className="text-xs sm:text-sm">Cost Codes</TabsTrigger>
            <TabsTrigger value="daily-logs" className="text-xs sm:text-sm">Daily Logs</TabsTrigger>
            <TabsTrigger value="labor" className="text-xs sm:text-sm">Labor</TabsTrigger>
            <TabsTrigger value="equipment" className="text-xs sm:text-sm">Equipment</TabsTrigger>
            <TabsTrigger value="inventory" className="text-xs sm:text-sm">Inventory</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs sm:text-sm">Reports</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="projects">
          <ProjectsView onRefresh={fetchStats} />
        </TabsContent>

        <TabsContent value="cost-codes">
          <CostCodesView />
        </TabsContent>

        <TabsContent value="daily-logs">
          <DailyLogsView />
        </TabsContent>

        <TabsContent value="labor">
          <LaborView />
        </TabsContent>

        <TabsContent value="equipment">
          <EquipmentView />
        </TabsContent>

        <TabsContent value="inventory">
          <InventoryView />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsView />
        </TabsContent>
      </Tabs>

      {/* Dialog */}
      <AddProjectDialog open={showAddDialog} onOpenChange={setShowAddDialog} onSuccess={fetchStats} />
    </div>
  )
}
