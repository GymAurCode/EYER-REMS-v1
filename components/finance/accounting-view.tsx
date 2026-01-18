"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Plus, FileText, Trash2, Loader2, Eye, Pencil, Download, MoreVertical, Send, CheckCircle, ArrowRight, RotateCcw } from "lucide-react"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type VoucherStatus = "draft" | "submitted" | "approved" | "posted" | "reversed"
type VoucherType = "BPV" | "BRV" | "CPV" | "CRV" | "JV"

export function AccountingView() {
  const { toast } = useToast()
  const [showAddVoucherDialog, setShowAddVoucherDialog] = useState(false)
  const [showAddGeneralVoucherDialog, setShowAddGeneralVoucherDialog] = useState(false)
  const [voucherType, setVoucherType] = useState<"bank-payment" | "bank-receipt" | "cash-payment" | "cash-receipt">(
    "bank-payment",
  )
  const [loading, setLoading] = useState(true)
  const [vouchers, setVouchers] = useState<any[]>([])
  const [viewingVoucherId, setViewingVoucherId] = useState<string | null>(null)
  const [editingVoucherId, setEditingVoucherId] = useState<string | null>(null)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [activeTab, setActiveTab] = useState("bank-payment")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await apiService.vouchers.getAll()
      const responseData = response.data as any
      const vouchersData = Array.isArray(responseData?.data) ? responseData.data : Array.isArray(responseData) ? responseData : []
      setVouchers(vouchersData)
    } catch (error: any) {
      console.error("Failed to fetch vouchers:", error)
      toast({
        title: "Error",
        description: error?.response?.data?.error || error?.message || "Failed to load vouchers",
        variant: "destructive",
      })
      setVouchers([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: VoucherStatus | string | undefined) => {
    if (!status) {
      return <Badge variant="outline">Unknown</Badge>
    }
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      draft: "outline",
      submitted: "secondary",
      approved: "default",
      posted: "default",
      reversed: "destructive",
    }
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      submitted: "bg-blue-100 text-blue-800",
      approved: "bg-green-100 text-green-800",
      posted: "bg-green-100 text-green-800",
      reversed: "bg-red-100 text-red-800",
    }
    return (
      <Badge variant={variants[status] || "outline"} className={colors[status] || "bg-gray-100 text-gray-800"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  // Helper to format date
  const formatVoucherDate = (date: string | Date | undefined, fallback?: Date) => {
    if (!date && !fallback) return "N/A"
    try {
      const dateObj = date ? new Date(date) : (fallback || new Date())
      return dateObj.toISOString().split("T")[0]
    } catch {
      return "N/A"
    }
  }

  // Helper to get payee name
  const getPayeeName = (voucher: any) => {
    if (voucher.payeeType && voucher.payeeId) {
      // Try to get actual payee name from related entity
      if (voucher.payeeType === "Tenant" && voucher.payee?.name) return voucher.payee.name
      if (voucher.payeeType === "Client" && voucher.payee?.name) return voucher.payee.name
      if (voucher.payeeType === "Employee" && voucher.payee?.name) return voucher.payee.name
      if (voucher.payeeType === "Dealer" && voucher.payee?.name) return voucher.payee.name
      return `${voucher.payeeType} (${voucher.payeeId.substring(0, 8)}...)`
    }
    return voucher.description || "N/A"
  }

  // Filter vouchers by type
  const bankPaymentVouchers = useMemo(() => {
    if (!Array.isArray(vouchers)) return []
    return vouchers
      .filter((v) => v && v.type === "BPV")
      .map((v) => ({
        ...v,
        id: v.id,
        voucherNumber: v.voucherNumber || v.id,
        date: formatVoucherDate(v.date, v.createdAt),
        payee: getPayeeName(v),
        amount: `Rs ${Number(v.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        amountRaw: v.amount || 0,
        description: v.description || "Bank payment",
        status: (v.status || "draft") as VoucherStatus,
        linesCount: v.lines?.length || 0,
      }))
  }, [vouchers])

  const bankReceiptVouchers = useMemo(() => {
    if (!Array.isArray(vouchers)) return []
    return vouchers
      .filter((v) => v && v.type === "BRV")
      .map((v) => ({
        ...v,
        id: v.id,
        voucherNumber: v.voucherNumber || v.id,
        date: formatVoucherDate(v.date, v.createdAt),
        from: v.description || v.account?.name || "Customer",
        amount: `Rs ${Number(v.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        amountRaw: v.amount || 0,
        description: v.description || "Bank receipt",
        status: (v.status || "draft") as VoucherStatus,
        linesCount: v.lines?.length || 0,
      }))
  }, [vouchers])

  const cashReceiptVouchers = useMemo(() => {
    return vouchers
      .filter((v) => v.type === "CRV")
      .map((v) => ({
        ...v,
        id: v.id,
        voucherNumber: v.voucherNumber || v.id,
        date: formatVoucherDate(v.date, v.createdAt),
        from: v.description || v.account?.name || "Customer",
        amount: `Rs ${Number(v.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        amountRaw: v.amount || 0,
        description: v.description || "Cash receipt",
        status: (v.status || "draft") as VoucherStatus,
        linesCount: v.lines?.length || 0,
      }))
  }, [vouchers])

  const cashPaymentVouchers = useMemo(() => {
    if (!Array.isArray(vouchers)) return []
    return vouchers
      .filter((v) => v && v.type === "CPV")
      .map((v) => ({
        ...v,
        id: v.id,
        voucherNumber: v.voucherNumber || v.id,
        date: formatVoucherDate(v.date, v.createdAt),
        payee: getPayeeName(v),
        amount: `Rs ${Number(v.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        amountRaw: v.amount || 0,
        description: v.description || "Cash payment",
        status: (v.status || "draft") as VoucherStatus,
        linesCount: v.lines?.length || 0,
      }))
  }, [vouchers])

  const journalVouchers = useMemo(() => {
    if (!Array.isArray(vouchers)) return []
    return vouchers
      .filter((v) => v && v.type === "JV")
      .map((v) => {
        const totalDebit = Array.isArray(v.lines) 
          ? v.lines.reduce((sum: number, line: any) => sum + (line?.debit || 0), 0) 
          : 0
        const totalCredit = Array.isArray(v.lines) 
          ? v.lines.reduce((sum: number, line: any) => sum + (line?.credit || 0), 0) 
          : 0
        return {
          ...v,
          id: v.id,
          voucherNumber: v.voucherNumber || v.id,
          date: formatVoucherDate(v.date, v.createdAt),
          description: v.description || "Journal entry",
          debit: `Rs ${totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          credit: `Rs ${totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          status: (v.status || "draft") as VoucherStatus,
          linesCount: v.lines?.length || 0,
        }
      })
  }, [vouchers])

  const handleViewVoucher = (voucherId: string) => {
    setViewingVoucherId(voucherId)
    setShowViewDialog(true)
  }

  const handleEditVoucher = (voucherId: string) => {
    const voucher = vouchers.find((v) => v.id === voucherId)
    if (voucher?.status !== "draft") {
      toast({
        title: "Cannot Edit",
        description: "Only draft vouchers can be edited. Use workflow actions for other statuses.",
        variant: "destructive",
      })
      return
    }
    setEditingVoucherId(voucherId)
    setShowEditDialog(true)
  }

  const handleWorkflowAction = async (voucherId: string, action: "submit" | "approve" | "post" | "reverse") => {
    try {
      switch (action) {
        case "submit":
          await apiService.vouchers.submit(voucherId)
          toast({ title: "Success", description: "Voucher submitted successfully" })
          break
        case "approve":
          await apiService.vouchers.approve(voucherId)
          toast({ title: "Success", description: "Voucher approved successfully" })
          break
        case "post":
          await apiService.vouchers.post(voucherId)
          toast({ title: "Success", description: "Voucher posted successfully" })
          break
        case "reverse":
          if (!window.confirm("Are you sure you want to reverse this voucher? A reversal voucher will be created.")) {
            return
          }
          const reversalDate = prompt("Enter reversal date (YYYY-MM-DD):", new Date().toISOString().split("T")[0])
          if (!reversalDate) return
          await apiService.vouchers.reverse(voucherId, { reversalDate })
          toast({ title: "Success", description: "Voucher reversed successfully" })
          break
      }
      await fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.error || error?.message || `Failed to ${action} voucher`,
        variant: "destructive",
      })
    }
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
    const voucher = vouchers.find((v) => v.id === voucherId)
    if (voucher?.status === "posted") {
      toast({
        title: "Cannot Delete",
        description: "Posted vouchers cannot be deleted. Use reverse action instead.",
        variant: "destructive",
      })
      return
    }
    
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

  const getWorkflowActions = (status: VoucherStatus) => {
    const actions = []
    if (status === "draft") {
      actions.push({ label: "Submit", action: "submit", icon: Send })
    }
    if (status === "submitted") {
      actions.push({ label: "Approve", action: "approve", icon: CheckCircle })
    }
    if (status === "approved") {
      actions.push({ label: "Post", action: "post", icon: ArrowRight })
    }
    if (status === "posted") {
      actions.push({ label: "Reverse", action: "reverse", icon: RotateCcw })
    }
    return actions
  }

  const renderVoucherActions = (voucher: any) => {
    const workflowActions = getWorkflowActions(voucher.status)
    return (
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
          {voucher.status === "draft" && (
            <DropdownMenuItem onClick={() => handleEditVoucher(voucher.id)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          )}
          {workflowActions.map((action) => (
            <DropdownMenuItem
              key={action.action}
              onClick={() => handleWorkflowAction(voucher.id, action.action as any)}
            >
              <action.icon className="mr-2 h-4 w-4" />
              {action.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onClick={() => handleDownloadPDF(voucher.id)}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </DropdownMenuItem>
          {voucher.status !== "posted" && voucher.status !== "reversed" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDeleteVoucher(voucher.id)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
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
            <h3 className="text-lg font-semibold">Bank Payment Vouchers (BPV)</h3>
            <Button
              onClick={() => {
                setVoucherType("bank-payment")
                setShowAddVoucherDialog(true)
              }}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              New BPV
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
                    <TableHead>Lines</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="px-6 py-12 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : bankPaymentVouchers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                        No bank payment vouchers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    bankPaymentVouchers.map((voucher) => (
                      <TableRow key={voucher.id}>
                        <TableCell className="font-medium">{voucher.voucherNumber}</TableCell>
                        <TableCell>{voucher.date}</TableCell>
                        <TableCell>{voucher.payee}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{voucher.description}</TableCell>
                        <TableCell className="text-right font-semibold">{voucher.amount}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{voucher.linesCount} lines</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(voucher.status)}</TableCell>
                        <TableCell>{renderVoucherActions(voucher)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Bank Receipt Vouchers */}
        <TabsContent value="bank-receipt" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-between">
            <h3 className="text-lg font-semibold">Bank Receipt Vouchers (BRV)</h3>
            <Button
              onClick={() => {
                setVoucherType("bank-receipt")
                setShowAddVoucherDialog(true)
              }}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              New BRV
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
                    <TableHead>Lines</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="px-6 py-12 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : bankReceiptVouchers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                        No bank receipt vouchers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    bankReceiptVouchers.map((voucher) => (
                      <TableRow key={voucher.id}>
                        <TableCell className="font-medium">{voucher.voucherNumber}</TableCell>
                        <TableCell>{voucher.date}</TableCell>
                        <TableCell>{voucher.from}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{voucher.description}</TableCell>
                        <TableCell className="text-right font-semibold">{voucher.amount}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{voucher.linesCount} lines</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(voucher.status)}</TableCell>
                        <TableCell>{renderVoucherActions(voucher)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Cash Payment Vouchers */}
        <TabsContent value="cash-payment" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-between">
            <h3 className="text-lg font-semibold">Cash Payment Vouchers (CPV)</h3>
            <Button
              onClick={() => {
                setVoucherType("cash-payment")
                setShowAddVoucherDialog(true)
              }}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              New CPV
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
                    <TableHead>Lines</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="px-6 py-12 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : cashPaymentVouchers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                        No cash payment vouchers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    cashPaymentVouchers.map((voucher) => (
                      <TableRow key={voucher.id}>
                        <TableCell className="font-medium">{voucher.voucherNumber}</TableCell>
                        <TableCell>{voucher.date}</TableCell>
                        <TableCell>{voucher.payee}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{voucher.description}</TableCell>
                        <TableCell className="text-right font-semibold">{voucher.amount}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{voucher.linesCount} lines</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(voucher.status)}</TableCell>
                        <TableCell>{renderVoucherActions(voucher)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Cash Receipt Vouchers */}
        <TabsContent value="cash-receipt" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-between">
            <h3 className="text-lg font-semibold">Cash Receipt Vouchers (CRV)</h3>
            <Button
              onClick={() => {
                setVoucherType("cash-receipt")
                setShowAddVoucherDialog(true)
              }}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              New CRV
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
                    <TableHead>Lines</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="px-6 py-12 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : cashReceiptVouchers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                        No cash receipt vouchers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    cashReceiptVouchers.map((voucher) => (
                      <TableRow key={voucher.id}>
                        <TableCell className="font-medium">{voucher.voucherNumber}</TableCell>
                        <TableCell>{voucher.date}</TableCell>
                        <TableCell>{voucher.from}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{voucher.description}</TableCell>
                        <TableCell className="text-right font-semibold">{voucher.amount}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{voucher.linesCount} lines</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(voucher.status)}</TableCell>
                        <TableCell>{renderVoucherActions(voucher)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Journal Vouchers */}
        <TabsContent value="journal" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-between">
            <h3 className="text-lg font-semibold">Journal Vouchers (JV)</h3>
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
                    <TableHead>Lines</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="px-6 py-12 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : journalVouchers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                        No journal vouchers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    journalVouchers.map((voucher) => (
                      <TableRow key={voucher.id}>
                        <TableCell className="font-medium">{voucher.voucherNumber}</TableCell>
                        <TableCell>{voucher.date}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{voucher.description}</TableCell>
                        <TableCell className="text-right font-semibold">{voucher.debit}</TableCell>
                        <TableCell className="text-right font-semibold">{voucher.credit}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{voucher.linesCount} lines</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(voucher.status)}</TableCell>
                        <TableCell>{renderVoucherActions(voucher)}</TableCell>
                      </TableRow>
                    ))
                  )}
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
      <AddVoucherDialog
        open={showAddVoucherDialog}
        onOpenChange={(open) => {
          setShowAddVoucherDialog(open)
          if (!open) fetchData()
        }}
        voucherType={voucherType}
        onSuccess={fetchData}
      />
      <AddGeneralVoucherDialog
        open={showAddGeneralVoucherDialog}
        onOpenChange={(open) => {
          setShowAddGeneralVoucherDialog(open)
          if (!open) fetchData()
        }}
        onSuccess={fetchData}
      />
      
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
