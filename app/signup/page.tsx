"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, ShieldAlert } from "lucide-react"

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-10 w-10 text-primary" />
            <span className="text-2xl font-bold text-foreground">RealEstate ERP</span>
          </div>
        </div>

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-4 rounded-full bg-destructive/10">
            <ShieldAlert className="h-12 w-12 text-destructive" />
          </div>
          
          <h2 className="text-xl font-semibold text-foreground">Registration Restricted</h2>
          
          <p className="text-muted-foreground">
            You are not able to create or register a new account without permission from the administrator.
          </p>
          
          <p className="text-sm text-muted-foreground">
            Please contact your system administrator to request access to the platform.
          </p>

          <div className="pt-4 w-full">
            <Link href="/login">
              <Button variant="outline" className="w-full">
                Back to Login
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}
