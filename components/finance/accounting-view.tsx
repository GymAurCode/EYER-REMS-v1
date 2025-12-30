"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Plus, FileText, Trash2, Loader2, Eye, Pencil, Download, MoreVertical } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EnhancedLedgers } from "./enhanced-ledgers"
import { AddVoucherDialog } from "./add-voucher-dialog"
import { AddGeneralVoucherDialog } from "./add-general-voucher-dialog"
import { EditVoucherDialog } from "./edit-voucher-dialog"
import { ViewVoucherDialog } from "./view-voucher-dialog"
import { apiService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function AccountingView() {
  const { toast } = useToast()
  const [showAddVoucherDialog, setShowAddVoucherDialog] = useState(false)
  const [showAddGeneralVoucherDialog, setShowAddGeneralVoucherDialog] = useState(false)
  const [voucherType, setVoucherType] = useState<"bank-payment" | "bank-receipt" | "cash-payment" | "cash-receipt">(
    "bank-payment",
  )
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [vouchers, setVouchers] = useState<any[]>([])
  const [viewingVoucherId, setViewingVoucherId] = useState<string | null>(null)
  const [editingVoucherId, setEditingVoucherId] = useState<string | null>(null)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [txRes, payRes, vouRes] = await Promise.all([
        apiService.transactions.getAll(),
        apiService.payments.getAll(),
        apiService.vouchers.getAll(),
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
    } catch {
      setTransactions([])
      setPayments([])
      setVouchers([])
    } finally {
      setLoading(false)
    }
  }


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
        amountRaw: v.amount || 0,
        description: v.description || "Bank receipt",
        status: v.status || "posted",
      }))
  }, [vouchers])

  const cashReceiptVouchers = useMemo(() => {
    return vouchers
      .filter((v) => v.type === "cash_receipt" || (v.type === "receipt" && v.paymentMethod === "Cash"))
      .map((v) => ({
        id: v.id,
        voucherId: v.id,
        voucherNumber: v.voucherNumber || v.id,
        date: new Date(v.date || v.createdAt).toISOString().split("T")[0],
        from: v.description || v.account?.name || "Customer",
        amount: `Rs ${Number(v.amount || 0).toLocaleString("en-IN")}`,
        amountRaw: v.amount || 0,
        description: v.description || "Cash receipt",
        status: v.status || "posted",
      }))
  }, [vouchers])

  const cashPaymentVouchers = useMemo(() => {
    return vouchers
      .filter((v) => v.type === "cash_payment" || (v.type === "payment" && v.paymentMethod === "Cash"))
      .map((v) => ({
        id: v.id,
        voucherId: v.id,
        voucherNumber: v.voucherNumber || v.id,
        date: new Date(v.date || v.createdAt).toISOString().split("T")[0],
        payee: v.description || v.account?.name || "Payee",
        amount: `Rs ${Number(v.amount || 0).toLocaleString("en-IN")}`,
        amountRaw: v.amount || 0,
        description: v.description || "Cash payment",
        status: v.status || "posted",
      }))
  }, [vouchers])

  const handleViewVoucher = (voucherId: string) => {
    setViewingVoucherId(voucherId)
    setShowViewDialog(true)
  }

  const handleEditVoucher = (voucherId: string) => {
    setEditingVoucherId(voucherId)
    setShowEditDialog(true)
  }

  const handleDownloadPDF = async (voucherId: string) => {
    try {
      const response = await apiService.vouchers.getPDF(voucherId)
      const blob = new Blob([response.data as BlobPart], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `voucher-${voucherId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast({ title: "PDF downloaded successfully" })
    } catch (error: any) {
      toast({
        title: "Failed to download PDF",
        description: error?.response?.data?.error || error?.message || "Unknown error",
        variant: "destructive",
      })
    }
  }

  const handleDeleteVoucher = async (voucherId: string) => {
    if (!window.confirm("Are you sure you want to delete this voucher?")) return
    
    try {
      await apiService.vouchers.delete(voucherId)
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

  const journalVouchers: any[] = []

  return (
    <div className="space-y-6">
      <Tabs defaultValue="bank-payment" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex min-w-full sm:min-w-0 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 w-full sm:w-auto">
            <TabsTrigger value="bank-payment" className="text-xs sm:text-sm whitespace-nowrap">Bank Payment</TabsTrigger>
            <TabsTrigger value="bank-receipt" className="text-xs sm:text-sm whitespace-nowrap">Bank Receipt</TabsTrigger>
            <TabsTrigger value="cash-payment" className="text-xs sm:text-sm whitespace-nowrap">Cash Payment</TabsTrigger>
            <TabsTrigger value="cash-receipt" className="text-xs sm:text-sm whitespace-nowrap">Cash Receipt</TabsTrigger>
            <TabsTrigger value="journal" className="text-xs sm:text-sm whitespace-nowrap">Journal</TabsTrigger>
            <TabsTrigger value="ledgers" className="text-xs sm:text-sm whitespace-nowrap">Ledgers</TabsTrigger>
          </TabsList>
        </div>

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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewVoucher(voucher.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditVoucher(voucher.id)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadPDF(voucher.id)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteVoucher(voucher.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                  <TableHead>Actions</TableHead>
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
                    <TableCell className="font-medium">{voucher.voucherNumber || voucher.id}</TableCell>
                    <TableCell>{voucher.date}</TableCell>
                    <TableCell>{voucher.payee}</TableCell>
                    <TableCell>{voucher.description}</TableCell>
                    <TableCell className="text-right font-semibold">{voucher.amount}</TableCell>
                    <TableCell>
                      <Badge>{voucher.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewVoucher(voucher.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditVoucher(voucher.id)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadPDF(voucher.id)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteVoucher(voucher.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                ) : cashReceiptVouchers.map((voucher) => (
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewVoucher(voucher.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditVoucher(voucher.id)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadPDF(voucher.id)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteVoucher(voucher.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
      <AddVoucherDialog open={showAddVoucherDialog} onOpenChange={(open) => {
        setShowAddVoucherDialog(open)
        if (!open) fetchData()
      }} voucherType={voucherType} onSuccess={fetchData} />
      <AddGeneralVoucherDialog open={showAddGeneralVoucherDialog} onOpenChange={setShowAddGeneralVoucherDialog} />
      
      {viewingVoucherId && (
        <ViewVoucherDialog
          open={showViewDialog}
          onOpenChange={(open) => {
            setShowViewDialog(open)
            if (!open) setViewingVoucherId(null)
          }}
          voucherId={viewingVoucherId}
          onEdit={() => {
            setShowViewDialog(false)
            setEditingVoucherId(viewingVoucherId)
            setShowEditDialog(true)
          }}
        />
      )}
      
      {editingVoucherId && (
        <EditVoucherDialog
          open={showEditDialog}
          onOpenChange={(open) => {
            setShowEditDialog(open)
            if (!open) {
              setEditingVoucherId(null)
            }
          }}
          voucherId={editingVoucherId}
          onSuccess={() => {
            fetchData()
            setEditingVoucherId(null)
            setShowEditDialog(false)
          }}
        />
      )}
    </div>
  )
}
