"use client"

import dynamic from "next/dynamic"

const ReminderDashboard = dynamic(
  () => import("@/frontend/src/modules/notifications/pages/ReminderDashboard").then((m) => m.default),
  { ssr: false },
)

export default function Dashboard() {
  return <ReminderDashboard />
}

