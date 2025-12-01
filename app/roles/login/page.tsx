"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Building2, Lock, User, Loader2, AlertCircle } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { apiService } from "@/lib/api"

function RoleLoginForm() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { roleLogin, inviteLogin, user, loading: authLoading } = useAuth()
  const { toast } = useToast()

  // Prevent redirects - allow users to stay on login page even if not authenticated
  // This is a login page, so we should not redirect unauthenticated users

  useEffect(() => {
    // Check if token is present in URL (invite link)
    const tokenParam = searchParams.get("token")
    if (tokenParam) {
      setToken(tokenParam)
      
      // Fetch invite link details to auto-fill username and password
      const fetchInviteDetails = async () => {
        try {
          const response = await apiService.auth.getInviteLinkByToken(tokenParam)
          const inviteData = response.data as any
          if (inviteData?.username) {
            setUsername(inviteData.username)
          }
          
          // Check if temporary password is stored in sessionStorage for auto-fill
          // This is stored when admin generates the invite link
          const tempPassword = sessionStorage.getItem(`invite_password_${tokenParam}`)
          if (tempPassword) {
            setPassword(tempPassword)
            // Remove from sessionStorage after first use
            sessionStorage.removeItem(`invite_password_${tokenParam}`)
          }
        } catch (error) {
          console.error("Failed to fetch invite link details:", error)
          // If fetch fails, user can still enter username manually
        }
      }
      
      fetchInviteDetails()
    }

    // Load remembered username and password from localStorage (only if no token)
    if (typeof window !== "undefined" && !tokenParam) {
      const rememberedUsername = localStorage.getItem("remembered-role-username")
      const rememberedPassword = localStorage.getItem("remembered-role-password")
      if (rememberedUsername) {
        setUsername(rememberedUsername)
        setRememberMe(true)
      }
      if (rememberedPassword && rememberedUsername) {
        setPassword(rememberedPassword)
      }
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      setError("Please enter both username and password")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // If token is present, use invite login, otherwise use role login
      if (token) {
        const result = await inviteLogin(token, password, username)
        
        toast({
          title: "Success",
          description: result.message || "Login successful",
        })
      } else {
        await roleLogin(username, password)
        
        toast({
          title: "Success",
          description: "Login successful",
        })
      }
      
      // Handle remember me
      if (rememberMe && typeof window !== "undefined") {
        localStorage.setItem("remembered-role-username", username)
        localStorage.setItem("remembered-role-password", password)
      } else if (typeof window !== "undefined") {
        localStorage.removeItem("remembered-role-username")
        localStorage.removeItem("remembered-role-password")
      }

      router.push("/")
    } catch (err: any) {
      console.error("Login failed:", err)
      
      const errorMessage =
        err.response?.data?.message || err.response?.data?.error || err.message || "Login failed"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-10 w-10 text-primary" />
            <span className="text-2xl font-bold text-foreground">RealEstate ERP</span>
          </div>
          <p className="text-muted-foreground text-center">
            {token ? "Sign in with your invite link" : "Sign in to your account"}
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-9"
                required
                disabled={loading}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9"
                required
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked: boolean | "indeterminate") => setRememberMe(checked === true)}
              disabled={loading}
            />
            <Label
              htmlFor="remember"
              className="text-sm font-normal cursor-pointer"
            >
              Remember username and password
            </Label>
          </div>

          <Button type="submit" className="w-full" disabled={loading || !username || !password}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
      </Card>
    </div>
  )
}

export default function RoleLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
          <Card className="w-full max-w-md p-8">
            <div className="flex flex-col items-center mb-8">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-10 w-10 text-primary" />
                <span className="text-2xl font-bold text-foreground">RealEstate ERP</span>
              </div>
              <p className="text-muted-foreground text-center">Loading...</p>
            </div>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </Card>
        </div>
      }
    >
      <RoleLoginForm />
    </Suspense>
  )
}

