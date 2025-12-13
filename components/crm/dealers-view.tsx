"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiService } from "@/lib/api"
import { DollarSign, Loader2, Mail, Phone, Search, TrendingUp, MoreVertical, Pencil, Trash, Briefcase, FileText, Eye } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
import { useToast } from "@/hooks/use-toast"
import { AddDealerDialog } from "./add-dealer-dialog"

interface DealersViewProps {
  refreshKey?: number
}

const formatCurrency = (value: number) => {
  if (!value || Number.isNaN(value)) return "Rs 0"
  return `Rs ${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

const formatDate = (value?: string | null) => {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? "—" : date.toLocaleDateString()
}

export function DealersView({ refreshKey = 0 }: DealersViewProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [dealers, setDealers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingDealer, setEditingDealer] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchDealers()
  }, [refreshKey])

  const fetchDealers = async () => {
    try {
      setLoading(true)
      setError(null)

      const dealersRes: any = await apiService.dealers.getAll()
      let dealsRes: any
      try {
        dealsRes = await apiService.deals.getAll()
      } catch {
        dealsRes = { data: [] }
      }

      const dealerList = Array.isArray(dealersRes?.data) ? dealersRes.data : []
      const deals = Array.isArray(dealsRes?.data) ? dealsRes.data : []

      const dealsByDealer: Record<string, { count: number; totalValue: number; lastDealAt?: string }> = {}
      deals.forEach((deal: any) => {
        const dealerId = deal.dealerId || deal.dealer?.id
        if (!dealerId) return

        const numericValue =
          typeof deal.dealAmount === "number" ? deal.dealAmount : Number.parseFloat(deal.dealAmount ?? "0")
        const safeValue = Number.isFinite(numericValue) ? numericValue : 0
        const createdAt = deal.createdAt

        if (!dealsByDealer[dealerId]) {
          dealsByDealer[dealerId] = { count: 0, totalValue: 0, lastDealAt: createdAt }
        }

        dealsByDealer[dealerId].count += 1
        dealsByDealer[dealerId].totalValue += safeValue

        const currentLast = dealsByDealer[dealerId].lastDealAt
        if (!currentLast || (createdAt && new Date(createdAt) > new Date(currentLast))) {
          dealsByDealer[dealerId].lastDealAt = createdAt
        }
      })

      const mapped = dealerList.map((dealer: any) => {
        const stats = dealsByDealer[dealer.id] || { count: 0, totalValue: 0, lastDealAt: undefined }
        return {
          id: dealer.id,
          name: dealer.name,
          email: dealer.email || "",
          phone: dealer.phone || "",
          company: dealer.company || "—",
          commissionRate: typeof dealer.commissionRate === "number" ? dealer.commissionRate : null,
          createdAt: dealer.createdAt,
          totalDeals: stats.count,
          totalDealValue: stats.totalValue,
          lastDealAt: stats.lastDealAt,
        }
      })

      setDealers(mapped)
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch dealers")
      setDealers([])
    } finally {
      setLoading(false)
    }
  }

  const filteredDealers = useMemo(() => {
    const query = searchQuery.toLowerCase()
    return dealers.filter((dealer) =>
      (dealer.name || "").toLowerCase().includes(query) ||
      (dealer.email || "").toLowerCase().includes(query) ||
      (dealer.company || "").toLowerCase().includes(query),
    )
  }, [dealers, searchQuery])

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search dealers by name, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Dealers Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dealer</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Deals</TableHead>
              <TableHead>Total Deal Value</TableHead>
              <TableHead>Commission Rate</TableHead>
              <TableHead>Last Deal</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="px-6 py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={8} className="px-6 py-12 text-center text-destructive">{error}</TableCell>
              </TableRow>
            ) : filteredDealers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Briefcase className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                    <p className="text-lg font-semibold text-foreground mb-2">
                      {dealers.length === 0 ? "No dealers yet" : "No dealers match your search"}
                    </p>
                    <p className="text-sm text-muted-foreground mb-4 max-w-md">
                      {dealers.length === 0 
                        ? "Add dealers to track commissions and manage sales relationships"
                        : "Try adjusting your search criteria"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredDealers.map((dealer) => (
                <TableRow key={dealer.id}>
                  <TableCell>
                    <div className="font-semibold text-foreground">{dealer.name}</div>
                    <div className="text-xs text-muted-foreground">ID: {dealer.id}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="text-xs">{dealer.email || "—"}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span className="text-xs">{dealer.phone || "—"}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{dealer.company || "—"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="font-medium">{dealer.totalDeals}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-success" />
                      <span className="font-semibold text-success">
                        {dealer.totalDealValue > 0 ? formatCurrency(dealer.totalDealValue) : "$0"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {dealer.commissionRate != null ? `${dealer.commissionRate}%` : "—"}
                  </TableCell>
                  <TableCell>{formatDate(dealer.lastDealAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-between gap-2">
                      <span>{formatDate(dealer.createdAt)}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault()
                              router.push(`/ledger/dealer/${dealer.id}`)
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault()
                              router.push(`/ledger/dealer/${dealer.id}`)
                            }}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Open Ledger
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault()
                              setEditingDealer(dealer)
                              setShowDialog(true)
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault()
                              setDeleteTarget(dealer)
                            }}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <AddDealerDialog
        open={showDialog}
        onOpenChange={(open) => {
          if (!open) {
            setEditingDealer(null)
          }
          setShowDialog(open)
        }}
        onSuccess={fetchDealers}
        initialData={editingDealer}
        mode={editingDealer ? "edit" : "create"}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dealer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteTarget?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteTarget) return
                try {
                  await apiService.dealers.delete(deleteTarget.id)
                  toast({ title: "Dealer deleted" })
                  setDeleteTarget(null)
                  fetchDealers()
                } catch (err: any) {
                  console.error("Failed to delete dealer", err)
                  toast({ title: "Failed to delete dealer", variant: "destructive" })
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
