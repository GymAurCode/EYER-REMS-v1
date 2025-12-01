"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Settings, Bell, Shield, Palette, Plug, Sliders, Save, Building2, Mail, Phone, MapPin, Download, Upload, AlertTriangle, Loader2 } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useTheme } from "@/lib/theme-provider"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/lib/api"

type CurrencyCode = "PKR" | "USD"

const USD_TO_PKR_DEFAULT_RATE = 280.75
const CURRENCY_STORAGE_KEY = "currencySettings"

export const convertCurrency = (amount: number, from: CurrencyCode, to: CurrencyCode, usdToPkrRate: number) => {
  if (from === to) return amount
  if (usdToPkrRate <= 0) return amount

  return from === "USD" && to === "PKR" ? amount * usdToPkrRate : amount / usdToPkrRate
}

const fetchExchangeRate = async (): Promise<number> => {
  // TODO: Replace with real backend call
  await new Promise((resolve) => setTimeout(resolve, 300))
  return USD_TO_PKR_DEFAULT_RATE
}

const updateCurrencySettings = async (payload: {
  currency: CurrencyCode
  rate: number
  useCustomRate: boolean
  customRate?: number
  lastUpdated: string
}) => {
  // TODO: Replace with real backend integration
  await new Promise((resolve) => setTimeout(resolve, 400))
  localStorage.setItem(CURRENCY_STORAGE_KEY, JSON.stringify(payload))
}

export function SettingsView() {
  const { theme, setTheme, accentColor, setAccentColor } = useTheme()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [exportLoading, setExportLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null)
  const [showBackupWarning, setShowBackupWarning] = useState(false)
  const [showClearDataDialog, setShowClearDataDialog] = useState(false)
  const [clearingData, setClearingData] = useState(false)

  const [settings, setSettings] = useState({
    // General
    companyName: "RealEstate ERP",
    companyEmail: "contact@realestate.com",
    companyPhone: "(555) 123-4567",
    companyAddress: "123 Business St, Suite 100",
    timezone: "America/New_York",
    currency: "PKR",

    // Notifications
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    invoiceReminders: true,
    leaseExpiryAlerts: true,
    maintenanceAlerts: true,

    // Security
    twoFactorAuth: false,
    sessionTimeout: "30",
    passwordExpiry: "90",

    // Appearance - now controlled by theme context
    compactMode: false,
  })

  const [activeCurrency, setActiveCurrency] = useState<CurrencyCode>("PKR")
  const [exchangeRate, setExchangeRate] = useState<number>(USD_TO_PKR_DEFAULT_RATE)
  const [customRateEnabled, setCustomRateEnabled] = useState(false)
  const [customRateInput, setCustomRateInput] = useState("")
  const [isRateLoading, setIsRateLoading] = useState(true)
  const [isSavingCurrency, setIsSavingCurrency] = useState(false)

  const handleSave = () => {}

  useEffect(() => {
    const initializeCurrencySettings = async () => {
      try {
        const stored = localStorage.getItem(CURRENCY_STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          const storedCurrency = (parsed.currency as CurrencyCode) || "PKR"
          setActiveCurrency(storedCurrency)
          setSettings((prev) => ({ ...prev, currency: storedCurrency }))

          if (parsed.useCustomRate && parsed.customRate) {
            setCustomRateEnabled(true)
            setCustomRateInput(String(parsed.customRate))
            setExchangeRate(parsed.rate || parsed.customRate || USD_TO_PKR_DEFAULT_RATE)
          } else {
            const rate = parsed.rate || (await fetchExchangeRate())
            setExchangeRate(rate)
          }
        } else {
          const rate = await fetchExchangeRate()
          setExchangeRate(rate)
        }
      } catch (error) {
        console.error("Failed to initialize currency settings:", error)
        setExchangeRate(USD_TO_PKR_DEFAULT_RATE)
      } finally {
        setIsRateLoading(false)
      }
    }

    initializeCurrencySettings()
  }, [setSettings])

  const parsedCustomRate = useMemo(() => {
    const parsed = parseFloat(customRateInput)
    return Number.isFinite(parsed) ? parsed : NaN
  }, [customRateInput])

  const effectiveRate = useMemo(() => {
    if (customRateEnabled && parsedCustomRate > 0) {
      return parsedCustomRate
    }
    return exchangeRate
  }, [customRateEnabled, parsedCustomRate, exchangeRate])

  const pricePreview = useMemo(
    () => [
      { label: "Example Property Price", amount: 12500000 },
      { label: "Monthly Rent", amount: 85000 },
      { label: "Maintenance Fee", amount: 12000 },
    ],
    []
  )

  const convertedPrices = useMemo(
    () =>
      pricePreview.map((item) => ({
        label: item.label,
        baseAmount: item.amount,
        value:
          activeCurrency === "PKR"
            ? item.amount
            : convertCurrency(item.amount, "PKR", "USD", effectiveRate),
      })),
    [pricePreview, activeCurrency, effectiveRate]
  )

  const formatAmount = useCallback((amount: number, currencyCode: CurrencyCode) => {
    const isPKR = currencyCode === "PKR"
    return new Intl.NumberFormat(isPKR ? "en-PK" : "en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: isPKR ? 0 : 2,
      maximumFractionDigits: isPKR ? 0 : 2,
    }).format(amount)
  }, [])

  const handleCurrencyChange = useCallback(
    (value: CurrencyCode) => {
      setActiveCurrency(value)
      setSettings((prev) => ({ ...prev, currency: value }))
    },
    [setSettings]
  )

  const handleCustomRateToggle = useCallback(
    (checked: boolean) => {
      setCustomRateEnabled(checked)
      if (checked) {
        setCustomRateInput((prev) => (prev ? prev : String(exchangeRate)))
      } else {
        setCustomRateInput("")
      }
    },
    [exchangeRate]
  )

  const handleRateInputChange = useCallback((value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, "")
    setCustomRateInput(sanitized)
  }, [])

  const handleResetRate = useCallback(() => {
    setCustomRateEnabled(false)
    setCustomRateInput("")
    setExchangeRate(USD_TO_PKR_DEFAULT_RATE)
  }, [])

  const handleCurrencySave = useCallback(async () => {
    try {
      setIsSavingCurrency(true)
      const normalizedCustomRate =
        customRateEnabled && parsedCustomRate > 0 ? parsedCustomRate : undefined
      const payload = {
        currency: activeCurrency,
        rate: effectiveRate,
        useCustomRate: Boolean(normalizedCustomRate),
        customRate: normalizedCustomRate,
        lastUpdated: new Date().toISOString(),
      }

      await updateCurrencySettings(payload)
      setExchangeRate(effectiveRate)

      toast({
        title: "Currency settings updated",
        description: `All prices will now reflect ${activeCurrency}.`,
      })
    } catch (error) {
      console.error("Failed to save currency settings:", error)
      toast({
        title: "Unable to save currency settings",
        description: "Please try again or reset to the default rate.",
        variant: "destructive",
      })
    } finally {
      setIsSavingCurrency(false)
    }
  }, [activeCurrency, customRateEnabled, parsedCustomRate, effectiveRate, toast])

  // Check backup reminder on mount
  useEffect(() => {
    const lastBackup = localStorage.getItem("lastBackupDate")
    if (lastBackup) {
      setLastBackupDate(lastBackup)
      const backupDate = new Date(lastBackup)
      const daysSinceBackup = Math.floor((Date.now() - backupDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysSinceBackup > 7) {
        setShowBackupWarning(true)
      }
    } else {
      setShowBackupWarning(true)
    }
  }, [])

  const handleExportData = async () => {
    try {
      setExportLoading(true)
      const response = await apiService.backup.export()
      
      // The response.data contains the backup object with version, exportDate, and data
      const responseData = response.data as any
      const backupData = responseData || response
      
      // Create blob and download
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      
      // Generate filename with timestamp
      const now = new Date()
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}`
      link.download = `backup-${timestamp}.json`
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      // Update last backup date
      const backupDate = new Date().toISOString()
      localStorage.setItem("lastBackupDate", backupDate)
      setLastBackupDate(backupDate)
      setShowBackupWarning(false)

      toast({
        title: "Export Successful",
        description: "All data has been exported successfully.",
      })
    } catch (error: any) {
      console.error("Export failed:", error)
      toast({
        title: "Export Failed",
        description: error?.response?.data?.message || error?.response?.data?.error || "Failed to export data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setExportLoading(false)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Confirm before importing
    const confirmed = window.confirm(
      "⚠️ WARNING: This will overwrite all existing data. This action cannot be undone. Continue?"
    )
    
    if (!confirmed) {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      return
    }

    try {
      setImportLoading(true)
      
      // Read file as text
      const fileContent = await file.text()
      let backupData: any
      
      try {
        backupData = JSON.parse(fileContent)
      } catch (parseError) {
        throw new Error('Invalid JSON file. Please ensure the file is a valid backup file.')
      }

      // Validate backup file structure
      if (!backupData || typeof backupData !== 'object') {
        throw new Error('Invalid backup file format. File must contain a valid backup object.')
      }

      // If backup has version/data structure, use it; otherwise assume it's the data object itself
      const dataToImport = backupData.data || backupData

      if (!dataToImport || typeof dataToImport !== 'object') {
        throw new Error('Invalid backup file format. File must contain a data object.')
      }

      // Send to backend - wrap in data property as expected by the API
      await apiService.backup.import({ data: dataToImport })

      toast({
        title: "Import Successful",
        description: "All data has been imported successfully. Please refresh the page.",
      })

      // Update last backup date to now (since we just imported)
      const backupDate = new Date().toISOString()
      localStorage.setItem("lastBackupDate", backupDate)
      setLastBackupDate(backupDate)
      setShowBackupWarning(false)

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      // Optionally reload the page after a delay
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error: any) {
      console.error("Import failed:", error)
      
      // Extract error message
      let errorMessage = "Failed to import data. Please check the file format."
      
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error?.response?.status === 400) {
        errorMessage = "Invalid backup file format. Please ensure you're importing a valid backup file."
      } else if (error?.response?.status === 500) {
        errorMessage = "Server error during import. Please check the console for details."
      }
      
      toast({
        title: "Import Failed",
        description: errorMessage,
        variant: "destructive",
      })
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } finally {
      setImportLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground text-balance">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your application preferences and configurations</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="general">
            <Settings className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="h-4 w-4 mr-2" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Plug className="h-4 w-4 mr-2" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="advanced">
            <Sliders className="h-4 w-4 mr-2" />
            Advanced
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">General Settings</h2>
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Company Information
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={settings.companyName}
                      onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyEmail">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="companyEmail"
                        type="email"
                        value={settings.companyEmail}
                        onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyPhone">Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="companyPhone"
                        value={settings.companyPhone}
                        onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyAddress">Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="companyAddress"
                        value={settings.companyAddress}
                        onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground">Regional Settings</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={settings.timezone}
                      onValueChange={(value) => setSettings({ ...settings, timezone: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                        <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={settings.currency}
                      onValueChange={(value) => setSettings({ ...settings, currency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">Notification Preferences</h2>
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Notification Channels</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="emailNotifications">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                    </div>
                    <Switch
                      id="emailNotifications"
                      checked={settings.emailNotifications}
                      onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="smsNotifications">SMS Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive notifications via SMS</p>
                    </div>
                    <Switch
                      id="smsNotifications"
                      checked={settings.smsNotifications}
                      onCheckedChange={(checked) => setSettings({ ...settings, smsNotifications: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="pushNotifications">Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive browser push notifications</p>
                    </div>
                    <Switch
                      id="pushNotifications"
                      checked={settings.pushNotifications}
                      onCheckedChange={(checked) => setSettings({ ...settings, pushNotifications: checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground">Alert Types</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="invoiceReminders">Invoice Reminders</Label>
                      <p className="text-sm text-muted-foreground">Get reminded about upcoming invoice due dates</p>
                    </div>
                    <Switch
                      id="invoiceReminders"
                      checked={settings.invoiceReminders}
                      onCheckedChange={(checked) => setSettings({ ...settings, invoiceReminders: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="leaseExpiryAlerts">Lease Expiry Alerts</Label>
                      <p className="text-sm text-muted-foreground">Notifications when leases are about to expire</p>
                    </div>
                    <Switch
                      id="leaseExpiryAlerts"
                      checked={settings.leaseExpiryAlerts}
                      onCheckedChange={(checked) => setSettings({ ...settings, leaseExpiryAlerts: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="maintenanceAlerts">Maintenance Alerts</Label>
                      <p className="text-sm text-muted-foreground">Get notified about maintenance requests</p>
                    </div>
                    <Switch
                      id="maintenanceAlerts"
                      checked={settings.maintenanceAlerts}
                      onCheckedChange={(checked) => setSettings({ ...settings, maintenanceAlerts: checked })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">Security Settings</h2>
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Authentication</h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="twoFactorAuth">Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                  </div>
                  <Switch
                    id="twoFactorAuth"
                    checked={settings.twoFactorAuth}
                    onCheckedChange={(checked) => setSettings({ ...settings, twoFactorAuth: checked })}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground">Session Management</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={settings.sessionTimeout}
                      onChange={(e) => setSettings({ ...settings, sessionTimeout: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passwordExpiry">Password Expiry (days)</Label>
                    <Input
                      id="passwordExpiry"
                      type="number"
                      value={settings.passwordExpiry}
                      onChange={(e) => setSettings({ ...settings, passwordExpiry: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground">Password Management</h3>
                <Button variant="outline">Change Password</Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">Appearance Settings</h2>
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Theme</h3>
                <div className="space-y-2">
                  <Label htmlFor="theme">Color Theme</Label>
                  <Select value={theme} onValueChange={(value: any) => setTheme(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Choose how the interface looks. System will match your device settings.
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground">Accent Color</h3>
                <div className="space-y-2">
                  <Label htmlFor="accentColor">Primary Accent</Label>
                  <Select value={accentColor} onValueChange={(value: any) => setAccentColor(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blue">Blue</SelectItem>
                      <SelectItem value="green">Green</SelectItem>
                      <SelectItem value="purple">Purple</SelectItem>
                      <SelectItem value="orange">Orange</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setAccentColor("blue")}
                      className="h-10 w-10 rounded-full bg-blue-600 border-2 border-transparent hover:border-foreground transition-colors"
                      aria-label="Blue accent"
                    />
                    <button
                      onClick={() => setAccentColor("green")}
                      className="h-10 w-10 rounded-full bg-green-600 border-2 border-transparent hover:border-foreground transition-colors"
                      aria-label="Green accent"
                    />
                    <button
                      onClick={() => setAccentColor("purple")}
                      className="h-10 w-10 rounded-full bg-purple-600 border-2 border-transparent hover:border-foreground transition-colors"
                      aria-label="Purple accent"
                    />
                    <button
                      onClick={() => setAccentColor("orange")}
                      className="h-10 w-10 rounded-full bg-orange-600 border-2 border-transparent hover:border-foreground transition-colors"
                      aria-label="Orange accent"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground">Display Options</h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="compactMode">Compact Mode</Label>
                    <p className="text-sm text-muted-foreground">Reduce spacing for a more compact interface</p>
                  </div>
                  <Switch
                    id="compactMode"
                    checked={settings.compactMode}
                    onCheckedChange={(checked) => setSettings({ ...settings, compactMode: checked })}
                  />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Integrations Settings */}
        <TabsContent value="integrations">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">Integrations</h2>
            <div className="space-y-4">
              <p className="text-muted-foreground">Connect third-party services to enhance your ERP system.</p>

              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h3 className="font-semibold text-foreground">Payment Gateway</h3>
                    <p className="text-sm text-muted-foreground">Connect Stripe for payment processing</p>
                  </div>
                  <Button variant="outline">Connect</Button>
                </div>

                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h3 className="font-semibold text-foreground">Email Service</h3>
                    <p className="text-sm text-muted-foreground">Connect SendGrid for email notifications</p>
                  </div>
                  <Button variant="outline">Connect</Button>
                </div>

                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h3 className="font-semibold text-foreground">SMS Service</h3>
                    <p className="text-sm text-muted-foreground">Connect Twilio for SMS notifications</p>
                  </div>
                  <Button variant="outline">Connect</Button>
                </div>

                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <h3 className="font-semibold text-foreground">Cloud Storage</h3>
                    <p className="text-sm text-muted-foreground">Connect AWS S3 for document storage</p>
                  </div>
                  <Button variant="outline">Connect</Button>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">Advanced Settings</h2>
            
            {/* Backup Warning */}
            {showBackupWarning && (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Backup Reminder</AlertTitle>
                <AlertDescription>
                  ⚠️ You haven't backed up your data in a while. Please export a backup now to protect your data.
                  {lastBackupDate && (
                    <span className="block mt-1 text-xs">
                      Last backup: {new Date(lastBackupDate).toLocaleDateString()}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Currency Configuration</h3>
                    <p className="text-sm text-muted-foreground">
                      Choose how monetary values are displayed throughout your workspace.
                    </p>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground sm:mt-0">
                    Active currency: {activeCurrency}
                  </span>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="activeCurrency">Active Currency</Label>
                      <Select value={activeCurrency} onValueChange={(value) => handleCurrencyChange(value as CurrencyCode)}>
                        <SelectTrigger id="activeCurrency">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PKR">PKR — Pakistani Rupee</SelectItem>
                          <SelectItem value="USD">USD — United States Dollar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Sliders className="h-4 w-4" />
                        Exchange Rate
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {isRateLoading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading rate...
                          </span>
                        ) : (
                          <>1 USD = {effectiveRate.toFixed(2)} PKR</>
                        )}
                      </p>
                      {!customRateEnabled && !isRateLoading && (
                        <p className="text-xs text-muted-foreground">
                          Using the system default rate. Enable custom rate to override.
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">Custom Rate</h4>
                        <p className="text-xs text-muted-foreground">
                          Override the default USD to PKR conversion rate.
                        </p>
                      </div>
                      <Switch checked={customRateEnabled} onCheckedChange={handleCustomRateToggle} />
                    </div>

                    {customRateEnabled && (
                      <div className="space-y-2">
                        <Label htmlFor="customRate">Custom USD to PKR Rate</Label>
                        <Input
                          id="customRate"
                          inputMode="decimal"
                          placeholder="Enter your USD to PKR rate"
                          value={customRateInput}
                          onChange={(event) => handleRateInputChange(event.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Values refresh instantly. Example: 1 USD = 280.75 PKR.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground">Live Preview</h4>
                      <p className="text-xs text-muted-foreground">
                        These values update everywhere price data is shown.
                      </p>
                    </div>
                    <div className="space-y-3">
                      {convertedPrices.map((item) => (
                        <div
                          key={item.label}
                          className="rounded-lg border border-border bg-background/60 px-4 py-3 shadow-sm"
                        >
                          <div className="flex items-center justify-between text-sm font-medium text-foreground">
                            <span>{item.label}</span>
                            <span>{formatAmount(item.value, activeCurrency)}</span>
                          </div>
                          {activeCurrency === "USD" && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Original: {formatAmount(item.baseAmount, "PKR")}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    Saving stores your preferences locally and syncs with the backend when connected.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="bg-transparent"
                      onClick={handleResetRate}
                      disabled={isSavingCurrency}
                    >
                      Reset to Default
                    </Button>
                    <Button onClick={handleCurrencySave} disabled={isSavingCurrency || isRateLoading}>
                      {isSavingCurrency ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Currency Settings
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Data Management</h3>
                  {lastBackupDate && !showBackupWarning && (
                    <span className="text-xs text-muted-foreground">
                      Last backup: {new Date(lastBackupDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button 
                    variant="outline" 
                    className="bg-transparent"
                    onClick={handleExportData}
                    disabled={exportLoading}
                  >
                    {exportLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Export All Data
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="bg-transparent"
                    onClick={handleImportClick}
                    disabled={importLoading}
                  >
                    {importLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Import Data
                      </>
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportData}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground">System Maintenance</h3>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full sm:w-auto bg-transparent">
                    Clear Cache
                  </Button>
                  <Button variant="outline" className="w-full sm:w-auto bg-transparent">
                    Reset to Defaults
                  </Button>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground text-destructive">Danger Zone</h3>
                <div className="space-y-3">
                  <Button 
                    variant="destructive" 
                    className="w-full sm:w-auto"
                    onClick={() => setShowClearDataDialog(true)}
                  >
                    Delete All Data
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Clear All Data Confirmation Dialog */}
      <AlertDialog open={showClearDataDialog} onOpenChange={setShowClearDataDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Clear All Data
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2">
              Are you sure you want to delete all data? This action cannot be undone.
              <br />
              <br />
              <span className="font-semibold text-foreground">This will permanently delete:</span>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-muted-foreground">
                <li>All properties, units, and blocks</li>
                <li>All tenants and leases</li>
                <li>All invoices and payments</li>
                <li>All transactions and journal entries</li>
                <li>All CRM data (leads, clients, deals)</li>
                <li>All HR data (employees, payroll, attendance)</li>
                <li>All accounts and financial records</li>
              </ul>
              <br />
              <span className="text-destructive font-semibold">Note: Users and roles will NOT be deleted.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearingData}>No, Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setClearingData(true)
                try {
                  await apiService.backup.clearAll()
                  toast({
                    title: "All data cleared successfully",
                    description: "All data has been permanently deleted from the system.",
                  })
                  setShowClearDataDialog(false)
                  // Optionally reload the page to reflect the cleared state
                  setTimeout(() => {
                    window.location.reload()
                  }, 2000)
                } catch (error: any) {
                  const errorMessage = error?.response?.data?.error || error?.response?.data?.message || "Failed to clear data"
                  toast({
                    title: "Error clearing data",
                    description: errorMessage,
                    variant: "destructive",
                  })
                } finally {
                  setClearingData(false)
                }
              }}
              disabled={clearingData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {clearingData ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Clearing...
                </>
              ) : (
                "Yes, Delete All"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
