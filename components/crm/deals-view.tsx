"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Plus, DollarSign, Calendar, TrendingUp, Loader2, MoreVertical, Pencil, Trash } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { AddDealDialog } from "./add-deal-dialog"
import { apiService } from "@/lib/api"
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

const PIPELINE_BUCKETS = [
  { key: "qualified", label: "Qualified" },
  { key: "proposal", label: "Proposal" },
  { key: "negotiation", label: "Negotiation" },
  { key: "closing", label: "Closing" },
]

const formatCurrency = (value: number) => {
  if (!value || Number.isNaN(value)) return "Rs 0"
  return `Rs ${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

const normalizeStage = (stage?: string | null) => (stage || "").toLowerCase().trim()

export function DealsView() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const [editingDeal, setEditingDeal] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchDeals()
  }, [])

  const fetchDeals = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiService.deals.getAll()
      const data: any[] = Array.isArray(response.data) ? response.data : []
      const mapped = data.map((deal: any) => ({
        ...deal,
        clientName:
          typeof deal.client === "string"
            ? deal.client
            : deal.client?.name || deal.clientName || "",
      }))
      setDeals(mapped)
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch deals")
      setDeals([])
    } finally {
      setLoading(false)
    }
  }

  const filteredDeals = useMemo(() => {
    const query = searchQuery.toLowerCase()
    return deals.filter((deal) =>
      (deal.title || "").toLowerCase().includes(query) ||
      (deal.clientName || "").toLowerCase().includes(query) ||
      (typeof deal.client === "string" ? deal.client.toLowerCase().includes(query) : false) ||
      (deal.client?.name || "").toLowerCase().includes(query),
    )
  }, [deals, searchQuery])

  const pipelineCounts = useMemo(() => {
    const counts: Record<string, number> = {
      qualified: 0,
      proposal: 0,
      negotiation: 0,
      closing: 0,
    }

    deals.forEach((deal) => {
      const stage = normalizeStage(deal.stage)
      if (stage === "qualified") counts.qualified += 1
      else if (stage === "proposal") counts.proposal += 1
      else if (stage === "negotiation") counts.negotiation += 1
      else if (stage === "closing" || stage === "closed-won" || stage === "closed") counts.closing += 1
    })

    return counts
  }, [deals])

  const formatDealValue = (value: unknown) => {
    const numericValue =
      typeof value === "number" ? value : typeof value === "string" ? Number.parseFloat(value) : NaN
    if (!Number.isFinite(numericValue)) return "$0"
    return formatCurrency(numericValue)
  }

  const formatProbability = (probability: unknown) => {
    if (typeof probability === "number" && Number.isFinite(probability)) return `${probability}%`
    if (typeof probability === "string" && probability.trim() !== "") return `${probability}%`
    return "—"
  }

  const formatExpectedClose = (expectedClose: unknown) => {
    if (typeof expectedClose !== "string") return "—"
    const date = new Date(expectedClose)
    return Number.isNaN(date.valueOf()) ? "—" : date.toLocaleDateString()
  }

  const openEditDeal = (deal: any) => {
    setEditingDeal(deal)
    setShowAddDialog(true)
  }

  const confirmDeleteDeal = (deal: any) => {
    setDeleteTarget(deal)
  }

  const handleDeleteDeal = async () => {
    if (!deleteTarget) return
    try {
      await apiService.deals.delete(deleteTarget.id)
      toast({ title: "Deal deleted" })
      setDeleteTarget(null)
      fetchDeals()
    } catch (err: any) {
      console.error("Failed to delete deal", err)
      toast({ title: "Failed to delete deal", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-4">
      {/* Search and Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search deals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Deal
        </Button>
      </div>

      {/* Pipeline Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        {PIPELINE_BUCKETS.map((bucket) => (
          <Card
            key={bucket.key}
            className="p-4 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
            onClick={() => router.push(`/details/deals?stage=${bucket.key}`)}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{bucket.label}</p>
                <p className="text-xl font-bold text-foreground">{pipelineCounts[bucket.key] ?? 0}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Deals List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">{error}</div>
      ) : filteredDeals.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <TrendingUp className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <p className="text-lg font-semibold text-foreground mb-2">
              {deals.length === 0 ? "No deals yet" : "No deals match your search"}
            </p>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              {deals.length === 0 
                ? "Create deals to track sales opportunities. Link deals to clients and dealers, and manage the sales pipeline."
                : "Try adjusting your search criteria"}
            </p>
            {deals.length === 0 && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Deal
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredDeals.map((deal) => (
            <Card key={deal.id} className="p-6 hover:shadow-lg transition-all hover:scale-[1.01]">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div
                      className="flex flex-col gap-1"
                      onClick={() => router.push(`/details/deals/${deal.id}`)}
                      role="button"
                    >
                      <h3 className="font-semibold text-foreground text-lg">{deal.title}</h3>
                      <Badge
                        variant={
                          normalizeStage(deal.stage) === "closing"
                            ? "default"
                            : normalizeStage(deal.stage) === "negotiation"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {toTitleCase(deal.stage)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/details/deals/${deal.id}/payment-plan`)
                        }}
                      >
                        <DollarSign className="h-4 w-4 mr-1" />
                        Payment Plan
                      </Button>
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
                              openEditDeal(deal)
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault()
                              confirmDeleteDeal(deal)
                            }}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div
                    className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm"
                    onClick={() => router.push(`/details/deals/${deal.id}`)}
                    role="button"
                  >
                    <div>
                      <p className="text-muted-foreground">Client</p>
                      <p className="font-medium text-foreground mt-1">
                        {deal.client?.name || deal.clientName || "No client assigned"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Deal Value</p>
                      <div className="flex items-center gap-1 font-medium text-foreground mt-1">
                        <DollarSign className="h-3 w-3" />
                        {formatDealValue(deal.dealAmount)}
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Probability</p>
                      <p className="font-medium text-foreground mt-1">{formatProbability(deal.probability)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expected Close</p>
                      <div className="flex items-center gap-1 text-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        {formatExpectedClose(deal.expectedClose)}
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Agent</p>
                      <p className="font-medium text-foreground mt-1">{deal.agent || "—"}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Deal Progress</span>
                      <span>{formatProbability(deal.probability)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width:
                            typeof deal.probability === "number" && deal.probability >= 0
                              ? `${Math.min(deal.probability, 100)}%`
                              : typeof deal.probability === "string"
                              ? `${Number.parseFloat(deal.probability) || 0}%`
                              : "0%",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AddDealDialog
        open={showAddDialog}
        onOpenChange={(open) => {
          if (!open) {
            setEditingDeal(null)
          }
          setShowAddDialog(open)
        }}
        onSuccess={fetchDeals}
        initialData={
          editingDeal
            ? {
                id: editingDeal.id,
                title: editingDeal.title,
                clientId: editingDeal.clientId || editingDeal.client?.id || null,
                dealAmount: editingDeal.dealAmount ?? editingDeal.value ?? null,
                stage: editingDeal.stage,
              }
            : null
        }
        mode={editingDeal ? "edit" : "create"}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteTarget?.title}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDeal}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}

function toTitleCase(value?: string | null) {
  if (!value) return "—"
  return value
    .toString()
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase())
}
