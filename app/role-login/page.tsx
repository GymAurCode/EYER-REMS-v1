"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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

export default function RoleLoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { roleLogin } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    // Load remembered username and password from localStorage
    if (typeof window !== "undefined") {
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
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      setError("Please enter both username and password")
      return
    }

    setLoading(true)
    setError(null)

    try {
      await roleLogin(username, password)
      
      // Handle remember me
      if (rememberMe && typeof window !== "undefined") {
        localStorage.setItem("remembered-role-username", username)
        localStorage.setItem("remembered-role-password", password)
      } else if (typeof window !== "undefined") {
        localStorage.removeItem("remembered-role-username")
        localStorage.removeItem("remembered-role-password")
      }
      
      toast({
        title: "Success",
        description: "Login successful",
      })

      router.push("/")
    } catch (err: any) {
      console.error("Role login failed:", err)
      
      // Handle device approval pending error
      if (err.message && err.message.includes("Device approval")) {
        setError(err.message)
        toast({
          title: "Device Approval Required",
          description: err.message,
          variant: "default",
        })
        return
      }
      
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
          <p className="text-muted-foreground text-center">Sign in to your account</p>
        </div>

        {error && (
          <Alert 
            variant={error.includes("Device approval") || error.includes("pending") ? "default" : "destructive"} 
            className="mb-4"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>
              {error.includes("Device approval") || error.includes("pending") 
                ? "Device Approval Required" 
                : "Error"}
            </AlertTitle>
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

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Admin Login
          </Link>
        </div>
      </Card>
    </div>
  )
}

