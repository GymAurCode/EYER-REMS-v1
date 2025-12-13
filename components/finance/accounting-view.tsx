"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, FileText, Trash2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EnhancedLedgers } from "./enhanced-ledgers"
import { AddAccountDialog } from "./add-account-dialog"
import { AddVoucherDialog } from "./add-voucher-dialog"
import { AddGeneralVoucherDialog } from "./add-general-voucher-dialog"
import { apiService } from "@/lib/api"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function AccountingView() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false)
  const [showAddVoucherDialog, setShowAddVoucherDialog] = useState(false)
  const [showAddGeneralVoucherDialog, setShowAddGeneralVoucherDialog] = useState(false)
  const [voucherType, setVoucherType] = useState<"bank-payment" | "bank-receipt" | "cash-payment" | "cash-receipt">(
    "bank-payment",
  )
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [vouchers, setVouchers] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [txRes, payRes, vouRes, accRes] = await Promise.all([
        apiService.transactions.getAll(),
        apiService.payments.getAll(),
        apiService.vouchers.getAll(),
        apiService.accounts.getAll(),
      ])
      // Handle API response structure: could be { data: [...] } or { data: { data: [...] } }
      const txData = txRes.data as any
      const transactionsData = Array.isArray(txData?.data) ? txData.data : Array.isArray(txData) ? txData : []
      setTransactions(transactionsData)
      
      const payData = payRes.data as any
      const paymentsData = Array.isArray(payData?.data) ? payData.data : Array.isArray(payData) ? payData : []
      setPayments(paymentsData)
      
      const vouData = vouRes.data as any
      const vouchersData = Array.isArray(vouData?.data) ? vouData.data : Array.isArray(vouData) ? vouData : []
      setVouchers(vouchersData)
      
      // Accounts endpoint returns array of accounts
      const accData = accRes.data as any
      const accountsData = Array.isArray(accData?.data) ? accData.data : Array.isArray(accData) ? accData : []
      setAccounts(accountsData)
    } catch {
      setTransactions([])
      setPayments([])
      setVouchers([])
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }

  const chartOfAccounts = useMemo(() => {
    // Accounts now include balance calculated from ledger entries
    const list = Array.isArray(accounts) ? accounts : []
    return list
      .filter((a) =>
        [a.code, a.name, a.type].join(" ").toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .map((a) => ({
        code: a.code,
        name: a.name,
        type: a.type,
        balance: typeof a.balance === 'number' 
          ? `Rs ${a.balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : "Rs 0.00",
      }))
  }, [accounts, searchQuery])

  const bankPaymentVouchers = useMemo(() => {
    return transactions
      .filter((t) => t.type === "expense")
      .map((t) => ({
        id: t.id,
        date: new Date(t.date).toISOString().split("T")[0],
        payee: t.property || "Expense",
        amount: `Rs ${Number(t.amount || 0).toLocaleString("en-IN")}`,
        description: t.description,
        status: t.status || "paid",
      }))
  }, [transactions])

  const bankReceiptVouchers = useMemo(() => {
    return vouchers
      .filter((v) => v.type === "bank_receipt" || (v.type === "receipt" && v.paymentMethod === "Bank"))
      .map((v) => ({
        id: v.id,
        voucherId: v.id,
        voucherNumber: v.voucherNumber || v.id,
        date: new Date(v.date || v.createdAt).toISOString().split("T")[0],
        from: v.description || v.account?.name || "Customer",
        amount: `Rs ${Number(v.amount || 0).toLocaleString("en-IN")}`,
        description: v.description || "Bank receipt",
        status: v.status || "posted",
      }))
  }, [vouchers])

  const cashPaymentVouchers = bankPaymentVouchers
  const cashReceiptVouchers = bankReceiptVouchers

  const journalVouchers: any[] = []

  return (
    <div className="space-y-6">
      <Tabs defaultValue="chart-of-accounts" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex min-w-full sm:min-w-0 grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 w-full sm:w-auto">
            <TabsTrigger value="chart-of-accounts" className="text-xs sm:text-sm whitespace-nowrap">Chart of Accounts</TabsTrigger>
            <TabsTrigger value="bank-payment" className="text-xs sm:text-sm whitespace-nowrap">Bank Payment</TabsTrigger>
            <TabsTrigger value="bank-receipt" className="text-xs sm:text-sm whitespace-nowrap">Bank Receipt</TabsTrigger>
            <TabsTrigger value="cash-payment" className="text-xs sm:text-sm whitespace-nowrap">Cash Payment</TabsTrigger>
            <TabsTrigger value="cash-receipt" className="text-xs sm:text-sm whitespace-nowrap">Cash Receipt</TabsTrigger>
            <TabsTrigger value="journal" className="text-xs sm:text-sm whitespace-nowrap">Journal</TabsTrigger>
            <TabsTrigger value="ledgers" className="text-xs sm:text-sm whitespace-nowrap">Ledgers</TabsTrigger>
          </TabsList>
        </div>

        {/* Chart of Accounts */}
        <TabsContent value="chart-of-accounts" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search accounts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => setShowAddAccountDialog(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="px-6 py-12 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : chartOfAccounts.map((account) => (
                  <TableRow key={account.code}>
                    <TableCell className="font-medium">{account.code}</TableCell>
                    <TableCell>{account.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{account.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{account.balance}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Bank Payment Vouchers */}
        <TabsContent value="bank-payment" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-between">
            <h3 className="text-lg font-semibold">Bank Payment Vouchers</h3>
            <Button
              onClick={() => {
                setVoucherType("bank-payment")
                setShowAddVoucherDialog(true)
              }}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Voucher
            </Button>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Voucher No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Payee</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="px-6 py-12 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : bankPaymentVouchers.map((voucher) => (
                  <TableRow key={voucher.id}>
                    <TableCell className="font-medium">{voucher.id}</TableCell>
                    <TableCell>{voucher.date}</TableCell>
                    <TableCell>{voucher.payee}</TableCell>
                    <TableCell>{voucher.description}</TableCell>
                    <TableCell className="text-right font-semibold">{voucher.amount}</TableCell>
                    <TableCell>
                      <Badge>{voucher.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Bank Receipt Vouchers */}
        <TabsContent value="bank-receipt" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-between">
            <h3 className="text-lg font-semibold">Bank Receipt Vouchers</h3>
            <Button
              onClick={() => {
                setVoucherType("bank-receipt")
                setShowAddVoucherDialog(true)
              }}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Voucher
            </Button>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Voucher No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="px-6 py-12 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : bankReceiptVouchers.map((voucher) => (
                  <TableRow key={voucher.id}>
                    <TableCell className="font-medium">{voucher.voucherNumber || voucher.id}</TableCell>
                    <TableCell>{voucher.date}</TableCell>
                    <TableCell>{voucher.from}</TableCell>
                    <TableCell>{voucher.description}</TableCell>
                    <TableCell className="text-right font-semibold">{voucher.amount}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{voucher.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" title="View Details">
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="Delete"
                          onClick={async () => {
                            if (window.confirm("Are you sure you want to delete this voucher?")) {
                              try {
                                await apiService.vouchers.delete(voucher.voucherId || voucher.id)
                                toast({
                                  title: "Success",
                                  description: "Voucher deleted successfully",
                                })
                                await fetchData()
                              } catch (error: any) {
                                toast({
                                  title: "Error",
                                  description: error?.response?.data?.error || error?.message || "Failed to delete voucher",
                                  variant: "destructive",
                                })
                              }
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Cash Payment Vouchers */}
        <TabsContent value="cash-payment" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-between">
            <h3 className="text-lg font-semibold">Cash Payment Vouchers</h3>
            <Button
              onClick={() => {
                setVoucherType("cash-payment")
                setShowAddVoucherDialog(true)
              }}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Voucher
            </Button>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Voucher No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Payee</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="px-6 py-12 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : cashPaymentVouchers.map((voucher) => (
                  <TableRow key={voucher.id}>
                    <TableCell className="font-medium">{voucher.id}</TableCell>
                    <TableCell>{voucher.date}</TableCell>
                    <TableCell>{voucher.payee}</TableCell>
                    <TableCell>{voucher.description}</TableCell>
                    <TableCell className="text-right font-semibold">{voucher.amount}</TableCell>
                    <TableCell>
                      <Badge>{voucher.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Cash Receipt Vouchers */}
        <TabsContent value="cash-receipt" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-between">
            <h3 className="text-lg font-semibold">Cash Receipt Vouchers</h3>
            <Button
              onClick={() => {
                setVoucherType("cash-receipt")
                setShowAddVoucherDialog(true)
              }}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Voucher
            </Button>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Voucher No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="px-6 py-12 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : cashReceiptVouchers.map((voucher) => (
                  <TableRow key={voucher.id}>
                    <TableCell className="font-medium">{voucher.id}</TableCell>
                    <TableCell>{voucher.date}</TableCell>
                    <TableCell>{voucher.from}</TableCell>
                    <TableCell>{voucher.description}</TableCell>
                    <TableCell className="text-right font-semibold">{voucher.amount}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{voucher.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Journal Vouchers */}
        <TabsContent value="journal" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-between">
            <h3 className="text-lg font-semibold">Journal Vouchers</h3>
            <Button onClick={() => setShowAddGeneralVoucherDialog(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              New Journal Entry
            </Button>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Voucher No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="px-6 py-12 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : journalVouchers.map((voucher) => (
                  <TableRow key={voucher.id}>
                    <TableCell className="font-medium">{voucher.id}</TableCell>
                    <TableCell>{voucher.date}</TableCell>
                    <TableCell>{voucher.description}</TableCell>
                    <TableCell className="text-right font-semibold">{voucher.debit}</TableCell>
                    <TableCell className="text-right font-semibold">{voucher.credit}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{voucher.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Ledgers */}
        <TabsContent value="ledgers" className="space-y-4">
          <EnhancedLedgers />
        </TabsContent>
      </Tabs>

      {/* Add dialogs for accounting operations */}
      <AddAccountDialog open={showAddAccountDialog} onOpenChange={setShowAddAccountDialog} />
      <AddVoucherDialog open={showAddVoucherDialog} onOpenChange={(open) => {
        setShowAddVoucherDialog(open)
        if (!open) fetchData()
      }} voucherType={voucherType} onSuccess={fetchData} />
      <AddGeneralVoucherDialog open={showAddGeneralVoucherDialog} onOpenChange={setShowAddGeneralVoucherDialog} />
    </div>
  )
}
