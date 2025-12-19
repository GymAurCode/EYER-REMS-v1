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
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-900">
      {/* Left Panel - EYERCALL Details */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background with grid pattern */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
        {/* Blurred background image effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-purple-900/20 to-slate-900/40 backdrop-blur-sm" />
        
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          {/* Logo and Header */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">A</span>
              </div>
              <span className="text-2xl font-bold tracking-tight">EYERCALL</span>
            </div>
            <p className="text-lg text-slate-300 mb-12">
              Connecting the world through secure communication and digital innovation.
            </p>
          </div>

          {/* Features Section */}
          <div className="space-y-8 mb-12">
            {/* Secure Video Meetings */}
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                <Video className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Secure Video Meetings</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Seamless and secure video meetings for various purposes—online classes, business conferences, personal discussions. A reliable, user-friendly platform for crystal-clear communication.
                </p>
              </div>
            </div>

            {/* Messaging & Courses */}
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                <MessageSquare className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Messaging & Courses</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Built-in messaging for students and teachers, and exploring academic and professional courses.
                </p>
              </div>
            </div>

            {/* Custom Website & More */}
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                <Code className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Custom Website & More</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
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
            <div className="text-sm text-slate-500">
              <div className="mb-2">© 2024 EYERCALL INC.</div>
              <div className="flex gap-4">
                <Link href="#" className="hover:text-slate-400 transition-colors">PRIVACY POLICY</Link>
                <span>•</span>
                <Link href="#" className="hover:text-slate-400 transition-colors">TERMS</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center p-8 relative overflow-hidden">
        {/* Background with grid pattern */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(139, 92, 246, 0.2) 1px, transparent 1px),
              linear-gradient(90deg, rgba(139, 92, 246, 0.2) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
        {/* Blurred background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950/30 to-slate-900 backdrop-blur-sm" />

        <div className="relative z-10 w-full max-w-md">
          {/* Secure Access Portal Badge */}
          <div className="flex items-center gap-2 mb-6">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-purple-500/30 bg-purple-500/10">
              <Grid className="w-4 h-4 text-purple-400" />
              <Lock className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold text-purple-300 tracking-wider">SECURE ACCESS PORTAL</span>
            </div>
          </div>

          {/* Welcome Message */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-slate-400">Access your digital dashboard.</p>
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
              <Label htmlFor="email" className="text-slate-300 font-medium">EMAIL</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="user@eyercall.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-300 font-medium">PASSWORD</Label>
                <Link 
                  href="/reset-password" 
                  className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium text-base shadow-lg shadow-purple-500/20"
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

          {/* Social Login Options */}
          <div className="mt-6 space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 bg-white/5 border-slate-700 text-white hover:bg-white/10"
              disabled={loading}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 bg-white/5 border-slate-700 text-white hover:bg-white/10"
              disabled={loading}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Apple
            </Button>
          </div>

          {/* New User Prompt */}
          <div className="mt-8 text-center text-slate-400">
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
