"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Mail,
  Lock,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Video,
  Camera,
  ScanEye,
  Shield,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { AuthToasts } from "@/lib/toast-utils"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmail(s: string): boolean {
  return s.length > 0 && EMAIL_RE.test(s)
}

export default function LoginPage() {
  const router = useRouter()
  const { user, loading: authLoading, login } = useAuth()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(
    () => isValidEmail(email) && password.trim().length > 0 && !loading,
    [email, password, loading],
  )

  useEffect(() => {
    if (!authLoading && user && user.role?.toLowerCase() !== "admin") {
      router.push("/roles/login")
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    try {
      await login(email, password)
      AuthToasts.loginSuccess()
      router.push("/")
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { message?: string; error?: string; details?: { message?: string } } }
        message?: string
      }
      const errorMessage =
        e.response?.data?.message ||
        e.response?.data?.error ||
        e.response?.data?.details?.message ||
        e.message ||
        "Login failed"
      setError(errorMessage)
      AuthToasts.loginError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = (e: React.MouseEvent) => {
    e.preventDefault()
    toast({
      title: "Google sign-in",
      description: "Google sign-in is not configured. Please use email and password.",
      variant: "default",
    })
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Panel (wide) — EYERCALL branding & product information */}
      <div
        className={cn(
          "hidden lg:flex lg:w-[58%] relative overflow-hidden",
          "bg-gradient-to-br from-teal-700 via-teal-700 to-teal-800"
        )}
      >
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          <div>
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center border border-white/20">
                <span className="text-white font-bold text-xl">E</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-white">EYERCALL</span>
            </div>

            <h1 className="text-3xl xl:text-4xl font-bold text-white tracking-tight leading-tight mb-4 max-w-xl">
              EYERCALL — Verified Presence Communication
            </h1>
            <p className="text-lg text-white/90 max-w-xl leading-relaxed mb-14">
              Secure Video Meets & Proctored Exams with Presence Verification
            </p>
          </div>

          <div className="space-y-12">
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Camera className="w-5 h-5 text-white/80" aria-hidden />
                <h2 className="text-base font-semibold text-white">Presence Verified Meetings</h2>
              </div>
              <ul className="space-y-2.5 text-white/90 text-sm pl-0">
                <li className="flex items-start gap-3">
                  <Camera className="w-4 h-4 mt-0.5 shrink-0 text-white/70" aria-hidden />
                  <span>Confirmed visual presence in real time</span>
                </li>
                <li className="flex items-start gap-3">
                  <ScanEye className="w-4 h-4 mt-0.5 shrink-0 text-white/70" aria-hidden />
                  <span>Eye attention detection during sessions</span>
                </li>
                <li className="flex items-start gap-3">
                  <Shield className="w-4 h-4 mt-0.5 shrink-0 text-white/70" aria-hidden />
                  <span>Secure and monitored professional calls</span>
                </li>
              </ul>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <Video className="w-5 h-5 text-white/80" aria-hidden />
                <h2 className="text-base font-semibold text-white">Proctored Virtual Exams</h2>
              </div>
              <ul className="space-y-2.5 text-white/90 text-sm pl-0">
                <li className="flex items-start gap-3">
                  <ScanEye className="w-4 h-4 mt-0.5 shrink-0 text-white/70" aria-hidden />
                  <span>Online exam proctoring with eye monitoring</span>
                </li>
                <li className="flex items-start gap-3">
                  <Eye className="w-4 h-4 mt-0.5 shrink-0 text-white/70" aria-hidden />
                  <span>Flag and log suspicious behavior</span>
                </li>
                <li className="flex items-start gap-3">
                  <Shield className="w-4 h-4 mt-0.5 shrink-0 text-white/70" aria-hidden />
                  <span>Compliance-grade reporting</span>
                </li>
              </ul>
            </section>
          </div>

          <p className="text-sm text-white/80 max-w-xl leading-relaxed pt-6 border-t border-white/15 mt-6">
            Enterprise-grade security, compliance logging, and audit readiness for regulated
            industries.
          </p>
        </div>
      </div>

      {/* Right Panel (narrow) — Login form only */}
      <div className="flex-1 lg:w-[42%] flex items-center justify-center p-6 sm:p-10 bg-white overflow-y-auto">
        <div className="w-full max-w-[340px] space-y-8">
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Sign In to EYERCALL
          </h1>

          {error && (
            <Alert
              variant="destructive"
              className="bg-red-50 border-red-200 text-red-900"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 text-red-700" aria-hidden />
              <AlertTitle className="text-red-900 font-semibold">Authentication error</AlertTitle>
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-neutral-900 font-medium">
                Email
              </Label>
              <Input
                id="login-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError(null)
                }}
                className="h-11 bg-white border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-0 rounded-lg"
                required
                disabled={loading}
                aria-required
                aria-invalid={!!error}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password" className="text-neutral-900 font-medium">
                  Password
                </Label>
                <Link
                  href="/reset-password"
                  className="text-sm text-teal-700 hover:text-teal-800 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 rounded"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 pointer-events-none"
                  aria-hidden
                />
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError(null)
                  }}
                  className="pl-10 pr-10 h-11 bg-white border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-0 rounded-lg"
                  required
                  disabled={loading}
                  aria-required
                  aria-invalid={!!error}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-neutral-500 hover:text-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={0}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-teal-700 hover:bg-teal-800 text-white font-medium text-base rounded-lg shadow-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
              disabled={!canSubmit}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  Signing in...
                </>
              ) : (
                "Login"
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <span className="w-full border-t border-neutral-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wider">
                <span className="bg-white px-2 text-neutral-400">Or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-11 border-teal-600 text-teal-700 hover:bg-teal-50 hover:border-teal-700 rounded-lg focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              Login with Google
            </Button>
          </form>

          <p className="text-sm text-neutral-600">
            New to EYERCALL?{" "}
            <Link
              href="/signup"
              className="font-medium text-teal-700 hover:text-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 rounded"
            >
              Request Access
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
