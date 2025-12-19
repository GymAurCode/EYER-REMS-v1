"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, ArrowLeft, Loader2, Grid, Lock, CheckCircle2, ArrowRight } from "lucide-react"

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // Mock password reset - in production, this would call an API
    setTimeout(() => {
      setSent(true)
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 relative overflow-hidden bg-gradient-to-br from-purple-950 via-black to-indigo-950">
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
      <div className="absolute inset-0 bg-gradient-to-br from-purple-950/80 via-black/60 to-indigo-950/80 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-md">
        {/* Secure Access Portal Badge */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-purple-400/40 bg-purple-500/20 backdrop-blur-sm">
            <Grid className="w-4 h-4 text-purple-300" />
            <Lock className="w-4 h-4 text-purple-300" />
            <span className="text-xs font-semibold text-purple-200 tracking-wider">SECURE ACCESS PORTAL</span>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-purple-200">We'll help you recover your account.</p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-purple-200 font-medium">EMAIL</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-purple-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@realestate.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-purple-950/50 border-purple-800/50 text-white placeholder:text-purple-400/60 focus:border-purple-500 focus:ring-purple-500/30"
                  required
                  disabled={loading}
                />
              </div>
              <p className="text-sm text-purple-300/80 mt-2">We'll send you a link to reset your password</p>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 hover:from-purple-700 hover:via-purple-800 hover:to-indigo-800 text-white font-medium text-base shadow-lg shadow-purple-500/30"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  Send Reset Link <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="p-6 bg-green-900/30 border border-green-500/40 rounded-lg backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-green-200 font-medium mb-1">Email Sent Successfully</p>
                  <p className="text-sm text-green-300/80">
                    Password reset link has been sent to your email. Please check your inbox.
                  </p>
                </div>
              </div>
            </div>
            <Button 
              asChild 
              className="w-full h-12 bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 hover:from-purple-700 hover:via-purple-800 hover:to-indigo-800 text-white font-medium text-base shadow-lg shadow-purple-500/30"
            >
              <Link href="/login">Return to Login</Link>
            </Button>
          </div>
        )}

        <div className="mt-8">
          <Link 
            href="/login" 
            className="flex items-center justify-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
