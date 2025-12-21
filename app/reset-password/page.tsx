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
    <div className="min-h-screen flex items-center justify-center p-8 bg-white">
      <div className="w-full max-w-md">
        {/* Secure Access Portal Badge */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-purple-500/30 bg-purple-50">
            <Grid className="w-4 h-4 text-purple-600" />
            <Lock className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-semibold text-purple-700 tracking-wider">SECURE ACCESS PORTAL</span>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-purple-900 mb-2">Reset Password</h1>
          <p className="text-purple-600">We'll help you recover your account.</p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-purple-700 font-medium">EMAIL</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-purple-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@realestate.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-white border-purple-200 text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500"
                  required
                  disabled={loading}
                />
              </div>
              <p className="text-sm text-purple-600 mt-2">We'll send you a link to reset your password</p>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-medium text-base shadow-md shadow-purple-500/20"
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
            <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-green-800 font-medium mb-1">Email Sent Successfully</p>
                  <p className="text-sm text-green-700">
                    Password reset link has been sent to your email. Please check your inbox.
                  </p>
                </div>
              </div>
            </div>
            <Button 
              asChild 
              className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-medium text-base shadow-md shadow-purple-500/20"
            >
              <Link href="/login">Return to Login</Link>
            </Button>
          </div>
        )}

        <div className="mt-8">
          <Link 
            href="/login" 
            className="flex items-center justify-center gap-2 text-sm text-purple-600 hover:text-purple-700 transition-colors font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
