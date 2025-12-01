"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, BadgeCheck, Calendar, Clock, DollarSign, Loader2, Mail, Phone, User } from "lucide-react"

import { apiService } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface EmployeePayload {
  id: string
  employeeId?: string
  name?: string
  email?: string | null
  phone?: string | null
  department?: string | null
  position?: string | null
  joinDate?: string | null
  status?: string | null
  salary?: number | null
  attendance?: Array<{
    id: string
    date: string
    status: string
    checkIn?: string | null
    checkOut?: string | null
    hours?: number | null
  }>
  payroll?: Array<{
    id: string
    month: string
    baseSalary: number
    bonus: number
    deductions: number
    netPay: number
    status: string
  }>
  leaveRequests?: Array<{
    id: string
    type: string
    startDate: string
    endDate: string
    status: string
    days: number
    reason?: string | null
  }>
}

export default function EmployeeDetailPage() {
  const router = useRouter()
  const params = useParams()
  const employeeId = params.id as string
  const [employee, setEmployee] = useState<EmployeePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await apiService.employees.getById(employeeId)
        const responseData = response?.data as any
        const employeeData: EmployeePayload | null = responseData?.data || responseData || null

        if (!employeeData) {
          setError("Employee not found")
          return
        }

        setEmployee(employeeData)
      } catch (err: any) {
        console.error("Failed to fetch employee details:", err)
        setError(err.response?.data?.message || "Failed to fetch employee details")
      } finally {
        setLoading(false)
      }
    }

    fetchEmployee()
  }, [employeeId])

  const payrollStats = useMemo(() => {
    if (!employee?.payroll || employee.payroll.length === 0) {
      return {
        total: 0,
        paidTotal: 0,
        pendingTotal: 0,
        pendingCount: 0,
      }
    }

    const total = employee.payroll.reduce((sum, record) => sum + (record.netPay || 0), 0)
    const paidTotal = employee.payroll
      .filter((record) => record.status === "paid")
      .reduce((sum, record) => sum + (record.netPay || 0), 0)
    const pendingRecords = employee.payroll.filter((record) => record.status === "pending")
    const pendingTotal = pendingRecords.reduce((sum, record) => sum + (record.netPay || 0), 0)

    return {
      total,
      paidTotal,
      pendingTotal,
      pendingCount: pendingRecords.length,
    }
  }, [employee?.payroll])

  const lastAttendance = useMemo(() => {
    if (!employee?.attendance || employee.attendance.length === 0) return null
    return employee.attendance[0]
  }, [employee?.attendance])

  const leaveStats = useMemo(() => {
    if (!employee?.leaveRequests || employee.leaveRequests.length === 0) {
      return {
        total: 0,
        pending: 0,
        approved: 0,
      }
    }

    const total = employee.leaveRequests.length
    const pending = employee.leaveRequests.filter((request) => request.status === "pending").length
    const approved = employee.leaveRequests.filter((request) => request.status === "approved").length

    return { total, pending, approved }
  }, [employee?.leaveRequests])

  const formatCurrency = (value: number | null | undefined) => {
    if (!value || Number.isNaN(value)) return "Rs 0"
    return `Rs ${value.toLocaleString("en-IN")}`
  }

  const formatDate = (value?: string | null, options?: Intl.DateTimeFormatOptions) => {
    if (!value) return "-"
    try {
      return new Date(value).toLocaleDateString(undefined, options)
    } catch {
      return "-"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Card className="p-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </Card>
        </div>
      </div>
    )
  }

  if (error || !employee) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Card className="p-10 text-center">
            <p className="text-destructive">{error || "Employee not found"}</p>
          </Card>
        </div>
      </div>
    )
  }

  const statusVariant =
    employee.status === "active"
      ? "default"
      : employee.status === "on-leave"
        ? "secondary"
        : employee.status === "inactive"
          ? "destructive"
          : "outline"

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Employee Profile</h1>
            <p className="text-muted-foreground mt-1">Detailed insights for {employee.name}</p>
          </div>
        </div>

        <Card className="p-6">
          <div className="grid gap-6 md:grid-cols-[auto,1fr]">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <User className="h-10 w-10 text-primary" />
              </div>
              <Badge variant={statusVariant} className="capitalize">
                {employee.status || "unknown"}
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="text-lg font-semibold text-foreground">{employee.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Employee ID</p>
                <p className="text-lg font-semibold text-foreground">{employee.employeeId || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Department</p>
                <p className="text-lg font-semibold text-foreground">{employee.department || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Position</p>
                <p className="text-lg font-semibold text-foreground">{employee.position || "-"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={employee.email ? `mailto:${employee.email}` : undefined}
                  className="text-sm font-medium text-foreground hover:underline"
                >
                  {employee.email || "Not provided"}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a
                  href={employee.phone ? `tel:${employee.phone}` : undefined}
                  className="text-sm font-medium text-foreground hover:underline"
                >
                  {employee.phone || "Not provided"}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  Joined {formatDate(employee.joinDate, { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  Base Salary {formatCurrency(employee.salary || null)}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-2">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Total Payroll</p>
            <p className="text-2xl font-bold text-foreground mt-2">{formatCurrency(payrollStats.total)}</p>
          </Card>
          <Card className="p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 mb-2">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
            <p className="text-sm text-muted-foreground">Paid</p>
            <p className="text-2xl font-bold text-foreground mt-2">{formatCurrency(payrollStats.paidTotal)}</p>
          </Card>
          <Card className="p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 mb-2">
              <DollarSign className="h-5 w-5 text-warning" />
            </div>
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-foreground mt-2">
              {formatCurrency(payrollStats.pendingTotal)}{" "}
              <span className="text-sm text-muted-foreground block">{payrollStats.pendingCount} records</span>
            </p>
          </Card>
          <Card className="p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 mb-2">
              <Clock className="h-5 w-5 text-secondary-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Last Attendance</p>
            {lastAttendance ? (
              <div className="mt-2 space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {formatDate(lastAttendance.date, { weekday: "long", month: "short", day: "numeric" })}
                </p>
                <p className="text-xs text-muted-foreground">
                  Status: <span className="capitalize">{lastAttendance.status}</span>
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">No attendance records</p>
            )}
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Recent Payroll</h2>
              <Badge variant="outline" className="capitalize">
                {employee.payroll?.[0]?.status || "—"}
              </Badge>
            </div>
            {employee.payroll && employee.payroll.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">Bonus</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employee.payroll.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.month}</TableCell>
                      <TableCell className="text-right">{formatCurrency(record.baseSalary)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(record.bonus)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(record.deductions)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(record.netPay)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            record.status === "paid"
                              ? "default"
                              : record.status === "pending"
                                ? "secondary"
                                : "outline"
                          }
                          className="capitalize"
                        >
                          {record.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No payroll records available.</p>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Recent Leave Requests</h2>
              <Badge variant="outline">{leaveStats.total} total</Badge>
            </div>
            {employee.leaveRequests && employee.leaveRequests.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-center">Days</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employee.leaveRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.type}</TableCell>
                      <TableCell>
                        <p>{formatDate(request.startDate)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(request.endDate)}</p>
                      </TableCell>
                      <TableCell className="text-center font-semibold">{request.days}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            request.status === "approved"
                              ? "default"
                              : request.status === "rejected"
                                ? "destructive"
                                : "secondary"
                          }
                          className="capitalize"
                        >
                          {request.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No leave requests recorded.</p>
            )}
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Attendance History</h2>
            <Badge variant="outline">{employee.attendance?.length ?? 0} records</Badge>
          </div>
          {employee.attendance && employee.attendance.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employee.attendance.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {formatDate(record.date, { year: "numeric", month: "short", day: "numeric" })}
                    </TableCell>
                    <TableCell className="capitalize">{record.status}</TableCell>
                    <TableCell>
                      {record.checkIn
                        ? new Date(record.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {record.checkOut
                        ? new Date(record.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {typeof record.hours === "number" ? record.hours.toFixed(2) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No attendance history available.</p>
          )}
        </Card>
      </div>
    </div>
  )
}


