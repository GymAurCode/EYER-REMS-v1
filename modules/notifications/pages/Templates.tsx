"use client"

import dynamic from "next/dynamic"

const Templates = dynamic(
  () => import("@/frontend/src/modules/notifications/pages/TemplateManagement").then((m) => m.default),
  { ssr: false },
)

export default function TemplatesTab() {
  return <Templates />
}

