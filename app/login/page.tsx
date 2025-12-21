"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, Lock, Loader2, AlertCircle, Eye, EyeOff, Grid, ArrowRight } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { AuthToasts } from "@/lib/toast-utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function LoginPage() {
  const router = useRouter()
  const { user, loading: authLoading, login } = useAuth()
  const [email, setEmail] = useState("admin@realestate.com")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect role-based users to their login page
  useEffect(() => {
    if (!authLoading && user && user.role?.toLowerCase() !== "admin") {
      router.push("/roles/login")
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(email, password)
      AuthToasts.loginSuccess()
      router.push("/")
    } catch (err: any) {
      // Get error message from response, prioritizing message field
      const errorMessage =
        err.response?.data?.message || 
        err.response?.data?.error || 
        err.response?.data?.details?.message ||
        err.message || 
        "Login failed"
      setError(errorMessage)
      AuthToasts.loginError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-white">
      {/* Login Form */}
      <div className="w-full max-w-md">
        {/* Secure Access Portal Badge */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-purple-500/30 bg-purple-50">
            <Grid className="w-4 h-4 text-purple-600" />
            <Lock className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-semibold text-purple-700 tracking-wider">SECURE ACCESS PORTAL</span>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-purple-900 mb-2">Welcome Back</h1>
          <p className="text-purple-600">Access your digital dashboard.</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6 bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-purple-700 font-medium">EMAIL</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-purple-500" />
              <Input
                id="email"
                type="email"
                placeholder="user@eyercall.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 bg-white border-purple-200 text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-purple-700 font-medium">PASSWORD</Label>
              <Link 
                href="/reset-password" 
                className="text-sm text-purple-600 hover:text-purple-700 transition-colors"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-purple-500" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-12 bg-white border-purple-200 text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-500 hover:text-purple-700 transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <Button 
            type="submit" 
            className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-medium text-base shadow-md shadow-purple-500/20"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign In <ArrowRight className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>
        </form>

        {/* New User Prompt */}
        <div className="mt-8 text-center text-purple-600">
          New to Eyercall?{" "}
          <Link href="/signup" className="text-purple-700 hover:text-purple-800 font-medium transition-colors">
            Start Free Trial
          </Link>
        </div>
      </div>
    </div>
  )
}
