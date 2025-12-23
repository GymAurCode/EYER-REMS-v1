"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import axios from "axios"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, UserPlus, TrendingUp, Plus, Briefcase, Loader2, Activity, MessageSquare } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { apiService } from "@/lib/api"
import { LeadsView } from "./leads-view"
import { ClientsView } from "./clients-view"
import { DealsView } from "./deals-view"
import { CommunicationsView } from "./communications-view"
import { DealersView } from "./dealers-view"
import { AddLeadDialog } from "./add-lead-dialog"
import { AddDealerDialog } from "./add-dealer-dialog"
import { AddClientDialog } from "./add-client-dialog"
import { ReportGenerator } from "@/components/shared/report-generator"

export function CRMView() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showAddDealerDialog, setShowAddDealerDialog] = useState(false)
  const [showAddClientDialog, setShowAddClientDialog] = useState(false)
  const [activeTab, setActiveTabState] = useState("leads")
  const [crmStats, setCrmStats] = useState<any[]>([])
  const [statsLoading, setStatsLoading] = useState(true)
  const [dealersRefreshKey, setDealersRefreshKey] = useState(0)
  const [hasInitializedTab, setHasInitializedTab] = useState(false)
  const [pipelineData, setPipelineData] = useState<any[]>([])
  const [recentActivities, setRecentActivities] = useState<any[]>([])
  const tabStorageKey = "crm-active-tab"

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
  }, [activeTab, hasInitializedTab, searchParams, tabStorageKey, updateActiveTab])

  const handleTabChange = useCallback(
    (value: string) => {
      updateActiveTab(value)
    },
    [updateActiveTab],
  )

  useEffect(() => {
    const controller = new AbortController()
    fetchCRMStats(controller.signal)
    return () => controller.abort()
  }, [])

  const fetchCRMStats = async (signal?: AbortSignal) => {
    try {
      setStatsLoading(true)
      const config = { signal }

      const [leadsRes, clientsRes, dealsRes, dealersRes, commissionsRes] = await Promise.all([
        apiService.leads.getAll(config).catch((error) => {
          console.error("Failed to fetch leads:", error)
          return { data: [] }
        }),
        apiService.clients.getAll(undefined, config).catch((error) => {
          console.error("Failed to fetch clients:", error)
          return { data: [] }
        }),
        apiService.deals.getAll(config).catch((error) => {
          console.error("Failed to fetch deals:", error)
          return { data: [] }
        }),
        apiService.dealers.getAll(config).catch((error) => {
          console.error("Failed to fetch dealers:", error)
          return { data: [] }
        }),
        apiService.commissions.getAll(config).catch((error) => {
          return { data: [] }
        }),
      ])

      // Handle nested response structures: { success: true, data: [...] } or { data: [...] } or axios wrapped
      const extractData = (response: any): any[] => {
        if (!response) return []
        
        // Handle axios response wrapper: response.data contains the actual API response
        const apiResponse = response.data || response
        
        // If already an array, return it
        if (Array.isArray(apiResponse)) return apiResponse
        
        // Handle { success: true, data: [...] } structure
        if (apiResponse?.success && Array.isArray(apiResponse.data)) {
          return apiResponse.data
        }
        
        // Handle { data: [...] } structure (nested data)
        if (apiResponse?.data && Array.isArray(apiResponse.data)) {
          return apiResponse.data
        }
        
        // Handle direct { data: [...] } on response
        if (response.data && Array.isArray(response.data)) {
          return response.data
        }
        
        return []
      }

      const leads: any[] = extractData(leadsRes as any)
      const clients: any[] = extractData(clientsRes as any)
      const deals: any[] = extractData(dealsRes as any)
      const dealers: any[] = extractData(dealersRes as any)
      const commissions: any[] = extractData(commissionsRes as any)
      
      // Debug logging (can be removed later)
      console.log('CRM Stats Data:', {
        leadsCount: leads.length,
        clientsCount: clients.length,
        dealsCount: deals.length,
        dealersCount: dealers.length,
        commissionsCount: commissions.length,
      })

      const now = new Date()
      const weekAgo = new Date(now)
      weekAgo.setDate(now.getDate() - 7)
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const leadsThisWeek = leads.filter((lead) => {
        if (!lead.createdAt) return false
        const created = new Date(lead.createdAt)
        return !Number.isNaN(created.valueOf()) && created >= weekAgo
      }).length

      const activeClientsCount = clients.filter(
        (client) => (client.status || "").toLowerCase() === "active",
      ).length

      const clientsThisMonth = clients.filter((client) => {
        if (!client.createdAt) return false
        const created = new Date(client.createdAt)
        return !Number.isNaN(created.valueOf()) && created >= startOfThisMonth
      }).length

      const closedStages = new Set(["closed-won", "won", "closed-lost", "lost"])
      const pipelineDeals = deals.filter((deal) => {
        const stage = (deal.stage || "").toLowerCase()
        return stage === "" || !closedStages.has(stage)
      })

      const pipelineValue = pipelineDeals.reduce((sum, deal) => {
        const numericValue = typeof deal.dealAmount === "number" ? deal.dealAmount : Number(deal.dealAmount)
        return sum + (Number.isFinite(numericValue) ? numericValue : 0)
      }, 0)

      const totalCommissions = commissions.reduce((sum, item) => {
        const numericValue = typeof item.amount === "number" ? item.amount : Number(item.amount)
        return sum + (Number.isFinite(numericValue) ? numericValue : 0)
      }, 0)

      // Calculate pipeline funnel data
      const pipelineStages = {
        new: leads.filter((l) => (l.status || "").toLowerCase() === "new").length,
        qualified: leads.filter((l) => (l.status || "").toLowerCase() === "qualified").length,
        proposal: deals.filter((d) => (d.stage || "").toLowerCase() === "proposal").length,
        negotiation: deals.filter((d) => (d.stage || "").toLowerCase() === "negotiation").length,
        closing: deals.filter((d) => {
          const stage = (d.stage || "").toLowerCase()
          return stage === "closing" || stage === "closed-won"
        }).length,
      }

      setPipelineData([
        { stage: "New", count: pipelineStages.new, color: "#3b82f6" },
        { stage: "Qualified", count: pipelineStages.qualified, color: "#8b5cf6" },
        { stage: "Proposal", count: pipelineStages.proposal, color: "#f59e0b" },
        { stage: "Negotiation", count: pipelineStages.negotiation, color: "#ef4444" },
        { stage: "Closing", count: pipelineStages.closing, color: "#10b981" },
      ])

      // Build recent activities feed
      const activities: any[] = []
      
      // Add recent leads
      leads.slice(0, 5).forEach((lead) => {
        if (lead.createdAt) {
          activities.push({
            id: `lead-${lead.id}`,
            type: "lead",
            action: "created",
            title: `New lead: ${lead.name}`,
            timestamp: lead.createdAt,
            icon: UserPlus,
          })
        }
      })

      // Add recent clients
      clients.slice(0, 5).forEach((client) => {
        if (client.createdAt) {
          activities.push({
            id: `client-${client.id}`,
            type: "client",
            action: "created",
            title: `New client: ${client.name}`,
            timestamp: client.createdAt,
            icon: Users,
          })
        }
      })

      // Add recent deals
      deals.slice(0, 5).forEach((deal) => {
        if (deal.updatedAt || deal.createdAt) {
          activities.push({
            id: `deal-${deal.id}`,
            type: "deal",
            action: deal.updatedAt && new Date(deal.updatedAt) > new Date(deal.createdAt) ? "updated" : "created",
            title: `Deal ${deal.updatedAt && new Date(deal.updatedAt) > new Date(deal.createdAt) ? "updated" : "created"}: ${deal.title}`,
            timestamp: deal.updatedAt || deal.createdAt,
            icon: TrendingUp,
          })
        }
      })

      // Sort by timestamp and take latest 10
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setRecentActivities(activities.slice(0, 10))

      setCrmStats([
        {
          name: "Total Leads",
          value: leads.length.toString(),
          change: `+${leadsThisWeek} this week`,
          icon: UserPlus,
          href: "/details/leads",
        },
        {
          name: "Active Clients",
          value: activeClientsCount.toString(),
          change: `+${clientsThisMonth} this month`,
          icon: Users,
          href: "/details/clients",
        },
        {
          name: "Deals in Pipeline",
          value: pipelineDeals.length.toString(),
          change: pipelineValue > 0 ? `Rs ${(pipelineValue / 1_000_000).toFixed(2)}Cr value` : "Rs 0 value",
          icon: TrendingUp,
          href: "/details/deals",
        },
        {
          name: "Active Dealers",
          value: dealers.length.toString(),
          change: totalCommissions > 0 ? `Rs ${(totalCommissions / 1_000).toFixed(0)}K commissions` : "Rs 0 commissions",
          icon: Briefcase,
          href: "/details/dealers",
        },
      ])
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return
      }
      console.error("Failed to fetch CRM stats:", err)
      setCrmStats([])
    } finally {
      if (!signal?.aborted) {
        setStatsLoading(false)
      }
    }
  }

  const reportConfig = useMemo(() => {
    switch (activeTab) {
      case "clients":
        return {
          moduleName: "CRM - Clients",
          fields: ["Client ID", "Name", "Email", "Phone", "Company", "Type", "Status", "Added On"],
          getData: async () => {
            const res = await apiService.clients.getAll()
            return Array.isArray(res.data) ? res.data : []
          },
        }
      case "deals":
        return {
          moduleName: "CRM - Deals",
          fields: ["Deal ID", "Title", "Value", "Stage", "Client", "Dealer", "Created On", "Updated On"],
          getData: async () => {
            const res = await apiService.deals.getAll()
            return Array.isArray(res.data) ? res.data : []
          },
        }
      case "dealers":
        return {
          moduleName: "CRM - Dealers",
          fields: [
            "Dealer ID",
            "Name",
            "Email",
            "Phone",
            "Company",
            "Commission Rate",
            "Total Deals",
            "Total Deal Value",
            "Joined On",
          ],
          getData: async () => {
            const [dealersRes, dealsRes] = await Promise.all([
              apiService.dealers.getAll(),
              apiService.deals.getAll().catch(() => ({ data: [] })),
            ])
            const dealerList: any[] = Array.isArray(dealersRes.data) ? dealersRes.data : []
            const deals: any[] = Array.isArray(dealsRes.data) ? dealsRes.data : []

            const dealsByDealer: Record<
              string,
              { count: number; totalValue: number }
            > = {}
            deals.forEach((deal: any) => {
              const dealerId = deal.dealerId || deal.dealer?.id
              if (!dealerId) return
              const numericValue =
                typeof deal.dealAmount === "number" ? deal.dealAmount : Number.parseFloat(deal.dealAmount ?? "0")
              const safeValue = Number.isFinite(numericValue) ? numericValue : 0
              if (!dealsByDealer[dealerId]) {
                dealsByDealer[dealerId] = { count: 0, totalValue: 0 }
              }
              dealsByDealer[dealerId].count += 1
              dealsByDealer[dealerId].totalValue += safeValue
            })

            return dealerList.map((dealer: any) => {
              const stats = dealsByDealer[dealer.id] || { count: 0, totalValue: 0 }
              return {
                ...dealer,
                totalDeals: stats.count,
                totalDealValue: stats.totalValue,
              }
            })
          },
        }
      case "communications":
        return {
          moduleName: "CRM - Communications",
          fields: [
            "Communication ID",
            "Type",
            "Contact",
            "Client",
            "Lead",
            "Agent",
            "Date",
            "Notes",
          ],
          getData: async () => {
            const res = await apiService.communications.getAll()
            return Array.isArray(res.data) ? res.data : []
          },
        }
      case "leads":
      default:
        return {
          moduleName: "CRM - Leads",
          fields: [
            "Lead ID",
            "Name",
            "Email",
            "Phone",
            "Source",
            "Status",
            "Assigned To",
            "Created Date",
            "Last Contact",
          ],
          getData: async () => {
            const res = await apiService.leads.getAll()
            return Array.isArray(res.data) ? res.data : []
          },
        }
    }
  }, [activeTab])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground text-balance">CRM</h1>
          <p className="text-muted-foreground mt-1">Manage leads, clients, deals, dealers, and communications</p>
        </div>
        <div className="flex gap-2">
          <ReportGenerator
            moduleName={reportConfig.moduleName}
            availableFields={reportConfig.fields}
            getData={reportConfig.getData}
          />
          {activeTab === "dealers" ? (
            <Button onClick={() => setShowAddDealerDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Dealer
            </Button>
          ) : activeTab === "clients" ? (
            <Button onClick={() => setShowAddClientDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          ) : (
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          )}
        </div>
      </div>

      {/* CRM Stats */}
      {statsLoading ? (
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
          {crmStats.map((stat) => (
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
          ))}
        </div>
      )}

      {/* Pipeline Funnel Chart and Recent Activities */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pipeline Funnel Chart */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Sales Pipeline Funnel</h3>
            <Badge variant="outline">Live</Badge>
          </div>
          {pipelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pipelineData} layout="vertical">
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
                  formatter={(value: any) => [`${value}`, "Count"]}
                />
                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                  {pipelineData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No pipeline data available
            </div>
          )}
        </Card>

        {/* Recent Activities Feed */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Recent Activities</h3>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </div>
          <ScrollArea className="h-[300px]">
            {recentActivities.length > 0 ? (
              <div className="space-y-3">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                      <activity.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{activity.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {activity.type}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground">No recent activities</p>
                <p className="text-xs text-muted-foreground mt-1">Activities will appear here as you work</p>
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
          <TabsTrigger value="dealers">Dealers</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
        </TabsList>

        <TabsContent value="leads">
          <LeadsView />
        </TabsContent>

        <TabsContent value="clients">
          <ClientsView />
        </TabsContent>

        <TabsContent value="deals">
          <DealsView />
        </TabsContent>

        <TabsContent value="dealers">
          <DealersView refreshKey={dealersRefreshKey} />
        </TabsContent>

        <TabsContent value="communications">
          <CommunicationsView />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddLeadDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
      <AddDealerDialog
        open={showAddDealerDialog}
        onOpenChange={setShowAddDealerDialog}
        onSuccess={() => setDealersRefreshKey((key) => key + 1)}
      />
      <AddClientDialog open={showAddClientDialog} onOpenChange={setShowAddClientDialog} />
    </div>
  )
}
