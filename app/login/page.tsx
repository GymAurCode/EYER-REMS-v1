"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, Lock, Loader2, AlertCircle, Video, MessageSquare, Code, ArrowRight, ShieldCheck } from "lucide-react"
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
    <div className="min-h-screen flex bg-white">
      {/* Left Panel - Info Section */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-neutral-50 border-r border-neutral-200">
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo and Header */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-xl">A</span>
              </div>
              <span className="text-2xl font-bold tracking-tight text-neutral-900">EYERCALL</span>
            </div>
            <p className="text-lg text-neutral-600 mb-12 max-w-md">
              Enterprise-grade solution for secure communication and digital innovation management.
            </p>
          </div>

          {/* Features Section */}
          <div className="space-y-8 mb-12">
            {/* Secure Video Meetings */}
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-lg bg-white border border-neutral-200 flex items-center justify-center shrink-0 shadow-sm">
                <Video className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1 text-neutral-900">Secure Video Meetings</h3>
                <p className="text-neutral-600 text-sm leading-relaxed max-w-sm">
                  Seamless and secure video meetings for business conferences and discussions.
                </p>
              </div>
            </div>

            {/* Messaging & Courses */}
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-lg bg-white border border-neutral-200 flex items-center justify-center shrink-0 shadow-sm">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1 text-neutral-900">Messaging & Collaboration</h3>
                <p className="text-neutral-600 text-sm leading-relaxed max-w-sm">
                  Built-in messaging for teams to collaborate efficiently.
                </p>
              </div>
            </div>

            {/* Custom Website & More */}
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-lg bg-white border border-neutral-200 flex items-center justify-center shrink-0 shadow-sm">
                <Code className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1 text-neutral-900">Digital Solutions</h3>
                <p className="text-neutral-600 text-sm leading-relaxed max-w-sm">
                  Powerful, customized digital solutions to help businesses grow and scale.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div>
            <div className="flex items-center gap-2 text-primary font-medium mb-8 cursor-pointer hover:underline">
              Explore our ecosystem <ArrowRight className="w-4 h-4" />
            </div>
            <div className="text-sm text-neutral-500 flex justify-between items-center pr-8">
              <div>© 2024 EYERCALL INC.</div>
              <div className="flex gap-6">
                <Link href="#" className="hover:text-neutral-900 transition-colors">Privacy Policy</Link>
                <Link href="#" className="hover:text-neutral-900 transition-colors">Terms</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm space-y-8">
          {/* Secure Access Portal Badge */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-neutral-200 bg-neutral-50">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-neutral-700 tracking-wider">SECURE ACCESS PORTAL</span>
            </div>
          </div>

          {/* Welcome Message */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-primary tracking-tight">Welcome Back</h1>
            <p className="text-neutral-600">Enter your credentials to access the dashboard.</p>
          </div>

          {error && (
            <Alert variant="destructive" className="bg-red-50 border-red-100 text-red-900">
              <AlertCircle className="h-4 w-4 text-red-700" />
              <AlertTitle className="text-red-900 font-semibold">Authentication Error</AlertTitle>
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-neutral-900 font-medium">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="user@eyercall.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 bg-white border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-primary focus:ring-primary rounded-md"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-neutral-900 font-medium">Password</Label>
                <Link
                  href="/reset-password"
                  className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 bg-white border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-primary focus:ring-primary rounded-md"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-medium text-base shadow-none rounded-md"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="pt-4 text-center text-sm">
            <span className="text-neutral-500">Don't have an account? </span>
            <Link href="/signup" className="text-primary hover:underline font-medium">
              Request Access
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
