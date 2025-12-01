"use client"

import { useState } from "react"
import { DropdownManager } from "@/components/admin/dropdown-manager"
import { AmenitiesManager } from "@/components/admin/amenities-manager"
import { BulkExport } from "@/components/admin/bulk-export"
import { BulkImport } from "@/components/admin/bulk-import"
import { BulkExcelExport } from "@/components/admin/bulk-excel-export"
import { BulkExcelImport } from "@/components/admin/bulk-excel-import"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"

export function AdvancedOptionsPage() {
  const [defaultRows, setDefaultRows] = useState(25)
  const [auditEnabled, setAuditEnabled] = useState(true)

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-6">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Advanced Options</p>
          <h1 className="text-3xl font-bold">System configuration hub</h1>
          <p className="text-sm text-muted-foreground">
            Update dropdown catalogs, amenities, and bulk data operations from a single admin console.
          </p>
        </div>
      </Card>

      <DropdownManager />

      <AmenitiesManager />

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-4">CSV Export/Import</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <BulkExport />
            <BulkImport />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold mb-4">Excel Export/Import (Multi-Sheet)</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <BulkExcelExport />
            <BulkExcelImport />
          </div>
        </div>
      </div>

      <Card className="space-y-4 p-6">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Other Options (future)</p>
          <h2 className="text-2xl font-bold">Defaults & audit toggles</h2>
        </div>
        <Separator />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Default rows per page</Label>
            <Input
              type="number"
              value={defaultRows}
              min={5}
              onChange={(event) => setDefaultRows(Number(event.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">
              Controls pagination defaults across dashboards. (Preview only - not yet persisted.)
            </p>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span>Audit log streaming</span>
              <Switch checked={auditEnabled} onCheckedChange={(value) => setAuditEnabled(Boolean(value))} />
            </Label>
            <p className="text-xs text-muted-foreground">
              When enabled, future releases will automatically stream audit logs to the UI.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

