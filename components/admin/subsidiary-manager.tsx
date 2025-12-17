"use client"

import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Loader2, PlusCircle, Edit3, Trash2, RefreshCw, Building2 } from "lucide-react"
import { useDropdownOptions } from "@/hooks/use-dropdowns"

type SubsidiaryForm = {
  label: string
  value: string
  sortOrder: number
}

export function SubsidiaryManager() {
  const { toast } = useToast()
  const { options, isLoading: loadingOptions, mutate: refreshOptions } = useDropdownOptions("property.subsidiary")
  const [newSubsidiary, setNewSubsidiary] = useState<SubsidiaryForm>({ label: "", value: "", sortOrder: 0 })
  const [editingSubsidiaryId, setEditingSubsidiaryId] = useState<string | null>(null)
  const [editingPayload, setEditingPayload] = useState<SubsidiaryForm>({ label: "", value: "", sortOrder: 0 })
  const [busy, setBusy] = useState(false)

  const sortedSubsidiaries = options.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

  const handleAddSubsidiary = async () => {
    if (!newSubsidiary.label.trim()) {
      toast({ title: "Subsidiary name is required", variant: "destructive" })
      return
    }

    setBusy(true)
    try {
      await apiService.advanced.createOption("property.subsidiary", {
        label: newSubsidiary.label.trim(),
        value: newSubsidiary.label.trim(),
        sortOrder: newSubsidiary.sortOrder,
      })
      toast({ title: "Subsidiary added successfully" })
      setNewSubsidiary({ label: "", value: "", sortOrder: 0 })
      await refreshOptions()
    } catch (error: any) {
      toast({
        title: "Failed to add subsidiary",
        description: error?.response?.data?.error || error?.message || "Try again",
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  const startEditing = (subsidiary: any) => {
    setEditingSubsidiaryId(subsidiary.id)
    setEditingPayload({
      label: subsidiary.label,
      value: subsidiary.value,
      sortOrder: subsidiary.sortOrder ?? 0,
    })
  }

  const handleSaveEdit = async () => {
    if (!editingSubsidiaryId) return

    if (!editingPayload.label.trim()) {
      toast({ title: "Subsidiary name is required", variant: "destructive" })
      return
    }

    setBusy(true)
    try {
      await apiService.advanced.updateOption(editingSubsidiaryId, {
        label: editingPayload.label.trim(),
        value: editingPayload.label.trim(),
        sortOrder: editingPayload.sortOrder,
      })
      toast({ title: "Subsidiary updated" })
      setEditingSubsidiaryId(null)
      await refreshOptions()
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error?.response?.data?.error || error?.message || "Try again",
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteSubsidiary = async (id: string) => {
    if (!window.confirm("Remove this subsidiary?")) return
    setBusy(true)
    try {
      await apiService.advanced.deleteOption(id)
      toast({ title: "Subsidiary removed" })
      await refreshOptions()
    } catch (error: any) {
      toast({
        title: "Deletion failed",
        description: error?.response?.data?.error || error?.message || "Try again",
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  // Ensure property.subsidiary category exists
  useEffect(() => {
    const ensureCategory = async () => {
      try {
        await apiService.advanced.getDropdownByKey("property.subsidiary")
      } catch (error: any) {
        // Category doesn't exist, create it
        if (error?.response?.status === 404) {
          try {
            await apiService.advanced.createCategory({
              key: "property.subsidiary",
              name: "Property Subsidiary",
              description: "Property subsidiary options for properties and clients",
            })
          } catch (createError) {
            // Ignore if already exists or permission denied
          }
        }
      }
    }
    ensureCategory()
  }, [])

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-5 w-5 text-primary" />
            <p className="text-sm font-semibold text-muted-foreground">Subsidiary Management</p>
          </div>
          <h2 className="text-2xl font-bold">Property Subsidiary</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage property subsidiary options for properties and clients.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refreshOptions()}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Separator />

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-4">
          <Label>Existing Subsidiaries</Label>
          {loadingOptions && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading subsidiaries...
            </div>
          )}
          {!loadingOptions && sortedSubsidiaries.length === 0 && (
            <div className="text-center py-8 border rounded-lg">
              <Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No subsidiaries added yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add your first subsidiary using the form on the right</p>
            </div>
          )}
          <div className="space-y-3">
            {!loadingOptions &&
              sortedSubsidiaries.map((subsidiary) => {
                const isEditing = editingSubsidiaryId === subsidiary.id
                return (
                  <div
                    key={subsidiary.id}
                    className="grid gap-2 rounded-2xl border border-border p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
                  >
                    <div className="space-y-1">
                      {isEditing ? (
                        <div className="space-y-2">
                          <Input
                            className="h-8 text-xs"
                            placeholder="Subsidiary name"
                            value={editingPayload.label}
                            onChange={(event) => {
                              const name = event.target.value
                              setEditingPayload((prev) => ({
                                ...prev,
                                label: name,
                                value: name,
                              }))
                            }}
                          />
                          <Input
                            className="h-8 text-xs w-24"
                            type="number"
                            placeholder="Order"
                            value={editingPayload.sortOrder}
                            onChange={(event) =>
                              setEditingPayload((prev) => ({
                                ...prev,
                                sortOrder: Number(event.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">{subsidiary.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Order: {subsidiary.sortOrder ?? 0}</p>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      {isEditing ? (
                        <>
                          <Button onClick={handleSaveEdit} size="sm" disabled={busy}>
                            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingSubsidiaryId(null)}
                            disabled={busy}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditing(subsidiary)}
                            title="Edit subsidiary"
                            disabled={busy}
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSubsidiary(subsidiary.id)}
                            title="Delete subsidiary"
                            disabled={busy}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2 rounded-2xl border border-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add New Subsidiary</p>
            <div className="space-y-2">
              <Label className="text-xs">Subsidiary Name</Label>
              <Input
                placeholder="e.g., ABC Realty Subsidiary"
                value={newSubsidiary.label}
                onChange={(event) => {
                  const name = event.target.value
                  setNewSubsidiary((prev) => ({
                    ...prev,
                    label: name,
                    value: name,
                  }))
                }}
              />
              <p className="text-xs text-muted-foreground">
                Enter the name of the property subsidiary
              </p>
              <p className="text-xs text-muted-foreground font-medium">Examples:</p>
              <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                <li>ABC Realty Subsidiary</li>
                <li>XYZ Properties Ltd</li>
                <li>Main Subsidiary</li>
              </ul>
            </div>
            <div className="space-y-2 mt-4">
              <Label className="text-xs">Sort Order</Label>
              <Input
                placeholder="0"
                type="number"
                value={newSubsidiary.sortOrder}
                onChange={(event) =>
                  setNewSubsidiary((prev) => ({ ...prev, sortOrder: Number(event.target.value) || 0 }))
                }
              />
            </div>
            <Button
              className="w-full mt-4"
              size="sm"
              onClick={handleAddSubsidiary}
              disabled={busy || !newSubsidiary.label.trim()}
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Subsidiary
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

