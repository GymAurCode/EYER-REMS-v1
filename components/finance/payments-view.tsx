"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, CreditCard, Loader2, Printer, Pencil, Trash2, MoreVertical } from "lucide-react"
import { AddPaymentDialog } from "./add-payment-dialog"
import { apiService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function PaymentsView() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiService.payments.getAll()
      const responseData = response.data as any
      const paymentsData = Array.isArray(responseData?.data) ? responseData.data : Array.isArray(responseData) ? responseData : []
      setPayments(paymentsData)
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch payments")
      setPayments([])
    } finally {
      setLoading(false)
    }
  }

  const filteredPayments = payments.filter((payment) => {
    const paymentId = payment.paymentId?.toLowerCase() || ""
    const dealTitle = payment.deal?.title?.toLowerCase() || ""
    const clientName = payment.deal?.client?.name?.toLowerCase() || ""
    const propertyName = payment.deal?.property?.name?.toLowerCase() || ""
    const searchLower = searchQuery.toLowerCase()
    return (
      paymentId.includes(searchLower) ||
      dealTitle.includes(searchLower) ||
      clientName.includes(searchLower) ||
      propertyName.includes(searchLower)
    )
  })

  const handlePrintReceipt = async (payment: any) => {
    try {
      const response = await apiService.payments.printReceipt(payment.id)
      if (response.data instanceof Blob) {
        const url = URL.createObjectURL(response.data)
        const printWindow = window.open(url, '_blank')
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print()
          }
        }
        toast({
          title: "Receipt opened",
          description: "Print dialog should open shortly",
        })
      }
    } catch (err: any) {
      console.error("Failed to print receipt:", err)
      toast({
        title: "Error",
        description: err.response?.data?.error || "Failed to generate receipt",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    
    try {
      await apiService.payments.delete(deleteTarget.id)
      toast({
        title: "Payment deleted",
        description: "Payment has been moved to recycle bin and payment plan has been updated",
      })
      setDeleteTarget(null)
      setShowDeleteDialog(false)
      fetchPayments()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.error || "Failed to delete payment",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Search and Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search payments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Record Payment
        </Button>
      </div>

      {/* Payments Table */}
      <Card>
        <div className="overflow-x-auto">
          {/* Desktop Table */}
          <table className="w-full hidden md:table">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Payment ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Deal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Client / Property
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-destructive">{error}</td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">No payments found</td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10">
                        <CreditCard className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium text-foreground">{payment.paymentId}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    <div className="flex flex-col">
                      <span className="font-medium">{payment.deal?.title || "N/A"}</span>
                      <span className="text-xs text-muted-foreground">{payment.deal?.stage}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    <div className="flex flex-col">
                      <span>{payment.deal?.client?.name || "Unassigned Client"}</span>
                      <span className="text-xs text-muted-foreground">{payment.deal?.property?.name || "Unassigned Property"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    <div className="flex flex-col">
                      <span className="capitalize">{payment.paymentType}</span>
                      <span className="text-xs text-muted-foreground">{payment.paymentMode.replace("_", " ")}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    {payment.amount ? `Rs ${Number(payment.amount).toLocaleString("en-PK")}` : "Rs 0"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {new Date(payment.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handlePrintReceipt(payment)}>
                          <Printer className="mr-2 h-4 w-4" />
                          Print Receipt
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          // TODO: Open edit dialog - will implement edit dialog next
                          // For now, show message that edit is available via API
                          toast({
                            title: "Edit Payment",
                            description: "Payment edit functionality is available. Edit dialog coming soon.",
                          })
                        }}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            setDeleteTarget(payment)
                            setShowDeleteDialog(true)
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
          {/* Mobile Card View */}
          <div className="md:hidden divide-y">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-destructive">{error}</div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No payments found</div>
            ) : (
              filteredPayments.map((payment) => (
                <div key={payment.id} className="p-4 space-y-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 flex-shrink-0">
                        <CreditCard className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{payment.paymentId}</p>
                        <p className="text-xs text-muted-foreground truncate mt-1">{payment.deal?.title || "N/A"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        {payment.amount ? `Rs ${Number(payment.amount).toLocaleString("en-PK")}` : "Rs 0"}
                      </p>
                      <p className="text-xs text-muted-foreground">{new Date(payment.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Client:</span>
                      <span className="text-foreground truncate ml-2">{payment.deal?.client?.name || "Unassigned Client"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Property:</span>
                      <span className="text-foreground truncate ml-2">{payment.deal?.property?.name || "Unassigned Property"}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="capitalize">{payment.paymentType}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Mode:</span>
                      <span>{payment.paymentMode.replace("_", " ")}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      {/* Dialog Component */}
      <AddPaymentDialog open={showAddDialog} onOpenChange={setShowAddDialog} onSuccess={fetchPayments} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete payment {deleteTarget?.paymentId}? 
              This will update the payment plan (installments will be marked as pending if they become unpaid).
              The payment will be moved to recycle bin and can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteTarget(null)
              setShowDeleteDialog(false)
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
