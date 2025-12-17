"use client"

import type React from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react"
import { apiService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface AddVoucherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  voucherType?: "bank-payment" | "bank-receipt" | "cash-payment" | "cash-receipt"
  onSuccess?: () => void
}

export function AddVoucherDialog({ open, onOpenChange, voucherType = "bank-payment", onSuccess }: AddVoucherDialogProps) {
  const [formData, setFormData] = useState({
    date: "",
    payee: "",
    amount: "",
    description: "",
    reference: "",
    dealId: "",
  })
  const [attachments, setAttachments] = useState<Array<{ id?: string; url: string; name: string; mimeType?: string }>>([])
  const [uploadingAttachments, setUploadingAttachments] = useState(false)
  const [deals, setDeals] = useState<Array<{ id: string; title: string; clientName: string; propertyName: string }>>([])
  const [loadingDeals, setLoadingDeals] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<any>(null)
  const { toast } = useToast()
  
  const isBankReceipt = voucherType === "bank-receipt"

  useEffect(() => {
    if (open && isBankReceipt) {
      fetchDeals()
    }
  }, [open, isBankReceipt])

  const fetchDeals = async () => {
    try {
      setLoadingDeals(true)
      const response = await apiService.deals.getAll()
      const data = Array.isArray(response.data) ? response.data : []
      setDeals(
        data.map((deal: any) => ({
          id: deal.id,
          title: deal.title || deal.dealCode || "Untitled Deal",
          clientName: deal.client?.name || "Unassigned Client",
          propertyName: deal.property?.name || "Unassigned Property",
        })),
      )
    } catch (error) {
      console.error("Failed to load deals", error)
      toast({
        title: "Failed to load deals",
        description: "Please refresh and try again.",
        variant: "destructive",
      })
      setDeals([])
    } finally {
      setLoadingDeals(false)
    }
  }

  const handleDealChange = async (dealId: string) => {
    if (!dealId) {
      setSelectedDeal(null)
      setFormData((prev) => ({ ...prev, dealId: "", payee: "" }))
      return
    }

    try {
      const deal = await apiService.deals.getById(dealId)
      const dealData: any = deal.data || deal
      setSelectedDeal(dealData)
      setFormData((prev) => ({
        ...prev,
        dealId,
        payee: dealData?.client?.name || "",
      }))
    } catch (error: any) {
      toast({
        title: "Failed to load deal",
        description: error?.response?.data?.message || error?.message || "Unknown error",
        variant: "destructive",
      })
    }
  }

  const toBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !files.length) return

    setUploadingAttachments(true)
    try {
      const uploads: Array<{ id?: string; url: string; name: string; mimeType?: string }> = []
      
      for (const file of Array.from(files)) {
        // Validate file type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        if (!allowedTypes.includes(file.type.toLowerCase())) {
          toast({
            title: "Invalid file type",
            description: `File "${file.name}" is not supported. Only PDF, JPG, PNG, GIF, and WEBP files are allowed`,
            variant: "destructive",
          })
          continue
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: `File "${file.name}" exceeds 10MB limit`,
            variant: "destructive",
          })
          continue
        }

        const base64 = await toBase64(file)
        uploads.push({
          url: base64, // Store base64 temporarily
          name: file.name,
          mimeType: file.type,
        })
      }

      if (uploads.length > 0) {
        setAttachments((prev) => [...prev, ...uploads])
        toast({ title: `${uploads.length} file(s) uploaded successfully` })
      }
    } catch (error: any) {
      toast({
        title: "Failed to upload attachment",
        description: error?.response?.data?.error || error?.message || "Upload failed",
        variant: "destructive",
      })
    } finally {
      setUploadingAttachments(false)
      // Reset input
      if (e.target) {
        e.target.value = ""
      }
    }
  }

  const handleRemoveAttachment = async (index: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const isReceipt = voucherType.includes("receipt")
      
      // For bank receipt vouchers, validate deal is selected
      if (isBankReceipt && !formData.dealId) {
        toast({
          title: "Deal selection required",
          description: "Please select a deal for this bank receipt voucher",
          variant: "destructive",
        })
        return
      }
      
      // For bank receipt vouchers, use the voucher API endpoint
      if (isBankReceipt) {
        // Get account ID (Bank account)
        const accountsResponse = await apiService.accounts.getAll()
        const accounts = Array.isArray(accountsResponse.data) ? accountsResponse.data : []
        const bankAccount = accounts.find((acc: any) => 
          acc.name?.toLowerCase().includes("bank") || acc.code === "1010"
        )
        
        if (!bankAccount) {
          toast({
            title: "Bank account not found",
            description: "Please configure a bank account in Chart of Accounts",
            variant: "destructive",
          })
          return
        }

        const voucherPayload = {
          voucherType: "bank_receipt",
          paymentMethod: "Bank",
          accountId: bankAccount.id,
          amount: parseFloat(formData.amount || "0"),
          date: new Date(formData.date).toISOString(),
          description: formData.description || `Bank Receipt Voucher - ${selectedDeal?.title || ""}`,
          referenceNumber: formData.reference || null,
          dealId: formData.dealId,
          attachments: attachments.length > 0 ? attachments.map(a => ({
            name: a.name,
            url: a.url,
            mimeType: a.mimeType,
          })) : undefined,
        }
        
        await apiService.vouchers.create(voucherPayload)
      } else {
        // For other voucher types, use transaction API
        const transactionPayload = {
          transactionType: isReceipt ? "income" : "expense",
          type: isReceipt ? "income" : "expense",
          description: formData.description || (isReceipt ? "Receipt voucher" : "Payment voucher"),
          amount: parseFloat(formData.amount || "0"),
          date: new Date(formData.date).toISOString(),
          paymentMethod: voucherType.startsWith("bank") ? "bank" : "cash",
          referenceNumber: formData.reference || null,
          status: "completed",
          attachments: attachments.length > 0 ? attachments.map(a => ({
            name: a.name,
            url: a.url,
            mimeType: a.mimeType,
          })) : undefined,
        }
        await apiService.transactions.create(transactionPayload)
      }
      toast({ title: "Voucher created" })
      // Reset form
      setFormData({
        date: "",
        payee: "",
        amount: "",
        description: "",
        reference: "",
        dealId: "",
      })
      setAttachments([])
      setSelectedDeal(null)
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      toast({ 
        title: "Failed to create voucher", 
        description: error?.response?.data?.message || error?.message || "Unknown error",
        variant: "destructive" 
      })
    }
  }

  const getTitle = () => {
    switch (voucherType) {
      case "bank-payment":
        return "New Bank Payment Voucher"
      case "bank-receipt":
        return "New Bank Receipt Voucher"
      case "cash-payment":
        return "New Cash Payment Voucher"
      case "cash-receipt":
        return "New Cash Receipt Voucher"
      default:
        return "New Voucher"
    }
  }

  // Reset form when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFormData({
        date: "",
        payee: "",
        amount: "",
        description: "",
        reference: "",
        dealId: "",
      })
      setAttachments([])
      setSelectedDeal(null)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] sm:w-[90vw] md:w-[900px] max-w-[95vw] sm:max-w-[90vw] md:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>Enter the voucher details</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            {isBankReceipt && (
              <div className="grid gap-2">
                <Label htmlFor="deal">Deal *</Label>
                <Select
                  value={formData.dealId}
                  onValueChange={handleDealChange}
                  disabled={loadingDeals}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingDeals ? "Loading deals..." : "Select a deal"} />
                  </SelectTrigger>
                  <SelectContent>
                    {deals.map((deal) => (
                      <SelectItem key={deal.id} value={deal.id}>
                        {deal.title} - {deal.clientName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {isBankReceipt && selectedDeal && (
              <>
                <div className="grid gap-2">
                  <Label>Deal Owner (Client)</Label>
                  <Input
                    value={selectedDeal.client?.name || "N/A"}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Deal Unit / Property</Label>
                  <Input
                    value={selectedDeal.property?.name || "N/A"}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </>
            )}
            <div className="grid gap-2">
              <Label htmlFor="payee">{voucherType.includes("receipt") ? "From" : "Payee"}</Label>
              <Input
                id="payee"
                placeholder={voucherType.includes("receipt") ? "Payer name" : "Payee name"}
                value={formData.payee}
                onChange={(e) => setFormData({ ...formData, payee: e.target.value })}
                required={!isBankReceipt}
                disabled={isBankReceipt && selectedDeal}
                className={isBankReceipt && selectedDeal ? "bg-muted" : ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Voucher description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reference">Reference/Cheque No.</Label>
              <Input
                id="reference"
                placeholder="Optional reference number"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Attachments (Bank Receipt, etc.)</Label>
              <div className="space-y-2">
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <FileText className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                  <Label htmlFor="voucher-attachment-upload" className="cursor-pointer">
                    <span className="text-sm text-muted-foreground">Click to upload documents</span>
                    <Input
                      id="voucher-attachment-upload"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                      multiple
                      onChange={handleAttachmentUpload}
                      disabled={uploadingAttachments}
                      className="hidden"
                    />
                  </Label>
                  <p className="text-xs text-muted-foreground mt-2">PDF, JPG, PNG, GIF, WEBP up to 10MB each</p>
                </div>
                {uploadingAttachments && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading attachments...
                  </div>
                )}
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((attachment, idx) => {
                      const isImage = attachment.mimeType?.startsWith('image/') || attachment.url.startsWith('data:image')
                      return (
                        <div key={idx} className="flex items-center justify-between p-2 border rounded-lg">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {isImage ? (
                              <ImageIcon className="h-4 w-4 text-primary shrink-0" />
                            ) : (
                              <FileText className="h-4 w-4 text-primary shrink-0" />
                            )}
                            <span className="text-sm truncate">{attachment.name}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAttachment(idx)}
                            className="shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Voucher</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
