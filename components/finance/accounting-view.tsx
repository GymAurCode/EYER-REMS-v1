"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Plus, FileText, Trash2, Loader2, Eye, Pencil, Download, MoreVertical, Send, CheckCircle, ArrowRight, RotateCcw } from "lucide-react"
import { DownloadReportDialog } from "@/components/ui/download-report-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EnhancedLedgers } from "./enhanced-ledgers"
import { AddVoucherDialog } from "./add-voucher-dialog"
import { AddGeneralVoucherDialog } from "./add-general-voucher-dialog"
import { EditVoucherDialog } from "./edit-voucher-dialog"
import { ViewVoucherDialog } from "./view-voucher-dialog"
import { apiService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ListToolbar } from "@/components/shared/list-toolbar"
import { UnifiedFilterDrawer } from "@/components/shared/unified-filter-drawer"
import { saveFilters, loadFilters } from "@/lib/filter-store"
import { toSimpleFilters, toExportFilters } from "@/lib/filter-transform"
import { countActiveFilters } from "@/lib/filter-config-registry"
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
  const [activeTab, setActiveTab] = useState("vouchers")
  const [showDownloadDialog, setShowDownloadDialog] = useState(false)
  const [showFilterDrawer, setShowFilterDrawer] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>(loadFilters("vouchers", undefined) || {})

  const fetchData = async () => {
    try {
      setLoading(true)
      const filters = toSimpleFilters(activeFilters)
      const typeVal = filters.voucherType
      const statusVal = filters.status
      const typeParam = typeVal ? (Array.isArray(typeVal) ? typeVal[0] : typeVal) as string : undefined
      const statusParam = statusVal ? (Array.isArray(statusVal) ? statusVal[0] : statusVal) as string : undefined
      const response = await apiService.vouchers.getAll({
        type: typeParam,
        status: statusParam,
      })
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

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilters])

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

  // Unified voucher list for display (all types in one table)
  const unifiedVouchers = useMemo(() => {
    if (!Array.isArray(vouchers)) return []
    return vouchers.map((v) => {
      const type = v?.type || "JV"
      const isJournal = type === "JV"
      const party = isJournal ? "—" : (getPayeeName(v) || v.description || "—")
      const amount = isJournal
        ? `Rs ${(Array.isArray(v.lines) ? v.lines.reduce((s: number, l: any) => s + (l?.debit || 0) + (l?.credit || 0), 0) / 2 : 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
        : `Rs ${Number(v.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      return {
        ...v,
        id: v.id,
        voucherNumber: v.voucherNumber || v.id,
        date: formatVoucherDate(v.date, v.createdAt),
        type,
        party,
        amount,
        description: v.description || (type === "BPV" ? "Bank payment" : type === "BRV" ? "Bank receipt" : type === "CPV" ? "Cash payment" : type === "CRV" ? "Cash receipt" : "Journal entry"),
        status: (v.status || "draft") as VoucherStatus,
        linesCount: v.lines?.length || 0,
      }
    })
  }, [vouchers])

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex min-w-full sm:min-w-0 grid-cols-2 w-full sm:w-auto">
            <TabsTrigger value="vouchers" className="text-xs sm:text-sm whitespace-nowrap">Vouchers</TabsTrigger>
            <TabsTrigger value="ledgers" className="text-xs sm:text-sm whitespace-nowrap">Ledgers</TabsTrigger>
          </TabsList>
        </div>

        {activeTab === "vouchers" && (
          <>
            <ListToolbar
              searchPlaceholder=""
              searchValue=""
              onSearchChange={() => {}}
              onFilterClick={() => setShowFilterDrawer(true)}
              activeFilterCount={countActiveFilters(activeFilters)}
              onDownloadClick={() => setShowDownloadDialog(true)}
              primaryAction={
                <Button onClick={() => { setVoucherType("bank-payment"); setShowAddVoucherDialog(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Voucher
                </Button>
              }
            />

          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Voucher No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Party / From</TableHead>
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
                      <TableCell colSpan={9} className="px-6 py-12 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : unifiedVouchers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="px-6 py-12 text-center text-muted-foreground">
                        No vouchers found. Use the Filter to narrow results.
                      </TableCell>
                    </TableRow>
                  ) : (
                    unifiedVouchers.map((voucher) => (
                      <TableRow key={voucher.id}>
                        <TableCell className="font-medium">{voucher.voucherNumber}</TableCell>
                        <TableCell>{voucher.date}</TableCell>
                        <TableCell><Badge variant="outline">{voucher.type}</Badge></TableCell>
                        <TableCell>{voucher.party}</TableCell>
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
          </>
        )}

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

      <DownloadReportDialog
        open={showDownloadDialog}
        onOpenChange={setShowDownloadDialog}
        entity="voucher"
        module="vouchers"
        entityDisplayName="Vouchers"
        filters={activeTab === "vouchers" ? toExportFilters(activeFilters, "vouchers") : {}}
      />

      {activeTab === "vouchers" && (
        <UnifiedFilterDrawer
          open={showFilterDrawer}
          onOpenChange={setShowFilterDrawer}
          entity="vouchers"
          initialFilters={activeFilters}
          onApply={(filters) => {
            setActiveFilters(filters)
            saveFilters("vouchers", undefined, filters)
            toast({ title: "Filters applied" })
          }}
        />
      )}
    </div>
  )
}
