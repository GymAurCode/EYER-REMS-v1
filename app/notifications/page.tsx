"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowLeft, Loader2, Bell } from "lucide-react"
import { apiService } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"

export default function NotificationsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = async () => {
    try {
      const response = await apiService.auth.getNotifications()
      const allNotifications = (response.data as any[]) || []
      // Filter out approval messages, only show login notifications
      const loginNotifications = allNotifications.filter(
        (n) =>
          !n.title?.toLowerCase().includes("approval") &&
          !n.message?.toLowerCase().includes("approval") &&
          (n.title?.toLowerCase().includes("login") ||
            n.message?.toLowerCase().includes("logged in"))
      )
      setNotifications(loginNotifications)
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()

    // Poll for new notifications every 5 seconds
    const notificationInterval = setInterval(() => {
      fetchNotifications()
    }, 5000)

    return () => clearInterval(notificationInterval)
  }, [])

  // Mark all notifications as read when page is opened
  useEffect(() => {
    const markAllAsRead = async () => {
      const unreadNotifications = notifications.filter((n) => !n.read)
      if (unreadNotifications.length > 0) {
        try {
          await Promise.all(
            unreadNotifications.map((n) =>
              apiService.auth.markNotificationRead(n.id)
            )
          )
          // Update local state
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        } catch (error) {
          console.error("Failed to mark notifications as read:", error)
        }
      }
    }
    markAllAsRead()
  }, [])

  const handleNotificationClick = async (notification: any) => {
    // Mark notification as read when clicked
    if (!notification.read) {
      try {
        await apiService.auth.markNotificationRead(notification.id)
        // Update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, read: true } : n
          )
        )
      } catch (error) {
        console.error("Failed to mark notification as read:", error)
      }
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Bell className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Notifications
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  View all your notifications
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <Card className="p-12 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No notifications found</p>
          </Card>
        ) : (
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="space-y-3 pr-4">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`p-4 cursor-pointer transition-colors hover:shadow-md ${
                    !notification.read
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-accent"
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-semibold text-foreground">
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="h-2 w-2 rounded-full bg-primary"></span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleString(
                          "en-US",
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          }
                        )}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </DashboardLayout>
  )
}

