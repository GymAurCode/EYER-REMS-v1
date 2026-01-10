"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ShieldAlert, Video, MessageSquare, Code, ArrowRight } from "lucide-react"

export default function SignupPage() {
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
        <div className="w-full max-w-md text-center space-y-8">
          
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-red-50 border border-red-100">
              <ShieldAlert className="h-12 w-12 text-red-600" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-neutral-900 tracking-tight">Registration Restricted</h2>
            <p className="text-neutral-600 max-w-sm mx-auto">
              You cannot create a new account without permission from the administrator.
            </p>
          </div>
          
          <p className="text-sm text-neutral-500">
            Please contact your system administrator to request access to the platform.
          </p>

          <div className="pt-4 w-full">
            <Link href="/login">
              <Button variant="outline" className="w-full h-11 border-neutral-200 text-neutral-900 hover:bg-neutral-50 hover:text-neutral-900 shadow-sm">
                Back to Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
