"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, DollarSign, TrendingUp, Calendar, Loader2, FileText } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiService } from "@/lib/api"

export function CommissionsView() {
  const [searchQuery, setSearchQuery] = useState("")
  const [dealerFilter, setDealerFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [commissions, setCommissions] = useState<any[]>([])
  const [dealers, setDealers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchCommissions()
    fetchDealers()
  }, [])
  
  const fetchDealers = async () => {
    try {
      const response: any = await apiService.dealers.getAll()
      const responseData = response.data as any
      const dealersData = Array.isArray(responseData?.data) ? responseData.data : Array.isArray(responseData) ? responseData : []
      setDealers(Array.isArray(dealersData) ? dealersData : [])
    } catch {
      setDealers([])
    }
  }

  const fetchCommissions = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiService.commissions.getAll()
      const responseData = response.data as any
      const commissionsData = Array.isArray(responseData?.data) ? responseData.data : Array.isArray(responseData) ? responseData : []
      const mapped = commissionsData.map((c: any) => ({
        id: c.id,
        dealerName: c.dealer?.name || c.dealerId || "—",
        dealerId: c.dealerId || "—",
        transactionType: "sale",
        propertyName: c.sale?.propertyId || "—",
        saleAmount: c.sale?.saleValue || 0,
        commissionRate: c.rate ?? 0,
        commissionAmount: c.amount ?? 0,
        date: c.createdAt,
        status: "paid",
      }))
      setCommissions(mapped)
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch commissions")
      setCommissions([])
    } finally {
      setLoading(false)
    }
  }

  const filteredCommissions = commissions.filter(
    (commission) => {
      const matchesSearch = 
        commission.dealerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        commission.propertyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        commission.transactionType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        commission.id?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesDealer = dealerFilter === "all" || commission.dealerId === dealerFilter
      const matchesStatus = statusFilter === "all" || commission.status === statusFilter
      
      return matchesSearch && matchesDealer && matchesStatus
    }
  )

  const totalCommissions = filteredCommissions.reduce((sum, c) => sum + (c.commissionAmount || 0), 0)
  const paidCommissions = filteredCommissions
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + (c.commissionAmount || 0), 0)
  const pendingCommissions = filteredCommissions
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + (c.commissionAmount || 0), 0)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className="p-6 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
          onClick={() => router.push("/details/commissions")}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Commissions</p>
              <p className="text-2xl font-bold text-foreground">Rs {totalCommissions.toLocaleString("en-PK")}</p>
            </div>
          </div>
        </Card>
        <Card
          className="p-6 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
          onClick={() => router.push("/details/commissions?status=paid")}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
              <TrendingUp className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Paid Commissions</p>
              <p className="text-2xl font-bold text-success">Rs {paidCommissions.toLocaleString("en-PK")}</p>
            </div>
          </div>
        </Card>
        <Card
          className="p-6 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
          onClick={() => router.push("/details/commissions?status=pending")}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-500/10">
              <Calendar className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Commissions</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">
                Rs {pendingCommissions.toLocaleString("en-PK")}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by dealer, property, or commission ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={dealerFilter} onValueChange={setDealerFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by dealer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dealers</SelectItem>
              {dealers.map((dealer) => (
                <SelectItem key={dealer.id} value={dealer.id}>
                  {dealer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Commissions Table */}
      <Card>
        <div className="overflow-x-auto">
          {/* Desktop Table */}
          <Table className="hidden md:table">
          <TableHeader>
            <TableRow>
              <TableHead>Commission ID</TableHead>
              <TableHead>Dealer</TableHead>
              <TableHead>Transaction Type</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Sale Amount</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="px-6 py-12 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={9} className="px-6 py-12 text-center text-destructive">{error}</TableCell>
              </TableRow>
            ) : filteredCommissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                    <p className="text-sm font-medium text-foreground mb-1">
                      {commissions.length === 0 ? "No commissions yet" : "No commissions match your filters"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {commissions.length === 0 
                        ? "Commissions will appear here when property sales are completed"
                        : "Try adjusting your search or filter criteria"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredCommissions.map((commission) => (
              <TableRow
                key={commission.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => router.push(`/details/commissions/${commission.id}`)}
              >
                <TableCell className="font-medium">{commission.id}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{commission.dealerName}</div>
                    <div className="text-xs text-muted-foreground">{commission.dealerId}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{commission.transactionType}</Badge>
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <div className="truncate">{commission.propertyName}</div>
                </TableCell>
                <TableCell className="font-medium">Rs {commission.saleAmount.toLocaleString("en-PK")}</TableCell>
                <TableCell>{commission.commissionRate}%</TableCell>
                <TableCell>
                  <span className="font-semibold text-success">Rs {commission.commissionAmount.toLocaleString("en-PK")}</span>
                </TableCell>
                <TableCell>{new Date(commission.date).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge variant={commission.status === "paid" ? "default" : "secondary"}>{commission.status}</Badge>
                </TableCell>
              </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {/* Mobile Card View */}
        <div className="md:hidden divide-y">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">{error}</div>
          ) : filteredCommissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-sm font-medium text-foreground mb-1">
                {commissions.length === 0 ? "No commissions yet" : "No commissions match your filters"}
              </p>
              <p className="text-xs text-muted-foreground">
                {commissions.length === 0 
                  ? "Commissions will appear here when property sales are completed"
                  : "Try adjusting your search or filter criteria"}
              </p>
            </div>
          ) : (
            filteredCommissions.map((commission) => (
              <div
                key={commission.id}
                className="p-4 space-y-3 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => router.push(`/details/commissions/${commission.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{commission.dealerName}</p>
                    <p className="text-xs text-muted-foreground truncate">{commission.dealerId}</p>
                  </div>
                  <Badge variant={commission.status === "paid" ? "default" : "secondary"}>{commission.status}</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Property:</span>
                    <span className="text-foreground truncate ml-2">{commission.propertyName}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Sale Amount:</span>
                    <span className="font-medium text-foreground">Rs {commission.saleAmount.toLocaleString("en-PK")}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Rate:</span>
                    <span>{commission.commissionRate}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Commission:</span>
                    <span className="font-semibold text-success">Rs {commission.commissionAmount.toLocaleString("en-PK")}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Date: {new Date(commission.date).toLocaleDateString()}</span>
                    <Badge variant="outline" className="text-xs">{commission.transactionType}</Badge>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        </div>
      </Card>
    </div>
  )
}
