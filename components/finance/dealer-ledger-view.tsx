"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DollarSign, Calendar, Loader2, Plus, RefreshCw } from "lucide-react"
import { apiService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

interface DealerLedgerViewProps {
  dealerId: string
  dealerName?: string
}

export function DealerLedgerView({ dealerId, dealerName }: DealerLedgerViewProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [ledger, setLedger] = useState<any>(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [filter, setFilter] = useState<'all' | 'thisMonth'>('all')
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMode: "bank",
    description: "",
  })

  useEffect(() => {
    if (dealerId) {
      fetchLedger()
    }
  }, [dealerId, filter])

  const fetchLedger = async () => {
    try {
      setLoading(true)
      const response: any = await apiService.dealerLedger.getLedger(dealerId, { period: filter })
      const responseData = response?.data
      // Handle different response structures
      const ledgerData = responseData?.data || responseData || response?.data || null
      setLedger(ledgerData)
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.response?.data?.error || error?.message || "Failed to fetch dealer ledger"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      setLedger(null)
      console.error("Failed to fetch dealer ledger:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSubmit = async () => {
    try {
      if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid payment amount",
          variant: "destructive",
        })
        return
      }

      await apiService.dealerLedger.recordPayment(dealerId, {
        amount: parseFloat(paymentForm.amount),
        paymentMode: paymentForm.paymentMode,
        description: paymentForm.description,
      })

      toast({
        title: "Success",
        description: "Payment recorded successfully",
      })

      setShowPaymentForm(false)
      setPaymentForm({ amount: "", paymentMode: "bank", description: "" })
      fetchLedger()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to record payment",
        variant: "destructive",
      })
    }
  }

  const getEntryTypeBadge = (type: string) => {
    switch (type) {
      case "commission":
        return <Badge variant="default">Commission</Badge>
      case "payment":
        return <Badge variant="secondary">Payment</Badge>
      case "adjustment":
        return <Badge variant="outline">Adjustment</Badge>
      default:
        return <Badge>{type}</Badge>
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Dealer Ledger {dealerName && `- ${dealerName}`}</h3>
          <div className="flex gap-2">
            <Select value={filter} onValueChange={(val: 'all' | 'thisMonth') => setFilter(val)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchLedger} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={() => setShowPaymentForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          </div>
        </div>

        {ledger?.summary && (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Commission</p>
              <p className="text-2xl font-bold">
                Rs {ledger.summary.totalCommission.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Payments</p>
              <p className="text-2xl font-bold">
                Rs {ledger.summary.totalPayments.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Outstanding Balance</p>
              <p className="text-2xl font-bold text-primary">
                Rs {ledger.summary.outstandingBalance.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Payment Form */}
      {showPaymentForm && (
        <Card className="p-6">
          <h4 className="font-semibold mb-4">Record Payment</h4>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                placeholder="Enter payment amount"
              />
            </div>
            <div>
              <Label htmlFor="paymentMode">Payment Mode</Label>
              <Select
                value={paymentForm.paymentMode}
                onValueChange={(value) => setPaymentForm({ ...paymentForm, paymentMode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={paymentForm.description}
                onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                placeholder="Payment description (optional)"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handlePaymentSubmit}>Record Payment</Button>
              <Button variant="outline" onClick={() => setShowPaymentForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Ledger Entries */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4">Ledger Entries</h4>
        {ledger?.entries && ledger.entries.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Deal</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.entries.map((entry: any) => (
                <TableRow key={entry.id}>
                  <TableCell>{format(new Date(entry.date), "PPP")}</TableCell>
                  <TableCell>{getEntryTypeBadge(entry.entryType)}</TableCell>
                  <TableCell>{entry.description || "—"}</TableCell>
                  <TableCell>{entry.deal?.title || entry.dealId || "—"}</TableCell>
                  <TableCell className="text-right font-medium">
                    {entry.entryType === "payment" ? "-" : "+"}Rs{" "}
                    {entry.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    Rs {entry.balance.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-center text-muted-foreground py-8">No ledger entries found</p>
        )}
      </Card>
    </div>
  )
}

