"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Download, Filter } from "lucide-react"
import { format } from "date-fns"
import { apiService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"

interface ClientLedgerPageProps {
  clientId: string
  clientName?: string
}

interface LedgerEntry {
  id: string
  date: string | Date
  description?: string
  debit: number
  credit: number
  runningBalance: number
  propertyName?: string
  dealTitle?: string
  paymentType?: string
  paymentMode?: string
}

export function ClientLedgerPage({ clientId, clientName }: ClientLedgerPageProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [filter, setFilter] = useState<'all' | 'thisMonth'>('all')
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const [properties, setProperties] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    loadLedgerData()
    loadProperties()
  }, [clientId, filter, selectedPropertyId])

  const loadProperties = async () => {
    try {
      const response: any = await apiService.properties.getAll()
      const data = response?.data?.data || response?.data || []
      const props = Array.isArray(data) 
        ? data.map((p: any) => ({ id: p.id, name: p.name || p.address || 'Unnamed Property' }))
        : []
      setProperties(props)
    } catch (error) {
      console.error('Failed to load properties:', error)
    }
  }

  const loadLedgerData = async () => {
    try {
      setLoading(true)
      const params: any = {
        period: filter,
      }
      if (selectedPropertyId) {
        params.propertyId = selectedPropertyId
      }

      const response: any = await apiService.ledgers.clientById(clientId, params)
      const data = response?.data?.data || response?.data || []
      setEntries(Array.isArray(data) ? data : [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load client ledger",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    // Create CSV content
    const headers = ['Date', 'Description', 'Property', 'Deal', 'Debit', 'Credit', 'Balance']
    const rows = entries.map(entry => [
      format(new Date(entry.date), 'yyyy-MM-dd'),
      entry.description || '',
      entry.propertyName || '',
      entry.dealTitle || '',
      entry.debit.toFixed(2),
      entry.credit.toFixed(2),
      entry.runningBalance.toFixed(2),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `client-ledger-${clientId}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Success",
      description: "Ledger exported successfully",
    })
  }

  const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0)
  const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0)
  const finalBalance = entries.length > 0 ? entries[entries.length - 1].runningBalance : 0

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Client Ledger {clientName && `- ${clientName}`}</CardTitle>
              <CardDescription>All credit and debit entries with running balance</CardDescription>
            </div>
            <Button onClick={handleExport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Filter Period</Label>
              <Select value={filter} onValueChange={(val: 'all' | 'thisMonth') => setFilter(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Filter by Property</Label>
              <Select value={selectedPropertyId || "all"} onValueChange={(val) => setSelectedPropertyId(val === "all" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {properties.map((prop) => (
                    <SelectItem key={prop.id} value={prop.id}>
                      {prop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={loadLedgerData} variant="outline" className="w-full">
                <Filter className="h-4 w-4 mr-2" />
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Debit</div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalDebit)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Credit</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalCredit)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Final Balance</div>
            <div className={`text-2xl font-bold ${finalBalance >= 0 ? 'text-primary' : 'text-orange-600'}`}>
              {formatCurrency(finalBalance)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Entries</div>
            <div className="text-2xl font-bold">{entries.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Ledger Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ledger Entries</CardTitle>
          <CardDescription>Date-wise sorted list of all transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No ledger entries found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Deal</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{format(new Date(entry.date), "PPP")}</TableCell>
                      <TableCell>{entry.description || '—'}</TableCell>
                      <TableCell>{entry.propertyName || '—'}</TableCell>
                      <TableCell>{entry.dealTitle || '—'}</TableCell>
                      <TableCell>
                        {entry.paymentType && (
                          <Badge variant="outline">{entry.paymentType}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${entry.runningBalance >= 0 ? 'text-primary' : 'text-orange-600'}`}>
                        {formatCurrency(entry.runningBalance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

