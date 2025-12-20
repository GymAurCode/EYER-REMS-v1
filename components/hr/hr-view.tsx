"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, UserCheck, Clock, Calendar, Plus, Loader2 } from "lucide-react"
import { apiService } from "@/lib/api"
import { EmployeesView } from "./employees-view"
import { AttendanceView } from "./attendance-view"
import { PayrollView } from "./payroll-view"
import { LeaveView } from "./leave-view"
import { AddEmployeeDialog } from "./add-employee-dialog"
import { RealTimeAttendancePortal } from "./real-time-attendance-portal"
import { ReportGenerator } from "@/components/shared/report-generator"

export function HRView() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [hrStats, setHrStats] = useState<any[]>([])
  const [statsLoading, setStatsLoading] = useState(true)
  const [activeTab, setActiveTabState] = useState("employees")
  const [hasInitializedTab, setHasInitializedTab] = useState(false)
  const tabStorageKey = "hr-active-tab"

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
    fetchHRStats()
  }, [])

  const fetchHRStats = async () => {
    try {
      setStatsLoading(true)
      const response = await apiService.stats.getHRStats()
      
      // API returns { success: true, data: {...} }, axios wraps it so response.data = { success: true, data: {...} }
      // Try multiple access patterns to handle different response structures
      const responseData = response.data as any
      const data = responseData?.data || responseData || {}
      
      setHrStats([
        {
          name: "Total Employees",
          value: (data.totalEmployees ?? 0).toString(),
          change: data.employeesChange || "+0 this month",
          icon: Users,
          href: "/details/employees",
        },
        {
          name: "Active Today",
          value: (data.activeToday ?? 0).toString(),
          change: data.attendanceRate ? `${data.attendanceRate}% attendance` : "0% attendance",
          icon: UserCheck,
          href: "/details/active-today",
        },
        {
          name: "Pending Leaves",
          value: (data.pendingLeaves ?? 0).toString(),
          change: data.urgentLeaves ? `${data.urgentLeaves} urgent` : "0 urgent",
          icon: Calendar,
          href: "/details/pending-leaves",
        },
        {
          name: "Avg Work Hours",
          value: (data.avgWorkHours ?? 0).toString(),
          change: "per week",
          icon: Clock,
          href: "/details/work-hours",
        },
      ])
    } catch (err) {
      console.error("Failed to fetch HR stats:", err)
      // Set default values on error
      setHrStats([
        {
          name: "Total Employees",
          value: "0",
          change: "+0 this month",
          icon: Users,
          href: "/details/employees",
        },
        {
          name: "Active Today",
          value: "0",
          change: "0% attendance",
          icon: UserCheck,
          href: "/details/active-today",
        },
        {
          name: "Pending Leaves",
          value: "0",
          change: "0 urgent",
          icon: Calendar,
          href: "/details/pending-leaves",
        },
        {
          name: "Avg Work Hours",
          value: "0",
          change: "per week",
          icon: Clock,
          href: "/details/work-hours",
        },
      ])
    } finally {
      setStatsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground text-balance">HR Management</h1>
          <p className="text-muted-foreground mt-1">Manage employees, attendance, payroll, and leave requests</p>
        </div>
        <div className="flex gap-2">
          <ReportGenerator
            moduleName="HR"
            availableFields={[
              "Employee ID",
              "Name",
              "Department",
              "Position",
              "Salary",
              "Join Date",
              "Status",
              "Attendance",
              "Leave Balance",
            ]}
            getData={async () => {
              const response: any = await apiService.employees.getAll()
              return response?.data?.data || response?.data || []
            }}
          />
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* HR Stats */}
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
          {hrStats.map((stat) => (
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="attendance-portal">Attendance Portal</TabsTrigger>
          <TabsTrigger value="attendance">Attendance Records</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="leave">Leave Management</TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <EmployeesView onEmployeeAdded={fetchHRStats} />
        </TabsContent>

        <TabsContent value="attendance-portal">
          <RealTimeAttendancePortal />
        </TabsContent>

        <TabsContent value="attendance">
          <AttendanceView />
        </TabsContent>

        <TabsContent value="payroll">
          <PayrollView />
        </TabsContent>

        <TabsContent value="leave">
          <LeaveView />
        </TabsContent>
      </Tabs>

      {/* Add Employee Dialog */}
      <AddEmployeeDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog}
        onSuccess={() => {
          fetchHRStats()
        }}
      />
    </div>
  )
}
