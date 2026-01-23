"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Download, Loader2 } from "lucide-react"
import { apiService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export type ExportFormat = "pdf" | "excel" | "csv" | "word"
export type ExportScope = "VIEW" | "FILTERED" | "ALL"

export interface DownloadReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  module: string
  moduleDisplayName?: string
  filters?: Record<string, any>
  search?: string
  sort?: { field: string; direction: "asc" | "desc" }
  pagination?: { page: number; pageSize: number }
  hasAdminPermission?: boolean
}

export function DownloadReportDialog({
  open,
  onOpenChange,
  module,
  moduleDisplayName,
  filters = {},
  search,
  sort,
  pagination,
  hasAdminPermission = false,
}: DownloadReportDialogProps) {
  const { toast } = useToast()
  const [format, setFormat] = useState<ExportFormat>("excel")
  const [scope, setScope] = useState<ExportScope>("FILTERED")
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    try {
      setDownloading(true)

      const payload = {
        module,
        format,
        scope,
        filters,
        search,
        sort,
        ...(scope === "VIEW" && pagination ? { pagination } : {}),
      }

      const response = await apiService.post("/export", payload, {
        responseType: "blob",
      })

      // Create blob and download
      const blob = new Blob([response.data], {
        type: response.headers["content-type"] || "application/octet-stream",
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers["content-disposition"]
      let filename = `${module}-${new Date().toISOString().split("T")[0]}.${format === "excel" ? "xlsx" : format === "word" ? "xlsx" : format}`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: "Export started",
        description: `Downloading ${moduleDisplayName || module} report...`,
      })

      onOpenChange(false)
    } catch (error: any) {
      console.error("Export error:", error)
      toast({
        title: "Export failed",
        description: error?.response?.data?.error || error?.message || "Failed to export report",
        variant: "destructive",
      })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-slot="dialog-content">
        <DialogHeader>
          <DialogTitle>Download Report</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Format:</Label>
            <RadioGroup value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="format-pdf" />
                <Label htmlFor="format-pdf" className="cursor-pointer">
                  PDF
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excel" id="format-excel" />
                <Label htmlFor="format-excel" className="cursor-pointer">
                  Excel
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="format-csv" />
                <Label htmlFor="format-csv" className="cursor-pointer">
                  CSV
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="word" id="format-word" />
                <Label htmlFor="format-word" className="cursor-pointer">
                  Word
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Scope Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Data Scope:</Label>
            <RadioGroup value={scope} onValueChange={(value) => setScope(value as ExportScope)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="VIEW" id="scope-view" />
                <Label htmlFor="scope-view" className="cursor-pointer">
                  Current View
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="FILTERED" id="scope-filtered" />
                <Label htmlFor="scope-filtered" className="cursor-pointer">
                  All Filtered Results (default)
                </Label>
              </div>
              {hasAdminPermission && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ALL" id="scope-all" />
                  <Label htmlFor="scope-all" className="cursor-pointer">
                    Full Dataset (Admin only)
                  </Label>
                </div>
              )}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={downloading}>
            Cancel
          </Button>
          <Button onClick={handleDownload} disabled={downloading}>
            {downloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
