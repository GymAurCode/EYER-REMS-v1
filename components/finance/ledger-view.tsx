"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft, Download, FileText, X, Eye } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { apiService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

interface LedgerEntry {
  id: string
  date: Date | string
  referenceNo: string | null
  description: string
  debit: number
  credit: number
  runningBalance: number
  // Additional fields for detail view
  accountHead?: string
  narration?: string
  linkedEntityType?: string // deal, payment, expense, etc.
  linkedEntityId?: string
  linkedEntityName?: string
  voucherNo?: string
  createdAt?: Date | string
}

interface LedgerData {
  entityName: string
  entityId: string
  entries: LedgerEntry[]
  summary: {
    totalDebit: number
    totalCredit: number
    closingBalance: number
  }
}

interface LedgerViewProps {
  type: "client" | "dealer" | "property"
  id: string
  onClose?: () => void
  showBackButton?: boolean
}

export function LedgerView({ type, id, onClose, showBackButton = true }: LedgerViewProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [ledgerData, setLedgerData] = useState<LedgerData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  useEffect(() => {
    fetchLedger()
  }, [type, id])

  const fetchLedger = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log(`Fetching ledger for ${type} with ID: ${id}`)
      
      // Make API call
      const response: any = await apiService.ledgers.getLedger(type, id)
      
      console.log("Ledger API response:", response)
      
      // Handle different response structures
      let data = null
      if (response?.data) {
        // Check if response.data has a nested data property
        if (response.data.data) {
          data = response.data.data
        } else if (response.data.success && response.data.data) {
          data = response.data.data
        } else {
          data = response.data
        }
      } else if (response?.success && response?.data) {
        data = response.data
      } else {
        data = response
      }
      
      // Validate data structure
      if (!data) {
        throw new Error("No data received from server")
      }
      
      // Ensure required fields exist
      if (!data.entries || !Array.isArray(data.entries)) {
        console.error("Invalid ledger data structure:", data)
        // If entries is missing but we have other data, create empty entries array
        if (data && typeof data === 'object') {
          data.entries = []
        } else {
          throw new Error("Invalid ledger data format. Missing entries array.")
        }
      }
      
      // Ensure summary exists
      if (!data.summary) {
        const entries = data.entries || []
        data.summary = {
          totalDebit: entries.reduce((sum: number, e: LedgerEntry) => sum + (e.debit || 0), 0),
          totalCredit: entries.reduce((sum: number, e: LedgerEntry) => sum + (e.credit || 0), 0),
          closingBalance: entries.length > 0 
            ? entries[entries.length - 1].runningBalance || 0 
            : 0
        }
      }
      
      // Ensure entityName exists
      if (!data.entityName) {
        data.entityName = `${type.charAt(0).toUpperCase() + type.slice(1)} ${id.substring(0, 8)}...`
      }
      
      // Ensure entityId exists
      if (!data.entityId) {
        data.entityId = id
      }
      
      setLedgerData(data)
    } catch (err: any) {
      console.error("Ledger fetch error:", err)
      console.error("Error details:", {
        message: err?.message,
        response: err?.response?.data,
        status: err?.response?.status,
        url: err?.config?.url,
        type,
        id,
      })
      
      // More detailed error messages
      let errorMessage = "Failed to load ledger"
      
      // Check if it's a network error (API not reachable)
      if (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error')) {
        errorMessage = "Cannot connect to server. Please check your connection and try again."
      } else if (err?.response?.status === 404) {
        // Check if it's the API route or the entity
        const responseError = err?.response?.data?.error || err?.response?.data?.message || ""
        if (responseError.toLowerCase().includes('route') || 
            err?.config?.url?.includes('/finance/ledger/')) {
          errorMessage = `API endpoint not found. Please ensure the server is running and the route /api/finance/ledger/${type}/${id} is accessible.`
        } else if (responseError.toLowerCase().includes('not found') || 
                   responseError.toLowerCase().includes('property not found')) {
          errorMessage = `The ${type} with ID ${id.substring(0, 8)}... was not found. It may have been deleted or doesn't exist.`
        } else {
          errorMessage = `The ${type} with ID ${id.substring(0, 8)}... was not found. ${responseError || ''}`
        }
      } else if (err?.response?.status === 401 || err?.response?.status === 403) {
        errorMessage = "You don't have permission to view this ledger."
      } else if (err?.response?.status === 500) {
        // Server error - might be property not found or other server issue
        const serverError = err?.response?.data?.error || err?.response?.data?.message || ""
        if (serverError.toLowerCase().includes('not found')) {
          errorMessage = `The ${type} was not found. ${serverError}`
        } else {
          errorMessage = `Server error: ${serverError || 'Unknown error occurred on the server'}`
        }
      } else if (err?.response?.data?.error) {
        errorMessage = err.response.data.error
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err?.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
      toast({
        title: "Error Loading Ledger",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `Rs ${Number(amount).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatDate = (date: Date | string) => {
    try {
      return format(new Date(date), "dd MMM yyyy")
    } catch {
      return String(date)
    }
  }

  const handleExport = () => {
    if (!ledgerData) return

    // Create CSV content
    const headers = ["Date", "Reference No", "Description", "Debit", "Credit", "Running Balance"]
    const rows = ledgerData.entries.map((entry) => [
      formatDate(entry.date),
      entry.referenceNo || "",
      entry.description,
      entry.debit > 0 ? entry.debit.toFixed(2) : "",
      entry.credit > 0 ? entry.credit.toFixed(2) : "",
      entry.runningBalance.toFixed(2),
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      "",
      `Total Debit,${ledgerData.summary.totalDebit.toFixed(2)}`,
      `Total Credit,${ledgerData.summary.totalCredit.toFixed(2)}`,
      `Closing Balance,${ledgerData.summary.closingBalance.toFixed(2)}`,
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `${type}-ledger-${id}-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast({
      title: "Success",
      description: "Ledger exported to CSV",
    })
  }

  const getTypeLabel = () => {
    switch (type) {
      case "client":
        return "Client Ledger"
      case "dealer":
        return "Dealer Ledger"
      case "property":
        return "Property Ledger"
      default:
        return "Ledger"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading ledger data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <div>
            <p className="text-lg font-semibold text-destructive mb-2">Failed to Load Ledger</p>
            <p className="text-sm text-muted-foreground mb-2">{error}</p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Type: {type} | ID: {id.substring(0, 8)}...</p>
              <p>API Endpoint: /api/finance/ledger/{type}/{id}</p>
              {error.toLowerCase().includes("not found") && (
                <p className="text-destructive mt-2">
                  The {type} may not exist or you may not have permission to view it.
                </p>
              )}
              {error.toLowerCase().includes("route") && (
                <p className="text-destructive mt-2">
                  Please check that the server is running and the API endpoint is accessible.
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={fetchLedger}>
              Retry
            </Button>
            <Button variant="ghost" onClick={() => router.back()}>
              Go Back
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  if (!ledgerData) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">No ledger data available</div>
      </Card>
    )
  }

  // Handle viewing entry details
  const handleViewEntry = (entry: LedgerEntry) => {
    setSelectedEntry(entry)
    setDetailDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Ledger Entry Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Ledger Entry Details
            </DialogTitle>
            <DialogDescription>
              Complete information for this ledger entry
            </DialogDescription>
          </DialogHeader>
          
          {selectedEntry && (
            <div className="space-y-6">
              {/* Entry Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Voucher / Reference No</Label>
                  <p className="font-medium">
                    {selectedEntry.voucherNo || selectedEntry.referenceNo || "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <p className="font-medium">{formatDate(selectedEntry.date)}</p>
                </div>
              </div>

              <Separator />

              {/* Account & Description */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Account Head</Label>
                  <p className="font-medium">{selectedEntry.accountHead || getTypeLabel()}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Narration / Description</Label>
                  <p className="font-medium">{selectedEntry.narration || selectedEntry.description}</p>
                </div>
              </div>

              <Separator />

              {/* Linked Entity */}
              {(selectedEntry.linkedEntityType || selectedEntry.linkedEntityName) && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Linked Entity</Label>
                    <div className="flex items-center gap-2">
                      {selectedEntry.linkedEntityType && (
                        <Badge variant="outline">
                          {selectedEntry.linkedEntityType.charAt(0).toUpperCase() + selectedEntry.linkedEntityType.slice(1)}
                        </Badge>
                      )}
                      <span className="font-medium">{selectedEntry.linkedEntityName || selectedEntry.linkedEntityId || "—"}</span>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Debit & Credit Breakdown */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                  <CardContent className="pt-4">
                    <Label className="text-xs text-muted-foreground">Debit</Label>
                    <p className="text-2xl font-bold text-red-600">
                      {selectedEntry.debit > 0 ? formatCurrency(selectedEntry.debit) : "—"}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                  <CardContent className="pt-4">
                    <Label className="text-xs text-muted-foreground">Credit</Label>
                    <p className="text-2xl font-bold text-green-600">
                      {selectedEntry.credit > 0 ? formatCurrency(selectedEntry.credit) : "—"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Running Balance */}
              <Card>
                <CardContent className="pt-4">
                  <Label className="text-xs text-muted-foreground">Running Balance (After this entry)</Label>
                  <p className={`text-2xl font-bold ${selectedEntry.runningBalance >= 0 ? "text-primary" : "text-destructive"}`}>
                    {formatCurrency(selectedEntry.runningBalance)}
                  </p>
                </CardContent>
              </Card>

              {/* Double-Entry Note */}
              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
                <p className="font-medium mb-1">Double-Entry Accounting</p>
                <p>
                  This entry follows double-entry bookkeeping principles. 
                  {selectedEntry.debit > 0 && ` Debit increases asset/expense accounts.`}
                  {selectedEntry.credit > 0 && ` Credit increases liability/equity/revenue accounts.`}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBackButton && (
            <Button variant="ghost" size="icon" onClick={onClose || (() => router.back())}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">{getTypeLabel()}</h1>
            <p className="text-sm text-muted-foreground">{ledgerData.entityName}</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Debit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(ledgerData.summary.totalDebit)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Credit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(ledgerData.summary.totalCredit)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Closing Balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${ledgerData.summary.closingBalance >= 0 ? "text-primary" : "text-destructive"}`}>
              {formatCurrency(ledgerData.summary.closingBalance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ledger Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ledger Entries</CardTitle>
          <CardDescription>
            {ledgerData.entries.length} {ledgerData.entries.length === 1 ? "entry" : "entries"} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead className="w-[120px]">Reference No</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right w-[120px]">Debit</TableHead>
                  <TableHead className="text-right w-[120px]">Credit</TableHead>
                  <TableHead className="text-right w-[140px]">Running Balance</TableHead>
                  <TableHead className="text-right w-[60px]">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerData.entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      No ledger entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  ledgerData.entries.map((entry) => (
                    <TableRow 
                      key={entry.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        setSelectedEntry(entry)
                        setDetailDialogOpen(true)
                      }}
                    >
                      <TableCell className="font-medium">{formatDate(entry.date)}</TableCell>
                      <TableCell>
                        {entry.referenceNo ? (
                          <Badge variant="outline" className="font-mono text-xs">
                            {entry.referenceNo}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell className="text-right font-medium">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${entry.runningBalance >= 0 ? "text-primary" : "text-destructive"}`}>
                        {formatCurrency(entry.runningBalance)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

