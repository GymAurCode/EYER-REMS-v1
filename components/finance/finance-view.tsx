"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DollarSign, TrendingDown, Plus, Receipt, Percent, Loader2 } from "lucide-react"
import { apiService } from "@/lib/api"
import { TransactionsView } from "./transactions-view"
import { InvoicesView } from "./invoices-view"
import { PaymentsView } from "./payments-view"
import { FinancialReportsView } from "./financial-reports-view"
import { CommissionsView } from "./commissions-view"
import { AccountingView } from "./accounting-view"
import { ChartOfAccountsView } from "./chart-of-accounts-view"
import { OperationsView } from "./operations-view"
import { AccountLedgerModule } from "./account-ledger-module"
import { AddTransactionDialog } from "./add-transaction-dialog"
import { cn } from "@/lib/utils"

export function FinanceView() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [financialStats, setFinancialStats] = useState<any[]>([])
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [activeTab, setActiveTabState] = useState("transactions")
  const [hasInitializedTab, setHasInitializedTab] = useState(false)
  const tabStorageKey = "finance-active-tab"

  const updateActiveTab = useCallback(
    (value: string, { shouldPersistQuery = true }: { shouldPersistQuery?: boolean } = {}) => {
      if (value !== activeTab) {
        setActiveTabState(value)
      }

      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(tabStorageKey, value)
        } catch {
          // Ignore storage errors (private mode, etc.)
        }
      }

      if (shouldPersistQuery) {
        const params = new URLSearchParams(searchParams.toString())
        params.set("tab", value)
        const query = params.toString()
        router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false })
      }
    },
    [activeTab, pathname, router, searchParams, tabStorageKey],
  )

  useEffect(() => {
    const tabFromQuery = searchParams.get("tab")
    if (tabFromQuery && tabFromQuery !== activeTab) {
      updateActiveTab(tabFromQuery, { shouldPersistQuery: false })
      if (!hasInitializedTab) {
        setHasInitializedTab(true)
      }
      return
    }

    if (!hasInitializedTab) {
      let storedTab: string | null = null
      if (typeof window !== "undefined") {
        try {
          storedTab = sessionStorage.getItem(tabStorageKey)
        } catch {
          storedTab = null
        }
      }

      if (storedTab && storedTab !== activeTab) {
        updateActiveTab(storedTab)
      } else if (!tabFromQuery) {
        updateActiveTab(activeTab)
      }

      setHasInitializedTab(true)
    }
  }, [activeTab, hasInitializedTab, searchParams, updateActiveTab])

  const handleTabChange = useCallback(
    (value: string) => {
      updateActiveTab(value)
    },
    [updateActiveTab],
  )

  useEffect(() => {
    fetchFinanceStats()
  }, [])

  const formatCurrency = (amount: number | null | undefined) => {
    const numericValue = Number(amount || 0)
    return `Rs ${numericValue.toLocaleString("en-IN", {
      minimumFractionDigits: numericValue % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })}`
  }

  const formatPercentage = (value: number | null | undefined) => {
    if (value === null || value === undefined) {
      return "—"
    }
    const rounded = Number.isFinite(value) ? Number(value.toFixed(1)) : value
    if (!Number.isFinite(rounded)) {
      return "—"
    }
    const sign = rounded > 0 ? "+" : ""
    return `${sign}${rounded}%`
  }

  const getChangeType = (value: number | null | undefined, invert = false) => {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return "positive"
    }
    const effectiveValue = invert ? -value : value
    return effectiveValue >= 0 ? "positive" : "negative"
  }

  const fetchFinanceStats = async () => {
    try {
      setStatsLoading(true)
      setStatsError(null)
      const response: any = await apiService.stats.getFinanceStats()
      const data = response?.data?.data || response?.data || {}
      
      setFinancialStats([
        {
          name: "Total Revenue",
          value: formatCurrency(data.totalRevenue),
          change: formatPercentage(data.revenueChangePercent),
          changeType: getChangeType(data.revenueChangePercent),
          icon: DollarSign,
          href: "/details/revenue",
        },
        {
          name: "Outstanding Payments",
          value: formatCurrency(data.outstandingPayments),
          change: formatPercentage(data.paymentsChangePercent),
          changeType: getChangeType(data.paymentsChangePercent, true),
          icon: Receipt,
          href: "/details/outstanding-payments",
        },
        {
          name: "Monthly Expenses",
          value: formatCurrency(data.monthlyExpenses),
          change: formatPercentage(data.expensesChangePercent),
          changeType: getChangeType(data.expensesChangePercent, true),
          icon: TrendingDown,
          href: "/details/expenses",
        },
        {
          name: "Dealer Commissions",
          value: formatCurrency(data.dealerCommissions),
          change: formatPercentage(data.commissionsChangePercent),
          changeType: getChangeType(data.commissionsChangePercent),
          icon: Percent,
          href: "/details/commissions",
        },
      ])
    } catch (err: any) {
      // Don't log timeout errors to reduce console noise
      if (err.code !== 'ECONNABORTED' && !err.message?.includes('timeout')) {
        console.error("Failed to fetch finance stats:", err)
      }
      setFinancialStats([])
      setStatsError(null) // Don't show error message for timeouts, just show empty state
    } finally {
      setStatsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground text-balance">Financial Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Track revenue, expenses, invoices, payments, and commissions</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={() => setShowAddDialog(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">New Transaction</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </div>

      {/* Financial Stats */}
      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center justify-center h-24">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {statsError && (
            <Card className="border-destructive/40 bg-destructive/10 text-destructive">
              <div className="p-4 text-sm">{statsError}</div>
            </Card>
          )}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {financialStats.length === 0 ? (
              <Card className="p-6 text-sm text-muted-foreground">
                Unable to display summary metrics right now.
              </Card>
            ) : (
              financialStats.map((stat) => (
                <Card
                  key={stat.name}
                  className="p-6 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                  onClick={() => router.push(stat.href)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <stat.icon className="h-6 w-6 text-primary" />
                    </div>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        stat.changeType === "positive" ? "text-success" : "text-destructive",
                      )}
                    >
                      {stat.change}
                    </span>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex min-w-full sm:min-w-0">
            <TabsTrigger value="transactions" className="text-xs sm:text-sm">Transactions</TabsTrigger>
            <TabsTrigger value="invoices" className="text-xs sm:text-sm">Invoices</TabsTrigger>
            <TabsTrigger value="payments" className="text-xs sm:text-sm">Payments</TabsTrigger>
            <TabsTrigger value="commissions" className="text-xs sm:text-sm">Commissions</TabsTrigger>
            <TabsTrigger value="chart-of-accounts" className="text-xs sm:text-sm">Chart of Accounts</TabsTrigger>
            <TabsTrigger value="accounting" className="text-xs sm:text-sm">Accounting</TabsTrigger>
            <TabsTrigger value="operations" className="text-xs sm:text-sm">Operations</TabsTrigger>
            <TabsTrigger value="account-ledger" className="text-xs sm:text-sm">Account Ledger</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs sm:text-sm">Reports</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="transactions">
          <TransactionsView />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoicesView />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentsView />
        </TabsContent>

        <TabsContent value="commissions">
          <CommissionsView />
        </TabsContent>

        <TabsContent value="chart-of-accounts">
          <ChartOfAccountsView />
        </TabsContent>

        <TabsContent value="accounting">
          <AccountingView />
        </TabsContent>

        <TabsContent value="operations">
          <OperationsView highlightedRequestId={searchParams.get("requestId") || undefined} />
        </TabsContent>

        <TabsContent value="account-ledger">
          <AccountLedgerModule />
        </TabsContent>

        <TabsContent value="reports">
          <FinancialReportsView />
        </TabsContent>
      </Tabs>

      {/* Dialog */}
      <AddTransactionDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
    </div>
  )
}
