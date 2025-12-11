"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowLeft,
  Building2,
  Download,
  FileText,
  Home,
  Loader2,
  MapPin,
  Printer,
  Receipt,
  Users,
  User,
  Phone,
  DollarSign,
} from "lucide-react"
import { apiService } from "@/lib/api"
import { downloadJSON, formatCurrency } from "@/lib/utils"

type PropertyResponse = {
  id: string | number
  name?: string
  propertyCode?: string
  manualUniqueId?: string
  type?: string
  status?: string
  address?: string
  location?: string
  totalArea?: number
  units?: number | any[]
  occupied?: number
  yearBuilt?: string | number
  salePrice?: number | string
  ownerName?: string
  ownerPhone?: string
  dealerName?: string
  dealerContact?: string
  financeSummary?: {
    totalReceived?: number
    totalExpenses?: number
    pendingAmount?: number
    entries?: number
  }
  deals?: Array<{
    id?: string | number
    title?: string
    stage?: string
    amount?: number
    contactName?: string
    contactPhone?: string
  }>
}

const formatArea = (sqFt?: number) => {
  if (!sqFt) return "N/A"
  if (sqFt >= 5445) {
    const kanal = Math.floor(sqFt / 5445)
    const remainingMarla = Math.round((sqFt % 5445) / 272.25)
    return remainingMarla > 0 ? `${kanal} Kanal ${remainingMarla} Marla (${sqFt.toLocaleString()} sq ft)` : `${kanal} Kanal (${sqFt.toLocaleString()} sq ft)`
  }
  const marla = Math.round(sqFt / 272.25)
  return `${marla} Marla (${sqFt.toLocaleString()} sq ft)`
}

export function PropertyDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const propertyId = params?.id

  const [property, setProperty] = useState<PropertyResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

  useEffect(() => {
    if (propertyId) {
      fetchProperty()
    }
  }, [propertyId])

  const fetchProperty = async () => {
    try {
      setLoading(true)
      setError(null)
      const response: any = await apiService.properties.getById(String(propertyId))
      const data = response?.data?.data || response?.data || null
      setProperty(data)
    } catch (err: any) {
      console.error("Failed to fetch property", err)
      setError(err?.response?.data?.message || err?.message || "Failed to load property")
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => window.print()

  const handleDownloadJson = () => {
    if (!property) return
    const name = property.name?.replace(/\s+/g, "-").toLowerCase() || "property"
    downloadJSON(property, `${name}-${propertyId}`)
  }

  const handleGenerateReport = async () => {
    if (!propertyId) return
    try {
      setReportLoading(true)
      const response = await apiService.properties.getReport(String(propertyId))
      const blob = new Blob([response.data as Blob], { type: "application/pdf" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${(property?.name || "property").replace(/\s+/g, "-").toLowerCase()}-report.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Failed to generate property report", err)
    } finally {
      setReportLoading(false)
    }
  }

  const metrics = useMemo(() => {
    const unitsValue =
      typeof property?.units === "number" ? property.units : Array.isArray(property?.units) ? property?.units.length : 0
    return [
      {
        label: "Type",
        value: property?.type || "N/A",
        icon: Building2,
      },
      {
        label: "Status",
        value: property?.status || "N/A",
        icon: Receipt,
      },
      {
        label: "Address",
        value: property?.address || "Address not provided",
        icon: MapPin,
      },
      {
        label: "Total Area",
        value: formatArea(property?.totalArea),
        icon: Home,
      },
      {
        label: "Units",
        value: unitsValue ?? 0,
        icon: Users,
      },
      {
        label: "Sale Price",
        value:
          property?.salePrice !== undefined && property?.salePrice !== null
            ? `Rs ${Number(property.salePrice).toLocaleString("en-IN")}`
            : "N/A",
        icon: DollarSign,
      },
      {
        label: "Year Built",
        value: property?.yearBuilt || "N/A",
        icon: Receipt,
      },
    ]
  }, [property])

  const deals = useMemo(() => (Array.isArray(property?.deals) ? property?.deals : []), [property])
  const financeSummary = property?.financeSummary || {}

  const renderSkeleton = () => (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-full" />
          </Card>
        ))}
      </div>
      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
      <Card className="p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </Card>
    </div>
  )

  if (loading) {
    return renderSkeleton()
  }

  if (error || !property) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <p className="text-lg font-semibold text-foreground">Property Details</p>
          </div>
        </div>
        <Card className="p-6">
          <p className="text-destructive">{error || "Property not found"}</p>
          <Button className="mt-4" onClick={fetchProperty}>
            Retry
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button variant="ghost" size="sm" onClick={() => router.push("/properties")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to list
            </Button>
            {property.propertyCode && (
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                Code: {property.propertyCode}
              </span>
            )}
            {property.manualUniqueId && (
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                Manual ID: {property.manualUniqueId}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground leading-tight">{property.name || "Property Details"}</h1>
            <Badge variant="secondary">{property.type || "N/A"}</Badge>
            <Badge
              variant={
                property.status === "Active"
                  ? "default"
                  : property.status === "Maintenance"
                    ? "destructive"
                    : property.status === "For Sale"
                      ? "secondary"
                      : "outline"
              }
            >
              {property.status || "N/A"}
            </Badge>
          </div>
          <p className="text-muted-foreground">{property.location || property.address || "No location provided"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print / Save as PDF
          </Button>
          <Button variant="outline" onClick={handleGenerateReport} disabled={reportLoading}>
            <FileText className="h-4 w-4 mr-2" />
            {reportLoading ? "Preparing..." : "Generate Report"}
          </Button>
          <Button variant="outline" onClick={handleDownloadJson}>
            <Download className="h-4 w-4 mr-2" />
            Download JSON
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-3">
          {metrics.map((metric) => {
            const Icon = metric.icon
            return (
              <div key={metric.label} className="flex gap-3 rounded-lg border border-border/60 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                  <p className="text-base font-semibold text-foreground">{metric.value}</p>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Basic Information</p>
              <p className="text-sm text-muted-foreground">Overview of the property details</p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="grid grid-cols-[140px,1fr] gap-2 text-sm">
                <span className="text-muted-foreground">Property Type</span>
                <span className="font-medium text-foreground">{property.type || "N/A"}</span>
              </div>
              <div className="grid grid-cols-[140px,1fr] gap-2 text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium text-foreground">{property.status || "N/A"}</span>
              </div>
              <div className="grid grid-cols-[140px,1fr] gap-2 text-sm">
                <span className="text-muted-foreground">Year Built</span>
                <span className="font-medium text-foreground">{property.yearBuilt || "N/A"}</span>
              </div>
              <div className="grid grid-cols-[140px,1fr] gap-2 text-sm">
                <span className="text-muted-foreground">Total Area</span>
                <span className="font-medium text-foreground">{formatArea(property.totalArea)}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-[140px,1fr] gap-2 text-sm">
                <span className="text-muted-foreground">Address</span>
                <span className="font-medium text-foreground">{property.address || "N/A"}</span>
              </div>
              <div className="grid grid-cols-[140px,1fr] gap-2 text-sm">
                <span className="text-muted-foreground">Units</span>
                <span className="font-medium text-foreground">
                  {typeof property.units === "number"
                    ? property.units
                    : Array.isArray(property.units)
                      ? property.units.length
                      : "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-[140px,1fr] gap-2 text-sm">
                <span className="text-muted-foreground">Sale Price</span>
                <span className="font-medium text-foreground">
                  {property.salePrice !== undefined && property.salePrice !== null
                    ? `Rs ${Number(property.salePrice).toLocaleString("en-IN")}`
                    : "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-[140px,1fr] gap-2 text-sm">
                <span className="text-muted-foreground">Occupied Units</span>
                <span className="font-medium text-foreground">{property.occupied ?? 0}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Finance Summary</p>
              <p className="text-sm text-muted-foreground">Latest financial breakdown</p>
            </div>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
              <span className="text-muted-foreground text-sm">Total Received</span>
              <span className="text-base font-semibold text-foreground">
                {formatCurrency(financeSummary.totalReceived || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
              <span className="text-muted-foreground text-sm">Total Expenses</span>
              <span className="text-base font-semibold text-foreground">
                {formatCurrency(financeSummary.totalExpenses || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
              <span className="text-muted-foreground text-sm">Pending Amount</span>
              <span className="text-base font-semibold text-foreground">
                {formatCurrency(financeSummary.pendingAmount || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
              <span className="text-muted-foreground text-sm">Entries</span>
              <span className="text-base font-semibold text-foreground">{financeSummary.entries ?? 0}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Running Deals</p>
            <p className="text-sm text-muted-foreground">Active opportunities linked to this property</p>
          </div>
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="rounded-lg border border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Contact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No running deals
                  </TableCell>
                </TableRow>
              )}
              {deals.map((deal) => (
                <TableRow key={deal.id || deal.title}>
                  <TableCell className="font-medium text-foreground">{deal.title || "Untitled Deal"}</TableCell>
                  <TableCell>{deal.stage || "N/A"}</TableCell>
                  <TableCell>{formatCurrency(deal.amount || 0)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{deal.contactName || "N/A"}</span>
                      {deal.contactPhone && <span className="text-xs text-muted-foreground">{deal.contactPhone}</span>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Ownership & Contacts</p>
            <p className="text-sm text-muted-foreground">Primary stakeholders and contact details</p>
          </div>
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex gap-3 rounded-lg border border-border/60 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Owner</p>
              <p className="text-foreground">{property.ownerName || "N/A"}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{property.ownerPhone || "No phone provided"}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 rounded-lg border border-border/60 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Dealer</p>
              <p className="text-foreground">{property.dealerName || "N/A"}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{property.dealerContact || "No contact provided"}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

