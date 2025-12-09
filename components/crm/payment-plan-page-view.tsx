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
  id: number
  installmentNumber: number
  type: string // monthly, quarterly, yearly, custom
  amount: number
  period: string
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
  const [isEditMode, setIsEditMode] = useState(false) // Track if we're editing the plan

  // Form state - CREATE MODE or EDIT MODE
  const [downPaymentType, setDownPaymentType] = useState<"percentage" | "manual">("manual")
  const [downPaymentPercentage, setDownPaymentPercentage] = useState<string>("")
  const [downPaymentAmount, setDownPaymentAmount] = useState<string>("")
  const [appliedDownPayment, setAppliedDownPayment] = useState<number>(0)
  const [isDownPaymentApplied, setIsDownPaymentApplied] = useState(false)
  const [downPaymentAction, setDownPaymentAction] = useState<"cut" | "pay">("cut")

  const [numberOfInstallments, setNumberOfInstallments] = useState(3)
  const [installmentsInput, setInstallmentsInput] = useState<string>("3")
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [installments, setInstallments] = useState<InstallmentRow[]>([]) // Form installments (always empty on load)
  const [viewInstallments, setViewInstallments] = useState<InstallmentRow[]>([]) // View installments (for existing plans)
  const [notes, setNotes] = useState("")

  // Payment dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false)
  const [selectedInstallment, setSelectedInstallment] = useState<InstallmentRow | null>(null)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMode, setPaymentMode] = useState("cash")
  const [paymentDate, setPaymentDate] = useState<Date>(new Date())
  const [paymentReferenceNumber, setPaymentReferenceNumber] = useState("")

  // Report generation
  const [generatingReport, setGeneratingReport] = useState(false)

  useEffect(() => {
    loadDeal()
  }, [dealId])

  // ALWAYS OPEN IN CREATE MODE - DO NOT LOAD PREVIOUS VALUES INTO FORM
  const loadDeal = async () => {
    try {
      setLoading(true)

      // Load deal only
      let dealResponse
      if (apiService.deals?.getById) {
        try {
          dealResponse = await apiService.deals.getById(dealId)
        } catch (error) {
          console.error('Failed to load deal via apiService:', error)
        }
      }

      if (!dealResponse) {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
        const fetchResponse = await fetch(`${apiBaseUrl}/crm/deals/${dealId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        })

        if (!fetchResponse.ok) {
          const contentType = fetchResponse.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const errorData = await fetchResponse.json()
            throw new Error(errorData.error || errorData.message || `Failed to load deal: ${fetchResponse.status}`)
          } else {
            const text = await fetchResponse.text()
            throw new Error(`Server error (${fetchResponse.status}): ${text.substring(0, 200)}`)
          }
        }

        const contentType = fetchResponse.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          const text = await fetchResponse.text()
          throw new Error(`Server returned non-JSON response: ${text.substring(0, 200)}`)
        }

        dealResponse = await fetchResponse.json()
      }

      setDeal(dealResponse?.data || dealResponse)

      // Check if payment plan exists (for display only in view section, NOT for form editing)
      try {
        const planResponse: any = await apiService.paymentPlans.getByDealId(dealId)
        const responseData = planResponse?.data || planResponse

        // Debug: log the response structure
        console.log('Payment plan response:', { planResponse, responseData })

        // Handle both response structures: { success: true, data: {...} } or direct data
        const planData = responseData?.success ? responseData.data : responseData

        if (planData) {
          // Extract the actual payment plan object - it's nested in paymentPlan property
          // The response structure from backend is: { paymentPlan: {id, ...}, installments: [...], summary: {...} }
          // So we need to extract planData.paymentPlan which has the id
          const actualPlan = planData.paymentPlan || planData

          // Always use planData.paymentPlan if it exists (it has the id)
          if (planData.paymentPlan && planData.paymentPlan.id) {
            setPaymentPlan(planData.paymentPlan)
          } else if (actualPlan.id) {
            setPaymentPlan(actualPlan)
          } else {
            // Fallback: try to find id anywhere in the structure
            console.warn('Payment plan structure unexpected:', planData)
            setPaymentPlan(planData)
          }

          // Load installments for VIEW section only (NOT for form - form is always in create mode)
          const installments = planData.installments || actualPlan.installments || []
          if (installments.length > 0) {
            setViewInstallments(
              installments.map((inst: any) => ({
                id: inst.id || Date.now() + Math.random(),
                installmentNumber: inst.installmentNumber,
                type: inst.type || 'custom', // Each installment has its own type
                amount: inst.amount,
                period: inst.period || "",
                dueDate: inst.dueDate ? new Date(inst.dueDate) : null,
                paymentMode: inst.paymentMode || "bank",
                notes: inst.notes || "",
                paidAmount: inst.paidAmount || 0,
                status: inst.status,
              }))
            )
          } else {
            setViewInstallments([])
          }

          // Set summary if available
          if (planData.summary) {
            setApiSummary(planData.summary)
          }
        }
      } catch (error) {
        // No payment plan exists - this is fine, we're in create mode
        console.log('No payment plan found (this is OK for new deals):', error)
        setPaymentPlan(null)
        setViewInstallments([])
        setApiSummary(null)
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

  // Calculate down payment amount
  const calculatedDownPayment = () => {
    if (downPaymentType === "percentage") {
      const percentage = parseFloat(downPaymentPercentage) || 0
      if (percentage > 0 && percentage <= 100 && deal?.dealAmount) {
        return Math.round((deal.dealAmount * percentage / 100) * 100) / 100
      }
      return 0
    } else {
      return parseFloat(downPaymentAmount) || 0
    }
  }

  // Calculate remaining amount after down payment
  const remainingAmount = () => {
    const downPayment = isDownPaymentApplied ? appliedDownPayment : calculatedDownPayment()
    return Math.max(0, (deal?.dealAmount || 0) - downPayment)
  }

  // Apply down payment
  const handleApplyDownPayment = () => {
    const dp = calculatedDownPayment()
    if (dp > 0 && deal?.dealAmount && dp <= deal.dealAmount) {
      setAppliedDownPayment(dp)
      setIsDownPaymentApplied(true)
      setDownPaymentAction("pay") // Mark as paid so it shows in summary
      toast({
        title: "Down Payment Applied",
        description: `Down payment of Rs ${dp.toLocaleString("en-IN")} has been applied. Remaining: Rs ${remainingAmount().toLocaleString("en-IN")}`,
      })
    } else {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid down payment amount",
        variant: "destructive",
      })
    }
  }

  // Generate installments based on type - each installment has its own type
  const handleGenerateInstallments = (type: 'monthly' | 'quarterly' | 'yearly' | 'custom') => {
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
    const monthsPerInstallment = type === 'quarterly' ? 3
      : type === 'yearly' ? 12
        : type === 'monthly' ? 1
          : 1 // Default to monthly

    const currentMaxNumber = installments.length > 0
      ? Math.max(...installments.map(inst => inst.installmentNumber))
      : 0

    for (let i = 0; i < numberOfInstallments; i++) {
      const dueDate = new Date(startDate)
      dueDate.setMonth(dueDate.getMonth() + (i * monthsPerInstallment))

      newInstallments.push({
        id: Date.now() + i, // Unique ID
        installmentNumber: currentMaxNumber + i + 1,
        type: type, // Each installment has its own type
        amount: 0, // Manual entry - NO auto-calculation
        period: "",
        dueDate,
        paymentMode: "bank",
        notes: "",
      })
    }

    setInstallments([...installments, ...newInstallments])

    toast({
      title: "Success",
      description: `${numberOfInstallments} ${type} installment(s) generated. Please enter amounts manually.`,
    })
  }

  // Add one more installment of the same type
  const handleAddOneMore = (type: string) => {
    const monthsPerInstallment = type === 'quarterly' ? 3
      : type === 'yearly' ? 12
        : type === 'monthly' ? 1
          : 1

    const sameTypeInstallments = installments.filter(inst => inst.type === type)
    const lastSameTypeIndex = installments.findLastIndex(inst => inst.type === type)
    const lastDueDate = lastSameTypeIndex >= 0 && installments[lastSameTypeIndex].dueDate
      ? new Date(installments[lastSameTypeIndex].dueDate)
      : new Date(startDate)

    const newDueDate = new Date(lastDueDate)
    newDueDate.setMonth(newDueDate.getMonth() + monthsPerInstallment)

    const currentMaxNumber = installments.length > 0
      ? Math.max(...installments.map(inst => inst.installmentNumber))
      : 0

    const newInstallment: InstallmentRow = {
      id: Date.now(),
      installmentNumber: currentMaxNumber + 1,
      type: type,
      amount: 0,
      period: "",
      dueDate: newDueDate,
      paymentMode: "bank",
      notes: "",
    }

    setInstallments([...installments, newInstallment])
  }

  // ID-based update handler - EXACT as specified
  const updateInstallment = (id: number, field: keyof InstallmentRow, value: any) => {
    setInstallments(prev =>
      prev.map(inst =>
        inst.id === id
          ? { ...inst, [field]: value }
          : inst
      )
    )
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // Validate down payment is applied (only for create, not update)
      if (!isEditMode && (!isDownPaymentApplied || appliedDownPayment <= 0)) {
        toast({
          title: "Validation Error",
          description: "Down payment is required. Please enter and apply down payment first.",
          variant: "destructive",
        })
        return
      }

      const dealAmount = deal?.dealAmount || 0
      const remaining = remainingAmount()
      const total = installments.reduce((sum, inst) => sum + (inst.amount || 0), 0)
      const difference = Math.abs(total - remaining)

      // Validate that installments sum equals remaining amount after down payment (only for create)
      if (!isEditMode && difference > 0.01) {
        toast({
          title: "Validation Error",
          description: `Installments total (${total.toLocaleString()}) must equal remaining amount after down payment (${remaining.toLocaleString()}). Difference: ${difference.toFixed(2)}`,
          variant: "destructive",
        })
        return
      }

      const hasInvalidDates = installments.some((inst) => !inst.dueDate)
      if (hasInvalidDates) {
        toast({
          title: "Validation Error",
          description: "All installments must have an instalment date",
          variant: "destructive",
        })
        return
      }

      if (isEditMode && paymentPlan) {
        // Update existing plan
        const installmentsPayload = installments.map((inst) => ({
          id: inst.id,
          type: inst.type || null,
          amount: inst.amount,
          dueDate: inst.dueDate?.toISOString(),
          paymentMode: inst.paymentMode || null,
          notes: inst.notes || null,
          paidAmount: inst.paidAmount || 0, // Preserve paid amounts
        }))

        // Ensure we have the payment plan ID - handle nested structure
        // paymentPlan might be the object itself or nested in paymentPlan property
        const planId = paymentPlan?.id || (paymentPlan as any)?.paymentPlan?.id
        if (!planId) {
          console.error('Payment plan object:', paymentPlan)
          toast({
            title: "Error",
            description: "Payment plan ID not found. Please refresh the page.",
            variant: "destructive",
          })
          return
        }

        // Preserve down payment when updating - get it from existing plan or use applied one
        const downPaymentToSave = paymentPlan?.downPayment || appliedDownPayment || 0

        const response: any = await apiService.paymentPlans.update(planId, {
          installments: installmentsPayload,
          downPayment: downPaymentToSave, // Preserve down payment
          notes: notes || null,
        })

        const responseData = response?.data || response
        if (responseData?.success) {
          toast({
            title: "Success",
            description: "Payment plan updated successfully",
          })
          await loadDeal()
          setIsEditMode(false)
          setInstallments([])
          setDownPaymentPercentage("")
          setDownPaymentAmount("")
          setAppliedDownPayment(0)
          setIsDownPaymentApplied(false)
          setNotes("")
        }
      } else {
        // Create new plan
        const installmentsPayload = installments.map((inst) => ({
          type: inst.type || null, // Each installment has its own type
          amount: inst.amount,
          dueDate: inst.dueDate?.toISOString(),
          paymentMode: inst.paymentMode || null,
          notes: inst.notes || null,
        }))

        const response: any = await apiService.paymentPlans.create({
          dealId,
          clientId: deal?.clientId || "",
          downPayment: appliedDownPayment, // Include down payment for backend validation
          installments: installmentsPayload,
          notes: notes || null,
        })

        const responseData = response?.data || response
        if (responseData?.success) {
          toast({
            title: "Success",
            description: "Payment plan created successfully",
          })
          await loadDeal()
          // Reset form and exit edit mode
          setInstallments([])
          setDownPaymentPercentage("")
          setDownPaymentAmount("")
          setAppliedDownPayment(0)
          setIsDownPaymentApplied(false)
          setIsEditMode(false)
          setNotes("")
        }
      }
    } catch (error: any) {
      console.error('Payment plan creation error:', error)
      let errorMessage = "Failed to save payment plan"

      if (error.message) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error
      }

      toast({
        title: "Error",
        description: errorMessage,
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
        await loadDeal()
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
        // Update view installments in real-time if provided
        if (responseData.updatedInstallments && responseData.updatedInstallments.length > 0) {
          setViewInstallments((prev) => {
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
        await loadDeal()
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

  // Calculate paid amount including down payment
  // Backend summary includes down payment for existing plans
  // For new plans or when user applies down payment, we need to add it
  let totalPaidAmount = apiSummary?.paidAmount || 0

  // Get saved down payment from payment plan (handle nested structure)
  const savedDownPayment = paymentPlan?.downPayment || (paymentPlan as any)?.paymentPlan?.downPayment || 0

  // If user has applied down payment in the form, show it immediately
  if (isDownPaymentApplied && appliedDownPayment > 0) {
    if (paymentPlan && savedDownPayment > 0) {
      // Existing plan: backend summary already includes saved down payment
      // Replace it with the newly applied amount
      totalPaidAmount = (totalPaidAmount - savedDownPayment) + appliedDownPayment
    } else {
      // New plan: add the applied down payment
      totalPaidAmount = totalPaidAmount + appliedDownPayment
    }
  } else if (!isDownPaymentApplied && paymentPlan && savedDownPayment > 0) {
    // If down payment is not applied in form but exists in saved plan, it's already in apiSummary
    // No need to add it again
  }

  // Calculate final summary with down payment included
  // If no apiSummary and no deal, show zeros (but still show the summary card)
  const totalAmount = deal?.dealAmount || 0
  const summaryRemainingAmount = Math.max(0, totalAmount - totalPaidAmount)
  const progress = totalAmount > 0
    ? Math.round((totalPaidAmount / totalAmount) * 10000) / 100
    : 0

  const finalSummary = {
    totalAmount: totalAmount || 0,
    paidAmount: totalPaidAmount || 0,
    remainingAmount: summaryRemainingAmount || 0,
    progress: progress || 0,
    status: apiSummary?.status || (totalPaidAmount > 0 ? 'Partially Paid' : 'Pending'),
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
          {paymentPlan && (
            <Button variant="outline" onClick={handleGenerateReport} disabled={generatingReport}>
              {generatingReport ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              Generate PDF Report
            </Button>
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

      {/* Payment Plan Form - Only show if no plan exists OR in edit mode */}
      {(!paymentPlan || isEditMode) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{isEditMode ? "Update Payment Plan" : "Create Payment Plan"}</CardTitle>
                <CardDescription>Set up installments with amounts and instalment dates. Total amount: {formatCurrency(deal?.dealAmount || 0)}</CardDescription>
              </div>
              {isEditMode && (
                <Button variant="outline" onClick={() => {
                  setIsEditMode(false)
                  setInstallments([])
                  setDownPaymentPercentage("")
                  setDownPaymentAmount("")
                  setAppliedDownPayment(0)
                  setIsDownPaymentApplied(false)
                  setNotes("")
                }}>
                  Cancel
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Down Payment Section - AT THE TOP */}
            <div className="space-y-4 border-b pb-4">
              <div>
                <Label className="text-base font-semibold">Down Payment <span className="text-destructive">*</span></Label>
                <p className="text-sm text-muted-foreground">Enter down payment amount (required). It will be deducted from total deal amount.</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Down Payment Type</Label>
                  <Select value={downPaymentType} onValueChange={(value: "percentage" | "manual") => {
                    setDownPaymentType(value)
                    setIsDownPaymentApplied(false)
                    setAppliedDownPayment(0)
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="manual">Manual Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  {downPaymentType === "percentage" ? (
                    <>
                      <Label>Down Payment Percentage (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={downPaymentPercentage}
                        onChange={(e) => {
                          const value = e.target.value
                          const num = parseFloat(value)
                          if (value === "" || (!isNaN(num) && num >= 0 && num <= 100)) {
                            setDownPaymentPercentage(value)
                            setIsDownPaymentApplied(false)
                            setAppliedDownPayment(0)
                          }
                        }}
                        placeholder="0.00"
                      />
                      {downPaymentPercentage && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Amount: Rs {calculatedDownPayment().toLocaleString("en-IN")}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <Label>Down Payment Amount (Rs)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        max={deal?.dealAmount || 0}
                        value={downPaymentAmount}
                        onChange={(e) => {
                          const value = e.target.value
                          const num = parseFloat(value)
                          if (value === "" || (!isNaN(num) && num >= 0 && num <= (deal?.dealAmount || 0))) {
                            setDownPaymentAmount(value)
                            setIsDownPaymentApplied(false)
                            setAppliedDownPayment(0)
                          }
                        }}
                        placeholder="0.00"
                      />
                    </>
                  )}
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={handleApplyDownPayment}
                    disabled={calculatedDownPayment() <= 0 || isDownPaymentApplied}
                    className="w-full"
                  >
                    {isDownPaymentApplied ? "Applied" : "Apply Down Payment"}
                  </Button>
                </div>
              </div>
              {isDownPaymentApplied && appliedDownPayment > 0 && (
                <div className="bg-muted p-3 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Applied Down Payment:</span>
                    <span className="text-sm font-semibold">Rs {appliedDownPayment.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Remaining Amount:</span>
                    <span className="text-sm font-semibold">Rs {remainingAmount().toLocaleString("en-IN")}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Installments Section */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Number of Installments</Label>
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

              {/* Generate Installments Buttons - One for each type */}
              <div className="space-y-2">
                <Label>Generate Installments</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Generate installments by type. Each installment will have its own independent type.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleGenerateInstallments('monthly')}
                    disabled={!deal || (deal.dealAmount || 0) <= 0 || numberOfInstallments <= 0 || !isDownPaymentApplied}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Generate {numberOfInstallments} Monthly
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleGenerateInstallments('quarterly')}
                    disabled={!deal || (deal.dealAmount || 0) <= 0 || numberOfInstallments <= 0 || !isDownPaymentApplied}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Generate {numberOfInstallments} Quarterly
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleGenerateInstallments('yearly')}
                    disabled={!deal || (deal.dealAmount || 0) <= 0 || numberOfInstallments <= 0 || !isDownPaymentApplied}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Generate {numberOfInstallments} Yearly
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleGenerateInstallments('custom')}
                    disabled={!deal || (deal.dealAmount || 0) <= 0 || numberOfInstallments <= 0 || !isDownPaymentApplied}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Generate {numberOfInstallments} Custom
                  </Button>
                </div>
              </div>

              {/* Installments Table - Grouped by Type with "Add One More" */}
              <div className="space-y-4">
                {installments.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8 border rounded-lg">
                    No installments yet. Apply down payment first, then generate installments by type.
                  </div>
                ) : (
                  (() => {
                    // Group installments by type
                    const grouped = installments.reduce((acc, inst) => {
                      const type = inst.type || 'custom'
                      if (!acc[type]) acc[type] = []
                      acc[type].push(inst)
                      return acc
                    }, {} as Record<string, InstallmentRow[]>)

                    return Object.entries(grouped).map(([type, typeInstallments]) => (
                      <div key={type} className="space-y-2 border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-base px-3 py-1">
                              {type.charAt(0).toUpperCase() + type.slice(1)} Installments ({typeInstallments.length})
                            </Badge>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddOneMore(type)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add One More
                          </Button>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>#</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Period</TableHead>
                              <TableHead>Instalment Date</TableHead>
                              <TableHead>Payment Mode</TableHead>
                              <TableHead>Notes</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {typeInstallments.map((inst) => (
                              <TableRow key={inst.id}>
                                <TableCell className="font-medium">{inst.installmentNumber}</TableCell>
                                <TableCell>
                                  <Select
                                    value={inst.type}
                                    onValueChange={(value) => updateInstallment(inst.id, "type", value)}
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue placeholder="Select Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="monthly">Monthly</SelectItem>
                                      <SelectItem value="quarterly">Quarterly</SelectItem>
                                      <SelectItem value="yearly">Yearly</SelectItem>
                                      <SelectItem value="custom">Custom</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={inst.amount || ''}
                                    onChange={(e) => updateInstallment(inst.id, "amount", Number(e.target.value) || 0)}
                                    className="w-32"
                                    placeholder="Enter amount"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={inst.period}
                                    onChange={(e) => updateInstallment(inst.id, "period", e.target.value)}
                                    placeholder="Period"
                                    className="w-24"
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
                                        onSelect={(date) => updateInstallment(inst.id, "dueDate", date)}
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={inst.paymentMode}
                                    onValueChange={(value) => updateInstallment(inst.id, "paymentMode", value)}
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="cash">Cash</SelectItem>
                                      <SelectItem value="bank">Bank</SelectItem>
                                      <SelectItem value="online">Online</SelectItem>
                                      <SelectItem value="cheque">Cheque</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={inst.notes || ''}
                                    onChange={(e) => updateInstallment(inst.id, "notes", e.target.value)}
                                    placeholder="Optional notes..."
                                    className="w-48"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setInstallments(prev => prev.filter(i => i.id !== inst.id))
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))
                  })()
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setInstallments([])
                setDownPaymentPercentage("")
                setDownPaymentAmount("")
                setAppliedDownPayment(0)
                setIsDownPaymentApplied(false)
                setNotes("")
              }}>
                Reset
              </Button>
              <Button onClick={handleSave} disabled={saving || !isDownPaymentApplied}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isEditMode ? "Update Plan" : "Create Plan"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Update Plan Button - Show when plan exists and not in edit mode */}
      {paymentPlan && !isEditMode && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Plan Management</CardTitle>
            <CardDescription>Update payment plan or record new payments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => {
                setIsEditMode(true)
                // Load existing installments into form for editing
                if (viewInstallments.length > 0) {
                  setInstallments(viewInstallments.map(inst => ({
                    ...inst,
                    id: inst.id || Date.now() + Math.random(),
                  })))
                  // Set down payment if available (you may need to get this from paymentPlan)
                  // For now, we'll leave it empty and user can re-apply
                }
              }}
              variant="outline"
              className="w-full"
            >
              <Edit className="mr-2 h-4 w-4" />
              Update Plan
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Record Payment (Receipt) Card */}
      {paymentPlan && (
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
      {paymentPlan && (
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
                      <TableHead>Instalment Date</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewInstallments.map((inst) => {
                      const remaining = (inst.amount || 0) - (inst.paidAmount || 0)
                      const isPaid = (inst.paidAmount || 0) >= (inst.amount || 0)
                      const isPartiallyPaid = (inst.paidAmount || 0) > 0 && !isPaid
                      return (
                        <TableRow
                          key={inst.id || inst.installmentNumber}
                          className={isPaid ? "bg-green-50 dark:bg-green-950" : isPartiallyPaid ? "bg-yellow-50 dark:bg-yellow-950" : ""}
                        >
                          <TableCell>{inst.installmentNumber}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{inst.type ? inst.type.charAt(0).toUpperCase() + inst.type.slice(1) : 'Custom'}</Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(inst.amount)}</TableCell>
                          <TableCell>{inst.dueDate ? format(inst.dueDate, "PPP") : "N/A"}</TableCell>
                          <TableCell className={isPaid ? "font-bold text-green-600" : isPartiallyPaid ? "font-semibold text-yellow-600" : ""}>
                            {formatCurrency(inst.paidAmount || 0)}
                          </TableCell>
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
            <div className="space-y-2">
              <Label>Reference/Cheque No (Optional)</Label>
              <Input
                type="text"
                value={paymentReferenceNumber}
                onChange={(e) => setPaymentReferenceNumber(e.target.value)}
                placeholder="Enter reference or cheque number"
              />
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
            loadDeal()
          }}
        />
      )}
    </div>
  )
}

