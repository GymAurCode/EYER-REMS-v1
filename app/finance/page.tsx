import { DashboardLayout } from "@/components/dashboard-layout"
import { FinanceView } from "@/components/finance/finance-view"

export default function FinancePage() {
  return (
    <DashboardLayout>
      <FinanceView />
    </DashboardLayout>
  )
}
