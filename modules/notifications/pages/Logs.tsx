"use client"

import dynamic from "next/dynamic"

const Logs = dynamic(
  () => import("@/frontend/src/modules/notifications/pages/NotificationLogs").then((m) => m.default),
  { ssr: false },
)

export default function LogsTab() {
  return <Logs />
}

