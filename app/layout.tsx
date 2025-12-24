"use client"

import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/lib/theme-provider"
import { AuthProvider } from "@/lib/auth-context"
import { Toaster } from "@/components/ui/toaster"
import { useEffect } from "react"
import { SWRConfig } from "swr"

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
        <script src="/clear-cache.js" defer></script>
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <SWRConfig
          value={{
            revalidateOnFocus: false, // Disable revalidation on window focus to prevent rate limiting
            revalidateOnReconnect: true, // Still revalidate when network reconnects
            dedupingInterval: 60000, // Dedupe requests within 60 seconds
            focusThrottleInterval: 60000, // Throttle focus revalidation to 60 seconds
            errorRetryCount: 2, // Retry failed requests up to 2 times
            errorRetryInterval: 2000, // Wait 2 seconds between retries
            onError: (error) => {
              // Don't log 429 errors to reduce console noise
              if (error?.response?.status !== 429) {
                console.error('SWR Error:', error)
              }
            },
          }}
        >
          <ThemeProvider defaultTheme="light" defaultAccent="blue">
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </ThemeProvider>
        </SWRConfig>
      </body>
    </html>
  )
}
