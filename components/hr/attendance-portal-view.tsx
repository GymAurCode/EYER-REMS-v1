"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Clock, CheckCircle, XCircle, CalendarIcon, Loader2 } from "lucide-react"
import { apiService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export function AttendancePortalView() {
  const { toast } = useToast()
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [loading, setLoading] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [todayAttendance, setTodayAttendance] = useState<any>(null)
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([])
  const [elapsedTime, setElapsedTime] = useState<string>("00:00:00")
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null)

  // Get current employee from localStorage or session
  useEffect(() => {
    // Try to get employee ID from various sources
    const storedEmployeeId = localStorage.getItem('currentEmployeeId') || sessionStorage.getItem('currentEmployeeId')
    if (storedEmployeeId) {
      setCurrentEmployeeId(storedEmployeeId)
    } else {
      // Try to get from user context or fetch current user
      // For now, we'll need to fetch it from the API
      fetchCurrentEmployee()
    }
  }, [])

  const fetchCurrentEmployee = async () => {
    try {
      // This would typically come from auth context
      // For now, we'll fetch the first employee or use a placeholder
      const response = await apiService.employees.getAll()
      const employees = (response.data as any)?.data || []
      if (employees.length > 0) {
        setCurrentEmployeeId(employees[0].id)
        localStorage.setItem('currentEmployeeId', employees[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch current employee:', error)
    }
  }

  // Fetch today's attendance
  useEffect(() => {
    if (currentEmployeeId) {
      fetchTodayAttendance()
      fetchAttendanceHistory()
    }
  }, [currentEmployeeId])

  // Calculate elapsed time based on backend timestamp
  useEffect(() => {
    if (!todayAttendance?.checkIn || todayAttendance?.checkOut) {
      setElapsedTime("00:00:00")
      return
    }

    const updateElapsedTime = () => {
      const checkInTime = new Date(todayAttendance.checkIn).getTime()
      const now = Date.now()
      const elapsed = now - checkInTime
      
      const hours = Math.floor(elapsed / (1000 * 60 * 60))
      const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((elapsed % (1000 * 60)) / 1000)
      
      setElapsedTime(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      )
    }

    updateElapsedTime()
    const interval = setInterval(updateElapsedTime, 1000)
    return () => clearInterval(interval)
  }, [todayAttendance?.checkIn, todayAttendance?.checkOut])

  const fetchTodayAttendance = async () => {
    if (!currentEmployeeId) return
    
    try {
      setLoading(true)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const endOfDay = new Date()
      endOfDay.setHours(23, 59, 59, 999)

      const response = await apiService.attendance.getAll()
      const allAttendance = (response.data as any)?.data || []
      
      const todayRecord = allAttendance.find((att: any) => {
        if (!att || att.employeeId !== currentEmployeeId) return false
        const attDate = new Date(att.date)
        return attDate >= today && attDate <= endOfDay && !att.isDeleted
      })

      setTodayAttendance(todayRecord || null)
    } catch (error) {
      console.error('Failed to fetch today attendance:', error)
      toast({
        title: "Error",
        description: "Failed to fetch today's attendance",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchAttendanceHistory = async () => {
    if (!currentEmployeeId) return
    
    try {
      const response = await apiService.attendance.getAll()
      const allAttendance = (response.data as any)?.data || []
      
      const employeeAttendance = allAttendance
        .filter((att: any) => att.employeeId === currentEmployeeId && !att.isDeleted)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 30) // Last 30 records

      setAttendanceHistory(employeeAttendance)
    } catch (error) {
      console.error('Failed to fetch attendance history:', error)
    }
  }

  const handleCheckIn = async () => {
    if (!currentEmployeeId) {
      toast({
        title: "Error",
        description: "Employee ID not found. Please refresh the page.",
        variant: "destructive",
      })
      return
    }

    try {
      setCheckingIn(true)
      await apiService.attendance.checkIn({ employeeId: currentEmployeeId })
      
      toast({
        title: "Success",
        description: "Checked in successfully",
        variant: "default",
      })

      await fetchTodayAttendance()
    } catch (err: any) {
      console.error("Failed to check in:", err)
      const errorMessage = err.response?.data?.error || err.response?.data?.message || "Failed to check in"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setCheckingIn(false)
    }
  }

  const handleCheckOut = async () => {
    if (!currentEmployeeId) {
      toast({
        title: "Error",
        description: "Employee ID not found. Please refresh the page.",
        variant: "destructive",
      })
      return
    }

    try {
      setCheckingOut(true)
      await apiService.attendance.checkOut({ employeeId: currentEmployeeId })
      
      toast({
        title: "Success",
        description: "Checked out successfully",
        variant: "default",
      })

      await fetchTodayAttendance()
    } catch (err: any) {
      console.error("Failed to check out:", err)
      const errorMessage = err.response?.data?.error || err.response?.data?.message || "Failed to check out"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setCheckingOut(false)
    }
  }

  const formatTime = (timestamp: string | null | undefined) => {
    if (!timestamp) return "Not recorded"
    try {
      return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      })
    } catch {
      return "Invalid time"
    }
  }

  const formatDate = (dateStr: string | Date) => {
    try {
      const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return "Invalid date"
    }
  }

  const getHoursWorked = (att: any) => {
    if (!att.checkIn || !att.checkOut) return "-"
    if (att.hours) {
      return `${att.hours.toFixed(2)} hrs`
    }
    try {
      const checkIn = new Date(att.checkIn).getTime()
      const checkOut = new Date(att.checkOut).getTime()
      const hours = (checkOut - checkIn) / (1000 * 60 * 60)
      return `${hours.toFixed(2)} hrs`
    } catch {
      return "-"
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Employee Attendance Portal</h1>
        <p className="text-muted-foreground mt-1">Mark your daily attendance</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Check In/Out Card */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Today's Attendance</h2>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Check In</p>
                    <p className="text-lg font-semibold">
                      {todayAttendance?.checkIn ? formatTime(todayAttendance.checkIn) : "Not checked in"}
                    </p>
                  </div>
                </div>
                {!todayAttendance?.checkIn && (
                  <Button onClick={handleCheckIn} disabled={checkingIn || !currentEmployeeId}>
                    {checkingIn ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Checking In...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Check In
                      </>
                    )}
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Check Out</p>
                    <p className="text-lg font-semibold">
                      {todayAttendance?.checkOut ? formatTime(todayAttendance.checkOut) : "Not checked out"}
                    </p>
                  </div>
                </div>
                {todayAttendance?.checkIn && !todayAttendance?.checkOut && (
                  <Button variant="outline" onClick={handleCheckOut} disabled={checkingOut}>
                    {checkingOut ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Checking Out...
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Check Out
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Elapsed Time Display - Only show if checked in but not checked out */}
              {todayAttendance?.checkIn && !todayAttendance?.checkOut && (
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Time Elapsed</p>
                      <p className="text-2xl font-bold text-primary font-mono">{elapsedTime}</p>
                    </div>
                    <Clock className="h-8 w-8 text-primary" />
                  </div>
                </div>
              )}

              {todayAttendance?.checkIn && todayAttendance?.checkOut && (
                <div className="p-4 bg-success/10 border border-success rounded-lg">
                  <p className="text-sm font-medium text-success">Attendance completed for today!</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total hours: {getHoursWorked(todayAttendance)}
                  </p>
                </div>
              )}

              {todayAttendance?.status && (
                <div className="flex items-center gap-2">
                  <Badge variant={todayAttendance.status === "present" ? "default" : "secondary"}>
                    {todayAttendance.status}
                  </Badge>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Calendar Card */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Calendar</h2>
          <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md border" />
        </Card>
      </div>

      {/* Attendance History */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Attendance History</h2>
        {attendanceHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attendance records found.</p>
        ) : (
          <div className="space-y-3">
            {attendanceHistory.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-4">
                  <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{formatDate(record.date)}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatTime(record.checkIn)} - {formatTime(record.checkOut)}
                      {record.checkIn && record.checkOut && ` • ${getHoursWorked(record)}`}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    record.status === "present" ? "default" : record.status === "late" ? "secondary" : "destructive"
                  }
                >
                  {record.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
