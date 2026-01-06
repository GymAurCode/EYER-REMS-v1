"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Paperclip,
  History,
  Link,
  FileText,
  Loader2,
  CheckCircle2,
  Plus,
  Eye,
  Download,
  Trash2,
  X,
  Calendar,
  User,
  StickyNote,
  BarChart3
} from "lucide-react"
import { apiService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

interface Account {
  id: string
  code: string
  name: string
  type: string
  description?: string
  isActive: boolean
  isPostable: boolean
  level: number
  accountType: string
  normalBalance: string
  trustFlag: boolean
  parentId?: string
  parent?: Account
  children?: Account[]
}

interface HistoryEntry {
  id: string
  userId: string
  userName: string
  action: string
  oldValue?: string
  newValue?: string
  createdAt: string
  entityType: string
  entityId: string
}

interface Attachment {
  id: string
  fileName: string
  originalFileName?: string
  fileType: string
  uploadedAt: string
  uploadedBy: string
  fileSize?: number
}

interface FooterData {
  boundAccounts: Account[]
  attachments: Attachment[]
  history: HistoryEntry[]
  notes?: string
  references?: string[]
  attachmentCount: number
}

interface AccountsFooterBarProps {
  entityType: 'property' | 'voucher' | 'receipt' | 'payment' | 'invoice' | 'journal' | 'deal'
  entityId: string
  onUpdate?: () => void
}

export function AccountsFooterBar({ entityType, entityId, onUpdate }: AccountsFooterBarProps) {
  console.log('AccountsFooterBar rendered with entityType:', entityType, 'entityId:', entityId)
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [footerData, setFooterData] = useState<FooterData>({
    boundAccounts: [],
    attachments: [],
    history: [],
    attachmentCount: 0
  })

  // Modal states
  const [attachmentsModalOpen, setAttachmentsModalOpen] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [notesModalOpen, setNotesModalOpen] = useState(false)
  const [referencesModalOpen, setReferencesModalOpen] = useState(false)
  const [quickReportModalOpen, setQuickReportModalOpen] = useState(false)

  // Form states
  const [selectedAccountId, setSelectedAccountId] = useState("")
  const [bindingAccount, setBindingAccount] = useState(false)
  const [uploadingAttachments, setUploadingAttachments] = useState(false)
  const [notes, setNotes] = useState("")
  const [references, setReferences] = useState("")
  const [newReference, setNewReference] = useState("")

  // Delete confirmation
  const [deleteAttachmentId, setDeleteAttachmentId] = useState<string | null>(null)

  useEffect(() => {
    if (entityId) {
      loadData()
    }
  }, [entityType, entityId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load accounts for binding
      console.log('Loading accounts for entityType:', entityType, 'entityId:', entityId)
      const accountsResponse = await apiService.accounts.getAll({ tree: 'true' })
      console.log('Accounts response:', accountsResponse)
      const accountsData = Array.isArray(accountsResponse.data?.data) ? accountsResponse.data.data : Array.isArray(accountsResponse.data) ? accountsResponse.data : []
      console.log('Parsed accounts data:', accountsData)
      setAccounts(accountsData)

      // Load footer data
      await loadFooterData()
    } catch (error: any) {
      console.error('Error in loadData:', error)
      toast({
        title: "Error loading data",
        description: error?.response?.data?.error || error?.message || "Failed to load footer data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadFooterData = async () => {
    let boundAccounts: Account[] = []
    let attachments: Attachment[] = []
    let history: HistoryEntry[] = []
    let metadata: any = {}

    try {
      // Load bound accounts
      console.log('Loading bound accounts for entityType:', entityType, 'entityId:', entityId, 'type of entityId:', typeof entityId)
      const bindingResponse = await apiService.entities.getAccountBinding(entityType, entityId)
      console.log('Binding response:', bindingResponse)
      const data = bindingResponse.data
      console.log('Binding data:', data, 'isArray:', Array.isArray(data))
      if (Array.isArray(data)) {
        console.log('First binding item:', data[0])
      }

      if (data) {
        if (Array.isArray(data)) {
          // Direct array of accounts or bindings
          const bindings = data
          if (bindings.length > 0) {
            if (bindings[0].account) {
              // Wrapped in account property
              boundAccounts = bindings.map((b: any) => b.account).filter(Boolean)
            } else {
              // Direct accounts
              boundAccounts = bindings.filter((b: any) => b && b.id)
            }
          }
        } else if (data.accounts && Array.isArray(data.accounts)) {
          // { accounts: [...] }
          boundAccounts = data.accounts.filter((acc: any) => acc && acc.id)
        } else if (data.account) {
          // Single account wrapped
          boundAccounts = [data.account].filter(Boolean)
        } else if (data.id) {
          // Single direct account
          boundAccounts = [data].filter(Boolean)
        }
      }
      console.log('Parsed bound accounts:', boundAccounts, 'length:', boundAccounts.length)
    } catch (error: any) {
      console.warn("Failed to load bound accounts:", error?.message)
    }

    try {
      // Load attachments
      const attachmentsResponse = await apiService.entities.getAttachments(entityType, entityId)
      const attachmentsData = attachmentsResponse.data?.data || attachmentsResponse.data || []
      attachments = Array.isArray(attachmentsData) ? attachmentsData : []
    } catch (error: any) {
      console.warn("Failed to load attachments:", error?.message)
    }

    try {
      // Load history
      const historyResponse = await apiService.entities.getHistory(entityType, entityId)
      const historyData = historyResponse.data?.data || historyResponse.data || []
      history = Array.isArray(historyData) ? historyData : []
    } catch (error: any) {
      console.warn("Failed to load history:", error?.message)
    }

    try {
      // Load notes and references
      const metadataResponse = await apiService.entities.getMetadata(entityType, entityId)
      metadata = metadataResponse.data || metadataResponse || {}
    } catch (error: any) {
      console.warn("Failed to load metadata:", error?.message)
    }

    setFooterData({
      boundAccounts,
      attachments,
      history,
      notes: metadata.notes || "",
      references: metadata.references || [],
      attachmentCount: attachments.length
    })

    setNotes(metadata.notes || "")
    setReferences(metadata.references?.join('\n') || "")
  }

  const handleAccountBinding = async () => {
    if (!selectedAccountId) {
      toast({
        title: "No account selected",
        description: "Please select an account to bind",
        variant: "destructive",
      })
      return
    }

    try {
      setBindingAccount(true)
      console.log('Binding account:', selectedAccountId, 'to entityType:', entityType, 'entityId:', entityId)
      const selectedAccount = accounts.find(acc => acc.id === selectedAccountId)
      console.log('Selected account:', selectedAccount)
      if (!selectedAccount) return

      // Check if already bound
      if (footerData.boundAccounts.some(acc => acc.id === selectedAccountId)) {
        toast({
          title: "Account already bound",
          description: "This account is already bound to this entity",
          variant: "default",
        })
        return
      }

      console.log('Calling bindAccount API')
      const bindResponse = await apiService.entities.bindAccount(entityType, entityId, selectedAccountId)
      console.log('Bind response:', bindResponse)

      // Record in history
      const fullPath = buildAccountPath(selectedAccountId, accounts)
      console.log('Adding history with fullPath:', fullPath)
      await apiService.entities.addHistory(entityType, entityId, {
        action: "Account bound",
        newValue: fullPath || `${selectedAccount.code} - ${selectedAccount.name}`
      })

      toast({ title: "Account bound successfully" })

      // Refresh data
      await loadFooterData()
      onUpdate?.()
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("accounts-footer-updated"))
      }
      setSelectedAccountId("") // Reset selection
    } catch (error: any) {
      console.error('Error in handleAccountBinding:', error)
      toast({
        title: "Failed to bind account",
        description: error?.response?.data?.error || error?.message || "Unknown error",
        variant: "destructive",
      })
    } finally {
      setBindingAccount(false)
    }
  }

  const handleUnbindAccount = async (accountId: string) => {
    try {
      const account = footerData.boundAccounts.find(acc => acc.id === accountId)
      if (!account) return

      await apiService.entities.unbindAccount(entityType, entityId, accountId)

      // Record in history
      const fullPath = buildAccountPath(account.id, accounts)
      await apiService.entities.addHistory(entityType, entityId, {
        action: "Account unbound",
        oldValue: fullPath || `${account.code} - ${account.name}`
      })

      toast({ title: "Account unbound successfully" })

      // Refresh data
      await loadFooterData()
      onUpdate?.()
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("accounts-footer-updated"))
      }
    } catch (error: any) {
      toast({
        title: "Failed to unbind account",
        description: error?.response?.data?.error || error?.message || "Unknown error",
        variant: "destructive",
      })
    }
  }

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !files.length) return

    setUploadingAttachments(true)
    try {
      for (const file of Array.from(files)) {
        // Validate file type
        const allowedTypes = [
          'application/pdf',
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ]
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

        await apiService.entities.uploadAttachment(entityType, entityId, {
          file: base64,
          filename: file.name,
          fileType: file.type
        })

        // Record in history
        await apiService.entities.addHistory(entityType, entityId, {
          action: "Attachment Added",
          newValue: file.name
        })

        toast({ title: `File "${file.name}" uploaded successfully` })
      }

      // Refresh data
      await loadFooterData()
      onUpdate?.()
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("accounts-footer-updated"))
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

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await apiService.entities.deleteAttachment(entityType, entityId, attachmentId)

      // Record in history
      const attachment = footerData.attachments.find(a => a.id === attachmentId)
      if (attachment) {
        await apiService.entities.addHistory(entityType, entityId, {
          action: "Attachment Deleted",
          oldValue: attachment.fileName
        })
      }

      toast({ title: "Attachment deleted successfully" })

      // Refresh data
      await loadFooterData()
      onUpdate?.()
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("accounts-footer-updated"))
      }
    } catch (error: any) {
      toast({
        title: "Failed to delete attachment",
        description: error?.response?.data?.error || error?.message || "Delete failed",
        variant: "destructive",
      })
    } finally {
      setDeleteAttachmentId(null)
    }
  }

  const handleSaveNotes = async () => {
    try {
      await apiService.entities.updateMetadata(entityType, entityId, {
        notes: notes
      })

      // Record in history
      await apiService.entities.addHistory(entityType, entityId, {
        action: "Notes Updated",
        oldValue: footerData.notes || "None",
        newValue: notes || "None"
      })

      toast({ title: "Notes saved successfully" })

      // Refresh data
      await loadFooterData()
      onUpdate?.()
      setNotesModalOpen(false)
    } catch (error: any) {
      toast({
        title: "Failed to save notes",
        description: error?.response?.data?.error || error?.message || "Save failed",
        variant: "destructive",
      })
    }
  }

  const handleAddReference = async () => {
    if (!newReference.trim()) return

    const updatedReferences = [...(footerData.references || []), newReference.trim()]

    try {
      await apiService.entities.updateMetadata(entityType, entityId, {
        references: updatedReferences
      })

      // Record in history
      await apiService.entities.addHistory(entityType, entityId, {
        action: "Reference Added",
        newValue: newReference.trim()
      })

      toast({ title: "Reference added successfully" })

      // Refresh data
      await loadFooterData()
      onUpdate?.()
      setNewReference("")
    } catch (error: any) {
      toast({
        title: "Failed to add reference",
        description: error?.response?.data?.error || error?.message || "Add failed",
        variant: "destructive",
      })
    }
  }

  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })
  }

  const buildAccountPath = (accountId: string, accounts: Account[]): string => {
    const findPath = (accs: Account[], currentPath: string[] = []): string[] | null => {
      for (const acc of accs) {
        const newPath = [...currentPath, acc.name]
        if (acc.id === accountId) {
          return newPath
        }
        if (acc.children && acc.children.length > 0) {
          const childPath = findPath(acc.children, newPath)
          if (childPath) return childPath
        }
      }
      return null
    }
    const path = findPath(accounts)
    return path ? path.join(' > ') : ''
  }

  const renderAccountTree = (accounts: Account[], level = 0): JSX.Element[] => {
    return accounts.flatMap(account => {
      const indent = level * 16
      const elements = [
        <SelectItem key={account.id} value={account.id} style={{ paddingLeft: `${12 + indent}px` }}>
          {account.code} - {account.name}
        </SelectItem>
      ]

      if (account.children && account.children.length > 0) {
        elements.push(...renderAccountTree(account.children, level + 1))
      }

      return elements
    })
  }

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="ml-2">Loading footer data...</span>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4 bg-muted/30">
      <div className="space-y-4">
        {/* Account Binding Section */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium text-foreground">Accounts:</span>
            <div className="space-y-1">
              {footerData.boundAccounts.length > 0 ? (
                footerData.boundAccounts.map(account => (
                  <div key={account.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                    <div className="text-sm">
                      <div className="font-medium">{account.name}</div>
                      <div className="text-muted-foreground text-xs">{account.accountType} - {buildAccountPath(account.id, accounts) || `${account.code} - ${account.name}`}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnbindAccount(account.id)}
                      className="h-6 w-6 p-0 hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No accounts bound</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select account to bind" />
              </SelectTrigger>
              <SelectContent>
                {renderAccountTree(accounts)}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAccountBinding}
              disabled={bindingAccount || !selectedAccountId}
              size="sm"
            >
              {bindingAccount ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Bind"
              )}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Attachments */}
            <Dialog open={attachmentsModalOpen} onOpenChange={setAttachmentsModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Paperclip className="h-4 w-4 mr-2" />
                Attachments ({footerData.attachmentCount})
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Attachments</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Upload Section */}
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <Label htmlFor="attachment-upload" className="cursor-pointer">
                    <div className="space-y-2">
                      <Plus className="h-6 w-6 mx-auto text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Click to upload files</span>
                      <p className="text-xs text-muted-foreground">PDF, JPG, PNG, GIF, WEBP up to 10MB each</p>
                    </div>
                    <Input
                      id="attachment-upload"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.xls,.xlsx"
                      multiple
                      onChange={handleAttachmentUpload}
                      disabled={uploadingAttachments}
                      className="hidden"
                    />
                  </Label>
                  {uploadingAttachments && (
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Uploading...</span>
                    </div>
                  )}
                </div>

                {/* Attachments List */}
                <ScrollArea className="max-h-96">
                  {footerData.attachments.length > 0 ? (
                    <div className="space-y-2">
                      {footerData.attachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center justify-between p-2 border rounded-lg">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm truncate">{attachment.originalFileName || attachment.fileName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const url = apiService.files.getDownloadUrl(entityType, entityId, attachment.fileName)
                                window.open(url, '_blank')
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteAttachmentId(attachment.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Paperclip className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No attachments yet</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>

          {/* History Log */}
          <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <History className="h-4 w-4 mr-2" />
                History ({footerData.history.length})
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Change History</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Date/Time</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Old Value</TableHead>
                      <TableHead>New Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {footerData.history.length > 0 ? (
                      footerData.history.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{entry.userName}</TableCell>
                          <TableCell>{new Date(entry.createdAt).toLocaleString()}</TableCell>
                          <TableCell>{entry.action}</TableCell>
                          <TableCell className="max-w-xs truncate">{entry.oldValue || "—"}</TableCell>
                          <TableCell className="max-w-xs truncate">{entry.newValue || "—"}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No history available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          {/* Notes */}
          <Dialog open={notesModalOpen} onOpenChange={setNotesModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <StickyNote className="h-4 w-4 mr-2" />
                Notes
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Internal Notes</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  placeholder="Add internal notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={6}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setNotesModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveNotes}>
                    Save Notes
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* References */}
          <Dialog open={referencesModalOpen} onOpenChange={setReferencesModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Link className="h-4 w-4 mr-2" />
                References ({footerData.references?.length || 0})
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Related References</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Add Reference</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter reference (e.g., Deal #123, Client ABC)"
                      value={newReference}
                      onChange={(e) => setNewReference(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddReference()}
                    />
                    <Button onClick={handleAddReference} disabled={!newReference.trim()}>
                      Add
                    </Button>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Current References</Label>
                  {footerData.references && footerData.references.length > 0 ? (
                    <div className="space-y-1">
                      {footerData.references.map((ref, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                          <Link className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{ref}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No references added yet</p>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Quick Report */}
          <Dialog open={quickReportModalOpen} onOpenChange={setQuickReportModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                Quick Report
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Quick Summary Report</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Entity Type</Label>
                    <p className="text-sm font-medium capitalize">{entityType}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Entity ID</Label>
                    <p className="text-sm font-medium">{entityId}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Bound Accounts</Label>
                    <div className="text-sm">
                      {footerData.boundAccounts.length > 0 ? (
                        footerData.boundAccounts.map(acc => (
                          <div key={acc.id}>{buildAccountPath(acc.id, accounts) || `${acc.code} - ${acc.name}`}</div>
                        ))
                      ) : (
                        "None"
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Attachments</Label>
                    <p className="text-sm">{footerData.attachmentCount} files</p>
                  </div>
                  <div className="space-y-2">
                    <Label>History Entries</Label>
                    <p className="text-sm">{footerData.history.length} changes</p>
                  </div>
                  <div className="space-y-2">
                    <Label>References</Label>
                    <p className="text-sm">{footerData.references?.length || 0} links</p>
                  </div>
                </div>
                {footerData.notes && (
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <p className="text-sm bg-muted p-2 rounded">{footerData.notes}</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Delete Attachment Confirmation */}
      <AlertDialog open={!!deleteAttachmentId} onOpenChange={() => setDeleteAttachmentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this attachment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAttachmentId && handleDeleteAttachment(deleteAttachmentId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
