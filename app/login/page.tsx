"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, Lock, Loader2, AlertCircle, Eye, EyeOff, Video, MessageSquare, Code, Grid, ArrowRight } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { AuthToasts } from "@/lib/toast-utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function LoginPage() {
  const router = useRouter()
  const { user, loading: authLoading, login } = useAuth()
  const [email, setEmail] = useState("user@eyercall.com")
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
    <div className="min-h-screen flex bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950">
      {/* Left Panel - EYERCALL Details */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background with grid pattern */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(rgba(168, 85, 247, 0.2) 1px, transparent 1px),
              linear-gradient(90deg, rgba(168, 85, 247, 0.2) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
        {/* Blurred background image effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 via-purple-800/30 to-indigo-900/40 backdrop-blur-sm" />
        
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          {/* Logo and Header */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/30">
                <span className="text-white font-bold text-xl">A</span>
              </div>
              <span className="text-2xl font-bold tracking-tight">EYERCALL</span>
            </div>
            <p className="text-lg text-purple-200 mb-12">
              Connecting the world through secure communication and digital innovation.
            </p>
          </div>

          {/* Features Section */}
          <div className="space-y-8 mb-12">
            {/* Secure Video Meetings */}
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/30 border border-purple-400/40 flex items-center justify-center shrink-0">
                <Video className="w-6 h-6 text-purple-300" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2 text-purple-100">Secure Video Meetings</h3>
                <p className="text-purple-300/80 text-sm leading-relaxed">
                  Seamless and secure video meetings for various purposes—online classes, business conferences, personal discussions. A reliable, user-friendly platform for crystal-clear communication.
                </p>
              </div>
            </div>

            {/* Messaging & Courses */}
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/30 border border-purple-400/40 flex items-center justify-center shrink-0">
                <MessageSquare className="w-6 h-6 text-purple-300" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2 text-purple-100">Messaging & Courses</h3>
                <p className="text-purple-300/80 text-sm leading-relaxed">
                  Built-in messaging for students and teachers, and exploring academic and professional courses.
                </p>
              </div>
            </div>

            {/* Custom Website & More */}
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/30 border border-purple-400/40 flex items-center justify-center shrink-0">
                <Code className="w-6 h-6 text-purple-300" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2 text-purple-100">Custom Website & More</h3>
                <p className="text-purple-300/80 text-sm leading-relaxed">
                  Powerful, customized digital solutions, from modern websites to advanced software development, to help businesses grow and scale.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div>
            <Link 
              href="#" 
              className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors mb-8 font-medium"
            >
              Explore our ecosystem <ArrowRight className="w-4 h-4" />
            </Link>
            <div className="text-sm text-purple-300/70">
              <div className="mb-2">© 2024 EYERCALL INC.</div>
              <div className="flex gap-4">
                <Link href="#" className="hover:text-purple-200 transition-colors">PRIVACY POLICY</Link>
                <span>•</span>
                <Link href="#" className="hover:text-purple-200 transition-colors">TERMS</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center p-8 relative overflow-hidden">
        {/* Background with grid pattern */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(168, 85, 247, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(168, 85, 247, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
        {/* Blurred background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-indigo-950/50 to-purple-900 backdrop-blur-sm" />

        <div className="relative z-10 w-full max-w-md">
          {/* Secure Access Portal Badge */}
          <div className="flex items-center gap-2 mb-6">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-purple-400/40 bg-purple-500/20 backdrop-blur-sm">
              <Grid className="w-4 h-4 text-purple-300" />
              <Lock className="w-4 h-4 text-purple-300" />
              <span className="text-xs font-semibold text-purple-200 tracking-wider">SECURE ACCESS PORTAL</span>
            </div>
          </div>

          {/* Welcome Message */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-purple-200">Access your digital dashboard.</p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6 bg-red-950/50 border-red-800">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-purple-200 font-medium">EMAIL</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-purple-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="user@eyercall.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-purple-950/50 border-purple-800/50 text-white placeholder:text-purple-400/60 focus:border-purple-500 focus:ring-purple-500/30"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-purple-200 font-medium">PASSWORD</Label>
                <Link 
                  href="/reset-password" 
                  className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-purple-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 bg-purple-950/50 border-purple-800/50 text-white placeholder:text-purple-400/60 focus:border-purple-500 focus:ring-purple-500/30"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 hover:from-purple-700 hover:via-purple-800 hover:to-indigo-800 text-white font-medium text-base shadow-lg shadow-purple-500/30"
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
          <div className="mt-8 text-center text-purple-200">
            New to Eyercall?{" "}
            <Link href="/signup" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
              Start Free Trial
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
