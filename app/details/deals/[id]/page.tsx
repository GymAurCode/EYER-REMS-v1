"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { DealDetailView } from "@/components/crm/deal-detail-view"

export default function DealDetailPage() {
  const params = useParams()
  const dealId = params.id as string

  return (
    <DashboardLayout>
      <DealDetailView dealId={dealId} />
    </DashboardLayout>
  )
}

