"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Mail, Phone, Briefcase, Loader2, Users, ArrowUpDown, FileText } from "lucide-react"
import { AddEmployeeDialog } from "./add-employee-dialog"
import { apiService } from "@/lib/api"
import { cn } from "@/lib/utils"

type SortField = "name" | "department" | "position" | "joinDate" | "status"
type SortDirection = "asc" | "desc"

export function EmployeesView({ onEmployeeAdded }: { onEmployeeAdded?: () => void }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiService.employees.getAll()
      
      // Backend returns { success: true, data: [...] }
      // Axios unwraps it, so response.data = { success: true, data: [...] }
      const responseData = response.data as any
      const employeesData = Array.isArray(responseData?.data)
        ? responseData.data
        : Array.isArray(responseData)
        ? responseData
        : []
      setEmployees(employeesData)
    } catch (err: any) {
      console.error('Error fetching employees:', err)
      setError(err.response?.data?.message || err.message || "Failed to fetch employees")
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }

  // Get unique departments for filter
  const departments = useMemo(() => {
    if (!Array.isArray(employees)) return []
    const deptSet = new Set<string>()
    employees.forEach((emp) => {
      if (emp.department) deptSet.add(emp.department)
    })
    return Array.from(deptSet).sort()
  }, [employees])

  // Filtered and sorted employees
  const filteredAndSortedEmployees = useMemo(() => {
    if (!Array.isArray(employees)) return []
    
    let filtered = employees.filter((employee) => {
      // Search filter
      const matchesSearch = 
        (employee?.tid || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee?.position?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee?.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee?.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        false
      
      // Department filter
      const matchesDepartment = departmentFilter === "all" || employee?.department === departmentFilter
      
      // Status filter
      const matchesStatus = statusFilter === "all" || employee?.status === statusFilter
      
      // Type filter
      const matchesType = typeFilter === "all" || employee?.employeeType === typeFilter
      
      return matchesSearch && matchesDepartment && matchesStatus && matchesType
    })
    
    // Sorting
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any
      
      switch (sortField) {
        case "name":
          aValue = a.name || ""
          bValue = b.name || ""
          break
        case "department":
          aValue = a.department || ""
          bValue = b.department || ""
          break
        case "position":
          aValue = a.position || ""
          bValue = b.position || ""
          break
        case "joinDate":
          aValue = a.joinDate ? new Date(a.joinDate).getTime() : 0
          bValue = b.joinDate ? new Date(b.joinDate).getTime() : 0
          break
        case "status":
          aValue = a.status || ""
          bValue = b.status || ""
          break
        default:
          return 0
      }
      
      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
      }
    })
    
    return filtered
  }, [employees, searchQuery, departmentFilter, statusFilter, typeFilter, sortField, sortDirection])
  
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by TID, name, position..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="on-leave">On Leave</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="full-time">Full-time</SelectItem>
              <SelectItem value="part-time">Part-time</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="intern">Intern</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Employees Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">{error}</div>
      ) : filteredAndSortedEmployees.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Users className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <p className="text-lg font-semibold text-foreground mb-2">
              {employees.length === 0 ? "No employees yet" : "No employees match your filters"}
            </p>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              {employees.length === 0 
                ? "Start building your team by adding your first employee. You'll be able to manage attendance, payroll, and leave requests."
                : "Try adjusting your search or filter criteria to find employees."}
            </p>
            {employees.length === 0 && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Employee
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedEmployees.map((employee) => (
          <Card
            key={employee.id}
            className="p-6 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
            onClick={() => router.push(`/details/employees/${employee.id}`)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                  {employee.name
                    ?.split(" ")
                    .map((n: string) => n[0])
                    .join("") || "?"}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{employee.name}</h3>
                  <p className="text-sm text-muted-foreground">{employee.position}</p>
                  <p className="text-xs font-mono text-muted-foreground">{employee.trackingId || employee.tid || employee.employeeId}</p>
                </div>
              </div>
              <Badge variant={employee.status === "active" ? "default" : "secondary"}>{employee.status}</Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span className="truncate">{employee.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{employee.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Briefcase className="h-4 w-4" />
                <span>{employee.department}</span>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Salary</span>
                <span className="font-semibold text-foreground">
                  Rs {employee.salary?.toLocaleString("en-PK") || "0"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">Join Date</span>
                <span className="text-foreground">
                  {employee.joinDate ? new Date(employee.joinDate).toLocaleDateString() : "-"}
                </span>
              </div>
            </div>
          </Card>
          ))}
        </div>
      )}

      <AddEmployeeDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog} 
        onSuccess={() => {
          fetchEmployees()
          onEmployeeAdded?.()
        }} 
      />
    </div>
  )
}
