"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search } from "lucide-react"
import { apiService } from "@/lib/api"

type LedgerTab = "clients" | "properties" | "company"

export function EnhancedLedgers() {
  const [activeTab, setActiveTab] = useState<LedgerTab>("clients")
  const [clientRows, setClientRows] = useState<any[]>([])
  const [propertyRows, setPropertyRows] = useState<any[]>([])
  const [companyLedger, setCompanyLedger] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLedgerData()
  }, [activeTab])

  const fetchLedgerData = async () => {
    try {
      setLoading(true)
      setError(null)
      if (activeTab === "clients") {
        const response = await apiService.ledgers.clients()
        const data = Array.isArray(response.data) ? response.data : []
        setClientRows(data)
      } else if (activeTab === "properties") {
        const response = await apiService.ledgers.properties()
        const data = Array.isArray(response.data) ? response.data : []
        setPropertyRows(data)
      } else {
        const response = await apiService.ledgers.company()
        setCompanyLedger(response.data || null)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch ledger data")
      setClientRows([])
      setPropertyRows([])
      setCompanyLedger(null)
    } finally {
      setLoading(false)
    }
  }

  const filteredClientRows = useMemo(() => {
    const query = searchQuery.toLowerCase()
    if (!query) return clientRows
    return clientRows.filter((row) => {
      return (
        row.paymentId?.toLowerCase().includes(query) ||
        row.dealTitle?.toLowerCase().includes(query) ||
        row.clientName?.toLowerCase().includes(query) ||
        row.propertyName?.toLowerCase().includes(query)
      )
    })
  }, [clientRows, searchQuery])

  const filteredPropertyRows = useMemo(() => {
    const query = searchQuery.toLowerCase()
    if (!query) return propertyRows
    return propertyRows.filter((row) =>
      row.propertyName?.toLowerCase().includes(query) ||
      row.propertyCode?.toLowerCase().includes(query),
    )
  }, [propertyRows, searchQuery])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-md border border-input p-1 text-sm font-medium">
          {[
            { label: "Client Ledger", value: "clients" },
            { label: "Property Ledger", value: "properties" },
            { label: "Company Ledger", value: "company" },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value as LedgerTab)}
              className={`rounded-sm px-3 py-1 ${
                activeTab === tab.value ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {(activeTab === "clients" || activeTab === "properties") && (
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={`Search ${activeTab === "clients" ? "payments" : "properties"}...`}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-8"
            />
          </div>
        )}
      </div>

      {loading ? (
        <Card className="p-10 text-center text-muted-foreground">
          <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
          Loading ledger data...
        </Card>
      ) : error ? (
        <Card className="p-10 text-center text-destructive">{error}</Card>
      ) : (
        <>
          {activeTab === "clients" && (
            <Card className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment</TableHead>
                      <TableHead>Deal</TableHead>
                      <TableHead>Client / Property</TableHead>
                      <TableHead>Payment Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClientRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                          No payments found for the selected filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredClientRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{row.paymentId || "Deal Opening"}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{row.dealTitle}</span>
                              <span className="text-xs text-muted-foreground">Deal ID: {row.dealId}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{row.clientName}</span>
                              <span className="text-xs text-muted-foreground">{row.propertyName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-sm">
                              <span className="capitalize">{row.paymentType}</span>
                              <span className="text-xs text-muted-foreground">{row.paymentMode?.replace("_", " ")}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {row.amount ? `Rs ${Number(row.amount).toLocaleString("en-PK")}` : "Rs 0"}
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {row.outstanding ? `Rs ${Number(row.outstanding).toLocaleString("en-PK")}` : "Rs 0"}
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {new Date(row.date).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}

          {activeTab === "properties" && (
            <div className="space-y-4">
              {filteredPropertyRows.length === 0 ? (
                <Card className="p-10 text-center text-muted-foreground">No property ledger data available.</Card>
              ) : (
                filteredPropertyRows.map((property) => (
                  <Card key={property.propertyId || property.propertyName} className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{property.propertyName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {property.propertyCode ? `Code: ${property.propertyCode}` : "No property code"}
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-right text-sm">
                        <div>
                          <p className="text-muted-foreground">Deal Value</p>
                          <p className="font-semibold">
                            {property.totalDealAmount ? `Rs ${Number(property.totalDealAmount).toLocaleString("en-PK")}` : "Rs 0"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Received</p>
                          <p className="font-semibold text-primary">
                            {property.totalReceived ? `Rs ${Number(property.totalReceived).toLocaleString("en-PK")}` : "Rs 0"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Outstanding</p>
                          <p className="font-semibold text-destructive">
                            {property.outstanding ? `Rs ${Number(property.outstanding).toLocaleString("en-PK")}` : "Rs 0"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Deal</TableHead>
                            <TableHead>Payment ID</TableHead>
                            <TableHead>Mode</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {property.payments.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                                No payments recorded for this property.
                              </TableCell>
                            </TableRow>
                          ) : (
                            property.payments.map((payment: any) => (
                              <TableRow key={payment.id}>
                                <TableCell className="font-medium">{payment.dealTitle}</TableCell>
                                <TableCell>{payment.paymentId}</TableCell>
                                <TableCell className="capitalize">{payment.paymentMode?.replace("_", " ")}</TableCell>
                                <TableCell className="text-right">
                                  {payment.amount ? `Rs ${Number(payment.amount).toLocaleString("en-PK")}` : "Rs 0"}
                                </TableCell>
                                <TableCell className="text-right text-sm text-muted-foreground">
                                  {new Date(payment.date).toLocaleDateString()}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === "company" && companyLedger && (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-4">
                <SummaryCard title="Cash Account" value={companyLedger.summary?.cashBalance ?? 0} />
                <SummaryCard title="Bank Account" value={companyLedger.summary?.bankBalance ?? 0} />
                <SummaryCard title="Receivables" value={companyLedger.summary?.receivables ?? 0} muted />
                <SummaryCard title="Payables" value={companyLedger.summary?.payables ?? 0} muted />
              </div>
              <Card className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Deal</TableHead>
                        <TableHead>Debit</TableHead>
                        <TableHead>Credit</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Payment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companyLedger.entries?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                            No ledger entries found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        companyLedger.entries.map((entry: any) => (
                          <TableRow key={entry.id}>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(entry.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{entry.dealTitle || "Deal Settlement"}</span>
                                <span className="text-xs text-muted-foreground">
                                  {entry.clientName} • {entry.propertyName}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{entry.accountDebit}</TableCell>
                            <TableCell>{entry.accountCredit}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {entry.amount ? `Rs ${Number(entry.amount).toLocaleString("en-PK")}` : "Rs 0"}
                            </TableCell>
                            <TableCell>
                              {entry.paymentId ? (
                                <Badge variant="secondary">{entry.paymentId}</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">Auto entry</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SummaryCard({
  title,
  value,
  muted = false,
}: {
  title: string
  value: number
  muted?: boolean
}) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className={`text-2xl font-semibold ${muted ? "text-muted-foreground" : "text-foreground"}`}>
        {value ? `Rs ${Number(value).toLocaleString("en-PK")}` : "Rs 0"}
      </p>
    </Card>
  )
}

