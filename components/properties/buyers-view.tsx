"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Mail, Phone, MapPin, DollarSign, ShoppingCart, Loader2 } from "lucide-react"
import { AddBuyerDialog } from "./add-buyer-dialog"
import { apiService } from "@/lib/api"

const buyerStats = [
  {
    name: "Total Buy",
    value: 0,
    icon: ShoppingCart,
    href: "/details/buyers",
  },
  {
    name: "Pending Buy",
    value: 0,
    icon: ShoppingCart,
    href: "/details/buyers?status=pending",
  },
  {
    name: "Completed Buy",
    value: 0,
    icon: ShoppingCart,
    href: "/details/buyers?status=completed",
  },
]

export function BuyersView() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [buyers, setBuyers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchBuyers()
  }, [])

  const fetchBuyers = async () => {
    try {
      setLoading(true)
      setError(null)
      const [buyersResponse, salesResponse] = await Promise.all([
        apiService.buyers.getAll(),
        apiService.sales.getAll().catch(() => ({ data: { data: [] } }))
      ])
      
      // Backend returns { success: true, data: [...] }
      const buyersResponseData = buyersResponse as any
      const salesResponseData = salesResponse as any
      const buyersData = buyersResponseData.data?.data || buyersResponseData.data || []
      const salesData = salesResponseData.data?.data || salesResponseData.data || []
      
      // Map buyers with their purchase information
      const buyersWithPurchases = Array.isArray(buyersData) ? buyersData.map((buyer: any) => {
        // Find sales where this buyer is involved
        const buyerSales = Array.isArray(salesData) ? salesData.filter((sale: any) => {
          if (Array.isArray(sale.buyers)) {
            return sale.buyers.some((b: any) => b.id === buyer.id || b.buyerId === buyer.id)
          }
          return sale.buyerId === buyer.id || sale.buyer === buyer.id
        }) : []
        
        const completedSale = buyerSales.find((s: any) => s.status === 'Completed' || s.status === 'completed')
        
        return {
          ...buyer,
          hasPurchased: !!completedSale,
          purchaseDate: completedSale?.saleDate,
          purchaseAmount: completedSale?.saleValue || completedSale?.salePrice,
          purchaseDealer: completedSale?.dealer?.name || completedSale?.dealer,
          purchaseProperty: completedSale?.property?.name || completedSale?.propertyName,
        }
      }) : []
      
      setBuyers(buyersWithPurchases)
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || "Failed to fetch buyers")
      setBuyers([])
    } finally {
      setLoading(false)
    }
  }

  const filteredBuyers = (buyers || []).filter((buyer) => {
    const name = buyer.name || ""
    const email = buyer.email || ""
    const searchLower = searchQuery.toLowerCase()
    return (
      name.toLowerCase().includes(searchLower) ||
      email.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {buyerStats.map((stat) => (
          <Card
            key={stat.name}
            className="p-6 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
            onClick={() => router.push(stat.href)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <stat.icon className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search buyers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Buyer
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">{error}</div>
      ) : filteredBuyers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No buyers found</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredBuyers.map((buyer) => (
          <Card key={buyer.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-lg">{buyer.name || "N/A"}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="default">
                    {buyer.buyStatus || buyer.status || "Pending"}
                  </Badge>
                  {buyer.hasPurchased && (
                    <Badge variant="default" className="bg-green-600">
                      ✓ Purchased
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{buyer.email || "-"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{buyer.phone || "-"}</span>
              </div>
              {buyer.hasPurchased && (
                <>
                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-xs font-semibold text-green-700 dark:text-green-300 mb-2">Purchase Information</p>
                    {buyer.purchaseProperty && (
                      <p className="text-sm text-green-900 dark:text-green-100">
                        <strong>Property:</strong> {buyer.purchaseProperty}
                      </p>
                    )}
                    {buyer.purchaseDate && (
                      <p className="text-sm text-green-900 dark:text-green-100">
                        <strong>Date:</strong> {new Date(buyer.purchaseDate).toLocaleDateString()}
                      </p>
                    )}
                    {buyer.purchaseAmount && (
                      <p className="text-sm text-green-900 dark:text-green-100">
                        <strong>Amount:</strong> Rs {buyer.purchaseAmount.toLocaleString()}
                      </p>
                    )}
                    {buyer.purchaseDealer && (
                      <p className="text-sm text-green-900 dark:text-green-100">
                        <strong>Dealer:</strong> {buyer.purchaseDealer}
                      </p>
                    )}
                  </div>
                </>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>Buy Value: {buyer.buyValue ? `Rs ${buyer.buyValue.toLocaleString()}` : buyer.budget || "-"}</span>
              </div>
              {buyer.property && !buyer.hasPurchased && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Property: {buyer.property?.name || buyer.property || "-"}</span>
                </div>
              )}
            </div>
          </Card>
          ))}
        </div>
      )}

      <AddBuyerDialog open={showAddDialog} onOpenChange={setShowAddDialog} onSuccess={fetchBuyers} />
    </div>
  )
}
