"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Building2, Lock, User, Loader2, AlertCircle } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

function InviteLoginForm() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { inviteLogin } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    const tokenParam = searchParams.get("token")
    if (tokenParam) {
      setToken(tokenParam)
    } else {
      setError("Invalid invite link. No token provided.")
    }

    // Load remembered username and password from localStorage
    if (typeof window !== "undefined") {
      const rememberedUsername = localStorage.getItem("remembered-username")
      const rememberedPassword = localStorage.getItem("remembered-password")
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
    if (!token) {
      setError("Invalid invite link")
      return
    }

    if (!username || !password) {
      setError("Please enter both username and password")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await inviteLogin(token, password, username)
      
      // Handle remember me
      if (rememberMe && typeof window !== "undefined") {
        localStorage.setItem("remembered-username", username)
        localStorage.setItem("remembered-password", password)
      } else if (typeof window !== "undefined") {
        localStorage.removeItem("remembered-username")
        localStorage.removeItem("remembered-password")
      }
      
      toast({
        title: "Success",
        description: result.message || "Login successful",
      })

      router.push("/")
    } catch (err: any) {
      console.error("Invite login failed:", err)
      
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
          <p className="text-muted-foreground text-center">Sign in with your invite link</p>
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
                disabled={!token || loading}
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
                disabled={!token || loading}
                autoComplete="current-password"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              disabled={loading}
            />
            <Label
              htmlFor="remember"
              className="text-sm font-normal cursor-pointer"
            >
              Remember username and password
            </Label>
          </div>

          <Button type="submit" className="w-full" disabled={!token || loading || !username || !password}>
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

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Back to login
          </Link>
        </div>
      </Card>
    </div>
  )
}

export default function InviteLoginPage() {
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
      <InviteLoginForm />
    </Suspense>
  )
}

