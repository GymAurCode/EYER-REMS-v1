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

interface EditVoucherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  voucherId: string
  onSuccess?: () => void
}

export function EditVoucherDialog({ open, onOpenChange, voucherId, onSuccess }: EditVoucherDialogProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    date: "",
    paymentMethod: "",
    amount: "",
    description: "",
    referenceNumber: "",
    dealId: "",
    accountId: "",
  })
  const [voucher, setVoucher] = useState<any>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [deals, setDeals] = useState<Array<{ id: string; title: string; clientName: string }>>([])
  const [attachments, setAttachments] = useState<Array<{ id?: string; url: string; name: string; mimeType?: string }>>([])
  const [uploadingAttachments, setUploadingAttachments] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open && voucherId) {
      fetchVoucher()
      fetchAccounts()
      fetchDeals()
    }
  }, [open, voucherId])

  const fetchVoucher = async () => {
    try {
      setLoading(true)
      const response = await apiService.vouchers.getById(voucherId) as any
      const voucherData = response.data || response
      setVoucher(voucherData)

      setFormData({
        date: voucherData.date ? new Date(voucherData.date).toISOString().split('T')[0] : "",
        paymentMethod: voucherData.paymentMethod || "",
        amount: voucherData.amount?.toString() || "",
        description: voucherData.description || "",
        referenceNumber: voucherData.referenceNumber || "",
        dealId: voucherData.dealId || "",
        accountId: voucherData.accountId || "",
      })

      // Load attachments if they exist
      if (voucherData.attachments && Array.isArray(voucherData.attachments)) {
        setAttachments(voucherData.attachments)
      }
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

  const fetchAccounts = async () => {
    try {
      const response = await apiService.accounts.getAll()
      const accountsData = Array.isArray(response.data) ? response.data : []
      setAccounts(accountsData)
    } catch (error) {
      console.error("Failed to load accounts", error)
    }
  }

  const fetchDeals = async () => {
    try {
      const response = await apiService.deals.getAll() as any
      const responseData = response.data?.data || response.data
      const data = Array.isArray(responseData) ? responseData : []
      setDeals(
        data.map((deal: any) => ({
          id: deal.id,
          title: deal.title || deal.dealCode || "Untitled Deal",
          clientName: deal.client?.name || "Unassigned Client",
        })),
      )
    } catch (error) {
      console.error("Failed to load deals", error)
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
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        if (!allowedTypes.includes(file.type.toLowerCase())) {
          toast({
            title: "Invalid file type",
            description: `File "${file.name}" is not supported. Only PDF, JPG, PNG, GIF, and WEBP files are allowed`,
            variant: "destructive",
          })
          continue
        }

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
          url: base64,
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
      setSaving(true)

      const payload: any = {
        paymentMethod: formData.paymentMethod || voucher.paymentMethod,
        accountId: formData.accountId || voucher.accountId,
        amount: parseFloat(formData.amount),
        date: new Date(formData.date).toISOString(),
        description: formData.description,
        referenceNumber: formData.referenceNumber || null,
      }

      if (formData.dealId && formData.dealId !== 'none') {
        payload.dealId = formData.dealId
      } else if (formData.dealId === 'none') {
        payload.dealId = null
      }

      if (attachments.length > 0) {
        payload.attachments = attachments.map(a => ({
          name: a.name,
          url: a.url,
          mimeType: a.mimeType,
        }))
      }

      await apiService.vouchers.update(voucherId, payload)

      toast({ title: "Voucher updated successfully" })
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      toast({
        title: "Failed to update voucher",
        description: error?.response?.data?.error || error?.message || "Unknown error",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFormData({
        date: "",
        paymentMethod: "",
        amount: "",
        description: "",
        referenceNumber: "",
        dealId: "",
        accountId: "",
      })
      setAttachments([])
      setVoucher(null)
    }
    onOpenChange(open)
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] sm:w-[90vw] md:w-[900px] max-w-[95vw] sm:max-w-[90vw] md:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Voucher - {voucher?.voucherNumber}</DialogTitle>
          <DialogDescription>Update the voucher details</DialogDescription>
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
            <div className="grid gap-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank">Bank</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="accountId">Account</Label>
              <Select
                value={formData.accountId}
                onValueChange={(value) => setFormData({ ...formData, accountId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {voucher?.type?.includes('receipt') && (
              <div className="grid gap-2">
                <Label htmlFor="dealId">Deal (Optional)</Label>
                <Select
                  value={formData.dealId}
                  onValueChange={(value) => setFormData({ ...formData, dealId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a deal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {deals.map((deal) => (
                      <SelectItem key={deal.id} value={deal.id}>
                        {deal.title} - {deal.clientName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
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
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="referenceNumber">Reference Number</Label>
              <Input
                id="referenceNumber"
                placeholder="Optional reference number"
                value={formData.referenceNumber}
                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Attachments</Label>
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
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Update Voucher"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

