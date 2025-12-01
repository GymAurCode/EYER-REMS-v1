"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Plus,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Loader2,
  MoreVertical,
  Pencil,
  Trash,
  UserPlus,
  UserCheck,
} from "lucide-react"
import { AddLeadDialog } from "./add-lead-dialog"
import { apiService } from "@/lib/api"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"

const LEAD_FILTERS = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "qualified", label: "Qualified" },
  { value: "negotiation", label: "Negotiation" },
]

export function LeadsView() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [editingLead, setEditingLead] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiService.leads.getAll()
      const data = Array.isArray(response.data) ? response.data : []
      setLeads(data)
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch leads")
      setLeads([])
    } finally {
      setLoading(false)
    }
  }

  const openEditLead = (lead: any) => {
    setEditingLead(lead)
    setShowAddDialog(true)
  }

  const confirmDeleteLead = (lead: any) => {
    setDeleteTarget(lead)
  }

  const handleDeleteLead = async () => {
    if (!deleteTarget) return
    try {
      await apiService.leads.delete(deleteTarget.id)
      toast({ title: "Lead deleted" })
      setDeleteTarget(null)
      fetchLeads()
    } catch (err: any) {
      console.error("Failed to delete lead", err)
      toast({ title: "Failed to delete lead", variant: "destructive" })
    }
  }

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase())

    const normalizedStatus = (lead.status || "").toLowerCase()
    const matchesStatus = statusFilter === "all" || normalizedStatus === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {LEAD_FILTERS.map((filter) => (
            <Button
              key={filter.value}
              variant={statusFilter === filter.value ? "default" : "outline"}
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Leads Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">{error}</div>
      ) : filteredLeads.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <UserPlus className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <p className="text-lg font-semibold text-foreground mb-2">
              {leads.length === 0 ? "No leads yet" : "No leads match your filters"}
            </p>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              {leads.length === 0 
                ? "Start building your sales pipeline by adding your first lead. Track prospects, convert them to clients, and manage deals."
                : "Try adjusting your search or filter criteria to find leads."}
            </p>
            {leads.length === 0 && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Lead
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredLeads.map((lead) => (
          <Card key={lead.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground text-lg">{lead.name}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge
                    variant={
                      lead.status === "new"
                        ? "secondary"
                        : lead.status === "qualified"
                          ? "default"
                          : lead.status === "negotiation"
                            ? "outline"
                            : "secondary"
                    }
                  >
                    {lead.status}
                  </Badge>
                  {lead.source && <Badge variant="outline">{lead.source}</Badge>}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault()
                      openEditLead(lead)
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  {lead.status !== "converted" && (
                    <DropdownMenuItem
                      onSelect={async (event) => {
                        event.preventDefault()
                        try {
                          await apiService.leads.convertToClient(lead.id)
                          toast({ title: "Lead converted to client successfully", variant: "success" })
                          fetchLeads()
                        } catch (err: any) {
                          console.error("Failed to convert lead", err)
                          toast({ 
                            title: "Failed to convert lead", 
                            description: err.response?.data?.error || err.response?.data?.message || "An error occurred",
                            variant: "destructive" 
                          })
                        }
                      }}
                    >
                      <UserCheck className="mr-2 h-4 w-4" />
                      Convert to Client
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault()
                      confirmDeleteLead(lead)
                    }}
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span className="truncate">{lead.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{lead.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{lead.interest}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Budget</p>
                  <p className="font-medium text-foreground mt-1">{lead.budget}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Assigned To</p>
                  <p className="font-medium text-foreground mt-1">{lead.assignedTo}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-3">
                <Calendar className="h-3 w-3" />
                Created {new Date(lead.createdDate).toLocaleDateString()}
              </div>
            </div>
          </Card>
          ))}
        </div>
      )}

      {/* Add Lead Dialog */}
      <AddLeadDialog
        open={showAddDialog}
        onOpenChange={(open) => {
          if (!open) {
            setEditingLead(null)
          }
          setShowAddDialog(open)
        }}
        onSuccess={fetchLeads}
        initialData={editingLead}
        mode={editingLead ? "edit" : "create"}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteTarget?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLead}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
