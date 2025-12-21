"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Download, Edit, Loader2 } from "lucide-react"
import { apiService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface ViewVoucherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  voucherId: string
  onEdit?: () => void
}

export function ViewVoucherDialog({ open, onOpenChange, voucherId, onEdit }: ViewVoucherDialogProps) {
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [voucher, setVoucher] = useState<any>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (open && voucherId) {
      fetchVoucher()
    }
  }, [open, voucherId])

  const fetchVoucher = async () => {
    try {
      setLoading(true)
      const response = await apiService.vouchers.getById(voucherId)
      const voucherData = response.data || response
      setVoucher(voucherData)
    } catch (error: any) {
      toast({
        title: "Failed to load voucher",
        description: error?.response?.data?.error || error?.message || "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true)
      const response = await apiService.vouchers.getPDF(voucherId) as any
      
      // Create blob and download
      const blob = new Blob([response.data as BlobPart], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `voucher-${voucher?.voucherNumber || voucherId}.pdf`
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
    } finally {
      setDownloading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `Rs ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatDate = (date: string | Date) => {
    if (!date) return "N/A"
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!voucher) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="p-8 text-center">
            <p className="text-muted-foreground">Voucher not found</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-[90vw] md:w-[800px] max-w-[95vw] sm:max-w-[90vw] md:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Voucher Details - {voucher.voucherNumber}</DialogTitle>
          <DialogDescription>
            <Badge variant="secondary" className="mt-2">{voucher.type}</Badge>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Voucher Number</label>
              <p className="text-sm font-medium">{voucher.voucherNumber}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Date</label>
              <p className="text-sm">{formatDate(voucher.date)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Payment Method</label>
              <p className="text-sm">{voucher.paymentMethod || "N/A"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Amount</label>
              <p className="text-sm font-semibold">{formatCurrency(voucher.amount)}</p>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-muted-foreground">Account</label>
              <p className="text-sm">{voucher.account?.name || "N/A"} ({voucher.account?.code || "N/A"})</p>
            </div>
            {voucher.expenseCategory && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Category</label>
                <p className="text-sm">{voucher.expenseCategory.name}</p>
              </div>
            )}
            {voucher.referenceNumber && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Reference Number</label>
                <p className="text-sm">{voucher.referenceNumber}</p>
              </div>
            )}
            {voucher.deal && (
              <div className="col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Deal</label>
                <p className="text-sm">{voucher.deal.title} - {voucher.deal.client?.name || "N/A"}</p>
              </div>
            )}
            <div className="col-span-2">
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <p className="text-sm">{voucher.description || "N/A"}</p>
            </div>
            {voucher.preparedBy && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Prepared By</label>
                <p className="text-sm">{voucher.preparedBy.username || voucher.preparedBy.email || "N/A"}</p>
              </div>
            )}
            {voucher.approvedBy && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Approved By</label>
                <p className="text-sm">{voucher.approvedBy.username || voucher.approvedBy.email || "N/A"}</p>
              </div>
            )}
          </div>

          {voucher.journalEntry && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-2">Journal Entry Details</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Entry Number:</span>
                  <span>{voucher.journalEntry.entryNumber}</span>
                </div>
                {voucher.journalEntry.lines && voucher.journalEntry.lines.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">Journal Lines:</label>
                    <div className="space-y-1 pl-4">
                      {voucher.journalEntry.lines.map((line: any, idx: number) => (
                        <div key={idx} className="text-sm flex justify-between">
                          <span>{line.account?.name || "N/A"}:</span>
                          <span>
                            {line.debit > 0 ? `Dr. ${formatCurrency(line.debit)}` : `Cr. ${formatCurrency(line.credit)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {voucher.attachments && Array.isArray(voucher.attachments) && voucher.attachments.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-2">Attachments</h4>
              <div className="space-y-2">
                {voucher.attachments.map((attachment: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 p-2 border rounded-lg">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm flex-1">{attachment.name || `Attachment ${idx + 1}`}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {onEdit && (
            <Button variant="outline" onClick={() => {
              onOpenChange(false)
              onEdit()
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          <Button onClick={handleDownloadPDF} disabled={downloading}>
            {downloading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

