"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Mail, Phone, MapPin, DollarSign, Loader2, User } from "lucide-react"
import { apiService } from "@/lib/api"

export function SellersView() {
  const [searchQuery, setSearchQuery] = useState("")
  const [sellers, setSellers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSellers()
  }, [])

  const fetchSellers = async () => {
    try {
      setLoading(true)
      setError(null)
      const response: any = await apiService.properties.getAll()
      // Backend returns { success: true, data: [...] }
      const responseData = response.data as any
      const propertiesData = Array.isArray(responseData?.data) ? responseData.data : Array.isArray(responseData) ? responseData : []
      
      // Extract seller information from properties (ownerName, ownerPhone, etc.)
      const sellersList = Array.isArray(propertiesData)
        ? propertiesData
            .filter((property: any) => property.ownerName || property.ownerPhone)
            .map((property: any) => ({
              id: property.id,
              name: property.ownerName || "N/A",
              phone: property.ownerPhone || "",
              email: property.ownerEmail || "",
              address: property.address || "",
              propertyName: property.name,
              propertyId: property.id,
              totalCommissions: 0, // Can be calculated from sales
              totalSales: 0, // Can be calculated from sales
            }))
        : []
      
      // Get sales data to calculate commissions
      try {
        const salesResponse: any = await apiService.sales.getAll()
        const salesData = salesResponse?.data?.data || salesResponse?.data || []
        
        // Calculate commissions and sales for each seller
        const sellersWithStats = sellersList.map((seller: any) => {
          const sellerSales = Array.isArray(salesData)
            ? salesData.filter((sale: any) => sale.propertyId === seller.propertyId)
            : []
          
          const totalCommissions = sellerSales.reduce((sum: number, sale: any) => {
            return sum + (sale.commission || 0)
          }, 0)
          
          const totalSales = sellerSales.reduce((sum: number, sale: any) => {
            return sum + (sale.saleValue || sale.salePrice || 0)
          }, 0)
          
          return {
            ...seller,
            totalCommissions,
            totalSales,
            salesCount: sellerSales.length,
          }
        })
        
        setSellers(sellersWithStats)
      } catch (salesErr) {
        console.error("Failed to fetch sales for seller stats:", salesErr)
        setSellers(sellersList)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || "Failed to fetch sellers")
      setSellers([])
    } finally {
      setLoading(false)
    }
  }

  const filteredSellers = (sellers || []).filter((seller) => {
    const name = seller.name || ""
    const email = seller.email || ""
    const phone = seller.phone || ""
    const searchLower = searchQuery.toLowerCase()
    return (
      name.toLowerCase().includes(searchLower) ||
      email.toLowerCase().includes(searchLower) ||
      phone.toLowerCase().includes(searchLower) ||
      seller.propertyName?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sellers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">{error}</div>
      ) : filteredSellers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No sellers found</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredSellers.map((seller) => (
          <Card key={seller.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-lg">{seller.name || "N/A"}</h3>
                <Badge variant="outline" className="mt-2">
                  Seller
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              {seller.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{seller.email}</span>
                </div>
              )}
              {seller.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{seller.phone}</span>
                </div>
              )}
              {seller.address && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{seller.address}</span>
                </div>
              )}
              {seller.propertyName && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Property: {seller.propertyName}</span>
                </div>
              )}
              {(seller.totalSales > 0 || seller.totalCommissions > 0) && (
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Sales Statistics</p>
                  {seller.salesCount > 0 && (
                    <p className="text-sm text-foreground">
                      <strong>Total Sales:</strong> {seller.salesCount}
                    </p>
                  )}
                  {seller.totalSales > 0 && (
                    <p className="text-sm text-foreground">
                      <strong>Total Sale Value:</strong> Rs {seller.totalSales.toLocaleString()}
                    </p>
                  )}
                  {seller.totalCommissions > 0 && (
                    <p className="text-sm text-foreground">
                      <strong>Total Commissions:</strong> Rs {seller.totalCommissions.toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </Card>
          ))}
        </div>
      )}
    </div>
  )
}






