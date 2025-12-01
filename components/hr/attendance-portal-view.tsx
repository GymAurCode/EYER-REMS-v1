"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Clock, CheckCircle, XCircle, CalendarIcon } from "lucide-react"

export function AttendancePortalView() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [checkInTime, setCheckInTime] = useState<string | null>(null)
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null)

  const handleCheckIn = () => {
    const now = new Date()
    setCheckInTime(now.toLocaleTimeString())
  }

  const handleCheckOut = () => {
    const now = new Date()
    setCheckOutTime(now.toLocaleTimeString())
  }

  const attendanceHistory = [
    { date: "2024-01-15", checkIn: "09:00 AM", checkOut: "05:30 PM", status: "present" },
    { date: "2024-01-14", checkIn: "09:15 AM", checkOut: "05:45 PM", status: "late" },
    { date: "2024-01-13", checkIn: "09:00 AM", checkOut: "05:00 PM", status: "present" },
    { date: "2024-01-12", checkIn: "-", checkOut: "-", status: "absent" },
  ]

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
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Check In</p>
                  <p className="text-lg font-semibold">{checkInTime || "Not checked in"}</p>
                </div>
              </div>
              {!checkInTime && (
                <Button onClick={handleCheckIn}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Check In
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Check Out</p>
                  <p className="text-lg font-semibold">{checkOutTime || "Not checked out"}</p>
                </div>
              </div>
              {checkInTime && !checkOutTime && (
                <Button variant="outline" onClick={handleCheckOut}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Check Out
                </Button>
              )}
            </div>

            {checkInTime && checkOutTime && (
              <div className="p-4 bg-success/10 border border-success rounded-lg">
                <p className="text-sm font-medium text-success">Attendance marked successfully!</p>
              </div>
            )}
          </div>
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
        <div className="space-y-3">
          {attendanceHistory.map((record, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-4">
                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{record.date}</p>
                  <p className="text-sm text-muted-foreground">
                    {record.checkIn} - {record.checkOut}
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
      </Card>
    </div>
  )
}
