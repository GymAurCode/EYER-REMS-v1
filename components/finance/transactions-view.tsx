"use client"

import { useState, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, ArrowUpRight, ArrowDownRight, Calendar, Loader2, ArrowUpDown, FileText, Trash2 } from "lucide-react"
import { AddTransactionDialog } from "./add-transaction-dialog"
import { apiService } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
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

type SortField = "date" | "amount" | "type" | "category"
type SortDirection = "asc" | "desc"

export function TransactionsView() {
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiService.transactions.getAll()
      const responseData = response.data as any
      const transactionsData = Array.isArray(responseData?.data) ? responseData.data : Array.isArray(responseData) ? responseData : []
      setTransactions(transactionsData)
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch transactions")
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions.filter((transaction) => {
      // Search filter
      const matchesSearch = 
        transaction.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.transactionCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.transactionCategory?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.property?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        false
      
      // Type filter
      const matchesType = typeFilter === "all" || transaction.transactionType === typeFilter
      
      // Status filter
      const matchesStatus = statusFilter === "all" || transaction.status === statusFilter
      
      return matchesSearch && matchesType && matchesStatus
    })
    
    // Sorting
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any
      
      switch (sortField) {
        case "date":
          aValue = new Date(a.date).getTime()
          bValue = new Date(b.date).getTime()
          break
        case "amount":
          aValue = a.totalAmount || a.amount || 0
          bValue = b.totalAmount || b.amount || 0
          break
        case "type":
          aValue = a.transactionType || ""
          bValue = b.transactionType || ""
          break
        case "category":
          aValue = a.transactionCategory?.name || ""
          bValue = b.transactionCategory?.name || ""
          break
        default:
          return 0
      }
      
      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
      }
    })
    
    return filtered
  }, [transactions, searchQuery, typeFilter, statusFilter, sortField, sortDirection])
  
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    
    try {
      setDeleting(true)
      await apiService.transactions.delete(deleteTarget.id)
      toast({
        title: "Transaction deleted",
        description: "The transaction has been successfully deleted.",
      })
      setDeleteTarget(null)
      fetchTransactions()
    } catch (err: any) {
      console.error("Failed to delete transaction:", err)
      toast({
        title: "Failed to delete transaction",
        description: err?.response?.data?.message || err?.message || "An error occurred while deleting the transaction.",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by code, description, category, property..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Transactions List */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">{error}</div>
        ) : filteredAndSortedTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <p className="text-sm font-medium text-foreground mb-1">
              {transactions.length === 0 ? "No transactions yet" : "No transactions match your filters"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {transactions.length === 0 
                ? "Start by recording your first transaction to track income and expenses"
                : "Try adjusting your search or filter criteria"}
            </p>
            {transactions.length === 0 && (
              <Button onClick={() => setShowAddDialog(true)} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Transaction
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {/* Desktop Sort Header - Hidden on mobile */}
            <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-muted/30 text-xs font-medium text-muted-foreground">
              <div className="col-span-3 flex items-center gap-2 cursor-pointer hover:text-foreground" onClick={() => handleSort("date")}>
                Date
                <ArrowUpDown className="h-3 w-3" />
              </div>
              <div className="col-span-2 flex items-center gap-2 cursor-pointer hover:text-foreground" onClick={() => handleSort("category")}>
                Category
                <ArrowUpDown className="h-3 w-3" />
              </div>
              <div className="col-span-3">Description</div>
              <div className="col-span-1 flex items-center gap-2 cursor-pointer hover:text-foreground" onClick={() => handleSort("type")}>
                Type
                <ArrowUpDown className="h-3 w-3" />
              </div>
              <div className="col-span-2 flex items-center justify-end gap-2 cursor-pointer hover:text-foreground" onClick={() => handleSort("amount")}>
                Amount
                <ArrowUpDown className="h-3 w-3" />
              </div>
              <div className="col-span-1 text-center">Actions</div>
            </div>
            {filteredAndSortedTransactions.map((transaction) => (
            <>
              {/* Mobile Card View */}
              <div key={transaction.id} className="md:hidden p-4 space-y-3 hover:bg-muted/50 transition-colors border-b">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0",
                        transaction.transactionType === "income" ? "bg-success/10" : "bg-destructive/10",
                      )}
                    >
                      {transaction.transactionType === "income" ? (
                        <ArrowDownRight className="h-4 w-4 text-success" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {transaction.description?.trim() || "No description"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {transaction.transactionCategory?.name || transaction.category || "Uncategorized"}
                        </Badge>
                        <Badge variant={transaction.transactionType === "income" ? "default" : "secondary"} className="text-xs">
                          {transaction.transactionType === "income" ? "Income" : "Expense"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                    onClick={() => setDeleteTarget(transaction)}
                    disabled={deleting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(transaction.date).toLocaleDateString()}
                    </div>
                    <div className="font-mono mt-1">
                      {transaction.transactionCode || transaction.id.slice(0, 8)}
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "text-base font-semibold",
                        transaction.transactionType === "income" ? "text-success" : "text-destructive",
                      )}
                    >
                      {transaction.transactionType === "income" ? "+" : "-"}Rs {(transaction.totalAmount || transaction.amount || 0).toLocaleString("en-IN")}
                    </p>
                    <Badge variant={transaction.status === "completed" ? "default" : "outline"} className="text-xs mt-1">
                      {transaction.status}
                    </Badge>
                  </div>
                </div>
                {transaction.property?.name && (
                  <p className="text-xs text-muted-foreground truncate">{transaction.property.name}</p>
                )}
              </div>
              {/* Desktop Grid View */}
              <div key={`desktop-${transaction.id}`} className="hidden md:grid grid-cols-12 gap-4 p-4 hover:bg-muted/50 transition-colors items-center">
              <div className="col-span-3 flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0",
                    transaction.transactionType === "income" ? "bg-success/10" : "bg-destructive/10",
                  )}
                >
                  {transaction.transactionType === "income" ? (
                    <ArrowDownRight className="h-4 w-4 text-success" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-destructive" />
                  )}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {transaction.transactionCode || transaction.id.slice(0, 8)}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(transaction.date).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="col-span-2">
                <Badge variant="secondary" className="text-xs">
                  {transaction.transactionCategory?.name || transaction.category || "Uncategorized"}
                </Badge>
              </div>
              <div className="col-span-3 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {transaction.description?.trim() || "No description"}
                </p>
                {transaction.property?.name && (
                  <p className="text-xs text-muted-foreground truncate">{transaction.property.name}</p>
                )}
              </div>
              <div className="col-span-1">
                <Badge variant={transaction.transactionType === "income" ? "default" : "secondary"} className="text-xs">
                  {transaction.transactionType === "income" ? "Income" : "Expense"}
                </Badge>
              </div>
              <div className="col-span-2 text-right">
                <p
                  className={cn(
                    "text-base font-semibold",
                    transaction.transactionType === "income" ? "text-success" : "text-destructive",
                  )}
                >
                  {transaction.transactionType === "income" ? "+" : "-"}Rs {(transaction.totalAmount || transaction.amount || 0).toLocaleString("en-IN")}
                </p>
                <Badge variant={transaction.status === "completed" ? "default" : "outline"} className="text-xs mt-1">
                  {transaction.status}
                </Badge>
              </div>
              <div className="col-span-1 flex items-center justify-center gap-1">
                {transaction.attachments && Array.isArray(transaction.attachments) && transaction.attachments.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {transaction.attachments.length} file(s)
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTarget(transaction)}
                  disabled={deleting}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            </>
            ))}
          </div>
        )}
      </Card>

      {/* Add Transaction Dialog */}
      <AddTransactionDialog open={showAddDialog} onOpenChange={setShowAddDialog} onSuccess={fetchTransactions} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteTarget && (
            <div className="mt-2 p-2 bg-muted rounded text-sm">
              <p className="font-medium">{deleteTarget.description || "No description"}</p>
              <p className="text-xs text-muted-foreground">
                {deleteTarget.transactionCode || deleteTarget.id.slice(0, 8)} • {new Date(deleteTarget.date).toLocaleDateString()}
              </p>
              <p className="text-xs font-semibold mt-1">
                Amount: Rs {(deleteTarget.totalAmount || deleteTarget.amount || 0).toLocaleString()}
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

