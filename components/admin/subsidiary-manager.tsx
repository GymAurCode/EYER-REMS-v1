"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Plus, Edit3, Trash2, RefreshCw, Building2, ChevronDown, ChevronRight, X } from "lucide-react"
import { useDropdownOptions } from "@/hooks/use-dropdowns"
import { useLocationTree } from "@/hooks/use-location-tree"
import { LocationTreeNode } from "@/lib/location"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

type Subsidiary = {
  id: string
  name: string
  locationId: string
  location: {
    id: string
    name: string
    type: string
  }
  options: SubsidiaryOption[]
  createdAt: string
  updatedAt: string
}

type SubsidiaryOption = {
  id: string
  name: string
  sortOrder: number
  propertySubsidiaryId: string
}

export function SubsidiaryManager() {
  const { toast } = useToast()
  const [subsidiaries, setSubsidiaries] = useState<Subsidiary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLocationPath, setSelectedLocationPath] = useState<string>("")
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [creatingSubsidiary, setCreatingSubsidiary] = useState(false)
  const [expandedSubsidiaries, setExpandedSubsidiaries] = useState<Set<string>>(new Set())
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null)
  const [editingOptionName, setEditingOptionName] = useState("")
  const [updating, setUpdating] = useState<Record<string, boolean>>({})
  
  // New state for creating subsidiary with multiple options
  const [pendingOptions, setPendingOptions] = useState<string[]>([])
  const [newOptionInput, setNewOptionInput] = useState("")
  const [showOptionInput, setShowOptionInput] = useState(false)

  // Fetch location dropdown options
  const { options: locationOptions, isLoading: loadingLocations } = useDropdownOptions("property.location")
  const { tree: locationTree } = useLocationTree()

  useEffect(() => {
    fetchSubsidiaries()
  }, [])

  const fetchSubsidiaries = async () => {
    setLoading(true)
    try {
      const response = await apiService.subsidiaries.getAll()
      const data = (response.data as any)?.data || response.data || []
      setSubsidiaries(data)
    } catch (error: any) {
      toast({
        title: "Failed to load subsidiaries",
        description: error?.response?.data?.error || error?.message || "Try again",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Find locationId from location path by searching the location tree
  const findLocationIdByPath = (path: string, tree: LocationTreeNode[]): string | null => {
    if (!path || !tree || tree.length === 0) return null
    
    const pathParts = path.split(">").map(p => p.trim()).filter(p => p.length > 0)
    if (pathParts.length === 0) return null
    
    // Recursively search for a node that matches the full path
    const findNodeByPath = (nodes: LocationTreeNode[], parts: string[], currentIndex: number): LocationTreeNode | null => {
      if (currentIndex >= parts.length) return null
      
      const targetName = parts[currentIndex].toLowerCase()
      
      for (const node of nodes) {
        if (node.name.toLowerCase() === targetName) {
          // If this is the last part, return this node
          if (currentIndex === parts.length - 1) {
            return node
          }
          // Otherwise, continue searching in children
          if (node.children && node.children.length > 0) {
            const found = findNodeByPath(node.children, parts, currentIndex + 1)
            if (found) return found
          }
        }
      }
      
      return null
    }
    
    const foundNode = findNodeByPath(tree, pathParts, 0)
    return foundNode?.id || null
  }

  // Memoize the locationId calculation to prevent infinite loops
  const computedLocationId = useMemo(() => {
    if (!selectedLocationPath) return null
    
    // Find the location option by its value (path) and get its id
    const locationOption = locationOptions.find(opt => opt.value === selectedLocationPath)
    if (locationOption?.id) return locationOption.id
    
    // Fallback to searching the tree
    return findLocationIdByPath(selectedLocationPath, locationTree)
  }, [selectedLocationPath, locationOptions, locationTree])

  // Track previous location path to detect actual changes
  const prevLocationPathRef = useRef<string>("")
  const prevComputedIdRef = useRef<string | null>(null)

  // Update locationId and reset form when location path changes
  useEffect(() => {
    const pathChanged = prevLocationPathRef.current !== selectedLocationPath
    const computedIdChanged = prevComputedIdRef.current !== computedLocationId
    
    if (pathChanged) {
      prevLocationPathRef.current = selectedLocationPath
      // Reset form fields when location changes
      setPendingOptions([])
      setNewOptionInput("")
      setShowOptionInput(false)
    }
    
    // Update locationId if computed value changed
    if (computedIdChanged) {
      prevComputedIdRef.current = computedLocationId
      setSelectedLocationId(computedLocationId)
    }
  }, [selectedLocationPath, computedLocationId])

  const handleAddPendingOption = () => {
    if (newOptionInput.trim() && !pendingOptions.includes(newOptionInput.trim())) {
      setPendingOptions((prev) => [...prev, newOptionInput.trim()])
      setNewOptionInput("")
      setShowOptionInput(false)
    }
  }

  const handleRemovePendingOption = (index: number) => {
    setPendingOptions((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCreateSubsidiary = async () => {
    if (!selectedLocationPath || !selectedLocationId) {
      toast({
        title: "Location required",
        description: "Please select a location first",
        variant: "destructive",
      })
      return
    }

    if (pendingOptions.length === 0) {
      toast({
        title: "Options required",
        description: "Please add at least one option using the + button",
        variant: "destructive",
      })
      return
    }

    setCreatingSubsidiary(true)
    try {
      // Create subsidiary with location name (use the last part of the path)
      const pathParts = selectedLocationPath.split(">").map(p => p.trim())
      const locationName = pathParts[pathParts.length - 1] || selectedLocationPath
      const subsidiaryName = `${locationName} Subsidiary`
      
      // Create subsidiary with all options at once
      const response = await apiService.subsidiaries.create({
        locationId: selectedLocationId,
        name: subsidiaryName,
        options: pendingOptions.map((name, index) => ({
          name: name.trim(),
          sortOrder: index,
        })),
      })
      const data = (response.data as any)?.data || response.data

      // Success - reset form
      setSelectedLocationPath("")
      setSelectedLocationId(null)
      setPendingOptions([])
      setNewOptionInput("")
      setShowOptionInput(false)
      
      toast({ title: "Subsidiary created successfully" })
      await fetchSubsidiaries()
    } catch (error: any) {
      toast({
        title: "Failed to create subsidiary",
        description: error?.response?.data?.error || error?.message || "Try again",
        variant: "destructive",
      })
    } finally {
      setCreatingSubsidiary(false)
    }
  }

  // Old code - keeping for reference but not used anymore
  const handleCreateSubsidiaryOld = async () => {
    if (!selectedLocationPath || !selectedLocationId) {
      toast({
        title: "Location required",
        description: "Please select a location first",
        variant: "destructive",
      })
      return
    }

    if (pendingOptions.length === 0) {
      toast({
        title: "Options required",
        description: "Please add at least one option using the + button",
        variant: "destructive",
      })
      return
    }

    setCreatingSubsidiary(true)
    try {
      // Create subsidiary with location name (use the last part of the path)
      const pathParts = selectedLocationPath.split(">").map(p => p.trim())
      const locationName = pathParts[pathParts.length - 1] || selectedLocationPath
      const subsidiaryName = `${locationName} Subsidiary`
      
      const response = await apiService.subsidiaries.create({
        locationId: selectedLocationId,
        name: subsidiaryName,
      })
      const data = (response.data as any)?.data || response.data
      const subsidiaryId = data.id

      // Add all pending options
      for (let i = 0; i < pendingOptions.length; i++) {
        await apiService.subsidiaries.addOption(subsidiaryId, {
          name: pendingOptions[i],
          sortOrder: i,
        })
      }

      toast({ title: "Subsidiary created successfully" })
      setPendingOptions([])
      setNewOptionInput("")
      setShowOptionInput(false)
      setSelectedLocationPath("")
      setSelectedLocationId(null)
      await fetchSubsidiaries()
      // Auto-expand the newly created subsidiary
      setExpandedSubsidiaries((prev) => new Set(prev).add(subsidiaryId))
    } catch (error: any) {
      toast({
        title: "Failed to create subsidiary",
        description: error?.response?.data?.error || error?.message || "Try again",
        variant: "destructive",
      })
    } finally {
      setCreatingSubsidiary(false)
    }
  }

  const handleUpdateOption = async (optionId: string, subsidiaryId: string) => {
    if (!editingOptionName.trim()) {
      toast({
        title: "Option name required",
        variant: "destructive",
      })
      return
    }

    setUpdating((prev) => ({ ...prev, [optionId]: true }))
    try {
      await apiService.subsidiaries.updateOption(optionId, {
        name: editingOptionName.trim(),
      })
      toast({ title: "Option updated" })
      setEditingOptionId(null)
      setEditingOptionName("")
      await fetchSubsidiaries()
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error?.response?.data?.error || error?.message || "Try again",
        variant: "destructive",
      })
    } finally {
      setUpdating((prev) => {
        const next = { ...prev }
        delete next[optionId]
        return next
      })
    }
  }

  const handleDeleteOption = async (optionId: string) => {
    if (!window.confirm("Delete this option?")) return

    setUpdating((prev) => ({ ...prev, [optionId]: true }))
    try {
      await apiService.subsidiaries.deleteOption(optionId)
      toast({ title: "Option deleted" })
      await fetchSubsidiaries()
    } catch (error: any) {
      toast({
        title: "Deletion failed",
        description: error?.response?.data?.error || error?.message || "Try again",
        variant: "destructive",
      })
    } finally {
      setUpdating((prev) => {
        const next = { ...prev }
        delete next[optionId]
        return next
      })
    }
  }

  const handleDeleteSubsidiary = async (id: string) => {
    if (!window.confirm("Delete this subsidiary? All its options will also be deleted.")) return

    setUpdating((prev) => ({ ...prev, [id]: true }))
    try {
      await apiService.subsidiaries.delete(id)
      toast({ title: "Subsidiary deleted" })
      await fetchSubsidiaries()
    } catch (error: any) {
      toast({
        title: "Deletion failed",
        description: error?.response?.data?.error || error?.message || "Try again",
        variant: "destructive",
      })
    } finally {
      setUpdating((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }
  }

  const toggleExpanded = (subsidiaryId: string) => {
    setExpandedSubsidiaries((prev) => {
      const next = new Set(prev)
      if (next.has(subsidiaryId)) {
        next.delete(subsidiaryId)
      } else {
        next.add(subsidiaryId)
      }
      return next
    })
  }

  const startEditingOption = (option: SubsidiaryOption) => {
    setEditingOptionId(option.id)
    setEditingOptionName(option.name)
  }


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
            Create and manage property subsidiaries linked to locations. Each subsidiary can have multiple options.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSubsidiaries} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Separator />

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-4">
          <Label>Subsidiaries by Location</Label>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading subsidiaries...
            </div>
          )}
          {!loading && subsidiaries.length === 0 && (
            <div className="text-center py-8 border rounded-lg">
              <Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No subsidiaries added yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create your first subsidiary using the form on the right
              </p>
            </div>
          )}
          <div className="space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : subsidiaries.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No subsidiaries found. Create your first one using the form on the right.
              </p>
            ) : (
              subsidiaries.map((subsidiary) => {
                const isExpanded = expandedSubsidiaries.has(subsidiary.id)
                const isUpdating = updating[subsidiary.id] || false

                return (
                  <Collapsible
                    key={subsidiary.id}
                    open={isExpanded}
                    onOpenChange={() => toggleExpanded(subsidiary.id)}
                  >
                    <div className="border rounded-lg">
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-2 flex-1">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div className="flex-1 text-left">
                              <div className="font-semibold">{subsidiary.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {subsidiary.options.length} option
                                {subsidiary.options.length !== 1 ? "s" : ""}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSubsidiary(subsidiary.id)}
                              disabled={isUpdating}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-3 pb-3 space-y-2 border-t">
                          <div className="pt-2 space-y-2">
                            {subsidiary.options.length === 0 ? (
                              <p className="text-xs text-muted-foreground py-2">
                                No options yet.
                              </p>
                            ) : (
                              subsidiary.options.map((option) => {
                                const isEditingOption = editingOptionId === option.id
                                const isUpdatingOption = updating[option.id] || false

                                return (
                                  <div
                                    key={option.id}
                                    className="flex items-center gap-2 p-2 rounded border bg-muted/30"
                                  >
                                    {isEditingOption ? (
                                      <>
                                        <Input
                                          className="h-7 flex-1 text-xs"
                                          value={editingOptionName}
                                          onChange={(e) => setEditingOptionName(e.target.value)}
                                        />
                                        <Button
                                          size="sm"
                                          onClick={() => handleUpdateOption(option.id, subsidiary.id)}
                                          disabled={isUpdatingOption}
                                        >
                                          {isUpdatingOption ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : (
                                            "Save"
                                          )}
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setEditingOptionId(null)
                                            setEditingOptionName("")
                                          }}
                                          disabled={isUpdatingOption}
                                        >
                                          Cancel
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <span className="flex-1 text-sm">{option.name}</span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => startEditingOption(option)}
                                          disabled={isUpdatingOption}
                                        >
                                          <Edit3 className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDeleteOption(option.id)}
                                          disabled={isUpdatingOption}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                )
              })
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2 rounded-2xl border border-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Create New Subsidiary
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Location</Label>
                <Select
                  value={selectedLocationPath}
                  onValueChange={setSelectedLocationPath}
                  disabled={loadingLocations}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location from Location Management" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingLocations ? (
                      <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                        Loading locations...
                      </div>
                    ) : locationOptions.length === 0 ? (
                      <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                        No locations available. Add locations in Location Management.
                      </div>
                    ) : (
                      locationOptions.map((option) => (
                        <SelectItem key={option.id} value={option.value}>
                          {option.label.includes(">") ? (
                            <span className="flex items-center gap-1">
                              {option.label.split(">").map((part: string, idx: number, arr: string[]) => (
                                <span key={idx}>
                                  <span className="font-medium">{part.trim()}</span>
                                  {idx < arr.length - 1 && <span className="text-muted-foreground mx-1">›</span>}
                                </span>
                              ))}
                            </span>
                          ) : (
                            option.label
                          )}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  First select the location for this subsidiary
                </p>
              </div>

              {selectedLocationPath && selectedLocationId && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Subsidiary Options</Label>
                    {!showOptionInput && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowOptionInput(true)}
                        className="h-7"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Option
                      </Button>
                    )}
                  </div>

                  {showOptionInput && (
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="e.g., Phase 1"
                        value={newOptionInput}
                        onChange={(e) => setNewOptionInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleAddPendingOption()
                          }
                        }}
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddPendingOption}
                        disabled={!newOptionInput.trim() || pendingOptions.includes(newOptionInput.trim())}
                        className="h-8"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowOptionInput(false)
                          setNewOptionInput("")
                        }}
                        className="h-8"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  {pendingOptions.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {pendingOptions.map((option, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {option}
                            <button
                              type="button"
                              onClick={() => handleRemovePendingOption(index)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      {!showOptionInput && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowOptionInput(true)}
                          className="h-7 w-full"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add More Options
                        </Button>
                      )}
                    </div>
                  )}

                  <Button
                    className="w-full"
                    size="sm"
                    onClick={handleCreateSubsidiary}
                    disabled={creatingSubsidiary || pendingOptions.length === 0}
                  >
                    {creatingSubsidiary ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Subsidiary
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
