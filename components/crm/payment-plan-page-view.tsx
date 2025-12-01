"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, CalendarIcon, Plus, Trash2, Loader2, Save, Edit, DollarSign, FileText, Download, Receipt } from "lucide-react"
import { ReceiptCreationDialog } from "./receipt-creation-dialog"
import { ClientLedgerView } from "./client-ledger-view"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { apiService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface PaymentPlanPageViewProps {
  dealId: string
}

interface InstallmentRow {
  id?: string
  installmentNumber: number
  amount: number
  dueDate: Date | null
  paymentMode: string
  notes: string
  paidAmount?: number
  status?: string
}

export function PaymentPlanPageView({ dealId }: PaymentPlanPageViewProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deal, setDeal] = useState<any>(null)
  const [paymentPlan, setPaymentPlan] = useState<any>(null)
  const [apiSummary, setApiSummary] = useState<any>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  // Form state
  const [installmentType, setInstallmentType] = useState<'monthly' | 'quarterly' | 'bi-monthly' | 'bi-annual' | 'annual' | 'custom'>('monthly')
  const [downPayment, setDownPayment] = useState<string>("")
  const [numberOfInstallments, setNumberOfInstallments] = useState(3)
  const [installmentsInput, setInstallmentsInput] = useState<string>("3")
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [installments, setInstallments] = useState<InstallmentRow[]>([])
  const [notes, setNotes] = useState("")
  
  // Payment dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false)
  const [selectedInstallment, setSelectedInstallment] = useState<InstallmentRow | null>(null)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMode, setPaymentMode] = useState("cash")
  const [paymentDate, setPaymentDate] = useState<Date>(new Date())
  
  // Report generation
  const [generatingReport, setGeneratingReport] = useState(false)

  useEffect(() => {
    loadDealAndPaymentPlan()
  }, [dealId])

  const loadDealAndPaymentPlan = async () => {
    try {
      setLoading(true)
      
      // Load deal
      const dealResponse = await apiService.deals?.getById?.(dealId) || await fetch(`/api/crm/deals/${dealId}`).then(r => r.json())
      setDeal(dealResponse?.data || dealResponse)
      
      // Load payment plan if exists
      try {
        const planResponse: any = await apiService.deals.getPaymentPlan(dealId)
        const responseData = planResponse?.data || planResponse
        if (responseData?.success && responseData?.data) {
          setPaymentPlan(responseData.data)
          setIsCreating(false)
          setIsEditing(false)
          
          // Populate form with existing plan
          const plan = responseData.data
          const numInst = plan.numberOfInstallments || plan.installments?.length || 3
          setNumberOfInstallments(numInst)
          setInstallmentsInput(numInst.toString())
          setStartDate(plan.startDate ? new Date(plan.startDate) : new Date())
          setNotes(plan.notes || "")
          
          if (plan.installments && plan.installments.length > 0) {
            setInstallments(
              plan.installments.map((inst: any) => ({
                id: inst.id,
                installmentNumber: inst.installmentNumber,
                amount: inst.amount,
                dueDate: new Date(inst.dueDate),
                paymentMode: inst.paymentMode || "bank",
                notes: inst.notes || "",
                paidAmount: inst.paidAmount || 0,
                status: inst.status,
              }))
            )
          }
        } else {
          setIsCreating(true)
          setInstallmentsInput("3")
        }
      } catch (error) {
        // No payment plan exists
        setIsCreating(true)
        setInstallmentsInput("3")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load deal",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Generate installments based on type - NO auto-calculation of amounts
  const handleGenerateInstallments = () => {
    if (!deal || (deal.dealAmount || 0) <= 0) {
      toast({
        title: "Error",
        description: "Deal amount is required",
        variant: "destructive",
      })
      return
    }

    if (numberOfInstallments <= 0) {
      toast({
        title: "Error",
        description: "Number of installments must be greater than 0",
        variant: "destructive",
      })
      return
    }

    const newInstallments: InstallmentRow[] = []
    const monthsPerInstallment = installmentType === 'quarterly' ? 3 
      : installmentType === 'bi-monthly' ? 2
      : installmentType === 'monthly' ? 1
      : installmentType === 'bi-annual' ? 6
      : installmentType === 'annual' ? 12
      : 1 // Default to monthly

    for (let i = 0; i < numberOfInstallments; i++) {
      const dueDate = new Date(startDate)
      dueDate.setMonth(dueDate.getMonth() + (i * monthsPerInstallment))
      
      newInstallments.push({
        installmentNumber: installments.length + i + 1,
        amount: 0, // Manual entry required - NO auto-calculation
        dueDate,
        paymentMode: "bank",
        notes: "",
      })
    }
    
    setInstallments([...installments, ...newInstallments])
    
    toast({
      title: "Success",
      description: `${numberOfInstallments} installment(s) generated. Please enter amounts manually.`,
    })
  }

  const handleInstallmentChange = (index: number, field: keyof InstallmentRow, value: any) => {
    const updated = [...installments]
    updated[index] = { ...updated[index], [field]: value }
    setInstallments(updated)
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // Validate that installments sum equals deal amount
      const dealAmount = deal?.dealAmount || 0
      const total = installments.reduce((sum, inst) => sum + (inst.amount || 0), 0)
      const difference = Math.abs(total - dealAmount)
      
      if (difference > 0.01) {
        toast({
          title: "Validation Error",
          description: `Installments total (${total.toLocaleString()}) must equal deal amount (${dealAmount.toLocaleString()}). Difference: ${difference.toFixed(2)}`,
          variant: "destructive",
        })
        return
      }

      // Auto-adjust last installment if there's a small rounding difference
      if (difference > 0 && difference <= 0.01 && installments.length > 0) {
        const lastIndex = installments.length - 1
        installments[lastIndex].amount = (installments[lastIndex].amount || 0) + (dealAmount - total)
        installments[lastIndex].amount = Math.round(installments[lastIndex].amount * 100) / 100
      }

      const hasInvalidDates = installments.some((inst) => !inst.dueDate)
      if (hasInvalidDates) {
        toast({
          title: "Validation Error",
          description: "All installments must have a due date",
          variant: "destructive",
        })
        return
      }

      if (paymentPlan) {
        // Update existing plan
        const response: any = await apiService.deals.updatePaymentPlan(paymentPlan.id, {
          installments: installments.map((inst) => ({
            id: inst.id,
            amount: inst.amount,
            dueDate: inst.dueDate?.toISOString(),
            paymentMode: inst.paymentMode,
            notes: inst.notes,
          })),
        })

        const responseData = response?.data || response
        if (responseData?.success) {
          toast({
            title: "Success",
            description: "Payment plan updated successfully",
          })
          await loadDealAndPaymentPlan()
          setIsEditing(false)
        }
      } else {
        // Create new plan using new API endpoint
        const dealAmount = deal?.dealAmount || 0
        
        // Validate all amounts are entered
        const hasEmptyAmounts = installments.some(inst => !inst.amount || inst.amount <= 0)
        if (hasEmptyAmounts) {
          toast({
            title: "Validation Error",
            description: "All installments must have an amount greater than 0",
            variant: "destructive",
          })
          return
        }

        // Validate dates
        const hasInvalidDates = installments.some((inst) => !inst.dueDate)
        if (hasInvalidDates) {
          toast({
            title: "Validation Error",
            description: "All installments must have a due date",
            variant: "destructive",
          })
          return
        }

        const response: any = await fetch('/api/finance/payment-plans/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            dealId,
            clientId: deal?.clientId || "",
            installments: installments.map((inst) => ({
              type: installmentType,
              amount: inst.amount,
              dueDate: inst.dueDate?.toISOString(),
              paymentMode: inst.paymentMode || null,
              notes: inst.notes || null,
            })),
            notes,
          }),
        }).then(r => r.json())

        const responseData = response?.data || response
        if (responseData?.success) {
          toast({
            title: "Success",
            description: "Payment plan created successfully",
          })
          await loadDealAndPaymentPlan()
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save payment plan",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleRecordPayment = async () => {
    if (!selectedInstallment || !paymentAmount) return

    try {
      setSaving(true)
      const amount = parseFloat(paymentAmount)
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid payment amount",
          variant: "destructive",
        })
        return
      }

      // Use smart allocation for automatic distribution
      const response: any = await apiService.deals.smartAllocatePayment(dealId, {
        amount,
        method: paymentMode,
      })

      const responseData = response?.data || response
      if (responseData?.success) {
        let message = responseData.message || "Payment allocated successfully"
        if (responseData.excessIgnored > 0) {
          message += ` Excess amount (${responseData.excessIgnored}) ignored.`
        }
        if (responseData.dealClosed) {
          message += " Deal has been closed."
        }

        toast({
          title: "Success",
          description: message,
        })
        setPaymentDialogOpen(false)
        setPaymentAmount("")
        setSelectedInstallment(null)
        await loadDealAndPaymentPlan()
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to record payment",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSmartAllocatePayment = async (amount: number, method: string) => {
    try {
      setSaving(true)
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid payment amount",
          variant: "destructive",
        })
        return false
      }

      const response: any = await apiService.deals.smartAllocatePayment(dealId, {
        amount,
        method,
      })

      const responseData = response?.data || response
      if (responseData?.success) {
        // Update installments in real-time if provided
        if (responseData.updatedInstallments && responseData.updatedInstallments.length > 0) {
          setInstallments((prev) => {
            const updated = [...prev]
            responseData.updatedInstallments.forEach((updatedInst: any) => {
              const index = updated.findIndex((inst) => inst.id === updatedInst.id)
              if (index >= 0) {
                updated[index] = {
                  ...updated[index],
                  paidAmount: updatedInst.paidAmount,
                  status: updatedInst.status,
                }
              }
            })
            return updated
          })
        }

        // Update summary if provided
        if (responseData.summary) {
          setApiSummary(responseData.summary)
        }

        let message = responseData.message || "Payment allocated successfully"
        if (responseData.excessIgnored > 0) {
          message += ` Excess amount (${responseData.excessIgnored.toFixed(2)}) ignored.`
        }
        if (responseData.dealClosed) {
          message += " Deal has been closed."
        }

        toast({
          title: "Success",
          description: message,
        })

        // Clear payment amount
        setPaymentAmount("")

        // Reload full data to ensure consistency
        await loadDealAndPaymentPlan()
        return true
      }
      return false
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to allocate payment",
        variant: "destructive",
      })
      return false
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return "Rs 0.00"
    }
    return `Rs ${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      paid: "default",
      unpaid: "secondary",
      overdue: "destructive",
      partial: "outline",
    }
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>
  }

  const handleGenerateReport = async () => {
    if (!deal) return

    try {
      setGeneratingReport(true)
      
      // Generate PDF report from backend
      const response = await apiService.deals.getPaymentPlanPDF(dealId)
      
      // Create blob from response (axios returns blob directly when responseType is 'blob')
      const blob = response.data instanceof Blob 
        ? response.data 
        : new Blob([response.data as any], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `payment-plan-${deal.dealCode || deal.id}-${format(new Date(), "yyyy-MM-dd")}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Success",
        description: "PDF report generated and downloaded successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate PDF report",
        variant: "destructive",
      })
    } finally {
      setGeneratingReport(false)
    }
  }

  // Use summary from API response, or calculate from deal if no summary exists
  const finalSummary = apiSummary || {
    totalAmount: deal?.dealAmount || 0,
    paidAmount: 0,
    remainingAmount: deal?.dealAmount || 0,
    progress: 0,
    status: 'Pending',
  }
  
  // Ensure summary always uses deal amount as total (override if needed)
  if (deal?.dealAmount && finalSummary.totalAmount !== deal.dealAmount) {
    finalSummary.totalAmount = deal.dealAmount
    finalSummary.remainingAmount = Math.max(0, deal.dealAmount - (finalSummary.paidAmount || 0))
    finalSummary.progress = deal.dealAmount > 0 
      ? Math.round(((finalSummary.paidAmount || 0) / deal.dealAmount) * 10000) / 100 
      : 0
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Payment Plan</h1>
            <p className="text-muted-foreground">
              {deal?.dealCode || deal?.title || "Deal"} - {deal?.client?.name || "Client"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!paymentPlan && !isCreating && (
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Payment Plan
            </Button>
          )}
          {paymentPlan && !isEditing && (
            <>
              <Button variant="outline" onClick={handleGenerateReport} disabled={generatingReport}>
                {generatingReport ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                Generate PDF Report
              </Button>
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Plan
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
          <CardDescription>Total amount, paid amount, and remaining balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <Label className="text-muted-foreground">Total Amount</Label>
              <p className="text-2xl font-bold">{formatCurrency(finalSummary.totalAmount)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Paid Amount</Label>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(finalSummary.paidAmount)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Remaining</Label>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(finalSummary.remainingAmount)}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{finalSummary.progress.toFixed(1)}%</span>
            </div>
            <Progress value={finalSummary.progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Payment Plan Form */}
      {(isCreating || isEditing) && (
        <Card>
          <CardHeader>
            <CardTitle>Configure Payment Plan</CardTitle>
            <CardDescription>Set up installments with amounts and due dates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Installment Type</Label>
                <Select value={installmentType} onValueChange={(value: any) => setInstallmentType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="bi-monthly">Bi-Monthly</SelectItem>
                    <SelectItem value="bi-annual">Bi-Annual</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Down Payment Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={downPayment}
                  onChange={(e) => setDownPayment(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Number of Installments {installmentType !== 'custom' && '(excluding down payment)'}</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={installmentsInput}
                  onChange={(e) => {
                    const value = e.target.value
                    setInstallmentsInput(value)
                    const num = parseInt(value, 10)
                    if (!isNaN(num) && num > 0) {
                      setNumberOfInstallments(num)
                    }
                  }}
                  onBlur={(e) => {
                    const value = parseInt(e.target.value, 10)
                    if (isNaN(value) || value < 1) {
                      setInstallmentsInput("1")
                      setNumberOfInstallments(1)
                    } else {
                      setInstallmentsInput(value.toString())
                    }
                  }}
                  disabled={!!paymentPlan && !isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." />
            </div>

            {/* Generate Installments Button */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Installments</Label>
                <p className="text-sm text-muted-foreground">
                  Click "Generate Installments" to create rows. Enter amounts manually for each installment.
                </p>
              </div>
              <Button 
                type="button"
                variant="outline" 
                onClick={handleGenerateInstallments}
                disabled={!deal || (deal.dealAmount || 0) <= 0 || numberOfInstallments <= 0}
              >
                <Plus className="mr-2 h-4 w-4" />
                Generate Installments
              </Button>
            </div>

            {/* Installments Table */}
            <div className="space-y-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount (Manual Entry)</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No installments yet. Click "Generate Installments" to create rows.
                      </TableCell>
                    </TableRow>
                  ) : (
                    installments.map((inst, index) => (
                      <TableRow key={index}>
                        <TableCell>{inst.installmentNumber}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{installmentType || 'Custom'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value={inst.amount || ''}
                            onChange={(e) =>
                              handleInstallmentChange(index, "amount", parseFloat(e.target.value) || 0)
                            }
                            className="w-32"
                            placeholder="Enter amount"
                          />
                        </TableCell>
                        <TableCell>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {inst.dueDate ? format(inst.dueDate, "PPP") : "Pick a date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={inst.dueDate || undefined}
                                onSelect={(d) => handleInstallmentChange(index, "dueDate", d)}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">Pending</Badge>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={inst.notes || ''}
                            onChange={(e) => handleInstallmentChange(index, "notes", e.target.value)}
                            placeholder="Optional notes..."
                            className="w-48"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const updated = installments.filter((_, i) => i !== index)
                              // Renumber installments
                              updated.forEach((inst, i) => {
                                inst.installmentNumber = i + 1
                              })
                              setInstallments(updated)
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setIsCreating(false)
                setIsEditing(false)
                if (paymentPlan) {
                  loadDealAndPaymentPlan()
                }
              }}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {paymentPlan ? "Update Plan" : "Create Plan"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Payment Plan Message */}
      {!paymentPlan && !isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>No Payment Plan</CardTitle>
            <CardDescription>Create a payment plan to track installments for this deal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Set up installment schedule for this deal. Total amount: {formatCurrency(deal?.dealAmount || 0)}
              </p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Payment Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Record Payment (Receipt) Card */}
      {paymentPlan && !isCreating && !isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>Record Payment</CardTitle>
            <CardDescription>Create a receipt for payment received. Amount will be automatically allocated to installments using FIFO.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setReceiptDialogOpen(true)}
              className="w-full"
            >
              <Receipt className="mr-2 h-4 w-4" />
              Record Payment (Create Receipt)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Installments List and Client Ledger */}
      {paymentPlan && !isCreating && !isEditing && (
        <Tabs defaultValue="installments" className="w-full">
          <TabsList>
            <TabsTrigger value="installments">Installments</TabsTrigger>
            <TabsTrigger value="ledger">Client Ledger</TabsTrigger>
          </TabsList>
          <TabsContent value="installments">
            <Card>
              <CardHeader>
                <CardTitle>Installments</CardTitle>
                <CardDescription>Payment milestones and their status</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {installments.map((inst) => {
                      const remaining = (inst.amount || 0) - (inst.paidAmount || 0)
                      return (
                        <TableRow key={inst.installmentNumber}>
                          <TableCell>{inst.installmentNumber}</TableCell>
                          <TableCell>
                            {paymentPlan.installmentType && (
                              <Badge variant="outline">{paymentPlan.installmentType}</Badge>
                            )}
                          </TableCell>
                          <TableCell>{formatCurrency(inst.amount)}</TableCell>
                          <TableCell>{inst.dueDate ? format(inst.dueDate, "PPP") : "N/A"}</TableCell>
                          <TableCell>{formatCurrency(inst.paidAmount || 0)}</TableCell>
                          <TableCell>{formatCurrency(remaining)}</TableCell>
                          <TableCell>{inst.status ? getStatusBadge(inst.status) : <Badge>Pending</Badge>}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="ledger">
            <ClientLedgerView dealId={dealId} />
          </TabsContent>
        </Tabs>
      )}

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Payment will be automatically allocated across installments in order
              {selectedInstallment && ` (Starting from installment #${selectedInstallment.installmentNumber})`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter payment amount"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {paymentDate ? format(paymentDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={paymentDate} onSelect={(d) => d && setPaymentDate(d)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Creation Dialog */}
      {deal && (
        <ReceiptCreationDialog
          open={receiptDialogOpen}
          onOpenChange={setReceiptDialogOpen}
          dealId={dealId}
          clientId={deal.clientId || ""}
          onSuccess={() => {
            loadDealAndPaymentPlan()
          }}
        />
      )}
    </div>
  )
}

