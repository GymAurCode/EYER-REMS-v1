import { DashboardLayout } from "@/components/dashboard-layout"
import { CRMView } from "@/components/crm/crm-view"
import { CRMErrorBoundary } from "@/components/crm/error-boundary"

export default function CRMPage() {
  return (
    <DashboardLayout>
      <CRMErrorBoundary>
        <CRMView />
      </CRMErrorBoundary>
    </DashboardLayout>
  )
}
