"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, ArrowLeft, Loader2, Video, MessageSquare, Code, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react"

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
    <div className="min-h-screen flex bg-white">
      {/* Left Panel - Info Section (Identical to Login) */}
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

      {/* Right Panel - Content */}
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
            <h1 className="text-3xl font-bold text-primary tracking-tight">Reset Password</h1>
            <p className="text-neutral-600">We'll help you recover your account.</p>
          </div>

          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-6">
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
                <p className="text-sm text-neutral-500 mt-2">We'll send you a link to reset your password</p>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-medium text-base shadow-none rounded-md"
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
                className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-medium text-base shadow-none rounded-md"
              >
                <Link href="/login">Return to Login</Link>
              </Button>
            </div>
          )}

          <div className="pt-4 text-center">
            <Link 
              href="/login" 
              className="inline-flex items-center justify-center gap-2 text-sm text-primary hover:underline font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
