"use client"

import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/lib/theme-provider"
import { AuthProvider } from "@/lib/auth-context"
import { Toaster } from "@/components/ui/toaster"
import { useEffect } from "react"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Track user activity (mouse movements, clicks, keyboard input) to update lastActivity
    const updateActivity = () => {
      if (typeof window !== "undefined") {
        const token = sessionStorage.getItem("token")
        if (token) {
          sessionStorage.setItem("lastActivity", Date.now().toString())
        }
      }
    }

    // Listen to various user activity events
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"]
    
    events.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true })
    })

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, updateActivity)
      })
    }
  }, [])

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Real Estate ERP - Property Management System</title>
        <meta name="description" content="Comprehensive enterprise resource planning for real estate management" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider defaultTheme="light" defaultAccent="blue">
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
