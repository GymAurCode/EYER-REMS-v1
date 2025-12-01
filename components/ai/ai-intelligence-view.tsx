"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  MessageSquare,
  Send,
  FileText,
  Upload,
  Shield,
  Users,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  CheckCircle2,
  Building2,
} from "lucide-react"
import {
  Line,
  LineChart,
  Bar,
  BarChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

export function AIIntelligenceView() {
  const [activeTab, setActiveTab] = useState("overview")
  const [chatMessage, setChatMessage] = useState("")
  const [chatHistory, setChatHistory] = useState<Array<{ role: "user" | "ai"; message: string }>>([
    { role: "ai", message: "Hello! I'm your AI assistant. Ask me anything about your real estate business." },
  ])

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return

    setChatHistory([...chatHistory, { role: "user", message: chatMessage }])

    // Mock AI response
    setTimeout(() => {
      setChatHistory((prev) => [
        ...prev,
        {
          role: "ai",
          message:
            "Based on the data analysis, I found that 3 tenants have payment delays exceeding 15 days. Would you like me to generate a detailed report?",
        },
      ])
    }, 1000)

    setChatMessage("")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            AI Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">Smart insights and predictive analytics powered by AI</p>
        </div>
        <Button className="bg-gradient-to-r from-primary to-primary/80">
          <Sparkles className="h-4 w-4 mr-2" />
          Generate Report
        </Button>
      </div>

      {/* AI Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Predicted Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">$2.4M</div>
            <div className="flex items-center text-xs text-green-600 dark:text-green-400 mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              <span>+14.5% vs last month</span>
            </div>
            <Badge variant="secondary" className="mt-2 text-xs">
              92% Confidence
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Payment Risks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">7 Alerts</div>
            <div className="flex items-center text-xs text-orange-600 dark:text-orange-400 mt-1">
              <AlertTriangle className="h-3 w-3 mr-1" />
              <span>2 High, 5 Medium</span>
            </div>
            <Badge variant="destructive" className="mt-2 text-xs">
              Action Required
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">8.5% ROI</div>
            <div className="flex items-center text-xs text-green-600 dark:text-green-400 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>Skyline Tower leads</span>
            </div>
            <Badge variant="secondary" className="mt-2 text-xs">
              High Performer
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Employee Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">92%</div>
            <div className="flex items-center text-xs text-blue-600 dark:text-blue-400 mt-1">
              <Users className="h-3 w-3 mr-1" />
              <span>Above target</span>
            </div>
            <Badge variant="secondary" className="mt-2 text-xs">
              Excellent
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Customer Sentiment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">4.6/5</div>
            <div className="flex items-center text-xs text-purple-600 dark:text-purple-400 mt-1">
              <Sparkles className="h-3 w-3 mr-1" />
              <span>Positive trend</span>
            </div>
            <Badge variant="secondary" className="mt-2 text-xs">
              88% Positive
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="risk">Risk Detection</TabsTrigger>
          <TabsTrigger value="hr">HR Intelligence</TabsTrigger>
          <TabsTrigger value="crm">CRM Insights</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* AI Chat Assistant */}
            <Card className="lg:col-span-2 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  AI Assistant
                </CardTitle>
                <CardDescription>Ask questions about your business data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-[300px] overflow-y-auto space-y-3 p-4 bg-muted/30 rounded-lg">
                    {chatHistory.map((chat, idx) => (
                      <div key={idx} className={`flex ${chat.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            chat.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"
                          }`}
                        >
                          <p className="text-sm">{chat.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ask me anything..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    />
                    <Button onClick={handleSendMessage}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Real-time Alerts */}
            <Card className="border-orange-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Real-time Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { type: "High", message: "Payment anomaly detected in Unit 405", time: "2 min ago" },
                    { type: "Medium", message: "Tenant risk score increased for John Doe", time: "15 min ago" },
                    { type: "High", message: "Unusual expense pattern in Q4", time: "1 hour ago" },
                    { type: "Medium", message: "Employee turnover risk: Sarah Johnson", time: "2 hours ago" },
                    { type: "Low", message: "Maintenance request spike in Building A", time: "3 hours ago" },
                  ].map((alert, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <Badge
                        variant={
                          alert.type === "High" ? "destructive" : alert.type === "Medium" ? "default" : "secondary"
                        }
                        className="mt-0.5"
                      >
                        {alert.type}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Insights */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI-Generated Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-gradient-to-br from-primary/10 to-transparent rounded-lg border border-primary/20">
                  <div className="flex items-start gap-3">
                    <Zap className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Revenue Opportunity</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Property X outperformed others by 22% last quarter. Consider similar investments in the downtown
                        area.
                      </p>
                      <Badge variant="secondary" className="mt-2">
                        High Impact
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-br from-green-500/10 to-transparent rounded-lg border border-green-500/20">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Growth Prediction</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Predicted revenue growth for next month: 14.5%. Occupancy rates expected to reach 95%.
                      </p>
                      <Badge variant="secondary" className="mt-2">
                        Positive Trend
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue & Profit Forecast</CardTitle>
                <CardDescription>Next 6 months prediction using LSTM model</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    revenue: { label: "Revenue", color: "hsl(var(--primary))" },
                    profit: { label: "Profit", color: "hsl(var(--chart-2))" },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={[
                        { month: "Jan", revenue: 180000, profit: 45000 },
                        { month: "Feb", revenue: 195000, profit: 52000 },
                        { month: "Mar", revenue: 210000, profit: 58000 },
                        { month: "Apr", revenue: 225000, profit: 65000 },
                        { month: "May", revenue: 240000, profit: 72000 },
                        { month: "Jun", revenue: 255000, profit: 78000 },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} />
                      <Line type="monotone" dataKey="profit" stroke="var(--color-profit)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Occupancy Rate Prediction</CardTitle>
                <CardDescription>ML regression model forecast</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    rate: { label: "Occupancy %", color: "hsl(var(--chart-1))" },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { property: "Tower A", rate: 92 },
                        { property: "Tower B", rate: 88 },
                        { property: "Plaza C", rate: 95 },
                        { property: "Complex D", rate: 85 },
                        { property: "Building E", rate: 90 },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="property" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="rate" fill="var(--color-rate)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Dealer Performance Prediction</CardTitle>
              <CardDescription>Based on historical sales data and market trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Michael Chen", current: 85, predicted: 92, trend: "up" },
                  { name: "Sarah Williams", current: 78, predicted: 82, trend: "up" },
                  { name: "David Brown", current: 90, predicted: 88, trend: "down" },
                  { name: "Emma Davis", current: 72, predicted: 79, trend: "up" },
                ].map((dealer, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{dealer.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Current: {dealer.current}%</span>
                        <span className="text-sm font-medium">Predicted: {dealer.predicted}%</span>
                        {dealer.trend === "up" ? (
                          <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                    </div>
                    <Progress value={dealer.predicted} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <div className="grid gap-4">
            {[
              {
                title: "Property Investment Recommendation",
                description: "Downtown Plaza Unit 302 shows high ROI potential based on market analysis",
                confidence: 87,
                reason: "Similar properties in the area have shown 15% appreciation in the last 6 months",
                action: "Schedule Property Visit",
                icon: Building2,
                color: "primary",
              },
              {
                title: "HR Training Recommendation",
                description: "Recommend advanced sales training for 3 underperforming team members",
                confidence: 92,
                reason: "Historical data shows 40% performance improvement after similar training programs",
                action: "Enroll in Training",
                icon: Users,
                color: "blue",
              },
              {
                title: "Expense Optimization",
                description: "Reduce maintenance costs by 12% through preventive maintenance scheduling",
                confidence: 78,
                reason: "Predictive maintenance can prevent 65% of emergency repairs based on building age analysis",
                action: "Implement Schedule",
                icon: Target,
                color: "green",
              },
              {
                title: "Client Matching",
                description: "Match luxury apartment seekers with Skyline Tower premium units",
                confidence: 94,
                reason: "Client preferences align 94% with property features and location",
                action: "Send Recommendations",
                icon: Sparkles,
                color: "purple",
              },
            ].map((rec, idx) => (
              <Card key={idx} className={`border-${rec.color}-500/20`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg bg-${rec.color}-500/10`}>
                        <rec.icon className={`h-5 w-5 text-${rec.color}-600 dark:text-${rec.color}-400`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{rec.title}</CardTitle>
                        <CardDescription className="mt-1">{rec.description}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary">{rec.confidence}% Confidence</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm font-medium text-foreground mb-1">Why this recommendation?</p>
                      <p className="text-sm text-muted-foreground">{rec.reason}</p>
                    </div>
                    <Button className="w-full">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {rec.action}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Document Intelligence
              </CardTitle>
              <CardDescription>Upload documents for AI-powered extraction and analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm font-medium text-foreground mb-1">Upload Documents</p>
                  <p className="text-xs text-muted-foreground mb-4">Contracts, receipts, invoices, or ID documents</p>
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Files
                  </Button>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-foreground">Recent Extractions</h3>
                  {[
                    { name: "Lease_Agreement_405.pdf", type: "Lease", status: "Processed", confidence: 96 },
                    { name: "Invoice_2024_001.pdf", type: "Invoice", status: "Processed", confidence: 98 },
                    { name: "CNIC_Scan_JohnDoe.jpg", type: "ID Verification", status: "Verified", confidence: 94 },
                  ].map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{doc.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{doc.confidence}%</Badge>
                        <Badge variant="outline">{doc.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Detection Tab */}
        <TabsContent value="risk" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-red-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-red-500" />
                  Fraud Detection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    {
                      type: "Duplicate Transaction",
                      severity: "High",
                      details: "Invoice #1234 appears twice",
                      date: "Today",
                    },
                    {
                      type: "Abnormal Entry",
                      severity: "Medium",
                      details: "Unusual expense amount: $45,000",
                      date: "Yesterday",
                    },
                    {
                      type: "Suspicious Activity",
                      severity: "High",
                      details: "Multiple failed login attempts",
                      date: "2 days ago",
                    },
                  ].map((alert, idx) => (
                    <div key={idx} className="p-3 bg-muted/30 rounded-lg border-l-4 border-red-500">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-medium text-foreground">{alert.type}</p>
                        <Badge variant="destructive">{alert.severity}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{alert.details}</p>
                      <p className="text-xs text-muted-foreground">{alert.date}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Heatmap</CardTitle>
                <CardDescription>Property and tenant risk distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 16 }).map((_, idx) => {
                    const risk = Math.random()
                    const color = risk > 0.7 ? "bg-red-500" : risk > 0.4 ? "bg-orange-500" : "bg-green-500"
                    return (
                      <div key={idx} className={`aspect-square rounded ${color} opacity-${Math.floor(risk * 100)}`} />
                    )
                  })}
                </div>
                <div className="flex items-center justify-between mt-4 text-xs">
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-green-500" />
                    Low Risk
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-orange-500" />
                    Medium Risk
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-red-500" />
                    High Risk
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* HR Intelligence Tab */}
        <TabsContent value="hr" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Employee Attrition Risk</CardTitle>
                <CardDescription>Predictive model showing turnover probability</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: "Sarah Johnson", risk: 78, department: "Sales", reason: "Low engagement score" },
                    { name: "Mike Peters", risk: 45, department: "Finance", reason: "Workload concerns" },
                    { name: "Lisa Chen", risk: 32, department: "HR", reason: "Career growth" },
                  ].map((emp, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{emp.name}</p>
                          <p className="text-xs text-muted-foreground">{emp.department}</p>
                        </div>
                        <Badge variant={emp.risk > 60 ? "destructive" : emp.risk > 40 ? "default" : "secondary"}>
                          {emp.risk}% Risk
                        </Badge>
                      </div>
                      <Progress value={emp.risk} className="h-2" />
                      <p className="text-xs text-muted-foreground">{emp.reason}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Department Productivity</CardTitle>
                <CardDescription>AI-calculated efficiency scores</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    score: { label: "Productivity Score", color: "hsl(var(--chart-1))" },
                  }}
                  className="h-[250px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { dept: "Sales", score: 92 },
                        { dept: "Finance", score: 88 },
                        { dept: "HR", score: 85 },
                        { dept: "Operations", score: 90 },
                      ]}
                      layout="horizontal"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="dept" type="category" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="score" fill="var(--color-score)" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CRM Insights Tab */}
        <TabsContent value="crm" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Lead Scoring</CardTitle>
                <CardDescription>AI-ranked leads by conversion probability</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: "John Anderson", score: 94, source: "Website", interest: "Luxury Apartment" },
                    { name: "Emily Roberts", score: 87, source: "Referral", interest: "Commercial Space" },
                    { name: "David Kim", score: 72, source: "Social Media", interest: "Studio" },
                    { name: "Maria Garcia", score: 65, source: "Walk-in", interest: "2BR Apartment" },
                  ].map((lead, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {lead.source} • {lead.interest}
                        </p>
                      </div>
                      <Badge variant={lead.score > 80 ? "default" : "secondary"}>{lead.score}% Match</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Sentiment Analysis</CardTitle>
                <CardDescription>NLP analysis of support tickets and feedback</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    positive: { label: "Positive", color: "hsl(142, 76%, 36%)" },
                    neutral: { label: "Neutral", color: "hsl(45, 93%, 47%)" },
                    negative: { label: "Negative", color: "hsl(0, 84%, 60%)" },
                  }}
                  className="h-[250px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Positive", value: 68 },
                          { name: "Neutral", value: 22 },
                          { name: "Negative", value: 10 },
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label
                      >
                        <Cell fill="hsl(142, 76%, 36%)" />
                        <Cell fill="hsl(45, 93%, 47%)" />
                        <Cell fill="hsl(0, 84%, 60%)" />
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
