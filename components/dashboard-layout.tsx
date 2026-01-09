"use client"

import type React from "react"
import { Brain, UserCheck } from "lucide-react" // Import Brain icon and UserCheck icon

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Building2,
  DollarSign,
  Users,
  UserCircle,
  LayoutDashboard,
  Menu,
  X,
  Settings,
  Bell,
  MessageCircle,
  Search,
  Home,
  HelpCircle,
  LogOut,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Shield,
  Hammer,
} from "lucide-react"
import { useTheme } from "@/lib/theme-provider"
import { useAuth } from "@/lib/auth-context"
import { ChatDialog } from "@/components/chat/chat-dialog"
import { AuthToasts } from "@/lib/toast-utils"

// Helper function to check if user has access to a module
const hasModuleAccess = (permissions: string[] | undefined, module: string): boolean => {
  if (!permissions || permissions.length === 0) return false
  // Check if user has all permissions (admin) or specific module permissions
  if (permissions.includes('*')) return true
  return permissions.some((p) => p.startsWith(`${module}.`))
}

const getNavigationForUser = (role: string, permissions?: string[]) => {
  const baseNav = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "AI Intelligence", href: "/ai-intelligence", icon: Brain },
  ]

  // Normalize role to lowercase for comparison
  const normalizedRole = role?.toLowerCase() || ""

  // Admin always has all access
  if (normalizedRole === "admin") {
    return [
      ...baseNav,
      { name: "Properties", href: "/properties", icon: Building2 },
      { name: "Finance", href: "/finance", icon: DollarSign },
      { name: "Construction", href: "/construction", icon: Hammer },
      { name: "HR Management", href: "/hr", icon: Users },
      { name: "CRM", href: "/crm", icon: UserCircle },
      { name: "Tenant Portal", href: "/tenant", icon: Home },
      { name: "Roles & Permissions", href: "/roles", icon: Shield },
    ]
  }

  // For non-admin users, check permissions dynamically
  const navItems = [...baseNav]

  // Check module access based on permissions
  if (hasModuleAccess(permissions, "properties")) {
    navItems.push({ name: "Properties", href: "/properties", icon: Building2 })
  }
  if (hasModuleAccess(permissions, "finance")) {
    navItems.push({ name: "Finance", href: "/finance", icon: DollarSign })
  }
  if (hasModuleAccess(permissions, "hr")) {
    navItems.push({ name: "HR Management", href: "/hr", icon: Users })
  }
  if (hasModuleAccess(permissions, "crm")) {
    navItems.push({ name: "CRM", href: "/crm", icon: UserCircle })
  }
  if (hasModuleAccess(permissions, "construction")) {
    navItems.push({ name: "Construction", href: "/construction", icon: Hammer })
  }
  if (hasModuleAccess(permissions, "tenant")) {
    navItems.push({ name: "Tenant Portal", href: "/tenant", icon: Home })
  }

  // Support is always available
  navItems.push({ name: "Support", href: "/support", icon: HelpCircle })

  return navItems
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Load sidebar state from localStorage on mount
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarOpen')
      return saved === 'true'
    }
    return false
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed')
      return saved === 'true'
    }
    return false
  })
  const [chatOpen, setChatOpen] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { user, logout, loading, isAuthenticated } = useAuth()

  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarOpen', String(sidebarOpen))
    }
  }, [sidebarOpen])

  // Save sidebar collapsed state to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed))
    }
  }, [sidebarCollapsed])

  // Close sidebar on mobile when pathname changes (navigation)
  useEffect(() => {
    // Close sidebar on mobile when navigating to a new page
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }, [pathname])

  // Redirect to login if not authenticated (but not if already on a login page)
  useEffect(() => {
    // Don't redirect if already on a login page
    if (pathname === "/login" || pathname === "/roles/login" || pathname === "/invite-login") {
      return
    }
    
    // Wait for loading to finish and check if we have a token
    if (!loading) {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
      const storedUser = typeof window !== "undefined" ? localStorage.getItem("erp-user") : null
      
      // Only redirect if we're truly not authenticated (no token AND no user)
      if (!isAuthenticated && !user && !token && !storedUser) {
        router.push("/login")
        return
      }
      
      // If we have token but no user yet, wait a bit (auth context is still initializing)
      if (token && storedUser && !user) {
        // Give auth context time to set the user
        return
      }
      
      // If we have token and stored user but still not authenticated, check role
      if (token && storedUser && !isAuthenticated) {
        try {
          const parsedUser = JSON.parse(storedUser)
          if (parsedUser.role?.toLowerCase() !== "admin") {
            router.push("/roles/login")
            return
          }
        } catch (e) {
          // If parsing fails, default to admin login
        }
      }
    }
  }, [loading, isAuthenticated, user, router, pathname])

  const navigation = user ? getNavigationForUser(user.role, user.permissions) : []
  const hasAdvancedAccess =
    user &&
    (user.role?.toLowerCase() === "admin" || hasModuleAccess(user.permissions, "advanced"))

  const handleLogout = async () => {
    try {
      await logout()
      AuthToasts.logoutSuccess()
      router.push("/login")
    } catch (error) {
      AuthToasts.logoutError()
    }
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render dashboard if not authenticated
  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div className="flex h-screen bg-background p-4 gap-4">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-4 left-4 z-50 w-64 transform bg-card border border-border rounded-2xl shadow-lg transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          sidebarCollapsed ? "lg:w-20" : "lg:w-64",
          sidebarOpen && "w-64",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-center px-6 border-b border-border">
            <div className="flex items-center gap-2">
              <Building2 className="h-8 w-8 text-primary" />
              {!sidebarCollapsed && <span className="text-xl font-bold text-foreground">RealEstate ERP</span>}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
            {navigation.map((item: { name: string; href: string; icon: React.ComponentType<{ className?: string }> }) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => {
                    // Close sidebar on mobile when navigating
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false)
                    }
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    sidebarCollapsed && "justify-center",
                  )}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!sidebarCollapsed && item.name}
                </Link>
              )
            })}
          </nav>

          {/* Profile Section */}
          <div className="p-4">
            {!sidebarCollapsed ? (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground flex-shrink-0">
                  <UserCircle className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user?.name || "Admin User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email || "admin@realestate.com"}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={toggleTheme}>
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <UserCircle className="h-6 w-6" />
                </div>
                <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle theme">
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>

          {/* Settings and Support */}
          <div className="border-t border-border">
            <div className="space-y-1 px-3 py-3">
              <Link
                href="/settings"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  pathname === "/settings"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  sidebarCollapsed && "justify-center",
                )}
                title={sidebarCollapsed ? "Settings" : undefined}
              >
                <Settings className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && "Settings"}
              </Link>
              <Link
                href="/support"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  pathname === "/support"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  sidebarCollapsed && "justify-center",
                )}
                title={sidebarCollapsed ? "Support" : undefined}
              >
                <HelpCircle className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && "Support"}
              </Link>
            </div>

            <div className="px-3 pb-3">
              {!sidebarCollapsed ? (
                <Button
                  variant="outline"
                  className="w-full bg-transparent border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-200"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-200"
                  onClick={handleLogout}
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Powered by eyercall */}
            <div className="px-4 pb-4 text-center border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">
                Powered by <span className="font-semibold text-foreground">eyercall</span>
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden bg-card border border-border rounded-2xl shadow-lg">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
          <div className="flex items-center gap-4">
            {sidebarOpen ? (
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all duration-200 border border-transparent hover:border-destructive/20" 
                onClick={() => setSidebarOpen(false)}
                title="Close sidebar"
              >
                <X className="h-5 w-5" />
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-200 border border-transparent hover:border-primary/20" 
                onClick={() => setSidebarOpen(true)}
                title="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-200 border border-transparent hover:border-primary/20"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4 transition-transform duration-200" />
              ) : (
                <ChevronLeft className="h-4 w-4 transition-transform duration-200" />
              )}
            </Button>
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search by property code, name..."
                className="h-9 w-64 rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const query = (e.target as HTMLInputElement).value.trim()
                    if (query) {
                      // Navigate to properties page with search query
                      router.push(`/properties?search=${encodeURIComponent(query)}`)
                      ;(e.target as HTMLInputElement).value = ''
                    }
                  }
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasAdvancedAccess && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => router.push("/admin/advanced-options")}
              >
                Advanced Options
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative" 
              onClick={() => {
                setChatOpen(true)
                // Immediately clear unread count when button is clicked
                setUnreadMessages(0)
              }}
            >
              <MessageCircle className="h-5 w-5" />
              {!chatOpen && unreadMessages > 0 && (
                <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground shadow-sm border-2 border-background">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-muted/30">{children}</main>
      </div>
      
      {/* Chat Dialog */}
      <ChatDialog 
        open={chatOpen} 
        onOpenChange={(open) => {
          setChatOpen(open)
          // Clear unread count immediately when chat opens
          if (open) {
            setUnreadMessages(0)
          }
        }}
        onNewMessage={() => {
          // Only show red dot when chat is closed
          // Check chatOpen state directly to ensure it's accurate
          if (!chatOpen) {
            setUnreadMessages((prev) => prev + 1)
          }
          // Don't show red dot when chat is open
        }}
      />
    </div>
  )
}
